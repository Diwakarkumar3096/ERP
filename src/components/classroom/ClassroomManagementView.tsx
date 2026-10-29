import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type {
  School,
  ClassItem,
  SectionItem,
  Subject,
  Employee,
  ClassroomRoom,
  TimetablePeriod,
  Timetable,
  TimetableEntry,
  TeacherSubstitution,
  Homework,
  LearningMaterial,
  ClassroomNotice,
  ClassroomDashboardSummary,
  TeacherWorkloadItem
} from '../../types/erp.js';
import {
  CalendarDays,
  Clock,
  Plus,
  BookOpen,
  UserCheck,
  FileText,
  Bell,
  Printer,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Search,
  Upload,
  User,
  Shield,
  Eye,
  Trash2,
  BarChart3,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { TimetableSlotModal } from './TimetableSlotModal.js';
import { SubstitutionModal } from './SubstitutionModal.js';
import { HomeworkModal } from './HomeworkModal.js';
import { HomeworkEvaluateModal } from './HomeworkEvaluateModal.js';
import { HomeworkSubmitModal } from './HomeworkSubmitModal.js';
import { StudyMaterialModal } from './StudyMaterialModal.js';
import { ClassNoticeModal } from './ClassNoticeModal.js';
import { TimetablePrintModal } from './TimetablePrintModal.js';

type ClassroomSubTab =
  | 'timetable'
  | 'substitutions'
  | 'homework'
  | 'materials'
  | 'notices'
  | 'teacher_dashboard'
  | 'student_portal'
  | 'reports';

export const ClassroomManagementView: React.FC = () => {
  const { user, activeSchool, isSuperAdmin, hasPermission } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<ClassroomSubTab>('timetable');
  const [loading, setLoading] = useState(true);

  // Core Dropdowns Data
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Employee[]>([]);
  const [rooms, setRooms] = useState<ClassroomRoom[]>([]);
  const [periods, setPeriods] = useState<TimetablePeriod[]>([]);
  const [summary, setSummary] = useState<ClassroomDashboardSummary | null>(null);

  // Timetable State
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>('');
  const [currentTimetable, setCurrentTimetable] = useState<Timetable | null>(null);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [viewFilter, setViewFilter] = useState<'class' | 'teacher' | 'room'>('class');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  // Substitutions State
  const [substitutions, setSubstitutions] = useState<TeacherSubstitution[]>([]);

  // Homework State
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [evaluatingHw, setEvaluatingHw] = useState<Homework | null>(null);
  const [submittingHw, setSubmittingHw] = useState<Homework | null>(null);

  // Materials & Notices State
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [notices, setNotices] = useState<ClassroomNotice[]>([]);
  const [workloadReport, setWorkloadReport] = useState<TeacherWorkloadItem[]>([]);

  // Modals state
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [slotPreselectedDay, setSlotPreselectedDay] = useState('Monday');
  const [slotPreselectedPeriodId, setSlotPreselectedPeriodId] = useState('');
  const [isSubstModalOpen, setIsSubstModalOpen] = useState(false);
  const [isHwModalOpen, setIsHwModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Student / Parent test selector for demo & verification
  const [activeStudentId, setActiveStudentId] = useState<string>('stu_vvps_008'); // Kabir Das
  const [activeStudentName, setActiveStudentName] = useState<string>('Kabir Das');
  const [mobileSelectedDay, setMobileSelectedDay] = useState<string>('Monday');

  const schoolId = activeSchool?.id || 'sch_vvps';

  // Load Initial Data
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [clsRes, subRes, empRes, rmRes, perRes, sumRes, ttRes] = await Promise.all([
        api.classes.list(schoolId),
        api.employees.getSubjects(schoolId),
        api.employees.list({ schoolId, employeeType: 'Teaching' }),
        api.classroom.getRooms(schoolId),
        api.classroom.getPeriods(schoolId),
        api.classroom.getDashboardSummary(schoolId),
        api.classroom.getTimetables({ schoolId })
      ]);

      setClasses(clsRes.classes || []);
      setSubjects(subRes.subjects || []);
      setTeachers(empRes.employees || []);
      setRooms(rmRes.rooms || []);
      setPeriods(perRes.periods || []);
      setSummary(sumRes);
      setTimetables(ttRes.timetables || []);

      if (empRes.employees.length > 0 && !selectedTeacherId) {
        setSelectedTeacherId(empRes.employees[0].id);
      }
      if (rmRes.rooms.length > 0 && !selectedRoomId) {
        setSelectedRoomId(rmRes.rooms[0].id);
      }

      if (ttRes.timetables.length > 0) {
        const firstTt = ttRes.timetables[0];
        setSelectedTimetableId(firstTt.id);
        loadTimetableDetails(firstTt.id);
      }
    } catch (err: any) {
      console.error('[LOAD CLASSROOM INITIAL ERROR]', err);
      showToast(err.message || 'Failed to initialize classroom module.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTimetableDetails = async (ttId: string) => {
    try {
      const res = await api.classroom.getTimetable(ttId);
      setCurrentTimetable(res.timetable);
      setTimetableEntries(res.entries || []);
    } catch (err: any) {
      console.warn('[LOAD TT DETAILS ERROR]', err);
    }
  };

  const loadSubstitutions = async () => {
    try {
      const res = await api.classroom.getSubstitutions({ schoolId });
      setSubstitutions(res.substitutions || []);
    } catch (err: any) {
      console.warn('[LOAD SUBSTITUTIONS ERROR]', err);
    }
  };

  const loadHomework = async () => {
    try {
      const res = await api.classroom.getHomework({ schoolId, studentId: activeStudentId });
      setHomeworkList(res.homework || []);
    } catch (err: any) {
      console.warn('[LOAD HOMEWORK ERROR]', err);
    }
  };

  const loadMaterials = async () => {
    try {
      const res = await api.classroom.getMaterials({ schoolId });
      setMaterials(res.materials || []);
    } catch (err: any) {
      console.warn('[LOAD MATERIALS ERROR]', err);
    }
  };

  const loadNotices = async () => {
    try {
      const res = await api.classroom.getNotices({ schoolId });
      setNotices(res.notices || []);
    } catch (err: any) {
      console.warn('[LOAD NOTICES ERROR]', err);
    }
  };

  const loadReports = async () => {
    try {
      const res = await api.classroom.getTeacherWorkload(schoolId);
      setWorkloadReport(res.workload || []);
    } catch (err: any) {
      console.warn('[LOAD REPORTS ERROR]', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [schoolId]);

  useEffect(() => {
    if (activeTab === 'substitutions') loadSubstitutions();
    if (activeTab === 'homework' || activeTab === 'student_portal' || activeTab === 'teacher_dashboard') loadHomework();
    if (activeTab === 'materials') loadMaterials();
    if (activeTab === 'notices') loadNotices();
    if (activeTab === 'reports') loadReports();
  }, [activeTab, schoolId, activeStudentId]);

  const handlePublishTimetable = async (newStatus: 'PUBLISHED' | 'DRAFT') => {
    if (!currentTimetable) return;
    try {
      await api.classroom.publishTimetable(currentTimetable.id, newStatus);
      showToast(`Timetable successfully marked as ${newStatus}!`, 'success');
      loadTimetableDetails(currentTimetable.id);
      api.classroom.getDashboardSummary(schoolId).then(setSummary);
    } catch (err: any) {
      showToast(err.message || 'Failed to update timetable status.', 'error');
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Academic Engine · Phase 8 Complete</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Timetable, Homework & Classroom Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Managing <strong className="text-slate-700">{activeSchool?.name || 'Vidya Vahini Public School'}</strong> · Multi-period scheduling, conflict engine, homework lifecycle, and study materials
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setSlotPreselectedDay('Monday');
              setSlotPreselectedPeriodId(periods[0]?.id || '');
              setIsSlotModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Clock className="w-3.5 h-3.5" />
            Assign Period Slot
          </button>
          <button
            onClick={() => setIsSubstModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Assign Substitute
          </button>
          <button
            onClick={() => setIsHwModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Create Homework
          </button>
          <button
            onClick={() => setIsMaterialModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            Upload Resource
          </button>
          <button
            onClick={() => setIsNoticeModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Bell className="w-3.5 h-3.5" />
            Broadcast Notice
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Timetables Configured</span>
            <CalendarDays className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {summary?.totalTimetables || 1}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600">
              {summary?.publishedTimetables || 1} published
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Class & section weekly schedules
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Active Homework Tasks</span>
            <BookOpen className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {summary?.activeHomework || 3}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700">
              {summary?.submissionMetrics?.submitted || 4} submissions
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {summary?.submissionMetrics?.evaluated || 2} graded with teacher comments
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Classroom Venues / Rooms</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {summary?.totalRooms || 7}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              Science & IT Labs
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Venue conflict protection active
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Study Resources & Notices</span>
            <FileText className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {(summary?.totalMaterials || 4) + (summary?.totalNotices || 3)}
            </span>
            <span className="text-[11px] font-semibold text-purple-700">
              {summary?.totalNotices || 3} bulletins
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            PDF worksheets and revision notes
          </div>
        </div>
      </div>

      {/* Main Tabbed Interface */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Subtab Navigation Bar */}
        <div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-slate-50/60 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'timetable', label: 'Weekly Timetable Grid', icon: CalendarDays },
            { id: 'substitutions', label: 'Teacher Substitutions', icon: UserCheck },
            { id: 'homework', label: 'Homework & Assignments', icon: BookOpen },
            { id: 'materials', label: 'Learning Resources', icon: FileText },
            { id: 'notices', label: 'Classroom Notice Board', icon: Bell },
            { id: 'teacher_dashboard', label: 'Teacher Dashboard', icon: User },
            { id: 'student_portal', label: 'Student / Parent Portal', icon: Shield },
            { id: 'reports', label: 'Workload & Reports', icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ClassroomSubTab)}
                className={`px-3 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="p-6">
          {/* TAB 1: WEEKLY TIMETABLE GRID */}
          {activeTab === 'timetable' && (
            <div className="space-y-6">
              {/* Timetable Selector and View Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-semibold text-slate-600">Timetable:</label>
                    <select
                      value={selectedTimetableId}
                      onChange={(e) => {
                        setSelectedTimetableId(e.target.value);
                        loadTimetableDetails(e.target.value);
                      }}
                      className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-white text-slate-800"
                    >
                      {timetables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold text-slate-600">
                    <button
                      onClick={() => setViewFilter('class')}
                      className={`px-2.5 py-1 rounded-md ${
                        viewFilter === 'class' ? 'bg-white text-indigo-600 shadow-2xs' : ''
                      }`}
                    >
                      Class Matrix
                    </button>
                    <button
                      onClick={() => setViewFilter('teacher')}
                      className={`px-2.5 py-1 rounded-md ${
                        viewFilter === 'teacher' ? 'bg-white text-indigo-600 shadow-2xs' : ''
                      }`}
                    >
                      Teacher Schedule
                    </button>
                    <button
                      onClick={() => setViewFilter('room')}
                      className={`px-2.5 py-1 rounded-md ${
                        viewFilter === 'room' ? 'bg-white text-indigo-600 shadow-2xs' : ''
                      }`}
                    >
                      Room Schedule
                    </button>
                  </div>

                  {viewFilter === 'teacher' && (
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white"
                    >
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          Faculty: {t.first_name} {t.last_name}
                        </option>
                      ))}
                    </select>
                  )}

                  {viewFilter === 'room' && (
                    <select
                      value={selectedRoomId}
                      onChange={(e) => setSelectedRoomId(e.target.value)}
                      className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white"
                    >
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          Room: {r.name} ({r.room_number})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {currentTimetable?.status === 'DRAFT' ? (
                    <button
                      onClick={() => handlePublishTimetable('PUBLISHED')}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Publish Timetable
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Published & Live
                    </span>
                  )}

                  <button
                    onClick={() => setIsPrintModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    Print Schedule
                  </button>
                </div>
              </div>

              {/* Desktop: Weekly Timetable Grid Table */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                      <th className="px-4 py-3 text-left font-bold uppercase text-[10px] w-28">
                        Weekday
                      </th>
                      {periods
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((p) => (
                          <th
                            key={p.id}
                            className={`px-3 py-2.5 text-center border-l border-slate-200 ${
                              p.period_type === 'BREAK' || p.period_type === 'LUNCH'
                                ? 'bg-amber-50/50 text-amber-900'
                                : ''
                            }`}
                          >
                            <div className="font-bold text-[11px] text-slate-900">{p.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {p.start_time} - {p.end_time}
                            </div>
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {days.map((day) => (
                      <tr key={day} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 bg-slate-50/30">
                          {day}
                        </td>
                        {periods
                          .sort((a, b) => a.sort_order - b.sort_order)
                          .map((p) => {
                            let slot = timetableEntries.find(
                              (e) => e.day_of_week === day && e.period_id === p.id
                            );

                            if (viewFilter === 'teacher' && slot) {
                              if (slot.teacher_employee_id !== selectedTeacherId) slot = undefined;
                            }
                            if (viewFilter === 'room' && slot) {
                              if (slot.room_id !== selectedRoomId) slot = undefined;
                            }

                            if (p.period_type === 'BREAK' || p.period_type === 'LUNCH') {
                              return (
                                <td
                                  key={p.id}
                                  className="px-2 py-3 text-center border-l border-slate-100 bg-amber-50/20 text-[10px] font-semibold text-amber-800 italic"
                                >
                                  {p.period_type}
                                </td>
                              );
                            }

                            return (
                              <td
                                key={p.id}
                                className="px-2 py-2 text-center border-l border-slate-100 align-top min-w-[120px]"
                              >
                                {slot ? (
                                  <div className="p-2 rounded-lg bg-indigo-50/60 border border-indigo-100/80 text-left space-y-0.5 hover:shadow-2xs transition-shadow">
                                    <div className="font-bold text-indigo-950 truncate text-[11px]">
                                      {slot.subject_name}
                                    </div>
                                    <div className="text-[10px] text-slate-600 truncate flex items-center gap-1">
                                      <User className="w-2.5 h-2.5 text-slate-400" />
                                      {slot.teacher_first_name} {slot.teacher_last_name}
                                    </div>
                                    {slot.room_number && (
                                      <div className="text-[9px] font-mono text-indigo-600 font-semibold">
                                        Rm {slot.room_number}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSlotPreselectedDay(day);
                                      setSlotPreselectedPeriodId(p.id);
                                      setIsSlotModalOpen(true);
                                    }}
                                    className="w-full h-12 rounded-lg border border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 text-slate-300 hover:text-indigo-600 flex items-center justify-center transition-colors text-xs"
                                    title="Assign period slot"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            );
                          })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: Day-Based Timetable Cards */}
              <div className="md:hidden space-y-3">
                {/* Day Switcher Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
                  {days.map((day) => {
                    const isSelected = mobileSelectedDay === day;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setMobileSelectedDay(day)}
                        className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white font-bold shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>

                {/* Day's Period Schedule Cards */}
                <div className="space-y-2.5 pt-1">
                  {periods
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((p) => {
                      let slot = timetableEntries.find(
                        (e) => e.day_of_week === mobileSelectedDay && e.period_id === p.id
                      );

                      if (viewFilter === 'teacher' && slot) {
                        if (slot.teacher_employee_id !== selectedTeacherId) slot = undefined;
                      }
                      if (viewFilter === 'room' && slot) {
                        if (slot.room_id !== selectedRoomId) slot = undefined;
                      }

                      if (p.period_type === 'BREAK' || p.period_type === 'LUNCH') {
                        return (
                          <div
                            key={p.id}
                            className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              <span className="font-bold text-amber-900">{p.name} ({p.period_type})</span>
                            </div>
                            <span className="font-mono text-amber-700 text-[11px] font-semibold">
                              {p.start_time} - {p.end_time}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={p.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            slot
                              ? 'bg-white border-slate-200 shadow-2xs'
                              : 'bg-slate-50/60 border-dashed border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1.5 border-b border-slate-100 font-mono">
                            <span className="font-bold text-slate-700">{p.name}</span>
                            <span>{p.start_time} - {p.end_time}</span>
                          </div>

                          {slot ? (
                            <div className="mt-2.5 flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-xs font-bold text-indigo-950">
                                  {slot.subject_name}
                                </h4>
                                <div className="text-[11px] text-slate-600 flex items-center gap-1.5 mt-1">
                                  <User className="w-3 h-3 text-slate-400" />
                                  <span>{slot.teacher_first_name} {slot.teacher_last_name}</span>
                                </div>
                                {slot.room_number && (
                                  <div className="text-[10px] font-mono text-indigo-600 font-semibold mt-1">
                                    Room: {slot.room_number}
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() => {
                                  setSlotPreselectedDay(mobileSelectedDay);
                                  setSlotPreselectedPeriodId(p.id);
                                  setIsSlotModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200"
                              >
                                Edit Slot
                              </button>
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-xs text-slate-400 italic">Free / Unassigned Period</span>
                              <button
                                onClick={() => {
                                  setSlotPreselectedDay(mobileSelectedDay);
                                  setSlotPreselectedPeriodId(p.id);
                                  setIsSlotModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 bg-white hover:bg-indigo-50 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Assign Slot
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TEACHER SUBSTITUTIONS */}
          {activeTab === 'substitutions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Active Teacher Substitution Register</h3>
                  <p className="text-xs text-slate-500">Track faculty replacement assignments with conflict protection</p>
                </div>
                <button
                  onClick={() => setIsSubstModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Assign New Substitution
                </button>
              </div>

              {substitutions.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No substitutions recorded for this session.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                  {substitutions.map((s) => (
                    <div key={s.id} className="p-4 bg-white hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">
                            {s.class_name} ({s.subject_name}) · {s.period_name || 'Period'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {s.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          Covering Faculty: <strong className="text-indigo-700">{s.substitute_teacher_name}</strong> (in place of {s.original_teacher_name})
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Date: <span className="font-mono text-slate-700">{new Date(s.substitution_date).toLocaleDateString()}</span> · Reason: {s.reason}
                        </p>
                      </div>

                      <div className="text-right text-[11px] text-slate-500">
                        <div>Approved by {s.approved_by_name || 'Administration'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{s.remarks || 'Supervised instruction'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HOMEWORK & ASSIGNMENTS */}
          {activeTab === 'homework' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Homework & Academic Tasks</h3>
                  <p className="text-xs text-slate-500">Class assignments, due dates, student submission tracking, and grading</p>
                </div>
                <button
                  onClick={() => setIsHwModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Assign Homework
                </button>
              </div>

              {homeworkList.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No homework tasks assigned yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {homeworkList.map((h) => (
                    <div
                      key={h.id}
                      className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between hover:border-indigo-300 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-50 text-indigo-700">
                            {h.subject_name} · {h.class_name}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              h.priority === 'HIGH' || h.priority === 'URGENT'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {h.priority}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 leading-snug">{h.title}</h4>
                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                          {h.description}
                        </p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Deadline:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {new Date(h.due_date).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Submissions:</span>
                          <span className="font-bold text-emerald-700">
                            {h.total_submissions_count || 0} submitted ({h.evaluated_count || 0} graded)
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => setEvaluatingHw(h)}
                            className="flex-1 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <Award className="w-3.5 h-3.5" />
                            Evaluate Submissions
                          </button>
                          <button
                            onClick={() => setSubmittingHw(h)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                            title="Submit as Student"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Submit Work
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LEARNING MATERIALS & RESOURCES */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Study Materials & Notes Library</h3>
                  <p className="text-xs text-slate-500">Subject revision guides, presentations, laboratory manuals, and worksheets</p>
                </div>
                <button
                  onClick={() => setIsMaterialModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Upload New Material
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {materials.map((m) => (
                  <div key={m.id} className="p-4 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {m.subject_name} · {m.material_type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{m.file_size || '1.8 MB'}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 truncate">{m.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{m.description}</p>
                      <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400">
                        <span>Teacher: {m.teacher_name}</span>
                        <span className="font-semibold text-emerald-700 flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          {m.download_count} downloads
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CLASSROOM NOTICE BOARD */}
          {activeTab === 'notices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Classroom Notice Board & Bulletins</h3>
                  <p className="text-xs text-slate-500">Official broadcasts, event notices, reminders, and parent announcements</p>
                </div>
                <button
                  onClick={() => setIsNoticeModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Post Notice
                </button>
              </div>

              <div className="space-y-3">
                {notices.map((n) => (
                  <div key={n.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            n.priority === 'HIGH' || n.priority === 'URGENT'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {n.priority}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          Target: {n.target_audience}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(n.publish_date).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.content}</p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Posted by: <strong>{n.author_name}</strong></span>
                      <span className="text-blue-600 font-medium">Broadcasted</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: TEACHER CLASSROOM DASHBOARD */}
          {activeTab === 'teacher_dashboard' && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl border border-indigo-100 bg-indigo-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Faculty Classroom Control Desk</h3>
                  <p className="text-xs text-slate-500">
                    Logged in as <strong className="text-indigo-800">{user?.firstName} {user?.lastName}</strong> ({user?.roleDisplayName})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-indigo-700 shadow-2xs border border-indigo-200">
                    Next Class: Period 3 (09:50 AM) · Room 101
                  </span>
                </div>
              </div>

              {/* Today's Schedule Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Today's Scheduled Periods (Class 1-A)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="text-[10px] font-bold text-slate-400 font-mono">08:00 AM - 08:45 AM</div>
                    <div className="text-xs font-bold text-slate-900 mt-1">Period 1: English Core</div>
                    <div className="text-[11px] text-slate-500">Class 1-A · Room 101</div>
                    <span className="mt-2 inline-block text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Completed
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-indigo-400 bg-white ring-1 ring-indigo-400/30">
                    <div className="text-[10px] font-bold text-indigo-600 font-mono">08:45 AM - 09:30 AM</div>
                    <div className="text-xs font-bold text-slate-900 mt-1">Period 2: Mathematics</div>
                    <div className="text-[11px] text-slate-500">Class 1-A · Room 101</div>
                    <span className="mt-2 inline-block text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      Covered by Substitute
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="text-[10px] font-bold text-slate-400 font-mono">09:50 AM - 10:35 AM</div>
                    <div className="text-xs font-bold text-slate-900 mt-1">Period 3: Hindi Literature</div>
                    <div className="text-[11px] text-slate-500">Class 1-A · Room 101</div>
                    <span className="mt-2 inline-block text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      Upcoming
                    </span>
                  </div>
                </div>
              </div>

              {/* Pending Homework Grading */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Pending Homework Submissions To Evaluate
                </h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 bg-white">
                  {homeworkList.map((hw) => (
                    <div key={hw.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{hw.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {hw.class_name} · Due {new Date(hw.due_date).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => setEvaluatingHw(hw)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
                      >
                        Grade Submissions ({hw.total_submissions_count || 0})
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: STUDENT & PARENT ACADEMIC PORTAL */}
          {activeTab === 'student_portal' && (
            <div className="space-y-6">
              {/* Student Switcher (Allows testing student Kabir Das, Aarav Kumar, Vihaan, Isha Patel) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Student Academic View & Parent Guardian Access
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Inspecting child progress for: <strong className="text-indigo-700">{activeStudentName}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">Select Student / Ward:</label>
                  <select
                    value={activeStudentId}
                    onChange={(e) => {
                      setActiveStudentId(e.target.value);
                      const sName =
                        e.target.value === 'stu_vvps_008'
                          ? 'Kabir Das'
                          : e.target.value === 'stu_vvps_001'
                          ? 'Aarav Kumar'
                          : e.target.value === 'stu_vvps_006'
                          ? 'Vihaan Singhania'
                          : 'Isha Patel';
                      setActiveStudentName(sName);
                    }}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="stu_vvps_008">Kabir Das (Class 1-A · Topper)</option>
                    <option value="stu_vvps_001">Aarav Kumar (Class 1-A)</option>
                    <option value="stu_vvps_006">Vihaan Singhania (Class 1-A)</option>
                    <option value="stu_vvps_007">Isha Patel (Class 1-A)</option>
                  </select>
                </div>
              </div>

              {/* Child Homework Status Cards */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Assigned Homework & Submission Feedback
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {homeworkList.map((hw) => (
                    <div key={hw.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                          {hw.subject_name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                          {hw.student_submission_status || 'Submitted'}
                        </span>
                      </div>

                      <h5 className="text-xs font-bold text-slate-900">{hw.title}</h5>
                      <p className="text-[11px] text-slate-600 line-clamp-2">{hw.description}</p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px]">Marks:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {hw.student_marks_obtained || '19.5'} / {hw.max_marks || 20} ({hw.student_grade || 'A1'})
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 text-[11px] text-slate-700 italic border border-slate-100">
                        "{hw.student_feedback || 'Exemplary clarity in variable definitions and algebraic balancing. Outstanding presentation!'}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: WORKLOAD & REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Teacher Workload & Academic Scheduling Analytics</h3>
                  <p className="text-xs text-slate-500">Weekly teaching load, periods distribution, and homework activity per teacher</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                      <th className="px-4 py-3 text-left font-bold uppercase text-[10px]">Faculty Name</th>
                      <th className="px-3 py-3 text-left font-bold uppercase text-[10px]">Emp ID</th>
                      <th className="px-3 py-3 text-center font-bold uppercase text-[10px]">Periods / Week</th>
                      <th className="px-3 py-3 text-center font-bold uppercase text-[10px]">Classes</th>
                      <th className="px-3 py-3 text-center font-bold uppercase text-[10px]">Substitutions Covered</th>
                      <th className="px-3 py-3 text-center font-bold uppercase text-[10px]">Homework Assigned</th>
                      <th className="px-3 py-3 text-right font-bold uppercase text-[10px]">Workload Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {workloadReport.map((w) => (
                      <tr key={w.teacher_id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {w.first_name} {w.last_name}
                        </td>
                        <td className="px-3 py-3 font-mono text-slate-500">{w.employee_id_number}</td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-indigo-700">
                          {w.periods_per_week || 8}
                        </td>
                        <td className="px-3 py-3 text-center font-mono">{w.classes_assigned_count || 1}</td>
                        <td className="px-3 py-3 text-center font-mono text-amber-700">
                          {w.substitution_periods_count || 0}
                        </td>
                        <td className="px-3 py-3 text-center font-mono">{w.homework_assigned_count || 1}</td>
                        <td className="px-3 py-3 text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            Normal (Under 30)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      <TimetableSlotModal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        onSuccess={() => {
          if (selectedTimetableId) loadTimetableDetails(selectedTimetableId);
        }}
        timetableId={selectedTimetableId}
        schoolId={schoolId}
        classId={currentTimetable?.class_id || classes[0]?.id || ''}
        sectionId={currentTimetable?.section_id || undefined}
        preselectedDay={slotPreselectedDay}
        preselectedPeriodId={slotPreselectedPeriodId}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
        rooms={rooms}
        periods={periods}
      />

      <SubstitutionModal
        isOpen={isSubstModalOpen}
        onClose={() => setIsSubstModalOpen(false)}
        onSuccess={() => {
          loadSubstitutions();
          api.classroom.getDashboardSummary(schoolId).then(setSummary);
        }}
        schoolId={schoolId}
        teachers={teachers}
        classes={classes}
        subjects={subjects}
        periods={periods}
      />

      <HomeworkModal
        isOpen={isHwModalOpen}
        onClose={() => setIsHwModalOpen(false)}
        onSuccess={() => {
          loadHomework();
          api.classroom.getDashboardSummary(schoolId).then(setSummary);
        }}
        schoolId={schoolId}
        classes={classes}
        subjects={subjects}
      />

      <HomeworkEvaluateModal
        isOpen={!!evaluatingHw}
        onClose={() => setEvaluatingHw(null)}
        onSuccess={() => {
          loadHomework();
          api.classroom.getDashboardSummary(schoolId).then(setSummary);
        }}
        homework={evaluatingHw}
      />

      <HomeworkSubmitModal
        isOpen={!!submittingHw}
        onClose={() => setSubmittingHw(null)}
        onSuccess={() => {
          loadHomework();
          api.classroom.getDashboardSummary(schoolId).then(setSummary);
        }}
        homework={submittingHw}
        studentId={activeStudentId}
        studentName={activeStudentName}
      />

      <StudyMaterialModal
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        onSuccess={() => {
          loadMaterials();
          api.classroom.getDashboardSummary(schoolId).then(setSummary);
        }}
        schoolId={schoolId}
        classes={classes}
        subjects={subjects}
      />

      <ClassNoticeModal
        isOpen={isNoticeModalOpen}
        onClose={() => setIsNoticeModalOpen(false)}
        onSuccess={() => {
          loadNotices();
          api.classroom.getDashboardSummary(schoolId).then(setSummary);
        }}
        schoolId={schoolId}
        classes={classes}
      />

      <TimetablePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        school={activeSchool}
        timetable={currentTimetable}
        entries={timetableEntries}
        periods={periods}
      />
    </div>
  );
};
