import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// ==========================================
// 1. KPI STATS & OVERVIEW
// ==========================================
router.get('/stats', requireAuth, requirePermission('exams.reports.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const examsCount: any = await db.query(`
      SELECT 
        count(*) as total_exams,
        count(*) FILTER (WHERE status = 'SCHEDULED' OR status = 'ONGOING') as active_exams,
        count(*) FILTER (WHERE results_published = true) as published_exams
      FROM examinations
      WHERE school_id = $1
    `, [schoolId]);

    const schedulesCount: any = await db.query(`
      SELECT count(*) as total_schedules FROM examination_schedules WHERE school_id = $1
    `, [schoolId]);

    const marksCount: any = await db.query(`
      SELECT count(*) as evaluated_marks FROM student_marks WHERE school_id = $1
    `, [schoolId]);

    const resultsCount: any = await db.query(`
      SELECT 
        count(*) as total_results,
        count(*) FILTER (WHERE result_status = 'PASSED') as passed_results,
        ROUND(AVG(overall_percentage), 2) as avg_percentage
      FROM student_exam_results
      WHERE school_id = $1
    `, [schoolId]);

    const totalRes = Number(resultsCount.rows[0]?.total_results || 0);
    const passRes = Number(resultsCount.rows[0]?.passed_results || 0);
    const passRate = totalRes > 0 ? Number(((passRes / totalRes) * 100).toFixed(1)) : 100.0;

    return res.json({
      stats: {
        totalExams: Number(examsCount.rows[0]?.total_exams || 0),
        activeExams: Number(examsCount.rows[0]?.active_exams || 0),
        publishedExams: Number(examsCount.rows[0]?.published_exams || 0),
        totalSchedules: Number(schedulesCount.rows[0]?.total_schedules || 0),
        evaluatedMarks: Number(marksCount.rows[0]?.evaluated_marks || 0),
        totalResults: totalRes,
        passRate,
        averagePercentage: Number(resultsCount.rows[0]?.avg_percentage || 0)
      }
    });
  } catch (err: any) {
    console.error('[EXAM STATS ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch exam statistics.' });
  }
});

// ==========================================
// 2. EXAMINATION TYPES
// ==========================================
router.get('/types', requireAuth, async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const result: any = await db.query(`
      SELECT * FROM examination_types
      WHERE school_id = $1
      ORDER BY contributes_to_final DESC, default_weightage DESC, name ASC
    `, [schoolId]);

    return res.json({ types: result.rows });
  } catch (err: any) {
    console.error('[EXAM TYPES ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to load exam types.' });
  }
});

router.post('/types', requireAuth, requirePermission('exams.types.manage'), async (req, res) => {
  const { schoolId, name, code, description, contributesToFinal, defaultWeightage } = req.body;
  const targetSchoolId = schoolId || req.user!.schoolId;

  if (!targetSchoolId || !checkSchoolScope(req, targetSchoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (!name || !code) {
    return res.status(400).json({ error: 'Name and code are required.' });
  }

  try {
    const id = `extype_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(`
      INSERT INTO examination_types (
        id, school_id, name, code, description, contributes_to_final, default_weightage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      id,
      targetSchoolId,
      name.trim(),
      code.trim().toUpperCase(),
      description || null,
      contributesToFinal !== false,
      defaultWeightage ? Number(defaultWeightage) : 100.0
    ]);

    await recordAuditLog({
      schoolId: targetSchoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'CREATE',
      module: 'EXAMINATIONS',
      recordId: id,
      description: `Created examination type: ${name} (${code})`,
      req
    });

    return res.status(201).json({ success: true, id, message: 'Examination type created successfully.' });
  } catch (err: any) {
    console.error('[CREATE EXAM TYPE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to create exam type.' });
  }
});

// ==========================================
// 3. GRADING SCALES
// ==========================================
router.get('/grading-scales', requireAuth, async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const scalesRes: any = await db.query(`
      SELECT * FROM grading_scales
      WHERE school_id = $1
      ORDER BY is_default DESC, name ASC
    `, [schoolId]);

    const scales = scalesRes.rows as any[];
    for (const scale of scales) {
      const tiersRes: any = await db.query(`
        SELECT * FROM grading_scale_tiers
        WHERE scale_id = $1
        ORDER BY sort_order ASC, min_percentage DESC
      `, [scale.id]);
      scale.tiers = tiersRes.rows;
    }

    return res.json({ scales });
  } catch (err: any) {
    console.error('[GRADING SCALES ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to load grading scales.' });
  }
});

// ==========================================
// 4. EXAMINATIONS LIST & CRUD
// ==========================================
router.get('/', requireAuth, async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const sessionId = req.query.sessionId as string;
  const status = req.query.status as string;

  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    let query = `
      SELECT 
        e.*,
        t.name as type_name,
        t.code as type_code,
        s.name as session_name,
        (SELECT count(*) FROM examination_schedules es WHERE es.examination_id = e.id) as schedule_count,
        (SELECT count(*) FROM examination_classes ec WHERE ec.examination_id = e.id) as class_count,
        (SELECT count(*) FROM student_exam_results ser WHERE ser.examination_id = e.id) as result_count
      FROM examinations e
      JOIN examination_types t ON e.type_id = t.id
      JOIN academic_sessions s ON e.session_id = s.id
      WHERE e.school_id = $1
    `;
    const params: any[] = [schoolId];

    if (sessionId) {
      params.push(sessionId);
      query += ` AND e.session_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND e.status = $${params.length}`;
    }

    query += ` ORDER BY e.start_date DESC, e.created_at DESC`;

    const result: any = await db.query(query, params);
    return res.json({ examinations: result.rows });
  } catch (err: any) {
    console.error('[LIST EXAMINATIONS ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to list examinations.' });
  }
});

router.post('/', requireAuth, requirePermission('exams.schedule.manage'), async (req, res) => {
  const {
    schoolId,
    sessionId,
    typeId,
    name,
    code,
    description,
    startDate,
    endDate,
    weightage,
    isTermExam,
    status,
    classIds
  } = req.body;

  const targetSchoolId = schoolId || req.body.school_id || req.user!.schoolId;
  const targetSessionId = sessionId || req.body.session_id;
  const targetStartDate = startDate || req.body.start_date;
  const targetEndDate = endDate || req.body.end_date;
  let targetTypeId = typeId || req.body.type_id;

  if (!targetSchoolId || !checkSchoolScope(req, targetSchoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  // Auto-resolve typeId if missing
  if (!targetTypeId) {
    const tRes = await db.query(`SELECT id FROM examination_types WHERE school_id = $1 LIMIT 1`, [targetSchoolId]);
    targetTypeId = (tRes.rows[0] as any)?.id || 'type_term';
  }

  const finalCode = (code || req.body.code || `EX_${Date.now().toString().slice(-6)}`).trim().toUpperCase();

  if (!targetSessionId || !name || !targetStartDate || !targetEndDate) {
    return res.status(400).json({ error: 'Session, Name, Start Date, and End Date are required.' });
  }

  try {
    const examId = `exam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await db.query(`
      INSERT INTO examinations (
        id, school_id, session_id, type_id, name, code, description,
        start_date, end_date, weightage, is_term_exam, status,
        timetable_published, results_published, created_by_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, false, $13)
    `, [
      examId,
      targetSchoolId,
      targetSessionId,
      targetTypeId,
      name.trim(),
      finalCode,
      description || null,
      targetStartDate,
      targetEndDate,
      weightage ? Number(weightage) : 100.0,
      isTermExam !== false,
      status || 'SCHEDULED',
      req.user!.id
    ]);

    // Link classes
    if (Array.isArray(classIds) && classIds.length > 0) {
      for (const clsId of classIds) {
        const ecId = `excls_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await db.query(`
          INSERT INTO examination_classes (id, examination_id, class_id, section_ids)
          VALUES ($1, $2, $3, '[]')
          ON CONFLICT (examination_id, class_id) DO NOTHING
        `, [ecId, examId, clsId]);
      }
    }

    await recordAuditLog({
      schoolId: targetSchoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'CREATE',
      module: 'EXAMINATIONS',
      recordId: examId,
      description: `Created examination: ${name} (${code})`,
      req
    });

    return res.status(201).json({ success: true, id: examId, message: 'Examination created successfully.' });
  } catch (err: any) {
    console.error('[CREATE EXAM ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to create examination.' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const examRes: any = await db.query(`
      SELECT 
        e.*,
        t.name as type_name,
        t.code as type_code,
        s.name as session_name
      FROM examinations e
      JOIN examination_types t ON e.type_id = t.id
      JOIN academic_sessions s ON e.session_id = s.id
      WHERE e.id = $1
    `, [id]);

    if (examRes.rows.length === 0) {
      return res.status(404).json({ error: 'Examination not found.' });
    }
    const exam: any = examRes.rows[0];
    if (!checkSchoolScope(req, exam.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const classesRes: any = await db.query(`
      SELECT ec.*, c.name as class_name
      FROM examination_classes ec
      JOIN classes c ON ec.class_id = c.id
      WHERE ec.examination_id = $1
      ORDER BY c.grade_order ASC, c.name ASC
    `, [id]);
    exam.classes = classesRes.rows;

    return res.json({ examination: exam });
  } catch (err: any) {
    console.error('[GET EXAM ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to get exam details.' });
  }
});

// Toggle publish timetable
router.patch('/:id/publish-timetable', requireAuth, requirePermission('exams.schedule.manage'), async (req, res) => {
  const { id } = req.params;
  const { publish } = req.body;

  try {
    const examRes: any = await db.query(`SELECT * FROM examinations WHERE id = $1`, [id]);
    if (examRes.rows.length === 0) return res.status(404).json({ error: 'Exam not found.' });
    const exam: any = examRes.rows[0];
    if (!checkSchoolScope(req, exam.school_id)) return res.status(403).json({ error: 'Access denied.' });

    const isPublished = Boolean(publish);
    await db.query(`UPDATE examinations SET timetable_published = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [isPublished, id]);

    await recordAuditLog({
      schoolId: exam.school_id,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: isPublished ? 'PUBLISH_TIMETABLE' : 'UNPUBLISH_TIMETABLE',
      module: 'EXAMINATIONS',
      recordId: id,
      description: `${isPublished ? 'Published' : 'Withdrew'} timetable for exam: ${exam.name}`,
      req
    });

    return res.json({ success: true, timetablePublished: isPublished });
  } catch (err: any) {
    console.error('[TOGGLE TIMETABLE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to toggle timetable.' });
  }
});

