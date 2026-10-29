import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import type { Subject, ClassItem, SectionItem, AcademicSession } from '../../types/erp.js';
import { X, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';

interface AssignSubjectModalProps {
  teacherId: string;
  teacherName: string;
  schoolId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignSubjectModal: React.FC<AssignSubjectModalProps> = ({
  teacherId,
  teacherName,
  schoolId,
  onClose,
  onSuccess
}) => {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);

  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [isPrimaryTeacher, setIsPrimaryTeacher] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      api.sessions.list(schoolId),
      api.employees.getSubjects(schoolId),
      api.classes.list(schoolId)
    ])
      .then(([sessRes, subRes, clsRes]) => {
        if (!mounted) return;
        setSessions(sessRes.sessions);
        const curr = sessRes.sessions.find(s => s.is_current) || sessRes.sessions[0];
        if (curr) setSelectedSessionId(curr.id);

        setSubjects(subRes.subjects);
        if (subRes.subjects.length > 0) setSelectedSubjectId(subRes.subjects[0].id);

        setClasses(clsRes.classes);
        if (clsRes.classes.length > 0) setSelectedClassId(clsRes.classes[0].id);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message || 'Failed to load curriculum metadata');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [schoolId]);

  // Load sections when class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId('');
      return;
    }

    api.sections.list(selectedClassId)
      .then((res) => {
        setSections(res.sections);
        setSelectedSectionId('');
      })
      .catch((err) => {
        console.error('Failed to load sections', err);
      });
  }, [selectedClassId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !selectedSubjectId || !selectedClassId) {
      setError('Please select session, subject, and class.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await api.employees.assignSubject(teacherId, {
        school_id: schoolId,
        session_id: selectedSessionId,
        subject_id: selectedSubjectId,
        class_id: selectedClassId,
        section_id: selectedSectionId || null,
        is_primary_teacher: isPrimaryTeacher
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to assign subject');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Assign Subject & Class</h3>
              <p className="text-xs text-slate-500 font-medium">Faculty: {teacherName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading curriculum data...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Session <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.is_current ? '(Current Session)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject to Teach <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code}) · {sub.type}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Grade / Class <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.stream})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Section
                </label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">All Sections</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name} {sec.room_number ? `(${sec.room_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimaryTeacher"
                checked={isPrimaryTeacher}
                onChange={(e) => setIsPrimaryTeacher(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <label htmlFor="isPrimaryTeacher" className="text-xs font-medium text-slate-700">
                Primary Subject Teacher (Evaluator for report cards)
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{saving ? 'Assigning...' : 'Confirm Assignment'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
