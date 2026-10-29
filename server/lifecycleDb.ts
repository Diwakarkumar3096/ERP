import type { PGlite } from '@electric-sql/pglite';
import crypto from 'crypto';

export async function ensurePhase18SchemaAndData(db: PGlite) {
  try {
    console.log('[DB] Checking Phase 18 Student Lifecycle, Documents & Certificates schema...');

    // 1. Core Lifecycle Tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS student_lifecycle_events (
        id VARCHAR(50) PRIMARY KEY,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) REFERENCES academic_sessions(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL,
        from_status VARCHAR(50),
        to_status VARCHAR(50),
        from_class_id VARCHAR(50) REFERENCES classes(id) ON DELETE SET NULL,
        to_class_id VARCHAR(50) REFERENCES classes(id) ON DELETE SET NULL,
        from_section_id VARCHAR(50) REFERENCES sections(id) ON DELETE SET NULL,
        to_section_id VARCHAR(50) REFERENCES sections(id) ON DELETE SET NULL,
        reason TEXT,
        notes TEXT,
        action_by_id VARCHAR(50),
        action_by_name VARCHAR(100),
        metadata TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS student_promotions (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        from_session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        to_session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        from_class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        to_class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        from_section_id VARCHAR(50) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
        to_section_id VARCHAR(50) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
        decision VARCHAR(30) NOT NULL DEFAULT 'PROMOTED',
        final_grade VARCHAR(20),
        final_percentage NUMERIC(5, 2),
        attendance_pct NUMERIC(5, 2),
        promoted_by VARCHAR(100),
        promoted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        remarks TEXT
      );

      CREATE TABLE IF NOT EXISTS student_withdrawals (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        request_number VARCHAR(50) UNIQUE NOT NULL,
        requested_by_type VARCHAR(20) DEFAULT 'PARENT',
        reason_category VARCHAR(100) NOT NULL,
        reason_details TEXT,
        application_date DATE NOT NULL,
        effective_leaving_date DATE,
        status VARCHAR(30) DEFAULT 'REQUESTED',
        approved_by VARCHAR(100),
        approved_at TIMESTAMP WITH TIME ZONE,
        rejection_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS student_clearances (
        id VARCHAR(50) PRIMARY KEY,
        withdrawal_id VARCHAR(50) REFERENCES student_withdrawals(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        department VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        dues_amount NUMERIC(10, 2) DEFAULT 0.00,
        details TEXT,
        is_override BOOLEAN DEFAULT FALSE,
        override_reason TEXT,
        cleared_by VARCHAR(100),
        cleared_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(withdrawal_id, department)
      );

      CREATE TABLE IF NOT EXISTS student_document_vault (
        id VARCHAR(50) PRIMARY KEY,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        document_category VARCHAR(50) NOT NULL,
        document_type VARCHAR(100) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INT NOT NULL,
        mime_type VARCHAR(100),
        file_data TEXT NOT NULL,
        version INT DEFAULT 1,
        is_current_version BOOLEAN DEFAULT TRUE,
        verification_status VARCHAR(30) DEFAULT 'PENDING',
        rejection_reason TEXT,
        verified_by VARCHAR(100),
        verified_at TIMESTAMP WITH TIME ZONE,
        expiry_date DATE,
        uploaded_by_type VARCHAR(20) DEFAULT 'ADMIN',
        uploaded_by_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS student_service_requests (
        id VARCHAR(50) PRIMARY KEY,
        request_number VARCHAR(50) UNIQUE NOT NULL,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        session_id VARCHAR(50) REFERENCES academic_sessions(id) ON DELETE SET NULL,
        request_type VARCHAR(100) NOT NULL,
        requested_by_type VARCHAR(20) DEFAULT 'PARENT',
        requested_by_name VARCHAR(100),
        purpose TEXT,
        notes TEXT,
        fee_amount NUMERIC(8, 2) DEFAULT 0.00,
        fee_status VARCHAR(20) DEFAULT 'NOT_APPLICABLE',
        fee_receipt_number VARCHAR(50),
        status VARCHAR(30) DEFAULT 'SUBMITTED',
        rejection_reason TEXT,
        approved_by VARCHAR(100),
        approved_at TIMESTAMP WITH TIME ZONE,
        generated_certificate_id VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS certificate_templates (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        certificate_type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        code_prefix VARCHAR(20) NOT NULL,
        body_template TEXT NOT NULL,
        header_text TEXT,
        footer_text TEXT,
        signatory_title VARCHAR(100) DEFAULT 'Principal',
        signatory_name VARCHAR(100) DEFAULT 'Dr. Rajesh Sharma',
        fee_amount NUMERIC(8, 2) DEFAULT 0.00,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, certificate_type)
      );

      CREATE TABLE IF NOT EXISTS certificates (
        id VARCHAR(50) PRIMARY KEY,
        certificate_number VARCHAR(100) UNIQUE NOT NULL,
        verification_code VARCHAR(64) UNIQUE NOT NULL,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        service_request_id VARCHAR(50) REFERENCES student_service_requests(id) ON DELETE SET NULL,
        certificate_type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        issue_date DATE NOT NULL,
        academic_session_id VARCHAR(50) REFERENCES academic_sessions(id) ON DELETE SET NULL,
        class_id VARCHAR(50) REFERENCES classes(id) ON DELETE SET NULL,
        section_id VARCHAR(50) REFERENCES sections(id) ON DELETE SET NULL,
        signatory_name VARCHAR(100),
        signatory_title VARCHAR(100),
        status VARCHAR(20) DEFAULT 'VALID',
        revocation_reason TEXT,
        revoked_by VARCHAR(100),
        revoked_at TIMESTAMP WITH TIME ZONE,
        is_duplicate BOOLEAN DEFAULT FALSE,
        original_certificate_id VARCHAR(50),
        custom_fields TEXT,
        created_by_id VARCHAR(50),
        created_by_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS alumni_profiles (
        id VARCHAR(50) PRIMARY KEY,
        student_id VARCHAR(50) UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        admission_number VARCHAR(50) NOT NULL,
        student_name VARCHAR(150) NOT NULL,
        leaving_date DATE NOT NULL,
        leaving_class VARCHAR(50),
        leaving_session VARCHAR(50),
        leaving_reason VARCHAR(100),
        tc_number VARCHAR(100),
        current_organization VARCHAR(150),
        current_city VARCHAR(100),
        contact_email VARCHAR(100),
        contact_phone VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_lifecycle_student ON student_lifecycle_events(student_id);
      CREATE INDEX IF NOT EXISTS idx_lifecycle_school ON student_lifecycle_events(school_id);
      CREATE INDEX IF NOT EXISTS idx_promotions_student ON student_promotions(student_id);
      CREATE INDEX IF NOT EXISTS idx_withdrawals_student ON student_withdrawals(student_id);
      CREATE INDEX IF NOT EXISTS idx_clearances_withdrawal ON student_clearances(withdrawal_id);
      CREATE INDEX IF NOT EXISTS idx_docvault_student ON student_document_vault(student_id);
      CREATE INDEX IF NOT EXISTS idx_requests_student ON student_service_requests(student_id);
      CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
      CREATE INDEX IF NOT EXISTS idx_certificates_verify_code ON certificates(verification_code);
    `);

    // 2. Add Phase 18 RBAC Permissions
    const p18Perms = [
      { id: 'lifecycle.view', module: 'Student Lifecycle', name: 'View Student Lifecycle', desc: 'Inspect student progression, timeline, and history' },
      { id: 'lifecycle.promote', module: 'Student Lifecycle', name: 'Manage Academic Promotion', desc: 'Promote students and reassign classes and sections' },
      { id: 'lifecycle.transfer', module: 'Student Lifecycle', name: 'Manage Section Transfer', desc: 'Move students between sections or classes' },
      { id: 'lifecycle.withdraw', module: 'Student Lifecycle', name: 'Manage Student Withdrawal', desc: 'Process withdrawal requests and department clearances' },
      { id: 'documents.view', module: 'Document Vault', name: 'View Digital Documents', desc: 'Access student document archives and records' },
      { id: 'documents.verify', module: 'Document Vault', name: 'Verify Student Documents', desc: 'Verify, approve, or reject student documentation' },
      { id: 'certificates.view', module: 'Certificates', name: 'View Certificate Registry', desc: 'Inspect issued certificates and service requests' },
      { id: 'certificates.request', module: 'Certificates', name: 'Request Certificates', desc: 'Submit certificate and document requests' },
      { id: 'certificates.approve', module: 'Certificates', name: 'Approve Certificates', desc: 'Approve student certificates and TC requests' },
      { id: 'certificates.issue', module: 'Certificates', name: 'Generate & Issue Certificates', desc: 'Create official certificates, TC and verify QR codes' },
      { id: 'certificates.revoke', module: 'Certificates', name: 'Revoke Certificates', desc: 'Revoke, supersede or cancel issued certificates' }
    ];

    for (const p of p18Perms) {
      await db.query(`
        INSERT INTO permissions (id, module, name, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING
      `, [p.id, p.module, p.name, p.desc]);

      // Assign to Super Admin
      await db.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ('role_super_admin', $1)
        ON CONFLICT DO NOTHING
      `, [p.id]);

      // Assign to School Admin & Principal
      await db.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ('role_school_admin', $1)
        ON CONFLICT DO NOTHING
      `, [p.id]);

      await db.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ('role_principal', $1)
        ON CONFLICT DO NOTHING
      `, [p.id]);
    }

    // Assign view & request permissions to Teacher, Accountant, Parent
    const staffPerms = ['lifecycle.view', 'documents.view', 'certificates.view'];
    for (const pid of staffPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_teacher', $1) ON CONFLICT DO NOTHING`, [pid]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_accountant', $1) ON CONFLICT DO NOTHING`, [pid]);
    }
    await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_parent', 'certificates.request') ON CONFLICT DO NOTHING`);
    await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_student', 'certificates.request') ON CONFLICT DO NOTHING`);

    // 3. Seed Default Certificate Templates for VVPS & GISK
    const templateCheck = await db.query('SELECT count(*) as count FROM certificate_templates');
    const tCount = parseInt((templateCheck.rows[0] as any)?.count || '0', 10);

    if (tCount === 0) {
      console.log('[DB] Seeding Phase 18 standard certificate templates...');
      const schools = ['sch_vvps', 'sch_gisk'];

      for (const sId of schools) {
        const templates = [
          {
            type: 'BONAFIDE',
            title: 'Bonafide Certificate',
            prefix: 'BON',
            body: 'This is to certify that {{STUDENT_NAME}}, Son/Daughter of {{FATHER_NAME}} and {{MOTHER_NAME}}, Admission No. {{ADMISSION_NO}}, is a bonafide student of this institution studying in {{CLASS_NAME}}, Section {{SECTION_NAME}} during the academic session {{SESSION_NAME}}. His/Her date of birth according to the school register is {{DATE_OF_BIRTH}}. As per school records, his/her general conduct and character have been {{CONDUCT}}.',
            fee: 50.00
          },
          {
            type: 'CHARACTER',
            title: 'Character & Conduct Certificate',
            prefix: 'CHAR',
            body: 'This is to certify that {{STUDENT_NAME}}, Son/Daughter of {{FATHER_NAME}}, bearing Admission No. {{ADMISSION_NO}}, was a student of Class {{CLASS_NAME}} during the academic year {{SESSION_NAME}}. During his/her tenure at this institution, he/she bore a good moral character and demonstrated disciplined conduct in all scholastic and co-curricular engagements.',
            fee: 50.00
          },
          {
            type: 'STUDY',
            title: 'Study & Course Enrollment Certificate',
            prefix: 'STUDY',
            body: 'This is to certify that {{STUDENT_NAME}} (Admission No. {{ADMISSION_NO}}) is actively enrolled in Class {{CLASS_NAME}}, following the prescribed CBSE curriculum at this campus for the academic session {{SESSION_NAME}}.',
            fee: 0.00
          },
          {
            type: 'FEE',
            title: 'Fee Clearance & Tuition Certificate',
            prefix: 'FEE',
            body: 'This is to certify that {{STUDENT_NAME}} has cleared all school tuition, laboratory, library and transport fee dues for the academic term {{SESSION_NAME}}. Total fee assessed: ₹{{TOTAL_FEES}}, Paid: ₹{{PAID_FEES}}, Outstanding: ₹{{OUTSTANDING_FEES}}.',
            fee: 0.00
          },
          {
            type: 'TRANSFER_CERTIFICATE',
            title: 'Transfer Certificate (School Leaving)',
            prefix: 'TC',
            body: 'TRANSFER CERTIFICATE / SCHOOL LEAVING CERTIFICATE\n\n1. Name of Pupil: {{STUDENT_NAME}}\n2. Mother\'s Name: {{MOTHER_NAME}}\n3. Father\'s / Guardian\'s Name: {{FATHER_NAME}}\n4. Nationality: {{NATIONALITY}}\n5. Whether Candidate belongs to SC/ST/OBC: {{CATEGORY}}\n6. Date of first admission in the school with class: {{ADMISSION_DATE}}\n7. Date of birth according to Admission Register: {{DATE_OF_BIRTH}}\n8. Class in which the pupil last studied: {{CLASS_NAME}}\n9. School/Board Annual Examination last taken with result: {{RESULT_STATUS}}\n10. Whether qualified for promotion to higher class: {{PROMOTION_STATUS}}\n11. Total number of working days in academic session: {{WORKING_DAYS}}\n12. Total number of working days pupil present: {{PRESENT_DAYS}}\n13. Month up to which school dues have been paid: All Dues Cleared\n14. General Conduct: {{CONDUCT}}\n15. Date of application for certificate: {{APPLICATION_DATE}}\n16. Date of issue of certificate: {{ISSUE_DATE}}\n17. Reasons for leaving the school: {{LEAVING_REASON}}',
            fee: 100.00
          },
          {
            type: 'SCHOOL_LEAVING_CERTIFICATE',
            title: 'School Leaving Certificate',
            prefix: 'SLC',
            body: 'This certifies that {{STUDENT_NAME}} has formally withdrawn from the rolls of this institution on {{LEAVING_DATE}} having completed studies up to Class {{CLASS_NAME}}. All academic and institutional dues have been settled satisfactorily.',
            fee: 100.00
          }
        ];

        for (const t of templates) {
          const id = `tmpl_${sId}_${t.type.toLowerCase()}`;
          await db.query(`
            INSERT INTO certificate_templates (
              id, school_id, certificate_type, title, code_prefix, body_template, signatory_title, signatory_name, fee_amount, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, 'Principal', 'Dr. Rajesh Sharma', $7, true)
            ON CONFLICT DO NOTHING
          `, [id, sId, t.type, t.title, t.prefix, t.body, t.fee]);
        }
      }
    }

    // 4. Seed sample lifecycle history for first 2 students if empty
    const eventCheck = await db.query('SELECT count(*) as count FROM student_lifecycle_events');
    const eCount = parseInt((eventCheck.rows[0] as any)?.count || '0', 10);

    if (eCount === 0) {
      console.log('[DB] Seeding sample student lifecycle events & certificates...');
      const sampleStuRes = await db.query(`
        SELECT id, school_id, session_id, class_id, section_id, admission_date, first_name, last_name, admission_number
        FROM students LIMIT 3
      `);

      for (const stu of sampleStuRes.rows as any[]) {
        // Initial admission event
        await db.query(`
          INSERT INTO student_lifecycle_events (
            id, student_id, school_id, session_id, event_type, from_status, to_status,
            to_class_id, to_section_id, reason, notes, action_by_name, created_at
          ) VALUES ($1, $2, $3, $4, 'ADMISSION', 'APPLICANT', 'ACTIVE', $5, $6, 'Initial Admission Completed', 'Formal admission process finalized', 'Principal Rajesh Sharma', $7)
        `, [
          `ev_adm_${stu.id}`, stu.student_id || stu.id, stu.school_id, stu.session_id,
          stu.class_id, stu.section_id, stu.admission_date
        ]);

        // Sample digital document
        await db.query(`
          INSERT INTO student_document_vault (
            id, student_id, school_id, document_category, document_type, file_name, file_size,
            mime_type, file_data, version, is_current_version, verification_status, verified_by, verified_at,
            uploaded_by_type, uploaded_by_name
          ) VALUES ($1, $2, $3, 'IDENTITY', 'Birth Certificate', $4, 1048576, 'application/pdf', 'data:application/pdf;base64,JVBERi0xLjQK...', 1, true, 'VERIFIED', 'Principal Rajesh Sharma', CURRENT_TIMESTAMP, 'ADMIN', 'Registrar Office')
          ON CONFLICT DO NOTHING
        `, [
          `doc_${stu.id}_01`, stu.id, stu.school_id, `${stu.admission_number}_Birth_Certificate.pdf`
        ]);

        await db.query(`
          INSERT INTO student_document_vault (
            id, student_id, school_id, document_category, document_type, file_name, file_size,
            mime_type, file_data, version, is_current_version, verification_status, verified_by, verified_at,
            uploaded_by_type, uploaded_by_name
          ) VALUES ($1, $2, $3, 'IDENTITY', 'Aadhaar Card Copy', $4, 524288, 'image/jpeg', 'data:image/jpeg;base64,/9j/4AAQSkZJRg...', 1, true, 'VERIFIED', 'Amit Verma', CURRENT_TIMESTAMP, 'PARENT', 'Guardian')
          ON CONFLICT DO NOTHING
        `, [
          `doc_${stu.id}_02`, stu.id, stu.school_id, `${stu.admission_number}_Aadhaar_Card.jpg`
        ]);
      }

      // Seed 1 sample verified Bonafide Certificate
      const firstStu = sampleStuRes.rows[0] as any;
      if (firstStu) {
        const verifyCode = crypto.randomBytes(16).toString('hex');
        const certNum = `VVPS-BON-2026-0001`;
        await db.query(`
          INSERT INTO certificates (
            id, certificate_number, verification_code, school_id, student_id, certificate_type,
            title, issue_date, academic_session_id, class_id, section_id, signatory_name,
            signatory_title, status, created_by_name
          ) VALUES (
            'cert_sample_01', $1, $2, $3, $4, 'BONAFIDE', 'Bonafide Certificate',
            CURRENT_DATE, $5, $6, $7, 'Dr. Rajesh Sharma', 'Principal', 'VALID', 'Academic Office'
          ) ON CONFLICT DO NOTHING
        `, [certNum, verifyCode, firstStu.school_id, firstStu.id, firstStu.session_id, firstStu.class_id, firstStu.section_id]);

        // Record lifecycle event for certificate issue
        await db.query(`
          INSERT INTO student_lifecycle_events (
            id, student_id, school_id, session_id, event_type, from_status, to_status,
            reason, notes, action_by_name
          ) VALUES (
            'ev_cert_01', $1, $2, $3, 'CERTIFICATE_ISSUED', 'ACTIVE', 'ACTIVE',
            'Bonafide Certificate Issued', 'Issued certificate ref: VVPS-BON-2026-0001', 'Academic Office'
          )
        `, [firstStu.id, firstStu.school_id, firstStu.session_id]);
      }
    }

    console.log('[DB] Phase 18 schema & initial templates verified.');
  } catch (err) {
    console.error('[DB PHASE 18 INIT ERROR]', err);
  }
}
