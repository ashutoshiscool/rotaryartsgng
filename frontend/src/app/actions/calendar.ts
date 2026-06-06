'use server';

import { db } from '@/db';
import { events, tasks, bookings, eventAssignments } from '@/db/schema';
import { eq, inArray, or } from 'drizzle-orm';
import { checkAuth } from '@/lib/auth';

export async function getCalendarItems() {
  try {
    const user = await checkAuth();
    const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
    const isGlobal = globalRoles.includes(user.role);

    const assignments = !isGlobal 
      ? await db.select().from(eventAssignments).where(eq(eventAssignments.userId, user.id))
      : [];
    
    let ownedEventIds: number[] = [];
    if (!isGlobal && user.role === 'Booking Manager') {
      const ownedBookings = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.userId, user.id));
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
          ? await db.select().from(tasks).where(or(inArray(tasks.eventId, eventIds), eq(tasks.assignedTo, user.id)))
          : await db.select().from(tasks).where(eq(tasks.assignedTo, user.id)));

    const allBookings = isGlobal
      ? await db.select().from(bookings)
      : [];

    const items: any[] = [];
    allEvents.forEach((e: any) => items.push({ id: `event-${e.id}`, type: 'event', title: e.title, date: e.date, status: e.status, entityId: e.id }));
    allTasks.forEach((t: any) => { if (t.deadline) items.push({ id: `task-${t.id}`, type: 'task', title: t.title, date: t.deadline, status: t.status, entityId: t.id }); });
    allBookings.forEach((b: any) => items.push({ id: `booking-${b.id}`, type: 'booking', title: `Booking: ${b.venue}`, date: b.date, status: b.status, entityId: b.id }));

    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return { data: items };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}
