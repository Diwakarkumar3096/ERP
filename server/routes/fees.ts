import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// Helper: Generate Unique School Receipt Number
// e.g., VVP-REC-2026-0001 or GIS-REC-2026-0001
async function generateReceiptNumber(schoolId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const schoolRes = await db.query('SELECT receipt_prefix, code FROM schools WHERE id = $1', [schoolId]);
  const schoolRow = schoolRes.rows[0] as { receipt_prefix?: string; code?: string } | undefined;
  const prefix = schoolRow?.receipt_prefix || `${schoolRow?.code || 'SCH'}-REC`;

  const searchPattern = `${prefix}-${currentYear}-%`;
  const countRes = await db.query(
    'SELECT count(*) as count FROM fee_payments WHERE receipt_number LIKE $1',
    [searchPattern]
  );
  const nextNum = parseInt((countRes.rows[0] as any)?.count || '0', 10) + 1;
  const seq = String(nextNum).padStart(4, '0');
  let candidate = `${prefix}-${currentYear}-${seq}`;

  // Check collision
  let dup = await db.query('SELECT id FROM fee_payments WHERE receipt_number = $1', [candidate]);
  let offset = 0;
  while (dup.rows.length > 0) {
    offset++;
    candidate = `${prefix}-${currentYear}-${String(nextNum + offset).padStart(4, '0')}`;
    dup = await db.query('SELECT id FROM fee_payments WHERE receipt_number = $1', [candidate]);
  }
  return candidate;
}

// ==========================================
// 1. DASHBOARD & FINANCIAL METRICS
// ==========================================

router.get('/dashboard-stats', requireAuth, requirePermission('fees.reports.view'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    let targetSchoolId = schoolId;
    if (user.roleName !== 'super_admin' && user.schoolId) {
      targetSchoolId = user.schoolId;
    }

    const schoolFilter = targetSchoolId ? 'WHERE school_id = $1' : '';
    const schoolParams = targetSchoolId ? [targetSchoolId] : [];

    // 1. Today's Collections
    const todayParams: any[] = [date];
    let todayFilter = "WHERE payment_date = $1 AND status = 'SUCCESS'";
    if (targetSchoolId) {
      todayParams.push(targetSchoolId);
      todayFilter += ` AND school_id = $${todayParams.length}`;
    }
    const todayRes = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total, count(*) as count
      FROM fee_payments
      ${todayFilter}
    `, todayParams);
    const todayTotal = parseFloat((todayRes.rows[0] as any)?.total || '0');
    const todayTxnCount = parseInt((todayRes.rows[0] as any)?.count || '0', 10);

    // 2. Collection by Payment Mode Today
    const modeRes = await db.query(`
      SELECT payment_mode, COALESCE(SUM(amount), 0) as total, count(*) as count
      FROM fee_payments
      ${todayFilter}
      GROUP BY payment_mode
      ORDER BY total DESC
    `, todayParams);

    // 3. Overall Session Collections
    const overallRes = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total, count(*) as count
      FROM fee_payments
      ${targetSchoolId ? "WHERE school_id = $1 AND status = 'SUCCESS'" : "WHERE status = 'SUCCESS'"}
    `, schoolParams);
    const totalCollected = parseFloat((overallRes.rows[0] as any)?.total || '0');

    // 4. Total Outstanding Dues & Overdue
    const duesRes = await db.query(`
      SELECT
        COALESCE(SUM(outstanding_balance), 0) as total_dues,
        COALESCE(SUM(total_charges), 0) as total_demand,
        COALESCE(SUM(total_concessions), 0) as total_concessions,
        COALESCE(SUM(paid_amount), 0) as total_paid
      FROM student_fee_assignments
      ${schoolFilter}
    `, schoolParams);
    const totalDues = parseFloat((duesRes.rows[0] as any)?.total_dues || '0');
    const totalDemand = parseFloat((duesRes.rows[0] as any)?.total_demand || '0');
    const totalConcessions = parseFloat((duesRes.rows[0] as any)?.total_concessions || '0');

    // 5. Overdue charges (due_date < today and status != 'PAID')
    const overdueParams: any[] = [date];
    let overdueFilter = "WHERE due_date < $1 AND status IN ('PENDING', 'PARTIALLY_PAID', 'OVERDUE')";
    if (targetSchoolId) {
      overdueParams.push(targetSchoolId);
      overdueFilter += ` AND school_id = $${overdueParams.length}`;
    }
    const overdueRes = await db.query(`
      SELECT COALESCE(SUM(outstanding_amount), 0) as overdue_amount, count(*) as overdue_count
      FROM student_fee_charges
      ${overdueFilter}
    `, overdueParams);
    const overdueAmount = parseFloat((overdueRes.rows[0] as any)?.overdue_amount || '0');
    const overdueCount = parseInt((overdueRes.rows[0] as any)?.overdue_count || '0', 10);

    // 6. Cashier-wise Collection for Today
    const cashierRes = await db.query(`
      SELECT collected_by_name, COALESCE(SUM(amount), 0) as total, count(*) as count
      FROM fee_payments
      ${todayFilter}
      GROUP BY collected_by_name
      ORDER BY total DESC
    `, todayParams);

    // 7. Recent Transactions (last 8)
    const recentParams: any[] = [];
    let recentFilter = '';
    if (targetSchoolId) {
      recentParams.push(targetSchoolId);
      recentFilter = 'WHERE p.school_id = $1';
    }
    const recentRes = await db.query(`
      SELECT p.id, p.receipt_number, p.payment_date, p.payment_time, p.amount,
             p.payment_mode, p.transaction_reference, p.status, p.collected_by_name,
             s.first_name || ' ' || s.last_name as student_name, s.admission_number,
             c.name as class_name, sec.name as section_name
      FROM fee_payments p
      JOIN students s ON p.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      ${recentFilter}
      ORDER BY p.created_at DESC
      LIMIT 8
    `, recentParams);

    // 8. Total Expenses Today & Month
    const expRes = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      ${targetSchoolId ? "WHERE school_id = $1 AND approval_status = 'APPROVED'" : "WHERE approval_status = 'APPROVED'"}
    `, schoolParams);
    const totalExpenses = parseFloat((expRes.rows[0] as any)?.total || '0');

    // 9. Pending Verifications & Refunds Count
    const pendRefundRes = await db.query(`
      SELECT count(*) as count FROM fee_refunds
      ${targetSchoolId ? "WHERE school_id = $1 AND status = 'PENDING'" : "WHERE status = 'PENDING'"}
    `, schoolParams);
    const pendingRefunds = parseInt((pendRefundRes.rows[0] as any)?.count || '0', 10);

    const pendConcRes = await db.query(`
      SELECT count(*) as count FROM fee_concessions
      ${targetSchoolId ? "WHERE school_id = $1 AND status = 'PENDING'" : "WHERE status = 'PENDING'"}
    `, schoolParams);
    const pendingConcessions = parseInt((pendConcRes.rows[0] as any)?.count || '0', 10);

    res.json({
      date,
      schoolId: targetSchoolId,
      todayCollection: {
        total: todayTotal,
        transactionCount: todayTxnCount,
        byMode: modeRes.rows
      },
      summary: {
        totalDemand,
        totalCollected,
        totalDues,
        totalConcessions,
        totalExpenses,
        netCashFlow: totalCollected - totalExpenses
      },
      overdue: {
        amount: overdueAmount,
        count: overdueCount
      },
      cashierSummary: cashierRes.rows,
      recentTransactions: recentRes.rows,
      pendingApprovals: {
        refunds: pendingRefunds,
        concessions: pendingConcessions
      }
    });
  } catch (error: any) {
    console.error('[FEES DASHBOARD ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch fees dashboard statistics' });
  }
});

// ==========================================
// 2. FEE CATEGORIES
// ==========================================

router.get('/categories', requireAuth, requirePermission('fees.structure.view'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);

    let query = 'SELECT * FROM fee_categories';
    const params: any[] = [];
    if (schoolId) {
      params.push(schoolId);
      query += ' WHERE school_id = $1';
    }
    query += ' ORDER BY name ASC';

    const result = await db.query(query, params);
    res.json({ categories: result.rows });
  } catch (error: any) {
    console.error('[FEE CATEGORIES LIST ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch fee categories' });
  }
});

router.post('/categories', requireAuth, requirePermission('fees.structure.manage'), async (req, res) => {
  try {
    const { school_id, name, code, description } = req.body;
    if (!school_id || !name || !code) {
      return res.status(400).json({ error: 'school_id, name, and code are required' });
    }
    if (!checkSchoolScope(req, school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await db.query('SELECT id FROM fee_categories WHERE school_id = $1 AND code = $2', [school_id, cleanCode]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: `Fee category with code '${cleanCode}' already exists in this school.` });
    }

    const id = `fcat_${crypto.randomBytes(6).toString('hex')}`;
    await db.query(`
      INSERT INTO fee_categories (id, school_id, name, code, description, is_system, status)
      VALUES ($1, $2, $3, $4, $5, false, 'active')
    `, [id, school_id, name.trim(), cleanCode, description?.trim() || null]);

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: school_id,
      action: 'FEE_CATEGORY_CREATED',
      module: 'FEES',
      description: `Created custom fee category: ${name} (${cleanCode})`
    });

    res.json({
      success: true,
      categoryId: id,
      id,
      category: { id, school_id, name: name.trim(), code: cleanCode, description: description?.trim() || null },
      message: 'Fee category created successfully.'
    });
  } catch (error: any) {
    console.error('[CREATE FEE CATEGORY ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to create fee category' });
  }
});

router.put('/categories/:id', requireAuth, requirePermission('fees.structure.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    const catRes = await db.query('SELECT * FROM fee_categories WHERE id = $1', [id]);
    if (catRes.rows.length === 0) {
      return res.status(404).json({ error: 'Fee category not found' });
    }
    const cat = catRes.rows[0] as any;
    if (!checkSchoolScope(req, cat.school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    await db.query(`
      UPDATE fee_categories
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          status = COALESCE($3, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [name?.trim(), description?.trim(), status, id]);

    res.json({ success: true, message: 'Fee category updated successfully.' });
  } catch (error: any) {
    console.error('[UPDATE FEE CATEGORY ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to update fee category' });
  }
});

// ==========================================
// 3. FEE STRUCTURES & PLANS
// ==========================================

