import React from 'react';
import type { DashboardStats } from '../../types/erp.js';
import type { NavTab } from '../common/Sidebar.js';
import {
  CalendarDays,
  MessageSquare,
  Activity,
  ArrowRight,
  Clock,
  Pin,
  Bell
} from 'lucide-react';

interface EventsAndNoticesSectionProps {
  data: DashboardStats;
  onNavigateTab: (tab: NavTab) => void;
}

export const EventsAndNoticesSection: React.FC<EventsAndNoticesSectionProps> = ({ data, onNavigateTab }) => {
  const events = Array.isArray(data?.upcomingEvents) ? data.upcomingEvents : [];
  const notices = Array.isArray(data?.recentNotices) ? data.recentNotices : [];
  const audits = Array.isArray(data?.recentActivity) ? data.recentActivity : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* 1. Upcoming Calendar Events */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 md:p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Upcoming Calendar</h3>
                <p className="text-[11px] text-slate-500">School holidays &amp; events</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('administration')}
              className="text-xs text-indigo-600 font-semibold hover:underline"
            >
              Calendar
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            {events.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No upcoming events recorded</p>
            ) : (
              events.slice(0, 4).map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-xl border border-slate-200/80 hover:border-indigo-300 transition-colors bg-slate-50/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-xs text-slate-900 line-clamp-1">
                      {evt.title}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                      {evt.event_type || 'Event'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>
                      {evt.start_date} {evt.end_date && evt.end_date !== evt.start_date ? `to ${evt.end_date}` : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={() => onNavigateTab('administration')}
            className="w-full py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors inline-flex items-center justify-center gap-1"
          >
            <span>View Full School Calendar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Notice Board & Announcements (Pink Theme) */}
      <div className="bg-white rounded-2xl border border-pink-200/90 shadow-sm p-5 md:p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
                <MessageSquare className="w-4 h-4 text-pink-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Notice Board</h3>
                <p className="text-[11px] text-slate-500">Circulars &amp; parent notices</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('communication')}
              className="text-xs text-pink-700 font-semibold hover:underline"
            >
              All Notices
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            {notices.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No notices published yet</p>
            ) : (
              notices.slice(0, 4).map((not) => (
                <div
                  key={not.id}
                  className="p-3 rounded-xl border border-pink-100 hover:border-pink-300 transition-colors bg-pink-50/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-xs text-slate-900 line-clamp-1">
                      {not.title}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-pink-100 text-pink-800 shrink-0">
                      {not.priority || 'General'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2 mt-1">
                    {not.content}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                    <span>Audience: {not.target_audience || 'All'}</span>
                    <span>{not.publish_date}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={() => onNavigateTab('communication')}
            className="w-full py-1.5 text-xs font-semibold text-pink-800 hover:text-pink-900 transition-colors inline-flex items-center justify-center gap-1"
          >
            <span>Publish Notice to Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Real-time Audit Activity */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 md:p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <Activity className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Audit Trail</h3>
                <p className="text-[11px] text-slate-500">Security &amp; user actions</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('roles')}
              className="text-xs text-slate-600 font-semibold hover:underline"
            >
              Audit Log
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            {audits.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No audit records</p>
            ) : (
              audits.slice(0, 4).map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 text-xs"
                >
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <span className="font-semibold text-slate-800">{log.user_name}</span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-1">{log.description}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                      {log.module}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{log.action}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={() => onNavigateTab('roles')}
            className="w-full py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors inline-flex items-center justify-center gap-1"
          >
            <span>Inspect Full Audit Log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
