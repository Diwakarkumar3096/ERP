import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// ==========================================
// 1. DASHBOARD & SUMMARY METRICS
// ==========================================

router.get('/dashboard-stats', requireAuth, requirePermission('attendance.student.view'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    let targetSchoolId = schoolId;
    if (user.roleName !== 'super_admin' && user.schoolId) {
      targetSchoolId = user.schoolId;
    }

    const schoolFilter = targetSchoolId ? `WHERE school_id = $1` : '';
    const schoolParams = targetSchoolId ? [targetSchoolId] : [];

    // 1. Total Enrolled Students
    const enrolledRes = await db.query(`
      SELECT count(*) as count FROM students
      ${targetSchoolId ? "WHERE school_id = $1 AND student_status = 'ACTIVE'" : "WHERE student_status = 'ACTIVE'"}
    `, schoolParams);
    const totalEnrolled = parseInt((enrolledRes.rows[0] as any)?.count || '0', 10);

    // 2. Student Attendance for Date
    const attParams: any[] = [date];
    let attFilter = `WHERE a.date = $1`;
    if (targetSchoolId) {
      attParams.push(targetSchoolId);
      attFilter += ` AND a.school_id = $${attParams.length}`;
    }

    const stuAttRes = await db.query(`
      SELECT a.status, count(*) as count
      FROM student_attendance a
      ${attFilter}
      GROUP BY a.status
    `, attParams);

    const stuCounts: Record<string, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      HALF_DAY: 0,
      ON_LEAVE: 0
    };
    let totalMarkedStudents = 0;
    for (const row of stuAttRes.rows as any[]) {
      stuCounts[row.status] = parseInt(row.count, 10);
      totalMarkedStudents += parseInt(row.count, 10);
    }
    const studentUnmarked = Math.max(0, totalEnrolled - totalMarkedStudents);
    const studentCompletionRate = totalEnrolled > 0 ? Math.round((totalMarkedStudents / totalEnrolled) * 100) : 0;

    // 3. Total Eligible Staff
    const staffRes = await db.query(`
      SELECT count(*) as count FROM employees
      ${targetSchoolId ? "WHERE school_id = $1 AND employment_status = 'ACTIVE'" : "WHERE employment_status = 'ACTIVE'"}
    `, schoolParams);
    const totalStaff = parseInt((staffRes.rows[0] as any)?.count || '0', 10);

    // 4. Staff Attendance for Date
    const stfAttRes = await db.query(`
      SELECT s.status, count(*) as count
      FROM staff_attendance s
      ${attFilter.replace(/a\./g, 's.')}
      GROUP BY s.status
    `, attParams);

    const staffCounts: Record<string, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      HALF_DAY: 0,
      ON_LEAVE: 0,
      WEEKLY_OFF: 0,
      HOLIDAY: 0
    };
    let totalMarkedStaff = 0;
    for (const row of stfAttRes.rows as any[]) {
      staffCounts[row.status] = parseInt(row.count, 10);
      totalMarkedStaff += parseInt(row.count, 10);
    }
    const staffUnmarked = Math.max(0, totalStaff - totalMarkedStaff);
    const staffCompletionRate = totalStaff > 0 ? Math.round((totalMarkedStaff / totalStaff) * 100) : 0;

    // 5. Class-wise Completion for Date
    const classParams: any[] = [date];
    let classWhere = `WHERE c.status = 'active' AND sec.status = 'active'`;
    if (targetSchoolId) {
      classParams.push(targetSchoolId);
      classWhere += ` AND c.school_id = $${classParams.length}`;
    }

    const classSectionProgress = await db.query(`
      SELECT
        c.id as class_id,
        c.name as class_name,
        c.numeric_grade,
        sec.id as section_id,
        sec.name as section_name,
        sec.class_teacher_name,
        (
          SELECT count(*) FROM students s
          WHERE s.class_id = c.id AND s.section_id = sec.id AND s.student_status = 'ACTIVE'
        ) as total_students,
        (
          SELECT count(*) FROM student_attendance sa
          WHERE sa.class_id = c.id AND sa.section_id = sec.id AND sa.date = $1
        ) as marked_students
      FROM classes c
      JOIN sections sec ON sec.class_id = c.id
      ${classWhere}
      ORDER BY c.numeric_grade ASC, sec.name ASC
    `, classParams);

    // 6. Check Calendar Event for Today
    const calRes = await db.query(`
      SELECT * FROM school_calendar_events
      WHERE date = $1 ${targetSchoolId ? 'AND school_id = $2' : ''}
      LIMIT 1
    `, targetSchoolId ? [date, targetSchoolId] : [date]);

    // 7. Recent Correction Requests count
    const corrRes = await db.query(`
      SELECT count(*) as count FROM attendance_correction_requests
      WHERE status = 'PENDING' ${targetSchoolId ? 'AND school_id = $1' : ''}
    `, schoolParams);

    res.json({
      date,
      schoolId: targetSchoolId,
      studentStats: {
        totalEnrolled,
        marked: totalMarkedStudents,
        unmarked: studentUnmarked,
        present: stuCounts['PRESENT'] || 0,
        absent: stuCounts['ABSENT'] || 0,
        late: stuCounts['LATE'] || 0,
        halfDay: stuCounts['HALF_DAY'] || 0,
        onLeave: stuCounts['ON_LEAVE'] || 0,
        completionRate: studentCompletionRate
      },
      staffStats: {
        totalStaff,
        marked: totalMarkedStaff,
        unmarked: staffUnmarked,
        present: staffCounts['PRESENT'] || 0,
        absent: staffCounts['ABSENT'] || 0,
        late: staffCounts['LATE'] || 0,
        halfDay: staffCounts['HALF_DAY'] || 0,
        onLeave: staffCounts['ON_LEAVE'] || 0,
        weeklyOff: staffCounts['WEEKLY_OFF'] || 0,
        holiday: staffCounts['HOLIDAY'] || 0,
        completionRate: staffCompletionRate
      },
      classProgress: classSectionProgress.rows.map((r: any) => ({
        class_id: r.class_id,
        class_name: r.class_name,
        section_id: r.section_id,
        section_name: r.section_name,
        class_teacher_name: r.class_teacher_name,
        total_students: parseInt(r.total_students, 10),
        marked_students: parseInt(r.marked_students, 10),
        is_completed: parseInt(r.total_students, 10) > 0 && parseInt(r.marked_students, 10) >= parseInt(r.total_students, 10)
      })),
      calendarEvent: calRes.rows[0] || null,
      pendingCorrections: parseInt((corrRes.rows[0] as any)?.count || '0', 10)
    });
  } catch (error: any) {
    console.error('[ATTENDANCE DASHBOARD STATS ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch attendance dashboard statistics' });
  }
});

// ==========================================
// 2. SETTINGS & CALENDAR MANAGEMENT
// ==========================================

