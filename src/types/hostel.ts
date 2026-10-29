export interface Hostel {
  id: string;
  school_id: string;
  name: string;
  code: string;
  hostel_type: string;
  gender: 'MALE' | 'FEMALE' | 'COED';
  description?: string;
  address?: string;
  contact_number?: string;
  capacity: number;
  is_active: boolean;
  total_blocks?: number;
  total_rooms?: number;
  total_beds?: number;
  occupied_beds?: number;
  available_beds?: number;
  wardens?: Array<{
    assignmentId: string;
    role: string;
    staffName: string;
    contactNumber?: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface HostelBlock {
  id: string;
  school_id: string;
  hostel_id: string;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  hostel_name?: string;
  total_floors?: number;
  total_rooms?: number;
  total_beds?: number;
  created_at?: string;
  updated_at?: string;
}

export interface HostelFloor {
  id: string;
  school_id: string;
  hostel_id: string;
  block_id: string;
  name: string;
  floor_number: number;
  description?: string;
  is_active: boolean;
  block_name?: string;
  hostel_name?: string;
  total_rooms?: number;
  total_beds?: number;
  created_at?: string;
  updated_at?: string;
}

export interface HostelRoom {
  id: string;
  school_id: string;
  hostel_id: string;
  block_id: string;
  floor_id: string;
  room_number: string;
  room_type: string;
  capacity: number;
  gender: string;
  status: 'Available' | 'Full' | 'Maintenance' | 'Reserved' | 'Inactive';
  notes?: string;
  is_active: boolean;
  hostel_name?: string;
  block_name?: string;
  floor_name?: string;
  total_beds?: number;
  occupied_beds?: number;
  available_beds?: number;
  created_at?: string;
  updated_at?: string;
}

export interface HostelBed {
  id: string;
  school_id: string;
  hostel_id: string;
  room_id: string;
  bed_number: string;
  bed_code: string;
  status: 'Available' | 'Occupied' | 'Reserved' | 'Maintenance' | 'Inactive';
  condition: 'Good' | 'Fair' | 'Needs Repair' | 'Damaged';
  notes?: string;
  is_active: boolean;
  room_number?: string;
  room_type?: string;
  hostel_name?: string;
  block_name?: string;
  floor_name?: string;
  allocation_id?: string;
  allocation_date?: string;
  occupant_name?: string;
  occupant_adm_no?: string;
  occupant_class?: string;
  occupant_section?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HostelStaffAssignment {
  id: string;
  school_id: string;
  hostel_id: string;
  employee_id: string;
  role: string;
  start_date: string;
  end_date?: string;
  duty_schedule?: string;
  contact_number?: string;
  is_active: boolean;
  staff_name?: string;
  employee_id_number?: string;
  employee_type?: string;
  hostel_name?: string;
  created_at?: string;
}

export interface HostelDutyRoster {
  id: string;
  school_id: string;
  hostel_id: string;
  employee_id: string;
  duty_date: string;
  shift: string;
  duty_type: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'SWAPPED' | 'ABSENT';
  staff_name?: string;
  hostel_name?: string;
  created_at?: string;
}

export interface HostelAdmission {
  id: string;
  school_id: string;
  hostel_id: string;
  academic_session_id: string;
  student_id: string;
  admission_number: string;
  admission_date: string;
  expected_exit_date?: string;
  status: 'Active' | 'Pending' | 'Completed' | 'Cancelled' | 'Withdrawn';
  reason?: string;
  approved_by?: string;
  notes?: string;
  student_name?: string;
  student_adm_no?: string;
  student_gender?: string;
  student_phone?: string;
  class_name?: string;
  section_name?: string;
  hostel_name?: string;
  allocation_id?: string;
  room_number?: string;
  bed_code?: string;
  allocation_status?: string;
  created_at?: string;
}

export interface HostelAllocation {
  id: string;
  school_id: string;
  hostel_id: string;
  room_id: string;
  bed_id: string;
  student_id: string;
  admission_id?: string;
  academic_session_id: string;
  allocation_date: string;
  status: 'ACTIVE' | 'TRANSFERRED' | 'VACATED';
  allocated_by?: string;
  notes?: string;
  student_name?: string;
  student_adm_no?: string;
  student_gender?: string;
  student_phone?: string;
  class_name?: string;
  section_name?: string;
  hostel_name?: string;
  block_name?: string;
  floor_name?: string;
  room_number?: string;
  room_type?: string;
  bed_number?: string;
  bed_code?: string;
  created_at?: string;
}

export interface HostelAllocationHistory {
  id: string;
  school_id: string;
  student_id: string;
  allocation_id: string;
  from_hostel_id: string;
  from_room_id: string;
  from_bed_id: string;
  to_hostel_id: string;
  to_room_id: string;
  to_bed_id: string;
  transfer_date: string;
  reason: string;
  approved_by: string;
  remarks?: string;
  from_hostel?: string;
  from_room?: string;
  from_bed?: string;
  to_hostel?: string;
  to_room?: string;
  to_bed?: string;
  created_at?: string;
}

export interface HostelAttendanceSession {
  id: string;
  school_id: string;
  hostel_id: string;
  block_id?: string;
  date: string;
  attendance_type: 'MORNING_ROLL_CALL' | 'EVENING_ROLL_CALL' | 'NIGHT_ATTENDANCE' | 'SPECIAL_ROLL_CALL';
  marked_by: string;
  is_locked: boolean;
  locked_by?: string;
  locked_at?: string;
  notes?: string;
  hostel_name?: string;
  block_name?: string;
  total_students?: number;
  present_count?: number;
  absent_count?: number;
  on_leave_count?: number;
  outing_count?: number;
  created_at?: string;
}

export interface HostelAttendanceRecord {
  id: string;
  attendance_id: string;
  school_id: string;
  student_id: string;
  room_id?: string;
  bed_id?: string;
  status: 'PRESENT' | 'ABSENT' | 'ON_LEAVE' | 'OUTING' | 'MEDICAL' | 'APPROVED_ABSENCE';
  remarks?: string;
  correction_reason?: string;
  updated_by?: string;
  student_name?: string;
  admission_number?: string;
  roll_number?: string;
  room_number?: string;
  bed_code?: string;
  created_at?: string;
}

export interface HostelLeave {
  id: string;
  school_id: string;
  student_id: string;
  hostel_id: string;
  leave_type: 'HOME_VISIT' | 'MEDICAL_LEAVE' | 'EMERGENCY_LEAVE' | 'VACATION' | 'SPECIAL_LEAVE';
  start_date: string;
  end_date: string;
  reason: string;
  destination?: string;
  contact_number?: string;
  requested_by?: string;
  parent_consent_status: 'PENDING' | 'GRANTED' | 'DENIED' | 'NOT_REQUIRED';
  parent_consent_remarks?: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  approved_by?: string;
  approved_at?: string;
  remarks?: string;
  student_name?: string;
  admission_number?: string;
  class_name?: string;
  section_name?: string;
  hostel_name?: string;
  room_number?: string;
  created_at?: string;
}

export interface HostelOuting {
  id: string;
  school_id: string;
  student_id: string;
  hostel_id: string;
  outing_date: string;
  time_out: string;
  expected_return: string;
  actual_return?: string;
  destination: string;
  purpose?: string;
  accompanying_person?: string;
  contact_phone?: string;
  parent_consent: string;
  approval_status: string;
  approved_by?: string;
  status: 'REQUESTED' | 'APPROVED' | 'OUT' | 'RETURNED' | 'OVERDUE' | 'CANCELLED';
  student_name?: string;
  admission_number?: string;
  class_name?: string;
  section_name?: string;
  hostel_name?: string;
  room_number?: string;
  created_at?: string;
}

export interface HostelMovement {
  id: string;
  school_id: string;
  student_id: string;
  hostel_id: string;
  movement_type: string;
  reference_id?: string;
  out_time: string;
  expected_return: string;
  actual_return?: string;
  authorized_by?: string;
  status: 'OUT' | 'RETURNED' | 'OVERDUE';
  remarks?: string;
  student_name?: string;
  admission_number?: string;
  student_phone?: string;
  hostel_name?: string;
  room_number?: string;
  bed_code?: string;
  is_overdue_now?: boolean;
  created_at?: string;
}

export interface HostelVisitor {
  id: string;
  school_id: string;
  hostel_id: string;
  student_id: string;
  visitor_name: string;
  phone: string;
  relationship: string;
  id_type?: string;
  id_reference?: string;
  visit_date: string;
  check_in_time?: string;
  expected_check_out?: string;
  actual_check_out?: string;
  purpose?: string;
  status: 'EXPECTED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
  approved_by?: string;
  notes?: string;
  student_name?: string;
  admission_number?: string;
  class_name?: string;
  section_name?: string;
  hostel_name?: string;
  room_number?: string;
  created_at?: string;
}

export interface HostelIncident {
  id: string;
  school_id: string;
  hostel_id: string;
  student_id?: string;
  incident_date: string;
  incident_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  reported_by: string;
  action_taken?: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
  resolved_by?: string;
  resolved_at?: string;
  notes?: string;
  student_name?: string;
  admission_number?: string;
  hostel_name?: string;
  created_at?: string;
}

export interface HostelMess {
  id: string;
  school_id: string;
  hostel_id?: string;
  name: string;
  code: string;
  description?: string;
  meal_schedule: Record<string, string>;
  is_active: boolean;
  hostel_name?: string;
  created_at?: string;
}

export interface HostelMenu {
  id: string;
  school_id: string;
  mess_id: string;
  day_of_week: string;
  meal_type: 'BREAKFAST' | 'LUNCH' | 'EVENING_SNACK' | 'DINNER';
  items: string;
  special_notes?: string;
  is_active: boolean;
  mess_name?: string;
  created_at?: string;
}

export interface HostelMaintenance {
  id: string;
  school_id: string;
  hostel_id: string;
  block_id?: string;
  room_id?: string;
  issue_title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  reported_by: string;
  assigned_to?: string;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  reported_date: string;
  resolved_date?: string;
  cost: number;
  remarks?: string;
  hostel_name?: string;
  block_name?: string;
  room_number?: string;
  created_at?: string;
}

export interface HostelNotice {
  id: string;
  school_id: string;
  hostel_id?: string;
  title: string;
  content: string;
  target_audience: 'ALL' | 'STUDENTS' | 'PARENTS' | 'WARDENS' | 'STAFF';
  priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  publish_date: string;
  expiry_date?: string;
  published_by: string;
  is_active: boolean;
  hostel_name?: string;
  created_at?: string;
}

export interface HostelRules {
  id: string;
  school_id: string;
  reporting_time: string;
  night_roll_call_time: string;
  outing_allowed_days: string;
  max_outings_per_month: number;
  visitor_start_time: string;
  visitor_end_time: string;
  quiet_hours_start: string;
  quiet_hours_end: string;
  leave_parent_consent_required: boolean;
  auto_overdue_threshold_mins: number;
  created_at?: string;
  updated_at?: string;
}

export interface HostelDashboardStats {
  capacity: {
    totalHostels: number;
    totalRooms: number;
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    reservedBeds: number;
    maintenanceBeds: number;
    occupancyPercentage: number;
  };
  students: {
    totalHostelStudents: number;
    boys: number;
    girls: number;
    studentsCurrentlyOut: number;
    studentsOnLeave: number;
    studentsOverdueReturn: number;
  };
  attendance: {
    totalMarked: number;
    present: number;
    absent: number;
    onLeave: number;
    outing: number;
    attendanceRate: number;
  };
  operations: {
    todayCheckins: number;
    todayCheckouts: number;
    pendingOutingApprovals: number;
    pendingLeaveRequests: number;
    activeVisitors: number;
    openIncidents: number;
    openMaintenance: number;
  };
  financial: {
    hostelFeeCharged: number;
    hostelFeeCollected: number;
    hostelFeeOutstanding: number;
    hostelConcessions: number;
  };
  recentMovements: HostelMovement[];
}

export interface OccupancyMapItem {
  hostel_id: string;
  hostel_name: string;
  hostel_gender: string;
  block_id: string;
  block_name: string;
  block_code: string;
  floor_id: string;
  floor_name: string;
  floor_number: number;
  room_id: string;
  room_number: string;
  room_type: string;
  room_capacity: number;
  room_status: string;
  bed_id: string;
  bed_number: string;
  bed_code: string;
  bed_status: string;
  bed_condition: string;
  student_id?: string;
  occupant_name?: string;
  occupant_adm_no?: string;
  occupant_gender?: string;
  occupant_class?: string;
  occupant_section?: string;
}
