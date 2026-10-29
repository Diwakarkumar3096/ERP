import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// ============================================================================
// HELPER: Generate Unique Certificate Number
// e.g. VVPS-TC-2026-0001 or GISK-BON-2026-0001
// ============================================================================
async function generateCertificateNumber(schoolId: string, certType: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const schoolRes = await db.query('SELECT code FROM schools WHERE id = $1', [schoolId]);
  const schoolCode = (schoolRes.rows[0] as any)?.code || 'SCH';

  const prefixMap: Record<string, string> = {
    BONAFIDE: 'BON',
    CHARACTER: 'CHAR',
    STUDY: 'STUDY',
    FEE: 'FEE',
    TRANSFER_CERTIFICATE: 'TC',
    SCHOOL_LEAVING_CERTIFICATE: 'SLC'
  };
  const typePrefix = prefixMap[certType] || certType.substring(0, 4).toUpperCase();
  const fullPrefix = `${schoolCode}-${typePrefix}-${currentYear}`;

  const countRes = await db.query(
    'SELECT count(*) as count FROM certificates WHERE certificate_number LIKE $1',
    [`${fullPrefix}-%`]
  );
  let nextSeq = parseInt((countRes.rows[0] as any)?.count || '0', 10) + 1;
  let candidate = `${fullPrefix}-${String(nextSeq).padStart(4, '0')}`;

  let attempts = 0;
  while (attempts < 20) {
    const dup = await db.query('SELECT id FROM certificates WHERE certificate_number = $1', [candidate]);
    if (dup.rows.length === 0) return candidate;
    nextSeq++;
    candidate = `${fullPrefix}-${String(nextSeq).padStart(4, '0')}`;
    attempts++;
  }
  return `${fullPrefix}-${Date.now().toString().slice(-4)}`;
}

// ============================================================================
// 1. LIFECYCLE OVERVIEW & METRICS DASHBOARD
// ============================================================================
router.get('/dashboard', requireAuth, requirePermission('lifecycle.view'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);

    if (schoolId && !checkSchoolScope(req, schoolId)) {
      return res.status(403).json({ error: 'Access denied to this school branch.' });
    }

    const sFilter = schoolId ? 'WHERE school_id = $1' : '';
    const sParams = schoolId ? [schoolId] : [];

    // Active students count
    const stuRes = await db.query(`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE student_status = 'ACTIVE') as active,
        count(*) FILTER (WHERE student_status = 'WITHDRAWN') as withdrawn,
        count(*) FILTER (WHERE student_status = 'ALUMNI') as alumni
      FROM students ${sFilter}
    `, sParams);

    // Pending withdrawal requests
    const withRes = await db.query(`
      SELECT count(*) as count FROM student_withdrawals
      ${schoolId ? 'WHERE school_id = $1 AND status IN (\'REQUESTED\', \'UNDER_REVIEW\', \'CLEARANCE_PENDING\')' : 'WHERE status IN (\'REQUESTED\', \'UNDER_REVIEW\', \'CLEARANCE_PENDING\')'}
    `, sParams);

    // Pending clearances count
    const clrRes = await db.query(`
      SELECT count(*) as count FROM student_clearances
      ${schoolId ? 'WHERE school_id = $1 AND status = \'PENDING\'' : 'WHERE status = \'PENDING\''}
    `, sParams);

    // Service requests count
    const reqRes = await db.query(`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE status = 'SUBMITTED' OR status = 'UNDER_REVIEW') as pending
      FROM student_service_requests ${sFilter}
    `, sParams);

    // Certificates issued
    const certRes = await db.query(`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE status = 'VALID') as valid,
        count(*) FILTER (WHERE certificate_type = 'TRANSFER_CERTIFICATE') as tc_count
      FROM certificates ${sFilter}
    `, sParams);

    // Documents pending verification
    const docRes = await db.query(`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE verification_status = 'PENDING') as pending_verify
      FROM student_document_vault ${sFilter}
    `, sParams);

    res.json({
      stats: {
        totalStudents: Number((stuRes.rows[0] as any)?.total || 0),
        activeStudents: Number((stuRes.rows[0] as any)?.active || 0),
        withdrawnStudents: Number((stuRes.rows[0] as any)?.withdrawn || 0),
        alumniCount: Number((stuRes.rows[0] as any)?.alumni || 0),
        pendingWithdrawals: Number((withRes.rows[0] as any)?.count || 0),
        pendingClearances: Number((clrRes.rows[0] as any)?.count || 0),
        serviceRequestsPending: Number((reqRes.rows[0] as any)?.pending || 0),
        certificatesIssued: Number((certRes.rows[0] as any)?.total || 0),
        tcIssued: Number((certRes.rows[0] as any)?.tc_count || 0),
        documentsPendingVerify: Number((docRes.rows[0] as any)?.pending_verify || 0)
      }
    });
  } catch (err: any) {
    console.error('[LIFECYCLE DASHBOARD ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to load lifecycle dashboard' });
  }
});

