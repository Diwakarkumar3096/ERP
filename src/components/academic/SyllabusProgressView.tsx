import React, { useEffect, useState } from 'react';
import {
  Compass,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Layers,
  Edit2,
  Calendar,
  Save
} from 'lucide-react';
import { SyllabusProgressTopic } from './AcademicCommon';

export const SyllabusProgressView: React.FC = () => {
  const [progressList, setProgressList] = useState<SyllabusProgressTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingItem, setEditingItem] = useState<SyllabusProgressTopic | null>(null);

  // Edit modal / inline states
  const [editStatus, setEditStatus] = useState<any>('IN_PROGRESS');
  const [editPercentage, setEditPercentage] = useState<number>(0);
  const [editHours, setEditHours] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const url = statusFilter !== 'ALL'
        ? `/api/academic/syllabus-progress?status=${statusFilter}`
        : '/api/academic/syllabus-progress';
      const res = await fetch(url);
      const data = await res.json();
      setProgressList(data.progress || data.data || []);
    } catch (err) {
      console.error('Failed to load syllabus progress', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [statusFilter]);

  const handleOpenEdit = (item: SyllabusProgressTopic) => {
    setEditingItem(item);
    setEditStatus(item.status);
    setEditPercentage(item.completion_percentage);
    setEditHours(item.teaching_hours_delivered || 0);
    setEditNotes(item.teacher_notes || '');
  };

  const handleSaveProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const res = await fetch(`/api/academic/syllabus-progress/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          completion_percentage: editPercentage,
          teaching_hours_delivered: editHours,
          teacher_notes: editNotes,
          actual_completion_date: editPercentage === 100 ? new Date().toISOString().split('T')[0] : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingItem(null);
        fetchProgress();
      }
    } catch (err) {
      console.error('Failed to update syllabus progress', err);
    }
  };

  const filtered = progressList.filter((p) => {
    const matchesSearch =
      p.topic_title.toLowerCase().includes(search.toLowerCase()) ||
      p.class_name.toLowerCase().includes(search.toLowerCase()) ||
      p.subject_name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-3 h-3" /> Completed
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3" /> In Progress
          </span>
        );
      case 'REVISION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            Revision
          </span>
        );
      case 'DEFERRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <AlertTriangle className="w-3 h-3" /> Deferred
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            Not Started
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
              Syllabus Tracking & Pacing Matrix
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Continuous monitoring of curriculum coverage vs target schedules across all grade sections
            </p>
          </div>
        </div>

        {/* Filter Controls */}
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
                <option value="ALL">All Topics</option>
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="REVISION">Revision</option>
                <option value="DEFERRED">Deferred</option>
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
                placeholder="Search topic, class or subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 text-xs font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Cards Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Compass className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
          Loading syllabus progress matrix...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Layers className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="font-semibold text-slate-700">No syllabus progress records found</p>
          <p className="text-xs text-slate-500 mt-1">
            Progress records are automatically generated when subjects and units are mapped.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-4">Class & Subject</th>
                  <th className="p-4">Topic & Unit</th>
                  <th className="p-4">Schedule Dates</th>
                  <th className="p-4">Hours</th>
                  <th className="p-4">Status & Completion</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{item.class_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {item.section_name && `Sec ${item.section_name} • `}
                        {item.subject_name}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{item.topic_title}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.unit_title && `Unit: ${item.unit_title}`}
                        {item.chapter_title && ` • ${item.chapter_title}`}
                      </div>
                    </td>

                    <td className="p-4 text-slate-600">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {item.planned_start_date
                            ? new Date(item.planned_start_date).toLocaleDateString()
                            : '—'}{' '}
                          to{' '}
                          {item.planned_end_date
                            ? new Date(item.planned_end_date).toLocaleDateString()
                            : '—'}
                        </span>
                      </div>
                      {item.actual_completion_date && (
                        <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                          Done: {new Date(item.actual_completion_date).toLocaleDateString()}
                        </div>
                      )}
                    </td>

                    <td className="p-4 font-medium text-slate-700">
                      {item.teaching_hours_delivered || 0} hrs
                    </td>

                    <td className="p-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          {getStatusBadge(item.status)}
                          <span className="font-bold text-slate-700 text-xs">
                            {item.completion_percentage}%
                          </span>
                        </div>
                        <div className="w-32 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              item.completion_percentage === 100
                                ? 'bg-emerald-500'
                                : 'bg-indigo-600'
                            }`}
                            style={{ width: `${item.completion_percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-200 inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-indigo-700 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Record Topic Execution</h3>
                <p className="text-xs text-indigo-200">{editingItem.topic_title}</p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProgress} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                >
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="REVISION">Revision</option>
                  <option value="DEFERRED">Deferred</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Completion Percentage</span>
                  <span className="font-bold text-indigo-600">{editPercentage}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={editPercentage}
                  onChange={(e) => setEditPercentage(parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teaching Hours Delivered
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={editHours}
                  onChange={(e) => setEditHours(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teacher Notes / Reflections
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Completed classroom activity on fraction strips; 80% achieved mastery on formative check."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-1.5 border text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" /> Save Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