router.get('/structures', requireAuth, requirePermission('fees.structure.view'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);
    const sessionId = req.query.sessionId as string;

    let query = `
      SELECT fs.*,
             sch.name as school_name, sch.code as school_code,
             sess.name as session_name,
             (SELECT count(*) FROM fee_structure_items WHERE structure_id = fs.id) as item_count,
             (SELECT count(*) FROM fee_installments WHERE structure_id = fs.id) as installment_count,
             (SELECT count(*) FROM student_fee_assignments WHERE structure_id = fs.id) as assigned_student_count,
             COALESCE((SELECT SUM(amount) FROM fee_structure_items WHERE structure_id = fs.id), 0) as total_base_amount
      FROM fee_structures fs
      JOIN schools sch ON fs.school_id = sch.id
      JOIN academic_sessions sess ON fs.session_id = sess.id
    `;
    const params: any[] = [];
    const whereClauses: string[] = [];

    if (schoolId) {
      params.push(schoolId);
      whereClauses.push(`fs.school_id = $${params.length}`);
    }
    if (sessionId) {
      params.push(sessionId);
      whereClauses.push(`fs.session_id = $${params.length}`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    query += ' ORDER BY fs.created_at DESC';

    const result = await db.query(query, params);
    res.json({ structures: result.rows });
  } catch (error: any) {
    console.error('[FEE STRUCTURES LIST ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch fee structures' });
  }
});

router.get('/structures/:id', requireAuth, requirePermission('fees.structure.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const structRes = await db.query(`
      SELECT fs.*, sch.name as school_name, sess.name as session_name
      FROM fee_structures fs
      JOIN schools sch ON fs.school_id = sch.id
      JOIN academic_sessions sess ON fs.session_id = sess.id
      WHERE fs.id = $1
    `, [id]);

    if (structRes.rows.length === 0) {
      return res.status(404).json({ error: 'Fee structure not found' });
    }
    const structure = structRes.rows[0] as any;
    if (!checkSchoolScope(req, structure.school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    // Items
    const itemsRes = await db.query(`
      SELECT fsi.*, fc.name as category_name, fc.code as category_code
      FROM fee_structure_items fsi
      JOIN fee_categories fc ON fsi.category_id = fc.id
      WHERE fsi.structure_id = $1
      ORDER BY fsi.is_mandatory DESC, fc.name ASC
    `, [id]);

    // Installments
    const instRes = await db.query(`
      SELECT * FROM fee_installments
      WHERE structure_id = $1
      ORDER BY installment_number ASC
    `, [id]);

    res.json({
      structure,
      items: itemsRes.rows,
      installments: instRes.rows
    });
  } catch (error: any) {
    console.error('[FEE STRUCTURE DETAILS ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch fee structure details' });
  }
});

router.post('/structures', requireAuth, requirePermission('fees.structure.manage'), async (req, res) => {
  try {
    const {
      school_id,
      session_id,
      name,
      code,
      description,
      frequency = 'QUARTERLY',
      class_ids = [],
      items = [],
      installments = []
    } = req.body;

    if (!school_id || !session_id || !name || !code) {
      return res.status(400).json({ error: 'school_id, session_id, name, and code are required' });
    }
    if (!checkSchoolScope(req, school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await db.query(`
      SELECT id FROM fee_structures
      WHERE school_id = $1 AND session_id = $2 AND code = $3
    `, [school_id, session_id, cleanCode]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: `Fee structure with code '${cleanCode}' already exists for this session.` });
    }

    const structureId = `fstr_${crypto.randomBytes(6).toString('hex')}`;
    const finalClassIds = Array.isArray(class_ids) && class_ids.length > 0 ? class_ids : (req.body.class_id ? [req.body.class_id] : []);
    const classIdsJson = JSON.stringify(finalClassIds);

    // Insert structure
    await db.query(`
      INSERT INTO fee_structures (
        id, school_id, session_id, name, code, description, frequency, target_type, class_ids, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'CLASS', $8, 'active')
    `, [structureId, school_id, session_id, name.trim(), cleanCode, description?.trim() || null, frequency, classIdsJson]);

    // Insert items
    if (Array.isArray(items)) {
      for (const it of items) {
        let itemCatId = it.category_id || it.fee_category_id;
        if (!itemCatId || isNaN(Number(it.amount))) continue;

        // Ensure category exists
        const catCheck = await db.query('SELECT id FROM fee_categories WHERE id = $1', [itemCatId]);
        if (catCheck.rows.length === 0) {
          const fallbackCat = await db.query('SELECT id FROM fee_categories WHERE school_id = $1 LIMIT 1', [school_id]);
          if (fallbackCat.rows.length > 0) {
            itemCatId = (fallbackCat.rows[0] as any).id;
          } else {
            await db.query(`INSERT INTO fee_categories (id, school_id, name, code, is_system, status) VALUES ($1, $2, 'General Fee', 'GEN', false, 'active') ON CONFLICT (id) DO NOTHING`, [itemCatId, school_id]);
          }
        }

        const itemId = `fsi_${crypto.randomBytes(6).toString('hex')}`;
        await db.query(`
          INSERT INTO fee_structure_items (
            id, structure_id, category_id, amount, is_mandatory, late_fee_amount, late_fee_type, grace_period_days
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          itemId, structureId, itemCatId, Number(it.amount),
          it.is_mandatory !== false, Number(it.late_fee_amount || 0),
          it.late_fee_type || 'FIXED', Number(it.grace_period_days || 7)
        ]);
      }
    }

    // Insert installments
    if (Array.isArray(installments)) {
      for (let i = 0; i < installments.length; i++) {
        const inst = installments[i];
        if (!inst.name || !inst.due_date) continue;
        const instId = `inst_${crypto.randomBytes(6).toString('hex')}`;
        await db.query(`
          INSERT INTO fee_installments (
            id, structure_id, installment_number, name, due_date, late_fee_date, percentage_share
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          instId, structureId, i + 1, inst.name.trim(), inst.due_date,
          inst.late_fee_date || inst.due_date, Number(inst.percentage_share || (100 / installments.length))
        ]);
      }
    }

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: school_id,
      action: 'FEE_STRUCTURE_CREATED',
      module: 'FEES',
      description: `Created fee structure: ${name} (${cleanCode}) with ${items.length} items and ${installments.length} installments`
    });

    res.json({ success: true, structureId, id: structureId, message: 'Fee structure created successfully.' });
  } catch (error: any) {
    console.error('[CREATE FEE STRUCTURE ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to create fee structure' });
  }
});

// Update fee structure (protected against modification if already used in payments)
router.put('/structures/:id', requireAuth, requirePermission('fees.structure.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, class_ids } = req.body;

    const structRes = await db.query('SELECT * FROM fee_structures WHERE id = $1', [id]);
    if (structRes.rows.length === 0) {
      return res.status(404).json({ error: 'Fee structure not found' });
    }
    const structure = structRes.rows[0] as any;
    if (!checkSchoolScope(req, structure.school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    // Check if payments exist
    const paymentCheck = await db.query(`
      SELECT count(*) as count FROM student_fee_assignments sfa
      JOIN fee_payments fp ON sfa.student_id = fp.student_id AND sfa.session_id = fp.session_id
      WHERE sfa.structure_id = $1 AND fp.status = 'SUCCESS'
    `, [id]);
    const isUsed = parseInt((paymentCheck.rows[0] as any)?.count || '0', 10) > 0;

    await db.query(`
      UPDATE fee_structures
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          status = COALESCE($3, status),
          class_ids = COALESCE($4, class_ids),
          is_locked = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [name?.trim(), description?.trim(), status, class_ids ? JSON.stringify(class_ids) : null, isUsed, id]);

    res.json({ success: true, message: 'Fee structure updated successfully.' });
  } catch (error: any) {
    console.error('[UPDATE FEE STRUCTURE ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to update fee structure' });
  }
});

// ==========================================
// 4. STUDENT FEE ASSIGNMENTS
// ==========================================

router.get('/assignments', requireAuth, requirePermission('fees.structure.view'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);
    const sessionId = req.query.sessionId as string;
    const classId = req.query.classId as string;
    const sectionId = req.query.sectionId as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    let query = `
      SELECT sfa.*,
             s.admission_number, s.first_name || ' ' || s.last_name as student_name,
             s.roll_number, s.gender, s.mobile_number,
             c.name as class_name, sec.name as section_name,
             fs.name as structure_name, fs.code as structure_code,
             p.name as parent_name, p.mobile_number as parent_mobile, p.email as parent_email
      FROM student_fee_assignments sfa
      JOIN students s ON sfa.student_id = s.id
      JOIN classes c ON sfa.class_id = c.id
      LEFT JOIN sections sec ON sfa.section_id = sec.id
      JOIN fee_structures fs ON sfa.structure_id = fs.id
      LEFT JOIN student_parents sp ON s.id = sp.student_id AND sp.is_primary_guardian = true
      LEFT JOIN parents p ON sp.parent_id = p.id
    `;
    const params: any[] = [];
    const whereClauses: string[] = [];

    if (schoolId) {
      params.push(schoolId);
      whereClauses.push(`sfa.school_id = $${params.length}`);
    }
    if (sessionId) {
      params.push(sessionId);
      whereClauses.push(`sfa.session_id = $${params.length}`);
    }
    if (classId) {
      params.push(classId);
      whereClauses.push(`sfa.class_id = $${params.length}`);
    }
    if (sectionId) {
      params.push(sectionId);
      whereClauses.push(`sfa.section_id = $${params.length}`);
    }
    if (status && status !== 'ALL') {
      params.push(status);
      whereClauses.push(`sfa.status = $${params.length}`);
    }
    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      whereClauses.push(`(
        LOWER(s.admission_number) LIKE $${params.length} OR
        LOWER(s.first_name || ' ' || s.last_name) LIKE $${params.length} OR
        LOWER(p.name) LIKE $${params.length} OR
        LOWER(p.mobile_number) LIKE $${params.length}
      )`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    query += ' ORDER BY c.display_order ASC, s.roll_number ASC, s.admission_number ASC';

    const result = await db.query(query, params);
    res.json({ assignments: result.rows });
  } catch (error: any) {
    console.error('[FEE ASSIGNMENTS LIST ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch student fee assignments' });
  }
});

