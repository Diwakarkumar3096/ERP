import React, { useState } from 'react';
import { ChildStudent, PortalTab } from './PortalCommon.js';
import {
  GraduationCap,
  Calendar,
  BookOpen,
  Award,
  Clock,
  CheckCircle,
  FileText,
  Download,
  QrCode,
  Sparkles,
  Send,
  Layers,
  ChevronRight
} from 'lucide-react';
import { PortalLeaveApplicationModal } from './PortalLeaveApplicationModal.js';

interface StudentDashboardViewProps {
  child: ChildStudent;
  dashboardData: any;
  onNavigateTab: (tab: PortalTab) => void;
  onRefreshData: () => void;
}

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({
  child,
  dashboardData,
  onNavigateTab,
  onRefreshData
}) => {
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);

  const att = dashboardData?.attendance;
  const homework = dashboardData?.homework || [];
  const exams = dashboardData?.exams || {};
  const timetable = dashboardData?.timetable || [];
  const announcements = dashboardData?.announcements || [];

  return (
    <div className="space-y-6">
      {/* 1. STUDENT LEARNER HERO BANNER */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-indigo-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-amber-500 text-white flex items-center justify-center font-extrabold text-xl shadow-md border-2 border-white/20">
              {child.first_name[0]}{child.last_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Student Learner
                </span>
                <span className="text-xs text-indigo-300 font-mono">
                  Roll #{child.roll_number || '01'} • Adm #{child.admission_number}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white mt-1">
                Welcome back, {child.first_name}!
              </h2>
              <p className="text-xs text-indigo-200 mt-0.5">
                Class {child.class_name}-{child.section_name} • {child.school_name || 'Vidya Vahini Public School'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowIdCard(!showIdCard)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{showIdCard ? 'Hide ID Card' : 'Digital ID Card'}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('homework')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>My Homework</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLeaveModalOpen(true)}
              className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Apply Leave</span>
            </button>
          </div>
        </div>

        {/* Digital ID Card Preview Drawer */}
        {showIdCard && (
          <div className="mt-5 pt-4 border-t border-indigo-800/60 flex justify-center animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-gradient-to-br from-slate-900 to-indigo-950 p-5 rounded-2xl border-2 border-indigo-400/40 shadow-xl space-y-4 text-white">
              <div className="flex items-center justify-between border-b border-indigo-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-xs">SE</div>
                  <span className="font-bold text-xs tracking-wider uppercase">Official Student ID</span>
                </div>
                <span className="text-[10px] font-mono text-indigo-300">2025-26</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xl font-bold text-amber-300">
                  {child.first_name[0]}{child.last_name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{child.first_name} {child.last_name}</h4>
                  <p className="text-[11px] text-indigo-200">Class {child.class_name}-{child.section_name}</p>
                  <p className="text-[10px] text-indigo-300 font-mono">Admission: #{child.admission_number}</p>
                  <p className="text-[10px] text-indigo-300 font-mono">Roll No: {child.roll_number || '01'}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-800/60 flex items-center justify-between text-[10px] text-indigo-300">
                <span>Valid: Academic Year 2025-26</span>
                <span className="font-semibold text-emerald-400">STATUS: ACTIVE</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. CORE LEARNER WIDGETS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (8 cols): Today's Schedule & Pending Homework */}
        <div className="lg:col-span-8 space-y-6">
          {/* Today's Timetable */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Today's Class Schedule</h3>
                  <p className="text-[11px] text-slate-500">Periods, subjects & classroom teachers</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </span>
            </div>

            {timetable.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                No active timetable scheduled for today.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {timetable.map((item: any, idx: number) => (
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

          {/* Pending Homework */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Homework & Active Assignments</h3>
                  <p className="text-[11px] text-slate-500">Submissions due soon</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('homework')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>View All & Submit</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {homework.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                You have completed all assigned homework!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {homework.slice(0, 4).map((hw: any) => (
                  <div key={hw.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-semibold text-slate-900">{hw.title}</h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-medium text-indigo-700">{hw.subject_name}</span>
                        <span>•</span>
                        <span>Due: {new Date(hw.due_date).toLocaleDateString()}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigateTab('homework')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        hw.submission_status === 'SUBMITTED' || hw.submission_status === 'EVALUATED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {hw.submission_status === 'SUBMITTED' ? 'Submitted' : 'Submit Now'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right (4 cols): Exam Results & Study Materials */}
        <div className="lg:col-span-4 space-y-6">
          {/* Exam Results Snapshot */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600">
                <Award className="w-4 h-4" />
                <h3 className="font-bold text-xs uppercase tracking-wider">Published Results</h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('exams')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Report Card
              </button>
            </div>

            {(!exams.publishedResults || exams.publishedResults.length === 0) ? (
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                Term results have not been published yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {exams.publishedResults.slice(0, 3).map((r: any) => (
                  <div key={r.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{r.subject_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{r.marks_obtained} / {r.max_marks}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {r.grade || 'A'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Services */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600">
                <FileText className="w-4 h-4" />
                <h3 className="font-bold text-xs uppercase tracking-wider">Online Services</h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('services')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Browse All
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onNavigateTab('services')}
                className="w-full text-left p-2.5 bg-slate-50 hover:bg-indigo-50/60 rounded-xl border border-slate-200/80 transition-colors text-xs"
              >
                <div className="font-bold text-slate-900">Bonafide Certificate</div>
                <div className="text-[11px] text-slate-500">Official proof of enrollment for competitive exams</div>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('services')}
                className="w-full text-left p-2.5 bg-slate-50 hover:bg-indigo-50/60 rounded-xl border border-slate-200/80 transition-colors text-xs"
              >
                <div className="font-bold text-slate-900">Student ID Card Re-issue</div>
                <div className="text-[11px] text-slate-500">Replacement card request with barcode</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <PortalLeaveApplicationModal
        child={child}
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onSuccess={onRefreshData}
      />
    </div>
  );
};
