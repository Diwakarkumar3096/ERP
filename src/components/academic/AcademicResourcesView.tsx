import React, { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Video,
  FileCheck,
  Eye,
  Layers,
  Sparkles
} from 'lucide-react';
import { AcademicResource } from './AcademicCommon';

interface AcademicResourcesViewProps {
  onOpenAIAssistant: () => void;
}

export const AcademicResourcesView: React.FC<AcademicResourcesViewProps> = ({
  onOpenAIAssistant,
}) => {
  const [resources, setResources] = useState<AcademicResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [showModal, setShowModal] = useState(false);

  // Form
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    resource_type: 'WORKSHEET',
    file_url: 'https://example.com/academic/worksheet.pdf',
    file_name: 'Worksheet_Practice.pdf',
    file_size_bytes: 1048576,
    class_id: '',
    subject_id: '',
    visibility: 'STUDENTS_ONLY',
  });

  const fetchResources = async () => {
    setLoading(true);
    try {
      const url = selectedType !== 'ALL'
        ? `/api/academic/resources?resourceType=${selectedType}`
        : '/api/academic/resources';
      const res = await fetch(url);
      const data = await res.json();
      setResources(data.resources || data.data || []);
    } catch (err) {
      console.error('Failed to load academic resources', err);
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
      console.error('Failed to load metadata for resources', err);
    }
  };

  useEffect(() => {
    fetchDropdownData();
    fetchResources();
  }, [selectedType]);

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/academic/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchResources();
      }
    } catch (err) {
      console.error('Failed to upload resource', err);
    }
  };

  const filtered = resources.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.subject_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.class_name || '').toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'VIDEO_LINK':
        return <Video className="w-5 h-5 text-rose-500" />;
      case 'WORKSHEET':
        return <FileCheck className="w-5 h-5 text-indigo-500" />;
      case 'PRESENTATION':
      case 'SLIDES':
        return <Layers className="w-5 h-5 text-amber-500" />;
      default:
        return <FileText className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              LMS Teaching & Learning Resource Repository
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Worksheets, audio-visual interactive simulations, lesson slides, and student self-study modules
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenAIAssistant}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-bold rounded-lg text-xs shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Worksheet Draft
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Upload Resource
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Resource Type Filter
            </label>
            <div className="relative">
              <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full pl-8 text-xs font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Types</option>
                <option value="WORKSHEET">Worksheets</option>
                <option value="PDF">PDF Documents</option>
                <option value="VIDEO_LINK">Video Links</option>
                <option value="PRESENTATION">Presentations & Slides</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Search Resources
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search title, subject, or class..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 text-xs font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Resource Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <FileText className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
          Loading LMS resources...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="font-semibold text-slate-700">No resources found</p>
          <p className="text-xs text-slate-500 mt-1">
            Click 'Upload Resource' to publish worksheets or slides for teachers and students.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                    {getResourceTypeIcon(item.resource_type)}
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                      {item.resource_type}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {item.visibility.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{item.title}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                    <span>{item.class_name || 'All Classes'}</span>
                    <span>•</span>
                    <span>{item.subject_name || 'General'}</span>
                  </div>
                  {item.topic_name && (
                    <p className="text-[11px] text-indigo-600 font-medium mt-1">
                      Topic: {item.topic_name}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  By {item.uploaded_by_name || 'Academic Faculty'}
                </span>

                <div className="flex items-center gap-2">
                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </a>
                  <a
                    href={item.file_url}
                    download
                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Upload Resource */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-indigo-700 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">Add LMS Resource</h3>
              <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateResource} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resource Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fraction Strips Cut-Out Activity Sheet"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Resource Type *
                  </label>
                  <select
                    value={formData.resource_type}
                    onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  >
                    <option value="WORKSHEET">Worksheet</option>
                    <option value="PDF">PDF Document</option>
                    <option value="VIDEO_LINK">Video Link</option>
                    <option value="PRESENTATION">Presentation / Slides</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Visibility *
                  </label>
                  <select
                    value={formData.visibility}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  >
                    <option value="PUBLIC">Everyone</option>
                    <option value="STUDENTS_ONLY">Students & Teachers</option>
                    <option value="TEACHERS_ONLY">Teachers Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Class</label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                  <select
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  >
                    <option value="">All Subjects</option>
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
                  Resource URL or Storage Link *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://..."
                  value={formData.file_url}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
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
                  Publish Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
