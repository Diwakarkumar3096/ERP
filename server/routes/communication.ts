import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requirePermission, checkSchoolScope } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// ==========================================
// 1. DASHBOARD & DELIVERY KPI OVERVIEW
// ==========================================
router.get('/dashboard', requireAuth, async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  if (!checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const [
      announcementsCount,
      circularsCount,
      noticesCount,
      conversationsCount,
      messagesTodayCount,
      scheduledCount,
      unreadNotifsCount,
      openFeedbackCount,
      openGrievancesCount,
      recentAnnouncements,
      recentConversations
    ]: any[] = await Promise.all([
      db.query(`SELECT count(*) as cnt FROM announcements WHERE school_id = $1 AND status = 'PUBLISHED'`, [schoolId]),
      db.query(`SELECT count(*) as cnt FROM circulars WHERE school_id = $1 AND status = 'PUBLISHED'`, [schoolId]),
      db.query(`SELECT count(*) as cnt FROM notice_board WHERE school_id = $1`, [schoolId]),
      db.query(`
        SELECT count(DISTINCT c.id) as cnt 
        FROM conversations c 
        JOIN conversation_participants cp ON c.id = cp.conversation_id 
        WHERE c.school_id = $1 AND (cp.user_id = $2 OR $3 = 'super_admin' OR $3 = 'principal')
      `, [schoolId, req.user!.id, req.user!.roleName]),
      db.query(`SELECT count(*) as cnt FROM communication_messages WHERE created_at >= CURRENT_DATE`),
      db.query(`SELECT count(*) as cnt FROM scheduled_messages WHERE school_id = $1 AND status = 'SCHEDULED'`, [schoolId]),
      db.query(`SELECT count(*) as cnt FROM notifications WHERE school_id = $1 AND user_id = $2 AND is_read = false`, [schoolId, req.user!.id]),
      db.query(`SELECT count(*) as cnt FROM feedback_submissions WHERE school_id = $1 AND status != 'RESOLVED' AND status != 'CLOSED'`, [schoolId]),
      db.query(`SELECT count(*) as cnt FROM grievances WHERE school_id = $1 AND status != 'RESOLVED' AND status != 'CLOSED'`, [schoolId]),
      db.query(`
        SELECT * FROM announcements 
        WHERE school_id = $1 AND status = 'PUBLISHED' 
        ORDER BY is_emergency DESC, publish_date DESC 
        LIMIT 5
      `, [schoolId]),
      db.query(`
        SELECT c.*,
          (SELECT message FROM communication_messages cm WHERE cm.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT count(*) FROM communication_messages cm WHERE cm.conversation_id = c.id) as total_messages
        FROM conversations c
        JOIN conversation_participants cp ON c.id = cp.conversation_id
        WHERE c.school_id = $1 AND (cp.user_id = $2 OR $3 = 'super_admin' OR $3 = 'principal')
        GROUP BY c.id
        ORDER BY c.last_message_at DESC
        LIMIT 5
      `, [schoolId, req.user!.id, req.user!.roleName])
    ]);

    return res.json({
      metrics: {
        activeAnnouncements: Number(announcementsCount.rows[0]?.cnt || 0),
        activeCirculars: Number(circularsCount.rows[0]?.cnt || 0),
        activeNotices: Number(noticesCount.rows[0]?.cnt || 0),
        activeConversations: Number(conversationsCount.rows[0]?.cnt || 0),
        messagesToday: Number(messagesTodayCount.rows[0]?.cnt || 0),
        scheduledMessages: Number(scheduledCount.rows[0]?.cnt || 0),
        unreadNotifications: Number(unreadNotifsCount.rows[0]?.cnt || 0),
        openFeedback: Number(openFeedbackCount.rows[0]?.cnt || 0),
        openGrievances: Number(openGrievancesCount.rows[0]?.cnt || 0)
      },
      recentAnnouncements: recentAnnouncements.rows,
      recentConversations: recentConversations.rows
    });
  } catch (err: any) {
    console.error('[COMMUNICATION DASHBOARD ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to load communication dashboard.' });
  }
});

