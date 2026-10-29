import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type {
  ClassItem,
  SectionItem,
  Subject
} from '../../types/erp.js';
import {
  X,
  BookOpen,
  Calendar,
  AlertCircle,
  FileText,
  Upload
} from 'lucide-react';

interface HomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  classes: ClassItem[];
  subjects: Subject[];
}

export const HomeworkModal: React.FC<HomeworkModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  schoolId,
  classes,
  subjects
}) => {
  const { showToast } = useToast();
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [maxMarks, setMaxMarks] = useState<number>(20);
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [instructions, setInstructions] = useState('');
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState<'PUBLISHED' | 'DRAFT'>('PUBLISHED');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentClass = classes.find((c) => c.id === classId);
  const sections = currentClass?.sections || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      showToast('Title and description are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const attachments = fileName
        ? [{ name: fileName, size: '1.2 MB', type: 'application/pdf', url: '#' }]
        : [];

      await api.classroom.createHomework({
        schoolId,
        classId,
        sectionId: sectionId || undefined,
        subjectId,
        title: title.trim(),
        description: description.trim(),
        assignedDate,
        dueDate,
        maxMarks: Number(maxMarks) || 20,
        priority,
        instructions: instructions.trim() || undefined,
        attachments,
        status
      });

      showToast(`Homework ${status === 'PUBLISHED' ? 'published' : 'saved as draft'} successfully!`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to create homework.', 'error');
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
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create Homework Assignment</h3>
              <p className="text-xs text-slate-500">Publish academic tasks and guidelines to class students</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Class *</label>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSectionId('');
                }}
                className="w-full px-2.5 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
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
                className="w-full px-2.5 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">All Sections</option>
                {sections.map((sec) => (
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
                className="w-full px-2.5 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Homework Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 4 Quadratic Formula Worksheet, Essay on Water Cycle..."
              className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Tasks *</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide explicit instructions, questions, problems, or chapter exercises to be completed..."
              className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Date *</label>
              <input
                type="date"
                value={assignedDate}
                onChange={(e) => setAssignedDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Submission Deadline (Due) *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Marks</label>
              <input
                type="number"
                min="0"
                max="100"
                value={maxMarks}
                onChange={(e) => setMaxMarks(Number(e.target.value))}
                className="w-full px-2.5 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-2.5 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-2.5 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="PUBLISHED">Publish Now</option>
                <option value="DRAFT">Save as Draft</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Attached Worksheet / File Name (Optional)</label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g. Chapter_Worksheet_Questions.pdf"
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
              {submitting ? 'Saving...' : status === 'PUBLISHED' ? 'Publish Homework' : 'Save Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