router.get('/assignments/:id', requireAuth, requirePermission('fees.structure.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const assignRes = await db.query(`
      SELECT sfa.*,
             s.admission_number, s.first_name || ' ' || s.last_name as student_name,
             s.roll_number, s.profile_photo, s.mobile_number, s.email as student_email,
             c.name as class_name, sec.name as section_name,
             fs.name as structure_name, fs.frequency,
             p.name as parent_name, p.mobile_number as parent_mobile, p.email as parent_email
      FROM student_fee_assignments sfa
      JOIN students s ON sfa.student_id = s.id
      JOIN classes c ON sfa.class_id = c.id
      LEFT JOIN sections sec ON sfa.section_id = sec.id
      JOIN fee_structures fs ON sfa.structure_id = fs.id
      LEFT JOIN student_parents sp ON s.id = sp.student_id AND sp.is_primary_guardian = true
      LEFT JOIN parents p ON sp.parent_id = p.id
      WHERE sfa.id = $1
    `, [id]);

    if (assignRes.rows.length === 0) {
      return res.status(404).json({ error: 'Fee assignment not found' });
    }
    const assignment = assignRes.rows[0] as any;
    if (!checkSchoolScope(req, assignment.school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    // Charges breakdown
    const chargesRes = await db.query(`
      SELECT sfc.*, fc.name as category_name, fc.code as category_code
      FROM student_fee_charges sfc
      JOIN fee_categories fc ON sfc.category_id = fc.id
      WHERE sfc.assignment_id = $1
      ORDER BY sfc.due_date ASC, sfc.installment_no ASC
    `, [id]);

    // Payments allocated
    const paymentsRes = await db.query(`
      SELECT DISTINCT p.id, p.receipt_number, p.payment_date, p.payment_time, p.amount,
             p.payment_mode, p.transaction_reference, p.status, p.collected_by_name
      FROM fee_payments p
      JOIN fee_payment_allocations fpa ON p.id = fpa.payment_id
      JOIN student_fee_charges sfc ON fpa.charge_id = sfc.id
      WHERE sfc.assignment_id = $1
      ORDER BY p.payment_date DESC
    `, [id]);

    // Concessions
    const concRes = await db.query(`
      SELECT * FROM fee_concessions
      WHERE assignment_id = $1
      ORDER BY created_at DESC
    `, [id]);

    res.json({
      assignment,
      charges: chargesRes.rows,
      payments: paymentsRes.rows,
      concessions: concRes.rows
    });
  } catch (error: any) {
    console.error('[ASSIGNMENT DETAILS ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch assignment details' });
  }
});

// Assign fee plan to an entire class or section
router.post('/assignments/class', requireAuth, requirePermission('fees.assign'), async (req, res) => {
  try {
    const { school_id, session_id, class_id, section_id, structure_id } = req.body;
    if (!school_id || !session_id || !class_id || !structure_id) {
      return res.status(400).json({ error: 'school_id, session_id, class_id, and structure_id are required' });
    }
    if (!checkSchoolScope(req, school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    // Fetch structure items & installments
    const structRes = await db.query('SELECT * FROM fee_structures WHERE id = $1', [structure_id]);
    if (structRes.rows.length === 0) {
      return res.status(404).json({ error: 'Fee structure not found' });
    }
    const struct = structRes.rows[0] as any;

    const itemsRes = await db.query('SELECT * FROM fee_structure_items WHERE structure_id = $1', [structure_id]);
    const items = itemsRes.rows as any[];
    if (items.length === 0) {
      return res.status(400).json({ error: 'Fee structure has no fee items configured' });
    }

    const instRes = await db.query('SELECT * FROM fee_installments WHERE structure_id = $1 ORDER BY installment_number ASC', [structure_id]);
    const installments = instRes.rows as any[];
    if (installments.length === 0) {
      return res.status(400).json({ error: 'Fee structure has no installments configured' });
    }

    // Find students in class / section
    let stuQuery = "SELECT id, class_id, section_id FROM students WHERE school_id = $1 AND student_status = 'ACTIVE' AND class_id = $2";
    const stuParams: any[] = [school_id, class_id];
    if (section_id) {
      stuParams.push(section_id);
      stuQuery += ' AND section_id = $3';
    }
    const studentsRes = await db.query(stuQuery, stuParams);
    const students = studentsRes.rows as any[];

    if (students.length === 0) {
      return res.status(400).json({ error: 'No active students found in this class / section' });
    }

    let assignedCount = 0;
    let skippedCount = 0;

    for (const stu of students) {
      // Check existing assignment
      const existing = await db.query(`
        SELECT id FROM student_fee_assignments
        WHERE student_id = $1 AND session_id = $2 AND structure_id = $3
      `, [stu.id, session_id, structure_id]);

      if (existing.rows.length > 0) {
        skippedCount++;
        continue;
      }

      const assignId = `sfa_${crypto.randomBytes(6).toString('hex')}`;
      let totalCharges = 0;

      // Calculate total charges from items & installments
      // Distribute items across installments
      const chargesToInsert: any[] = [];
      for (const inst of installments) {
        const shareFraction = (inst.percentage_share || (100 / installments.length)) / 100;
        for (const item of items) {
          const itemChargeAmt = Math.round(Number(item.amount) * shareFraction * 100) / 100;
          totalCharges += itemChargeAmt;
          chargesToInsert.push({
            id: `sfc_${crypto.randomBytes(6).toString('hex')}`,
            assignId,
            studentId: stu.id,
            catId: item.category_id,
            instName: inst.name,
            instNo: inst.installment_number,
            dueDate: inst.due_date,
            amount: itemChargeAmt
          });
        }
      }

      // Insert assignment
      await db.query(`
        INSERT INTO student_fee_assignments (
          id, school_id, session_id, student_id, class_id, section_id, structure_id,
          total_charges, total_concessions, total_late_fees, net_payable, paid_amount,
          waived_amount, refunded_amount, outstanding_balance, status, assigned_date, created_by_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, 0.00, 0.00, $8, 0.00,
          0.00, 0.00, $8, 'PENDING', CURRENT_DATE, $9
        )
      `, [
        assignId, school_id, session_id, stu.id, stu.class_id, stu.section_id,
        structure_id, totalCharges, req.user!.id
      ]);

      // Insert item charges
      for (const ch of chargesToInsert) {
        await db.query(`
          INSERT INTO student_fee_charges (
            id, assignment_id, school_id, session_id, student_id, category_id,
            installment_name, installment_no, due_date, amount, concession_amount,
            late_fee_charged, late_fee_waived, paid_amount, outstanding_amount, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0.00, 0.00, 0.00, 0.00, $10, 'PENDING')
        `, [
          ch.id, ch.assignId, school_id, session_id, ch.studentId, ch.catId,
          ch.instName, ch.instNo, ch.dueDate, ch.amount
        ]);
      }

      assignedCount++;
    }

    // Mark structure as locked
    await db.query('UPDATE fee_structures SET is_locked = true WHERE id = $1', [structure_id]);

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: school_id,
      action: 'FEE_PLAN_BULK_ASSIGNED',
      module: 'FEES',
      description: `Assigned plan ${struct.name} to class: ${assignedCount} students assigned (${skippedCount} already had plan)`
    });

    res.json({
      success: true,
      assignedCount,
      skippedCount,
      message: `Successfully assigned fee structure to ${assignedCount} students (${skippedCount} already assigned).`
    });
  } catch (error: any) {
    console.error('[ASSIGN CLASS FEE ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to assign fee structure to class' });
  }
});

// Assign fee plan to an individual student
router.post('/assignments/student', requireAuth, requirePermission('fees.assign'), async (req, res) => {
  try {
    const school_id = req.body.school_id || req.body.schoolId || req.user!.schoolId;
    const session_id = req.body.session_id || req.body.sessionId;
    const student_id = req.body.student_id || req.body.studentId;
    const structure_id = req.body.structure_id || req.body.structureId || req.body.fee_structure_id;

    if (!school_id || !session_id || !student_id || !structure_id) {
      return res.status(400).json({ error: 'school_id, session_id, student_id, and structure_id are required' });
    }
    if (!checkSchoolScope(req, school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    const stuRes = await db.query('SELECT class_id, section_id FROM students WHERE id = $1', [student_id]);
    if (stuRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const student = stuRes.rows[0] as any;

    const existing = await db.query(`
      SELECT id FROM student_fee_assignments
      WHERE student_id = $1 AND session_id = $2 AND structure_id = $3
    `, [student_id, session_id, structure_id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'This student already has this fee plan assigned for this session.' });
    }

    const itemsRes = await db.query('SELECT * FROM fee_structure_items WHERE structure_id = $1', [structure_id]);
    const items = itemsRes.rows as any[];
    const instRes = await db.query('SELECT * FROM fee_installments WHERE structure_id = $1 ORDER BY installment_number ASC', [structure_id]);
    const installments = instRes.rows as any[];

    if (items.length === 0 || installments.length === 0) {
      return res.status(400).json({ error: 'Fee structure missing items or installments' });
    }

    const assignId = `sfa_${crypto.randomBytes(6).toString('hex')}`;
    let totalCharges = 0;
    const chargesToInsert: any[] = [];

    for (const inst of installments) {
      const shareFraction = (inst.percentage_share || (100 / installments.length)) / 100;
      for (const item of items) {
        const itemChargeAmt = Math.round(Number(item.amount) * shareFraction * 100) / 100;
        totalCharges += itemChargeAmt;
        chargesToInsert.push({
          id: `sfc_${crypto.randomBytes(6).toString('hex')}`,
          assignId,
          catId: item.category_id,
          instName: inst.name,
          instNo: inst.installment_number,
          dueDate: inst.due_date,
          amount: itemChargeAmt
        });
      }
    }

    await db.query(`
      INSERT INTO student_fee_assignments (
        id, school_id, session_id, student_id, class_id, section_id, structure_id,
        total_charges, total_concessions, total_late_fees, net_payable, paid_amount,
        waived_amount, refunded_amount, outstanding_balance, status, assigned_date, created_by_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, 0.00, 0.00, $8, 0.00,
        0.00, 0.00, $8, 'PENDING', CURRENT_DATE, $9
      )
    `, [
      assignId, school_id, session_id, student_id, student.class_id, student.section_id,
      structure_id, totalCharges, req.user!.id
    ]);

    for (const ch of chargesToInsert) {
      await db.query(`
        INSERT INTO student_fee_charges (
          id, assignment_id, school_id, session_id, student_id, category_id,
          installment_name, installment_no, due_date, amount, concession_amount,
          late_fee_charged, late_fee_waived, paid_amount, outstanding_amount, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0.00, 0.00, 0.00, 0.00, $10, 'PENDING')
      `, [
        ch.id, ch.assignId, school_id, session_id, student_id, ch.catId,
        ch.instName, ch.instNo, ch.dueDate, ch.amount
      ]);
    }

    await db.query('UPDATE fee_structures SET is_locked = true WHERE id = $1', [structure_id]);

    res.json({ success: true, assignmentId: assignId, message: 'Fee plan assigned to student successfully.' });
  } catch (error: any) {
    console.error('[ASSIGN STUDENT FEE ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to assign fee plan' });
  }
});

// ==========================================
// 5. FEE COLLECTION & PAYMENTS
// ==========================================

// Fast Search for Student Fee Counter
router.get('/students/search', requireAuth, requirePermission('fees.collect'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);
    const queryStr = (req.query.q as string || '').trim().toLowerCase();

    if (!queryStr) {
      return res.json({ students: [] });
    }

    let sql = `
      SELECT s.id, s.admission_number, s.first_name || ' ' || s.last_name as student_name,
             s.roll_number, s.gender, s.profile_photo, s.mobile_number, s.school_id,
             c.name as class_name, sec.name as section_name,
             p.name as parent_name, p.mobile_number as parent_mobile,
             COALESCE((SELECT SUM(outstanding_balance) FROM student_fee_assignments WHERE student_id = s.id), 0) as total_outstanding
      FROM students s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN student_parents sp ON s.id = sp.student_id AND sp.is_primary_guardian = true
      LEFT JOIN parents p ON sp.parent_id = p.id
      WHERE s.student_status = 'ACTIVE'
    `;
    const params: any[] = [];

    if (schoolId) {
      params.push(schoolId);
      sql += ` AND s.school_id = $${params.length}`;
    }

    params.push(`%${queryStr}%`);
    sql += ` AND (
      LOWER(s.admission_number) LIKE $${params.length} OR
      LOWER(s.first_name || ' ' || s.last_name) LIKE $${params.length} OR
      LOWER(COALESCE(p.name, '')) LIKE $${params.length} OR
      LOWER(COALESCE(p.mobile_number, '')) LIKE $${params.length} OR
      LOWER(COALESCE(s.mobile_number, '')) LIKE $${params.length}
    )`;

    sql += ' ORDER BY s.admission_number ASC LIMIT 10';
    const result = await db.query(sql, params);
    res.json({ students: result.rows });
  } catch (error: any) {
    console.error('[SEARCH STUDENTS ERROR]', error);
    res.status(500).json({ error: 'Failed to search students' });
  }
});

// Student Payable Summary (used for Collection Screen)
router.get('/students/:id/payable-summary', requireAuth, requirePermission('fees.collect'), async (req, res) => {
  try {
    const { id } = req.params;
    const stuRes = await db.query(`
      SELECT s.id, s.admission_number, s.first_name || ' ' || s.last_name as student_name,
             s.roll_number, s.profile_photo, s.school_id, s.session_id, s.class_id, s.section_id,
             c.name as class_name, sec.name as section_name,
             sch.name as school_name, sch.code as school_code, sch.address as school_address,
             sch.phone as school_phone, sch.email as school_email, sch.receipt_prefix,
             p.name as parent_name, p.mobile_number as parent_mobile, p.email as parent_email
      FROM students s
      JOIN schools sch ON s.school_id = sch.id
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN student_parents sp ON s.id = sp.student_id AND sp.is_primary_guardian = true
      LEFT JOIN parents p ON sp.parent_id = p.id
      WHERE s.id = $1
    `, [id]);

    if (stuRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const student = stuRes.rows[0] as any;
    if (!checkSchoolScope(req, student.school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    // Unpaid & Partially paid charges
    const chargesRes = await db.query(`
      SELECT sfc.*, fc.name as category_name, fc.code as category_code
      FROM student_fee_charges sfc
      JOIN fee_categories fc ON sfc.category_id = fc.id
      WHERE sfc.student_id = $1 AND sfc.status IN ('PENDING', 'PARTIALLY_PAID', 'OVERDUE')
      ORDER BY sfc.due_date ASC, sfc.installment_no ASC
    `, [id]);

    // Assignments summary
    const assignRes = await db.query(`
      SELECT sfa.*, fs.name as structure_name
      FROM student_fee_assignments sfa
      JOIN fee_structures fs ON sfa.structure_id = fs.id
      WHERE sfa.student_id = $1
    `, [id]);

    // Previous Payments
    const prevPaymentsRes = await db.query(`
      SELECT p.id, p.receipt_number, p.payment_date, p.payment_time, p.amount,
             p.payment_mode, p.status, p.collected_by_name
      FROM fee_payments p
      WHERE p.student_id = $1
      ORDER BY p.payment_date DESC
      LIMIT 5
    `, [id]);

    // Calculate totals
    let totalOutstanding = 0;
    for (const ch of chargesRes.rows as any[]) {
      totalOutstanding += parseFloat(ch.outstanding_amount);
    }

    res.json({
      student,
      assignments: assignRes.rows,
      unpaidCharges: chargesRes.rows,
      totalOutstanding,
      recentPayments: prevPaymentsRes.rows
    });
  } catch (error: any) {
    console.error('[PAYABLE SUMMARY ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch payable summary' });
  }
});

// Collect Payment Transaction (Atomic with Idempotency & Receipt Generation)
router.post('/payments', requireAuth, requirePermission('fees.collect'), async (req, res) => {
  try {
    const {
      school_id,
      session_id,
      student_id,
      amount,
      payment_mode,
      transaction_reference,
      cheque_number,
      cheque_date,
      bank_name,
      allocations = [],
      remarks,
      idempotency_key
    } = req.body;

    if (!school_id || !student_id || !amount || !payment_mode) {
      return res.status(400).json({ error: 'school_id, student_id, amount, and payment_mode are required' });
    }
    if (!checkSchoolScope(req, school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be a positive number' });
    }

    // Idempotency check to prevent duplicate submission
    const finalIdempotency = idempotency_key || `idem_${crypto.randomBytes(8).toString('hex')}`;
    const existingTxn = await db.query('SELECT * FROM fee_payments WHERE idempotency_key = $1', [finalIdempotency]);
    if (existingTxn.rows.length > 0) {
      const existing = existingTxn.rows[0] as any;
      return res.json({
        success: true,
        isDuplicateSuppressed: true,
        paymentId: existing.id,
        receiptNumber: existing.receipt_number,
        message: 'Payment already processed with this transaction token.'
      });
    }

    // Fetch Student & School Details for Receipt Snapshot
    const stuRes = await db.query(`
      SELECT s.id, s.admission_number, s.first_name || ' ' || s.last_name as student_name,
             s.roll_number, s.class_id, s.section_id, s.session_id,
             c.name as class_name, sec.name as section_name,
             sch.name as school_name, sch.code as school_code, sch.address as school_address,
             sch.phone as school_phone, sch.email as school_email, sch.receipt_prefix,
             p.name as parent_name, p.mobile_number as parent_mobile
      FROM students s
      JOIN schools sch ON s.school_id = sch.id
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN student_parents sp ON s.id = sp.student_id AND sp.is_primary_guardian = true
      LEFT JOIN parents p ON sp.parent_id = p.id
      WHERE s.id = $1
    `, [student_id]);

    if (stuRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const student = stuRes.rows[0] as any;
    const targetSessionId = session_id || student.session_id;

    // Generate unique receipt number
    const receiptNumber = await generateReceiptNumber(school_id);
    const paymentId = `pay_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date();
    const paymentDate = now.toISOString().split('T')[0];
    const paymentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const collectorName = `${req.user!.firstName} ${req.user!.lastName}`;

    // Get current total outstanding balance before payment
    const preBalRes = await db.query(`
      SELECT COALESCE(SUM(outstanding_balance), 0) as balance
      FROM student_fee_assignments WHERE student_id = $1
    `, [student_id]);
    const previousBalance = parseFloat((preBalRes.rows[0] as any)?.balance || '0');

    // 1. Insert Payment Record
    await db.query(`
      INSERT INTO fee_payments (
        id, school_id, session_id, student_id, receipt_number, payment_date, payment_time,
        amount, payment_mode, transaction_reference, cheque_number, cheque_date, bank_name,
        verification_status, status, collected_by_id, collected_by_name, remarks, idempotency_key
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        'VERIFIED', 'SUCCESS', $14, $15, $16, $17
      )
    `, [
      paymentId, school_id, targetSessionId, student_id, receiptNumber, paymentDate, paymentTime,
      payAmount, payment_mode, transaction_reference?.trim() || null,
      cheque_number?.trim() || null, cheque_date || null, bank_name?.trim() || null,
      req.user!.id, collectorName, remarks?.trim() || null, finalIdempotency
    ]);

    // 2. Perform Allocations across fee charges
    let remainingToAllocate = payAmount;
    const allocatedItemsSnapshot: any[] = [];

    // If explicit allocations passed from client
    if (Array.isArray(allocations) && allocations.length > 0) {
      for (const alloc of allocations) {
        if (!alloc.charge_id || isNaN(Number(alloc.amount))) continue;
        const allocAmt = Math.min(Number(alloc.amount), remainingToAllocate);
        if (allocAmt <= 0) continue;

        const chRes = await db.query(`
          SELECT sfc.*, fc.name as category_name
          FROM student_fee_charges sfc
          JOIN fee_categories fc ON sfc.category_id = fc.id
          WHERE sfc.id = $1
        `, [alloc.charge_id]);

        if (chRes.rows.length === 0) continue;
        const ch = chRes.rows[0] as any;

        const allocId = `fpa_${crypto.randomBytes(6).toString('hex')}`;
        await db.query(`
          INSERT INTO fee_payment_allocations (
            id, payment_id, charge_id, amount_allocated, category_name, installment_name
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [allocId, paymentId, ch.id, allocAmt, ch.category_name, ch.installment_name]);

        // Update charge
        const newPaid = parseFloat(ch.paid_amount) + allocAmt;
        const newOutstanding = Math.max(0, parseFloat(ch.amount) - parseFloat(ch.concession_amount) - newPaid);
        const newStatus = newOutstanding === 0 ? 'PAID' : 'PARTIALLY_PAID';

        await db.query(`
          UPDATE student_fee_charges
          SET paid_amount = $1, outstanding_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [newPaid, newOutstanding, newStatus, ch.id]);

        allocatedItemsSnapshot.push({
          category: ch.category_name,
          installment: ch.installment_name,
          amount: allocAmt
        });

        remainingToAllocate -= allocAmt;
      }
    } else {
      // Auto-allocate against oldest unpaid charges
      const unpaidChargesRes = await db.query(`
        SELECT sfc.*, fc.name as category_name
        FROM student_fee_charges sfc
        JOIN fee_categories fc ON sfc.category_id = fc.id
        WHERE sfc.student_id = $1 AND sfc.status IN ('PENDING', 'PARTIALLY_PAID', 'OVERDUE')
        ORDER BY sfc.due_date ASC, sfc.installment_no ASC
      `, [student_id]);

      for (const ch of (unpaidChargesRes.rows as any[])) {
        if (remainingToAllocate <= 0) break;
        const chOutstanding = parseFloat(ch.outstanding_amount);
        const allocAmt = Math.min(chOutstanding, remainingToAllocate);

        const allocId = `fpa_${crypto.randomBytes(6).toString('hex')}`;
        await db.query(`
          INSERT INTO fee_payment_allocations (
            id, payment_id, charge_id, amount_allocated, category_name, installment_name
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [allocId, paymentId, ch.id, allocAmt, ch.category_name, ch.installment_name]);

        const newPaid = parseFloat(ch.paid_amount) + allocAmt;
        const newOutstanding = Math.max(0, chOutstanding - allocAmt);
        const newStatus = newOutstanding === 0 ? 'PAID' : 'PARTIALLY_PAID';

        await db.query(`
          UPDATE student_fee_charges
          SET paid_amount = $1, outstanding_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [newPaid, newOutstanding, newStatus, ch.id]);

        allocatedItemsSnapshot.push({
          category: ch.category_name,
          installment: ch.installment_name,
          amount: allocAmt
        });

        remainingToAllocate -= allocAmt;
      }
    }

    // 3. Recalculate Student Fee Assignments balance & status
    const assignmentsRes = await db.query(`
      SELECT id FROM student_fee_assignments WHERE student_id = $1
    `, [student_id]);

    for (const aRow of (assignmentsRes.rows as any[])) {
      const aggRes = await db.query(`
        SELECT
          COALESCE(SUM(amount), 0) as total_amt,
          COALESCE(SUM(concession_amount), 0) as total_conc,
          COALESCE(SUM(paid_amount), 0) as total_paid,
          COALESCE(SUM(outstanding_amount), 0) as total_out
        FROM student_fee_charges
        WHERE assignment_id = $1
      `, [aRow.id]);

      const agg = aggRes.rows[0] as any;
      const tOut = parseFloat(agg.total_out);
      const aStatus = tOut === 0 ? 'PAID' : parseFloat(agg.total_paid) > 0 ? 'PARTIALLY_PAID' : 'PENDING';

      await db.query(`
        UPDATE student_fee_assignments
        SET paid_amount = $1, outstanding_balance = $2, status = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [agg.total_paid, agg.total_out, aStatus, aRow.id]);
    }

    const remainingBalance = Math.max(0, previousBalance - payAmount);

    // 4. Generate & Save Official Receipt Voucher Snapshot
    const receiptPayload = {
      receiptNumber,
      date: paymentDate,
      time: paymentTime,
      school: {
        name: student.school_name,
        code: student.school_code,
        address: student.school_address,
        phone: student.school_phone,
        email: student.school_email
      },
      student: {
        id: student.id,
        name: student.student_name,
        admissionNumber: student.admission_number,
        rollNumber: student.roll_number,
        class: student.class_name,
        section: student.section_name
      },
      parent: {
        name: student.parent_name || 'Guardian',
        mobile: student.parent_mobile || ''
      },
      itemsPaid: allocatedItemsSnapshot.length > 0 ? allocatedItemsSnapshot : [
        { category: 'Fee Payment Counter Receipt', installment: 'Session 2025-26', amount: payAmount }
      ],
      totalAmount: payAmount,
      paymentMode: payment_mode,
      transactionReference: transaction_reference || cheque_number || 'OFFICE-COUNTER',
      previousBalance,
      remainingBalance,
      collectedBy: collectorName,
      remarks: remarks || 'Payment confirmed and credited to student account'
    };

    const receiptId = `rcpt_${crypto.randomBytes(6).toString('hex')}`;
    await db.query(`
      INSERT INTO fee_receipts (
        id, payment_id, receipt_number, school_id, student_id, total_amount, payload_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [receiptId, paymentId, receiptNumber, school_id, student_id, payAmount, JSON.stringify(receiptPayload)]);

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: collectorName,
      userRole: req.user!.roleName,
      schoolId: school_id,
      action: 'FEE_PAYMENT_COLLECTED',
      module: 'FEES',
      description: `Collected ₹${payAmount.toLocaleString()} via ${payment_mode} for ${student.student_name} (${student.admission_number}). Receipt: ${receiptNumber}`
    });

    res.json({
      success: true,
      paymentId,
      receiptNumber,
      receipt: receiptPayload,
      message: `Payment of ₹${payAmount.toLocaleString()} recorded successfully. Receipt #${receiptNumber} generated.`
    });
  } catch (error: any) {
    console.error('[PROCESS FEE PAYMENT ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to process fee payment' });
  }
});

