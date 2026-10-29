import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Play,
  Trash2,
  Plus,
  Mail,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  RefreshCw,
  Send
} from 'lucide-react';

interface SavedAndScheduledProps {
  schoolId?: string;
}

export const SavedAndScheduledReportsView: React.FC<SavedAndScheduledProps> = ({
  schoolId
}) => {
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [scheduledReports, setScheduledReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New Schedule Modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [recipients, setRecipients] = useState('');
  const [format, setFormat] = useState('excel');
  const [savingSchedule, setSavingSchedule] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [savedRes, schedRes] = await Promise.all([
        fetch(`/api/mis/saved-reports${schoolId ? `?schoolId=${schoolId}` : ''}`),
        fetch(`/api/mis/scheduled-reports${schoolId ? `?schoolId=${schoolId}` : ''}`)
      ]);
      const savedData = await savedRes.json();
      const schedData = await schedRes.json();

      setSavedReports(savedData.savedReports || []);
      setScheduledReports(schedData.scheduledReports || []);
    } catch (err) {
      console.error('[FETCH REPORTS ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [schoolId]);

  const handleDeleteSaved = async (id: string) => {
    if (!confirm('Are you sure you want to delete this saved report template?')) return;
    try {
      await fetch(`/api/mis/saved-reports/${id}`, { method: 'DELETE' });
      setSavedReports(savedReports.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteScheduled = async (id: string) => {
    if (!confirm('Cancel this scheduled report delivery?')) return;
    try {
      await fetch(`/api/mis/scheduled-reports/${id}`, { method: 'DELETE' });
      setScheduledReports(scheduledReports.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunScheduledNow = async (id: string) => {
    try {
      const res = await fetch(`/api/mis/scheduled-reports/${id}/run-now`, { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'Scheduled report executed successfully.');
      fetchReports();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSchedule = async () => {
    if (!selectedReportId || !scheduleTitle || !recipients) return;
    setSavingSchedule(true);
    try {
      const res = await fetch('/api/mis/scheduled-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          savedReportId: selectedReportId,
          title: scheduleTitle,
          frequency,
          recipients,
          format
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setIsScheduleModalOpen(false);
      setScheduleTitle('');
      setRecipients('');
      fetchReports();
    } catch (err: any) {
      alert(`Error scheduling report: ${err.message}`);
    } finally {
      setSavingSchedule(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. SAVED REPORT TEMPLATES SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              Saved Report Templates ({savedReports.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Reusable pre-configured queries across students, attendance, fees, exams, and inventory
            </p>
          </div>
          <button
            type="button"
            onClick={fetchReports}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors w-fit"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedReports.map((rep) => (
            <div key={rep.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {rep.module}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(rep.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 mt-2">{rep.title}</h4>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{rep.description || 'No description provided.'}</p>
              </div>

              <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">By: {rep.created_by_name || 'Admin'}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteSaved(rep.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. AUTOMATED SCHEDULED REPORT JOBS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              Automated Report Delivery Schedule ({scheduledReports.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Scheduled dispatches delivered automatically via email digest to leadership
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (savedReports.length === 0) {
                alert('Please save at least one custom report template first.');
                return;
              }
              setSelectedReportId(savedReports[0].id);
              setIsScheduleModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-xs w-fit"
          >
            <Plus className="w-3.5 h-3.5" />
            Schedule New Delivery
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3">Schedule Name</th>
                <th className="py-2.5 px-3">Cadence</th>
                <th className="py-2.5 px-3">Recipients</th>
                <th className="py-2.5 px-3">Format</th>
                <th className="py-2.5 px-3">Last Run</th>
                <th className="py-2.5 px-3">Next Run</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scheduledReports.map((sch) => (
                <tr key={sch.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {sch.title}
                    <span className="block text-[10px] text-slate-400">{sch.report_title}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-50 text-purple-700">
                      {sch.frequency}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] truncate max-w-[200px]">
                    {sch.recipients}
                  </td>
                  <td className="py-2.5 px-3 uppercase font-semibold text-slate-700 text-[10px]">
                    {sch.format}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                    {sch.last_run_at ? new Date(sch.last_run_at).toLocaleString() : 'Never'}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800 text-[11px]">
                    {sch.next_run_at ? new Date(sch.next_run_at).toLocaleDateString() : 'Pending'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRunScheduledNow(sch.id)}
                        title="Simulate Dispatch Now"
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteScheduled(sch.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SCHEDULE MODAL */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900">Schedule Automated Report Delivery</h4>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Report Template *</label>
                <select
                  value={selectedReportId}
                  onChange={(e) => setSelectedReportId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-white"
                >
                  {savedReports.map((r) => (
                    <option key={r.id} value={r.id}>{r.title} ({r.module})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delivery Task Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly Management Digest"
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cadence / Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-white"
                  >
                    <option value="daily">Daily (08:00 AM)</option>
                    <option value="weekly">Weekly (Monday 08:00 AM)</option>
                    <option value="monthly">Monthly (1st of Month)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Export Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-white"
                  >
                    <option value="excel">Excel (.xlsx/.csv)</option>
                    <option value="pdf">Formatted PDF Document</option>
                    <option value="csv">Standard CSV</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipients (Email Addresses) *</label>
                <textarea
                  rows={2}
                  placeholder="principal@school.edu, accounts@school.edu"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                ></textarea>
                <span className="text-[10px] text-slate-400">Comma-separated email recipients</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCreateSchedule}
                disabled={savingSchedule || !scheduleTitle || !recipients}
                className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs"
              >
                {savingSchedule ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
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
