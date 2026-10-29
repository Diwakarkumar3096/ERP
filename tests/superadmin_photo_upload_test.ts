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

// 1x1 pixel test images
const VALID_JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const VALID_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const VALID_WEBP = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
const INVALID_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

async function runPhotoTests() {
  console.log('--- STARTING SUPER ADMIN PROFILE PHOTO UPLOAD TESTS ---');
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
    if (!token) throw new Error('No token returned');
    console.log(`✓ Test 1 Passed: Authenticated as ${initialUser.displayName} (Role: ${initialUser.roleName})`);

    // 2. Unauthenticated access check (Security)
    console.log('[Test 2] Security Test: Uploading photo without auth token...');
    const unauthRes = await api('/api/auth/profile/photo', {
      method: 'POST',
      body: JSON.stringify({ photo: VALID_JPEG })
    });
    if (unauthRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${unauthRes.status}`);
    }
    console.log('✓ Test 2 Passed: Unauthenticated photo upload strictly blocked (401)');

    // 3. Upload Valid JPEG Photo
    console.log('[Test 3] Uploading valid JPEG profile photo...');
    const uploadJpgRes = await api('/api/auth/profile/photo', {
      method: 'POST',
      body: JSON.stringify({ photo: VALID_JPEG })
    }, token);

    if (uploadJpgRes.status !== 200) {
      throw new Error(`Upload failed with status ${uploadJpgRes.status}: ${JSON.stringify(uploadJpgRes.data)}`);
    }
    if (uploadJpgRes.data.avatarUrl !== VALID_JPEG) {
      throw new Error('avatarUrl mismatch in upload response');
    }
    if (uploadJpgRes.data.user.roleName !== 'super_admin') {
      throw new Error('Super admin role was altered during photo upload!');
    }
    console.log(`✓ Test 3 Passed: JPEG Photo uploaded successfully. Role preserved: ${uploadJpgRes.data.user.roleName}`);

    // 4. Verify GET /api/auth/me reflects the new photo
    console.log('[Test 4] Checking GET /api/auth/me returns updated avatarUrl...');
    const meRes = await api('/api/auth/me', { method: 'GET' }, token);
    if (meRes.status !== 200 || meRes.data.user.avatarUrl !== VALID_JPEG) {
      throw new Error(`avatarUrl not persisted in session. Got: ${meRes.data.user?.avatarUrl?.substring(0, 30)}`);
    }
    console.log('✓ Test 4 Passed: GET /api/auth/me contains valid updated avatarUrl');

    // 5. Upload Valid PNG and WEBP formats
    console.log('[Test 5] Testing PNG and WEBP profile photo uploads...');
    const uploadPngRes = await api('/api/auth/profile/photo', {
      method: 'POST',
      body: JSON.stringify({ photo: VALID_PNG })
    }, token);
    if (uploadPngRes.status !== 200 || uploadPngRes.data.avatarUrl !== VALID_PNG) {
      throw new Error(`PNG upload failed: ${JSON.stringify(uploadPngRes.data)}`);
    }

    const uploadWebpRes = await api('/api/auth/profile/photo', {
      method: 'POST',
      body: JSON.stringify({ photo: VALID_WEBP })
    }, token);
    if (uploadWebpRes.status !== 200 || uploadWebpRes.data.avatarUrl !== VALID_WEBP) {
      throw new Error(`WEBP upload failed: ${JSON.stringify(uploadWebpRes.data)}`);
    }
    console.log('✓ Test 5 Passed: Both PNG and WEBP formats accepted and stored');

    // 6. Validation Test: Unsupported format (GIF)
    console.log('[Test 6] Validation Test: Uploading unsupported format (GIF)...');
    const invalidFormatRes = await api('/api/auth/profile/photo', {
      method: 'POST',
      body: JSON.stringify({ photo: INVALID_GIF })
    }, token);
    if (invalidFormatRes.status !== 400 || !invalidFormatRes.data.error.includes('Please upload a JPG, PNG or WEBP image')) {
      throw new Error(`Expected 400 error 'Please upload a JPG, PNG or WEBP image.', got status ${invalidFormatRes.status}: ${JSON.stringify(invalidFormatRes.data)}`);
    }
    console.log(`✓ Test 6 Passed: Correctly rejected unsupported format with message: "${invalidFormatRes.data.error}"`);

    // 7. Validation Test: Oversize image (> 5 MB)
    console.log('[Test 7] Validation Test: Uploading oversize payload (> 5 MB)...');
    // Generate base64 string exceeding 5MB (approx 7MB of base64 characters)
    const largePayload = 'data:image/jpeg;base64,' + 'A'.repeat(7 * 1024 * 1024);
    const oversizeRes = await api('/api/auth/profile/photo', {
      method: 'POST',
      body: JSON.stringify({ photo: largePayload })
    }, token);
    if (oversizeRes.status !== 400 || !oversizeRes.data.error.includes('Image size must be less than 5 MB')) {
      throw new Error(`Expected 400 error 'Image size must be less than 5 MB.', got ${oversizeRes.status}: ${JSON.stringify(oversizeRes.data)}`);
    }
    console.log(`✓ Test 7 Passed: Correctly rejected oversize image with message: "${oversizeRes.data.error}"`);

    // 8. Verify Audit Logs for PROFILE_PHOTO_UPLOADED
    console.log('[Test 8] Verifying audit_logs for PROFILE_PHOTO_UPLOADED event...');
    const auditRes = await api('/api/audit-logs?action=PROFILE_PHOTO_UPLOADED', { method: 'GET' }, token);
    if (auditRes.status !== 200 || !auditRes.data.logs || auditRes.data.logs.length === 0) {
      throw new Error(`No PROFILE_PHOTO_UPLOADED records found in audit logs!`);
    }
    console.log(`✓ Test 8 Passed: Found ${auditRes.data.logs.length} PROFILE_PHOTO_UPLOADED record(s). Latest desc: "${auditRes.data.logs[0].description}"`);

    // 9. Remove Profile Photo (DELETE /api/auth/profile/photo)
    console.log('[Test 9] Removing profile photo (DELETE /api/auth/profile/photo)...');
    const deletePhotoRes = await api('/api/auth/profile/photo', { method: 'DELETE' }, token);
    if (deletePhotoRes.status !== 200) {
      throw new Error(`Delete photo failed with status ${deletePhotoRes.status}: ${JSON.stringify(deletePhotoRes.data)}`);
    }
    if (deletePhotoRes.data.avatarUrl !== null) {
      throw new Error(`Expected avatarUrl to be null, got: ${deletePhotoRes.data.avatarUrl}`);
    }
    console.log('✓ Test 9 Passed: Profile photo removed successfully. avatarUrl reset to null');

    // 10. Verify GET /api/auth/me shows photo is null
    console.log('[Test 10] Checking GET /api/auth/me after photo removal...');
    const meAfterDelete = await api('/api/auth/me', { method: 'GET' }, token);
    if (meAfterDelete.data.user.avatarUrl !== null) {
      throw new Error(`avatarUrl should be null, got: ${meAfterDelete.data.user.avatarUrl}`);
    }
    console.log('✓ Test 10 Passed: GET /api/auth/me confirms default avatar state (avatarUrl is null)');

    // 11. Verify Audit Logs for PROFILE_PHOTO_REMOVED
    console.log('[Test 11] Verifying audit_logs for PROFILE_PHOTO_REMOVED event...');
    const auditRemoveRes = await api('/api/audit-logs?action=PROFILE_PHOTO_REMOVED', { method: 'GET' }, token);
    if (auditRemoveRes.status !== 200 || !auditRemoveRes.data.logs || auditRemoveRes.data.logs.length === 0) {
      throw new Error(`No PROFILE_PHOTO_REMOVED records found in audit logs!`);
    }
    console.log(`✓ Test 11 Passed: Found ${auditRemoveRes.data.logs.length} PROFILE_PHOTO_REMOVED record(s). Latest desc: "${auditRemoveRes.data.logs[0].description}"`);

    // 12. Final Super Admin permissions & role integrity verification
    console.log('[Test 12] Final Super Admin RBAC integrity verification...');
    if (meAfterDelete.data.user.roleName !== 'super_admin') {
      throw new Error(`Role compromised: expected super_admin, got ${meAfterDelete.data.user.roleName}`);
    }
    if (!meAfterDelete.data.user.permissions || meAfterDelete.data.user.permissions.length === 0) {
      throw new Error('Super admin permissions list was cleared or corrupted!');
    }
    console.log(`✓ Test 12 Passed: Super Admin role and ${meAfterDelete.data.user.permissions.length} permissions remain 100% intact!`);

  } catch (error: any) {
    console.error('❌ Test failed with error:', error?.message || error);
    failures++;
  }

  if (failures === 0) {
    console.log('\n🎉 ALL SUPER ADMIN PROFILE PHOTO UPLOAD TESTS PASSED PERFECTLY!');
    process.exit(0);
  } else {
    console.error(`\n❌ ${failures} test(s) failed.`);
    process.exit(1);
  }
}

runPhotoTests();
