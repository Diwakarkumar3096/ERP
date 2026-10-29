import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type {
  School,
  AcademicSession,
  ClassItem,
  SectionItem,
  StudentAttendanceRecord,
  StaffAttendanceRecord,
  AttendanceStatus,
  StaffAttendanceStatus,
  AttendanceSessionSlot,
  AttendanceDashboardStats,
  StudentMonthlyRegister,
  StaffMonthlyRegister,
  AttendanceCorrectionRequest,
  SchoolCalendarEvent,
  AttendanceSettings,
  Department
} from '../../types/erp.js';
import { StudentAttendanceModal } from './StudentAttendanceModal.js';
import { StaffAttendanceModal } from './StaffAttendanceModal.js';
import { CorrectionRequestModal } from './CorrectionRequestModal.js';
import { ReviewCorrectionModal } from './ReviewCorrectionModal.js';
import {
  CheckSquare,
  Users,
  UserCheck,
  Calendar,
  Clock,
  FileText,
  Settings,
  Download,
  AlertTriangle,
  Lock,
  Unlock,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Trash2,
  Eye,
  Sliders,
  ChevronRight,
  Briefcase,
  AlertCircle
} from 'lucide-react';

type AttendanceTab = 'student' | 'staff' | 'dashboard' | 'register' | 'corrections' | 'calendar';

