import { db } from './db.js';

export async function ensurePhase21SchemaAndData() {
  try {
    console.log('[DB] Initializing Phase 21 Academic Planning, Curriculum, Syllabus & LMS schema...');

    await db.exec(`
      -- 1. Curriculum Frameworks
      CREATE TABLE IF NOT EXISTS curriculum_frameworks (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        code VARCHAR(50) NOT NULL,
        board VARCHAR(50) DEFAULT 'CBSE',
        description TEXT,
        applicable_classes TEXT, -- JSON array of class IDs
        applicable_subjects TEXT, -- JSON array of subject IDs
        version INT DEFAULT 1,
        status VARCHAR(30) DEFAULT 'APPROVED', -- DRAFT, UNDER_REVIEW, APPROVED, PUBLISHED, ARCHIVED
        effective_from DATE NOT NULL,
        effective_to DATE NOT NULL,
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_by_name VARCHAR(150),
        approved_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        approved_by_name VARCHAR(150),
        approved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_curr_frame_code UNIQUE (school_id, session_id, code, version)
      );

      -- 2. Curriculum Versions
      CREATE TABLE IF NOT EXISTS curriculum_versions (
        id VARCHAR(50) PRIMARY KEY,
        curriculum_id VARCHAR(50) NOT NULL REFERENCES curriculum_frameworks(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        version_number INT NOT NULL,
        revision_title VARCHAR(200) NOT NULL,
        revision_reason TEXT NOT NULL,
        changes_summary TEXT,
        snapshot_data TEXT NOT NULL, -- JSON snapshot of entire curriculum tree
        status VARCHAR(30) DEFAULT 'PUBLISHED',
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_by_name VARCHAR(150),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 3. Extend existing Academic Terms
      ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS code VARCHAR(50);
      ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS term_number INT DEFAULT 1;
      ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS teaching_weeks INT DEFAULT 18;
      ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS weightage NUMERIC(5, 2) DEFAULT 50.00;

      -- 4. Subject Curriculum Mapping
      CREATE TABLE IF NOT EXISTS curriculum_subject_maps (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        curriculum_id VARCHAR(50) NOT NULL REFERENCES curriculum_frameworks(id) ON DELETE CASCADE,
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        subject_id VARCHAR(50) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        term_id VARCHAR(50) REFERENCES academic_terms(id) ON DELETE SET NULL,
        coordinator_employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
        coordinator_name VARCHAR(150),
        lead_teacher_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
        lead_teacher_name VARCHAR(150),
        weekly_periods INT DEFAULT 6,
        planned_lessons INT DEFAULT 60,
        planned_teaching_hours NUMERIC(6, 1) DEFAULT 45.0,
        assessment_plan TEXT,
        status VARCHAR(30) DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_curr_class_sub_term UNIQUE (curriculum_id, class_id, subject_id, term_id)
      );

      -- 5. Curriculum Units
      CREATE TABLE IF NOT EXISTS curriculum_units (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        subject_map_id VARCHAR(50) NOT NULL REFERENCES curriculum_subject_maps(id) ON DELETE CASCADE,
        term_id VARCHAR(50) REFERENCES academic_terms(id) ON DELETE SET NULL,
        unit_number INT NOT NULL DEFAULT 1,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        weightage_marks NUMERIC(5, 2) DEFAULT 20.00,
        planned_periods INT DEFAULT 15,
        sort_order INT DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 6. Curriculum Chapters
      CREATE TABLE IF NOT EXISTS curriculum_chapters (
        id VARCHAR(50) PRIMARY KEY,
        unit_id VARCHAR(50) NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        chapter_number INT NOT NULL DEFAULT 1,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        estimated_teaching_hours NUMERIC(5, 1) DEFAULT 8.0,
        sort_order INT DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 7. Curriculum Topics
      CREATE TABLE IF NOT EXISTS curriculum_topics (
        id VARCHAR(50) PRIMARY KEY,
        chapter_id VARCHAR(50) NOT NULL REFERENCES curriculum_chapters(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        topic_code VARCHAR(50),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        learning_objectives TEXT,
        competencies TEXT,
        estimated_periods INT DEFAULT 2,
        difficulty_level VARCHAR(20) DEFAULT 'MEDIUM',
        recommended_activities TEXT,
        recommended_resources TEXT,
        prerequisites TEXT,
        sort_order INT DEFAULT 1,
        status VARCHAR(30) DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 8. Learning Outcomes & Competencies
      CREATE TABLE IF NOT EXISTS learning_outcomes (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        subject_id VARCHAR(50) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        code VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        competency_category VARCHAR(50) NOT NULL DEFAULT 'APPLICATION',
        expected_level VARCHAR(30) DEFAULT 'PROFICIENT',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_school_lo_code UNIQUE (school_id, session_id, code)
      );

      -- 9. Topic Learning Outcomes Mapping
      CREATE TABLE IF NOT EXISTS topic_learning_outcomes (
        id VARCHAR(50) PRIMARY KEY,
        topic_id VARCHAR(50) NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
        outcome_id VARCHAR(50) NOT NULL REFERENCES learning_outcomes(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_topic_outcome UNIQUE (topic_id, outcome_id)
      );

      -- 10. Lesson Plans
      CREATE TABLE IF NOT EXISTS academic_lesson_plans (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        section_id VARCHAR(50) REFERENCES sections(id) ON DELETE SET NULL,
        subject_id VARCHAR(50) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        topic_id VARCHAR(50) REFERENCES curriculum_topics(id) ON DELETE SET NULL,
        teacher_employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        teacher_name VARCHAR(150) NOT NULL,
        lesson_title VARCHAR(200) NOT NULL,
        plan_date DATE NOT NULL,
        period_number VARCHAR(50),
        duration_minutes INT DEFAULT 45,
        learning_objectives TEXT NOT NULL,
        learning_outcomes TEXT,
        teaching_methodology VARCHAR(100) DEFAULT 'EXPERIENTIAL',
        pedagogical_steps TEXT,
        differentiation_strategy TEXT,
        required_resources TEXT,
        classroom_activities TEXT,
        homework_id VARCHAR(50) REFERENCES homework(id) ON DELETE SET NULL,
        homework_summary TEXT,
        formative_assessment_summary TEXT,
        teacher_reflection_notes TEXT,
        status VARCHAR(30) DEFAULT 'PLANNED',
        reviewed_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        reviewed_by_name VARCHAR(150),
        review_comments TEXT,
        completed_at TIMESTAMP WITH TIME ZONE,
        delay_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 11. Lesson Plan Templates
      CREATE TABLE IF NOT EXISTS lesson_plan_templates (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        scope VARCHAR(30) DEFAULT 'SCHOOL',
        subject_category VARCHAR(100),
        template_structure TEXT NOT NULL,
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_by_name VARCHAR(150),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 12. Syllabus Progress Tracking
      CREATE TABLE IF NOT EXISTS academic_syllabus_progress (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        section_id VARCHAR(50) REFERENCES sections(id) ON DELETE CASCADE,
        subject_id VARCHAR(50) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        topic_id VARCHAR(50) NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
        teacher_employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
        planned_start_date DATE,
        planned_end_date DATE,
        actual_start_date DATE,
        actual_completion_date DATE,
        teaching_hours_delivered NUMERIC(5, 1) DEFAULT 0.0,
        status VARCHAR(30) DEFAULT 'NOT_STARTED', -- NOT_STARTED, IN_PROGRESS, COMPLETED, REVISION, DEFERRED
        deferral_reason TEXT,
        completion_percentage INT DEFAULT 0,
        teacher_notes TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_syl_prog UNIQUE (school_id, session_id, class_id, section_id, subject_id, topic_id)
      );

      -- 13. Teaching Resources Repository
      CREATE TABLE IF NOT EXISTS academic_resources (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        resource_type VARCHAR(30) NOT NULL,
        file_url TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size_bytes INT DEFAULT 0,
        class_id VARCHAR(50) REFERENCES classes(id) ON DELETE SET NULL,
        subject_id VARCHAR(50) REFERENCES subjects(id) ON DELETE SET NULL,
        unit_id VARCHAR(50) REFERENCES curriculum_units(id) ON DELETE SET NULL,
        chapter_id VARCHAR(50) REFERENCES curriculum_chapters(id) ON DELETE SET NULL,
        topic_id VARCHAR(50) REFERENCES curriculum_topics(id) ON DELETE SET NULL,
        learning_outcome_id VARCHAR(50) REFERENCES learning_outcomes(id) ON DELETE SET NULL,
        visibility VARCHAR(30) DEFAULT 'STUDENT_VISIBLE',
        uploaded_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        uploaded_by_name VARCHAR(150),
        approval_status VARCHAR(30) DEFAULT 'APPROVED',
        downloads_count INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 14. Formative Assessments
      CREATE TABLE IF NOT EXISTS academic_formative_assessments (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        section_id VARCHAR(50) REFERENCES sections(id) ON DELETE SET NULL,
        subject_id VARCHAR(50) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        topic_id VARCHAR(50) REFERENCES curriculum_topics(id) ON DELETE SET NULL,
        learning_outcome_id VARCHAR(50) REFERENCES learning_outcomes(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        assessment_type VARCHAR(50) NOT NULL,
        conducted_date DATE NOT NULL,
        max_score NUMERIC(5, 2) DEFAULT 10.00,
        conducted_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        conducted_by_name VARCHAR(150),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS formative_student_scores (
        id VARCHAR(50) PRIMARY KEY,
        assessment_id VARCHAR(50) NOT NULL REFERENCES academic_formative_assessments(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        score_obtained NUMERIC(5, 2) NOT NULL,
        performance_level VARCHAR(30) NOT NULL,
        outcome_achieved BOOLEAN DEFAULT TRUE,
        teacher_observation TEXT,
        needs_support BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_formative_student UNIQUE (assessment_id, student_id)
      );

      -- 15. Remedial Support & Enrichment Plans
      CREATE TABLE IF NOT EXISTS remedial_support_plans (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        subject_id VARCHAR(50) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        topic_id VARCHAR(50) REFERENCES curriculum_topics(id) ON DELETE SET NULL,
        learning_outcome_id VARCHAR(50) REFERENCES learning_outcomes(id) ON DELETE SET NULL,
        assigned_teacher_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
        assigned_teacher_name VARCHAR(150),
        support_reason VARCHAR(100) NOT NULL,
        intervention_plan TEXT NOT NULL,
        start_date DATE NOT NULL,
        review_date DATE NOT NULL,
        target_outcome TEXT,
        sessions_conducted INT DEFAULT 0,
        status VARCHAR(30) DEFAULT 'ACTIVE',
        outcome_remarks TEXT,
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS enrichment_learning_plans (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        subject_id VARCHAR(50) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        topic_id VARCHAR(50) REFERENCES curriculum_topics(id) ON DELETE SET NULL,
        assigned_mentor_name VARCHAR(150),
        program_type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        activity_description TEXT NOT NULL,
        start_date DATE NOT NULL,
        target_completion_date DATE,
        status VARCHAR(30) DEFAULT 'ACTIVE',
        progress_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 16. Academic Interventions & Alerts
      CREATE TABLE IF NOT EXISTS academic_interventions (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        subject_id VARCHAR(50) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        issue_identified TEXT NOT NULL,
        trigger_reason VARCHAR(100) NOT NULL,
        action_plan TEXT NOT NULL,
        responsible_person_name VARCHAR(150) NOT NULL,
        target_resolution_date DATE NOT NULL,
        status VARCHAR(30) DEFAULT 'IN_PROGRESS',
        resolution_notes TEXT,
        created_by_name VARCHAR(150),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS academic_alerts (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        alert_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) DEFAULT 'WARNING',
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        class_name VARCHAR(100),
        subject_name VARCHAR(100),
        metric_delay_days INT DEFAULT 0,
        is_acknowledged BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for performance & multi-school isolation
      CREATE INDEX IF NOT EXISTS idx_curr_school ON curriculum_frameworks(school_id, session_id);
      CREATE INDEX IF NOT EXISTS idx_curr_sub_map ON curriculum_subject_maps(school_id, class_id, subject_id);
      CREATE INDEX IF NOT EXISTS idx_curr_topics_chap ON curriculum_topics(chapter_id);
      CREATE INDEX IF NOT EXISTS idx_lesson_plan_cls ON academic_lesson_plans(school_id, class_id, plan_date);
      CREATE INDEX IF NOT EXISTS idx_syl_prog_sch ON academic_syllabus_progress(school_id, class_id, subject_id);
      CREATE INDEX IF NOT EXISTS idx_acad_res_sub ON academic_resources(school_id, subject_id, class_id);
      CREATE INDEX IF NOT EXISTS idx_remedial_stu ON remedial_support_plans(student_id, status);
    `);

    // Register Phase 21 Permissions in permissions and role_permissions
    const phase21Permissions = [
      { id: 'academic.view', module: 'Academic Planning', name: 'View Academic Planning', desc: 'Inspect curriculum, syllabus, and lesson plans' },
      { id: 'academic.create', module: 'Academic Planning', name: 'Create Academic Content', desc: 'Author lesson plans, units, and learning goals' },
      { id: 'academic.edit', module: 'Academic Planning', name: 'Edit Academic Content', desc: 'Modify curriculum and syllabus progress' },
      { id: 'academic.delete', module: 'Academic Planning', name: 'Delete Academic Content', desc: 'Remove draft academic plans and resources' },
      { id: 'curriculum.view', module: 'Curriculum', name: 'View Curriculum Frameworks', desc: 'Access national and school curriculum structures' },
      { id: 'curriculum.create', module: 'Curriculum', name: 'Create Curriculum', desc: 'Formulate new curriculum frameworks and versions' },
      { id: 'curriculum.edit', module: 'Curriculum', name: 'Edit Curriculum', desc: 'Update units, chapters, and competencies' },
      { id: 'curriculum.approve', module: 'Curriculum', name: 'Approve Curriculum', desc: 'Academic coordinator / Principal approval of curriculum' },
      { id: 'curriculum.publish', module: 'Curriculum', name: 'Publish Curriculum', desc: 'Release curriculum to staff, students and parents' },
      { id: 'syllabus.view', module: 'Syllabus', name: 'View Syllabus Progress', desc: 'Track chapter completion and delay metrics' },
      { id: 'syllabus.update', module: 'Syllabus', name: 'Update Syllabus Progress', desc: 'Mark topics completed, in-progress, or deferred' },
      { id: 'lesson.view', module: 'Lesson Planner', name: 'View Lesson Plans', desc: 'View daily, weekly and monthly lesson schedules' },
      { id: 'lesson.create', module: 'Lesson Planner', name: 'Create Lesson Plans', desc: 'Author comprehensive pedagogical lesson plans' },
      { id: 'lesson.edit', module: 'Lesson Planner', name: 'Edit Lesson Plans', desc: 'Update objectives, methodology, and differentiation' },
      { id: 'lesson.publish', module: 'Lesson Planner', name: 'Publish Lesson Plans', desc: 'Approve and share lesson plans across classes' },
      { id: 'resource.view', module: 'LMS Resources', name: 'View Teaching Resources', desc: 'Access worksheets, slides, and learning media' },
      { id: 'resource.create', module: 'LMS Resources', name: 'Upload Teaching Resources', desc: 'Publish educational resources and assignments' },
      { id: 'resource.publish', module: 'LMS Resources', name: 'Publish Teaching Resources', desc: 'Authorize student and parent document visibility' },
      { id: 'academic_reports.view', module: 'Academic Reports', name: 'View Academic Analytics', desc: 'Inspect syllabus completion and remedial tracking' },
      { id: 'academic_intervention.manage', module: 'Academic Interventions', name: 'Manage Interventions', desc: 'Formulate remedial and recovery interventions' }
    ];

    for (const p of phase21Permissions) {
      await db.query(`
        INSERT INTO permissions (id, module, name, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
      `, [p.id, p.module, p.name, p.desc]);

      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_super_admin', $1) ON CONFLICT DO NOTHING`, [p.id]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_school_admin', $1) ON CONFLICT DO NOTHING`, [p.id]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_principal', $1) ON CONFLICT DO NOTHING`, [p.id]);
    }

    // Teacher permissions for Phase 21
    const teacherP21 = [
      'academic.view', 'academic.create', 'academic.edit',
      'curriculum.view', 'syllabus.view', 'syllabus.update',
      'lesson.view', 'lesson.create', 'lesson.edit', 'lesson.publish',
      'resource.view', 'resource.create', 'academic_reports.view'
    ];
    for (const pid of teacherP21) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_teacher', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    // Student & Parent permissions
    await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_student', 'curriculum.view') ON CONFLICT DO NOTHING`);
    await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_student', 'syllabus.view') ON CONFLICT DO NOTHING`);
    await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_student', 'resource.view') ON CONFLICT DO NOTHING`);

    await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_parent', 'curriculum.view') ON CONFLICT DO NOTHING`);
    await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_parent', 'syllabus.view') ON CONFLICT DO NOTHING`);
    await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_parent', 'resource.view') ON CONFLICT DO NOTHING`);

    // Check if initial Phase 21 seed exists
    const checkCurriculum = await db.query('SELECT count(*) as count FROM curriculum_frameworks');
    if (parseInt((checkCurriculum.rows[0] as any).count, 10) > 0) {
      console.log('[DB] Phase 21 Academic Planning records already seeded.');
      return;
    }

    console.log('[DB] Seeding Phase 21 Curriculum, Terms, Units, Topics, Lesson Plans, and LMS Records...');

    // 1. Update existing academic terms with Phase 21 columns
    await db.exec(`
      UPDATE academic_terms SET code = 'TERM_1', term_number = 1, teaching_weeks = 20, weightage = 40.00 WHERE id = 'term_vvps_01';
      UPDATE academic_terms SET code = 'TERM_2', term_number = 2, teaching_weeks = 18, weightage = 30.00 WHERE id = 'term_vvps_02';
      UPDATE academic_terms SET code = 'TERM_3', term_number = 3, teaching_weeks = 10, weightage = 30.00 WHERE id = 'term_vvps_03';
    `);

    // 2. Seed Curriculum Frameworks for VVPS
    const currV1Id = 'curr_vvps_cbse_2026_v1';
    await db.query(`
      INSERT INTO curriculum_frameworks (
        id, school_id, session_id, name, code, board, description,
        applicable_classes, applicable_subjects, version, status,
        effective_from, effective_to, created_by_name, approved_by_name, approved_at
      ) VALUES (
        $1, 'sch_vvps', 'sess_vvps_2526',
        'CBSE National Curriculum Framework 2025-26', 'CBSE-NCF-2025', 'CBSE',
        'National Education Policy 2020 aligned experiential pedagogical curriculum for Primary, Junior, and Secondary standards.',
        '["cls_vvps_3", "cls_vvps_7", "cls_vvps_8", "cls_vvps_11"]',
        '["sub_vvps_math", "sub_vvps_sci", "sub_vvps_soc", "sub_vvps_eng"]',
        1, 'PUBLISHED',
        '2025-04-01', '2026-03-31',
        'Rakesh Sharma (Academic Head)', 'Dr. Sunita Mishra (Principal)', CURRENT_TIMESTAMP - INTERVAL '120 days'
      ) ON CONFLICT DO NOTHING;
    `, [currV1Id]);

    // Version record for history
    await db.query(`
      INSERT INTO curriculum_versions (
        id, curriculum_id, school_id, version_number, revision_title, revision_reason,
        changes_summary, snapshot_data, status, created_by_name
      ) VALUES (
        'cver_vvps_v1', $1, 'sch_vvps', 1, 'Initial CBSE NEP 2020 Baseline Framework',
        'Annual session syllabus standardization compliant with Regional Board regulations.',
        'Incorporated 5E inquiry cycle, formative observation grids, and experiential laboratory hours.',
        '{"version": 1, "framework": "CBSE-NCF-2025", "totalUnits": 12}',
        'PUBLISHED', 'Dr. Sunita Mishra (Principal)'
      ) ON CONFLICT DO NOTHING;
    `, [currV1Id]);

    // 3. Subject Curriculum Mapping
    // Map Class 1 (cls_vvps_3) - Social Studies (sub_vvps_soc)
    const mapCls1Soc = 'csm_vvps_cls1_soc';
    await db.query(`
      INSERT INTO curriculum_subject_maps (
        id, school_id, session_id, curriculum_id, class_id, subject_id, term_id,
        coordinator_name, lead_teacher_name, weekly_periods, planned_lessons, planned_teaching_hours, status
      ) VALUES (
        $1, 'sch_vvps', 'sess_vvps_2526', $2, 'cls_vvps_3', 'sub_vvps_soc', 'term_vvps_01',
        'Priya Pandey (Junior Coordinator)', 'Anand Kumar Jha', 5, 50, 37.5, 'ACTIVE'
      ) ON CONFLICT DO NOTHING;
    `, [mapCls1Soc, currV1Id]);

    // Map Class 5 (cls_vvps_7) - Mathematics (sub_vvps_math)
    const mapCls5Math = 'csm_vvps_cls5_math';
    await db.query(`
      INSERT INTO curriculum_subject_maps (
        id, school_id, session_id, curriculum_id, class_id, subject_id, term_id,
        coordinator_name, lead_teacher_name, weekly_periods, planned_lessons, planned_teaching_hours, status
      ) VALUES (
        $1, 'sch_vvps', 'sess_vvps_2526', $2, 'cls_vvps_7', 'sub_vvps_math', 'term_vvps_01',
        'Rakesh Sharma (Math HOD)', 'Anand Kumar Jha', 6, 60, 45.0, 'ACTIVE'
      ) ON CONFLICT DO NOTHING;
    `, [mapCls5Math, currV1Id]);

    // 4. Units for Class 5 Mathematics
    const unit1Id = 'cunit_mth_01';
    const unit2Id = 'cunit_mth_02';
    await db.query(`
      INSERT INTO curriculum_units (id, school_id, subject_map_id, term_id, unit_number, title, description, weightage_marks, planned_periods, sort_order)
      VALUES
      ($1, 'sch_vvps', $2, 'term_vvps_01', 1, 'Unit 1: Number Sense & Place Value Foundations', 'Understanding 7-digit numbers, Indian and International place value charts, operations, and estimation.', 25.00, 16, 1),
      ($3, 'sch_vvps', $2, 'term_vvps_01', 2, 'Unit 2: Fractions, Decimals & Proportions', 'Fractional arithmetic, mixed numerals, decimal place conversion, and proportional reasoning.', 25.00, 18, 2)
      ON CONFLICT DO NOTHING;
    `, [unit1Id, mapCls5Math, unit2Id]);

    // Units for Class 1 Social Studies
    const unitSoc1 = 'cunit_soc_01';
    await db.query(`
      INSERT INTO curriculum_units (id, school_id, subject_map_id, term_id, unit_number, title, description, weightage_marks, planned_periods, sort_order)
      VALUES
      ($1, 'sch_vvps', $2, 'term_vvps_01', 1, 'Unit 1: My Family, Home & Neighborhood', 'Basic awareness of family structures, community helpers, school environment, and safety habits.', 30.00, 14, 1)
      ON CONFLICT DO NOTHING;
    `, [unitSoc1, mapCls1Soc]);

    // 5. Chapters
    const chap1Id = 'cchap_mth_01';
    const chap2Id = 'cchap_mth_02';
    await db.query(`
      INSERT INTO curriculum_chapters (id, unit_id, school_id, chapter_number, title, description, estimated_teaching_hours, sort_order)
      VALUES
      ($1, $2, 'sch_vvps', 1, 'Chapter 1: Multi-Digit Whole Numbers & Place Values', 'Place values up to Crores and Millions, expanded notation, and comparison of large numbers.', 8.0, 1),
      ($3, $2, 'sch_vvps', 2, 'Chapter 2: Fundamental Arithmetic Operations & Word Problems', 'Multi-digit multiplication, long division algorithms, and multi-step situational word problems.', 8.0, 2)
      ON CONFLICT DO NOTHING;
    `, [chap1Id, unit1Id, chap2Id]);

    const chapSoc1 = 'cchap_soc_01';
    await db.query(`
      INSERT INTO curriculum_chapters (id, unit_id, school_id, chapter_number, title, description, estimated_teaching_hours, sort_order)
      VALUES
      ($1, $2, 'sch_vvps', 1, 'Chapter 1: Our Helpers in the Neighborhood', 'Recognizing doctors, postmen, firefighters, police officers, and teachers.', 7.0, 1)
      ON CONFLICT DO NOTHING;
    `, [chapSoc1, unitSoc1]);

    // 6. Topics
    const top1Id = 'ctop_mth_001';
    const top2Id = 'ctop_mth_002';
    const top3Id = 'ctop_mth_003';
    const top4Id = 'ctop_mth_004';
    await db.query(`
      INSERT INTO curriculum_topics (
        id, chapter_id, school_id, topic_code, title, description,
        learning_objectives, competencies, estimated_periods, difficulty_level,
        recommended_activities, recommended_resources, prerequisites, sort_order, status
      ) VALUES
      (
        $1, $5, 'sch_vvps', 'MTH-5-01-01',
        'Indian vs International Place Value Notation',
        'Comparison of periods, commas, and numeric names across both numbering systems.',
        'Convert 7-digit figures between Indian and International systems accurately.',
        'Numerical Representation, Spatial Grouping',
        3, 'MEDIUM',
        'Place Value Chart Abacus relay, Newspaper headline large numbers scavenger hunt.',
        'Place Value Chart Worksheet PDF, Interactive Abacus Simulator.',
        'Understanding of 5-digit numbers', 1, 'ACTIVE'
      ),
      (
        $2, $5, 'sch_vvps', 'MTH-5-01-02',
        'Rounding Off & Real-World Estimation',
        'Rounding numbers to the nearest tens, hundreds, thousands, and ten-thousands for rapid estimations.',
        'Estimate grocery bills, travel distances, and school attendance with reasonable approximations.',
        'Analytical Approximation, Mental Math',
        2, 'EASY',
        'Supermarket Budgeting Challenge, Ticket sales estimation workshop.',
        'Estimation Game Flashcards, Worksheet 2.',
        'Basic addition and place value grouping', 2, 'ACTIVE'
      ),
      (
        $3, $6, 'sch_vvps', 'MTH-5-02-01',
        'Lattice and Standard Algorithm Multiplication',
        'Multiplying 4-digit numbers by 2-digit and 3-digit multipliers with carryover checks.',
        'Solve multi-digit products with zero error and verify answers using digital root checks.',
        'Algorithmic Accuracy, Problem Solving',
        4, 'HARD',
        'Lattice Grid competition, Peer error-spotting codebreaker game.',
        'Multiplication Drill Sheets, Video Tutorial link.',
        'Times tables up to 15', 1, 'ACTIVE'
      ),
      (
        $4, $6, 'sch_vvps', 'MTH-5-02-02',
        'Multi-Step Word Problems in Real Situations',
        'Deconstructing verbal problems into mathematical statements involving mixed operations.',
        'Identify key mathematical operators from English word scenarios and formulate equations.',
        'Critical Thinking, Mathematical Modeling',
        3, 'HARD',
        'Roleplay School Canteen Management, Field Trip Budget planning in teams.',
        'Word Problem Task Cards, Diagnostic Rubric.',
        'Mastery of four basic arithmetic operations', 2, 'ACTIVE'
      )
      ON CONFLICT DO NOTHING;
    `, [top1Id, top2Id, top3Id, top4Id, chap1Id, chap2Id]);

    // Topic for Class 1 Social Studies
    const topSoc1 = 'ctop_soc_001';
    await db.query(`
      INSERT INTO curriculum_topics (
        id, chapter_id, school_id, topic_code, title, description,
        learning_objectives, competencies, estimated_periods, difficulty_level,
        recommended_activities, recommended_resources, prerequisites, sort_order, status
      ) VALUES (
        $1, $2, 'sch_vvps', 'SOC-1-01-01',
        'Community Helpers & Their Vital Roles',
        'Learning who community helpers are and how they assist in daily life.',
        'Identify at least 6 neighborhood workers and match them to their tools.',
        'Civic Awareness, Empathy, Observation',
        3, 'EASY',
        'Costume Dress-up parade, Thank You card workshop for school housekeeping staff.',
        'Illustrated Picture Cards, Audio Storybook.',
        'Basic spoken English vocabulary', 1, 'ACTIVE'
      ) ON CONFLICT DO NOTHING;
    `, [topSoc1, chapSoc1]);

    // 7. Learning Outcomes
    const lo1Id = 'lo_vvps_mth_01';
    const lo2Id = 'lo_vvps_mth_02';
    const loSoc1 = 'lo_vvps_soc_01';
    await db.query(`
      INSERT INTO learning_outcomes (id, school_id, session_id, class_id, subject_id, code, title, description, competency_category, expected_level)
      VALUES
      (
        $1, 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_7', 'sub_vvps_math', 'LO-MTH5-01',
        'Fluency with 7-digit place values and conversion across Indian and International systems',
        'Student demonstrates effortless parsing and representation of numbers up to 1,00,00,000.',
        'APPLICATION', 'PROFICIENT'
      ),
      (
        $2, 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_7', 'sub_vvps_math', 'LO-MTH5-02',
        'Formulate mathematical representations and solve real-world multi-step arithmetic problems',
        'Student can translate compound real-world financial and logistics scenarios into accurate calculations.',
        'PROBLEM_SOLVING', 'ADVANCED'
      ),
      (
        $3, 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_3', 'sub_vvps_soc', 'LO-SOC1-01',
        'Demonstrate understanding of community interdependence and respect for civic helpers',
        'Student articulates the role of doctors, police, firefighters, and sanitation personnel.',
        'UNDERSTANDING', 'PROFICIENT'
      )
      ON CONFLICT (school_id, session_id, code) DO NOTHING;
    `, [lo1Id, lo2Id, loSoc1]);

    // Map Topics to Learning Outcomes
    await db.query(`
      INSERT INTO topic_learning_outcomes (id, topic_id, outcome_id)
      VALUES
      ('tlo_001', $1, $2),
      ('tlo_002', $3, $4),
      ('tlo_003', $5, $6)
      ON CONFLICT DO NOTHING;
    `, [top1Id, lo1Id, top4Id, lo2Id, topSoc1, loSoc1]);

    // 8. Reusable Lesson Plan Templates
    await db.query(`
      INSERT INTO lesson_plan_templates (id, school_id, name, scope, subject_category, template_structure, created_by_name)
      VALUES
      (
        'tmpl_vvps_5e', 'sch_vvps', '5E Pedagogical Inquiry Model (NEP 2020)', 'SCHOOL', 'STEM & Mathematics',
        '{"steps": ["Engage: Hook question & phenomenon video", "Explore: Collaborative hands-on inquiry", "Explain: Concept formalization & vocabulary", "Elaborate: Real-world transfer challenge", "Evaluate: Formative check & exit slip"]}',
        'Rakesh Sharma (Academic Head)'
      ),
      (
        'tmpl_vvps_experiential', 'sch_vvps', 'Direct Experiential & Activity-Based Model', 'SCHOOL', 'Social Sciences & Primary',
        '{"steps": ["Introduction & Daily Life Context", "Storytelling / Sensory Demonstration", "Student Activity / Roleplay", "Formative Peer Review", "Application Assignment"]}',
        'Priya Pandey (Primary In-charge)'
      )
      ON CONFLICT DO NOTHING;
    `);

    // 9. Lesson Plans
    await db.query(`
      INSERT INTO academic_lesson_plans (
        id, school_id, session_id, class_id, section_id, subject_id, topic_id,
        teacher_employee_id, teacher_name, lesson_title, plan_date, period_number,
        duration_minutes, learning_objectives, learning_outcomes, teaching_methodology,
        pedagogical_steps, differentiation_strategy, required_resources, classroom_activities,
        homework_summary, formative_assessment_summary, status, reviewed_by_name, completed_at
      ) VALUES
      (
        'lp_vvps_001', 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_7', 'sec_cls_vvps_7_a', 'sub_vvps_math', $1,
        'emp_vvps_004', 'Anand Kumar Jha', 'Mastering the International Place Value System (Millions & Billions)',
        CURRENT_DATE, 'Period 2 (08:45 AM - 09:30 AM)', 45,
        'Students will read, write, and group 7-digit numbers using commas according to International periods.',
        'LO-MTH5-01: Fluency with place values and system interchange',
        'EXPERIENTIAL',
        '{"engage": "Display population census figures of Tokyo, New York, and Mumbai.", "explore": "Students group beads on 3-period abacus boards.", "explain": "Introduce terms: Units, Thousands, Millions with 3-digit comma intervals.", "practice": "Interactive board conversion races.", "evaluate": "3-question rapid exit tickets."}',
        'Support: Provided colored comma guide strips for struggling students. Extension: Calculate speed of light distance in International periods.',
        'Abacus kits, Laminated 3-comma place value charts, Exit slips.',
        'Team Speed Conversion Relay & Board Race.',
        'Complete Exercise 1.2 Problems 4 through 12 in Coursebook.',
        'Oral questioning + 5-point exit slip evaluation.',
        'COMPLETED', 'Rakesh Sharma (HOD)', CURRENT_TIMESTAMP - INTERVAL '2 hours'
      ),
      (
        'lp_vvps_002', 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_7', 'sec_cls_vvps_7_a', 'sub_vvps_math', $2,
        'emp_vvps_004', 'Anand Kumar Jha', 'Rounding Off to Nearest Thousands in Real-Life Scenarios',
        CURRENT_DATE + INTERVAL '1 day', 'Period 1 (08:00 AM - 08:45 AM)', 45,
        'Students will round off 5-digit numbers to nearest thousand and formulate grocery budget estimates.',
        'LO-MTH5-01: Practical estimation and mental math approximations',
        'INQUIRY_BASED',
        '{"engage": "Supermarket checkout scenario - guessing the total price.", "explore": "Number line hill roller-coaster analogy for rounding rules.", "explain": "Rules for 5 and above rounding up.", "practice": "Pair budgeting task.", "evaluate": "Checklist assessment."}',
        'Tiered challenge cards: Tier 1 (tens/hundreds), Tier 2 (thousands), Tier 3 (composite shopping discounts).',
        'Number line chalk floor charts, Printed grocery product flyers.',
        'Pair Supermarket Estimation Simulation.',
        'Workbook Page 14: Estimation drills.',
        'Observation rubric of peer interaction.',
        'PLANNED', 'Rakesh Sharma (HOD)', NULL
      ),
      (
        'lp_vvps_003', 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_3', 'sec_cls_vvps_3_a', 'sub_vvps_soc', $3,
        'emp_vvps_004', 'Anand Kumar Jha', 'Community Helpers: Doctors, Nurses & First Responders',
        CURRENT_DATE, 'Period 5 (12:00 PM - 12:45 PM)', 45,
        'Identify roles of healthcare personnel and appreciate the emergency 108 helpline service.',
        'LO-SOC1-01: Recognize neighborhood workers and emergency communication',
        'COLLABORATIVE',
        '{"engage": "Play sound of ambulance siren and ask students who is inside.", "explore": "Examine toy stethoscope, bandage, and first aid kit.", "explain": "Explain why doctors and nurses are essential community pillars.", "practice": "Draw your favorite community helper in drawing book.", "evaluate": "Matching helper to their tools worksheet."}',
        'Visual flashcards for bilingual learners; sensory touching of medical bandages.',
        'First Aid Box props, Illustrated poster of Emergency 108 vehicle.',
        'Roleplay doctor and patient consultation in pairs.',
        'Color the Fire Engine and Doctor illustration worksheet.',
        'Formative pictorial matching test.',
        'COMPLETED', 'Priya Pandey (Primary Coordinator)', CURRENT_TIMESTAMP - INTERVAL '1 hour'
      )
      ON CONFLICT DO NOTHING;
    `, [top1Id, top2Id, topSoc1]);

    // 10. Syllabus Progress
    await db.query(`
      INSERT INTO academic_syllabus_progress (
        id, school_id, session_id, class_id, section_id, subject_id, topic_id,
        teacher_employee_id, planned_start_date, planned_end_date, actual_start_date, actual_completion_date,
        teaching_hours_delivered, status, completion_percentage, teacher_notes
      ) VALUES
      (
        'syl_mth_001', 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_7', 'sec_cls_vvps_7_a', 'sub_vvps_math', $1,
        'emp_vvps_004', '2025-04-05', '2025-04-12', '2025-04-05', '2025-04-11',
        4.0, 'COMPLETED', 100, 'Excellent class participation. 92% scored above proficient on exit check.'
      ),
      (
        'syl_mth_002', 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_7', 'sec_cls_vvps_7_a', 'sub_vvps_math', $2,
        'emp_vvps_004', '2025-04-14', '2025-04-20', '2025-04-15', NULL,
        2.5, 'IN_PROGRESS', 65, 'Estimation rules explained. Practical shopping game scheduled tomorrow.'
      ),
      (
        'syl_mth_003', 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_7', 'sec_cls_vvps_7_a', 'sub_vvps_math', $3,
        'emp_vvps_004', '2025-04-22', '2025-04-30', NULL, NULL,
        0.0, 'NOT_STARTED', 0, 'Upcoming topic for Unit 1 Chapter 2.'
      ),
      (
        'syl_mth_004', 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_7', 'sec_cls_vvps_7_a', 'sub_vvps_math', $4,
        'emp_vvps_004', '2025-05-02', '2025-05-10', NULL, NULL,
        0.0, 'DEFERRED', 0, 'Deferred by 3 days due to Inter-School Annual Sports Conclave rehearsals.'
      ),
      (
        'syl_soc_001', 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_3', 'sec_cls_vvps_3_a', 'sub_vvps_soc', $5,
        'emp_vvps_004', '2025-04-05', '2025-04-15', '2025-04-05', '2025-04-14',
        3.5, 'COMPLETED', 100, 'All students successfully matched community helpers to their civic duties.'
      )
      ON CONFLICT (school_id, session_id, class_id, section_id, subject_id, topic_id) DO NOTHING;
    `, [top1Id, top2Id, top3Id, top4Id, topSoc1]);

    // 11. Teaching Resources (Worksheets, PDFs, Presentations)
    await db.query(`
      INSERT INTO academic_resources (
        id, school_id, session_id, title, resource_type, file_url, file_name, file_size_bytes,
        class_id, subject_id, topic_id, visibility, uploaded_by_name, approval_status, downloads_count
      ) VALUES
      (
        'res_mth_001', 'sch_vvps', 'sess_vvps_2526', 'Place Value Master Drill & International Chart Guide',
        'WORKSHEET', '/assets/academic/place_value_guide_class5.pdf', 'place_value_guide_class5.pdf', 384000,
        'cls_vvps_7', 'sub_vvps_math', $1, 'STUDENT_VISIBLE', 'Anand Kumar Jha', 'APPROVED', 42
      ),
      (
        'res_mth_002', 'sch_vvps', 'sess_vvps_2526', 'NEP 2020 Multi-Digit Multiplication Codebreaker Challenge',
        'WORKSHEET', '/assets/academic/multiplication_codebreaker.pdf', 'multiplication_codebreaker.pdf', 512000,
        'cls_vvps_7', 'sub_vvps_math', $2, 'STUDENT_VISIBLE', 'Anand Kumar Jha', 'APPROVED', 28
      ),
      (
        'res_mth_003', 'sch_vvps', 'sess_vvps_2526', 'Teacher Lesson Reference Notes: Mental Math Shortcut Systems',
        'NOTES_PDF', '/assets/academic/mental_math_teacher_notes.pdf', 'mental_math_teacher_notes.pdf', 248000,
        'cls_vvps_7', 'sub_vvps_math', $1, 'PRIVATE_TEACHER', 'Anand Kumar Jha', 'APPROVED', 5
      ),
      (
        'res_soc_001', 'sch_vvps', 'sess_vvps_2526', 'Community Helpers Illustrated Flashcards & Coloring Sheets',
        'WORKSHEET', '/assets/academic/community_helpers_class1.pdf', 'community_helpers_class1.pdf', 840000,
        'cls_vvps_3', 'sub_vvps_soc', $3, 'STUDENT_VISIBLE', 'Anand Kumar Jha', 'APPROVED', 35
      )
      ON CONFLICT DO NOTHING;
    `, [top1Id, top3Id, topSoc1]);

    // 12. Formative Assessments & Student Scores
    const fa1Id = 'fa_vvps_mth_01';
    await db.query(`
      INSERT INTO academic_formative_assessments (
        id, school_id, session_id, class_id, section_id, subject_id, topic_id, learning_outcome_id,
        title, assessment_type, conducted_date, max_score, conducted_by_name
      ) VALUES (
        $1, 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_7', 'sec_cls_vvps_7_a', 'sub_vvps_math', $2, $3,
        'Place Value & International Numbering Rapid Quiz', 'QUIZ', CURRENT_DATE - INTERVAL '2 days', 10.00,
        'Anand Kumar Jha'
      ) ON CONFLICT DO NOTHING;
    `, [fa1Id, top1Id, lo1Id]);

    // Student scores for Ananya Sharma (stu_vvps_002) in Class 5-A
    await db.query(`
      INSERT INTO formative_student_scores (
        id, assessment_id, student_id, score_obtained, performance_level, outcome_achieved, teacher_observation, needs_support
      ) VALUES
      (
        'fss_001', $1, 'stu_vvps_002', 9.50, 'ADVANCED', true,
        'Superb conceptual command of millions and commas. Quick and flawless calculations.', false
      )
      ON CONFLICT DO NOTHING;
    `, [fa1Id]);

    // Formative check for Class 1-A (Aarav Kumar)
    const faSocId = 'fa_vvps_soc_01';
    await db.query(`
      INSERT INTO academic_formative_assessments (
        id, school_id, session_id, class_id, section_id, subject_id, topic_id, learning_outcome_id,
        title, assessment_type, conducted_date, max_score, conducted_by_name
      ) VALUES (
        $1, 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_3', 'sec_cls_vvps_3_a', 'sub_vvps_soc', $2, $3,
        'Community Helpers Identification Activity', 'ACTIVITY', CURRENT_DATE - INTERVAL '1 day', 10.00,
        'Anand Kumar Jha'
      ) ON CONFLICT DO NOTHING;
    `, [faSocId, topSoc1, loSoc1]);

    await db.query(`
      INSERT INTO formative_student_scores (
        id, assessment_id, student_id, score_obtained, performance_level, outcome_achieved, teacher_observation, needs_support
      ) VALUES
      (
        'fss_002', $1, 'stu_vvps_001', 9.00, 'PROFICIENT', true,
        'Aarav actively demonstrated stethoscope and identified 108 emergency vehicle with high enthusiasm.', false
      )
      ON CONFLICT DO NOTHING;
    `, [faSocId]);

    // 13. Remedial Support Plan
    await db.query(`
      INSERT INTO remedial_support_plans (
        id, school_id, session_id, student_id, subject_id, topic_id, learning_outcome_id,
        assigned_teacher_name, support_reason, intervention_plan, start_date, review_date,
        target_outcome, sessions_conducted, status, outcome_remarks
      ) VALUES
      (
        'rem_vvps_001', 'sch_vvps', 'sess_vvps_2526', 'stu_vvps_002', 'sub_vvps_math', $1, $2,
        'Anand Kumar Jha', 'CONCEPTUAL_DIFFICULTY',
        'Special 20-minute morning guided practice focusing on multi-digit carrying in lattice multiplication.',
        CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '10 days',
        'Achieve 80%+ accuracy on 3-digit multiplication diagnostic tests.', 2, 'ACTIVE',
        'Showing steady improvement in vertical alignment and times table recall.'
      ) ON CONFLICT DO NOTHING;
    `, [top3Id, lo2Id]);

    // 14. Enrichment Learning Plan
    await db.query(`
      INSERT INTO enrichment_learning_plans (
        id, school_id, session_id, student_id, subject_id, topic_id,
        assigned_mentor_name, program_type, title, activity_description, start_date, target_completion_date, status, progress_notes
      ) VALUES
      (
        'enr_vvps_001', 'sch_vvps', 'sess_vvps_2526', 'stu_vvps_002', 'sub_vvps_math', $1,
        'Anand Kumar Jha', 'OLYMPIAD_PREPARATION',
        'National Math Olympiad (NMO) Junior Cryptarithm Clinic',
        'Advanced problem solving in mathematical logic, base-10 number puzzles, and geometry proofs.',
        CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '30 days', 'ACTIVE',
        'Completed Set A cryptarithms; scored 18/20 on first speed sprint.'
      ) ON CONFLICT DO NOTHING;
    `, [top1Id]);

    // 15. Academic Interventions & Alerts
    await db.query(`
      INSERT INTO academic_interventions (
        id, school_id, session_id, class_id, subject_id, issue_identified, trigger_reason,
        action_plan, responsible_person_name, target_resolution_date, status, resolution_notes, created_by_name
      ) VALUES
      (
        'intv_vvps_001', 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_7', 'sub_vvps_math',
        'Class 5-A Mathematics is 3 days behind planned calendar due to rehearsal closures.',
        'SYLLABUS_BEHIND_SCHEDULE',
        'Convene two 30-minute zero-period remedial problem clinics on Tuesday and Thursday morning.',
        'Anand Kumar Jha (Lead Faculty)', CURRENT_DATE + INTERVAL '7 days', 'IN_PROGRESS',
        'First extra session conducted with 94% student attendance.', 'Rakesh Sharma (Academic Head)'
      ) ON CONFLICT DO NOTHING;
    `);

    await db.query(`
      INSERT INTO academic_alerts (
        id, school_id, alert_type, severity, title, description, class_name, subject_name, metric_delay_days, is_acknowledged
      ) VALUES
      (
        'alt_vvps_001', 'sch_vvps', 'DEFERRED_TOPICS', 'WARNING',
        'Multi-Step Word Problems topic deferred in Class 5-A',
        'Topic was deferred by 3 days due to sports day practice. Recovery intervention active.',
        'Class 5', 'Mathematics', 3, false
      ),
      (
        'alt_vvps_002', 'sch_vvps', 'ASSESSMENT_PENDING', 'INFO',
        'Mid-Term Formative Checkpoint approaching in 5 days',
        'Ensure all 4 unit topics have recorded at least one formative observation.',
        'Class 1', 'Social Science', 0, false
      )
      ON CONFLICT DO NOTHING;
    `);

    console.log('[DB] Phase 21 Academic Planning & LMS schema and seed initialized successfully.');
  } catch (err: any) {
    (globalThis as any).__phase21Error = err?.message || String(err);
    console.error('[DB PHASE 21 INIT ERROR]', err);
  }
}
