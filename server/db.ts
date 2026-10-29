import { PGlite } from '@electric-sql/pglite';
import bcrypt from 'bcryptjs';
import { ensurePhase9SchemaAndData } from './transportDb.js';
import { ensurePhase11SchemaAndData } from './hostelDb.js';
import { ensurePhase12SchemaAndData } from './payrollDb.js';
import { ensurePhase13SchemaAndData } from './inventoryDb.js';
import { ensurePhase14SchemaAndData } from './communicationDb.js';
import { ensurePhase15SchemaAndData } from './administrationDb.js';
import { ensurePhase17SchemaAndData } from './misDb.js';
import { ensurePhase18SchemaAndData } from './lifecycleDb.js';
import { ensurePhase19SchemaAndData } from './portalDb.js';
import { ensurePhase21SchemaAndData } from './academicDb.js';
import { ensurePhase23SchemaAndData, getPhase23Error } from './workflowDb.js';
export { getPhase23Error };

export const db = new PGlite();

export async function initDatabase() {
  console.log('[DB] Initializing PostgreSQL schema...');

  // Create core Phase 1 tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schools (
      id VARCHAR(50) PRIMARY KEY,
      code VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      affiliation_no VARCHAR(100),
      board VARCHAR(50) DEFAULT 'CBSE',
      email VARCHAR(100),
      phone VARCHAR(50),
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      postal_code VARCHAR(20),
      logo_url TEXT,
      established_year INT,
      admission_prefix VARCHAR(20),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS academic_sessions (
      id VARCHAR(50) PRIMARY KEY,
      school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
      name VARCHAR(50) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_current BOOLEAN DEFAULT FALSE,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS roles (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      display_name VARCHAR(100) NOT NULL,
      description TEXT,
      is_system BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id VARCHAR(100) PRIMARY KEY,
      module VARCHAR(50) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id VARCHAR(50) REFERENCES roles(id) ON DELETE CASCADE,
      permission_id VARCHAR(100) REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      school_id VARCHAR(50) REFERENCES schools(id) ON DELETE SET NULL,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      display_name VARCHAR(150),
      avatar_url TEXT,
      phone VARCHAR(50),
      role_id VARCHAR(50) REFERENCES roles(id) ON DELETE RESTRICT,
      status VARCHAR(20) DEFAULT 'active',
      last_login_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(150);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

    CREATE TABLE IF NOT EXISTS user_sessions (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      ip_address VARCHAR(50),
      user_agent TEXT
    );

    CREATE TABLE IF NOT EXISTS classes (
      id VARCHAR(50) PRIMARY KEY,
      school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
      name VARCHAR(50) NOT NULL,
      numeric_grade INT DEFAULT 1,
      stream VARCHAR(50) DEFAULT 'General',
      display_order INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sections (
      id VARCHAR(50) PRIMARY KEY,
      school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      name VARCHAR(50) NOT NULL,
      room_number VARCHAR(50),
      capacity INT DEFAULT 40,
      class_teacher_name VARCHAR(100),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(50) PRIMARY KEY,
      school_id VARCHAR(50) REFERENCES schools(id) ON DELETE SET NULL,
      user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
      user_name VARCHAR(100) NOT NULL,
      user_role VARCHAR(50) NOT NULL,
      action VARCHAR(50) NOT NULL,
      module VARCHAR(50) NOT NULL,
      record_id VARCHAR(100),
      description TEXT NOT NULL,
      ip_address VARCHAR(50),
      user_agent TEXT,
      old_values TEXT,
      new_values TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id VARCHAR(50) PRIMARY KEY,
      admission_number VARCHAR(50) NOT NULL,
      registration_number VARCHAR(50),
      first_name VARCHAR(100) NOT NULL,
      middle_name VARCHAR(100),
      last_name VARCHAR(100) NOT NULL,
      date_of_birth DATE NOT NULL,
      gender VARCHAR(20) NOT NULL,
      blood_group VARCHAR(10),
      nationality VARCHAR(50) DEFAULT 'Indian',
      religion VARCHAR(50),
      category VARCHAR(50) DEFAULT 'General',
      aadhaar_number VARCHAR(20),
      profile_photo TEXT,
      mobile_number VARCHAR(50),
      email VARCHAR(100),
      address TEXT,
      city VARCHAR(100),
      district VARCHAR(100),
      state VARCHAR(100),
      pin_code VARCHAR(20),
      admission_date DATE NOT NULL,
      school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
      class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      section_id VARCHAR(50) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      roll_number VARCHAR(20),
      previous_school VARCHAR(255),
      student_status VARCHAR(20) DEFAULT 'ACTIVE',
      remarks TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_school_admission_number UNIQUE (school_id, admission_number)
    );

    CREATE TABLE IF NOT EXISTS parents (
      id VARCHAR(50) PRIMARY KEY,
      school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL,
      relationship_type VARCHAR(50) NOT NULL,
      mobile_number VARCHAR(50) NOT NULL,
      alternate_mobile VARCHAR(50),
      email VARCHAR(100),
      occupation VARCHAR(100),
      address TEXT,
      city VARCHAR(100),
      district VARCHAR(100),
      state VARCHAR(100),
      pin_code VARCHAR(20),
      photo TEXT,
      user_account_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_parents (
      id VARCHAR(50) PRIMARY KEY,
      student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      parent_id VARCHAR(50) NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
      relationship VARCHAR(50) NOT NULL,
      is_primary_guardian BOOLEAN DEFAULT FALSE,
      can_receive_notifications BOOLEAN DEFAULT TRUE,
      can_access_portal BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_student_parent UNIQUE(student_id, parent_id)
    );

    CREATE TABLE IF NOT EXISTS student_documents (
      id VARCHAR(50) PRIMARY KEY,
      student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      document_type VARCHAR(100) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_size INT NOT NULL,
      file_data TEXT NOT NULL,
      mime_type VARCHAR(100),
      uploaded_by VARCHAR(100) NOT NULL,
      upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      verification_status VARCHAR(20) DEFAULT 'Pending',
      remarks TEXT,
      verified_by VARCHAR(100),
      verified_at TIMESTAMP WITH TIME ZONE
    );

    CREATE TABLE IF NOT EXISTS student_enrollments (
      id VARCHAR(50) PRIMARY KEY,
      student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
      class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      section_id VARCHAR(50) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      roll_number VARCHAR(20),
      enrollment_date DATE NOT NULL,
      status VARCHAR(20) DEFAULT 'ACTIVE',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_classes_school_session ON classes(school_id, session_id);
    CREATE INDEX IF NOT EXISTS idx_sections_class ON sections(class_id);
    CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_students_school_session ON students(school_id, session_id);
    CREATE INDEX IF NOT EXISTS idx_students_class_section ON students(class_id, section_id);
    CREATE INDEX IF NOT EXISTS idx_students_admission_no ON students(school_id, admission_number);
    CREATE INDEX IF NOT EXISTS idx_parents_school ON parents(school_id);
    CREATE INDEX IF NOT EXISTS idx_student_parents_student ON student_parents(student_id);
    CREATE INDEX IF NOT EXISTS idx_student_parents_parent ON student_parents(parent_id);
    CREATE INDEX IF NOT EXISTS idx_documents_student ON student_documents(student_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_student ON student_enrollments(student_id);
  `);

  await seedInitialData();
  await ensurePhase2SchemaAndData();
  await ensurePhase3SchemaAndData();
  await ensurePhase4SchemaAndData();
  await ensurePhase5SchemaAndData();
  await ensurePhase6SchemaAndData();
  await ensurePhase7SchemaAndData();
  await ensurePhase8SchemaAndData();
  await ensurePhase9SchemaAndData(db);
  await ensurePhase10SchemaAndData();
  await ensurePhase11SchemaAndData(db);
  await ensurePhase12SchemaAndData(db);
  await ensurePhase13SchemaAndData(db);
  await ensurePhase14SchemaAndData(db);
  await ensurePhase15SchemaAndData(db);
  await ensurePhase17SchemaAndData(db);
  await ensurePhase18SchemaAndData(db);
  await ensurePhase19SchemaAndData(db);
  await ensurePhase21SchemaAndData();
  await ensurePhase23SchemaAndData(db);
  console.log('[DB] PostgreSQL schema & seed ready.');
}

async function seedInitialData() {
  // Check if schools already exist
  const existingSchools = await db.query('SELECT count(*) as count FROM schools');
  if (parseInt((existingSchools.rows[0] as { count: string }).count, 10) > 0) {
    return;
  }

  console.log('[DB] Seeding Phase 1 initial data...');

  // 1. Seed Initial Schools
  await db.query(`
    INSERT INTO schools (id, code, name, affiliation_no, board, email, phone, address, city, state, postal_code, established_year, status)
    VALUES 
    (
      'sch_vvps',
      'VVPS',
      'Vidya Vahini Public School',
      'CBSE/AFF/2021/334201',
      'CBSE',
      'office@vidyavahini.edu.in',
      '+91 6432 245100',
      'Main Campus, Knowledge City Road, Ward No. 4',
      'Deoghar',
      'Jharkhand',
      '814112',
      2008,
      'active'
    ),
    (
      'sch_gisk',
      'GISK',
      'Gurukul International School Katoria',
      'CBSE/AFF/2023/118942',
      'CBSE',
      'admin@gurukulkatoria.edu.in',
      '+91 6425 289340',
      'Station Road, Near Gandhi Chowk',
      'Katoria, Banka',
      'Bihar',
      '813106',
      2014,
      'active'
    );
  `);

  // 2. Seed Academic Sessions for both schools
  await db.query(`
    INSERT INTO academic_sessions (id, school_id, name, start_date, end_date, is_current, status)
    VALUES
    ('sess_vvps_2425', 'sch_vvps', '2024-25', '2024-04-01', '2025-03-31', false, 'completed'),
    ('sess_vvps_2526', 'sch_vvps', '2025-26', '2025-04-01', '2026-03-31', true, 'active'),
    ('sess_vvps_2627', 'sch_vvps', '2026-27', '2026-04-01', '2027-03-31', false, 'upcoming'),

    ('sess_gisk_2425', 'sch_gisk', '2024-25', '2024-04-01', '2025-03-31', false, 'completed'),
    ('sess_gisk_2526', 'sch_gisk', '2025-26', '2025-04-01', '2026-03-31', true, 'active'),
    ('sess_gisk_2627', 'sch_gisk', '2026-27', '2026-04-01', '2027-03-31', false, 'upcoming');
  `);

  // 3. Seed Roles
  const roles = [
    { id: 'role_super_admin', name: 'super_admin', display_name: 'Super Admin', desc: 'Global multi-school system administrator with full access to all branches' },
    { id: 'role_school_admin', name: 'school_admin', display_name: 'School Admin', desc: 'Principal administrator for a designated school branch' },
    { id: 'role_principal', name: 'principal', display_name: 'Principal', desc: 'Executive head of academics and institutional management' },
    { id: 'role_vice_principal', name: 'vice_principal', display_name: 'Vice Principal', desc: 'Assistant administrator with academic supervision duties' },
    { id: 'role_teacher', name: 'teacher', display_name: 'Teacher', desc: 'Teaching faculty member handling classes, attendance, and academics' },
    { id: 'role_accountant', name: 'accountant', display_name: 'Accountant', desc: 'Finance officer managing fees, dues, accounts, and payroll' },
    { id: 'role_receptionist', name: 'receptionist', display_name: 'Receptionist', desc: 'Front desk officer managing admissions inquiries and visitors' },
    { id: 'role_hr_manager', name: 'hr_manager', display_name: 'HR Manager', desc: 'Human resources personnel managing staff records and leave' },
    { id: 'role_librarian', name: 'librarian', display_name: 'Librarian', desc: 'Resource manager overseeing library catalog and book circulation' },
    { id: 'role_transport_manager', name: 'transport_manager', display_name: 'Transport Manager', desc: 'Logistics coordinator managing routes, buses, and drivers' },
    { id: 'role_parent', name: 'parent', display_name: 'Parent', desc: 'Parent/Guardian portal access for wards' },
    { id: 'role_student', name: 'student', display_name: 'Student', desc: 'Student portal access for timetable, homework, and reports' }
  ];

  for (const r of roles) {
    await db.query(`
      INSERT INTO roles (id, name, display_name, description, is_system)
      VALUES ($1, $2, $3, $4, true)
    `, [r.id, r.name, r.display_name, r.desc]);
  }

  // 4. Seed Granular Permissions
  const permissions = [
    // Schools
    { id: 'schools.view', module: 'Schools', name: 'View Schools', desc: 'Access list and details of schools' },
    { id: 'schools.create', module: 'Schools', name: 'Create Schools', desc: 'Register new school campuses and branches' },
    { id: 'schools.edit', module: 'Schools', name: 'Edit Schools', desc: 'Update school details, board, and affiliation' },
    { id: 'schools.delete', module: 'Schools', name: 'Delete Schools', desc: 'Deactivate or remove school records' },
    { id: 'schools.switch', module: 'Schools', name: 'Switch School Context', desc: 'Switch view between different schools' },

    // Academic Sessions
    { id: 'sessions.view', module: 'Sessions', name: 'View Sessions', desc: 'View academic year sessions' },
    { id: 'sessions.create', module: 'Sessions', name: 'Create Sessions', desc: 'Create new academic year sessions' },
    { id: 'sessions.edit', module: 'Sessions', name: 'Edit Sessions', desc: 'Update session dates and details' },
    { id: 'sessions.activate', module: 'Sessions', name: 'Activate Session', desc: 'Switch current active academic session' },

    // Classes & Sections
    { id: 'classes.view', module: 'Classes', name: 'View Classes', desc: 'View class rosters and grade offerings' },
    { id: 'classes.create', module: 'Classes', name: 'Create Classes', desc: 'Create new classes and academic streams' },
    { id: 'classes.edit', module: 'Classes', name: 'Edit Classes', desc: 'Update class names and streams' },
    { id: 'classes.delete', module: 'Classes', name: 'Delete Classes', desc: 'Remove classes' },
    { id: 'sections.view', module: 'Sections', name: 'View Sections', desc: 'View class section distribution' },
    { id: 'sections.create', module: 'Sections', name: 'Create Sections', desc: 'Create new sections for classes' },
    { id: 'sections.edit', module: 'Sections', name: 'Edit Sections', desc: 'Update room numbers and teachers' },
    { id: 'sections.delete', module: 'Sections', name: 'Delete Sections', desc: 'Remove sections' },

    // Users
    { id: 'users.view', module: 'Users', name: 'View Users', desc: 'View system user accounts' },
    { id: 'users.create', module: 'Users', name: 'Create Users', desc: 'Create staff, teacher, and admin accounts' },
    { id: 'users.edit', module: 'Users', name: 'Edit Users', desc: 'Edit user accounts and profiles' },
    { id: 'users.delete', module: 'Users', name: 'Delete Users', desc: 'Deactivate user accounts' },
    { id: 'users.roles', module: 'Users', name: 'Assign Roles', desc: 'Assign and alter user roles' },
    { id: 'users.reset_pwd', module: 'Users', name: 'Reset Passwords', desc: 'Reset credentials for users' },

    // Roles & Permissions
    { id: 'roles.view', module: 'Roles', name: 'View Roles', desc: 'View defined system roles' },
    { id: 'roles.create', module: 'Roles', name: 'Create Roles', desc: 'Create custom system roles' },
    { id: 'roles.edit', module: 'Roles', name: 'Edit Roles', desc: 'Update permissions for roles' },
    { id: 'roles.delete', module: 'Roles', name: 'Delete Roles', desc: 'Remove custom roles' },

    // Audit Log
    { id: 'audit.view', module: 'Audit', name: 'View Audit Logs', desc: 'Inspect system-wide security and change logs' },
    { id: 'audit.export', module: 'Audit', name: 'Export Audit Logs', desc: 'Export audit trails to CSV or report' },

    // Future modules placeholders for RBAC matrix completeness
    { id: 'students.view', module: 'Students', name: 'View Students', desc: 'View student directory' },
    { id: 'students.create', module: 'Students', name: 'Create Students', desc: 'Enroll students' },
    { id: 'attendance.view', module: 'Attendance', name: 'View Attendance', desc: 'View attendance registers' },
    { id: 'attendance.mark', module: 'Attendance', name: 'Mark Attendance', desc: 'Take daily class attendance' },
    { id: 'fees.view', module: 'Fees', name: 'View Fees', desc: 'View fee structures and payments' },
    { id: 'fees.collect', module: 'Fees', name: 'Collect Fees', desc: 'Accept fee payments and issue receipts' },
    { id: 'exams.view', module: 'Examinations', name: 'View Exams', desc: 'View exam timetables and results' },
    { id: 'marks.enter', module: 'Examinations', name: 'Enter Marks', desc: 'Submit examination grades' }
  ];

  for (const p of permissions) {
    await db.query(`
      INSERT INTO permissions (id, module, name, description)
      VALUES ($1, $2, $3, $4)
    `, [p.id, p.module, p.name, p.desc]);
  }

  // 5. Assign Permissions to Roles
  // Super Admin gets all permissions
  for (const p of permissions) {
    await db.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES ('role_super_admin', $1)
    `, [p.id]);
  }

  // School Admin gets everything within school scope
  const schoolAdminPerms = permissions
    .filter(p => !['schools.create', 'schools.delete', 'schools.switch'].includes(p.id))
    .map(p => p.id);
  for (const pid of schoolAdminPerms) {
    await db.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES ('role_school_admin', $1)
    `, [pid]);
  }

  // Principal permissions
  const principalPerms = [
    'schools.view', 'sessions.view', 'classes.view', 'sections.view', 'users.view',
    'roles.view', 'audit.view', 'students.view', 'attendance.view', 'attendance.mark',
    'fees.view', 'exams.view', 'marks.enter'
  ];
  for (const pid of principalPerms) {
    await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_principal', $1)`, [pid]);
  }

  // Teacher permissions
  const teacherPerms = [
    'classes.view', 'sections.view', 'students.view', 'attendance.view', 'attendance.mark',
    'exams.view', 'marks.enter'
  ];
  for (const pid of teacherPerms) {
    await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_teacher', $1)`, [pid]);
  }

  // Accountant permissions
  const accountantPerms = [
    'classes.view', 'sections.view', 'students.view', 'fees.view', 'fees.collect'
  ];
  for (const pid of accountantPerms) {
    await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_accountant', $1)`, [pid]);
  }

  // 6. Seed Users with hashed passwords ('Admin@123')
  const defaultPasswordHash = await bcrypt.hash('Admin@123', 10);

  const initialUsers = [
    {
      id: 'usr_super_admin',
      school_id: null,
      username: 'superadmin',
      email: 'superadmin@erp.edu',
      first_name: 'Rajesh',
      last_name: 'Sharma',
      phone: '+91 98350 11001',
      role_id: 'role_super_admin'
    },
    {
      id: 'usr_admin_vvps',
      school_id: 'sch_vvps',
      username: 'admin.vvps',
      email: 'admin.vvps@erp.edu',
      first_name: 'Amit',
      last_name: 'Verma',
      phone: '+91 98350 22002',
      role_id: 'role_school_admin'
    },
    {
      id: 'usr_admin_gisk',
      school_id: 'sch_gisk',
      username: 'admin.gisk',
      email: 'admin.gisk@erp.edu',
      first_name: 'Suresh',
      last_name: 'Chandra',
      phone: '+91 98350 33003',
      role_id: 'role_school_admin'
    },
    {
      id: 'usr_principal_vvps',
      school_id: 'sch_vvps',
      username: 'principal.vvps',
      email: 'principal.vvps@erp.edu',
      first_name: 'Dr. Sunita',
      last_name: 'Mishra',
      phone: '+91 98350 44004',
      role_id: 'role_principal'
    },
    {
      id: 'usr_teacher_vvps',
      school_id: 'sch_vvps',
      username: 'teacher.vvps',
      email: 'teacher.vvps@erp.edu',
      first_name: 'Priya',
      last_name: 'Pandey',
      phone: '+91 98350 55005',
      role_id: 'role_teacher'
    },
    {
      id: 'usr_accountant_vvps',
      school_id: 'sch_vvps',
      username: 'accountant.vvps',
      email: 'accountant.vvps@erp.edu',
      first_name: 'Manish',
      last_name: 'Gupta',
      phone: '+91 98350 66006',
      role_id: 'role_accountant'
    }
  ];

  for (const u of initialUsers) {
    await db.query(`
      INSERT INTO users (id, school_id, username, email, password_hash, first_name, last_name, phone, role_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
    `, [u.id, u.school_id, u.username, u.email, defaultPasswordHash, u.first_name, u.last_name, u.phone, u.role_id]);
  }

  // 7. Seed Classes and Sections for VVPS and GISK
  const classData = [
    { name: 'Nursery', grade: 0, stream: 'Early Years', order: 1, sections: ['A'] },
    { name: 'Kindergarten', grade: 0, stream: 'Early Years', order: 2, sections: ['A', 'B'] },
    { name: 'Class 1', grade: 1, stream: 'Primary', order: 3, sections: ['A', 'B'] },
    { name: 'Class 2', grade: 2, stream: 'Primary', order: 4, sections: ['A', 'B'] },
    { name: 'Class 3', grade: 3, stream: 'Primary', order: 5, sections: ['A', 'B'] },
    { name: 'Class 4', grade: 4, stream: 'Primary', order: 6, sections: ['A', 'B'] },
    { name: 'Class 5', grade: 5, stream: 'Primary', order: 7, sections: ['A', 'B'] },
    { name: 'Class 6', grade: 6, stream: 'Middle', order: 8, sections: ['A', 'B', 'C'] },
    { name: 'Class 7', grade: 7, stream: 'Middle', order: 9, sections: ['A', 'B', 'C'] },
    { name: 'Class 8', grade: 8, stream: 'Middle', order: 10, sections: ['A', 'B', 'C'] },
    { name: 'Class 9', grade: 9, stream: 'Secondary', order: 11, sections: ['A', 'B', 'C'] },
    { name: 'Class 10', grade: 10, stream: 'Secondary', order: 12, sections: ['A', 'B', 'C'] },
    { name: 'Class 11 - Science', grade: 11, stream: 'Science', order: 13, sections: ['A'] },
    { name: 'Class 11 - Commerce', grade: 11, stream: 'Commerce', order: 14, sections: ['A'] },
    { name: 'Class 12 - Science', grade: 12, stream: 'Science', order: 15, sections: ['A'] },
    { name: 'Class 12 - Commerce', grade: 12, stream: 'Commerce', order: 16, sections: ['A'] }
  ];

  const teacherNames = [
    'Priya Pandey', 'Vikram Singh', 'Ritu Kumari', 'Anand Jha',
    'Sneha Roy', 'Devendra Yadav', 'Kavita Sen', 'Rahul Tiwary'
  ];

  // Seed for both schools for active session 2025-26
  const schoolConfigs = [
    { schoolId: 'sch_vvps', sessionId: 'sess_vvps_2526', prefix: 'cls_vvps_' },
    { schoolId: 'sch_gisk', sessionId: 'sess_gisk_2526', prefix: 'cls_gisk_' }
  ];

  for (const conf of schoolConfigs) {
    let teacherIdx = 0;
    for (const c of classData) {
      const classId = `${conf.prefix}${c.order}`;
      await db.query(`
        INSERT INTO classes (id, school_id, session_id, name, numeric_grade, stream, display_order, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      `, [classId, conf.schoolId, conf.sessionId, c.name, c.grade, c.stream, c.order]);

      for (let sIdx = 0; sIdx < c.sections.length; sIdx++) {
        const secLetter = c.sections[sIdx];
        const secId = `sec_${classId}_${secLetter.toLowerCase()}`;
        const roomNum = `R-${100 + c.order * 2 + sIdx}`;
        const teacher = teacherNames[teacherIdx % teacherNames.length];
        teacherIdx++;

        await db.query(`
          INSERT INTO sections (id, school_id, class_id, name, room_number, capacity, class_teacher_name, status)
          VALUES ($1, $2, $3, $4, $5, 40, $6, 'active')
        `, [secId, conf.schoolId, classId, secLetter, roomNum, teacher]);
      }
    }
  }

  // 8. Initial Audit Log
  await db.query(`
    INSERT INTO audit_logs (id, school_id, user_id, user_name, user_role, action, module, record_id, description, ip_address, user_agent)
    VALUES (
      'aud_init_01',
      NULL,
      'usr_super_admin',
      'Rajesh Sharma',
      'super_admin',
      'SYSTEM_INITIALIZE',
      'SYSTEM',
      'core_erp',
      'School ERP Phase 1 initialized with dual campuses Vidya Vahini & Gurukul International',
      '127.0.0.1',
      'System Setup Process'
    );
  `);

  console.log('[DB] Seeding completed successfully.');
}

async function ensurePhase2SchemaAndData() {
  try {
    // 1. Safe migrations for schema extensions
    await db.query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS admission_prefix VARCHAR(20)`).catch(() => {});
    await db.query(`ALTER TABLE user_sessions ALTER COLUMN id TYPE VARCHAR(255)`).catch(() => {});
    await db.query(`ALTER TABLE student_enrollments ADD COLUMN IF NOT EXISTS remarks TEXT`).catch(() => {});
    await db.query(`UPDATE schools SET admission_prefix = 'VVP' WHERE id = 'sch_vvps' AND (admission_prefix IS NULL OR admission_prefix = '')`).catch(() => {});
    await db.query(`UPDATE schools SET admission_prefix = 'GIS' WHERE id = 'sch_gisk' AND (admission_prefix IS NULL OR admission_prefix = '')`).catch(() => {});

    // 2. Ensure Phase 2 Permissions
    const phase2Permissions = [
      { id: 'students.view', module: 'Students', name: 'View Students', desc: 'Access student directory and profiles' },
      { id: 'students.create', module: 'Students', name: 'Register Student', desc: 'Admit and enroll new students' },
      { id: 'students.edit', module: 'Students', name: 'Edit Student', desc: 'Update student demographics and academic records' },
      { id: 'students.delete', module: 'Students', name: 'Delete Student', desc: 'Remove or archive student records' },
      { id: 'students.promote', module: 'Students', name: 'Promote / Rollover', desc: 'Promote students to next session' },
      { id: 'parents.view', module: 'Parents', name: 'View Parents', desc: 'View parent directory and guardian details' },
      { id: 'parents.create', module: 'Parents', name: 'Add Parent', desc: 'Create new parent or guardian records' },
      { id: 'parents.edit', module: 'Parents', name: 'Edit Parent', desc: 'Update parent details and contact info' },
      { id: 'parents.delete', module: 'Parents', name: 'Delete Parent', desc: 'Remove parent linkages' },
      { id: 'documents.upload', module: 'Documents', name: 'Upload Documents', desc: 'Upload student certificates and ID files' },
      { id: 'documents.verify', module: 'Documents', name: 'Verify Documents', desc: 'Approve or reject submitted student documents' }
    ];

    for (const p of phase2Permissions) {
      await db.query(`
        INSERT INTO permissions (id, module, name, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
      `, [p.id, p.module, p.name, p.desc]);
    }

    // Assign to roles
    for (const p of phase2Permissions) {
      // Super Admin
      await db.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ('role_super_admin', $1)
        ON CONFLICT DO NOTHING
      `, [p.id]);

      // School Admin
      await db.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ('role_school_admin', $1)
        ON CONFLICT DO NOTHING
      `, [p.id]);
    }

    const principalPhase2 = ['students.view', 'students.create', 'students.edit', 'students.promote', 'parents.view', 'parents.edit', 'documents.upload', 'documents.verify'];
    for (const pid of principalPhase2) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_principal', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    const teacherPhase2 = ['students.view', 'parents.view', 'documents.upload'];
    for (const pid of teacherPhase2) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_teacher', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    const accountantPhase2 = ['students.view', 'parents.view'];
    for (const pid of accountantPhase2) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_accountant', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    // 3. Seed Students and Parents if none exist
    const stuCountRes = await db.query('SELECT count(*) as count FROM students');
    const stuCount = parseInt((stuCountRes.rows[0] as { count: string }).count, 10);
    if (stuCount > 0) {
      return;
    }

    console.log('[DB] Seeding Phase 2 Students and Parents records...');

    // Fetch class IDs for VVPS and GISK
    const vvpsClassesRes = await db.query(`SELECT id, name, display_order FROM classes WHERE school_id = 'sch_vvps' ORDER BY display_order ASC`);
    const giskClassesRes = await db.query(`SELECT id, name, display_order FROM classes WHERE school_id = 'sch_gisk' ORDER BY display_order ASC`);

    const vvpsClasses = vvpsClassesRes.rows as any[];
    const giskClasses = giskClassesRes.rows as any[];

    // Fetch sections for these classes
    const getSection = async (classId: string, name: string) => {
      const res = await db.query(`SELECT id FROM sections WHERE class_id = $1 AND name = $2 LIMIT 1`, [classId, name]);
      return res.rows.length > 0 ? (res.rows[0] as any).id : null;
    };

    // Helper for sample student data
    const sampleStudents = [
      // VVPS students
      {
        id: 'stu_vvps_001',
        admission_number: 'VVP-2025-0001',
        registration_number: 'REG/2025/101',
        first_name: 'Aarav',
        middle_name: '',
        last_name: 'Kumar',
        date_of_birth: '2019-05-14',
        gender: 'Male',
        blood_group: 'B+',
        nationality: 'Indian',
        religion: 'Hinduism',
        category: 'General',
        aadhaar_number: '4589 1234 5678',
        mobile_number: '+91 98350 77101',
        email: 'aarav.kumar@student.vvps.edu',
        address: 'House No. 42, Shivganga Road',
        city: 'Deoghar',
        district: 'Deoghar',
        state: 'Jharkhand',
        pin_code: '814112',
        admission_date: '2025-04-05',
        school_id: 'sch_vvps',
        session_id: 'sess_vvps_2526',
        classOrder: 3, // Class 1
        sectionName: 'A',
        roll_number: '01',
        previous_school: 'Little Angels Play School',
        student_status: 'ACTIVE',
        remarks: 'Excellent student, keen interest in drawing.',
        parent: {
          id: 'par_vvps_001',
          name: 'Ramesh Kumar',
          relationship: 'Father',
          mobile: '+91 98350 77101',
          alternate_mobile: '+91 98350 77102',
          email: 'ramesh.kumar@gmail.com',
          occupation: 'Civil Engineer',
          address: 'House No. 42, Shivganga Road, Deoghar, Jharkhand'
        }
      },
      {
        id: 'stu_vvps_002',
        admission_number: 'VVP-2025-0002',
        registration_number: 'REG/2025/102',
        first_name: 'Ananya',
        middle_name: 'Kumari',
        last_name: 'Sharma',
        date_of_birth: '2015-08-22',
        gender: 'Female',
        blood_group: 'O+',
        nationality: 'Indian',
        religion: 'Hinduism',
        category: 'General',
        aadhaar_number: '6741 8923 1045',
        mobile_number: '+91 98350 77103',
        email: 'ananya.sharma@student.vvps.edu',
        address: 'Quarter 14, Staff Colony',
        city: 'Deoghar',
        district: 'Deoghar',
        state: 'Jharkhand',
        pin_code: '814112',
        admission_date: '2025-04-08',
        school_id: 'sch_vvps',
        session_id: 'sess_vvps_2526',
        classOrder: 7, // Class 5
        sectionName: 'A',
        roll_number: '05',
        previous_school: 'St. Francis Convent School',
        student_status: 'ACTIVE',
        remarks: 'School debate team finalist.',
        parent: {
          id: 'par_vvps_002',
          name: 'Dr. Rajesh Sharma',
          relationship: 'Father',
          mobile: '+91 98350 77103',
          alternate_mobile: '+91 98350 77104',
          email: 'dr.rajesh.sharma@gmail.com',
          occupation: 'Doctor (Physician)',
          address: 'Quarter 14, Staff Colony, Deoghar, Jharkhand'
        }
      },
      {
        id: 'stu_vvps_003',
        admission_number: 'VVP-2025-0003',
        registration_number: 'REG/2025/103',
        first_name: 'Rohan',
        middle_name: '',
        last_name: 'Verma',
        date_of_birth: '2012-11-10',
        gender: 'Male',
        blood_group: 'A+',
        nationality: 'Indian',
        religion: 'Hinduism',
        category: 'OBC',
        aadhaar_number: '9012 3456 7890',
        mobile_number: '+91 98350 77105',
        email: 'rohan.verma@student.vvps.edu',
        address: 'B-12, Green Park Avenue',
        city: 'Deoghar',
        district: 'Deoghar',
        state: 'Jharkhand',
        pin_code: '814112',
        admission_date: '2025-04-10',
        school_id: 'sch_vvps',
        session_id: 'sess_vvps_2526',
        classOrder: 10, // Class 8
        sectionName: 'B',
        roll_number: '12',
        previous_school: 'Vidya Vahini Public School',
        student_status: 'ACTIVE',
        remarks: 'Active member of science club.',
        parent: {
          id: 'par_vvps_003',
          name: 'Amit Verma',
          relationship: 'Father',
          mobile: '+91 98350 77105',
          alternate_mobile: '+91 98350 77106',
          email: 'amit.verma.trade@gmail.com',
          occupation: 'Merchant & Trader',
          address: 'B-12, Green Park Avenue, Deoghar, Jharkhand'
        }
      },
      {
        id: 'stu_vvps_004',
        admission_number: 'VVP-2025-0004',
        registration_number: 'REG/2025/104',
        first_name: 'Sneha',
        middle_name: '',
        last_name: 'Pandey',
        date_of_birth: '2010-03-15',
        gender: 'Female',
        blood_group: 'AB+',
        nationality: 'Indian',
        religion: 'Hinduism',
        category: 'General',
        aadhaar_number: '3456 7890 1234',
        mobile_number: '+91 98350 77107',
        email: 'sneha.pandey@student.vvps.edu',
        address: 'Flat 302, Royal Residency',
        city: 'Deoghar',
        district: 'Deoghar',
        state: 'Jharkhand',
        pin_code: '814112',
        admission_date: '2025-04-12',
        school_id: 'sch_vvps',
        session_id: 'sess_vvps_2526',
        classOrder: 12, // Class 10
        sectionName: 'A',
        roll_number: '08',
        previous_school: 'Kendriya Vidyalaya Deoghar',
        student_status: 'ACTIVE',
        remarks: 'Prefect, high academic distinction in mathematics.',
        parent: {
          id: 'par_vvps_004',
          name: 'Devendra Pandey',
          relationship: 'Father',
          mobile: '+91 98350 77107',
          alternate_mobile: '+91 98350 77108',
          email: 'devendra.pandey@bankofindia.in',
          occupation: 'Senior Branch Manager',
          address: 'Flat 302, Royal Residency, Deoghar, Jharkhand'
        }
      },
      {
        id: 'stu_vvps_005',
        admission_number: 'VVP-2025-0005',
        registration_number: 'REG/2025/105',
        first_name: 'Aditya',
        middle_name: 'Raj',
        last_name: 'Mishra',
        date_of_birth: '2008-07-04',
        gender: 'Male',
        blood_group: 'O+',
        nationality: 'Indian',
        religion: 'Hinduism',
        category: 'General',
        aadhaar_number: '7890 1234 5678',
        mobile_number: '+91 98350 77109',
        email: 'aditya.mishra@student.vvps.edu',
        address: 'Professor Colony, Ward 7',
        city: 'Deoghar',
        district: 'Deoghar',
        state: 'Jharkhand',
        pin_code: '814112',
        admission_date: '2025-04-15',
        school_id: 'sch_vvps',
        session_id: 'sess_vvps_2526',
        classOrder: 15, // Class 12 - Science
        sectionName: 'A',
        roll_number: '02',
        previous_school: 'Vidya Vahini Public School',
        student_status: 'ACTIVE',
        remarks: 'JEE Aspirant, Physics Olympiad certificate holder.',
        parent: {
          id: 'par_vvps_005',
          name: 'Vinod Mishra',
          relationship: 'Father',
          mobile: '+91 98350 77109',
          alternate_mobile: '+91 98350 77110',
          email: 'prof.vinod.mishra@univ.edu',
          occupation: 'College Professor',
          address: 'Professor Colony, Ward 7, Deoghar, Jharkhand'
        }
      },

      // GISK Students
      {
        id: 'stu_gisk_001',
        admission_number: 'GIS-2025-0001',
        registration_number: 'REG/GIS/2025/01',
        first_name: 'Aryan',
        middle_name: '',
        last_name: 'Gupta',
        date_of_birth: '2018-09-17',
        gender: 'Male',
        blood_group: 'B+',
        nationality: 'Indian',
        religion: 'Hinduism',
        category: 'General',
        aadhaar_number: '1234 5678 9012',
        mobile_number: '+91 98350 88201',
        email: 'aryan.gupta@student.giskatoria.edu',
        address: 'Station Road, Near Bank of Baroda',
        city: 'Katoria',
        district: 'Banka',
        state: 'Bihar',
        pin_code: '813106',
        admission_date: '2025-04-04',
        school_id: 'sch_gisk',
        session_id: 'sess_gisk_2526',
        classOrder: 4, // Class 2
        sectionName: 'A',
        roll_number: '03',
        previous_school: 'Sunflower Kids Academy',
        student_status: 'ACTIVE',
        remarks: 'Curious learner, active sports participant.',
        parent: {
          id: 'par_gisk_001',
          name: 'Manoj Gupta',
          relationship: 'Father',
          mobile: '+91 98350 88201',
          alternate_mobile: '+91 98350 88202',
          email: 'manoj.gupta.katoria@gmail.com',
          occupation: 'Business Owner',
          address: 'Station Road, Near Bank of Baroda, Katoria, Banka, Bihar'
        }
      },
      {
        id: 'stu_gisk_002',
        admission_number: 'GIS-2025-0002',
        registration_number: 'REG/GIS/2025/02',
        first_name: 'Divya',
        middle_name: '',
        last_name: 'Kumari',
        date_of_birth: '2014-04-19',
        gender: 'Female',
        blood_group: 'A+',
        nationality: 'Indian',
        religion: 'Hinduism',
        category: 'OBC',
        aadhaar_number: '5678 9012 3456',
        mobile_number: '+91 98350 88203',
        email: 'divya.kumari@student.giskatoria.edu',
        address: 'Gandhi Chowk, Main Market',
        city: 'Katoria',
        district: 'Banka',
        state: 'Bihar',
        pin_code: '813106',
        admission_date: '2025-04-06',
        school_id: 'sch_gisk',
        session_id: 'sess_gisk_2526',
        classOrder: 8, // Class 6
        sectionName: 'A',
        roll_number: '09',
        previous_school: 'Gurukul International School Katoria',
        student_status: 'ACTIVE',
        remarks: 'Class captain and quiz team participant.',
        parent: {
          id: 'par_gisk_002',
          name: 'Suresh Chandra',
          relationship: 'Father',
          mobile: '+91 98350 88203',
          alternate_mobile: '+91 98350 88204',
          email: 'suresh.chandra.banka@gmail.com',
          occupation: 'Advocate',
          address: 'Gandhi Chowk, Main Market, Katoria, Banka, Bihar'
        }
      },
      {
        id: 'stu_gisk_003',
        admission_number: 'GIS-2025-0003',
        registration_number: 'REG/GIS/2025/03',
        first_name: 'Harsh',
        middle_name: '',
        last_name: 'Raj',
        date_of_birth: '2011-06-25',
        gender: 'Male',
        blood_group: 'O-',
        nationality: 'Indian',
        religion: 'Hinduism',
        category: 'General',
        aadhaar_number: '8901 2345 6789',
        mobile_number: '+91 98350 88205',
        email: 'harsh.raj@student.giskatoria.edu',
        address: 'Banka Road, Ward 3',
        city: 'Katoria',
        district: 'Banka',
        state: 'Bihar',
        pin_code: '813106',
        admission_date: '2025-04-09',
        school_id: 'sch_gisk',
        session_id: 'sess_gisk_2526',
        classOrder: 11, // Class 9
        sectionName: 'A',
        roll_number: '14',
        previous_school: 'St. Teresa High School',
        student_status: 'ACTIVE',
        remarks: 'Cricket team captain, excellent athletics record.',
        parent: {
          id: 'par_gisk_003',
          name: 'Alok Kumar',
          relationship: 'Father',
          mobile: '+91 98350 88205',
          alternate_mobile: '+91 98350 88206',
          email: 'alok.kr.railways@gmail.com',
          occupation: 'Railway Officer',
          address: 'Banka Road, Ward 3, Katoria, Banka, Bihar'
        }
      }
    ];

    for (const s of sampleStudents) {
      // Find matching class
      const classList = s.school_id === 'sch_vvps' ? vvpsClasses : giskClasses;
      const targetClass = classList.find((c: any) => c.display_order === s.classOrder) || classList[0];
      const classId = targetClass ? targetClass.id : null;
      const sectionId = classId ? await getSection(classId, s.sectionName) : null;

      if (!classId || !sectionId) continue;

      // 1. Insert Student
      await db.query(`
        INSERT INTO students (
          id, admission_number, registration_number, first_name, middle_name, last_name,
          date_of_birth, gender, blood_group, nationality, religion, category, aadhaar_number,
          mobile_number, email, address, city, district, state, pin_code, admission_date,
          school_id, session_id, class_id, section_id, roll_number, previous_school,
          student_status, remarks
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21,
          $22, $23, $24, $25, $26, $27,
          $28, $29
        )
      `, [
        s.id, s.admission_number, s.registration_number, s.first_name, s.middle_name, s.last_name,
        s.date_of_birth, s.gender, s.blood_group, s.nationality, s.religion, s.category, s.aadhaar_number,
        s.mobile_number, s.email, s.address, s.city, s.district, s.state, s.pin_code, s.admission_date,
        s.school_id, s.session_id, classId, sectionId, s.roll_number, s.previous_school,
        s.student_status, s.remarks
      ]);

      // 2. Insert Parent
      await db.query(`
        INSERT INTO parents (
          id, school_id, name, relationship_type, mobile_number, alternate_mobile,
          email, occupation, address, city, district, state, pin_code
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13
        )
      `, [
        s.parent.id, s.school_id, s.parent.name, s.parent.relationship, s.parent.mobile, s.parent.alternate_mobile,
        s.parent.email, s.parent.occupation, s.parent.address, s.city, s.district, s.state, s.pin_code
      ]);

      // 3. Link Student & Parent
      await db.query(`
        INSERT INTO student_parents (
          id, student_id, parent_id, relationship, is_primary_guardian, can_receive_notifications, can_access_portal
        ) VALUES (
          $1, $2, $3, $4, true, true, true
        )
      `, [
        `sp_${s.id}_${s.parent.id}`, s.id, s.parent.id, s.parent.relationship
      ]);

      // 4. Initial Enrollment Record
      await db.query(`
        INSERT INTO student_enrollments (
          id, student_id, school_id, session_id, class_id, section_id, roll_number, enrollment_date, status, remarks
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', 'Initial admission enrollment'
        )
      `, [
        `enr_${s.id}_init`, s.id, s.school_id, s.session_id, classId, sectionId, s.roll_number, s.admission_date
      ]);

      // 5. Seed Documents
      const sampleDocData = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="400" height="200" fill="%23f1f5f9" stroke="%23cbd5e1"/><text x="200" y="90" font-family="sans-serif" font-size="16" font-weight="bold" fill="%231e293b" text-anchor="middle">Official Document Certificate</text><text x="200" y="125" font-family="sans-serif" font-size="12" fill="%2364748b" text-anchor="middle">School ERP Verified Copy</text></svg>';

      await db.query(`
        INSERT INTO student_documents (
          id, student_id, document_type, file_name, file_size, file_data, mime_type, uploaded_by, verification_status, remarks, verified_by, verified_at
        ) VALUES (
          $1, $2, 'Birth Certificate', $3, 24500, $4, 'image/svg+xml', 'Admissions Office', 'Verified', 'Original certificate verified against Municipal Corporation records', 'Dr. Sunita Mishra', CURRENT_TIMESTAMP
        ), (
          $5, $2, 'Aadhaar Card', $6, 18900, $4, 'image/svg+xml', 'Admissions Office', 'Verified', 'UIDAI card photocopy on file', 'Dr. Sunita Mishra', CURRENT_TIMESTAMP
        )
      `, [
        `doc_${s.id}_birth`, s.id, `${s.first_name}_Birth_Certificate.svg`, sampleDocData,
        `doc_${s.id}_aadhaar`, `${s.first_name}_Aadhaar_Card.svg`
      ]);
    }

    console.log('[DB] Phase 2 Students, Parents, Documents seeded successfully.');
  } catch (err) {
    console.error('[DB PHASE 2 INIT ERROR]', err);
  }
}

async function ensurePhase3SchemaAndData() {
  try {
    // 1. Create Phase 3 Admissions Tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS admission_settings (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
        application_prefix VARCHAR(20) DEFAULT 'ADM',
        application_fee NUMERIC(10, 2) DEFAULT 500,
        entrance_test_required BOOLEAN DEFAULT TRUE,
        interview_required BOOLEAN DEFAULT TRUE,
        online_admissions_open BOOLEAN DEFAULT TRUE,
        instructions TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admission_applications (
        id VARCHAR(50) PRIMARY KEY,
        application_number VARCHAR(50) NOT NULL UNIQUE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        admission_type VARCHAR(30) NOT NULL DEFAULT 'NEW',
        application_date DATE NOT NULL DEFAULT CURRENT_DATE,
        student_name VARCHAR(150) NOT NULL,
        first_name VARCHAR(100),
        middle_name VARCHAR(100),
        last_name VARCHAR(100),
        date_of_birth DATE NOT NULL,
        gender VARCHAR(20) NOT NULL,
        blood_group VARCHAR(10),
        nationality VARCHAR(50) DEFAULT 'Indian',
        category VARCHAR(50) DEFAULT 'General',
        aadhaar_number VARCHAR(20),
        religion VARCHAR(50),
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        district VARCHAR(100),
        state VARCHAR(100) NOT NULL,
        pin_code VARCHAR(20) NOT NULL,
        previous_school VARCHAR(200),
        previous_class VARCHAR(50),
        applying_class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
        applying_section_id VARCHAR(50) REFERENCES sections(id) ON DELETE SET NULL,
        father_name VARCHAR(150),
        mother_name VARCHAR(150),
        guardian_name VARCHAR(150),
        parent_mobile VARCHAR(20) NOT NULL,
        alternate_mobile VARCHAR(20),
        parent_email VARCHAR(150),
        emergency_contact VARCHAR(20),
        source_of_application VARCHAR(50) DEFAULT 'Online Portal',
        application_status VARCHAR(40) NOT NULL DEFAULT 'SUBMITTED',
        remarks TEXT,
        student_id VARCHAR(50) REFERENCES students(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admission_documents (
        id VARCHAR(50) PRIMARY KEY,
        application_id VARCHAR(50) NOT NULL REFERENCES admission_applications(id) ON DELETE CASCADE,
        document_type VARCHAR(100) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INT NOT NULL,
        file_data TEXT NOT NULL,
        mime_type VARCHAR(100),
        uploaded_by VARCHAR(100) NOT NULL,
        upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        verification_status VARCHAR(20) DEFAULT 'Pending',
        remarks TEXT,
        verified_by VARCHAR(100),
        verified_at TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS admission_tests (
        id VARCHAR(50) PRIMARY KEY,
        application_id VARCHAR(50) NOT NULL REFERENCES admission_applications(id) ON DELETE CASCADE,
        test_date DATE NOT NULL,
        test_time VARCHAR(20),
        venue VARCHAR(100),
        subjects VARCHAR(255),
        max_marks NUMERIC(6, 2) DEFAULT 100,
        marks_obtained NUMERIC(6, 2),
        test_status VARCHAR(30) DEFAULT 'Scheduled',
        remarks TEXT,
        conducted_by VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admission_interviews (
        id VARCHAR(50) PRIMARY KEY,
        application_id VARCHAR(50) NOT NULL REFERENCES admission_applications(id) ON DELETE CASCADE,
        interview_date DATE NOT NULL,
        interview_time VARCHAR(20),
        interviewer_name VARCHAR(100),
        interview_mode VARCHAR(30) DEFAULT 'In-person',
        status VARCHAR(30) DEFAULT 'Scheduled',
        recommendation VARCHAR(30) DEFAULT 'Pending',
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admission_fees (
        id VARCHAR(50) PRIMARY KEY,
        application_id VARCHAR(50) NOT NULL REFERENCES admission_applications(id) ON DELETE CASCADE,
        fee_type VARCHAR(50) NOT NULL DEFAULT 'Admission Fee',
        amount NUMERIC(10, 2) NOT NULL,
        payment_mode VARCHAR(30) DEFAULT 'Cash',
        transaction_ref VARCHAR(100),
        payment_status VARCHAR(30) DEFAULT 'Pending',
        receipt_number VARCHAR(50),
        payment_date DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admission_timeline (
        id VARCHAR(50) PRIMARY KEY,
        application_id VARCHAR(50) NOT NULL REFERENCES admission_applications(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        previous_status VARCHAR(40),
        new_status VARCHAR(40),
        remarks TEXT,
        performed_by_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_adm_apps_school_session ON admission_applications(school_id, session_id);
      CREATE INDEX IF NOT EXISTS idx_adm_apps_status ON admission_applications(application_status);
      CREATE INDEX IF NOT EXISTS idx_adm_apps_class ON admission_applications(applying_class_id);
      CREATE INDEX IF NOT EXISTS idx_adm_apps_no ON admission_applications(application_number);
      CREATE INDEX IF NOT EXISTS idx_adm_docs_app ON admission_documents(application_id);
      CREATE INDEX IF NOT EXISTS idx_adm_tests_app ON admission_tests(application_id);
      CREATE INDEX IF NOT EXISTS idx_adm_interviews_app ON admission_interviews(application_id);
      CREATE INDEX IF NOT EXISTS idx_adm_fees_app ON admission_fees(application_id);
      CREATE INDEX IF NOT EXISTS idx_adm_timeline_app ON admission_timeline(application_id);
    `);

    // 2. Ensure Phase 3 Permissions
    const phase3Permissions = [
      { id: 'admissions.view', module: 'Admissions', name: 'View Admissions', desc: 'Access admission dashboard, pipeline, and candidate list' },
      { id: 'admissions.create', module: 'Admissions', name: 'Submit Application', desc: 'Create online or offline admission applications' },
      { id: 'admissions.review', module: 'Admissions', name: 'Review Application', desc: 'Review application dossiers and preliminary eligibility' },
      { id: 'admissions.verify_docs', module: 'Admissions', name: 'Verify Documents', desc: 'Inspect and verify candidate certificates' },
      { id: 'admissions.schedule_test', module: 'Admissions', name: 'Entrance Tests', desc: 'Schedule entrance exams and enter test scores' },
      { id: 'admissions.schedule_interview', module: 'Admissions', name: 'Interviews', desc: 'Schedule candidate & parent interviews and enter feedback' },
      { id: 'admissions.approve', module: 'Admissions', name: 'Select & Approve', desc: 'Select candidates, manage waitlists, and approve admissions' },
      { id: 'admissions.confirm', module: 'Admissions', name: 'Confirm & Enroll', desc: 'Process admission fee, assign section & roll no, and create student' }
    ];

    for (const p of phase3Permissions) {
      await db.query(`
        INSERT INTO permissions (id, module, name, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
      `, [p.id, p.module, p.name, p.desc]);
    }

    for (const p of phase3Permissions) {
      // Super Admin
      await db.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ('role_super_admin', $1)
        ON CONFLICT DO NOTHING
      `, [p.id]);

      // School Admin
      await db.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ('role_school_admin', $1)
        ON CONFLICT DO NOTHING
      `, [p.id]);

      // Principal
      await db.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ('role_principal', $1)
        ON CONFLICT DO NOTHING
      `, [p.id]);
    }

    // Receptionist / Counselor admissions permissions
    const receptionistPerms = ['admissions.view', 'admissions.create', 'admissions.review', 'admissions.verify_docs'];
    for (const pid of receptionistPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_receptionist', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    // 3. Ensure Default Admission Settings for Schools
    await db.query(`
      INSERT INTO admission_settings (id, school_id, application_prefix, application_fee, entrance_test_required, interview_required, online_admissions_open, instructions)
      VALUES 
      ('adm_set_vvps', 'sch_vvps', 'VVP-ADM', 750.00, true, true, true, 'Online admissions open for Academic Session 2026-27. Please carry original birth certificates and marksheets during interview.'),
      ('adm_set_gisk', 'sch_gisk', 'GIS-ADM', 500.00, true, true, true, 'Admissions open across Nursery to Grade 10. Direct entrance test scheduled upon preliminary document verification.')
      ON CONFLICT (school_id) DO NOTHING
    `);

    // 4. Seed initial Admission Applications if empty
    const appCountRes = await db.query('SELECT count(*) as count FROM admission_applications');
    const appCount = parseInt((appCountRes.rows[0] as { count: string }).count, 10);
    if (appCount > 0) {
      return;
    }

    console.log('[DB] Seeding Phase 3 sample admission applications...');

    const sampleDocSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="400" height="200" fill="%23f8fafc" stroke="%2394a3b8"/><text x="200" y="85" font-family="sans-serif" font-size="15" font-weight="bold" fill="%230f172a" text-anchor="middle">Official Document Record</text><text x="200" y="115" font-family="sans-serif" font-size="12" fill="%2364748b" text-anchor="middle">Admissions Application Attachment</text></svg>';

    const sampleApplications = [
      {
        id: 'adm_app_001',
        app_no: 'VVP-ADM-2026-0001',
        school_id: 'sch_vvps',
        session_id: 'sess_vvps_2627',
        class_id: 'cls_vvps_3', // Class 1
        sec_id: null,
        type: 'NEW',
        date: '2026-02-10',
        name: 'Aarav Sharma',
        first: 'Aarav', middle: '', last: 'Sharma',
        dob: '2020-04-12', gender: 'MALE', blood: 'B+', cat: 'General',
        aadhaar: '4512 8891 0023',
        address: 'Flat 402, Shivalik Tower, VIP Road', city: 'Deoghar', dist: 'Deoghar', state: 'Jharkhand', pin: '814112',
        prev_school: 'Little Angels Play School', prev_class: 'Kindergarten',
        father: 'Sunil Sharma', mother: 'Sunita Sharma',
        mobile: '+91 98351 11001', alt_mobile: '+91 98351 11002', email: 'sunil.sharma@example.com',
        source: 'Online Portal',
        status: 'SUBMITTED',
        remarks: 'Direct online application submitted via school website portal.'
      },
      {
        id: 'adm_app_002',
        app_no: 'VVP-ADM-2026-0002',
        school_id: 'sch_vvps',
        session_id: 'sess_vvps_2627',
        class_id: 'cls_vvps_8', // Class 6
        sec_id: null,
        type: 'TRANSFER',
        date: '2026-02-14',
        name: 'Ananya Sen',
        first: 'Ananya', middle: '', last: 'Sen',
        dob: '2015-08-25', gender: 'FEMALE', blood: 'O+', cat: 'General',
        aadhaar: '6721 3490 1192',
        address: 'B-14, Vidyapith Enclave, Castairs Town', city: 'Deoghar', dist: 'Deoghar', state: 'Jharkhand', pin: '814112',
        prev_school: 'St. Francis Deoghar', prev_class: 'Class 5',
        father: 'Pradip Sen', mother: 'Mousumi Sen',
        mobile: '+91 98352 22002', alt_mobile: '', email: 'pradip.sen@example.com',
        source: 'Online Portal',
        status: 'UNDER_REVIEW',
        remarks: 'Transfer application due to father relocation. Grade 5 scorecard verified.'
      },
      {
        id: 'adm_app_003',
        app_no: 'VVP-ADM-2026-0003',
        school_id: 'sch_vvps',
        session_id: 'sess_vvps_2627',
        class_id: 'cls_vvps_11', // Class 9
        sec_id: null,
        type: 'NEW',
        date: '2026-02-18',
        name: 'Ishaan Verma',
        first: 'Ishaan', middle: '', last: 'Verma',
        dob: '2012-01-19', gender: 'MALE', blood: 'A+', cat: 'OBC',
        aadhaar: '9012 4432 7781',
        address: 'House 88, Circular Road', city: 'Deoghar', dist: 'Deoghar', state: 'Jharkhand', pin: '814112',
        prev_school: 'Modern Public School Ranchi', prev_class: 'Class 8',
        father: 'Rajesh Verma', mother: 'Kavita Verma',
        mobile: '+91 98353 33003', alt_mobile: '', email: 'rajesh.verma@example.com',
        source: 'Walk-in / Direct',
        status: 'TEST_SCHEDULED',
        remarks: 'Entrance test for Mathematics & Science scheduled for Feb 28.'
      },
      {
        id: 'adm_app_004',
        app_no: 'VVP-ADM-2026-0004',
        school_id: 'sch_vvps',
        session_id: 'sess_vvps_2627',
        class_id: 'cls_vvps_13', // Class 11 - Science
        sec_id: null,
        type: 'NEW',
        date: '2026-02-20',
        name: 'Diya Mukherjee',
        first: 'Diya', middle: '', last: 'Mukherjee',
        dob: '2010-11-04', gender: 'FEMALE', blood: 'AB+', cat: 'General',
        aadhaar: '3341 5562 9012',
        address: 'Flat 101, Mayur Green, Bompas Town', city: 'Deoghar', dist: 'Deoghar', state: 'Jharkhand', pin: '814112',
        prev_school: 'Delhi Public School Patna', prev_class: 'Class 10',
        father: 'Debashis Mukherjee', mother: 'Anuradha Mukherjee',
        mobile: '+91 98354 44004', alt_mobile: '', email: 'debashis.m@example.com',
        source: 'Online Portal',
        status: 'INTERVIEW_SCHEDULED',
        remarks: 'Scored 89/100 in entrance test. Interview scheduled with Principal on Mar 2.'
      },
      {
        id: 'adm_app_005',
        app_no: 'VVP-ADM-2026-0005',
        school_id: 'sch_vvps',
        session_id: 'sess_vvps_2627',
        class_id: 'cls_vvps_6', // Class 4
        sec_id: null,
        type: 'NEW',
        date: '2026-02-22',
        name: 'Kabir Malhotra',
        first: 'Kabir', middle: '', last: 'Malhotra',
        dob: '2017-06-15', gender: 'MALE', blood: 'B+', cat: 'General',
        aadhaar: '7781 2291 4455',
        address: 'Plot 24, Officers Colony', city: 'Deoghar', dist: 'Deoghar', state: 'Jharkhand', pin: '814112',
        prev_school: 'Kendriya Vidyalaya Jasidih', prev_class: 'Class 3',
        father: 'Vikram Malhotra', mother: 'Neeta Malhotra',
        mobile: '+91 98355 55005', alt_mobile: '', email: 'vikram.m@example.com',
        source: 'Referral',
        status: 'SELECTED',
        remarks: 'Candidate selected based on merit and interview committee recommendation.'
      },
      {
        id: 'adm_app_006',
        app_no: 'VVP-ADM-2026-0006',
        school_id: 'sch_vvps',
        session_id: 'sess_vvps_2627',
        class_id: 'cls_vvps_10', // Class 8
        sec_id: null,
        type: 'TRANSFER',
        date: '2026-02-24',
        name: 'Riya Patel',
        first: 'Riya', middle: '', last: 'Patel',
        dob: '2013-09-10', gender: 'FEMALE', blood: 'O+', cat: 'General',
        aadhaar: '1234 5678 9012',
        address: 'B-7, Shanti Nagar, Station Road', city: 'Deoghar', dist: 'Deoghar', state: 'Jharkhand', pin: '814112',
        prev_school: 'St. Xavier School Bokaro', prev_class: 'Class 7',
        father: 'Nitin Patel', mother: 'Pooja Patel',
        mobile: '+91 98356 66006', alt_mobile: '', email: 'nitin.patel@example.com',
        source: 'Online Portal',
        status: 'FEE_PENDING',
        remarks: 'Approved by Principal. Admission fee challan generated. Awaiting receipt.'
      },
      {
        id: 'adm_app_007',
        app_no: 'VVP-ADM-2026-0007',
        school_id: 'sch_vvps',
        session_id: 'sess_vvps_2627',
        class_id: 'cls_vvps_4', // Class 2
        sec_id: null,
        type: 'NEW',
        date: '2026-02-05',
        name: 'Siddharth Roy',
        first: 'Siddharth', middle: '', last: 'Roy',
        dob: '2019-02-18', gender: 'MALE', blood: 'A+', cat: 'General',
        aadhaar: '6651 8892 4431',
        address: 'Tower 3, Raj Residency', city: 'Deoghar', dist: 'Deoghar', state: 'Jharkhand', pin: '814112',
        prev_school: 'Sunrise Toddlers', prev_class: 'Class 1',
        father: 'Amitava Roy', mother: 'Gargi Roy',
        mobile: '+91 98357 77007', alt_mobile: '', email: 'amitava.roy@example.com',
        source: 'Online Portal',
        status: 'CONFIRMED',
        remarks: 'Admission confirmed. Fees paid. Enrolled in Class 2 Section A.'
      },
      {
        id: 'adm_app_008',
        app_no: 'VVP-ADM-2026-0008',
        school_id: 'sch_vvps',
        session_id: 'sess_vvps_2627',
        class_id: 'cls_vvps_12', // Class 10
        sec_id: null,
        type: 'TRANSFER',
        date: '2026-02-25',
        name: 'Tanya Gupta',
        first: 'Tanya', middle: '', last: 'Gupta',
        dob: '2011-05-14', gender: 'FEMALE', blood: 'B+', cat: 'OBC',
        aadhaar: '8872 1192 6654',
        address: 'H.No 12, Court Road', city: 'Deoghar', dist: 'Deoghar', state: 'Jharkhand', pin: '814112',
        prev_school: 'DAV Public School Giridih', prev_class: 'Class 9',
        father: 'Manoj Gupta', mother: 'Sunita Gupta',
        mobile: '+91 98358 88008', alt_mobile: '', email: 'manoj.gupta@example.com',
        source: 'Walk-in / Direct',
        status: 'WAITLISTED',
        remarks: 'Placed on waitlist rank #2 due to seat capacity in Class 10.'
      },
      // GISK Applications
      {
        id: 'adm_app_101',
        app_no: 'GIS-ADM-2026-0001',
        school_id: 'sch_gisk',
        session_id: 'sess_gisk_2627',
        class_id: 'cls_gisk_7', // Class 5
        sec_id: null,
        type: 'NEW',
        date: '2026-02-12',
        name: 'Priya Kumari',
        first: 'Priya', middle: '', last: 'Kumari',
        dob: '2016-07-20', gender: 'FEMALE', blood: 'O+', cat: 'OBC',
        aadhaar: '4452 7712 9901',
        address: 'Near Gandhi Chowk, Station Road', city: 'Katoria', dist: 'Banka', state: 'Bihar', pin: '813106',
        prev_school: 'Saraswati Shishu Mandir', prev_class: 'Class 4',
        father: 'Sanjay Kumar', mother: 'Manju Devi',
        mobile: '+91 98359 99009', alt_mobile: '', email: 'sanjay.katoria@example.com',
        source: 'Online Portal',
        status: 'DOCUMENT_PENDING',
        remarks: 'Birth certificate photocopy pending from applicant.'
      },
      {
        id: 'adm_app_102',
        app_no: 'GIS-ADM-2026-0002',
        school_id: 'sch_gisk',
        session_id: 'sess_gisk_2627',
        class_id: 'cls_gisk_9', // Class 7
        sec_id: null,
        type: 'TRANSFER',
        date: '2026-02-15',
        name: 'Rohan Kumar',
        first: 'Rohan', middle: '', last: 'Kumar',
        dob: '2014-03-11', gender: 'MALE', blood: 'A+', cat: 'General',
        aadhaar: '9921 4410 7712',
        address: 'Banka Road, Main Market', city: 'Katoria', dist: 'Banka', state: 'Bihar', pin: '813106',
        prev_school: 'Banka Central Academy', prev_class: 'Class 6',
        father: 'Dinesh Prasad', mother: 'Sunita Devi',
        mobile: '+91 98360 00111', alt_mobile: '', email: 'dinesh.p@example.com',
        source: 'Walk-in / Direct',
        status: 'APPROVED',
        remarks: 'Approved by admissions committee. Letter issued.'
      }
    ];

    for (const app of sampleApplications) {
      await db.query(`
        INSERT INTO admission_applications (
          id, application_number, school_id, session_id, admission_type, application_date,
          student_name, first_name, middle_name, last_name, date_of_birth, gender,
          blood_group, nationality, category, aadhaar_number, address, city, district, state, pin_code,
          previous_school, previous_class, applying_class_id, applying_section_id,
          father_name, mother_name, parent_mobile, alternate_mobile, parent_email,
          source_of_application, application_status, remarks
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          $13, 'Indian', $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24,
          $25, $26, $27, $28, $29,
          $30, $31, $32
        )
      `, [
        app.id, app.app_no, app.school_id, app.session_id, app.type, app.date,
        app.name, app.first, app.middle, app.last, app.dob, app.gender,
        app.blood, app.cat, app.aadhaar, app.address, app.city, app.dist, app.state, app.pin,
        app.prev_school, app.prev_class, app.class_id, app.sec_id,
        app.father, app.mother, app.mobile, app.alt_mobile, app.email,
        app.source, app.status, app.remarks
      ]);

      // Seed Documents for Application
      await db.query(`
        INSERT INTO admission_documents (
          id, application_id, document_type, file_name, file_size, file_data, mime_type, uploaded_by, verification_status, remarks, verified_by, verified_at
        ) VALUES 
        ($1, $2, 'Birth Certificate', $3, 19200, $4, 'image/svg+xml', 'Applicant Parent', 'Verified', 'Official birth registry verified', 'Dr. Sunita Mishra', CURRENT_TIMESTAMP),
        ($5, $2, 'Aadhaar Card', $6, 15400, $4, 'image/svg+xml', 'Applicant Parent', 'Verified', 'Aadhaar copy on file', 'Dr. Sunita Mishra', CURRENT_TIMESTAMP)
      `, [
        `doc_adm_${app.id}_birth`, app.id, `${app.first}_Birth_Certificate.svg`, sampleDocSvg,
        `doc_adm_${app.id}_aadhaar`, `${app.first}_Aadhaar.svg`
      ]);

      // Initial Timeline
      await db.query(`
        INSERT INTO admission_timeline (id, application_id, action, previous_status, new_status, remarks, performed_by_name)
        VALUES ($1, $2, 'Application Submitted', NULL, 'SUBMITTED', 'Online admission form submitted successfully by applicant parent.', 'Portal System')
      `, [`time_${app.id}_init`, app.id]);

      if (app.status !== 'SUBMITTED') {
        await db.query(`
          INSERT INTO admission_timeline (id, application_id, action, previous_status, new_status, remarks, performed_by_name)
          VALUES ($1, $2, 'Status Updated', 'SUBMITTED', $3, $4, 'Admissions Officer')
        `, [`time_${app.id}_status`, app.id, app.status, app.remarks]);
      }
    }

    // Specific Tests
    await db.query(`
      INSERT INTO admission_tests (id, application_id, test_date, test_time, venue, subjects, max_marks, marks_obtained, test_status, remarks, conducted_by)
      VALUES 
      ('test_app_003', 'adm_app_003', '2026-02-28', '10:00 AM', 'Examination Hall A, Campus 1', 'Mathematics, Science, English', 100, NULL, 'Scheduled', 'Reporting time 9:30 AM with admit card', 'Exam Coordinator'),
      ('test_app_004', 'adm_app_004', '2026-02-24', '11:00 AM', 'Physics Lab Hall, Academic Block', 'Physics, Chemistry, Mathematics', 100, 89.0, 'Passed', 'High performance in Mathematics & Physics', 'Senior Science Faculty'),
      ('test_app_005', 'adm_app_005', '2026-02-23', '09:30 AM', 'Room 102, Junior Block', 'General Aptitude, English, Basic Maths', 100, 92.5, 'Passed', 'Candidate demonstrated exceptional aptitude', 'Junior Section Head')
    `);

    // Specific Interviews
    await db.query(`
      INSERT INTO admission_interviews (id, application_id, interview_date, interview_time, interviewer_name, interview_mode, status, recommendation, remarks)
      VALUES
      ('int_app_004', 'adm_app_004', '2026-03-02', '02:30 PM', 'Dr. Sunita Mishra (Principal)', 'In-person', 'Scheduled', 'Pending', 'Candidate and parents invited for interaction with academic principal'),
      ('int_app_005', 'adm_app_005', '2026-02-25', '11:00 AM', 'Admissions Committee', 'In-person', 'Completed', 'Recommended', 'Parents very supportive of curricular and co-curricular programs. Strongly recommended for Class 4 admission.')
    `);

    // Specific Fees
    await db.query(`
      INSERT INTO admission_fees (id, application_id, fee_type, amount, payment_mode, transaction_ref, payment_status, receipt_number, payment_date, notes)
      VALUES
      ('fee_app_006', 'adm_app_006', 'Admission Fee', 12500.00, 'UPI', NULL, 'Pending', 'REC-PEND-006', NULL, 'Admission offer letter sent. Awaiting confirmation payment before Mar 5.'),
      ('fee_app_007', 'adm_app_007', 'Admission Fee', 12500.00, 'Net Banking', 'TXN_SBI_99812401', 'Paid', 'REC-2026-0182', '2026-02-12', 'Full admission fee deposited online.')
    `);

    console.log('[DB] Phase 3 sample admissions seeded successfully.');
  } catch (err: any) {
    (globalThis as any).__phase3Error = err?.message || String(err);
    console.error('[DB PHASE 3 INIT ERROR]', err);
  }
}

export function getPhase3Error() {
  return (globalThis as any).__phase3Error || null;
}

export function getPhase4Error() {
  return (globalThis as any).__phase4Error || null;
}

export function getPhase5Error() {
  return (globalThis as any).__phase5Error || null;
}

export function getPhase6Error() {
  return (globalThis as any).__phase6Error || null;
}

export function getPhase7Error() {
  return (globalThis as any).__phase7Error || null;
}

export function getPhase8Error() {
  return (globalThis as any).__phase8Error || null;
}

export function getPhase9Error() {
  return (globalThis as any).__phase9Error || null;
}

export function getPhase10Error() {
  return (globalThis as any).__phase10Error || null;
}

export function getPhase11Error() {
  return (globalThis as any).__phase11Error || null;
}

export function getPhase12Error() {
  return (globalThis as any).__phase12Error || null;
}

export function getPhase13Error() {
  return (globalThis as any).__phase13Error || null;
}

export function getPhase14Error() {
  return (globalThis as any).__phase14Error || null;
}

export function getPhase15Error() {
  return (globalThis as any).__phase15Error || null;
}

export function getPhase21Error() {
  return (globalThis as any).__phase21Error || null;
}

async function ensurePhase4SchemaAndData() {
  try {
    // 1. Add employee_prefix column to schools if not exists
    await db.exec(`
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS employee_prefix VARCHAR(20) DEFAULT 'EMP';
      UPDATE schools SET employee_prefix = 'VVP-EMP' WHERE id = 'sch_vvps' AND (employee_prefix IS NULL OR employee_prefix = 'EMP');
      UPDATE schools SET employee_prefix = 'GIS-EMP' WHERE id = 'sch_gisk' AND (employee_prefix IS NULL OR employee_prefix = 'EMP');
    `);

    // 2. Create Phase 4 tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS departments (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20),
        description TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_dept_school_name UNIQUE(school_id, name)
      );

      CREATE TABLE IF NOT EXISTS designations (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20),
        employee_type VARCHAR(50) NOT NULL DEFAULT 'Teaching',
        description TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS subjects (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) NOT NULL,
        type VARCHAR(30) DEFAULT 'Theory',
        description TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS employees (
        id VARCHAR(50) PRIMARY KEY,
        employee_id_number VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        employee_type VARCHAR(50) NOT NULL DEFAULT 'Teaching',
        first_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100),
        last_name VARCHAR(100) NOT NULL,
        profile_photo TEXT,
        gender VARCHAR(20) NOT NULL,
        date_of_birth DATE NOT NULL,
        mobile_number VARCHAR(50) NOT NULL,
        alternate_mobile VARCHAR(50),
        email VARCHAR(100),
        official_email VARCHAR(100),
        address TEXT,
        city VARCHAR(100),
        district VARCHAR(100),
        state VARCHAR(100),
        pin_code VARCHAR(20),
        emergency_contact_name VARCHAR(100),
        emergency_contact_number VARCHAR(50),
        emergency_contact_relationship VARCHAR(50),
        department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
        designation_id VARCHAR(50) REFERENCES designations(id) ON DELETE SET NULL,
        date_of_joining DATE NOT NULL,
        employment_status VARCHAR(30) DEFAULT 'ACTIVE',
        qualification VARCHAR(100),
        specialization VARCHAR(100),
        experience_years NUMERIC(4, 1) DEFAULT 0,
        previous_employer TEXT,
        blood_group VARCHAR(10),
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_school_emp_id_num UNIQUE(school_id, employee_id_number)
      );

      CREATE TABLE IF NOT EXISTS employee_qualifications (
        id VARCHAR(50) PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        qualification VARCHAR(100) NOT NULL,
        specialization VARCHAR(150),
        institution VARCHAR(200),
        university_board VARCHAR(200),
        passing_year INT,
        percentage_grade VARCHAR(50),
        certificate_document TEXT,
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS employee_experience (
        id VARCHAR(50) PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        organization VARCHAR(200) NOT NULL,
        designation VARCHAR(100) NOT NULL,
        start_date DATE,
        end_date DATE,
        total_experience_months INT,
        responsibilities TEXT,
        experience_certificate TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS employee_documents (
        id VARCHAR(50) PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        document_type VARCHAR(100) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INT NOT NULL,
        file_data TEXT NOT NULL,
        mime_type VARCHAR(100),
        uploaded_by VARCHAR(100) NOT NULL,
        upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        verification_status VARCHAR(20) DEFAULT 'PENDING',
        verified_by VARCHAR(100),
        verification_date TIMESTAMP WITH TIME ZONE,
        remarks TEXT
      );

      CREATE TABLE IF NOT EXISTS employee_employment_history (
        id VARCHAR(50) PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        effective_date DATE NOT NULL,
        previous_value VARCHAR(255),
        new_value VARCHAR(255),
        remarks TEXT,
        changed_by_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS teacher_profiles (
        id VARCHAR(50) PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        specialization VARCHAR(150),
        highest_qualification VARCHAR(100),
        teaching_experience_years NUMERIC(4, 1) DEFAULT 0,
        bio TEXT,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
        id VARCHAR(50) PRIMARY KEY,
        teacher_id VARCHAR(50) NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        subject_id VARCHAR(50) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        section_id VARCHAR(50) REFERENCES sections(id) ON DELETE CASCADE,
        is_primary_teacher BOOLEAN DEFAULT TRUE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS class_teacher_assignments (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        section_id VARCHAR(50) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
        teacher_id VARCHAR(50) NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
        academic_year VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active',
        assigned_date DATE DEFAULT CURRENT_DATE,
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_session_sec_classteacher UNIQUE(session_id, section_id)
      );

      CREATE INDEX IF NOT EXISTS idx_emp_school ON employees(school_id);
      CREATE INDEX IF NOT EXISTS idx_emp_id_num ON employees(school_id, employee_id_number);
      CREATE INDEX IF NOT EXISTS idx_emp_status ON employees(employment_status);
      CREATE INDEX IF NOT EXISTS idx_emp_dept ON employees(department_id);
      CREATE INDEX IF NOT EXISTS idx_emp_desig ON employees(designation_id);
      CREATE INDEX IF NOT EXISTS idx_emp_type ON employees(employee_type);
      CREATE INDEX IF NOT EXISTS idx_emp_user ON employees(user_id);
      CREATE INDEX IF NOT EXISTS idx_dept_school ON departments(school_id);
      CREATE INDEX IF NOT EXISTS idx_desig_school ON designations(school_id);
      CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id);
      CREATE INDEX IF NOT EXISTS idx_emp_docs ON employee_documents(employee_id);
      CREATE INDEX IF NOT EXISTS idx_emp_qual ON employee_qualifications(employee_id);
      CREATE INDEX IF NOT EXISTS idx_emp_exp ON employee_experience(employee_id);
      CREATE INDEX IF NOT EXISTS idx_emp_hist ON employee_employment_history(employee_id);
      CREATE INDEX IF NOT EXISTS idx_teacher_emp ON teacher_profiles(employee_id);
      CREATE INDEX IF NOT EXISTS idx_teacher_sub_assign ON teacher_subject_assignments(session_id, teacher_id);
      CREATE INDEX IF NOT EXISTS idx_class_teacher_sec ON class_teacher_assignments(session_id, section_id);
    `);

    // 3. Register Phase 4 Permissions
    const phase4Permissions = [
      { id: 'employees.view', module: 'Employees', name: 'View Employees', desc: 'Browse staff and teacher roster' },
      { id: 'employees.create', module: 'Employees', name: 'Add Employee', desc: 'Onboard new staff and faculty members' },
      { id: 'employees.edit', module: 'Employees', name: 'Edit Employee', desc: 'Update staff profile, designation, and service details' },
      { id: 'employees.delete', module: 'Employees', name: 'Deactivate Employee', desc: 'Process exit and update employment status' },
      { id: 'employees.export', module: 'Employees', name: 'Export Employees', desc: 'Export staff roster to CSV' },
      { id: 'employees.documents.view', module: 'Employees', name: 'View Staff Documents', desc: 'Inspect certificates and employment dossier' },
      { id: 'employees.documents.upload', module: 'Employees', name: 'Upload Staff Documents', desc: 'Attach official certificates and verification files' },
      { id: 'employees.documents.verify', module: 'Employees', name: 'Verify Staff Documents', desc: 'Validate or reject submitted employee credentials' },
      { id: 'teachers.view', module: 'Teachers', name: 'View Teachers', desc: 'View teacher academic profiles and workload' },
      { id: 'teachers.create', module: 'Teachers', name: 'Create Teacher Profile', desc: 'Enable academic profile for teaching staff' },
      { id: 'teachers.edit', module: 'Teachers', name: 'Edit Teacher Profile', desc: 'Update academic specialization and experience' },
      { id: 'teachers.assign_subject', module: 'Teachers', name: 'Assign Subjects', desc: 'Assign curriculum subjects to faculty' },
      { id: 'teachers.assign_class', module: 'Teachers', name: 'Assign Class Teacher', desc: 'Designate Section Class In-Charge' },
      { id: 'teachers.assign_section', module: 'Teachers', name: 'Assign Section', desc: 'Map section rosters to teachers' },
      { id: 'departments.view', module: 'Departments', name: 'View Departments', desc: 'View school operational departments' },
      { id: 'departments.create', module: 'Departments', name: 'Create Department', desc: 'Add new department' },
      { id: 'departments.edit', module: 'Departments', name: 'Edit Department', desc: 'Modify department details and status' },
      { id: 'departments.delete', module: 'Departments', name: 'Delete Department', desc: 'Deactivate department' },
      { id: 'designations.view', module: 'Designations', name: 'View Designations', desc: 'View designations hierarchy' },
      { id: 'designations.create', module: 'Designations', name: 'Create Designation', desc: 'Add staff job designation' },
      { id: 'designations.edit', module: 'Designations', name: 'Edit Designation', desc: 'Modify designation parameters' },
      { id: 'designations.delete', module: 'Designations', name: 'Delete Designation', desc: 'Deactivate designation' }
    ];

    for (const p of phase4Permissions) {
      await db.query(`
        INSERT INTO permissions (id, module, name, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
      `, [p.id, p.module, p.name, p.desc]);

      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_super_admin', $1) ON CONFLICT DO NOTHING`, [p.id]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_school_admin', $1) ON CONFLICT DO NOTHING`, [p.id]);
    }

    const principalPerms = [
      'employees.view', 'employees.create', 'employees.edit', 'employees.documents.view', 'employees.documents.upload', 'employees.documents.verify',
      'teachers.view', 'teachers.create', 'teachers.edit', 'teachers.assign_subject', 'teachers.assign_class', 'teachers.assign_section',
      'departments.view', 'designations.view'
    ];
    for (const pid of principalPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_principal', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    const teacherPerms = ['employees.view', 'teachers.view', 'departments.view', 'designations.view'];
    for (const pid of teacherPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_teacher', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    const accountantPerms = ['employees.view', 'departments.view', 'designations.view'];
    for (const pid of accountantPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_accountant', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    // 4. Check if employees already seeded
    const empCountRes = await db.query('SELECT count(*) as count FROM employees');
    if (parseInt((empCountRes.rows[0] as { count: string }).count, 10) > 0) {
      console.log('[DB] Phase 4 schema verified and existing employees found.');
      return;
    }

    console.log('[DB] Seeding Phase 4 initial Departments, Designations, Subjects, Staff and Faculty...');

    // 5. Seed Departments
    await db.query(`
      INSERT INTO departments (id, school_id, name, code, description, status)
      VALUES
      ('dept_vvps_acad', 'sch_vvps', 'Academic & Pedagogy', 'ACAD', 'Teaching faculty, curriculum planning and scholastic delivery', 'active'),
      ('dept_vvps_admin', 'sch_vvps', 'General Administration', 'ADMIN', 'Campus administration, admissions liaison and facilities', 'active'),
      ('dept_vvps_accts', 'sch_vvps', 'Accounts & Finance', 'ACCTS', 'Fee management, payroll and statutory compliance', 'active'),
      ('dept_vvps_sci', 'sch_vvps', 'Science & Laboratories', 'SCI', 'Physics, Chemistry, and Biology laboratories and practicals', 'active'),
      ('dept_vvps_it', 'sch_vvps', 'Information Technology', 'IT', 'Computer labs, campus network, and digital learning systems', 'active'),
      ('dept_vvps_spt', 'sch_vvps', 'Sports & Physical Education', 'SPT', 'Athletics, indoor sports, yoga, and playground training', 'active'),
      ('dept_vvps_lib', 'sch_vvps', 'Library & Learning Resource', 'LIB', 'Circulation, reading hall, and reference repository', 'active'),

      ('dept_gisk_acad', 'sch_gisk', 'Academic & Instruction', 'ACAD', 'Core scholastic teaching faculty and academic coordinators', 'active'),
      ('dept_gisk_admin', 'sch_gisk', 'School Administration', 'ADMIN', 'Front office, student records, and campus operations', 'active'),
      ('dept_gisk_accts', 'sch_gisk', 'Finance & Accounts', 'ACCTS', 'Bursar office, fee collections and records', 'active'),
      ('dept_gisk_spt', 'sch_gisk', 'Physical Culture & Sports', 'SPT', 'Martial arts, cricket, football, and physical fitness', 'active')
      ON CONFLICT DO NOTHING;
    `);

    // 6. Seed Designations
    await db.query(`
      INSERT INTO designations (id, school_id, department_id, name, code, employee_type, description, status)
      VALUES
      ('des_vvps_prn', 'sch_vvps', 'dept_vvps_acad', 'Principal', 'PRN', 'Teaching', 'Head of the Institution with academic and administrative command', 'active'),
      ('des_vvps_vprn', 'sch_vvps', 'dept_vvps_acad', 'Vice Principal', 'VPRN', 'Teaching', 'Academic coordinator and second in leadership', 'active'),
      ('des_vvps_pgt', 'sch_vvps', 'dept_vvps_acad', 'PGT - Post Graduate Teacher', 'PGT', 'Teaching', 'Senior Secondary classes 11-12 subject specialist', 'active'),
      ('des_vvps_tgt', 'sch_vvps', 'dept_vvps_acad', 'TGT - Trained Graduate Teacher', 'TGT', 'Teaching', 'Middle and Secondary classes 6-10 faculty', 'active'),
      ('des_vvps_prt', 'sch_vvps', 'dept_vvps_acad', 'PRT - Primary Teacher', 'PRT', 'Teaching', 'Primary school classes 1-5 faculty', 'active'),
      ('des_vvps_comp', 'sch_vvps', 'dept_vvps_it', 'Computer Teacher', 'CT', 'Teaching', 'ICT and Computer Science instructor', 'active'),
      ('des_vvps_pet', 'sch_vvps', 'dept_vvps_spt', 'Sports Coach / PET', 'PET', 'Teaching', 'Physical education instructor and athletic trainer', 'active'),
      ('des_vvps_lib', 'sch_vvps', 'dept_vvps_lib', 'Librarian', 'LIB', 'Teaching', 'Head librarian and learning media custodian', 'active'),
      ('des_vvps_acct', 'sch_vvps', 'dept_vvps_accts', 'Head Accountant', 'ACCT', 'Non-Teaching', 'Senior financial officer and fee administrator', 'active'),
      ('des_vvps_rec', 'sch_vvps', 'dept_vvps_admin', 'Front Desk Officer / Receptionist', 'REC', 'Non-Teaching', 'Visitor relations, parent enquiry and telephone coordinator', 'active'),
      ('des_vvps_clerk', 'sch_vvps', 'dept_vvps_admin', 'Office Assistant / Clerk', 'CLK', 'Non-Teaching', 'Documentation and general administrative record keeping', 'active'),

      ('des_gisk_prn', 'sch_gisk', 'dept_gisk_acad', 'Principal', 'PRN', 'Teaching', 'Institutional head and superintendent of Gurukul', 'active'),
      ('des_gisk_tgt', 'sch_gisk', 'dept_gisk_acad', 'TGT - Mathematics & Science', 'TGT', 'Teaching', 'Senior instructor for secondary grades', 'active'),
      ('des_gisk_acct', 'sch_gisk', 'dept_gisk_accts', 'Accountant & Bursar', 'ACCT', 'Non-Teaching', 'School fees and accounting in-charge', 'active')
      ON CONFLICT DO NOTHING;
    `);

    // 7. Seed Subjects
    await db.query(`
      INSERT INTO subjects (id, school_id, name, code, type, description, status)
      VALUES
      ('sub_vvps_math', 'sch_vvps', 'Mathematics', 'MATH', 'Theory', 'Standard school mathematics and numerical reasoning', 'active'),
      ('sub_vvps_eng', 'sch_vvps', 'English Core', 'ENG', 'Theory', 'English language and literature', 'active'),
      ('sub_vvps_hin', 'sch_vvps', 'Hindi Literature', 'HIN', 'Theory', 'National language curriculum and composition', 'active'),
      ('sub_vvps_phy', 'sch_vvps', 'Physics', 'PHY', 'Both', 'Physics theory with practical laboratory sessions', 'active'),
      ('sub_vvps_chem', 'sch_vvps', 'Chemistry', 'CHEM', 'Both', 'Chemistry theory with practical laboratory experiments', 'active'),
      ('sub_vvps_bio', 'sch_vvps', 'Biology', 'BIO', 'Both', 'Biological sciences with specimen analysis', 'active'),
      ('sub_vvps_soc', 'sch_vvps', 'Social Science', 'SOC', 'Theory', 'History, Geography, Political Science, and Economics', 'active'),
      ('sub_vvps_cs', 'sch_vvps', 'Computer Science & IP', 'CS', 'Both', 'Coding, algorithms, databases, and IT systems', 'active'),
      ('sub_vvps_phe', 'sch_vvps', 'Physical Education', 'PHE', 'Practical', 'Physical wellness, sports rules, and field exercises', 'active'),

      ('sub_gisk_math', 'sch_gisk', 'Mathematics', 'MATH', 'Theory', 'Vedic and modern mathematics', 'active'),
      ('sub_gisk_sci', 'sch_gisk', 'General Science', 'SCI', 'Both', 'Integrated natural science curriculum', 'active'),
      ('sub_gisk_eng', 'sch_gisk', 'English Literature', 'ENG', 'Theory', 'English language curriculum', 'active')
      ON CONFLICT DO NOTHING;
    `);

    // 8. Seed Employees
    await db.query(`
      INSERT INTO employees (
        id, employee_id_number, user_id, school_id, employee_type, first_name, middle_name, last_name,
        profile_photo, gender, date_of_birth, mobile_number, alternate_mobile, email, official_email,
        address, city, district, state, pin_code, emergency_contact_name, emergency_contact_number, emergency_contact_relationship,
        department_id, designation_id, date_of_joining, employment_status, qualification, specialization,
        experience_years, previous_employer, blood_group, remarks
      ) VALUES
      (
        'emp_vvps_001', 'VVP-EMP-0001', 'usr_principal_vvps', 'sch_vvps', 'Teaching', 'Sunita', '', 'Mishra',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
        'FEMALE', '1976-04-15', '+91 98350 11001', '+91 98350 11002', 'sunita.mishra@example.com', 'principal@vidyavahini.edu.in',
        'Bungalow No. 1, Knowledge City Campus', 'Deoghar', 'Deoghar', 'Jharkhand', '814112',
        'Dr. R. K. Mishra', '+91 98350 99001', 'Spouse',
        'dept_vvps_acad', 'des_vvps_prn', '2016-06-01', 'ACTIVE', 'Ph.D in Education, M.Sc Physics, B.Ed', 'Educational Leadership & Quantum Mechanics',
        18.5, 'Delhi Public School Bokaro', 'O+', 'Founding Academic Principal. National CBSE Excellence Awardee.'
      ),
      (
        'emp_vvps_002', 'VVP-EMP-0002', NULL, 'sch_vvps', 'Teaching', 'Rajeshwar', 'Nath', 'Prasad',
        'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80',
        'MALE', '1981-08-22', '+91 98350 11003', NULL, 'rajeshwar.prasad@example.com', 'vprincipal@vidyavahini.edu.in',
        'Quarter 4B, Vidya Vahini Staff Enclave', 'Deoghar', 'Deoghar', 'Jharkhand', '814112',
        'Vandana Prasad', '+91 98350 99002', 'Spouse',
        'dept_vvps_acad', 'des_vvps_vprn', '2018-04-10', 'ACTIVE', 'M.Sc Mathematics, B.Ed', 'Calculus & Applied Statistics',
        14.0, 'St. Thomas High School Ranchi', 'B+', 'Oversees senior secondary academic curriculum and examination wing.'
      ),
      (
        'emp_vvps_003', 'VVP-EMP-0003', NULL, 'sch_vvps', 'Teaching', 'Ananya', '', 'Sen',
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
        'FEMALE', '1988-11-14', '+91 98350 11004', '+91 98350 11005', 'ananya.sen@example.com', 'ananya.sen@vidyavahini.edu.in',
        'Flat 203, Nilgiri Greens, VIP Road', 'Deoghar', 'Deoghar', 'Jharkhand', '814112',
        'Subir Sen', '+91 98350 99003', 'Father',
        'dept_vvps_sci', 'des_vvps_pgt', '2020-07-15', 'ACTIVE', 'M.Sc Physics (Gold Medalist), B.Ed', 'Electromagnetism & Modern Physics',
        9.0, 'Kendriya Vidyalaya Maithon', 'A+', 'Senior Physics specialist for Classes 11 and 12.'
      ),
      (
        'emp_vvps_004', 'VVP-EMP-0004', 'usr_teacher_vvps', 'sch_vvps', 'Teaching', 'Anand', 'Kumar', 'Jha',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        'MALE', '1990-03-12', '+91 98350 11006', NULL, 'anand.jha@example.com', 'anand.jha@vidyavahini.edu.in',
        'H.No 45, Castairs Town', 'Deoghar', 'Deoghar', 'Jharkhand', '814112',
        'Pankaj Jha', '+91 98350 99004', 'Brother',
        'dept_vvps_acad', 'des_vvps_tgt', '2021-08-01', 'ACTIVE', 'M.A History, B.Ed', 'Indian History & Social Sciences',
        7.5, 'DAV Public School Giridih', 'B+', 'Class Teacher for Class 1 Section A.'
      ),
      (
        'emp_vvps_005', 'VVP-EMP-0005', NULL, 'sch_vvps', 'Teaching', 'Sneha', '', 'Roy',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
        'FEMALE', '1993-09-05', '+91 98350 11007', NULL, 'sneha.roy@example.com', 'sneha.roy@vidyavahini.edu.in',
        'Flat 101, Anand Towers, Court Road', 'Deoghar', 'Deoghar', 'Jharkhand', '814112',
        'Sumit Roy', '+91 98350 99005', 'Spouse',
        'dept_vvps_acad', 'des_vvps_prt', '2022-03-15', 'ACTIVE', 'B.A English Literature, B.Ed', 'Early Childhood Phonics & Creative Writing',
        5.0, 'Loreto Convent Asansol', 'O-', 'Class Teacher for Class 1 Section B.'
      ),
      (
        'emp_vvps_006', 'VVP-EMP-0006', NULL, 'sch_vvps', 'Teaching', 'Vikramaditya', '', 'Sharma',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
        'MALE', '1989-12-19', '+91 98350 11008', NULL, 'vikram.sharma@example.com', 'vikram.sharma@vidyavahini.edu.in',
        'Quarter 12C, Vidya Vahini Staff Enclave', 'Deoghar', 'Deoghar', 'Jharkhand', '814112',
        'Sarla Sharma', '+91 98350 99006', 'Mother',
        'dept_vvps_it', 'des_vvps_comp', '2019-09-01', 'ACTIVE', 'MCA, B.Sc Computer Science', 'Python Programming, AI & Robotics',
        8.0, 'Modern Public School Dhanbad', 'AB+', 'Head of Computer Labs and STEM Innovation Club.'
      ),
      (
        'emp_vvps_007', 'VVP-EMP-0007', 'usr_accountant_vvps', 'sch_vvps', 'Non-Teaching', 'Manoj', 'Kumar', 'Verma',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
        'MALE', '1983-05-18', '+91 98350 11009', NULL, 'manoj.verma@example.com', 'accounts@vidyavahini.edu.in',
        'H.No 18, Shivganga Path', 'Deoghar', 'Deoghar', 'Jharkhand', '814112',
        'Kavita Verma', '+91 98350 99007', 'Spouse',
        'dept_vvps_accts', 'des_vvps_acct', '2017-02-01', 'ACTIVE', 'M.Com, Tally ERP Professional', 'Institutional Finance & Tally GST',
        11.5, 'Siddharth Finance & Audit', 'B+', 'Head Accountant managing student fee ledger and vendor reconciliations.'
      ),
      (
        'emp_vvps_008', 'VVP-EMP-0008', NULL, 'sch_vvps', 'Non-Teaching', 'Priya', '', 'Mukherjee',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        'FEMALE', '1995-07-28', '+91 98350 11010', NULL, 'priya.mukherjee@example.com', 'frontdesk@vidyavahini.edu.in',
        'Opposite Town Hall, Station Road', 'Deoghar', 'Deoghar', 'Jharkhand', '814112',
        'A. K. Mukherjee', '+91 98350 99008', 'Father',
        'dept_vvps_admin', 'des_vvps_rec', '2023-01-10', 'ON_PROBATION', 'B.A English, Diploma in PR', 'Public Relations & Institutional Communications',
        4.0, 'Mayur Hotel Corporate Desk', 'A-', 'Front Office In-charge & Admissions enquiry coordinator.'
      ),

      (
        'emp_gisk_001', 'GIS-EMP-0001', NULL, 'sch_gisk', 'Teaching', 'Ranjit', 'Kumar', 'Singh',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
        'MALE', '1974-01-11', '+91 6425 289001', NULL, 'ranjit.singh@example.com', 'principal@gurukulkatoria.edu.in',
        'Gurukul Residential Campus, Station Road', 'Katoria', 'Banka', 'Bihar', '813106',
        'Sunita Singh', '+91 6425 289901', 'Spouse',
        'dept_gisk_acad', 'des_gisk_prn', '2014-06-15', 'ACTIVE', 'M.A English, M.Ed', 'Holistic Education & School Leadership',
        20.0, 'Sainik School Tilaiya', 'O+', 'Principal of Gurukul International School Katoria.'
      ),
      (
        'emp_gisk_002', 'GIS-EMP-0002', NULL, 'sch_gisk', 'Teaching', 'Meenakshi', '', 'Kumari',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
        'FEMALE', '1992-06-30', '+91 6425 289002', NULL, 'meenakshi.kumari@example.com', 'meenakshi@gurukulkatoria.edu.in',
        'Ward 5, Gandhi Chowk', 'Katoria', 'Banka', 'Bihar', '813106',
        'Rakesh Kumar', '+91 6425 289902', 'Brother',
        'dept_gisk_acad', 'des_gisk_tgt', '2021-02-15', 'ACTIVE', 'M.Sc Chemistry, B.Ed', 'Inorganic Chemistry & Middle School Science',
        6.0, 'Prabhat Tara School Bhagalpur', 'B+', 'Senior Science and Math Faculty at Katoria campus.'
      ),
      (
        'emp_gisk_003', 'GIS-EMP-0003', NULL, 'sch_gisk', 'Non-Teaching', 'Suresh', 'Prasad', 'Mandal',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
        'MALE', '1987-10-10', '+91 6425 289003', NULL, 'suresh.mandal@example.com', 'accounts@gurukulkatoria.edu.in',
        'Main Road, Near BDO Office', 'Katoria', 'Banka', 'Bihar', '813106',
        'Gita Devi', '+91 6425 289903', 'Spouse',
        'dept_gisk_accts', 'des_gisk_acct', '2019-07-01', 'ACTIVE', 'B.Com, Accounting Diploma', 'Financial Bookkeeping & Cash Operations',
        8.0, 'Mandal Traders & Agro', 'A+', 'Accountant and Bursar for Katoria campus.'
      )
      ON CONFLICT DO NOTHING;
    `);

    // 9. Seed Qualifications
    await db.query(`
      INSERT INTO employee_qualifications (id, employee_id, qualification, specialization, institution, university_board, passing_year, percentage_grade, remarks)
      VALUES
      ('qual_001_1', 'emp_vvps_001', 'Ph.D in Education', 'Educational Policy & Pedagogy', 'Department of Education', 'Delhi University', 2011, 'Doctorate Awarded', 'Dissertation on modern scholastic assessment techniques'),
      ('qual_001_2', 'emp_vvps_001', 'M.Sc Physics', 'Solid State Physics', 'St. Stephen College', 'Delhi University', 2000, 'First Class (74.5%)', 'Gold Medal finalist'),
      ('qual_001_3', 'emp_vvps_001', 'B.Ed', 'Physical Sciences Pedagogy', 'Central Institute of Education', 'Delhi University', 2001, 'Distinction (81.0%)', 'University rank 3'),

      ('qual_002_1', 'emp_vvps_002', 'M.Sc Mathematics', 'Differential Equations & Pure Maths', 'Patna Science College', 'Patna University', 2006, 'First Class (76.8%)', 'Top tier merit'),
      ('qual_002_2', 'emp_vvps_002', 'B.Ed', 'Mathematics Pedagogy', 'Patna Training College', 'Patna University', 2007, 'First Class (78.2%)', 'Certified Senior Educator'),

      ('qual_003_1', 'emp_vvps_003', 'M.Sc Physics', 'Electrodynamics & Optics', 'Presidency College', 'Calcutta University', 2012, 'First Class Gold Medal (84.2%)', 'Department Gold Medalist'),
      ('qual_003_2', 'emp_vvps_003', 'B.Ed', 'Science Teaching', 'St. Xavier College of Education', 'Calcutta University', 2013, 'Distinction (82.5%)', 'Practical pedagogy topper'),

      ('qual_004_1', 'emp_vvps_004', 'M.A History', 'Modern Indian History', 'Banaras Hindu University', 'BHU Varanasi', 2014, 'First Class (72.0%)', 'Merit scholar'),
      ('qual_004_2', 'emp_vvps_004', 'B.Ed', 'Social Studies Pedagogy', 'Faculty of Education, Kamachha', 'BHU Varanasi', 2015, 'First Class (75.4%)', 'Active scout trainer certification'),

      ('qual_005_1', 'emp_vvps_005', 'B.A (Hons) English', 'English Literature', 'St. Xavier College', 'Ranchi University', 2016, 'First Class (71.2%)', 'Debating champion'),
      ('qual_005_2', 'emp_vvps_005', 'B.Ed', 'Language Pedagogy', 'Ursuline Teacher Training College', 'Ranchi University', 2017, 'Distinction (80.1%)', 'Phonics specialization'),

      ('qual_006_1', 'emp_vvps_006', 'MCA - Master of Computer Applications', 'Software Engineering & Databases', 'BIT Mesra', 'Birla Institute of Technology', 2013, 'CGPA 8.4 / 10', 'Dean Honor Roll'),
      ('qual_007_1', 'emp_vvps_007', 'M.Com', 'Financial Accounting & Taxation', 'Marwari College', 'TM Bhagalpur University', 2007, 'First Class (69.8%)', 'Auditing distinction')
      ON CONFLICT DO NOTHING;
    `);

    // 10. Seed Experience
    await db.query(`
      INSERT INTO employee_experience (id, employee_id, organization, designation, start_date, end_date, total_experience_months, responsibilities)
      VALUES
      ('exp_001_1', 'emp_vvps_001', 'Delhi Public School Bokaro', 'Vice Principal & PGT Physics', '2008-04-01', '2016-05-31', 98, 'Managed CBSE board examinations, teacher appraisal cycles, and academic faculty'),
      ('exp_002_1', 'emp_vvps_002', 'St. Thomas High School Ranchi', 'Senior Mathematics Teacher', '2010-06-01', '2018-03-31', 94, 'Curriculum head for high school mathematics and Olympiad training'),
      ('exp_003_1', 'emp_vvps_003', 'Kendriya Vidyalaya Maithon', 'PGT Physics', '2014-07-01', '2020-06-30', 72, 'Laboratory custodian and Class 12 board examination in-charge'),
      ('exp_004_1', 'emp_vvps_004', 'DAV Public School Giridih', 'TGT Social Science', '2016-04-01', '2021-07-15', 63, 'Class Teacher and coordinator for heritage and debate clubs'),
      ('exp_006_1', 'emp_vvps_006', 'Modern Public School Dhanbad', 'Senior Computer Faculty', '2014-06-01', '2019-08-15', 62, 'Designed computer lab curriculum and automated attendance tracking')
      ON CONFLICT DO NOTHING;
    `);

    // 11. Seed Documents
    await db.query(`
      INSERT INTO employee_documents (id, employee_id, document_type, file_name, file_size, file_data, mime_type, uploaded_by, verification_status, verified_by, verification_date, remarks)
      VALUES
      ('doc_emp_001_app', 'emp_vvps_001', 'Appointment Letter', 'Sunita_Mishra_Appointment_Order.svg', 24100,
       'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="400" height="200" fill="%23f8fafc" stroke="%2394a3b8"/><text x="200" y="85" font-family="sans-serif" font-size="15" font-weight="bold" fill="%230f172a" text-anchor="middle">Official Appointment Order</text><text x="200" y="115" font-family="sans-serif" font-size="12" fill="%2364748b" text-anchor="middle">Vidya Vahini Public School · Office of Trustees</text></svg>',
       'image/svg+xml', 'Trustee Board', 'VERIFIED', 'Super Administrator', CURRENT_TIMESTAMP, 'Original appointment letter on school board seal'),
      ('doc_emp_001_phd', 'emp_vvps_001', 'Degree Certificate', 'Sunita_Mishra_PhD_Convocation.svg', 28500,
       'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="400" height="200" fill="%23f8fafc" stroke="%2394a3b8"/><text x="200" y="85" font-family="sans-serif" font-size="15" font-weight="bold" fill="%230f172a" text-anchor="middle">Doctor of Philosophy Degree</text><text x="200" y="115" font-family="sans-serif" font-size="12" fill="%2364748b" text-anchor="middle">Delhi University Convocation Record</text></svg>',
       'image/svg+xml', 'Employee', 'VERIFIED', 'Super Administrator', CURRENT_TIMESTAMP, 'Verified against University convocation roll'),
      ('doc_emp_004_bed', 'emp_vvps_004', 'Degree Certificate', 'Anand_Jha_BEd_Certificate.svg', 19800,
       'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="400" height="200" fill="%23f8fafc" stroke="%2394a3b8"/><text x="200" y="85" font-family="sans-serif" font-size="15" font-weight="bold" fill="%230f172a" text-anchor="middle">Bachelor of Education Degree</text><text x="200" y="115" font-family="sans-serif" font-size="12" fill="%2364748b" text-anchor="middle">Banaras Hindu University</text></svg>',
       'image/svg+xml', 'Employee', 'VERIFIED', 'Dr. Sunita Mishra (Principal)', CURRENT_TIMESTAMP, 'B.Ed marks card and degree parchment verified')
      ON CONFLICT DO NOTHING;
    `);

    // 12. Seed Employment History
    await db.query(`
      INSERT INTO employee_employment_history (id, employee_id, event_type, effective_date, previous_value, new_value, remarks, changed_by_name)
      VALUES
      ('hist_001_1', 'emp_vvps_001', 'JOINING', '2016-06-01', NULL, 'ACTIVE', 'Appointed as Academic Principal by School Managing Committee', 'Chairman of Trust'),
      ('hist_002_1', 'emp_vvps_002', 'JOINING', '2018-04-10', NULL, 'ACTIVE', 'Joined as Senior Faculty & Vice Principal', 'Dr. Sunita Mishra (Principal)'),
      ('hist_004_1', 'emp_vvps_004', 'JOINING', '2021-08-01', NULL, 'ON_PROBATION', 'Joined as TGT Social Science on 1-year probation', 'School Administrator'),
      ('hist_004_2', 'emp_vvps_004', 'PROBATION_COMPLETION', '2022-08-01', 'ON_PROBATION', 'ACTIVE', 'Successfully completed probation period; confirmed in service', 'Dr. Sunita Mishra (Principal)'),
      ('hist_008_1', 'emp_vvps_008', 'JOINING', '2023-01-10', NULL, 'ON_PROBATION', 'Appointed as Front Desk Executive on probation', 'Amit Verma (Admin)')
      ON CONFLICT DO NOTHING;
    `);

    // 13. Seed Teacher Profiles
    await db.query(`
      INSERT INTO teacher_profiles (id, employee_id, school_id, specialization, highest_qualification, teaching_experience_years, bio, status)
      VALUES
      ('tp_vvps_001', 'emp_vvps_001', 'sch_vvps', 'Educational Administration & Physics', 'Ph.D, M.Sc, B.Ed', 18.5, 'Principal with two decades of experience in school transformation and educational research.', 'ACTIVE'),
      ('tp_vvps_002', 'emp_vvps_002', 'sch_vvps', 'Mathematics & Advanced Calculus', 'M.Sc Maths, B.Ed', 14.0, 'Senior mathematics educator renowned for competitive exam mentoring and statistical training.', 'ACTIVE'),
      ('tp_vvps_003', 'emp_vvps_003', 'sch_vvps', 'Senior Secondary Physics', 'M.Sc Physics, B.Ed', 9.0, 'Physics faculty leading experiential laboratory discovery and board exam preparation.', 'ACTIVE'),
      ('tp_vvps_004', 'emp_vvps_004', 'sch_vvps', 'Social Science & Heritage Studies', 'M.A History, B.Ed', 7.5, 'Class 1-A In-Charge and active youth scout trainer focusing on foundational history and civics.', 'ACTIVE'),
      ('tp_vvps_005', 'emp_vvps_005', 'sch_vvps', 'Primary English & Literature', 'B.A English, B.Ed', 5.0, 'Class 1-B In-Charge dedicated to early literacy, phonics, and public speaking development.', 'ACTIVE'),
      ('tp_vvps_006', 'emp_vvps_006', 'sch_vvps', 'Computer Science & AI', 'MCA', 8.0, 'Informatics Practices mentor and coding club leader for junior and middle school.', 'ACTIVE'),

      ('tp_gisk_001', 'emp_gisk_001', 'sch_gisk', 'School Leadership & Literature', 'M.A English, M.Ed', 20.0, 'Principal cultivating value-based education and scholastic excellence at Gurukul International.', 'ACTIVE'),
      ('tp_gisk_002', 'emp_gisk_002', 'sch_gisk', 'Secondary Science & Mathematics', 'M.Sc Chemistry, B.Ed', 6.0, 'Dynamic teacher leading STEM experiments and hands-on scientific projects.', 'ACTIVE')
      ON CONFLICT DO NOTHING;
    `);

    // 14. Seed Teacher Subject Assignments
    await db.query(`
      INSERT INTO teacher_subject_assignments (id, teacher_id, school_id, session_id, subject_id, class_id, section_id, is_primary_teacher, status)
      VALUES
      ('tsa_001', 'tp_vvps_004', 'sch_vvps', 'sess_vvps_2526', 'sub_vvps_soc', 'cls_vvps_3', 'sec_cls_vvps_3_a', true, 'active'),
      ('tsa_002', 'tp_vvps_005', 'sch_vvps', 'sess_vvps_2526', 'sub_vvps_eng', 'cls_vvps_3', 'sec_cls_vvps_3_b', true, 'active'),
      ('tsa_003', 'tp_vvps_002', 'sch_vvps', 'sess_vvps_2526', 'sub_vvps_math', 'cls_vvps_9', NULL, true, 'active'),
      ('tsa_004', 'tp_vvps_003', 'sch_vvps', 'sess_vvps_2526', 'sub_vvps_phy', 'cls_vvps_13', NULL, true, 'active'),
      ('tsa_005', 'tp_vvps_003', 'sch_vvps', 'sess_vvps_2526', 'sub_vvps_phy', 'cls_vvps_15', NULL, true, 'active'),
      ('tsa_006', 'tp_vvps_006', 'sch_vvps', 'sess_vvps_2526', 'sub_vvps_cs', 'cls_vvps_10', NULL, true, 'active'),

      ('tsa_007', 'tp_gisk_002', 'sch_gisk', 'sess_gisk_2526', 'sub_gisk_math', 'cls_gisk_2', NULL, true, 'active'),
      ('tsa_008', 'tp_gisk_002', 'sch_gisk', 'sess_gisk_2526', 'sub_gisk_sci', 'cls_gisk_2', NULL, true, 'active')
      ON CONFLICT DO NOTHING;
    `);

    // 15. Seed Class Teacher Assignments
    await db.query(`
      INSERT INTO class_teacher_assignments (id, school_id, session_id, class_id, section_id, teacher_id, academic_year, status, assigned_date, remarks)
      VALUES
      ('cta_001', 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_3', 'sec_cls_vvps_3_a', 'tp_vvps_004', '2025-26', 'active', '2025-04-01', 'Class 1 Section A Class Teacher in-charge'),
      ('cta_002', 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_3', 'sec_cls_vvps_3_b', 'tp_vvps_005', '2025-26', 'active', '2025-04-01', 'Class 1 Section B Class Teacher in-charge')
      ON CONFLICT DO NOTHING;
    `);

    console.log('[DB] Phase 4 Teachers & Staff seeded successfully.');
  } catch (err: any) {
    (globalThis as any).__phase4Error = err?.message || String(err);
    console.error('[DB PHASE 4 INIT ERROR]', err);
  }
}

async function ensurePhase5SchemaAndData() {
  try {
    // 1. Create Phase 5 tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS school_calendar_events (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        event_type VARCHAR(30) NOT NULL,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        is_instructional_day BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_school_cal_date UNIQUE(school_id, date)
      );

      CREATE TABLE IF NOT EXISTS attendance_settings (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) UNIQUE NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        lock_after_days INT DEFAULT 2,
        allow_future_marking BOOLEAN DEFAULT FALSE,
        allow_holiday_marking BOOLEAN DEFAULT FALSE,
        default_session VARCHAR(20) DEFAULT 'FULL_DAY',
        student_min_percentage NUMERIC(5, 2) DEFAULT 75.00,
        staff_min_percentage NUMERIC(5, 2) DEFAULT 80.00,
        staff_check_in_time VARCHAR(10) DEFAULT '08:30',
        staff_check_out_time VARCHAR(10) DEFAULT '16:00',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS student_attendance (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        section_id VARCHAR(50) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        attendance_session VARCHAR(20) DEFAULT 'FULL_DAY',
        status VARCHAR(20) NOT NULL,
        arrival_time VARCHAR(10),
        remarks TEXT,
        marked_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        marked_by_name VARCHAR(100),
        is_locked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_student_att_slot UNIQUE(student_id, date, attendance_session)
      );

      CREATE TABLE IF NOT EXISTS staff_attendance (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status VARCHAR(20) NOT NULL,
        check_in_time VARCHAR(10),
        check_out_time VARCHAR(10),
        work_duration_minutes INT,
        remarks TEXT,
        marked_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        marked_by_name VARCHAR(100),
        is_locked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_staff_att_date UNIQUE(employee_id, date)
      );

      CREATE TABLE IF NOT EXISTS attendance_correction_requests (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        record_type VARCHAR(20) NOT NULL,
        attendance_id VARCHAR(50) NOT NULL,
        student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
        target_date DATE NOT NULL,
        previous_status VARCHAR(20) NOT NULL,
        requested_status VARCHAR(20) NOT NULL,
        reason TEXT NOT NULL,
        document_url TEXT,
        requested_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        requested_by_name VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        reviewed_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        reviewed_by_name VARCHAR(100),
        review_remarks TEXT,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_student_att_school_date ON student_attendance(school_id, date);
      CREATE INDEX IF NOT EXISTS idx_student_att_class_sec_date ON student_attendance(class_id, section_id, date);
      CREATE INDEX IF NOT EXISTS idx_student_att_student_date ON student_attendance(student_id, date);
      CREATE INDEX IF NOT EXISTS idx_staff_att_school_date ON staff_attendance(school_id, date);
      CREATE INDEX IF NOT EXISTS idx_staff_att_emp_date ON staff_attendance(employee_id, date);
      CREATE INDEX IF NOT EXISTS idx_school_cal_date ON school_calendar_events(school_id, date);
      CREATE INDEX IF NOT EXISTS idx_att_corr_status ON attendance_correction_requests(school_id, status);
    `);

    // 2. Register Phase 5 Permissions
    const phase5Permissions = [
      { id: 'attendance.student.view', module: 'Attendance', name: 'View Student Attendance', desc: 'View student attendance registers and reports' },
      { id: 'attendance.student.mark', module: 'Attendance', name: 'Mark Student Attendance', desc: 'Take daily attendance for assigned classes' },
      { id: 'attendance.student.edit', module: 'Attendance', name: 'Edit Student Attendance', desc: 'Modify existing student attendance records' },
      { id: 'attendance.student.export', module: 'Attendance', name: 'Export Student Attendance', desc: 'Download CSV and PDF monthly registers' },
      { id: 'attendance.staff.view', module: 'Attendance', name: 'View Staff Attendance', desc: 'Inspect faculty and employee daily roster' },
      { id: 'attendance.staff.mark', module: 'Attendance', name: 'Mark Staff Attendance', desc: 'Record employee check-in, check-out and statuses' },
      { id: 'attendance.staff.edit', module: 'Attendance', name: 'Edit Staff Attendance', desc: 'Modify employee attendance and work hours' },
      { id: 'attendance.staff.export', module: 'Attendance', name: 'Export Staff Attendance', desc: 'Export monthly staff attendance timesheets' },
      { id: 'attendance.report.view', module: 'Attendance', name: 'View Attendance Reports', desc: 'Access analytics, registers, and trends' },
      { id: 'attendance.correction.request', module: 'Attendance', name: 'Request Attendance Correction', desc: 'Submit formal correction requests for review' },
      { id: 'attendance.correction.approve', module: 'Attendance', name: 'Approve Attendance Corrections', desc: 'Approve or reject attendance adjustments' },
      { id: 'attendance.lock', module: 'Attendance', name: 'Lock Daily Attendance', desc: 'Freeze attendance registers to prevent further edits' },
      { id: 'attendance.unlock', module: 'Attendance', name: 'Reopen Locked Attendance', desc: 'Authorize reopening of locked daily attendance' },
      { id: 'calendar.view', module: 'Calendar', name: 'View School Calendar', desc: 'View academic sessions, holidays, and working days' },
      { id: 'calendar.manage', module: 'Calendar', name: 'Manage School Calendar', desc: 'Create and configure holidays and instructional days' }
    ];

    for (const p of phase5Permissions) {
      await db.query(`
        INSERT INTO permissions (id, module, name, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
      `, [p.id, p.module, p.name, p.desc]);

      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_super_admin', $1) ON CONFLICT DO NOTHING`, [p.id]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_school_admin', $1) ON CONFLICT DO NOTHING`, [p.id]);
    }

    const principalPerms = [
      'attendance.student.view', 'attendance.student.mark', 'attendance.student.edit', 'attendance.student.export',
      'attendance.staff.view', 'attendance.staff.mark', 'attendance.staff.edit', 'attendance.staff.export',
      'attendance.report.view', 'attendance.correction.request', 'attendance.correction.approve',
      'attendance.lock', 'attendance.unlock', 'calendar.view', 'calendar.manage'
    ];
    for (const pid of principalPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_principal', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    const teacherPerms = [
      'attendance.student.view', 'attendance.student.mark', 'attendance.student.edit',
      'attendance.report.view', 'attendance.correction.request', 'calendar.view'
    ];
    for (const pid of teacherPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_teacher', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    const staffPerms = ['calendar.view', 'attendance.correction.request'];
    for (const pid of staffPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_accountant', $1) ON CONFLICT DO NOTHING`, [pid]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_receptionist', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    // 3. Seed Attendance Settings
    await db.query(`
      INSERT INTO attendance_settings (id, school_id, lock_after_days, allow_future_marking, allow_holiday_marking, default_session, student_min_percentage, staff_min_percentage, staff_check_in_time, staff_check_out_time)
      VALUES
      ('set_vvps', 'sch_vvps', 3, false, false, 'FULL_DAY', 75.00, 80.00, '08:30', '16:00'),
      ('set_gisk', 'sch_gisk', 3, false, false, 'FULL_DAY', 75.00, 80.00, '08:30', '16:00')
      ON CONFLICT (school_id) DO NOTHING;
    `);

    // 4. Seed School Calendar Events (Holidays & Special Working Days)
    await db.query(`
      INSERT INTO school_calendar_events (id, school_id, session_id, date, event_type, title, description, is_instructional_day)
      VALUES
      ('cal_vvps_001', 'sch_vvps', 'sess_vvps_2526', '2026-01-26', 'HOLIDAY', 'Republic Day Celebration', 'National Flag hoisting and cultural assembly', false),
      ('cal_vvps_002', 'sch_vvps', 'sess_vvps_2526', '2026-02-15', 'HOLIDAY', 'Maha Shivaratri', 'Public gazetted holiday observed', false),
      ('cal_vvps_003', 'sch_vvps', 'sess_vvps_2526', '2026-03-04', 'HOLIDAY', 'Holi Festival (Holika Dahan)', 'Spring festival official school closure', false),
      ('cal_vvps_004', 'sch_vvps', 'sess_vvps_2526', '2026-03-05', 'HOLIDAY', 'Holi Festival (Dulhendi)', 'Color festival official holiday', false),
      ('cal_vvps_005', 'sch_vvps', 'sess_vvps_2526', '2026-03-14', 'SPECIAL_WORKING_DAY', 'Annual Inter-House Sports & Exhibition Day', 'Instructional activities and athletic heats scheduled', true),
      ('cal_vvps_006', 'sch_vvps', 'sess_vvps_2526', '2026-03-29', 'HOLIDAY', 'Mahavir Jayanti', 'Gazetted religious holiday', false),
      ('cal_vvps_007', 'sch_vvps', 'sess_vvps_2526', '2026-04-03', 'HOLIDAY', 'Good Friday', 'National gazetted holiday', false),

      ('cal_gisk_001', 'sch_gisk', 'sess_gisk_2526', '2026-01-26', 'HOLIDAY', 'Republic Day', 'National Day celebration', false),
      ('cal_gisk_002', 'sch_gisk', 'sess_gisk_2526', '2026-02-15', 'HOLIDAY', 'Maha Shivaratri', 'Campus festival holiday', false),
      ('cal_gisk_003', 'sch_gisk', 'sess_gisk_2526', '2026-03-04', 'HOLIDAY', 'Holi Holiday', 'Spring break celebration', false),
      ('cal_gisk_004', 'sch_gisk', 'sess_gisk_2526', '2026-03-05', 'HOLIDAY', 'Holi Holiday', 'Color festival', false)
      ON CONFLICT (school_id, date) DO NOTHING;
    `);

    // 5. Seed Additional Students for Class 1 Section A (cls_vvps_3, sec_cls_vvps_3_a) for rich cohort
    await db.query(`
      INSERT INTO students (
        id, admission_number, registration_number, first_name, middle_name, last_name,
        date_of_birth, gender, blood_group, nationality, religion, category, aadhaar_number,
        mobile_number, email, address, city, district, state, pin_code, admission_date,
        school_id, session_id, class_id, section_id, roll_number, previous_school, student_status, remarks
      ) VALUES
      (
        'stu_vvps_006', 'VVP-2025-0006', 'REG/2025/106', 'Vihaan', '', 'Singhania',
        '2019-06-18', 'Male', 'A+', 'Indian', 'Hinduism', 'General', '5521 9876 1234',
        '+91 98350 77112', 'vihaan.s@student.vvps.edu', 'C-10, Castairs Town', 'Deoghar', 'Deoghar', 'Jharkhand', '814112', '2025-04-16',
        'sch_vvps', 'sess_vvps_2526', 'cls_vvps_3', 'sec_cls_vvps_3_a', '02', 'Kids Garden School', 'ACTIVE', 'Active participant in music and recitation.'
      ),
      (
        'stu_vvps_007', 'VVP-2025-0007', 'REG/2025/107', 'Isha', '', 'Patel',
        '2019-08-09', 'Female', 'O+', 'Indian', 'Hinduism', 'General', '7732 1122 3344',
        '+91 98350 77114', 'isha.patel@student.vvps.edu', 'Flat 102, Shanti Vihar', 'Deoghar', 'Deoghar', 'Jharkhand', '814112', '2025-04-18',
        'sch_vvps', 'sess_vvps_2526', 'cls_vvps_3', 'sec_cls_vvps_3_a', '03', 'Mount Litera Pre-School', 'ACTIVE', 'Strong numerical curiosity.'
      ),
      (
        'stu_vvps_008', 'VVP-2025-0008', 'REG/2025/108', 'Kabir', '', 'Das',
        '2019-04-25', 'Male', 'B+', 'Indian', 'Hinduism', 'SC', '8843 4455 6677',
        '+91 98350 77116', 'kabir.das@student.vvps.edu', 'Near Tower Chowk', 'Deoghar', 'Deoghar', 'Jharkhand', '814112', '2025-04-20',
        'sch_vvps', 'sess_vvps_2526', 'cls_vvps_3', 'sec_cls_vvps_3_a', '04', 'St. Anne Montessori', 'ACTIVE', 'Young athletics champion.'
      ),
      (
        'stu_vvps_009', 'VVP-2025-0009', 'REG/2025/109', 'Meera', '', 'Sen',
        '2019-09-30', 'Female', 'AB+', 'Indian', 'Hinduism', 'General', '9954 7788 9900',
        '+91 98350 77118', 'meera.sen@student.vvps.edu', 'Bungalow 7, VIP Road', 'Deoghar', 'Deoghar', 'Jharkhand', '814112', '2025-04-22',
        'sch_vvps', 'sess_vvps_2526', 'cls_vvps_3', 'sec_cls_vvps_3_a', '05', 'Heritage School Dhanbad', 'ACTIVE', 'High attendance record, keen artist.'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // Add enrollments for the new students
    await db.query(`
      INSERT INTO student_enrollments (id, student_id, school_id, session_id, class_id, section_id, roll_number, enrollment_date, status)
      VALUES
      ('enr_vvps_006', 'stu_vvps_006', 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_3', 'sec_cls_vvps_3_a', '02', '2025-04-16', 'ACTIVE'),
      ('enr_vvps_007', 'stu_vvps_007', 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_3', 'sec_cls_vvps_3_a', '03', '2025-04-18', 'ACTIVE'),
      ('enr_vvps_008', 'stu_vvps_008', 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_3', 'sec_cls_vvps_3_a', '04', '2025-04-20', 'ACTIVE'),
      ('enr_vvps_009', 'stu_vvps_009', 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_3', 'sec_cls_vvps_3_a', '05', '2025-04-22', 'ACTIVE')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 6. Check if student attendance already seeded
    const attCheck = await db.query('SELECT count(*) as count FROM student_attendance');
    if (parseInt((attCheck.rows[0] as { count: string }).count, 10) > 0) {
      console.log('[DB] Phase 5 Attendance schema verified and existing records found.');
      return;
    }

    console.log('[DB] Seeding Phase 5 Attendance records for Class 1 and Staff...');

    // Seed student attendance for Class 1 Section A for recent instructional days in February & March 2026
    const sampleStudentDates = ['2026-02-09', '2026-02-10', '2026-02-11', '2026-02-12', '2026-02-13', '2026-03-02', '2026-03-03', '2026-03-06', '2026-03-09'];
    const studentIds = ['stu_vvps_001', 'stu_vvps_006', 'stu_vvps_007', 'stu_vvps_008', 'stu_vvps_009'];

    let attCounter = 1;
    for (const d of sampleStudentDates) {
      for (const sid of studentIds) {
        let status = 'PRESENT';
        let arrivalTime = '08:20';
        let remarks = 'On time';

        // Realistic distribution
        if (sid === 'stu_vvps_008' && d === '2026-03-02') {
          status = 'ABSENT';
          arrivalTime = '';
          remarks = 'Unexcused absence on Monday';
        } else if (sid === 'stu_vvps_007' && d === '2026-02-11') {
          status = 'LATE';
          arrivalTime = '08:45';
          remarks = 'School bus delayed at railway crossing';
        } else if (sid === 'stu_vvps_006' && d === '2026-02-13') {
          status = 'HALF_DAY';
          arrivalTime = '08:15';
          remarks = 'Doctor appointment in the afternoon';
        } else if (sid === 'stu_vvps_001' && d === '2026-03-06') {
          status = 'ON_LEAVE';
          arrivalTime = '';
          remarks = 'Pre-sanctioned medical leave';
        }

        const id = `satt_${attCounter++}`;
        await db.query(`
          INSERT INTO student_attendance (
            id, school_id, session_id, class_id, section_id, student_id,
            date, attendance_session, status, arrival_time, remarks,
            marked_by_id, marked_by_name, is_locked
          ) VALUES ($1, 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_3', 'sec_cls_vvps_3_a', $2, $3, 'FULL_DAY', $4, $5, $6, 'usr_teacher_vvps', 'Anand Kumar Jha (Class Teacher)', true)
          ON CONFLICT (student_id, date, attendance_session) DO NOTHING;
        `, [id, sid, d, status, arrivalTime, remarks]);
      }
    }

    // 7. Seed Staff Attendance
    const sampleStaff = [
      { id: 'emp_vvps_001', in: '08:15', out: '16:45', dur: 510 },
      { id: 'emp_vvps_002', in: '08:20', out: '16:30', dur: 490 },
      { id: 'emp_vvps_003', in: '08:25', out: '16:20', dur: 475 },
      { id: 'emp_vvps_004', in: '08:20', out: '16:15', dur: 475 },
      { id: 'emp_vvps_005', in: '08:28', out: '16:10', dur: 462 },
      { id: 'emp_vvps_006', in: '08:22', out: '16:25', dur: 483 },
      { id: 'emp_vvps_007', in: '08:30', out: '16:30', dur: 480 },
      { id: 'emp_vvps_008', in: '08:25', out: '16:05', dur: 460 }
    ];

    let staffAttCounter = 1;
    for (const d of sampleStudentDates) {
      for (const st of sampleStaff) {
        let status = 'PRESENT';
        let checkIn = st.in;
        let checkOut = st.out;
        let dur = st.dur;
        let remarks = 'Full duty verified';

        if (st.id === 'emp_vvps_004' && d === '2026-02-12') {
          status = 'ON_LEAVE';
          checkIn = null as any;
          checkOut = null as any;
          dur = 0;
          remarks = 'Sanctioned duty leave for CBSE examination observership';
        } else if (st.id === 'emp_vvps_008' && d === '2026-03-03') {
          status = 'LATE';
          checkIn = '08:52';
          remarks = 'Traffic bottleneck at main campus roundabout';
        }

        const id = `stfatt_${staffAttCounter++}`;
        await db.query(`
          INSERT INTO staff_attendance (
            id, school_id, employee_id, date, status, check_in_time, check_out_time,
            work_duration_minutes, remarks, marked_by_id, marked_by_name, is_locked
          ) VALUES ($1, 'sch_vvps', $2, $3, $4, $5, $6, $7, $8, 'usr_admin_vvps', 'Amit Verma (Admin)', true)
          ON CONFLICT (employee_id, date) DO NOTHING;
        `, [id, st.id, d, status, checkIn, checkOut, dur, remarks]);
      }
    }

    // 8. Seed Attendance Correction Requests
    await db.query(`
      INSERT INTO attendance_correction_requests (
        id, school_id, record_type, attendance_id, student_id, employee_id, target_date,
        previous_status, requested_status, reason, requested_by_id, requested_by_name,
        status, reviewed_by_id, reviewed_by_name, review_remarks, reviewed_at
      ) VALUES
      (
        'corr_001', 'sch_vvps', 'STUDENT', 'satt_29', 'stu_vvps_008', NULL, '2026-03-02',
        'ABSENT', 'PRESENT', 'Student was participating in District Science Olympiad representing school. Official participation slip attached.',
        'usr_teacher_vvps', 'Anand Kumar Jha (Class Teacher)', 'PENDING', NULL, NULL, NULL, NULL
      ),
      (
        'corr_002', 'sch_vvps', 'STAFF', 'stfatt_28', NULL, 'emp_vvps_004', '2026-02-12',
        'ABSENT', 'ON_LEAVE', 'Was on authorized external duty representing VVPS at CBSE Regional Examination Center.',
        'usr_teacher_vvps', 'Anand Kumar Jha', 'APPROVED', 'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)',
        'Approved based on CBSE deputation order letter.', CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('[DB] Phase 5 Attendance & School Calendar seeded successfully.');
  } catch (err: any) {
    (globalThis as any).__phase5Error = err?.message || String(err);
    console.error('[DB PHASE 5 INIT ERROR]', err);
  }
}

async function ensurePhase6SchemaAndData() {
  try {
    console.log('[DB] Ensuring Phase 6 Fees & Accounts Schema...');

    // 1. Add receipt_prefix to schools if not exists
    await db.exec(`
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS receipt_prefix VARCHAR(20) DEFAULT 'REC';
      UPDATE schools SET receipt_prefix = 'VVP-REC' WHERE id = 'sch_vvps' AND (receipt_prefix IS NULL OR receipt_prefix = 'REC');
      UPDATE schools SET receipt_prefix = 'GIS-REC' WHERE id = 'sch_gisk' AND (receipt_prefix IS NULL OR receipt_prefix = 'REC');

      -- 2. Fee Categories
      CREATE TABLE IF NOT EXISTS fee_categories (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        is_system BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_fee_cat_code UNIQUE(school_id, code)
      );

      -- 3. Fee Structures
      CREATE TABLE IF NOT EXISTS fee_structures (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        frequency VARCHAR(30) DEFAULT 'QUARTERLY',
        target_type VARCHAR(20) DEFAULT 'CLASS',
        class_ids TEXT DEFAULT '[]',
        is_locked BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_fee_struct_code UNIQUE(school_id, session_id, code)
      );

      -- 4. Fee Structure Items
      CREATE TABLE IF NOT EXISTS fee_structure_items (
        id VARCHAR(50) PRIMARY KEY,
        structure_id VARCHAR(50) NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
        category_id VARCHAR(50) NOT NULL REFERENCES fee_categories(id) ON DELETE CASCADE,
        amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        is_mandatory BOOLEAN DEFAULT TRUE,
        late_fee_amount NUMERIC(12, 2) DEFAULT 0.00,
        late_fee_type VARCHAR(20) DEFAULT 'FIXED',
        grace_period_days INT DEFAULT 7,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 5. Fee Installments
      CREATE TABLE IF NOT EXISTS fee_installments (
        id VARCHAR(50) PRIMARY KEY,
        structure_id VARCHAR(50) NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
        installment_number INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        due_date DATE NOT NULL,
        late_fee_date DATE NOT NULL,
        percentage_share NUMERIC(5, 2) DEFAULT 100.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 6. Student Fee Assignments
      CREATE TABLE IF NOT EXISTS student_fee_assignments (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        section_id VARCHAR(50) REFERENCES sections(id) ON DELETE SET NULL,
        structure_id VARCHAR(50) NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
        total_charges NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        total_concessions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        total_late_fees NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        net_payable NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        waived_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        refunded_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        outstanding_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'PENDING',
        assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_student_fee_assign UNIQUE(student_id, session_id, structure_id)
      );

      -- 7. Student Fee Charges
      CREATE TABLE IF NOT EXISTS student_fee_charges (
        id VARCHAR(50) PRIMARY KEY,
        assignment_id VARCHAR(50) NOT NULL REFERENCES student_fee_assignments(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        category_id VARCHAR(50) NOT NULL REFERENCES fee_categories(id) ON DELETE CASCADE,
        installment_name VARCHAR(100) NOT NULL,
        installment_no INT NOT NULL DEFAULT 1,
        due_date DATE NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        concession_amount NUMERIC(12, 2) DEFAULT 0.00,
        late_fee_charged NUMERIC(12, 2) DEFAULT 0.00,
        late_fee_waived NUMERIC(12, 2) DEFAULT 0.00,
        paid_amount NUMERIC(12, 2) DEFAULT 0.00,
        outstanding_amount NUMERIC(12, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 8. Fee Concessions & Scholarships
      CREATE TABLE IF NOT EXISTS fee_concessions (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        assignment_id VARCHAR(50) REFERENCES student_fee_assignments(id) ON DELETE CASCADE,
        charge_id VARCHAR(50) REFERENCES student_fee_charges(id) ON DELETE SET NULL,
        category_id VARCHAR(50) REFERENCES fee_categories(id) ON DELETE SET NULL,
        concession_type VARCHAR(50) NOT NULL,
        discount_type VARCHAR(20) NOT NULL,
        discount_value NUMERIC(12, 2) NOT NULL,
        calculated_amount NUMERIC(12, 2) NOT NULL,
        reason TEXT NOT NULL,
        document_url TEXT,
        status VARCHAR(20) DEFAULT 'PENDING',
        requested_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        requested_by_name VARCHAR(100) NOT NULL,
        approved_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        approved_by_name VARCHAR(100),
        approval_remarks TEXT,
        approved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 9. Fee Payments
      CREATE TABLE IF NOT EXISTS fee_payments (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        receipt_number VARCHAR(50) UNIQUE NOT NULL,
        payment_date DATE NOT NULL,
        payment_time VARCHAR(10) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        payment_mode VARCHAR(30) NOT NULL,
        transaction_reference VARCHAR(100),
        cheque_number VARCHAR(50),
        cheque_date DATE,
        bank_name VARCHAR(100),
        verification_status VARCHAR(30) DEFAULT 'VERIFIED',
        status VARCHAR(20) DEFAULT 'SUCCESS',
        collected_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        collected_by_name VARCHAR(100) NOT NULL,
        remarks TEXT,
        advance_amount_used NUMERIC(12, 2) DEFAULT 0.00,
        advance_amount_generated NUMERIC(12, 2) DEFAULT 0.00,
        idempotency_key VARCHAR(100) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 10. Fee Payment Allocations
      CREATE TABLE IF NOT EXISTS fee_payment_allocations (
        id VARCHAR(50) PRIMARY KEY,
        payment_id VARCHAR(50) NOT NULL REFERENCES fee_payments(id) ON DELETE CASCADE,
        charge_id VARCHAR(50) NOT NULL REFERENCES student_fee_charges(id) ON DELETE CASCADE,
        amount_allocated NUMERIC(12, 2) NOT NULL,
        category_name VARCHAR(100) NOT NULL,
        installment_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 11. Fee Receipts
      CREATE TABLE IF NOT EXISTS fee_receipts (
        id VARCHAR(50) PRIMARY KEY,
        payment_id VARCHAR(50) UNIQUE NOT NULL REFERENCES fee_payments(id) ON DELETE CASCADE,
        receipt_number VARCHAR(50) NOT NULL,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        total_amount NUMERIC(12, 2) NOT NULL,
        payload_json TEXT NOT NULL,
        reprint_count INT DEFAULT 0,
        last_reprinted_at TIMESTAMP WITH TIME ZONE,
        last_reprinted_by VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 12. Fee Refunds
      CREATE TABLE IF NOT EXISTS fee_refunds (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        payment_id VARCHAR(50) NOT NULL REFERENCES fee_payments(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        amount NUMERIC(12, 2) NOT NULL,
        reason TEXT NOT NULL,
        payment_mode VARCHAR(30) DEFAULT 'BANK_TRANSFER',
        transaction_reference VARCHAR(100),
        status VARCHAR(20) DEFAULT 'PENDING',
        requested_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        requested_by_name VARCHAR(100) NOT NULL,
        approved_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        approved_by_name VARCHAR(100),
        approval_remarks TEXT,
        approved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 13. Fee Reversals
      CREATE TABLE IF NOT EXISTS fee_reversals (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        payment_id VARCHAR(50) NOT NULL REFERENCES fee_payments(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        amount NUMERIC(12, 2) NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'REVERSED',
        reversed_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        reversed_by_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 14. Fee Late Fee Rules & Entries
      CREATE TABLE IF NOT EXISTS fee_late_fee_rules (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) UNIQUE NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        grace_period_days INT DEFAULT 7,
        calculation_type VARCHAR(20) DEFAULT 'FIXED_PER_MONTH',
        rate_amount NUMERIC(12, 2) DEFAULT 100.00,
        max_cap_amount NUMERIC(12, 2) DEFAULT 1000.00,
        is_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS fee_late_fee_entries (
        id VARCHAR(50) PRIMARY KEY,
        charge_id VARCHAR(50) NOT NULL REFERENCES student_fee_charges(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        amount NUMERIC(12, 2) NOT NULL,
        posted_date DATE NOT NULL DEFAULT CURRENT_DATE,
        is_waived BOOLEAN DEFAULT FALSE,
        waived_reason TEXT,
        waived_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        waived_by_name VARCHAR(100),
        waived_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 15. Expense Categories & Expenses
      CREATE TABLE IF NOT EXISTS expense_categories (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_exp_cat UNIQUE(school_id, code)
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        category_id VARCHAR(50) NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
        expense_date DATE NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        payment_mode VARCHAR(30) DEFAULT 'BANK_TRANSFER',
        payee_vendor VARCHAR(150) NOT NULL,
        reference_no VARCHAR(100),
        description TEXT,
        supporting_doc_url TEXT,
        approval_status VARCHAR(20) DEFAULT 'APPROVED',
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_by_name VARCHAR(100) NOT NULL,
        approved_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        approved_by_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 16. Fee Reminders
      CREATE TABLE IF NOT EXISTS fee_reminders (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        reminder_type VARCHAR(30) DEFAULT 'OVERDUE',
        target_due_date DATE,
        amount_due NUMERIC(12, 2) NOT NULL,
        parent_name VARCHAR(100) NOT NULL,
        parent_mobile VARCHAR(50) NOT NULL,
        parent_email VARCHAR(100),
        channel VARCHAR(30) DEFAULT 'MANUAL_PHONE_LOG',
        message_text TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'LOGGED',
        created_by_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for High Performance
      CREATE INDEX IF NOT EXISTS idx_fee_cat_school ON fee_categories(school_id);
      CREATE INDEX IF NOT EXISTS idx_fee_struct_school_session ON fee_structures(school_id, session_id);
      CREATE INDEX IF NOT EXISTS idx_student_fee_assign_student ON student_fee_assignments(student_id);
      CREATE INDEX IF NOT EXISTS idx_student_fee_assign_class ON student_fee_assignments(class_id, section_id);
      CREATE INDEX IF NOT EXISTS idx_fee_charges_student ON student_fee_charges(student_id);
      CREATE INDEX IF NOT EXISTS idx_fee_charges_assignment ON student_fee_charges(assignment_id);
      CREATE INDEX IF NOT EXISTS idx_fee_payments_school_date ON fee_payments(school_id, payment_date);
      CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
      CREATE INDEX IF NOT EXISTS idx_fee_receipts_num ON fee_receipts(receipt_number);
      CREATE INDEX IF NOT EXISTS idx_expenses_school_date ON expenses(school_id, expense_date);
    `);

    // 2. Register Phase 6 Permissions
    const phase6Permissions = [
      { id: 'fees.structure.view', module: 'Fees', name: 'View Fee Structures', desc: 'Inspect school fee plans, categories, and installment rules' },
      { id: 'fees.structure.manage', module: 'Fees', name: 'Manage Fee Structures', desc: 'Create, update, or deactivate fee structures and categories' },
      { id: 'fees.assign', module: 'Fees', name: 'Assign Student Fees', desc: 'Assign class and individual student fee plans' },
      { id: 'fees.collect', module: 'Fees', name: 'Collect Fees', desc: 'Accept cash, UPI, bank, and card payments and generate receipts' },
      { id: 'fees.receipt.view', module: 'Fees', name: 'View Fee Receipts', desc: 'Inspect issued student payment receipts' },
      { id: 'fees.receipt.reprint', module: 'Fees', name: 'Reprint Fee Receipts', desc: 'Reprint official money receipt vouchers' },
      { id: 'fees.concession.request', module: 'Fees', name: 'Request Fee Concession', desc: 'Submit scholarship, discount, or sibling fee waiver requests' },
      { id: 'fees.concession.approve', module: 'Fees', name: 'Approve Fee Concessions', desc: 'Approve or reject fee adjustments and scholarships' },
      { id: 'fees.refund.request', module: 'Fees', name: 'Request Fee Refund', desc: 'Submit fee refund requests for authorized review' },
      { id: 'fees.refund.approve', module: 'Fees', name: 'Approve Fee Refunds', desc: 'Authorize and execute student fee refunds' },
      { id: 'fees.reversal.manage', module: 'Fees', name: 'Reverse Fee Payments', desc: 'Perform authorized reversal of erroneous transactions' },
      { id: 'fees.late_fee.manage', module: 'Fees', name: 'Manage Late Fees', desc: 'Configure grace periods, calculate, post, or waive late fees' },
      { id: 'fees.ledger.view', module: 'Fees', name: 'View Student Fee Ledger', desc: 'View comprehensive financial ledgers for students' },
      { id: 'fees.reports.view', module: 'Fees', name: 'View Financial Reports', desc: 'View daily, monthly, and head-wise collection analytics' },
      { id: 'fees.reports.export', module: 'Fees', name: 'Export Financial Data', desc: 'Export spreadsheets and fee registers' },
      { id: 'fees.expenses.manage', module: 'Accounts', name: 'Manage Expense Register', desc: 'Record school operating expenses and vendor payments' },
      { id: 'fees.reminders.manage', module: 'Fees', name: 'Manage Fee Reminders', desc: 'Log and track fee due reminders and notices' }
    ];

    for (const p of phase6Permissions) {
      await db.query(`
        INSERT INTO permissions (id, module, name, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
      `, [p.id, p.module, p.name, p.desc]);

      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_super_admin', $1) ON CONFLICT DO NOTHING`, [p.id]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_school_admin', $1) ON CONFLICT DO NOTHING`, [p.id]);
    }

    // Role-specific mapping
    const accountantPerms = [
      'fees.structure.view', 'fees.assign', 'fees.collect', 'fees.receipt.view', 'fees.receipt.reprint',
      'fees.concession.request', 'fees.refund.request', 'fees.ledger.view', 'fees.reports.view',
      'fees.reports.export', 'fees.expenses.manage', 'fees.reminders.manage'
    ];
    for (const pid of accountantPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_accountant', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    const principalPerms = [
      'fees.structure.view', 'fees.structure.manage', 'fees.assign', 'fees.collect', 'fees.receipt.view',
      'fees.receipt.reprint', 'fees.concession.approve', 'fees.refund.approve', 'fees.reversal.manage',
      'fees.late_fee.manage', 'fees.ledger.view', 'fees.reports.view', 'fees.reports.export',
      'fees.expenses.manage', 'fees.reminders.manage'
    ];
    for (const pid of principalPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_principal', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    const receptionistPerms = ['fees.collect', 'fees.receipt.view', 'fees.receipt.reprint', 'fees.ledger.view', 'fees.reminders.manage'];
    for (const pid of receptionistPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_receptionist', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    // 3. Seed Default Fee Categories for VVPS & GISK
    const standardCategories = [
      { code: 'TUI', name: 'Tuition Fee', desc: 'Core academic instructional fee' },
      { code: 'ADM', name: 'Admission Fee', desc: 'One-time admission processing and intake fee' },
      { code: 'ANN', name: 'Annual Development Charges', desc: 'Campus maintenance and building development' },
      { code: 'REG', name: 'Registration Fee', desc: 'Enrollment and registration administration' },
      { code: 'EXM', name: 'Examination & Assessment Fee', desc: 'CBSE term assessments, answer booklets, and evaluations' },
      { code: 'COMP', name: 'Computer & IT Lab Fee', desc: 'Computer lab infrastructure, smart classrooms, and software' },
      { code: 'LIB', name: 'Library & Learning Resource Fee', desc: 'Library subscriptions, books, and digital archives' },
      { code: 'TRN', name: 'School Transport Fee', desc: 'Bus transport and GPS route navigation services' },
      { code: 'LAB', name: 'Science Laboratories Fee', desc: 'Physics, Chemistry, and Biology apparatus and consumables' },
      { code: 'DEV', name: 'Sports & Co-curricular Fee', desc: 'Physical education, athletic meets, and house activities' },
      { code: 'MISC', name: 'Miscellaneous Charges', desc: 'Identity card, diary, and school magazine' }
    ];

    for (const schoolId of ['sch_vvps', 'sch_gisk']) {
      for (const cat of standardCategories) {
        const id = `fcat_${schoolId}_${cat.code.toLowerCase()}`;
        await db.query(`
          INSERT INTO fee_categories (id, school_id, name, code, description, is_system, status)
          VALUES ($1, $2, $3, $4, $5, true, 'active')
          ON CONFLICT (school_id, code) DO NOTHING;
        `, [id, schoolId, cat.name, cat.code, cat.desc]);
      }

      // Seed Late Fee Policy Rules
      await db.query(`
        INSERT INTO fee_late_fee_rules (id, school_id, grace_period_days, calculation_type, rate_amount, max_cap_amount, is_enabled)
        VALUES ($1, $2, 7, 'FIXED_PER_MONTH', 100.00, 1000.00, true)
        ON CONFLICT (school_id) DO NOTHING;
      `, [`lfr_${schoolId}`, schoolId]);

      // Seed Expense Categories
      const expCats = [
        { code: 'ACAD', name: 'Academic & Library Books' },
        { code: 'LAB', name: 'Laboratory Equipment & Reagents' },
        { code: 'SPORT', name: 'Sports & Athletic Gear' },
        { code: 'MAINT', name: 'Campus Maintenance & Repairs' },
        { code: 'STAT', name: 'Office Stationery & Printing' },
        { code: 'STAFF', name: 'Staff Welfare & Training' },
        { code: 'UTIL', name: 'Electricity, Water & Utilities' }
      ];
      for (const ec of expCats) {
        await db.query(`
          INSERT INTO expense_categories (id, school_id, name, code, status)
          VALUES ($1, $2, $3, $4, 'active')
          ON CONFLICT (school_id, code) DO NOTHING;
        `, [`expcat_${schoolId}_${ec.code.toLowerCase()}`, schoolId, ec.name, ec.code]);
      }
    }

    // Check if fee structures already exist
    const structCheck = await db.query('SELECT count(*) as count FROM fee_structures');
    if (parseInt((structCheck.rows[0] as { count: string }).count, 10) > 0) {
      console.log('[DB] Phase 6 Fees & Accounts schema verified and records found.');
      return;
    }

    console.log('[DB] Seeding Phase 6 Fee Structures, Plans & Transactions...');

    // 4. Seed Fee Structures for VVPS 2025-26 Session
    // A. Primary Section (Nursery to Class 5)
    await db.query(`
      INSERT INTO fee_structures (id, school_id, session_id, name, code, description, frequency, target_type, class_ids, is_locked, status)
      VALUES
      ('fstr_vvps_pri', 'sch_vvps', 'sess_vvps_2526', 'Primary Section Quarterly Plan (Classes 1 - 5)', 'VVPS-PRI-2526', 'Comprehensive quarterly fee plan for junior classes including tuition, computer lab, and examination components', 'QUARTERLY', 'CLASS', '["cls_vvps_1","cls_vvps_2","cls_vvps_3","cls_vvps_4","cls_vvps_5","cls_vvps_6","cls_vvps_7"]', true, 'active'),
      ('fstr_vvps_mid', 'sch_vvps', 'sess_vvps_2526', 'Middle Section Quarterly Plan (Classes 6 - 8)', 'VVPS-MID-2526', 'Fee structure for middle school with science lab access and sports development', 'QUARTERLY', 'CLASS', '["cls_vvps_8","cls_vvps_9","cls_vvps_10"]', false, 'active'),
      ('fstr_vvps_sec', 'sch_vvps', 'sess_vvps_2526', 'Secondary School Board Plan (Classes 9 - 10)', 'VVPS-SEC-2526', 'Curriculum fee for CBSE high school board examination preparation', 'QUARTERLY', 'CLASS', '["cls_vvps_11","cls_vvps_12"]', false, 'active'),
      ('fstr_vvps_sr_sci', 'sch_vvps', 'sess_vvps_2526', 'Senior Secondary Science Stream (Classes 11 - 12)', 'VVPS-SR-SCI-2526', 'Advanced laboratory and specialized faculty coaching plan for senior science', 'QUARTERLY', 'CLASS', '["cls_vvps_13","cls_vvps_15"]', false, 'active')
      ON CONFLICT (school_id, session_id, code) DO NOTHING;
    `);

    // Structure Items for Primary Plan
    const priItems = [
      { id: 'fsi_pri_01', cat: 'fcat_sch_vvps_tui', amt: 6000.00, mand: true },
      { id: 'fsi_pri_02', cat: 'fcat_sch_vvps_comp', amt: 1200.00, mand: true },
      { id: 'fsi_pri_03', cat: 'fcat_sch_vvps_exm', amt: 800.00, mand: true },
      { id: 'fsi_pri_04', cat: 'fcat_sch_vvps_ann', amt: 4000.00, mand: true },
      { id: 'fsi_pri_05', cat: 'fcat_sch_vvps_lib', amt: 500.00, mand: false }
    ];
    for (const item of priItems) {
      await db.query(`
        INSERT INTO fee_structure_items (id, structure_id, category_id, amount, is_mandatory, late_fee_amount, late_fee_type, grace_period_days)
        VALUES ($1, 'fstr_vvps_pri', $2, $3, $4, 100.00, 'FIXED', 7)
        ON CONFLICT (id) DO NOTHING;
      `, [item.id, item.cat, item.amt, item.mand]);
    }

    // Installments for Primary Plan (4 Quarters)
    const installments = [
      { id: 'inst_vvps_pri_q1', no: 1, name: 'Quarter 1 (April - June 2025)', due: '2025-04-10', late: '2025-04-20', pct: 25.00 },
      { id: 'inst_vvps_pri_q2', no: 2, name: 'Quarter 2 (July - September 2025)', due: '2025-07-10', late: '2025-07-20', pct: 25.00 },
      { id: 'inst_vvps_pri_q3', no: 3, name: 'Quarter 3 (October - December 2025)', due: '2025-10-10', late: '2025-10-20', pct: 25.00 },
      { id: 'inst_vvps_pri_q4', no: 4, name: 'Quarter 4 (January - March 2026)', due: '2026-01-10', late: '2026-01-20', pct: 25.00 }
    ];
    for (const inst of installments) {
      await db.query(`
        INSERT INTO fee_installments (id, structure_id, installment_number, name, due_date, late_fee_date, percentage_share)
        VALUES ($1, 'fstr_vvps_pri', $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING;
      `, [inst.id, inst.no, inst.name, inst.due, inst.late, inst.pct]);
    }

    // 5. Seed Student Fee Assignments & Charges for Class 1 Section A
    // Students: stu_vvps_001 (Aarav), stu_vvps_006 (Vihaan), stu_vvps_007 (Isha), stu_vvps_008 (Kabir), stu_vvps_009 (Meera)
    const cohort = [
      { id: 'stu_vvps_001', name: 'Aarav Kumar' },
      { id: 'stu_vvps_006', name: 'Vihaan Singhania' },
      { id: 'stu_vvps_007', name: 'Isha Patel' },
      { id: 'stu_vvps_008', name: 'Kabir Das' },
      { id: 'stu_vvps_009', name: 'Meera Sen' }
    ];

    let chargeCounter = 1;
    for (const st of cohort) {
      const assignId = `sfa_${st.id}`;
      // Total charges = 4 quarters * (6000 + 1200 + 800 + 500) + 4000 (annual once) = 38,000
      let totalCharges = 38000.00;
      let concessionAmount = 0.00;
      if (st.id === 'stu_vvps_008') {
        concessionAmount = 8000.00; // Merit scholarship concession
      }
      const netPayable = totalCharges - concessionAmount;

      await db.query(`
        INSERT INTO student_fee_assignments (
          id, school_id, session_id, student_id, class_id, section_id, structure_id,
          total_charges, total_concessions, total_late_fees, net_payable, paid_amount,
          waived_amount, refunded_amount, outstanding_balance, status, assigned_date
        ) VALUES (
          $1, 'sch_vvps', 'sess_vvps_2526', $2, 'cls_vvps_3', 'sec_cls_vvps_3_a', 'fstr_vvps_pri',
          $3, $4, 0.00, $5, 0.00, 0.00, 0.00, $5, 'PENDING', '2025-04-01'
        ) ON CONFLICT (student_id, session_id, structure_id) DO NOTHING;
      `, [assignId, st.id, totalCharges, concessionAmount, netPayable]);

      // Seed 4 quarterly installment charges
      const quarters = [
        { no: 1, name: 'Quarter 1 (April - June 2025)', due: '2025-04-10', base: 12500.00 }, // includes 4000 annual
        { no: 2, name: 'Quarter 2 (July - September 2025)', due: '2025-07-10', base: 8500.00 },
        { no: 3, name: 'Quarter 3 (October - December 2025)', due: '2025-10-10', base: 8500.00 },
        { no: 4, name: 'Quarter 4 (January - March 2026)', due: '2026-01-10', base: 8500.00 }
      ];

      for (const q of quarters) {
        const chId = `ch_${st.id}_q${q.no}`;
        let qConc = 0.00;
        if (st.id === 'stu_vvps_008') {
          qConc = 2000.00;
        }
        const netQ = q.base - qConc;

        await db.query(`
          INSERT INTO student_fee_charges (
            id, assignment_id, school_id, session_id, student_id, category_id,
            installment_name, installment_no, due_date, amount, concession_amount,
            late_fee_charged, late_fee_waived, paid_amount, outstanding_amount, status
          ) VALUES (
            $1, $2, 'sch_vvps', 'sess_vvps_2526', $3, 'fcat_sch_vvps_tui',
            $4, $5, $6, $7, $8, 0.00, 0.00, 0.00, $9, 'PENDING'
          ) ON CONFLICT (id) DO NOTHING;
        `, [chId, assignId, st.id, q.name, q.no, q.due, q.base, qConc, netQ]);
      }
    }

    // 6. Seed Concession Record for Kabir Das (stu_vvps_008)
    await db.query(`
      INSERT INTO fee_concessions (
        id, school_id, session_id, student_id, assignment_id, concession_type,
        discount_type, discount_value, calculated_amount, reason, status,
        requested_by_id, requested_by_name, approved_by_id, approved_by_name,
        approval_remarks, approved_at
      ) VALUES (
        'conc_vvps_001', 'sch_vvps', 'sess_vvps_2526', 'stu_vvps_008', 'sfa_stu_vvps_008',
        'SCHOLARSHIP', 'FIXED', 8000.00, 8000.00,
        'Special Merit Talent Scholarship awarded for securing First Rank in District Science Olympiad',
        'APPROVED', 'usr_admin_vvps', 'Amit Verma (Admin)', 'usr_principal_vvps',
        'Dr. Sunita Mishra (Principal)', 'Verified Olympiad certificate. 100% approved per school merit policy.',
        '2025-04-05 10:30:00+00'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // 7. Seed Real Recorded Payments & Official Receipts for Aarav Kumar (stu_vvps_001)
    // Payment 1: Q1 Full Payment (₹12,500) on 2025-04-08 via Bank Transfer
    const p1Payload = {
      receiptNumber: 'VVP-REC-2025-0001',
      date: '2025-04-08',
      time: '11:15 AM',
      school: { name: 'Vidya Vahini Public School', code: 'VVPS', affiliation: 'CBSE Affiliation No. 334201', address: 'Castairs Town, Deoghar, Jharkhand - 814112', phone: '+91 98350 22001', email: 'office@vvps.edu' },
      student: { name: 'Aarav Kumar', admissionNumber: 'VVP-2025-0001', rollNumber: '01', class: 'Class 1', section: 'A' },
      parent: { name: 'Vikash Kumar', mobile: '+91 98350 77110' },
      itemsPaid: [
        { category: 'Tuition Fee (Q1)', installment: 'Quarter 1 (April - June 2025)', amount: 6000.00 },
        { category: 'Annual Development Charges', installment: 'Quarter 1 (April - June 2025)', amount: 4000.00 },
        { category: 'Computer & IT Lab Fee (Q1)', installment: 'Quarter 1 (April - June 2025)', amount: 1200.00 },
        { category: 'Examination Fee (Q1)', installment: 'Quarter 1 (April - June 2025)', amount: 800.00 },
        { category: 'Library & Learning Resource', installment: 'Quarter 1 (April - June 2025)', amount: 500.00 }
      ],
      totalAmount: 12500.00,
      paymentMode: 'BANK_TRANSFER',
      transactionReference: 'NEFT/SBI/991204821',
      previousBalance: 38000.00,
      remainingBalance: 25500.00,
      collectedBy: 'Manoj Kumar Verma (Head Accountant)',
      remarks: 'Full Quarter 1 fee deposited via NEFT'
    };

    await db.query(`
      INSERT INTO fee_payments (
        id, school_id, session_id, student_id, receipt_number, payment_date, payment_time,
        amount, payment_mode, transaction_reference, verification_status, status,
        collected_by_id, collected_by_name, remarks
      ) VALUES (
        'pay_vvps_001', 'sch_vvps', 'sess_vvps_2526', 'stu_vvps_001', 'VVP-REC-2025-0001',
        '2025-04-08', '11:15', 12500.00, 'BANK_TRANSFER', 'NEFT/SBI/991204821', 'VERIFIED',
        'SUCCESS', 'usr_admin_vvps', 'Manoj Kumar Verma (Head Accountant)', 'Full Quarter 1 fee deposited via NEFT'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await db.query(`
      INSERT INTO fee_receipts (
        id, payment_id, receipt_number, school_id, student_id, total_amount, payload_json
      ) VALUES (
        'rcpt_vvps_001', 'pay_vvps_001', 'VVP-REC-2025-0001', 'sch_vvps', 'stu_vvps_001',
        12500.00, $1
      ) ON CONFLICT (payment_id) DO NOTHING;
    `, [JSON.stringify(p1Payload)]);

    await db.query(`
      INSERT INTO fee_payment_allocations (id, payment_id, charge_id, amount_allocated, category_name, installment_name)
      VALUES
      ('fpa_001', 'pay_vvps_001', 'ch_stu_vvps_001_q1', 12500.00, 'Tuition & Academic Charges', 'Quarter 1 (April - June 2025)')
      ON CONFLICT (id) DO NOTHING;
    `);

    await db.query(`UPDATE student_fee_charges SET paid_amount = 12500.00, outstanding_amount = 0.00, status = 'PAID' WHERE id = 'ch_stu_vvps_001_q1';`);

    // Payment 2: Q2 Full Payment (₹8,500) on 2025-07-06 via UPI
    const p2Payload = {
      receiptNumber: 'VVP-REC-2025-0042',
      date: '2025-07-06',
      time: '02:30 PM',
      school: { name: 'Vidya Vahini Public School', code: 'VVPS', affiliation: 'CBSE Affiliation No. 334201', address: 'Castairs Town, Deoghar, Jharkhand - 814112', phone: '+91 98350 22001', email: 'office@vvps.edu' },
      student: { name: 'Aarav Kumar', admissionNumber: 'VVP-2025-0001', rollNumber: '01', class: 'Class 1', section: 'A' },
      parent: { name: 'Vikash Kumar', mobile: '+91 98350 77110' },
      itemsPaid: [
        { category: 'Tuition Fee (Q2)', installment: 'Quarter 2 (July - September 2025)', amount: 6000.00 },
        { category: 'Computer & IT Lab Fee (Q2)', installment: 'Quarter 2 (July - September 2025)', amount: 1200.00 },
        { category: 'Examination Fee (Q2)', installment: 'Quarter 2 (July - September 2025)', amount: 800.00 },
        { category: 'Library & Learning Resource', installment: 'Quarter 2 (July - September 2025)', amount: 500.00 }
      ],
      totalAmount: 8500.00,
      paymentMode: 'UPI',
      transactionReference: 'UPI/HDFC/20250706/98124',
      previousBalance: 25500.00,
      remainingBalance: 17000.00,
      collectedBy: 'Amit Verma (Admin)',
      remarks: 'Quarter 2 fee received via UPI QR counter scan'
    };

    await db.query(`
      INSERT INTO fee_payments (
        id, school_id, session_id, student_id, receipt_number, payment_date, payment_time,
        amount, payment_mode, transaction_reference, verification_status, status,
        collected_by_id, collected_by_name, remarks
      ) VALUES (
        'pay_vvps_002', 'sch_vvps', 'sess_vvps_2526', 'stu_vvps_001', 'VVP-REC-2025-0042',
        '2025-07-06', '14:30', 8500.00, 'UPI', 'UPI/HDFC/20250706/98124', 'VERIFIED',
        'SUCCESS', 'usr_admin_vvps', 'Amit Verma (Admin)', 'Quarter 2 fee received via UPI QR counter scan'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await db.query(`
      INSERT INTO fee_receipts (
        id, payment_id, receipt_number, school_id, student_id, total_amount, payload_json
      ) VALUES (
        'rcpt_vvps_002', 'pay_vvps_002', 'VVP-REC-2025-0042', 'sch_vvps', 'stu_vvps_001',
        8500.00, $1
      ) ON CONFLICT (payment_id) DO NOTHING;
    `, [JSON.stringify(p2Payload)]);

    await db.query(`
      INSERT INTO fee_payment_allocations (id, payment_id, charge_id, amount_allocated, category_name, installment_name)
      VALUES
      ('fpa_002', 'pay_vvps_002', 'ch_stu_vvps_001_q2', 8500.00, 'Tuition & Academic Charges', 'Quarter 2 (July - September 2025)')
      ON CONFLICT (id) DO NOTHING;
    `);

    await db.query(`UPDATE student_fee_charges SET paid_amount = 8500.00, outstanding_amount = 0.00, status = 'PAID' WHERE id = 'ch_stu_vvps_001_q2';`);

    // Payment 3: Q3 Full Payment (₹8,500) on 2025-10-09 via Cash
    const p3Payload = {
      receiptNumber: 'VVP-REC-2025-0099',
      date: '2025-10-09',
      time: '10:45 AM',
      school: { name: 'Vidya Vahini Public School', code: 'VVPS', affiliation: 'CBSE Affiliation No. 334201', address: 'Castairs Town, Deoghar, Jharkhand - 814112', phone: '+91 98350 22001', email: 'office@vvps.edu' },
      student: { name: 'Aarav Kumar', admissionNumber: 'VVP-2025-0001', rollNumber: '01', class: 'Class 1', section: 'A' },
      parent: { name: 'Vikash Kumar', mobile: '+91 98350 77110' },
      itemsPaid: [
        { category: 'Tuition Fee (Q3)', installment: 'Quarter 3 (October - December 2025)', amount: 6000.00 },
        { category: 'Computer & IT Lab Fee (Q3)', installment: 'Quarter 3 (October - December 2025)', amount: 1200.00 },
        { category: 'Examination Fee (Q3)', installment: 'Quarter 3 (October - December 2025)', amount: 800.00 },
        { category: 'Library & Learning Resource', installment: 'Quarter 3 (October - December 2025)', amount: 500.00 }
      ],
      totalAmount: 8500.00,
      paymentMode: 'CASH',
      transactionReference: 'COUNTER-CASH-099',
      previousBalance: 17000.00,
      remainingBalance: 8500.00,
      collectedBy: 'Manoj Kumar Verma (Head Accountant)',
      remarks: 'Quarter 3 cash collected at main accounts window'
    };

    await db.query(`
      INSERT INTO fee_payments (
        id, school_id, session_id, student_id, receipt_number, payment_date, payment_time,
        amount, payment_mode, transaction_reference, verification_status, status,
        collected_by_id, collected_by_name, remarks
      ) VALUES (
        'pay_vvps_003', 'sch_vvps', 'sess_vvps_2526', 'stu_vvps_001', 'VVP-REC-2025-0099',
        '2025-10-09', '10:45', 8500.00, 'CASH', 'COUNTER-CASH-099', 'VERIFIED',
        'SUCCESS', 'usr_admin_vvps', 'Manoj Kumar Verma (Head Accountant)', 'Quarter 3 cash collected at main accounts window'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await db.query(`
      INSERT INTO fee_receipts (
        id, payment_id, receipt_number, school_id, student_id, total_amount, payload_json
      ) VALUES (
        'rcpt_vvps_003', 'pay_vvps_003', 'VVP-REC-2025-0099', 'sch_vvps', 'stu_vvps_001',
        8500.00, $1
      ) ON CONFLICT (payment_id) DO NOTHING;
    `, [JSON.stringify(p3Payload)]);

    await db.query(`
      INSERT INTO fee_payment_allocations (id, payment_id, charge_id, amount_allocated, category_name, installment_name)
      VALUES
      ('fpa_003', 'pay_vvps_003', 'ch_stu_vvps_001_q3', 8500.00, 'Tuition & Academic Charges', 'Quarter 3 (October - December 2025)')
      ON CONFLICT (id) DO NOTHING;
    `);

    await db.query(`UPDATE student_fee_charges SET paid_amount = 8500.00, outstanding_amount = 0.00, status = 'PAID' WHERE id = 'ch_stu_vvps_001_q3';`);

    // Payment 4: Q4 Partial Payment (₹4,000 paid out of ₹8,500) on 2026-01-08
    const p4Payload = {
      receiptNumber: 'VVP-REC-2026-0155',
      date: '2026-01-08',
      time: '11:40 AM',
      school: { name: 'Vidya Vahini Public School', code: 'VVPS', affiliation: 'CBSE Affiliation No. 334201', address: 'Castairs Town, Deoghar, Jharkhand - 814112', phone: '+91 98350 22001', email: 'office@vvps.edu' },
      student: { name: 'Aarav Kumar', admissionNumber: 'VVP-2025-0001', rollNumber: '01', class: 'Class 1', section: 'A' },
      parent: { name: 'Vikash Kumar', mobile: '+91 98350 77110' },
      itemsPaid: [
        { category: 'Tuition Fee (Q4 - Partial)', installment: 'Quarter 4 (January - March 2026)', amount: 4000.00 }
      ],
      totalAmount: 4000.00,
      paymentMode: 'UPI',
      transactionReference: 'UPI/SBI/20260108/44102',
      previousBalance: 8500.00,
      remainingBalance: 4500.00,
      collectedBy: 'Amit Verma (Admin)',
      remarks: 'Partial installment payment accepted per parent request; remaining ₹4,500 due before term end'
    };

    await db.query(`
      INSERT INTO fee_payments (
        id, school_id, session_id, student_id, receipt_number, payment_date, payment_time,
        amount, payment_mode, transaction_reference, verification_status, status,
        collected_by_id, collected_by_name, remarks
      ) VALUES (
        'pay_vvps_004', 'sch_vvps', 'sess_vvps_2526', 'stu_vvps_001', 'VVP-REC-2026-0155',
        '2026-01-08', '11:40', 4000.00, 'UPI', 'UPI/SBI/20260108/44102', 'VERIFIED',
        'SUCCESS', 'usr_admin_vvps', 'Amit Verma (Admin)', 'Partial installment payment accepted per parent request; remaining ₹4,500 due before term end'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await db.query(`
      INSERT INTO fee_receipts (
        id, payment_id, receipt_number, school_id, student_id, total_amount, payload_json
      ) VALUES (
        'rcpt_vvps_004', 'pay_vvps_004', 'VVP-REC-2026-0155', 'sch_vvps', 'stu_vvps_001',
        4000.00, $1
      ) ON CONFLICT (payment_id) DO NOTHING;
    `, [JSON.stringify(p4Payload)]);

    await db.query(`
      INSERT INTO fee_payment_allocations (id, payment_id, charge_id, amount_allocated, category_name, installment_name)
      VALUES
      ('fpa_004', 'pay_vvps_004', 'ch_stu_vvps_001_q4', 4000.00, 'Tuition & Academic Charges (Partial)', 'Quarter 4 (January - March 2026)')
      ON CONFLICT (id) DO NOTHING;
    `);

    await db.query(`UPDATE student_fee_charges SET paid_amount = 4000.00, outstanding_amount = 4500.00, status = 'PARTIALLY_PAID' WHERE id = 'ch_stu_vvps_001_q4';`);
    await db.query(`UPDATE student_fee_assignments SET paid_amount = 33500.00, outstanding_balance = 4500.00, status = 'PARTIALLY_PAID' WHERE id = 'sfa_stu_vvps_001';`);

    // Payment for Vihaan Singhania (stu_vvps_006) - Fully paid Q1 & Q2
    const p5Payload = {
      receiptNumber: 'VVP-REC-2025-0018',
      date: '2025-04-14',
      time: '09:30 AM',
      school: { name: 'Vidya Vahini Public School', code: 'VVPS', affiliation: 'CBSE Affiliation No. 334201', address: 'Castairs Town, Deoghar, Jharkhand - 814112', phone: '+91 98350 22001', email: 'office@vvps.edu' },
      student: { name: 'Vihaan Singhania', admissionNumber: 'VVP-2025-0006', rollNumber: '02', class: 'Class 1', section: 'A' },
      parent: { name: 'Sunil Singhania', mobile: '+91 98350 77112' },
      itemsPaid: [
        { category: 'Term 1 Composite Fee', installment: 'Quarter 1 (April - June 2025)', amount: 12500.00 }
      ],
      totalAmount: 12500.00,
      paymentMode: 'CHEQUE',
      transactionReference: 'CHQ-SBI-441920',
      previousBalance: 38000.00,
      remainingBalance: 25500.00,
      collectedBy: 'Manoj Kumar Verma (Head Accountant)',
      remarks: 'Account payee clearing verified'
    };

    await db.query(`
      INSERT INTO fee_payments (
        id, school_id, session_id, student_id, receipt_number, payment_date, payment_time,
        amount, payment_mode, cheque_number, cheque_date, bank_name, transaction_reference,
        verification_status, status, collected_by_id, collected_by_name, remarks
      ) VALUES (
        'pay_vvps_005', 'sch_vvps', 'sess_vvps_2526', 'stu_vvps_006', 'VVP-REC-2025-0018',
        '2025-04-14', '09:30', 12500.00, 'CHEQUE', '441920', '2025-04-12', 'State Bank of India',
        'CHQ-SBI-441920', 'VERIFIED', 'SUCCESS', 'usr_admin_vvps',
        'Manoj Kumar Verma (Head Accountant)', 'Account payee clearing verified'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await db.query(`
      INSERT INTO fee_receipts (
        id, payment_id, receipt_number, school_id, student_id, total_amount, payload_json
      ) VALUES (
        'rcpt_vvps_005', 'pay_vvps_005', 'VVP-REC-2025-0018', 'sch_vvps', 'stu_vvps_006',
        12500.00, $1
      ) ON CONFLICT (payment_id) DO NOTHING;
    `, [JSON.stringify(p5Payload)]);

    await db.query(`
      INSERT INTO fee_payment_allocations (id, payment_id, charge_id, amount_allocated, category_name, installment_name)
      VALUES
      ('fpa_005', 'pay_vvps_005', 'ch_stu_vvps_006_q1', 12500.00, 'Composite Fee (Q1)', 'Quarter 1 (April - June 2025)')
      ON CONFLICT (id) DO NOTHING;
    `);

    await db.query(`UPDATE student_fee_charges SET paid_amount = 12500.00, outstanding_amount = 0.00, status = 'PAID' WHERE id = 'ch_stu_vvps_006_q1';`);
    await db.query(`UPDATE student_fee_assignments SET paid_amount = 12500.00, outstanding_balance = 25500.00, status = 'PARTIALLY_PAID' WHERE id = 'sfa_stu_vvps_006';`);

    // 8. Seed Sample Refund Record (Approved by Principal)
    await db.query(`
      INSERT INTO fee_refunds (
        id, school_id, payment_id, student_id, amount, reason, payment_mode,
        transaction_reference, status, requested_by_id, requested_by_name,
        approved_by_id, approved_by_name, approval_remarks, approved_at
      ) VALUES (
        'ref_vvps_001', 'sch_vvps', 'pay_vvps_005', 'stu_vvps_006', 1500.00,
        'Refund of optional transport route charge due to student opting for private conveyance in Q2',
        'BANK_TRANSFER', 'REF/HDFC/2026/001', 'APPROVED',
        'usr_admin_vvps', 'Amit Verma (Admin)',
        'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)',
        'Approved per school transport refund circular 2025-26', '2026-02-14 11:00:00+00'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // 9. Seed Sample Payment Reversal Record (Audit Proof)
    await db.query(`
      INSERT INTO fee_payments (
        id, school_id, session_id, student_id, receipt_number, payment_date, payment_time,
        amount, payment_mode, transaction_reference, verification_status, status,
        collected_by_id, collected_by_name, remarks
      ) VALUES (
        'pay_vvps_rev_001', 'sch_vvps', 'sess_vvps_2526', 'stu_vvps_007', 'VVP-REC-2026-0089',
        '2026-01-15', '16:00', 2000.00, 'CASH', 'ERR-CASH-89', 'VERIFIED',
        'REVERSED', 'usr_admin_vvps', 'Amit Verma (Admin)',
        'Payment reversed due to duplicate counter posting'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await db.query(`
      INSERT INTO fee_reversals (
        id, school_id, payment_id, student_id, amount, reason, status,
        reversed_by_id, reversed_by_name
      ) VALUES (
        'rev_vvps_001', 'sch_vvps', 'pay_vvps_rev_001', 'stu_vvps_007', 2000.00,
        'Duplicate cashier key-in error, verified with physical cash drawer tally',
        'REVERSED', 'usr_admin_vvps', 'Amit Verma (Admin)'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // 10. Seed Realistic Expenses
    await db.query(`
      INSERT INTO expenses (
        id, school_id, category_id, expense_date, amount, payment_mode, payee_vendor,
        reference_no, description, approval_status, created_by_id, created_by_name,
        approved_by_id, approved_by_name
      ) VALUES
      (
        'exp_vvps_001', 'sch_vvps', 'expcat_sch_vvps_acad', '2026-02-18', 18500.00,
        'BANK_TRANSFER', 'National Book Trust India', 'PO-2026-041',
        'CBSE prescribed reference books for secondary & senior school library',
        'APPROVED', 'usr_admin_vvps', 'Amit Verma (Admin)',
        'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)'
      ),
      (
        'exp_vvps_002', 'sch_vvps', 'expcat_sch_vvps_lab', '2026-02-25', 34200.00,
        'UPI', 'BioLab Instruments Ltd', 'TXN_UPI_882910',
        'Physics & Chemistry lab optics, digital balances and test glass apparatus',
        'APPROVED', 'usr_admin_vvps', 'Amit Verma (Admin)',
        'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)'
      ),
      (
        'exp_vvps_003', 'sch_vvps', 'expcat_sch_vvps_sport', '2026-03-02', 9800.00,
        'CASH', 'Cosco Sports Emporium Deoghar', 'CASH-REC-112',
        'Football goal nets, cricket balls, and badminton shuttlecocks for Inter-House Athletic Meet',
        'APPROVED', 'usr_admin_vvps', 'Amit Verma (Admin)',
        'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)'
      ),
      (
        'exp_vvps_004', 'sch_vvps', 'expcat_sch_vvps_maint', '2026-03-05', 12400.00,
        'BANK_TRANSFER', 'Modern Electrical Works', 'NEFT-ELEC-441',
        'Replacement of classroom LED panel lights and main switchgear maintenance',
        'APPROVED', 'usr_admin_vvps', 'Amit Verma (Admin)',
        'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // 11. Seed Fee Reminders
    await db.query(`
      INSERT INTO fee_reminders (
        id, school_id, session_id, student_id, reminder_type, target_due_date, amount_due,
        parent_name, parent_mobile, parent_email, channel, message_text, status, created_by_name
      ) VALUES
      (
        'rem_vvps_001', 'sch_vvps', 'sess_vvps_2526', 'stu_vvps_001', 'OVERDUE', '2026-01-10', 4500.00,
        'Vikash Kumar', '+91 98350 77110', 'vikash.k@gmail.com', 'MANUAL_PHONE_LOG',
        'Spoke with father regarding outstanding Quarter 4 balance of ₹4,500. Parent confirmed payment before March 15.',
        'LOGGED', 'Manoj Kumar Verma (Head Accountant)'
      ),
      (
        'rem_vvps_002', 'sch_vvps', 'sess_vvps_2526', 'stu_vvps_007', 'OVERDUE', '2026-01-10', 8500.00,
        'Chirag Patel', '+91 98350 77114', 'chirag.patel@gmail.com', 'RECORDED_NOTICE',
        'Quarter 4 fee due notice generated and sent home in official school diary.',
        'LOGGED', 'Amit Verma (Admin)'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    console.log('[DB] Phase 6 Fees & Accounts seeded successfully.');
  } catch (err: any) {
    (globalThis as any).__phase6Error = err?.message || String(err);
    console.error('[DB PHASE 6 INIT ERROR]', err);
  }
}

async function ensurePhase7SchemaAndData() {
  try {
    console.log('[DB] Ensuring Phase 7 Examination & Result Management Schema...');

    await db.exec(`
      -- 1. Examination Types
      CREATE TABLE IF NOT EXISTS examination_types (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        contributes_to_final BOOLEAN DEFAULT TRUE,
        default_weightage NUMERIC(5, 2) DEFAULT 100.00,
        is_system BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_exam_type_code UNIQUE(school_id, code)
      );

      -- 2. Grading Scales
      CREATE TABLE IF NOT EXISTS grading_scales (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        is_default BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_grading_scale UNIQUE(school_id, code)
      );

      -- 3. Grading Scale Tiers
      CREATE TABLE IF NOT EXISTS grading_scale_tiers (
        id VARCHAR(50) PRIMARY KEY,
        scale_id VARCHAR(50) NOT NULL REFERENCES grading_scales(id) ON DELETE CASCADE,
        grade VARCHAR(10) NOT NULL,
        min_percentage NUMERIC(5, 2) NOT NULL,
        max_percentage NUMERIC(5, 2) NOT NULL,
        grade_point NUMERIC(4, 2) DEFAULT 0.00,
        description VARCHAR(100),
        is_passing BOOLEAN DEFAULT TRUE,
        sort_order INT NOT NULL DEFAULT 0
      );

      -- 4. Examinations
      CREATE TABLE IF NOT EXISTS examinations (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        type_id VARCHAR(50) NOT NULL REFERENCES examination_types(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        weightage NUMERIC(5, 2) DEFAULT 100.00,
        is_term_exam BOOLEAN DEFAULT FALSE,
        status VARCHAR(30) DEFAULT 'SCHEDULED',
        timetable_published BOOLEAN DEFAULT FALSE,
        results_published BOOLEAN DEFAULT FALSE,
        results_published_at TIMESTAMP WITH TIME ZONE,
        results_published_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        results_published_by_name VARCHAR(100),
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_exam_code UNIQUE(school_id, session_id, code)
      );

      -- 5. Examination Classes
      CREATE TABLE IF NOT EXISTS examination_classes (
        id VARCHAR(50) PRIMARY KEY,
        examination_id VARCHAR(50) NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        section_ids TEXT DEFAULT '[]',
        grading_scale_id VARCHAR(50) REFERENCES grading_scales(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_exam_class UNIQUE(examination_id, class_id)
      );

      -- 6. Examination Schedules (Timetable)
      CREATE TABLE IF NOT EXISTS examination_schedules (
        id VARCHAR(50) PRIMARY KEY,
        examination_id VARCHAR(50) NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        section_id VARCHAR(50) REFERENCES sections(id) ON DELETE SET NULL,
        subject_id VARCHAR(50) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        exam_date DATE NOT NULL,
        start_time VARCHAR(10) NOT NULL,
        end_time VARCHAR(10) NOT NULL,
        duration_minutes INT NOT NULL DEFAULT 180,
        exam_mode VARCHAR(30) DEFAULT 'WRITTEN',
        room_venue VARCHAR(100),
        invigilator_employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
        invigilator_name VARCHAR(100),
        max_marks_theory NUMERIC(6, 2) DEFAULT 80.00,
        pass_marks_theory NUMERIC(6, 2) DEFAULT 26.40,
        max_marks_practical NUMERIC(6, 2) DEFAULT 20.00,
        pass_marks_practical NUMERIC(6, 2) DEFAULT 6.60,
        total_max_marks NUMERIC(6, 2) NOT NULL DEFAULT 100.00,
        total_pass_marks NUMERIC(6, 2) NOT NULL DEFAULT 33.00,
        instructions TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 7. Marks Submissions
      CREATE TABLE IF NOT EXISTS marks_submissions (
        id VARCHAR(50) PRIMARY KEY,
        examination_id VARCHAR(50) NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
        schedule_id VARCHAR(50) NOT NULL REFERENCES examination_schedules(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        section_id VARCHAR(50) REFERENCES sections(id) ON DELETE SET NULL,
        subject_id VARCHAR(50) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        submitted_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        submitted_by_name VARCHAR(100),
        status VARCHAR(30) DEFAULT 'DRAFT',
        submitted_at TIMESTAMP WITH TIME ZONE,
        reviewed_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        reviewed_by_name VARCHAR(100),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        reviewer_remarks TEXT,
        total_students INT DEFAULT 0,
        entered_students INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 8. Student Marks
      CREATE TABLE IF NOT EXISTS student_marks (
        id VARCHAR(50) PRIMARY KEY,
        submission_id VARCHAR(50) REFERENCES marks_submissions(id) ON DELETE CASCADE,
        examination_id VARCHAR(50) NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
        schedule_id VARCHAR(50) NOT NULL REFERENCES examination_schedules(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        section_id VARCHAR(50) REFERENCES sections(id) ON DELETE SET NULL,
        subject_id VARCHAR(50) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        attendance_status VARCHAR(20) DEFAULT 'PRESENT',
        theory_marks NUMERIC(6, 2) DEFAULT 0.00,
        practical_marks NUMERIC(6, 2) DEFAULT 0.00,
        total_marks NUMERIC(6, 2) DEFAULT 0.00,
        max_marks NUMERIC(6, 2) NOT NULL DEFAULT 100.00,
        percentage NUMERIC(5, 2) DEFAULT 0.00,
        grade VARCHAR(10),
        grade_point NUMERIC(4, 2) DEFAULT 0.00,
        is_passed BOOLEAN DEFAULT TRUE,
        remarks TEXT,
        is_locked BOOLEAN DEFAULT FALSE,
        entered_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        entered_by_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_student_exam_subject UNIQUE(examination_id, subject_id, student_id)
      );

      -- 9. Student Exam Results
      CREATE TABLE IF NOT EXISTS student_exam_results (
        id VARCHAR(50) PRIMARY KEY,
        examination_id VARCHAR(50) NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        section_id VARCHAR(50) REFERENCES sections(id) ON DELETE SET NULL,
        total_max_marks NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
        total_marks_obtained NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
        overall_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        overall_grade VARCHAR(10),
        gpa NUMERIC(4, 2) DEFAULT 0.00,
        result_status VARCHAR(30) NOT NULL DEFAULT 'PASSED',
        failed_subjects_count INT DEFAULT 0,
        class_rank INT,
        section_rank INT,
        attendance_percentage NUMERIC(5, 2),
        class_teacher_remarks TEXT,
        principal_remarks TEXT,
        is_published BOOLEAN DEFAULT FALSE,
        published_at TIMESTAMP WITH TIME ZONE,
        calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_student_exam_result UNIQUE(examination_id, student_id)
      );

      -- 10. Examination Audit Logs
      CREATE TABLE IF NOT EXISTS examination_audit_logs (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        examination_id VARCHAR(50) REFERENCES examinations(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        target_type VARCHAR(50),
        target_id VARCHAR(50),
        previous_value TEXT,
        new_value TEXT,
        reason TEXT,
        performed_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        performed_by_name VARCHAR(100),
        performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for High Performance
      CREATE INDEX IF NOT EXISTS idx_exam_school_session ON examinations(school_id, session_id);
      CREATE INDEX IF NOT EXISTS idx_exam_sched_exam ON examination_schedules(examination_id);
      CREATE INDEX IF NOT EXISTS idx_exam_sched_class_date ON examination_schedules(class_id, exam_date);
      CREATE INDEX IF NOT EXISTS idx_student_marks_exam_sub ON student_marks(examination_id, subject_id);
      CREATE INDEX IF NOT EXISTS idx_student_marks_student ON student_marks(student_id);
      CREATE INDEX IF NOT EXISTS idx_student_exam_res_student ON student_exam_results(student_id);
      CREATE INDEX IF NOT EXISTS idx_student_exam_res_exam ON student_exam_results(examination_id, class_id);
    `);

    // 2. Register Phase 7 Permissions
    const phase7Permissions = [
      { id: 'exams.types.manage', module: 'Exams', name: 'Manage Exam Types', desc: 'Configure assessment formats and weightages' },
      { id: 'exams.schedule.manage', module: 'Exams', name: 'Manage Exam Schedules', desc: 'Schedule exams, timetable, and invigilators' },
      { id: 'exams.marks.enter', module: 'Exams', name: 'Enter Student Marks', desc: 'Input component and theory marks for students' },
      { id: 'exams.marks.review', module: 'Exams', name: 'Review & Approve Marks', desc: 'Review teacher marks submissions and approve or return' },
      { id: 'exams.results.calculate', module: 'Exams', name: 'Calculate Results', desc: 'Run server-side result calculation engine and ranks' },
      { id: 'exams.results.publish', module: 'Exams', name: 'Publish Exam Results', desc: 'Publish or withdraw student examination results' },
      { id: 'exams.reports.view', module: 'Exams', name: 'View Exam Reports', desc: 'Inspect performance analytics, merit lists, and stats' },
      { id: 'exams.report_cards.generate', module: 'Exams', name: 'Generate Report Cards', desc: 'Print and export official student report card certificates' }
    ];

    for (const p of phase7Permissions) {
      await db.query(`
        INSERT INTO permissions (id, module, name, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
      `, [p.id, p.module, p.name, p.desc]);

      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_super_admin', $1) ON CONFLICT DO NOTHING`, [p.id]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_school_admin', $1) ON CONFLICT DO NOTHING`, [p.id]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_principal', $1) ON CONFLICT DO NOTHING`, [p.id]);
    }

    const teacherPerms = ['exams.marks.enter', 'exams.schedule.manage', 'exams.reports.view', 'exams.report_cards.generate'];
    for (const pid of teacherPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_teacher', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    const reportOnlyPerms = ['exams.reports.view', 'exams.report_cards.generate'];
    for (const pid of reportOnlyPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_accountant', $1) ON CONFLICT DO NOTHING`, [pid]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_receptionist', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    // 3. Seed Default Exam Types for VVPS and GISK
    const standardExamTypes = [
      { code: 'UT-1', name: 'Unit Test 1', desc: 'First formative classroom unit assessment', weight: 10.00 },
      { code: 'PA-1', name: 'Periodic Assessment 1', desc: 'Term 1 periodic assessment per CBSE guidelines', weight: 10.00 },
      { code: 'HYE', name: 'Half-Yearly Examination', desc: 'Mid-term comprehensive summative evaluation', weight: 40.00 },
      { code: 'PA-2', name: 'Periodic Assessment 2', desc: 'Term 2 periodic assessment per CBSE guidelines', weight: 10.00 },
      { code: 'ANNUAL', name: 'Annual Board Examination', desc: 'Cumulative session promotion examination', weight: 50.00 },
      { code: 'PRAC', name: 'Practical & Project Evaluation', desc: 'Science laboratory experiments and viva voce', weight: 15.00 }
    ];

    for (const sId of ['sch_vvps', 'sch_gisk']) {
      for (const et of standardExamTypes) {
        const id = `extype_${sId}_${et.code.toLowerCase().replace('-', '_')}`;
        await db.query(`
          INSERT INTO examination_types (id, school_id, name, code, description, contributes_to_final, default_weightage, is_system, status)
          VALUES ($1, $2, $3, $4, $5, true, $6, true, 'active')
          ON CONFLICT (school_id, code) DO NOTHING;
        `, [id, sId, et.name, et.code, et.desc, et.weight]);
      }

      // Seed Grading Scale
      const scaleId = `gscale_${sId}_cbse`;
      await db.query(`
        INSERT INTO grading_scales (id, school_id, name, code, description, is_default, status)
        VALUES ($1, $2, 'CBSE 8-Point Secondary Grading Scale', 'CBSE-8PT', 'Standard Central Board 8-point grading scale from A1 to E', true, 'active')
        ON CONFLICT (school_id, code) DO NOTHING;
      `, [scaleId, sId]);

      const tiers = [
        { grade: 'A1', min: 91.00, max: 100.00, gp: 10.00, desc: 'Outstanding', pass: true, order: 1 },
        { grade: 'A2', min: 81.00, max: 90.99, gp: 9.00, desc: 'Excellent', pass: true, order: 2 },
        { grade: 'B1', min: 71.00, max: 80.99, gp: 8.00, desc: 'Very Good', pass: true, order: 3 },
        { grade: 'B2', min: 61.00, max: 70.99, gp: 7.00, desc: 'Good', pass: true, order: 4 },
        { grade: 'C1', min: 51.00, max: 60.99, gp: 6.00, desc: 'Fair', pass: true, order: 5 },
        { grade: 'C2', min: 41.00, max: 50.99, gp: 5.00, desc: 'Average', pass: true, order: 6 },
        { grade: 'D', min: 33.00, max: 40.99, gp: 4.00, desc: 'Marginal Pass', pass: true, order: 7 },
        { grade: 'E', min: 0.00, max: 32.99, gp: 0.00, desc: 'Needs Improvement / Compartment', pass: false, order: 8 }
      ];

      for (const t of tiers) {
        const tierId = `tier_${scaleId}_${t.grade.toLowerCase()}`;
        await db.query(`
          INSERT INTO grading_scale_tiers (id, scale_id, grade, min_percentage, max_percentage, grade_point, description, is_passing, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING;
        `, [tierId, scaleId, t.grade, t.min, t.max, t.gp, t.desc, t.pass, t.order]);
      }
    }

    // Check if examinations already seeded
    const examCheck = await db.query('SELECT count(*) as count FROM examinations');
    if (parseInt((examCheck.rows[0] as { count: string }).count, 10) > 0) {
      console.log('[DB] Phase 7 Examination schema verified and existing records found.');
      return;
    }

    console.log('[DB] Seeding Phase 7 Examinations, Timetables, Marks, and Results...');

    // 4. Seed Half-Yearly Examination 2025-26 for VVPS
    const examHyeId = 'exam_vvps_hye_2526';
    await db.query(`
      INSERT INTO examinations (
        id, school_id, session_id, type_id, name, code, description,
        start_date, end_date, weightage, is_term_exam, status,
        timetable_published, results_published, results_published_at, results_published_by_name
      ) VALUES (
        $1, 'sch_vvps', 'sess_vvps_2526', 'extype_sch_vvps_hye', 'Half-Yearly Examination 2025-26',
        'VVPS-HYE-2025', 'Comprehensive Mid-Term CBSE Assessments for Primary and Middle Wings',
        '2025-09-15', '2025-09-24', 40.00, true, 'PUBLISHED',
        true, true, '2025-09-30 10:00:00+00', 'Dr. Sunita Mishra (Principal)'
      ) ON CONFLICT (school_id, session_id, code) DO NOTHING;
    `, [examHyeId]);

    // Seed Upcoming Annual Exam
    await db.query(`
      INSERT INTO examinations (
        id, school_id, session_id, type_id, name, code, description,
        start_date, end_date, weightage, is_term_exam, status,
        timetable_published, results_published
      ) VALUES (
        'exam_vvps_ann_2526', 'sch_vvps', 'sess_vvps_2526', 'extype_sch_vvps_annual', 'Annual Board Examination 2025-26',
        'VVPS-ANNUAL-2026', 'Final Promotional Examination for Academic Year 2025-26',
        '2026-03-16', '2026-03-27', 50.00, true, 'SCHEDULED',
        true, false
      ) ON CONFLICT (school_id, session_id, code) DO NOTHING;
    `);

    // Assign to Class 1 (`cls_vvps_3`), Class 2, Class 3
    await db.query(`
      INSERT INTO examination_classes (id, examination_id, class_id, section_ids, grading_scale_id)
      VALUES
      ('excls_001', 'exam_vvps_hye_2526', 'cls_vvps_3', '["sec_cls_vvps_3_a"]', 'gscale_sch_vvps_cbse'),
      ('excls_002', 'exam_vvps_ann_2526', 'cls_vvps_3', '["sec_cls_vvps_3_a"]', 'gscale_sch_vvps_cbse')
      ON CONFLICT (examination_id, class_id) DO NOTHING;
    `);

    // 5. Seed Schedules / Timetable for Class 1 Section A
    const examSubjects = [
      { id: 'sched_01', sub: 'sub_vvps_eng', date: '2025-09-15', in: '09:00', out: '12:00', venue: 'Exam Hall A', inv: 'emp_vvps_001', invName: 'Anand Kumar Jha', thMax: 80, prMax: 20 },
      { id: 'sched_02', sub: 'sub_vvps_hin', date: '2025-09-17', in: '09:00', out: '12:00', venue: 'Room 101', inv: 'emp_vvps_002', invName: 'Priyanka Sharma', thMax: 80, prMax: 20 },
      { id: 'sched_03', sub: 'sub_vvps_math', date: '2025-09-19', in: '09:00', out: '12:00', venue: 'Exam Hall A', inv: 'emp_vvps_003', invName: 'Rakesh Sharma', thMax: 80, prMax: 20 },
      { id: 'sched_04', sub: 'sub_vvps_soc', date: '2025-09-22', in: '09:00', out: '12:00', venue: 'Room 102', inv: 'emp_vvps_004', invName: 'Vikram Singh', thMax: 80, prMax: 20 },
      { id: 'sched_05', sub: 'sub_vvps_cs', date: '2025-09-24', in: '09:00', out: '12:00', venue: 'IT Lab A', inv: 'emp_vvps_005', invName: 'Kavita Roy', thMax: 60, prMax: 40 }
    ];

    for (const es of examSubjects) {
      await db.query(`
        INSERT INTO examination_schedules (
          id, examination_id, school_id, class_id, section_id, subject_id,
          exam_date, start_time, end_time, duration_minutes, exam_mode, room_venue,
          invigilator_employee_id, invigilator_name, max_marks_theory, pass_marks_theory,
          max_marks_practical, pass_marks_practical, total_max_marks, total_pass_marks, instructions
        ) VALUES (
          $1, 'exam_vvps_hye_2526', 'sch_vvps', 'cls_vvps_3', 'sec_cls_vvps_3_a', $2,
          $3, $4, $5, 180, 'WRITTEN', $6,
          $7, $8, $9, $9 * 0.33,
          $10, $10 * 0.33, 100.00, 33.00, 'Calculators strictly prohibited. 15 minutes reading time provided before writing.'
        ) ON CONFLICT (id) DO NOTHING;
      `, [es.id, es.sub, es.date, es.in, es.out, es.venue, es.inv, es.invName, es.thMax, es.prMax]);

      // Seed approved marks submission for each
      await db.query(`
        INSERT INTO marks_submissions (
          id, examination_id, schedule_id, school_id, class_id, section_id, subject_id,
          submitted_by_id, submitted_by_name, status, submitted_at,
          reviewed_by_id, reviewed_by_name, reviewed_at, reviewer_remarks,
          total_students, entered_students
        ) VALUES (
          $1, 'exam_vvps_hye_2526', $2, 'sch_vvps', 'cls_vvps_3', 'sec_cls_vvps_3_a', $3,
          'usr_teacher_vvps', 'Anand Kumar Jha (Class Teacher)', 'APPROVED', '2025-09-26 14:00:00+00',
          'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)', '2025-09-28 11:30:00+00', 'Verified marks entries with physical evaluation registers. Approved for result compilation.',
          5, 5
        ) ON CONFLICT (id) DO NOTHING;
      `, [`subm_${es.id}`, es.id, es.sub]);
    }

    // 6. Seed Student Marks for 5 Students in Class 1 Section A
    // Students:
    // stu_vvps_008: Kabir Das (Rank 1 - Merit Topper)
    // stu_vvps_001: Aarav Kumar (Rank 2)
    // stu_vvps_006: Vihaan Singhania (Rank 3)
    // stu_vvps_007: Isha Patel (Rank 4)
    // stu_vvps_009: Meera Sen (Rank 5)
    const marksData = [
      // Kabir Das (stu_vvps_008) - 470/500 = 94.0%
      { studentId: 'stu_vvps_008', schedId: 'sched_01', subId: 'sub_vvps_eng', th: 74, pr: 18, tot: 92, gr: 'A1', gp: 10 },
      { studentId: 'stu_vvps_008', schedId: 'sched_02', subId: 'sub_vvps_hin', th: 72, pr: 18, tot: 90, gr: 'A2', gp: 9 },
      { studentId: 'stu_vvps_008', schedId: 'sched_03', subId: 'sub_vvps_math', th: 78, pr: 18, tot: 96, gr: 'A1', gp: 10 },
      { studentId: 'stu_vvps_008', schedId: 'sched_04', subId: 'sub_vvps_soc', th: 75, pr: 19, tot: 94, gr: 'A1', gp: 10 },
      { studentId: 'stu_vvps_008', schedId: 'sched_05', subId: 'sub_vvps_cs', th: 59, pr: 39, tot: 98, gr: 'A1', gp: 10 },

      // Aarav Kumar (stu_vvps_001) - 444/500 = 88.8%
      { studentId: 'stu_vvps_001', schedId: 'sched_01', subId: 'sub_vvps_eng', th: 70, pr: 18, tot: 88, gr: 'A2', gp: 9 },
      { studentId: 'stu_vvps_001', schedId: 'sched_02', subId: 'sub_vvps_hin', th: 68, pr: 17, tot: 85, gr: 'A2', gp: 9 },
      { studentId: 'stu_vvps_001', schedId: 'sched_03', subId: 'sub_vvps_math', th: 76, pr: 18, tot: 94, gr: 'A1', gp: 10 },
      { studentId: 'stu_vvps_001', schedId: 'sched_04', subId: 'sub_vvps_soc', th: 73, pr: 18, tot: 91, gr: 'A1', gp: 10 },
      { studentId: 'stu_vvps_001', schedId: 'sched_05', subId: 'sub_vvps_cs', th: 48, pr: 38, tot: 86, gr: 'A2', gp: 9 },

      // Vihaan Singhania (stu_vvps_006) - 400/500 = 80.0%
      { studentId: 'stu_vvps_006', schedId: 'sched_01', subId: 'sub_vvps_eng', th: 63, pr: 16, tot: 79, gr: 'B1', gp: 8 },
      { studentId: 'stu_vvps_006', schedId: 'sched_02', subId: 'sub_vvps_hin', th: 58, pr: 16, tot: 74, gr: 'B1', gp: 8 },
      { studentId: 'stu_vvps_006', schedId: 'sched_03', subId: 'sub_vvps_math', th: 66, pr: 16, tot: 82, gr: 'A2', gp: 9 },
      { studentId: 'stu_vvps_006', schedId: 'sched_04', subId: 'sub_vvps_soc', th: 64, pr: 16, tot: 80, gr: 'B1', gp: 8 },
      { studentId: 'stu_vvps_006', schedId: 'sched_05', subId: 'sub_vvps_cs', th: 49, pr: 36, tot: 85, gr: 'A2', gp: 9 },

      // Isha Patel (stu_vvps_007) - 380/500 = 76.0%
      { studentId: 'stu_vvps_007', schedId: 'sched_01', subId: 'sub_vvps_eng', th: 60, pr: 15, tot: 75, gr: 'B1', gp: 8 },
      { studentId: 'stu_vvps_007', schedId: 'sched_02', subId: 'sub_vvps_hin', th: 64, pr: 16, tot: 80, gr: 'B1', gp: 8 },
      { studentId: 'stu_vvps_007', schedId: 'sched_03', subId: 'sub_vvps_math', th: 56, pr: 15, tot: 71, gr: 'B1', gp: 8 },
      { studentId: 'stu_vvps_007', schedId: 'sched_04', subId: 'sub_vvps_soc', th: 62, pr: 16, tot: 78, gr: 'B1', gp: 8 },
      { studentId: 'stu_vvps_007', schedId: 'sched_05', subId: 'sub_vvps_cs', th: 42, pr: 34, tot: 76, gr: 'B1', gp: 8 },

      // Meera Sen (stu_vvps_009) - 332/500 = 66.4%
      { studentId: 'stu_vvps_009', schedId: 'sched_01', subId: 'sub_vvps_eng', th: 54, pr: 14, tot: 68, gr: 'B2', gp: 7 },
      { studentId: 'stu_vvps_009', schedId: 'sched_02', subId: 'sub_vvps_hin', th: 56, pr: 14, tot: 70, gr: 'B2', gp: 7 },
      { studentId: 'stu_vvps_009', schedId: 'sched_03', subId: 'sub_vvps_math', th: 51, pr: 14, tot: 65, gr: 'B2', gp: 7 },
      { studentId: 'stu_vvps_009', schedId: 'sched_04', subId: 'sub_vvps_soc', th: 48, pr: 14, tot: 62, gr: 'B2', gp: 7 },
      { studentId: 'stu_vvps_009', schedId: 'sched_05', subId: 'sub_vvps_cs', th: 37, pr: 30, tot: 67, gr: 'B2', gp: 7 }
    ];

    let markCounter = 1;
    for (const m of marksData) {
      const mid = `smk_${markCounter++}`;
      await db.query(`
        INSERT INTO student_marks (
          id, submission_id, examination_id, schedule_id, school_id, session_id,
          student_id, class_id, section_id, subject_id, attendance_status,
          theory_marks, practical_marks, total_marks, max_marks, percentage,
          grade, grade_point, is_passed, remarks, is_locked, entered_by_name
        ) VALUES (
          $1, $2, 'exam_vvps_hye_2526', $3, 'sch_vvps', 'sess_vvps_2526',
          $4, 'cls_vvps_3', 'sec_cls_vvps_3_a', $5, 'PRESENT',
          $6, $7, $8, 100.00, $8,
          $9, $10, true, 'Good conceptual answers and neat work', true, 'Anand Kumar Jha'
        ) ON CONFLICT (examination_id, subject_id, student_id) DO NOTHING;
      `, [mid, `subm_${m.schedId}`, m.schedId, m.studentId, m.subId, m.th, m.pr, m.tot, m.gr, m.gp]);
    }

    // 7. Seed Compiled Results for Class 1 Section A
    const resultsData = [
      {
        sid: 'stu_vvps_008',
        totMax: 500.00,
        totObt: 470.00,
        pct: 94.00,
        grade: 'A1',
        gpa: 9.80,
        rank: 1,
        attPct: 98.2,
        tRemarks: 'Exceptional academic brilliance, outstanding logic, and exemplary discipline.',
        pRemarks: 'First in class. Awarded Special Principal Commendation.'
      },
      {
        sid: 'stu_vvps_001',
        totMax: 500.00,
        totObt: 444.00,
        pct: 88.80,
        grade: 'A2',
        gpa: 9.40,
        rank: 2,
        attPct: 96.5,
        tRemarks: 'Outstanding analytical clarity, active in class debates, and very consistent.',
        pRemarks: 'Consistently high performer. Keep up the high standard!'
      },
      {
        sid: 'stu_vvps_006',
        totMax: 500.00,
        totObt: 400.00,
        pct: 80.00,
        grade: 'B1',
        gpa: 8.40,
        rank: 3,
        attPct: 94.0,
        tRemarks: 'Very good conceptual understanding. Encouraged to practice extra grammar exercises.',
        pRemarks: 'Promising student with great co-curricular participation.'
      },
      {
        sid: 'stu_vvps_007',
        totMax: 500.00,
        totObt: 380.00,
        pct: 76.00,
        grade: 'B1',
        gpa: 8.00,
        rank: 4,
        attPct: 92.5,
        tRemarks: 'Good performance in languages and arts; recommend focusing more on Math problem solving.',
        pRemarks: 'Steady progress observed over the term.'
      },
      {
        sid: 'stu_vvps_009',
        totMax: 500.00,
        totObt: 332.00,
        pct: 66.40,
        grade: 'B2',
        gpa: 7.00,
        rank: 5,
        attPct: 91.0,
        tRemarks: 'Sincere and hardworking; recommended to attend regular remedial math clinics.',
        pRemarks: 'Has potential to score significantly higher with structured revision.'
      }
    ];

    let resCounter = 1;
    for (const r of resultsData) {
      const rid = `sres_${resCounter++}`;
      await db.query(`
        INSERT INTO student_exam_results (
          id, examination_id, school_id, session_id, student_id, class_id, section_id,
          total_max_marks, total_marks_obtained, overall_percentage, overall_grade,
          gpa, result_status, failed_subjects_count, class_rank, section_rank,
          attendance_percentage, class_teacher_remarks, principal_remarks,
          is_published, published_at
        ) VALUES (
          $1, 'exam_vvps_hye_2526', 'sch_vvps', 'sess_vvps_2526', $2, 'cls_vvps_3', 'sec_cls_vvps_3_a',
          $3, $4, $5, $6,
          $7, 'PASSED', 0, $8, $8,
          $9, $10, $11,
          true, '2025-09-30 10:00:00+00'
        ) ON CONFLICT (examination_id, student_id) DO NOTHING;
      `, [rid, r.sid, r.totMax, r.totObt, r.pct, r.grade, r.gpa, r.rank, r.attPct, r.tRemarks, r.pRemarks]);
    }

    // 8. Seed Examination Audit Log
    await db.query(`
      INSERT INTO examination_audit_logs (
        id, school_id, examination_id, action, target_type, target_id,
        previous_value, new_value, reason, performed_by_name
      ) VALUES
      (
        'exlog_001', 'sch_vvps', 'exam_vvps_hye_2526', 'RESULTS_PUBLISHED', 'EXAMINATION', 'exam_vvps_hye_2526',
        'EVALUATION', 'PUBLISHED', 'All 5 subject marks approved and compiled. Official report cards published for parent access.',
        'Dr. Sunita Mishra (Principal)'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    console.log('[DB] Phase 7 Examination & Results seeded successfully.');
  } catch (err: any) {
    (globalThis as any).__phase7Error = err?.message || String(err);
    console.error('[DB PHASE 7 INIT ERROR]', err);
  }
}

async function ensurePhase8SchemaAndData() {
  try {
    // 1. Create Phase 8 DDL tables
    await db.exec(`
      -- 1. Classrooms / Venues
      CREATE TABLE IF NOT EXISTS classrooms (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        room_number VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        building VARCHAR(100),
        floor VARCHAR(50),
        capacity INTEGER DEFAULT 40,
        room_type VARCHAR(50) DEFAULT 'CLASSROOM',
        is_shared BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_school_room_no UNIQUE (school_id, room_number)
      );

      -- 2. Timetable Periods
      CREATE TABLE IF NOT EXISTS timetable_periods (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) REFERENCES academic_sessions(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        period_number INTEGER NOT NULL,
        start_time VARCHAR(20) NOT NULL,
        end_time VARCHAR(20) NOT NULL,
        duration_minutes INTEGER NOT NULL,
        period_type VARCHAR(50) DEFAULT 'REGULAR',
        sort_order INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_school_period_num UNIQUE (school_id, period_number)
      );

      -- 3. Timetables Header
      CREATE TABLE IF NOT EXISTS timetables (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        section_id VARCHAR(50) REFERENCES sections(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        version INTEGER DEFAULT 1,
        status VARCHAR(50) DEFAULT 'DRAFT',
        effective_from DATE,
        effective_to DATE,
        published_at TIMESTAMP WITH TIME ZONE,
        published_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        published_by_name VARCHAR(100),
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_timetable_class_sec_session UNIQUE (school_id, session_id, class_id, section_id, version)
      );

      -- 4. Timetable Entries (Class-Subject-Teacher-Room-Period-Day Slot)
      CREATE TABLE IF NOT EXISTS timetable_entries (
        id VARCHAR(50) PRIMARY KEY,
        timetable_id VARCHAR(50) NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        section_id VARCHAR(50) REFERENCES sections(id) ON DELETE CASCADE,
        day_of_week VARCHAR(20) NOT NULL,
        period_id VARCHAR(50) NOT NULL REFERENCES timetable_periods(id) ON DELETE CASCADE,
        subject_id VARCHAR(50) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        teacher_employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        room_id VARCHAR(50) REFERENCES classrooms(id) ON DELETE SET NULL,
        room_name VARCHAR(100),
        is_conflict_overridden BOOLEAN DEFAULT false,
        override_reason TEXT,
        override_by_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 5. Teacher Substitutions
      CREATE TABLE IF NOT EXISTS teacher_substitutions (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        timetable_entry_id VARCHAR(50) REFERENCES timetable_entries(id) ON DELETE SET NULL,
        substitution_date DATE NOT NULL,
        original_teacher_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        original_teacher_name VARCHAR(100),
        substitute_teacher_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        substitute_teacher_name VARCHAR(100),
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        class_name VARCHAR(100),
        section_id VARCHAR(50) REFERENCES sections(id) ON DELETE SET NULL,
        section_name VARCHAR(50),
        subject_id VARCHAR(50) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        subject_name VARCHAR(100),
        period_id VARCHAR(50) NOT NULL REFERENCES timetable_periods(id) ON DELETE CASCADE,
        period_name VARCHAR(100),
        period_time VARCHAR(50),
        reason TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        remarks TEXT,
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_by_name VARCHAR(100),
        approved_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        approved_by_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 6. Homework Management
      CREATE TABLE IF NOT EXISTS homework (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        section_id VARCHAR(50) REFERENCES sections(id) ON DELETE SET NULL,
        subject_id VARCHAR(50) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        teacher_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        teacher_name VARCHAR(100),
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        assigned_date DATE NOT NULL,
        due_date DATE NOT NULL,
        max_marks NUMERIC(6,2),
        priority VARCHAR(20) DEFAULT 'NORMAL',
        instructions TEXT,
        attachments TEXT,
        submission_required BOOLEAN DEFAULT true,
        allow_late_submission BOOLEAN DEFAULT true,
        status VARCHAR(50) DEFAULT 'PUBLISHED',
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 7. Homework Submissions
      CREATE TABLE IF NOT EXISTS homework_submissions (
        id VARCHAR(50) PRIMARY KEY,
        homework_id VARCHAR(50) NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
        student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        submission_date TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) DEFAULT 'NOT_SUBMITTED',
        is_late BOOLEAN DEFAULT false,
        text_content TEXT,
        submitted_files TEXT,
        student_remarks TEXT,
        marks_obtained NUMERIC(6,2),
        grade VARCHAR(10),
        teacher_feedback TEXT,
        evaluated_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        evaluated_by_name VARCHAR(100),
        evaluated_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_homework_student UNIQUE (homework_id, student_id)
      );

      -- 8. Learning Materials
      CREATE TABLE IF NOT EXISTS learning_materials (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
        class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        section_id VARCHAR(50) REFERENCES sections(id) ON DELETE SET NULL,
        subject_id VARCHAR(50) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        teacher_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        teacher_name VARCHAR(100),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        material_type VARCHAR(50) DEFAULT 'DOCUMENT',
        file_url TEXT,
        file_name VARCHAR(255),
        file_size VARCHAR(50),
        visibility VARCHAR(50) DEFAULT 'CLASS',
        download_count INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 9. Classroom Notices
      CREATE TABLE IF NOT EXISTS classroom_notices (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        session_id VARCHAR(50) REFERENCES academic_sessions(id) ON DELETE SET NULL,
        class_id VARCHAR(50) REFERENCES classes(id) ON DELETE SET NULL,
        section_id VARCHAR(50) REFERENCES sections(id) ON DELETE SET NULL,
        subject_id VARCHAR(50) REFERENCES subjects(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        target_audience VARCHAR(50) DEFAULT 'ALL',
        priority VARCHAR(20) DEFAULT 'NORMAL',
        publish_date DATE NOT NULL,
        expiry_date DATE,
        attachment_url TEXT,
        attachment_name VARCHAR(255),
        author_name VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'PUBLISHED',
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 10. Classroom Notifications
      CREATE TABLE IF NOT EXISTS classroom_notifications (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
        student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        link_url VARCHAR(255),
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for High Performance
      CREATE INDEX IF NOT EXISTS idx_classrooms_school ON classrooms(school_id);
      CREATE INDEX IF NOT EXISTS idx_tt_periods_school ON timetable_periods(school_id, sort_order);
      CREATE INDEX IF NOT EXISTS idx_timetables_school_class ON timetables(school_id, class_id, section_id);
      CREATE INDEX IF NOT EXISTS idx_tt_entries_tt ON timetable_entries(timetable_id);
      CREATE INDEX IF NOT EXISTS idx_tt_entries_day_period ON timetable_entries(day_of_week, period_id);
      CREATE INDEX IF NOT EXISTS idx_tt_entries_teacher ON timetable_entries(teacher_employee_id, day_of_week, period_id);
      CREATE INDEX IF NOT EXISTS idx_tt_entries_room ON timetable_entries(room_id, day_of_week, period_id);
      CREATE INDEX IF NOT EXISTS idx_substitutions_date_teacher ON teacher_substitutions(substitution_date, substitute_teacher_id);
      CREATE INDEX IF NOT EXISTS idx_homework_school_class ON homework(school_id, class_id, due_date);
      CREATE INDEX IF NOT EXISTS idx_hw_subs_homework ON homework_submissions(homework_id);
      CREATE INDEX IF NOT EXISTS idx_hw_subs_student ON homework_submissions(student_id);
      CREATE INDEX IF NOT EXISTS idx_materials_class_sub ON learning_materials(class_id, subject_id);
      CREATE INDEX IF NOT EXISTS idx_notices_school_target ON classroom_notices(school_id, target_audience, publish_date);
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON classroom_notifications(user_id, is_read);
    `);

    // 2. Register Phase 8 Permissions
    const phase8Permissions = [
      { id: 'timetable.view', module: 'Classroom', name: 'View Timetables', desc: 'View class, teacher, room, and school schedules' },
      { id: 'timetable.manage', module: 'Classroom', name: 'Manage Timetables', desc: 'Create and configure periods, slots, and schedules' },
      { id: 'timetable.publish', module: 'Classroom', name: 'Publish Timetables', desc: 'Approve and publish institutional timetables' },
      { id: 'timetable.substitution.manage', module: 'Classroom', name: 'Manage Substitutions', desc: 'Assign and approve teacher substitutions' },
      { id: 'homework.view', module: 'Classroom', name: 'View Homework', desc: 'View assigned class tasks and student work' },
      { id: 'homework.create', module: 'Classroom', name: 'Create Homework', desc: 'Author, assign, and publish class homework' },
      { id: 'homework.submit', module: 'Classroom', name: 'Submit Homework', desc: 'Upload student submissions and solutions' },
      { id: 'homework.evaluate', module: 'Classroom', name: 'Evaluate Homework', desc: 'Grade assignments, award marks, and provide comments' },
      { id: 'materials.view', module: 'Classroom', name: 'View Study Materials', desc: 'Access classroom resources, notes, and worksheets' },
      { id: 'materials.upload', module: 'Classroom', name: 'Upload Study Materials', desc: 'Upload and distribute educational learning resources' },
      { id: 'notices.view', module: 'Classroom', name: 'View Classroom Notices', desc: 'Read notices, updates, and classroom broadcasts' },
      { id: 'notices.publish', module: 'Classroom', name: 'Publish Classroom Notices', desc: 'Broadcast notices to classes and target audiences' },
      { id: 'classroom.reports.view', module: 'Classroom', name: 'View Classroom Reports', desc: 'Inspect teacher workload, completion rates, and analytics' }
    ];

    for (const p of phase8Permissions) {
      await db.query(`
        INSERT INTO permissions (id, module, name, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
      `, [p.id, p.module, p.name, p.desc]);

      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_super_admin', $1) ON CONFLICT DO NOTHING`, [p.id]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_school_admin', $1) ON CONFLICT DO NOTHING`, [p.id]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_principal', $1) ON CONFLICT DO NOTHING`, [p.id]);
    }

    const teacherPerms = [
      'timetable.view', 'timetable.manage', 'timetable.substitution.manage',
      'homework.view', 'homework.create', 'homework.evaluate',
      'materials.view', 'materials.upload',
      'notices.view', 'notices.publish',
      'classroom.reports.view'
    ];
    for (const pid of teacherPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_teacher', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    const staffPerms = ['timetable.view', 'materials.view', 'notices.view', 'classroom.reports.view'];
    for (const pid of staffPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_accountant', $1) ON CONFLICT DO NOTHING`, [pid]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_receptionist', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    // 3. Check if Phase 8 already seeded
    const roomCheck = await db.query('SELECT count(*) as count FROM classrooms');
    if (parseInt((roomCheck.rows[0] as { count: string }).count, 10) > 0) {
      console.log('[DB] Phase 8 Timetable & Classroom records already exist.');
      return;
    }

    console.log('[DB] Seeding Phase 8 Timetables, Periods, Rooms, Homework, and Materials...');

    // 4. Seed Rooms for VVPS
    const rooms = [
      { id: 'rm_vvps_101', no: '101', name: 'Primary Classroom 1-A', bld: 'Main Wing', flr: '1st Floor', cap: 40, type: 'CLASSROOM' },
      { id: 'rm_vvps_102', no: '102', name: 'Primary Classroom 2-A', bld: 'Main Wing', flr: '1st Floor', cap: 40, type: 'CLASSROOM' },
      { id: 'rm_vvps_103', no: '103', name: 'Junior Section 3-A', bld: 'Main Wing', flr: '1st Floor', cap: 40, type: 'CLASSROOM' },
      { id: 'rm_vvps_scilab', no: 'LAB-SCI', name: 'Discovery Science & Physics Lab', bld: 'Science Block', flr: 'Ground Floor', cap: 35, type: 'LAB' },
      { id: 'rm_vvps_cslab', no: 'LAB-CS', name: 'Ada Lovelace Computer Lab A', bld: 'IT Wing', flr: '2nd Floor', cap: 35, type: 'LAB' },
      { id: 'rm_vvps_mathlab', no: 'MATH-STUDIO', name: 'Ramanujan Math Activity Lab', bld: 'Main Wing', flr: '1st Floor', cap: 30, type: 'ACTIVITY' },
      { id: 'rm_vvps_lib', no: 'LIB-CENTRAL', name: 'Rabindranath Tagore Central Library', bld: 'Academic Block', flr: '2nd Floor', cap: 60, type: 'LIBRARY' }
    ];

    for (const r of rooms) {
      await db.query(`
        INSERT INTO classrooms (id, school_id, room_number, name, building, floor, capacity, room_type, is_shared, status)
        VALUES ($1, 'sch_vvps', $2, $3, $4, $5, $6, $7, false, 'active')
        ON CONFLICT (school_id, room_number) DO NOTHING;
      `, [r.id, r.no, r.name, r.bld, r.flr, r.cap, r.type]);
    }

    // 5. Seed Timetable Periods for VVPS
    const periods = [
      { id: 'per_vvps_1', name: 'Period 1', num: 1, start: '08:00 AM', end: '08:45 AM', dur: 45, type: 'REGULAR', order: 1 },
      { id: 'per_vvps_2', name: 'Period 2', num: 2, start: '08:45 AM', end: '09:30 AM', dur: 45, type: 'REGULAR', order: 2 },
      { id: 'per_vvps_break1', name: 'Morning Assembly & Refreshment', num: 3, start: '09:30 AM', end: '09:50 AM', dur: 20, type: 'ASSEMBLY', order: 3 },
      { id: 'per_vvps_3', name: 'Period 3', num: 4, start: '09:50 AM', end: '10:35 AM', dur: 45, type: 'REGULAR', order: 4 },
      { id: 'per_vvps_4', name: 'Period 4', num: 5, start: '10:35 AM', end: '11:20 AM', dur: 45, type: 'REGULAR', order: 5 },
      { id: 'per_vvps_lunch', name: 'Midday Lunch Break', num: 6, start: '11:20 AM', end: '12:00 PM', dur: 40, type: 'LUNCH', order: 6 },
      { id: 'per_vvps_5', name: 'Period 5', num: 7, start: '12:00 PM', end: '12:45 PM', dur: 45, type: 'REGULAR', order: 7 },
      { id: 'per_vvps_6', name: 'Period 6', num: 8, start: '12:45 PM', end: '01:30 PM', dur: 45, type: 'REGULAR', order: 8 },
      { id: 'per_vvps_act', name: 'Co-Curricular & Sports', num: 9, start: '01:30 PM', end: '02:15 PM', dur: 45, type: 'ACTIVITY', order: 9 }
    ];

    for (const p of periods) {
      await db.query(`
        INSERT INTO timetable_periods (id, school_id, session_id, name, period_number, start_time, end_time, duration_minutes, period_type, sort_order, status)
        VALUES ($1, 'sch_vvps', 'sess_vvps_2526', $2, $3, $4, $5, $6, $7, $8, 'active')
        ON CONFLICT (school_id, period_number) DO NOTHING;
      `, [p.id, p.name, p.num, p.start, p.end, p.dur, p.type, p.order]);
    }

    // 6. Seed Timetable for Class 1 Section A
    const ttId = 'tt_vvps_cls1_a';
    await db.query(`
      INSERT INTO timetables (
        id, school_id, session_id, class_id, section_id, name, version,
        status, effective_from, effective_to, published_at, published_by_name, created_by_id
      ) VALUES (
        $1, 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_3', 'sec_cls_vvps_3_a',
        'Class 1-A Academic Timetable (2025-26)', 1,
        'PUBLISHED', '2025-04-01', '2026-03-31', '2025-04-01 09:00:00+00',
        'Dr. Sunita Mishra (Principal)', 'usr_principal_vvps'
      ) ON CONFLICT (school_id, session_id, class_id, section_id, version) DO NOTHING;
    `, [ttId]);

    // 7. Seed Weekly Entries (Monday to Saturday)
    // Teachers available:
    // emp_vvps_001: Anand Kumar Jha (English / Class Teacher)
    // emp_vvps_002: Priyanka Sharma (Hindi)
    // emp_vvps_003: Rakesh Sharma (Mathematics)
    // emp_vvps_004: Vikram Singh (Social Science)
    // emp_vvps_005: Kavita Roy (Computer Science)
    // emp_vvps_006: Suresh Nambiar (Science)

    const weeklySchedule = [
      // Monday
      { day: 'Monday', pid: 'per_vvps_1', sub: 'sub_vvps_eng', tchr: 'emp_vvps_001', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Monday', pid: 'per_vvps_2', sub: 'sub_vvps_math', tchr: 'emp_vvps_003', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Monday', pid: 'per_vvps_3', sub: 'sub_vvps_hin', tchr: 'emp_vvps_002', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Monday', pid: 'per_vvps_4', sub: 'sub_vvps_phy', tchr: 'emp_vvps_006', room: 'rm_vvps_scilab', rname: 'Discovery Science Lab' },
      { day: 'Monday', pid: 'per_vvps_5', sub: 'sub_vvps_soc', tchr: 'emp_vvps_004', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Monday', pid: 'per_vvps_6', sub: 'sub_vvps_cs', tchr: 'emp_vvps_005', room: 'rm_vvps_cslab', rname: 'Ada Lovelace Computer Lab' },
      { day: 'Monday', pid: 'per_vvps_act', sub: 'sub_vvps_phe', tchr: 'emp_vvps_001', room: 'rm_vvps_101', rname: 'Playground & Sports' },

      // Tuesday
      { day: 'Tuesday', pid: 'per_vvps_1', sub: 'sub_vvps_math', tchr: 'emp_vvps_003', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Tuesday', pid: 'per_vvps_2', sub: 'sub_vvps_eng', tchr: 'emp_vvps_001', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Tuesday', pid: 'per_vvps_3', sub: 'sub_vvps_phy', tchr: 'emp_vvps_006', room: 'rm_vvps_scilab', rname: 'Discovery Science Lab' },
      { day: 'Tuesday', pid: 'per_vvps_4', sub: 'sub_vvps_hin', tchr: 'emp_vvps_002', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Tuesday', pid: 'per_vvps_5', sub: 'sub_vvps_cs', tchr: 'emp_vvps_005', room: 'rm_vvps_cslab', rname: 'Ada Lovelace Computer Lab' },
      { day: 'Tuesday', pid: 'per_vvps_6', sub: 'sub_vvps_soc', tchr: 'emp_vvps_004', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Tuesday', pid: 'per_vvps_act', sub: 'sub_vvps_math', tchr: 'emp_vvps_003', room: 'rm_vvps_mathlab', rname: 'Ramanujan Math Activity Lab' },

      // Wednesday
      { day: 'Wednesday', pid: 'per_vvps_1', sub: 'sub_vvps_eng', tchr: 'emp_vvps_001', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Wednesday', pid: 'per_vvps_2', sub: 'sub_vvps_math', tchr: 'emp_vvps_003', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Wednesday', pid: 'per_vvps_3', sub: 'sub_vvps_soc', tchr: 'emp_vvps_004', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Wednesday', pid: 'per_vvps_4', sub: 'sub_vvps_hin', tchr: 'emp_vvps_002', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Wednesday', pid: 'per_vvps_5', sub: 'sub_vvps_phy', tchr: 'emp_vvps_006', room: 'rm_vvps_scilab', rname: 'Discovery Science Lab' },
      { day: 'Wednesday', pid: 'per_vvps_6', sub: 'sub_vvps_cs', tchr: 'emp_vvps_005', room: 'rm_vvps_cslab', rname: 'Ada Lovelace Computer Lab' },
      { day: 'Wednesday', pid: 'per_vvps_act', sub: 'sub_vvps_eng', tchr: 'emp_vvps_001', room: 'rm_vvps_lib', rname: 'Central Library Reading' },

      // Thursday
      { day: 'Thursday', pid: 'per_vvps_1', sub: 'sub_vvps_math', tchr: 'emp_vvps_003', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Thursday', pid: 'per_vvps_2', sub: 'sub_vvps_hin', tchr: 'emp_vvps_002', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Thursday', pid: 'per_vvps_3', sub: 'sub_vvps_eng', tchr: 'emp_vvps_001', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Thursday', pid: 'per_vvps_4', sub: 'sub_vvps_soc', tchr: 'emp_vvps_004', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Thursday', pid: 'per_vvps_5', sub: 'sub_vvps_phy', tchr: 'emp_vvps_006', room: 'rm_vvps_scilab', rname: 'Discovery Science Lab' },
      { day: 'Thursday', pid: 'per_vvps_6', sub: 'sub_vvps_cs', tchr: 'emp_vvps_005', room: 'rm_vvps_cslab', rname: 'Ada Lovelace Computer Lab' },
      { day: 'Thursday', pid: 'per_vvps_act', sub: 'sub_vvps_phe', tchr: 'emp_vvps_001', room: 'rm_vvps_101', rname: 'Playground & Sports' },

      // Friday
      { day: 'Friday', pid: 'per_vvps_1', sub: 'sub_vvps_eng', tchr: 'emp_vvps_001', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Friday', pid: 'per_vvps_2', sub: 'sub_vvps_math', tchr: 'emp_vvps_003', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Friday', pid: 'per_vvps_3', sub: 'sub_vvps_hin', tchr: 'emp_vvps_002', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Friday', pid: 'per_vvps_4', sub: 'sub_vvps_phy', tchr: 'emp_vvps_006', room: 'rm_vvps_scilab', rname: 'Discovery Science Lab' },
      { day: 'Friday', pid: 'per_vvps_5', sub: 'sub_vvps_cs', tchr: 'emp_vvps_005', room: 'rm_vvps_cslab', rname: 'Ada Lovelace Computer Lab' },
      { day: 'Friday', pid: 'per_vvps_6', sub: 'sub_vvps_soc', tchr: 'emp_vvps_004', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Friday', pid: 'per_vvps_act', sub: 'sub_vvps_soc', tchr: 'emp_vvps_004', room: 'rm_vvps_lib', rname: 'Heritage Project Work' },

      // Saturday (Half-day)
      { day: 'Saturday', pid: 'per_vvps_1', sub: 'sub_vvps_math', tchr: 'emp_vvps_003', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Saturday', pid: 'per_vvps_2', sub: 'sub_vvps_eng', tchr: 'emp_vvps_001', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Saturday', pid: 'per_vvps_3', sub: 'sub_vvps_hin', tchr: 'emp_vvps_002', room: 'rm_vvps_101', rname: 'Room 101' },
      { day: 'Saturday', pid: 'per_vvps_4', sub: 'sub_vvps_cs', tchr: 'emp_vvps_005', room: 'rm_vvps_cslab', rname: 'Ada Lovelace Computer Lab' }
    ];

    let entryIndex = 1;
    for (const slot of weeklySchedule) {
      const eid = `tte_${entryIndex++}`;
      await db.query(`
        INSERT INTO timetable_entries (
          id, timetable_id, school_id, session_id, class_id, section_id,
          day_of_week, period_id, subject_id, teacher_employee_id, room_id, room_name
        ) VALUES (
          $1, $2, 'sch_vvps', 'sess_vvps_2526', 'cls_vvps_3', 'sec_cls_vvps_3_a',
          $3, $4, $5, $6, $7, $8
        ) ON CONFLICT (id) DO NOTHING;
      `, [eid, ttId, slot.day, slot.pid, slot.sub, slot.tchr, slot.room, slot.rname]);
    }

    // 8. Seed Active Teacher Substitution
    await db.query(`
      INSERT INTO teacher_substitutions (
        id, school_id, timetable_entry_id, substitution_date,
        original_teacher_id, original_teacher_name,
        substitute_teacher_id, substitute_teacher_name,
        class_id, class_name, section_id, section_name,
        subject_id, subject_name, period_id, period_name, period_time,
        reason, status, remarks, created_by_name, approved_by_name
      ) VALUES (
        'subst_001', 'sch_vvps', 'tte_2', '2026-10-14',
        'emp_vvps_003', 'Rakesh Sharma (PGT Math)',
        'emp_vvps_006', 'Suresh Nambiar (PGT Physics)',
        'cls_vvps_3', 'Class 1', 'sec_cls_vvps_3_a', 'A',
        'sub_vvps_math', 'Mathematics', 'per_vvps_2', 'Period 2', '08:45 AM - 09:30 AM',
        'Attending State Board Curriculum Orientation Seminar at Ranchi',
        'APPROVED', 'Approved by Vice Principal. Supervised arithmetic worksheet distribution.',
        'Anand Kumar Jha (Class Teacher)', 'Dr. Sunita Mishra (Principal)'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // 9. Seed Homework Assignments
    const sampleHomework = [
      {
        id: 'hw_vvps_001',
        classId: 'cls_vvps_3',
        secId: 'sec_cls_vvps_3_a',
        subId: 'sub_vvps_math',
        teacherId: 'emp_vvps_003',
        teacherName: 'Rakesh Sharma',
        title: 'Linear Equations & Word Problem Worksheet',
        desc: 'Solve Questions 1 through 15 from Chapter 4 Exercise 4.2. Show all arithmetic calculations step-by-step. Focus on perimeter and age-related problem formulations.',
        assigned: '2026-10-10',
        due: '2026-10-15',
        marks: 20.00,
        prio: 'HIGH',
        instruct: 'Submit handwritten notebook photos or typed answers. Rough work must be visible on the right margin.',
        attachments: JSON.stringify([{ name: 'Chapter4_Linear_Equations_WS.pdf', size: '1.4 MB', type: 'application/pdf', url: '#' }]),
        status: 'PUBLISHED'
      },
      {
        id: 'hw_vvps_002',
        classId: 'cls_vvps_3',
        secId: 'sec_cls_vvps_3_a',
        subId: 'sub_vvps_eng',
        teacherId: 'emp_vvps_001',
        teacherName: 'Anand Kumar Jha',
        title: 'Essay: The Role of Renewable Energy in Climate Action',
        desc: 'Compose a structured 250-word expository essay discussing solar and wind power adoption in developing nations. Include an introduction, 3 supporting arguments, and a clear conclusion.',
        assigned: '2026-10-11',
        due: '2026-10-16',
        marks: 15.00,
        prio: 'NORMAL',
        instruct: 'Ensure proper grammatical tense consistency and paragraph transitions. Plagiarism is strictly monitored.',
        attachments: JSON.stringify([{ name: 'Essay_Rubric_and_Guidelines.pdf', size: '540 KB', type: 'application/pdf', url: '#' }]),
        status: 'PUBLISHED'
      },
      {
        id: 'hw_vvps_003',
        classId: 'cls_vvps_3',
        secId: 'sec_cls_vvps_3_a',
        subId: 'sub_vvps_cs',
        teacherId: 'emp_vvps_005',
        teacherName: 'Kavita Roy',
        title: 'Python Scripting: Loops, Lists & String Manipulation',
        desc: 'Implement two Python scripts: 1) Palindrome checker for user strings. 2) Fibonacci sequence generator up to N terms with exception handling for negative inputs.',
        assigned: '2026-10-12',
        due: '2026-10-17',
        marks: 25.00,
        prio: 'NORMAL',
        instruct: 'Upload either .py files or clean screenshots of code execution from IDLE/VSCode showing successful terminal output.',
        attachments: JSON.stringify([{ name: 'Python_Lab_Starter_Template.py', size: '12 KB', type: 'text/x-python', url: '#' }]),
        status: 'PUBLISHED'
      }
    ];

    for (const h of sampleHomework) {
      await db.query(`
        INSERT INTO homework (
          id, school_id, session_id, class_id, section_id, subject_id, teacher_id, teacher_name,
          title, description, assigned_date, due_date, max_marks, priority, instructions,
          attachments, submission_required, allow_late_submission, status, created_by_id
        ) VALUES (
          $1, 'sch_vvps', 'sess_vvps_2526', $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13,
          $14, true, true, $15, 'usr_teacher_vvps'
        ) ON CONFLICT (id) DO NOTHING;
      `, [h.id, h.classId, h.secId, h.subId, h.teacherId, h.teacherName, h.title, h.desc, h.assigned, h.due, h.marks, h.prio, h.instruct, h.attachments, h.status]);
    }

    // 10. Seed Student Submissions for Math Homework (hw_vvps_001)
    const submissions = [
      {
        id: 'subm_hw1_01',
        hwId: 'hw_vvps_001',
        sid: 'stu_vvps_008', // Kabir Das (Merit Student)
        date: '2026-10-12 18:30:00+00',
        status: 'EVALUATED',
        isLate: false,
        text: 'Completed all 15 word problems in notebook with algebraic verification. Linear equations graphed on sheet 2.',
        files: JSON.stringify([{ name: 'KabirDas_LinearEquations_Solutions.pdf', size: '2.1 MB' }]),
        marks: 19.50,
        grade: 'A1',
        feedback: 'Exemplary clarity in variable definitions and algebraic balancing. Outstanding presentation!',
        evalBy: 'Rakesh Sharma',
        evalAt: '2026-10-13 10:15:00+00'
      },
      {
        id: 'subm_hw1_02',
        hwId: 'hw_vvps_001',
        sid: 'stu_vvps_001', // Aarav Kumar
        date: '2026-10-13 09:00:00+00',
        status: 'UNDER_REVIEW',
        isLate: false,
        text: 'Solved questions 1-15. Checked answers using substitution method. Ready for teacher inspection.',
        files: JSON.stringify([{ name: 'Aarav_Math_HW_Ch4.pdf', size: '1.8 MB' }]),
        marks: null,
        grade: null,
        feedback: null,
        evalBy: null,
        evalAt: null
      },
      {
        id: 'subm_hw1_03',
        hwId: 'hw_vvps_001',
        sid: 'stu_vvps_006', // Vihaan Singhania
        date: '2026-10-12 21:00:00+00',
        status: 'EVALUATED',
        isLate: false,
        text: 'All exercises solved. Added brief notes explaining step 4 on problem 11.',
        files: JSON.stringify([{ name: 'Vihaan_HW4_Scan.pdf', size: '1.6 MB' }]),
        marks: 17.00,
        grade: 'A2',
        feedback: 'Good methodology overall. Please review sign conventions in question 9.',
        evalBy: 'Rakesh Sharma',
        evalAt: '2026-10-13 11:00:00+00'
      },
      {
        id: 'subm_hw1_04',
        hwId: 'hw_vvps_001',
        sid: 'stu_vvps_007', // Isha Patel
        date: '2026-10-13 11:30:00+00',
        status: 'SUBMITTED',
        isLate: false,
        text: 'Workbook questions solved with pencil work. Scanned PDF attached.',
        files: JSON.stringify([{ name: 'IshaPatel_MathExercise4.pdf', size: '1.9 MB' }]),
        marks: null,
        grade: null,
        feedback: null,
        evalBy: null,
        evalAt: null
      }
    ];

    for (const sm of submissions) {
      await db.query(`
        INSERT INTO homework_submissions (
          id, homework_id, student_id, school_id, submission_date, status, is_late,
          text_content, submitted_files, marks_obtained, grade, teacher_feedback,
          evaluated_by_name, evaluated_at
        ) VALUES (
          $1, $2, $3, 'sch_vvps', $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13
        ) ON CONFLICT (homework_id, student_id) DO NOTHING;
      `, [sm.id, sm.hwId, sm.sid, sm.date, sm.status, sm.isLate, sm.text, sm.files, sm.marks, sm.grade, sm.feedback, sm.evalBy, sm.evalAt]);
    }

    // 11. Seed Learning Materials / Study Resources
    const materials = [
      {
        id: 'mat_001',
        classId: 'cls_vvps_3',
        subId: 'sub_vvps_math',
        tchrId: 'emp_vvps_003',
        tchrName: 'Rakesh Sharma',
        title: 'CBSE Mathematics Formula Sheet & Rapid Revision Mindmap',
        desc: 'Comprehensive reference notes covering Algebraic identities, linear equations, geometry theorems, and perimeter formulas.',
        type: 'PDF',
        url: '#',
        fname: 'Math_Formula_Mindmap_Class1.pdf',
        size: '3.4 MB',
        vis: 'CLASS',
        dl: 42
      },
      {
        id: 'mat_002',
        classId: 'cls_vvps_3',
        subId: 'sub_vvps_eng',
        tchrId: 'emp_vvps_001',
        tchrName: 'Anand Kumar Jha',
        title: 'Grammar Guide: Active & Passive Voice Transformation Handbook',
        desc: 'Illustrated examples and rule tables for tense transformations, modal auxiliaries, and common syntactic pitfalls.',
        type: 'DOCUMENT',
        url: '#',
        fname: 'English_Voice_Handbook_2025.docx',
        size: '1.1 MB',
        vis: 'CLASS',
        dl: 38
      },
      {
        id: 'mat_003',
        classId: 'cls_vvps_3',
        subId: 'sub_vvps_cs',
        tchrId: 'emp_vvps_005',
        tchrName: 'Kavita Roy',
        title: 'Introduction to Algorithms, Flowcharts & Computational Thinking',
        desc: 'Lecture slides from Term 1 modules detailing pseudocode conventions, standard flowchart symbols, and sorting algorithms.',
        type: 'PRESENTATION',
        url: '#',
        fname: 'CS_Algorithms_Flowcharts_Unit1.pptx',
        size: '5.2 MB',
        vis: 'CLASS',
        dl: 29
      },
      {
        id: 'mat_004',
        classId: 'cls_vvps_3',
        subId: 'sub_vvps_phy',
        tchrId: 'emp_vvps_006',
        tchrName: 'Suresh Nambiar',
        title: 'Science Discovery Lab Manual: Experiments 1 to 6',
        desc: 'Laboratory protocols, safety measures, apparatus guidelines, and observation tables for physics and optics experiments.',
        type: 'WORKSHEET',
        url: '#',
        fname: 'Science_Lab_Manual_Term1.pdf',
        size: '2.8 MB',
        vis: 'CLASS',
        dl: 34
      }
    ];

    for (const m of materials) {
      await db.query(`
        INSERT INTO learning_materials (
          id, school_id, session_id, class_id, subject_id, teacher_id, teacher_name,
          title, description, material_type, file_url, file_name, file_size, visibility,
          download_count, status, created_by_id
        ) VALUES (
          $1, 'sch_vvps', 'sess_vvps_2526', $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11, $12,
          $13, 'ACTIVE', 'usr_teacher_vvps'
        ) ON CONFLICT (id) DO NOTHING;
      `, [m.id, m.classId, m.subId, m.tchrId, m.tchrName, m.title, m.desc, m.type, m.url, m.fname, m.size, m.vis, m.dl]);
    }

    // 12. Seed Classroom Notices & School-wide Announcements
    const notices = [
      {
        id: 'ntc_001',
        classId: 'cls_vvps_3',
        secId: 'sec_cls_vvps_3_a',
        subId: 'sub_vvps_math',
        title: 'Weekly Mathematics Doubt Clearing & Remedial Clinic',
        content: 'Extra assistance clinic will be held this Thursday during Period 7 in Room 101. Students desiring additional practice on word problems are encouraged to attend with doubts.',
        aud: 'CLASS',
        prio: 'NORMAL',
        pdate: '2026-10-12',
        author: 'Rakesh Sharma (Math Faculty)'
      },
      {
        id: 'ntc_002',
        classId: null,
        secId: null,
        subId: null,
        title: 'Annual Inter-House Science & Robotics Exhibition 2026',
        content: 'All students from Grades 1 to 12 are invited to register working exhibits and robotics prototypes before October 25th. Regional CBSE judges will evaluate submissions in the Auditorium.',
        aud: 'ALL',
        prio: 'HIGH',
        pdate: '2026-10-10',
        author: 'Dr. Sunita Mishra (Principal)'
      },
      {
        id: 'ntc_003',
        classId: 'cls_vvps_3',
        secId: null,
        subId: null,
        title: 'Parent-Teacher Conference & Term 1 Academic Review Notice',
        content: 'Parent-Teacher interaction is scheduled for Saturday, 24th October from 9:00 AM to 1:00 PM. Individual appointment slots have been dispatched to registered guardian emails.',
        aud: 'PARENTS',
        prio: 'HIGH',
        pdate: '2026-10-11',
        author: 'Anand Kumar Jha (Senior Coordinator)'
      }
    ];

    for (const n of notices) {
      await db.query(`
        INSERT INTO classroom_notices (
          id, school_id, session_id, class_id, section_id, subject_id,
          title, content, target_audience, priority, publish_date, author_name, status, created_by_id
        ) VALUES (
          $1, 'sch_vvps', 'sess_vvps_2526', $2, $3, $4,
          $5, $6, $7, $8, $9, $10, 'PUBLISHED', 'usr_principal_vvps'
        ) ON CONFLICT (id) DO NOTHING;
      `, [n.id, n.classId, n.secId, n.subId, n.title, n.content, n.aud, n.prio, n.pdate, n.author]);
    }

    // 13. Seed In-app Notifications
    const notifications = [
      {
        id: 'cnotif_001',
        userId: 'usr_teacher_vvps',
        evt: 'SUBSTITUTION_ASSIGNED',
        title: 'Substitution Assigned: Math Period 2',
        msg: 'You have been assigned to cover Class 1-A Period 2 on 14th Oct in place of Mr. Rakesh Sharma.',
        link: '/classroom'
      },
      {
        id: 'cnotif_002',
        userId: 'usr_teacher_vvps',
        evt: 'HOMEWORK_SUBMISSION',
        title: 'New Homework Submissions Received',
        msg: 'Aarav Kumar and Isha Patel submitted solutions for "Linear Equations & Word Problem Worksheet".',
        link: '/classroom'
      },
      {
        id: 'cnotif_003',
        userId: 'usr_super_admin',
        evt: 'TIMETABLE_PUBLISHED',
        title: 'Timetable Published: Class 1-A',
        msg: 'Official Academic Timetable 2025-26 for Class 1-A was published by Dr. Sunita Mishra.',
        link: '/classroom'
      }
    ];

    for (const notif of notifications) {
      await db.query(`
        INSERT INTO classroom_notifications (id, school_id, user_id, event_type, title, message, link_url, is_read)
        VALUES ($1, 'sch_vvps', $2, $3, $4, $5, $6, false)
        ON CONFLICT (id) DO NOTHING;
      `, [notif.id, notif.userId, notif.evt, notif.title, notif.msg, notif.link]);
    }

    console.log('[DB] Phase 8 Timetable, Homework & Classroom Management seeded successfully.');
  } catch (err: any) {
    (globalThis as any).__phase8Error = err?.message || String(err);
    console.error('[DB PHASE 8 INIT ERROR]', err);
  }
}

async function ensurePhase10SchemaAndData() {
  try {
    console.log('[DB] Checking Phase 10 Library Management schema...');

    // 1. Create Core Library Tables
    await db.exec(`
      -- 1. Libraries (Branches / Campus Facilities)
      CREATE TABLE IF NOT EXISTS libraries (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        location VARCHAR(200),
        contact_email VARCHAR(100),
        contact_phone VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, code)
      );

      -- 2. Library Settings (School-Specific Policies)
      CREATE TABLE IF NOT EXISTS library_settings (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        max_books_student INT DEFAULT 3,
        max_books_teacher INT DEFAULT 5,
        max_books_staff INT DEFAULT 3,
        borrowing_period_student_days INT DEFAULT 14,
        borrowing_period_teacher_days INT DEFAULT 30,
        borrowing_period_staff_days INT DEFAULT 21,
        renewal_limit INT DEFAULT 2,
        fine_per_day NUMERIC(10, 2) DEFAULT 5.00,
        max_fine_per_book NUMERIC(10, 2) DEFAULT 500.00,
        grace_period_days INT DEFAULT 1,
        reservation_validity_days INT DEFAULT 3,
        lost_book_fine_rule VARCHAR(50) DEFAULT 'PRICE_PLUS_FEE',
        lost_book_processing_fee NUMERIC(10, 2) DEFAULT 50.00,
        damaged_book_default_penalty NUMERIC(10, 2) DEFAULT 100.00,
        library_card_prefix VARCHAR(20) DEFAULT 'LIB',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id)
      );

      -- 3. Book Categories
      CREATE TABLE IF NOT EXISTS library_categories (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        parent_category_id VARCHAR(50) REFERENCES library_categories(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, name)
      );

      -- 4. Authors
      CREATE TABLE IF NOT EXISTS library_authors (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        biography TEXT,
        nationality VARCHAR(100),
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 5. Publishers
      CREATE TABLE IF NOT EXISTS library_publishers (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        address TEXT,
        contact_person VARCHAR(100),
        email VARCHAR(100),
        website VARCHAR(200),
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 6. Shelf / Rack / Room Locations
      CREATE TABLE IF NOT EXISTS library_locations (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        library_id VARCHAR(50) NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        parent_location_id VARCHAR(50) REFERENCES library_locations(id) ON DELETE SET NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 7. Books (Bibliographic Catalog Records)
      CREATE TABLE IF NOT EXISTS library_books (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        library_id VARCHAR(50) NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255),
        isbn VARCHAR(50),
        isbn13 VARCHAR(50),
        author_id VARCHAR(50) REFERENCES library_authors(id) ON DELETE SET NULL,
        author_name VARCHAR(200),
        publisher_id VARCHAR(50) REFERENCES library_publishers(id) ON DELETE SET NULL,
        category_id VARCHAR(50) REFERENCES library_categories(id) ON DELETE SET NULL,
        language VARCHAR(50) DEFAULT 'English',
        edition VARCHAR(50),
        publication_year INT,
        description TEXT,
        subject VARCHAR(100),
        pages INT,
        cover_image TEXT,
        price NUMERIC(10, 2) DEFAULT 0.00,
        supplier VARCHAR(150),
        acquisition_date DATE,
        reference_only BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 8. Book Copies (Physical Inventory Copies)
      CREATE TABLE IF NOT EXISTS library_book_copies (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        library_id VARCHAR(50) NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
        book_id VARCHAR(50) NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
        accession_number VARCHAR(100) NOT NULL,
        barcode VARCHAR(100) NOT NULL,
        qr_code VARCHAR(100),
        copy_number INT NOT NULL DEFAULT 1,
        purchase_date DATE,
        purchase_price NUMERIC(10, 2) DEFAULT 0.00,
        condition VARCHAR(50) DEFAULT 'GOOD',
        location_id VARCHAR(50) REFERENCES library_locations(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'AVAILABLE',
        current_holder_id VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, accession_number),
        UNIQUE(school_id, barcode)
      );

      -- 9. Library Memberships
      CREATE TABLE IF NOT EXISTS library_memberships (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        library_id VARCHAR(50) NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
        member_type VARCHAR(20) NOT NULL,
        student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
        membership_number VARCHAR(100) NOT NULL,
        card_number VARCHAR(100) NOT NULL,
        issue_date DATE NOT NULL,
        expiry_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        borrowing_limit INT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, membership_number)
      );

      -- 10. Book Issues & Circulation
      CREATE TABLE IF NOT EXISTS library_issues (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        library_id VARCHAR(50) NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
        member_id VARCHAR(50) NOT NULL REFERENCES library_memberships(id) ON DELETE RESTRICT,
        book_copy_id VARCHAR(50) NOT NULL REFERENCES library_book_copies(id) ON DELETE RESTRICT,
        book_id VARCHAR(50) NOT NULL REFERENCES library_books(id) ON DELETE RESTRICT,
        issue_date DATE NOT NULL,
        due_date DATE NOT NULL,
        returned_date DATE,
        issued_by VARCHAR(50) NOT NULL,
        returned_by VARCHAR(50),
        status VARCHAR(20) DEFAULT 'ISSUED',
        return_condition VARCHAR(50),
        renewal_count INT DEFAULT 0,
        last_renewed_at TIMESTAMP WITH TIME ZONE,
        fine_amount NUMERIC(10, 2) DEFAULT 0.00,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 11. Book Renewals
      CREATE TABLE IF NOT EXISTS library_renewals (
        id VARCHAR(50) PRIMARY KEY,
        issue_id VARCHAR(50) NOT NULL REFERENCES library_issues(id) ON DELETE CASCADE,
        previous_due_date DATE NOT NULL,
        new_due_date DATE NOT NULL,
        renewal_number INT NOT NULL,
        renewed_by VARCHAR(50) NOT NULL,
        reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 12. Book Reservations / Holds
      CREATE TABLE IF NOT EXISTS library_reservations (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        library_id VARCHAR(50) NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
        book_id VARCHAR(50) NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
        member_id VARCHAR(50) NOT NULL REFERENCES library_memberships(id) ON DELETE CASCADE,
        reservation_date DATE NOT NULL,
        expiry_date DATE NOT NULL,
        queue_position INT DEFAULT 1,
        status VARCHAR(20) DEFAULT 'WAITING',
        fulfilled_copy_id VARCHAR(50) REFERENCES library_book_copies(id) ON DELETE SET NULL,
        notified_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 13. Library Fines (Integrated with Accounts)
      CREATE TABLE IF NOT EXISTS library_fines (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        library_id VARCHAR(50) NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
        member_id VARCHAR(50) NOT NULL REFERENCES library_memberships(id) ON DELETE CASCADE,
        issue_id VARCHAR(50) REFERENCES library_issues(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        waived_amount NUMERIC(10, 2) DEFAULT 0.00,
        paid_amount NUMERIC(10, 2) DEFAULT 0.00,
        outstanding_amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        reason TEXT,
        fee_charge_id VARCHAR(50) REFERENCES student_fee_charges(id) ON DELETE SET NULL,
        fee_payment_id VARCHAR(50) REFERENCES fee_payments(id) ON DELETE SET NULL,
        waived_by VARCHAR(50),
        waived_at TIMESTAMP WITH TIME ZONE,
        waiver_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 14. Book Damage Records
      CREATE TABLE IF NOT EXISTS library_damage_records (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        book_copy_id VARCHAR(50) NOT NULL REFERENCES library_book_copies(id) ON DELETE CASCADE,
        member_id VARCHAR(50) REFERENCES library_memberships(id) ON DELETE SET NULL,
        issue_id VARCHAR(50) REFERENCES library_issues(id) ON DELETE SET NULL,
        damage_type VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        repairable BOOLEAN DEFAULT true,
        estimated_cost NUMERIC(10, 2) DEFAULT 0.00,
        penalty_amount NUMERIC(10, 2) DEFAULT 0.00,
        status VARCHAR(30) DEFAULT 'DAMAGED',
        reported_by VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 15. Physical Stock Verification / Audits
      CREATE TABLE IF NOT EXISTS library_inventory_verifications (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        library_id VARCHAR(50) NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        verification_date DATE NOT NULL,
        verified_by VARCHAR(50) NOT NULL,
        verified_by_name VARCHAR(100),
        total_scanned INT DEFAULT 0,
        total_verified INT DEFAULT 0,
        total_missing INT DEFAULT 0,
        total_discrepancies INT DEFAULT 0,
        status VARCHAR(30) DEFAULT 'IN_PROGRESS',
        notes TEXT,
        audit_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 16. In-app Library Notifications
      CREATE TABLE IF NOT EXISTS library_notifications (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        link_url VARCHAR(255),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Performance Indexes
      CREATE INDEX IF NOT EXISTS idx_lib_books_school ON library_books(school_id);
      CREATE INDEX IF NOT EXISTS idx_lib_books_isbn ON library_books(isbn);
      CREATE INDEX IF NOT EXISTS idx_lib_books_cat ON library_books(category_id);
      CREATE INDEX IF NOT EXISTS idx_lib_copies_acc ON library_book_copies(school_id, accession_number);
      CREATE INDEX IF NOT EXISTS idx_lib_copies_bc ON library_book_copies(school_id, barcode);
      CREATE INDEX IF NOT EXISTS idx_lib_copies_bk ON library_book_copies(book_id);
      CREATE INDEX IF NOT EXISTS idx_lib_copies_st ON library_book_copies(status);
      CREATE INDEX IF NOT EXISTS idx_lib_members_stu ON library_memberships(student_id);
      CREATE INDEX IF NOT EXISTS idx_lib_members_emp ON library_memberships(employee_id);
      CREATE INDEX IF NOT EXISTS idx_lib_members_st ON library_memberships(status);
      CREATE INDEX IF NOT EXISTS idx_lib_issues_mem ON library_issues(member_id);
      CREATE INDEX IF NOT EXISTS idx_lib_issues_copy ON library_issues(book_copy_id);
      CREATE INDEX IF NOT EXISTS idx_lib_issues_st ON library_issues(status);
      CREATE INDEX IF NOT EXISTS idx_lib_issues_due ON library_issues(due_date);
      CREATE INDEX IF NOT EXISTS idx_lib_fines_mem ON library_fines(member_id);
      CREATE INDEX IF NOT EXISTS idx_lib_fines_st ON library_fines(status);
      CREATE INDEX IF NOT EXISTS idx_lib_resv_bk ON library_reservations(book_id);
    `);

    // 2. Ensure Fee Category for Library Dues & Penalties (Phase 6 Integration)
    await db.query(`
      INSERT INTO fee_categories (id, school_id, name, code, description, is_system, status)
      VALUES ('cat_vvps_library', 'sch_vvps', 'Library Fines & Replacement Dues', 'LIB_DUE', 'Overdue circulation fines, lost book replacement costs, and damage penalties', true, 'active')
      ON CONFLICT (school_id, code) DO NOTHING;
    `);

    // 3. Register Phase 10 Library Permissions
    const libraryPermissions = [
      { id: 'library.view', module: 'LIBRARY', name: 'View Library', desc: 'View library catalog, books, and dashboard' },
      { id: 'library.manage', module: 'LIBRARY', name: 'Manage Catalog', desc: 'Create, update, and manage books, copies, categories, authors, and publishers' },
      { id: 'library.settings.manage', module: 'LIBRARY', name: 'Manage Settings', desc: 'Configure school borrowing limits, loan periods, and fine rules' },
      { id: 'library.members.view', module: 'LIBRARY', name: 'View Members', desc: 'View student and staff library memberships' },
      { id: 'library.members.manage', module: 'LIBRARY', name: 'Manage Members', desc: 'Issue library cards and configure member privileges' },
      { id: 'library.issue', module: 'LIBRARY', name: 'Issue Books', desc: 'Issue physical book copies to authorized members' },
      { id: 'library.return', module: 'LIBRARY', name: 'Return Books', desc: 'Check in returned books and calculate fines' },
      { id: 'library.renew', module: 'LIBRARY', name: 'Renew Books', desc: 'Renew book borrowing durations according to policy' },
      { id: 'library.reserve', module: 'LIBRARY', name: 'Reserve Books', desc: 'Place holds on currently checked-out book titles' },
      { id: 'library.overdue.manage', module: 'LIBRARY', name: 'Manage Overdues', desc: 'Track overdue books and dispatch reminder alerts' },
      { id: 'library.fines.view', module: 'LIBRARY', name: 'View Fines', desc: 'View library fine ledgers and penal summaries' },
      { id: 'library.fines.manage', module: 'LIBRARY', name: 'Collect Fines', desc: 'Process and record fine payments in coordination with Accounts' },
      { id: 'library.fines.waive', module: 'LIBRARY', name: 'Waive Fines', desc: 'Authorize and document partial or full fine waivers' },
      { id: 'library.lost.manage', module: 'LIBRARY', name: 'Manage Lost Books', desc: 'Mark book copies as lost and compute replacement fees' },
      { id: 'library.damage.manage', module: 'LIBRARY', name: 'Manage Damaged Books', desc: 'Document condition damage and assess repair fees' },
      { id: 'library.inventory.verify', module: 'LIBRARY', name: 'Stock Verification', desc: 'Conduct physical inventory audits and barcode stocktaking' },
      { id: 'library.reports.view', module: 'LIBRARY', name: 'View Library Reports', desc: 'Access comprehensive circulation and inventory reports' }
    ];

    for (const p of libraryPermissions) {
      await db.query(`
        INSERT INTO permissions (id, module, name, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
      `, [p.id, p.module, p.name, p.desc]);

      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_super_admin', $1) ON CONFLICT DO NOTHING`, [p.id]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_school_admin', $1) ON CONFLICT DO NOTHING`, [p.id]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_principal', $1) ON CONFLICT DO NOTHING`, [p.id]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_librarian', $1) ON CONFLICT DO NOTHING`, [p.id]);
    }

    // Role-specific subset permissions
    const teacherPerms = ['library.view', 'library.reserve'];
    for (const pid of teacherPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_teacher', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    const accountantPerms = ['library.view', 'library.fines.view', 'library.fines.manage', 'library.reports.view'];
    for (const pid of accountantPerms) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_accountant', $1) ON CONFLICT DO NOTHING`, [pid]);
    }

    // 4. Check if Phase 10 seed data already present
    const libCheck = await db.query('SELECT count(*) as count FROM libraries');
    if (parseInt((libCheck.rows[0] as { count: string }).count, 10) > 0) {
      console.log('[DB] Phase 10 Library Management data already initialized.');
      return;
    }

    console.log('[DB] Seeding Phase 10 Library Management records for VVPS...');

    // 5. Seed Library Facility
    await db.query(`
      INSERT INTO libraries (id, school_id, name, code, description, location, contact_email, contact_phone, is_active)
      VALUES (
        'lib_vvps_central',
        'sch_vvps',
        'Rabindranath Tagore Central Learning Media Center',
        'CENTRAL',
        'Comprehensive multi-tier library housing academic courseware, reference journals, fiction, and digital resources.',
        'Academic Block, 2nd Floor, Room 204',
        'library@vidyavahini.edu',
        '+91 11 2345 6789',
        true
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // 6. Seed Library Settings
    await db.query(`
      INSERT INTO library_settings (
        id, school_id, max_books_student, max_books_teacher, max_books_staff,
        borrowing_period_student_days, borrowing_period_teacher_days, borrowing_period_staff_days,
        renewal_limit, fine_per_day, max_fine_per_book, grace_period_days, reservation_validity_days,
        lost_book_fine_rule, lost_book_processing_fee, damaged_book_default_penalty, library_card_prefix
      ) VALUES (
        'set_vvps_lib', 'sch_vvps', 3, 5, 3,
        14, 30, 21,
        2, 5.00, 500.00, 1, 3,
        'PRICE_PLUS_FEE', 50.00, 100.00, 'VVPS-LIB'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // 7. Seed Book Categories
    const categories = [
      { id: 'cat_lib_sci', name: 'Science & Discovery', code: 'SCI', desc: 'Physics, chemistry, biology, astronomy, and environmental studies' },
      { id: 'cat_lib_math', name: 'Mathematics & Logic', code: 'MATH', desc: 'Arithmetic, algebra, geometry, calculus, and mathematical puzzles' },
      { id: 'cat_lib_lit', name: 'Literature & Fiction', code: 'LIT', desc: 'Classic novels, prose, poetry, anthologies, and award-winning fiction' },
      { id: 'cat_lib_cs', name: 'Computer Science & AI', code: 'CS', desc: 'Coding, algorithms, Python, artificial intelligence, and robotics' },
      { id: 'cat_lib_hist', name: 'History & Civics', code: 'HIST', desc: 'Indian independence movement, world history, and political science' },
      { id: 'cat_lib_ref', name: 'Reference & Encyclopedia', code: 'REF', desc: 'Britannica, yearbooks, dictionaries, and subject compendiums' }
    ];

    for (const c of categories) {
      await db.query(`
        INSERT INTO library_categories (id, school_id, name, code, description, is_active)
        VALUES ($1, 'sch_vvps', $2, $3, $4, true)
        ON CONFLICT (id) DO NOTHING;
      `, [c.id, c.name, c.code, c.desc]);
    }

    // 8. Seed Authors
    const authors = [
      { id: 'auth_kalam', name: 'Dr. A.P.J. Abdul Kalam', bio: 'Former President of India, scientist, and inspirational author', nat: 'Indian' },
      { id: 'auth_hcverma', name: 'Dr. H.C. Verma', bio: 'Renowned physicist, former IIT Kanpur professor, and textbook author', nat: 'Indian' },
      { id: 'auth_narayan', name: 'R.K. Narayan', bio: 'Pioneering Indian English novelist known for Malgudi stories', nat: 'Indian' },
      { id: 'auth_hawking', name: 'Prof. Stephen Hawking', bio: 'Theoretical physicist, cosmologist, and Lucasian Professor of Mathematics', nat: 'British' },
      { id: 'auth_murty', name: 'Sudha Murty', bio: 'Philanthropist, prolific author, and Chairperson of Infosys Foundation', nat: 'Indian' },
      { id: 'auth_premchand', name: 'Munshi Premchand', bio: 'Celebrated maestro of modern Hindi-Urdu literature and social realism', nat: 'Indian' }
    ];

    for (const a of authors) {
      await db.query(`
        INSERT INTO library_authors (id, school_id, name, biography, nationality, is_active)
        VALUES ($1, 'sch_vvps', $2, $3, $4, true)
        ON CONFLICT (id) DO NOTHING;
      `, [a.id, a.name, a.bio, a.nat]);
    }

    // 9. Seed Publishers
    const publishers = [
      { id: 'pub_ncert', name: 'NCERT Publications', addr: 'Sri Aurobindo Marg, New Delhi', email: 'sales@ncert.nic.in', web: 'https://ncert.nic.in' },
      { id: 'pub_oxford', name: 'Oxford University Press India', addr: 'YMCA Library Building, Jai Singh Road, New Delhi', email: 'custserv@oup.com', web: 'https://india.oup.com' },
      { id: 'pub_pearson', name: 'Pearson Education India', addr: 'DLF Infinity Towers, Gurugram, Haryana', email: 'info@pearson.com', web: 'https://pearson.in' },
      { id: 'pub_penguin', name: 'Penguin Random House India', addr: 'Infinity Tower C, DLF Cyber City, Gurugram', email: 'support@penguin.in', web: 'https://penguin.co.in' },
      { id: 'pub_universities', name: 'Universities Press', addr: 'Himayatnagar, Hyderabad, Telangana', email: 'info@universitiespress.com', web: 'https://universitiespress.com' }
    ];

    for (const pb of publishers) {
      await db.query(`
        INSERT INTO library_publishers (id, school_id, name, address, email, website, is_active)
        VALUES ($1, 'sch_vvps', $2, $3, $4, $5, true)
        ON CONFLICT (id) DO NOTHING;
      `, [pb.id, pb.name, pb.addr, pb.email, pb.web]);
    }

    // 10. Seed Shelving Locations
    const locations = [
      { id: 'loc_lib_sci', name: 'Science Wing - Rack A', code: 'RACK-SCI-A', desc: 'Physics and general science shelves 1 through 4' },
      { id: 'loc_lib_math', name: 'Mathematics - Rack B', code: 'RACK-MATH-B', desc: 'Arithmetic, algebra, and CBSE reference racks' },
      { id: 'loc_lib_lit', name: 'Literature Bay - Rack C', code: 'RACK-LIT-C', desc: 'English and Hindi fiction and biographical collections' },
      { id: 'loc_lib_cs', name: 'Tech Stack - Rack D', code: 'RACK-CS-D', desc: 'Computer science, informatics practices, and coding manuals' },
      { id: 'loc_lib_ref', name: 'Reference Rotunda - Cabinet 1', code: 'CAB-REF-1', desc: 'In-library reference volumes and annual encyclopedias' }
    ];

    for (const l of locations) {
      await db.query(`
        INSERT INTO library_locations (id, school_id, library_id, name, code, description, is_active)
        VALUES ($1, 'sch_vvps', 'lib_vvps_central', $2, $3, $4, true)
        ON CONFLICT (id) DO NOTHING;
      `, [l.id, l.name, l.code, l.desc]);
    }

    // 11. Seed Bibliographic Books
    const books = [
      {
        id: 'bk_wings_fire',
        title: 'Wings of Fire: An Autobiography',
        subtitle: 'The Inspiring Story of an Indian Scientist and Missile Pioneer',
        isbn: '8173711461',
        isbn13: '9788173711466',
        authId: 'auth_kalam',
        authName: 'Dr. A.P.J. Abdul Kalam',
        pubId: 'pub_universities',
        catId: 'cat_lib_lit',
        lang: 'English',
        ed: '1st Illustrated Edition',
        yr: 1999,
        desc: 'Autobiography recounting Kalam childhood in Rameswaram, his career at ISRO and DRDO, and development of SLV-3 and Agni.',
        subj: 'Biography & Aerospace',
        pages: 180,
        price: 295.00,
        refOnly: false
      },
      {
        id: 'bk_concepts_phy',
        title: 'Concepts of Physics - Volume 1',
        subtitle: 'Foundations of Mechanics, Waves, and Optics for Secondary Scholars',
        isbn: '8177091875',
        isbn13: '9788177091878',
        authId: 'auth_hcverma',
        authName: 'Dr. H.C. Verma',
        pubId: 'pub_ncert',
        catId: 'cat_lib_sci',
        lang: 'English',
        ed: 'Revised Edition 2024',
        yr: 2024,
        desc: 'Gold-standard Indian secondary textbook developing core conceptual intuition for vectors, Newton laws, work energy, and gravitation.',
        subj: 'Physics',
        pages: 462,
        price: 490.00,
        refOnly: false
      },
      {
        id: 'bk_malgudi_days',
        title: 'Malgudi Days',
        subtitle: 'Classic Tales from the Enchanting Town of Malgudi',
        isbn: '0143039656',
        isbn13: '9780143039655',
        authId: 'auth_narayan',
        authName: 'R.K. Narayan',
        pubId: 'pub_penguin',
        catId: 'cat_lib_lit',
        lang: 'English',
        ed: 'Penguin Classics Edition',
        yr: 1982,
        desc: 'A collection of 32 heartwarming and humorous short stories portraying everyday joys, ironies, and nuances of Indian life.',
        subj: 'Fiction',
        pages: 268,
        price: 250.00,
        refOnly: false
      },
      {
        id: 'bk_brief_history',
        title: 'A Brief History of Time',
        subtitle: 'From the Big Bang to Black Holes',
        isbn: '0553380168',
        isbn13: '9780553380163',
        authId: 'auth_hawking',
        authName: 'Prof. Stephen Hawking',
        pubId: 'pub_oxford',
        catId: 'cat_lib_sci',
        lang: 'English',
        ed: '10th Anniversary Expanded',
        yr: 1998,
        desc: 'Landmark popular-science exposition unraveling spacetime, general relativity, quantum mechanics, the arrow of time, and wormholes.',
        subj: 'Cosmology',
        pages: 220,
        price: 450.00,
        refOnly: false
      },
      {
        id: 'bk_python_cs',
        title: 'Python for CBSE Computer Science',
        subtitle: 'Hands-on Programming, Computational Thinking & Data Structures',
        isbn: '9389552145',
        isbn13: '9789389552140',
        authId: 'auth_hcverma',
        authName: 'Kavita Roy & Anand Jha',
        pubId: 'pub_pearson',
        catId: 'cat_lib_cs',
        lang: 'English',
        ed: '3rd CBSE Curriculum Edition',
        yr: 2025,
        desc: 'Comprehensive syllabus companion covering control flow, functions, file handling, relational SQL interfaces, and algorithmic efficiency.',
        subj: 'Computer Science',
        pages: 380,
        price: 420.00,
        refOnly: false
      },
      {
        id: 'bk_wise_otherwise',
        title: 'Wise and Otherwise: A Salute to Life',
        subtitle: 'Fifty Vignettes of Human Empathy, Courage and Wisdom',
        isbn: '0143062224',
        isbn13: '9780143062226',
        authId: 'auth_murty',
        authName: 'Sudha Murty',
        pubId: 'pub_penguin',
        catId: 'cat_lib_lit',
        lang: 'English',
        ed: 'Special Illustrated Edition',
        yr: 2006,
        desc: 'Real-life encounters gathered by Murty during extensive travels across rural India, offering timeless reflections on grace and human character.',
        subj: 'Memoir',
        pages: 232,
        price: 275.00,
        refOnly: false
      },
      {
        id: 'bk_encyclopedia_brit',
        title: 'Illustrated Encyclopedia of Modern Science',
        subtitle: 'Reference Compendium of Technological Inventions and Space Exploration',
        isbn: '0199572834',
        isbn13: '9780199572830',
        authId: 'auth_hawking',
        authName: 'Oxford Editorial Board',
        pubId: 'pub_oxford',
        catId: 'cat_lib_ref',
        lang: 'English',
        ed: 'Deluxe Library Hardback',
        yr: 2023,
        desc: 'Full-color comprehensive reference volume detailing astronomy, particle physics, biological taxonomies, and climate science.',
        subj: 'Reference',
        pages: 720,
        price: 1850.00,
        refOnly: true
      }
    ];

    for (const b of books) {
      await db.query(`
        INSERT INTO library_books (
          id, school_id, library_id, title, subtitle, isbn, isbn13,
          author_id, author_name, publisher_id, category_id, language,
          edition, publication_year, description, subject, pages, price,
          acquisition_date, reference_only, is_active
        ) VALUES (
          $1, 'sch_vvps', 'lib_vvps_central', $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16,
          '2026-06-01', $17, true
        ) ON CONFLICT (id) DO NOTHING;
      `, [b.id, b.title, b.subtitle, b.isbn, b.isbn13, b.authId, b.authName, b.pubId, b.catId, b.lang, b.ed, b.yr, b.desc, b.subj, b.pages, b.price, b.refOnly]);
    }

    // 12. Seed Physical Book Copies
    const copies = [
      // Wings of Fire: 3 Copies
      { id: 'cp_00101', bkId: 'bk_wings_fire', acc: 'VVPS-ACC-00101', bc: 'BC-VVPS-00101', cnum: 1, loc: 'loc_lib_lit', st: 'ISSUED', cond: 'GOOD', price: 295.00 },
      { id: 'cp_00102', bkId: 'bk_wings_fire', acc: 'VVPS-ACC-00102', bc: 'BC-VVPS-00102', cnum: 2, loc: 'loc_lib_lit', st: 'AVAILABLE', cond: 'GOOD', price: 295.00 },
      { id: 'cp_00103', bkId: 'bk_wings_fire', acc: 'VVPS-ACC-00103', bc: 'BC-VVPS-00103', cnum: 3, loc: 'loc_lib_lit', st: 'AVAILABLE', cond: 'FAIR', price: 295.00 },

      // Concepts of Physics: 2 Copies
      { id: 'cp_00201', bkId: 'bk_concepts_phy', acc: 'VVPS-ACC-00201', bc: 'BC-VVPS-00201', cnum: 1, loc: 'loc_lib_sci', st: 'ISSUED', cond: 'GOOD', price: 490.00 },
      { id: 'cp_00202', bkId: 'bk_concepts_phy', acc: 'VVPS-ACC-00202', bc: 'BC-VVPS-00202', cnum: 2, loc: 'loc_lib_sci', st: 'AVAILABLE', cond: 'GOOD', price: 490.00 },

      // Malgudi Days: 2 Copies
      { id: 'cp_00301', bkId: 'bk_malgudi_days', acc: 'VVPS-ACC-00301', bc: 'BC-VVPS-00301', cnum: 1, loc: 'loc_lib_lit', st: 'AVAILABLE', cond: 'GOOD', price: 250.00 },
      { id: 'cp_00302', bkId: 'bk_malgudi_days', acc: 'VVPS-ACC-00302', bc: 'BC-VVPS-00302', cnum: 2, loc: 'loc_lib_lit', st: 'AVAILABLE', cond: 'GOOD', price: 250.00 },

      // A Brief History of Time: 2 Copies
      { id: 'cp_00401', bkId: 'bk_brief_history', acc: 'VVPS-ACC-00401', bc: 'BC-VVPS-00401', cnum: 1, loc: 'loc_lib_sci', st: 'AVAILABLE', cond: 'GOOD', price: 450.00 },
      { id: 'cp_00402', bkId: 'bk_brief_history', acc: 'VVPS-ACC-00402', bc: 'BC-VVPS-00402', cnum: 2, loc: 'loc_lib_sci', st: 'AVAILABLE', cond: 'GOOD', price: 450.00 },

      // Python for CS: 2 Copies (one currently OVERDUE)
      { id: 'cp_00501', bkId: 'bk_python_cs', acc: 'VVPS-ACC-00501', bc: 'BC-VVPS-00501', cnum: 1, loc: 'loc_lib_cs', st: 'OVERDUE', cond: 'GOOD', price: 420.00 },
      { id: 'cp_00502', bkId: 'bk_python_cs', acc: 'VVPS-ACC-00502', bc: 'BC-VVPS-00502', cnum: 2, loc: 'loc_lib_cs', st: 'AVAILABLE', cond: 'GOOD', price: 420.00 },

      // Wise & Otherwise: 2 Copies
      { id: 'cp_00601', bkId: 'bk_wise_otherwise', acc: 'VVPS-ACC-00601', bc: 'BC-VVPS-00601', cnum: 1, loc: 'loc_lib_lit', st: 'AVAILABLE', cond: 'GOOD', price: 275.00 },
      { id: 'cp_00602', bkId: 'bk_wise_otherwise', acc: 'VVPS-ACC-00602', bc: 'BC-VVPS-00602', cnum: 2, loc: 'loc_lib_lit', st: 'AVAILABLE', cond: 'GOOD', price: 275.00 },

      // Reference Encyclopedia: 1 Copy (REFERENCE_ONLY)
      { id: 'cp_00701', bkId: 'bk_encyclopedia_brit', acc: 'VVPS-ACC-00701', bc: 'BC-VVPS-00701', cnum: 1, loc: 'loc_lib_ref', st: 'REFERENCE_ONLY', cond: 'GOOD', price: 1850.00 }
    ];

    for (const cp of copies) {
      await db.query(`
        INSERT INTO library_book_copies (
          id, school_id, library_id, book_id, accession_number, barcode, qr_code,
          copy_number, purchase_date, purchase_price, condition, location_id,
          status, notes
        ) VALUES (
          $1, 'sch_vvps', 'lib_vvps_central', $2, $3, $4, $5,
          $6, '2026-06-15', $7, $8, $9,
          $10, 'Accessioned into Vidyavahini Central Library Collection'
        ) ON CONFLICT (id) DO NOTHING;
      `, [cp.id, cp.bkId, cp.acc, cp.bc, cp.acc, cp.cnum, cp.price, cp.cond, cp.loc, cp.st]);
    }

    // 13. Seed Memberships for Students and Teachers
    const memberships = [
      { id: 'mem_stu_001', mType: 'STUDENT', sId: 'stu_vvps_001', eId: null, num: 'VVPS-MEM-S001', card: 'VVP-LIB-2026-101', limit: 3 },
      { id: 'mem_stu_002', mType: 'STUDENT', sId: 'stu_vvps_002', eId: null, num: 'VVPS-MEM-S002', card: 'VVP-LIB-2026-102', limit: 3 },
      { id: 'mem_stu_003', mType: 'STUDENT', sId: 'stu_vvps_003', eId: null, num: 'VVPS-MEM-S003', card: 'VVP-LIB-2026-103', limit: 3 },
      { id: 'mem_emp_001', mType: 'TEACHER', sId: null, eId: 'emp_vvps_001', num: 'VVPS-MEM-T001', card: 'VVP-LIB-2026-201', limit: 5 },
      { id: 'mem_emp_003', mType: 'TEACHER', sId: null, eId: 'emp_vvps_003', num: 'VVPS-MEM-T003', card: 'VVP-LIB-2026-203', limit: 5 }
    ];

    for (const m of memberships) {
      await db.query(`
        INSERT INTO library_memberships (
          id, school_id, library_id, member_type, student_id, employee_id,
          membership_number, card_number, issue_date, expiry_date, status, borrowing_limit
        ) VALUES (
          $1, 'sch_vvps', 'lib_vvps_central', $2, $3, $4,
          $5, $6, '2026-06-01', '2027-05-31', 'ACTIVE', $7
        ) ON CONFLICT (id) DO NOTHING;
      `, [m.id, m.mType, m.sId, m.eId, m.num, m.card, m.limit]);
    }

    // 14. Seed Circulation Transactions (Issues, Overdue, Returned)
    // Issue 1: Aarav Kumar borrowed Wings of Fire copy 1
    await db.query(`
      INSERT INTO library_issues (
        id, school_id, library_id, member_id, book_copy_id, book_id,
        issue_date, due_date, issued_by, status, renewal_count, notes
      ) VALUES (
        'iss_vvps_001', 'sch_vvps', 'lib_vvps_central', 'mem_stu_001', 'cp_00101', 'bk_wings_fire',
        '2026-10-05', '2026-10-19', 'usr_principal_vvps', 'ISSUED', 0, 'Regular student borrow for book report'
      ) ON CONFLICT (id) DO NOTHING;
    `);
    await db.query(`UPDATE library_book_copies SET status = 'ISSUED', current_holder_id = 'mem_stu_001' WHERE id = 'cp_00101'`);

    // Issue 2: Teacher Rakesh Sharma borrowed Concepts of Physics copy 1
    await db.query(`
      INSERT INTO library_issues (
        id, school_id, library_id, member_id, book_copy_id, book_id,
        issue_date, due_date, issued_by, status, renewal_count, notes
      ) VALUES (
        'iss_vvps_002', 'sch_vvps', 'lib_vvps_central', 'mem_emp_003', 'cp_00201', 'bk_concepts_phy',
        '2026-09-25', '2026-10-25', 'usr_principal_vvps', 'ISSUED', 0, 'Teacher academic lesson planning borrow'
      ) ON CONFLICT (id) DO NOTHING;
    `);
    await db.query(`UPDATE library_book_copies SET status = 'ISSUED', current_holder_id = 'mem_emp_003' WHERE id = 'cp_00201'`);

    // Issue 3: Rohan Sharma borrowed Python for CS copy 1 - OVERDUE by 5 days
    await db.query(`
      INSERT INTO library_issues (
        id, school_id, library_id, member_id, book_copy_id, book_id,
        issue_date, due_date, issued_by, status, renewal_count, fine_amount, notes
      ) VALUES (
        'iss_vvps_003', 'sch_vvps', 'lib_vvps_central', 'mem_stu_003', 'cp_00501', 'bk_python_cs',
        '2026-09-22', '2026-10-06', 'usr_principal_vvps', 'OVERDUE', 0, 25.00, 'Overdue by 5 days past grace period'
      ) ON CONFLICT (id) DO NOTHING;
    `);
    await db.query(`UPDATE library_book_copies SET status = 'OVERDUE', current_holder_id = 'mem_stu_003' WHERE id = 'cp_00501'`);

    // Issue 4: Isha Patel borrowed Malgudi Days and returned it
    await db.query(`
      INSERT INTO library_issues (
        id, school_id, library_id, member_id, book_copy_id, book_id,
        issue_date, due_date, returned_date, issued_by, returned_by,
        status, return_condition, renewal_count, fine_amount, notes
      ) VALUES (
        'iss_vvps_004', 'sch_vvps', 'lib_vvps_central', 'mem_stu_002', 'cp_00301', 'bk_malgudi_days',
        '2026-09-10', '2026-09-24', '2026-09-22', 'usr_principal_vvps', 'usr_principal_vvps',
        'RETURNED', 'GOOD', 0, 0.00, 'Returned cleanly on time in good condition'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // 15. Seed Library Fine for Overdue Book (Integrated with Accounts)
    await db.query(`
      INSERT INTO library_fines (
        id, school_id, library_id, member_id, issue_id, type, amount,
        waived_amount, paid_amount, outstanding_amount, status, reason
      ) VALUES (
        'fine_vvps_001', 'sch_vvps', 'lib_vvps_central', 'mem_stu_003', 'iss_vvps_003',
        'OVERDUE', 25.00, 0.00, 0.00, 25.00, 'PENDING',
        'Overdue fine for Python for CBSE Computer Science (5 days @ Rs 5/day)'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // 16. Seed Active Book Hold / Reservation
    await db.query(`
      INSERT INTO library_reservations (
        id, school_id, library_id, book_id, member_id,
        reservation_date, expiry_date, queue_position, status
      ) VALUES (
        'res_vvps_001', 'sch_vvps', 'lib_vvps_central', 'bk_wings_fire', 'mem_stu_002',
        '2026-10-10', '2026-10-23', 1, 'WAITING'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // 17. Seed Completed Physical Inventory Verification / Stock Audit
    await db.query(`
      INSERT INTO library_inventory_verifications (
        id, school_id, library_id, title, verification_date,
        verified_by, verified_by_name, total_scanned, total_verified,
        total_missing, total_discrepancies, status, notes
      ) VALUES (
        'audit_vvps_001', 'sch_vvps', 'lib_vvps_central',
        'Term 1 Comprehensive Stocktaking & Barcode Verification',
        '2026-10-01', 'usr_principal_vvps', 'Dr. Sunita Mishra (Principal)',
        14, 14, 0, 0, 'COMPLETED',
        'All 14 accessioned physical copies verified in their designated shelving locations.'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // 18. Seed In-app Notifications
    await db.query(`
      INSERT INTO library_notifications (id, school_id, user_id, event_type, title, message, link_url, is_read)
      VALUES
        ('lnotif_001', 'sch_vvps', 'usr_teacher_vvps', 'ISSUE_CONFIRMATION', 'Book Borrow Confirmation: Concepts of Physics', 'Copy VVPS-ACC-00201 has been issued to you. Due date: 25th October 2026.', '/library', false),
        ('lnotif_002', 'sch_vvps', 'usr_super_admin', 'OVERDUE_ALERT', 'Library Overdue Notice: Grade 10 Scholar', 'Rohan Sharma has book VVPS-ACC-00501 overdue by 5 days. Fine assessed: Rs. 25.00.', '/library', false)
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('[DB] Phase 10 Library Management module initialized and seeded successfully.');
  } catch (err: any) {
    (globalThis as any).__phase10Error = err?.message || String(err);
    console.error('[DB PHASE 10 INIT ERROR]', err);
  }
}
