import { Router, Request, Response } from 'express';
import { db } from '../db';
import { hospitality, hospitalityRooms, activityLogs, events, eventAssignments, bookings } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { authenticate, requireRole, AuthRequest, checkEventAccess } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Role Definitions (Strict 5-Role Set)
const allHospRoles = ['Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Hospitality Manager'];
const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];

router.use(requireRole(allHospRoles));

// Fetch all hospitality records (Global Hub)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = globalRoles.includes(req.user.role);

    // Filter by assignments for non-admins
    let eventIds: number[] = [];
    if (!isAdmin) {
      const assignments = await db.select().from(eventAssignments).where(eq(eventAssignments.userId, req.user.id));
      eventIds = assignments.map(a => a.eventId);
      
      // Ownership check for Booking Managers
      if (req.user.role === 'Booking Manager') {
        const ownedB = await db.select().from(bookings).where(eq(bookings.userId, req.user.id));
        const ownedE = await db.select({ id: events.id }).from(events).where(inArray(events.bookingId, ownedB.map(b => b.id).concat([-1])));
        eventIds = [...new Set([...eventIds, ...ownedE.map(e => e.id)])];
      }
    }

    let query = db.select({
      id: hospitality.id,
      eventId: hospitality.eventId,
      eventTitle: events.title,
      date: events.date,
      hotelName: hospitality.hotelName,
      travelFlights: hospitality.travelFlights,
      groundDriverContact: hospitality.groundDriverContact,
      groundRoute: hospitality.groundRoute,
      groundTime: hospitality.groundTime,
      amenities: hospitality.amenities
    })
    .from(hospitality)
    .leftJoin(events, eq(hospitality.eventId, events.id));
    
    if (!isAdmin) {
      if (eventIds.length > 0) {
        query.where(inArray(hospitality.eventId, eventIds));
      } else {
        query.where(eq(hospitality.id, -1));
      }
    }

    const allHosp = await query;
    res.json(allHosp);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Fetch global hospitality overview for an event (Self-Healing)
router.get('/event/:eventId', checkEventAccess, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = parseInt(req.params.eventId as string);
    const records = await db.select().from(hospitality).where(eq(hospitality.eventId, eventId));
    
    if(!records.length) {
       // Self-healing: Create default record
       const newHosp = await db.insert(hospitality).values({
         eventId,
         hotelName: 'TBD',
         transportDetails: 'Airport pickup required',
         amenities: 'Standard rider'
       }).returning();
       
       res.json({ ...newHosp[0], rooms: [] });
       return;
    }
    
    const hosp = records[0];
    const rooms = await db.select().from(hospitalityRooms).where(eq(hospitalityRooms.hospitalityId, hosp.id));
    res.json({ ...hosp, rooms });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Update hospitality main record
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const payload = { ...req.body };
    delete payload.rooms; // Remove nested relation if sent
    
    // Authorization Check
    const targetRec = await db.select().from(hospitality).where(eq(hospitality.id, id)).limit(1);
    const eventId = targetRec[0]?.eventId;

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

    const oldRec = targetRec[0];

    const updated = await db.update(hospitality).set(payload).where(eq(hospitality.id, id)).returning();
    
    await db.insert(activityLogs).values({
      userId: req.user.id,
      action: 'MODIFIED_HOSPITALITY',
      entityType: 'hospitality',
      entityId: id,
      details: { old: oldRec, new: payload }
    });

    res.json(updated[0]);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

// Room Management
router.post('/rooms', async (req: AuthRequest, res: Response) => {
  try {
    const { hospitalityId, roomType, guestName } = req.body;
    
    // Check access to parent hospitality / event
    const hosp = await db.select().from(hospitality).where(eq(hospitality.id, hospitalityId)).limit(1);
    const eventId = hosp[0]?.eventId;
    
    if (eventId) {
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

    const newRoom = await db.insert(hospitalityRooms).values({ hospitalityId, roomType, guestName }).returning();
    res.json(newRoom[0]);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

router.delete('/rooms/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const roomQ = await db.select().from(hospitalityRooms).where(eq(hospitalityRooms.id, id)).limit(1);
    if (!roomQ[0]) return res.json({ success: true });

    const hosp = await db.select().from(hospitality).where(eq(hospitality.id, roomQ[0].hospitalityId)).limit(1);
    const eventId = hosp[0]?.eventId;

    if (eventId) {
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

    await db.delete(hospitalityRooms).where(eq(hospitalityRooms.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

export default router;
