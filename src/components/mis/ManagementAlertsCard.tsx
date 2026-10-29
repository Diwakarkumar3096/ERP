import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Sliders,
  CheckCircle2,
  BellRing,
  ArrowRight,
  ShieldAlert,
  Save
} from 'lucide-react';

interface ManagementAlertsProps {
  schoolId?: string;
  onNavigateTab?: (tab: any) => void;
}

export const ManagementAlertsCard: React.FC<ManagementAlertsProps> = ({
  schoolId,
  onNavigateTab
}) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [thresholds, setThresholds] = useState<any>({
    min_student_attendance_pct: 80.0,
    min_staff_attendance_pct: 85.0,
    fee_overdue_aging_days: 30,
    fee_overdue_amount_threshold: 5000.0,
    low_inventory_buffer: 5
  });
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [savingThresholds, setSavingThresholds] = useState(false);

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`/api/mis/alerts${schoolId ? `?schoolId=${schoolId}` : ''}`);
      const data = await res.json();
      setAlerts(data.alerts || []);
      if (data.thresholds) setThresholds(data.thresholds);
    } catch (err) {
      console.error('[FETCH ALERTS ERROR]', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [schoolId]);

  const handleSaveThresholds = async () => {
    setSavingThresholds(true);
    try {
      const res = await fetch('/api/mis/alerts/thresholds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          minStudentAttendancePct: thresholds.min_student_attendance_pct,
          minStaffAttendancePct: thresholds.min_staff_attendance_pct,
          feeOverdueAgingDays: thresholds.fee_overdue_aging_days,
          feeOverdueAmountThreshold: thresholds.fee_overdue_amount_threshold,
          lowInventoryBuffer: thresholds.low_inventory_buffer
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setIsConfigOpen(false);
      fetchAlerts();
      alert('Alert thresholds updated successfully.');
    } catch (err: any) {
      alert(`Error saving thresholds: ${err.message}`);
    } finally {
      setSavingThresholds(false);
    }
  };

  if (alerts.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <BellRing className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Active Management Priority Alerts ({alerts.length})</h4>
            <p className="text-[10px] text-slate-500">Cross-departmental exception events requiring administrative review</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsConfigOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <Sliders className="w-3 h-3" />
          Configure Limits
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {alerts.map((alt) => (
          <div
            key={alt.id}
            className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 transition-all ${
              alt.severity === 'HIGH'
                ? 'bg-rose-50/50 border-rose-200/80 text-rose-900'
                : alt.severity === 'MEDIUM'
                ? 'bg-amber-50/50 border-amber-200/80 text-amber-900'
                : 'bg-blue-50/50 border-blue-200/80 text-blue-900'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-white/70">
                  {alt.category}
                </span>
                <span className={`text-[9px] font-bold ${
                  alt.severity === 'HIGH' ? 'text-rose-700' : alt.severity === 'MEDIUM' ? 'text-amber-700' : 'text-blue-700'
                }`}>
                  {alt.severity} PRIORITY
                </span>
              </div>
              <p className="text-xs font-bold leading-tight">{alt.title}</p>
              <p className="text-[11px] opacity-80 mt-1 leading-snug line-clamp-2">{alt.message}</p>
            </div>

            {alt.actionUrl && onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab(alt.actionUrl)}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline pt-1"
              >
                Resolve in Module <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* THRESHOLD CONFIG MODAL */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Configure Management Alert Thresholds
              </h4>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Minimum Student Attendance %</label>
                <input
                  type="number"
                  value={thresholds.min_student_attendance_pct}
                  onChange={(e) => setThresholds({ ...thresholds, min_student_attendance_pct: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                />
                <span className="text-[10px] text-slate-400">Triggers chronic alert when student attendance is lower than this</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fee Defaulter Minimum Outstanding (₹)</label>
                <input
                  type="number"
                  value={thresholds.fee_overdue_amount_threshold}
                  onChange={(e) => setThresholds({ ...thresholds, fee_overdue_amount_threshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fee Overdue Aging Days Threshold</label>
                <input
                  type="number"
                  value={thresholds.fee_overdue_aging_days}
                  onChange={(e) => setThresholds({ ...thresholds, fee_overdue_aging_days: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Inventory Safety Buffer Units</label>
                <input
                  type="number"
                  value={thresholds.low_inventory_buffer}
                  onChange={(e) => setThresholds({ ...thresholds, low_inventory_buffer: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleSaveThresholds}
                disabled={savingThresholds}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
              >
                {savingThresholds ? 'Saving...' : 'Apply Thresholds'}
              </button>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
