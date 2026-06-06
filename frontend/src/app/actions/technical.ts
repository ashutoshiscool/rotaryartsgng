'use server';

import { db } from '@/db';
import { technicalItems, activityLogs, eventAssignments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireRole, checkEventAccess, checkAuth } from '@/lib/auth';

const allTechRoles = ['Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager'];
const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];

export async function getEventTechnicalItems(eventId: number) {
  try {
    await requireRole(allTechRoles);
    await checkEventAccess(eventId);
    const items = await db.select().from(technicalItems).where(eq(technicalItems.eventId, eventId));
    return { data: items };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function updateTechnicalItem(id: number, payload: any) {
  try {
    const user = await requireRole(allTechRoles);
    const targetItem = await db.select().from(technicalItems).where(eq(technicalItems.id, id)).limit(1);
    const eventId = targetItem[0]?.eventId;
    
    if (eventId) {
      if (!globalRoles.includes(user.role)) {
        const assignments = await db.select().from(eventAssignments).where(
          and(eq(eventAssignments.userId, user.id), eq(eventAssignments.eventId, eventId))
        );
        if (!assignments.length) {
          return { error: 'You are not assigned to this event' };
        }
      }
    }

    const oldItem = targetItem[0];
    const updated = await db.update(technicalItems).set(payload).where(eq(technicalItems.id, id)).returning();
    
    await db.insert(activityLogs).values({
      userId: user.id,
      action: 'MODIFIED_TECHNICAL_ITEM',
      entityType: 'technical_item',
      entityId: id,
      details: { old: oldItem, new: payload }
    });

    return { data: updated[0] };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function createTechnicalItem(payload: any) {
   try {
     const user = await requireRole(allTechRoles);
     await checkEventAccess(payload.eventId);
     const newItem = await db.insert(technicalItems).values(payload).returning();
     
     await db.insert(activityLogs).values({
       userId: user.id,
       action: 'CREATED_TECHNICAL_ITEM',
       entityType: 'technical_item',
       entityId: newItem[0].id,
       details: payload
     });
 
     return { data: newItem[0] };
   } catch (error: any) {
     return { error: String(error.message || error) };
   }
}

export async function deleteTechnicalItem(id: number) {
  try {
    const user = await requireRole(allTechRoles);
    const targetItem = await db.select().from(technicalItems).where(eq(technicalItems.id, id)).limit(1);
    const eventId = targetItem[0]?.eventId;

    if (eventId) {
      if (!globalRoles.includes(user.role)) {
        const assignments = await db.select().from(eventAssignments).where(
          and(eq(eventAssignments.userId, user.id), eq(eventAssignments.eventId, eventId))
        );
        if (!assignments.length) {
          return { error: 'Access denied' };
        }
      }
    }

    await db.delete(technicalItems).where(eq(technicalItems.id, id));
    
    await db.insert(activityLogs).values({
      userId: user.id,
      action: 'DELETED_TECHNICAL_ITEM',
      entityType: 'technical_item',
      entityId: id,
      details: { timestamp: new Date() }
    });

    return { data: { success: true } };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}
