import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { AttendanceCorrectionRequest } from '../../types/erp.js';
import { X, CheckCircle2, XCircle, FileText, AlertCircle, User } from 'lucide-react';

interface ReviewCorrectionModalProps {
  request: AttendanceCorrectionRequest;
  onSuccess: () => void;
  onClose: () => void;
}

export const ReviewCorrectionModal: React.FC<ReviewCorrectionModalProps> = ({
  request,
  onSuccess,
  onClose
}) => {
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [remarks, setRemarks] = useState('');

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.attendance.reviewCorrection(request.id, {
        action,
        review_remarks: remarks.trim() || undefined
      });

      addToast(
        action === 'APPROVED'
          ? 'Attendance adjustment approved and updated in register.'
          : 'Attendance adjustment request has been rejected.',
        action === 'APPROVED' ? 'success' : 'info'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Failed to process review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const candidateName =
    request.record_type === 'STUDENT'
      ? `${request.student_first_name || ''} ${request.student_last_name || ''}`.trim() || 'Student'
      : `${request.employee_first_name || ''} ${request.employee_last_name || ''}`.trim() || 'Staff';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Review Adjustment Request</h3>
              <p className="text-xs text-slate-400">Formal attendance correction decision</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleReview} className="p-6 space-y-4 text-xs">
          {/* Target Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">{candidateName}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                {request.record_type}
              </span>
            </div>
            <div className="text-slate-600 space-y-0.5">
              <div>Date: <strong className="font-mono text-slate-800">{request.target_date}</strong></div>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200">
                  {request.previous_status}
                </span>
                <span className="text-slate-400">➔</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  {request.requested_status}
                </span>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 mt-2 text-slate-700">
              <span className="font-semibold text-slate-500 text-[10px] uppercase block mb-0.5">Reason</span>
              <p className="italic">{request.reason}</p>
            </div>
            {request.document_url && (
              <div className="text-[11px] text-blue-600 font-mono">
                Attachment: {request.document_url}
              </div>
            )}
            <div className="text-[11px] text-slate-400">
              Requested by: <strong className="text-slate-600">{request.requested_by_name}</strong>
            </div>
          </div>

          {/* Action Decision */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Decision</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAction('APPROVED')}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                  action === 'APPROVED'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" /> Approve & Update
              </button>
              <button
                type="button"
                onClick={() => setAction('REJECTED')}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                  action === 'REJECTED'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <XCircle className="w-4 h-4" /> Reject Request
              </button>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Reviewer Remarks / Order Note
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Verified with medical prescription on file, approved per school rule 14B..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 text-white rounded-lg font-semibold text-xs shadow-sm transition-colors disabled:opacity-50 ${
                action === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {submitting ? 'Saving...' : `Confirm ${action === 'APPROVED' ? 'Approval' : 'Rejection'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
