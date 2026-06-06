'use server';

import { db } from '@/db';
import { reminders } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { checkAuth } from '@/lib/auth';

export async function getReminders() {
  try {
    const user = await checkAuth();
    const myReminders = await db.select()
      .from(reminders)
      .where(eq(reminders.userId, user.id))
      .orderBy(desc(reminders.dueDate), desc(reminders.createdAt));
    return { data: myReminders };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function createReminder(data: any) {
  try {
    const user = await checkAuth();
    const { text, dueDate } = data;
    if (!text) return { error: 'Text is required' };

    const newRem = await db.insert(reminders).values({
      userId: user.id,
      text,
      isCompleted: 0,
      dueDate: dueDate ? new Date(dueDate) : null
    }).returning();

    return { data: newRem[0] };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function updateReminder(id: number, data: any) {
  try {
    const user = await checkAuth();
    const { isCompleted, text, dueDate } = data;

    const payload: any = {};
    if (isCompleted !== undefined) payload.isCompleted = isCompleted ? 1 : 0;
    if (text !== undefined) payload.text = text;
    if (dueDate !== undefined) payload.dueDate = dueDate ? new Date(dueDate) : null;

    const updated = await db.update(reminders)
      .set(payload)
      .where(and(eq(reminders.id, id), eq(reminders.userId, user.id)))
      .returning();

    if (updated.length === 0) return { error: 'Forbidden or not found' };
    return { data: updated[0] };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function deleteReminder(id: number) {
  try {
    const user = await checkAuth();
    const result = await db.delete(reminders)
      .where(and(eq(reminders.id, id), eq(reminders.userId, user.id)))
      .returning();

    if (result.length === 0) return { error: 'Forbidden or not found' };
    return { data: { success: true } };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}
