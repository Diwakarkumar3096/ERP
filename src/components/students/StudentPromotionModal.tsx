import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../common/Toast.js';
import { Modal } from '../common/Modal.js';
import type { Student, School, AcademicSession, ClassItem, SectionItem, StudentPromotionPayload } from '../../types/erp.js';
import { ArrowRight, CheckCircle2, AlertTriangle, Users, ArrowUpRight } from 'lucide-react';

interface StudentPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPromoted: () => void;
}

export const StudentPromotionModal: React.FC<StudentPromotionModalProps> = ({
  isOpen,
  onClose,
  onPromoted
}) => {
  const { activeSchool, availableSchools, isSuperAdmin } = useAuth();
  const toast = useToast();

  const [schoolId, setSchoolId] = useState('');
  const [schools, setSchools] = useState<School[]>([]);

  // Source Session / Class / Section
  const [sourceSessionId, setSourceSessionId] = useState('');
  const [sourceClassId, setSourceClassId] = useState('');
  const [sourceSectionId, setSourceSectionId] = useState('');

  // Target Session / Class / Section
  const [targetSessionId, setTargetSessionId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');

  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sourceSections, setSourceSections] = useState<SectionItem[]>([]);
  const [targetSections, setTargetSections] = useState<SectionItem[]>([]);

  // Student list from source section
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Per-student promotion actions map
  const [actionMap, setActionMap] = useState<Record<string, { action: 'PROMOTE' | 'RETAIN' | 'GRADUATED' | 'WITHDRAWN'; rollNumber: string }>>({});

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const initialSchool = activeSchool?.id || availableSchools[0]?.id || '';
    setSchoolId(initialSchool);
  }, [isOpen, activeSchool, availableSchools]);

  // Load school details
  useEffect(() => {
    if (!isOpen) return;
    api.schools.list().then(res => setSchools(res.schools)).catch(console.error);
  }, [isOpen]);

  // When School changes, load sessions & classes
  useEffect(() => {
    if (!schoolId) return;

    api.sessions.list(schoolId).then(res => {
      setSessions(res.sessions);
      if (res.sessions.length > 0) {
        const current = res.sessions.find(s => s.is_current) || res.sessions[0];
        setSourceSessionId(current.id);
        const next = res.sessions.find(s => s.status === 'upcoming') || res.sessions[0];
        setTargetSessionId(next.id);
      }
    }).catch(console.error);

    api.classes.list(schoolId).then(res => {
      setClasses(res.classes);
      if (res.classes.length > 0) {
        setSourceClassId(res.classes[0].id);
        // Default target class to next grade if available
        if (res.classes.length > 1) {
          setTargetClassId(res.classes[1].id);
        } else {
          setTargetClassId(res.classes[0].id);
        }
      }
    }).catch(console.error);
  }, [schoolId]);

  // Load Source Sections
  useEffect(() => {
    if (!schoolId || !sourceClassId) {
      setSourceSections([]);
      return;
    }
    api.sections.list(schoolId, sourceClassId).then(res => {
      setSourceSections(res.sections);
      if (res.sections.length > 0) {
        setSourceSectionId(res.sections[0].id);
      } else {
        setSourceSectionId('');
      }
    }).catch(console.error);
  }, [schoolId, sourceClassId]);

  // Load Target Sections
  useEffect(() => {
    if (!schoolId || !targetClassId) {
      setTargetSections([]);
      return;
    }
    api.sections.list(schoolId, targetClassId).then(res => {
      setTargetSections(res.sections);
      if (res.sections.length > 0) {
        setTargetSectionId(res.sections[0].id);
      } else {
        setTargetSectionId('');
      }
    }).catch(console.error);
  }, [schoolId, targetClassId]);

  // Fetch Students for selected source
  const loadSourceStudents = async () => {
    if (!schoolId || !sourceSessionId || !sourceClassId) return;

    setLoadingStudents(true);
    try {
      const res = await api.students.list({
        schoolId,
        sessionId: sourceSessionId,
        classId: sourceClassId,
        sectionId: sourceSectionId || undefined,
        status: 'ACTIVE',
        limit: 100
      });
      setStudents(res.students);

      // Initialize map
      const initialMap: Record<string, { action: 'PROMOTE' | 'RETAIN' | 'GRADUATED' | 'WITHDRAWN'; rollNumber: string }> = {};
      res.students.forEach((s, idx) => {
        initialMap[s.id] = {
          action: 'PROMOTE',
          rollNumber: s.roll_number || (idx + 1).toString().padStart(2, '0')
        };
      });
      setActionMap(initialMap);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch student roster.');
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (sourceSessionId && sourceClassId) {
      loadSourceStudents();
    }
  }, [sourceSessionId, sourceClassId, sourceSectionId]);

  const handleSetAllAction = (action: 'PROMOTE' | 'RETAIN') => {
    const updated = { ...actionMap };
    students.forEach(s => {
      if (updated[s.id]) {
        updated[s.id].action = action;
      }
    });
    setActionMap(updated);
  };

  const handleExecutePromotion = async () => {
    if (students.length === 0) {
      toast.error('No students loaded to promote.');
      return;
    }

    if (!targetSessionId || !targetClassId || !targetSectionId) {
      toast.error('Please specify target Academic Session, Class, and Section.');
      return;
    }

    if (sourceSessionId === targetSessionId && sourceClassId === targetClassId && sourceSectionId === targetSectionId) {
      toast.error('Target cannot be identical to source section.');
      return;
    }

    const payload: StudentPromotionPayload[] = students.map(s => {
      const config = actionMap[s.id] || { action: 'PROMOTE', rollNumber: s.roll_number || '01' };
      return {
        student_id: s.id,
        action: config.action,
        target_session_id: targetSessionId,
        target_class_id: targetClassId,
        target_section_id: targetSectionId,
        target_roll_number: config.rollNumber
      };
    });

    setSubmitting(true);
    try {
      const res = await api.students.promote(payload);
      toast.success(`Successfully processed ${res.processedCount} students.`);
      onPromoted();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Promotion processing failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const promoteCount = Object.values(actionMap).filter(v => v.action === 'PROMOTE').length;
  const retainCount = Object.values(actionMap).filter(v => v.action === 'RETAIN').length;
  const otherCount = Object.values(actionMap).filter(v => v.action === 'GRADUATED' || v.action === 'WITHDRAWN').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Academic Rollover & Promotion"
      description="Advance students between academic sessions with grade progression and enrollment auditing"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Step 1: Mapping Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Source Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              1. Source Academic Roster
            </span>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Source Academic Session
                </label>
                <select
                  value={sourceSessionId}
                  onChange={(e) => setSourceSessionId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name} {s.is_current ? '(Current Active)' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Source Class
                  </label>
                  <select
                    value={sourceClassId}
                    onChange={(e) => setSourceClassId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Source Section
                  </label>
                  <select
                    value={sourceSectionId}
                    onChange={(e) => setSourceSectionId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {sourceSections.map(sec => (
                      <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Target Box */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3">
            <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
              <span>2. Target Academic Destination</span>
            </span>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Target Academic Session *
                </label>
                <select
                  value={targetSessionId}
                  onChange={(e) => setTargetSessionId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-indigo-200 rounded-lg bg-white"
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Target Class *
                  </label>
                  <select
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-indigo-200 rounded-lg bg-white"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Target Section *
                  </label>
                  <select
                    value={targetSectionId}
                    onChange={(e) => setTargetSectionId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-indigo-200 rounded-lg bg-white"
                  >
                    {targetSections.map(sec => (
                      <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Student List */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-600" />
                <span>Student Roster ({students.length} Enrolled)</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Choose promotion or retention per individual candidate.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSetAllAction('PROMOTE')}
                className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                Set All to Promote
              </button>
              <button
                type="button"
                onClick={() => handleSetAllAction('RETAIN')}
                className="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
              >
                Set All to Retain
              </button>
            </div>
          </div>

          {loadingStudents ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading student roster...</div>
          ) : students.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No active students found in this source class and section.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[340px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Admission No</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Current Roll</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Next Roll No</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {students.map((s) => {
                    const currentConfig = actionMap[s.id] || { action: 'PROMOTE', rollNumber: s.roll_number || '01' };
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">
                          {s.admission_number}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {s.first_name} {s.last_name}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600">
                          {s.roll_number || 'N/A'}
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={currentConfig.action}
                            onChange={(e) => {
                              setActionMap({
                                ...actionMap,
                                [s.id]: {
                                  ...currentConfig,
                                  action: e.target.value as any
                                }
                              });
                            }}
                            className={`px-2 py-1 text-xs font-semibold rounded-lg border ${
                              currentConfig.action === 'PROMOTE'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : currentConfig.action === 'RETAIN'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            <option value="PROMOTE">PROMOTE (Advance)</option>
                            <option value="RETAIN">RETAIN (Repeat)</option>
                            <option value="GRADUATED">GRADUATE (Course Complete)</option>
                            <option value="WITHDRAWN">WITHDRAWN (Left School)</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={currentConfig.rollNumber}
                            onChange={(e) => {
                              setActionMap({
                                ...actionMap,
                                [s.id]: {
                                  ...currentConfig,
                                  rollNumber: e.target.value
                                }
                              });
                            }}
                            className="w-20 px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold text-slate-700">
              Summary: <strong className="text-emerald-700">{promoteCount}</strong> to Promote,{' '}
              <strong className="text-amber-700">{retainCount}</strong> to Retain,{' '}
              <strong className="text-rose-700">{otherCount}</strong> Other
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecutePromotion}
              disabled={submitting || students.length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{submitting ? 'Processing Rollover...' : 'Execute Promotion Batch'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
