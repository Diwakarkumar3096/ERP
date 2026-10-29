import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// ==========================================
// 1. DASHBOARD & ANALYTICS
// ==========================================

router.get('/dashboard', requireAuth, requirePermission('payroll.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied to this school payroll data.' });
  }

  try {
    const [
      empCountRes,
      assignedCountRes,
      latestCycleRes,
      loansRes,
      pendingLeavesRes,
      deptExpenseRes,
      recentCyclesRes
    ] = await Promise.all([
      // Total active employees
      db.query(`SELECT count(*) as count FROM employees WHERE school_id = $1 AND employment_status = 'ACTIVE'`, [schoolId]),
      // Employees with active salary assignments
      db.query(`SELECT count(DISTINCT employee_id) as count FROM employee_salary_assignments WHERE school_id = $1 AND status = 'ACTIVE'`, [schoolId]),
      // Latest cycle
      db.query(`SELECT * FROM payroll_cycles WHERE school_id = $1 ORDER BY year DESC, month DESC LIMIT 1`, [schoolId]),
      // Active staff loans
      db.query(`
        SELECT count(*) as count, coalesce(sum(principal_amount), 0) as total_principal, coalesce(sum(balance_amount), 0) as total_balance
        FROM employee_loans WHERE school_id = $1 AND status = 'ACTIVE'
      `, [schoolId]),
      // Pending leaves
      db.query(`SELECT count(*) as count FROM employee_leave_applications WHERE school_id = $1 AND status = 'PENDING'`, [schoolId]),
      // Department-wise monthly salary distribution
      db.query(`
        SELECT d.name as department_name, count(e.id) as staff_count, coalesce(sum(sa.gross_monthly), 0) as total_gross
        FROM employees e
        JOIN departments d ON e.department_id = d.id
        LEFT JOIN employee_salary_assignments sa ON sa.employee_id = e.id AND sa.status = 'ACTIVE'
        WHERE e.school_id = $1 AND e.employment_status = 'ACTIVE'
        GROUP BY d.name
        ORDER BY total_gross DESC
      `, [schoolId]),
      // Recent cycles
      db.query(`SELECT * FROM payroll_cycles WHERE school_id = $1 ORDER BY year DESC, month DESC LIMIT 6`, [schoolId])
    ]);

    const latestCycle: any = latestCycleRes.rows[0] || null;
    const loanStats: any = loansRes.rows[0] || { count: 0, total_principal: 0, total_balance: 0 };

    return res.json({
      totalEmployees: parseInt((empCountRes.rows[0] as any).count, 10),
      assignedEmployees: parseInt((assignedCountRes.rows[0] as any).count, 10),
      pendingLeavesCount: parseInt((pendingLeavesRes.rows[0] as any).count, 10),
      activeLoansCount: parseInt(loanStats.count, 10),
      totalLoanOutstanding: parseFloat(loanStats.total_balance) || 0,
      latestCycle,
      departmentSalaries: deptExpenseRes.rows,
      recentCycles: recentCyclesRes.rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. SALARY PAY HEADS (EARNINGS & DEDUCTIONS)
// ==========================================

router.get('/heads', requireAuth, requirePermission('payroll.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const result = await db.query(`
      SELECT * FROM salary_pay_heads
      WHERE school_id = $1
      ORDER BY type ASC, sort_order ASC, name ASC
    `, [schoolId]);
    return res.json({ payHeads: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/heads', requireAuth, requirePermission('payroll.structure.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { name, code, type, category, calculationType, defaultValue, isTaxable, isStatutory, sortOrder } = req.body;
  if (!name || !code || !type) {
    return res.status(400).json({ error: 'Name, code, and type (EARNING/DEDUCTION) are required.' });
  }

  try {
    const id = `head_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO salary_pay_heads (
        id, school_id, name, code, type, category, calculation_type,
        default_value, is_taxable, is_statutory, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      id, schoolId, name.trim(), code.trim().toUpperCase(), type,
      category || 'STANDARD', calculationType || 'FLAT',
      defaultValue || 0, isTaxable !== false, isStatutory === true, sortOrder || 0
    ]);

    await recordAuditLog({
      req,
      action: 'CREATE_PAY_HEAD',
      module: 'PAYROLL',
      schoolId,
      recordId: id,
      description: `Created pay head: ${name} (${code})`
    });

    return res.status(201).json({ payHead: result.rows[0], message: 'Pay head created successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. SALARY STRUCTURES (GRADE TEMPLATES)
// ==========================================

router.get('/structures', requireAuth, requirePermission('payroll.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const structuresRes = await db.query(`
      SELECT s.*,
        (SELECT count(*) FROM employee_salary_assignments a WHERE a.structure_id = s.id AND a.status = 'ACTIVE') as assigned_staff_count
      FROM salary_structures s
      WHERE s.school_id = $1
      ORDER BY s.base_gross_monthly DESC
    `, [schoolId]);

    return res.json({ structures: structuresRes.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/structures', requireAuth, requirePermission('payroll.structure.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { name, code, description, baseGrossMonthly } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: 'Structure name and code are required.' });
  }

  try {
    const id = `struct_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO salary_structures (id, school_id, name, code, description, base_gross_monthly)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, schoolId, name.trim(), code.trim().toUpperCase(), description || '', baseGrossMonthly || 0]);

    await recordAuditLog({
      req,
      action: 'CREATE_SALARY_STRUCTURE',
      module: 'PAYROLL',
      schoolId,
      recordId: id,
      description: `Created salary grade: ${name} (${code})`
    });

    return res.status(201).json({ structure: result.rows[0], message: 'Salary structure created successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. EMPLOYEE SALARY ASSIGNMENTS & PROFILES
// ==========================================

router.get('/assignments', requireAuth, requirePermission('payroll.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const search = (req.query.search as string)?.trim() || '';
  const departmentId = req.query.departmentId as string;

  try {
    let sql = `
      SELECT
        e.id as employee_id,
        e.employee_id_number,
        concat(e.first_name, ' ', coalesce(e.middle_name || ' ', ''), e.last_name) as employee_name,
        e.employee_type,
        e.profile_photo,
        e.mobile_number,
        e.official_email,
        e.employment_status,
        e.date_of_joining,
        d.name as department_name,
        des.name as designation_name,
        sa.id as assignment_id,
        sa.structure_id,
        st.name as structure_name,
        sa.effective_from,
        coalesce(sa.ctc_annual, 0) as ctc_annual,
        coalesce(sa.gross_monthly, 0) as gross_monthly,
        coalesce(sa.basic_pay, 0) as basic_pay,
        sa.bank_name,
        sa.bank_account_number,
        sa.bank_ifsc,
        sa.pan_number,
        sa.pf_uan_number,
        sa.esi_number,
        sa.payment_mode,
        sa.status as assignment_status,
        sa.notes
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN employee_salary_assignments sa ON sa.employee_id = e.id AND sa.status = 'ACTIVE'
      LEFT JOIN salary_structures st ON sa.structure_id = st.id
      WHERE e.school_id = $1 AND e.employment_status = 'ACTIVE'
    `;
    const params: any[] = [schoolId];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (
        lower(concat(e.first_name, ' ', e.last_name)) LIKE $${params.length}
        OR lower(e.employee_id_number) LIKE $${params.length}
        OR lower(e.mobile_number) LIKE $${params.length}
      )`;
    }

    if (departmentId) {
      params.push(departmentId);
      sql += ` AND e.department_id = $${params.length}`;
    }

    sql += ` ORDER BY e.employee_id_number ASC`;

    const result = await db.query(sql, params);
    return res.json({ assignments: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/assignments', requireAuth, requirePermission('payroll.structure.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const {
    employeeId,
    structureId,
    effectiveFrom,
    grossMonthly,
    basicPay,
    bankName,
    bankAccountNumber,
    bankIfsc,
    panNumber,
    pfUanNumber,
    esiNumber,
    paymentMode,
    notes
  } = req.body;

  if (!employeeId || !grossMonthly) {
    return res.status(400).json({ error: 'Employee and Monthly Gross salary are required.' });
  }

  try {
    const gross = parseFloat(grossMonthly);
    const basic = basicPay ? parseFloat(basicPay) : Math.round(gross * 0.5);
    const ctc = gross * 12;
    const effDate = effectiveFrom || new Date().toISOString().slice(0, 10);
    const id = `sal_assign_${employeeId}_${Date.now()}`;

    // Deactivate previous assignments
    await db.query(`
      UPDATE employee_salary_assignments SET status = 'INACTIVE'
      WHERE employee_id = $1 AND school_id = $2
    `, [employeeId, schoolId]);

    const result = await db.query(`
      INSERT INTO employee_salary_assignments (
        id, school_id, employee_id, structure_id, effective_from,
        ctc_annual, gross_monthly, basic_pay, bank_name,
        bank_account_number, bank_ifsc, pan_number, pf_uan_number,
        esi_number, payment_mode, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'ACTIVE', $16)
      RETURNING *
    `, [
      id, schoolId, employeeId, structureId || null, effDate,
      ctc, gross, basic, bankName?.trim() || null,
      bankAccountNumber?.trim() || null, bankIfsc?.trim() || null,
      panNumber?.trim()?.toUpperCase() || null, pfUanNumber?.trim() || null,
      esiNumber?.trim() || null, paymentMode || 'BANK_TRANSFER', notes || null
    ]);

    await recordAuditLog({
      req,
      action: 'ASSIGN_SALARY_PROFILE',
      module: 'PAYROLL',
      schoolId,
      recordId: id,
      description: `Configured compensation profile for employee: Gross Rs. ${gross.toLocaleString('en-IN')}`
    });

    return res.status(201).json({ assignment: result.rows[0], message: 'Salary profile assigned successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. LEAVE MANAGEMENT & ATTENDANCE INTEGRATION
// ==========================================

router.get('/leaves/types', requireAuth, requirePermission('payroll.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const result = await db.query(`SELECT * FROM leave_types WHERE school_id = $1 ORDER BY code ASC`, [schoolId]);
    return res.json({ leaveTypes: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/leaves/balances', requireAuth, requirePermission('payroll.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const employeeId = req.query.employeeId as string;

  try {
    let sql = `
      SELECT
        b.*,
        lt.name as leave_type_name,
        lt.code as leave_type_code,
        e.employee_id_number,
        concat(e.first_name, ' ', e.last_name) as employee_name,
        d.name as department_name
      FROM employee_leave_balances b
      JOIN leave_types lt ON b.leave_type_id = lt.id
      JOIN employees e ON b.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE b.school_id = $1
    `;
    const params: any[] = [schoolId];

    if (employeeId) {
      params.push(employeeId);
      sql += ` AND b.employee_id = $${params.length}`;
    }

    sql += ` ORDER BY e.employee_id_number ASC, lt.code ASC`;

    const result = await db.query(sql, params);
    return res.json({ balances: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/leaves/applications', requireAuth, requirePermission('payroll.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const status = req.query.status as string;

  try {
    let sql = `
      SELECT
        la.*,
        lt.name as leave_type_name,
        lt.code as leave_type_code,
        lt.is_paid,
        e.employee_id_number,
        concat(e.first_name, ' ', e.last_name) as employee_name,
        d.name as department_name,
        des.name as designation_name,
        concat(sub.first_name, ' ', sub.last_name) as substitute_name
      FROM employee_leave_applications la
      JOIN leave_types lt ON la.leave_type_id = lt.id
      JOIN employees e ON la.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN employees sub ON la.substitute_employee_id = sub.id
      WHERE la.school_id = $1
    `;
    const params: any[] = [schoolId];

    if (status) {
      params.push(status);
      sql += ` AND la.status = $${params.length}`;
    }

    sql += ` ORDER BY la.created_at DESC`;

    const result = await db.query(sql, params);
    return res.json({ applications: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/leaves/apply', requireAuth, requirePermission('leaves.apply'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { employeeId, leaveTypeId, startDate, endDate, totalDays, reason, substituteEmployeeId } = req.body;
  if (!employeeId || !leaveTypeId || !startDate || !endDate || !reason) {
    return res.status(400).json({ error: 'Employee, leave type, dates, and reason are required.' });
  }

  try {
    const id = `leave_app_${Date.now()}`;
    const days = totalDays ? parseFloat(totalDays) : 1;

    const result = await db.query(`
      INSERT INTO employee_leave_applications (
        id, school_id, employee_id, leave_type_id, start_date, end_date,
        total_days, reason, substitute_employee_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING')
      RETURNING *
    `, [id, schoolId, employeeId, leaveTypeId, startDate, endDate, days, reason.trim(), substituteEmployeeId || null]);

    return res.status(201).json({ application: result.rows[0], message: 'Leave application submitted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/leaves/:id/review', requireAuth, requirePermission('leaves.manage'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { status, reviewerComments } = req.body; // 'APPROVED' or 'REJECTED'

  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be APPROVED or REJECTED.' });
  }

  try {
    const appRes = await db.query(`SELECT * FROM employee_leave_applications WHERE id = $1 AND school_id = $2`, [id, schoolId]);
    if (appRes.rows.length === 0) return res.status(404).json({ error: 'Leave application not found.' });
    const app: any = appRes.rows[0];

    const reviewerName = req.user!.firstName ? `${req.user!.firstName} ${req.user!.lastName || ''}`.trim() : 'Administrator';

    const result = await db.query(`
      UPDATE employee_leave_applications
      SET status = $1, reviewer_comments = $2, reviewed_by_id = $3,
          reviewed_by_name = $4, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND school_id = $6
      RETURNING *
    `, [status, reviewerComments || null, req.user!.id, reviewerName, id, schoolId]);

    // If approved: update leave balance and synchronize with staff attendance register
    if (status === 'APPROVED') {
      await db.query(`
        UPDATE employee_leave_balances
        SET used = used + $1, balance = balance - $1, updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = $2 AND leave_type_id = $3 AND school_id = $4
      `, [app.total_days, app.employee_id, app.leave_type_id, schoolId]);

      // Sync with staff_attendance table for start_date to end_date
      try {
        const start = new Date(app.start_date);
        const end = new Date(app.end_date);
        const cur = new Date(start);
        while (cur <= end) {
          const dStr = cur.toISOString().slice(0, 10);
          const attId = `stfatt_leave_${app.employee_id}_${dStr.replace(/-/g, '')}`;
          await db.query(`
            INSERT INTO staff_attendance (
              id, school_id, employee_id, date, status, remarks, marked_by_id, marked_by_name, is_locked
            ) VALUES ($1, $2, $3, $4, 'LEAVE', $5, $6, $7, true)
            ON CONFLICT (employee_id, date) DO UPDATE SET
              status = 'LEAVE',
              remarks = EXCLUDED.remarks;
          `, [attId, schoolId, app.employee_id, dStr, `Approved Leave: ${app.reason}`, req.user!.id, reviewerName]);
          cur.setDate(cur.getDate() + 1);
        }
      } catch (attErr) {
        console.warn('[LEAVE ATTENDANCE SYNC WARNING]', attErr);
      }
    }

    await recordAuditLog({
      req,
      action: 'REVIEW_LEAVE_APPLICATION',
      module: 'PAYROLL',
      schoolId,
      recordId: id,
      description: `${status} leave for employee ${app.employee_id}: ${app.total_days} days`
    });

    return res.json({ application: result.rows[0], message: `Leave application marked as ${status}.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. STAFF ADVANCES & LOANS
// ==========================================

router.get('/loans', requireAuth, requirePermission('loans.manage'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const result = await db.query(`
      SELECT
        l.*,
        e.employee_id_number,
        concat(e.first_name, ' ', e.last_name) as employee_name,
        d.name as department_name,
        des.name as designation_name
      FROM employee_loans l
      JOIN employees e ON l.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      WHERE l.school_id = $1
      ORDER BY l.status ASC, l.disbursement_date DESC
    `, [schoolId]);

    return res.json({ loans: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/loans', requireAuth, requirePermission('loans.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { employeeId, loanType, principalAmount, disbursementDate, repaymentMonths, reason } = req.body;
  if (!employeeId || !principalAmount || !repaymentMonths) {
    return res.status(400).json({ error: 'Employee, principal amount, and repayment months are required.' });
  }

  try {
    const principal = parseFloat(principalAmount);
    const months = parseInt(repaymentMonths, 10);
    const monthlyEmi = Math.round(principal / months);
    const id = `loan_${Date.now()}`;
    const disbDate = disbursementDate || new Date().toISOString().slice(0, 10);

    const result = await db.query(`
      INSERT INTO employee_loans (
        id, school_id, employee_id, loan_type, principal_amount, disbursement_date,
        repayment_months, monthly_emi, total_repaid, balance_amount, status, reason, approved_by_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $5, 'ACTIVE', $9, $10)
      RETURNING *
    `, [
      id, schoolId, employeeId, loanType || 'SALARY_ADVANCE', principal,
      disbDate, months, monthlyEmi, reason?.trim() || null, req.user!.id
    ]);

    await recordAuditLog({
      req,
      action: 'SANCTION_STAFF_LOAN',
      module: 'PAYROLL',
      schoolId,
      recordId: id,
      description: `Sanctioned Rs. ${principal.toLocaleString('en-IN')} staff advance with EMI Rs. ${monthlyEmi}`
    });

    return res.status(201).json({ loan: result.rows[0], message: 'Staff advance/loan sanctioned successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. MONTHLY PAYROLL GENERATION & RUN CYCLES
// ==========================================

router.get('/cycles', requireAuth, requirePermission('payroll.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const result = await db.query(`
      SELECT c.*,
        exp.reference_no as expense_ref,
        exp.payment_mode as expense_mode
      FROM payroll_cycles c
      LEFT JOIN expenses exp ON c.expense_record_id = exp.id
      WHERE c.school_id = $1
      ORDER BY c.year DESC, c.month DESC
    `, [schoolId]);

    return res.json({ cycles: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/cycles/generate', requireAuth, requirePermission('payroll.generate'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { month, year, workingDays } = req.body;
  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required.' });
  }

  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  const totalWorkDays = workingDays ? parseInt(workingDays, 10) : 26;

  try {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[m - 1] || `Month ${m}`;
    const cycleTitle = `${monthName} ${y} Monthly Staff Salary Run`;
    const cycleId = `cycle_${schoolId}_${y}_${String(m).padStart(2, '0')}`;

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    // Last day of month
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // 1. Fetch active employees with active salary assignments
    const empRes = await db.query(`
      SELECT
        e.id as employee_id,
        e.employee_id_number,
        concat(e.first_name, ' ', e.last_name) as employee_name,
        sa.id as assignment_id,
        sa.gross_monthly,
        sa.basic_pay,
        sa.bank_name,
        sa.bank_account_number,
        sa.bank_ifsc
      FROM employees e
      JOIN employee_salary_assignments sa ON sa.employee_id = e.id AND sa.status = 'ACTIVE'
      WHERE e.school_id = $1 AND e.employment_status = 'ACTIVE'
    `, [schoolId]);

    if (empRes.rows.length === 0) {
      return res.status(400).json({ error: 'No active employees with assigned salary profiles found. Please configure employee salary profiles first.' });
    }

    // 2. Insert or update payroll cycle record
    await db.query(`
      INSERT INTO payroll_cycles (
        id, school_id, title, month, year, start_date, end_date,
        total_working_days, total_employees, status, calculated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'CALCULATED', CURRENT_TIMESTAMP)
      ON CONFLICT (school_id, year, month) DO UPDATE SET
        title = EXCLUDED.title,
        total_working_days = EXCLUDED.total_working_days,
        total_employees = EXCLUDED.total_employees,
        calculated_at = CURRENT_TIMESTAMP;
    `, [cycleId, schoolId, cycleTitle, m, y, startDate, endDate, totalWorkDays, empRes.rows.length]);

    let cycleTotalGross = 0;
    let cycleTotalDeductions = 0;
    let cycleTotalNet = 0;

    // 3. For each employee, calculate salary breakdown with attendance & loan EMIs
    for (const emp of (empRes.rows as any[])) {
      const gross = parseFloat(emp.gross_monthly);
      const basic = parseFloat(emp.basic_pay) || Math.round(gross * 0.5);

      // A. Query attendance for employee in this month
      const attRes = await db.query(`
        SELECT
          count(*) FILTER (WHERE status = 'PRESENT') as present_count,
          count(*) FILTER (WHERE status = 'HALF_DAY') as half_day_count,
          count(*) FILTER (WHERE status = 'LEAVE') as leave_count,
          count(*) FILTER (WHERE status = 'ABSENT') as absent_count
        FROM staff_attendance
        WHERE employee_id = $1 AND date >= $2 AND date <= $3
      `, [emp.employee_id, startDate, endDate]);

      const attData: any = attRes.rows[0] || {};
      const presentCount = parseFloat(attData.present_count || 0) + (parseFloat(attData.half_day_count || 0) * 0.5);
      const leaveCount = parseFloat(attData.leave_count || 0);
      const absentCount = parseFloat(attData.absent_count || 0);

      // Working days default if attendance not marked yet: assume full attendance
      const effectivePresent = (presentCount + leaveCount) > 0 ? (presentCount + leaveCount) : totalWorkDays;
      const lopDays = (presentCount + leaveCount) > 0 ? absentCount : 0;

      // Allowances:
      // DA: 38% of Basic
      const da = Math.round(basic * 0.38);
      // HRA: 20% of Basic
      const hra = Math.round(basic * 0.20);
      // TA: Rs 2400
      const ta = 2400;
      // Special Academic Allowance: Remaining balance of gross
      const splAllowance = Math.max(0, Math.round(gross - (basic + da + hra + ta)));
      const bonus = 0;
      const totalEarnings = basic + da + hra + ta + splAllowance + bonus;

      // Deductions:
      // Statutory EPF: 12% of Basic
      const pf = Math.round(basic * 0.12);
      // ESIC: 0.75% of Gross if gross <= 21,000, else 0
      const esic = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
      // Professional Tax (PT): standard slab Rs. 200
      const pt = 200;
      // TDS estimation: ~5% if gross > 50,000, else standard
      const tds = gross >= 75000 ? Math.round(gross * 0.05) : (gross >= 50000 ? Math.round(gross * 0.03) : 0);

      // LOP deduction: (Gross / WorkingDays) * lopDays
      const lopDeduction = lopDays > 0 ? Math.round((gross / totalWorkDays) * lopDays) : 0;

      // Check active loan EMI
      const loanRes = await db.query(`
        SELECT id, monthly_emi, balance_amount FROM employee_loans
        WHERE employee_id = $1 AND school_id = $2 AND status = 'ACTIVE' LIMIT 1
      `, [emp.employee_id, schoolId]);

      let loanEmi = 0;
      if (loanRes.rows.length > 0) {
        const loan: any = loanRes.rows[0];
        loanEmi = Math.min(parseFloat(loan.monthly_emi), parseFloat(loan.balance_amount));
      }

      const totalDeductions = pf + esic + pt + tds + lopDeduction + loanEmi;
      const netPay = Math.max(0, totalEarnings - totalDeductions);

      cycleTotalGross += totalEarnings;
      cycleTotalDeductions += totalDeductions;
      cycleTotalNet += netPay;

      const slipNumber = `SLIP-${emp.employee_id_number}-${y}${String(m).padStart(2, '0')}`;
      const itemId = `pi_${cycleId}_${emp.employee_id}`;

      await db.query(`
        INSERT INTO payroll_items (
          id, cycle_id, school_id, employee_id, salary_assignment_id, slip_number,
          total_days_in_month, working_days, present_days, leave_days, lop_days,
          base_gross, basic_pay, da, hra, ta, special_allowance, performance_bonus,
          total_earnings, pf_deduction, esic_deduction, pt_deduction, tds_deduction,
          lop_deduction, loan_installment_deduction, other_deductions, total_deductions,
          net_pay, payment_status, remarks
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, 0, $26, $27, 'PENDING',
          'Automated monthly salary calculation from biometric attendance & structure'
        )
        ON CONFLICT (cycle_id, employee_id) DO UPDATE SET
          present_days = EXCLUDED.present_days,
          leave_days = EXCLUDED.leave_days,
          lop_days = EXCLUDED.lop_days,
          base_gross = EXCLUDED.base_gross,
          basic_pay = EXCLUDED.basic_pay,
          da = EXCLUDED.da,
          hra = EXCLUDED.hra,
          ta = EXCLUDED.ta,
          special_allowance = EXCLUDED.special_allowance,
          total_earnings = EXCLUDED.total_earnings,
          pf_deduction = EXCLUDED.pf_deduction,
          esic_deduction = EXCLUDED.esic_deduction,
          pt_deduction = EXCLUDED.pt_deduction,
          tds_deduction = EXCLUDED.tds_deduction,
          lop_deduction = EXCLUDED.lop_deduction,
          loan_installment_deduction = EXCLUDED.loan_installment_deduction,
          total_deductions = EXCLUDED.total_deductions,
          net_pay = EXCLUDED.net_pay;
      `, [
        itemId, cycleId, schoolId, emp.employee_id, emp.assignment_id, slipNumber,
        lastDay, totalWorkDays, effectivePresent, leaveCount, lopDays,
        gross, basic, da, hra, ta, splAllowance, bonus, totalEarnings,
        pf, esic, pt, tds, lopDeduction, loanEmi, totalDeductions, netPay
      ]);
    }

    // 4. Update cycle totals
    const updateCycleRes = await db.query(`
      UPDATE payroll_cycles
      SET total_gross = $1, total_deductions = $2, total_net_payable = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [cycleTotalGross, cycleTotalDeductions, cycleTotalNet, cycleId]);

    await recordAuditLog({
      req,
      action: 'CALCULATE_PAYROLL_CYCLE',
      module: 'PAYROLL',
      schoolId,
      recordId: cycleId,
      description: `Generated payroll for ${cycleTitle}: Gross Rs. ${cycleTotalGross.toLocaleString('en-IN')}, Net Payable Rs. ${cycleTotalNet.toLocaleString('en-IN')}`
    });

    return res.status(201).json({
      cycle: updateCycleRes.rows[0],
      message: `Payroll cycle for ${monthName} ${y} generated successfully.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/cycles/:id', requireAuth, requirePermission('payroll.view'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const cycleRes = await db.query(`SELECT * FROM payroll_cycles WHERE id = $1 AND school_id = $2`, [id, schoolId]);
    if (cycleRes.rows.length === 0) return res.status(404).json({ error: 'Payroll cycle not found.' });

    const itemsRes = await db.query(`
      SELECT
        pi.*,
        e.employee_id_number,
        concat(e.first_name, ' ', e.last_name) as employee_name,
        e.employee_type,
        e.profile_photo,
        d.name as department_name,
        des.name as designation_name,
        sa.bank_name,
        sa.bank_account_number,
        sa.bank_ifsc,
        sa.pan_number,
        sa.pf_uan_number
      FROM payroll_items pi
      JOIN employees e ON pi.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN employee_salary_assignments sa ON pi.salary_assignment_id = sa.id
      WHERE pi.cycle_id = $1
      ORDER BY e.employee_id_number ASC
    `, [id]);

    return res.json({ cycle: cycleRes.rows[0], items: itemsRes.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/cycles/:id/approve', requireAuth, requirePermission('payroll.approve'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;

  try {
    const cycleRes = await db.query(`SELECT * FROM payroll_cycles WHERE id = $1 AND school_id = $2`, [id, schoolId]);
    if (cycleRes.rows.length === 0) return res.status(404).json({ error: 'Payroll cycle not found.' });
    const cycle: any = cycleRes.rows[0];

    if (cycle.status === 'DISBURSED') {
      return res.status(400).json({ error: 'This payroll cycle has already been disbursed.' });
    }

    const approverName = req.user!.firstName ? `${req.user!.firstName} ${req.user!.lastName || ''}`.trim() : 'Authorized Principal';

    const result = await db.query(`
      UPDATE payroll_cycles
      SET status = 'APPROVED', approved_at = CURRENT_TIMESTAMP,
          approved_by_id = $1, approved_by_name = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND school_id = $4
      RETURNING *
    `, [req.user!.id, approverName, id, schoolId]);

    await db.query(`UPDATE payroll_items SET payment_status = 'APPROVED' WHERE cycle_id = $1`, [id]);

    await recordAuditLog({
      req,
      action: 'APPROVE_PAYROLL_CYCLE',
      module: 'PAYROLL',
      schoolId,
      recordId: id,
      description: `Authorized & Approved payroll cycle: ${cycle.title}`
    });

    return res.json({ cycle: result.rows[0], message: 'Payroll cycle approved successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DISBURSEMENT: Marks paid AND automatically creates operating expense in Phase 6 Expenses table!
router.post('/cycles/:id/disburse', requireAuth, requirePermission('payroll.disburse'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { paymentMode, referenceNumber, notes } = req.body;

  try {
    const cycleRes = await db.query(`SELECT * FROM payroll_cycles WHERE id = $1 AND school_id = $2`, [id, schoolId]);
    if (cycleRes.rows.length === 0) return res.status(404).json({ error: 'Payroll cycle not found.' });
    const cycle: any = cycleRes.rows[0];

    if (cycle.status === 'DISBURSED') {
      return res.status(400).json({ error: 'This payroll cycle is already disbursed.' });
    }

    const disbRef = referenceNumber?.trim() || `PAY-DISB-${Date.now()}`;
    const mode = paymentMode || 'BANK_TRANSFER';
    const today = new Date().toISOString().slice(0, 10);
    const expenseId = `exp_payroll_${id}`;

    // 1. Post to Phase 6 Accounts & Expenses Ledger!
    // Seamless integration: School operating expenses reflect staff salary outlay
    await db.query(`
      INSERT INTO expenses (
        id, school_id, category_id, expense_date, amount, payment_mode, payee_vendor,
        reference_no, description, approval_status, created_by_id, created_by_name,
        approved_by_id, approved_by_name
      ) VALUES (
        $1, $2, 'cat_vvps_payroll', $3, $4, $5,
        'Staff Salary Batch Disbursal (Teaching & Non-Teaching Payroll)',
        $6, $7, 'APPROVED', $8, $9, $10, $11
      ) ON CONFLICT (id) DO UPDATE SET
        amount = EXCLUDED.amount,
        reference_no = EXCLUDED.reference_no,
        description = EXCLUDED.description;
    `, [
      expenseId, schoolId, today, cycle.total_net_payable, mode,
      disbRef, `${cycle.title} (${cycle.total_employees} staff members disbursed)`,
      req.user!.id, req.user!.username, req.user!.id, req.user!.username
    ]);

    // 2. Mark payroll cycle as DISBURSED
    const result = await db.query(`
      UPDATE payroll_cycles
      SET status = 'DISBURSED', disbursed_at = CURRENT_TIMESTAMP,
          disbursed_by_id = $1, payment_mode = $2, disbursement_ref = $3,
          expense_record_id = $4, notes = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND school_id = $7
      RETURNING *
    `, [req.user!.id, mode, disbRef, expenseId, notes || null, id, schoolId]);

    // 3. Mark all items as PAID
    await db.query(`
      UPDATE payroll_items
      SET payment_status = 'PAID', paid_date = $1, payment_mode = $2,
          transaction_reference = concat($3, '-', employee_id), updated_at = CURRENT_TIMESTAMP
      WHERE cycle_id = $4
    `, [today, mode, disbRef, id]);

    // 4. Update loan repayments for staff with loan EMI deductions
    const loanDeductionItems = await db.query(`
      SELECT employee_id, loan_installment_deduction
      FROM payroll_items
      WHERE cycle_id = $1 AND loan_installment_deduction > 0
    `, [id]);

    for (const item of (loanDeductionItems.rows as any[])) {
      const emiAmt = parseFloat(item.loan_installment_deduction);
      const loanRes = await db.query(`
        SELECT id, balance_amount FROM employee_loans
        WHERE employee_id = $1 AND school_id = $2 AND status = 'ACTIVE' LIMIT 1
      `, [item.employee_id, schoolId]);

      if (loanRes.rows.length > 0) {
        const loan: any = loanRes.rows[0];
        const newBal = Math.max(0, parseFloat(loan.balance_amount) - emiAmt);
        const newStatus = newBal === 0 ? 'COMPLETED' : 'ACTIVE';

        await db.query(`
          UPDATE employee_loans
          SET total_repaid = total_repaid + $1, balance_amount = $2, status = $3
          WHERE id = $4
        `, [emiAmt, newBal, newStatus, loan.id]);

        await db.query(`
          INSERT INTO employee_loan_repayments (
            id, loan_id, payroll_item_id, repayment_date, amount, payment_mode, notes
          ) VALUES ($1, $2, $3, $4, $5, 'PAYROLL_DEDUCTION', $6)
        `, [`repay_${Date.now()}_${item.employee_id}`, loan.id, `pi_${id}_${item.employee_id}`, today, emiAmt, `Deducted from ${cycle.title}`]);
      }
    }

    await recordAuditLog({
      req,
      action: 'DISBURSE_PAYROLL_CYCLE',
      module: 'PAYROLL',
      schoolId,
      recordId: id,
      description: `Disbursed ${cycle.title}: Net Rs. ${parseFloat(cycle.total_net_payable).toLocaleString('en-IN')}, posted to Accounts Expense ${expenseId}`
    });

    return res.json({
      cycle: result.rows[0],
      expenseRecordId: expenseId,
      message: `Salaries successfully disbursed and posted to School Operating Expenses ledger.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. HIGH-FIDELITY SALARY SLIP (PAYSLIP)
// ==========================================

router.get('/payslips/:itemId', requireAuth, requirePermission('payroll.payslip.view'), async (req, res) => {
  const { itemId } = req.params;
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const itemRes = await db.query(`
      SELECT
        pi.*,
        pc.title as cycle_title,
        pc.month as cycle_month,
        pc.year as cycle_year,
        pc.disbursement_ref,
        s.name as school_name,
        s.affiliation_no,
        s.board,
        s.address as school_address,
        s.city as school_city,
        s.state as school_state,
        s.logo_url as school_logo,
        e.employee_id_number,
        concat(e.first_name, ' ', coalesce(e.middle_name || ' ', ''), e.last_name) as employee_name,
        e.employee_type,
        e.date_of_joining,
        e.profile_photo,
        d.name as department_name,
        des.name as designation_name,
        sa.bank_name,
        sa.bank_account_number,
        sa.bank_ifsc,
        sa.pan_number,
        sa.pf_uan_number,
        sa.esi_number
      FROM payroll_items pi
      JOIN payroll_cycles pc ON pi.cycle_id = pc.id
      JOIN schools s ON pi.school_id = s.id
      JOIN employees e ON pi.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN employee_salary_assignments sa ON pi.salary_assignment_id = sa.id
      WHERE pi.id = $1 AND pi.school_id = $2
    `, [itemId, schoolId]);

    if (itemRes.rows.length === 0) {
      return res.status(404).json({ error: 'Payslip record not found.' });
    }

    const item: any = itemRes.rows[0];

    // Helper for Indian Currency in words
    const numToWords = (num: number): string => {
      const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      const inWords = (n: number): string => {
        if (n === 0) return '';
        if (n < 20) return a[n] + ' ';
        if (n < 100) return b[Math.floor(n / 10)] + ' ' + (n % 10 ? a[n % 10] + ' ' : '');
        if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + (n % 100 ? inWords(n % 100) : '');
        if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 ? inWords(n % 1000) : '');
        if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 ? inWords(n % 100000) : '');
        return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 ? inWords(n % 10000000) : '');
      };
      const rounded = Math.round(num);
      return rounded === 0 ? 'Zero Rupees Only' : (inWords(rounded).trim() + ' Rupees Only');
    };

    return res.json({
      payslip: item,
      netPayInWords: numToWords(parseFloat(item.net_pay))
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. PERFORMANCE APPRAISALS & HR LIFECYCLE
// ==========================================

router.get('/appraisals', requireAuth, requirePermission('appraisals.manage'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const result = await db.query(`
      SELECT
        a.*,
        e.employee_id_number,
        concat(e.first_name, ' ', e.last_name) as employee_name,
        d.name as department_name,
        des.name as designation_name,
        ses.name as session_name
      FROM employee_appraisals a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN academic_sessions ses ON a.session_id = ses.id
      WHERE a.school_id = $1
      ORDER BY a.created_at DESC
    `, [schoolId]);

    return res.json({ appraisals: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/appraisals', requireAuth, requirePermission('appraisals.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const {
    employeeId,
    sessionId,
    reviewPeriod,
    rating,
    pedagogyScore,
    punctualityScore,
    disciplineScore,
    strengths,
    areasForImprovement,
    recommendedAction,
    incrementPercentage
  } = req.body;

  if (!employeeId || !reviewPeriod || !rating) {
    return res.status(400).json({ error: 'Employee, review period, and overall rating are required.' });
  }

  try {
    const id = `appr_${Date.now()}`;
    const evalName = req.user!.firstName ? `${req.user!.firstName} ${req.user!.lastName || ''}`.trim() : 'Academic Evaluator';

    const result = await db.query(`
      INSERT INTO employee_appraisals (
        id, school_id, employee_id, session_id, review_period, rating,
        evaluator_name, pedagogy_score, punctuality_score, discipline_score,
        strengths, areas_for_improvement, recommended_action, increment_percentage, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'COMPLETED')
      RETURNING *
    `, [
      id, schoolId, employeeId, sessionId || null, reviewPeriod.trim(),
      parseFloat(rating), evalName, pedagogyScore || null, punctualityScore || null,
      disciplineScore || null, strengths || null, areasForImprovement || null,
      recommendedAction || 'INCREMENT', incrementPercentage || 0
    ]);

    await recordAuditLog({
      req,
      action: 'RECORD_EMPLOYEE_APPRAISAL',
      module: 'PAYROLL',
      schoolId,
      recordId: id,
      description: `Completed annual appraisal for employee ${employeeId}: Rating ${rating}/5.0`
    });

    return res.status(201).json({ appraisal: result.rows[0], message: 'Performance appraisal recorded successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/lifecycle', requireAuth, requirePermission('appraisals.manage'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const result = await db.query(`
      SELECT
        l.*,
        e.employee_id_number,
        concat(e.first_name, ' ', e.last_name) as employee_name,
        d.name as department_name,
        des.name as designation_name
      FROM employee_lifecycle_events l
      JOIN employees e ON l.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      WHERE l.school_id = $1
      ORDER BY l.event_date DESC
    `, [schoolId]);

    return res.json({ events: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/lifecycle', requireAuth, requirePermission('appraisals.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const {
    employeeId,
    eventType,
    eventDate,
    title,
    details,
    gratuityAmount,
    leaveEncashment,
    pendingDues,
    settlementStatus
  } = req.body;

  if (!employeeId || !eventType || !title) {
    return res.status(400).json({ error: 'Employee, event type, and title are required.' });
  }

  try {
    const id = `evt_${Date.now()}`;
    const grat = parseFloat(gratuityAmount || 0);
    const encash = parseFloat(leaveEncashment || 0);
    const dues = parseFloat(pendingDues || 0);
    const netSettlement = (grat + encash) - dues;
    const authorName = req.user!.firstName ? `${req.user!.firstName} ${req.user!.lastName || ''}`.trim() : 'HR Administrator';

    const result = await db.query(`
      INSERT INTO employee_lifecycle_events (
        id, school_id, employee_id, event_type, event_date, title, details,
        fnf_gratuity_amount, fnf_leave_encashment, fnf_pending_dues,
        fnf_net_settlement, settlement_status, created_by_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      id, schoolId, employeeId, eventType, eventDate || new Date().toISOString().slice(0, 10),
      title.trim(), details || null, grat, encash, dues, netSettlement,
      settlementStatus || (eventType === 'FULL_AND_FINAL' ? 'PENDING' : 'N/A'), authorName
    ]);

    // If RESIGNATION or F&F settlement, update employee status accordingly
    if (eventType === 'RESIGNATION' || eventType === 'TERMINATION') {
      await db.query(`UPDATE employees SET employment_status = 'RESIGNED' WHERE id = $1 AND school_id = $2`, [employeeId, schoolId]);
    } else if (eventType === 'FULL_AND_FINAL') {
      await db.query(`UPDATE employees SET employment_status = 'RELIEVED' WHERE id = $1 AND school_id = $2`, [employeeId, schoolId]);
    }

    await recordAuditLog({
      req,
      action: 'RECORD_HR_LIFECYCLE_EVENT',
      module: 'PAYROLL',
      schoolId,
      recordId: id,
      description: `Recorded HR lifecycle event for employee ${employeeId}: ${title} (${eventType})`
    });

    return res.status(201).json({ event: result.rows[0], message: 'HR event recorded successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. STATUTORY & COMPLIANCE REGISTERS (PF, ESI, PT, TDS)
// ==========================================

router.get('/reports/statutory', requireAuth, requirePermission('payroll.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const cycleId = req.query.cycleId as string;

  try {
    let sql = `
      SELECT
        pi.id,
        pi.slip_number,
        pi.working_days,
        pi.present_days,
        pi.lop_days,
        pi.base_gross,
        pi.basic_pay,
        pi.total_earnings,
        pi.pf_deduction as employee_pf,
        round(pi.basic_pay * 0.12, 2) as employer_epf,
        round(pi.pf_deduction + (pi.basic_pay * 0.12), 2) as total_pf_contribution,
        pi.esic_deduction as employee_esic,
        round(pi.base_gross * 0.0325, 2) as employer_esic,
        pi.pt_deduction,
        pi.tds_deduction,
        pi.net_pay,
        pi.payment_status,
        e.employee_id_number,
        concat(e.first_name, ' ', e.last_name) as employee_name,
        d.name as department_name,
        sa.pan_number,
        sa.pf_uan_number,
        sa.esi_number,
        pc.title as cycle_title,
        pc.month,
        pc.year
      FROM payroll_items pi
      JOIN payroll_cycles pc ON pi.cycle_id = pc.id
      JOIN employees e ON pi.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employee_salary_assignments sa ON pi.salary_assignment_id = sa.id
      WHERE pi.school_id = $1
    `;
    const params: any[] = [schoolId];

    if (cycleId) {
      params.push(cycleId);
      sql += ` AND pi.cycle_id = $${params.length}`;
    }

    sql += ` ORDER BY pc.year DESC, pc.month DESC, e.employee_id_number ASC`;

    const result = await db.query(sql, params);
    return res.json({ registers: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
