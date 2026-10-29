import React, { useState } from 'react';
import type { DashboardStats } from '../../types/erp.js';
import type { NavTab } from '../common/Sidebar.js';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  ArrowRight,
  ShieldAlert,
  Filter
} from 'lucide-react';

interface AttentionCenterProps {
  alerts?: DashboardStats['attentionAlerts'];
  onNavigateTab: (tab: NavTab) => void;
}

export const AttentionCenter: React.FC<AttentionCenterProps> = ({ alerts = [], onNavigateTab }) => {
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const filteredAlerts = safeAlerts.filter((a) => {
    if (filterSeverity === 'all') return true;
    return a.severity === filterSeverity;
  });

  const criticalCount = safeAlerts.filter((a) => a.severity === 'critical').length;
  const warningCount = safeAlerts.filter((a) => a.severity === 'warning').length;
  const infoCount = safeAlerts.filter((a) => a.severity === 'info').length;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            CRITICAL
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            WARNING
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            INFO
          </span>
        );
    }
  };

  const getSeverityBorder = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-l-4 border-l-rose-500 bg-rose-50/20';
      case 'warning':
        return 'border-l-4 border-l-amber-500 bg-amber-50/20';
      case 'info':
      default:
        return 'border-l-4 border-l-blue-500 bg-blue-50/20';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
                Attention Required &amp; Action Center
              </h2>
              {criticalCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-600 text-white shadow-xs">
                  {criticalCount} Urgent
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Live priority alerts requiring administrative resolution
            </p>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterSeverity('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterSeverity === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({alerts.length})
          </button>
          {criticalCount > 0 && (
            <button
              onClick={() => setFilterSeverity('critical')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterSeverity === 'critical'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Critical ({criticalCount})
            </button>
          )}
          {warningCount > 0 && (
            <button
              onClick={() => setFilterSeverity('warning')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterSeverity === 'warning'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              Warning ({warningCount})
            </button>
          )}
          {infoCount > 0 && (
            <button
              onClick={() => setFilterSeverity('info')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterSeverity === 'info'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              Info ({infoCount})
            </button>
          )}
        </div>
      </div>

      {/* Alerts list */}
      <div className="mt-4 space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">All Operations Normal</p>
            <p className="text-xs text-slate-500 mt-0.5">
              No items requiring administrative attention under current filter.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border border-slate-200/80 transition-all hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${getSeverityBorder(
                alert.severity
              )}`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getSeverityBadge(alert.severity)}
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {alert.module}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{alert.title}</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{alert.description}</p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => onNavigateTab(alert.actionTab as NavTab)}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
                >
                  <span>{alert.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
