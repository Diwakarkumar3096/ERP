import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';

const router = Router();

// GET audit logs
router.get('/', requireAuth, requirePermission('audit.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const moduleName = req.query.module as string;
  const actionName = req.query.action as string;
  const search = req.query.search as string;
  const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);
  const offset = parseInt((req.query.offset as string) || '0', 10);

  if (schoolId && !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied to this school audit logs.' });
  }

  try {
    let query = `
      SELECT a.*, s.name as school_name, s.code as school_code
      FROM audit_logs a
      LEFT JOIN schools s ON a.school_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (schoolId) {
      params.push(schoolId);
      query += ` AND (a.school_id = $${params.length} OR a.school_id IS NULL)`;
    } else if (req.user!.schoolId && req.user!.roleName !== 'super_admin' && !req.user!.permissions.includes('schools.switch')) {
      params.push(req.user!.schoolId);
      query += ` AND (a.school_id = $${params.length} OR a.school_id IS NULL)`;
    }

    if (moduleName) {
      params.push(moduleName);
      query += ` AND a.module = $${params.length}`;
    }

    if (actionName) {
      params.push(actionName);
      query += ` AND a.action = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      const pIdx = params.length;
      query += ` AND (LOWER(a.description) LIKE $${pIdx} OR LOWER(a.user_name) LIKE $${pIdx} OR LOWER(a.action) LIKE $${pIdx})`;
    }

    // Count query
    const countRes = await db.query(`SELECT count(*) as total FROM (${query}) q`, params);
    const totalCount = parseInt((countRes.rows[0] as any).total || '0', 10);

    query += ` ORDER BY a.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    const result = await db.query(query, params);

    return res.json({
      logs: result.rows,
      pagination: {
        total: totalCount,
        limit,
        offset
      }
    });
  } catch (err: any) {
    console.error('[GET AUDIT LOGS ERROR]', err);
    return res.status(500).json({ error: 'Failed to retrieve audit trail.' });
  }
});

// GET export audit logs as CSV
router.get('/export', requireAuth, requirePermission('audit.export'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    let query = `
      SELECT a.created_at, a.user_name, a.user_role, a.action, a.module, a.description, a.ip_address, s.name as school_name
      FROM audit_logs a
      LEFT JOIN schools s ON a.school_id = s.id
    `;
    const params: any[] = [];

    if (schoolId && req.user!.roleName !== 'super_admin') {
      params.push(schoolId);
      query += ` WHERE a.school_id = $1 OR a.school_id IS NULL`;
    }

    query += ` ORDER BY a.created_at DESC LIMIT 500`;
    const result = await db.query(query, params);

    // Build CSV string
    const headers = ['Timestamp', 'School', 'User', 'Role', 'Module', 'Action', 'Description', 'IP'];
    const csvRows = [headers.join(',')];

    for (const r of result.rows as any[]) {
      const escape = (val: any) => `"${(val || '').toString().replace(/"/g, '""')}"`;
      csvRows.push([
        escape(new Date(r.created_at).toISOString()),
        escape(r.school_name || 'All / System'),
        escape(r.user_name),
        escape(r.user_role),
        escape(r.module),
        escape(r.action),
        escape(r.description),
        escape(r.ip_address)
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="school_erp_audit_log.csv"');
    return res.send(csvRows.join('\n'));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to export audit logs.' });
  }
});

export default router;