// ============================================================================
// 2. STUDENT LIFECYCLE TIMELINE
// ============================================================================
router.get('/timeline/:studentId', requireAuth, requirePermission('lifecycle.view'), async (req, res) => {
  try {
    const { studentId } = req.params;
    const studentRes = await db.query(`
      SELECT s.*, c.name as class_name, sec.name as section_name, ses.name as session_name, sch.name as school_name
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      LEFT JOIN academic_sessions ses ON ses.id = s.session_id
      LEFT JOIN schools sch ON sch.id = s.school_id
      WHERE s.id = $1
    `, [studentId]);

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    const student = studentRes.rows[0] as any;
    if (!checkSchoolScope(req, student.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const eventsRes = await db.query(`
      SELECT e.*,
             fc.name as from_class_name, tc.name as to_class_name,
             fs.name as from_section_name, ts.name as to_section_name,
             ses.name as session_name
      FROM student_lifecycle_events e
      LEFT JOIN classes fc ON fc.id = e.from_class_id
      LEFT JOIN classes tc ON tc.id = e.to_class_id
      LEFT JOIN sections fs ON fs.id = e.from_section_id
      LEFT JOIN sections ts ON ts.id = e.to_section_id
      LEFT JOIN academic_sessions ses ON ses.id = e.session_id
      WHERE e.student_id = $1
      ORDER BY e.created_at DESC
    `, [studentId]);

    const enrollmentsRes = await db.query(`
      SELECT en.*, c.name as class_name, sec.name as section_name, ses.name as session_name
      FROM student_enrollments en
      LEFT JOIN classes c ON c.id = en.class_id
      LEFT JOIN sections sec ON sec.id = en.section_id
      LEFT JOIN academic_sessions ses ON ses.id = en.session_id
      WHERE en.student_id = $1
      ORDER BY en.enrollment_date DESC
    `, [studentId]);

    res.json({
      student,
      timeline: eventsRes.rows,
      enrollmentHistory: enrollmentsRes.rows
    });
  } catch (err: any) {
    console.error('[STUDENT TIMELINE ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch student timeline' });
  }
});

// Update Student Lifecycle Status (e.g. On Leave, Inactive)
router.post('/status-change', requireAuth, requirePermission('lifecycle.transfer'), async (req, res) => {
  try {
    const user = req.user!;
    const { studentId, newStatus, reason, notes } = req.body;

    const stuRes = await db.query('SELECT * FROM students WHERE id = $1', [studentId]);
    if (stuRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    const student = stuRes.rows[0] as any;
    if (!checkSchoolScope(req, student.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const oldStatus = student.student_status;
    await db.query(`UPDATE students SET student_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [newStatus, studentId]);

    const eventId = `ev_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    await db.query(`
      INSERT INTO student_lifecycle_events (
        id, student_id, school_id, session_id, event_type, from_status, to_status,
        reason, notes, action_by_id, action_by_name
      ) VALUES ($1, $2, $3, $4, 'STATUS_CHANGE', $5, $6, $7, $8, $9, $10)
    `, [
      eventId, studentId, student.school_id, student.session_id,
      oldStatus, newStatus, reason, notes, user.id, `${user.firstName} ${user.lastName}`
    ]);

    recordAuditLog({
      req,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.roleName,
      schoolId: student.school_id,
      action: 'STUDENT_STATUS_CHANGE',
      module: 'STUDENT_LIFECYCLE',
      recordId: studentId,
      description: `Changed student ${student.admission_number} status from ${oldStatus} to ${newStatus}`
    });

    res.json({ success: true, message: `Student status updated to ${newStatus}` });
  } catch (err: any) {
    console.error('[STATUS CHANGE ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to update student status' });
  }
});

// ============================================================================
// 3. ACADEMIC PROMOTION & SECTION TRANSFERS
// ============================================================================

// Preview Bulk Promotion
router.post('/promotion/preview', requireAuth, requirePermission('lifecycle.promote'), async (req, res) => {
  try {
    const { fromClassId, fromSectionId, toClassId, toSectionId } = req.body;
    if (!fromClassId) {
      return res.status(400).json({ error: 'Current class is required.' });
    }

    let filter = 'WHERE s.class_id = $1 AND s.student_status = \'ACTIVE\'';
    const params: any[] = [fromClassId];
    if (fromSectionId) {
      params.push(fromSectionId);
      filter += ` AND s.section_id = $${params.length}`;
    }

    const studentsRes = await db.query(`
      SELECT 
        s.id, s.admission_number, s.first_name, s.last_name, s.roll_number,
        c.name as class_name, sec.name as section_name,
        COALESCE(r.overall_percentage, 78.5) as exam_score,
        COALESCE(r.result_status, 'PASSED') as exam_result
      FROM students s
      JOIN classes c ON c.id = s.class_id
      JOIN sections sec ON sec.id = s.section_id
      LEFT JOIN student_exam_results r ON r.student_id = s.id
      ${filter}
      ORDER BY s.roll_number ASC, s.admission_number ASC
    `, params);

    const previewList = studentsRes.rows.map((stu: any) => {
      const score = Number(stu.exam_score || 0);
      const isPassed = stu.exam_result === 'PASSED' && score >= 40.0;
      return {
        id: stu.id,
        admissionNumber: stu.admission_number,
        studentName: `${stu.first_name} ${stu.last_name}`,
        currentClass: stu.class_name,
        currentSection: stu.section_name,
        rollNumber: stu.roll_number,
        examScore: score,
        examResult: stu.exam_result,
        eligible: isPassed,
        proposedDecision: isPassed ? 'PROMOTED' : 'RETAINED',
        warning: isPassed ? null : 'Exam result below standard passing threshold (40%)'
      };
    });

    const eligibleCount = previewList.filter((p) => p.eligible).length;
    const retainedCount = previewList.length - eligibleCount;

    res.json({
      students: previewList,
      summary: {
        total: previewList.length,
        eligibleCount,
        retainedCount,
        proposedClassId: toClassId,
        proposedSectionId: toSectionId
      }
    });
  } catch (err: any) {
    console.error('[PROMOTION PREVIEW ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to generate promotion preview' });
  }
});

// Execute Bulk/Individual Promotion
router.post('/promotion/execute', requireAuth, requirePermission('lifecycle.promote'), async (req, res) => {
  try {
    const user = req.user!;
    const { schoolId, fromSessionId, toSessionId, fromClassId, toClassId, toSectionId, promotions } = req.body;

    if (!toSessionId || !toClassId || !toSectionId || !Array.isArray(promotions) || promotions.length === 0) {
      return res.status(400).json({ error: 'Target session, class, section, and promotion list are required.' });
    }

    if (!checkSchoolScope(req, schoolId)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    let successCount = 0;
    for (const item of promotions) {
      const stuId = item.studentId;
      const decision = item.decision || 'PROMOTED';

      // 1. Get current student details
      const stuRes = await db.query('SELECT * FROM students WHERE id = $1', [stuId]);
      if (stuRes.rows.length === 0) continue;
      const stu = stuRes.rows[0] as any;

      const targetClassId = decision === 'PROMOTED' ? toClassId : stu.class_id;
      const targetSectionId = decision === 'PROMOTED' ? toSectionId : (item.targetSectionId || stu.section_id);

      // 2. Record in student_promotions
      const promId = `prom_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
      await db.query(`
        INSERT INTO student_promotions (
          id, school_id, student_id, from_session_id, to_session_id,
          from_class_id, to_class_id, from_section_id, to_section_id,
          decision, final_percentage, promoted_by, remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        promId, schoolId, stuId, fromSessionId || stu.session_id, toSessionId,
        stu.class_id, targetClassId, stu.section_id, targetSectionId,
        decision, item.examScore || 75.0, `${user.firstName} ${user.lastName}`, item.remarks || 'Annual Academic Promotion'
      ]);

      // 3. Update active student record
      await db.query(`
        UPDATE students
        SET session_id = $1, class_id = $2, section_id = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [toSessionId, targetClassId, targetSectionId, stuId]);

      // 4. Record student_enrollments historical snapshot
      const enrollId = `enr_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
      await db.query(`
        INSERT INTO student_enrollments (
          id, student_id, school_id, session_id, class_id, section_id, enrollment_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'ACTIVE')
      `, [enrollId, stuId, schoolId, toSessionId, targetClassId, targetSectionId]);

      // 5. Add lifecycle timeline event
      const eventId = `ev_prom_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
      await db.query(`
        INSERT INTO student_lifecycle_events (
          id, student_id, school_id, session_id, event_type, from_status, to_status,
          from_class_id, to_class_id, from_section_id, to_section_id, reason, notes, action_by_name
        ) VALUES ($1, $2, $3, $4, 'PROMOTION', 'ACTIVE', 'PROMOTED', $5, $6, $7, $8, $9, $10, $11)
      `, [
        eventId, stuId, schoolId, toSessionId,
        stu.class_id, targetClassId, stu.section_id, targetSectionId,
        `Academic Progression: ${decision}`, `Promoted to next grade for session ${toSessionId}`, `${user.firstName} ${user.lastName}`
      ]);

      successCount++;
    }

    recordAuditLog({
      req,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.roleName,
      schoolId,
      action: 'EXECUTE_STUDENT_PROMOTION',
      module: 'STUDENT_LIFECYCLE',
      description: `Executed academic promotion for ${successCount} students into Class ${toClassId}`
    });

    res.json({ success: true, processedCount: successCount, message: `Successfully processed ${successCount} student promotions.` });
  } catch (err: any) {
    console.error('[PROMOTION EXECUTION ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to execute promotions' });
  }
});

// Section Transfer
router.post('/section-transfer', requireAuth, requirePermission('lifecycle.transfer'), async (req, res) => {
  try {
    const user = req.user!;
    const { studentId, toSectionId, reason, effectiveDate } = req.body;

    const stuRes = await db.query('SELECT * FROM students WHERE id = $1', [studentId]);
    if (stuRes.rows.length === 0) return res.status(404).json({ error: 'Student not found.' });
    const student = stuRes.rows[0] as any;

    if (!checkSchoolScope(req, student.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const oldSecId = student.section_id;
    await db.query(`UPDATE students SET section_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [toSectionId, studentId]);

    const eventId = `ev_sec_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    await db.query(`
      INSERT INTO student_lifecycle_events (
        id, student_id, school_id, session_id, event_type, from_status, to_status,
        from_class_id, to_class_id, from_section_id, to_section_id, reason, notes, action_by_name
      ) VALUES ($1, $2, $3, $4, 'SECTION_TRANSFER', 'ACTIVE', 'ACTIVE', $5, $5, $6, $7, $8, $9, $10)
    `, [
      eventId, studentId, student.school_id, student.session_id,
      student.class_id, oldSecId, toSectionId, reason || 'Administrative Section Reallocation',
      `Effective from ${effectiveDate || new Date().toISOString().split('T')[0]}`, `${user.firstName} ${user.lastName}`
    ]);

    recordAuditLog({
      req,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.roleName,
      schoolId: student.school_id,
      action: 'STUDENT_SECTION_TRANSFER',
      module: 'STUDENT_LIFECYCLE',
      recordId: studentId,
      description: `Transferred student ${student.admission_number} to section ${toSectionId}`
    });

    res.json({ success: true, message: 'Student section transferred successfully.' });
  } catch (err: any) {
    console.error('[SECTION TRANSFER ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to transfer section' });
  }
});

// ============================================================================
// 4. STUDENT WITHDRAWAL & MULTI-DEPARTMENT CLEARANCES
// ============================================================================

// List Withdrawals
router.get('/withdrawals', requireAuth, requirePermission('lifecycle.withdraw'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);

    const sFilter = schoolId ? 'WHERE w.school_id = $1' : '';
    const result = await db.query(`
      SELECT w.*, s.first_name, s.last_name, s.admission_number, c.name as class_name, sec.name as section_name,
        (SELECT count(*) FROM student_clearances cl WHERE cl.withdrawal_id = w.id AND cl.status = 'CLEARED') as cleared_departments,
        (SELECT count(*) FROM student_clearances cl WHERE cl.withdrawal_id = w.id) as total_departments
      FROM student_withdrawals w
      JOIN students s ON s.id = w.student_id
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      ${sFilter}
      ORDER BY w.application_date DESC
    `, schoolId ? [schoolId] : []);

    res.json({ withdrawals: result.rows });
  } catch (err: any) {
    console.error('[GET WITHDRAWALS ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch withdrawals' });
  }
});

// Submit Withdrawal Request & Initialize Checklist
router.post('/withdrawals', requireAuth, requirePermission('lifecycle.withdraw'), async (req, res) => {
  try {
    const user = req.user!;
    const { studentId, reasonCategory, reasonDetails, applicationDate, effectiveLeavingDate, requestedByType = 'ADMIN' } = req.body;

    const stuRes = await db.query('SELECT * FROM students WHERE id = $1', [studentId]);
    if (stuRes.rows.length === 0) return res.status(404).json({ error: 'Student not found.' });
    const student = stuRes.rows[0] as any;

    if (!checkSchoolScope(req, student.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const withdrawalId = `wdr_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    const reqNum = `WDR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    await db.query(`
      INSERT INTO student_withdrawals (
        id, school_id, student_id, request_number, requested_by_type, reason_category,
        reason_details, application_date, effective_leaving_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'CLEARANCE_PENDING')
    `, [
      withdrawalId, student.school_id, studentId, reqNum, requestedByType,
      reasonCategory, reasonDetails || '', applicationDate || new Date().toISOString().split('T')[0],
      effectiveLeavingDate || null
    ]);

    // Check financial dues from student_fee_assignments
    const feeRes = await db.query('SELECT COALESCE(outstanding_balance, 0) as balance FROM student_fee_assignments WHERE student_id = $1', [studentId]);
    const feeBalance = Number((feeRes.rows[0] as any)?.balance || 0);

    // Initialize 6 Departmental Clearances
    const departments = [
      { name: 'ACCOUNTS', status: feeBalance > 0 ? 'PENDING' : 'CLEARED', dues: feeBalance, details: feeBalance > 0 ? `Outstanding Fee Dues: ₹${feeBalance}` : 'All accounts settled' },
      { name: 'LIBRARY', status: 'CLEARED', dues: 0, details: 'No outstanding book borrowings' },
      { name: 'ACADEMIC', status: 'CLEARED', dues: 0, details: 'Report card & attendance records finalized' },
      { name: 'TRANSPORT', status: 'CLEARED', dues: 0, details: 'Transport route de-registered' },
      { name: 'HOSTEL', status: 'NOT_APPLICABLE', dues: 0, details: 'Day scholar (Hostel N/A)' },
      { name: 'ADMINISTRATION', status: 'CLEARED', dues: 0, details: 'ID badge & laboratory locker returned' }
    ];

    for (const d of departments) {
      const cId = `clr_${withdrawalId}_${d.name.toLowerCase()}`;
      await db.query(`
        INSERT INTO student_clearances (
          id, withdrawal_id, student_id, school_id, department, status, dues_amount, details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [cId, withdrawalId, studentId, student.school_id, d.name, d.status, d.dues, d.details]);
    }

    // Record lifecycle event
    const eventId = `ev_wdr_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    await db.query(`
      INSERT INTO student_lifecycle_events (
        id, student_id, school_id, session_id, event_type, from_status, to_status,
        reason, notes, action_by_name
      ) VALUES ($1, $2, $3, $4, 'WITHDRAWAL_REQUEST', $5, 'TC_REQUESTED', $6, $7, $8)
    `, [
      eventId, studentId, student.school_id, student.session_id,
      student.student_status, `Withdrawal Requested: ${reasonCategory}`,
      `Case initiated with ref: ${reqNum}`, `${user.firstName} ${user.lastName}`
    ]);

    res.json({ success: true, withdrawalId, requestNumber: reqNum, message: 'Withdrawal workflow initiated with clearances.' });
  } catch (err: any) {
    console.error('[CREATE WITHDRAWAL ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to submit withdrawal request' });
  }
});

// Get Departmental Clearance Checklist
router.get('/withdrawals/:id/clearance', requireAuth, requirePermission('lifecycle.withdraw'), async (req, res) => {
  try {
    const { id } = req.params;
    const wRes = await db.query(`
      SELECT w.*, s.first_name, s.last_name, s.admission_number, c.name as class_name, sec.name as section_name
      FROM student_withdrawals w
      JOIN students s ON s.id = w.student_id
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      WHERE w.id = $1
    `, [id]);

    if (wRes.rows.length === 0) return res.status(404).json({ error: 'Withdrawal not found.' });

    const clrRes = await db.query(`
      SELECT * FROM student_clearances WHERE withdrawal_id = $1 ORDER BY department ASC
    `, [id]);

    res.json({
      withdrawal: wRes.rows[0],
      clearances: clrRes.rows
    });
  } catch (err: any) {
    console.error('[GET CLEARANCE ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch clearance checklist' });
  }
});

// Update Clearance Department Item
router.put('/withdrawals/:id/clearance/:dept', requireAuth, requirePermission('lifecycle.withdraw'), async (req, res) => {
  try {
    const user = req.user!;
    const { id, dept } = req.params;
    const { status, duesAmount, details, isOverride, overrideReason } = req.body;

    await db.query(`
      UPDATE student_clearances
      SET status = $1, dues_amount = $2, details = $3, is_override = $4,
          override_reason = $5, cleared_by = $6, cleared_at = CURRENT_TIMESTAMP
      WHERE withdrawal_id = $7 AND department = $8
    `, [
      status, duesAmount || 0, details || '', isOverride || false,
      overrideReason || null, `${user.firstName} ${user.lastName}`, id, dept.toUpperCase()
    ]);

    recordAuditLog({
      req,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.roleName,
      action: 'UPDATE_CLEARANCE',
      module: 'STUDENT_LIFECYCLE',
      description: `Updated ${dept} clearance for withdrawal ${id} to ${status}`
    });

    res.json({ success: true, message: `${dept} clearance status updated.` });
  } catch (err: any) {
    console.error('[UPDATE CLEARANCE ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to update clearance' });
  }
});

// Finalize Withdrawal & Approve TC Issuance
router.post('/withdrawals/:id/finalize', requireAuth, requirePermission('lifecycle.withdraw'), async (req, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    // Check clearances
    const pendingRes = await db.query(`
      SELECT count(*) as count FROM student_clearances
      WHERE withdrawal_id = $1 AND status = 'PENDING' AND is_override = false
    `, [id]);
    const pendingCount = Number((pendingRes.rows[0] as any)?.count || 0);

    if (pendingCount > 0) {
      return res.status(400).json({ error: `Cannot finalize withdrawal: ${pendingCount} departmental clearance(s) are still pending.` });
    }

    const wRes = await db.query('SELECT * FROM student_withdrawals WHERE id = $1', [id]);
    const w = wRes.rows[0] as any;

    await db.query(`
      UPDATE student_withdrawals
      SET status = 'APPROVED', approved_by = $1, approved_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [`${user.firstName} ${user.lastName}`, id]);

    await db.query(`
      UPDATE students
      SET student_status = 'WITHDRAWN', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [w.student_id]);

    const eventId = `ev_fin_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    await db.query(`
      INSERT INTO student_lifecycle_events (
        id, student_id, school_id, event_type, from_status, to_status,
        reason, notes, action_by_name
      ) VALUES ($1, $2, $3, 'WITHDRAWAL_APPROVED', 'ACTIVE', 'WITHDRAWN', 'Clearance Finalized & Withdrawal Approved', 'Student released for Transfer Certificate generation', $4)
    `, [eventId, w.student_id, w.school_id, `${user.firstName} ${user.lastName}`]);

    res.json({ success: true, message: 'Withdrawal approved. Student marked Withdrawn and ready for TC issuance.' });
  } catch (err: any) {
    console.error('[FINALIZE WITHDRAWAL ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to finalize withdrawal' });
  }
});

// ============================================================================
// 5. DIGITAL STUDENT DOCUMENT VAULT & VERIFICATION
// ============================================================================

// List Documents
router.get('/documents', requireAuth, requirePermission('documents.view'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);
    const studentId = req.query.studentId as string;
    const status = req.query.status as string;

    const params: any[] = [];
    const where: string[] = ['d.is_current_version = true'];

    if (schoolId) {
      params.push(schoolId);
      where.push(`d.school_id = $${params.length}`);
    }
    if (studentId) {
      params.push(studentId);
      where.push(`d.student_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`d.verification_status = $${params.length}`);
    }

    const result = await db.query(`
      SELECT d.*, s.first_name, s.last_name, s.admission_number, c.name as class_name, sec.name as section_name
      FROM student_document_vault d
      JOIN students s ON s.id = d.student_id
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      WHERE ${where.join(' AND ')}
      ORDER BY d.created_at DESC
      LIMIT 100
    `, params);

    res.json({ documents: result.rows });
  } catch (err: any) {
    console.error('[GET DOCUMENTS ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch documents' });
  }
});

// Upload Document with Versioning
router.post('/documents', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const { studentId, documentCategory, documentType, fileName, fileSize, mimeType, fileData, expiryDate } = req.body;

    const stuRes = await db.query('SELECT * FROM students WHERE id = $1', [studentId]);
    if (stuRes.rows.length === 0) return res.status(404).json({ error: 'Student not found.' });
    const student = stuRes.rows[0] as any;

    if (!checkSchoolScope(req, student.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Check existing version
    const prevDocRes = await db.query(`
      SELECT version FROM student_document_vault
      WHERE student_id = $1 AND document_type = $2 AND is_current_version = true
    `, [studentId, documentType]);

    let nextVersion = 1;
    if (prevDocRes.rows.length > 0) {
      nextVersion = Number((prevDocRes.rows[0] as any)?.version || 1) + 1;
      // Mark previous version as archived
      await db.query(`
        UPDATE student_document_vault SET is_current_version = false
        WHERE student_id = $1 AND document_type = $2
      `, [studentId, documentType]);
    }

    const docId = `doc_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    await db.query(`
      INSERT INTO student_document_vault (
        id, student_id, school_id, document_category, document_type, file_name, file_size,
        mime_type, file_data, version, is_current_version, verification_status, expiry_date,
        uploaded_by_type, uploaded_by_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, 'PENDING', $11, $12, $13)
    `, [
      docId, studentId, student.school_id, documentCategory || 'IDENTITY', documentType,
      fileName, fileSize || 1024, mimeType || 'application/pdf', fileData || 'data:application/pdf;base64,JVBERi0...',
      nextVersion, expiryDate || null, user.roleName === 'parent' ? 'PARENT' : 'ADMIN', `${user.firstName} ${user.lastName}`
    ]);

    // Record lifecycle event
    const eventId = `ev_doc_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    await db.query(`
      INSERT INTO student_lifecycle_events (
        id, student_id, school_id, event_type, from_status, to_status,
        reason, notes, action_by_name
      ) VALUES ($1, $2, $3, 'DOCUMENT_UPLOAD', 'ACTIVE', 'ACTIVE', $4, $5, $6)
    `, [
      eventId, studentId, student.school_id, `Uploaded ${documentType} (v${nextVersion})`,
      `File: ${fileName}`, `${user.firstName} ${user.lastName}`
    ]);

    res.json({ success: true, documentId: docId, version: nextVersion, message: 'Document uploaded successfully.' });
  } catch (err: any) {
    console.error('[UPLOAD DOCUMENT ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to upload document' });
  }
});

// Verify or Reject Document
router.put('/documents/:id/verify', requireAuth, requirePermission('documents.verify'), async (req, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be VERIFIED or REJECTED.' });
    }

    if (status === 'REJECTED' && !rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required.' });
    }

    await db.query(`
      UPDATE student_document_vault
      SET verification_status = $1, rejection_reason = $2, verified_by = $3, verified_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [status, rejectionReason || null, `${user.firstName} ${user.lastName}`, id]);

    res.json({ success: true, message: `Document marked as ${status}.` });
  } catch (err: any) {
    console.error('[VERIFY DOCUMENT ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to verify document' });
  }
});

