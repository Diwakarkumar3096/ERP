import type { PGlite } from '@electric-sql/pglite';

export async function ensurePhase9SchemaAndData(db: PGlite) {
  try {
    console.log('[DB] Checking Phase 9 Transport, Vehicle & School Bus Management schema...');

    // 1. Create Core Transport Architecture Tables
    await db.exec(`
      -- 1. Transport Settings
      CREATE TABLE IF NOT EXISTS transport_settings (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
        document_expiry_alert_days INT DEFAULT 30,
        maintenance_reminder_days INT DEFAULT 15,
        maintenance_reminder_km INT DEFAULT 1000,
        allow_over_capacity_override BOOLEAN DEFAULT false,
        auto_generate_monthly_fees BOOLEAN DEFAULT true,
        speed_limit_kmph INT DEFAULT 50,
        emergency_helpline VARCHAR(50) DEFAULT '+91 98350 00100',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 2. Fleet Vehicles
      CREATE TABLE IF NOT EXISTS vehicles (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        registration_number VARCHAR(50) NOT NULL,
        vehicle_number VARCHAR(50) NOT NULL,
        vehicle_type VARCHAR(50) DEFAULT 'Bus',
        make VARCHAR(100),
        model VARCHAR(100),
        manufacturer VARCHAR(100),
        manufacturing_year INT,
        purchase_date DATE,
        purchase_cost NUMERIC(12, 2) DEFAULT 0,
        seating_capacity INT NOT NULL DEFAULT 40,
        standing_capacity INT DEFAULT 0,
        total_capacity INT NOT NULL DEFAULT 40,
        fuel_type VARCHAR(50) DEFAULT 'Diesel',
        current_mileage INT DEFAULT 0,
        vehicle_color VARCHAR(50) DEFAULT 'Golden Yellow',
        vehicle_photo TEXT,
        gps_device_id VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Active',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, registration_number),
        UNIQUE(school_id, vehicle_number)
      );

      -- 3. Vehicle Compliance Documents
      CREATE TABLE IF NOT EXISTS vehicle_documents (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        vehicle_id VARCHAR(50) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        document_type VARCHAR(100) NOT NULL,
        document_number VARCHAR(100) NOT NULL,
        issue_date DATE NOT NULL,
        expiry_date DATE NOT NULL,
        issuing_authority VARCHAR(150),
        file_url TEXT,
        reminder_days INT DEFAULT 30,
        remarks TEXT,
        status VARCHAR(50) DEFAULT 'VALID',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 4. Transport Drivers (Extending Employees)
      CREATE TABLE IF NOT EXISTS transport_drivers (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        license_number VARCHAR(100) NOT NULL,
        license_type VARCHAR(100) NOT NULL DEFAULT 'Commercial / HMV',
        license_issue_date DATE NOT NULL,
        license_expiry_date DATE NOT NULL,
        experience_years INT DEFAULT 5,
        badge_number VARCHAR(100),
        medical_fitness_status VARCHAR(50) DEFAULT 'FIT',
        police_verification_status VARCHAR(50) DEFAULT 'VERIFIED',
        driver_photo TEXT,
        emergency_contact_name VARCHAR(100),
        emergency_contact_phone VARCHAR(50),
        status VARCHAR(50) DEFAULT 'ACTIVE',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, employee_id),
        UNIQUE(school_id, license_number)
      );

      -- 5. Transport Staff / Conductor Assignments
      CREATE TABLE IF NOT EXISTS transport_staff_assignments (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        vehicle_id VARCHAR(50) REFERENCES vehicles(id) ON DELETE SET NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'Conductor',
        start_date DATE NOT NULL,
        end_date DATE,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 6. Transport Routes
      CREATE TABLE IF NOT EXISTS transport_routes (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        academic_session_id VARCHAR(50) REFERENCES academic_sessions(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(50) NOT NULL,
        start_point VARCHAR(150) NOT NULL,
        end_point VARCHAR(150) NOT NULL,
        estimated_distance_km NUMERIC(6, 2) DEFAULT 0,
        estimated_duration_mins INT DEFAULT 45,
        assigned_vehicle_id VARCHAR(50) REFERENCES vehicles(id) ON DELETE SET NULL,
        assigned_driver_id VARCHAR(50) REFERENCES transport_drivers(id) ON DELETE SET NULL,
        assigned_conductor_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, code)
      );

      -- 7. Route Stops
      CREATE TABLE IF NOT EXISTS transport_route_stops (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        route_id VARCHAR(50) NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
        stop_name VARCHAR(150) NOT NULL,
        address TEXT,
        sequence_order INT NOT NULL DEFAULT 1,
        landmark VARCHAR(150),
        pickup_time VARCHAR(20) NOT NULL,
        drop_time VARCHAR(20) NOT NULL,
        fare_amount NUMERIC(10, 2) DEFAULT 1200.00,
        latitude NUMERIC(10, 6),
        longitude NUMERIC(10, 6),
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(route_id, sequence_order)
      );

      -- 8. Student Transport Enrollments
      CREATE TABLE IF NOT EXISTS student_transport_enrollments (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        academic_session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        route_id VARCHAR(50) NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
        pickup_stop_id VARCHAR(50) NOT NULL REFERENCES transport_route_stops(id) ON DELETE RESTRICT,
        drop_stop_id VARCHAR(50) NOT NULL REFERENCES transport_route_stops(id) ON DELETE RESTRICT,
        transport_type VARCHAR(50) DEFAULT 'Pickup + Drop',
        monthly_fare NUMERIC(10, 2) DEFAULT 1500.00,
        start_date DATE NOT NULL,
        end_date DATE,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        emergency_contact_person VARCHAR(100),
        emergency_contact_phone VARCHAR(50),
        authorized_pickup_person VARCHAR(100),
        authorized_pickup_phone VARCHAR(50),
        medical_alert_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, academic_session_id, student_id)
      );

      -- 9. Daily Transport Trips
      CREATE TABLE IF NOT EXISTS transport_trips (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        route_id VARCHAR(50) NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
        vehicle_id VARCHAR(50) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        driver_id VARCHAR(50) NOT NULL REFERENCES transport_drivers(id) ON DELETE CASCADE,
        conductor_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
        trip_date DATE NOT NULL,
        trip_type VARCHAR(50) NOT NULL,
        scheduled_start_time VARCHAR(20),
        scheduled_end_time VARCHAR(20),
        actual_start_time TIMESTAMP WITH TIME ZONE,
        actual_end_time TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) DEFAULT 'Scheduled',
        odometer_start INT,
        odometer_end INT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, route_id, trip_date, trip_type)
      );

      -- 10. Daily Transport Attendance & Movement Records
      CREATE TABLE IF NOT EXISTS transport_attendance_records (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        trip_id VARCHAR(50) NOT NULL REFERENCES transport_trips(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        route_id VARCHAR(50) NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
        stop_id VARCHAR(50) NOT NULL REFERENCES transport_route_stops(id) ON DELETE CASCADE,
        attendance_date DATE NOT NULL,
        pickup_status VARCHAR(50) DEFAULT 'Scheduled',
        pickup_time VARCHAR(20),
        drop_status VARCHAR(50) DEFAULT 'Scheduled',
        drop_time VARCHAR(20),
        authorized_receiver_name VARCHAR(100),
        authorized_receiver_phone VARCHAR(50),
        remarks TEXT,
        marked_by_id VARCHAR(50),
        marked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(trip_id, student_id)
      );

      -- 11. Vehicle Maintenance & Servicing
      CREATE TABLE IF NOT EXISTS vehicle_maintenance (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        vehicle_id VARCHAR(50) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        maintenance_date DATE NOT NULL,
        maintenance_type VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        vendor_center VARCHAR(150) NOT NULL,
        invoice_number VARCHAR(100),
        cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
        odometer_reading INT,
        next_maintenance_date DATE,
        next_maintenance_mileage INT,
        expense_record_id VARCHAR(50) REFERENCES expenses(id) ON DELETE SET NULL,
        remarks TEXT,
        created_by_id VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 12. Vehicle Fuel Log
      CREATE TABLE IF NOT EXISTS vehicle_fuel_records (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        vehicle_id VARCHAR(50) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        fuel_date DATE NOT NULL,
        fuel_type VARCHAR(50) NOT NULL DEFAULT 'Diesel',
        quantity_litres NUMERIC(8, 2) NOT NULL,
        rate_per_litre NUMERIC(8, 2) NOT NULL,
        total_amount NUMERIC(10, 2) NOT NULL,
        odometer_reading INT NOT NULL,
        fuel_station VARCHAR(150),
        invoice_number VARCHAR(100),
        expense_record_id VARCHAR(50) REFERENCES expenses(id) ON DELETE SET NULL,
        entered_by_id VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 13. Transport Incidents & Emergencies
      CREATE TABLE IF NOT EXISTS transport_incidents (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        incident_date DATE NOT NULL,
        incident_time VARCHAR(20),
        incident_type VARCHAR(100) NOT NULL,
        severity VARCHAR(50) NOT NULL DEFAULT 'Medium',
        vehicle_id VARCHAR(50) REFERENCES vehicles(id) ON DELETE SET NULL,
        route_id VARCHAR(50) REFERENCES transport_routes(id) ON DELETE SET NULL,
        driver_id VARCHAR(50) REFERENCES transport_drivers(id) ON DELETE SET NULL,
        students_involved TEXT,
        location VARCHAR(200),
        description TEXT NOT NULL,
        action_taken TEXT,
        reported_by VARCHAR(150),
        status VARCHAR(50) DEFAULT 'Open',
        follow_up_notes TEXT,
        resolved_by VARCHAR(150),
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 14. Transport Notices & Circulars
      CREATE TABLE IF NOT EXISTS transport_notices (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        route_id VARCHAR(50) REFERENCES transport_routes(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        notice_type VARCHAR(50) DEFAULT 'Delay',
        target_audience VARCHAR(50) DEFAULT 'ALL',
        publish_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for High Performance Queries & Isolation
      CREATE INDEX IF NOT EXISTS idx_veh_school ON vehicles(school_id);
      CREATE INDEX IF NOT EXISTS idx_veh_status ON vehicles(status);
      CREATE INDEX IF NOT EXISTS idx_vehdoc_veh ON vehicle_documents(vehicle_id);
      CREATE INDEX IF NOT EXISTS idx_vehdoc_exp ON vehicle_documents(expiry_date);
      CREATE INDEX IF NOT EXISTS idx_drv_emp ON transport_drivers(employee_id);
      CREATE INDEX IF NOT EXISTS idx_drv_lic_exp ON transport_drivers(license_expiry_date);
      CREATE INDEX IF NOT EXISTS idx_rte_school ON transport_routes(school_id);
      CREATE INDEX IF NOT EXISTS idx_rtestop_rte ON transport_route_stops(route_id);
      CREATE INDEX IF NOT EXISTS idx_stuenr_stu ON student_transport_enrollments(student_id);
      CREATE INDEX IF NOT EXISTS idx_stuenr_rte ON student_transport_enrollments(route_id);
      CREATE INDEX IF NOT EXISTS idx_trip_date ON transport_trips(trip_date);
      CREATE INDEX IF NOT EXISTS idx_trip_route ON transport_trips(route_id);
      CREATE INDEX IF NOT EXISTS idx_tatt_trip ON transport_attendance_records(trip_id);
      CREATE INDEX IF NOT EXISTS idx_tatt_stu ON transport_attendance_records(student_id);
      CREATE INDEX IF NOT EXISTS idx_vmaint_veh ON vehicle_maintenance(vehicle_id);
      CREATE INDEX IF NOT EXISTS idx_vfuel_veh ON vehicle_fuel_records(vehicle_id);
      CREATE INDEX IF NOT EXISTS idx_tinc_school ON transport_incidents(school_id);
      CREATE INDEX IF NOT EXISTS idx_tnot_school ON transport_notices(school_id);
    `);

    // 2. Ensure Expense Category for Transport Operations (Phase 6 Integration)
    await db.exec(`
      INSERT INTO expense_categories (id, school_id, name, code, status)
      VALUES
        ('expcat_sch_vvps_transport', 'sch_vvps', 'Transport, Fuel & Vehicle Fleet Maintenance', 'TRANSPORT', 'active')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 3. Register Phase 9 RBAC Permissions
    const transportPermissions = [
      { id: 'transport.view', module: 'TRANSPORT', name: 'View Transport', desc: 'View transport dashboard, vehicle fleet, routes, stops, and schedules' },
      { id: 'transport.manage', module: 'TRANSPORT', name: 'Manage Transport', desc: 'Full administration of fleet, routes, stops, and settings' },
      { id: 'transport.vehicles.manage', module: 'TRANSPORT', name: 'Manage Vehicles', desc: 'Add, update vehicles, upload documents, and track compliance' },
      { id: 'transport.routes.manage', module: 'TRANSPORT', name: 'Manage Routes & Stops', desc: 'Configure bus routes, stop sequencing, timings, and stop fares' },
      { id: 'transport.enroll.manage', module: 'TRANSPORT', name: 'Manage Student Transport', desc: 'Enroll students in bus routes and assign pickup/drop stops' },
      { id: 'transport.trips.manage', module: 'TRANSPORT', name: 'Manage Daily Trips', desc: 'Dispatch, schedule and monitor daily morning pickup & drop trips' },
      { id: 'transport.attendance.mark', module: 'TRANSPORT', name: 'Mark Transport Attendance', desc: 'Mark student boarding and drop status in mobile workspace' },
      { id: 'transport.maintenance.manage', module: 'TRANSPORT', name: 'Manage Vehicle Maintenance', desc: 'Record servicing, repair tickets, and sync expenses' },
      { id: 'transport.fuel.manage', module: 'TRANSPORT', name: 'Manage Fuel & Mileage', desc: 'Log fuel refills, track odometer readings, and calculate fuel efficiency' },
      { id: 'transport.incidents.manage', module: 'TRANSPORT', name: 'Manage Incidents & Emergencies', desc: 'Log breakdowns, delays, behavior issues and resolutions' },
      { id: 'transport.notices.manage', module: 'TRANSPORT', name: 'Manage Transport Notices', desc: 'Publish route delays, bus change alerts and emergency bulletins' },
      { id: 'transport.reports.view', module: 'TRANSPORT', name: 'View Transport Reports', desc: 'Access fleet utilization, route capacity, fuel costs, and attendance logs' },
      { id: 'transport.settings.manage', module: 'TRANSPORT', name: 'Manage Transport Settings', desc: 'Configure document alert thresholds and capacity override rules' }
    ];

    for (const p of transportPermissions) {
      await db.query(`
        INSERT INTO permissions (id, module, name, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING;
      `, [p.id, p.module, p.name, p.desc]);
    }

    // Role Assignments
    const allTransportPermIds = transportPermissions.map(p => p.id);
    for (const pid of allTransportPermIds) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_super_admin', $1) ON CONFLICT DO NOTHING;`, [pid]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_school_admin', $1) ON CONFLICT DO NOTHING;`, [pid]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_principal', $1) ON CONFLICT DO NOTHING;`, [pid]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_transport_manager', $1) ON CONFLICT DO NOTHING;`, [pid]);
    }

    // Accountant view permissions
    for (const pid of ['transport.view', 'transport.reports.view']) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_accountant', $1) ON CONFLICT DO NOTHING;`, [pid]);
    }

    // Teacher & Staff view & attendance permissions
    for (const pid of ['transport.view', 'transport.attendance.mark', 'transport.incidents.manage']) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_teacher', $1) ON CONFLICT DO NOTHING;`, [pid]);
    }

    // 4. Seed Settings for Vidyavahini Public School (VVPS)
    await db.exec(`
      INSERT INTO transport_settings (
        id, school_id, document_expiry_alert_days, maintenance_reminder_days,
        maintenance_reminder_km, allow_over_capacity_override, auto_generate_monthly_fees,
        speed_limit_kmph, emergency_helpline
      ) VALUES (
        'tsett_vvps', 'sch_vvps', 30, 15, 1000, true, true, 50, '+91 98350 00100'
      ) ON CONFLICT (school_id) DO NOTHING;
    `);

    // 5. Check if Transport Department and Drivers exist in employees table
    await db.exec(`
      INSERT INTO departments (id, school_id, name, code, description, status)
      VALUES
        ('dept_vvps_transport', 'sch_vvps', 'Transport & Fleet Logistics', 'TRANS', 'School bus operations, fleet maintenance, and student conveyance', 'active')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO designations (id, school_id, department_id, name, code, employee_type, description, status)
      VALUES
        ('desig_vvps_driver', 'sch_vvps', 'dept_vvps_transport', 'Senior School Bus Driver', 'DRV-SR', 'Non-Teaching', 'Licensed heavy passenger commercial vehicle driver', 'active'),
        ('desig_vvps_conductor', 'sch_vvps', 'dept_vvps_transport', 'Transport Conductor & Attendant', 'TRANS-CND', 'Non-Teaching', 'Route student roll-call and vehicle safety supervisor', 'active')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Seed Driver & Conductor Staff in Employees table if not already present
    await db.exec(`
      INSERT INTO employees (
        id, school_id, employee_id_number, employee_type, first_name, last_name, email, mobile_number,
        gender, date_of_birth, date_of_joining, department_id, designation_id,
        employment_status, address, city, state, pin_code,
        emergency_contact_name, emergency_contact_number
      ) VALUES
        (
          'emp_vvps_drv1', 'sch_vvps', 'VVP-EMP-0010', 'Non-Teaching', 'Ramakant', 'Yadav',
          'ramakant.yadav@vvps.edu.in', '+91 98350 88001', 'MALE', '1984-06-12',
          '2022-04-01', 'dept_vvps_transport', 'desig_vvps_driver',
          'ACTIVE', 'Quarter 14, Staff Housing Colony', 'Prayagraj', 'Uttar Pradesh', '211002',
          'Shanti Yadav (Wife)', '+91 98350 88002'
        ),
        (
          'emp_vvps_drv2', 'sch_vvps', 'VVP-EMP-0011', 'Non-Teaching', 'Suresh', 'Kumar',
          'suresh.kumar@vvps.edu.in', '+91 98350 88003', 'MALE', '1988-09-20',
          '2023-01-15', 'dept_vvps_transport', 'desig_vvps_driver',
          'ACTIVE', 'House 45, Naini Extension', 'Prayagraj', 'Uttar Pradesh', '211008',
          'Rekha Devi', '+91 98350 88004'
        ),
        (
          'emp_vvps_cnd1', 'sch_vvps', 'VVP-EMP-0012', 'Non-Teaching', 'Govind', 'Singh',
          'govind.singh@vvps.edu.in', '+91 98350 88005', 'MALE', '1992-03-15',
          '2023-06-01', 'dept_vvps_transport', 'desig_vvps_conductor',
          'ACTIVE', 'Village Jhusi, Near GT Road', 'Prayagraj', 'Uttar Pradesh', '211019',
          'Madan Singh (Brother)', '+91 98350 88006'
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 6. Seed Fleet Vehicles for VVPS
    await db.exec(`
      INSERT INTO vehicles (
        id, school_id, registration_number, vehicle_number, vehicle_type, make, model,
        manufacturer, manufacturing_year, purchase_date, purchase_cost, seating_capacity,
        standing_capacity, total_capacity, fuel_type, current_mileage, vehicle_color,
        gps_device_id, status, notes
      ) VALUES
        (
          'veh_vvps_bus1', 'sch_vvps', 'UP 70 AB 1234', 'BUS-01', 'Bus', 'Tata Motors',
          'Starbus Ultra 40-Seater', 'Tata Motors Commercial', 2023, '2023-03-10', 3250000.00,
          40, 0, 40, 'Diesel', 24450, 'Golden Yellow', 'GPS-VVPS-TRK-001', 'Active',
          'Equipped with speed governor, CCTV cameras, emergency exit door and first aid kit'
        ),
        (
          'veh_vvps_bus2', 'sch_vvps', 'UP 70 AB 5678', 'BUS-02', 'Bus', 'Ashok Leyland',
          'Oyster Wide 45-Seater', 'Ashok Leyland Ltd', 2022, '2022-07-15', 3600000.00,
          45, 0, 45, 'Diesel', 38150, 'Golden Yellow', 'GPS-VVPS-TRK-002', 'Active',
          'High capacity senior bus with GPS, reverse sensors and stop-arm indicator'
        ),
        (
          'veh_vvps_van1', 'sch_vvps', 'UP 70 CD 9012', 'VAN-01', 'Van', 'Force Motors',
          'Cruiser School Van 14-Seater', 'Force Motors Ltd', 2024, '2024-01-20', 1450000.00,
          14, 0, 14, 'CNG', 11800, 'Golden Yellow', 'GPS-VVPS-TRK-003', 'Active',
          'Kindergarten & primary feeder van covering narrow city streets and civil lines lanes'
        ),
        (
          'veh_vvps_bus3', 'sch_vvps', 'UP 70 EF 3456', 'BUS-03', 'Bus', 'Eicher Motors',
          'Starline 32-Seater', 'VE Commercial Vehicles', 2021, '2021-11-05', 2850000.00,
          32, 0, 32, 'Diesel', 62100, 'Golden Yellow', 'GPS-VVPS-TRK-004', 'Under Maintenance',
          'Scheduled workshop overhaul and suspension bushing replacement'
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 7. Seed Vehicle Documents
    await db.exec(`
      INSERT INTO vehicle_documents (
        id, school_id, vehicle_id, document_type, document_number, issue_date,
        expiry_date, issuing_authority, file_url, reminder_days, remarks, status
      ) VALUES
        (
          'vdoc_001', 'sch_vvps', 'veh_vvps_bus1', 'Registration Certificate', 'RC-UP70-AB1234',
          '2023-03-15', '2038-03-14', 'RTO Prayagraj, UP', '/documents/transport/rc_bus1.pdf',
          30, 'Permanent Commercial Passenger RC', 'VALID'
        ),
        (
          'vdoc_002', 'sch_vvps', 'veh_vvps_bus1', 'Insurance Policy', 'INS-NIC-998821',
          '2026-03-01', '2027-02-28', 'National Insurance Co. Ltd', '/documents/transport/ins_bus1.pdf',
          30, 'Comprehensive School Bus Commercial Fleet Policy with passenger cover', 'VALID'
        ),
        (
          'vdoc_003', 'sch_vvps', 'veh_vvps_bus1', 'Fitness Certificate', 'FIT-UP-2026-081',
          '2026-03-10', '2027-03-09', 'Motor Vehicle Inspection Authority', '/documents/transport/fit_bus1.pdf',
          30, 'Annual mechanical fitness and speed governor verified', 'VALID'
        ),
        (
          'vdoc_004', 'sch_vvps', 'veh_vvps_bus1', 'Pollution Under Control (PUC)', 'PUC-2026-9021',
          '2026-08-01', '2027-01-31', 'Authorized Emission Center Prayagraj', '/documents/transport/puc_bus1.pdf',
          15, 'Emission levels well within BS-VI limits', 'VALID'
        ),
        (
          'vdoc_005', 'sch_vvps', 'veh_vvps_bus2', 'Insurance Policy', 'INS-OIC-445512',
          '2025-11-15', '2026-11-14', 'Oriental Insurance Company', '/documents/transport/ins_bus2.pdf',
          30, 'Full passenger and zero dep coverage', 'EXPIRING_SOON'
        ),
        (
          'vdoc_006', 'sch_vvps', 'veh_vvps_bus3', 'Pollution Under Control (PUC)', 'PUC-2026-1102',
          '2026-04-01', '2026-10-01', 'Green Earth PUC Station', '/documents/transport/puc_bus3.pdf',
          7, 'Renewal due during current maintenance overhaul', 'EXPIRED'
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 8. Seed Transport Drivers
    await db.exec(`
      INSERT INTO transport_drivers (
        id, school_id, employee_id, license_number, license_type, license_issue_date,
        license_expiry_date, experience_years, badge_number, medical_fitness_status,
        police_verification_status, emergency_contact_name, emergency_contact_phone,
        status, notes
      ) VALUES
        (
          'drv_vvps_001', 'sch_vvps', 'emp_vvps_drv1', 'UP70 20080012345',
          'Heavy Passenger Commercial Vehicle (HMV)', '2008-05-10', '2028-05-09',
          14, 'BDG-UP-7011', 'FIT', 'VERIFIED', 'Shanti Yadav', '+91 98350 88002',
          'ACTIVE', 'Experienced senior driver with unblemished safety record'
        ),
        (
          'drv_vvps_002', 'sch_vvps', 'emp_vvps_drv2', 'UP70 20140098765',
          'Commercial Heavy Passenger (HMV)', '2014-08-14', '2029-08-13',
          9, 'BDG-UP-8842', 'FIT', 'VERIFIED', 'Rekha Devi', '+91 98350 88004',
          'ACTIVE', 'Punctual driver with defensive driving and first-aid training'
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 9. Seed Staff / Conductor Assignment
    await db.exec(`
      INSERT INTO transport_staff_assignments (
        id, school_id, employee_id, vehicle_id, role, start_date, status, notes
      ) VALUES
        ('cnd_vvps_001', 'sch_vvps', 'emp_vvps_cnd1', 'veh_vvps_bus1', 'Conductor', '2026-04-01', 'ACTIVE', 'Assigned to Route North (BUS-01) roll-call duties')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 10. Seed Transport Routes for VVPS (Session 2026-27)
    await db.exec(`
      INSERT INTO transport_routes (
        id, school_id, academic_session_id, name, code, start_point, end_point,
        estimated_distance_km, estimated_duration_mins, assigned_vehicle_id,
        assigned_driver_id, assigned_conductor_id, status, description
      ) VALUES
        (
          'rte_vvps_north', 'sch_vvps', 'sess_vvps_2627',
          'North Corridor (Civil Lines - Cantonment - Campus)', 'RTE-NORTH',
          'Civil Lines Bus Station', 'VVPS Main Campus Gate 1', 18.5, 45,
          'veh_vvps_bus1', 'drv_vvps_001', 'emp_vvps_cnd1', 'ACTIVE',
          'Key northern artery covering central residential colonies and cantonment quarters'
        ),
        (
          'rte_vvps_south', 'sch_vvps', 'sess_vvps_2627',
          'South Metro Line (George Town - Naini - Campus)', 'RTE-SOUTH',
          'George Town Post Office', 'VVPS Main Campus Gate 2', 22.0, 50,
          'veh_vvps_bus2', 'drv_vvps_002', null, 'ACTIVE',
          'Southern feeder line serving bridge corridor, commercial hubs and residential housing'
        ),
        (
          'rte_vvps_east', 'sch_vvps', 'sess_vvps_2627',
          'East Green Belt (Kalyani Devi - Daraganj - Campus)', 'RTE-EAST',
          'Kalyani Devi Chauraha', 'VVPS Main Campus Gate 1', 14.0, 35,
          'veh_vvps_van1', null, null, 'ACTIVE',
          'Feeder van route designed for primary school students in heritage residential sectors'
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 11. Seed Route Stops with Sequence and Fares
    await db.exec(`
      INSERT INTO transport_route_stops (
        id, school_id, route_id, stop_name, address, sequence_order, landmark,
        pickup_time, drop_time, fare_amount, latitude, longitude, status
      ) VALUES
        -- Route North Stops
        ('stop_n_01', 'sch_vvps', 'rte_vvps_north', 'Civil Lines Bus Terminus', 'Opp. Central Bank of India, MG Marg', 1, 'Near Central Coffee House', '06:50 AM', '03:10 PM', 1400.00, 25.4520, 81.8340, 'ACTIVE'),
        ('stop_n_02', 'sch_vvps', 'rte_vvps_north', 'High Court Colony Gate 2', 'Stanley Road Crossing, Civil Lines', 2, 'Opposite Allahabad High Court Library', '07:05 AM', '02:55 PM', 1300.00, 25.4600, 81.8410, 'ACTIVE'),
        ('stop_n_03', 'sch_vvps', 'rte_vvps_north', 'Cantonment Roundabout', 'Chatham Lines & Cantonment Crossing', 3, 'Army Officers Mess Junction', '07:18 AM', '02:40 PM', 1200.00, 25.4720, 81.8520, 'ACTIVE'),
        ('stop_n_04', 'sch_vvps', 'rte_vvps_north', 'Kalyani Enclave Main Gate', 'Vidyavahini Ring Road Sector 4', 4, 'Shri Ram Krishna Hospital Turn', '07:30 AM', '02:30 PM', 1000.00, 25.4850, 81.8610, 'ACTIVE'),
        ('stop_n_05', 'sch_vvps', 'rte_vvps_north', 'VVPS Campus Arrival Bay', 'School Entrance Gate 1, Vidyavahini Enclave', 5, 'Campus Security Gate & Bus Port', '07:45 AM', '02:15 PM', 0.00, 25.4920, 81.8700, 'ACTIVE'),

        -- Route South Stops
        ('stop_s_01', 'sch_vvps', 'rte_vvps_south', 'George Town Post Office', 'Lowther Road, George Town', 1, 'Near Government Inter College', '06:45 AM', '03:15 PM', 1500.00, 25.4380, 81.8540, 'ACTIVE'),
        ('stop_s_02', 'sch_vvps', 'rte_vvps_south', 'Tagore Town Circle', 'Tagore Road Park Entrance', 2, 'Opposite Tagore Memorial Hall', '07:00 AM', '03:00 PM', 1400.00, 25.4450, 81.8600, 'ACTIVE'),
        ('stop_s_03', 'sch_vvps', 'rte_vvps_south', 'Bairahana Crossing', 'Near Bairahana Flyover Junction', 3, 'Police Checkpost Point', '07:15 AM', '02:45 PM', 1300.00, 25.4550, 81.8680, 'ACTIVE'),
        ('stop_s_04', 'sch_vvps', 'rte_vvps_south', 'VVPS Campus Arrival Bay', 'School Entrance Gate 2, Vidyavahini Enclave', 4, 'Senior School Drop Point', '07:40 AM', '02:20 PM', 0.00, 25.4920, 81.8700, 'ACTIVE')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 12. Seed Student Transport Enrollments
    await db.exec(`
      INSERT INTO student_transport_enrollments (
        id, school_id, academic_session_id, student_id, route_id, pickup_stop_id,
        drop_stop_id, transport_type, monthly_fare, start_date, status,
        emergency_contact_person, emergency_contact_phone, authorized_pickup_person,
        authorized_pickup_phone, medical_alert_notes
      ) VALUES
        (
          'ste_vvps_001', 'sch_vvps', 'sess_vvps_2627', 'stu_vvps_001',
          'rte_vvps_north', 'stop_n_02', 'stop_n_02', 'Pickup + Drop', 1300.00,
          '2026-04-01', 'ACTIVE', 'Rajesh Kumar (Father)', '+91 98350 77101',
          'Kavita Kumar (Mother)', '+91 98350 77102', 'Mild motion sensitivity; front-middle seating preferred'
        ),
        (
          'ste_vvps_006', 'sch_vvps', 'sess_vvps_2627', 'stu_vvps_006',
          'rte_vvps_north', 'stop_n_03', 'stop_n_03', 'Pickup + Drop', 1200.00,
          '2026-04-01', 'ACTIVE', 'Alok Singhania (Father)', '+91 98350 77106',
          'Pooja Singhania (Mother)', '+91 98350 77107', null
        ),
        (
          'ste_vvps_007', 'sch_vvps', 'sess_vvps_2627', 'stu_vvps_007',
          'rte_vvps_north', 'stop_n_01', 'stop_n_01', 'Pickup + Drop', 1400.00,
          '2026-04-01', 'ACTIVE', 'Dharmesh Patel (Father)', '+91 98350 77108',
          'Bhavna Patel (Mother)', '+91 98350 77109', 'Carries inhaler for seasonal pollen allergy'
        ),
        (
          'ste_vvps_008', 'sch_vvps', 'sess_vvps_2627', 'stu_vvps_008',
          'rte_vvps_south', 'stop_s_01', 'stop_s_01', 'Pickup + Drop', 1500.00,
          '2026-04-01', 'ACTIVE', 'Nikhil Das (Father)', '+91 98350 77110',
          'Soma Das (Mother)', '+91 98350 77111', null
        ),
        (
          'ste_vvps_009', 'sch_vvps', 'sess_vvps_2627', 'stu_vvps_009',
          'rte_vvps_south', 'stop_s_02', 'stop_s_02', 'Pickup + Drop', 1400.00,
          '2026-04-01', 'ACTIVE', 'Souvik Sen (Father)', '+91 98350 77112',
          'Rina Sen (Mother)', '+91 98350 77113', null
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 13. Seed Today's Transport Trips
    await db.exec(`
      INSERT INTO transport_trips (
        id, school_id, route_id, vehicle_id, driver_id, conductor_id, trip_date,
        trip_type, scheduled_start_time, scheduled_end_time, actual_start_time,
        status, odometer_start, notes
      ) VALUES
        (
          'trip_today_n_morn', 'sch_vvps', 'rte_vvps_north', 'veh_vvps_bus1',
          'drv_vvps_001', 'emp_vvps_cnd1', CURRENT_DATE, 'Morning Pickup',
          '06:50 AM', '07:45 AM', CURRENT_TIMESTAMP - INTERVAL '1 hour',
          'In Progress', 24450, 'Regular morning student pickup run'
        ),
        (
          'trip_today_s_morn', 'sch_vvps', 'rte_vvps_south', 'veh_vvps_bus2',
          'drv_vvps_002', null, CURRENT_DATE, 'Morning Pickup',
          '06:45 AM', '07:40 AM', CURRENT_TIMESTAMP - INTERVAL '2 hours',
          'Completed', 38150, 'All enrolled students boarded and reached campus on schedule'
        ),
        (
          'trip_today_n_aft', 'sch_vvps', 'rte_vvps_north', 'veh_vvps_bus1',
          'drv_vvps_001', 'emp_vvps_cnd1', CURRENT_DATE, 'Afternoon Drop',
          '02:15 PM', '03:10 PM', null,
          'Scheduled', 24470, 'Afternoon return drop route'
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 14. Seed Transport Attendance Records for Today's Morning Trip
    await db.exec(`
      INSERT INTO transport_attendance_records (
        id, school_id, trip_id, student_id, route_id, stop_id, attendance_date,
        pickup_status, pickup_time, drop_status, drop_time, authorized_receiver_name,
        remarks, marked_by_id
      ) VALUES
        (
          'tatt_001', 'sch_vvps', 'trip_today_n_morn', 'stu_vvps_001',
          'rte_vvps_north', 'stop_n_02', CURRENT_DATE,
          'Boarded', '07:06 AM', 'Scheduled', null, null,
          'Boarded on time at High Court Colony Gate 2', 'emp_vvps_cnd1'
        ),
        (
          'tatt_002', 'sch_vvps', 'trip_today_n_morn', 'stu_vvps_006',
          'rte_vvps_north', 'stop_n_03', CURRENT_DATE,
          'Boarded', '07:20 AM', 'Scheduled', null, null,
          'Boarded at Cantonment Roundabout', 'emp_vvps_cnd1'
        ),
        (
          'tatt_003', 'sch_vvps', 'trip_today_n_morn', 'stu_vvps_007',
          'rte_vvps_north', 'stop_n_01', CURRENT_DATE,
          'Absent', null, 'Scheduled', null, null,
          'Parent telephoned that student is unwell today', 'emp_vvps_cnd1'
        ),
        (
          'tatt_004', 'sch_vvps', 'trip_today_s_morn', 'stu_vvps_008',
          'rte_vvps_south', 'stop_s_01', CURRENT_DATE,
          'Boarded', '06:47 AM', 'Dropped', '07:38 AM', null,
          'Safely dropped at VVPS Campus', 'drv_vvps_002'
        ),
        (
          'tatt_005', 'sch_vvps', 'trip_today_s_morn', 'stu_vvps_009',
          'rte_vvps_south', 'stop_s_02', CURRENT_DATE,
          'Boarded', '07:02 AM', 'Dropped', '07:38 AM', null,
          'Safely dropped at VVPS Campus', 'drv_vvps_002'
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 15. Seed Vehicle Maintenance History
    await db.exec(`
      INSERT INTO vehicle_maintenance (
        id, school_id, vehicle_id, maintenance_date, maintenance_type, description,
        vendor_center, invoice_number, cost, odometer_reading, next_maintenance_date,
        next_maintenance_mileage, remarks, created_by_id
      ) VALUES
        (
          'vmaint_001', 'sch_vvps', 'veh_vvps_bus1', CURRENT_DATE - INTERVAL '14 days',
          'Regular Service', '20,000 km Scheduled General Service: Engine oil change, fuel filter replacement, brake pads inspection and air cleaner servicing',
          'Tata Motors Authorized Commercial Workshop, Naini Industrial Area', 'INV-TAT-2026-9011',
          14250.00, 24000, CURRENT_DATE + INTERVAL '75 days', 29000,
          'All mechanical components in prime condition; speed governor calibration verified',
          'usr_super_admin'
        ),
        (
          'vmaint_002', 'sch_vvps', 'veh_vvps_bus3', CURRENT_DATE - INTERVAL '3 days',
          'Brake', 'Complete front and rear brake shoe overhaul, replacement of hydraulic brake fluid and drum skimming',
          'Express Commercial Auto Garage, Zero Road', 'INV-EXP-2026-4402',
          8800.00, 62100, CURRENT_DATE + INTERVAL '90 days', 67000,
          'Undergoing final test drive and suspension alignment check before returning to active line',
          'usr_super_admin'
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 16. Seed Vehicle Fuel Records
    await db.exec(`
      INSERT INTO vehicle_fuel_records (
        id, school_id, vehicle_id, fuel_date, fuel_type, quantity_litres,
        rate_per_litre, total_amount, odometer_reading, fuel_station,
        invoice_number, entered_by_id, notes
      ) VALUES
        (
          'vfuel_001', 'sch_vvps', 'veh_vvps_bus1', CURRENT_DATE - INTERVAL '2 days',
          'Diesel', 60.00, 89.50, 5370.00, 24350,
          'Indian Oil Auto Care, Civil Lines', 'IOC-RCP-88902',
          'emp_vvps_drv1', 'Full tank refueled before weekly route runs'
        ),
        (
          'vfuel_002', 'sch_vvps', 'veh_vvps_bus2', CURRENT_DATE - INTERVAL '3 days',
          'Diesel', 65.00, 89.50, 5817.50, 38050,
          'Bharat Petroleum Highway Station, Naini', 'BPCL-RCP-12044',
          'emp_vvps_drv2', 'Periodic diesel refueling'
        ),
        (
          'vfuel_003', 'sch_vvps', 'veh_vvps_van1', CURRENT_DATE - INTERVAL '4 days',
          'CNG', 18.50, 78.00, 1443.00, 11720,
          'GAIL Green Gas CNG Station, Cantonment', 'GAIL-CNG-9932',
          'usr_super_admin', 'CNG refill for primary feeder van'
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 17. Seed Transport Incidents
    await db.exec(`
      INSERT INTO transport_incidents (
        id, school_id, incident_date, incident_time, incident_type, severity,
        vehicle_id, route_id, driver_id, students_involved, location,
        description, action_taken, reported_by, status, follow_up_notes
      ) VALUES
        (
          'tinc_001', 'sch_vvps', CURRENT_DATE - INTERVAL '5 days', '07:22 AM',
          'Route Delay', 'Low', 'veh_vvps_bus1', 'rte_vvps_north', 'drv_vvps_001',
          'All Route North students', 'Cantonment Flyover Crossing',
          'Sudden municipal road repair work caused traffic standstill resulting in 14-minute arrival delay',
          'Driver contacted school control room. SMS alert broadcast to waiting parents. Bus reached safely at 07:59 AM.',
          'Ramakant Yadav (Driver)', 'Resolved', 'Municipal administration notified regarding morning school bus transit windows.'
        ),
        (
          'tinc_002', 'sch_vvps', CURRENT_DATE - INTERVAL '2 days', '02:40 PM',
          'Vehicle Breakdown', 'Medium', 'veh_vvps_bus3', null, null,
          'None (empty repositioning run)', 'Civil Lines Ring Road',
          'Alternator belt slippage during depot repositioning causing battery charging failure',
          'Vehicle towed to authorized garage. Replacement bus mobilized. No students were onboard.',
          'Fleet Coordinator', 'Under Review', 'Repairs scheduled with warranty claim.'
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 18. Seed Transport Notices
    await db.exec(`
      INSERT INTO transport_notices (
        id, school_id, route_id, title, content, notice_type, target_audience,
        publish_date, is_active, created_by
      ) VALUES
        (
          'tnot_001', 'sch_vvps', 'rte_vvps_north',
          'Route North: Advisory on Morning Road Works near Cantonment',
          'Dear Parents and Guardians, please note that ongoing road resurfacing near Chatham Lines may add 5-10 minutes to the morning schedule. Kindly ensure students are at their designated stops 5 minutes prior to scheduled pickup time.',
          'Route Change', 'PARENTS', CURRENT_DATE, true, 'Transport Department'
        ),
        (
          'tnot_002', 'sch_vvps', null,
          'Quarterly Fleet Fire Safety & Evacuation Drill Conducted',
          'All school buses and passenger vans underwent mandatory fire extinguisher inspections and staff evacuation drills today. Emergency emergency doors and first-aid kits are fully operational.',
          'General', 'ALL', CURRENT_DATE - INTERVAL '1 day', true, 'Safety Committee'
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('[DB] Phase 9 Transport, Vehicle & School Bus Management module initialized and seeded successfully.');
  } catch (err: any) {
    (globalThis as any).__phase9Error = err?.message || String(err);
    console.error('[DB PHASE 9 INIT ERROR]', err);
  }
}
