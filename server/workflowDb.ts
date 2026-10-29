import type { PGlite } from '@electric-sql/pglite';

let phase23Error: string | null = null;
export function getPhase23Error() {
  return phase23Error;
}

export async function ensurePhase23SchemaAndData(db: PGlite) {
  try {
    console.log('[DB] Ensuring Phase 23 Advanced Workflow Automation, Approval Engine, Rules Engine & Smart Task Management schema...');

    // 1. Central Workflow, Approvals, Rules & Task Tables
    await db.exec(`
      -- 1. Workflow Definitions
      CREATE TABLE IF NOT EXISTS workflow_definitions (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        module VARCHAR(50) NOT NULL, -- ACADEMIC, ATTENDANCE, FEES, ADMISSIONS, HR, INVENTORY, TRANSPORT, HOSTEL, LIBRARY, LIFECYCLE, GENERAL
        entity_type VARCHAR(50) NOT NULL, -- STUDENT, FEE_CONCESSION, PURCHASE_REQUEST, LEAVE_REQUEST, CERTIFICATE_REQUEST, SYLLABUS_TOPIC, TRANSPORT_VEHICLE, HOSTEL_OUTING, etc.
        trigger_event VARCHAR(100) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- DRAFT, ACTIVE, INACTIVE, ARCHIVED
        version INT NOT NULL DEFAULT 1,
        effective_date DATE NOT NULL,
        is_system BOOLEAN DEFAULT FALSE,
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_by_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_workflow_code_school UNIQUE(school_id, code)
      );

      -- 2. Workflow Versions
      CREATE TABLE IF NOT EXISTS workflow_versions (
        id VARCHAR(50) PRIMARY KEY,
        workflow_id VARCHAR(50) NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        version_number INT NOT NULL,
        definition_snapshot JSONB NOT NULL,
        changes_summary TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        created_by_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(workflow_id, version_number)
      );

      -- 3. Workflow Steps (Stages)
      CREATE TABLE IF NOT EXISTS workflow_steps (
        id VARCHAR(50) PRIMARY KEY,
        workflow_id VARCHAR(50) NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        step_order INT NOT NULL,
        step_name VARCHAR(150) NOT NULL,
        step_type VARCHAR(50) NOT NULL, -- APPROVAL, TASK, NOTIFICATION, ACTION, CONDITION, DELAY, ESCALATION
        assignee_type VARCHAR(50), -- USER, ROLE, DEPARTMENT, CONTEXT_TEACHER, CONTEXT_PARENT, CONTEXT_ACCOUNTANT
        assignee_id VARCHAR(50),
        assignee_role VARCHAR(50),
        config_json JSONB DEFAULT '{}',
        timeout_hours INT DEFAULT 48,
        escalation_rule_json JSONB,
        is_required BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 4. Workflow Instances (Running or Completed executions)
      CREATE TABLE IF NOT EXISTS workflow_instances (
        id VARCHAR(50) PRIMARY KEY,
        workflow_id VARCHAR(50) NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
        workflow_version INT NOT NULL DEFAULT 1,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100) NOT NULL,
        title VARCHAR(200) NOT NULL,
        current_step_order INT DEFAULT 1,
        status VARCHAR(30) NOT NULL DEFAULT 'RUNNING', -- RUNNING, WAITING, COMPLETED, REJECTED, CANCELLED, FAILED, PAUSED
        started_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        started_by_name VARCHAR(100),
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        context_data JSONB DEFAULT '{}',
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 5. Workflow Execution Step Logs (Audit timeline)
      CREATE TABLE IF NOT EXISTS workflow_step_logs (
        id VARCHAR(50) PRIMARY KEY,
        instance_id VARCHAR(50) NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        step_id VARCHAR(50),
        step_name VARCHAR(150) NOT NULL,
        action_taken VARCHAR(100) NOT NULL, -- INITIATED, ASSIGNED, APPROVED, REJECTED, CHANGES_REQUESTED, COMPLETED, ESCALATED, NOTIFIED, SKIPPED
        actor_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        actor_name VARCHAR(100),
        remarks TEXT,
        input_data JSONB,
        output_data JSONB,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 6. Automation Rules (Event -> Conditions -> Actions)
      CREATE TABLE IF NOT EXISTS automation_rules (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        module VARCHAR(50) NOT NULL,
        trigger_event VARCHAR(100) NOT NULL,
        condition_group_json JSONB NOT NULL DEFAULT '{"combinator":"AND","conditions":[]}',
        actions_json JSONB NOT NULL DEFAULT '[]',
        approval_required BOOLEAN DEFAULT FALSE,
        safety_level VARCHAR(30) NOT NULL DEFAULT 'LEVEL_1_AUTOMATIC', -- LEVEL_1_AUTOMATIC, LEVEL_2_CONFIRMED, LEVEL_3_RESTRICTED
        is_active BOOLEAN DEFAULT TRUE,
        priority INT DEFAULT 50, -- 1-100, higher runs first
        execution_count INT DEFAULT 0,
        last_executed_at TIMESTAMP WITH TIME ZONE,
        created_by_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_rule_code_school UNIQUE(school_id, code)
      );

      -- 7. Automation Execution Logs
      CREATE TABLE IF NOT EXISTS automation_execution_logs (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        rule_id VARCHAR(50) REFERENCES automation_rules(id) ON DELETE SET NULL,
        rule_name VARCHAR(150) NOT NULL,
        trigger_event VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(100),
        status VARCHAR(30) NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, FAILED, SKIPPED_CONDITIONS, BLOCKED_SAFETY
        actions_executed JSONB DEFAULT '[]',
        error_message TEXT,
        execution_duration_ms INT DEFAULT 0,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 8. Approval Requests (Centralized Approval Center)
      CREATE TABLE IF NOT EXISTS approval_requests (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        workflow_instance_id VARCHAR(50) REFERENCES workflow_instances(id) ON DELETE SET NULL,
        module VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        requested_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        requested_by_name VARCHAR(100) NOT NULL,
        requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        approval_type VARCHAR(30) NOT NULL DEFAULT 'SINGLE', -- SINGLE, SEQUENTIAL, PARALLEL
        current_level INT NOT NULL DEFAULT 1,
        total_levels INT NOT NULL DEFAULT 1,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, CHANGES_REQUESTED, EXPIRED, CANCELLED
        priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT, CRITICAL
        deadline TIMESTAMP WITH TIME ZONE,
        financial_amount NUMERIC(12, 2) DEFAULT 0.00,
        payload_json JSONB DEFAULT '{}',
        decision_notes TEXT,
        final_decided_by_name VARCHAR(100),
        final_decided_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 9. Approval Steps (Multi-Level Hierarchy)
      CREATE TABLE IF NOT EXISTS approval_steps (
        id VARCHAR(50) PRIMARY KEY,
        approval_request_id VARCHAR(50) NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        step_level INT NOT NULL,
        step_label VARCHAR(100) NOT NULL,
        approver_type VARCHAR(50) NOT NULL, -- ROLE, USER, DEPARTMENT
        approver_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        approver_role_name VARCHAR(50),
        approver_department VARCHAR(100),
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, CHANGES_REQUESTED, SKIPPED
        decided_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        decided_by_name VARCHAR(100),
        decided_at TIMESTAMP WITH TIME ZONE,
        decision_comments TEXT,
        is_parallel BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 10. Approval Delegations
      CREATE TABLE IF NOT EXISTS approval_delegations (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        delegator_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        delegator_name VARCHAR(100) NOT NULL,
        delegatee_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        delegatee_name VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        modules VARCHAR(255) NOT NULL DEFAULT 'ALL',
        max_amount NUMERIC(12, 2) DEFAULT 0.00,
        reason TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 11. Approval Matrix Rules (Configurable Financial & Category Thresholds)
      CREATE TABLE IF NOT EXISTS approval_matrix_rules (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        module VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        min_amount NUMERIC(12, 2) DEFAULT 0.00,
        max_amount NUMERIC(12, 2), -- NULL means infinity
        required_approver_roles JSONB NOT NULL DEFAULT '["principal"]',
        sequential_order BOOLEAN DEFAULT TRUE,
        sla_hours INT DEFAULT 48,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 12. Central Workflow Tasks (Unified Smart Task Center)
      CREATE TABLE IF NOT EXISTS workflow_tasks (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        workflow_instance_id VARCHAR(50) REFERENCES workflow_instances(id) ON DELETE SET NULL,
        approval_request_id VARCHAR(50) REFERENCES approval_requests(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        module VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(100),
        assigned_to_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        assigned_to_user_name VARCHAR(100),
        assigned_to_role VARCHAR(50),
        assigned_to_department VARCHAR(100),
        priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT, CRITICAL
        status VARCHAR(30) NOT NULL DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, WAITING, BLOCKED, COMPLETED, CANCELLED, EXPIRED
        due_date DATE,
        due_time VARCHAR(20),
        sla_hours INT DEFAULT 48,
        escalation_level INT DEFAULT 1, -- 1: Assignee, 2: Supervisor, 3: Dept Head, 4: Management
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_by_name VARCHAR(100),
        completed_at TIMESTAMP WITH TIME ZONE,
        completed_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        completed_by_name VARCHAR(100),
        completion_notes TEXT,
        ai_suggested_priority VARCHAR(20),
        ai_priority_rationale TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 13. Task Comments & Collaboration
      CREATE TABLE IF NOT EXISTS task_comments (
        id VARCHAR(50) PRIMARY KEY,
        task_id VARCHAR(50) NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_name VARCHAR(100) NOT NULL,
        comment_text TEXT NOT NULL,
        attachment_url TEXT,
        attachment_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 14. Workflow Settings & SLA Configurations
      CREATE TABLE IF NOT EXISTS workflow_settings (
        school_id VARCHAR(50) PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
        business_days JSONB DEFAULT '["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"]',
        auto_escalation_enabled BOOLEAN DEFAULT TRUE,
        escalation_reminder_hours INT DEFAULT 24,
        supervisor_escalation_hours INT DEFAULT 48,
        management_escalation_hours INT DEFAULT 72,
        ai_daily_briefing_enabled BOOLEAN DEFAULT TRUE,
        ai_bottleneck_detection_enabled BOOLEAN DEFAULT TRUE,
        ai_human_confirmation_mandatory BOOLEAN DEFAULT TRUE,
        notification_channels JSONB DEFAULT '{"in_app":true,"email":true,"sms":false,"whatsapp":false}',
        max_active_workflows_per_entity INT DEFAULT 5,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for High Performance & School Isolation
      CREATE INDEX IF NOT EXISTS idx_wf_def_school ON workflow_definitions(school_id, status);
      CREATE INDEX IF NOT EXISTS idx_wf_inst_school ON workflow_instances(school_id, status);
      CREATE INDEX IF NOT EXISTS idx_wf_inst_entity ON workflow_instances(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_wf_step_logs ON workflow_step_logs(instance_id);
      CREATE INDEX IF NOT EXISTS idx_auto_rules_school ON automation_rules(school_id, trigger_event, is_active);
      CREATE INDEX IF NOT EXISTS idx_appr_req_school ON approval_requests(school_id, status);
      CREATE INDEX IF NOT EXISTS idx_appr_steps_req ON approval_steps(approval_request_id, step_level);
      CREATE INDEX IF NOT EXISTS idx_wf_tasks_user ON workflow_tasks(school_id, assigned_to_user_id, status);
      CREATE INDEX IF NOT EXISTS idx_wf_tasks_dept ON workflow_tasks(school_id, assigned_to_department, status);
      CREATE INDEX IF NOT EXISTS idx_wf_tasks_role ON workflow_tasks(school_id, assigned_to_role, status);

      -- Compatibility columns
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS safety_level VARCHAR(50) DEFAULT 'LEVEL_1_AUTOMATIC';
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS request_type VARCHAR(50);
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS requester_id VARCHAR(50);
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS requester_name VARCHAR(100);
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS approval_flow VARCHAR(30) DEFAULT 'SEQUENTIAL';
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP WITH TIME ZONE;
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS escalation_level INT DEFAULT 1;
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

      ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS approval_id VARCHAR(50);
      ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS step_order INT;
      ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS step_name VARCHAR(150);
      ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS approver_role VARCHAR(50);
      ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS approver_id VARCHAR(50);
      ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS approver_name VARCHAR(100);
      ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS decision VARCHAR(50);
      ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS actor_id VARCHAR(50);
      ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS actor_name VARCHAR(100);
      ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS actor_role VARCHAR(50);
      ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS comments TEXT;
      ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS decided_at TIMESTAMP WITH TIME ZONE;

      ALTER TABLE workflow_tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(50) DEFAULT 'GENERAL';

      ALTER TABLE automation_execution_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE automation_execution_logs ADD COLUMN IF NOT EXISTS execution_time_ms INT DEFAULT 0;
      ALTER TABLE automation_execution_logs ADD COLUMN IF NOT EXISTS execution_snapshot JSONB DEFAULT '{}';

      ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS execution_order INT DEFAULT 1;
      ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS conditions_ast JSONB;
      ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
      ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS trigger_count INT DEFAULT 0;
      ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMP WITH TIME ZONE;
    `);

    // Run synchronization updates
    await db.exec(`
      UPDATE approval_requests SET
        safety_level = CASE WHEN financial_amount > 5000 OR entity_type IN ('FEE_CONCESSION', 'PURCHASE_REQUEST', 'CERTIFICATE_REQUEST') THEN 'LEVEL_3_RESTRICTED' ELSE 'LEVEL_1_AUTOMATIC' END,
        request_type = COALESCE(request_type, module),
        requester_id = COALESCE(requester_id, requested_by_id),
        requester_name = COALESCE(requester_name, requested_by_name),
        approval_flow = COALESCE(approval_flow, approval_type),
        sla_deadline = COALESCE(sla_deadline, deadline);

      UPDATE approval_steps SET
        approval_id = COALESCE(approval_id, approval_request_id),
        step_order = COALESCE(step_order, step_level),
        step_name = COALESCE(step_name, step_label),
        approver_role = COALESCE(approver_role, approver_role_name),
        actor_name = COALESCE(actor_name, decided_by_name),
        comments = COALESCE(comments, decision_comments);

      UPDATE workflow_tasks SET
        task_type = COALESCE(task_type, module);

      UPDATE automation_rules SET execution_order = COALESCE(execution_order, priority), conditions_ast = COALESCE(conditions_ast, condition_group_json), trigger_count = COALESCE(trigger_count, execution_count), last_triggered_at = COALESCE(last_triggered_at, last_executed_at);
      UPDATE automation_execution_logs SET
        timestamp = COALESCE(timestamp, executed_at),
        execution_time_ms = COALESCE(execution_time_ms, execution_duration_ms);
    `);

    // 2. Register Phase 23 Permissions in permissions and role_permissions
    const phase23Permissions = [
      { id: 'workflow.view', module: 'Workflow Engine', name: 'View Workflows', desc: 'Inspect workflow definitions, instances and execution timelines' },
      { id: 'workflow.create', module: 'Workflow Engine', name: 'Create Workflows', desc: 'Design new workflow definitions, steps and routing' },
      { id: 'workflow.edit', module: 'Workflow Engine', name: 'Edit Workflows', desc: 'Update workflow configuration, triggers and versions' },
      { id: 'workflow.activate', module: 'Workflow Engine', name: 'Activate Workflows', desc: 'Activate or pause workflow definitions' },
      { id: 'workflow.execute', module: 'Workflow Engine', name: 'Execute Workflows', desc: 'Manually launch or trigger workflows on entities' },
      { id: 'workflow.cancel', module: 'Workflow Engine', name: 'Cancel Workflows', desc: 'Abort running workflow instances with audit reason' },
      { id: 'approval.view', module: 'Approval Center', name: 'View Approvals', desc: 'Access pending and historical approval requests' },
      { id: 'approval.approve', module: 'Approval Center', name: 'Approve Requests', desc: 'Grant authorization for requests in approval chain' },
      { id: 'approval.reject', module: 'Approval Center', name: 'Reject Requests', desc: 'Decline approval requests with mandatory reason' },
      { id: 'approval.delegate', module: 'Approval Center', name: 'Delegate Approvals', desc: 'Assign temporary approval authority to another staff member' },
      { id: 'task.view', module: 'Task Center', name: 'View Tasks', desc: 'Access My Tasks and departmental task queues' },
      { id: 'task.create', module: 'Task Center', name: 'Create Tasks', desc: 'Manually dispatch tasks and assign due dates' },
      { id: 'task.assign', module: 'Task Center', name: 'Assign Tasks', desc: 'Reassign or distribute tasks across team members' },
      { id: 'task.edit', module: 'Task Center', name: 'Edit Tasks', desc: 'Update task priorities, due dates, and descriptions' },
      { id: 'task.complete', module: 'Task Center', name: 'Complete Tasks', desc: 'Mark tasks finished with completion reflection notes' },
      { id: 'automation.view', module: 'Automation Rules', name: 'View Automations', desc: 'Review automation rules, safety levels and templates' },
      { id: 'automation.create', module: 'Automation Rules', name: 'Create Automations', desc: 'Build condition-action automation rules' },
      { id: 'automation.edit', module: 'Automation Rules', name: 'Edit Automations', desc: 'Modify rule conditions, actions and priority' },
      { id: 'automation.activate', module: 'Automation Rules', name: 'Toggle Automations', desc: 'Enable or disable active automation rules' },
      { id: 'automation.audit', module: 'Automation Audit', name: 'Audit Automations', desc: 'Inspect automation logs, SLA compliance, and AI insights' }
    ];

    for (const p of phase23Permissions) {
      await db.query(`
        INSERT INTO permissions (id, module, name, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
      `, [p.id, p.module, p.name, p.desc]);

      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_super_admin', $1) ON CONFLICT DO NOTHING`, [p.id]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_school_admin', $1) ON CONFLICT DO NOTHING`, [p.id]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_principal', $1) ON CONFLICT DO NOTHING`, [p.id]);
    }

    // Role specific mapping for Teacher, Accountant, etc.
    const teacherP23 = ['task.view', 'task.complete', 'approval.view', 'workflow.view'];
    for (const pid of teacherP23) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_teacher', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    // Check if initial Phase 23 seeds exist
    const checkWf = await db.query('SELECT count(*) as count FROM workflow_definitions');
    if (parseInt((checkWf.rows[0] as any).count, 10) > 0) {
      console.log('[DB] Phase 23 Workflow schema verified and already seeded.');
      return;
    }

    console.log('[DB] Seeding Phase 23 Industry-Standard Workflows, Approvals, Rules & Smart Tasks...');

    // 3. Seed Default Workflow Settings
    await db.exec(`
      INSERT INTO workflow_settings (school_id, business_days, auto_escalation_enabled, escalation_reminder_hours, supervisor_escalation_hours, management_escalation_hours, ai_daily_briefing_enabled, ai_bottleneck_detection_enabled, ai_human_confirmation_mandatory)
      VALUES 
        ('sch_vvps', '["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"]', true, 24, 48, 72, true, true, true),
        ('sch_gisk', '["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"]', true, 24, 48, 72, true, true, true)
      ON CONFLICT (school_id) DO NOTHING;
    `);

    // 4. Seed 12 Configurable Standard Workflow Definitions for Vidya Vahini Public School (sch_vvps)
    await db.exec(`
      -- W1: Student Absence Intervention Workflow
      INSERT INTO workflow_definitions (id, school_id, code, name, description, module, entity_type, trigger_event, status, version, effective_date, is_system, created_by_name)
      VALUES ('wf_vvps_att_01', 'sch_vvps', 'WF-ATT-REPEATED-ABSENCE', 'Repeated Absence Intervention & Family Engagement', 
        'Triggers when student is absent for 3 consecutive days. Dispatches parent notice, teacher welfare task, and coordinator escalation.', 
        'ATTENDANCE', 'STUDENT', 'ATTENDANCE_CONSECUTIVE_ABSENCE', 'ACTIVE', 1, '2025-04-01', true, 'System Architect');

      -- W2: Fee Overdue & Recovery Workflow
      INSERT INTO workflow_definitions (id, school_id, code, name, description, module, entity_type, trigger_event, status, version, effective_date, is_system, created_by_name)
      VALUES ('wf_vvps_fee_01', 'sch_vvps', 'WF-FEE-OVERDUE-SLA', 'Tuition Fee Overdue Recovery & Parent Communication', 
        'Executes when tuition installment passes due date by 15 days. Dispatches automated reminder and creates task for Accounts officer.', 
        'FEES', 'FEE_PAYMENT', 'FEE_OVERDUE_15_DAYS', 'ACTIVE', 1, '2025-04-01', true, 'System Architect');

      -- W3: Student Withdrawal & Multi-Dept Clearance (TC)
      INSERT INTO workflow_definitions (id, school_id, code, name, description, module, entity_type, trigger_event, status, version, effective_date, is_system, created_by_name)
      VALUES ('wf_vvps_life_01', 'sch_vvps', 'WF-STUDENT-TC-CLEARANCE', 'Student Transfer Certificate & Multi-Department Clearance', 
        'Sequential clearance across Library, Accounts, Transport, Hostel, and Laboratory before Principal finalizes Transfer Certificate.', 
        'LIFECYCLE', 'CERTIFICATE_REQUEST', 'STUDENT_WITHDRAWAL_REQUESTED', 'ACTIVE', 1, '2025-04-01', true, 'System Architect');

      -- W4: Fee Concession Multi-Tier Approval
      INSERT INTO workflow_definitions (id, school_id, code, name, description, module, entity_type, trigger_event, status, version, effective_date, is_system, created_by_name)
      VALUES ('wf_vvps_fee_02', 'sch_vvps', 'WF-FEE-CONCESSION-APPROVAL', 'Multi-Tier Fee Concession & Scholarship Authorization', 
        'Hierarchical financial approval routing: Under ₹5k to Principal, ₹5k-₹20k to Principal & Accounts, above ₹20k to School Trust Management.', 
        'FEES', 'FEE_CONCESSION', 'CONCESSION_APPLICATION_SUBMITTED', 'ACTIVE', 1, '2025-04-01', true, 'System Architect');

      -- W5: Staff Leave Approval & Classroom Substitution
      INSERT INTO workflow_definitions (id, school_id, code, name, description, module, entity_type, trigger_event, status, version, effective_date, is_system, created_by_name)
      VALUES ('wf_vvps_hr_01', 'sch_vvps', 'WF-STAFF-LEAVE-SUBSTITUTION', 'Staff Leave Approval with Automated Timetable Substitution Alert', 
        'Routes teacher leave request to HOD, then HR Officer, and flags substitution requirement to the Academic Coordinator.', 
        'HR', 'LEAVE_REQUEST', 'EMPLOYEE_LEAVE_REQUESTED', 'ACTIVE', 1, '2025-04-01', true, 'System Architect');

      -- W6: Inventory Purchase Requisition to PO Approval
      INSERT INTO workflow_definitions (id, school_id, code, name, description, module, entity_type, trigger_event, status, version, effective_date, is_system, created_by_name)
      VALUES ('wf_vvps_inv_01', 'sch_vvps', 'WF-PURCHASE-PO-APPROVAL', 'Procurement Requisition to Purchase Order Gate', 
        'Department Head requisition $\rightarrow$ Administrative review $\rightarrow$ Principal purchase order approval before vendor issuance.', 
        'INVENTORY', 'PURCHASE_REQUEST', 'PURCHASE_REQUEST_SUBMITTED', 'ACTIVE', 1, '2025-04-01', true, 'System Architect');

      -- W7: Low Stock Auto-Reorder Trigger
      INSERT INTO workflow_definitions (id, school_id, code, name, description, module, entity_type, trigger_event, status, version, effective_date, is_system, created_by_name)
      VALUES ('wf_vvps_inv_02', 'sch_vvps', 'WF-LOW-STOCK-ALERT', 'Consumables & Science Lab Low Stock Alert', 
        'Automatically creates procurement drafting task when stock count drops below configured reorder threshold.', 
        'INVENTORY', 'ITEM_STOCK', 'STOCK_BELOW_REORDER_LEVEL', 'ACTIVE', 1, '2025-04-01', true, 'System Architect');

      -- W8: Academic Syllabus Delay Recovery
      INSERT INTO workflow_definitions (id, school_id, code, name, description, module, entity_type, trigger_event, status, version, effective_date, is_system, created_by_name)
      VALUES ('wf_vvps_acad_01', 'sch_vvps', 'WF-SYLLABUS-DELAY-RECOVERY', 'Syllabus Lagging Delay Recovery & Extra Class Intervention', 
        'Monitors topic pacing matrix. If a subject slips behind target by 3+ days, assigns teacher recovery plan and notifies Coordinator.', 
        'ACADEMIC', 'SYLLABUS_TOPIC', 'SYLLABUS_BEHIND_SCHEDULE', 'ACTIVE', 1, '2025-04-01', true, 'System Architect');

      -- W9: Transport Document Expiry SLA
      INSERT INTO workflow_definitions (id, school_id, code, name, description, module, entity_type, trigger_event, status, version, effective_date, is_system, created_by_name)
      VALUES ('wf_vvps_trp_01', 'sch_vvps', 'WF-TRANSPORT-DOC-EXPIRY', 'Vehicle Fitness & Driver License Expiry Compliance', 
        'Triggered 30 days prior to document expiration. Dispatches renewal task to Transport Officer with 7-day escalation to Management.', 
        'TRANSPORT', 'TRANSPORT_VEHICLE', 'DOCUMENT_EXPIRING_30_DAYS', 'ACTIVE', 1, '2025-04-01', true, 'System Architect');

      -- W10: Library Book Overdue & Fine Notice
      INSERT INTO workflow_definitions (id, school_id, code, name, description, module, entity_type, trigger_event, status, version, effective_date, is_system, created_by_name)
      VALUES ('wf_vvps_lib_01', 'sch_vvps', 'WF-LIBRARY-OVERDUE-NOTICE', 'Library Overdue Book Recall & Fine Notification', 
        'Sends student return reminder on due date + 1 day, computes fine via existing ledger, and logs librarian physical recall task.', 
        'LIBRARY', 'BOOK_ISSUE', 'BOOK_OVERDUE_1_DAY', 'ACTIVE', 1, '2025-04-01', true, 'System Architect');

      -- W11: Hostel Outing & Gate Pass Authorization
      INSERT INTO workflow_definitions (id, school_id, code, name, description, module, entity_type, trigger_event, status, version, effective_date, is_system, created_by_name)
      VALUES ('wf_vvps_hst_01', 'sch_vvps', 'WF-HOSTEL-OUTING-PASS', 'Boarding Student Weekend Outing & Gate Pass Verification', 
        'Validates parent digital consent, checks warden sign-off, generates verified security QR gate pass, and tracks return timestamp.', 
        'HOSTEL', 'HOSTEL_OUTING', 'HOSTEL_OUTING_REQUESTED', 'ACTIVE', 1, '2025-04-01', true, 'System Architect');

      -- W12: Grievance & Student Welfare Escalation
      INSERT INTO workflow_definitions (id, school_id, code, name, description, module, entity_type, trigger_event, status, version, effective_date, is_system, created_by_name)
      VALUES ('wf_vvps_adm_01', 'sch_vvps', 'WF-GRIEVANCE-SLA-RESOLUTION', 'Student Welfare Grievance 48-Hour Resolution SLA', 
        'Assigns parent or student complaint to designated counselor/admin. Escalates to Principal if unacknowledged within 24 hours.', 
        'COMMUNICATION', 'GRIEVANCE', 'GRIEVANCE_SUBMITTED', 'ACTIVE', 1, '2025-04-01', true, 'System Architect');
    `);

    // 5. Seed Steps for Workflows
    await db.exec(`
      -- Steps for W1: Repeated Absence
      INSERT INTO workflow_steps (id, workflow_id, school_id, step_order, step_name, step_type, assignee_type, assignee_role, config_json, timeout_hours)
      VALUES 
        ('step_att_01', 'wf_vvps_att_01', 'sch_vvps', 1, 'Automated Parent Absence Notification', 'NOTIFICATION', 'CONTEXT_PARENT', NULL, '{"channel":"SMS_AND_IN_APP","template":"ATTENDANCE_ABSENT_3DAYS"}', 4),
        ('step_att_02', 'wf_vvps_att_01', 'sch_vvps', 2, 'Class Teacher Welfare Telecall & Check', 'TASK', 'CONTEXT_TEACHER', 'teacher', '{"task_title":"Conduct Student Welfare Telecall","priority":"HIGH"}', 24),
        ('step_att_03', 'wf_vvps_att_01', 'sch_vvps', 3, 'Academic Coordinator Review & Home Visit', 'ESCALATION', 'ROLE', 'principal', '{"escalation_level":2,"notify_management":true}', 48);

      -- Steps for W3: Student TC Clearance
      INSERT INTO workflow_steps (id, workflow_id, school_id, step_order, step_name, step_type, assignee_type, assignee_role, config_json, timeout_hours)
      VALUES 
        ('step_tc_01', 'wf_vvps_life_01', 'sch_vvps', 1, 'Accounts & Fee Dues Clearance', 'APPROVAL', 'ROLE', 'accountant', '{"department":"ACCOUNTS","checklist":["Check all term dues","Verify security deposit refund"]}', 24),
        ('step_tc_02', 'wf_vvps_life_01', 'sch_vvps', 2, 'Library Book Return & Fine Clearance', 'APPROVAL', 'ROLE', 'librarian', '{"department":"LIBRARY","checklist":["Verify no unreturned books","Clear fine ledger"]}', 24),
        ('step_tc_03', 'wf_vvps_life_01', 'sch_vvps', 3, 'Transport & Hostel Pass Clearance', 'APPROVAL', 'ROLE', 'transport_manager', '{"department":"OPERATIONS","checklist":["Bus pass returned","Hostel key handed over"]}', 24),
        ('step_tc_04', 'wf_vvps_life_01', 'sch_vvps', 4, 'Principal Final TC Authorization & QR Stamp', 'APPROVAL', 'ROLE', 'principal', '{"department":"ADMINISTRATION","is_final":true}', 24);

      -- Steps for W6: Purchase Requisition
      INSERT INTO workflow_steps (id, workflow_id, school_id, step_order, step_name, step_type, assignee_type, assignee_role, config_json, timeout_hours)
      VALUES 
        ('step_po_01', 'wf_vvps_inv_01', 'sch_vvps', 1, 'Department Head Technical Requisition Sign-off', 'APPROVAL', 'ROLE', 'teacher', '{"step_level":1}', 24),
        ('step_po_02', 'wf_vvps_inv_01', 'sch_vvps', 2, 'Accounts Budget Validation', 'APPROVAL', 'ROLE', 'accountant', '{"step_level":2}', 24),
        ('step_po_03', 'wf_vvps_inv_01', 'sch_vvps', 3, 'Principal Purchase Order Approval', 'APPROVAL', 'ROLE', 'principal', '{"step_level":3,"is_final":true}', 24);
    `);

    // 6. Seed Approval Matrix Rules (Financial & Administrative Thresholds)
    await db.exec(`
      INSERT INTO approval_matrix_rules (id, school_id, module, entity_type, min_amount, max_amount, required_approver_roles, sequential_order, sla_hours, description)
      VALUES 
        ('mat_fee_01', 'sch_vvps', 'FEES', 'FEE_CONCESSION', 0.00, 5000.00, '["principal"]', false, 24, 'Tier 1: Minor Concession (Up to ₹5,000) requires Principal sign-off.'),
        ('mat_fee_02', 'sch_vvps', 'FEES', 'FEE_CONCESSION', 5000.01, 20000.00, '["principal", "accountant"]', true, 48, 'Tier 2: Mid-Level Concession (₹5,001 - ₹20,000) requires Accountant audit + Principal approval.'),
        ('mat_fee_03', 'sch_vvps', 'FEES', 'FEE_CONCESSION', 20000.01, NULL, '["principal", "super_admin"]', true, 72, 'Tier 3: Major Concession (> ₹20,000) requires School Trust Management approval.'),
        
        ('mat_po_01', 'sch_vvps', 'INVENTORY', 'PURCHASE_ORDER', 0.00, 10000.00, '["principal"]', false, 24, 'Procurement up to ₹10,000 approved by Principal directly.'),
        ('mat_po_02', 'sch_vvps', 'INVENTORY', 'PURCHASE_ORDER', 10000.01, 50000.00, '["accountant", "principal"]', true, 48, 'Procurement ₹10,001 - ₹50,000 requires Accounts verification + Principal authorization.'),
        ('mat_po_03', 'sch_vvps', 'INVENTORY', 'PURCHASE_ORDER', 50000.01, NULL, '["principal", "super_admin"]', true, 72, 'Capital expenditure above ₹50,000 requires Trust Management sign-off.')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 7. Seed Automation Rules (Rule Engine)
    await db.exec(`
      INSERT INTO automation_rules (id, school_id, code, name, description, module, trigger_event, condition_group_json, actions_json, approval_required, safety_level, is_active, priority)
      VALUES 
        ('rule_vvps_01', 'sch_vvps', 'RULE-ATT-01', 'High Absence Class Teacher Warning Task', 
          'Automatically assigns a welfare investigation task to Class Teacher when student monthly attendance falls below 75%.', 
          'ATTENDANCE', 'ATTENDANCE_PERCENTAGE_CALCULATED',
          '{"combinator":"AND","conditions":[{"field":"attendance_percentage","operator":"less than","value":75},{"field":"student_status","operator":"equals","value":"ACTIVE"}]}',
          '[{"type":"CREATE_TASK","title":"Attendance Counseling Required","role":"teacher","priority":"HIGH","sla_hours":48},{"type":"SEND_NOTIFICATION","target":"PARENT","template":"LOW_ATTENDANCE_ALERT"}]',
          false, 'LEVEL_1_AUTOMATIC', true, 90),

        ('rule_vvps_02', 'sch_vvps', 'RULE-FEE-01', 'Automated Overdue Fee Warning & Parent Notification', 
          'Sends formal SMS/In-App alert to parent when school fees remain unpaid 15 days past due date.', 
          'FEES', 'FEE_SCHEDULE_OVERDUE',
          '{"combinator":"AND","conditions":[{"field":"overdue_days","operator":"greater than or equal","value":15},{"field":"amount_due","operator":"greater than","value":0}]}',
          '[{"type":"SEND_NOTIFICATION","target":"PARENT","template":"FEE_OVERDUE_FORMAL"},{"type":"CREATE_TASK","title":"Accounts Fee Recovery Call","role":"accountant","priority":"NORMAL","sla_hours":72}]',
          false, 'LEVEL_2_CONFIRMED', true, 80),

        ('rule_vvps_03', 'sch_vvps', 'RULE-TRP-01', 'Vehicle Fitness 30-Day Mandatory Inspection', 
          'Generates transport safety compliance task 30 days prior to vehicle fitness certificate expiry.', 
          'TRANSPORT', 'VEHICLE_EXPIRY_CHECK',
          '{"combinator":"AND","conditions":[{"field":"fitness_expiry_days_remaining","operator":"less than or equal","value":30}]}',
          '[{"type":"CREATE_TASK","title":"Vehicle Fitness RTO Inspection Due","role":"transport_manager","priority":"CRITICAL","sla_hours":48}]',
          false, 'LEVEL_1_AUTOMATIC', true, 95),

        ('rule_vvps_04', 'sch_vvps', 'RULE-ACAD-01', 'Curriculum Topic Lagging Intervention Task', 
          'Triggers academic remedial intervention workflow when subject syllabus is delayed by 3 or more days.', 
          'ACADEMIC', 'SYLLABUS_PROGRESS_UPDATED',
          '{"combinator":"AND","conditions":[{"field":"delay_days","operator":"greater than or equal","value":3},{"field":"status","operator":"not equals","value":"COMPLETED"}]}',
          '[{"type":"CREATE_TASK","title":"Syllabus Catch-up Plan Formulation","role":"teacher","priority":"HIGH","sla_hours":48},{"type":"SEND_NOTIFICATION","target":"COORDINATOR","template":"ACADEMIC_SLIPPAGE_ALERT"}]',
          false, 'LEVEL_2_CONFIRMED', true, 85),

        ('rule_vvps_05', 'sch_vvps', 'RULE-FIN-01', 'High-Impact Fee Refund Human Gatekeeper', 
          'Restricts student fee refund execution strictly until approved by Principal and Accounts Supervisor.', 
          'FEES', 'FEE_REFUND_REQUESTED',
          '{"combinator":"AND","conditions":[{"field":"refund_amount","operator":"greater than","value":0}]}',
          '[{"type":"CREATE_APPROVAL_REQUEST","title":"Student Fee Refund Request","approval_type":"SEQUENTIAL","levels":2}]',
          true, 'LEVEL_3_RESTRICTED', true, 100);
    `);

    // 8. Seed Live Running Workflow Instances
    await db.exec(`
      INSERT INTO workflow_instances (id, workflow_id, workflow_version, school_id, entity_type, entity_id, title, current_step_order, status, started_by_name, started_at, context_data)
      VALUES 
        ('wfi_vvps_001', 'wf_vvps_att_01', 1, 'sch_vvps', 'STUDENT', 'stu_vvps_002', 
          'Repeated Absence Case: Aarav Kumar (Class 1-A)', 2, 'RUNNING', 'System Event Listener', CURRENT_TIMESTAMP - INTERVAL '1 day',
          '{"student_name":"Aarav Kumar","class_name":"Class 1-A","consecutive_absent_days":3,"guardian_phone":"+91 98350 22001"}'),

        ('wfi_vvps_002', 'wf_vvps_life_01', 1, 'sch_vvps', 'CERTIFICATE_REQUEST', 'cert_vvps_req_001', 
          'Transfer Certificate Clearance: Rohan Verma (Class 5-A)', 2, 'WAITING', 'Priya Sharma (Admission Clerk)', CURRENT_TIMESTAMP - INTERVAL '2 days',
          '{"student_name":"Rohan Verma","admission_number":"VVPS-2024-0042","reason":"Parent relocation to Bengaluru"}'),

        ('wfi_vvps_003', 'wf_vvps_inv_01', 1, 'sch_vvps', 'PURCHASE_REQUEST', 'preq_vvps_001', 
          'Procurement Order: STEM Robotics Kits & Microcontrollers', 3, 'WAITING', 'Anand Kumar Jha (Science Teacher)', CURRENT_TIMESTAMP - INTERVAL '1 day',
          '{"department":"SCIENCE","estimated_cost":34500,"vendor_quote_received":true}'),

        ('wfi_vvps_004', 'wf_vvps_acad_01', 1, 'sch_vvps', 'SYLLABUS_TOPIC', 'ctop_mth_003', 
          'Syllabus Delay Catch-up: Mathematics Fractions (Class 5-A)', 1, 'COMPLETED', 'Academic Scheduler', CURRENT_TIMESTAMP - INTERVAL '4 days',
          '{"subject":"Mathematics","topic":"Multi-Step Word Problems","delay_days":3,"remedial_sessions_scheduled":2}');
    `);

    // 9. Seed Active Approval Requests in Central Approval Center
    await db.exec(`
      -- Approval 1: Fee Concession (₹8,500) - Pending Principal final decision
      INSERT INTO approval_requests (id, school_id, workflow_instance_id, module, entity_type, entity_id, title, description, requested_by_id, requested_by_name, requested_at, approval_type, current_level, total_levels, status, priority, deadline, financial_amount, payload_json)
      VALUES ('appr_vvps_001', 'sch_vvps', NULL, 'FEES', 'FEE_CONCESSION', 'fcon_vvps_001', 
        'Merit-cum-Means Fee Concession (50% Tuition Waiver)', 
        'Student achieved 96% in Annual Exam and qualified for State Science Talent Search. Parent annual income below ₹2.5 Lakhs.', 
        'usr_super_admin', 'Rajesh Sharma', CURRENT_TIMESTAMP - INTERVAL '18 hours', 'SEQUENTIAL', 2, 2, 'PENDING', 'HIGH', 
        CURRENT_TIMESTAMP + INTERVAL '30 hours', 8500.00, '{"student_name":"Ananya Sharma","class":"Class 5-A","income_certificate_verified":true}');

      -- Steps for Approval 1:
      INSERT INTO approval_steps (id, approval_request_id, school_id, step_level, step_label, approver_type, approver_role_name, status, decided_by_name, decided_at, decision_comments)
      VALUES 
        ('step_appr_01_1', 'appr_vvps_001', 'sch_vvps', 1, 'Accountant Financial Audit', 'ROLE', 'accountant', 'APPROVED', 'Manoj Saxena (Accountant)', CURRENT_TIMESTAMP - INTERVAL '6 hours', 'Income certificate and fee dues history verified. Eligible for Merit Category B.'),
        ('step_appr_01_2', 'appr_vvps_001', 'sch_vvps', 2, 'Principal Final Authorization', 'ROLE', 'principal', 'PENDING', NULL, NULL, NULL);

      -- Approval 2: Purchase Order for Composite Science Lab Materials (₹34,500)
      INSERT INTO approval_requests (id, school_id, workflow_instance_id, module, entity_type, entity_id, title, description, requested_by_id, requested_by_name, requested_at, approval_type, current_level, total_levels, status, priority, deadline, financial_amount, payload_json)
      VALUES ('appr_vvps_002', 'sch_vvps', 'wfi_vvps_003', 'INVENTORY', 'PURCHASE_REQUEST', 'preq_vvps_001', 
        'Purchase Requisition: STEM Robotics Lab Kits & Sensors', 
        'Required for National Science Olympiad preparation and Grade 5 STEM curriculum modules. 3 vendor quotations attached.', 
        'usr_super_admin', 'Anand Kumar Jha', CURRENT_TIMESTAMP - INTERVAL '28 hours', 'SEQUENTIAL', 3, 3, 'PENDING', 'URGENT', 
        CURRENT_TIMESTAMP + INTERVAL '20 hours', 34500.00, '{"items_count":15,"selected_vendor":"RoboTech Edu India Ltd","budget_head":"ANNUAL_LAB_EQUIPMENT"}');

      -- Steps for Approval 2:
      INSERT INTO approval_steps (id, approval_request_id, school_id, step_level, step_label, approver_type, approver_role_name, status, decided_by_name, decided_at, decision_comments)
      VALUES 
        ('step_appr_02_1', 'appr_vvps_002', 'sch_vvps', 1, 'Science HOD Technical Clearance', 'ROLE', 'teacher', 'APPROVED', 'Dr. Alok Nath (HOD Science)', CURRENT_TIMESTAMP - INTERVAL '22 hours', 'Specs confirmed aligned with CBSE STEM guidelines.'),
        ('step_appr_02_2', 'appr_vvps_002', 'sch_vvps', 2, 'Accounts Budgetary Clearance', 'ROLE', 'accountant', 'APPROVED', 'Manoj Saxena (Accountant)', CURRENT_TIMESTAMP - INTERVAL '14 hours', 'Available lab equipment budget balance: ₹1,20,000. Funds provisioned.'),
        ('step_appr_02_3', 'appr_vvps_002', 'sch_vvps', 3, 'Principal PO Approval', 'ROLE', 'principal', 'PENDING', NULL, NULL, NULL);

      -- Approval 3: Staff Medical Leave Request (4 Days)
      INSERT INTO approval_requests (id, school_id, workflow_instance_id, module, entity_type, entity_id, title, description, requested_by_id, requested_by_name, requested_at, approval_type, current_level, total_levels, status, priority, deadline, financial_amount, payload_json)
      VALUES ('appr_vvps_003', 'sch_vvps', NULL, 'HR', 'LEAVE_REQUEST', 'lvr_vvps_001', 
        'Staff Medical Leave: Sunita Mishra (English TGT)', 
        'Medical emergency and viral recovery. Medical certificate attached. Timetable adjustment coordinated with Class 5 substitute.', 
        'usr_super_admin', 'Sunita Mishra', CURRENT_TIMESTAMP - INTERVAL '10 hours', 'SINGLE', 1, 1, 'PENDING', 'NORMAL', 
        CURRENT_TIMESTAMP + INTERVAL '14 hours', 0.00, '{"leave_type":"MEDICAL","days_count":4,"from_date":"2026-10-28","to_date":"2026-10-31"}');

      INSERT INTO approval_steps (id, approval_request_id, school_id, step_level, step_label, approver_type, approver_role_name, status, decided_by_name, decided_at, decision_comments)
      VALUES ('step_appr_03_1', 'appr_vvps_003', 'sch_vvps', 1, 'Principal / HR Authorization', 'ROLE', 'principal', 'PENDING', NULL, NULL, NULL);

      -- Approval 4: Transfer Certificate Clearance Request (Library Step)
      INSERT INTO approval_requests (id, school_id, workflow_instance_id, module, entity_type, entity_id, title, description, requested_by_id, requested_by_name, requested_at, approval_type, current_level, total_levels, status, priority, deadline, financial_amount, payload_json)
      VALUES ('appr_vvps_004', 'sch_vvps', 'wfi_vvps_002', 'LIFECYCLE', 'CERTIFICATE_REQUEST', 'cert_vvps_req_001', 
        'TC Clearance - Library Department: Rohan Verma', 
        'Verify Rohan Verma has returned all issued encyclopedias and readers before TC dispatch.', 
        'usr_super_admin', 'Priya Sharma (Admission Clerk)', CURRENT_TIMESTAMP - INTERVAL '20 hours', 'SINGLE', 1, 1, 'PENDING', 'HIGH', 
        CURRENT_TIMESTAMP + INTERVAL '28 hours', 0.00, '{"student_name":"Rohan Verma","class":"Class 5-A"}');

      INSERT INTO approval_steps (id, approval_request_id, school_id, step_level, step_label, approver_type, approver_role_name, status, decided_by_name, decided_at, decision_comments)
      VALUES ('step_appr_04_1', 'appr_vvps_004', 'sch_vvps', 1, 'Librarian Clearance', 'ROLE', 'librarian', 'PENDING', NULL, NULL, NULL);
    `);

    // 10. Seed Smart Unified Tasks in Task Center
    await db.exec(`
      INSERT INTO workflow_tasks (id, school_id, workflow_instance_id, approval_request_id, title, description, module, entity_type, entity_id, assigned_to_role, assigned_to_department, priority, status, due_date, sla_hours, escalation_level, created_by_name, ai_suggested_priority, ai_priority_rationale)
      VALUES 
        ('tsk_vvps_001', 'sch_vvps', 'wfi_vvps_001', NULL, 
          'Welfare Call & Parent Consultation for Aarav Kumar', 
          'Student is recorded absent for 3 consecutive days without prior leave slip. Contact father Ramesh Kumar (+91 98350 22001) to verify health status and coordinate homework packets.', 
          'ATTENDANCE', 'STUDENT', 'stu_vvps_002', 'teacher', 'ACADEMIC', 'HIGH', 'IN_PROGRESS', 
          CURRENT_DATE + 1, 24, 1, 'System Rule Engine', 'HIGH', '3 consecutive absences trigger high risk of learning continuity disruption.'),

        ('tsk_vvps_002', 'sch_vvps', NULL, 'appr_vvps_001', 
          'Authorize Merit Scholarship Waiver for Ananya Sharma', 
          'Review financial background documents and approve 50% tuition fee waiver following verified 96% academic distinction.', 
          'FEES', 'FEE_CONCESSION', 'fcon_vvps_001', 'principal', 'ADMINISTRATION', 'HIGH', 'OPEN', 
          CURRENT_DATE + 1, 24, 1, 'Manoj Saxena', 'NORMAL', 'Low risk scholarship audit completed by accounts department.'),

        ('tsk_vvps_003', 'sch_vvps', NULL, NULL, 
          'School Bus UP-14-BT-9821 Fitness RTO Re-Inspection', 
          'Fitness certificate expires in 18 days. Schedule RTO inspection, brake check, speed governor calibration and emergency exit drill.', 
          'TRANSPORT', 'TRANSPORT_VEHICLE', 'veh_vvps_001', 'transport_manager', 'TRANSPORT', 'CRITICAL', 'OPEN', 
          CURRENT_DATE + 5, 48, 1, 'Automated Safety Sentry', 'CRITICAL', 'RTO compliance failure incurs mandatory vehicle impoundment and route disruption.'),

        ('tsk_vvps_004', 'sch_vvps', 'wfi_vvps_004', NULL, 
          'Schedule 2 Remedial Fractions Clinics for Class 5-A', 
          'Syllabus pacing slipped by 3 days following the annual sports meet. Conduct two zero-period workshops on visual fractions manipulative strips.', 
          'ACADEMIC', 'SYLLABUS_TOPIC', 'ctop_mth_003', 'teacher', 'ACADEMIC', 'NORMAL', 'COMPLETED', 
          CURRENT_DATE - 1, 48, 1, 'Academic Coordinator', 'NORMAL', 'Proactive remedial intervention restores class pacing index.'),

        ('tsk_vvps_005', 'sch_vvps', NULL, 'appr_vvps_002', 
          'Authorize Purchase Order: Science Lab Robotics Equipment', 
          'Inspect vendor quotes for ₹34,500 and authorize purchase order issuance to RoboTech Edu India Ltd.', 
          'INVENTORY', 'PURCHASE_REQUEST', 'preq_vvps_001', 'principal', 'ADMINISTRATION', 'URGENT', 'OPEN', 
          CURRENT_DATE + 1, 24, 1, 'Manoj Saxena', 'HIGH', 'Required for upcoming district science championship entries.'),

        ('tsk_vvps_006', 'sch_vvps', NULL, NULL, 
          'Physical Book Return Verification: Student Transfer #42', 
          'Verify student Rohan Verma (Class 5-A) has returned the Oxford Illustrated Science Dictionary before issuing library clearance certificate.', 
          'LIBRARY', 'STUDENT', 'stu_vvps_004', 'librarian', 'LIBRARY', 'NORMAL', 'OPEN', 
          CURRENT_DATE + 2, 48, 1, 'Admission Desk', 'LOW', 'Routine TC checkoff task.'),

        ('tsk_vvps_007', 'sch_vvps', NULL, NULL, 
          'Follow-up Parent Fee Installment Overdue: Ananya Sharma', 
          'Term 1 tuition installment is 16 days past due date. Send official reminder circular and schedule parent accounts tele-conference.', 
          'FEES', 'FEE_PAYMENT', 'fpay_vvps_001', 'accountant', 'ACCOUNTS', 'HIGH', 'OPEN', 
          CURRENT_DATE + 3, 72, 1, 'Automated Overdue Sentinel', 'HIGH', 'Overdue past 15 days impacts monthly operating revenue targets.');
    `);

    // 11. Seed Task Comments
    await db.exec(`
      INSERT INTO task_comments (id, task_id, school_id, user_id, user_name, comment_text, created_at)
      VALUES 
        ('tcom_vvps_001', 'tsk_vvps_001', 'sch_vvps', 'usr_super_admin', 'Anand Kumar Jha (Class Teacher)', 
          'Spoke with mother over telephone at 10:30 AM. Student had high viral fever but is recovering and will rejoin on Thursday. Sharing homework notes on student portal.', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
        ('tcom_vvps_002', 'tsk_vvps_003', 'sch_vvps', 'usr_super_admin', 'Ram Singh (Transport Manager)', 
          'Authorized RTO mechanic workshop slot booked for this Saturday at 9:00 AM.', CURRENT_TIMESTAMP - INTERVAL '5 hours');
    `);

    // 12. Seed Execution Logs
    await db.exec(`
      INSERT INTO automation_execution_logs (id, school_id, rule_id, rule_name, trigger_event, entity_type, entity_id, status, actions_executed, execution_duration_ms, executed_at)
      VALUES 
        ('ael_vvps_001', 'sch_vvps', 'rule_vvps_01', 'High Absence Class Teacher Warning Task', 'ATTENDANCE_PERCENTAGE_CALCULATED', 'STUDENT', 'stu_vvps_002', 'SUCCESS', '["CREATE_TASK", "SEND_NOTIFICATION"]', 42, CURRENT_TIMESTAMP - INTERVAL '1 day'),
        ('ael_vvps_002', 'sch_vvps', 'rule_vvps_03', 'Vehicle Fitness 30-Day Mandatory Inspection', 'VEHICLE_EXPIRY_CHECK', 'TRANSPORT_VEHICLE', 'veh_vvps_001', 'SUCCESS', '["CREATE_TASK"]', 18, CURRENT_TIMESTAMP - INTERVAL '2 days'),
        ('ael_vvps_003', 'sch_vvps', 'rule_vvps_04', 'Curriculum Topic Lagging Intervention Task', 'SYLLABUS_PROGRESS_UPDATED', 'SYLLABUS_TOPIC', 'ctop_mth_003', 'SUCCESS', '["CREATE_TASK", "SEND_NOTIFICATION"]', 35, CURRENT_TIMESTAMP - INTERVAL '3 days');
    `);

    console.log('[DB] Phase 23 Workflow schema and sample seeds initialized successfully.');
  } catch (err: any) {
    phase23Error = err?.message || String(err);
    console.error('[DB] Phase 23 initialization error:', err);
  }
}
