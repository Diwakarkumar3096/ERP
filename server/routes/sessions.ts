import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// GET sessions for a school
router.get('/', requireAuth, async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  if (schoolId && !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied to this school.' });
  }

  try {
    let query = `
      SELECT ses.*, s.name as school_name, s.code as school_code,
        (SELECT count(*) FROM classes c WHERE c.session_id = ses.id) as classes_count
      FROM academic_sessions ses
      JOIN schools s ON ses.school_id = s.id
    `;
    const params: any[] = [];

    if (schoolId) {
      query += ` WHERE ses.school_id = $1`;
      params.push(schoolId);
    } else if (req.user!.schoolId) {
      query += ` WHERE ses.school_id = $1`;
      params.push(req.user!.schoolId);
    }

    query += ` ORDER BY ses.start_date DESC`;
    const result = await db.query(query, params);
    return res.json({ sessions: result.rows });
  } catch (err: any) {
    console.error('[GET SESSIONS ERROR]', err);
    return res.status(500).json({ error: 'Failed to retrieve academic sessions.' });
  }
});

// POST create session
router.post('/', requireAuth, requirePermission('sessions.create'), async (req, res) => {
  const { schoolId, name, startDate, endDate, isCurrent, status } = req.body;

  const targetSchoolId = schoolId || req.user!.schoolId;
  if (!targetSchoolId) {
    return res.status(400).json({ error: 'School ID is required for academic session.' });
  }

  if (!checkSchoolScope(req, targetSchoolId)) {
    return res.status(403).json({ error: 'Cannot create session for unauthorized school.' });
  }

  if (!name || !startDate || !endDate) {
    return res.status(400).json({ error: 'Session Name, Start Date, and End Date are required.' });
  }

  try {
    const id = `sess_${targetSchoolId}_${Date.now()}`;

    // If marked current, deactivate others in this school
    if (isCurrent) {
      await db.query(`UPDATE academic_sessions SET is_current = false WHERE school_id = $1`, [targetSchoolId]);
    }

    await db.query(`
      INSERT INTO academic_sessions (id, school_id, name, start_date, end_date, is_current, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      id,
      targetSchoolId,
      name.trim(),
      startDate,
      endDate,
      !!isCurrent,
      status || 'active'
    ]);

    await recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: targetSchoolId,
      action: 'CREATE',
      module: 'SESSIONS',
      recordId: id,
      description: `Created academic session: ${name} (${startDate} to ${endDate})`,
      newValues: { id, targetSchoolId, name, startDate, endDate }
    });

    return res.status(201).json({ success: true, sessionId: id, message: 'Academic session created successfully.' });
  } catch (err: any) {
    console.error('[CREATE SESSION ERROR]', err);
    return res.status(500).json({ error: 'Failed to create academic session.' });
  }
});

// Activate session (switch active academic year)
router.post('/:id/activate', requireAuth, requirePermission('sessions.activate'), async (req, res) => {
  const { id } = req.params;

  try {
    const sessRes = await db.query(`SELECT * FROM academic_sessions WHERE id = $1`, [id]);
    if (sessRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    const session = sessRes.rows[0] as any;

    if (!checkSchoolScope(req, session.school_id)) {
      return res.status(403).json({ error: 'Cannot modify session of another school.' });
    }

    // Set all others to false
    await db.query(`UPDATE academic_sessions SET is_current = false WHERE school_id = $1`, [session.school_id]);
    // Set this one to true
    await db.query(`UPDATE academic_sessions SET is_current = true, status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

    await recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: session.school_id,
      action: 'ACTIVATE_SESSION',
      module: 'SESSIONS',
      recordId: id,
      description: `Activated academic session ${session.name} as current session`
    });

    return res.json({ success: true, message: `Academic session ${session.name} is now active.` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to activate academic session.' });
  }
});

// Update session
router.put('/:id', requireAuth, requirePermission('sessions.edit'), async (req, res) => {
  const { id } = req.params;
  const { name, startDate, endDate, status } = req.body;

  try {
    const sessRes = await db.query(`SELECT * FROM academic_sessions WHERE id = $1`, [id]);
    if (sessRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    const session = sessRes.rows[0] as any;

    if (!checkSchoolScope(req, session.school_id)) {
      return res.status(403).json({ error: 'Cannot edit session for another school.' });
    }

    await db.query(`
      UPDATE academic_sessions SET
        name = COALESCE($1, name),
        start_date = COALESCE($2, start_date),
        end_date = COALESCE($3, end_date),
        status = COALESCE($4, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [name, startDate, endDate, status, id]);

    await recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: session.school_id,
      action: 'UPDATE',
      module: 'SESSIONS',
      recordId: id,
      description: `Updated academic session ${name || session.name}`
    });

    return res.json({ success: true, message: 'Academic session updated.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update academic session.' });
  }
});

export default router;
