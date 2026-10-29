import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import {
  BarChart3,
  TrendingUp,
  GraduationCap,
  CheckSquare,
  IndianRupee,
  ClipboardList,
  Bus,
  Layers,
  FileSpreadsheet,
  Clock,
  RefreshCw,
  Building2,
  Calendar,
  Download,
  Sparkles,
  Sliders
} from 'lucide-react';
import { MISTabButton } from './MISCommon.js';
import { ExecutiveMISView } from './ExecutiveMISView.js';
import { AcademicAnalyticsView } from './AcademicAnalyticsView.js';
import { AttendanceAnalyticsView } from './AttendanceAnalyticsView.js';
import { FinanceAnalyticsView } from './FinanceAnalyticsView.js';
import { AdmissionsAnalyticsView } from './AdmissionsAnalyticsView.js';
import { OperationsAnalyticsView } from './OperationsAnalyticsView.js';
import { CrossModuleAnalyticsView } from './CrossModuleAnalyticsView.js';
import { CustomReportBuilderView } from './CustomReportBuilderView.js';
import { SavedAndScheduledReportsView } from './SavedAndScheduledReportsView.js';
import { ManagementAlertsCard } from './ManagementAlertsCard.js';
import { AIInsightsCard } from './AIInsightsCard.js';

type MISTab =
  | 'executive'
  | 'academic'
  | 'attendance'
  | 'finance'
  | 'admissions'
  | 'operations'
  | 'cross_module'
  | 'report_builder'
  | 'saved_reports';

