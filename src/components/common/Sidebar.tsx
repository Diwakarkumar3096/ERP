import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Layers,
  Users,
  ShieldCheck,
  FileText,
  GraduationCap,
  ClipboardList,
  CheckSquare,
  Award,
  ChevronRight,
  Shield,
  Briefcase,
  IndianRupee,
  CalendarDays,
  BookOpen,
  Home,
  Wallet,
  Bus,
  Package,
  MessageSquare,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  BarChart3
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton.js';

export type NavTab =
  | 'dashboard'
  | 'portal'
  | 'academic'
  | 'mis'
  | 'schools'
  | 'sessions'
  | 'classes'
  | 'admissions'
  | 'students'
  | 'parents'
  | 'staff'
  | 'payroll'
  | 'attendance'
  | 'fees'
  | 'exams'
  | 'classroom'
  | 'transport'
  | 'library'
  | 'hostel'
  | 'inventory'
  | 'communication'
  | 'administration'
  | 'lifecycle'
  | 'workflow'
  | 'users'
  | 'roles'
  | 'audit';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavGroup {
  id: string;
  title: string;
  items: {
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    permission?: string;
    badge?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const {
    hasPermission,
    user,
    activeSchool,
    activeSession,
    availableSchools,
    availableSessions,
    isSuperAdmin,
    switchSchool,
    switchSession
  } = useAuth();

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const navGroups: NavGroup[] = [
    {
      id: 'core',
      title: 'Main Hub',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="w-4 h-4" />
        },
        {
          id: 'portal',
          label: 'Parent & Student Portal',
          icon: <GraduationCap className="w-4 h-4" />,
          badge: 'Phase 19'
        },
        {
          id: 'mis',
          label: 'Reports & Analytics',
          icon: <BarChart3 className="w-4 h-4" />,
          badge: 'Phase 17'
        },
        {
          id: 'workflow',
          label: 'Workflow & Approvals',
          icon: <CheckSquare className="w-4 h-4" />,
          badge: 'Phase 23'
        }
      ]
    },
    {
      id: 'academic',
      title: 'Academic & Students',
      items: [
        {
          id: 'academic',
          label: 'Curriculum & LMS',
          icon: <BookOpen className="w-4 h-4" />,
          permission: 'curriculum.view',
          badge: 'Phase 21'
        },
        {
          id: 'admissions',
          label: 'Admissions & Intake',
          icon: <ClipboardList className="w-4 h-4" />,
          permission: 'admissions.view',
          badge: 'Phase 3'
        },
        {
          id: 'students',
          label: 'Student Directory',
          icon: <GraduationCap className="w-4 h-4" />,
          permission: 'students.view',
          badge: 'Phase 2'
        },
        {
          id: 'parents',
          label: 'Parents & Guardians',
          icon: <Shield className="w-4 h-4" />,
          permission: 'parents.view'
        },
        {
          id: 'attendance',
          label: 'Attendance Register',
          icon: <CheckSquare className="w-4 h-4" />,
          permission: 'attendance.student.view',
          badge: 'Phase 5'
        },
        {
          id: 'classes',
          label: 'Classes & Sections',
          icon: <Layers className="w-4 h-4" />,
          permission: 'classes.view'
        },
        {
          id: 'classroom',
          label: 'Timetable & Classroom',
          icon: <CalendarDays className="w-4 h-4" />,
          permission: 'timetable.view',
          badge: 'Phase 8'
        },
        {
          id: 'exams',
          label: 'Exams & Results',
          icon: <Award className="w-4 h-4" />,
          permission: 'exams.reports.view',
          badge: 'Phase 7'
        },
        {
          id: 'lifecycle',
          label: 'Lifecycle & Documents',
          icon: <FileText className="w-4 h-4" />,
          permission: 'lifecycle.view',
          badge: 'Phase 18'
        }
      ]
    },
    {
      id: 'faculty',
      title: 'Faculty & HR',
      items: [
        {
          id: 'staff',
          label: 'Teachers & Staff',
          icon: <Briefcase className="w-4 h-4" />,
          permission: 'employees.view',
          badge: 'Phase 4'
        },
        {
          id: 'payroll',
          label: 'HR & Payroll',
          icon: <Wallet className="w-4 h-4" />,
          permission: 'payroll.view',
          badge: 'Phase 12'
        }
      ]
    },
    {
      id: 'operations',
      title: 'Finance & Logistics',
      items: [
        {
          id: 'fees',
          label: 'Fees & Accounts',
          icon: <IndianRupee className="w-4 h-4" />,
          permission: 'fees.structure.view',
          badge: 'Phase 6'
        },
        {
          id: 'transport',
          label: 'Transport & Fleet',
          icon: <Bus className="w-4 h-4" />,
          permission: 'transport.view',
          badge: 'Phase 9'
        },
        {
          id: 'library',
          label: 'Library Management',
          icon: <BookOpen className="w-4 h-4" />,
          permission: 'library.view',
          badge: 'Phase 10'
        },
        {
          id: 'hostel',
          label: 'Hostel & Residence',
          icon: <Home className="w-4 h-4" />,
          permission: 'hostel.view',
          badge: 'Phase 11'
        },
        {
          id: 'inventory',
          label: 'Inventory & Assets',
          icon: <Package className="w-4 h-4" />,
          permission: 'inventory.view',
          badge: 'Phase 13'
        }
      ]
    },
    {
      id: 'admin',
      title: 'Campus & Administration',
      items: [
        {
          id: 'communication',
          label: 'Communication & Alerts',
          icon: <MessageSquare className="w-4 h-4" />,
          permission: 'communication.view',
          badge: 'Phase 14'
        },
        {
          id: 'administration',
          label: 'Administration & Calendar',
          icon: <CalendarDays className="w-4 h-4" />,
          permission: 'administration.view',
          badge: 'Phase 15'
        },
        {
          id: 'schools',
          label: 'Schools & Campuses',
          icon: <Building2 className="w-4 h-4" />,
          permission: 'schools.view'
        },
        {
          id: 'sessions',
          label: 'Academic Sessions',
          icon: <Calendar className="w-4 h-4" />,
          permission: 'sessions.view'
        },
        {
          id: 'users',
          label: 'ERP Users & Logins',
          icon: <Users className="w-4 h-4" />,
          permission: 'users.view'
        },
        {
          id: 'roles',
          label: 'Roles & Permissions',
          icon: <ShieldCheck className="w-4 h-4" />,
          permission: 'roles.view'
        },
        {
          id: 'audit',
          label: 'Audit Trail',
          icon: <FileText className="w-4 h-4" />,
          permission: 'audit.view'
        }
      ]
    }
  ];

  const handleItemClick = (id: NavTab) => {
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-y-auto overscroll-contain">
      {/* Mobile Top Header in Drawer */}
      <div className="lg:hidden p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            SE
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">School ERP</div>
            <div className="text-[10px] text-slate-400 font-medium truncate max-w-[170px]">
              {activeSchool ? activeSchool.name : 'All Campuses Overview'}
            </div>
          </div>
        </div>
        <button
          onClick={onCloseMobile}
          className="p-2 -mr-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile School & Session Context Switcher inside Drawer */}
      <div className="lg:hidden p-3 border-b border-slate-800/80 bg-slate-900/50 space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
          Active Institution
        </div>
        <div className="space-y-1.5">
          {(isSuperAdmin || user?.permissions.includes('schools.switch')) && (
            <select
              value={activeSchool?.id || ''}
              onChange={(e) => switchSchool(e.target.value || null)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="">All Campuses (Central Overview)</option>
              {availableSchools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          )}

          {activeSchool && availableSessions.length > 0 && (
            <select
              value={activeSession?.id || ''}
              onChange={(e) => switchSession(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
            >
              {availableSessions.map((ses) => (
                <option key={ses.id} value={ses.id}>
                  Session: {ses.name} {ses.is_current ? ' (Current)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Nav Groups */}
      <div className="p-3 space-y-4 flex-1">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.permission || hasPermission(item.permission)
          );

          if (visibleItems.length === 0) return null;
          const isCollapsed = collapsedGroups[group.id] || false;

          return (
            <div key={group.id} className="space-y-1">
              {group.id !== 'core' && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-semibold tracking-wider text-slate-400 hover:text-slate-200 uppercase transition"
                >
                  <span>{group.title}</span>
                  {isCollapsed ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              )}

              {!isCollapsed && (
                <nav className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[40px] ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={isActive ? 'text-white' : 'text-slate-400'}
                          >
                            {item.icon}
                          </span>
                          <span className="truncate">{item.label}</span>
                        </div>
                        {isActive && (
                          <ChevronRight className="w-3.5 h-3.5 text-white shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </nav>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom PWA Action & Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-2 pb-24 lg:pb-3">
        <PWAInstallButton variant="menu" />

        <div className="px-2 pt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>School ERP v2.6 · PWA</span>
          <span>Online</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Slide in) */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <div className="relative w-72 sm:w-80 max-w-[85vw] bg-slate-900 text-slate-300 h-full flex flex-col shadow-2xl border-r border-slate-800 animate-in slide-in-from-left duration-250">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
