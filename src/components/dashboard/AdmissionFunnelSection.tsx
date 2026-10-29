import React from 'react';
import type { DashboardStats } from '../../types/erp.js';
import type { NavTab } from '../common/Sidebar.js';
import {
  UserPlus,
  FileText,
  FileCheck2,
  CalendarCheck,
  CheckCircle,
  GraduationCap,
  ArrowRight
} from 'lucide-react';

interface AdmissionFunnelSectionProps {
  data: DashboardStats;
  onNavigateTab: (tab: NavTab) => void;
}

export const AdmissionFunnelSection: React.FC<AdmissionFunnelSectionProps> = ({ data, onNavigateTab }) => {
  const funnel = data.admissionFunnel || {
    submitted: 0,
    underReview: 0,
    entranceTest: 0,
    interview: 0,
    selected: 0,
    admitted: 0,
    total: 0,
    conversionRate: 0
  };

  const stages = [
    {
      id: 'submitted',
      label: 'Submitted',
      count: funnel.submitted,
      icon: FileText,
      color: 'border-yellow-200 bg-yellow-50 text-yellow-800'
    },
    {
      id: 'underReview',
      label: 'Under Review',
      count: funnel.underReview,
      icon: FileCheck2,
      color: 'border-amber-200 bg-amber-50 text-amber-800'
    },
    {
      id: 'entranceTest',
      label: 'Entrance Test',
      count: funnel.entranceTest,
      icon: CalendarCheck,
      color: 'border-blue-200 bg-blue-50 text-blue-800'
    },
    {
      id: 'interview',
      label: 'Interview',
      count: funnel.interview,
      icon: UserPlus,
      color: 'border-purple-200 bg-purple-50 text-purple-800'
    },
    {
      id: 'selected',
      label: 'Selected',
      count: funnel.selected,
      icon: CheckCircle,
      color: 'border-indigo-200 bg-indigo-50 text-indigo-800'
    },
    {
      id: 'admitted',
      label: 'Admitted',
      count: funnel.admitted,
      icon: GraduationCap,
      color: 'border-emerald-200 bg-emerald-50 text-emerald-800'
    }
  ];

  return (
    <div className="bg-white rounded-2xl border border-yellow-200/90 shadow-sm p-5 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-100 text-yellow-800 flex items-center justify-center font-bold">
            <UserPlus className="w-5 h-5 text-yellow-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
                Admissions Pipeline &amp; Conversion Funnel
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-800 border border-yellow-200">
                {funnel.total} Applications Total
              </span>
            </div>
            <p className="text-xs text-slate-500">
              End-to-end prospective student applicant tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">
            Conversion Rate: <strong className="text-emerald-700">{funnel.conversionRate}%</strong>
          </span>
          <button
            onClick={() => onNavigateTab('admissions')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-yellow-900 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg transition-colors"
          >
            <span>Open Pipeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Visual Multi-Stage Pipeline */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const pct = funnel.total > 0 ? Math.round((stage.count / funnel.total) * 100) : 0;
          return (
            <div
              key={stage.id}
              className={`p-3.5 rounded-xl border flex flex-col justify-between ${stage.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {stage.label}
                </span>
                <Icon className="w-4 h-4 opacity-70" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-slate-900">{stage.count}</span>
                <span className="text-xs ml-1 font-semibold opacity-80">({pct}%)</span>
              </div>
              <div className="mt-2 text-[10px] opacity-75 font-medium">
                Stage {idx + 1} of 6
              </div>
            </div>
          );
        })}
      </div>

      {/* Funnel Progress Connector */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Prospects flow from initial submission through verification to confirmed fee enrollment</span>
        <button
          onClick={() => onNavigateTab('admissions')}
          className="text-yellow-800 font-semibold hover:underline inline-flex items-center gap-1"
        >
          Manage Applicant Dossiers <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
