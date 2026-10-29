import React, { useState, useEffect } from 'react';
import { ChildStudent } from './PortalCommon.js';
import { useToast } from '../common/Toast.js';
import {
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Upload,
  Send,
  X,
  AlertTriangle,
  FileCheck
} from 'lucide-react';

interface PortalHomeworkViewProps {
  child: ChildStudent;
}

export const PortalHomeworkView: React.FC<PortalHomeworkViewProps> = ({ child }) => {
  const { showToast } = useToast();

  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Submission modal state
  const [activeHw, setActiveHw] = useState<any | null>(null);
  const [textContent, setTextContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [child.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hwRes, matRes] = await Promise.all([
        fetch(`/api/portal/homework/${child.id}`),
        fetch(`/api/portal/study-materials/${child.id}`)
      ]);

      const hwData = await hwRes.json();
      const matData = await matRes.json();

      setHomeworkList(hwData.homework || []);
      setMaterials(matData.materials || []);
    } catch (err: any) {
      showToast(err.message || 'Error loading homework & study resources', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubmitModal = (hw: any) => {
    setActiveHw(hw);
    setTextContent(hw.text_content || '');
    setFileName('');
  };

  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHw) return;
    if (!textContent.trim() && !fileName.trim()) {
      showToast('Please provide text response or attach a file', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/portal/homework/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeworkId: activeHw.id,
          studentId: child.id,
          textContent: textContent.trim(),
          submittedFiles: fileName ? [{ name: fileName, size: 24500 }] : []
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      showToast('Homework assignment submitted successfully!', 'success');
      setActiveHw(null);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Submission error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <BookOpen className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Curriculum Tasks</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Homework & Study Materials</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Subject tasks, teacher guidance, digital homework submission, and curriculum study notes.
          </p>
        </div>

        <div className="text-xs font-bold px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl self-start sm:self-auto">
          Class {child.class_name}-{child.section_name} Roster
        </div>
      </div>

      {/* Homework List */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Active Homework Assignments</h3>
            <p className="text-[11px] text-slate-500">Track deadlines, submission files, and teacher evaluation feedback</p>
          </div>
          <span className="text-xs font-bold text-slate-500">{homeworkList.length} Tasks</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading assignments...</div>
        ) : homeworkList.length === 0 ? (
          <p className="text-xs text-slate-400 p-8 text-center bg-slate-50 rounded-xl">
            No active homework assignments for your class.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {homeworkList.map((hw) => {
              const isSubmitted = hw.submission_status === 'SUBMITTED' || hw.submission_status === 'EVALUATED';
              return (
                <div key={hw.id} className="py-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{hw.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {hw.subject_name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{hw.description}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isSubmitted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {hw.submission_status === 'SUBMITTED' ? 'Submitted' : hw.submission_status === 'EVALUATED' ? 'Evaluated' : 'Pending Submission'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleOpenSubmitModal(hw)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap"
                      >
                        {isSubmitted ? 'View Submission' : 'Submit Homework'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span>Due: <strong>{new Date(hw.due_date).toLocaleDateString()}</strong></span>
                    <span>•</span>
                    <span>Assigned By: {hw.teacher_name || 'Class Subject Teacher'}</span>
                    {hw.grade && (
                      <>
                        <span>•</span>
                        <span className="font-bold text-emerald-700">Grade: {hw.grade} ({hw.marks_obtained} pts)</span>
                      </>
                    )}
                  </div>

                  {hw.teacher_feedback && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                      <strong>Teacher Feedback:</strong> {hw.teacher_feedback}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Study Materials Repository */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Learning Resources & Teacher Courseware</h3>
            <p className="text-[11px] text-slate-500">Official syllabus copies, revision notes, and study PDFs</p>
          </div>
          <span className="text-xs font-bold text-slate-500">{materials.length} Materials</span>
        </div>

        {materials.length === 0 ? (
          <p className="text-xs text-slate-400 p-8 text-center bg-slate-50 rounded-xl">
            No study materials uploaded for this class section yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {materials.map((mat) => (
              <div key={mat.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{mat.title}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                      {mat.subject_name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{mat.description || 'Curriculum unit study material'}</p>
                  <p className="text-[10px] text-slate-400">By {mat.teacher_name || 'Subject Teacher'}</p>
                </div>

                <a
                  href={mat.file_url || '#'}
                  download={mat.file_name || 'Study_Material.pdf'}
                  onClick={(e) => {
                    if (!mat.file_url) {
                      e.preventDefault();
                      showToast('Downloading syllabus notes...', 'info');
                    }
                  }}
                  className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-white rounded-lg border border-slate-200 transition-colors shrink-0"
                  title="Download Resource"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SUBMIT HOMEWORK MODAL */}
      {activeHw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Submit Homework Assignment</h3>
                <p className="text-xs text-slate-400">{activeHw.title} • {activeHw.subject_name}</p>
              </div>
              <button type="button" onClick={() => setActiveHw(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitHomework} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Written Answers / Text Response *
                </label>
                <textarea
                  rows={4}
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Type your response, working notes, or online submission answers..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attachment File Name / Document Upload
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="e.g. Science_Project_Report.pdf"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setFileName(`${child.first_name}_Homework_Solution.pdf`)}
                    className="px-3 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 whitespace-nowrap"
                  >
                    Attach PDF
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveHw(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Confirm Submission'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
