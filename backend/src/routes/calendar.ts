import { Router, Response } from 'express';
import { db } from '../db';
import { events, tasks, bookings, eventAssignments } from '../db/schema';
import { eq, inArray, or } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET combined calendar data
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
    const isGlobal = globalRoles.includes(req.user.role);

    // 1. Get assigned event IDs
    const assignments = !isGlobal 
      ? await db.select().from(eventAssignments).where(eq(eventAssignments.userId, req.user.id))
      : [];
    
    // 2. Get owned booking event IDs (for Booking Managers)
    let ownedEventIds: number[] = [];
    if (!isGlobal && req.user.role === 'Booking Manager') {
      const ownedBookings = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.userId, req.user.id));
      const ownedEvents = await db.select({ id: events.id }).from(events).where(inArray(events.bookingId, ownedBookings.map(b => b.id).concat([-1])));
      ownedEventIds = ownedEvents.map(e => e.id);
    }

    const eventIds = [...new Set([...assignments.map(a => a.eventId), ...ownedEventIds])];

    const allEvents = isGlobal 
      ? await db.select().from(events) 
      : (eventIds.length > 0 ? await db.select().from(events).where(inArray(events.id, eventIds)) : []);

    const allTasks = isGlobal
      ? await db.select().from(tasks)
      : (eventIds.length > 0 
          ? await db.select().from(tasks).where(or(inArray(tasks.eventId, eventIds), eq(tasks.assignedTo, req.user.id)))
          : await db.select().from(tasks).where(eq(tasks.assignedTo, req.user.id)));

    const allBookings = isGlobal
      ? await db.select().from(bookings)
      : [];

    const items: any[] = [];
    allEvents.forEach((e: any) => items.push({ id: `event-${e.id}`, type: 'event', title: e.title, date: e.date, status: e.status, entityId: e.id }));
    allTasks.forEach((t: any) => { if (t.deadline) items.push({ id: `task-${t.id}`, type: 'task', title: t.title, date: t.deadline, status: t.status, entityId: t.id }); });
    allBookings.forEach((b: any) => items.push({ id: `booking-${b.id}`, type: 'booking', title: `Booking: ${b.venue}`, date: b.date, status: b.status, entityId: b.id }));

    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;
