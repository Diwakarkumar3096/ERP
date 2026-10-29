import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// ==========================================
// PUBLIC ENDPOINTS (No login required)
// For prospective applicants & parents
// ==========================================

// Get active schools for public application form
router.get('/public/schools', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.id, s.name, s.code, s.board, s.affiliation_no, s.city, s.state, s.phone, s.email,
             COALESCE(aset.application_prefix, s.admission_prefix, s.code || '-ADM') as admission_prefix,
             COALESCE(aset.application_fee, 500) as application_fee,
             COALESCE(aset.online_admissions_open, true) as online_admissions_open,
             COALESCE(aset.instructions, '') as instructions
      FROM schools s
      LEFT JOIN admission_settings aset ON aset.school_id = s.id
      WHERE s.status = 'active'
      ORDER BY s.name ASC
    `);
    res.json({ schools: result.rows });
  } catch (error: any) {
    console.error('[PUBLIC SCHOOLS ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch schools' });
  }
});

// Get sessions for a school
router.get('/public/sessions', async (req, res) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) {
      return res.status(400).json({ error: 'schoolId is required' });
    }
    const result = await db.query(`
      SELECT id, name, is_current, status
      FROM academic_sessions
      WHERE school_id = $1 AND status IN ('active', 'upcoming')
      ORDER BY start_date DESC
    `, [schoolId]);
    res.json({ sessions: result.rows });
  } catch (error) {
    console.error('[PUBLIC SESSIONS ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get classes for a school
router.get('/public/classes', async (req, res) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) {
      return res.status(400).json({ error: 'schoolId is required' });
    }
    const result = await db.query(`
      SELECT id, name, numeric_grade, stream
      FROM classes
      WHERE school_id = $1 AND status = 'active'
      ORDER BY display_order ASC, numeric_grade ASC
    `, [schoolId]);
    res.json({ classes: result.rows });
  } catch (error) {
    console.error('[PUBLIC CLASSES ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Helper: Generate Unique Application Number
async function generateApplicationNumber(schoolId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  // Get prefix from admission_settings or schools
  const prefixRes = await db.query(`
    SELECT COALESCE(aset.application_prefix, s.admission_prefix, s.code || '-ADM') as prefix
    FROM schools s
    LEFT JOIN admission_settings aset ON aset.school_id = s.id
    WHERE s.id = $1
  `, [schoolId]);

  let prefix = 'ADM';
  const prefixRow = prefixRes.rows[0] as { prefix?: string } | undefined;
  if (prefixRow && prefixRow.prefix) {
    prefix = prefixRow.prefix;
    if (!prefix.includes('ADM')) {
      prefix = `${prefix}-ADM`;
    }
  }

  // Count existing applications with this prefix & year
  const searchPattern = `${prefix}-${currentYear}-%`;
  const countRes = await db.query(`
    SELECT count(*) as count FROM admission_applications
    WHERE application_number LIKE $1
  `, [searchPattern]);

  let nextSequence = parseInt((countRes.rows[0] as { count: string }).count, 10) + 1;
  let candidate = `${prefix}-${currentYear}-${String(nextSequence).padStart(4, '0')}`;

  // Double check uniqueness
  let attempts = 0;
  while (attempts < 20) {
    const check = await db.query('SELECT id FROM admission_applications WHERE application_number = $1', [candidate]);
    if (check.rows.length === 0) {
      return candidate;
    }
    nextSequence++;
    candidate = `${prefix}-${currentYear}-${String(nextSequence).padStart(4, '0')}`;
    attempts++;
  }

  return `${prefix}-${currentYear}-${Date.now().toString().slice(-4)}`;
}

// Helper: Generate Unique Student Admission Number
async function generateStudentAdmissionNumber(schoolId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const schoolRes = await db.query('SELECT code, admission_prefix FROM schools WHERE id = $1', [schoolId]);
  const schoolRow = schoolRes.rows[0] as { code?: string; admission_prefix?: string } | undefined;
  const prefix = schoolRow?.admission_prefix || schoolRow?.code || 'ADM';

  const countRes = await db.query(`
    SELECT count(*) as count FROM students
    WHERE school_id = $1 AND admission_number LIKE $2
  `, [schoolId, `${prefix}-${currentYear}-%`]);

  let nextSeq = parseInt((countRes.rows[0] as { count: string }).count, 10) + 1;
  let candidate = `${prefix}-${currentYear}-${String(nextSeq).padStart(4, '0')}`;

  let attempts = 0;
  while (attempts < 20) {
    const check = await db.query('SELECT id FROM students WHERE school_id = $1 AND admission_number = $2', [schoolId, candidate]);
    if (check.rows.length === 0) {
      return candidate;
    }
    nextSeq++;
    candidate = `${prefix}-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
    attempts++;
  }

  return `${prefix}-${currentYear}-${Date.now().toString().slice(-4)}`;
}

