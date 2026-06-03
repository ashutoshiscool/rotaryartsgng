import { Router, Response } from 'express';
import { db } from '../db';
import { documents, activityLogs, eventAssignments, tasks, bookings, events } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { authenticate, AuthRequest, checkEventAccess } from '../middleware/auth';
import multer from 'multer';
import path from 'path';

const router = Router();
router.use(authenticate);

// Configure Multer for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
    let query = db.select().from(documents);

    if (!globalRoles.includes(req.user.role)) {
      // 1. Assigned Events
      const assignments = await db.select().from(eventAssignments).where(eq(eventAssignments.userId, req.user.id));
      const eventIds = assignments.map(a => a.eventId);
      
      // 2. Owned Bookings (for Booking Managers)
      let ownedEventIds: number[] = [];
      if (req.user.role === 'Booking Manager') {
        const ownedB = await db.select().from(bookings).where(eq(bookings.userId, req.user.id));
        const ownedE = await db.select({ id: events.id }).from(events).where(inArray(events.bookingId, ownedB.map(b => b.id).concat([-1])));
        ownedEventIds = ownedE.map(e => e.id);
      }

      const finalEventIds = [...new Set([...eventIds, ...ownedEventIds])];

      if (finalEventIds.length > 0) {
        query.where(inArray(documents.eventId, finalEventIds));
      } else {
        query.where(eq(documents.id, -1)); // Return empty
      }
    }

    const allDocs = await query;
    res.json(allDocs);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/', upload.single('file'), checkEventAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { name, category, eventId, entityType, entityId } = req.body;
    let taskData = null;
    if (req.body.task) {
      try {
        taskData = JSON.parse(req.body.task);
      } catch (e) {
        console.error('Invalid task JSON', e);
      }
    }

    // Determine URL (Local Path)
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : req.body.url;

    if (!fileUrl) {
      res.status(400).json({ error: 'No file uploaded or URL provided' });
      return;
    }

    // 1. Create Document
    const docPayload = {
      name: name || (req.file ? req.file.originalname : 'Unnamed Doc'),
      category,
      eventId: parseInt(eventId as string),
      entityType,
      entityId: parseInt(entityId as string),
      url: fileUrl,
    };

    const [newDoc] = await db.insert(documents).values(docPayload).returning();

    await db.insert(activityLogs).values({
      userId: req.user.id,
      action: 'UPLOADED_DOCUMENT',
      entityType: 'document',
      entityId: newDoc.id,
      details: docPayload,
    });

    // 2. Optional Task Creation
    if (taskData && taskData.title) {
      const [newTask] = await db.insert(tasks).values({
        eventId: newDoc.eventId,
        title: taskData.title,
        assignedTo: taskData.assignedTo,
        deadline: taskData.deadline ? new Date(taskData.deadline) : null,
        linkedEntity: 'document',
        linkedEntityId: newDoc.id,
        status: 'Todo'
      }).returning();

      await db.insert(activityLogs).values({
        userId: req.user.id,
        action: 'CREATED_LINKED_TASK',
        entityType: 'task',
        entityId: newTask.id,
        details: { linkedTo: 'document', documentId: newDoc.id },
      });
    }

    res.json(newDoc);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: String(error) });
  }
});

export default router;
