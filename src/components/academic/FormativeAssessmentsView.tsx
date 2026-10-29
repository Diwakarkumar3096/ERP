import React, { useEffect, useState } from 'react';
import {
  Award,
  Plus,
  CheckCircle,
  Search,
  Filter,
  Users,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { FormativeAssessment } from './AcademicCommon';

export const FormativeAssessmentsView: React.FC = () => {
  const [assessments, setAssessments] = useState<FormativeAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState<FormativeAssessment | null>(null);
  const [studentsScores, setStudentsScores] = useState<any[]>([]);
  const [loadingScores, setLoadingScores] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    class_id: '',
    subject_id: '',
    title: '',
    assessment_type: 'EXIT_TICKET',
    conducted_date: new Date().toISOString().split('T')[0],
    max_score: 10,
    rubric_criteria: 'Standard rubric for conceptual understanding and speed',
  });

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/academic/formative-assessments');
      const data = await res.json();
      setAssessments(data.assessments || data.data || []);
    } catch (err) {
      console.error('Failed to load formative assessments', err);
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
    } catch (err) {
      console.error('Failed to load metadata for assessments', err);
    }
  };

  useEffect(() => {
    fetchDropdownData();
    fetchAssessments();
  }, []);

  const handleSelectAssessment = async (item: FormativeAssessment) => {
    setSelectedAssessment(item);
    setLoadingScores(true);
    try {
      // Fetch assessment details and students enrolled in this class
      const res = await fetch(`/api/academic/formative-assessments/${item.id}/scores`);
      const data = await res.json();
      setStudentsScores(data.scores || data.data || []);
    } catch (err) {
      console.error('Failed to load scores', err);
    } finally {
      setLoadingScores(false);
    }
  };

  const handleScoreUpdate = async (studentId: string, score: number, level: string, feedback: string) => {
    if (!selectedAssessment) return;
    try {
      const res = await fetch(`/api/academic/formative-assessments/${selectedAssessment.id}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          score_obtained: score,
          performance_level: level,
          qualitative_feedback: feedback,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh scores
        handleSelectAssessment(selectedAssessment);
      }
    } catch (err) {
      console.error('Failed to save score', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/academic/formative-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        fetchAssessments();
      }
    } catch (err) {
      console.error('Failed to create assessment', err);
    }
  };

  const filtered = assessments.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.class_name.toLowerCase().includes(search.toLowerCase()) ||
      a.subject_name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const getPerformanceBadge = (level?: string) => {
    switch (level) {
      case 'LEVEL_4':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
            Level 4 • Exemplary
          </span>
        );
      case 'LEVEL_3':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            Level 3 • Proficient
          </span>
        );
      case 'LEVEL_2':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
            Level 2 • Approaching
          </span>
        );
      case 'LEVEL_1':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
            Level 1 • Below Basic
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
            Ungraded
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Formative Assessments & Continuous Evaluation
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Low-stakes exit tickets, diagnostic quizzes, and 4-tier rubric mastery evaluation
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> New Formative Assessment
          </button>
        </div>

        {/* Search */}
        <div className="pt-2 border-t border-slate-100">
          <div className="relative max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search assessment, class, or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 text-xs font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assessments List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <Award className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading formative assessments...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-slate-700">No formative assessments recorded</p>
              <p className="text-xs text-slate-500 mt-1">
                Create an exit ticket or quiz to assess student comprehension.
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const isSelected = selectedAssessment?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectAssessment(item)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-50 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold text-xs">
                          {item.class_name}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold text-xs">
                          {item.subject_name}
                        </span>
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-medium text-[11px] border border-amber-200">
                          {item.assessment_type}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm mt-1">{item.title}</h3>
                      <p className="text-xs text-slate-500">
                        Date: {new Date(item.conducted_date).toLocaleDateString()} • Max Score: {item.max_score}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-indigo-600">
                        {item.average_score != null ? `${Number(item.average_score).toFixed(1)} / ${item.max_score}` : '—'}
                      </div>
                      <div className="text-[11px] text-slate-400">Class Average</div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {item.assessed_students_count || 0} Students Evaluated
                    </span>
                    <span className="text-indigo-600 font-semibold flex items-center gap-1 text-xs">
                      Grade Submissions <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Student Scores Drawer */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          {selectedAssessment ? (
            <>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600 uppercase">
                    Grade Submissions
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Max: {selectedAssessment.max_score}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {selectedAssessment.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedAssessment.class_name} • {selectedAssessment.subject_name}
                </p>
              </div>

              {loadingScores ? (
                <p className="text-xs text-slate-400 text-center py-8">Loading student scores...</p>
              ) : studentsScores.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  No student roster records found for this class.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {studentsScores.map((stu) => {
                    return (
                      <div
                        key={stu.student_id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-800">
                              {stu.first_name} {stu.last_name}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Adm: {stu.admission_number}
                            </span>
                          </div>
                          {getPerformanceBadge(stu.performance_level)}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500">Score</label>
                            <input
                              type="number"
                              min="0"
                              max={selectedAssessment.max_score}
                              defaultValue={stu.score_obtained ?? ''}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) {
                                  const lvl =
                                    val >= selectedAssessment.max_score * 0.85
                                      ? 'LEVEL_4'
                                      : val >= selectedAssessment.max_score * 0.7
                                      ? 'LEVEL_3'
                                      : val >= selectedAssessment.max_score * 0.5
                                      ? 'LEVEL_2'
                                      : 'LEVEL_1';
                                  handleScoreUpdate(
                                    stu.student_id,
                                    val,
                                    lvl,
                                    stu.qualitative_feedback || ''
                                  );
                                }
                              }}
                              className="w-full text-xs font-bold border border-slate-300 rounded p-1 bg-white"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-500">Level</label>
                            <select
                              value={stu.performance_level || 'LEVEL_3'}
                              onChange={(e) =>
                                handleScoreUpdate(
                                  stu.student_id,
                                  stu.score_obtained || 0,
                                  e.target.value,
                                  stu.qualitative_feedback || ''
                                )
                              }
                              className="w-full text-xs border border-slate-300 rounded p-1 bg-white"
                            >
                              <option value="LEVEL_1">Level 1: Below Basic</option>
                              <option value="LEVEL_2">Level 2: Approaching</option>
                              <option value="LEVEL_3">Level 3: Proficient</option>
                              <option value="LEVEL_4">Level 4: Advanced</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-600">Select an Assessment</p>
              <p className="text-xs text-slate-400 mt-1">
                Choose an assessment on the left to grade student performance.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Assessment */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-indigo-700 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">New Formative Assessment</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
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
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assessment Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Exit Ticket: Fraction Addition Mastery"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assessment Type *
                  </label>
                  <select
                    value={formData.assessment_type}
                    onChange={(e) => setFormData({ ...formData, assessment_type: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  >
                    <option value="EXIT_TICKET">Exit Ticket</option>
                    <option value="QUIZ">Diagnostic Quiz</option>
                    <option value="OBSERVATION">Classroom Observation</option>
                    <option value="ORAL_CHECK">Oral / Viva Check</option>
                    <option value="PEER_EVAL">Peer Evaluation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Score</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.max_score}
                    onChange={(e) =>
                      setFormData({ ...formData, max_score: parseInt(e.target.value) || 10 })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Conducted Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.conducted_date}
                  onChange={(e) => setFormData({ ...formData, conducted_date: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Create Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
