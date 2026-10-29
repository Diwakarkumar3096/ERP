import type { CurrentUser, School, AcademicSession, ClassItem } from '../types/erp.js';

export const FALLBACK_USERS: Record<string, CurrentUser> = {
  'superadmin@erp.edu': {
    id: 'usr_super_admin',
    username: 'superadmin',
    email: 'superadmin@erp.edu',
    firstName: 'Rajesh',
    lastName: 'Sharma',
    phone: '+91 98350 11001',
    schoolId: null,
    schoolName: undefined,
    schoolCode: undefined,
    roleId: 'role_super_admin',
    roleName: 'super_admin',
    roleDisplayName: 'Super Admin',
    permissions: [
      'schools.view', 'schools.create', 'schools.edit', 'schools.delete', 'schools.switch',
      'sessions.view', 'sessions.create', 'sessions.edit', 'sessions.activate',
      'classes.view', 'classes.create', 'classes.edit', 'classes.delete',
      'sections.view', 'sections.create', 'sections.edit', 'sections.delete',
      'users.view', 'users.create', 'users.edit', 'users.delete', 'users.roles', 'users.reset_pwd',
      'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
      'audit.view', 'audit.export',
      'students.view', 'students.create', 'attendance.view', 'attendance.mark', 'fees.view', 'fees.collect', 'exams.view', 'marks.enter'
    ]
  },
  'admin.vvps@erp.edu': {
    id: 'usr_admin_vvps',
    username: 'admin.vvps',
    email: 'admin.vvps@erp.edu',
    firstName: 'Amit',
    lastName: 'Verma',
    phone: '+91 98350 22002',
    schoolId: 'sch_vvps',
    schoolName: 'Vidya Vahini Public School',
    schoolCode: 'VVPS',
    roleId: 'role_school_admin',
    roleName: 'school_admin',
    roleDisplayName: 'School Admin',
    permissions: [
      'schools.view', 'schools.edit',
      'sessions.view', 'sessions.create', 'sessions.edit', 'sessions.activate',
      'classes.view', 'classes.create', 'classes.edit', 'classes.delete',
      'sections.view', 'sections.create', 'sections.edit', 'sections.delete',
      'users.view', 'users.create', 'users.edit', 'users.delete', 'users.roles', 'users.reset_pwd',
      'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
      'audit.view', 'audit.export',
      'students.view', 'students.create', 'attendance.view', 'attendance.mark', 'fees.view', 'fees.collect', 'exams.view', 'marks.enter'
    ]
  },
  'admin.gisk@erp.edu': {
    id: 'usr_admin_gisk',
    username: 'admin.gisk',
    email: 'admin.gisk@erp.edu',
    firstName: 'Suresh',
    lastName: 'Chandra',
    phone: '+91 98350 33003',
    schoolId: 'sch_gisk',
    schoolName: 'Gurukul International School Katoria',
    schoolCode: 'GISK',
    roleId: 'role_school_admin',
    roleName: 'school_admin',
    roleDisplayName: 'School Admin',
    permissions: [
      'schools.view', 'schools.edit',
      'sessions.view', 'sessions.create', 'sessions.edit', 'sessions.activate',
      'classes.view', 'classes.create', 'classes.edit', 'classes.delete',
      'sections.view', 'sections.create', 'sections.edit', 'sections.delete',
      'users.view', 'users.create', 'users.edit', 'users.delete', 'users.roles', 'users.reset_pwd',
      'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
      'audit.view', 'audit.export',
      'students.view', 'students.create', 'attendance.view', 'attendance.mark', 'fees.view', 'fees.collect', 'exams.view', 'marks.enter'
    ]
  },
  'principal.vvps@erp.edu': {
    id: 'usr_principal_vvps',
    username: 'principal.vvps',
    email: 'principal.vvps@erp.edu',
    firstName: 'Dr. Sunita',
    lastName: 'Mishra',
    phone: '+91 98350 44004',
    schoolId: 'sch_vvps',
    schoolName: 'Vidya Vahini Public School',
    schoolCode: 'VVPS',
    roleId: 'role_principal',
    roleName: 'principal',
    roleDisplayName: 'Principal',
    permissions: [
      'schools.view', 'sessions.view', 'classes.view', 'sections.view', 'users.view',
      'roles.view', 'audit.view', 'students.view', 'attendance.view', 'attendance.mark',
      'fees.view', 'exams.view', 'marks.enter'
    ]
  },
  'teacher.vvps@erp.edu': {
    id: 'usr_teacher_vvps',
    username: 'teacher.vvps',
    email: 'teacher.vvps@erp.edu',
    firstName: 'Priya',
    lastName: 'Pandey',
    phone: '+91 98350 55005',
    schoolId: 'sch_vvps',
    schoolName: 'Vidya Vahini Public School',
    schoolCode: 'VVPS',
    roleId: 'role_teacher',
    roleName: 'teacher',
    roleDisplayName: 'Teacher',
    permissions: [
      'classes.view', 'sections.view', 'students.view', 'attendance.view', 'attendance.mark',
      'exams.view', 'marks.enter'
    ]
  },
  'accountant.vvps@erp.edu': {
    id: 'usr_accountant_vvps',
    username: 'accountant.vvps',
    email: 'accountant.vvps@erp.edu',
    firstName: 'Manish',
    lastName: 'Gupta',
    phone: '+91 98350 66006',
    schoolId: 'sch_vvps',
    schoolName: 'Vidya Vahini Public School',
    schoolCode: 'VVPS',
    roleId: 'role_accountant',
    roleName: 'accountant',
    roleDisplayName: 'Accountant',
    permissions: [
      'classes.view', 'sections.view', 'students.view', 'fees.view', 'fees.collect'
    ]
  }
};

