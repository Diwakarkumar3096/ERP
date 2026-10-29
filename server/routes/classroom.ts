import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// ==========================================
// 1. CLASSROOMS / ROOMS MANAGEMENT
// ==========================================

// GET /api/classroom/rooms - List all rooms in school
router.get('/rooms', requireAuth, requirePermission('timetable.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied to this school rooms.' });
  }

  try {
    const result = await db.query(`
      SELECT r.*,
        (SELECT count(*) FROM timetable_entries te WHERE te.room_id = r.id) as assigned_periods_count
      FROM classrooms r
      WHERE r.school_id = $1
      ORDER BY r.building ASC, r.floor ASC, r.room_number ASC
    `, [schoolId]);

    return res.json({ rooms: result.rows });
  } catch (err: any) {
    console.error('[ROOMS LIST ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to list rooms.' });
  }
});

// POST /api/classroom/rooms - Create new room
router.post('/rooms', requireAuth, requirePermission('timetable.manage'), async (req, res) => {
  const { schoolId, roomNumber, name, building, floor, capacity, roomType, isShared } = req.body;
  const targetSchoolId = schoolId || req.user!.schoolId;

  if (!targetSchoolId || !checkSchoolScope(req, targetSchoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (!roomNumber || !name) {
    return res.status(400).json({ error: 'Room number and name are required.' });
  }

  try {
    const id = `rm_${targetSchoolId}_${Date.now().toString(36)}`;
    await db.query(`
      INSERT INTO classrooms (id, school_id, room_number, name, building, floor, capacity, room_type, is_shared, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
    `, [id, targetSchoolId, roomNumber.trim(), name.trim(), building || null, floor || null, capacity || 40, roomType || 'CLASSROOM', !!isShared]);

    await recordAuditLog({
      req,
      action: 'ROOM_CREATED',
      module: 'CLASSROOM',
      schoolId: targetSchoolId,
      description: `Created room ${roomNumber} (${name})`,
      newValues: { id, roomNumber, name }
    });

    return res.status(201).json({ message: 'Room created successfully.', id });
  } catch (err: any) {
    console.error('[ROOM CREATE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to create room.' });
  }
});

// PUT /api/classroom/rooms/:id - Update room
router.put('/rooms/:id', requireAuth, requirePermission('timetable.manage'), async (req, res) => {
  const { id } = req.params;
  const { name, building, floor, capacity, roomType, isShared, status } = req.body;

  try {
    const curRes = await db.query('SELECT * FROM classrooms WHERE id = $1', [id]);
    if (curRes.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found.' });
    }
    const current = curRes.rows[0] as any;
    if (!checkSchoolScope(req, current.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    await db.query(`
      UPDATE classrooms
      SET name = COALESCE($1, name),
          building = COALESCE($2, building),
          floor = COALESCE($3, floor),
          capacity = COALESCE($4, capacity),
          room_type = COALESCE($5, room_type),
          is_shared = COALESCE($6, is_shared),
          status = COALESCE($7, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
    `, [name, building, floor, capacity, roomType, isShared, status, id]);

    return res.json({ message: 'Room updated successfully.' });
  } catch (err: any) {
    console.error('[ROOM UPDATE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to update room.' });
  }
});

// ==========================================
// 2. TIMETABLE PERIODS MANAGEMENT
// ==========================================

// GET /api/classroom/periods - List periods for school
router.get('/periods', requireAuth, requirePermission('timetable.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const result = await db.query(`
      SELECT p.*
      FROM timetable_periods p
      WHERE p.school_id = $1
      ORDER BY p.sort_order ASC, p.period_number ASC
    `, [schoolId]);

    return res.json({ periods: result.rows });
  } catch (err: any) {
    console.error('[PERIODS LIST ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to list periods.' });
  }
});

// POST /api/classroom/periods - Create period
router.post('/periods', requireAuth, requirePermission('timetable.manage'), async (req, res) => {
  const { schoolId, sessionId, name, periodNumber, startTime, endTime, durationMinutes, periodType, sortOrder } = req.body;
  const targetSchoolId = schoolId || req.user!.schoolId;

  if (!targetSchoolId || !checkSchoolScope(req, targetSchoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (!name || periodNumber === undefined || !startTime || !endTime) {
    return res.status(400).json({ error: 'Period name, number, start time, and end time are required.' });
  }

  try {
    const id = `per_${targetSchoolId}_${Date.now().toString(36)}`;
    await db.query(`
      INSERT INTO timetable_periods (
        id, school_id, session_id, name, period_number, start_time, end_time,
        duration_minutes, period_type, sort_order, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
    `, [
      id, targetSchoolId, sessionId || null, name.trim(), periodNumber,
      startTime.trim(), endTime.trim(), durationMinutes || 45,
      periodType || 'REGULAR', sortOrder !== undefined ? sortOrder : periodNumber
    ]);

    return res.status(201).json({ message: 'Period created successfully.', id });
  } catch (err: any) {
    console.error('[PERIOD CREATE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to create period.' });
  }
});

// ==========================================
// 3. TIMETABLES & CONFLICT ENGINE
// ==========================================

// GET /api/classroom/timetables - List timetables
router.get('/timetables', requireAuth, requirePermission('timetable.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const classId = req.query.classId as string;
  const sectionId = req.query.sectionId as string;

  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const params: any[] = [schoolId];
    let whereClause = 'WHERE t.school_id = $1';

    if (classId) {
      params.push(classId);
      whereClause += ` AND t.class_id = $${params.length}`;
    }
    if (sectionId) {
      params.push(sectionId);
      whereClause += ` AND t.section_id = $${params.length}`;
    }

    const result = await db.query(`
      SELECT t.*,
        c.name as class_name,
        sec.name as section_name,
        ses.name as session_name,
        (SELECT count(*) FROM timetable_entries te WHERE te.timetable_id = t.id) as total_entries_count
      FROM timetables t
      JOIN classes c ON t.class_id = c.id
      LEFT JOIN sections sec ON t.section_id = sec.id
      JOIN academic_sessions ses ON t.session_id = ses.id
      ${whereClause}
      ORDER BY c.numeric_grade ASC, sec.name ASC, t.version DESC
    `, params);

    return res.json({ timetables: result.rows });
  } catch (err: any) {
    console.error('[TIMETABLES LIST ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to list timetables.' });
  }
});

// GET /api/classroom/timetables/:id - Get complete timetable with weekly entries
router.get('/timetables/:id', requireAuth, requirePermission('timetable.view'), async (req, res) => {
  const { id } = req.params;

  try {
    const ttRes = await db.query(`
      SELECT t.*,
        c.name as class_name,
        sec.name as section_name,
        ses.name as session_name
      FROM timetables t
      JOIN classes c ON t.class_id = c.id
      LEFT JOIN sections sec ON t.section_id = sec.id
      JOIN academic_sessions ses ON t.session_id = ses.id
      WHERE t.id = $1
    `, [id]);

    if (ttRes.rows.length === 0) {
      return res.status(404).json({ error: 'Timetable not found.' });
    }

    const timetable = ttRes.rows[0] as any;
    if (!checkSchoolScope(req, timetable.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Fetch entries
    const entriesRes = await db.query(`
      SELECT te.*,
        s.name as subject_name,
        s.code as subject_code,
        e.first_name as teacher_first_name,
        e.last_name as teacher_last_name,
        r.name as room_full_name,
        r.room_number,
        tp.name as period_name,
        tp.start_time as period_start_time,
        tp.end_time as period_end_time,
        tp.period_number,
        tp.period_type
      FROM timetable_entries te
      JOIN subjects s ON te.subject_id = s.id
      JOIN employees e ON te.teacher_employee_id = e.id
      LEFT JOIN classrooms r ON te.room_id = r.id
      JOIN timetable_periods tp ON te.period_id = tp.id
      WHERE te.timetable_id = $1
      ORDER BY tp.sort_order ASC
    `, [id]);

    return res.json({
      timetable,
      entries: entriesRes.rows
    });
  } catch (err: any) {
    console.error('[TIMETABLE GET ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to load timetable.' });
  }
});

// POST /api/classroom/timetables - Create new timetable header
router.post('/timetables', requireAuth, requirePermission('timetable.manage'), async (req, res) => {
  const { schoolId, sessionId, classId, sectionId, name, effectiveFrom, effectiveTo } = req.body;
  const targetSchoolId = schoolId || req.user!.schoolId;

  if (!targetSchoolId || !checkSchoolScope(req, targetSchoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (!sessionId || !classId || !name) {
    return res.status(400).json({ error: 'Academic session, class, and timetable name are required.' });
  }

  try {
    const id = `tt_${targetSchoolId}_${Date.now().toString(36)}`;
    await db.query(`
      INSERT INTO timetables (
        id, school_id, session_id, class_id, section_id, name, version, status,
        effective_from, effective_to, created_by_id
      ) VALUES ($1, $2, $3, $4, $5, $6, 1, 'DRAFT', $7, $8, $9)
    `, [id, targetSchoolId, sessionId, classId, sectionId || null, name.trim(), effectiveFrom || null, effectiveTo || null, req.user!.id]);

    await recordAuditLog({
      req,
      action: 'TIMETABLE_CREATED',
      module: 'CLASSROOM',
      schoolId: targetSchoolId,
      description: `Created draft timetable "${name}" for Class ID ${classId}`,
      newValues: { id, classId, sectionId }
    });

    return res.status(201).json({ message: 'Timetable created successfully.', id });
  } catch (err: any) {
    console.error('[TIMETABLE CREATE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to create timetable.' });
  }
});

// PATCH /api/classroom/timetables/:id/publish - Publish or unpublish timetable
router.patch('/timetables/:id/publish', requireAuth, requirePermission('timetable.publish'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'PUBLISHED', 'ARCHIVED', 'DRAFT'

  try {
    const curRes = await db.query('SELECT * FROM timetables WHERE id = $1', [id]);
    if (curRes.rows.length === 0) {
      return res.status(404).json({ error: 'Timetable not found.' });
    }
    const current = curRes.rows[0] as any;
    if (!checkSchoolScope(req, current.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const newStatus = status || 'PUBLISHED';
    const publisherName = `${req.user!.firstName} ${req.user!.lastName}`.trim();

    await db.query(`
      UPDATE timetables
      SET status = $1,
          published_at = CASE WHEN $1 = 'PUBLISHED' THEN CURRENT_TIMESTAMP ELSE published_at END,
          published_by_id = CASE WHEN $1 = 'PUBLISHED' THEN $2 ELSE published_by_id END,
          published_by_name = CASE WHEN $1 = 'PUBLISHED' THEN $3 ELSE published_by_name END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [newStatus, req.user!.id, publisherName, id]);

    await recordAuditLog({
      req,
      action: newStatus === 'PUBLISHED' ? 'TIMETABLE_PUBLISHED' : 'TIMETABLE_STATUS_CHANGE',
      module: 'CLASSROOM',
      schoolId: current.school_id,
      description: `Timetable "${current.name}" updated to status ${newStatus} by ${publisherName}`,
      newValues: { timetableId: id, status: newStatus }
    });

    return res.json({ message: `Timetable status updated to ${newStatus}.` });
  } catch (err: any) {
    console.error('[TIMETABLE PUBLISH ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to update timetable status.' });
  }
});