// ==========================================
// 2. CENTRALIZED IN-APP NOTIFICATIONS
// ==========================================
router.get('/notifications', requireAuth, async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  const category = req.query.category as string;
  const unreadOnly = req.query.unreadOnly === 'true';

  try {
    let query = `
      SELECT * FROM notifications
      WHERE user_id = $1 AND school_id = $2
    `;
    const params: any[] = [req.user!.id, schoolId];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (unreadOnly) {
      query += ` AND is_read = false`;
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const result: any = await db.query(query, params);
    const unreadRes: any = await db.query(`SELECT count(*) as unread FROM notifications WHERE user_id = $1 AND is_read = false`, [req.user!.id]);

    return res.json({
      notifications: result.rows,
      unreadCount: Number(unreadRes.rows[0]?.unread || 0)
    });
  } catch (err: any) {
    console.error('[GET NOTIFICATIONS ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to load notifications.' });
  }
});

router.get('/notifications/unread-count', requireAuth, async (req, res) => {
  try {
    const unreadRes: any = await db.query(`SELECT count(*) as unread FROM notifications WHERE user_id = $1 AND is_read = false`, [req.user!.id]);
    return res.json({ unreadCount: Number(unreadRes.rows[0]?.unread || 0) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to get unread count.' });
  }
});

router.patch('/notifications/:id/read', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`
      UPDATE notifications
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
    `, [id, req.user!.id]);

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to mark notification as read.' });
  }
});

router.post('/notifications/mark-all-read', requireAuth, async (req, res) => {
  try {
    await db.query(`
      UPDATE notifications
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND is_read = false
    `, [req.user!.id]);

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to mark notifications read.' });
  }
});