// Public Online Application Submission
router.post('/public/apply', async (req, res) => {
  try {
    const {
      school_id,
      session_id,
      admission_type = 'NEW',
      applying_class_id,
      first_name,
      middle_name = '',
      last_name,
      date_of_birth,
      gender,
      blood_group = '',
      nationality = 'Indian',
      category = 'General',
      aadhaar_number = '',
      religion = '',
      address,
      city,
      district = '',
      state,
      pin_code,
      previous_school = '',
      previous_class = '',
      father_name = '',
      mother_name = '',
      guardian_name = '',
      parent_mobile,
      alternate_mobile = '',
      parent_email = '',
      emergency_contact = '',
      remarks = '',
      documents = []
    } = req.body;

    if (!school_id || !session_id || !applying_class_id) {
      return res.status(400).json({ error: 'School, Academic Session, and Applying Class are required.' });
    }
    if (!first_name || !last_name || !date_of_birth || !gender) {
      return res.status(400).json({ error: 'Student full name, date of birth, and gender are required.' });
    }
    if (!parent_mobile) {
      return res.status(400).json({ error: 'Primary parent contact mobile number is required.' });
    }
    if (!address || !city || !state || !pin_code) {
      return res.status(400).json({ error: 'Complete address with City, State and PIN code is required.' });
    }

    const appId = `adm_app_${crypto.randomBytes(6).toString('hex')}`;
    const appNo = await generateApplicationNumber(school_id);
    const fullName = [first_name, middle_name, last_name].filter(Boolean).join(' ');

    await db.query(`
      INSERT INTO admission_applications (
        id, application_number, school_id, session_id, admission_type, application_date,
        student_name, first_name, middle_name, last_name, date_of_birth, gender,
        blood_group, nationality, category, aadhaar_number, religion,
        address, city, district, state, pin_code,
        previous_school, previous_class, applying_class_id,
        father_name, mother_name, guardian_name,
        parent_mobile, alternate_mobile, parent_email, emergency_contact,
        source_of_application, application_status, remarks
      ) VALUES (
        $1, $2, $3, $4, $5, CURRENT_DATE,
        $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21,
        $22, $23, $24,
        $25, $26, $27,
        $28, $29, $30, $31,
        'Online Portal', 'SUBMITTED', $32
      )
    `, [
      appId, appNo, school_id, session_id, admission_type,
      fullName, first_name, middle_name, last_name, date_of_birth, gender,
      blood_group, nationality, category, aadhaar_number, religion,
      address, city, district, state, pin_code,
      previous_school, previous_class, applying_class_id,
      father_name, mother_name, guardian_name,
      parent_mobile, alternate_mobile, parent_email, emergency_contact,
      remarks
    ]);

    // Save uploaded documents if provided
    if (Array.isArray(documents) && documents.length > 0) {
      for (const doc of documents) {
        if (doc.document_type && doc.file_data) {
          const docId = `doc_adm_${crypto.randomBytes(6).toString('hex')}`;
          await db.query(`
            INSERT INTO admission_documents (
              id, application_id, document_type, file_name, file_size, file_data, mime_type, uploaded_by, verification_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Applicant Parent', 'Pending')
          `, [
            docId, appId, doc.document_type, doc.file_name || `${doc.document_type}.pdf`,
            doc.file_size || Math.round(doc.file_data.length * 0.75), doc.file_data,
            doc.mime_type || 'application/pdf'
          ]);
        }
      }
    }

    // Initial timeline entry
    await db.query(`
      INSERT INTO admission_timeline (id, application_id, action, previous_status, new_status, remarks, performed_by_name)
      VALUES ($1, $2, 'Online Application Submitted', NULL, 'SUBMITTED', 'Candidate parent submitted online registration dossier.', 'Applicant Portal')
    `, [`time_${crypto.randomBytes(6).toString('hex')}`, appId]);

    res.json({
      success: true,
      applicationId: appId,
      applicationNumber: appNo,
      studentName: fullName,
      message: 'Your admission application has been submitted successfully! Please save your application number for live status tracking.'
    });
  } catch (error) {
    console.error('[PUBLIC APPLY ERROR]', error);
    res.status(500).json({ error: 'Failed to process online application. Please check input fields.' });
  }
});

// Public Application Tracking
router.get('/public/track', async (req, res) => {
  try {
    const { applicationNumber, contact } = req.query;
    if (!applicationNumber || !contact) {
      return res.status(400).json({ error: 'Application number and registered contact (mobile or email) are required' });
    }

    const cleanAppNo = (applicationNumber as string).trim();
    const cleanContact = (contact as string).trim();

    const result = await db.query(`
      SELECT a.*, s.name as school_name, s.code as school_code, sess.name as session_name,
             c.name as applying_class_name
      FROM admission_applications a
      JOIN schools s ON s.id = a.school_id
      JOIN academic_sessions sess ON sess.id = a.session_id
      JOIN classes c ON c.id = a.applying_class_id
      WHERE UPPER(a.application_number) = UPPER($1)
        AND (a.parent_mobile = $2 OR a.alternate_mobile = $2 OR LOWER(a.parent_email) = LOWER($2))
    `, [cleanAppNo, cleanContact]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No matching application found with this Application Number and Contact.' });
    }

    const app = result.rows[0] as any;

    // Fetch tests, interviews, fees, and timeline
    const [testsRes, interviewsRes, feesRes, timelineRes] = await Promise.all([
      db.query(`SELECT id, test_date, test_time, venue, subjects, max_marks, marks_obtained, test_status, remarks FROM admission_tests WHERE application_id = $1 ORDER BY test_date ASC`, [app.id]),
      db.query(`SELECT id, interview_date, interview_time, interviewer_name, interview_mode, status, recommendation, remarks FROM admission_interviews WHERE application_id = $1 ORDER BY interview_date ASC`, [app.id]),
      db.query(`SELECT id, fee_type, amount, payment_mode, payment_status, receipt_number, payment_date FROM admission_fees WHERE application_id = $1`, [app.id]),
      db.query(`SELECT id, action, previous_status, new_status, remarks, performed_by_name, created_at FROM admission_timeline WHERE application_id = $1 ORDER BY created_at ASC`, [app.id])
    ]);

    res.json({
      application: {
        application_number: app.application_number,
        student_name: app.student_name,
        school_name: app.school_name,
        session_name: app.session_name,
        applying_class_name: app.applying_class_name,
        application_date: app.application_date,
        application_status: app.application_status,
        remarks: app.remarks,
        tests: testsRes.rows,
        interviews: interviewsRes.rows,
        fees: feesRes.rows,
        timeline: timelineRes.rows
      }
    });
  } catch (error) {
    console.error('[PUBLIC TRACK ERROR]', error);
    res.status(500).json({ error: 'Failed to look up application tracking status.' });
  }
});


// ==========================================
// AUTHENTICATED ERP ENDPOINTS
// Scoped to school and protected by permissions
// ==========================================

