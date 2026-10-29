import React from 'react';
import type { DashboardStats } from '../../types/erp.js';
import type { NavTab } from '../common/Sidebar.js';
import {
  BookOpen,
  Layers,
  FileCheck,
  Clock,
  ArrowRight,
  GraduationCap
} from 'lucide-react';

interface AcademicOverviewSectionProps {
  data: DashboardStats;
  onNavigateTab: (tab: NavTab) => void;
}

export const AcademicOverviewSection: React.FC<AcademicOverviewSectionProps> = ({ data, onNavigateTab }) => {
  const acad = data.academicOverview || {
    totalClasses: 0,
    totalSections: 0,
    totalSubjects: 0,
    totalHomework: 0,
    activeHomework: 0,
    homeworkSubmissions: 0
  };

  const streams = Array.isArray(data?.streamBreakdown) ? data.streamBreakdown : [];

  return (
    <div className="bg-white rounded-2xl border border-indigo-200/80 shadow-sm p-5 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
                Academics, Curriculum &amp; LMS
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Phase 21 Live
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Classes, subject syllabi, daily homework &amp; digital learning resources
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('academic')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
          >
            <span>Curriculum &amp; LMS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-indigo-50/50 border border-indigo-200/80 rounded-xl p-3.5">
          <span className="text-xs font-semibold text-indigo-800">Classes &amp; Grades</span>
          <div className="mt-1 text-2xl font-bold text-slate-900">{acad.totalClasses}</div>
          <span className="text-[11px] text-indigo-700 mt-1 block font-medium">
            {acad.totalSections} active sections
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <span className="text-xs font-semibold text-slate-700">Subjects</span>
          <div className="mt-1 text-2xl font-bold text-slate-900">{acad.totalSubjects}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Across core &amp; electives
          </span>
        </div>

        <div className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-3.5">
          <span className="text-xs font-semibold text-blue-800">Active Homework</span>
          <div className="mt-1 text-2xl font-bold text-blue-900">{acad.activeHomework}</div>
          <span className="text-[11px] text-blue-700 mt-1 block font-medium">
            Due this week
          </span>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3.5">
          <span className="text-xs font-semibold text-emerald-800">Student Submissions</span>
          <div className="mt-1 text-2xl font-bold text-emerald-900">{acad.homeworkSubmissions}</div>
          <span className="text-[11px] text-emerald-700 mt-1 block font-medium">
            Digitally turned in
          </span>
        </div>

        <div className="bg-purple-50/50 border border-purple-200/80 rounded-xl p-3.5">
          <span className="text-xs font-semibold text-purple-800">Total Assignments</span>
          <div className="mt-1 text-2xl font-bold text-purple-900">{acad.totalHomework}</div>
          <span className="text-[11px] text-purple-700 mt-1 block font-medium">
            Issued this academic term
          </span>
        </div>
      </div>

      {/* Stream Breakdown */}
      {streams.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">Curriculum Streams:</span>
          {streams.map((s) => (
            <span
              key={s.stream}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200"
            >
              <span className="font-bold">{s.stream || 'General'}</span>
              <span className="text-slate-400 font-mono">({s.class_count} classes)</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