// Create notification (used internally or by admins)
router.post('/notifications', requireAuth, async (req, res) => {
  const {
    schoolId,
    targetUserId,
    title,
    message,
    category,
    priority,
    relatedModule,
    relatedEntityId,
    actionLink,
    idempotencyKey
  } = req.body;

  const targetSchoolId = schoolId || req.user!.schoolId || 'sch_vvps';
  if (!checkSchoolScope(req, targetSchoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required.' });
  }

  try {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const recipient = targetUserId || req.user!.id;

    await db.query(`
      INSERT INTO notifications (
        id, school_id, user_id, title, message, category, priority,
        related_module, related_entity_id, action_link, is_read
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)
    `, [
      notifId,
      targetSchoolId,
      recipient,
      title.trim(),
      message.trim(),
      category || 'General',
      priority || 'NORMAL',
      relatedModule || null,
      relatedEntityId || null,
      actionLink || null
    ]);

    // Also record into notification_queue for audit trail
    if (idempotencyKey) {
      await db.query(`
        INSERT INTO notification_queue (
          id, school_id, channel, recipient_user_id, payload, priority, idempotency_key, status
        ) VALUES ($1, $2, 'IN_APP', $3, $4, $5, $6, 'SENT')
        ON CONFLICT (idempotency_key) DO NOTHING
      `, [
        `nq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        targetSchoolId,
        recipient,
        JSON.stringify({ title, message, category, actionLink }),
        priority || 'NORMAL',
        idempotencyKey
      ]);
    }

    return res.status(201).json({ success: true, id: notifId, message: 'Notification created successfully.' });
  } catch (err: any) {
    console.error('[CREATE NOTIFICATION ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to create notification.' });
  }
});

// ==========================================
// 3. ANNOUNCEMENTS MANAGEMENT
// ==========================================
router.get('/announcements', requireAuth, async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  const audience = req.query.audience as string;
  const status = req.query.status as string;

  if (!checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    let query = `
      SELECT a.*, c.name as class_name, s.name as session_name,
        (SELECT count(*) FROM acknowledgements ack WHERE ack.entity_type = 'ANNOUNCEMENT' AND ack.entity_id = a.id) as acknowledgement_count
      FROM announcements a
      LEFT JOIN classes c ON a.target_class_id = c.id
      LEFT JOIN academic_sessions s ON a.session_id = s.id
      WHERE a.school_id = $1
    `;
    const params: any[] = [schoolId];

    if (audience && audience !== 'ALL') {
      params.push(audience);
      query += ` AND (a.audience_type = $${params.length} OR a.audience_type = 'ALL')`;
    }
    if (status) {
      params.push(status);
      query += ` AND a.status = $${params.length}`;
    }

    query += ` ORDER BY a.is_emergency DESC, a.publish_date DESC`;

    const result: any = await db.query(query, params);
    return res.json({ announcements: result.rows });
  } catch (err: any) {
    console.error('[LIST ANNOUNCEMENTS ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to list announcements.' });
  }
});

router.post('/announcements', requireAuth, requirePermission('communication.announcements.manage'), async (req, res) => {
  const {
    schoolId,
    sessionId,
    title,
    description,
    audienceType,
    targetClassId,
    targetSectionId,
    targetDepartment,
    priority,
    status,
    publishDate,
    expiryDate,
    attachmentUrl,
    attachmentName,
    requiresAcknowledgement,
    isEmergency
  } = req.body;

  const targetSchoolId = schoolId || req.user!.schoolId || 'sch_vvps';
  if (!checkSchoolScope(req, targetSchoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }

  // Stricter permission for emergency broadcasts
  if (isEmergency && !req.user!.permissions.includes('communication.emergency.broadcast') && req.user!.roleName !== 'super_admin' && req.user!.roleName !== 'principal') {
    return res.status(403).json({ error: 'Special authorization required for emergency broadcasts.' });
  }

  try {
    const id = `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(`
      INSERT INTO announcements (
        id, school_id, session_id, title, description, audience_type,
        target_class_id, target_section_id, target_department,
        priority, status, publish_date, expiry_date,
        attachment_url, attachment_name, requires_acknowledgement, is_emergency,
        author_id, author_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    `, [
      id,
      targetSchoolId,
      sessionId || null,
      title.trim(),
      description.trim(),
      audienceType || 'ALL',
      targetClassId || null,
      targetSectionId || null,
      targetDepartment || null,
      isEmergency ? 'EMERGENCY' : (priority || 'NORMAL'),
      status || 'PUBLISHED',
      publishDate || new Date().toISOString(),
      expiryDate || null,
      attachmentUrl || null,
      attachmentName || null,
      requiresAcknowledgement === true,
      isEmergency === true,
      req.user!.id,
      `${req.user!.firstName} ${req.user!.lastName}`.trim()
    ]);

    // If emergency, generate immediate notification for all users in school
    if (isEmergency) {
      const usersRes: any = await db.query(`SELECT id FROM users WHERE (school_id = $1 OR school_id IS NULL) AND status = 'active'`, [targetSchoolId]);
      for (const u of usersRes.rows as any[]) {
        const nId = `notif_emg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await db.query(`
          INSERT INTO notifications (id, school_id, user_id, title, message, category, priority, related_module, action_link)
          VALUES ($1, $2, $3, $4, $5, 'Emergency', 'EMERGENCY', 'communication', '/communication')
        `, [nId, targetSchoolId, u.id, `EMERGENCY ALERT: ${title.trim()}`, description.trim()]);
      }
    }

    await recordAuditLog({
      schoolId: targetSchoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: isEmergency ? 'EMERGENCY_BROADCAST' : 'CREATE_ANNOUNCEMENT',
      module: 'COMMUNICATION',
      recordId: id,
      description: `Dispatched announcement: ${title} (${audienceType || 'ALL'})`,
      req
    });

    return res.status(201).json({ success: true, id, message: 'Announcement published successfully.' });
  } catch (err: any) {
    console.error('[CREATE ANNOUNCEMENT ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to create announcement.' });
  }
});

router.delete('/announcements/:id', requireAuth, requirePermission('communication.announcements.manage'), async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM announcements WHERE id = $1`, [id]);
    return res.json({ success: true, message: 'Announcement deleted.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete announcement.' });
  }
});

// ==========================================
// 4. FORMAL CIRCULARS & ACKNOWLEDGEMENTS
// ==========================================
router.get('/circulars', requireAuth, async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  if (!checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const result: any = await db.query(`
      SELECT c.*,
        (SELECT count(*) FROM acknowledgements ack WHERE ack.entity_type = 'CIRCULAR' AND ack.entity_id = c.id) as acknowledgement_count,
        EXISTS(SELECT 1 FROM acknowledgements ack WHERE ack.entity_type = 'CIRCULAR' AND ack.entity_id = c.id AND ack.user_id = $2) as user_has_acknowledged
      FROM circulars c
      WHERE c.school_id = $1
      ORDER BY c.publish_date DESC
    `, [schoolId, req.user!.id]);

    return res.json({ circulars: result.rows });
  } catch (err: any) {
    console.error('[GET CIRCULARS ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to load circulars.' });
  }
});

router.post('/circulars', requireAuth, requirePermission('communication.circulars.manage'), async (req, res) => {
  const {
    schoolId,
    sessionId,
    circularNumber,
    title,
    content,
    issuedBy,
    department,
    targetAudience,
    publishDate,
    expiryDate,
    attachmentUrl,
    requiresAcknowledgement
  } = req.body;

  const targetSchoolId = schoolId || req.user!.schoolId || 'sch_vvps';
  if (!checkSchoolScope(req, targetSchoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (!circularNumber || !title || !content || !issuedBy) {
    return res.status(400).json({ error: 'Circular number, title, content, and issuing authority are required.' });
  }

  try {
    const id = `circ_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(`
      INSERT INTO circulars (
        id, school_id, session_id, circular_number, title, content,
        issued_by, department, target_audience, publish_date, expiry_date,
        attachment_url, requires_acknowledgement, status, created_by_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'PUBLISHED', $14)
    `, [
      id,
      targetSchoolId,
      sessionId || null,
      circularNumber.trim().toUpperCase(),
      title.trim(),
      content.trim(),
      issuedBy.trim(),
      department || 'Administration',
      targetAudience || 'ALL',
      publishDate || new Date().toISOString().split('T')[0],
      expiryDate || null,
      attachmentUrl || null,
      requiresAcknowledgement === true,
      req.user!.id
    ]);

    await recordAuditLog({
      schoolId: targetSchoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'PUBLISH_CIRCULAR',
      module: 'COMMUNICATION',
      recordId: id,
      description: `Issued official circular: ${circularNumber} - ${title}`,
      req
    });

    return res.status(201).json({ success: true, id, message: 'Circular published successfully.' });
  } catch (err: any) {
    console.error('[CREATE CIRCULAR ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to issue circular.' });
  }
});

// Acknowledge a circular / announcement
router.post('/circulars/:id/acknowledge', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { remarks } = req.body;

  try {
    const circRes: any = await db.query(`SELECT school_id, title FROM circulars WHERE id = $1`, [id]);
    if (circRes.rows.length === 0) return res.status(404).json({ error: 'Circular not found.' });
    const { school_id, title } = circRes.rows[0] as any;

    const ackId = `ack_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(`
      INSERT INTO acknowledgements (
        id, school_id, entity_type, entity_id, user_id, user_name, user_role, remarks
      ) VALUES ($1, $2, 'CIRCULAR', $3, $4, $5, $6, $7)
      ON CONFLICT (entity_type, entity_id, user_id)
      DO UPDATE SET acknowledged_at = CURRENT_TIMESTAMP, remarks = EXCLUDED.remarks
    `, [
      ackId,
      school_id,
      id,
      req.user!.id,
      `${req.user!.firstName} ${req.user!.lastName}`.trim() || req.user!.username,
      req.user!.roleName,
      remarks || 'Acknowledged via portal.'
    ]);

    return res.json({ success: true, message: `Circular '${title}' acknowledged.` });
  } catch (err: any) {
    console.error('[ACKNOWLEDGE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to acknowledge circular.' });
  }
});

// ==========================================
// 5. DIGITAL NOTICE BOARD
// ==========================================
router.get('/notices', requireAuth, async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  const category = req.query.category as string;

  if (!checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    let query = `SELECT * FROM notice_board WHERE school_id = $1`;
    const params: any[] = [schoolId];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    query += ` ORDER BY is_pinned DESC, posted_date DESC LIMIT 50`;

    const result: any = await db.query(query, params);
    return res.json({ notices: result.rows });
  } catch (err: any) {
    console.error('[GET NOTICES ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to load notices.' });
  }
});

router.post('/notices', requireAuth, requirePermission('communication.notices.manage'), async (req, res) => {
  const {
    schoolId,
    category,
    title,
    content,
    targetAudience,
    targetClassId,
    priority,
    isPinned,
    postedDate,
    expiresOn
  } = req.body;

  const targetSchoolId = schoolId || req.user!.schoolId || 'sch_vvps';
  if (!checkSchoolScope(req, targetSchoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (!category || !title || !content) {
    return res.status(400).json({ error: 'Category, title, and content are required.' });
  }

  try {
    const id = `not_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(`
      INSERT INTO notice_board (
        id, school_id, category, title, content, target_audience,
        target_class_id, priority, is_pinned, posted_date, expires_on, posted_by_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      id,
      targetSchoolId,
      category.toUpperCase(),
      title.trim(),
      content.trim(),
      targetAudience || 'ALL',
      targetClassId || null,
      priority || 'NORMAL',
      isPinned === true,
      postedDate || new Date().toISOString().split('T')[0],
      expiresOn || null,
      `${req.user!.firstName} ${req.user!.lastName}`.trim() || req.user!.username
    ]);

    return res.status(201).json({ success: true, id, message: 'Notice posted to board.' });
  } catch (err: any) {
    console.error('[POST NOTICE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to post notice.' });
  }
});

router.delete('/notices/:id', requireAuth, requirePermission('communication.notices.manage'), async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM notice_board WHERE id = $1`, [id]);
    return res.json({ success: true, message: 'Notice removed.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete notice.' });
  }
});

// ==========================================
// 6. INTERNAL MESSAGING & CONVERSATIONS
// ==========================================
router.get('/conversations', requireAuth, async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  if (!checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const isPrivileged = req.user!.roleName === 'super_admin' || req.user!.roleName === 'principal';
    let query = `
      SELECT c.*,
        stu.first_name as student_first_name,
        stu.last_name as student_last_name,
        stu.admission_number as student_admission_number,
        cls.name as class_name,
        (SELECT message FROM communication_messages cm WHERE cm.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM communication_messages cm WHERE cm.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT count(*) FROM communication_messages cm WHERE cm.conversation_id = c.id) as total_messages,
        cp.unread_count
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      LEFT JOIN students stu ON c.student_id = stu.id
      LEFT JOIN classes cls ON stu.class_id = cls.id
      WHERE c.school_id = $1
    `;
    const params: any[] = [schoolId];

    if (!isPrivileged) {
      params.push(req.user!.id);
      query += ` AND cp.user_id = $${params.length}`;
    }

    query += ` ORDER BY c.last_message_at DESC`;

    const result: any = await db.query(query, params);
    return res.json({ conversations: result.rows });
  } catch (err: any) {
    console.error('[GET CONVERSATIONS ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to load conversations.' });
  }
});

router.post('/conversations', requireAuth, requirePermission('communication.send'), async (req, res) => {
  const {
    schoolId,
    subject,
    type,
    studentId,
    recipientUserId,
    initialMessage
  } = req.body;

  const targetSchoolId = schoolId || req.user!.schoolId || 'sch_vvps';
  if (!checkSchoolScope(req, targetSchoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (!subject || !initialMessage) {
    return res.status(400).json({ error: 'Subject and initial message are required.' });
  }

  try {
    const convId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const myName = `${req.user!.firstName} ${req.user!.lastName}`.trim() || req.user!.username;

    await db.query(`
      INSERT INTO conversations (
        id, school_id, subject, type, student_id, status, created_by_id, created_by_name, last_message_at
      ) VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6, $7, CURRENT_TIMESTAMP)
    `, [
      convId,
      targetSchoolId,
      subject.trim(),
      type || 'PARENT_TEACHER',
      studentId || null,
      req.user!.id,
      myName
    ]);

    // Add sender as participant
    await db.query(`
      INSERT INTO conversation_participants (id, conversation_id, user_id, user_name, user_role, unread_count)
      VALUES ($1, $2, $3, $4, $5, 0)
    `, [`cp_${Date.now()}_1`, convId, req.user!.id, myName, req.user!.roleName]);

    // Add recipient if specified
    if (recipientUserId && recipientUserId !== req.user!.id) {
      const recRes: any = await db.query(`
        SELECT u.id, u.first_name, u.last_name, r.name as role_name 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.id = $1
      `, [recipientUserId]);

      if (recRes.rows.length > 0) {
        const recUser = recRes.rows[0];
        const recName = `${recUser.first_name} ${recUser.last_name}`.trim();
        await db.query(`
          INSERT INTO conversation_participants (id, conversation_id, user_id, user_name, user_role, unread_count)
          VALUES ($1, $2, $3, $4, $5, 1)
        `, [`cp_${Date.now()}_2`, convId, recipientUserId, recName, recUser.role_name]);
      }
    }

    // Insert initial message
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(`
      INSERT INTO communication_messages (
        id, conversation_id, sender_id, sender_name, sender_role, message, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'SENT')
    `, [msgId, convId, req.user!.id, myName, req.user!.roleName, initialMessage.trim()]);

    return res.status(201).json({ success: true, conversationId: convId, message: 'Conversation started.' });
  } catch (err: any) {
    console.error('[CREATE CONVERSATION ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to create conversation.' });
  }
});

router.get('/conversations/:id/messages', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const isPrivileged = req.user!.roleName === 'super_admin' || req.user!.roleName === 'principal';
    // Validate participant
    if (!isPrivileged) {
      const partRes: any = await db.query(`SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`, [id, req.user!.id]);
      if (partRes.rows.length === 0) {
        return res.status(403).json({ error: 'You are not a participant in this conversation.' });
      }
    }

    const messagesRes: any = await db.query(`
      SELECT * FROM communication_messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `, [id]);

    // Clear unread count for current user
    await db.query(`
      UPDATE conversation_participants
      SET unread_count = 0
      WHERE conversation_id = $1 AND user_id = $2
    `, [id, req.user!.id]);

    return res.json({ messages: messagesRes.rows });
  } catch (err: any) {
    console.error('[GET MESSAGES ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to load messages.' });
  }
});

router.post('/conversations/:id/messages', requireAuth, requirePermission('communication.send'), async (req, res) => {
  const { id } = req.params;
  const { message, attachmentUrl, attachmentName } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  try {
    const myName = `${req.user!.firstName} ${req.user!.lastName}`.trim() || req.user!.username;
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await db.query(`
      INSERT INTO communication_messages (
        id, conversation_id, sender_id, sender_name, sender_role, message, attachment_url, attachment_name, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'SENT')
    `, [
      msgId,
      id,
      req.user!.id,
      myName,
      req.user!.roleName,
      message.trim(),
      attachmentUrl || null,
      attachmentName || null
    ]);

    // Update conversation timestamp
    await db.query(`UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

    // Increment unread count for other participants
    await db.query(`
      UPDATE conversation_participants
      SET unread_count = unread_count + 1
      WHERE conversation_id = $1 AND user_id != $2
    `, [id, req.user!.id]);

    return res.status(201).json({ success: true, id: msgId, message: 'Message sent.' });
  } catch (err: any) {
    console.error('[SEND MESSAGE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to send message.' });
  }
});