// ==========================================
// CONFLICT DETECTION & TIMETABLE ENTRIES
// ==========================================

// Helper: Conflict checker function
async function checkTimetableSlotConflict(params: {
  schoolId: string;
  dayOfWeek: string;
  periodId: string;
  teacherId: string;
  classId: string;
  sectionId?: string;
  roomId?: string;
  excludeEntryId?: string;
}) {
  const { schoolId, dayOfWeek, periodId, teacherId, classId, sectionId, roomId, excludeEntryId } = params;
  const conflicts: Array<{ type: string; message: string }> = [];

  // 1. Teacher Conflict: Is this teacher already teaching another class during this day and period?
  let teacherQuery = `
    SELECT te.*, c.name as class_name, sec.name as section_name, tp.name as period_name
    FROM timetable_entries te
    JOIN classes c ON te.class_id = c.id
    LEFT JOIN sections sec ON te.section_id = sec.id
    JOIN timetable_periods tp ON te.period_id = tp.id
    WHERE te.school_id = $1
      AND te.day_of_week = $2
      AND te.period_id = $3
      AND te.teacher_employee_id = $4
  `;
  const tParams: any[] = [schoolId, dayOfWeek, periodId, teacherId];
  if (excludeEntryId) {
    tParams.push(excludeEntryId);
    teacherQuery += ` AND te.id != $${tParams.length}`;
  }

  const teacherCheck = await db.query(teacherQuery, tParams);
  if (teacherCheck.rows.length > 0) {
    const row = teacherCheck.rows[0] as any;
    conflicts.push({
      type: 'TEACHER_CONFLICT',
      message: `Teacher is already assigned to ${row.class_name} ${row.section_name ? `(${row.section_name})` : ''} during ${row.period_name} on ${dayOfWeek}.`
    });
  }

  // 2. Class Conflict: Is this class/section already assigned a subject during this day and period?
  let classQuery = `
    SELECT te.*, s.name as subject_name, tp.name as period_name
    FROM timetable_entries te
    JOIN subjects s ON te.subject_id = s.id
    JOIN timetable_periods tp ON te.period_id = tp.id
    WHERE te.school_id = $1
      AND te.day_of_week = $2
      AND te.period_id = $3
      AND te.class_id = $4
  `;
  const cParams: any[] = [schoolId, dayOfWeek, periodId, classId];
  if (sectionId) {
    cParams.push(sectionId);
    classQuery += ` AND te.section_id = $${cParams.length}`;
  }
  if (excludeEntryId) {
    cParams.push(excludeEntryId);
    classQuery += ` AND te.id != $${cParams.length}`;
  }

  const classCheck = await db.query(classQuery, cParams);
  if (classCheck.rows.length > 0) {
    const row = classCheck.rows[0] as any;
    conflicts.push({
      type: 'CLASS_CONFLICT',
      message: `This class section already has ${row.subject_name} scheduled during ${row.period_name} on ${dayOfWeek}.`
    });
  }

  // 3. Room Conflict: Is this room already in use by another class during this period?
  if (roomId) {
    const roomInfo = await db.query('SELECT is_shared, name, room_number FROM classrooms WHERE id = $1', [roomId]);
    if (roomInfo.rows.length > 0 && !(roomInfo.rows[0] as any).is_shared) {
      let rQuery = `
        SELECT te.*, c.name as class_name, tp.name as period_name
        FROM timetable_entries te
        JOIN classes c ON te.class_id = c.id
        JOIN timetable_periods tp ON te.period_id = tp.id
        WHERE te.school_id = $1
          AND te.day_of_week = $2
          AND te.period_id = $3
          AND te.room_id = $4
      `;
      const rParams: any[] = [schoolId, dayOfWeek, periodId, roomId];
      if (excludeEntryId) {
        rParams.push(excludeEntryId);
        rQuery += ` AND te.id != $${rParams.length}`;
      }
      const roomCheck = await db.query(rQuery, rParams);
      if (roomCheck.rows.length > 0) {
        const row = roomCheck.rows[0] as any;
        conflicts.push({
          type: 'ROOM_CONFLICT',
          message: `Room ${(roomInfo.rows[0] as any).room_number} is already occupied by ${row.class_name} during ${row.period_name} on ${dayOfWeek}.`
        });
      }
    }
  }

  return conflicts;
}

