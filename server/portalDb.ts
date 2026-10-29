import type { PGlite } from '@electric-sql/pglite';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function ensurePhase19SchemaAndData(db: PGlite) {
  try {
    console.log('[DB] Checking Phase 19 Advanced Parent & Student Portal schema...');

    // 1. Core Portal Tables
    await db.exec(`
      -- 1. Portal Online Service Types Configuration
      CREATE TABLE IF NOT EXISTS portal_service_types (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        code VARCHAR(50) NOT NULL,
        title VARCHAR(150) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'ACADEMIC', -- ACADEMIC, CERTIFICATE, IDENTITY, LOGISTICS, RECORDS
        description TEXT NOT NULL,
        fee_amount NUMERIC(8,2) DEFAULT 0.00,
        sla_days INT DEFAULT 3,
        is_active BOOLEAN DEFAULT TRUE,
        required_fields TEXT, -- JSON array of field definitions
        required_documents TEXT, -- JSON array of required attachments
        responsible_dept VARCHAR(50) DEFAULT 'ADMINISTRATION',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_school_service_code UNIQUE(school_id, code)
      );

      -- 2. Student Leave Applications (Online Leave Request Workflow)
      CREATE TABLE IF NOT EXISTS student_leave_applications (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        applicant_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        applicant_role VARCHAR(20) DEFAULT 'PARENT', -- PARENT, STUDENT
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_days INT DEFAULT 1,
        reason_category VARCHAR(50) DEFAULT 'MEDICAL', -- MEDICAL, FAMILY, EMERGENCY, VACATION, RELIGIOUS, OTHER
        reason TEXT NOT NULL,
        is_emergency BOOLEAN DEFAULT FALSE,
        status VARCHAR(30) DEFAULT 'SUBMITTED', -- SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED
        reviewer_name VARCHAR(100),
        review_remarks TEXT,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        supporting_document TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 3. Student Profile Correction Requests (Formal Audit & Approval)
      CREATE TABLE IF NOT EXISTS student_profile_corrections (
        id VARCHAR(50) PRIMARY KEY,
        request_number VARCHAR(50) UNIQUE NOT NULL,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        requested_by_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        requested_by_type VARCHAR(20) DEFAULT 'PARENT', -- PARENT, STUDENT
        field_category VARCHAR(50) NOT NULL, -- NAME, DOB, CONTACT, ADDRESS, GUARDIAN, BLOOD_GROUP
        field_name VARCHAR(50) NOT NULL,
        current_value TEXT,
        requested_value TEXT NOT NULL,
        reason TEXT NOT NULL,
        supporting_document TEXT,
        status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
        reviewed_by VARCHAR(100),
        review_notes TEXT,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 4. Direct Portal Messages (Parent-Teacher & Student-Teacher Communication)
      CREATE TABLE IF NOT EXISTS portal_messages (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        parent_id VARCHAR(50) REFERENCES parents(id) ON DELETE SET NULL,
        teacher_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
        sender_user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sender_role VARCHAR(20) NOT NULL, -- PARENT, TEACHER, STUDENT
        sender_name VARCHAR(100) NOT NULL,
        subject VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 5. Portal Surveys & Feedback Forms
      CREATE TABLE IF NOT EXISTS portal_surveys (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        target_audience VARCHAR(50) DEFAULT 'ALL', -- PARENTS, STUDENTS, ALL
        is_active BOOLEAN DEFAULT TRUE,
        questions TEXT, -- JSON array of questions
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS portal_survey_responses (
        id VARCHAR(50) PRIMARY KEY,
        survey_id VARCHAR(50) NOT NULL REFERENCES portal_surveys(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
        student_id VARCHAR(50) REFERENCES students(id) ON DELETE SET NULL,
        responses TEXT NOT NULL, -- JSON responses
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_survey_user UNIQUE(survey_id, user_id)
      );

      -- Indexes for fast portal queries
      CREATE INDEX IF NOT EXISTS idx_leave_student ON student_leave_applications(student_id, status);
      CREATE INDEX IF NOT EXISTS idx_profile_corr_student ON student_profile_corrections(student_id);
      CREATE INDEX IF NOT EXISTS idx_portal_msgs_stu ON portal_messages(student_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_service_types_sch ON portal_service_types(school_id, is_active);
    `);

    // 2. Register Phase 19 Permissions
    const phase19Permissions = [
      { id: 'portal.view', module: 'Portal', name: 'Access Digital Portal', desc: 'Unified digital portal entry point' },
      { id: 'portal.parent.view', module: 'Portal', name: 'Parent Portal View', desc: 'Comprehensive parent dashboard & multi-child view' },
      { id: 'portal.student.view', module: 'Portal', name: 'Student Portal View', desc: 'Learner dashboard, timetable, results & homework' },
      { id: 'portal.services.manage', module: 'Portal', name: 'Manage Online Services', desc: 'Configure online service catalogs, fees, and SLAs' },
      { id: 'portal.services.request', module: 'Portal', name: 'Request School Services', desc: 'Submit certificate, ID card, or document requests' },
      { id: 'portal.leave.apply', module: 'Portal', name: 'Apply Student Leave', desc: 'Submit student absence and leave requests' },
      { id: 'portal.leave.review', module: 'Portal', name: 'Review Student Leave', desc: 'Approve or reject student leave applications' },
      { id: 'portal.profile.request', module: 'Portal', name: 'Request Profile Corrections', desc: 'Submit demographic & record change requests' },
      { id: 'portal.profile.review', module: 'Portal', name: 'Review Profile Corrections', desc: 'Approve and verify profile correction requests' },
      { id: 'portal.analytics.view', module: 'Portal', name: 'View Portal Analytics', desc: 'Track portal engagement and request SLAs' }
    ];

    for (const p of phase19Permissions) {
      await db.query(`
        INSERT INTO permissions (id, module, name, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
      `, [p.id, p.module, p.name, p.desc]);

      // Assign to Super Admin & School Admin
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_super_admin', $1) ON CONFLICT DO NOTHING`, [p.id]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_school_admin', $1) ON CONFLICT DO NOTHING`, [p.id]);
    }

    // Role-specific assignments
    const principalPerms = ['portal.view', 'portal.services.manage', 'portal.leave.review', 'portal.profile.review', 'portal.analytics.view'];
    for (const pid of principalPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_principal', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    const teacherPerms = ['portal.view', 'portal.leave.review'];
    for (const pid of teacherPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_teacher', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    const parentPerms = [
      'portal.view', 'portal.parent.view', 'portal.services.request', 'portal.leave.apply',
      'portal.profile.request', 'appointments.request', 'appointments.view', 'calendar.view',
      'events.view', 'holidays.view', 'certificates.request', 'fees.view'
    ];
    for (const pid of parentPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_parent', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    const studentPerms = [
      'portal.view', 'portal.student.view', 'portal.services.request', 'portal.leave.apply',
      'portal.profile.request', 'calendar.view', 'events.view', 'holidays.view', 'certificates.request'
    ];
    for (const pid of studentPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_student', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    // 3. Seed Default Online Service Types for VVPS and GISK
    const schoolsRes = await db.query('SELECT id FROM schools');
    const defaultServices = [
      {
        code: 'BONAFIDE',
        title: 'Bonafide Certificate',
        category: 'CERTIFICATE',
        description: 'Official certification of student enrollment, conduct and academic standing for passports, visas, or bank accounts.',
        fee_amount: 50.00,
        sla_days: 2,
        dept: 'ADMINISTRATION'
      },
      {
        code: 'CHARACTER',
        title: 'Character & Conduct Certificate',
        category: 'CERTIFICATE',
        description: 'Attestation of exemplary student disciplinary track record, general conduct, and active school participation.',
        fee_amount: 50.00,
        sla_days: 3,
        dept: 'ACADEMIC'
      },
      {
        code: 'STUDY',
        title: 'Study & Course Enrollment Certificate',
        category: 'CERTIFICATE',
        description: 'Certification of standard educational grade level, academic session, and curriculum stream.',
        fee_amount: 50.00,
        sla_days: 2,
        dept: 'ACADEMIC'
      },
      {
        code: 'FEE_CLEARANCE',
        title: 'Fee Clearance Certificate',
        category: 'FINANCE',
        description: 'Accounts department certification confirming zero outstanding dues up to current academic quarter.',
        fee_amount: 0.00,
        sla_days: 1,
        dept: 'ACCOUNTS'
      },
      {
        code: 'TRANSFER_CERTIFICATE',
        title: 'Transfer Certificate (TC / SLC)',
        category: 'DEPARTURE',
        description: 'CBSE-compliant 20-point formal School Leaving Certificate following departmental clearance approvals.',
        fee_amount: 150.00,
        sla_days: 5,
        dept: 'ADMINISTRATION'
      },
      {
        code: 'ID_CARD_REISSUE',
        title: 'Student ID Card Re-issue',
        category: 'IDENTITY',
        description: 'Replacement smart RFID/Barcode identity card in case of loss or physical wear.',
        fee_amount: 100.00,
        sla_days: 3,
        dept: 'ADMINISTRATION'
      },
      {
        code: 'BUS_PASS_REISSUE',
        title: 'Transport Bus Pass Re-issue',
        category: 'LOGISTICS',
        description: 'Replacement transport pass for registered route pickup and drop points.',
        fee_amount: 50.00,
        sla_days: 2,
        dept: 'TRANSPORT'
      },
      {
        code: 'DUPLICATE_REPORT_CARD',
        title: 'Duplicate Term Report Card',
        category: 'ACADEMIC',
        description: 'Official attested duplicate printout of published term report cards.',
        fee_amount: 50.00,
        sla_days: 2,
        dept: 'EXAMINATION'
      }
    ];

    for (const sch of schoolsRes.rows as any[]) {
      for (const s of defaultServices) {
        const sId = `srv_${sch.id}_${s.code.toLowerCase()}`;
        await db.query(`
          INSERT INTO portal_service_types (
            id, school_id, code, title, category, description, fee_amount, sla_days, is_active, responsible_dept
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
          ON CONFLICT (school_id, code) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            fee_amount = EXCLUDED.fee_amount,
            sla_days = EXCLUDED.sla_days
        `, [sId, sch.id, s.code, s.title, s.category, s.description, s.fee_amount, s.sla_days, s.dept]);
      }
    }

    // 4. Seed Dedicated Parent & Student User Accounts & Multi-Child Linking
    const defaultPasswordHash = await bcrypt.hash('Admin@123', 10);

    // Parent User for VVPS (Ramesh Kumar - Father of Aarav & Ananya)
    await db.query(`
      INSERT INTO users (id, school_id, username, email, password_hash, first_name, last_name, phone, role_id, status)
      VALUES (
        'usr_parent_vvps', 'sch_vvps', 'parent.vvps', 'parent.vvps@erp.edu',
        $1, 'Ramesh', 'Kumar', '+91 98350 77101', 'role_parent', 'active'
      )
      ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'active'
    `, [defaultPasswordHash]);

    // Student User for VVPS (Aarav Kumar - Student in VVPS)
    await db.query(`
      INSERT INTO users (id, school_id, username, email, password_hash, first_name, last_name, phone, role_id, status)
      VALUES (
        'usr_student_vvps', 'sch_vvps', 'student.vvps', 'student.vvps@erp.edu',
        $1, 'Aarav', 'Kumar', '+91 98350 77101', 'role_student', 'active'
      )
      ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'active'
    `, [defaultPasswordHash]);

    // Parent User for GISK
    await db.query(`
      INSERT INTO users (id, school_id, username, email, password_hash, first_name, last_name, phone, role_id, status)
      VALUES (
        'usr_parent_gisk', 'sch_gisk', 'parent.gisk', 'parent.gisk@erp.edu',
        $1, 'Manoj', 'Tiwari', '+91 98350 88201', 'role_parent', 'active'
      )
      ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'active'
    `, [defaultPasswordHash]);

    // Student User for GISK
    await db.query(`
      INSERT INTO users (id, school_id, username, email, password_hash, first_name, last_name, phone, role_id, status)
      VALUES (
        'usr_student_gisk', 'sch_gisk', 'student.gisk', 'student.gisk@erp.edu',
        $1, 'Vikram', 'Tiwari', '+91 98350 88201', 'role_student', 'active'
      )
      ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'active'
    `, [defaultPasswordHash]);

    // Link parent account to parent record
    await db.query(`
      UPDATE parents
      SET user_account_id = 'usr_parent_vvps'
      WHERE id = 'par_vvps_001'
    `);

    // Multi-Child Linking: Link parent Ramesh Kumar (par_vvps_001) to BOTH Aarav (stu_vvps_001) and Ananya (stu_vvps_002)!
    await db.query(`
      INSERT INTO student_parents (
        id, student_id, parent_id, relationship, is_primary_guardian, can_receive_notifications, can_access_portal
      ) VALUES (
        'sp_link_par_vvps_001_stu_vvps_002', 'stu_vvps_002', 'par_vvps_001', 'Father', true, true, true
      )
      ON CONFLICT (student_id, parent_id) DO NOTHING
    `);

    // 5. Seed Sample Leave Applications
    await db.query(`
      INSERT INTO student_leave_applications (
        id, school_id, student_id, applicant_user_id, applicant_role, start_date, end_date,
        total_days, reason_category, reason, is_emergency, status, reviewer_name, review_remarks, reviewed_at
      ) VALUES
      (
        'sla_001', 'sch_vvps', 'stu_vvps_001', 'usr_parent_vvps', 'PARENT',
        CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '9 days', 2,
        'MEDICAL', 'Suffering from viral fever and prescribed 2 days bed rest.', false,
        'APPROVED', 'Priya Pandey (Class Teacher)', 'Leave approved. Please catch up on Unit 3 Math homework.', CURRENT_TIMESTAMP - INTERVAL '9 days'
      ),
      (
        'sla_002', 'sch_vvps', 'stu_vvps_002', 'usr_parent_vvps', 'PARENT',
        CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '6 days', 2,
        'FAMILY', 'Family attending elder sister wedding ceremony in Patna.', false,
        'SUBMITTED', NULL, NULL, NULL
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 6. Seed Sample Profile Correction Request
    await db.query(`
      INSERT INTO student_profile_corrections (
        id, request_number, school_id, student_id, requested_by_user_id, requested_by_type,
        field_category, field_name, current_value, requested_value, reason, status
      ) VALUES (
        'pcr_001', 'PCR-2026-0001', 'sch_vvps', 'stu_vvps_001', 'usr_parent_vvps', 'PARENT',
        'CONTACT', 'Emergency Mobile', '+91 98350 77102', '+91 98350 77999',
        'Updated to office landline for quicker reachability during working hours.', 'PENDING'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 7. Seed Sample School Satisfaction Survey
    await db.query(`
      INSERT INTO portal_surveys (id, school_id, title, description, target_audience, is_active, questions)
      VALUES (
        'srv_vvps_term1_2026', 'sch_vvps', 'Academic Term 1 - Parent Satisfaction & Experience Feedback',
        'We value your feedback to continually elevate school academics, transport safety, and digital learning experience.',
        'PARENTS', true,
        '[{"id":"q1","text":"How satisfied are you with overall academic progress and teacher communication?","type":"RATING"},{"id":"q2","text":"Are digital homework and study materials easily accessible?","type":"YES_NO"},{"id":"q3","text":"Suggestions for school improvements or student co-curricular activities:","type":"TEXT"}]'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('[DB] Phase 19 Advanced Portal schema & multi-child data seeded successfully.');
  } catch (err: any) {
    console.error('[DB PHASE 19 INIT ERROR]', err);
  }
}
