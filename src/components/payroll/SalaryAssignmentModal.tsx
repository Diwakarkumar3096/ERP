import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { EmployeeSalaryAssignment, SalaryStructure } from '../../types/erp.js';
import { X, CreditCard, Building, ShieldCheck, IndianRupee } from 'lucide-react';

interface SalaryAssignmentModalProps {
  assignment: EmployeeSalaryAssignment;
  structures: SalaryStructure[];
  schoolId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const SalaryAssignmentModal: React.FC<SalaryAssignmentModalProps> = ({
  assignment,
  structures,
  schoolId,
  onClose,
  onSuccess
}) => {
  const { addToast } = useToast();
  const [structureId, setStructureId] = useState(assignment.structure_id || '');
  const [grossMonthly, setGrossMonthly] = useState<number | string>(assignment.gross_monthly || '');
  const [basicPay, setBasicPay] = useState<number | string>(assignment.basic_pay || '');
  const [bankName, setBankName] = useState(assignment.bank_name || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(assignment.bank_account_number || '');
  const [bankIfsc, setBankIfsc] = useState(assignment.bank_ifsc || '');
  const [panNumber, setPanNumber] = useState(assignment.pan_number || '');
  const [pfUanNumber, setPfUanNumber] = useState(assignment.pf_uan_number || '');
  const [esiNumber, setEsiNumber] = useState(assignment.esi_number || 'EXEMPT');
  const [paymentMode, setPaymentMode] = useState(assignment.payment_mode || 'BANK_TRANSFER');
  const [notes, setNotes] = useState(assignment.notes || '');
  const [loading, setLoading] = useState(false);

  const handleStructureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setStructureId(sId);
    const selected = structures.find((s) => s.id === sId);
    if (selected && selected.base_gross_monthly > 0) {
      setGrossMonthly(selected.base_gross_monthly);
      setBasicPay(Math.round(selected.base_gross_monthly * 0.5));
    }
  };

  const handleGrossChange = (val: string) => {
    setGrossMonthly(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setBasicPay(Math.round(num * 0.5));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grossMonthly || parseFloat(String(grossMonthly)) <= 0) {
      addToast('Please enter a valid monthly gross salary', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.payroll.saveAssignment({
        schoolId,
        employeeId: assignment.employee_id,
        structureId: structureId || undefined,
        grossMonthly: parseFloat(String(grossMonthly)),
        basicPay: basicPay ? parseFloat(String(basicPay)) : undefined,
        bankName,
        bankAccountNumber,
        bankIfsc,
        panNumber,
        pfUanNumber,
        esiNumber,
        paymentMode,
        notes
      });
      addToast(res.message || 'Salary profile updated successfully', 'success');
      onSuccess();
    } catch (err: any) {
      addToast(err.message || 'Failed to update salary profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Configure Staff Compensation</h3>
            <p className="text-xs text-slate-500 font-mono">
              {assignment.employee_name} ({assignment.employee_id_number})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Salary Grade / Scale</label>
            <select
              value={structureId}
              onChange={handleStructureChange}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Custom Compensation Package --</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Base Gross: ₹{Number(s.base_gross_monthly).toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Gross (₹)</label>
              <input
                type="number"
                value={grossMonthly}
                onChange={(e) => handleGrossChange(e.target.value)}
                required
                min={1000}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. 45000"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">
                Annual CTC: ₹{((parseFloat(String(grossMonthly)) || 0) * 12).toLocaleString('en-IN')}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Basic Pay (₹)</label>
              <input
                type="number"
                value={basicPay}
                onChange={(e) => setBasicPay(e.target.value)}
                min={500}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="50% of Gross"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">Basis for EPF & Gratuity</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">Bank Account & Disbursal Information</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                  placeholder="e.g. State Bank of India"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Account Number</label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white font-mono"
                  placeholder="e.g. 30982241908"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Bank IFSC Code</label>
                <input
                  type="text"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                  className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white font-mono uppercase"
                  placeholder="e.g. SBIN0001234"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                  <option value="CHEQUE">Bank Cheque</option>
                  <option value="CASH">Institutional Cash</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">PAN Card No.</label>
              <input
                type="text"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono uppercase"
                placeholder="ABCDE1234F"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">EPF UAN Number</label>
              <input
                type="text"
                value={pfUanNumber}
                onChange={(e) => setPfUanNumber(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono"
                placeholder="100984521098"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">ESIC IP Number</label>
              <input
                type="text"
                value={esiNumber}
                onChange={(e) => setEsiNumber(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono"
                placeholder="EXEMPT"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks & Package Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2"
              placeholder="e.g. Senior Faculty Grade with laboratory perks"
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
              {loading ? 'Saving...' : 'Save Compensation Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
