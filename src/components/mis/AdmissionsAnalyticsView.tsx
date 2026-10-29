import React from 'react';
import {
  ClipboardList,
  TrendingUp,
  Users,
  CheckCircle2,
  ArrowRight,
  PieChart as PieIcon,
  Percent
} from 'lucide-react';

interface AdmissionsAnalyticsProps {
  data: any;
  loading: boolean;
  onRefresh: () => void;
}

export const AdmissionsAnalyticsView: React.FC<AdmissionsAnalyticsProps> = ({
  data,
  loading
}) => {
  if (loading || !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-600">Analyzing admissions pipeline &amp; applicant funnel...</p>
      </div>
    );
  }

  const funnelStages = data.funnelStages || [];
  const classDemand = data.classDemand || [];
  const categoryDistribution = data.categoryDistribution || [];
  const overallConversion = data.overallConversionRate || 51.0;

  return (
    <div className="space-y-6">
      {/* 1. INTERACTIVE ADMISSION CONVERSION FUNNEL */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-600" />
              End-to-End Admission Funnel &amp; Conversion Pipeline
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pipeline progression from initial parent inquiry to verified fee-paid enrollment
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold w-fit">
            <Percent className="w-3.5 h-3.5 text-emerald-600" />
            Overall Funnel Conversion: {overallConversion}%
          </div>
        </div>

        {/* Funnel Stage Horizontal Sequence */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {funnelStages.map((stage: any, idx: number) => (
            <div key={stage.stage} className="relative p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Step {idx + 1}</span>
                <p className="text-xs font-bold text-slate-900 mt-0.5">{stage.stage}</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">{stage.count}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                <span>Pass-through: </span>
                <strong className="text-indigo-600">{stage.conversionFromPrevious}%</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. CLASS DEMAND RATIO & SEAT OCCUPANCY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Demand */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Class-Wise Demand Ratio (Applications vs Sanctioned Seats)
          </h3>
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Class Offered</th>
                  <th className="py-2.5 px-3 text-right">Capacity</th>
                  <th className="py-2.5 px-3 text-right">Applications</th>
                  <th className="py-2.5 px-3 text-right">Enrolled</th>
                  <th className="py-2.5 px-3 text-right">Demand Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classDemand.map((cd: any) => (
                  <tr key={cd.class} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{cd.class}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{cd.capacity}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-indigo-600">{cd.applications}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{cd.enrolled}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        cd.demandRatio >= 1.2 ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {cd.demandRatio}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Social Category Demographics */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-purple-600" />
            Demographic Distribution (Social Category)
          </h3>
          <div className="space-y-4">
            {categoryDistribution.map((cat: any) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{cat.category}</span>
                  <span className="text-slate-600 font-bold">{cat.count} Students ({cat.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full"
                    style={{ width: `${cat.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
