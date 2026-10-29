import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { StudentFeeAssignment } from '../../types/erp.js';
import {
  X,
  Award,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign
} from 'lucide-react';

interface ConcessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: StudentFeeAssignment | null;
  onSuccess: () => void;
}

export const ConcessionModal: React.FC<ConcessionModalProps> = ({
  isOpen,
  onClose,
  assignment,
  onSuccess
}) => {
  const toast = useToast();

  const [concessionType, setConcessionType] = useState<string>('SCHOLARSHIP');
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [discountValue, setDiscountValue] = useState<string>('2000');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !assignment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid concession amount or percentage');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a detailed justification reason for this concession');
      return;
    }

    setSubmitting(true);
    try {
      await api.fees.requestConcession({
        studentId: assignment.student_id,
        assignmentId: assignment.id,
        concessionType,
        discountType,
        discountValue: val,
        reason: reason.trim()
      });

      toast.success('Fee concession request submitted for authorized Principal review!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit concession request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Apply Fee Concession / Scholarship</h3>
              <p className="text-xs text-slate-300">Submit student fee adjustment for administrative approval</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-lg text-xs space-y-1">
            <div className="font-bold text-purple-900">
              Student: {assignment.student_name} ({assignment.admission_number})
            </div>
            <div className="text-purple-700">
              Plan: {assignment.structure_name} • Total Charges: ₹{Number(assignment.total_charges).toLocaleString('en-IN')}
            </div>
            <div className="text-purple-700 font-semibold">
              Current Outstanding Balance: ₹{Number(assignment.outstanding_balance).toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Concession / Aid Category</label>
            <select
              value={concessionType}
              onChange={(e) => setConcessionType(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-slate-900"
            >
              <option value="SCHOLARSHIP">Merit Talent Scholarship</option>
              <option value="SIBLING_DISCOUNT">Sibling Enrollment Discount</option>
              <option value="STAFF_WARD">Staff Ward Education Benefit</option>
              <option value="FINANCIAL_AID">Economically Weaker Section (EWS) Aid</option>
              <option value="MERIT">Academic Excellence Topper Grant</option>
              <option value="SPECIAL_WAIVER">Discretionary Management Waiver</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-slate-900"
              >
                <option value="FIXED">Fixed Amount (₹)</option>
                <option value="PERCENTAGE">Percentage (%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Value {discountType === 'FIXED' ? '(₹)' : '(%)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'FIXED' ? 'e.g. 5000' : 'e.g. 25'}
                className="w-full px-3 py-2 text-xs font-bold font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Justification & Reference Remarks <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide specific justification, certificate reference, Olympiad rank, or family background notes..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-slate-900"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
