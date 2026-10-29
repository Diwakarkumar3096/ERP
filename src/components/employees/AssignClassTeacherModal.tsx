import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import type { ClassItem, SectionItem, AcademicSession } from '../../types/erp.js';
import { X, Award, CheckCircle2, AlertCircle } from 'lucide-react';

interface AssignClassTeacherModalProps {
  teacherId: string;
  teacherName: string;
  schoolId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignClassTeacherModal: React.FC<AssignClassTeacherModalProps> = ({
  teacherId,
  teacherName,
  schoolId,
  onClose,
  onSuccess
}) => {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);

  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [remarks, setRemarks] = useState('Designated Section Class Teacher & Academic In-Charge');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      api.sessions.list(schoolId),
      api.classes.list(schoolId)
    ])
      .then(([sessRes, clsRes]) => {
        if (!mounted) return;
        setSessions(sessRes.sessions);
        const curr = sessRes.sessions.find(s => s.is_current) || sessRes.sessions[0];
        if (curr) setSelectedSessionId(curr.id);

        setClasses(clsRes.classes);
        if (clsRes.classes.length > 0) setSelectedClassId(clsRes.classes[0].id);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message || 'Failed to load class roster');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [schoolId]);

  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId('');
      return;
    }

    api.sections.list(selectedClassId)
      .then((res) => {
        setSections(res.sections);
        if (res.sections.length > 0) setSelectedSectionId(res.sections[0].id);
        else setSelectedSectionId('');
      })
      .catch((err) => {
        console.error('Failed to load sections', err);
      });
  }, [selectedClassId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !selectedClassId || !selectedSectionId) {
      setError('Please select academic session, class, and section.');
      return;
    }

    const currentSession = sessions.find(s => s.id === selectedSessionId);

    try {
      setSaving(true);
      setError(null);
      await api.employees.assignClassTeacher({
        school_id: schoolId,
        session_id: selectedSessionId,
        class_id: selectedClassId,
        section_id: selectedSectionId,
        teacher_id: teacherId,
        academic_year: currentSession?.name || '',
        remarks
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to assign class teacher');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Designate Class Teacher</h3>
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
          <div className="p-8 text-center text-xs text-slate-500">Loading rosters...</div>
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
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.is_current ? '(Current Session)' : ''}
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
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Section <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  {sections.length === 0 && <option value="">No sections available</option>}
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name} {sec.class_teacher_name ? `(Curr: ${sec.class_teacher_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Designation Order / Remarks
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
              />
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-relaxed">
              Designating this faculty as the Class Teacher will assign them primary attendance taking, progress card signatory, and parent communication oversight for this section.
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
                disabled={saving || !selectedSectionId}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{saving ? 'Designating...' : 'Confirm Class Teacher'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
