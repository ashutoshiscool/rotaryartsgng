"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Role Definitions (Strict 5-Role Set)
const allHospRoles = ['Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Hospitality Manager'];
const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
router.use((0, auth_1.requireRole)(allHospRoles));
// Fetch all hospitality records (Global Hub)
router.get('/', async (req, res) => {
    try {
        const isAdmin = globalRoles.includes(req.user.role);
        // Filter by assignments for non-admins
        let eventIds = [];
        if (!isAdmin) {
            const assignments = await db_1.db.select().from(schema_1.eventAssignments).where((0, drizzle_orm_1.eq)(schema_1.eventAssignments.userId, req.user.id));
            eventIds = assignments.map(a => a.eventId);
            // Ownership check for Booking Managers
            if (req.user.role === 'Booking Manager') {
                const ownedB = await db_1.db.select().from(schema_1.bookings).where((0, drizzle_orm_1.eq)(schema_1.bookings.userId, req.user.id));
                const ownedE = await db_1.db.select({ id: schema_1.events.id }).from(schema_1.events).where((0, drizzle_orm_1.inArray)(schema_1.events.bookingId, ownedB.map(b => b.id).concat([-1])));
                eventIds = [...new Set([...eventIds, ...ownedE.map(e => e.id)])];
            }
        }
        let query = db_1.db.select({
            id: schema_1.hospitality.id,
            eventId: schema_1.hospitality.eventId,
            eventTitle: schema_1.events.title,
            date: schema_1.events.date,
            hotelName: schema_1.hospitality.hotelName,
            travelFlights: schema_1.hospitality.travelFlights,
            groundDriverContact: schema_1.hospitality.groundDriverContact,
            groundRoute: schema_1.hospitality.groundRoute,
            groundTime: schema_1.hospitality.groundTime,
            amenities: schema_1.hospitality.amenities
        })
            .from(schema_1.hospitality)
            .leftJoin(schema_1.events, (0, drizzle_orm_1.eq)(schema_1.hospitality.eventId, schema_1.events.id));
        if (!isAdmin) {
            if (eventIds.length > 0) {
                query.where((0, drizzle_orm_1.inArray)(schema_1.hospitality.eventId, eventIds));
            }
            else {
                query.where((0, drizzle_orm_1.eq)(schema_1.hospitality.id, -1));
            }
        }
        const allHosp = await query;
        res.json(allHosp);
    }
    catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
// Fetch global hospitality overview for an event (Self-Healing)
router.get('/event/:eventId', auth_1.checkEventAccess, async (req, res) => {
    try {
        const eventId = parseInt(req.params.eventId);
        const records = await db_1.db.select().from(schema_1.hospitality).where((0, drizzle_orm_1.eq)(schema_1.hospitality.eventId, eventId));
        if (!records.length) {
            // Self-healing: Create default record
            const newHosp = await db_1.db.insert(schema_1.hospitality).values({
                eventId,
                hotelName: 'TBD',
                transportDetails: 'Airport pickup required',
                amenities: 'Standard rider'
            }).returning();
            res.json({ ...newHosp[0], rooms: [] });
            return;
        }
        const hosp = records[0];
        const rooms = await db_1.db.select().from(schema_1.hospitalityRooms).where((0, drizzle_orm_1.eq)(schema_1.hospitalityRooms.hospitalityId, hosp.id));
        res.json({ ...hosp, rooms });
    }
    catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
// Update hospitality main record
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const payload = { ...req.body };
        delete payload.rooms; // Remove nested relation if sent
        // Authorization Check
        const targetRec = await db_1.db.select().from(schema_1.hospitality).where((0, drizzle_orm_1.eq)(schema_1.hospitality.id, id)).limit(1);
        const eventId = targetRec[0]?.eventId;
        if (eventId) {
            const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Technical Manager', 'Hospitality Manager'];
            if (!globalRoles.includes(req.user.role)) {
                const assignments = await db_1.db.select().from(schema_1.eventAssignments).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.eventAssignments.userId, req.user.id), (0, drizzle_orm_1.eq)(schema_1.eventAssignments.eventId, eventId)));
                if (!assignments.length) {
                    res.status(403).json({ error: 'You are not assigned to this event' });
                    return;
                }
            }
        }
        const oldRec = targetRec[0];
        const updated = await db_1.db.update(schema_1.hospitality).set(payload).where((0, drizzle_orm_1.eq)(schema_1.hospitality.id, id)).returning();
        await db_1.db.insert(schema_1.activityLogs).values({
            userId: req.user.id,
            action: 'MODIFIED_HOSPITALITY',
            entityType: 'hospitality',
            entityId: id,
            details: { old: oldRec, new: payload }
        });
        res.json(updated[0]);
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
// Room Management
router.post('/rooms', async (req, res) => {
    try {
        const { hospitalityId, roomType, guestName } = req.body;
        // Check access to parent hospitality / event
        const hosp = await db_1.db.select().from(schema_1.hospitality).where((0, drizzle_orm_1.eq)(schema_1.hospitality.id, hospitalityId)).limit(1);
        const eventId = hosp[0]?.eventId;
        if (eventId) {
            if (!globalRoles.includes(req.user.role)) {
                const assignments = await db_1.db.select().from(schema_1.eventAssignments).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.eventAssignments.userId, req.user.id), (0, drizzle_orm_1.eq)(schema_1.eventAssignments.eventId, eventId)));
                if (!assignments.length) {
                    res.status(403).json({ error: 'Access denied' });
                    return;
                }
            }
        }
        const newRoom = await db_1.db.insert(schema_1.hospitalityRooms).values({ hospitalityId, roomType, guestName }).returning();
        res.json(newRoom[0]);
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
router.delete('/rooms/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const roomQ = await db_1.db.select().from(schema_1.hospitalityRooms).where((0, drizzle_orm_1.eq)(schema_1.hospitalityRooms.id, id)).limit(1);
        if (!roomQ[0])
            return res.json({ success: true });
        const hosp = await db_1.db.select().from(schema_1.hospitality).where((0, drizzle_orm_1.eq)(schema_1.hospitality.id, roomQ[0].hospitalityId)).limit(1);
        const eventId = hosp[0]?.eventId;
        if (eventId) {
            if (!globalRoles.includes(req.user.role)) {
                const assignments = await db_1.db.select().from(schema_1.eventAssignments).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.eventAssignments.userId, req.user.id), (0, drizzle_orm_1.eq)(schema_1.eventAssignments.eventId, eventId)));
                if (!assignments.length) {
                    res.status(403).json({ error: 'Access denied' });
                    return;
                }
            }
        }
        await db_1.db.delete(schema_1.hospitalityRooms).where((0, drizzle_orm_1.eq)(schema_1.hospitalityRooms.id, id));
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
exports.default = router;