// Dashboard Statistics
router.get('/dashboard-stats', requireAuth, requirePermission('admissions.view'), async (req, res) => {
  try {
    const { schoolId, sessionId } = req.query;
    const user = (req as any).user;

    let targetSchoolId = schoolId as string | undefined;
    if (user.roleName !== 'super_admin') {
      targetSchoolId = user.schoolId;
    }

    let filterClauses: string[] = [];
    let queryParams: any[] = [];

    if (targetSchoolId) {
      queryParams.push(targetSchoolId);
      filterClauses.push(`a.school_id = $${queryParams.length}`);
    }
    if (sessionId) {
      queryParams.push(sessionId);
      filterClauses.push(`a.session_id = $${queryParams.length}`);
    }

    const whereSql = filterClauses.length > 0 ? `WHERE ${filterClauses.join(' AND ')}` : '';

    // Aggregate status counts
    const statusCountQuery = `
      SELECT a.application_status, count(*) as count
      FROM admission_applications a
      ${whereSql}
      GROUP BY a.application_status
    `;
    const statusCounts = await db.query(statusCountQuery, queryParams);

    const counts: Record<string, number> = {};
    let total = 0;
    for (const row of statusCounts.rows) {
      const c = parseInt((row as any).count, 10);
      counts[(row as any).application_status] = c;
      total += c;
    }

    // Class wise distribution
    const classCountQuery = `
      SELECT c.name as class_name, count(*) as count
      FROM admission_applications a
      JOIN classes c ON c.id = a.applying_class_id
      ${whereSql}
      GROUP BY c.name, c.display_order
      ORDER BY c.display_order ASC
    `;
    const classCounts = await db.query(classCountQuery, queryParams);

    // Admission type distribution
    const typeCountQuery = `
      SELECT a.admission_type as type, count(*) as count
      FROM admission_applications a
      ${whereSql}
      GROUP BY a.admission_type
    `;
    const typeCounts = await db.query(typeCountQuery, queryParams);

    res.json({
      stats: {
        total,
        draft: counts['DRAFT'] || 0,
        submitted: counts['SUBMITTED'] || 0,
        underReview: counts['UNDER_REVIEW'] || 0,
        documentsPending: counts['DOCUMENT_PENDING'] || 0,
        documentsVerification: counts['DOCUMENT_VERIFICATION'] || 0,
        testScheduled: counts['TEST_SCHEDULED'] || 0,
        testCompleted: counts['TEST_COMPLETED'] || 0,
        interviewScheduled: counts['INTERVIEW_SCHEDULED'] || 0,
        interviewCompleted: counts['INTERVIEW_COMPLETED'] || 0,
        selected: counts['SELECTED'] || 0,
        waitlisted: counts['WAITLISTED'] || 0,
        rejected: counts['REJECTED'] || 0,
        approved: counts['APPROVED'] || 0,
        feePending: counts['FEE_PENDING'] || 0,
        confirmed: counts['CONFIRMED'] || 0,
        cancelled: counts['CANCELLED'] || 0,
        byClass: classCounts.rows.map((r: any) => ({ class_name: r.class_name, count: parseInt(r.count, 10) })),
        byType: typeCounts.rows.map((r: any) => ({ type: r.type, count: parseInt(r.count, 10) }))
      }
    });
  } catch (error) {
    console.error('[ADMISSION STATS ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch admission statistics' });
  }
});