router.get('/settings', requireAuth, async (req, res) => {
  try {
    const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
    if (!checkSchoolScope(req, schoolId)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    const settingsRes = await db.query('SELECT * FROM attendance_settings WHERE school_id = $1', [schoolId]);
    if (settingsRes.rows.length === 0) {
      // Return sensible defaults
      return res.json({
        settings: {
          school_id: schoolId,
          lock_after_days: 2,
          allow_future_marking: false,
          allow_holiday_marking: false,
          default_session: 'FULL_DAY',
          student_min_percentage: 75.00,
          staff_min_percentage: 80.00,
          staff_check_in_time: '08:30',
          staff_check_out_time: '16:00'
        }
      });
    }

    res.json({ settings: settingsRes.rows[0] });
  } catch (error: any) {
    console.error('[GET ATTENDANCE SETTINGS ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch settings' });
  }
});

router.put('/settings', requireAuth, requirePermission('calendar.manage'), async (req, res) => {
  try {
    const {
      school_id,
      lock_after_days,
      allow_future_marking,
      allow_holiday_marking,
      default_session,
      student_min_percentage,
      staff_min_percentage,
      staff_check_in_time,
      staff_check_out_time
    } = req.body;

    const targetSchoolId = school_id || req.user!.schoolId;
    if (!targetSchoolId || !checkSchoolScope(req, targetSchoolId)) {
      return res.status(403).json({ error: 'Access denied to target school' });
    }

    await db.query(`
      INSERT INTO attendance_settings (
        id, school_id, lock_after_days, allow_future_marking, allow_holiday_marking,
        default_session, student_min_percentage, staff_min_percentage,
        staff_check_in_time, staff_check_out_time, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP
      )
      ON CONFLICT (school_id) DO UPDATE SET
        lock_after_days = EXCLUDED.lock_after_days,
        allow_future_marking = EXCLUDED.allow_future_marking,
        allow_holiday_marking = EXCLUDED.allow_holiday_marking,
        default_session = EXCLUDED.default_session,
        student_min_percentage = EXCLUDED.student_min_percentage,
        staff_min_percentage = EXCLUDED.staff_min_percentage,
        staff_check_in_time = EXCLUDED.staff_check_in_time,
        staff_check_out_time = EXCLUDED.staff_check_out_time,
        updated_at = CURRENT_TIMESTAMP
    `, [
      `set_${targetSchoolId}`, targetSchoolId,
      lock_after_days ?? 2,
      !!allow_future_marking,
      !!allow_holiday_marking,
      default_session || 'FULL_DAY',
      student_min_percentage || 75.00,
      staff_min_percentage || 80.00,
      staff_check_in_time || '08:30',
      staff_check_out_time || '16:00'
    ]);

    await recordAuditLog({
      req,
      action: 'UPDATE_SETTINGS',
      module: 'Attendance',
      description: `Updated attendance configuration settings for school ${targetSchoolId}`
    });

    res.json({ success: true, message: 'Attendance settings updated successfully' });
  } catch (error: any) {
    console.error('[UPDATE ATTENDANCE SETTINGS ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to update settings' });
  }
});

// Calendar Events (Holidays, Working Days)
router.get('/calendar', requireAuth, requirePermission('calendar.view'), async (req, res) => {
  try {
    const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
    const year = req.query.year as string;
    const month = req.query.month as string;

    const params: any[] = [];
    let query = `
      SELECT e.*, s.name as school_name, ses.name as session_name
      FROM school_calendar_events e
      JOIN schools s ON s.id = e.school_id
      JOIN academic_sessions ses ON ses.id = e.session_id
      WHERE 1=1
    `;

    if (schoolId) {
      params.push(schoolId);
      query += ` AND e.school_id = $${params.length}`;
    }

    if (year && month) {
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const end = `${year}-${String(month).padStart(2, '0')}-31`;
      params.push(start, end);
      query += ` AND e.date >= $${params.length - 1} AND e.date <= $${params.length}`;
    } else if (year) {
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      params.push(start, end);
      query += ` AND e.date >= $${params.length - 1} AND e.date <= $${params.length}`;
    }

    query += ` ORDER BY e.date ASC`;

    const result = await db.query(query, params);
    res.json({ events: result.rows });
  } catch (error: any) {
    console.error('[GET CALENDAR EVENTS ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch calendar events' });
  }
});

router.post('/calendar', requireAuth, requirePermission('calendar.manage'), async (req, res) => {
  try {
    const { school_id, session_id, date, event_type, title, description, is_instructional_day = false } = req.body;

    const targetSchoolId = school_id || req.user!.schoolId;
    if (!targetSchoolId || !checkSchoolScope(req, targetSchoolId)) {
      return res.status(403).json({ error: 'Access denied to target school' });
    }
    if (!session_id || !date || !event_type || !title) {
      return res.status(400).json({ error: 'Session ID, Date, Event Type, and Title are required' });
    }

    const eventId = `cal_${crypto.randomBytes(6).toString('hex')}`;
    await db.query(`
      INSERT INTO school_calendar_events (
        id, school_id, session_id, date, event_type, title, description, is_instructional_day
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (school_id, date) DO UPDATE SET
        event_type = EXCLUDED.event_type,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        is_instructional_day = EXCLUDED.is_instructional_day
    `, [eventId, targetSchoolId, session_id, date, event_type, title, description || '', !!is_instructional_day]);

    await recordAuditLog({
      req,
      action: 'ADD_CALENDAR_EVENT',
      module: 'Calendar',
      recordId: eventId,
      description: `Added calendar event '${title}' (${event_type}) on ${date}`
    });

    res.status(201).json({ success: true, eventId, message: 'Calendar event saved successfully' });
  } catch (error: any) {
    console.error('[ADD CALENDAR EVENT ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to save calendar event' });
  }
});

router.delete('/calendar/:id', requireAuth, requirePermission('calendar.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM school_calendar_events WHERE id = $1', [id]);
    res.json({ success: true, message: 'Calendar event removed' });
  } catch (error: any) {
    console.error('[DELETE CALENDAR EVENT ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to delete calendar event' });
  }
});

// ==========================================
// 3. STUDENT ATTENDANCE OPERATIONS
// ==========================================

// Helper: Check teacher class assignment
async function verifyTeacherClassAssignment(user: any, classId: string, sectionId: string): Promise<boolean> {
  if (user.roleName === 'super_admin' || user.roleName === 'school_admin' || user.roleName === 'principal') {
    return true;
  }
  // If teacher, check if assigned as Class Teacher or Subject Teacher
  const check = await db.query(`
    SELECT id FROM (
      SELECT id FROM class_teacher_assignments
      WHERE class_id = $1 AND section_id = $2
        AND teacher_id IN (SELECT id FROM teacher_profiles WHERE employee_id IN (SELECT id FROM employees WHERE user_id = $3))
        AND status = 'active'
      UNION
      SELECT id FROM teacher_subject_assignments
      WHERE class_id = $1 AND (section_id = $2 OR section_id IS NULL)
        AND teacher_id IN (SELECT id FROM teacher_profiles WHERE employee_id IN (SELECT id FROM employees WHERE user_id = $3))
        AND status = 'active'
    ) combined LIMIT 1
  `, [classId, sectionId, user.id]);

  return check.rows.length > 0;
}

