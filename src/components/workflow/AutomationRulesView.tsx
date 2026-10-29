import React, { useState, useEffect } from 'react';
import {
  AutomationRule,
  ASTCondition,
  ASTConditionGroup,
  SafetyLevel
} from './WorkflowCommon';

export const AutomationRulesView: React.FC = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulator State
  const [simRuleId, setSimRuleId] = useState<string>('');
  const [simPayload, setSimPayload] = useState<string>(
    JSON.stringify({ student: { consecutive_absent_days: 3, attendance_pct: 71.5 }, amount: 6500, role: 'student' }, null, 2)
  );
  const [simResult, setSimResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  // Create Rule Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('ATTENDANCE_RECORDED');
  const [entityType, setEntityType] = useState('STUDENT');
  const [safetyLevel, setSafetyLevel] = useState<SafetyLevel>('LEVEL_1_AUTOMATIC');
  const [combinator, setCombinator] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<ASTCondition[]>([
    { field: 'consecutive_absent_days', operator: 'GREATER_THAN_EQUAL', value: 3 }
  ]);
  const [actionType, setActionType] = useState('CREATE_TASK');
  const [actionTitle, setActionTitle] = useState('Counselor Student Wellness Check');
  const [actionRole, setActionRole] = useState('teacher');
  const [actionDept, setActionDept] = useState('Academic');

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/workflow/rules');
      const data = await res.json();
      if (data.success) {
        setRules(data.rules || []);
        if (data.rules?.length > 0 && !simRuleId) {
          setSimRuleId(data.rules[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggleRule = async (id: string, currentActive: boolean) => {
    try {
      await fetch(`/api/workflow/rules/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive })
      });
      fetchRules();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunSimulation = async () => {
    if (!simRuleId) return;

    try {
      setSimulating(true);
      setSimResult(null);
      let parsedPayload = {};
      try {
        parsedPayload = JSON.parse(simPayload);
      } catch (e) {
        alert('Invalid JSON in simulator payload');
        setSimulating(false);
        return;
      }

      const res = await fetch(`/api/workflow/rules/${simRuleId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_payload: parsedPayload })
      });
      const data = await res.json();
      if (data.success) {
        setSimResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleAddCondition = () => {
    setConditions((prev) => [...prev, { field: 'status', operator: 'EQUALS', value: 'ACTIVE' }]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConditionChange = (index: number, field: keyof ASTCondition, val: any) => {
    setConditions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    const astGroup: ASTConditionGroup = {
      combinator,
      conditions
    };

    const actions = [
      {
        type: actionType,
        title: actionTitle,
        assigned_role: actionRole,
        assigned_department: actionDept,
        priority: 'HIGH'
      }
    ];

    try {
      const res = await fetch('/api/workflow/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ruleName,
          description: ruleDesc,
          trigger_event: triggerEvent,
          entity_type: entityType,
          safety_level: safetyLevel,
          conditions_ast: astGroup,
          actions_json: actions
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setRuleName('');
        setRuleDesc('');
        fetchRules();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Safe AST Automation Rules Engine</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              Zero Arbitrary Code / Pure Structured AST
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Build event-driven rules with structured JSON operators (equals, contains, greater than, in, is empty) with human approval gates.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition flex items-center gap-1.5 self-start md:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Build Automation Rule
        </button>
      </div>

      {/* Simulator Section */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-5 text-white shadow-lg border border-indigo-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h3 className="font-bold text-sm">Interactive Safe AST Rule Simulator</h3>
            <span className="text-[11px] text-indigo-300 bg-indigo-800/50 px-2 py-0.5 rounded border border-indigo-700/50">
              Dry-run evaluation without side-effects
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={simRuleId}
              onChange={(e) => setSimRuleId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-3 py-1.5 text-white focus:outline-none"
            >
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  Rule: {r.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleRunSimulation}
              disabled={simulating || !simRuleId}
              className="px-4 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {simulating ? 'Evaluating...' : 'Simulate Rule'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Test Input JSON Payload:
            </label>
            <textarea
              rows={5}
              value={simPayload}
              onChange={(e) => setSimPayload(e.target.value)}
              className="w-full font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl p-3 text-indigo-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              AST Evaluation Output:
            </label>
            <div className="h-[120px] bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono overflow-y-auto">
              {simResult ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Match Result:</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                      simResult.matched ? 'bg-emerald-900 text-emerald-300' : 'bg-red-950 text-red-300'
                    }`}>
                      {simResult.matched ? '✓ CONDITIONS SATISFIED (MATCH)' : '✗ CONDITIONS NOT MET'}
                    </span>
                  </div>
                  {simResult.matched && (
                    <div className="text-indigo-300 text-[11px] pt-1">
                      Actions that would trigger:
                      <ul className="list-disc pl-4 mt-0.5 text-slate-300">
                        {simResult.actions_that_would_execute?.map((a: any, i: number) => (
                          <li key={i}>
                            {a.type} → {a.title} ({a.assigned_role})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-slate-500 italic">
                  Click 'Simulate Rule' to evaluate condition AST against the JSON payload.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rules List Table / Cards */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">Configured Automation Rules ({rules.length})</h3>
          <span className="text-xs text-gray-500">Auto-evaluates on live ERP events</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-gray-500">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading rules...
          </div>
        ) : rules.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs">
            No automation rules configured. Build one or install from templates.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rules.map((rule) => {
              const ast = rule.conditions_ast || { combinator: 'AND', conditions: [] };

              return (
                <div key={rule.id} className="p-4 hover:bg-gray-50/50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                        rule.safety_level === 'LEVEL_3_RESTRICTED'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : rule.safety_level === 'LEVEL_2_CONFIRMED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {rule.safety_level.replace('_', ' ')}
                      </span>

                      <span className="text-xs font-bold text-gray-800">{rule.name}</span>

                      <span className="text-[11px] font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                        Event: {rule.trigger_event}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 leading-relaxed">{rule.description}</p>

                    {/* Conditions AST Preview */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                      <span className="text-gray-400 font-sans">Condition:</span>
                      {ast.conditions?.map((c: any, i: number) => (
                        <span key={i} className="bg-gray-100 text-indigo-800 px-2 py-0.5 rounded border border-gray-200">
                          {c.field} {c.operator?.toLowerCase().replace(/_/g, ' ')} {String(c.value)}
                        </span>
                      ))}
                      <span className="text-gray-400 font-sans ml-2">→ Actions:</span>
                      {rule.actions_json?.map((a: any, i: number) => (
                        <span key={i} className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-sans font-medium">
                          {a.type} ({a.assigned_role || 'Staff'})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right text-xs">
                      <span className="text-gray-400 block text-[10px]">Triggered</span>
                      <strong className="text-gray-800">{rule.trigger_count || 0} times</strong>
                    </div>

                    {/* Active Toggle */}
                    <button
                      onClick={() => handleToggleRule(rule.id, rule.is_active)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        rule.is_active ? 'bg-emerald-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          rule.is_active ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 bg-indigo-600 text-white font-bold text-sm flex items-center justify-between">
              <span>Build Safe AST Automation Rule</span>
              <button onClick={() => setShowCreateModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateRule} className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Rule Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Consecutive Absence Welfare Outreach"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Trigger Event</label>
                  <select
                    value={triggerEvent}
                    onChange={(e) => setTriggerEvent(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  >
                    <option value="ATTENDANCE_RECORDED">ATTENDANCE_RECORDED</option>
                    <option value="FEE_PAYMENT_DUE">FEE_PAYMENT_DUE</option>
                    <option value="PURCHASE_ORDER_SUBMITTED">PURCHASE_ORDER_SUBMITTED</option>
                    <option value="SYLLABUS_PROGRESS_UPDATED">SYLLABUS_PROGRESS_UPDATED</option>
                    <option value="VEHICLE_EXPIRY_CHECK">VEHICLE_EXPIRY_CHECK</option>
                    <option value="LIBRARY_ISSUE_OVERDUE">LIBRARY_ISSUE_OVERDUE</option>
                    <option value="TC_APPLICATION_SUBMITTED">TC_APPLICATION_SUBMITTED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Explain operational rationale..."
                  value={ruleDesc}
                  onChange={(e) => setRuleDesc(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Entity Type</label>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  >
                    <option value="STUDENT">STUDENT</option>
                    <option value="FEE_INVOICE">FEE_INVOICE</option>
                    <option value="PURCHASE_ORDER">PURCHASE_ORDER</option>
                    <option value="SYLLABUS_TOPIC">SYLLABUS_TOPIC</option>
                    <option value="TRANSPORT_VEHICLE">TRANSPORT_VEHICLE</option>
                    <option value="LIBRARY_ISSUE">LIBRARY_ISSUE</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Safety Gate Level</label>
                  <select
                    value={safetyLevel}
                    onChange={(e) => setSafetyLevel(e.target.value as SafetyLevel)}
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  >
                    <option value="LEVEL_1_AUTOMATIC">Level 1 - Automatic Execution</option>
                    <option value="LEVEL_2_CONFIRMED">Level 2 - Supervisor Confirmed</option>
                    <option value="LEVEL_3_RESTRICTED">Level 3 - Restricted (Mandatory Human Sign-off)</option>
                  </select>
                </div>
              </div>

              {/* AST Condition Builder */}
              <div className="border border-indigo-100 bg-indigo-50/20 p-3.5 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">Condition Logic:</span>
                    <select
                      value={combinator}
                      onChange={(e) => setCombinator(e.target.value as 'AND' | 'OR')}
                      className="text-xs p-1 bg-white border border-gray-200 rounded font-semibold text-indigo-700"
                    >
                      <option value="AND">MATCH ALL (AND)</option>
                      <option value="OR">MATCH ANY (OR)</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    + Add Condition
                  </button>
                </div>

                <div className="space-y-2">
                  {conditions.map((cond, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200">
                      <input
                        type="text"
                        placeholder="field (e.g. consecutive_absent_days)"
                        value={cond.field}
                        onChange={(e) => handleConditionChange(idx, 'field', e.target.value)}
                        className="flex-1 p-1 border border-gray-200 rounded text-xs"
                      />
                      <select
                        value={cond.operator}
                        onChange={(e) => handleConditionChange(idx, 'operator', e.target.value)}
                        className="p-1 border border-gray-200 rounded text-xs"
                      >
                        <option value="EQUALS">equals</option>
                        <option value="NOT_EQUALS">not equals</option>
                        <option value="CONTAINS">contains</option>
                        <option value="GREATER_THAN">greater than</option>
                        <option value="LESS_THAN">less than</option>
                        <option value="GREATER_THAN_EQUAL">greater than equal</option>
                        <option value="LESS_THAN_EQUAL">less than equal</option>
                        <option value="IN">in (comma separated)</option>
                        <option value="IS_EMPTY">is empty</option>
                        <option value="IS_NOT_EMPTY">is not empty</option>
                      </select>
                      <input
                        type="text"
                        placeholder="target value"
                        value={cond.value}
                        onChange={(e) => handleConditionChange(idx, 'value', e.target.value)}
                        className="flex-1 p-1 border border-gray-200 rounded text-xs"
                      />
                      {conditions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCondition(idx)}
                          className="text-red-500 hover:text-red-700 px-1 font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Config */}
              <div className="border border-emerald-100 bg-emerald-50/20 p-3.5 rounded-xl space-y-2.5">
                <span className="font-bold text-gray-800 block">Execution Action</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-600 mb-1">Action Type</label>
                    <select
                      value={actionType}
                      onChange={(e) => setActionType(e.target.value)}
                      className="w-full p-1.5 border border-gray-200 rounded text-xs"
                    >
                      <option value="CREATE_TASK">CREATE_TASK (Generate Smart Task)</option>
                      <option value="REQUIRE_APPROVAL">REQUIRE_APPROVAL (Route to Approval Center)</option>
                      <option value="SEND_NOTIFICATION">SEND_NOTIFICATION (Dispatch Portal Notice)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Assigned Target Role</label>
                    <select
                      value={actionRole}
                      onChange={(e) => setActionRole(e.target.value)}
                      className="w-full p-1.5 border border-gray-200 rounded text-xs"
                    >
                      <option value="teacher">Class Teacher</option>
                      <option value="principal">Principal</option>
                      <option value="accountant">Accountant</option>
                      <option value="transport_manager">Transport Manager</option>
                      <option value="hostel_warden">Hostel Warden</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-600 mb-1">Task / Alert Title</label>
                  <input
                    type="text"
                    value={actionTitle}
                    onChange={(e) => setActionTitle(e.target.value)}
                    className="w-full p-1.5 border border-gray-200 rounded text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                >
                  Save & Activate Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