// List Payments / Transaction History
router.get('/payments', requireAuth, requirePermission('fees.receipt.view'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const paymentMode = req.query.paymentMode as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    let query = `
      SELECT p.*,
             s.admission_number, s.first_name || ' ' || s.last_name as student_name,
             s.roll_number, c.name as class_name, sec.name as section_name,
             sch.name as school_name, sch.code as school_code
      FROM fee_payments p
      JOIN students s ON p.student_id = s.id
      JOIN schools sch ON p.school_id = sch.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
    `;
    const params: any[] = [];
    const whereClauses: string[] = [];

    if (schoolId) {
      params.push(schoolId);
      whereClauses.push(`p.school_id = $${params.length}`);
    }
    if (startDate) {
      params.push(startDate);
      whereClauses.push(`p.payment_date >= $${params.length}`);
    }
    if (endDate) {
      params.push(endDate);
      whereClauses.push(`p.payment_date <= $${params.length}`);
    }
    if (paymentMode && paymentMode !== 'ALL') {
      params.push(paymentMode);
      whereClauses.push(`p.payment_mode = $${params.length}`);
    }
    if (status && status !== 'ALL') {
      params.push(status);
      whereClauses.push(`p.status = $${params.length}`);
    }
    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      whereClauses.push(`(
        LOWER(p.receipt_number) LIKE $${params.length} OR
        LOWER(s.admission_number) LIKE $${params.length} OR
        LOWER(s.first_name || ' ' || s.last_name) LIKE $${params.length} OR
        LOWER(COALESCE(p.transaction_reference, '')) LIKE $${params.length}
      )`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    query += ' ORDER BY p.payment_date DESC, p.created_at DESC LIMIT 100';

    const result = await db.query(query, params);
    res.json({ payments: result.rows });
  } catch (error: any) {
    console.error('[PAYMENTS LIST ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Single Payment details with allocations
router.get('/payments/:id', requireAuth, requirePermission('fees.receipt.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const payRes = await db.query(`
      SELECT p.*, s.first_name || ' ' || s.last_name as student_name, s.admission_number,
             c.name as class_name, sec.name as section_name,
             sch.name as school_name, sch.code as school_code
      FROM fee_payments p
      JOIN students s ON p.student_id = s.id
      JOIN schools sch ON p.school_id = sch.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE p.id = $1
    `, [id]);

    if (payRes.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    const payment = payRes.rows[0] as any;
    if (!checkSchoolScope(req, payment.school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    const allocRes = await db.query(`
      SELECT * FROM fee_payment_allocations WHERE payment_id = $1
    `, [id]);

    const receiptRes = await db.query(`
      SELECT * FROM fee_receipts WHERE payment_id = $1
    `, [id]);

    res.json({
      payment,
      allocations: allocRes.rows,
      receipt: receiptRes.rows[0] ? JSON.parse((receiptRes.rows[0] as any).payload_json) : null
    });
  } catch (error: any) {
    console.error('[PAYMENT DETAILS ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch payment details' });
  }
});

// ==========================================
// 6. RECEIPTS & REPRINTING
// ==========================================

router.get('/receipts/:receiptNumber', requireAuth, requirePermission('fees.receipt.view'), async (req, res) => {
  try {
    const { receiptNumber } = req.params;
    const rcptRes = await db.query(`
      SELECT fr.*, fp.payment_date, fp.payment_time, fp.payment_mode, fp.status as payment_status
      FROM fee_receipts fr
      JOIN fee_payments fp ON fr.payment_id = fp.id
      WHERE fr.receipt_number = $1
    `, [receiptNumber]);

    if (rcptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt voucher not found' });
    }
    const row = rcptRes.rows[0] as any;
    if (!checkSchoolScope(req, row.school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    const payload = JSON.parse(row.payload_json);
    res.json({
      receiptId: row.id,
      receiptNumber: row.receipt_number,
      totalAmount: row.total_amount,
      reprintCount: row.reprint_count,
      lastReprintedAt: row.last_reprinted_at,
      paymentStatus: row.payment_status,
      receipt: payload
    });
  } catch (error: any) {
    console.error('[FETCH RECEIPT ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch receipt voucher' });
  }
});

router.post('/receipts/:receiptNumber/reprint', requireAuth, requirePermission('fees.receipt.reprint'), async (req, res) => {
  try {
    const { receiptNumber } = req.params;
    const rcptRes = await db.query('SELECT * FROM fee_receipts WHERE receipt_number = $1', [receiptNumber]);
    if (rcptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    const receipt = rcptRes.rows[0] as any;
    if (!checkSchoolScope(req, receipt.school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    const newCount = (receipt.reprint_count || 0) + 1;
    const renamer = `${req.user!.firstName} ${req.user!.lastName}`;

    await db.query(`
      UPDATE fee_receipts
      SET reprint_count = $1, last_reprinted_at = CURRENT_TIMESTAMP, last_reprinted_by = $2
      WHERE id = $3
    `, [newCount, renamer, receipt.id]);

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: renamer,
      userRole: req.user!.roleName,
      schoolId: receipt.school_id,
      action: 'FEE_RECEIPT_REPRINTED',
      module: 'FEES',
      description: `Reprinted fee receipt voucher #${receiptNumber} (Reprint count: ${newCount})`
    });

    res.json({ success: true, reprintCount: newCount, message: `Receipt reprint recorded (Copy #${newCount}).` });
  } catch (error: any) {
    console.error('[REPRINT RECEIPT ERROR]', error);
    res.status(500).json({ error: 'Failed to log receipt reprint' });
  }
});

// ==========================================
// 7. CONCESSIONS & SCHOLARSHIPS
// ==========================================

router.get('/concessions', requireAuth, requirePermission('fees.structure.view'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);
    const status = req.query.status as string;

    let query = `
      SELECT fc.*,
             s.admission_number, s.first_name || ' ' || s.last_name as student_name,
             c.name as class_name, sec.name as section_name,
             sch.name as school_name, sch.code as school_code
      FROM fee_concessions fc
      JOIN students s ON fc.student_id = s.id
      JOIN schools sch ON fc.school_id = sch.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
    `;
    const params: any[] = [];
    const whereClauses: string[] = [];

    if (schoolId) {
      params.push(schoolId);
      whereClauses.push(`fc.school_id = $${params.length}`);
    }
    if (status && status !== 'ALL') {
      params.push(status);
      whereClauses.push(`fc.status = $${params.length}`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    query += ' ORDER BY fc.created_at DESC';

    const result = await db.query(query, params);
    res.json({ concessions: result.rows });
  } catch (error: any) {
    console.error('[CONCESSIONS LIST ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch concessions' });
  }
});

