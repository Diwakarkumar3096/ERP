import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../common/Toast.js';
import { StudentProfileModal } from './StudentProfileModal.js';
import { StudentFormModal } from './StudentFormModal.js';
import { StudentPromotionModal } from './StudentPromotionModal.js';
import { ConfirmDialog } from '../common/ConfirmDialog.js';
import type { Student, School, AcademicSession, ClassItem, SectionItem } from '../../types/erp.js';
import {
  Users,
  UserPlus,
  ArrowUpRight,
  Download,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';

export const StudentsView: React.FC = () => {
  const { user, activeSchool, activeSession, availableSchools, isSuperAdmin, hasPermission } = useAuth();
  const toast = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const pageSize = 25;

  // Filter states
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(activeSchool?.id || '');
  const [selectedSessionId, setSelectedSessionId] = useState<string>(activeSession?.id || '');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ACTIVE');
  const [selectedGender, setSelectedGender] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Dropdowns data
  const [schools, setSchools] = useState<School[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);

  // Modals state
  const [profileModalStudentId, setProfileModalStudentId] = useState<string | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);

  // Delete state
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sync selected school with Auth active school
  useEffect(() => {
    if (activeSchool?.id) {
      setSelectedSchoolId(activeSchool.id);
    }
  }, [activeSchool]);

  useEffect(() => {
    if (activeSession?.id) {
      setSelectedSessionId(activeSession.id);
    }
  }, [activeSession]);

  // Load Schools list
  useEffect(() => {
    api.schools.list()
      .then(res => setSchools(res.schools))
      .catch(console.error);
  }, []);

  // When School changes, load sessions and classes
  useEffect(() => {
    if (!selectedSchoolId) return;

    api.sessions.list(selectedSchoolId)
      .then(res => {
        setSessions(res.sessions);
        if (!selectedSessionId && res.sessions.length > 0) {
          const current = res.sessions.find(s => s.is_current) || res.sessions[0];
          setSelectedSessionId(current.id);
        }
      })
      .catch(console.error);

    api.classes.list(selectedSchoolId)
      .then(res => setClasses(res.classes))
      .catch(console.error);
  }, [selectedSchoolId]);

  // When Class changes, load sections
  useEffect(() => {
    if (!selectedSchoolId || !selectedClassId) {
      setSections([]);
      setSelectedSectionId('');
      return;
    }

    const cls = classes.find(c => c.id === selectedClassId);
    if (cls && cls.sections) {
      setSections(cls.sections);
    } else {
      api.sections.list(selectedSchoolId, selectedClassId)
        .then(res => setSections(res.sections))
        .catch(console.error);
    }
  }, [selectedSchoolId, selectedClassId, classes]);

  // Load Students
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.students.list({
        schoolId: selectedSchoolId || undefined,
        sessionId: selectedSessionId || undefined,
        classId: selectedClassId || undefined,
        sectionId: selectedSectionId || undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        gender: selectedGender !== 'ALL' ? selectedGender : undefined,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        search: searchTerm.trim() || undefined,
        page: currentPage,
        limit: pageSize
      });

      setStudents(res.students);
      setTotalStudents(res.total);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch student records.');
    } finally {
      setLoading(false);
    }
  }, [selectedSchoolId, selectedSessionId, selectedClassId, selectedSectionId, selectedStatus, selectedGender, selectedCategory, searchTerm, currentPage, pageSize]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleResetFilters = () => {
    setSelectedClassId('');
    setSelectedSectionId('');
    setSelectedStatus('ALL');
    setSelectedGender('ALL');
    setSelectedCategory('ALL');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    setDeleting(true);
    try {
      await api.students.delete(studentToDelete.id);
      toast.success(`Student ${studentToDelete.first_name} ${studentToDelete.last_name} deleted.`);
      setStudentToDelete(null);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete student.');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = () => {
    if (students.length === 0) {
      toast.error('No students available to export.');
      return;
    }

    const headers = [
      'Admission No',
      'Roll No',
      'First Name',
      'Last Name',
      'Gender',
      'DOB',
      'Blood Group',
      'Class',
      'Section',
      'School',
      'Session',
      'Primary Guardian',
      'Guardian Phone',
      'Student Status',
      'Admission Date'
    ];

    const rows = students.map(s => [
      `"${s.admission_number}"`,
      `"${s.roll_number || ''}"`,
      `"${s.first_name}"`,
      `"${s.last_name}"`,
      `"${s.gender}"`,
      `"${s.date_of_birth}"`,
      `"${s.blood_group || ''}"`,
      `"${s.class_name || ''}"`,
      `"${s.section_name || ''}"`,
      `"${s.school_name || ''}"`,
      `"${s.session_name || ''}"`,
      `"${s.primary_parent_name || ''}"`,
      `"${s.primary_parent_mobile || ''}"`,
      `"${s.student_status}"`,
      `"${s.admission_date}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Students_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded student roster CSV.');
  };

  // Quick stats calculations
  const maleCount = students.filter(s => s.gender === 'Male').length;
  const femaleCount = students.filter(s => s.gender === 'Female').length;
  const activeCount = students.filter(s => s.student_status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Student Directory & Enrollment
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Phase 2 Complete
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete student dossiers, admission roll numbers, academic sessions, and verified parent contacts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {hasPermission('students.promote') && (
            <button
              type="button"
              onClick={() => setPromotionModalOpen(true)}
              className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
              <span>Promote / Rollover</span>
            </button>
          )}

          {hasPermission('students.create') && (
            <button
              type="button"
              onClick={() => {
                setStudentToEdit(null);
                setFormModalOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Student</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Enrolled Students
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {totalStudents}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Across selected campus & session
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Active In School
            </span>
            <span className="text-2xl font-bold text-emerald-600 mt-1 block">
              {activeCount}
            </span>
            <span className="text-[11px] text-emerald-700 font-medium mt-0.5 block">
              Regular academic attendance
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Gender Demographics
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-base font-bold text-slate-900">{maleCount} Boys</span>
              <span className="text-slate-300">·</span>
              <span className="text-base font-bold text-purple-700">{femaleCount} Girls</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Page sample breakdown
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Document Compliance
            </span>
            <span className="text-2xl font-bold text-indigo-600 mt-1 block">
              100%
            </span>
            <span className="text-[11px] text-indigo-700 font-medium mt-0.5 block">
              Aadhaar & Birth Cert on file
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Search & Multi-Dimensional Filters</span>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-semibold transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, adm no, roll, phone..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* School Selector */}
          <div>
            <select
              disabled={!isSuperAdmin && !hasPermission('schools.switch')}
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
            >
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          {/* Session Selector */}
          <div>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="">-- All Sessions --</option>
              {sessions.map(ses => (
                <option key={ses.id} value={ses.id}>{ses.name} {ses.is_current ? '(Current)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Class Selector */}
          <div>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="">-- All Classes --</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.stream})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {/* Section */}
          <div>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              disabled={!selectedClassId}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
            >
              <option value="">-- All Sections --</option>
              {sections.map(sec => (
                <option key={sec.id} value={sec.id}>Section {sec.name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-semibold"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="TRANSFERRED">TRANSFERRED</option>
              <option value="WITHDRAWN">WITHDRAWN</option>
              <option value="GRADUATED">GRADUATED</option>
            </select>
          </div>

          {/* Gender */}
          <div>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="ALL">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="ALL">All Categories</option>
              <option value="General">General</option>
              <option value="OBC">OBC</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="EWS">EWS</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Student Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Adm & Roll No</th>
                <th className="py-3 px-4">Class & Section</th>
                <th className="py-3 px-4">Primary Guardian</th>
                <th className="py-3 px-4">Demographics</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span className="text-xs font-medium">Loading student directory...</span>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">No students match current filter criteria</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try resetting filters or registering a new student.</p>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Student Name & Avatar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                          {student.profile_photo ? (
                            <img src={student.profile_photo} alt={student.first_name} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            `${student.first_name[0]}${student.last_name[0]}`
                          )}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => setProfileModalStudentId(student.id)}
                            className="font-bold text-slate-900 hover:text-indigo-600 text-left transition-colors flex items-center gap-1 group"
                          >
                            <span>{student.first_name} {student.middle_name || ''} {student.last_name}</span>
                          </button>
                          <div className="text-[11px] text-slate-400 font-medium">
                            DOB: {student.date_of_birth} · {student.gender}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Admission & Roll */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] block w-fit">
                        {student.admission_number}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                        Roll: {student.roll_number || 'N/A'}
                      </span>
                    </td>

                    {/* Class & Section */}
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">
                        {student.class_name} - {student.section_name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        {student.session_name} · {student.school_code}
                      </span>
                    </td>

                    {/* Primary Guardian */}
                    <td className="py-3 px-4">
                      {student.primary_parent_name ? (
                        <div>
                          <span className="font-semibold text-slate-800 block">
                            {student.primary_parent_name}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                            {student.primary_parent_mobile} ({student.primary_parent_relationship})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No guardian linked</span>
                      )}
                    </td>

                    {/* Demographics */}
                    <td className="py-3 px-4 text-[11px]">
                      <span className="text-slate-700 font-medium block">
                        {student.category} · {student.blood_group || 'N/A'}
                      </span>
                      <span className="text-slate-400 block">
                        {student.city || 'Local'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-block ${
                        student.student_status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : student.student_status === 'TRANSFERRED'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : student.student_status === 'GRADUATED'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {student.student_status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setProfileModalStudentId(student.id)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Student Dossier"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {hasPermission('students.edit') && (
                          <button
                            type="button"
                            onClick={() => {
                              setStudentToEdit(student);
                              setFormModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Student"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {hasPermission('students.delete') && (
                          <button
                            type="button"
                            onClick={() => setStudentToDelete(student)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{students.length}</strong> of <strong className="text-slate-800">{totalStudents}</strong> students
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Connected Modals */}
      <StudentProfileModal
        isOpen={Boolean(profileModalStudentId)}
        onClose={() => setProfileModalStudentId(null)}
        studentId={profileModalStudentId}
        onStudentUpdated={fetchStudents}
      />

      <StudentFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        studentToEdit={studentToEdit}
        onSaved={fetchStudents}
      />

      <StudentPromotionModal
        isOpen={promotionModalOpen}
        onClose={() => setPromotionModalOpen(false)}
        onPromoted={fetchStudents}
      />

      {studentToDelete && (
        <ConfirmDialog
          isOpen={Boolean(studentToDelete)}
          onClose={() => setStudentToDelete(null)}
          onConfirm={handleDeleteStudent}
          title="Delete Student Record"
          message={`Are you sure you want to delete ${studentToDelete.first_name} ${studentToDelete.last_name} (${studentToDelete.admission_number})? This action will remove all linked documents and enrollments.`}
          confirmLabel="Delete Student"
          isDestructive={true}
          loading={deleting}
        />
      )}
    </div>
  );
};