// Aliases
FALLBACK_USERS['superadmin'] = FALLBACK_USERS['superadmin@erp.edu'];
FALLBACK_USERS['admin'] = FALLBACK_USERS['superadmin@erp.edu'];
FALLBACK_USERS['admin.vvps'] = FALLBACK_USERS['admin.vvps@erp.edu'];
FALLBACK_USERS['admin.gisk'] = FALLBACK_USERS['admin.gisk@erp.edu'];
FALLBACK_USERS['principal'] = FALLBACK_USERS['principal.vvps@erp.edu'];
FALLBACK_USERS['teacher'] = FALLBACK_USERS['teacher.vvps@erp.edu'];
FALLBACK_USERS['accountant'] = FALLBACK_USERS['accountant.vvps@erp.edu'];

export const FALLBACK_SCHOOLS: School[] = [
  {
    id: 'sch_vvps',
    code: 'VVPS',
    name: 'Vidya Vahini Public School',
    affiliation_no: 'CBSE/AFF/2021/334201',
    board: 'CBSE',
    email: 'office@vidyavahini.edu.in',
    phone: '+91 6432 245100',
    address: 'Main Campus, Knowledge City Road, Ward No. 4',
    city: 'Deoghar',
    state: 'Jharkhand',
    postal_code: '814112',
    established_year: 2008,
    status: 'active',
    classes_count: 16,
    sections_count: 32,
    sessions_count: 3,
    users_count: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'sch_gisk',
    code: 'GISK',
    name: 'Gurukul International School Katoria',
    affiliation_no: 'CBSE/AFF/2023/118942',
    board: 'CBSE',
    email: 'admin@gurukulkatoria.edu.in',
    phone: '+91 6425 289340',
    address: 'Station Road, Near Gandhi Chowk',
    city: 'Katoria, Banka',
    state: 'Bihar',
    postal_code: '813106',
    established_year: 2014,
    status: 'active',
    classes_count: 16,
    sections_count: 32,
    sessions_count: 3,
    users_count: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const FALLBACK_SESSIONS: AcademicSession[] = [
  {
    id: 'sess_vvps_2425',
    school_id: 'sch_vvps',
    name: '2024-25',
    start_date: '2024-04-01',
    end_date: '2025-03-31',
    is_current: false,
    status: 'completed',
    classes_count: 16,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'sess_vvps_2526',
    school_id: 'sch_vvps',
    name: '2025-26',
    start_date: '2025-04-01',
    end_date: '2026-03-31',
    is_current: true,
    status: 'active',
    classes_count: 16,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'sess_vvps_2627',
    school_id: 'sch_vvps',
    name: '2026-27',
    start_date: '2026-04-01',
    end_date: '2027-03-31',
    is_current: false,
    status: 'upcoming',
    classes_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];