router.post('/concessions', requireAuth, requirePermission('fees.concession.request'), async (req, res) => {
  try {
    const {
      school_id,
      session_id,
      student_id,
      assignment_id,
      concession_type,
      discount_type,
      discount_value,
      reason,
      document_url
    } = req.body;

    if (!school_id || !student_id || !concession_type || !discount_type || isNaN(Number(discount_value)) || !reason) {
      return res.status(400).json({ error: 'Missing required concession fields' });
    }
    if (!checkSchoolScope(req, school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    // Calculate amount
    let targetAssignId = assignment_id;
    if (!targetAssignId) {
      const aRes = await db.query('SELECT id, total_charges FROM student_fee_assignments WHERE student_id = $1 LIMIT 1', [student_id]);
      if (aRes.rows.length === 0) {
        return res.status(400).json({ error: 'Student has no active fee assignment to apply concession to' });
      }
      targetAssignId = (aRes.rows[0] as any).id;
    }

    const assignRes = await db.query('SELECT * FROM student_fee_assignments WHERE id = $1', [targetAssignId]);
    const assignment = assignRes.rows[0] as any;

    let calcAmt = 0;
    const val = Number(discount_value);
    if (discount_type === 'PERCENTAGE') {
      calcAmt = Math.round((parseFloat(assignment.total_charges) * (val / 100)) * 100) / 100;
    } else {
      calcAmt = Math.min(val, parseFloat(assignment.total_charges));
    }

    const id = `conc_${crypto.randomBytes(6).toString('hex')}`;
    const requesterName = `${req.user!.firstName} ${req.user!.lastName}`;

    await db.query(`
      INSERT INTO fee_concessions (
        id, school_id, session_id, student_id, assignment_id, concession_type,
        discount_type, discount_value, calculated_amount, reason, document_url,
        status, requested_by_id, requested_by_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', $12, $13)
    `, [
      id, school_id, session_id || assignment.session_id, student_id, targetAssignId,
      concession_type, discount_type, val, calcAmt, reason.trim(),
      document_url?.trim() || null, req.user!.id, requesterName
    ]);

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: requesterName,
      userRole: req.user!.roleName,
      schoolId: school_id,
      action: 'FEE_CONCESSION_REQUESTED',
      module: 'FEES',
      description: `Requested ${concession_type} concession of ₹${calcAmt.toLocaleString()} for student ${student_id}`
    });

    res.json({ success: true, concessionId: id, calculatedAmount: calcAmt, message: 'Fee concession request submitted for administrative review.' });
  } catch (error: any) {
    console.error('[REQUEST CONCESSION ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to submit concession request' });
  }
});

