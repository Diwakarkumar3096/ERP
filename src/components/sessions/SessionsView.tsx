import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import type { AcademicSession } from '../../types/erp.js';
import { Modal } from '../common/Modal.js';
import { useToast } from '../common/Toast.js';
import {
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  Archive,
  ArrowRight,
  Sparkles,
  Building2
} from 'lucide-react';

export const SessionsView: React.FC = () => {
  const { activeSchool, availableSchools, isSuperAdmin, hasPermission, switchSchool, refreshAuth } = useAuth();
  const toast = useToast();

  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '2027-28',
    startDate: '2027-04-01',
    endDate: '2028-03-31',
    isCurrent: false,
    status: 'upcoming' as const
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!activeSchool) {
      setSessions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.sessions.list(activeSchool.id);
      setSessions(res.sessions);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch academic sessions.');
    } finally {
      setLoading(false);
    }
  }, [activeSchool, toast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleActivate = async (sessionId: string, sessionName: string) => {
    try {
      await api.sessions.activate(sessionId);
      toast.success(`Academic session ${sessionName} is now set as the active session.`);
      fetchSessions();
      refreshAuth();
    } catch (err: any) {
      toast.error(err.message || 'Failed to activate session.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSchool) return;

    setFormLoading(true);
    try {
      await api.sessions.create({
        ...formData,
        school_id: activeSchool.id
      });
      toast.success(`Academic session ${formData.name} created.`);
      setIsAddModalOpen(false);
      fetchSessions();
      refreshAuth();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create academic session.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Academic Sessions
            </h1>
            {activeSchool && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono">
                {activeSchool.name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage institutional academic years, term transitions, and active session switches without data loss
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && availableSchools.length > 1 && (
            <select
              value={activeSchool?.id || ''}
              onChange={(e) => switchSchool(e.target.value)}
              className="text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
            >
              {availableSchools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          )}

          {hasPermission('sessions.create') && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              New Academic Session
            </button>
          )}
        </div>
      </div>

      {/* Safety Notice Card */}
      <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-xl flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong>Non-Destructive Session Architecture:</strong> Switching or creating academic sessions never deletes or overwrites existing student enrollment, fee transactions, or historical exam records. Historical data remains permanently linked to its originating session.
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Academic Sessions List
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {sessions.length} sessions defined
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading academic sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No academic sessions found for this campus.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Session Name</th>
                  <th className="px-6 py-3">Duration (Dates)</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Configured Classes</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((ses) => (
                  <tr
                    key={ses.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      ses.is_current ? 'bg-indigo-50/30 font-medium' : ''
                    }`}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-slate-900 text-sm">
                          {ses.name}
                        </span>
                        {ses.is_current && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Current Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-600">
                      {new Date(ses.start_date).toLocaleDateString()} to {new Date(ses.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                        ses.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : ses.status === 'upcoming'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {ses.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-700">
                      {ses.classes_count || 0} classes
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {ses.is_current ? (
                        <span className="text-[11px] text-emerald-700 font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Currently Active
                        </span>
                      ) : (
                        hasPermission('sessions.activate') && (
                          <button
                            onClick={() => handleActivate(ses.id, ses.name)}
                            className="px-3 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors"
                          >
                            Set as Active
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Session Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Academic Session"
        description={`Add a new academic year for ${activeSchool?.name || 'campus'}`}
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Session Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. 2026-27 or 2027-28"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isCurrent}
                onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>Set as active current session immediately upon creation</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors"
            >
              {formLoading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
