import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../services/api.js';
import type { NavTab } from './Sidebar.js';
import {
  Search,
  X,
  Command,
  LayoutDashboard,
  Building2,
  Calendar,
  Layers,
  GraduationCap,
  Users,
  UserCheck,
  Briefcase,
  Wallet,
  Clock,
  CreditCard,
  BookOpen,
  Bus,
  Library,
  Home,
  Package,
  ShieldCheck,
  History,
  ChevronRight,
  Loader2,
  Award,
  MessageSquare
} from 'lucide-react';

interface ModuleItem {
  id: NavTab;
  title: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  keywords: string[];
}

const SYSTEM_MODULES: ModuleItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard & Executive KPIs',
    category: 'System Overview',
    description: 'Campus enrollment analytics, revenue summaries, and quick shortcuts',
    icon: <LayoutDashboard className="w-4 h-4 text-indigo-600" />,
    keywords: ['home', 'overview', 'analytics', 'kpi', 'metrics', 'stats']
  },
  {
    id: 'schools',
    title: 'School Campuses & Branches',
    category: 'Administration',
    description: 'Configure multi-school branch isolation, contact info, and campus codes',
    icon: <Building2 className="w-4 h-4 text-blue-600" />,
    keywords: ['campus', 'branch', 'institute', 'organization', 'vvps', 'gisk']
  },
  {
    id: 'sessions',
    title: 'Academic Sessions & Years',
    category: 'Academic Administration',
    description: 'Manage academic calendar cycles, terms, and current active session',
    icon: <Calendar className="w-4 h-4 text-amber-600" />,
    keywords: ['term', 'semester', 'year', 'calendar', '2025-2026', '2026-2027']
  },
  {
    id: 'classes',
    title: 'Classes & Sections',
    category: 'Academic Administration',
    description: 'Manage grade levels, streams, section capacities, and class teachers',
    icon: <Layers className="w-4 h-4 text-cyan-600" />,
    keywords: ['grade', 'division', 'standard', 'classroom', 'stream', 'section']
  },
  {
    id: 'admissions',
    title: 'Admissions & Enrollment',
    category: 'Student Lifecycle',
    description: 'Online application portal, document verification, and admission approval',
    icon: <GraduationCap className="w-4 h-4 text-emerald-600" />,
    keywords: ['enquiry', 'applicant', 'application', 'register', 'intake', 'prospective']
  },
  {
    id: 'students',
    title: 'Students Directory & Profiles',
    category: 'Student Lifecycle',
    description: 'Complete student registry, admission numbers, roll codes, and bio records',
    icon: <Users className="w-4 h-4 text-teal-600" />,
    keywords: ['pupil', 'learner', 'scholar', 'roll number', 'admission number']
  },
  {
    id: 'parents',
    title: 'Parents & Guardians',
    category: 'Student Lifecycle',
    description: 'Family profiles, primary emergency contacts, and student linkages',
    icon: <UserCheck className="w-4 h-4 text-violet-600" />,
    keywords: ['father', 'mother', 'guardian', 'family', 'contact', 'phone']
  },
  {
    id: 'staff',
    title: 'Staff & Teachers Directory',
    category: 'Human Resources',
    description: 'Faculty profiles, departmental rosters, designations, and employee codes',
    icon: <Briefcase className="w-4 h-4 text-orange-600" />,
    keywords: ['teacher', 'faculty', 'employee', 'instructor', 'professor', 'hr', 'staff']
  },
  {
    id: 'payroll',
    title: 'Payroll & Staff Compensation',
    category: 'Human Resources',
    description: 'Salary structures, allowances, deductions, monthly payslips, and disbursement',
    icon: <Wallet className="w-4 h-4 text-green-600" />,
    keywords: ['salary', 'wages', 'payslip', 'epf', 'esi', 'allowance', 'deduction']
  },
  {
    id: 'attendance',
    title: 'Attendance Register',
    category: 'Daily Operations',
    description: 'Student daily register, employee biometric mark, and absence leaves',
    icon: <Clock className="w-4 h-4 text-blue-600" />,
    keywords: ['present', 'absent', 'leave', 'holiday', 'roll call', 'daily log']
  },
  {
    id: 'fees',
    title: 'Fees & Accounts Management',
    category: 'Financial Operations',
    description: 'Fee collection counters, receipt printing, outstanding dues, and expense register',
    icon: <CreditCard className="w-4 h-4 text-emerald-600" />,
    keywords: ['tuition', 'payment', 'receipt', 'due', 'ledger', 'cashbook', 'expense']
  },
  {
    id: 'exams',
    title: 'Examinations, Marks & Report Cards',
    category: 'Academic Assessments',
    description: 'CBSE assessment cycles, date sheets, marks entry roster, auto result calculation, and official report cards',
    icon: <Award className="w-4 h-4 text-purple-600" />,
    keywords: ['exam', 'test', 'marks', 'result', 'report card', 'grade', 'cbse', 'rank', 'timetable', 'assessment', 'marksheet']
  },
  {
    id: 'classroom',
    title: 'Classroom, Timetable & Homework',
    category: 'Daily Operations',
    description: 'Weekly schedule grid, period substitutions, study materials, and assignments',
    icon: <BookOpen className="w-4 h-4 text-indigo-600" />,
    keywords: ['schedule', 'period', 'assignment', 'syllabus', 'routine', 'lecture']
  },
  {
    id: 'transport',
    title: 'Transport & Fleet Management',
    category: 'Campus Facilities',
    description: 'School bus fleet, driver rosters, route stops, vehicle fuel, and maintenance',
    icon: <Bus className="w-4 h-4 text-amber-600" />,
    keywords: ['bus', 'vehicle', 'van', 'route', 'driver', 'fuel', 'pickup', 'drop']
  },
  {
    id: 'library',
    title: 'Library & Book Circulation',
    category: 'Campus Facilities',
    description: 'ISBN book catalog, barcode issues, returns tracking, and overdue fine waivers',
    icon: <Library className="w-4 h-4 text-rose-600" />,
    keywords: ['book', 'isbn', 'borrow', 'return', 'fine', 'author', 'publisher']
  },
  {
    id: 'hostel',
    title: 'Hostel & Residential Boarding',
    category: 'Campus Facilities',
    description: 'Hostel blocks, dorm bed allocations, mess dietary menus, and gate passes',
    icon: <Home className="w-4 h-4 text-purple-600" />,
    keywords: ['dorm', 'room', 'bed', 'warden', 'mess', 'outing', 'gate pass']
  },
  {
    id: 'inventory',
    title: 'Inventory & Fixed Asset Management',
    category: 'Campus Facilities',
    description: 'Stock catalog, warehouses, asset custody, purchase indents, POs, and audits',
    icon: <Package className="w-4 h-4 text-teal-600" />,
    keywords: ['stock', 'store', 'warehouse', 'asset', 'vendor', 'procurement', 'po', 'grn']
  },
  {
    id: 'communication',
    title: 'Communication, Alerts & Parent Engagement',
    category: 'Campus Engagement',
    description: 'Broadcast announcements, circular acknowledgements, notice board, parent-teacher chat, polls & grievances',
    icon: <MessageSquare className="w-4 h-4 text-indigo-600" />,
    keywords: ['announcement', 'circular', 'notice', 'parent', 'chat', 'message', 'sms', 'email', 'broadcast', 'poll', 'survey', 'grievance', 'feedback', 'alert', 'notification']
  },
  {
    id: 'administration',
    title: 'School Administration, Calendar & Visitor Management',
    category: 'Daily Operations',
    description: 'Central school calendar, events, parent-teacher meetings, appointments, venues, and campus visitor security',
    icon: <Calendar className="w-4 h-4 text-emerald-600" />,
    keywords: ['calendar', 'event', 'meeting', 'visitor', 'pass', 'gate', 'appointment', 'venue', 'holiday', 'term', 'agenda', 'minutes', 'mom', 'security', 'occupancy']
  },
  {
    id: 'users',
    title: 'ERP Users & Logins',
    category: 'Security & Access',
    description: 'Manage staff and administrator login credentials, lock/unlock accounts',
    icon: <Users className="w-4 h-4 text-slate-600" />,
    keywords: ['account', 'login', 'username', 'password', 'credential', 'auth']
  },
  {
    id: 'roles',
    title: 'Roles & RBAC Permissions',
    category: 'Security & Access',
    description: 'Granular role matrix, assign permissions per school, and custom access roles',
    icon: <ShieldCheck className="w-4 h-4 text-indigo-600" />,
    keywords: ['rbac', 'permission', 'privilege', 'admin', 'principal', 'operator']
  },
  {
    id: 'audit',
    title: 'Audit Logs & Security Trail',
    category: 'Security & Access',
    description: 'Chronological timeline of changes, logins, fee reversals, and system modifications',
    icon: <History className="w-4 h-4 text-slate-600" />,
    keywords: ['log', 'trail', 'history', 'activity', 'compliance', 'security']
  }
];

