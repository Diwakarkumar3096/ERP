import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requirePermission } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// Helper to check school isolation
function checkSchoolScope(req: any, targetSchoolId: string): boolean {
  if (req.user?.roleName === 'super_admin') return true;
  return req.user?.schoolId === targetSchoolId;
}

// -------------------------------------------------------------
// 1. ADMINISTRATION DASHBOARD
// -------------------------------------------------------------
router.get('/dashboard', requireAuth, requirePermission('administration.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';

  if (!checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied. You do not have permission to view data for this campus.' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    const [
      schoolInfo,
      activeSession,
      todayEventsRes,
      todayMeetingsRes,
      visitorsInsideRes,
      pendingVisitorApprovalsRes,
      todayAppointmentsRes,
      upcomingHolidaysRes,
      upcomingExamsRes,
      upcomingParentMeetingsRes,
      announcementsRes,
      overdueActionsRes,
      pendingActionsRes,
      recentActivitiesRes,
      allInsideVisitors
    ]: any[] = await Promise.all([
      db.query(`SELECT id, name, code, board, city FROM schools WHERE id = $1`, [schoolId]),
      db.query(`SELECT id, name, start_date, end_date FROM academic_sessions WHERE school_id = $1 AND is_current = true LIMIT 1`, [schoolId]),
      db.query(`
        SELECT count(*) as cnt 
        FROM calendar_events 
        WHERE school_id = $1 AND DATE(start_datetime) <= $2 AND DATE(end_datetime) >= $2 AND status != 'CANCELLED'
      `, [schoolId, today]),
      db.query(`
        SELECT count(*) as cnt 
        FROM school_meetings 
        WHERE school_id = $1 AND date = $2 AND status != 'CANCELLED'
      `, [schoolId, today]),
      db.query(`
        SELECT count(*) as cnt 
        FROM visitor_visits 
        WHERE school_id = $1 AND status = 'INSIDE'
      `, [schoolId]),
      db.query(`
        SELECT count(*) as cnt 
        FROM visitor_visits 
        WHERE school_id = $1 AND status = 'PENDING_APPROVAL'
      `, [schoolId]),
      db.query(`
        SELECT count(*) as cnt 
        FROM appointments 
        WHERE school_id = $1 AND appointment_date = $2 AND status IN ('CONFIRMED', 'APPROVED', 'REQUESTED')
      `, [schoolId, today]),
      db.query(`
        SELECT * 
        FROM school_holidays 
        WHERE school_id = $1 AND end_date >= $2 AND status = 'ACTIVE' 
        ORDER BY start_date ASC 
        LIMIT 4
      `, [schoolId, today]),
      db.query(`
        SELECT e.id, e.title, e.start_datetime, e.end_datetime, e.venue_name 
        FROM calendar_events e
        WHERE e.school_id = $1 AND e.event_type = 'EXAMINATION' AND DATE(e.start_datetime) >= $2
        ORDER BY e.start_datetime ASC 
        LIMIT 4
      `, [schoolId, today]),
      db.query(`
        SELECT * 
        FROM school_meetings 
        WHERE school_id = $1 AND meeting_type = 'PTM' AND date >= $2 AND status != 'CANCELLED' 
        ORDER BY date ASC, start_time ASC 
        LIMIT 4
      `, [schoolId, today]),
      db.query(`
        SELECT id, title, priority, publish_date, audience_type, is_emergency 
        FROM announcements 
        WHERE school_id = $1 AND status = 'PUBLISHED' 
        ORDER BY is_emergency DESC, publish_date DESC 
        LIMIT 5
      `, [schoolId]),
      db.query(`
        SELECT count(*) as cnt 
        FROM meeting_action_items 
        WHERE school_id = $1 AND due_date < $2 AND status NOT IN ('COMPLETED', 'CANCELLED')
      `, [schoolId, today]),
      db.query(`
        SELECT * 
        FROM meeting_action_items 
        WHERE school_id = $1 AND status NOT IN ('COMPLETED', 'CANCELLED') 
        ORDER BY priority DESC, due_date ASC 
        LIMIT 6
      `, [schoolId]),
      db.query(`
        SELECT id, action, module, description, user_name, created_at 
        FROM audit_logs 
        WHERE (school_id = $1 OR school_id IS NULL) 
        ORDER BY created_at DESC 
        LIMIT 8
      `, [schoolId]),
      db.query(`
        SELECT id, visitor_name, visitor_mobile, visitor_type, purpose, person_to_meet_name,
               department_to_visit, pass_number, entry_time, vehicle_number
        FROM visitor_visits 
        WHERE school_id = $1 AND status = 'INSIDE' 
        ORDER BY entry_time DESC
      `, [schoolId])
    ]);

    // Construct unified today's schedule
    const todayEventsList: any = await db.query(`
      SELECT id, 'EVENT' as item_type, title, event_type as sub_type, start_datetime, end_datetime,
             venue_name, organizer_name, status
      FROM calendar_events
      WHERE school_id = $1 AND DATE(start_datetime) <= $2 AND DATE(end_datetime) >= $2 AND status != 'CANCELLED'
      ORDER BY start_datetime ASC
    `, [schoolId, today]);

    const todayMeetingsList: any = await db.query(`
      SELECT id, 'MEETING' as item_type, title, meeting_type as sub_type,
             (date || 'T' || start_time) as start_datetime, (date || 'T' || end_time) as end_datetime,
             venue_name, organizer_name, status
      FROM school_meetings
      WHERE school_id = $1 AND date = $2 AND status != 'CANCELLED'
      ORDER BY start_time ASC
    `, [schoolId, today]);

    const todayAppointmentsList: any = await db.query(`
      SELECT id, 'APPOINTMENT' as item_type, (requester_name || ' with ' || staff_name) as title,
             requester_type as sub_type, (appointment_date || 'T' || start_time) as start_datetime,
             NULL as end_datetime, 'Staff Room / Office' as venue_name, staff_name as organizer_name, status
      FROM appointments
      WHERE school_id = $1 AND appointment_date = $2 AND status IN ('CONFIRMED', 'APPROVED')
      ORDER BY start_time ASC
    `, [schoolId, today]);

    const todaySchedule = [
      ...todayEventsList.rows,
      ...todayMeetingsList.rows,
      ...todayAppointmentsList.rows
    ];

    return res.json({
      school: schoolInfo.rows[0] || null,
      session: activeSession.rows[0] || null,
      todayDate: today,
      metrics: {
        todayEvents: Number(todayEventsRes.rows[0]?.cnt || 0),
        todayMeetings: Number(todayMeetingsRes.rows[0]?.cnt || 0),
        visitorsInside: Number(visitorsInsideRes.rows[0]?.cnt || 0),
        pendingVisitorApprovals: Number(pendingVisitorApprovalsRes.rows[0]?.cnt || 0),
        todayAppointments: Number(todayAppointmentsRes.rows[0]?.cnt || 0),
        overdueActionItems: Number(overdueActionsRes.rows[0]?.cnt || 0)
      },
      todaySchedule,
      visitorsInsideList: allInsideVisitors.rows,
      upcomingHolidays: upcomingHolidaysRes.rows,
      upcomingExams: upcomingExamsRes.rows,
      upcomingParentMeetings: upcomingParentMeetingsRes.rows,
      importantAnnouncements: announcementsRes.rows,
      pendingActionItems: pendingActionsRes.rows,
      recentActivities: recentActivitiesRes.rows
    });
  } catch (err: any) {
    console.error('[ADMIN DASHBOARD ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to load administration dashboard' });
  }
});