export const MISView: React.FC<{ onNavigateTab?: (tab: any) => void }> = ({
  onNavigateTab
}) => {
  const { activeSchool, availableSchools, isSuperAdmin, switchSchool } = useAuth();
  const [currentMISTab, setCurrentMISTab] = useState<MISTab>('executive');

  // School context
  const selectedSchoolId = activeSchool?.id || (isSuperAdmin ? '' : 'sch_vvps');

  // Attendance threshold state
  const [attendanceThreshold, setAttendanceThreshold] = useState<number>(75);

  // Data states
  const [executiveData, setExecutiveData] = useState<any | null>(null);
  const [academicData, setAcademicData] = useState<any | null>(null);
  const [attendanceData, setAttendanceData] = useState<any | null>(null);
  const [financeData, setFinanceData] = useState<any | null>(null);
  const [admissionsData, setAdmissionsData] = useState<any | null>(null);
  const [operationsData, setOperationsData] = useState<any | null>(null);
  const [crossModuleData, setCrossModuleData] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);

  // Fetch Current Tab Data
  const fetchData = async () => {
    setLoading(true);
    const sParam = selectedSchoolId ? `?schoolId=${selectedSchoolId}` : '';
    try {
      if (currentMISTab === 'executive') {
        const res = await fetch(`/api/mis/executive${sParam}`);
        setExecutiveData(await res.json());
      } else if (currentMISTab === 'academic') {
        const res = await fetch(`/api/mis/academic${sParam}`);
        setAcademicData(await res.json());
      } else if (currentMISTab === 'attendance') {
        const res = await fetch(`/api/mis/attendance${sParam}${sParam ? '&' : '?'}threshold=${attendanceThreshold}`);
        setAttendanceData(await res.json());
      } else if (currentMISTab === 'finance') {
        const res = await fetch(`/api/mis/finance${sParam}`);
        setFinanceData(await res.json());
      } else if (currentMISTab === 'admissions') {
        const res = await fetch(`/api/mis/admissions${sParam}`);
        setAdmissionsData(await res.json());
      } else if (currentMISTab === 'operations') {
        const res = await fetch(`/api/mis/operations${sParam}`);
        setOperationsData(await res.json());
      } else if (currentMISTab === 'cross_module') {
        const res = await fetch(`/api/mis/cross-module${sParam}`);
        setCrossModuleData(await res.json());
      }
    } catch (err) {
      console.error('[MIS FETCH ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentMISTab, selectedSchoolId, attendanceThreshold]);

  // Export CSV Helper for current view
  const handleExportCsv = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (currentMISTab === 'executive' && executiveData?.schoolComparison) {
      csvContent += 'School Name,Code,Students,Staff,Attendance Rate,Total Collected,Efficiency,Pass Rate\n';
      executiveData.schoolComparison.forEach((s: any) => {
        csvContent += `"${s.name}",${s.code},${s.studentsCount},${s.staffCount},${s.attendanceRate}%,${s.totalCollected},${s.collectionEfficiency}%,${s.passPercentage}%\n`;
      });
    } else if (currentMISTab === 'finance' && financeData?.topDefaulters) {
      csvContent += 'Admission Number,Student Name,Class,Outstanding Dues,Parent Name,Parent Mobile\n';
      financeData.topDefaulters.forEach((d: any) => {
        csvContent += `${d.admission_number},"${d.first_name} ${d.last_name}","${d.class_name}-${d.section_name}",${d.outstanding_balance},"${d.parent_name || 'Guardian'}",${d.parent_mobile || ''}\n`;
      });
    } else {
      csvContent += 'Metric,Value\nReport Export,Generated Successfully\n';
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mis_${currentMISTab}_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP HEADER WITH CAMPUS FILTER & REFRESH */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Advanced MIS Dashboard &amp; Institutional Analytics
                </h2>
                <p className="text-xs text-slate-500">
                  Comprehensive executive oversight, multi-school benchmarking, predictive drill-downs &amp; safe report generator
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Campus Selector for Super Admins */}
            {isSuperAdmin && availableSchools.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={activeSchool?.id || ''}
                  onChange={(e) => switchSchool(e.target.value)}
                  className="bg-transparent font-medium text-slate-700 focus:outline-hidden text-xs"
                >
                  <option value="">All Campuses (Consolidated)</option>
                  {availableSchools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export View
            </button>
          </div>
        </div>

        {/* 2. SUB-SECTION TAB NAVIGATION */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <MISTabButton
            id="executive"
            label="Executive MIS"
            icon={<BarChart3 className="w-4 h-4" />}
            active={currentMISTab === 'executive'}
            onClick={() => setCurrentMISTab('executive')}
          />
          <MISTabButton
            id="academic"
            label="Academic & Exams"
            icon={<GraduationCap className="w-4 h-4" />}
            active={currentMISTab === 'academic'}
            onClick={() => setCurrentMISTab('academic')}
          />
          <MISTabButton
            id="attendance"
            label="Attendance & Trends"
            icon={<CheckSquare className="w-4 h-4" />}
            active={currentMISTab === 'attendance'}
            onClick={() => setCurrentMISTab('attendance')}
          />
          <MISTabButton
            id="finance"
            label="Fees & Finance"
            icon={<IndianRupee className="w-4 h-4" />}
            active={currentMISTab === 'finance'}
            onClick={() => setCurrentMISTab('finance')}
          />
          <MISTabButton
            id="admissions"
            label="Admissions Funnel"
            icon={<ClipboardList className="w-4 h-4" />}
            active={currentMISTab === 'admissions'}
            onClick={() => setCurrentMISTab('admissions')}
          />
          <MISTabButton
            id="operations"
            label="Fleet & Facilities"
            icon={<Bus className="w-4 h-4" />}
            active={currentMISTab === 'operations'}
            onClick={() => setCurrentMISTab('operations')}
          />
          <MISTabButton
            id="cross_module"
            label="Cross Correlations"
            icon={<Layers className="w-4 h-4" />}
            active={currentMISTab === 'cross_module'}
            onClick={() => setCurrentMISTab('cross_module')}
          />
          <MISTabButton
            id="report_builder"
            label="Custom Report Builder"
            icon={<FileSpreadsheet className="w-4 h-4" />}
            active={currentMISTab === 'report_builder'}
            onClick={() => setCurrentMISTab('report_builder')}
          />
          <MISTabButton
            id="saved_reports"
            label="Saved & Scheduled"
            icon={<Clock className="w-4 h-4" />}
            active={currentMISTab === 'saved_reports'}
            onClick={() => setCurrentMISTab('saved_reports')}
          />
        </div>
      </div>

      {/* 3. MANAGEMENT PRIORITY ALERTS */}
      <ManagementAlertsCard schoolId={selectedSchoolId} onNavigateTab={onNavigateTab} />

      {/* 4. AI-POWERED EXECUTIVE BRIEFING (ON EXECUTIVE TAB) */}
      {currentMISTab === 'executive' && (
        <AIInsightsCard
          kpis={executiveData?.kpis}
          schoolComparison={executiveData?.schoolComparison || []}
          schoolId={selectedSchoolId}
        />
      )}

      {/* 5. ACTIVE SUB-VIEW RENDERER */}
      {currentMISTab === 'executive' && (
        <ExecutiveMISView
          data={executiveData}
          loading={loading}
          onRefresh={fetchData}
          onExportCsv={handleExportCsv}
        />
      )}

      {currentMISTab === 'academic' && (
        <AcademicAnalyticsView
          data={academicData}
          loading={loading}
          onRefresh={fetchData}
        />
      )}

      {currentMISTab === 'attendance' && (
        <AttendanceAnalyticsView
          data={attendanceData}
          loading={loading}
          threshold={attendanceThreshold}
          onThresholdChange={(th) => setAttendanceThreshold(th)}
          onRefresh={fetchData}
        />
      )}

      {currentMISTab === 'finance' && (
        <FinanceAnalyticsView
          data={financeData}
          loading={loading}
          onRefresh={fetchData}
          onExportCsv={handleExportCsv}
        />
      )}

      {currentMISTab === 'admissions' && (
        <AdmissionsAnalyticsView
          data={admissionsData}
          loading={loading}
          onRefresh={fetchData}
        />
      )}

      {currentMISTab === 'operations' && (
        <OperationsAnalyticsView
          data={operationsData}
          loading={loading}
          onRefresh={fetchData}
        />
      )}

      {currentMISTab === 'cross_module' && (
        <CrossModuleAnalyticsView
          data={crossModuleData}
          loading={loading}
          onRefresh={fetchData}
        />
      )}

      {currentMISTab === 'report_builder' && (
        <CustomReportBuilderView
          schoolId={selectedSchoolId}
          onRefreshSaved={() => {}}
        />
      )}

      {currentMISTab === 'saved_reports' && (
        <SavedAndScheduledReportsView schoolId={selectedSchoolId} />
      )}
    </div>
  );
};
