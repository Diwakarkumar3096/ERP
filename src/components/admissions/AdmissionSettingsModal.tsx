import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import type { AdmissionSettings } from '../../types/erp.js';
import {
  X,
  Settings,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AdmissionSettingsModalProps {
  schoolId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdmissionSettingsModal: React.FC<AdmissionSettingsModalProps> = ({
  schoolId,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<AdmissionSettings>({
    id: '',
    school_id: schoolId,
    application_prefix: 'ADM',
    application_fee: 500,
    entrance_test_required: true,
    interview_required: true,
    online_admissions_open: true,
    instructions: ''
  });

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const res = await api.admissions.getSettings(schoolId);
        if (res.settings) {
          setSettings(res.settings);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load admission settings');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.admissions.updateSettings(settings);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl text-slate-100 overflow-hidden animate-fade-in">
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Admissions Policy & Numbering Config
              </h3>
              <p className="text-xs text-slate-400">
                Configure school application prefix formats and intake requirements
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading configuration...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Application Number Prefix <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. VVP-ADM or GIS-ADM"
                value={settings.application_prefix}
                onChange={e => setSettings({ ...settings, application_prefix: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono uppercase"
                required
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Format preview: <span className="font-mono text-indigo-400 font-bold">{settings.application_prefix || 'ADM'}-2026-0001</span>
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Standard Application Processing Fee (₹)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={settings.application_fee}
                onChange={e => setSettings({ ...settings, application_fee: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                required
              />
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.online_admissions_open}
                  onChange={e => setSettings({ ...settings, online_admissions_open: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-semibold text-white block">Online Public Portal Intake Open</span>
                  <span className="text-[11px] text-slate-400">Allow prospective parents to submit applications on the web portal</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.entrance_test_required}
                  onChange={e => setSettings({ ...settings, entrance_test_required: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-semibold text-white block">Entrance Examination Required</span>
                  <span className="text-[11px] text-slate-400">Enforce entrance test stage prior to final merit selection</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.interview_required}
                  onChange={e => setSettings({ ...settings, interview_required: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-semibold text-white block">Parent / Candidate Interview Required</span>
                  <span className="text-[11px] text-slate-400">Schedule interview evaluation with Principal / Admissions Committee</span>
                </div>
              </label>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Public Instructions & Guidelines
              </label>
              <textarea
                rows={3}
                placeholder="Instructions shown to parents on the public application portal..."
                value={settings.instructions || ''}
                onChange={e => setSettings({ ...settings, instructions: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25"
              >
                {saving ? 'Saving Settings...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