// -------------------------------------------------------------
// 2. CENTRAL SCHOOL CALENDAR (Aggregated Views)
// -------------------------------------------------------------
router.get('/calendar/aggregated', requireAuth, requirePermission('calendar.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  const start = req.query.start as string;
  const end = req.query.end as string;

  if (!checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    // 1. Fetch Calendar Events
    let eventQuery = `SELECT * FROM calendar_events WHERE school_id = $1 AND status != 'CANCELLED'`;
    const eventParams: any[] = [schoolId];
    if (start && end) {
      eventParams.push(start, end);
      eventQuery += ` AND ((start_datetime BETWEEN $2 AND $3) OR (end_datetime BETWEEN $2 AND $3))`;
    }
    const eventsRes: any = await db.query(eventQuery, eventParams);

    // 2. Fetch Holidays
    let holQuery = `SELECT * FROM school_holidays WHERE school_id = $1 AND status = 'ACTIVE'`;
    const holParams: any[] = [schoolId];
    if (start && end) {
      holParams.push(start.split('T')[0], end.split('T')[0]);
      holQuery += ` AND ((start_date BETWEEN $2 AND $3) OR (end_date BETWEEN $2 AND $3))`;
    }
    const holidaysRes: any = await db.query(holQuery, holParams);

    // 3. Fetch Meetings
    let mtgQuery = `SELECT * FROM school_meetings WHERE school_id = $1 AND status != 'CANCELLED'`;
    const mtgParams: any[] = [schoolId];
    if (start && end) {
      mtgParams.push(start.split('T')[0], end.split('T')[0]);
      mtgQuery += ` AND (date BETWEEN $2 AND $3)`;
    }
    const meetingsRes: any = await db.query(mtgQuery, mtgParams);

    // 4. Fetch Appointments
    let aptQuery = `SELECT * FROM appointments WHERE school_id = $1 AND status IN ('CONFIRMED', 'APPROVED', 'COMPLETED')`;
    const aptParams: any[] = [schoolId];
    if (start && end) {
      aptParams.push(start.split('T')[0], end.split('T')[0]);
      aptQuery += ` AND (appointment_date BETWEEN $2 AND $3)`;
    }
    const appointmentsRes: any = await db.query(aptQuery, aptParams);

    // Format all into standard FullCalendar / DayPilot items
    const aggregated = [
      ...eventsRes.rows.map((e: any) => ({
        id: `evt_${e.id}`,
        rawId: e.id,
        category: 'EVENT',
        type: e.event_type,
        title: e.title,
        description: e.description,
        start: e.start_datetime,
        end: e.end_datetime,
        venue: e.venue_name,
        organizer: e.organizer_name,
        department: e.department,
        audience: e.target_audience,
        status: e.status,
        color: e.event_type === 'EXAMINATION' ? '#dc2626' : e.event_type === 'SPORTS_EVENT' ? '#059669' : e.event_type === 'COMPETITION' ? '#7c3aed' : '#2563eb'
      })),
      ...holidaysRes.rows.map((h: any) => ({
        id: `hol_${h.id}`,
        rawId: h.id,
        category: 'HOLIDAY',
        type: h.holiday_type,
        title: `Holiday: ${h.name}`,
        description: h.description,
        start: `${h.start_date}T00:00:00`,
        end: `${h.end_date}T23:59:59`,
        venue: 'Campus-wide',
        organizer: 'School Administration',
        audience: h.applicable_classes,
        status: h.status,
        color: h.holiday_type === 'EMERGENCY_CLOSURE' ? '#ea580c' : '#d97706'
      })),
      ...meetingsRes.rows.map((m: any) => ({
        id: `mtg_${m.id}`,
        rawId: m.id,
        category: 'MEETING',
        type: m.meeting_type,
        title: `Meeting: ${m.title}`,
        description: m.description,
        start: `${m.date}T${m.start_time.includes(':') ? m.start_time : '09:00:00'}`,
        end: `${m.date}T${m.end_time.includes(':') ? m.end_time : '10:00:00'}`,
        venue: m.venue_name || 'Meeting Room',
        organizer: m.organizer_name,
        audience: m.meeting_type,
        status: m.status,
        color: m.meeting_type === 'PTM' ? '#4f46e5' : '#0891b2'
      })),
      ...appointmentsRes.rows.map((a: any) => ({
        id: `apt_${a.id}`,
        rawId: a.id,
        category: 'APPOINTMENT',
        type: 'APPOINTMENT',
        title: `Appt: ${a.requester_name} with ${a.staff_name}`,
        description: a.purpose,
        start: `${a.appointment_date}T${a.start_time.includes(':') ? a.start_time : '10:00:00'}`,
        end: `${a.appointment_date}T${a.start_time.includes(':') ? a.start_time : '10:30:00'}`,
        venue: 'Administration Office',
        organizer: a.staff_name,
        audience: a.requester_type,
        status: a.status,
        color: '#0d9488'
      }))
    ];

    return res.json({ items: aggregated });
  } catch (err: any) {
    console.error('[AGGREGATED CALENDAR ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to load aggregated calendar' });
  }
});

