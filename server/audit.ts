import { db } from './db.js';
import crypto from 'crypto';
import type { Request } from 'express';

export interface AuditLogParams {
  req?: Request;
  schoolId?: string | null;
  userId?: string | null;
  userName?: string;
  userRole?: string;
  action: string;
  module: string;
  recordId?: string | null;
  description: string;
  details?: Record<string, unknown> | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

export async function recordAuditLog(params: AuditLogParams) {
  try {
    const id = `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    let ip = '127.0.0.1';
    let userAgent = 'Unknown';

    if (params.req) {
      ip = (params.req.headers['x-forwarded-for'] as string) || params.req.ip || '127.0.0.1';
      userAgent = params.req.headers['user-agent'] || 'Unknown';
    }

    const oldValJson = params.oldValues ? JSON.stringify(params.oldValues) : null;
    const newValJson = params.newValues ? JSON.stringify(params.newValues) : (params.details ? JSON.stringify(params.details) : null);

    await db.query(`
      INSERT INTO audit_logs (
        id, school_id, user_id, user_name, user_role, action, module, record_id,
        description, ip_address, user_agent, old_values, new_values
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      id,
      params.schoolId || null,
      params.userId || null,
      params.userName || 'System',
      params.userRole || 'system',
      params.action,
      params.module,
      params.recordId || null,
      params.description,
      ip,
      userAgent,
      oldValJson,
      newValJson
    ]);
  } catch (err) {
    console.error('[AUDIT ERROR]', err);
  }
}
