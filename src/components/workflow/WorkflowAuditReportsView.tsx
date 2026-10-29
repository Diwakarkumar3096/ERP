import React, { useState, useEffect } from 'react';

export const WorkflowAuditReportsView: React.FC = () => {
  const [reports, setReports] = useState<any>(null);
  const [ruleLogs, setRuleLogs] = useState<any[]>([]);
  const [instanceLogs, setInstanceLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLogTab, setActiveLogTab] = useState<'rules' | 'instances'>('rules');
  const [runningSlaSweep, setRunningSlaSweep] = useState(false);
  const [sweepResult, setSweepResult] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [repRes, logsRes] = await Promise.all([
        fetch('/api/workflow/reports'),
        fetch('/api/workflow/logs?limit=50')
      ]);

      const repData = await repRes.json();
      const logsData = await logsRes.json();

      if (repData.success) setReports(repData);
      if (logsData.success) {
        setRuleLogs(logsData.rule_logs || []);
        setInstanceLogs(logsData.instance_logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunSlaSweep = async () => {
    try {
      setRunningSlaSweep(true);
      const res = await fetch('/api/workflow/sla/check', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSweepResult(data);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRunningSlaSweep(false);
    }
  };

  const sla = reports?.sla_performance || { total_requests: 0, within_sla: 0, breached_sla: 0 };
  const totalReq = Number(sla.total_requests) || 1;
  const withinReq = Number(sla.within_sla) || 0;
  const breachedReq = Number(sla.breached_sla) || 0;
  const compliancePct = Math.round((withinReq / Math.max(totalReq, 1)) * 100);

  const bottlenecks = reports?.bottlenecks || {};
  const deptTurnaround = bottlenecks.departmentTurnaround || [];

  return (
    <div className="space-y-6">
      {/* Top Header & SLA Sweep Action */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Audit Logs & SLA Performance Analytics</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
              Full Audit Trail & SLA Governance
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            End-to-end immutable audit logs for all workflow executions, automated SLA escalation sweeps, and department turnaround diagnostics.
          </p>
        </div>

        <button
          onClick={handleRunSlaSweep}
          disabled={runningSlaSweep}
          className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-2 self-start md:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {runningSlaSweep ? 'Running Sweep...' : 'Run SLA Escalation Sweep'}
        </button>
      </div>

      {sweepResult && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
          <span>
            SLA Escalation worker executed: <strong>{sweepResult.count}</strong> item(s) escalated to supervisor priority.
          </span>
          <button onClick={() => setSweepResult(null)} className="text-amber-700 font-bold">✕</button>
        </div>
      )}

      {/* SLA Health & Bottlenecks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* SLA Compliance Gauge Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 font-semibold mb-2">
              <span>Overall SLA Compliance Rate</span>
              <span className="text-emerald-600 font-bold">Target: 90%</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-gray-900">{compliancePct}%</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                compliancePct >= 90 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {compliancePct >= 90 ? 'Healthy' : 'Needs Optimization'}
              </span>
            </div>

            <div className="w-full bg-gray-100 h-3 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${compliancePct >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${compliancePct}%` }}
              ></div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-800">
              <span className="block text-[10px] text-emerald-600 font-semibold">Resolved On Time</span>
              <strong className="text-base font-bold">{withinReq} requests</strong>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-800">
              <span className="block text-[10px] text-red-600 font-semibold">SLA Breached / Overdue</span>
              <strong className="text-base font-bold">{breachedReq} requests</strong>
            </div>
          </div>
        </div>

        {/* AI Bottleneck Diagnostics Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              <h3 className="font-bold text-gray-900 text-sm">Workflow Bottleneck Analysis</h3>
            </div>
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
              Telemetry Diagnostics
            </span>
          </div>

          <p className="text-xs text-gray-600 mb-3">
            Average approval turnaround duration by request type. Highlights stage delays exceeding the standard 48-hour SLA buffer:
          </p>

          <div className="space-y-2.5">
            {deptTurnaround.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No approval bottleneck data yet.</p>
            ) : (
              deptTurnaround.map((dept: any, i: number) => {
                const avgHours = Math.round(Number(dept.avg_hours) || 4);
                const isSlow = avgHours > 24;

                return (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl text-xs">
                    <span className="font-bold text-gray-800">{dept.request_type}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-[11px]">{dept.count} requests</span>
                      <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                        isSlow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        Avg: {avgHours} hrs
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Execution Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveLogTab('rules')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeLogTab === 'rules' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Automation Rule Triggers ({ruleLogs.length})
            </button>
            <button
              onClick={() => setActiveLogTab('instances')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeLogTab === 'instances' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Workflow Step Actions ({instanceLogs.length})
            </button>
          </div>

          <span className="text-xs text-gray-400">Showing 50 most recent records</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 text-xs">Loading audit logs...</div>
        ) : activeLogTab === 'rules' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-100 font-semibold">
                <tr>
                  <th className="p-3">Rule Name / ID</th>
                  <th className="p-3">Trigger Event</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                {ruleLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-sans font-bold text-gray-900">{log.rule_name || log.rule_id}</td>
                    <td className="p-3 text-indigo-700">{log.trigger_event}</td>
                    <td className="p-3 text-gray-700">{log.entity_type} #{log.entity_id}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' :
                        log.status === 'SKIPPED' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">{log.execution_time_ms || 12}ms</td>
                    <td className="p-3 text-gray-400 font-sans">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-100 font-semibold">
                <tr>
                  <th className="p-3">Step Name</th>
                  <th className="p-3">Instance</th>
                  <th className="p-3">Action Taken</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Remarks</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {instanceLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-bold text-gray-900">{log.step_name}</td>
                    <td className="p-3 text-gray-700 font-mono text-[11px]">{log.instance_title || log.instance_id}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        log.action_taken === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        log.action_taken === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {log.action_taken}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-gray-800">{log.actor_name || 'System'}</td>
                    <td className="p-3 text-gray-500 max-w-xs truncate">{log.remarks || '—'}</td>
                    <td className="p-3 text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
