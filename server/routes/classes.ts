import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// GET classes
router.get('/', requireAuth, async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const sessionId = req.query.sessionId as string;

  if (schoolId && !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied to this school.' });
  }

  try {
    let query = `
      SELECT c.*, s.name as school_name, s.code as school_code, ses.name as session_name,
        (SELECT count(*) FROM sections sec WHERE sec.class_id = c.id AND sec.status = 'active') as sections_count,
        (SELECT COALESCE(SUM(sec.capacity), 0) FROM sections sec WHERE sec.class_id = c.id AND sec.status = 'active') as total_capacity
      FROM classes c
      JOIN schools s ON c.school_id = s.id
      JOIN academic_sessions ses ON c.session_id = ses.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (schoolId) {
      params.push(schoolId);
      query += ` AND c.school_id = $${params.length}`;
    }

    if (sessionId) {
      params.push(sessionId);
      query += ` AND c.session_id = $${params.length}`;
    }

    query += ` ORDER BY c.display_order ASC, c.numeric_grade ASC, c.name ASC`;
    const result = await db.query(query, params);

    // Also fetch sections list for each class if requested
    const classes = result.rows as any[];
    for (const cls of classes) {
      const secRes = await db.query(`
        SELECT * FROM sections WHERE class_id = $1 AND status = 'active' ORDER BY name ASC
      `, [cls.id]);
      cls.sections = secRes.rows;
    }

    return res.json({ classes });
  } catch (err: any) {
    console.error('[GET CLASSES ERROR]', err);
    return res.status(500).json({ error: 'Failed to retrieve classes.' });
  }
});

// POST create class
router.post('/', requireAuth, requirePermission('classes.create'), async (req, res) => {
  const { schoolId, sessionId, name, numericGrade, stream, displayOrder, initialSections } = req.body;

  const targetSchoolId = schoolId || req.user!.schoolId;
  if (!targetSchoolId) {
    return res.status(400).json({ error: 'School ID is required.' });
  }

  if (!checkSchoolScope(req, targetSchoolId)) {
    return res.status(403).json({ error: 'Cannot create classes for unauthorized school.' });
  }

  if (!name || !sessionId) {
    return res.status(400).json({ error: 'Class Name and Academic Session are required.' });
  }

  try {
    const classId = `cls_${targetSchoolId.replace('sch_', '')}_${Date.now()}`;

    await db.query(`
      INSERT INTO classes (id, school_id, session_id, name, numeric_grade, stream, display_order, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
    `, [
      classId,
      targetSchoolId,
      sessionId,
      name.trim(),
      numericGrade !== undefined ? parseInt(numericGrade, 10) : 1,
      stream || 'General',
      displayOrder !== undefined ? parseInt(displayOrder, 10) : 1
    ]);

    // If initial section letters provided (e.g. ['A', 'B'])
    if (Array.isArray(initialSections) && initialSections.length > 0) {
      for (const sec of initialSections) {
        const secId = `sec_${classId}_${sec.name ? sec.name.toLowerCase() : 'a'}_${Date.now().toString().slice(-3)}`;
        await db.query(`
          INSERT INTO sections (id, school_id, class_id, name, room_number, capacity, class_teacher_name, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
        `, [
          secId,
          targetSchoolId,
          classId,
          (sec.name || 'A').toUpperCase(),
          sec.roomNumber || null,
          sec.capacity ? parseInt(sec.capacity, 10) : 40,
          sec.classTeacherName || null
        ]);
      }
    } else {
      // Default create Section 'A'
      const secId = `sec_${classId}_a`;
      await db.query(`
        INSERT INTO sections (id, school_id, class_id, name, room_number, capacity, status)
        VALUES ($1, $2, $3, 'A', 'TBD', 40, 'active')
      `, [secId, targetSchoolId, classId]);
    }

    await recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: targetSchoolId,
      action: 'CREATE',
      module: 'CLASSES',
      recordId: classId,
      description: `Created class ${name} with sections for session ${sessionId}`
    });

    return res.status(201).json({ success: true, classId, message: 'Class created successfully.' });
  } catch (err: any) {
    console.error('[CREATE CLASS ERROR]', err);
    return res.status(500).json({ error: 'Failed to create class.' });
  }
});

// PUT update class
router.put('/:id', requireAuth, requirePermission('classes.edit'), async (req, res) => {
  const { id } = req.params;
  const { name, numericGrade, stream, displayOrder, status } = req.body;

  try {
    const clsRes = await db.query(`SELECT * FROM classes WHERE id = $1`, [id]);
    if (clsRes.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found.' });
    }
    const currentCls = clsRes.rows[0] as any;

    if (!checkSchoolScope(req, currentCls.school_id)) {
      return res.status(403).json({ error: 'Cannot modify class of another school.' });
    }

    await db.query(`
      UPDATE classes SET
        name = COALESCE($1, name),
        numeric_grade = COALESCE($2, numeric_grade),
        stream = COALESCE($3, stream),
        display_order = COALESCE($4, display_order),
        status = COALESCE($5, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [
      name ? name.trim() : null,
      numericGrade !== undefined ? parseInt(numericGrade, 10) : null,
      stream || null,
      displayOrder !== undefined ? parseInt(displayOrder, 10) : null,
      status || null,
      id
    ]);

    await recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: currentCls.school_id,
      action: 'UPDATE',
      module: 'CLASSES',
      recordId: id,
      description: `Updated class details for ${name || currentCls.name}`
    });

    return res.json({ success: true, message: 'Class updated successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update class.' });
  }
});

// DELETE class
router.delete('/:id', requireAuth, requirePermission('classes.delete'), async (req, res) => {
  const { id } = req.params;

  try {
    const clsRes = await db.query(`SELECT * FROM classes WHERE id = $1`, [id]);
    if (clsRes.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found.' });
    }
    const currentCls = clsRes.rows[0] as any;

    if (!checkSchoolScope(req, currentCls.school_id)) {
      return res.status(403).json({ error: 'Cannot delete class of another school.' });
    }

    // Soft delete safeguard
    await db.query(`UPDATE classes SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

    await recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId: currentCls.school_id,
      action: 'DELETE',
      module: 'CLASSES',
      recordId: id,
      description: `Deactivated class ${currentCls.name}`
    });

    return res.json({ success: true, message: 'Class deactivated successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete class.' });
  }
});

export default router;
