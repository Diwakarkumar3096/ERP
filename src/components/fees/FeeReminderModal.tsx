import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { StudentFeeAssignment } from '../../types/erp.js';
import {
  X,
  Bell,
  Phone,
  MessageSquare,
  Mail,
  CheckCircle2,
  Calendar
} from 'lucide-react';

interface FeeReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: StudentFeeAssignment | null;
  onSuccess: () => void;
}

export const FeeReminderModal: React.FC<FeeReminderModalProps> = ({
  isOpen,
  onClose,
  assignment,
  onSuccess
}) => {
  const toast = useToast();

  const [reminderType, setReminderType] = useState('OVERDUE');
  const [channel, setChannel] = useState('MANUAL_PHONE_LOG');
  const [targetDueDate, setTargetDueDate] = useState('');
  const [messageText, setMessageText] = useState(
    assignment
      ? `Dear Parent, reminder regarding outstanding fee balance of ₹${Number(assignment.outstanding_balance).toLocaleString('en-IN')} for ${assignment.student_name}. Kindly clear before term examination.`
      : ''
  );
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !assignment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      toast.error('Please enter reminder communication notes or message text');
      return;
    }

    setSubmitting(true);
    try {
      await api.fees.logReminder({
        studentId: assignment.student_id,
        reminderType,
        targetDueDate: targetDueDate || undefined,
        amountDue: Number(assignment.outstanding_balance),
        parentName: assignment.parent_name || 'Guardian',
        parentMobile: assignment.parent_mobile || '+91 9800000000',
        parentEmail: assignment.parent_email || undefined,
        channel,
        messageText: messageText.trim()
      });

      toast.success('Fee reminder communication logged successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to log reminder');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Log Parent Fee Reminder Notice</h3>
              <p className="text-xs text-slate-300">Record communication regarding pending school dues</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
            <div className="font-bold text-amber-900">
              Student: {assignment.student_name} ({assignment.admission_number})
            </div>
            <div className="text-amber-800">
              Parent Contact: <span className="font-semibold">{assignment.parent_name}</span> • {assignment.parent_mobile || 'No mobile'}
            </div>
            <div className="text-rose-700 font-bold">
              Outstanding Dues: ₹{Number(assignment.outstanding_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reminder Type</label>
              <select
                value={reminderType}
                onChange={(e) => setReminderType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
              >
                <option value="OVERDUE">Overdue Fee Notice</option>
                <option value="UPCOMING">Upcoming Installment Due</option>
                <option value="DUE_TODAY">Due Today Notice</option>
                <option value="FINAL_NOTICE">Final Warning Before Examination</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Communication Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
              >
                <option value="MANUAL_PHONE_LOG">Telephonic Conversation Log</option>
                <option value="SMS_SIMULATED">Official SMS Notice</option>
                <option value="WHATSAPP_SIMULATED">WhatsApp Broadcast</option>
                <option value="RECORDED_NOTICE">Printed Notice Sent via Diary</option>
                <option value="EMAIL_SIMULATED">Email Statement</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Target Commitment / Payment Due Date
            </label>
            <input
              type="date"
              value={targetDueDate}
              onChange={(e) => setTargetDueDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Communication Details / Message Body <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Record parent response, promise to pay date, or notice text sent..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Logging...' : 'Log Reminder Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
