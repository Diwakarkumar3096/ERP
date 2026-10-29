import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { Homework } from '../../types/erp.js';
import {
  X,
  Upload,
  Send,
  AlertTriangle,
  Clock,
  FileCheck
} from 'lucide-react';

interface HomeworkSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  homework: Homework | null;
  studentId: string;
  studentName: string;
}

export const HomeworkSubmitModal: React.FC<HomeworkSubmitModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  homework,
  studentId,
  studentName
}) => {
  const { showToast } = useToast();
  const [textContent, setTextContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [studentRemarks, setStudentRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !homework) return null;

  const now = new Date();
  const dueDate = new Date(homework.due_date);
  const isLate = now > dueDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!textContent.trim() && !fileName.trim()) {
      showToast('Please provide your solution text or attach your completed assignment file.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const submittedFiles = fileName
        ? [{ name: fileName.trim(), size: '1.8 MB', type: 'application/pdf', uploadedAt: new Date().toISOString() }]
        : [];

      const res = await api.classroom.submitHomework(homework.id, {
        studentId,
        textContent: textContent.trim(),
        submittedFiles,
        studentRemarks: studentRemarks.trim() || undefined
      });

      showToast(res.message, res.status === 'LATE' ? 'warning' : 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit homework.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Submit Homework Assignment</h3>
              <p className="text-xs text-slate-500">{homework.subject_name} · {homework.title}</p>
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
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Submitting as:</span>
              <span className="font-semibold text-slate-800">{studentName}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-slate-500">Official Deadline:</span>
              <span className="font-mono text-slate-800">{new Date(homework.due_date).toLocaleDateString()}</span>
            </div>
          </div>

          {isLate && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Deadline Passed:</strong> This assignment was due on{' '}
                {new Date(homework.due_date).toLocaleDateString()}. Your submission will be recorded and marked as{' '}
                <span className="underline font-bold">Late Submission</span>.
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Your Written Solution / Answer Text
            </label>
            <textarea
              rows={4}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Type your essay, mathematical answers, or computational notes here..."
              className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Attached Document / PDF / Photo
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g. KabirDas_Chapter4_Solutions.pdf"
                className="flex-1 px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              <button
                type="button"
                onClick={() => setFileName(`${studentName.replace(/\s+/g, '_')}_Assignment.pdf`)}
                className="px-3 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                Auto Attach
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remarks for Subject Teacher (Optional)
            </label>
            <input
              type="text"
              value={studentRemarks}
              onChange={(e) => setStudentRemarks(e.target.value)}
              placeholder="e.g. Please check Question 12 calculation specifically..."
              className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
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
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Submitting...' : isLate ? 'Submit (Late)' : 'Submit Homework'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
