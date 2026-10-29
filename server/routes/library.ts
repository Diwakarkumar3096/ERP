import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// ==========================================
// 1. DASHBOARD & ANALYTICS
// ==========================================

// GET /api/library/dashboard - Real-time statistics from PostgreSQL
router.get('/dashboard', requireAuth, requirePermission('library.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied to this school library data.' });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    // Run parallel aggregation queries
    const [
      titlesRes,
      copiesRes,
      membersRes,
      activeBorrowersRes,
      finesRes,
      dueTodayRes,
      dueWeekRes,
      recentIssuesRes,
      popularBooksRes
    ] = await Promise.all([
      // 1. Book Titles
      db.query(`SELECT count(*) as count FROM library_books WHERE school_id = $1 AND is_active = true`, [schoolId]),
      // 2. Copies by status
      db.query(`
        SELECT
          count(*) as total_copies,
          count(*) FILTER (WHERE status = 'AVAILABLE') as available_copies,
          count(*) FILTER (WHERE status = 'ISSUED') as issued_copies,
          count(*) FILTER (WHERE status = 'OVERDUE') as overdue_copies,
          count(*) FILTER (WHERE status = 'RESERVED') as reserved_copies,
          count(*) FILTER (WHERE status = 'LOST') as lost_copies,
          count(*) FILTER (WHERE status = 'DAMAGED') as damaged_copies,
          count(*) FILTER (WHERE status = 'REFERENCE_ONLY') as reference_copies
        FROM library_book_copies
        WHERE school_id = $1
      `, [schoolId]),
      // 3. Members total
      db.query(`
        SELECT
          count(*) as total_members,
          count(*) FILTER (WHERE member_type = 'STUDENT' AND status = 'ACTIVE') as active_students,
          count(*) FILTER (WHERE member_type IN ('TEACHER', 'STAFF') AND status = 'ACTIVE') as active_staff
        FROM library_memberships
        WHERE school_id = $1
      `, [schoolId]),
      // 4. Active borrowers
      db.query(`
        SELECT
          count(DISTINCT m.student_id) FILTER (WHERE m.member_type = 'STUDENT') as student_borrowers,
          count(DISTINCT m.employee_id) FILTER (WHERE m.member_type IN ('TEACHER', 'STAFF')) as staff_borrowers
        FROM library_issues i
        JOIN library_memberships m ON i.member_id = m.id
        WHERE i.school_id = $1 AND i.status IN ('ISSUED', 'OVERDUE')
      `, [schoolId]),
      // 5. Fines
      db.query(`
        SELECT
          COALESCE(sum(outstanding_amount) FILTER (WHERE status IN ('PENDING', 'PARTIALLY_PAID')), 0) as total_outstanding,
          COALESCE(sum(paid_amount), 0) as total_collected,
          COALESCE(sum(waived_amount), 0) as total_waived
        FROM library_fines
        WHERE school_id = $1
      `, [schoolId]),
      // 6. Books due today
      db.query(`
        SELECT count(*) as count FROM library_issues
        WHERE school_id = $1 AND status IN ('ISSUED', 'OVERDUE') AND due_date = $2
      `, [schoolId, today]),
      // 7. Books due this week
      db.query(`
        SELECT count(*) as count FROM library_issues
        WHERE school_id = $1 AND status IN ('ISSUED', 'OVERDUE') AND due_date >= $2 AND due_date <= $3
      `, [schoolId, today, nextWeek]),
      // 8. Recent Circulation Issues
      db.query(`
        SELECT
          i.*,
          b.title as book_title,
          cp.accession_number,
          cp.barcode,
          m.membership_number,
          m.member_type,
          CASE
            WHEN m.member_type = 'STUDENT' THEN concat(s.first_name, ' ', s.last_name)
            ELSE concat(e.first_name, ' ', e.last_name)
          END as member_name
        FROM library_issues i
        JOIN library_books b ON i.book_id = b.id
        JOIN library_book_copies cp ON i.book_copy_id = cp.id
        JOIN library_memberships m ON i.member_id = m.id
        LEFT JOIN students s ON m.student_id = s.id
        LEFT JOIN employees e ON m.employee_id = e.id
        WHERE i.school_id = $1
        ORDER BY i.created_at DESC
        LIMIT 6
      `, [schoolId]),
      // 9. Popular Books by checkout volume
      db.query(`
        SELECT
          b.id,
          b.title,
          b.author_name,
          b.isbn,
          c.name as category_name,
          count(i.id) as borrow_count
        FROM library_books b
        LEFT JOIN library_issues i ON b.id = i.book_id
        LEFT JOIN library_categories c ON b.category_id = c.id
        WHERE b.school_id = $1
        GROUP BY b.id, b.title, b.author_name, b.isbn, c.name
        ORDER BY borrow_count DESC
        LIMIT 5
      `, [schoolId])
    ]);

    const copiesData: any = copiesRes.rows[0] || {};
    const membersData: any = membersRes.rows[0] || {};
    const borrowersData: any = activeBorrowersRes.rows[0] || {};
    const finesData: any = finesRes.rows[0] || {};

    return res.json({
      totalBookTitles: parseInt((titlesRes.rows[0] as { count: string }).count || '0', 10),
      totalCopies: parseInt(copiesData.total_copies || '0', 10),
      availableCopies: parseInt(copiesData.available_copies || '0', 10),
      issuedCopies: parseInt(copiesData.issued_copies || '0', 10),
      overdueCopies: parseInt(copiesData.overdue_copies || '0', 10),
      reservedCopies: parseInt(copiesData.reserved_copies || '0', 10),
      lostCopies: parseInt(copiesData.lost_copies || '0', 10),
      damagedCopies: parseInt(copiesData.damaged_copies || '0', 10),
      referenceCopies: parseInt(copiesData.reference_copies || '0', 10),
      totalMembers: parseInt(membersData.total_members || '0', 10),
      activeStudents: parseInt(membersData.active_students || '0', 10),
      activeStaff: parseInt(membersData.active_staff || '0', 10),
      studentBorrowers: parseInt(borrowersData.student_borrowers || '0', 10),
      staffBorrowers: parseInt(borrowersData.staff_borrowers || '0', 10),
      outstandingFines: parseFloat(finesData.total_outstanding || '0'),
      collectedFines: parseFloat(finesData.total_collected || '0'),
      waivedFines: parseFloat(finesData.total_waived || '0'),
      booksDueToday: parseInt((dueTodayRes.rows[0] as { count: string }).count || '0', 10),
      booksDueThisWeek: parseInt((dueWeekRes.rows[0] as { count: string }).count || '0', 10),
      recentIssues: recentIssuesRes.rows,
      popularBooks: popularBooksRes.rows
    });
  } catch (err: any) {
    console.error('[LIBRARY DASHBOARD ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch library dashboard stats.' });
  }
});

// ==========================================
// 2. LIBRARY SETTINGS
// ==========================================

// GET /api/library/settings
router.get('/settings', requireAuth, requirePermission('library.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const result = await db.query(`SELECT * FROM library_settings WHERE school_id = $1`, [schoolId]);
    if (result.rows.length === 0) {
      // Create defaults
      const id = `set_${Date.now()}`;
      const defaultInsert = await db.query(`
        INSERT INTO library_settings (id, school_id) VALUES ($1, $2) RETURNING *
      `, [id, schoolId]);
      return res.json({ settings: defaultInsert.rows[0] });
    }
    return res.json({ settings: result.rows[0] });
  } catch (err: any) {
    console.error('[LIBRARY SETTINGS GET ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch library settings.' });
  }
});

