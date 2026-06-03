import { Router, Request, Response } from 'express';
import { db } from '../db';
import { bookings, events, activityLogs, technicalItems, hospitality, hospitalityRooms, systemSettings, artists, agencies, agents, tasks, documents, comments, eventAssignments } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Only Director, General Manager, Project Manager, and Booking Manager can manage bookings
const bookingRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
router.use(requireRole(bookingRoles));

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const adminRoles = ['Admin', 'Director', 'General Manager', 'Project Manager'];
    const isAdmin = adminRoles.includes(req.user.role);

    let query = db.select({
      id: bookings.id,
      artistId: bookings.artistId,
      artistName: artists.name,
      agencyId: bookings.agencyId,
      agencyName: agencies.name,
      agentId: bookings.agentId,
      agentName: agents.name,
      brand: bookings.brand,
      date: bookings.date,
      status: bookings.status,
      venue: bookings.venue,
      requestedFee: bookings.requestedFee,
      offeredFee: bookings.offeredFee,
      currency: bookings.currency,
      details: bookings.details,
      metrics: bookings.metrics,
      eventId: events.id,
      userId: bookings.userId
    })
    .from(bookings)
    .leftJoin(artists, eq(bookings.artistId, artists.id))
    .leftJoin(agencies, eq(bookings.agencyId, agencies.id))
    .leftJoin(agents, eq(bookings.agentId, agents.id))
    .leftJoin(events, eq(bookings.id, events.bookingId));
    
    if (!isAdmin) {
      query.where(eq(bookings.userId, req.user.id));
    }
    
    const allBookings = await query;
    res.json(allBookings);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

async function syncEventWithBooking(bookingId: number) {
  const bookingQ = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  const booking = bookingQ[0];
  if (!booking) return;

  const existingEventQ = await db.select().from(events).where(eq(events.bookingId, bookingId)).limit(1);
  const existingEvent = existingEventQ[0];

  if (booking.status === 'Rejected') {
    if (existingEvent) {
      await db.delete(events).where(eq(events.id, existingEvent.id));
    }
    return;
  }

  // Pending or Accepted -> Ensure event exists
  if (!existingEvent) {
    const newEvent = await db.insert(events).values({
      bookingId: booking.id,
      title: `Event at ${booking.venue}`,
      date: booking.date,
      status: 'Upcoming'
    }).returning();
    
    const eventId = newEvent[0].id;
    
    // Auto-init modules
    await db.insert(technicalItems).values([
      { eventId, category: 'Sound', name: 'FOH PA System Base Requirements', specs: 'Minimum 110dB SPL' },
      { eventId, category: 'Lights', name: 'Standard Lighting Rig', specs: 'Moving heads, strobes' },
      { eventId, category: 'Stage', name: 'Headliner Riser', specs: '8x8 feet minimum' }
    ]);

    await db.insert(hospitality).values({
      eventId,
      hotelName: 'TBD',
      transportDetails: 'Airport pickup required',
      amenities: 'Standard dressing room rider'
    });
  } else {
    // Update existing event
    await db.update(events).set({
      title: `Event at ${booking.venue}`,
      date: booking.date
    }).where(eq(events.id, existingEvent.id));
  }
}

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { artistName, agencyName, ...data } = req.body;
    const payload = { ...data };
    
    if (payload.date) payload.date = new Date(payload.date);
    if (!payload.metrics) payload.metrics = { youtube: 0, spotify: 0, instagram: 0 };

    // Resolve Artist
    if (artistName) {
      const artQ = await db.select().from(artists).where(eq(artists.name, artistName)).limit(1);
      if (artQ[0]) {
        payload.artistId = artQ[0].id;
      } else {
        const newArt = await db.insert(artists).values({ name: artistName }).returning();
        payload.artistId = newArt[0].id;
      }
    }

    // Resolve Agency
    if (agencyName) {
      const agQ = await db.select().from(agencies).where(eq(agencies.name, agencyName)).limit(1);
      if (agQ[0]) {
        payload.agencyId = agQ[0].id;
      } else {
        const newAg = await db.insert(agencies).values({ name: agencyName }).returning();
        payload.agencyId = newAg[0].id;
      }
    }

    // Resolve Agent
    const { agentName, ...rest } = req.body;
    if (agentName && payload.agencyId) {
      const agentQ = await db.select().from(agents).where(and(eq(agents.name, agentName), eq(agents.agencyId, payload.agencyId))).limit(1);
      if (agentQ[0]) {
        payload.agentId = agentQ[0].id;
      } else {
        const newAgent = await db.insert(agents).values({ 
          name: agentName, 
          agencyId: payload.agencyId,
          email: `${agentName.toLowerCase().replace(/ /g, '.')}@example.com` // Placeholder email
        }).returning();
        payload.agentId = newAgent[0].id;
      }
    }

    const newBooking = (await db.insert(bookings).values({ ...payload, userId: req.user.id }).returning()) as any[];
    
    // Sync Event
    await syncEventWithBooking(newBooking[0].id);

    // Track creation
    await db.insert(activityLogs).values({
      userId: req.user.id,
      action: 'CREATED_BOOKING',
      entityType: 'booking',
      entityId: newBooking[0].id,
      details: payload
    });

    res.json(newBooking[0]);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: String(error) });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { artistName, agencyName, ...data } = req.body;
    const payload = { ...data };
    
    if (payload.date) payload.date = new Date(payload.date);
    
    // Resolve Artist/Agency if names provided
    if (artistName) {
      const artQ = await db.select().from(artists).where(eq(artists.name, artistName)).limit(1);
      payload.artistId = artQ[0] ? artQ[0].id : (await db.insert(artists).values({ name: artistName }).returning())[0].id;
    }
    if (agencyName) {
      const agQ = await db.select().from(agencies).where(eq(agencies.name, agencyName)).limit(1);
      payload.agencyId = agQ[0] ? agQ[0].id : (await db.insert(agencies).values({ name: agencyName }).returning())[0].id;
    }

    const oldQuery = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    const oldBooking = oldQuery[0];

    const updated = await db.update(bookings).set(payload).where(eq(bookings.id, id)).returning();
    
    // Sync Event
    await syncEventWithBooking(id);

    await db.insert(activityLogs).values({
      userId: req.user.id,
      action: 'MODIFIED_BOOKING',
      entityType: 'booking',
      entityId: id,
      details: { old: oldBooking, new: payload }
    });

    res.json(updated[0]);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

