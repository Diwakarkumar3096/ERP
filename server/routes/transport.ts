import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// ==========================================
// 1. TRANSPORT DASHBOARD & ANALYTICS
// ==========================================
router.get('/dashboard', requireAuth, requirePermission('transport.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId) return res.status(400).json({ error: 'School ID required' });

  try {
    // 1. Fleet stats
    const vehiclesRes = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive,
        COUNT(CASE WHEN status = 'Under Maintenance' THEN 1 END) as under_maintenance,
        COUNT(CASE WHEN status = 'Active' AND id NOT IN (
          SELECT vehicle_id FROM transport_trips
          WHERE trip_date = CURRENT_DATE AND status IN ('Started', 'In Progress')
        ) THEN 1 END) as available,
        COALESCE(SUM(total_capacity), 0) as total_fleet_capacity
      FROM vehicles
      WHERE school_id = $1
    `, [schoolId]);

    // 2. Route stats
    const routesRes = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active
      FROM transport_routes
      WHERE school_id = $1
    `, [schoolId]);

    // 3. Student Enrollment stats
    const enrollRes = await db.query(`
      SELECT
        COUNT(*) as total_students,
        COUNT(CASE WHEN transport_type IN ('Pickup + Drop', 'Pickup Only') THEN 1 END) as pickup_students,
        COUNT(CASE WHEN transport_type IN ('Pickup + Drop', 'Drop Only') THEN 1 END) as drop_students,
        COALESCE(SUM(monthly_fare), 0) as total_monthly_fare_expected
      FROM student_transport_enrollments
      WHERE school_id = $1 AND status = 'ACTIVE'
    `, [schoolId]);

    // 4. Today's Trips stats
    const tripsRes = await db.query(`
      SELECT
        COUNT(*) as total_trips,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_trips,
        COUNT(CASE WHEN status IN ('Scheduled', 'In Progress', 'Started') THEN 1 END) as pending_trips
      FROM transport_trips
      WHERE school_id = $1 AND trip_date = CURRENT_DATE
    `, [schoolId]);

    // 5. Today's Attendance stats
    const attRes = await db.query(`
      SELECT
        COUNT(*) as total_records,
        COUNT(CASE WHEN pickup_status = 'Boarded' THEN 1 END) as boarded_count,
        COUNT(CASE WHEN pickup_status = 'Absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN pickup_status = 'Not Boarded' THEN 1 END) as missing_pickup_count,
        COUNT(CASE WHEN drop_status = 'Dropped' THEN 1 END) as dropped_count,
        COUNT(CASE WHEN drop_status = 'Not Dropped' THEN 1 END) as missing_drop_count
      FROM transport_attendance_records
      WHERE school_id = $1 AND attendance_date = CURRENT_DATE
    `, [schoolId]);

    // 6. Expiring compliance documents (within 30 days or expired)
    const expDocRes = await db.query(`
      SELECT
        COUNT(CASE WHEN expiry_date < CURRENT_DATE THEN 1 END) as expired_docs,
        COUNT(CASE WHEN expiry_date >= CURRENT_DATE AND expiry_date <= (CURRENT_DATE + INTERVAL '30 days') THEN 1 END) as expiring_soon_docs
      FROM vehicle_documents
      WHERE school_id = $1
    `, [schoolId]);

    // 7. Expiring driver licenses
    const expDrvRes = await db.query(`
      SELECT
        COUNT(CASE WHEN license_expiry_date < CURRENT_DATE THEN 1 END) as expired_licenses,
        COUNT(CASE WHEN license_expiry_date >= CURRENT_DATE AND license_expiry_date <= (CURRENT_DATE + INTERVAL '30 days') THEN 1 END) as expiring_soon_licenses
      FROM transport_drivers
      WHERE school_id = $1
    `, [schoolId]);

    // 8. Upcoming Maintenance
    const maintRes = await db.query(`
      SELECT COUNT(*) as upcoming_count
      FROM vehicle_maintenance
      WHERE school_id = $1 AND next_maintenance_date IS NOT NULL
        AND next_maintenance_date >= CURRENT_DATE
        AND next_maintenance_date <= (CURRENT_DATE + INTERVAL '15 days')
    `, [schoolId]);

    // 9. Today's Incidents
    const incRes = await db.query(`
      SELECT
        COUNT(*) as total_incidents,
        COUNT(CASE WHEN status IN ('Open', 'Under Review') THEN 1 END) as open_incidents
      FROM transport_incidents
      WHERE school_id = $1 AND (incident_date = CURRENT_DATE OR status IN ('Open', 'Under Review'))
    `, [schoolId]);

    // 10. Today's Scheduled & In-Progress Trips List
    const todayTrips = await db.query(`
      SELECT
        t.*,
        r.name as route_name,
        r.code as route_code,
        v.registration_number,
        v.vehicle_number,
        v.seating_capacity,
        concat(e_drv.first_name, ' ', e_drv.last_name) as driver_name,
        e_drv.mobile_number as driver_phone,
        concat(e_cnd.first_name, ' ', e_cnd.last_name) as conductor_name,
        (SELECT COUNT(*) FROM student_transport_enrollments ste WHERE ste.route_id = t.route_id AND ste.status = 'ACTIVE') as enrolled_students_count,
        (SELECT COUNT(*) FROM transport_attendance_records tar WHERE tar.trip_id = t.id AND tar.pickup_status = 'Boarded') as boarded_students_count
      FROM transport_trips t
      JOIN transport_routes r ON t.route_id = r.id
      JOIN vehicles v ON t.vehicle_id = v.id
      JOIN transport_drivers td ON t.driver_id = td.id
      JOIN employees e_drv ON td.employee_id = e_drv.id
      LEFT JOIN employees e_cnd ON t.conductor_id = e_cnd.id
      WHERE t.school_id = $1 AND t.trip_date = CURRENT_DATE
      ORDER BY t.scheduled_start_time ASC
    `, [schoolId]);

    // 11. Recent Incidents
    const recentIncidents = await db.query(`
      SELECT
        i.*,
        v.vehicle_number,
        r.name as route_name
      FROM transport_incidents i
      LEFT JOIN vehicles v ON i.vehicle_id = v.id
      LEFT JOIN transport_routes r ON i.route_id = r.id
      WHERE i.school_id = $1
      ORDER BY i.incident_date DESC, i.created_at DESC
      LIMIT 5
    `, [schoolId]);

    return res.json({
      vehicles: vehiclesRes.rows[0],
      routes: routesRes.rows[0],
      enrollments: enrollRes.rows[0],
      trips: tripsRes.rows[0],
      attendance: attRes.rows[0],
      expiringDocuments: expDocRes.rows[0],
      expiringLicenses: expDrvRes.rows[0],
      upcomingMaintenance: maintRes.rows[0],
      incidents: incRes.rows[0],
      todayTrips: todayTrips.rows,
      recentIncidents: recentIncidents.rows
    });
  } catch (err: any) {
    console.error('[TRANSPORT DASHBOARD ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. VEHICLE MANAGEMENT
// ==========================================
router.get('/vehicles', requireAuth, requirePermission('transport.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const status = req.query.status as string;
  const type = req.query.type as string;
  const search = req.query.search as string;

  try {
    let sql = `
      SELECT
        v.*,
        (SELECT COUNT(*) FROM vehicle_documents vd WHERE vd.vehicle_id = v.id) as documents_count,
        (SELECT COUNT(*) FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND vd.expiry_date < CURRENT_DATE) as expired_docs_count,
        (SELECT COUNT(*) FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND vd.expiry_date >= CURRENT_DATE AND vd.expiry_date <= (CURRENT_DATE + INTERVAL '30 days')) as expiring_docs_count,
        (SELECT r.name FROM transport_routes r WHERE r.assigned_vehicle_id = v.id LIMIT 1) as assigned_route_name,
        (SELECT r.code FROM transport_routes r WHERE r.assigned_vehicle_id = v.id LIMIT 1) as assigned_route_code,
        (SELECT MAX(maintenance_date) FROM vehicle_maintenance vm WHERE vm.vehicle_id = v.id) as last_maintenance_date
      FROM vehicles v
      WHERE v.school_id = $1
    `;
    const params: any[] = [schoolId];

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND v.status = $${params.length}`;
    }
    if (type && type !== 'all') {
      params.push(type);
      sql += ` AND v.vehicle_type = $${params.length}`;
    }
    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(v.registration_number) LIKE $${params.length} OR LOWER(v.vehicle_number) LIKE $${params.length} OR LOWER(v.model) LIKE $${params.length} OR LOWER(v.make) LIKE $${params.length})`;
    }

    sql += ` ORDER BY v.vehicle_number ASC`;

    const result = await db.query(sql, params);
    return res.json({ vehicles: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/vehicles', requireAuth, requirePermission('transport.vehicles.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const {
    registrationNumber, vehicleNumber, vehicleType, make, model, manufacturer,
    manufacturingYear, purchaseDate, purchaseCost, seatingCapacity, standingCapacity,
    fuelType, currentMileage, vehicleColor, gpsDeviceId, status, notes
  } = req.body;

  if (!registrationNumber || !vehicleNumber || !seatingCapacity) {
    return res.status(400).json({ error: 'Registration number, vehicle number, and seating capacity are required.' });
  }

  try {
    const seatCap = parseInt(seatingCapacity, 10);
    const standCap = parseInt(standingCapacity || '0', 10);
    const totalCap = seatCap + standCap;
    const vId = `veh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const insertRes = await db.query(`
      INSERT INTO vehicles (
        id, school_id, registration_number, vehicle_number, vehicle_type, make,
        model, manufacturer, manufacturing_year, purchase_date, purchase_cost,
        seating_capacity, standing_capacity, total_capacity, fuel_type, current_mileage,
        vehicle_color, gps_device_id, status, notes
      ) VALUES (
        $1, $2, UPPER($3), UPPER($4), $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20
      ) RETURNING *
    `, [
      vId, schoolId, registrationNumber.trim(), vehicleNumber.trim(), vehicleType || 'Bus',
      make || null, model || null, manufacturer || null,
      manufacturingYear ? parseInt(manufacturingYear, 10) : null,
      purchaseDate || null, purchaseCost ? parseFloat(purchaseCost) : 0,
      seatCap, standCap, totalCap, fuelType || 'Diesel',
      currentMileage ? parseInt(currentMileage, 10) : 0,
      vehicleColor || 'Golden Yellow', gpsDeviceId || null, status || 'Active', notes || null
    ]);

    await recordAuditLog({
      req,
      schoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'CREATE_VEHICLE',
      module: 'TRANSPORT',
      recordId: vId,
      description: `Created vehicle ${vehicleNumber} (${registrationNumber}) with ${totalCap} capacity`,
      newValues: insertRes.rows[0] as any
    });

    return res.status(201).json({ vehicle: insertRes.rows[0], message: 'Vehicle added successfully.' });
  } catch (err: any) {
    if (err.message?.includes('vehicles_school_id_registration_number_key')) {
      return res.status(409).json({ error: 'A vehicle with this registration number already exists in this school.' });
    }
    if (err.message?.includes('vehicles_school_id_vehicle_number_key')) {
      return res.status(409).json({ error: 'A vehicle with this vehicle number already exists in this school.' });
    }
    return res.status(500).json({ error: err.message });
  }
});

router.put('/vehicles/:id', requireAuth, requirePermission('transport.vehicles.manage'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const {
    registrationNumber, vehicleNumber, vehicleType, make, model, manufacturer,
    manufacturingYear, purchaseDate, purchaseCost, seatingCapacity, standingCapacity,
    fuelType, currentMileage, vehicleColor, gpsDeviceId, status, notes
  } = req.body;

  try {
    const existing = await db.query(`SELECT * FROM vehicles WHERE id = $1 AND school_id = $2`, [id, schoolId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Vehicle not found.' });

    const seatCap = seatingCapacity !== undefined ? parseInt(seatingCapacity, 10) : (existing.rows[0] as any).seating_capacity;
    const standCap = standingCapacity !== undefined ? parseInt(standingCapacity, 10) : (existing.rows[0] as any).standing_capacity;
    const totalCap = seatCap + standCap;

    const updateRes = await db.query(`
      UPDATE vehicles
      SET
        registration_number = COALESCE(UPPER($1), registration_number),
        vehicle_number = COALESCE(UPPER($2), vehicle_number),
        vehicle_type = COALESCE($3, vehicle_type),
        make = COALESCE($4, make),
        model = COALESCE($5, model),
        manufacturer = COALESCE($6, manufacturer),
        manufacturing_year = COALESCE($7, manufacturing_year),
        purchase_date = COALESCE($8, purchase_date),
        purchase_cost = COALESCE($9, purchase_cost),
        seating_capacity = $10,
        standing_capacity = $11,
        total_capacity = $12,
        fuel_type = COALESCE($13, fuel_type),
        current_mileage = COALESCE($14, current_mileage),
        vehicle_color = COALESCE($15, vehicle_color),
        gps_device_id = COALESCE($16, gps_device_id),
        status = COALESCE($17, status),
        notes = COALESCE($18, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $19 AND school_id = $20
      RETURNING *
    `, [
      registrationNumber ? registrationNumber.trim() : null,
      vehicleNumber ? vehicleNumber.trim() : null,
      vehicleType, make, model, manufacturer,
      manufacturingYear ? parseInt(manufacturingYear, 10) : null,
      purchaseDate, purchaseCost ? parseFloat(purchaseCost) : null,
      seatCap, standCap, totalCap, fuelType,
      currentMileage ? parseInt(currentMileage, 10) : null,
      vehicleColor, gpsDeviceId, status, notes, id, schoolId
    ]);

    await recordAuditLog({
      req,
      schoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'UPDATE_VEHICLE',
      module: 'TRANSPORT',
      recordId: id,
      description: `Updated vehicle ${(updateRes.rows[0] as any).vehicle_number} (Status: ${(updateRes.rows[0] as any).status})`,
      oldValues: existing.rows[0] as any,
      newValues: updateRes.rows[0] as any
    });

    return res.json({ vehicle: updateRes.rows[0], message: 'Vehicle updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. VEHICLE COMPLIANCE DOCUMENTS
// ==========================================
router.get('/vehicles/:id/documents', requireAuth, requirePermission('transport.view'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const result = await db.query(`
      SELECT
        vd.*,
        v.vehicle_number,
        v.registration_number,
        CASE
          WHEN vd.expiry_date < CURRENT_DATE THEN 'EXPIRED'
          WHEN vd.expiry_date <= (CURRENT_DATE + (vd.reminder_days || ' days')::interval) THEN 'EXPIRING_SOON'
          ELSE 'VALID'
        END as calculated_status,
        (vd.expiry_date - CURRENT_DATE) as days_until_expiry
      FROM vehicle_documents vd
      JOIN vehicles v ON vd.vehicle_id = v.id
      WHERE vd.vehicle_id = $1 AND vd.school_id = $2
      ORDER BY vd.expiry_date ASC
    `, [id, schoolId]);

    return res.json({ documents: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/vehicles/:id/documents', requireAuth, requirePermission('transport.vehicles.manage'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { documentType, documentNumber, issueDate, expiryDate, issuingAuthority, fileUrl, reminderDays, remarks } = req.body;

  if (!documentType || !documentNumber || !issueDate || !expiryDate) {
    return res.status(400).json({ error: 'Document type, document number, issue date and expiry date are required.' });
  }

  try {
    const docId = `vdoc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const isExpired = new Date(expiryDate) < new Date();
    const isExpiringSoon = !isExpired && (new Date(expiryDate).getTime() - Date.now()) <= (parseInt(reminderDays || '30', 10) * 86400000);
    const docStatus = isExpired ? 'EXPIRED' : (isExpiringSoon ? 'EXPIRING_SOON' : 'VALID');

    const result = await db.query(`
      INSERT INTO vehicle_documents (
        id, school_id, vehicle_id, document_type, document_number, issue_date,
        expiry_date, issuing_authority, file_url, reminder_days, remarks, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      docId, schoolId, id, documentType, documentNumber, issueDate,
      expiryDate, issuingAuthority || null, fileUrl || null,
      parseInt(reminderDays || '30', 10), remarks || null, docStatus
    ]);

    await recordAuditLog({
      req,
      schoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'UPLOAD_VEHICLE_DOCUMENT',
      module: 'TRANSPORT',
      recordId: docId,
      description: `Uploaded ${documentType} (#${documentNumber}) for vehicle ID ${id}`,
      newValues: result.rows[0] as any
    });

    return res.status(201).json({ document: result.rows[0], message: 'Document added successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/documents/expiring', requireAuth, requirePermission('transport.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const result = await db.query(`
      SELECT
        vd.*,
        v.vehicle_number,
        v.registration_number,
        v.model,
        (vd.expiry_date - CURRENT_DATE) as days_until_expiry,
        CASE
          WHEN vd.expiry_date < CURRENT_DATE THEN 'EXPIRED'
          ELSE 'EXPIRING_SOON'
        END as alert_level
      FROM vehicle_documents vd
      JOIN vehicles v ON vd.vehicle_id = v.id
      WHERE vd.school_id = $1 AND vd.expiry_date <= (CURRENT_DATE + INTERVAL '30 days')
      ORDER BY vd.expiry_date ASC
    `, [schoolId]);

    return res.json({ expiringDocuments: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. DRIVERS & STAFF MANAGEMENT
// ==========================================
router.get('/drivers', requireAuth, requirePermission('transport.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const result = await db.query(`
      SELECT
        td.*,
        e.employee_id_number,
        e.first_name,
        e.last_name,
        concat(e.first_name, ' ', e.last_name) as driver_name,
        e.email,
        e.mobile_number,
        e.address,
        e.city,
        e.state,
        e.date_of_joining,
        (td.license_expiry_date - CURRENT_DATE) as days_until_license_expiry,
        (SELECT r.name FROM transport_routes r WHERE r.assigned_driver_id = td.id LIMIT 1) as assigned_route_name,
        (SELECT r.code FROM transport_routes r WHERE r.assigned_driver_id = td.id LIMIT 1) as assigned_route_code,
        (SELECT v.vehicle_number FROM transport_routes r JOIN vehicles v ON r.assigned_vehicle_id = v.id WHERE r.assigned_driver_id = td.id LIMIT 1) as assigned_vehicle_number
      FROM transport_drivers td
      JOIN employees e ON td.employee_id = e.id
      WHERE td.school_id = $1
      ORDER BY e.first_name ASC
    `, [schoolId]);

    return res.json({ drivers: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/drivers', requireAuth, requirePermission('transport.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const {
    employeeId, licenseNumber, licenseType, licenseIssueDate, licenseExpiryDate,
    experienceYears, badgeNumber, medicalFitnessStatus, policeVerificationStatus,
    emergencyContactName, emergencyContactPhone, notes
  } = req.body;

  if (!employeeId || !licenseNumber || !licenseIssueDate || !licenseExpiryDate) {
    return res.status(400).json({ error: 'Employee ID, license number, issue date and expiry date are required.' });
  }

  try {
    const drvId = `drv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const result = await db.query(`
      INSERT INTO transport_drivers (
        id, school_id, employee_id, license_number, license_type, license_issue_date,
        license_expiry_date, experience_years, badge_number, medical_fitness_status,
        police_verification_status, emergency_contact_name, emergency_contact_phone,
        status, notes
      ) VALUES ($1, $2, $3, UPPER($4), $5, $6, $7, $8, $9, $10, $11, $12, $13, 'ACTIVE', $14)
      RETURNING *
    `, [
      drvId, schoolId, employeeId, licenseNumber.trim(), licenseType || 'Heavy Passenger Commercial Vehicle (HMV)',
      licenseIssueDate, licenseExpiryDate, experienceYears ? parseInt(experienceYears, 10) : 5,
      badgeNumber || null, medicalFitnessStatus || 'FIT', policeVerificationStatus || 'VERIFIED',
      emergencyContactName || null, emergencyContactPhone || null, notes || null
    ]);

    await recordAuditLog({
      req,
      schoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'ADD_TRANSPORT_DRIVER',
      module: 'TRANSPORT',
      recordId: drvId,
      description: `Registered employee ${employeeId} as transport driver with license ${licenseNumber}`,
      newValues: result.rows[0] as any
    });

    return res.status(201).json({ driver: result.rows[0], message: 'Driver registered successfully.' });
  } catch (err: any) {
    if (err.message?.includes('transport_drivers_school_id_employee_id_key')) {
      return res.status(409).json({ error: 'This employee is already registered as a driver in this school.' });
    }
    if (err.message?.includes('transport_drivers_school_id_license_number_key')) {
      return res.status(409).json({ error: 'This driving license number is already registered.' });
    }
    return res.status(500).json({ error: err.message });
  }
});

// Transport Staff / Conductor Assignments
router.get('/staff/assignments', requireAuth, requirePermission('transport.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const result = await db.query(`
      SELECT
        tsa.*,
        concat(e.first_name, ' ', e.last_name) as staff_name,
        e.employee_id_number,
        e.mobile_number as phone,
        v.vehicle_number,
        v.registration_number
      FROM transport_staff_assignments tsa
      JOIN employees e ON tsa.employee_id = e.id
      LEFT JOIN vehicles v ON tsa.vehicle_id = v.id
      WHERE tsa.school_id = $1
      ORDER BY tsa.start_date DESC
    `, [schoolId]);

    return res.json({ assignments: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. ROUTE & STOP MANAGEMENT
// ==========================================
router.get('/routes', requireAuth, requirePermission('transport.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const result = await db.query(`
      SELECT
        r.*,
        v.vehicle_number,
        v.registration_number,
        v.seating_capacity,
        v.total_capacity,
        v.vehicle_type,
        concat(e_drv.first_name, ' ', e_drv.last_name) as driver_name,
        e_drv.mobile_number as driver_phone,
        concat(e_cnd.first_name, ' ', e_cnd.last_name) as conductor_name,
        e_cnd.mobile_number as conductor_phone,
        (SELECT COUNT(*) FROM transport_route_stops trs WHERE trs.route_id = r.id AND trs.status = 'ACTIVE') as stops_count,
        (SELECT COUNT(*) FROM student_transport_enrollments ste WHERE ste.route_id = r.id AND ste.status = 'ACTIVE') as enrolled_students_count,
        CASE
          WHEN COALESCE(v.total_capacity, 0) = 0 THEN 0
          ELSE ROUND(((SELECT COUNT(*) FROM student_transport_enrollments ste WHERE ste.route_id = r.id AND ste.status = 'ACTIVE')::numeric / v.total_capacity::numeric) * 100, 1)
        END as capacity_utilization_pct
      FROM transport_routes r
      LEFT JOIN vehicles v ON r.assigned_vehicle_id = v.id
      LEFT JOIN transport_drivers td ON r.assigned_driver_id = td.id
      LEFT JOIN employees e_drv ON td.employee_id = e_drv.id
      LEFT JOIN employees e_cnd ON r.assigned_conductor_id = e_cnd.id
      WHERE r.school_id = $1
      ORDER BY r.code ASC
    `, [schoolId]);

    return res.json({ routes: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/routes', requireAuth, requirePermission('transport.routes.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const {
    name, code, startPoint, endPoint, estimatedDistanceKm, estimatedDurationMins,
    assignedVehicleId, assignedDriverId, assignedConductorId, sessionId, description
  } = req.body;

  if (!name || !code || !startPoint || !endPoint) {
    return res.status(400).json({ error: 'Route name, route code, starting point, and ending point are required.' });
  }

  try {
    const routeId = `rte_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const insertRes = await db.query(`
      INSERT INTO transport_routes (
        id, school_id, academic_session_id, name, code, start_point, end_point,
        estimated_distance_km, estimated_duration_mins, assigned_vehicle_id,
        assigned_driver_id, assigned_conductor_id, status, description
      ) VALUES (
        $1, $2, $3, $4, UPPER($5), $6, $7, $8, $9, $10, $11, $12, 'ACTIVE', $13
      ) RETURNING *
    `, [
      routeId, schoolId, sessionId || null, name.trim(), code.trim(),
      startPoint.trim(), endPoint.trim(),
      estimatedDistanceKm ? parseFloat(estimatedDistanceKm) : 0,
      estimatedDurationMins ? parseInt(estimatedDurationMins, 10) : 45,
      assignedVehicleId || null, assignedDriverId || null,
      assignedConductorId || null, description || null
    ]);

    await recordAuditLog({
      req,
      schoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'CREATE_TRANSPORT_ROUTE',
      module: 'TRANSPORT',
      recordId: routeId,
      description: `Created transport route ${code}: ${name} (${startPoint} -> ${endPoint})`,
      newValues: insertRes.rows[0] as any
    });

    return res.status(201).json({ route: insertRes.rows[0], message: 'Route created successfully.' });
  } catch (err: any) {
    if (err.message?.includes('transport_routes_school_id_code_key')) {
      return res.status(409).json({ error: 'A route with this code already exists in this school.' });
    }
    return res.status(500).json({ error: err.message });
  }
});

router.put('/routes/:id', requireAuth, requirePermission('transport.routes.manage'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const {
    name, code, startPoint, endPoint, estimatedDistanceKm, estimatedDurationMins,
    assignedVehicleId, assignedDriverId, assignedConductorId, status, description
  } = req.body;

  try {
    const existing = await db.query(`SELECT * FROM transport_routes WHERE id = $1 AND school_id = $2`, [id, schoolId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Route not found.' });

    const updateRes = await db.query(`
      UPDATE transport_routes
      SET
        name = COALESCE($1, name),
        code = COALESCE(UPPER($2), code),
        start_point = COALESCE($3, start_point),
        end_point = COALESCE($4, end_point),
        estimated_distance_km = COALESCE($5, estimated_distance_km),
        estimated_duration_mins = COALESCE($6, estimated_duration_mins),
        assigned_vehicle_id = $7,
        assigned_driver_id = $8,
        assigned_conductor_id = $9,
        status = COALESCE($10, status),
        description = COALESCE($11, description),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12 AND school_id = $13
      RETURNING *
    `, [
      name ? name.trim() : null, code ? code.trim() : null,
      startPoint ? startPoint.trim() : null, endPoint ? endPoint.trim() : null,
      estimatedDistanceKm !== undefined ? parseFloat(estimatedDistanceKm) : null,
      estimatedDurationMins !== undefined ? parseInt(estimatedDurationMins, 10) : null,
      assignedVehicleId !== undefined ? assignedVehicleId : (existing.rows[0] as any).assigned_vehicle_id,
      assignedDriverId !== undefined ? assignedDriverId : (existing.rows[0] as any).assigned_driver_id,
      assignedConductorId !== undefined ? assignedConductorId : (existing.rows[0] as any).assigned_conductor_id,
      status, description, id, schoolId
    ]);

    await recordAuditLog({
      req,
      schoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'UPDATE_TRANSPORT_ROUTE',
      module: 'TRANSPORT',
      recordId: id,
      description: `Updated route ${(updateRes.rows[0] as any).code}: ${(updateRes.rows[0] as any).name}`,
      oldValues: existing.rows[0] as any,
      newValues: updateRes.rows[0] as any
    });

    return res.json({ route: updateRes.rows[0], message: 'Route updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Route Stops
router.get('/routes/:id/stops', requireAuth, requirePermission('transport.view'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const result = await db.query(`
      SELECT
        trs.*,
        (SELECT COUNT(*) FROM student_transport_enrollments ste WHERE ste.pickup_stop_id = trs.id AND ste.status = 'ACTIVE') as pickup_students_count,
        (SELECT COUNT(*) FROM student_transport_enrollments ste WHERE ste.drop_stop_id = trs.id AND ste.status = 'ACTIVE') as drop_students_count
      FROM transport_route_stops trs
      WHERE trs.route_id = $1 AND trs.school_id = $2
      ORDER BY trs.sequence_order ASC
    `, [id, schoolId]);

    return res.json({ stops: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/routes/:id/stops', requireAuth, requirePermission('transport.routes.manage'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { stopName, address, sequenceOrder, landmark, pickupTime, dropTime, fareAmount, latitude, longitude } = req.body;

  if (!stopName || !pickupTime || !dropTime) {
    return res.status(400).json({ error: 'Stop name, pickup time, and drop time are required.' });
  }

  try {
    // If sequence order not provided, pick next available
    let seq = sequenceOrder ? parseInt(sequenceOrder, 10) : null;
    if (!seq) {
      const maxRes = await db.query(`SELECT COALESCE(MAX(sequence_order), 0) + 1 as next_seq FROM transport_route_stops WHERE route_id = $1`, [id]);
      seq = parseInt((maxRes.rows[0] as any).next_seq, 10);
    }

    const stopId = `stop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const result = await db.query(`
      INSERT INTO transport_route_stops (
        id, school_id, route_id, stop_name, address, sequence_order,
        landmark, pickup_time, drop_time, fare_amount, latitude, longitude, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ACTIVE')
      RETURNING *
    `, [
      stopId, schoolId, id, stopName.trim(), address || null, seq,
      landmark || null, pickupTime.trim(), dropTime.trim(),
      fareAmount !== undefined ? parseFloat(fareAmount) : 1200.00,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null
    ]);

    await recordAuditLog({
      req,
      schoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'ADD_ROUTE_STOP',
      module: 'TRANSPORT',
      recordId: stopId,
      description: `Added stop #${seq} "${stopName}" to route ${id}`,
      newValues: result.rows[0] as any
    });

    return res.status(201).json({ stop: result.rows[0], message: 'Stop added successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. STUDENT TRANSPORT ENROLLMENT
// ==========================================
router.get('/enrollments', requireAuth, requirePermission('transport.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const routeId = req.query.routeId as string;
  const status = req.query.status as string;
  const search = req.query.search as string;

  try {
    let sql = `
      SELECT
        ste.*,
        s.admission_number,
        s.first_name,
        s.last_name,
        concat(s.first_name, ' ', s.last_name) as student_name,
        c.name as class_name,
        sec.name as section_name,
        r.name as route_name,
        r.code as route_code,
        v.vehicle_number,
        v.registration_number,
        ps.stop_name as pickup_stop_name,
        ps.pickup_time,
        ds.stop_name as drop_stop_name,
        ds.drop_time,
        p.name as father_name,
        p.name as parent_name,
        p.mobile_number as primary_phone
      FROM student_transport_enrollments ste
      JOIN students s ON ste.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      JOIN transport_routes r ON ste.route_id = r.id
      LEFT JOIN vehicles v ON r.assigned_vehicle_id = v.id
      JOIN transport_route_stops ps ON ste.pickup_stop_id = ps.id
      JOIN transport_route_stops ds ON ste.drop_stop_id = ds.id
      LEFT JOIN student_parents sp ON s.id = sp.student_id AND sp.is_primary_guardian = true
      LEFT JOIN parents p ON sp.parent_id = p.id
      WHERE ste.school_id = $1
    `;
    const params: any[] = [schoolId];

    if (routeId && routeId !== 'all') {
      params.push(routeId);
      sql += ` AND ste.route_id = $${params.length}`;
    }
    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND ste.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(s.first_name) LIKE $${params.length} OR LOWER(s.last_name) LIKE $${params.length} OR LOWER(s.admission_number) LIKE $${params.length})`;
    }

    sql += ` ORDER BY s.first_name ASC`;

    const result = await db.query(sql, params);
    return res.json({ enrollments: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/enrollments', requireAuth, requirePermission('transport.enroll.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const {
    studentId, routeId, pickupStopId, dropStopId, transportType,
    monthlyFare, startDate, sessionId, emergencyContactPerson,
    emergencyContactPhone, authorizedPickupPerson, authorizedPickupPhone,
    medicalAlertNotes, allowCapacityOverride
  } = req.body;

  if (!studentId || !routeId || !pickupStopId || !dropStopId || !sessionId) {
    return res.status(400).json({ error: 'Student, route, pickup stop, drop stop, and academic session are required.' });
  }

  try {
    // 1. Capacity Validation Check
    const routeRes = await db.query(`
      SELECT
        r.*,
        v.total_capacity,
        v.vehicle_number,
        (SELECT COUNT(*) FROM student_transport_enrollments ste WHERE ste.route_id = r.id AND ste.status = 'ACTIVE') as current_enrolled
      FROM transport_routes r
      LEFT JOIN vehicles v ON r.assigned_vehicle_id = v.id
      WHERE r.id = $1 AND r.school_id = $2
    `, [routeId, schoolId]);

    if (routeRes.rows.length === 0) return res.status(404).json({ error: 'Route not found.' });

    const routeData: any = routeRes.rows[0];
    const capacity = routeData.total_capacity ? parseInt(routeData.total_capacity, 10) : 0;
    const currentEnrolled = parseInt(routeData.current_enrolled, 10);

    if (capacity > 0 && currentEnrolled >= capacity && !allowCapacityOverride) {
      return res.status(400).json({
        error: `Vehicle capacity limit reached (${currentEnrolled}/${capacity} seats). Authorized admin override is required.`,
        isOverCapacity: true,
        currentEnrolled,
        capacity
      });
    }

    // 2. Fetch default fare from pickup stop if not provided
    let fare = monthlyFare !== undefined ? parseFloat(monthlyFare) : null;
    if (fare === null) {
      const stopRes = await db.query(`SELECT fare_amount FROM transport_route_stops WHERE id = $1`, [pickupStopId]);
      fare = (stopRes.rows[0] as any)?.fare_amount ? parseFloat((stopRes.rows[0] as any).fare_amount) : 1200.00;
    }

    const enrId = `ste_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const result = await db.query(`
      INSERT INTO student_transport_enrollments (
        id, school_id, academic_session_id, student_id, route_id, pickup_stop_id,
        drop_stop_id, transport_type, monthly_fare, start_date, status,
        emergency_contact_person, emergency_contact_phone, authorized_pickup_person,
        authorized_pickup_phone, medical_alert_notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE', $11, $12, $13, $14, $15
      ) RETURNING *
    `, [
      enrId, schoolId, sessionId, studentId, routeId, pickupStopId, dropStopId,
      transportType || 'Pickup + Drop', fare, startDate || new Date().toISOString().split('T')[0],
      emergencyContactPerson || null, emergencyContactPhone || null,
      authorizedPickupPerson || null, authorizedPickupPhone || null,
      medicalAlertNotes || null
    ]);

    await recordAuditLog({
      req,
      schoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'ENROLL_STUDENT_TRANSPORT',
      module: 'TRANSPORT',
      recordId: enrId,
      description: `Enrolled student ${studentId} in route ${routeData.code} (Fare: ₹${fare}/mo)${allowCapacityOverride ? ' [OVER-CAPACITY OVERRIDE CONFIRMED]' : ''}`,
      newValues: result.rows[0] as any
    });

    return res.status(201).json({ enrollment: result.rows[0], message: 'Student enrolled in transport successfully.' });
  } catch (err: any) {
    if (err.message?.includes('student_transport_enrollments_school_id_academic_session_id_student_id_key')) {
      return res.status(409).json({ error: 'This student is already enrolled in transport for this academic session.' });
    }
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. DAILY TRIPS & DISPATCH
// ==========================================
router.get('/trips', requireAuth, requirePermission('transport.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const routeId = req.query.routeId as string;
  const status = req.query.status as string;

  try {
    let sql = `
      SELECT
        t.*,
        r.name as route_name,
        r.code as route_code,
        r.start_point,
        r.end_point,
        v.vehicle_number,
        v.registration_number,
        v.seating_capacity,
        concat(e_drv.first_name, ' ', e_drv.last_name) as driver_name,
        e_drv.mobile_number as driver_phone,
        concat(e_cnd.first_name, ' ', e_cnd.last_name) as conductor_name,
        e_cnd.mobile_number as conductor_phone,
        (SELECT COUNT(*) FROM student_transport_enrollments ste WHERE ste.route_id = t.route_id AND ste.status = 'ACTIVE') as total_enrolled,
        (SELECT COUNT(*) FROM transport_attendance_records tar WHERE tar.trip_id = t.id AND tar.pickup_status = 'Boarded') as boarded_count,
        (SELECT COUNT(*) FROM transport_attendance_records tar WHERE tar.trip_id = t.id AND tar.drop_status = 'Dropped') as dropped_count
      FROM transport_trips t
      JOIN transport_routes r ON t.route_id = r.id
      JOIN vehicles v ON t.vehicle_id = v.id
      JOIN transport_drivers td ON t.driver_id = td.id
      JOIN employees e_drv ON td.employee_id = e_drv.id
      LEFT JOIN employees e_cnd ON t.conductor_id = e_cnd.id
      WHERE t.school_id = $1 AND t.trip_date = $2
    `;
    const params: any[] = [schoolId, date];

    if (routeId && routeId !== 'all') {
      params.push(routeId);
      sql += ` AND t.route_id = $${params.length}`;
    }
    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND t.status = $${params.length}`;
    }

    sql += ` ORDER BY t.scheduled_start_time ASC`;

    const result = await db.query(sql, params);
    return res.json({ trips: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/trips', requireAuth, requirePermission('transport.trips.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const {
    routeId, vehicleId, driverId, conductorId, tripDate, tripType,
    scheduledStartTime, scheduledEndTime, odometerStart, notes
  } = req.body;

  if (!routeId || !vehicleId || !driverId || !tripDate || !tripType) {
    return res.status(400).json({ error: 'Route, vehicle, driver, date, and trip type are required.' });
  }

  try {
    // Conflict Detection 1: Driver overlap on same date and trip type
    const driverConflict = await db.query(`
      SELECT t.id, r.code as route_code, t.trip_type
      FROM transport_trips t
      JOIN transport_routes r ON t.route_id = r.id
      WHERE t.school_id = $1 AND t.driver_id = $2 AND t.trip_date = $3
        AND t.trip_type = $4 AND t.status != 'Cancelled'
    `, [schoolId, driverId, tripDate, tripType]);

    if (driverConflict.rows.length > 0) {
      return res.status(409).json({
        error: `Driver is already assigned to active trip #${(driverConflict.rows[0] as any).id} (${(driverConflict.rows[0] as any).route_code} - ${tripType}) on this date.`
      });
    }

    // Conflict Detection 2: Vehicle overlap on same date and trip type
    const vehicleConflict = await db.query(`
      SELECT t.id, r.code as route_code, t.trip_type
      FROM transport_trips t
      JOIN transport_routes r ON t.route_id = r.id
      WHERE t.school_id = $1 AND t.vehicle_id = $2 AND t.trip_date = $3
        AND t.trip_type = $4 AND t.status != 'Cancelled'
    `, [schoolId, vehicleId, tripDate, tripType]);

    if (vehicleConflict.rows.length > 0) {
      return res.status(409).json({
        error: `Vehicle is already assigned to active trip #${(vehicleConflict.rows[0] as any).id} (${(vehicleConflict.rows[0] as any).route_code} - ${tripType}) on this date.`
      });
    }

    const tripId = `trip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const insertRes = await db.query(`
      INSERT INTO transport_trips (
        id, school_id, route_id, vehicle_id, driver_id, conductor_id, trip_date,
        trip_type, scheduled_start_time, scheduled_end_time, status, odometer_start, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Scheduled', $11, $12)
      RETURNING *
    `, [
      tripId, schoolId, routeId, vehicleId, driverId, conductorId || null,
      tripDate, tripType, scheduledStartTime || null, scheduledEndTime || null,
      odometerStart ? parseInt(odometerStart, 10) : null, notes || null
    ]);

    await recordAuditLog({
      req,
      schoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'DISPATCH_TRANSPORT_TRIP',
      module: 'TRANSPORT',
      recordId: tripId,
      description: `Dispatched ${tripType} trip on route ${routeId} with vehicle ${vehicleId}`,
      newValues: insertRes.rows[0] as any
    });

    return res.status(201).json({ trip: insertRes.rows[0], message: 'Trip dispatched successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/trips/:id/status', requireAuth, requirePermission('transport.trips.manage'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { status, odometerEnd, notes } = req.body;

  try {
    const existing = await db.query(`SELECT * FROM transport_trips WHERE id = $1 AND school_id = $2`, [id, schoolId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Trip not found.' });

    let actualStart = (existing.rows[0] as any).actual_start_time;
    let actualEnd = (existing.rows[0] as any).actual_end_time;

    if (status === 'Started' || status === 'In Progress') {
      if (!actualStart) actualStart = new Date().toISOString();
    } else if (status === 'Completed') {
      if (!actualEnd) actualEnd = new Date().toISOString();
    }

    const updateRes = await db.query(`
      UPDATE transport_trips
      SET
        status = $1,
        actual_start_time = $2,
        actual_end_time = $3,
        odometer_end = COALESCE($4, odometer_end),
        notes = COALESCE($5, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND school_id = $7
      RETURNING *
    `, [
      status, actualStart, actualEnd,
      odometerEnd ? parseInt(odometerEnd, 10) : null,
      notes || null, id, schoolId
    ]);

    return res.json({ trip: updateRes.rows[0], message: `Trip status updated to ${status}.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Student Manifest for a Trip (For Driver / Conductor Workspace)
router.get('/trips/:id/manifest', requireAuth, requirePermission('transport.view'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const tripRes = await db.query(`
      SELECT
        t.*,
        r.name as route_name,
        r.code as route_code,
        v.vehicle_number,
        v.registration_number,
        concat(e_drv.first_name, ' ', e_drv.last_name) as driver_name,
        concat(e_cnd.first_name, ' ', e_cnd.last_name) as conductor_name
      FROM transport_trips t
      JOIN transport_routes r ON t.route_id = r.id
      JOIN vehicles v ON t.vehicle_id = v.id
      JOIN transport_drivers td ON t.driver_id = td.id
      JOIN employees e_drv ON td.employee_id = e_drv.id
      LEFT JOIN employees e_cnd ON t.conductor_id = e_cnd.id
      WHERE t.id = $1 AND t.school_id = $2
    `, [id, schoolId]);

    if (tripRes.rows.length === 0) return res.status(404).json({ error: 'Trip not found.' });

    const trip: any = tripRes.rows[0];

    // Get all students enrolled on this route with their attendance for this trip
    const studentsRes = await db.query(`
      SELECT
        ste.id as enrollment_id,
        ste.student_id,
        ste.transport_type,
        ste.emergency_contact_person,
        ste.emergency_contact_phone,
        ste.authorized_pickup_person,
        ste.authorized_pickup_phone,
        ste.medical_alert_notes,
        s.admission_number,
        s.first_name,
        s.last_name,
        concat(s.first_name, ' ', s.last_name) as student_name,
        c.name as class_name,
        sec.name as section_name,
        ps.id as pickup_stop_id,
        ps.stop_name as pickup_stop_name,
        ps.sequence_order as pickup_stop_seq,
        ps.pickup_time as scheduled_pickup_time,
        ds.id as drop_stop_id,
        ds.stop_name as drop_stop_name,
        ds.sequence_order as drop_stop_seq,
        ds.drop_time as scheduled_drop_time,
        tar.id as attendance_id,
        COALESCE(tar.pickup_status, 'Scheduled') as pickup_status,
        tar.pickup_time as actual_pickup_time,
        COALESCE(tar.drop_status, 'Scheduled') as drop_status,
        tar.drop_time as actual_drop_time,
        tar.authorized_receiver_name,
        tar.remarks as attendance_remarks
      FROM student_transport_enrollments ste
      JOIN students s ON ste.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      JOIN transport_route_stops ps ON ste.pickup_stop_id = ps.id
      JOIN transport_route_stops ds ON ste.drop_stop_id = ds.id
      LEFT JOIN transport_attendance_records tar ON tar.trip_id = $1 AND tar.student_id = s.id
      WHERE ste.route_id = $2 AND ste.school_id = $3 AND ste.status = 'ACTIVE'
      ORDER BY ps.sequence_order ASC, s.first_name ASC
    `, [id, trip.route_id, schoolId]);

    return res.json({ trip, students: studentsRes.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Mark student transport boarding or drop
router.post('/trips/:id/attendance', requireAuth, requirePermission('transport.attendance.mark'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { studentId, routeId, stopId, pickupStatus, dropStatus, authorizedReceiverName, authorizedReceiverPhone, remarks } = req.body;

  if (!studentId || !routeId || !stopId) {
    return res.status(400).json({ error: 'Student ID, route ID, and stop ID are required.' });
  }

  try {
    const tripRes = await db.query(`SELECT trip_date FROM transport_trips WHERE id = $1`, [id]);
    const tripDate = (tripRes.rows[0] as any)?.trip_date || new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const attId = `tatt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const upsertRes = await db.query(`
      INSERT INTO transport_attendance_records (
        id, school_id, trip_id, student_id, route_id, stop_id, attendance_date,
        pickup_status, pickup_time, drop_status, drop_time,
        authorized_receiver_name, authorized_receiver_phone, remarks, marked_by_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14, $15
      )
      ON CONFLICT (trip_id, student_id) DO UPDATE
      SET
        pickup_status = COALESCE(EXCLUDED.pickup_status, transport_attendance_records.pickup_status),
        pickup_time = CASE WHEN EXCLUDED.pickup_status = 'Boarded' THEN COALESCE(transport_attendance_records.pickup_time, EXCLUDED.pickup_time) ELSE transport_attendance_records.pickup_time END,
        drop_status = COALESCE(EXCLUDED.drop_status, transport_attendance_records.drop_status),
        drop_time = CASE WHEN EXCLUDED.drop_status = 'Dropped' THEN COALESCE(transport_attendance_records.drop_time, EXCLUDED.drop_time) ELSE transport_attendance_records.drop_time END,
        authorized_receiver_name = COALESCE(EXCLUDED.authorized_receiver_name, transport_attendance_records.authorized_receiver_name),
        authorized_receiver_phone = COALESCE(EXCLUDED.authorized_receiver_phone, transport_attendance_records.authorized_receiver_phone),
        remarks = COALESCE(EXCLUDED.remarks, transport_attendance_records.remarks),
        marked_by_id = EXCLUDED.marked_by_id
      RETURNING *
    `, [
      attId, schoolId, id, studentId, routeId, stopId, tripDate,
      pickupStatus || null, (pickupStatus === 'Boarded' ? nowTime : null),
      dropStatus || null, (dropStatus === 'Dropped' ? nowTime : null),
      authorizedReceiverName || null, authorizedReceiverPhone || null,
      remarks || null, req.user!.id
    ]);

    return res.json({ record: upsertRes.rows[0], message: 'Transport attendance updated.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. VEHICLE MAINTENANCE & FINANCE INTEGRATION
// ==========================================
router.get('/maintenance', requireAuth, requirePermission('transport.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const vehicleId = req.query.vehicleId as string;

  try {
    let sql = `
      SELECT
        vm.*,
        v.vehicle_number,
        v.registration_number,
        v.model,
        (vm.next_maintenance_date - CURRENT_DATE) as days_until_next_service
      FROM vehicle_maintenance vm
      JOIN vehicles v ON vm.vehicle_id = v.id
      WHERE vm.school_id = $1
    `;
    const params: any[] = [schoolId];

    if (vehicleId && vehicleId !== 'all') {
      params.push(vehicleId);
      sql += ` AND vm.vehicle_id = $${params.length}`;
    }

    sql += ` ORDER BY vm.maintenance_date DESC`;

    const result = await db.query(sql, params);
    return res.json({ maintenanceRecords: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/maintenance', requireAuth, requirePermission('transport.maintenance.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const {
    vehicleId, maintenanceDate, maintenanceType, description, vendorCenter,
    invoiceNumber, cost, odometerReading, nextMaintenanceDate, nextMaintenanceMileage, remarks
  } = req.body;

  if (!vehicleId || !maintenanceDate || !maintenanceType || !description || !vendorCenter || cost === undefined) {
    return res.status(400).json({ error: 'Vehicle, date, maintenance type, description, vendor, and cost are required.' });
  }

  try {
    const maintId = `vmaint_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const costVal = parseFloat(cost) || 0;

    // Integrated Finance Posting: Record directly in Phase 6 Accounts `expenses` table
    let expId: string | null = null;
    if (costVal > 0) {
      expId = `exp_trnmaint_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const expCatId = `expcat_${schoolId}_transport`;
      await db.query(`
        INSERT INTO expense_categories (id, school_id, name, code, status)
        VALUES ($1, $2, 'Transport, Fuel & Vehicle Fleet Maintenance', 'TRANSPORT', 'active')
        ON CONFLICT (id) DO NOTHING;
      `, [expCatId, schoolId]);

      const adminName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'Administrator';
      await db.query(`
        INSERT INTO expenses (
          id, school_id, category_id, amount, expense_date, payment_mode,
          payee_vendor, reference_no, description, approval_status,
          created_by_id, created_by_name, approved_by_id, approved_by_name
        ) VALUES (
          $1, $2, $3, $4, $5, 'BANK_TRANSFER',
          $6, $7, $8, 'APPROVED',
          $9, $10, $9, $10
        ) ON CONFLICT (id) DO NOTHING;
      `, [
        expId, schoolId, expCatId, costVal, maintenanceDate, vendorCenter,
        invoiceNumber || `MAINT-${maintId.substring(7)}`,
        `Vehicle Maintenance (${maintenanceType}) for ${vehicleId}: ${description.substring(0, 80)}`,
        req.user!.id, adminName
      ]);
    }

    const result = await db.query(`
      INSERT INTO vehicle_maintenance (
        id, school_id, vehicle_id, maintenance_date, maintenance_type, description,
        vendor_center, invoice_number, cost, odometer_reading, next_maintenance_date,
        next_maintenance_mileage, expense_record_id, remarks, created_by_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      maintId, schoolId, vehicleId, maintenanceDate, maintenanceType, description,
      vendorCenter, invoiceNumber || null, costVal,
      odometerReading ? parseInt(odometerReading, 10) : null,
      nextMaintenanceDate || null,
      nextMaintenanceMileage ? parseInt(nextMaintenanceMileage, 10) : null,
      expId, remarks || null, req.user!.id
    ]);

    // Update vehicle's current mileage if higher
    if (odometerReading) {
      await db.query(`
        UPDATE vehicles SET current_mileage = GREATEST(current_mileage, $1) WHERE id = $2
      `, [parseInt(odometerReading, 10), vehicleId]);
    }

    await recordAuditLog({
      req,
      schoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'RECORD_VEHICLE_MAINTENANCE',
      module: 'TRANSPORT',
      recordId: maintId,
      description: `Logged ${maintenanceType} for vehicle ${vehicleId} (Cost: ₹${costVal})`,
      newValues: result.rows[0] as any
    });

    return res.status(201).json({
      maintenance: result.rows[0],
      expenseRecordId: expId,
      message: 'Vehicle maintenance record created and posted to finance accounts.'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. FUEL LOG & MILEAGE
// ==========================================
router.get('/fuel', requireAuth, requirePermission('transport.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const vehicleId = req.query.vehicleId as string;

  try {
    let sql = `
      SELECT
        vf.*,
        v.vehicle_number,
        v.registration_number,
        v.make,
        v.model
      FROM vehicle_fuel_records vf
      JOIN vehicles v ON vf.vehicle_id = v.id
      WHERE vf.school_id = $1
    `;
    const params: any[] = [schoolId];

    if (vehicleId && vehicleId !== 'all') {
      params.push(vehicleId);
      sql += ` AND vf.vehicle_id = $${params.length}`;
    }

    sql += ` ORDER BY vf.fuel_date DESC, vf.created_at DESC`;

    const result = await db.query(sql, params);
    return res.json({ fuelRecords: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/fuel', requireAuth, requirePermission('transport.fuel.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const {
    vehicleId, fuelDate, fuelType, quantityLitres, ratePerLitre,
    totalAmount, odometerReading, fuelStation, invoiceNumber, notes
  } = req.body;

  if (!vehicleId || !fuelDate || !quantityLitres || !ratePerLitre || !odometerReading) {
    return res.status(400).json({ error: 'Vehicle, date, quantity, rate, and odometer reading are required.' });
  }

  try {
    const fuelId = `vfuel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const qL = parseFloat(quantityLitres);
    const rL = parseFloat(ratePerLitre);
    const totalAmt = totalAmount ? parseFloat(totalAmount) : (qL * rL);
    const odo = parseInt(odometerReading, 10);

    // Integrated Finance Posting: Record directly in Phase 6 Accounts `expenses` table
    let expId: string | null = null;
    if (totalAmt > 0) {
      expId = `exp_trnfuel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const expCatId = `expcat_${schoolId}_transport`;
      await db.query(`
        INSERT INTO expense_categories (id, school_id, name, code, status)
        VALUES ($1, $2, 'Transport, Fuel & Vehicle Fleet Maintenance', 'TRANSPORT', 'active')
        ON CONFLICT (id) DO NOTHING;
      `, [expCatId, schoolId]);

      const adminName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'Administrator';
      await db.query(`
        INSERT INTO expenses (
          id, school_id, category_id, amount, expense_date, payment_mode,
          payee_vendor, reference_no, description, approval_status,
          created_by_id, created_by_name, approved_by_id, approved_by_name
        ) VALUES (
          $1, $2, $3, $4, $5, 'PETRO_CARD',
          $6, $7, $8, 'APPROVED',
          $9, $10, $9, $10
        ) ON CONFLICT (id) DO NOTHING;
      `, [
        expId, schoolId, expCatId, totalAmt, fuelDate, fuelStation || 'Petroleum Station',
        invoiceNumber || `FUEL-${fuelId.substring(6)}`,
        `Vehicle Refueling (${fuelType || 'Diesel'} ${qL}L) for ${vehicleId} @ ₹${rL}/L`,
        req.user!.id, adminName
      ]);
    }

    const result = await db.query(`
      INSERT INTO vehicle_fuel_records (
        id, school_id, vehicle_id, fuel_date, fuel_type, quantity_litres,
        rate_per_litre, total_amount, odometer_reading, fuel_station,
        invoice_number, expense_record_id, entered_by_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      fuelId, schoolId, vehicleId, fuelDate, fuelType || 'Diesel',
      qL, rL, totalAmt, odo, fuelStation || null,
      invoiceNumber || null, expId, req.user!.id, notes || null
    ]);

    // Update vehicle's current mileage if higher
    await db.query(`
      UPDATE vehicles SET current_mileage = GREATEST(current_mileage, $1) WHERE id = $2
    `, [odo, vehicleId]);

    await recordAuditLog({
      req,
      schoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'LOG_VEHICLE_FUEL',
      module: 'TRANSPORT',
      recordId: fuelId,
      description: `Logged ${qL}L ${fuelType || 'Diesel'} for vehicle ${vehicleId} (Amount: ₹${totalAmt})`,
      newValues: result.rows[0] as any
    });

    return res.status(201).json({
      fuelRecord: result.rows[0],
      expenseRecordId: expId,
      message: 'Fuel entry logged and recorded in expense accounts.'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. INCIDENTS & EMERGENCIES
// ==========================================
router.get('/incidents', requireAuth, requirePermission('transport.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const result = await db.query(`
      SELECT
        i.*,
        v.vehicle_number,
        v.registration_number,
        r.name as route_name,
        r.code as route_code,
        concat(e.first_name, ' ', e.last_name) as driver_name
      FROM transport_incidents i
      LEFT JOIN vehicles v ON i.vehicle_id = v.id
      LEFT JOIN transport_routes r ON i.route_id = r.id
      LEFT JOIN transport_drivers td ON i.driver_id = td.id
      LEFT JOIN employees e ON td.employee_id = e.id
      WHERE i.school_id = $1
      ORDER BY i.incident_date DESC, i.created_at DESC
    `, [schoolId]);

    return res.json({ incidents: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/incidents', requireAuth, requirePermission('transport.incidents.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const {
    incidentDate, incidentTime, incidentType, severity, vehicleId, routeId,
    driverId, studentsInvolved, location, description, actionTaken, reportedBy
  } = req.body;

  if (!incidentDate || !incidentType || !description) {
    return res.status(400).json({ error: 'Incident date, incident type, and description are required.' });
  }

  try {
    const incId = `tinc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const result = await db.query(`
      INSERT INTO transport_incidents (
        id, school_id, incident_date, incident_time, incident_type, severity,
        vehicle_id, route_id, driver_id, students_involved, location,
        description, action_taken, reported_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Open')
      RETURNING *
    `, [
      incId, schoolId, incidentDate, incidentTime || null, incidentType,
      severity || 'Medium', vehicleId || null, routeId || null,
      driverId || null, studentsInvolved || null, location || null,
      description.trim(), actionTaken || null, reportedBy || req.user!.username
    ]);

    await recordAuditLog({
      req,
      schoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'REPORT_TRANSPORT_INCIDENT',
      module: 'TRANSPORT',
      recordId: incId,
      description: `Reported ${severity || 'Medium'} severity incident: ${incidentType} (${location || 'On Route'})`,
      newValues: result.rows[0] as any
    });

    return res.status(201).json({ incident: result.rows[0], message: 'Transport incident reported successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/incidents/:id', requireAuth, requirePermission('transport.incidents.manage'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { status, actionTaken, followUpNotes, resolvedBy } = req.body;

  try {
    const existing = await db.query(`SELECT * FROM transport_incidents WHERE id = $1 AND school_id = $2`, [id, schoolId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Incident not found.' });

    const isResolved = status === 'Resolved' || status === 'Closed';
    const resolvedAt = isResolved ? new Date().toISOString() : null;

    const result = await db.query(`
      UPDATE transport_incidents
      SET
        status = COALESCE($1, status),
        action_taken = COALESCE($2, action_taken),
        follow_up_notes = COALESCE($3, follow_up_notes),
        resolved_by = COALESCE($4, resolved_by),
        resolved_at = CASE WHEN $5::timestamp with time zone IS NOT NULL THEN $5::timestamp with time zone ELSE resolved_at END
      WHERE id = $6 AND school_id = $7
      RETURNING *
    `, [status, actionTaken, followUpNotes, resolvedBy || req.user!.username, resolvedAt, id, schoolId]);

    return res.json({ incident: result.rows[0], message: 'Incident updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11. TRANSPORT NOTICES & BULLETINS
// ==========================================
router.get('/notices', requireAuth, requirePermission('transport.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const result = await db.query(`
      SELECT
        tn.*,
        r.name as route_name,
        r.code as route_code
      FROM transport_notices tn
      LEFT JOIN transport_routes r ON tn.route_id = r.id
      WHERE tn.school_id = $1
      ORDER BY tn.publish_date DESC, tn.created_at DESC
    `, [schoolId]);

    return res.json({ notices: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/notices', requireAuth, requirePermission('transport.notices.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { title, content, noticeType, routeId, targetAudience, publishDate } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  try {
    const notId = `tnot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const result = await db.query(`
      INSERT INTO transport_notices (
        id, school_id, route_id, title, content, notice_type,
        target_audience, publish_date, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
      RETURNING *
    `, [
      notId, schoolId, routeId || null, title.trim(), content.trim(),
      noticeType || 'General', targetAudience || 'ALL',
      publishDate || new Date().toISOString().split('T')[0], req.user!.username
    ]);

    return res.status(201).json({ notice: result.rows[0], message: 'Transport notice published.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 12. PARENT & STUDENT PORTAL INFORMATION
// ==========================================
router.get('/portal/my-transport', requireAuth, async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const studentId = req.query.studentId as string;

  try {
    // If student ID is specified or deduce from user
    let filterStudentId = studentId;
    if (!filterStudentId && req.user!.roleName === 'student') {
      const stuUserRes = await db.query(`SELECT id FROM students WHERE user_id = $1`, [req.user!.id]);
      if (stuUserRes.rows.length > 0) filterStudentId = (stuUserRes.rows[0] as any).id;
    }

    if (!filterStudentId) {
      // Default to first active transport student for demo/viewing
      const sample = await db.query(`SELECT student_id FROM student_transport_enrollments WHERE school_id = $1 LIMIT 1`, [schoolId]);
      if (sample.rows.length > 0) filterStudentId = (sample.rows[0] as any).student_id;
    }

    if (!filterStudentId) return res.json({ transport: null });

    const enrollRes = await db.query(`
      SELECT
        ste.*,
        s.first_name,
        s.last_name,
        concat(s.first_name, ' ', s.last_name) as student_name,
        s.admission_number,
        r.name as route_name,
        r.code as route_code,
        r.estimated_duration_mins,
        v.vehicle_number,
        v.registration_number,
        v.vehicle_type,
        v.vehicle_color,
        concat(e_drv.first_name, ' ', e_drv.last_name) as driver_name,
        e_drv.mobile_number as driver_phone,
        concat(e_cnd.first_name, ' ', e_cnd.last_name) as conductor_name,
        e_cnd.mobile_number as conductor_phone,
        ps.stop_name as pickup_stop_name,
        ps.landmark as pickup_landmark,
        ps.pickup_time as scheduled_pickup_time,
        ds.stop_name as drop_stop_name,
        ds.landmark as drop_landmark,
        ds.drop_time as scheduled_drop_time,
        (SELECT emergency_helpline FROM transport_settings ts WHERE ts.school_id = ste.school_id) as school_emergency_helpline
      FROM student_transport_enrollments ste
      JOIN students s ON ste.student_id = s.id
      JOIN transport_routes r ON ste.route_id = r.id
      LEFT JOIN vehicles v ON r.assigned_vehicle_id = v.id
      LEFT JOIN transport_drivers td ON r.assigned_driver_id = td.id
      LEFT JOIN employees e_drv ON td.employee_id = e_drv.id
      LEFT JOIN employees e_cnd ON r.assigned_conductor_id = e_cnd.id
      JOIN transport_route_stops ps ON ste.pickup_stop_id = ps.id
      JOIN transport_route_stops ds ON ste.drop_stop_id = ds.id
      WHERE ste.student_id = $1 AND ste.school_id = $2 AND ste.status = 'ACTIVE'
    `, [filterStudentId, schoolId]);

    if (enrollRes.rows.length === 0) return res.json({ transport: null });

    const transportInfo: any = enrollRes.rows[0];

    // Today's Attendance status for this student
    const todayAttRes = await db.query(`
      SELECT
        tar.*,
        t.trip_type,
        t.status as trip_status
      FROM transport_attendance_records tar
      JOIN transport_trips t ON tar.trip_id = t.id
      WHERE tar.student_id = $1 AND tar.attendance_date = CURRENT_DATE
    `, [filterStudentId]);

    // Active notices for this route or school
    const noticesRes = await db.query(`
      SELECT *
      FROM transport_notices
      WHERE school_id = $1 AND is_active = true AND (route_id IS NULL OR route_id = $2)
      ORDER BY publish_date DESC
      LIMIT 3
    `, [schoolId, transportInfo.route_id]);

    return res.json({
      transport: transportInfo,
      todayAttendance: todayAttRes.rows,
      notices: noticesRes.rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 13. TRANSPORT REPORTS
// ==========================================
router.get('/reports/summary', requireAuth, requirePermission('transport.reports.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    // 1. Vehicle Fleet Utilization
    const vehicleUtil = await db.query(`
      SELECT
        v.id,
        v.vehicle_number,
        v.registration_number,
        v.total_capacity,
        v.status,
        v.current_mileage,
        r.name as route_name,
        r.code as route_code,
        COUNT(ste.id) as enrolled_students,
        ROUND((COUNT(ste.id)::numeric / NULLIF(v.total_capacity, 0)::numeric) * 100, 1) as utilization_pct
      FROM vehicles v
      LEFT JOIN transport_routes r ON r.assigned_vehicle_id = v.id
      LEFT JOIN student_transport_enrollments ste ON ste.route_id = r.id AND ste.status = 'ACTIVE'
      WHERE v.school_id = $1
      GROUP BY v.id, v.vehicle_number, v.registration_number, v.total_capacity, v.status, v.current_mileage, r.name, r.code
      ORDER BY v.vehicle_number ASC
    `, [schoolId]);

    // 2. Financial Costs (Fuel + Maintenance)
    const financialSummary = await db.query(`
      SELECT
        COALESCE((SELECT SUM(total_amount) FROM vehicle_fuel_records WHERE school_id = $1), 0) as total_fuel_expenses,
        COALESCE((SELECT SUM(cost) FROM vehicle_maintenance WHERE school_id = $1), 0) as total_maintenance_expenses,
        COALESCE((SELECT SUM(monthly_fare) FROM student_transport_enrollments WHERE school_id = $1 AND status = 'ACTIVE'), 0) as monthly_fare_potential
    `, [schoolId]);

    // 3. Attendance Reliability (Last 30 Days)
    const attStats = await db.query(`
      SELECT
        COUNT(*) as total_manifest_records,
        COUNT(CASE WHEN pickup_status = 'Boarded' THEN 1 END) as boarded_records,
        COUNT(CASE WHEN pickup_status = 'Absent' THEN 1 END) as absent_records,
        COUNT(CASE WHEN drop_status = 'Dropped' THEN 1 END) as dropped_records
      FROM transport_attendance_records
      WHERE school_id = $1 AND attendance_date >= (CURRENT_DATE - INTERVAL '30 days')
    `, [schoolId]);

    return res.json({
      vehicleUtilization: vehicleUtil.rows,
      financials: financialSummary.rows[0],
      attendanceReliability: attStats.rows[0]
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Settings Endpoint
router.get('/settings', requireAuth, requirePermission('transport.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const result = await db.query(`SELECT * FROM transport_settings WHERE school_id = $1`, [schoolId]);
    return res.json({ settings: result.rows[0] || null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/settings', requireAuth, requirePermission('transport.settings.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { documentExpiryAlertDays, maintenanceReminderDays, maintenanceReminderKm, allowOverCapacityOverride, speedLimitKmph, emergencyHelpline } = req.body;

  try {
    const result = await db.query(`
      INSERT INTO transport_settings (
        id, school_id, document_expiry_alert_days, maintenance_reminder_days,
        maintenance_reminder_km, allow_over_capacity_override, speed_limit_kmph, emergency_helpline
      ) VALUES (
        'tsett_' || $1, $1, $2, $3, $4, $5, $6, $7
      )
      ON CONFLICT (school_id) DO UPDATE
      SET
        document_expiry_alert_days = COALESCE(EXCLUDED.document_expiry_alert_days, transport_settings.document_expiry_alert_days),
        maintenance_reminder_days = COALESCE(EXCLUDED.maintenance_reminder_days, transport_settings.maintenance_reminder_days),
        maintenance_reminder_km = COALESCE(EXCLUDED.maintenance_reminder_km, transport_settings.maintenance_reminder_km),
        allow_over_capacity_override = COALESCE(EXCLUDED.allow_over_capacity_override, transport_settings.allow_over_capacity_override),
        speed_limit_kmph = COALESCE(EXCLUDED.speed_limit_kmph, transport_settings.speed_limit_kmph),
        emergency_helpline = COALESCE(EXCLUDED.emergency_helpline, transport_settings.emergency_helpline),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      schoolId,
      documentExpiryAlertDays ? parseInt(documentExpiryAlertDays, 10) : 30,
      maintenanceReminderDays ? parseInt(maintenanceReminderDays, 10) : 15,
      maintenanceReminderKm ? parseInt(maintenanceReminderKm, 10) : 1000,
      allowOverCapacityOverride !== undefined ? allowOverCapacityOverride : false,
      speedLimitKmph ? parseInt(speedLimitKmph, 10) : 50,
      emergencyHelpline || '+91 98350 00100'
    ]);

    return res.json({ settings: result.rows[0], message: 'Transport settings saved.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 14. TRANSPORT FEES & ACCOUNTS INTEGRATION
// ==========================================
router.get('/fees/summary', requireAuth, requirePermission('transport.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    // 1. Overall stats
    const statsRes = await db.query(`
      SELECT
        COUNT(*) as enrolled_count,
        COALESCE(SUM(monthly_fare), 0) as total_monthly_potential,
        COUNT(DISTINCT route_id) as active_routes_count
      FROM student_transport_enrollments
      WHERE school_id = $1 AND status = 'ACTIVE'
    `, [schoolId]);

    // 2. Route-wise conveyance fee summary
    const routesRes = await db.query(`
      SELECT
        r.id as route_id,
        r.name as route_name,
        r.code as route_code,
        COUNT(ste.id) as students_count,
        COALESCE(SUM(ste.monthly_fare), 0) as route_monthly_total
      FROM transport_routes r
      LEFT JOIN student_transport_enrollments ste ON ste.route_id = r.id AND ste.status = 'ACTIVE'
      WHERE r.school_id = $1
      GROUP BY r.id, r.name, r.code
      ORDER BY r.code ASC
    `, [schoolId]);

    // 3. Student-level transport fee roster
    const studentsRes = await db.query(`
      SELECT
        ste.id as enrollment_id,
        ste.student_id,
        ste.monthly_fare,
        ste.start_date,
        ste.transport_type,
        ste.status as enrollment_status,
        s.admission_number,
        concat(s.first_name, ' ', s.last_name) as student_name,
        c.name as class_name,
        sec.name as section_name,
        r.code as route_code,
        r.name as route_name,
        ps.stop_name as pickup_stop_name,
        ds.stop_name as drop_stop_name
      FROM student_transport_enrollments ste
      JOIN students s ON ste.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      JOIN transport_routes r ON ste.route_id = r.id
      JOIN transport_route_stops ps ON ste.pickup_stop_id = ps.id
      JOIN transport_route_stops ds ON ste.drop_stop_id = ds.id
      WHERE ste.school_id = $1 AND ste.status = 'ACTIVE'
      ORDER BY s.first_name ASC
    `, [schoolId]);

    return res.json({
      summary: statsRes.rows[0],
      routeBreakdown: routesRes.rows,
      studentFees: studentsRes.rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/fees/sync-ledger', requireAuth, requirePermission('transport.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { sessionId } = req.body;

  try {
    // 1. Ensure Phase 6 Fee Category for School Transport exists
    const catId = `cat_${schoolId}_transport`;
    await db.query(`
      INSERT INTO fee_categories (id, school_id, name, code, description, is_system, status)
      VALUES ($1, $2, 'School Transport & Bus Conveyance Fee', 'TRANS_FEE', 'Monthly transport route and stop conveyance fee', true, 'active')
      ON CONFLICT (school_id, code) DO NOTHING;
    `, [catId, schoolId]);

    // 2. Fetch all active enrollments for this school
    const enrRes = await db.query(`
      SELECT ste.*, s.class_id, s.section_id
      FROM student_transport_enrollments ste
      JOIN students s ON ste.student_id = s.id
      WHERE ste.school_id = $1 AND ste.status = 'ACTIVE'
    `, [schoolId]);

    const targetSessionId = sessionId || 'sess_vvps_2627';
    let syncedCount = 0;

    for (const enr of enrRes.rows as any[]) {
      const fareAmount = parseFloat(enr.monthly_fare) || 0;
      if (fareAmount <= 0) continue;

      // Check if student has a transport fee charge for the current term/month
      const existingCharge = await db.query(`
        SELECT id FROM student_fee_charges
        WHERE student_id = $1 AND school_id = $2 AND installment_name = $3
      `, [enr.student_id, schoolId, `Transport Conveyance (${new Date().toLocaleString('default', { month: 'short', year: 'numeric' })})`]);

      if (existingCharge.rows.length === 0) {
        // Find or create student fee assignment record
        let assignId = `sfa_trn_${enr.student_id}_${targetSessionId}`;
        const assignCheck = await db.query(`
          SELECT id FROM student_fee_assignments
          WHERE student_id = $1 AND session_id = $2
          LIMIT 1
        `, [enr.student_id, targetSessionId]);

        if (assignCheck.rows.length > 0) {
          assignId = (assignCheck.rows[0] as any).id;
        } else {
          // Find any active fee structure for fallback or create a dedicated transport structure
          let structId = 'fstruct_sch_vvps_primary';
          const structRes = await db.query(`SELECT id FROM fee_structures WHERE school_id = $1 LIMIT 1`, [schoolId]);
          if (structRes.rows.length > 0) structId = (structRes.rows[0] as any).id;

          await db.query(`
            INSERT INTO student_fee_assignments (
              id, school_id, session_id, student_id, class_id, section_id,
              structure_id, total_charges, net_payable, outstanding_balance, status, assigned_date, created_by_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $8, 'PENDING', CURRENT_DATE, $9)
            ON CONFLICT (id) DO NOTHING;
          `, [
            assignId, schoolId, targetSessionId, enr.student_id,
            enr.class_id, enr.section_id, structId, fareAmount, req.user!.id
          ]);
        }

        const chargeId = `sfc_trn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const monthLabel = `Transport Conveyance (${new Date().toLocaleString('default', { month: 'short', year: 'numeric' })})`;

        await db.query(`
          INSERT INTO student_fee_charges (
            id, assignment_id, school_id, session_id, student_id, category_id,
            installment_name, installment_no, due_date, amount, outstanding_amount, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, CURRENT_DATE + INTERVAL '10 days', $8, $8, 'PENDING')
          ON CONFLICT (id) DO NOTHING;
        `, [
          chargeId, assignId, schoolId, targetSessionId, enr.student_id, catId,
          monthLabel, fareAmount
        ]);

        syncedCount++;
      }
    }

    return res.json({
      message: `Transport conveyance synced successfully with Fees & Accounts ledger (${syncedCount} charges posted).`,
      syncedCount
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