// POST /api/classroom/timetables/check-conflict - Preview conflict check API
router.post('/timetables/check-conflict', requireAuth, requirePermission('timetable.view'), async (req, res) => {
  const { schoolId, dayOfWeek, periodId, teacherId, classId, sectionId, roomId, excludeEntryId } = req.body;
  const targetSchoolId = schoolId || req.user!.schoolId;

  try {
    const conflicts = await checkTimetableSlotConflict({
      schoolId: targetSchoolId,
      dayOfWeek,
      periodId,
      teacherId,
      classId,
      sectionId,
      roomId,
      excludeEntryId
    });

    return res.json({
      hasConflict: conflicts.length > 0,
      conflicts
    });
  } catch (err: any) {
    console.error('[CONFLICT PREVIEW ERROR]', err);
    return res.status(500).json({ error: err.message || 'Conflict check failed.' });
  }
});

// POST /api/classroom/timetables/entries - Add slot entry with conflict detection & override
router.post('/timetables/entries', requireAuth, requirePermission('timetable.manage'), async (req, res) => {
  const {
    timetableId,
    classId,
    sectionId,
    sessionId,
    schoolId,
    dayOfWeek,
    periodId,
    subjectId,
    teacherId,
    roomId,
    allowOverride,
    overrideReason
  } = req.body;

  try {
    let targetTimetableId = timetableId;
    if (!targetTimetableId && (classId || req.body.class_id)) {
      const cls = classId || req.body.class_id;
      const sec = sectionId || req.body.section_id || null;
      const sch = schoolId || req.body.school_id || req.user!.schoolId || 'sch_vvps';
      const ses = sessionId || req.body.session_id || 'ses_2026_27';

      const existingTt = await db.query(
        `SELECT id, school_id, class_id, section_id FROM timetables WHERE school_id = $1 AND class_id = $2 AND (section_id = $3 OR section_id IS NULL) LIMIT 1`,
        [sch, cls, sec]
      );
      if (existingTt.rows.length > 0) {
        targetTimetableId = (existingTt.rows[0] as any).id;
      } else {
        targetTimetableId = `tt_${Date.now()}`;
        await db.query(`
          INSERT INTO timetables (id, school_id, session_id, class_id, section_id, name, status)
          VALUES ($1, $2, $3, $4, $5, $6, 'active')
        `, [
          targetTimetableId,
          sch,
          ses,
          cls,
          sec,
          `Class Timetable`
        ]);
      }
    }

    const ttRes = await db.query('SELECT * FROM timetables WHERE id = $1', [targetTimetableId]);
    if (ttRes.rows.length === 0) {
      return res.status(404).json({ error: 'Timetable not found.' });
    }
    const tt = ttRes.rows[0] as any;
    if (!checkSchoolScope(req, tt.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Run conflict detection
    const conflicts = await checkTimetableSlotConflict({
      schoolId: tt.school_id,
      dayOfWeek,
      periodId,
      teacherId,
      classId: tt.class_id,
      sectionId: tt.section_id,
      roomId
    });

    if (conflicts.length > 0 && !allowOverride) {
      return res.status(409).json({
        error: 'Timetable assignment conflict detected.',
        conflicts
      });
    }

    // Lookup room name
    let roomName = null;
    if (roomId) {
      const r = await db.query('SELECT room_number, name FROM classrooms WHERE id = $1', [roomId]);
      if (r.rows.length > 0) roomName = `${(r.rows[0] as any).name} (${(r.rows[0] as any).room_number})`;
    }

    const id = `tte_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const overrideByName = allowOverride ? `${req.user!.firstName} ${req.user!.lastName}`.trim() : null;

    await db.query(`
      INSERT INTO timetable_entries (
        id, timetable_id, school_id, session_id, class_id, section_id,
        day_of_week, period_id, subject_id, teacher_employee_id, room_id, room_name,
        is_conflict_overridden, override_reason, override_by_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      id, targetTimetableId, tt.school_id, tt.session_id, tt.class_id, tt.section_id,
      dayOfWeek, periodId, subjectId, teacherId, roomId || null, roomName,
      !!allowOverride, overrideReason || null, overrideByName
    ]);

    if (allowOverride) {
      await recordAuditLog({
        req,
        action: 'TIMETABLE_CONFLICT_OVERRIDDEN',
        module: 'CLASSROOM',
        schoolId: tt.school_id,
        description: `Administrator authorized conflict override: ${overrideReason || 'Administrative exception'}`,
        details: { entryId: id, dayOfWeek, periodId, teacherId, conflicts }
      });
    }

    return res.status(201).json({ message: 'Timetable slot created successfully.', id });
  } catch (err: any) {
    console.error('[TIMETABLE ENTRY CREATE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to create timetable slot.' });
  }
});