router.post('/:id/accept', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = parseInt(req.params.id as string);
    const bookingQuery = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    const booking = bookingQuery[0];
    
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.status === 'Accepted') {
      res.status(400).json({ error: 'Already accepted' });
      return;
    }

    // 1. Fetch dynamic system exchange rates
    const settingsQ = await db.select().from(systemSettings).limit(1);
    const settings = settingsQ[0] || { eurExchangeRate: 1.08, gelExchangeRate: 2.65 };
    let rate = 1.0;
    if (booking.currency === 'EUR') rate = settings.eurExchangeRate!;
    if (booking.currency === 'GEL') rate = settings.gelExchangeRate!;

    // 2. Lock Bookings Status & Financials snapshot
    const updatedBooking = await db.update(bookings)
      .set({ status: 'Accepted', exchangeRateAtAcceptance: rate })
      .where(eq(bookings.id, bookingId))
      .returning();

    // 3. Instantiate Event
    const newEvent = await db.insert(events).values({
      bookingId: bookingId,
      title: `Event at ${booking.venue}`,
      date: booking.date,
      status: 'Upcoming'
    }).returning();

    const eventId = newEvent[0].id;

    // 4. Auto-initialize Technical Scaffold (Stage, Lights, Sound)
    await db.insert(technicalItems).values([
      { eventId, category: 'Sound', name: 'FOH PA System Base Requirements', specs: 'Minimum 110dB SPL' },
      { eventId, category: 'Lights', name: 'Standard Lighting Rig', specs: 'Moving heads, strobes' },
      { eventId, category: 'Stage', name: 'Headliner Riser', specs: '8x8 feet minimum' }
    ]);

    // 5. Auto-initialize Hospitality Wrapper
    await db.insert(hospitality).values({
      eventId,
      hotelName: 'TBD - Pending Travel Agent',
      transportDetails: 'Airport pickup required per rider',
      amenities: 'Standard dressing room rider attached'
    });

    // 6. Log the transition
    await db.insert(activityLogs).values({
      userId: req.user.id,
      action: 'ACCEPTED_BOOKING',
      entityType: 'booking',
      entityId: bookingId,
      details: { eventId, exchangeRateLocked: rate, modulesCreated: ['Technical', 'Hospitality'] }
    });

    res.json({ booking: updatedBooking[0], event: newEvent[0] });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

router.delete('/:id', requireRole(['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager']), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const adminRoles = ['Admin', 'Director', 'General Manager', 'Project Manager'];
    
    // Authorization check
    if (!adminRoles.includes(req.user.role)) {
      const bQuery = await db.select().from(bookings).where(and(eq(bookings.id, id), eq(bookings.userId, req.user.id))).limit(1);
      if (bQuery.length === 0) {
        res.status(403).json({ error: 'Unauthorized: You can only delete your own bookings.' });
        return;
      }
    }
    
    // 1. Identify all associated events (and clear dependencies)
    const associatedEvents = await db.select().from(events).where(eq(events.bookingId, id));

    for (const event of associatedEvents) {
      const eventId = event.id;
      
      // Cascade cleanup for the event module
      await db.delete(technicalItems).where(eq(technicalItems.eventId, eventId));
      
      const hospRecords = await db.select().from(hospitality).where(eq(hospitality.eventId, eventId));
      for (const h of hospRecords) {
        await db.delete(hospitalityRooms).where(eq(hospitalityRooms.hospitalityId, h.id));
      }
      await db.delete(hospitality).where(eq(hospitality.eventId, eventId));
      
      await db.delete(tasks).where(eq(tasks.eventId, eventId));
      await db.delete(documents).where(eq(documents.eventId, eventId));
      await db.delete(eventAssignments).where(eq(eventAssignments.eventId, eventId));
      await db.delete(comments).where(and(eq(comments.entityType, 'event'), eq(comments.entityId, eventId)));
      
      // Delete the event itself
      await db.delete(events).where(eq(events.id, eventId));
    }

    // 2. Clear Direct Booking dependencies (Polymorphic links)
    await db.delete(comments).where(and(eq(comments.entityType, 'booking'), eq(comments.entityId, id)));
    await db.delete(tasks).where(and(eq(tasks.linkedEntity, 'booking'), eq(tasks.linkedEntityId, id)));
    await db.delete(documents).where(and(eq(documents.entityType, 'booking'), eq(documents.entityId, id)));

    // 3. Delete the booking
    const result = await db.delete(bookings).where(eq(bookings.id, id)).returning();
    
    if (result.length === 0) {
      res.status(404).json({ error: 'Booking does not exist.' });
      return;
    }

    await db.insert(activityLogs).values({
      userId: req.user.id,
      action: 'DELETED_BOOKING',
      entityType: 'booking',
      entityId: id,
      details: { timestamp: new Date() }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('CRITICAL: Final Booking Deletion failure:', error);
    res.status(400).json({ error: String(error) });
  }
});

export default router;
