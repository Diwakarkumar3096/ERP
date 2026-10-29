import React, { useEffect, useState } from 'react';
import {
  Award,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Layers,
  BookOpen
} from 'lucide-react';
import { LearningOutcome } from './AcademicCommon';

export const LearningOutcomesView: React.FC = () => {
  const [outcomes, setOutcomes] = useState<LearningOutcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    class_id: '',
    subject_id: '',
    code: '',
    title: '',
    description: '',
    competency_category: 'APPLICATION',
    expected_level: 'INTERMEDIATE',
  });

  const fetchOutcomes = async () => {
    setLoading(true);
    try {
      const url = selectedClassId
        ? `/api/academic/learning-outcomes?classId=${selectedClassId}`
        : '/api/academic/learning-outcomes';
      const res = await fetch(url);
      const data = await res.json();
      setOutcomes(data.outcomes || data.data || []);
    } catch (err) {
      console.error('Failed to load learning outcomes', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
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
      console.error('Failed to load classes and subjects for outcomes', err);
    }
  };

  useEffect(() => {
    fetchMetadata();
    fetchOutcomes();
  }, [selectedClassId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/academic/learning-outcomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setFormData({
          ...formData,
          code: '',
          title: '',
          description: '',
        });
        fetchOutcomes();
      }
    } catch (err) {
      console.error('Failed to create outcome', err);
    }
  };

  const filtered = outcomes.filter((o) => {
    const matchesSearch =
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.code.toLowerCase().includes(search.toLowerCase()) ||
      (o.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'ALL' || o.competency_category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getLevelBadge = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'MASTERY':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">
            Mastery
          </span>
        );
      case 'ADVANCED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800">
            Advanced
          </span>
        );
      case 'INTERMEDIATE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
            Intermediate
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
            Foundational
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
              Learning Outcomes & Competency Matrix
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Bloom's taxonomy and NEP 2020 cognitive domain benchmarks linked with curriculum topics
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Learning Outcome
          </button>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Class Scope
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Competency Domain
            </label>
            <div className="relative">
              <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-8 text-xs font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Competencies</option>
                <option value="REMEMBERING">Remembering & Recall</option>
                <option value="UNDERSTANDING">Conceptual Understanding</option>
                <option value="APPLICATION">Practical Application</option>
                <option value="ANALYSIS">Critical Analysis</option>
                <option value="EVALUATION">Evaluation & Critique</option>
                <option value="CREATION">Creation & Synthesis</option>
                <option value="PROBLEM_SOLVING">Problem Solving</option>
                <option value="COMMUNICATION">Verbal & Written Expression</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search code or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 text-xs font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Outcomes */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Award className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
          Loading learning outcomes...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="font-semibold text-slate-700">No learning outcomes found</p>
          <p className="text-xs text-slate-500 mt-1">
            Click 'Add Learning Outcome' above to define measurable behavioral criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    {item.code}
                  </span>
                  {getLevelBadge(item.expected_level)}
                </div>

                <div className="mt-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                    <span>{item.class_name}</span>
                    <span>•</span>
                    <span>{item.subject_name}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mt-1">{item.title}</h3>
                  <p className="text-xs text-slate-600 mt-1.5 line-clamp-3">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                  {item.competency_category}
                </span>

                <span className="text-slate-500 font-medium text-[11px] flex items-center gap-1">
                  <Layers className="w-3 h-3 text-indigo-500" />
                  {item.mapped_topics_count || 1} Mapped Topics
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Learning Outcome */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-indigo-700 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">Add Learning Outcome</h3>
              <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Class *
                  </label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject *
                  </label>
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Outcome Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LO-M5-02"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cognitive Domain *
                  </label>
                  <select
                    value={formData.competency_category}
                    onChange={(e) =>
                      setFormData({ ...formData, competency_category: e.target.value })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  >
                    <option value="REMEMBERING">Remembering</option>
                    <option value="UNDERSTANDING">Understanding</option>
                    <option value="APPLICATION">Application</option>
                    <option value="ANALYSIS">Analysis</option>
                    <option value="EVALUATION">Evaluation</option>
                    <option value="CREATION">Creation</option>
                    <option value="PROBLEM_SOLVING">Problem Solving</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expected Level *
                  </label>
                  <select
                    value={formData.expected_level}
                    onChange={(e) => setFormData({ ...formData, expected_level: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  >
                    <option value="FOUNDATIONAL">Foundational</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                    <option value="MASTERY">Mastery</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Outcome Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Solves real-world word problems using fraction arithmetic"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observable Behavior / Rubric Criteria
                </label>
                <textarea
                  rows={3}
                  placeholder="Student independently identifies equivalent denominators, performs computation, and articulates steps in word problem context."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Save Outcome
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
