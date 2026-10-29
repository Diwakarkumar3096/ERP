import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// GET all schools (filtered by user scope if not super admin)
router.get('/', requireAuth, async (req, res) => {
  try {
    let query = `
      SELECT s.*, 
        (SELECT count(*) FROM classes c WHERE c.school_id = s.id) as classes_count,
        (SELECT count(*) FROM sections sec WHERE sec.school_id = s.id) as sections_count,
        (SELECT count(*) FROM academic_sessions ses WHERE ses.school_id = s.id) as sessions_count,
        (SELECT count(*) FROM users u WHERE u.school_id = s.id) as users_count
      FROM schools s
    `;
    const params: any[] = [];

    // If user is locked to a school and lacks cross-school permission
    if (req.user!.schoolId && req.user!.roleName !== 'super_admin' && !req.user!.permissions.includes('schools.switch')) {
      query += ` WHERE s.id = $1`;
      params.push(req.user!.schoolId);
    }

    query += ` ORDER BY s.name ASC`;
    const result = await db.query(query, params);
    return res.json({ schools: result.rows });
  } catch (err: any) {
    console.error('[GET SCHOOLS ERROR]', err);
    return res.status(500).json({ error: 'Failed to retrieve schools list.' });
  }
});

// GET single school
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!checkSchoolScope(req, id)) {
    return res.status(403).json({ error: 'Access denied to this school branch.' });
  }

  try {
    const result = await db.query(`SELECT * FROM schools WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found.' });
    }
    return res.json({ school: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch school details.' });
  }
});

// POST create school
router.post('/', requireAuth, requirePermission('schools.create'), async (req, res) => {
  const { code, name, affiliationNo, board, email, phone, address, city, state, postalCode, establishedYear } = req.body;

  if (!code || !name) {
    return res.status(400).json({ error: 'School Code and School Name are required.' });
  }

  try {
    const id = `sch_${code.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString().slice(-4)}`;
    
    // Check if code exists
    const checkRes = await db.query(`SELECT id FROM schools WHERE LOWER(code) = LOWER($1)`, [code.trim()]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ error: `School Code '${code}' already exists.` });
    }

    await db.query(`
      INSERT INTO schools (
        id, code, name, affiliation_no, board, email, phone, address, city, state, postal_code, established_year, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
    `, [
      id,
      code.trim().toUpperCase(),
      name.trim(),
      affiliationNo || null,
      board || 'CBSE',
      email || null,
      phone || null,
      address || null,
      city || null,
      state || null,
      postalCode || null,
      establishedYear ? parseInt(establishedYear, 10) : null
    ]);

    // Create a default initial academic session for the new school
    const currentYear = new Date().getFullYear();
    const sessId = `sess_${id}_${currentYear}${currentYear + 1}`;
    await db.query(`
      INSERT INTO academic_sessions (id, school_id, name, start_date, end_date, is_current, status)
      VALUES ($1, $2, $3, $4, $5, true, 'active')
    `, [
      sessId,
      id,
      `${currentYear}-${(currentYear + 1).toString().slice(-2)}`,
      `${currentYear}-04-01`,
      `${currentYear + 1}-03-31`
    ]);

    await recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: id,
      action: 'CREATE',
      module: 'SCHOOLS',
      recordId: id,
      description: `Registered new school: ${name} (${code})`,
      newValues: { id, code, name, board }
    });

    return res.status(201).json({ success: true, schoolId: id, message: 'School created successfully.' });
  } catch (err: any) {
    console.error('[CREATE SCHOOL ERROR]', err);
    return res.status(500).json({ error: 'Failed to create school.' });
  }
});

// PUT update school
router.put('/:id', requireAuth, requirePermission('schools.edit'), async (req, res) => {
  const { id } = req.params;
  if (!checkSchoolScope(req, id)) {
    return res.status(403).json({ error: 'Forbidden from updating another school.' });
  }

  const { code, name, affiliationNo, board, email, phone, address, city, state, postalCode, establishedYear, status } = req.body;

  try {
    const prevRes = await db.query(`SELECT * FROM schools WHERE id = $1`, [id]);
    if (prevRes.rows.length === 0) {
      return res.status(404).json({ error: 'School not found.' });
    }
    const prev = prevRes.rows[0] as any;

    await db.query(`
      UPDATE schools SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        affiliation_no = $3,
        board = COALESCE($4, board),
        email = $5,
        phone = $6,
        address = $7,
        city = $8,
        state = $9,
        postal_code = $10,
        established_year = $11,
        status = COALESCE($12, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
    `, [
      code ? code.trim().toUpperCase() : null,
      name ? name.trim() : null,
      affiliationNo || null,
      board || null,
      email || null,
      phone || null,
      address || null,
      city || null,
      state || null,
      postalCode || null,
      establishedYear ? parseInt(establishedYear, 10) : null,
      status || null,
      id
    ]);

    await recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: id,
      action: 'UPDATE',
      module: 'SCHOOLS',
      recordId: id,
      description: `Updated school details for ${name || prev.name}`,
      oldValues: prev,
      newValues: req.body
    });

    return res.json({ success: true, message: 'School updated successfully.' });
  } catch (err: any) {
    console.error('[UPDATE SCHOOL ERROR]', err);
    return res.status(500).json({ error: 'Failed to update school.' });
  }
});

// DELETE / Deactivate school
router.delete('/:id', requireAuth, requirePermission('schools.delete'), async (req, res) => {
  const { id } = req.params;

  try {
    const schoolRes = await db.query(`SELECT * FROM schools WHERE id = $1`, [id]);
    if (schoolRes.rows.length === 0) {
      return res.status(404).json({ error: 'School not found.' });
    }
    const school = schoolRes.rows[0] as any;

    // Soft delete safeguard as instructed: status = 'inactive'
    await db.query(`UPDATE schools SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

    await recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: id,
      action: 'DEACTIVATE',
      module: 'SCHOOLS',
      recordId: id,
      description: `Deactivated school: ${school.name} (${school.code})`
    });

    return res.json({ success: true, message: 'School marked inactive.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to deactivate school.' });
  }
});

export default router;
