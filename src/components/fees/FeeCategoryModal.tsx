import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { FeeCategory, School } from '../../types/erp.js';
import {
  X,
  Tags,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface FeeCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  currentSchoolId: string;
  category?: FeeCategory | null;
  onSaved: () => void;
}

export const FeeCategoryModal: React.FC<FeeCategoryModalProps> = ({
  isOpen,
  onClose,
  schools,
  currentSchoolId,
  category,
  onSaved
}) => {
  const toast = useToast();

  const [schoolId, setSchoolId] = useState(category?.school_id || currentSchoolId);
  const [name, setName] = useState(category?.name || '');
  const [code, setCode] = useState(category?.code || '');
  const [description, setDescription] = useState(category?.description || '');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error('Category Name and Unique Code are required');
      return;
    }

    setSubmitting(true);
    try {
      if (category) {
        await api.fees.updateCategory(category.id, {
          name: name.trim(),
          description: description.trim() || undefined
        });
        toast.success('Fee category updated successfully');
      } else {
        await api.fees.createCategory({
          schoolId,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim() || undefined
        });
        toast.success('New fee category created successfully');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save fee category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <Tags className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {category ? 'Edit Fee Category' : 'Create Custom Fee Category'}
              </h3>
              <p className="text-xs text-slate-300">Classify school revenue components and heads</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">School</label>
            <select
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              disabled={!!category}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Robotics & AI Lab Fee"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Category Short Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={!!category}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. ROBO"
              className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description / Purpose</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Component billing purpose and terms..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
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
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
