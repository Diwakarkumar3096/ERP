import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// ==========================================
// 1. HOSTEL DASHBOARD & REAL-TIME STATS
// ==========================================

router.get('/dashboard', requireAuth, requirePermission('hostel.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const [
      hostelsCountRes,
      roomsCountRes,
      bedsStatsRes,
      studentsCountRes,
      studentsGenderRes,
      currentlyOutRes,
      onLeaveRes,
      overdueReturnRes,
      todayAttendanceRes,
      todayOperationsRes,
      activeVisitorsRes,
      openIncidentsRes,
      openMaintenanceRes,
      recentMovementsRes,
      feeStatsRes
    ] = await Promise.all([
      // Hostels count
      db.query(`SELECT count(*) as count FROM hostels WHERE school_id = $1 AND is_active = true`, [schoolId]),

      // Rooms count
      db.query(`SELECT count(*) as count FROM hostel_rooms WHERE school_id = $1 AND is_active = true`, [schoolId]),

      // Beds breakdown
      db.query(`
        SELECT
          count(*) as total_beds,
          count(*) FILTER (WHERE status = 'Occupied') as occupied_beds,
          count(*) FILTER (WHERE status = 'Available') as available_beds,
          count(*) FILTER (WHERE status = 'Reserved') as reserved_beds,
          count(*) FILTER (WHERE status = 'Maintenance') as maintenance_beds
        FROM hostel_beds
        WHERE school_id = $1 AND is_active = true
      `, [schoolId]),

      // Total active hostel students (allocated)
      db.query(`SELECT count(DISTINCT student_id) as count FROM hostel_allocations WHERE school_id = $1 AND status = 'ACTIVE'`, [schoolId]),

      // Gender distribution of residents
      db.query(`
        SELECT
          count(DISTINCT a.student_id) FILTER (WHERE s.gender ILIKE 'Male%') as boys,
          count(DISTINCT a.student_id) FILTER (WHERE s.gender ILIKE 'Female%') as girls
        FROM hostel_allocations a
        JOIN students s ON a.student_id = s.id
        WHERE a.school_id = $1 AND a.status = 'ACTIVE'
      `, [schoolId]),

      // Currently OUT
      db.query(`
        SELECT count(*) as count
        FROM hostel_movements
        WHERE school_id = $1 AND status = 'OUT' AND actual_return IS NULL
      `, [schoolId]),

      // Currently ON LEAVE
      db.query(`
        SELECT count(*) as count
        FROM hostel_leaves
        WHERE school_id = $1 AND approval_status = 'APPROVED'
          AND CURRENT_DATE >= start_date AND CURRENT_DATE <= end_date
      `, [schoolId]),

      // Overdue Return
      db.query(`
        SELECT count(*) as count
        FROM hostel_movements
        WHERE school_id = $1 AND status = 'OVERDUE' AND actual_return IS NULL
      `, [schoolId]),

      // Today's attendance summary
      db.query(`
        SELECT
          count(r.id) as total_marked,
          count(r.id) FILTER (WHERE r.status = 'PRESENT') as present,
          count(r.id) FILTER (WHERE r.status = 'ABSENT') as absent,
          count(r.id) FILTER (WHERE r.status = 'ON_LEAVE') as on_leave,
          count(r.id) FILTER (WHERE r.status = 'OUTING') as outing
        FROM hostel_attendance_records r
        JOIN hostel_attendance h ON r.attendance_id = h.id
        WHERE r.school_id = $1 AND h.date = CURRENT_DATE
      `, [schoolId]),

      // Today's operations (check-ins & check-outs)
      db.query(`
        SELECT
          (SELECT count(*) FROM hostel_movements WHERE school_id = $1 AND actual_return::date = CURRENT_DATE) as today_checkins,
          (SELECT count(*) FROM hostel_movements WHERE school_id = $1 AND out_time::date = CURRENT_DATE) as today_checkouts,
          (SELECT count(*) FROM hostel_outings WHERE school_id = $1 AND approval_status = 'REQUESTED') as pending_outings,
          (SELECT count(*) FROM hostel_leaves WHERE school_id = $1 AND approval_status = 'PENDING') as pending_leaves
      `, [schoolId]),

      // Active Visitors
      db.query(`SELECT count(*) as count FROM hostel_visitors WHERE school_id = $1 AND status = 'CHECKED_IN'`, [schoolId]),

      // Open Incidents
      db.query(`SELECT count(*) as count FROM hostel_incidents WHERE school_id = $1 AND status IN ('OPEN', 'UNDER_REVIEW')`, [schoolId]),

      // Open Maintenance
      db.query(`SELECT count(*) as count FROM hostel_maintenance WHERE school_id = $1 AND status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS')`, [schoolId]),

      // Recent Movements (last 5)
      db.query(`
        SELECT m.*, concat(s.first_name, ' ', s.last_name) as student_name, s.admission_number,
          h.name as hostel_name
        FROM hostel_movements m
        JOIN students s ON m.student_id = s.id
        JOIN hostels h ON m.hostel_id = h.id
        WHERE m.school_id = $1
        ORDER BY m.created_at DESC
        LIMIT 5
      `, [schoolId]),

      // Hostel fee collection from Phase 6 fee categories
      db.query(`
        SELECT
          COALESCE(sum(fc.amount), 0) as total_charged,
          COALESCE(sum(fc.paid_amount), 0) as total_collected,
          COALESCE(sum(fc.amount - fc.paid_amount - fc.concession_amount), 0) as total_outstanding,
          COALESCE(sum(fc.concession_amount), 0) as total_concession
        FROM student_fee_charges fc
        JOIN fee_categories cat ON fc.category_id = cat.id
        WHERE fc.school_id = $1 AND (cat.code ILIKE '%HOSTEL%' OR cat.code ILIKE '%MESS%')
      `, [schoolId])
    ]);

    const bedData: any = bedsStatsRes.rows[0] || {};
    const totalBeds = parseInt(bedData.total_beds || '0', 10);
    const occupiedBeds = parseInt(bedData.occupied_beds || '0', 10);
    const availableBeds = parseInt(bedData.available_beds || '0', 10);
    const reservedBeds = parseInt(bedData.reserved_beds || '0', 10);
    const maintenanceBeds = parseInt(bedData.maintenance_beds || '0', 10);
    const occupancyPercentage = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    const genderData: any = studentsGenderRes.rows[0] || {};
    const opsData: any = todayOperationsRes.rows[0] || {};
    const attData: any = todayAttendanceRes.rows[0] || {};
    const feeData: any = feeStatsRes.rows[0] || {};

    return res.json({
      capacity: {
        totalHostels: parseInt((hostelsCountRes.rows[0] as any)?.count || '0', 10),
        totalRooms: parseInt((roomsCountRes.rows[0] as any)?.count || '0', 10),
        totalBeds,
        occupiedBeds,
        availableBeds,
        reservedBeds,
        maintenanceBeds,
        occupancyPercentage
      },
      students: {
        totalHostelStudents: parseInt((studentsCountRes.rows[0] as any)?.count || '0', 10),
        boys: parseInt(genderData.boys || '0', 10),
        girls: parseInt(genderData.girls || '0', 10),
        studentsCurrentlyOut: parseInt((currentlyOutRes.rows[0] as any)?.count || '0', 10),
        studentsOnLeave: parseInt((onLeaveRes.rows[0] as any)?.count || '0', 10),
        studentsOverdueReturn: parseInt((overdueReturnRes.rows[0] as any)?.count || '0', 10)
      },
      attendance: {
        totalMarked: parseInt(attData.total_marked || '0', 10),
        present: parseInt(attData.present || '0', 10),
        absent: parseInt(attData.absent || '0', 10),
        onLeave: parseInt(attData.on_leave || '0', 10),
        outing: parseInt(attData.outing || '0', 10),
        attendanceRate: parseInt(attData.total_marked || '0', 10) > 0
          ? Math.round((parseInt(attData.present || '0', 10) / parseInt(attData.total_marked || '1', 10)) * 100)
          : 100
      },
      operations: {
        todayCheckins: parseInt(opsData.today_checkins || '0', 10),
        todayCheckouts: parseInt(opsData.today_checkouts || '0', 10),
        pendingOutingApprovals: parseInt(opsData.pending_outings || '0', 10),
        pendingLeaveRequests: parseInt(opsData.pending_leaves || '0', 10),
        activeVisitors: parseInt((activeVisitorsRes.rows[0] as any)?.count || '0', 10),
        openIncidents: parseInt((openIncidentsRes.rows[0] as any)?.count || '0', 10),
        openMaintenance: parseInt((openMaintenanceRes.rows[0] as any)?.count || '0', 10)
      },
      financial: {
        hostelFeeCharged: parseFloat(feeData.total_charged || '0'),
        hostelFeeCollected: parseFloat(feeData.total_collected || '0'),
        hostelFeeOutstanding: parseFloat(feeData.total_outstanding || '0'),
        hostelConcessions: parseFloat(feeData.total_concession || '0')
      },
      recentMovements: recentMovementsRes.rows
    });
  } catch (err: any) {
    console.error('[HOSTEL DASHBOARD ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch hostel dashboard stats.' });
  }
});

// ==========================================
// 2. HOSTEL RULES & SETTINGS
// ==========================================

