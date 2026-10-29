import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requirePermission } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// GET all roles
router.get('/', requireAuth, requirePermission('roles.view'), async (req, res) => {
  try {
    const rolesRes = await db.query(`
      SELECT r.*,
        (SELECT count(*) FROM role_permissions rp WHERE rp.role_id = r.id) as permissions_count,
        (SELECT count(*) FROM users u WHERE u.role_id = r.id) as users_count
      FROM roles r
      ORDER BY 
        CASE 
          WHEN r.name = 'super_admin' THEN 1 
          WHEN r.name = 'school_admin' THEN 2 
          WHEN r.name = 'principal' THEN 3
          WHEN r.name = 'teacher' THEN 4
          ELSE 5
        END, r.display_name ASC
    `);

    return res.json({ roles: rolesRes.rows });
  } catch (err: any) {
    console.error('[GET ROLES ERROR]', err);
    return res.status(500).json({ error: 'Failed to retrieve roles.' });
  }
});

// GET all available permissions grouped by module
router.get('/permissions', requireAuth, requirePermission('roles.view'), async (req, res) => {
  try {
    const permsRes = await db.query(`
      SELECT * FROM permissions ORDER BY module ASC, id ASC
    `);
    return res.json({ permissions: permsRes.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve permissions list.' });
  }
});

// GET single role with permissions
router.get('/:id', requireAuth, requirePermission('roles.view'), async (req, res) => {
  const { id } = req.params;

  try {
    const roleRes = await db.query(`SELECT * FROM roles WHERE id = $1`, [id]);
    if (roleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found.' });
    }

    const permsRes = await db.query(`
      SELECT permission_id FROM role_permissions WHERE role_id = $1
    `, [id]);

    const permissionIds = permsRes.rows.map((p: any) => p.permission_id);

    return res.json({
      role: roleRes.rows[0],
      permissionIds
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve role details.' });
  }
});

// POST create custom role
router.post('/', requireAuth, requirePermission('roles.create'), async (req, res) => {
  const { name, displayName, description, permissionIds } = req.body;

  if (!displayName) {
    return res.status(400).json({ error: 'Role display name is required.' });
  }

  const roleName = (name || displayName.toLowerCase().replace(/[^a-z0-9]/g, '_')).trim();
  const roleId = `role_${roleName}_${Date.now().toString().slice(-4)}`;

  try {
    await db.query(`
      INSERT INTO roles (id, name, display_name, description, is_system)
      VALUES ($1, $2, $3, $4, false)
    `, [roleId, roleName, displayName.trim(), description || null]);

    if (Array.isArray(permissionIds) && permissionIds.length > 0) {
      for (const pId of permissionIds) {
        await db.query(`
          INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [roleId, pId]);
      }
    }

    await recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      action: 'CREATE_ROLE',
      module: 'ROLES',
      recordId: roleId,
      description: `Created new custom role: ${displayName} (${roleName})`
    });

    return res.status(201).json({ success: true, roleId, message: 'Role created successfully.' });
  } catch (err: any) {
    console.error('[CREATE ROLE ERROR]', err);
    return res.status(500).json({ error: 'Failed to create role.' });
  }
});

// PUT update role permissions matrix
router.put('/:id/permissions', requireAuth, requirePermission('roles.edit'), async (req, res) => {
  const { id } = req.params;
  const { permissionIds, displayName, description } = req.body;

  try {
    const roleRes = await db.query(`SELECT * FROM roles WHERE id = $1`, [id]);
    if (roleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found.' });
    }
    const role = roleRes.rows[0] as any;

    // Prevent modifying super_admin permissions to prevent lockout
    if (role.name === 'super_admin' && req.user!.id !== 'usr_super_admin') {
      return res.status(403).json({ error: 'Super Admin permissions cannot be restricted.' });
    }

    // Update role display/desc if provided
    if (displayName || description !== undefined) {
      await db.query(`
        UPDATE roles SET 
          display_name = COALESCE($1, display_name),
          description = COALESCE($2, description)
        WHERE id = $3
      `, [displayName, description, id]);
    }

    // Replace permissions if permissionIds array provided
    if (Array.isArray(permissionIds)) {
      await db.query(`DELETE FROM role_permissions WHERE role_id = $1`, [id]);
      for (const pId of permissionIds) {
        await db.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
        `, [id, pId]);
      }
    }

    await recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      action: 'UPDATE_ROLE_PERMISSIONS',
      module: 'ROLES',
      recordId: id,
      description: `Updated permissions matrix for role: ${role.display_name}`,
      newValues: { permissionCount: permissionIds?.length }
    });

    return res.json({ success: true, message: `Permissions updated for ${role.display_name}.` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update role permissions.' });
  }
});

export default router;
