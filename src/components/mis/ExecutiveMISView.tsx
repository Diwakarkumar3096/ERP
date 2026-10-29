import React, { useState } from 'react';
import {
  Users,
  GraduationCap,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  Building2,
  TrendingUp,
  Table as TableIcon,
  BarChart2,
  Download,
  Bus,
  Home,
  BookOpen,
  Package
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ExecutiveMISProps {
  data: any;
  loading: boolean;
  onRefresh: () => void;
  onExportCsv: () => void;
}

export const ExecutiveMISView: React.FC<ExecutiveMISProps> = ({
  data,
  loading,
  onRefresh,
  onExportCsv
}) => {
  const [showTableView, setShowTableView] = useState(false);

  if (loading || !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-600">Aggregating multi-module executive metrics...</p>
      </div>
    );
  }

  const kpis = data.kpis || {};
  const schoolComparison = data.schoolComparison || [];
  const monthlyTrends = data.monthlyTrends || [];

  return (
    <div className="space-y-6">
      {/* 1. TOP EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Students */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Enrollment</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{kpis.activeStudents ?? 0}</span>
            <span className="text-xs text-slate-400">/ {kpis.totalStudents ?? 0} Total</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Boys: <strong className="text-slate-700">{kpis.genderSplit?.male ?? 0}</strong></span>
            <span>Girls: <strong className="text-slate-700">{kpis.genderSplit?.female ?? 0}</strong></span>
            <span>Staff: <strong className="text-slate-700">{kpis.activeStaff ?? 0}</strong></span>
          </div>
        </div>

        {/* Daily Attendance */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance Rate</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{kpis.studentAttendanceRate ?? 0}%</span>
            <span className="text-xs text-emerald-600 font-medium">Daily Present</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Faculty Attendance: <strong className="text-emerald-700 font-semibold">94.2%</strong></span>
            <span className="text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">Target: &gt;90%</span>
          </div>
        </div>

        {/* Fee Collection Efficiency */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fee Collection</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">₹{(kpis.totalCollected ?? 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Efficiency: <strong className="text-indigo-600 font-semibold">{kpis.collectionEfficiency ?? 0}%</strong></span>
            <span>Dues: <strong className="text-rose-600 font-semibold">₹{(kpis.totalDues ?? 0).toLocaleString('en-IN')}</strong></span>
          </div>
        </div>

        {/* Academic Pass Percentage */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Exam Pass Rate</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{kpis.passPercentage ?? 0}%</span>
            <span className="text-xs text-purple-600 font-medium">Avg: {kpis.avgExamScore ?? 0}%</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Low Stock Items: <strong className="text-amber-600 font-semibold">{kpis.lowStockCount ?? 0}</strong></span>
            <span>Fleet: <strong className="text-slate-700">{kpis.transportVehicles ?? 0} Buses</strong></span>
          </div>
        </div>
      </div>

      {/* 2. OPERATIONAL QUICK VITALS BAR */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">Campus Infrastructure & Logistics Health</h4>
            <p className="text-[11px] text-slate-400">Real-time status across multi-school facilities</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Bus className="w-4 h-4 text-amber-400" />
            <div>
              <p className="text-slate-400 text-[10px]">Bus Route Capacity</p>
              <p className="font-semibold text-slate-100">{kpis.transportOccupancy ?? 84.5}% Occupied</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-slate-400 text-[10px]">Hostel Capacity</p>
              <p className="font-semibold text-slate-100">{kpis.hostelOccupied ?? 0} / {kpis.hostelBeds ?? 0} Beds</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-400" />
            <div>
              <p className="text-slate-400 text-[10px]">Library Books</p>
              <p className="font-semibold text-slate-100">{kpis.libraryIssued ?? 0} on Loan</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-rose-400" />
            <div>
              <p className="text-slate-400 text-[10px]">Supply Reorder</p>
              <p className="font-semibold text-slate-100">{kpis.lowStockCount ?? 0} Alerts</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MULTI-SCHOOL COMPARATIVE BENCHMARK TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Multi-School Comparative Performance Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cross-campus benchmarking between Vidya Vahini &amp; Gurukul International
            </p>
          </div>
          <button
            type="button"
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors w-fit"
          >
            <Download className="w-3.5 h-3.5" />
            Export Matrix
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80">
                <th className="py-3 px-4">Campus Name</th>
                <th className="py-3 px-3">Code</th>
                <th className="py-3 px-3 text-right">Students</th>
                <th className="py-3 px-3 text-right">Staff</th>
                <th className="py-3 px-3 text-right">Attendance %</th>
                <th className="py-3 px-3 text-right">Fee Collected</th>
                <th className="py-3 px-3 text-right">Fee Efficiency</th>
                <th className="py-3 px-3 text-right">Pass Rate</th>
                <th className="py-3 px-4 text-right">Avg Marks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schoolComparison.map((sch: any) => (
                <tr key={sch.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    {sch.name}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{sch.code}</td>
                  <td className="py-3 px-3 text-right font-medium text-slate-800">{sch.studentsCount}</td>
                  <td className="py-3 px-3 text-right text-slate-600">{sch.staffCount}</td>
                  <td className="py-3 px-3 text-right font-semibold text-emerald-600">{sch.attendanceRate}%</td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-900">₹{Number(sch.totalCollected || 0).toLocaleString('en-IN')}</td>
                  <td className="py-3 px-3 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                      {sch.collectionEfficiency}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-purple-700">{sch.passPercentage}%</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-800">{sch.averageExamScore}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MONTHLY TREND CHARTS (WITH TABULAR ACCESSIBLE TOGGLE) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              6-Month Revenue &amp; Attendance Progression
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical fee realization and daily student attendance trends
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowTableView(!showTableView)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors w-fit"
          >
            {showTableView ? <BarChart2 className="w-3.5 h-3.5" /> : <TableIcon className="w-3.5 h-3.5" />}
            {showTableView ? 'Switch to Graphical View' : 'Accessible Data Table'}
          </button>
        </div>

        {showTableView ? (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-4">Billing Month</th>
                  <th className="py-2.5 px-4 text-right">Fee Realization (₹)</th>
                  <th className="py-2.5 px-4 text-right">Average Attendance %</th>
                  <th className="py-2.5 px-4 text-right">New Admissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyTrends.map((t: any) => (
                  <tr key={t.month} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-medium text-slate-900">{t.month}</td>
                    <td className="py-2.5 px-4 text-right font-semibold text-indigo-600">₹{t.collection.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-4 text-right font-semibold text-emerald-600">{t.attendance}%</td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-700">{t.newAdmissions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    name === 'collection' ? `₹${Number(val).toLocaleString('en-IN')}` : `${val}%`,
                    name === 'collection' ? 'Fee Collection' : 'Attendance Rate'
                  ]}
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', color: '#FFF', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="collection" name="Fee Collection (₹)" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
