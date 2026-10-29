import type { PGlite } from '@electric-sql/pglite';

export async function ensurePhase17SchemaAndData(db: PGlite) {
  try {
    console.log('[DB] Checking Phase 17 Advanced Reports, MIS Dashboard & Analytics schema...');

    await db.exec(`
      CREATE TABLE IF NOT EXISTS saved_reports (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        module VARCHAR(50) NOT NULL,
        selected_fields TEXT NOT NULL,
        filters TEXT NOT NULL,
        sort_by VARCHAR(50),
        sort_order VARCHAR(10) DEFAULT 'ASC',
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_by_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS scheduled_reports (
        id VARCHAR(50) PRIMARY KEY,
        saved_report_id VARCHAR(50) REFERENCES saved_reports(id) ON DELETE CASCADE,
        school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        frequency VARCHAR(20) NOT NULL,
        recipients TEXT NOT NULL,
        format VARCHAR(10) DEFAULT 'csv',
        status VARCHAR(20) DEFAULT 'active',
        last_run_at TIMESTAMP WITH TIME ZONE,
        next_run_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS mis_alert_thresholds (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
        min_student_attendance_pct NUMERIC(5, 2) DEFAULT 80.0,
        min_staff_attendance_pct NUMERIC(5, 2) DEFAULT 85.0,
        fee_overdue_aging_days INT DEFAULT 30,
        fee_overdue_amount_threshold NUMERIC(10, 2) DEFAULT 5000.0,
        low_inventory_buffer INT DEFAULT 5,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if initial reports are seeded
    const reportCheck = await db.query('SELECT count(*) as count FROM saved_reports');
    const count = parseInt((reportCheck.rows[0] as any)?.count || '0', 10);

    if (count === 0) {
      console.log('[DB] Seeding Phase 17 default MIS saved reports & templates...');

      // Seed default saved reports for VVPS and GISK
      const seedReports = [
        {
          id: 'rep_def_01',
          school_id: 'sch_vvps',
          title: 'Comprehensive Student Roster & Enrollment',
          description: 'Detailed active student roster with class, section, admission date, category, and guardian contacts',
          module: 'students',
          selected_fields: JSON.stringify(['admission_number', 'first_name', 'last_name', 'class_name', 'section_name', 'gender', 'category', 'mobile_number', 'student_status']),
          filters: JSON.stringify([{ field: 'student_status', operator: 'equals', value: 'ACTIVE' }]),
          sort_by: 'admission_number',
          sort_order: 'ASC',
          created_by_name: 'System Admin'
        },
        {
          id: 'rep_def_02',
          school_id: 'sch_vvps',
          title: 'Fee Dues & Aging Defaulters List',
          description: 'Students with overdue fee balances segregated by aging buckets for cashier follow-up',
          module: 'fees',
          selected_fields: JSON.stringify(['admission_number', 'student_name', 'class_name', 'section_name', 'total_charges', 'paid_amount', 'outstanding_balance', 'status']),
          filters: JSON.stringify([{ field: 'outstanding_balance', operator: 'greater_than', value: '0' }]),
          sort_by: 'outstanding_balance',
          sort_order: 'DESC',
          created_by_name: 'Chief Accountant'
        },
        {
          id: 'rep_def_03',
          school_id: 'sch_vvps',
          title: 'Chronic Absenteeism Risk Register (<75%)',
          description: 'Students with total attendance below standard CBSE board examination eligibility threshold',
          module: 'attendance',
          selected_fields: JSON.stringify(['admission_number', 'first_name', 'last_name', 'class_name', 'section_name', 'attendance_pct', 'total_days', 'days_present', 'days_absent']),
          filters: JSON.stringify([{ field: 'attendance_pct', operator: 'less_than', value: '75' }]),
          sort_by: 'attendance_pct',
          sort_order: 'ASC',
          created_by_name: 'Academic Supervisor'
        },
        {
          id: 'rep_def_04',
          school_id: 'sch_vvps',
          title: 'Examination Grade Distribution & Top Achievers',
          description: 'Term exam performance records with student marks, percentages, grades, and pass/fail standing',
          module: 'exams',
          selected_fields: JSON.stringify(['student_name', 'admission_number', 'exam_name', 'class_name', 'total_marks', 'obtained_marks', 'percentage', 'grade', 'result_status']),
          filters: JSON.stringify([{ field: 'result_status', operator: 'equals', value: 'PASSED' }]),
          sort_by: 'percentage',
          sort_order: 'DESC',
          created_by_name: 'Examination In-Charge'
        },
        {
          id: 'rep_def_05',
          school_id: 'sch_vvps',
          title: 'Critical Inventory Stock & Reorder Requisitions',
          description: 'Consumables, stationery, and laboratory supplies at or below minimum buffer threshold',
          module: 'inventory',
          selected_fields: JSON.stringify(['item_name', 'item_code', 'category_name', 'current_stock', 'reorder_level', 'unit', 'unit_price', 'status']),
          filters: JSON.stringify([{ field: 'status', operator: 'equals', value: 'LOW_STOCK' }]),
          sort_by: 'current_stock',
          sort_order: 'ASC',
          created_by_name: 'Store Manager'
        }
      ];

      for (const rep of seedReports) {
        await db.query(`
          INSERT INTO saved_reports (
            id, school_id, title, description, module, selected_fields, filters, sort_by, sort_order, created_by_name
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          rep.id, rep.school_id, rep.title, rep.description, rep.module,
          rep.selected_fields, rep.filters, rep.sort_by, rep.sort_order, rep.created_by_name
        ]);
      }

      // Seed default scheduled reports
      await db.query(`
        INSERT INTO scheduled_reports (
          id, saved_report_id, school_id, title, frequency, recipients, format, status, last_run_at, next_run_at
        ) VALUES
        (
          'sch_rep_01', 'rep_def_02', 'sch_vvps', 'Weekly Fee Defaulters Summary',
          'weekly', 'principal@vidyavahini.edu.in, accounts@vidyavahini.edu.in',
          'excel', 'active', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '5 days'
        ),
        (
          'sch_rep_02', 'rep_def_03', 'sch_vvps', 'Monthly Attendance Exception Digest',
          'monthly', 'academic.coordinator@vidyavahini.edu.in',
          'pdf', 'active', CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP + INTERVAL '18 days'
        );
      `);

      // Seed default alert thresholds for schools
      await db.query(`
        INSERT INTO mis_alert_thresholds (id, school_id, min_student_attendance_pct, min_staff_attendance_pct, fee_overdue_aging_days, fee_overdue_amount_threshold, low_inventory_buffer)
        VALUES
        ('alt_vvps', 'sch_vvps', 80.0, 85.0, 30, 5000.0, 5),
        ('alt_gisk', 'sch_gisk', 80.0, 85.0, 30, 5000.0, 5)
        ON CONFLICT (school_id) DO NOTHING;
      `);
    }

    console.log('[DB] Phase 17 MIS & Analytics schema verified.');
  } catch (err) {
    console.error('[DB PHASE 17 INIT ERROR]', err);
  }
}
