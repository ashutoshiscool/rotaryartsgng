'use server';

import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireRole } from '@/lib/auth';

export async function getUsers() {
  try {
    await requireRole(['Admin', 'Director', 'General Manager', 'Project Manager']);
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt
    }).from(users);
    return { data: allUsers };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function createUser(data: any) {
  try {
    await requireRole(['Admin', 'Director', 'General Manager']);
    const { email, password, name, role } = data;
    
    if (!email || !password || !name || !role) {
      return { error: 'Missing required fields' };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await db.insert(users).values({
      email,
      passwordHash,
      name,
      role
    }).returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt
    });

    return { data: newUser[0] };
  } catch (error: any) {
    if (error.code === '23505') {
      return { error: 'Email already exists' };
    }
    return { error: String(error.message || error) };
  }
}
