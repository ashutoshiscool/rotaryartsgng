import { Router, Response } from 'express';
import { db } from '../db';
import { users, bookings, events, tasks, documents, activityLogs, systemSettings, companies } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(requireRole(['Admin', 'Director', 'General Manager']));

// ── Dashboard aggregation ──
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const [allBookings, allEvents, allTasks, allDocs, allUsers] = await Promise.all([
      db.select().from(bookings),
      db.select().from(events),
      db.select().from(tasks),
      db.select().from(documents),
      db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt }).from(users),
    ]);
    res.json({
      bookings: allBookings.length,
      events: allEvents.length,
      tasks: allTasks.length,
      documents: allDocs.length,
      users: allUsers.length,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ── Global data views ──
router.get('/bookings', async (_req: AuthRequest, res: Response) => {
  try { res.json(await db.select().from(bookings)); } catch (e) { res.status(500).json({ error: String(e) }); }
});
router.get('/events', async (_req: AuthRequest, res: Response) => {
  try { res.json(await db.select().from(events)); } catch (e) { res.status(500).json({ error: String(e) }); }
});
router.get('/tasks', async (_req: AuthRequest, res: Response) => {
  try { res.json(await db.select().from(tasks)); } catch (e) { res.status(500).json({ error: String(e) }); }
});
router.get('/documents', async (_req: AuthRequest, res: Response) => {
  try { res.json(await db.select().from(documents)); } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Activity Logs ──
router.get('/logs', async (req: AuthRequest, res: Response) => {
  try {
    const logs = await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(200);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ── System Settings ──
router.get('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const settings = await db.select().from(systemSettings).limit(1);
    if (!settings.length) {
      const def = await db.insert(systemSettings).values({}).returning();
      res.json(def[0]);
      return;
    }
    res.json(settings[0]);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.put('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const settings = await db.select().from(systemSettings).limit(1);
    if (!settings.length) {
      const created = await db.insert(systemSettings).values(req.body).returning();
      res.json(created[0]);
      return;
    }
    const updated = await db.update(systemSettings).set(req.body).where(eq(systemSettings.id, settings[0].id)).returning();
    res.json(updated[0]);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

// ── Company Management ──
router.get('/companies', async (_req: AuthRequest, res: Response) => {
  try { res.json(await db.select().from(companies)); } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post('/companies', async (req: AuthRequest, res: Response) => {
  try {
    const c = await db.insert(companies).values(req.body).returning();
    res.json(c[0]);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

// ── User delete ──
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (id === req.user.id) {
      res.status(400).json({ error: 'Cannot delete yourself' });
      return;
    }
    await db.delete(users).where(eq(users.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

export default router;
