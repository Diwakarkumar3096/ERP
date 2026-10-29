import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import type { AuditLog } from '../../types/erp.js';
import { Modal } from '../common/Modal.js';
import { useToast } from '../common/Toast.js';
import {
  FileText,
  Download,
  Search,
  Filter,
  Eye,
  Activity,
  Shield,
  Clock,
  Terminal
} from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const { activeSchool, availableSchools, isSuperAdmin, hasPermission } = useAuth();
  const toast = useToast();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [schoolFilter, setSchoolFilter] = useState(activeSchool?.id || '');

  // Diff inspection modal
  const [inspectingLog, setInspectingLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.audit.list({
        schoolId: schoolFilter || undefined,
        module: moduleFilter || undefined,
        action: actionFilter || undefined,
        search: search || undefined,
        limit: 100,
        offset: 0
      });
      setLogs(res.logs);
      setTotalCount(res.pagination.total);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [schoolFilter, moduleFilter, actionFilter, search, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportCsv = () => {
    const url = api.audit.exportUrl(schoolFilter || undefined);
    window.location.href = url;
    toast.success('Audit trail export initiated.');
  };

  const modules = ['AUTH', 'SCHOOLS', 'SESSIONS', 'CLASSES', 'SECTIONS', 'USERS', 'ROLES', 'SECURITY', 'SYSTEM'];
  const actions = ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'ACTIVATE_SESSION', 'CHANGE_PASSWORD', 'RESET_PASSWORD'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Security & System Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all user authentications, credential changes, data mutations, and administrative activities
          </p>
        </div>

        {hasPermission('audit.export') && (
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs shrink-0 self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Audit Trail (CSV)
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description, username, or action..."
            className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Module Filter */}
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-medium"
          >
            <option value="">All Modules</option>
            {modules.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-medium"
          >
            <option value="">All Actions</option>
            {actions.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* School Scope */}
          {isSuperAdmin && (
            <select
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-medium"
            >
              <option value="">All Campuses</option>
              {availableSchools.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recorded Events ({totalCount})
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Showing latest {logs.length} entries
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading audit events...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No audit events found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Actor / User</th>
                  <th className="px-6 py-3">Action & Module</th>
                  <th className="px-6 py-3">Event Description</th>
                  <th className="px-6 py-3">Campus</th>
                  <th className="px-6 py-3">IP Address</th>
                  <th className="px-6 py-3 text-right">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric'
                      })}{' '}
                      {new Date(log.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>

                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {log.user_name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {log.user_role}
                      </div>
                    </td>

                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                          {log.module}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-3.5 max-w-xs">
                      <p className="text-xs text-slate-800 leading-snug line-clamp-2">
                        {log.description}
                      </p>
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap">
                      {log.school_code ? (
                        <span className="font-mono text-[11px] text-slate-700 font-medium">
                          {log.school_code}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Global</span>
                      )}
                    </td>

                    <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500 tabular-nums">
                      {log.ip_address || '127.0.0.1'}
                    </td>

                    <td className="px-6 py-3.5 text-right">
                      {(log.old_values || log.new_values) ? (
                        <button
                          onClick={() => setInspectingLog(log)}
                          className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Diff</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Diff Inspector Modal */}
      <Modal
        isOpen={!!inspectingLog}
        onClose={() => setInspectingLog(null)}
        title="Audit Record Inspection"
        description={`Event ID: ${inspectingLog?.id} · Action: ${inspectingLog?.action}`}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div>
            <h4 className="font-semibold text-slate-900 mb-1">Description</h4>
            <p className="p-2.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-100 leading-relaxed">
              {inspectingLog?.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Prior State (old_values)</h4>
              <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
                {inspectingLog?.old_values
                  ? JSON.stringify(JSON.parse(inspectingLog.old_values), null, 2)
                  : 'null (Initial record creation)'}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Updated State (new_values)</h4>
              <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
                {inspectingLog?.new_values
                  ? JSON.stringify(JSON.parse(inspectingLog.new_values), null, 2)
                  : 'null'}
              </pre>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 font-mono">
            Recorded User-Agent: {inspectingLog?.user_agent || 'Unknown'}
          </div>
        </div>
      </Modal>
    </div>
  );
};
