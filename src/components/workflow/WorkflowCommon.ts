export type SafetyLevel = 'LEVEL_1_AUTOMATIC' | 'LEVEL_2_CONFIRMED' | 'LEVEL_3_RESTRICTED';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ApprovalStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'EXPIRED';

export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';

export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type InstanceStatus = 'RUNNING' | 'WAITING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'FAILED' | 'PAUSED';

export interface WorkflowDefinition {
  id: string;
  school_id: string;
  code: string;
  name: string;
  description: string;
  module: string;
  entity_type: string;
  trigger_event: string;
  status: WorkflowStatus;
  version: number;
  effective_date: string;
  is_system?: boolean;
  step_count?: number;
  active_instances?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_order: number;
  step_name: string;
  step_type: 'APPROVAL' | 'TASK' | 'NOTIFICATION' | 'ACTION' | 'CONDITION';
  assignee_type: string;
  assignee_role: string;
  assignee_id?: string;
  config_json?: any;
  timeout_hours?: number;
  is_required?: boolean;
}

export interface WorkflowVersion {
  id: string;
  workflow_id: string;
  version_number: number;
  definition_snapshot: any;
  changes_summary?: string;
  status: string;
  created_by_name?: string;
  created_at: string;
}

export interface WorkflowInstance {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  workflow_code?: string;
  workflow_version: number;
  school_id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  current_step_order: number;
  status: InstanceStatus;
  started_by_name?: string;
  started_at: string;
  completed_at?: string;
  context_data?: any;
  error_message?: string;
}

export interface WorkflowStepLog {
  id: string;
  instance_id: string;
  step_name: string;
  action_taken: string;
  actor_name?: string;
  remarks?: string;
  timestamp: string;
}

export interface ApprovalStep {
  id: string;
  approval_id: string;
  step_order: number;
  step_name: string;
  approver_role: string;
  approver_id?: string;
  approver_name?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'SKIPPED';
  decision?: string;
  actor_name?: string;
  comments?: string;
  decided_at?: string;
}

export interface ApprovalRequest {
  id: string;
  school_id: string;
  workflow_instance_id?: string;
  request_type: string;
  entity_type: string;
  entity_id: string;
  title: string;
  description: string;
  requester_id: string;
  requester_name: string;
  priority: PriorityLevel;
  safety_level: SafetyLevel;
  approval_flow: 'SINGLE' | 'SEQUENTIAL' | 'PARALLEL';
  current_level: number;
  total_levels: number;
  status: ApprovalStatus;
  sla_deadline?: string;
  escalation_level: number;
  payload_snapshot?: any;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  steps?: ApprovalStep[];
}

export interface ApprovalDelegation {
  id: string;
  delegator_id: string;
  delegator_name: string;
  delegate_user_id: string;
  delegate_user_name: string;
  scope_module: string;
  start_date: string;
  end_date: string;
  reason?: string;
  is_active: boolean;
}

export interface WorkflowTask {
  id: string;
  school_id: string;
  workflow_instance_id?: string;
  title: string;
  description: string;
  task_type: string;
  priority: PriorityLevel;
  entity_type: string;
  entity_id: string;
  assigned_to_user_id?: string;
  assigned_to_user_name?: string;
  assigned_to_role: string;
  assigned_to_department: string;
  due_date: string;
  status: TaskStatus;
  completed_at?: string;
  created_by_name?: string;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_name: string;
  comment: string;
  attachment_url?: string;
  is_internal: boolean;
  created_at: string;
}

export interface ASTCondition {
  field: string;
  operator: string;
  value: any;
}

export interface ASTConditionGroup {
  combinator: 'AND' | 'OR';
  conditions: (ASTCondition | ASTConditionGroup)[];
}

export interface AutomationRule {
  id: string;
  school_id: string;
  name: string;
  description: string;
  trigger_event: string;
  entity_type: string;
  safety_level: SafetyLevel;
  conditions_ast: ASTConditionGroup;
  actions_json: any[];
  is_active: boolean;
  execution_order: number;
  trigger_count: number;
  last_triggered_at?: string;
  created_at: string;
}

export interface DailyBriefingPayload {
  isDraft: boolean;
  isAIPowered: boolean;
  generatedAt: string;
  confidenceScore: number;
  disclaimer: string;
  briefing: {
    headline: string;
    summary: string;
    criticalPriorities: string[];
    departmentRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'ELEVATED';
    recommendedActions: string[];
  };
  stats: {
    approvals: { total_pending: number; critical_count: number; overdue_count: number };
    tasks: { total_open: number; overdue_tasks: number; critical_tasks: number };
    students: { total_students: number; active_students: number };
    fees: { pending_fee_invoices: number; total_outstanding: number };
    transport: { vehicles_count: number };
    inventory: { low_stock_items: number };
  };
}
