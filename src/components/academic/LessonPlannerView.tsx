import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Plus,
  Sparkles,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Send,
  ShieldCheck,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AcademicLessonPlan } from './AcademicCommon';

interface LessonPlannerViewProps {
  onOpenAIAssistant: () => void;
}

export const LessonPlannerView: React.FC<LessonPlannerViewProps> = ({ onOpenAIAssistant }) => {
  const [plans, setPlans] = useState<AcademicLessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    class_id: '',
    section_id: '',
    subject_id: '',
    topic_id: '',
    lesson_title: '',
    plan_date: new Date().toISOString().split('T')[0],
    period_number: 'Period 3',
    duration_minutes: 45,
    learning_objectives: '',
    learning_outcomes: '',
    teaching_methodology: '5E Pedagogical Model (Engage, Explore, Explain, Elaborate, Evaluate)',
    pedagogical_steps: JSON.stringify({
      engage: 'Hook question or real-world visual demonstration.',
      explore: 'Guided inquiry activity in small pairs.',
      explain: 'Teacher explanation of mathematical/scientific principle.',
      elaborate: 'Application exercise connecting concept to daily life.',
      evaluate: 'Formative exit ticket or 2-minute diagnostic check.',
    }, null, 2),
    differentiation_strategy: JSON.stringify({
      struggling: 'Visual fraction strips and peer buddy support.',
      advanced: 'Open-ended extension problem solving challenges.',
    }, null, 2),
    classroom_activities: 'Hands-on manipulative exercises and paired problem solving.',
    homework_summary: 'Practice exercise 4.2 questions 1-5.',
    formative_assessment_summary: 'Exit ticket quiz: 3 diagnostic questions.',
    status: 'PLANNED',
  });

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const url = statusFilter !== 'ALL'
        ? `/api/academic/lesson-plans?status=${statusFilter}`
        : '/api/academic/lesson-plans';
      const res = await fetch(url);
      const data = await res.json();
      setPlans(data.lessonPlans || data.data || []);
    } catch (err) {
      console.error('Failed to load lesson plans', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const res = await fetch('/api/academic/curriculums');
      const data = await res.json();
      const currList = data.curriculums || data.data || [];
      if (currList.length > 0) {
        const mapsRes = await fetch(`/api/academic/subject-maps?curriculumId=${currList[0].id}`);
        const mapsData = await mapsRes.json();
        const mapList = mapsData.subjectMaps || mapsData.data || [];
        if (mapList.length > 0) {
          const uniqueClasses: any[] = [];
          const uniqueSubjects: any[] = [];
          const seenCls = new Set();
          const seenSub = new Set();

          mapList.forEach((m: any) => {
            if (!seenCls.has(m.class_id)) {
              seenCls.add(m.class_id);
              uniqueClasses.push({ id: m.class_id, name: m.class_name });
            }
            if (!seenSub.has(m.subject_id)) {
              seenSub.add(m.subject_id);
              uniqueSubjects.push({ id: m.subject_id, name: m.subject_name });
            }
          });

          setClasses(uniqueClasses);
          setSubjects(uniqueSubjects);

          if (uniqueClasses.length > 0) {
            setFormData((prev) => ({
              ...prev,
              class_id: uniqueClasses[0].id,
              subject_id: uniqueSubjects[0]?.id || '',
            }));
          }
        }
      }

      // Fetch sample topics
      const topRes = await fetch('/api/academic/topics');
      const topData = await topRes.json();
      const topList = topData.topics || topData.data || [];
      if (topList.length > 0) {
        setTopics(topList);
        setFormData((prev) => ({ ...prev, topic_id: topList[0].id }));
      }
    } catch (err) {
      console.error('Failed to load metadata for lesson planner', err);
    }
  };

  useEffect(() => {
    fetchDropdownData();
    fetchPlans();
  }, [statusFilter]);

  const handleStatusChange = async (planId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/academic/lesson-plans/${planId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPlans();
      }
    } catch (err) {
      console.error('Failed to change lesson plan status', err);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/academic/lesson-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        fetchPlans();
      }
    } catch (err) {
      console.error('Failed to create lesson plan', err);
    }
  };

  const parsePedagogicalSteps = (stepsStr?: string) => {
    if (!stepsStr) return null;
    try {
      return JSON.parse(stepsStr);
    } catch {
      return stepsStr;
    }
  };

  const parseDifferentiation = (diffStr?: string) => {
    if (!diffStr) return null;
    try {
      return JSON.parse(diffStr);
    } catch {
      return diffStr;
    }
  };

  const filtered = plans.filter((p) => {
    const matchesSearch =
      p.lesson_title.toLowerCase().includes(search.toLowerCase()) ||
      p.teacher_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.subject_name || '').toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-3 h-3" /> Delivered
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <ShieldCheck className="w-3 h-3" /> Approved
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" /> Review Pending
          </span>
        );
      case 'DEFERRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            Deferred
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
            Planned
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              5E Model Lesson Planning & Review Workflow
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Structured lesson design with differentiation, formative exit tickets, and supervisor approval logs
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenAIAssistant}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-bold rounded-lg text-xs shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Pedagogical Draft
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> New Lesson Plan
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Status Filter
            </label>
            <div className="relative">
              <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-8 text-xs font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="PLANNED">Planned</option>
                <option value="COMPLETED">Completed / Delivered</option>
                <option value="DEFERRED">Deferred</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Search Plans
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search title, teacher, or subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 text-xs font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lesson Plans List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Calendar className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
          Loading lesson plans...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="font-semibold text-slate-700">No lesson plans found</p>
          <p className="text-xs text-slate-500 mt-1">
            Click 'New Lesson Plan' or use the AI Assistant to generate a structured 5E plan.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((plan) => {
            const isExpanded = expandedPlanId === plan.id;
            const steps = parsePedagogicalSteps(plan.pedagogical_steps);
            const diff = parseDifferentiation(plan.differentiation_strategy);

            return (
              <div
                key={plan.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all"
              >
                {/* Main Card Header */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold text-xs">
                        {plan.class_name} {plan.section_name && `(${plan.section_name})`}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold text-xs">
                        {plan.subject_name}
                      </span>
                      {getStatusBadge(plan.status)}
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500 font-medium">
                        {new Date(plan.plan_date).toLocaleDateString()} • {plan.period_number || 'Period 1'} ({plan.duration_minutes} min)
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {plan.lesson_title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Educator: <strong className="text-slate-700">{plan.teacher_name}</strong>
                      {plan.topic_name && ` • Topic: ${plan.topic_name}`}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 shrink-0">
                    {plan.status === 'DRAFT' && (
                      <button
                        onClick={() => handleStatusChange(plan.id, 'UNDER_REVIEW')}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" /> Submit Review
                      </button>
                    )}
                    {plan.status === 'UNDER_REVIEW' && (
                      <button
                        onClick={() => handleStatusChange(plan.id, 'APPROVED')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Approve
                      </button>
                    )}
                    {(plan.status === 'APPROVED' || plan.status === 'PLANNED') && (
                      <button
                        onClick={() => handleStatusChange(plan.id, 'COMPLETED')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Mark Delivered
                      </button>
                    )}

                    <button
                      onClick={() => window.print()}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200"
                      title="Print Lesson Plan"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      {isExpanded ? (
                        <>Less <ChevronUp className="w-3.5 h-3.5" /></>
                      ) : (
                        <>Details <ChevronDown className="w-3.5 h-3.5" /></>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded 5E Steps & Differentiation */}
                {isExpanded && (
                  <div className="p-5 bg-slate-50/80 border-t border-slate-200 space-y-4">
                    {/* Objectives */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Learning Objectives & Expected Outcomes
                      </h4>
                      <p className="text-xs text-slate-700">{plan.learning_objectives}</p>
                    </div>

                    {/* 5E Pedagogical Steps */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                          5E Pedagogical Model Implementation
                        </h4>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Methodology: {plan.teaching_methodology}
                        </span>
                      </div>

                      {typeof steps === 'object' && steps !== null ? (
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                          <div className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-100">
                            <span className="text-xs font-bold text-indigo-900 block mb-1">
                              1. Engage (Hook)
                            </span>
                            <p className="text-[11px] text-indigo-950">{steps.engage || '—'}</p>
                          </div>

                          <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-100">
                            <span className="text-xs font-bold text-blue-900 block mb-1">
                              2. Explore (Hands-on)
                            </span>
                            <p className="text-[11px] text-blue-950">{steps.explore || '—'}</p>
                          </div>

                          <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-100">
                            <span className="text-xs font-bold text-emerald-900 block mb-1">
                              3. Explain (Concepts)
                            </span>
                            <p className="text-[11px] text-emerald-950">{steps.explain || '—'}</p>
                          </div>

                          <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-100">
                            <span className="text-xs font-bold text-amber-900 block mb-1">
                              4. Elaborate (Apply)
                            </span>
                            <p className="text-[11px] text-amber-950">{steps.elaborate || '—'}</p>
                          </div>

                          <div className="p-3 bg-rose-50/70 rounded-lg border border-rose-100">
                            <span className="text-xs font-bold text-rose-900 block mb-1">
                              5. Evaluate (Check)
                            </span>
                            <p className="text-[11px] text-rose-950">{steps.evaluate || '—'}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-700 whitespace-pre-wrap">
                          {String(plan.pedagogical_steps)}
                        </p>
                      )}
                    </div>

                    {/* Differentiation and Activities */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Inclusive Differentiation Strategies
                        </h4>
                        {typeof diff === 'object' && diff !== null ? (
                          <div className="space-y-1.5 text-xs text-slate-700">
                            {diff.struggling && (
                              <p>
                                <strong className="text-amber-800">For Struggling Learners:</strong>{' '}
                                {diff.struggling}
                              </p>
                            )}
                            {diff.advanced && (
                              <p>
                                <strong className="text-indigo-800">For Advanced Learners:</strong>{' '}
                                {diff.advanced}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-700">
                            {plan.differentiation_strategy || 'Universal design for learning.'}
                          </p>
                        )}
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Homework & Exit Assessment
                        </h4>
                        <p className="text-xs text-slate-700">
                          <strong>Assessment:</strong>{' '}
                          {plan.formative_assessment_summary || 'Standard classroom observation.'}
                        </p>
                        <p className="text-xs text-slate-700">
                          <strong>Homework:</strong>{' '}
                          {plan.homework_summary || 'No written homework.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Lesson Plan */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
            <div className="p-4 bg-indigo-700 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-base">New 5E Lesson Plan</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Class *</label>
                  <select
                    required
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
                  <select
                    required
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.plan_date}
                    onChange={(e) => setFormData({ ...formData, plan_date: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (min)</label>
                  <input
                    type="number"
                    required
                    min={15}
                    value={formData.duration_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration_minutes: parseInt(e.target.value) || 45,
                      })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Addition of Unlike Fractions via Concrete Fraction Strips"
                  value={formData.lesson_title}
                  onChange={(e) => setFormData({ ...formData, lesson_title: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Curricular Topic (optional)
                </label>
                <select
                  value={formData.topic_id}
                  onChange={(e) => setFormData({ ...formData, topic_id: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                >
                  <option value="">Select Topic...</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Learning Objectives *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="By the end of the lesson, students will be able to..."
                  value={formData.learning_objectives}
                  onChange={(e) => setFormData({ ...formData, learning_objectives: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  5E Pedagogical Steps (JSON or Plain Text)
                </label>
                <textarea
                  rows={4}
                  value={formData.pedagogical_steps}
                  onChange={(e) => setFormData({ ...formData, pedagogical_steps: e.target.value })}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Differentiation Strategy (Struggling vs Advanced)
                </label>
                <textarea
                  rows={2}
                  value={formData.differentiation_strategy}
                  onChange={(e) =>
                    setFormData({ ...formData, differentiation_strategy: e.target.value })
                  }
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Formative Exit Ticket / Assessment
                  </label>
                  <input
                    type="text"
                    value={formData.formative_assessment_summary}
                    onChange={(e) =>
                      setFormData({ ...formData, formative_assessment_summary: e.target.value })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Homework
                  </label>
                  <input
                    type="text"
                    value={formData.homework_summary}
                    onChange={(e) =>
                      setFormData({ ...formData, homework_summary: e.target.value })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Save Lesson Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