// Student Roster for Daily Attendance Marking
router.get('/student/roster', requireAuth, requirePermission('attendance.student.view'), async (req, res) => {
  try {
    const { schoolId, classId, sectionId, date, attendanceSession = 'FULL_DAY' } = req.query as Record<string, string>;
    let sessionId = req.query.sessionId as string;

    if (!schoolId || !classId || !sectionId || !date) {
      return res.status(400).json({ error: 'schoolId, classId, sectionId, and date are required' });
    }

    if (!sessionId) {
      const sesRes = await db.query(`SELECT id FROM academic_sessions WHERE school_id = $1 AND (is_current = true OR status = 'ACTIVE') ORDER BY is_current DESC LIMIT 1`, [schoolId]);
      sessionId = (sesRes.rows[0] as any)?.id;
    }

    if (!checkSchoolScope(req, schoolId)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    // Verify teacher authorization for assigned class
    const isAssigned = await verifyTeacherClassAssignment(req.user, classId, sectionId);
    if (!isAssigned) {
      return res.status(403).json({ error: 'You are not assigned to mark attendance for this class and section.' });
    }

    // 1. Check if calendar event exists on this date
    const calEventRes = await db.query(`
      SELECT * FROM school_calendar_events WHERE school_id = $1 AND date = $2 LIMIT 1
    `, [schoolId, date]);
    const calendarEvent = calEventRes.rows[0] || null;

    // 2. Check settings for locking rules
    const settingsRes = await db.query('SELECT * FROM attendance_settings WHERE school_id = $1', [schoolId]);
    const settings = settingsRes.rows[0] as any || { lock_after_days: 2 };

    const targetDate = new Date(date);
    const today = new Date(new Date().toISOString().split('T')[0]);
    const diffDays = Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
    let isAutoLocked = diffDays > (settings.lock_after_days || 2);

    // 3. Query enrolled students joined with attendance on date
    const sessionFilter = sessionId ? 'AND s.session_id = $2' : '';
    const params = [schoolId];
    if (sessionId) params.push(sessionId);
    params.push(classId, sectionId, date, attendanceSession);
    const pOffset = sessionId ? 1 : 0;

    const rosterRes = await db.query(`
      SELECT
        s.id as student_id,
        s.admission_number,
        s.roll_number,
        s.first_name,
        s.middle_name,
        s.last_name,
        s.profile_photo,
        s.gender,
        sa.id as attendance_id,
        sa.status,
        sa.arrival_time,
        sa.remarks,
        sa.marked_by_name,
        sa.is_locked,
        sa.updated_at as marked_at
      FROM students s
      LEFT JOIN student_attendance sa ON sa.student_id = s.id
        AND sa.date = $${4 + pOffset}
        AND (sa.attendance_session = $${5 + pOffset} OR sa.attendance_session = 'DAILY' OR sa.attendance_session = 'FULL_DAY' OR $${5 + pOffset} = 'FULL_DAY')
      WHERE s.school_id = $1
        ${sessionFilter}
        AND s.class_id = $${2 + pOffset}
        AND s.section_id = $${3 + pOffset}
        AND s.student_status = 'ACTIVE'
      ORDER BY COALESCE(NULLIF(s.roll_number, ''), '999')::int ASC, s.first_name ASC
    `, params);

    const students = rosterRes.rows.map((r: any) => ({
      id: r.student_id,
      student_id: r.student_id,
      admission_number: r.admission_number,
      roll_number: r.roll_number,
      student_name: `${r.first_name} ${r.middle_name || ''} ${r.last_name}`.replace(/\s+/g, ' ').trim(),
      profile_photo: r.profile_photo,
      gender: r.gender,
      attendance_id: r.attendance_id,
      status: r.status || null, // null means unmarked!
      arrival_time: r.arrival_time || '',
      remarks: r.remarks || '',
      marked_by_name: r.marked_by_name || null,
      is_locked: !!r.is_locked,
      marked_at: r.marked_at || null
    }));

    // Check if explicitly locked
    const explicitlyLocked = students.some(s => s.is_locked);
    const finalLocked = explicitlyLocked || (isAutoLocked && students.some(s => s.status !== null));

    // Summary counts
    const counts = {
      total: students.length,
      present: students.filter(s => s.status === 'PRESENT').length,
      absent: students.filter(s => s.status === 'ABSENT').length,
      late: students.filter(s => s.status === 'LATE').length,
      halfDay: students.filter(s => s.status === 'HALF_DAY').length,
      onLeave: students.filter(s => s.status === 'ON_LEAVE').length,
      unmarked: students.filter(s => s.status === null).length
    };

    res.json({
      schoolId,
      sessionId,
      classId,
      sectionId,
      date,
      attendanceSession,
      students,
      counts,
      isMarked: counts.unmarked === 0 && counts.total > 0,
      isLocked: finalLocked,
      calendarEvent
    });
  } catch (error: any) {
    console.error('[GET STUDENT ROSTER ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to load student roster' });
  }
});

