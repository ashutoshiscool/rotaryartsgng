'use server';

import { db } from '@/db';
import { events, activityLogs, eventAssignments, users, artists, agencies, agents, bookings, technicalItems, hospitality, hospitalityRooms, tasks, documents, comments } from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { requireRole, checkEventAccess, checkAuth } from '@/lib/auth';

const allRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
const managerRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];

export async function getEvents() {
  try {
    const user = await requireRole(allRoles);
    
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
    
    if (!globalRoles.includes(user.role)) {
      const assignments = await db.select().from(eventAssignments).where(eq(eventAssignments.userId, user.id));
      const eventIds = assignments.map(a => a.eventId);
      
      const ownedBookings = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.userId, user.id));
      const ownedEventIds = await db.select({ id: events.id }).from(events).where(inArray(events.bookingId, ownedBookings.map(b => b.id).concat([-1])));
      const finalEventIds = [...new Set([...eventIds, ...ownedEventIds.map(e => e.id)])];

      if (finalEventIds.length > 0) {
        query.where(inArray(events.id, finalEventIds));
      } else {
        query.where(eq(events.id, -1));
      }
    }
    
    const allEvents = await query;
    return { data: allEvents };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function getEventById(id: number) {
  try {
    const user = await requireRole(allRoles);
    await checkEventAccess(id);
    
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
    .where(eq(events.id, id))
    .limit(1);

    if (!event.length) return { error: 'Event not found' };
    return { data: event[0] };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function createEvent(eventData: any, assignedUserIds?: number[]) {
  try {
    const user = await requireRole(managerRoles);
    const payload = { ...eventData };
    if (payload.date) payload.date = new Date(payload.date);
    if (!payload.status) payload.status = 'Upcoming';

    const [newEvent] = await db.insert(events).values(payload).returning();

    if (assignedUserIds && Array.isArray(assignedUserIds)) {
      for (const uid of assignedUserIds) {
        await db.insert(eventAssignments).values({
          eventId: newEvent.id,
          userId: uid,
          assignedBy: user.id
        });
      }
    }

    await db.insert(activityLogs).values({
      userId: user.id,
      action: 'CREATED_EVENT',
      entityType: 'event',
      entityId: newEvent.id,
      details: payload
    });

    return { data: newEvent };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function updateEvent(id: number, payload: any) {
  try {
    const user = await requireRole(managerRoles);
    await checkEventAccess(id);
    
    if (payload.date) payload.date = new Date(payload.date);
    
    const oldQuery = await db.select().from(events).where(eq(events.id, id)).limit(1);
    const oldEvent = oldQuery[0];

    const updated = await db.update(events).set(payload).where(eq(events.id, id)).returning();
    
    await db.insert(activityLogs).values({
      userId: user.id,
      action: 'MODIFIED_EVENT',
      entityType: 'event',
      entityId: id,
      details: { old: oldEvent, new: payload }
    });

    return { data: updated[0] };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function deleteEvent(id: number) {
  try {
    const user = await requireRole(globalRoles);
    
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

    const result = await db.delete(events).where(eq(events.id, id)).returning();
    if (result.length === 0) return { error: 'Event does not exist.' };
    
    await db.insert(activityLogs).values({
      userId: user.id,
      action: 'DELETED_EVENT',
      entityType: 'event',
      entityId: id,
      details: { timestamp: new Date() }
    });

    return { data: { success: true } };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function getEventAssignments(id: number) {
  try {
    await checkEventAccess(id);
    const assignments = await db.select({
      id: eventAssignments.id,
      userId: eventAssignments.userId,
      userName: users.name,
      userRole: users.role
    })
    .from(eventAssignments)
    .leftJoin(users, eq(eventAssignments.userId, users.id))
    .where(eq(eventAssignments.eventId, id));
    
    return { data: assignments };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function addEventAssignment(id: number, userId: number) {
  try {
    const user = await requireRole(globalRoles);
    const existing = await db.select().from(eventAssignments).where(and(eq(eventAssignments.eventId, id), eq(eventAssignments.userId, userId)));
    if (existing.length) return { error: 'Already assigned' };
    
    const newAssignment = await db.insert(eventAssignments).values({
      eventId: id,
      userId: userId,
      assignedBy: user.id
    }).returning();
    
    return { data: newAssignment[0] };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function removeEventAssignment(id: number, userId: number) {
  try {
    await requireRole(globalRoles);
    await db.delete(eventAssignments).where(and(eq(eventAssignments.eventId, id), eq(eventAssignments.userId, userId)));
    return { data: { success: true } };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}