// ==========================================
// 7. SCHEDULED MESSAGES & BROADCASTS
// ==========================================
router.get('/scheduled', requireAuth, requirePermission('communication.send'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  try {
    const result: any = await db.query(`
      SELECT sm.*, c.name as class_name
      FROM scheduled_messages sm
      LEFT JOIN classes c ON sm.target_class_id = c.id
      WHERE sm.school_id = $1
      ORDER BY sm.scheduled_for ASC
    `, [schoolId]);

    return res.json({ scheduledMessages: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load scheduled messages.' });
  }
});

router.post('/scheduled', requireAuth, requirePermission('communication.send'), async (req, res) => {
  const {
    schoolId,
    channel,
    audienceType,
    targetClassId,
    subject,
    message,
    priority,
    scheduledFor
  } = req.body;

  const targetSchoolId = schoolId || req.user!.schoolId || 'sch_vvps';
  if (!subject || !message || !scheduledFor) {
    return res.status(400).json({ error: 'Subject, message, and scheduled date/time are required.' });
  }

  try {
    const id = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(`
      INSERT INTO scheduled_messages (
        id, school_id, channel, audience_type, target_class_id,
        subject, message, priority, scheduled_for, status, created_by_id, created_by_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'SCHEDULED', $10, $11)
    `, [
      id,
      targetSchoolId,
      channel || 'IN_APP',
      audienceType || 'ALL',
      targetClassId || null,
      subject.trim(),
      message.trim(),
      priority || 'NORMAL',
      scheduledFor,
      req.user!.id,
      `${req.user!.firstName} ${req.user!.lastName}`.trim() || req.user!.username
    ]);

    return res.status(201).json({ success: true, id, message: 'Message scheduled successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to schedule message.' });
  }
});

router.delete('/scheduled/:id', requireAuth, requirePermission('communication.send'), async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`UPDATE scheduled_messages SET status = 'CANCELLED' WHERE id = $1`, [id]);
    return res.json({ success: true, message: 'Scheduled message cancelled.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to cancel message.' });
  }
});

