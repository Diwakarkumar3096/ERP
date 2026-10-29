import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { StudentPayableSummary, OfficialReceiptPayload } from '../../types/erp.js';
import {
  X,
  CreditCard,
  User,
  Search,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Calendar,
  Building,
  FileText
} from 'lucide-react';

interface CollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: string | null;
  schoolId?: string;
  onPaymentSuccess?: (receipt: OfficialReceiptPayload) => void;
}

export const CollectPaymentModal: React.FC<CollectPaymentModalProps> = ({
  isOpen,
  onClose,
  studentId,
  schoolId = 'sch_vvps',
  onPaymentSuccess
}) => {
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(studentId || null);

  const [payableData, setPayableData] = useState<StudentPayableSummary | null>(null);
  const [loadingPayable, setLoadingPayable] = useState(false);

  // Form Fields
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('CASH');
  const [transactionReference, setTransactionReference] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [bankName, setBankName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (studentId) {
      setSelectedStudentId(studentId);
    }
  }, [studentId]);

  useEffect(() => {
    if (isOpen && selectedStudentId) {
      loadPayableData(selectedStudentId);
    } else if (isOpen && !selectedStudentId) {
      setPayableData(null);
      setAmount('');
    }
  }, [isOpen, selectedStudentId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await api.fees.searchStudents(schoolId, searchQuery.trim());
      const safeResults = Array.isArray(results) ? results : [];
      setSearchResults(safeResults);
      if (safeResults.length === 0) {
        toast.info('No students matched your search criteria');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to search students');
    } finally {
      setSearching(false);
    }
  };

  const loadPayableData = async (sid: string) => {
    setLoadingPayable(true);
    try {
      const data = await api.fees.getStudentPayableSummary(sid);
      setPayableData(data);
      // Pre-select pending charges
      const pendingIds = (data.payableCharges || []).map((c) => c.id);
      setSelectedChargeIds(pendingIds);
      // Pre-fill amount with outstanding dues
      const outstanding = Number(data.totals?.totalOutstanding || 0);
      setAmount(outstanding > 0 ? String(outstanding) : '0');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load student fee summary');
    } finally {
      setLoadingPayable(false);
    }
  };

  const handleChargeToggle = (chargeId: string, chargeAmount: number) => {
    let next: string[];
    if (selectedChargeIds.includes(chargeId)) {
      next = selectedChargeIds.filter((id) => id !== chargeId);
    } else {
      next = [...selectedChargeIds, chargeId];
    }
    setSelectedChargeIds(next);

    // Sum selected
    if (payableData?.payableCharges) {
      const sum = payableData.payableCharges
        .filter((c) => next.includes(c.id))
        .reduce((acc, c) => acc + Number(c.outstanding_amount || 0), 0);
      setAmount(sum > 0 ? String(sum) : '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      toast.error('Please select a student first');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid payment amount greater than ₹0');
      return;
    }

    if (paymentMode === 'CHEQUE' && (!chequeNumber.trim() || !bankName.trim())) {
      toast.error('Cheque Number and Bank Name are mandatory for cheque payments');
      return;
    }

    if ((paymentMode === 'UPI' || paymentMode === 'BANK_TRANSFER') && !transactionReference.trim()) {
      toast.error('Transaction reference is required for digital bank / UPI transfers');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.fees.collectPayment({
        studentId: selectedStudentId,
        amount: numAmount,
        paymentMode,
        transactionReference: transactionReference.trim() || undefined,
        chequeNumber: chequeNumber.trim() || undefined,
        chequeDate: chequeDate || undefined,
        bankName: bankName.trim() || undefined,
        remarks: remarks.trim() || undefined,
        chargeIds: selectedChargeIds.length > 0 ? selectedChargeIds : undefined,
        allowAdvance: true
      });

      toast.success(`Payment of ₹${numAmount.toLocaleString('en-IN')} recorded successfully!`);
      if (onPaymentSuccess) {
        onPaymentSuccess(res.receipt);
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Payment collection failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Fee Collection Desk</h3>
              <p className="text-xs text-slate-300">Accept student fees and generate official money receipt</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Student Search (if not preselected) */}
          {!selectedStudentId ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h4 className="text-sm font-bold text-slate-800 mb-2">Find Student for Fee Payment</h4>
              <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Admission No, Roll No, Student Name, or Parent Mobile..."
                    className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white max-h-56 overflow-y-auto">
                  {searchResults.map((st) => (
                    <div
                      key={st.id}
                      onClick={() => setSelectedStudentId(st.id)}
                      className="p-3 hover:bg-emerald-50/50 cursor-pointer flex items-center justify-between transition-colors text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{st.name}</div>
                        <div className="text-slate-500">
                          Adm: <span className="font-mono font-medium">{st.admission_number}</span> • Class:{' '}
                          <span className="font-medium">{st.class_name} {st.section_name ? `(${st.section_name})` : ''}</span> • Parent: {st.parent_name} ({st.parent_mobile})
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-500 text-[11px]">Outstanding Dues</div>
                        <div className={`font-mono font-bold text-sm ${st.outstanding_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          ₹{Number(st.outstanding_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Selected Student Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                    {payableData?.student?.name ? payableData.student.name.charAt(0) : 'S'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{payableData?.student?.name || 'Loading student...'}</h4>
                    <p className="text-xs text-slate-500">
                      Adm No: <span className="font-mono font-semibold">{payableData?.student?.admission_number}</span> •{' '}
                      {payableData?.student?.class_name} {payableData?.student?.section_name ? `(${payableData.student.section_name})` : ''} • Parent:{' '}
                      {payableData?.student?.parent_name} ({payableData?.student?.parent_mobile})
                    </p>
                  </div>
                </div>
                {!studentId && (
                  <button
                    onClick={() => {
                      setSelectedStudentId(null);
                      setPayableData(null);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold"
                  >
                    Change Student
                  </button>
                )}
              </div>

              {loadingPayable ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Loading fee schedule and balances...</p>
                </div>
              ) : payableData ? (
                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                  {/* Balance Summary Header */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Total Charges</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        ₹{Number(payableData.totals?.totalCharges || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <span className="text-purple-600 block text-[11px]">Concessions / Aid</span>
                      <span className="font-mono font-bold text-purple-900 text-sm">
                        -₹{Number(payableData.totals?.totalConcessions || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <span className="text-emerald-600 block text-[11px]">Total Paid So Far</span>
                      <span className="font-mono font-bold text-emerald-900 text-sm">
                        ₹{Number(payableData.totals?.totalPaid || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                      <span className="text-rose-600 block text-[11px] font-bold">Outstanding Dues</span>
                      <span className="font-mono font-black text-rose-800 text-base">
                        ₹{Number(payableData.totals?.totalOutstanding || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Installment Charges Breakdown */}
                  {payableData.payableCharges && payableData.payableCharges.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Select Installments / Dues to Pay:
                      </label>
                      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {payableData.payableCharges.map((ch) => {
                          const isChecked = selectedChargeIds.includes(ch.id);
                          return (
                            <label
                              key={ch.id}
                              className={`p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors text-xs ${
                                isChecked ? 'bg-emerald-50/40' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleChargeToggle(ch.id, Number(ch.outstanding_amount))}
                                  className="rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <div>
                                  <div className="font-bold text-slate-900">{ch.installment_name}</div>
                                  <div className="text-slate-500 text-[11px]">
                                    Due Date: {ch.due_date} • Category: {ch.category_name || 'Tuition'} • Status:{' '}
                                    <span className="font-semibold text-amber-700">{ch.status}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-slate-900">
                                  ₹{Number(ch.outstanding_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Payment Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Amount to Collect (₹) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          min="1"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="e.g. 8500"
                          className="w-full pl-8 pr-3 py-2 text-base font-bold font-mono bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Payment Mode <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
                      >
                        <option value="CASH">Cash Counter</option>
                        <option value="UPI">UPI / QR Scan (GooglePay, PhonePe, Paytm)</option>
                        <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                        <option value="CHEQUE">Cheque / Demand Draft</option>
                        <option value="CARD">Debit / Credit Card (POS Terminal)</option>
                      </select>
                    </div>
                  </div>

                  {/* Mode Specific Inputs */}
                  {(paymentMode === 'UPI' || paymentMode === 'BANK_TRANSFER' || paymentMode === 'CARD') && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Transaction Reference / UTR No <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={transactionReference}
                        onChange={(e) => setTransactionReference(e.target.value)}
                        placeholder="e.g. UPI/HDFC/20260310/881290 or NEFT/SBI/991204821"
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900"
                      />
                    </div>
                  )}

                  {paymentMode === 'CHEQUE' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Cheque / DD No <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={chequeNumber}
                          onChange={(e) => setChequeNumber(e.target.value)}
                          placeholder="e.g. 441920"
                          className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Drawn On Bank <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="e.g. State Bank of India"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Cheque Date</label>
                        <input
                          type="date"
                          value={chequeDate}
                          onChange={(e) => setChequeDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Internal Office Remarks / Notes
                    </label>
                    <input
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="e.g. Quarter 4 fee received with parent signature; receipt handed over"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900"
                    />
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {submitting ? 'Recording Payment...' : 'Record Payment & Generate Receipt'}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
