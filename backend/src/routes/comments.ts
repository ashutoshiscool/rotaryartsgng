import { Router, Response, NextFunction } from 'express';
import { db } from '../db';
import { comments, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticate, AuthRequest, checkEventAccess } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Middleware adapter for comments since they use entityId instead of id
const checkCommentAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { entityType, entityId } = req.params;
  const eid = entityType === 'event' ? parseInt(entityId as string) : null;
  if (eid) {
    req.params.id = String(eid); // temporary map for the middleware
    return checkEventAccess(req, res, next);
  }
  next();
};

// GET comments for an entity (booking, event, task)
router.get('/:entityType/:entityId', checkCommentAccess, async (req: AuthRequest, res: Response) => {
  try {
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
        eq(comments.entityType, req.params.entityType as string),
        eq(comments.entityId, parseInt(req.params.entityId as string))
      )
    );
    res.json(allComments);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// POST new comment
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { entityType, entityId, content } = req.body;
    const newComment = await db.insert(comments).values({
      userId: req.user.id,
      entityType,
      entityId,
      content,
    }).returning();
    res.json(newComment[0]);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

export default router;