// -------------------------------------------------------------
// 3. EVENT MANAGEMENT
// -------------------------------------------------------------
router.get('/events', requireAuth, requirePermission('events.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  const { eventType, status, audience } = req.query;

  if (!checkSchoolScope(req, schoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    let query = `
      SELECT e.*, 
        (SELECT count(*) FROM event_registrations r WHERE r.event_id = e.id) as registration_count,
        (SELECT count(*) FROM event_tasks t WHERE t.event_id = e.id) as task_count
      FROM calendar_events e
      WHERE e.school_id = $1
    `;
    const params: any[] = [schoolId];

    if (eventType) {
      params.push(eventType);
      query += ` AND e.event_type = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND e.status = $${params.length}`;
    }
    if (audience) {
      params.push(audience);
      query += ` AND e.target_audience = $${params.length}`;
    }

    query += ` ORDER BY e.start_datetime DESC`;

    const result: any = await db.query(query, params);
    return res.json({ events: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load events' });
  }
});

router.post('/events', requireAuth, requirePermission('events.create'), async (req, res) => {
  const {
    schoolId,
    sessionId,
    title,
    description,
    eventType,
    startDatetime,
    endDatetime,
    venueId,
    venueName,
    department,
    targetAudience,
    targetClassId,
    targetSectionId,
    maxParticipants,
    registrationRequired,
    registrationDeadline,
    estimatedBudget,
    approvedBudget,
    broadcastAnnouncement
  } = req.body;

  const targetSchoolId = schoolId || req.user!.schoolId || 'sch_vvps';

  if (!checkSchoolScope(req, targetSchoolId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (!title || !startDatetime || !endDatetime) {
    return res.status(400).json({ error: 'Title, start datetime, and end datetime are required.' });
  }

  try {
    const id = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const organizerName = `${req.user!.firstName} ${req.user!.lastName}`.trim() || req.user!.username;

    // Check Venue Conflict if venue specified
    if (venueId) {
      const conflictRes: any = await db.query(`
        SELECT vb.*, v.name as venue_name
        FROM venue_bookings vb
        JOIN event_venues v ON vb.venue_id = v.id
        WHERE vb.venue_id = $1 AND vb.status = 'CONFIRMED'
          AND NOT (vb.end_datetime <= $2 OR vb.start_datetime >= $3)
      `, [venueId, startDatetime, endDatetime]);

      if (conflictRes.rows.length > 0) {
        return res.status(409).json({
          error: `Venue Conflict: ${conflictRes.rows[0].venue_name} is already booked for "${conflictRes.rows[0].title}" between ${conflictRes.rows[0].start_datetime} and ${conflictRes.rows[0].end_datetime}.`,
          conflict: conflictRes.rows[0]
        });
      }
    }

    await db.query(`
      INSERT INTO calendar_events (
        id, school_id, session_id, title, description, event_type,
        start_datetime, end_datetime, venue_id, venue_name, organizer_id, organizer_name,
        department, target_audience, target_class_id, target_section_id, max_participants,
        registration_required, registration_deadline, status, estimated_budget, approved_budget, actual_expense
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'PUBLISHED', $20, $21, 0.00)
    `, [
      id,
      targetSchoolId,
      sessionId || null,
      title.trim(),
      description ? description.trim() : null,
      eventType || 'SCHOOL_EVENT',
      startDatetime,
      endDatetime,
      venueId || null,
      venueName || null,
      req.user!.id,
      organizerName,
      department || null,
      targetAudience || 'ALL',
      targetClassId || null,
      targetSectionId || null,
      maxParticipants || 0,
      registrationRequired === true,
      registrationDeadline || null,
      estimatedBudget || 0.00,
      approvedBudget || 0.00
    ]);

    // Automatically book venue if venue specified
    if (venueId) {
      const bookingId = `vnb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await db.query(`
        INSERT INTO venue_bookings (
          id, school_id, venue_id, event_id, title, booked_by_id, booked_by_name,
          start_datetime, end_datetime, purpose, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'CONFIRMED')
      `, [
        bookingId,
        targetSchoolId,
        venueId,
        id,
        title.trim(),
        req.user!.id,
        organizerName,
        startDatetime,
        endDatetime,
        description || 'Official event venue reservation'
      ]);
    }

    // Phase 14 Communication Broadcast Integration
    if (broadcastAnnouncement === true) {
      try {
        const annId = `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await db.query(`
          INSERT INTO announcements (
            id, school_id, session_id, title, description, audience_type,
            priority, status, publish_date, author_id, author_name
          ) VALUES ($1, $2, $3, $4, $5, $6, 'HIGH', 'PUBLISHED', CURRENT_TIMESTAMP, $7, $8)
        `, [
          annId,
          targetSchoolId,
          sessionId || null,
          `New Campus Event: ${title.trim()}`,
          description || `A new event has been scheduled: ${title} from ${startDatetime} to ${endDatetime} at ${venueName || 'Campus'}.`,
          targetAudience || 'ALL',
          req.user!.id,
          organizerName
        ]);
      } catch (commsErr) {
        console.error('[EVENT ANNOUNCEMENT AUTO BROADCAST ERROR]', commsErr);
      }
    }

    await recordAuditLog({
      schoolId: targetSchoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'CREATE_EVENT',
      module: 'ADMINISTRATION',
      recordId: id,
      description: `Created campus calendar event: ${title} (${eventType || 'SCHOOL_EVENT'})`,
      req
    });

    return res.status(201).json({ success: true, id, message: 'Event scheduled successfully.' });
  } catch (err: any) {
    console.error('[CREATE EVENT ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to create event.' });
  }
});

router.put('/events/:id', requireAuth, requirePermission('events.edit'), async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    eventType,
    startDatetime,
    endDatetime,
    venueId,
    venueName,
    department,
    targetAudience,
    maxParticipants,
    registrationRequired,
    status,
    estimatedBudget,
    approvedBudget,
    actualExpense
  } = req.body;

  try {
    const existing: any = await db.query(`SELECT * FROM calendar_events WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    const evt = existing.rows[0];
    if (!checkSchoolScope(req, evt.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    await db.query(`
      UPDATE calendar_events
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          event_type = COALESCE($3, event_type),
          start_datetime = COALESCE($4, start_datetime),
          end_datetime = COALESCE($5, end_datetime),
          venue_id = COALESCE($6, venue_id),
          venue_name = COALESCE($7, venue_name),
          department = COALESCE($8, department),
          target_audience = COALESCE($9, target_audience),
          max_participants = COALESCE($10, max_participants),
          registration_required = COALESCE($11, registration_required),
          status = COALESCE($12, status),
          estimated_budget = COALESCE($13, estimated_budget),
          approved_budget = COALESCE($14, approved_budget),
          actual_expense = COALESCE($15, actual_expense),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
    `, [
      title,
      description,
      eventType,
      startDatetime,
      endDatetime,
      venueId,
      venueName,
      department,
      targetAudience,
      maxParticipants,
      registrationRequired,
      status,
      estimatedBudget,
      approvedBudget,
      actualExpense,
      id
    ]);

    await recordAuditLog({
      schoolId: evt.school_id,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'UPDATE_EVENT',
      module: 'ADMINISTRATION',
      recordId: id,
      description: `Updated event ${evt.title} (Status: ${status || evt.status})`,
      req
    });

    return res.json({ success: true, message: 'Event updated.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update event.' });
  }
});

router.delete('/events/:id', requireAuth, requirePermission('events.delete'), async (req, res) => {
  const { id } = req.params;
  try {
    const existing: any = await db.query(`SELECT * FROM calendar_events WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    const evt = existing.rows[0];
    if (!checkSchoolScope(req, evt.school_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Cancel instead of hard delete to preserve history
    await db.query(`UPDATE calendar_events SET status = 'CANCELLED' WHERE id = $1`, [id]);
    await db.query(`UPDATE venue_bookings SET status = 'CANCELLED' WHERE event_id = $1`, [id]);

    await recordAuditLog({
      schoolId: evt.school_id,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'CANCEL_EVENT',
      module: 'ADMINISTRATION',
      recordId: id,
      description: `Cancelled calendar event ${evt.title}`,
      req
    });

    return res.json({ success: true, message: 'Event marked as cancelled.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to cancel event.' });
  }
});

// -------------------------------------------------------------
// 4. EVENT REGISTRATION & ATTENDANCE
// -------------------------------------------------------------
router.get('/events/:id/registrations', requireAuth, requirePermission('events.view'), async (req, res) => {
  const { id } = req.params;
  try {
    const result: any = await db.query(`
      SELECT r.*, a.attendance_status, a.check_in_time
      FROM event_registrations r
      LEFT JOIN event_attendance a ON r.id = a.registration_id
      WHERE r.event_id = $1
      ORDER BY r.registration_date ASC
    `, [id]);
    return res.json({ registrations: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load registrations.' });
  }
});

router.post('/events/:id/registrations', requireAuth, requirePermission('events.register'), async (req, res) => {
  const { id } = req.params;
  const { participantName, participantType, participantContact, className, notes } = req.body;

  if (!participantName) {
    return res.status(400).json({ error: 'Participant name is required.' });
  }

  try {
    const evtRes: any = await db.query(`SELECT * FROM calendar_events WHERE id = $1`, [id]);
    if (evtRes.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    const evt = evtRes.rows[0];

    // Check capacity
    if (evt.max_participants > 0) {
      const regCountRes: any = await db.query(`SELECT count(*) as cnt FROM event_registrations WHERE event_id = $1 AND status = 'REGISTERED'`, [id]);
      const currentCount = Number(regCountRes.rows[0]?.cnt || 0);
      if (currentCount >= evt.max_participants) {
        // Waitlist
        const regId = `ereg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await db.query(`
          INSERT INTO event_registrations (
            id, event_id, school_id, participant_id, participant_name,
            participant_type, participant_contact, class_name, status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'WAITLISTED', $9)
        `, [regId, id, evt.school_id, req.user!.id, participantName.trim(), participantType || 'STUDENT', participantContact || null, className || null, notes || 'Capacity reached, placed on waitlist']);
        return res.status(201).json({ success: true, status: 'WAITLISTED', message: 'Event is at full capacity. Participant placed on waitlist.' });
      }
    }

    const regId = `ereg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(`
      INSERT INTO event_registrations (
        id, event_id, school_id, participant_id, participant_name,
        participant_type, participant_contact, class_name, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'REGISTERED', $9)
      ON CONFLICT (event_id, participant_id, participant_name) DO NOTHING
    `, [regId, id, evt.school_id, req.user!.id, participantName.trim(), participantType || 'STUDENT', participantContact || null, className || null, notes || null]);

    return res.status(201).json({ success: true, status: 'REGISTERED', message: 'Participant successfully registered.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to register for event.' });
  }
});

router.post('/events/:id/attendance', requireAuth, requirePermission('events.attendance'), async (req, res) => {
  const { id } = req.params;
  const { registrationId, attendanceStatus, remarks } = req.body;

  if (!registrationId || !attendanceStatus) {
    return res.status(400).json({ error: 'Registration ID and attendance status are required.' });
  }

  try {
    const regRes: any = await db.query(`SELECT * FROM event_registrations WHERE id = $1`, [registrationId]);
    if (regRes.rows.length === 0) {
      return res.status(404).json({ error: 'Registration record not found.' });
    }
    const reg = regRes.rows[0];

    const attId = `eatt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(`
      INSERT INTO event_attendance (
        id, event_id, registration_id, school_id, participant_name, attendance_status, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [attId, id, registrationId, reg.school_id, reg.participant_name, attendanceStatus, remarks || null]);

    return res.json({ success: true, message: `Marked attendance as ${attendanceStatus}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to record attendance.' });
  }
});

// -------------------------------------------------------------
// 5. EVENT TASKS
// -------------------------------------------------------------
router.get('/events/:id/tasks', requireAuth, requirePermission('events.view'), async (req, res) => {
  const { id } = req.params;
  try {
    const result: any = await db.query(`SELECT * FROM event_tasks WHERE event_id = $1 ORDER BY deadline ASC`, [id]);
    return res.json({ tasks: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load event tasks.' });
  }
});

router.post('/events/:id/tasks', requireAuth, requirePermission('events.edit'), async (req, res) => {
  const { id } = req.params;
  const { taskTitle, description, assignedToId, assignedToName, department, deadline, priority } = req.body;

  if (!taskTitle) {
    return res.status(400).json({ error: 'Task title is required.' });
  }

  try {
    const evtRes: any = await db.query(`SELECT school_id FROM calendar_events WHERE id = $1`, [id]);
    if (evtRes.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });

    const taskId = `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(`
      INSERT INTO event_tasks (
        id, event_id, school_id, task_title, description, assigned_to_id, assigned_to_name, department, deadline, priority, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING')
    `, [
      taskId,
      id,
      evtRes.rows[0].school_id,
      taskTitle.trim(),
      description ? description.trim() : null,
      assignedToId || null,
      assignedToName || 'Unassigned',
      department || null,
      deadline || null,
      priority || 'MEDIUM'
    ]);

    return res.status(201).json({ success: true, id: taskId, message: 'Event task created.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create task.' });
  }
});

router.patch('/events/:id/tasks/:taskId', requireAuth, requirePermission('events.edit'), async (req, res) => {
  const { taskId } = req.params;
  const { status, remarks } = req.body;

  try {
    await db.query(`UPDATE event_tasks SET status = $1 WHERE id = $2`, [status, taskId]);
    return res.json({ success: true, message: 'Task status updated.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update task status.' });
  }
});

// -------------------------------------------------------------
// 6. EVENT VENUE MANAGEMENT & CONFLICT DETECTION
// -------------------------------------------------------------
router.get('/venues', requireAuth, requirePermission('venues.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  if (!checkSchoolScope(req, schoolId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const result: any = await db.query(`
      SELECT v.*,
        (SELECT count(*) FROM venue_bookings b WHERE b.venue_id = v.id AND b.status = 'CONFIRMED' AND b.end_datetime >= CURRENT_TIMESTAMP) as active_bookings_count
      FROM event_venues v
      WHERE v.school_id = $1
      ORDER BY v.name ASC
    `, [schoolId]);
    return res.json({ venues: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load venues.' });
  }
});

router.post('/venues', requireAuth, requirePermission('venues.manage'), async (req, res) => {
  const { schoolId, name, code, capacity, location, facilities, contactPerson } = req.body;
  const targetSchoolId = schoolId || req.user!.schoolId || 'sch_vvps';

  if (!name || !code) return res.status(400).json({ error: 'Name and code are required.' });

  try {
    const id = `ven_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(`
      INSERT INTO event_venues (
        id, school_id, name, code, capacity, location, facilities, status, contact_person
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'AVAILABLE', $8)
      ON CONFLICT (school_id, code) DO UPDATE SET name = EXCLUDED.name, capacity = EXCLUDED.capacity, facilities = EXCLUDED.facilities
    `, [
      id,
      targetSchoolId,
      name.trim(),
      code.trim().toUpperCase(),
      capacity || 50,
      location || null,
      facilities || null,
      contactPerson || null
    ]);

    return res.status(201).json({ success: true, id, message: 'Venue created successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create venue.' });
  }
});

router.get('/venues/bookings', requireAuth, requirePermission('venues.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  const { venueId } = req.query;

  try {
    let query = `
      SELECT vb.*, v.name as venue_name, v.code as venue_code, v.location as venue_location
      FROM venue_bookings vb
      JOIN event_venues v ON vb.venue_id = v.id
      WHERE vb.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (venueId) {
      params.push(venueId);
      query += ` AND vb.venue_id = $2`;
    }
    query += ` ORDER BY vb.start_datetime DESC`;

    const result: any = await db.query(query, params);
    return res.json({ bookings: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load bookings.' });
  }
});

router.post('/venues/bookings', requireAuth, requirePermission('venues.manage'), async (req, res) => {
  const { schoolId, venueId, title, startDatetime, endDatetime, purpose, isOverride, overrideReason } = req.body;
  const targetSchoolId = schoolId || req.user!.schoolId || 'sch_vvps';

  if (!venueId || !title || !startDatetime || !endDatetime) {
    return res.status(400).json({ error: 'Venue, title, start and end datetime are required.' });
  }

  try {
    // CONCURRENCY & DOUBLE-BOOKING CONFLICT DETECTION
    const conflictRes: any = await db.query(`
      SELECT vb.*, v.name as venue_name 
      FROM venue_bookings vb
      JOIN event_venues v ON vb.venue_id = v.id
      WHERE vb.venue_id = $1 AND vb.status = 'CONFIRMED'
        AND NOT (vb.end_datetime <= $2 OR vb.start_datetime >= $3)
    `, [venueId, startDatetime, endDatetime]);

    if (conflictRes.rows.length > 0 && isOverride !== true) {
      const conflict = conflictRes.rows[0];
      return res.status(409).json({
        conflict: true,
        error: `Venue Conflict: "${conflict.venue_name}" is already booked for "${conflict.title}" from ${conflict.start_datetime} to ${conflict.end_datetime}.`,
        conflictingBooking: conflict
      });
    }

    const id = `vnb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const myName = `${req.user!.firstName} ${req.user!.lastName}`.trim() || req.user!.username;

    await db.query(`
      INSERT INTO venue_bookings (
        id, school_id, venue_id, title, booked_by_id, booked_by_name,
        start_datetime, end_datetime, purpose, status, is_override, override_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'CONFIRMED', $10, $11)
    `, [
      id,
      targetSchoolId,
      venueId,
      title.trim(),
      req.user!.id,
      myName,
      startDatetime,
      endDatetime,
      purpose || null,
      isOverride === true,
      overrideReason || null
    ]);

    await recordAuditLog({
      schoolId: targetSchoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: isOverride ? 'OVERRIDE_VENUE_BOOKING' : 'BOOK_VENUE',
      module: 'ADMINISTRATION',
      recordId: id,
      description: `Booked venue (ID: ${venueId}) for "${title}" ${isOverride ? '[OVERRIDE]' : ''}`,
      req
    });

    return res.status(201).json({ success: true, id, message: 'Venue reserved successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to book venue.' });
  }
});

// -------------------------------------------------------------
// 7. HOLIDAYS & ACADEMIC TERMS
// -------------------------------------------------------------
router.get('/holidays', requireAuth, requirePermission('holidays.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  try {
    const result: any = await db.query(`SELECT * FROM school_holidays WHERE school_id = $1 ORDER BY start_date ASC`, [schoolId]);
    return res.json({ holidays: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load holidays.' });
  }
});

router.post('/holidays', requireAuth, requirePermission('holidays.manage'), async (req, res) => {
  const { schoolId, sessionId, name, startDate, endDate, holidayType, description, applicableClasses } = req.body;
  const targetSchoolId = schoolId || req.user!.schoolId || 'sch_vvps';

  if (!name || !startDate || !endDate) {
    return res.status(400).json({ error: 'Holiday name, start date, and end date are required.' });
  }

  try {
    const id = `hol_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(`
      INSERT INTO school_holidays (
        id, school_id, session_id, name, start_date, end_date, holiday_type, description, applicable_classes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE')
    `, [
      id,
      targetSchoolId,
      sessionId || null,
      name.trim(),
      startDate,
      endDate,
      holidayType || 'SCHOOL',
      description || null,
      applicableClasses || 'ALL'
    ]);

    await recordAuditLog({
      schoolId: targetSchoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'CREATE_HOLIDAY',
      module: 'ADMINISTRATION',
      recordId: id,
      description: `Added school holiday: ${name} (${startDate} to ${endDate})`,
      req
    });

    return res.status(201).json({ success: true, id, message: 'Holiday scheduled.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to save holiday.' });
  }
});

router.delete('/holidays/:id', requireAuth, requirePermission('holidays.manage'), async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM school_holidays WHERE id = $1`, [id]);
    return res.json({ success: true, message: 'Holiday removed.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete holiday.' });
  }
});

router.get('/terms', requireAuth, requirePermission('administration.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  try {
    const result: any = await db.query(`SELECT * FROM academic_terms WHERE school_id = $1 ORDER BY start_date ASC`, [schoolId]);
    return res.json({ terms: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load academic terms.' });
  }
});

router.post('/terms', requireAuth, requirePermission('calendar.manage'), async (req, res) => {
  const { schoolId, sessionId, termName, startDate, endDate, weightagePercentage, examStartDate, examEndDate, resultDate } = req.body;
  const targetSchoolId = schoolId || req.user!.schoolId || 'sch_vvps';

  if (!termName || !startDate || !endDate) {
    return res.status(400).json({ error: 'Term name, start date, and end date are required.' });
  }

  try {
    const id = `term_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(`
      INSERT INTO academic_terms (
        id, school_id, session_id, term_name, start_date, end_date, status, weightage_percentage,
        exam_start_date, exam_end_date, result_date
      ) VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, $8, $9, $10)
    `, [
      id,
      targetSchoolId,
      sessionId || 'sess_vvps_2526',
      termName.trim(),
      startDate,
      endDate,
      weightagePercentage || 0,
      examStartDate || null,
      examEndDate || null,
      resultDate || null
    ]);

    return res.status(201).json({ success: true, id, message: 'Academic term created.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create term.' });
  }
});

// -------------------------------------------------------------
// 8. MEETING MANAGEMENT, MINUTES (MoM) & ACTION ITEMS
// -------------------------------------------------------------
router.get('/meetings', requireAuth, requirePermission('meetings.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  const { meetingType, status } = req.query;

  try {
    let query = `
      SELECT m.*,
        (SELECT count(*) FROM meeting_participants p WHERE p.meeting_id = m.id) as participant_count,
        (SELECT count(*) FROM meeting_action_items a WHERE a.meeting_id = m.id) as action_items_count
      FROM school_meetings m
      WHERE m.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (meetingType) {
      params.push(meetingType);
      query += ` AND m.meeting_type = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND m.status = $${params.length}`;
    }
    query += ` ORDER BY m.date DESC, m.start_time DESC`;

    const result: any = await db.query(query, params);
    return res.json({ meetings: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load meetings.' });
  }
});

router.post('/meetings', requireAuth, requirePermission('meetings.create'), async (req, res) => {
  const {
    schoolId,
    meetingType,
    title,
    description,
    date,
    startTime,
    endTime,
    venueId,
    venueName,
    onlineMeetingLink,
    participants, // array of { userId, name, role, email }
    agendas // array of strings or { title, description, responsible }
  } = req.body;

  const targetSchoolId = schoolId || req.user!.schoolId || 'sch_vvps';

  if (!title || !date || !startTime || !endTime) {
    return res.status(400).json({ error: 'Title, date, start time, and end time are required.' });
  }

  try {
    const id = `mtg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const myName = `${req.user!.firstName} ${req.user!.lastName}`.trim() || req.user!.username;

    await db.query(`
      INSERT INTO school_meetings (
        id, school_id, meeting_type, title, description, organizer_id, organizer_name,
        date, start_time, end_time, venue_id, venue_name, online_meeting_link, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'SCHEDULED')
    `, [
      id,
      targetSchoolId,
      meetingType || 'STAFF',
      title.trim(),
      description || null,
      req.user!.id,
      myName,
      date,
      startTime,
      endTime,
      venueId || null,
      venueName || null,
      onlineMeetingLink || null
    ]);

    // Add Organizer as participant
    await db.query(`
      INSERT INTO meeting_participants (
        id, meeting_id, user_id, participant_name, participant_role, email, rsvp_status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'ACCEPTED')
    `, [`mp_${Date.now()}_org`, id, req.user!.id, myName, req.user!.roleName, req.user!.email || null]);

    // Add invited participants and dispatch notifications
    if (Array.isArray(participants)) {
      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        if (p.userId === req.user!.id) continue;
        const pid = `mp_${Date.now()}_${i}`;
        await db.query(`
          INSERT INTO meeting_participants (
            id, meeting_id, user_id, participant_name, participant_role, email, rsvp_status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
        `, [pid, id, p.userId || null, p.name || 'Participant', p.role || 'STAFF', p.email || null]);

        // Trigger Phase 14 Notification
        if (p.userId) {
          try {
            const notifId = `notif_${Date.now()}_${i}`;
            await db.query(`
              INSERT INTO notifications (
                id, school_id, user_id, title, message, category, priority, action_link
              ) VALUES ($1, $2, $3, $4, $5, 'General', 'NORMAL', '/administration')
            `, [
              notifId,
              targetSchoolId,
              p.userId,
              `Meeting Invitation: ${title}`,
              `You are invited to ${title} on ${date} at ${startTime} in ${venueName || 'Campus'}.`
            ]);
          } catch (notifErr) {
            console.error('[MEETING NOTIFICATION ERROR]', notifErr);
          }
        }
      }
    }

    // Add Agendas
    if (Array.isArray(agendas)) {
      for (let j = 0; j < agendas.length; j++) {
        const ag = agendas[j];
        const agTitle = typeof ag === 'string' ? ag : ag.title;
        const agDesc = typeof ag === 'object' ? ag.description : null;
        const agResp = typeof ag === 'object' ? ag.responsible : null;
        if (agTitle && agTitle.trim()) {
          const agId = `agd_${Date.now()}_${j}`;
          await db.query(`
            INSERT INTO meeting_agendas (
              id, meeting_id, title, description, responsible_person_name, order_index
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [agId, id, agTitle.trim(), agDesc, agResp, j + 1]);
        }
      }
    }

    await recordAuditLog({
      schoolId: targetSchoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'SCHEDULE_MEETING',
      module: 'ADMINISTRATION',
      recordId: id,
      description: `Scheduled ${meetingType || 'STAFF'} meeting: ${title} on ${date}`,
      req
    });

    return res.status(201).json({ success: true, id, message: 'Meeting scheduled and participants notified.' });
  } catch (err: any) {
    console.error('[CREATE MEETING ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to create meeting.' });
  }
});

router.get('/meetings/:id', requireAuth, requirePermission('meetings.view'), async (req, res) => {
  const { id } = req.params;
  try {
    const [mtgRes, partRes, agdRes, momRes, actRes]: any[] = await Promise.all([
      db.query(`SELECT * FROM school_meetings WHERE id = $1`, [id]),
      db.query(`SELECT * FROM meeting_participants WHERE meeting_id = $1 ORDER BY participant_name ASC`, [id]),
      db.query(`SELECT * FROM meeting_agendas WHERE meeting_id = $1 ORDER BY order_index ASC`, [id]),
      db.query(`SELECT * FROM meeting_minutes WHERE meeting_id = $1`, [id]),
      db.query(`SELECT * FROM meeting_action_items WHERE meeting_id = $1 ORDER BY due_date ASC`, [id])
    ]);

    if (mtgRes.rows.length === 0) return res.status(404).json({ error: 'Meeting not found.' });

    return res.json({
      meeting: mtgRes.rows[0],
      participants: partRes.rows,
      agendas: agdRes.rows,
      minutes: momRes.rows[0] || null,
      actionItems: actRes.rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load meeting details.' });
  }
});

router.post('/meetings/:id/rsvp', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { rsvpStatus, rsvpNote } = req.body;

  try {
    await db.query(`
      UPDATE meeting_participants
      SET rsvp_status = $1, rsvp_note = $2
      WHERE meeting_id = $3 AND (user_id = $4 OR email = $5)
    `, [rsvpStatus, rsvpNote || null, id, req.user!.id, req.user!.email]);

    return res.json({ success: true, message: `RSVP updated to ${rsvpStatus}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update RSVP.' });
  }
});

router.post('/meetings/:id/minutes', requireAuth, requirePermission('meetings.minutes'), async (req, res) => {
  const { id } = req.params;
  const { discussionSummary, decisionsTaken, nextMeetingDate, actionItems } = req.body;

  if (!discussionSummary) return res.status(400).json({ error: 'Discussion summary is required.' });

  try {
    const mtgRes: any = await db.query(`SELECT * FROM school_meetings WHERE id = $1`, [id]);
    if (mtgRes.rows.length === 0) return res.status(404).json({ error: 'Meeting not found.' });
    const mtg = mtgRes.rows[0];

    const momId = `mom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const myName = `${req.user!.firstName} ${req.user!.lastName}`.trim() || req.user!.username;

    await db.query(`
      INSERT INTO meeting_minutes (
        id, meeting_id, recorded_by_id, recorded_by_name, discussion_summary, decisions_taken, next_meeting_date, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (meeting_id) DO UPDATE SET
        discussion_summary = EXCLUDED.discussion_summary,
        decisions_taken = EXCLUDED.decisions_taken,
        next_meeting_date = EXCLUDED.next_meeting_date,
        updated_at = CURRENT_TIMESTAMP
    `, [momId, id, req.user!.id, myName, discussionSummary.trim(), decisionsTaken || null, nextMeetingDate || null]);

    // Also mark meeting as COMPLETED
    await db.query(`UPDATE school_meetings SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

    // Create action items if provided
    if (Array.isArray(actionItems)) {
      for (const act of actionItems) {
        if (!act.taskDescription) continue;
        const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await db.query(`
          INSERT INTO meeting_action_items (
            id, meeting_id, school_id, task_description, assigned_to_id, assigned_to_name, priority, due_date, status, remarks
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9)
        `, [
          actId,
          id,
          mtg.school_id,
          act.taskDescription.trim(),
          act.assignedToId || null,
          act.assignedToName || 'Unassigned',
          act.priority || 'MEDIUM',
          act.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          act.remarks || null
        ]);
      }
    }

    await recordAuditLog({
      schoolId: mtg.school_id,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'RECORD_MEETING_MINUTES',
      module: 'ADMINISTRATION',
      recordId: id,
      description: `Documented Minutes of Meeting (MoM) for ${mtg.title}`,
      req
    });

    return res.status(201).json({ success: true, message: 'Minutes of Meeting recorded successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to save meeting minutes.' });
  }
});

// -------------------------------------------------------------
// 9. ACTION ITEMS TRACKING
// -------------------------------------------------------------
router.get('/action-items', requireAuth, requirePermission('action_items.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  const { status, assignedToId } = req.query;

  try {
    let query = `
      SELECT a.*, m.title as meeting_title, m.date as meeting_date
      FROM meeting_action_items a
      LEFT JOIN school_meetings m ON a.meeting_id = m.id
      WHERE a.school_id = $1
    `;
    const params: any[] = [schoolId];
    if (status) {
      params.push(status);
      query += ` AND a.status = $${params.length}`;
    }
    if (assignedToId) {
      params.push(assignedToId);
      query += ` AND a.assigned_to_id = $${params.length}`;
    }
    query += ` ORDER BY a.priority DESC, a.due_date ASC`;

    const result: any = await db.query(query, params);
    return res.json({ actionItems: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load action items.' });
  }
});

router.post('/action-items', requireAuth, requirePermission('action_items.manage'), async (req, res) => {
  const { schoolId, meetingId, taskDescription, assignedToId, assignedToName, priority, dueDate, remarks } = req.body;
  const targetSchoolId = schoolId || req.user!.schoolId || 'sch_vvps';

  if (!taskDescription || !dueDate) {
    return res.status(400).json({ error: 'Task description and due date are required.' });
  }

  try {
    const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(`
      INSERT INTO meeting_action_items (
        id, meeting_id, school_id, task_description, assigned_to_id, assigned_to_name, priority, due_date, status, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9)
    `, [
      id,
      meetingId || null,
      targetSchoolId,
      taskDescription.trim(),
      assignedToId || null,
      assignedToName || 'Unassigned',
      priority || 'MEDIUM',
      dueDate,
      remarks || null
    ]);

    return res.status(201).json({ success: true, id, message: 'Action item created.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create action item.' });
  }
});

router.patch('/action-items/:id', requireAuth, requirePermission('action_items.manage'), async (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;

  try {
    const completionDate = status === 'COMPLETED' ? new Date().toISOString().split('T')[0] : null;
    await db.query(`
      UPDATE meeting_action_items
      SET status = COALESCE($1, status),
          remarks = COALESCE($2, remarks),
          completion_date = COALESCE($3, completion_date)
      WHERE id = $4
    `, [status, remarks, completionDate, id]);

    return res.json({ success: true, message: 'Action item updated.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update action item.' });
  }
});

// -------------------------------------------------------------
// 10. APPOINTMENT MANAGEMENT & STAFF AVAILABILITY
// -------------------------------------------------------------
router.get('/appointments', requireAuth, requirePermission('appointments.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  const { status, staffId, date } = req.query;

  try {
    let query = `SELECT * FROM appointments WHERE school_id = $1`;
    const params: any[] = [schoolId];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (staffId) {
      params.push(staffId);
      query += ` AND staff_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      query += ` AND appointment_date = $${params.length}`;
    }

    query += ` ORDER BY appointment_date DESC, start_time ASC`;
    const result: any = await db.query(query, params);
    return res.json({ appointments: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load appointments.' });
  }
});

router.post('/appointments', requireAuth, requirePermission('appointments.request'), async (req, res) => {
  const { schoolId, requesterType, requesterName, requesterContact, staffId, staffName, staffRole, purpose, appointmentDate, startTime, durationMinutes, notes } = req.body;
  const targetSchoolId = schoolId || req.user!.schoolId || 'sch_vvps';

  if (!requesterName || !staffId || !appointmentDate || !startTime || !purpose) {
    return res.status(400).json({ error: 'Requester name, staff member, date, time, and purpose are required.' });
  }

  try {
    // CONCURRENCY & DOUBLE BOOKING PREVENTION
    const conflictRes: any = await db.query(`
      SELECT * FROM appointments 
      WHERE school_id = $1 AND staff_id = $2 AND appointment_date = $3 AND start_time = $4 AND status IN ('CONFIRMED', 'APPROVED')
    `, [targetSchoolId, staffId, appointmentDate, startTime]);

    if (conflictRes.rows.length > 0) {
      return res.status(409).json({ error: 'This staff member is already booked at this exact time slot. Please select another time.' });
    }

    const id = `apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(`
      INSERT INTO appointments (
        id, school_id, requester_type, requester_id, requester_name, requester_contact,
        staff_id, staff_name, staff_role, purpose, appointment_date, start_time, duration_minutes,
        status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'REQUESTED', $14)
    `, [
      id,
      targetSchoolId,
      requesterType || 'PARENT',
      req.user!.id,
      requesterName.trim(),
      requesterContact || req.user!.phone || '+91 00000 00000',
      staffId,
      staffName || 'Staff Member',
      staffRole || 'Faculty',
      purpose.trim(),
      appointmentDate,
      startTime,
      durationMinutes || 20,
      notes || null
    ]);

    // Dispatch notification to staff
    try {
      await db.query(`
        INSERT INTO notifications (
          id, school_id, user_id, title, message, category, priority, action_link
        ) VALUES ($1, $2, $3, $4, $5, 'General', 'NORMAL', '/administration')
      `, [
        `notif_apt_${Date.now()}`,
        targetSchoolId,
        staffId,
        `New Appointment Request: ${requesterName}`,
        `${requesterName} has requested an appointment on ${appointmentDate} at ${startTime} for: "${purpose}".`
      ]);
    } catch (e) {}

    return res.status(201).json({ success: true, id, message: 'Appointment request submitted.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to submit appointment.' });
  }
});

router.patch('/appointments/:id', requireAuth, requirePermission('appointments.manage'), async (req, res) => {
  const { id } = req.params;
  const { status, notes, rejectionReason, rescheduledDate, rescheduledTime } = req.body;

  try {
    const existing: any = await db.query(`SELECT * FROM appointments WHERE id = $1`, [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Appointment not found.' });
    const apt = existing.rows[0];

    await db.query(`
      UPDATE appointments
      SET status = COALESCE($1, status),
          notes = COALESCE($2, notes),
          rejection_reason = COALESCE($3, rejection_reason),
          appointment_date = COALESCE($4, appointment_date),
          start_time = COALESCE($5, start_time),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [status, notes, rejectionReason, rescheduledDate, rescheduledTime, id]);

    // Notify requester if user account exists
    if (apt.requester_id) {
      try {
        await db.query(`
          INSERT INTO notifications (
            id, school_id, user_id, title, message, category, priority, action_link
          ) VALUES ($1, $2, $3, $4, $5, 'General', 'NORMAL', '/administration')
        `, [
          `notif_apt_upd_${Date.now()}`,
          apt.school_id,
          apt.requester_id,
          `Appointment Status Update: ${status}`,
          `Your appointment with ${apt.staff_name} for ${apt.appointment_date} has been marked as ${status}.${rejectionReason ? ' Reason: ' + rejectionReason : ''}`
        ]);
      } catch (e) {}
    }

    return res.json({ success: true, message: `Appointment status updated to ${status}.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update appointment.' });
  }
});

router.get('/staff-availability', requireAuth, requirePermission('administration.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  try {
    const result: any = await db.query(`SELECT * FROM staff_availability WHERE school_id = $1 AND is_active = true ORDER BY staff_name ASC`, [schoolId]);
    return res.json({ availability: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load availability.' });
  }
});

// -------------------------------------------------------------
// 11. VISITOR MANAGEMENT & CAMPUS ACCESS LOGS
// -------------------------------------------------------------
router.get('/visitors', requireAuth, requirePermission('visitors.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  const { search, visitorType, securityStatus } = req.query;

  try {
    let query = `
      SELECT v.*,
        (SELECT count(*) FROM visitor_visits vst WHERE vst.visitor_id = v.id) as total_visits,
        (SELECT max(vst.entry_time) FROM visitor_visits vst WHERE vst.visitor_id = v.id) as last_visit_at
      FROM visitors v
      WHERE v.school_id = $1
    `;
    const params: any[] = [schoolId];

    if (search) {
      params.push(`%${(search as string).toLowerCase()}%`);
      query += ` AND (LOWER(v.name) LIKE $${params.length} OR v.mobile LIKE $${params.length} OR LOWER(v.visitor_number) LIKE $${params.length} OR LOWER(COALESCE(v.organization, '')) LIKE $${params.length})`;
    }
    if (visitorType) {
      params.push(visitorType);
      query += ` AND v.visitor_type = $${params.length}`;
    }
    if (securityStatus) {
      params.push(securityStatus);
      query += ` AND v.security_status = $${params.length}`;
    }

    query += ` ORDER BY v.created_at DESC`;
    const result: any = await db.query(query, params);
    return res.json({ visitors: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to search visitors.' });
  }
});

router.post('/visitors', requireAuth, requirePermission('visitors.manage'), async (req, res) => {
  const { schoolId, name, mobile, email, organization, address, idType, idNumberMasked, visitorType } = req.body;
  const targetSchoolId = schoolId || req.user!.schoolId || 'sch_vvps';

  if (!name || !mobile) {
    return res.status(400).json({ error: 'Name and mobile number are required.' });
  }

  try {
    const id = `vis_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const visitorNumber = `VIS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    await db.query(`
      INSERT INTO visitors (
        id, school_id, visitor_number, name, mobile, email, organization, address,
        id_type, id_number_masked, visitor_type, security_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'CLEARED')
      ON CONFLICT (school_id, visitor_number) DO NOTHING
    `, [
      id,
      targetSchoolId,
      visitorNumber,
      name.trim(),
      mobile.trim(),
      email || null,
      organization || null,
      address || null,
      idType || 'AADHAAR',
      idNumberMasked || 'XXXXXXXX' + mobile.slice(-4),
      visitorType || 'PARENT'
    ]);

    return res.status(201).json({ success: true, id, visitorNumber, message: 'Visitor registered in master directory.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to register visitor.' });
  }
});

router.patch('/visitors/:id/security-status', requireAuth, requirePermission('visitors.security'), async (req, res) => {
  const { id } = req.params;
  const { securityStatus, restrictionReason } = req.body;

  if (!securityStatus) return res.status(400).json({ error: 'Security status is required.' });

  try {
    const myName = `${req.user!.firstName} ${req.user!.lastName}`.trim() || req.user!.username;
    const vRes: any = await db.query(`SELECT * FROM visitors WHERE id = $1`, [id]);
    if (vRes.rows.length === 0) return res.status(404).json({ error: 'Visitor not found.' });
    const vis = vRes.rows[0];

    await db.query(`
      UPDATE visitors
      SET security_status = $1,
          restriction_reason = $2,
          restriction_updated_by = $3,
          restriction_updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [securityStatus, restrictionReason || null, myName, id]);

    await recordAuditLog({
      schoolId: vis.school_id,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'UPDATE_VISITOR_SECURITY_STATUS',
      module: 'ADMINISTRATION',
      recordId: id,
      description: `Altered security status for ${vis.name} (${vis.visitor_number}) to ${securityStatus}. Reason: ${restrictionReason || 'Administrative update'}`,
      req
    });

    return res.json({ success: true, message: `Visitor security status set to ${securityStatus}.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update security status.' });
  }
});

// Real-Time Campus Occupancy / Inside Campus
router.get('/visitors/inside', requireAuth, requirePermission('visitors.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  try {
    const result: any = await db.query(`
      SELECT vv.*, v.photo_url, v.organization, v.security_status
      FROM visitor_visits vv
      JOIN visitors v ON vv.visitor_id = v.id
      WHERE vv.school_id = $1 AND vv.status = 'INSIDE'
      ORDER BY vv.entry_time DESC
    `, [schoolId]);

    return res.json({
      count: result.rows.length,
      insideVisitors: result.rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load currently inside visitors.' });
  }
});

// Visits / Access Log
router.get('/visitors/visits', requireAuth, requirePermission('visitors.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';
  const { date, status, search } = req.query;

  try {
    let query = `
      SELECT vv.*, v.organization, v.security_status, v.id_type
      FROM visitor_visits vv
      JOIN visitors v ON vv.visitor_id = v.id
      WHERE vv.school_id = $1
    `;
    const params: any[] = [schoolId];

    if (date) {
      params.push(date);
      query += ` AND vv.date = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND vv.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${(search as string).toLowerCase()}%`);
      query += ` AND (LOWER(vv.visitor_name) LIKE $${params.length} OR vv.visitor_mobile LIKE $${params.length} OR LOWER(vv.pass_number) LIKE $${params.length} OR LOWER(vv.person_to_meet_name) LIKE $${params.length})`;
    }

    query += ` ORDER BY vv.entry_time DESC`;
    const result: any = await db.query(query, params);
    return res.json({ visits: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load visits log.' });
  }
});

// Check-In Visitor
router.post('/visitors/check-in', requireAuth, requirePermission('visitors.checkin'), async (req, res) => {
  const {
    schoolId,
    visitorId,
    name,
    mobile,
    organization,
    visitorType,
    purpose,
    personToMeetId,
    personToMeetName,
    departmentToVisit,
    appointmentId,
    vehicleNumber,
    deliveryVendor,
    deliveryType,
    deliveryPoNumber,
    deliveryItems,
    deliveryReceiverName,
    serviceProviderCompany,
    serviceAssetId,
    remarks
  } = req.body;

  const targetSchoolId = schoolId || req.user!.schoolId || 'sch_vvps';

  if (!purpose || !personToMeetName) {
    return res.status(400).json({ error: 'Purpose and Person to meet are required.' });
  }

  try {
    let finalVisitorId = visitorId;

    // Check or create visitor in master registry
    if (!finalVisitorId) {
      if (!name || !mobile) {
        return res.status(400).json({ error: 'Visitor name and mobile are required for new visitor.' });
      }
      // Check existing by mobile
      const exRes: any = await db.query(`SELECT id, security_status FROM visitors WHERE school_id = $1 AND mobile = $2 LIMIT 1`, [targetSchoolId, mobile.trim()]);
      if (exRes.rows.length > 0) {
        finalVisitorId = exRes.rows[0].id;
        if (exRes.rows[0].security_status === 'BLOCKED') {
          return res.status(403).json({ error: 'Access Denied: This visitor is BLOCKED on security grounds. Contact administration immediately.' });
        }
      } else {
        finalVisitorId = `vis_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const visNo = `VIS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
        await db.query(`
          INSERT INTO visitors (
            id, school_id, visitor_number, name, mobile, organization, visitor_type, security_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'CLEARED')
        `, [finalVisitorId, targetSchoolId, visNo, name.trim(), mobile.trim(), organization || null, visitorType || 'GUEST']);
      }
    } else {
      // Validate security status
      const vChk: any = await db.query(`SELECT security_status, restriction_reason FROM visitors WHERE id = $1`, [finalVisitorId]);
      if (vChk.rows.length > 0 && vChk.rows[0].security_status === 'BLOCKED') {
        return res.status(403).json({ error: `Access Denied: Visitor is BLOCKED. Reason: ${vChk.rows[0].restriction_reason || 'Security restrictions'}` });
      }
    }

    // Get visitor details
    const vData: any = await db.query(`SELECT * FROM visitors WHERE id = $1`, [finalVisitorId]);
    const vis = vData.rows[0];

    // Prevent double check-in (visitor already inside)
    const insideChk: any = await db.query(`SELECT id, pass_number FROM visitor_visits WHERE visitor_id = $1 AND status = 'INSIDE'`, [finalVisitorId]);
    if (insideChk.rows.length > 0) {
      return res.status(409).json({ error: `Visitor is already checked in with active Pass #${insideChk.rows[0].pass_number}. Please check them out first.` });
    }

    const visitId = `vst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const passNumber = `PASS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const receptionistName = `${req.user!.firstName} ${req.user!.lastName}`.trim() || req.user!.username;

    await db.query(`
      INSERT INTO visitor_visits (
        id, school_id, visitor_id, visitor_name, visitor_mobile, visitor_type,
        purpose, person_to_meet_id, person_to_meet_name, department_to_visit,
        appointment_id, vehicle_number, entry_time, pass_number, pass_returned,
        id_verified, checked_in_by_id, checked_in_by_name, status,
        delivery_vendor, delivery_type, delivery_po_number, delivery_items, delivery_receiver_name,
        service_provider_company, service_asset_id, remarks, date
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, CURRENT_TIMESTAMP, $13, false,
        true, $14, $15, 'INSIDE',
        $16, $17, $18, $19, $20,
        $21, $22, $23, CURRENT_DATE
      )
    `, [
      visitId,
      targetSchoolId,
      finalVisitorId,
      vis.name,
      vis.mobile,
      visitorType || vis.visitor_type,
      purpose.trim(),
      personToMeetId || null,
      personToMeetName.trim(),
      departmentToVisit || null,
      appointmentId || null,
      vehicleNumber ? vehicleNumber.trim().toUpperCase() : null,
      passNumber,
      req.user!.id,
      receptionistName,
      deliveryVendor || null,
      deliveryType || null,
      deliveryPoNumber || null,
      deliveryItems || null,
      deliveryReceiverName || null,
      serviceProviderCompany || null,
      serviceAssetId || null,
      remarks || null
    ]);

    // If linked to an appointment, mark appointment as COMPLETED / IN_PROGRESS
    if (appointmentId) {
      await db.query(`UPDATE appointments SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [appointmentId]);
    }

    await recordAuditLog({
      schoolId: targetSchoolId,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'VISITOR_CHECK_IN',
      module: 'ADMINISTRATION',
      recordId: visitId,
      description: `Visitor Check-In: ${vis.name} issued Pass #${passNumber} to meet ${personToMeetName}`,
      req
    });

    return res.status(201).json({
      success: true,
      visitId,
      passNumber,
      visitorName: vis.name,
      message: `Visitor checked in. Pass #${passNumber} generated.`
    });
  } catch (err: any) {
    console.error('[CHECK IN ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to check in visitor.' });
  }
});

// Check-Out Visitor
router.post('/visitors/check-out', requireAuth, requirePermission('visitors.checkout'), async (req, res) => {
  const { visitId, passNumber, remarks } = req.body;

  if (!visitId && !passNumber) {
    return res.status(400).json({ error: 'Visit ID or Pass Number is required for check-out.' });
  }

  try {
    let query = `SELECT * FROM visitor_visits WHERE status = 'INSIDE'`;
    const params: any[] = [];
    if (visitId) {
      params.push(visitId);
      query += ` AND id = $1`;
    } else {
      params.push(passNumber);
      query += ` AND pass_number = $1`;
    }

    const vRes: any = await db.query(query, params);
    if (vRes.rows.length === 0) {
      return res.status(404).json({ error: 'Active visitor check-in record not found or visitor already checked out.' });
    }
    const visit = vRes.rows[0];
    const receptionistName = `${req.user!.firstName} ${req.user!.lastName}`.trim() || req.user!.username;

    await db.query(`
      UPDATE visitor_visits
      SET exit_time = CURRENT_TIMESTAMP,
          status = 'CHECKED_OUT',
          pass_returned = true,
          checked_out_by_id = $1,
          checked_out_by_name = $2,
          remarks = COALESCE($3, remarks)
      WHERE id = $4
    `, [req.user!.id, receptionistName, remarks, visit.id]);

    await recordAuditLog({
      schoolId: visit.school_id,
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.roleName,
      action: 'VISITOR_CHECK_OUT',
      module: 'ADMINISTRATION',
      recordId: visit.id,
      description: `Visitor Check-Out: ${visit.visitor_name} returned Pass #${visit.pass_number}`,
      req
    });

    return res.json({ success: true, message: `Visitor ${visit.visitor_name} checked out cleanly. Pass returned.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to check out visitor.' });
  }
});

// -------------------------------------------------------------
// 12. ADMINISTRATIVE REPORTS
// -------------------------------------------------------------
router.get('/reports', requireAuth, requirePermission('administration.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId || 'sch_vvps';

  try {
    const [
      visitorStats,
      meetingStats,
      eventBudgetStats,
      venueUtilization
    ]: any[] = await Promise.all([
      db.query(`
        SELECT visitor_type, count(*) as count 
        FROM visitor_visits 
        WHERE school_id = $1 
        GROUP BY visitor_type 
        ORDER BY count DESC
      `, [schoolId]),
      db.query(`
        SELECT meeting_type, status, count(*) as count 
        FROM school_meetings 
        WHERE school_id = $1 
        GROUP BY meeting_type, status
      `, [schoolId]),
      db.query(`
        SELECT 
          sum(estimated_budget) as total_estimated,
          sum(approved_budget) as total_approved,
          sum(actual_expense) as total_actual
        FROM calendar_events 
        WHERE school_id = $1
      `, [schoolId]),
      db.query(`
        SELECT v.name, count(b.id) as booking_count 
        FROM event_venues v 
        LEFT JOIN venue_bookings b ON v.id = b.venue_id 
        WHERE v.school_id = $1 
        GROUP BY v.id, v.name 
        ORDER BY booking_count DESC
      `, [schoolId])
    ]);

    return res.json({
      visitorStats: visitorStats.rows,
      meetingStats: meetingStats.rows,
      budgetStats: eventBudgetStats.rows[0] || {},
      venueUtilization: venueUtilization.rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate administrative reports.' });
  }
});

export default router;