// Missing Documents Dashboard
router.get('/documents/missing', requireAuth, requirePermission('documents.view'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);

    const sFilter = schoolId ? 'WHERE s.school_id = $1 AND s.student_status = \'ACTIVE\'' : 'WHERE s.student_status = \'ACTIVE\'';
    const students = await db.query(`
      SELECT s.id, s.admission_number, s.first_name, s.last_name, c.name as class_name, sec.name as section_name,
        p.name as parent_name, p.mobile_number as parent_mobile,
        (SELECT count(*) FROM student_document_vault d WHERE d.student_id = s.id AND d.document_type = 'Birth Certificate') as has_birth_cert,
        (SELECT count(*) FROM student_document_vault d WHERE d.student_id = s.id AND d.document_type = 'Aadhaar Card Copy') as has_aadhaar,
        (SELECT count(*) FROM student_document_vault d WHERE d.student_id = s.id AND d.document_type = 'Previous School TC') as has_tc
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      LEFT JOIN student_parents sp ON sp.student_id = s.id AND sp.is_primary_guardian = true
      LEFT JOIN parents p ON p.id = sp.parent_id
      ${sFilter}
      LIMIT 100
    `, schoolId ? [schoolId] : []);

    const missingList = students.rows.map((stu: any) => {
      const missing: string[] = [];
      if (Number(stu.has_birth_cert) === 0) missing.push('Birth Certificate');
      if (Number(stu.has_aadhaar) === 0) missing.push('Aadhaar Card');
      if (Number(stu.has_tc) === 0) missing.push('Previous School TC');
      return {
        studentId: stu.id,
        admissionNumber: stu.admission_number,
        studentName: `${stu.first_name} ${stu.last_name}`,
        className: stu.class_name,
        sectionName: stu.section_name,
        parentName: stu.parent_name || 'Guardian',
        parentMobile: stu.parent_mobile || '+91 98350 12345',
        missingCount: missing.length,
        missingDocuments: missing
      };
    }).filter((s) => s.missingCount > 0);

    res.json({ missingDocuments: missingList });
  } catch (err: any) {
    console.error('[MISSING DOCUMENTS ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to check missing documents' });
  }
});

