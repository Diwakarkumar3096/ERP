import React, { useEffect, useState } from 'react';
import { ChildStudent } from './PortalCommon';
import {
  Compass,
  BookOpen,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileCheck,
  Video,
  FileText,
  Layers,
  Award
} from 'lucide-react';

interface PortalAcademicViewProps {
  child: ChildStudent;
}

export const PortalAcademicView: React.FC<PortalAcademicViewProps> = ({ child }) => {
  const [syllabusList, setSyllabusList] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubTab, setSelectedSubTab] = useState<'syllabus' | 'resources' | 'progress'>('syllabus');

  useEffect(() => {
    fetchAcademicData();
  }, [child.id, child.class_id]);

  const fetchAcademicData = async () => {
    setLoading(true);
    try {
      const [sylRes, resRes, assRes] = await Promise.all([
        fetch(`/api/academic/syllabus-progress?classId=${child.class_id}`),
        fetch(`/api/academic/resources?classId=${child.class_id}`),
        fetch('/api/academic/formative-assessments'),
      ]);

      const [sylData, resData, assData] = await Promise.all([
        sylRes.json(),
        resRes.json(),
        assRes.json(),
      ]);

      setSyllabusList(sylData.progress || sylData.data || []);
      setResources(resData.resources || resData.data || []);
      setAssessments(assData.assessments || assData.data || []);
    } catch (err) {
      console.error('Failed to load portal academic data', err);
    } finally {
      setLoading(false);
    }
  };

  // Compute aggregate statistics
  const totalTopics = syllabusList.length;
  const completedTopics = syllabusList.filter((s) => s.status === 'COMPLETED').length;
  const inProgressTopics = syllabusList.filter((s) => s.status === 'IN_PROGRESS').length;
  const overallProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-800 to-blue-800 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-indigo-100 uppercase tracking-wider">
            Academic Track & Digital Learning
          </span>
          <h2 className="text-xl md:text-2xl font-bold">
            Curriculum Pacing for {child.first_name} ({child.class_name})
          </h2>
          <p className="text-xs text-indigo-200">
            Real-time syllabus completion status, interactive worksheets, and learning resources
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/20 shrink-0">
          <div>
            <div className="text-2xl font-extrabold">{overallProgress}%</div>
            <div className="text-[11px] text-indigo-200">Syllabus Paced</div>
          </div>
          <div className="w-16 bg-white/20 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-400 h-2 rounded-full"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setSelectedSubTab('syllabus')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedSubTab === 'syllabus'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Compass className="w-4 h-4" /> Syllabus Pacing ({totalTopics})
        </button>

        <button
          onClick={() => setSelectedSubTab('resources')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedSubTab === 'resources'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" /> Study Materials & LMS ({resources.length})
        </button>

        <button
          onClick={() => setSelectedSubTab('progress')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedSubTab === 'progress'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" /> Formative Check-ins ({assessments.length})
        </button>
      </div>

      {/* Content Panels */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <BookOpen className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
          Loading academic pacing and learning materials...
        </div>
      ) : selectedSubTab === 'syllabus' ? (
        syllabusList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Compass className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-slate-700">No syllabus pacing records</p>
            <p className="text-xs text-slate-500 mt-1">Syllabus plan is being finalized by school faculty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {syllabusList.map((item) => (
              <div
                key={item.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-xs">
                      {item.subject_name}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{item.topic_title}</h3>
                    <p className="text-xs text-slate-500">
                      {item.unit_title && `Unit: ${item.unit_title}`}
                      {item.chapter_title && ` • ${item.chapter_title}`}
                    </p>
                  </div>

                  {item.status === 'COMPLETED' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Completed
                    </span>
                  ) : item.status === 'IN_PROGRESS' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> In Progress
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                      Scheduled
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Progress: {item.completion_percentage}%</span>
                    <span>Delivered: {item.teaching_hours_delivered || 0} hrs</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        item.completion_percentage === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${item.completion_percentage}%` }}
                    />
                  </div>
                </div>

                {item.teacher_notes && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
                    <strong>Teacher Note:</strong> {item.teacher_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : selectedSubTab === 'resources' ? (
        resources.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-slate-700">No learning resources posted</p>
            <p className="text-xs text-slate-500 mt-1">Study materials will appear here when teachers publish them.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((res) => (
              <div
                key={res.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
                      {res.resource_type}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{res.subject_name}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm line-clamp-2">{res.title}</h3>
                  {res.topic_name && (
                    <p className="text-xs text-indigo-600 mt-1">Topic: {res.topic_name}</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    By {res.uploaded_by_name || 'Teacher'}
                  </span>
                  <a
                    href={res.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        assessments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Award className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-slate-700">No formative check-ins recorded</p>
            <p className="text-xs text-slate-500 mt-1">Recent exit tickets and quizzes will be listed here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assessments.map((ass) => (
              <div
                key={ass.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {ass.assessment_type}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{ass.title}</h3>
                    <p className="text-xs text-slate-500">{ass.subject_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-400">Max Score</span>
                    <div className="text-base font-bold text-slate-800">{ass.max_score}</div>
                  </div>
                </div>

                <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex justify-between">
                  <span>Conducted: {new Date(ass.conducted_date).toLocaleDateString()}</span>
                  <span className="text-emerald-700 font-semibold">Continuous Assessment</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
