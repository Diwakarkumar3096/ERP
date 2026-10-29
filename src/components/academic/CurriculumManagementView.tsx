import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  GitBranch,
  CheckCircle,
  Clock,
  Archive,
  RefreshCw,
  Search,
  ChevronRight,
  ShieldCheck,
  Send
} from 'lucide-react';
import { CurriculumFramework } from './AcademicCommon';

interface CurriculumManagementViewProps {
  onSelectCurriculum?: (curriculum: CurriculumFramework) => void;
  onNavigateToUnits?: () => void;
}

export const CurriculumManagementView: React.FC<CurriculumManagementViewProps> = ({
  onSelectCurriculum,
  onNavigateToUnits,
}) => {
  const [curriculums, setCurriculums] = useState<CurriculumFramework[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCurriculum, setSelectedCurriculum] = useState<CurriculumFramework | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);

  // Form states
  const [formData, setFormData] = useState({
    session_id: '',
    name: '',
    code: '',
    board: 'CBSE',
    description: '',
    applicable_classes: 'Class 1 to Class 10',
    applicable_subjects: 'All Core Subjects',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
  });

  const [versionNotes, setVersionNotes] = useState('');

  const fetchCurriculums = async () => {
    setLoading(true);
    try {
      const [res, termRes] = await Promise.all([
        fetch('/api/academic/curriculums'),
        fetch('/api/academic/terms')
      ]);
      const [data, termData] = await Promise.all([res.json(), termRes.json()]);
      const list = data.curriculums || data.data || [];
      setCurriculums(list);
      const sessList = termData.terms || [];
      setSessions(sessList);
      if (sessList.length > 0 && !formData.session_id) {
        setFormData((prev) => ({ ...prev, session_id: sessList[0].session_id || sessList[0].id }));
      }
    } catch (err) {
      console.error('Failed to load curriculums', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurriculums();
  }, []);

  const fetchVersions = async (curriculumId: string) => {
    setLoadingVersions(true);
    try {
      const res = await fetch(`/api/academic/curriculums/${curriculumId}`);
      const data = await res.json();
      setVersions(data.versions || data.data?.versions || []);
    } catch (err) {
      console.error('Failed to load curriculum versions', err);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleSelectCurriculum = (curr: CurriculumFramework) => {
    setSelectedCurriculum(curr);
    fetchVersions(curr.id);
    if (onSelectCurriculum) onSelectCurriculum(curr);
  };

  const handleStatusChange = async (curriculumId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/academic/curriculums/${curriculumId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchCurriculums();
        if (selectedCurriculum?.id === curriculumId) {
          setSelectedCurriculum((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleCreateCurriculum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code || !formData.session_id) return;

    try {
      const res = await fetch('/api/academic/curriculums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        fetchCurriculums();
      }
    } catch (err) {
      console.error('Failed to create curriculum', err);
    }
  };

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCurriculum) return;

    try {
      const res = await fetch(`/api/academic/curriculums/${selectedCurriculum.id}/version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change_summary: versionNotes }),
      });
      const data = await res.json();
      if (data.success) {
        setShowVersionModal(false);
        setVersionNotes('');
        await fetchCurriculums();
        fetchVersions(selectedCurriculum.id);
      }
    } catch (err) {
      console.error('Failed to create version snapshot', err);
    }
  };

  const filteredCurriculums = curriculums.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.board.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-3 h-3" /> Published
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
            <Clock className="w-3 h-3" /> Under Review
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            <Archive className="w-3 h-3" /> Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            Draft v1.0
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Curriculum Frameworks & Version Governance
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional board standards, academic sessions, and revision audit logs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search framework..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-64"
            />
          </div>

          <button
            onClick={() => fetchCurriculums()}
            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Framework
          </button>
        </div>
      </div>

      {/* Main Grid: List & Selected Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Curriculums Cards List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading curriculum frameworks...
            </div>
          ) : filteredCurriculums.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-slate-700">No curriculum frameworks found</p>
              <p className="text-xs text-slate-500 mt-1">Create a framework to start mapping subjects and topics.</p>
            </div>
          ) : (
            filteredCurriculums.map((curr) => {
              const isSelected = selectedCurriculum?.id === curr.id;
              return (
                <div
                  key={curr.id}
                  onClick={() => handleSelectCurriculum(curr)}
                  className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-50 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-mono font-bold">
                          {curr.code}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
                          {curr.board}
                        </span>
                        {getStatusBadge(curr.status)}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{curr.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2">{curr.description}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                        <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
                        v{curr.version}.0
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                    <div className="flex items-center gap-4">
                      <span>
                        <strong className="text-slate-700">{curr.mapped_subjects_count || 0}</strong>{' '}
                        Subjects Mapped
                      </span>
                      <span>
                        Classes:{' '}
                        <strong className="text-slate-700">{curr.applicable_classes || 'All'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCurriculum(curr);
                          if (onNavigateToUnits) onNavigateToUnits();
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        Manage Units & Topics <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Framework Panel & Version History */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          {selectedCurriculum ? (
            <>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-indigo-600">
                    {selectedCurriculum.code}
                  </span>
                  {getStatusBadge(selectedCurriculum.status)}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedCurriculum.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Session: <span className="font-semibold text-slate-700">{selectedCurriculum.session_name || 'Academic Year'}</span>
                </p>
              </div>

              {/* Status Transition Actions */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Workflow State Actions
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedCurriculum.status === 'DRAFT' && (
                    <button
                      onClick={() => handleStatusChange(selectedCurriculum.id, 'UNDER_REVIEW')}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" /> Submit for Review
                    </button>
                  )}
                  {selectedCurriculum.status === 'UNDER_REVIEW' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(selectedCurriculum.id, 'APPROVED')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Approve Framework
                      </button>
                      <button
                        onClick={() => handleStatusChange(selectedCurriculum.id, 'DRAFT')}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg"
                      >
                        Request Changes
                      </button>
                    </>
                  )}
                  {selectedCurriculum.status === 'APPROVED' && (
                    <button
                      onClick={() => handleStatusChange(selectedCurriculum.id, 'PUBLISHED')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Publish to School
                    </button>
                  )}
                  {selectedCurriculum.status === 'PUBLISHED' && (
                    <button
                      onClick={() => handleStatusChange(selectedCurriculum.id, 'ARCHIVED')}
                      className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <Archive className="w-3.5 h-3.5" /> Archive Framework
                    </button>
                  )}
                  {selectedCurriculum.status === 'ARCHIVED' && (
                    <button
                      onClick={() => handleStatusChange(selectedCurriculum.id, 'DRAFT')}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
                    >
                      Re-open as Draft
                    </button>
                  )}

                  <button
                    onClick={() => setShowVersionModal(true)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-indigo-200"
                  >
                    <GitBranch className="w-3.5 h-3.5" /> Snapshot New Version
                  </button>
                </div>
              </div>

              {/* Version History List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                    Version Revision Log
                  </h4>
                  <span className="text-xs text-slate-400">
                    {versions.length} revisions
                  </span>
                </div>

                {loadingVersions ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Loading version logs...</p>
                ) : versions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No previous version snapshots saved. Click 'Snapshot New Version' to record current state.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {versions.map((ver) => (
                      <div
                        key={ver.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-700 font-mono">
                            Version {ver.version_number}.0
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(ver.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-600 font-medium">
                          {ver.change_summary || 'No change description provided'}
                        </p>
                        <div className="text-[11px] text-slate-400">
                          Archived by {ver.created_by_name || 'Curriculum Officer'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-600">Select a Framework</p>
              <p className="text-xs text-slate-400 mt-1">
                Click any framework on the left to inspect versions and workflow state.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create New Framework */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 bg-gradient-to-r from-indigo-700 to-indigo-800 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">New Curriculum Framework</h3>
                <p className="text-xs text-indigo-200">Define academic board and session parameters</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCurriculum} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Session *
                </label>
                <select
                  required
                  value={formData.session_id}
                  onChange={(e) => setFormData({ ...formData, session_id: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Session...</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.session_name || s.name} {s.is_current ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Framework Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CBSE-2025-NCF"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Board / Accreditation *
                  </label>
                  <select
                    value={formData.board}
                    onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE</option>
                    <option value="State Board">State Board</option>
                    <option value="IB">IB</option>
                    <option value="Cambridge">Cambridge</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Framework Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Curriculum Framework 2025-26"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Applicable Classes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Class 1 to Class 10"
                  value={formData.applicable_classes}
                  onChange={(e) => setFormData({ ...formData, applicable_classes: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Alignment Principles
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Aligned with NEP 2020 experiential learning competencies and 5E pedagogical framework."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm"
                >
                  Create Framework
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Version Snapshot */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Snapshot Curriculum Version</h3>
                <p className="text-xs text-blue-200">
                  Increment version to v{(selectedCurriculum?.version || 1) + 1}.0
                </p>
              </div>
              <button
                onClick={() => setShowVersionModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVersion} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Revision / Change Summary *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe what was updated (e.g. Added NEP 2020 competency codes for primary maths, redistributed term periods)."
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowVersionModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm"
                >
                  Save Version Snapshot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
