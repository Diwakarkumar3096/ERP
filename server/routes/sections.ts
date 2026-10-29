import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// GET sections
router.get('/', requireAuth, async (req, res) => {
  const classId = req.query.classId as string;
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  if (schoolId && !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied to this school.' });
  }

  try {
    let query = `
      SELECT sec.*, c.name as class_name, c.numeric_grade, s.name as school_name, s.code as school_code
      FROM sections sec
      JOIN classes c ON sec.class_id = c.id
      JOIN schools s ON sec.school_id = s.id
      WHERE sec.status = 'active'
    `;
    const params: any[] = [];

    if (classId) {
      params.push(classId);
      query += ` AND sec.class_id = $${params.length}`;
    }

    if (schoolId) {
      params.push(schoolId);
      query += ` AND sec.school_id = $${params.length}`;
    }

    query += ` ORDER BY c.display_order ASC, sec.name ASC`;
    const result = await db.query(query, params);
    return res.json({ sections: result.rows });
  } catch (err: any) {
    console.error('[GET SECTIONS ERROR]', err);
    return res.status(500).json({ error: 'Failed to retrieve sections.' });
  }
});

// POST create section
router.post('/', requireAuth, requirePermission('sections.create'), async (req, res) => {
  const { classId, name, roomNumber, capacity, classTeacherName } = req.body;

  if (!classId || !name) {
    return res.status(400).json({ error: 'Class ID and Section Name are required.' });
  }

  try {
    const classRes = await db.query(`SELECT school_id, name FROM classes WHERE id = $1`, [classId]);
    if (classRes.rows.length === 0) {
      return res.status(404).json({ error: 'Associated class not found.' });
    }
    const cls = classRes.rows[0] as any;

    if (!checkSchoolScope(req, cls.school_id)) {
      return res.status(403).json({ error: 'Cannot create section in another school.' });
    }

    const secId = `sec_${classId}_${name.trim().toLowerCase()}_${Date.now().toString().slice(-4)}`;

    await db.query(`
      INSERT INTO sections (id, school_id, class_id, name, room_number, capacity, class_teacher_name, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
    `, [
      secId,
      cls.school_id,
      classId,
      name.trim().toUpperCase(),
      roomNumber || null,
      capacity ? parseInt(capacity, 10) : 40,
      classTeacherName || null
    ]);

    await recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: cls.school_id,
      action: 'CREATE',
      module: 'SECTIONS',
      recordId: secId,
      description: `Added section ${name} to class ${cls.name}`
    });

    return res.status(201).json({ success: true, sectionId: secId, message: 'Section created successfully.' });
  } catch (err: any) {
    console.error('[CREATE SECTION ERROR]', err);
    return res.status(500).json({ error: 'Failed to create section.' });
  }
});

// PUT update section
router.put('/:id', requireAuth, requirePermission('sections.edit'), async (req, res) => {
  const { id } = req.params;
  const { name, roomNumber, capacity, classTeacherName, status } = req.body;

  try {
    const secRes = await db.query(`SELECT * FROM sections WHERE id = $1`, [id]);
    if (secRes.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found.' });
    }
    const sec = secRes.rows[0] as any;

    if (!checkSchoolScope(req, sec.school_id)) {
      return res.status(403).json({ error: 'Cannot edit section of another school.' });
    }

    await db.query(`
      UPDATE sections SET
        name = COALESCE($1, name),
        room_number = COALESCE($2, room_number),
        capacity = COALESCE($3, capacity),
        class_teacher_name = COALESCE($4, class_teacher_name),
        status = COALESCE($5, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [
      name ? name.trim().toUpperCase() : null,
      roomNumber !== undefined ? roomNumber : null,
      capacity !== undefined ? parseInt(capacity, 10) : null,
      classTeacherName !== undefined ? classTeacherName : null,
      status || null,
      id
    ]);

    await recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: sec.school_id,
      action: 'UPDATE',
      module: 'SECTIONS',
      recordId: id,
      description: `Updated section ${name || sec.name}`
    });

    return res.json({ success: true, message: 'Section updated successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update section.' });
  }
});

// DELETE section
router.delete('/:id', requireAuth, requirePermission('sections.delete'), async (req, res) => {
  const { id } = req.params;

  try {
    const secRes = await db.query(`SELECT * FROM sections WHERE id = $1`, [id]);
    if (secRes.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found.' });
    }
    const sec = secRes.rows[0] as any;

    if (!checkSchoolScope(req, sec.school_id)) {
      return res.status(403).json({ error: 'Cannot delete section of another school.' });
    }

    await db.query(`UPDATE sections SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

    await recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: sec.school_id,
      action: 'DELETE',
      module: 'SECTIONS',
      recordId: id,
      description: `Deactivated section ${sec.name}`
    });

    return res.json({ success: true, message: 'Section deactivated successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to deactivate section.' });
  }
});

export default router;
