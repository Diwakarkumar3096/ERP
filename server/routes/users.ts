import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// GET users
router.get('/', requireAuth, requirePermission('users.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const roleId = req.query.roleId as string;
  const search = req.query.search as string;

  if (schoolId && !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied to this school.' });
  }

  try {
    let query = `
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.display_name, u.avatar_url, u.phone,
             u.school_id, u.role_id, u.status, u.last_login_at, u.created_at,
             r.name as role_name, r.display_name as role_display_name,
             s.name as school_name, s.code as school_code
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN schools s ON u.school_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (schoolId) {
      params.push(schoolId);
      query += ` AND u.school_id = $${params.length}`;
    } else if (req.user!.schoolId && req.user!.roleName !== 'super_admin' && !req.user!.permissions.includes('schools.switch')) {
      params.push(req.user!.schoolId);
      query += ` AND u.school_id = $${params.length}`;
    }

    if (roleId) {
      params.push(roleId);
      query += ` AND u.role_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      const pIdx = params.length;
      query += ` AND (LOWER(u.username) LIKE $${pIdx} OR LOWER(u.email) LIKE $${pIdx} OR LOWER(u.first_name) LIKE $${pIdx} OR LOWER(u.last_name) LIKE $${pIdx})`;
    }

    query += ` ORDER BY u.created_at DESC`;
    const result = await db.query(query, params);
    return res.json({ users: result.rows });
  } catch (err: any) {
    console.error('[GET USERS ERROR]', err);
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// POST create user
router.post('/', requireAuth, requirePermission('users.create'), async (req, res) => {
  const { username, email, password, firstName, lastName, phone, schoolId, roleId } = req.body;

  if (!username || !email || !password || !firstName || !lastName || !roleId) {
    return res.status(400).json({ error: 'Username, email, password, first name, last name, and role are required.' });
  }

  const targetSchoolId = schoolId || req.user!.schoolId || null;
  if (targetSchoolId && !checkSchoolScope(req, targetSchoolId)) {
    return res.status(403).json({ error: 'Cannot create user for unauthorized school.' });
  }

  try {
    // Check duplicates
    const checkDup = await db.query(`SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)`, [username.trim(), email.trim()]);
    if (checkDup.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already in use.' });
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const passwordHash = await bcrypt.hash(password, 10);

    await db.query(`
      INSERT INTO users (id, school_id, username, email, password_hash, first_name, last_name, phone, role_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
    `, [
      userId,
      targetSchoolId,
      username.trim(),
      email.trim().toLowerCase(),
      passwordHash,
      firstName.trim(),
      lastName.trim(),
      phone || null,
      roleId
    ]);

    await recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: targetSchoolId,
      action: 'CREATE_USER',
      module: 'USERS',
      recordId: userId,
      description: `Created user account for ${firstName} ${lastName} (${username}) with role ${roleId}`
    });

    return res.status(201).json({ success: true, userId, message: 'User account created successfully.' });
  } catch (err: any) {
    console.error('[CREATE USER ERROR]', err);
    return res.status(500).json({ error: 'Failed to create user.' });
  }
});

// PUT update user
router.put('/:id', requireAuth, requirePermission('users.edit'), async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, phone, schoolId, roleId, status } = req.body;

  try {
    const userRes = await db.query(`SELECT * FROM users WHERE id = $1`, [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const targetUser = userRes.rows[0] as any;

    if (targetUser.school_id && !checkSchoolScope(req, targetUser.school_id)) {
      return res.status(403).json({ error: 'Cannot modify user of another school.' });
    }

    await db.query(`
      UPDATE users SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        phone = COALESCE($3, phone),
        school_id = $4,
        role_id = COALESCE($5, role_id),
        status = COALESCE($6, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [
      firstName ? firstName.trim() : null,
      lastName ? lastName.trim() : null,
      phone !== undefined ? phone : null,
      schoolId !== undefined ? schoolId : targetUser.school_id,
      roleId || null,
      status || null,
      id
    ]);

    // If user is deactivated or suspended, immediately terminate active sessions
    if (status && status !== 'active') {
      await db.query(`DELETE FROM user_sessions WHERE user_id = $1`, [id]).catch(() => {});
    }

    await recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: targetUser.school_id,
      action: 'UPDATE_USER',
      module: 'USERS',
      recordId: id,
      description: `Updated user profile for ${targetUser.username}`,
      oldValues: { role_id: targetUser.role_id, status: targetUser.status },
      newValues: { roleId, status }
    });

    return res.json({ success: true, message: 'User updated successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user.' });
  }
});

// Reset user password
router.post('/:id/reset-password', requireAuth, requirePermission('users.reset_pwd'), async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  try {
    const userRes = await db.query(`SELECT username, school_id FROM users WHERE id = $1`, [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const target = userRes.rows[0] as any;

    if (target.school_id && !checkSchoolScope(req, target.school_id)) {
      return res.status(403).json({ error: 'Cannot reset credentials for unauthorized school user.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query(`UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [passwordHash, id]);

    // Invalidate existing sessions for this user
    await db.query(`DELETE FROM user_sessions WHERE user_id = $1`, [id]);

    await recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: target.school_id,
      action: 'RESET_PASSWORD',
      module: 'USERS',
      recordId: id,
      description: `Administrative password reset performed for user: ${target.username}`
    });

    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// DELETE / Deactivate user
router.delete('/:id', requireAuth, requirePermission('users.delete'), async (req, res) => {
  const { id } = req.params;

  try {
    const userRes = await db.query(`SELECT username, school_id FROM users WHERE id = $1`, [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const target = userRes.rows[0] as any;

    // Cannot delete own account
    if (id === req.user!.id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    }

    await db.query(`UPDATE users SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
    await db.query(`DELETE FROM user_sessions WHERE user_id = $1`, [id]);

    await recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: target.school_id,
      action: 'DEACTIVATE_USER',
      module: 'USERS',
      recordId: id,
      description: `Deactivated user account: ${target.username}`
    });

    return res.json({ success: true, message: 'User account marked inactive.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to deactivate user.' });
  }
});

export default router;
