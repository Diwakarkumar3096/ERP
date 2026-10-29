import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import { X, Award, Star, TrendingUp } from 'lucide-react';

interface AppraisalModalProps {
  schoolId: string;
  employees: Array<{ id: string; name: string; empNo: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

export const AppraisalModal: React.FC<AppraisalModalProps> = ({
  schoolId,
  employees,
  onClose,
  onSuccess
}) => {
  const { addToast } = useToast();
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '');
  const [reviewPeriod, setReviewPeriod] = useState('Annual Academic Review 2026-27');
  const [rating, setRating] = useState('4.5');
  const [pedagogyScore, setPedagogyScore] = useState('4.6');
  const [punctualityScore, setPunctualityScore] = useState('4.8');
  const [disciplineScore, setDisciplineScore] = useState('4.5');
  const [strengths, setStrengths] = useState('');
  const [areasForImprovement, setAreasForImprovement] = useState('');
  const [recommendedAction, setRecommendedAction] = useState('INCREMENT');
  const [incrementPercentage, setIncrementPercentage] = useState('8.0');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.payroll.createAppraisal({
        schoolId,
        employeeId,
        reviewPeriod,
        rating: parseFloat(rating),
        pedagogyScore: parseFloat(pedagogyScore),
        punctualityScore: parseFloat(punctualityScore),
        disciplineScore: parseFloat(disciplineScore),
        strengths,
        areasForImprovement,
        recommendedAction,
        incrementPercentage: parseFloat(incrementPercentage) || 0
      });
      addToast(res.message || 'Appraisal recorded successfully', 'success');
      onSuccess();
    } catch (err: any) {
      addToast(err.message || 'Failed to record appraisal', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Conduct Performance Appraisal</h3>
              <p className="text-xs text-slate-500">Faculty evaluation & career advancement record</p>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Employee</label>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Appraisal Period / Session</label>
            <input
              type="text"
              value={reviewPeriod}
              onChange={(e) => setReviewPeriod(e.target.value)}
              required
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Overall (5.0)</label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                required
                className="w-full text-xs rounded border border-slate-300 p-1.5 font-bold text-center text-indigo-700 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Pedagogy</label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={pedagogyScore}
                onChange={(e) => setPedagogyScore(e.target.value)}
                className="w-full text-xs rounded border border-slate-300 p-1.5 text-center bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Punctuality</label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={punctualityScore}
                onChange={(e) => setPunctualityScore(e.target.value)}
                className="w-full text-xs rounded border border-slate-300 p-1.5 text-center bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Discipline</label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={disciplineScore}
                onChange={(e) => setDisciplineScore(e.target.value)}
                className="w-full text-xs rounded border border-slate-300 p-1.5 text-center bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Recommendation</label>
              <select
                value={recommendedAction}
                onChange={(e) => setRecommendedAction(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800"
              >
                <option value="INCREMENT">Annual Merit Increment</option>
                <option value="PROMOTION">Promotion to Senior Scale</option>
                <option value="CONFIRMATION">Confirmation of Probation</option>
                <option value="RETENTION">Retention in Current Grade</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Recommended Increment (%)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="30"
                value={incrementPercentage}
                onChange={(e) => setIncrementPercentage(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Key Strengths & Contributions</label>
            <textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              rows={2}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              placeholder="e.g. Excellent board examination score delivery, student mentorship..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Areas for Development</label>
            <textarea
              value={areasForImprovement}
              onChange={(e) => setAreasForImprovement(e.target.value)}
              rows={2}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              placeholder="e.g. Encouraged to lead CBSE educational technology workshops..."
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
              {loading ? 'Recording...' : 'Save Appraisal Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