// Bulk Save Student Attendance
router.post('/student/bulk', requireAuth, requirePermission('attendance.student.mark'), async (req, res) => {
  try {
    const school_id = req.body.school_id || req.body.schoolId || req.user!.schoolId;
    const session_id = req.body.session_id || req.body.sessionId;
    const class_id = req.body.class_id || req.body.classId;
    const section_id = req.body.section_id || req.body.sectionId;
    const date = req.body.date;
    const attendance_session = req.body.attendance_session || req.body.attendanceSession || 'FULL_DAY';
    const records = req.body.records || [];
    const reopen_reason = req.body.reopen_reason || req.body.reopenReason;

    if (!school_id || !session_id || !class_id || !section_id || !date) {
      return res.status(400).json({ error: 'school_id, session_id, class_id, section_id, and date are required' });
    }

    if (!checkSchoolScope(req, school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    const isAssigned = await verifyTeacherClassAssignment(req.user, class_id, section_id);
    if (!isAssigned) {
      return res.status(403).json({ error: 'You are not assigned to mark attendance for this class and section.' });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'No attendance records provided' });
    }

    // Check settings for future date or locking
    const settingsRes = await db.query('SELECT * FROM attendance_settings WHERE school_id = $1', [school_id]);
    const settings = settingsRes.rows[0] as any || { lock_after_days: 2, allow_future_marking: false };

    const targetDate = new Date(date);
    const today = new Date(new Date().toISOString().split('T')[0]);

    if (!settings.allow_future_marking && targetDate > today) {
      return res.status(400).json({ error: 'Marking attendance for future dates is disabled by school policy.' });
    }

    const diffDays = Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
    const isAutoLocked = diffDays > (settings.lock_after_days || 2);

    // Check if locked
    const existingLock = await db.query(`
      SELECT count(*) as count FROM student_attendance
      WHERE class_id = $1 AND section_id = $2 AND date = $3 AND attendance_session = $4 AND is_locked = true
    `, [class_id, section_id, date, attendance_session]);

    const isExplicitlyLocked = parseInt((existingLock.rows[0] as any)?.count || '0', 10) > 0;
    const isLocked = isExplicitlyLocked || isAutoLocked;

    if (isLocked) {
      const canUnlock = req.user!.roleName === 'super_admin' || req.user!.roleName === 'school_admin' || req.user!.roleName === 'principal' || req.user!.permissions.includes('attendance.unlock');
      if (!canUnlock) {
        return res.status(403).json({ error: 'Attendance for this date is locked. Only an authorized administrator can reopen it.' });
      }
      if (!reopen_reason) {
        return res.status(400).json({ error: 'Attendance is locked. A reason for reopening is required.' });
      }
    }

    const markedByName = `${req.user!.firstName} ${req.user!.lastName}`.trim();
    const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE'];

    // Transactional bulk upsert
    let updatedCount = 0;
    for (const item of records) {
      const targetStudentId = item.student_id || item.studentId;
      if (!targetStudentId || !validStatuses.includes(item.status)) {
        continue;
      }

      const attId = item.attendance_id || item.attendanceId || `satt_${crypto.randomBytes(6).toString('hex')}`;
      await db.query(`
        INSERT INTO student_attendance (
          id, school_id, session_id, class_id, section_id, student_id,
          date, attendance_session, status, arrival_time, remarks,
          marked_by_id, marked_by_name, is_locked, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, false, CURRENT_TIMESTAMP
        )
        ON CONFLICT (student_id, date, attendance_session) DO UPDATE SET
          status = EXCLUDED.status,
          arrival_time = EXCLUDED.arrival_time,
          remarks = EXCLUDED.remarks,
          marked_by_id = EXCLUDED.marked_by_id,
          marked_by_name = EXCLUDED.marked_by_name,
          updated_at = CURRENT_TIMESTAMP
      `, [
        attId, school_id, session_id, class_id, section_id, targetStudentId,
        date, attendance_session, item.status,
        item.arrival_time || (item.status === 'LATE' ? '08:45' : item.status === 'PRESENT' ? '08:20' : null),
        item.remarks || '',
        req.user!.id, markedByName
      ]);
      updatedCount++;
    }

    await recordAuditLog({
      req,
      action: isLocked ? 'REOPEN_AND_SAVE_ATTENDANCE' : 'SAVE_STUDENT_ATTENDANCE',
      module: 'Attendance',
      description: `Saved attendance for ${updatedCount} students on ${date} (Class ${class_id}, Section ${section_id})${reopen_reason ? ` [Reopened: ${reopen_reason}]` : ''}`
    });

    res.json({
      success: true,
      count: updatedCount,
      message: `Successfully saved attendance for ${updatedCount} students.`
    });
  } catch (error: any) {
    console.error('[BULK SAVE STUDENT ATTENDANCE ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to save student attendance' });
  }
});

// Reopen / Unlock Attendance
router.post('/student/unlock', requireAuth, requirePermission('attendance.unlock'), async (req, res) => {
  try {
    const { school_id, class_id, section_id, date, attendance_session = 'FULL_DAY', reason } = req.body;

    if (!school_id || !class_id || !section_id || !date || !reason) {
      return res.status(400).json({ error: 'School ID, Class ID, Section ID, Date, and Reason are required to unlock attendance.' });
    }

    if (!checkSchoolScope(req, school_id)) {
      return res.status(403).json({ error: 'Access denied to target school' });
    }

    await db.query(`
      UPDATE student_attendance
      SET is_locked = false, updated_at = CURRENT_TIMESTAMP
      WHERE class_id = $1 AND section_id = $2 AND date = $3 AND attendance_session = $4
    `, [class_id, section_id, date, attendance_session]);

    await recordAuditLog({
      req,
      action: 'UNLOCK_ATTENDANCE',
      module: 'Attendance',
      description: `Unlocked student attendance for date ${date} (Class ${class_id}, Section ${section_id}). Reason: ${reason}`
    });

    res.json({ success: true, message: 'Attendance unlocked successfully. Edits may now be saved.' });
  } catch (error: any) {
    console.error('[UNLOCK ATTENDANCE ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to unlock attendance' });
  }
});

// ==========================================
// 4. STAFF & TEACHER ATTENDANCE OPERATIONS
// ==========================================

router.get('/staff/roster', requireAuth, requirePermission('attendance.staff.view'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const employeeType = req.query.employeeType as string | undefined;
    const departmentId = req.query.departmentId as string | undefined;

    let targetSchoolId = schoolId;
    if (user.roleName !== 'super_admin' && user.schoolId) {
      targetSchoolId = user.schoolId;
    }

    if (!checkSchoolScope(req, targetSchoolId)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    const params: any[] = [date];
    let whereSql = `WHERE e.employment_status = 'ACTIVE'`;

    if (targetSchoolId) {
      params.push(targetSchoolId);
      whereSql += ` AND e.school_id = $${params.length}`;
    }
    if (employeeType && employeeType !== 'All') {
      params.push(employeeType);
      whereSql += ` AND e.employee_type = $${params.length}`;
    }
    if (departmentId) {
      params.push(departmentId);
      whereSql += ` AND e.department_id = $${params.length}`;
    }

    // Check calendar event on this date
    const calRes = await db.query(`
      SELECT * FROM school_calendar_events WHERE date = $1 ${targetSchoolId ? 'AND school_id = $2' : ''} LIMIT 1
    `, targetSchoolId ? [date, targetSchoolId] : [date]);
    const calendarEvent = calRes.rows[0] || null;

    const rosterRes = await db.query(`
      SELECT
        e.id as employee_id,
        e.employee_id_number,
        e.employee_type,
        e.first_name,
        e.middle_name,
        e.last_name,
        e.profile_photo,
        d.name as department_name,
        des.name as designation_name,
        sa.id as attendance_id,
        sa.status,
        sa.check_in_time,
        sa.check_out_time,
        sa.work_duration_minutes,
        sa.remarks,
        sa.marked_by_name,
        sa.is_locked,
        sa.updated_at as marked_at
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN designations des ON des.id = e.designation_id
      LEFT JOIN staff_attendance sa ON sa.employee_id = e.id AND sa.date = $1
      ${whereSql}
      ORDER BY e.employee_type DESC, e.first_name ASC
    `, params);

    const staffList = rosterRes.rows.map((r: any) => ({
      employee_id: r.employee_id,
      employee_id_number: r.employee_id_number,
      employee_type: r.employee_type,
      name: `${r.first_name} ${r.middle_name || ''} ${r.last_name}`.replace(/\s+/g, ' ').trim(),
      profile_photo: r.profile_photo,
      department_name: r.department_name || 'General',
      designation_name: r.designation_name || 'Staff Member',
      attendance_id: r.attendance_id,
      status: r.status || null,
      check_in_time: r.check_in_time || '',
      check_out_time: r.check_out_time || '',
      work_duration_minutes: r.work_duration_minutes || 0,
      remarks: r.remarks || '',
      marked_by_name: r.marked_by_name || null,
      is_locked: !!r.is_locked,
      marked_at: r.marked_at || null
    }));

    const counts = {
      total: staffList.length,
      present: staffList.filter(s => s.status === 'PRESENT').length,
      absent: staffList.filter(s => s.status === 'ABSENT').length,
      late: staffList.filter(s => s.status === 'LATE').length,
      halfDay: staffList.filter(s => s.status === 'HALF_DAY').length,
      onLeave: staffList.filter(s => s.status === 'ON_LEAVE').length,
      weeklyOff: staffList.filter(s => s.status === 'WEEKLY_OFF').length,
      holiday: staffList.filter(s => s.status === 'HOLIDAY').length,
      unmarked: staffList.filter(s => s.status === null).length
    };

    res.json({
      schoolId: targetSchoolId,
      date,
      staff: staffList,
      counts,
      isMarked: counts.unmarked === 0 && counts.total > 0,
      calendarEvent
    });
  } catch (error: any) {
    console.error('[GET STAFF ROSTER ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch staff roster' });
  }
});

