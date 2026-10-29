import React, { useState } from 'react';
import { WorkflowDashboardView } from './WorkflowDashboardView.js';
import { ApprovalCenterView } from './ApprovalCenterView.js';
import { TaskCenterView } from './TaskCenterView.js';
import { AutomationRulesView } from './AutomationRulesView.js';
import { WorkflowDefinitionsView } from './WorkflowDefinitionsView.js';
import { WorkflowAuditReportsView } from './WorkflowAuditReportsView.js';

export const WorkflowManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'approvals' | 'tasks' | 'rules' | 'definitions' | 'reports'>('dashboard');
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [testEvent, setTestEvent] = useState('ATTENDANCE_RECORDED');
  const [testEntityType, setTestEntityType] = useState('STUDENT');
  const [testEntityId, setTestEntityId] = useState('stu_vvps_001');
  const [testPayload, setTestPayload] = useState(
    JSON.stringify({ consecutive_absent_days: 3, attendance_pct: 68.5, student_name: 'Aarav Sharma' }, null, 2)
  );
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);

  const handleDispatchTestEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setTriggerStatus('Dispatching event...');
      let parsed = {};
      try {
        parsed = JSON.parse(testPayload);
      } catch (e) {
        setTriggerStatus('Invalid JSON in payload');
        return;
      }

      const res = await fetch('/api/workflow/events/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: testEvent,
          entity_type: testEntityType,
          entity_id: testEntityId,
          payload: parsed
        })
      });

      const data = await res.json();
      if (data.success) {
        setTriggerStatus(`Event dispatched successfully! Executed ${data.executed?.length || 0} rule actions.`);
        setTimeout(() => {
          setShowTriggerModal(false);
          setTriggerStatus(null);
        }, 1500);
      } else {
        setTriggerStatus(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setTriggerStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title & Main Tabs Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Workflow Automation & Approvals</h1>
              <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                Phase 23 Active
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              School: <strong className="text-gray-800">Vidya Vahini Public School (CBSE Affiliation #1030456)</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTriggerModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Simulate Event Dispatch
          </button>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-200">
        {[
          { id: 'dashboard', label: 'Command Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
          { id: 'approvals', label: 'Approval Center', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
          { id: 'tasks', label: 'Smart Task Center', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
          { id: 'rules', label: 'AST Rules Engine', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
          { id: 'definitions', label: 'Workflow Definitions & Templates', icon: 'M4 6h16M4 12h16m-7 6h7' },
          { id: 'reports', label: 'Audit & SLA Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Views */}
      {activeTab === 'dashboard' && <WorkflowDashboardView onNavigateTab={(t) => setActiveTab(t as any)} />}
      {activeTab === 'approvals' && <ApprovalCenterView />}
      {activeTab === 'tasks' && <TaskCenterView />}
      {activeTab === 'rules' && <AutomationRulesView />}
      {activeTab === 'definitions' && <WorkflowDefinitionsView />}
      {activeTab === 'reports' && <WorkflowAuditReportsView />}

      {/* Event Trigger Modal */}
      {showTriggerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 bg-indigo-600 text-white font-bold text-sm flex items-center justify-between">
              <span>Simulate Real-time ERP Event Dispatch</span>
              <button onClick={() => setShowTriggerModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleDispatchTestEvent} className="p-5 space-y-3 text-xs">
              <p className="text-gray-500">
                Dispatch an event into the Phase 23 workflow engine to test active automation rules and see tasks or approval requests generated instantly.
              </p>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Event Name</label>
                <select
                  value={testEvent}
                  onChange={(e) => {
                    setTestEvent(e.target.value);
                    if (e.target.value === 'FEE_PAYMENT_DUE') {
                      setTestEntityType('FEE_INVOICE');
                      setTestEntityId('inv_vvps_001');
                      setTestPayload(JSON.stringify({ balance_amount: 12000, days_overdue: 18, student_id: 'stu_vvps_002' }, null, 2));
                    } else if (e.target.value === 'VEHICLE_EXPIRY_CHECK') {
                      setTestEntityType('TRANSPORT_VEHICLE');
                      setTestEntityId('veh_vvps_001');
                      setTestPayload(JSON.stringify({ fitness_days_remaining: 15, vehicle_reg_no: 'DL 01 A 4589' }, null, 2));
                    } else {
                      setTestEntityType('STUDENT');
                      setTestEntityId('stu_vvps_001');
                      setTestPayload(JSON.stringify({ consecutive_absent_days: 3, attendance_pct: 68.5, student_name: 'Aarav Sharma' }, null, 2));
                    }
                  }}
                  className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                >
                  <option value="ATTENDANCE_RECORDED">ATTENDANCE_RECORDED</option>
                  <option value="FEE_PAYMENT_DUE">FEE_PAYMENT_DUE</option>
                  <option value="PURCHASE_ORDER_SUBMITTED">PURCHASE_ORDER_SUBMITTED</option>
                  <option value="VEHICLE_EXPIRY_CHECK">VEHICLE_EXPIRY_CHECK</option>
                  <option value="SYLLABUS_PROGRESS_UPDATED">SYLLABUS_PROGRESS_UPDATED</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Entity Type</label>
                  <input
                    type="text"
                    value={testEntityType}
                    onChange={(e) => setTestEntityType(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Entity ID</label>
                  <input
                    type="text"
                    value={testEntityId}
                    onChange={(e) => setTestEntityId(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Event Payload (JSON)</label>
                <textarea
                  rows={4}
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  className="w-full p-2.5 font-mono text-xs border border-gray-200 rounded-lg bg-gray-50 text-indigo-900"
                />
              </div>

              {triggerStatus && (
                <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                  triggerStatus.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'
                }`}>
                  {triggerStatus}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowTriggerModal(false)}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                >
                  Fire Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