// ==========================================
// 8. NOTIFICATION TEMPLATES
// ==========================================
router.get('/templates', requireAuth, async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  try {
    const result: any = await db.query(`
      SELECT * FROM notification_templates
      WHERE school_id = $1
      ORDER BY category ASC, name ASC
    `, [schoolId]);

    return res.json({ templates: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load notification templates.' });
  }
});

// ==========================================
// 9. POLLS & SURVEYS
// ==========================================
router.get('/polls', requireAuth, async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  try {
    const pollsRes: any = await db.query(`
      SELECT p.*,
        EXISTS(SELECT 1 FROM communication_poll_votes v WHERE v.poll_id = p.id AND v.user_id = $2) as user_has_voted,
        (SELECT option_id FROM communication_poll_votes v WHERE v.poll_id = p.id AND v.user_id = $2 LIMIT 1) as user_voted_option_id
      FROM communication_polls p
      WHERE p.school_id = $1
      ORDER BY p.is_active DESC, p.created_at DESC
    `, [schoolId, req.user!.id]);

    const polls = pollsRes.rows as any[];
    for (const poll of polls) {
      const optsRes: any = await db.query(`
        SELECT * FROM communication_poll_options
        WHERE poll_id = $1
        ORDER BY sort_order ASC
      `, [poll.id]);
      poll.options = optsRes.rows;
    }

    return res.json({ polls });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load polls.' });
  }
});

