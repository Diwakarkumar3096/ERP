import React, { useEffect, useState } from 'react';
import {
  Layers,
  Plus,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Award,
  Sparkles,
  Search,
  Filter
} from 'lucide-react';
import {
  CurriculumUnit,
  CurriculumChapter,
  CurriculumTopic
} from './AcademicCommon';

interface UnitsTopicsViewProps {
  onOpenAIAssistant?: () => void;
}

export const UnitsTopicsView: React.FC<UnitsTopicsViewProps> = ({ onOpenAIAssistant }) => {
  const [curriculums, setCurriculums] = useState<any[]>([]);
  const [subjectMaps, setSubjectMaps] = useState<any[]>([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>('');
  const [selectedSubjectMapId, setSelectedSubjectMapId] = useState<string>('');

  const [units, setUnits] = useState<CurriculumUnit[]>([]);
  const [chapters, setChapters] = useState<{ [unitId: string]: CurriculumChapter[] }>({});
  const [topics, setTopics] = useState<{ [chapterId: string]: CurriculumTopic[] }>({});

  const [loading, setLoading] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState<{ [unitId: string]: boolean }>({});
  const [expandedChapters, setExpandedChapters] = useState<{ [chapterId: string]: boolean }>({});

  const [search, setSearch] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL');

  // Modals
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [targetUnitId, setTargetUnitId] = useState<string>('');
  const [targetChapterId, setTargetChapterId] = useState<string>('');

  // Form inputs
  const [unitForm, setUnitForm] = useState({
    unit_number: 1,
    title: '',
    description: '',
    weightage_marks: 10,
    planned_periods: 12,
  });

  const [chapterForm, setChapterForm] = useState({
    chapter_number: 1,
    title: '',
    description: '',
    estimated_teaching_hours: 8,
  });

  const [topicForm, setTopicForm] = useState({
    title: '',
    topic_code: '',
    description: '',
    learning_objectives: '',
    competencies: '',
    estimated_periods: 2,
    difficulty_level: 'MEDIUM',
    recommended_activities: '',
    recommended_resources: '',
    prerequisites: '',
  });

  // Initial load
  useEffect(() => {
    fetchInitialHierarchy();
  }, []);

  const fetchInitialHierarchy = async () => {
    try {
      const res = await fetch('/api/academic/curriculums');
      const data = await res.json();
      const list = data.curriculums || data.data || [];
      if (list.length > 0) {
        setCurriculums(list);
        const firstCurr = list[0];
        setSelectedCurriculumId(firstCurr.id);
        fetchSubjectMaps(firstCurr.id);
      }
    } catch (err) {
      console.error('Failed to load initial curriculums', err);
    }
  };

  const fetchSubjectMaps = async (currId: string) => {
    try {
      const res = await fetch(`/api/academic/subject-maps?curriculumId=${currId}`);
      const data = await res.json();
      const list = data.subjectMaps || data.data || [];
      if (list.length > 0) {
        setSubjectMaps(list);
        setSelectedSubjectMapId(list[0].id);
        fetchUnits(list[0].id);
      } else {
        setSubjectMaps([]);
        setUnits([]);
      }
    } catch (err) {
      console.error('Failed to load subject maps', err);
    }
  };

  const fetchUnits = async (mapId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/academic/units?subjectMapId=${mapId}`);
      const data = await res.json();
      const list = data.units || data.data || [];
      setUnits(list);
      // Automatically fetch topics for all units
      list.forEach((u: CurriculumUnit) => {
        fetchTopicsForUnit(u.id);
      });
    } catch (err) {
      console.error('Failed to load units', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopicsForUnit = async (unitId: string) => {
    try {
      const res = await fetch(`/api/academic/topics?unitId=${unitId}`);
      const data = await res.json();
      const list = data.topics || data.data || [];
      // Group by chapter
      const grouped: { [chapId: string]: CurriculumTopic[] } = {};
      const chapList: { [chapId: string]: CurriculumChapter } = {};

      list.forEach((top: CurriculumTopic) => {
        if (!grouped[top.chapter_id]) {
          grouped[top.chapter_id] = [];
        }
        grouped[top.chapter_id].push(top);

          if (!chapList[top.chapter_id]) {
            chapList[top.chapter_id] = {
              id: top.chapter_id,
              unit_id: unitId,
              chapter_number: top.chapter_number || 1,
              title: top.chapter_title || 'Chapter',
              estimated_teaching_hours: 6,
            };
          }
        });

        setTopics((prev) => ({ ...prev, ...grouped }));
        setChapters((prev) => ({
          ...prev,
          [unitId]: Object.values(chapList).sort((a, b) => a.chapter_number - b.chapter_number),
        }));

        // Expand first unit by default
        setExpandedUnits((prev) => ({ ...prev, [unitId]: true }));
    } catch (err) {
      console.error('Failed to fetch topics for unit', err);
    }
  };

  const handleCurriculumSelect = (currId: string) => {
    setSelectedCurriculumId(currId);
    fetchSubjectMaps(currId);
  };

  const handleSubjectMapSelect = (mapId: string) => {
    setSelectedSubjectMapId(mapId);
    fetchUnits(mapId);
  };

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectMapId) return;

    try {
      const res = await fetch('/api/academic/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_map_id: selectedSubjectMapId,
          ...unitForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowUnitModal(false);
        fetchUnits(selectedSubjectMapId);
      }
    } catch (err) {
      console.error('Failed to create unit', err);
    }
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUnitId) return;

    try {
      const res = await fetch('/api/academic/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: targetUnitId,
          ...chapterForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowChapterModal(false);
        fetchTopicsForUnit(targetUnitId);
      }
    } catch (err) {
      console.error('Failed to create chapter', err);
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetChapterId) return;

    try {
      const res = await fetch('/api/academic/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapter_id: targetChapterId,
          ...topicForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowTopicModal(false);
        // Refresh topics for this unit
        if (targetUnitId) fetchTopicsForUnit(targetUnitId);
      }
    } catch (err) {
      console.error('Failed to create topic', err);
    }
  };

  const getDifficultyBadge = (level: string) => {
    switch (level) {
      case 'EASY':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
            Easy
          </span>
        );
      case 'HARD':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
            Hard
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
            Medium
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Subject Selector */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Curriculum Units, Chapters & Topics Hierarchy
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Structured multi-tier taxonomy with competencies, period allocations, and difficulty ratings
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onOpenAIAssistant && (
              <button
                onClick={onOpenAIAssistant}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-bold rounded-lg text-xs shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Topic Breakdown
              </button>
            )}

            <button
              onClick={() => {
                setUnitForm((prev) => ({ ...prev, unit_number: units.length + 1 }));
                setShowUnitModal(true);
              }}
              disabled={!selectedSubjectMapId}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Unit
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Curriculum Framework
            </label>
            <select
              value={selectedCurriculumId}
              onChange={(e) => handleCurriculumSelect(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
            >
              {curriculums.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Class & Subject Map
            </label>
            <select
              value={selectedSubjectMapId}
              onChange={(e) => handleSubjectMapSelect(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
            >
              {subjectMaps.length === 0 && <option value="">No subjects mapped</option>}
              {subjectMaps.map((sm) => (
                <option key={sm.id} value={sm.id}>
                  {sm.class_name} • {sm.subject_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Filter by Difficulty
            </label>
            <div className="relative">
              <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="w-full pl-8 text-xs font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Levels</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Search Topics
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search topic or competency..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 text-xs font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Units & Nested Content Accordion */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Layers className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
          Loading curriculum hierarchy...
        </div>
      ) : units.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="font-semibold text-slate-700">No units defined for this subject</p>
          <p className="text-xs text-slate-500 mt-1">
            Click 'Add Unit' above to create Unit 1 and start structuring chapters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {units.map((unit) => {
            const isUnitOpen = !!expandedUnits[unit.id];
            const unitChapters = chapters[unit.id] || [];

            return (
              <div
                key={unit.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Unit Header Bar */}
                <div
                  onClick={() => toggleUnit(unit.id)}
                  className="p-4 bg-slate-50/80 hover:bg-slate-100/80 transition-colors flex items-center justify-between cursor-pointer border-b border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1 text-slate-400 hover:text-slate-600">
                      {isUnitOpen ? (
                        <ChevronDown className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold text-xs">
                          Unit {unit.unit_number}
                        </span>
                        <h3 className="font-bold text-slate-900 text-sm">{unit.title}</h3>
                      </div>
                      {unit.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {unit.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-slate-600 font-semibold bg-white px-2 py-1 rounded-md border border-slate-200">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      {unit.planned_periods} Periods
                    </span>
                    <span className="flex items-center gap-1 text-slate-600 font-semibold bg-white px-2 py-1 rounded-md border border-slate-200">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      {unit.weightage_marks} Marks
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTargetUnitId(unit.id);
                        setChapterForm((prev) => ({
                          ...prev,
                          chapter_number: (unitChapters.length || 0) + 1,
                        }));
                        setShowChapterModal(true);
                      }}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md font-semibold text-xs border border-indigo-200 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Chapter
                    </button>
                  </div>
                </div>

                {/* Chapters and Topics Under Unit */}
                {isUnitOpen && (
                  <div className="p-4 space-y-4">
                    {unitChapters.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-xs font-medium">No chapters added yet to Unit {unit.unit_number}</p>
                        <button
                          onClick={() => {
                            setTargetUnitId(unit.id);
                            setShowChapterModal(true);
                          }}
                          className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                        >
                          + Add First Chapter
                        </button>
                      </div>
                    ) : (
                      unitChapters.map((chap) => {
                        const isChapterOpen = expandedChapters[chap.id] ?? true;
                        const chapTopics = (topics[chap.id] || []).filter((t) => {
                          const matchesSearch =
                            t.title.toLowerCase().includes(search.toLowerCase()) ||
                            (t.competencies || '').toLowerCase().includes(search.toLowerCase());
                          const matchesDifficulty =
                            filterDifficulty === 'ALL' || t.difficulty_level === filterDifficulty;
                          return matchesSearch && matchesDifficulty;
                        });

                        return (
                          <div
                            key={chap.id}
                            className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs"
                          >
                            {/* Chapter Header */}
                            <div
                              onClick={() => toggleChapter(chap.id)}
                              className="px-4 py-2.5 bg-slate-50 flex items-center justify-between cursor-pointer border-b border-slate-100"
                            >
                              <div className="flex items-center gap-2">
                                {isChapterOpen ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                )}
                                <span className="font-bold text-xs text-slate-800">
                                  Chapter {chap.chapter_number}: {chap.title}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  ({chapTopics.length} topics)
                                </span>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTargetChapterId(chap.id);
                                  setTargetUnitId(unit.id);
                                  setShowTopicModal(true);
                                }}
                                className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 rounded text-xs font-semibold border border-slate-200 flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3 text-indigo-600" /> Add Topic
                              </button>
                            </div>

                            {/* Topics List */}
                            {isChapterOpen && (
                              <div className="p-3 divide-y divide-slate-100">
                                {chapTopics.length === 0 ? (
                                  <p className="text-xs text-slate-400 text-center py-4">
                                    No topics found matching current filters
                                  </p>
                                ) : (
                                  chapTopics.map((top) => (
                                    <div
                                      key={top.id}
                                      className="py-3 first:pt-1 last:pb-1 flex flex-col md:flex-row md:items-start justify-between gap-3"
                                    >
                                      <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center gap-2">
                                          {top.topic_code && (
                                            <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                              {top.topic_code}
                                            </span>
                                          )}
                                          <h4 className="font-bold text-slate-900 text-xs">
                                            {top.title}
                                          </h4>
                                          {getDifficultyBadge(top.difficulty_level)}
                                          <span className="text-[11px] text-slate-500">
                                            • {top.estimated_periods} periods
                                          </span>
                                        </div>

                                        {top.description && (
                                          <p className="text-xs text-slate-600">
                                            {top.description}
                                          </p>
                                        )}

                                        {top.competencies && (
                                          <div className="flex flex-wrap gap-1 text-[11px]">
                                            <span className="font-semibold text-slate-500">
                                              Competencies:
                                            </span>
                                            {top.competencies.split(',').map((comp, idx) => (
                                              <span
                                                key={idx}
                                                className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full"
                                              >
                                                {comp.trim()}
                                              </span>
                                            ))}
                                          </div>
                                        )}

                                        {top.recommended_activities && (
                                          <p className="text-[11px] text-indigo-700 bg-indigo-50/50 p-1.5 rounded-lg border border-indigo-100">
                                            <strong>Activities:</strong> {top.recommended_activities}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Unit */}
      {showUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-indigo-700 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">Add Curricular Unit</h3>
              <button
                onClick={() => setShowUnitModal(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateUnit} className="p-5 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit No. *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={unitForm.unit_number}
                    onChange={(e) =>
                      setUnitForm({ ...unitForm, unit_number: parseInt(e.target.value) || 1 })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Marks *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={unitForm.weightage_marks}
                    onChange={(e) =>
                      setUnitForm({ ...unitForm, weightage_marks: parseInt(e.target.value) || 0 })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Periods *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={unitForm.planned_periods}
                    onChange={(e) =>
                      setUnitForm({ ...unitForm, planned_periods: parseInt(e.target.value) || 1 })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit 1: Number Systems and Fractions"
                  value={unitForm.title}
                  onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Overview of core foundational ideas in this unit"
                  value={unitForm.description}
                  onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowUnitModal(false)}
                  className="px-3 py-1.5 border text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Save Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Chapter */}
      {showChapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-indigo-700 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">Add Chapter</h3>
              <button
                onClick={() => setShowChapterModal(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateChapter} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chapter No. *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={chapterForm.chapter_number}
                    onChange={(e) =>
                      setChapterForm({
                        ...chapterForm,
                        chapter_number: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Est. Hours *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={chapterForm.estimated_teaching_hours}
                    onChange={(e) =>
                      setChapterForm({
                        ...chapterForm,
                        estimated_teaching_hours: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chapter Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fractions and Decimals"
                  value={chapterForm.title}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Chapter focus areas"
                  value={chapterForm.description}
                  onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowChapterModal(false)}
                  className="px-3 py-1.5 border text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Save Chapter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Topic */}
      {showTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-indigo-700 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">Add Curricular Topic</h3>
              <button
                onClick={() => setShowTopicModal(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateTopic} className="p-5 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Topic Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. M5-T03"
                    value={topicForm.topic_code}
                    onChange={(e) => setTopicForm({ ...topicForm, topic_code: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Difficulty *
                  </label>
                  <select
                    value={topicForm.difficulty_level}
                    onChange={(e) =>
                      setTopicForm({ ...topicForm, difficulty_level: e.target.value })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Periods *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={topicForm.estimated_periods}
                    onChange={(e) =>
                      setTopicForm({
                        ...topicForm,
                        estimated_periods: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Topic Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Addition and Subtraction of Unlike Fractions"
                  value={topicForm.title}
                  onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Core concepts and principles"
                  value={topicForm.description}
                  onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Key Competencies (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Problem Solving, Computational Fluency, Logical Reasoning"
                  value={topicForm.competencies}
                  onChange={(e) => setTopicForm({ ...topicForm, competencies: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recommended Activities / Pedagogical Methods
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pizza slice paper cutting visual fractions, pair quiz"
                  value={topicForm.recommended_activities}
                  onChange={(e) =>
                    setTopicForm({ ...topicForm, recommended_activities: e.target.value })
                  }
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowTopicModal(false)}
                  className="px-3 py-1.5 border text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Save Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