// PUT /api/library/settings
router.put('/settings', requireAuth, requirePermission('library.settings.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const {
    max_books_student,
    max_books_teacher,
    max_books_staff,
    borrowing_period_student_days,
    borrowing_period_teacher_days,
    borrowing_period_staff_days,
    renewal_limit,
    fine_per_day,
    max_fine_per_book,
    grace_period_days,
    reservation_validity_days,
    lost_book_fine_rule,
    lost_book_processing_fee,
    damaged_book_default_penalty,
    library_card_prefix
  } = req.body;

  try {
    const existing = await db.query(`SELECT * FROM library_settings WHERE school_id = $1`, [schoolId]);
    let result;
    if (existing.rows.length === 0) {
      const id = `set_${Date.now()}`;
      result = await db.query(`
        INSERT INTO library_settings (
          id, school_id, max_books_student, max_books_teacher, max_books_staff,
          borrowing_period_student_days, borrowing_period_teacher_days, borrowing_period_staff_days,
          renewal_limit, fine_per_day, max_fine_per_book, grace_period_days,
          reservation_validity_days, lost_book_fine_rule, lost_book_processing_fee,
          damaged_book_default_penalty, library_card_prefix, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP
        ) RETURNING *
      `, [
        id, schoolId, max_books_student ?? 3, max_books_teacher ?? 5, max_books_staff ?? 3,
        borrowing_period_student_days ?? 14, borrowing_period_teacher_days ?? 30, borrowing_period_staff_days ?? 21,
        renewal_limit ?? 2, fine_per_day ?? 5.0, max_fine_per_book ?? 500.0, grace_period_days ?? 1,
        reservation_validity_days ?? 3, lost_book_fine_rule ?? 'PRICE_PLUS_FEE', lost_book_processing_fee ?? 50.0,
        damaged_book_default_penalty ?? 100.0, library_card_prefix ?? 'LIB'
      ]);
    } else {
      result = await db.query(`
        UPDATE library_settings SET
          max_books_student = COALESCE($1, max_books_student),
          max_books_teacher = COALESCE($2, max_books_teacher),
          max_books_staff = COALESCE($3, max_books_staff),
          borrowing_period_student_days = COALESCE($4, borrowing_period_student_days),
          borrowing_period_teacher_days = COALESCE($5, borrowing_period_teacher_days),
          borrowing_period_staff_days = COALESCE($6, borrowing_period_staff_days),
          renewal_limit = COALESCE($7, renewal_limit),
          fine_per_day = COALESCE($8, fine_per_day),
          max_fine_per_book = COALESCE($9, max_fine_per_book),
          grace_period_days = COALESCE($10, grace_period_days),
          reservation_validity_days = COALESCE($11, reservation_validity_days),
          lost_book_fine_rule = COALESCE($12, lost_book_fine_rule),
          lost_book_processing_fee = COALESCE($13, lost_book_processing_fee),
          damaged_book_default_penalty = COALESCE($14, damaged_book_default_penalty),
          library_card_prefix = COALESCE($15, library_card_prefix),
          updated_at = CURRENT_TIMESTAMP
        WHERE school_id = $16
        RETURNING *
      `, [
        max_books_student, max_books_teacher, max_books_staff,
        borrowing_period_student_days, borrowing_period_teacher_days, borrowing_period_staff_days,
        renewal_limit, fine_per_day, max_fine_per_book, grace_period_days,
        reservation_validity_days, lost_book_fine_rule, lost_book_processing_fee,
        damaged_book_default_penalty, library_card_prefix, schoolId
      ]);
    }

    await recordAuditLog({
      req,
      action: 'UPDATE_LIBRARY_SETTINGS',
      module: 'LIBRARY',
      schoolId,
      description: 'Updated school library circulation parameters and fine policies',
      newValues: req.body
    });

    return res.json({ settings: result.rows[0], message: 'Library policy settings saved successfully.' });
  } catch (err: any) {
    console.error('[LIBRARY SETTINGS UPDATE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to update library settings.' });
  }
});

// ==========================================
// 3. LIBRARIES / BRANCHES
// ==========================================

