import type { PGlite } from '@electric-sql/pglite';

export async function ensurePhase14SchemaAndData(db: PGlite) {
  try {
    console.log('[DB] Ensuring Phase 14 Communication, Notification & Parent Engagement System schema...');

    // 1. Core Communication, Notification & Engagement Tables
    await db.exec(`
      -- 1. Centralized Notifications
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'General',
        priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
        related_module VARCHAR(50),
        related_entity_id VARCHAR(100),
        action_link VARCHAR(255),
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 2. School Announcements
      CREATE TABLE IF NOT EXISTS announcements (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) REFERENCES academic_sessions(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        audience_type VARCHAR(50) NOT NULL DEFAULT 'ALL',
        target_class_id VARCHAR(50) REFERENCES classes(id) ON DELETE SET NULL,
        target_section_id VARCHAR(50) REFERENCES sections(id) ON DELETE SET NULL,
        target_department VARCHAR(100),
        priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
        status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
        publish_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expiry_date TIMESTAMP WITH TIME ZONE,
        attachment_url TEXT,
        attachment_name VARCHAR(255),
        requires_acknowledgement BOOLEAN DEFAULT FALSE,
        is_emergency BOOLEAN DEFAULT FALSE,
        author_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        author_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 3. Formal School Circulars
      CREATE TABLE IF NOT EXISTS circulars (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) REFERENCES academic_sessions(id) ON DELETE SET NULL,
        circular_number VARCHAR(100) NOT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        issued_by VARCHAR(150) NOT NULL,
        department VARCHAR(100),
        target_audience VARCHAR(50) DEFAULT 'ALL',
        publish_date DATE NOT NULL,
        expiry_date DATE,
        attachment_url TEXT,
        requires_acknowledgement BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'PUBLISHED',
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_circular_number UNIQUE(school_id, circular_number)
      );

      -- 4. Notice Board
      CREATE TABLE IF NOT EXISTS notice_board (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        category VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        target_audience VARCHAR(50) DEFAULT 'ALL',
        target_class_id VARCHAR(50) REFERENCES classes(id) ON DELETE SET NULL,
        priority VARCHAR(20) DEFAULT 'NORMAL',
        is_pinned BOOLEAN DEFAULT FALSE,
        posted_date DATE NOT NULL,
        expires_on DATE,
        posted_by_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 5. Conversations (Internal Messaging Threads)
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        subject VARCHAR(200) NOT NULL,
        type VARCHAR(50) DEFAULT 'PARENT_TEACHER',
        student_id VARCHAR(50) REFERENCES students(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_by_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_by_name VARCHAR(100) NOT NULL,
        last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 6. Conversation Participants
      CREATE TABLE IF NOT EXISTS conversation_participants (
        id VARCHAR(50) PRIMARY KEY,
        conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_name VARCHAR(100) NOT NULL,
        user_role VARCHAR(50) NOT NULL,
        unread_count INT DEFAULT 0,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_conv_participant UNIQUE(conversation_id, user_id)
      );

      -- 7. Communication Messages
      CREATE TABLE IF NOT EXISTS communication_messages (
        id VARCHAR(50) PRIMARY KEY,
        conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sender_name VARCHAR(100) NOT NULL,
        sender_role VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        attachment_url TEXT,
        attachment_name VARCHAR(255),
        status VARCHAR(20) DEFAULT 'SENT',
        is_edited BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 8. Scheduled Messages
      CREATE TABLE IF NOT EXISTS scheduled_messages (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        channel VARCHAR(30) DEFAULT 'IN_APP',
        audience_type VARCHAR(50) NOT NULL,
        target_class_id VARCHAR(50) REFERENCES classes(id) ON DELETE SET NULL,
        subject VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'NORMAL',
        scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(20) DEFAULT 'SCHEDULED',
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_by_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 9. Notification Templates
      CREATE TABLE IF NOT EXISTS notification_templates (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        channel VARCHAR(30) DEFAULT 'IN_APP',
        subject_template VARCHAR(200),
        body_template TEXT NOT NULL,
        variables TEXT DEFAULT '[]',
        is_system BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_notif_template UNIQUE(school_id, code)
      );

      -- 10. Notification Queue & Delivery Log
      CREATE TABLE IF NOT EXISTS notification_queue (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        channel VARCHAR(30) NOT NULL DEFAULT 'IN_APP',
        recipient_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        recipient_address VARCHAR(200),
        template_code VARCHAR(50),
        payload TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'NORMAL',
        idempotency_key VARCHAR(100) UNIQUE,
        status VARCHAR(20) DEFAULT 'SENT',
        attempt_count INT DEFAULT 1,
        error_message TEXT,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 11. Acknowledgements
      CREATE TABLE IF NOT EXISTS acknowledgements (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_name VARCHAR(100) NOT NULL,
        user_role VARCHAR(50) NOT NULL,
        acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        remarks TEXT,
        CONSTRAINT uq_acknowledgement UNIQUE(entity_type, entity_id, user_id)
      );

      -- 12. Polls & Surveys
      CREATE TABLE IF NOT EXISTS communication_polls (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        audience_type VARCHAR(50) DEFAULT 'ALL',
        target_class_id VARCHAR(50) REFERENCES classes(id) ON DELETE SET NULL,
        is_anonymous BOOLEAN DEFAULT FALSE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_by_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS communication_poll_options (
        id VARCHAR(50) PRIMARY KEY,
        poll_id VARCHAR(50) NOT NULL REFERENCES communication_polls(id) ON DELETE CASCADE,
        option_text VARCHAR(200) NOT NULL,
        sort_order INT DEFAULT 0,
        votes_count INT DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS communication_poll_votes (
        id VARCHAR(50) PRIMARY KEY,
        poll_id VARCHAR(50) NOT NULL REFERENCES communication_polls(id) ON DELETE CASCADE,
        option_id VARCHAR(50) NOT NULL REFERENCES communication_poll_options(id) ON DELETE CASCADE,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        voted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_poll_user_vote UNIQUE(poll_id, user_id)
      );

      -- 13. Feedback Submissions
      CREATE TABLE IF NOT EXISTS feedback_submissions (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        category VARCHAR(50) NOT NULL,
        subject VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'NORMAL',
        submitted_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        submitted_by_name VARCHAR(100),
        submitted_by_role VARCHAR(50),
        status VARCHAR(30) DEFAULT 'NEW',
        assigned_to_name VARCHAR(100),
        resolution_notes TEXT,
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 14. Grievance Management
      CREATE TABLE IF NOT EXISTS grievances (
        id VARCHAR(50) PRIMARY KEY,
        ticket_number VARCHAR(50) NOT NULL UNIQUE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        assigned_department VARCHAR(100) NOT NULL,
        subject VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'HIGH',
        submitted_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        submitted_by_name VARCHAR(100),
        submitted_by_role VARCHAR(50),
        status VARCHAR(30) DEFAULT 'NEW',
        assigned_officer_name VARCHAR(100),
        internal_notes TEXT,
        resolution TEXT,
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 15. User Notification Preferences
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        in_app_enabled BOOLEAN DEFAULT TRUE,
        email_enabled BOOLEAN DEFAULT FALSE,
        sms_enabled BOOLEAN DEFAULT FALSE,
        whatsapp_enabled BOOLEAN DEFAULT FALSE,
        push_enabled BOOLEAN DEFAULT FALSE,
        emergency_override BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_notif_pref UNIQUE(user_id, school_id)
      );

      -- Indexes for High-Traffic Queries
      CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);
      CREATE INDEX IF NOT EXISTS idx_notif_school ON notifications(school_id);
      CREATE INDEX IF NOT EXISTS idx_ann_school_pub ON announcements(school_id, status, publish_date);
      CREATE INDEX IF NOT EXISTS idx_circ_school ON circulars(school_id, publish_date);
      CREATE INDEX IF NOT EXISTS idx_notice_school_cat ON notice_board(school_id, category);
      CREATE INDEX IF NOT EXISTS idx_conv_user ON conversation_participants(user_id);
      CREATE INDEX IF NOT EXISTS idx_msg_conv ON communication_messages(conversation_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_sched_msg ON scheduled_messages(school_id, status, scheduled_for);
    `);

    // 2. Register Phase 14 RBAC Permissions
    const phase14Permissions = [
      { id: 'communication.view', module: 'Communication', name: 'View Communication & Dashboard', desc: 'Inspect communication metrics, announcements and inbox' },
      { id: 'communication.send', module: 'Communication', name: 'Send Messages', desc: 'Compose and dispatch internal messages' },
      { id: 'communication.class.send', module: 'Communication', name: 'Send Class Communication', desc: 'Send announcements and updates to assigned class sections' },
      { id: 'communication.parent.send', module: 'Communication', name: 'Communicate with Parents', desc: 'Send student academic updates and alerts to linked parents' },
      { id: 'communication.staff.send', module: 'Communication', name: 'Communicate with Staff', desc: 'Send department memos and staff announcements' },
      { id: 'communication.announcements.manage', module: 'Communication', name: 'Manage Announcements', desc: 'Create, schedule, publish and expire school announcements' },
      { id: 'communication.circulars.manage', module: 'Communication', name: 'Manage Circulars', desc: 'Issue formal institutional circulars and track acknowledgements' },
      { id: 'communication.notices.manage', module: 'Communication', name: 'Manage Notice Boards', desc: 'Post and pin notices across digital notice categories' },
      { id: 'communication.emergency.broadcast', module: 'Communication', name: 'Emergency Broadcast', desc: 'Dispatch priority emergency broadcasts to whole campus' },
      { id: 'communication.templates.manage', module: 'Communication', name: 'Manage Templates', desc: 'Configure automated notification message templates' },
      { id: 'communication.reports.view', module: 'Communication', name: 'View Delivery Reports', desc: 'Inspect message audit trail and delivery analytics' },
      { id: 'communication.feedback.manage', module: 'Communication', name: 'Manage Feedback', desc: 'Review, assign and resolve parent/staff feedback' },
      { id: 'communication.grievances.manage', module: 'Communication', name: 'Manage Grievances', desc: 'Investigate, track and close confidential grievances' },
      { id: 'notifications.view', module: 'Communication', name: 'View Notifications', desc: 'Access in-app notification bell and notifications center' },
      { id: 'notifications.manage', module: 'Communication', name: 'Manage Notifications', desc: 'Configure notification preferences and delivery queue' }
    ];

    for (const p of phase14Permissions) {
      await db.query(`
        INSERT INTO permissions (id, module, name, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
      `, [p.id, p.module, p.name, p.desc]);

      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_super_admin', $1) ON CONFLICT DO NOTHING;`, [p.id]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_school_admin', $1) ON CONFLICT DO NOTHING;`, [p.id]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_principal', $1) ON CONFLICT DO NOTHING;`, [p.id]);
    }

    // Teacher permissions
    const teacherPerms = [
      'communication.view',
      'communication.send',
      'communication.class.send',
      'communication.parent.send',
      'communication.notices.manage',
      'communication.feedback.manage',
      'notifications.view'
    ];
    for (const pid of teacherPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_teacher', $1) ON CONFLICT DO NOTHING;`, [pid]);
    }

    // Staff/Accountant permissions
    const staffPerms = [
      'communication.view',
      'communication.send',
      'notifications.view'
    ];
    for (const pid of staffPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_accountant', $1) ON CONFLICT DO NOTHING;`, [pid]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_receptionist', $1) ON CONFLICT DO NOTHING;`, [pid]);
    }

    // Check if Phase 14 is already seeded
    const chk = await db.query(`SELECT count(*) as cnt FROM announcements WHERE school_id = 'sch_vvps'`);
    if (Number((chk.rows[0] as any)?.cnt || 0) > 0) {
      console.log('[DB] Phase 14 Communication schema verified and records already present.');
      return;
    }

    console.log('[DB] Seeding Phase 14 Communication & Parent Engagement System records...');

    // 3. Seed Announcements
    await db.exec(`
      INSERT INTO announcements (
        id, school_id, session_id, title, description, audience_type,
        target_class_id, priority, status, publish_date, expiry_date,
        requires_acknowledgement, is_emergency, author_name
      ) VALUES
      (
        'ann_vvps_001', 'sch_vvps', 'sess_vvps_2526',
        'Annual Inter-School CBSE Science & Technology Exhibition 2026',
        'We are thrilled to announce that Vivekananda Vidya Peeth will host the Regional CBSE InnoVate Science Conclave on 14th November 2026. Student innovators from Classes 6 to 12 are invited to register prototypes and working models by 30th October.',
        'ALL', null, 'IMPORTANT', 'PUBLISHED', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '20 days',
        false, false, 'Dr. Sunita Mishra (Principal)'
      ),
      (
        'ann_vvps_002', 'sch_vvps', 'sess_vvps_2526',
        'Winter Term Remedial Coaching Clinics for Class 10 & 12 Board Aspirants',
        'Special evening subject doubt-clearing sessions in Mathematics, Physics, and Accountancy commence from next Monday at 3:30 PM. Attendance is strongly recommended for all enrolled Board candidates.',
        'STUDENTS', 'cls_vvps_3', 'NORMAL', 'PUBLISHED', CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP + INTERVAL '15 days',
        false, false, 'Anand Kumar Jha (Academic Coordinator)'
      ),
      (
        'ann_vvps_003', 'sch_vvps', 'sess_vvps_2526',
        'URGENT: School Weather Advisory & Revised Morning Bell Timings',
        'In view of severe cold wave directives issued by the Directorate of Education, school arrival timings are deferred by 45 minutes to 8:15 AM effective tomorrow. Bus pickup schedules are adjusted accordingly.',
        'PARENTS', null, 'EMERGENCY', 'PUBLISHED', CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP + INTERVAL '7 days',
        true, true, 'Office of the Principal'
      ),
      (
        'ann_vvps_004', 'sch_vvps', 'sess_vvps_2526',
        'Staff Professional Development Workshop on NEP 2020 Pedagogical Frameworks',
        'Mandatory faculty enrichment workshop on multidisciplinary experiential pedagogy scheduled for this Saturday, 10:00 AM in the Central Auditorium.',
        'STAFF', null, 'NORMAL', 'PUBLISHED', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '5 days',
        false, false, 'Dr. Sunita Mishra (Principal)'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 4. Seed Circulars
    await db.exec(`
      INSERT INTO circulars (
        id, school_id, session_id, circular_number, title, content,
        issued_by, department, target_audience, publish_date, expiry_date,
        requires_acknowledgement, status
      ) VALUES
      (
        'circ_vvps_001', 'sch_vvps', 'sess_vvps_2526', 'VVPS/CIR/2026/042',
        'Mandatory 75% CBSE Attendance Compliance and Term Examination Eligibility',
        'Per Central Board of Secondary Education Examination Byelaws (Rule 13), students must maintain a minimum of 75% verified biometric/register attendance to qualify for Term Final Assessments. Parents are requested to review attendance records in the portal.',
        'Dr. Sunita Mishra, Principal', 'Academic Council', 'PARENTS',
        '2026-10-15', '2026-11-30', true, 'PUBLISHED'
      ),
      (
        'circ_vvps_002', 'sch_vvps', 'sess_vvps_2526', 'VVPS/CIR/2026/043',
        'Quarter 3 Fee Instalment Schedule and Digital Payment Advisory',
        'The third quarter tuition and institutional transportation instalments for Academic Year 2025-26 fall due on 10th November 2026. Parents are encouraged to utilize the digital fee counter or payment gateway to avoid late surcharge.',
        'S. K. Verma, Finance Officer', 'Accounts & Finance', 'PARENTS',
        '2026-10-18', '2026-11-15', false, 'PUBLISHED'
      ),
      (
        'circ_vvps_003', 'sch_vvps', 'sess_vvps_2526', 'VVPS/CIR/2026/044',
        'Campus Transport Safety Protocols & Dedicated Route Discipline',
        'All transport-enrolled students must carry institutional RFID bus passes and strictly adhere to boarding safety guidelines. Pickup points and designated marshals are available in the transport module.',
        'Col. Rajesh Rathore (Retd.), Transport In-charge', 'Transport & Fleet', 'ALL',
        '2026-10-20', '2026-12-31', true, 'PUBLISHED'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 5. Seed Notice Board
    await db.exec(`
      INSERT INTO notice_board (
        id, school_id, category, title, content, target_audience, priority, is_pinned, posted_date, posted_by_name
      ) VALUES
      (
        'not_vvps_001', 'sch_vvps', 'EXAMINATION',
        'Half-Yearly Examination Official Answer Key & Re-Evaluation Window',
        'Official subject answer scripts and marking schemes are open for classroom verification until Friday. Re-totaling requests may be submitted through the Examination Desk.',
        'STUDENTS', 'IMPORTANT', true, '2026-10-22', 'Examination Controller'
      ),
      (
        'not_vvps_002', 'sch_vvps', 'FEE',
        'Early Bird Concession for Annual Scholarship Examination Intake',
        'Merit scholarship concessions are now updated on student fee ledgers. Parents may inspect the updated receipt register.',
        'PARENTS', 'NORMAL', false, '2026-10-21', 'Accounts Desk'
      ),
      (
        'not_vvps_003', 'sch_vvps', 'HOLIDAY',
        'Diwali & Chhath Puja Institutional Vacation Announcement',
        'The school premises and administrative desks will observe festive holidays from 31st October to 5th November 2026. Normal academic timetables resume on 6th November.',
        'ALL', 'NORMAL', true, '2026-10-20', 'Administration'
      ),
      (
        'not_vvps_004', 'sch_vvps', 'TRANSPORT',
        'Route 4 (Dwarka Sector 12 - 21) Timetable Adjustment',
        'Morning pickup timing for Bus #4 is advanced by 10 minutes due to city metro construction work on Main Sector Road.',
        'PARENTS', 'IMPORTANT', false, '2026-10-22', 'Fleet Supervisor'
      ),
      (
        'not_vvps_005', 'sch_vvps', 'HOSTEL',
        'Hostel Evening Study Hours and Library Access Extended',
        'Hostel resident scholars may utilize the Central Digital Library until 9:30 PM under resident teacher supervision during assessment weeks.',
        'ALL', 'NORMAL', false, '2026-10-19', 'Hostel Warden'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 6. Seed Internal Conversations (Parent-Teacher & Staff)
    await db.exec(`
      INSERT INTO conversations (
        id, school_id, subject, type, student_id, status, created_by_id, created_by_name, last_message_at
      ) VALUES
      (
        'conv_vvps_001', 'sch_vvps',
        'Aarav Kumar - Mathematics Olympiad Mentorship & Progress',
        'PARENT_TEACHER', 'stu_vvps_001', 'ACTIVE', 'usr_teacher_vvps', 'Anand Kumar Jha (Class Teacher)',
        CURRENT_TIMESTAMP - INTERVAL '2 hours'
      ),
      (
        'conv_vvps_002', 'sch_vvps',
        'Bus Route Stop Relocation Request for Kabir Das',
        'GENERAL', 'stu_vvps_008', 'ACTIVE', 'usr_super_admin', 'Rajesh Das (Parent)',
        CURRENT_TIMESTAMP - INTERVAL '1 day'
      ),
      (
        'conv_vvps_003', 'sch_vvps',
        'Term 2 Departmental Lesson Plans & Science Lab Equipment Requisition',
        'PRINCIPAL_TEACHER', null, 'ACTIVE', 'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)',
        CURRENT_TIMESTAMP - INTERVAL '5 hours'
      )
      ON CONFLICT (id) DO NOTHING;

      -- Participants
      INSERT INTO conversation_participants (id, conversation_id, user_id, user_name, user_role, unread_count)
      VALUES
        ('cp_01_1', 'conv_vvps_001', 'usr_teacher_vvps', 'Anand Kumar Jha', 'teacher', 0),
        ('cp_01_2', 'conv_vvps_001', 'usr_super_admin', 'Mr. Ramesh Kumar (Parent)', 'parent', 1),
        ('cp_02_1', 'conv_vvps_002', 'usr_super_admin', 'Rajesh Das', 'parent', 0),
        ('cp_02_2', 'conv_vvps_002', 'usr_principal_vvps', 'Dr. Sunita Mishra', 'principal', 1),
        ('cp_03_1', 'conv_vvps_003', 'usr_principal_vvps', 'Dr. Sunita Mishra', 'principal', 0),
        ('cp_03_2', 'conv_vvps_003', 'usr_teacher_vvps', 'Anand Kumar Jha', 'teacher', 0)
      ON CONFLICT (id) DO NOTHING;

      -- Messages
      INSERT INTO communication_messages (
        id, conversation_id, sender_id, sender_name, sender_role, message, status, created_at
      ) VALUES
      (
        'msg_01_1', 'conv_vvps_001', 'usr_teacher_vvps', 'Anand Kumar Jha', 'teacher',
        'Respected Parent, Aarav has demonstrated exceptional mathematical intuition in our geometry modules. We would like to nominate him for the State Math Olympiad.',
        'READ', CURRENT_TIMESTAMP - INTERVAL '1 day'
      ),
      (
        'msg_01_2', 'conv_vvps_001', 'usr_super_admin', 'Mr. Ramesh Kumar (Parent)', 'parent',
        'Thank you Anand Sir! We are thrilled to hear this. Please let us know the registration procedure and extra study material needed.',
        'READ', CURRENT_TIMESTAMP - INTERVAL '18 hours'
      ),
      (
        'msg_01_3', 'conv_vvps_001', 'usr_teacher_vvps', 'Anand Kumar Jha', 'teacher',
        'I have uploaded the sample papers in the Classroom study material folder. He can practice 2 problem sets daily after school.',
        'DELIVERED', CURRENT_TIMESTAMP - INTERVAL '2 hours'
      ),
      (
        'msg_02_1', 'conv_vvps_002', 'usr_super_admin', 'Rajesh Das', 'parent',
        'Dear School Admin, We have relocated our residence to Sector 18, Block C. Kindly update Kabir transport stop from Gate 2 to the new Sector 18 roundabout.',
        'READ', CURRENT_TIMESTAMP - INTERVAL '1 day'
      ),
      (
        'msg_02_2', 'conv_vvps_002', 'usr_principal_vvps', 'Dr. Sunita Mishra', 'principal',
        'Request noted and forwarded to Transport Supervisor. The updated route will reflect in the portal by tomorrow morning.',
        'SENT', CURRENT_TIMESTAMP - INTERVAL '10 hours'
      ),
      (
        'msg_03_1', 'conv_vvps_003', 'usr_principal_vvps', 'Dr. Sunita Mishra', 'principal',
        'Dear Anand, please ensure that all science practical lesson plans for Term 2 align with the new laboratory apparatus received this week.',
        'READ', CURRENT_TIMESTAMP - INTERVAL '8 hours'
      ),
      (
        'msg_03_2', 'conv_vvps_003', 'usr_teacher_vvps', 'Anand Kumar Jha', 'teacher',
        'Yes respected Maam, the physics and chemistry teachers have updated the syllabus schedules accordingly.',
        'READ', CURRENT_TIMESTAMP - INTERVAL '5 hours'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 7. Seed Centralized In-App Notifications
    await db.exec(`
      INSERT INTO notifications (
        id, school_id, user_id, title, message, category, priority, related_module, action_link, is_read, created_at
      ) VALUES
      (
        'notif_001', 'sch_vvps', 'usr_super_admin',
        'Official Exam Results Published: Half-Yearly Exam 2025-26',
        'Report cards for Half-Yearly Assessments are now compiled and certified. Kabir Das secured Rank 1 with 94.0%.',
        'Examination', 'HIGH', 'exams', '/exams', false, CURRENT_TIMESTAMP - INTERVAL '2 hours'
      ),
      (
        'notif_002', 'sch_vvps', 'usr_super_admin',
        'Quarter 3 Fee Instalment Reminder',
        'Fee dues of ₹12,500.00 for Term 3 are due on 10th November 2026. Download official receipt after online clearing.',
        'Fees', 'IMPORTANT', 'fees', '/fees', false, CURRENT_TIMESTAMP - INTERVAL '4 hours'
      ),
      (
        'notif_003', 'sch_vvps', 'usr_super_admin',
        'Daily Attendance Summary: 100% Present',
        'Student Aarav Kumar marked PRESENT for all 7 scheduled classroom periods today.',
        'Attendance', 'NORMAL', 'attendance', '/attendance', true, CURRENT_TIMESTAMP - INTERVAL '1 day'
      ),
      (
        'notif_004', 'sch_vvps', 'usr_super_admin',
        'School Winter Timetable Update',
        'Morning arrival timings deferred to 8:15 AM due to cold wave advisory. Transport bus schedules updated.',
        'Emergency', 'EMERGENCY', 'communication', '/communication', false, CURRENT_TIMESTAMP - INTERVAL '30 minutes'
      ),
      (
        'notif_005', 'sch_vvps', 'usr_super_admin',
        'Transport Fleet Alert: Bus #4 Maintenance Check Complete',
        'Vehicle DL-1P-4502 routine fitness inspection cleared. GPS tracking active.',
        'Transport', 'NORMAL', 'transport', '/transport', true, CURRENT_TIMESTAMP - INTERVAL '2 days'
      ),
      (
        'notif_006', 'sch_vvps', 'usr_super_admin',
        'Library Overdue Reminder: Concepts of Physics Vol 1',
        'Book due date is 25th October 2026. Please renew online or return to Central Library desk.',
        'Library', 'NORMAL', 'library', '/library', false, CURRENT_TIMESTAMP - INTERVAL '1 day'
      ),
      (
        'notif_007', 'sch_vvps', 'usr_teacher_vvps',
        'Teacher Homework Review Notification',
        '5 students from Class 1 Section A submitted their Mathematics worksheet on Triangles.',
        'Homework', 'NORMAL', 'classroom', '/classroom', false, CURRENT_TIMESTAMP - INTERVAL '3 hours'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 8. Seed Notification Templates
    await db.exec(`
      INSERT INTO notification_templates (
        id, school_id, code, name, category, channel, subject_template, body_template, variables, is_system
      ) VALUES
      (
        'tmpl_001', 'sch_vvps', 'FEE_DUE_REMINDER', 'Fee Due Notice', 'FEES', 'IN_APP',
        'Fee Reminder for {{student_name}} - {{school_name}}',
        'Dear Parent, the fee instalment of Rs. {{amount}} for {{student_name}} (Class {{class_name}}) is due on {{due_date}}. Kindly clear the dues via online portal.',
        '["student_name", "class_name", "amount", "due_date", "school_name"]', true
      ),
      (
        'tmpl_002', 'sch_vvps', 'ATTENDANCE_ABSENT_ALERT', 'Student Absence Notice', 'ATTENDANCE', 'IN_APP',
        'Absence Alert: {{student_name}} - {{school_name}}',
        'Dear Parent, {{student_name}} of Class {{class_name}} has been marked ABSENT on {{attendance_date}}. If this is an authorized leave, please submit leave application in the portal.',
        '["student_name", "class_name", "attendance_date", "school_name"]', true
      ),
      (
        'tmpl_003', 'sch_vvps', 'EXAM_RESULT_PUBLISHED', 'Result Publication Notice', 'EXAMS', 'IN_APP',
        'Results Announced: {{exam_name}} - {{school_name}}',
        'Official scorecards for {{exam_name}} have been certified. {{student_name}} scored {{percentage}}% (Grade {{grade}}). Download official CBSE Report Card PDF.',
        '["student_name", "exam_name", "percentage", "grade", "school_name"]', true
      ),
      (
        'tmpl_004', 'sch_vvps', 'HOMEWORK_ASSIGNED', 'New Homework Assignment', 'HOMEWORK', 'IN_APP',
        'New Assignment in {{subject_name}} - Class {{class_name}}',
        'Homework on {{homework_title}} has been published by {{teacher_name}}. Submission due date: {{due_date}}.',
        '["subject_name", "class_name", "homework_title", "teacher_name", "due_date"]', true
      ),
      (
        'tmpl_005', 'sch_vvps', 'TRANSPORT_DELAY_ALERT', 'Bus Delay Advisory', 'TRANSPORT', 'IN_APP',
        'Transport Route Update: Bus {{route_number}}',
        'Due to heavy traffic at {{location}}, Bus {{route_number}} is running approximately {{delay_minutes}} minutes behind schedule. GPS tracking is live.',
        '["route_number", "location", "delay_minutes"]', true
      ),
      (
        'tmpl_006', 'sch_vvps', 'EMERGENCY_BROADCAST', 'Emergency Campus Broadcast', 'EMERGENCY', 'IN_APP',
        'EMERGENCY ADVISORY: {{school_name}}',
        'URGENT NOTICE: {{broadcast_message}}. All parents and transport marshals are requested to take note.',
        '["school_name", "broadcast_message"]', true
      )
      ON CONFLICT (school_id, code) DO NOTHING;
    `);

    // 9. Seed Communication Polls
    await db.exec(`
      INSERT INTO communication_polls (
        id, school_id, question, audience_type, start_date, end_date, is_active, created_by_name
      ) VALUES
      (
        'poll_vvps_001', 'sch_vvps',
        'Preferred time slot for Term 2 Parent-Teacher Discussion Forum (PTM)?',
        'PARENTS', '2026-10-15', '2026-11-05', true, 'Academic Council'
      ),
      (
        'poll_vvps_002', 'sch_vvps',
        'Should the school introduce AI & Robotics clubs on Saturday mornings?',
        'ALL', '2026-10-18', '2026-11-10', true, 'Dr. Sunita Mishra (Principal)'
      )
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO communication_poll_options (id, poll_id, option_text, sort_order, votes_count)
      VALUES
        ('opt_01_1', 'poll_vvps_001', 'Morning (8:30 AM - 11:30 AM)', 1, 42),
        ('opt_01_2', 'poll_vvps_001', 'Afternoon (1:00 PM - 4:00 PM)', 2, 28),
        ('opt_01_3', 'poll_vvps_001', 'Virtual Google Meet Conference', 3, 35),
        ('opt_02_1', 'poll_vvps_002', 'Yes, highly recommended', 1, 89),
        ('opt_02_2', 'poll_vvps_002', 'Neutral / Undecided', 2, 12),
        ('opt_02_3', 'poll_vvps_002', 'Prefer regular sports only', 3, 7)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 10. Seed Feedback & Grievances
    await db.exec(`
      INSERT INTO feedback_submissions (
        id, school_id, category, subject, message, priority, submitted_by_name, submitted_by_role, status, assigned_to_name, resolution_notes, resolved_at
      ) VALUES
      (
        'fb_vvps_001', 'sch_vvps', 'INFRASTRUCTURE',
        'Request for additional shaded seating near Primary Playground',
        'During afternoon recess, students need shade protection while waiting for water dispensers.',
        'NORMAL', 'Pooja Sharma (Parent)', 'parent', 'RESOLVED',
        'Estate Manager', 'Installed two all-weather gazebos and water cooling station in primary quadrangle.', CURRENT_TIMESTAMP - INTERVAL '2 days'
      ),
      (
        'fb_vvps_002', 'sch_vvps', 'ACADEMICS',
        'Appreciation for Coding & Robotics Curriculum in Grade 4',
        'The hands-on Python turtle graphics modules have generated immense enthusiasm among young learners.',
        'NORMAL', 'Sunil Narang (Parent)', 'parent', 'CLOSED',
        'Computer Science HOD', 'Acknowledged with thanks during assembly.', CURRENT_TIMESTAMP - INTERVAL '5 days'
      )
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO grievances (
        id, ticket_number, school_id, assigned_department, subject, description, priority,
        submitted_by_name, submitted_by_role, status, assigned_officer_name, resolution, resolved_at
      ) VALUES
      (
        'grv_vvps_001', 'GRV-2026-001', 'sch_vvps', 'Transport & Fleet',
        'Unpunctual Morning Arrival of Bus #3 at Sector 21 Stop',
        'Bus #3 has been arriving 15 minutes late for the past 3 consecutive days, creating delay in student morning homeroom.',
        'HIGH', 'Alok Verma (Parent)', 'parent', 'RESOLVED',
        'Col. Rajesh Rathore (Transport Head)',
        'Route driver reassigned to alternate radial flyover route avoiding traffic bottleneck. On-time arrival logged.',
        CURRENT_TIMESTAMP - INTERVAL '1 day'
      ),
      (
        'grv_vvps_002', 'GRV-2026-002', 'sch_vvps', 'Accounts & Fees',
        'Duplicate SMS alert received after digital payment of Term 2 Fee',
        'Online transaction cleared via UPI but automated payment reminder SMS was triggered by bank gateway webhook delay.',
        'NORMAL', 'Meenakshi Iyer (Parent)', 'parent', 'RESOLVED',
        'S. K. Verma (Accounts)',
        'Webhook deduplication idempotency key verified and bank reconciliation cleared. Receipt issued.',
        CURRENT_TIMESTAMP - INTERVAL '3 days'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 11. Seed Acknowledgements for Circulars
    await db.exec(`
      INSERT INTO acknowledgements (
        id, school_id, entity_type, entity_id, user_id, user_name, user_role, acknowledged_at, remarks
      ) VALUES
      (
        'ack_01', 'sch_vvps', 'CIRCULAR', 'circ_vvps_001',
        'usr_super_admin', 'Ramesh Kumar', 'parent', CURRENT_TIMESTAMP - INTERVAL '1 day',
        'Acknowledged and understood 75% CBSE attendance rule.'
      ),
      (
        'ack_02', 'sch_vvps', 'CIRCULAR', 'circ_vvps_003',
        'usr_super_admin', 'Ramesh Kumar', 'parent', CURRENT_TIMESTAMP - INTERVAL '12 hours',
        'Bus safety protocol acknowledged.'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('[DB] Phase 14 Communication, Notification & Parent Engagement System seeded successfully.');
  } catch (err: any) {
    (globalThis as any).__phase14Error = err?.message || String(err);
    console.error('[DB PHASE 14 INIT ERROR]', err);
  }
}