// Bulk Save Staff Attendance
router.post('/staff/bulk', requireAuth, requirePermission('attendance.staff.mark'), async (req, res) => {
  try {
    const { school_id, date, records = [] } = req.body;

    const targetSchoolId = school_id || req.user!.schoolId;
    if (!targetSchoolId || !checkSchoolScope(req, targetSchoolId)) {
      return res.status(403).json({ error: 'Access denied to target school' });
    }
    if (!date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Date and staff records array are required' });
    }

    const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'WEEKLY_OFF', 'HOLIDAY'];
    const markedByName = `${req.user!.firstName} ${req.user!.lastName}`.trim();

    let updatedCount = 0;
    for (const item of records) {
      if (!item.employee_id || !validStatuses.includes(item.status)) {
        continue;
      }

      // Check check_in vs check_out logic
      let durationMinutes = item.work_duration_minutes || 0;
      if (item.check_in_time && item.check_out_time) {
        const [inH, inM] = item.check_in_time.split(':').map(Number);
        const [outH, outM] = item.check_out_time.split(':').map(Number);
        const inTotal = inH * 60 + inM;
        const outTotal = outH * 60 + outM;

        if (outTotal < inTotal) {
          return res.status(400).json({
            error: `Check-out time (${item.check_out_time}) cannot be earlier than check-in time (${item.check_in_time}) for employee ${item.employee_id}.`
          });
        }
        durationMinutes = outTotal - inTotal;
      }

      const attId = item.attendance_id || `stfatt_${crypto.randomBytes(6).toString('hex')}`;
      await db.query(`
        INSERT INTO staff_attendance (
          id, school_id, employee_id, date, status, check_in_time, check_out_time,
          work_duration_minutes, remarks, marked_by_id, marked_by_name, is_locked, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, CURRENT_TIMESTAMP
        )
        ON CONFLICT (employee_id, date) DO UPDATE SET
          status = EXCLUDED.status,
          check_in_time = EXCLUDED.check_in_time,
          check_out_time = EXCLUDED.check_out_time,
          work_duration_minutes = EXCLUDED.work_duration_minutes,
          remarks = EXCLUDED.remarks,
          marked_by_id = EXCLUDED.marked_by_id,
          marked_by_name = EXCLUDED.marked_by_name,
          updated_at = CURRENT_TIMESTAMP
      `, [
        attId, targetSchoolId, item.employee_id, date, item.status,
        item.check_in_time || null, item.check_out_time || null,
        durationMinutes, item.remarks || '', req.user!.id, markedByName
      ]);
      updatedCount++;
    }

    await recordAuditLog({
      req,
      action: 'SAVE_STAFF_ATTENDANCE',
      module: 'Attendance',
      description: `Saved staff attendance for ${updatedCount} employees on ${date}`
    });

    res.json({ success: true, count: updatedCount, message: `Saved attendance for ${updatedCount} staff members.` });
  } catch (error: any) {
    console.error('[SAVE STAFF ATTENDANCE ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to save staff attendance' });
  }
});

