import React, { useState } from 'react';
import {
  IndianRupee,
  Clock,
  CreditCard,
  Layers,
  AlertCircle,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Table as TableIcon,
  BarChart2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface FinanceAnalyticsProps {
  data: any;
  loading: boolean;
  onRefresh: () => void;
  onExportCsv: () => void;
}

export const FinanceAnalyticsView: React.FC<FinanceAnalyticsProps> = ({
  data,
  loading,
  onRefresh,
  onExportCsv
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showTableView, setShowTableView] = useState(false);

  if (loading || !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-600">Reconciling financial ledgers &amp; aging buckets...</p>
      </div>
    );
  }

  const summary = data.summary || {};
  const agingBuckets = data.agingBuckets || [];
  const paymentModes = data.paymentModes || [];
  const headWiseCollection = data.headWiseCollection || [];
  const concessionAnalytics = data.concessionAnalytics || [];
  const topDefaulters = data.topDefaulters || [];

  const filteredDefaulters = topDefaulters.filter((d: any) =>
    `${d.first_name} ${d.last_name} ${d.admission_number} ${d.class_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const PIE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#3B82F6'];

  return (
    <div className="space-y-6">
      {/* 1. FINANCIAL SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Fee Demand</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">₹{(summary.totalDemand || 0).toLocaleString('en-IN')}</p>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Current Academic Session Invoiced
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Realized Collection</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">₹{(summary.totalCollected || 0).toLocaleString('en-IN')}</p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Efficiency</span>
            <span className="font-bold text-emerald-700">{summary.collectionEfficiency || 0}%</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Dues</p>
          <p className="text-2xl font-bold text-rose-600 mt-2">₹{(summary.totalDues || 0).toLocaleString('en-IN')}</p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Pending Recovery</span>
            <span className="font-bold text-rose-700">{(100 - Number(summary.collectionEfficiency || 0)).toFixed(1)}%</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Concessions / Waivers</p>
          <p className="text-2xl font-bold text-indigo-600 mt-2">₹{(summary.totalConcessions || 0).toLocaleString('en-IN')}</p>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            RTE, Merit, &amp; Staff Concessions
          </div>
        </div>
      </div>

      {/* 2. AGING MATRIX BUCKETS (0-30, 31-60, 61-90, 90+) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Fee Aging Matrix &amp; Delinquency Risk
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Segregation of unpaid receivables by aging duration</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {agingBuckets.map((b: any) => (
            <div key={b.bucket} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">{b.bucket}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  b.risk === 'LOW' ? 'bg-emerald-100 text-emerald-800'
                    : b.risk === 'MEDIUM' ? 'bg-amber-100 text-amber-800'
                    : b.risk === 'HIGH' ? 'bg-orange-100 text-orange-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {b.risk} RISK
                </span>
              </div>
              <p className="text-xl font-bold text-slate-900">₹{b.amount.toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-slate-500">{b.studentCount} Accounts Affected</p>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: b.color }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. PAYMENT MODES & HEAD-WISE COLLECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Modes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            Collection by Payment Mode
          </h3>
          <div className="space-y-3">
            {paymentModes.map((pm: any, idx: number) => (
              <div key={pm.mode} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                  <span className="font-semibold text-slate-800">{pm.mode}</span>
                  <span className="text-[11px] text-slate-400">({pm.count} Txns)</span>
                </div>
                <span className="font-bold text-slate-900">₹{Number(pm.amount || 0).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Head-Wise Fee Collection */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-purple-600" />
            Head-Wise Fee Realization
          </h3>
          <div className="space-y-3">
            {headWiseCollection.map((head: any) => (
              <div key={head.head} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800">{head.head}</span>
                  <span className="font-bold text-slate-900">₹{head.amount.toLocaleString('en-IN')} ({head.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${head.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. TOP FEE DEFAULTERS DRILL-DOWN LEDGER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              Fee Defaulters Ledger &amp; Cashier Follow-Up
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Students with unpaid balances across aging brackets</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search student / roll..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-indigo-500"
              />
            </div>
            <button
              type="button"
              onClick={onExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3">Student</th>
                <th className="py-2.5 px-3">Class &amp; Section</th>
                <th className="py-2.5 px-3 text-right">Invoiced (₹)</th>
                <th className="py-2.5 px-3 text-right">Paid (₹)</th>
                <th className="py-2.5 px-3 text-right">Outstanding (₹)</th>
                <th className="py-2.5 px-3">Primary Guardian</th>
                <th className="py-2.5 px-3 text-center">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDefaulters.map((d: any) => (
                <tr key={d.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {d.first_name} {d.last_name}
                    <span className="block font-mono text-[10px] text-slate-400">{d.admission_number}</span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-700">{d.class_name}-{d.section_name}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">₹{Number(d.total_charges || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">₹{Number(d.paid_amount || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-right text-rose-600 font-bold">₹{Number(d.outstanding_balance || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-slate-700">{d.parent_name || 'Guardian'}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-500">{d.parent_mobile || '+91 98350 12345'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
