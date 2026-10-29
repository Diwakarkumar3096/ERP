import React, { useState, useEffect } from 'react';
import { ChildStudent, PortalTab, PortalTabButton } from './PortalCommon.js';
import { ChildSwitcher } from './ChildSwitcher.js';
import { ParentDashboardView } from './ParentDashboardView.js';
import { StudentDashboardView } from './StudentDashboardView.js';
import { PortalAttendanceView } from './PortalAttendanceView.js';
import { PortalFeesView } from './PortalFeesView.js';
import { PortalExamsView } from './PortalExamsView.js';
import { PortalHomeworkView } from './PortalHomeworkView.js';
import { PortalServicesView } from './PortalServicesView.js';
import { PortalAppointmentsView } from './PortalAppointmentsView.js';
import { PortalEventsView } from './PortalEventsView.js';
import { PortalGrievancesView } from './PortalGrievancesView.js';
import { AdminPortalManagementView } from './AdminPortalManagementView.js';
import { PortalAcademicView } from './PortalAcademicView.js';
import {
  Compass,
  LayoutDashboard,
  CalendarCheck,
  CreditCard,
  Award,
  BookOpen,
  FileCheck2,
  Calendar,
  MessageSquareWarning,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Users,
  GraduationCap,
  Sliders,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const PortalMainView: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [isStaffOrAdmin, setIsStaffOrAdmin] = useState(false);
  const [activeRoleView, setActiveRoleView] = useState<'parent' | 'student' | 'admin'>('parent');

  const [children, setChildren] = useState<ChildStudent[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildStudent | null>(null);
  const [activeTab, setActiveTab] = useState<PortalTab>('dashboard');

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingChildData, setLoadingChildData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch portal context on mount
  useEffect(() => {
    fetchPortalContext();
  }, []);

  const fetchPortalContext = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/portal/me');
      if (!res.ok) throw new Error('Failed to load portal profile');
      const data = await res.json();

      setCurrentUser(data.user);
      setUserRole(data.role);
      setIsStaffOrAdmin(data.isStaffOrAdmin);

      if (data.role === 'student') {
        setActiveRoleView('student');
      } else if (data.role === 'parent') {
        setActiveRoleView('parent');
      } else {
        // Staff or admin
        setActiveRoleView('parent');
      }

      if (data.children && data.children.length > 0) {
        setChildren(data.children);
        setSelectedChild(data.children[0]);
      } else if (data.studentProfile) {
        // Construct single ChildStudent object from student profile
        const stu: ChildStudent = {
          id: data.studentProfile.id,
          admission_number: data.studentProfile.admission_number,
          first_name: data.studentProfile.first_name,
          last_name: data.studentProfile.last_name,
          gender: data.studentProfile.gender,
          date_of_birth: data.studentProfile.date_of_birth,
          profile_photo: data.studentProfile.profile_photo,
          roll_number: data.studentProfile.roll_number,
          student_status: data.studentProfile.student_status,
          class_id: data.studentProfile.class_id,
          class_name: data.studentProfile.class_name,
          section_id: data.studentProfile.section_id,
          section_name: data.studentProfile.section_name,
          school_id: data.studentProfile.school_id,
          school_name: data.studentProfile.school_name,
          school_code: data.studentProfile.school_code
        };
        setChildren([stu]);
        setSelectedChild(stu);
      }
    } catch (err: any) {
      console.error('Portal init error:', err);
      setError(err.message || 'Unable to load digital portal');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch aggregated child dashboard whenever selectedChild changes
  useEffect(() => {
    if (selectedChild) {
      fetchChildDashboard(selectedChild.id);
    }
  }, [selectedChild?.id]);

  const fetchChildDashboard = async (studentId: string) => {
    setLoadingChildData(true);
    try {
      const res = await fetch(`/api/portal/child-dashboard/${studentId}`);
      if (!res.ok) throw new Error('Failed to load student dashboard');
      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load child dashboard data:', err);
    } finally {
      setLoadingChildData(false);
    }
  };

  const handleRefresh = () => {
    if (selectedChild) {
      fetchChildDashboard(selectedChild.id);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] p-8 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-semibold text-gray-700">Loading Digital School Portal...</p>
        <p className="text-xs text-gray-400">Verifying secure student permissions and multi-child links</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-rose-50 rounded-2xl border border-rose-200 space-y-3 max-w-lg mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
        <h3 className="text-base font-bold text-rose-900">Portal Access Error</h3>
        <p className="text-xs text-rose-700">{error}</p>
        <button
          onClick={fetchPortalContext}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 shadow-xs"
        >
          Try Reconnecting
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header Banner & View Toggle (For Staff/Admin simulation or parent info) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Parent & Student Digital Portal</h1>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-[10px] font-bold">
                Phase 19 Active
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Online School Services · Real-Time Academic Tracking · Secure Parent-Ward Architecture
            </p>
          </div>
        </div>

        {/* View Mode Switcher (Visible to Staff/Admin or Parent/Student toggles) */}
        {isStaffOrAdmin && (
          <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl border border-gray-200/60 text-xs">
            <button
              onClick={() => {
                setActiveRoleView('parent');
                if (activeTab === 'admin_management') setActiveTab('dashboard');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeRoleView === 'parent' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Parent View</span>
            </button>

            <button
              onClick={() => {
                setActiveRoleView('student');
                if (activeTab === 'admin_management') setActiveTab('dashboard');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeRoleView === 'student' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student View</span>
            </button>

            <button
              onClick={() => {
                setActiveRoleView('admin');
                setActiveTab('admin_management');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeRoleView === 'admin' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Admin & SLAs</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Child Switcher (Rendered in Parent View when multiple wards exist) */}
      {activeRoleView === 'parent' && children.length > 0 && selectedChild && (
        <ChildSwitcher
          childrenList={children}
          selectedChild={selectedChild}
          onSelectChild={(child) => setSelectedChild(child)}
          isStaffOrAdmin={isStaffOrAdmin}
        />
      )}

      {/* 3. Sub-Navigation Tabs */}
      {activeRoleView !== 'admin' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <PortalTabButton
            id="dashboard"
            label="Dashboard Overview"
            icon={<LayoutDashboard className="w-4 h-4" />}
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
          />
          <PortalTabButton
            id="academic"
            label="Curriculum & Syllabus"
            icon={<Compass className="w-4 h-4" />}
            active={activeTab === 'academic'}
            onClick={() => setActiveTab('academic')}
            badge="Phase 21"
          />
          <PortalTabButton
            id="attendance"
            label="Attendance & Leaves"
            icon={<CalendarCheck className="w-4 h-4" />}
            active={activeTab === 'attendance'}
            onClick={() => setActiveTab('attendance')}
          />
          <PortalTabButton
            id="fees"
            label="Fees & Online Pay"
            icon={<CreditCard className="w-4 h-4" />}
            active={activeTab === 'fees'}
            onClick={() => setActiveTab('fees')}
          />
          <PortalTabButton
            id="exams"
            label="Exams & Reports"
            icon={<Award className="w-4 h-4" />}
            active={activeTab === 'exams'}
            onClick={() => setActiveTab('exams')}
          />
          <PortalTabButton
            id="homework"
            label="Homework & Resources"
            icon={<BookOpen className="w-4 h-4" />}
            active={activeTab === 'homework'}
            onClick={() => setActiveTab('homework')}
          />
          <PortalTabButton
            id="services"
            label="Online School Services"
            icon={<FileCheck2 className="w-4 h-4" />}
            active={activeTab === 'services'}
            onClick={() => setActiveTab('services')}
            badge="8 Catalog"
          />
          <PortalTabButton
            id="appointments"
            label="Appointments"
            icon={<Calendar className="w-4 h-4" />}
            active={activeTab === 'appointments'}
            onClick={() => setActiveTab('appointments')}
          />
          <PortalTabButton
            id="events"
            label="School Calendar Events"
            icon={<Sparkles className="w-4 h-4" />}
            active={activeTab === 'events'}
            onClick={() => setActiveTab('events')}
          />
          <PortalTabButton
            id="grievances"
            label="Help & Redressal"
            icon={<MessageSquareWarning className="w-4 h-4" />}
            active={activeTab === 'grievances'}
            onClick={() => setActiveTab('grievances')}
          />
          {isStaffOrAdmin && (
            <PortalTabButton
              id="admin_management"
              label="Admin Management"
              icon={<ShieldCheck className="w-4 h-4 text-purple-600" />}
              active={activeTab === 'admin_management'}
              onClick={() => {
                setActiveRoleView('admin');
                setActiveTab('admin_management');
              }}
            />
          )}
        </div>
      )}

      {/* 4. Tab Content Rendering */}
      {activeRoleView === 'admin' || activeTab === 'admin_management' ? (
        <AdminPortalManagementView />
      ) : !selectedChild ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-100">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-700">No student profile linked</p>
          <p className="text-xs text-gray-400 mt-1">Please connect a student profile to view portal records.</p>
        </div>
      ) : activeRoleView === 'student' ? (
        // STUDENT / LEARNER VIEW
        activeTab === 'dashboard' ? (
          <StudentDashboardView
            child={selectedChild}
            dashboardData={dashboardData}
            onNavigateTab={setActiveTab}
            onRefreshData={handleRefresh}
          />
        ) : activeTab === 'academic' ? (
          <PortalAcademicView child={selectedChild} />
        ) : activeTab === 'attendance' ? (
          <PortalAttendanceView child={selectedChild} />
        ) : activeTab === 'fees' ? (
          <PortalFeesView child={selectedChild} />
        ) : activeTab === 'exams' ? (
          <PortalExamsView child={selectedChild} />
        ) : activeTab === 'homework' ? (
          <PortalHomeworkView child={selectedChild} />
        ) : activeTab === 'services' ? (
          <PortalServicesView child={selectedChild} />
        ) : activeTab === 'appointments' ? (
          <PortalAppointmentsView child={selectedChild} />
        ) : activeTab === 'events' ? (
          <PortalEventsView child={selectedChild} />
        ) : activeTab === 'grievances' ? (
          <PortalGrievancesView child={selectedChild} />
        ) : null
      ) : (
        // PARENT VIEW (MULTI-CHILD CAPABLE)
        activeTab === 'dashboard' ? (
          <ParentDashboardView
            child={selectedChild}
            dashboardData={dashboardData}
            onNavigateTab={setActiveTab}
            onRefreshData={handleRefresh}
          />
        ) : activeTab === 'academic' ? (
          <PortalAcademicView child={selectedChild} />
        ) : activeTab === 'attendance' ? (
          <PortalAttendanceView child={selectedChild} />
        ) : activeTab === 'fees' ? (
          <PortalFeesView child={selectedChild} />
        ) : activeTab === 'exams' ? (
          <PortalExamsView child={selectedChild} />
        ) : activeTab === 'homework' ? (
          <PortalHomeworkView child={selectedChild} />
        ) : activeTab === 'services' ? (
          <PortalServicesView child={selectedChild} />
        ) : activeTab === 'appointments' ? (
          <PortalAppointmentsView child={selectedChild} />
        ) : activeTab === 'events' ? (
          <PortalEventsView child={selectedChild} />
        ) : activeTab === 'grievances' ? (
          <PortalGrievancesView child={selectedChild} />
        ) : null
      )}
    </div>
  );
};
