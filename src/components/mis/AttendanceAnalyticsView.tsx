import React, { useState } from 'react';
import {
  CheckSquare,
  AlertTriangle,
  Calendar,
  Users,
  Table as TableIcon,
  BarChart2,
  Phone,
  MessageSquare,
  Filter,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface AttendanceAnalyticsProps {
  data: any;
  loading: boolean;
  threshold: number;
  onThresholdChange: (newThreshold: number) => void;
  onRefresh: () => void;
}

export const AttendanceAnalyticsView: React.FC<AttendanceAnalyticsProps> = ({
  data,
  loading,
  threshold,
  onThresholdChange
}) => {
  const [showTableView, setShowTableView] = useState(false);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<any | null>(null);

  if (loading || !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-600">Loading daily attendance trends &amp; chronic registers...</p>
      </div>
    );
  }

  const dailyTrend = data.dailyTrend || [];
  const dayOfWeekPatterns = data.dayOfWeekPatterns || [];
  const classAttendanceRanking = data.classAttendanceRanking || [];
  const chronicAbsenteeism = data.chronicAbsenteeism || [];

  return (
    <div className="space-y-6">
      {/* 1. 30-DAY ATTENDANCE TREND (CHART + ACCESSIBLE TABLE) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              30-Day Daily Attendance Trend (Students vs Faculty)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily percentage of learners and teaching staff present on campus
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowTableView(!showTableView)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors w-fit"
          >
            {showTableView ? <BarChart2 className="w-3.5 h-3.5" /> : <TableIcon className="w-3.5 h-3.5" />}
            {showTableView ? 'Switch to Line Chart' : 'Accessible Table'}
          </button>
        </div>

        {showTableView ? (
          <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-[300px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Day</th>
                  <th className="py-2.5 px-3 text-right">Student Attendance %</th>
                  <th className="py-2.5 px-3 text-right">Faculty Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyTrend.map((d: any) => (
                  <tr key={d.date} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-mono text-slate-800">{d.date}</td>
                    <td className="py-2 px-3 text-slate-600">{d.dayName}</td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-600">{d.studentAttendanceRate}%</td>
                    <td className="py-2 px-3 text-right font-semibold text-indigo-600">{d.staffAttendanceRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="displayDate" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} domain={[70, 100]} />
                <Tooltip
                  formatter={(val: any, name: any) => [`${val}%`, name]}
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', color: '#FFF', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="studentAttendanceRate"
                  name="Student Attendance %"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="staffAttendanceRate"
                  name="Faculty Attendance %"
                  stroke="#6366F1"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 2. DAY-OF-WEEK PATTERN & CLASS ATTENDANCE MATRIX */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day-of-Week Attendance Diagnosis */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Day-of-the-Week Attendance Patterns
              </h3>
              <p className="text-[11px] text-slate-500">Detecting Monday dips and weekend effects</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              6-Day Cycle
            </span>
          </div>

          <div className="space-y-3">
            {dayOfWeekPatterns.map((dow: any) => (
              <div key={dow.day} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{dow.day}</span>
                    <span className="text-[10px] text-slate-400">({dow.notes})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-700 font-bold">{dow.studentAverage}% Stu</span>
                    <span className="text-indigo-600 font-semibold">{dow.staffAverage}% Staff</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${dow.studentAverage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Class Attendance Ranking */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Class-Wise Attendance Ranking
              </h3>
              <p className="text-[11px] text-slate-500">Average student attendance rate by grade</p>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              School Average: 91.2%
            </span>
          </div>

          <div className="overflow-x-auto max-h-[260px] overflow-y-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-2 px-3">Class</th>
                  <th className="py-2 px-3 text-right">Students</th>
                  <th className="py-2 px-3 text-right">Attendance %</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classAttendanceRanking.map((cls: any) => (
                  <tr key={cls.classId} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-semibold text-slate-900">{cls.className}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{cls.studentCount}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-600">{cls.attendanceRate}%</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        cls.status === 'EXCELLENT' ? 'bg-emerald-50 text-emerald-700' : cls.status === 'SATISFACTORY' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {cls.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. CHRONIC ABSENTEEISM MONITOR (< THRESHOLD) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Chronic Absenteeism Watchlist (&lt;{threshold}% Minimum Requirement)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Identified learners at risk of CBSE board exam disqualification due to excessive absences
            </p>
          </div>

          {/* Configurable Threshold Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-medium">Cutoff Threshold:</span>
            {[70, 75, 80].map((th) => (
              <button
                key={th}
                type="button"
                onClick={() => onThresholdChange(th)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                  threshold === th
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                &lt;{th}%
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3">Student</th>
                <th className="py-2.5 px-3">Class &amp; Sec</th>
                <th className="py-2.5 px-3 text-right">Total Days</th>
                <th className="py-2.5 px-3 text-right">Present</th>
                <th className="py-2.5 px-3 text-right">Absent</th>
                <th className="py-2.5 px-3 text-right">Attendance %</th>
                <th className="py-2.5 px-3">Primary Guardian</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chronicAbsenteeism.map((stu: any) => (
                <tr key={stu.studentId} className="hover:bg-amber-50/30 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {stu.name}
                    <span className="block font-mono text-[10px] text-slate-400">{stu.admissionNumber}</span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-700">{stu.className}-{stu.sectionName}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{stu.totalWorkingDays}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">{stu.presentDays}</td>
                  <td className="py-2.5 px-3 text-right text-rose-600 font-bold">{stu.absentDays}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700">
                      {stu.attendanceRate}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="font-medium text-slate-800">{stu.parentName}</p>
                    <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {stu.parentMobile}
                    </p>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedStudentForModal(stu)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* STUDENT ATTENDANCE DRILL-DOWN MODAL */}
      {selectedStudentForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Attendance Profile &amp; Intervention</h4>
                <p className="text-xs text-slate-500 font-mono">{selectedStudentForModal.admissionNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForModal(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p className="text-slate-500 text-[11px]">Student Name</p>
                <p className="font-bold text-sm text-slate-900">{selectedStudentForModal.name}</p>
                <p className="text-slate-600">{selectedStudentForModal.className} (Section {selectedStudentForModal.sectionName})</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-emerald-50 rounded-xl">
                  <p className="text-[10px] text-emerald-600 font-semibold">PRESENT</p>
                  <p className="text-lg font-bold text-emerald-700">{selectedStudentForModal.presentDays} Days</p>
                </div>
                <div className="p-2.5 bg-rose-50 rounded-xl">
                  <p className="text-[10px] text-rose-600 font-semibold">ABSENT</p>
                  <p className="text-lg font-bold text-rose-700">{selectedStudentForModal.absentDays} Days</p>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-xl">
                  <p className="text-[10px] text-amber-600 font-semibold">RATIO</p>
                  <p className="text-lg font-bold text-amber-700">{selectedStudentForModal.attendanceRate}%</p>
                </div>
              </div>

              <div className="p-3 border border-slate-200 rounded-xl space-y-1.5">
                <p className="font-semibold text-slate-800">Guardian Contact Information</p>
                <p className="text-slate-600">Parent: {selectedStudentForModal.parentName}</p>
                <p className="text-slate-600">Mobile: {selectedStudentForModal.parentMobile}</p>
                <p className="text-[11px] text-amber-700 font-medium">⚠️ Consecutive Absences: {selectedStudentForModal.consecutiveDaysAbsent} days</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  alert(`Intervention notice dispatched to ${selectedStudentForModal.parentMobile}`);
                  setSelectedStudentForModal(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
              >
                Send SMS &amp; Notice
              </button>
              <button
                type="button"
                onClick={() => setSelectedStudentForModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
