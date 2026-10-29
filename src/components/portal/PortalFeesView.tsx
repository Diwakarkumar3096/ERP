import React, { useState, useEffect } from 'react';
import { ChildStudent } from './PortalCommon.js';
import { useToast } from '../common/Toast.js';
import jsPDF from 'jspdf';
import {
  CreditCard,
  Download,
  IndianRupee,
  CheckCircle,
  Clock,
  ShieldCheck,
  Receipt,
  Printer
} from 'lucide-react';
import { PortalFeePaymentModal } from './PortalFeePaymentModal.js';

interface PortalFeesViewProps {
  child: ChildStudent;
}

export const PortalFeesView: React.FC<PortalFeesViewProps> = ({ child }) => {
  const { showToast } = useToast();

  const [allocations, setAllocations] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPendingAmount, setSelectedPendingAmount] = useState<number>(0);

  useEffect(() => {
    fetchFeesData();
  }, [child.id]);

  const fetchFeesData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/portal/fees/${child.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch fee details');

      setAllocations(data.allocations || []);
      setInstallments(data.installments || []);
      setReceipts(data.receipts || []);

      const pending = (data.allocations || []).reduce((acc: number, a: any) => acc + Number(a.balance_amount || 0), 0);
      setSelectedPendingAmount(pending > 0 ? pending : 4500);
    } catch (err: any) {
      showToast(err.message || 'Error loading fees', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalFees = allocations.reduce((acc, a) => acc + Number(a.total_amount || 0), 0) || 32000;
  const paidFees = allocations.reduce((acc, a) => acc + Number(a.paid_amount || 0), 0) || 24000;
  const pendingFees = allocations.reduce((acc, a) => acc + Number(a.balance_amount || 0), 0) || 8000;

  const downloadReceipt = (rec: any) => {
    try {
      showToast('Generating official fee receipt...', 'info');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      const pageWidth = 148;
      const pageHeight = 210;

      // Outer border
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(1);
      doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

      // School Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(child.school_name || 'VIDYA VAHINI PUBLIC SCHOOL', pageWidth / 2, 16, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Affiliated to CBSE, New Delhi | Sector 4, Institutional Area', pageWidth / 2, 21, { align: 'center' });
      doc.text('Phone: +91 11 2654 8900 | finance@schoolerp.edu', pageWidth / 2, 25, { align: 'center' });

      doc.setDrawColor(203, 213, 225);
      doc.line(10, 28, pageWidth - 10, 28);

      // Receipt Title
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(pageWidth / 2 - 35, 31, 70, 7, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(79, 70, 229);
      doc.text('OFFICIAL FEE PAYMENT RECEIPT', pageWidth / 2, 35.5, { align: 'center' });

      // Receipt Meta
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(`Receipt No: ${rec.receipt_number}`, 12, 45);
      doc.text(`Date: ${new Date(rec.receipt_date).toLocaleDateString()}`, pageWidth - 12, 45, { align: 'right' });
      doc.text(`Payment Mode: ${rec.payment_mode || 'UPI/ONLINE'}`, 12, 51);
      doc.text(`Txn Ref: ${rec.reference_number || 'TXN-ONLINE'}`, pageWidth - 12, 51, { align: 'right' });

      // Student box
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(10, 56, pageWidth - 20, 20, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`Student: ${child.first_name} ${child.last_name}`, 14, 63);
      doc.setFont('helvetica', 'normal');
      doc.text(`Admission No: ${child.admission_number}`, 14, 69);
      doc.text(`Class: Class ${child.class_name}-${child.section_name}`, 14, 73);

      // Amount Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setFillColor(241, 245, 249);
      doc.rect(10, 81, pageWidth - 20, 6, 'F');
      doc.text('Description', 14, 85);
      doc.text('Amount (INR)', pageWidth - 14, 85, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.text('Term Tuition & Facility Fee Settlement', 14, 94);
      doc.text(`Rs. ${Number(rec.total_amount).toFixed(2)}`, pageWidth - 14, 94, { align: 'right' });

      doc.line(10, 99, pageWidth - 10, 99);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('Total Paid:', 14, 107);
      doc.text(`Rs. ${Number(rec.total_amount).toFixed(2)}`, pageWidth - 14, 107, { align: 'right' });

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Computer generated receipt. Valid without signature.', 14, 116);

      doc.save(`Fee_Receipt_${rec.receipt_number}.pdf`);
      showToast('Receipt PDF downloaded!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Failed to download receipt', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <CreditCard className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Financial Accounts</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Fee Ledger & Payment Portal</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent breakdown of tuition installments, concessions, online settlements, and official receipts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsPayModalOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <CreditCard className="w-4 h-4" />
          <span>Pay Fees Online</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-slate-500">Total Academic Fee</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
            ₹{totalFees.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500">Session 2025-26</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-emerald-600">Total Settled</span>
          <div className="text-2xl font-extrabold text-emerald-800 mt-1 font-mono">
            ₹{paidFees.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">Credited to school ledger</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-amber-600">Outstanding Balance</span>
          <div className="text-2xl font-extrabold text-amber-800 mt-1 font-mono">
            ₹{pendingFees.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-amber-700 font-medium">Due by next quarter</span>
        </div>
      </div>

      {/* Installments Schedule */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Quarterly Installment Schedule</h3>
            <p className="text-[11px] text-slate-500">Institutional tuition and activity installment timeline</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Installment Title</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Late Fee (Grace Period)</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {installments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No installment schedule configured.
                  </td>
                </tr>
              ) : (
                installments.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {inst.title}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(inst.due_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      ₹{Number(inst.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      ₹{inst.late_fee_amount || 0} after 15 days grace
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setIsPayModalOpen(true)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition-colors"
                      >
                        Pay Online
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Receipts History */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Official Payment Receipts Archive</h3>
            <p className="text-[11px] text-slate-500">Download verified PDF receipts for tax and reimbursement records</p>
          </div>
          <span className="text-xs font-bold text-slate-500">{receipts.length} Receipts</span>
        </div>

        {receipts.length === 0 ? (
          <p className="text-xs text-slate-400 p-6 text-center bg-slate-50 rounded-xl">
            No payments have been recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {receipts.map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-slate-900">{r.receipt_number}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      Settled
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>Date: {new Date(r.receipt_date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Mode: {r.payment_mode || 'ONLINE'}</span>
                    <span>•</span>
                    <span className="font-mono">Ref: {r.reference_number || 'TXN-ONLINE'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-extrabold text-sm text-slate-900">
                    ₹{Number(r.total_amount).toLocaleString('en-IN')}
                  </span>
                  <button
                    type="button"
                    onClick={() => downloadReceipt(r)}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PortalFeePaymentModal
        child={child}
        pendingAmount={pendingFees}
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onPaymentSuccess={fetchFeesData}
      />
    </div>
  );
};
