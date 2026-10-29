import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function runDashboardRedesignTests() {
  console.log('--- STARTING DASHBOARD REDESIGN VALIDATION TESTS ---');

  // 1. Authenticate as Super Admin
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'superadmin',
      password: 'Admin@123'
    })
  });

  assert.strictEqual(loginRes.status, 200, 'Super admin login must return 200');
  const loginData = await loginRes.json();
  const token = loginData.token;
  assert.ok(token, 'Must return session token');
  console.log('✔ Authenticated successfully as Super Admin');

  // 2. Fetch Multi-School Global Dashboard Stats
  const globalRes = await fetch(`${BASE_URL}/api/dashboard/stats`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.strictEqual(globalRes.status, 200, 'Global dashboard stats must return 200');
  const globalData = await globalRes.json();

  // Validate Core Stats
  assert.ok(globalData.stats, 'Must return stats object');
  assert.strictEqual(typeof globalData.stats.totalStudents, 'number', 'totalStudents must be a number');
  assert.strictEqual(typeof globalData.stats.activeStudents, 'number', 'activeStudents must be a number');
  assert.strictEqual(typeof globalData.stats.totalStaff, 'number', 'totalStaff must be a number');
  console.log(`✔ Stats: ${globalData.stats.totalStudents} total students (${globalData.stats.activeStudents} active), ${globalData.stats.totalStaff} staff`);

  // Validate Attendance Overview
  const att = globalData.attendanceOverview;
  assert.ok(att, 'attendanceOverview must be present');
  assert.strictEqual(typeof att.todayPresent, 'number', 'todayPresent must be a number');
  assert.strictEqual(typeof att.todayAbsent, 'number', 'todayAbsent must be a number');
  assert.strictEqual(typeof att.todayRate, 'number', 'todayRate must be a number');
  assert.ok(att.attendanceDate, 'attendanceDate must be populated');
  console.log(`✔ Attendance: ${att.todayRate}% rate (${att.todayPresent} present, ${att.todayAbsent} absent, date: ${att.attendanceDate})`);

  // Validate Fees & Finance Overview
  const fee = globalData.feeOverview;
  assert.ok(fee, 'feeOverview must be present');
  assert.strictEqual(typeof fee.monthCollection, 'number', 'monthCollection must be a number');
  assert.strictEqual(typeof fee.totalOutstanding, 'number', 'totalOutstanding must be a number');
  assert.strictEqual(typeof fee.overdueCount, 'number', 'overdueCount must be a number');
  console.log(`✔ Fees: Month Realized ₹${fee.monthCollection}, Outstanding ₹${fee.totalOutstanding}, Overdue count: ${fee.overdueCount}`);

  // Validate Admissions Funnel
  const adm = globalData.admissionFunnel;
  assert.ok(adm, 'admissionFunnel must be present');
  assert.strictEqual(typeof adm.total, 'number', 'total admissions must be a number');
  assert.strictEqual(typeof adm.conversionRate, 'number', 'conversionRate must be a number');
  console.log(`✔ Admissions Funnel: ${adm.total} total dossiers, Conversion rate: ${adm.conversionRate}%`);

  // Validate Examination Performance
  const exam = globalData.examOverview;
  assert.ok(exam, 'examOverview must be present');
  assert.ok(Array.isArray(exam.upcomingExams), 'upcomingExams must be an array');
  assert.strictEqual(typeof exam.recentPerformance?.passPercentage, 'number', 'passPercentage must be a number');
  console.log(`✔ Examinations: ${exam.upcomingExams.length} upcoming terms, Pass rate: ${exam.recentPerformance.passPercentage}%`);

  // Validate Academics & Classroom
  const acad = globalData.academicOverview;
  assert.ok(acad, 'academicOverview must be present');
  assert.strictEqual(typeof acad.totalClasses, 'number', 'totalClasses must be a number');
  assert.strictEqual(typeof acad.totalSubjects, 'number', 'totalSubjects must be a number');
  console.log(`✔ Academics: ${acad.totalClasses} classes, ${acad.totalSubjects} subjects`);

  // Validate 12-Module Matrix Summary
  const mods = globalData.modulesSummary;
  assert.ok(mods, 'modulesSummary must be present');
  assert.ok(mods.students, 'Students module summary must be present');
  assert.ok(mods.attendance, 'Attendance module summary must be present');
  assert.ok(mods.fees, 'Fees module summary must be present');
  assert.ok(mods.exams, 'Exams module summary must be present');
  assert.ok(mods.academics, 'Academics module summary must be present');
  assert.ok(mods.admissions, 'Admissions module summary must be present');
  assert.ok(mods.communication, 'Communication module summary must be present');
  assert.ok(mods.transport, 'Transport module summary must be present');
  assert.ok(mods.hostel, 'Hostel module summary must be present');
  assert.ok(mods.library, 'Library module summary must be present');
  assert.ok(mods.inventory, 'Inventory module summary must be present');
  assert.ok(mods.hr, 'HR module summary must be present');
  console.log('✔ All 12 Module Summary Matrix metrics are successfully populated');

  // Validate Action Center & Attention Alerts
  const alerts = globalData.attentionAlerts;
  assert.ok(Array.isArray(alerts), 'attentionAlerts must be an array');
  alerts.forEach((alert: any) => {
    assert.ok(alert.id, 'Alert must have an id');
    assert.ok(['critical', 'warning', 'info', 'success'].includes(alert.severity), 'Alert must have valid severity');
    assert.ok(alert.title, 'Alert must have a title');
    assert.ok(alert.actionTab, 'Alert must specify actionTab');
  });
  console.log(`✔ Attention Center: ${alerts.length} actionable alerts generated`);

  // 3. School-Scoped Dashboard Stats
  const firstSchool = globalData.schools[0];
  assert.ok(firstSchool?.id, 'Must have at least one school');
  const scopedRes = await fetch(`${BASE_URL}/api/dashboard/stats?schoolId=${encodeURIComponent(firstSchool.id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.strictEqual(scopedRes.status, 200, 'School-scoped dashboard stats must return 200');
  const scopedData = await scopedRes.json();
  assert.strictEqual(scopedData.isSuperAdminView, false, 'Scoped view isSuperAdminView must be false');
  console.log(`✔ School Scoped view (${firstSchool.name}) validated`);

  console.log('\n--- ALL DASHBOARD REDESIGN TESTS PASSED SUCCESSFULLY! (10/10) ---');
}

runDashboardRedesignTests().catch((err) => {
  console.error('❌ Test failure:', err);
  process.exit(1);
});
