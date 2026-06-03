import { Router, Request, Response } from 'express';
import { db } from '../db';
import { events, activityLogs, eventAssignments, users, artists, agencies, agents, bookings, technicalItems, hospitality, hospitalityRooms, tasks, documents, comments } from '../db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { authenticate, requireRole, AuthRequest, checkEventAccess } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Role Definitions (Strict 6-Role Set)
const allRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
// Global roles see all records platform-wide
const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
const managerRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];

router.get('/', requireRole(allRoles), async (req: AuthRequest, res: Response) => {
  try {
    let query = db.select({
      id: events.id,
      bookingId: events.bookingId,
      title: events.title,
      date: events.date,
      status: events.status,
      organization: events.organization,
      createdAt: events.createdAt,
      artistName: artists.name,
      agencyName: agencies.name,
      agentName: agents.name
    })
    .from(events)
    .leftJoin(bookings, eq(events.bookingId, bookings.id))
    .leftJoin(artists, eq(bookings.artistId, artists.id))
    .leftJoin(agencies, eq(bookings.agencyId, agencies.id))
    .leftJoin(agents, eq(bookings.agentId, agents.id));
    
    if (!globalRoles.includes(req.user.role)) {
      // 1. Check for assignments
      const assignments = await db.select().from(eventAssignments).where(eq(eventAssignments.userId, req.user.id));
      const eventIds = assignments.map(a => a.eventId);
      
      // 2. Check for ownership (if Booking Manager specifically, they see events from their bookings)
      const ownedBookings = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.userId, req.user.id));
      const ownedEventIds = await db.select({ id: events.id }).from(events).where(inArray(events.bookingId, ownedBookings.map(b => b.id).concat([-1])));
      const finalEventIds = [...new Set([...eventIds, ...ownedEventIds.map(e => e.id)])];

      if (finalEventIds.length > 0) {
        query.where(inArray(events.id, finalEventIds));
      } else {
        query.where(eq(events.id, -1)); // Return empty
      }
    }
    
    const allEvents = await query;
    res.json(allEvents);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/:id', requireRole(allRoles), checkEventAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  const event = await db.select({
    id: events.id,
    bookingId: events.bookingId,
    title: events.title,
    date: events.date,
    status: events.status,
    organization: events.organization,
    createdAt: events.createdAt,
    artistName: artists.name,
    agencyName: agencies.name,
    agentName: agents.name,
    agentEmail: agents.email
  })
  .from(events)
  .leftJoin(bookings, eq(events.bookingId, bookings.id))
  .leftJoin(artists, eq(bookings.artistId, artists.id))
  .leftJoin(agencies, eq(bookings.agencyId, agencies.id))
  .leftJoin(agents, eq(bookings.agentId, agents.id))
  .where(eq(events.id, parseInt(req.params.id as string)))
  .limit(1);

  if (!event.length) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  res.json(event[0]);
});

// Assignment Management
router.get('/:id/assignments', checkEventAccess, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string);
  const assignments = await db.select({
    id: eventAssignments.id,
    userId: eventAssignments.userId,
    userName: users.name,
    userRole: users.role
  })
  .from(eventAssignments)
  .leftJoin(users, eq(eventAssignments.userId, users.id))
  .where(eq(eventAssignments.eventId, id));
  
  res.json(assignments);
});

router.post('/:id/assignments', requireRole(globalRoles), async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string);
  const { userId } = req.body;
  
  const existing = await db.select().from(eventAssignments).where(and(eq(eventAssignments.eventId, id), eq(eventAssignments.userId, userId)));
  if (existing.length) {
    res.status(400).json({ error: 'Already assigned' });
    return;
  }
  
  const newAssignment = await db.insert(eventAssignments).values({
    eventId: id,
    userId: userId,
    assignedBy: req.user.id
  }).returning();
  
  res.json(newAssignment[0]);
});

router.delete('/:id/assignments/:userId', requireRole(globalRoles), async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id as string);
    const userId = parseInt(req.params.userId as string);
    await db.delete(eventAssignments).where(and(eq(eventAssignments.eventId, id), eq(eventAssignments.userId, userId)));
    res.json({ success: true });
});

router.post('/', requireRole(managerRoles), async (req: AuthRequest, res: Response) => {
  try {
    const { assignedUserIds, ...eventData } = req.body;
    const payload = { ...eventData };
    if (payload.date) payload.date = new Date(payload.date);
    if (!payload.status) payload.status = 'Upcoming';

    const [newEvent] = await db.insert(events).values(payload).returning();

    // Handle initial assignments
    if (assignedUserIds && Array.isArray(assignedUserIds)) {
      for (const uid of assignedUserIds) {
        await db.insert(eventAssignments).values({
          eventId: newEvent.id,
          userId: uid,
          assignedBy: req.user.id
        });
      }
    }

    await db.insert(activityLogs).values({
      userId: req.user.id,
      action: 'CREATED_EVENT',
      entityType: 'event',
      entityId: newEvent.id,
      details: payload
    });

    res.json(newEvent);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

router.put('/:id', requireRole(managerRoles), checkEventAccess, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const payload = { ...req.body };
    if (payload.date) payload.date = new Date(payload.date);
    
    const oldQuery = await db.select().from(events).where(eq(events.id, id)).limit(1);
    const oldEvent = oldQuery[0];

    const updated = await db.update(events).set(payload).where(eq(events.id, id)).returning();
    
    await db.insert(activityLogs).values({
      userId: req.user.id,
      action: 'MODIFIED_EVENT',
      entityType: 'event',
      entityId: id,
      details: { old: oldEvent, new: payload }
    });

    res.json(updated[0]);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

router.delete('/:id', requireRole(globalRoles), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    
    // 1. Cascade cleanup for event dependencies
    await db.delete(technicalItems).where(eq(technicalItems.eventId, id));
    
    const hospRecords = await db.select().from(hospitality).where(eq(hospitality.eventId, id));
    for (const h of hospRecords) {
      await db.delete(hospitalityRooms).where(eq(hospitalityRooms.hospitalityId, h.id));
    }
    await db.delete(hospitality).where(eq(hospitality.eventId, id));
    
    await db.delete(tasks).where(eq(tasks.eventId, id));
    await db.delete(documents).where(eq(documents.eventId, id));
    await db.delete(eventAssignments).where(eq(eventAssignments.eventId, id));
    await db.delete(comments).where(and(eq(comments.entityType, 'event'), eq(comments.entityId, id)));

    // 2. Delete the event itself
    const result = await db.delete(events).where(eq(events.id, id)).returning();
    
    if (result.length === 0) {
      res.status(404).json({ error: 'Event does not exist.' });
      return;
    }
    
    await db.insert(activityLogs).values({
      userId: req.user.id,
      action: 'DELETED_EVENT',
      entityType: 'event',
      entityId: id,
      details: { timestamp: new Date() }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('CRITICAL: Event deletion failure:', error);
    res.status(400).json({ error: String(error) });
  }
});

export default router;
