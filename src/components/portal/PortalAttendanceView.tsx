import React, { useState, useEffect } from 'react';
import { ChildStudent } from './PortalCommon.js';
import { useToast } from '../common/Toast.js';
import {
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  Send,
  Filter,
  UserCheck
} from 'lucide-react';
import { PortalLeaveApplicationModal } from './PortalLeaveApplicationModal.js';

interface PortalAttendanceViewProps {
  child: ChildStudent;
}

export const PortalAttendanceView: React.FC<PortalAttendanceViewProps> = ({ child }) => {
  const { showToast } = useToast();

  const [records, setRecords] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  useEffect(() => {
    fetchAttendance();
    fetchLeaves();
  }, [child.id, selectedMonth]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/portal/attendance/${child.id}?month=${selectedMonth}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load attendance');
      setRecords(data.records || []);
    } catch (err: any) {
      showToast(err.message || 'Error loading attendance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaves = async () => {
    try {
      const res = await fetch(`/api/portal/leave-requests?studentId=${child.id}`);
      const data = await res.json();
      if (res.ok) {
        setLeaves(data.leaveRequests || []);
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
    }
  };

  // Metrics
  const presentCount = records.filter((r) => r.status === 'PRESENT').length;
  const absentCount = records.filter((r) => r.status === 'ABSENT').length;
  const lateCount = records.filter((r) => r.status === 'LATE').length;
  const leaveCount = records.filter((r) => r.status === 'ON_LEAVE').length;
  const totalDays = records.length;
  const pct = totalDays > 0 ? Math.round(((presentCount + lateCount * 0.5) / totalDays) * 100) : 95;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Action */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <CalendarIcon className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Attendance Register</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Attendance & Leave Records
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time daily presence, tardiness logs, and formal student leave application workflow.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsLeaveModalOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Student Leave</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-slate-500">Attendance Rate</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{pct}%</div>
          <span className="text-[10px] text-emerald-600 font-medium">Eligible for Term Exams</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-emerald-600">Days Present</span>
          <div className="text-2xl font-extrabold text-emerald-800 mt-1 font-mono">{presentCount}</div>
          <span className="text-[10px] text-slate-500">Recorded sessions</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-rose-600">Days Absent</span>
          <div className="text-2xl font-extrabold text-rose-800 mt-1 font-mono">{absentCount}</div>
          <span className="text-[10px] text-slate-500">Unexcused</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-amber-600">Late / Half Day</span>
          <div className="text-2xl font-extrabold text-amber-800 mt-1 font-mono">{lateCount}</div>
          <span className="text-[10px] text-slate-500">Tardy arrivals</span>
        </div>
      </div>

      {/* Filter and Attendance Roster */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-bold text-sm text-slate-900">Monthly Daily Attendance Breakdown</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Day</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Teacher Remarks / Subject Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">Loading daily attendance records...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No attendance records for the selected month.
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => {
                  const d = new Date(r.date);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        {d.toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {d.toLocaleDateString('en-US', { weekday: 'long' })}
                      </td>
                      <td className="py-3 px-4">
                        {r.status === 'PRESENT' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            Present
                          </span>
                        )}
                        {r.status === 'ABSENT' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-500" />
                            Absent
                          </span>
                        )}
                        {r.status === 'LATE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-500" />
                            Late Arrival
                          </span>
                        )}
                        {r.status === 'ON_LEAVE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            On Authorized Leave
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {r.remarks || 'Standard instructional day attendance'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leave Application History */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Student Leave Request History</h3>
            <p className="text-[11px] text-slate-500">Audit trail of formal leave applications & teacher review remarks</p>
          </div>
          <span className="text-xs font-bold text-slate-500">{leaves.length} Applications</span>
        </div>

        {leaves.length === 0 ? (
          <p className="text-xs text-slate-400 p-6 text-center bg-slate-50 rounded-xl">
            No past leave applications on record for this student.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {leaves.map((l) => (
              <div key={l.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {new Date(l.start_date).toLocaleDateString()} to {new Date(l.end_date).toLocaleDateString()} ({l.total_days} Days)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                      {l.reason_category}
                    </span>
                    {l.is_emergency && (
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                        Emergency
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">"{l.reason}"</p>
                  {l.reviewer_name && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Reviewed by {l.reviewer_name} {l.review_remarks && `— "${l.review_remarks}"`}
                    </p>
                  )}
                </div>

                <div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      l.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : l.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {l.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PortalLeaveApplicationModal
        child={child}
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onSuccess={fetchLeaves}
      />
    </div>
  );
};