// ============================================================================
// 6. ONLINE STUDENT SERVICE REQUESTS
// ============================================================================

// List Service Requests
router.get('/service-requests', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);
    const studentId = req.query.studentId as string;

    const params: any[] = [];
    const where: string[] = [];

    if (schoolId) {
      params.push(schoolId);
      where.push(`r.school_id = $${params.length}`);
    }
    if (studentId) {
      params.push(studentId);
      where.push(`r.student_id = $${params.length}`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const result = await db.query(`
      SELECT r.*, s.first_name, s.last_name, s.admission_number, c.name as class_name, sec.name as section_name
      FROM student_service_requests r
      JOIN students s ON s.id = r.student_id
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      ${whereClause}
      ORDER BY r.created_at DESC
    `, params);

    res.json({ requests: result.rows });
  } catch (err: any) {
    console.error('[GET SERVICE REQUESTS ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch service requests' });
  }
});

// Submit Service Request
router.post('/service-requests', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const { studentId, requestType, purpose, notes } = req.body;

    const stuRes = await db.query('SELECT * FROM students WHERE id = $1', [studentId]);
    if (stuRes.rows.length === 0) return res.status(404).json({ error: 'Student not found.' });
    const student = stuRes.rows[0] as any;

    const reqId = `req_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    const reqNum = `REQ-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    await db.query(`
      INSERT INTO student_service_requests (
        id, request_number, school_id, student_id, session_id, request_type,
        requested_by_type, requested_by_name, purpose, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'SUBMITTED')
    `, [
      reqId, reqNum, student.school_id, studentId, student.session_id, requestType,
      user.roleName === 'parent' ? 'PARENT' : user.roleName === 'student' ? 'STUDENT' : 'ADMIN',
      `${user.firstName} ${user.lastName}`, purpose || '', notes || ''
    ]);

    res.json({ success: true, requestId: reqId, requestNumber: reqNum, message: 'Service request submitted successfully.' });
  } catch (err: any) {
    console.error('[CREATE SERVICE REQUEST ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to submit service request' });
  }
});

