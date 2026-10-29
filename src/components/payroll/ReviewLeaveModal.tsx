import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { LeaveApplication } from '../../types/erp.js';
import { X, CheckCircle2, XCircle, Calendar, User, FileText } from 'lucide-react';

interface ReviewLeaveModalProps {
  application: LeaveApplication;
  schoolId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewLeaveModal: React.FC<ReviewLeaveModalProps> = ({
  application,
  schoolId,
  onClose,
  onSuccess
}) => {
  const { addToast } = useToast();
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDecision = async (status: 'APPROVED' | 'REJECTED') => {
    setLoading(true);
    try {
      const res = await api.payroll.reviewLeave(application.id, {
        status,
        reviewerComments: comments,
        schoolId
      });
      addToast(res.message || `Leave application marked as ${status}`, 'success');
      onSuccess();
    } catch (err: any) {
      addToast(err.message || 'Failed to update leave application', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Review Leave Application</h3>
            <p className="text-xs text-slate-500 font-mono">
              {application.employee_name} ({application.employee_id_number})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Leave Type:</span>
              <span className="font-semibold text-slate-900">
                {application.leave_type_name} ({application.leave_type_code})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Duration & Dates:</span>
              <span className="font-semibold text-slate-900">
                {new Date(application.start_date).toLocaleDateString('en-IN')} to {new Date(application.end_date).toLocaleDateString('en-IN')} ({application.total_days} days)
              </span>
            </div>
            {application.substitute_name && (
              <div className="flex justify-between">
                <span className="text-slate-500">Academic Substitute:</span>
                <span className="font-semibold text-slate-800">{application.substitute_name}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-slate-500 block mb-1">Reason Stated:</span>
              <p className="text-slate-800 italic bg-white p-2 rounded border border-slate-200">
                "{application.reason}"
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reviewer Remarks / Decision Comments
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Approved. Academic substitute briefed on syllabus coverage."
            />
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200/60 text-[11px] text-emerald-900">
            <strong>Attendance Sync:</strong> Approving this leave automatically marks the staff attendance register as <em>LEAVE</em> for the requested date span.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDecision('REJECTED')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject Leave
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDecision('APPROVED')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors shadow-xs disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
