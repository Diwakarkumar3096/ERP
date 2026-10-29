import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Plus,
  CheckCircle,
  Search,
  Filter,
  Layers,
  ArrowRight
} from 'lucide-react';

export const AcademicInterventionsView: React.FC = () => {
  const [interventions, setInterventions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInterventionModal, setShowInterventionModal] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    title: 'Syllabus Catch-up Plan: Mathematics Class 5',
    intervention_type: 'SYLLABUS_ACCELERATION',
    target_type: 'SUBJECT',
    trigger_reason: 'Curricular topic pacing is delayed by 4 days due to inter-school sports meet.',
    action_plan: 'Schedule two additional zero-period remedial sessions on Saturday and assign targeted visual worksheets.',
    status: 'ACTIVE',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [intRes, altRes] = await Promise.all([
        fetch('/api/academic/interventions'),
        fetch('/api/academic/alerts'),
      ]);
      const [intData, altData] = await Promise.all([intRes.json(), altRes.json()]);
      setInterventions(intData.interventions || intData.data || []);
      setAlerts(altData.alerts || altData.data || []);
    } catch (err) {
      console.error('Failed to load interventions and alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/academic/alerts/${alertId}/acknowledge`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (data.success) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, is_acknowledged: true } : a))
        );
      }
    } catch (err) {
      console.error('Failed to acknowledge alert', err);
    }
  };

  const handleCreateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/academic/interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowInterventionModal(false);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to create intervention', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Academic Interventions & Early Warning Alerts
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated triggers for syllabus slippages, low diagnostic scores, and corrective recovery plans
            </p>
          </div>

          <button
            onClick={() => setShowInterventionModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Create Intervention Plan
          </button>
        </div>
      </div>

      {/* Grid: Alerts on top, Interventions on bottom */}
      <div className="space-y-6">
        {/* Alerts Section */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Active Academic Alerts ({alerts.filter((a) => !a.is_acknowledged).length} Unresolved)
            </h3>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 py-4 text-center">Loading alerts...</p>
          ) : alerts.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No alerts triggered. Everything is on schedule.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((alt) => (
                <div
                  key={alt.id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    alt.is_acknowledged
                      ? 'bg-slate-50/60 border-slate-200 text-slate-500'
                      : 'bg-amber-50/70 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                          alt.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800'
                            : alt.severity === 'HIGH'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {alt.severity || 'WARNING'}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-slate-600">
                        [{alt.alert_type}]
                      </span>
                      {alt.is_acknowledged && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">
                          Acknowledged
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-slate-800">{alt.message}</p>
                    <div className="text-[10px] text-slate-400">
                      Triggered on: {new Date(alt.created_at).toLocaleString()}
                    </div>
                  </div>

                  {!alt.is_acknowledged && (
                    <button
                      onClick={() => handleAcknowledgeAlert(alt.id)}
                      className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg text-xs font-semibold shrink-0"
                    >
                      Acknowledge Alert
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formal Interventions List */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Syllabus Catch-up & Recovery Plans
            </h3>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 py-4 text-center">Loading interventions...</p>
          ) : interventions.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <p className="text-sm font-semibold text-slate-700">No active recovery plans</p>
              <p className="text-xs text-slate-500 mt-1">
                Click 'Create Intervention Plan' to schedule compensatory periods or review sessions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {interventions.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase">
                        {inv.intervention_type}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{inv.title}</h4>
                      <p className="text-[11px] text-slate-500">
                        Target Scope: <strong className="text-slate-700">{inv.target_type}</strong>
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      {inv.status}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                    <strong className="text-slate-700">Trigger Reason:</strong>
                    <p className="text-slate-600">{inv.trigger_reason}</p>
                  </div>

                  <div className="p-2.5 bg-indigo-50/60 rounded-lg border border-indigo-100 space-y-1">
                    <strong className="text-indigo-950">Action Plan:</strong>
                    <p className="text-indigo-900">{inv.action_plan}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Initiated by: {inv.initiated_by_name || 'Academic Coordinator'}</span>
                    <span>{new Date(inv.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Intervention */}
      {showInterventionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-indigo-700 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">New Academic Intervention</h3>
              <button
                onClick={() => setShowInterventionModal(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateIntervention} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intervention Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type *</label>
                  <select
                    value={formData.intervention_type}
                    onChange={(e) =>
                      setFormData({ ...formData, intervention_type: e.target.value })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  >
                    <option value="SYLLABUS_ACCELERATION">Syllabus Acceleration</option>
                    <option value="EXTRA_CLASSES">Zero Period / Extra Classes</option>
                    <option value="CURRICULAR_REVISION">Targeted Revision</option>
                    <option value="TEACHING_SUPPORT">Faculty Co-Teaching</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target</label>
                  <select
                    value={formData.target_type}
                    onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  >
                    <option value="SUBJECT">Subject / Department</option>
                    <option value="CLASS">Class / Section</option>
                    <option value="TEACHER">Teacher Mentor</option>
                    <option value="STUDENT">Individual Student</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trigger Reason *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.trigger_reason}
                  onChange={(e) => setFormData({ ...formData, trigger_reason: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Action Plan & Corrective Steps *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.action_plan}
                  onChange={(e) => setFormData({ ...formData, action_plan: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowInterventionModal(false)}
                  className="px-3 py-1.5 border text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Save Intervention
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
