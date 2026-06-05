"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Role Definitions (Strict 6-Role Set)
const allRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
// Global roles see all records platform-wide
const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
const managerRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
router.get('/', (0, auth_1.requireRole)(allRoles), async (req, res) => {
    try {
        let query = db_1.db.select({
            id: schema_1.events.id,
            bookingId: schema_1.events.bookingId,
            title: schema_1.events.title,
            date: schema_1.events.date,
            status: schema_1.events.status,
            organization: schema_1.events.organization,
            createdAt: schema_1.events.createdAt,
            artistName: schema_1.artists.name,
            agencyName: schema_1.agencies.name,
            agentName: schema_1.agents.name
        })
            .from(schema_1.events)
            .leftJoin(schema_1.bookings, (0, drizzle_orm_1.eq)(schema_1.events.bookingId, schema_1.bookings.id))
            .leftJoin(schema_1.artists, (0, drizzle_orm_1.eq)(schema_1.bookings.artistId, schema_1.artists.id))
            .leftJoin(schema_1.agencies, (0, drizzle_orm_1.eq)(schema_1.bookings.agencyId, schema_1.agencies.id))
            .leftJoin(schema_1.agents, (0, drizzle_orm_1.eq)(schema_1.bookings.agentId, schema_1.agents.id));
        if (!globalRoles.includes(req.user.role)) {
            // 1. Check for assignments
            const assignments = await db_1.db.select().from(schema_1.eventAssignments).where((0, drizzle_orm_1.eq)(schema_1.eventAssignments.userId, req.user.id));
            const eventIds = assignments.map(a => a.eventId);
            // 2. Check for ownership (if Booking Manager specifically, they see events from their bookings)
            const ownedBookings = await db_1.db.select({ id: schema_1.bookings.id }).from(schema_1.bookings).where((0, drizzle_orm_1.eq)(schema_1.bookings.userId, req.user.id));
            const ownedEventIds = await db_1.db.select({ id: schema_1.events.id }).from(schema_1.events).where((0, drizzle_orm_1.inArray)(schema_1.events.bookingId, ownedBookings.map(b => b.id).concat([-1])));
            const finalEventIds = [...new Set([...eventIds, ...ownedEventIds.map(e => e.id)])];
            if (finalEventIds.length > 0) {
                query.where((0, drizzle_orm_1.inArray)(schema_1.events.id, finalEventIds));
            }
            else {
                query.where((0, drizzle_orm_1.eq)(schema_1.events.id, -1)); // Return empty
            }
        }
        const allEvents = await query;
        res.json(allEvents);
    }
    catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
router.get('/:id', (0, auth_1.requireRole)(allRoles), auth_1.checkEventAccess, async (req, res) => {
    const event = await db_1.db.select({
        id: schema_1.events.id,
        bookingId: schema_1.events.bookingId,
        title: schema_1.events.title,
        date: schema_1.events.date,
        status: schema_1.events.status,
        organization: schema_1.events.organization,
        createdAt: schema_1.events.createdAt,
        artistName: schema_1.artists.name,
        agencyName: schema_1.agencies.name,
        agentName: schema_1.agents.name,
        agentEmail: schema_1.agents.email
    })
        .from(schema_1.events)
        .leftJoin(schema_1.bookings, (0, drizzle_orm_1.eq)(schema_1.events.bookingId, schema_1.bookings.id))
        .leftJoin(schema_1.artists, (0, drizzle_orm_1.eq)(schema_1.bookings.artistId, schema_1.artists.id))
        .leftJoin(schema_1.agencies, (0, drizzle_orm_1.eq)(schema_1.bookings.agencyId, schema_1.agencies.id))
        .leftJoin(schema_1.agents, (0, drizzle_orm_1.eq)(schema_1.bookings.agentId, schema_1.agents.id))
        .where((0, drizzle_orm_1.eq)(schema_1.events.id, parseInt(req.params.id)))
        .limit(1);
    if (!event.length) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    res.json(event[0]);
});
// Assignment Management
router.get('/:id/assignments', auth_1.checkEventAccess, async (req, res) => {
    const id = parseInt(req.params.id);
    const assignments = await db_1.db.select({
        id: schema_1.eventAssignments.id,
        userId: schema_1.eventAssignments.userId,
        userName: schema_1.users.name,
        userRole: schema_1.users.role
    })
        .from(schema_1.eventAssignments)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.eventAssignments.userId, schema_1.users.id))
        .where((0, drizzle_orm_1.eq)(schema_1.eventAssignments.eventId, id));
    res.json(assignments);
});
router.post('/:id/assignments', (0, auth_1.requireRole)(globalRoles), async (req, res) => {
    const id = parseInt(req.params.id);
    const { userId } = req.body;
    const existing = await db_1.db.select().from(schema_1.eventAssignments).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.eventAssignments.eventId, id), (0, drizzle_orm_1.eq)(schema_1.eventAssignments.userId, userId)));
    if (existing.length) {
        res.status(400).json({ error: 'Already assigned' });
        return;
    }
    const newAssignment = await db_1.db.insert(schema_1.eventAssignments).values({
        eventId: id,
        userId: userId,
        assignedBy: req.user.id
    }).returning();
    res.json(newAssignment[0]);
});
router.delete('/:id/assignments/:userId', (0, auth_1.requireRole)(globalRoles), async (req, res) => {
    const id = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    await db_1.db.delete(schema_1.eventAssignments).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.eventAssignments.eventId, id), (0, drizzle_orm_1.eq)(schema_1.eventAssignments.userId, userId)));
    res.json({ success: true });
});
router.post('/', (0, auth_1.requireRole)(managerRoles), async (req, res) => {
    try {
        const { assignedUserIds, ...eventData } = req.body;
        const payload = { ...eventData };
        if (payload.date)
            payload.date = new Date(payload.date);
        if (!payload.status)
            payload.status = 'Upcoming';
        const [newEvent] = await db_1.db.insert(schema_1.events).values(payload).returning();
        // Handle initial assignments
        if (assignedUserIds && Array.isArray(assignedUserIds)) {
            for (const uid of assignedUserIds) {
                await db_1.db.insert(schema_1.eventAssignments).values({
                    eventId: newEvent.id,
                    userId: uid,
                    assignedBy: req.user.id
                });
            }
        }
        await db_1.db.insert(schema_1.activityLogs).values({
            userId: req.user.id,
            action: 'CREATED_EVENT',
            entityType: 'event',
            entityId: newEvent.id,
            details: payload
        });
        res.json(newEvent);
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
router.put('/:id', (0, auth_1.requireRole)(managerRoles), auth_1.checkEventAccess, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const payload = { ...req.body };
        if (payload.date)
            payload.date = new Date(payload.date);
        const oldQuery = await db_1.db.select().from(schema_1.events).where((0, drizzle_orm_1.eq)(schema_1.events.id, id)).limit(1);
        const oldEvent = oldQuery[0];
        const updated = await db_1.db.update(schema_1.events).set(payload).where((0, drizzle_orm_1.eq)(schema_1.events.id, id)).returning();
        await db_1.db.insert(schema_1.activityLogs).values({
            userId: req.user.id,
            action: 'MODIFIED_EVENT',
            entityType: 'event',
            entityId: id,
            details: { old: oldEvent, new: payload }
        });
        res.json(updated[0]);
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
router.delete('/:id', (0, auth_1.requireRole)(globalRoles), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        // 1. Cascade cleanup for event dependencies
        await db_1.db.delete(schema_1.technicalItems).where((0, drizzle_orm_1.eq)(schema_1.technicalItems.eventId, id));
        const hospRecords = await db_1.db.select().from(schema_1.hospitality).where((0, drizzle_orm_1.eq)(schema_1.hospitality.eventId, id));
        for (const h of hospRecords) {
            await db_1.db.delete(schema_1.hospitalityRooms).where((0, drizzle_orm_1.eq)(schema_1.hospitalityRooms.hospitalityId, h.id));
        }
        await db_1.db.delete(schema_1.hospitality).where((0, drizzle_orm_1.eq)(schema_1.hospitality.eventId, id));
        await db_1.db.delete(schema_1.tasks).where((0, drizzle_orm_1.eq)(schema_1.tasks.eventId, id));
        await db_1.db.delete(schema_1.documents).where((0, drizzle_orm_1.eq)(schema_1.documents.eventId, id));
        await db_1.db.delete(schema_1.eventAssignments).where((0, drizzle_orm_1.eq)(schema_1.eventAssignments.eventId, id));
        await db_1.db.delete(schema_1.comments).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.comments.entityType, 'event'), (0, drizzle_orm_1.eq)(schema_1.comments.entityId, id)));
        // 2. Delete the event itself
        const result = await db_1.db.delete(schema_1.events).where((0, drizzle_orm_1.eq)(schema_1.events.id, id)).returning();
        if (result.length === 0) {
            res.status(404).json({ error: 'Event does not exist.' });
            return;
        }
        await db_1.db.insert(schema_1.activityLogs).values({
            userId: req.user.id,
            action: 'DELETED_EVENT',
            entityType: 'event',
            entityId: id,
            details: { timestamp: new Date() }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('CRITICAL: Event deletion failure:', error);
        res.status(400).json({ error: String(error) });
    }
});
exports.default = router;