// Toggle publish results
router.patch('/:id/publish-results', requireAuth, requirePermission('exams.results.publish'), async (req, res) => {
  const { id } = req.params;
  const { publish } = req.body;

  try {
    const examRes: any = await db.query(`SELECT * FROM examinations WHERE id = $1`, [id]);
    if (examRes.rows.length === 0) return res.status(404).json({ error: 'Exam not found.' });
    const exam: any = examRes.rows[0];
    if (!checkSchoolScope(req, exam.school_id)) return res.status(403).json({ error: 'Access denied.' });

    const isPublished = publish !== undefined ? Boolean(publish) : true;
    const pubTimestamp = isPublished ? new Date().toISOString() : null;
    const pubUser = isPublished ? req.user!.username : null;
    const pubUserId = isPublished ? req.user!.id : null;

    await db.query(`
      UPDATE examinations 
      SET results_published = $1,
          results_published_at = $2,
          results_published_by_id = $3,
          results_published_by_name = $4,
          status = CASE WHEN $1 THEN 'PUBLISHED' ELSE 'COMPLETED' END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [isPublished, pubTimestamp, pubUserId, pubUser, id]);

    // Also update student results table
    await db.query(`
      UPDATE student_exam_results 
      SET is_published = $1,
          published_at = $2
      WHERE examination_id = $3
    `, [isPublished, pubTimestamp, id]);

    await recordAuditLog({
      schoolId: exam.school_id,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: isPublished ? 'PUBLISH_RESULTS' : 'UNPUBLISH_RESULTS',
      module: 'EXAMINATIONS',
      recordId: id,
      description: `${isPublished ? 'Published official' : 'Unpublished'} results for exam: ${exam.name}`,
      req
    });

    return res.json({ success: true, resultsPublished: isPublished });
  } catch (err: any) {
    console.error('[TOGGLE RESULTS ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to toggle results publication.' });
  }
});

// ==========================================
// 5. SCHEDULES (TIMETABLE)
// ==========================================
router.get('/:id/schedules', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { classId } = req.query;

  try {
    let query = `
      SELECT 
        es.*,
        c.name as class_name,
        sec.name as section_name,
        sub.name as subject_name,
        sub.code as subject_code,
        sub.type as subject_type,
        subm.status as submission_status,
        subm.submitted_by_name,
        subm.reviewed_by_name
      FROM examination_schedules es
      JOIN classes c ON es.class_id = c.id
      LEFT JOIN sections sec ON es.section_id = sec.id
      JOIN subjects sub ON es.subject_id = sub.id
      LEFT JOIN marks_submissions subm ON subm.schedule_id = es.id
      WHERE es.examination_id = $1
    `;
    const params: any[] = [id];

    if (classId) {
      params.push(classId);
      query += ` AND es.class_id = $${params.length}`;
    }

    query += ` ORDER BY es.exam_date ASC, es.start_time ASC`;

    const result: any = await db.query(query, params);
    return res.json({ schedules: result.rows });
  } catch (err: any) {
    console.error('[GET SCHEDULES ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to list exam schedules.' });
  }
});

router.post('/:id/schedules', requireAuth, requirePermission('exams.schedule.manage'), async (req, res) => {
  const classId = req.body.classId || req.body.class_id;
  const sectionId = req.body.sectionId || req.body.section_id;
  const subjectId = req.body.subjectId || req.body.subject_id;
  const examDate = req.body.examDate || req.body.exam_date;
  const startTime = req.body.startTime || req.body.start_time;
  const endTime = req.body.endTime || req.body.end_time;
  const durationMinutes = req.body.durationMinutes || req.body.duration_minutes;
  const examMode = req.body.examMode || req.body.exam_mode;
  const roomVenue = req.body.roomVenue || req.body.room_venue || req.body.room_number;
  const invigilatorEmployeeId = req.body.invigilatorEmployeeId || req.body.invigilator_employee_id;
  const invigilatorName = req.body.invigilatorName || req.body.invigilator_name;
  const maxMarksTheory = req.body.maxMarksTheory || req.body.max_marks_theory || req.body.max_marks;
  const passMarksTheory = req.body.passMarksTheory || req.body.pass_marks_theory || req.body.passing_marks;
  const maxMarksPractical = req.body.maxMarksPractical || req.body.max_marks_practical;
  const passMarksPractical = req.body.passMarksPractical || req.body.pass_marks_practical;
  const totalMaxMarks = req.body.totalMaxMarks || req.body.total_max_marks || req.body.max_marks;
  const totalPassMarks = req.body.totalPassMarks || req.body.total_pass_marks || req.body.passing_marks;
  const instructions = req.body.instructions;
  const { id } = req.params;

  if (!classId || !subjectId || !examDate || !startTime || !endTime) {
    return res.status(400).json({ error: 'Class, Subject, Exam Date, Start Time, and End Time are required.' });
  }

  try {
    const examRes: any = await db.query(`SELECT school_id FROM examinations WHERE id = $1`, [id]);
    if (examRes.rows.length === 0) return res.status(404).json({ error: 'Exam not found.' });
    const schoolId = (examRes.rows[0] as any).school_id;
    if (!checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

    const schedId = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const thMax = Number(maxMarksTheory || 80);
    const thPass = Number(passMarksTheory || (thMax * 0.33).toFixed(1));
    const prMax = Number(maxMarksPractical || 20);
    const prPass = Number(passMarksPractical || (prMax * 0.33).toFixed(1));
    const totMax = Number(totalMaxMarks || (thMax + prMax));
    const totPass = Number(totalPassMarks || (totMax * 0.33).toFixed(1));

    await db.query(`
      INSERT INTO examination_schedules (
        id, examination_id, school_id, class_id, section_id, subject_id,
        exam_date, start_time, end_time, duration_minutes, exam_mode, room_venue,
        invigilator_employee_id, invigilator_name, max_marks_theory, pass_marks_theory,
        max_marks_practical, pass_marks_practical, total_max_marks, total_pass_marks, instructions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    `, [
      schedId,
      id,
      schoolId,
      classId,
      sectionId || null,
      subjectId,
      examDate,
      startTime,
      endTime,
      durationMinutes ? Number(durationMinutes) : 180,
      examMode || 'WRITTEN',
      roomVenue || null,
      invigilatorEmployeeId || null,
      invigilatorName || null,
      thMax,
      thPass,
      prMax,
      prPass,
      totMax,
      totPass,
      instructions || null
    ]);

    // Create draft marks submission tracker
    const submId = `subm_${schedId}`;
    await db.query(`
      INSERT INTO marks_submissions (
        id, examination_id, schedule_id, school_id, class_id, section_id, subject_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT')
      ON CONFLICT (id) DO NOTHING
    `, [submId, id, schedId, schoolId, classId, sectionId || null, subjectId]);

    return res.status(201).json({ success: true, id: schedId, message: 'Exam schedule entry added successfully.' });
  } catch (err: any) {
    console.error('[ADD SCHEDULE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to add exam schedule.' });
  }
});

router.delete('/:id/schedules/:schedId', requireAuth, requirePermission('exams.schedule.manage'), async (req, res) => {
  const { id, schedId } = req.params;
  try {
    await db.query(`DELETE FROM examination_schedules WHERE id = $1 AND examination_id = $2`, [schedId, id]);
    return res.json({ success: true, message: 'Schedule entry deleted.' });
  } catch (err: any) {
    console.error('[DELETE SCHEDULE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to delete schedule.' });
  }
});

// ==========================================
// 6. MARKS ROSTER & BATCH ENTRY
// ==========================================
router.get('/:id/marks', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { scheduleId, classId, sectionId, subjectId } = req.query;

  try {
    let sched: any = null;
    if (scheduleId) {
      const sRes: any = await db.query(`SELECT * FROM examination_schedules WHERE id = $1`, [scheduleId]);
      if (sRes.rows.length > 0) sched = sRes.rows[0];
    }

    const targetClassId = (classId as string) || sched?.class_id;
    const targetSectionId = (sectionId as string) || sched?.section_id;
    const targetSubjectId = (subjectId as string) || sched?.subject_id;

    if (!targetClassId || !targetSubjectId) {
      return res.status(400).json({ error: 'classId and subjectId are required.' });
    }

    // Get all students enrolled in this class/section
    let studentsQuery = `
      SELECT id, admission_number, roll_number, first_name, last_name
      FROM students
      WHERE class_id = $1 AND student_status = 'ACTIVE'
    `;
    const params: any[] = [targetClassId];
    if (targetSectionId) {
      params.push(targetSectionId);
      studentsQuery += ` AND section_id = $2`;
    }
    studentsQuery += ` ORDER BY roll_number ASC, first_name ASC`;

    const studentsRes: any = await db.query(studentsQuery, params);

    // Get existing marks
    const marksRes: any = await db.query(`
      SELECT * FROM student_marks
      WHERE examination_id = $1 AND subject_id = $2
    `, [id, targetSubjectId]);

    const marksMap = new Map<string, any>();
    for (const m of marksRes.rows as any[]) {
      marksMap.set(m.student_id, m);
    }

    // Merge into complete roster
    const roster = (studentsRes.rows as any[]).map((stu: any) => {
      const mark = marksMap.get(stu.id);
      return {
        studentId: stu.id,
        admissionNumber: stu.admission_number,
        rollNumber: stu.roll_number,
        studentName: `${stu.first_name} ${stu.last_name}`,
        theoryMarks: mark ? Number(mark.theory_marks) : 0,
        practicalMarks: mark ? Number(mark.practical_marks) : 0,
        totalMarks: mark ? Number(mark.total_marks) : 0,
        maxMarks: mark ? Number(mark.max_marks) : (sched?.total_max_marks || 100),
        grade: mark ? mark.grade : '',
        gradePoint: mark ? Number(mark.grade_point) : 0,
        attendanceStatus: mark ? mark.attendance_status : 'PRESENT',
        isPassed: mark ? mark.is_passed : true,
        remarks: mark ? mark.remarks : '',
        isLocked: mark ? mark.is_locked : false
      };
    });

    // Check submission status
    let submissionStatus = 'DRAFT';
    if (sched) {
      const submRes: any = await db.query(`SELECT status FROM marks_submissions WHERE schedule_id = $1`, [sched.id]);
      if (submRes.rows.length > 0) {
        submissionStatus = (submRes.rows[0] as any).status;
      }
    }

    return res.json({
      schedule: sched,
      roster,
      submissionStatus
    });
  } catch (err: any) {
    console.error('[GET MARKS ROSTER ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to get marks roster.' });
  }
});

// Helper to determine Grade from CBSE 9-point or standard tiers
function calculateGrade(percentage: number) {
  if (percentage >= 91) return { grade: 'A1', gradePoint: 10.0 };
  if (percentage >= 81) return { grade: 'A2', gradePoint: 9.0 };
  if (percentage >= 71) return { grade: 'B1', gradePoint: 8.0 };
  if (percentage >= 61) return { grade: 'B2', gradePoint: 7.0 };
  if (percentage >= 51) return { grade: 'C1', gradePoint: 6.0 };
  if (percentage >= 41) return { grade: 'C2', gradePoint: 5.0 };
  if (percentage >= 33) return { grade: 'D', gradePoint: 4.0 };
  if (percentage >= 21) return { grade: 'E1', gradePoint: 0.0 };
  return { grade: 'E2', gradePoint: 0.0 };
}

// Batch save student marks
router.post('/:id/marks', requireAuth, requirePermission('exams.marks.enter'), async (req, res) => {
  const { id } = req.params;
  const classId = req.body.classId || req.body.class_id;
  const sectionId = req.body.sectionId || req.body.section_id;
  const subjectId = req.body.subjectId || req.body.subject_id;
  let scheduleId = req.body.scheduleId || req.body.schedule_id;
  const marks = req.body.marks;

  if (!classId || !subjectId || !Array.isArray(marks)) {
    return res.status(400).json({ error: 'classId, subjectId, and marks array are required.' });
  }

  try {
    const examRes: any = await db.query(`SELECT school_id, session_id FROM examinations WHERE id = $1`, [id]);
    if (examRes.rows.length === 0) return res.status(404).json({ error: 'Exam not found.' });
    const { school_id, session_id }: any = examRes.rows[0];
    if (!checkSchoolScope(req, school_id)) return res.status(403).json({ error: 'Access denied.' });

    if (!scheduleId) {
      const autoSched = await db.query(
        `SELECT id, total_max_marks, total_pass_marks FROM examination_schedules WHERE examination_id = $1 AND class_id = $2 AND subject_id = $3 LIMIT 1`,
        [id, classId, subjectId]
      );
      if (autoSched.rows.length > 0) {
        scheduleId = (autoSched.rows[0] as any).id;
      } else {
        const anySched = await db.query(`SELECT id FROM examination_schedules WHERE examination_id = $1 LIMIT 1`, [id]);
        if (anySched.rows.length > 0) {
          scheduleId = (anySched.rows[0] as any).id;
        } else {
          scheduleId = `esch_${Date.now()}`;
          await db.query(`
            INSERT INTO examination_schedules (id, examination_id, school_id, class_id, section_id, subject_id, exam_date, total_max_marks, total_pass_marks)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 100, 33)
          `, [scheduleId, id, school_id, classId, sectionId || null, subjectId]);
        }
      }
    }

    const schedRes: any = await db.query(`SELECT total_max_marks, total_pass_marks FROM examination_schedules WHERE id = $1`, [scheduleId]);
    const maxMarks = schedRes.rows.length > 0 ? Number((schedRes.rows[0] as any).total_max_marks) : 100.0;
    const passMarks = schedRes.rows.length > 0 ? Number((schedRes.rows[0] as any).total_pass_marks) : 33.0;

    let enteredCount = 0;
    for (const item of marks) {
      const studentId = item.studentId || item.student_id;
      const attStatus = item.is_absent ? 'ABSENT' : (item.attendanceStatus || 'PRESENT');
      const marksObtained = item.marks_obtained !== undefined ? Number(item.marks_obtained) : undefined;
      const th = attStatus === 'ABSENT' ? 0 : (marksObtained !== undefined ? marksObtained : Number(item.theoryMarks || 0));
      const pr = attStatus === 'ABSENT' ? 0 : Number(item.practicalMarks || 0);
      const tot = th + pr;
      const pct = maxMarks > 0 ? Number(((tot / maxMarks) * 100).toFixed(2)) : 0;
      const { grade, gradePoint } = calculateGrade(pct);
      const isPassed = attStatus !== 'ABSENT' && tot >= passMarks;
      const remarks = item.remarks || null;

      const markId = `smk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await db.query(`
        INSERT INTO student_marks (
          id, submission_id, examination_id, schedule_id, school_id, session_id,
          student_id, class_id, section_id, subject_id, attendance_status,
          theory_marks, practical_marks, total_marks, max_marks, percentage,
          grade, grade_point, is_passed, remarks, is_locked, entered_by_name
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, false, $21
        )
        ON CONFLICT (examination_id, subject_id, student_id)
        DO UPDATE SET
          attendance_status = EXCLUDED.attendance_status,
          theory_marks = EXCLUDED.theory_marks,
          practical_marks = EXCLUDED.practical_marks,
          total_marks = EXCLUDED.total_marks,
          percentage = EXCLUDED.percentage,
          grade = EXCLUDED.grade,
          grade_point = EXCLUDED.grade_point,
          is_passed = EXCLUDED.is_passed,
          remarks = EXCLUDED.remarks,
          updated_at = CURRENT_TIMESTAMP
      `, [
        markId,
        `subm_${scheduleId}`,
        id,
        scheduleId,
        school_id,
        session_id,
        studentId,
        classId,
        sectionId || null,
        subjectId,
        attStatus,
        th,
        pr,
        tot,
        maxMarks,
        pct,
        grade,
        gradePoint,
        isPassed,
        remarks,
        req.user!.username
      ]);
      enteredCount++;
    }

    // Update marks submission tracker
    await db.query(`
      UPDATE marks_submissions
      SET entered_students = $1, total_students = $2, updated_at = CURRENT_TIMESTAMP
      WHERE schedule_id = $3
    `, [enteredCount, marks.length, scheduleId]);

    return res.json({ success: true, count: enteredCount, message: 'Marks updated successfully.' });
  } catch (err: any) {
    console.error('[SAVE MARKS ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to save marks.' });
  }
});

