import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import { X, AlertCircle, FileEdit, CheckCircle2 } from 'lucide-react';

interface CorrectionRequestModalProps {
  schoolId: string;
  initialType?: 'STUDENT' | 'STAFF';
  initialAttendanceId?: string;
  initialTargetDate?: string;
  initialStudentId?: string;
  initialEmployeeId?: string;
  initialPreviousStatus?: string;
  studentName?: string;
  employeeName?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const CorrectionRequestModal: React.FC<CorrectionRequestModalProps> = ({
  schoolId,
  initialType = 'STUDENT',
  initialAttendanceId = '',
  initialTargetDate = new Date().toISOString().split('T')[0],
  initialStudentId,
  initialEmployeeId,
  initialPreviousStatus = 'ABSENT',
  studentName,
  employeeName,
  onSuccess,
  onClose
}) => {
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [recordType, setRecordType] = useState<'STUDENT' | 'STAFF'>(initialType);
  const [attendanceId, setAttendanceId] = useState(initialAttendanceId);
  const [studentId, setStudentId] = useState(initialStudentId || '');
  const [employeeId, setEmployeeId] = useState(initialEmployeeId || '');
  const [targetDate, setTargetDate] = useState(initialTargetDate);
  const [previousStatus, setPreviousStatus] = useState(initialPreviousStatus);
  const [requestedStatus, setRequestedStatus] = useState('PRESENT');
  const [reason, setReason] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      addToast('Please enter an official reason or explanation for this adjustment.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await api.attendance.submitCorrection({
        school_id: schoolId,
        record_type: recordType,
        attendance_id: attendanceId || `manual_${Date.now()}`,
        student_id: recordType === 'STUDENT' ? studentId : undefined,
        employee_id: recordType === 'STAFF' ? employeeId : undefined,
        target_date: targetDate,
        previous_status: previousStatus,
        requested_status: requestedStatus,
        reason: reason.trim(),
        document_url: documentUrl.trim() || undefined
      });

      addToast('Attendance correction request submitted successfully for administrative review.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Failed to submit correction request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Attendance Correction Request</h3>
              <p className="text-xs text-slate-400">Formal adjustment request requiring administrative approval</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Target Info */}
          {(studentName || employeeName) && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">Candidate</span>
                <span className="text-sm font-bold text-slate-800">{studentName || employeeName}</span>
              </div>
              <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {recordType}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Target Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Current Status</label>
              <select
                value={previousStatus}
                onChange={(e) => setPreviousStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-semibold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="ABSENT">ABSENT</option>
                <option value="LATE">LATE</option>
                <option value="HALF_DAY">HALF_DAY</option>
                <option value="PRESENT">PRESENT</option>
                <option value="ON_LEAVE">ON_LEAVE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Requested Status</label>
            <div className="grid grid-cols-3 gap-2">
              {['PRESENT', 'ON_LEAVE', 'HALF_DAY'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setRequestedStatus(st)}
                  className={`py-2 text-center rounded-lg border font-bold text-xs transition-all ${
                    requestedStatus === st
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Justification & Detailed Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the verifiable reason (e.g. participated in CBSE Sports Meet, medical emergency slip verified, biometrics network outage)..."
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Reference Document Note / Slip No (Optional)
            </label>
            <input
              type="text"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              placeholder="e.g. Hospital certificate #MED-992 or Deputation letter #DEP-2026/04"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              All adjustments are permanently logged in the school audit register. Changing attendance without formal justification may violate school academic policies.
            </span>
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