// List Applications with Search, Filters, Pagination
router.get('/applications', requireAuth, requirePermission('admissions.view'), async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      schoolId,
      sessionId,
      classId,
      admissionType,
      status,
      search,
      page = '1',
      limit = '10',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    let targetSchoolId = schoolId as string | undefined;
    if (user.roleName !== 'super_admin') {
      targetSchoolId = user.schoolId;
    }

    const filters: string[] = [];
    const params: any[] = [];

    if (targetSchoolId) {
      params.push(targetSchoolId);
      filters.push(`a.school_id = $${params.length}`);
    }
    if (sessionId) {
      params.push(sessionId);
      filters.push(`a.session_id = $${params.length}`);
    }
    if (classId) {
      params.push(classId);
      filters.push(`a.applying_class_id = $${params.length}`);
    }
    if (admissionType) {
      params.push(admissionType);
      filters.push(`a.admission_type = $${params.length}`);
    }
    if (status) {
      params.push(status);
      filters.push(`a.application_status = $${params.length}`);
    }
    if (search) {
      params.push(`%${(search as string).trim()}%`);
      filters.push(`(
        a.application_number ILIKE $${params.length} OR
        a.student_name ILIKE $${params.length} OR
        a.father_name ILIKE $${params.length} OR
        a.mother_name ILIKE $${params.length} OR
        a.parent_mobile ILIKE $${params.length} OR
        a.parent_email ILIKE $${params.length}
      )`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    // Total Count
    const countRes = await db.query(`
      SELECT count(*) as count
      FROM admission_applications a
      ${whereClause}
    `, params);

    const total = parseInt((countRes.rows[0] as { count: string }).count, 10);
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;

    // Allowed sort columns
    const allowedSortColumns: Record<string, string> = {
      created_at: 'a.created_at',
      application_date: 'a.application_date',
      student_name: 'a.student_name',
      application_number: 'a.application_number',
      application_status: 'a.application_status'
    };
    const orderCol = allowedSortColumns[sortBy as string] || 'a.created_at';
    const direction = (sortOrder as string).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const listQuery = `
      SELECT a.*, s.name as school_name, s.code as school_code,
             sess.name as session_name, c.name as applying_class_name,
             sec.name as applying_section_name
      FROM admission_applications a
      JOIN schools s ON s.id = a.school_id
      JOIN academic_sessions sess ON sess.id = a.session_id
      JOIN classes c ON c.id = a.applying_class_id
      LEFT JOIN sections sec ON sec.id = a.applying_section_id
      ${whereClause}
      ORDER BY ${orderCol} ${direction}
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const listRes = await db.query(listQuery, params);

    res.json({
      applications: listRes.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('[GET APPLICATIONS ERROR]', error);
    res.status(500).json({ error: 'Failed to retrieve applications' });
  }
});

// Get Single Application with full dossier
router.get('/applications/:id', requireAuth, requirePermission('admissions.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const appRes = await db.query(`
      SELECT a.*, s.name as school_name, s.code as school_code,
             sess.name as session_name, c.name as applying_class_name,
             sec.name as applying_section_name,
             stu.admission_number as enrolled_admission_number
      FROM admission_applications a
      JOIN schools s ON s.id = a.school_id
      JOIN academic_sessions sess ON sess.id = a.session_id
      JOIN classes c ON c.id = a.applying_class_id
      LEFT JOIN sections sec ON sec.id = a.applying_section_id
      LEFT JOIN students stu ON stu.id = a.student_id
      WHERE a.id = $1
    `, [id]);

    if (appRes.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = appRes.rows[0] as any;
    if (user.roleName !== 'super_admin' && user.schoolId !== application.school_id) {
      return res.status(403).json({ error: 'Access denied to this school application' });
    }

    // Parallel fetch related items
    const [docsRes, testsRes, interviewsRes, feesRes, timelineRes] = await Promise.all([
      db.query(`SELECT * FROM admission_documents WHERE application_id = $1 ORDER BY upload_date DESC`, [id]),
      db.query(`SELECT * FROM admission_tests WHERE application_id = $1 ORDER BY test_date ASC`, [id]),
      db.query(`SELECT * FROM admission_interviews WHERE application_id = $1 ORDER BY interview_date ASC`, [id]),
      db.query(`SELECT * FROM admission_fees WHERE application_id = $1 ORDER BY created_at ASC`, [id]),
      db.query(`SELECT * FROM admission_timeline WHERE application_id = $1 ORDER BY created_at DESC`, [id])
    ]);

    application.documents = docsRes.rows;
    application.tests = testsRes.rows;
    application.interviews = interviewsRes.rows;
    application.fees = feesRes.rows;
    application.timeline = timelineRes.rows;

    res.json({ application });
  } catch (error) {
    console.error('[GET APPLICATION DETAIL ERROR]', error);
    res.status(500).json({ error: 'Failed to retrieve application detail' });
  }
});

// Staff Create Offline / Walk-in Application
router.post('/applications', requireAuth, requirePermission('admissions.create'), async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      school_id,
      session_id,
      admission_type = 'NEW',
      applying_class_id,
      applying_section_id = null,
      first_name,
      middle_name = '',
      last_name,
      date_of_birth,
      gender,
      blood_group = '',
      nationality = 'Indian',
      category = 'General',
      aadhaar_number = '',
      religion = '',
      address,
      city,
      district = '',
      state,
      pin_code,
      previous_school = '',
      previous_class = '',
      father_name = '',
      mother_name = '',
      guardian_name = '',
      parent_mobile,
      alternate_mobile = '',
      parent_email = '',
      emergency_contact = '',
      source_of_application = 'Walk-in / Direct',
      application_status = 'SUBMITTED',
      remarks = ''
    } = req.body;

    const targetSchoolId = user.roleName === 'super_admin' ? (school_id || user.schoolId) : user.schoolId;
    if (!targetSchoolId || !session_id || !applying_class_id) {
      return res.status(400).json({ error: 'School, Session, and Class are required' });
    }
    if (!first_name || !last_name || !date_of_birth || !gender || !parent_mobile) {
      return res.status(400).json({ error: 'Full name, DOB, gender, and primary mobile are required' });
    }

    const appId = `adm_app_${crypto.randomBytes(6).toString('hex')}`;
    const appNo = await generateApplicationNumber(targetSchoolId);
    const fullName = [first_name, middle_name, last_name].filter(Boolean).join(' ');

    await db.query(`
      INSERT INTO admission_applications (
        id, application_number, school_id, session_id, admission_type, application_date,
        student_name, first_name, middle_name, last_name, date_of_birth, gender,
        blood_group, nationality, category, aadhaar_number, religion,
        address, city, district, state, pin_code,
        previous_school, previous_class, applying_class_id, applying_section_id,
        father_name, mother_name, guardian_name,
        parent_mobile, alternate_mobile, parent_email, emergency_contact,
        source_of_application, application_status, remarks
      ) VALUES (
        $1, $2, $3, $4, $5, CURRENT_DATE,
        $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21,
        $22, $23, $24, $25,
        $26, $27, $28,
        $29, $30, $31, $32,
        $33, $34, $35
      )
    `, [
      appId, appNo, targetSchoolId, session_id, admission_type,
      fullName, first_name, middle_name, last_name, date_of_birth, gender,
      blood_group, nationality, category, aadhaar_number, religion,
      address, city, district, state, pin_code,
      previous_school, previous_class, applying_class_id, applying_section_id,
      father_name, mother_name, guardian_name,
      parent_mobile, alternate_mobile, parent_email, emergency_contact,
      source_of_application, application_status, remarks
    ]);

    // Initial timeline
    await db.query(`
      INSERT INTO admission_timeline (id, application_id, action, previous_status, new_status, remarks, performed_by_name)
      VALUES ($1, $2, 'Staff Application Registered', NULL, $3, $4, $5)
    `, [
      `time_${crypto.randomBytes(6).toString('hex')}`,
      appId,
      application_status,
      remarks || 'Application registered by front office admissions desk',
      `${user.firstName} ${user.lastName}`
    ]);

    await recordAuditLog({
      schoolId: targetSchoolId,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.roleName,
      action: 'CREATE',
      module: 'Admissions',
      recordId: appId,
      description: `Created admission application ${appNo} for ${fullName}`,
      req
    });

    res.json({
      success: true,
      applicationId: appId,
      applicationNumber: appNo,
      message: 'Admission application created successfully'
    });
  } catch (error) {
    console.error('[STAFF CREATE APP ERROR]', error);
    res.status(500).json({ error: 'Failed to create admission application' });
  }
});

// Update Application Details
router.put('/applications/:id', requireAuth, requirePermission('admissions.review'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const existing = await db.query('SELECT * FROM admission_applications WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    const current = existing.rows[0] as any;
    if (user.roleName !== 'super_admin' && user.schoolId !== current.school_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const {
      first_name, middle_name, last_name, date_of_birth, gender, blood_group,
      nationality, category, aadhaar_number, religion, address, city, district,
      state, pin_code, previous_school, previous_class, applying_class_id,
      applying_section_id, father_name, mother_name, guardian_name, parent_mobile,
      alternate_mobile, parent_email, emergency_contact, remarks
    } = req.body;

    const fullName = [first_name || current.first_name, middle_name || current.middle_name, last_name || current.last_name].filter(Boolean).join(' ');

    await db.query(`
      UPDATE admission_applications SET
        student_name = COALESCE($1, student_name),
        first_name = COALESCE($2, first_name),
        middle_name = COALESCE($3, middle_name),
        last_name = COALESCE($4, last_name),
        date_of_birth = COALESCE($5, date_of_birth),
        gender = COALESCE($6, gender),
        blood_group = COALESCE($7, blood_group),
        nationality = COALESCE($8, nationality),
        category = COALESCE($9, category),
        aadhaar_number = COALESCE($10, aadhaar_number),
        religion = COALESCE($11, religion),
        address = COALESCE($12, address),
        city = COALESCE($13, city),
        district = COALESCE($14, district),
        state = COALESCE($15, state),
        pin_code = COALESCE($16, pin_code),
        previous_school = COALESCE($17, previous_school),
        previous_class = COALESCE($18, previous_class),
        applying_class_id = COALESCE($19, applying_class_id),
        applying_section_id = COALESCE($20, applying_section_id),
        father_name = COALESCE($21, father_name),
        mother_name = COALESCE($22, mother_name),
        guardian_name = COALESCE($23, guardian_name),
        parent_mobile = COALESCE($24, parent_mobile),
        alternate_mobile = COALESCE($25, alternate_mobile),
        parent_email = COALESCE($26, parent_email),
        emergency_contact = COALESCE($27, emergency_contact),
        remarks = COALESCE($28, remarks),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $29
    `, [
      fullName, first_name, middle_name, last_name, date_of_birth, gender, blood_group,
      nationality, category, aadhaar_number, religion, address, city, district,
      state, pin_code, previous_school, previous_class, applying_class_id,
      applying_section_id, father_name, mother_name, guardian_name, parent_mobile,
      alternate_mobile, parent_email, emergency_contact, remarks, id
    ]);

    await db.query(`
      INSERT INTO admission_timeline (id, application_id, action, previous_status, new_status, remarks, performed_by_name)
      VALUES ($1, $2, 'Dossier Information Updated', $3, $3, 'Applicant profile details modified', $4)
    `, [`time_${crypto.randomBytes(6).toString('hex')}`, id, current.application_status, `${user.firstName} ${user.lastName}`]);

    res.json({ success: true, message: 'Application updated successfully' });
  } catch (error) {
    console.error('[UPDATE APPLICATION ERROR]', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// Update Application Status with Workflow Validation
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['UNDER_REVIEW', 'DOCUMENT_PENDING', 'REJECTED', 'CANCELLED'],
  UNDER_REVIEW: ['DOCUMENT_PENDING', 'DOCUMENT_VERIFICATION', 'TEST_SCHEDULED', 'INTERVIEW_SCHEDULED', 'SELECTED', 'WAITLISTED', 'REJECTED', 'CANCELLED'],
  DOCUMENT_PENDING: ['DOCUMENT_VERIFICATION', 'UNDER_REVIEW', 'REJECTED', 'CANCELLED'],
  DOCUMENT_VERIFICATION: ['TEST_SCHEDULED', 'INTERVIEW_SCHEDULED', 'SELECTED', 'WAITLISTED', 'APPROVED', 'REJECTED', 'CANCELLED'],
  TEST_SCHEDULED: ['TEST_COMPLETED', 'INTERVIEW_SCHEDULED', 'SELECTED', 'WAITLISTED', 'REJECTED', 'CANCELLED'],
  TEST_COMPLETED: ['INTERVIEW_SCHEDULED', 'SELECTED', 'WAITLISTED', 'REJECTED', 'APPROVED', 'CANCELLED'],
  INTERVIEW_SCHEDULED: ['INTERVIEW_COMPLETED', 'SELECTED', 'WAITLISTED', 'REJECTED', 'CANCELLED'],
  INTERVIEW_COMPLETED: ['SELECTED', 'WAITLISTED', 'APPROVED', 'REJECTED', 'CANCELLED'],
  SELECTED: ['APPROVED', 'FEE_PENDING', 'WAITLISTED', 'REJECTED', 'CANCELLED'],
  WAITLISTED: ['SELECTED', 'APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['FEE_PENDING', 'CONFIRMED', 'CANCELLED'],
  FEE_PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: [], // Terminal via standard transition; only unenroll via specific administrative action
  CANCELLED: ['UNDER_REVIEW', 'SUBMITTED'], // Can reopen if permitted
  REJECTED: ['UNDER_REVIEW'] // Can appeal/reopen
};

router.patch('/applications/:id/status', requireAuth, requirePermission('admissions.review'), async (req, res) => {
  try {
    const { id } = req.params;
    const { new_status, remarks = '' } = req.body;
    const user = (req as any).user;

    const currentRes = await db.query('SELECT * FROM admission_applications WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    const current = currentRes.rows[0] as any;

    // Super Admin has override power; others must adhere to workflow rules
    if (user.roleName !== 'super_admin') {
      const allowed = VALID_STATUS_TRANSITIONS[current.application_status] || [];
      if (!allowed.includes(new_status)) {
        return res.status(400).json({
          error: `Invalid status transition from ${current.application_status} to ${new_status}. Allowed next states: ${allowed.join(', ') || 'None'}`
        });
      }
    }

    await db.query(`
      UPDATE admission_applications
      SET application_status = $1, remarks = COALESCE($2, remarks), updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [new_status, remarks, id]);

    // Record Timeline
    await db.query(`
      INSERT INTO admission_timeline (id, application_id, action, previous_status, new_status, remarks, performed_by_name)
      VALUES ($1, $2, 'Status Transition', $3, $4, $5, $6)
    `, [
      `time_${crypto.randomBytes(6).toString('hex')}`,
      id,
      current.application_status,
      new_status,
      remarks || `Transitioned status to ${new_status}`,
      `${user.firstName} ${user.lastName}`
    ]);

    await recordAuditLog({
      schoolId: current.school_id,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.roleName,
      action: 'UPDATE_STATUS',
      module: 'Admissions',
      recordId: id,
      description: `Transitioned application ${current.application_number} from ${current.application_status} to ${new_status}`,
      oldValues: { status: current.application_status },
      newValues: { status: new_status, remarks },
      req
    });

    res.json({ success: true, message: `Status updated to ${new_status}` });
  } catch (error) {
    console.error('[STATUS TRANSITION ERROR]', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

// Upload Document to Application
router.post('/applications/:id/documents', requireAuth, requirePermission('admissions.verify_docs'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { document_type, file_name, file_size, file_data, mime_type, remarks } = req.body;

    if (!document_type || !file_data) {
      return res.status(400).json({ error: 'document_type and file_data are required' });
    }

    const docId = `doc_adm_${crypto.randomBytes(6).toString('hex')}`;
    await db.query(`
      INSERT INTO admission_documents (
        id, application_id, document_type, file_name, file_size, file_data, mime_type, uploaded_by, verification_status, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending', $9)
    `, [
      docId, id, document_type, file_name || `${document_type}.pdf`,
      file_size || Math.round(file_data.length * 0.75), file_data,
      mime_type || 'application/pdf', `${user.firstName} ${user.lastName}`, remarks || null
    ]);

    await db.query(`
      INSERT INTO admission_timeline (id, application_id, action, previous_status, new_status, remarks, performed_by_name)
      VALUES ($1, $2, 'Document Uploaded', NULL, NULL, $3, $4)
    `, [`time_${crypto.randomBytes(6).toString('hex')}`, id, `Uploaded document: ${document_type}`, `${user.firstName} ${user.lastName}`]);

    res.json({ success: true, documentId: docId, message: 'Document attached successfully' });
  } catch (error) {
    console.error('[UPLOAD ADM DOC ERROR]', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Verify Document
router.patch('/applications/:id/documents/:docId', requireAuth, requirePermission('admissions.verify_docs'), async (req, res) => {
  try {
    const { id, docId } = req.params;
    const user = (req as any).user;
    const { verification_status, remarks } = req.body;

    if (!['Verified', 'Rejected', 'Pending'].includes(verification_status)) {
      return res.status(400).json({ error: 'Invalid verification status' });
    }

    await db.query(`
      UPDATE admission_documents
      SET verification_status = $1, remarks = COALESCE($2, remarks),
          verified_by = $3, verified_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND application_id = $5
    `, [verification_status, remarks, `${user.firstName} ${user.lastName}`, docId, id]);

    await db.query(`
      INSERT INTO admission_timeline (id, application_id, action, previous_status, new_status, remarks, performed_by_name)
      VALUES ($1, $2, 'Document Verification', NULL, NULL, $3, $4)
    `, [
      `time_${crypto.randomBytes(6).toString('hex')}`, id,
      `Marked document as ${verification_status}${remarks ? `: ${remarks}` : ''}`,
      `${user.firstName} ${user.lastName}`
    ]);

    res.json({ success: true, message: `Document marked as ${verification_status}` });
  } catch (error) {
    console.error('[VERIFY ADM DOC ERROR]', error);
    res.status(500).json({ error: 'Failed to update document verification' });
  }
});

// Schedule Entrance Test
router.post('/applications/:id/tests', requireAuth, requirePermission('admissions.schedule_test'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { test_date, test_time, venue, subjects, max_marks = 100, remarks } = req.body;

    if (!test_date) {
      return res.status(400).json({ error: 'test_date is required' });
    }

    const testId = `test_app_${crypto.randomBytes(6).toString('hex')}`;
    await db.query(`
      INSERT INTO admission_tests (
        id, application_id, test_date, test_time, venue, subjects, max_marks, test_status, remarks, conducted_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Scheduled', $8, $9)
    `, [
      testId, id, test_date, test_time || '10:00 AM', venue || 'Examination Hall',
      subjects || 'Mathematics, Science & English', max_marks, remarks || null,
      `${user.firstName} ${user.lastName}`
    ]);

    // Auto update status to TEST_SCHEDULED if not already further
    await db.query(`
      UPDATE admission_applications
      SET application_status = 'TEST_SCHEDULED', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND application_status IN ('SUBMITTED', 'UNDER_REVIEW', 'DOCUMENT_VERIFICATION')
    `, [id]);

    await db.query(`
      INSERT INTO admission_timeline (id, application_id, action, previous_status, new_status, remarks, performed_by_name)
      VALUES ($1, $2, 'Entrance Test Scheduled', NULL, 'TEST_SCHEDULED', $3, $4)
    `, [
      `time_${crypto.randomBytes(6).toString('hex')}`, id,
      `Scheduled entrance test on ${test_date} at ${test_time || '10:00 AM'} in ${venue || 'Examination Hall'}`,
      `${user.firstName} ${user.lastName}`
    ]);

    res.json({ success: true, testId, message: 'Entrance test scheduled successfully' });
  } catch (error) {
    console.error('[SCHEDULE TEST ERROR]', error);
    res.status(500).json({ error: 'Failed to schedule entrance test' });
  }
});

// Update Entrance Test Marks & Status
router.patch('/applications/:id/tests/:testId', requireAuth, requirePermission('admissions.schedule_test'), async (req, res) => {
  try {
    const { id, testId } = req.params;
    const user = (req as any).user;
    const { marks_obtained, max_marks, test_status, remarks } = req.body;

    await db.query(`
      UPDATE admission_tests
      SET marks_obtained = COALESCE($1, marks_obtained),
          max_marks = COALESCE($2, max_marks),
          test_status = COALESCE($3, test_status),
          remarks = COALESCE($4, remarks)
      WHERE id = $5 AND application_id = $6
    `, [marks_obtained, max_marks, test_status, remarks, testId, id]);

    if (test_status && ['Passed', 'Attended', 'Failed'].includes(test_status)) {
      await db.query(`
        UPDATE admission_applications
        SET application_status = 'TEST_COMPLETED', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND application_status = 'TEST_SCHEDULED'
      `, [id]);
    }

    await db.query(`
      INSERT INTO admission_timeline (id, application_id, action, previous_status, new_status, remarks, performed_by_name)
      VALUES ($1, $2, 'Entrance Test Evaluated', NULL, NULL, $3, $4)
    `, [
      `time_${crypto.randomBytes(6).toString('hex')}`, id,
      `Marks recorded: ${marks_obtained ?? 'N/A'}/${max_marks ?? '100'} (Status: ${test_status})`,
      `${user.firstName} ${user.lastName}`
    ]);

    res.json({ success: true, message: 'Entrance test scores updated' });
  } catch (error) {
    console.error('[UPDATE TEST ERROR]', error);
    res.status(500).json({ error: 'Failed to update test record' });
  }
});

// Schedule Interview
router.post('/applications/:id/interviews', requireAuth, requirePermission('admissions.schedule_interview'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { interview_date, interview_time, interviewer_name, interview_mode = 'In-person', remarks } = req.body;

    if (!interview_date) {
      return res.status(400).json({ error: 'interview_date is required' });
    }

    const interviewId = `int_app_${crypto.randomBytes(6).toString('hex')}`;
    await db.query(`
      INSERT INTO admission_interviews (
        id, application_id, interview_date, interview_time, interviewer_name, interview_mode, status, recommendation, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, 'Scheduled', 'Pending', $7)
    `, [
      interviewId, id, interview_date, interview_time || '11:00 AM',
      interviewer_name || `${user.firstName} ${user.lastName}`, interview_mode, remarks || null
    ]);

    // Auto transition to INTERVIEW_SCHEDULED
    await db.query(`
      UPDATE admission_applications
      SET application_status = 'INTERVIEW_SCHEDULED', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND application_status IN ('SUBMITTED', 'UNDER_REVIEW', 'DOCUMENT_VERIFICATION', 'TEST_COMPLETED')
    `, [id]);

    await db.query(`
      INSERT INTO admission_timeline (id, application_id, action, previous_status, new_status, remarks, performed_by_name)
      VALUES ($1, $2, 'Interview Scheduled', NULL, 'INTERVIEW_SCHEDULED', $3, $4)
    `, [
      `time_${crypto.randomBytes(6).toString('hex')}`, id,
      `Scheduled ${interview_mode} interview on ${interview_date} at ${interview_time || '11:00 AM'} with ${interviewer_name || 'Committee'}`,
      `${user.firstName} ${user.lastName}`
    ]);

    res.json({ success: true, interviewId, message: 'Interview scheduled successfully' });
  } catch (error) {
    console.error('[SCHEDULE INTERVIEW ERROR]', error);
    res.status(500).json({ error: 'Failed to schedule interview' });
  }
});

// Update Interview Record
router.patch('/applications/:id/interviews/:interviewId', requireAuth, requirePermission('admissions.schedule_interview'), async (req, res) => {
  try {
    const { id, interviewId } = req.params;
    const user = (req as any).user;
    const { status, recommendation, remarks } = req.body;

    await db.query(`
      UPDATE admission_interviews
      SET status = COALESCE($1, status),
          recommendation = COALESCE($2, recommendation),
          remarks = COALESCE($3, remarks)
      WHERE id = $4 AND application_id = $5
    `, [status, recommendation, remarks, interviewId, id]);

    if (status === 'Completed') {
      await db.query(`
        UPDATE admission_applications
        SET application_status = 'INTERVIEW_COMPLETED', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND application_status = 'INTERVIEW_SCHEDULED'
      `, [id]);
    }

    await db.query(`
      INSERT INTO admission_timeline (id, application_id, action, previous_status, new_status, remarks, performed_by_name)
      VALUES ($1, $2, 'Interview Feedback Recorded', NULL, NULL, $3, $4)
    `, [
      `time_${crypto.randomBytes(6).toString('hex')}`, id,
      `Interview outcome: ${status} | Recommendation: ${recommendation}${remarks ? ` (${remarks})` : ''}`,
      `${user.firstName} ${user.lastName}`
    ]);

    res.json({ success: true, message: 'Interview evaluation saved' });
  } catch (error) {
    console.error('[UPDATE INTERVIEW ERROR]', error);
    res.status(500).json({ error: 'Failed to update interview evaluation' });
  }
});

// Add / Record Fee Payment
router.post('/applications/:id/fees', requireAuth, requirePermission('admissions.approve'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const {
      fee_type = 'Admission Fee',
      amount,
      payment_mode = 'Cash',
      transaction_ref = null,
      payment_status = 'Paid',
      receipt_number,
      payment_date = new Date().toISOString().split('T')[0],
      notes
    } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Fee amount is required' });
    }

    const generatedReceipt = receipt_number || `REC-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const feeId = `fee_app_${crypto.randomBytes(6).toString('hex')}`;

    await db.query(`
      INSERT INTO admission_fees (
        id, application_id, fee_type, amount, payment_mode, transaction_ref, payment_status, receipt_number, payment_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      feeId, id, fee_type, amount, payment_mode, transaction_ref,
      payment_status, generatedReceipt, payment_date, notes || null
    ]);

    await db.query(`
      INSERT INTO admission_timeline (id, application_id, action, previous_status, new_status, remarks, performed_by_name)
      VALUES ($1, $2, 'Fee Payment Recorded', NULL, NULL, $3, $4)
    `, [
      `time_${crypto.randomBytes(6).toString('hex')}`, id,
      `Recorded ${fee_type} of ₹${amount} (${payment_status}, Receipt: ${generatedReceipt})`,
      `${user.firstName} ${user.lastName}`
    ]);

    res.json({
      success: true,
      feeId,
      receiptNumber: generatedReceipt,
      message: 'Admission fee transaction recorded successfully'
    });
  } catch (error) {
    console.error('[RECORD FEE ERROR]', error);
    res.status(500).json({ error: 'Failed to record fee payment' });
  }
});

// ==========================================
// ADMISSION CONFIRMATION & STUDENT ENROLLMENT
// Automatically creates Student, Parent, and Enrollment records
// ==========================================
router.post('/applications/:id/confirm', requireAuth, requirePermission('admissions.confirm'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const {
      class_id,
      section_id,
      roll_number,
      admission_date = new Date().toISOString().split('T')[0],
      admission_number,
      receipt_number,
      remarks
    } = req.body;

    const appRes = await db.query('SELECT * FROM admission_applications WHERE id = $1', [id]);
    if (appRes.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    const app = appRes.rows[0] as any;

    if (app.application_status === 'CONFIRMED' && app.student_id) {
      return res.status(400).json({ error: 'This application has already been confirmed and enrolled into the student directory.' });
    }

    const targetClassId = class_id || app.applying_class_id;
    const targetSectionId = section_id || app.applying_section_id;

    if (!targetSectionId) {
      return res.status(400).json({ error: 'Please allocate a Section for the student enrollment.' });
    }

    // Verify section belongs to class
    const secCheck = await db.query('SELECT id, name FROM sections WHERE id = $1 AND class_id = $2', [targetSectionId, targetClassId]);
    if (secCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Selected section does not belong to the target class.' });
    }

    // Generate or use provided Admission Number
    const finalAdmissionNo = admission_number ? admission_number.trim() : await generateStudentAdmissionNumber(app.school_id);

    // Verify unique admission number in school
    const admNoCheck = await db.query('SELECT id FROM students WHERE school_id = $1 AND admission_number = $2', [app.school_id, finalAdmissionNo]);
    if (admNoCheck.rows.length > 0) {
      return res.status(400).json({ error: `Admission number ${finalAdmissionNo} already exists in this school. Please generate a unique one.` });
    }

    const studentId = `stu_${crypto.randomBytes(6).toString('hex')}`;
    const parentId = `par_${crypto.randomBytes(6).toString('hex')}`;
    const enrollmentId = `enr_${crypto.randomBytes(6).toString('hex')}`;

    // 1. Create Student Record
    await db.query(`
      INSERT INTO students (
        id, admission_number, registration_number, first_name, middle_name, last_name,
        date_of_birth, gender, blood_group, nationality, religion, category, aadhaar_number,
        mobile_number, email, address, city, district, state, pin_code,
        admission_date, school_id, session_id, class_id, section_id,
        roll_number, previous_school, student_status, remarks
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25,
        $26, $27, 'ACTIVE', $28
      )
    `, [
      studentId, finalAdmissionNo, app.application_number,
      app.first_name || app.student_name, app.middle_name || '', app.last_name || '',
      app.date_of_birth, app.gender, app.blood_group, app.nationality, app.religion, app.category, app.aadhaar_number,
      app.parent_mobile, app.parent_email, app.address, app.city, app.district, app.state, app.pin_code,
      admission_date, app.school_id, app.session_id, targetClassId, targetSectionId,
      roll_number || null, app.previous_school, remarks || `Admitted via Application ${app.application_number}`
    ]);

    // 2. Create Parent Record if Father or Mother or Guardian exists
    const primaryParentName = app.father_name || app.mother_name || app.guardian_name || `${app.student_name} Guardian`;
    const parentRelation = app.father_name ? 'Father' : (app.mother_name ? 'Mother' : 'Guardian');

    await db.query(`
      INSERT INTO parents (
        id, school_id, name, relationship_type, mobile_number, alternate_mobile,
        email, address, city, district, state, pin_code
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12
      )
    `, [
      parentId, app.school_id, primaryParentName, parentRelation,
      app.parent_mobile, app.alternate_mobile, app.parent_email,
      app.address, app.city, app.district, app.state, app.pin_code
    ]);

    // 3. Link Student & Parent
    await db.query(`
      INSERT INTO student_parents (
        id, student_id, parent_id, relationship, is_primary_guardian, can_receive_notifications, can_access_portal
      ) VALUES ($1, $2, $3, $4, true, true, true)
    `, [
      `sp_${studentId}_${parentId}`, studentId, parentId, parentRelation
    ]);

    // If mother is also present and father was primary, add mother as secondary guardian
    if (app.father_name && app.mother_name) {
      const motherId = `par_${crypto.randomBytes(6).toString('hex')}`;
      await db.query(`
        INSERT INTO parents (
          id, school_id, name, relationship_type, mobile_number, alternate_mobile,
          email, address, city, district, state, pin_code
        ) VALUES (
          $1, $2, $3, 'Mother', $4, $5,
          $6, $7, $8, $9, $10, $11
        )
      `, [
        motherId, app.school_id, app.mother_name,
        app.alternate_mobile || app.parent_mobile, null, app.parent_email,
        app.address, app.city, app.district, app.state, app.pin_code
      ]);

      await db.query(`
        INSERT INTO student_parents (
          id, student_id, parent_id, relationship, is_primary_guardian, can_receive_notifications, can_access_portal
        ) VALUES ($1, $2, $3, 'Mother', false, true, true)
      `, [`sp_${studentId}_${motherId}`, studentId, motherId]);
    }

    // 4. Create Student Enrollment
    await db.query(`
      INSERT INTO student_enrollments (
        id, student_id, school_id, session_id, class_id, section_id, roll_number, enrollment_date, status, remarks
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', $9
      )
    `, [
      enrollmentId, studentId, app.school_id, app.session_id, targetClassId, targetSectionId,
      roll_number || null, admission_date, `Enrolled via Admission ${app.application_number}`
    ]);

    // 5. Transfer verified documents to student_documents
    const docs = await db.query(`SELECT * FROM admission_documents WHERE application_id = $1`, [id]);
    for (const d of (docs.rows as any[])) {
      await db.query(`
        INSERT INTO student_documents (
          id, student_id, document_type, file_name, file_size, file_data, mime_type,
          uploaded_by, verification_status, remarks, verified_by, verified_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12
        )
      `, [
        `doc_stu_${crypto.randomBytes(6).toString('hex')}`, studentId, d.document_type,
        d.file_name, d.file_size, d.file_data, d.mime_type,
        d.uploaded_by, d.verification_status, d.remarks, d.verified_by, d.verified_at
      ]);
    }

    // 6. Record Fee receipt if passed
    if (receipt_number) {
      await db.query(`
        INSERT INTO admission_fees (
          id, application_id, fee_type, amount, payment_mode, payment_status, receipt_number, payment_date, notes
        ) VALUES (
          $1, $2, 'Admission Enrollment Fee', 12500.00, 'Online/Counter', 'Paid', $3, $4, 'Confirmed admission enrollment fee'
        )
      `, [`fee_enr_${crypto.randomBytes(6).toString('hex')}`, id, receipt_number, admission_date]);
    }

    // 7. Update Application status to CONFIRMED and link student_id
    await db.query(`
      UPDATE admission_applications
      SET application_status = 'CONFIRMED',
          student_id = $1,
          applying_section_id = $2,
          remarks = COALESCE($3, remarks),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [studentId, targetSectionId, remarks, id]);

    // 8. Add Timeline record
    await db.query(`
      INSERT INTO admission_timeline (id, application_id, action, previous_status, new_status, remarks, performed_by_name)
      VALUES ($1, $2, 'Admission Confirmed & Enrolled', $3, 'CONFIRMED', $4, $5)
    `, [
      `time_${crypto.randomBytes(6).toString('hex')}`, id,
      app.application_status,
      `Student profile created with Admission No: ${finalAdmissionNo}. Allocated to Section ${(secCheck.rows[0] as any)?.name}.`,
      `${user.firstName} ${user.lastName}`
    ]);

    await recordAuditLog({
      schoolId: app.school_id,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.roleName,
      action: 'CONFIRM_ADMISSION',
      module: 'Admissions',
      recordId: id,
      description: `Confirmed admission for ${app.student_name}. Created Student ID ${studentId} with Admission Number ${finalAdmissionNo}`,
      newValues: { studentId, admissionNumber: finalAdmissionNo, classId: targetClassId, sectionId: targetSectionId },
      req
    });

    res.json({
      success: true,
      studentId,
      admissionNumber: finalAdmissionNo,
      enrollmentId,
      message: `Admission successfully confirmed! Student record created with Admission No ${finalAdmissionNo}.`
    });
  } catch (error) {
    console.error('[CONFIRM ADMISSION ERROR]', error);
    res.status(500).json({ error: 'Failed to confirm admission and create student record' });
  }
});

// Admission Settings
router.get('/settings', requireAuth, requirePermission('admissions.view'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { schoolId } = req.query;

    const targetSchoolId = user.roleName === 'super_admin' ? (schoolId || user.schoolId) : user.schoolId;

    const result = await db.query(`
      SELECT * FROM admission_settings WHERE school_id = $1
    `, [targetSchoolId]);

    if (result.rows.length === 0) {
      // Return defaults
      return res.json({
        settings: {
          school_id: targetSchoolId,
          application_prefix: 'ADM',
          application_fee: 500,
          entrance_test_required: true,
          interview_required: true,
          online_admissions_open: true,
          instructions: 'Online admissions open for upcoming academic session.'
        }
      });
    }

    res.json({ settings: result.rows[0] });
  } catch (error) {
    console.error('[GET ADM SETTINGS ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch admission settings' });
  }
});

router.put('/settings', requireAuth, requirePermission('admissions.approve'), async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      school_id,
      application_prefix,
      application_fee,
      entrance_test_required,
      interview_required,
      online_admissions_open,
      instructions
    } = req.body;

    const targetSchoolId = user.roleName === 'super_admin' ? (school_id || user.schoolId) : user.schoolId;

    await db.query(`
      INSERT INTO admission_settings (
        id, school_id, application_prefix, application_fee, entrance_test_required,
        interview_required, online_admissions_open, instructions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (school_id) DO UPDATE SET
        application_prefix = EXCLUDED.application_prefix,
        application_fee = EXCLUDED.application_fee,
        entrance_test_required = EXCLUDED.entrance_test_required,
        interview_required = EXCLUDED.interview_required,
        online_admissions_open = EXCLUDED.online_admissions_open,
        instructions = EXCLUDED.instructions
    `, [
      `adm_set_${targetSchoolId}`, targetSchoolId,
      application_prefix || 'ADM', application_fee || 500,
      entrance_test_required ?? true, interview_required ?? true,
      online_admissions_open ?? true, instructions || ''
    ]);

    // Also sync school admission_prefix if relevant
    if (application_prefix) {
      await db.query('UPDATE schools SET admission_prefix = $1 WHERE id = $2', [application_prefix, targetSchoolId]);
    }

    res.json({ success: true, message: 'Admission configuration updated successfully' });
  } catch (error) {
    console.error('[UPDATE ADM SETTINGS ERROR]', error);
    res.status(500).json({ error: 'Failed to update admission settings' });
  }
});

export default router;
