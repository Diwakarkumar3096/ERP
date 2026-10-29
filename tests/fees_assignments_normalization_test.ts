import { api as clientApi } from '../src/services/api.js';
import { normalizeFeeAssignments } from '../src/components/fees/FeesManagementView.js';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function rawApi(path: string, options: RequestInit = {}, token?: string): Promise<{ status: number; data: any }> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.method && options.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });

  let data: any = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, data };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('--- STARTING FEES ASSIGNMENTS & DATA-FLOW NORMALIZATION TEST ---');
  let failures = 0;

  try {
    // 1. Authenticate as Super Admin
    console.log('[Test 1] Authenticating as Super Admin (superadmin / Admin@123)...');
    const loginRes = await rawApi('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        usernameOrEmail: 'superadmin',
        password: 'Admin@123'
      })
    });
    assert(loginRes.status === 200, `Login failed: ${JSON.stringify(loginRes.data)}`);
    const token = loginRes.data.token;
    assert(!!token, 'Auth token is missing');
    console.log('✓ Test 1 Passed: Successfully authenticated as Super Admin');

    // Store token in global storage mock so clientApi works
    if (typeof globalThis.localStorage === 'undefined') {
      const storage: Record<string, string> = { session_token: token };
      (globalThis as any).localStorage = {
        getItem: (k: string) => storage[k] || null,
        setItem: (k: string, v: string) => { storage[k] = v; },
        removeItem: (k: string) => { delete storage[k]; }
      };
    } else {
      localStorage.setItem('session_token', token);
    }

    // 2. Query Raw Backend Endpoint GET /api/fees/assignments
    console.log('[Test 2] Verifying raw backend GET /api/fees/assignments contract...');
    const rawAssignmentsRes = await rawApi('/api/fees/assignments?schoolId=sch_vvps', { method: 'GET' }, token);
    assert(rawAssignmentsRes.status === 200, `Raw assignments request failed with ${rawAssignmentsRes.status}`);
    assert(typeof rawAssignmentsRes.data === 'object' && rawAssignmentsRes.data !== null, 'Raw response must be an object');
    assert(Array.isArray(rawAssignmentsRes.data.assignments), 'Backend should wrap assignments in { assignments: [...] }');
    console.log(`✓ Test 2 Passed: Backend returns { assignments: [...] } with ${rawAssignmentsRes.data.assignments.length} assignments`);

    // 3. Verify Client Service Normalization via clientApi.fees.getAssignments
    console.log('[Test 3] Verifying clientApi.fees.getAssignments unwrap and normalization...');
    const normalizedAssignments = await clientApi.fees.getAssignments({ schoolId: 'sch_vvps' });
    assert(Array.isArray(normalizedAssignments), 'clientApi.fees.getAssignments MUST return a plain array');
    console.log(`✓ Test 3 Passed: clientApi.fees.getAssignments returned plain Array(length=${normalizedAssignments.length})`);

    // 4. Verify assignments.filter execution
    console.log('[Test 4] Testing assignments.filter(...) on normalized result...');
    const filtered = normalizedAssignments.filter((a) => {
      return a.outstanding_balance > 0 || (a.status && a.status !== 'PAID');
    });
    assert(Array.isArray(filtered), 'Filtered assignments must be an array');
    console.log(`✓ Test 4 Passed: assignments.filter executed cleanly without error (${filtered.length} matched)`);

    // 5. Verify Defensive Handling of Malformed/Wrapped Inputs via normalizeFeeAssignments
    console.log('[Test 5] Testing normalizeFeeAssignments validation layer across 10 edge-case inputs...');
    const malformedScenarios = [
      { name: 'Wrapped { assignments: [...] }', input: { assignments: [{ id: 'test_1', student_name: 'Alice' }] }, expectedLen: 1 },
      { name: 'Wrapped { data: [...] }', input: { data: [{ id: 'test_2', student_name: 'Bob' }] }, expectedLen: 1 },
      { name: 'Wrapped { rows: [...] }', input: { rows: [{ id: 'test_3', student_name: 'Charlie' }] }, expectedLen: 1 },
      { name: 'Wrapped { result: [...] }', input: { result: [{ id: 'test_4', student_name: 'David' }] }, expectedLen: 1 },
      { name: 'Single Assignment Object', input: { id: 'test_5', student_id: 'stu_1', student_name: 'Eve' }, expectedLen: 1 },
      { name: 'Empty Object {}', input: {}, expectedLen: 0 },
      { name: 'Null', input: null, expectedLen: 0 },
      { name: 'Undefined', input: undefined, expectedLen: 0 },
      { name: 'Error Object with non-array message', input: { error: 'Failed', code: 500 }, expectedLen: 0 },
      { name: 'Plain Array with null entries', input: [{ id: 'test_6', student_name: 'Frank' }, null, undefined], expectedLen: 1 }
    ];

    for (const sc of malformedScenarios) {
      const safeData = normalizeFeeAssignments(sc.input);
      assert(Array.isArray(safeData), `normalizeFeeAssignments MUST return an array for ${sc.name}`);
      assert(safeData.length === sc.expectedLen, `Length mismatch for ${sc.name}: got ${safeData.length}, expected ${sc.expectedLen}`);
      // Crucial: Ensure .filter can always be called without throwing
      const filtered = safeData.filter((x) => x.id);
      assert(Array.isArray(filtered), `.filter failed for ${sc.name}`);
    }
    console.log('✓ Test 5 Passed: All 10 normalization & validation edge-case scenarios passed and filtered cleanly');

    // 6. Verify clientApi.fees.getCategories normalization
    console.log('[Test 6] Verifying clientApi.fees.getCategories normalization...');
    const categories = await clientApi.fees.getCategories('sch_vvps');
    assert(Array.isArray(categories), 'getCategories MUST return an array');
    console.log(`✓ Test 6 Passed: getCategories returned Array(length=${categories.length})`);

    // 7. Verify clientApi.fees.getStructures normalization
    console.log('[Test 7] Verifying clientApi.fees.getStructures normalization...');
    const structures = await clientApi.fees.getStructures('sch_vvps');
    assert(Array.isArray(structures), 'getStructures MUST return an array');
    console.log(`✓ Test 7 Passed: getStructures returned Array(length=${structures.length})`);

    // 8. Verify clientApi.fees.getPayments normalization
    console.log('[Test 8] Verifying clientApi.fees.getPayments normalization...');
    const payments = await clientApi.fees.getPayments({ schoolId: 'sch_vvps' });
    assert(Array.isArray(payments), 'getPayments MUST return an array');
    const filteredPayments = payments.filter((p) => Number(p.amount) > 0);
    assert(Array.isArray(filteredPayments), 'payments.filter must execute without error');
    console.log(`✓ Test 8 Passed: getPayments returned Array(length=${payments.length}) and .filter executed cleanly`);

    // 9. Verify clientApi.fees.getConcessions normalization
    console.log('[Test 9] Verifying clientApi.fees.getConcessions normalization...');
    const concessions = await clientApi.fees.getConcessions({ schoolId: 'sch_vvps' });
    assert(Array.isArray(concessions), 'getConcessions MUST return an array');
    console.log(`✓ Test 9 Passed: getConcessions returned Array(length=${concessions.length})`);

    // 10. Verify clientApi.fees.getExpenses & getExpenseCategories normalization
    console.log('[Test 10] Verifying clientApi.fees.getExpenses & getExpenseCategories normalization...');
    const [expenses, expCategories] = await Promise.all([
      clientApi.fees.getExpenses({ schoolId: 'sch_vvps' }),
      clientApi.fees.getExpenseCategories('sch_vvps')
    ]);
    assert(Array.isArray(expenses), 'getExpenses MUST return an array');
    assert(Array.isArray(expCategories), 'getExpenseCategories MUST return an array');
    console.log(`✓ Test 10 Passed: getExpenses Array(${expenses.length}), getExpenseCategories Array(${expCategories.length})`);

    // 11. Verify clientApi.fees.getReminders normalization
    console.log('[Test 11] Verifying clientApi.fees.getReminders normalization...');
    const reminders = await clientApi.fees.getReminders({ schoolId: 'sch_vvps' });
    assert(Array.isArray(reminders), 'getReminders MUST return an array');
    console.log(`✓ Test 11 Passed: getReminders returned Array(length=${reminders.length})`);

    // 12. Verify clientApi.fees.searchStudents normalization
    console.log('[Test 12] Verifying clientApi.fees.searchStudents normalization...');
    const searchResults = await clientApi.fees.searchStudents('sch_vvps', 'a');
    assert(Array.isArray(searchResults), 'searchStudents MUST return an array');
    console.log(`✓ Test 12 Passed: searchStudents returned Array(length=${searchResults.length})`);

    console.log('\n======================================================');
    console.log('ALL 12 FEES NORMALIZATION & SAFETY TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');
  } catch (err: any) {
    console.error(`\n❌ TEST FAILURE: ${err.message}`);
    if (err.stack) console.error(err.stack);
    failures++;
  }

  process.exit(failures > 0 ? 1 : 0);
}

runTests();
