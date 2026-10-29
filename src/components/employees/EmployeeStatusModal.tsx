import React, { useState } from 'react';
import { api } from '../../services/api.js';
import type { Employee, EmploymentStatus } from '../../types/erp.js';
import { X, UserX, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';

interface EmployeeStatusModalProps {
  employee: Employee;
  onClose: () => void;
  onSuccess: () => void;
}

export const EmployeeStatusModal: React.FC<EmployeeStatusModalProps> = ({
  employee,
  onClose,
  onSuccess
}) => {
  const [newStatus, setNewStatus] = useState<EmploymentStatus>(employee.employment_status);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventType, setEventType] = useState('STATUS_CHANGE');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusOptions: { value: EmploymentStatus; label: string; desc: string; eventType: string }[] = [
    { value: 'ACTIVE', label: 'Active', desc: 'Full active duty on campus', eventType: 'STATUS_CHANGE' },
    { value: 'ON_PROBATION', label: 'On Probation', desc: 'Trial evaluation period before permanent confirmation', eventType: 'PROBATION_COMPLETION' },
    { value: 'ON_LEAVE', label: 'On Leave', desc: 'Approved sabbatical or extended medical leave', eventType: 'LEAVE_OF_ABSENCE' },
    { value: 'SUSPENDED', label: 'Suspended', desc: 'Temporary disciplinary administrative suspension', eventType: 'STATUS_CHANGE' },
    { value: 'RESIGNED', label: 'Resigned', desc: 'Voluntary resignation with notice period', eventType: 'RESIGNATION' },
    { value: 'TERMINATED', label: 'Terminated', desc: 'Employment contract terminated by administration', eventType: 'TERMINATION' },
    { value: 'RETIRED', label: 'Retired', desc: 'Honorably retired following superannuation', eventType: 'RETIREMENT' },
    { value: 'INACTIVE', label: 'Inactive', desc: 'Archive profile from active service', eventType: 'STATUS_CHANGE' }
  ];

  const handleStatusSelect = (opt: typeof statusOptions[0]) => {
    setNewStatus(opt.value);
    setEventType(opt.eventType);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus) {
      setError('Please select an employment status');
      return;
    }
    if (!effectiveDate) {
      setError('Effective date is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await api.employees.updateStatus(employee.id, {
        new_status: newStatus,
        effective_date: effectiveDate,
        remarks: remarks || `Transitioned employment status to ${newStatus}`,
        event_type: eventType
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to update employee status');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Employment Status & Exit Workflow</h3>
              <p className="text-xs text-slate-500 font-medium">
                {employee.first_name} {employee.last_name} ({employee.employee_id_number})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Current Status:</span>
            <span className="font-bold text-slate-900 uppercase font-mono px-2 py-0.5 rounded bg-white border border-slate-200">
              {employee.employment_status.replace('_', ' ')}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select New Employment Status <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStatusSelect(opt)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    newStatus === opt.value
                      ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Effective Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Event Category
              </label>
              <input
                type="text"
                value={eventType}
                onChange={(e) => setEventType(e.target.value.toUpperCase())}
                placeholder="e.g. RESIGNATION, RETIREMENT"
                className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Detailed Reason / Exit Remarks <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Record official administrative notes, handover status, clearance details, or reason for resignation/termination..."
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 leading-relaxed">
            Note: Employee data is never deleted from the school database. Historical service records, past teaching assignments, and uploaded documents remain archived for audit and certificate verification.
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saving ? 'Updating...' : 'Save & Record History'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