router.patch('/concessions/:id/review', requireAuth, requirePermission('fees.concession.approve'), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, approval_remarks } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ error: "Action must be either 'APPROVED' or 'REJECTED'" });
    }

    const concRes = await db.query('SELECT * FROM fee_concessions WHERE id = $1', [id]);
    if (concRes.rows.length === 0) {
      return res.status(404).json({ error: 'Concession request not found' });
    }
    const conc = concRes.rows[0] as any;
    if (!checkSchoolScope(req, conc.school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    if (conc.status !== 'PENDING') {
      return res.status(400).json({ error: `This concession request is already ${conc.status}.` });
    }

    // Anti-self-approval rule
    if (conc.requested_by_id === req.user!.id && req.user!.roleName !== 'super_admin') {
      return res.status(403).json({ error: 'Conflict of interest: You cannot approve your own concession request.' });
    }

    const reviewerName = `${req.user!.firstName} ${req.user!.lastName}`;

    if (action === 'APPROVED') {
      // Apply concession to assignment and recalculate charges
      const assignRes = await db.query('SELECT * FROM student_fee_assignments WHERE id = $1', [conc.assignment_id]);
      if (assignRes.rows.length > 0) {
        const assign = assignRes.rows[0] as any;
        const concAmt = parseFloat(conc.calculated_amount);
        const newTotalConc = parseFloat(assign.total_concessions) + concAmt;
        const newNetPayable = Math.max(0, parseFloat(assign.total_charges) - newTotalConc);
        const newOutstanding = Math.max(0, newNetPayable - parseFloat(assign.paid_amount));
        const newStatus = newOutstanding === 0 ? 'PAID' : parseFloat(assign.paid_amount) > 0 ? 'PARTIALLY_PAID' : 'PENDING';

        await db.query(`
          UPDATE student_fee_assignments
          SET total_concessions = $1, net_payable = $2, outstanding_balance = $3, status = $4, updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
        `, [newTotalConc, newNetPayable, newOutstanding, newStatus, assign.id]);

        // Proportionally distribute concession across unpaid charges
        const unpaidRes = await db.query(`
          SELECT * FROM student_fee_charges
          WHERE assignment_id = $1 AND status != 'PAID'
          ORDER BY due_date ASC
        `, [assign.id]);

        let remainingConc = concAmt;
        for (const ch of (unpaidRes.rows as any[])) {
          if (remainingConc <= 0) break;
          const chOut = parseFloat(ch.outstanding_amount);
          const chConcession = Math.min(chOut, remainingConc);
          const newChConc = parseFloat(ch.concession_amount) + chConcession;
          const newChOut = Math.max(0, chOut - chConcession);
          const chStat = newChOut === 0 ? 'PAID' : 'PARTIALLY_PAID';

          await db.query(`
            UPDATE student_fee_charges
            SET concession_amount = $1, outstanding_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
          `, [newChConc, newChOut, chStat, ch.id]);

          remainingConc -= chConcession;
        }
      }
    }

    await db.query(`
      UPDATE fee_concessions
      SET status = $1, approved_by_id = $2, approved_by_name = $3, approval_remarks = $4, approved_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [action, req.user!.id, reviewerName, approval_remarks?.trim() || null, id]);

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: reviewerName,
      userRole: req.user!.roleName,
      schoolId: conc.school_id,
      action: action === 'APPROVED' ? 'FEE_CONCESSION_APPROVED' : 'FEE_CONCESSION_REJECTED',
      module: 'FEES',
      description: `${action} fee concession request #${id} for ₹${parseFloat(conc.calculated_amount).toLocaleString()}`
    });

    res.json({
      success: true,
      message: action === 'APPROVED' ? 'Fee concession approved and adjusted in student ledger.' : 'Fee concession rejected.'
    });
  } catch (error: any) {
    console.error('[REVIEW CONCESSION ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to review concession request' });
  }
});

// ==========================================
// 8. REFUNDS & REVERSALS
// ==========================================

router.get('/refunds', requireAuth, requirePermission('fees.receipt.view'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);

    let query = `
      SELECT r.*,
             fp.receipt_number, fp.payment_date, fp.amount as payment_amount,
             s.admission_number, s.first_name || ' ' || s.last_name as student_name,
             c.name as class_name, sec.name as section_name
      FROM fee_refunds r
      JOIN fee_payments fp ON r.payment_id = fp.id
      JOIN students s ON r.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
    `;
    const params: any[] = [];
    if (schoolId) {
      params.push(schoolId);
      query += ' WHERE r.school_id = $1';
    }
    query += ' ORDER BY r.created_at DESC';

    const result = await db.query(query, params);
    res.json({ refunds: result.rows });
  } catch (error: any) {
    console.error('[REFUNDS LIST ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch refunds' });
  }
});

router.post('/refunds', requireAuth, requirePermission('fees.refund.request'), async (req, res) => {
  try {
    const { school_id, payment_id, amount, reason, payment_mode = 'BANK_TRANSFER', transaction_reference } = req.body;
    if (!school_id || !payment_id || isNaN(Number(amount)) || !reason) {
      return res.status(400).json({ error: 'school_id, payment_id, amount, and reason are required' });
    }
    if (!checkSchoolScope(req, school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    const payRes = await db.query('SELECT * FROM fee_payments WHERE id = $1', [payment_id]);
    if (payRes.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    const payment = payRes.rows[0] as any;

    if (payment.status !== 'SUCCESS') {
      return res.status(400).json({ error: `Cannot refund payment with status '${payment.status}'.` });
    }

    const refundAmt = Number(amount);
    if (refundAmt <= 0 || refundAmt > parseFloat(payment.amount)) {
      return res.status(400).json({ error: `Refund amount cannot exceed payment total of ₹${parseFloat(payment.amount).toLocaleString()}` });
    }

    const id = `ref_${crypto.randomBytes(6).toString('hex')}`;
    const requesterName = `${req.user!.firstName} ${req.user!.lastName}`;

    await db.query(`
      INSERT INTO fee_refunds (
        id, school_id, payment_id, student_id, amount, reason, payment_mode,
        transaction_reference, status, requested_by_id, requested_by_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9, $10)
    `, [
      id, school_id, payment_id, payment.student_id, refundAmt, reason.trim(),
      payment_mode, transaction_reference?.trim() || null, req.user!.id, requesterName
    ]);

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: requesterName,
      userRole: req.user!.roleName,
      schoolId: school_id,
      action: 'FEE_REFUND_REQUESTED',
      module: 'FEES',
      description: `Requested refund of ₹${refundAmt.toLocaleString()} for Receipt #${payment.receipt_number}`
    });

    res.json({ success: true, refundId: id, message: 'Fee refund request submitted for approval.' });
  } catch (error: any) {
    console.error('[REQUEST REFUND ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to request refund' });
  }
});

router.patch('/refunds/:id/review', requireAuth, requirePermission('fees.refund.approve'), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, approval_remarks } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ error: "Action must be 'APPROVED' or 'REJECTED'" });
    }

    const refRes = await db.query('SELECT * FROM fee_refunds WHERE id = $1', [id]);
    if (refRes.rows.length === 0) {
      return res.status(404).json({ error: 'Refund request not found' });
    }
    const refund = refRes.rows[0] as any;
    if (!checkSchoolScope(req, refund.school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    if (refund.status !== 'PENDING') {
      return res.status(400).json({ error: `Refund is already ${refund.status}.` });
    }

    const reviewerName = `${req.user!.firstName} ${req.user!.lastName}`;

    if (action === 'APPROVED') {
      const refAmt = parseFloat(refund.amount);
      // Update payment status
      await db.query(`
        UPDATE fee_payments
        SET status = 'REFUNDED', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [refund.payment_id]);

      // Update student fee assignment refunded amount
      await db.query(`
        UPDATE student_fee_assignments
        SET refunded_amount = refunded_amount + $1,
            outstanding_balance = outstanding_balance + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE student_id = $2
      `, [refAmt, refund.student_id]);
    }

    await db.query(`
      UPDATE fee_refunds
      SET status = $1, approved_by_id = $2, approved_by_name = $3, approval_remarks = $4, approved_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [action, req.user!.id, reviewerName, approval_remarks?.trim() || null, id]);

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: reviewerName,
      userRole: req.user!.roleName,
      schoolId: refund.school_id,
      action: action === 'APPROVED' ? 'FEE_REFUND_APPROVED' : 'FEE_REFUND_REJECTED',
      module: 'FEES',
      description: `${action} fee refund #${id} of ₹${parseFloat(refund.amount).toLocaleString()}`
    });

    res.json({ success: true, message: `Refund request ${action.toLowerCase()} successfully.` });
  } catch (error: any) {
    console.error('[REVIEW REFUND ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to review refund' });
  }
});

