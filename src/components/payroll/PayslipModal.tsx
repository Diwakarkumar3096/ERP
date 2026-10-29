import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import { X, Printer, Download, CheckCircle2, ShieldCheck, Building, User, Calendar, CreditCard } from 'lucide-react';

interface PayslipModalProps {
  itemId: string;
  schoolId: string;
  onClose: () => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({ itemId, schoolId, onClose }) => {
  const { addToast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayslip();
  }, [itemId]);

  const loadPayslip = async () => {
    setLoading(true);
    try {
      const res = await api.payroll.getPayslip(itemId, schoolId);
      setData(res);
    } catch (err: any) {
      addToast(err.message || 'Failed to load payslip', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
        <div className="bg-white rounded-xl p-8 text-center shadow-xl">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-slate-600">Generating official salary slip...</p>
        </div>
      </div>
    );
  }

  if (!data?.payslip) {
    return null;
  }

  const p = data.payslip;
  const netInWords = data.netPayInWords;

  const basic = parseFloat(p.basic_pay) || 0;
  const da = parseFloat(p.da) || 0;
  const hra = parseFloat(p.hra) || 0;
  const ta = parseFloat(p.ta) || 0;
  const spl = parseFloat(p.special_allowance) || 0;
  const bonus = parseFloat(p.performance_bonus) || 0;
  const totalEarnings = parseFloat(p.total_earnings) || (basic + da + hra + ta + spl + bonus);

  const pf = parseFloat(p.pf_deduction) || 0;
  const esic = parseFloat(p.esic_deduction) || 0;
  const pt = parseFloat(p.pt_deduction) || 0;
  const tds = parseFloat(p.tds_deduction) || 0;
  const lop = parseFloat(p.lop_deduction) || 0;
  const loan = parseFloat(p.loan_installment_deduction) || 0;
  const other = parseFloat(p.other_deductions) || 0;
  const totalDeductions = parseFloat(p.total_deductions) || (pf + esic + pt + tds + lop + loan + other);
  const netPay = parseFloat(p.net_pay) || (totalEarnings - totalDeductions);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Controls Bar (hidden during actual print) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-100/80 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Salary Slip Preview</span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-mono text-slate-500">{p.slip_number}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div className="p-8 bg-white print:p-4 text-slate-900 font-sans" id="printable-payslip">
          {/* Institutional Letterhead */}
          <div className="border-b-2 border-slate-900 pb-5 mb-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl tracking-tight shadow-sm">
                VV
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight uppercase">{p.school_name || 'Vidya Vahini Public School'}</h1>
                <p className="text-xs text-slate-600">
                  {p.school_address || 'Knowledge City Campus, Deoghar, Jharkhand'} {p.affiliation_no ? `· CBSE Affiliation No: ${p.affiliation_no}` : ''}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Department of Human Resources & Institutional Accounts</p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Payslip
              </div>
              <p className="text-xs font-semibold text-slate-700">{p.cycle_title || 'Monthly Salary Statement'}</p>
              <p className="text-[11px] text-slate-500 font-mono">Date: {p.paid_date ? new Date(p.paid_date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          {/* Employee & Compensation Info Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs mb-5">
            <div className="flex justify-between py-0.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Employee Name:</span>
              <span className="font-semibold text-slate-900">{p.employee_name}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Employee ID:</span>
              <span className="font-mono font-semibold text-slate-900">{p.employee_id_number}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Designation:</span>
              <span className="font-semibold text-slate-800">{p.designation_name || 'Faculty'}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Department:</span>
              <span className="font-semibold text-slate-800">{p.department_name || 'Academics'}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Bank & Account:</span>
              <span className="font-semibold text-slate-800">{p.bank_name ? `${p.bank_name} · ${p.bank_account_number?.slice(-4) ? `****${p.bank_account_number.slice(-4)}` : p.bank_account_number}` : 'Bank Transfer'}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Bank IFSC:</span>
              <span className="font-mono font-semibold text-slate-800">{p.bank_ifsc || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-slate-500 font-medium">PAN / PF UAN:</span>
              <span className="font-mono text-slate-700">{p.pan_number || 'N/A'} / {p.pf_uan_number || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-slate-500 font-medium">Attendance & Days:</span>
              <span className="font-medium text-slate-800">
                Worked: {p.present_days}d · Leaves: {p.leave_days}d {p.lop_days > 0 ? `· LOP: ${p.lop_days}d` : ''} / Total: {p.working_days}d
              </span>
            </div>
          </div>

          {/* Earnings & Deductions Tables Side-by-Side */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            {/* Earnings Column */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-emerald-50 px-3 py-2 border-b border-emerald-100 flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Earnings (Credits)</span>
                <span className="text-xs font-semibold text-emerald-800">Amount (₹)</span>
              </div>
              <div className="p-3 divide-y divide-slate-100 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Basic Pay</span>
                  <span className="font-mono font-medium text-slate-900">₹{basic.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Dearness Allowance (DA)</span>
                  <span className="font-mono font-medium text-slate-900">₹{da.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">House Rent Allowance (HRA)</span>
                  <span className="font-mono font-medium text-slate-900">₹{hra.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Transport Allowance (TA)</span>
                  <span className="font-mono font-medium text-slate-900">₹{ta.toLocaleString('en-IN')}</span>
                </div>
                {spl > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Special Academic Allowance</span>
                    <span className="font-mono font-medium text-slate-900">₹{spl.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {bonus > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Performance Incentive</span>
                    <span className="font-mono font-medium text-slate-900">₹{bonus.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
              <div className="bg-emerald-50/50 px-3 py-2 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-900">
                <span>Total Gross Earnings (A)</span>
                <span className="font-mono text-emerald-800">₹{totalEarnings.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Deductions Column */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-rose-50 px-3 py-2 border-b border-rose-100 flex justify-between items-center">
                <span className="text-xs font-bold text-rose-950 uppercase tracking-wider">Deductions (Debits)</span>
                <span className="text-xs font-semibold text-rose-800">Amount (₹)</span>
              </div>
              <div className="p-3 divide-y divide-slate-100 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Provident Fund (EPF 12%)</span>
                  <span className="font-mono font-medium text-slate-900">₹{pf.toLocaleString('en-IN')}</span>
                </div>
                {esic > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">ESIC Contribution</span>
                    <span className="font-mono font-medium text-slate-900">₹{esic.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Professional Tax (PT)</span>
                  <span className="font-mono font-medium text-slate-900">₹{pt.toLocaleString('en-IN')}</span>
                </div>
                {tds > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Tax Deducted at Source (TDS)</span>
                    <span className="font-mono font-medium text-slate-900">₹{tds.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {lop > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-rose-700 font-medium">Loss of Pay (LOP Days)</span>
                    <span className="font-mono font-semibold text-rose-700">₹{lop.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {loan > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Staff Loan / Advance EMI</span>
                    <span className="font-mono font-medium text-slate-900">₹{loan.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {other > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Other Deductions</span>
                    <span className="font-mono font-medium text-slate-900">₹{other.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
              <div className="bg-rose-50/50 px-3 py-2 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-900">
                <span>Total Deductions (B)</span>
                <span className="font-mono text-rose-800">₹{totalDeductions.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Net Pay Highlight Box */}
          <div className="p-4 bg-slate-900 text-white rounded-lg flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] font-medium text-slate-300 uppercase tracking-wider">Net Salary Payable (A - B)</p>
              <p className="text-sm font-medium text-slate-200 italic mt-0.5">{netInWords}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold tracking-tight font-mono text-emerald-400">
                ₹{netPay.toLocaleString('en-IN')}
              </span>
              <div className="flex items-center gap-1.5 justify-end mt-1 text-[11px] text-slate-300 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Status: {p.payment_status || 'PAID'}</span>
                {p.transaction_reference && <span>· Ref: {p.transaction_reference}</span>}
              </div>
            </div>
          </div>

          {/* Signatures & Institutional Seal */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <div className="h-10 border-b border-dashed border-slate-300 mb-1 flex items-end justify-center pb-1">
                <span className="text-[11px] font-mono text-slate-400 italic">Verified Digitally</span>
              </div>
              <p className="font-semibold text-slate-700">Accounts & Payroll Officer</p>
              <p className="text-[10px] text-slate-400">Vidyavahini ERP System</p>
            </div>
            <div>
              <div className="h-10 border-b border-dashed border-slate-300 mb-1 flex items-end justify-center pb-1">
                <span className="text-[11px] font-mono text-slate-400 italic">Auth ID: {p.slip_number}</span>
              </div>
              <p className="font-semibold text-slate-700">Principal / Director</p>
              <p className="text-[10px] text-slate-400">Executive Signature</p>
            </div>
            <div>
              <div className="h-10 border-b border-dashed border-slate-300 mb-1 flex items-end justify-center pb-1">
                <span className="text-[11px] font-mono text-slate-400 italic">{p.employee_name}</span>
              </div>
              <p className="font-semibold text-slate-700">Employee Signature</p>
              <p className="text-[10px] text-slate-400">Acknowledgement of Receipt</p>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 text-center mt-6">
            This is a computer-generated official pay voucher issued by Vidya Vahini Public School ERP. Valid without physical stamp if electronically signed.
          </p>
        </div>
      </div>
    </div>
  );
};
