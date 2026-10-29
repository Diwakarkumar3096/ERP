import React, { useState, useEffect } from 'react';
import {
  DailyBriefingPayload
} from './WorkflowCommon';

interface WorkflowDashboardViewProps {
  onNavigateTab: (tab: string) => void;
}

export const WorkflowDashboardView: React.FC<WorkflowDashboardViewProps> = ({ onNavigateTab }) => {
  const [stats, setStats] = useState<any>(null);
  const [briefing, setBriefing] = useState<DailyBriefingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/workflow/dashboard');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.error || 'Failed to load workflow stats');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAIBriefing = async () => {
    try {
      setBriefingLoading(true);
      const res = await fetch('/api/workflow/ai/daily-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setBriefing(data);
      }
    } catch (err: any) {
      console.error('Error fetching briefing:', err);
    } finally {
      setBriefingLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAIBriefing();
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex items-center space-x-3 text-indigo-600">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-medium text-sm">Loading Workflow Engine telemetry...</span>
        </div>
      </div>
    );
  }

  const approvals = stats?.approvals || {};
  const tasks = stats?.tasks || {};
  const workflows = stats?.workflows || {};
  const deptWorkload = stats?.departmentWorkload || [];
  const recentActivity = stats?.recentActivity || [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 p-6 rounded-2xl text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-md">
              Phase 23 Engine
            </span>
            <span className="text-xs text-indigo-200">Autonomous Workflow & Multi-School Governance</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Operations Command & Workflow Automation</h2>
          <p className="text-indigo-200 text-sm mt-1 max-w-2xl">
            Real-time rule execution, multi-level financial/administrative approvals with Level 3 safeguards, SLA escalations, and automated smart task delegation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchDashboardData(); fetchAIBriefing(); }}
            className="px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Telemetry
          </button>
          <button
            onClick={() => onNavigateTab('approvals')}
            className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Approval Center ({approvals.total_pending || 0})
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {/* Pending Approvals */}
        <div
          onClick={() => onNavigateTab('approvals')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Pending Approvals</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{approvals.total_pending || 0}</span>
            {Number(approvals.critical_pending) > 0 && (
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                {approvals.critical_pending} Critical
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-gray-500 flex items-center justify-between">
            <span>Level 3 Restricted: {approvals.restricted_pending || 0}</span>
            <span className={Number(approvals.overdue_sla) > 0 ? 'text-red-600 font-semibold' : 'text-emerald-600'}>
              {approvals.overdue_sla || 0} Breached SLA
            </span>
          </div>
        </div>

        {/* Smart Tasks */}
        <div
          onClick={() => onNavigateTab('tasks')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Open Smart Tasks</span>
            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{tasks.total_open || 0}</span>
            {Number(tasks.overdue_tasks) > 0 && (
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                {tasks.overdue_tasks} Overdue
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Assigned to My Queue: <span className="font-semibold text-gray-700">{tasks.my_assigned_tasks || 0}</span>
          </div>
        </div>

        {/* Active Workflows */}
        <div
          onClick={() => onNavigateTab('definitions')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Active Workflows</span>
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{workflows.active_workflows || 0}</span>
            <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              {workflows.running_instances || 0} Running
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Across 9 ERP Modules
          </div>
        </div>

        {/* Active Automation Rules */}
        <div
          onClick={() => onNavigateTab('rules')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Automation Rules</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{workflows.active_rules || 0}</span>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              {workflows.today_rule_executions || 0} Today
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Safe AST Condition Engine
          </div>
        </div>

        {/* SLA Compliance */}
        <div
          onClick={() => onNavigateTab('reports')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer col-span-2 md:col-span-1"
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>SLA Health</span>
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">92.4%</span>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">On Time</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            4-Level Escalation Matrix
          </div>
        </div>
      </div>

      {/* Live AI Daily School Briefing Card */}
      <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-indigo-50 bg-gradient-to-r from-indigo-50/50 via-white to-blue-50/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-base">Executive Operations Briefing</h3>
                <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded-full">
                  {briefing?.isAIPowered ? 'Gemini 2.5 Intelligence' : 'Telemetry Synthesis'}
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                  Draft — Human Review Required
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Automated morning operational briefing cross-referencing attendance anomalies, fee recovery, overdue tasks & inventory
              </p>
            </div>
          </div>
          <button
            onClick={fetchAIBriefing}
            disabled={briefingLoading}
            className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition disabled:opacity-50"
          >
            {briefingLoading ? 'Synthesizing...' : 'Regenerate Briefing'}
          </button>
        </div>

        <div className="p-6">
          {briefing ? (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <h4 className="text-lg font-bold text-gray-900">{briefing.briefing.headline}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Risk Assessment:</span>
                  <span className={`text-xs px-2.5 py-1 font-bold rounded-md ${
                    briefing.briefing.departmentRiskLevel === 'HIGH'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : briefing.briefing.departmentRiskLevel === 'MODERATE'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {briefing.briefing.departmentRiskLevel} RISK
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                {briefing.briefing.summary}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Critical Priorities */}
                <div className="border border-red-100 bg-red-50/30 p-4 rounded-xl">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-red-800 flex items-center gap-1.5 mb-2.5">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Immediate Attention Required
                  </h5>
                  <ul className="space-y-2">
                    {briefing.briefing.criticalPriorities.map((item, idx) => (
                      <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                        <span className="text-red-500 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommended Actions */}
                <div className="border border-blue-100 bg-blue-50/30 p-4 rounded-xl">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5 mb-2.5">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Operational Action Protocol
                  </h5>
                  <ul className="space-y-2">
                    {briefing.briefing.recommendedActions.map((action, idx) => (
                      <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                        <span className="text-blue-500 font-bold">✓</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 flex flex-col md:flex-row md:items-center justify-between text-xs text-gray-400 border-t border-gray-100 gap-2">
                <div>
                  <span className="font-semibold text-gray-500">Telemetry Sources: </span>
                  Students Enrolled: {briefing.stats.students.active_students} | Outstanding Fees: ₹{Number(briefing.stats.fees.total_outstanding).toLocaleString()} | Low Stock Items: {briefing.stats.inventory.low_stock_items}
                </div>
                <div className="italic text-gray-400">
                  Generated at {new Date(briefing.generatedAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              Operational briefing is synthesizing from live database records...
            </div>
          )}
        </div>
      </div>

      {/* Two Column Section: Department Workload & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Workload Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 text-sm">Department Workload & Smart Task Distribution</h3>
            <button
              onClick={() => onNavigateTab('tasks')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              View Task Center →
            </button>
          </div>
          <div className="space-y-3">
            {deptWorkload.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">No tasks assigned yet.</p>
            ) : (
              deptWorkload.map((dept: any, i: number) => {
                const total = Number(dept.total) || 1;
                const completed = Number(dept.completed) || 0;
                const overdue = Number(dept.overdue) || 0;
                const pct = Math.round((completed / total) * 100);

                return (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-800 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span>{dept.department || 'General'}</span>
                        {overdue > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded">
                            {overdue} overdue
                          </span>
                        )}
                      </div>
                      <span className="text-gray-500 font-normal">
                        {completed}/{total} completed ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          overdue > 0 ? 'bg-amber-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Execution & Audit Activity */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 text-sm">Recent Workflow Audit & Execution Timeline</h3>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Full Audit Logs →
            </button>
          </div>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">No recent activity recorded.</p>
            ) : (
              recentActivity.map((act: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition border border-transparent hover:border-gray-100">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    act.action_taken === 'APPROVED' ? 'bg-emerald-500' :
                    act.action_taken === 'REJECTED' ? 'bg-red-500' :
                    act.action_taken === 'INITIATED' ? 'bg-blue-500' : 'bg-gray-400'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-800 truncate">{act.step_name}</span>
                      <span className="text-gray-400 text-[10px] shrink-0">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 truncate">
                      <span className="font-medium text-gray-700">{act.actor_name || 'System'}: </span>
                      {act.remarks || act.action_taken}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