// Single Staff Check-In / Check-Out Actions
router.post('/staff/check-in', requireAuth, requirePermission('attendance.staff.mark'), async (req, res) => {
  try {
    const { employee_id, date = new Date().toISOString().split('T')[0], check_in_time, remarks } = req.body;
    if (!employee_id) return res.status(400).json({ error: 'employee_id is required' });

    const empRes = await db.query('SELECT school_id, first_name, last_name FROM employees WHERE id = $1', [employee_id]);
    if (empRes.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    const emp = empRes.rows[0] as any;

    if (!checkSchoolScope(req, emp.school_id)) return res.status(403).json({ error: 'Access denied' });

    const nowTime = check_in_time || new Date().toTimeString().slice(0, 5);
    const markedByName = `${req.user!.firstName} ${req.user!.lastName}`.trim();
    const attId = `stfatt_${crypto.randomBytes(6).toString('hex')}`;

    await db.query(`
      INSERT INTO staff_attendance (
        id, school_id, employee_id, date, status, check_in_time, remarks, marked_by_id, marked_by_name
      ) VALUES ($1, $2, $3, $4, 'PRESENT', $5, $6, $7, $8)
      ON CONFLICT (employee_id, date) DO UPDATE SET
        check_in_time = EXCLUDED.check_in_time,
        status = CASE WHEN staff_attendance.status = 'ABSENT' THEN 'PRESENT' ELSE staff_attendance.status END,
        updated_at = CURRENT_TIMESTAMP
    `, [attId, emp.school_id, employee_id, date, nowTime, remarks || 'Checked in', req.user!.id, markedByName]);

    res.json({ success: true, check_in_time: nowTime, message: `Checked in successfully at ${nowTime}` });
  } catch (error: any) {
    console.error('[STAFF CHECK-IN ERROR]', error);
    res.status(500).json({ error: error?.message || 'Check-in failed' });
  }
});

router.post('/staff/check-out', requireAuth, requirePermission('attendance.staff.mark'), async (req, res) => {
  try {
    const { employee_id, date = new Date().toISOString().split('T')[0], check_out_time, remarks } = req.body;
    if (!employee_id) return res.status(400).json({ error: 'employee_id is required' });

    const existing = await db.query('SELECT * FROM staff_attendance WHERE employee_id = $1 AND date = $2', [employee_id, date]);
    if (existing.rows.length === 0) {
      return res.status(400).json({ error: 'Cannot check out before checking in. Please record check-in first.' });
    }
    const current = existing.rows[0] as any;
    const nowTime = check_out_time || new Date().toTimeString().slice(0, 5);

    if (current.check_in_time) {
      const [inH, inM] = current.check_in_time.split(':').map(Number);
      const [outH, outM] = nowTime.split(':').map(Number);
      if (outH * 60 + outM < inH * 60 + inM) {
        return res.status(400).json({ error: `Check-out time (${nowTime}) cannot be earlier than check-in time (${current.check_in_time}).` });
      }
    }

    await db.query(`
      UPDATE staff_attendance
      SET check_out_time = $1, remarks = COALESCE($2, remarks), updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = $3 AND date = $4
    `, [nowTime, remarks, employee_id, date]);

    res.json({ success: true, check_out_time: nowTime, message: `Checked out successfully at ${nowTime}` });
  } catch (error: any) {
    console.error('[STAFF CHECK-OUT ERROR]', error);
    res.status(500).json({ error: error?.message || 'Check-out failed' });
  }
});

// ==========================================
// 5. MONTHLY ATTENDANCE REGISTER & REPORTS
// ==========================================

// Student Monthly Register (1 to 31 columns)
router.get('/student/register', requireAuth, requirePermission('attendance.report.view'), async (req, res) => {
  try {
    const { schoolId, sessionId, classId, sectionId, month, year } = req.query as Record<string, string>;

    if (!schoolId || !sessionId || !classId || !sectionId || !month || !year) {
      return res.status(400).json({ error: 'schoolId, sessionId, classId, sectionId, month, and year are required' });
    }

    if (!checkSchoolScope(req, schoolId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

    const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // 1. Get School, Session, Class, Section metadata
    const [metaRes, calRes, studentsRes, attRes] = await Promise.all([
      db.query(`
        SELECT s.name as school_name, s.logo_url, s.code as school_code,
               ses.name as session_name, c.name as class_name, sec.name as section_name
        FROM schools s
        JOIN academic_sessions ses ON ses.id = $2
        JOIN classes c ON c.id = $3
        JOIN sections sec ON sec.id = $4
        WHERE s.id = $1
      `, [schoolId, sessionId, classId, sectionId]),
      db.query(`
        SELECT date, event_type, title, is_instructional_day
        FROM school_calendar_events
        WHERE school_id = $1 AND date >= $2 AND date <= $3
      `, [schoolId, startDate, endDate]),
      db.query(`
        SELECT id, admission_number, roll_number, first_name, middle_name, last_name, gender
        FROM students
        WHERE school_id = $1 AND session_id = $2 AND class_id = $3 AND section_id = $4 AND student_status = 'ACTIVE'
        ORDER BY COALESCE(NULLIF(roll_number, ''), '999')::int ASC, first_name ASC
      `, [schoolId, sessionId, classId, sectionId]),
      db.query(`
        SELECT student_id, date, status, arrival_time
        FROM student_attendance
        WHERE school_id = $1 AND class_id = $2 AND section_id = $3 AND date >= $4 AND date <= $5
      `, [schoolId, classId, sectionId, startDate, endDate])
    ]);

    const meta = metaRes.rows[0] || {};
    const holidaysMap: Record<string, any> = {};
    for (const h of calRes.rows as any[]) {
      const dStr = new Date(h.date).toISOString().split('T')[0];
      holidaysMap[dStr] = h;
    }

    // Build attendance mapping: student_id -> { 'YYYY-MM-DD': status }
    const attMap: Record<string, Record<string, any>> = {};
    for (const row of attRes.rows as any[]) {
      const dStr = new Date(row.date).toISOString().split('T')[0];
      if (!attMap[row.student_id]) attMap[row.student_id] = {};
      attMap[row.student_id][dStr] = row;
    }

    // Calculate instructional days in this month (exclude Sundays & official non-instructional holidays)
    let totalEligibleInstructionalDays = 0;
    const daysMeta: { day: number; date: string; isSunday: boolean; holiday?: any }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(dateStr).getDay(); // 0 is Sunday
      const isSunday = dayOfWeek === 0;
      const holiday = holidaysMap[dateStr];

      const isWorking = !isSunday && (!holiday || holiday.is_instructional_day);
      if (isWorking) {
        totalEligibleInstructionalDays++;
      }
      daysMeta.push({ day: d, date: dateStr, isSunday, holiday });
    }

    // Build student rows with aggregates
    const rows = studentsRes.rows.map((s: any) => {
      const name = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.replace(/\s+/g, ' ').trim();
      const daily: Record<number, string> = {};

      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let halfDayCount = 0;
      let onLeaveCount = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const record = attMap[s.id]?.[dateStr];

        if (record) {
          daily[d] = record.status;
          if (record.status === 'PRESENT') presentCount++;
          else if (record.status === 'LATE') lateCount++;
          else if (record.status === 'HALF_DAY') halfDayCount++;
          else if (record.status === 'ABSENT') absentCount++;
          else if (record.status === 'ON_LEAVE') onLeaveCount++;
        } else {
          // If Sunday or holiday
          const dm = daysMeta[d - 1];
          if (dm.isSunday) daily[d] = 'WO'; // Weekly off
          else if (dm.holiday && !dm.holiday.is_instructional_day) daily[d] = 'H'; // Holiday
          else daily[d] = '-'; // Unmarked
        }
      }

      // Percentage formula: Attended / Total eligible instructional days * 100
      // PRESENT=1, LATE=1, HALF_DAY=0.5
      const attendedDays = presentCount + lateCount + (halfDayCount * 0.5);
      const percentage = totalEligibleInstructionalDays > 0
        ? Math.round((attendedDays / totalEligibleInstructionalDays) * 1000) / 10
        : 0;

      return {
        student_id: s.id,
        admission_number: s.admission_number,
        roll_number: s.roll_number,
        name,
        gender: s.gender,
        daily,
        presentCount,
        absentCount,
        lateCount,
        halfDayCount,
        onLeaveCount,
        attendedDays,
        totalInstructionalDays: totalEligibleInstructionalDays,
        percentage
      };
    });

    res.json({
      meta,
      year: yearNum,
      month: monthNum,
      daysInMonth,
      totalInstructionalDays: totalEligibleInstructionalDays,
      daysMeta,
      students: rows
    });
  } catch (error: any) {
    console.error('[GET STUDENT MONTHLY REGISTER ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to generate monthly register' });
  }
});

