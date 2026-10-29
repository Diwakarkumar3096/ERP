import React from 'react';
import type { DashboardStats } from '../../types/erp.js';
import type { NavTab } from '../common/Sidebar.js';
import {
  CheckCircle2,
  XCircle,
  Clock,
  MinusCircle,
  UserCheck,
  Calendar,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface AttendanceSectionProps {
  data: DashboardStats;
  onNavigateTab: (tab: NavTab) => void;
}

export const AttendanceSection: React.FC<AttendanceSectionProps> = ({ data, onNavigateTab }) => {
  const att = data.attendanceOverview;
  const present = att?.todayPresent ?? 0;
  const absent = att?.todayAbsent ?? 0;
  const late = att?.todayLate ?? 0;
  const halfDay = att?.todayHalfDay ?? 0;
  const leave = att?.todayLeave ?? 0;
  const total = att?.todayTotal ?? (present + absent + late + halfDay + leave);
  const rate = att?.todayRate ?? (total > 0 ? Math.round(((present + late * 0.8) / total) * 100) : 0);

  const presentPct = total > 0 ? Math.round((present / total) * 100) : 0;
  const absentPct = total > 0 ? Math.round((absent / total) * 100) : 0;
  const latePct = total > 0 ? Math.round((late / total) * 100) : 0;
  const halfDayPct = total > 0 ? Math.round((halfDay / total) * 100) : 0;
  const leavePct = total > 0 ? Math.round((leave / total) * 100) : 0;

  const staffPresent = att?.staffPresent ?? 0;
  const staffAbsent = att?.staffAbsent ?? 0;
  const staffLeave = att?.staffLeave ?? 0;
  const staffTotal = staffPresent + staffAbsent + staffLeave;

  return (
    <div className="bg-white rounded-2xl border border-emerald-200/80 shadow-sm p-5 md:p-6 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
                Daily Attendance &amp; Presence Analysis
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {att?.isToday ? 'Today' : (att?.attendanceDate ? `Date: ${att.attendanceDate}` : 'Live')}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Real-time student &amp; staff attendance tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('attendance')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
          >
            <span>Open Attendance Module</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main stats breakdown */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Present */}
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Present</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-900">{present}</span>
            <span className="text-xs text-emerald-700 ml-1">({presentPct}%)</span>
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 font-medium">On-time in class</span>
        </div>

        {/* Absent */}
        <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800">Absent</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-rose-900">{absent}</span>
            <span className="text-xs text-rose-700 ml-1">({absentPct}%)</span>
          </div>
          <span className="text-[11px] text-rose-600 mt-1 font-medium">Unexcused</span>
        </div>

        {/* Late */}
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Late Arrival</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-amber-900">{late}</span>
            <span className="text-xs text-amber-700 ml-1">({latePct}%)</span>
          </div>
          <span className="text-[11px] text-amber-600 mt-1 font-medium">Marked late</span>
        </div>

        {/* Half Day */}
        <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800">Half Day</span>
            <MinusCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-blue-900">{halfDay}</span>
            <span className="text-xs text-blue-700 ml-1">({halfDayPct}%)</span>
          </div>
          <span className="text-[11px] text-blue-600 mt-1 font-medium">Session half</span>
        </div>

        {/* Leave */}
        <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-800">Approved Leave</span>
            <Calendar className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-purple-900">{leave}</span>
            <span className="text-xs text-purple-700 ml-1">({leavePct}%)</span>
          </div>
          <span className="text-[11px] text-purple-600 mt-1 font-medium">With permission</span>
        </div>

        {/* Overall Rate */}
        <div className="bg-slate-900 text-white rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Rate</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-white">{rate}%</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">{total} students marked</span>
        </div>
      </div>

      {/* Segmented bar for visual proportion */}
      {total > 0 && (
        <div className="mt-4">
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100">
            {presentPct > 0 && (
              <div
                style={{ width: `${presentPct}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Present: ${present} (${presentPct}%)`}
              />
            )}
            {latePct > 0 && (
              <div
                style={{ width: `${latePct}%` }}
                className="bg-amber-400 h-full transition-all"
                title={`Late: ${late} (${latePct}%)`}
              />
            )}
            {halfDayPct > 0 && (
              <div
                style={{ width: `${halfDayPct}%` }}
                className="bg-blue-400 h-full transition-all"
                title={`Half Day: ${halfDay} (${halfDayPct}%)`}
              />
            )}
            {leavePct > 0 && (
              <div
                style={{ width: `${leavePct}%` }}
                className="bg-purple-400 h-full transition-all"
                title={`Leave: ${leave} (${leavePct}%)`}
              />
            )}
            {absentPct > 0 && (
              <div
                style={{ width: `${absentPct}%` }}
                className="bg-rose-500 h-full transition-all"
                title={`Absent: ${absent} (${absentPct}%)`}
              />
            )}
          </div>
        </div>
      )}

      {/* Staff Attendance Pill */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <strong className="text-slate-800">Faculty &amp; Staff Attendance:</strong>
          {staffTotal > 0 ? (
            <span className="inline-flex items-center gap-2">
              <span className="text-emerald-700 font-semibold">{staffPresent} Present</span>
              <span className="text-slate-300">•</span>
              <span className="text-rose-700 font-semibold">{staffAbsent} Absent</span>
              <span className="text-slate-300">•</span>
              <span className="text-purple-700 font-semibold">{staffLeave} On Leave</span>
            </span>
          ) : (
            <span className="text-slate-400">Staff biometric sync recorded on shift schedule</span>
          )}
        </div>
        <div className="text-[11px] text-slate-400">
          Threshold rule: CBSE mandatory 75% attendance enforced
        </div>
      </div>
    </div>
  );
};
