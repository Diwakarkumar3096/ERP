import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type {
  Employee,
  StaffStats,
  School,
  Department,
  Designation,
  AcademicSession
} from '../../types/erp.js';
import {
  Users,
  UserPlus,
  Briefcase,
  GraduationCap,
  Building2,
  Calendar,
  Layers,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Edit3,
  UserX,
  Award,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Plus,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Phone,
  Mail,
  AlertCircle,
  Wallet
} from 'lucide-react';

import { EmployeeProfileModal } from './EmployeeProfileModal.js';
import { CreateEmployeeModal } from './CreateEmployeeModal.js';
import { EditEmployeeModal } from './EditEmployeeModal.js';
import { EmployeeStatusModal } from './EmployeeStatusModal.js';
import { DepartmentModal } from './DepartmentModal.js';
import { DesignationModal } from './DesignationModal.js';
import { AssignSubjectModal } from './AssignSubjectModal.js';
import { AssignClassTeacherModal } from './AssignClassTeacherModal.js';
import { BulkImportEmployeesModal } from './BulkImportEmployeesModal.js';
import { PayrollManagementView } from '../payroll/PayrollManagementView.js';

export const StaffManagementView: React.FC = () => {
  const { user, isSuperAdmin, activeSchool, hasPermission } = useAuth();

  // Navigation Subtabs
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'teachers' | 'departments' | 'payroll'>('directory');

  // Filters & State
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(activeSchool?.id || user?.schoolId || '');
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [stats, setStats] = useState<StaffStats | null>(null);

  // Directory List
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterDesig, setFilterDesig] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Teachers List
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  // Modals
  const [viewEmployeeId, setViewEmployeeId] = useState<string | null>(null);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [statusEmployee, setStatusEmployee] = useState<Employee | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Meta modals
  const [editingDept, setEditingDept] = useState<Department | null | 'new'>(null);
  const [editingDesig, setEditingDesig] = useState<Designation | null | 'new'>(null);

  // Teacher Assignment modals
  const [assignSubjectTeacher, setAssignSubjectTeacher] = useState<{ id: string; name: string } | null>(null);
  const [assignClassTeacher, setAssignClassTeacher] = useState<{ id: string; name: string } | null>(null);

  // Load initial schools & active sessions
  useEffect(() => {
    api.schools.list()
      .then((res) => {
        setSchools(res.schools || []);
        if (!selectedSchoolId && res.schools?.length > 0) {
          setSelectedSchoolId(res.schools[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // When school changes, load sessions, metadata, and stats
  useEffect(() => {
    if (!selectedSchoolId) return;

    api.sessions.list(selectedSchoolId)
      .then((res) => {
        setSessions(res.sessions || []);
        const curr = res.sessions?.find(s => s.is_current) || res.sessions?.[0];
        if (curr) setSelectedSessionId(curr.id);
      })
      .catch(console.error);

    loadMetaAndStats();
  }, [selectedSchoolId]);

  const loadMetaAndStats = () => {
    Promise.all([
      api.employees.getStats({ schoolId: selectedSchoolId }),
      api.employees.getDepartments(selectedSchoolId),
      api.employees.getDesignations(selectedSchoolId)
    ])
      .then(([statsRes, deptRes, desigRes]) => {
        setStats(statsRes.stats);
        setDepartments(deptRes.departments || []);
        setDesignations(desigRes.designations || []);
      })
      .catch(console.error);
  };

  // Fetch Directory Employees
  const fetchEmployees = () => {
    if (!selectedSchoolId) return;
    setLoading(true);

    api.employees.list({
      schoolId: selectedSchoolId,
      employeeType: filterType || undefined,
      departmentId: filterDept || undefined,
      designationId: filterDesig || undefined,
      status: filterStatus || undefined,
      search: search || undefined,
      page,
      limit
    })
      .then((res) => {
        setEmployees(res.employees);
        setTotalEmployees(res.total);
        setTotalPages(res.totalPages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEmployees();
  }, [selectedSchoolId, filterType, filterDept, filterDesig, filterStatus, page, limit]);

  // Handle Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchEmployees();
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Teachers when on 'teachers' subtab
  const fetchTeachers = () => {
    if (!selectedSchoolId) return;
    setLoadingTeachers(true);
    api.employees.listTeachers({ schoolId: selectedSchoolId, sessionId: selectedSessionId || undefined })
      .then((res) => {
        setTeachersList(res.teachers || []);
      })
      .catch(console.error)
      .finally(() => setLoadingTeachers(false));
  };

  useEffect(() => {
    if (activeSubTab === 'teachers') {
      fetchTeachers();
    }
  }, [activeSubTab, selectedSchoolId, selectedSessionId]);

  const handleDeactivate = async (emp: Employee) => {
    if (!window.confirm(`Are you sure you want to deactivate ${emp.first_name} ${emp.last_name} (${emp.employee_id_number})? Historical service records will be preserved.`)) {
      return;
    }
    try {
      await api.employees.delete(emp.id);
      fetchEmployees();
      loadMetaAndStats();
    } catch (err: any) {
      alert(err?.message || 'Failed to deactivate employee');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff & Faculty Management</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Phase 4 Core
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Faculty directory, teaching assignments, departmental hierarchy, and institutional personnel records
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* School Selector (for Super Admin) */}
          {isSuperAdmin && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedSchoolId}
                onChange={(e) => {
                  setSelectedSchoolId(e.target.value);
                  setPage(1);
                }}
                className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
              >
                {schools.map((sch) => (
                  <option key={sch.id} value={sch.id}>
                    {sch.name} ({sch.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Actions */}
          {hasPermission('employees.export') && (
            <a
              href={api.employees.exportUrl(selectedSchoolId)}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          )}

          {hasPermission('employees.create') && (
            <>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Onboard Employee</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Staff</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">{stats.total}</div>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] text-indigo-500 font-semibold uppercase">Teaching</span>
            <div className="text-xl font-bold font-mono text-indigo-600 mt-1">{stats.teaching}</div>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] text-purple-500 font-semibold uppercase">Non-Teaching</span>
            <div className="text-xl font-bold font-mono text-purple-600 mt-1">{stats.nonTeaching}</div>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] text-emerald-500 font-semibold uppercase">Active Duty</span>
            <div className="text-xl font-bold font-mono text-emerald-600 mt-1">{stats.active}</div>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] text-amber-500 font-semibold uppercase">On Probation</span>
            <div className="text-xl font-bold font-mono text-amber-600 mt-1">{stats.onProbation}</div>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] text-blue-500 font-semibold uppercase">On Leave</span>
            <div className="text-xl font-bold font-mono text-blue-600 mt-1">{stats.onLeave}</div>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Departments</span>
            <div className="text-xl font-bold font-mono text-slate-800 mt-1">{stats.departmentsCount}</div>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] text-rose-500 font-semibold uppercase">New Joinings</span>
            <div className="text-xl font-bold font-mono text-rose-600 mt-1">{stats.newJoiningsThisYear}</div>
          </div>
        </div>
      )}

      {/* Main Tab Bar Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/50 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveSubTab('directory')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
            activeSubTab === 'directory'
              ? 'bg-white text-indigo-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Staff Directory ({totalEmployees})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('teachers')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
            activeSubTab === 'teachers'
              ? 'bg-white text-indigo-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Teacher Workload & Assignments</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('departments')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
            activeSubTab === 'departments'
              ? 'bg-white text-indigo-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Departments & Designations</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('payroll')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
            activeSubTab === 'payroll'
              ? 'bg-white text-indigo-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>HR, Payroll & Leaves (Phase 12)</span>
        </button>
      </div>

      {/* SUBTAB 1: STAFF DIRECTORY */}
      {activeSubTab === 'directory' && (
        <div className="space-y-4">
          {/* Filters & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, Employee ID, mobile, email..."
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Type filter */}
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setPage(1);
                }}
                className="text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">All Employee Types</option>
                <option value="Teaching">Teaching Faculty</option>
                <option value="Non-Teaching">Non-Teaching Staff</option>
              </select>

              {/* Department filter */}
              <select
                value={filterDept}
                onChange={(e) => {
                  setFilterDept(e.target.value);
                  setPage(1);
                }}
                className="text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active Service</option>
                <option value="ON_PROBATION">On Probation</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="RESIGNED">Resigned</option>
                <option value="TERMINATED">Terminated</option>
                <option value="RETIRED">Retired</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Employee Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-500">Loading staff records...</div>
            ) : employees.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No employees found matching the selected criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Faculty / Staff Member</th>
                      <th className="py-3 px-3">Employee ID</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Designation & Department</th>
                      <th className="py-3 px-3">Contact</th>
                      <th className="py-3 px-3">Joining Date</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {emp.profile_photo ? (
                              <img
                                src={emp.profile_photo}
                                alt={emp.first_name}
                                className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {emp.first_name[0]}{emp.last_name[0]}
                              </div>
                            )}
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => setViewEmployeeId(emp.id)}
                                className="font-bold text-slate-900 hover:text-indigo-600 text-left truncate block"
                              >
                                {emp.first_name} {emp.middle_name} {emp.last_name}
                              </button>
                              <div className="text-[11px] text-slate-400">
                                {emp.qualification || emp.gender}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 font-mono font-semibold text-slate-700">
                          {emp.employee_id_number}
                        </td>

                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            emp.employee_type === 'Teaching'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {emp.employee_type}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800">{emp.designation_name || 'N/A'}</div>
                          <div className="text-[11px] text-slate-500">{emp.department_name || 'General'}</div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-mono text-slate-700">{emp.mobile_number}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                            {emp.official_email || emp.email || '—'}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-600">
                          {new Date(emp.date_of_joining).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>

                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            emp.employment_status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : emp.employment_status === 'ON_PROBATION'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : emp.employment_status === 'ON_LEAVE'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {emp.employment_status.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewEmployeeId(emp.id)}
                              title="View Full Profile Dossier"
                              className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {hasPermission('employees.edit') && (
                              <button
                                type="button"
                                onClick={() => setEditEmployee(emp)}
                                title="Edit Demographics"
                                className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {hasPermission('employees.edit') && (
                              <button
                                type="button"
                                onClick={() => setStatusEmployee(emp)}
                                title="Status Transition & Exit Workflow"
                                className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {hasPermission('employees.delete') && emp.employment_status !== 'INACTIVE' && (
                              <button
                                type="button"
                                onClick={() => handleDeactivate(emp)}
                                title="Deactivate Employee"
                                className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Showing page {page} of {totalPages} ({totalEmployees} total staff records)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-mono px-2 py-0.5 rounded bg-white border border-slate-200">
                    {page}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: TEACHER WORKLOAD & ASSIGNMENTS */}
      {activeSubTab === 'teachers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Faculty Academic Workload & In-Charge Rosters</h3>
              <p className="text-xs text-slate-500">
                Curriculum subject mapping, teaching loads, and class teacher section assignments
              </p>
            </div>
            {sessions.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Session:</span>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="text-xs font-semibold px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.is_current ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingTeachers ? (
              <div className="p-12 text-center text-xs text-slate-500">Loading teaching faculty...</div>
            ) : teachersList.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">No teaching faculty found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Teacher Name</th>
                      <th className="py-3 px-3">Employee ID</th>
                      <th className="py-3 px-3">Specialization & Credentials</th>
                      <th className="py-3 px-3">Assigned Subjects</th>
                      <th className="py-3 px-3">Taught Classes</th>
                      <th className="py-3 px-3">Class In-Charge</th>
                      <th className="py-3 px-4 text-right">Academic Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teachersList.map((t) => (
                      <tr key={t.teacher_profile_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {t.profile_photo ? (
                              <img src={t.profile_photo} alt={t.first_name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {t.first_name[0]}{t.last_name[0]}
                              </div>
                            )}
                            <div>
                              <button
                                type="button"
                                onClick={() => setViewEmployeeId(t.employee_id)}
                                className="font-bold text-slate-900 hover:text-indigo-600 block text-left truncate"
                              >
                                {t.first_name} {t.last_name}
                              </button>
                              <span className="text-[11px] text-slate-400">{t.designation_name}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 font-mono font-semibold text-slate-700">{t.employee_id_number}</td>

                        <td className="py-3 px-3">
                          <div className="text-slate-800 font-medium">{t.specialization || 'General Subject'}</div>
                          <div className="text-[11px] text-slate-500">{t.highest_qualification} · {t.teaching_experience_years || 0} yrs</div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-mono text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            {t.subjects_count || 0} subjects
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-mono text-blue-700 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                            {t.classes_count || 0} classes
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          {t.class_teacher_sections_count > 0 ? (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                              <Award className="w-3 h-3 text-amber-600" /> Class In-Charge
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">None</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {hasPermission('teachers.assign_subject') && (
                              <button
                                type="button"
                                onClick={() => setAssignSubjectTeacher({ id: t.teacher_profile_id, name: `${t.first_name} ${t.last_name}` })}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <BookOpen className="w-3 h-3" /> Assign Subject
                              </button>
                            )}

                            {hasPermission('teachers.assign_class') && (
                              <button
                                type="button"
                                onClick={() => setAssignClassTeacher({ id: t.teacher_profile_id, name: `${t.first_name} ${t.last_name}` })}
                                className="px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Award className="w-3 h-3" /> Class In-Charge
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: DEPARTMENTS & DESIGNATIONS */}
      {activeSubTab === 'departments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Departments Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Departments ({departments.length})</h3>
              </div>
              {hasPermission('departments.create') && (
                <button
                  type="button"
                  onClick={() => setEditingDept('new')}
                  className="px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Department
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
              {departments.map((d) => (
                <div key={d.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{d.name}</span>
                      {d.code && (
                        <span className="font-mono text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                          {d.code}
                        </span>
                      )}
                    </div>
                    {d.description && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{d.description}</p>}
                    <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                      {d.employees_count || 0} active employees
                    </span>
                  </div>
                  {hasPermission('departments.edit') && (
                    <button
                      type="button"
                      onClick={() => setEditingDept(d)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-200 shrink-0"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Designations Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Designations ({designations.length})</h3>
              </div>
              {hasPermission('designations.create') && (
                <button
                  type="button"
                  onClick={() => setEditingDesig('new')}
                  className="px-2.5 py-1 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Designation
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
              {designations.map((des) => (
                <div key={des.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{des.name}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                        des.employee_type === 'Teaching' ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'
                      }`}>
                        {des.employee_type}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Dept: {des.department_name || 'General'} {des.code ? `(${des.code})` : ''}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                      {des.employees_count || 0} active staff
                    </span>
                  </div>
                  {hasPermission('designations.edit') && (
                    <button
                      type="button"
                      onClick={() => setEditingDesig(des)}
                      className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-slate-200 shrink-0"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: HR, PAYROLL & LEAVES */}
      {activeSubTab === 'payroll' && (
        <PayrollManagementView />
      )}

      {/* MODALS */}
      {viewEmployeeId && (
        <EmployeeProfileModal
          employeeId={viewEmployeeId}
          onClose={() => setViewEmployeeId(null)}
          onRefresh={() => {
            fetchEmployees();
            loadMetaAndStats();
          }}
        />
      )}

      {showCreateModal && (
        <CreateEmployeeModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchEmployees();
            loadMetaAndStats();
          }}
        />
      )}

      {editEmployee && (
        <EditEmployeeModal
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
          onSuccess={() => {
            setEditEmployee(null);
            fetchEmployees();
            loadMetaAndStats();
          }}
        />
      )}

      {statusEmployee && (
        <EmployeeStatusModal
          employee={statusEmployee}
          onClose={() => setStatusEmployee(null)}
          onSuccess={() => {
            setStatusEmployee(null);
            fetchEmployees();
            loadMetaAndStats();
          }}
        />
      )}

      {showImportModal && (
        <BulkImportEmployeesModal
          schoolId={selectedSchoolId}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            fetchEmployees();
            loadMetaAndStats();
          }}
        />
      )}

      {editingDept && (
        <DepartmentModal
          schoolId={selectedSchoolId}
          department={editingDept === 'new' ? null : editingDept}
          onClose={() => setEditingDept(null)}
          onSuccess={() => {
            setEditingDept(null);
            loadMetaAndStats();
          }}
        />
      )}

      {editingDesig && (
        <DesignationModal
          schoolId={selectedSchoolId}
          departments={departments}
          designation={editingDesig === 'new' ? null : editingDesig}
          onClose={() => setEditingDesig(null)}
          onSuccess={() => {
            setEditingDesig(null);
            loadMetaAndStats();
          }}
        />
      )}

      {assignSubjectTeacher && (
        <AssignSubjectModal
          teacherId={assignSubjectTeacher.id}
          teacherName={assignSubjectTeacher.name}
          schoolId={selectedSchoolId}
          onClose={() => setAssignSubjectTeacher(null)}
          onSuccess={() => {
            setAssignSubjectTeacher(null);
            fetchTeachers();
          }}
        />
      )}

      {assignClassTeacher && (
        <AssignClassTeacherModal
          teacherId={assignClassTeacher.id}
          teacherName={assignClassTeacher.name}
          schoolId={selectedSchoolId}
          onClose={() => setAssignClassTeacher(null)}
          onSuccess={() => {
            setAssignClassTeacher(null);
            fetchTeachers();
          }}
        />
      )}
    </div>
  );
};
