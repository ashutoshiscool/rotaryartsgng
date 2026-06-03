import { Router, Response } from 'express';
import { db } from '../db';
import { tasks, activityLogs, users, eventAssignments } from '../db/schema';
import { eq, or, inArray, and } from 'drizzle-orm';
import { authenticate, AuthRequest, checkEventAccess } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Role Definitions (Strict 5-Role Set)
const allRoles = ['Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];

// GET filtered tasks
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    let query = db.select({
      id: tasks.id,
      eventId: tasks.eventId,
      title: tasks.title,
      status: tasks.status,
      assignedTo: tasks.assignedTo,
      assignedToName: users.name,
      deadline: tasks.deadline,
      linkedEntity: tasks.linkedEntity,
      linkedEntityId: tasks.linkedEntityId,
    }).from(tasks)
    .leftJoin(users, eq(tasks.assignedTo, users.id));

    if (!globalRoles.includes(req.user.role)) {
      // Find assigned events
      const assignments = await db.select().from(eventAssignments).where(eq(eventAssignments.userId, req.user.id));
      const eventIds = assignments.map(a => a.eventId);
      
      // Filter: assigned to me OR for event I'm assigned to
      if (eventIds.length > 0) {
        query.where(or(
          eq(tasks.assignedTo, req.user.id),
          inArray(tasks.eventId, eventIds)
        ));
      } else {
        query.where(eq(tasks.assignedTo, req.user.id));
      }
    }

    const filteredTasks = await query;
    res.json(filteredTasks);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET tasks for a specific event
router.get('/event/:eventId', checkEventAccess, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = parseInt(req.params.eventId as string);
    const eventTasks = await db.select().from(tasks).where(eq(tasks.eventId, eventId));
    
    // Technical Manager only sees technical tasks? User didn't explicitly say for tasks,
    // but hinted "only see their part". For now, we'll keep it simple for tasks,
    // assuming tasks for an event are shared unless further refined.
    
    res.json(eventTasks);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
// ... rest of the file (POST, PUT, DELETE) remains similarly updated if needed, 
// but checkEventAccess should be used for event-specific tasks.

// POST create task
router.post('/', checkEventAccess, async (req: AuthRequest, res: Response) => {
  try {
    const payload = { ...req.body };
    if (payload.deadline) payload.deadline = new Date(payload.deadline);
    const newTask = await db.insert(tasks).values(payload).returning();

    await db.insert(activityLogs).values({
      userId: req.user.id,
      action: 'CREATED_TASK',
      entityType: 'task',
      entityId: newTask[0].id,
      details: payload,
    });

    res.json(newTask[0]);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

// PUT update task
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const payload = { ...req.body };
    if (payload.deadline) payload.deadline = new Date(payload.deadline);

    const oldQuery = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!oldQuery.length) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const targetTask = oldQuery[0];
    const eventId = targetTask.eventId;
    const isAssigned = targetTask.assignedTo === req.user.id;

    if (eventId) {
      const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Technical Manager', 'Hospitality Manager'];
      if (!globalRoles.includes(req.user.role) && !isAssigned) {
        const assignments = await db.select().from(eventAssignments).where(
          and(eq(eventAssignments.userId, req.user.id), eq(eventAssignments.eventId, eventId))
        );
        if (!assignments.length) {
          res.status(403).json({ error: 'You are not assigned to this event' });
          return;
        }
      }
    } else if (!isAssigned && !globalRoles.includes(req.user.role)) {
       res.status(403).json({ error: 'Access denied' });
       return;
    }

    const updated = await db.update(tasks).set(payload).where(eq(tasks.id, id)).returning();

    await db.insert(activityLogs).values({
      userId: req.user.id,
      action: 'MODIFIED_TASK',
      entityType: 'task',
      entityId: id,
      details: { old: oldQuery[0], new: payload },
    });

    res.json(updated[0]);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

// DELETE task
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const targetTask = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!targetTask.length) return res.json({ success: true });

    const eventId = targetTask[0].eventId;
    if (eventId) {
      const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Technical Manager', 'Hospitality Manager'];
      if (!globalRoles.includes(req.user.role)) {
        const assignments = await db.select().from(eventAssignments).where(
          and(eq(eventAssignments.userId, req.user.id), eq(eventAssignments.eventId, eventId))
        );
        if (!assignments.length) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      }
    }

    await db.delete(tasks).where(eq(tasks.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

export default router;
