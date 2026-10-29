import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import { useAuth } from '../../context/AuthContext.js';
import type { OfficialReceiptPayload } from '../../types/erp.js';
import {
  X,
  Printer,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  CreditCard,
  Calendar,
  Clock,
  ShieldCheck,
  FileText
} from 'lucide-react';

interface FeeReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptNumber: string | null;
  initialPayload?: OfficialReceiptPayload | null;
  onReceiptUpdated?: () => void;
}

export const FeeReceiptModal: React.FC<FeeReceiptModalProps> = ({
  isOpen,
  onClose,
  receiptNumber,
  initialPayload,
  onReceiptUpdated
}) => {
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [payload, setPayload] = useState<OfficialReceiptPayload | null>(initialPayload || null);
  const [reprintCount, setReprintCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [reprinting, setReprinting] = useState(false);
  const [showReprintPrompt, setShowReprintPrompt] = useState(false);
  const [reprintReason, setReprintReason] = useState('');

  React.useEffect(() => {
    if (isOpen && receiptNumber) {
      loadReceipt();
    } else if (initialPayload) {
      setPayload(initialPayload);
    }
  }, [isOpen, receiptNumber, initialPayload]);

  const loadReceipt = async () => {
    if (!receiptNumber) return;
    setLoading(true);
    try {
      const res = await api.fees.getReceipt(receiptNumber);
      setPayload(res.payload);
      setReprintCount(res.reprintCount || 0);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load receipt details');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReprintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptNumber || !reprintReason.trim()) {
      toast.error('Please enter a valid reason for reprinting this official receipt');
      return;
    }
    setReprinting(true);
    try {
      const res = await api.fees.reprintReceipt(receiptNumber, reprintReason.trim());
      setReprintCount(res.reprintCount);
      setPayload(res.payload);
      setShowReprintPrompt(false);
      setReprintReason('');
      toast.success(`Receipt marked as duplicate reprint (#${res.reprintCount})`);
      if (onReceiptUpdated) onReceiptUpdated();
      setTimeout(() => {
        window.print();
      }, 300);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record reprint');
    } finally {
      setReprinting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Official Fee Receipt Voucher</h3>
              <p className="text-xs text-slate-300">
                Receipt No: <span className="font-mono text-emerald-300 font-semibold">{receiptNumber || payload?.receiptNumber}</span>
                {reprintCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-[10px] bg-amber-500/30 text-amber-300 rounded font-semibold uppercase">
                    Duplicate (Reprint #{reprintCount})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasPermission('fees.receipt.reprint') && reprintCount > 0 && (
              <button
                onClick={() => setShowReprintPrompt(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg flex items-center gap-1.5 transition-colors"
                title="Record official reprint entry"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Log Reprint
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Printable Receipt Area */}
        <div className="p-8 overflow-y-auto bg-slate-50 flex-1">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading official receipt certificate...</p>
            </div>
          ) : !payload ? (
            <div className="py-16 text-center text-slate-500">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">Receipt Not Found</p>
              <p className="text-xs text-slate-500 mt-1">Could not find receipt voucher details.</p>
            </div>
          ) : (
            <div
              id="printable-fee-receipt"
              className="bg-white border-2 border-slate-300 rounded-xl p-8 shadow-sm relative text-slate-900 font-sans"
            >
              {/* Watermark for duplicate reprints */}
              {reprintCount > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                  <span className="text-7xl font-black text-rose-900 rotate-[-30deg] tracking-widest uppercase">
                    DUPLICATE
                  </span>
                </div>
              )}

              {/* School Header */}
              <div className="border-b-2 border-slate-900 pb-5 mb-6 text-center relative">
                <div className="inline-block p-2 bg-slate-100 rounded-full mb-2">
                  <Building className="w-8 h-8 text-slate-800 mx-auto" />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                  {payload.school?.name || 'School ERP System'}
                </h1>
                <p className="text-xs font-semibold text-slate-700 tracking-wide mt-0.5">
                  {payload.school?.affiliation || 'Affiliated to Central Board of Secondary Education'}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {payload.school?.address || 'Campus Road, Knowledge Hub'} • Phone: {payload.school?.phone || '+91 6432 245100'} • Email: {payload.school?.email || 'accounts@erp.edu'}
                </p>
                <div className="mt-3 inline-block bg-slate-900 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                  Fee Money Receipt
                </div>
              </div>

              {/* Receipt Top Metadata Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs mb-6">
                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">Receipt Voucher No:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{payload.receiptNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">Payment Date:</span>
                  <span className="font-semibold text-slate-900">{payload.date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">Payment Time:</span>
                  <span className="font-semibold text-slate-900">{payload.time || '10:00 AM'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">Payment Mode:</span>
                  <span className="font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {payload.paymentMode}
                  </span>
                </div>
              </div>

              {/* Student Details Grid */}
              <div className="border border-slate-200 rounded-lg p-4 bg-white mb-6">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-600" />
                  Student Particulars
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-slate-500">Student Name:</span>{' '}
                    <span className="font-bold text-slate-900">{payload.student?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Admission No:</span>{' '}
                    <span className="font-mono font-semibold text-slate-900">{payload.student?.admissionNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Class & Section:</span>{' '}
                    <span className="font-semibold text-slate-900">
                      {payload.student?.class} {payload.student?.section ? `— Sec ${payload.student.section}` : ''}
                    </span>
                  </div>
                  {payload.student?.rollNumber && (
                    <div>
                      <span className="text-slate-500">Roll Number:</span>{' '}
                      <span className="font-semibold text-slate-900">{payload.student.rollNumber}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500">Father / Guardian:</span>{' '}
                    <span className="font-semibold text-slate-900">{payload.parent?.name || 'Guardian'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Contact Mobile:</span>{' '}
                    <span className="font-semibold text-slate-900">{payload.parent?.mobile || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-4 w-12 text-center">#</th>
                      <th className="py-2.5 px-4">Fee Head / Description</th>
                      <th className="py-2.5 px-4">Applicable Installment</th>
                      <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payload.itemsPaid && payload.itemsPaid.length > 0 ? (
                      payload.itemsPaid.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900">{item.category}</td>
                          <td className="py-2.5 px-4 text-slate-600">{item.installment || 'Academic Term'}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                            ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-500 italic">
                          Composite Academic Fee Payment
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
                      <td colSpan={3} className="py-3 px-4 text-right text-xs uppercase tracking-wider">
                        Total Amount Received:
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sm font-black text-emerald-800">
                        ₹{Number(payload.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Financial Balances & Instrument Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-8">
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-1.5">
                  <div className="font-bold text-slate-700 mb-1">Transaction Details:</div>
                  {payload.transactionReference && (
                    <div>
                      <span className="text-slate-500">Reference / Txn ID:</span>{' '}
                      <span className="font-mono font-semibold text-slate-900">{payload.transactionReference}</span>
                    </div>
                  )}
                  {payload.chequeNumber && (
                    <div>
                      <span className="text-slate-500">Cheque / DD No:</span>{' '}
                      <span className="font-mono font-semibold text-slate-900">{payload.chequeNumber}</span>
                    </div>
                  )}
                  {payload.bankName && (
                    <div>
                      <span className="text-slate-500">Drawn on Bank:</span>{' '}
                      <span className="font-semibold text-slate-900">{payload.bankName}</span>
                    </div>
                  )}
                  {payload.remarks && (
                    <div>
                      <span className="text-slate-500">Remarks:</span>{' '}
                      <span className="text-slate-700 italic">{payload.remarks}</span>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-1.5">
                  <div className="font-bold text-slate-700 mb-1">Ledger Balance Impact:</div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Previous Total Dues:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      ₹{Number(payload.previousBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Payment Credited:</span>
                    <span className="font-mono">
                      -₹{Number(payload.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
                    <span>Remaining Balance Due:</span>
                    <span className="font-mono text-rose-700">
                      ₹{Number(payload.remainingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures & Official Stamp */}
              <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-center">
                <div>
                  <div className="h-10 flex items-end justify-center font-script text-slate-700 text-sm font-semibold">
                    {payload.collectedBy || 'Accounts Counter Officer'}
                  </div>
                  <div className="border-t border-dashed border-slate-400 pt-1 font-semibold text-slate-800">
                    Cashier / Accounts Officer Signature
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Cashier: {payload.collectedBy}</p>
                </div>

                <div>
                  <div className="h-10 flex items-center justify-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 border border-slate-300 px-3 py-1 rounded">
                      Official Seal
                    </span>
                  </div>
                  <div className="border-t border-dashed border-slate-400 pt-1 font-semibold text-slate-800">
                    Authorized Signatory / Principal
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Computer Generated Official Voucher</p>
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-[10px] text-slate-500 text-center mt-6 italic">
                * Note: Fees once paid are non-refundable unless sanctioned under official school board policy. Please preserve this receipt for tax, admission, and examination verification.
              </p>
            </div>
          )}
        </div>

        {/* Modal Reprint Prompt Drawer */}
        {showReprintPrompt && (
          <div className="p-4 bg-amber-50 border-t border-amber-200">
            <form onSubmit={handleReprintSubmit} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  Reason for Official Duplicate Reprint:
                </label>
                <input
                  type="text"
                  required
                  value={reprintReason}
                  onChange={(e) => setReprintReason(e.target.value)}
                  placeholder="e.g. Parent lost original receipt; requested duplicate for Income Tax 80C filing"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowReprintPrompt(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reprinting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 disabled:opacity-50"
                >
                  {reprinting ? 'Logging...' : 'Confirm & Print Duplicate'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
