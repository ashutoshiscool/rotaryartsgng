import { Router, Response } from 'express';
import { db } from '../db';
import { reminders } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET my reminders (Sorted by Due Date)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const myReminders = await db.select()
      .from(reminders)
      .where(eq(reminders.userId, req.user.id))
      .orderBy(desc(reminders.dueDate), desc(reminders.createdAt)); // Simple desc for now, or asc for future
    res.json(myReminders);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// POST new reminder
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { text, dueDate } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    const newRem = await db.insert(reminders).values({
      userId: req.user.id,
      text,
      isCompleted: 0,
      dueDate: dueDate ? new Date(dueDate) : null
    }).returning();

    res.json(newRem[0]);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

// PUT update reminder
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { isCompleted, text, dueDate } = req.body;

    const payload: any = {};
    if (isCompleted !== undefined) payload.isCompleted = isCompleted ? 1 : 0;
    if (text !== undefined) payload.text = text;
    if (dueDate !== undefined) payload.dueDate = dueDate ? new Date(dueDate) : null;

    const updated = await db.update(reminders)
      .set(payload)
      .where(and(eq(reminders.id, id), eq(reminders.userId, req.user.id)))
      .returning();

    if (updated.length === 0) return res.status(403).json({ error: 'Forbidden or not found' });
    res.json(updated[0]);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

// DELETE reminder
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const result = await db.delete(reminders)
      .where(and(eq(reminders.id, id), eq(reminders.userId, req.user.id)))
      .returning();

    if (result.length === 0) return res.status(403).json({ error: 'Forbidden or not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

export default router;