export const AttendanceManagementView: React.FC = () => {
  const { user, activeSchool, isSuperAdmin, hasPermission } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<AttendanceTab>('student');
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(activeSchool?.id || '');

  // Academic Dropdowns
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [departments, setDepartments] = useState<Department[]>([]);

  // ----------------------------------------------------
  // TAB 1: STUDENT ATTENDANCE STATE
  // ----------------------------------------------------
  const [studentDate, setStudentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [studentSessionSlot, setStudentSessionSlot] = useState<AttendanceSessionSlot>('FULL_DAY');
  const [studentRecords, setStudentRecords] = useState<StudentAttendanceRecord[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentSaving, setStudentSaving] = useState(false);
  const [studentIsMarked, setStudentIsMarked] = useState(false);
  const [studentIsLocked, setStudentIsLocked] = useState(false);
  const [studentCalendarEvent, setStudentCalendarEvent] = useState<SchoolCalendarEvent | null>(null);
  const [studentCounts, setStudentCounts] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    onLeave: 0,
    unmarked: 0
  });

  const [mobileSearchQuery, setMobileSearchQuery] = useState('');

  // Reopen Modal
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopening, setReopening] = useState(false);

  // ----------------------------------------------------
  // TAB 2: STAFF ATTENDANCE STATE
  // ----------------------------------------------------
  const [staffDate, setStaffDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [staffTypeFilter, setStaffTypeFilter] = useState<'All' | 'Teaching' | 'Non-Teaching'>('All');
  const [staffDeptFilter, setStaffDeptFilter] = useState<string>('');
  const [staffRecords, setStaffRecords] = useState<StaffAttendanceRecord[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffIsMarked, setStaffIsMarked] = useState(false);
  const [staffCalendarEvent, setStaffCalendarEvent] = useState<SchoolCalendarEvent | null>(null);
  const [staffCounts, setStaffCounts] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    onLeave: 0,
    weeklyOff: 0,
    holiday: 0,
    unmarked: 0
  });

  // ----------------------------------------------------
  // TAB 3: DASHBOARD OVERVIEW STATE
  // ----------------------------------------------------
  const [dashDate, setDashDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dashData, setDashData] = useState<AttendanceDashboardStats | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  // ----------------------------------------------------
  // TAB 4: MONTHLY REGISTERS STATE
  // ----------------------------------------------------
  const [registerMode, setRegisterMode] = useState<'student' | 'staff'>('student');
  const [regMonth, setRegMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [regYear, setRegYear] = useState<string>(String(new Date().getFullYear()));
  const [studentRegister, setStudentRegister] = useState<StudentMonthlyRegister | null>(null);
  const [staffRegister, setStaffRegister] = useState<StaffMonthlyRegister | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);

  // ----------------------------------------------------
  // TAB 5: CORRECTIONS STATE
  // ----------------------------------------------------
  const [corrections, setCorrections] = useState<AttendanceCorrectionRequest[]>([]);
  const [correctionStatusFilter, setCorrectionStatusFilter] = useState<string>('ALL');
  const [correctionTypeFilter, setCorrectionTypeFilter] = useState<string>('ALL');
  const [correctionsLoading, setCorrectionsLoading] = useState(false);
  const [selectedCorrectionForReview, setSelectedCorrectionForReview] = useState<AttendanceCorrectionRequest | null>(null);

  // ----------------------------------------------------
  // TAB 6: CALENDAR & SETTINGS STATE
  // ----------------------------------------------------
  const [calendarEvents, setCalendarEvents] = useState<SchoolCalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventType, setNewEventType] = useState<'HOLIDAY' | 'SPECIAL_WORKING_DAY' | 'EVENT'>('HOLIDAY');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventIsInstructional, setNewEventIsInstructional] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);

  // Policy Settings
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Detail Modal Popups
  const [activeStudentModal, setActiveStudentModal] = useState<{
    id: string;
    name: string;
    admNo?: string;
    roll?: string;
  } | null>(null);

  const [activeStaffModal, setActiveStaffModal] = useState<{
    id: string;
    name: string;
    empId: string;
    designation?: string;
    department?: string;
  } | null>(null);

  const [showCreateCorrectionModal, setShowCreateCorrectionModal] = useState(false);

  // Sync selectedSchoolId with activeSchool
  useEffect(() => {
    if (activeSchool?.id && (!selectedSchoolId || !isSuperAdmin)) {
      setSelectedSchoolId(activeSchool.id);
    }
  }, [activeSchool?.id, isSuperAdmin]);

  // Load initial meta data (schools, sessions, classes, departments)
  useEffect(() => {
    api.schools.list().then((res) => {
      setSchools(res.schools || []);
      if (!selectedSchoolId && res.schools.length > 0) {
        setSelectedSchoolId(res.schools[0].id);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedSchoolId) return;

    // Load Sessions
    api.sessions.list(selectedSchoolId).then((res) => {
      setSessions(res.sessions || []);
      const current = res.sessions.find((s) => s.is_current) || res.sessions[0];
      if (current) setSelectedSessionId(current.id);
    }).catch(console.error);

    // Load Classes
    api.classes.list(selectedSchoolId).then((res) => {
      setClasses(res.classes || []);
      if (res.classes.length > 0) setSelectedClassId(res.classes[0].id);
    }).catch(console.error);

    // Load Departments
    api.employees.getDepartments(selectedSchoolId).then((res) => {
      setDepartments(res.departments || []);
    }).catch(console.error);

    // Load Settings
    api.attendance.getSettings(selectedSchoolId).then((res) => {
      setSettings(res.settings);
    }).catch(console.error);
  }, [selectedSchoolId]);

  // Load Sections when class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId('');
      return;
    }
    api.sections.list(selectedClassId).then((res) => {
      setSections(res.sections || []);
      if (res.sections.length > 0) {
        setSelectedSectionId(res.sections[0].id);
      } else {
        setSelectedSectionId('');
      }
    }).catch(console.error);
  }, [selectedClassId]);

  // ----------------------------------------------------
  // FETCH STUDENT ATTENDANCE ROSTER
  // ----------------------------------------------------
  const fetchStudentRoster = async () => {
    if (!selectedSchoolId || !selectedSessionId || !selectedClassId || !selectedSectionId) {
      return;
    }
    setStudentLoading(true);
    try {
      const res = await api.attendance.getStudentRoster({
        schoolId: selectedSchoolId,
        sessionId: selectedSessionId,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        date: studentDate,
        attendanceSession: studentSessionSlot
      });

      setStudentRecords(res.students || []);
      setStudentCounts(res.counts);
      setStudentIsMarked(res.isMarked);
      setStudentIsLocked(res.isLocked);
      setStudentCalendarEvent(res.calendarEvent);
    } catch (err: any) {
      addToast(err.message || 'Failed to load student roster', 'error');
    } finally {
      setStudentLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'student') {
      fetchStudentRoster();
    }
  }, [activeTab, selectedSchoolId, selectedSessionId, selectedClassId, selectedSectionId, studentDate, studentSessionSlot]);

  // ----------------------------------------------------
  // FETCH STAFF ATTENDANCE ROSTER
  // ----------------------------------------------------
  const fetchStaffRoster = async () => {
    if (!selectedSchoolId) return;
    setStaffLoading(true);
    try {
      const res = await api.attendance.getStaffRoster({
        schoolId: selectedSchoolId,
        date: staffDate,
        employeeType: staffTypeFilter !== 'All' ? staffTypeFilter : undefined,
        departmentId: staffDeptFilter || undefined
      });

      setStaffRecords(res.staff || []);
      setStaffCounts(res.counts);
      setStaffIsMarked(res.isMarked);
      setStaffCalendarEvent(res.calendarEvent);
    } catch (err: any) {
      addToast(err.message || 'Failed to load staff roster', 'error');
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaffRoster();
    }
  }, [activeTab, selectedSchoolId, staffDate, staffTypeFilter, staffDeptFilter]);

  // ----------------------------------------------------
  // FETCH DASHBOARD STATS
  // ----------------------------------------------------
  const fetchDashboardStats = async () => {
    setDashLoading(true);
    try {
      const res = await api.attendance.getDashboardStats({
        schoolId: selectedSchoolId || undefined,
        date: dashDate
      });
      setDashData(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setDashLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    }
  }, [activeTab, selectedSchoolId, dashDate]);

  // ----------------------------------------------------
  // FETCH MONTHLY REGISTER
  // ----------------------------------------------------
  const fetchRegister = async () => {
    setRegisterLoading(true);
    try {
      if (registerMode === 'student') {
        if (!selectedSchoolId || !selectedSessionId || !selectedClassId || !selectedSectionId) {
          setRegisterLoading(false);
          return;
        }
        const res = await api.attendance.getStudentRegister({
          schoolId: selectedSchoolId,
          sessionId: selectedSessionId,
          classId: selectedClassId,
          sectionId: selectedSectionId,
          month: regMonth,
          year: regYear
        });
        setStudentRegister(res);
      } else {
        const res = await api.attendance.getStaffRegister({
          schoolId: selectedSchoolId || undefined,
          month: regMonth,
          year: regYear,
          employeeType: staffTypeFilter !== 'All' ? staffTypeFilter : undefined
        });
        setStaffRegister(res);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to load register', 'error');
    } finally {
      setRegisterLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'register') {
      fetchRegister();
    }
  }, [activeTab, registerMode, selectedSchoolId, selectedSessionId, selectedClassId, selectedSectionId, regMonth, regYear, staffTypeFilter]);

  // ----------------------------------------------------
  // FETCH CORRECTIONS
  // ----------------------------------------------------
  const fetchCorrections = async () => {
    setCorrectionsLoading(true);
    try {
      const res = await api.attendance.getCorrections({
        schoolId: selectedSchoolId || undefined,
        status: correctionStatusFilter !== 'ALL' ? correctionStatusFilter : undefined,
        recordType: correctionTypeFilter !== 'ALL' ? correctionTypeFilter : undefined
      });
      setCorrections(res.corrections || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setCorrectionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'corrections') {
      fetchCorrections();
    }
  }, [activeTab, selectedSchoolId, correctionStatusFilter, correctionTypeFilter]);

  // ----------------------------------------------------
  // FETCH CALENDAR & SETTINGS
  // ----------------------------------------------------
  const fetchCalendar = async () => {
    if (!selectedSchoolId) return;
    setCalendarLoading(true);
    try {
      const [calRes, setRes] = await Promise.all([
        api.attendance.getCalendar({ schoolId: selectedSchoolId }),
        api.attendance.getSettings(selectedSchoolId)
      ]);
      setCalendarEvents(calRes.events || []);
      setSettings(setRes.settings);
    } catch (err: any) {
      console.error(err);
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'calendar') {
      fetchCalendar();
    }
  }, [activeTab, selectedSchoolId]);

  // ----------------------------------------------------
  // STUDENT ATTENDANCE ACTIONS
  // ----------------------------------------------------
  const handleMarkAllStudents = (status: AttendanceStatus) => {
    if (studentIsLocked) {
      addToast('Cannot modify: This attendance register is locked.', 'error');
      return;
    }
    const updated = studentRecords.map((s) => ({
      ...s,
      status,
      arrival_time: status === 'PRESENT' ? '08:20' : status === 'LATE' ? '08:45' : '',
      remarks: s.remarks || (status === 'PRESENT' ? 'On time' : '')
    }));
    setStudentRecords(updated);
    recalculateStudentCounts(updated);
  };

  const handleClearAllStudents = () => {
    if (studentIsLocked) return;
    const updated = studentRecords.map((s) => ({
      ...s,
      status: null,
      arrival_time: '',
      remarks: ''
    }));
    setStudentRecords(updated);
    recalculateStudentCounts(updated);
  };

  const handleStudentStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (studentIsLocked) {
      addToast('Attendance is locked for editing. Please unlock or request an administrative correction.', 'error');
      return;
    }
    const updated = studentRecords.map((s) => {
      if (s.student_id === studentId) {
        return {
          ...s,
          status,
          arrival_time: status === 'PRESENT' && !s.arrival_time ? '08:20' : status === 'LATE' ? '08:45' : s.arrival_time,
          remarks: s.remarks || ''
        };
      }
      return s;
    });
    setStudentRecords(updated);
    recalculateStudentCounts(updated);
  };

  const handleStudentFieldChange = (studentId: string, field: 'arrival_time' | 'remarks', value: string) => {
    if (studentIsLocked) return;
    setStudentRecords((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, [field]: value } : s))
    );
  };

  const recalculateStudentCounts = (records: StudentAttendanceRecord[]) => {
    let p = 0, a = 0, l = 0, hd = 0, ol = 0, un = 0;
    for (const r of records) {
      if (r.status === 'PRESENT') p++;
      else if (r.status === 'ABSENT') a++;
      else if (r.status === 'LATE') l++;
      else if (r.status === 'HALF_DAY') hd++;
      else if (r.status === 'ON_LEAVE') ol++;
      else un++;
    }
    setStudentCounts({
      total: records.length,
      present: p,
      absent: a,
      late: l,
      halfDay: hd,
      onLeave: ol,
      unmarked: un
    });
  };

  const handleSaveStudentAttendance = async () => {
    if (!selectedSchoolId || !selectedSessionId || !selectedClassId || !selectedSectionId) {
      addToast('Please select all required class and section parameters.', 'error');
      return;
    }

    if (studentCounts.unmarked > 0) {
      const confirmUnmarked = window.confirm(
        `There are ${studentCounts.unmarked} unmarked students remaining. Unmarked students will NOT be saved. Proceed to save?`
      );
      if (!confirmUnmarked) return;
    }

    const validRecords = studentRecords
      .filter((s) => s.status !== null)
      .map((s) => ({
        student_id: s.student_id,
        status: s.status!,
        arrival_time: s.arrival_time || undefined,
        remarks: s.remarks || undefined,
        attendance_id: s.attendance_id || null
      }));

    if (validRecords.length === 0) {
      addToast('No student attendance status marked yet.', 'error');
      return;
    }

    setStudentSaving(true);
    try {
      const res = await api.attendance.saveStudentBulk({
        school_id: selectedSchoolId,
        session_id: selectedSessionId,
        class_id: selectedClassId,
        section_id: selectedSectionId,
        date: studentDate,
        attendance_session: studentSessionSlot,
        records: validRecords
      });

      addToast(`Attendance saved successfully (${res.count} student records updated).`, 'success');
      await fetchStudentRoster();
    } catch (err: any) {
      addToast(err.message || 'Failed to save student attendance', 'error');
    } finally {
      setStudentSaving(false);
    }
  };

  const handleUnlockAttendance = async () => {
    if (!reopenReason.trim()) {
      addToast('Please provide an official justification for reopening the locked attendance.', 'error');
      return;
    }
    setReopening(true);
    try {
      await api.attendance.unlockStudentAttendance({
        school_id: selectedSchoolId,
        class_id: selectedClassId,
        section_id: selectedSectionId,
        date: studentDate,
        attendance_session: studentSessionSlot,
        reason: reopenReason.trim()
      });

      addToast('Attendance register successfully reopened for authorized editing.', 'success');
      setShowReopenModal(false);
      setReopenReason('');
      await fetchStudentRoster();
    } catch (err: any) {
      addToast(err.message || 'Failed to reopen attendance', 'error');
    } finally {
      setReopening(false);
    }
  };

  // ----------------------------------------------------
  // STAFF ATTENDANCE ACTIONS
  // ----------------------------------------------------
  const handleMarkAllStaff = (status: StaffAttendanceStatus) => {
    const updated = staffRecords.map((s) => ({
      ...s,
      status,
      check_in_time: status === 'PRESENT' ? '08:30' : status === 'LATE' ? '08:50' : '',
      check_out_time: status === 'PRESENT' ? '16:00' : '',
      work_duration_minutes: status === 'PRESENT' ? 450 : 0,
      remarks: status === 'PRESENT' ? 'Full duty' : ''
    }));
    setStaffRecords(updated);
    recalculateStaffCounts(updated);
  };

  const handleStaffStatusChange = (employeeId: string, status: StaffAttendanceStatus) => {
    const updated = staffRecords.map((s) => {
      if (s.employee_id === employeeId) {
        return {
          ...s,
          status,
          check_in_time: status === 'PRESENT' && !s.check_in_time ? '08:30' : s.check_in_time,
          check_out_time: status === 'PRESENT' && !s.check_out_time ? '16:00' : s.check_out_time,
          work_duration_minutes: status === 'PRESENT' ? 450 : s.work_duration_minutes
        };
      }
      return s;
    });
    setStaffRecords(updated);
    recalculateStaffCounts(updated);
  };

  const handleStaffFieldChange = (
    employeeId: string,
    field: 'check_in_time' | 'check_out_time' | 'remarks',
    value: string
  ) => {
    setStaffRecords((prev) =>
      prev.map((s) => {
        if (s.employee_id === employeeId) {
          const updated = { ...s, [field]: value };
          // Calculate work duration if both times exist
          if (updated.check_in_time && updated.check_out_time) {
            const [inH, inM] = updated.check_in_time.split(':').map(Number);
            const [outH, outM] = updated.check_out_time.split(':').map(Number);
            const inMins = inH * 60 + inM;
            const outMins = outH * 60 + outM;
            if (outMins >= inMins) {
              updated.work_duration_minutes = outMins - inMins;
            }
          }
          return updated;
        }
        return s;
      })
    );
  };

  const recalculateStaffCounts = (records: StaffAttendanceRecord[]) => {
    let p = 0, a = 0, l = 0, hd = 0, ol = 0, wo = 0, hol = 0, un = 0;
    for (const r of records) {
      if (r.status === 'PRESENT') p++;
      else if (r.status === 'ABSENT') a++;
      else if (r.status === 'LATE') l++;
      else if (r.status === 'HALF_DAY') hd++;
      else if (r.status === 'ON_LEAVE') ol++;
      else if (r.status === 'WEEKLY_OFF') wo++;
      else if (r.status === 'HOLIDAY') hol++;
      else un++;
    }
    setStaffCounts({
      total: records.length,
      present: p,
      absent: a,
      late: l,
      halfDay: hd,
      onLeave: ol,
      weeklyOff: wo,
      holiday: hol,
      unmarked: un
    });
  };

  const handleSaveStaffAttendance = async () => {
    if (!selectedSchoolId) return;
    const validRecords = staffRecords
      .filter((s) => s.status !== null)
      .map((s) => ({
        employee_id: s.employee_id,
        status: s.status!,
        check_in_time: s.check_in_time || undefined,
        check_out_time: s.check_out_time || undefined,
        work_duration_minutes: s.work_duration_minutes || undefined,
        remarks: s.remarks || undefined,
        attendance_id: s.attendance_id || null
      }));

    if (validRecords.length === 0) {
      addToast('No staff attendance status marked yet.', 'error');
      return;
    }

    setStaffSaving(true);
    try {
      const res = await api.attendance.saveStaffBulk({
        school_id: selectedSchoolId,
        date: staffDate,
        records: validRecords
      });

      addToast(`Staff attendance saved successfully (${res.count} staff records updated).`, 'success');
      await fetchStaffRoster();
    } catch (err: any) {
      addToast(err.message || 'Failed to save staff attendance', 'error');
    } finally {
      setStaffSaving(false);
    }
  };

  const handleQuickCheckIn = async (employeeId: string) => {
    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      await api.attendance.checkInStaff({
        employee_id: employeeId,
        date: staffDate,
        check_in_time: timeStr
      });
      addToast(`Recorded check-in at ${timeStr}`, 'success');
      fetchStaffRoster();
    } catch (err: any) {
      addToast(err.message || 'Failed to record check-in', 'error');
    }
  };

  const handleQuickCheckOut = async (employeeId: string) => {
    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      await api.attendance.checkOutStaff({
        employee_id: employeeId,
        date: staffDate,
        check_out_time: timeStr
      });
      addToast(`Recorded check-out at ${timeStr}`, 'success');
      fetchStaffRoster();
    } catch (err: any) {
      addToast(err.message || 'Failed to record check-out', 'error');
    }
  };

  // ----------------------------------------------------
  // CALENDAR & SETTINGS ACTIONS
  // ----------------------------------------------------
  const handleAddCalendarEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId || !selectedSessionId || !newEventDate || !newEventTitle.trim()) {
      addToast('Please complete all required event fields.', 'error');
      return;
    }
    setAddingEvent(true);
    try {
      await api.attendance.createCalendarEvent({
        school_id: selectedSchoolId,
        session_id: selectedSessionId,
        date: newEventDate,
        event_type: newEventType,
        title: newEventTitle.trim(),
        description: newEventDesc.trim() || undefined,
        is_instructional_day: newEventIsInstructional
      });

      addToast('Calendar event added successfully.', 'success');
      setShowAddEventModal(false);
      setNewEventDate('');
      setNewEventTitle('');
      setNewEventDesc('');
      await fetchCalendar();
    } catch (err: any) {
      addToast(err.message || 'Failed to add calendar event', 'error');
    } finally {
      setAddingEvent(false);
    }
  };

  const handleDeleteCalendarEvent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this calendar event?')) return;
    try {
      await api.attendance.deleteCalendarEvent(id);
      addToast('Calendar event deleted.', 'info');
      fetchCalendar();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete event', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !selectedSchoolId) return;
    setSavingSettings(true);
    try {
      await api.attendance.updateSettings({
        school_id: selectedSchoolId,
        lock_after_days: Number(settings.lock_after_days),
        allow_future_marking: settings.allow_future_marking,
        allow_holiday_marking: settings.allow_holiday_marking,
        default_session: settings.default_session,
        student_min_percentage: Number(settings.student_min_percentage),
        staff_min_percentage: Number(settings.staff_min_percentage),
        staff_check_in_time: settings.staff_check_in_time,
        staff_check_out_time: settings.staff_check_out_time
      });
      addToast('Attendance policies updated successfully.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Jump from Dashboard class card to Student Attendance tab
  const handleOpenClassRegister = (classId: string, sectionId: string) => {
    setSelectedClassId(classId);
    setSelectedSectionId(sectionId);
    setStudentDate(dashDate);
    setActiveTab('student');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & School Switcher */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-600">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Attendance Management System</h1>
              <p className="text-xs text-slate-500 font-medium">
                Integrated daily registers, staff biometric logs, monthly compliance registers, and approvals
              </p>
            </div>
          </div>
        </div>

        {/* Global School Selector for Multi-School ERP */}
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">School:</span>
              <select
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setShowCreateCorrectionModal(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Request Correction
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-1 bg-slate-200/60 p-1.5 rounded-2xl w-full sm:w-fit overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('student')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'student'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <UserCheck className="w-4 h-4 text-blue-600" /> Student Daily Attendance
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'staff'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Briefcase className="w-4 h-4 text-purple-600" /> Faculty & Staff Attendance
        </button>

        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" /> Daily Overview & Dashboard
        </button>

        <button
          onClick={() => setActiveTab('register')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'register'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> Monthly Registers & Reports
        </button>

        <button
          onClick={() => setActiveTab('corrections')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'corrections'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-amber-600" /> Correction Requests
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'calendar'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Settings className="w-4 h-4 text-slate-600" /> Calendar & Settings
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STUDENT ATTENDANCE */}
      {/* ========================================================================= */}
      {activeTab === 'student' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Academic Session</label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.is_current ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Section</label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  disabled={sections.length === 0}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                >
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Attendance Date</label>
                <input
                  type="date"
                  value={studentDate}
                  onChange={(e) => setStudentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Session Slot</label>
                <select
                  value={studentSessionSlot}
                  onChange={(e) => setStudentSessionSlot(e.target.value as AttendanceSessionSlot)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="FULL_DAY">Full Day (Standard)</option>
                  <option value="MORNING">Morning Session</option>
                  <option value="AFTERNOON">Afternoon Session</option>
                </select>
              </div>
            </div>
          </div>

          {/* Calendar Notice / Warning if Holiday */}
          {studentCalendarEvent && (
            <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
              studentCalendarEvent.is_instructional_day
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <div>
                  <strong className="font-bold">{studentCalendarEvent.title}</strong> — {studentCalendarEvent.event_type}
                  {studentCalendarEvent.description && <span className="ml-1 text-slate-600">({studentCalendarEvent.description})</span>}
                </div>
              </div>
              <span className="font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-white/70 border">
                {studentCalendarEvent.is_instructional_day ? 'Working Day' : 'Official Holiday'}
              </span>
            </div>
          )}

          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Students</span>
              <span className="text-xl font-extrabold text-slate-800 mt-0.5 block">{studentCounts.total}</span>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-200 shadow-sm text-center">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Present</span>
              <span className="text-xl font-extrabold text-emerald-800 mt-0.5 block">{studentCounts.present}</span>
            </div>
            <div className="bg-rose-50 rounded-xl p-3.5 border border-rose-200 shadow-sm text-center">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Absent</span>
              <span className="text-xl font-extrabold text-rose-800 mt-0.5 block">{studentCounts.absent}</span>
            </div>
            <div className="bg-amber-50 rounded-xl p-3.5 border border-amber-200 shadow-sm text-center">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Late</span>
              <span className="text-xl font-extrabold text-amber-800 mt-0.5 block">{studentCounts.late}</span>
            </div>
            <div className="bg-purple-50 rounded-xl p-3.5 border border-purple-200 shadow-sm text-center">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Half Day</span>
              <span className="text-xl font-extrabold text-purple-800 mt-0.5 block">{studentCounts.halfDay}</span>
            </div>
            <div className="bg-blue-50 rounded-xl p-3.5 border border-blue-200 shadow-sm text-center">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">On Leave</span>
              <span className="text-xl font-extrabold text-blue-800 mt-0.5 block">{studentCounts.onLeave}</span>
            </div>
            <div className={`rounded-xl p-3.5 border shadow-sm text-center ${studentCounts.unmarked > 0 ? 'bg-amber-500/10 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Unmarked</span>
              <span className={`text-xl font-extrabold mt-0.5 block ${studentCounts.unmarked > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                {studentCounts.unmarked}
              </span>
            </div>
          </div>

          {/* Quick Actions & Status Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-500">Quick Mark:</span>
              <button
                type="button"
                onClick={() => handleMarkAllStudents('PRESENT')}
                disabled={studentIsLocked}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-bold transition-colors disabled:opacity-50"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => handleMarkAllStudents('ABSENT')}
                disabled={studentIsLocked}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg font-bold transition-colors disabled:opacity-50"
              >
                Mark All Absent
              </button>
              <button
                type="button"
                onClick={handleClearAllStudents}
                disabled={studentIsLocked}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Reset Register
              </button>
            </div>

            <div className="flex items-center gap-3">
              {studentIsLocked ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg font-bold">
                    <Lock className="w-3.5 h-3.5" /> Register Locked
                  </span>
                  {hasPermission('attendance.unlock') && (
                    <button
                      type="button"
                      onClick={() => setShowReopenModal(true)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Unlock className="w-3.5 h-3.5" /> Reopen Register
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {studentIsMarked && (
                    <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Saved for Date
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveStudentAttendance}
                    disabled={studentSaving || studentRecords.length === 0}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {studentSaving ? 'Saving Records...' : 'Save & Submit Attendance'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {studentLoading ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                <p className="text-xs font-semibold">Loading student enrollment list...</p>
              </div>
            ) : studentRecords.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No active students enrolled in this section.</p>
                <p className="text-xs">Select another class or section, or enroll students via Student Management.</p>
              </div>
            ) : (
              <div>
                {/* Mobile Search Filter */}
                <div className="md:hidden p-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={mobileSearchQuery}
                      onChange={(e) => setMobileSearchQuery(e.target.value)}
                      placeholder="Search student by name, roll, admission..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">Roll</th>
                        <th className="py-3 px-4 w-28">Admission No</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4 text-center w-72">Attendance Status</th>
                        <th className="py-3 px-4 w-32">Arrival Time</th>
                        <th className="py-3 px-4">Remarks</th>
                        <th className="py-3 px-4 text-right w-24">History</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentRecords
                        .filter((stu) => {
                          if (!mobileSearchQuery.trim()) return true;
                          const q = mobileSearchQuery.toLowerCase();
                          return (
                            stu.student_name.toLowerCase().includes(q) ||
                            (stu.admission_number ? stu.admission_number.toLowerCase().includes(q) : false) ||
                            (stu.roll_number && stu.roll_number.toString().includes(q))
                          );
                        })
                        .map((stu) => {
                          return (
                            <tr
                              key={stu.student_id}
                              className={`hover:bg-slate-50/70 transition-colors ${
                                stu.status === null ? 'bg-amber-50/30' : ''
                              }`}
                            >
                              <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                                {stu.roll_number || '—'}
                              </td>
                              <td className="py-3 px-4 font-mono font-medium text-slate-600">
                                {stu.admission_number}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                                    {stu.student_name.charAt(0)}
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-800 block">{stu.student_name}</span>
                                    {stu.gender && <span className="text-[10px] text-slate-400 capitalize">{stu.gender}</span>}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 gap-0.5">
                                  {(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE'] as AttendanceStatus[]).map((st) => {
                                    const isSelected = stu.status === st;
                                    let colorClass = 'text-slate-600 hover:bg-slate-200/60';
                                    if (isSelected) {
                                      if (st === 'PRESENT') colorClass = 'bg-emerald-600 text-white font-bold shadow-sm';
                                      else if (st === 'ABSENT') colorClass = 'bg-rose-600 text-white font-bold shadow-sm';
                                      else if (st === 'LATE') colorClass = 'bg-amber-500 text-white font-bold shadow-sm';
                                      else if (st === 'HALF_DAY') colorClass = 'bg-purple-600 text-white font-bold shadow-sm';
                                      else if (st === 'ON_LEAVE') colorClass = 'bg-blue-600 text-white font-bold shadow-sm';
                                    }

                                    return (
                                      <button
                                        key={st}
                                        type="button"
                                        onClick={() => handleStudentStatusChange(stu.student_id, st)}
                                        disabled={studentIsLocked}
                                        className={`px-2 py-1 rounded text-[10px] uppercase font-semibold transition-all ${colorClass}`}
                                        title={st}
                                      >
                                        {st === 'PRESENT' ? 'P' : st === 'ABSENT' ? 'A' : st === 'LATE' ? 'L' : st === 'HALF_DAY' ? 'HD' : 'OL'}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="time"
                                  value={stu.arrival_time || ''}
                                  onChange={(e) => handleStudentFieldChange(stu.student_id, 'arrival_time', e.target.value)}
                                  disabled={studentIsLocked || stu.status === 'ABSENT'}
                                  className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:opacity-50"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="text"
                                  value={stu.remarks || ''}
                                  onChange={(e) => handleStudentFieldChange(stu.student_id, 'remarks', e.target.value)}
                                  disabled={studentIsLocked}
                                  placeholder="Add remark..."
                                  className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
                                />
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveStudentModal({
                                      id: stu.student_id,
                                      name: stu.student_name,
                                      admNo: stu.admission_number,
                                      roll: stu.roll_number
                                    })
                                  }
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View individual attendance profile"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Touch Cards View */}
                <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
                  {studentRecords
                    .filter((stu) => {
                      if (!mobileSearchQuery.trim()) return true;
                      const q = mobileSearchQuery.toLowerCase();
                      return (
                        stu.student_name.toLowerCase().includes(q) ||
                        (stu.admission_number ? stu.admission_number.toLowerCase().includes(q) : false) ||
                        (stu.roll_number && stu.roll_number.toString().includes(q))
                      );
                    })
                    .map((stu) => {
                      return (
                        <div
                          key={stu.student_id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            stu.status === 'PRESENT'
                              ? 'bg-emerald-50/30 border-emerald-200'
                              : stu.status === 'ABSENT'
                              ? 'bg-rose-50/30 border-rose-200'
                              : stu.status === 'LATE'
                              ? 'bg-amber-50/30 border-amber-200'
                              : 'bg-white border-slate-200 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                                {stu.student_name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900">{stu.student_name}</div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  Roll: <span className="font-bold text-slate-700">{stu.roll_number || '—'}</span> · Adm: {stu.admission_number}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setActiveStudentModal({
                                  id: stu.student_id,
                                  name: stu.student_name,
                                  admNo: stu.admission_number,
                                  roll: stu.roll_number
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                              title="History"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Large Touch Controls */}
                          <div className="grid grid-cols-4 gap-1.5 mt-3">
                            <button
                              type="button"
                              onClick={() => handleStudentStatusChange(stu.student_id, 'PRESENT')}
                              disabled={studentIsLocked}
                              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all min-h-[42px] flex flex-col items-center justify-center ${
                                stu.status === 'PRESENT'
                                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300'
                              }`}
                            >
                              <span className="text-[11px]">Present</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStudentStatusChange(stu.student_id, 'ABSENT')}
                              disabled={studentIsLocked}
                              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all min-h-[42px] flex flex-col items-center justify-center ${
                                stu.status === 'ABSENT'
                                  ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300'
                              }`}
                            >
                              <span className="text-[11px]">Absent</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStudentStatusChange(stu.student_id, 'LATE')}
                              disabled={studentIsLocked}
                              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all min-h-[42px] flex flex-col items-center justify-center ${
                                stu.status === 'LATE'
                                  ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300'
                              }`}
                            >
                              <span className="text-[11px]">Late</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStudentStatusChange(stu.student_id, stu.status === 'HALF_DAY' ? 'ON_LEAVE' : 'HALF_DAY')}
                              disabled={studentIsLocked}
                              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all min-h-[42px] flex flex-col items-center justify-center ${
                                stu.status === 'HALF_DAY' || stu.status === 'ON_LEAVE'
                                  ? 'bg-purple-600 text-white shadow-sm'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300'
                              }`}
                            >
                              <span className="text-[11px]">{stu.status === 'ON_LEAVE' ? 'Leave' : 'Half Day'}</span>
                            </button>
                          </div>

                          {/* Remarks & Arrival Time inline */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-3 gap-2">
                            <div className="col-span-1">
                              <input
                                type="time"
                                value={stu.arrival_time || ''}
                                onChange={(e) => handleStudentFieldChange(stu.student_id, 'arrival_time', e.target.value)}
                                disabled={studentIsLocked || stu.status === 'ABSENT'}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-mono"
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="text"
                                value={stu.remarks || ''}
                                onChange={(e) => handleStudentFieldChange(stu.student_id, 'remarks', e.target.value)}
                                disabled={studentIsLocked}
                                placeholder="Add remark..."
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px]"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Mobile Sticky Save Bar */}
                {!studentIsLocked && (
                  <div className="md:hidden sticky bottom-12 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-20 flex items-center justify-between shadow-lg">
                    <div className="text-xs font-semibold text-slate-700">
                      <span className="text-emerald-700 font-bold">{studentCounts.present}</span> Present · <span className="text-rose-700 font-bold">{studentCounts.absent}</span> Absent
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveStudentAttendance}
                      disabled={studentSaving || studentRecords.length === 0}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
                    >
                      {studentSaving ? 'Saving...' : 'Save Register'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STAFF ATTENDANCE */}
      {/* ========================================================================= */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Attendance Date</label>
                <input
                  type="date"
                  value={staffDate}
                  onChange={(e) => setStaffDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Employee Type</label>
                <select
                  value={staffTypeFilter}
                  onChange={(e) => setStaffTypeFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="All">All Faculty & Staff</option>
                  <option value="Teaching">Teaching Faculty Only</option>
                  <option value="Non-Teaching">Non-Teaching Staff Only</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Department</label>
                <select
                  value={staffDeptFilter}
                  onChange={(e) => setStaffDeptFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={fetchStaffRoster}
                  className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Roster
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Holiday Banner if applicable */}
          {staffCalendarEvent && (
            <div className="p-4 rounded-xl border bg-amber-50 border-amber-200 text-amber-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>
                  <strong>{staffCalendarEvent.title}</strong> — {staffCalendarEvent.event_type}
                </span>
              </div>
              <span className="font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-white/70 border">
                Official School Holiday
              </span>
            </div>
          )}

          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Staff</span>
              <span className="text-xl font-extrabold text-slate-800 mt-0.5 block">{staffCounts.total}</span>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 shadow-sm text-center">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Present</span>
              <span className="text-xl font-extrabold text-emerald-800 mt-0.5 block">{staffCounts.present}</span>
            </div>
            <div className="bg-rose-50 rounded-xl p-3 border border-rose-200 shadow-sm text-center">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Absent</span>
              <span className="text-xl font-extrabold text-rose-800 mt-0.5 block">{staffCounts.absent}</span>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 shadow-sm text-center">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Late</span>
              <span className="text-xl font-extrabold text-amber-800 mt-0.5 block">{staffCounts.late}</span>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 border border-purple-200 shadow-sm text-center">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Half Day</span>
              <span className="text-xl font-extrabold text-purple-800 mt-0.5 block">{staffCounts.halfDay}</span>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 shadow-sm text-center">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Leave</span>
              <span className="text-xl font-extrabold text-blue-800 mt-0.5 block">{staffCounts.onLeave}</span>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-200 shadow-sm text-center">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Weekly Off</span>
              <span className="text-xl font-extrabold text-indigo-800 mt-0.5 block">{staffCounts.weeklyOff}</span>
            </div>
            <div className={`rounded-xl p-3 border shadow-sm text-center ${staffCounts.unmarked > 0 ? 'bg-amber-500/10 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Unmarked</span>
              <span className={`text-xl font-extrabold mt-0.5 block ${staffCounts.unmarked > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                {staffCounts.unmarked}
              </span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-500">Roster Shortcuts:</span>
              <button
                type="button"
                onClick={() => handleMarkAllStaff('PRESENT')}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-bold transition-colors"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => handleMarkAllStaff('WEEKLY_OFF')}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg font-bold transition-colors"
              >
                Mark Sunday / Weekly Off
              </button>
            </div>

            <div className="flex items-center gap-3">
              {staffIsMarked && (
                <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Staff Roster Saved
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveStaffAttendance}
                disabled={staffSaving || staffRecords.length === 0}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {staffSaving ? 'Saving Roster...' : 'Save Staff Attendance'}
              </button>
            </div>
          </div>

          {/* Staff Roster Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {staffLoading ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600" />
                <p className="text-xs font-semibold">Loading faculty and staff roster...</p>
              </div>
            ) : staffRecords.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Briefcase className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No active employees matching filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4 w-28">Emp ID</th>
                      <th className="py-3 px-4">Employee Name</th>
                      <th className="py-3 px-4">Department & Designation</th>
                      <th className="py-3 px-4 text-center w-80">Status</th>
                      <th className="py-3 px-4 w-40">Check-In / Out</th>
                      <th className="py-3 px-4 w-20 text-center">Duty</th>
                      <th className="py-3 px-4">Remarks</th>
                      <th className="py-3 px-4 text-right w-24">Profile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffRecords.map((stf) => {
                      const durationHours = stf.work_duration_minutes
                        ? (stf.work_duration_minutes / 60).toFixed(1)
                        : null;

                      return (
                        <tr key={stf.employee_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            {stf.employee_id_number}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {stf.profile_photo ? (
                                <img
                                  src={stf.profile_photo}
                                  alt=""
                                  className="w-7 h-7 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                                  {stf.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-slate-800 block">{stf.name}</span>
                                <span className="text-[10px] text-slate-400 capitalize">{stf.employee_type}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 block">{stf.designation_name || 'Staff'}</span>
                            <span className="text-[10px] text-slate-500">{stf.department_name || 'General'}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 gap-0.5">
                              {(
                                [
                                  'PRESENT',
                                  'ABSENT',
                                  'LATE',
                                  'HALF_DAY',
                                  'ON_LEAVE',
                                  'WEEKLY_OFF',
                                  'HOLIDAY'
                                ] as StaffAttendanceStatus[]
                              ).map((st) => {
                                const isSelected = stf.status === st;
                                let colorClass = 'text-slate-600 hover:bg-slate-200/60';
                                if (isSelected) {
                                  if (st === 'PRESENT') colorClass = 'bg-emerald-600 text-white font-bold shadow-sm';
                                  else if (st === 'ABSENT') colorClass = 'bg-rose-600 text-white font-bold shadow-sm';
                                  else if (st === 'LATE') colorClass = 'bg-amber-500 text-white font-bold shadow-sm';
                                  else if (st === 'HALF_DAY') colorClass = 'bg-purple-600 text-white font-bold shadow-sm';
                                  else if (st === 'ON_LEAVE') colorClass = 'bg-blue-600 text-white font-bold shadow-sm';
                                  else if (st === 'WEEKLY_OFF') colorClass = 'bg-indigo-600 text-white font-bold shadow-sm';
                                  else if (st === 'HOLIDAY') colorClass = 'bg-slate-700 text-white font-bold shadow-sm';
                                }

                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleStaffStatusChange(stf.employee_id, st)}
                                    className={`px-1.5 py-1 rounded text-[10px] uppercase font-semibold transition-all ${colorClass}`}
                                    title={st}
                                  >
                                    {st === 'PRESENT' ? 'P' : st === 'ABSENT' ? 'A' : st === 'LATE' ? 'L' : st === 'HALF_DAY' ? 'HD' : st === 'ON_LEAVE' ? 'LV' : st === 'WEEKLY_OFF' ? 'WO' : 'H'}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 font-mono">
                              <input
                                type="time"
                                value={stf.check_in_time || ''}
                                onChange={(e) => handleStaffFieldChange(stf.employee_id, 'check_in_time', e.target.value)}
                                className="w-18 px-1.5 py-1 border border-slate-200 rounded text-[11px]"
                                placeholder="In"
                              />
                              <span className="text-slate-400">-</span>
                              <input
                                type="time"
                                value={stf.check_out_time || ''}
                                onChange={(e) => handleStaffFieldChange(stf.employee_id, 'check_out_time', e.target.value)}
                                className="w-18 px-1.5 py-1 border border-slate-200 rounded text-[11px]"
                                placeholder="Out"
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                            {durationHours ? `${durationHours}h` : '—'}
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={stf.remarks || ''}
                              onChange={(e) => handleStaffFieldChange(stf.employee_id, 'remarks', e.target.value)}
                              placeholder="Remarks..."
                              className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs"
                            />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveStaffModal({
                                  id: stf.employee_id,
                                  name: stf.name,
                                  empId: stf.employee_id_number,
                                  designation: stf.designation_name,
                                  department: stf.department_name
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="View staff attendance record"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ATTENDANCE DASHBOARD OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top Bar with Date Selector */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Daily Attendance Overview</h2>
              <p className="text-xs text-slate-500">School-wide attendance analytics, class submission progress, and health metrics</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600">Select Date:</span>
              <input
                type="date"
                value={dashDate}
                onChange={(e) => setDashDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={fetchDashboardStats}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {dashLoading ? (
            <div className="p-16 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="text-xs font-semibold">Aggregating attendance metrics...</p>
            </div>
          ) : dashData ? (
            <>
              {/* High Level Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Student Metric Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student Attendance</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {dashData.studentStats.completionRate}% Submitted
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {dashData.studentStats.present}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      present out of {dashData.studentStats.totalEnrolled} active students
                    </span>
                  </div>
                  {/* Mini breakdown */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-emerald-700 block font-semibold">Present</span>
                      <strong className="text-slate-800">{dashData.studentStats.present}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-rose-700 block font-semibold">Absent</span>
                      <strong className="text-slate-800">{dashData.studentStats.absent}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-700 block font-semibold">Late</span>
                      <strong className="text-slate-800">{dashData.studentStats.late}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-700 block font-semibold">Leave</span>
                      <strong className="text-slate-800">{dashData.studentStats.onLeave}</strong>
                    </div>
                  </div>
                </div>

                {/* Staff Metric Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faculty & Staff</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                      {dashData.staffStats.completionRate}% On Duty
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {dashData.staffStats.present}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      present on campus today
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-emerald-700 block font-semibold">Present</span>
                      <strong className="text-slate-800">{dashData.staffStats.present}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-rose-700 block font-semibold">Absent</span>
                      <strong className="text-slate-800">{dashData.staffStats.absent}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-700 block font-semibold">Late</span>
                      <strong className="text-slate-800">{dashData.staffStats.late}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-700 block font-semibold">Leave</span>
                      <strong className="text-slate-800">{dashData.staffStats.onLeave}</strong>
                    </div>
                  </div>
                </div>

                {/* Approvals & Calendar Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Requests & Calendar</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      {dashData.pendingCorrections} Pending
                    </span>
                  </div>
                  <div className="space-y-2 pt-1 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-600">Pending Corrections:</span>
                      <button
                        onClick={() => setActiveTab('corrections')}
                        className="text-amber-700 font-bold hover:underline"
                      >
                        {dashData.pendingCorrections} to review ➔
                      </button>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-500 text-[11px] block">Day Status:</span>
                      <span className="font-bold text-slate-800">
                        {dashData.calendarEvent ? dashData.calendarEvent.title : 'Standard Instructional Day'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Class-wise Submission Progress */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Class Attendance Submission Status</h3>
                    <p className="text-xs text-slate-500">Live progress of daily roll call submission by class teachers</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {dashData.classProgress.map((cp) => {
                    return (
                      <div
                        key={`${cp.class_id}_${cp.section_id}`}
                        className={`p-4 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                          cp.is_completed
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : 'bg-slate-50 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm">
                              {cp.class_name} - {cp.section_name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                cp.is_completed
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {cp.is_completed ? 'Completed' : 'Pending'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-1">
                            Teacher: <strong className="text-slate-700">{cp.class_teacher_name || 'Unassigned'}</strong>
                          </span>
                          <span className="text-[11px] text-slate-600 block mt-0.5">
                            Roll marked: <strong>{cp.marked_students}</strong> / {cp.total_students} students
                          </span>
                        </div>

                        <div className="pt-3 mt-3 border-t border-slate-200/60 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenClassRegister(cp.class_id, cp.section_id)}
                            className="text-blue-600 hover:text-blue-800 font-bold text-[11px] flex items-center gap-1"
                          >
                            Open Register <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-500">No dashboard data available.</div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MONTHLY REGISTERS & REPORTS */}
      {/* ========================================================================= */}
      {activeTab === 'register' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-xl p-1 bg-slate-100 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setRegisterMode('student')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    registerMode === 'student' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Student Register
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterMode('staff')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    registerMode === 'staff' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Staff Timesheet Register
                </button>
              </div>

              {/* Month / Year */}
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={regMonth}
                  onChange={(e) => setRegMonth(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                >
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ].map((m, idx) => (
                    <option key={idx + 1} value={String(idx + 1)}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={regYear}
                  onChange={(e) => setRegYear(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                >
                  {['2024', '2025', '2026', '2027'].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Student Class / Section Filters if Student Mode */}
            {registerMode === 'student' && (
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                >
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Sec {sec.name}
                    </option>
                  ))}
                </select>

                {hasPermission('attendance.student.export') && (
                  <a
                    href={api.attendance.studentRegisterExportUrl({
                      schoolId: selectedSchoolId,
                      sessionId: selectedSessionId,
                      classId: selectedClassId,
                      sectionId: selectedSectionId,
                      month: regMonth,
                      year: regYear
                    })}
                    download
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Student Matrix Register */}
          {registerMode === 'student' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-4 space-y-4">
              {registerLoading ? (
                <div className="p-16 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  <p className="text-xs font-semibold">Generating monthly attendance register matrix...</p>
                </div>
              ) : !studentRegister || studentRegister.students.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No attendance records found for this class in selected month.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-600 border-b pb-3">
                    <span className="font-bold text-slate-900">
                      {studentRegister.meta.class_name} - {studentRegister.meta.section_name} • Total Instructional Days: {studentRegister.totalInstructionalDays}
                    </span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> P: Present</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> A: Absent</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> L: Late</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span> HD: Half Day</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> OL: On Leave</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span> H/Sun: Holiday</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b">
                          <th className="p-2 border sticky left-0 bg-slate-100 z-10 w-12 text-center">Roll</th>
                          <th className="p-2 border sticky left-12 bg-slate-100 z-10 min-w-36">Student Name</th>
                          {studentRegister.daysMeta.map((dm) => (
                            <th
                              key={dm.day}
                              className={`p-1 border text-center w-7 ${
                                dm.isSunday ? 'bg-rose-100/60 text-rose-800' : dm.holiday ? 'bg-amber-100/60 text-amber-800' : ''
                              }`}
                              title={dm.holiday ? `${dm.holiday.title} (${dm.date})` : dm.date}
                            >
                              {dm.day}
                            </th>
                          ))}
                          <th className="p-2 border text-center w-10">P</th>
                          <th className="p-2 border text-center w-10">A</th>
                          <th className="p-2 border text-center w-10">L</th>
                          <th className="p-2 border text-center w-12">Att.</th>
                          <th className="p-2 border text-center w-14">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentRegister.students.map((stu) => {
                          const isLowAttendance = stu.percentage < 75;

                          return (
                            <tr key={stu.student_id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-2 border text-center font-mono font-bold sticky left-0 bg-white">
                                {stu.roll_number}
                              </td>
                              <td className="p-2 border font-bold text-slate-800 sticky left-12 bg-white truncate max-w-40">
                                {stu.name}
                              </td>
                              {studentRegister.daysMeta.map((dm) => {
                                const st = stu.daily[dm.day];
                                let badge = '';
                                if (dm.isSunday) badge = 'bg-rose-50 text-rose-300 font-mono';
                                else if (dm.holiday && !dm.holiday.is_instructional_day) badge = 'bg-amber-50 text-amber-500 font-bold';
                                else if (st === 'P') badge = 'bg-emerald-100 text-emerald-800 font-bold';
                                else if (st === 'A') badge = 'bg-rose-100 text-rose-800 font-bold';
                                else if (st === 'L') badge = 'bg-amber-100 text-amber-800 font-bold';
                                else if (st === 'HD') badge = 'bg-purple-100 text-purple-800 font-bold';
                                else if (st === 'OL') badge = 'bg-blue-100 text-blue-800 font-bold';
                                else badge = 'text-slate-300';

                                return (
                                  <td key={dm.day} className={`p-1 border text-center ${badge}`}>
                                    {dm.isSunday ? 'S' : dm.holiday && !dm.holiday.is_instructional_day ? 'H' : st || '—'}
                                  </td>
                                );
                              })}
                              <td className="p-2 border text-center font-bold text-emerald-700">{stu.presentCount}</td>
                              <td className="p-2 border text-center font-bold text-rose-700">{stu.absentCount}</td>
                              <td className="p-2 border text-center font-bold text-amber-700">{stu.lateCount}</td>
                              <td className="p-2 border text-center font-bold text-slate-800">{stu.attendedDays}</td>
                              <td className={`p-2 border text-center font-extrabold ${isLowAttendance ? 'text-rose-600 bg-rose-50' : 'text-emerald-700'}`}>
                                {stu.percentage}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Staff Monthly Register */}
          {registerMode === 'staff' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-4 space-y-4">
              {registerLoading ? (
                <div className="p-16 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600" />
                  <p className="text-xs font-semibold">Generating faculty monthly timesheet register...</p>
                </div>
              ) : !staffRegister || staffRegister.staff.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No staff attendance records found for selected month.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b">
                        <th className="p-2 border sticky left-0 bg-slate-100 z-10">Emp ID</th>
                        <th className="p-2 border sticky left-20 bg-slate-100 z-10 min-w-36">Faculty / Staff Name</th>
                        <th className="p-2 border">Designation</th>
                        {Array.from({ length: staffRegister.daysInMonth }, (_, i) => i + 1).map((d) => (
                          <th key={d} className="p-1 border text-center w-7">
                            {d}
                          </th>
                        ))}
                        <th className="p-2 border text-center">Present</th>
                        <th className="p-2 border text-center">Absent</th>
                        <th className="p-2 border text-center">Leave</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffRegister.staff.map((st) => (
                        <tr key={st.employee_id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2 border font-mono font-bold sticky left-0 bg-white">
                            {st.employee_id_number}
                          </td>
                          <td className="p-2 border font-bold text-slate-800 sticky left-20 bg-white truncate">
                            {st.name}
                          </td>
                          <td className="p-2 border text-slate-600 text-[10px]">{st.designation_name}</td>
                          {Array.from({ length: staffRegister.daysInMonth }, (_, i) => i + 1).map((d) => {
                            const code = st.daily[d];
                            let cls = 'text-slate-300';
                            if (code === 'P') cls = 'bg-emerald-100 text-emerald-800 font-bold';
                            else if (code === 'A') cls = 'bg-rose-100 text-rose-800 font-bold';
                            else if (code === 'L') cls = 'bg-amber-100 text-amber-800 font-bold';
                            else if (code === 'LV') cls = 'bg-blue-100 text-blue-800 font-bold';
                            else if (code === 'WO') cls = 'bg-indigo-50 text-indigo-700 font-bold';
                            return (
                              <td key={d} className={`p-1 border text-center ${cls}`}>
                                {code || '—'}
                              </td>
                            );
                          })}
                          <td className="p-2 border text-center font-bold text-emerald-700">{st.presentCount}</td>
                          <td className="p-2 border text-center font-bold text-rose-700">{st.absentCount}</td>
                          <td className="p-2 border text-center font-bold text-blue-700">{st.leaveCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ATTENDANCE CORRECTION REQUESTS & APPROVALS */}
      {/* ========================================================================= */}
      {activeTab === 'corrections' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600">Status:</span>
              <select
                value={correctionStatusFilter}
                onChange={(e) => setCorrectionStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <span className="text-xs font-semibold text-slate-600 ml-2">Type:</span>
              <select
                value={correctionTypeFilter}
                onChange={(e) => setCorrectionTypeFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="ALL">Student & Staff</option>
                <option value="STUDENT">Student Records</option>
                <option value="STAFF">Faculty & Staff</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateCorrectionModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Submit New Correction
            </button>
          </div>

          {/* Corrections List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {correctionsLoading ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                <p className="text-xs font-semibold">Loading correction requests...</p>
              </div>
            ) : corrections.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No correction requests found matching filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-3.5">Candidate / Target</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Adjustment</th>
                      <th className="p-3.5">Reason & Attachment</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Reviewer Info</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {corrections.map((corr) => {
                      const name =
                        corr.record_type === 'STUDENT'
                          ? `${corr.student_first_name || ''} ${corr.student_last_name || ''}`.trim() || 'Student'
                          : `${corr.employee_first_name || ''} ${corr.employee_last_name || ''}`.trim() || 'Staff';

                      return (
                        <tr key={corr.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5">
                            <span className="font-bold text-slate-800 block">{name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {corr.admission_number || corr.employee_id_number}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {corr.record_type}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-700">{corr.target_date}</td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px]">
                                {corr.previous_status}
                              </span>
                              <span className="text-slate-400">➔</span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                                {corr.requested_status}
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 max-w-xs">
                            <p className="text-slate-700 italic truncate" title={corr.reason}>
                              {corr.reason}
                            </p>
                            {corr.document_url && (
                              <span className="text-[10px] text-blue-600 block truncate mt-0.5 font-mono">
                                Ref: {corr.document_url}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                corr.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : corr.status === 'REJECTED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {corr.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-[11px] text-slate-500">
                            {corr.reviewed_by_name ? (
                              <div>
                                <span className="font-semibold text-slate-700 block">{corr.reviewed_by_name}</span>
                                {corr.review_remarks && <span className="italic block text-[10px]">{corr.review_remarks}</span>}
                              </div>
                            ) : (
                              <span className="italic text-slate-400">Pending Review</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            {corr.status === 'PENDING' && hasPermission('attendance.correction.approve') && (
                              <button
                                type="button"
                                onClick={() => setSelectedCorrectionForReview(corr)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] shadow-sm transition-colors"
                              >
                                Review
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SCHOOL CALENDAR & POLICY SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar Holidays & Events Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" /> School Calendar & Holidays
                </h3>
                <p className="text-xs text-slate-500">Scheduled gazetted holidays, festivals, and working days</p>
              </div>

              {hasPermission('calendar.manage') && (
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Holiday
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto text-xs">
              {calendarEvents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic">No calendar events configured yet.</div>
              ) : (
                calendarEvents.map((evt) => (
                  <div key={evt.id} className="py-3 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-lg transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-800 text-xs">{evt.title}</strong>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            evt.event_type === 'HOLIDAY'
                              ? 'bg-rose-100 text-rose-800'
                              : evt.event_type === 'SPECIAL_WORKING_DAY'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {evt.event_type}
                        </span>
                      </div>
                      <span className="font-mono text-slate-500 text-[11px] block mt-0.5">
                        {evt.date} {evt.description ? `• ${evt.description}` : ''}
                      </span>
                    </div>

                    {hasPermission('calendar.manage') && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCalendarEvent(evt.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Attendance Policy Configuration */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" /> Attendance Policy Rules
              </h3>
              <p className="text-xs text-slate-500">Configure lock rules, shifts, and compliance thresholds</p>
            </div>

            {settings ? (
              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Lock Register After (Days)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={settings.lock_after_days}
                      onChange={(e) =>
                        setSettings({ ...settings, lock_after_days: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Past days freeze automatically</span>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Default Register Slot
                    </label>
                    <select
                      value={settings.default_session}
                      onChange={(e) =>
                        setSettings({ ...settings, default_session: e.target.value as any })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
                    >
                      <option value="FULL_DAY">Full Day</option>
                      <option value="MORNING">Morning Only</option>
                      <option value="AFTERNOON">Afternoon Only</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      CBSE Student Min % Threshold
                    </label>
                    <input
                      type="number"
                      min={50}
                      max={100}
                      value={settings.student_min_percentage}
                      onChange={(e) =>
                        setSettings({ ...settings, student_min_percentage: parseFloat(e.target.value) || 75 })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Standard CBSE rule: 75%</span>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Staff Minimum Duty %
                    </label>
                    <input
                      type="number"
                      min={50}
                      max={100}
                      value={settings.staff_min_percentage}
                      onChange={(e) =>
                        setSettings({ ...settings, staff_min_percentage: parseFloat(e.target.value) || 80 })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Official Staff Check-In Time
                    </label>
                    <input
                      type="time"
                      value={settings.staff_check_in_time}
                      onChange={(e) =>
                        setSettings({ ...settings, staff_check_in_time: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Official Staff Check-Out Time
                    </label>
                    <input
                      type="time"
                      value={settings.staff_check_out_time}
                      onChange={(e) =>
                        setSettings({ ...settings, staff_check_out_time: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.allow_future_marking}
                      onChange={(e) =>
                        setSettings({ ...settings, allow_future_marking: e.target.checked })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-slate-700 font-medium">Allow marking future dates in advance</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.allow_holiday_marking}
                      onChange={(e) =>
                        setSettings({ ...settings, allow_holiday_marking: e.target.checked })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-slate-700 font-medium">Allow regular attendance marking on school holidays</span>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-sm transition-colors"
                  >
                    {savingSettings ? 'Saving Settings...' : 'Save Attendance Policy'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-8 text-center text-slate-400">Loading settings...</div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Student Profile Attendance Modal */}
      {activeStudentModal && (
        <StudentAttendanceModal
          studentId={activeStudentModal.id}
          studentName={activeStudentModal.name}
          admissionNumber={activeStudentModal.admNo}
          rollNumber={activeStudentModal.roll}
          onClose={() => setActiveStudentModal(null)}
        />
      )}

      {/* Staff Profile Attendance Modal */}
      {activeStaffModal && (
        <StaffAttendanceModal
          employeeId={activeStaffModal.id}
          name={activeStaffModal.name}
          employeeIdNumber={activeStaffModal.empId}
          designation={activeStaffModal.designation}
          department={activeStaffModal.department}
          onClose={() => setActiveStaffModal(null)}
        />
      )}

      {/* Create Correction Request Modal */}
      {showCreateCorrectionModal && (
        <CorrectionRequestModal
          schoolId={selectedSchoolId}
          onSuccess={() => {
            fetchCorrections();
          }}
          onClose={() => setShowCreateCorrectionModal(false)}
        />
      )}

      {/* Review Correction Request Modal */}
      {selectedCorrectionForReview && (
        <ReviewCorrectionModal
          request={selectedCorrectionForReview}
          onSuccess={() => {
            fetchCorrections();
          }}
          onClose={() => setSelectedCorrectionForReview(null)}
        />
      )}

      {/* Reopen Register Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Authorize Register Reopening</h3>
                <p className="text-xs text-slate-500">Unfreezing attendance register for retroactive edits</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Official Authorization Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="State the supervisory reason (e.g. Approved Principal Order #AP-22, late bus arrival adjustments)..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReopenModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUnlockAttendance}
                disabled={reopening}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                {reopening ? 'Reopening...' : 'Confirm Reopen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Calendar Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" /> Add Calendar Holiday / Event
              </h3>
              <button
                onClick={() => setShowAddEventModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCalendarEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Date</label>
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Event Type</label>
                <select
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-semibold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="HOLIDAY">Gazetted Holiday</option>
                  <option value="SPECIAL_WORKING_DAY">Special Working Day (e.g. Sports Day)</option>
                  <option value="EVENT">School Event / Celebration</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Event Title</label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="e.g. Republic Day, Ram Navami, Annual Exhibition"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  placeholder="e.g. Official school closure observed"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEventIsInstructional}
                    onChange={(e) => setNewEventIsInstructional(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-slate-700 font-medium">Counts as an Instructional (Working) Day</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingEvent}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm disabled:opacity-50"
                >
                  {addingEvent ? 'Saving...' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