// DELETE /api/classroom/timetables/entries/:id - Remove timetable entry
router.delete('/timetables/entries/:id', requireAuth, requirePermission('timetable.manage'), async (req, res) => {
  const { id } = req.params;

  try {
    const curRes = await db.query('SELECT * FROM timetable_entries WHERE id = $1', [id]);
    if (curRes.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found.' });
    }
    const current = curRes.rows[0] as any;
    if (!checkSchoolScope(req, current.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    await db.query('DELETE FROM timetable_entries WHERE id = $1', [id]);
    return res.json({ message: 'Timetable slot deleted successfully.' });
  } catch (err: any) {
    console.error('[TIMETABLE ENTRY DELETE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to delete slot.' });
  }
});

// ==========================================
// 4. TIMETABLE VIEWS (Class, Teacher, Room, School)
// ==========================================

// GET /api/classroom/views/class - Class Weekly Grid View
router.get('/views/class', requireAuth, requirePermission('timetable.view'), async (req, res) => {
  const classId = req.query.classId as string;
  const sectionId = req.query.sectionId as string;
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  if (!classId) {
    return res.status(400).json({ error: 'Class ID is required.' });
  }

  try {
    const params: any[] = [classId];
    let query = `
      SELECT te.*,
        s.name as subject_name,
        s.code as subject_code,
        e.first_name as teacher_first_name,
        e.last_name as teacher_last_name,
        r.name as room_full_name,
        r.room_number,
        tp.name as period_name,
        tp.start_time as period_start_time,
        tp.end_time as period_end_time,
        tp.period_number,
        tp.period_type,
        tp.sort_order
      FROM timetable_entries te
      JOIN timetables t ON te.timetable_id = t.id
      JOIN subjects s ON te.subject_id = s.id
      JOIN employees e ON te.teacher_employee_id = e.id
      LEFT JOIN classrooms r ON te.room_id = r.id
      JOIN timetable_periods tp ON te.period_id = tp.id
      WHERE te.class_id = $1
    `;

    if (sectionId) {
      params.push(sectionId);
      query += ` AND te.section_id = $${params.length}`;
    }
    query += ` ORDER BY tp.sort_order ASC, te.day_of_week ASC`;

    const entriesRes = await db.query(query, params);
    const periodsRes = await db.query(`
      SELECT * FROM timetable_periods
      WHERE school_id = $1
      ORDER BY sort_order ASC
    `, [schoolId]);

    return res.json({
      entries: entriesRes.rows,
      periods: periodsRes.rows
    });
  } catch (err: any) {
    console.error('[CLASS VIEW ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to get class timetable.' });
  }
});

// GET /api/classroom/views/teacher - Teacher Timetable View
router.get('/views/teacher', requireAuth, requirePermission('timetable.view'), async (req, res) => {
  const teacherId = (req.query.teacherId as string) || req.user!.employeeId;
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  if (!teacherId) {
    return res.status(400).json({ error: 'Teacher Employee ID is required.' });
  }

  try {
    const entriesRes = await db.query(`
      SELECT te.*,
        c.name as class_name,
        sec.name as section_name,
        s.name as subject_name,
        s.code as subject_code,
        r.name as room_full_name,
        r.room_number,
        tp.name as period_name,
        tp.start_time as period_start_time,
        tp.end_time as period_end_time,
        tp.period_number,
        tp.period_type,
        tp.sort_order
      FROM timetable_entries te
      JOIN classes c ON te.class_id = c.id
      LEFT JOIN sections sec ON te.section_id = sec.id
      JOIN subjects s ON te.subject_id = s.id
      LEFT JOIN classrooms r ON te.room_id = r.id
      JOIN timetable_periods tp ON te.period_id = tp.id
      WHERE te.teacher_employee_id = $1
      ORDER BY tp.sort_order ASC, te.day_of_week ASC
    `, [teacherId]);

    const periodsRes = await db.query(`
      SELECT * FROM timetable_periods
      WHERE school_id = $1
      ORDER BY sort_order ASC
    `, [schoolId]);

    return res.json({
      entries: entriesRes.rows,
      periods: periodsRes.rows
    });
  } catch (err: any) {
    console.error('[TEACHER VIEW ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to get teacher timetable.' });
  }
});

// ==========================================
// 5. TEACHER SUBSTITUTION MANAGEMENT
// ==========================================

// GET /api/classroom/substitutions - List substitutions
router.get('/substitutions', requireAuth, requirePermission('timetable.substitution.manage'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const date = req.query.date as string;

  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const params: any[] = [schoolId];
    let query = `
      SELECT ts.*,
        o.first_name as original_first_name, o.last_name as original_last_name,
        s.first_name as substitute_first_name, s.last_name as substitute_last_name
      FROM teacher_substitutions ts
      JOIN employees o ON ts.original_teacher_id = o.id
      JOIN employees s ON ts.substitute_teacher_id = s.id
      WHERE ts.school_id = $1
    `;

    if (date) {
      params.push(date);
      query += ` AND ts.substitution_date = $${params.length}`;
    }
    query += ` ORDER BY ts.substitution_date DESC, ts.created_at DESC`;

    const result = await db.query(query, params);
    return res.json({ substitutions: result.rows });
  } catch (err: any) {
    console.error('[SUBSTITUTIONS LIST ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to list substitutions.' });
  }
});

