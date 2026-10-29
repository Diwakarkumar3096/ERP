import type { PGlite } from '@electric-sql/pglite';

export async function ensurePhase15SchemaAndData(db: PGlite) {
  try {
    console.log('[DB] Ensuring Phase 15 School Administration, Calendar, Events, Meetings & Visitor Management schema...');

    // 1. Core Administration, Calendar, Meetings & Visitor Tables
    await db.exec(`
      -- 1. Venues & Facilities
      CREATE TABLE IF NOT EXISTS event_venues (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(50) NOT NULL,
        capacity INT DEFAULT 50,
        location VARCHAR(150),
        facilities TEXT, -- Comma-separated or description: Projector, Sound System, AC, Stage
        status VARCHAR(30) DEFAULT 'AVAILABLE', -- AVAILABLE, MAINTENANCE, INACTIVE
        contact_person VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, code)
      );

      -- 2. School Calendar Events
      CREATE TABLE IF NOT EXISTS calendar_events (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) REFERENCES academic_sessions(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        event_type VARCHAR(50) NOT NULL DEFAULT 'SCHOOL_EVENT',
        start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
        end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
        venue_id VARCHAR(50) REFERENCES event_venues(id) ON DELETE SET NULL,
        venue_name VARCHAR(150),
        organizer_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        organizer_name VARCHAR(100),
        department VARCHAR(100),
        target_audience VARCHAR(50) NOT NULL DEFAULT 'ALL',
        target_class_id VARCHAR(50) REFERENCES classes(id) ON DELETE SET NULL,
        target_section_id VARCHAR(50) REFERENCES sections(id) ON DELETE SET NULL,
        max_participants INT DEFAULT 0,
        registration_required BOOLEAN DEFAULT FALSE,
        registration_deadline TIMESTAMP WITH TIME ZONE,
        attachment_url TEXT,
        attachment_name VARCHAR(255),
        status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED',
        estimated_budget NUMERIC(12, 2) DEFAULT 0.00,
        approved_budget NUMERIC(12, 2) DEFAULT 0.00,
        actual_expense NUMERIC(12, 2) DEFAULT 0.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 3. Venue Bookings with Conflict Detection
      CREATE TABLE IF NOT EXISTS venue_bookings (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        venue_id VARCHAR(50) NOT NULL REFERENCES event_venues(id) ON DELETE CASCADE,
        event_id VARCHAR(50) REFERENCES calendar_events(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        booked_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        booked_by_name VARCHAR(100),
        start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
        end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
        purpose TEXT,
        status VARCHAR(30) DEFAULT 'CONFIRMED', -- CONFIRMED, CANCELLED, OVERRIDDEN
        is_override BOOLEAN DEFAULT FALSE,
        override_reason TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 4. Resource Bookings (Inventory integration)
      CREATE TABLE IF NOT EXISTS resource_bookings (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        event_id VARCHAR(50) REFERENCES calendar_events(id) ON DELETE SET NULL,
        venue_id VARCHAR(50) REFERENCES event_venues(id) ON DELETE SET NULL,
        resource_name VARCHAR(150) NOT NULL,
        resource_type VARCHAR(50) DEFAULT 'EQUIPMENT',
        item_id VARCHAR(50), -- optional reference to inventory_items
        quantity INT DEFAULT 1,
        booked_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        booked_by_name VARCHAR(100),
        start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
        end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(30) DEFAULT 'CONFIRMED',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 5. Event Registrations
      CREATE TABLE IF NOT EXISTS event_registrations (
        id VARCHAR(50) PRIMARY KEY,
        event_id VARCHAR(50) NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        participant_id VARCHAR(50), -- user_id or student_id
        participant_name VARCHAR(150) NOT NULL,
        participant_type VARCHAR(50) NOT NULL DEFAULT 'STUDENT', -- STUDENT, PARENT, STAFF, GUEST
        participant_contact VARCHAR(100),
        class_name VARCHAR(50),
        registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(30) DEFAULT 'REGISTERED', -- REGISTERED, WAITLISTED, CANCELLED
        notes TEXT,
        UNIQUE(event_id, participant_id, participant_name)
      );

      -- 6. Event Attendance
      CREATE TABLE IF NOT EXISTS event_attendance (
        id VARCHAR(50) PRIMARY KEY,
        event_id VARCHAR(50) NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
        registration_id VARCHAR(50) REFERENCES event_registrations(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        participant_name VARCHAR(150) NOT NULL,
        attendance_status VARCHAR(30) NOT NULL DEFAULT 'PRESENT', -- PRESENT, ABSENT, LATE, EXCUSED
        check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        remarks TEXT
      );

      -- 7. Event Tasks
      CREATE TABLE IF NOT EXISTS event_tasks (
        id VARCHAR(50) PRIMARY KEY,
        event_id VARCHAR(50) NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        task_title VARCHAR(200) NOT NULL,
        description TEXT,
        assigned_to_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        assigned_to_name VARCHAR(100),
        department VARCHAR(100),
        deadline DATE,
        priority VARCHAR(20) DEFAULT 'MEDIUM',
        status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 8. School Holidays
      CREATE TABLE IF NOT EXISTS school_holidays (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) REFERENCES academic_sessions(id) ON DELETE SET NULL,
        name VARCHAR(150) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        holiday_type VARCHAR(50) NOT NULL DEFAULT 'SCHOOL', -- NATIONAL, STATE, SCHOOL, FESTIVAL, VACATION, EMERGENCY_CLOSURE, OTHER
        description TEXT,
        applicable_classes VARCHAR(255) DEFAULT 'ALL',
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 9. Academic Terms & Cycles
      CREATE TABLE IF NOT EXISTS academic_terms (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        term_name VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(30) DEFAULT 'ACTIVE', -- UPCOMING, ACTIVE, COMPLETED
        weightage_percentage NUMERIC(5, 2) DEFAULT 0.00,
        exam_start_date DATE,
        exam_end_date DATE,
        result_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 10. School Meetings
      CREATE TABLE IF NOT EXISTS school_meetings (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        meeting_type VARCHAR(50) NOT NULL DEFAULT 'STAFF', -- PRINCIPAL, STAFF, DEPARTMENT, PTM, MANAGEMENT, ACADEMIC, HR, DISCIPLINARY, ADMISSION, OTHER
        title VARCHAR(200) NOT NULL,
        description TEXT,
        organizer_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        organizer_name VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        start_time VARCHAR(20) NOT NULL,
        end_time VARCHAR(20) NOT NULL,
        venue_id VARCHAR(50) REFERENCES event_venues(id) ON DELETE SET NULL,
        venue_name VARCHAR(150),
        online_meeting_link TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED', -- DRAFT, SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, RESCHEDULED
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 11. Meeting Participants & RSVP
      CREATE TABLE IF NOT EXISTS meeting_participants (
        id VARCHAR(50) PRIMARY KEY,
        meeting_id VARCHAR(50) NOT NULL REFERENCES school_meetings(id) ON DELETE CASCADE,
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        participant_name VARCHAR(150) NOT NULL,
        participant_role VARCHAR(50) NOT NULL,
        email VARCHAR(150),
        phone VARCHAR(50),
        rsvp_status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, ACCEPTED, DECLINED, TENTATIVE
        attendance_status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, PRESENT, ABSENT
        rsvp_note TEXT
      );

      -- 12. Meeting Agendas
      CREATE TABLE IF NOT EXISTS meeting_agendas (
        id VARCHAR(50) PRIMARY KEY,
        meeting_id VARCHAR(50) NOT NULL REFERENCES school_meetings(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        responsible_person_name VARCHAR(100),
        priority VARCHAR(20) DEFAULT 'MEDIUM',
        status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, DISCUSSED, DEFERRED, COMPLETED
        order_index INT DEFAULT 0
      );

      -- 13. Meeting Minutes (MoM)
      CREATE TABLE IF NOT EXISTS meeting_minutes (
        id VARCHAR(50) PRIMARY KEY,
        meeting_id VARCHAR(50) NOT NULL REFERENCES school_meetings(id) ON DELETE CASCADE,
        recorded_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        recorded_by_name VARCHAR(100) NOT NULL,
        discussion_summary TEXT NOT NULL,
        decisions_taken TEXT,
        next_meeting_date DATE,
        attachments TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(meeting_id)
      );

      -- 14. Meeting Action Items
      CREATE TABLE IF NOT EXISTS meeting_action_items (
        id VARCHAR(50) PRIMARY KEY,
        meeting_id VARCHAR(50) REFERENCES school_meetings(id) ON DELETE SET NULL,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        task_description TEXT NOT NULL,
        assigned_to_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        assigned_to_name VARCHAR(100) NOT NULL,
        priority VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
        due_date DATE NOT NULL,
        status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED
        completion_date DATE,
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 15. Staff Appointment Availability
      CREATE TABLE IF NOT EXISTS staff_availability (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        staff_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        staff_name VARCHAR(100) NOT NULL,
        day_of_week VARCHAR(20) NOT NULL, -- MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY
        start_time VARCHAR(20) NOT NULL,
        end_time VARCHAR(20) NOT NULL,
        slot_duration_minutes INT DEFAULT 20,
        max_appointments_per_day INT DEFAULT 8,
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(school_id, staff_id, day_of_week)
      );

      -- 16. Appointments
      CREATE TABLE IF NOT EXISTS appointments (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        requester_type VARCHAR(50) NOT NULL DEFAULT 'PARENT', -- PARENT, VISITOR, STUDENT, STAFF
        requester_id VARCHAR(50),
        requester_name VARCHAR(150) NOT NULL,
        requester_contact VARCHAR(100) NOT NULL,
        staff_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        staff_name VARCHAR(100) NOT NULL,
        staff_role VARCHAR(50),
        purpose TEXT NOT NULL,
        appointment_date DATE NOT NULL,
        start_time VARCHAR(20) NOT NULL,
        duration_minutes INT DEFAULT 20,
        status VARCHAR(30) DEFAULT 'REQUESTED', -- REQUESTED, APPROVED, REJECTED, CONFIRMED, COMPLETED, CANCELLED, RESCHEDULED, NO_SHOW
        notes TEXT,
        rejection_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 17. Visitors Master Registry
      CREATE TABLE IF NOT EXISTS visitors (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        visitor_number VARCHAR(50) NOT NULL,
        name VARCHAR(150) NOT NULL,
        mobile VARCHAR(50) NOT NULL,
        email VARCHAR(100),
        organization VARCHAR(150),
        address TEXT,
        id_type VARCHAR(50) DEFAULT 'AADHAAR', -- AADHAAR, DRIVING_LICENSE, PAN, VOTER_ID, PASSPORT, OTHER
        id_number_masked VARCHAR(50),
        photo_url TEXT,
        visitor_type VARCHAR(50) NOT NULL DEFAULT 'PARENT', -- PARENT, VENDOR, GUEST, GOVT_OFFICIAL, SERVICE_PROVIDER, CANDIDATE, MANAGEMENT, DELIVERY, OTHER
        security_status VARCHAR(30) DEFAULT 'CLEARED', -- CLEARED, RESTRICTED, REQUIRES_APPROVAL, BLOCKED
        restriction_reason TEXT,
        restriction_updated_by VARCHAR(100),
        restriction_updated_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, visitor_number)
      );

      -- 18. Visitor Visits / Campus Access Log
      CREATE TABLE IF NOT EXISTS visitor_visits (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        visitor_id VARCHAR(50) NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
        visitor_name VARCHAR(150) NOT NULL,
        visitor_mobile VARCHAR(50) NOT NULL,
        visitor_type VARCHAR(50) NOT NULL,
        purpose TEXT NOT NULL,
        person_to_meet_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        person_to_meet_name VARCHAR(100) NOT NULL,
        department_to_visit VARCHAR(100),
        appointment_id VARCHAR(50) REFERENCES appointments(id) ON DELETE SET NULL,
        vehicle_number VARCHAR(50),
        entry_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        exit_time TIMESTAMP WITH TIME ZONE,
        pass_number VARCHAR(50) NOT NULL,
        pass_returned BOOLEAN DEFAULT FALSE,
        id_verified BOOLEAN DEFAULT TRUE,
        checked_in_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        checked_in_by_name VARCHAR(100) NOT NULL,
        checked_out_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        checked_out_by_name VARCHAR(100),
        status VARCHAR(30) DEFAULT 'INSIDE', -- INSIDE, CHECKED_OUT, PENDING_APPROVAL, REJECTED
        delivery_vendor VARCHAR(100),
        delivery_type VARCHAR(100),
        delivery_po_number VARCHAR(100),
        delivery_items TEXT,
        delivery_receiver_name VARCHAR(100),
        service_provider_company VARCHAR(100),
        service_asset_id VARCHAR(100),
        remarks TEXT,
        date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for performance & rapid search
      CREATE INDEX IF NOT EXISTS idx_cal_events_school ON calendar_events(school_id, start_datetime);
      CREATE INDEX IF NOT EXISTS idx_cal_events_type ON calendar_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_venue_bookings_conflict ON venue_bookings(venue_id, start_datetime, end_datetime);
      CREATE INDEX IF NOT EXISTS idx_meetings_school_date ON school_meetings(school_id, date);
      CREATE INDEX IF NOT EXISTS idx_action_items_school_due ON meeting_action_items(school_id, due_date, status);
      CREATE INDEX IF NOT EXISTS idx_appointments_school_date ON appointments(school_id, appointment_date, status);
      CREATE INDEX IF NOT EXISTS idx_visitors_school_mobile ON visitors(school_id, mobile);
      CREATE INDEX IF NOT EXISTS idx_visitor_visits_inside ON visitor_visits(school_id, status);
      CREATE INDEX IF NOT EXISTS idx_holidays_school_date ON school_holidays(school_id, start_date);
    `);

    // 2. Register Phase 15 Permissions in Permissions Matrix
    const phase15Permissions = [
      { id: 'administration.view', module: 'Administration', name: 'View Administration', desc: 'Access School Administration dashboard and daily schedule' },
      { id: 'calendar.view', module: 'Calendar', name: 'View School Calendar', desc: 'Inspect centralized master academic and school calendar' },
      { id: 'calendar.manage', module: 'Calendar', name: 'Manage Calendar', desc: 'Create and configure institutional calendar schedules' },
      { id: 'events.view', module: 'Events', name: 'View Events', desc: 'Browse campus events, competitions, workshops, and sports meets' },
      { id: 'events.create', module: 'Events', name: 'Create Events', desc: 'Schedule new events, configure audiences, budgets, and venues' },
      { id: 'events.edit', module: 'Events', name: 'Edit Events', desc: 'Modify event parameters, budgets, and tasks' },
      { id: 'events.delete', module: 'Events', name: 'Delete Events', desc: 'Cancel or archive calendar events' },
      { id: 'events.register', module: 'Events', name: 'Register for Events', desc: 'Register students, parents, or staff for events' },
      { id: 'events.attendance', module: 'Events', name: 'Mark Event Attendance', desc: 'Take attendance for registered event participants' },
      { id: 'holidays.view', module: 'Holidays', name: 'View Holidays', desc: 'View school calendar holidays and emergency closures' },
      { id: 'holidays.manage', module: 'Holidays', name: 'Manage Holidays', desc: 'Add or configure legal, regional, and school holidays' },
      { id: 'meetings.view', module: 'Meetings', name: 'View Meetings', desc: 'View staff, principal, department, and PTM meetings' },
      { id: 'meetings.create', module: 'Meetings', name: 'Create Meetings', desc: 'Schedule meetings and dispatch invitations to participants' },
      { id: 'meetings.edit', module: 'Meetings', name: 'Edit Meetings', desc: 'Reschedule meetings and modify agendas' },
      { id: 'meetings.delete', module: 'Meetings', name: 'Delete Meetings', desc: 'Cancel or archive meetings' },
      { id: 'meetings.minutes', module: 'Meetings', name: 'Record Minutes (MoM)', desc: 'Document discussion summaries, decisions, and action items' },
      { id: 'action_items.view', module: 'Action Items', name: 'View Action Items', desc: 'Track institutional administrative tasks and deadlines' },
      { id: 'action_items.manage', module: 'Action Items', name: 'Manage Action Items', desc: 'Assign and update status of action items' },
      { id: 'appointments.view', module: 'Appointments', name: 'View Appointments', desc: 'View appointments scheduled with staff and leadership' },
      { id: 'appointments.request', module: 'Appointments', name: 'Request Appointments', desc: 'Submit appointment requests with teachers and administration' },
      { id: 'appointments.manage', module: 'Appointments', name: 'Approve & Manage Appointments', desc: 'Review, approve, reschedule, or cancel appointments' },
      { id: 'visitors.view', module: 'Visitors', name: 'View Visitors & Log', desc: 'Access campus visitor log and occupancy registry' },
      { id: 'visitors.checkin', module: 'Visitors', name: 'Check-In Visitors', desc: 'Check in visitors, generate passes, and log deliveries' },
      { id: 'visitors.checkout', module: 'Visitors', name: 'Check-Out Visitors', desc: 'Process exit and retrieve visitor badges' },
      { id: 'visitors.manage', module: 'Visitors', name: 'Manage Visitors', desc: 'Configure visitor registry and service provider records' },
      { id: 'visitors.security', module: 'Visitors', name: 'Security & Blacklist', desc: 'Manage restricted visitor status and emergency campus list' },
      { id: 'venues.view', module: 'Venues', name: 'View Venues', desc: 'Inspect campus halls, labs, grounds, and conference rooms' },
      { id: 'venues.manage', module: 'Venues', name: 'Manage Venues & Bookings', desc: 'Book venues, detect overlaps, and handle booking overrides' }
    ];

    for (const p of phase15Permissions) {
      await db.query(`
        INSERT INTO permissions (id, module, name, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
      `, [p.id, p.module, p.name, p.desc]);
    }

    // Role Assignments
    // Super Admin & School Admin get all
    for (const p of phase15Permissions) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_super_admin', $1) ON CONFLICT DO NOTHING;`, [p.id]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_school_admin', $1) ON CONFLICT DO NOTHING;`, [p.id]);
    }

    // Principal
    const principalPerms = [
      'administration.view', 'calendar.view', 'calendar.manage', 'events.view', 'events.create', 'events.edit',
      'events.register', 'events.attendance', 'holidays.view', 'holidays.manage', 'meetings.view', 'meetings.create',
      'meetings.edit', 'meetings.minutes', 'action_items.view', 'action_items.manage', 'appointments.view',
      'appointments.manage', 'visitors.view', 'visitors.checkin', 'visitors.checkout', 'visitors.security',
      'venues.view', 'venues.manage'
    ];
    for (const pid of principalPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_principal', $1) ON CONFLICT DO NOTHING;`, [pid]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_vice_principal', $1) ON CONFLICT DO NOTHING;`, [pid]);
    }

    // Receptionist
    const receptionistPerms = [
      'administration.view', 'calendar.view', 'events.view', 'holidays.view', 'meetings.view',
      'appointments.view', 'appointments.manage', 'visitors.view', 'visitors.checkin', 'visitors.checkout',
      'visitors.manage', 'venues.view'
    ];
    for (const pid of receptionistPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_receptionist', $1) ON CONFLICT DO NOTHING;`, [pid]);
    }

    // Teachers
    const teacherPerms = [
      'administration.view', 'calendar.view', 'events.view', 'events.register', 'events.attendance',
      'holidays.view', 'meetings.view', 'action_items.view', 'appointments.view', 'appointments.manage', 'venues.view'
    ];
    for (const pid of teacherPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_teacher', $1) ON CONFLICT DO NOTHING;`, [pid]);
    }

    // Parents
    const parentPerms = ['calendar.view', 'events.view', 'holidays.view', 'appointments.request', 'appointments.view'];
    for (const pid of parentPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_parent', $1) ON CONFLICT DO NOTHING;`, [pid]);
    }

    // Students
    const studentPerms = ['calendar.view', 'events.view', 'holidays.view'];
    for (const pid of studentPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_student', $1) ON CONFLICT DO NOTHING;`, [pid]);
    }

    // Check if Phase 15 data is already seeded
    const chk = await db.query(`SELECT count(*) as cnt FROM event_venues WHERE school_id = 'sch_vvps'`);
    if (Number((chk.rows[0] as any)?.cnt || 0) > 0) {
      console.log('[DB] Phase 15 Administration schema verified and records already present.');
      return;
    }

    console.log('[DB] Seeding Phase 15 School Administration & Visitor Management records...');

    // 3. Seed Venues
    await db.exec(`
      INSERT INTO event_venues (
        id, school_id, name, code, capacity, location, facilities, status, contact_person
      ) VALUES
      (
        'ven_vvps_001', 'sch_vvps', 'Swami Vivekananda Memorial Auditorium', 'AUD-01',
        650, 'Academic Block A, Ground Floor', 'Dolby Sound System, Digital HD Projector, Motorized Stage Lighting, Central AC, Green Rooms',
        'AVAILABLE', 'Anand Kumar Jha (Coordinator)'
      ),
      (
        'ven_vvps_002', 'sch_vvps', 'Rabindranath Tagore Conference Hall', 'CONF-01',
        40, 'Administrative Wing, 1st Floor', 'Smart Interactive Flat Panel, Polycom Video Conferencing, High-Speed Wi-Fi, Executive Seating',
        'AVAILABLE', 'Dr. Sunita Mishra (Principal)'
      ),
      (
        'ven_vvps_003', 'sch_vvps', 'Sir C.V. Raman Science & STEM Innovation Lab', 'LAB-STEM',
        50, 'Science Block, 2nd Floor', '3D Printer, Robotic Workstations, Demonstration Fume Hood, Interactive Display',
        'AVAILABLE', 'Rakesh Sharma (Faculty)'
      ),
      (
        'ven_vvps_004', 'sch_vvps', 'Netaji Subhash Chandra Bose Sports Arena & Pavilion', 'GROUND-01',
        1200, 'Campus North Sector', 'Floodlights, Covered Spectator Stands, Public Address System, First Aid Room',
        'AVAILABLE', 'Mahendra Singh (Sports Director)'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 4. Seed School Holidays
    await db.exec(`
      INSERT INTO school_holidays (
        id, school_id, session_id, name, start_date, end_date, holiday_type, description, applicable_classes, status
      ) VALUES
      (
        'hol_vvps_001', 'sch_vvps', 'sess_vvps_2526', 'Republic Day of India',
        '2026-01-26', '2026-01-26', 'NATIONAL', 'National holiday celebration. Flag hoisting ceremony at 8:00 AM on campus grounds.',
        'ALL', 'ACTIVE'
      ),
      (
        'hol_vvps_002', 'sch_vvps', 'sess_vvps_2526', 'Holi Festival of Colors',
        '2026-03-04', '2026-03-05', 'FESTIVAL', 'Spring festival holidays for all day-scholars and boarding scholars.',
        'ALL', 'ACTIVE'
      ),
      (
        'hol_vvps_003', 'sch_vvps', 'sess_vvps_2526', 'Diwali & Chhath Puja Autumn Break',
        '2026-11-08', '2026-11-16', 'FESTIVAL', 'Extended autumn festival vacation for Diwali and Chhath Mahaparv.',
        'ALL', 'ACTIVE'
      ),
      (
        'hol_vvps_004', 'sch_vvps', 'sess_vvps_2526', 'Severe Cold Wave Emergency Closure',
        '2026-01-05', '2026-01-07', 'EMERGENCY_CLOSURE', 'District Magistrate advisory closure for Primary wing (Nursery to Class 5) due to dense fog.',
        'Primary Wing', 'ACTIVE'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 5. Seed Academic Terms
    await db.exec(`
      INSERT INTO academic_terms (
        id, school_id, session_id, term_name, start_date, end_date, status, weightage_percentage, exam_start_date, exam_end_date, result_date
      ) VALUES
      (
        'term_vvps_01', 'sch_vvps', 'sess_vvps_2526', 'Term 1 (Monsoon Term)',
        '2025-04-01', '2025-09-30', 'COMPLETED', 40.00,
        '2025-09-15', '2025-09-26', '2025-10-05'
      ),
      (
        'term_vvps_02', 'sch_vvps', 'sess_vvps_2526', 'Term 2 (Winter Term)',
        '2025-10-01', '2026-01-31', 'ACTIVE', 30.00,
        '2026-01-12', '2026-01-22', '2026-01-31'
      ),
      (
        'term_vvps_03', 'sch_vvps', 'sess_vvps_2526', 'Term 3 (Annual & Board Revision Term)',
        '2026-02-01', '2026-03-31', 'UPCOMING', 30.00,
        '2026-03-09', '2026-03-23', '2026-03-31'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 6. Seed Calendar Events
    await db.exec(`
      INSERT INTO calendar_events (
        id, school_id, session_id, title, description, event_type,
        start_datetime, end_datetime, venue_id, venue_name, organizer_id, organizer_name,
        department, target_audience, max_participants, registration_required,
        registration_deadline, status, estimated_budget, approved_budget, actual_expense
      ) VALUES
      (
        'evt_vvps_001', 'sch_vvps', 'sess_vvps_2526',
        'Annual Inter-School Science & AI Robotics Expo 2026',
        'State-level exhibition showcasing high-school robotics, environmental sensor arrays, and applied AI automation projects judged by NIT Jamshedpur faculty.',
        'COMPETITION',
        CURRENT_TIMESTAMP + INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '3 days 6 hours',
        'ven_vvps_001', 'Swami Vivekananda Memorial Auditorium', 'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)',
        'Department of Science & Technology', 'ALL', 300, true,
        CURRENT_TIMESTAMP + INTERVAL '2 days', 'PUBLISHED', 45000.00, 40000.00, 38500.00
      ),
      (
        'evt_vvps_002', 'sch_vvps', 'sess_vvps_2526',
        'CBSE Senior Secondary Athletics Meet & March Past',
        'Track and field events across 100m sprint, relay, long jump, and inter-house championship trophy ceremony.',
        'SPORTS_EVENT',
        CURRENT_TIMESTAMP + INTERVAL '7 days', CURRENT_TIMESTAMP + INTERVAL '7 days 8 hours',
        'ven_vvps_004', 'Netaji Subhash Chandra Bose Sports Arena & Pavilion', 'usr_super_admin', 'Mahendra Singh (Sports Director)',
        'Physical Education', 'STUDENTS', 500, true,
        CURRENT_TIMESTAMP + INTERVAL '5 days', 'PUBLISHED', 30000.00, 28000.00, 0.00
      ),
      (
        'evt_vvps_003', 'sch_vvps', 'sess_vvps_2526',
        'Term 2 Comprehensive Parent-Teacher Interaction & Progress Card Review',
        'One-on-one performance counseling sessions between subject educators and registered guardians to address individual academic targets.',
        'PARENT_MEETING',
        CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '1 day 5 hours',
        'ven_vvps_001', 'Swami Vivekananda Memorial Auditorium', 'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)',
        'Academic Council', 'PARENTS', 400, false,
        NULL, 'PUBLISHED', 8000.00, 7500.00, 6800.00
      ),
      (
        'evt_vvps_004', 'sch_vvps', 'sess_vvps_2526',
        'NEP 2020 Experiential Pedagogy Faculty Workshop',
        'Faculty professional enrichment training conducted by CBSE Master Trainers on competency-based evaluation frameworks.',
        'WORKSHOP',
        CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '4 hours',
        'ven_vvps_002', 'Rabindranath Tagore Conference Hall', 'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)',
        'Human Resources & Academics', 'TEACHERS', 50, true,
        CURRENT_TIMESTAMP - INTERVAL '4 days', 'COMPLETED', 15000.00, 15000.00, 14200.00
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 7. Seed Venue Bookings & Overlap Detection Baseline
    await db.exec(`
      INSERT INTO venue_bookings (
        id, school_id, venue_id, event_id, title, booked_by_id, booked_by_name,
        start_datetime, end_datetime, purpose, status
      ) VALUES
      (
        'vnb_vvps_001', 'sch_vvps', 'ven_vvps_001', 'evt_vvps_001',
        'Annual Inter-School Science & AI Robotics Expo 2026', 'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)',
        CURRENT_TIMESTAMP + INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '3 days 6 hours',
        'Keynote address, project stalls setup, and felicitation ceremony', 'CONFIRMED'
      ),
      (
        'vnb_vvps_002', 'sch_vvps', 'ven_vvps_004', 'evt_vvps_002',
        'CBSE Senior Secondary Athletics Meet & March Past', 'usr_super_admin', 'Mahendra Singh (Sports Director)',
        CURRENT_TIMESTAMP + INTERVAL '7 days', CURRENT_TIMESTAMP + INTERVAL '7 days 8 hours',
        'All outdoor field events, athlete heats, and victory stands', 'CONFIRMED'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 8. Seed Event Registrations & Event Attendance
    await db.exec(`
      INSERT INTO event_registrations (
        id, event_id, school_id, participant_id, participant_name, participant_type, participant_contact, class_name, status
      ) VALUES
      (
        'ereg_001', 'evt_vvps_001', 'sch_vvps', 'stu_vvps_001', 'Aarav Kumar', 'STUDENT', '+91 98351 22441', 'Class 10-A', 'REGISTERED'
      ),
      (
        'ereg_002', 'evt_vvps_001', 'sch_vvps', 'stu_vvps_002', 'Isha Patel', 'STUDENT', '+91 98351 22442', 'Class 10-A', 'REGISTERED'
      ),
      (
        'ereg_003', 'evt_vvps_001', 'sch_vvps', 'stu_vvps_003', 'Rohan Sharma', 'STUDENT', '+91 98351 22443', 'Class 10-B', 'REGISTERED'
      ),
      (
        'ereg_004', 'evt_vvps_004', 'sch_vvps', 'usr_teacher_vvps', 'Rakesh Sharma', 'STAFF', 'teacher.vvps@vidyavahini.edu.in', 'Faculty', 'REGISTERED'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    await db.exec(`
      INSERT INTO event_attendance (
        id, event_id, registration_id, school_id, participant_name, attendance_status, check_in_time, remarks
      ) VALUES
      (
        'eatt_001', 'evt_vvps_004', 'ereg_004', 'sch_vvps', 'Rakesh Sharma', 'PRESENT',
        CURRENT_TIMESTAMP - INTERVAL '2 days', 'Attended full session and completed workshop quiz.'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 9. Seed Event Tasks
    await db.exec(`
      INSERT INTO event_tasks (
        id, event_id, school_id, task_title, description, assigned_to_id, assigned_to_name, department, deadline, priority, status
      ) VALUES
      (
        'tsk_vvps_001', 'evt_vvps_001', 'sch_vvps', 'Arrange 30 High-Power Extension Cords & Power Strips',
        'Provide stable AC 230V outlets to each robotics demonstration kiosk in the auditorium.',
        'usr_super_admin', 'Manoj Soren (Campus Electrician)', 'Estate & Facilities',
        CURRENT_DATE + 2, 'HIGH', 'IN_PROGRESS'
      ),
      (
        'tsk_vvps_002', 'evt_vvps_001', 'sch_vvps', 'Print Mementos and Participation Certificates for 150 Delegates',
        'Verify spellings against registration database and collect signatures from Dr. Sunita Mishra.',
        'usr_teacher_vvps', 'Rakesh Sharma (Faculty)', 'Academics',
        CURRENT_DATE + 2, 'MEDIUM', 'PENDING'
      ),
      (
        'tsk_vvps_003', 'evt_vvps_001', 'sch_vvps', 'Reserve Guest House and Airport Shuttle for Chief Guest Dr. P. K. Sen',
        'Coordinate with transport desk for Vehicle JH-15-AB-1001 pickup at Deoghar Airport at 9:30 AM.',
        'usr_principal_vvps', 'Anand Kumar Jha (Coordinator)', 'Administration',
        CURRENT_DATE + 1, 'URGENT', 'IN_PROGRESS'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 10. Seed Meetings
    await db.exec(`
      INSERT INTO school_meetings (
        id, school_id, meeting_type, title, description, organizer_id, organizer_name,
        date, start_time, end_time, venue_id, venue_name, online_meeting_link, status
      ) VALUES
      (
        'mtg_vvps_001', 'sch_vvps', 'PRINCIPAL',
        'Senior Academic Council & Pre-Board Preparedness Review',
        'Evaluation of Term 1 syllabus completion, identification of slow learners for remedial clinic, and laboratory exam scheduling.',
        'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)',
        CURRENT_DATE, '10:30 AM', '11:45 AM',
        'ven_vvps_002', 'Rabindranath Tagore Conference Hall', 'https://meet.google.com/vvp-acad-rev', 'COMPLETED'
      ),
      (
        'mtg_vvps_002', 'sch_vvps', 'STAFF',
        'All-Staff Monthly Administrative & Safety Briefing',
        'Review of fire safety drill procedures, student bus escort duties, and winter sports day preparation.',
        'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)',
        CURRENT_DATE + 1, '02:00 PM', '03:15 PM',
        'ven_vvps_001', 'Swami Vivekananda Memorial Auditorium', NULL, 'CONFIRMED'
      ),
      (
        'mtg_vvps_003', 'sch_vvps', 'PTM',
        'Special Parent Interaction: Class 10 Board Counseling',
        'Guidance on stress management, CBSE sample paper distribution, and parent support strategies during revision months.',
        'usr_principal_vvps', 'Anand Kumar Jha (Coordinator)',
        CURRENT_DATE + 4, '10:00 AM', '12:30 PM',
        'ven_vvps_001', 'Swami Vivekananda Memorial Auditorium', NULL, 'SCHEDULED'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 11. Seed Meeting Participants & RSVP
    await db.exec(`
      INSERT INTO meeting_participants (
        id, meeting_id, user_id, participant_name, participant_role, email, rsvp_status, attendance_status
      ) VALUES
      (
        'mp_001', 'mtg_vvps_001', 'usr_principal_vvps', 'Dr. Sunita Mishra', 'Principal', 'principal.vvps@vidyavahini.edu.in', 'ACCEPTED', 'PRESENT'
      ),
      (
        'mp_002', 'mtg_vvps_001', 'usr_teacher_vvps', 'Rakesh Sharma', 'Senior Teacher', 'teacher.vvps@vidyavahini.edu.in', 'ACCEPTED', 'PRESENT'
      ),
      (
        'mp_003', 'mtg_vvps_001', 'usr_super_admin', 'Anand Kumar Jha', 'Senior Coordinator', 'admin@vidyavahini.edu.in', 'ACCEPTED', 'PRESENT'
      ),
      (
        'mp_004', 'mtg_vvps_002', 'usr_teacher_vvps', 'Rakesh Sharma', 'Senior Teacher', 'teacher.vvps@vidyavahini.edu.in', 'ACCEPTED', 'PENDING'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 12. Seed Meeting Agendas, Minutes of Meeting (MoM) & Action Items
    await db.exec(`
      INSERT INTO meeting_agendas (
        id, meeting_id, title, description, responsible_person_name, priority, status, order_index
      ) VALUES
      (
        'agd_001', 'mtg_vvps_001', 'Term 1 Subject Marks Review & Deficit Analysis',
        'Pinpoint chapters where average class scores fell below 65% in Mathematics and Physics.', 'Rakesh Sharma', 'HIGH', 'COMPLETED', 1
      ),
      (
        'agd_002', 'mtg_vvps_001', 'Remedial Doubt Clearing Schedule Finalization',
        'Allocate Period 7 on Tuesdays and Thursdays for targeted student clinics.', 'Dr. Sunita Mishra', 'MEDIUM', 'COMPLETED', 2
      ),
      (
        'agd_003', 'mtg_vvps_001', 'Science Lab Consumables & Reagents Re-stocking',
        'Verify inventory stocks with chemical supplier for Class 12 CBSE Board practicals.', 'Manoj Soren', 'MEDIUM', 'DISCUSSED', 3
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    await db.exec(`
      INSERT INTO meeting_minutes (
        id, meeting_id, recorded_by_id, recorded_by_name, discussion_summary, decisions_taken, next_meeting_date
      ) VALUES
      (
        'mom_vvps_001', 'mtg_vvps_001', 'usr_teacher_vvps', 'Rakesh Sharma',
        'The council analyzed the performance across Grade 10 sections. While English and Social Science demonstrated satisfactory 82% class mastery, Mathematics showed weaknesses in Triangles and Coordinate Geometry. Staff reviewed attendance correlation.',
        '1. Special after-school doubt clinics approved starting next Monday.\n2. Weekly 20-mark practice objective test scheduled every Friday.\n3. Laboratory practical sessions doubled for Batch A and Batch B.',
        CURRENT_DATE + 14
      )
      ON CONFLICT (meeting_id) DO NOTHING;
    `);

    await db.exec(`
      INSERT INTO meeting_action_items (
        id, meeting_id, school_id, task_description, assigned_to_id, assigned_to_name, priority, due_date, status, remarks
      ) VALUES
      (
        'act_vvps_001', 'mtg_vvps_001', 'sch_vvps',
        'Draft schedule roster for Grade 10 Math Remedial Clinics and issue circular to parents',
        'usr_teacher_vvps', 'Rakesh Sharma', 'HIGH',
        CURRENT_DATE + 3, 'IN_PROGRESS', 'Draft timetable prepared for 32 students'
      ),
      (
        'act_vvps_002', 'mtg_vvps_001', 'sch_vvps',
        'Verify Chemistry and Physics lab apparatus calibration for upcoming CBSE practical exam',
        'usr_super_admin', 'Anand Kumar Jha', 'MEDIUM',
        CURRENT_DATE + 7, 'PENDING', 'Awaiting glass test-tubes consignment delivery'
      ),
      (
        'act_vvps_003', 'mtg_vvps_001', 'sch_vvps',
        'Submit revised budget indent for Science Fair audio-visual rental setup',
        'usr_principal_vvps', 'Dr. Sunita Mishra', 'URGENT',
        CURRENT_DATE - 1, 'OVERDUE', 'Requires approval from School Management Committee'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 13. Seed Staff Availability & Appointments
    await db.exec(`
      INSERT INTO staff_availability (
        id, school_id, staff_id, staff_name, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments_per_day, is_active
      ) VALUES
      (
        'sav_001', 'sch_vvps', 'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)',
        'MONDAY', '02:00 PM', '04:00 PM', 20, 6, true
      ),
      (
        'sav_002', 'sch_vvps', 'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)',
        'THURSDAY', '02:00 PM', '04:00 PM', 20, 6, true
      ),
      (
        'sav_003', 'sch_vvps', 'usr_teacher_vvps', 'Rakesh Sharma (Math Faculty)',
        'FRIDAY', '03:00 PM', '04:30 PM', 15, 6, true
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    await db.exec(`
      INSERT INTO appointments (
        id, school_id, requester_type, requester_name, requester_contact, staff_id, staff_name, staff_role,
        purpose, appointment_date, start_time, duration_minutes, status, notes
      ) VALUES
      (
        'apt_vvps_001', 'sch_vvps', 'PARENT', 'Suresh Kumar (Parent of Aarav)', '+91 98351 22441',
        'usr_principal_vvps', 'Dr. Sunita Mishra', 'Principal',
        'Discussion regarding state robotics Olympiad sponsorship and leave authorization',
        CURRENT_DATE, '02:30 PM', 20, 'CONFIRMED', 'Parent requested to carry competition brochure'
      ),
      (
        'apt_vvps_002', 'sch_vvps', 'PARENT', 'Sunita Devi (Parent of Isha)', '+91 98351 22442',
        'usr_teacher_vvps', 'Rakesh Sharma', 'Senior Teacher',
        'Consultation regarding Mathematics term test marks and home tutoring advice',
        CURRENT_DATE + 1, '03:15 PM', 15, 'REQUESTED', 'Waiting for teacher confirmation'
      ),
      (
        'apt_vvps_003', 'sch_vvps', 'VISITOR', 'Vikramaditya Roy (Orient Blackswan Publisher)', '+91 98112 33445',
        'usr_principal_vvps', 'Dr. Sunita Mishra', 'Principal',
        'Presentation of 2026-27 CBSE specimen textbooks and digital pedagogical resources',
        CURRENT_DATE + 2, '03:00 PM', 30, 'APPROVED', 'Sample copies to be submitted at reception desk'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 14. Seed Visitors Master Registry
    await db.exec(`
      INSERT INTO visitors (
        id, school_id, visitor_number, name, mobile, email, organization, address,
        id_type, id_number_masked, photo_url, visitor_type, security_status, restriction_reason
      ) VALUES
      (
        'vis_vvps_001', 'sch_vvps', 'VIS-2026-101', 'Suresh Kumar', '+91 98351 22441',
        'suresh.kumar@gmail.com', 'Self-employed / Guardian', 'Castairs Town, Deoghar',
        'AADHAAR', 'XXXXXXXX4412', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        'PARENT', 'CLEARED', NULL
      ),
      (
        'vis_vvps_002', 'sch_vvps', 'VIS-2026-102', 'Rajeshwar Pandey', '+91 94311 00223',
        'r.pandey@cbse.nic.in', 'Central Board of Secondary Education', 'CBSE Regional Office, Patna',
        'GOVT_OFFICIAL', 'XXXXXXXX9081', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        'GOVT_OFFICIAL', 'CLEARED', 'CBSE Inspection Officer'
      ),
      (
        'vis_vvps_003', 'sch_vvps', 'VIS-2026-103', 'Alok Ranjan', '+91 93041 55667',
        'alok@aquaclean.co.in', 'AquaClean RO Water Systems', 'Industrial Area, Jasidih',
        'SERVICE_PROVIDER', 'XXXXXXXX3319', NULL,
        'SERVICE_PROVIDER', 'CLEARED', NULL
      ),
      (
        'vis_vvps_004', 'sch_vvps', 'VIS-2026-104', 'Amitabh Sengupta', '+91 94318 77661',
        'amitabh@bluedart.com', 'Blue Dart Express', 'Deoghar Main Hub',
        'DRIVING_LICENSE', 'XXXXXXXX1122', NULL,
        'DELIVERY', 'CLEARED', NULL
      ),
      (
        'vis_vvps_005', 'sch_vvps', 'VIS-2026-105', 'Devendra Yadav', '+91 91222 34455',
        NULL, 'Ex-contractor', 'Banka Road, Katoria',
        'VOTER_ID', 'XXXXXXXX7744', NULL,
        'VENDOR', 'RESTRICTED', 'Disputed cafeteria contractor: Entry requires written authorization from Estate Officer'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 15. Seed Visitor Visits & Campus Access Log
    await db.exec(`
      INSERT INTO visitor_visits (
        id, school_id, visitor_id, visitor_name, visitor_mobile, visitor_type,
        purpose, person_to_meet_id, person_to_meet_name, department_to_visit,
        appointment_id, vehicle_number, entry_time, exit_time, pass_number,
        pass_returned, id_verified, checked_in_by_id, checked_in_by_name, status,
        delivery_vendor, delivery_type, delivery_po_number, delivery_items, delivery_receiver_name,
        remarks, date
      ) VALUES
      (
        'vst_vvps_001', 'sch_vvps', 'vis_vvps_001', 'Suresh Kumar', '+91 98351 22441', 'PARENT',
        'Pre-scheduled appointment regarding student competition leave', 'usr_principal_vvps', 'Dr. Sunita Mishra', 'Principal Office',
        'apt_vvps_001', 'JH-15-C-4521', CURRENT_TIMESTAMP - INTERVAL '40 minutes', NULL, 'PASS-2026-081',
        false, true, 'usr_super_admin', 'Sunita Receptionist', 'INSIDE',
        NULL, NULL, NULL, NULL, NULL,
        'Visitor badge issued. Waiting in Administrative Lounge.', CURRENT_DATE
      ),
      (
        'vst_vvps_002', 'sch_vvps', 'vis_vvps_003', 'Alok Ranjan', '+91 93041 55667', 'SERVICE_PROVIDER',
        'Quarterly maintenance and filter replacement of Central RO drinking water plant', 'usr_super_admin', 'Manoj Soren (Electrician)', 'Estate & Maintenance',
        NULL, 'JH-15-T-8890', CURRENT_TIMESTAMP - INTERVAL '1 hour 15 minutes', NULL, 'PASS-2026-082',
        false, true, 'usr_super_admin', 'Sunita Receptionist', 'INSIDE',
        NULL, NULL, NULL, NULL, NULL,
        'Service technician carrying tool kit. Work permit signed.', CURRENT_DATE
      ),
      (
        'vst_vvps_003', 'sch_vvps', 'vis_vvps_004', 'Amitabh Sengupta', '+91 94318 77661', 'DELIVERY',
        'Delivery of CBSE Examination Sample Answer Books & Hologram Seals', 'usr_super_admin', 'Anand Kumar Jha (Coordinator)', 'Examination Department',
        NULL, 'JH-15-V-3312', CURRENT_TIMESTAMP - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours 25 minutes', 'PASS-2026-079',
        true, true, 'usr_super_admin', 'Sunita Receptionist', 'CHECKED_OUT',
        'Blue Dart Express', 'Urgent Examination Consignment', 'PO-VVPS-2026-044', '4 Sealed cartons with consignment note BD-882194', 'Anand Kumar Jha',
        'Delivery inspected, signature recorded on challan, badge returned.', CURRENT_DATE
      ),
      (
        'vst_vvps_004', 'sch_vvps', 'vis_vvps_002', 'Rajeshwar Pandey', '+91 94311 00223', 'GOVT_OFFICIAL',
        'Annual CBSE Institutional Affiliation & Infrastructure Spot Check', 'usr_principal_vvps', 'Dr. Sunita Mishra', 'Principal Office',
        NULL, 'BR-01-GA-9900', CURRENT_TIMESTAMP - INTERVAL '1 day 5 hours', CURRENT_TIMESTAMP - INTERVAL '1 day 1 hour', 'PASS-2026-075',
        true, true, 'usr_super_admin', 'Sunita Receptionist', 'CHECKED_OUT',
        NULL, NULL, NULL, NULL, NULL,
        'Inspection completed. Official visit log signed in visitor register.', CURRENT_DATE - 1
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('[DB] Phase 15 School Administration, Calendar, Events, Meetings & Visitor Management initialized and seeded successfully.');
  } catch (err: any) {
    (globalThis as any).__phase15Error = err?.message || String(err);
    console.error('[DB PHASE 15 INIT ERROR]', err);
  }
}
