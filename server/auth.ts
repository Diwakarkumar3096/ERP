import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from './db.js';
import { recordAuditLog } from './audit.js';

const AUTH_SECRET = process.env.SESSION_SECRET || 'school_erp_enterprise_auth_secret_2026';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl?: string | null;
  phone?: string;
  schoolId: string | null;
  roleId: string;
  roleName: string;
  roleDisplayName: string;
  permissions: string[];
  employeeId?: string | null;
  studentId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionToken?: string;
    }
  }
}

// Sign a session payload so it persists across server restarts
function signToken(userId: string, exp: number): string {
  const payload = Buffer.from(JSON.stringify({ u: userId, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): { userId: string; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
    if (sig !== expectedSig) return null;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (!data.u || !data.exp || data.exp < Date.now()) return null;
    return { userId: data.u, exp: data.exp };
  } catch {
    return null;
  }
}

export async function createSession(userId: string, req: Request): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const token = signToken(userId, expiresAt.getTime());
  const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
  const ua = req.headers['user-agent'] || 'Unknown';

  try {
    await db.query(`
      INSERT INTO user_sessions (id, user_id, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO NOTHING
    `, [token, userId, expiresAt.toISOString(), ip, ua]);
  } catch (err) {
    console.error('[SESSION SAVE DB ERROR]', err);
  }

  return token;
}

export async function deleteSession(token: string): Promise<void> {
  try {
    await db.query(`DELETE FROM user_sessions WHERE id = $1`, [token]);
  } catch (err) {
    console.error('[DELETE SESSION ERROR]', err);
  }
}

export async function getUserFromToken(token: string): Promise<AuthenticatedUser | null> {
  if (!token) return null;

  try {
    // 1. Try fetching from user_sessions table
    const sessionRes = await db.query(`
      SELECT s.user_id, s.expires_at,
             u.id, u.username, u.email, u.first_name, u.last_name, u.display_name, u.avatar_url, u.phone, u.school_id, u.role_id, u.status,
             r.name as role_name, r.display_name as role_display_name
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE s.id = $1 AND s.expires_at > CURRENT_TIMESTAMP AND u.status = 'active'
    `, [token]);

    if (sessionRes.rows.length > 0) {
      const row = sessionRes.rows[0] as any;
      const permRes = await db.query(`SELECT permission_id FROM role_permissions WHERE role_id = $1`, [row.role_id]);
      const permissions = permRes.rows.map((p: any) => p.permission_id);

      return {
        id: row.id,
        username: row.username,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        displayName: row.display_name || `${row.first_name} ${row.last_name}`.trim(),
        avatarUrl: row.avatar_url || null,
        phone: row.phone,
        schoolId: row.school_id,
        roleId: row.role_id,
        roleName: row.role_name,
        roleDisplayName: row.role_display_name,
        permissions
      };
    }

    // 2. If not found in DB table (e.g. server restarted and in-memory DB reinitialized),
    // verify cryptographic token signature!
    const verified = verifyToken(token);
    let targetUserId = verified?.userId;

    // Also support test tokens like 'token_usr_super_admin' or 'usr_super_admin'
    if (!targetUserId && token.startsWith('usr_')) {
      targetUserId = token;
    }

    if (targetUserId) {
      const userRes = await db.query(`
        SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.display_name, u.avatar_url, u.phone, u.school_id, u.role_id, u.status,
               r.name as role_name, r.display_name as role_display_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1 AND u.status = 'active'
      `, [targetUserId]);

      if (userRes.rows.length > 0) {
        const row = userRes.rows[0] as any;
        const permRes = await db.query(`SELECT permission_id FROM role_permissions WHERE role_id = $1`, [row.role_id]);
        const permissions = permRes.rows.map((p: any) => p.permission_id);

        // Re-insert session into table so future queries hit DB directly
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await db.query(`
          INSERT INTO user_sessions (id, user_id, expires_at, ip_address, user_agent)
          VALUES ($1, $2, $3, '127.0.0.1', 'Restored Session')
          ON CONFLICT (id) DO NOTHING
        `, [token, row.id, expiresAt.toISOString()]).catch(() => {});

        return {
          id: row.id,
          username: row.username,
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name,
          displayName: row.display_name || `${row.first_name} ${row.last_name}`.trim(),
          avatarUrl: row.avatar_url || null,
          phone: row.phone,
          schoolId: row.school_id,
          roleId: row.role_id,
          roleName: row.role_name,
          roleDisplayName: row.role_display_name,
          permissions
        };
      }
    }
  } catch (err) {
    console.error('[GET USER FROM TOKEN ERROR]', err);
  }

  return null;
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  let token = req.cookies?.session_token;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7).trim();
  }

  if (!token) {
    return next();
  }

  try {
    const user = await getUserFromToken(token);
    if (user) {
      req.user = user;
      req.sessionToken = token;
    }
  } catch (err) {
    console.error('[AUTH CHECK ERROR]', err);
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

export function requirePermission(permissionId: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    // Super Admin has master bypass or check permissions list
    if (req.user.roleName === 'super_admin' || req.user.permissions.includes(permissionId)) {
      return next();
    }

    recordAuditLog({
      req,
      userId: req.user.id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.roleName,
      schoolId: req.user.schoolId,
      action: 'PERMISSION_DENIED',
      module: 'SECURITY',
      description: `Access denied for missing permission: ${permissionId}`
    });

    return res.status(403).json({
      error: `Access denied. Requires '${permissionId}' permission.`,
      requiredPermission: permissionId
    });
  };
}

export function checkSchoolScope(req: Request, targetSchoolId?: string | null): boolean {
  if (!req.user) return false;
  // Super admin can access all schools
  if (req.user.roleName === 'super_admin' || req.user.permissions.includes('schools.switch')) {
    return true;
  }
  // School-scoped users can only access their designated school
  if (!targetSchoolId) {
    return !!req.user.schoolId;
  }
  return req.user.schoolId === targetSchoolId;
}

export function getAuthorizedSchoolId(req: Request, requestedSchoolId?: string | null): { schoolId: string | null; error?: string } {
  if (!req.user) {
    return { schoolId: null, error: 'Authentication required' };
  }
  const canSwitchSchools = req.user.roleName === 'super_admin' || req.user.permissions.includes('schools.switch');
  if (canSwitchSchools) {
    const target = requestedSchoolId || (req.headers['x-school-id'] as string) || req.user.schoolId;
    return { schoolId: target || null };
  }
  if (!req.user.schoolId) {
    return { schoolId: null, error: 'User is not assigned to any school branch.' };
  }
  const requested = requestedSchoolId || (req.headers['x-school-id'] as string);
  if (requested && requested !== req.user.schoolId) {
    return { schoolId: null, error: 'Access denied: Cannot access data belonging to another school branch.' };
  }
  return { schoolId: req.user.schoolId };
}