// POST /api/classroom/substitutions - Create teacher substitution
router.post('/substitutions', requireAuth, requirePermission('timetable.substitution.manage'), async (req, res) => {
  const {
    schoolId,
    timetableEntryId,
    substitutionDate,
    originalTeacherId,
    substituteTeacherId,
    classId,
    sectionId,
    subjectId,
    periodId,
    reason,
    remarks
  } = req.body;

  const targetSchoolId = schoolId || req.user!.schoolId;
  if (!targetSchoolId || !checkSchoolScope(req, targetSchoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (!substitutionDate || !originalTeacherId || !substituteTeacherId || !reason) {
    return res.status(400).json({ error: 'Date, original teacher, substitute teacher, and reason are required.' });
  }

  try {
    // Check if substitute teacher is already occupied in that period
    if (periodId) {
      const busyCheck = await db.query(`
        SELECT count(*) as count FROM timetable_entries
        WHERE school_id = $1 AND period_id = $2 AND teacher_employee_id = $3
      `, [targetSchoolId, periodId, substituteTeacherId]);

      if (parseInt((busyCheck.rows[0] as any).count, 10) > 0) {
        return res.status(409).json({
          error: 'Substitute conflict: Selected substitute teacher already has an assigned class during this period.'
        });
      }
    }

    // Lookup metadata
    const origTeacher = await db.query('SELECT first_name, last_name FROM employees WHERE id = $1', [originalTeacherId]);
    const subTeacher = await db.query('SELECT first_name, last_name, user_id FROM employees WHERE id = $1', [substituteTeacherId]);
    const cls = classId ? await db.query('SELECT name FROM classes WHERE id = $1', [classId]) : { rows: [] };
    const sec = sectionId ? await db.query('SELECT name FROM sections WHERE id = $1', [sectionId]) : { rows: [] };
    const sub = subjectId ? await db.query('SELECT name FROM subjects WHERE id = $1', [subjectId]) : { rows: [] };
    const per = periodId ? await db.query('SELECT name, start_time, end_time FROM timetable_periods WHERE id = $1', [periodId]) : { rows: [] };

    const origName = origTeacher.rows[0] ? `${(origTeacher.rows[0] as any).first_name} ${(origTeacher.rows[0] as any).last_name}` : 'Staff';
    const subName = subTeacher.rows[0] ? `${(subTeacher.rows[0] as any).first_name} ${(subTeacher.rows[0] as any).last_name}` : 'Staff';

    const id = `subst_${Date.now().toString(36)}`;
    const createdByName = `${req.user!.firstName} ${req.user!.lastName}`.trim();

    await db.query(`
      INSERT INTO teacher_substitutions (
        id, school_id, timetable_entry_id, substitution_date,
        original_teacher_id, original_teacher_name,
        substitute_teacher_id, substitute_teacher_name,
        class_id, class_name, section_id, section_name,
        subject_id, subject_name, period_id, period_name, period_time,
        reason, status, remarks, created_by_id, created_by_name,
        approved_by_id, approved_by_name
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, 'APPROVED', $19, $20, $21, $20, $21
      )
    `, [
      id, targetSchoolId, timetableEntryId || null, substitutionDate,
      originalTeacherId, origName,
      substituteTeacherId, subName,
      classId || null, cls.rows[0] ? (cls.rows[0] as any).name : null,
      sectionId || null, sec.rows[0] ? (sec.rows[0] as any).name : null,
      subjectId || null, sub.rows[0] ? (sub.rows[0] as any).name : null,
      periodId || null, per.rows[0] ? (per.rows[0] as any).name : null,
      per.rows[0] ? `${(per.rows[0] as any).start_time} - ${(per.rows[0] as any).end_time}` : null,
      reason, remarks || null, req.user!.id, createdByName
    ]);

    // Send notification to substitute teacher if user account exists
    const subUserId = subTeacher.rows[0] ? (subTeacher.rows[0] as any).user_id : null;
    if (subUserId) {
      await db.query(`
        INSERT INTO classroom_notifications (id, school_id, user_id, event_type, title, message, link_url)
        VALUES ($1, $2, $3, 'SUBSTITUTION_ASSIGNED', $4, $5, '/classroom')
      `, [
        `cnotif_${Date.now().toString(36)}`, targetSchoolId, subUserId,
        `Substitution: ${cls.rows[0] ? (cls.rows[0] as any).name : 'Class'} on ${substitutionDate}`,
        `You are requested to cover for ${origName} during ${per.rows[0] ? (per.rows[0] as any).name : 'scheduled period'}.`
      ]);
    }

    await recordAuditLog({
      req,
      action: 'TEACHER_SUBSTITUTION_ASSIGNED',
      module: 'CLASSROOM',
      schoolId: targetSchoolId,
      description: `Assigned substitute ${subName} for ${origName} on ${substitutionDate}`,
      details: { id, originalTeacherId, substituteTeacherId, substitutionDate }
    });

    return res.status(201).json({ message: 'Teacher substitution assigned successfully.', id });
  } catch (err: any) {
    console.error('[SUBSTITUTION ASSIGN ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to assign substitution.' });
  }
});

// ==========================================
// 6. HOMEWORK MANAGEMENT
// ==========================================

// GET /api/classroom/homework - List homework
router.get('/homework', requireAuth, requirePermission('homework.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const classId = req.query.classId as string;
  const sectionId = req.query.sectionId as string;
  const subjectId = req.query.subjectId as string;
  const studentId = req.query.studentId as string;

  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const params: any[] = [schoolId];
    let query = `
      SELECT h.*,
        c.name as class_name,
        sec.name as section_name,
        s.name as subject_name,
        s.code as subject_code,
        (SELECT count(*) FROM homework_submissions hs WHERE hs.homework_id = h.id) as total_submissions_count,
        (SELECT count(*) FROM homework_submissions hs WHERE hs.homework_id = h.id AND hs.status = 'EVALUATED') as evaluated_count
    `;

    if (studentId) {
      params.push(studentId);
      query += `,
        (SELECT hs.status FROM homework_submissions hs WHERE hs.homework_id = h.id AND hs.student_id = $${params.length}) as student_submission_status,
        (SELECT hs.marks_obtained FROM homework_submissions hs WHERE hs.homework_id = h.id AND hs.student_id = $${params.length}) as student_marks_obtained,
        (SELECT hs.grade FROM homework_submissions hs WHERE hs.homework_id = h.id AND hs.student_id = $${params.length}) as student_grade,
        (SELECT hs.teacher_feedback FROM homework_submissions hs WHERE hs.homework_id = h.id AND hs.student_id = $${params.length}) as student_feedback
      `;
    }

    query += `
      FROM homework h
      JOIN classes c ON h.class_id = c.id
      LEFT JOIN sections sec ON h.section_id = sec.id
      JOIN subjects s ON h.subject_id = s.id
      WHERE h.school_id = $1
    `;

    if (classId) {
      params.push(classId);
      query += ` AND h.class_id = $${params.length}`;
    }
    if (sectionId) {
      params.push(sectionId);
      query += ` AND (h.section_id = $${params.length} OR h.section_id IS NULL)`;
    }
    if (subjectId) {
      params.push(subjectId);
      query += ` AND h.subject_id = $${params.length}`;
    }

    query += ` ORDER BY h.due_date ASC, h.created_at DESC`;

    const result = await db.query(query, params);
    return res.json({ homework: result.rows });
  } catch (err: any) {
    console.error('[HOMEWORK LIST ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to list homework.' });
  }
});

