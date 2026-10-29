import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { ClassItem } from '../../types/erp.js';
import { X, Bell, Send, AlertTriangle } from 'lucide-react';

interface ClassNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  classes: ClassItem[];
}

export const ClassNoticeModal: React.FC<ClassNoticeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  schoolId,
  classes
}) => {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'STUDENTS' | 'PARENTS' | 'TEACHERS' | 'CLASS'>('ALL');
  const [classId, setClassId] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [publishDate, setPublishDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showToast('Title and content are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.classroom.publishNotice({
        schoolId,
        title: title.trim(),
        content: content.trim(),
        targetAudience,
        classId: targetAudience === 'CLASS' ? classId : undefined,
        priority,
        publishDate,
        expiryDate: expiryDate || undefined
      });

      showToast('Notice broadcasted successfully to all target recipients!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to publish notice.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Broadcast Classroom Notice</h3>
              <p className="text-xs text-slate-500">Publish urgent notices, instructions, and events</p>
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Headline *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Science Exhibition Registration, Parent-Teacher Meeting Schedule..."
              className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Details & Message *</label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Complete notice body text and instructions..."
              className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Audience</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as any)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="ALL">Entire Campus (All)</option>
                <option value="STUDENTS">All Students</option>
                <option value="PARENTS">Registered Guardians & Parents</option>
                <option value="TEACHERS">Teachers & Faculty Only</option>
                <option value="CLASS">Specific Grade / Class</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="NORMAL">Normal Announcement</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent Alert</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {targetAudience === 'CLASS' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Class *</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                <option value="">Select Class...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Publish Date</label>
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
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
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Publishing...' : 'Broadcast Notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
