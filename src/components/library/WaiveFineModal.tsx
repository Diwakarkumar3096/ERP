import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { LibraryFine } from '../../types/erp.js';
import { X, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

interface WaiveFineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  fine: LibraryFine | null;
}

export const WaiveFineModal: React.FC<WaiveFineModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  schoolId,
  fine
}) => {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [waiveAmount, setWaiveAmount] = useState(
    fine ? parseFloat(fine.outstanding_amount as any).toString() : '0'
  );
  const [reason, setReason] = useState('');

  if (!isOpen || !fine) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Official justification reason is required to waive a fine.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.library.waiveFine(fine.id, {
        schoolId,
        waiveAmount: parseFloat(waiveAmount) || undefined,
        reason: reason.trim()
      });

      showToast(res.message || 'Fine waiver approved and audit logged.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to waive fine.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 border border-amber-400/30 rounded-xl">
              <ShieldAlert className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Authorize Fine Waiver</h2>
              <p className="text-xs text-indigo-200">Requires administrative justification</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between font-bold text-amber-950">
              <span>Member: {fine.member_name}</span>
              <span className="font-mono text-sm">₹{parseFloat(fine.outstanding_amount as any).toFixed(2)} Outstanding</span>
            </div>
            <p className="text-amber-800">
              Waivers bypass Accounts collection and are logged in the immutable system audit trail.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Amount to Waive (₹) *</label>
            <input
              type="number"
              step="0.01"
              required
              max={parseFloat(fine.outstanding_amount as any)}
              value={waiveAmount}
              onChange={(e) => setWaiveAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Official Justification / Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Authorized medical absence waiver approved by Principal..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              disabled={submitting || !reason.trim()}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Logging Waiver...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Authorize Waiver</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
