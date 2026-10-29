import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// Helper: Generate next unique employee ID per school
async function generateNextEmployeeId(schoolId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const schoolRes = await db.query('SELECT code, employee_prefix FROM schools WHERE id = $1', [schoolId]);
  const schoolRow = schoolRes.rows[0] as { code?: string; employee_prefix?: string } | undefined;
  const prefix = schoolRow?.employee_prefix || (schoolRow?.code ? `${schoolRow.code}-EMP` : 'EMP');

  // Search existing employees with this prefix
  const searchPattern = `${prefix}-%`;
  const countRes = await db.query(
    'SELECT count(*) as count FROM employees WHERE school_id = $1 AND employee_id_number LIKE $2',
    [schoolId, searchPattern]
  );
  let nextSeq = parseInt((countRes.rows[0] as { count: string }).count, 10) + 1;
  let candidate = `${prefix}-${String(nextSeq).padStart(4, '0')}`;

  let attempts = 0;
  while (attempts < 25) {
    const check = await db.query(
      'SELECT id FROM employees WHERE school_id = $1 AND employee_id_number = $2',
      [schoolId, candidate]
    );
    if (check.rows.length === 0) {
      return candidate;
    }
    nextSeq++;
    candidate = `${prefix}-${String(nextSeq).padStart(4, '0')}`;
    attempts++;
  }

  return `${prefix}-${Date.now().toString().slice(-4)}`;
}

// 1. Next Employee ID
router.get('/next-employee-id', requireAuth, requirePermission('employees.create'), async (req, res) => {
  try {
    const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
    if (!schoolId) {
      return res.status(400).json({ error: 'schoolId is required' });
    }
    if (!checkSchoolScope(req, schoolId)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    const nextId = await generateNextEmployeeId(schoolId);
    res.json({ nextEmployeeId: nextId });
  } catch (error: any) {
    console.error('[NEXT EMP ID ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to generate employee ID' });
  }
});

// 2. Staff & Faculty Dashboard Statistics
router.get('/stats', requireAuth, requirePermission('employees.view'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = req.query.schoolId as string | undefined;

    let targetSchoolId: string | undefined = schoolId;
    if (user.roleName !== 'super_admin') {
      targetSchoolId = user.schoolId || undefined;
    }

    const params: any[] = [];
    let whereSql = '';
    if (targetSchoolId) {
      params.push(targetSchoolId);
      whereSql = `WHERE e.school_id = $${params.length}`;
    }

    // Status counts
    const statusQuery = `
      SELECT e.employment_status, e.employee_type, count(*) as count
      FROM employees e
      ${whereSql}
      GROUP BY e.employment_status, e.employee_type
    `;
    const statusRes = await db.query(statusQuery, params);

    let total = 0;
    let teaching = 0;
    let nonTeaching = 0;
    let active = 0;
    let onProbation = 0;
    let onLeave = 0;
    let suspended = 0;
    let resigned = 0;
    let terminated = 0;
    let retired = 0;

    for (const row of statusRes.rows as any[]) {
      const c = parseInt(row.count, 10);
      total += c;
      if (row.employee_type === 'Teaching') teaching += c;
      else nonTeaching += c;

      if (row.employment_status === 'ACTIVE') active += c;
      else if (row.employment_status === 'ON_PROBATION') onProbation += c;
      else if (row.employment_status === 'ON_LEAVE') onLeave += c;
      else if (row.employment_status === 'SUSPENDED') suspended += c;
      else if (row.employment_status === 'RESIGNED') resigned += c;
      else if (row.employment_status === 'TERMINATED') terminated += c;
      else if (row.employment_status === 'RETIRED') retired += c;
    }

    // Departments count
    const deptCountQuery = `
      SELECT count(*) as count FROM departments d
      ${targetSchoolId ? 'WHERE d.school_id = $1 AND d.status = \'active\'' : 'WHERE d.status = \'active\''}
    `;
    const deptCountRes = await db.query(deptCountQuery, targetSchoolId ? [targetSchoolId] : []);
    const departmentsCount = parseInt((deptCountRes.rows[0] as any).count, 10);

    // New joinings this year
    const currentYear = new Date().getFullYear();
    const newJoinQuery = `
      SELECT count(*) as count FROM employees e
      ${whereSql ? `${whereSql} AND` : 'WHERE'} EXTRACT(YEAR FROM e.date_of_joining) = ${currentYear}
    `;
    const newJoinRes = await db.query(newJoinQuery, params);
    const newJoiningsThisYear = parseInt((newJoinRes.rows[0] as any).count, 10);

    // Distribution by Department
    const deptDistQuery = `
      SELECT COALESCE(d.name, 'Unassigned') as department_name, count(*) as count
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      ${whereSql}
      GROUP BY d.name
      ORDER BY count DESC
    `;
    const deptDistRes = await db.query(deptDistQuery, params);

    // Distribution by Employee Type
    const typeDistQuery = `
      SELECT e.employee_type as type, count(*) as count
      FROM employees e
      ${whereSql}
      GROUP BY e.employee_type
    `;
    const typeDistRes = await db.query(typeDistQuery, params);

    res.json({
      stats: {
        total,
        teaching,
        nonTeaching,
        active,
        onProbation,
        onLeave,
        suspended,
        resigned,
        terminated,
        retired,
        departmentsCount,
        newJoiningsThisYear,
        byDepartment: deptDistRes.rows.map((r: any) => ({ department_name: r.department_name, count: parseInt(r.count, 10) })),
        byType: typeDistRes.rows.map((r: any) => ({ type: r.type, count: parseInt(r.count, 10) }))
      }
    });
  } catch (error: any) {
    console.error('[STAFF STATS ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch staff statistics' });
  }
});

