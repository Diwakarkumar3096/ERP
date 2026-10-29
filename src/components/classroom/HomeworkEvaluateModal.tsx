import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { Homework, HomeworkSubmission } from '../../types/erp.js';
import {
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Award,
  Send,
  User
} from 'lucide-react';

interface HomeworkEvaluateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  homework: Homework | null;
}

export const HomeworkEvaluateModal: React.FC<HomeworkEvaluateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  homework
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [selectedSub, setSelectedSub] = useState<HomeworkSubmission | null>(null);
  const [marks, setMarks] = useState<number>(0);
  const [grade, setGrade] = useState('A1');
  const [feedback, setFeedback] = useState('');
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    if (!isOpen || !homework) return;

    setLoading(true);
    api.classroom
      .getHomeworkSubmissions(homework.id)
      .then((res) => {
        setSubmissions(res.submissions || []);
        if (res.submissions.length > 0) {
          selectSubmission(res.submissions[0]);
        }
      })
      .catch((err) => {
        showToast(err.message || 'Failed to load homework submissions.', 'error');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, homework]);

  if (!isOpen || !homework) return null;

  const selectSubmission = (sub: HomeworkSubmission) => {
    setSelectedSub(sub);
    setMarks(sub.marks_obtained !== null && sub.marks_obtained !== undefined ? Number(sub.marks_obtained) : 18);
    setGrade(sub.grade || 'A1');
    setFeedback(sub.teacher_feedback || '');
  };

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !selectedSub.submission_id) {
      showToast('No submitted work available to grade.', 'error');
      return;
    }

    setEvaluating(true);
    try {
      await api.classroom.evaluateSubmission(selectedSub.submission_id, {
        marksObtained: Number(marks),
        grade,
        teacherFeedback: feedback.trim()
      });

      showToast(`Evaluation saved for ${selectedSub.first_name} ${selectedSub.last_name}!`, 'success');

      // Update local state
      setSubmissions((prev) =>
        prev.map((s) =>
          s.student_id === selectedSub.student_id
            ? {
                ...s,
                submission_status: 'EVALUATED',
                marks_obtained: Number(marks),
                grade,
                teacher_feedback: feedback.trim()
              }
            : s
        )
      );

      setSelectedSub((prev) =>
        prev
          ? {
              ...prev,
              submission_status: 'EVALUATED',
              marks_obtained: Number(marks),
              grade,
              teacher_feedback: feedback.trim()
            }
          : null
      );

      onSuccess();
    } catch (err: any) {
      showToast(err.message || 'Failed to save evaluation.', 'error');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                {homework.subject_name}
              </span>
              <h3 className="text-base font-bold text-slate-900">{homework.title}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Due Date: {new Date(homework.due_date).toLocaleDateString()} · Max Marks: {homework.max_marks || 20}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: 2 Columns (Student Roster / Submission Details & Grading) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Left: Student List (4 cols) */}
          <div className="md:col-span-4 border-r border-slate-100 overflow-y-auto p-4 space-y-2 bg-slate-50/30">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1 mb-2">
              <span>Class Students ({submissions.length})</span>
              <span className="text-[11px] font-normal text-slate-500">
                {submissions.filter((s) => s.submission_status === 'EVALUATED').length} Graded
              </span>
            </div>

            {loading ? (
              <div className="text-center py-8 text-xs text-slate-400 animate-pulse">Loading class list...</div>
            ) : (
              submissions.map((s) => (
                <div
                  key={s.student_id}
                  onClick={() => selectSubmission(s)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedSub?.student_id === s.student_id
                      ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {s.first_name} {s.last_name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {s.admission_number}
                      </p>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        s.submission_status === 'EVALUATED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : s.submission_status === 'SUBMITTED' || s.submission_status === 'UNDER_REVIEW'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : s.submission_status === 'LATE'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {s.submission_status ? s.submission_status.replace('_', ' ') : 'PENDING'}
                    </span>
                  </div>

                  {s.marks_obtained !== null && s.marks_obtained !== undefined && (
                    <div className="mt-2 text-[11px] font-semibold text-emerald-700 flex items-center justify-between border-t border-slate-100 pt-1.5">
                      <span>Awarded Marks:</span>
                      <span className="font-mono">{s.marks_obtained} / {homework.max_marks || 20}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Right: Submission Review & Grading Form (8 cols) */}
          <div className="md:col-span-8 p-6 overflow-y-auto flex flex-col justify-between">
            {selectedSub ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {selectedSub.first_name} {selectedSub.last_name}'s Submission
                    </h4>
                    <p className="text-xs text-slate-500">
                      Roll/Adm: {selectedSub.admission_number} · Submitted on{' '}
                      {selectedSub.submission_date
                        ? new Date(selectedSub.submission_date).toLocaleString()
                        : 'Not yet recorded'}
                    </p>
                  </div>

                  {selectedSub.is_late && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-rose-50 text-rose-700 border border-rose-200">
                      Late Submission
                    </span>
                  )}
                </div>

                {/* Submitted text / remarks */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="text-xs font-semibold text-slate-700">Student Solution / Notes:</div>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedSub.text_content || 'No text note provided. Student submitted file attachment.'}
                  </p>

                  {selectedSub.student_remarks && (
                    <p className="text-[11px] text-slate-500 italic mt-2">
                      Remark: "{selectedSub.student_remarks}"
                    </p>
                  )}
                </div>

                {/* Evaluation Form */}
                <form onSubmit={handleSaveEvaluation} className="space-y-4 pt-2">
                  <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-indigo-600" />
                    Teacher Evaluation & Marks Entry
                  </h5>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Marks Awarded (Max: {homework.max_marks || 20}) *
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={Number(homework.max_marks) || 100}
                        value={marks}
                        onChange={(e) => setMarks(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Performance Grade
                      </label>
                      <select
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="A1">A1 (Outstanding / 90%+)</option>
                        <option value="A2">A2 (Excellent / 80%+)</option>
                        <option value="B1">B1 (Very Good / 70%+)</option>
                        <option value="B2">B2 (Good / 60%+)</option>
                        <option value="C1">C1 (Fair / 50%+)</option>
                        <option value="C2">C2 (Average / 40%+)</option>
                        <option value="D">D (Pass / 33%+)</option>
                        <option value="E">E (Needs Revision)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Constructive Teacher Feedback & Comments
                    </label>
                    <textarea
                      rows={3}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="e.g. Good grasp of concepts. Neatly worked out steps. Pay attention to unit units..."
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={evaluating}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {evaluating ? 'Recording Marks...' : 'Save Evaluation & Notify Student'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Select a student from the left panel to inspect their work and enter grading feedback.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
