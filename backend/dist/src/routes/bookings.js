"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Only Director, General Manager, Project Manager, and Booking Manager can manage bookings
const bookingRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
router.use((0, auth_1.requireRole)(bookingRoles));
router.get('/', async (req, res) => {
    try {
        const adminRoles = ['Admin', 'Director', 'General Manager', 'Project Manager'];
        const isAdmin = adminRoles.includes(req.user.role);
        let query = db_1.db.select({
            id: schema_1.bookings.id,
            artistId: schema_1.bookings.artistId,
            artistName: schema_1.artists.name,
            agencyId: schema_1.bookings.agencyId,
            agencyName: schema_1.agencies.name,
            agentId: schema_1.bookings.agentId,
            agentName: schema_1.agents.name,
            brand: schema_1.bookings.brand,
            date: schema_1.bookings.date,
            status: schema_1.bookings.status,
            venue: schema_1.bookings.venue,
            requestedFee: schema_1.bookings.requestedFee,
            offeredFee: schema_1.bookings.offeredFee,
            currency: schema_1.bookings.currency,
            details: schema_1.bookings.details,
            metrics: schema_1.bookings.metrics,
            eventId: schema_1.events.id,
            userId: schema_1.bookings.userId
        })
            .from(schema_1.bookings)
            .leftJoin(schema_1.artists, (0, drizzle_orm_1.eq)(schema_1.bookings.artistId, schema_1.artists.id))
            .leftJoin(schema_1.agencies, (0, drizzle_orm_1.eq)(schema_1.bookings.agencyId, schema_1.agencies.id))
            .leftJoin(schema_1.agents, (0, drizzle_orm_1.eq)(schema_1.bookings.agentId, schema_1.agents.id))
            .leftJoin(schema_1.events, (0, drizzle_orm_1.eq)(schema_1.bookings.id, schema_1.events.bookingId));
        if (!isAdmin) {
            query.where((0, drizzle_orm_1.eq)(schema_1.bookings.userId, req.user.id));
        }
        const allBookings = await query;
        res.json(allBookings);
    }
    catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
async function syncEventWithBooking(bookingId) {
    const bookingQ = await db_1.db.select().from(schema_1.bookings).where((0, drizzle_orm_1.eq)(schema_1.bookings.id, bookingId)).limit(1);
    const booking = bookingQ[0];
    if (!booking)
        return;
    const existingEventQ = await db_1.db.select().from(schema_1.events).where((0, drizzle_orm_1.eq)(schema_1.events.bookingId, bookingId)).limit(1);
    const existingEvent = existingEventQ[0];
    if (booking.status === 'Rejected') {
        if (existingEvent) {
            await db_1.db.delete(schema_1.events).where((0, drizzle_orm_1.eq)(schema_1.events.id, existingEvent.id));
        }
        return;
    }
    // Pending or Accepted -> Ensure event exists
    if (!existingEvent) {
        const newEvent = await db_1.db.insert(schema_1.events).values({
            bookingId: booking.id,
            title: `Event at ${booking.venue}`,
            date: booking.date,
            status: 'Upcoming'
        }).returning();
        const eventId = newEvent[0].id;
        // Auto-init modules
        await db_1.db.insert(schema_1.technicalItems).values([
            { eventId, category: 'Sound', name: 'FOH PA System Base Requirements', specs: 'Minimum 110dB SPL' },
            { eventId, category: 'Lights', name: 'Standard Lighting Rig', specs: 'Moving heads, strobes' },
            { eventId, category: 'Stage', name: 'Headliner Riser', specs: '8x8 feet minimum' }
        ]);
        await db_1.db.insert(schema_1.hospitality).values({
            eventId,
            hotelName: 'TBD',
            transportDetails: 'Airport pickup required',
            amenities: 'Standard dressing room rider'
        });
    }
    else {
        // Update existing event
        await db_1.db.update(schema_1.events).set({
            title: `Event at ${booking.venue}`,
            date: booking.date
        }).where((0, drizzle_orm_1.eq)(schema_1.events.id, existingEvent.id));
    }
}
router.post('/', async (req, res) => {
    try {
        const { artistName, agencyName, ...data } = req.body;
        const payload = { ...data };
        if (payload.date)
            payload.date = new Date(payload.date);
        if (!payload.metrics)
            payload.metrics = { youtube: 0, spotify: 0, instagram: 0 };
        // Resolve Artist
        if (artistName) {
            const artQ = await db_1.db.select().from(schema_1.artists).where((0, drizzle_orm_1.eq)(schema_1.artists.name, artistName)).limit(1);
            if (artQ[0]) {
                payload.artistId = artQ[0].id;
            }
            else {
                const newArt = await db_1.db.insert(schema_1.artists).values({ name: artistName }).returning();
                payload.artistId = newArt[0].id;
            }
        }
        // Resolve Agency
        if (agencyName) {
            const agQ = await db_1.db.select().from(schema_1.agencies).where((0, drizzle_orm_1.eq)(schema_1.agencies.name, agencyName)).limit(1);
            if (agQ[0]) {
                payload.agencyId = agQ[0].id;
            }
            else {
                const newAg = await db_1.db.insert(schema_1.agencies).values({ name: agencyName }).returning();
                payload.agencyId = newAg[0].id;
            }
        }
        // Resolve Agent
        const { agentName, ...rest } = req.body;
        if (agentName && payload.agencyId) {
            const agentQ = await db_1.db.select().from(schema_1.agents).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.agents.name, agentName), (0, drizzle_orm_1.eq)(schema_1.agents.agencyId, payload.agencyId))).limit(1);
            if (agentQ[0]) {
                payload.agentId = agentQ[0].id;
            }
            else {
                const newAgent = await db_1.db.insert(schema_1.agents).values({
                    name: agentName,
                    agencyId: payload.agencyId,
                    email: `${agentName.toLowerCase().replace(/ /g, '.')}@example.com` // Placeholder email
                }).returning();
                payload.agentId = newAgent[0].id;
            }
        }
        const newBooking = (await db_1.db.insert(schema_1.bookings).values({ ...payload, userId: req.user.id }).returning());
        // Sync Event
        await syncEventWithBooking(newBooking[0].id);
        // Track creation
        await db_1.db.insert(schema_1.activityLogs).values({
            userId: req.user.id,
            action: 'CREATED_BOOKING',
            entityType: 'booking',
            entityId: newBooking[0].id,
            details: payload
        });
        res.json(newBooking[0]);
    }
    catch (error) {
        console.error(error);
        res.status(400).json({ error: String(error) });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { artistName, agencyName, ...data } = req.body;
        const payload = { ...data };
        if (payload.date)
            payload.date = new Date(payload.date);
        // Resolve Artist/Agency if names provided
        if (artistName) {
            const artQ = await db_1.db.select().from(schema_1.artists).where((0, drizzle_orm_1.eq)(schema_1.artists.name, artistName)).limit(1);
            payload.artistId = artQ[0] ? artQ[0].id : (await db_1.db.insert(schema_1.artists).values({ name: artistName }).returning())[0].id;
        }
        if (agencyName) {
            const agQ = await db_1.db.select().from(schema_1.agencies).where((0, drizzle_orm_1.eq)(schema_1.agencies.name, agencyName)).limit(1);
            payload.agencyId = agQ[0] ? agQ[0].id : (await db_1.db.insert(schema_1.agencies).values({ name: agencyName }).returning())[0].id;
        }
        const oldQuery = await db_1.db.select().from(schema_1.bookings).where((0, drizzle_orm_1.eq)(schema_1.bookings.id, id)).limit(1);
        const oldBooking = oldQuery[0];
        const updated = await db_1.db.update(schema_1.bookings).set(payload).where((0, drizzle_orm_1.eq)(schema_1.bookings.id, id)).returning();
        // Sync Event
        await syncEventWithBooking(id);
        await db_1.db.insert(schema_1.activityLogs).values({
            userId: req.user.id,
            action: 'MODIFIED_BOOKING',
            entityType: 'booking',
            entityId: id,
            details: { old: oldBooking, new: payload }
        });
        res.json(updated[0]);
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
router.post('/:id/accept', async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const bookingQuery = await db_1.db.select().from(schema_1.bookings).where((0, drizzle_orm_1.eq)(schema_1.bookings.id, bookingId)).limit(1);
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
        const settingsQ = await db_1.db.select().from(schema_1.systemSettings).limit(1);
        const settings = settingsQ[0] || { eurExchangeRate: 1.08, gelExchangeRate: 2.65 };
        let rate = 1.0;
        if (booking.currency === 'EUR')
            rate = settings.eurExchangeRate;
        if (booking.currency === 'GEL')
            rate = settings.gelExchangeRate;
        // 2. Lock Bookings Status & Financials snapshot
        const updatedBooking = await db_1.db.update(schema_1.bookings)
            .set({ status: 'Accepted', exchangeRateAtAcceptance: rate })
            .where((0, drizzle_orm_1.eq)(schema_1.bookings.id, bookingId))
            .returning();
        // 3. Instantiate Event
        const newEvent = await db_1.db.insert(schema_1.events).values({
            bookingId: bookingId,
            title: `Event at ${booking.venue}`,
            date: booking.date,
            status: 'Upcoming'
        }).returning();
        const eventId = newEvent[0].id;
        // 4. Auto-initialize Technical Scaffold (Stage, Lights, Sound)
        await db_1.db.insert(schema_1.technicalItems).values([
            { eventId, category: 'Sound', name: 'FOH PA System Base Requirements', specs: 'Minimum 110dB SPL' },
            { eventId, category: 'Lights', name: 'Standard Lighting Rig', specs: 'Moving heads, strobes' },
            { eventId, category: 'Stage', name: 'Headliner Riser', specs: '8x8 feet minimum' }
        ]);
        // 5. Auto-initialize Hospitality Wrapper
        await db_1.db.insert(schema_1.hospitality).values({
            eventId,
            hotelName: 'TBD - Pending Travel Agent',
            transportDetails: 'Airport pickup required per rider',
            amenities: 'Standard dressing room rider attached'
        });
        // 6. Log the transition
        await db_1.db.insert(schema_1.activityLogs).values({
            userId: req.user.id,
            action: 'ACCEPTED_BOOKING',
            entityType: 'booking',
            entityId: bookingId,
            details: { eventId, exchangeRateLocked: rate, modulesCreated: ['Technical', 'Hospitality'] }
        });
        res.json({ booking: updatedBooking[0], event: newEvent[0] });
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
router.delete('/:id', (0, auth_1.requireRole)(['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager']), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const adminRoles = ['Admin', 'Director', 'General Manager', 'Project Manager'];
        // Authorization check
        if (!adminRoles.includes(req.user.role)) {
            const bQuery = await db_1.db.select().from(schema_1.bookings).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.bookings.id, id), (0, drizzle_orm_1.eq)(schema_1.bookings.userId, req.user.id))).limit(1);
            if (bQuery.length === 0) {
                res.status(403).json({ error: 'Unauthorized: You can only delete your own bookings.' });
                return;
            }
        }
        // 1. Identify all associated events (and clear dependencies)
        const associatedEvents = await db_1.db.select().from(schema_1.events).where((0, drizzle_orm_1.eq)(schema_1.events.bookingId, id));
        for (const event of associatedEvents) {
            const eventId = event.id;
            // Cascade cleanup for the event module
            await db_1.db.delete(schema_1.technicalItems).where((0, drizzle_orm_1.eq)(schema_1.technicalItems.eventId, eventId));
            const hospRecords = await db_1.db.select().from(schema_1.hospitality).where((0, drizzle_orm_1.eq)(schema_1.hospitality.eventId, eventId));
            for (const h of hospRecords) {
                await db_1.db.delete(schema_1.hospitalityRooms).where((0, drizzle_orm_1.eq)(schema_1.hospitalityRooms.hospitalityId, h.id));
            }
            await db_1.db.delete(schema_1.hospitality).where((0, drizzle_orm_1.eq)(schema_1.hospitality.eventId, eventId));
            await db_1.db.delete(schema_1.tasks).where((0, drizzle_orm_1.eq)(schema_1.tasks.eventId, eventId));
            await db_1.db.delete(schema_1.documents).where((0, drizzle_orm_1.eq)(schema_1.documents.eventId, eventId));
            await db_1.db.delete(schema_1.eventAssignments).where((0, drizzle_orm_1.eq)(schema_1.eventAssignments.eventId, eventId));
            await db_1.db.delete(schema_1.comments).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.comments.entityType, 'event'), (0, drizzle_orm_1.eq)(schema_1.comments.entityId, eventId)));
            // Delete the event itself
            await db_1.db.delete(schema_1.events).where((0, drizzle_orm_1.eq)(schema_1.events.id, eventId));
        }
        // 2. Clear Direct Booking dependencies (Polymorphic links)
        await db_1.db.delete(schema_1.comments).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.comments.entityType, 'booking'), (0, drizzle_orm_1.eq)(schema_1.comments.entityId, id)));
        await db_1.db.delete(schema_1.tasks).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tasks.linkedEntity, 'booking'), (0, drizzle_orm_1.eq)(schema_1.tasks.linkedEntityId, id)));
        await db_1.db.delete(schema_1.documents).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.documents.entityType, 'booking'), (0, drizzle_orm_1.eq)(schema_1.documents.entityId, id)));
        // 3. Delete the booking
        const result = await db_1.db.delete(schema_1.bookings).where((0, drizzle_orm_1.eq)(schema_1.bookings.id, id)).returning();
        if (result.length === 0) {
            res.status(404).json({ error: 'Booking does not exist.' });
            return;
        }
        await db_1.db.insert(schema_1.activityLogs).values({
            userId: req.user.id,
            action: 'DELETED_BOOKING',
            entityType: 'booking',
            entityId: id,
            details: { timestamp: new Date() }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('CRITICAL: Final Booking Deletion failure:', error);
        res.status(400).json({ error: String(error) });
    }
});
exports.default = router;
