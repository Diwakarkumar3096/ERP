import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { LibraryFine } from '../../types/erp.js';
import { X, CreditCard, Sparkles, CheckCircle2 } from 'lucide-react';

interface CollectFineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  fine: LibraryFine | null;
}

export const CollectFineModal: React.FC<CollectFineModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  schoolId,
  fine
}) => {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [notes, setNotes] = useState('');

  if (!isOpen || !fine) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.library.collectFine(fine.id, {
        schoolId,
        paymentMode,
        notes: notes.trim() || undefined
      });

      showToast(res.message || 'Fine collected and settled successfully!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to collect fine.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl">
              <CreditCard className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Settle Library Fine</h2>
              <p className="text-xs text-indigo-200">Reconciled with School Accounts</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Member:</span>
              <span className="font-bold text-slate-900">{fine.member_name} ({fine.membership_number})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Fine Category:</span>
              <span className="font-semibold text-indigo-700">{fine.type}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Reason:</span>
              <span className="text-slate-700 text-right truncate max-w-[200px]">{fine.reason}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm">
              <span className="font-bold text-slate-900">Total Outstanding:</span>
              <span className="font-bold font-mono text-emerald-700">₹{parseFloat(fine.outstanding_amount as any).toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Payment Collection Mode *</label>
            <div className="grid grid-cols-4 gap-2">
              {(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMode(m)}
                  className={`py-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    paymentMode === m
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Payment Notes & Reference</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. UPI Ref / Cash register counter..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Settling...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Collect ₹{parseFloat(fine.outstanding_amount as any).toFixed(2)}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