router.get('/rules', requireAuth, requirePermission('hostel.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    let result = await db.query(`SELECT * FROM hostel_rules WHERE school_id = $1`, [schoolId]);
    if (result.rows.length === 0) {
      // Create defaults
      const id = `hrules_${Date.now()}`;
      await db.query(`
        INSERT INTO hostel_rules (id, school_id) VALUES ($1, $2)
        ON CONFLICT (school_id) DO NOTHING
      `, [id, schoolId]);
      result = await db.query(`SELECT * FROM hostel_rules WHERE school_id = $1`, [schoolId]);
    }
    return res.json({ rules: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/rules', requireAuth, requirePermission('hostel.settings.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const {
    reportingTime, nightRollCallTime, outingAllowedDays, maxOutingsPerMonth,
    visitorStartTime, visitorEndTime, quietHoursStart, quietHoursEnd,
    leaveParentConsentRequired, autoOverdueThresholdMins
  } = req.body;

  try {
    const result = await db.query(`
      INSERT INTO hostel_rules (
        id, school_id, reporting_time, night_roll_call_time, outing_allowed_days,
        max_outings_per_month, visitor_start_time, visitor_end_time, quiet_hours_start,
        quiet_hours_end, leave_parent_consent_required, auto_overdue_threshold_mins, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP
      )
      ON CONFLICT (school_id) DO UPDATE SET
        reporting_time = EXCLUDED.reporting_time,
        night_roll_call_time = EXCLUDED.night_roll_call_time,
        outing_allowed_days = EXCLUDED.outing_allowed_days,
        max_outings_per_month = EXCLUDED.max_outings_per_month,
        visitor_start_time = EXCLUDED.visitor_start_time,
        visitor_end_time = EXCLUDED.visitor_end_time,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        leave_parent_consent_required = EXCLUDED.leave_parent_consent_required,
        auto_overdue_threshold_mins = EXCLUDED.auto_overdue_threshold_mins,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      `hrules_${Date.now()}`, schoolId,
      reportingTime || '18:30', nightRollCallTime || '21:00', outingAllowedDays || 'Saturday, Sunday',
      maxOutingsPerMonth ?? 4, visitorStartTime || '16:00', visitorEndTime || '18:30',
      quietHoursStart || '22:00', quietHoursEnd || '06:00',
      leaveParentConsentRequired ?? true, autoOverdueThresholdMins ?? 30
    ]);

    await recordAuditLog({
      req,
      action: 'UPDATE_HOSTEL_RULES',
      module: 'HOSTEL',
      schoolId,
      description: 'Updated residential curfew, roll call and visitor rules'
    });

    return res.json({ rules: result.rows[0], message: 'Hostel rules updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. HOSTEL MASTER MANAGEMENT
// ==========================================

router.get('/hostels', requireAuth, requirePermission('hostel.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const result = await db.query(`
      SELECT h.*,
        (SELECT count(*) FROM hostel_blocks b WHERE b.hostel_id = h.id AND b.is_active = true) as total_blocks,
        (SELECT count(*) FROM hostel_rooms r WHERE r.hostel_id = h.id AND r.is_active = true) as total_rooms,
        (SELECT count(*) FROM hostel_beds bd WHERE bd.hostel_id = h.id AND bd.is_active = true) as total_beds,
        (SELECT count(*) FROM hostel_beds bd WHERE bd.hostel_id = h.id AND bd.status = 'Occupied') as occupied_beds,
        (SELECT count(*) FROM hostel_beds bd WHERE bd.hostel_id = h.id AND bd.status = 'Available') as available_beds,
        (
          SELECT json_agg(json_build_object(
            'assignmentId', a.id,
            'role', a.role,
            'staffName', concat(e.first_name, ' ', e.last_name),
            'contactNumber', a.contact_number
          ))
          FROM hostel_staff_assignments a
          JOIN employees e ON a.employee_id = e.id
          WHERE a.hostel_id = h.id AND a.is_active = true
        ) as wardens
      FROM hostels h
      WHERE h.school_id = $1
      ORDER BY h.name ASC
    `, [schoolId]);

    return res.json({ hostels: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/hostels', requireAuth, requirePermission('hostel.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { name, code, hostelType, gender, description, address, contactNumber, capacity } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Hostel name and code are required.' });

  try {
    const id = `hstl_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO hostels (
        id, school_id, name, code, hostel_type, gender, description, address, contact_number, capacity, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      RETURNING *
    `, [
      id, schoolId, name.trim(), code.trim().toUpperCase(),
      hostelType || 'Boys Hostel', gender || 'MALE',
      description || null, address || null, contactNumber || null,
      capacity ? parseInt(capacity, 10) : 100
    ]);

    await recordAuditLog({
      req,
      action: 'CREATE_HOSTEL',
      module: 'HOSTEL',
      schoolId,
      recordId: id,
      description: `Created hostel building: "${name}" (${code})`
    });

    return res.status(201).json({ hostel: result.rows[0], message: 'Hostel building created successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/hostels/:id', requireAuth, requirePermission('hostel.manage'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { name, code, hostelType, gender, description, address, contactNumber, capacity, isActive } = req.body;

  try {
    const result = await db.query(`
      UPDATE hostels SET
        name = COALESCE($1, name),
        code = COALESCE($2, code),
        hostel_type = COALESCE($3, hostel_type),
        gender = COALESCE($4, gender),
        description = COALESCE($5, description),
        address = COALESCE($6, address),
        contact_number = COALESCE($7, contact_number),
        capacity = COALESCE($8, capacity),
        is_active = COALESCE($9, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 AND school_id = $11
      RETURNING *
    `, [
      name ? name.trim() : null,
      code ? code.trim().toUpperCase() : null,
      hostelType, gender, description, address, contactNumber,
      capacity ? parseInt(capacity, 10) : null,
      isActive !== undefined ? isActive : null,
      id, schoolId
    ]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Hostel not found.' });

    await recordAuditLog({
      req,
      action: 'UPDATE_HOSTEL',
      module: 'HOSTEL',
      schoolId,
      recordId: id,
      description: `Updated hostel: "${(result.rows[0] as any).name}"`
    });

    return res.json({ hostel: result.rows[0], message: 'Hostel updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. HOSTEL BLOCKS & FLOORS
// ==========================================

router.get('/blocks', requireAuth, requirePermission('hostel.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const hostelId = req.query.hostelId as string;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    let q = `
      SELECT b.*, h.name as hostel_name,
        (SELECT count(*) FROM hostel_floors f WHERE f.block_id = b.id AND f.is_active = true) as total_floors,
        (SELECT count(*) FROM hostel_rooms r WHERE r.block_id = b.id AND r.is_active = true) as total_rooms,
        (SELECT count(*) FROM hostel_beds bd JOIN hostel_rooms r ON bd.room_id = r.id WHERE r.block_id = b.id AND bd.is_active = true) as total_beds
      FROM hostel_blocks b
      JOIN hostels h ON b.hostel_id = h.id
      WHERE b.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (hostelId) {
      q += ` AND b.hostel_id = $2`;
      params.push(hostelId);
    }
    q += ` ORDER BY b.name ASC`;

    const result = await db.query(q, params);
    return res.json({ blocks: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/blocks', requireAuth, requirePermission('hostel.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { hostelId, name, code, description } = req.body;
  if (!hostelId || !name || !code) return res.status(400).json({ error: 'Hostel, block name, and code are required.' });

  try {
    const id = `blk_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO hostel_blocks (id, school_id, hostel_id, name, code, description, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *
    `, [id, schoolId, hostelId, name.trim(), code.trim().toUpperCase(), description]);

    await recordAuditLog({
      req,
      action: 'CREATE_HOSTEL_BLOCK',
      module: 'HOSTEL',
      schoolId,
      recordId: id,
      description: `Created hostel block: "${name}" (${code})`
    });

    return res.status(201).json({ block: result.rows[0], message: 'Block created successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/floors', requireAuth, requirePermission('hostel.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const blockId = req.query.blockId as string;
  const hostelId = req.query.hostelId as string;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    let q = `
      SELECT f.*, b.name as block_name, h.name as hostel_name,
        (SELECT count(*) FROM hostel_rooms r WHERE r.floor_id = f.id AND r.is_active = true) as total_rooms,
        (SELECT count(*) FROM hostel_beds bd JOIN hostel_rooms r ON bd.room_id = r.id WHERE r.floor_id = f.id AND bd.is_active = true) as total_beds
      FROM hostel_floors f
      JOIN hostel_blocks b ON f.block_id = b.id
      JOIN hostels h ON f.hostel_id = h.id
      WHERE f.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (blockId) {
      q += ` AND f.block_id = $${params.length + 1}`;
      params.push(blockId);
    }
    if (hostelId) {
      q += ` AND f.hostel_id = $${params.length + 1}`;
      params.push(hostelId);
    }
    q += ` ORDER BY f.floor_number ASC`;

    const result = await db.query(q, params);
    return res.json({ floors: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/floors', requireAuth, requirePermission('hostel.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { hostelId, blockId, name, floorNumber, description } = req.body;
  if (!hostelId || !blockId || !name || floorNumber === undefined) {
    return res.status(400).json({ error: 'Hostel, block, floor name, and floor number are required.' });
  }

  try {
    const id = `flr_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO hostel_floors (id, school_id, hostel_id, block_id, name, floor_number, description, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING *
    `, [id, schoolId, hostelId, blockId, name.trim(), parseInt(floorNumber, 10), description]);

    return res.status(201).json({ floor: result.rows[0], message: 'Floor created successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. HOSTEL ROOMS & BEDS
// ==========================================

router.get('/rooms', requireAuth, requirePermission('hostel.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const hostelId = req.query.hostelId as string;
  const blockId = req.query.blockId as string;
  const floorId = req.query.floorId as string;
  const status = req.query.status as string;

  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    let q = `
      SELECT r.*,
        h.name as hostel_name,
        b.name as block_name,
        f.name as floor_name,
        (SELECT count(*) FROM hostel_beds bd WHERE bd.room_id = r.id AND bd.is_active = true) as total_beds,
        (SELECT count(*) FROM hostel_beds bd WHERE bd.room_id = r.id AND bd.status = 'Occupied') as occupied_beds,
        (SELECT count(*) FROM hostel_beds bd WHERE bd.room_id = r.id AND bd.status = 'Available') as available_beds
      FROM hostel_rooms r
      JOIN hostels h ON r.hostel_id = h.id
      JOIN hostel_blocks b ON r.block_id = b.id
      JOIN hostel_floors f ON r.floor_id = f.id
      WHERE r.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (hostelId) {
      q += ` AND r.hostel_id = $${params.length + 1}`;
      params.push(hostelId);
    }
    if (blockId) {
      q += ` AND r.block_id = $${params.length + 1}`;
      params.push(blockId);
    }
    if (floorId) {
      q += ` AND r.floor_id = $${params.length + 1}`;
      params.push(floorId);
    }
    if (status) {
      q += ` AND r.status = $${params.length + 1}`;
      params.push(status);
    }
    q += ` ORDER BY r.room_number ASC`;

    const result = await db.query(q, params);
    return res.json({ rooms: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/rooms', requireAuth, requirePermission('hostel.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { hostelId, blockId, floorId, roomNumber, roomType, capacity, gender, notes, autoCreateBeds } = req.body;
  if (!hostelId || !blockId || !floorId || !roomNumber) {
    return res.status(400).json({ error: 'Hostel, block, floor, and room number are required.' });
  }

  const roomCapacity = capacity ? parseInt(capacity, 10) : 2;

  try {
    const roomId = `rm_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO hostel_rooms (
        id, school_id, hostel_id, block_id, floor_id, room_number,
        room_type, capacity, gender, status, notes, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Available', $10, true)
      RETURNING *
    `, [
      roomId, schoolId, hostelId, blockId, floorId, roomNumber.trim(),
      roomType || 'Standard', roomCapacity, gender || 'MALE', notes
    ]);

    // Optional convenience: auto create physical beds according to capacity
    if (autoCreateBeds) {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
      for (let i = 0; i < roomCapacity; i++) {
        const letter = letters[i] || (i + 1).toString();
        const bedId = `bed_${Date.now()}_${i}`;
        const bedNum = `Bed ${roomNumber}-${letter}`;
        const bedCode = `B-${roomNumber.replace(/\s+/g, '')}${letter}`;
        await db.query(`
          INSERT INTO hostel_beds (
            id, school_id, hostel_id, room_id, bed_number, bed_code, status, condition, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, 'Available', 'Good', true)
          ON CONFLICT (school_id, hostel_id, bed_code) DO NOTHING
        `, [bedId, schoolId, hostelId, roomId, bedNum, bedCode]);
      }
    }

    await recordAuditLog({
      req,
      action: 'CREATE_HOSTEL_ROOM',
      module: 'HOSTEL',
      schoolId,
      recordId: roomId,
      description: `Created room ${roomNumber} (Capacity: ${roomCapacity})`
    });

    return res.status(201).json({ room: result.rows[0], message: `Room ${roomNumber} created successfully.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/rooms/:id', requireAuth, requirePermission('hostel.view'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const roomRes = await db.query(`
      SELECT r.*, h.name as hostel_name, b.name as block_name, f.name as floor_name
      FROM hostel_rooms r
      JOIN hostels h ON r.hostel_id = h.id
      JOIN hostel_blocks b ON r.block_id = b.id
      JOIN hostel_floors f ON r.floor_id = f.id
      WHERE r.id = $1 AND r.school_id = $2
    `, [id, schoolId]);

    if (roomRes.rows.length === 0) return res.status(404).json({ error: 'Room not found.' });

    // Beds with resident details
    const bedsRes = await db.query(`
      SELECT bd.*,
        a.id as allocation_id,
        a.allocation_date,
        s.id as student_id,
        concat(s.first_name, ' ', s.last_name) as student_name,
        s.admission_number,
        s.roll_number,
        cls.name as class_name,
        sec.name as section_name,
        s.mobile_number as student_phone
      FROM hostel_beds bd
      LEFT JOIN hostel_allocations a ON bd.id = a.bed_id AND a.status = 'ACTIVE'
      LEFT JOIN students s ON a.student_id = s.id
      LEFT JOIN classes cls ON s.class_id = cls.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE bd.room_id = $1 AND bd.school_id = $2
      ORDER BY bd.bed_number ASC
    `, [id, schoolId]);

    return res.json({ room: roomRes.rows[0], beds: bedsRes.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// BEDS & OCCUPANCY VISUAL MAP
// ==========================================

router.get('/beds', requireAuth, requirePermission('hostel.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const hostelId = req.query.hostelId as string;
  const roomId = req.query.roomId as string;
  const status = req.query.status as string;

  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    let q = `
      SELECT bd.*,
        r.room_number,
        r.room_type,
        h.name as hostel_name,
        b.name as block_name,
        f.name as floor_name,
        a.id as allocation_id,
        a.allocation_date,
        concat(s.first_name, ' ', s.last_name) as occupant_name,
        s.admission_number as occupant_adm_no,
        cls.name as occupant_class,
        sec.name as occupant_section
      FROM hostel_beds bd
      JOIN hostel_rooms r ON bd.room_id = r.id
      JOIN hostels h ON bd.hostel_id = h.id
      JOIN hostel_blocks b ON r.block_id = b.id
      JOIN hostel_floors f ON r.floor_id = f.id
      LEFT JOIN hostel_allocations a ON bd.id = a.bed_id AND a.status = 'ACTIVE'
      LEFT JOIN students s ON a.student_id = s.id
      LEFT JOIN classes cls ON s.class_id = cls.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE bd.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (hostelId) {
      q += ` AND bd.hostel_id = $${params.length + 1}`;
      params.push(hostelId);
    }
    if (roomId) {
      q += ` AND bd.room_id = $${params.length + 1}`;
      params.push(roomId);
    }
    if (status) {
      q += ` AND bd.status = $${params.length + 1}`;
      params.push(status);
    }
    q += ` ORDER BY r.room_number ASC, bd.bed_number ASC`;

    const result = await db.query(q, params);
    return res.json({ beds: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/beds', requireAuth, requirePermission('hostel.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { hostelId, roomId, bedNumber, bedCode, condition, notes } = req.body;
  if (!hostelId || !roomId || !bedNumber || !bedCode) {
    return res.status(400).json({ error: 'Hostel, room, bed number, and unique bed code are required.' });
  }

  try {
    const id = `bed_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO hostel_beds (
        id, school_id, hostel_id, room_id, bed_number, bed_code, status, condition, notes, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, 'Available', $7, $8, true)
      RETURNING *
    `, [id, schoolId, hostelId, roomId, bedNumber.trim(), bedCode.trim().toUpperCase(), condition || 'Good', notes]);

    return res.status(201).json({ bed: result.rows[0], message: `Bed ${bedCode} added successfully.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Visual Occupancy Hierarchy Tree (Hostel -> Blocks -> Floors -> Rooms -> Beds)
router.get('/occupancy-map', requireAuth, requirePermission('hostel.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const hostelId = req.query.hostelId as string;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    let hostelClause = '';
    const params: any[] = [schoolId];
    if (hostelId) {
      hostelClause = ` AND h.id = $2`;
      params.push(hostelId);
    }

    const rawData = await db.query(`
      SELECT
        h.id as hostel_id, h.name as hostel_name, h.gender as hostel_gender,
        b.id as block_id, b.name as block_name, b.code as block_code,
        f.id as floor_id, f.name as floor_name, f.floor_number,
        r.id as room_id, r.room_number, r.room_type, r.capacity as room_capacity, r.status as room_status,
        bd.id as bed_id, bd.bed_number, bd.bed_code, bd.status as bed_status, bd.condition as bed_condition,
        s.id as student_id,
        concat(s.first_name, ' ', s.last_name) as occupant_name,
        s.admission_number as occupant_adm_no,
        s.gender as occupant_gender,
        cls.name as occupant_class,
        sec.name as occupant_section
      FROM hostels h
      JOIN hostel_blocks b ON b.hostel_id = h.id AND b.is_active = true
      JOIN hostel_floors f ON f.block_id = b.id AND f.is_active = true
      JOIN hostel_rooms r ON r.floor_id = f.id AND r.is_active = true
      LEFT JOIN hostel_beds bd ON bd.room_id = r.id AND bd.is_active = true
      LEFT JOIN hostel_allocations a ON bd.id = a.bed_id AND a.status = 'ACTIVE'
      LEFT JOIN students s ON a.student_id = s.id
      LEFT JOIN classes cls ON s.class_id = cls.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE h.school_id = $1 AND h.is_active = true ${hostelClause}
      ORDER BY h.name ASC, b.name ASC, f.floor_number ASC, r.room_number ASC, bd.bed_number ASC
    `, params);

    return res.json({ occupancyData: rawData.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. HOSTEL ADMISSIONS & ALLOCATIONS
// ==========================================

router.get('/admissions', requireAuth, requirePermission('hostel.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const status = req.query.status as string;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    let q = `
      SELECT adm.*,
        concat(s.first_name, ' ', s.last_name) as student_name,
        s.admission_number as student_adm_no,
        s.gender as student_gender,
        s.mobile_number as student_phone,
        cls.name as class_name,
        sec.name as section_name,
        h.name as hostel_name,
        a.id as allocation_id,
        r.room_number,
        bd.bed_code,
        a.status as allocation_status
      FROM hostel_admissions adm
      JOIN students s ON adm.student_id = s.id
      JOIN hostels h ON adm.hostel_id = h.id
      LEFT JOIN classes cls ON s.class_id = cls.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN hostel_allocations a ON adm.id = a.admission_id AND a.status = 'ACTIVE'
      LEFT JOIN hostel_rooms r ON a.room_id = r.id
      LEFT JOIN hostel_beds bd ON a.bed_id = bd.id
      WHERE adm.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (status) {
      q += ` AND adm.status = $2`;
      params.push(status);
    }
    q += ` ORDER BY adm.admission_date DESC`;

    const result = await db.query(q, params);
    return res.json({ admissions: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/admissions', requireAuth, requirePermission('hostel.admit'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { studentId, hostelId, admissionDate, expectedExitDate, reason, notes } = req.body;
  if (!studentId || !hostelId || !admissionDate) {
    return res.status(400).json({ error: 'Student, hostel, and admission date are required.' });
  }

  try {
    // 1. Verify student belongs to this school
    const stuRes = await db.query(`SELECT * FROM students WHERE id = $1 AND school_id = $2`, [studentId, schoolId]);
    if (stuRes.rows.length === 0) return res.status(404).json({ error: 'Student not found in this school.' });
    const student: any = stuRes.rows[0];

    // 2. Check if student already has active hostel admission
    const activeAdm = await db.query(`
      SELECT id FROM hostel_admissions WHERE student_id = $1 AND school_id = $2 AND status = 'Active'
    `, [studentId, schoolId]);
    if (activeAdm.rows.length > 0) {
      return res.status(409).json({ error: 'Student already has an active residential hostel admission.' });
    }

    // 3. Resolve active session
    const sessRes = await db.query(`SELECT id FROM academic_sessions WHERE school_id = $1 AND status = 'ACTIVE' LIMIT 1`, [schoolId]);
    const sessionId = (sessRes.rows[0] as any)?.id || student.session_id;

    const admId = `hadm_${Date.now()}`;
    const seq = Math.floor(1000 + Math.random() * 9000);
    const admNumber = `HSTL-${Date.now().toString().slice(-4)}-${seq}`;

    const result = await db.query(`
      INSERT INTO hostel_admissions (
        id, school_id, hostel_id, academic_session_id, student_id,
        admission_number, admission_date, expected_exit_date, status,
        reason, approved_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Active', $9, $10, $11)
      RETURNING *
    `, [
      admId, schoolId, hostelId, sessionId, studentId,
      admNumber, admissionDate, expectedExitDate || null,
      reason || 'Hostel enrollment request',
      req.user!.username || 'Hostel Admin', notes || null
    ]);

    await recordAuditLog({
      req,
      action: 'HOSTEL_STUDENT_ADMISSION',
      module: 'HOSTEL',
      schoolId,
      recordId: admId,
      description: `Enrolled student ${student.first_name} ${student.last_name} (${student.admission_number}) to hostel (Admission #${admNumber})`
    });

    return res.status(201).json({
      admission: result.rows[0],
      message: `Student enrolled to hostel successfully (Admission #${admNumber}).`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. BED ALLOCATION (WITH CONCURRENCY LOCKING)
// ==========================================

router.get('/allocations', requireAuth, requirePermission('hostel.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const hostelId = req.query.hostelId as string;
  const status = (req.query.status as string) || 'ACTIVE';

  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    let q = `
      SELECT a.*,
        concat(s.first_name, ' ', s.last_name) as student_name,
        s.admission_number as student_adm_no,
        s.gender as student_gender,
        s.mobile_number as student_phone,
        cls.name as class_name,
        sec.name as section_name,
        h.name as hostel_name,
        b.name as block_name,
        f.name as floor_name,
        r.room_number,
        r.room_type,
        bd.bed_number,
        bd.bed_code
      FROM hostel_allocations a
      JOIN students s ON a.student_id = s.id
      JOIN hostels h ON a.hostel_id = h.id
      JOIN hostel_rooms r ON a.room_id = r.id
      JOIN hostel_beds bd ON a.bed_id = bd.id
      JOIN hostel_blocks b ON r.block_id = b.id
      JOIN hostel_floors f ON r.floor_id = f.id
      LEFT JOIN classes cls ON s.class_id = cls.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE a.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (hostelId) {
      q += ` AND a.hostel_id = $${params.length + 1}`;
      params.push(hostelId);
    }
    if (status && status !== 'ALL') {
      q += ` AND a.status = $${params.length + 1}`;
      params.push(status);
    }
    q += ` ORDER BY a.allocation_date DESC`;

    const result = await db.query(q, params);
    return res.json({ allocations: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/allocations', requireAuth, requirePermission('hostel.admit'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { studentId, hostelId, roomId, bedId, admissionId, allocationDate, notes } = req.body;
  if (!studentId || !hostelId || !roomId || !bedId) {
    return res.status(400).json({ error: 'Student, hostel, room, and bed are required.' });
  }

  try {
    // 1. Verify student school isolation & gender
    const stuRes = await db.query(`SELECT * FROM students WHERE id = $1 AND school_id = $2`, [studentId, schoolId]);
    if (stuRes.rows.length === 0) return res.status(404).json({ error: 'Student not found in this school.' });
    const student: any = stuRes.rows[0];

    // 2. Concurrency lock on Bed to guarantee no race condition / double allocation
    const bedRes = await db.query(`
      SELECT bd.*, r.room_number, r.capacity, h.gender as hostel_gender, h.name as hostel_name
      FROM hostel_beds bd
      JOIN hostel_rooms r ON bd.room_id = r.id
      JOIN hostels h ON bd.hostel_id = h.id
      WHERE bd.id = $1 AND bd.school_id = $2
      FOR UPDATE
    `, [bedId, schoolId]);

    if (bedRes.rows.length === 0) return res.status(404).json({ error: 'Bed not found.' });
    const bed: any = bedRes.rows[0];

    if (bed.status !== 'Available') {
      return res.status(409).json({ error: `Selected bed (${bed.bed_code}) is already ${bed.status}. Please choose an available bed.` });
    }

    // 3. Gender integrity check
    if (bed.hostel_gender === 'MALE' && !student.gender.toLowerCase().startsWith('m')) {
      return res.status(400).json({ error: 'Cannot allocate female student to a Boys Hostel.' });
    }
    if (bed.hostel_gender === 'FEMALE' && !student.gender.toLowerCase().startsWith('f')) {
      return res.status(400).json({ error: 'Cannot allocate male student to a Girls Hostel.' });
    }

    // 4. Verify student does not already have an active allocation
    const activeAlloc = await db.query(`
      SELECT id FROM hostel_allocations WHERE student_id = $1 AND school_id = $2 AND status = 'ACTIVE'
    `, [studentId, schoolId]);
    if (activeAlloc.rows.length > 0) {
      return res.status(409).json({ error: 'Student already has an active bed allocation. Use room transfer instead.' });
    }

    // 5. Check room capacity constraint
    const currentRoomOccupants = await db.query(`
      SELECT count(*) as count FROM hostel_allocations WHERE room_id = $1 AND status = 'ACTIVE'
    `, [roomId]);
    const currentCount = parseInt((currentRoomOccupants.rows[0] as any)?.count || '0', 10);
    if (currentCount >= bed.capacity) {
      return res.status(400).json({ error: `Room ${bed.room_number} has reached maximum capacity (${currentCount}/${bed.capacity}).` });
    }

    // 6. Resolve Session & Admission
    const sessRes = await db.query(`SELECT id FROM academic_sessions WHERE school_id = $1 AND status = 'ACTIVE' LIMIT 1`, [schoolId]);
    const sessionId = (sessRes.rows[0] as any)?.id || student.session_id;

    let finalAdmId = admissionId;
    if (!finalAdmId) {
      const existingAdm = await db.query(`
        SELECT id FROM hostel_admissions WHERE student_id = $1 AND school_id = $2 AND status = 'Active' LIMIT 1
      `, [studentId, schoolId]);
      finalAdmId = existingAdm.rows.length > 0 ? (existingAdm.rows[0] as any).id : null;
    }

    const allocId = `halloc_${Date.now()}`;
    const allocDateStr = allocationDate || new Date().toISOString().slice(0, 10);

    // 7. Insert allocation record
    const result = await db.query(`
      INSERT INTO hostel_allocations (
        id, school_id, hostel_id, room_id, bed_id, student_id,
        admission_id, academic_session_id, allocation_date, status,
        allocated_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE', $10, $11)
      RETURNING *
    `, [
      allocId, schoolId, hostelId, roomId, bedId, studentId,
      finalAdmId, sessionId, allocDateStr,
      req.user!.username || 'Hostel Admin', notes || 'Bed allocated'
    ]);

    // 8. Update bed status to Occupied
    await db.query(`UPDATE hostel_beds SET status = 'Occupied', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [bedId]);

    // 9. Check if room is now full
    if (currentCount + 1 >= bed.capacity) {
      await db.query(`UPDATE hostel_rooms SET status = 'Full', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [roomId]);
    }

    // 10. Audit log
    await recordAuditLog({
      req,
      action: 'ALLOCATE_HOSTEL_BED',
      module: 'HOSTEL',
      schoolId,
      recordId: allocId,
      description: `Allocated bed ${bed.bed_code} in ${bed.room_number} to ${student.first_name} ${student.last_name}`
    });

    return res.status(201).json({
      allocation: result.rows[0],
      message: `Bed ${bed.bed_code} allocated to ${student.first_name} ${student.last_name} successfully.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. ROOM / BED TRANSFER
// ==========================================

router.post('/transfers', requireAuth, requirePermission('hostel.admit'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { allocationId, targetHostelId, targetRoomId, targetBedId, reason, remarks } = req.body;
  if (!allocationId || !targetHostelId || !targetRoomId || !targetBedId || !reason) {
    return res.status(400).json({ error: 'Current allocation, target hostel, room, bed, and reason are required.' });
  }

  try {
    // 1. Fetch current active allocation
    const curAllocRes = await db.query(`
      SELECT a.*, bd.bed_code as from_bed_code, r.room_number as from_room_number,
        concat(s.first_name, ' ', s.last_name) as student_name
      FROM hostel_allocations a
      JOIN hostel_beds bd ON a.bed_id = bd.id
      JOIN hostel_rooms r ON a.room_id = r.id
      JOIN students s ON a.student_id = s.id
      WHERE a.id = $1 AND a.school_id = $2 AND a.status = 'ACTIVE'
    `, [allocationId, schoolId]);

    if (curAllocRes.rows.length === 0) return res.status(404).json({ error: 'Active hostel allocation not found.' });
    const curAlloc: any = curAllocRes.rows[0];

    // 2. Concurrency lock on target bed
    const targetBedRes = await db.query(`
      SELECT bd.*, r.room_number, r.capacity, h.name as target_hostel_name
      FROM hostel_beds bd
      JOIN hostel_rooms r ON bd.room_id = r.id
      JOIN hostels h ON bd.hostel_id = h.id
      WHERE bd.id = $1 AND bd.school_id = $2
      FOR UPDATE
    `, [targetBedId, schoolId]);

    if (targetBedRes.rows.length === 0) return res.status(404).json({ error: 'Target bed not found.' });
    const targetBed: any = targetBedRes.rows[0];

    if (targetBed.status !== 'Available') {
      return res.status(409).json({ error: `Target bed ${targetBed.bed_code} is ${targetBed.status}. Cannot transfer to an occupied bed.` });
    }

    const transferDate = new Date().toISOString().slice(0, 10);
    const historyId = `hist_${Date.now()}`;

    // 3. Record historical transfer audit
    await db.query(`
      INSERT INTO hostel_allocation_history (
        id, school_id, student_id, allocation_id, from_hostel_id, from_room_id, from_bed_id,
        to_hostel_id, to_room_id, to_bed_id, transfer_date, reason, approved_by, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      historyId, schoolId, curAlloc.student_id, allocationId,
      curAlloc.hostel_id, curAlloc.room_id, curAlloc.bed_id,
      targetHostelId, targetRoomId, targetBedId,
      transferDate, reason.trim(), req.user!.username || 'Hostel Warden', remarks || null
    ]);

    // 4. Update old bed status to Available
    await db.query(`UPDATE hostel_beds SET status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [curAlloc.bed_id]);
    await db.query(`UPDATE hostel_rooms SET status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [curAlloc.room_id]);

    // 5. Update target bed status to Occupied
    await db.query(`UPDATE hostel_beds SET status = 'Occupied', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [targetBedId]);

    // 6. Update current allocation record with new room and bed
    await db.query(`
      UPDATE hostel_allocations SET
        hostel_id = $1,
        room_id = $2,
        bed_id = $3,
        allocation_date = $4,
        notes = concat(notes, ' | Transferred on ', $4, ' (Reason: ', $5, ')'),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [targetHostelId, targetRoomId, targetBedId, transferDate, reason.trim(), allocationId]);

    await recordAuditLog({
      req,
      action: 'TRANSFER_HOSTEL_ROOM',
      module: 'HOSTEL',
      schoolId,
      recordId: allocationId,
      description: `Transferred student ${curAlloc.student_name} from ${curAlloc.from_room_number} (${curAlloc.from_bed_code}) to ${targetBed.room_number} (${targetBed.bed_code})`
    });

    return res.json({
      success: true,
      message: `Student successfully transferred to ${targetBed.room_number} (${targetBed.bed_code}).`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. HOSTEL WITHDRAWAL
// ==========================================

router.post('/withdrawals', requireAuth, requirePermission('hostel.admit'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { allocationId, withdrawalDate, reason, clearanceStatus, remarks } = req.body;
  if (!allocationId || !reason) {
    return res.status(400).json({ error: 'Allocation and reason for withdrawal are required.' });
  }

  try {
    const allocRes = await db.query(`
      SELECT a.*, concat(s.first_name, ' ', s.last_name) as student_name,
        r.room_number, bd.bed_code
      FROM hostel_allocations a
      JOIN students s ON a.student_id = s.id
      JOIN hostel_rooms r ON a.room_id = r.id
      JOIN hostel_beds bd ON a.bed_id = bd.id
      WHERE a.id = $1 AND a.school_id = $2 AND a.status = 'ACTIVE'
    `, [allocationId, schoolId]);

    if (allocRes.rows.length === 0) return res.status(404).json({ error: 'Active hostel allocation not found.' });
    const alloc: any = allocRes.rows[0];

    const withDateStr = withdrawalDate || new Date().toISOString().slice(0, 10);
    const withId = `with_${Date.now()}`;

    // 1. Record withdrawal
    await db.query(`
      INSERT INTO hostel_withdrawals (
        id, school_id, student_id, allocation_id, hostel_id, room_id, bed_id,
        withdrawal_date, reason, approved_by, clearance_status, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      withId, schoolId, alloc.student_id, allocationId,
      alloc.hostel_id, alloc.room_id, alloc.bed_id,
      withDateStr, reason.trim(), req.user!.username || 'Hostel Admin',
      clearanceStatus || 'CLEARED', remarks || null
    ]);

    // 2. Mark allocation as VACATED
    await db.query(`
      UPDATE hostel_allocations SET status = 'VACATED', updated_at = CURRENT_TIMESTAMP WHERE id = $1
    `, [allocationId]);

    // 3. Mark admission as Withdrawn
    if (alloc.admission_id) {
      await db.query(`
        UPDATE hostel_admissions SET status = 'Withdrawn', updated_at = CURRENT_TIMESTAMP WHERE id = $1
      `, [alloc.admission_id]);
    }

    // 4. Release bed
    await db.query(`UPDATE hostel_beds SET status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [alloc.bed_id]);
    await db.query(`UPDATE hostel_rooms SET status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [alloc.room_id]);

    await recordAuditLog({
      req,
      action: 'HOSTEL_STUDENT_WITHDRAWAL',
      module: 'HOSTEL',
      schoolId,
      recordId: withId,
      description: `Processed hostel withdrawal for ${alloc.student_name}. Released bed ${alloc.bed_code} in ${alloc.room_number}`
    });

    return res.json({
      success: true,
      message: `Hostel withdrawal processed for ${alloc.student_name}. Bed ${alloc.bed_code} is now available.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. HOSTEL ATTENDANCE & NIGHT ROLL CALL
// ==========================================

router.get('/attendance', requireAuth, requirePermission('hostel.attendance.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const hostelId = req.query.hostelId as string;
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const type = req.query.attendanceType as string;

  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    let q = `
      SELECT att.*, h.name as hostel_name, b.name as block_name,
        (SELECT count(*) FROM hostel_attendance_records r WHERE r.attendance_id = att.id) as total_students,
        (SELECT count(*) FROM hostel_attendance_records r WHERE r.attendance_id = att.id AND r.status = 'PRESENT') as present_count,
        (SELECT count(*) FROM hostel_attendance_records r WHERE r.attendance_id = att.id AND r.status = 'ABSENT') as absent_count,
        (SELECT count(*) FROM hostel_attendance_records r WHERE r.attendance_id = att.id AND r.status = 'ON_LEAVE') as on_leave_count,
        (SELECT count(*) FROM hostel_attendance_records r WHERE r.attendance_id = att.id AND r.status = 'OUTING') as outing_count
      FROM hostel_attendance att
      JOIN hostels h ON att.hostel_id = h.id
      LEFT JOIN hostel_blocks b ON att.block_id = b.id
      WHERE att.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (hostelId) {
      q += ` AND att.hostel_id = $${params.length + 1}`;
      params.push(hostelId);
    }
    if (date) {
      q += ` AND att.date = $${params.length + 1}`;
      params.push(date);
    }
    if (type) {
      q += ` AND att.attendance_type = $${params.length + 1}`;
      params.push(type);
    }
    q += ` ORDER BY att.created_at DESC`;

    const result = await db.query(q, params);
    return res.json({ sessions: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Prepare roster for marking roll call / night attendance
router.get('/attendance/roster', requireAuth, requirePermission('hostel.attendance.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const hostelId = req.query.hostelId as string;
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const type = (req.query.attendanceType as string) || 'NIGHT_ATTENDANCE';

  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });
  if (!hostelId) return res.status(400).json({ error: 'Hostel ID is required.' });

  try {
    // 1. Check if a session already exists for this date and type
    const existAtt = await db.query(`
      SELECT * FROM hostel_attendance
      WHERE school_id = $1 AND hostel_id = $2 AND date = $3 AND attendance_type = $4
    `, [schoolId, hostelId, date, type]);

    const session: any = existAtt.rows[0] || null;

    // 2. Fetch all currently active residents in this hostel
    const residents = await db.query(`
      SELECT
        s.id as student_id,
        concat(s.first_name, ' ', s.last_name) as student_name,
        s.admission_number,
        s.roll_number,
        cls.name as class_name,
        sec.name as section_name,
        r.id as room_id,
        r.room_number,
        bd.id as bed_id,
        bd.bed_code,
        -- check existing marked status if session exists
        rec.id as record_id,
        rec.status as marked_status,
        rec.remarks as marked_remarks,
        -- check if currently on approved leave
        (
          SELECT count(*) > 0 FROM hostel_leaves l
          WHERE l.student_id = s.id AND l.approval_status = 'APPROVED'
            AND $3::date >= l.start_date AND $3::date <= l.end_date
        ) as is_on_leave,
        -- check if currently out on approved outing
        (
          SELECT count(*) > 0 FROM hostel_movements m
          WHERE m.student_id = s.id AND m.status IN ('OUT', 'OVERDUE') AND m.actual_return IS NULL
        ) as is_currently_out
      FROM hostel_allocations a
      JOIN students s ON a.student_id = s.id
      JOIN hostel_rooms r ON a.room_id = r.id
      JOIN hostel_beds bd ON a.bed_id = bd.id
      LEFT JOIN classes cls ON s.class_id = cls.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN hostel_attendance_records rec ON rec.student_id = s.id AND rec.attendance_id = $5
      WHERE a.hostel_id = $2 AND a.school_id = $1 AND a.status = 'ACTIVE'
      ORDER BY r.room_number ASC, bd.bed_number ASC
    `, [schoolId, hostelId, date, type, session ? session.id : 'none']);

    return res.json({ session, residents: residents.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Bulk mark roll call / night attendance
router.post('/attendance/mark', requireAuth, requirePermission('hostel.attendance.mark'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { hostelId, blockId, date, attendanceType, records, notes, lockSession } = req.body;
  if (!hostelId || !date || !attendanceType || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Hostel, date, attendance type, and records array are required.' });
  }

  try {
    // 1. Check or insert session header
    const existAtt = await db.query(`
      SELECT * FROM hostel_attendance
      WHERE school_id = $1 AND hostel_id = $2 AND date = $3 AND attendance_type = $4
    `, [schoolId, hostelId, date, attendanceType]);

    let attendanceId: string;
    let isLocked = false;

    if (existAtt.rows.length > 0) {
      const attRow: any = existAtt.rows[0];
      attendanceId = attRow.id;
      isLocked = !!attRow.is_locked;
      if (isLocked) {
        return res.status(403).json({ error: 'This attendance session has been locked. Corrections require authorized override.' });
      }
    } else {
      attendanceId = `hatt_${Date.now()}`;
      await db.query(`
        INSERT INTO hostel_attendance (
          id, school_id, hostel_id, block_id, date, attendance_type, marked_by, is_locked, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        attendanceId, schoolId, hostelId, blockId || null, date, attendanceType,
        req.user!.username || 'Hostel Warden', !!lockSession, notes || null
      ]);
    }

    // 2. Upsert individual resident attendance records
    for (const rec of records) {
      if (!rec.studentId || !rec.status) continue;
      const recId = rec.recordId || `hattrec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await db.query(`
        INSERT INTO hostel_attendance_records (
          id, attendance_id, school_id, student_id, room_id, bed_id, status, remarks, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (attendance_id, student_id) DO UPDATE SET
          status = EXCLUDED.status,
          remarks = EXCLUDED.remarks,
          updated_by = EXCLUDED.updated_by,
          updated_at = CURRENT_TIMESTAMP
      `, [
        recId, attendanceId, schoolId, rec.studentId, rec.roomId || null, rec.bedId || null,
        rec.status, rec.remarks || null, req.user!.username || 'Hostel Warden'
      ]);
    }

    // 3. Lock session if requested
    if (lockSession) {
      await db.query(`
        UPDATE hostel_attendance SET
          is_locked = true, locked_by = $1, locked_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [req.user!.username || 'Hostel Warden', attendanceId]);
    }

    await recordAuditLog({
      req,
      action: 'MARK_HOSTEL_ATTENDANCE',
      module: 'HOSTEL',
      schoolId,
      recordId: attendanceId,
      description: `Marked ${attendanceType} attendance for ${records.length} residents on ${date}`
    });

    return res.json({
      success: true,
      attendanceId,
      message: `Hostel attendance marked successfully (${records.length} records).`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Lock attendance session
router.post('/attendance/:id/lock', requireAuth, requirePermission('hostel.attendance.lock'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;

  try {
    const result = await db.query(`
      UPDATE hostel_attendance SET
        is_locked = true,
        locked_by = $1,
        locked_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND school_id = $3
      RETURNING *
    `, [req.user!.username || 'Hostel Admin', id, schoolId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Attendance session not found.' });

    await recordAuditLog({
      req,
      action: 'LOCK_HOSTEL_ATTENDANCE',
      module: 'HOSTEL',
      schoolId,
      recordId: id,
      description: `Locked residential attendance session #${id}`
    });

    return res.json({ success: true, session: result.rows[0], message: 'Attendance session locked successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11. STUDENT LEAVE MANAGEMENT
// ==========================================

router.get('/leaves', requireAuth, requirePermission('hostel.leaves.manage'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const status = req.query.status as string;
  const hostelId = req.query.hostelId as string;

  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    let q = `
      SELECT l.*,
        concat(s.first_name, ' ', s.last_name) as student_name,
        s.admission_number,
        cls.name as class_name,
        sec.name as section_name,
        h.name as hostel_name,
        r.room_number
      FROM hostel_leaves l
      JOIN students s ON l.student_id = s.id
      JOIN hostels h ON l.hostel_id = h.id
      LEFT JOIN classes cls ON s.class_id = cls.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN hostel_allocations a ON a.student_id = s.id AND a.status = 'ACTIVE'
      LEFT JOIN hostel_rooms r ON a.room_id = r.id
      WHERE l.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (status) {
      q += ` AND l.approval_status = $${params.length + 1}`;
      params.push(status);
    }
    if (hostelId) {
      q += ` AND l.hostel_id = $${params.length + 1}`;
      params.push(hostelId);
    }
    q += ` ORDER BY l.created_at DESC`;

    const result = await db.query(q, params);
    return res.json({ leaves: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/leaves', requireAuth, requirePermission('hostel.leaves.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { studentId, hostelId, leaveType, startDate, endDate, reason, destination, contactNumber, parentConsentGranted } = req.body;
  if (!studentId || !hostelId || !startDate || !endDate || !reason) {
    return res.status(400).json({ error: 'Student, hostel, date range, and reason are required.' });
  }

  try {
    const id = `hleave_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO hostel_leaves (
        id, school_id, student_id, hostel_id, leave_type, start_date, end_date,
        reason, destination, contact_number, requested_by,
        parent_consent_status, parent_consent_at, approval_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'PENDING')
      RETURNING *
    `, [
      id, schoolId, studentId, hostelId, leaveType || 'HOME_VISIT',
      startDate, endDate, reason.trim(), destination || null, contactNumber || null,
      req.user!.username || 'Student / Parent Portal',
      parentConsentGranted ? 'GRANTED' : 'PENDING',
      parentConsentGranted ? new Date() : null
    ]);

    await recordAuditLog({
      req,
      action: 'REQUEST_HOSTEL_LEAVE',
      module: 'HOSTEL',
      schoolId,
      recordId: id,
      description: `Submitted resident leave request for student ${studentId} (${startDate} to ${endDate})`
    });

    return res.status(201).json({ leave: result.rows[0], message: 'Leave request submitted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/leaves/:id/approve', requireAuth, requirePermission('hostel.leaves.manage'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { remarks } = req.body;

  try {
    const lRes = await db.query(`SELECT * FROM hostel_leaves WHERE id = $1 AND school_id = $2`, [id, schoolId]);
    if (lRes.rows.length === 0) return res.status(404).json({ error: 'Leave request not found.' });
    const leave: any = lRes.rows[0];

    const result = await db.query(`
      UPDATE hostel_leaves SET
        approval_status = 'APPROVED',
        approved_by = $1,
        approved_at = CURRENT_TIMESTAMP,
        remarks = COALESCE($2, remarks),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [req.user!.username || 'Hostel Warden', remarks || 'Approved by Warden', id]);

    // Automatically register movement
    const mvId = `hmv_${Date.now()}`;
    await db.query(`
      INSERT INTO hostel_movements (
        id, school_id, student_id, hostel_id, movement_type, reference_id,
        out_time, expected_return, authorized_by, status, remarks
      ) VALUES ($1, $2, $3, $4, 'LEAVE', $5, $6, $7, $8, 'OUT', $9)
    `, [
      mvId, schoolId, leave.student_id, leave.hostel_id, id,
      `${leave.start_date} 08:00:00+00`, `${leave.end_date} 18:00:00+00`,
      req.user!.username || 'Warden', `Approved Leave #${id}`
    ]);

    await recordAuditLog({
      req,
      action: 'APPROVE_HOSTEL_LEAVE',
      module: 'HOSTEL',
      schoolId,
      recordId: id,
      description: `Approved hostel leave for student ${leave.student_id}`
    });

    return res.json({ success: true, leave: result.rows[0], message: 'Leave request approved and movement logged.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/leaves/:id/reject', requireAuth, requirePermission('hostel.leaves.manage'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { remarks } = req.body;

  try {
    const result = await db.query(`
      UPDATE hostel_leaves SET
        approval_status = 'REJECTED',
        approved_by = $1,
        approved_at = CURRENT_TIMESTAMP,
        remarks = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND school_id = $4
      RETURNING *
    `, [req.user!.username || 'Hostel Warden', remarks || 'Rejected by Warden', id, schoolId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Leave request not found.' });

    await recordAuditLog({
      req,
      action: 'REJECT_HOSTEL_LEAVE',
      module: 'HOSTEL',
      schoolId,
      recordId: id,
      description: `Rejected hostel leave #${id}`
    });

    return res.json({ success: true, leave: result.rows[0], message: 'Leave request rejected.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 12. OUTINGS & MOVEMENT TRACKING
// ==========================================

router.get('/outings', requireAuth, requirePermission('hostel.outings.manage'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const status = req.query.status as string;

  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    let q = `
      SELECT o.*,
        concat(s.first_name, ' ', s.last_name) as student_name,
        s.admission_number,
        cls.name as class_name,
        sec.name as section_name,
        h.name as hostel_name,
        r.room_number
      FROM hostel_outings o
      JOIN students s ON o.student_id = s.id
      JOIN hostels h ON o.hostel_id = h.id
      LEFT JOIN classes cls ON s.class_id = cls.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN hostel_allocations a ON a.student_id = s.id AND a.status = 'ACTIVE'
      LEFT JOIN hostel_rooms r ON a.room_id = r.id
      WHERE o.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (status) {
      q += ` AND o.status = $2`;
      params.push(status);
    }
    q += ` ORDER BY o.outing_date DESC, o.time_out DESC`;

    const result = await db.query(q, params);
    return res.json({ outings: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/outings', requireAuth, requirePermission('hostel.outings.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { studentId, hostelId, outingDate, timeOut, expectedReturn, destination, purpose, accompanyingPerson, contactPhone } = req.body;
  if (!studentId || !hostelId || !timeOut || !expectedReturn || !destination) {
    return res.status(400).json({ error: 'Student, hostel, time out, expected return, and destination are required.' });
  }

  try {
    const id = `houting_${Date.now()}`;
    const dateStr = outingDate || new Date().toISOString().slice(0, 10);

    const result = await db.query(`
      INSERT INTO hostel_outings (
        id, school_id, student_id, hostel_id, outing_date, time_out, expected_return,
        destination, purpose, accompanying_person, contact_phone, approval_status,
        approved_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'APPROVED', $12, 'APPROVED')
      RETURNING *
    `, [
      id, schoolId, studentId, hostelId, dateStr, timeOut, expectedReturn,
      destination.trim(), purpose || null, accompanyingPerson || null, contactPhone || null,
      req.user!.username || 'Hostel Warden'
    ]);

    await recordAuditLog({
      req,
      action: 'CREATE_HOSTEL_OUTING',
      module: 'HOSTEL',
      schoolId,
      recordId: id,
      description: `Created & authorized outing pass for student ${studentId} to ${destination}`
    });

    return res.status(201).json({ outing: result.rows[0], message: 'Outing pass authorized successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Outing checkout: student leaves hostel
router.post('/outings/:id/checkout', requireAuth, requirePermission('hostel.outings.manage'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;

  try {
    const oRes = await db.query(`SELECT * FROM hostel_outings WHERE id = $1 AND school_id = $2`, [id, schoolId]);
    if (oRes.rows.length === 0) return res.status(404).json({ error: 'Outing record not found.' });
    const outing: any = oRes.rows[0];

    const result = await db.query(`
      UPDATE hostel_outings SET status = 'OUT', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *
    `, [id]);

    // Record movement
    const mvId = `hmv_${Date.now()}`;
    await db.query(`
      INSERT INTO hostel_movements (
        id, school_id, student_id, hostel_id, movement_type, reference_id,
        out_time, expected_return, authorized_by, status, remarks
      ) VALUES ($1, $2, $3, $4, 'OUTING', $5, CURRENT_TIMESTAMP, $6, $7, 'OUT', $8)
    `, [
      mvId, schoolId, outing.student_id, outing.hostel_id, id,
      `${outing.outing_date} ${outing.expected_return}:00+00`,
      req.user!.username || 'Security / Gate Warden',
      `Outing destination: ${outing.destination}`
    ]);

    return res.json({ success: true, outing: result.rows[0], message: 'Student checked out for outing.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Outing checkin: student returns to hostel
router.post('/outings/:id/checkin', requireAuth, requirePermission('hostel.outings.manage'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const actualTime = new Date().toTimeString().slice(0, 5);

  try {
    const result = await db.query(`
      UPDATE hostel_outings SET
        status = 'RETURNED',
        actual_return = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND school_id = $3
      RETURNING *
    `, [actualTime, id, schoolId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Outing record not found.' });

    // Close movement
    await db.query(`
      UPDATE hostel_movements SET
        actual_return = CURRENT_TIMESTAMP,
        status = 'RETURNED',
        updated_at = CURRENT_TIMESTAMP
      WHERE reference_id = $1 AND status IN ('OUT', 'OVERDUE')
    `, [id]);

    return res.json({ success: true, outing: result.rows[0], message: 'Student returned and checked in.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Centralized Movement Register
router.get('/movements', requireAuth, requirePermission('hostel.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const status = req.query.status as string;

  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    let q = `
      SELECT m.*,
        concat(s.first_name, ' ', s.last_name) as student_name,
        s.admission_number,
        s.mobile_number as student_phone,
        h.name as hostel_name,
        r.room_number,
        bd.bed_code,
        CASE
          WHEN m.status = 'OUT' AND CURRENT_TIMESTAMP > m.expected_return THEN true
          ELSE false
        END as is_overdue_now
      FROM hostel_movements m
      JOIN students s ON m.student_id = s.id
      JOIN hostels h ON m.hostel_id = h.id
      LEFT JOIN hostel_allocations a ON a.student_id = s.id AND a.status = 'ACTIVE'
      LEFT JOIN hostel_rooms r ON a.room_id = r.id
      LEFT JOIN hostel_beds bd ON a.bed_id = bd.id
      WHERE m.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (status) {
      q += ` AND m.status = $2`;
      params.push(status);
    }
    q += ` ORDER BY m.out_time DESC`;

    const result = await db.query(q, params);
    return res.json({ movements: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 13. VISITOR MANAGEMENT
// ==========================================

router.get('/visitors', requireAuth, requirePermission('hostel.visitors.manage'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const status = req.query.status as string;

  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    let q = `
      SELECT v.*,
        concat(s.first_name, ' ', s.last_name) as student_name,
        s.admission_number,
        cls.name as class_name,
        sec.name as section_name,
        h.name as hostel_name,
        r.room_number
      FROM hostel_visitors v
      JOIN students s ON v.student_id = s.id
      JOIN hostels h ON v.hostel_id = h.id
      LEFT JOIN classes cls ON s.class_id = cls.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN hostel_allocations a ON a.student_id = s.id AND a.status = 'ACTIVE'
      LEFT JOIN hostel_rooms r ON a.room_id = r.id
      WHERE v.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (status) {
      q += ` AND v.status = $2`;
      params.push(status);
    }
    q += ` ORDER BY v.visit_date DESC, v.check_in_time DESC`;

    const result = await db.query(q, params);
    return res.json({ visitors: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/visitors', requireAuth, requirePermission('hostel.visitors.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { studentId, hostelId, visitorName, phone, relationship, idType, idReference, purpose, expectedCheckOut } = req.body;
  if (!studentId || !hostelId || !visitorName || !phone || !relationship) {
    return res.status(400).json({ error: 'Student, hostel, visitor name, phone, and relationship are required.' });
  }

  try {
    const id = `hvis_${Date.now()}`;
    const checkInTime = new Date().toTimeString().slice(0, 5);
    const visitDate = new Date().toISOString().slice(0, 10);

    const result = await db.query(`
      INSERT INTO hostel_visitors (
        id, school_id, hostel_id, student_id, visitor_name, phone, relationship,
        id_type, id_reference, visit_date, check_in_time, expected_check_out,
        purpose, status, approved_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'CHECKED_IN', $14)
      RETURNING *
    `, [
      id, schoolId, hostelId, studentId, visitorName.trim(), phone.trim(), relationship.trim(),
      idType || 'Aadhaar / Voter ID', idReference || null, visitDate, checkInTime,
      expectedCheckOut || '18:30', purpose || null, req.user!.username || 'Hostel Gate Security'
    ]);

    await recordAuditLog({
      req,
      action: 'VISITOR_CHECK_IN',
      module: 'HOSTEL',
      schoolId,
      recordId: id,
      description: `Visitor ${visitorName} checked in to visit student ${studentId}`
    });

    return res.status(201).json({ visitor: result.rows[0], message: `Visitor ${visitorName} checked in successfully.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/visitors/:id/checkout', requireAuth, requirePermission('hostel.visitors.manage'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const actualTime = new Date().toTimeString().slice(0, 5);

  try {
    const result = await db.query(`
      UPDATE hostel_visitors SET
        status = 'CHECKED_OUT',
        actual_check_out = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND school_id = $3
      RETURNING *
    `, [actualTime, id, schoolId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Visitor record not found.' });

    await recordAuditLog({
      req,
      action: 'VISITOR_CHECK_OUT',
      module: 'HOSTEL',
      schoolId,
      recordId: id,
      description: `Visitor ${(result.rows[0] as any).visitor_name} checked out`
    });

    return res.json({ success: true, visitor: result.rows[0], message: 'Visitor checked out successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 14. INCIDENTS & DISCIPLINARY ACTIONS
// ==========================================

router.get('/incidents', requireAuth, requirePermission('hostel.incidents.manage'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const status = req.query.status as string;

  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    let q = `
      SELECT inc.*,
        concat(s.first_name, ' ', s.last_name) as student_name,
        s.admission_number,
        h.name as hostel_name
      FROM hostel_incidents inc
      JOIN hostels h ON inc.hostel_id = h.id
      LEFT JOIN students s ON inc.student_id = s.id
      WHERE inc.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (status) {
      q += ` AND inc.status = $2`;
      params.push(status);
    }
    q += ` ORDER BY inc.incident_date DESC, inc.created_at DESC`;

    const result = await db.query(q, params);
    return res.json({ incidents: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/incidents', requireAuth, requirePermission('hostel.incidents.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { hostelId, studentId, incidentDate, incidentType, severity, description, actionTaken, notes } = req.body;
  if (!hostelId || !incidentType || !description) {
    return res.status(400).json({ error: 'Hostel, incident type, and description are required.' });
  }

  try {
    const id = `hinc_${Date.now()}`;
    const dateStr = incidentDate || new Date().toISOString().slice(0, 10);

    const result = await db.query(`
      INSERT INTO hostel_incidents (
        id, school_id, hostel_id, student_id, incident_date, incident_type,
        severity, description, reported_by, action_taken, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'OPEN', $11)
      RETURNING *
    `, [
      id, schoolId, hostelId, studentId || null, dateStr, incidentType,
      severity || 'MEDIUM', description.trim(), req.user!.username || 'Hostel Staff',
      actionTaken || null, notes || null
    ]);

    await recordAuditLog({
      req,
      action: 'REPORT_HOSTEL_INCIDENT',
      module: 'HOSTEL',
      schoolId,
      recordId: id,
      description: `Reported ${severity} hostel incident: "${incidentType}"`
    });

    return res.status(201).json({ incident: result.rows[0], message: 'Incident reported successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/incidents/:id', requireAuth, requirePermission('hostel.incidents.manage'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { actionTaken, status, notes } = req.body;

  try {
    const isResolved = status === 'RESOLVED' || status === 'CLOSED';
    const result = await db.query(`
      UPDATE hostel_incidents SET
        action_taken = COALESCE($1, action_taken),
        status = COALESCE($2, status),
        notes = COALESCE($3, notes),
        resolved_by = CASE WHEN $4 THEN $5 ELSE resolved_by END,
        resolved_at = CASE WHEN $4 THEN CURRENT_TIMESTAMP ELSE resolved_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND school_id = $7
      RETURNING *
    `, [
      actionTaken, status, notes, isResolved,
      req.user!.username || 'Hostel Warden', id, schoolId
    ]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Incident not found.' });

    await recordAuditLog({
      req,
      action: 'UPDATE_HOSTEL_INCIDENT',
      module: 'HOSTEL',
      schoolId,
      recordId: id,
      description: `Updated incident #${id} status to ${status}`
    });

    return res.json({ incident: result.rows[0], message: 'Incident updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 15. HOSTEL MESS & MENUS
// ==========================================

router.get('/mess', requireAuth, requirePermission('hostel.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const result = await db.query(`
      SELECT m.*, h.name as hostel_name
      FROM hostel_mess m
      LEFT JOIN hostels h ON m.hostel_id = h.id
      WHERE m.school_id = $1
      ORDER BY m.name ASC
    `, [schoolId]);

    return res.json({ messFacilities: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/menus', requireAuth, requirePermission('hostel.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const messId = req.query.messId as string;
  const day = req.query.dayOfWeek as string;

  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    let q = `
      SELECT mn.*, m.name as mess_name
      FROM hostel_menus mn
      JOIN hostel_mess m ON mn.mess_id = m.id
      WHERE mn.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (messId) {
      q += ` AND mn.mess_id = $${params.length + 1}`;
      params.push(messId);
    }
    if (day) {
      q += ` AND mn.day_of_week = $${params.length + 1}`;
      params.push(day);
    }
    q += ` ORDER BY
      CASE mn.day_of_week
        WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6
        ELSE 7
      END,
      CASE mn.meal_type
        WHEN 'BREAKFAST' THEN 1 WHEN 'LUNCH' THEN 2 WHEN 'EVENING_SNACK' THEN 3 ELSE 4
      END
    `;

    const result = await db.query(q, params);
    return res.json({ menus: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/menus', requireAuth, requirePermission('hostel.mess.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { messId, dayOfWeek, mealType, items, specialNotes } = req.body;
  if (!messId || !dayOfWeek || !mealType || !items) {
    return res.status(400).json({ error: 'Mess, day of week, meal type, and items are required.' });
  }

  try {
    const id = `menu_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO hostel_menus (id, school_id, mess_id, day_of_week, meal_type, items, special_notes, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING *
    `, [id, schoolId, messId, dayOfWeek, mealType, items.trim(), specialNotes || null]);

    return res.status(201).json({ menu: result.rows[0], message: 'Meal menu updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 16. MAINTENANCE & ASSETS
// ==========================================

router.get('/maintenance', requireAuth, requirePermission('hostel.maintenance.manage'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const status = req.query.status as string;

  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    let q = `
      SELECT m.*,
        h.name as hostel_name,
        b.name as block_name,
        r.room_number
      FROM hostel_maintenance m
      JOIN hostels h ON m.hostel_id = h.id
      LEFT JOIN hostel_blocks b ON m.block_id = b.id
      LEFT JOIN hostel_rooms r ON m.room_id = r.id
      WHERE m.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (status) {
      q += ` AND m.status = $2`;
      params.push(status);
    }
    q += ` ORDER BY m.reported_date DESC`;

    const result = await db.query(q, params);
    return res.json({ tickets: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/maintenance', requireAuth, requirePermission('hostel.maintenance.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { hostelId, blockId, roomId, issueTitle, description, priority, assignedTo } = req.body;
  if (!hostelId || !issueTitle) {
    return res.status(400).json({ error: 'Hostel and issue title are required.' });
  }

  try {
    const id = `hmaint_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO hostel_maintenance (
        id, school_id, hostel_id, block_id, room_id, issue_title, description,
        priority, reported_by, assigned_to, status, reported_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'OPEN', CURRENT_DATE)
      RETURNING *
    `, [
      id, schoolId, hostelId, blockId || null, roomId || null,
      issueTitle.trim(), description || null, priority || 'MEDIUM',
      req.user!.username || 'Hostel Staff', assignedTo || null
    ]);

    await recordAuditLog({
      req,
      action: 'LOG_HOSTEL_MAINTENANCE',
      module: 'HOSTEL',
      schoolId,
      recordId: id,
      description: `Logged maintenance ticket: "${issueTitle}"`
    });

    return res.status(201).json({ ticket: result.rows[0], message: 'Maintenance ticket created.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/maintenance/:id', requireAuth, requirePermission('hostel.maintenance.manage'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { status, assignedTo, cost, remarks } = req.body;

  try {
    const isResolved = status === 'RESOLVED' || status === 'CLOSED';
    const result = await db.query(`
      UPDATE hostel_maintenance SET
        status = COALESCE($1, status),
        assigned_to = COALESCE($2, assigned_to),
        cost = COALESCE($3, cost),
        remarks = COALESCE($4, remarks),
        resolved_date = CASE WHEN $5 THEN CURRENT_DATE ELSE resolved_date END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND school_id = $7
      RETURNING *
    `, [
      status, assignedTo, cost ? parseFloat(cost) : null, remarks,
      isResolved, id, schoolId
    ]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Maintenance ticket not found.' });

    return res.json({ ticket: result.rows[0], message: 'Ticket updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 17. HOSTEL NOTICES
// ==========================================

router.get('/notices', requireAuth, requirePermission('hostel.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const result = await db.query(`
      SELECT n.*, h.name as hostel_name
      FROM hostel_notices n
      LEFT JOIN hostels h ON n.hostel_id = h.id
      WHERE n.school_id = $1 AND n.is_active = true
      ORDER BY n.publish_date DESC, n.created_at DESC
    `, [schoolId]);

    return res.json({ notices: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/notices', requireAuth, requirePermission('hostel.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { hostelId, title, content, targetAudience, priority, expiryDate } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required.' });

  try {
    const id = `hnotif_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO hostel_notices (
        id, school_id, hostel_id, title, content, target_audience, priority,
        publish_date, expiry_date, published_by, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8, $9, true)
      RETURNING *
    `, [
      id, schoolId, hostelId || null, title.trim(), content.trim(),
      targetAudience || 'ALL', priority || 'NORMAL', expiryDate || null,
      req.user!.username || 'Hostel Warden'
    ]);

    return res.status(201).json({ notice: result.rows[0], message: 'Notice published successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 18. HOSTEL STUDENT FULL PROFILE
// ==========================================

router.get('/students/:id/profile', requireAuth, requirePermission('hostel.view'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    // 1. Current Allocation
    const allocRes = await db.query(`
      SELECT a.*,
        h.name as hostel_name, h.gender as hostel_gender,
        b.name as block_name,
        f.name as floor_name,
        r.room_number, r.room_type,
        bd.bed_number, bd.bed_code,
        concat(s.first_name, ' ', s.last_name) as student_name,
        s.admission_number, s.gender, s.date_of_birth, s.blood_group,
        s.mobile_number as student_phone, s.email as student_email,
        cls.name as class_name, sec.name as section_name
      FROM hostel_allocations a
      JOIN students s ON a.student_id = s.id
      JOIN hostels h ON a.hostel_id = h.id
      JOIN hostel_rooms r ON a.room_id = r.id
      JOIN hostel_beds bd ON a.bed_id = bd.id
      JOIN hostel_blocks b ON r.block_id = b.id
      JOIN hostel_floors f ON r.floor_id = f.id
      LEFT JOIN classes cls ON s.class_id = cls.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE a.student_id = $1 AND a.school_id = $2 AND a.status = 'ACTIVE'
    `, [id, schoolId]);

    const currentAllocation: any = allocRes.rows[0] || null;

    // 2. Roommates in the same room
    let roommates: any[] = [];
    if (currentAllocation) {
      const rmRes = await db.query(`
        SELECT concat(s.first_name, ' ', s.last_name) as name, s.admission_number,
          bd.bed_number, bd.bed_code
        FROM hostel_allocations a
        JOIN students s ON a.student_id = s.id
        JOIN hostel_beds bd ON a.bed_id = bd.id
        WHERE a.room_id = $1 AND a.student_id != $2 AND a.status = 'ACTIVE'
      `, [currentAllocation.room_id, id]);
      roommates = rmRes.rows;
    }

    // 3. Allocation history
    const historyRes = await db.query(`
      SELECT h.*,
        fh.name as from_hostel, fr.room_number as from_room, fbd.bed_code as from_bed,
        th.name as to_hostel, tr.room_number as to_room, tbd.bed_code as to_bed
      FROM hostel_allocation_history h
      JOIN hostels fh ON h.from_hostel_id = fh.id
      JOIN hostel_rooms fr ON h.from_room_id = fr.id
      JOIN hostel_beds fbd ON h.from_bed_id = fbd.id
      JOIN hostels th ON h.to_hostel_id = th.id
      JOIN hostel_rooms tr ON h.to_room_id = tr.id
      JOIN hostel_beds tbd ON h.to_bed_id = tbd.id
      WHERE h.student_id = $1 AND h.school_id = $2
      ORDER BY h.transfer_date DESC
    `, [id, schoolId]);

    // 4. Attendance history (recent 10)
    const attRes = await db.query(`
      SELECT r.status, r.remarks, att.date, att.attendance_type
      FROM hostel_attendance_records r
      JOIN hostel_attendance att ON r.attendance_id = att.id
      WHERE r.student_id = $1 AND r.school_id = $2
      ORDER BY att.date DESC
      LIMIT 10
    `, [id, schoolId]);

    // 5. Recent Leaves & Outings
    const leavesRes = await db.query(`
      SELECT * FROM hostel_leaves WHERE student_id = $1 AND school_id = $2 ORDER BY created_at DESC LIMIT 5
    `, [id, schoolId]);

    const outingsRes = await db.query(`
      SELECT * FROM hostel_outings WHERE student_id = $1 AND school_id = $2 ORDER BY outing_date DESC LIMIT 5
    `, [id, schoolId]);

    // 6. Discipline / Incidents
    const incRes = await db.query(`
      SELECT * FROM hostel_incidents WHERE student_id = $1 AND school_id = $2 ORDER BY incident_date DESC
    `, [id, schoolId]);

    // 7. Hostel Fees from Phase 6
    const feeRes = await db.query(`
      SELECT fc.*, cat.name as category_name
      FROM student_fee_charges fc
      JOIN fee_categories cat ON fc.category_id = cat.id
      WHERE fc.student_id = $1 AND fc.school_id = $2
        AND (cat.code ILIKE '%HOSTEL%' OR cat.code ILIKE '%MESS%')
      ORDER BY fc.due_date DESC
    `, [id, schoolId]);

    return res.json({
      currentAllocation,
      roommates,
      allocationHistory: historyRes.rows,
      attendanceHistory: attRes.rows,
      recentLeaves: leavesRes.rows,
      recentOutings: outingsRes.rows,
      incidents: incRes.rows,
      hostelFees: feeRes.rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 19. HOSTEL COMPREHENSIVE REPORTS
// ==========================================

router.get('/reports/occupancy', requireAuth, requirePermission('hostel.reports.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const result = await db.query(`
      SELECT
        h.id as hostel_id,
        h.name as hostel_name,
        h.code as hostel_code,
        h.hostel_type,
        h.gender,
        (SELECT count(*) FROM hostel_rooms r WHERE r.hostel_id = h.id AND r.is_active = true) as total_rooms,
        (SELECT count(*) FROM hostel_beds bd WHERE bd.hostel_id = h.id AND bd.is_active = true) as total_beds,
        (SELECT count(*) FROM hostel_beds bd WHERE bd.hostel_id = h.id AND bd.status = 'Occupied') as occupied_beds,
        (SELECT count(*) FROM hostel_beds bd WHERE bd.hostel_id = h.id AND bd.status = 'Available') as available_beds,
        (SELECT count(*) FROM hostel_beds bd WHERE bd.hostel_id = h.id AND bd.status = 'Reserved') as reserved_beds,
        (SELECT count(*) FROM hostel_beds bd WHERE bd.hostel_id = h.id AND bd.status = 'Maintenance') as maintenance_beds
      FROM hostels h
      WHERE h.school_id = $1 AND h.is_active = true
      ORDER BY h.name ASC
    `, [schoolId]);

    const report = result.rows.map((row: any) => {
      const totalBeds = parseInt(row.total_beds || '0', 10);
      const occupied = parseInt(row.occupied_beds || '0', 10);
      return {
        ...row,
        occupancyRate: totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0
      };
    });

    return res.json({ occupancyReport: report });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/staff', requireAuth, requirePermission('hostel.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const result = await db.query(`
      SELECT a.*,
        concat(e.first_name, ' ', e.last_name) as staff_name,
        e.employee_id_number,
        e.employee_type,
        h.name as hostel_name
      FROM hostel_staff_assignments a
      JOIN employees e ON a.employee_id = e.id
      JOIN hostels h ON a.hostel_id = h.id
      WHERE a.school_id = $1 AND a.is_active = true
      ORDER BY a.start_date DESC
    `, [schoolId]);

    return res.json({ staffAssignments: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/staff', requireAuth, requirePermission('hostel.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { hostelId, employeeId, role, startDate, dutySchedule, contactNumber } = req.body;
  if (!hostelId || !employeeId || !role) {
    return res.status(400).json({ error: 'Hostel, employee, and role are required.' });
  }

  try {
    const id = `hstaff_${Date.now()}`;
    const dateStr = startDate || new Date().toISOString().slice(0, 10);

    const result = await db.query(`
      INSERT INTO hostel_staff_assignments (
        id, school_id, hostel_id, employee_id, role, start_date, duty_schedule, contact_number, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      RETURNING *
    `, [id, schoolId, hostelId, employeeId, role, dateStr, dutySchedule || null, contactNumber || null]);

    await recordAuditLog({
      req,
      action: 'ASSIGN_HOSTEL_STAFF',
      module: 'HOSTEL',
      schoolId,
      recordId: id,
      description: `Assigned employee ${employeeId} as ${role} for hostel ${hostelId}`
    });

    return res.status(201).json({ assignment: result.rows[0], message: 'Hostel staff assigned successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/roster', requireAuth, requirePermission('hostel.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const result = await db.query(`
      SELECT r.*,
        concat(e.first_name, ' ', e.last_name) as staff_name,
        h.name as hostel_name
      FROM hostel_duty_roster r
      JOIN employees e ON r.employee_id = e.id
      JOIN hostels h ON r.hostel_id = h.id
      WHERE r.school_id = $1
      ORDER BY r.duty_date DESC, r.start_time ASC
    `, [schoolId]);

    return res.json({ roster: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
