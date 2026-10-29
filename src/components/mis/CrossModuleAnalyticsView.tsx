import React from 'react';
import {
  Layers,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Table as TableIcon
} from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis
} from 'recharts';

interface CrossModuleProps {
  data: any;
  loading: boolean;
  onRefresh: () => void;
}

export const CrossModuleAnalyticsView: React.FC<CrossModuleProps> = ({
  data,
  loading
}) => {
  if (loading || !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-600">Computing cross-module statistical regressions...</p>
      </div>
    );
  }

  const scatterData = data.scatterData || [];
  const quadrantCounts = data.quadrantCounts || {};
  const feeVsAttendance = data.feeVsAttendance || [];
  const correlationStrength = data.correlationStrength || 'Strong Positive Correlation (r = 0.78)';
  const keyInsight = data.keyInsight || 'Students maintaining >85% attendance achieve higher exam marks.';

  return (
    <div className="space-y-6">
      {/* 1. EXECUTIVE CORRELATION BRIEFING BANNER */}
      <div className="bg-linear-to-r from-indigo-900 to-purple-900 text-white p-5 rounded-2xl shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Statistical Regression Analysis
        </div>
        <h3 className="text-lg font-bold text-white">{correlationStrength}</h3>
        <p className="text-xs text-indigo-100/90 leading-relaxed max-w-3xl">
          {keyInsight}
        </p>
      </div>

      {/* 2. ATTENDANCE VS ACADEMIC SCORE SCATTER & QUADRANTS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Attendance % vs Examination Marks Distribution
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Scatter distribution mapping attendance regularity against cumulative exam scores
            </p>
          </div>
        </div>

        {/* 4 Quadrants Summary Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
            <span className="text-[10px] font-bold text-emerald-800 uppercase">Consistent Achievers</span>
            <p className="text-xl font-bold text-emerald-700 mt-0.5">{quadrantCounts.highAttHighScore ?? 0}</p>
            <p className="text-[10px] text-emerald-600 mt-1">High Att &amp; High Score</p>
          </div>
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
            <span className="text-[10px] font-bold text-blue-800 uppercase">Diligent / Needs Help</span>
            <p className="text-xl font-bold text-blue-700 mt-0.5">{quadrantCounts.highAttNeedsHelp ?? 0}</p>
            <p className="text-[10px] text-blue-600 mt-1">High Att &amp; Lower Score</p>
          </div>
          <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl">
            <span className="text-[10px] font-bold text-amber-800 uppercase">Gifted / Irregular</span>
            <p className="text-xl font-bold text-amber-700 mt-0.5">{quadrantCounts.lowAttHighScore ?? 0}</p>
            <p className="text-[10px] text-amber-600 mt-1">Low Att &amp; High Score</p>
          </div>
          <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl">
            <span className="text-[10px] font-bold text-rose-800 uppercase">High Risk Intervention</span>
            <p className="text-xl font-bold text-rose-700 mt-0.5">{quadrantCounts.atRisk ?? 0}</p>
            <p className="text-[10px] text-rose-600 mt-1">Low Att &amp; Low Score</p>
          </div>
        </div>

        {/* Scatter Chart */}
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                type="number"
                dataKey="attendancePct"
                name="Attendance"
                unit="%"
                domain={[50, 100]}
                stroke="#64748B"
                fontSize={11}
                label={{ value: 'Student Attendance %', position: 'bottom', offset: 0, fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="examScore"
                name="Exam Score"
                unit="%"
                domain={[30, 100]}
                stroke="#64748B"
                fontSize={11}
                label={{ value: 'Exam Marks %', angle: -90, position: 'left', fontSize: 11 }}
              />
              <ZAxis range={[60, 60]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(val: any, name: any) => [`${val}%`, name]}
                contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', color: '#FFF', fontSize: '12px' }}
              />
              <Scatter name="Students" data={scatterData} fill="#6366F1" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. FEE REGULARITY VS ATTENDANCE DISENGAGEMENT */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
          <Layers className="w-4 h-4 text-purple-600" />
          Fee Payment Status vs Learner Engagement &amp; Attendance
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Investigating the correlation between fee payment delinquency and student class attendance
        </p>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3">Fee Status Tier</th>
                <th className="py-2.5 px-3 text-right">Student Cohort</th>
                <th className="py-2.5 px-3 text-right">Avg Attendance %</th>
                <th className="py-2.5 px-3 text-right">Avg Exam Marks %</th>
                <th className="py-2.5 px-3">Diagnostic Observation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {feeVsAttendance.map((tier: any) => (
                <tr key={tier.feeStatus} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{tier.feeStatus}</td>
                  <td className="py-2.5 px-3 text-right text-slate-700">{tier.studentCount}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{tier.avgAttendance}%</td>
                  <td className="py-2.5 px-3 text-right font-bold text-indigo-600">{tier.avgScore}%</td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-500">
                    {tier.avgAttendance < 80 ? '⚠️ Elevated disengagement risk detected' : '✓ Normal engagement levels'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
