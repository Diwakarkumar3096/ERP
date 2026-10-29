import React from 'react';
import type { DashboardStats } from '../../types/erp.js';
import type { NavTab } from '../common/Sidebar.js';
import {
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  Award,
  Users,
  UserPlus,
  ArrowRight,
  TrendingUp,
  Percent,
  Clock,
  Briefcase
} from 'lucide-react';

interface TopKpiCardsProps {
  data: DashboardStats;
  onNavigateTab: (tab: NavTab) => void;
}

export const TopKpiCards: React.FC<TopKpiCardsProps> = ({ data, onNavigateTab }) => {
  const stats = data?.stats || ({} as any);
  const att = data?.attendanceOverview;
  const fee = data?.feeOverview;
  const exam = data?.examOverview;
  const adm = data?.admissionFunnel;

  // 1. Students (Blue)
  const totalStudents = stats?.totalStudents || 0;
  const activeStudents = stats?.activeStudents || 0;
  const totalCapacity = stats?.totalStudentCapacity || 1;
  const capacityPct = Math.min(100, Math.round((activeStudents / (totalCapacity || 1)) * 100));

  // 2. Attendance (Green)
  const attRate = att?.todayRate ?? 0;
  const attPresent = att?.todayPresent ?? 0;
  const attTotal = att?.todayTotal ?? 0;
  const attDateLabel = att?.isToday ? 'Today' : (att?.attendanceDate ? `Session ${att.attendanceDate}` : 'Latest');

  // 3. Fees (Orange / Amber)
  const monthCollection = fee?.monthCollection ?? 0;
  const totalOutstanding = fee?.totalOutstanding ?? 0;
  const overdueCount = fee?.overdueCount ?? 0;

  // 4. Exams (Purple)
  const passRate = exam?.recentPerformance?.passPercentage ?? 0;
  const upcomingExamsCount = exam?.upcomingExams?.length ?? 0;

  // 5. Staff (Slate)
  const totalStaff = stats.totalStaff ?? 0;
  const teachingStaff = stats.teachingStaff ?? 0;
  const nonTeachingStaff = stats.nonTeachingStaff ?? 0;

  // 6. Admissions (Yellow/Gold)
  const totalAdm = adm?.total ?? 0;
  const pendingAdm = (adm?.submitted ?? 0) + (adm?.underReview ?? 0);
  const conversionRate = adm?.conversionRate ?? 0;

  // 7. Absence & Critical Alert (Red)
  const absentToday = att?.todayAbsent ?? 0;
  const criticalAttCount = att?.criticalAttendanceCount ?? 0;
  const highPriorityAlerts = overdueCount + (absentToday > 0 ? 1 : 0) + (criticalAttCount > 0 ? 1 : 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: 🔵 Total Students (Blue) */}
      <div
        onClick={() => onNavigateTab('students')}
        className="group relative bg-white rounded-2xl border border-blue-200/80 shadow-xs hover:shadow-md hover:border-blue-400 p-5 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/60 rounded-bl-full pointer-events-none group-hover:scale-105 transition-transform" />
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Students
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeStudents.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Active enrolled students ({totalStudents} total in system)
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
            <span>Capacity Utilized</span>
            <span className="font-semibold text-blue-700">{capacityPct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${capacityPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span>{totalCapacity} total seat capacity</span>
            <span className="text-blue-600 font-medium group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
              Directory <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: 🟢 Daily Attendance (Green) */}
      <div
        onClick={() => onNavigateTab('attendance')}
        className="group relative bg-white rounded-2xl border border-emerald-200/80 shadow-xs hover:shadow-md hover:border-emerald-400 p-5 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/60 rounded-bl-full pointer-events-none group-hover:scale-105 transition-transform" />
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Attendance ({attDateLabel})
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                {attRate}%
              </span>
              <span className="text-xs font-semibold text-emerald-600">
                {attRate >= 80 ? 'Optimal' : attRate > 0 ? 'Action Recommended' : 'Pending Today'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {attTotal > 0 ? `${attPresent} present out of ${attTotal} marked` : 'Attendance register not marked today yet'}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
            <span>Presence Rate</span>
            <span className="font-semibold text-emerald-700">{attRate}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${attRate}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span>{att?.todayAbsent || 0} absent students</span>
            <span className="text-emerald-600 font-medium group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
              Register <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Card 3: 🟠 Fees & Finance (Orange / Amber) */}
      <div
        onClick={() => onNavigateTab('fees')}
        className="group relative bg-white rounded-2xl border border-amber-200/80 shadow-xs hover:shadow-md hover:border-amber-400 p-5 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/60 rounded-bl-full pointer-events-none group-hover:scale-105 transition-transform" />
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Fees Collection
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              ₹{monthCollection.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Collected this current month
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
            <span>Outstanding Dues</span>
            <span className="font-semibold text-amber-700">₹{totalOutstanding.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span className={overdueCount > 0 ? 'text-amber-700 font-semibold' : 'text-slate-500'}>
              {overdueCount} overdue installments
            </span>
            <span className="text-amber-700 font-medium group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
              Ledger <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Card 4: 🟣 Examination & Results (Purple) */}
      <div
        onClick={() => onNavigateTab('exams')}
        className="group relative bg-white rounded-2xl border border-purple-200/80 shadow-xs hover:shadow-md hover:border-purple-400 p-5 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50/60 rounded-bl-full pointer-events-none group-hover:scale-105 transition-transform" />
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Examinations
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-100/70 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Award className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                {passRate > 0 ? `${passRate}%` : 'Scheduled'}
              </span>
              <span className="text-xs font-semibold text-purple-600">
                {passRate > 0 ? 'Pass Rate' : 'Terms Active'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {upcomingExamsCount} active examination schedules
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
            <span>Recent Exam Average</span>
            <span className="font-semibold text-purple-700">
              {exam?.recentPerformance?.averagePercentage || 0}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, exam?.recentPerformance?.averagePercentage || 0)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span>{exam?.recentPerformance?.totalResults || 0} evaluated marks</span>
            <span className="text-purple-600 font-medium group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
              View Exams <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