// 3. Employee Directory List (Search, Filter, Sort, Pagination)
router.get('/', requireAuth, requirePermission('employees.view'), async (req, res) => {
  try {
    const user = req.user!;
    const {
      schoolId,
      employeeType,
      departmentId,
      designationId,
      status,
      search,
      page = '1',
      limit = '10',
      sortBy = 'e.date_of_joining',
      sortOrder = 'DESC'
    } = req.query;

    let targetSchoolId: string | undefined = schoolId as string | undefined;
    if (user.roleName !== 'super_admin') {
      targetSchoolId = user.schoolId || undefined;
    }

    const filters: string[] = [];
    const params: any[] = [];

    if (targetSchoolId) {
      params.push(targetSchoolId);
      filters.push(`e.school_id = $${params.length}`);
    }
    if (employeeType) {
      params.push(employeeType);
      filters.push(`e.employee_type = $${params.length}`);
    }
    if (departmentId) {
      params.push(departmentId);
      filters.push(`e.department_id = $${params.length}`);
    }
    if (designationId) {
      params.push(designationId);
      filters.push(`e.designation_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      filters.push(`e.employment_status = $${params.length}`);
    }
    if (search) {
      params.push(`%${(search as string).trim()}%`);
      filters.push(`(
        e.employee_id_number ILIKE $${params.length} OR
        e.first_name ILIKE $${params.length} OR
        e.last_name ILIKE $${params.length} OR
        (e.first_name || ' ' || e.last_name) ILIKE $${params.length} OR
        e.email ILIKE $${params.length} OR
        e.official_email ILIKE $${params.length} OR
        e.mobile_number ILIKE $${params.length}
      )`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    // Total Count
    const countRes = await db.query(`
      SELECT count(*) as count
      FROM employees e
      ${whereClause}
    `, params);

    const total = parseInt((countRes.rows[0] as { count: string }).count, 10);
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;

    const allowedSortColumns: Record<string, string> = {
      'employee_id_number': 'e.employee_id_number',
      'first_name': 'e.first_name',
      'date_of_joining': 'e.date_of_joining',
      'employment_status': 'e.employment_status',
      'created_at': 'e.created_at'
    };
    const orderCol = allowedSortColumns[sortBy as string] || 'e.date_of_joining';
    const direction = (sortOrder as string).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const listQuery = `
      SELECT
        e.id, e.employee_id_number, e.user_id, e.school_id, e.employee_type,
        e.first_name, e.middle_name, e.last_name, e.profile_photo, e.gender,
        e.date_of_birth, e.mobile_number, e.alternate_mobile, e.email, e.official_email,
        e.address, e.city, e.district, e.state, e.pin_code,
        e.emergency_contact_name, e.emergency_contact_number, e.emergency_contact_relationship,
        e.department_id, e.designation_id, e.date_of_joining, e.employment_status,
        e.qualification, e.specialization, e.experience_years, e.previous_employer,
        e.blood_group, e.remarks, e.created_at, e.updated_at,
        s.name as school_name, s.code as school_code,
        d.name as department_name, des.name as designation_name,
        u.username as user_username, r.display_name as user_role
      FROM employees e
      JOIN schools s ON s.id = e.school_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN designations des ON des.id = e.designation_id
      LEFT JOIN users u ON u.id = e.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      ${whereClause}
      ORDER BY ${orderCol} ${direction}
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const listRes = await db.query(listQuery, params);

    res.json({
      employees: listRes.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error: any) {
    console.error('[LIST EMPLOYEES ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to list employees' });
  }
});

// 4. Export Employees to CSV
router.get('/export', requireAuth, requirePermission('employees.export'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);

    let query = `
      SELECT
        e.employee_id_number, e.first_name, e.last_name, e.employee_type,
        s.name as school_name, d.name as department, des.name as designation,
        e.mobile_number, e.email, e.official_email, e.gender, e.date_of_birth,
        e.date_of_joining, e.employment_status, e.qualification, e.experience_years
      FROM employees e
      JOIN schools s ON s.id = e.school_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN designations des ON des.id = e.designation_id
    `;
    const params: any[] = [];
    if (schoolId) {
      params.push(schoolId);
      query += ` WHERE e.school_id = $1`;
    }
    query += ` ORDER BY e.employee_id_number ASC`;

    const result = await db.query(query, params);

    // Convert to CSV
    const headers = [
      'Employee ID', 'First Name', 'Last Name', 'Type', 'School', 'Department',
      'Designation', 'Mobile', 'Email', 'Official Email', 'Gender', 'Date of Birth',
      'Joining Date', 'Status', 'Qualification', 'Experience (Years)'
    ];

    const rows = result.rows.map((r: any) => [
      `"${r.employee_id_number || ''}"`,
      `"${r.first_name || ''}"`,
      `"${r.last_name || ''}"`,
      `"${r.employee_type || ''}"`,
      `"${r.school_name || ''}"`,
      `"${r.department || ''}"`,
      `"${r.designation || ''}"`,
      `"${r.mobile_number || ''}"`,
      `"${r.email || ''}"`,
      `"${r.official_email || ''}"`,
      `"${r.gender || ''}"`,
      `"${r.date_of_birth ? new Date(r.date_of_birth).toISOString().split('T')[0] : ''}"`,
      `"${r.date_of_joining ? new Date(r.date_of_joining).toISOString().split('T')[0] : ''}"`,
      `"${r.employment_status || ''}"`,
      `"${r.qualification || ''}"`,
      `"${r.experience_years || 0}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Employees_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error: any) {
    console.error('[EXPORT EMPLOYEES ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to export employees' });
  }
});

// 5. Bulk Import Employees (Validation, Preview, and Batch Insert)
router.post('/import', requireAuth, requirePermission('employees.create'), async (req, res) => {
  try {
    const { schoolId, employees: importList } = req.body;
    if (!schoolId) {
      return res.status(400).json({ error: 'schoolId is required for employee import' });
    }
    if (!checkSchoolScope(req, schoolId)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }
    if (!Array.isArray(importList) || importList.length === 0) {
      return res.status(400).json({ error: 'No employee records provided in import payload' });
    }

    const inserted: string[] = [];
    const errors: { row: number; name: string; error: string }[] = [];

    for (let i = 0; i < importList.length; i++) {
      const item = importList[i];
      if (!item.first_name || !item.last_name || !item.mobile_number || !item.date_of_birth || !item.date_of_joining) {
        errors.push({
          row: i + 1,
          name: `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown',
          error: 'Missing required fields (First Name, Last Name, Mobile, Date of Birth, Joining Date)'
        });
        continue;
      }

      try {
        const empId = `emp_${crypto.randomBytes(6).toString('hex')}`;
        const empIdNumber = item.employee_id_number || (await generateNextEmployeeId(schoolId));
        const empType = item.employee_type === 'Non-Teaching' ? 'Non-Teaching' : 'Teaching';

        await db.query(`
          INSERT INTO employees (
            id, employee_id_number, school_id, employee_type, first_name, middle_name, last_name,
            gender, date_of_birth, mobile_number, email, official_email,
            address, city, state, pin_code, date_of_joining, employment_status,
            qualification, specialization, experience_years, remarks
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17, 'ACTIVE',
            $18, $19, $20, $21
          )
        `, [
          empId, empIdNumber, schoolId, empType, item.first_name, item.middle_name || '', item.last_name,
          item.gender || 'OTHER', item.date_of_birth, item.mobile_number, item.email || null, item.official_email || null,
          item.address || '', item.city || '', item.state || '', item.pin_code || '', item.date_of_joining,
          item.qualification || '', item.specialization || '', parseFloat(item.experience_years || '0'), item.remarks || 'Imported via CSV'
        ]);

        // If Teaching, create teacher profile
        if (empType === 'Teaching') {
          await db.query(`
            INSERT INTO teacher_profiles (id, employee_id, school_id, specialization, highest_qualification, teaching_experience_years, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
            ON CONFLICT (employee_id) DO NOTHING
          `, [
            `tp_${crypto.randomBytes(6).toString('hex')}`,
            empId,
            schoolId,
            item.specialization || '',
            item.qualification || '',
            parseFloat(item.experience_years || '0')
          ]);
        }

        // Add history record
        await db.query(`
          INSERT INTO employee_employment_history (id, employee_id, event_type, effective_date, new_value, remarks, changed_by_name)
          VALUES ($1, $2, 'JOINING', $3, 'ACTIVE', 'Bulk imported into school ERP roster', $4)
        `, [`hist_${crypto.randomBytes(6).toString('hex')}`, empId, item.date_of_joining, req.user!.username]);

        inserted.push(empIdNumber);
      } catch (err: any) {
        errors.push({
          row: i + 1,
          name: `${item.first_name} ${item.last_name}`,
          error: err.message || 'Database insert error'
        });
      }
    }

    await recordAuditLog({
      req,
      action: 'IMPORT',
      module: 'Employees',
      description: `Bulk imported ${inserted.length} employees for school ${schoolId} (${errors.length} failed)`
    });

    res.json({
      success: true,
      insertedCount: inserted.length,
      errorsCount: errors.length,
      inserted,
      errors
    });
  } catch (error: any) {
    console.error('[IMPORT EMPLOYEES ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to import employees' });
  }
});

