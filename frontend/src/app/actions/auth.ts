'use server';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

export async function getUser() {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded; // { id, role, iat, exp }
  } catch (err) {
    return null;
  }
}

export async function checkAuth() {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['Admin', 'Booking Manager', 'Director', 'General Manager', 'Hospitality Manager', 'Project Manager', 'Technical Manager'])
});

export async function registerAction(data: any) {
  try {
    const parsed = registerSchema.parse(data);
    const existingUser = await db.select().from(users).where(eq(users.email, parsed.email)).limit(1);
    if (existingUser.length > 0) {
      return { error: 'Email already in use' };
    }
    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const [newUser] = await db.insert(users).values({
      email: parsed.email,
      passwordHash,
      name: parsed.name,
      role: parsed.role
    }).returning();
    
    const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '1d' });
    cookies().set('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' });
    
    return { success: true, token, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } };
  } catch (error: any) {
    console.error("loginAction ERROR:", error); return { error: String(error) };
  }
}

export async function loginAction(data: any) { console.error("loginAction START");
  try {
    const email = data.email?.trim().toLowerCase();
    const password = data.password?.trim();

    if (!email || !password) {
      return { error: 'Email and password are required' };
    }

    const userRecords = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = userRecords[0];
    
    if (!user) {
      return { error: 'Invalid credentials' };
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return { error: 'Invalid credentials' };
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    cookies().set('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' });
    
    return { success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  } catch (error: any) {
    console.error("loginAction ERROR:", error); return { error: String(error) };
  }
}

export async function logoutAction() {
  cookies().delete('token');
  return { success: true };
}
