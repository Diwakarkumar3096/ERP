import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { School, AcademicSession, ClassItem, SectionItem, FeeStructure } from '../../types/erp.js';
import {
  X,
  Users,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface ClassFeeAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  sessions: AcademicSession[];
  classes: ClassItem[];
  structures: FeeStructure[];
  currentSchoolId: string;
  currentSessionId: string;
  onAssigned: () => void;
}

export const ClassFeeAssignModal: React.FC<ClassFeeAssignModalProps> = ({
  isOpen,
  onClose,
  schools,
  sessions,
  classes,
  structures,
  currentSchoolId,
  currentSessionId,
  onAssigned
}) => {
  const toast = useToast();
  const safeClasses = Array.isArray(classes) ? classes : [];
  const safeStructures = Array.isArray(structures) ? structures : [];

  const [schoolId, setSchoolId] = useState(currentSchoolId);
  const [sessionId, setSessionId] = useState(currentSessionId);
  const [classId, setClassId] = useState(safeClasses[0]?.id || '');
  const [structureId, setStructureId] = useState(safeStructures[0]?.id || '');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (safeClasses.length > 0 && !classId) {
      setClassId(safeClasses[0].id);
    }
  }, [safeClasses, classId]);

  React.useEffect(() => {
    if (safeStructures.length > 0 && !structureId) {
      setStructureId(safeStructures[0].id);
    }
  }, [safeStructures, structureId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId || !structureId) {
      toast.error('Please select both a class and a fee plan');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.fees.assignClass({
        schoolId,
        sessionId,
        classId,
        structureId
      });
      toast.success(res.message || `Successfully assigned fee plan to ${res.assignedCount} students!`);
      onAssigned();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to assign class fee plan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Bulk Assign Fee Plan to Class</h3>
              <p className="text-xs text-slate-300">Enroll all students in a class into the selected fee schedule</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Class</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900"
            >
              {safeClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Fee Structure Plan</label>
            <select
              value={structureId}
              onChange={(e) => setStructureId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900"
            >
              {safeStructures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) - {s.frequency}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
            Students who already have an active fee plan for this academic session will be safely preserved without creating duplicate fee debts.
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
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Assigning...' : 'Assign to All Students'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
