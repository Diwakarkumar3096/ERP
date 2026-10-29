import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import { X, Calculator, Calendar, AlertCircle } from 'lucide-react';

interface GeneratePayrollModalProps {
  schoolId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const GeneratePayrollModal: React.FC<GeneratePayrollModalProps> = ({ schoolId, onClose, onSuccess }) => {
  const { addToast } = useToast();
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [workingDays, setWorkingDays] = useState(26);
  const [loading, setLoading] = useState(false);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.payroll.generateCycle({
        schoolId,
        month,
        year,
        workingDays
      });
      addToast(res.message || 'Payroll cycle generated successfully!', 'success');
      onSuccess();
    } catch (err: any) {
      addToast(err.message || 'Failed to generate payroll cycle', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Run Monthly Payroll</h3>
              <p className="text-xs text-slate-500">Auto-calculate salaries, attendance, LOP & loans</p>
            </div>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                min={2020}
                max={2035}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Working Days in Month</label>
            <input
              type="number"
              value={workingDays}
              onChange={(e) => setWorkingDays(parseInt(e.target.value, 10))}
              min={1}
              max={31}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">Excludes Sundays and declared institutional holidays.</p>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/60 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-amber-950">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Automated Calculation Rules</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              • Pulls all staff with active salary profiles.<br />
              • Reads biometric & leave records to determine LOP deduction.<br />
              • Automatically deducts active Staff Loan / Advance EMIs.<br />
              • Computes statutory EPF (12%), ESIC, PT, and TDS.
            </p>
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
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors shadow-xs disabled:opacity-50"
            >
              <Calculator className="w-3.5 h-3.5" />
              {loading ? 'Calculating...' : 'Generate Payroll Cycle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
