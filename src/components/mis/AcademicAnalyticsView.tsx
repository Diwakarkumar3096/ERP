import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  GraduationCap,
  TrendingUp,
  AlertCircle,
  Table as TableIcon,
  BarChart2,
  Phone,
  UserCheck
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface AcademicAnalyticsProps {
  data: any;
  loading: boolean;
  onRefresh: () => void;
}

export const AcademicAnalyticsView: React.FC<AcademicAnalyticsProps> = ({
  data,
  loading
}) => {
  const [showTableView, setShowTableView] = useState(false);

  if (loading || !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-600">Loading academic &amp; examination analytics...</p>
      </div>
    );
  }

  const classPerformance = data.classPerformance || [];
  const subjectAnalysis = data.subjectAnalysis || [];
  const gradeDistribution = data.gradeDistribution || [];
  const topAchievers = data.topAchievers || [];
  const remedialNeeded = data.remedialSupportNeeded || [];

  return (
    <div className="space-y-6">
      {/* 1. GRADE DISTRIBUTION BANDS & SUBJECT AVERAGES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CBSE Grade Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                CBSE Grade Distribution
              </h3>
              <p className="text-[11px] text-slate-500">Official standard assessment bands</p>
            </div>
            <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              289 Students
            </span>
          </div>

          <div className="space-y-2.5">
            {gradeDistribution.map((gd: any) => (
              <div key={gd.grade} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{gd.grade}</span>
                  <span className="text-slate-500">
                    <strong className="text-slate-800">{gd.count}</strong> ({gd.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${gd.percentage * 2.5}%`, backgroundColor: gd.color }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subject-Wise Mastery Radar/Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Subject-Wise Performance &amp; Faculty
              </h3>
              <p className="text-[11px] text-slate-500">Cross-departmental pass rates &amp; average scores</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Department Head / Teacher</th>
                  <th className="py-2.5 px-3 text-right">Avg Score</th>
                  <th className="py-2.5 px-3 text-right">Pass Rate</th>
                  <th className="py-2.5 px-3 text-right">Highest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjectAnalysis.map((sub: any) => (
                  <tr key={sub.subject} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{sub.subject}</td>
                    <td className="py-2.5 px-3 text-slate-600">{sub.teacher}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-indigo-600">{sub.averageScore}%</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        sub.passRate >= 95 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {sub.passRate}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-purple-700">{sub.highestScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2. CLASS-WISE PROGRESSION (CHART + ACCESSIBLE TABLE) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Class-by-Class Examination Standings
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Average academic achievement and pass rate per grade</p>
          </div>
          <button
            type="button"
            onClick={() => setShowTableView(!showTableView)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors w-fit"
          >
            {showTableView ? <BarChart2 className="w-3.5 h-3.5" /> : <TableIcon className="w-3.5 h-3.5" />}
            {showTableView ? 'Graphical View' : 'Accessible Table'}
          </button>
        </div>

        {showTableView ? (
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3 text-right">Enrolled</th>
                  <th className="py-2.5 px-3 text-right">Appeared</th>
                  <th className="py-2.5 px-3 text-right">Passed</th>
                  <th className="py-2.5 px-3 text-right">Pass Rate %</th>
                  <th className="py-2.5 px-3 text-right">Average Marks %</th>
                  <th className="py-2.5 px-3 text-right">Topper Marks %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classPerformance.map((c: any) => (
                  <tr key={c.classId} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{c.className}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{c.enrolled}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{c.appeared}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-700">{c.passed}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">{c.passRate}%</td>
                    <td className="py-2.5 px-3 text-right font-bold text-indigo-600">{c.avgPercentage}%</td>
                    <td className="py-2.5 px-3 text-right font-bold text-purple-700">{c.highestPercentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classPerformance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="className" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  formatter={(val: any, name: any) => [`${val}%`, name]}
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', color: '#FFF', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="avgPercentage" name="Average Marks %" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="passRate" name="Pass Rate %" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 3. TOPPERS & REMEDIAL INTERVENTION DUAL PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Toppers */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                Institutional Honor Roll (Top Achievers)
              </h3>
              <p className="text-[11px] text-slate-500">Students securing top academic standing</p>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Grade A1 / Distinction
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {topAchievers.map((stu: any, idx: number) => (
              <div key={stu.id || idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                    idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{stu.first_name} {stu.last_name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{stu.admission_number} • {stu.class_name}-{stu.section_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-600">{stu.percentage}%</span>
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold">{stu.grade}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Remedial Intervention Needed */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Remedial Intervention Register (&lt;40% or Failed)
              </h3>
              <p className="text-[11px] text-slate-500">Students requiring dedicated coaching &amp; parent follow-up</p>
            </div>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
              Action Required
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {remedialNeeded.map((stu: any, idx: number) => (
              <div key={stu.id || idx} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-900">{stu.first_name} {stu.last_name}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{stu.admission_number} • {stu.class_name}-{stu.section_name}</p>
                  {stu.parent_mobile && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" /> {stu.parent_mobile}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-rose-600">{stu.percentage}%</span>
                  <span className="block text-[10px] font-bold text-rose-700 uppercase">{stu.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
