import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { LibraryMember, BookCopy } from '../../types/erp.js';
import { X, ArrowRight, UserCheck, BookOpen, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface IssueBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  initialMember?: LibraryMember | null;
  initialCopy?: BookCopy | null;
}

export const IssueBookModal: React.FC<IssueBookModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  schoolId,
  initialMember,
  initialCopy
}) => {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Member Search State
  const [memberTerm, setMemberTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<LibraryMember | null>(initialMember || null);
  const [searchingMember, setSearchingMember] = useState(false);
  const [memberResults, setMemberResults] = useState<LibraryMember[]>([]);

  // Book Copy Search State
  const [copyTerm, setCopyTerm] = useState('');
  const [selectedCopy, setSelectedCopy] = useState<BookCopy | null>(initialCopy || null);
  const [searchingCopy, setSearchingCopy] = useState(false);

  // Issue Parameters
  const [customDueDate, setCustomDueDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialMember) setSelectedMember(initialMember);
    if (initialCopy) setSelectedCopy(initialCopy);
  }, [initialMember, initialCopy]);

  // Set default due date when member is selected
  useEffect(() => {
    if (selectedMember && !customDueDate) {
      const days = selectedMember.member_type === 'STUDENT' ? 14 : 30;
      const calculated = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
      setCustomDueDate(calculated);
    }
  }, [selectedMember, customDueDate]);

  if (!isOpen) return null;

  const handleSearchMember = async () => {
    if (!memberTerm.trim()) return;
    setSearchingMember(true);
    try {
      const res = await api.library.lookupMember(memberTerm.trim(), schoolId);
      setMemberResults(res.members || []);
      if (res.members?.length === 1) {
        setSelectedMember(res.members[0]);
        setMemberResults([]);
      } else if (res.members?.length === 0) {
        showToast('No member found with this ID or name.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error looking up member.', 'error');
    } finally {
      setSearchingMember(false);
    }
  };

  const handleLookupCopy = async () => {
    if (!copyTerm.trim()) return;
    setSearchingCopy(true);
    try {
      const res = await api.library.lookupCopy(copyTerm.trim(), schoolId);
      if (res.copy) {
        if (res.copy.status !== 'AVAILABLE') {
          showToast(`Warning: Book copy status is "${res.copy.status}".`, 'warning');
        }
        setSelectedCopy(res.copy);
      }
    } catch (err: any) {
      showToast(err.message || 'Physical copy not found.', 'error');
      setSelectedCopy(null);
    } finally {
      setSearchingCopy(false);
    }
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      showToast('Please select an authorized library member.', 'error');
      return;
    }
    if (!selectedCopy) {
      showToast('Please specify a valid physical book copy.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.library.issueBook({
        schoolId,
        memberId: selectedMember.id,
        copyId: selectedCopy.id,
        customDueDate: customDueDate || undefined,
        notes: notes.trim() || undefined
      });

      showToast(res.message || 'Book issued successfully!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to issue book.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl">
              <ArrowRight className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Circulation Desk: Issue Book</h2>
              <p className="text-xs text-indigo-200">Fast barcode-driven book checkout workflow</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleIssueSubmit} className="p-6 space-y-5 max-h-[calc(85vh-8rem)] overflow-y-auto">
          {/* Step 1: Member Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                1. Member Verification
              </label>
              {selectedMember && (
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Change Member
                </button>
              )}
            </div>

            {!selectedMember ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={memberTerm}
                    onChange={(e) => setMemberTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchMember())}
                    placeholder="Scan member card or enter name/admission no..."
                    className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSearchMember}
                    disabled={searchingMember}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                  >
                    {searchingMember ? 'Searching...' : 'Find Member'}
                  </button>
                </div>

                {memberResults.length > 0 && (
                  <div className="border border-slate-200 rounded-lg max-h-36 overflow-y-auto divide-y divide-slate-100">
                    {memberResults.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedMember(m);
                          setMemberResults([]);
                        }}
                        className="p-2.5 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">{m.name}</p>
                          <p className="text-slate-500">{m.details_summary} • {m.membership_number}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[10px]">
                          {m.member_type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{selectedMember.name}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      {selectedMember.member_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Mem#: <strong className="font-mono">{selectedMember.membership_number}</strong> • Card: {selectedMember.card_number}
                  </p>
                  <p className="text-xs text-slate-500">
                    Active Borrowed: {selectedMember.active_books_count || 0} books • Fines: ₹{selectedMember.outstanding_fines || 0}
                  </p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              </div>
            )}
          </div>

          {/* Step 2: Physical Copy Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                2. Physical Book Copy Scan
              </label>
              {selectedCopy && (
                <button
                  type="button"
                  onClick={() => setSelectedCopy(null)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Change Book
                </button>
              )}
            </div>

            {!selectedCopy ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={copyTerm}
                  onChange={(e) => setCopyTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleLookupCopy())}
                  placeholder="Scan book barcode or enter Accession number (e.g. VVPS-ACC-00101)..."
                  className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleLookupCopy}
                  disabled={searchingCopy}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                >
                  {searchingCopy ? 'Scanning...' : 'Scan / Lookup'}
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">{selectedCopy.book_title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Acc#: <strong className="font-mono text-indigo-700">{selectedCopy.accession_number}</strong> • Barcode: {selectedCopy.barcode}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      selectedCopy.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {selectedCopy.status}
                    </span>
                    <span className="text-[11px] text-slate-500">Condition: {selectedCopy.condition}</span>
                    <span className="text-[11px] text-slate-500">• Rack: {selectedCopy.location_name || 'General Shelf'}</span>
                  </div>
                </div>
                {selectedCopy.status === 'AVAILABLE' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
              </div>
            )}
          </div>

          {/* Step 3: Circulation Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Due Date *</label>
              <input
                type="date"
                required
                value={customDueDate}
                onChange={(e) => setCustomDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-[11px] text-slate-400">
                Default loan period automatically calculated from school library policy.
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Circulation Remarks</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional checkout note..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
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
              disabled={submitting || !selectedMember || !selectedCopy || selectedCopy.status !== 'AVAILABLE'}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Issue...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Confirm Issue</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