// 6. Get Single Employee Profile
router.get('/:id', requireAuth, requirePermission('employees.view'), async (req, res) => {
  try {
    const { id } = req.params;

    const empRes = await db.query(`
      SELECT
        e.*,
        s.name as school_name, s.code as school_code,
        d.name as department_name, des.name as designation_name,
        u.username as user_username, r.name as user_role_name, r.display_name as user_role
      FROM employees e
      JOIN schools s ON s.id = e.school_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN designations des ON des.id = e.designation_id
      LEFT JOIN users u ON u.id = e.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE e.id = $1
    `, [id]);

    if (empRes.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employee = empRes.rows[0] as any;
    if (!checkSchoolScope(req, employee.school_id)) {
      return res.status(403).json({ error: 'Access denied to this school record' });
    }

    // Parallel fetch child collections
    const [qualRes, expRes, docsRes, histRes, tpRes] = await Promise.all([
      db.query(`SELECT * FROM employee_qualifications WHERE employee_id = $1 ORDER BY passing_year DESC`, [id]),
      db.query(`SELECT * FROM employee_experience WHERE employee_id = $1 ORDER BY start_date DESC`, [id]),
      db.query(`SELECT id, employee_id, document_type, file_name, file_size, mime_type, uploaded_by, upload_date, verification_status, verified_by, verification_date, remarks FROM employee_documents WHERE employee_id = $1 ORDER BY upload_date DESC`, [id]),
      db.query(`SELECT * FROM employee_employment_history WHERE employee_id = $1 ORDER BY effective_date DESC, created_at DESC`, [id]),
      db.query(`SELECT * FROM teacher_profiles WHERE employee_id = $1`, [id])
    ]);

    employee.qualifications = qualRes.rows;
    employee.experience = expRes.rows;
    employee.documents = docsRes.rows;
    employee.history = histRes.rows;
    employee.teacher_profile = tpRes.rows[0] || null;

    if (employee.teacher_profile) {
      const [subAssignRes, clsTeacherRes] = await Promise.all([
        db.query(`
          SELECT tsa.*, sub.name as subject_name, sub.code as subject_code,
                 c.name as class_name, sec.name as section_name, ses.name as session_name
          FROM teacher_subject_assignments tsa
          JOIN subjects sub ON sub.id = tsa.subject_id
          JOIN classes c ON c.id = tsa.class_id
          LEFT JOIN sections sec ON sec.id = tsa.section_id
          JOIN academic_sessions ses ON ses.id = tsa.session_id
          WHERE tsa.teacher_id = $1
          ORDER BY ses.start_date DESC, c.display_order ASC
        `, [employee.teacher_profile.id]),
        db.query(`
          SELECT cta.*, c.name as class_name, sec.name as section_name, ses.name as session_name
          FROM class_teacher_assignments cta
          JOIN classes c ON c.id = cta.class_id
          JOIN sections sec ON sec.id = cta.section_id
          JOIN academic_sessions ses ON ses.id = cta.session_id
          WHERE cta.teacher_id = $1
          ORDER BY ses.start_date DESC
        `, [employee.teacher_profile.id])
      ]);

      employee.subject_assignments = subAssignRes.rows;
      employee.class_teacher_assignments = clsTeacherRes.rows;
    }

    res.json({ employee });
  } catch (error: any) {
    console.error('[GET EMPLOYEE PROFILE ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch employee details' });
  }
});

