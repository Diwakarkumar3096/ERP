import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type {
  Employee,
  ClassItem,
  SectionItem,
  Subject,
  TimetablePeriod
} from '../../types/erp.js';
import {
  X,
  UserCheck,
  AlertCircle,
  Calendar,
  Clock,
  Briefcase
} from 'lucide-react';

interface SubstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  teachers: Employee[];
  classes: ClassItem[];
  subjects: Subject[];
  periods: TimetablePeriod[];
}

export const SubstitutionModal: React.FC<SubstitutionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  schoolId,
  teachers,
  classes,
  subjects,
  periods
}) => {
  const { showToast } = useToast();
  const [substitutionDate, setSubstitutionDate] = useState(new Date().toISOString().slice(0, 10));
  const [originalTeacherId, setOriginalTeacherId] = useState(teachers[0]?.id || '');
  const [substituteTeacherId, setSubstituteTeacherId] = useState(teachers[1]?.id || teachers[0]?.id || '');
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [periodId, setPeriodId] = useState(periods[0]?.id || '');
  const [reason, setReason] = useState('Medical Leave / Health Exigency');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentClass = classes.find((c) => c.id === classId);
  const classSections = currentClass?.sections || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (originalTeacherId === substituteTeacherId) {
      showToast('Substitute teacher must be different from the original teacher.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.classroom.assignSubstitution({
        schoolId,
        substitutionDate,
        originalTeacherId,
        substituteTeacherId,
        classId,
        sectionId: sectionId || undefined,
        subjectId,
        periodId,
        reason,
        remarks: remarks.trim() || undefined
      });

      showToast('Teacher substitution assigned and notification dispatched.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to assign teacher substitution.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Assign Teacher Substitution</h3>
              <p className="text-xs text-slate-500">Provide temporary replacement for absent or engaged faculty</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Substitution Date *</label>
              <input
                type="date"
                value={substitutionDate}
                onChange={(e) => setSubstitutionDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Period Slot *</label>
              <select
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                required
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.start_time} - {p.end_time})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Original Teacher (Absent) *</label>
              <select
                value={originalTeacherId}
                onChange={(e) => setOriginalTeacherId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                required
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.first_name} {t.last_name} ({t.employee_id_number || 'Teacher'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Substitute Teacher (Covering) *</label>
              <select
                value={substituteTeacherId}
                onChange={(e) => setSubstituteTeacherId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                required
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.first_name} {t.last_name} ({t.employee_id_number || 'Teacher'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Class *</label>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSectionId('');
                }}
                className="w-full px-2.5 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                required
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="">All / Default</option>
                {classSections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Sec {sec.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                required
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Absence Reason *</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Medical leave, District workshop, Personal emergency..."
              className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Instructions / Remarks</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Supervise textbook reading on Chapter 4, distribute test papers..."
              className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
            >
              {submitting ? 'Assigning...' : 'Confirm Substitution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
