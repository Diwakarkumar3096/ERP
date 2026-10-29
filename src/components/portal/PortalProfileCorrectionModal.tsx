import React, { useState } from 'react';
import { useToast } from '../common/Toast.js';
import { ChildStudent } from './PortalCommon.js';
import { Edit3, X, AlertTriangle, FileText, CheckCircle } from 'lucide-react';

interface PortalProfileCorrectionModalProps {
  child: ChildStudent;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PortalProfileCorrectionModal: React.FC<PortalProfileCorrectionModalProps> = ({
  child,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { showToast } = useToast();

  const [fieldCategory, setFieldCategory] = useState('CONTACT');
  const [fieldName, setFieldName] = useState('Primary Mobile Number');
  const [requestedValue, setRequestedValue] = useState('+91 98350 77999');
  const [reason, setReason] = useState('Changed personal mobile carrier / SIM update.');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName || !requestedValue || !reason) {
      showToast('Please fill all required correction fields', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/portal/profile-corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: child.id,
          fieldCategory,
          fieldName,
          requestedValue,
          reason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit correction request');

      showToast(`Profile correction request #${data.requestNumber} submitted!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Error submitting request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Edit3 className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-base">Request Student Profile Correction</h3>
              <p className="text-xs text-slate-400">Official demographic change audit workflow</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900">
            <strong>Target Ward:</strong> {child.first_name} {child.last_name} (#{child.admission_number}) • Class {child.class_name}-{child.section_name}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category *
              </label>
              <select
                value={fieldCategory}
                onChange={(e) => setFieldCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="CONTACT">Contact / Mobile / Email</option>
                <option value="NAME">Name Spelling / Initials</option>
                <option value="DOB">Date of Birth</option>
                <option value="ADDRESS">Residential Address</option>
                <option value="BLOOD_GROUP">Blood Group</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Field Name *
              </label>
              <input
                type="text"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="e.g. Primary Mobile Number"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Correct / New Value Requested *
            </label>
            <input
              type="text"
              value={requestedValue}
              onChange={(e) => setRequestedValue(e.target.value)}
              placeholder="e.g. +91 98350 77999"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Official Justification / Reason *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide context or reference proof document..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <p className="text-[11px] text-slate-500">
            For critical fields such as Name and Date of Birth, the school administration office verifies against original Aadhaar or Municipal Corporation certificates before applying changes.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Correction Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
