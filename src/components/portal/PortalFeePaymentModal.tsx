import React, { useState } from 'react';
import { useToast } from '../common/Toast.js';
import jsPDF from 'jspdf';
import {
  CreditCard,
  IndianRupee,
  ShieldCheck,
  CheckCircle,
  Download,
  X,
  Smartphone,
  Building,
  QrCode,
  Sparkles
} from 'lucide-react';
import { ChildStudent } from './PortalCommon.js';

interface PortalFeePaymentModalProps {
  child: ChildStudent;
  pendingAmount: number;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export const PortalFeePaymentModal: React.FC<PortalFeePaymentModalProps> = ({
  child,
  pendingAmount,
  isOpen,
  onClose,
  onPaymentSuccess
}) => {
  const { showToast } = useToast();

  const [amount, setAmount] = useState<number>(pendingAmount > 0 ? pendingAmount : 4500);
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [installmentTitle, setInstallmentTitle] = useState('Term Tuition Fee (Q3)');
  const [processing, setProcessing] = useState(false);
  const [completedPayment, setCompletedPayment] = useState<any>(null);

  if (!isOpen) return null;

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      showToast('Please specify a valid payment amount', 'error');
      return;
    }

    try {
      setProcessing(true);
      const res = await fetch('/api/portal/fees/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: child.id,
          amount,
          paymentMethod: paymentMode,
          installmentTitle,
          idempotencyKey: `idemp_${Date.now()}_${child.id}`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');

      setCompletedPayment(data);
      showToast(`Fee payment of ₹${amount} completed successfully!`, 'success');
      onPaymentSuccess();
    } catch (err: any) {
      showToast(err.message || 'Payment processing error', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const downloadReceiptPdf = (receiptData: any) => {
    try {
      showToast('Generating official payment receipt PDF...', 'info');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      const pageWidth = 148;
      const pageHeight = 210;

      // Decorative Border
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(1);
      doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(child.school_name || 'VIDYA VAHINI PUBLIC SCHOOL', pageWidth / 2, 18, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Affiliated to CBSE, New Delhi | Knowledge Park Campus', pageWidth / 2, 23, { align: 'center' });
      doc.text('Phone: +91 11 2654 8900 | accounts@schoolerp.edu', pageWidth / 2, 27, { align: 'center' });

      doc.setDrawColor(203, 213, 225);
      doc.line(12, 30, pageWidth - 12, 30);

      // Receipt Title
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(pageWidth / 2 - 35, 33, 70, 7, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(79, 70, 229);
      doc.text('OFFICIAL FEE PAYMENT RECEIPT', pageWidth / 2, 37.5, { align: 'center' });

      // Receipt Metadata
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      doc.text(`Receipt No: ${receiptData.receiptNumber}`, 14, 48);
      doc.text(`Date: ${new Date(receiptData.paymentDate).toLocaleDateString()}`, pageWidth - 14, 48, { align: 'right' });

      doc.text(`Transaction Ref: ${receiptData.transactionReference}`, 14, 54);
      doc.text(`Payment Mode: ${paymentMode}`, pageWidth - 14, 54, { align: 'right' });

      // Student Info Box
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(12, 59, pageWidth - 24, 24, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`Student Name: ${receiptData.studentName}`, 16, 66);
      doc.setFont('helvetica', 'normal');
      doc.text(`Admission No: ${receiptData.admissionNumber}`, 16, 72);
      doc.text(`Class & Section: Class ${child.class_name}-${child.section_name}`, 16, 78);

      // Line items table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setFillColor(241, 245, 249);
      doc.rect(12, 88, pageWidth - 24, 6, 'F');
      doc.text('Fee Description', 16, 92);
      doc.text('Amount (INR)', pageWidth - 16, 92, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.text(installmentTitle, 16, 101);
      doc.text(`Rs. ${receiptData.amountPaid.toFixed(2)}`, pageWidth - 16, 101, { align: 'right' });

      doc.line(12, 106, pageWidth - 12, 106);

      // Total
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Total Amount Paid:', 16, 114);
      doc.text(`Rs. ${receiptData.amountPaid.toFixed(2)}`, pageWidth - 16, 114, { align: 'right' });

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Payment Status: Confirmed & Credited to School Account.', 16, 122);

      // Signatory
      doc.line(pageWidth - 55, 145, pageWidth - 15, 145);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('Authorized Finance Signatory', pageWidth - 35, 150, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('Accounts Department', pageWidth - 35, 154, { align: 'center' });

      doc.save(`Fee_Receipt_${receiptData.receiptNumber}.pdf`);
      showToast('Receipt PDF downloaded successfully!', 'success');
    } catch (err: any) {
      console.error('Receipt PDF error:', err);
      showToast('Failed to generate receipt PDF', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 border border-white/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Online Fee Payment Gateway</h3>
              <p className="text-xs text-indigo-200">
                Secure digital settlement for {child.first_name} {child.last_name} (#{child.admission_number})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {completedPayment ? (
          /* Payment Success State */
          <div className="p-8 text-center space-y-5">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold uppercase tracking-wider">
                Payment Successful
              </span>
              <h4 className="text-xl font-extrabold text-slate-900 mt-2">
                ₹{completedPayment.amountPaid.toLocaleString('en-IN')} Paid
              </h4>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Receipt #{completedPayment.receiptNumber} • Ref: {completedPayment.transactionReference}
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-semibold text-slate-800">{completedPayment.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Class & Section:</span>
                <span className="font-semibold text-slate-800">Class {child.class_name}-{child.section_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-semibold text-slate-800">{paymentMode}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">Credited To:</span>
                <span className="font-bold text-slate-900">{child.school_name || 'School Bank Account'}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => downloadReceiptPdf(completedPayment)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Official Receipt PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Payment Form */
          <form onSubmit={handleProcessPayment} className="p-6 space-y-5 overflow-y-auto">
            {/* Installment details */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Fee Installment</span>
                <h4 className="text-xs font-bold text-slate-900">{installmentTitle}</h4>
                <p className="text-[11px] text-slate-500">Session 2025-26 • Class {child.class_name}-{child.section_name}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500">Pending Dues</span>
                <p className="text-sm font-extrabold text-indigo-950 font-mono">₹{pendingAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Payment Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount to Pay (INR) *
              </label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2 text-sm font-bold font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setAmount(pendingAmount > 0 ? pendingAmount : 4500)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200"
                >
                  Pay Full (₹{pendingAmount > 0 ? pendingAmount : 4500})
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(2500)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200"
                >
                  Partial Installment (₹2,500)
                </button>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Choose Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMode('UPI')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    paymentMode === 'UPI'
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-2 ring-indigo-500/20 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <Smartphone className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
                  <span className="text-xs block">UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('CARD')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    paymentMode === 'CARD'
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-2 ring-indigo-500/20 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
                  <span className="text-xs block">Debit / Credit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('NETBANKING')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    paymentMode === 'NETBANKING'
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-2 ring-indigo-500/20 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <Building className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
                  <span className="text-xs block">Net Banking</span>
                </button>
              </div>
            </div>

            {/* Security Guarantee Box */}
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-[11px] text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                PCI-DSS compliant 256-bit SSL encrypted transaction. Official school receipt will be generated immediately and stored in your portal archive.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing || amount <= 0}
                className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {processing ? 'Processing Payment...' : `Pay ₹${amount.toLocaleString('en-IN')}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
