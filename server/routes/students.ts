import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// GET Next Admission Number for a school
router.get('/next-admission-number', requireAuth, async (req, res) => {
  const { schoolId, sessionId } = req.query;

  if (!schoolId || typeof schoolId !== 'string') {
    return res.status(400).json({ error: 'School ID is required to generate admission number.' });
  }

  if (!checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied to this school branch.' });
  }

  try {
    let school: any = null;
    try {
      const res = await db.query(`SELECT id, code, admission_prefix FROM schools WHERE id = $1`, [schoolId]);
      if (res.rows.length > 0) school = res.rows[0];
    } catch {
      const res = await db.query(`SELECT id, code FROM schools WHERE id = $1`, [schoolId]);
      if (res.rows.length > 0) school = res.rows[0];
    }

    if (!school) {
      return res.status(404).json({ error: 'School not found.' });
    }

    const prefix = school.admission_prefix || school.code || 'SCH';

    // Get current year
    const currentYear = new Date().getFullYear();

    // Query highest admission number matching prefix-year-
    const pattern = `${prefix}-${currentYear}-%`;
    const maxRes = await db.query(`
      SELECT admission_number FROM students
      WHERE school_id = $1 AND admission_number LIKE $2
      ORDER BY admission_number DESC LIMIT 1
    `, [schoolId, pattern]);

    let seq = 1;
    if (maxRes.rows.length > 0) {
      const lastNumber = (maxRes.rows[0] as any).admission_number as string;
      const parts = lastNumber.split('-');
      if (parts.length >= 3) {
        const parsed = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(parsed)) {
          seq = parsed + 1;
        }
      }
    }

    const nextAdmissionNumber = `${prefix}-${currentYear}-${seq.toString().padStart(4, '0')}`;
    return res.json({
      nextAdmissionNumber,
      prefix,
      year: currentYear,
      seq
    });
  } catch (err: any) {
    console.error('[NEXT ADMISSION NUMBER ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to generate admission number.' });
  }
});

