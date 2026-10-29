import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ToastProvider } from './components/common/Toast.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.js';
import { LoginPage } from './components/auth/LoginPage.js';
import { Header } from './components/common/Header.js';
import { Sidebar, type NavTab } from './components/common/Sidebar.js';
import { MobileBottomNav } from './components/common/MobileBottomNav.js';
import { OfflineBanner } from './components/common/OfflineBanner.js';
import { DashboardView } from './components/dashboard/DashboardView.js';
import { SchoolsView } from './components/schools/SchoolsView.js';
import { SessionsView } from './components/sessions/SessionsView.js';
import { ClassesView } from './components/classes/ClassesView.js';
import { UsersView } from './components/users/UsersView.js';
import { RolesView } from './components/roles/RolesView.js';
import { AuditLogView } from './components/audit/AuditLogView.js';
import { StudentsView } from './components/students/StudentsView.js';
import { ParentsView } from './components/parents/ParentsView.js';
import { AdmissionsView } from './components/admissions/AdmissionsView.js';
import { StaffManagementView } from './components/employees/StaffManagementView.js';
import { AttendanceManagementView } from './components/attendance/AttendanceManagementView.js';
import { FeesManagementView } from './components/fees/FeesManagementView.js';
import { ExamManagementView } from './components/exams/ExamManagementView.js';
import { ClassroomManagementView } from './components/classroom/ClassroomManagementView.js';
import { TransportManagementView } from './components/transport/TransportManagementView.js';
import { LibraryManagementView } from './components/library/LibraryManagementView.js';
import { PayrollManagementView } from './components/payroll/PayrollManagementView.js';
import { InventoryManagementView } from './components/inventory/InventoryManagementView.js';
import { CommunicationManagementView } from './components/communication/CommunicationManagementView.js';
import { AdministrationManagementView } from './components/administration/AdministrationManagementView.js';
import { MISView } from './components/mis/MISView.js';
import { StudentLifecycleView } from './components/lifecycle/StudentLifecycleView.js';
import { PublicAdmissionPortal } from './components/public/PublicAdmissionPortal.js';
import { PortalMainView } from './components/portal/PortalMainView.js';
import { AcademicManagementView } from './components/academic/AcademicManagementView.js';
import { WorkflowManagementView } from './components/workflow/WorkflowManagementView.js';

function MainAppShell({ onOpenPublicPortal }: { onOpenPublicPortal: () => void }) {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  React.useEffect(() => {
    if (user && (user.roleName === 'parent' || user.roleName === 'student')) {
      setCurrentTab('portal');
    }
  }, [user?.roleName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm mb-3">
          SE
        </div>
        <p className="text-xs font-semibold text-slate-700">Loading School ERP System...</p>
        <span className="text-[11px] text-slate-400 font-mono mt-1">Connecting to database</span>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onOpenPublicPortal={onOpenPublicPortal} />;
  }

  const renderCurrentView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView onNavigateTab={setCurrentTab} />;
      case 'academic':
        return <AcademicManagementView />;
      case 'workflow':
        return <WorkflowManagementView />;
      case 'portal':
        return <PortalMainView />;
      case 'mis':
        return <MISView onNavigateTab={setCurrentTab} />;
      case 'admissions':
        return <AdmissionsView onOpenPublicPortal={onOpenPublicPortal} />;
      case 'schools':
        return <SchoolsView />;
      case 'sessions':
        return <SessionsView />;
      case 'classes':
        return <ClassesView />;
      case 'students':
        return <StudentsView />;
      case 'parents':
        return <ParentsView />;
      case 'staff':
        return <StaffManagementView />;
      case 'payroll':
        return <PayrollManagementView />;
      case 'attendance':
        return <AttendanceManagementView />;
      case 'fees':
        return <FeesManagementView />;
      case 'exams':
        return <ExamManagementView />;
      case 'classroom':
        return <ClassroomManagementView />;
      case 'transport':
        return <TransportManagementView />;
      case 'library':
        return <LibraryManagementView />;
      case 'inventory':
        return <InventoryManagementView />;
      case 'communication':
        return <CommunicationManagementView />;
      case 'administration':
        return <AdministrationManagementView />;
      case 'lifecycle':
        return <StudentLifecycleView />;
      case 'users':
        return <UsersView />;
      case 'roles':
        return <RolesView />;
      case 'audit':
        return <AuditLogView />;
      default:
        return <DashboardView onNavigateTab={setCurrentTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      <OfflineBanner />
      <Header
        onNavigateTab={setCurrentTab}
        onToggleSidebar={() => setIsMobileDrawerOpen((prev) => !prev)}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          isMobileOpen={isMobileDrawerOpen}
          onCloseMobile={() => setIsMobileDrawerOpen(false)}
        />
        <main className="flex-1 p-3 sm:p-5 md:p-8 overflow-y-auto max-h-[calc(100vh-4rem)] pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            <ErrorBoundary
              fallbackTitle="Module Display Notice"
              fallbackMessage="An unexpected issue occurred while rendering this module. You can reset to the main dashboard or switch to another module from the sidebar."
              onReset={() => setCurrentTab('dashboard')}
            >
              {renderCurrentView()}
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenMenu={() => setIsMobileDrawerOpen(true)}
      />
    </div>
  );
}

export default function App() {
  const [showPublicPortal, setShowPublicPortal] = useState(false);

  if (showPublicPortal) {
    return <PublicAdmissionPortal onBackToLogin={() => setShowPublicPortal(false)} />;
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <ErrorBoundary>
          <MainAppShell onOpenPublicPortal={() => setShowPublicPortal(true)} />
        </ErrorBoundary>
      </AuthProvider>
    </ToastProvider>
  );
}
