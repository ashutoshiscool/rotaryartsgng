'use server';

import { db } from '@/db';
import { artists } from '@/db/schema';
import { checkAuth } from '@/lib/auth';

export async function getArtists() {
  try {
    await checkAuth();
    const allArtists = await db.select().from(artists);
    return { data: allArtists };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function createArtist(data: any) {
  try {
    await checkAuth();
    const newArtist = await db.insert(artists).values(data).returning();
    return { data: newArtist[0] };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}
