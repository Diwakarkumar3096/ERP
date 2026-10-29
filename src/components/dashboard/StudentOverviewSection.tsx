import React from 'react';
import type { DashboardStats } from '../../types/erp.js';
import type { NavTab } from '../common/Sidebar.js';
import {
  GraduationCap,
  Users,
  UserCheck,
  UserX,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface StudentOverviewSectionProps {
  data: DashboardStats;
  onNavigateTab: (tab: NavTab) => void;
}

export const StudentOverviewSection: React.FC<StudentOverviewSectionProps> = ({ data, onNavigateTab }) => {
  const stats = data?.stats || ({} as any);
  const demo = data?.studentDemographics || { totalMale: 0, totalFemale: 0, totalOther: 0 };
  const enrollments = Array.isArray(data?.classEnrollment) ? data.classEnrollment : [];

  const total = stats.totalStudents || 0;
  const active = stats.activeStudents || 0;
  const inactive = stats.inactiveStudents || (total - active);

  const male = demo.totalMale;
  const female = demo.totalFemale;
  const other = demo.totalOther;
  const genderTotal = male + female + other || 1;

  const malePct = Math.round((male / genderTotal) * 100);
  const femalePct = Math.round((female / genderTotal) * 100);
  const otherPct = Math.round((other / genderTotal) * 100);

  const chartData = enrollments.map((e) => ({
    name: e.class_name,
    students: e.student_count,
    capacity: e.capacity
  }));

  return (
    <div className="bg-white rounded-2xl border border-blue-200/80 shadow-sm p-5 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <GraduationCap className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
                Student Enrollment &amp; Demographics
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {active} Active
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Class distributions, section capacity &amp; gender demographics
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('students')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
        >
          <span>Student Directory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Gender Demographics Card */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Gender Distribution
            </span>
            <div className="mt-3 space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-blue-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Boys (Male)
                  </span>
                  <span className="font-bold text-slate-800">
                    {male} ({malePct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${malePct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-pink-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500" /> Girls (Female)
                  </span>
                  <span className="font-bold text-slate-800">
                    {female} ({femalePct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-pink-500 h-2 rounded-full" style={{ width: `${femalePct}%` }} />
                </div>
              </div>

              {other > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-purple-700 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Other
                    </span>
                    <span className="font-bold text-slate-800">
                      {other} ({otherPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${otherPct}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Active Status</span>
              <span className="text-base font-bold text-emerald-700">{active} Enrolled</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Inactive / Archived</span>
              <span className="text-base font-bold text-slate-600">{inactive}</span>
            </div>
          </div>
        </div>

        {/* Class-wise enrollment Bar Chart */}
        <div className="lg:col-span-2 bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Class-wise Enrolled Students vs Capacity
            </span>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Students
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Capacity
              </span>
            </div>
          </div>

          <div className="h-52 w-full pt-1">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="students" fill="#2563eb" radius={[6, 6, 0, 0]} name="Enrolled" />
                  <Bar dataKey="capacity" fill="#cbd5e1" radius={[6, 6, 0, 0]} name="Capacity" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No active classes found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
