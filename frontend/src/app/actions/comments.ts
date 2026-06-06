'use server';

import { db } from '@/db';
import { comments, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkAuth, checkEventAccess } from '@/lib/auth';

export async function getComments(entityType: string, entityId: number) {
  try {
    await checkAuth();
    if (entityType === 'event') {
      await checkEventAccess(entityId);
    }

    const allComments = await db.select({
      id: comments.id,
      userId: comments.userId,
      entityType: comments.entityType,
      entityId: comments.entityId,
      content: comments.content,
      createdAt: comments.createdAt,
      userName: users.name,
      userRole: users.role,
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(
      and(
        eq(comments.entityType, entityType),
        eq(comments.entityId, entityId)
      )
    );
    return { data: allComments };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}

export async function createComment(data: any) {
  try {
    const user = await checkAuth();
    const { entityType, entityId, content } = data;
    
    if (entityType === 'event') {
      await checkEventAccess(entityId);
    }
    
    const newComment = await db.insert(comments).values({
      userId: user.id,
      entityType,
      entityId,
      content,
    }).returning();
    
    return { data: newComment[0] };
  } catch (error: any) {
    return { error: String(error.message || error) };
  }
}