// Submit marks for review
router.post('/:id/submissions/submit', requireAuth, requirePermission('exams.marks.enter'), async (req, res) => {
  const { id } = req.params;
  const { scheduleId } = req.body;

  try {
    await db.query(`
      UPDATE marks_submissions
      SET status = 'SUBMITTED',
          submitted_by_id = $1,
          submitted_by_name = $2,
          submitted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE schedule_id = $3 AND examination_id = $4
    `, [req.user!.id, req.user!.username, scheduleId, id]);

    return res.json({ success: true, message: 'Marks submitted for review and approval.' });
  } catch (err: any) {
    console.error('[SUBMIT MARKS ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to submit marks.' });
  }
});

// Approve marks
router.post('/:id/submissions/approve', requireAuth, requirePermission('exams.marks.review'), async (req, res) => {
  const { id } = req.params;
  const { scheduleId, remarks } = req.body;

  try {
    await db.query(`
      UPDATE marks_submissions
      SET status = 'APPROVED',
          reviewed_by_id = $1,
          reviewed_by_name = $2,
          reviewed_at = CURRENT_TIMESTAMP,
          reviewer_remarks = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE schedule_id = $4 AND examination_id = $5
    `, [req.user!.id, req.user!.username, remarks || 'Verified and approved.', scheduleId, id]);

    // Lock student marks
    await db.query(`
      UPDATE student_marks
      SET is_locked = true, updated_at = CURRENT_TIMESTAMP
      WHERE schedule_id = $1 AND examination_id = $2
    `, [scheduleId, id]);

    return res.json({ success: true, message: 'Marks verified and approved successfully.' });
  } catch (err: any) {
    console.error('[APPROVE MARKS ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to approve marks.' });
  }
});

