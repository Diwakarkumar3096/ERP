import { Router } from 'express';
import { db } from '../db.js';
import { authenticateToken, getAuthorizedSchoolId } from '../auth.js';
import {
  dispatchWorkflowEvent,
  processApprovalDecision,
  checkAndEscalateSLAs,
  generateDailyOperationalBriefing,
  analyzeWorkflowBottlenecks,
  evaluateConditionGroup
} from '../workflowEngine.js';

const router = Router();
router.use(authenticateToken);

// Helper to extract authorized school_id
function getSchoolId(req: any): string {
  const { schoolId, error } = getAuthorizedSchoolId(req);
  if (error || !schoolId) {
    return req.user?.schoolId || 'sch_vvps';
  }
  return schoolId;
}

// -------------------------------------------------------------
// 1. WORKFLOW DASHBOARD AGGREGATE STATS
// -------------------------------------------------------------
router.get('/dashboard', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const userId = req.user?.id;
    const userRole = req.user?.role || 'school_admin';

    // 1. Pending Approvals
    const approvalsRes = await db.query(
      `SELECT
        COUNT(*) as total_pending,
        COUNT(CASE WHEN priority = 'CRITICAL' THEN 1 END) as critical_pending,
        COUNT(CASE WHEN safety_level = 'LEVEL_3_RESTRICTED' THEN 1 END) as restricted_pending,
        COUNT(CASE WHEN sla_deadline < CURRENT_TIMESTAMP THEN 1 END) as overdue_sla
       FROM approval_requests
       WHERE school_id = $1 AND status IN ('PENDING', 'IN_REVIEW')`,
      [schoolId]
    );

    // 2. Smart Tasks
    const tasksRes = await db.query(
      `SELECT
        COUNT(*) as total_open,
        COUNT(CASE WHEN due_date < CURRENT_TIMESTAMP AND status != 'COMPLETED' THEN 1 END) as overdue_tasks,
        COUNT(CASE WHEN priority = 'CRITICAL' THEN 1 END) as critical_tasks,
        COUNT(CASE WHEN assigned_to_user_id = $2 OR assigned_to_role = $3 THEN 1 END) as my_assigned_tasks
       FROM workflow_tasks
       WHERE school_id = $1 AND status IN ('OPEN', 'IN_PROGRESS', 'WAITING')`,
      [schoolId, userId, userRole]
    );

    // 3. Workflows & Rules Stats
    const workflowsRes = await db.query(
      `SELECT
        (SELECT COUNT(*) FROM workflow_definitions WHERE school_id = $1 AND status = 'ACTIVE') as active_workflows,
        (SELECT COUNT(*) FROM automation_rules WHERE school_id = $1 AND is_active = TRUE) as active_rules,
        (SELECT COUNT(*) FROM workflow_instances WHERE school_id = $1 AND status = 'RUNNING') as running_instances,
        (SELECT COUNT(*) FROM automation_execution_logs WHERE school_id = $1 AND COALESCE(timestamp, executed_at) >= CURRENT_DATE) as today_rule_executions`,
      [schoolId]
    );

    // 4. Department Workload
    const deptRes = await db.query(
      `SELECT assigned_to_department as department,
              COUNT(*) as total,
              COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
              COUNT(CASE WHEN due_date < CURRENT_TIMESTAMP AND status != 'COMPLETED' THEN 1 END) as overdue
       FROM workflow_tasks
       WHERE school_id = $1
       GROUP BY assigned_to_department
       ORDER BY total DESC`,
      [schoolId]
    );

    // 5. Recent Audit Activity
    const activityRes = await db.query(
      `SELECT id, instance_id, step_name, action_taken, actor_name, remarks, timestamp
       FROM workflow_step_logs
       WHERE school_id = $1
       ORDER BY timestamp DESC
       LIMIT 8`,
      [schoolId]
    );

    res.json({
      success: true,
      stats: {
        approvals: approvalsRes.rows[0] || {},
        tasks: tasksRes.rows[0] || {},
        workflows: workflowsRes.rows[0] || {},
        departmentWorkload: deptRes.rows || [],
        recentActivity: activityRes.rows || []
      }
    });
  } catch (err: any) {
    console.error('[WORKFLOW DASHBOARD ERROR]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 2. WORKFLOW DEFINITIONS & VERSIONS
// -------------------------------------------------------------
router.get('/definitions', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { module, status } = req.query;

    let query = `SELECT w.*,
                 (SELECT COUNT(*) FROM workflow_steps s WHERE s.workflow_id = w.id) as step_count,
                 (SELECT COUNT(*) FROM workflow_instances i WHERE i.workflow_id = w.id AND i.status = 'RUNNING') as active_instances
                 FROM workflow_definitions w
                 WHERE w.school_id = $1`;
    const params: any[] = [schoolId];

    if (module) {
      params.push(module);
      query += ` AND w.module = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND w.status = $${params.length}`;
    }

    query += ` ORDER BY w.code ASC`;

    const result = await db.query(query, params);
    res.json({ success: true, definitions: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/definitions/:id', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const defRes = await db.query(
      `SELECT * FROM workflow_definitions WHERE id = $1 AND school_id = $2`,
      [req.params.id, schoolId]
    );
    if (defRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Workflow definition not found' });
    }

    const stepsRes = await db.query(
      `SELECT * FROM workflow_steps WHERE workflow_id = $1 ORDER BY step_order ASC`,
      [req.params.id]
    );

    const versionsRes = await db.query(
      `SELECT * FROM workflow_versions WHERE workflow_id = $1 ORDER BY version_number DESC`,
      [req.params.id]
    );

    res.json({
      success: true,
      definition: defRes.rows[0],
      steps: stepsRes.rows,
      versions: versionsRes.rows
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/definitions', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const {
      code,
      name,
      description,
      module,
      entity_type,
      trigger_event,
      effective_date,
      steps
    } = req.body;

    const id = `wf_${code.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;

    await db.query(
      `INSERT INTO workflow_definitions
       (id, school_id, code, name, description, module, entity_type, trigger_event, status, version, effective_date, created_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', 1, $9, $10)`,
      [
        id,
        schoolId,
        code,
        name,
        description,
        module || 'GENERAL',
        entity_type,
        trigger_event,
        effective_date || new Date().toISOString().split('T')[0],
        req.user?.name || 'Administrator'
      ]
    );

    if (Array.isArray(steps)) {
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const stepId = `step_${id}_${i + 1}`;
        await db.query(
          `INSERT INTO workflow_steps
           (id, workflow_id, school_id, step_order, step_name, step_type, assignee_type, assignee_role, config_json, timeout_hours)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            stepId,
            id,
            schoolId,
            i + 1,
            s.step_name,
            s.step_type || 'APPROVAL',
            s.assignee_type || 'ROLE',
            s.assignee_role || 'principal',
            JSON.stringify(s.config_json || {}),
            s.timeout_hours || 48
          ]
        );
      }
    }

    res.json({ success: true, id, message: 'Workflow definition created successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/definitions/:id/status', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { status } = req.body;
    await db.query(
      `UPDATE workflow_definitions
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND school_id = $3`,
      [status, req.params.id, schoolId]
    );
    res.json({ success: true, message: `Workflow status updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/definitions/:id/version', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { changes_summary } = req.body;
    const wfRes = await db.query(
      `SELECT * FROM workflow_definitions WHERE id = $1 AND school_id = $2`,
      [req.params.id, schoolId]
    );
    if (wfRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Workflow definition not found' });
    }
    const currentWf = wfRes.rows[0] as any;
    const newVer = currentWf.version + 1;

    const stepsRes = await db.query(
      `SELECT * FROM workflow_steps WHERE workflow_id = $1 ORDER BY step_order ASC`,
      [req.params.id]
    );

    const snapshot = {
      definition: currentWf,
      steps: stepsRes.rows
    };

    const verId = `ver_${req.params.id}_v${newVer}`;
    await db.query(
      `INSERT INTO workflow_versions
       (id, workflow_id, school_id, version_number, definition_snapshot, changes_summary, created_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [verId, req.params.id, schoolId, newVer, JSON.stringify(snapshot), changes_summary || 'Manual version snapshot', req.user?.name || 'Administrator']
    );

    await db.query(
      `UPDATE workflow_definitions SET version = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newVer, req.params.id]
    );

    res.json({ success: true, version: newVer, message: `Created version v${newVer}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 3. WORKFLOW INSTANCES (EXECUTIONS & TIMELINE)
// -------------------------------------------------------------
router.get('/instances', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { status, workflow_id, entity_type } = req.query;

    let query = `SELECT i.*, w.name as workflow_name, w.code as workflow_code
                 FROM workflow_instances i
                 JOIN workflow_definitions w ON w.id = i.workflow_id
                 WHERE i.school_id = $1`;
    const params: any[] = [schoolId];

    if (status) {
      params.push(status);
      query += ` AND i.status = $${params.length}`;
    }
    if (workflow_id) {
      params.push(workflow_id);
      query += ` AND i.workflow_id = $${params.length}`;
    }
    if (entity_type) {
      params.push(entity_type);
      query += ` AND i.entity_type = $${params.length}`;
    }

    query += ` ORDER BY i.created_at DESC LIMIT 50`;
    const result = await db.query(query, params);
    res.json({ success: true, instances: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/instances/:id', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const instRes = await db.query(
      `SELECT i.*, w.name as workflow_name, w.code as workflow_code
       FROM workflow_instances i
       JOIN workflow_definitions w ON w.id = i.workflow_id
       WHERE i.id = $1 AND i.school_id = $2`,
      [req.params.id, schoolId]
    );
    if (instRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Instance not found' });
    }

    const logsRes = await db.query(
      `SELECT * FROM workflow_step_logs WHERE instance_id = $1 ORDER BY timestamp ASC`,
      [req.params.id]
    );

    res.json({
      success: true,
      instance: instRes.rows[0],
      logs: logsRes.rows
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/instances/start', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { workflow_code, entity_type, entity_id, title, context_data } = req.body;

    const wfRes = await db.query(
      `SELECT * FROM workflow_definitions WHERE code = $1 AND school_id = $2 AND status = 'ACTIVE'`,
      [workflow_code, schoolId]
    );
    if (wfRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Active workflow definition '${workflow_code}' not found.` });
    }
    const wf = wfRes.rows[0] as any;

    const instId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(
      `INSERT INTO workflow_instances
       (id, workflow_id, workflow_version, school_id, entity_type, entity_id, title, current_step_order, status, started_by_id, started_by_name, context_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 'RUNNING', $8, $9, $10)`,
      [
        instId,
        wf.id,
        wf.version,
        schoolId,
        entity_type || wf.entity_type,
        entity_id,
        title || `${wf.name} - Instance`,
        req.user?.id,
        req.user?.name || 'Administrator',
        JSON.stringify(context_data || {})
      ]
    );

    // Initial step log
    await db.query(
      `INSERT INTO workflow_step_logs
       (id, instance_id, school_id, step_name, action_taken, actor_id, actor_name, remarks)
       VALUES ($1, $2, $3, 'Workflow Initiated', 'INITIATED', $4, $5, $6)`,
      [`log_${Date.now()}`, instId, schoolId, req.user?.id, req.user?.name || 'Administrator', `Instance triggered for ${entity_type} #${entity_id}`]
    );

    res.json({ success: true, instance_id: instId, message: 'Workflow instance started successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/instances/:id/cancel', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { reason } = req.body;
    await db.query(
      `UPDATE workflow_instances
       SET status = 'CANCELLED', completed_at = CURRENT_TIMESTAMP, error_message = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND school_id = $3`,
      [reason || 'Cancelled by user', req.params.id, schoolId]
    );

    await db.query(
      `INSERT INTO workflow_step_logs
       (id, instance_id, school_id, step_name, action_taken, actor_id, actor_name, remarks)
       VALUES ($1, $2, $3, 'Workflow Terminated', 'CANCELLED', $4, $5, $6)`,
      [`log_${Date.now()}`, req.params.id, schoolId, req.user?.id, req.user?.name || 'User', reason || 'Instance cancelled']
    );

    res.json({ success: true, message: 'Instance cancelled' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 4. APPROVAL CENTER & MULTI-LEVEL DECISIONS
// -------------------------------------------------------------
router.get('/approvals', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { status, priority, safety_level, search } = req.query;

    let query = `
      SELECT r.*,
             (SELECT json_agg(s ORDER BY s.step_order ASC) FROM approval_steps s WHERE s.approval_id = r.id) as steps
      FROM approval_requests r
      WHERE r.school_id = $1
    `;
    const params: any[] = [schoolId];

    if (status && status !== 'ALL') {
      params.push(status);
      query += ` AND r.status = $${params.length}`;
    }
    if (priority) {
      params.push(priority);
      query += ` AND r.priority = $${params.length}`;
    }
    if (safety_level) {
      params.push(safety_level);
      query += ` AND r.safety_level = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (r.title ILIKE $${params.length} OR r.entity_id ILIKE $${params.length} OR r.requester_name ILIKE $${params.length})`;
    }

    query += ` ORDER BY
      CASE WHEN r.status = 'PENDING' THEN 1 WHEN r.status = 'IN_REVIEW' THEN 2 ELSE 3 END,
      CASE WHEN r.priority = 'CRITICAL' THEN 1 WHEN r.priority = 'HIGH' THEN 2 ELSE 3 END,
      r.created_at DESC`;

    const result = await db.query(query, params);
    res.json({ success: true, approvals: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/approvals/:id', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const appRes = await db.query(
      `SELECT * FROM approval_requests WHERE id = $1 AND school_id = $2`,
      [req.params.id, schoolId]
    );
    if (appRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Approval request not found' });
    }

    const stepsRes = await db.query(
      `SELECT * FROM approval_steps WHERE approval_id = $1 ORDER BY step_order ASC`,
      [req.params.id]
    );

    res.json({
      success: true,
      approval: appRes.rows[0],
      steps: stepsRes.rows
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/approvals/:id/decide', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { decision, comments, step_id, delegated_for_user_id } = req.body;

    if (!['APPROVE', 'REJECT', 'CHANGES_REQUESTED'].includes(decision)) {
      return res.status(400).json({ success: false, error: 'Invalid decision action.' });
    }

    if ((decision === 'REJECT' || decision === 'CHANGES_REQUESTED') && (!comments || comments.trim() === '')) {
      return res.status(400).json({ success: false, error: 'Mandatory comments/reason required for rejections and change requests.' });
    }

    const result = await processApprovalDecision(db, {
      school_id: schoolId,
      approval_id: req.params.id,
      step_id,
      actor_id: req.user?.id || 'usr_admin',
      actor_name: req.user?.name || req.user?.username || 'Administrator',
      actor_role: req.user?.role || 'school_admin',
      decision,
      comments,
      delegated_for_user_id
    });

    res.json({ ...result });
  } catch (err: any) {
    console.error('[APPROVAL DECISION ERROR]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/approvals/bulk-approve', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { approval_ids, comments } = req.body;

    if (!Array.isArray(approval_ids) || approval_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'No approval IDs provided.' });
    }

    const results: any[] = [];
    const blockedItems: any[] = [];

    for (const id of approval_ids) {
      // Check safety level - Safety Level 3 Restricted items CANNOT be bulk approved without manual verification
      const checkRes = await db.query(
        `SELECT id, title, safety_level FROM approval_requests WHERE id = $1 AND school_id = $2`,
        [id, schoolId]
      );
      if (checkRes.rows.length === 0) continue;
      const item = checkRes.rows[0] as any;

      if (item.safety_level === 'LEVEL_3_RESTRICTED') {
        blockedItems.push({ id, title: item.title, reason: 'Level 3 Restricted items (Financial Concessions / Certificate Cancellations) require mandatory individual sign-off.' });
        continue;
      }

      try {
        await processApprovalDecision(db, {
          school_id: schoolId,
          approval_id: id,
          actor_id: req.user?.id || 'usr_admin',
          actor_name: req.user?.name || 'Administrator',
          actor_role: req.user?.role || 'school_admin',
          decision: 'APPROVE',
          comments: comments || 'Bulk approved via Smart Approval Center'
        });
        results.push({ id, status: 'APPROVED' });
      } catch (e: any) {
        results.push({ id, status: 'FAILED', error: e.message });
      }
    }

    res.json({
      success: true,
      approved_count: results.filter(r => r.status === 'APPROVED').length,
      blocked_count: blockedItems.length,
      results,
      blocked_items: blockedItems
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delegations
router.get('/delegations', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const resDel = await db.query(
      `SELECT * FROM approval_delegations WHERE school_id = $1 ORDER BY created_at DESC`,
      [schoolId]
    );
    res.json({ success: true, delegations: resDel.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/delegations', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const {
      delegator_id,
      delegator_name,
      delegate_user_id,
      delegate_user_name,
      scope_module,
      start_date,
      end_date,
      reason
    } = req.body;

    const id = `delg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(
      `INSERT INTO approval_delegations
       (id, school_id, delegator_id, delegator_name, delegate_user_id, delegate_user_name, scope_module, start_date, end_date, reason, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)`,
      [
        id,
        schoolId,
        delegator_id || req.user?.id,
        delegator_name || req.user?.name || 'Approver',
        delegate_user_id,
        delegate_user_name,
        scope_module || 'ALL',
        start_date || new Date().toISOString().split('T')[0],
        end_date,
        reason || 'Temporary delegation'
      ]
    );

    res.json({ success: true, id, message: 'Delegation registered successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/delegations/:id/revoke', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    await db.query(
      `UPDATE approval_delegations SET is_active = FALSE WHERE id = $1 AND school_id = $2`,
      [req.params.id, schoolId]
    );
    res.json({ success: true, message: 'Delegation revoked successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 5. UNIFIED SMART TASK CENTER
// -------------------------------------------------------------
router.get('/tasks', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { status, priority, department, my_tasks, search } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    let query = `SELECT * FROM workflow_tasks WHERE school_id = $1`;
    const params: any[] = [schoolId];

    if (my_tasks === 'true') {
      params.push(userId);
      params.push(userRole);
      query += ` AND (assigned_to_user_id = $${params.length - 1} OR assigned_to_role = $${params.length})`;
    }

    if (status && status !== 'ALL') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (priority) {
      params.push(priority);
      query += ` AND priority = $${params.length}`;
    }
    if (department && department !== 'ALL') {
      params.push(department);
      query += ` AND assigned_to_department = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length} OR entity_id ILIKE $${params.length})`;
    }

    query += ` ORDER BY
      CASE WHEN status IN ('OPEN', 'IN_PROGRESS') THEN 1 ELSE 2 END,
      CASE WHEN priority = 'CRITICAL' THEN 1 WHEN priority = 'HIGH' THEN 2 ELSE 3 END,
      due_date ASC NULLS LAST`;

    const result = await db.query(query, params);
    res.json({ success: true, tasks: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/tasks', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const {
      title,
      description,
      task_type,
      priority,
      entity_type,
      entity_id,
      assigned_to_user_id,
      assigned_to_user_name,
      assigned_to_role,
      assigned_to_department,
      due_date
    } = req.body;

    const id = `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(
      `INSERT INTO workflow_tasks
       (id, school_id, title, description, task_type, priority, entity_type, entity_id,
        assigned_to_user_id, assigned_to_user_name, assigned_to_role, assigned_to_department,
        due_date, status, created_by_id, created_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'OPEN', $14, $15)`,
      [
        id,
        schoolId,
        title,
        description,
        task_type || 'GENERAL',
        priority || 'MEDIUM',
        entity_type || 'GENERAL',
        entity_id || '',
        assigned_to_user_id || null,
        assigned_to_user_name || null,
        assigned_to_role || 'teacher',
        assigned_to_department || 'Academic',
        due_date || new Date(Date.now() + 86400000 * 2).toISOString(),
        req.user?.id,
        req.user?.name || 'Administrator'
      ]
    );

    // In-app Notification for assigned user
    if (assigned_to_user_id) {
      await db.query(
        `INSERT INTO notifications
         (id, school_id, user_id, title, message, category, priority, related_module, related_entity_id, action_link)
         VALUES ($1, $2, $3, $4, $5, 'TASK', $6, 'WORKFLOW', $7, '/workflow')
         ON CONFLICT (id) DO NOTHING`,
        [
          `notif_task_${Date.now()}`,
          schoolId,
          assigned_to_user_id,
          `New Task Assigned: ${title}`,
          description || 'You have been assigned a new smart workflow task.',
          priority === 'CRITICAL' ? 'URGENT' : 'NORMAL',
          id
        ]
      );
    }

    res.json({ success: true, id, message: 'Smart task created successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/tasks/:id/status', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { status, remarks } = req.body;

    const completedAt = status === 'COMPLETED' ? 'CURRENT_TIMESTAMP' : 'NULL';
    await db.query(
      `UPDATE workflow_tasks
       SET status = $1,
           completed_at = ${completedAt},
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND school_id = $3`,
      [status, req.params.id, schoolId]
    );

    if (remarks) {
      const commentId = `cmnt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await db.query(
        `INSERT INTO task_comments (id, task_id, user_id, user_name, comment, is_internal)
         VALUES ($1, $2, $3, $4, $5, TRUE)`,
        [commentId, req.params.id, req.user?.id, req.user?.name || 'User', remarks]
      );
    }

    res.json({ success: true, message: `Task status updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/tasks/:id/reassign', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { assigned_to_user_id, assigned_to_user_name, assigned_to_role, assigned_to_department, reason } = req.body;

    await db.query(
      `UPDATE workflow_tasks
       SET assigned_to_user_id = $1,
           assigned_to_user_name = $2,
           assigned_to_role = $3,
           assigned_to_department = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND school_id = $6`,
      [assigned_to_user_id, assigned_to_user_name, assigned_to_role, assigned_to_department, req.params.id, schoolId]
    );

    // Log reassignment
    const commentId = `cmnt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(
      `INSERT INTO task_comments (id, task_id, user_id, user_name, comment, is_internal)
         VALUES ($1, $2, $3, $4, $5, TRUE)`,
      [
        commentId,
        req.params.id,
        req.user?.id,
        req.user?.name || 'User',
        `Reassigned task to ${assigned_to_user_name || assigned_to_role}. Reason: ${reason || 'Workload rebalancing'}`
      ]
    );

    res.json({ success: true, message: 'Task reassigned successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/tasks/:id/comments', async (req: any, res) => {
  try {
    const comRes = await db.query(
      `SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json({ success: true, comments: comRes.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/tasks/:id/comments', async (req: any, res) => {
  try {
    const { comment, attachment_url } = req.body;
    const commentId = `cmnt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(
      `INSERT INTO task_comments (id, task_id, user_id, user_name, comment, attachment_url, is_internal)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE)`,
      [commentId, req.params.id, req.user?.id, req.user?.name || 'User', comment, attachment_url || null]
    );
    res.json({ success: true, message: 'Comment added' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 6. SAFE AST AUTOMATION RULES & SIMULATOR
// -------------------------------------------------------------
router.get('/rules', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const rulesRes = await db.query(
      `SELECT * FROM automation_rules WHERE school_id = $1 ORDER BY execution_order ASC, name ASC`,
      [schoolId]
    );
    res.json({ success: true, rules: rulesRes.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/rules', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const {
      name,
      description,
      trigger_event,
      entity_type,
      safety_level,
      conditions_ast,
      actions_json,
      execution_order
    } = req.body;

    const id = `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(
      `INSERT INTO automation_rules
       (id, school_id, name, description, trigger_event, entity_type, safety_level, conditions_ast, actions_json, is_active, execution_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10)`,
      [
        id,
        schoolId,
        name,
        description,
        trigger_event,
        entity_type,
        safety_level || 'LEVEL_1_AUTOMATIC',
        JSON.stringify(conditions_ast || { combinator: 'AND', conditions: [] }),
        JSON.stringify(actions_json || []),
        execution_order || 1
      ]
    );

    res.json({ success: true, id, message: 'Automation rule created' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/rules/:id/toggle', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { is_active } = req.body;
    await db.query(
      `UPDATE automation_rules SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND school_id = $3`,
      [is_active, req.params.id, schoolId]
    );
    res.json({ success: true, message: `Rule is now ${is_active ? 'active' : 'inactive'}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/rules/:id/test', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { test_payload } = req.body;
    const ruleRes = await db.query(
      `SELECT * FROM automation_rules WHERE id = $1 AND school_id = $2`,
      [req.params.id, schoolId]
    );
    if (ruleRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }
    const rule = ruleRes.rows[0] as any;
    const conditionAst = rule.conditions_ast || { combinator: 'AND', conditions: [] };
    const matched = evaluateConditionGroup(conditionAst, test_payload || {});

    res.json({
      success: true,
      matched,
      rule_name: rule.name,
      evaluated_conditions: conditionAst,
      actions_that_would_execute: matched ? rule.actions_json : []
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 7. PRE-CONFIGURED SCHOOL WORKFLOW TEMPLATES
// -------------------------------------------------------------
router.get('/templates', async (req: any, res) => {
  const templates = [
    {
      code: 'WF_ATTENDANCE_CONSECUTIVE_ABSENT',
      name: 'Consecutive Absence Alert & Counselor Intervention',
      module: 'ATTENDANCE',
      category: 'Student Welfare',
      description: 'Automatically triggers counselor notification and home contact task when a student is absent for 3 consecutive days.',
      safety_level: 'LEVEL_1_AUTOMATIC',
      steps_count: 2
    },
    {
      code: 'WF_FEE_CONCESSION_APPROVAL',
      name: 'EWS & Merit Fee Concession Multi-Level Sign-off',
      module: 'FEES',
      category: 'Financial Governance',
      description: 'Sequential 3-level sign-off: Class Teacher Verification -> Accounts Audit -> Principal Sign-Off for all fee waivers above ₹5,000.',
      safety_level: 'LEVEL_3_RESTRICTED',
      steps_count: 3
    },
    {
      code: 'WF_STUDENT_TC_CLEARANCE',
      name: 'Transfer Certificate (TC) 360° Department Clearance',
      module: 'LIFECYCLE',
      category: 'Administrative Clearance',
      description: 'Parallel clearance requests sent simultaneously to Library, Hostel, Transport, Sports, and Accounts before TC generation.',
      safety_level: 'LEVEL_3_RESTRICTED',
      steps_count: 5
    },
    {
      code: 'WF_STAFF_LEAVE_SUBSTITUTION',
      name: 'Staff Leave Approval & Smart Timetable Substitution',
      module: 'HR',
      category: 'Staff Operations',
      description: 'HOD approval generates automatic smart substitution recommendations to free subject teachers for the period.',
      safety_level: 'LEVEL_2_CONFIRMED',
      steps_count: 2
    },
    {
      code: 'WF_PURCHASE_PO_APPROVAL',
      name: 'Laboratory & Library Procurement PO Authorization',
      module: 'INVENTORY',
      category: 'Procurement',
      description: 'Store In-Charge requisition -> Admin Verification -> Principal/Finance Director approval for orders above threshold.',
      safety_level: 'LEVEL_3_RESTRICTED',
      steps_count: 3
    },
    {
      code: 'WF_LOW_STOCK_AUTO_REORDER',
      name: 'Store Inventory Low-Stock Requisition Workflow',
      module: 'INVENTORY',
      category: 'Store Automation',
      description: 'Triggers vendor quote requisition when science lab chemicals or exam papers drop below minimum reorder buffer.',
      safety_level: 'LEVEL_1_AUTOMATIC',
      steps_count: 2
    },
    {
      code: 'WF_SYLLABUS_DELAY_RECOVERY',
      name: 'Syllabus Lagging Recovery & Remedial Schedule',
      module: 'ACADEMIC',
      category: 'Academic Quality',
      description: 'Triggers Vice-Principal review and extra remedial class scheduling when chapter completion lags behind by >14 days.',
      safety_level: 'LEVEL_2_CONFIRMED',
      steps_count: 2
    },
    {
      code: 'WF_TRANSPORT_DOC_EXPIRY',
      name: 'Bus Fitness, FC & Commercial Insurance Renewal Alert',
      module: 'TRANSPORT',
      category: 'Safety & Compliance',
      description: '60-day, 30-day, and 7-day automated countdown tasks assigned to Transport Manager for vehicle RTO compliance.',
      safety_level: 'LEVEL_1_AUTOMATIC',
      steps_count: 3
    },
    {
      code: 'WF_LIBRARY_OVERDUE_RECALL',
      name: 'Library Book Escalation & Auto Accounts Fine Deduction',
      module: 'LIBRARY',
      category: 'Library Administration',
      description: 'Automated 3-day reminder SMS followed by fine ledger booking with Fee Accounts after 7 days overdue.',
      safety_level: 'LEVEL_1_AUTOMATIC',
      steps_count: 2
    },
    {
      code: 'WF_HOSTEL_OUTING_PASS',
      name: 'Boarding Student Weekend Outing Electronic Gatepass',
      module: 'HOSTEL',
      category: 'Campus Security',
      description: 'Parent digital OTP consent -> Hostel Warden approval -> Security Gate scanner validation with timestamp.',
      safety_level: 'LEVEL_2_CONFIRMED',
      steps_count: 3
    },
    {
      code: 'WF_STUDENT_GRIEVANCE_SLA',
      name: 'POSH / Anti-Bullying / Grievance Escalation SLA',
      module: 'ADMINISTRATION',
      category: 'Safeguarding',
      description: 'Mandatory 24-hour SLA routing with automatic Level 3 escalation to School Management Committee if unresolved.',
      safety_level: 'LEVEL_3_RESTRICTED',
      steps_count: 3
    },
    {
      code: 'WF_FEE_OVERDUE_RECOVERY',
      name: 'Term Fee Dues Reminder & Installment Recovery',
      module: 'FEES',
      category: 'Fee Collection',
      description: 'Progressive parent notification cadence followed by Accounts counselor outreach call task.',
      safety_level: 'LEVEL_1_AUTOMATIC',
      steps_count: 2
    }
  ];

  res.json({ success: true, templates });
});

router.post('/templates/install', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { template_code } = req.body;

    // Check if already installed
    const exists = await db.query(
      `SELECT id FROM workflow_definitions WHERE code = $1 AND school_id = $2`,
      [template_code, schoolId]
    );
    if (exists.rows.length > 0) {
      return res.json({ success: true, message: `Workflow '${template_code}' is already installed and active.` });
    }

    // Insert definition
    const id = `wf_${template_code.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
    await db.query(
      `INSERT INTO workflow_definitions
       (id, school_id, code, name, description, module, entity_type, trigger_event, status, version, effective_date, is_system, created_by_name)
       VALUES ($1, $2, $3, $4, $5, 'GENERAL', 'TEMPLATE', $6, 'ACTIVE', 1, CURRENT_DATE, TRUE, 'Template Installer')`,
      [id, schoolId, template_code, template_code.replace(/_/g, ' '), 'Installed from standard school templates', `${template_code}_EVENT`]
    );

    res.json({ success: true, id, message: `Template '${template_code}' installed successfully.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 8. AUDIT LOGS, REPORTS & SLA ESCALATION WORKER
// -------------------------------------------------------------
router.get('/logs', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { limit = 50 } = req.query;

    const [ruleLogs, instanceLogs] = await Promise.all([
      db.query(
        `SELECT l.*, r.name as rule_name
         FROM automation_execution_logs l
         LEFT JOIN automation_rules r ON r.id = l.rule_id
         WHERE l.school_id = $1
         ORDER BY COALESCE(l.timestamp, l.executed_at) DESC LIMIT $2`,
        [schoolId, limit]
      ),
      db.query(
        `SELECT l.*, i.title as instance_title
         FROM workflow_step_logs l
         LEFT JOIN workflow_instances i ON i.id = l.instance_id
         WHERE l.school_id = $1
         ORDER BY COALESCE(l.timestamp, l.executed_at) DESC LIMIT $2`,
        [schoolId, limit]
      )
    ]);

    res.json({
      success: true,
      rule_logs: ruleLogs.rows,
      instance_logs: instanceLogs.rows
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/reports', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const bottlenecks = await analyzeWorkflowBottlenecks(db, schoolId);

    const slaRes = await db.query(
      `SELECT
        COUNT(*) as total_requests,
        COUNT(CASE WHEN approved_at <= sla_deadline THEN 1 END) as within_sla,
        COUNT(CASE WHEN approved_at > sla_deadline OR (status = 'PENDING' AND sla_deadline < CURRENT_TIMESTAMP) THEN 1 END) as breached_sla
       FROM approval_requests
       WHERE school_id = $1`,
      [schoolId]
    );

    res.json({
      success: true,
      sla_performance: slaRes.rows[0] || { total_requests: 0, within_sla: 0, breached_sla: 0 },
      bottlenecks
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/sla/check', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const result = await checkAndEscalateSLAs(db, schoolId);
    res.json({ ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 9. AI OPERATIONAL BRIEFING & WORKFLOW INTELLIGENCE
// -------------------------------------------------------------
router.post('/ai/daily-briefing', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const briefing = await generateDailyOperationalBriefing(db, schoolId, req.user?.role || 'SUPER_ADMIN');
    res.json({ success: true, ...briefing });
  } catch (err: any) {
    console.error('[AI BRIEFING ROUTE ERROR]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/ai/bottleneck-analysis', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const diagnostics = await analyzeWorkflowBottlenecks(db, schoolId);
    res.json({
      success: true,
      diagnostics,
      isDraft: true,
      recommendation: 'Rebalance tasks assigned to Accounts and Academic departments to avoid SLA breaches.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Event dispatch trigger test endpoint
router.post('/events/trigger', async (req: any, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { event_name, entity_type, entity_id, payload } = req.body;

    const result = await dispatchWorkflowEvent(db, {
      school_id: schoolId,
      event_name,
      entity_type,
      entity_id,
      actor_id: req.user?.id,
      actor_name: req.user?.name || 'Administrator',
      payload: payload || {}
    });

    res.json({ ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