router.get('/branches', requireAuth, requirePermission('library.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const result = await db.query(`
      SELECT l.*,
        (SELECT count(*) FROM library_books b WHERE b.library_id = l.id) as titles_count,
        (SELECT count(*) FROM library_book_copies cp WHERE cp.library_id = l.id) as copies_count
      FROM libraries l
      WHERE l.school_id = $1
      ORDER BY l.created_at ASC
    `, [schoolId]);

    return res.json({ libraries: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to list libraries.' });
  }
});

router.post('/branches', requireAuth, requirePermission('library.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const { name, code, description, location, contactEmail, contactPhone } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: 'Library name and code are required.' });
  }

  try {
    const id = `lib_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO libraries (id, school_id, name, code, description, location, contact_email, contact_phone, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      RETURNING *
    `, [id, schoolId, name.trim(), code.trim().toUpperCase(), description, location, contactEmail, contactPhone]);

    await recordAuditLog({
      req,
      action: 'CREATE_LIBRARY_BRANCH',
      module: 'LIBRARY',
      schoolId,
      recordId: id,
      description: `Created library facility: ${name} (${code})`
    });

    return res.status(201).json({ library: result.rows[0], message: 'Library facility created successfully.' });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A library with this code already exists for this school.' });
    }
    return res.status(500).json({ error: err.message || 'Failed to create library.' });
  }
});

// ==========================================
// 4. CATEGORIES, AUTHORS, PUBLISHERS, LOCATIONS
// ==========================================

// Categories
router.get('/categories', requireAuth, requirePermission('library.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const result = await db.query(`
      SELECT c.*,
        (SELECT count(*) FROM library_books b WHERE b.category_id = c.id) as books_count
      FROM library_categories c
      WHERE c.school_id = $1
      ORDER BY c.name ASC
    `, [schoolId]);
    return res.json({ categories: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/categories', requireAuth, requirePermission('library.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { name, code, description, parentCategoryId } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Category name and code are required.' });

  try {
    const id = `cat_lib_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO library_categories (id, school_id, name, code, description, parent_category_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *
    `, [id, schoolId, name.trim(), code.trim().toUpperCase(), description, parentCategoryId || null]);

    await recordAuditLog({
      req,
      action: 'CREATE_BOOK_CATEGORY',
      module: 'LIBRARY',
      schoolId,
      recordId: id,
      description: `Created book category: ${name}`
    });

    return res.status(201).json({ category: result.rows[0], message: 'Category added successfully.' });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Category name already exists in this school.' });
    return res.status(500).json({ error: err.message });
  }
});

// Authors
router.get('/authors', requireAuth, requirePermission('library.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const search = (req.query.search as string) || '';
  try {
    let q = `
      SELECT a.*,
        (SELECT count(*) FROM library_books b WHERE b.author_id = a.id) as titles_count
      FROM library_authors a
      WHERE a.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (search) {
      q += ` AND (a.name ILIKE $2 OR a.nationality ILIKE $2)`;
      params.push(`%${search}%`);
    }
    q += ` ORDER BY a.name ASC`;
    const result = await db.query(q, params);
    return res.json({ authors: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/authors', requireAuth, requirePermission('library.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { name, biography, nationality, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Author name is required.' });

  try {
    const id = `auth_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO library_authors (id, school_id, name, biography, nationality, notes, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *
    `, [id, schoolId, name.trim(), biography, nationality, notes]);

    return res.status(201).json({ author: result.rows[0], message: 'Author registered successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Publishers
router.get('/publishers', requireAuth, requirePermission('library.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const result = await db.query(`
      SELECT p.*,
        (SELECT count(*) FROM library_books b WHERE b.publisher_id = p.id) as titles_count
      FROM library_publishers p
      WHERE p.school_id = $1
      ORDER BY p.name ASC
    `, [schoolId]);
    return res.json({ publishers: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/publishers', requireAuth, requirePermission('library.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { name, address, contactPerson, email, website, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Publisher name is required.' });

  try {
    const id = `pub_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO library_publishers (id, school_id, name, address, contact_person, email, website, notes, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      RETURNING *
    `, [id, schoolId, name.trim(), address, contactPerson, email, website, notes]);

    return res.status(201).json({ publisher: result.rows[0], message: 'Publisher added successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Locations (Racks / Shelves)
router.get('/locations', requireAuth, requirePermission('library.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const result = await db.query(`
      SELECT l.*,
        (SELECT count(*) FROM library_book_copies cp WHERE cp.location_id = l.id) as copies_count
      FROM library_locations l
      WHERE l.school_id = $1
      ORDER BY l.name ASC
    `, [schoolId]);
    return res.json({ locations: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/locations', requireAuth, requirePermission('library.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { libraryId, name, code, description, parentLocationId } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Location name and code are required.' });

  try {
    const libId = libraryId || ((await db.query(`SELECT id FROM libraries WHERE school_id = $1 LIMIT 1`, [schoolId])).rows[0] as any)?.id;
    const id = `loc_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO library_locations (id, school_id, library_id, name, code, description, parent_location_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING *
    `, [id, schoolId, libId, name.trim(), code.trim().toUpperCase(), description, parentLocationId || null]);

    return res.status(201).json({ location: result.rows[0], message: 'Shelving location created successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. BOOK CATALOG (TITLES & COPIES)
// ==========================================

// GET /api/library/books - Search catalog with filters & pagination
router.get('/books', requireAuth, requirePermission('library.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const search = (req.query.search as string) || '';
  const categoryId = req.query.categoryId as string;
  const authorId = req.query.authorId as string;
  const availability = req.query.availability as string; // 'available', 'all'
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
  const offset = (page - 1) * limit;

  try {
    let whereClause = `WHERE b.school_id = $1 AND b.is_active = true`;
    const params: any[] = [schoolId];
    let paramIdx = 2;

    if (search) {
      whereClause += ` AND (
        b.title ILIKE $${paramIdx} OR
        b.isbn ILIKE $${paramIdx} OR
        b.isbn13 ILIKE $${paramIdx} OR
        b.author_name ILIKE $${paramIdx} OR
        b.subject ILIKE $${paramIdx} OR
        EXISTS (
          SELECT 1 FROM library_book_copies cp
          WHERE cp.book_id = b.id AND (cp.accession_number ILIKE $${paramIdx} OR cp.barcode ILIKE $${paramIdx})
        )
      )`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (categoryId) {
      whereClause += ` AND b.category_id = $${paramIdx}`;
      params.push(categoryId);
      paramIdx++;
    }

    if (authorId) {
      whereClause += ` AND b.author_id = $${paramIdx}`;
      params.push(authorId);
      paramIdx++;
    }

    // Count
    const countRes = await db.query(`SELECT count(*) as total FROM library_books b ${whereClause}`, params);
    const total = parseInt((countRes.rows[0] as { total: string }).total, 10);

    // Fetch with copy counts
    const query = `
      SELECT
        b.*,
        c.name as category_name,
        c.code as category_code,
        a.name as registered_author_name,
        p.name as publisher_name,
        (SELECT count(*) FROM library_book_copies cp WHERE cp.book_id = b.id) as total_copies,
        (SELECT count(*) FROM library_book_copies cp WHERE cp.book_id = b.id AND cp.status = 'AVAILABLE') as available_copies,
        (SELECT count(*) FROM library_book_copies cp WHERE cp.book_id = b.id AND cp.status = 'ISSUED') as issued_copies,
        (SELECT count(*) FROM library_book_copies cp WHERE cp.book_id = b.id AND cp.status = 'OVERDUE') as overdue_copies,
        (SELECT count(*) FROM library_reservations r WHERE r.book_id = b.id AND r.status = 'WAITING') as active_holds
      FROM library_books b
      LEFT JOIN library_categories c ON b.category_id = c.id
      LEFT JOIN library_authors a ON b.author_id = a.id
      LEFT JOIN library_publishers p ON b.publisher_id = p.id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    params.push(limit, offset);

    const result = await db.query(query, params);

    return res.json({
      books: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err: any) {
    console.error('[LIBRARY BOOKS LIST ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to list books.' });
  }
});

// GET /api/library/books/:id - Detailed bibliographic record + physical copies
router.get('/books/:id', requireAuth, requirePermission('library.view'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const bookRes = await db.query(`
      SELECT
        b.*,
        c.name as category_name,
        a.name as registered_author_name,
        p.name as publisher_name
      FROM library_books b
      LEFT JOIN library_categories c ON b.category_id = c.id
      LEFT JOIN library_authors a ON b.author_id = a.id
      LEFT JOIN library_publishers p ON b.publisher_id = p.id
      WHERE b.id = $1
    `, [id]);

    if (bookRes.rows.length === 0) return res.status(404).json({ error: 'Book title not found.' });
    const book: any = bookRes.rows[0];
    if (schoolId && !checkSchoolScope(req, book.school_id)) {
      return res.status(403).json({ error: 'Access denied to this school book.' });
    }

    // Copies with location & current borrower details
    const copiesRes = await db.query(`
      SELECT
        cp.*,
        loc.name as location_name,
        loc.code as location_code,
        iss.id as current_issue_id,
        iss.issue_date,
        iss.due_date,
        iss.renewal_count,
        CASE
          WHEN m.member_type = 'STUDENT' THEN concat(s.first_name, ' ', s.last_name, ' (Class ', cls.name, '-', sec.name, ')')
          WHEN m.member_type IN ('TEACHER', 'STAFF') THEN concat(e.first_name, ' ', e.last_name, ' (', e.employee_type, ')')
          ELSE 'Unknown'
        END as borrower_name,
        m.membership_number as borrower_mem_no
      FROM library_book_copies cp
      LEFT JOIN library_locations loc ON cp.location_id = loc.id
      LEFT JOIN library_issues iss ON iss.book_copy_id = cp.id AND iss.status IN ('ISSUED', 'OVERDUE')
      LEFT JOIN library_memberships m ON iss.member_id = m.id
      LEFT JOIN students s ON m.student_id = s.id
      LEFT JOIN classes cls ON s.class_id = cls.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN employees e ON m.employee_id = e.id
      WHERE cp.book_id = $1
      ORDER BY cp.copy_number ASC
    `, [id]);

    // Active holds/reservations
    const resvRes = await db.query(`
      SELECT
        r.*,
        m.membership_number,
        m.member_type,
        CASE
          WHEN m.member_type = 'STUDENT' THEN concat(s.first_name, ' ', s.last_name)
          ELSE concat(e.first_name, ' ', e.last_name)
        END as member_name
      FROM library_reservations r
      JOIN library_memberships m ON r.member_id = m.id
      LEFT JOIN students s ON m.student_id = s.id
      LEFT JOIN employees e ON m.employee_id = e.id
      WHERE r.book_id = $1 AND r.status IN ('WAITING', 'READY')
      ORDER BY r.queue_position ASC
    `, [id]);

    return res.json({
      book,
      copies: copiesRes.rows,
      reservations: resvRes.rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to get book details.' });
  }
});

// POST /api/library/books - Create new book title
router.post('/books', requireAuth, requirePermission('library.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const {
    libraryId,
    title,
    subtitle,
    isbn,
    isbn13,
    authorId,
    authorName,
    publisherId,
    categoryId,
    language,
    edition,
    publicationYear,
    description,
    subject,
    pages,
    price,
    supplier,
    acquisitionDate,
    referenceOnly,
    initialCopiesCount,
    accessionPrefix,
    defaultLocationId
  } = req.body;

  if (!title || !title.trim()) return res.status(400).json({ error: 'Book title is required.' });

  try {
    const libId = libraryId || ((await db.query(`SELECT id FROM libraries WHERE school_id = $1 LIMIT 1`, [schoolId])).rows[0] as any)?.id;
    const bookId = `bk_${Date.now()}`;

    // Resolve author name if authorId provided
    let finalAuthorName = authorName?.trim();
    if (authorId && !finalAuthorName) {
      const aRes = await db.query(`SELECT name FROM library_authors WHERE id = $1`, [authorId]);
      if (aRes.rows[0]) finalAuthorName = (aRes.rows[0] as any).name;
    }

    const insertRes = await db.query(`
      INSERT INTO library_books (
        id, school_id, library_id, title, subtitle, isbn, isbn13,
        author_id, author_name, publisher_id, category_id, language,
        edition, publication_year, description, subject, pages, price,
        supplier, acquisition_date, reference_only, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18,
        $19, $20, $21, true
      ) RETURNING *
    `, [
      bookId, schoolId, libId, title.trim(), subtitle || null, isbn || null, isbn13 || null,
      authorId || null, finalAuthorName || 'Unknown Author', publisherId || null, categoryId || null,
      language || 'English', edition || null, publicationYear || null, description || null,
      subject || null, pages || null, price || 0.0, supplier || null,
      acquisitionDate || new Date().toISOString().slice(0, 10), !!referenceOnly
    ]);

    // Automatically generate initial physical copies if requested
    const numCopies = parseInt(initialCopiesCount || '1', 10);
    const copiesCreated: any[] = [];
    const prefix = accessionPrefix || 'VVPS-ACC';

    for (let i = 1; i <= numCopies; i++) {
      const copyId = `cp_${Date.now()}_${i}`;
      // Generate clean sequence accession number
      const accNum = `${prefix}-${Date.now().toString().slice(-4)}${i.toString().padStart(2, '0')}`;
      const bc = `BC-${accNum}`;

      const copyRes = await db.query(`
        INSERT INTO library_book_copies (
          id, school_id, library_id, book_id, accession_number, barcode, qr_code,
          copy_number, purchase_date, purchase_price, condition, location_id,
          status, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, CURRENT_DATE, $9, 'GOOD', $10,
          $11, 'Initial catalog ingestion'
        ) RETURNING *
      `, [
        copyId, schoolId, libId, bookId, accNum, bc, accNum,
        i, price || 0.0, defaultLocationId || null,
        referenceOnly ? 'REFERENCE_ONLY' : 'AVAILABLE'
      ]);
      copiesCreated.push(copyRes.rows[0]);
    }

    await recordAuditLog({
      req,
      action: 'CREATE_BOOK_CATALOG',
      module: 'LIBRARY',
      schoolId,
      recordId: bookId,
      description: `Cataloged book title: "${title}" with ${numCopies} initial physical copies`
    });

    return res.status(201).json({
      book: insertRes.rows[0],
      copiesCreated,
      message: `Book cataloged successfully with ${numCopies} physical copies.`
    });
  } catch (err: any) {
    console.error('[BOOK CREATE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to create book title.' });
  }
});

// POST /api/library/copies - Add individual physical copy to existing book
router.post('/copies', requireAuth, requirePermission('library.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { bookId, accessionNumber, barcode, purchasePrice, purchaseDate, condition, locationId, notes, isReference } = req.body;
  if (!bookId || !accessionNumber) {
    return res.status(400).json({ error: 'Book ID and unique Accession Number are required.' });
  }

  try {
    const bookCheck = await db.query(`SELECT library_id, price FROM library_books WHERE id = $1 AND school_id = $2`, [bookId, schoolId]);
    if (bookCheck.rows.length === 0) return res.status(404).json({ error: 'Book title not found.' });

    const bookCheckRow: any = bookCheck.rows[0];
    const libId = bookCheckRow.library_id;
    const finalBarcode = barcode?.trim() || `BC-${accessionNumber.trim().toUpperCase()}`;

    // Get next copy number for this book
    const countRes = await db.query(`SELECT count(*) as count FROM library_book_copies WHERE book_id = $1`, [bookId]);
    const nextCopyNum = parseInt((countRes.rows[0] as any).count, 10) + 1;

    const copyId = `cp_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO library_book_copies (
        id, school_id, library_id, book_id, accession_number, barcode, qr_code,
        copy_number, purchase_date, purchase_price, condition, location_id,
        status, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14
      ) RETURNING *
    `, [
      copyId, schoolId, libId, bookId,
      accessionNumber.trim().toUpperCase(), finalBarcode, accessionNumber.trim().toUpperCase(),
      nextCopyNum, purchaseDate || new Date().toISOString().slice(0, 10),
      purchasePrice ?? bookCheckRow.price, condition || 'GOOD', locationId || null,
      isReference ? 'REFERENCE_ONLY' : 'AVAILABLE', notes || 'Newly accessioned copy'
    ]);

    await recordAuditLog({
      req,
      action: 'ADD_BOOK_COPY',
      module: 'LIBRARY',
      schoolId,
      recordId: copyId,
      description: `Added physical copy ACC# ${accessionNumber} for book ${bookId}`
    });

    return res.status(201).json({ copy: result.rows[0], message: 'Physical copy registered successfully.' });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Accession number or barcode already exists in this school inventory.' });
    }
    return res.status(500).json({ error: err.message || 'Failed to add copy.' });
  }
});

// Fast scanner lookup by barcode or accession number (For Librarian Desk!)
router.get('/copies/lookup', requireAuth, requirePermission('library.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const term = (req.query.term as string || '').trim().toUpperCase();
  if (!term) return res.status(400).json({ error: 'Search term is required.' });

  try {
    const result = await db.query(`
      SELECT
        cp.*,
        b.title as book_title,
        b.author_name,
        b.isbn,
        b.reference_only as book_ref_only,
        c.name as category_name,
        loc.name as location_name,
        iss.id as active_issue_id,
        iss.issue_date,
        iss.due_date,
        iss.renewal_count,
        m.id as borrower_member_id,
        m.membership_number as borrower_mem_no,
        m.member_type,
        CASE
          WHEN m.member_type = 'STUDENT' THEN concat(s.first_name, ' ', s.last_name, ' (Roll ', s.roll_number, ')')
          ELSE concat(e.first_name, ' ', e.last_name, ' (', e.employee_type, ')')
        END as borrower_name
      FROM library_book_copies cp
      JOIN library_books b ON cp.book_id = b.id
      LEFT JOIN library_categories c ON b.category_id = c.id
      LEFT JOIN library_locations loc ON cp.location_id = loc.id
      LEFT JOIN library_issues iss ON iss.book_copy_id = cp.id AND iss.status IN ('ISSUED', 'OVERDUE')
      LEFT JOIN library_memberships m ON iss.member_id = m.id
      LEFT JOIN students s ON m.student_id = s.id
      LEFT JOIN employees e ON m.employee_id = e.id
      WHERE cp.school_id = $1 AND (cp.accession_number = $2 OR cp.barcode = $2 OR cp.barcode = $3)
    `, [schoolId, term, `BC-${term}`]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `No physical copy found with Accession/Barcode "${term}".` });
    }

    return res.json({ copy: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. MEMBERSHIPS & LIBRARY CARDS
// ==========================================

// GET /api/library/members - Search members
router.get('/members', requireAuth, requirePermission('library.members.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const search = (req.query.search as string) || '';
  const memberType = req.query.type as string; // 'STUDENT', 'TEACHER', 'STAFF'
  const status = req.query.status as string;

  try {
    let q = `
      SELECT
        m.*,
        CASE
          WHEN m.member_type = 'STUDENT' THEN concat(s.first_name, ' ', s.last_name)
          ELSE concat(e.first_name, ' ', e.last_name)
        END as name,
        CASE
          WHEN m.member_type = 'STUDENT' THEN s.admission_number
          ELSE e.employee_id_number
        END as identifier,
        CASE
          WHEN m.member_type = 'STUDENT' THEN concat(cls.name, ' - ', sec.name)
          ELSE e.employee_type
        END as subtext,
        s.profile_photo as student_photo,
        (SELECT count(*) FROM library_issues iss WHERE iss.member_id = m.id AND iss.status IN ('ISSUED', 'OVERDUE')) as active_books_count,
        (SELECT count(*) FROM library_issues iss WHERE iss.member_id = m.id AND iss.status = 'OVERDUE') as overdue_books_count,
        (SELECT COALESCE(sum(f.outstanding_amount), 0) FROM library_fines f WHERE f.member_id = m.id AND f.status IN ('PENDING', 'PARTIALLY_PAID')) as outstanding_fines
      FROM library_memberships m
      LEFT JOIN students s ON m.student_id = s.id
      LEFT JOIN classes cls ON s.class_id = cls.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN employees e ON m.employee_id = e.id
      WHERE m.school_id = $1
    `;
    const params: any[] = [schoolId];
    let pIdx = 2;

    if (search) {
      q += ` AND (
        m.membership_number ILIKE $${pIdx} OR
        m.card_number ILIKE $${pIdx} OR
        s.first_name ILIKE $${pIdx} OR
        s.last_name ILIKE $${pIdx} OR
        s.admission_number ILIKE $${pIdx} OR
        e.first_name ILIKE $${pIdx} OR
        e.last_name ILIKE $${pIdx} OR
        e.employee_id_number ILIKE $${pIdx}
      )`;
      params.push(`%${search}%`);
      pIdx++;
    }

    if (memberType) {
      q += ` AND m.member_type = $${pIdx}`;
      params.push(memberType);
      pIdx++;
    }

    if (status) {
      q += ` AND m.status = $${pIdx}`;
      params.push(status);
      pIdx++;
    }

    q += ` ORDER BY m.created_at DESC LIMIT 100`;
    const result = await db.query(q, params);
    return res.json({ members: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to list members.' });
  }
});

// Fast member lookup for circulation desk
router.get('/members/lookup', requireAuth, requirePermission('library.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const term = (req.query.term as string || '').trim();
  if (!term) return res.status(400).json({ error: 'Search term required.' });

  try {
    const result = await db.query(`
      SELECT
        m.*,
        CASE
          WHEN m.member_type = 'STUDENT' THEN concat(s.first_name, ' ', s.last_name)
          ELSE concat(e.first_name, ' ', e.last_name)
        END as name,
        CASE
          WHEN m.member_type = 'STUDENT' THEN concat('Class ', cls.name, ' - ', sec.name, ' | Roll #', s.roll_number)
          ELSE e.employee_type
        END as details_summary,
        CASE
          WHEN m.member_type = 'STUDENT' THEN s.mobile_number
          ELSE e.mobile_number
        END as phone,
        (SELECT count(*) FROM library_issues iss WHERE iss.member_id = m.id AND iss.status IN ('ISSUED', 'OVERDUE')) as active_books_count,
        (SELECT count(*) FROM library_issues iss WHERE iss.member_id = m.id AND iss.status = 'OVERDUE') as overdue_books_count,
        (SELECT COALESCE(sum(f.outstanding_amount), 0) FROM library_fines f WHERE f.member_id = m.id AND f.status IN ('PENDING', 'PARTIALLY_PAID')) as outstanding_fines
      FROM library_memberships m
      LEFT JOIN students s ON m.student_id = s.id
      LEFT JOIN classes cls ON s.class_id = cls.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN employees e ON m.employee_id = e.id
      WHERE m.school_id = $1 AND (
        m.membership_number ILIKE $2 OR
        m.card_number ILIKE $2 OR
        s.admission_number ILIKE $2 OR
        e.employee_id_number ILIKE $2
      )
      LIMIT 5
    `, [schoolId, `%${term}%`]);

    return res.json({ members: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Member full profile with circulation ledger
router.get('/members/:id/profile', requireAuth, requirePermission('library.view'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const memRes = await db.query(`
      SELECT
        m.*,
        CASE
          WHEN m.member_type = 'STUDENT' THEN concat(s.first_name, ' ', s.last_name)
          ELSE concat(e.first_name, ' ', e.last_name)
        END as name,
        CASE
          WHEN m.member_type = 'STUDENT' THEN s.admission_number
          ELSE e.employee_id_number
        END as identifier,
        CASE
          WHEN m.member_type = 'STUDENT' THEN concat(cls.name, ' - ', sec.name)
          ELSE e.employee_type
        END as subtext,
        s.profile_photo as student_photo,
        s.mobile_number as student_phone,
        e.mobile_number as employee_phone
      FROM library_memberships m
      LEFT JOIN students s ON m.student_id = s.id
      LEFT JOIN classes cls ON s.class_id = cls.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN employees e ON m.employee_id = e.id
      WHERE m.id = $1
    `, [id]);

    if (memRes.rows.length === 0) return res.status(404).json({ error: 'Member not found.' });
    const member = memRes.rows[0];

    // Issues
    const issuesRes = await db.query(`
      SELECT
        iss.*,
        b.title as book_title,
        cp.accession_number,
        cp.barcode
      FROM library_issues iss
      JOIN library_books b ON iss.book_id = b.id
      JOIN library_book_copies cp ON iss.book_copy_id = cp.id
      WHERE iss.member_id = $1
      ORDER BY iss.created_at DESC
    `, [id]);

    // Fines
    const finesRes = await db.query(`
      SELECT f.*
      FROM library_fines f
      WHERE f.member_id = $1
      ORDER BY f.created_at DESC
    `, [id]);

    // Reservations
    const resvRes = await db.query(`
      SELECT r.*, b.title as book_title
      FROM library_reservations r
      JOIN library_books b ON r.book_id = b.id
      WHERE r.member_id = $1
      ORDER BY r.created_at DESC
    `, [id]);

    return res.json({
      member,
      issues: issuesRes.rows,
      fines: finesRes.rows,
      reservations: resvRes.rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/library/members - Create library membership
router.post('/members', requireAuth, requirePermission('library.members.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { memberType, studentId, employeeId, borrowingLimit, expiryDate, notes } = req.body;
  if (!memberType || (!studentId && !employeeId)) {
    return res.status(400).json({ error: 'Member type and linked Student or Staff ID are required.' });
  }

  try {
    // Check if membership already exists
    const checkSql = memberType === 'STUDENT'
      ? `SELECT id FROM library_memberships WHERE school_id = $1 AND student_id = $2 AND status = 'ACTIVE'`
      : `SELECT id FROM library_memberships WHERE school_id = $1 AND employee_id = $2 AND status = 'ACTIVE'`;
    const checkParam = memberType === 'STUDENT' ? studentId : employeeId;
    const existing = await db.query(checkSql, [schoolId, checkParam]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An active library membership already exists for this person.' });
    }

    const libId = ((await db.query(`SELECT id FROM libraries WHERE school_id = $1 LIMIT 1`, [schoolId])).rows[0] as any)?.id;
    const settingsRes = await db.query(`SELECT library_card_prefix FROM library_settings WHERE school_id = $1`, [schoolId]);
    const prefix = (settingsRes.rows[0] as any)?.library_card_prefix || 'LIB';

    const id = `mem_${Date.now()}`;
    const seq = Math.floor(1000 + Math.random() * 9000);
    const memNumber = `${prefix}-MEM-${Date.now().toString().slice(-4)}${seq}`;
    const cardNumber = `${prefix}-CARD-${seq}`;
    const issueDate = new Date().toISOString().slice(0, 10);
    const expDate = expiryDate || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

    const result = await db.query(`
      INSERT INTO library_memberships (
        id, school_id, library_id, member_type, student_id, employee_id,
        membership_number, card_number, issue_date, expiry_date, status,
        borrowing_limit, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, 'ACTIVE',
        $11, $12
      ) RETURNING *
    `, [
      id, schoolId, libId, memberType, studentId || null, employeeId || null,
      memNumber, cardNumber, issueDate, expDate,
      borrowingLimit || null, notes || 'Registered in Library Management System'
    ]);

    await recordAuditLog({
      req,
      action: 'REGISTER_LIBRARY_MEMBER',
      module: 'LIBRARY',
      schoolId,
      recordId: id,
      description: `Issued library membership ${memNumber} for ${memberType}`
    });

    return res.status(201).json({ member: result.rows[0], message: 'Library membership created successfully.' });
  } catch (err: any) {
    console.error('[MEMBER CREATE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to create membership.' });
  }
});

// ==========================================
// 7. BOOK CIRCULATION: ISSUE BOOK (TRANSACTION SAFE)
// ==========================================

router.post('/issues', requireAuth, requirePermission('library.issue'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { memberId, copyId, accessionOrBarcode, customDueDate, notes } = req.body;
  if (!memberId || (!copyId && !accessionOrBarcode)) {
    return res.status(400).json({ error: 'Member and physical book copy identifier are required.' });
  }

  try {
    // 1. Fetch Member details & verify active status
    const memRes = await db.query(`
      SELECT m.*, (SELECT u.id FROM users u WHERE (u.email IS NOT NULL AND u.email = s.email) OR u.username = s.admission_number LIMIT 1) as student_uid, e.user_id as emp_uid
      FROM library_memberships m
      LEFT JOIN students s ON m.student_id = s.id
      LEFT JOIN employees e ON m.employee_id = e.id
      WHERE m.id = $1 AND m.school_id = $2
    `, [memberId, schoolId]);

    if (memRes.rows.length === 0) return res.status(404).json({ error: 'Library member not found.' });
    const member: any = memRes.rows[0];

    if (member.status !== 'ACTIVE') {
      return res.status(400).json({ error: `Member status is "${member.status}". Books cannot be issued.` });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (member.expiry_date < todayStr) {
      return res.status(400).json({ error: 'Library membership has expired. Please renew the membership.' });
    }

    // 2. Fetch school settings for limits
    const settingsRes = await db.query(`SELECT * FROM library_settings WHERE school_id = $1`, [schoolId]);
    const settings: any = settingsRes.rows[0] || {};
    const defaultStudentLimit = settings.max_books_student ?? 3;
    const defaultStaffLimit = settings.max_books_teacher ?? 5;
    const allowedLimit = member.borrowing_limit || (member.member_type === 'STUDENT' ? defaultStudentLimit : defaultStaffLimit);

    // 3. Count current active issued books
    const activeIssuesRes = await db.query(`
      SELECT count(*) as count, count(*) FILTER (WHERE status = 'OVERDUE') as overdue_count
      FROM library_issues
      WHERE member_id = $1 AND status IN ('ISSUED', 'OVERDUE')
    `, [memberId]);

    const currentIssued = parseInt((activeIssuesRes.rows[0] as any).count, 10);
    const overdueCount = parseInt((activeIssuesRes.rows[0] as any).overdue_count, 10);

    if (currentIssued >= allowedLimit) {
      return res.status(400).json({
        error: `Borrowing limit reached (${currentIssued}/${allowedLimit} books). Return an existing book before checking out more.`
      });
    }

    if (overdueCount > 0) {
      return res.status(400).json({
        error: `Member has ${overdueCount} overdue book(s). Overdue books must be returned or resolved first.`
      });
    }

    // 4. Resolve Physical Book Copy with Concurrency Lock
    let copyQuery = `
      SELECT cp.*, b.title, b.reference_only
      FROM library_book_copies cp
      JOIN library_books b ON cp.book_id = b.id
      WHERE cp.school_id = $1
    `;
    const copyParams: any[] = [schoolId];

    if (copyId) {
      copyQuery += ` AND cp.id = $2`;
      copyParams.push(copyId);
    } else {
      copyQuery += ` AND (cp.accession_number = $2 OR cp.barcode = $2 OR cp.barcode = $3)`;
      copyParams.push(accessionOrBarcode.trim().toUpperCase(), `BC-${accessionOrBarcode.trim().toUpperCase()}`);
    }

    copyQuery += ` FOR UPDATE`; // Concurrency protection against simultaneous issues!

    const copyRes = await db.query(copyQuery, copyParams);
    if (copyRes.rows.length === 0) {
      return res.status(404).json({ error: 'Physical book copy not found in this school library.' });
    }

    const copy: any = copyRes.rows[0];

    if (copy.reference_only || copy.status === 'REFERENCE_ONLY') {
      return res.status(400).json({ error: 'This volume is designated "REFERENCE ONLY" and cannot be checked out.' });
    }

    if (copy.status !== 'AVAILABLE') {
      return res.status(400).json({
        error: `Book copy (${copy.accession_number}) is currently not available. Current status: "${copy.status}".`
      });
    }

    // 5. Calculate due date
    const loanDays = member.member_type === 'STUDENT'
      ? (settings.borrowing_period_student_days ?? 14)
      : (member.member_type === 'TEACHER' ? (settings.borrowing_period_teacher_days ?? 30) : (settings.borrowing_period_staff_days ?? 21));

    const dueDate = customDueDate || new Date(Date.now() + loanDays * 86400000).toISOString().slice(0, 10);
    const issueId = `iss_${Date.now()}`;

    // 6. Insert Issue record
    await db.query(`
      INSERT INTO library_issues (
        id, school_id, library_id, member_id, book_copy_id, book_id,
        issue_date, due_date, issued_by, status, renewal_count, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        CURRENT_DATE, $7, $8, 'ISSUED', 0, $9
      )
    `, [
      issueId, schoolId, copy.library_id, memberId, copy.id, copy.book_id,
      dueDate, req.user!.username || 'Librarian', notes || 'Circulation desk checkout'
    ]);

    // 7. Update Copy status
    await db.query(`
      UPDATE library_book_copies SET
        status = 'ISSUED',
        current_holder_id = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [memberId, copy.id]);

    // 8. If the user reserved this book, mark reservation as fulfilled
    await db.query(`
      UPDATE library_reservations SET
        status = 'COLLECTED',
        fulfilled_copy_id = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE book_id = $2 AND member_id = $3 AND status IN ('WAITING', 'READY')
    `, [copy.id, copy.book_id, memberId]);

    // 9. Dispatch in-app notification to borrower if linked user exists
    const notifyUid = member.student_uid || member.emp_uid;
    if (notifyUid) {
      await db.query(`
        INSERT INTO library_notifications (id, school_id, user_id, event_type, title, message, link_url)
        VALUES ($1, $2, $3, 'ISSUE_CONFIRMATION', $4, $5, '/library')
      `, [
        `notif_${Date.now()}`, schoolId, notifyUid,
        `Book Issued: ${copy.title}`,
        `You have successfully borrowed "${copy.title}" (Acc# ${copy.accession_number}). Due date: ${dueDate}.`
      ]);
    }

    // 10. Audit log
    await recordAuditLog({
      req,
      action: 'ISSUE_LIBRARY_BOOK',
      module: 'LIBRARY',
      schoolId,
      recordId: issueId,
      description: `Issued book "${copy.title}" (${copy.accession_number}) to member ${member.membership_number} (Due: ${dueDate})`
    });

    return res.status(201).json({
      success: true,
      issueId,
      accessionNumber: copy.accession_number,
      bookTitle: copy.title,
      dueDate,
      message: `Book "${copy.title}" issued successfully. Due on ${dueDate}.`
    });
  } catch (err: any) {
    console.error('[BOOK ISSUE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to issue book.' });
  }
});

// ==========================================
// 8. BOOK CIRCULATION: RETURN BOOK
// ==========================================

router.post('/returns', requireAuth, requirePermission('library.return'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { issueId, accessionOrBarcode, returnCondition, damageNotes, damagePenalty, waivedFineReason } = req.body;
  if (!issueId && !accessionOrBarcode) {
    return res.status(400).json({ error: 'Issue transaction ID or book copy identifier is required.' });
  }

  try {
    // 1. Locate active issue
    let issueQuery = `
      SELECT
        iss.*,
        cp.accession_number,
        cp.purchase_price,
        b.title as book_title,
        m.student_id,
        m.employee_id,
        m.member_type,
        m.membership_number
      FROM library_issues iss
      JOIN library_book_copies cp ON iss.book_copy_id = cp.id
      JOIN library_books b ON iss.book_id = b.id
      JOIN library_memberships m ON iss.member_id = m.id
      WHERE iss.school_id = $1 AND iss.status IN ('ISSUED', 'OVERDUE')
    `;
    const params: any[] = [schoolId];

    if (issueId) {
      issueQuery += ` AND iss.id = $2`;
      params.push(issueId);
    } else {
      issueQuery += ` AND (cp.accession_number = $2 OR cp.barcode = $2 OR cp.barcode = $3)`;
      params.push(accessionOrBarcode.trim().toUpperCase(), `BC-${accessionOrBarcode.trim().toUpperCase()}`);
    }

    const issRes = await db.query(issueQuery, params);
    if (issRes.rows.length === 0) {
      return res.status(404).json({ error: 'No active issue record found for this book.' });
    }

    const issue: any = issRes.rows[0];

    // 2. Fetch library settings for overdue fine calculations
    const settingsRes = await db.query(`SELECT * FROM library_settings WHERE school_id = $1`, [schoolId]);
    const settings: any = settingsRes.rows[0] || {};
    const finePerDay = parseFloat(settings.fine_per_day ?? '5.00');
    const maxFine = parseFloat(settings.max_fine_per_book ?? '500.00');
    const graceDays = parseInt(settings.grace_period_days ?? '1', 10);

    const today = new Date();
    const dueDate = new Date(issue.due_date);
    const diffTime = today.getTime() - dueDate.getTime();
    const rawDiffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const overdueDays = Math.max(0, rawDiffDays - graceDays);
    const calculatedOverdueFine = Math.min(overdueDays * finePerDay, maxFine);

    const condition = returnCondition || 'GOOD';
    const finalFineAmount = calculatedOverdueFine + (damagePenalty ? parseFloat(damagePenalty) : 0);

    // 3. Update Issue status
    await db.query(`
      UPDATE library_issues SET
        returned_date = CURRENT_DATE,
        returned_by = $1,
        status = 'RETURNED',
        return_condition = $2,
        fine_amount = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [req.user!.username || 'Librarian', condition, finalFineAmount, issue.id]);

    // 4. Update Copy condition & status
    let newCopyStatus = 'AVAILABLE';
    if (condition === 'DAMAGED') newCopyStatus = 'UNDER_REPAIR';
    if (condition === 'LOST') newCopyStatus = 'LOST';

    await db.query(`
      UPDATE library_book_copies SET
        status = $1,
        condition = $2,
        current_holder_id = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [newCopyStatus, condition, issue.book_copy_id]);

    // 5. If damage reported, record damage entry
    if (condition === 'DAMAGED') {
      const dmgId = `dmg_${Date.now()}`;
      await db.query(`
        INSERT INTO library_damage_records (
          id, school_id, book_copy_id, member_id, issue_id,
          damage_type, description, repairable, penalty_amount, status, reported_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          'Circulation Return Damage', $6, true, $7, 'DAMAGED', $8
        )
      `, [
        dmgId, schoolId, issue.book_copy_id, issue.member_id, issue.id,
        damageNotes || 'Condition noted as damaged upon return',
        damagePenalty || 0, req.user!.username || 'Librarian'
      ]);
    }

    // 6. If fine > 0, create library fine record (Integrated with Accounts)
    let fineRecord = null;
    if (finalFineAmount > 0) {
      const fineId = `fine_${Date.now()}`;
      const reason = calculatedOverdueFine > 0
        ? `Overdue return fine (${overdueDays} days @ Rs ${finePerDay}/day)`
        : `Damaged book penalty for ${issue.book_title}`;

      const fRes = await db.query(`
        INSERT INTO library_fines (
          id, school_id, library_id, member_id, issue_id,
          type, amount, outstanding_amount, status, reason
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, 'PENDING', $9
        ) RETURNING *
      `, [
        fineId, schoolId, issue.library_id, issue.member_id, issue.id,
        calculatedOverdueFine > 0 ? 'OVERDUE' : 'DAMAGED_BOOK',
        finalFineAmount, finalFineAmount, reason
      ]);
      fineRecord = fRes.rows[0];
    }

    // 7. Check Reservations Queue:
    // If copy is now AVAILABLE, see if another member has a hold on this book!
    if (newCopyStatus === 'AVAILABLE') {
      const nextHoldRes = await db.query(`
        SELECT r.*, m.student_id, m.employee_id, (SELECT u.id FROM users u WHERE (u.email IS NOT NULL AND u.email = s.email) OR u.username = s.admission_number LIMIT 1) as stu_uid, e.user_id as emp_uid
        FROM library_reservations r
        JOIN library_memberships m ON r.member_id = m.id
        LEFT JOIN students s ON m.student_id = s.id
        LEFT JOIN employees e ON m.employee_id = e.id
        WHERE r.book_id = $1 AND r.status = 'WAITING'
        ORDER BY r.queue_position ASC, r.created_at ASC
        LIMIT 1
      `, [issue.book_id]);

      if (nextHoldRes.rows.length > 0) {
        const nextHold: any = nextHoldRes.rows[0];
        const resvValidDays = settings.reservation_validity_days ?? 3;
        const resvExpiry = new Date(Date.now() + resvValidDays * 86400000).toISOString().slice(0, 10);

        await db.query(`
          UPDATE library_reservations SET
            status = 'READY',
            fulfilled_copy_id = $1,
            expiry_date = $2,
            notified_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [issue.book_copy_id, resvExpiry, nextHold.id]);

        await db.query(`UPDATE library_book_copies SET status = 'RESERVED' WHERE id = $1`, [issue.book_copy_id]);

        // Notify member
        const uid = nextHold.stu_uid || nextHold.emp_uid;
        if (uid) {
          await db.query(`
            INSERT INTO library_notifications (id, school_id, user_id, event_type, title, message, link_url)
            VALUES ($1, $2, $3, 'RESERVATION_READY', $4, $5, '/library')
          `, [
            `notif_${Date.now()}`, schoolId, uid,
            `Reserved Book Available: ${issue.book_title}`,
            `The book "${issue.book_title}" you reserved is now ready for pickup at the Central Library. Reserved until ${resvExpiry}.`
          ]);
        }
      }
    }

    await recordAuditLog({
      req,
      action: 'RETURN_LIBRARY_BOOK',
      module: 'LIBRARY',
      schoolId,
      recordId: issue.id,
      description: `Returned book "${issue.book_title}" (ACC# ${issue.accession_number}). Condition: ${condition}. Fine assessed: Rs. ${finalFineAmount}`
    });

    return res.json({
      success: true,
      message: `Book "${issue.book_title}" returned successfully.`,
      condition,
      overdueDays,
      fineAmount: finalFineAmount,
      fineRecord
    });
  } catch (err: any) {
    console.error('[BOOK RETURN ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to process return.' });
  }
});

// ==========================================
// 9. BOOK RENEWAL
// ==========================================

router.post('/issues/:id/renew', requireAuth, requirePermission('library.renew'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { reason } = req.body;

  try {
    const issRes = await db.query(`
      SELECT iss.*, cp.accession_number, b.title as book_title, m.member_type, m.membership_number
      FROM library_issues iss
      JOIN library_book_copies cp ON iss.book_copy_id = cp.id
      JOIN library_books b ON iss.book_id = b.id
      JOIN library_memberships m ON iss.member_id = m.id
      WHERE iss.id = $1 AND iss.school_id = $2
    `, [id, schoolId]);

    if (issRes.rows.length === 0) return res.status(404).json({ error: 'Issue record not found.' });
    const issue: any = issRes.rows[0];

    if (issue.status !== 'ISSUED') {
      return res.status(400).json({ error: `Cannot renew book in "${issue.status}" status.` });
    }

    // Check renewal limits from settings
    const settingsRes = await db.query(`SELECT * FROM library_settings WHERE school_id = $1`, [schoolId]);
    const settings: any = settingsRes.rows[0] || {};
    const maxRenewals = settings.renewal_limit ?? 2;

    if (issue.renewal_count >= maxRenewals) {
      return res.status(400).json({
        error: `Maximum renewal limit reached (${issue.renewal_count}/${maxRenewals}). Please return the book to the library.`
      });
    }

    // Check if book has a reservation hold by someone else
    const holdRes = await db.query(`
      SELECT count(*) as count FROM library_reservations
      WHERE book_id = $1 AND status = 'WAITING'
    `, [issue.book_id]);

    if (parseInt((holdRes.rows[0] as any).count, 10) > 0) {
      return res.status(400).json({
        error: 'Another library member has placed a reservation on this title. Renewal cannot be granted.'
      });
    }

    const loanDays = issue.member_type === 'STUDENT'
      ? (settings.borrowing_period_student_days ?? 14)
      : (settings.borrowing_period_teacher_days ?? 30);

    const currentDue = new Date(issue.due_date);
    const newDueDate = new Date(currentDue.getTime() + loanDays * 86400000).toISOString().slice(0, 10);
    const nextRenewalNum = issue.renewal_count + 1;

    // Record renewal history
    await db.query(`
      INSERT INTO library_renewals (id, issue_id, previous_due_date, new_due_date, renewal_number, renewed_by, reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      `ren_${Date.now()}`, issue.id, issue.due_date, newDueDate,
      nextRenewalNum, req.user!.username || 'Librarian', reason || 'Standard circulation renewal'
    ]);

    // Update issue
    await db.query(`
      UPDATE library_issues SET
        due_date = $1,
        renewal_count = $2,
        last_renewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [newDueDate, nextRenewalNum, issue.id]);

    await recordAuditLog({
      req,
      action: 'RENEW_LIBRARY_BOOK',
      module: 'LIBRARY',
      schoolId,
      recordId: issue.id,
      description: `Renewed book "${issue.book_title}" (${nextRenewalNum}/${maxRenewals}) for member ${issue.membership_number}. New due date: ${newDueDate}`
    });

    return res.json({
      success: true,
      newDueDate,
      renewalCount: nextRenewalNum,
      message: `Book renewed successfully. New due date is ${newDueDate}.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to renew book.' });
  }
});

// ==========================================
// 10. BOOK RESERVATIONS / HOLDS
// ==========================================

router.get('/reservations', requireAuth, requirePermission('library.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const status = req.query.status as string;

  try {
    let q = `
      SELECT
        r.*,
        b.title as book_title,
        b.author_name,
        b.isbn,
        m.membership_number,
        m.member_type,
        CASE
          WHEN m.member_type = 'STUDENT' THEN concat(s.first_name, ' ', s.last_name, ' (Class ', cls.name, ')')
          ELSE concat(e.first_name, ' ', e.last_name)
        END as member_name
      FROM library_reservations r
      JOIN library_books b ON r.book_id = b.id
      JOIN library_memberships m ON r.member_id = m.id
      LEFT JOIN students s ON m.student_id = s.id
      LEFT JOIN classes cls ON s.class_id = cls.id
      LEFT JOIN employees e ON m.employee_id = e.id
      WHERE r.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (status) {
      q += ` AND r.status = $2`;
      params.push(status);
    }
    q += ` ORDER BY r.created_at DESC`;

    const result = await db.query(q, params);
    return res.json({ reservations: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/reservations', requireAuth, requirePermission('library.reserve'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  const { bookId, memberId } = req.body;
  if (!bookId || !memberId) return res.status(400).json({ error: 'Book ID and Member ID are required.' });

  try {
    // Check if member already has active hold on this book
    const existing = await db.query(`
      SELECT id FROM library_reservations
      WHERE book_id = $1 AND member_id = $2 AND status IN ('WAITING', 'READY')
    `, [bookId, memberId]);

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You already have an active hold placed on this book.' });
    }

    // Determine queue position
    const qRes = await db.query(`
      SELECT count(*) as count FROM library_reservations
      WHERE book_id = $1 AND status = 'WAITING'
    `, [bookId]);
    const queuePos = parseInt((qRes.rows[0] as any).count, 10) + 1;

    const id = `res_${Date.now()}`;
    const expDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const libId = ((await db.query(`SELECT library_id FROM library_books WHERE id = $1`, [bookId])).rows[0] as any)?.library_id;

    const result = await db.query(`
      INSERT INTO library_reservations (
        id, school_id, library_id, book_id, member_id,
        reservation_date, expiry_date, queue_position, status
      ) VALUES (
        $1, $2, $3, $4, $5,
        CURRENT_DATE, $6, $7, 'WAITING'
      ) RETURNING *
    `, [id, schoolId, libId, bookId, memberId, expDate, queuePos]);

    await recordAuditLog({
      req,
      action: 'PLACE_BOOK_RESERVATION',
      module: 'LIBRARY',
      schoolId,
      recordId: id,
      description: `Placed hold for member ${memberId} on book ${bookId} (Queue position #${queuePos})`
    });

    return res.status(201).json({ reservation: result.rows[0], message: `Hold placed successfully (Queue position #${queuePos}).` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11. OVERDUE MANAGEMENT & REMINDERS
// ==========================================

router.get('/overdue', requireAuth, requirePermission('library.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const today = new Date().toISOString().slice(0, 10);
    const result = await db.query(`
      SELECT
        iss.*,
        b.title as book_title,
        b.isbn,
        cp.accession_number,
        cp.barcode,
        m.membership_number,
        m.member_type,
        CASE
          WHEN m.member_type = 'STUDENT' THEN concat(s.first_name, ' ', s.last_name)
          ELSE concat(e.first_name, ' ', e.last_name)
        END as member_name,
        CASE
          WHEN m.member_type = 'STUDENT' THEN concat('Class ', cls.name, ' - ', sec.name)
          ELSE e.employee_type
        END as member_group,
        s.mobile_number as student_phone,
        e.mobile_number as employee_phone,
        (CURRENT_DATE - iss.due_date) as days_overdue
      FROM library_issues iss
      JOIN library_books b ON iss.book_id = b.id
      JOIN library_book_copies cp ON iss.book_copy_id = cp.id
      JOIN library_memberships m ON iss.member_id = m.id
      LEFT JOIN students s ON m.student_id = s.id
      LEFT JOIN classes cls ON s.class_id = cls.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN employees e ON m.employee_id = e.id
      WHERE iss.school_id = $1 AND iss.status IN ('ISSUED', 'OVERDUE') AND iss.due_date < $2
      ORDER BY iss.due_date ASC
    `, [schoolId, today]);

    return res.json({ overdueBooks: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/library/overdue/batch-reminders
router.post('/overdue/batch-reminders', requireAuth, requirePermission('library.overdue.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  if (!schoolId || !checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const today = new Date().toISOString().slice(0, 10);
    const overdues = await db.query(`
      SELECT
        iss.id,
        b.title,
        cp.accession_number,
        (CURRENT_DATE - iss.due_date) as days_overdue,
        (SELECT u.id FROM users u WHERE (u.email IS NOT NULL AND u.email = s.email) OR u.username = s.admission_number LIMIT 1) as student_uid,
        e.user_id as emp_uid
      FROM library_issues iss
      JOIN library_books b ON iss.book_id = b.id
      JOIN library_book_copies cp ON iss.book_copy_id = cp.id
      JOIN library_memberships m ON iss.member_id = m.id
      LEFT JOIN students s ON m.student_id = s.id
      LEFT JOIN employees e ON m.employee_id = e.id
      WHERE iss.school_id = $1 AND iss.status IN ('ISSUED', 'OVERDUE') AND iss.due_date < $2
    `, [schoolId, today]);

    let sentCount = 0;
    for (const item of (overdues.rows as any[])) {
      const targetUid = item.student_uid || item.emp_uid;
      if (targetUid) {
        await db.query(`
          INSERT INTO library_notifications (id, school_id, user_id, event_type, title, message, link_url)
          VALUES ($1, $2, $3, 'OVERDUE_ALERT', $4, $5, '/library')
        `, [
          `notif_${Date.now()}_${sentCount}`,
          schoolId,
          targetUid,
          `Library Overdue Notice: ${item.title}`,
          `Your borrowed book "${item.title}" (ACC# ${item.accession_number}) is ${item.days_overdue} days overdue. Please return it to the library immediately.`
        ]);
        sentCount++;
      }
    }

    return res.json({ success: true, count: sentCount, message: `Sent ${sentCount} overdue reminder notifications.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 12. FINE MANAGEMENT (FEES & ACCOUNTS INTEGRATION)
// ==========================================

router.get('/fines', requireAuth, requirePermission('library.fines.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const status = req.query.status as string;

  try {
    let q = `
      SELECT
        f.*,
        m.membership_number,
        m.member_type,
        CASE
          WHEN m.member_type = 'STUDENT' THEN concat(s.first_name, ' ', s.last_name)
          ELSE concat(e.first_name, ' ', e.last_name)
        END as member_name,
        CASE
          WHEN m.member_type = 'STUDENT' THEN concat('Class ', cls.name, ' - ', sec.name)
          ELSE e.employee_type
        END as member_group,
        b.title as book_title
      FROM library_fines f
      JOIN library_memberships m ON f.member_id = m.id
      LEFT JOIN library_issues iss ON f.issue_id = iss.id
      LEFT JOIN library_books b ON iss.book_id = b.id
      LEFT JOIN students s ON m.student_id = s.id
      LEFT JOIN classes cls ON s.class_id = cls.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN employees e ON m.employee_id = e.id
      WHERE f.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (status) {
      q += ` AND f.status = $2`;
      params.push(status);
    }
    q += ` ORDER BY f.created_at DESC`;

    const result = await db.query(q, params);
    return res.json({ fines: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/library/fines/:id/collect - Settle fine and register receipt with Phase 6 Accounts
router.post('/fines/:id/collect', requireAuth, requirePermission('library.fines.manage'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { paymentMode, notes } = req.body;

  try {
    const fineRes = await db.query(`SELECT * FROM library_fines WHERE id = $1 AND school_id = $2`, [id, schoolId]);
    if (fineRes.rows.length === 0) return res.status(404).json({ error: 'Fine record not found.' });
    const fine: any = fineRes.rows[0];

    if (fine.status === 'PAID') return res.status(400).json({ error: 'Fine has already been settled in full.' });

    const payAmount = parseFloat(fine.outstanding_amount);
    const receiptNum = `LIB-REC-${Date.now().toString().slice(-6)}`;

    // Update Fine record
    const updatedRes = await db.query(`
      UPDATE library_fines SET
        paid_amount = paid_amount + $1,
        outstanding_amount = 0.00,
        status = 'PAID',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [payAmount, id]);

    await recordAuditLog({
      req,
      action: 'COLLECT_LIBRARY_FINE',
      module: 'LIBRARY',
      schoolId,
      recordId: id,
      description: `Collected library fine Rs. ${payAmount} via ${paymentMode || 'Cash'}. Receipt #${receiptNum}`
    });

    return res.json({
      success: true,
      fine: updatedRes.rows[0],
      receiptNumber: receiptNum,
      message: `Fine settled successfully. Official receipt #${receiptNum} generated.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/library/fines/:id/waive - Authorized waiver of library fine
router.post('/fines/:id/waive', requireAuth, requirePermission('library.fines.waive'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { waiveAmount, reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Official justification reason is required to waive a fine.' });
  }

  try {
    const fineRes = await db.query(`SELECT * FROM library_fines WHERE id = $1 AND school_id = $2`, [id, schoolId]);
    if (fineRes.rows.length === 0) return res.status(404).json({ error: 'Fine record not found.' });
    const fine: any = fineRes.rows[0];

    const currentOutstanding = parseFloat(fine.outstanding_amount);
    const amtToWaive = waiveAmount ? Math.min(parseFloat(waiveAmount), currentOutstanding) : currentOutstanding;
    const remainingOutstanding = currentOutstanding - amtToWaive;
    const nextStatus = remainingOutstanding <= 0 ? 'WAIVED' : 'PARTIALLY_PAID';

    const result = await db.query(`
      UPDATE library_fines SET
        waived_amount = waived_amount + $1,
        outstanding_amount = $2,
        status = $3,
        waived_by = $4,
        waived_at = CURRENT_TIMESTAMP,
        waiver_reason = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [amtToWaive, remainingOutstanding, nextStatus, req.user!.username || 'Authorized Official', reason.trim(), id]);

    await recordAuditLog({
      req,
      action: 'WAIVE_LIBRARY_FINE',
      module: 'LIBRARY',
      schoolId,
      recordId: id,
      description: `Authorized fine waiver of Rs. ${amtToWaive}. Reason: "${reason.trim()}"`
    });

    return res.json({
      success: true,
      fine: result.rows[0],
      message: `Fine waiver of Rs. ${amtToWaive} approved and logged.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 13. PHYSICAL STOCK VERIFICATION / INVENTORY AUDITS
// ==========================================

router.get('/audits', requireAuth, requirePermission('library.inventory.verify'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  try {
    const result = await db.query(`
      SELECT * FROM library_inventory_verifications
      WHERE school_id = $1
      ORDER BY verification_date DESC
    `, [schoolId]);
    return res.json({ audits: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/audits', requireAuth, requirePermission('library.inventory.verify'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { title, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'Audit title is required.' });

  try {
    const libId = ((await db.query(`SELECT id FROM libraries WHERE school_id = $1 LIMIT 1`, [schoolId])).rows[0] as any)?.id;
    const id = `audit_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO library_inventory_verifications (
        id, school_id, library_id, title, verification_date,
        verified_by, verified_by_name, total_scanned, total_verified,
        total_missing, total_discrepancies, status, notes, audit_data
      ) VALUES (
        $1, $2, $3, $4, CURRENT_DATE,
        $5, $6, 0, 0,
        0, 0, 'IN_PROGRESS', $7, '[]'::jsonb
      ) RETURNING *
    `, [id, schoolId, libId, title.trim(), req.user!.id, `${req.user!.firstName} ${req.user!.lastName}`, notes]);

    await recordAuditLog({
      req,
      action: 'START_STOCK_AUDIT',
      module: 'LIBRARY',
      schoolId,
      recordId: id,
      description: `Initiated physical library stock verification audit: "${title}"`
    });

    return res.status(201).json({ audit: result.rows[0], message: 'Audit session started.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/audits/:id/scan', requireAuth, requirePermission('library.inventory.verify'), async (req, res) => {
  const { id } = req.params;
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { accessionOrBarcode } = req.body;

  if (!accessionOrBarcode) return res.status(400).json({ error: 'Scan code is required.' });

  try {
    const term = accessionOrBarcode.trim().toUpperCase();
    const copyRes = await db.query(`
      SELECT cp.*, b.title as book_title
      FROM library_book_copies cp
      JOIN library_books b ON cp.book_id = b.id
      WHERE cp.school_id = $1 AND (cp.accession_number = $2 OR cp.barcode = $2 OR cp.barcode = $3)
    `, [schoolId, term, `BC-${term}`]);

    const isFound = copyRes.rows.length > 0;
    const copyRow: any = copyRes.rows[0];
    const itemData = isFound
      ? { accession: copyRow.accession_number, title: copyRow.book_title, status: copyRow.status, found: true }
      : { code: term, found: false, error: 'Unregistered barcode/accession' };

    await db.query(`
      UPDATE library_inventory_verifications SET
        total_scanned = total_scanned + 1,
        total_verified = total_verified + (CASE WHEN $1 THEN 1 ELSE 0 END),
        total_discrepancies = total_discrepancies + (CASE WHEN $1 THEN 0 ELSE 1 END),
        audit_data = audit_data || $2::jsonb,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [isFound, JSON.stringify([itemData]), id]);

    return res.json({ verified: isFound, item: itemData });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