// ==========================================
// 7. RESULT CALCULATION ENGINE
// ==========================================
router.post('/:id/calculate-results', requireAuth, requirePermission('exams.results.calculate'), async (req, res) => {
  const { id } = req.params;
  const classId = req.body.classId || req.body.class_id;

  try {
    const examRes: any = await db.query(`SELECT school_id, session_id, name FROM examinations WHERE id = $1`, [id]);
    if (examRes.rows.length === 0) return res.status(404).json({ error: 'Exam not found.' });
    const { school_id, session_id, name: examName }: any = examRes.rows[0];
    if (!checkSchoolScope(req, school_id)) return res.status(403).json({ error: 'Access denied.' });

    // Find all distinct students who have marks in this exam
    let filterClassClause = '';
    const queryParams: any[] = [id];
    if (classId) {
      queryParams.push(classId);
      filterClassClause = ` AND sm.class_id = $2`;
    }

    const marksAggregateRes: any = await db.query(`
      SELECT 
        sm.student_id,
        sm.class_id,
        sm.section_id,
        COUNT(sm.id) as subjects_count,
        SUM(sm.max_marks) as total_max,
        SUM(sm.total_marks) as total_obtained,
        ROUND(AVG(sm.percentage), 2) as avg_percentage,
        ROUND(AVG(sm.grade_point), 2) as avg_gpa,
        COUNT(sm.id) FILTER (WHERE sm.is_passed = false) as failed_subjects
      FROM student_marks sm
      WHERE sm.examination_id = $1 ${filterClassClause}
      GROUP BY sm.student_id, sm.class_id, sm.section_id
      ORDER BY total_obtained DESC
    `, queryParams);

    const rows = marksAggregateRes.rows as any[];
    if (rows.length === 0) {
      return res.status(400).json({ error: 'No student marks found to calculate results. Please enter marks first.' });
    }

    let calculatedCount = 0;
    // Rank students across their class
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rank = i + 1;
      const totMax = Number(row.total_max);
      const totObt = Number(row.total_obtained);
      const pct = totMax > 0 ? Number(((totObt / totMax) * 100).toFixed(2)) : 0;
      const gpa = Number(row.avg_gpa || 0);
      const failedCount = Number(row.failed_subjects || 0);
      const { grade } = calculateGrade(pct);

      let status = 'PASSED';
      if (failedCount > 2) status = 'FAILED';
      else if (failedCount > 0) status = 'COMPARTMENT';

      const resId = `sres_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await db.query(`
        INSERT INTO student_exam_results (
          id, examination_id, school_id, session_id, student_id, class_id, section_id,
          total_max_marks, total_marks_obtained, overall_percentage, overall_grade,
          gpa, result_status, failed_subjects_count, class_rank, section_rank,
          attendance_percentage, class_teacher_remarks, principal_remarks,
          is_published, calculated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15,
          95.0, 'Calculated by Examination Result Engine.', 'Result verified and approved for publishing.',
          false, CURRENT_TIMESTAMP
        )
        ON CONFLICT (examination_id, student_id)
        DO UPDATE SET
          total_max_marks = EXCLUDED.total_max_marks,
          total_marks_obtained = EXCLUDED.total_marks_obtained,
          overall_percentage = EXCLUDED.overall_percentage,
          overall_grade = EXCLUDED.overall_grade,
          gpa = EXCLUDED.gpa,
          result_status = EXCLUDED.result_status,
          failed_subjects_count = EXCLUDED.failed_subjects_count,
          class_rank = EXCLUDED.class_rank,
          section_rank = EXCLUDED.section_rank,
          calculated_at = CURRENT_TIMESTAMP
      `, [
        resId,
        id,
        school_id,
        session_id,
        row.student_id,
        row.class_id,
        row.section_id,
        totMax,
        totObt,
        pct,
        grade,
        gpa,
        status,
        failedCount,
        rank
      ]);
      calculatedCount++;
    }

    await recordAuditLog({
      schoolId: school_id,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'CALCULATE_RESULTS',
      module: 'EXAMINATIONS',
      recordId: id,
      description: `Calculated results and merit ranks for ${calculatedCount} students in exam: ${examName}`,
      req
    });

    return res.json({ success: true, count: calculatedCount, message: `Successfully compiled results for ${calculatedCount} students.` });
  } catch (err: any) {
    console.error('[CALCULATE RESULTS ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to calculate results.' });
  }
});

// ==========================================
// 8. RESULTS LIST & REPORT CARDS
// ==========================================
router.get('/:id/results', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { classId, sectionId, search } = req.query;

  try {
    let query = `
      SELECT 
        ser.*,
        stu.admission_number,
        stu.roll_number,
        stu.first_name,
        stu.last_name,
        c.name as class_name,
        sec.name as section_name
      FROM student_exam_results ser
      JOIN students stu ON ser.student_id = stu.id
      JOIN classes c ON ser.class_id = c.id
      LEFT JOIN sections sec ON ser.section_id = sec.id
      WHERE ser.examination_id = $1
    `;
    const params: any[] = [id];

    if (classId) {
      params.push(classId);
      query += ` AND ser.class_id = $${params.length}`;
    }
    if (sectionId) {
      params.push(sectionId);
      query += ` AND ser.section_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (stu.first_name ILIKE $${params.length} OR stu.last_name ILIKE $${params.length} OR stu.admission_number ILIKE $${params.length})`;
    }

    query += ` ORDER BY ser.class_rank ASC, ser.total_marks_obtained DESC`;

    const result: any = await db.query(query, params);
    return res.json({ results: result.rows });
  } catch (err: any) {
    console.error('[GET RESULTS ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to get exam results.' });
  }
});

// Comprehensive Single Student Report Card
router.get('/:id/results/:studentId/report-card', requireAuth, requirePermission('exams.report_cards.generate'), async (req, res) => {
  const { id, studentId } = req.params;

  try {
    // 1. Examination details
    const examRes: any = await db.query(`
      SELECT e.*, t.name as type_name, s.name as session_name
      FROM examinations e
      JOIN examination_types t ON e.type_id = t.id
      JOIN academic_sessions s ON e.session_id = s.id
      WHERE e.id = $1
    `, [id]);
    if (examRes.rows.length === 0) return res.status(404).json({ error: 'Exam not found.' });
    const exam = examRes.rows[0];

    // 2. School details
    const schoolRes: any = await db.query(`SELECT * FROM schools WHERE id = $1`, [exam.school_id]);
    const school = schoolRes.rows[0];

    // 3. Student details
    const stuRes: any = await db.query(`
      SELECT 
        stu.*,
        c.name as class_name,
        sec.name as section_name,
        p.name as parent_name,
        p.mobile_number as parent_mobile
      FROM students stu
      JOIN classes c ON stu.class_id = c.id
      LEFT JOIN sections sec ON stu.section_id = sec.id
      LEFT JOIN student_parents spr ON spr.student_id = stu.id AND spr.is_primary_guardian = true
      LEFT JOIN parents p ON spr.parent_id = p.id
      WHERE stu.id = $1
    `, [studentId]);
    if (stuRes.rows.length === 0) return res.status(404).json({ error: 'Student not found.' });
    const student = stuRes.rows[0];

    // 4. Overall result summary
    const resRes: any = await db.query(`SELECT * FROM student_exam_results WHERE examination_id = $1 AND student_id = $2`, [id, studentId]);
    const overallResult = resRes.rows[0] || null;

    // 5. Subject-wise marks breakdown
    const marksRes: any = await db.query(`
      SELECT 
        sm.*,
        sub.name as subject_name,
        sub.code as subject_code,
        sub.type as subject_type,
        es.max_marks_theory,
        es.max_marks_practical
      FROM student_marks sm
      JOIN subjects sub ON sm.subject_id = sub.id
      LEFT JOIN examination_schedules es ON sm.schedule_id = es.id
      WHERE sm.examination_id = $1 AND sm.student_id = $2
      ORDER BY sub.name ASC
    `, [id, studentId]);

    return res.json({
      school,
      exam,
      student,
      overallResult,
      subjects: marksRes.rows
    });
  } catch (err: any) {
    console.error('[GET REPORT CARD ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to generate report card data.' });
  }
});

export default router;