// 7. Register / Onboard New Employee
router.post('/', requireAuth, requirePermission('employees.create'), async (req, res) => {
  try {
    const {
      school_id,
      employee_id_number,
      employee_type = 'Teaching',
      first_name,
      middle_name = '',
      last_name,
      profile_photo = '',
      gender,
      date_of_birth,
      mobile_number,
      alternate_mobile = '',
      email = '',
      official_email = '',
      address = '',
      city = '',
      district = '',
      state = '',
      pin_code = '',
      emergency_contact_name = '',
      emergency_contact_number = '',
      emergency_contact_relationship = '',
      department_id,
      designation_id,
      date_of_joining,
      employment_status = 'ACTIVE',
      qualification = '',
      specialization = '',
      experience_years = 0,
      previous_employer = '',
      blood_group = '',
      remarks = '',
      // Optional nested objects
      qualifications = [],
      experience = [],
      // Optional user account creation
      create_user_account = false,
      user_account_username,
      user_account_password,
      user_account_role_id
    } = req.body;

    const targetSchoolId = school_id || req.body.schoolId || req.user!.schoolId;
    if (!targetSchoolId) {
      return res.status(400).json({ error: 'school_id is required' });
    }
    if (!checkSchoolScope(req, targetSchoolId)) {
      return res.status(403).json({ error: 'Access denied to target school' });
    }

    const finalMobile = mobile_number || req.body.phone || req.body.mobile;
    const finalDob = date_of_birth || req.body.dob || '1990-01-01';
    const finalDoj = date_of_joining || req.body.doj || new Date().toISOString().split('T')[0];

    if (!first_name || !last_name || !gender || !finalMobile) {
      return res.status(400).json({ error: 'First name, last name, gender, and contact mobile are required.' });
    }

    // Determine or generate employee ID
    let finalEmpIdNumber = (employee_id_number || '').trim();
    if (!finalEmpIdNumber) {
      finalEmpIdNumber = await generateNextEmployeeId(targetSchoolId);
    } else {
      // Check uniqueness
      const checkExists = await db.query(
        'SELECT id FROM employees WHERE school_id = $1 AND employee_id_number = $2',
        [targetSchoolId, finalEmpIdNumber]
      );
      if (checkExists.rows.length > 0) {
        return res.status(400).json({ error: `Employee ID ${finalEmpIdNumber} already exists in this school. Please pick a unique ID.` });
      }
    }

    const empId = `emp_${crypto.randomBytes(6).toString('hex')}`;
    let createdUserId: string | null = null;

    // Optional user account creation
    if (create_user_account && user_account_username && user_account_password && user_account_role_id) {
      const existingUser = await db.query('SELECT id FROM users WHERE username = $1 OR email = $2', [user_account_username, email || user_account_username]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Username or email already in use for ERP login.' });
      }

      createdUserId = `usr_${crypto.randomBytes(6).toString('hex')}`;
      const hash = await bcrypt.hash(user_account_password, 10);
      await db.query(`
        INSERT INTO users (id, username, password_hash, email, first_name, last_name, phone, school_id, role_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
      `, [
        createdUserId, user_account_username, hash, official_email || email || `${user_account_username}@erp.edu`,
        first_name, last_name, mobile_number, targetSchoolId, user_account_role_id
      ]);
    }

    // Insert Employee
    await db.query(`
      INSERT INTO employees (
        id, employee_id_number, user_id, school_id, employee_type, first_name, middle_name, last_name,
        profile_photo, gender, date_of_birth, mobile_number, alternate_mobile, email, official_email,
        address, city, district, state, pin_code, emergency_contact_name, emergency_contact_number, emergency_contact_relationship,
        department_id, designation_id, date_of_joining, employment_status, qualification, specialization,
        experience_years, previous_employer, blood_group, remarks
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23,
        $24, $25, $26, $27, $28, $29,
        $30, $31, $32, $33
      )
    `, [
      empId, finalEmpIdNumber, createdUserId, targetSchoolId, employee_type, first_name, middle_name, last_name,
      profile_photo, gender, finalDob, finalMobile, alternate_mobile, email, official_email,
      address, city, district, state, pin_code, emergency_contact_name, emergency_contact_number, emergency_contact_relationship,
      department_id || null, designation_id || null, finalDoj, employment_status, qualification, specialization,
      parseFloat(experience_years || '0'), previous_employer, blood_group, remarks
    ]);

    // Insert Qualifications if provided
    if (Array.isArray(qualifications) && qualifications.length > 0) {
      for (const q of qualifications) {
        if (q.qualification) {
          const qId = `qual_${crypto.randomBytes(6).toString('hex')}`;
          await db.query(`
            INSERT INTO employee_qualifications (id, employee_id, qualification, specialization, institution, university_board, passing_year, percentage_grade, remarks)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            qId, empId, q.qualification, q.specialization || '', q.institution || '',
            q.university_board || '', q.passing_year ? parseInt(q.passing_year, 10) : null,
            q.percentage_grade || '', q.remarks || ''
          ]);
        }
      }
    }

    // Insert Experience if provided
    if (Array.isArray(experience) && experience.length > 0) {
      for (const exp of experience) {
        if (exp.organization && exp.designation) {
          const expId = `exp_${crypto.randomBytes(6).toString('hex')}`;
          await db.query(`
            INSERT INTO employee_experience (id, employee_id, organization, designation, start_date, end_date, total_experience_months, responsibilities)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            expId, empId, exp.organization, exp.designation, exp.start_date || null,
            exp.end_date || null, exp.total_experience_months ? parseInt(exp.total_experience_months, 10) : null,
            exp.responsibilities || ''
          ]);
        }
      }
    }

    // If employee_type is Teaching, automatically create teacher profile
    if (employee_type === 'Teaching') {
      const tpId = `tp_${crypto.randomBytes(6).toString('hex')}`;
      await db.query(`
        INSERT INTO teacher_profiles (id, employee_id, school_id, specialization, highest_qualification, teaching_experience_years, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
      `, [tpId, empId, targetSchoolId, specialization, qualification, parseFloat(experience_years || '0')]);
    }

    // Log initial joining in employment history
    await db.query(`
      INSERT INTO employee_employment_history (id, employee_id, event_type, effective_date, new_value, remarks, changed_by_name)
      VALUES ($1, $2, 'JOINING', $3, $4, 'Registered employee profile into school staff records', $5)
    `, [
      `hist_${crypto.randomBytes(6).toString('hex')}`,
      empId,
      date_of_joining,
      employment_status,
      req.user!.username
    ]);

    await recordAuditLog({
      req,
      action: 'CREATE',
      module: 'Employees',
      recordId: empId,
      description: `Registered ${employee_type} employee ${first_name} ${last_name} (${finalEmpIdNumber})`
    });

    res.status(201).json({
      success: true,
      employeeId: empId,
      employeeIdNumber: finalEmpIdNumber,
      message: `Employee ${first_name} ${last_name} registered successfully with ID ${finalEmpIdNumber}`
    });
  } catch (error: any) {
    console.error('[CREATE EMPLOYEE ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to create employee' });
  }
});

// 8. Update Employee Demographics & Service Details
router.put('/:id', requireAuth, requirePermission('employees.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const current = existing.rows[0] as any;
    if (!checkSchoolScope(req, current.school_id)) {
      return res.status(403).json({ error: 'Access denied to this school record' });
    }

    const {
      first_name,
      middle_name = '',
      last_name,
      profile_photo,
      gender,
      date_of_birth,
      mobile_number,
      alternate_mobile = '',
      email = '',
      official_email = '',
      address = '',
      city = '',
      district = '',
      state = '',
      pin_code = '',
      emergency_contact_name = '',
      emergency_contact_number = '',
      emergency_contact_relationship = '',
      department_id,
      designation_id,
      date_of_joining,
      qualification = '',
      specialization = '',
      experience_years = 0,
      previous_employer = '',
      blood_group = '',
      remarks = ''
    } = req.body;

    // Track department or designation changes in employment history
    if (department_id && department_id !== current.department_id) {
      await db.query(`
        INSERT INTO employee_employment_history (id, employee_id, event_type, effective_date, previous_value, new_value, remarks, changed_by_name)
        VALUES ($1, $2, 'DEPARTMENT_CHANGE', CURRENT_DATE, $3, $4, 'Department assignment updated', $5)
      `, [`hist_${crypto.randomBytes(6).toString('hex')}`, id, current.department_id, department_id, req.user!.username]);
    }
    if (designation_id && designation_id !== current.designation_id) {
      await db.query(`
        INSERT INTO employee_employment_history (id, employee_id, event_type, effective_date, previous_value, new_value, remarks, changed_by_name)
        VALUES ($1, $2, 'DESIGNATION_CHANGE', CURRENT_DATE, $3, $4, 'Designation updated', $5)
      `, [`hist_${crypto.randomBytes(6).toString('hex')}`, id, current.designation_id, designation_id, req.user!.username]);
    }

    await db.query(`
      UPDATE employees SET
        first_name = $1, middle_name = $2, last_name = $3, profile_photo = $4,
        gender = $5, date_of_birth = $6, mobile_number = $7, alternate_mobile = $8,
        email = $9, official_email = $10, address = $11, city = $12, district = $13,
        state = $14, pin_code = $15, emergency_contact_name = $16, emergency_contact_number = $17,
        emergency_contact_relationship = $18, department_id = $19, designation_id = $20,
        date_of_joining = $21, qualification = $22, specialization = $23, experience_years = $24,
        previous_employer = $25, blood_group = $26, remarks = $27, updated_at = CURRENT_TIMESTAMP
      WHERE id = $28
    `, [
      first_name, middle_name, last_name, profile_photo !== undefined ? profile_photo : current.profile_photo,
      gender, date_of_birth, mobile_number, alternate_mobile,
      email, official_email, address, city, district,
      state, pin_code, emergency_contact_name, emergency_contact_number,
      emergency_contact_relationship, department_id || null, designation_id || null,
      date_of_joining, qualification, specialization, parseFloat(experience_years || '0'),
      previous_employer, blood_group, remarks, id
    ]);

    await recordAuditLog({
      req,
      action: 'UPDATE',
      module: 'Employees',
      recordId: id,
      description: `Updated employee demographics for ${first_name} ${last_name}`
    });

    res.json({ success: true, message: 'Employee profile updated successfully' });
  } catch (error: any) {
    console.error('[UPDATE EMPLOYEE ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to update employee' });
  }
});

