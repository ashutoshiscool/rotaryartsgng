import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users, eventAssignments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

export async function getUser() {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userRecords = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
    return userRecords[0] || null;
  } catch (err) {
    return null;
  }
}

export async function checkAuth() {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function requireRole(roles: string[]) {
  const user = await checkAuth();
  if (!roles.includes(user.role)) {
    throw new Error('Insufficient permissions');
  }
  return user;
}

export async function checkEventAccess(eventId: number) {
  const user = await checkAuth();
  const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
  if (globalRoles.includes(user.role)) {
    return user;
  }

  const assignments = await db.select().from(eventAssignments).where(
    and(eq(eventAssignments.userId, user.id), eq(eventAssignments.eventId, eventId))
  );

  if (!assignments.length) {
    throw new Error('You are not assigned to this event');
  }

  return user;
}
