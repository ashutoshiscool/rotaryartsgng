'use server';

import { db } from '@/db';
import { hospitality, hospitalityRooms, activityLogs, events, eventAssignments, bookings } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requireRole, checkEventAccess, checkAuth } from '@/lib/auth';

const allHospRoles = ['Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Hospitality Manager'];
const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];

export async function getHospitalityList() {
  try {
    const user = await requireRole(allHospRoles);
    const isAdmin = globalRoles.includes(user.role);

    let eventIds: number[] = [];
    if (!isAdmin) {
      const assignments = await db.select().from(eventAssignments).where(eq(eventAssignments.userId, user.id));
      eventIds = assignments.map(a => a.eventId);
      
      if (user.role === 'Booking Manager') {
        const ownedB = await db.select().from(bookings).where(eq(bookings.userId, user.id));
        const ownedE = await db.select({ id: events.id }).from(events).where(inArray(events.bookingId, ownedB.map(b => b.id).concat([-1])));
        eventIds = [...new Set([...eventIds, ...ownedE.map(e => e.id)])];
      }
    }

    let query = db.select({
      id: hospitality.id,
      eventId: hospitality.eventId,
      eventTitle: events.title,
      date: events.date,
      hotelName: hospitality.hotelName,
      travelFlights: hospitality.travelFlights,
      groundDriverContact: hospitality.groundDriverContact,
      groundRoute: hospitality.groundRoute,
      groundTime: hospitality.groundTime,
      amenities: hospitality.amenities
    })
    .from(hospitality)
    .leftJoin(events, eq(hospitality.eventId, events.id));
    
    if (!isAdmin) {
      if (eventIds.length > 0) {
        query.where(inArray(hospitality.eventId, eventIds));
      } else {
        query.where(eq(hospitality.id, -1));
      }
    }

    const allHosp = await query;
    return { data: allHosp };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function getHospitalityByEventId(eventId: number) {
  try {
    await requireRole(allHospRoles);
    await checkEventAccess(eventId);
    const records = await db.select().from(hospitality).where(eq(hospitality.eventId, eventId));
    
    if(!records.length) {
       const newHosp = await db.insert(hospitality).values({
         eventId,
         hotelName: 'TBD',
         transportDetails: 'Airport pickup required',
         amenities: 'Standard rider'
       }).returning();
       
       return { data: { ...newHosp[0], rooms: [] } };
    }
    
    const hosp = records[0];
    const rooms = await db.select().from(hospitalityRooms).where(eq(hospitalityRooms.hospitalityId, hosp.id));
    return { data: { ...hosp, rooms } };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function updateHospitality(id: number, payload: any) {
  try {
    const user = await requireRole(allHospRoles);
    delete payload.rooms;
    
    const targetRec = await db.select().from(hospitality).where(eq(hospitality.id, id)).limit(1);
    const eventId = targetRec[0]?.eventId;

    if (eventId) {
      if (!globalRoles.includes(user.role)) {
        const assignments = await db.select().from(eventAssignments).where(
          and(eq(eventAssignments.userId, user.id), eq(eventAssignments.eventId, eventId))
        );
        if (!assignments.length) return { error: 'You are not assigned to this event' };
      }
    }

    const oldRec = targetRec[0];
    const updated = await db.update(hospitality).set(payload).where(eq(hospitality.id, id)).returning();
    
    await db.insert(activityLogs).values({
      userId: user.id,
      action: 'MODIFIED_HOSPITALITY',
      entityType: 'hospitality',
      entityId: id,
      details: { old: oldRec, new: payload }
    });

    return { data: updated[0] };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function createHospitalityRoom(hospitalityId: number, roomType: string, guestName: string) {
  try {
    const user = await requireRole(allHospRoles);
    
    const hosp = await db.select().from(hospitality).where(eq(hospitality.id, hospitalityId)).limit(1);
    const eventId = hosp[0]?.eventId;
    
    if (eventId) {
      if (!globalRoles.includes(user.role)) {
        const assignments = await db.select().from(eventAssignments).where(
          and(eq(eventAssignments.userId, user.id), eq(eventAssignments.eventId, eventId))
        );
        if (!assignments.length) return { error: 'Access denied' };
      }
    }

    const newRoom = await db.insert(hospitalityRooms).values({ hospitalityId, roomType, guestName }).returning();
    return { data: newRoom[0] };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function deleteHospitalityRoom(id: number) {
  try {
    const user = await requireRole(allHospRoles);
    const roomQ = await db.select().from(hospitalityRooms).where(eq(hospitalityRooms.id, id)).limit(1);
    if (!roomQ[0]) return { data: { success: true } };

    const hosp = await db.select().from(hospitality).where(eq(hospitality.id, roomQ[0].hospitalityId)).limit(1);
    const eventId = hosp[0]?.eventId;

    if (eventId) {
      if (!globalRoles.includes(user.role)) {
        const assignments = await db.select().from(eventAssignments).where(
          and(eq(eventAssignments.userId, user.id), eq(eventAssignments.eventId, eventId))
        );
        if (!assignments.length) return { error: 'Access denied' };
      }
    }

    await db.delete(hospitalityRooms).where(eq(hospitalityRooms.id, id));
    return { data: { success: true } };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}
