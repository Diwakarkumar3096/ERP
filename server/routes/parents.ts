import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// GET All Parents with filtering & linked wards
router.get('/', requireAuth, requirePermission('parents.view'), async (req, res) => {
  const { schoolId, search, page = '1', limit = '50' } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  try {
    let whereClauses: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (schoolId && typeof schoolId === 'string') {
      if (!checkSchoolScope(req, schoolId)) {
        return res.status(403).json({ error: 'Access denied to this school branch.' });
      }
      whereClauses.push(`p.school_id = $${pIdx++}`);
      params.push(schoolId);
    } else if (req.user!.schoolId && req.user!.roleName !== 'super_admin' && !req.user!.permissions.includes('schools.switch')) {
      whereClauses.push(`p.school_id = $${pIdx++}`);
      params.push(req.user!.schoolId);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      whereClauses.push(`(
        LOWER(p.name) LIKE $${pIdx} OR
        LOWER(p.mobile_number) LIKE $${pIdx} OR
        LOWER(COALESCE(p.email, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(p.occupation, '')) LIKE $${pIdx}
      )`);
      params.push(term);
      pIdx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT count(*) as total FROM parents p ${whereSql}`, params);
    const total = parseInt((countRes.rows[0] as any).total, 10);

    const dataRes = await db.query(`
      SELECT 
        p.*,
        sch.name as school_name,
        sch.code as school_code
      FROM parents p
      JOIN schools sch ON p.school_id = sch.id
      ${whereSql}
      ORDER BY p.name ASC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `, [...params, limitNum, offset]);

    const parents = dataRes.rows as any[];

    // Fetch linked wards for these parents
    for (const parent of parents) {
      const wardsRes = await db.query(`
        SELECT 
          s.id as student_id,
          s.first_name || ' ' || s.last_name as student_name,
          s.admission_number,
          c.name as class_name,
          sec.name as section_name,
          sp.relationship,
          sp.is_primary_guardian
        FROM student_parents sp
        JOIN students s ON sp.student_id = s.id
        JOIN classes c ON s.class_id = c.id
        JOIN sections sec ON s.section_id = sec.id
        WHERE sp.parent_id = $1
      `, [parent.id]);

      parent.wards = wardsRes.rows;
    }

    return res.json({
      parents,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err: any) {
    console.error('[GET PARENTS ERROR]', err);
    return res.status(500).json({ error: 'Failed to retrieve parents directory.' });
  }
});

// GET Single Parent
router.get('/:id', requireAuth, requirePermission('parents.view'), async (req, res) => {
  const { id } = req.params;

  try {
    const parentRes = await db.query(`
      SELECT p.*, sch.name as school_name
      FROM parents p
      JOIN schools sch ON p.school_id = sch.id
      WHERE p.id = $1
    `, [id]);

    if (parentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Parent record not found.' });
    }

    const parent = parentRes.rows[0] as any;
    if (!checkSchoolScope(req, parent.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const wardsRes = await db.query(`
      SELECT 
        s.id as student_id,
        s.first_name || ' ' || s.last_name as student_name,
        s.admission_number,
        c.name as class_name,
        sec.name as section_name,
        sp.relationship,
        sp.is_primary_guardian,
        sp.can_receive_notifications,
        sp.can_access_portal
      FROM student_parents sp
      JOIN students s ON sp.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      JOIN sections sec ON s.section_id = sec.id
      WHERE sp.parent_id = $1
    `, [id]);

    parent.wards = wardsRes.rows;

    return res.json({ parent });
  } catch (err: any) {
    console.error('[GET SINGLE PARENT ERROR]', err);
    return res.status(500).json({ error: 'Failed to retrieve parent record.' });
  }
});

// POST Create Parent
router.post('/', requireAuth, requirePermission('parents.create'), async (req, res) => {
  const {
    school_id,
    name,
    relationship_type = 'Father',
    mobile_number,
    alternate_mobile,
    email,
    occupation,
    address,
    city,
    district,
    state,
    pin_code,
    student_id,
    is_primary_guardian = false
  } = req.body;

  if (!school_id || !name?.trim() || !mobile_number?.trim()) {
    return res.status(400).json({ error: 'School ID, Name, and Mobile Number are required.' });
  }

  if (!checkSchoolScope(req, school_id)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const parentId = `par_${crypto.randomBytes(8).toString('hex')}`;

    await db.query(`
      INSERT INTO parents (
        id, school_id, name, relationship_type, mobile_number, alternate_mobile,
        email, occupation, address, city, district, state, pin_code
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13
      )
    `, [
      parentId, school_id, name.trim(), relationship_type, mobile_number.trim(), alternate_mobile || null,
      email || null, occupation || null, address || null, city || null, district || null, state || null, pin_code || null
    ]);

    // If linking directly to a student
    if (student_id) {
      await db.query(`
        INSERT INTO student_parents (
          id, student_id, parent_id, relationship, is_primary_guardian, can_receive_notifications, can_access_portal
        ) VALUES (
          $1, $2, $3, $4, $5, true, true
        )
      `, [`sp_${student_id}_${parentId}`, student_id, parentId, relationship_type, is_primary_guardian]);
    }

    await recordAuditLog({
      req,
      schoolId: school_id,
      action: 'PARENT_CREATE',
      module: 'PARENTS',
      recordId: parentId,
      description: `Created parent record for ${name} (${mobile_number})`
    });

    return res.status(201).json({ success: true, parentId, message: 'Parent record created successfully.' });
  } catch (err: any) {
    console.error('[CREATE PARENT ERROR]', err);
    return res.status(500).json({ error: 'Failed to create parent record.' });
  }
});

// PUT Update Parent
router.put('/:id', requireAuth, requirePermission('parents.edit'), async (req, res) => {
  const { id } = req.params;
  const {
    name,
    relationship_type,
    mobile_number,
    alternate_mobile,
    email,
    occupation,
    address,
    city,
    district,
    state,
    pin_code
  } = req.body;

  try {
    const existingRes = await db.query(`SELECT * FROM parents WHERE id = $1`, [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Parent record not found.' });
    }

    const currentParent = existingRes.rows[0] as any;
    if (!checkSchoolScope(req, currentParent.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    await db.query(`
      UPDATE parents SET
        name = COALESCE($1, name),
        relationship_type = COALESCE($2, relationship_type),
        mobile_number = COALESCE($3, mobile_number),
        alternate_mobile = COALESCE($4, alternate_mobile),
        email = COALESCE($5, email),
        occupation = COALESCE($6, occupation),
        address = COALESCE($7, address),
        city = COALESCE($8, city),
        district = COALESCE($9, district),
        state = COALESCE($10, state),
        pin_code = COALESCE($11, pin_code),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
    `, [
      name, relationship_type, mobile_number, alternate_mobile, email,
      occupation, address, city, district, state, pin_code, id
    ]);

    await recordAuditLog({
      req,
      schoolId: currentParent.school_id,
      action: 'PARENT_UPDATE',
      module: 'PARENTS',
      recordId: id,
      description: `Updated parent record for ${currentParent.name}`
    });

    return res.json({ success: true, message: 'Parent record updated successfully.' });
  } catch (err: any) {
    console.error('[UPDATE PARENT ERROR]', err);
    return res.status(500).json({ error: 'Failed to update parent record.' });
  }
});

// DELETE Parent
router.delete('/:id', requireAuth, requirePermission('parents.delete'), async (req, res) => {
  const { id } = req.params;

  try {
    const existingRes = await db.query(`SELECT * FROM parents WHERE id = $1`, [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Parent record not found.' });
    }

    const parent = existingRes.rows[0] as any;
    if (!checkSchoolScope(req, parent.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    await db.query(`DELETE FROM parents WHERE id = $1`, [id]);

    await recordAuditLog({
      req,
      schoolId: parent.school_id,
      action: 'PARENT_DELETE',
      module: 'PARENTS',
      recordId: id,
      description: `Deleted parent record for ${parent.name}`
    });

    return res.json({ success: true, message: 'Parent record removed.' });
  } catch (err: any) {
    console.error('[DELETE PARENT ERROR]', err);
    return res.status(500).json({ error: 'Failed to delete parent record.' });
  }
});

// POST Link Student to Parent
router.post('/:id/link-student', requireAuth, requirePermission('parents.edit'), async (req, res) => {
  const { id } = req.params;
  const { student_id, relationship = 'Guardian', is_primary_guardian = false, can_receive_notifications = true, can_access_portal = true } = req.body;

  if (!student_id) {
    return res.status(400).json({ error: 'Student ID is required.' });
  }

  try {
    const parentRes = await db.query(`SELECT school_id, name FROM parents WHERE id = $1`, [id]);
    if (parentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Parent record not found.' });
    }

    const parent = parentRes.rows[0] as any;
    if (!checkSchoolScope(req, parent.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const studentRes = await db.query(`SELECT id, first_name, last_name, school_id FROM students WHERE id = $1`, [student_id]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const student = studentRes.rows[0] as any;
    if (student.school_id !== parent.school_id) {
      return res.status(400).json({ error: 'Student and Parent must belong to the same school.' });
    }

    await db.query(`
      INSERT INTO student_parents (
        id, student_id, parent_id, relationship, is_primary_guardian, can_receive_notifications, can_access_portal
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
      ON CONFLICT (student_id, parent_id)
      DO UPDATE SET
        relationship = EXCLUDED.relationship,
        is_primary_guardian = EXCLUDED.is_primary_guardian,
        can_receive_notifications = EXCLUDED.can_receive_notifications,
        can_access_portal = EXCLUDED.can_access_portal
    `, [
      `sp_${student_id}_${id}`, student_id, id, relationship, is_primary_guardian, can_receive_notifications, can_access_portal
    ]);

    return res.json({ success: true, message: `Linked ${parent.name} to student ${student.first_name} ${student.last_name}.` });
  } catch (err: any) {
    console.error('[LINK STUDENT PARENT ERROR]', err);
    return res.status(500).json({ error: 'Failed to link student and parent.' });
  }
});

// DELETE Unlink Student from Parent
router.delete('/:id/unlink-student/:studentId', requireAuth, requirePermission('parents.edit'), async (req, res) => {
  const { id, studentId } = req.params;

  try {
    const parentRes = await db.query(`SELECT school_id FROM parents WHERE id = $1`, [id]);
    if (parentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Parent not found.' });
    }

    if (!checkSchoolScope(req, (parentRes.rows[0] as any).school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    await db.query(`DELETE FROM student_parents WHERE parent_id = $1 AND student_id = $2`, [id, studentId]);

    return res.json({ success: true, message: 'Unlinked parent from student successfully.' });
  } catch (err: any) {
    console.error('[UNLINK STUDENT PARENT ERROR]', err);
    return res.status(500).json({ error: 'Failed to unlink parent and student.' });
  }
});

export default router;
