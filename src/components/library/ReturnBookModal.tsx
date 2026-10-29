import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { BookIssue } from '../../types/erp.js';
import { X, CheckCircle2, RotateCcw, AlertTriangle, Sparkles, IndianRupee } from 'lucide-react';

interface ReturnBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  initialIssue?: BookIssue | null;
}

export const ReturnBookModal: React.FC<ReturnBookModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  schoolId,
  initialIssue
}) => {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [scanTerm, setScanTerm] = useState('');
  const [activeIssue, setActiveIssue] = useState<BookIssue | null>(initialIssue || null);
  const [searching, setSearching] = useState(false);

  const [returnCondition, setReturnCondition] = useState<'GOOD' | 'FAIR' | 'DAMAGED' | 'LOST'>('GOOD');
  const [damageNotes, setDamageNotes] = useState('');
  const [damagePenalty, setDamagePenalty] = useState('');

  useEffect(() => {
    if (initialIssue) setActiveIssue(initialIssue);
  }, [initialIssue]);

  if (!isOpen) return null;

  const handleLookupIssue = async () => {
    if (!scanTerm.trim()) return;
    setSearching(true);
    try {
      const res = await api.library.lookupCopy(scanTerm.trim(), schoolId);
      if (res.copy?.current_issue_id) {
        setActiveIssue({
          id: res.copy.current_issue_id,
          school_id: schoolId,
          library_id: res.copy.library_id,
          member_id: res.copy.current_holder_id || '',
          book_copy_id: res.copy.id,
          book_id: res.copy.book_id,
          issue_date: res.copy.issue_date || '',
          due_date: res.copy.due_date || '',
          issued_by: 'Staff',
          status: res.copy.status === 'OVERDUE' ? 'OVERDUE' : 'ISSUED',
          renewal_count: res.copy.renewal_count || 0,
          fine_amount: 0,
          book_title: res.copy.book_title,
          accession_number: res.copy.accession_number,
          barcode: res.copy.barcode,
          member_name: res.copy.borrower_name,
          membership_number: res.copy.borrower_mem_no,
          created_at: new Date().toISOString()
        });
      } else {
        showToast('This book copy is not currently marked as checked out/issued.', 'warning');
      }
    } catch (err: any) {
      showToast(err.message || 'Book copy not found.', 'error');
    } finally {
      setSearching(false);
    }
  };

  // Compute overdue days
  let overdueDays = 0;
  if (activeIssue?.due_date) {
    const today = new Date();
    const due = new Date(activeIssue.due_date);
    const diff = today.getTime() - due.getTime();
    overdueDays = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  const estimatedOverdueFine = Math.max(0, (overdueDays - 1) * 5); // 1 grace day, ₹5/day
  const totalFine = estimatedOverdueFine + (damagePenalty ? parseFloat(damagePenalty) : 0);

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIssue) {
      showToast('No active borrowing transaction selected.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.library.returnBook({
        schoolId,
        issueId: activeIssue.id,
        returnCondition,
        damageNotes: damageNotes.trim() || undefined,
        damagePenalty: damagePenalty ? parseFloat(damagePenalty) : undefined
      });

      showToast(res.message || 'Book checked in successfully!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to process return.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl">
              <RotateCcw className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Circulation Desk: Return Book</h2>
              <p className="text-xs text-indigo-200">Inspect condition, check in copy, and assess fines</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleReturnSubmit} className="p-6 space-y-4">
          {!activeIssue ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Scan or Enter Book Barcode / Accession</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scanTerm}
                  onChange={(e) => setScanTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleLookupIssue())}
                  placeholder="e.g. VVPS-ACC-00101 or barcode..."
                  className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleLookupIssue}
                  disabled={searching}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                >
                  {searching ? 'Finding...' : 'Scan / Lookup'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{activeIssue.book_title}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Acc#: <strong className="font-mono text-indigo-700">{activeIssue.accession_number}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveIssue(null)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Change Book
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200">
                <div>
                  <span className="text-slate-400">Borrower: </span>
                  <span className="font-semibold text-slate-800">{activeIssue.member_name || 'Member'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Due Date: </span>
                  <span className={`font-mono font-semibold ${overdueDays > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {activeIssue.due_date} {overdueDays > 0 ? `(${overdueDays}d overdue)` : ''}
                  </span>
                </div>
              </div>

              {overdueDays > 0 && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Overdue penalty applies:
                  </span>
                  <strong className="font-mono text-sm">₹{estimatedOverdueFine.toFixed(2)}</strong>
                </div>
              )}
            </div>
          )}

          {/* Condition Assessment */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Return Condition Inspection *</label>
            <div className="grid grid-cols-4 gap-2">
              {(['GOOD', 'FAIR', 'DAMAGED', 'LOST'] as const).map((cond) => (
                <button
                  key={cond}
                  type="button"
                  onClick={() => setReturnCondition(cond)}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    returnCondition === cond
                      ? cond === 'GOOD'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                        : cond === 'DAMAGED' || cond === 'LOST'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-xs'
                        : 'bg-amber-50 border-amber-500 text-amber-800 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cond}
                </button>
              ))}
            </div>
          </div>

          {/* Damage / Lost Penalty input */}
          {(returnCondition === 'DAMAGED' || returnCondition === 'LOST') && (
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                <span>Damage Assessment / Replacement Cost</span>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Damage / Penalty Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={damagePenalty}
                  onChange={(e) => setDamagePenalty(e.target.value)}
                  placeholder="e.g. 100.00"
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Damage Description & Inspection Notes</label>
                <input
                  type="text"
                  value={damageNotes}
                  onChange={(e) => setDamageNotes(e.target.value)}
                  placeholder="e.g. Torn back cover, water damaged pages 20-35"
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          )}

          {/* Total summary */}
          {totalFine > 0 && (
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-900">Total Library Fine & Penalties Assessed:</span>
              <span className="text-sm font-bold font-mono text-amber-900">₹{totalFine.toFixed(2)}</span>
            </div>
          )}

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
              disabled={submitting || !activeIssue}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking in...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Accept Return</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
