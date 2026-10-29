export interface School {
  id: string;
  code: string;
  name: string;
  affiliation_no?: string | null;
  board?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  logo_url?: string | null;
  established_year?: number | null;
  admission_prefix?: string;
  application_fee?: number | string;
  status: 'active' | 'inactive';
  classes_count?: number;
  sections_count?: number;
  sessions_count?: number;
  users_count?: number;
  created_at: string;
  updated_at: string;
}

export interface AcademicSession {
  id: string;
  school_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  status: 'active' | 'completed' | 'upcoming' | 'archived';
  school_name?: string;
  school_code?: string;
  classes_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string | null;
  is_system: boolean;
  permissions_count?: number;
  users_count?: number;
  created_at: string;
}

export interface Permission {
  id: string;
  module: string;
  name: string;
  description?: string | null;
}

export interface User {
  id: string;
  school_id: string | null;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  role_id: string;
  status: 'active' | 'inactive' | 'suspended';
  last_login_at?: string | null;
  role_name?: string;
  role_display_name?: string;
  school_name?: string | null;
  school_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CurrentUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatarUrl?: string | null;
  phone?: string;
  schoolId: string | null;
  schoolName?: string;
  schoolCode?: string;
  roleId: string;
  roleName: string;
  roleDisplayName: string;
  permissions: string[];
  school?: School | null;
}