// 9. Employee Exit Workflow / Employment Status Transition
router.patch('/:id/status', requireAuth, requirePermission('employees.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { new_status, effective_date, remarks, event_type = 'STATUS_CHANGE' } = req.body;

    const existing = await db.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const current = existing.rows[0] as any;
    if (!checkSchoolScope(req, current.school_id)) {
      return res.status(403).json({ error: 'Access denied to this school record' });
    }

    const validStatuses = ['ACTIVE', 'ON_PROBATION', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED', 'TERMINATED', 'RETIRED', 'INACTIVE'];
    if (!validStatuses.includes(new_status)) {
      return res.status(400).json({ error: `Invalid employment status: ${new_status}` });
    }

    // Update employee status without deleting record
    await db.query(`
      UPDATE employees
      SET employment_status = $1, remarks = COALESCE($2, remarks), updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [new_status, remarks, id]);

    // Record in historical employment events
    await db.query(`
      INSERT INTO employee_employment_history (id, employee_id, event_type, effective_date, previous_value, new_value, remarks, changed_by_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      `hist_${crypto.randomBytes(6).toString('hex')}`,
      id,
      event_type,
      effective_date || new Date().toISOString().split('T')[0],
      current.employment_status,
      new_status,
      remarks || `Employment status transitioned to ${new_status}`,
      req.user!.username
    ]);

    // If employee is deactivated/resigned/retired, deactivate teacher profile and linked user account if exists
    if (['RESIGNED', 'TERMINATED', 'RETIRED', 'INACTIVE'].includes(new_status)) {
      await db.query(`UPDATE teacher_profiles SET status = 'INACTIVE' WHERE employee_id = $1`, [id]);
      if (current.user_id) {
        await db.query(`UPDATE users SET status = 'inactive' WHERE id = $1`, [current.user_id]);
      }
    } else if (new_status === 'ACTIVE') {
      await db.query(`UPDATE teacher_profiles SET status = 'ACTIVE' WHERE employee_id = $1`, [id]);
      if (current.user_id) {
        await db.query(`UPDATE users SET status = 'active' WHERE id = $1`, [current.user_id]);
      }
    }

    await recordAuditLog({
      req,
      action: 'STATUS_CHANGE',
      module: 'Employees',
      recordId: id,
      description: `Transitioned employee ${current.employee_id_number} status from ${current.employment_status} to ${new_status}`
    });

    res.json({
      success: true,
      message: `Employee status successfully updated to ${new_status}`
    });
  } catch (error: any) {
    console.error('[STATUS TRANSITION ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to update employee status' });
  }
});

// 10. Deactivate Employee (Soft Exit)
router.delete('/:id', requireAuth, requirePermission('employees.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const current = existing.rows[0] as any;
    if (!checkSchoolScope(req, current.school_id)) {
      return res.status(403).json({ error: 'Access denied to this school record' });
    }

    // In accordance with guidelines, do not destroy historical records; mark as INACTIVE
    await db.query(`UPDATE employees SET employment_status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
    await db.query(`UPDATE teacher_profiles SET status = 'INACTIVE' WHERE employee_id = $1`, [id]);
    if (current.user_id) {
      await db.query(`UPDATE users SET status = 'inactive' WHERE id = $1`, [current.user_id]);
    }

    await db.query(`
      INSERT INTO employee_employment_history (id, employee_id, event_type, effective_date, previous_value, new_value, remarks, changed_by_name)
      VALUES ($1, $2, 'DEACTIVATION', CURRENT_DATE, $3, 'INACTIVE', 'Employee deactivated by administrator', $4)
    `, [`hist_${crypto.randomBytes(6).toString('hex')}`, id, current.employment_status, req.user!.username]);

    await recordAuditLog({
      req,
      action: 'DEACTIVATE',
      module: 'Employees',
      recordId: id,
      description: `Deactivated employee ${current.employee_id_number}`
    });

    res.json({ success: true, message: 'Employee has been deactivated and archived in historical directory' });
  } catch (error: any) {
    console.error('[DELETE EMPLOYEE ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to deactivate employee' });
  }
});

// ==========================================
// EMPLOYEE QUALIFICATIONS & EXPERIENCE
// ==========================================

router.post('/:id/qualifications', requireAuth, requirePermission('employees.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { qualification, specialization, institution, university_board, passing_year, percentage_grade, remarks } = req.body;
    if (!qualification) {
      return res.status(400).json({ error: 'Qualification name is required' });
    }

    const qId = `qual_${crypto.randomBytes(6).toString('hex')}`;
    await db.query(`
      INSERT INTO employee_qualifications (id, employee_id, qualification, specialization, institution, university_board, passing_year, percentage_grade, remarks)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [qId, id, qualification, specialization || '', institution || '', university_board || '', passing_year ? parseInt(passing_year, 10) : null, percentage_grade || '', remarks || '']);

    res.status(201).json({ success: true, qualificationId: qId, message: 'Qualification added successfully' });
  } catch (error: any) {
    console.error('[ADD QUALIFICATION ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to add qualification' });
  }
});

router.delete('/:id/qualifications/:qualId', requireAuth, requirePermission('employees.edit'), async (req, res) => {
  try {
    const { id, qualId } = req.params;
    await db.query('DELETE FROM employee_qualifications WHERE id = $1 AND employee_id = $2', [qualId, id]);
    res.json({ success: true, message: 'Qualification removed' });
  } catch (error: any) {
    console.error('[DELETE QUALIFICATION ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to delete qualification' });
  }
});

