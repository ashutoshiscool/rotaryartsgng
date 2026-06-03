import { Router, Request, Response } from 'express';
import { db } from '../db';
import { technicalItems, activityLogs, eventAssignments } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticate, requireRole, AuthRequest, checkEventAccess } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Role Definitions (Strict 5-Role Set)
const allTechRoles = ['Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager'];
const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];

router.use(requireRole(allTechRoles));

// Fetch all technical items for a specific event
router.get('/event/:eventId', checkEventAccess, async (req: AuthRequest, res: Response) => {
  try {
    const items = await db.select().from(technicalItems).where(eq(technicalItems.eventId, parseInt(req.params.eventId as string)));
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Update a technical item
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const payload = { ...req.body };
    
    // Check if user has access to the event this item belongs to
    const targetItem = await db.select().from(technicalItems).where(eq(technicalItems.id, id)).limit(1);
    const eventId = targetItem[0]?.eventId;
    
    if (eventId) {
      const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Technical Manager', 'Hospitality Manager'];
      if (!globalRoles.includes(req.user.role)) {
        const assignments = await db.select().from(eventAssignments).where(
          and(eq(eventAssignments.userId, req.user.id), eq(eventAssignments.eventId, eventId))
        );
        if (!assignments.length) {
          res.status(403).json({ error: 'You are not assigned to this event' });
          return;
        }
      }
    }

    const oldItem = targetItem[0];

    const updated = await db.update(technicalItems).set(payload).where(eq(technicalItems.id, id)).returning();
    
    await db.insert(activityLogs).values({
      userId: req.user.id,
      action: 'MODIFIED_TECHNICAL_ITEM',
      entityType: 'technical_item',
      entityId: id,
      details: { old: oldItem, new: payload }
    });

    res.json(updated[0]);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

// Create a new technical item
router.post('/', checkEventAccess, async (req: AuthRequest, res: Response) => {
   try {
     const payload = { ...req.body };
     const newItem = await db.insert(technicalItems).values(payload).returning();
     
     await db.insert(activityLogs).values({
       userId: req.user.id,
       action: 'CREATED_TECHNICAL_ITEM',
       entityType: 'technical_item',
       entityId: newItem[0].id,
       details: payload
     });
 
     res.json(newItem[0]);
   } catch (error) {
     res.status(400).json({ error: String(error) });
   }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const targetItem = await db.select().from(technicalItems).where(eq(technicalItems.id, id)).limit(1);
    const eventId = targetItem[0]?.eventId;

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

    await db.delete(technicalItems).where(eq(technicalItems.id, id));
    
    await db.insert(activityLogs).values({
      userId: req.user.id,
      action: 'DELETED_TECHNICAL_ITEM',
      entityType: 'technical_item',
      entityId: id,
      details: { timestamp: new Date() }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

export default router;
