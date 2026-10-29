import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Layers,
  AlertTriangle,
  Award,
  Sparkles,
  RefreshCw,
  Plus,
  Compass,
  GraduationCap
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { AcademicTab } from './AcademicCommon';

interface DashboardMetrics {
  totalCurriculums: number;
  totalMappedSubjects: number;
  totalUnits: number;
  totalTopics: number;
  totalLessonPlans: number;
  completedLessonPlans: number;
  overallSyllabusProgress: number;
  activeRemedialPlans: number;
  activeEnrichmentPlans: number;
  unacknowledgedAlerts: number;
}

interface AcademicDashboardViewProps {
  onNavigateTab: (tab: AcademicTab) => void;
  onOpenAIAssistant: () => void;
}

export const AcademicDashboardView: React.FC<AcademicDashboardViewProps> = ({
  onNavigateTab,
  onOpenAIAssistant,
}) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [subjectProgress, setSubjectProgress] = useState<any[]>([]);
  const [classProgress, setClassProgress] = useState<any[]>([]);
  const [topicStatusDistribution, setTopicStatusDistribution] = useState<any[]>([]);
  const [competencyDistribution, setCompetencyDistribution] = useState<any[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [availableSessions, setAvailableSessions] = useState<any[]>([]);

  const fetchDashboardData = async (sessionId?: string) => {
    setLoading(true);
    try {
      const url = sessionId
        ? `/api/academic/dashboard?sessionId=${encodeURIComponent(sessionId)}`
        : '/api/academic/dashboard';
      const res = await fetch(url);
      const data = await res.json();
      if (data.stats || data.success) {
        const s = data.stats || data.data?.metrics;
        if (s) {
          setMetrics({
            totalCurriculums: s.totalFrameworks ?? s.totalCurriculums ?? 0,
            totalMappedSubjects: s.totalSubjects ?? s.totalMappedSubjects ?? 0,
            totalUnits: s.totalUnits ?? 0,
            totalTopics: s.totalTopics ?? 0,
            totalLessonPlans: s.lessonPlansCreated ?? s.totalLessonPlans ?? 0,
            completedLessonPlans: s.lessonPlansCompleted ?? s.completedLessonPlans ?? 0,
            overallSyllabusProgress: s.syllabusCompletionPct ?? s.overallSyllabusProgress ?? 0,
            activeRemedialPlans: s.remedialPlansCount ?? s.activeRemedialPlans ?? 0,
            activeEnrichmentPlans: s.enrichmentPlansCount ?? s.activeEnrichmentPlans ?? 0,
            unacknowledgedAlerts: (data.alerts || []).filter((a: any) => !a.is_acknowledged).length,
          });
        }
        setSubjectProgress(
          (data.subjectProgress || data.data?.subjectProgress || []).map((sp: any) => ({
            subject_name: sp.subject || sp.subject_name,
            avg_completion: sp.completionRate ?? sp.avg_completion ?? 0,
            completed_topics: sp.completed ?? sp.completed_topics ?? 0,
          }))
        );
        setClassProgress(
          (data.classProgress || data.data?.classProgress || []).map((cp: any) => ({
            class_name: cp.className || cp.class_name,
            avg_completion: cp.progressPct ?? cp.avg_completion ?? 0,
            topics_count: cp.totalTopics ?? cp.topics_count ?? 0,
            completed_topics: cp.completed ?? cp.completed_topics ?? 0,
          }))
        );
        setTopicStatusDistribution(data.topicStatusDistribution || data.data?.topicStatusDistribution || []);
        setCompetencyDistribution(data.competencyDistribution || data.data?.competencyDistribution || []);
        setActiveAlerts(data.alerts || data.data?.activeAlerts || []);
      }
    } catch (err) {
      console.error('Failed to load academic dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/academic/terms');
      const data = await res.json();
      if (data.terms) {
        setAvailableSessions(data.terms);
        if (data.terms.length > 0 && !selectedSessionId) {
          setSelectedSessionId(data.terms[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchDashboardData(selectedSessionId || undefined);
  }, []);

  const handleSessionChange = (sessId: string) => {
    setSelectedSessionId(sessId);
    fetchDashboardData(sessId);
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/academic/alerts/${alertId}/acknowledge`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (data.success) {
        setActiveAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }
    } catch (err) {
      console.error('Failed to acknowledge alert', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-800 text-white p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            Phase 21 • Academic Planning & LMS Core
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Curriculum & Pedagogical Operations
          </h2>
          <p className="text-indigo-200 text-sm max-w-2xl">
            Real-time syllabus execution tracking, 5E pedagogical lesson plans, competency outcomes,
            formative mastery, and automated academic alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {availableSessions.length > 0 && (
            <select
              value={selectedSessionId}
              onChange={(e) => handleSessionChange(e.target.value)}
              className="bg-white/15 border border-white/20 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {availableSessions.map((s) => (
                <option key={s.id} value={s.id} className="text-slate-800">
                  {s.session_name || s.name} {s.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => fetchDashboardData(selectedSessionId || undefined)}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onOpenAIAssistant}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-bold rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 text-sm"
          >
            <Sparkles className="w-4 h-4 fill-current text-slate-950" />
            AI Pedagogical Assistant
          </button>
        </div>
      </div>

      {/* Critical Alerts Banner (if any) */}
      {activeAlerts.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-amber-900 text-sm">
                  Active Academic Alerts ({activeAlerts.length})
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Syllabus slippages or low formative assessment performances require review.
                </p>
                <div className="mt-2 space-y-1.5">
                  {activeAlerts.slice(0, 3).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between gap-4 bg-white/70 px-3 py-1.5 rounded-md text-xs text-amber-950 border border-amber-200"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-amber-800">[{alert.alert_type}]</span>
                        <span>{alert.message}</span>
                      </div>
                      <button
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-semibold text-[11px]"
                      >
                        Acknowledge
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('interventions')}
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline shrink-0 ml-4"
            >
              View All Interventions →
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div
          onClick={() => onNavigateTab('curriculum')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Frameworks</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">
              {metrics?.totalCurriculums ?? '—'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {metrics?.totalMappedSubjects ?? 0} Mapped Subjects
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('units_topics')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Units & Topics</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">
              {metrics?.totalTopics ?? '—'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {metrics?.totalUnits ?? 0} Curricular Units
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('lesson_planner')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Lesson Plans</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">
              {metrics?.totalLessonPlans ?? '—'}
            </div>
            <div className="text-xs text-emerald-600 font-medium mt-0.5">
              {metrics?.completedLessonPlans ?? 0} Completed
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('syllabus_progress')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-cyan-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Syllabus Progress</span>
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg group-hover:scale-110 transition-transform">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">
              {metrics?.overallSyllabusProgress ?? 0}%
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-cyan-500 h-1.5 rounded-full"
                style={{ width: `${metrics?.overallSyllabusProgress ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('remedial_enrichment')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-violet-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Remedial Plans</span>
            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg group-hover:scale-110 transition-transform">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">
              {metrics?.activeRemedialPlans ?? '—'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Active Support Cases
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('remedial_enrichment')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Enrichment / Talents</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition-transform">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">
              {metrics?.activeEnrichmentPlans ?? '—'}
            </div>
            <div className="text-xs text-amber-600 font-medium mt-0.5">
              Olympiad & Advanced
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Progress Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject-Wise Syllabus Completion */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Subject-Wise Syllabus Completion
              </h3>
              <p className="text-xs text-slate-500">
                Completed vs total planned curricular topics by subject
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('syllabus_progress')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Open Matrix →
            </button>
          </div>

          {subjectProgress.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectProgress} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="subject_name"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: any, name?: any) => [
                      name === 'avg_completion' ? `${value}%` : value,
                      name === 'avg_completion' ? 'Avg Completion' : String(name || ''),
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey="avg_completion"
                    name="Avg Completion %"
                    fill="#4f46e5"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="completed_topics"
                    name="Topics Done"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <Layers className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">No syllabus progress data recorded yet</p>
            </div>
          )}
        </div>

        {/* Competency & Learning Outcomes Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Bloom's / NEP Competencies
              </h3>
              <p className="text-xs text-slate-500">
                Cognitive domain distribution of mapped outcomes
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('learning_outcomes')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Details →
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-64 pr-1">
            {competencyDistribution.length > 0 ? (
              competencyDistribution.map((c, idx) => {
                const colors = [
                  'bg-indigo-500',
                  'bg-emerald-500',
                  'bg-blue-500',
                  'bg-amber-500',
                  'bg-purple-500',
                  'bg-rose-500',
                ];
                const color = colors[idx % colors.length];
                return (
                  <div key={c.competency_category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">
                        {c.competency_category}
                      </span>
                      <span className="text-slate-500 font-semibold">{c.count} outcomes</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`${color} h-2 rounded-full`}
                        style={{
                          width: `${Math.min(100, Math.max(15, (c.count / 10) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">
                No learning outcomes mapped
              </p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('learning_outcomes')}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
            >
              Explore Competency Matrix
            </button>
          </div>
        </div>
      </div>

      {/* Class Progress & Quick Pedagogical Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Class-Wise Execution</h3>
              <p className="text-xs text-slate-500">
                Pacing progress across enrolled grades & sections
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('syllabus_progress')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View Class Matrix →
            </button>
          </div>

          <div className="space-y-3">
            {classProgress.length > 0 ? (
              classProgress.map((cp) => (
                <div
                  key={cp.class_name}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {cp.class_name.replace('Class ', '')}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{cp.class_name}</div>
                      <div className="text-xs text-slate-500">
                        {cp.topics_count} Topics • {cp.completed_topics} Completed
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-800">
                        {cp.avg_completion}%
                      </div>
                      <div className="text-[11px] text-slate-500">Pacing Index</div>
                    </div>
                    <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${cp.avg_completion}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                No class pacing records found
              </p>
            )}
          </div>
        </div>

        {/* Quick Launch Pedagogical Hub */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Pedagogical Actions
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Rapid access to essential curriculum tools and lesson planners
            </p>

            <div className="space-y-2">
              <button
                onClick={() => onNavigateTab('lesson_planner')}
                className="w-full flex items-center justify-between p-3 bg-white hover:bg-indigo-50/50 rounded-xl border border-slate-200 text-left transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg group-hover:scale-105 transition-transform">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Create 5E Lesson Plan</div>
                    <div className="text-[11px] text-slate-500">Engage, Explore, Explain, Elaborate, Evaluate</div>
                  </div>
                </div>
              </button>

              <button
                onClick={onOpenAIAssistant}
                className="w-full flex items-center justify-between p-3 bg-white hover:bg-amber-50/50 rounded-xl border border-slate-200 text-left transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-lg group-hover:scale-105 transition-transform">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">AI Pedagogical Draft</div>
                    <div className="text-[11px] text-slate-500">Generate lesson plan or differentiation strategy</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('syllabus_progress')}
                className="w-full flex items-center justify-between p-3 bg-white hover:bg-blue-50/50 rounded-xl border border-slate-200 text-left transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg group-hover:scale-105 transition-transform">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Record Topic Progress</div>
                    <div className="text-[11px] text-slate-500">Update teaching hours & completion status</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('remedial_enrichment')}
                className="w-full flex items-center justify-between p-3 bg-white hover:bg-purple-50/50 rounded-xl border border-slate-200 text-left transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-lg group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Remedial & Enrichment</div>
                    <div className="text-[11px] text-slate-500">Special learner support & talent track</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="mt-4 p-3 bg-white/70 rounded-xl border border-indigo-200 text-xs text-indigo-900">
            <span className="font-semibold">Compliance Note:</span> All lesson plans and curriculum revisions maintain audit trails and adhere to National Curriculum Framework guidelines.
          </div>
        </div>
      </div>
    </div>
  );
};