// GET All Students with Filtering & Search
router.get('/', requireAuth, requirePermission('students.view'), async (req, res) => {
  const {
    schoolId,
    sessionId,
    classId,
    sectionId,
    status,
    gender,
    category,
    search,
    page = '1',
    limit = '50'
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  try {
    let whereClauses: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    // School Scope
    if (schoolId && typeof schoolId === 'string') {
      if (!checkSchoolScope(req, schoolId)) {
        return res.status(403).json({ error: 'Access denied to this school branch.' });
      }
      whereClauses.push(`s.school_id = $${pIdx++}`);
      params.push(schoolId);
    } else if (req.user!.schoolId && req.user!.roleName !== 'super_admin' && !req.user!.permissions.includes('schools.switch')) {
      whereClauses.push(`s.school_id = $${pIdx++}`);
      params.push(req.user!.schoolId);
    }

    if (sessionId && typeof sessionId === 'string') {
      whereClauses.push(`s.session_id = $${pIdx++}`);
      params.push(sessionId);
    }

    if (classId && typeof classId === 'string') {
      whereClauses.push(`s.class_id = $${pIdx++}`);
      params.push(classId);
    }

    if (sectionId && typeof sectionId === 'string') {
      whereClauses.push(`s.section_id = $${pIdx++}`);
      params.push(sectionId);
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      whereClauses.push(`s.student_status = $${pIdx++}`);
      params.push(status);
    }

    if (gender && typeof gender === 'string' && gender !== 'ALL') {
      whereClauses.push(`s.gender = $${pIdx++}`);
      params.push(gender);
    }

    if (category && typeof category === 'string' && category !== 'ALL') {
      whereClauses.push(`s.category = $${pIdx++}`);
      params.push(category);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      whereClauses.push(`(
        LOWER(s.first_name) LIKE $${pIdx} OR
        LOWER(s.last_name) LIKE $${pIdx} OR
        LOWER(s.admission_number) LIKE $${pIdx} OR
        LOWER(COALESCE(s.registration_number, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(s.roll_number, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(s.mobile_number, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(s.email, '')) LIKE $${pIdx}
      )`);
      params.push(term);
      pIdx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count Total
    const countRes = await db.query(`
      SELECT count(*) as total
      FROM students s
      ${whereSql}
    `, params);
    const total = parseInt((countRes.rows[0] as any).total, 10);

    // Fetch Rows with Joined School, Session, Class, Section, and Primary Parent info
    const dataQuery = `
      SELECT 
        s.*,
        sch.name as school_name,
        sch.code as school_code,
        ses.name as session_name,
        c.name as class_name,
        c.numeric_grade,
        sec.name as section_name,
        (
          SELECT p.name 
          FROM student_parents sp
          JOIN parents p ON sp.parent_id = p.id
          WHERE sp.student_id = s.id AND sp.is_primary_guardian = true
          LIMIT 1
        ) as primary_parent_name,
        (
          SELECT p.mobile_number 
          FROM student_parents sp
          JOIN parents p ON sp.parent_id = p.id
          WHERE sp.student_id = s.id AND sp.is_primary_guardian = true
          LIMIT 1
        ) as primary_parent_mobile,
        (
          SELECT sp.relationship 
          FROM student_parents sp
          WHERE sp.student_id = s.id AND sp.is_primary_guardian = true
          LIMIT 1
        ) as primary_parent_relationship,
        (
          SELECT count(*) FROM student_documents sd WHERE sd.student_id = s.id
        ) as documents_count
      FROM students s
      JOIN schools sch ON s.school_id = sch.id
      JOIN academic_sessions ses ON s.session_id = ses.id
      JOIN classes c ON s.class_id = c.id
      JOIN sections sec ON s.section_id = sec.id
      ${whereSql}
      ORDER BY c.numeric_grade ASC, sec.name ASC, s.roll_number ASC, s.first_name ASC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;

    const dataRes = await db.query(dataQuery, [...params, limitNum, offset]);

    return res.json({
      students: dataRes.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err: any) {
    console.error('[GET STUDENTS ERROR]', err);
    return res.status(500).json({ error: 'Failed to retrieve students directory.' });
  }
});

// GET Single Student Detail
router.get('/:id', requireAuth, requirePermission('students.view'), async (req, res) => {
  const { id } = req.params;

  try {
    const studentRes = await db.query(`
      SELECT 
        s.*,
        sch.name as school_name,
        sch.code as school_code,
        ses.name as session_name,
        c.name as class_name,
        c.numeric_grade,
        sec.name as section_name,
        sec.room_number as room_number,
        sec.class_teacher_name as class_teacher_name
      FROM students s
      JOIN schools sch ON s.school_id = sch.id
      JOIN academic_sessions ses ON s.session_id = ses.id
      JOIN classes c ON s.class_id = c.id
      JOIN sections sec ON s.section_id = sec.id
      WHERE s.id = $1
    `, [id]);

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    const student = studentRes.rows[0] as any;

    if (!checkSchoolScope(req, student.school_id)) {
      return res.status(403).json({ error: 'Access denied to this student record.' });
    }

    // Fetch Linked Parents
    const parentsRes = await db.query(`
      SELECT 
        sp.id as relation_id,
        sp.relationship,
        sp.is_primary_guardian,
        sp.can_receive_notifications,
        sp.can_access_portal,
        p.id as id,
        p.id as parent_id,
        p.name as parent_name,
        p.mobile_number as parent_mobile,
        p.alternate_mobile as parent_alternate_mobile,
        p.email as parent_email,
        p.occupation as parent_occupation,
        p.address as parent_address,
        p.city as parent_city,
        p.state as parent_state,
        p.pin_code as parent_pin_code
      FROM student_parents sp
      JOIN parents p ON sp.parent_id = p.id
      WHERE sp.student_id = $1
      ORDER BY sp.is_primary_guardian DESC, p.name ASC
    `, [id]);

    // Fetch Documents
    const docsRes = await db.query(`
      SELECT * FROM student_documents
      WHERE student_id = $1
      ORDER BY upload_date DESC
    `, [id]);

    // Fetch Enrollment History
    const enrollRes = await db.query(`
      SELECT 
        se.*,
        sch.name as school_name,
        ses.name as session_name,
        c.name as class_name,
        sec.name as section_name
      FROM student_enrollments se
      JOIN schools sch ON se.school_id = sch.id
      JOIN academic_sessions ses ON se.session_id = ses.id
      JOIN classes c ON se.class_id = c.id
      JOIN sections sec ON se.section_id = sec.id
      WHERE se.student_id = $1
      ORDER BY se.enrollment_date DESC, se.created_at DESC
    `, [id]);

    return res.json({
      student: {
        ...student,
        parents: parentsRes.rows,
        documents: docsRes.rows,
        enrollments: enrollRes.rows
      },
      parents: parentsRes.rows,
      documents: docsRes.rows,
      enrollments: enrollRes.rows
    });
  } catch (err: any) {
    console.error('[GET STUDENT DETAIL ERROR]', err);
    return res.status(500).json({ error: 'Failed to retrieve student details.' });
  }
});

// POST Register / Add New Student
router.post('/', requireAuth, requirePermission('students.create'), async (req, res) => {
  const {
    school_id,
    session_id,
    class_id,
    section_id,
    admission_number,
    registration_number,
    first_name,
    middle_name,
    last_name,
    date_of_birth,
    gender,
    blood_group,
    nationality = 'Indian',
    religion,
    category = 'General',
    aadhaar_number,
    profile_photo,
    mobile_number,
    email,
    address,
    city,
    district,
    state,
    pin_code,
    admission_date,
    roll_number,
    previous_school,
    student_status = 'ACTIVE',
    remarks,
    primary_parent,
    secondary_parent
  } = req.body;

  // Validate Required Fields
  if (!school_id || !session_id || !class_id || !section_id) {
    return res.status(400).json({ error: 'School, Session, Class, and Section are mandatory.' });
  }

  if (!first_name?.trim() || !last_name?.trim()) {
    return res.status(400).json({ error: 'First name and Last name are mandatory.' });
  }

  if (!date_of_birth || !gender) {
    return res.status(400).json({ error: 'Date of birth and gender are mandatory.' });
  }

  if (!checkSchoolScope(req, school_id)) {
    return res.status(403).json({ error: 'Access denied to register student for this school.' });
  }

  try {
    // Determine Admission Number
    let finalAdmissionNumber = admission_number?.trim();

    if (!finalAdmissionNumber) {
      // Auto-generate
      const schoolRes = await db.query(`SELECT id, code, admission_prefix FROM schools WHERE id = $1`, [school_id]);
      const school = schoolRes.rows[0] as any;
      const prefix = school?.admission_prefix || school?.code || 'SCH';
      const year = new Date().getFullYear();
      const pattern = `${prefix}-${year}-%`;

      const maxRes = await db.query(`
        SELECT admission_number FROM students
        WHERE school_id = $1 AND admission_number LIKE $2
        ORDER BY admission_number DESC LIMIT 1
      `, [school_id, pattern]);

      let seq = 1;
      if (maxRes.rows.length > 0) {
        const lastNumber = (maxRes.rows[0] as any).admission_number as string;
        const parts = lastNumber.split('-');
        if (parts.length >= 3) {
          const parsed = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(parsed)) seq = parsed + 1;
        }
      }
      finalAdmissionNumber = `${prefix}-${year}-${seq.toString().padStart(4, '0')}`;
    } else {
      // Check Uniqueness in School
      const checkRes = await db.query(`
        SELECT id FROM students WHERE school_id = $1 AND admission_number = $2
      `, [school_id, finalAdmissionNumber]);

      if (checkRes.rows.length > 0) {
        return res.status(409).json({ error: `Admission number '${finalAdmissionNumber}' already exists in this school.` });
      }
    }

    const studentId = `stu_${crypto.randomBytes(8).toString('hex')}`;
    const admDate = admission_date || new Date().toISOString().split('T')[0];

    // Insert Student
    await db.query(`
      INSERT INTO students (
        id, admission_number, registration_number, first_name, middle_name, last_name,
        date_of_birth, gender, blood_group, nationality, religion, category, aadhaar_number,
        profile_photo, mobile_number, email, address, city, district, state, pin_code,
        admission_date, school_id, session_id, class_id, section_id, roll_number,
        previous_school, student_status, remarks
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21,
        $22, $23, $24, $25, $26, $27,
        $28, $29, $30
      )
    `, [
      studentId, finalAdmissionNumber, registration_number || null, first_name.trim(), middle_name?.trim() || null, last_name.trim(),
      date_of_birth, gender, blood_group || null, nationality || 'Indian', religion || null, category || 'General', aadhaar_number || null,
      profile_photo || null, mobile_number || null, email || null, address || null, city || null, district || null, state || null, pin_code || null,
      admDate, school_id, session_id, class_id, section_id, roll_number || null,
      previous_school || null, student_status, remarks || null
    ]);

    // Handle Primary Parent if provided
    if (primary_parent && primary_parent.name?.trim()) {
      const parentId = `par_${crypto.randomBytes(8).toString('hex')}`;
      await db.query(`
        INSERT INTO parents (
          id, school_id, name, relationship_type, mobile_number, alternate_mobile,
          email, occupation, address, city, district, state, pin_code
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13
        )
      `, [
        parentId, school_id, primary_parent.name.trim(), primary_parent.relationship || 'Father',
        primary_parent.mobile?.trim() || mobile_number || 'N/A', primary_parent.alternate_mobile || null,
        primary_parent.email || null, primary_parent.occupation || null, primary_parent.address || address || null,
        city || null, district || null, state || null, pin_code || null
      ]);

      await db.query(`
        INSERT INTO student_parents (
          id, student_id, parent_id, relationship, is_primary_guardian, can_receive_notifications, can_access_portal
        ) VALUES (
          $1, $2, $3, $4, true, true, true
        )
      `, [
        `sp_${studentId}_${parentId}`, studentId, parentId, primary_parent.relationship || 'Father'
      ]);
    }

    // Handle Secondary Parent if provided
    if (secondary_parent && secondary_parent.name?.trim()) {
      const secParentId = `par_${crypto.randomBytes(8).toString('hex')}`;
      await db.query(`
        INSERT INTO parents (
          id, school_id, name, relationship_type, mobile_number, alternate_mobile,
          email, occupation, address, city, district, state, pin_code
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13
        )
      `, [
        secParentId, school_id, secondary_parent.name.trim(), secondary_parent.relationship || 'Mother',
        secondary_parent.mobile?.trim() || 'N/A', secondary_parent.alternate_mobile || null,
        secondary_parent.email || null, secondary_parent.occupation || null, secondary_parent.address || address || null,
        city || null, district || null, state || null, pin_code || null
      ]);

      await db.query(`
        INSERT INTO student_parents (
          id, student_id, parent_id, relationship, is_primary_guardian, can_receive_notifications, can_access_portal
        ) VALUES (
          $1, $2, $3, $4, false, true, true
        )
      `, [
        `sp_${studentId}_${secParentId}`, studentId, secParentId, secondary_parent.relationship || 'Mother'
      ]);
    }

    // Handle existing parent linking if parent_id provided
    if (req.body.parent_id) {
      await db.query(`
        INSERT INTO student_parents (
          id, student_id, parent_id, relationship, is_primary_guardian, can_receive_notifications, can_access_portal
        ) VALUES (
          $1, $2, $3, $4, $5, true, true
        )
        ON CONFLICT (student_id, parent_id) DO NOTHING
      `, [
        `sp_${studentId}_${req.body.parent_id}`,
        studentId,
        req.body.parent_id,
        req.body.relationship || 'Father',
        req.body.is_primary_guardian !== undefined ? req.body.is_primary_guardian : true
      ]);
    }

    // Create Initial Enrollment record
    await db.query(`
      INSERT INTO student_enrollments (
        id, student_id, school_id, session_id, class_id, section_id, roll_number, enrollment_date, status, remarks
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', 'Initial admission enrollment'
      )
    `, [
      `enr_${studentId}_init`, studentId, school_id, session_id, class_id, section_id, roll_number || null, admDate
    ]);

    await recordAuditLog({
      req,
      schoolId: school_id,
      action: 'STUDENT_CREATE',
      module: 'STUDENTS',
      recordId: studentId,
      description: `Registered student ${first_name} ${last_name} (Adm: ${finalAdmissionNumber})`,
      newValues: { admission_number: finalAdmissionNumber, class_id, section_id, student_status }
    });

    return res.status(201).json({
      success: true,
      studentId,
      admissionNumber: finalAdmissionNumber,
      message: 'Student admitted and enrolled successfully.'
    });
  } catch (err: any) {
    console.error('[STUDENT REGISTRATION ERROR]', err);
    return res.status(500).json({ error: 'Failed to register student record.' });
  }
});

// PUT Update Student
router.put('/:id', requireAuth, requirePermission('students.edit'), async (req, res) => {
  const { id } = req.params;

  try {
    const existingRes = await db.query(`SELECT * FROM students WHERE id = $1`, [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const currentStudent = existingRes.rows[0] as any;
    if (!checkSchoolScope(req, currentStudent.school_id)) {
      return res.status(403).json({ error: 'Access denied to modify this student record.' });
    }

    const {
      registration_number,
      first_name,
      middle_name,
      last_name,
      date_of_birth,
      gender,
      blood_group,
      nationality,
      religion,
      category,
      aadhaar_number,
      profile_photo,
      mobile_number,
      email,
      address,
      city,
      district,
      state,
      pin_code,
      roll_number,
      previous_school,
      student_status,
      remarks,
      class_id,
      section_id
    } = req.body;

    await db.query(`
      UPDATE students SET
        registration_number = COALESCE($1, registration_number),
        first_name = COALESCE($2, first_name),
        middle_name = COALESCE($3, middle_name),
        last_name = COALESCE($4, last_name),
        date_of_birth = COALESCE($5, date_of_birth),
        gender = COALESCE($6, gender),
        blood_group = COALESCE($7, blood_group),
        nationality = COALESCE($8, nationality),
        religion = COALESCE($9, religion),
        category = COALESCE($10, category),
        aadhaar_number = COALESCE($11, aadhaar_number),
        profile_photo = COALESCE($12, profile_photo),
        mobile_number = COALESCE($13, mobile_number),
        email = COALESCE($14, email),
        address = COALESCE($15, address),
        city = COALESCE($16, city),
        district = COALESCE($17, district),
        state = COALESCE($18, state),
        pin_code = COALESCE($19, pin_code),
        roll_number = COALESCE($20, roll_number),
        previous_school = COALESCE($21, previous_school),
        student_status = COALESCE($22, student_status),
        remarks = COALESCE($23, remarks),
        class_id = COALESCE($24, class_id),
        section_id = COALESCE($25, section_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $26
    `, [
      registration_number, first_name, middle_name, last_name, date_of_birth,
      gender, blood_group, nationality, religion, category,
      aadhaar_number, profile_photo, mobile_number, email, address,
      city, district, state, pin_code, roll_number,
      previous_school, student_status, remarks, class_id, section_id,
      id
    ]);

    await recordAuditLog({
      req,
      schoolId: currentStudent.school_id,
      action: 'STUDENT_UPDATE',
      module: 'STUDENTS',
      recordId: id,
      description: `Updated student record for ${currentStudent.first_name} ${currentStudent.last_name} (${currentStudent.admission_number})`,
      oldValues: { status: currentStudent.student_status, class: currentStudent.class_id, section: currentStudent.section_id },
      newValues: { status: student_status, class: class_id, section: section_id }
    });

    return res.json({ success: true, message: 'Student updated successfully.' });
  } catch (err: any) {
    console.error('[UPDATE STUDENT ERROR]', err);
    return res.status(500).json({ error: 'Failed to update student record.' });
  }
});

// DELETE Student
router.delete('/:id', requireAuth, requirePermission('students.delete'), async (req, res) => {
  const { id } = req.params;

  try {
    const existingRes = await db.query(`SELECT * FROM students WHERE id = $1`, [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const student = existingRes.rows[0] as any;
    if (!checkSchoolScope(req, student.school_id)) {
      return res.status(403).json({ error: 'Access denied to delete this student record.' });
    }

    await db.query(`DELETE FROM students WHERE id = $1`, [id]);

    await recordAuditLog({
      req,
      schoolId: student.school_id,
      action: 'STUDENT_DELETE',
      module: 'STUDENTS',
      recordId: id,
      description: `Deleted student ${student.first_name} ${student.last_name} (${student.admission_number})`
    });

    return res.json({ success: true, message: 'Student deleted successfully.' });
  } catch (err: any) {
    console.error('[DELETE STUDENT ERROR]', err);
    return res.status(500).json({ error: 'Failed to delete student record.' });
  }
});

// POST Upload Student Document
router.post('/:id/documents', requireAuth, requirePermission('documents.upload'), async (req, res) => {
  const { id } = req.params;
  const { document_type, file_name, file_size, file_data, mime_type, remarks } = req.body;

  if (!document_type || !file_name || !file_data) {
    return res.status(400).json({ error: 'Document type, file name, and file data are required.' });
  }

  try {
    const studentRes = await db.query(`SELECT school_id, first_name, last_name FROM students WHERE id = $1`, [id]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const student = studentRes.rows[0] as any;
    if (!checkSchoolScope(req, student.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const docId = `doc_${crypto.randomBytes(8).toString('hex')}`;
    const uploader = req.user ? `${req.user.firstName} ${req.user.lastName}` : 'System User';

    await db.query(`
      INSERT INTO student_documents (
        id, student_id, document_type, file_name, file_size, file_data, mime_type,
        uploaded_by, verification_status, remarks
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, 'Pending', $9
      )
    `, [
      docId, id, document_type, file_name, file_size || file_data.length, file_data,
      mime_type || 'application/octet-stream', uploader, remarks || null
    ]);

    await recordAuditLog({
      req,
      schoolId: student.school_id,
      action: 'DOCUMENT_UPLOAD',
      module: 'DOCUMENTS',
      recordId: docId,
      description: `Uploaded document '${document_type}' for ${student.first_name} ${student.last_name}`
    });

    return res.status(201).json({ success: true, documentId: docId, message: 'Document uploaded successfully.' });
  } catch (err: any) {
    console.error('[UPLOAD DOCUMENT ERROR]', err);
    return res.status(500).json({ error: 'Failed to upload document.' });
  }
});

// PUT Verify Student Document
router.put('/:id/documents/:docId/verify', requireAuth, requirePermission('documents.verify'), async (req, res) => {
  const { id, docId } = req.params;
  const { verification_status, remarks } = req.body;

  if (!['Verified', 'Rejected', 'Pending'].includes(verification_status)) {
    return res.status(400).json({ error: "Invalid status. Must be 'Verified', 'Rejected', or 'Pending'." });
  }

  try {
    const docRes = await db.query(`
      SELECT d.*, s.school_id, s.first_name, s.last_name
      FROM student_documents d
      JOIN students s ON d.student_id = s.id
      WHERE d.id = $1 AND d.student_id = $2
    `, [docId, id]);

    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const doc = docRes.rows[0] as any;
    if (!checkSchoolScope(req, doc.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const verifier = req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Administrator';

    await db.query(`
      UPDATE student_documents SET
        verification_status = $1,
        remarks = COALESCE($2, remarks),
        verified_by = $3,
        verified_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [verification_status, remarks, verifier, docId]);

    await recordAuditLog({
      req,
      schoolId: doc.school_id,
      action: 'DOCUMENT_VERIFY',
      module: 'DOCUMENTS',
      recordId: docId,
      description: `Updated verification of '${doc.document_type}' for ${doc.first_name} ${doc.last_name} to ${verification_status}`
    });

    return res.json({ success: true, message: `Document status updated to ${verification_status}.` });
  } catch (err: any) {
    console.error('[VERIFY DOCUMENT ERROR]', err);
    return res.status(500).json({ error: 'Failed to verify document.' });
  }
});

// DELETE Student Document
router.delete('/:id/documents/:docId', requireAuth, requirePermission('documents.upload'), async (req, res) => {
  const { id, docId } = req.params;

  try {
    const docRes = await db.query(`
      SELECT d.*, s.school_id
      FROM student_documents d
      JOIN students s ON d.student_id = s.id
      WHERE d.id = $1 AND d.student_id = $2
    `, [docId, id]);

    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const doc = docRes.rows[0] as any;
    if (!checkSchoolScope(req, doc.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    await db.query(`DELETE FROM student_documents WHERE id = $1`, [docId]);

    await recordAuditLog({
      req,
      schoolId: doc.school_id,
      action: 'DOCUMENT_DELETE',
      module: 'DOCUMENTS',
      recordId: docId,
      description: `Deleted document '${doc.document_type}' for student ${id}`
    });

    return res.json({ success: true, message: 'Document removed successfully.' });
  } catch (err: any) {
    console.error('[DELETE DOCUMENT ERROR]', err);
    return res.status(500).json({ error: 'Failed to remove document.' });
  }
});

// POST Batch Student Promotion / Rollover
router.post('/promote', requireAuth, requirePermission('students.promote'), async (req, res) => {
  const { promotions } = req.body;

  if (!Array.isArray(promotions) || promotions.length === 0) {
    return res.status(400).json({ error: 'Promotions array is required.' });
  }

  try {
    let successCount = 0;
    const now = new Date().toISOString().split('T')[0];

    for (const item of promotions) {
      const { student_id, action, target_session_id, target_class_id, target_section_id, target_roll_number } = item;

      const stuRes = await db.query(`SELECT * FROM students WHERE id = $1`, [student_id]);
      if (stuRes.rows.length === 0) continue;

      const student = stuRes.rows[0] as any;
      if (!checkSchoolScope(req, student.school_id)) continue;

      if (action === 'PROMOTE') {
        if (!target_session_id || !target_class_id || !target_section_id) {
          continue;
        }

        // 1. Update Student
        await db.query(`
          UPDATE students SET
            session_id = $1,
            class_id = $2,
            section_id = $3,
            roll_number = COALESCE($4, roll_number),
            student_status = 'ACTIVE',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
        `, [target_session_id, target_class_id, target_section_id, target_roll_number || null, student_id]);

        // 2. Add New Enrollment Record
        const enrId = `enr_${student_id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        await db.query(`
          INSERT INTO student_enrollments (
            id, student_id, school_id, session_id, class_id, section_id, roll_number, enrollment_date, status, remarks
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', 'Promoted from previous session'
          )
        `, [
          enrId, student_id, student.school_id, target_session_id, target_class_id, target_section_id,
          target_roll_number || student.roll_number, now
        ]);

        successCount++;
      } else if (action === 'RETAIN') {
        if (!target_session_id) continue;

        await db.query(`
          UPDATE students SET
            session_id = $1,
            roll_number = COALESCE($2, roll_number),
            student_status = 'ACTIVE',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [target_session_id, target_roll_number || null, student_id]);

        const enrId = `enr_${student_id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        await db.query(`
          INSERT INTO student_enrollments (
            id, student_id, school_id, session_id, class_id, section_id, roll_number, enrollment_date, status, remarks
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, 'RETAINED', 'Retained in same class'
          )
        `, [
          enrId, student_id, student.school_id, target_session_id, student.class_id, student.section_id,
          target_roll_number || student.roll_number, now
        ]);

        successCount++;
      } else if (action === 'GRADUATED') {
        await db.query(`
          UPDATE students SET
            student_status = 'GRADUATED',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [student_id]);

        successCount++;
      } else if (action === 'WITHDRAWN') {
        await db.query(`
          UPDATE students SET
            student_status = 'WITHDRAWN',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [student_id]);

        successCount++;
      }
    }

    await recordAuditLog({
      req,
      action: 'STUDENTS_PROMOTED',
      module: 'STUDENTS',
      description: `Executed academic promotion/rollover for ${successCount} students.`
    });

    return res.json({ success: true, processedCount: successCount });
  } catch (err: any) {
    console.error('[PROMOTION ERROR]', err);
    return res.status(500).json({ error: 'Failed to process student promotions.' });
  }
});

export default router;