router.post('/polls/:id/vote', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { optionId } = req.body;

  if (!optionId) return res.status(400).json({ error: 'optionId is required.' });

  try {
    const voteId = `vote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(`
      INSERT INTO communication_poll_votes (id, poll_id, option_id, user_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (poll_id, user_id)
      DO UPDATE SET option_id = EXCLUDED.option_id, voted_at = CURRENT_TIMESTAMP
    `, [voteId, id, optionId, req.user!.id]);

    // Recalculate option vote counts
    await db.query(`
      UPDATE communication_poll_options
      SET votes_count = (SELECT count(*) FROM communication_poll_votes v WHERE v.option_id = communication_poll_options.id)
      WHERE poll_id = $1
    `, [id]);

    return res.json({ success: true, message: 'Vote recorded.' });
  } catch (err: any) {
    console.error('[VOTE ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to submit vote.' });
  }
});

// ==========================================
// 10. FEEDBACK & GRIEVANCES
// ==========================================
router.get('/feedback', requireAuth, async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  try {
    const isPrivileged = req.user!.roleName === 'super_admin' || req.user!.roleName === 'principal';
    let query = `SELECT * FROM feedback_submissions WHERE school_id = $1`;
    const params: any[] = [schoolId];

    if (!isPrivileged) {
      params.push(req.user!.id);
      query += ` AND submitted_by_id = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;
    const result: any = await db.query(query, params);
    return res.json({ feedback: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load feedback.' });
  }
});

router.post('/feedback', requireAuth, async (req, res) => {
  const { schoolId, category, subject, message, priority } = req.body;
  const targetSchoolId = schoolId || req.user!.schoolId || 'sch_vvps';

  if (!category || !subject || !message) {
    return res.status(400).json({ error: 'Category, subject, and message are required.' });
  }

  try {
    const id = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const myName = `${req.user!.firstName} ${req.user!.lastName}`.trim() || req.user!.username;

    await db.query(`
      INSERT INTO feedback_submissions (
        id, school_id, category, subject, message, priority,
        submitted_by_id, submitted_by_name, submitted_by_role, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'NEW')
    `, [
      id,
      targetSchoolId,
      category.toUpperCase(),
      subject.trim(),
      message.trim(),
      priority || 'NORMAL',
      req.user!.id,
      myName,
      req.user!.roleName
    ]);

    return res.status(201).json({ success: true, id, message: 'Feedback submitted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to submit feedback.' });
  }
});

router.get('/grievances', requireAuth, async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  try {
    const isPrivileged = req.user!.roleName === 'super_admin' || req.user!.roleName === 'principal';
    let query = `SELECT * FROM grievances WHERE school_id = $1`;
    const params: any[] = [schoolId];

    if (!isPrivileged) {
      params.push(req.user!.id);
      query += ` AND submitted_by_id = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;
    const result: any = await db.query(query, params);
    return res.json({ grievances: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load grievances.' });
  }
});

router.post('/grievances', requireAuth, async (req, res) => {
  const { schoolId, assignedDepartment, subject, description, priority } = req.body;
  const targetSchoolId = schoolId || req.user!.schoolId || 'sch_vvps';

  if (!assignedDepartment || !subject || !description) {
    return res.status(400).json({ error: 'Department, subject, and description are required.' });
  }

  try {
    const id = `grv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ticketNumber = `GRV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const myName = `${req.user!.firstName} ${req.user!.lastName}`.trim() || req.user!.username;

    await db.query(`
      INSERT INTO grievances (
        id, ticket_number, school_id, assigned_department, subject, description, priority,
        submitted_by_id, submitted_by_name, submitted_by_role, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'NEW')
    `, [
      id,
      ticketNumber,
      targetSchoolId,
      assignedDepartment,
      subject.trim(),
      description.trim(),
      priority || 'HIGH',
      req.user!.id,
      myName,
      req.user!.roleName
    ]);

    await recordAuditLog({
      schoolId: targetSchoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'SUBMIT_GRIEVANCE',
      module: 'COMMUNICATION',
      recordId: id,
      description: `Submitted confidential grievance ticket: ${ticketNumber} (${assignedDepartment})`,
      req
    });

    return res.status(201).json({ success: true, id, ticketNumber, message: 'Grievance ticket registered.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to submit grievance.' });
  }
});

export default router;
