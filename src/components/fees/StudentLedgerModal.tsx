import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { StudentLedger } from '../../types/erp.js';
import {
  X,
  Printer,
  FileSpreadsheet,
  Calendar,
  User,
  CreditCard,
  Building,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface StudentLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
  onViewReceipt?: (receiptNumber: string) => void;
}

export const StudentLedgerModal: React.FC<StudentLedgerModalProps> = ({
  isOpen,
  onClose,
  studentId,
  onViewReceipt
}) => {
  const toast = useToast();
  const [ledger, setLedger] = useState<StudentLedger | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && studentId) {
      loadLedger();
    }
  }, [isOpen, studentId]);

  const loadLedger = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await api.fees.getStudentLedger(studentId);
      setLedger(res);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load student fee ledger');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header Action Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Student Account Ledger Statement</h3>
              <p className="text-xs text-slate-300">
                Official statement of financial transactions & running balance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Ledger
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Statement Content */}
        <div className="p-8 overflow-y-auto bg-slate-50 flex-1">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Calculating student ledger balance...</p>
            </div>
          ) : !ledger ? (
            <div className="py-16 text-center text-slate-500">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">No Ledger Found</p>
              <p className="text-xs text-slate-500 mt-1">No fee assignment or transactions recorded for this student.</p>
            </div>
          ) : (
            <div className="bg-white border-2 border-slate-300 rounded-xl p-8 shadow-sm text-slate-900 font-sans">
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-5 mb-6 text-center">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                  {ledger.student?.school_name || 'Vidya Vahini Public School'}
                </h1>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-widest mt-1">
                  Department of Accounts & Student Billing
                </p>
                <div className="mt-2 inline-block bg-indigo-900 text-white text-xs font-bold px-4 py-0.5 rounded-full uppercase tracking-wider">
                  Official Statement of Account / Student Ledger
                </div>
              </div>

              {/* Student Summary Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs mb-6">
                <div>
                  <span className="text-slate-500 block text-[11px]">Student Name:</span>
                  <span className="font-bold text-slate-900 text-sm">{ledger.student?.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Admission No:</span>
                  <span className="font-mono font-semibold text-slate-900">{ledger.student?.admission_number}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Class & Section:</span>
                  <span className="font-semibold text-slate-900">
                    {ledger.student?.class_name} {ledger.student?.section_name ? `(${ledger.student.section_name})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Parent / Mobile:</span>
                  <span className="font-semibold text-slate-900">
                    {ledger.student?.parent_name || 'Guardian'} {ledger.student?.parent_mobile ? `• ${ledger.student.parent_mobile}` : ''}
                  </span>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-[11px] font-medium text-blue-700 block">Total Demand Billed</span>
                  <span className="text-base font-bold text-blue-900 font-mono">
                    ₹{Number(ledger.totals.totalBilled || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-[11px] font-medium text-emerald-700 block">Total Payments Received</span>
                  <span className="text-base font-bold text-emerald-900 font-mono">
                    ₹{Number(ledger.totals.totalPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <span className="text-[11px] font-medium text-purple-700 block">Total Concessions / Aid</span>
                  <span className="text-base font-bold text-purple-900 font-mono">
                    ₹{Number(ledger.totals.totalConcessions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-[11px] font-medium text-amber-700 block">Current Balance Outstanding</span>
                  <span className={`text-base font-black font-mono ${ledger.totals.currentBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    ₹{Number(ledger.totals.currentBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Ledger Transactions Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Transaction Description</th>
                      <th className="py-2.5 px-3">Ref / Voucher</th>
                      <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Running Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledger.entries && ledger.entries.length > 0 ? (
                      ledger.entries.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{entry.date}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                entry.type === 'CHARGE'
                                  ? 'bg-blue-100 text-blue-800'
                                  : entry.type === 'PAYMENT'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : entry.type === 'CONCESSION'
                                  ? 'bg-purple-100 text-purple-800'
                                  : entry.type === 'REFUND'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {entry.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">{entry.description}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {entry.type === 'PAYMENT' && onViewReceipt && entry.reference ? (
                              <button
                                onClick={() => onViewReceipt(entry.reference)}
                                className="text-indigo-600 hover:text-indigo-800 underline font-semibold flex items-center gap-1"
                              >
                                {entry.reference}
                              </button>
                            ) : (
                              entry.reference || '—'
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-semibold">
                            {entry.debit > 0
                              ? `₹${Number(entry.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                              : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                            {entry.credit > 0
                              ? `₹${Number(entry.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                              : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{Number(entry.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-500 italic">
                          No transactions found in student ledger.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                      <td colSpan={4} className="py-2.5 px-3 text-right uppercase">
                        Current Outstanding Balance:
                      </td>
                      <td colSpan={3} className="py-2.5 px-3 text-right font-mono font-black text-sm text-rose-800">
                        ₹{Number(ledger.totals.currentBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures */}
              <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-center">
                <div>
                  <div className="h-8 flex items-end justify-center font-semibold text-slate-700">
                    Accounts Office Staff
                  </div>
                  <div className="border-t border-dashed border-slate-400 pt-1 font-semibold text-slate-800">
                    Prepared By (Accounts Department)
                  </div>
                </div>

                <div>
                  <div className="h-8 flex items-end justify-center font-semibold text-slate-700">
                    School Seal & Signature
                  </div>
                  <div className="border-t border-dashed border-slate-400 pt-1 font-semibold text-slate-800">
                    Authorized Signatory / Bursar
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
