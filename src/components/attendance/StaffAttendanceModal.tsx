import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { X, Calendar, Clock, Briefcase, AlertTriangle, User } from 'lucide-react';

interface StaffAttendanceModalProps {
  employeeId: string;
  name: string;
  employeeIdNumber: string;
  designation?: string;
  department?: string;
  onClose: () => void;
}

export const StaffAttendanceModal: React.FC<StaffAttendanceModalProps> = ({
  employeeId,
  name,
  employeeIdNumber,
  designation,
  department,
  onClose
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    summary: {
      present: number;
      absent: number;
      late: number;
      halfDay: number;
      onLeave: number;
      weeklyOff: number;
      holiday: number;
      workedDays: number;
      scheduledDays: number;
      percentage: number;
    };
    recentLogs: Array<{
      date: string;
      status: string;
      check_in_time?: string;
      check_out_time?: string;
      work_duration_minutes?: number;
      remarks?: string;
    }>;
    monthlyBreakdown: Array<{
      month_str: string;
      present: number;
      absent: number;
      late: number;
      half_day: number;
      on_leave: number;
      total_days: number;
    }>;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.attendance.getEmployeeSummary(employeeId)
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => {
        console.error('[EMPLOYEE ATTENDANCE SUMMARY FETCH ERROR]', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [employeeId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/30 flex items-center justify-center text-purple-300 font-bold">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">{name}</h3>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Emp ID: <strong className="text-slate-300 font-mono">{employeeIdNumber}</strong></span>
                {designation && <span>• {designation}</span>}
                {department && <span>• {department}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-20 bg-slate-100 rounded-xl" />
              <div className="grid grid-cols-4 gap-3">
                <div className="h-16 bg-slate-100 rounded-xl" />
                <div className="h-16 bg-slate-100 rounded-xl" />
                <div className="h-16 bg-slate-100 rounded-xl" />
                <div className="h-16 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ) : data ? (
            <>
              {/* Overall Staff Percentage */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faculty Service & Attendance</span>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className={`text-3xl font-extrabold ${data.summary.percentage >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {data.summary.percentage}%
                    </span>
                    <span className="text-xs text-slate-600">
                      ({data.summary.workedDays} days on duty out of {data.summary.scheduledDays} working days)
                    </span>
                  </div>
                  {data.summary.percentage < 80 && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium mt-2 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Below standard staff 80% duty compliance minimum.
                    </div>
                  )}
                </div>
                <div className="w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold text-sm shadow-inner shrink-0"
                     style={{
                       borderColor: data.summary.percentage >= 80 ? '#10b981' : '#f59e0b',
                       color: data.summary.percentage >= 80 ? '#047857' : '#b45309'
                     }}>
                  {data.summary.percentage}%
                </div>
              </div>

              {/* Status Breakdown Grid */}
              <div className="grid grid-cols-4 gap-2.5 text-center">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase block">Present</span>
                  <span className="text-xl font-extrabold text-emerald-700 mt-0.5 block">{data.summary.present}</span>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-rose-800 uppercase block">Absent</span>
                  <span className="text-xl font-extrabold text-rose-700 mt-0.5 block">{data.summary.absent}</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-amber-800 uppercase block">Late</span>
                  <span className="text-xl font-extrabold text-amber-700 mt-0.5 block">{data.summary.late}</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-blue-800 uppercase block">Sanctioned Leave</span>
                  <span className="text-xl font-extrabold text-blue-700 mt-0.5 block">{data.summary.onLeave}</span>
                </div>
              </div>

              {/* Recent Logs with Timestamps */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> Recent Timesheet Logs
                </h4>
                {data.recentLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-4 text-center border border-dashed rounded-xl">No attendance records found yet.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    {data.recentLogs.map((log, idx) => {
                      let badge = 'bg-slate-100 text-slate-700';
                      if (log.status === 'PRESENT') badge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                      else if (log.status === 'ABSENT') badge = 'bg-rose-100 text-rose-800 border-rose-300';
                      else if (log.status === 'LATE') badge = 'bg-amber-100 text-amber-800 border-amber-300';
                      else if (log.status === 'HALF_DAY') badge = 'bg-purple-100 text-purple-800 border-purple-300';
                      else if (log.status === 'ON_LEAVE') badge = 'bg-blue-100 text-blue-800 border-blue-300';

                      const hours = log.work_duration_minutes ? (log.work_duration_minutes / 60).toFixed(1) : null;

                      return (
                        <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-medium text-slate-700 w-24">{log.date}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge}`}>
                              {log.status}
                            </span>
                            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
                              {log.check_in_time && <span>In: {log.check_in_time}</span>}
                              {log.check_out_time && <span>Out: {log.check_out_time}</span>}
                              {hours && <span className="text-slate-400">({hours}h)</span>}
                            </div>
                          </div>
                          <div>
                            {log.remarks && <span className="text-[11px] text-slate-500 italic">{log.remarks}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">Failed to load staff attendance summary.</div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
