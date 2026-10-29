import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type {
  AdmissionApplication,
  AdmissionStats,
  School,
  AcademicSession,
  ClassItem,
  AdmissionStatus
} from '../../types/erp.js';
import { ApplicationDetailModal } from './ApplicationDetailModal.js';
import { CreateApplicationModal } from './CreateApplicationModal.js';
import { AdmissionSettingsModal } from './AdmissionSettingsModal.js';
import {
  GraduationCap,
  Search,
  Filter,
  Plus,
  Settings,
  Calendar,
  Layers,
  Building2,
  CheckCircle2,
  Clock,
  Users,
  FileText,
  CreditCard,
  Eye,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckSquare,
  Sparkles
} from 'lucide-react';

interface AdmissionsViewProps {
  onOpenPublicPortal?: () => void;
}

export const AdmissionsView: React.FC<AdmissionsViewProps> = ({ onOpenPublicPortal }) => {
  const { user, hasPermission } = useAuth();
  const [activeMainTab, setActiveMainTab] = useState<'applications' | 'analytics'>('applications');

  // Filters
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(user?.schoolId || '');
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [stats, setStats] = useState<AdmissionStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Load initial schools
  useEffect(() => {
    async function loadSchools() {
      try {
        const res = await api.schools.list();
        if (res.schools && res.schools.length > 0) {
          setSchools(res.schools);
          if (!selectedSchoolId) {
            setSelectedSchoolId(res.schools[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load schools', err);
      }
    }
    loadSchools();
  }, []);

  // When school changes, load sessions & classes
  useEffect(() => {
    if (!selectedSchoolId) return;

    async function loadSchoolMetadata() {
      try {
        const [sessRes, classRes] = await Promise.all([
          api.sessions.list(selectedSchoolId),
          api.classes.list(selectedSchoolId)
        ]);

        setSessions(sessRes.sessions || []);
        if (sessRes.sessions && sessRes.sessions.length > 0) {
          const current = sessRes.sessions.find(s => s.status === 'upcoming' || s.is_current) || sessRes.sessions[0];
          setSelectedSessionId(current.id);
        }

        setClasses(classRes.classes || []);
        setSelectedClassId('');
      } catch (err) {
        console.error('Failed to load metadata', err);
      }
    }

    loadSchoolMetadata();
  }, [selectedSchoolId]);

  // Load applications & stats
  const fetchData = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        api.admissions.list({
          schoolId: selectedSchoolId || undefined,
          sessionId: selectedSessionId || undefined,
          classId: selectedClassId || undefined,
          status: selectedStatus || undefined,
          admissionType: selectedType || undefined,
          search: searchQuery || undefined,
          page,
          limit
        }),
        api.admissions.getStats({
          schoolId: selectedSchoolId || undefined,
          sessionId: selectedSessionId || undefined
        })
      ]);

      setApplications(listRes.applications || []);
      setTotal(listRes.total || 0);
      setTotalPages(listRes.totalPages || 1);
      setStats(statsRes.stats || null);
    } catch (err) {
      console.error('Failed to load admissions data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSchoolId, selectedSessionId, selectedClassId, selectedStatus, selectedType, searchQuery, page]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider font-mono">
                Phase 3 Module
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Live Database Backed
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Admissions & Intake Pipeline
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              End-to-end applicant lifecycle: online submission, document verification, entrance tests, interviews, fee collection, and one-click student enrollment.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenPublicPortal && (
              <button
                onClick={onOpenPublicPortal}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                <span>Public Portal</span>
              </button>
            )}

            {hasPermission('admissions.approve') && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-2"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Policy & Prefix</span>
              </button>
            )}

            {hasPermission('admissions.create') && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ Walk-in Candidate</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Selectors */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center gap-4 text-xs">
          {user?.roleName === 'super_admin' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                School:
              </span>
              <select
                value={selectedSchoolId}
                onChange={e => { setSelectedSchoolId(e.target.value); setPage(1); }}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-medium focus:outline-none focus:border-indigo-500"
              >
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Session:
            </span>
            <select
              value={selectedSessionId}
              onChange={e => { setSelectedSessionId(e.target.value); setPage(1); }}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Sessions</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.name} {s.is_current ? '(Active)' : ''}</option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveMainTab('applications')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMainTab === 'applications'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Candidates List
            </button>
            <button
              onClick={() => setActiveMainTab('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMainTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Conversion Funnel
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Applications</span>
            <div className="text-2xl font-black text-white font-mono">{stats.total}</div>
            <span className="text-[10px] text-slate-500">All intake channels</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider block">Review / Submitted</span>
            <div className="text-2xl font-black text-blue-300 font-mono">{stats.submitted + stats.underReview}</div>
            <span className="text-[10px] text-slate-500">{stats.submitted} new, {stats.underReview} under review</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block">Entrance Tests</span>
            <div className="text-2xl font-black text-indigo-300 font-mono">{stats.testScheduled + stats.testCompleted}</div>
            <span className="text-[10px] text-slate-500">{stats.testScheduled} scheduled</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider block">Interviews</span>
            <div className="text-2xl font-black text-violet-300 font-mono">{stats.interviewScheduled + stats.interviewCompleted}</div>
            <span className="text-[10px] text-slate-500">{stats.interviewScheduled} upcoming slot</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">Selected / Pending</span>
            <div className="text-2xl font-black text-amber-300 font-mono">{stats.selected + stats.approved + stats.feePending}</div>
            <span className="text-[10px] text-slate-500">{stats.feePending} awaiting fees</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">Confirmed Enrolled</span>
            <div className="text-2xl font-black text-emerald-400 font-mono">{stats.confirmed}</div>
            <span className="text-[10px] text-emerald-500/80 font-semibold">Active students</span>
          </div>
        </div>
      )}

      {/* TAB 1: APPLICATIONS DIRECTORY */}
      {activeMainTab === 'applications' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by App No, Student, Parent, Mobile..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto text-xs">
              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="DOCUMENT_PENDING">Document Pending</option>
                <option value="TEST_SCHEDULED">Test Scheduled</option>
                <option value="TEST_COMPLETED">Test Completed</option>
                <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
                <option value="INTERVIEW_COMPLETED">Interview Completed</option>
                <option value="SELECTED">Selected</option>
                <option value="WAITLISTED">Waitlisted</option>
                <option value="APPROVED">Approved</option>
                <option value="FEE_PENDING">Fee Pending</option>
                <option value="CONFIRMED">Confirmed Enrolled</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              {/* Class Filter */}
              <select
                value={selectedClassId}
                onChange={e => { setSelectedClassId(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Admission Type Filter */}
              <select
                value={selectedType}
                onChange={e => { setSelectedType(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Types</option>
                <option value="NEW">New Admission</option>
                <option value="TRANSFER">Transfer</option>
                <option value="READMISSION">Re-admission</option>
              </select>

              {(searchQuery || selectedStatus || selectedClassId || selectedType) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStatus('');
                    setSelectedClassId('');
                    setSelectedType('');
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Application No</th>
                    <th className="py-3.5 px-4">Student Candidate</th>
                    <th className="py-3.5 px-4">Applying Class</th>
                    <th className="py-3.5 px-4">Parent / Contact</th>
                    <th className="py-3.5 px-4">Date & Type</th>
                    <th className="py-3.5 px-4">Current Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-2" />
                        Loading applications...
                      </td>
                    </tr>
                  ) : applications.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No admission applications match the current search filters.
                      </td>
                    </tr>
                  ) : (
                    applications.map(app => (
                      <tr key={app.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-white bg-slate-950 px-2 py-1 rounded border border-slate-800">
                            {app.application_number}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-[11px] shrink-0">
                              {app.student_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-white block">{app.student_name}</span>
                              <span className="text-[11px] text-slate-500">{app.gender} • DOB {app.date_of_birth}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-200 block">{app.applying_class_name}</span>
                          <span className="text-[11px] text-slate-500">{app.session_name}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-200 block">{app.father_name || app.mother_name || 'Guardian'}</span>
                          <span className="font-mono text-[11px] text-indigo-400">{app.parent_mobile}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-slate-300 block">{app.application_date}</span>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase">{app.admission_type}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                            app.application_status === 'CONFIRMED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : app.application_status === 'SELECTED' || app.application_status === 'APPROVED'
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              : app.application_status === 'REJECTED' || app.application_status === 'CANCELLED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {app.application_status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedAppId(app.id)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-400" />
                              <span>View Dossier</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div>
                Showing <span className="text-white font-semibold">{applications.length}</span> of <span className="text-white font-semibold">{total}</span> candidates
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono">Page {page} of {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ANALYTICS & CONVERSION FUNNEL */}
      {activeMainTab === 'analytics' && stats && (
        <div className="space-y-6 animate-fade-in">
          {/* Conversion Funnel Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                  <span>Admissions Conversion Pipeline</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Visual funnel tracking candidate progression from initial application submission to final enrollment.
                </p>
              </div>
              <span className="text-xs font-mono bg-slate-950 px-3 py-1 rounded-full text-indigo-400 font-bold border border-slate-800">
                Conversion Rate: {stats.total > 0 ? ((stats.confirmed / stats.total) * 100).toFixed(1) : 0}%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-3 text-center">
              {[
                { stage: '1. Applications', count: stats.total, color: 'bg-slate-800 border-slate-700 text-white' },
                { stage: '2. Under Review', count: stats.underReview + stats.documentsVerification, color: 'bg-blue-950/60 border-blue-800/40 text-blue-300' },
                { stage: '3. Tests', count: stats.testScheduled + stats.testCompleted, color: 'bg-indigo-950/60 border-indigo-800/40 text-indigo-300' },
                { stage: '4. Interviews', count: stats.interviewScheduled + stats.interviewCompleted, color: 'bg-violet-950/60 border-violet-800/40 text-violet-300' },
                { stage: '5. Selected', count: stats.selected + stats.approved, color: 'bg-teal-950/60 border-teal-800/40 text-teal-300' },
                { stage: '6. Fee Due', count: stats.feePending, color: 'bg-amber-950/60 border-amber-800/40 text-amber-300' },
                { stage: '7. Enrolled', count: stats.confirmed, color: 'bg-emerald-950/60 border-emerald-800/40 text-emerald-300 font-bold' }
              ].map((item, idx) => (
                <div key={item.stage} className={`p-4 rounded-2xl border ${item.color} space-y-1 shadow-sm`}>
                  <div className="text-[10px] font-mono opacity-60">Step 0{idx + 1}</div>
                  <div className="text-2xl font-black font-mono">{item.count}</div>
                  <div className="text-xs font-semibold">{item.stage}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Class */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Application Intake by Grade / Class
              </h4>
              <div className="space-y-2.5">
                {stats.byClass.map(item => {
                  const pct = stats.total > 0 ? (item.count / stats.total) * 100 : 0;
                  return (
                    <div key={item.class_name} className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>{item.class_name}</span>
                        <span className="font-mono font-semibold">{item.count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By Admission Type */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Distribution by Admission Category
              </h4>
              <div className="space-y-3">
                {stats.byType.map(item => (
                  <div key={item.type} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      {item.type === 'NEW' ? 'New Admission' : item.type === 'TRANSFER' ? 'Transfer Candidate' : 'Re-admission'}
                    </span>
                    <span className="font-mono text-indigo-400 font-bold text-sm">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {selectedAppId && (
        <ApplicationDetailModal
          applicationId={selectedAppId}
          onClose={() => setSelectedAppId(null)}
          onRefresh={fetchData}
        />
      )}

      {showCreateModal && (
        <CreateApplicationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchData();
          }}
        />
      )}

      {showSettingsModal && (
        <AdmissionSettingsModal
          schoolId={selectedSchoolId}
          onClose={() => setShowSettingsModal(false)}
          onSuccess={() => {
            setShowSettingsModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};