// Authorized Payment Reversal Workflow (Voiding mistaken posting without deleting)
router.post('/payments/:id/reverse', requireAuth, requirePermission('fees.reversal.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Official reversal justification reason is mandatory' });
    }

    const payRes = await db.query('SELECT * FROM fee_payments WHERE id = $1', [id]);
    if (payRes.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found' });
    }
    const payment = payRes.rows[0] as any;
    if (!checkSchoolScope(req, payment.school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    if (payment.status === 'REVERSED') {
      return res.status(400).json({ error: 'This payment has already been reversed.' });
    }

    const revAmount = parseFloat(payment.amount);
    const revId = `rev_${crypto.randomBytes(6).toString('hex')}`;
    const reverserName = `${req.user!.firstName} ${req.user!.lastName}`;

    // 1. Mark payment as REVERSED
    await db.query(`
      UPDATE fee_payments
      SET status = 'REVERSED', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    // 2. Insert into fee_reversals audit table
    await db.query(`
      INSERT INTO fee_reversals (
        id, school_id, payment_id, student_id, amount, reason, status, reversed_by_id, reversed_by_name
      ) VALUES ($1, $2, $3, $4, $5, $6, 'REVERSED', $7, $8)
    `, [revId, payment.school_id, id, payment.student_id, revAmount, reason.trim(), req.user!.id, reverserName]);

    // 3. Rollback allocations on charges
    const allocsRes = await db.query('SELECT * FROM fee_payment_allocations WHERE payment_id = $1', [id]);
    for (const alloc of (allocsRes.rows as any[])) {
      const chRes = await db.query('SELECT * FROM student_fee_charges WHERE id = $1', [alloc.charge_id]);
      if (chRes.rows.length > 0) {
        const ch = chRes.rows[0] as any;
        const allocAmt = parseFloat(alloc.amount_allocated);
        const newPaid = Math.max(0, parseFloat(ch.paid_amount) - allocAmt);
        const newOut = parseFloat(ch.amount) - parseFloat(ch.concession_amount) - newPaid;
        const newStatus = newPaid === 0 ? 'PENDING' : 'PARTIALLY_PAID';

        await db.query(`
          UPDATE student_fee_charges
          SET paid_amount = $1, outstanding_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [newPaid, newOut, newStatus, ch.id]);
      }
    }

    // 4. Update student fee assignment totals
    await db.query(`
      UPDATE student_fee_assignments
      SET paid_amount = Math.max(0, paid_amount - $1),
          outstanding_balance = outstanding_balance + $1,
          status = 'PARTIALLY_PAID',
          updated_at = CURRENT_TIMESTAMP
      WHERE student_id = $2
    `, [revAmount, payment.student_id]);

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: reverserName,
      userRole: req.user!.roleName,
      schoolId: payment.school_id,
      action: 'FEE_PAYMENT_REVERSED',
      module: 'FEES',
      description: `Reversed payment #${payment.receipt_number} of ₹${revAmount.toLocaleString()}. Reason: ${reason}`
    });

    res.json({ success: true, message: `Payment #${payment.receipt_number} reversed successfully. Financial ledger updated.` });
  } catch (error: any) {
    console.error('[REVERSE PAYMENT ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to reverse payment' });
  }
});

// ==========================================
// 9. STUDENT FEE LEDGER
// ==========================================

router.get('/students/:id/ledger', requireAuth, requirePermission('fees.ledger.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const stuRes = await db.query(`
      SELECT s.id, s.admission_number, s.first_name || ' ' || s.last_name as student_name,
             s.roll_number, s.profile_photo, s.school_id, s.session_id,
             c.name as class_name, sec.name as section_name,
             sch.name as school_name, sch.code as school_code,
             p.name as parent_name, p.mobile_number as parent_mobile, p.email as parent_email
      FROM students s
      JOIN schools sch ON s.school_id = sch.id
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN student_parents sp ON s.id = sp.student_id AND sp.is_primary_guardian = true
      LEFT JOIN parents p ON sp.parent_id = p.id
      WHERE s.id = $1
    `, [id]);

    if (stuRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const student = stuRes.rows[0] as any;
    if (!checkSchoolScope(req, student.school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    // Assignments
    const assignRes = await db.query(`
      SELECT sfa.*, fs.name as structure_name
      FROM student_fee_assignments sfa
      JOIN fee_structures fs ON sfa.structure_id = fs.id
      WHERE sfa.student_id = $1
    `, [id]);

    // Chronological Ledger Entries:
    // Build from Charges, Concessions, Payments, Refunds, and Reversals
    const ledgerEntries: any[] = [];

    // Charges
    const chargesRes = await db.query(`
      SELECT sfc.*, fc.name as category_name
      FROM student_fee_charges sfc
      JOIN fee_categories fc ON sfc.category_id = fc.id
      WHERE sfc.student_id = $1
      ORDER BY sfc.due_date ASC
    `, [id]);

    for (const ch of (chargesRes.rows as any[])) {
      ledgerEntries.push({
        date: ch.due_date,
        type: 'CHARGE',
        title: `${ch.category_name} (${ch.installment_name})`,
        debit: parseFloat(ch.amount),
        credit: 0,
        reference: `Due: ${ch.due_date}`,
        status: ch.status,
        timestamp: ch.created_at
      });

      if (parseFloat(ch.concession_amount) > 0) {
        ledgerEntries.push({
          date: ch.due_date,
          type: 'CONCESSION',
          title: `Concession / Scholarship on ${ch.category_name}`,
          debit: 0,
          credit: parseFloat(ch.concession_amount),
          reference: 'Approved Adjustment',
          status: 'APPLIED',
          timestamp: ch.updated_at
        });
      }
    }

    // Payments
    const payRes = await db.query(`
      SELECT * FROM fee_payments WHERE student_id = $1 ORDER BY payment_date ASC
    `, [id]);

    for (const p of (payRes.rows as any[])) {
      if (p.status === 'SUCCESS' || p.status === 'REFUNDED') {
        ledgerEntries.push({
          date: p.payment_date,
          type: 'PAYMENT',
          title: `Fee Payment via ${p.payment_mode}`,
          debit: 0,
          credit: parseFloat(p.amount),
          reference: `Receipt #${p.receipt_number}`,
          status: p.status,
          collectedBy: p.collected_by_name,
          timestamp: p.created_at
        });
      } else if (p.status === 'REVERSED') {
        ledgerEntries.push({
          date: p.payment_date,
          type: 'PAYMENT',
          title: `Fee Payment via ${p.payment_mode}`,
          debit: 0,
          credit: parseFloat(p.amount),
          reference: `Receipt #${p.receipt_number}`,
          status: 'ORIGINAL',
          timestamp: p.created_at
        });
        ledgerEntries.push({
          date: p.payment_date,
          type: 'REVERSAL',
          title: `Payment Reversal #${p.receipt_number}`,
          debit: parseFloat(p.amount),
          credit: 0,
          reference: 'Void / Reversed Entry',
          status: 'REVERSED',
          timestamp: p.updated_at
        });
      }
    }

    // Refunds
    const refRes = await db.query(`
      SELECT r.*, fp.receipt_number FROM fee_refunds r
      JOIN fee_payments fp ON r.payment_id = fp.id
      WHERE r.student_id = $1 AND r.status = 'APPROVED'
    `, [id]);

    for (const rf of (refRes.rows as any[])) {
      ledgerEntries.push({
        date: rf.approved_at ? rf.approved_at.split('T')[0] : rf.created_at.split('T')[0],
        type: 'REFUND',
        title: `Refund: ${rf.reason}`,
        debit: parseFloat(rf.amount),
        credit: 0,
        reference: `Ref #${rf.receipt_number}`,
        status: 'REFUNDED',
        timestamp: rf.created_at
      });
    }

    // Sort by date then timestamp
    ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Compute running balance
    let running = 0;
    for (const entry of ledgerEntries) {
      running += (entry.debit - entry.credit);
      entry.runningBalance = Math.round(running * 100) / 100;
    }

    res.json({
      student,
      assignments: assignRes.rows,
      charges: chargesRes.rows,
      ledger: ledgerEntries,
      currentBalance: Math.max(0, running)
    });
  } catch (error: any) {
    console.error('[STUDENT LEDGER ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch student ledger' });
  }
});

// ==========================================
// 10. EXPENSES REGISTER
// ==========================================

router.get('/expenses', requireAuth, requirePermission('fees.expenses.manage'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);
    const categoryId = req.query.categoryId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    let query = `
      SELECT e.*, ec.name as category_name, ec.code as category_code,
             sch.name as school_name, sch.code as school_code
      FROM expenses e
      JOIN expense_categories ec ON e.category_id = ec.id
      JOIN schools sch ON e.school_id = sch.id
    `;
    const params: any[] = [];
    const whereClauses: string[] = [];

    if (schoolId) {
      params.push(schoolId);
      whereClauses.push(`e.school_id = $${params.length}`);
    }
    if (categoryId) {
      params.push(categoryId);
      whereClauses.push(`e.category_id = $${params.length}`);
    }
    if (startDate) {
      params.push(startDate);
      whereClauses.push(`e.expense_date >= $${params.length}`);
    }
    if (endDate) {
      params.push(endDate);
      whereClauses.push(`e.expense_date <= $${params.length}`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    query += ' ORDER BY e.expense_date DESC, e.created_at DESC';

    const result = await db.query(query, params);
    res.json({ expenses: result.rows });
  } catch (error: any) {
    console.error('[EXPENSES LIST ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

router.post('/expenses', requireAuth, requirePermission('fees.expenses.manage'), async (req, res) => {
  try {
    const {
      school_id,
      category_id,
      expense_date,
      amount,
      payment_mode = 'BANK_TRANSFER',
      payee_vendor,
      reference_no,
      description,
      supporting_doc_url
    } = req.body;

    if (!school_id || !category_id || !expense_date || isNaN(Number(amount)) || !payee_vendor) {
      return res.status(400).json({ error: 'school_id, category_id, expense_date, amount, and payee_vendor are required' });
    }
    if (!checkSchoolScope(req, school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    const expAmt = Number(amount);
    const id = `exp_${crypto.randomBytes(6).toString('hex')}`;
    const creatorName = `${req.user!.firstName} ${req.user!.lastName}`;

    await db.query(`
      INSERT INTO expenses (
        id, school_id, category_id, expense_date, amount, payment_mode, payee_vendor,
        reference_no, description, supporting_doc_url, approval_status,
        created_by_id, created_by_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'APPROVED', $11, $12)
    `, [
      id, school_id, category_id, expense_date, expAmt, payment_mode, payee_vendor.trim(),
      reference_no?.trim() || null, description?.trim() || null,
      supporting_doc_url?.trim() || null, req.user!.id, creatorName
    ]);

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: creatorName,
      userRole: req.user!.roleName,
      schoolId: school_id,
      action: 'EXPENSE_RECORDED',
      module: 'ACCOUNTS',
      description: `Recorded operating expense of ₹${expAmt.toLocaleString()} for ${payee_vendor}`
    });

    res.json({ success: true, expenseId: id, message: 'Expense recorded successfully.' });
  } catch (error: any) {
    console.error('[CREATE EXPENSE ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to create expense' });
  }
});

router.get('/expense-categories', requireAuth, requirePermission('fees.expenses.manage'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);

    let query = 'SELECT * FROM expense_categories';
    const params: any[] = [];
    if (schoolId) {
      params.push(schoolId);
      query += ' WHERE school_id = $1';
    }
    query += ' ORDER BY name ASC';

    const result = await db.query(query, params);
    res.json({ categories: result.rows });
  } catch (error: any) {
    console.error('[EXPENSE CATEGORIES ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch expense categories' });
  }
});

