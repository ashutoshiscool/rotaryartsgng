'use server';

import { db } from '@/db';
import { documents, activityLogs, eventAssignments, tasks, bookings, events } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { checkAuth, checkEventAccess } from '@/lib/auth';
import { uploadToSupabase } from '@/lib/supabase';

const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];

export async function getDocuments() {
  try {
    const user = await checkAuth();
    let query = db.select().from(documents);

    if (!globalRoles.includes(user.role)) {
      const assignments = await db.select().from(eventAssignments).where(eq(eventAssignments.userId, user.id));
      const eventIds = assignments.map(a => a.eventId);
      
      let ownedEventIds: number[] = [];
      if (user.role === 'Booking Manager') {
        const ownedB = await db.select().from(bookings).where(eq(bookings.userId, user.id));
        const ownedE = await db.select({ id: events.id }).from(events).where(inArray(events.bookingId, ownedB.map(b => b.id).concat([-1])));
        ownedEventIds = ownedE.map(e => e.id);
      }

      const finalEventIds = [...new Set([...eventIds, ...ownedEventIds])];

      if (finalEventIds.length > 0) {
        query.where(inArray(documents.eventId, finalEventIds));
      } else {
        query.where(eq(documents.id, -1));
      }
    }

    const allDocs = await query;
    return { data: allDocs };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function uploadDocument(formData: FormData) {
  try {
    const user = await checkAuth();
    
    const eventId = formData.get('eventId') as string;
    if (eventId) {
      await checkEventAccess(parseInt(eventId));
    }

    const name = formData.get('name') as string;
    const category = formData.get('category') as string;
    const entityType = formData.get('entityType') as string;
    const entityId = formData.get('entityId') as string;
    const taskDataStr = formData.get('task') as string;
    const file = formData.get('file') as File | null;
    let fileUrl = formData.get('url') as string;
    
    let taskData = null;
    if (taskDataStr) {
      try {
        taskData = JSON.parse(taskDataStr);
      } catch (e) {
        console.error('Invalid task JSON', e);
      }
    }

    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const uploadedUrl = await uploadToSupabase(buffer, file.name, file.type);
      if (uploadedUrl) {
        fileUrl = uploadedUrl;
      } else {
        return { error: 'Failed to upload to Supabase' };
      }
    }

    if (!fileUrl) {
      return { error: 'No file uploaded or URL provided' };
    }

    const docPayload = {
      name: name || (file ? file.name : 'Unnamed Doc'),
      category,
      eventId: eventId ? parseInt(eventId) : null,
      entityType,
      entityId: entityId ? parseInt(entityId) : null,
      url: fileUrl,
    };

    const [newDoc] = await db.insert(documents).values(docPayload as any).returning();

    await db.insert(activityLogs).values({
      userId: user.id,
      action: 'UPLOADED_DOCUMENT',
      entityType: 'document',
      entityId: newDoc.id,
      details: docPayload,
    });

    if (taskData && taskData.title) {
      const [newTask] = await db.insert(tasks).values({
        eventId: newDoc.eventId,
        title: taskData.title,
        assignedTo: taskData.assignedTo,
        deadline: taskData.deadline ? new Date(taskData.deadline) : null,
        linkedEntity: 'document',
        linkedEntityId: newDoc.id,
        status: 'Todo'
      }).returning();

      await db.insert(activityLogs).values({
        userId: user.id,
        action: 'CREATED_LINKED_TASK',
        entityType: 'task',
        entityId: newTask.id,
        details: { linkedTo: 'document', documentId: newDoc.id },
      });
    }

    return { data: newDoc };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}