// Student Monthly Register CSV Export
router.get('/student/register/export', requireAuth, requirePermission('attendance.student.export'), async (req, res) => {
  try {
    const { schoolId, sessionId, classId, sectionId, month, year } = req.query as Record<string, string>;
    if (!schoolId || !sessionId || !classId || !sectionId || !month || !year) {
      return res.status(400).send('Missing required parameters');
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const [studentsRes, attRes] = await Promise.all([
      db.query(`
        SELECT id, admission_number, roll_number, first_name, last_name
        FROM students
        WHERE school_id = $1 AND session_id = $2 AND class_id = $3 AND section_id = $4 AND student_status = 'ACTIVE'
        ORDER BY COALESCE(NULLIF(roll_number, ''), '999')::int ASC, first_name ASC
      `, [schoolId, sessionId, classId, sectionId]),
      db.query(`
        SELECT student_id, date, status
        FROM student_attendance
        WHERE school_id = $1 AND class_id = $2 AND section_id = $3 AND date >= $4 AND date <= $5
      `, [schoolId, classId, sectionId, startDate, endDate])
    ]);

    const attMap: Record<string, Record<string, string>> = {};
    for (const r of attRes.rows as any[]) {
      const d = new Date(r.date).toISOString().split('T')[0];
      if (!attMap[r.student_id]) attMap[r.student_id] = {};
      attMap[r.student_id][d] = r.status.slice(0, 1); // P, A, L, H
    }

    const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => `Day ${i + 1}`);
    const headers = ['Roll No', 'Admission No', 'Student Name', ...dayHeaders, 'Present', 'Absent', 'Percentage'];

    const rows = studentsRes.rows.map((s: any) => {
      let p = 0;
      let a = 0;
      const days = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const st = attMap[s.id]?.[dStr] || '-';
        if (st === 'P') p++;
        if (st === 'A') a++;
        days.push(`"${st}"`);
      }
      const pct = (p + a) > 0 ? Math.round((p / (p + a)) * 100) : 0;
      return [
        `"${s.roll_number || ''}"`,
        `"${s.admission_number || ''}"`,
        `"${s.first_name} ${s.last_name}"`,
        ...days,
        p,
        a,
        `"${pct}%"`
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Attendance_Class_${classId}_${year}_${month}.csv`);
    res.send(csv);
  } catch (error: any) {
    console.error('[EXPORT STUDENT ATTENDANCE CSV ERROR]', error);
    res.status(500).send('Export failed');
  }
});

// Staff Monthly Register
router.get('/staff/register', requireAuth, requirePermission('attendance.report.view'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined) || 'sch_vvps';
    const month = req.query.month as string;
    const year = req.query.year as string;
    const employeeType = req.query.employeeType as string;

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

    const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    let staffFilter = `WHERE e.school_id = $1 AND e.employment_status = 'ACTIVE'`;
    const params: any[] = [schoolId];
    if (employeeType && employeeType !== 'All') {
      params.push(employeeType);
      staffFilter += ` AND e.employee_type = $${params.length}`;
    }

    const [staffRes, attRes] = await Promise.all([
      db.query(`
        SELECT e.id, e.employee_id_number, e.employee_type, e.first_name, e.last_name,
               d.name as department_name, des.name as designation_name
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN designations des ON des.id = e.designation_id
        ${staffFilter}
        ORDER BY e.employee_type DESC, e.first_name ASC
      `, params),
      db.query(`
        SELECT employee_id, date, status, check_in_time, check_out_time
        FROM staff_attendance
        WHERE school_id = $1 AND date >= $2 AND date <= $3
      `, [schoolId, startDate, endDate])
    ]);

    const attMap: Record<string, Record<string, any>> = {};
    for (const r of attRes.rows as any[]) {
      const d = new Date(r.date).toISOString().split('T')[0];
      if (!attMap[r.employee_id]) attMap[r.employee_id] = {};
      attMap[r.employee_id][d] = r;
    }

    const staffData = staffRes.rows.map((s: any) => {
      const daily: Record<number, string> = {};
      let p = 0;
      let a = 0;
      let l = 0;
      let leave = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const record = attMap[s.id]?.[dStr];
        if (record) {
          daily[d] = record.status;
          if (record.status === 'PRESENT') p++;
          else if (record.status === 'ABSENT') a++;
          else if (record.status === 'LATE') l++;
          else if (record.status === 'ON_LEAVE') leave++;
        } else {
          daily[d] = '-';
        }
      }

      return {
        employee_id: s.id,
        employee_id_number: s.employee_id_number,
        employee_type: s.employee_type,
        name: `${s.first_name} ${s.last_name}`,
        department_name: s.department_name || 'General',
        designation_name: s.designation_name || 'Staff',
        daily,
        presentCount: p,
        absentCount: a,
        lateCount: l,
        leaveCount: leave
      };
    });

    res.json({
      schoolId,
      year: yearNum,
      month: monthNum,
      daysInMonth,
      staff: staffData
    });
  } catch (error: any) {
    console.error('[GET STAFF MONTHLY REGISTER ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to generate staff register' });
  }
});

// ==========================================
// 6. ATTENDANCE CORRECTION WORKFLOW
// ==========================================

router.get('/corrections', requireAuth, requirePermission('attendance.correction.request'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);
    const status = req.query.status as string | undefined;
    const recordType = req.query.recordType as string | undefined;

    const params: any[] = [];
    let query = `
      SELECT
        c.*,
        s.name as school_name,
        stu.first_name as student_first_name, stu.last_name as student_last_name, stu.admission_number,
        emp.first_name as employee_first_name, emp.last_name as employee_last_name, emp.employee_id_number
      FROM attendance_correction_requests c
      JOIN schools s ON s.id = c.school_id
      LEFT JOIN students stu ON stu.id = c.student_id
      LEFT JOIN employees emp ON emp.id = c.employee_id
      WHERE 1=1
    `;

    if (schoolId) {
      params.push(schoolId);
      query += ` AND c.school_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND c.status = $${params.length}`;
    }
    if (recordType) {
      params.push(recordType);
      query += ` AND c.record_type = $${params.length}`;
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await db.query(query, params);
    res.json({ corrections: result.rows });
  } catch (error: any) {
    console.error('[GET CORRECTIONS ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch correction requests' });
  }
});

// Submit Correction Request
router.post('/corrections', requireAuth, requirePermission('attendance.correction.request'), async (req, res) => {
  try {
    const {
      school_id,
      record_type,
      attendance_id,
      student_id,
      employee_id,
      target_date,
      previous_status,
      requested_status,
      reason,
      document_url
    } = req.body;

    const targetSchoolId = school_id || req.user!.schoolId;
    if (!targetSchoolId || !checkSchoolScope(req, targetSchoolId)) {
      return res.status(403).json({ error: 'Access denied to target school' });
    }

    if (!record_type || !attendance_id || !target_date || !previous_status || !requested_status || !reason) {
      return res.status(400).json({ error: 'record_type, attendance_id, target_date, previous_status, requested_status, and reason are required' });
    }

    const reqId = `corr_${crypto.randomBytes(6).toString('hex')}`;
    const requesterName = `${req.user!.firstName} ${req.user!.lastName}`.trim();

    await db.query(`
      INSERT INTO attendance_correction_requests (
        id, school_id, record_type, attendance_id, student_id, employee_id, target_date,
        previous_status, requested_status, reason, document_url, requested_by_id, requested_by_name, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'PENDING')
    `, [
      reqId, targetSchoolId, record_type, attendance_id,
      student_id || null, employee_id || null, target_date,
      previous_status, requested_status, reason, document_url || null,
      req.user!.id, requesterName
    ]);

    await recordAuditLog({
      req,
      action: 'SUBMIT_ATTENDANCE_CORRECTION',
      module: 'Attendance',
      recordId: reqId,
      description: `Submitted ${record_type} attendance correction request for date ${target_date} (from ${previous_status} to ${requested_status})`
    });

    res.status(201).json({ success: true, requestId: reqId, message: 'Correction request submitted for administrative review.' });
  } catch (error: any) {
    console.error('[SUBMIT CORRECTION REQUEST ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to submit correction request' });
  }
});

// Review (Approve / Reject) Correction Request
router.patch('/corrections/:id/review', requireAuth, requirePermission('attendance.correction.approve'), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, review_remarks } = req.body; // action: 'APPROVED' | 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ error: "Action must be 'APPROVED' or 'REJECTED'" });
    }

    const corrRes = await db.query('SELECT * FROM attendance_correction_requests WHERE id = $1', [id]);
    if (corrRes.rows.length === 0) {
      return res.status(404).json({ error: 'Correction request not found' });
    }
    const corr = corrRes.rows[0] as any;

    if (!checkSchoolScope(req, corr.school_id)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    // Cannot approve own request unless Super Admin
    if (req.user!.roleName !== 'super_admin' && req.user!.id === corr.requested_by_id) {
      return res.status(403).json({ error: 'Conflict of interest: You cannot approve your own attendance correction request.' });
    }

    const reviewerName = `${req.user!.firstName} ${req.user!.lastName}`.trim();

    if (action === 'APPROVED') {
      // Transactionally update the underlying attendance record
      if (corr.record_type === 'STUDENT') {
        await db.query(`
          UPDATE student_attendance
          SET status = $1, remarks = COALESCE(remarks || ' ', '') || $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [corr.requested_status, `[Corrected from ${corr.previous_status} by ${reviewerName}]`, corr.attendance_id]);
      } else {
        await db.query(`
          UPDATE staff_attendance
          SET status = $1, remarks = COALESCE(remarks || ' ', '') || $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [corr.requested_status, `[Corrected from ${corr.previous_status} by ${reviewerName}]`, corr.attendance_id]);
      }
    }

    await db.query(`
      UPDATE attendance_correction_requests
      SET status = $1, reviewed_by_id = $2, reviewed_by_name = $3, review_remarks = $4, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [action, req.user!.id, reviewerName, review_remarks || '', id]);

    await recordAuditLog({
      req,
      action: action === 'APPROVED' ? 'APPROVE_ATTENDANCE_CORRECTION' : 'REJECT_ATTENDANCE_CORRECTION',
      module: 'Attendance',
      recordId: id,
      description: `${action} attendance correction request ${id} (changed status to ${corr.requested_status})`
    });

    res.json({ success: true, message: `Correction request has been ${action.toLowerCase()}.` });
  } catch (error: any) {
    console.error('[REVIEW CORRECTION REQUEST ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to review correction request' });
  }
});