// POST /api/classroom/homework - Create homework
router.post('/homework', requireAuth, requirePermission('homework.create'), async (req, res) => {
  const school_id = req.body.schoolId || req.body.school_id || req.user!.schoolId;
  const session_id = req.body.sessionId || req.body.session_id;
  const class_id = req.body.classId || req.body.class_id;
  const section_id = req.body.sectionId || req.body.section_id;
  const subject_id = req.body.subjectId || req.body.subject_id;
  const title = req.body.title;
  const description = req.body.description;
  const assignedDate = req.body.assignedDate || req.body.assigned_date || new Date().toISOString().split('T')[0];
  const dueDate = req.body.dueDate || req.body.due_date;
  const maxMarks = req.body.maxMarks || req.body.max_marks || 20;
  const priority = req.body.priority;
  const instructions = req.body.instructions;
  const attachments = req.body.attachments;
  const status = req.body.status;

  const targetSchoolId = school_id || req.user!.schoolId;
  if (!targetSchoolId || !checkSchoolScope(req, targetSchoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (!class_id || !subject_id || !title || !description || !dueDate) {
    return res.status(400).json({ error: 'Class, subject, title, description, and due date are required.' });
  }

  try {
    const id = `hw_${targetSchoolId}_${Date.now().toString(36)}`;
    const teacherName = `${req.user!.firstName} ${req.user!.lastName}`.trim();
    const teacherId = req.user!.employeeId || 'emp_vvps_001';

    await db.query(`
      INSERT INTO homework (
        id, school_id, session_id, class_id, section_id, subject_id,
        teacher_id, teacher_name, title, description, assigned_date, due_date,
        max_marks, priority, instructions, attachments, status, created_by_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `, [
      id, targetSchoolId, session_id || 'ses_2026_27', class_id, section_id || null, subject_id,
      teacherId, teacherName, title.trim(), description.trim(), assignedDate, dueDate,
      maxMarks || 20, priority || 'NORMAL', instructions || null,
      typeof attachments === 'string' ? attachments : JSON.stringify(attachments || []),
      status || 'PUBLISHED', req.user!.id
    ]);

    await recordAuditLog({
      req,
      action: 'HOMEWORK_CREATED',
      module: 'CLASSROOM',
      schoolId: targetSchoolId,
      description: `Created homework "${title}" for Class ${class_id}`,
      details: { id, classId: class_id, subjectId: subject_id, dueDate }
    });

    return res.status(201).json({ message: 'Homework created successfully.', id });
  } catch (err: any) {
    console.error('[HOMEWORK CREATE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to create homework.' });
  }
});

// GET /api/classroom/homework/:id/submissions - List student submissions
router.get('/homework/:id/submissions', requireAuth, requirePermission('homework.view'), async (req, res) => {
  const { id } = req.params;

  try {
    const hwRes = await db.query('SELECT * FROM homework WHERE id = $1', [id]);
    if (hwRes.rows.length === 0) {
      return res.status(404).json({ error: 'Homework not found.' });
    }
    const hw = hwRes.rows[0] as any;
    if (!checkSchoolScope(req, hw.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // List enrolled students in that class and join their submission
    const result = await db.query(`
      SELECT s.id as student_id,
             s.admission_number,
             s.first_name,
             s.last_name,
             c.name as class_name,
             sec.name as section_name,
             hs.id as submission_id,
             hs.status as submission_status,
             hs.submission_date,
             hs.is_late,
             hs.text_content,
             hs.submitted_files,
             hs.marks_obtained,
             hs.grade,
             hs.teacher_feedback,
             hs.evaluated_by_name,
             hs.evaluated_at
      FROM students s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN homework_submissions hs ON (hs.homework_id = $1 AND hs.student_id = s.id)
      WHERE s.class_id = $2
        ${hw.section_id ? 'AND s.section_id = $3' : ''}
        AND s.student_status = 'ACTIVE'
      ORDER BY s.first_name ASC, s.last_name ASC
    `, hw.section_id ? [id, hw.class_id, hw.section_id] : [id, hw.class_id]);

    return res.json({
      homework: hw,
      submissions: result.rows
    });
  } catch (err: any) {
    console.error('[SUBMISSIONS LIST ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to list submissions.' });
  }
});

// POST /api/classroom/homework/:id/submit - Student submits homework
router.post('/homework/:id/submit', requireAuth, requirePermission('homework.submit'), async (req, res) => {
  const { id } = req.params;
  const { studentId, textContent, submittedFiles, studentRemarks } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: 'Student ID is required.' });
  }

  try {
    const hwRes = await db.query('SELECT * FROM homework WHERE id = $1', [id]);
    if (hwRes.rows.length === 0) {
      return res.status(404).json({ error: 'Homework not found.' });
    }
    const hw = hwRes.rows[0] as any;
    if (!checkSchoolScope(req, hw.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Check late submission
    const now = new Date();
    const dueDate = new Date(hw.due_date);
    const isLate = now > dueDate;
    const subStatus = isLate ? 'LATE' : 'SUBMITTED';

    const subId = `subm_${id}_${studentId}`;
    await db.query(`
      INSERT INTO homework_submissions (
        id, homework_id, student_id, school_id, submission_date, status, is_late,
        text_content, submitted_files, student_remarks, updated_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      ON CONFLICT (homework_id, student_id) DO UPDATE SET
        submission_date = CURRENT_TIMESTAMP,
        status = EXCLUDED.status,
        is_late = EXCLUDED.is_late,
        text_content = EXCLUDED.text_content,
        submitted_files = EXCLUDED.submitted_files,
        student_remarks = EXCLUDED.student_remarks,
        updated_at = CURRENT_TIMESTAMP
    `, [
      subId, id, studentId, hw.school_id, subStatus, isLate,
      textContent || '',
      typeof submittedFiles === 'string' ? submittedFiles : JSON.stringify(submittedFiles || []),
      studentRemarks || null
    ]);

    return res.json({
      success: true,
      submissionId: subId,
      message: isLate ? 'Homework submitted (marked late).' : 'Homework submitted successfully!',
      status: subStatus
    });
  } catch (err: any) {
    console.error('[HOMEWORK SUBMISSION ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to submit homework.' });
  }
});

