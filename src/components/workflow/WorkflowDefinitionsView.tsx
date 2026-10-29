import React, { useState, useEffect } from 'react';
import {
  WorkflowDefinition,
  WorkflowVersion,
  WorkflowInstance
} from './WorkflowCommon';

export const WorkflowDefinitionsView: React.FC = () => {
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'definitions' | 'templates' | 'instances'>('definitions');

  // Version Drawer
  const [selectedDefinition, setSelectedDefinition] = useState<WorkflowDefinition | null>(null);
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Start Instance Modal
  const [showStartModal, setShowStartModal] = useState(false);
  const [startWfCode, setStartWfCode] = useState('');
  const [startEntityId, setStartEntityId] = useState('');
  const [startTitle, setStartTitle] = useState('');

  const fetchDefinitions = async () => {
    try {
      setLoading(true);
      const [defsRes, tplRes, instRes] = await Promise.all([
        fetch('/api/workflow/definitions'),
        fetch('/api/workflow/templates'),
        fetch('/api/workflow/instances')
      ]);

      const defsData = await defsRes.json();
      const tplData = await tplRes.json();
      const instData = await instRes.json();

      if (defsData.success) setDefinitions(defsData.definitions || []);
      if (tplData.success) setTemplates(tplData.templates || []);
      if (instData.success) setInstances(instData.instances || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefinitions();
  }, []);

  const handleViewVersions = async (wf: WorkflowDefinition) => {
    setSelectedDefinition(wf);
    try {
      setLoadingVersions(true);
      const res = await fetch(`/api/workflow/definitions/${wf.id}`);
      const data = await res.json();
      if (data.success) {
        setVersions(data.versions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleInstallTemplate = async (templateCode: string) => {
    try {
      const res = await fetch('/api/workflow/templates/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_code: templateCode })
      });
      const data = await res.json();
      if (data.success) {
        fetchDefinitions();
        setActiveSubTab('definitions');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startWfCode || !startEntityId) return;

    try {
      const res = await fetch('/api/workflow/instances/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_code: startWfCode,
          entity_id: startEntityId,
          title: startTitle || `Manual Run: ${startWfCode} (${startEntityId})`
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowStartModal(false);
        setStartEntityId('');
        setStartTitle('');
        fetchDefinitions();
        setActiveSubTab('instances');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Workflow Definitions & Templates</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
              Versioned Stages & State Machines
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Browse installed workflow stages, inspect previous version history, or install standard CBSE school automation templates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-gray-100 p-1 rounded-xl flex items-center text-xs">
            <button
              onClick={() => setActiveSubTab('definitions')}
              className={`px-3 py-1.5 font-bold rounded-lg transition ${
                activeSubTab === 'definitions' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active Definitions ({definitions.length})
            </button>
            <button
              onClick={() => setActiveSubTab('templates')}
              className={`px-3 py-1.5 font-bold rounded-lg transition ${
                activeSubTab === 'templates' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Templates Library (12)
            </button>
            <button
              onClick={() => setActiveSubTab('instances')}
              className={`px-3 py-1.5 font-bold rounded-lg transition ${
                activeSubTab === 'instances' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Running Executions ({instances.length})
            </button>
          </div>

          <button
            onClick={() => setShowStartModal(true)}
            className="px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Trigger Instance
          </button>
        </div>
      </div>

      {/* Sub-tab 1: Active Definitions */}
      {activeSubTab === 'definitions' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">Installed Workflow Stage Definitions</h3>
            <span className="text-xs text-gray-500">Each definition enforces step sequencing and audit logging</span>
          </div>

          <div className="divide-y divide-gray-100">
            {definitions.map((wf) => (
              <div key={wf.id} className="p-4 hover:bg-gray-50/50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {wf.module}
                    </span>
                    <span className="text-xs font-bold text-gray-900">{wf.name}</span>
                    <span className="text-[11px] font-mono text-gray-400">({wf.code})</span>
                    <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-gray-100 text-gray-600 rounded">
                      v{wf.version}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">{wf.description}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-400">
                    <span>Trigger: <strong className="text-gray-700 font-mono text-[11px]">{wf.trigger_event}</strong></span>
                    <span>Stages: <strong className="text-gray-700">{wf.step_count || 3} sequential steps</strong></span>
                    <span>Active Executions: <strong className="text-indigo-600">{wf.active_instances || 0}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleViewVersions(wf)}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    Version History (v{wf.version})
                  </button>
                  <span className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
                    {wf.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tab 2: Templates Library */}
      {activeSubTab === 'templates' && (
        <div className="space-y-4">
          <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl text-xs text-indigo-900">
            <strong>12 Pre-configured Production School Automation Templates: </strong>
            Designed specifically for CBSE/ICSE school workflows covering student welfare, financial governance, campus safety, and academic tracking.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => {
              const isInstalled = definitions.some((d) => d.code === tpl.code);

              return (
                <div key={tpl.code} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-gray-100 text-gray-700">
                        {tpl.module} • {tpl.category}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        tpl.safety_level === 'LEVEL_3_RESTRICTED' ? 'bg-red-100 text-red-800' :
                        tpl.safety_level === 'LEVEL_2_CONFIRMED' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {tpl.safety_level === 'LEVEL_3_RESTRICTED' ? 'Level 3 Restricted' : 'Standard Gate'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-gray-900 mb-1">{tpl.name}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3">{tpl.description}</p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-mono text-[11px]">{tpl.steps_count} Stages</span>
                    {isInstalled ? (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        ✓ Installed
                      </span>
                    ) : (
                      <button
                        onClick={() => handleInstallTemplate(tpl.code)}
                        className="px-3 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-sm"
                      >
                        Install Template
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-tab 3: Running Executions */}
      {activeSubTab === 'instances' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">Active & Recent Workflow Instances ({instances.length})</h3>
            <span className="text-xs text-gray-500">Live state machine execution telemetry</span>
          </div>

          {instances.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-xs">
              No workflow executions active. Click 'Trigger Instance' to launch one manually.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {instances.map((inst) => (
                <div key={inst.id} className="p-4 hover:bg-gray-50/50 transition flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        inst.status === 'RUNNING' ? 'bg-blue-100 text-blue-800' :
                        inst.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        inst.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {inst.status}
                      </span>
                      <h4 className="text-xs font-bold text-gray-900">{inst.title}</h4>
                      <span className="text-[11px] text-gray-400 font-mono">({inst.id})</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Workflow: <strong className="text-gray-700">{inst.workflow_name || inst.workflow_code}</strong></span>
                      <span>Entity: <strong className="font-mono text-gray-700">{inst.entity_type} #{inst.entity_id}</strong></span>
                      <span>Current Stage: <strong className="text-indigo-600">Step {inst.current_step_order}</strong></span>
                      <span>Started by: {inst.started_by_name || 'System'}</span>
                    </div>
                  </div>

                  <div className="text-right text-xs text-gray-400">
                    <div>{new Date(inst.started_at).toLocaleDateString()}</div>
                    <div className="text-[10px]">{new Date(inst.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Version History Drawer */}
      {selectedDefinition && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-900 text-white font-bold text-sm flex items-center justify-between">
              <span>Version History: {selectedDefinition.name}</span>
              <button onClick={() => setSelectedDefinition(null)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500">
                Immutable workflow snapshots. Prior instances retain their pinned version configuration.
              </p>

              {loadingVersions ? (
                <div className="py-8 text-center text-xs text-gray-400">Loading version snapshots...</div>
              ) : versions.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400 italic">Current version is v1. No prior revisions recorded.</div>
              ) : (
                <div className="space-y-3">
                  {versions.map((ver) => (
                    <div key={ver.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                      <div className="flex items-center justify-between font-bold text-gray-800 mb-1">
                        <span>Version v{ver.version_number}</span>
                        <span className="text-[10px] text-gray-400 font-normal">
                          {new Date(ver.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs">{ver.changes_summary}</p>
                      <div className="mt-1 text-[10px] text-gray-400">
                        Author: {ver.created_by_name || 'Administrator'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedDefinition(null)}
                  className="px-4 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Start Instance Modal */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 bg-indigo-600 text-white font-bold text-sm flex items-center justify-between">
              <span>Trigger Workflow Execution Instance</span>
              <button onClick={() => setShowStartModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleStartInstance} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Select Workflow</label>
                <select
                  required
                  value={startWfCode}
                  onChange={(e) => setStartWfCode(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                >
                  <option value="">-- Choose Active Workflow --</option>
                  {definitions.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Target Entity Record ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. stu_vvps_001 or inv_vvps_101"
                  value={startEntityId}
                  onChange={(e) => setStartEntityId(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Instance Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. TC Clearance - Rohan Sharma"
                  value={startTitle}
                  onChange={(e) => setStartTitle(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowStartModal(false)}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                >
                  Launch Instance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
