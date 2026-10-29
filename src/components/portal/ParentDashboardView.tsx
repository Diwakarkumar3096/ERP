import React, { useState } from 'react';
import { ChildStudent, PortalTab } from './PortalCommon.js';
import {
  Calendar,
  CreditCard,
  BookOpen,
  Award,
  Bus,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  ArrowRight,
  Sparkles,
  Phone,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  Building,
  GraduationCap,
  ExternalLink,
  ChevronRight,
  Edit3
} from 'lucide-react';
import { PortalFeePaymentModal } from './PortalFeePaymentModal.js';
import { PortalProfileCorrectionModal } from './PortalProfileCorrectionModal.js';
import { PortalLeaveApplicationModal } from './PortalLeaveApplicationModal.js';
import { PortalTeacherMessagingModal } from './PortalTeacherMessagingModal.js';

interface ParentDashboardViewProps {
  child: ChildStudent;
  dashboardData: any;
  onNavigateTab: (tab: PortalTab) => void;
  onRefreshData: () => void;
}

export const ParentDashboardView: React.FC<ParentDashboardViewProps> = ({
  child,
  dashboardData,
  onNavigateTab,
  onRefreshData
}) => {
  // Modal states
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);

  const att = dashboardData?.attendance;
  const fees = dashboardData?.fees;
  const homework = dashboardData?.homework || [];
  const exams = dashboardData?.exams || {};
  const timetable = dashboardData?.timetable || [];
  const transport = dashboardData?.transport;
  const hostel = dashboardData?.hostel;
  const library = dashboardData?.library || [];
  const services = dashboardData?.serviceRequests || [];
  const leaves = dashboardData?.leaveApplications || [];
  const announcements = dashboardData?.announcements || [];

  return (
    <div className="space-y-6">
      {/* 1. HERO WARD BANNER & QUICK ACTIONS */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center font-extrabold text-xl shadow-md border-2 border-white/20">
              {child.first_name[0]}{child.last_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {child.student_status}
                </span>
                <span className="text-xs text-indigo-300 font-mono">
                  Roll #{child.roll_number || '01'} • Adm #{child.admission_number}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white mt-1">
                {child.first_name} {child.last_name}
              </h2>
              <p className="text-xs text-indigo-200 mt-0.5">
                Class {child.class_name} (Section {child.section_name}) • {child.school_name || 'Vidya Vahini Public School'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsPayModalOpen(true)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Pay Fees</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLeaveModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Apply Leave</span>
            </button>

            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors flex items-center gap-1.5"
              title="Request demographic correction"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Correction</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-indigo-900/60">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Attendance Rate</span>
            <div className="text-lg font-bold text-white mt-0.5 flex items-baseline gap-1.5">
              <span>{att?.attendancePercentage ?? 94}%</span>
              <span className={`text-[10px] font-semibold ${att?.todayStatus === 'PRESENT' ? 'text-emerald-400' : 'text-amber-400'}`}>
                ({att?.todayStatus === 'PRESENT' ? 'Present Today' : 'Today: ' + (att?.todayStatus || 'Active')})
              </span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Fee Balance</span>
            <div className="text-lg font-bold text-white mt-0.5 flex items-baseline gap-1.5">
              <span>₹{(fees?.pendingFees || 0).toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-indigo-300 font-normal">Pending</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Pending Homework</span>
            <div className="text-lg font-bold text-white mt-0.5 flex items-baseline gap-1.5">
              <span>{homework.filter((h: any) => h.submission_status !== 'SUBMITTED' && h.submission_status !== 'EVALUATED').length}</span>
              <span className="text-[10px] text-indigo-300 font-normal">Tasks Due</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Active Services</span>
            <div className="text-lg font-bold text-white mt-0.5 flex items-baseline gap-1.5">
              <span>{services.length}</span>
              <span className="text-[10px] text-indigo-300 font-normal">Requests Tracked</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CORE WIDGETS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Attendance, Fees, Homework & Exams */}
        <div className="lg:col-span-8 space-y-6">
          {/* Fee & Installment Snapshot */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">School Fees & Payment Status</h3>
                  <p className="text-[11px] text-slate-500">Official tuition, laboratory, and campus fee ledger</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('fees')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>Full Fee Ledger</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-500">Total Allocated</span>
                <div className="text-base font-extrabold text-slate-900 mt-0.5 font-mono">
                  ₹{(fees?.totalFees || 32000).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-emerald-700">Paid Amount</span>
                <div className="text-base font-extrabold text-emerald-800 mt-0.5 font-mono">
                  ₹{(fees?.paidFees || 24000).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                <span className="text-[10px] uppercase font-bold text-amber-700">Outstanding Due</span>
                <div className="text-base font-extrabold text-amber-900 mt-0.5 font-mono">
                  ₹{(fees?.pendingFees || 8000).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {fees?.nextInstallment && (
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Next Installment</span>
                  <h4 className="text-xs font-bold text-slate-900">{fees.nextInstallment.title}</h4>
                  <p className="text-[11px] text-slate-500">Due by: {new Date(fees.nextInstallment.due_date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold text-indigo-950 font-mono">
                    ₹{Number(fees.nextInstallment.amount || 4500).toLocaleString('en-IN')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPayModalOpen(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                  >
                    Pay Now
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Today's Timetable Schedule */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Today's Class Schedule</h3>
                  <p className="text-[11px] text-slate-500">Period schedule & subject teachers</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </span>
            </div>

            {timetable.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                No active timetable periods scheduled for today (Holiday / Weekend).
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {timetable.slice(0, 4).map((item: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-bold uppercase">Period {item.period_number}</span>
                      <span className="font-mono">{item.start_time}</span>
                    </div>
                    <div className="font-bold text-xs text-slate-900 truncate">{item.subject_name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{item.teacher_name || 'Teacher'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Homework & Assignments */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Homework & Active Assignments</h3>
                  <p className="text-[11px] text-slate-500">Daily assignments and submission deadlines</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('homework')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>All Homework</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {homework.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                No homework assigned currently.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {homework.slice(0, 3).map((hw: any) => (
                  <div key={hw.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-semibold text-slate-900">{hw.title}</h4>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-medium text-indigo-700">{hw.subject_name}</span>
                        <span>•</span>
                        <span>Due: {new Date(hw.due_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        hw.submission_status === 'SUBMITTED' || hw.submission_status === 'EVALUATED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {hw.submission_status === 'SUBMITTED' ? 'Submitted' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Published Results */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Recent Examination Results</h3>
                  <p className="text-[11px] text-slate-500">Official published scores and grades</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('exams')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>Report Cards</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {(!exams.publishedResults || exams.publishedResults.length === 0) ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                No published exam results currently available.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {exams.publishedResults.slice(0, 3).map((res: any) => (
                  <div key={res.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] font-bold uppercase text-slate-500 truncate block">
                      {res.subject_name}
                    </span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-base font-extrabold text-slate-900 font-mono">
                        {res.marks_obtained} / {res.max_marks}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {res.grade || 'A'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">{res.exam_title}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Logistics (Transport, Hostel, Library, Services) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Transport Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-600">
              <Bus className="w-4 h-4" />
              <h3 className="font-bold text-xs uppercase tracking-wider">Transport & Fleet</h3>
            </div>

            {transport ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Route:</span>
                  <span className="font-semibold text-slate-800">{transport.route_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Designated Stop:</span>
                  <span className="font-semibold text-slate-800">{transport.stop_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pickup Time:</span>
                  <span className="font-semibold text-slate-800 font-mono">{transport.pickup_time || '07:15 AM'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Drop Time:</span>
                  <span className="font-semibold text-slate-800 font-mono">{transport.drop_time || '02:45 PM'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vehicle #:</span>
                  <span className="font-mono font-bold text-slate-900">{transport.vehicle_number || 'JH-15-B-4401'}</span>
                </div>

                <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{transport.trackingStatusMessage}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                Student is not currently enrolled in school bus transportation service.
              </p>
            )}
          </div>

          {/* Library Borrowed Books */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600">
                <BookOpen className="w-4 h-4" />
                <h3 className="font-bold text-xs uppercase tracking-wider">Library Borrowings</h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500">{library.length} Issued</span>
            </div>

            {library.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                No active books currently borrowed from the school library.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {library.slice(0, 2).map((b: any) => (
                  <div key={b.id} className="py-2 text-xs">
                    <p className="font-semibold text-slate-800 truncate">{b.title}</p>
                    <p className="text-[11px] text-slate-500">Due: {new Date(b.due_date).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Service Requests */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600">
                <FileText className="w-4 h-4" />
                <h3 className="font-bold text-xs uppercase tracking-wider">Online Service Requests</h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('services')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                + New Request
              </button>
            </div>

            {services.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                No pending certificate or document requests.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {services.map((req: any) => (
                  <div key={req.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{req.request_type}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Ref: {req.request_number}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Direct Communication Quick Links */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              Quick School Contacts
            </h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsMsgModalOpen(true)}
                className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 flex items-center justify-center gap-2 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Message Class Teacher</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('appointments')}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Book Principal / Teacher Slot</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <PortalFeePaymentModal
        child={child}
        pendingAmount={fees?.pendingFees || 8000}
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onPaymentSuccess={onRefreshData}
      />

      <PortalProfileCorrectionModal
        child={child}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSuccess={onRefreshData}
      />

      <PortalLeaveApplicationModal
        child={child}
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onSuccess={onRefreshData}
      />

      <PortalTeacherMessagingModal
        child={child}
        isOpen={isMsgModalOpen}
        onClose={() => setIsMsgModalOpen(false)}
      />
    </div>
  );
};
