import type { PGlite } from '@electric-sql/pglite';

export async function ensurePhase12SchemaAndData(db: PGlite) {
  try {
    console.log('[DB] Checking Phase 12 HR, Payroll & Staff Management schema...');

    // 1. Create Core HR & Payroll Architecture Tables
    await db.exec(`
      -- 1. Salary Pay Heads Master (Earnings & Deductions)
      CREATE TABLE IF NOT EXISTS salary_pay_heads (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(30) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('EARNING', 'DEDUCTION')),
        category VARCHAR(50) DEFAULT 'STANDARD',
        calculation_type VARCHAR(30) NOT NULL DEFAULT 'FLAT' CHECK (calculation_type IN ('FLAT', 'PERCENT_OF_BASIC', 'PERCENT_OF_GROSS')),
        default_value NUMERIC(10, 2) DEFAULT 0,
        is_taxable BOOLEAN DEFAULT true,
        is_statutory BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, code)
      );

      -- 2. Salary Structures / Grade Templates
      CREATE TABLE IF NOT EXISTS salary_structures (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        base_gross_monthly NUMERIC(12, 2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, code)
      );

      -- 3. Salary Structure Items (Heads attached to grades)
      CREATE TABLE IF NOT EXISTS salary_structure_items (
        id VARCHAR(50) PRIMARY KEY,
        structure_id VARCHAR(50) NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
        pay_head_id VARCHAR(50) NOT NULL REFERENCES salary_pay_heads(id) ON DELETE CASCADE,
        calculation_type VARCHAR(30) NOT NULL DEFAULT 'FLAT',
        rate_or_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 4. Employee Salary Profiles / Compensation Assignments
      CREATE TABLE IF NOT EXISTS employee_salary_assignments (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        structure_id VARCHAR(50) REFERENCES salary_structures(id) ON DELETE SET NULL,
        effective_from DATE NOT NULL,
        ctc_annual NUMERIC(12, 2) NOT NULL DEFAULT 0,
        gross_monthly NUMERIC(12, 2) NOT NULL DEFAULT 0,
        basic_pay NUMERIC(12, 2) NOT NULL DEFAULT 0,
        bank_name VARCHAR(100),
        bank_account_number VARCHAR(50),
        bank_ifsc VARCHAR(20),
        pan_number VARCHAR(20),
        pf_uan_number VARCHAR(50),
        esi_number VARCHAR(50),
        payment_mode VARCHAR(30) DEFAULT 'BANK_TRANSFER',
        status VARCHAR(20) DEFAULT 'ACTIVE',
        custom_heads_json JSONB DEFAULT '[]',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, effective_from)
      );

      -- 5. Leave Types Master
      CREATE TABLE IF NOT EXISTS leave_types (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        code VARCHAR(20) NOT NULL,
        annual_quota NUMERIC(4, 1) DEFAULT 12,
        is_carry_forward BOOLEAN DEFAULT false,
        is_paid BOOLEAN DEFAULT true,
        requires_document BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, code)
      );

      -- 6. Employee Leave Quotas & Balances
      CREATE TABLE IF NOT EXISTS employee_leave_balances (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        leave_type_id VARCHAR(50) NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
        session_id VARCHAR(50) REFERENCES academic_sessions(id) ON DELETE CASCADE,
        allocated NUMERIC(4, 1) NOT NULL DEFAULT 12,
        used NUMERIC(4, 1) NOT NULL DEFAULT 0,
        pending NUMERIC(4, 1) NOT NULL DEFAULT 0,
        balance NUMERIC(4, 1) NOT NULL DEFAULT 12,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, leave_type_id, session_id)
      );

      -- 7. Leave Applications & Workflow
      CREATE TABLE IF NOT EXISTS employee_leave_applications (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        leave_type_id VARCHAR(50) NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_days NUMERIC(4, 1) NOT NULL,
        reason TEXT NOT NULL,
        document_url TEXT,
        applicant_remarks TEXT,
        substitute_employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
        reviewed_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        reviewed_by_name VARCHAR(100),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        reviewer_comments TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 8. Staff Advances & Loans
      CREATE TABLE IF NOT EXISTS employee_loans (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        loan_type VARCHAR(50) DEFAULT 'SALARY_ADVANCE',
        principal_amount NUMERIC(12, 2) NOT NULL,
        disbursement_date DATE NOT NULL,
        repayment_months INT NOT NULL DEFAULT 6,
        monthly_emi NUMERIC(10, 2) NOT NULL,
        total_repaid NUMERIC(12, 2) DEFAULT 0,
        balance_amount NUMERIC(12, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'WRITTEN_OFF')),
        reason TEXT,
        approved_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 9. Loan Repayment Records
      CREATE TABLE IF NOT EXISTS employee_loan_repayments (
        id VARCHAR(50) PRIMARY KEY,
        loan_id VARCHAR(50) NOT NULL REFERENCES employee_loans(id) ON DELETE CASCADE,
        payroll_item_id VARCHAR(50),
        repayment_date DATE NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        payment_mode VARCHAR(30) DEFAULT 'PAYROLL_DEDUCTION',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 10. Monthly Payroll Cycles (Batch Runs)
      CREATE TABLE IF NOT EXISTS payroll_cycles (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        title VARCHAR(100) NOT NULL,
        month INT NOT NULL,
        year INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_working_days INT NOT NULL DEFAULT 26,
        total_employees INT DEFAULT 0,
        total_gross NUMERIC(14, 2) DEFAULT 0,
        total_deductions NUMERIC(14, 2) DEFAULT 0,
        total_net_payable NUMERIC(14, 2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CALCULATED', 'APPROVED', 'DISBURSED', 'CANCELLED')),
        calculated_at TIMESTAMP WITH TIME ZONE,
        approved_at TIMESTAMP WITH TIME ZONE,
        approved_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        approved_by_name VARCHAR(100),
        disbursed_at TIMESTAMP WITH TIME ZONE,
        disbursed_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        payment_mode VARCHAR(30) DEFAULT 'BANK_TRANSFER',
        disbursement_ref VARCHAR(100),
        expense_record_id VARCHAR(50) REFERENCES expenses(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, year, month)
      );

      -- 11. Payroll Items (Itemized Salary Records & Payslips)
      CREATE TABLE IF NOT EXISTS payroll_items (
        id VARCHAR(50) PRIMARY KEY,
        cycle_id VARCHAR(50) NOT NULL REFERENCES payroll_cycles(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        salary_assignment_id VARCHAR(50) REFERENCES employee_salary_assignments(id) ON DELETE SET NULL,
        slip_number VARCHAR(50) NOT NULL,
        total_days_in_month INT DEFAULT 30,
        working_days INT DEFAULT 26,
        present_days NUMERIC(4, 1) DEFAULT 26,
        leave_days NUMERIC(4, 1) DEFAULT 0,
        lop_days NUMERIC(4, 1) DEFAULT 0,
        base_gross NUMERIC(12, 2) NOT NULL DEFAULT 0,
        basic_pay NUMERIC(12, 2) NOT NULL DEFAULT 0,
        da NUMERIC(12, 2) NOT NULL DEFAULT 0,
        hra NUMERIC(12, 2) NOT NULL DEFAULT 0,
        ta NUMERIC(12, 2) NOT NULL DEFAULT 0,
        special_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0,
        performance_bonus NUMERIC(12, 2) NOT NULL DEFAULT 0,
        total_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0,
        pf_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
        esic_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
        pt_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
        tds_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
        lop_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
        loan_installment_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
        other_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0,
        total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0,
        net_pay NUMERIC(12, 2) NOT NULL DEFAULT 0,
        earnings_breakdown JSONB DEFAULT '[]',
        deductions_breakdown JSONB DEFAULT '[]',
        payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'APPROVED', 'PAID', 'HELD')),
        paid_date DATE,
        payment_mode VARCHAR(30) DEFAULT 'BANK_TRANSFER',
        transaction_reference VARCHAR(100),
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(cycle_id, employee_id)
      );

      -- 12. Employee Performance Appraisals
      CREATE TABLE IF NOT EXISTS employee_appraisals (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        session_id VARCHAR(50) REFERENCES academic_sessions(id) ON DELETE SET NULL,
        review_period VARCHAR(100) NOT NULL,
        rating NUMERIC(3, 1) NOT NULL,
        evaluator_name VARCHAR(100) NOT NULL,
        pedagogy_score NUMERIC(3, 1),
        punctuality_score NUMERIC(3, 1),
        discipline_score NUMERIC(3, 1),
        strengths TEXT,
        areas_for_improvement TEXT,
        recommended_action VARCHAR(50) DEFAULT 'INCREMENT',
        increment_percentage NUMERIC(5, 2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'COMPLETED',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 13. HR Service Book & Career Lifecycle Events
      CREATE TABLE IF NOT EXISTS employee_lifecycle_events (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        event_date DATE NOT NULL,
        title VARCHAR(150) NOT NULL,
        details TEXT,
        fnf_gratuity_amount NUMERIC(12, 2) DEFAULT 0,
        fnf_leave_encashment NUMERIC(12, 2) DEFAULT 0,
        fnf_pending_dues NUMERIC(12, 2) DEFAULT 0,
        fnf_net_settlement NUMERIC(12, 2) DEFAULT 0,
        settlement_status VARCHAR(30) DEFAULT 'N/A',
        created_by_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indices
      CREATE INDEX IF NOT EXISTS idx_payheads_school ON salary_pay_heads(school_id);
      CREATE INDEX IF NOT EXISTS idx_salstruct_school ON salary_structures(school_id);
      CREATE INDEX IF NOT EXISTS idx_salassign_emp ON employee_salary_assignments(employee_id);
      CREATE INDEX IF NOT EXISTS idx_leaves_emp ON employee_leave_applications(employee_id);
      CREATE INDEX IF NOT EXISTS idx_loans_emp ON employee_loans(employee_id);
      CREATE INDEX IF NOT EXISTS idx_paycycles_school_ym ON payroll_cycles(school_id, year, month);
      CREATE INDEX IF NOT EXISTS idx_payitems_cycle ON payroll_items(cycle_id);
      CREATE INDEX IF NOT EXISTS idx_payitems_emp ON payroll_items(employee_id);
    `);

    // 2. Ensure Expense Category for Staff Salaries & Compensation (Phase 6 Integration)
    await db.query(`
      INSERT INTO expense_categories (id, school_id, name, code, status)
      VALUES (
        'cat_vvps_payroll', 'sch_vvps', 'Staff Salaries & Compensation', 'SALARY', 'active'
      ) ON CONFLICT (school_id, code) DO NOTHING;
    `);

    // 3. Register Phase 12 Permissions
    const phase12Permissions = [
      { id: 'payroll.view', module: 'HR & Payroll', name: 'View Payroll & Compensation', desc: 'Inspect salary structures, monthly payroll runs, and compensation packages' },
      { id: 'payroll.structure.manage', module: 'HR & Payroll', name: 'Manage Salary Structures', desc: 'Configure pay heads, salary grades, and employee salary profiles' },
      { id: 'payroll.generate', module: 'HR & Payroll', name: 'Run Monthly Payroll', desc: 'Initiate and auto-calculate monthly salary runs from attendance and leave data' },
      { id: 'payroll.approve', module: 'HR & Payroll', name: 'Approve Payroll Cycles', desc: 'Verify itemized payslips and authorize payroll runs' },
      { id: 'payroll.disburse', module: 'HR & Payroll', name: 'Disburse Payroll', desc: 'Disburse salaries, mark records paid, and create accounting expense entries' },
      { id: 'payroll.payslip.view', module: 'HR & Payroll', name: 'View & Print Payslips', desc: 'Inspect and print official employee salary slips' },
      { id: 'leaves.manage', module: 'HR & Payroll', name: 'Manage Staff Leaves', desc: 'Configure leave quotas, review, approve, or reject employee leave requests' },
      { id: 'leaves.apply', module: 'HR & Payroll', name: 'Apply for Leave', desc: 'Submit staff leave applications' },
      { id: 'loans.manage', module: 'HR & Payroll', name: 'Manage Staff Loans & Advances', desc: 'Sanction salary advances, view repayments, and configure EMIs' },
      { id: 'appraisals.manage', module: 'HR & Payroll', name: 'Manage Performance & Lifecycle', desc: 'Conduct appraisals, salary increments, promotions, and exit settlements' }
    ];

    for (const p of phase12Permissions) {
      await db.query(`
        INSERT INTO permissions (id, module, name, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET
          module = EXCLUDED.module,
          name = EXCLUDED.name,
          description = EXCLUDED.description
      `, [p.id, p.module, p.name, p.desc]);
    }

    // Role Assignments for Phase 12
    const superAdminRole = 'role_super_admin';
    const principalRole = 'role_principal';
    const accountantRole = 'role_accountant';
    const teacherRole = 'role_teacher';

    for (const p of phase12Permissions) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [superAdminRole, p.id]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [principalRole, p.id]);
    }

    // Accountant gets payroll calculations, payslips, disbursements, and loans
    const accountantPerms = ['payroll.view', 'payroll.structure.manage', 'payroll.generate', 'payroll.disburse', 'payroll.payslip.view', 'leaves.manage', 'loans.manage'];
    for (const pid of accountantPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [accountantRole, pid]);
    }

    // Teacher gets viewing own payslip and applying for leave
    await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, 'leaves.apply') ON CONFLICT DO NOTHING`, [teacherRole]);
    await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, 'payroll.payslip.view') ON CONFLICT DO NOTHING`, [teacherRole]);

    // 4. Seed Standard Pay Heads
    const standardHeads = [
      { id: 'head_basic', schoolId: 'sch_vvps', name: 'Basic Pay', code: 'BASIC', type: 'EARNING', category: 'BASE', calc: 'FLAT', defVal: 28000, taxable: true, stat: false, order: 1 },
      { id: 'head_da', schoolId: 'sch_vvps', name: 'Dearness Allowance (DA)', code: 'DA', type: 'EARNING', category: 'ALLOWANCE', calc: 'PERCENT_OF_BASIC', defVal: 38, taxable: true, stat: false, order: 2 },
      { id: 'head_hra', schoolId: 'sch_vvps', name: 'House Rent Allowance (HRA)', code: 'HRA', type: 'EARNING', category: 'ALLOWANCE', calc: 'PERCENT_OF_BASIC', defVal: 20, taxable: true, stat: false, order: 3 },
      { id: 'head_ta', schoolId: 'sch_vvps', name: 'Transport Allowance (TA)', code: 'TA', type: 'EARNING', category: 'ALLOWANCE', calc: 'FLAT', defVal: 2400, taxable: true, stat: false, order: 4 },
      { id: 'head_special', schoolId: 'sch_vvps', name: 'Special Academic Allowance', code: 'SPECIAL', type: 'EARNING', category: 'ALLOWANCE', calc: 'FLAT', defVal: 3000, taxable: true, stat: false, order: 5 },
      { id: 'head_bonus', schoolId: 'sch_vvps', name: 'Performance Incentive', code: 'BONUS', type: 'EARNING', category: 'ALLOWANCE', calc: 'FLAT', defVal: 0, taxable: true, stat: false, order: 6 },
      { id: 'head_pf', schoolId: 'sch_vvps', name: 'Employee Provident Fund (EPF)', code: 'PF', type: 'DEDUCTION', category: 'STATUTORY_DEDUCTION', calc: 'PERCENT_OF_BASIC', defVal: 12, taxable: false, stat: true, order: 10 },
      { id: 'head_esic', schoolId: 'sch_vvps', name: 'ESI Contribution', code: 'ESIC', type: 'DEDUCTION', category: 'STATUTORY_DEDUCTION', calc: 'PERCENT_OF_GROSS', defVal: 0.75, taxable: false, stat: true, order: 11 },
      { id: 'head_pt', schoolId: 'sch_vvps', name: 'Professional Tax (PT)', code: 'PT', type: 'DEDUCTION', category: 'STATUTORY_DEDUCTION', calc: 'FLAT', defVal: 200, taxable: false, stat: true, order: 12 },
      { id: 'head_tds', schoolId: 'sch_vvps', name: 'Tax Deducted at Source (TDS)', code: 'TDS', type: 'DEDUCTION', category: 'TAX', calc: 'FLAT', defVal: 1500, taxable: false, stat: true, order: 13 },
      { id: 'head_loan', schoolId: 'sch_vvps', name: 'Staff Loan / Advance EMI', code: 'LOAN_EMI', type: 'DEDUCTION', category: 'LOAN', calc: 'FLAT', defVal: 0, taxable: false, stat: false, order: 14 },
      { id: 'head_lop', schoolId: 'sch_vvps', name: 'Loss of Pay (LOP / Unpaid Leave)', code: 'LOP', type: 'DEDUCTION', category: 'ATTENDANCE', calc: 'FLAT', defVal: 0, taxable: false, stat: false, order: 15 }
    ];

    for (const h of standardHeads) {
      await db.query(`
        INSERT INTO salary_pay_heads (
          id, school_id, name, code, type, category, calculation_type,
          default_value, is_taxable, is_statutory, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (school_id, code) DO NOTHING;
      `, [h.id, h.schoolId, h.name, h.code, h.type, h.category, h.calc, h.defVal, h.taxable, h.stat, h.order]);
    }

    // 5. Seed Salary Structures (Salary Grades)
    const structures = [
      {
        id: 'struct_prn',
        schoolId: 'sch_vvps',
        name: 'Executive & Academic Leadership Scale (Principal / VP)',
        code: 'EXEC_LEAD',
        desc: 'Senior educational leadership grade with leadership allowance and maximum academic perks.',
        gross: 78000
      },
      {
        id: 'struct_pgt',
        schoolId: 'sch_vvps',
        name: 'Senior Secondary PGT Scale',
        code: 'PGT_SCALE',
        desc: 'Post Graduate Teacher grade for Classes 11 & 12 faculty with lab & research allowances.',
        gross: 52000
      },
      {
        id: 'struct_tgt',
        schoolId: 'sch_vvps',
        name: 'Secondary TGT Scale',
        code: 'TGT_SCALE',
        desc: 'Trained Graduate Teacher grade for Classes 6-10 faculty.',
        gross: 42000
      },
      {
        id: 'struct_admin',
        schoolId: 'sch_vvps',
        name: 'Senior Administrative & Accounts Scale',
        code: 'ADMIN_SCALE',
        desc: 'Officers managing finance, accounts, admissions, and campus operations.',
        gross: 38000
      },
      {
        id: 'struct_support',
        schoolId: 'sch_vvps',
        name: 'Lab & Campus Support Staff Scale',
        code: 'SUPPORT_SCALE',
        desc: 'Technical assistants, librarians, laboratory attendants, and campus supervisory staff.',
        gross: 26000
      }
    ];

    for (const s of structures) {
      await db.query(`
        INSERT INTO salary_structures (id, school_id, name, code, description, base_gross_monthly)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (school_id, code) DO NOTHING;
      `, [s.id, s.schoolId, s.name, s.code, s.desc, s.gross]);
    }

    // 6. Seed Leave Types Master
    const leaveTypes = [
      { id: 'lt_cl', schoolId: 'sch_vvps', name: 'Casual Leave (CL)', code: 'CL', quota: 12, cf: false, paid: true, doc: false },
      { id: 'lt_sl', schoolId: 'sch_vvps', name: 'Sick / Medical Leave (SL)', code: 'SL', quota: 10, cf: true, paid: true, doc: true },
      { id: 'lt_el', schoolId: 'sch_vvps', name: 'Earned / Privilege Leave (EL)', code: 'EL', quota: 15, cf: true, paid: true, doc: false },
      { id: 'lt_ml', schoolId: 'sch_vvps', name: 'Maternity Leave (ML)', code: 'ML', quota: 90, cf: false, paid: true, doc: true },
      { id: 'lt_od', schoolId: 'sch_vvps', name: 'On Duty / Academic Leave (OD)', code: 'OD', quota: 8, cf: false, paid: true, doc: true }
    ];

    for (const lt of leaveTypes) {
      await db.query(`
        INSERT INTO leave_types (id, school_id, name, code, annual_quota, is_carry_forward, is_paid, requires_document)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (school_id, code) DO NOTHING;
      `, [lt.id, lt.schoolId, lt.name, lt.code, lt.quota, lt.cf, lt.paid, lt.doc]);
    }

    // 7. Seed Employee Salary Assignments & Bank/PAN Details for Existing Staff
    const staffSalaryConfigs = [
      {
        empId: 'emp_vvps_001', // Dr. Sunita Mishra (Principal)
        structId: 'struct_prn',
        gross: 85000,
        basic: 45000,
        bank: 'State Bank of India',
        acc: '30982241908',
        ifsc: 'SBIN0001234',
        pan: 'ABCPM8901D',
        uan: '100984521098',
        esi: 'EXEMPT',
        notes: 'National CBSE Awardee Leadership Package'
      },
      {
        empId: 'emp_vvps_002', // Rajeshwar Nath Prasad (Vice Principal)
        structId: 'struct_prn',
        gross: 65000,
        basic: 36000,
        bank: 'Punjab National Bank',
        acc: '18490021008899',
        ifsc: 'PUNB0184900',
        pan: 'BKLPP4512E',
        uan: '100871239841',
        esi: 'EXEMPT',
        notes: 'Senior Curriculum In-Charge scale'
      },
      {
        empId: 'emp_vvps_003', // Ananya Sen (PGT Physics)
        structId: 'struct_pgt',
        gross: 54000,
        basic: 30000,
        bank: 'HDFC Bank',
        acc: '50100239811204',
        ifsc: 'HDFC0000240',
        pan: 'CQWPS3391K',
        uan: '100781290344',
        esi: 'EXEMPT',
        notes: 'Gold Medalist Senior Physics specialist'
      },
      {
        empId: 'emp_vvps_004', // Anand Jha (TGT Social Science)
        empNum: 'VVP-EMP-0004',
        structId: 'struct_tgt',
        gross: 42000,
        basic: 24000,
        bank: 'ICICI Bank',
        acc: '084201509823',
        ifsc: 'ICIC0000842',
        pan: 'DKRPJ8821M',
        uan: '100652391092',
        esi: 'EXEMPT',
        notes: 'Class 1-A Class Teacher scale'
      },
      {
        empId: 'emp_vvps_006', // Vikramaditya Sharma (Head of IT & Computer Teacher)
        structId: 'struct_pgt',
        gross: 50000,
        basic: 28000,
        bank: 'Axis Bank',
        acc: '91802004512984',
        ifsc: 'UTIB0000142',
        pan: 'ERFPT7102N',
        uan: '100543298104',
        esi: 'EXEMPT',
        notes: 'IT Infrastructure & STEM Lab Head'
      },
      {
        empId: 'emp_vvps_007', // Manoj Kumar Verma (Head Accountant)
        structId: 'struct_admin',
        gross: 40000,
        basic: 22000,
        bank: 'Bank of India',
        acc: '4481101000892',
        ifsc: 'BKID0004481',
        pan: 'FMKPV6501R',
        uan: '100439012398',
        esi: 'EXEMPT',
        notes: 'Institutional Finance & Accounts Head'
      }
    ];

    // Check which employees exist in employees table and seed their assignments
    const existingEmployees = await db.query(`SELECT id, employee_id_number FROM employees WHERE school_id = 'sch_vvps'`);
    const empIds = new Set(existingEmployees.rows.map((r: any) => r.id));

    // Resolve current academic session for VVPS
    const curSessionId = ((await db.query(`SELECT id FROM academic_sessions WHERE school_id = 'sch_vvps' AND is_current = true LIMIT 1`)).rows[0] as any)?.id || 'sess_vvps_2526';

    let assignIdx = 1;
    for (const sc of staffSalaryConfigs) {
      if (empIds.has(sc.empId)) {
        const id = `sal_assign_${sc.empId}`;
        const ctc = sc.gross * 12;
        await db.query(`
          INSERT INTO employee_salary_assignments (
            id, school_id, employee_id, structure_id, effective_from,
            ctc_annual, gross_monthly, basic_pay, bank_name,
            bank_account_number, bank_ifsc, pan_number, pf_uan_number,
            esi_number, payment_mode, status, notes
          ) VALUES ($1, 'sch_vvps', $2, $3, '2026-04-01', $4, $5, $6, $7, $8, $9, $10, $11, $12, 'BANK_TRANSFER', 'ACTIVE', $13)
          ON CONFLICT (employee_id, effective_from) DO UPDATE SET
            gross_monthly = EXCLUDED.gross_monthly,
            basic_pay = EXCLUDED.basic_pay,
            bank_name = EXCLUDED.bank_name,
            bank_account_number = EXCLUDED.bank_account_number,
            bank_ifsc = EXCLUDED.bank_ifsc;
        `, [id, sc.empId, sc.structId, ctc, sc.gross, sc.basic, sc.bank, sc.acc, sc.ifsc, sc.pan, sc.uan, sc.esi, sc.notes]);

        // Seed leave balances for this employee
        for (const lt of leaveTypes) {
          const lbId = `lb_${sc.empId}_${lt.id}`;
          const used = lt.code === 'CL' ? 2 : (lt.code === 'SL' ? 1 : 0);
          const bal = lt.quota - used;
          await db.query(`
            INSERT INTO employee_leave_balances (
              id, school_id, employee_id, leave_type_id, session_id, allocated, used, pending, balance
            ) VALUES ($1, 'sch_vvps', $2, $3, $4, $5, $6, 0, $7)
            ON CONFLICT (employee_id, leave_type_id, session_id) DO NOTHING;
          `, [lbId, sc.empId, lt.id, curSessionId, lt.quota, used, bal]);
        }

        assignIdx++;
      }
    }

    // 8. Seed Realistic Staff Loan / Salary Advance
    if (empIds.has('emp_vvps_003')) { // Ananya Sen took festival advance
      await db.query(`
        INSERT INTO employee_loans (
          id, school_id, employee_id, loan_type, principal_amount, disbursement_date,
          repayment_months, monthly_emi, total_repaid, balance_amount, status, reason
        ) VALUES (
          'loan_vvps_001', 'sch_vvps', 'emp_vvps_003', 'FESTIVAL_ADVANCE', 30000.00, '2026-08-15',
          6, 5000.00, 10000.00, 20000.00, 'ACTIVE', 'Festival and home renovation interest-free advance'
        ) ON CONFLICT (id) DO NOTHING;
      `);
    }

    // 9. Seed Leave Applications (Approved, Pending)
    if (empIds.has('emp_vvps_003')) {
      await db.query(`
        INSERT INTO employee_leave_applications (
          id, school_id, employee_id, leave_type_id, start_date, end_date, total_days,
          reason, status, reviewed_by_id, reviewed_by_name, reviewed_at, reviewer_comments
        ) VALUES (
          'leave_app_001', 'sch_vvps', 'emp_vvps_003', 'lt_cl', '2026-09-18', '2026-09-19', 2,
          'Attending national science teacher pedagogy seminar in Ranchi', 'APPROVED',
          'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)', '2026-09-15 10:30:00', 'Approved. Academic substitute assigned.'
        ) ON CONFLICT (id) DO NOTHING;
      `);
    }

    if (empIds.has('emp_vvps_006')) {
      await db.query(`
        INSERT INTO employee_leave_applications (
          id, school_id, employee_id, leave_type_id, start_date, end_date, total_days,
          reason, status, reviewer_comments
        ) VALUES (
          'leave_app_002', 'sch_vvps', 'emp_vvps_006', 'lt_cl', '2026-10-22', '2026-10-23', 2,
          'Family personal engagement during festive weekend', 'PENDING', null
        ) ON CONFLICT (id) DO NOTHING;
      `);
    }

    // 10. Seed Completed & Disbursed September 2026 Payroll Cycle
    // This connects directly with Phase 6 Expenses table!
    const expenseId = 'exp_vvps_payroll_sep26';
    const totalPayrollGross = 336000.00;
    const totalPayrollDed = 48500.00;
    const totalPayrollNet = 287500.00;

    await db.query(`
      INSERT INTO expenses (
        id, school_id, category_id, expense_date, amount, payment_mode, payee_vendor,
        reference_no, description, approval_status, created_by_id, created_by_name,
        approved_by_id, approved_by_name
      ) VALUES (
        $1, 'sch_vvps', 'cat_vvps_payroll', '2026-09-30', $2, 'BANK_TRANSFER',
        'Vidya Vahini Staff Salary Disbursal (Direct NEFT/RTGS Batch)',
        'NEFT-BATCH-20260930-VVPS', 'September 2026 Monthly Staff Salary Disbursal for 6 Teaching & Admin Officers',
        'APPROVED', 'usr_accountant_vvps', 'Manoj Kumar Verma (Head Accountant)',
        'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)'
      ) ON CONFLICT (id) DO NOTHING;
    `, [expenseId, totalPayrollNet]);

    const sepCycleId = 'cycle_vvps_2026_09';
    await db.query(`
      INSERT INTO payroll_cycles (
        id, school_id, title, month, year, start_date, end_date, total_working_days,
        total_employees, total_gross, total_deductions, total_net_payable, status,
        calculated_at, approved_at, approved_by_id, approved_by_name, disbursed_at,
        disbursed_by_id, payment_mode, disbursement_ref, expense_record_id, notes
      ) VALUES (
        $1, 'sch_vvps', 'September 2026 Monthly Staff Salary Run', 9, 2026,
        '2026-09-01', '2026-09-30', 26, 6, $2, $3, $4, 'DISBURSED',
        '2026-09-28 15:00:00', '2026-09-29 11:30:00', 'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)',
        '2026-09-30 14:00:00', 'usr_accountant_vvps', 'BANK_TRANSFER', 'NEFT-BATCH-20260930-VVPS',
        $5, 'Fully processed, audited by Finance, and disbursed via corporate bank portal.'
      ) ON CONFLICT (school_id, year, month) DO NOTHING;
    `, [sepCycleId, totalPayrollGross, totalPayrollDed, totalPayrollNet, expenseId]);

    // Seed Itemized Payslips for September 2026
    const sepStaffItems = [
      {
        empId: 'emp_vvps_001', slip: 'SLIP-VVPS-202609-001', gross: 85000, basic: 45000,
        da: 17100, hra: 9000, ta: 2400, spl: 11500, bonus: 0,
        pf: 5400, esic: 0, pt: 200, tds: 4500, lop: 0, loan: 0,
        workDays: 26, pres: 26, leave: 0, lopDays: 0, net: 74900,
        txRef: 'NEFT-VVPS-001-SEP26'
      },
      {
        empId: 'emp_vvps_002', slip: 'SLIP-VVPS-202609-002', gross: 65000, basic: 36000,
        da: 13680, hra: 7200, ta: 2400, spl: 5720, bonus: 0,
        pf: 4320, esic: 0, pt: 200, tds: 2800, lop: 0, loan: 0,
        workDays: 26, pres: 26, leave: 0, lopDays: 0, net: 57680,
        txRef: 'NEFT-VVPS-002-SEP26'
      },
      {
        empId: 'emp_vvps_003', slip: 'SLIP-VVPS-202609-003', gross: 54000, basic: 30000,
        da: 11400, hra: 6000, ta: 2400, spl: 4200, bonus: 0,
        pf: 3600, esic: 0, pt: 200, tds: 1800, lop: 0, loan: 5000,
        workDays: 26, pres: 24, leave: 2, lopDays: 0, net: 43400,
        txRef: 'NEFT-VVPS-003-SEP26'
      },
      {
        empId: 'emp_vvps_006', slip: 'SLIP-VVPS-202609-004', gross: 50000, basic: 28000,
        da: 10640, hra: 5600, ta: 2400, spl: 3360, bonus: 0,
        pf: 3360, esic: 0, pt: 200, tds: 1400, lop: 0, loan: 0,
        workDays: 26, pres: 26, leave: 0, lopDays: 0, net: 45040,
        txRef: 'NEFT-VVPS-004-SEP26'
      },
      {
        empId: 'emp_vvps_007', slip: 'SLIP-VVPS-202609-005', gross: 40000, basic: 22000,
        da: 8360, hra: 4400, ta: 2400, spl: 2840, bonus: 0,
        pf: 2640, esic: 0, pt: 200, tds: 800, lop: 0, loan: 0,
        workDays: 26, pres: 26, leave: 0, lopDays: 0, net: 36360,
        txRef: 'NEFT-VVPS-005-SEP26'
      }
    ];

    for (const it of sepStaffItems) {
      if (empIds.has(it.empId)) {
        const itemId = `pi_vvps_202609_${it.empId}`;
        const totalEarn = it.basic + it.da + it.hra + it.ta + it.spl + it.bonus;
        const totalDed = it.pf + it.esic + it.pt + it.tds + it.lop + it.loan;
        const net = totalEarn - totalDed;

        await db.query(`
          INSERT INTO payroll_items (
            id, cycle_id, school_id, employee_id, salary_assignment_id, slip_number,
            total_days_in_month, working_days, present_days, leave_days, lop_days,
            base_gross, basic_pay, da, hra, ta, special_allowance, performance_bonus,
            total_earnings, pf_deduction, esic_deduction, pt_deduction, tds_deduction,
            lop_deduction, loan_installment_deduction, other_deductions, total_deductions,
            net_pay, payment_status, paid_date, payment_mode, transaction_reference, remarks
          ) VALUES (
            $1, $2, 'sch_vvps', $3, $4, $5, 30, $6, $7, $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, 0, $24, $25, 'PAID',
            '2026-09-30', 'BANK_TRANSFER', $26, 'Salary credited successfully'
          ) ON CONFLICT (cycle_id, employee_id) DO NOTHING;
        `, [
          itemId, sepCycleId, it.empId, `sal_assign_${it.empId}`, it.slip,
          it.workDays, it.pres, it.leave, it.lopDays, it.gross, it.basic,
          it.da, it.hra, it.ta, it.spl, it.bonus, totalEarn,
          it.pf, it.esic, it.pt, it.tds, it.lop, it.loan, totalDed, net, it.txRef
        ]);
      }
    }

    // 11. Seed October 2026 Payroll Cycle (In Draft / Calculated state ready for review & approval)
    const octCycleId = 'cycle_vvps_2026_10';
    await db.query(`
      INSERT INTO payroll_cycles (
        id, school_id, title, month, year, start_date, end_date, total_working_days,
        total_employees, total_gross, total_deductions, total_net_payable, status,
        calculated_at, notes
      ) VALUES (
        $1, 'sch_vvps', 'October 2026 Monthly Staff Salary Run', 10, 2026,
        '2026-10-01', '2026-10-31', 25, 5, 294000.00, 42720.00, 251280.00, 'CALCULATED',
        CURRENT_TIMESTAMP, 'Calculated from October biometric registers and approved leave balance.'
      ) ON CONFLICT (school_id, year, month) DO NOTHING;
    `, [octCycleId]);

    const octStaffItems = [
      {
        empId: 'emp_vvps_001', slip: 'SLIP-VVPS-202610-001', gross: 85000, basic: 45000,
        da: 17100, hra: 9000, ta: 4000, spl: 9900, bonus: 0,
        pf: 5400, esic: 0, pt: 200, tds: 4500, lop: 0, loan: 0,
        workDays: 25, pres: 25, leave: 0, lopDays: 0, net: 74900
      },
      {
        empId: 'emp_vvps_002', slip: 'SLIP-VVPS-202610-002', gross: 65000, basic: 35000,
        da: 13300, hra: 7000, ta: 3500, spl: 6200, bonus: 0,
        pf: 4200, esic: 0, pt: 200, tds: 2920, lop: 0, loan: 0,
        workDays: 25, pres: 24, leave: 1, lopDays: 0, net: 57680
      },
      {
        empId: 'emp_vvps_003', slip: 'SLIP-VVPS-202610-003', gross: 52000, basic: 28000,
        da: 10640, hra: 5600, ta: 3000, spl: 4760, bonus: 0,
        pf: 3360, esic: 0, pt: 200, tds: 1540, lop: 0, loan: 3500,
        workDays: 25, pres: 25, leave: 0, lopDays: 0, net: 43400
      },
      {
        empId: 'emp_vvps_006', slip: 'SLIP-VVPS-202610-004', gross: 52000, basic: 28000,
        da: 10640, hra: 5600, ta: 3000, spl: 4760, bonus: 0,
        pf: 3360, esic: 0, pt: 200, tds: 1400, lop: 2000, loan: 0,
        workDays: 25, pres: 24, leave: 0, lopDays: 1, net: 45040
      },
      {
        empId: 'emp_vvps_007', slip: 'SLIP-VVPS-202610-005', gross: 40000, basic: 22000,
        da: 8360, hra: 4400, ta: 2400, spl: 2840, bonus: 0,
        pf: 2640, esic: 0, pt: 200, tds: 800, lop: 0, loan: 0,
        workDays: 25, pres: 25, leave: 0, lopDays: 0, net: 36360
      }
    ];

    for (const it of octStaffItems) {
      if (empIds.has(it.empId)) {
        const itemId = `pi_vvps_202610_${it.empId}`;
        const totalEarn = it.basic + it.da + it.hra + it.ta + it.spl + it.bonus;
        const totalDed = it.pf + it.esic + it.pt + it.tds + it.lop + it.loan;
        const net = totalEarn - totalDed;

        await db.query(`
          INSERT INTO payroll_items (
            id, cycle_id, school_id, employee_id, salary_assignment_id, slip_number,
            total_days_in_month, working_days, present_days, leave_days, lop_days,
            base_gross, basic_pay, da, hra, ta, special_allowance, performance_bonus,
            total_earnings, pf_deduction, esic_deduction, pt_deduction, tds_deduction,
            lop_deduction, loan_installment_deduction, other_deductions, total_deductions,
            net_pay, payment_status, payment_mode, remarks
          ) VALUES (
            $1, $2, 'sch_vvps', $3, $4, $5, 31, $6, $7, $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, 0, $24, $25, 'PENDING',
            'BANK_TRANSFER', 'Awaiting approval and disbursement'
          ) ON CONFLICT (cycle_id, employee_id) DO NOTHING;
        `, [
          itemId, octCycleId, it.empId, `sal_assign_${it.empId}`, it.slip,
          it.workDays, it.pres, it.leave, it.lopDays, it.gross, it.basic,
          it.da, it.hra, it.ta, it.spl, it.bonus, totalEarn,
          it.pf, it.esic, it.pt, it.tds, it.lop, it.loan, totalDed, net
        ]);
      }
    }

    // 12. Seed Employee Appraisals (Performance Reviews)
    if (empIds.has('emp_vvps_003')) {
      await db.query(`
        INSERT INTO employee_appraisals (
          id, school_id, employee_id, session_id, review_period, rating, evaluator_name,
          pedagogy_score, punctuality_score, discipline_score, strengths,
          areas_for_improvement, recommended_action, increment_percentage, status
        ) VALUES (
          'appr_001', 'sch_vvps', 'emp_vvps_003', $1, 'Annual Academic Appraisal 2025-26',
          4.8, 'Dr. Sunita Mishra (Principal)', 4.9, 4.8, 4.7,
          'Outstanding command of modern physics, high CBSE Class 12 board averages, active mentor in science exhibitions.',
          'Can publish peer-reviewed pedagogical articles and lead inter-school STEM hackathons.',
          'INCREMENT', 8.5, 'COMPLETED'
        ) ON CONFLICT (id) DO NOTHING;
      `, [curSessionId]);
    }

    // 13. Seed Career Lifecycle Events
    if (empIds.has('emp_vvps_003')) {
      await db.query(`
        INSERT INTO employee_lifecycle_events (
          id, school_id, employee_id, event_type, event_date, title, details, created_by_name
        ) VALUES (
          'evt_001', 'sch_vvps', 'emp_vvps_003', 'INCREMENT', '2026-04-01',
          'Annual Performance Merit Salary Increment',
          'Salary increment of 8.5% sanctioned following stellar performance in board examinations.',
          'Dr. Sunita Mishra (Principal)'
        ) ON CONFLICT (id) DO NOTHING;
      `);
    }

    console.log('[DB] Phase 12 HR, Payroll & Staff Management module initialized and seeded successfully.');
  } catch (err: any) {
    (globalThis as any).__phase12Error = err?.message || String(err);
    console.error('[DB PHASE 12 INIT ERROR]', err);
  }
}