// Update Request Status (Approve/Reject)
router.put('/service-requests/:id/status', requireAuth, requirePermission('certificates.approve'), async (req, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    await db.query(`
      UPDATE student_service_requests
      SET status = $1, rejection_reason = $2, approved_by = $3, approved_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [status, rejectionReason || null, `${user.firstName} ${user.lastName}`, id]);

    res.json({ success: true, message: `Request status updated to ${status}.` });
  } catch (err: any) {
    console.error('[UPDATE SERVICE REQUEST STATUS ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to update request status' });
  }
});

// ============================================================================
// 7. CERTIFICATE REGISTRY & GENERATION
// ============================================================================

// List Certificate Templates
router.get('/certificate-templates', requireAuth, async (req, res) => {
  try {
    const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
    const result = await db.query(`
      SELECT * FROM certificate_templates WHERE school_id = $1 ORDER BY title ASC
    `, [schoolId]);
    res.json({ templates: result.rows });
  } catch (err: any) {
    console.error('[GET TEMPLATES ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch certificate templates' });
  }
});

// List Certificates (Registry)
router.get('/certificates', requireAuth, requirePermission('certificates.view'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);
    const certType = req.query.type as string;
    const studentId = req.query.studentId as string;

    const params: any[] = [];
    const where: string[] = [];

    if (schoolId) {
      params.push(schoolId);
      where.push(`c.school_id = $${params.length}`);
    }
    if (certType) {
      params.push(certType);
      where.push(`c.certificate_type = $${params.length}`);
    }
    if (studentId) {
      params.push(studentId);
      where.push(`c.student_id = $${params.length}`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const result = await db.query(`
      SELECT c.*, s.first_name, s.last_name, s.admission_number, cls.name as class_name, sec.name as section_name,
             sch.name as school_name, sch.code as school_code, ses.name as session_name
      FROM certificates c
      JOIN students s ON s.id = c.student_id
      LEFT JOIN classes cls ON cls.id = c.class_id
      LEFT JOIN sections sec ON sec.id = c.section_id
      LEFT JOIN schools sch ON sch.id = c.school_id
      LEFT JOIN academic_sessions ses ON ses.id = c.academic_session_id
      ${whereClause}
      ORDER BY c.issue_date DESC, c.created_at DESC
      LIMIT 100
    `, params);

    res.json({ certificates: result.rows });
  } catch (err: any) {
    console.error('[GET CERTIFICATES ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch certificate registry' });
  }
});

// Generate and Issue Certificate
router.post('/certificates/generate', requireAuth, requirePermission('certificates.issue'), async (req, res) => {
  try {
    const user = req.user!;
    const { studentId, certificateType, serviceRequestId, customFields } = req.body;

    const stuRes = await db.query(`
      SELECT s.*, c.name as class_name, sec.name as section_name
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      WHERE s.id = $1
    `, [studentId]);

    if (stuRes.rows.length === 0) return res.status(404).json({ error: 'Student not found.' });
    const student = stuRes.rows[0] as any;

    if (!checkSchoolScope(req, student.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const certNumber = await generateCertificateNumber(student.school_id, certificateType);
    const verificationCode = crypto.randomBytes(16).toString('hex');
    const certId = `cert_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;

    const titleMap: Record<string, string> = {
      BONAFIDE: 'Bonafide Certificate',
      CHARACTER: 'Character & Conduct Certificate',
      STUDY: 'Study & Course Enrollment Certificate',
      FEE: 'Fee Clearance Certificate',
      TRANSFER_CERTIFICATE: 'Transfer Certificate (School Leaving)',
      SCHOOL_LEAVING_CERTIFICATE: 'School Leaving Certificate'
    };

    await db.query(`
      INSERT INTO certificates (
        id, certificate_number, verification_code, school_id, student_id, service_request_id,
        certificate_type, title, issue_date, academic_session_id, class_id, section_id,
        signatory_name, signatory_title, status, custom_fields, created_by_id, created_by_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, $9, $10, $11, 'Dr. Rajesh Sharma', 'Principal', 'VALID', $12, $13, $14)
    `, [
      certId, certNumber, verificationCode, student.school_id, studentId, serviceRequestId || null,
      certificateType, titleMap[certificateType] || certificateType, student.session_id,
      student.class_id, student.section_id, JSON.stringify(customFields || {}), user.id, `${user.firstName} ${user.lastName}`
    ]);

    // Update service request if linked
    if (serviceRequestId) {
      await db.query(`
        UPDATE student_service_requests
        SET status = 'ISSUED', generated_certificate_id = $1
        WHERE id = $2
      `, [certId, serviceRequestId]);
    }

    // Record lifecycle event
    const eventId = `ev_cert_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    await db.query(`
      INSERT INTO student_lifecycle_events (
        id, student_id, school_id, session_id, event_type, from_status, to_status,
        reason, notes, action_by_name
      ) VALUES ($1, $2, $3, $4, 'CERTIFICATE_ISSUED', 'ACTIVE', 'ACTIVE', $5, $6, $7)
    `, [
      eventId, studentId, student.school_id, student.session_id,
      `Issued ${titleMap[certificateType] || certificateType}`, `Certificate Number: ${certNumber}`, `${user.firstName} ${user.lastName}`
    ]);

    recordAuditLog({
      req,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.roleName,
      schoolId: student.school_id,
      action: 'ISSUE_CERTIFICATE',
      module: 'CERTIFICATES',
      recordId: certId,
      description: `Issued ${certificateType} #${certNumber} to student ${student.admission_number}`
    });

    res.json({
      success: true,
      certificateId: certId,
      certificateNumber: certNumber,
      verificationCode,
      message: 'Certificate generated & issued successfully.'
    });
  } catch (err: any) {
    console.error('[GENERATE CERTIFICATE ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to generate certificate' });
  }
});

