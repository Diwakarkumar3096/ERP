import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, checkSchoolScope } from '../auth.js';

const router = Router();

// GET dashboard statistics with complete real metrics
router.get('/stats', requireAuth, async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  if (schoolId && !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied to this school dashboard.' });
  }

  try {
    const isSuperAdminView = !schoolId && (req.user!.roleName === 'super_admin' || req.user!.permissions.includes('schools.switch'));

    // 1. Schools summary
    const schoolsRes = await db.query(`
      SELECT s.*,
        (SELECT count(*) FROM classes c WHERE c.school_id = s.id AND c.status = 'active') as classes_count,
        (SELECT count(*) FROM sections sec WHERE sec.school_id = s.id AND sec.status = 'active') as sections_count,
        (SELECT count(*) FROM users u WHERE u.school_id = s.id AND u.status = 'active') as users_count,
        (SELECT name FROM academic_sessions ses WHERE ses.school_id = s.id AND ses.is_current = true LIMIT 1) as current_session_name
      FROM schools s
      ${schoolId ? 'WHERE s.id = $1' : ''}
      ORDER BY s.name ASC
    `, schoolId ? [schoolId] : []);

    // 2. Count aggregates
    let countFilters = '';
    const countParams: any[] = [];
    if (schoolId) {
      countFilters = 'WHERE school_id = $1';
      countParams.push(schoolId);
    }

    const whereActive = schoolId ? 'WHERE school_id = $1 AND status = \'active\'' : 'WHERE status = \'active\'';
    const classesCountRes = await db.query(`SELECT count(*) as count FROM classes ${whereActive}`, countParams);
    const sectionsCountRes = await db.query(`SELECT count(*) as count FROM sections ${whereActive}`, countParams);
    const usersCountRes = await db.query(`SELECT count(*) as count FROM users ${whereActive}`, countParams);
    const totalCapacityRes = await db.query(`SELECT COALESCE(SUM(capacity), 0) as capacity FROM sections ${whereActive}`, countParams);

    // Student & Parent metrics
    const studentFilter = schoolId ? 'WHERE school_id = $1' : '';
    const totalStudentsRes = await db.query(`SELECT count(*) as count FROM students ${studentFilter}`, schoolId ? [schoolId] : []);
    const activeStudentsRes = await db.query(`SELECT count(*) as count FROM students ${studentFilter ? studentFilter + " AND student_status = 'ACTIVE'" : "WHERE student_status = 'ACTIVE'"}`, schoolId ? [schoolId] : []);
    const inactiveStudentsRes = await db.query(`SELECT count(*) as count FROM students ${studentFilter ? studentFilter + " AND student_status != 'ACTIVE'" : "WHERE student_status != 'ACTIVE'"}`, schoolId ? [schoolId] : []);
    const totalParentsRes = await db.query(`SELECT count(*) as count FROM parents ${studentFilter}`, schoolId ? [schoolId] : []);

    // Staff metrics
    const staffFilter = schoolId ? 'WHERE school_id = $1' : '';
    const totalStaffRes = await db.query(`SELECT count(*) as count FROM employees ${staffFilter}`, schoolId ? [schoolId] : []);
    const activeStaffRes = await db.query(`SELECT count(*) as count FROM employees ${staffFilter ? staffFilter + " AND employment_status = 'ACTIVE'" : "WHERE employment_status = 'ACTIVE'"}`, schoolId ? [schoolId] : []);
    const teachingStaffRes = await db.query(`SELECT count(*) as count FROM employees ${staffFilter ? staffFilter + " AND employee_type = 'Teaching'" : "WHERE employee_type = 'Teaching'"}`, schoolId ? [schoolId] : []);
    const nonTeachingStaffRes = await db.query(`SELECT count(*) as count FROM employees ${staffFilter ? staffFilter + " AND employee_type = 'Non-Teaching'" : "WHERE employee_type = 'Non-Teaching'"}`, schoolId ? [schoolId] : []);

    // Demographics
    const maleRes = await db.query(`SELECT count(*) as count FROM students ${studentFilter ? studentFilter + " AND gender = 'Male'" : "WHERE gender = 'Male'"}`, schoolId ? [schoolId] : []);
    const femaleRes = await db.query(`SELECT count(*) as count FROM students ${studentFilter ? studentFilter + " AND gender = 'Female'" : "WHERE gender = 'Female'"}`, schoolId ? [schoolId] : []);
    const otherRes = await db.query(`SELECT count(*) as count FROM students ${studentFilter ? studentFilter + " AND gender = 'Other'" : "WHERE gender = 'Other'"}`, schoolId ? [schoolId] : []);

    // Class Enrollment & Active Student Counts
    const classEnrollQuery = `
      SELECT 
        c.name as class_name,
        c.numeric_grade,
        (SELECT count(*) FROM students s WHERE s.class_id = c.id AND s.student_status = 'ACTIVE') as student_count,
        COALESCE((SELECT sum(sec.capacity) FROM sections sec WHERE sec.class_id = c.id AND sec.status = 'active'), 0) as capacity
      FROM classes c
      ${schoolId ? 'WHERE c.school_id = $1 AND c.status = \'active\'' : 'WHERE c.status = \'active\''}
      ORDER BY c.numeric_grade ASC
    `;
    const classEnrollRes = await db.query(classEnrollQuery, schoolId ? [schoolId] : []);

    const classEnrollMap = new Map<string, { class_name: string; student_count: number; capacity: number }>();
    for (const row of classEnrollRes.rows as any[]) {
      const name = row.class_name;
      const count = parseInt(row.student_count || '0', 10);
      const cap = parseInt(row.capacity || '0', 10);
      if (classEnrollMap.has(name)) {
        const item = classEnrollMap.get(name)!;
        item.student_count += count;
        item.capacity += cap;
      } else {
        classEnrollMap.set(name, {
          class_name: name,
          student_count: count,
          capacity: cap
        });
      }
    }
    const cleanClassEnrollment = Array.from(classEnrollMap.values());

    // Stream Breakdown
    const gradeQuery = `
      SELECT c.stream, count(c.id) as class_count, sum((SELECT count(sec.id) FROM sections sec WHERE sec.class_id = c.id AND sec.status = 'active')) as section_count
      FROM classes c
      ${schoolId ? 'WHERE c.school_id = $1 AND c.status = \'active\'' : 'WHERE c.status = \'active\''}
      GROUP BY c.stream
      ORDER BY class_count DESC
    `;
    const gradeBreakdownRes = await db.query(gradeQuery, schoolId ? [schoolId] : []);

    // Monthly Fee Trends
    const feeTrendsQuery = `
      SELECT 
        TO_CHAR(payment_date, 'Mon') as month_name,
        EXTRACT(MONTH FROM payment_date) as month_num,
        EXTRACT(YEAR FROM payment_date) as year_num,
        COALESCE(SUM(amount), 0) as collected_amount,
        count(*) as transaction_count
      FROM fee_payments
      WHERE status = 'SUCCESS' ${schoolId ? 'AND school_id = $1' : ''}
      GROUP BY TO_CHAR(payment_date, 'Mon'), EXTRACT(MONTH FROM payment_date), EXTRACT(YEAR FROM payment_date)
      ORDER BY year_num ASC, month_num ASC
    `;
    const feeTrendsRes = await db.query(feeTrendsQuery, schoolId ? [schoolId] : []);

    const academicMonths = [
      { month: 'Apr', monthFull: 'April 2025', target: 35000 },
      { month: 'May', monthFull: 'May 2025', target: 12000 },
      { month: 'Jun', monthFull: 'June 2025', target: 12000 },
      { month: 'Jul', monthFull: 'July 2025', target: 25000 },
      { month: 'Aug', monthFull: 'August 2025', target: 12000 },
      { month: 'Sep', monthFull: 'September 2025', target: 12000 },
      { month: 'Oct', monthFull: 'October 2025', target: 25000 },
      { month: 'Nov', monthFull: 'November 2025', target: 10000 },
      { month: 'Dec', monthFull: 'December 2025', target: 10000 },
      { month: 'Jan', monthFull: 'January 2026', target: 20000 },
      { month: 'Feb', monthFull: 'February 2026', target: 10000 },
      { month: 'Mar', monthFull: 'March 2026', target: 15000 }
    ];

    const monthlyFeeTrends = academicMonths.map((m) => {
      const match = (feeTrendsRes.rows as any[]).find(
        (r) => r.month_name && r.month_name.toLowerCase().startsWith(m.month.toLowerCase())
      );
      const collected = match ? parseFloat(match.collected_amount || '0') : 0;
      const transactions = match ? parseInt(match.transaction_count || '0', 10) : 0;
      const rate = m.target > 0 ? Math.round((collected / m.target) * 100) : 0;
      return {
        month: m.month,
        monthFull: m.monthFull,
        collected,
        target: m.target,
        transactions,
        rate
      };
    });

    // 3. Real Attendance Breakdown (Today vs Latest Session)
    const todayAttRes = await db.query(`
      SELECT status, count(*) as count
      FROM student_attendance
      WHERE date = CURRENT_DATE ${schoolId ? 'AND school_id = $1' : ''}
      GROUP BY status
    `, schoolId ? [schoolId] : []);

    let attDate = new Date().toISOString().split('T')[0];
    let isToday = true;
    let attRows = todayAttRes.rows as any[];

    if (attRows.length === 0) {
      // Check latest date with attendance in database
      const latestDateRes = await db.query(`
        SELECT MAX(date)::text as latest_date FROM student_attendance ${schoolId ? 'WHERE school_id = $1' : ''}
      `, schoolId ? [schoolId] : []);
      const latestDate = (latestDateRes.rows[0] as any)?.latest_date;
      if (latestDate) {
        attDate = latestDate;
        isToday = false;
        const latestAttRes = await db.query(`
          SELECT status, count(*) as count
          FROM student_attendance
          WHERE date = $1 ${schoolId ? 'AND school_id = $2' : ''}
          GROUP BY status
        `, schoolId ? [latestDate, schoolId] : [latestDate]);
        attRows = latestAttRes.rows as any[];
      }
    }

    const presentCount = parseInt(attRows.find((r) => r.status === 'PRESENT')?.count || '0', 10);
    const absentCount = parseInt(attRows.find((r) => r.status === 'ABSENT')?.count || '0', 10);
    const lateCount = parseInt(attRows.find((r) => r.status === 'LATE')?.count || '0', 10);
    const halfDayCount = parseInt(attRows.find((r) => r.status === 'HALF_DAY')?.count || '0', 10);
    const leaveCount = parseInt(attRows.find((r) => r.status === 'LEAVE')?.count || '0', 10);
    const totalMarked = presentCount + absentCount + lateCount + halfDayCount + leaveCount;
    const overallRate = totalMarked > 0 ? Math.round(((presentCount + lateCount * 0.8) / totalMarked) * 100) : 0;

    // Staff Attendance
    const staffAttRes = await db.query(`
      SELECT status, count(*) as count
      FROM staff_attendance
      WHERE date = CURRENT_DATE ${schoolId ? 'AND school_id = $1' : ''}
      GROUP BY status
    `, schoolId ? [schoolId] : []);
    const staffPresent = parseInt((staffAttRes.rows as any[]).find((r) => r.status === 'PRESENT')?.count || '0', 10);
    const staffAbsent = parseInt((staffAttRes.rows as any[]).find((r) => r.status === 'ABSENT')?.count || '0', 10);
    const staffLeave = parseInt((staffAttRes.rows as any[]).find((r) => r.status === 'LEAVE')?.count || '0', 10);

    // Critical Attendance (< 75%)
    const criticalAttRes = await db.query(`
      SELECT count(*) as count FROM (
        SELECT student_id,
          ROUND(COUNT(CASE WHEN status = 'PRESENT' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as att_rate
        FROM student_attendance
        ${schoolId ? 'WHERE school_id = $1' : ''}
        GROUP BY student_id
        HAVING (COUNT(CASE WHEN status = 'PRESENT' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100) < 75
      ) critical_att
    `, schoolId ? [schoolId] : []);
    const criticalAttendanceCount = parseInt((criticalAttRes.rows[0] as any)?.count || '0', 10);

    // 4. Real Fees & Financial Metrics
    const todayFeeRes = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM fee_payments
      WHERE status = 'SUCCESS' AND payment_date = CURRENT_DATE
      ${schoolId ? 'AND school_id = $1' : ''}
    `, schoolId ? [schoolId] : []);

    const monthFeeRes = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM fee_payments
      WHERE status = 'SUCCESS'
        AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      ${schoolId ? 'AND school_id = $1' : ''}
    `, schoolId ? [schoolId] : []);

    const totalCollectedRes = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM fee_payments
      WHERE status = 'SUCCESS'
      ${schoolId ? 'AND school_id = $1' : ''}
    `, schoolId ? [schoolId] : []);

    const totalOutstandingRes = await db.query(`
      SELECT COALESCE(SUM(outstanding_amount), 0) as total
      FROM student_fee_charges
      WHERE status != 'PAID'
      ${schoolId ? 'AND school_id = $1' : ''}
    `, schoolId ? [schoolId] : []);

    const overdueChargesRes = await db.query(`
      SELECT count(*) as count, COALESCE(SUM(outstanding_amount), 0) as amount
      FROM student_fee_charges
      WHERE status != 'PAID' AND due_date < CURRENT_DATE
      ${schoolId ? 'AND school_id = $1' : ''}
    `, schoolId ? [schoolId] : []);

    const concessionsRes = await db.query(`
      SELECT COALESCE(SUM(concession_amount), 0) as total
      FROM student_fee_charges
      ${schoolId ? 'WHERE school_id = $1' : ''}
    `, schoolId ? [schoolId] : []);

    const feeOverview = {
      todayCollection: parseFloat((todayFeeRes.rows[0] as any)?.total || '0'),
      monthCollection: parseFloat((monthFeeRes.rows[0] as any)?.total || '0'),
      totalCollected: parseFloat((totalCollectedRes.rows[0] as any)?.total || '0'),
      totalOutstanding: parseFloat((totalOutstandingRes.rows[0] as any)?.total || '0'),
      totalConcessions: parseFloat((concessionsRes.rows[0] as any)?.total || '0'),
      overdueCount: parseInt((overdueChargesRes.rows[0] as any)?.count || '0', 10),
      overdueAmount: parseFloat((overdueChargesRes.rows[0] as any)?.amount || '0')
    };

    // 5. Real Admission Pipeline / Funnel
    const admissionFunnelRes = await db.query(`
      SELECT application_status, count(*) as count
      FROM admission_applications
      ${schoolId ? 'WHERE school_id = $1' : ''}
      GROUP BY application_status
    `, schoolId ? [schoolId] : []);

    const getAppCount = (statuses: string[]) => {
      return (admissionFunnelRes.rows as any[])
        .filter((r) => statuses.includes(r.application_status))
        .reduce((sum, r) => sum + parseInt(r.count || '0', 10), 0);
    };

    const submittedCount = getAppCount(['SUBMITTED', 'PENDING']);
    const underReviewCount = getAppCount(['UNDER_REVIEW']);
    const testCount = getAppCount(['TEST_SCHEDULED', 'ENTRANCE_TEST', 'TEST_PASSED']);
    const interviewCount = getAppCount(['INTERVIEW_SCHEDULED', 'INTERVIEW', 'INTERVIEW_CLEARED']);
    const selectedCount = getAppCount(['SELECTED']);
    const admittedCount = getAppCount(['ADMITTED', 'CONFIRMED']);
    const totalApps = (admissionFunnelRes.rows as any[]).reduce((sum, r) => sum + parseInt(r.count || '0', 10), 0);
    const conversionRate = totalApps > 0 ? Math.round((admittedCount / totalApps) * 100) : 0;

    const admissionFunnel = {
      submitted: submittedCount,
      underReview: underReviewCount,
      entranceTest: testCount,
      interview: interviewCount,
      selected: selectedCount,
      admitted: admittedCount,
      total: totalApps,
      conversionRate
    };

    // 6. Real Examinations & Academic Performance
    const upcomingExamsRes = await db.query(`
      SELECT e.id, e.name, e.code, e.start_date, e.end_date, e.status, e.weightage, et.name as type_name,
        (SELECT count(*) FROM examination_classes ec WHERE ec.examination_id = e.id) as classes_count
      FROM examinations e
      LEFT JOIN examination_types et ON e.type_id = et.id
      ${schoolId ? 'WHERE e.school_id = $1' : ''}
      ORDER BY e.start_date ASC
      LIMIT 5
    `, schoolId ? [schoolId] : []);

    const examPerfRes = await db.query(`
      SELECT 
        COUNT(*) as total_results,
        COALESCE(ROUND(AVG(overall_percentage), 1), 0) as average_percentage,
        COUNT(CASE WHEN result_status = 'PASSED' THEN 1 END) as passed_count,
        COALESCE(ROUND(COUNT(CASE WHEN result_status = 'PASSED' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1), 0) as pass_percentage
      FROM student_exam_results
      ${schoolId ? 'WHERE school_id = $1' : ''}
    `, schoolId ? [schoolId] : []);

    const examOverview = {
      upcomingExams: upcomingExamsRes.rows,
      recentPerformance: {
        totalResults: parseInt((examPerfRes.rows[0] as any)?.total_results || '0', 10),
        averagePercentage: parseFloat((examPerfRes.rows[0] as any)?.average_percentage || '0'),
        passedCount: parseInt((examPerfRes.rows[0] as any)?.passed_count || '0', 10),
        passPercentage: parseFloat((examPerfRes.rows[0] as any)?.pass_percentage || '0')
      }
    };

    // 7. Real Academics & Classroom Overview
    const subjectsRes = await db.query(`
      SELECT count(*) as count FROM subjects ${schoolId ? 'WHERE school_id = $1' : ''}
    `, schoolId ? [schoolId] : []);

    const homeworkRes = await db.query(`
      SELECT 
        count(*) as total,
        COUNT(CASE WHEN due_date >= CURRENT_DATE THEN 1 END) as active
      FROM homework
      ${schoolId ? 'WHERE school_id = $1' : ''}
    `, schoolId ? [schoolId] : []);

    const homeworkSubmissionsRes = await db.query(`
      SELECT count(*) as count
      FROM homework_submissions hs
      JOIN homework h ON hs.homework_id = h.id
      ${schoolId ? 'WHERE h.school_id = $1' : ''}
    `, schoolId ? [schoolId] : []);

    const academicOverview = {
      totalClasses: parseInt((classesCountRes.rows[0] as any).count, 10),
      totalSections: parseInt((sectionsCountRes.rows[0] as any).count, 10),
      totalSubjects: parseInt((subjectsRes.rows[0] as any)?.count || '0', 10),
      totalHomework: parseInt((homeworkRes.rows[0] as any)?.total || '0', 10),
      activeHomework: parseInt((homeworkRes.rows[0] as any)?.active || '0', 10),
      homeworkSubmissions: parseInt((homeworkSubmissionsRes.rows[0] as any)?.count || '0', 10)
    };

    // 8. Other Specialized Module Counters
    // Library
    const libraryRes = await db.query(`
      SELECT 
        (SELECT count(*) FROM library_books ${schoolId ? 'WHERE school_id = $1' : ''}) as total_books,
        (SELECT count(*) FROM library_issues WHERE status = 'ISSUED' ${schoolId ? 'AND school_id = $1' : ''}) as issued_books,
        (SELECT count(*) FROM library_issues WHERE status = 'ISSUED' AND due_date < CURRENT_DATE ${schoolId ? 'AND school_id = $1' : ''}) as overdue_books
    `, schoolId ? [schoolId] : []);
    const libStats = libraryRes.rows[0] as any;

    // Transport
    const transportRes = await db.query(`
      SELECT 
        (SELECT count(*) FROM vehicles ${schoolId ? 'WHERE school_id = $1' : ''}) as total_vehicles,
        (SELECT count(*) FROM transport_routes ${schoolId ? 'WHERE school_id = $1' : ''}) as total_routes,
        (SELECT count(*) FROM student_transport_enrollments WHERE status = 'ACTIVE' ${schoolId ? 'AND school_id = $1' : ''}) as transport_students
    `, schoolId ? [schoolId] : []);
    const transStats = transportRes.rows[0] as any;

    // Hostel
    const hostelRes = await db.query(`
      SELECT 
        (SELECT count(*) FROM hostel_rooms ${schoolId ? 'WHERE school_id = $1' : ''}) as total_rooms,
        (SELECT count(*) FROM hostel_beds WHERE status = 'OCCUPIED' ${schoolId ? 'AND school_id = $1' : ''}) as occupied_beds,
        (SELECT count(*) FROM hostel_beds ${schoolId ? 'WHERE school_id = $1' : ''}) as total_beds
    `, schoolId ? [schoolId] : []);
    const hostStats = hostelRes.rows[0] as any;

    // Inventory
    const inventoryRes = await db.query(`
      SELECT 
        (SELECT count(*) FROM inventory_items ${schoolId ? 'WHERE school_id = $1' : ''}) as total_items,
        (SELECT count(*) FROM inventory_items WHERE current_stock <= reorder_level ${schoolId ? 'AND school_id = $1' : ''}) as low_stock_items
    `, schoolId ? [schoolId] : []);
    const invStats = inventoryRes.rows[0] as any;

    // Communication
    const noticeBoardCountRes = await db.query(`
      SELECT count(*) as count FROM notice_board ${schoolId ? 'WHERE school_id = $1' : ''}
    `, schoolId ? [schoolId] : []);
    const noticesCount = parseInt((noticeBoardCountRes.rows[0] as any)?.count || '0', 10);

    const modulesSummary = {
      students: {
        total: parseInt((totalStudentsRes.rows[0] as any).count, 10),
        active: parseInt((activeStudentsRes.rows[0] as any).count, 10)
      },
      attendance: {
        rate: overallRate,
        present: presentCount,
        absent: absentCount
      },
      fees: {
        collected: feeOverview.monthCollection,
        outstanding: feeOverview.totalOutstanding,
        overdueCount: feeOverview.overdueCount
      },
      exams: {
        upcomingCount: upcomingExamsRes.rows.length,
        passRate: examOverview.recentPerformance.passPercentage
      },
      academics: {
        classes: academicOverview.totalClasses,
        subjects: academicOverview.totalSubjects,
        activeHomework: academicOverview.activeHomework
      },
      admissions: {
        total: admissionFunnel.total,
        pendingReview: admissionFunnel.submitted + admissionFunnel.underReview
      },
      communication: {
        noticesCount
      },
      transport: {
        vehiclesCount: parseInt(transStats?.total_vehicles || '0', 10),
        routesCount: parseInt(transStats?.total_routes || '0', 10),
        studentsCount: parseInt(transStats?.transport_students || '0', 10)
      },
      hostel: {
        roomsCount: parseInt(hostStats?.total_rooms || '0', 10),
        totalBeds: parseInt(hostStats?.total_beds || '0', 10),
        occupiedBeds: parseInt(hostStats?.occupied_beds || '0', 10)
      },
      library: {
        booksCount: parseInt(libStats?.total_books || '0', 10),
        issuedCount: parseInt(libStats?.issued_books || '0', 10),
        overdueCount: parseInt(libStats?.overdue_books || '0', 10)
      },
      inventory: {
        itemsCount: parseInt(invStats?.total_items || '0', 10),
        lowStockCount: parseInt(invStats?.low_stock_items || '0', 10)
      },
      hr: {
        totalStaff: parseInt((totalStaffRes.rows[0] as any).count, 10),
        teachingStaff: parseInt((teachingStaffRes.rows[0] as any).count, 10),
        nonTeachingStaff: parseInt((nonTeachingStaffRes.rows[0] as any).count, 10)
      }
    };

    // 9. Real Attention Alerts (Dynamic Action Center)
    const attentionAlerts: any[] = [];

    if (feeOverview.overdueCount > 0) {
      attentionAlerts.push({
        id: 'alert-fees-overdue',
        severity: 'critical',
        module: 'fees',
        title: 'Overdue Fee Collections',
        description: `${feeOverview.overdueCount} installment charges past their due dates with ₹${feeOverview.overdueAmount.toLocaleString('en-IN')} outstanding.`,
        count: feeOverview.overdueCount,
        actionTab: 'fees',
        actionLabel: 'Collect Overdue Fees'
      });
    }

    if (criticalAttendanceCount > 0) {
      attentionAlerts.push({
        id: 'alert-att-critical',
        severity: 'critical',
        module: 'attendance',
        title: 'Critical Student Attendance (<75%)',
        description: `${criticalAttendanceCount} students are falling below the mandatory 75% attendance threshold.`,
        count: criticalAttendanceCount,
        actionTab: 'attendance',
        actionLabel: 'View Attendance Records'
      });
    }

    if (admissionFunnel.submitted + admissionFunnel.underReview > 0) {
      attentionAlerts.push({
        id: 'alert-adm-pending',
        severity: 'warning',
        module: 'admissions',
        title: 'Pending Admission Applications',
        description: `${admissionFunnel.submitted + admissionFunnel.underReview} applicant dossiers awaiting eligibility verification & review.`,
        count: admissionFunnel.submitted + admissionFunnel.underReview,
        actionTab: 'admissions',
        actionLabel: 'Process Applications'
      });
    }

    const lowStockCount = parseInt(invStats?.low_stock_items || '0', 10);
    if (lowStockCount > 0) {
      attentionAlerts.push({
        id: 'alert-inv-low',
        severity: 'warning',
        module: 'inventory',
        title: 'Inventory Stock Alerts',
        description: `${lowStockCount} consumable stock items have reached or breached their minimum reorder thresholds.`,
        count: lowStockCount,
        actionTab: 'inventory',
        actionLabel: 'Restock Inventory'
      });
    }

    const overdueBooksCount = parseInt(libStats?.overdue_books || '0', 10);
    if (overdueBooksCount > 0) {
      attentionAlerts.push({
        id: 'alert-lib-overdue',
        severity: 'warning',
        module: 'library',
        title: 'Overdue Library Issues',
        description: `${overdueBooksCount} borrowed book copies are past return deadline and accumulating standard fines.`,
        count: overdueBooksCount,
        actionTab: 'library',
        actionLabel: 'Manage Library Returns'
      });
    }

    if (upcomingExamsRes.rows.length > 0) {
      attentionAlerts.push({
        id: 'alert-exam-upcoming',
        severity: 'info',
        module: 'examination',
        title: 'Upcoming Examination Cycles',
        description: `${upcomingExamsRes.rows.length} active examination terms are configured in the school timetable.`,
        count: upcomingExamsRes.rows.length,
        actionTab: 'exams',
        actionLabel: 'Check Exam Schedules'
      });
    }

    // 10. Real Upcoming Calendar Events
    const eventsRes = await db.query(`
      SELECT id, title, date as start_date, date as end_date, event_type, description
      FROM school_calendar_events
      ${schoolId ? 'WHERE school_id = $1' : ''}
      ORDER BY date ASC
      LIMIT 5
    `, schoolId ? [schoolId] : []);

    // 11. Real Notice Board Announcements
    const noticesRes = await db.query(`
      SELECT id, title, content, target_audience, priority, posted_date as publish_date
      FROM notice_board
      ${schoolId ? 'WHERE school_id = $1' : ''}
      ORDER BY posted_date DESC, created_at DESC
      LIMIT 5
    `, schoolId ? [schoolId] : []);

    // 12. Recent Audit Logs
    const auditQuery = `
      SELECT a.id, a.user_name, a.user_role, a.action, a.module, a.description, a.created_at, s.code as school_code
      FROM audit_logs a
      LEFT JOIN schools s ON a.school_id = s.id
      ${schoolId ? 'WHERE a.school_id = $1 OR a.school_id IS NULL' : ''}
      ORDER BY a.created_at DESC
      LIMIT 8
    `;
    const recentAuditRes = await db.query(auditQuery, schoolId ? [schoolId] : []);

    return res.json({
      isSuperAdminView,
      stats: {
        totalSchools: schoolsRes.rows.length,
        totalClasses: parseInt((classesCountRes.rows[0] as any).count, 10),
        totalSections: parseInt((sectionsCountRes.rows[0] as any).count, 10),
        totalUsers: parseInt((usersCountRes.rows[0] as any).count, 10),
        totalStudentCapacity: parseInt((totalCapacityRes.rows[0] as any).capacity, 10),
        totalStudents: parseInt((totalStudentsRes.rows[0] as any).count, 10),
        activeStudents: parseInt((activeStudentsRes.rows[0] as any).count, 10),
        inactiveStudents: parseInt((inactiveStudentsRes.rows[0] as any).count, 10),
        totalParents: parseInt((totalParentsRes.rows[0] as any).count, 10),
        totalStaff: parseInt((totalStaffRes.rows[0] as any).count, 10),
        activeStaff: parseInt((activeStaffRes.rows[0] as any).count, 10),
        teachingStaff: parseInt((teachingStaffRes.rows[0] as any).count, 10),
        nonTeachingStaff: parseInt((nonTeachingStaffRes.rows[0] as any).count, 10)
      },
      schools: schoolsRes.rows,
      streamBreakdown: gradeBreakdownRes.rows,
      studentDemographics: {
        totalMale: parseInt((maleRes.rows[0] as any).count, 10),
        totalFemale: parseInt((femaleRes.rows[0] as any).count, 10),
        totalOther: parseInt((otherRes.rows[0] as any).count, 10)
      },
      classEnrollment: cleanClassEnrollment,
      monthlyFeeTrends,
      attendanceOverview: {
        todayPresent: presentCount,
        todayAbsent: absentCount,
        todayLate: lateCount,
        todayHalfDay: halfDayCount,
        todayLeave: leaveCount,
        todayTotal: totalMarked,
        todayRate: overallRate,
        attendanceDate: attDate,
        isToday,
        criticalAttendanceCount,
        staffPresent,
        staffAbsent,
        staffLeave
      },
      feeOverview,
      admissionFunnel,
      examOverview,
      academicOverview,
      modulesSummary,
      attentionAlerts,
      upcomingEvents: eventsRes.rows,
      recentNotices: noticesRes.rows,
      recentActivity: recentAuditRes.rows
    });
  } catch (err: any) {
    console.error('[DASHBOARD STATS ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to retrieve dashboard stats.' });
  }
});

export default router;
