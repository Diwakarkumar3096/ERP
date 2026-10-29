import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import { X, FileCheck, IndianRupee, Calendar } from 'lucide-react';

interface LifecycleEventModalProps {
  schoolId: string;
  employees: Array<{ id: string; name: string; empNo: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

export const LifecycleEventModal: React.FC<LifecycleEventModalProps> = ({
  schoolId,
  employees,
  onClose,
  onSuccess
}) => {
  const { addToast } = useToast();
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '');
  const [eventType, setEventType] = useState('PROMOTION');
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  // F&F fields
  const [gratuity, setGratuity] = useState<number | string>(0);
  const [leaveEncashment, setLeaveEncashment] = useState<number | string>(0);
  const [pendingDues, setPendingDues] = useState<number | string>(0);
  const [settlementStatus, setSettlementStatus] = useState('PENDING');
  const [loading, setLoading] = useState(false);

  const isFnF = eventType === 'FULL_AND_FINAL' || eventType === 'RESIGNATION';
  const gratNum = parseFloat(String(gratuity)) || 0;
  const encashNum = parseFloat(String(leaveEncashment)) || 0;
  const duesNum = parseFloat(String(pendingDues)) || 0;
  const netFnF = gratNum + encashNum - duesNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast('Please provide an event title', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.payroll.recordLifecycleEvent({
        schoolId,
        employeeId,
        eventType,
        eventDate,
        title,
        details,
        gratuityAmount: gratNum,
        leaveEncashment: encashNum,
        pendingDues: duesNum,
        settlementStatus: isFnF ? settlementStatus : 'N/A'
      });
      addToast(res.message || 'HR Lifecycle event recorded successfully', 'success');
      onSuccess();
    } catch (err: any) {
      addToast(err.message || 'Failed to record event', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Record HR Event & Service Book</h3>
              <p className="text-xs text-slate-500">Promotion, merit increment, transfer, or Full & Final exit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Employee</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.empNo})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800"
              >
                <option value="PROMOTION">Promotion / Grade Escalation</option>
                <option value="INCREMENT">Merit Salary Increment</option>
                <option value="TRANSFER">Departmental Transfer</option>
                <option value="RESIGNATION">Staff Resignation Notice</option>
                <option value="FULL_AND_FINAL">Full & Final (F&F) Exit Settlement</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Effective Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Event Title / Order Ref</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              placeholder="e.g. Promotion to Senior PGT Physics & Head of Science"
            />
          </div>

          {isFnF && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
              <span className="text-xs font-bold text-amber-950 block">Full & Final Settlement Calculations</span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Gratuity (₹)</label>
                  <input
                    type="number"
                    value={gratuity}
                    onChange={(e) => setGratuity(e.target.value)}
                    className="w-full text-xs rounded border border-slate-300 p-1.5 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Leave Encashment (₹)</label>
                  <input
                    type="number"
                    value={leaveEncashment}
                    onChange={(e) => setLeaveEncashment(e.target.value)}
                    className="w-full text-xs rounded border border-slate-300 p-1.5 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Dues / Recovery (₹)</label>
                  <input
                    type="number"
                    value={pendingDues}
                    onChange={(e) => setPendingDues(e.target.value)}
                    className="w-full text-xs rounded border border-slate-300 p-1.5 bg-white font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-amber-200/80 font-bold">
                <span className="text-amber-900">Net F&F Payable:</span>
                <span className="font-mono text-emerald-800 text-sm">₹{netFnF.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Details & Remarks</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              placeholder="Record decision details, handover checklist status, or management notes..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors shadow-xs disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Record Service Book Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
