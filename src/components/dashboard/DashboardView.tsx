import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import type { DashboardStats } from '../../types/erp.js';
import type { NavTab } from '../common/Sidebar.js';
import { DashboardHeader } from './DashboardHeader.js';
import { TopKpiCards } from './TopKpiCards.js';
import { AttentionCenter } from './AttentionCenter.js';
import { AttendanceSection } from './AttendanceSection.js';
import { FeesSection } from './FeesSection.js';
import { StudentOverviewSection } from './StudentOverviewSection.js';
import { ExamResultsSection } from './ExamResultsSection.js';
import { AdmissionFunnelSection } from './AdmissionFunnelSection.js';
import { AcademicOverviewSection } from './AcademicOverviewSection.js';
import { ModuleGridSection } from './ModuleGridSection.js';
import { EventsAndNoticesSection } from './EventsAndNoticesSection.js';
import { ReportsSection } from './ReportsSection.js';
import { RefreshCw } from 'lucide-react';

interface DashboardViewProps {
  onNavigateTab: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab }) => {
  const { activeSchool } = useAuth();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await api.dashboard.stats(activeSchool?.id);
      setData(res);
    } catch (err: any) {
      console.error('[DASHBOARD STATS FETCH ERROR]', err);
      setError(err.message || 'Failed to load live dashboard statistics.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, [activeSchool?.id]);

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="h-28 bg-slate-200 rounded-2xl" />
        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-40 bg-slate-200 rounded-2xl" />
          <div className="h-40 bg-slate-200 rounded-2xl" />
          <div className="h-40 bg-slate-200 rounded-2xl" />
          <div className="h-40 bg-slate-200 rounded-2xl" />
        </div>
        {/* Module Section Skeleton */}
        <div className="h-72 bg-slate-200 rounded-2xl" />
        <div className="h-80 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
        <h3 className="text-base font-bold text-rose-800">Unable to load dashboard</h3>
        <p className="text-xs text-rose-600">{error}</p>
        <button
          onClick={() => fetchDashboardData()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with greeting, real user photo/name, active school, academic session & quick actions */}
      <DashboardHeader
        onNavigateTab={onNavigateTab}
        schools={data.schools}
      />

      {/* 2. Top Summary KPI Cards (Students 🔵, Attendance 🟢, Fees 🟠, Exams 🟣) */}
      <TopKpiCards
        data={data}
        onNavigateTab={onNavigateTab}
      />

      {/* 3. Action Center & Attention Required (Critical 🔴, Warning 🟠, Info 🔵) */}
      <AttentionCenter
        alerts={data.attentionAlerts}
        onNavigateTab={onNavigateTab}
      />

      {/* 4. Attendance Breakdown Section (🟢 Green Theme) */}
      <AttendanceSection
        data={data}
        onNavigateTab={onNavigateTab}
      />

      {/* 5. Fees & Financial Health (🟠 Amber/Orange Theme) */}
      <FeesSection
        data={data}
        onNavigateTab={onNavigateTab}
      />

      {/* 6. Student Distribution & Demographics (🔵 Blue Theme) */}
      <StudentOverviewSection
        data={data}
        onNavigateTab={onNavigateTab}
      />

      {/* 7. Examination & Results (🟣 Purple Theme) */}
      <ExamResultsSection
        data={data}
        onNavigateTab={onNavigateTab}
      />

      {/* 8. Admissions Pipeline & Funnel (🟡 Yellow/Gold Theme) */}
      <AdmissionFunnelSection
        data={data}
        onNavigateTab={onNavigateTab}
      />

      {/* 9. Academics, Curriculum & LMS (🟦 Indigo Theme) */}
      <AcademicOverviewSection
        data={data}
        onNavigateTab={onNavigateTab}
      />

      {/* 10. Complete 12-Module Color Matrix Grid */}
      <ModuleGridSection
        data={data}
        onNavigateTab={onNavigateTab}
      />

      {/* 11. School Calendar Events, Notices (🩷 Pink Theme) & Live Security Audit Trail */}
      <EventsAndNoticesSection
        data={data}
        onNavigateTab={onNavigateTab}
      />

      {/* 12. Standard Reports Generation & PDF Exports Section */}
      <ReportsSection
        activeSchool={activeSchool}
        totalStudents={data.stats?.totalStudents || 0}
        totalCapacity={data.stats?.totalStudentCapacity || 0}
      />
    </div>
  );
};