// ==========================================
// 11. FEE REMINDERS
// ==========================================

router.get('/reminders', requireAuth, requirePermission('fees.reminders.manage'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);

    // List of logged reminders
    let query = `
      SELECT fr.*, s.admission_number, s.first_name || ' ' || s.last_name as student_name,
             c.name as class_name, sec.name as section_name
      FROM fee_reminders fr
      JOIN students s ON fr.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
    `;
    const params: any[] = [];
    if (schoolId) {
      params.push(schoolId);
      query += ' WHERE fr.school_id = $1';
    }
    query += ' ORDER BY fr.created_at DESC LIMIT 50';

    const result = await db.query(query, params);

    // Also get list of students with overdue fees for easy reminder dispatch
    const overdueRes = await db.query(`
      SELECT DISTINCT s.id as student_id, s.admission_number,
             s.first_name || ' ' || s.last_name as student_name,
             c.name as class_name, sec.name as section_name,
             p.name as parent_name, p.mobile_number as parent_mobile, p.email as parent_email,
             sfc.due_date, sfc.installment_name,
             SUM(sfc.outstanding_amount) as total_overdue
      FROM student_fee_charges sfc
      JOIN students s ON sfc.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN student_parents sp ON s.id = sp.student_id AND sp.is_primary_guardian = true
      LEFT JOIN parents p ON sp.parent_id = p.id
      ${schoolId ? 'WHERE sfc.school_id = $1 AND sfc.status != \'PAID\' AND sfc.due_date < CURRENT_DATE' : 'WHERE sfc.status != \'PAID\' AND sfc.due_date < CURRENT_DATE'}
      GROUP BY s.id, s.admission_number, s.first_name, s.last_name, c.name, sec.name, p.name, p.mobile_number, p.email, sfc.due_date, sfc.installment_name
      ORDER BY total_overdue DESC
      LIMIT 20
    `, params);

    res.json({
      reminders: result.rows,
      candidates: overdueRes.rows
    });
  } catch (error: any) {
    console.error('[REMINDERS ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch fee reminders' });
  }
});

router.post('/reminders/log', requireAuth, requirePermission('fees.reminders.manage'), async (req, res) => {
  try {
    const {
      school_id,
      session_id,
      student_id,
      reminder_type = 'OVERDUE',
      target_due_date,
      amount_due,
      parent_name,
      parent_mobile,
      parent_email,
      channel = 'MANUAL_PHONE_LOG',
      message_text
    } = req.body;

    if (!school_id || !student_id || !amount_due || !parent_name || !message_text) {
      return res.status(400).json({ error: 'Missing required reminder fields' });
    }
    if (!checkSchoolScope(req, school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    const id = `rem_${crypto.randomBytes(6).toString('hex')}`;
    const creatorName = `${req.user!.firstName} ${req.user!.lastName}`;

    await db.query(`
      INSERT INTO fee_reminders (
        id, school_id, session_id, student_id, reminder_type, target_due_date,
        amount_due, parent_name, parent_mobile, parent_email, channel,
        message_text, status, created_by_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'LOGGED', $13)
    `, [
      id, school_id, session_id || 'sess_vvps_2526', student_id, reminder_type,
      target_due_date || null, Number(amount_due), parent_name.trim(),
      parent_mobile?.trim() || 'N/A', parent_email?.trim() || null,
      channel, message_text.trim(), creatorName
    ]);

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: creatorName,
      userRole: req.user!.roleName,
      schoolId: school_id,
      action: 'FEE_REMINDER_LOGGED',
      module: 'FEES',
      description: `Logged ${channel} fee reminder for ${parent_name} (₹${Number(amount_due).toLocaleString()} due)`
    });

    res.json({ success: true, reminderId: id, message: 'Fee reminder activity logged successfully.' });
  } catch (error: any) {
    console.error('[LOG REMINDER ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to log reminder' });
  }
});

// ==========================================
// 12. REPORTS & EXPORTS
// ==========================================

// CSV Export: Daily or Range Collections
router.get('/reports/export/collection-csv', requireAuth, requirePermission('fees.reports.export'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    let query = `
      SELECT p.receipt_number, p.payment_date, p.payment_time, p.amount,
             p.payment_mode, p.transaction_reference, p.status, p.collected_by_name,
             s.admission_number, s.first_name || ' ' || s.last_name as student_name,
             c.name as class_name, sec.name as section_name, sch.code as school_code
      FROM fee_payments p
      JOIN students s ON p.student_id = s.id
      JOIN schools sch ON p.school_id = sch.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
    `;
    const params: any[] = [];
    const whereClauses: string[] = [];

    if (schoolId) {
      params.push(schoolId);
      whereClauses.push(`p.school_id = $${params.length}`);
    }
    if (startDate) {
      params.push(startDate);
      whereClauses.push(`p.payment_date >= $${params.length}`);
    }
    if (endDate) {
      params.push(endDate);
      whereClauses.push(`p.payment_date <= $${params.length}`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    query += ' ORDER BY p.payment_date DESC, p.created_at DESC';

    const result = await db.query(query, params);

    // Format as CSV
    const rows = [
      ['Receipt No', 'Date', 'Time', 'School', 'Admission No', 'Student Name', 'Class', 'Section', 'Amount (INR)', 'Payment Mode', 'Reference', 'Status', 'Collector']
    ];

    for (const r of (result.rows as any[])) {
      rows.push([
        r.receipt_number,
        r.payment_date,
        r.payment_time,
        r.school_code,
        r.admission_number,
        `"${r.student_name}"`,
        r.class_name,
        r.section_name || 'A',
        r.amount,
        r.payment_mode,
        r.transaction_reference || 'Counter',
        r.status,
        `"${r.collected_by_name}"`
      ]);
    }

    const csvContent = rows.map((e) => e.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="fee_collections_${startDate || 'all'}.csv"`);
    res.send(csvContent);
  } catch (error: any) {
    console.error('[CSV EXPORT ERROR]', error);
    res.status(500).json({ error: 'Failed to export fee collection CSV' });
  }
});

// CSV Export: Outstanding Dues by Class
router.get('/reports/export/dues-csv', requireAuth, requirePermission('fees.reports.export'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);

    let query = `
      SELECT s.admission_number, s.first_name || ' ' || s.last_name as student_name,
             c.name as class_name, sec.name as section_name,
             p.name as parent_name, p.mobile_number as parent_mobile,
             sfa.total_charges, sfa.total_concessions, sfa.paid_amount, sfa.outstanding_balance,
             sfa.status
      FROM student_fee_assignments sfa
      JOIN students s ON sfa.student_id = s.id
      JOIN classes c ON sfa.class_id = c.id
      LEFT JOIN sections sec ON sfa.section_id = sec.id
      LEFT JOIN student_parents sp ON s.id = sp.student_id AND sp.is_primary_guardian = true
      LEFT JOIN parents p ON sp.parent_id = p.id
      WHERE sfa.outstanding_balance > 0
    `;
    const params: any[] = [];
    if (schoolId) {
      params.push(schoolId);
      query += ' AND sfa.school_id = $1';
    }
    query += ' ORDER BY c.display_order ASC, s.admission_number ASC';

    const result = await db.query(query, params);

    const rows = [
      ['Admission No', 'Student Name', 'Class', 'Section', 'Parent Name', 'Parent Mobile', 'Total Fees', 'Concessions', 'Paid Amount', 'Outstanding Dues (INR)', 'Status']
    ];

    for (const r of (result.rows as any[])) {
      rows.push([
        r.admission_number,
        `"${r.student_name}"`,
        r.class_name,
        r.section_name || 'A',
        `"${r.parent_name || 'Guardian'}"`,
        r.parent_mobile || '',
        r.total_charges,
        r.total_concessions,
        r.paid_amount,
        r.outstanding_balance,
        r.status
      ]);
    }

    const csvContent = rows.map((e) => e.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="student_outstanding_dues.csv"');
    res.send(csvContent);
  } catch (error: any) {
    console.error('[DUES CSV EXPORT ERROR]', error);
    res.status(500).json({ error: 'Failed to export dues CSV' });
  }
});

// ==========================================
// 13. ADMISSIONS MODULE INTEGRATION
// ==========================================

// Link or verify admission application fee payment
router.post('/admissions/:applicationId/link-payment', requireAuth, requirePermission('fees.collect'), async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { amount, payment_mode, transaction_reference, notes } = req.body;

    const appRes = await db.query('SELECT * FROM admission_applications WHERE id = $1', [applicationId]);
    if (appRes.rows.length === 0) {
      return res.status(404).json({ error: 'Admission application not found' });
    }
    const app = appRes.rows[0] as any;
    if (!checkSchoolScope(req, app.school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    const feeAmt = Number(amount || 500.00);
    const receiptNo = await generateReceiptNumber(app.school_id);
    const feeId = `fee_adm_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString().split('T')[0];

    await db.query(`
      INSERT INTO admission_fees (
        id, application_id, fee_type, amount, payment_mode, transaction_ref,
        payment_status, receipt_number, payment_date, notes
      ) VALUES ($1, $2, 'Admission Application Fee', $3, $4, $5, 'Paid', $6, $7, $8)
    `, [
      feeId, applicationId, feeAmt, payment_mode || 'Online/Counter',
      transaction_reference || 'ADM-FEE-PAID', receiptNo, now, notes || 'Verified application intake fee'
    ]);

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: app.school_id,
      action: 'ADMISSION_FEE_RECORDED',
      module: 'FEES',
      description: `Recorded ₹${feeAmt} admission fee for application ${app.application_number}. Receipt: ${receiptNo}`
    });

    res.json({
      success: true,
      receiptNumber: receiptNo,
      message: `Admission fee of ₹${feeAmt} verified and recorded. Receipt #${receiptNo} generated.`
    });
  } catch (error: any) {
    console.error('[LINK ADMISSION FEE ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to link admission fee payment' });
  }
});

export default router;