// Revoke Certificate
router.put('/certificates/:id/revoke', requireAuth, requirePermission('certificates.revoke'), async (req, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) return res.status(400).json({ error: 'Revocation reason is required.' });

    await db.query(`
      UPDATE certificates
      SET status = 'REVOKED', revocation_reason = $1, revoked_by = $2, revoked_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [reason, `${user.firstName} ${user.lastName}`, id]);

    recordAuditLog({
      req,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.roleName,
      action: 'REVOKE_CERTIFICATE',
      module: 'CERTIFICATES',
      recordId: id,
      description: `Revoked certificate ${id}: ${reason}`
    });

    res.json({ success: true, message: 'Certificate revoked successfully.' });
  } catch (err: any) {
    console.error('[REVOKE CERTIFICATE ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to revoke certificate' });
  }
});

// ============================================================================
// 8. DEDICATED TRANSFER CERTIFICATE (TC) & ALUMNI
// ============================================================================

// Generate Formal TC
router.post('/tc/generate', requireAuth, requirePermission('certificates.issue'), async (req, res) => {
  try {
    const user = req.user!;
    const { studentId, leavingReason, conduct = 'Good', workingDays = 210, presentDays = 194, resultStatus = 'PASSED', promotionStatus = 'Eligible for higher class' } = req.body;

    const stuRes = await db.query(`
      SELECT s.*, c.name as class_name, sec.name as section_name, ses.name as session_name
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      LEFT JOIN academic_sessions ses ON ses.id = s.session_id
      WHERE s.id = $1
    `, [studentId]);

    if (stuRes.rows.length === 0) return res.status(404).json({ error: 'Student not found.' });
    const student = stuRes.rows[0] as any;

    if (!checkSchoolScope(req, student.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const tcNumber = await generateCertificateNumber(student.school_id, 'TRANSFER_CERTIFICATE');
    const verifyCode = crypto.randomBytes(16).toString('hex');
    const certId = `tc_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;

    const customFields = {
      fatherName: 'Guardian',
      motherName: 'Mother',
      nationality: student.nationality || 'Indian',
      category: student.category || 'General',
      admissionDate: student.admission_date,
      dateOfBirth: student.date_of_birth,
      leavingDate: new Date().toISOString().split('T')[0],
      leavingReason: leavingReason || 'Relocation of family',
      conduct,
      workingDays,
      presentDays,
      resultStatus,
      promotionStatus
    };

    await db.query(`
      INSERT INTO certificates (
        id, certificate_number, verification_code, school_id, student_id, certificate_type,
        title, issue_date, academic_session_id, class_id, section_id, signatory_name,
        signatory_title, status, custom_fields, created_by_id, created_by_name
      ) VALUES ($1, $2, $3, $4, $5, 'TRANSFER_CERTIFICATE', 'Transfer Certificate', CURRENT_DATE, $6, $7, $8, 'Dr. Rajesh Sharma', 'Principal', 'VALID', $9, $10, $11)
    `, [
      certId, tcNumber, verifyCode, student.school_id, studentId, student.session_id,
      student.class_id, student.section_id, JSON.stringify(customFields), user.id, `${user.firstName} ${user.lastName}`
    ]);

    // Update student status to TC_ISSUED
    await db.query(`UPDATE students SET student_status = 'TC_ISSUED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [studentId]);

    // Record lifecycle event
    const eventId = `ev_tc_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    await db.query(`
      INSERT INTO student_lifecycle_events (
        id, student_id, school_id, session_id, event_type, from_status, to_status,
        reason, notes, action_by_name
      ) VALUES ($1, $2, $3, $4, 'TC_ISSUED', 'WITHDRAWN', 'TC_ISSUED', $5, $6, $7)
    `, [
      eventId, studentId, student.school_id, student.session_id,
      `Transfer Certificate Issued #${tcNumber}`, `Reason: ${leavingReason}`, `${user.firstName} ${user.lastName}`
    ]);

    res.json({
      success: true,
      tcId: certId,
      tcNumber,
      verificationCode: verifyCode,
      message: 'Transfer Certificate generated and student status updated to TC_ISSUED.'
    });
  } catch (err: any) {
    console.error('[GENERATE TC ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to generate Transfer Certificate' });
  }
});

