'use server';

import { db } from '@/db';
import { users, bookings, events, tasks, documents, activityLogs, systemSettings, companies } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireRole, checkAuth } from '@/lib/auth';

const adminRoles = ['Admin', 'Director', 'General Manager'];

export async function getAdminStats() {
  try {
    await requireRole(adminRoles);
    const [allBookings, allEvents, allTasks, allDocs, allUsers] = await Promise.all([
      db.select().from(bookings),
      db.select().from(events),
      db.select().from(tasks),
      db.select().from(documents),
      db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt }).from(users),
    ]);
    return { data: {
      bookings: allBookings.length,
      events: allEvents.length,
      tasks: allTasks.length,
      documents: allDocs.length,
      users: allUsers.length,
    } };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function getAdminBookings() {
  try {
    await requireRole(adminRoles);
    return { data: await db.select().from(bookings) };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function getAdminEvents() {
  try {
    await requireRole(adminRoles);
    return { data: await db.select().from(events) };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function getAdminTasks() {
  try {
    await requireRole(adminRoles);
    return { data: await db.select().from(tasks) };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function getAdminDocuments() {
  try {
    await requireRole(adminRoles);
    return { data: await db.select().from(documents) };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function getActivityLogs() {
  try {
    await requireRole(adminRoles);
    const logs = await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(200);
    return { data: logs };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function getSystemSettings() {
  try {
    await requireRole(adminRoles);
    const settings = await db.select().from(systemSettings).limit(1);
    if (!settings.length) {
      const def = await db.insert(systemSettings).values({}).returning();
      return { data: def[0] };
    }
    return { data: settings[0] };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function updateSystemSettings(payload: any) {
  try {
    await requireRole(adminRoles);
    const settings = await db.select().from(systemSettings).limit(1);
    if (!settings.length) {
      const created = await db.insert(systemSettings).values(payload).returning();
      return { data: created[0] };
    }
    const updated = await db.update(systemSettings).set(payload).where(eq(systemSettings.id, settings[0].id)).returning();
    return { data: updated[0] };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function getCompanies() {
  try {
    await requireRole(adminRoles);
    return { data: await db.select().from(companies) };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function createCompany(payload: any) {
  try {
    await requireRole(adminRoles);
    const c = await db.insert(companies).values(payload).returning();
    return { data: c[0] };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function deleteUser(id: number) {
  try {
    const user = await requireRole(adminRoles);
    if (id === user.id) {
      return { error: 'Cannot delete yourself' };
    }
    await db.delete(users).where(eq(users.id, id));
    return { data: { success: true } };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}
