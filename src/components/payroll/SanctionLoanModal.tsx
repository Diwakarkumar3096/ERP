import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import { X, HandCoins, IndianRupee, Calendar, AlertCircle } from 'lucide-react';

interface SanctionLoanModalProps {
  schoolId: string;
  employees: Array<{ id: string; name: string; empNo: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

export const SanctionLoanModal: React.FC<SanctionLoanModalProps> = ({
  schoolId,
  employees,
  onClose,
  onSuccess
}) => {
  const { addToast } = useToast();
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '');
  const [loanType, setLoanType] = useState('SALARY_ADVANCE');
  const [principalAmount, setPrincipalAmount] = useState<number | string>(25000);
  const [repaymentMonths, setRepaymentMonths] = useState<number | string>(5);
  const [disbursementDate, setDisbursementDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const principal = parseFloat(String(principalAmount)) || 0;
  const months = parseInt(String(repaymentMonths), 10) || 1;
  const computedEmi = Math.round(principal / months);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (principal <= 0) {
      addToast('Please enter a valid loan/advance principal amount', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.payroll.sanctionLoan({
        schoolId,
        employeeId,
        loanType,
        principalAmount: principal,
        repaymentMonths: months,
        disbursementDate,
        reason
      });
      addToast(res.message || 'Staff advance/loan sanctioned successfully', 'success');
      onSuccess();
    } catch (err: any) {
      addToast(err.message || 'Failed to sanction loan', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <HandCoins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Sanction Staff Advance / Loan</h3>
              <p className="text-xs text-slate-500">Interest-free institutional advance with payroll EMI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Beneficiary Employee</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.empNo})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Advance / Loan Type</label>
            <select
              value={loanType}
              onChange={(e) => setLoanType(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="SALARY_ADVANCE">Salary Advance (Short Term)</option>
              <option value="FESTIVAL_ADVANCE">Festival Advance</option>
              <option value="PERSONAL_LOAN">Institutional Personal Loan</option>
              <option value="EMERGENCY_AID">Medical & Emergency Assistance</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Principal Amount (₹)</label>
              <input
                type="number"
                value={principalAmount}
                onChange={(e) => setPrincipalAmount(e.target.value)}
                required
                min={1000}
                step={500}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tenure (Months)</label>
              <input
                type="number"
                value={repaymentMonths}
                onChange={(e) => setRepaymentMonths(e.target.value)}
                required
                min={1}
                max={36}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursement Date</label>
            <input
              type="date"
              value={disbursementDate}
              onChange={(e) => setDisbursementDate(e.target.value)}
              required
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Computed EMI box */}
          <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200/80 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-emerald-950 block">Monthly Payroll Deduction (EMI):</span>
              <span className="text-[11px] text-emerald-800">Auto-deducted during monthly payroll runs</span>
            </div>
            <span className="text-base font-bold text-emerald-900 font-mono">₹{computedEmi.toLocaleString('en-IN')}/mo</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sanction Justification / Purpose</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Approved salary advance for medical hospitalization support"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors shadow-xs disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Sanction Advance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
