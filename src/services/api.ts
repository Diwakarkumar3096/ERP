import type {
  CurrentUser,
  School,
  AcademicSession,
  ClassItem,
  SectionItem,
  User,
  Role,
  Permission,
  AuditLog,
  DashboardStats,
  Student,
  Parent,
  StudentDocument,
  StudentPromotionPayload,
  AdmissionApplication,
  AdmissionStats,
  AdmissionSettings,
  AdmissionStatus,
  Employee,
  Department,
  Designation,
  Subject,
  EmployeeDocument,
  EmployeeQualification,
  EmployeeExperience,
  StaffStats,
  TeacherProfile,
  TeacherSubjectAssignment,
  ClassTeacherAssignment,
  SchoolCalendarEvent,
  AttendanceSettings,
  StudentAttendanceRecord,
  StaffAttendanceRecord,
  AttendanceCorrectionRequest,
  AttendanceDashboardStats,
  StudentMonthlyRegister,
  StaffMonthlyRegister,
  FeeCategory,
  FeeStructure,
  StudentFeeAssignment,
  FeeConcession,
  FeePayment,
  OfficialReceiptPayload,
  FeeRefund,
  ExpenseCategory,
  SchoolExpense,
  FeeReminder,
  FeeDashboardStats,
  StudentPayableSummary,
  StudentLedger,
  ClassroomRoom,
  TimetablePeriod,
  Timetable,
  TimetableEntry,
  TimetableConflict,
  TeacherSubstitution,
  Homework,
  HomeworkSubmission,
  LearningMaterial,
  ClassroomNotice,
  ClassroomDashboardSummary,
  TeacherWorkloadItem,
  LibraryFacility,
  LibrarySettings,
  BookCategory,
  BookAuthor,
  BookPublisher,
  BookLocation,
  BookTitle,
  BookCopy,
  LibraryMember,
  BookIssue,
  BookRenewal,
  BookReservation,
  LibraryFine,
  DamageRecord,
  InventoryAudit,
  LibraryDashboardStats,
  PayHead,
  SalaryStructure,
  EmployeeSalaryAssignment,
  LeaveType,
  LeaveBalance,
  LeaveApplication,
  StaffLoan,
  PayrollCycle,
  PayrollItem,
  EmployeeAppraisal,
  EmployeeLifecycleEvent,
  PayrollDashboardStats,
  StatutoryRegisterRow,
  Vehicle,
  VehicleDocument,
  TransportDriver,
  TransportStaffAssignment,
  TransportRoute,
  TransportRouteStop,
  StudentTransportEnrollment,
  TransportTrip,
  TransportAttendanceRecord,
  VehicleMaintenance,
  VehicleFuelRecord,
  TransportIncident,
  TransportNotice,
  TransportSettings,
  TransportDashboardData
} from '../types/erp.js';
import type {
  Hostel,
  HostelBlock,
  HostelFloor,
  HostelRoom,
  HostelBed,
  HostelStaffAssignment,
  HostelDutyRoster,
  HostelAdmission,
  HostelAllocation,
  HostelAllocationHistory,
  HostelAttendanceSession,
  HostelAttendanceRecord,
  HostelLeave,
  HostelOuting,
  HostelMovement,
  HostelVisitor,
  HostelIncident,
  HostelMess,
  HostelMenu,
  HostelMaintenance,
  HostelNotice,
  HostelRules,
  HostelDashboardStats,
  OccupancyMapItem
} from '../types/hostel.js';
import type {
  InventoryDashboardData,
  InventoryCategory,
  InventoryStore,
  InventoryItem,
  StockTransaction,
  StockTransfer,
  StockCount,
  Asset,
  AssetAssignment,
  AssetMaintenance,
  Vendor,
  PurchaseRequest,
  PurchaseOrder,
  GoodsReceipt
} from '../types/inventory.js';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('session_token');
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = (typeof window === 'undefined' && endpoint.startsWith('/'))
    ? `${process.env.TEST_BASE_URL || 'http://localhost:3000'}${endpoint}`
    : endpoint;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin'
  });

  if (!response.ok) {
    if (response.status === 401) {
      if (endpoint !== '/api/auth/login' && endpoint !== '/api/auth/me') {
        localStorage.removeItem('session_token');
        localStorage.removeItem('session_user');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    let errMsg = `Request failed with status ${response.status}`;
    try {
      const errData = await response.json();
      if (errData.error) errMsg = errData.error;
    } catch {
      // ignore
    }
    throw new ApiError(response.status, errMsg);
  }

  return response.json();
}

import { FALLBACK_USERS, FALLBACK_SCHOOLS, FALLBACK_SESSIONS } from './mockData.js';

export const api = {
  // Auth
  auth: {
    login: async (usernameOrEmail: string, password: string) => {
      const cleanUser = usernameOrEmail.trim().toLowerCase();

      try {
        const res = await request<{ token: string; user: CurrentUser }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ usernameOrEmail, password })
        });
        if (res.token) {
          localStorage.setItem('session_token', res.token);
          localStorage.setItem('session_user', JSON.stringify(res.user));
        }
        return res;
      } catch (err: any) {
        // Fallback for demo accounts if server was restarting
        const fallbackUser = FALLBACK_USERS[cleanUser];
        if (fallbackUser) {
          const fallbackToken = fallbackUser.id;
          localStorage.setItem('session_token', fallbackToken);
          localStorage.setItem('session_user', JSON.stringify(fallbackUser));
          return {
            token: fallbackToken,
            user: fallbackUser
          };
        }
        throw err;
      }
    },
    logout: async () => {
      try {
        await request('/api/auth/logout', { method: 'POST' });
      } catch {
        // ignore network error
      } finally {
        localStorage.removeItem('session_token');
        localStorage.removeItem('session_user');
      }
    },
    me: async () => {
      const token = localStorage.getItem('session_token');
      if (!token) {
        throw new ApiError(401, 'No active session');
      }
      const res = await request<{ user: CurrentUser }>('/api/auth/me');
      localStorage.setItem('session_user', JSON.stringify(res.user));
      return res;
    },
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ success: boolean; message: string }>('/api/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      }),
    getProfile: () =>
      request<{ user: CurrentUser & { createdAt?: string; lastLoginAt?: string } }>('/api/auth/profile'),
    updateProfile: (profileData: {
      firstName?: string;
      lastName?: string;
      displayName?: string;
      phone?: string;
      email?: string;
      avatarUrl?: string | null;
    }) =>
      request<{ success: boolean; message: string; user: CurrentUser }>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      }),
    uploadProfilePhoto: (photoData: string) =>
      request<{ success: boolean; message: string; avatarUrl: string; user: CurrentUser }>('/api/auth/profile/photo', {
        method: 'POST',
        body: JSON.stringify({ photo: photoData })
      }),
    removeProfilePhoto: () =>
      request<{ success: boolean; message: string; avatarUrl: null; user: CurrentUser }>('/api/auth/profile/photo', {
        method: 'DELETE'
      })
  },

  // Schools
  schools: {
    list: async () => {
      try {
        return await request<{ schools: School[] }>('/api/schools');
      } catch (err) {
        console.warn('[SCHOOLS FALLBACK] Using local school directory');
        return { schools: FALLBACK_SCHOOLS };
      }
    },
    get: (id: string) => request<{ school: School }>(`/api/schools/${id}`),
    create: (data: Partial<School>) =>
      request<{ success: boolean; schoolId: string }>('/api/schools', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: Partial<School>) =>
      request<{ success: boolean }> (`/api/schools/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/schools/${id}`, { method: 'DELETE' })
  },

  // Sessions
  sessions: {
    list: async (schoolId?: string) => {
      try {
        const url = schoolId ? `/api/sessions?schoolId=${encodeURIComponent(schoolId)}` : '/api/sessions';
        return await request<{ sessions: AcademicSession[] }>(url);
      } catch (err) {
        console.warn('[SESSIONS FALLBACK] Using local sessions');
        return { sessions: FALLBACK_SESSIONS };
      }
    },
    create: (data: Partial<AcademicSession>) =>
      request<{ success: boolean; sessionId: string }>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    activate: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/sessions/${id}/activate`, {
        method: 'POST'
      }),
    update: (id: string, data: Partial<AcademicSession>) =>
      request<{ success: boolean }>(`/api/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
  },

  // Classes
  classes: {
    list: (schoolId?: string, sessionId?: string) => {
      const params = new URLSearchParams();
      if (schoolId) params.set('schoolId', schoolId);
      if (sessionId) params.set('sessionId', sessionId);
      const query = params.toString() ? `?${params.toString()}` : '';
      return request<{ classes: ClassItem[] }>(`/api/classes${query}`);
    },
    create: (data: any) =>
      request<{ success: boolean; classId: string }>('/api/classes', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: Partial<ClassItem>) =>
      request<{ success: boolean }>(`/api/classes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/classes/${id}`, { method: 'DELETE' })
  },

  // Sections
  sections: {
    list: (classId?: string, schoolId?: string) => {
      const params = new URLSearchParams();
      if (classId) params.set('classId', classId);
      if (schoolId) params.set('schoolId', schoolId);
      const query = params.toString() ? `?${params.toString()}` : '';
      return request<{ sections: SectionItem[] }>(`/api/sections${query}`);
    },
    create: (data: any) =>
      request<{ success: boolean; sectionId: string }>('/api/sections', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: Partial<SectionItem>) =>
      request<{ success: boolean }>(`/api/sections/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/sections/${id}`, { method: 'DELETE' })
  },

  // Users
  users: {
    list: (params?: { schoolId?: string; roleId?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.set('schoolId', params.schoolId);
      if (params?.roleId) q.set('roleId', params.roleId);
      if (params?.search) q.set('search', params.search);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<{ users: User[] }>(`/api/users${query}`);
    },
    create: (data: any) =>
      request<{ success: boolean; userId: string }>('/api/users', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: any) =>
      request<{ success: boolean }>(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    resetPassword: (id: string, newPassword: string) =>
      request<{ success: boolean }> (`/api/users/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword })
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/users/${id}`, { method: 'DELETE' })
  },

  // Roles
  roles: {
    list: () => request<{ roles: Role[] }>('/api/roles'),
    permissions: () => request<{ permissions: Permission[] }>('/api/roles/permissions'),
    get: (id: string) => request<{ role: Role; permissionIds: string[] }>(`/api/roles/${id}`),
    create: (data: any) =>
      request<{ success: boolean; roleId: string }>('/api/roles', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updatePermissions: (id: string, permissionIds: string[], displayName?: string, description?: string) =>
      request<{ success: boolean }>(`/api/roles/${id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissionIds, displayName, description })
      })
  },

  // Audit Logs
  audit: {
    list: (params?: { schoolId?: string; module?: string; action?: string; search?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.set('schoolId', params.schoolId);
      if (params?.module) q.set('module', params.module);
      if (params?.action) q.set('action', params.action);
      if (params?.search) q.set('search', params.search);
      if (params?.limit) q.set('limit', params.limit.toString());
      if (params?.offset) q.set('offset', params.offset.toString());
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<{ logs: AuditLog[]; pagination: { total: number; limit: number; offset: number } }>(`/api/audit-logs${query}`);
    },
    exportUrl: (schoolId?: string) => {
      return schoolId ? `/api/audit-logs/export?schoolId=${encodeURIComponent(schoolId)}` : '/api/audit-logs/export';
    }
  },

  // Dashboard Stats
  dashboard: {
    stats: (schoolId?: string) => {
      const url = schoolId ? `/api/dashboard/stats?schoolId=${encodeURIComponent(schoolId)}` : '/api/dashboard/stats';
      return request<DashboardStats>(url);
    }
  },

  // Students
  students: {
    list: (params?: {
      schoolId?: string;
      sessionId?: string;
      classId?: string;
      sectionId?: string;
      status?: string;
      gender?: string;
      category?: string;
      search?: string;
      page?: number;
      limit?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.set('schoolId', params.schoolId);
      if (params?.sessionId) q.set('sessionId', params.sessionId);
      if (params?.classId) q.set('classId', params.classId);
      if (params?.sectionId) q.set('sectionId', params.sectionId);
      if (params?.status) q.set('status', params.status);
      if (params?.gender) q.set('gender', params.gender);
      if (params?.category) q.set('category', params.category);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', params.page.toString());
      if (params?.limit) q.set('limit', params.limit.toString());
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<{
        students: Student[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/api/students${query}`);
    },
    get: (id: string) => request<{ student: Student }>(`/api/students/${id}`),
    nextAdmissionNumber: (schoolId: string, sessionId?: string) => {
      const q = new URLSearchParams({ schoolId });
      if (sessionId) q.set('sessionId', sessionId);
      return request<{ nextAdmissionNumber: string; prefix: string; year: number; seq: number }>(`/api/students/next-admission-number?${q.toString()}`);
    },
    create: (data: Partial<Student> & { primary_parent?: any; secondary_parent?: any }) =>
      request<{ success: boolean; studentId: string; admissionNumber: string; message: string }>('/api/students', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: Partial<Student>) =>
      request<{ success: boolean; message: string }>(`/api/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/students/${id}`, {
        method: 'DELETE'
      }),
    uploadDocument: (studentId: string, data: { document_type: string; file_name: string; file_data: string; file_size?: number; mime_type?: string; remarks?: string }) =>
      request<{ success: boolean; documentId: string; message: string }>(`/api/students/${studentId}/documents`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    verifyDocument: (studentId: string, docId: string, verification_status: 'Verified' | 'Rejected' | 'Pending', remarks?: string) =>
      request<{ success: boolean; message: string }>(`/api/students/${studentId}/documents/${docId}/verify`, {
        method: 'PUT',
        body: JSON.stringify({ verification_status, remarks })
      }),
    deleteDocument: (studentId: string, docId: string) =>
      request<{ success: boolean; message: string }>(`/api/students/${studentId}/documents/${docId}`, {
        method: 'DELETE'
      }),
    promote: (promotions: StudentPromotionPayload[]) =>
      request<{ success: boolean; processedCount: number }>('/api/students/promote', {
        method: 'POST',
        body: JSON.stringify({ promotions })
      })
  },

  // Parents
  parents: {
    list: (params?: { schoolId?: string; search?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.set('schoolId', params.schoolId);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', params.page.toString());
      if (params?.limit) q.set('limit', params.limit.toString());
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<{
        parents: Parent[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/api/parents${query}`);
    },
    get: (id: string) => request<{ parent: Parent }>(`/api/parents/${id}`),
    create: (data: Partial<Parent> & { student_id?: string; is_primary_guardian?: boolean }) =>
      request<{ success: boolean; parentId: string; message: string }>('/api/parents', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: Partial<Parent>) =>
      request<{ success: boolean; message: string }>(`/api/parents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/parents/${id}`, {
        method: 'DELETE'
      }),
    linkStudent: (parentId: string, data: { student_id: string; relationship?: string; is_primary_guardian?: boolean; can_receive_notifications?: boolean; can_access_portal?: boolean }) =>
      request<{ success: boolean; message: string }>(`/api/parents/${parentId}/link-student`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    unlinkStudent: (parentId: string, studentId: string) =>
      request<{ success: boolean; message: string }>(`/api/parents/${parentId}/unlink-student/${studentId}`, {
        method: 'DELETE'
      })
  },

  // Admissions (Phase 3)
  admissions: {
    // Public Endpoints
    publicSchools: () => request<{ schools: School[] }>('/api/admissions/public/schools'),
    publicSessions: (schoolId: string) => request<{ sessions: AcademicSession[] }>(`/api/admissions/public/sessions?schoolId=${schoolId}`),
    publicClasses: (schoolId: string) => request<{ classes: ClassItem[] }>(`/api/admissions/public/classes?schoolId=${schoolId}`),
    publicApply: (data: any) =>
      request<{ success: boolean; applicationId: string; applicationNumber: string; studentName: string; message: string }>('/api/admissions/public/apply', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    publicTrack: (applicationNumber: string, contact: string) =>
      request<{ application: any }>(`/api/admissions/public/track?applicationNumber=${encodeURIComponent(applicationNumber)}&contact=${encodeURIComponent(contact)}`),

    // Authenticated Endpoints
    getStats: (params?: { schoolId?: string; sessionId?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.set('schoolId', params.schoolId);
      if (params?.sessionId) q.set('sessionId', params.sessionId);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<{ stats: AdmissionStats }>(`/api/admissions/dashboard-stats${query}`);
    },
    list: (params?: {
      schoolId?: string;
      sessionId?: string;
      classId?: string;
      admissionType?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: string;
    }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.set('schoolId', params.schoolId);
      if (params?.sessionId) q.set('sessionId', params.sessionId);
      if (params?.classId) q.set('classId', params.classId);
      if (params?.admissionType) q.set('admissionType', params.admissionType);
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', params.page.toString());
      if (params?.limit) q.set('limit', params.limit.toString());
      if (params?.sortBy) q.set('sortBy', params.sortBy);
      if (params?.sortOrder) q.set('sortOrder', params.sortOrder);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<{
        applications: AdmissionApplication[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/api/admissions/applications${query}`);
    },
    get: (id: string) => request<{ application: AdmissionApplication }>(`/api/admissions/applications/${id}`),
    create: (data: any) =>
      request<{ success: boolean; applicationId: string; applicationNumber: string; message: string }>('/api/admissions/applications', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: any) =>
      request<{ success: boolean; message: string }>(`/api/admissions/applications/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    updateStatus: (id: string, new_status: AdmissionStatus, remarks?: string) =>
      request<{ success: boolean; message: string }>(`/api/admissions/applications/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ new_status, remarks })
      }),
    uploadDocument: (id: string, data: any) =>
      request<{ success: boolean; documentId: string; message: string }>(`/api/admissions/applications/${id}/documents`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    verifyDocument: (id: string, docId: string, verification_status: 'Verified' | 'Rejected' | 'Pending', remarks?: string) =>
      request<{ success: boolean; message: string }>(`/api/admissions/applications/${id}/documents/${docId}`, {
        method: 'PATCH',
        body: JSON.stringify({ verification_status, remarks })
      }),
    scheduleTest: (id: string, data: any) =>
      request<{ success: boolean; testId: string; message: string }>(`/api/admissions/applications/${id}/tests`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateTest: (id: string, testId: string, data: any) =>
      request<{ success: boolean; message: string }>(`/api/admissions/applications/${id}/tests/${testId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    scheduleInterview: (id: string, data: any) =>
      request<{ success: boolean; interviewId: string; message: string }>(`/api/admissions/applications/${id}/interviews`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateInterview: (id: string, interviewId: string, data: any) =>
      request<{ success: boolean; message: string }>(`/api/admissions/applications/${id}/interviews/${interviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    recordFee: (id: string, data: any) =>
      request<{ success: boolean; feeId: string; receiptNumber: string; message: string }>(`/api/admissions/applications/${id}/fees`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    confirmAdmission: (id: string, data: {
      class_id?: string;
      section_id: string;
      roll_number?: string;
      admission_date?: string;
      admission_number?: string;
      receipt_number?: string;
      remarks?: string;
    }) =>
      request<{ success: boolean; studentId: string; admissionNumber: string; enrollmentId: string; message: string }>(`/api/admissions/applications/${id}/confirm`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getSettings: (schoolId?: string) => {
      const q = schoolId ? `?schoolId=${schoolId}` : '';
      return request<{ settings: AdmissionSettings }>(`/api/admissions/settings${q}`);
    },
    updateSettings: (data: Partial<AdmissionSettings>) =>
      request<{ success: boolean; message: string }>('/api/admissions/settings', {
        method: 'PUT',
        body: JSON.stringify(data)
      })
  },

  // Employees & Faculty Management (Phase 4)
  employees: {
    getStats: (params?: { schoolId?: string }) => {
      const q = params?.schoolId ? `?schoolId=${encodeURIComponent(params.schoolId)}` : '';
      return request<{ stats: StaffStats }>(`/api/employees/stats${q}`);
    },
    nextEmployeeId: (schoolId: string) =>
      request<{ nextEmployeeId: string }>(`/api/employees/next-employee-id?schoolId=${encodeURIComponent(schoolId)}`),
    list: (params?: {
      schoolId?: string;
      employeeType?: string;
      departmentId?: string;
      designationId?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: string;
    }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.set('schoolId', params.schoolId);
      if (params?.employeeType) q.set('employeeType', params.employeeType);
      if (params?.departmentId) q.set('departmentId', params.departmentId);
      if (params?.designationId) q.set('designationId', params.designationId);
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', params.page.toString());
      if (params?.limit) q.set('limit', params.limit.toString());
      if (params?.sortBy) q.set('sortBy', params.sortBy);
      if (params?.sortOrder) q.set('sortOrder', params.sortOrder);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<{
        employees: Employee[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/api/employees${query}`);
    },
    get: (id: string) => request<{ employee: Employee }>(`/api/employees/${id}`),
    create: (data: any) =>
      request<{ success: boolean; employeeId: string; employeeIdNumber: string; message: string }>('/api/employees', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: any) =>
      request<{ success: boolean; message: string }>(`/api/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    updateStatus: (id: string, data: { new_status: string; effective_date?: string; remarks?: string; event_type?: string }) =>
      request<{ success: boolean; message: string }>(`/api/employees/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/employees/${id}`, {
        method: 'DELETE'
      }),
    exportUrl: (schoolId?: string) => {
      return schoolId ? `/api/employees/export?schoolId=${encodeURIComponent(schoolId)}` : '/api/employees/export';
    },
    import: (schoolId: string, employees: any[]) =>
      request<{ success: boolean; insertedCount: number; errorsCount: number; inserted: string[]; errors: any[] }>('/api/employees/import', {
        method: 'POST',
        body: JSON.stringify({ schoolId, employees })
      }),
    uploadDocument: (id: string, data: any) =>
      request<{ success: boolean; documentId: string; message: string }>(`/api/employees/${id}/documents`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    viewDocument: (id: string, docId: string) =>
      request<{ document: any }>(`/api/employees/${id}/documents/${docId}/view`),
    verifyDocument: (id: string, docId: string, verification_status: 'VERIFIED' | 'REJECTED' | 'PENDING', remarks?: string) =>
      request<{ success: boolean; message: string }>(`/api/employees/${id}/documents/${docId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verification_status, remarks })
      }),
    deleteDocument: (id: string, docId: string) =>
      request<{ success: boolean; message: string }>(`/api/employees/${id}/documents/${docId}`, {
        method: 'DELETE'
      }),
    addQualification: (id: string, data: any) =>
      request<{ success: boolean; qualificationId: string; message: string }>(`/api/employees/${id}/qualifications`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    deleteQualification: (id: string, qualId: string) =>
      request<{ success: boolean; message: string }>(`/api/employees/${id}/qualifications/${qualId}`, {
        method: 'DELETE'
      }),
    addExperience: (id: string, data: any) =>
      request<{ success: boolean; experienceId: string; message: string }>(`/api/employees/${id}/experience`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    deleteExperience: (id: string, expId: string) =>
      request<{ success: boolean; message: string }>(`/api/employees/${id}/experience/${expId}`, {
        method: 'DELETE'
      }),
    createUserAccount: (id: string, data: { username: string; password: string; role_id: string }) =>
      request<{ success: boolean; userId: string; message: string }>(`/api/employees/${id}/user-account`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateUserAccount: (id: string, data: { role_id?: string; status?: string }) =>
      request<{ success: boolean; message: string }>(`/api/employees/${id}/user-account`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    resetPassword: (id: string, new_password: string) =>
      request<{ success: boolean; message: string }>(`/api/employees/${id}/user-account/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ new_password })
      }),
    // Departments
    getDepartments: (schoolId?: string) => {
      const q = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
      return request<{ departments: Department[] }>(`/api/employees/meta/departments${q}`);
    },
    createDepartment: (data: any) =>
      request<{ success: boolean; departmentId: string; message: string }>('/api/employees/meta/departments', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateDepartment: (id: string, data: any) =>
      request<{ success: boolean; message: string }>(`/api/employees/meta/departments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    // Designations
    getDesignations: (schoolId?: string, departmentId?: string) => {
      const q = new URLSearchParams();
      if (schoolId) q.set('schoolId', schoolId);
      if (departmentId) q.set('departmentId', departmentId);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<{ designations: Designation[] }>(`/api/employees/meta/designations${query}`);
    },
    createDesignation: (data: any) =>
      request<{ success: boolean; designationId: string; message: string }>('/api/employees/meta/designations', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateDesignation: (id: string, data: any) =>
      request<{ success: boolean; message: string }>(`/api/employees/meta/designations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    // Subjects
    getSubjects: (schoolId?: string) => {
      const q = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
      return request<{ subjects: Subject[] }>(`/api/employees/meta/subjects${q}`);
    },
    createSubject: (data: any) =>
      request<{ success: boolean; subjectId: string; message: string }>('/api/employees/meta/subjects', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    // Teacher Academic Operations
    listTeachers: (params?: { schoolId?: string; sessionId?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.set('schoolId', params.schoolId);
      if (params?.sessionId) q.set('sessionId', params.sessionId);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<{ teachers: any[] }>(`/api/employees/teachers/list${query}`);
    },
    assignSubject: (teacherId: string, data: any) =>
      request<{ success: boolean; assignmentId: string; message: string }>(`/api/employees/teachers/${teacherId}/assign-subject`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    removeSubjectAssignment: (assignmentId: string) =>
      request<{ success: boolean; message: string }>(`/api/employees/teachers/assignments/${assignmentId}`, {
        method: 'DELETE'
      }),
    assignClassTeacher: (data: any) =>
      request<{ success: boolean; assignmentId: string; message: string }>('/api/employees/teachers/assign-class-teacher', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    removeClassTeacher: (assignmentId: string) =>
      request<{ success: boolean; message: string }>(`/api/employees/teachers/class-teacher/${assignmentId}`, {
        method: 'DELETE'
      })
  },

  // Attendance Management (Phase 5)
  attendance: {
    getDashboardStats: (params?: { schoolId?: string; date?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.set('schoolId', params.schoolId);
      if (params?.date) q.set('date', params.date);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<AttendanceDashboardStats>(`/api/attendance/dashboard-stats${query}`);
    },
    getSettings: (schoolId?: string) => {
      const q = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
      return request<{ settings: AttendanceSettings }>(`/api/attendance/settings${q}`);
    },
    updateSettings: (data: Partial<AttendanceSettings>) =>
      request<{ success: boolean; message: string }>('/api/attendance/settings', {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    getCalendar: (params?: { schoolId?: string; year?: string; month?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.set('schoolId', params.schoolId);
      if (params?.year) q.set('year', params.year);
      if (params?.month) q.set('month', params.month);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<{ events: SchoolCalendarEvent[] }>(`/api/attendance/calendar${query}`);
    },
    createCalendarEvent: (data: any) =>
      request<{ success: boolean; eventId: string; message: string }>('/api/attendance/calendar', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    deleteCalendarEvent: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/attendance/calendar/${id}`, {
        method: 'DELETE'
      }),
    getStudentRoster: (params: {
      schoolId: string;
      sessionId: string;
      classId: string;
      sectionId: string;
      date: string;
      attendanceSession?: string;
    }) => {
      const q = new URLSearchParams({
        schoolId: params.schoolId,
        sessionId: params.sessionId,
        classId: params.classId,
        sectionId: params.sectionId,
        date: params.date,
        attendanceSession: params.attendanceSession || 'FULL_DAY'
      });
      return request<{
        schoolId: string;
        sessionId: string;
        classId: string;
        sectionId: string;
        date: string;
        attendanceSession: string;
        students: StudentAttendanceRecord[];
        counts: {
          total: number;
          present: number;
          absent: number;
          late: number;
          halfDay: number;
          onLeave: number;
          unmarked: number;
        };
        isMarked: boolean;
        isLocked: boolean;
        calendarEvent: SchoolCalendarEvent | null;
      }>(`/api/attendance/student/roster?${q.toString()}`);
    },
    saveStudentBulk: (data: {
      school_id: string;
      session_id: string;
      class_id: string;
      section_id: string;
      date: string;
      attendance_session?: string;
      records: Array<{
        student_id: string;
        status: string;
        arrival_time?: string;
        remarks?: string;
        attendance_id?: string | null;
      }>;
      reopen_reason?: string;
    }) =>
      request<{ success: boolean; count: number; message: string }>('/api/attendance/student/bulk', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    unlockStudentAttendance: (data: {
      school_id: string;
      class_id: string;
      section_id: string;
      date: string;
      attendance_session?: string;
      reason: string;
    }) =>
      request<{ success: boolean; message: string }>('/api/attendance/student/unlock', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getStaffRoster: (params?: {
      schoolId?: string;
      date?: string;
      employeeType?: string;
      departmentId?: string;
    }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.set('schoolId', params.schoolId);
      if (params?.date) q.set('date', params.date);
      if (params?.employeeType) q.set('employeeType', params.employeeType);
      if (params?.departmentId) q.set('departmentId', params.departmentId);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<{
        schoolId?: string;
        date: string;
        staff: StaffAttendanceRecord[];
        counts: {
          total: number;
          present: number;
          absent: number;
          late: number;
          halfDay: number;
          onLeave: number;
          weeklyOff: number;
          holiday: number;
          unmarked: number;
        };
        isMarked: boolean;
        calendarEvent: SchoolCalendarEvent | null;
      }>(`/api/attendance/staff/roster${query}`);
    },
    saveStaffBulk: (data: {
      school_id: string;
      date: string;
      records: Array<{
        employee_id: string;
        status: string;
        check_in_time?: string;
        check_out_time?: string;
        work_duration_minutes?: number;
        remarks?: string;
        attendance_id?: string | null;
      }>;
    }) =>
      request<{ success: boolean; count: number; message: string }>('/api/attendance/staff/bulk', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    checkInStaff: (data: { employee_id: string; date?: string; check_in_time?: string; remarks?: string }) =>
      request<{ success: boolean; check_in_time: string; message: string }>('/api/attendance/staff/check-in', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    checkOutStaff: (data: { employee_id: string; date?: string; check_out_time?: string; remarks?: string }) =>
      request<{ success: boolean; check_out_time: string; message: string }>('/api/attendance/staff/check-out', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getStudentRegister: (params: {
      schoolId: string;
      sessionId: string;
      classId: string;
      sectionId: string;
      month: string;
      year: string;
    }) => {
      const q = new URLSearchParams(params);
      return request<StudentMonthlyRegister>(`/api/attendance/student/register?${q.toString()}`);
    },
    studentRegisterExportUrl: (params: {
      schoolId: string;
      sessionId: string;
      classId: string;
      sectionId: string;
      month: string;
      year: string;
    }) => {
      const q = new URLSearchParams(params);
      return `/api/attendance/student/register/export?${q.toString()}`;
    },
    getStaffRegister: (params: {
      schoolId?: string;
      month: string;
      year: string;
      employeeType?: string;
    }) => {
      const q = new URLSearchParams();
      if (params.schoolId) q.set('schoolId', params.schoolId);
      q.set('month', params.month);
      q.set('year', params.year);
      if (params.employeeType) q.set('employeeType', params.employeeType);
      return request<StaffMonthlyRegister>(`/api/attendance/staff/register?${q.toString()}`);
    },
    getCorrections: (params?: { schoolId?: string; status?: string; recordType?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.set('schoolId', params.schoolId);
      if (params?.status) q.set('status', params.status);
      if (params?.recordType) q.set('recordType', params.recordType);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<{ corrections: AttendanceCorrectionRequest[] }>(`/api/attendance/corrections${query}`);
    },
    submitCorrection: (data: any) =>
      request<{ success: boolean; requestId: string; message: string }>('/api/attendance/corrections', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    reviewCorrection: (id: string, data: { action: 'APPROVED' | 'REJECTED'; review_remarks?: string }) =>
      request<{ success: boolean; message: string }>(`/api/attendance/corrections/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    getStudentSummary: (studentId: string) =>
      request<{
        studentId: string;
        summary: {
          present: number;
          absent: number;
          late: number;
          halfDay: number;
          onLeave: number;
          attendedDays: number;
          totalRecordedDays: number;
          percentage: number;
        };
        recentLogs: Array<{ date: string; status: string; arrival_time?: string; remarks?: string; marked_by_name?: string }>;
        monthlyBreakdown: Array<{ month_str: string; present: number; absent: number; late: number; half_day: number; on_leave: number; total_days: number }>;
      }>(`/api/attendance/student/${studentId}/summary`),
    getEmployeeSummary: (employeeId: string) =>
      request<{
        employeeId: string;
        summary: {
          present: number;
          absent: number;
          late: number;
          halfDay: number;
          onLeave: number;
          weeklyOff: number;
          holiday: number;
          workedDays: number;
          scheduledDays: number;
          percentage: number;
        };
        recentLogs: Array<{ date: string; status: string; check_in_time?: string; check_out_time?: string; work_duration_minutes?: number; remarks?: string }>;
        monthlyBreakdown: Array<{ month_str: string; present: number; absent: number; late: number; half_day: number; on_leave: number; total_days: number }>;
      }>(`/api/attendance/employee/${employeeId}/summary`)
  },

  fees: {
    getDashboardStats: (schoolId?: string, date?: string) => {
      const q = new URLSearchParams();
      if (schoolId) q.append('schoolId', schoolId);
      if (date) q.append('date', date);
      return request<FeeDashboardStats>(`/api/fees/dashboard-stats?${q.toString()}`);
    },

    getCategories: async (schoolId: string): Promise<FeeCategory[]> => {
      const res = await request<FeeCategory[] | { categories?: FeeCategory[]; data?: FeeCategory[] }>(
        `/api/fees/categories?schoolId=${encodeURIComponent(schoolId)}`
      );
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.categories)) return res.categories;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },

    createCategory: (data: { schoolId: string; name: string; code: string; description?: string }) =>
      request<FeeCategory>('/api/fees/categories', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    updateCategory: (id: string, data: { name: string; description?: string; status?: string }) =>
      request<FeeCategory>(`/api/fees/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    getStructures: async (schoolId: string, sessionId?: string): Promise<FeeStructure[]> => {
      const q = new URLSearchParams({ schoolId });
      if (sessionId) q.append('sessionId', sessionId);
      const res = await request<FeeStructure[] | { structures?: FeeStructure[]; data?: FeeStructure[] }>(
        `/api/fees/structures?${q.toString()}`
      );
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.structures)) return res.structures;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },

    getStructure: (id: string) =>
      request<FeeStructure>(`/api/fees/structures/${id}`),

    createStructure: (data: any) =>
      request<FeeStructure>('/api/fees/structures', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    updateStructure: (id: string, data: any) =>
      request<FeeStructure>(`/api/fees/structures/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    getAssignments: async (params: {
      schoolId: string;
      sessionId?: string;
      classId?: string;
      sectionId?: string;
      status?: string;
      search?: string;
    }): Promise<StudentFeeAssignment[]> => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v) q.append(k, v);
      });
      const res = await request<
        StudentFeeAssignment[] | { assignments?: StudentFeeAssignment[]; data?: StudentFeeAssignment[] }
      >(`/api/fees/assignments?${q.toString()}`);
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.assignments)) return res.assignments;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },

    getAssignment: (id: string) =>
      request<StudentFeeAssignment>(`/api/fees/assignments/${id}`),

    assignClass: (data: { schoolId: string; sessionId: string; classId: string; sectionId?: string; structureId: string }) =>
      request<{ assignedCount: number; skippedCount: number; message: string }>('/api/fees/assignments/class', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    assignStudent: (data: { schoolId: string; sessionId: string; studentId: string; structureId: string }) =>
      request<StudentFeeAssignment>('/api/fees/assignments/student', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    searchStudents: async (schoolId: string, q: string): Promise<Array<{
      id: string;
      name: string;
      admission_number: string;
      roll_number: string;
      class_name: string;
      section_name: string;
      parent_name: string;
      parent_mobile: string;
      total_charges: number;
      paid_amount: number;
      outstanding_balance: number;
      assignment_id?: string;
    }>> => {
      const res = await request<any>(`/api/fees/students/search?schoolId=${encodeURIComponent(schoolId)}&q=${encodeURIComponent(q)}`);
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.students)) return res.students;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },

    getStudentPayableSummary: (studentId: string) =>
      request<StudentPayableSummary>(`/api/fees/students/${studentId}/payable-summary`),

    collectPayment: (data: {
      studentId: string;
      amount: number;
      paymentMode: string;
      transactionReference?: string;
      chequeNumber?: string;
      chequeDate?: string;
      bankName?: string;
      remarks?: string;
      chargeIds?: string[];
      allowAdvance?: boolean;
    }) =>
      request<{
        success: boolean;
        payment: FeePayment;
        receipt: OfficialReceiptPayload;
        message: string;
      }>('/api/fees/payments', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getPayments: async (params: { schoolId?: string; sessionId?: string; studentId?: string; date?: string; paymentMode?: string; status?: string }): Promise<FeePayment[]> => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v) q.append(k, v);
      });
      const res = await request<FeePayment[] | { payments?: FeePayment[]; data?: FeePayment[] }>(
        `/api/fees/payments?${q.toString()}`
      );
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.payments)) return res.payments;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },

    getPayment: (id: string) =>
      request<FeePayment>(`/api/fees/payments/${id}`),

    getReceipt: (receiptNumber: string) =>
      request<{
        receiptNumber: string;
        reprintCount: number;
        payload: OfficialReceiptPayload;
      }>(`/api/fees/receipts/${encodeURIComponent(receiptNumber)}`),

    reprintReceipt: (receiptNumber: string, reason?: string) =>
      request<{ success: boolean; reprintCount: number; payload: OfficialReceiptPayload }>(
        `/api/fees/receipts/${encodeURIComponent(receiptNumber)}/reprint`,
        {
          method: 'POST',
          body: JSON.stringify({ reason })
        }
      ),

    getConcessions: async (params: { schoolId?: string; sessionId?: string; status?: string }): Promise<FeeConcession[]> => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v) q.append(k, v);
      });
      const res = await request<FeeConcession[] | { concessions?: FeeConcession[]; data?: FeeConcession[] }>(
        `/api/fees/concessions?${q.toString()}`
      );
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.concessions)) return res.concessions;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },

    requestConcession: (data: {
      studentId: string;
      assignmentId?: string;
      chargeId?: string;
      categoryId?: string;
      concessionType: string;
      discountType: 'FIXED' | 'PERCENTAGE';
      discountValue: number;
      reason: string;
      documentUrl?: string;
    }) =>
      request<FeeConcession>('/api/fees/concessions', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    reviewConcession: (id: string, data: { status: 'APPROVED' | 'REJECTED'; remarks: string }) =>
      request<FeeConcession>(`/api/fees/concessions/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),

    getRefunds: async (params: { schoolId?: string; status?: string }): Promise<FeeRefund[]> => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v) q.append(k, v);
      });
      const res = await request<FeeRefund[] | { refunds?: FeeRefund[]; data?: FeeRefund[] }>(
        `/api/fees/refunds?${q.toString()}`
      );
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.refunds)) return res.refunds;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },

    requestRefund: (data: {
      paymentId: string;
      amount: number;
      reason: string;
      paymentMode?: string;
      transactionReference?: string;
    }) =>
      request<FeeRefund>('/api/fees/refunds', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    reviewRefund: (id: string, data: { status: 'APPROVED' | 'REJECTED'; remarks: string }) =>
      request<FeeRefund>(`/api/fees/refunds/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),

    reversePayment: (paymentId: string, data: { reason: string }) =>
      request<{ success: boolean; reversal: any; message: string }>(`/api/fees/payments/${paymentId}/reverse`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getStudentLedger: (studentId: string) =>
      request<StudentLedger>(`/api/fees/students/${studentId}/ledger`),

    getExpenses: async (params: { schoolId?: string; categoryId?: string; startDate?: string; endDate?: string }): Promise<SchoolExpense[]> => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v) q.append(k, v);
      });
      const res = await request<SchoolExpense[] | { expenses?: SchoolExpense[]; data?: SchoolExpense[] }>(
        `/api/fees/expenses?${q.toString()}`
      );
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.expenses)) return res.expenses;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },

    createExpense: (data: {
      schoolId: string;
      categoryId: string;
      expenseDate: string;
      amount: number;
      paymentMode: string;
      payeeVendor: string;
      referenceNo?: string;
      description?: string;
      supportingDocUrl?: string;
    }) =>
      request<SchoolExpense>('/api/fees/expenses', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getExpenseCategories: async (schoolId: string): Promise<ExpenseCategory[]> => {
      const res = await request<ExpenseCategory[] | { categories?: ExpenseCategory[]; data?: ExpenseCategory[] }>(
        `/api/fees/expense-categories?schoolId=${encodeURIComponent(schoolId)}`
      );
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.categories)) return res.categories;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },

    getReminders: async (params: { schoolId?: string; sessionId?: string; status?: string }): Promise<FeeReminder[]> => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v) q.append(k, v);
      });
      const res = await request<FeeReminder[] | { reminders?: FeeReminder[]; data?: FeeReminder[] }>(
        `/api/fees/reminders?${q.toString()}`
      );
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.reminders)) return res.reminders;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },

    logReminder: (data: {
      studentId: string;
      reminderType: string;
      targetDueDate?: string;
      amountDue: number;
      parentName: string;
      parentMobile: string;
      parentEmail?: string;
      channel: string;
      messageText: string;
    }) =>
      request<FeeReminder>('/api/fees/reminders/log', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    exportCollectionCsvUrl: (schoolId: string, startDate?: string, endDate?: string) => {
      const q = new URLSearchParams({ schoolId });
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);
      return `/api/fees/reports/export/collection-csv?${q.toString()}`;
    },

    exportDuesCsvUrl: (schoolId: string, classId?: string) => {
      const q = new URLSearchParams({ schoolId });
      if (classId) q.append('classId', classId);
      return `/api/fees/reports/export/dues-csv?${q.toString()}`;
    }
  },

  classroom: {
    // Rooms
    getRooms: (schoolId?: string) =>
      request<{ rooms: ClassroomRoom[] }>(`/api/classroom/rooms${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createRoom: (data: {
      schoolId?: string;
      roomNumber: string;
      name: string;
      building?: string;
      floor?: string;
      capacity?: number;
      roomType?: string;
      isShared?: boolean;
    }) =>
      request<{ message: string; id: string }>('/api/classroom/rooms', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    updateRoom: (id: string, data: Partial<ClassroomRoom>) =>
      request<{ message: string }>(`/api/classroom/rooms/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    // Periods
    getPeriods: (schoolId?: string) =>
      request<{ periods: TimetablePeriod[] }>(`/api/classroom/periods${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createPeriod: (data: {
      schoolId?: string;
      sessionId?: string;
      name: string;
      periodNumber: number;
      startTime: string;
      endTime: string;
      durationMinutes?: number;
      periodType?: string;
      sortOrder?: number;
    }) =>
      request<{ message: string; id: string }>('/api/classroom/periods', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    // Timetables
    getTimetables: (params?: { schoolId?: string; classId?: string; sectionId?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.classId) q.append('classId', params.classId);
      if (params?.sectionId) q.append('sectionId', params.sectionId);
      return request<{ timetables: Timetable[] }>(`/api/classroom/timetables?${q.toString()}`);
    },

    getTimetable: (id: string) =>
      request<{ timetable: Timetable; entries: TimetableEntry[] }>(`/api/classroom/timetables/${encodeURIComponent(id)}`),

    createTimetable: (data: {
      schoolId?: string;
      sessionId: string;
      classId: string;
      sectionId?: string;
      name: string;
      effectiveFrom?: string;
      effectiveTo?: string;
    }) =>
      request<{ message: string; id: string }>('/api/classroom/timetables', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    publishTimetable: (id: string, status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED') =>
      request<{ message: string }>(`/api/classroom/timetables/${encodeURIComponent(id)}/publish`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }),

    // Conflict Check & Entries
    checkConflict: (data: {
      schoolId?: string;
      dayOfWeek: string;
      periodId: string;
      teacherId: string;
      classId: string;
      sectionId?: string;
      roomId?: string;
      excludeEntryId?: string;
    }) =>
      request<{ hasConflict: boolean; conflicts: TimetableConflict[] }>('/api/classroom/timetables/check-conflict', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    createEntry: (data: {
      timetableId: string;
      dayOfWeek: string;
      periodId: string;
      subjectId: string;
      teacherId: string;
      roomId?: string;
      allowOverride?: boolean;
      overrideReason?: string;
    }) =>
      request<{ message: string; id: string }>('/api/classroom/timetables/entries', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    deleteEntry: (id: string) =>
      request<{ message: string }>(`/api/classroom/timetables/entries/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      }),

    // Views
    getClassView: (classId: string, sectionId?: string, schoolId?: string) => {
      const q = new URLSearchParams({ classId });
      if (sectionId) q.append('sectionId', sectionId);
      if (schoolId) q.append('schoolId', schoolId);
      return request<{ entries: TimetableEntry[]; periods: TimetablePeriod[] }>(`/api/classroom/views/class?${q.toString()}`);
    },

    getTeacherView: (teacherId: string, schoolId?: string) => {
      const q = new URLSearchParams({ teacherId });
      if (schoolId) q.append('schoolId', schoolId);
      return request<{ entries: TimetableEntry[]; periods: TimetablePeriod[] }>(`/api/classroom/views/teacher?${q.toString()}`);
    },

    // Teacher Substitutions
    getSubstitutions: (params?: { schoolId?: string; date?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.date) q.append('date', params.date);
      return request<{ substitutions: TeacherSubstitution[] }>(`/api/classroom/substitutions?${q.toString()}`);
    },

    assignSubstitution: (data: {
      schoolId?: string;
      timetableEntryId?: string;
      substitutionDate: string;
      originalTeacherId: string;
      substituteTeacherId: string;
      classId?: string;
      sectionId?: string;
      subjectId?: string;
      periodId?: string;
      reason: string;
      remarks?: string;
    }) =>
      request<{ message: string; id: string }>('/api/classroom/substitutions', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    // Homework
    getHomework: (params?: {
      schoolId?: string;
      classId?: string;
      sectionId?: string;
      subjectId?: string;
      studentId?: string;
    }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.classId) q.append('classId', params.classId);
      if (params?.sectionId) q.append('sectionId', params.sectionId);
      if (params?.subjectId) q.append('subjectId', params.subjectId);
      if (params?.studentId) q.append('studentId', params.studentId);
      return request<{ homework: Homework[] }>(`/api/classroom/homework?${q.toString()}`);
    },

    createHomework: (data: {
      schoolId?: string;
      sessionId?: string;
      classId: string;
      sectionId?: string;
      subjectId: string;
      title: string;
      description: string;
      assignedDate: string;
      dueDate: string;
      maxMarks?: number;
      priority?: string;
      instructions?: string;
      attachments?: any[];
      status?: string;
    }) =>
      request<{ message: string; id: string }>('/api/classroom/homework', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getHomeworkSubmissions: (homeworkId: string) =>
      request<{ homework: Homework; submissions: HomeworkSubmission[] }>(`/api/classroom/homework/${encodeURIComponent(homeworkId)}/submissions`),

    submitHomework: (homeworkId: string, data: {
      studentId: string;
      textContent?: string;
      submittedFiles?: any[];
      studentRemarks?: string;
    }) =>
      request<{ message: string; status: string }>(`/api/classroom/homework/${encodeURIComponent(homeworkId)}/submit`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    evaluateSubmission: (submissionId: string, data: {
      marksObtained: number;
      grade?: string;
      teacherFeedback?: string;
    }) =>
      request<{ message: string }>(`/api/classroom/homework/submissions/${encodeURIComponent(submissionId)}/evaluate`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),

    // Study Materials
    getMaterials: (params?: { schoolId?: string; classId?: string; subjectId?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.classId) q.append('classId', params.classId);
      if (params?.subjectId) q.append('subjectId', params.subjectId);
      return request<{ materials: LearningMaterial[] }>(`/api/classroom/materials?${q.toString()}`);
    },

    uploadMaterial: (data: {
      schoolId?: string;
      sessionId?: string;
      classId: string;
      sectionId?: string;
      subjectId: string;
      title: string;
      description?: string;
      materialType?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: string;
      visibility?: string;
    }) =>
      request<{ message: string; id: string }>('/api/classroom/materials', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    // Notices
    getNotices: (params?: { schoolId?: string; classId?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.classId) q.append('classId', params.classId);
      return request<{ notices: ClassroomNotice[] }>(`/api/classroom/notices?${q.toString()}`);
    },

    publishNotice: (data: {
      schoolId?: string;
      sessionId?: string;
      classId?: string;
      sectionId?: string;
      subjectId?: string;
      title: string;
      content: string;
      targetAudience?: string;
      priority?: string;
      publishDate: string;
      expiryDate?: string;
      attachmentUrl?: string;
      attachmentName?: string;
    }) =>
      request<{ message: string; id: string }>('/api/classroom/notices', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    // Dashboards & Workload Reports
    getDashboardSummary: (schoolId?: string) =>
      request<ClassroomDashboardSummary>(`/api/classroom/dashboard/summary${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getTeacherWorkload: (schoolId?: string) =>
      request<{ workload: TeacherWorkloadItem[] }>(`/api/classroom/reports/teacher-workload${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`)
  },

  // ==========================================
  // PHASE 10: LIBRARY MANAGEMENT API CLIENT
  // ==========================================
  library: {
    getDashboardStats: (schoolId?: string) =>
      request<LibraryDashboardStats>(`/api/library/dashboard${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getSettings: (schoolId?: string) =>
      request<{ settings: LibrarySettings }>(`/api/library/settings${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    updateSettings: (data: Partial<LibrarySettings> & { schoolId?: string }) =>
      request<{ settings: LibrarySettings; message: string }>('/api/library/settings', {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    getBranches: (schoolId?: string) =>
      request<{ libraries: LibraryFacility[] }>(`/api/library/branches${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createBranch: (data: Partial<LibraryFacility> & { schoolId?: string }) =>
      request<{ library: LibraryFacility; message: string }>('/api/library/branches', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getCategories: (schoolId?: string) =>
      request<{ categories: BookCategory[] }>(`/api/library/categories${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createCategory: (data: Partial<BookCategory> & { schoolId?: string }) =>
      request<{ category: BookCategory; message: string }>('/api/library/categories', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getAuthors: (schoolId?: string, search?: string) => {
      const q = new URLSearchParams();
      if (schoolId) q.append('schoolId', schoolId);
      if (search) q.append('search', search);
      return request<{ authors: BookAuthor[] }>(`/api/library/authors?${q.toString()}`);
    },

    createAuthor: (data: Partial<BookAuthor> & { schoolId?: string }) =>
      request<{ author: BookAuthor; message: string }>('/api/library/authors', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getPublishers: (schoolId?: string) =>
      request<{ publishers: BookPublisher[] }>(`/api/library/publishers${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createPublisher: (data: Partial<BookPublisher> & { schoolId?: string }) =>
      request<{ publisher: BookPublisher; message: string }>('/api/library/publishers', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getLocations: (schoolId?: string) =>
      request<{ locations: BookLocation[] }>(`/api/library/locations${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createLocation: (data: Partial<BookLocation> & { schoolId?: string }) =>
      request<{ location: BookLocation; message: string }>('/api/library/locations', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getBooks: (params?: {
      schoolId?: string;
      search?: string;
      categoryId?: string;
      authorId?: string;
      page?: number;
      limit?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.search) q.append('search', params.search);
      if (params?.categoryId) q.append('categoryId', params.categoryId);
      if (params?.authorId) q.append('authorId', params.authorId);
      if (params?.page) q.append('page', params.page.toString());
      if (params?.limit) q.append('limit', params.limit.toString());
      return request<{ books: BookTitle[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
        `/api/library/books?${q.toString()}`
      );
    },

    getBookDetails: (id: string, schoolId?: string) =>
      request<{ book: BookTitle; copies: BookCopy[]; reservations: BookReservation[] }>(
        `/api/library/books/${id}${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`
      ),

    createBook: (data: any) =>
      request<{ book: BookTitle; copiesCreated: BookCopy[]; message: string }>('/api/library/books', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    addCopy: (data: any) =>
      request<{ copy: BookCopy; message: string }>('/api/library/copies', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    lookupCopy: (term: string, schoolId?: string) =>
      request<{ copy: BookCopy }>(
        `/api/library/copies/lookup?term=${encodeURIComponent(term)}${schoolId ? `&schoolId=${encodeURIComponent(schoolId)}` : ''}`
      ),

    getMembers: (params?: { schoolId?: string; search?: string; type?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.search) q.append('search', params.search);
      if (params?.type) q.append('type', params.type);
      if (params?.status) q.append('status', params.status);
      return request<{ members: LibraryMember[] }>(`/api/library/members?${q.toString()}`);
    },

    lookupMember: (term: string, schoolId?: string) =>
      request<{ members: LibraryMember[] }>(
        `/api/library/members/lookup?term=${encodeURIComponent(term)}${schoolId ? `&schoolId=${encodeURIComponent(schoolId)}` : ''}`
      ),

    getMemberProfile: (id: string, schoolId?: string) =>
      request<{ member: LibraryMember; issues: BookIssue[]; fines: LibraryFine[]; reservations: BookReservation[] }>(
        `/api/library/members/${id}/profile${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`
      ),

    createMember: (data: {
      schoolId?: string;
      memberType: string;
      studentId?: string;
      employeeId?: string;
      borrowingLimit?: number;
      expiryDate?: string;
      notes?: string;
    }) =>
      request<{ member: LibraryMember; message: string }>('/api/library/members', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    issueBook: (data: {
      schoolId?: string;
      memberId: string;
      copyId?: string;
      accessionOrBarcode?: string;
      customDueDate?: string;
      notes?: string;
    }) =>
      request<{ success: boolean; issueId: string; accessionNumber: string; bookTitle: string; dueDate: string; message: string }>(
        '/api/library/issues',
        {
          method: 'POST',
          body: JSON.stringify(data)
        }
      ),

    returnBook: (data: {
      schoolId?: string;
      issueId?: string;
      accessionOrBarcode?: string;
      returnCondition?: string;
      damageNotes?: string;
      damagePenalty?: number;
      waivedFineReason?: string;
    }) =>
      request<{ success: boolean; message: string; condition: string; overdueDays: number; fineAmount: number; fineRecord: any }>(
        '/api/library/returns',
        {
          method: 'POST',
          body: JSON.stringify(data)
        }
      ),

    renewBook: (issueId: string, data?: { reason?: string; schoolId?: string }) =>
      request<{ success: boolean; newDueDate: string; renewalCount: number; message: string }>(
        `/api/library/issues/${issueId}/renew`,
        {
          method: 'POST',
          body: JSON.stringify(data || {})
        }
      ),

    getReservations: (params?: { schoolId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.status) q.append('status', params.status);
      return request<{ reservations: BookReservation[] }>(`/api/library/reservations?${q.toString()}`);
    },

    createReservation: (data: { bookId: string; memberId: string; schoolId?: string }) =>
      request<{ reservation: BookReservation; message: string }>('/api/library/reservations', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getOverdueBooks: (schoolId?: string) =>
      request<{ overdueBooks: BookIssue[] }>(`/api/library/overdue${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    sendBatchOverdueReminders: (schoolId?: string) =>
      request<{ success: boolean; count: number; message: string }>('/api/library/overdue/batch-reminders', {
        method: 'POST',
        body: JSON.stringify({ schoolId })
      }),

    getFines: (params?: { schoolId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.status) q.append('status', params.status);
      return request<{ fines: LibraryFine[] }>(`/api/library/fines?${q.toString()}`);
    },

    collectFine: (id: string, data: { paymentMode?: string; notes?: string; schoolId?: string }) =>
      request<{ success: boolean; receiptNumber: string; message: string }>(`/api/library/fines/${id}/collect`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    waiveFine: (id: string, data: { waiveAmount?: number; reason: string; schoolId?: string }) =>
      request<{ success: boolean; message: string }>(`/api/library/fines/${id}/waive`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getAudits: (schoolId?: string) =>
      request<{ audits: InventoryAudit[] }>(`/api/library/audits${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    startAudit: (data: { title: string; notes?: string; schoolId?: string }) =>
      request<{ audit: InventoryAudit; message: string }>('/api/library/audits', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    scanAuditItem: (id: string, data: { accessionOrBarcode: string; schoolId?: string }) =>
      request<{ verified: boolean; item: any }>(`/api/library/audits/${id}/scan`, {
        method: 'POST',
        body: JSON.stringify(data)
      })
  },

  // ==========================================
  // PHASE 11: HOSTEL / RESIDENTIAL MANAGEMENT API CLIENT
  // ==========================================
  hostel: {
    getDashboardStats: (schoolId?: string) =>
      request<HostelDashboardStats>(`/api/hostel/dashboard${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getRules: (schoolId?: string) =>
      request<{ rules: HostelRules }>(`/api/hostel/rules${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    updateRules: (data: Partial<HostelRules> & { schoolId?: string }) =>
      request<{ rules: HostelRules; message: string }>('/api/hostel/rules', {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    getHostels: (schoolId?: string) =>
      request<{ hostels: Hostel[] }>(`/api/hostel/hostels${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createHostel: (data: Partial<Hostel> & { schoolId?: string }) =>
      request<{ hostel: Hostel; message: string }>('/api/hostel/hostels', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    updateHostel: (id: string, data: Partial<Hostel> & { schoolId?: string }) =>
      request<{ hostel: Hostel; message: string }>(`/api/hostel/hostels/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    getBlocks: (params?: { schoolId?: string; hostelId?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.hostelId) q.append('hostelId', params.hostelId);
      return request<{ blocks: HostelBlock[] }>(`/api/hostel/blocks?${q.toString()}`);
    },

    createBlock: (data: Partial<HostelBlock> & { schoolId?: string }) =>
      request<{ block: HostelBlock; message: string }>('/api/hostel/blocks', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getFloors: (params?: { schoolId?: string; blockId?: string; hostelId?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.blockId) q.append('blockId', params.blockId);
      if (params?.hostelId) q.append('hostelId', params.hostelId);
      return request<{ floors: HostelFloor[] }>(`/api/hostel/floors?${q.toString()}`);
    },

    createFloor: (data: Partial<HostelFloor> & { schoolId?: string }) =>
      request<{ floor: HostelFloor; message: string }>('/api/hostel/floors', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getRooms: (params?: { schoolId?: string; hostelId?: string; blockId?: string; floorId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.hostelId) q.append('hostelId', params.hostelId);
      if (params?.blockId) q.append('blockId', params.blockId);
      if (params?.floorId) q.append('floorId', params.floorId);
      if (params?.status) q.append('status', params.status);
      return request<{ rooms: HostelRoom[] }>(`/api/hostel/rooms?${q.toString()}`);
    },

    createRoom: (data: Partial<HostelRoom> & { autoCreateBeds?: boolean; schoolId?: string }) =>
      request<{ room: HostelRoom; message: string }>('/api/hostel/rooms', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getRoomDetails: (id: string, schoolId?: string) =>
      request<{ room: HostelRoom; beds: HostelBed[] }>(
        `/api/hostel/rooms/${id}${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`
      ),

    getBeds: (params?: { schoolId?: string; hostelId?: string; roomId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.hostelId) q.append('hostelId', params.hostelId);
      if (params?.roomId) q.append('roomId', params.roomId);
      if (params?.status) q.append('status', params.status);
      return request<{ beds: HostelBed[] }>(`/api/hostel/beds?${q.toString()}`);
    },

    createBed: (data: Partial<HostelBed> & { schoolId?: string }) =>
      request<{ bed: HostelBed; message: string }>('/api/hostel/beds', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getOccupancyMap: (schoolId?: string, hostelId?: string) => {
      const q = new URLSearchParams();
      if (schoolId) q.append('schoolId', schoolId);
      if (hostelId) q.append('hostelId', hostelId);
      return request<{ occupancyData: OccupancyMapItem[] }>(`/api/hostel/occupancy-map?${q.toString()}`);
    },

    getStaff: (schoolId?: string) =>
      request<{ staffAssignments: HostelStaffAssignment[] }>(`/api/hostel/staff${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    assignStaff: (data: Partial<HostelStaffAssignment> & { schoolId?: string }) =>
      request<{ assignment: HostelStaffAssignment; message: string }>('/api/hostel/staff', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getRoster: (schoolId?: string) =>
      request<{ roster: HostelDutyRoster[] }>(`/api/hostel/roster${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getAdmissions: (params?: { schoolId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.status) q.append('status', params.status);
      return request<{ admissions: HostelAdmission[] }>(`/api/hostel/admissions?${q.toString()}`);
    },

    admitStudent: (data: Partial<HostelAdmission> & { schoolId?: string }) =>
      request<{ admission: HostelAdmission; message: string }>('/api/hostel/admissions', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getAllocations: (params?: { schoolId?: string; hostelId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.hostelId) q.append('hostelId', params.hostelId);
      if (params?.status) q.append('status', params.status);
      return request<{ allocations: HostelAllocation[] }>(`/api/hostel/allocations?${q.toString()}`);
    },

    allocateBed: (data: Partial<HostelAllocation> & { schoolId?: string }) =>
      request<{ allocation: HostelAllocation; message: string }>('/api/hostel/allocations', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    transferStudent: (data: {
      allocationId: string;
      targetHostelId: string;
      targetRoomId: string;
      targetBedId: string;
      reason: string;
      remarks?: string;
      schoolId?: string;
    }) =>
      request<{ success: boolean; message: string }>('/api/hostel/transfers', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    withdrawStudent: (data: {
      allocationId: string;
      withdrawalDate?: string;
      reason: string;
      clearanceStatus?: string;
      remarks?: string;
      schoolId?: string;
    }) =>
      request<{ success: boolean; message: string }>('/api/hostel/withdrawals', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getAttendance: (params?: { schoolId?: string; hostelId?: string; date?: string; attendanceType?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.hostelId) q.append('hostelId', params.hostelId);
      if (params?.date) q.append('date', params.date);
      if (params?.attendanceType) q.append('attendanceType', params.attendanceType);
      return request<{ sessions: HostelAttendanceSession[] }>(`/api/hostel/attendance?${q.toString()}`);
    },

    getAttendanceRoster: (params: { hostelId: string; date?: string; attendanceType?: string; schoolId?: string }) => {
      const q = new URLSearchParams();
      q.append('hostelId', params.hostelId);
      if (params.date) q.append('date', params.date);
      if (params.attendanceType) q.append('attendanceType', params.attendanceType);
      if (params.schoolId) q.append('schoolId', params.schoolId);
      return request<{ session: HostelAttendanceSession | null; residents: any[] }>(`/api/hostel/attendance/roster?${q.toString()}`);
    },

    markAttendance: (data: {
      hostelId: string;
      blockId?: string;
      date: string;
      attendanceType: string;
      records: any[];
      notes?: string;
      lockSession?: boolean;
      schoolId?: string;
    }) =>
      request<{ success: boolean; attendanceId: string; message: string }>('/api/hostel/attendance/mark', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    lockAttendance: (id: string, schoolId?: string) =>
      request<{ success: boolean; session: HostelAttendanceSession; message: string }>(`/api/hostel/attendance/${id}/lock`, {
        method: 'POST',
        body: JSON.stringify({ schoolId })
      }),

    getLeaves: (params?: { schoolId?: string; status?: string; hostelId?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.status) q.append('status', params.status);
      if (params?.hostelId) q.append('hostelId', params.hostelId);
      return request<{ leaves: HostelLeave[] }>(`/api/hostel/leaves?${q.toString()}`);
    },

    createLeave: (data: Partial<HostelLeave> & { parentConsentGranted?: boolean; schoolId?: string }) =>
      request<{ leave: HostelLeave; message: string }>('/api/hostel/leaves', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    approveLeave: (id: string, remarks?: string, schoolId?: string) =>
      request<{ success: boolean; leave: HostelLeave; message: string }>(`/api/hostel/leaves/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ remarks, schoolId })
      }),

    rejectLeave: (id: string, remarks?: string, schoolId?: string) =>
      request<{ success: boolean; leave: HostelLeave; message: string }>(`/api/hostel/leaves/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ remarks, schoolId })
      }),

    getOutings: (params?: { schoolId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.status) q.append('status', params.status);
      return request<{ outings: HostelOuting[] }>(`/api/hostel/outings?${q.toString()}`);
    },

    createOuting: (data: Partial<HostelOuting> & { schoolId?: string }) =>
      request<{ outing: HostelOuting; message: string }>('/api/hostel/outings', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    checkoutOuting: (id: string, schoolId?: string) =>
      request<{ success: boolean; outing: HostelOuting; message: string }>(`/api/hostel/outings/${id}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ schoolId })
      }),

    checkinOuting: (id: string, schoolId?: string) =>
      request<{ success: boolean; outing: HostelOuting; message: string }>(`/api/hostel/outings/${id}/checkin`, {
        method: 'POST',
        body: JSON.stringify({ schoolId })
      }),

    getMovements: (params?: { schoolId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.status) q.append('status', params.status);
      return request<{ movements: HostelMovement[] }>(`/api/hostel/movements?${q.toString()}`);
    },

    getVisitors: (params?: { schoolId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.status) q.append('status', params.status);
      return request<{ visitors: HostelVisitor[] }>(`/api/hostel/visitors?${q.toString()}`);
    },

    createVisitor: (data: Partial<HostelVisitor> & { schoolId?: string }) =>
      request<{ visitor: HostelVisitor; message: string }>('/api/hostel/visitors', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    checkoutVisitor: (id: string, schoolId?: string) =>
      request<{ success: boolean; visitor: HostelVisitor; message: string }>(`/api/hostel/visitors/${id}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ schoolId })
      }),

    getIncidents: (params?: { schoolId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.status) q.append('status', params.status);
      return request<{ incidents: HostelIncident[] }>(`/api/hostel/incidents?${q.toString()}`);
    },

    createIncident: (data: Partial<HostelIncident> & { schoolId?: string }) =>
      request<{ incident: HostelIncident; message: string }>('/api/hostel/incidents', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    updateIncident: (id: string, data: Partial<HostelIncident> & { schoolId?: string }) =>
      request<{ incident: HostelIncident; message: string }>(`/api/hostel/incidents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    getMess: (schoolId?: string) =>
      request<{ messFacilities: HostelMess[] }>(`/api/hostel/mess${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getMenus: (params?: { schoolId?: string; messId?: string; dayOfWeek?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.messId) q.append('messId', params.messId);
      if (params?.dayOfWeek) q.append('dayOfWeek', params.dayOfWeek);
      return request<{ menus: HostelMenu[] }>(`/api/hostel/menus?${q.toString()}`);
    },

    createMenu: (data: Partial<HostelMenu> & { schoolId?: string }) =>
      request<{ menu: HostelMenu; message: string }>('/api/hostel/menus', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getMaintenance: (params?: { schoolId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.status) q.append('status', params.status);
      return request<{ tickets: HostelMaintenance[] }>(`/api/hostel/maintenance?${q.toString()}`);
    },

    createMaintenance: (data: Partial<HostelMaintenance> & { schoolId?: string }) =>
      request<{ ticket: HostelMaintenance; message: string }>('/api/hostel/maintenance', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    updateMaintenance: (id: string, data: Partial<HostelMaintenance> & { schoolId?: string }) =>
      request<{ ticket: HostelMaintenance; message: string }>(`/api/hostel/maintenance/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    getNotices: (schoolId?: string) =>
      request<{ notices: HostelNotice[] }>(`/api/hostel/notices${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createNotice: (data: Partial<HostelNotice> & { schoolId?: string }) =>
      request<{ notice: HostelNotice; message: string }>('/api/hostel/notices', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getStudentProfile: (studentId: string, schoolId?: string) =>
      request<{
        currentAllocation: HostelAllocation | null;
        roommates: any[];
        allocationHistory: HostelAllocationHistory[];
        attendanceHistory: any[];
        recentLeaves: HostelLeave[];
        recentOutings: HostelOuting[];
        incidents: HostelIncident[];
        hostelFees: any[];
      }>(`/api/hostel/students/${studentId}/profile${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getOccupancyReport: (schoolId?: string) =>
      request<{ occupancyReport: any[] }>(`/api/hostel/reports/occupancy${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`)
  },

  // ==========================================
  // PHASE 12: HR, PAYROLL & STAFF MANAGEMENT
  // ==========================================
  payroll: {
    getDashboardStats: (schoolId?: string) =>
      request<PayrollDashboardStats>(`/api/payroll/dashboard${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getPayHeads: (schoolId?: string) =>
      request<{ payHeads: PayHead[] }>(`/api/payroll/heads${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createPayHead: (data: Partial<PayHead> & { schoolId?: string; calculationType?: string; defaultValue?: number; isTaxable?: boolean; isStatutory?: boolean; sortOrder?: number }) =>
      request<{ payHead: PayHead; message: string }>('/api/payroll/heads', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getStructures: (schoolId?: string) =>
      request<{ structures: SalaryStructure[] }>(`/api/payroll/structures${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createStructure: (data: Partial<SalaryStructure> & { schoolId?: string; baseGrossMonthly?: number }) =>
      request<{ structure: SalaryStructure; message: string }>('/api/payroll/structures', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getAssignments: (params?: { schoolId?: string; search?: string; departmentId?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.search) q.append('search', params.search);
      if (params?.departmentId) q.append('departmentId', params.departmentId);
      return request<{ assignments: EmployeeSalaryAssignment[] }>(`/api/payroll/assignments?${q.toString()}`);
    },

    saveAssignment: (data: {
      schoolId?: string;
      employeeId: string;
      structureId?: string;
      effectiveFrom?: string;
      grossMonthly: number;
      basicPay?: number;
      bankName?: string;
      bankAccountNumber?: string;
      bankIfsc?: string;
      panNumber?: string;
      pfUanNumber?: string;
      esiNumber?: string;
      paymentMode?: string;
      notes?: string;
    }) =>
      request<{ assignment: any; message: string }>('/api/payroll/assignments', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getLeaveTypes: (schoolId?: string) =>
      request<{ leaveTypes: LeaveType[] }>(`/api/payroll/leaves/types${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getLeaveBalances: (params?: { schoolId?: string; employeeId?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.employeeId) q.append('employeeId', params.employeeId);
      return request<{ balances: LeaveBalance[] }>(`/api/payroll/leaves/balances?${q.toString()}`);
    },

    getLeaveApplications: (params?: { schoolId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.status) q.append('status', params.status);
      return request<{ applications: LeaveApplication[] }>(`/api/payroll/leaves/applications?${q.toString()}`);
    },

    applyLeave: (data: {
      schoolId?: string;
      employeeId: string;
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      totalDays: number;
      reason: string;
      substituteEmployeeId?: string;
    }) =>
      request<{ application: LeaveApplication; message: string }>('/api/payroll/leaves/apply', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    reviewLeave: (id: string, data: { status: 'APPROVED' | 'REJECTED'; reviewerComments?: string; schoolId?: string }) =>
      request<{ application: LeaveApplication; message: string }>(`/api/payroll/leaves/${id}/review`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getLoans: (schoolId?: string) =>
      request<{ loans: StaffLoan[] }>(`/api/payroll/loans${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    sanctionLoan: (data: {
      schoolId?: string;
      employeeId: string;
      loanType?: string;
      principalAmount: number;
      disbursementDate?: string;
      repaymentMonths: number;
      reason?: string;
    }) =>
      request<{ loan: StaffLoan; message: string }>('/api/payroll/loans', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getCycles: (schoolId?: string) =>
      request<{ cycles: PayrollCycle[] }>(`/api/payroll/cycles${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    generateCycle: (data: { schoolId?: string; month: number; year: number; workingDays?: number }) =>
      request<{ cycle: PayrollCycle; message: string }>('/api/payroll/cycles/generate', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getCycleDetails: (id: string, schoolId?: string) =>
      request<{ cycle: PayrollCycle; items: PayrollItem[] }>(`/api/payroll/cycles/${id}${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    approveCycle: (id: string, schoolId?: string) =>
      request<{ cycle: PayrollCycle; message: string }>(`/api/payroll/cycles/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ schoolId })
      }),

    disburseCycle: (id: string, data: { paymentMode?: string; referenceNumber?: string; notes?: string; schoolId?: string }) =>
      request<{ cycle: PayrollCycle; expenseRecordId: string; message: string }>(`/api/payroll/cycles/${id}/disburse`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getPayslip: (itemId: string, schoolId?: string) =>
      request<{ payslip: PayrollItem & { cycle_title: string; school_name: string; school_address?: string; school_logo?: string }; netPayInWords: string }>(
        `/api/payroll/payslips/${itemId}${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`
      ),

    getAppraisals: (schoolId?: string) =>
      request<{ appraisals: EmployeeAppraisal[] }>(`/api/payroll/appraisals${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createAppraisal: (data: {
      schoolId?: string;
      employeeId: string;
      sessionId?: string;
      reviewPeriod: string;
      rating: number;
      pedagogyScore?: number;
      punctualityScore?: number;
      disciplineScore?: number;
      strengths?: string;
      areasForImprovement?: string;
      recommendedAction?: string;
      incrementPercentage?: number;
    }) =>
      request<{ appraisal: EmployeeAppraisal; message: string }>('/api/payroll/appraisals', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getLifecycleEvents: (schoolId?: string) =>
      request<{ events: EmployeeLifecycleEvent[] }>(`/api/payroll/lifecycle${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    recordLifecycleEvent: (data: {
      schoolId?: string;
      employeeId: string;
      eventType: string;
      eventDate?: string;
      title: string;
      details?: string;
      gratuityAmount?: number;
      leaveEncashment?: number;
      pendingDues?: number;
      settlementStatus?: string;
    }) =>
      request<{ event: EmployeeLifecycleEvent; message: string }>('/api/payroll/lifecycle', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getStatutoryReports: (params?: { schoolId?: string; cycleId?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.cycleId) q.append('cycleId', params.cycleId);
      return request<{ registers: StatutoryRegisterRow[] }>(`/api/payroll/reports/statutory?${q.toString()}`);
    }
  },

  transport: {
    getDashboard: (schoolId?: string) =>
      request<TransportDashboardData>(`/api/transport/dashboard${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getVehicles: (params?: { schoolId?: string; status?: string; type?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.status) q.append('status', params.status);
      if (params?.type) q.append('type', params.type);
      if (params?.search) q.append('search', params.search);
      return request<{ vehicles: Vehicle[] }>(`/api/transport/vehicles?${q.toString()}`);
    },

    createVehicle: (data: Partial<Vehicle>) =>
      request<{ vehicle: Vehicle; message: string }>('/api/transport/vehicles', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    updateVehicle: (id: string, data: Partial<Vehicle>) =>
      request<{ vehicle: Vehicle; message: string }>(`/api/transport/vehicles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    getVehicleDocuments: (vehicleId: string, schoolId?: string) =>
      request<{ documents: VehicleDocument[] }>(`/api/transport/vehicles/${vehicleId}/documents${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    addVehicleDocument: (vehicleId: string, data: any) =>
      request<{ document: VehicleDocument; message: string }>(`/api/transport/vehicles/${vehicleId}/documents`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getExpiringDocuments: (schoolId?: string) =>
      request<{ expiringDocuments: VehicleDocument[] }>(`/api/transport/documents/expiring${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getDrivers: (schoolId?: string) =>
      request<{ drivers: TransportDriver[] }>(`/api/transport/drivers${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createDriver: (data: any) =>
      request<{ driver: TransportDriver; message: string }>('/api/transport/drivers', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getStaffAssignments: (schoolId?: string) =>
      request<{ assignments: TransportStaffAssignment[] }>(`/api/transport/staff/assignments${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getRoutes: (schoolId?: string) =>
      request<{ routes: TransportRoute[] }>(`/api/transport/routes${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createRoute: (data: any) =>
      request<{ route: TransportRoute; message: string }>('/api/transport/routes', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    updateRoute: (id: string, data: any) =>
      request<{ route: TransportRoute; message: string }>(`/api/transport/routes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    getRouteStops: (routeId: string, schoolId?: string) =>
      request<{ stops: TransportRouteStop[] }>(`/api/transport/routes/${routeId}/stops${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    addRouteStop: (routeId: string, data: any) =>
      request<{ stop: TransportRouteStop; message: string }>(`/api/transport/routes/${routeId}/stops`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getEnrollments: (params?: { schoolId?: string; routeId?: string; status?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.routeId) q.append('routeId', params.routeId);
      if (params?.status) q.append('status', params.status);
      if (params?.search) q.append('search', params.search);
      return request<{ enrollments: StudentTransportEnrollment[] }>(`/api/transport/enrollments?${q.toString()}`);
    },

    createEnrollment: (data: any) =>
      request<{ enrollment: StudentTransportEnrollment; message: string }>('/api/transport/enrollments', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getTrips: (params?: { schoolId?: string; date?: string; routeId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.date) q.append('date', params.date);
      if (params?.routeId) q.append('routeId', params.routeId);
      if (params?.status) q.append('status', params.status);
      return request<{ trips: TransportTrip[] }>(`/api/transport/trips?${q.toString()}`);
    },

    createTrip: (data: any) =>
      request<{ trip: TransportTrip; message: string }>('/api/transport/trips', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    updateTripStatus: (tripId: string, data: { status: string; odometerEnd?: number; notes?: string }) =>
      request<{ trip: TransportTrip; message: string }>(`/api/transport/trips/${tripId}/status`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    getTripManifest: (tripId: string, schoolId?: string) =>
      request<{ trip: TransportTrip; students: any[] }>(`/api/transport/trips/${tripId}/manifest${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    markAttendance: (tripId: string, data: any) =>
      request<{ record: TransportAttendanceRecord; message: string }>(`/api/transport/trips/${tripId}/attendance`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getMaintenance: (params?: { schoolId?: string; vehicleId?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.vehicleId) q.append('vehicleId', params.vehicleId);
      return request<{ maintenanceRecords: VehicleMaintenance[] }>(`/api/transport/maintenance?${q.toString()}`);
    },

    createMaintenance: (data: any) =>
      request<{ maintenance: VehicleMaintenance; expenseRecordId?: string; message: string }>('/api/transport/maintenance', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getFuel: (params?: { schoolId?: string; vehicleId?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.vehicleId) q.append('vehicleId', params.vehicleId);
      return request<{ fuelRecords: VehicleFuelRecord[] }>(`/api/transport/fuel?${q.toString()}`);
    },

    createFuel: (data: any) =>
      request<{ fuelRecord: VehicleFuelRecord; expenseRecordId?: string; message: string }>('/api/transport/fuel', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getIncidents: (schoolId?: string) =>
      request<{ incidents: TransportIncident[] }>(`/api/transport/incidents${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createIncident: (data: any) =>
      request<{ incident: TransportIncident; message: string }>('/api/transport/incidents', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    updateIncident: (id: string, data: any) =>
      request<{ incident: TransportIncident; message: string }>(`/api/transport/incidents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    getNotices: (schoolId?: string) =>
      request<{ notices: TransportNotice[] }>(`/api/transport/notices${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createNotice: (data: any) =>
      request<{ notice: TransportNotice; message: string }>('/api/transport/notices', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getSettings: (schoolId?: string) =>
      request<{ settings: TransportSettings | null }>(`/api/transport/settings${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    updateSettings: (data: any) =>
      request<{ settings: TransportSettings; message: string }>('/api/transport/settings', {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    getMyTransport: (params?: { schoolId?: string; studentId?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.studentId) q.append('studentId', params.studentId);
      return request<{ transport: any; todayAttendance: any[]; notices: TransportNotice[] }>(`/api/transport/portal/my-transport?${q.toString()}`);
    },

    getReportsSummary: (schoolId?: string) =>
      request<{ vehicleUtilization: any[]; financials: any; attendanceReliability: any }>(`/api/transport/reports/summary${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getFeesSummary: (schoolId?: string) =>
      request<{ summary: any; routeBreakdown: any[]; studentFees: any[] }>(`/api/transport/fees/summary${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    syncFees: (data: { schoolId?: string; sessionId?: string }) =>
      request<{ message: string; syncedCount: number }>('/api/transport/fees/sync-ledger', {
        method: 'POST',
        body: JSON.stringify(data)
      })
  },

  inventory: {
    getDashboard: (schoolId?: string) =>
      request<InventoryDashboardData>(`/api/inventory/dashboard${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getCategories: (schoolId?: string) =>
      request<{ categories: InventoryCategory[] }>(`/api/inventory/categories${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createCategory: (data: any) =>
      request<{ category: InventoryCategory; message: string }>('/api/inventory/categories', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getStores: (schoolId?: string) =>
      request<{ stores: InventoryStore[] }>(`/api/inventory/stores${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createStore: (data: any) =>
      request<{ store: InventoryStore; message: string }>('/api/inventory/stores', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getItems: (params?: { schoolId?: string; categoryId?: string; storeId?: string; status?: string; search?: string; lowStock?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.categoryId) q.append('categoryId', params.categoryId);
      if (params?.storeId) q.append('storeId', params.storeId);
      if (params?.status) q.append('status', params.status);
      if (params?.search) q.append('search', params.search);
      if (params?.lowStock) q.append('lowStock', params.lowStock);
      return request<{ items: InventoryItem[] }>(`/api/inventory/items?${q.toString()}`);
    },

    createItem: (data: any) =>
      request<{ item: InventoryItem; message: string }>('/api/inventory/items', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getTransactions: (params?: { schoolId?: string; itemId?: string; storeId?: string; transactionType?: string; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.itemId) q.append('itemId', params.itemId);
      if (params?.storeId) q.append('storeId', params.storeId);
      if (params?.transactionType) q.append('transactionType', params.transactionType);
      if (params?.limit) q.append('limit', params.limit.toString());
      return request<{ transactions: StockTransaction[] }>(`/api/inventory/transactions?${q.toString()}`);
    },

    createTransaction: (data: any) =>
      request<{ transaction: StockTransaction; currentStock: number; message: string }>('/api/inventory/transactions', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getTransfers: (schoolId?: string) =>
      request<{ transfers: StockTransfer[] }>(`/api/inventory/transfers${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createTransfer: (data: any) =>
      request<{ transfer: StockTransfer; message: string }>('/api/inventory/transfers', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getCounts: (schoolId?: string) =>
      request<{ counts: StockCount[] }>(`/api/inventory/counts${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createCount: (data: any) =>
      request<{ count: StockCount; message: string }>('/api/inventory/counts', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getAssets: (params?: { schoolId?: string; categoryId?: string; status?: string; condition?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.categoryId) q.append('categoryId', params.categoryId);
      if (params?.status) q.append('status', params.status);
      if (params?.condition) q.append('condition', params.condition);
      if (params?.search) q.append('search', params.search);
      return request<{ assets: Asset[] }>(`/api/inventory/assets?${q.toString()}`);
    },

    createAsset: (data: any) =>
      request<{ asset: Asset; message: string }>('/api/inventory/assets', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    assignAsset: (assetId: string, data: any) =>
      request<{ message: string }>(`/api/inventory/assets/${assetId}/assign`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    returnAsset: (assetId: string, data: any) =>
      request<{ message: string }>(`/api/inventory/assets/${assetId}/return`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    createAssetMaintenance: (assetId: string, data: any) =>
      request<{ maintenance: AssetMaintenance; message: string }>(`/api/inventory/assets/${assetId}/maintenance`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    transferAsset: (assetId: string, data: any) =>
      request<{ message: string }>(`/api/inventory/assets/${assetId}/transfer`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    disposeAsset: (assetId: string, data: any) =>
      request<{ message: string }>(`/api/inventory/assets/${assetId}/dispose`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getDisposals: (schoolId?: string) =>
      request<{ disposals: any[] }>(`/api/inventory/disposals${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getVendors: (schoolId?: string) =>
      request<{ vendors: Vendor[] }>(`/api/inventory/vendors${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createVendor: (data: any) =>
      request<{ vendor: Vendor; message: string }>('/api/inventory/vendors', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getRequests: (schoolId?: string) =>
      request<{ requests: PurchaseRequest[] }>(`/api/inventory/requests${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createRequest: (data: any) =>
      request<{ request: PurchaseRequest; message: string }>('/api/inventory/requests', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    reviewRequest: (requestId: string, data: any) =>
      request<{ request: PurchaseRequest; message: string }>(`/api/inventory/requests/${requestId}/review`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    getOrders: (schoolId?: string) =>
      request<{ orders: PurchaseOrder[] }>(`/api/inventory/orders${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createOrder: (data: any) =>
      request<{ order: PurchaseOrder; message: string }>('/api/inventory/orders', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getReceipts: (schoolId?: string) =>
      request<{ receipts: GoodsReceipt[] }>(`/api/inventory/receipts${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createReceipt: (data: any) =>
      request<{ receipt: GoodsReceipt; message: string }>('/api/inventory/receipts', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getReportsSummary: (schoolId?: string) =>
      request<{ stockByCategory: any[]; assetsByCategory: any[]; financials: any }>(`/api/inventory/reports/summary${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getNotifications: (schoolId?: string) =>
      request<{ notifications: any[] }>(`/api/inventory/notifications${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    markNotificationRead: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/inventory/notifications/${id}/read`, {
        method: 'PATCH'
      }),

    markAllNotificationsRead: (schoolId: string) =>
      request<{ success: boolean; message: string }>('/api/inventory/notifications/mark-all-read', {
        method: 'POST',
        body: JSON.stringify({ schoolId })
      }),

    getExpiringWarranties: (schoolId?: string, days = 90) =>
      request<{ assets: Asset[] }>(`/api/inventory/assets/warranties-expiring?days=${days}${schoolId ? `&schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getAssetHistory: (assetId: string, schoolId?: string) =>
      request<{ history: any[] }>(`/api/inventory/assets/${assetId}/history${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getEmployeeAssets: (employeeId: string, schoolId?: string) =>
      request<{ assets: Asset[] }>(`/api/inventory/assets/employee/${employeeId}${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    importItems: (data: { schoolId?: string; items: any[] }) =>
      request<{ success: boolean; importedCount: number; message: string }>('/api/inventory/items/import', {
        method: 'POST',
        body: JSON.stringify(data)
      })
  },

  // Phase 7: Examination & Result Management
  exams: {
    getStats: (schoolId?: string) =>
      request<{ stats: any }>(`/api/exams/stats${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getTypes: (schoolId?: string) =>
      request<{ types: any[] }>(`/api/exams/types${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createType: (data: any) =>
      request<{ success: boolean; id: string; message: string }>('/api/exams/types', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getGradingScales: (schoolId?: string) =>
      request<{ scales: any[] }>(`/api/exams/grading-scales${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    list: (params?: { schoolId?: string; sessionId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.set('schoolId', params.schoolId);
      if (params?.sessionId) q.set('sessionId', params.sessionId);
      if (params?.status) q.set('status', params.status);
      const qs = q.toString();
      return request<{ examinations: any[] }>(`/api/exams${qs ? `?${qs}` : ''}`);
    },

    create: (data: any) =>
      request<{ success: boolean; id: string; message: string }>('/api/exams', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    get: (id: string) =>
      request<{ examination: any }>(`/api/exams/${id}`),

    togglePublishTimetable: (id: string, publish: boolean) =>
      request<{ success: boolean; timetablePublished: boolean }>(`/api/exams/${id}/publish-timetable`, {
        method: 'PATCH',
        body: JSON.stringify({ publish })
      }),

    togglePublishResults: (id: string, publish: boolean) =>
      request<{ success: boolean; resultsPublished: boolean }>(`/api/exams/${id}/publish-results`, {
        method: 'PATCH',
        body: JSON.stringify({ publish })
      }),

    getSchedules: (id: string, classId?: string) =>
      request<{ schedules: any[] }>(`/api/exams/${id}/schedules${classId ? `?classId=${encodeURIComponent(classId)}` : ''}`),

    addSchedule: (id: string, data: any) =>
      request<{ success: boolean; id: string; message: string }>(`/api/exams/${id}/schedules`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    deleteSchedule: (id: string, schedId: string) =>
      request<{ success: boolean; message: string }>(`/api/exams/${id}/schedules/${schedId}`, {
        method: 'DELETE'
      }),

    getMarksRoster: (id: string, params: { scheduleId?: string; classId?: string; sectionId?: string; subjectId?: string }) => {
      const q = new URLSearchParams();
      if (params.scheduleId) q.set('scheduleId', params.scheduleId);
      if (params.classId) q.set('classId', params.classId);
      if (params.sectionId) q.set('sectionId', params.sectionId);
      if (params.subjectId) q.set('subjectId', params.subjectId);
      return request<{ schedule: any; roster: any[]; submissionStatus: string }>(`/api/exams/${id}/marks?${q.toString()}`);
    },

    saveMarks: (id: string, data: { scheduleId: string; classId: string; sectionId?: string; subjectId: string; marks: any[] }) =>
      request<{ success: boolean; count: number; message: string }>(`/api/exams/${id}/marks`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    submitMarks: (id: string, scheduleId: string) =>
      request<{ success: boolean; message: string }>(`/api/exams/${id}/submissions/submit`, {
        method: 'POST',
        body: JSON.stringify({ scheduleId })
      }),

    approveMarks: (id: string, scheduleId: string, remarks?: string) =>
      request<{ success: boolean; message: string }>(`/api/exams/${id}/submissions/approve`, {
        method: 'POST',
        body: JSON.stringify({ scheduleId, remarks })
      }),

    calculateResults: (id: string, classId?: string) =>
      request<{ success: boolean; count: number; message: string }>(`/api/exams/${id}/calculate-results`, {
        method: 'POST',
        body: JSON.stringify({ classId })
      }),

    getResults: (id: string, params?: { classId?: string; sectionId?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.classId) q.set('classId', params.classId);
      if (params?.sectionId) q.set('sectionId', params.sectionId);
      if (params?.search) q.set('search', params.search);
      const qs = q.toString();
      return request<{ results: any[] }>(`/api/exams/${id}/results${qs ? `?${qs}` : ''}`);
    },

    getReportCard: (id: string, studentId: string) =>
      request<{
        school: any;
        exam: any;
        student: any;
        overallResult: any;
        subjects: any[];
      }>(`/api/exams/${id}/results/${studentId}/report-card`)
  },

  // Phase 14: Communication, Notification & Parent Engagement System
  communication: {
    getDashboard: (schoolId?: string) =>
      request<{ metrics: any; recentAnnouncements: any[]; recentConversations: any[] }>(`/api/communication/dashboard${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getNotifications: (params?: { schoolId?: string; category?: string; unreadOnly?: boolean }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.set('schoolId', params.schoolId);
      if (params?.category) q.set('category', params.category);
      if (params?.unreadOnly) q.set('unreadOnly', 'true');
      const qs = q.toString();
      return request<{ notifications: any[]; unreadCount: number }>(`/api/communication/notifications${qs ? `?${qs}` : ''}`);
    },

    getUnreadNotificationCount: () =>
      request<{ unreadCount: number }>('/api/communication/notifications/unread-count'),

    markNotificationRead: (id: string) =>
      request<{ success: boolean }>(`/api/communication/notifications/${id}/read`, {
        method: 'PATCH'
      }),

    markAllNotificationsRead: () =>
      request<{ success: boolean; message: string }>('/api/communication/notifications/mark-all-read', {
        method: 'POST'
      }),

    createNotification: (data: any) =>
      request<{ success: boolean; id: string; message: string }>('/api/communication/notifications', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getAnnouncements: (params?: { schoolId?: string; audience?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.set('schoolId', params.schoolId);
      if (params?.audience) q.set('audience', params.audience);
      if (params?.status) q.set('status', params.status);
      const qs = q.toString();
      return request<{ announcements: any[] }>(`/api/communication/announcements${qs ? `?${qs}` : ''}`);
    },

    createAnnouncement: (data: any) =>
      request<{ success: boolean; id: string; message: string }>('/api/communication/announcements', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    deleteAnnouncement: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/communication/announcements/${id}`, {
        method: 'DELETE'
      }),

    getCirculars: (schoolId?: string) =>
      request<{ circulars: any[] }>(`/api/communication/circulars${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createCircular: (data: any) =>
      request<{ success: boolean; id: string; message: string }>('/api/communication/circulars', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    acknowledgeCircular: (id: string, remarks?: string) =>
      request<{ success: boolean; message: string }>(`/api/communication/circulars/${id}/acknowledge`, {
        method: 'POST',
        body: JSON.stringify({ remarks })
      }),

    getNotices: (params?: { schoolId?: string; category?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.set('schoolId', params.schoolId);
      if (params?.category) q.set('category', params.category);
      const qs = q.toString();
      return request<{ notices: any[] }>(`/api/communication/notices${qs ? `?${qs}` : ''}`);
    },

    createNotice: (data: any) =>
      request<{ success: boolean; id: string; message: string }>('/api/communication/notices', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    deleteNotice: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/communication/notices/${id}`, {
        method: 'DELETE'
      }),

    getConversations: (schoolId?: string) =>
      request<{ conversations: any[] }>(`/api/communication/conversations${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createConversation: (data: any) =>
      request<{ success: boolean; conversationId: string; message: string }>('/api/communication/conversations', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getMessages: (conversationId: string) =>
      request<{ messages: any[] }>(`/api/communication/conversations/${conversationId}/messages`),

    sendMessage: (conversationId: string, data: { message: string; attachmentUrl?: string; attachmentName?: string }) =>
      request<{ success: boolean; id: string; message: string }>(`/api/communication/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getScheduledMessages: (schoolId?: string) =>
      request<{ scheduledMessages: any[] }>(`/api/communication/scheduled${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    scheduleMessage: (data: any) =>
      request<{ success: boolean; id: string; message: string }>('/api/communication/scheduled', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    cancelScheduledMessage: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/communication/scheduled/${id}`, {
        method: 'DELETE'
      }),

    getTemplates: (schoolId?: string) =>
      request<{ templates: any[] }>(`/api/communication/templates${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getPolls: (schoolId?: string) =>
      request<{ polls: any[] }>(`/api/communication/polls${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    votePoll: (pollId: string, optionId: string) =>
      request<{ success: boolean; message: string }>(`/api/communication/polls/${pollId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ optionId })
      }),

    getFeedback: (schoolId?: string) =>
      request<{ feedback: any[] }>(`/api/communication/feedback${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    submitFeedback: (data: any) =>
      request<{ success: boolean; id: string; message: string }>('/api/communication/feedback', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getGrievances: (schoolId?: string) =>
      request<{ grievances: any[] }>(`/api/communication/grievances${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    submitGrievance: (data: any) =>
      request<{ success: boolean; id: string; ticketNumber: string; message: string }>('/api/communication/grievances', {
        method: 'POST',
        body: JSON.stringify(data)
      })
  },

  administration: {
    getDashboard: (schoolId?: string) =>
      request<any>(`/api/administration/dashboard${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getAggregatedCalendar: (params?: { schoolId?: string; start?: string; end?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.start) q.append('start', params.start);
      if (params?.end) q.append('end', params.end);
      return request<{ items: any[] }>(`/api/administration/calendar/aggregated?${q.toString()}`);
    },

    getEvents: (params?: { schoolId?: string; eventType?: string; status?: string; audience?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.eventType) q.append('eventType', params.eventType);
      if (params?.status) q.append('status', params.status);
      if (params?.audience) q.append('audience', params.audience);
      return request<{ events: any[] }>(`/api/administration/events?${q.toString()}`);
    },

    createEvent: (data: any) =>
      request<{ success: boolean; id: string; message: string }>('/api/administration/events', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    updateEvent: (id: string, data: any) =>
      request<{ success: boolean; message: string }>(`/api/administration/events/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    cancelEvent: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/administration/events/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      }),

    getEventRegistrations: (eventId: string) =>
      request<{ registrations: any[] }>(`/api/administration/events/${encodeURIComponent(eventId)}/registrations`),

    registerForEvent: (eventId: string, data: any) =>
      request<{ success: boolean; status: string; message: string }>(`/api/administration/events/${encodeURIComponent(eventId)}/registrations`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    markEventAttendance: (eventId: string, data: { registrationId: string; attendanceStatus: string; remarks?: string }) =>
      request<{ success: boolean; message: string }>(`/api/administration/events/${encodeURIComponent(eventId)}/attendance`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getEventTasks: (eventId: string) =>
      request<{ tasks: any[] }>(`/api/administration/events/${encodeURIComponent(eventId)}/tasks`),

    createEventTask: (eventId: string, data: any) =>
      request<{ success: boolean; id: string; message: string }>(`/api/administration/events/${encodeURIComponent(eventId)}/tasks`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    updateEventTaskStatus: (eventId: string, taskId: string, status: string) =>
      request<{ success: boolean; message: string }>(`/api/administration/events/${encodeURIComponent(eventId)}/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }),

    getVenues: (schoolId?: string) =>
      request<{ venues: any[] }>(`/api/administration/venues${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createVenue: (data: any) =>
      request<{ success: boolean; id: string; message: string }>('/api/administration/venues', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getVenueBookings: (params?: { schoolId?: string; venueId?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.venueId) q.append('venueId', params.venueId);
      return request<{ bookings: any[] }>(`/api/administration/venues/bookings?${q.toString()}`);
    },

    bookVenue: (data: any) =>
      request<{ success: boolean; id: string; message: string }>('/api/administration/venues/bookings', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getHolidays: (schoolId?: string) =>
      request<{ holidays: any[] }>(`/api/administration/holidays${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createHoliday: (data: any) =>
      request<{ success: boolean; id: string; message: string }>('/api/administration/holidays', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    deleteHoliday: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/administration/holidays/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      }),

    getTerms: (schoolId?: string) =>
      request<{ terms: any[] }>(`/api/administration/terms${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    createTerm: (data: any) =>
      request<{ success: boolean; id: string; message: string }>('/api/administration/terms', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getMeetings: (params?: { schoolId?: string; meetingType?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.meetingType) q.append('meetingType', params.meetingType);
      if (params?.status) q.append('status', params.status);
      return request<{ meetings: any[] }>(`/api/administration/meetings?${q.toString()}`);
    },

    createMeeting: (data: any) =>
      request<{ success: boolean; id: string; message: string }>('/api/administration/meetings', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getMeetingDetails: (id: string) =>
      request<any>(`/api/administration/meetings/${encodeURIComponent(id)}`),

    rsvpMeeting: (id: string, rsvpStatus: string, rsvpNote?: string) =>
      request<{ success: boolean; message: string }>(`/api/administration/meetings/${encodeURIComponent(id)}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ rsvpStatus, rsvpNote })
      }),

    recordMeetingMinutes: (id: string, data: any) =>
      request<{ success: boolean; message: string }>(`/api/administration/meetings/${encodeURIComponent(id)}/minutes`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getActionItems: (params?: { schoolId?: string; status?: string; assignedToId?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.status) q.append('status', params.status);
      if (params?.assignedToId) q.append('assignedToId', params.assignedToId);
      return request<{ actionItems: any[] }>(`/api/administration/action-items?${q.toString()}`);
    },

    createActionItem: (data: any) =>
      request<{ success: boolean; id: string; message: string }>('/api/administration/action-items', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    updateActionItem: (id: string, data: any) =>
      request<{ success: boolean; message: string }>(`/api/administration/action-items/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),

    getAppointments: (params?: { schoolId?: string; status?: string; staffId?: string; date?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.status) q.append('status', params.status);
      if (params?.staffId) q.append('staffId', params.staffId);
      if (params?.date) q.append('date', params.date);
      return request<{ appointments: any[] }>(`/api/administration/appointments?${q.toString()}`);
    },

    createAppointment: (data: any) =>
      request<{ success: boolean; id: string; message: string }>('/api/administration/appointments', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    updateAppointment: (id: string, data: any) =>
      request<{ success: boolean; message: string }>(`/api/administration/appointments/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),

    getStaffAvailability: (schoolId?: string) =>
      request<{ availability: any[] }>(`/api/administration/staff-availability${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getVisitors: (params?: { schoolId?: string; search?: string; visitorType?: string; securityStatus?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.search) q.append('search', params.search);
      if (params?.visitorType) q.append('visitorType', params.visitorType);
      if (params?.securityStatus) q.append('securityStatus', params.securityStatus);
      return request<{ visitors: any[] }>(`/api/administration/visitors?${q.toString()}`);
    },

    createVisitor: (data: any) =>
      request<{ success: boolean; id: string; visitorNumber: string; message: string }>('/api/administration/visitors', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    updateVisitorSecurityStatus: (id: string, data: { securityStatus: string; restrictionReason?: string }) =>
      request<{ success: boolean; message: string }>(`/api/administration/visitors/${encodeURIComponent(id)}/security-status`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),

    getInsideVisitors: (schoolId?: string) =>
      request<{ count: number; insideVisitors: any[] }>(`/api/administration/visitors/inside${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`),

    getVisitsLog: (params?: { schoolId?: string; date?: string; status?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.schoolId) q.append('schoolId', params.schoolId);
      if (params?.date) q.append('date', params.date);
      if (params?.status) q.append('status', params.status);
      if (params?.search) q.append('search', params.search);
      return request<{ visits: any[] }>(`/api/administration/visitors/visits?${q.toString()}`);
    },

    checkInVisitor: (data: any) =>
      request<{ success: boolean; visitId: string; passNumber: string; visitorName: string; message: string }>('/api/administration/visitors/check-in', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    checkOutVisitor: (data: { visitId?: string; passNumber?: string; remarks?: string }) =>
      request<{ success: boolean; message: string }>('/api/administration/visitors/check-out', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getReports: (schoolId?: string) =>
      request<any>(`/api/administration/reports${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`)
  }
};
