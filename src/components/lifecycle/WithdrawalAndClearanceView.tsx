import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Plus,
  Search,
  IndianRupee,
  BookOpen,
  Bus,
  Home,
  GraduationCap,
  Building2,
  RefreshCw,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';

interface WithdrawalAndClearanceProps {
  schoolId?: string;
  onNavigateToTC?: (studentId: string) => void;
}

export const WithdrawalAndClearanceView: React.FC<WithdrawalAndClearanceProps> = ({
  schoolId,
  onNavigateToTC
}) => {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New Withdrawal Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [reasonCategory, setReasonCategory] = useState('RELOCATION');
  const [reasonDetails, setReasonDetails] = useState('');
  const [effectiveLeavingDate, setEffectiveLeavingDate] = useState(new Date().toISOString().split('T')[0]);
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);

  // Clearance Inspection Modal
  const [activeWithdrawalForClearance, setActiveWithdrawalForClearance] = useState<any | null>(null);
  const [clearanceList, setClearanceList] = useState<any[]>([]);
  const [loadingClearance, setLoadingClearance] = useState(false);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lifecycle/withdrawals${schoolId ? `?schoolId=${schoolId}` : ''}`);
      const data = await res.json();
      setWithdrawals(data.withdrawals || []);
    } catch (err) {
      console.error('[FETCH WITHDRAWALS ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
    fetch(`/api/students${schoolId ? `?schoolId=${schoolId}` : ''}`)
      .then((r) => r.json())
      .then((d) => setAllStudents(d.students || []))
      .catch((err) => console.error(err));
  }, [schoolId]);

  // Open Clearance Inspector
  const handleOpenClearance = async (withdrawal: any) => {
    setActiveWithdrawalForClearance(withdrawal);
    setLoadingClearance(true);
    try {
      const res = await fetch(`/api/lifecycle/withdrawals/${withdrawal.id}/clearance`);
      const data = await res.json();
      setClearanceList(data.clearances || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingClearance(false);
    }
  };

  // Update a Department Clearance Item
  const handleUpdateClearance = async (dept: string, newStatus: string, isOverride = false) => {
    if (!activeWithdrawalForClearance) return;
    try {
      await fetch(`/api/lifecycle/withdrawals/${activeWithdrawalForClearance.id}/clearance/${dept}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          isOverride,
          overrideReason: isOverride ? 'Administrative leadership override authorized' : null
        })
      });
      // Refresh list
      handleOpenClearance(activeWithdrawalForClearance);
      fetchWithdrawals();
    } catch (err) {
      console.error(err);
    }
  };

  // Finalize Withdrawal & Release for TC
  const handleFinalizeWithdrawal = async (id: string) => {
    if (!confirm('Confirm withdrawal finalization? This will mark the student as Withdrawn and release them for formal Transfer Certificate generation.')) {
      return;
    }
    try {
      const res = await fetch(`/api/lifecycle/withdrawals/${id}/finalize`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(data.message || 'Withdrawal finalized successfully!');
      setActiveWithdrawalForClearance(null);
      fetchWithdrawals();
      if (onNavigateToTC && activeWithdrawalForClearance) {
        onNavigateToTC(activeWithdrawalForClearance.student_id);
      }
    } catch (err: any) {
      alert(`Cannot finalize: ${err.message}`);
    }
  };

  // Submit New Withdrawal
  const handleCreateWithdrawal = async () => {
    if (!selectedStudent) {
      alert('Please select a student.');
      return;
    }
    setSubmittingWithdrawal(true);
    try {
      const res = await fetch('/api/lifecycle/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          reasonCategory,
          reasonDetails,
          effectiveLeavingDate
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(`Withdrawal request ${data.requestNumber} registered with 6 clearance checkpoints!`);
      setIsNewModalOpen(false);
      setSelectedStudent(null);
      setReasonDetails('');
      fetchWithdrawals();
    } catch (err: any) {
      alert(`Error submitting withdrawal: ${err.message}`);
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  const getDeptIcon = (dept: string) => {
    switch (dept) {
      case 'ACCOUNTS': return <IndianRupee className="w-4 h-4 text-emerald-600" />;
      case 'LIBRARY': return <BookOpen className="w-4 h-4 text-sky-600" />;
      case 'TRANSPORT': return <Bus className="w-4 h-4 text-amber-600" />;
      case 'HOSTEL': return <Home className="w-4 h-4 text-purple-600" />;
      case 'ACADEMIC': return <GraduationCap className="w-4 h-4 text-indigo-600" />;
      default: return <Building2 className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER & NEW WITHDRAWAL ACTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Student Withdrawal &amp; Multi-Department Clearances
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Structured institutional exit workflow verifying Accounts, Library, Transport, and Academics before TC issuance
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchWithdrawals}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              New Withdrawal Request
            </button>
          </div>
        </div>

        {/* Withdrawals Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3">Req Number</th>
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3">Class</th>
                <th className="py-2.5 px-3">Reason Category</th>
                <th className="py-2.5 px-3 text-center">Clearance Status</th>
                <th className="py-2.5 px-3 text-center">Workflow State</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400">
                    No active withdrawal requests recorded. Click &quot;New Withdrawal Request&quot; to initiate exit clearance.
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => {
                  const cleared = Number(w.cleared_departments || 0);
                  const total = Number(w.total_departments || 6);
                  const isFullyCleared = cleared === total;
                  return (
                    <tr key={w.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-800">{w.request_number}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {w.first_name} {w.last_name}
                        <span className="block font-mono text-[10px] text-slate-400">{w.admission_number}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{w.class_name}-{w.section_name}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{w.reason_category}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isFullyCleared ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {cleared} / {total} Cleared
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          w.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {w.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenClearance(w)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          Check Clearances
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. CLEARANCE CHECKLIST INSPECTION MODAL */}
      {activeWithdrawalForClearance && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Departmental Exit Clearance Checklist</h4>
                <p className="text-xs text-slate-500 font-mono">
                  {activeWithdrawalForClearance.request_number} • {activeWithdrawalForClearance.first_name} {activeWithdrawalForClearance.last_name} ({activeWithdrawalForClearance.admission_number})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveWithdrawalForClearance(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {loadingClearance ? (
              <div className="py-8 text-center text-xs text-slate-500">Checking departmental records...</div>
            ) : (
              <div className="space-y-3">
                {clearanceList.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                        {getDeptIcon(c.department)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{c.department}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            c.status === 'CLEARED' ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'NOT_APPLICABLE' ? 'bg-slate-200 text-slate-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {c.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{c.details || 'No pending remarks'}</p>
                        {Number(c.dues_amount || 0) > 0 && (
                          <p className="text-[11px] font-bold text-rose-600">Pending Financial Dues: ₹{c.dues_amount}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {c.status !== 'CLEARED' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateClearance(c.department, 'CLEARED')}
                          className="px-2 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200"
                        >
                          Mark Cleared
                        </button>
                      )}
                      {c.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateClearance(c.department, 'CLEARED', true)}
                          title="Authorized Administrative Override"
                          className="px-2 py-1 text-[10px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200"
                        >
                          Override
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                All 6 departments must be Cleared or Overridden before TC release.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleFinalizeWithdrawal(activeWithdrawalForClearance.id)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
                >
                  Finalize &amp; Release for TC
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. NEW WITHDRAWAL REQUEST MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900">Initiate Student Exit &amp; Withdrawal</h4>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Student *</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search active student by name / admission..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                  />
                </div>

                {studentSearch && !selectedStudent && (
                  <div className="mt-1 border border-slate-200 rounded-lg max-h-36 overflow-y-auto bg-white shadow-md divide-y divide-slate-100">
                    {allStudents.filter((s) => `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(studentSearch.toLowerCase())).slice(0, 5).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudent(s);
                          setStudentSearch('');
                        }}
                        className="w-full text-left p-2 hover:bg-slate-50 text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-slate-900">{s.first_name} {s.last_name}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">{s.admission_number}</span>
                        </div>
                        <span className="text-[11px] text-slate-500">Class {s.class_name || ''}</span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedStudent && (
                  <div className="mt-2 p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{selectedStudent.admission_number} • Class {selectedStudent.class_name || ''}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className="text-xs text-rose-600 font-semibold hover:underline"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason Category *</label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-white"
                >
                  <option value="RELOCATION">Family Relocation / City Change</option>
                  <option value="PARENT_TRANSFER">Parent Employment Transfer</option>
                  <option value="HIGHER_STUDIES">Admission into Another Institution</option>
                  <option value="FINANCIAL">Financial Considerations</option>
                  <option value="MEDICAL">Medical Reasons</option>
                  <option value="DISTANCE">Commute &amp; Distance</option>
                  <option value="OTHER">Other Personal Reasons</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Effective Last Attendance Date</label>
                <input
                  type="date"
                  value={effectiveLeavingDate}
                  onChange={(e) => setEffectiveLeavingDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Notes from parent application or exit interview..."
                  value={reasonDetails}
                  onChange={(e) => setReasonDetails(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                ></textarea>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCreateWithdrawal}
                disabled={submittingWithdrawal || !selectedStudent}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs"
              >
                {submittingWithdrawal ? 'Registering...' : 'Initiate Withdrawal'}
              </button>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