// PATCH /api/classroom/homework/submissions/:submissionId/evaluate - Teacher evaluates homework
router.patch('/homework/submissions/:submissionId/evaluate', requireAuth, requirePermission('homework.evaluate'), async (req, res) => {
  const { submissionId } = req.params;
  const { marksObtained, grade, teacherFeedback, feedback } = req.body;
  const finalFeedback = teacherFeedback || feedback || '';

  try {
    const subRes = await db.query('SELECT * FROM homework_submissions WHERE id = $1', [submissionId]);
    if (subRes.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found.' });
    }
    const sub = subRes.rows[0] as any;
    if (!checkSchoolScope(req, sub.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const evaluatorName = `${req.user!.firstName} ${req.user!.lastName}`.trim();

    await db.query(`
      UPDATE homework_submissions
      SET marks_obtained = $1,
          grade = $2,
          teacher_feedback = $3,
          status = 'EVALUATED',
          evaluated_by_id = $4,
          evaluated_by_name = $5,
          evaluated_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [marksObtained, grade || null, finalFeedback, req.user!.id, evaluatorName, submissionId]);

    // Send notification to student
    await db.query(`
      INSERT INTO classroom_notifications (id, school_id, student_id, event_type, title, message, link_url)
      VALUES ($1, $2, $3, 'HOMEWORK_EVALUATED', 'Homework Evaluated & Graded', $4, '/classroom')
    `, [
      `cnotif_${Date.now().toString(36)}`, sub.school_id, sub.student_id,
      `Your submission was evaluated by ${evaluatorName}: Marks ${marksObtained} (${grade || 'Good'}). Feedback: "${finalFeedback || 'Good effort.'}"`
    ]);

    return res.json({ success: true, message: 'Submission evaluated successfully.' });
  } catch (err: any) {
    console.error('[EVALUATE SUBMISSION ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to evaluate submission.' });
  }
});

// ==========================================
// 7. LEARNING MATERIALS & STUDY RESOURCES
// ==========================================

// GET /api/classroom/materials - List study materials
router.get('/materials', requireAuth, requirePermission('materials.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const classId = req.query.classId as string;
  const subjectId = req.query.subjectId as string;

  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const params: any[] = [schoolId];
    let query = `
      SELECT lm.*,
        c.name as class_name,
        s.name as subject_name,
        s.code as subject_code
      FROM learning_materials lm
      JOIN classes c ON lm.class_id = c.id
      JOIN subjects s ON lm.subject_id = s.id
      WHERE lm.school_id = $1 AND lm.status = 'ACTIVE'
    `;

    if (classId) {
      params.push(classId);
      query += ` AND lm.class_id = $${params.length}`;
    }
    if (subjectId) {
      params.push(subjectId);
      query += ` AND lm.subject_id = $${params.length}`;
    }

    query += ` ORDER BY lm.created_at DESC`;

    const result = await db.query(query, params);
    return res.json({ materials: result.rows });
  } catch (err: any) {
    console.error('[MATERIALS LIST ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to list materials.' });
  }
});

// POST /api/classroom/materials - Upload study material
router.post('/materials', requireAuth, requirePermission('materials.upload'), async (req, res) => {
  const {
    schoolId, sessionId, classId, sectionId, subjectId,
    title, description, materialType, fileUrl, fileName, fileSize, visibility
  } = req.body;

  const targetSchoolId = schoolId || req.user!.schoolId;
  if (!targetSchoolId || !checkSchoolScope(req, targetSchoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (!classId || !subjectId || !title) {
    return res.status(400).json({ error: 'Class, subject, and title are required.' });
  }

  try {
    const id = `mat_${targetSchoolId}_${Date.now().toString(36)}`;
    const teacherName = `${req.user!.firstName} ${req.user!.lastName}`.trim();
    const teacherId = req.user!.employeeId || 'emp_vvps_001';

    await db.query(`
      INSERT INTO learning_materials (
        id, school_id, session_id, class_id, section_id, subject_id,
        teacher_id, teacher_name, title, description, material_type,
        file_url, file_name, file_size, visibility, status, created_by_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'ACTIVE', $16)
    `, [
      id, targetSchoolId, sessionId || 'sess_vvps_2526', classId, sectionId || null, subjectId,
      teacherId, teacherName, title.trim(), description || null, materialType || 'DOCUMENT',
      fileUrl || '#', fileName || `${title.replace(/\s+/g, '_')}.pdf`, fileSize || '1.5 MB',
      visibility || 'CLASS', req.user!.id
    ]);

    await recordAuditLog({
      req,
      action: 'MATERIAL_UPLOADED',
      module: 'CLASSROOM',
      schoolId: targetSchoolId,
      description: `Uploaded resource "${title}" for Class ${classId}`,
      details: { id, classId, subjectId }
    });

    return res.status(201).json({ message: 'Study material uploaded successfully.', id });
  } catch (err: any) {
    console.error('[MATERIAL UPLOAD ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to upload material.' });
  }
});

// ==========================================
// 8. CLASSROOM NOTICES & ANNOUNCEMENTS
// ==========================================

// GET /api/classroom/notices - List classroom notices
router.get('/notices', requireAuth, requirePermission('notices.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const classId = req.query.classId as string;

  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const params: any[] = [schoolId];
    let query = `
      SELECT cn.*,
        c.name as class_name,
        sec.name as section_name,
        s.name as subject_name
      FROM classroom_notices cn
      LEFT JOIN classes c ON cn.class_id = c.id
      LEFT JOIN sections sec ON cn.section_id = sec.id
      LEFT JOIN subjects s ON cn.subject_id = s.id
      WHERE cn.school_id = $1 AND cn.status = 'PUBLISHED'
    `;

    if (classId) {
      params.push(classId);
      query += ` AND (cn.class_id = $${params.length} OR cn.class_id IS NULL)`;
    }

    query += ` ORDER BY cn.publish_date DESC, cn.created_at DESC`;

    const result = await db.query(query, params);
    return res.json({ notices: result.rows });
  } catch (err: any) {
    console.error('[NOTICES LIST ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to list notices.' });
  }
});

// POST /api/classroom/notices - Create notice
router.post('/notices', requireAuth, requirePermission('notices.publish'), async (req, res) => {
  const {
    schoolId, sessionId, classId, sectionId, subjectId,
    title, content, targetAudience, priority, publishDate, expiryDate, attachmentUrl, attachmentName
  } = req.body;

  const targetSchoolId = schoolId || req.user!.schoolId;
  if (!targetSchoolId || !checkSchoolScope(req, targetSchoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (!title || !content || !publishDate) {
    return res.status(400).json({ error: 'Title, content, and publish date are required.' });
  }

  try {
    const id = `ntc_${targetSchoolId}_${Date.now().toString(36)}`;
    const authorName = `${req.user!.firstName} ${req.user!.lastName}`.trim();

    await db.query(`
      INSERT INTO classroom_notices (
        id, school_id, session_id, class_id, section_id, subject_id,
        title, content, target_audience, priority, publish_date, expiry_date,
        attachment_url, attachment_name, author_name, status, created_by_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'PUBLISHED', $16)
    `, [
      id, targetSchoolId, sessionId || 'sess_vvps_2526', classId || null, sectionId || null, subjectId || null,
      title.trim(), content.trim(), targetAudience || 'ALL', priority || 'NORMAL',
      publishDate, expiryDate || null, attachmentUrl || null, attachmentName || null,
      authorName, req.user!.id
    ]);

    await recordAuditLog({
      req,
      action: 'NOTICE_PUBLISHED',
      module: 'CLASSROOM',
      schoolId: targetSchoolId,
      description: `Published classroom notice: "${title}"`,
      details: { id, targetAudience, classId }
    });

    return res.status(201).json({ message: 'Classroom notice published successfully.', id });
  } catch (err: any) {
    console.error('[NOTICE CREATE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to publish notice.' });
  }
});

// ==========================================
// 9. DASHBOARD SUMMARY ENDPOINTS
// ==========================================

// GET /api/classroom/dashboard/summary - Key Classroom Metrics
router.get('/dashboard/summary', requireAuth, requirePermission('timetable.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const totalTimetables = await db.query('SELECT count(*) as count FROM timetables WHERE school_id = $1', [schoolId]);
    const publishedTimetables = await db.query('SELECT count(*) as count FROM timetables WHERE school_id = $1 AND status = \'PUBLISHED\'', [schoolId]);
    const totalHomework = await db.query('SELECT count(*) as count FROM homework WHERE school_id = $1', [schoolId]);
    const activeHomework = await db.query('SELECT count(*) as count FROM homework WHERE school_id = $1 AND status = \'PUBLISHED\'', [schoolId]);
    const totalMaterials = await db.query('SELECT count(*) as count FROM learning_materials WHERE school_id = $1', [schoolId]);
    const totalNotices = await db.query('SELECT count(*) as count FROM classroom_notices WHERE school_id = $1 AND status = \'PUBLISHED\'', [schoolId]);
    const todaySubstitutions = await db.query(`
      SELECT count(*) as count FROM teacher_substitutions
      WHERE school_id = $1 AND substitution_date = CURRENT_DATE
    `, [schoolId]);
    const totalRooms = await db.query('SELECT count(*) as count FROM classrooms WHERE school_id = $1', [schoolId]);

    // Homework submission stats
    const hwSubmissionStats = await db.query(`
      SELECT
        count(hs.id) as total_submitted,
        count(CASE WHEN hs.status = 'EVALUATED' THEN 1 END) as evaluated,
        count(CASE WHEN hs.is_late = true THEN 1 END) as late_submissions
      FROM homework_submissions hs
      WHERE hs.school_id = $1
    `, [schoolId]);

    return res.json({
      totalTimetables: parseInt((totalTimetables.rows[0] as any).count, 10),
      publishedTimetables: parseInt((publishedTimetables.rows[0] as any).count, 10),
      totalHomework: parseInt((totalHomework.rows[0] as any).count, 10),
      activeHomework: parseInt((activeHomework.rows[0] as any).count, 10),
      totalMaterials: parseInt((totalMaterials.rows[0] as any).count, 10),
      totalNotices: parseInt((totalNotices.rows[0] as any).count, 10),
      todaySubstitutions: parseInt((todaySubstitutions.rows[0] as any).count, 10),
      totalRooms: parseInt((totalRooms.rows[0] as any).count, 10),
      submissionMetrics: {
        submitted: parseInt((hwSubmissionStats.rows[0] as any).total_submitted, 10),
        evaluated: parseInt((hwSubmissionStats.rows[0] as any).evaluated, 10),
        late: parseInt((hwSubmissionStats.rows[0] as any).late_submissions, 10)
      }
    });
  } catch (err: any) {
    console.error('[CLASSROOM SUMMARY ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to get classroom summary.' });
  }
});

// GET /api/classroom/reports/teacher-workload - Teacher workload report
router.get('/reports/teacher-workload', requireAuth, requirePermission('classroom.reports.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const result = await db.query(`
      SELECT e.id as teacher_id,
             e.first_name,
             e.last_name,
             e.employee_id_number,
             (SELECT count(*) FROM timetable_entries te WHERE te.teacher_employee_id = e.id) as periods_per_week,
             (SELECT count(DISTINCT te.class_id) FROM timetable_entries te WHERE te.teacher_employee_id = e.id) as classes_assigned_count,
             (SELECT count(DISTINCT te.subject_id) FROM timetable_entries te WHERE te.teacher_employee_id = e.id) as subjects_assigned_count,
             (SELECT count(*) FROM teacher_substitutions ts WHERE ts.substitute_teacher_id = e.id) as substitution_periods_count,
             (SELECT count(*) FROM homework h WHERE h.teacher_id = e.id) as homework_assigned_count
      FROM employees e
      WHERE e.school_id = $1 AND e.employee_type = 'Teaching' AND e.employment_status = 'ACTIVE'
      ORDER BY periods_per_week DESC, e.first_name ASC
    `, [schoolId]);

    return res.json({ workload: result.rows });
  } catch (err: any) {
    console.error('[TEACHER WORKLOAD REPORT ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to get teacher workload.' });
  }
});

export default router;
