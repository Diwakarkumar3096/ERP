import React from 'react';
import type { DashboardStats } from '../../types/erp.js';
import type { NavTab } from '../common/Sidebar.js';
import {
  Award,
  Calendar,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  FileCheck
} from 'lucide-react';

interface ExamResultsSectionProps {
  data: DashboardStats;
  onNavigateTab: (tab: NavTab) => void;
}

export const ExamResultsSection: React.FC<ExamResultsSectionProps> = ({ data, onNavigateTab }) => {
  const exam = data?.examOverview;
  const upcomingExams = Array.isArray(exam?.upcomingExams) ? exam.upcomingExams : [];
  const perf = exam?.recentPerformance || {
    totalResults: 0,
    averagePercentage: 0,
    passedCount: 0,
    passPercentage: 0
  };

  return (
    <div className="bg-white rounded-2xl border border-purple-200/80 shadow-sm p-5 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Award className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
                Examinations &amp; Academic Performance
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                Evaluation Center
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Exam schedules, mark assessments &amp; student report cards
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('exams')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
        >
          <span>All Examinations</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Performance Metrics Cards */}
        <div className="space-y-3">
          <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-4">
            <span className="text-xs font-semibold text-purple-800">Overall Pass Percentage</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-950">
                {perf.passPercentage}%
              </span>
              <span className="text-xs text-purple-700 font-medium">
                {perf.passedCount} / {perf.totalResults} passed
              </span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-1.5 mt-2">
              <div
                className="bg-purple-600 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, perf.passPercentage)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <span className="text-xs font-semibold text-slate-700">Average Student Score</span>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {perf.averagePercentage}%
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block font-medium">
              Calculated across graded subjects
            </span>
          </div>

          <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4">
            <span className="text-xs font-semibold text-indigo-800">Evaluated Dossiers</span>
            <div className="mt-1 text-2xl font-bold text-indigo-950">
              {perf.totalResults}
            </div>
            <span className="text-[11px] text-indigo-700 mt-1 block font-medium">
              Total report marks generated
            </span>
          </div>
        </div>

        {/* Upcoming Exam Schedules list */}
        <div className="lg:col-span-2 bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Active &amp; Upcoming Exam Schedules
              </span>
              <span className="text-xs font-semibold text-purple-700">
                {upcomingExams.length} Terms Configured
              </span>
            </div>

            <div className="space-y-2.5">
              {upcomingExams.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No upcoming examinations scheduled currently
                </div>
              ) : (
                upcomingExams.map((ex) => (
                  <div
                    key={ex.id}
                    className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-purple-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{ex.name}</span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {ex.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {ex.start_date} to {ex.end_date}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>Weightage: {ex.weightage || 100}%</span>
                        {ex.classes_count > 0 && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-indigo-600 font-medium">
                              {ex.classes_count} Classes Included
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        {ex.status || 'SCHEDULED'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Grading scale: CBSE Continuous &amp; Comprehensive Assessment</span>
            <button
              onClick={() => onNavigateTab('exams')}
              className="text-purple-700 font-semibold hover:underline inline-flex items-center gap-1"
            >
              Enter Marks / Report Cards <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