interface GlobalSearchProps {
  onNavigateTab?: (tab: NavTab) => void;
  schoolId?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigateTab, schoolId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [matchedModules, setMatchedModules] = useState<ModuleItem[]>([]);
  const [matchedStudents, setMatchedStudents] = useState<any[]>([]);
  const [matchedEmployees, setMatchedEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global hotkey: '/' or 'Ctrl+K' / 'Cmd+K'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter modules locally
  useEffect(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      // Default suggestions: high priority modules
      setMatchedModules(SYSTEM_MODULES.slice(0, 6));
      return;
    }

    const filtered = SYSTEM_MODULES.filter((m) => {
      const matchTitle = m.title.toLowerCase().includes(trimmed);
      const matchCat = m.category.toLowerCase().includes(trimmed);
      const matchDesc = m.description.toLowerCase().includes(trimmed);
      const matchKey = m.keywords.some((k) => k.includes(trimmed));
      return matchTitle || matchCat || matchDesc || matchKey;
    });

    setMatchedModules(filtered.slice(0, 5));
  }, [query]);

  // Live query for students and staff with debounce
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setMatchedStudents([]);
      setMatchedEmployees([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [studentRes, employeeRes] = await Promise.all([
          api.students.list({ search: trimmed, limit: 5, schoolId }).catch(() => ({ students: [] })),
          api.employees.list({ search: trimmed, limit: 5, schoolId }).catch(() => ({ employees: [] }))
        ]);

        setMatchedStudents(studentRes?.students || []);
        setMatchedEmployees(employeeRes?.employees || []);
      } catch (err) {
        console.warn('Search query error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, schoolId]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectModule = (tab: NavTab) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
    setIsOpen(false);
    setQuery('');
  };

  const handleSelectStudent = (_student: any) => {
    if (onNavigateTab) {
      onNavigateTab('students');
    }
    setIsOpen(false);
    setQuery('');
  };

  const handleSelectEmployee = (_employee: any) => {
    if (onNavigateTab) {
      onNavigateTab('staff');
    }
    setIsOpen(false);
    setQuery('');
  };

  const totalResults = matchedModules.length + matchedStudents.length + matchedEmployees.length;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md mx-2 sm:mx-4">
      {/* Search Input Bar in Header */}
      <div
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-xs cursor-text transition-all ${
          isOpen
            ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/10 shadow-xs'
            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300'
        }`}
      >
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search students, staff, modules..."
          className="w-full bg-transparent border-none text-slate-800 placeholder-slate-400 focus:outline-hidden text-xs"
        />

        {query && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setQuery('');
              inputRef.current?.focus();
            }}
            className="p-0.5 text-slate-400 hover:text-slate-600 rounded-sm"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        <div className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] text-slate-400 font-mono shrink-0 shadow-2xs">
          <Command className="w-2.5 h-2.5" />K
        </div>
      </div>

      {/* Floating Search Results Modal */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-2xs" />
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[75vh] flex flex-col">
            {/* Header info bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/70 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-600">
                {query.trim() ? `Search results for "${query}"` : 'Quick Navigation & Shortcuts'}
              </span>
              <div className="flex items-center gap-2">
                {loading && (
                  <span className="flex items-center gap-1 text-indigo-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Searching...
                  </span>
                )}
                <span className="text-[10px] text-slate-400">ESC to close</span>
              </div>
            </div>

            <div className="overflow-y-auto p-2 space-y-3 divide-y divide-slate-100">
              {/* Category 1: System Modules */}
              {matchedModules.length > 0 && (
                <div className="pt-1 first:pt-0">
                  <div className="px-2 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Management Modules</span>
                    <span className="text-[10px] font-normal text-slate-400 lowercase">
                      {matchedModules.length} {matchedModules.length === 1 ? 'module' : 'modules'}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {matchedModules.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleSelectModule(m.id)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50/60 text-left transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/60 group-hover:bg-white group-hover:border-indigo-200 transition-colors">
                            {m.icon}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-semibold text-slate-900 group-hover:text-indigo-900 flex items-center gap-1.5">
                              {m.title}
                              <span className="text-[9px] font-medium text-slate-400 bg-slate-100 group-hover:bg-indigo-100/70 group-hover:text-indigo-700 px-1.5 py-0.2 rounded-full">
                                {m.category}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {m.description}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 2: Students Directory */}
              {matchedStudents.length > 0 && (
                <div className="pt-2">
                  <div className="px-2 pb-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center justify-between">
                    <span>Enrolled Students</span>
                    <span className="text-[10px] font-normal text-slate-400 lowercase">
                      {matchedStudents.length} found
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {matchedStudents.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => handleSelectStudent(st)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-emerald-50/60 text-left transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {st.first_name?.[0] || 'S'}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-semibold text-slate-900 group-hover:text-emerald-900 flex items-center gap-1.5">
                              {st.first_name} {st.last_name}
                              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded">
                                Adm: {st.admission_number || 'N/A'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              Class: {st.class_name || 'Class 1'} {st.section_name ? `(${st.section_name})` : ''} • Roll: {st.roll_number || '—'} • Status: {st.status || 'Active'}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0 ml-2 group-hover:bg-emerald-100">
                          View Student →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 3: Staff & Faculty Directory */}
              {matchedEmployees.length > 0 && (
                <div className="pt-2">
                  <div className="px-2 pb-1.5 text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center justify-between">
                    <span>Teachers & Faculty</span>
                    <span className="text-[10px] font-normal text-slate-400 lowercase">
                      {matchedEmployees.length} found
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {matchedEmployees.map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => handleSelectEmployee(emp)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-amber-50/60 text-left transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {emp.first_name?.[0] || 'T'}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-semibold text-slate-900 group-hover:text-amber-900 flex items-center gap-1.5">
                              {emp.first_name} {emp.last_name}
                              <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1 py-0.2 rounded">
                                ID: {emp.employee_id_number || 'EMP'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {emp.designation_name || 'Faculty Member'} • Dept: {emp.department_name || 'Academics'} • {emp.phone || ''}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0 ml-2 group-hover:bg-amber-100">
                          View Staff →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {query.trim().length >= 2 && totalResults === 0 && !loading && (
                <div className="py-8 text-center">
                  <Search className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No matching records found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Try searching by student name, roll number, employee code, or module keywords like "fees", "bus", "hostel".
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Keyboard Guide */}
            <div className="p-2 border-t border-slate-100 bg-slate-50/90 text-[10px] text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span>Tip: Type <strong>"fee"</strong> for Accounts</span>
                <span>•</span>
                <span>Type <strong>"bus"</strong> for Transport</span>
                <span>•</span>
                <span>Type <strong>"book"</strong> for Library</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[9px]">
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200">ESC</kbd> to close
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