// ==========================================
// 7. PROFILE ATTENDANCE SUMMARIES
// ==========================================

// Student Profile Attendance Summary
router.get('/student/:studentId/summary', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;

    const stuRes = await db.query('SELECT id, school_id, session_id, class_id, section_id FROM students WHERE id = $1', [studentId]);
    if (stuRes.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    const student = stuRes.rows[0] as any;

    if (!checkSchoolScope(req, student.school_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get attendance totals
    const attCountsRes = await db.query(`
      SELECT status, count(*) as count
      FROM student_attendance
      WHERE student_id = $1
      GROUP BY status
    `, [studentId]);

    const counts: Record<string, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      HALF_DAY: 0,
      ON_LEAVE: 0
    };
    for (const r of attCountsRes.rows as any[]) {
      counts[r.status] = parseInt(r.count, 10);
    }

    // Total attended days
    const attendedDays = counts['PRESENT'] + counts['LATE'] + (counts['HALF_DAY'] * 0.5);
    const totalRecordedDays = counts['PRESENT'] + counts['ABSENT'] + counts['LATE'] + counts['HALF_DAY'] + counts['ON_LEAVE'];
    const percentage = totalRecordedDays > 0 ? Math.round((attendedDays / totalRecordedDays) * 1000) / 10 : 0;

    // Recent 15 daily attendance logs
    const logsRes = await db.query(`
      SELECT date, status, arrival_time, remarks, marked_by_name
      FROM student_attendance
      WHERE student_id = $1
      ORDER BY date DESC
      LIMIT 15
    `, [studentId]);

    // Monthly breakdown
    const monthlyRes = await db.query(`
      SELECT
        TO_CHAR(date, 'YYYY-MM') as month_str,
        COUNT(CASE WHEN status = 'PRESENT' THEN 1 END) as present,
        COUNT(CASE WHEN status = 'ABSENT' THEN 1 END) as absent,
        COUNT(CASE WHEN status = 'LATE' THEN 1 END) as late,
        COUNT(CASE WHEN status = 'HALF_DAY' THEN 1 END) as half_day,
        COUNT(CASE WHEN status = 'ON_LEAVE' THEN 1 END) as on_leave,
        COUNT(*) as total_days
      FROM student_attendance
      WHERE student_id = $1
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month_str DESC
    `, [studentId]);

    res.json({
      studentId,
      summary: {
        present: counts['PRESENT'],
        absent: counts['ABSENT'],
        late: counts['LATE'],
        halfDay: counts['HALF_DAY'],
        onLeave: counts['ON_LEAVE'],
        attendedDays,
        totalRecordedDays,
        percentage
      },
      recentLogs: logsRes.rows,
      monthlyBreakdown: monthlyRes.rows
    });
  } catch (error: any) {
    console.error('[GET STUDENT ATTENDANCE SUMMARY ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch student attendance summary' });
  }
});

// Employee Profile Attendance Summary
router.get('/employee/:employeeId/summary', requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;

    const empRes = await db.query('SELECT id, school_id FROM employees WHERE id = $1', [employeeId]);
    if (empRes.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    const emp = empRes.rows[0] as any;

    if (!checkSchoolScope(req, emp.school_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const countsRes = await db.query(`
      SELECT status, count(*) as count
      FROM staff_attendance
      WHERE employee_id = $1
      GROUP BY status
    `, [employeeId]);

    const counts: Record<string, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      HALF_DAY: 0,
      ON_LEAVE: 0,
      WEEKLY_OFF: 0,
      HOLIDAY: 0
    };
    for (const r of countsRes.rows as any[]) {
      counts[r.status] = parseInt(r.count, 10);
    }

    const workedDays = counts['PRESENT'] + counts['LATE'] + (counts['HALF_DAY'] * 0.5);
    const scheduledDays = counts['PRESENT'] + counts['ABSENT'] + counts['LATE'] + counts['HALF_DAY'] + counts['ON_LEAVE'];
    const percentage = scheduledDays > 0 ? Math.round((workedDays / scheduledDays) * 1000) / 10 : 0;

    const logsRes = await db.query(`
      SELECT date, status, check_in_time, check_out_time, work_duration_minutes, remarks
      FROM staff_attendance
      WHERE employee_id = $1
      ORDER BY date DESC
      LIMIT 15
    `, [employeeId]);

    const monthlyRes = await db.query(`
      SELECT
        TO_CHAR(date, 'YYYY-MM') as month_str,
        COUNT(CASE WHEN status = 'PRESENT' THEN 1 END) as present,
        COUNT(CASE WHEN status = 'ABSENT' THEN 1 END) as absent,
        COUNT(CASE WHEN status = 'LATE' THEN 1 END) as late,
        COUNT(CASE WHEN status = 'HALF_DAY' THEN 1 END) as half_day,
        COUNT(CASE WHEN status = 'ON_LEAVE' THEN 1 END) as on_leave,
        COUNT(*) as total_days
      FROM staff_attendance
      WHERE employee_id = $1
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month_str DESC
    `, [employeeId]);

    res.json({
      employeeId,
      summary: {
        present: counts['PRESENT'],
        absent: counts['ABSENT'],
        late: counts['LATE'],
        halfDay: counts['HALF_DAY'],
        onLeave: counts['ON_LEAVE'],
        weeklyOff: counts['WEEKLY_OFF'],
        holiday: counts['HOLIDAY'],
        workedDays,
        scheduledDays,
        percentage
      },
      recentLogs: logsRes.rows,
      monthlyBreakdown: monthlyRes.rows
    });
  } catch (error: any) {
    console.error('[GET EMPLOYEE ATTENDANCE SUMMARY ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch employee attendance summary' });
  }
});

export default router;