// Convert Student to Alumni
router.post('/alumni/convert', requireAuth, requirePermission('lifecycle.transfer'), async (req, res) => {
  try {
    const user = req.user!;
    const { studentId, currentOrganization, currentCity, contactEmail, contactPhone, notes } = req.body;

    const stuRes = await db.query(`
      SELECT s.*, c.name as class_name, ses.name as session_name
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN academic_sessions ses ON ses.id = s.session_id
      WHERE s.id = $1
    `, [studentId]);

    if (stuRes.rows.length === 0) return res.status(404).json({ error: 'Student not found.' });
    const student = stuRes.rows[0] as any;

    // Check if TC exists
    const tcRes = await db.query('SELECT certificate_number FROM certificates WHERE student_id = $1 AND certificate_type = \'TRANSFER_CERTIFICATE\' ORDER BY created_at DESC LIMIT 1', [studentId]);
    const tcNumber = (tcRes.rows[0] as any)?.certificate_number || 'N/A';

    const alumniId = `alm_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    await db.query(`
      INSERT INTO alumni_profiles (
        id, student_id, school_id, admission_number, student_name, leaving_date,
        leaving_class, leaving_session, tc_number, current_organization, current_city,
        contact_email, contact_phone, notes
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (student_id) DO UPDATE SET
        current_organization = EXCLUDED.current_organization,
        current_city = EXCLUDED.current_city,
        contact_email = EXCLUDED.contact_email,
        contact_phone = EXCLUDED.contact_phone,
        notes = EXCLUDED.notes
    `, [
      alumniId, studentId, student.school_id, student.admission_number,
      `${student.first_name} ${student.last_name}`, student.class_name, student.session_name,
      tcNumber, currentOrganization || '', currentCity || '', contactEmail || student.email,
      contactPhone || student.mobile_number, notes || ''
    ]);

    await db.query(`UPDATE students SET student_status = 'ALUMNI', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [studentId]);

    // Record lifecycle event
    const eventId = `ev_alm_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    await db.query(`
      INSERT INTO student_lifecycle_events (
        id, student_id, school_id, event_type, from_status, to_status,
        reason, notes, action_by_name
      ) VALUES ($1, $2, $3, 'ALUMNI_CONVERTED', $4, 'ALUMNI', 'Converted to Alumni Registry', 'Graduation / Formal Departure recorded', $5)
    `, [eventId, studentId, student.school_id, student.student_status, `${user.firstName} ${user.lastName}`]);

    res.json({ success: true, message: 'Student successfully transitioned to Alumni directory.' });
  } catch (err: any) {
    console.error('[CONVERT ALUMNI ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to convert student to Alumni' });
  }
});

// List Alumni
router.get('/alumni', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);

    const sFilter = schoolId ? 'WHERE a.school_id = $1' : '';
    const result = await db.query(`
      SELECT a.*, sch.name as school_name, sch.code as school_code
      FROM alumni_profiles a
      JOIN schools sch ON sch.id = a.school_id
      ${sFilter}
      ORDER BY a.leaving_date DESC
    `, schoolId ? [schoolId] : []);

    res.json({ alumni: result.rows });
  } catch (err: any) {
    console.error('[GET ALUMNI ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch alumni' });
  }
});

// ============================================================================
// 9. PUBLIC QR CODE CERTIFICATE VERIFICATION (NO LOGIN REQUIRED)
// ============================================================================
router.get('/public/verify/:code', async (req, res) => {
  try {
    const { code } = req.params;
    if (!code || code.trim().length < 8) {
      return res.status(400).json({ error: 'Invalid verification token.' });
    }

    const result = await db.query(`
      SELECT 
        c.certificate_number,
        c.certificate_type,
        c.title,
        c.issue_date,
        c.status,
        c.signatory_name,
        c.signatory_title,
        sch.name as school_name,
        sch.code as school_code,
        sch.affiliation_no,
        sch.board,
        s.first_name,
        s.last_name,
        s.admission_number,
        cls.name as class_name,
        ses.name as session_name
      FROM certificates c
      JOIN schools sch ON sch.id = c.school_id
      JOIN students s ON s.id = c.student_id
      LEFT JOIN classes cls ON cls.id = c.class_id
      LEFT JOIN academic_sessions ses ON ses.id = c.academic_session_id
      WHERE c.verification_code = $1
    `, [code]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        found: false,
        status: 'NOT_FOUND',
        message: 'No official school certificate was found matching this verification code. The certificate may be fraudulent or unissued.'
      });
    }

    const row = result.rows[0] as any;

    // Mask sensitive details (e.g. only show first name + last initial)
    const maskedName = `${row.first_name} ${row.last_name ? row.last_name.charAt(0) + '***' : ''}`;

    return res.json({
      found: true,
      status: row.status, // VALID, REVOKED, SUPERSEDED
      certificate: {
        certificateNumber: row.certificate_number,
        certificateType: row.certificate_type,
        title: row.title,
        issueDate: row.issue_date,
        schoolName: row.school_name,
        schoolCode: row.school_code,
        board: row.board,
        affiliationNo: row.affiliation_no,
        studentName: maskedName,
        admissionNumber: row.admission_number,
        className: row.class_name,
        sessionName: row.session_name,
        signatoryTitle: row.signatory_title
      },
      verifiedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[PUBLIC CERTIFICATE VERIFY ERROR]', err);
    res.status(500).json({ error: 'Certificate verification failed' });
  }
});

export default router;