export interface SectionItem {
  id: string;
  school_id: string;
  class_id: string;
  name: string;
  room_number?: string | null;
  capacity: number;
  class_teacher_name?: string | null;
  status: 'active' | 'inactive';
  class_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ClassItem {
  id: string;
  school_id: string;
  session_id: string;
  name: string;
  numeric_grade: number;
  stream: string;
  display_order: number;
  status: 'active' | 'inactive';
  school_name?: string;
  school_code?: string;
  session_name?: string;
  sections_count?: number;
  total_capacity?: number;
  sections?: SectionItem[];
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  school_id?: string | null;
  user_id?: string | null;
  user_name: string;
  user_role: string;
  action: string;
  module: string;
  record_id?: string | null;
  description: string;
  ip_address?: string | null;
  user_agent?: string | null;
  old_values?: string | null;
  new_values?: string | null;
  school_name?: string | null;
  school_code?: string | null;
  created_at: string;
}

export interface DashboardStats {
  isSuperAdminView: boolean;
  stats: {
    totalSchools: number;
    totalClasses: number;
    totalSections: number;
    totalUsers: number;
    totalStudentCapacity: number;
    totalStudents: number;
    activeStudents: number;
    inactiveStudents?: number;
    totalParents: number;
    totalStaff?: number;
    activeStaff?: number;
    teachingStaff?: number;
    nonTeachingStaff?: number;
  };
  schools: School[];
  streamBreakdown: {
    stream: string;
    class_count: number;
    section_count: number;
  }[];
  studentDemographics?: {
    totalMale: number;
    totalFemale: number;
    totalOther: number;
  };
  classEnrollment?: {
    class_name: string;
    student_count: number;
    capacity: number;
  }[];
  monthlyFeeTrends?: MonthlyFeeTrend[];
  attendanceOverview?: {
    todayPresent: number;
    todayAbsent: number;
    todayLate: number;
    todayHalfDay: number;
    todayLeave: number;
    todayTotal: number;
    todayRate: number;
    attendanceDate: string;
    isToday: boolean;
    criticalAttendanceCount: number;
    staffPresent: number;
    staffAbsent: number;
    staffLeave: number;
  };
  feeOverview?: {
    todayCollection: number;
    monthCollection: number;
    totalCollected: number;
    totalOutstanding: number;
    totalConcessions: number;
    overdueCount: number;
    overdueAmount: number;
  };
  admissionFunnel?: {
    submitted: number;
    underReview: number;
    entranceTest: number;
    interview: number;
    selected: number;
    admitted: number;
    total: number;
    conversionRate: number;
  };
  examOverview?: {
    upcomingExams: any[];
    recentPerformance: {
      totalResults: number;
      averagePercentage: number;
      passedCount: number;
      passPercentage: number;
    };
  };
  academicOverview?: {
    totalClasses: number;
    totalSections: number;
    totalSubjects: number;
    totalHomework: number;
    activeHomework: number;
    homeworkSubmissions: number;
  };
  modulesSummary?: {
    students: { total: number; active: number };
    attendance: { rate: number; present: number; absent: number };
    fees: { collected: number; outstanding: number; overdueCount: number };
    exams: { upcomingCount: number; passRate: number };
    academics: { classes: number; subjects: number; activeHomework: number };
    admissions: { total: number; pendingReview: number };
    communication: { noticesCount: number };
    transport: { vehiclesCount: number; routesCount: number; studentsCount: number };
    hostel: { roomsCount: number; totalBeds: number; occupiedBeds: number };
    library: { booksCount: number; issuedCount: number; overdueCount: number };
    inventory: { itemsCount: number; lowStockCount: number };
    hr: { totalStaff: number; teachingStaff: number; nonTeachingStaff: number };
  };
  attentionAlerts?: {
    id: string;
    severity: 'critical' | 'warning' | 'info' | 'success';
    module: string;
    title: string;
    description: string;
    count?: number;
    actionTab: string;
    actionLabel: string;
  }[];
  upcomingEvents?: any[];
  recentNotices?: any[];
  recentActivity: AuditLog[];
}

export interface MonthlyFeeTrend {
  month: string;
  monthFull: string;
  collected: number;
  target: number;
  transactions: number;
  rate: number;
}

export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'TRANSFERRED' | 'WITHDRAWN' | 'GRADUATED';
export type GenderType = 'Male' | 'Female' | 'Other';
export type DocVerificationStatus = 'Pending' | 'Verified' | 'Rejected';

export interface Student {
  id: string;
  admission_number: string;
  registration_number?: string | null;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  full_name?: string;
  date_of_birth: string;
  gender: GenderType;
  blood_group?: string | null;
  nationality: string;
  religion?: string | null;
  category: string;
  aadhaar_number?: string | null;
  profile_photo?: string | null;
  mobile_number?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pin_code?: string | null;
  admission_date: string;
  school_id: string;
  session_id: string;
  class_id: string;
  section_id: string;
  roll_number?: string | null;
  previous_school?: string | null;
  student_status: StudentStatus;
  remarks?: string | null;
  school_name?: string;
  school_code?: string;
  session_name?: string;
  class_name?: string;
  section_name?: string;
  primary_parent_name?: string | null;
  primary_parent_mobile?: string | null;
  primary_parent_relationship?: string | null;
  parents?: StudentParentRelation[];
  documents?: StudentDocument[];
  enrollments?: StudentEnrollment[];
  created_at: string;
  updated_at: string;
}

export interface Parent {
  id: string;
  school_id: string;
  name: string;
  relationship_type: string;
  mobile_number: string;
  alternate_mobile?: string | null;
  email?: string | null;
  occupation?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pin_code?: string | null;
  photo?: string | null;
  user_account_id?: string | null;
  school_name?: string;
  wards?: {
    student_id: string;
    student_name: string;
    admission_number: string;
    class_name: string;
    section_name: string;
    relationship: string;
    is_primary_guardian: boolean;
  }[];
  created_at: string;
  updated_at: string;
}

export interface StudentParentRelation {
  id: string;
  student_id: string;
  parent_id: string;
  relationship: string;
  is_primary_guardian: boolean;
  can_receive_notifications: boolean;
  can_access_portal: boolean;
  parent_name: string;
  parent_mobile: string;
  parent_alternate_mobile?: string | null;
  parent_email?: string | null;
  parent_occupation?: string | null;
  parent_address?: string | null;
}

export interface StudentDocument {
  id: string;
  student_id: string;
  document_type: string;
  file_name: string;
  file_size: number;
  file_data: string;
  mime_type?: string | null;
  uploaded_by: string;
  upload_date: string;
  verification_status: DocVerificationStatus;
  remarks?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
}

export interface StudentEnrollment {
  id: string;
  student_id: string;
  school_id: string;
  session_id: string;
  class_id: string;
  section_id: string;
  roll_number?: string | null;
  enrollment_date: string;
  status: string;
  remarks?: string | null;
  school_name?: string;
  session_name?: string;
  class_name?: string;
  section_name?: string;
  created_at: string;
}

export interface StudentPromotionPayload {
  student_id: string;
  action: 'PROMOTE' | 'RETAIN' | 'GRADUATED' | 'WITHDRAWN';
  target_session_id?: string;
  target_class_id?: string;
  target_section_id?: string;
  target_roll_number?: string;
}

// ==========================================
// PHASE 3: ADMISSION MANAGEMENT TYPES
// ==========================================

export type AdmissionType = 'NEW' | 'TRANSFER' | 'READMISSION';

export type AdmissionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'DOCUMENT_PENDING'
  | 'DOCUMENT_VERIFICATION'
  | 'TEST_SCHEDULED'
  | 'TEST_COMPLETED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_COMPLETED'
  | 'SELECTED'
  | 'WAITLISTED'
  | 'REJECTED'
  | 'APPROVED'
  | 'FEE_PENDING'
  | 'CONFIRMED'
  | 'CANCELLED';

export interface AdmissionDocument {
  id: string;
  application_id: string;
  document_type: string;
  file_name: string;
  file_size: number;
  file_data: string;
  mime_type?: string | null;
  uploaded_by: string;
  upload_date: string;
  verification_status: 'Pending' | 'Verified' | 'Rejected';
  remarks?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
}

export interface AdmissionTest {
  id: string;
  application_id: string;
  test_date: string;
  test_time?: string | null;
  venue?: string | null;
  subjects?: string | null;
  max_marks: number;
  marks_obtained?: number | null;
  test_status: 'Scheduled' | 'Attended' | 'Absent' | 'Passed' | 'Failed';
  remarks?: string | null;
  conducted_by?: string | null;
  created_at: string;
}

export interface AdmissionInterview {
  id: string;
  application_id: string;
  interview_date: string;
  interview_time?: string | null;
  interviewer_name?: string | null;
  interview_mode: 'In-person' | 'Online';
  status: 'Scheduled' | 'Completed' | 'Absent';
  recommendation: 'Pending' | 'Recommended' | 'Not Recommended' | 'On Hold';
  remarks?: string | null;
  created_at: string;
}

export interface AdmissionFee {
  id: string;
  application_id: string;
  fee_type: string;
  amount: number;
  payment_mode: string;
  transaction_ref?: string | null;
  payment_status: 'Pending' | 'Paid' | 'Waived';
  receipt_number?: string | null;
  payment_date?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface AdmissionTimeline {
  id: string;
  application_id: string;
  action: string;
  previous_status?: string | null;
  new_status?: string | null;
  remarks?: string | null;
  performed_by_name: string;
  created_at: string;
}

export interface AdmissionApplication {
  id: string;
  application_number: string;
  school_id: string;
  session_id: string;
  admission_type: AdmissionType;
  application_date: string;
  student_name: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  date_of_birth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  blood_group?: string | null;
  nationality: string;
  category: string;
  aadhaar_number?: string | null;
  religion?: string | null;
  address: string;
  city: string;
  district?: string | null;
  state: string;
  pin_code: string;
  previous_school?: string | null;
  previous_class?: string | null;
  applying_class_id: string;
  applying_section_id?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  guardian_name?: string | null;
  parent_mobile: string;
  alternate_mobile?: string | null;
  parent_email?: string | null;
  emergency_contact?: string | null;
  source_of_application: string;
  application_status: AdmissionStatus;
  remarks?: string | null;
  student_id?: string | null;
  enrolled_admission_number?: string | null;
  school_name?: string;
  school_code?: string;
  session_name?: string;
  applying_class_name?: string;
  applying_section_name?: string;
  documents?: AdmissionDocument[];
  tests?: AdmissionTest[];
  interviews?: AdmissionInterview[];
  fees?: AdmissionFee[];
  timeline?: AdmissionTimeline[];
  created_at: string;
  updated_at: string;
}

export interface AdmissionStats {
  total: number;
  draft: number;
  submitted: number;
  underReview: number;
  documentsPending: number;
  documentsVerification: number;
  testScheduled: number;
  testCompleted: number;
  interviewScheduled: number;
  interviewCompleted: number;
  selected: number;
  waitlisted: number;
  rejected: number;
  approved: number;
  feePending: number;
  confirmed: number;
  cancelled: number;
  byClass: { class_name: string; count: number }[];
  byType: { type: string; count: number }[];
}

export interface AdmissionSettings {
  id: string;
  school_id: string;
  application_prefix: string;
  application_fee: number;
  entrance_test_required: boolean;
  interview_required: boolean;
  online_admissions_open: boolean;
  instructions?: string | null;
}

// ==========================================
// PHASE 4: TEACHER & STAFF MANAGEMENT TYPES
// ==========================================

export type EmployeeType = 'Teaching' | 'Non-Teaching';

export type EmploymentStatus =
  | 'ACTIVE'
  | 'ON_PROBATION'
  | 'ON_LEAVE'
  | 'SUSPENDED'
  | 'RESIGNED'
  | 'TERMINATED'
  | 'RETIRED'
  | 'INACTIVE';

export interface Department {
  id: string;
  school_id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  employees_count?: number;
}

export interface Designation {
  id: string;
  school_id: string;
  department_id?: string | null;
  department_name?: string | null;
  name: string;
  code?: string | null;
  employee_type: EmployeeType;
  description?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  employees_count?: number;
}

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  code: string;
  type?: 'Theory' | 'Practical' | 'Both';
  description?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface EmployeeQualification {
  id: string;
  employee_id: string;
  qualification: string;
  specialization?: string | null;
  institution?: string | null;
  university_board?: string | null;
  passing_year?: number | null;
  percentage_grade?: string | null;
  certificate_document?: string | null;
  remarks?: string | null;
  created_at?: string;
}

export interface EmployeeExperience {
  id: string;
  employee_id: string;
  organization: string;
  designation: string;
  start_date?: string | null;
  end_date?: string | null;
  total_experience_months?: number | null;
  responsibilities?: string | null;
  experience_certificate?: string | null;
  created_at?: string;
}

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_type: string;
  file_name: string;
  file_size: number;
  file_data: string;
  mime_type?: string | null;
  uploaded_by: string;
  upload_date: string;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verified_by?: string | null;
  verification_date?: string | null;
  remarks?: string | null;
}

export interface EmployeeEmploymentHistory {
  id: string;
  employee_id: string;
  event_type: string;
  effective_date: string;
  previous_value?: string | null;
  new_value?: string | null;
  remarks?: string | null;
  changed_by_name?: string | null;
  created_at: string;
}

export interface TeacherProfile {
  id: string;
  employee_id: string;
  school_id: string;
  specialization?: string | null;
  highest_qualification?: string | null;
  teaching_experience_years: number;
  bio?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface TeacherSubjectAssignment {
  id: string;
  teacher_id: string;
  school_id: string;
  session_id: string;
  subject_id: string;
  class_id: string;
  section_id?: string | null;
  is_primary_teacher: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  subject_name?: string;
  subject_code?: string;
  class_name?: string;
  section_name?: string;
  teacher_name?: string;
  session_name?: string;
}

export interface ClassTeacherAssignment {
  id: string;
  school_id: string;
  session_id: string;
  class_id: string;
  section_id: string;
  teacher_id: string;
  academic_year?: string | null;
  status: 'active' | 'inactive';
  assigned_date: string;
  remarks?: string | null;
  created_at: string;
  teacher_name?: string;
  class_name?: string;
  section_name?: string;
  session_name?: string;
}

export interface Employee {
  id: string;
  employee_id_number: string;
  user_id?: string | null;
  school_id: string;
  employee_type: EmployeeType;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  profile_photo?: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  date_of_birth: string;
  mobile_number: string;
  alternate_mobile?: string | null;
  email?: string | null;
  official_email?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pin_code?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  emergency_contact_relationship?: string | null;
  department_id?: string | null;
  designation_id?: string | null;
  date_of_joining: string;
  employment_status: EmploymentStatus;
  qualification?: string | null;
  specialization?: string | null;
  experience_years: number;
  previous_employer?: string | null;
  blood_group?: string | null;
  remarks?: string | null;
  created_at: string;
  updated_at: string;
  school_name?: string;
  school_code?: string;
  department_name?: string;
  designation_name?: string;
  user_username?: string;
  user_role?: string;
  qualifications?: EmployeeQualification[];
  experience?: EmployeeExperience[];
  documents?: EmployeeDocument[];
  history?: EmployeeEmploymentHistory[];
  teacher_profile?: TeacherProfile | null;
  subject_assignments?: TeacherSubjectAssignment[];
  class_teacher_assignments?: ClassTeacherAssignment[];
}

export interface StaffStats {
  total: number;
  teaching: number;
  nonTeaching: number;
  active: number;
  onProbation: number;
  onLeave: number;
  suspended: number;
  resigned: number;
  terminated: number;
  retired: number;
  departmentsCount: number;
  newJoiningsThisYear: number;
  byDepartment: { department_name: string; count: number }[];
  byType: { type: string; count: number }[];
}

// ==========================================
// Phase 5: Attendance Management Types
// ==========================================

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';

export type StaffAttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'ON_LEAVE'
  | 'WEEKLY_OFF'
  | 'HOLIDAY';

export type AttendanceSessionSlot = 'FULL_DAY' | 'MORNING' | 'AFTERNOON';

export type CalendarEventType = 'HOLIDAY' | 'WEEKLY_OFF' | 'SPECIAL_WORKING_DAY' | 'EVENT';

export interface SchoolCalendarEvent {
  id: string;
  school_id: string;
  session_id: string;
  date: string;
  event_type: CalendarEventType;
  title: string;
  description?: string | null;
  is_instructional_day: boolean;
  school_name?: string;
  session_name?: string;
  created_at?: string;
}

export interface AttendanceSettings {
  id: string;
  school_id: string;
  lock_after_days: number;
  allow_future_marking: boolean;
  allow_holiday_marking: boolean;
  default_session: AttendanceSessionSlot;
  student_min_percentage: number;
  staff_min_percentage: number;
  staff_check_in_time: string;
  staff_check_out_time: string;
  created_at?: string;
  updated_at?: string;
}

export interface StudentAttendanceRecord {
  attendance_id?: string | null;
  student_id: string;
  admission_number?: string;
  roll_number?: string;
  student_name: string;
  profile_photo?: string | null;
  gender?: string;
  status: AttendanceStatus | null;
  arrival_time?: string;
  remarks?: string;
  marked_by_name?: string | null;
  is_locked?: boolean;
  marked_at?: string | null;
}

export interface StaffAttendanceRecord {
  attendance_id?: string | null;
  employee_id: string;
  employee_id_number: string;
  employee_type: EmployeeType;
  name: string;
  profile_photo?: string | null;
  department_name?: string;
  designation_name?: string;
  status: StaffAttendanceStatus | null;
  check_in_time?: string;
  check_out_time?: string;
  work_duration_minutes?: number;
  remarks?: string;
  marked_by_name?: string | null;
  is_locked?: boolean;
  marked_at?: string | null;
}

export interface AttendanceCorrectionRequest {
  id: string;
  school_id: string;
  record_type: 'STUDENT' | 'STAFF';
  attendance_id: string;
  student_id?: string | null;
  employee_id?: string | null;
  target_date: string;
  previous_status: string;
  requested_status: string;
  reason: string;
  document_url?: string | null;
  requested_by_id?: string | null;
  requested_by_name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_by_id?: string | null;
  reviewed_by_name?: string | null;
  review_remarks?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  school_name?: string;
  student_first_name?: string;
  student_last_name?: string;
  admission_number?: string;
  employee_first_name?: string;
  employee_last_name?: string;
  employee_id_number?: string;
}

export interface AttendanceDashboardStats {
  date: string;
  schoolId?: string;
  studentStats: {
    totalEnrolled: number;
    marked: number;
    unmarked: number;
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    onLeave: number;
    completionRate: number;
  };
  staffStats: {
    totalStaff: number;
    marked: number;
    unmarked: number;
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    onLeave: number;
    weeklyOff: number;
    holiday: number;
    completionRate: number;
  };
  classProgress: {
    class_id: string;
    class_name: string;
    numeric_grade?: number;
    section_id: string;
    section_name: string;
    class_teacher_name?: string | null;
    total_students: number;
    marked_students: number;
    is_completed: boolean;
  }[];
  calendarEvent?: SchoolCalendarEvent | null;
  pendingCorrections: number;
}

export interface StudentMonthlyRegister {
  meta: {
    school_name?: string;
    logo_url?: string;
    school_code?: string;
    session_name?: string;
    class_name?: string;
    section_name?: string;
  };
  year: number;
  month: number;
  daysInMonth: number;
  totalInstructionalDays: number;
  daysMeta: {
    day: number;
    date: string;
    isSunday: boolean;
    holiday?: SchoolCalendarEvent | null;
  }[];
  students: {
    student_id: string;
    admission_number: string;
    roll_number: string;
    name: string;
    gender: string;
    daily: Record<number, string>;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    halfDayCount: number;
    onLeaveCount: number;
    attendedDays: number;
    totalInstructionalDays: number;
    percentage: number;
  }[];
}

export interface StaffMonthlyRegister {
  schoolId: string;
  year: number;
  month: number;
  daysInMonth: number;
  staff: {
    employee_id: string;
    employee_id_number: string;
    employee_type: string;
    name: string;
    department_name: string;
    designation_name: string;
    daily: Record<number, string>;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    leaveCount: number;
  }[];
}

// ==========================================
// PHASE 6: FEES & ACCOUNTS MANAGEMENT TYPES
// ==========================================

export interface FeeCategory {
  id: string;
  school_id: string;
  name: string;
  code: string;
  description?: string;
  is_system: boolean;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface FeeStructureItem {
  id?: string;
  structure_id?: string;
  category_id: string;
  category_name?: string;
  category_code?: string;
  amount: number;
  is_mandatory: boolean;
  late_fee_amount?: number;
  late_fee_type?: 'FIXED' | 'PERCENTAGE' | 'DAILY';
  grace_period_days?: number;
}

export interface FeeInstallment {
  id?: string;
  structure_id?: string;
  installment_number: number;
  name: string;
  due_date: string;
  late_fee_date: string;
  percentage_share: number;
}

export interface FeeStructure {
  id: string;
  school_id: string;
  session_id: string;
  name: string;
  code: string;
  description?: string;
  frequency: 'ANNUAL' | 'HALF_YEARLY' | 'QUARTERLY' | 'MONTHLY' | 'ONE_TIME';
  target_type: 'CLASS' | 'STUDENT' | 'ALL';
  class_ids?: string[] | string;
  is_locked: boolean;
  status: 'active' | 'inactive';
  items?: FeeStructureItem[];
  installments?: FeeInstallment[];
  total_annual_amount?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StudentFeeAssignment {
  id: string;
  school_id: string;
  session_id: string;
  student_id: string;
  student_name?: string;
  admission_number?: string;
  roll_number?: string;
  class_id: string;
  class_name?: string;
  section_id?: string;
  section_name?: string;
  structure_id: string;
  structure_name?: string;
  total_charges: number;
  total_concessions: number;
  total_late_fees: number;
  net_payable: number;
  paid_amount: number;
  waived_amount: number;
  refunded_amount: number;
  outstanding_balance: number;
  status: 'PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'OVERDUE';
  assigned_date: string;
  parent_name?: string;
  parent_mobile?: string;
  parent_email?: string;
  charges?: StudentFeeCharge[];
}

export interface StudentFeeCharge {
  id: string;
  assignment_id: string;
  school_id: string;
  session_id: string;
  student_id: string;
  category_id: string;
  category_name?: string;
  installment_name: string;
  installment_no: number;
  due_date: string;
  amount: number;
  concession_amount: number;
  late_fee_charged: number;
  late_fee_waived: number;
  paid_amount: number;
  outstanding_amount: number;
  status: 'PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'OVERDUE';
}

export interface FeeConcession {
  id: string;
  school_id: string;
  session_id: string;
  student_id: string;
  student_name?: string;
  admission_number?: string;
  class_name?: string;
  section_name?: string;
  assignment_id?: string;
  charge_id?: string;
  category_id?: string;
  concession_type: 'SCHOLARSHIP' | 'SIBLING_DISCOUNT' | 'STAFF_WARD' | 'FINANCIAL_AID' | 'MERIT' | 'SPECIAL_WAIVER';
  discount_type: 'FIXED' | 'PERCENTAGE';
  discount_value: number;
  calculated_amount: number;
  reason: string;
  document_url?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requested_by_id?: string;
  requested_by_name: string;
  approved_by_id?: string;
  approved_by_name?: string;
  approval_remarks?: string;
  approved_at?: string;
  created_at: string;
}

export interface FeePaymentAllocation {
  id: string;
  payment_id: string;
  charge_id: string;
  amount_allocated: number;
  category_name: string;
  installment_name: string;
}

export interface FeePayment {
  id: string;
  school_id: string;
  session_id: string;
  student_id: string;
  student_name?: string;
  admission_number?: string;
  roll_number?: string;
  class_name?: string;
  section_name?: string;
  receipt_number: string;
  payment_date: string;
  payment_time: string;
  amount: number;
  payment_mode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'CARD' | 'DEMAND_DRAFT' | 'ONLINE';
  transaction_reference?: string;
  cheque_number?: string;
  cheque_date?: string;
  bank_name?: string;
  verification_status: 'VERIFIED' | 'PENDING' | 'BOUNCED';
  status: 'SUCCESS' | 'REVERSED' | 'FAILED';
  collected_by_id?: string;
  collected_by_name: string;
  remarks?: string;
  advance_amount_used?: number;
  advance_amount_generated?: number;
  allocations?: FeePaymentAllocation[];
  reprint_count?: number;
  created_at?: string;
}

export interface OfficialReceiptPayload {
  receiptNumber: string;
  date: string;
  time: string;
  school: {
    name: string;
    code: string;
    affiliation?: string;
    address?: string;
    phone?: string;
    email?: string;
    logo_url?: string;
  };
  student: {
    name: string;
    admissionNumber: string;
    rollNumber?: string;
    class: string;
    section?: string;
  };
  parent?: {
    name: string;
    mobile: string;
  };
  itemsPaid: Array<{
    category: string;
    installment?: string;
    amount: number;
  }>;
  totalAmount: number;
  paymentMode: string;
  transactionReference?: string;
  chequeNumber?: string;
  bankName?: string;
  previousBalance: number;
  remainingBalance: number;
  collectedBy: string;
  remarks?: string;
}

export interface FeeRefund {
  id: string;
  school_id: string;
  payment_id: string;
  student_id: string;
  student_name?: string;
  admission_number?: string;
  receipt_number?: string;
  amount: number;
  reason: string;
  payment_mode: string;
  transaction_reference?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requested_by_name: string;
  approved_by_name?: string;
  approval_remarks?: string;
  approved_at?: string;
  created_at: string;
}

export interface FeeReversal {
  id: string;
  school_id: string;
  payment_id: string;
  student_id: string;
  student_name?: string;
  receipt_number?: string;
  amount: number;
  reason: string;
  status: 'REVERSED';
  reversed_by_name: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  school_id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
}

export interface SchoolExpense {
  id: string;
  school_id: string;
  category_id: string;
  category_name?: string;
  expense_date: string;
  amount: number;
  payment_mode: string;
  payee_vendor: string;
  reference_no?: string;
  description?: string;
  supporting_doc_url?: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_by_name: string;
  approved_by_name?: string;
  created_at: string;
}

export interface FeeReminder {
  id: string;
  school_id: string;
  session_id: string;
  student_id: string;
  student_name?: string;
  admission_number?: string;
  class_name?: string;
  section_name?: string;
  reminder_type: 'UPCOMING' | 'DUE_TODAY' | 'OVERDUE' | 'FINAL_NOTICE';
  target_due_date?: string;
  amount_due: number;
  parent_name: string;
  parent_mobile: string;
  parent_email?: string;
  channel: 'SMS_SIMULATED' | 'EMAIL_SIMULATED' | 'WHATSAPP_SIMULATED' | 'MANUAL_PHONE_LOG' | 'RECORDED_NOTICE';
  message_text: string;
  status: 'LOGGED' | 'SENT';
  created_by_name: string;
  created_at: string;
}

export interface FeeDashboardStats {
  date: string;
  schoolId?: string;
  todayCollection: {
    total: number;
    transactionCount: number;
    byMode: Array<{ payment_mode: string; total: string | number; count: string | number }>;
  };
  summary: {
    totalDemand: number;
    totalCollected: number;
    totalDues: number;
    totalConcessions: number;
    totalExpenses: number;
    netCashFlow: number;
  };
  overdue: {
    amount: number;
    count: number;
  };
  cashierSummary: Array<{ collected_by_name: string; total: number; count: number }>;
  recentTransactions: Array<{
    id: string;
    receipt_number: string;
    payment_date: string;
    payment_time: string;
    amount: string | number;
    payment_mode: string;
    transaction_reference?: string;
    status: string;
    collected_by_name: string;
    student_name: string;
    admission_number: string;
    class_name: string;
    section_name?: string;
  }>;
  pendingApprovals: {
    refunds: number;
    concessions: number;
  };
}

export interface StudentPayableSummary {
  student: {
    id: string;
    name: string;
    admission_number: string;
    roll_number?: string;
    class_id: string;
    class_name: string;
    section_name?: string;
    school_id: string;
    school_name: string;
    parent_name?: string;
    parent_mobile?: string;
    parent_email?: string;
    address?: string;
  };
  assignment: StudentFeeAssignment | null;
  payableCharges: StudentFeeCharge[];
  paidCharges: StudentFeeCharge[];
  paymentHistory: FeePayment[];
  concessions: FeeConcession[];
  totals: {
    totalCharges: number;
    totalConcessions: number;
    totalPaid: number;
    totalOutstanding: number;
  };
}

export interface StudentLedger {
  student: {
    id: string;
    name: string;
    admission_number: string;
    roll_number?: string;
    class_name: string;
    section_name?: string;
    school_name: string;
    parent_name?: string;
    parent_mobile?: string;
  };
  entries: Array<{
    date: string;
    type: 'CHARGE' | 'PAYMENT' | 'CONCESSION' | 'REFUND' | 'REVERSAL' | 'LATE_FEE';
    description: string;
    reference: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  totals: {
    totalBilled: number;
    totalPaid: number;
    totalConcessions: number;
    totalRefunded: number;
    currentBalance: number;
  };
}

// ==========================================
// PHASE 8: TIMETABLE, HOMEWORK & CLASSROOM MANAGEMENT TYPES
// ==========================================

export interface ClassroomRoom {
  id: string;
  school_id: string;
  room_number: string;
  name: string;
  building?: string | null;
  floor?: string | null;
  capacity: number;
  room_type: 'CLASSROOM' | 'LAB' | 'LIBRARY' | 'AUDITORIUM' | 'SPORTS' | 'ACTIVITY';
  is_shared: boolean;
  status: 'active' | 'maintenance' | 'inactive';
  assigned_periods_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TimetablePeriod {
  id: string;
  school_id: string;
  session_id?: string | null;
  name: string;
  period_number: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  period_type: 'REGULAR' | 'BREAK' | 'LUNCH' | 'ASSEMBLY' | 'ACTIVITY' | 'FREE';
  sort_order: number;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Timetable {
  id: string;
  school_id: string;
  session_id: string;
  class_id: string;
  section_id?: string | null;
  name: string;
  version: number;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
  effective_from?: string | null;
  effective_to?: string | null;
  published_at?: string | null;
  published_by_id?: string | null;
  published_by_name?: string | null;
  created_by_id?: string | null;
  class_name?: string;
  section_name?: string;
  session_name?: string;
  total_entries_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TimetableEntry {
  id: string;
  timetable_id: string;
  school_id: string;
  session_id: string;
  class_id: string;
  section_id?: string | null;
  day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  period_id: string;
  subject_id: string;
  teacher_employee_id: string;
  room_id?: string | null;
  room_name?: string | null;
  is_conflict_overridden: boolean;
  override_reason?: string | null;
  override_by_name?: string | null;
  subject_name?: string;
  subject_code?: string;
  teacher_first_name?: string;
  teacher_last_name?: string;
  room_full_name?: string;
  room_number?: string;
  period_name?: string;
  period_start_time?: string;
  period_end_time?: string;
  period_number?: number;
  period_type?: string;
  sort_order?: number;
  class_name?: string;
  section_name?: string;
  created_at: string;
  updated_at: string;
}

export interface TimetableConflict {
  type: string;
  message: string;
}

export interface TeacherSubstitution {
  id: string;
  school_id: string;
  timetable_entry_id?: string | null;
  substitution_date: string;
  original_teacher_id: string;
  original_teacher_name: string;
  substitute_teacher_id: string;
  substitute_teacher_name: string;
  class_id?: string | null;
  class_name?: string | null;
  section_id?: string | null;
  section_name?: string | null;
  subject_id?: string | null;
  subject_name?: string | null;
  period_id?: string | null;
  period_name?: string | null;
  period_time?: string | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  remarks?: string | null;
  created_by_name?: string | null;
  approved_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomeworkAttachment {
  name: string;
  size?: string;
  type?: string;
  url: string;
}

export interface Homework {
  id: string;
  school_id: string;
  session_id: string;
  class_id: string;
  section_id?: string | null;
  subject_id: string;
  teacher_id: string;
  teacher_name?: string;
  title: string;
  description: string;
  assigned_date: string;
  due_date: string;
  max_marks?: number | string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  instructions?: string | null;
  attachments?: string | HomeworkAttachment[];
  submission_required: boolean;
  allow_late_submission: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
  class_name?: string;
  section_name?: string;
  subject_name?: string;
  subject_code?: string;
  total_submissions_count?: number;
  evaluated_count?: number;
  student_submission_status?: string | null;
  student_marks_obtained?: number | string | null;
  student_grade?: string | null;
  student_feedback?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomeworkSubmission {
  student_id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  class_name?: string;
  section_name?: string;
  submission_id?: string | null;
  submission_status?: 'NOT_SUBMITTED' | 'SUBMITTED' | 'LATE' | 'UNDER_REVIEW' | 'EVALUATED' | 'RETURNED';
  submission_date?: string | null;
  is_late?: boolean;
  text_content?: string | null;
  submitted_files?: string | any[];
  student_remarks?: string | null;
  marks_obtained?: number | string | null;
  grade?: string | null;
  teacher_feedback?: string | null;
  evaluated_by_name?: string | null;
  evaluated_at?: string | null;
}

export interface LearningMaterial {
  id: string;
  school_id: string;
  session_id: string;
  class_id: string;
  section_id?: string | null;
  subject_id: string;
  teacher_id: string;
  teacher_name?: string;
  title: string;
  description?: string | null;
  material_type: 'DOCUMENT' | 'PDF' | 'PRESENTATION' | 'WORKSHEET' | 'LINK' | 'VIDEO' | 'IMAGE';
  file_url?: string;
  file_name?: string;
  file_size?: string;
  visibility: 'ALL' | 'CLASS' | 'SECTION' | 'TEACHERS_ONLY';
  download_count: number;
  status: 'ACTIVE' | 'ARCHIVED';
  class_name?: string;
  subject_name?: string;
  subject_code?: string;
  created_at: string;
  updated_at: string;
}

export interface ClassroomNotice {
  id: string;
  school_id: string;
  session_id?: string | null;
  class_id?: string | null;
  section_id?: string | null;
  subject_id?: string | null;
  title: string;
  content: string;
  target_audience: 'ALL' | 'STUDENTS' | 'PARENTS' | 'TEACHERS' | 'CLASS';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  publish_date: string;
  expiry_date?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  author_name: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'EXPIRED' | 'ARCHIVED';
  class_name?: string;
  section_name?: string;
  subject_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ClassroomDashboardSummary {
  totalTimetables: number;
  publishedTimetables: number;
  totalHomework: number;
  activeHomework: number;
  totalMaterials: number;
  totalNotices: number;
  todaySubstitutions: number;
  totalRooms: number;
  submissionMetrics: {
    submitted: number;
    evaluated: number;
    late: number;
  };
}

export interface TeacherWorkloadItem {
  teacher_id: string;
  first_name: string;
  last_name: string;
  employee_id_number: string;
  periods_per_week: number;
  classes_assigned_count: number;
  subjects_assigned_count: number;
  substitution_periods_count: number;
  homework_assigned_count: number;
}

// ==========================================
// PHASE 10: LIBRARY MANAGEMENT INTERFACES
// ==========================================

export interface LibraryFacility {
  id: string;
  school_id: string;
  name: string;
  code: string;
  description?: string;
  location?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  titles_count?: number;
  copies_count?: number;
  created_at: string;
  updated_at: string;
}

export interface LibrarySettings {
  id: string;
  school_id: string;
  max_books_student: number;
  max_books_teacher: number;
  max_books_staff: number;
  borrowing_period_student_days: number;
  borrowing_period_teacher_days: number;
  borrowing_period_staff_days: number;
  renewal_limit: number;
  fine_per_day: number;
  max_fine_per_book: number;
  grace_period_days: number;
  reservation_validity_days: number;
  lost_book_fine_rule: string;
  lost_book_processing_fee: number;
  damaged_book_default_penalty: number;
  library_card_prefix: string;
  created_at: string;
  updated_at: string;
}

export interface BookCategory {
  id: string;
  school_id: string;
  name: string;
  code: string;
  description?: string;
  parent_category_id?: string | null;
  is_active: boolean;
  books_count?: number;
  created_at: string;
}

export interface BookAuthor {
  id: string;
  school_id: string;
  name: string;
  biography?: string;
  nationality?: string;
  notes?: string;
  is_active: boolean;
  titles_count?: number;
  created_at: string;
}

export interface BookPublisher {
  id: string;
  school_id: string;
  name: string;
  address?: string;
  contact_person?: string;
  email?: string;
  website?: string;
  notes?: string;
  is_active: boolean;
  titles_count?: number;
  created_at: string;
}

export interface BookLocation {
  id: string;
  school_id: string;
  library_id: string;
  name: string;
  code: string;
  parent_location_id?: string | null;
  description?: string;
  is_active: boolean;
  copies_count?: number;
  created_at: string;
}

export interface BookTitle {
  id: string;
  school_id: string;
  library_id: string;
  title: string;
  subtitle?: string;
  isbn?: string;
  isbn13?: string;
  author_id?: string;
  author_name: string;
  publisher_id?: string;
  category_id?: string;
  language: string;
  edition?: string;
  publication_year?: number;
  description?: string;
  subject?: string;
  pages?: number;
  cover_image?: string;
  price: number;
  supplier?: string;
  acquisition_date?: string;
  reference_only: boolean;
  is_active: boolean;
  category_name?: string;
  category_code?: string;
  publisher_name?: string;
  total_copies?: number;
  available_copies?: number;
  issued_copies?: number;
  overdue_copies?: number;
  active_holds?: number;
  created_at: string;
  updated_at: string;
}

export interface BookCopy {
  id: string;
  school_id: string;
  library_id: string;
  book_id: string;
  accession_number: string;
  barcode: string;
  qr_code?: string;
  copy_number: number;
  purchase_date?: string;
  purchase_price: number;
  condition: 'GOOD' | 'FAIR' | 'DAMAGED';
  location_id?: string;
  status: 'AVAILABLE' | 'ISSUED' | 'RESERVED' | 'OVERDUE' | 'LOST' | 'DAMAGED' | 'UNDER_REPAIR' | 'WITHDRAWN' | 'REFERENCE_ONLY';
  current_holder_id?: string | null;
  notes?: string;
  book_title?: string;
  author_name?: string;
  isbn?: string;
  category_name?: string;
  location_name?: string;
  location_code?: string;
  current_issue_id?: string;
  issue_date?: string;
  due_date?: string;
  renewal_count?: number;
  borrower_name?: string;
  borrower_mem_no?: string;
  created_at: string;
}

export interface LibraryMember {
  id: string;
  school_id: string;
  library_id: string;
  member_type: 'STUDENT' | 'TEACHER' | 'STAFF';
  student_id?: string | null;
  employee_id?: string | null;
  membership_number: string;
  card_number: string;
  issue_date: string;
  expiry_date: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  borrowing_limit?: number | null;
  notes?: string;
  name?: string;
  identifier?: string;
  subtext?: string;
  details_summary?: string;
  student_photo?: string;
  phone?: string;
  active_books_count?: number;
  overdue_books_count?: number;
  outstanding_fines?: number;
  created_at: string;
}

export interface BookIssue {
  id: string;
  school_id: string;
  library_id: string;
  member_id: string;
  book_copy_id: string;
  book_id: string;
  issue_date: string;
  due_date: string;
  returned_date?: string | null;
  issued_by: string;
  returned_by?: string | null;
  status: 'ISSUED' | 'RETURNED' | 'OVERDUE' | 'LOST' | 'DAMAGED' | 'CANCELLED';
  return_condition?: string;
  renewal_count: number;
  last_renewed_at?: string;
  fine_amount: number;
  notes?: string;
  book_title?: string;
  accession_number?: string;
  barcode?: string;
  membership_number?: string;
  member_type?: string;
  member_name?: string;
  member_group?: string;
  days_overdue?: number;
  student_phone?: string;
  employee_phone?: string;
  created_at: string;
}

export interface BookRenewal {
  id: string;
  issue_id: string;
  previous_due_date: string;
  new_due_date: string;
  renewal_number: number;
  renewed_by: string;
  reason?: string;
  created_at: string;
}

export interface BookReservation {
  id: string;
  school_id: string;
  library_id: string;
  book_id: string;
  member_id: string;
  reservation_date: string;
  expiry_date: string;
  queue_position: number;
  status: 'WAITING' | 'READY' | 'COLLECTED' | 'EXPIRED' | 'CANCELLED';
  fulfilled_copy_id?: string | null;
  book_title?: string;
  author_name?: string;
  isbn?: string;
  membership_number?: string;
  member_type?: string;
  member_name?: string;
  created_at: string;
}

export interface LibraryFine {
  id: string;
  school_id: string;
  library_id: string;
  member_id: string;
  issue_id?: string | null;
  type: 'OVERDUE' | 'LOST_BOOK' | 'DAMAGED_BOOK' | 'REPLACEMENT_COST';
  amount: number;
  waived_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'WAIVED' | 'CANCELLED';
  reason?: string;
  membership_number?: string;
  member_type?: string;
  member_name?: string;
  member_group?: string;
  book_title?: string;
  waived_by?: string;
  waived_at?: string;
  waiver_reason?: string;
  created_at: string;
}

export interface DamageRecord {
  id: string;
  school_id: string;
  book_copy_id: string;
  member_id?: string;
  issue_id?: string;
  damage_type: string;
  description: string;
  repairable: boolean;
  estimated_cost: number;
  penalty_amount: number;
  status: string;
  reported_by: string;
  created_at: string;
}

export interface InventoryAudit {
  id: string;
  school_id: string;
  library_id: string;
  title: string;
  verification_date: string;
  verified_by: string;
  verified_by_name?: string;
  total_scanned: number;
  total_verified: number;
  total_missing: number;
  total_discrepancies: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  audit_data?: any[];
  created_at: string;
}

export interface LibraryDashboardStats {
  totalBookTitles: number;
  totalCopies: number;
  availableCopies: number;
  issuedCopies: number;
  overdueCopies: number;
  reservedCopies: number;
  lostCopies: number;
  damagedCopies: number;
  referenceCopies: number;
  totalMembers: number;
  activeStudents: number;
  activeStaff: number;
  studentBorrowers: number;
  staffBorrowers: number;
  outstandingFines: number;
  collectedFines: number;
  waivedFines: number;
  booksDueToday: number;
  booksDueThisWeek: number;
  recentIssues: BookIssue[];
  popularBooks: Array<{
    id: string;
    title: string;
    author_name: string;
    isbn: string;
    category_name: string;
    borrow_count: string | number;
  }>;
}

// ==========================================
// PHASE 12: HR, PAYROLL & STAFF TYPES
// ==========================================

export interface PayHead {
  id: string;
  school_id: string;
  name: string;
  code: string;
  type: 'EARNING' | 'DEDUCTION';
  category: string;
  calculation_type: 'FLAT' | 'PERCENT_OF_BASIC' | 'PERCENT_OF_GROSS';
  default_value: number;
  is_taxable: boolean;
  is_statutory: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface SalaryStructure {
  id: string;
  school_id: string;
  name: string;
  code: string;
  description?: string;
  base_gross_monthly: number;
  assigned_staff_count?: number | string;
  is_active: boolean;
  created_at: string;
}

export interface EmployeeSalaryAssignment {
  employee_id: string;
  employee_id_number: string;
  employee_name: string;
  employee_type: string;
  profile_photo?: string;
  mobile_number?: string;
  official_email?: string;
  employment_status: string;
  date_of_joining: string;
  department_name?: string;
  designation_name?: string;
  assignment_id?: string;
  structure_id?: string;
  structure_name?: string;
  effective_from?: string;
  ctc_annual: number;
  gross_monthly: number;
  basic_pay: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  pan_number?: string;
  pf_uan_number?: string;
  esi_number?: string;
  payment_mode?: string;
  assignment_status?: string;
  notes?: string;
}

export interface LeaveType {
  id: string;
  school_id: string;
  name: string;
  code: string;
  annual_quota: number;
  is_carry_forward: boolean;
  is_paid: boolean;
  requires_document: boolean;
  is_active: boolean;
  created_at: string;
}

export interface LeaveBalance {
  id: string;
  school_id: string;
  employee_id: string;
  leave_type_id: string;
  leave_type_name: string;
  leave_type_code: string;
  employee_id_number: string;
  employee_name: string;
  department_name?: string;
  allocated: number;
  used: number;
  pending: number;
  balance: number;
  updated_at: string;
}

export interface LeaveApplication {
  id: string;
  school_id: string;
  employee_id: string;
  employee_id_number: string;
  employee_name: string;
  department_name?: string;
  designation_name?: string;
  leave_type_id: string;
  leave_type_name: string;
  leave_type_code: string;
  is_paid: boolean;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  document_url?: string;
  substitute_employee_id?: string;
  substitute_name?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reviewed_by_name?: string;
  reviewed_at?: string;
  reviewer_comments?: string;
  created_at: string;
}

export interface StaffLoan {
  id: string;
  school_id: string;
  employee_id: string;
  employee_id_number: string;
  employee_name: string;
  department_name?: string;
  designation_name?: string;
  loan_type: string;
  principal_amount: number;
  disbursement_date: string;
  repayment_months: number;
  monthly_emi: number;
  total_repaid: number;
  balance_amount: number;
  status: 'ACTIVE' | 'COMPLETED' | 'WRITTEN_OFF';
  reason?: string;
  created_at: string;
}

export interface PayrollCycle {
  id: string;
  school_id: string;
  title: string;
  month: number;
  year: number;
  start_date: string;
  end_date: string;
  total_working_days: number;
  total_employees: number;
  total_gross: number | string;
  total_deductions: number | string;
  total_net_payable: number | string;
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'DISBURSED' | 'CANCELLED';
  calculated_at?: string;
  approved_at?: string;
  approved_by_name?: string;
  disbursed_at?: string;
  payment_mode?: string;
  disbursement_ref?: string;
  expense_record_id?: string;
  notes?: string;
  created_at: string;
}

export interface PayrollItem {
  id: string;
  cycle_id: string;
  school_id: string;
  employee_id: string;
  employee_id_number: string;
  employee_name: string;
  employee_type?: string;
  profile_photo?: string;
  department_name?: string;
  designation_name?: string;
  slip_number: string;
  total_days_in_month: number;
  working_days: number;
  present_days: number;
  leave_days: number;
  lop_days: number;
  base_gross: number | string;
  basic_pay: number | string;
  da: number | string;
  hra: number | string;
  ta: number | string;
  special_allowance: number | string;
  performance_bonus: number | string;
  total_earnings: number | string;
  pf_deduction: number | string;
  esic_deduction: number | string;
  pt_deduction: number | string;
  tds_deduction: number | string;
  lop_deduction: number | string;
  loan_installment_deduction: number | string;
  other_deductions: number | string;
  total_deductions: number | string;
  net_pay: number | string;
  payment_status: 'PENDING' | 'APPROVED' | 'PAID' | 'HELD';
  paid_date?: string;
  payment_mode?: string;
  transaction_reference?: string;
  remarks?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  pan_number?: string;
  pf_uan_number?: string;
}

export interface EmployeeAppraisal {
  id: string;
  school_id: string;
  employee_id: string;
  employee_id_number: string;
  employee_name: string;
  department_name?: string;
  designation_name?: string;
  session_name?: string;
  review_period: string;
  rating: number;
  evaluator_name: string;
  pedagogy_score?: number;
  punctuality_score?: number;
  discipline_score?: number;
  strengths?: string;
  areas_for_improvement?: string;
  recommended_action: string;
  increment_percentage?: number;
  status: string;
  created_at: string;
}

export interface EmployeeLifecycleEvent {
  id: string;
  school_id: string;
  employee_id: string;
  employee_id_number: string;
  employee_name: string;
  department_name?: string;
  designation_name?: string;
  event_type: string;
  event_date: string;
  title: string;
  details?: string;
  fnf_gratuity_amount?: number;
  fnf_leave_encashment?: number;
  fnf_pending_dues?: number;
  fnf_net_settlement?: number;
  settlement_status?: string;
  created_by_name?: string;
  created_at: string;
}

export interface PayrollDashboardStats {
  totalEmployees: number;
  assignedEmployees: number;
  pendingLeavesCount: number;
  activeLoansCount: number;
  totalLoanOutstanding: number;
  latestCycle: PayrollCycle | null;
  departmentSalaries: Array<{
    department_name: string;
    staff_count: number | string;
    total_gross: number | string;
  }>;
  recentCycles: PayrollCycle[];
}

export interface StatutoryRegisterRow {
  id: string;
  slip_number: string;
  working_days: number;
  present_days: number;
  lop_days: number;
  base_gross: number | string;
  basic_pay: number | string;
  total_earnings: number | string;
  employee_pf: number | string;
  employer_epf: number | string;
  total_pf_contribution: number | string;
  employee_esic: number | string;
  employer_esic: number | string;
  pt_deduction: number | string;
  tds_deduction: number | string;
  net_pay: number | string;
  payment_status: string;
  employee_id_number: string;
  employee_name: string;
  department_name?: string;
  pan_number?: string;
  pf_uan_number?: string;
  esi_number?: string;
  cycle_title: string;
  month: number;
  year: number;
}

// ==========================================
// PHASE 9: TRANSPORT, VEHICLE & SCHOOL BUS
// ==========================================

export interface Vehicle {
  id: string;
  school_id: string;
  registration_number: string;
  vehicle_number: string;
  vehicle_type: 'Bus' | 'Mini Bus' | 'Van' | 'Other';
  make?: string;
  model?: string;
  manufacturer?: string;
  manufacturing_year?: number;
  purchase_date?: string;
  purchase_cost?: number | string;
  seating_capacity: number;
  standing_capacity: number;
  total_capacity: number;
  fuel_type: 'Diesel' | 'Petrol' | 'CNG' | 'Electric';
  current_mileage: number;
  vehicle_color?: string;
  vehicle_photo?: string;
  gps_device_id?: string;
  status: 'Active' | 'Inactive' | 'Under Maintenance' | 'Accident/Damaged' | 'Sold' | 'Retired';
  notes?: string;
  documents_count?: number | string;
  expired_docs_count?: number | string;
  expiring_docs_count?: number | string;
  assigned_route_name?: string;
  assigned_route_code?: string;
  last_maintenance_date?: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleDocument {
  id: string;
  school_id: string;
  vehicle_id: string;
  vehicle_number?: string;
  registration_number?: string;
  document_type: string;
  document_number: string;
  issue_date: string;
  expiry_date: string;
  issuing_authority?: string;
  file_url?: string;
  reminder_days: number;
  remarks?: string;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
  calculated_status?: string;
  days_until_expiry?: number;
  created_at: string;
}

export interface TransportDriver {
  id: string;
  school_id: string;
  employee_id: string;
  employee_id_number?: string;
  first_name?: string;
  last_name?: string;
  driver_name: string;
  mobile_number?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  date_of_joining?: string;
  license_number: string;
  license_type: string;
  license_issue_date: string;
  license_expiry_date: string;
  experience_years: number;
  badge_number?: string;
  medical_fitness_status: 'FIT' | 'UNDER_REVIEW' | 'UNFIT';
  police_verification_status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  driver_photo?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'RETIRED';
  notes?: string;
  days_until_license_expiry?: number;
  assigned_route_name?: string;
  assigned_route_code?: string;
  assigned_vehicle_number?: string;
  created_at: string;
}

export interface TransportStaffAssignment {
  id: string;
  school_id: string;
  employee_id: string;
  vehicle_id?: string;
  role: 'Conductor' | 'Attendant' | 'Female Escort / Helper';
  start_date: string;
  end_date?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'REASSIGNED';
  notes?: string;
  staff_name: string;
  employee_id_number: string;
  phone?: string;
  vehicle_number?: string;
  registration_number?: string;
}

export interface TransportRoute {
  id: string;
  school_id: string;
  academic_session_id?: string;
  name: string;
  code: string;
  start_point: string;
  end_point: string;
  estimated_distance_km: number | string;
  estimated_duration_mins: number;
  assigned_vehicle_id?: string;
  assigned_driver_id?: string;
  assigned_conductor_id?: string;
  status: 'ACTIVE' | 'INACTIVE';
  description?: string;
  vehicle_number?: string;
  registration_number?: string;
  seating_capacity?: number;
  total_capacity?: number;
  vehicle_type?: string;
  driver_name?: string;
  driver_phone?: string;
  conductor_name?: string;
  conductor_phone?: string;
  stops_count?: number | string;
  enrolled_students_count?: number | string;
  capacity_utilization_pct?: number | string;
  created_at: string;
  updated_at: string;
}

export interface TransportRouteStop {
  id: string;
  school_id: string;
  route_id: string;
  stop_name: string;
  address?: string;
  sequence_order: number;
  landmark?: string;
  pickup_time: string;
  drop_time: string;
  fare_amount: number | string;
  latitude?: number;
  longitude?: number;
  status: 'ACTIVE' | 'INACTIVE';
  pickup_students_count?: number | string;
  drop_students_count?: number | string;
  created_at: string;
}

export interface StudentTransportEnrollment {
  id: string;
  school_id: string;
  academic_session_id: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  class_name?: string;
  section_name?: string;
  route_id: string;
  route_name?: string;
  route_code?: string;
  vehicle_number?: string;
  registration_number?: string;
  pickup_stop_id: string;
  pickup_stop_name?: string;
  pickup_time?: string;
  drop_stop_id: string;
  drop_stop_name?: string;
  drop_time?: string;
  transport_type: 'Pickup + Drop' | 'Pickup Only' | 'Drop Only' | 'Own Transport';
  monthly_fare: number | string;
  start_date: string;
  end_date?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  emergency_contact_person?: string;
  emergency_contact_phone?: string;
  authorized_pickup_person?: string;
  authorized_pickup_phone?: string;
  medical_alert_notes?: string;
  father_name?: string;
  mother_name?: string;
  primary_phone?: string;
  created_at: string;
}

export interface TransportTrip {
  id: string;
  school_id: string;
  route_id: string;
  vehicle_id: string;
  driver_id: string;
  conductor_id?: string;
  trip_date: string;
  trip_type: 'Morning Pickup' | 'Afternoon Drop' | 'Special Trip' | 'Emergency Trip' | 'Other';
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  status: 'Scheduled' | 'Started' | 'In Progress' | 'Completed' | 'Cancelled';
  odometer_start?: number;
  odometer_end?: number;
  notes?: string;
  route_name?: string;
  route_code?: string;
  start_point?: string;
  end_point?: string;
  vehicle_number?: string;
  registration_number?: string;
  seating_capacity?: number;
  driver_name?: string;
  driver_phone?: string;
  conductor_name?: string;
  conductor_phone?: string;
  total_enrolled?: number | string;
  boarded_count?: number | string;
  dropped_count?: number | string;
  boarded_students_count?: number | string;
  enrolled_students_count?: number | string;
  created_at: string;
}

export interface TransportAttendanceRecord {
  id: string;
  school_id: string;
  trip_id: string;
  student_id: string;
  student_name?: string;
  admission_number?: string;
  class_name?: string;
  section_name?: string;
  route_id: string;
  route_name?: string;
  stop_id: string;
  stop_name?: string;
  attendance_date: string;
  pickup_status: 'Scheduled' | 'Boarded' | 'Absent' | 'Not Boarded' | 'Parent Pickup' | 'Other';
  pickup_time?: string;
  drop_status: 'Scheduled' | 'Dropped' | 'Not Dropped' | 'Parent Received' | 'Authorized Received' | 'Other';
  drop_time?: string;
  authorized_receiver_name?: string;
  authorized_receiver_phone?: string;
  remarks?: string;
  marked_by_id?: string;
  marked_at?: string;
}

export interface VehicleMaintenance {
  id: string;
  school_id: string;
  vehicle_id: string;
  vehicle_number?: string;
  registration_number?: string;
  model?: string;
  maintenance_date: string;
  maintenance_type: 'Regular Service' | 'Engine' | 'Tyres' | 'Battery' | 'Brake' | 'Electrical' | 'AC' | 'Body Repair' | 'Accident Repair' | 'Other';
  description: string;
  vendor_center: string;
  invoice_number?: string;
  cost: number | string;
  odometer_reading?: number;
  next_maintenance_date?: string;
  next_maintenance_mileage?: number;
  days_until_next_service?: number;
  expense_record_id?: string;
  remarks?: string;
  created_by_id?: string;
  created_at: string;
}

export interface VehicleFuelRecord {
  id: string;
  school_id: string;
  vehicle_id: string;
  vehicle_number?: string;
  registration_number?: string;
  make?: string;
  model?: string;
  fuel_date: string;
  fuel_type: 'Diesel' | 'Petrol' | 'CNG' | 'Electric';
  quantity_litres: number | string;
  rate_per_litre: number | string;
  total_amount: number | string;
  odometer_reading: number;
  fuel_station?: string;
  invoice_number?: string;
  expense_record_id?: string;
  entered_by_id?: string;
  notes?: string;
  created_at: string;
}

export interface TransportIncident {
  id: string;
  school_id: string;
  incident_date: string;
  incident_time?: string;
  incident_type: 'Accident' | 'Student Injury' | 'Vehicle Breakdown' | 'Driver Issue' | 'Student Behaviour' | 'Missing Student' | 'Route Delay' | 'Other';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  vehicle_id?: string;
  vehicle_number?: string;
  registration_number?: string;
  route_id?: string;
  route_name?: string;
  route_code?: string;
  driver_id?: string;
  driver_name?: string;
  students_involved?: string;
  location?: string;
  description: string;
  action_taken?: string;
  reported_by?: string;
  status: 'Open' | 'Under Review' | 'Resolved' | 'Closed';
  follow_up_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface TransportNotice {
  id: string;
  school_id: string;
  route_id?: string;
  route_name?: string;
  route_code?: string;
  title: string;
  content: string;
  notice_type: 'Route Change' | 'Vehicle Change' | 'Delay' | 'Holiday Transport Schedule' | 'Emergency Notice' | 'General';
  target_audience: 'PARENTS' | 'STUDENTS' | 'STAFF' | 'ALL';
  publish_date: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

export interface TransportSettings {
  id: string;
  school_id: string;
  document_expiry_alert_days: number;
  maintenance_reminder_days: number;
  maintenance_reminder_km: number;
  allow_over_capacity_override: boolean;
  auto_generate_monthly_fees: boolean;
  speed_limit_kmph: number;
  emergency_helpline: string;
  updated_at: string;
}

export interface TransportDashboardData {
  vehicles: {
    total: number | string;
    active: number | string;
    inactive: number | string;
    under_maintenance: number | string;
    available: number | string;
    total_fleet_capacity: number | string;
  };
  routes: {
    total: number | string;
    active: number | string;
  };
  enrollments: {
    total_students: number | string;
    pickup_students: number | string;
    drop_students: number | string;
    total_monthly_fare_expected: number | string;
  };
  trips: {
    total_trips: number | string;
    completed_trips: number | string;
    pending_trips: number | string;
  };
  attendance: {
    total_records: number | string;
    boarded_count: number | string;
    absent_count: number | string;
    missing_pickup_count: number | string;
    dropped_count: number | string;
    missing_drop_count: number | string;
  };
  expiringDocuments: {
    expired_docs: number | string;
    expiring_soon_docs: number | string;
  };
  expiringLicenses: {
    expired_licenses: number | string;
    expiring_soon_licenses: number | string;
  };
  upcomingMaintenance: {
    upcoming_count: number | string;
  };
  incidents: {
    total_incidents: number | string;
    open_incidents: number | string;
  };
  todayTrips: TransportTrip[];
  recentIncidents: TransportIncident[];
}