router.post('/:id/experience', requireAuth, requirePermission('employees.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { organization, designation, start_date, end_date, total_experience_months, responsibilities } = req.body;
    if (!organization || !designation) {
      return res.status(400).json({ error: 'Organization and Designation are required' });
    }

    const expId = `exp_${crypto.randomBytes(6).toString('hex')}`;
    await db.query(`
      INSERT INTO employee_experience (id, employee_id, organization, designation, start_date, end_date, total_experience_months, responsibilities)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [expId, id, organization, designation, start_date || null, end_date || null, total_experience_months ? parseInt(total_experience_months, 10) : null, responsibilities || '']);

    res.status(201).json({ success: true, experienceId: expId, message: 'Work experience record added successfully' });
  } catch (error: any) {
    console.error('[ADD EXPERIENCE ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to add work experience' });
  }
});

router.delete('/:id/experience/:expId', requireAuth, requirePermission('employees.edit'), async (req, res) => {
  try {
    const { id, expId } = req.params;
    await db.query('DELETE FROM employee_experience WHERE id = $1 AND employee_id = $2', [expId, id]);
    res.json({ success: true, message: 'Experience record removed' });
  } catch (error: any) {
    console.error('[DELETE EXPERIENCE ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to delete experience' });
  }
});

// ==========================================
// EMPLOYEE DOCUMENTS & VERIFICATION
// ==========================================

router.post('/:id/documents', requireAuth, requirePermission('employees.documents.upload'), async (req, res) => {
  try {
    const { id } = req.params;
    const { document_type, file_name, file_size, file_data, mime_type, remarks } = req.body;

    if (!document_type || !file_name || !file_data) {
      return res.status(400).json({ error: 'Document type, file name, and file data are required.' });
    }

    const docId = `doc_emp_${crypto.randomBytes(6).toString('hex')}`;
    await db.query(`
      INSERT INTO employee_documents (id, employee_id, document_type, file_name, file_size, file_data, mime_type, uploaded_by, verification_status, remarks)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9)
    `, [
      docId, id, document_type, file_name, file_size || 0, file_data, mime_type || 'application/octet-stream',
      req.user!.username, remarks || ''
    ]);

    await recordAuditLog({
      req,
      action: 'UPLOAD',
      module: 'Employees',
      recordId: id,
      description: `Uploaded document ${document_type} (${file_name}) for employee`
    });

    res.status(201).json({ success: true, documentId: docId, message: 'Document uploaded successfully' });
  } catch (error: any) {
    console.error('[UPLOAD EMP DOC ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to upload document' });
  }
});

// View Document with file_data securely
router.get('/:id/documents/:docId/view', requireAuth, requirePermission('employees.documents.view'), async (req, res) => {
  try {
    const { id, docId } = req.params;
    const docRes = await db.query('SELECT * FROM employee_documents WHERE id = $1 AND employee_id = $2', [docId, id]);
    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ document: docRes.rows[0] });
  } catch (error: any) {
    console.error('[VIEW EMP DOC ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch document' });
  }
});

router.patch('/:id/documents/:docId/verify', requireAuth, requirePermission('employees.documents.verify'), async (req, res) => {
  try {
    const { id, docId } = req.params;
    const { verification_status, remarks } = req.body;

    if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(verification_status)) {
      return res.status(400).json({ error: 'Invalid verification status' });
    }

    await db.query(`
      UPDATE employee_documents
      SET verification_status = $1, verified_by = $2, verification_date = CURRENT_TIMESTAMP, remarks = COALESCE($3, remarks)
      WHERE id = $4 AND employee_id = $5
    `, [verification_status, req.user!.username, remarks, docId, id]);

    await recordAuditLog({
      req,
      action: 'VERIFY',
      module: 'Employees',
      recordId: id,
      description: `Document ${docId} ${verification_status} by ${req.user!.username}`
    });

    res.json({ success: true, message: `Document verification status set to ${verification_status}` });
  } catch (error: any) {
    console.error('[VERIFY EMP DOC ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to verify document' });
  }
});

router.delete('/:id/documents/:docId', requireAuth, requirePermission('employees.documents.upload'), async (req, res) => {
  try {
    const { id, docId } = req.params;
    await db.query('DELETE FROM employee_documents WHERE id = $1 AND employee_id = $2', [docId, id]);
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE EMP DOC ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to delete document' });
  }
});

// ==========================================
// EMPLOYEE ERP USER ACCOUNT MANAGEMENT
// ==========================================

router.post('/:id/user-account', requireAuth, requirePermission('users.create'), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role_id } = req.body;

    const empRes = await db.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (empRes.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const emp = empRes.rows[0] as any;
    if (emp.user_id) {
      return res.status(400).json({ error: 'Employee already has a linked ERP login account' });
    }

    if (!username || !password || !role_id) {
      return res.status(400).json({ error: 'Username, password, and role_id are required' });
    }

    const userExists = await db.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, emp.email || emp.official_email || username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already in use' });
    }

    const userId = `usr_${crypto.randomBytes(6).toString('hex')}`;
    const hash = await bcrypt.hash(password, 10);
    await db.query(`
      INSERT INTO users (id, username, password_hash, email, first_name, last_name, phone, school_id, role_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
    `, [
      userId, username, hash, emp.official_email || emp.email || `${username}@erp.edu`,
      emp.first_name, emp.last_name, emp.mobile_number, emp.school_id, role_id
    ]);

    await db.query('UPDATE employees SET user_id = $1 WHERE id = $2', [userId, id]);

    await recordAuditLog({
      req,
      action: 'CREATE_USER',
      module: 'Employees',
      recordId: id,
      description: `Created ERP login account ${username} for employee ${emp.employee_id_number}`
    });

    res.status(201).json({
      success: true,
      userId,
      message: `ERP login user account ${username} created and linked successfully`
    });
  } catch (error: any) {
    console.error('[CREATE EMP USER ACCOUNT ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to create user account' });
  }
});

router.patch('/:id/user-account', requireAuth, requirePermission('users.roles'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role_id, status } = req.body;

    const empRes = await db.query('SELECT user_id FROM employees WHERE id = $1', [id]);
    const empRow = empRes.rows[0] as { user_id?: string } | undefined;
    if (!empRow || !empRow.user_id) {
      return res.status(404).json({ error: 'No linked user account found for this employee' });
    }
    const userId = empRow.user_id;

    if (role_id) {
      await db.query('UPDATE users SET role_id = $1 WHERE id = $2', [role_id, userId]);
    }
    if (status) {
      await db.query('UPDATE users SET status = $1 WHERE id = $2', [status, userId]);
    }

    res.json({ success: true, message: 'Employee user account settings updated successfully' });
  } catch (error: any) {
    console.error('[UPDATE EMP USER ACCOUNT ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to update user account' });
  }
});

router.post('/:id/user-account/reset-password', requireAuth, requirePermission('users.reset_pwd'), async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const empRes = await db.query('SELECT user_id FROM employees WHERE id = $1', [id]);
    const empRow = empRes.rows[0] as { user_id?: string } | undefined;
    if (!empRow || !empRow.user_id) {
      return res.status(404).json({ error: 'No linked user account found for this employee' });
    }
    const userId = empRow.user_id;

    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);

    await recordAuditLog({
      req,
      action: 'RESET_PASSWORD',
      module: 'Employees',
      recordId: id,
      description: `Reset password for employee linked user account`
    });

    res.json({ success: true, message: 'Password reset successfully for employee login account' });
  } catch (error: any) {
    console.error('[RESET EMP PWD ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to reset password' });
  }
});

// ==========================================
// DEPARTMENTS, DESIGNATIONS & SUBJECTS METADATA
// ==========================================

// Departments
router.get('/meta/departments', requireAuth, requirePermission('departments.view'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);

    let query = `
      SELECT d.*, (SELECT count(*) FROM employees e WHERE e.department_id = d.id AND e.employment_status = 'ACTIVE') as employees_count
      FROM departments d
    `;
    const params: any[] = [];
    if (schoolId) {
      params.push(schoolId);
      query += ` WHERE d.school_id = $1`;
    }
    query += ` ORDER BY d.name ASC`;

    const result = await db.query(query, params);
    res.json({ departments: result.rows });
  } catch (error: any) {
    console.error('[GET DEPARTMENTS ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch departments' });
  }
});

router.post('/meta/departments', requireAuth, requirePermission('departments.create'), async (req, res) => {
  try {
    const { school_id, name, code, description } = req.body;
    const targetSchoolId = school_id || req.user!.schoolId;
    if (!targetSchoolId || !name) {
      return res.status(400).json({ error: 'school_id and department name are required' });
    }
    if (!checkSchoolScope(req, targetSchoolId)) {
      return res.status(403).json({ error: 'Access denied to target school' });
    }

    const deptId = `dept_${crypto.randomBytes(6).toString('hex')}`;
    await db.query(`
      INSERT INTO departments (id, school_id, name, code, description, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
    `, [deptId, targetSchoolId, name, code || null, description || null]);

    res.status(201).json({ success: true, departmentId: deptId, message: 'Department created successfully' });
  } catch (error: any) {
    console.error('[CREATE DEPT ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to create department' });
  }
});

router.put('/meta/departments/:id', requireAuth, requirePermission('departments.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, status } = req.body;
    await db.query(`
      UPDATE departments
      SET name = COALESCE($1, name), code = COALESCE($2, code),
          description = COALESCE($3, description), status = COALESCE($4, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [name, code, description, status, id]);
    res.json({ success: true, message: 'Department updated successfully' });
  } catch (error: any) {
    console.error('[UPDATE DEPT ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to update department' });
  }
});

