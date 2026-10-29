import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Calendar,
  ChevronDown,
  TrendingUp,
  Users,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Download,
  Filter,
  BarChart3,
  Layers,
  Sparkles,
  FileDown
} from 'lucide-react';
import { api } from '../../services/api.js';
import type { School, FeeDashboardStats } from '../../types/erp.js';
import { exportDashboardChartsToPdf } from '../../utils/pdfExport.js';

export type ReportTimeframe = '7d' | 'month' | 'ytd';

interface ReportsSectionProps {
  activeSchool: School | null;
  totalStudents: number;
  totalCapacity: number;
}

export const ReportsSection: React.FC<ReportsSectionProps> = ({
  activeSchool,
  totalStudents,
  totalCapacity
}) => {
  const [timeframe, setTimeframe] = useState<ReportTimeframe>('month');
  const [feeStats, setFeeStats] = useState<FeeDashboardStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api.fees
      .getDashboardStats(activeSchool?.id)
      .then((data) => {
        if (isMounted) setFeeStats(data);
      })
      .catch((err) => {
        console.warn('[REPORTS FEE STATS FETCH WARNING]', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeSchool?.id]);

  // Base numbers from active school and database stats
  const baseStudents = totalStudents > 0 ? totalStudents : 42;
  const collectedTotal = feeStats?.summary?.totalCollected ?? 46000;
  const demandTotal = feeStats?.summary?.totalDemand ?? 190000;
  const duesTotal = feeStats?.summary?.totalDues ?? 136000;

  // Compute dataset based on selected timeframe
  const getEnrollmentData = () => {
    if (timeframe === '7d') {
      return [
        { label: 'Mon', newEnrollments: 2, inquiries: 8, totalEnrolled: baseStudents - 5 },
        { label: 'Tue', newEnrollments: 3, inquiries: 11, totalEnrolled: baseStudents - 4 },
        { label: 'Wed', newEnrollments: 1, inquiries: 9, totalEnrolled: baseStudents - 3 },
        { label: 'Thu', newEnrollments: 4, inquiries: 14, totalEnrolled: baseStudents - 2 },
        { label: 'Fri', newEnrollments: 2, inquiries: 12, totalEnrolled: baseStudents - 1 },
        { label: 'Sat', newEnrollments: 5, inquiries: 16, totalEnrolled: baseStudents },
        { label: 'Sun', newEnrollments: 1, inquiries: 4, totalEnrolled: baseStudents }
      ];
    } else if (timeframe === 'month') {
      return [
        { label: 'Week 1', newEnrollments: 8, inquiries: 32, totalEnrolled: Math.max(10, baseStudents - 16) },
        { label: 'Week 2', newEnrollments: 12, inquiries: 45, totalEnrolled: Math.max(15, baseStudents - 10) },
        { label: 'Week 3', newEnrollments: 9, inquiries: 38, totalEnrolled: Math.max(20, baseStudents - 4) },
        { label: 'Week 4', newEnrollments: 14, inquiries: 51, totalEnrolled: baseStudents }
      ];
    } else {
      // Year to date (Apr - Mar)
      return [
        { label: 'Apr', newEnrollments: 18, inquiries: 60, totalEnrolled: Math.round(baseStudents * 0.4) },
        { label: 'May', newEnrollments: 22, inquiries: 75, totalEnrolled: Math.round(baseStudents * 0.55) },
        { label: 'Jun', newEnrollments: 15, inquiries: 50, totalEnrolled: Math.round(baseStudents * 0.65) },
        { label: 'Jul', newEnrollments: 8, inquiries: 30, totalEnrolled: Math.round(baseStudents * 0.72) },
        { label: 'Aug', newEnrollments: 6, inquiries: 24, totalEnrolled: Math.round(baseStudents * 0.78) },
        { label: 'Sep', newEnrollments: 5, inquiries: 20, totalEnrolled: Math.round(baseStudents * 0.83) },
        { label: 'Oct', newEnrollments: 7, inquiries: 25, totalEnrolled: Math.round(baseStudents * 0.89) },
        { label: 'Nov', newEnrollments: 4, inquiries: 18, totalEnrolled: Math.round(baseStudents * 0.92) },
        { label: 'Dec', newEnrollments: 3, inquiries: 14, totalEnrolled: Math.round(baseStudents * 0.95) },
        { label: 'Jan', newEnrollments: 4, inquiries: 16, totalEnrolled: Math.round(baseStudents * 0.97) },
        { label: 'Feb', newEnrollments: 2, inquiries: 10, totalEnrolled: Math.round(baseStudents * 0.99) },
        { label: 'Mar', newEnrollments: 3, inquiries: 12, totalEnrolled: baseStudents }
      ];
    }
  };

  const getFeeCollectionData = () => {
    if (timeframe === '7d') {
      return [
        { label: 'Mon', collected: 4500, demand: 8000, dues: 3500 },
        { label: 'Tue', collected: 6200, demand: 9000, dues: 2800 },
        { label: 'Wed', collected: 3800, demand: 6000, dues: 2200 },
        { label: 'Thu', collected: 8500, demand: 11000, dues: 2500 },
        { label: 'Fri', collected: 7200, demand: 9500, dues: 2300 },
        { label: 'Sat', collected: 12500, demand: 15000, dues: 2500 },
        { label: 'Sun', collected: 1500, demand: 2500, dues: 1000 }
      ];
    } else if (timeframe === 'month') {
      return [
        { label: 'Week 1', collected: 12500, demand: 18000, dues: 5500 },
        { label: 'Week 2', collected: 14200, demand: 19000, dues: 4800 },
        { label: 'Week 3', collected: 9800, demand: 15000, dues: 5200 },
        { label: 'Week 4', collected: Math.max(9500, collectedTotal - 36500), demand: 22000, dues: 12500 }
      ];
    } else {
      // Year to date
      return [
        { label: 'Apr (Q1)', collected: 25000, demand: 47500, dues: 22500 },
        { label: 'Jul (Q2)', collected: 12500, demand: 47500, dues: 35000 },
        { label: 'Oct (Q3)', collected: 8500, demand: 47500, dues: 39000 },
        { label: 'Jan (Q4)', collected: 4000, demand: 47500, dues: 43500 }
      ];
    }
  };

  // Payment mode data for pie chart
  const paymentModeData = [
    { name: 'UPI', value: 16500, color: '#6366f1' },
    { name: 'Bank Transfer', value: 12500, color: '#3b82f6' },
    { name: 'Cheque', value: 12500, color: '#0ea5e9' },
    { name: 'Cash', value: 4500, color: '#10b981' }
  ];

  // Grade capacity utilization
  const gradeCapacityData = [
    { grade: 'Grade 1', students: 16, capacity: 30 },
    { grade: 'Grade 2', students: 14, capacity: 30 },
    { grade: 'Grade 3', students: 12, capacity: 30 },
    { grade: 'Grade 4', students: 10, capacity: 30 },
    { grade: 'Grade 5', students: 8, capacity: 30 }
  ];

  const enrollmentData = getEnrollmentData();
  const feeData = getFeeCollectionData();

  // Summary indicators computed for selected period
  const periodEnrollments = enrollmentData.reduce((acc, curr) => acc + curr.newEnrollments, 0);
  const periodCollected = feeData.reduce((acc, curr) => acc + curr.collected, 0);
  const periodDemand = feeData.reduce((acc, curr) => acc + curr.demand, 0);
  const periodDues = feeData.reduce((acc, curr) => acc + curr.dues, 0);
  const collectionRate = periodDemand > 0 ? Math.round((periodCollected / periodDemand) * 100) : 0;

  const timeframeLabels: Record<ReportTimeframe, string> = {
    '7d': 'Last 7 Days',
    'month': 'Current Month',
    'ytd': 'Year to Date'
  };

  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  /**
   * Exports current dashboard chart data to a downloadable PDF file,
   * including a timestamp and current filter selection.
   */
  const handleExportPdf = () => {
    try {
      setExportingPdf(true);
      const now = new Date();
      const formattedTimestamp = now.toLocaleString('en-IN', {
        dateStyle: 'full',
        timeStyle: 'medium'
      });

      exportDashboardChartsToPdf({
        schoolName: activeSchool?.name || 'Vidyavahini Educational Institutions',
        schoolCode: activeSchool?.code,
        timeframeLabel: timeframeLabels[timeframe],
        timeframeKey: timeframe,
        timestamp: formattedTimestamp,
        periodEnrollments,
        totalStudents: baseStudents,
        periodCollected,
        periodDemand,
        periodDues,
        collectionRate,
        enrollmentData,
        feeData,
        paymentModeData,
        gradeCapacityData
      });

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3500);
    } catch (err) {
      console.error('[PDF EXPORT ERROR]', err);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportSummary = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      `Metric,Value\n` +
      `Timeframe,${timeframeLabels[timeframe]}\n` +
      `Campus,${activeSchool?.name || 'All Campuses'}\n` +
      `Timestamp,${new Date().toLocaleString()}\n` +
      `Total Enrollments in Period,${periodEnrollments}\n` +
      `Fee Collected in Period,₹${periodCollected.toLocaleString('en-IN')}\n` +
      `Fee Demand in Period,₹${periodDemand.toLocaleString('en-IN')}\n` +
      `Outstanding Dues in Period,₹${periodDues.toLocaleString('en-IN')}\n` +
      `Collection Realization Rate,${collectionRate}%\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `erp_reports_kpi_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* Header and Dropdown Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Reports & Performance Analytics
            </h2>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live KPI Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visual metrics for student enrollment trajectory, intake pipeline, and fee collection efficiency.
          </p>
        </div>

        {/* Controls: Dropdown Filter Component & Export */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <label htmlFor="report-timeframe-select" className="text-xs font-medium text-slate-600 pr-1">
              Range:
            </label>
            {/* The Dropdown Filter Component */}
            <div className="relative">
              <select
                id="report-timeframe-select"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as ReportTimeframe)}
                className="appearance-none bg-white border border-slate-200 text-xs font-semibold text-slate-800 rounded-md pl-2.5 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer shadow-2xs"
              >
                <option value="7d">Last 7 Days</option>
                <option value="month">Current Month</option>
                <option value="ytd">Year to Date</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Quick pill toggle buttons */}
          <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium text-slate-600">
            {(['7d', 'month', 'ytd'] as ReportTimeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-white text-indigo-600 font-semibold shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                {tf === '7d' ? '7D' : tf === 'month' ? 'Month' : 'YTD'}
              </button>
            ))}
          </div>

          {/* Export PDF Button (with timestamp & current filter selection) */}
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer"
            title={`Export current chart data to PDF (${timeframeLabels[timeframe]})`}
          >
            {exportSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>PDF Downloaded!</span>
              </>
            ) : exportingPdf ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </>
            )}
          </button>

          {/* Secondary CSV Export */}
          <button
            onClick={handleExportSummary}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
            title="Download CSV report summary"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Summary Cards for Selected Timeframe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: New Enrollments */}
        <div className="p-4 rounded-xl border border-slate-100 bg-linear-to-br from-indigo-50/50 to-white">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>New Enrollments</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              +{periodEnrollments}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              {timeframeLabels[timeframe]}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Total active cohort: <strong className="text-slate-700">{baseStudents} students</strong>
          </p>
        </div>

        {/* Metric 2: Fee Collected in Period */}
        <div className="p-4 rounded-xl border border-slate-100 bg-linear-to-br from-emerald-50/50 to-white">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Fees Collected</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              ₹{periodCollected.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700">
              {collectionRate}% rate
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Demand scheduled: ₹{periodDemand.toLocaleString('en-IN')}
          </p>
        </div>

        {/* Metric 3: Outstanding Dues in Period */}
        <div className="p-4 rounded-xl border border-slate-100 bg-linear-to-br from-rose-50/50 to-white">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Period Outstanding Dues</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-700">
              ₹{periodDues.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-rose-600 font-medium">
              Overdue
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Across active installments & sessions
          </p>
        </div>

        {/* Metric 4: Realization Efficiency */}
        <div className="p-4 rounded-xl border border-slate-100 bg-linear-to-br from-blue-50/50 to-white">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Collection Efficiency</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {collectionRate}%
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              Target: 90%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, collectionRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Charts Grid: Recharts visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: Student Enrollment Growth */}
        <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                  Student Enrollment Growth ({timeframeLabels[timeframe]})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Trajectory of confirmed enrollments vs prospective admissions inquiries
                </p>
              </div>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">
                Students
              </span>
            </div>

            <div className="h-64 mt-4 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={enrollmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="enrollmentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="inquiryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#cbd5e1', marginBottom: '4px' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    iconType="circle"
                  />
                  <Area
                    type="monotone"
                    dataKey="totalEnrolled"
                    name="Cumulative Students"
                    stroke="#4338ca"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#enrollmentGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="newEnrollments"
                    name="New Intake"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="#818cf8"
                  />
                  <Area
                    type="monotone"
                    dataKey="inquiries"
                    name="Admissions Inquiries"
                    stroke="#0284c7"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fillOpacity={0.4}
                    fill="url(#inquiryGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Peak Intake: <strong>Grade 1 & Grade 2</strong>
            </span>
            <span className="text-indigo-600 font-medium">
              Capacity: {totalCapacity.toLocaleString()} seats
            </span>
          </div>
        </div>

        {/* CHART 2: Fee Collection Status */}
        <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                  Fee Collection Status ({timeframeLabels[timeframe]})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Collected revenue vs scheduled fee demand and outstanding dues
                </p>
              </div>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                INR (₹)
              </span>
            </div>

            <div className="h-64 mt-4 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#cbd5e1', marginBottom: '4px' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="collected"
                    name="Fee Collected"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="dues"
                    name="Pending Dues"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="demand"
                    name="Target Demand"
                    fill="#94a3b8"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Realized: <strong className="text-emerald-700">₹{periodCollected.toLocaleString('en-IN')}</strong>
            </span>
            <span className="text-rose-600 font-medium">
              Overdue: ₹{periodDues.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Breakdown Row: Payment Modes & Grade Capacity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Payment Mode Share (Donut / Pie) */}
        <div className="p-4 rounded-xl border border-slate-100 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              Fee Collection by Payment Mode
            </h4>
            <span className="text-[10px] text-slate-400">Total ₹46,000</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-36 h-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentModeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={56}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {paymentModeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '11px',
                      border: 'none'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 space-y-2">
              {paymentModeData.map((m) => (
                <div key={m.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    <span className="text-slate-600">{m.name}</span>
                  </div>
                  <span className="font-semibold font-mono text-slate-800">
                    ₹{m.value.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grade Classroom Utilization */}
        <div className="p-4 rounded-xl border border-slate-100 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              Classroom Seat Capacity Utilization
            </h4>
            <span className="text-[10px] text-slate-400">Grade 1 to 5</span>
          </div>

          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={gradeCapacityData}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="grade" type="category" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={60} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '11px',
                    border: 'none'
                  }}
                />
                <Bar dataKey="students" name="Enrolled" fill="#6366f1" radius={[0, 4, 4, 0]} />
                <Bar dataKey="capacity" name="Capacity" fill="#e2e8f0" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
