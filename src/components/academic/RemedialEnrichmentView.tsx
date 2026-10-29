import React, { useEffect, useState } from 'react';
import {
  GraduationCap,
  Award,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { RemedialSupportPlan, EnrichmentLearningPlan } from './AcademicCommon';

interface RemedialEnrichmentViewProps {
  onOpenAIAssistant: () => void;
}

export const RemedialEnrichmentView: React.FC<RemedialEnrichmentViewProps> = ({
  onOpenAIAssistant,
}) => {
  const [activeTab, setActiveTab] = useState<'REMEDIAL' | 'ENRICHMENT'>('REMEDIAL');
  const [remedialPlans, setRemedialPlans] = useState<RemedialSupportPlan[]>([]);
  const [enrichmentPlans, setEnrichmentPlans] = useState<EnrichmentLearningPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showRemedialModal, setShowRemedialModal] = useState(false);
  const [showEnrichmentModal, setShowEnrichmentModal] = useState(false);

  // Dropdowns
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  // Forms
  const [remedialForm, setRemedialForm] = useState({
    student_id: '',
    subject_id: '',
    support_reason: 'Struggles with fraction arithmetic and denominator equalization.',
    intervention_plan: 'Bi-weekly 30-min guided manipulative fraction strips practice.',
    start_date: new Date().toISOString().split('T')[0],
    review_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    target_outcome: 'Achieve at least Level 3 (Proficient) on next formative check.',
  });

  const [enrichmentForm, setEnrichmentForm] = useState({
    student_id: '',
    subject_id: '',
    program_type: 'OLYMPIAD_MATH',
    title: 'Junior Mathematics Olympiad Intensive Track',
    activity_description: 'Advanced non-routine problem solving, combinatorics, and geometry.',
    start_date: new Date().toISOString().split('T')[0],
    target_completion_date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [remRes, enrRes] = await Promise.all([
        fetch('/api/academic/remedial-plans'),
        fetch('/api/academic/enrichment-plans'),
      ]);
      const [remData, enrData] = await Promise.all([remRes.json(), enrRes.json()]);
      setRemedialPlans(remData.remedialPlans || remData.data || []);
      setEnrichmentPlans(enrData.enrichmentPlans || enrData.data || []);
    } catch (err) {
      console.error('Failed to load remedial/enrichment plans', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const res = await fetch('/api/academic/curriculums');
      const data = await res.json();
      const currList = data.curriculums || data.data || [];
      if (currList.length > 0) {
        const mapsRes = await fetch(`/api/academic/subject-maps?curriculumId=${currList[0].id}`);
        const mapsData = await mapsRes.json();
        const mapList = mapsData.subjectMaps || mapsData.data || [];
        if (mapList.length > 0) {
          const uniqueSubjects: any[] = [];
          const seenSub = new Set();
          mapList.forEach((m: any) => {
            if (!seenSub.has(m.subject_id)) {
              seenSub.add(m.subject_id);
              uniqueSubjects.push({ id: m.subject_id, name: m.subject_name });
            }
          });
          setSubjects(uniqueSubjects);
          if (uniqueSubjects.length > 0) {
            setRemedialForm((prev) => ({ ...prev, subject_id: uniqueSubjects[0].id }));
            setEnrichmentForm((prev) => ({ ...prev, subject_id: uniqueSubjects[0].id }));
          }
        }
      }

      // Fetch students for dropdown
      const stuRes = await fetch('/api/academic/formative-assessments');
      const stuData = await stuRes.json();
      const assList = stuData.assessments || stuData.data || [];
      if (assList.length > 0) {
        const firstAssId = assList[0].id;
        const scoresRes = await fetch(`/api/academic/formative-assessments/${firstAssId}/scores`);
        const scoresData = await scoresRes.json();
        const stuList = scoresData.scores || scoresData.data || [];
        if (stuList.length > 0) {
          setStudents(stuList);
          setRemedialForm((prev) => ({ ...prev, student_id: stuList[0].student_id }));
          setEnrichmentForm((prev) => ({ ...prev, student_id: stuList[0].student_id }));
        }
      }
    } catch (err) {
      console.error('Failed to load students/subjects for remedial form', err);
    }
  };

  useEffect(() => {
    fetchDropdowns();
    fetchData();
  }, []);

  const handleCreateRemedial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/academic/remedial-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(remedialForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowRemedialModal(false);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to create remedial plan', err);
    }
  };

  const handleCreateEnrichment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/academic/enrichment-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichmentForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowEnrichmentModal(false);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to create enrichment plan', err);
    }
  };

  const filteredRemedial = remedialPlans.filter(
    (p) =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      p.admission_number.toLowerCase().includes(search.toLowerCase()) ||
      p.subject_name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEnrichment = enrichmentPlans.filter(
    (p) =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      p.admission_number.toLowerCase().includes(search.toLowerCase()) ||
      p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner and Navigation Tabs */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Differentiated Learner Support & Talent Enrichment
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalized academic scaffolding for struggling students and advanced Olympiad/talent accelerator tracks
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenAIAssistant}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-bold rounded-lg text-xs shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Differentiation Strategy
            </button>

            {activeTab === 'REMEDIAL' ? (
              <button
                onClick={() => setShowRemedialModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" /> New Remedial Plan
              </button>
            ) : (
              <button
                onClick={() => setShowEnrichmentModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" /> New Enrichment Track
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('REMEDIAL')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'REMEDIAL'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Remedial Support Plans ({remedialPlans.length})
            </button>
            <button
              onClick={() => setActiveTab('ENRICHMENT')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ENRICHMENT'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4" />
              Enrichment & Olympiad Tracks ({enrichmentPlans.length})
            </button>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 text-xs font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <GraduationCap className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
          Loading student learning plans...
        </div>
      ) : activeTab === 'REMEDIAL' ? (
        filteredRemedial.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-slate-700">No remedial support plans found</p>
            <p className="text-xs text-slate-500 mt-1">
              Create an individual intervention plan for students requiring extra academic coaching.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRemedial.map((plan) => (
              <div
                key={plan.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {plan.first_name} {plan.last_name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {plan.admission_number}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {plan.class_name || 'Enrolled Class'} • Subject:{' '}
                      <strong className="text-slate-700">{plan.subject_name}</strong>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {plan.status}
                  </span>
                </div>

                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-xs space-y-1">
                  <div className="font-semibold text-amber-950">Reason for Support:</div>
                  <p className="text-amber-900">{plan.support_reason}</p>
                </div>

                <div className="text-xs text-slate-700 space-y-1">
                  <div>
                    <strong>Action Plan:</strong> {plan.intervention_plan}
                  </div>
                  {plan.target_outcome && (
                    <div>
                      <strong>Target:</strong> {plan.target_outcome}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Sessions: <strong>{plan.sessions_conducted}</strong> conducted</span>
                  <span>Review: {new Date(plan.review_date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        filteredEnrichment.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Award className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-slate-700">No enrichment tracks found</p>
            <p className="text-xs text-slate-500 mt-1">
              Add advanced learner pathways for science fairs, robotics, or Olympiad competitions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEnrichment.map((plan) => (
              <div
                key={plan.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {plan.first_name} {plan.last_name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {plan.admission_number}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Program: <strong className="text-amber-800">{plan.program_type}</strong> • {plan.subject_name}
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> {plan.status}
                  </span>
                </div>

                <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-100 text-xs space-y-1">
                  <div className="font-bold text-slate-900">{plan.title}</div>
                  <p className="text-slate-700">{plan.activity_description}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Mentor: {plan.assigned_mentor_name || 'Academic Lead'}</span>
                  <span>
                    Target:{' '}
                    {plan.target_completion_date
                      ? new Date(plan.target_completion_date).toLocaleDateString()
                      : 'Ongoing'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal: Create Remedial Plan */}
      {showRemedialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-indigo-700 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">New Remedial Support Plan</h3>
              <button
                onClick={() => setShowRemedialModal(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateRemedial} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student *
                </label>
                <select
                  required
                  value={remedialForm.student_id}
                  onChange={(e) =>
                    setRemedialForm({ ...remedialForm, student_id: e.target.value })
                  }
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                >
                  <option value="">Select Student...</option>
                  {students.map((s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.first_name} {s.last_name} ({s.admission_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject *
                </label>
                <select
                  required
                  value={remedialForm.subject_id}
                  onChange={(e) =>
                    setRemedialForm({ ...remedialForm, subject_id: e.target.value })
                  }
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Support / Learning Gap *
                </label>
                <textarea
                  required
                  rows={2}
                  value={remedialForm.support_reason}
                  onChange={(e) =>
                    setRemedialForm({ ...remedialForm, support_reason: e.target.value })
                  }
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intervention Action Plan *
                </label>
                <textarea
                  required
                  rows={2}
                  value={remedialForm.intervention_plan}
                  onChange={(e) =>
                    setRemedialForm({ ...remedialForm, intervention_plan: e.target.value })
                  }
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={remedialForm.start_date}
                    onChange={(e) =>
                      setRemedialForm({ ...remedialForm, start_date: e.target.value })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Review Date</label>
                  <input
                    type="date"
                    required
                    value={remedialForm.review_date}
                    onChange={(e) =>
                      setRemedialForm({ ...remedialForm, review_date: e.target.value })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Outcome</label>
                <input
                  type="text"
                  value={remedialForm.target_outcome}
                  onChange={(e) =>
                    setRemedialForm({ ...remedialForm, target_outcome: e.target.value })
                  }
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowRemedialModal(false)}
                  className="px-3 py-1.5 border text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Enrichment Plan */}
      {showEnrichmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-amber-600 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">New Enrichment Track</h3>
              <button
                onClick={() => setShowEnrichmentModal(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateEnrichment} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student *
                </label>
                <select
                  required
                  value={enrichmentForm.student_id}
                  onChange={(e) =>
                    setEnrichmentForm({ ...enrichmentForm, student_id: e.target.value })
                  }
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                >
                  <option value="">Select Student...</option>
                  {students.map((s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.first_name} {s.last_name} ({s.admission_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject *
                  </label>
                  <select
                    required
                    value={enrichmentForm.subject_id}
                    onChange={(e) =>
                      setEnrichmentForm({ ...enrichmentForm, subject_id: e.target.value })
                    }
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Program Type *
                  </label>
                  <select
                    value={enrichmentForm.program_type}
                    onChange={(e) =>
                      setEnrichmentForm({ ...enrichmentForm, program_type: e.target.value })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  >
                    <option value="OLYMPIAD_MATH">Olympiad Math</option>
                    <option value="ADVANCED_SCIENCE">Advanced Science</option>
                    <option value="ROBOTICS_CODING">Robotics & AI</option>
                    <option value="CREATIVE_WRITING">Creative Writing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Track Title *
                </label>
                <input
                  type="text"
                  required
                  value={enrichmentForm.title}
                  onChange={(e) => setEnrichmentForm({ ...enrichmentForm, title: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Activity Description
                </label>
                <textarea
                  rows={2}
                  value={enrichmentForm.activity_description}
                  onChange={(e) =>
                    setEnrichmentForm({ ...enrichmentForm, activity_description: e.target.value })
                  }
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={enrichmentForm.start_date}
                    onChange={(e) =>
                      setEnrichmentForm({ ...enrichmentForm, start_date: e.target.value })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={enrichmentForm.target_completion_date}
                    onChange={(e) =>
                      setEnrichmentForm({
                        ...enrichmentForm,
                        target_completion_date: e.target.value,
                      })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowEnrichmentModal(false)}
                  className="px-3 py-1.5 border text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Create Track
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
