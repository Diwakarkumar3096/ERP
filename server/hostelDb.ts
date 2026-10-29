import type { PGlite } from '@electric-sql/pglite';

export async function ensurePhase11SchemaAndData(db: PGlite) {
  try {
    console.log('[DB] Checking Phase 11 Hostel / Residential Management schema...');

    // 1. Create Core Hostel Architecture Tables
    await db.exec(`
      -- 1. Hostels Master Table
      CREATE TABLE IF NOT EXISTS hostels (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(50) NOT NULL,
        hostel_type VARCHAR(50) DEFAULT 'Boys Hostel',
        gender VARCHAR(20) DEFAULT 'MALE',
        description TEXT,
        address TEXT,
        contact_number VARCHAR(50),
        capacity INT DEFAULT 100,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, code)
      );

      -- 2. Hostel Blocks
      CREATE TABLE IF NOT EXISTS hostel_blocks (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        hostel_id VARCHAR(50) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, hostel_id, code)
      );

      -- 3. Hostel Floors
      CREATE TABLE IF NOT EXISTS hostel_floors (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        hostel_id VARCHAR(50) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        block_id VARCHAR(50) NOT NULL REFERENCES hostel_blocks(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        floor_number INT NOT NULL DEFAULT 0,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, block_id, floor_number)
      );

      -- 4. Hostel Rooms
      CREATE TABLE IF NOT EXISTS hostel_rooms (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        hostel_id VARCHAR(50) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        block_id VARCHAR(50) NOT NULL REFERENCES hostel_blocks(id) ON DELETE CASCADE,
        floor_id VARCHAR(50) NOT NULL REFERENCES hostel_floors(id) ON DELETE CASCADE,
        room_number VARCHAR(50) NOT NULL,
        room_type VARCHAR(50) DEFAULT 'Standard',
        capacity INT DEFAULT 2,
        gender VARCHAR(20) DEFAULT 'MALE',
        status VARCHAR(50) DEFAULT 'Available',
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, hostel_id, room_number)
      );

      -- 5. Hostel Beds
      CREATE TABLE IF NOT EXISTS hostel_beds (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        hostel_id VARCHAR(50) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        room_id VARCHAR(50) NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
        bed_number VARCHAR(50) NOT NULL,
        bed_code VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'Available',
        condition VARCHAR(50) DEFAULT 'Good',
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, hostel_id, bed_code)
      );

      -- 6. Hostel Staff Assignments (Wardens & Resident Staff)
      CREATE TABLE IF NOT EXISTS hostel_staff_assignments (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        hostel_id VARCHAR(50) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        duty_schedule VARCHAR(200),
        contact_number VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 7. Hostel Duty Roster
      CREATE TABLE IF NOT EXISTS hostel_duty_roster (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        hostel_id VARCHAR(50) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        duty_date DATE NOT NULL,
        shift VARCHAR(50) NOT NULL,
        duty_type VARCHAR(50) DEFAULT 'Regular',
        start_time VARCHAR(20),
        end_time VARCHAR(20),
        notes TEXT,
        status VARCHAR(30) DEFAULT 'SCHEDULED',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 8. Hostel Student Admissions
      CREATE TABLE IF NOT EXISTS hostel_admissions (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        hostel_id VARCHAR(50) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        academic_session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        admission_number VARCHAR(50) NOT NULL,
        admission_date DATE NOT NULL,
        expected_exit_date DATE,
        status VARCHAR(50) DEFAULT 'Active',
        reason TEXT,
        approved_by VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, admission_number)
      );

      -- 9. Hostel Bed Allocations
      CREATE TABLE IF NOT EXISTS hostel_allocations (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        hostel_id VARCHAR(50) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        room_id VARCHAR(50) NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
        bed_id VARCHAR(50) NOT NULL REFERENCES hostel_beds(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        admission_id VARCHAR(50) REFERENCES hostel_admissions(id) ON DELETE SET NULL,
        academic_session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        allocation_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        allocated_by VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 10. Hostel Allocation History (Transfers & Vacations)
      CREATE TABLE IF NOT EXISTS hostel_allocation_history (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        allocation_id VARCHAR(50) NOT NULL REFERENCES hostel_allocations(id) ON DELETE CASCADE,
        from_hostel_id VARCHAR(50) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        from_room_id VARCHAR(50) NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
        from_bed_id VARCHAR(50) NOT NULL REFERENCES hostel_beds(id) ON DELETE CASCADE,
        to_hostel_id VARCHAR(50) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        to_room_id VARCHAR(50) NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
        to_bed_id VARCHAR(50) NOT NULL REFERENCES hostel_beds(id) ON DELETE CASCADE,
        transfer_date DATE NOT NULL,
        reason TEXT,
        approved_by VARCHAR(100),
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 11. Hostel Withdrawals
      CREATE TABLE IF NOT EXISTS hostel_withdrawals (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        allocation_id VARCHAR(50) NOT NULL REFERENCES hostel_allocations(id) ON DELETE CASCADE,
        hostel_id VARCHAR(50) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        room_id VARCHAR(50) NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
        bed_id VARCHAR(50) NOT NULL REFERENCES hostel_beds(id) ON DELETE CASCADE,
        withdrawal_date DATE NOT NULL,
        reason TEXT,
        approved_by VARCHAR(100),
        clearance_status VARCHAR(50) DEFAULT 'CLEARED',
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 12. Hostel Attendance Header
      CREATE TABLE IF NOT EXISTS hostel_attendance (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        hostel_id VARCHAR(50) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        block_id VARCHAR(50) REFERENCES hostel_blocks(id) ON DELETE SET NULL,
        date DATE NOT NULL,
        attendance_type VARCHAR(50) NOT NULL,
        marked_by VARCHAR(100) NOT NULL,
        is_locked BOOLEAN DEFAULT false,
        locked_by VARCHAR(100),
        locked_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, hostel_id, date, attendance_type)
      );

      -- 13. Hostel Attendance Records
      CREATE TABLE IF NOT EXISTS hostel_attendance_records (
        id VARCHAR(50) PRIMARY KEY,
        attendance_id VARCHAR(50) NOT NULL REFERENCES hostel_attendance(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        room_id VARCHAR(50) REFERENCES hostel_rooms(id) ON DELETE SET NULL,
        bed_id VARCHAR(50) REFERENCES hostel_beds(id) ON DELETE SET NULL,
        status VARCHAR(50) NOT NULL,
        remarks TEXT,
        correction_reason TEXT,
        updated_by VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(attendance_id, student_id)
      );

      -- 14. Hostel Leaves
      CREATE TABLE IF NOT EXISTS hostel_leaves (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        hostel_id VARCHAR(50) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        leave_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT NOT NULL,
        destination VARCHAR(200),
        contact_number VARCHAR(50),
        requested_by VARCHAR(100),
        parent_consent_status VARCHAR(50) DEFAULT 'PENDING',
        parent_consent_remarks TEXT,
        parent_consent_at TIMESTAMP WITH TIME ZONE,
        approval_status VARCHAR(50) DEFAULT 'PENDING',
        approved_by VARCHAR(100),
        approved_at TIMESTAMP WITH TIME ZONE,
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 15. Hostel Outings
      CREATE TABLE IF NOT EXISTS hostel_outings (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        hostel_id VARCHAR(50) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        outing_date DATE NOT NULL,
        time_out VARCHAR(20) NOT NULL,
        expected_return VARCHAR(20) NOT NULL,
        actual_return VARCHAR(20),
        destination VARCHAR(200) NOT NULL,
        purpose TEXT,
        accompanying_person VARCHAR(100),
        contact_phone VARCHAR(50),
        parent_consent VARCHAR(50) DEFAULT 'GRANTED',
        approval_status VARCHAR(50) DEFAULT 'APPROVED',
        approved_by VARCHAR(100),
        status VARCHAR(50) DEFAULT 'APPROVED',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 16. Hostel Student Movement Register
      CREATE TABLE IF NOT EXISTS hostel_movements (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        hostel_id VARCHAR(50) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        movement_type VARCHAR(50) NOT NULL,
        reference_id VARCHAR(50),
        out_time TIMESTAMP WITH TIME ZONE NOT NULL,
        expected_return TIMESTAMP WITH TIME ZONE NOT NULL,
        actual_return TIMESTAMP WITH TIME ZONE,
        authorized_by VARCHAR(100),
        status VARCHAR(30) DEFAULT 'OUT',
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 17. Hostel Visitors
      CREATE TABLE IF NOT EXISTS hostel_visitors (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        hostel_id VARCHAR(50) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        visitor_name VARCHAR(150) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        relationship VARCHAR(50) NOT NULL,
        id_type VARCHAR(50) DEFAULT 'Aadhaar / Voter ID',
        id_reference VARCHAR(100),
        visit_date DATE NOT NULL,
        check_in_time VARCHAR(20),
        expected_check_out VARCHAR(20),
        actual_check_out VARCHAR(20),
        purpose TEXT,
        status VARCHAR(50) DEFAULT 'CHECKED_IN',
        approved_by VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 18. Hostel Incidents
      CREATE TABLE IF NOT EXISTS hostel_incidents (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        hostel_id VARCHAR(50) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        student_id VARCHAR(50) REFERENCES students(id) ON DELETE SET NULL,
        incident_date DATE NOT NULL,
        incident_type VARCHAR(50) NOT NULL,
        severity VARCHAR(30) DEFAULT 'MEDIUM',
        description TEXT NOT NULL,
        reported_by VARCHAR(100) NOT NULL,
        action_taken TEXT,
        status VARCHAR(30) DEFAULT 'OPEN',
        resolved_by VARCHAR(100),
        resolved_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 19. Hostel Disciplinary Actions
      CREATE TABLE IF NOT EXISTS hostel_disciplinary_records (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        incident_id VARCHAR(50) REFERENCES hostel_incidents(id) ON DELETE SET NULL,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        action_date DATE NOT NULL,
        penalty_details TEXT,
        parent_notified BOOLEAN DEFAULT false,
        recorded_by VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 20. Hostel Mess
      CREATE TABLE IF NOT EXISTS hostel_mess (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        hostel_id VARCHAR(50) REFERENCES hostels(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        meal_schedule JSONB DEFAULT '{"breakfast":"07:30 - 08:30","lunch":"12:30 - 13:45","snack":"16:30 - 17:15","dinner":"19:45 - 21:00"}'::jsonb,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, code)
      );

      -- 21. Hostel Menus
      CREATE TABLE IF NOT EXISTS hostel_menus (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        mess_id VARCHAR(50) NOT NULL REFERENCES hostel_mess(id) ON DELETE CASCADE,
        day_of_week VARCHAR(20) NOT NULL,
        meal_type VARCHAR(30) NOT NULL,
        items TEXT NOT NULL,
        special_notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 22. Hostel Meal Attendance
      CREATE TABLE IF NOT EXISTS hostel_meal_attendance (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        mess_id VARCHAR(50) NOT NULL REFERENCES hostel_mess(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        meal_type VARCHAR(30) NOT NULL,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        status VARCHAR(30) DEFAULT 'TAKEN',
        marked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, mess_id, date, meal_type, student_id)
      );

      -- 23. Hostel Maintenance
      CREATE TABLE IF NOT EXISTS hostel_maintenance (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        hostel_id VARCHAR(50) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        block_id VARCHAR(50) REFERENCES hostel_blocks(id) ON DELETE SET NULL,
        room_id VARCHAR(50) REFERENCES hostel_rooms(id) ON DELETE SET NULL,
        issue_title VARCHAR(200) NOT NULL,
        description TEXT,
        priority VARCHAR(30) DEFAULT 'MEDIUM',
        reported_by VARCHAR(100) NOT NULL,
        assigned_to VARCHAR(100),
        status VARCHAR(30) DEFAULT 'OPEN',
        reported_date DATE NOT NULL,
        resolved_date DATE,
        cost NUMERIC(10, 2) DEFAULT 0,
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 24. Hostel Assets
      CREATE TABLE IF NOT EXISTS hostel_assets (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        hostel_id VARCHAR(50) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        room_id VARCHAR(50) REFERENCES hostel_rooms(id) ON DELETE SET NULL,
        asset_name VARCHAR(100) NOT NULL,
        asset_code VARCHAR(50) NOT NULL,
        quantity INT DEFAULT 1,
        condition VARCHAR(50) DEFAULT 'Good',
        status VARCHAR(50) DEFAULT 'Active',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 25. Hostel Notices
      CREATE TABLE IF NOT EXISTS hostel_notices (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        hostel_id VARCHAR(50) REFERENCES hostels(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        target_audience VARCHAR(50) DEFAULT 'ALL',
        priority VARCHAR(30) DEFAULT 'NORMAL',
        publish_date DATE NOT NULL,
        expiry_date DATE,
        published_by VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 26. Hostel Rules & Configurable Policies
      CREATE TABLE IF NOT EXISTS hostel_rules (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        reporting_time VARCHAR(20) DEFAULT '18:30',
        night_roll_call_time VARCHAR(20) DEFAULT '21:00',
        outing_allowed_days VARCHAR(100) DEFAULT 'Saturday, Sunday',
        max_outings_per_month INT DEFAULT 4,
        visitor_start_time VARCHAR(20) DEFAULT '16:00',
        visitor_end_time VARCHAR(20) DEFAULT '18:30',
        quiet_hours_start VARCHAR(20) DEFAULT '22:00',
        quiet_hours_end VARCHAR(20) DEFAULT '06:00',
        leave_parent_consent_required BOOLEAN DEFAULT true,
        auto_overdue_threshold_mins INT DEFAULT 30,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id)
      );

      -- 27. Hostel Notifications
      CREATE TABLE IF NOT EXISTS hostel_notifications (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        link_url VARCHAR(200) DEFAULT '/hostel',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- PERFORMANCE INDEXES
      CREATE INDEX IF NOT EXISTS idx_hstl_sch ON hostels(school_id);
      CREATE INDEX IF NOT EXISTS idx_hstl_blk_hostel ON hostel_blocks(hostel_id);
      CREATE INDEX IF NOT EXISTS idx_hstl_flr_block ON hostel_floors(block_id);
      CREATE INDEX IF NOT EXISTS idx_hstl_rm_hostel ON hostel_rooms(hostel_id);
      CREATE INDEX IF NOT EXISTS idx_hstl_rm_floor ON hostel_rooms(floor_id);
      CREATE INDEX IF NOT EXISTS idx_hstl_bd_room ON hostel_beds(room_id);
      CREATE INDEX IF NOT EXISTS idx_hstl_bd_stat ON hostel_beds(status);
      CREATE INDEX IF NOT EXISTS idx_hstl_alloc_stu ON hostel_allocations(student_id);
      CREATE INDEX IF NOT EXISTS idx_hstl_alloc_bed ON hostel_allocations(bed_id);
      CREATE INDEX IF NOT EXISTS idx_hstl_alloc_stat ON hostel_allocations(status);
      CREATE INDEX IF NOT EXISTS idx_hstl_att_date ON hostel_attendance(date, hostel_id);
      CREATE INDEX IF NOT EXISTS idx_hstl_att_rec_stu ON hostel_attendance_records(student_id);
      CREATE INDEX IF NOT EXISTS idx_hstl_leave_stu ON hostel_leaves(student_id, approval_status);
      CREATE INDEX IF NOT EXISTS idx_hstl_out_stu ON hostel_outings(student_id, status);
      CREATE INDEX IF NOT EXISTS idx_hstl_mv_stat ON hostel_movements(status);
      CREATE INDEX IF NOT EXISTS idx_hstl_vis_stu ON hostel_visitors(student_id);
      CREATE INDEX IF NOT EXISTS idx_hstl_inc_hostel ON hostel_incidents(hostel_id);
      CREATE INDEX IF NOT EXISTS idx_hstl_maint_stat ON hostel_maintenance(status);
    `);

    // 2. Ensure Fee Categories for Hostel Accommodation & Mess (Phase 6 Integration)
    await db.exec(`
      INSERT INTO fee_categories (id, school_id, name, code, description, is_system, status)
      VALUES
        ('cat_vvps_hostel_board', 'sch_vvps', 'Hostel Boarding & Accommodation Fee', 'HOSTEL_BOARD', 'Term/Monthly residential room & utility charges', true, 'active'),
        ('cat_vvps_hostel_mess', 'sch_vvps', 'Hostel Mess & Dining Charges', 'HOSTEL_MESS', 'Catering, kitchen, and dining hall subscription fee', true, 'active')
      ON CONFLICT (school_id, code) DO NOTHING;
    `);

    // 3. Register Phase 11 RBAC Permissions
    const hostelPermissions = [
      { id: 'hostel.view', module: 'HOSTEL', name: 'View Hostel', desc: 'View hostel buildings, rooms, occupancy and dashboard' },
      { id: 'hostel.manage', module: 'HOSTEL', name: 'Manage Hostels', desc: 'Create, update and configure hostels, blocks, floors, rooms and beds' },
      { id: 'hostel.admit', module: 'HOSTEL', name: 'Hostel Admissions & Allocations', desc: 'Admit students, allocate beds, transfer rooms and process withdrawals' },
      { id: 'hostel.attendance.view', module: 'HOSTEL', name: 'View Hostel Attendance', desc: 'View morning, evening, and night roll call logs' },
      { id: 'hostel.attendance.mark', module: 'HOSTEL', name: 'Mark Hostel Attendance', desc: 'Mark roll call and night attendance for residents' },
      { id: 'hostel.attendance.lock', module: 'HOSTEL', name: 'Lock Hostel Attendance', desc: 'Lock residential attendance records and approve edits' },
      { id: 'hostel.leaves.manage', module: 'HOSTEL', name: 'Manage Resident Leaves', desc: 'Review, approve, or reject student home visit and medical leaves' },
      { id: 'hostel.outings.manage', module: 'HOSTEL', name: 'Manage Outings & Movements', desc: 'Authorize outings, track checkouts, and monitor overdue returns' },
      { id: 'hostel.visitors.manage', module: 'HOSTEL', name: 'Manage Hostel Visitors', desc: 'Record visitor check-ins, check-outs, and verify relationships' },
      { id: 'hostel.incidents.manage', module: 'HOSTEL', name: 'Manage Incidents & Discipline', desc: 'Report disciplinary issues, safety incidents, and actions taken' },
      { id: 'hostel.mess.manage', module: 'HOSTEL', name: 'Manage Mess & Menus', desc: 'Configure meal schedules, weekly dining menus, and meal logs' },
      { id: 'hostel.maintenance.manage', module: 'HOSTEL', name: 'Manage Hostel Maintenance', desc: 'Log and resolve room repairs, plumbing, electrical, and asset tracking' },
      { id: 'hostel.reports.view', module: 'HOSTEL', name: 'View Hostel Reports', desc: 'Access residential occupancy, movement, attendance, and fee reports' },
      { id: 'hostel.settings.manage', module: 'HOSTEL', name: 'Manage Hostel Settings', desc: 'Configure curfew timings, night roll-call rules, and visitor policies' }
    ];

    for (const p of hostelPermissions) {
      await db.query(`
        INSERT INTO permissions (id, module, name, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING;
      `, [p.id, p.module, p.name, p.desc]);
    }

    // Assign permissions to system roles
    const allHostelPermIds = hostelPermissions.map(p => p.id);
    const superAdminPerms = allHostelPermIds;
    const schoolAdminPerms = allHostelPermIds;
    const principalPerms = allHostelPermIds;
    const wardenPerms = [
      'hostel.view', 'hostel.admit', 'hostel.attendance.view', 'hostel.attendance.mark',
      'hostel.attendance.lock', 'hostel.leaves.manage', 'hostel.outings.manage',
      'hostel.visitors.manage', 'hostel.incidents.manage', 'hostel.mess.manage',
      'hostel.maintenance.manage', 'hostel.reports.view'
    ];
    const teacherPerms = ['hostel.view', 'hostel.attendance.view', 'hostel.incidents.manage'];
    const accountantPerms = ['hostel.view', 'hostel.reports.view'];

    for (const pid of superAdminPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_super_admin', $1) ON CONFLICT DO NOTHING;`, [pid]);
    }
    for (const pid of schoolAdminPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_school_admin', $1) ON CONFLICT DO NOTHING;`, [pid]);
    }
    for (const pid of principalPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_principal', $1) ON CONFLICT DO NOTHING;`, [pid]);
    }
    for (const pid of wardenPerms) {
      // If a dedicated role_warden exists or add for principal/teacher
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_teacher', $1) ON CONFLICT DO NOTHING;`, [pid]);
    }
    for (const pid of accountantPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_accountant', $1) ON CONFLICT DO NOTHING;`, [pid]);
    }

    // 4. Seed Hostel Rules for Vidyavahini Public School (VVPS)
    await db.query(`
      INSERT INTO hostel_rules (
        id, school_id, reporting_time, night_roll_call_time, outing_allowed_days,
        max_outings_per_month, visitor_start_time, visitor_end_time, quiet_hours_start,
        quiet_hours_end, leave_parent_consent_required, auto_overdue_threshold_mins
      ) VALUES (
        'hrules_vvps', 'sch_vvps', '18:30', '21:00', 'Saturday, Sunday',
        4, '16:00', '18:30', '22:00', '06:00', true, 30
      ) ON CONFLICT (school_id) DO NOTHING;
    `);

    // 5. Seed Hostels for VVPS
    await db.exec(`
      INSERT INTO hostels (
        id, school_id, name, code, hostel_type, gender, description, address, contact_number, capacity, is_active
      ) VALUES
        (
          'hstl_vvps_boys', 'sch_vvps', 'Swami Vivekananda Boys Hostel', 'HSTL-VVPS-BOYS',
          'Boys Hostel', 'MALE', 'Senior and middle school residential block equipped with study halls and solar water heating',
          'North Campus Residential Block 1, Vidyavahini Enclave', '+91 98350 22110', 80, true
        ),
        (
          'hstl_vvps_girls', 'sch_vvps', 'Sarojini Naidu Girls Hostel', 'HSTL-VVPS-GIRLS',
          'Girls Hostel', 'FEMALE', 'High-security campus residence featuring private study cubicles and round-the-clock matron supervision',
          'South Campus Residential Block 2, Vidyavahini Enclave', '+91 98350 22120', 60, true
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 6. Seed Hostel Blocks
    await db.exec(`
      INSERT INTO hostel_blocks (id, school_id, hostel_id, name, code, description, is_active)
      VALUES
        ('blk_vvps_b_a', 'sch_vvps', 'hstl_vvps_boys', 'Tagore Wing (Block A)', 'BLK-A', 'Junior & Middle School Cohort', true),
        ('blk_vvps_b_b', 'sch_vvps', 'hstl_vvps_boys', 'Raman Wing (Block B)', 'BLK-B', 'Senior Secondary Science & Commerce Cohort', true),
        ('blk_vvps_g_a', 'sch_vvps', 'hstl_vvps_girls', 'Kiran Bedi Wing (Block A)', 'BLK-A', 'Main Girls Residence Wing', true)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 7. Seed Hostel Floors
    await db.exec(`
      INSERT INTO hostel_floors (id, school_id, hostel_id, block_id, name, floor_number, description, is_active)
      VALUES
        ('flr_vvps_b_g', 'sch_vvps', 'hstl_vvps_boys', 'blk_vvps_b_a', 'Ground Floor', 0, 'Recreation lounge, common study hall and rooms 101-105', true),
        ('flr_vvps_b_1', 'sch_vvps', 'hstl_vvps_boys', 'blk_vvps_b_a', 'First Floor', 1, 'Senior dormitories and rooms 201-205', true),
        ('flr_vvps_g_g', 'sch_vvps', 'hstl_vvps_girls', 'blk_vvps_g_a', 'Ground Floor', 0, 'Warden office, medical sick bay and rooms G-101 to G-105', true),
        ('flr_vvps_g_1', 'sch_vvps', 'hstl_vvps_girls', 'blk_vvps_g_a', 'First Floor', 1, 'Rooms G-201 to G-206', true)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 8. Seed Rooms
    await db.exec(`
      INSERT INTO hostel_rooms (
        id, school_id, hostel_id, block_id, floor_id, room_number, room_type, capacity, gender, status, notes, is_active
      ) VALUES
        ('rm_vvps_101', 'sch_vvps', 'hstl_vvps_boys', 'blk_vvps_b_a', 'flr_vvps_b_g', 'Room 101', 'Standard', 2, 'MALE', 'Available', 'Garden-facing double room with attached washroom', true),
        ('rm_vvps_102', 'sch_vvps', 'hstl_vvps_boys', 'blk_vvps_b_a', 'flr_vvps_b_g', 'Room 102', 'Standard', 2, 'MALE', 'Available', 'Quiet study corridor room', true),
        ('rm_vvps_103', 'sch_vvps', 'hstl_vvps_boys', 'blk_vvps_b_a', 'flr_vvps_b_g', 'Room 103', 'Dormitory', 4, 'MALE', 'Available', 'Quad-sharing room with individual lockers and study desks', true),
        ('rm_vvps_201', 'sch_vvps', 'hstl_vvps_boys', 'blk_vvps_b_a', 'flr_vvps_b_1', 'Room 201', 'Standard', 2, 'MALE', 'Available', 'First floor double occupancy', true),
        ('rm_vvps_g101', 'sch_vvps', 'hstl_vvps_girls', 'blk_vvps_g_a', 'flr_vvps_g_g', 'Room G-101', 'Standard', 2, 'FEMALE', 'Available', 'Ground floor senior room opposite warden post', true),
        ('rm_vvps_g102', 'sch_vvps', 'hstl_vvps_girls', 'blk_vvps_g_a', 'flr_vvps_g_g', 'Room G-102', 'Standard', 2, 'FEMALE', 'Available', 'Double sharing room with balcony', true)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 9. Seed Beds
    await db.exec(`
      INSERT INTO hostel_beds (
        id, school_id, hostel_id, room_id, bed_number, bed_code, status, condition, notes, is_active
      ) VALUES
        -- Room 101 (Boys)
        ('bed_vvps_101a', 'sch_vvps', 'hstl_vvps_boys', 'rm_vvps_101', 'Bed 101-A', 'B-101A', 'Occupied', 'Good', 'Allocated to Aarav Kumar', true),
        ('bed_vvps_101b', 'sch_vvps', 'hstl_vvps_boys', 'rm_vvps_101', 'Bed 101-B', 'B-101B', 'Available', 'Good', 'Right window side bed with mattress & wardrobe', true),
        -- Room 102 (Boys)
        ('bed_vvps_102a', 'sch_vvps', 'hstl_vvps_boys', 'rm_vvps_102', 'Bed 102-A', 'B-102A', 'Occupied', 'Good', 'Allocated to Rohan Verma', true),
        ('bed_vvps_102b', 'sch_vvps', 'hstl_vvps_boys', 'rm_vvps_102', 'Bed 102-B', 'B-102B', 'Available', 'Good', 'Left side bed with study desk', true),
        -- Room 103 (Boys Dorm)
        ('bed_vvps_103a', 'sch_vvps', 'hstl_vvps_boys', 'rm_vvps_103', 'Bed 103-A', 'B-103A', 'Available', 'Good', 'Bunk bed lower left', true),
        ('bed_vvps_103b', 'sch_vvps', 'hstl_vvps_boys', 'rm_vvps_103', 'Bed 103-B', 'B-103B', 'Available', 'Good', 'Bunk bed upper left', true),
        ('bed_vvps_103c', 'sch_vvps', 'hstl_vvps_boys', 'rm_vvps_103', 'Bed 103-C', 'B-103C', 'Reserved', 'Good', 'Reserved for incoming exchange scholar', true),
        ('bed_vvps_103d', 'sch_vvps', 'hstl_vvps_boys', 'rm_vvps_103', 'Bed 103-D', 'B-103D', 'Maintenance', 'Needs Repair', 'Mattress and spring repair underway', true),
        -- Room 201 (Boys)
        ('bed_vvps_201a', 'sch_vvps', 'hstl_vvps_boys', 'rm_vvps_201', 'Bed 201-A', 'B-201A', 'Available', 'Good', 'First floor standard bed', true),
        ('bed_vvps_201b', 'sch_vvps', 'hstl_vvps_boys', 'rm_vvps_201', 'Bed 201-B', 'B-201B', 'Available', 'Good', 'First floor standard bed', true),
        -- Room G-101 (Girls)
        ('bed_vvps_g101a', 'sch_vvps', 'hstl_vvps_girls', 'rm_vvps_g101', 'Bed G-101A', 'BG-101A', 'Occupied', 'Good', 'Allocated to Ananya Sharma', true),
        ('bed_vvps_g101b', 'sch_vvps', 'hstl_vvps_girls', 'rm_vvps_g101', 'Bed G-101B', 'BG-101B', 'Available', 'Good', 'Right window side bed', true),
        -- Room G-102 (Girls)
        ('bed_vvps_g102a', 'sch_vvps', 'hstl_vvps_girls', 'rm_vvps_g102', 'Bed G-102A', 'BG-102A', 'Available', 'Good', 'Standard twin bed', true),
        ('bed_vvps_g102b', 'sch_vvps', 'hstl_vvps_girls', 'rm_vvps_g102', 'Bed G-102B', 'BG-102B', 'Available', 'Good', 'Standard twin bed', true)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 10. Seed Staff Assignments (Wardens)
    await db.exec(`
      INSERT INTO hostel_staff_assignments (
        id, school_id, hostel_id, employee_id, role, start_date, duty_schedule, contact_number, is_active
      ) VALUES
        ('hstaff_001', 'sch_vvps', 'hstl_vvps_boys', 'emp_vvps_002', 'Warden', '2026-04-01', 'Evening & Night Shift (Mon-Sat)', '+91 98350 22002', true),
        ('hstaff_002', 'sch_vvps', 'hstl_vvps_girls', 'emp_vvps_003', 'Warden', '2026-04-01', 'Resident Matron & House Parent', '+91 98350 55005', true)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 11. Seed Duty Roster
    await db.exec(`
      INSERT INTO hostel_duty_roster (
        id, school_id, hostel_id, employee_id, duty_date, shift, duty_type, start_time, end_time, notes, status
      ) VALUES
        ('roster_001', 'sch_vvps', 'hstl_vvps_boys', 'emp_vvps_002', CURRENT_DATE, 'Night', 'Night Roll Call & Security Round', '20:30', '06:00', 'Verify student presence and lock gates at 21:00', 'SCHEDULED'),
        ('roster_002', 'sch_vvps', 'hstl_vvps_girls', 'emp_vvps_003', CURRENT_DATE, 'Night', 'Matron Night Inspection', '20:00', '06:00', 'Check study halls and dormitory quiet hours', 'SCHEDULED')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 12. Seed Hostel Student Admissions & Bed Allocations
    // Student 1: Aarav Kumar (stu_vvps_001) -> Boys Hostel, Room 101, Bed 101-A
    await db.exec(`
      INSERT INTO hostel_admissions (
        id, school_id, hostel_id, academic_session_id, student_id, admission_number,
        admission_date, status, reason, approved_by, notes
      ) VALUES (
        'hadm_001', 'sch_vvps', 'hstl_vvps_boys', 'sess_vvps_2627', 'stu_vvps_001', 'VVPS-HOSTEL-2026-001',
        '2026-06-15', 'Active', 'Full residential boarder admission for academic session', 'usr_principal_vvps', 'Primary school boarder'
      ) ON CONFLICT (id) DO NOTHING;

      INSERT INTO hostel_allocations (
        id, school_id, hostel_id, room_id, bed_id, student_id, admission_id,
        academic_session_id, allocation_date, status, allocated_by, notes
      ) VALUES (
        'halloc_001', 'sch_vvps', 'hstl_vvps_boys', 'rm_vvps_101', 'bed_vvps_101a', 'stu_vvps_001', 'hadm_001',
        'sess_vvps_2627', '2026-06-15', 'ACTIVE', 'usr_admin_vvps', 'Standard allocation'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // Student 2: Rohan Verma (stu_vvps_003) -> Boys Hostel, Room 102, Bed 102-A
    await db.exec(`
      INSERT INTO hostel_admissions (
        id, school_id, hostel_id, academic_session_id, student_id, admission_number,
        admission_date, status, reason, approved_by, notes
      ) VALUES (
        'hadm_002', 'sch_vvps', 'hstl_vvps_boys', 'sess_vvps_2627', 'stu_vvps_003', 'VVPS-HOSTEL-2026-002',
        '2026-06-15', 'Active', 'Middle school boarder enrollment', 'usr_principal_vvps', 'CBSE Science residential batch'
      ) ON CONFLICT (id) DO NOTHING;

      INSERT INTO hostel_allocations (
        id, school_id, hostel_id, room_id, bed_id, student_id, admission_id,
        academic_session_id, allocation_date, status, allocated_by, notes
      ) VALUES (
        'halloc_002', 'sch_vvps', 'hstl_vvps_boys', 'rm_vvps_102', 'bed_vvps_102a', 'stu_vvps_003', 'hadm_002',
        'sess_vvps_2627', '2026-06-15', 'ACTIVE', 'usr_admin_vvps', 'Allocated room 102'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // Student 3: Ananya Sharma (stu_vvps_002) -> Girls Hostel, Room G-101, Bed G-101A
    await db.exec(`
      INSERT INTO hostel_admissions (
        id, school_id, hostel_id, academic_session_id, student_id, admission_number,
        admission_date, status, reason, approved_by, notes
      ) VALUES (
        'hadm_003', 'sch_vvps', 'hstl_vvps_girls', 'sess_vvps_2627', 'stu_vvps_002', 'VVPS-HOSTEL-2026-003',
        '2026-06-15', 'Active', 'Girls campus residential student', 'usr_principal_vvps', 'Approved'
      ) ON CONFLICT (id) DO NOTHING;

      INSERT INTO hostel_allocations (
        id, school_id, hostel_id, room_id, bed_id, student_id, admission_id,
        academic_session_id, allocation_date, status, allocated_by, notes
      ) VALUES (
        'halloc_003', 'sch_vvps', 'hstl_vvps_girls', 'rm_vvps_g101', 'bed_vvps_g101a', 'stu_vvps_002', 'hadm_003',
        'sess_vvps_2627', '2026-06-15', 'ACTIVE', 'usr_admin_vvps', 'Room G-101 allocated'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // 13. Seed Today's Night Attendance for Boys Hostel
    await db.exec(`
      INSERT INTO hostel_attendance (
        id, school_id, hostel_id, block_id, date, attendance_type, marked_by, is_locked, notes
      ) VALUES (
        'hatt_001', 'sch_vvps', 'hstl_vvps_boys', 'blk_vvps_b_a', CURRENT_DATE, 'NIGHT_ATTENDANCE',
        'usr_admin_vvps', true, 'Regular 21:00 night roll call'
      ) ON CONFLICT (id) DO NOTHING;

      INSERT INTO hostel_attendance_records (
        id, attendance_id, school_id, student_id, room_id, bed_id, status, remarks
      ) VALUES
        ('hattrec_001', 'hatt_001', 'sch_vvps', 'stu_vvps_001', 'rm_vvps_101', 'bed_vvps_101a', 'PRESENT', 'Present in room'),
        ('hattrec_002', 'hatt_001', 'sch_vvps', 'stu_vvps_003', 'rm_vvps_102', 'bed_vvps_102a', 'PRESENT', 'Present during inspection')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 14. Seed Approved Student Leave Request
    await db.exec(`
      INSERT INTO hostel_leaves (
        id, school_id, student_id, hostel_id, leave_type, start_date, end_date,
        reason, destination, contact_number, requested_by, parent_consent_status,
        parent_consent_remarks, parent_consent_at, approval_status, approved_by, approved_at, remarks
      ) VALUES (
        'hleave_001', 'sch_vvps', 'stu_vvps_003', 'hstl_vvps_boys', 'HOME_VISIT',
        CURRENT_DATE, (CURRENT_DATE + INTERVAL '2 days')::date,
        'Family festival visit to hometown', 'Civil Lines, Prayagraj', '+91 98350 77105',
        'Parent (Rajesh Verma)', 'GRANTED', 'Parent telephonic verification confirmed', CURRENT_TIMESTAMP,
        'APPROVED', 'usr_admin_vvps', CURRENT_TIMESTAMP, 'Approved for 2-day home visit'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // 15. Seed Outing & Student Movement Records
    await db.exec(`
      INSERT INTO hostel_outings (
        id, school_id, student_id, hostel_id, outing_date, time_out, expected_return,
        actual_return, destination, purpose, accompanying_person, contact_phone,
        parent_consent, approval_status, approved_by, status
      ) VALUES (
        'houting_001', 'sch_vvps', 'stu_vvps_001', 'hstl_vvps_boys', CURRENT_DATE,
        '16:30', '18:30', '18:25', 'City Central Library & Bookstore', 'Stationery and reference book purchase',
        'Guardian (Kavita Kumar)', '+91 98350 77101', 'GRANTED', 'APPROVED', 'usr_admin_vvps', 'RETURNED'
      ) ON CONFLICT (id) DO NOTHING;

      INSERT INTO hostel_movements (
        id, school_id, student_id, hostel_id, movement_type, reference_id,
        out_time, expected_return, actual_return, authorized_by, status, remarks
      ) VALUES (
        'hmv_001', 'sch_vvps', 'stu_vvps_001', 'hstl_vvps_boys', 'OUTING', 'houting_001',
        CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '30 minutes', CURRENT_TIMESTAMP - INTERVAL '35 minutes',
        'usr_admin_vvps', 'RETURNED', 'Returned cleanly before curfew'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // 16. Seed Visitor Management Record
    await db.exec(`
      INSERT INTO hostel_visitors (
        id, school_id, hostel_id, student_id, visitor_name, phone, relationship,
        id_type, id_reference, visit_date, check_in_time, expected_check_out,
        actual_check_out, purpose, status, approved_by, notes
      ) VALUES (
        'hvis_001', 'sch_vvps', 'hstl_vvps_girls', 'stu_vvps_002', 'Sunita Sharma (Mother)',
        '+91 98350 77102', 'Mother', 'Aadhaar Card', 'XXXX-XXXX-9012',
        CURRENT_DATE, '16:15', '17:30', '17:20', 'Weekend family visitation & delivering winter garments',
        'CHECKED_OUT', 'emp_vvps_003', 'Visitor verified via parent directory'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // 17. Seed Hostel Incident & Disciplinary Record
    await db.exec(`
      INSERT INTO hostel_incidents (
        id, school_id, hostel_id, student_id, incident_date, incident_type, severity,
        description, reported_by, action_taken, status, resolved_by, resolved_at, notes
      ) VALUES (
        'hinc_001', 'sch_vvps', 'hstl_vvps_boys', 'stu_vvps_003', CURRENT_DATE - INTERVAL '3 days',
        'UNAUTHORIZED_ABSENCE', 'LOW', 'Student delayed 15 minutes past evening study roll-call while in recreation lawn',
        'usr_admin_vvps', 'Verbal counselling and reminder of silent study hours', 'RESOLVED',
        'usr_admin_vvps', CURRENT_TIMESTAMP - INTERVAL '2 days', 'First minor infraction; student demonstrated sincere cooperation'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // 18. Seed Hostel Mess & 7-Day Menu
    await db.exec(`
      INSERT INTO hostel_mess (
        id, school_id, hostel_id, name, code, description, meal_schedule, is_active
      ) VALUES (
        'mess_vvps_central', 'sch_vvps', 'hstl_vvps_boys', 'Annapurna Central Dining Hall',
        'MESS-VVPS-1', 'Nutritious vegetarian cafeteria serving hot cooked meals with dairy and fruit servings',
        '{"breakfast":"07:30 - 08:30","lunch":"12:30 - 13:45","snack":"16:30 - 17:15","dinner":"19:45 - 21:00"}'::jsonb,
        true
      ) ON CONFLICT (id) DO NOTHING;

      INSERT INTO hostel_menus (id, school_id, mess_id, day_of_week, meal_type, items, special_notes, is_active)
      VALUES
        ('menu_mon_bk', 'sch_vvps', 'mess_vvps_central', 'Monday', 'BREAKFAST', 'Aloo Paratha with curd, fresh fruit, boiled eggs / sprouted moong, hot milk & tea', 'Protein rich start', true),
        ('menu_mon_lu', 'sch_vvps', 'mess_vvps_central', 'Monday', 'LUNCH', 'Steamed Basmati Rice, Dal Tadka, Seasonal Mixed Sabzi, Chapati, Salad & Papad', 'Traditional balanced meal', true),
        ('menu_mon_sn', 'sch_vvps', 'mess_vvps_central', 'Monday', 'EVENING_SNACK', 'Vegetable cutlets with mint chutney, biscuits & masala tea', 'Post-class refresh', true),
        ('menu_mon_dn', 'sch_vvps', 'mess_vvps_central', 'Monday', 'DINNER', 'Paneer Butter Masala, Jeera Rice, Phulka Roti, Cucumber Raita & Gulab Jamun', 'Special dinner night', true),
        ('menu_tue_bk', 'sch_vvps', 'mess_vvps_central', 'Tuesday', 'BREAKFAST', 'Poha with roasted peanuts, banana, boiled eggs, milk & coffee', 'Nutritious breakfast', true),
        ('menu_tue_lu', 'sch_vvps', 'mess_vvps_central', 'Tuesday', 'LUNCH', 'Rajma Masala, Steamed Rice, Bhindi Masala, Tawa Roti, Curd', 'Popular north-Indian feast', true),
        ('menu_tue_dn', 'sch_vvps', 'mess_vvps_central', 'Tuesday', 'DINNER', 'Moong Dal Khichdi with Desi Ghee, Baingan Bharta, Papad, Pickle & Kheer', 'Comfort dinner', true)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 19. Seed Maintenance Tickets
    await db.exec(`
      INSERT INTO hostel_maintenance (
        id, school_id, hostel_id, block_id, room_id, issue_title, description,
        priority, reported_by, assigned_to, status, reported_date, resolved_date, cost, remarks
      ) VALUES
        (
          'hmaint_001', 'sch_vvps', 'hstl_vvps_boys', 'blk_vvps_b_a', 'rm_vvps_101',
          'Bathroom washbasin tap dripping', 'Minor faucet washer leak causing dripping water sound',
          'LOW', 'usr_admin_vvps', 'Campus Plumber (Ramesh)', 'RESOLVED',
          CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '1 day', 150.00, 'Washer replaced'
        ),
        (
          'hmaint_002', 'sch_vvps', 'hstl_vvps_boys', 'blk_vvps_b_a', 'rm_vvps_103',
          'Ceiling fan regulator replacement', 'Fan running only at full speed on speed 5',
          'MEDIUM', 'usr_admin_vvps', 'Campus Electrician (Sunil)', 'OPEN',
          CURRENT_DATE, null, 0.00, 'New modular regulator requested from store'
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 20. Seed Hostel Notices
    await db.exec(`
      INSERT INTO hostel_notices (
        id, school_id, hostel_id, title, content, target_audience, priority, publish_date, published_by, is_active
      ) VALUES
        (
          'hnotif_001', 'sch_vvps', 'hstl_vvps_boys', 'Term 1 Evening Silent Study Hours Schedule',
          'All residents are advised that quiet study hours are observed between 19:30 and 21:00 PM daily. Cellphones and loud music are strictly prohibited in common study corridors.',
          'STUDENTS', 'IMPORTANT', CURRENT_DATE, 'Dr. Sunita Mishra (Principal)', true
        ),
        (
          'hnotif_002', 'sch_vvps', null, 'Hostel Winter Break Departure & Luggage Notice',
          'Parents may submit winter vacation leave requests via the portal by 20th November. Hostel maintenance sanitization will take place during recess.',
          'PARENTS', 'NORMAL', CURRENT_DATE, 'Hostel Administration', true
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 21. Seed In-app Notifications
    await db.exec(`
      INSERT INTO hostel_notifications (id, school_id, user_id, event_type, title, message, link_url, is_read)
      VALUES
        ('hnot_001', 'sch_vvps', 'usr_teacher_vvps', 'ROOM_ALLOCATION', 'Hostel Bed Allocated: Aarav Kumar', 'Student Aarav Kumar has been allocated Bed 101-A in Swami Vivekananda Boys Hostel.', '/hostel', false),
        ('hnot_002', 'sch_vvps', 'usr_super_admin', 'LEAVE_APPROVED', 'Hostel Leave Approved: Rohan Verma', 'Home visit leave from today for 2 days has been approved by the Warden.', '/hostel', false)
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('[DB] Phase 11 Hostel / Residential Management module initialized and seeded successfully.');
  } catch (err: any) {
    (globalThis as any).__phase11Error = err?.message || String(err);
    console.error('[DB PHASE 11 INIT ERROR]', err);
  }
}
