import React, { useState, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  TrendingUp,
  FileText,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  FolderOpen,
  UserCheck,
  QrCode,
  Sparkles
} from 'lucide-react';

interface LifecycleDashboardProps {
  stats?: any;
  loading?: boolean;
  onNavigateSubTab: (tab: any) => void;
}

export const LifecycleDashboardView: React.FC<LifecycleDashboardProps> = ({
  stats: propStats,
  loading: propLoading,
  onNavigateSubTab
}) => {
  const [internalStats, setInternalStats] = useState<any>(null);
  const [internalLoading, setInternalLoading] = useState(true);

  useEffect(() => {
    if (propStats !== undefined) {
      setInternalStats(propStats);
      setInternalLoading(propLoading ?? false);
      return;
    }

    let isMounted = true;
    fetch('/api/lifecycle/dashboard')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setInternalStats(data);
          setInternalLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching lifecycle dashboard stats:', err);
        if (isMounted) setInternalLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [propStats, propLoading]);

  const stats = propStats !== undefined ? propStats : internalStats;
  const loading = propLoading !== undefined ? propLoading : internalLoading;

  if (loading || !stats) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-600">Loading student lifecycle metrics &amp; clearance registers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. STUDENT LIFECYCLE PROGRESSION JOURNEY BANNER */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Unified Student Progression Journey
            </div>
            <h3 className="text-base font-bold text-white mt-1">Complete Student Lifecycle &amp; Document Management</h3>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              Tracking academic milestones from initial intake through annual promotions, digital document verification, and formal Transfer Certificate (TC) departure
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateSubTab('verify_qr')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-100 bg-white/10 hover:bg-white/15 rounded-xl border border-white/10 transition-colors w-fit shadow-xs"
          >
            <QrCode className="w-4 h-4 text-indigo-300" />
            Verify Public Certificate QR
          </button>
        </div>

        {/* Workflow Progression Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2 border-t border-indigo-900/60 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-indigo-300 font-bold uppercase">Phase 1</span>
            <p className="font-semibold text-white mt-0.5">Admission</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-indigo-300 font-bold uppercase">Phase 2</span>
            <p className="font-semibold text-white mt-0.5">Active Enrollment</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-indigo-300 font-bold uppercase">Phase 3</span>
            <p className="font-semibold text-white mt-0.5">Annual Promotion</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-indigo-300 font-bold uppercase">Phase 4</span>
            <p className="font-semibold text-white mt-0.5">Document Vault</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-indigo-300 font-bold uppercase">Phase 5</span>
            <p className="font-semibold text-white mt-0.5">Clearance &amp; TC</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-indigo-300 font-bold uppercase">Phase 6</span>
            <p className="font-semibold text-white mt-0.5">Alumni Roster</p>
          </div>
        </div>
      </div>

      {/* 2. TOP METRIC KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Students */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Learners</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.activeStudents ?? 0}</span>
            <span className="text-xs text-slate-400">/ {stats.totalStudents ?? 0} Total</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Alumni: <strong className="text-slate-800">{stats.alumniCount ?? 0}</strong></span>
            <span>Withdrawn: <strong className="text-slate-800">{stats.withdrawnStudents ?? 0}</strong></span>
          </div>
        </div>

        {/* Clearances & Withdrawals */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Withdrawals / Clearances</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.pendingWithdrawals ?? 0}</span>
            <span className="text-xs text-amber-600 font-medium">In Process</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Pending Clearances: <strong className="text-amber-700 font-semibold">{stats.pendingClearances ?? 0}</strong></span>
            <button
              type="button"
              onClick={() => onNavigateSubTab('withdrawals')}
              className="text-indigo-600 font-semibold hover:underline"
            >
              Review
            </button>
          </div>
        </div>

        {/* Certificates & TC Issued */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Certificates Issued</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.certificatesIssued ?? 0}</span>
            <span className="text-xs text-emerald-600 font-medium">{stats.tcIssued ?? 0} TCs</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Requests Pending: <strong className="text-indigo-600 font-semibold">{stats.serviceRequestsPending ?? 0}</strong></span>
            <button
              type="button"
              onClick={() => onNavigateSubTab('certificates')}
              className="text-indigo-600 font-semibold hover:underline"
            >
              Registry
            </button>
          </div>
        </div>

        {/* Document Vault Queue */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Document Vault</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FolderOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.documentsPendingVerify ?? 0}</span>
            <span className="text-xs text-purple-600 font-medium">Pending Review</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Digital Vault Active</span>
            <button
              type="button"
              onClick={() => onNavigateSubTab('documents')}
              className="text-indigo-600 font-semibold hover:underline"
            >
              Verify
            </button>
          </div>
        </div>
      </div>

      {/* 3. QUICK ACTIONS GRID */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Student Lifecycle Workflows &amp; Operations</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            type="button"
            onClick={() => onNavigateSubTab('promotions')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-900">Academic Promotion</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Bulk / Individual promotion</p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSubTab('withdrawals')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-900">Withdrawal &amp; Clearance</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Departmental checklists</p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSubTab('tc')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Award className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-900">Transfer Certificate</p>
            <p className="text-[10px] text-slate-500 mt-0.5">CBSE-standard TC issuance</p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSubTab('documents')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <FolderOpen className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-900">Digital Document Vault</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Archives &amp; missing checks</p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSubTab('service_requests')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-900">Service Requests</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Certificate intake center</p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSubTab('alumni')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/40 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-900">Alumni Directory</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Graduated student records</p>
          </button>
        </div>
      </div>
    </div>
  );
};