// Designations
router.get('/meta/designations', requireAuth, requirePermission('designations.view'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);
    const departmentId = req.query.departmentId as string | undefined;

    let query = `
      SELECT des.*, d.name as department_name,
        (SELECT count(*) FROM employees e WHERE e.designation_id = des.id AND e.employment_status = 'ACTIVE') as employees_count
      FROM designations des
      LEFT JOIN departments d ON d.id = des.department_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND des.school_id = $${params.length}`;
    }
    if (departmentId) {
      params.push(departmentId);
      query += ` AND des.department_id = $${params.length}`;
    }
    query += ` ORDER BY des.name ASC`;

    const result = await db.query(query, params);
    res.json({ designations: result.rows });
  } catch (error: any) {
    console.error('[GET DESIGNATIONS ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch designations' });
  }
});

router.post('/meta/designations', requireAuth, requirePermission('designations.create'), async (req, res) => {
  try {
    const { school_id, department_id, name, code, employee_type = 'Teaching', description } = req.body;
    const targetSchoolId = school_id || req.user!.schoolId;
    if (!targetSchoolId || !name) {
      return res.status(400).json({ error: 'school_id and designation name are required' });
    }
    if (!checkSchoolScope(req, targetSchoolId)) {
      return res.status(403).json({ error: 'Access denied to target school' });
    }

    const desigId = `des_${crypto.randomBytes(6).toString('hex')}`;
    await db.query(`
      INSERT INTO designations (id, school_id, department_id, name, code, employee_type, description, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
    `, [desigId, targetSchoolId, department_id || null, name, code || null, employee_type, description || null]);

    res.status(201).json({ success: true, designationId: desigId, message: 'Designation created successfully' });
  } catch (error: any) {
    console.error('[CREATE DESIG ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to create designation' });
  }
});

