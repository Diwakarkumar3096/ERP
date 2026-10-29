import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { FeePayment } from '../../types/erp.js';
import {
  X,
  AlertTriangle,
  RotateCcw,
  ShieldAlert
} from 'lucide-react';

interface ReversalModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: FeePayment | null;
  onSuccess: () => void;
}

export const ReversalModal: React.FC<ReversalModalProps> = ({
  isOpen,
  onClose,
  payment,
  onSuccess
}) => {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please enter the reason for reversing this financial payment');
      return;
    }

    setSubmitting(true);
    try {
      await api.fees.reversePayment(payment.id, { reason: reason.trim() });
      toast.success('Payment successfully reversed and student ledger updated');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Payment reversal failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-rose-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Reverse Payment Transaction</h3>
              <p className="text-xs text-rose-300">Authorized Financial Audit Action</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-rose-300 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1">
            <div className="font-bold text-rose-900">
              Receipt No: <span className="font-mono">{payment.receipt_number}</span>
            </div>
            <div className="text-rose-700">
              Student: {payment.student_name} ({payment.admission_number})
            </div>
            <div className="text-rose-800 font-bold">
              Amount to Reverse: ₹{Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({payment.payment_mode})
            </div>
          </div>

          <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              Reversing this payment will void the receipt, debit the student's dues back into their active ledger, and generate an immutable audit log entry.
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Audit Reason & Explanation <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Duplicate counter payment keyed in error; verified against physical cash register tally..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-slate-900"
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
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              {submitting ? 'Reversing...' : 'Execute Reversal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
