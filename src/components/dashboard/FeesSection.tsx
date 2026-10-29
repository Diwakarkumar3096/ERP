import React, { useState } from 'react';
import type { DashboardStats, MonthlyFeeTrend } from '../../types/erp.js';
import type { NavTab } from '../common/Sidebar.js';
import {
  IndianRupee,
  TrendingUp,
  AlertCircle,
  Receipt,
  FileText,
  ArrowRight,
  CreditCard,
  Percent
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface FeesSectionProps {
  data: DashboardStats;
  onNavigateTab: (tab: NavTab) => void;
}

export const FeesSection: React.FC<FeesSectionProps> = ({ data, onNavigateTab }) => {
  const fee = data?.feeOverview;
  const trends = Array.isArray(data?.monthlyFeeTrends) ? data.monthlyFeeTrends : [];
  const [trendView, setTrendView] = useState<'monthly' | 'cumulative'>('monthly');

  const todayCollection = fee?.todayCollection ?? 0;
  const monthCollection = fee?.monthCollection ?? 0;
  const totalCollected = fee?.totalCollected ?? 0;
  const totalOutstanding = fee?.totalOutstanding ?? 0;
  const totalConcessions = fee?.totalConcessions ?? 0;
  const overdueCount = fee?.overdueCount ?? 0;
  const overdueAmount = fee?.overdueAmount ?? 0;

  // Compute cumulative series if user toggles
  let cumulativeCollected = 0;
  let cumulativeTarget = 0;
  const chartData = trends.map((t) => {
    cumulativeCollected += t.collected;
    cumulativeTarget += t.target;
    return {
      month: t.month,
      monthFull: t.monthFull,
      collected: trendView === 'monthly' ? t.collected : cumulativeCollected,
      target: trendView === 'monthly' ? t.target : cumulativeTarget,
      rate: t.rate
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-amber-200/80 shadow-sm p-5 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <IndianRupee className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
                Fees Collection &amp; Financial Ledger
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Session 2025–26
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Accounts receivable, monthly realization &amp; aging fee dues
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setTrendView('monthly')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                trendView === 'monthly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setTrendView('cumulative')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                trendView === 'cumulative' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cumulative
            </button>
          </div>

          <button
            onClick={() => onNavigateTab('fees')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
          >
            <span>Manage Fees</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Financial Stat Cards */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-4">
          <span className="text-xs font-semibold text-amber-800">This Month's Realized</span>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            ₹{monthCollection.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-amber-700 mt-1 block font-medium">
            ₹{todayCollection.toLocaleString('en-IN')} collected today
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-700">Total Outstanding</span>
          <div className="mt-1 text-2xl font-bold text-rose-600">
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Across pending installments
          </span>
        </div>

        <div className="bg-rose-50/50 border border-rose-200/80 rounded-xl p-4">
          <span className="text-xs font-semibold text-rose-800">Overdue Invoices</span>
          <div className="mt-1 text-2xl font-bold text-rose-900">
            {overdueCount} <span className="text-sm font-normal text-rose-700">dues</span>
          </div>
          <span className="text-[11px] text-rose-700 mt-1 block font-medium">
            ₹{overdueAmount.toLocaleString('en-IN')} past due date
          </span>
        </div>

        <div className="bg-indigo-50/50 border border-indigo-200/80 rounded-xl p-4">
          <span className="text-xs font-semibold text-indigo-800">Concessions / Waivers</span>
          <div className="mt-1 text-2xl font-bold text-indigo-900">
            ₹{totalConcessions.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-indigo-700 mt-1 block font-medium">
            Approved scholarships
          </span>
        </div>
      </div>

      {/* Fee Trends Recharts Area Chart */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Fee Realization Curve vs Academic Target
          </span>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Realized Fees
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Projected Target
            </span>
          </div>
        </div>

        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="feeRealizedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`}
              />
              <Tooltip
                formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                labelFormatter={(label) => `Month: ${label}`}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '12px'
                }}
              />
              <Area
                type="monotone"
                dataKey="target"
                stroke="#cbd5e1"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="none"
              />
              <Area
                type="monotone"
                dataKey="collected"
                stroke="#d97706"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#feeRealizedGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
