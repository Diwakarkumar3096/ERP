import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { X, Calendar, CheckCircle2, XCircle, Clock, AlertTriangle, FileText, User } from 'lucide-react';

interface StudentAttendanceModalProps {
  studentId: string;
  studentName: string;
  admissionNumber?: string;
  rollNumber?: string;
  onClose: () => void;
}

export const StudentAttendanceModal: React.FC<StudentAttendanceModalProps> = ({
  studentId,
  studentName,
  admissionNumber,
  rollNumber,
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
      attendedDays: number;
      totalRecordedDays: number;
      percentage: number;
    };
    recentLogs: Array<{
      date: string;
      status: string;
      arrival_time?: string;
      remarks?: string;
      marked_by_name?: string;
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
    api.attendance.getStudentSummary(studentId)
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => {
        console.error('[STUDENT ATTENDANCE SUMMARY FETCH ERROR]', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [studentId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">{studentName}</h3>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                {admissionNumber && <span>Adm No: <strong className="text-slate-300 font-mono">{admissionNumber}</strong></span>}
                {rollNumber && <span>• Roll: <strong className="text-slate-300 font-mono">{rollNumber}</strong></span>}
                <span>• Individual Attendance Profile</span>
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
              <div className="h-32 bg-slate-100 rounded-xl" />
            </div>
          ) : data ? (
            <>
              {/* Overall Percentage Hero Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Session Attendance</span>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className={`text-3xl font-extrabold ${data.summary.percentage >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {data.summary.percentage}%
                    </span>
                    <span className="text-xs text-slate-600">
                      ({data.summary.attendedDays} effective days out of {data.summary.totalRecordedDays} recorded school days)
                    </span>
                  </div>
                  {data.summary.percentage < 75 && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium mt-2 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Below CBSE mandatory 75% minimum attendance threshold.
                    </div>
                  )}
                </div>
                <div className="w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold text-sm shadow-inner shrink-0"
                     style={{
                       borderColor: data.summary.percentage >= 75 ? '#10b981' : '#f43f5e',
                       color: data.summary.percentage >= 75 ? '#047857' : '#be123c'
                     }}>
                  {data.summary.percentage}%
                </div>
              </div>

              {/* Status Breakdown Grid */}
              <div className="grid grid-cols-5 gap-2.5 text-center">
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
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-purple-800 uppercase block">Half Day</span>
                  <span className="text-xl font-extrabold text-purple-700 mt-0.5 block">{data.summary.halfDay}</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-blue-800 uppercase block">On Leave</span>
                  <span className="text-xl font-extrabold text-blue-700 mt-0.5 block">{data.summary.onLeave}</span>
                </div>
              </div>

              {/* Monthly Breakdown */}
              {data.monthlyBreakdown.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" /> Monthly Trends
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full">
                      <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 text-left">Month</th>
                          <th className="p-2.5 text-center">Present</th>
                          <th className="p-2.5 text-center">Absent</th>
                          <th className="p-2.5 text-center">Late</th>
                          <th className="p-2.5 text-center">Half Day</th>
                          <th className="p-2.5 text-center">Leave</th>
                          <th className="p-2.5 text-center">Attendance %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.monthlyBreakdown.map((mb, idx) => {
                          const eff = mb.present + mb.late + (mb.half_day * 0.5);
                          const pct = mb.total_days > 0 ? Math.round((eff / mb.total_days) * 100) : 0;
                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2.5 font-semibold text-slate-800">{mb.month_str}</td>
                              <td className="p-2.5 text-center text-emerald-700 font-bold">{mb.present}</td>
                              <td className="p-2.5 text-center text-rose-700 font-bold">{mb.absent}</td>
                              <td className="p-2.5 text-center text-amber-700 font-bold">{mb.late}</td>
                              <td className="p-2.5 text-center text-purple-700 font-bold">{mb.half_day}</td>
                              <td className="p-2.5 text-center text-blue-700 font-bold">{mb.on_leave}</td>
                              <td className="p-2.5 text-center font-extrabold">
                                <span className={pct >= 75 ? 'text-emerald-600' : 'text-rose-600'}>{pct}%</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recent Attendance Logs */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> Recent Attendance History
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

                      return (
                        <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-medium text-slate-700 w-24">{log.date}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge}`}>
                              {log.status}
                            </span>
                            {log.arrival_time && (
                              <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" /> {log.arrival_time}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            {log.remarks && <span className="text-[11px] text-slate-600 italic block">{log.remarks}</span>}
                            {log.marked_by_name && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">By: {log.marked_by_name}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">Failed to load attendance summary.</div>
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
