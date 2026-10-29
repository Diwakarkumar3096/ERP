const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function api(path: string, options: RequestInit = {}, token?: string): Promise<{ status: number; data: any; headers: Headers }> {
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

  return {
    status: res.status,
    data,
    headers: res.headers
  };
}

async function runTests() {
  console.log('--- STARTING SUPER ADMIN PROFILE & DISPLAY NAME TESTS ---');
  let failures = 0;

  try {
    // 1. Login as Super Admin
    console.log('[Test 1] Logging in as Super Admin (superadmin / Admin@123)...');
    const loginRes = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        usernameOrEmail: 'superadmin',
        password: 'Admin@123'
      })
    });

    if (loginRes.status !== 200) {
      throw new Error(`Login failed with status ${loginRes.status}: ${JSON.stringify(loginRes.data)}`);
    }

    const token = loginRes.data.token;
    const initialUser = loginRes.data.user;

    if (!token) throw new Error('No token returned from login');
    if (initialUser.roleName !== 'super_admin') throw new Error(`Expected roleName super_admin, got ${initialUser.roleName}`);
    console.log(`✓ Test 1 Passed: Authenticated as ${initialUser.displayName || initialUser.firstName} (Role: ${initialUser.roleName})`);

    // 2. Query GET /api/auth/profile
    console.log('[Test 2] Querying GET /api/auth/profile...');
    const profileRes = await api('/api/auth/profile', { method: 'GET' }, token);
    if (profileRes.status !== 200 || !profileRes.data.user) {
      throw new Error(`Profile returned status ${profileRes.status}: ${JSON.stringify(profileRes.data)}`);
    }
    console.log(`✓ Test 2 Passed: Profile returned username: ${profileRes.data.user.username}, role: ${profileRes.data.user.roleDisplayName}`);

    // 3. Update Super Admin Display Name to "Diwakar Kumar"
    console.log('[Test 3] Updating display name to "Diwakar Kumar"...');
    const updateRes1 = await api('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        firstName: 'Diwakar',
        lastName: 'Kumar',
        displayName: 'Diwakar Kumar',
        phone: '+91 98765 43210'
      })
    }, token);

    if (updateRes1.status !== 200) {
      throw new Error(`Update failed with status ${updateRes1.status}: ${JSON.stringify(updateRes1.data)}`);
    }
    if (updateRes1.data.user.displayName !== 'Diwakar Kumar') {
      throw new Error(`Expected displayName 'Diwakar Kumar', got '${updateRes1.data.user.displayName}'`);
    }
    if (updateRes1.data.user.roleName !== 'super_admin') {
      throw new Error(`Role changed! Expected 'super_admin', got '${updateRes1.data.user.roleName}'`);
    }
    console.log(`✓ Test 3 Passed: Successfully updated to 'Diwakar Kumar'. Role remains: ${updateRes1.data.user.roleName}`);

    // 4. Update Display Name to custom title: "Admin Director" (different from personal name)
    console.log('[Test 4] Updating display name to "Admin Director" (different from personal name)...');
    const updateRes2 = await api('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        firstName: 'Diwakar',
        lastName: 'Kumar',
        displayName: 'Admin Director',
        phone: '+91 98765 43210'
      })
    }, token);

    if (updateRes2.status !== 200) {
      throw new Error(`Update failed: ${JSON.stringify(updateRes2.data)}`);
    }
    if (updateRes2.data.user.displayName !== 'Admin Director') {
      throw new Error(`Expected displayName 'Admin Director', got '${updateRes2.data.user.displayName}'`);
    }
    if (updateRes2.data.user.firstName !== 'Diwakar') {
      throw new Error(`Expected firstName 'Diwakar', got '${updateRes2.data.user.firstName}'`);
    }
    console.log(`✓ Test 4 Passed: Display Name is 'Admin Director' while First Name is '${updateRes2.data.user.firstName}'`);

    // 5. Verify GET /api/auth/me returns the updated display name
    console.log('[Test 5] Checking GET /api/auth/me reflects display name...');
    const meRes = await api('/api/auth/me', { method: 'GET' }, token);
    if (meRes.status !== 200) {
      throw new Error(`GET /api/auth/me returned status ${meRes.status}`);
    }
    if (meRes.data.user.displayName !== 'Admin Director') {
      throw new Error(`Expected /api/auth/me to return 'Admin Director', got '${meRes.data.user.displayName}'`);
    }
    if (meRes.data.user.roleName !== 'super_admin') {
      throw new Error(`Expected super_admin role, got ${meRes.data.user.roleName}`);
    }
    console.log(`✓ Test 5 Passed: /api/auth/me returned displayName: ${meRes.data.user.displayName}`);

    // 6. Security & RBAC Immutability Test: attempt to pass unauthorized role fields
    console.log('[Test 6] Security Test: Attempting role tampering via profile update...');
    const tamperRes = await api('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        firstName: 'Diwakar',
        lastName: 'Kumar',
        displayName: 'Diwakar Kumar',
        roleId: 'role_student',
        role_id: 'role_student',
        permissions: ['unauthorized.action'],
        school_id: 'fake_school_id'
      })
    }, token);

    if (tamperRes.status !== 200) {
      throw new Error(`Tamper test returned unexpected status ${tamperRes.status}`);
    }
    if (tamperRes.data.user.roleName !== 'super_admin') {
      throw new Error(`Security breach! Role was tampered to: ${tamperRes.data.user.roleName}`);
    }
    console.log('✓ Test 6 Passed: Privilege escalation payloads strictly ignored. Role preserved as super_admin.');

    // 7. Verify Audit Log entry in DB via /api/audit-logs
    console.log('[Test 7] Verifying audit_logs for PROFILE_UPDATED events...');
    const auditRes = await api('/api/audit-logs?action=PROFILE_UPDATED', { method: 'GET' }, token);
    if (auditRes.status !== 200 || !auditRes.data.logs || auditRes.data.logs.length === 0) {
      throw new Error(`No PROFILE_UPDATED records found in audit logs! Response: ${JSON.stringify(auditRes.data)}`);
    }
    console.log(`✓ Test 7 Passed: Found ${auditRes.data.logs.length} PROFILE_UPDATED audit log record(s). Latest:`, auditRes.data.logs[0].details);

    // 8. Validation Test: Reject empty display name
    console.log('[Test 8] Validation Test: Attempting update with empty displayName...');
    const emptyNameRes = await api('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        firstName: 'Diwakar',
        lastName: 'Kumar',
        displayName: '   '
      })
    }, token);

    if (emptyNameRes.status === 400) {
      console.log('✓ Test 8 Passed: Successfully rejected invalid/empty displayName with 400 Bad Request.');
    } else {
      throw new Error(`Expected 400 Bad Request for empty displayName, got ${emptyNameRes.status}`);
    }

    // 9. Re-login test with the updated name
    console.log('[Test 9] Re-logging in to verify persistent session display name...');
    const reLoginRes = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        usernameOrEmail: 'superadmin',
        password: 'Admin@123'
      })
    });
    if (reLoginRes.data.user.displayName !== 'Diwakar Kumar') {
      throw new Error(`Expected re-login user to have displayName 'Diwakar Kumar', got '${reLoginRes.data.user.displayName}'`);
    }
    console.log(`✓ Test 9 Passed: Re-login returned user with persistent displayName: '${reLoginRes.data.user.displayName}' and role: '${reLoginRes.data.user.roleDisplayName}'`);

  } catch (error: any) {
    console.error('❌ Test failed with error:', error?.message || error);
    failures++;
  }

  if (failures === 0) {
    console.log('\n🎉 ALL SUPER ADMIN PROFILE TESTS PASSED PERFECTLY!');
    process.exit(0);
  } else {
    console.error(`\n❌ ${failures} test(s) failed.`);
    process.exit(1);
  }
}

runTests();
