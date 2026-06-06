'use server';

import { db } from '@/db';
import { tasks, activityLogs, users, eventAssignments } from '@/db/schema';
import { eq, or, inArray, and } from 'drizzle-orm';
import { requireRole, checkEventAccess, checkAuth } from '@/lib/auth';

const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];

export async function getTasks() {
  try {
    const user = await checkAuth();
    
    let query = db.select({
      id: tasks.id,
      eventId: tasks.eventId,
      title: tasks.title,
      status: tasks.status,
      assignedTo: tasks.assignedTo,
      assignedToName: users.name,
      deadline: tasks.deadline,
      linkedEntity: tasks.linkedEntity,
      linkedEntityId: tasks.linkedEntityId,
    }).from(tasks)
    .leftJoin(users, eq(tasks.assignedTo, users.id));

    if (!globalRoles.includes(user.role)) {
      const assignments = await db.select().from(eventAssignments).where(eq(eventAssignments.userId, user.id));
      const eventIds = assignments.map(a => a.eventId);
      
      if (eventIds.length > 0) {
        query.where(or(
          eq(tasks.assignedTo, user.id),
          inArray(tasks.eventId, eventIds)
        ));
      } else {
        query.where(eq(tasks.assignedTo, user.id));
      }
    }

    const filteredTasks = await query;
    return { data: filteredTasks };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function getEventTasks(eventId: number) {
  try {
    await checkEventAccess(eventId);
    const eventTasks = await db.select().from(tasks).where(eq(tasks.eventId, eventId));
    return { data: eventTasks };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function createTask(data: any) {
  try {
    const user = await checkAuth();
    if (data.eventId) {
      await checkEventAccess(data.eventId);
    }
    
    const payload = { ...data };
    if (payload.deadline) payload.deadline = new Date(payload.deadline);
    const newTask = await db.insert(tasks).values(payload).returning();

    await db.insert(activityLogs).values({
      userId: user.id,
      action: 'CREATED_TASK',
      entityType: 'task',
      entityId: newTask[0].id,
      details: payload,
    });

    return { data: newTask[0] };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function updateTask(id: number, data: any) {
  try {
    const user = await checkAuth();
    const payload = { ...data };
    if (payload.deadline) payload.deadline = new Date(payload.deadline);

    const oldQuery = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!oldQuery.length) {
      return { error: 'Task not found' };
    }

    const targetTask = oldQuery[0];
    const eventId = targetTask.eventId;
    const isAssigned = targetTask.assignedTo === user.id;

    if (eventId) {
      if (!globalRoles.includes(user.role) && !isAssigned) {
        const assignments = await db.select().from(eventAssignments).where(
          and(eq(eventAssignments.userId, user.id), eq(eventAssignments.eventId, eventId))
        );
        if (!assignments.length) return { error: 'You are not assigned to this event' };
      }
    } else if (!isAssigned && !globalRoles.includes(user.role)) {
       return { error: 'Access denied' };
    }

    const updated = await db.update(tasks).set(payload).where(eq(tasks.id, id)).returning();

    await db.insert(activityLogs).values({
      userId: user.id,
      action: 'MODIFIED_TASK',
      entityType: 'task',
      entityId: id,
      details: { old: oldQuery[0], new: payload },
    });

    return { data: updated[0] };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function deleteTask(id: number) {
  try {
    const user = await checkAuth();
    const targetTask = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!targetTask.length) return { data: { success: true } };

    const eventId = targetTask[0].eventId;
    if (eventId) {
      if (!globalRoles.includes(user.role)) {
        const assignments = await db.select().from(eventAssignments).where(
          and(eq(eventAssignments.userId, user.id), eq(eventAssignments.eventId, eventId))
        );
        if (!assignments.length) return { error: 'Access denied' };
      }
    }

    await db.delete(tasks).where(eq(tasks.id, id));
    return { data: { success: true } };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}