router.put('/meta/designations/:id', requireAuth, requirePermission('designations.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { department_id, name, code, employee_type, description, status } = req.body;
    await db.query(`
      UPDATE designations
      SET department_id = COALESCE($1, department_id), name = COALESCE($2, name),
          code = COALESCE($3, code), employee_type = COALESCE($4, employee_type),
          description = COALESCE($5, description), status = COALESCE($6, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [department_id, name, code, employee_type, description, status, id]);
    res.json({ success: true, message: 'Designation updated successfully' });
  } catch (error: any) {
    console.error('[UPDATE DESIG ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to update designation' });
  }
});

// Subjects
router.get('/meta/subjects', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);

    let query = `SELECT * FROM subjects`;
    const params: any[] = [];
    if (schoolId) {
      params.push(schoolId);
      query += ` WHERE school_id = $1`;
    }
    query += ` ORDER BY name ASC`;

    const result = await db.query(query, params);
    res.json({ subjects: result.rows });
  } catch (error: any) {
    console.error('[GET SUBJECTS ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch subjects' });
  }
});

router.post('/meta/subjects', requireAuth, requirePermission('teachers.edit'), async (req, res) => {
  try {
    const { school_id, name, code, type = 'Theory', description } = req.body;
    const targetSchoolId = school_id || req.body.schoolId || req.user!.schoolId;
    if (!targetSchoolId || !name || !code) {
      return res.status(400).json({ error: 'school_id, name, and subject code are required' });
    }
    if (!checkSchoolScope(req, targetSchoolId)) {
      return res.status(403).json({ error: 'Access denied to target school' });
    }

    const subId = `sub_${crypto.randomBytes(6).toString('hex')}`;
    await db.query(`
      INSERT INTO subjects (id, school_id, name, code, type, description, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
    `, [subId, targetSchoolId, name, code, type, description || null]);

    res.status(201).json({ success: true, subjectId: subId, message: 'Subject created successfully' });
  } catch (error: any) {
    console.error('[CREATE SUBJECT ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to create subject' });
  }
});

// ==========================================
// TEACHER MANAGEMENT & ACADEMIC ASSIGNMENTS
// ==========================================

// List Teaching Faculty with assignment stats
router.get('/teachers/list', requireAuth, requirePermission('teachers.view'), async (req, res) => {
  try {
    const user = req.user!;
    const schoolId = (req.query.schoolId as string) || (user.roleName !== 'super_admin' ? user.schoolId : undefined);
    const sessionId = req.query.sessionId as string | undefined;

    let query = `
      SELECT
        tp.id as teacher_profile_id, tp.employee_id, tp.specialization, tp.highest_qualification,
        tp.teaching_experience_years, tp.bio, tp.status as teacher_status,
        e.employee_id_number, e.first_name, e.last_name, e.profile_photo, e.email, e.mobile_number,
        e.date_of_joining, e.employment_status,
        s.id as school_id, s.name as school_name, s.code as school_code,
        d.name as department_name, des.name as designation_name,
        (
          SELECT count(DISTINCT tsa.subject_id)
          FROM teacher_subject_assignments tsa
          WHERE tsa.teacher_id = tp.id AND tsa.status = 'active'
          ${sessionId ? 'AND tsa.session_id = \'' + sessionId + '\'' : ''}
        ) as subjects_count,
        (
          SELECT count(DISTINCT tsa.class_id)
          FROM teacher_subject_assignments tsa
          WHERE tsa.teacher_id = tp.id AND tsa.status = 'active'
          ${sessionId ? 'AND tsa.session_id = \'' + sessionId + '\'' : ''}
        ) as classes_count,
        (
          SELECT count(*)
          FROM class_teacher_assignments cta
          WHERE cta.teacher_id = tp.id AND cta.status = 'active'
          ${sessionId ? 'AND cta.session_id = \'' + sessionId + '\'' : ''}
        ) as class_teacher_sections_count
      FROM teacher_profiles tp
      JOIN employees e ON e.id = tp.employee_id
      JOIN schools s ON s.id = tp.school_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN designations des ON des.id = e.designation_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND tp.school_id = $${params.length}`;
    }
    query += ` ORDER BY e.first_name ASC, e.last_name ASC`;

    const result = await db.query(query, params);
    res.json({ teachers: result.rows });
  } catch (error: any) {
    console.error('[GET TEACHERS LIST ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to list teachers' });
  }
});

// Assign Subject to Teacher
router.post('/teachers/:teacherId/assign-subject', requireAuth, requirePermission('teachers.assign_subject'), async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { school_id, session_id, subject_id, class_id, section_id, is_primary_teacher = true } = req.body;

    if (!session_id || !subject_id || !class_id) {
      return res.status(400).json({ error: 'Academic session, subject, and class are required' });
    }

    let tpRes = await db.query('SELECT * FROM teacher_profiles WHERE id = $1 OR employee_id = $1', [teacherId]);
    if (tpRes.rows.length === 0) {
      const empRes = await db.query('SELECT * FROM employees WHERE id = $1', [teacherId]);
      if (empRes.rows.length > 0) {
        const emp = empRes.rows[0] as any;
        const tpId = `tp_${emp.id}`;
        await db.query(`
          INSERT INTO teacher_profiles (id, employee_id, school_id, status)
          VALUES ($1, $2, $3, 'active')
          ON CONFLICT (id) DO NOTHING
        `, [tpId, emp.id, emp.school_id]);
        tpRes = await db.query('SELECT * FROM teacher_profiles WHERE id = $1', [tpId]);
      }
    }
    if (tpRes.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }
    const tp = tpRes.rows[0] as any;
    const finalTeacherId = tp.id;
    const targetSchoolId = school_id || tp.school_id;

    if (!checkSchoolScope(req, targetSchoolId)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    // Check duplicate assignment
    const dupCheck = await db.query(`
      SELECT id FROM teacher_subject_assignments
      WHERE session_id = $1 AND teacher_id = $2 AND subject_id = $3 AND class_id = $4
        AND (section_id IS NOT DISTINCT FROM $5)
    `, [session_id, finalTeacherId, subject_id, class_id, section_id || null]);

    if (dupCheck.rows.length > 0) {
      return res.status(400).json({ error: 'This subject assignment already exists for the teacher in this session and class.' });
    }

    const assignId = `tsa_${crypto.randomBytes(6).toString('hex')}`;
    await db.query(`
      INSERT INTO teacher_subject_assignments (
        id, teacher_id, school_id, session_id, subject_id, class_id, section_id, is_primary_teacher, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
    `, [assignId, finalTeacherId, targetSchoolId, session_id, subject_id, class_id, section_id || null, is_primary_teacher]);

    await recordAuditLog({
      req,
      action: 'ASSIGN_SUBJECT',
      module: 'Teachers',
      recordId: assignId,
      description: `Assigned subject ${subject_id} to teacher ${teacherId} for class ${class_id}`
    });

    res.status(201).json({
      success: true,
      assignmentId: assignId,
      message: 'Subject and class successfully assigned to teacher'
    });
  } catch (error: any) {
    console.error('[ASSIGN SUBJECT ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to assign subject' });
  }
});

// Remove Subject Assignment
router.delete('/teachers/assignments/:assignmentId', requireAuth, requirePermission('teachers.assign_subject'), async (req, res) => {
  try {
    const { assignmentId } = req.params;
    await db.query('DELETE FROM teacher_subject_assignments WHERE id = $1', [assignmentId]);
    res.json({ success: true, message: 'Subject assignment removed successfully' });
  } catch (error: any) {
    console.error('[DELETE SUBJECT ASSIGNMENT ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to remove assignment' });
  }
});

// Assign Class Teacher / Class In-Charge
router.post('/teachers/assign-class-teacher', requireAuth, requirePermission('teachers.assign_class'), async (req, res) => {
  try {
    const { school_id, session_id, class_id, section_id, teacher_id, academic_year, remarks } = req.body;

    if (!session_id || !class_id || !section_id || !teacher_id) {
      return res.status(400).json({ error: 'Session, Class, Section, and Teacher are required' });
    }

    let tpRes = await db.query(`
      SELECT tp.*, e.first_name, e.last_name FROM teacher_profiles tp
      JOIN employees e ON e.id = tp.employee_id
      WHERE tp.id = $1 OR tp.employee_id = $1
    `, [teacher_id]);
    if (tpRes.rows.length === 0) {
      const empRes = await db.query('SELECT * FROM employees WHERE id = $1', [teacher_id]);
      if (empRes.rows.length > 0) {
        const emp = empRes.rows[0] as any;
        const tpId = `tp_${emp.id}`;
        await db.query(`
          INSERT INTO teacher_profiles (id, employee_id, school_id, status)
          VALUES ($1, $2, $3, 'active')
          ON CONFLICT (id) DO NOTHING
        `, [tpId, emp.id, emp.school_id]);
        tpRes = await db.query(`
          SELECT tp.*, e.first_name, e.last_name FROM teacher_profiles tp
          JOIN employees e ON e.id = tp.employee_id
          WHERE tp.id = $1
        `, [tpId]);
      }
    }
    if (tpRes.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }
    const tp = tpRes.rows[0] as any;
    const finalTeacherId = tp.id;
    const targetSchoolId = school_id || tp.school_id;

    if (!checkSchoolScope(req, targetSchoolId)) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    // Check if section already has an active class teacher for this session
    const existingCTA = await db.query(`
      SELECT cta.*, e.first_name, e.last_name
      FROM class_teacher_assignments cta
      JOIN teacher_profiles t ON t.id = cta.teacher_id
      JOIN employees e ON e.id = t.employee_id
      WHERE cta.session_id = $1 AND cta.section_id = $2 AND cta.status = 'active'
    `, [session_id, section_id]);

    if (existingCTA.rows.length > 0) {
      const prev = existingCTA.rows[0] as any;
      // Mark previous assignment inactive to maintain audit history
      await db.query(`UPDATE class_teacher_assignments SET status = 'inactive' WHERE id = $1`, [prev.id]);
    }

    const ctaId = `cta_${crypto.randomBytes(6).toString('hex')}`;
    await db.query(`
      INSERT INTO class_teacher_assignments (
        id, school_id, session_id, class_id, section_id, teacher_id, academic_year, status, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)
      ON CONFLICT (session_id, section_id)
      DO UPDATE SET teacher_id = EXCLUDED.teacher_id, status = 'active', remarks = EXCLUDED.remarks
    `, [ctaId, targetSchoolId, session_id, class_id, section_id, finalTeacherId, academic_year || '', remarks || 'Class Teacher In-Charge']);

    // Also update class_teacher_name on sections table for convenience
    await db.query(`
      UPDATE sections SET class_teacher_name = $1 WHERE id = $2
    `, [`${tp.first_name} ${tp.last_name}`, section_id]);

    await recordAuditLog({
      req,
      action: 'ASSIGN_CLASS_TEACHER',
      module: 'Teachers',
      recordId: ctaId,
      description: `Designated ${tp.first_name} ${tp.last_name} as Class Teacher for section ${section_id}`
    });

    res.json({
      success: true,
      assignmentId: ctaId,
      message: `${tp.first_name} ${tp.last_name} successfully designated as Class Teacher in-charge.`
    });
  } catch (error: any) {
    console.error('[ASSIGN CLASS TEACHER ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to designate class teacher' });
  }
});

// Revoke Class Teacher
router.delete('/teachers/class-teacher/:assignmentId', requireAuth, requirePermission('teachers.assign_class'), async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const ctaRes = await db.query('SELECT section_id FROM class_teacher_assignments WHERE id = $1', [assignmentId]);
    if (ctaRes.rows.length > 0) {
      const secId = (ctaRes.rows[0] as any).section_id;
      await db.query(`UPDATE sections SET class_teacher_name = NULL WHERE id = $1`, [secId]);
    }
    await db.query('DELETE FROM class_teacher_assignments WHERE id = $1', [assignmentId]);
    res.json({ success: true, message: 'Class teacher assignment removed' });
  } catch (error: any) {
    console.error('[DELETE CLASS TEACHER ERROR]', error);
    res.status(500).json({ error: error?.message || 'Failed to remove class teacher assignment' });
  }
});

export default router;
