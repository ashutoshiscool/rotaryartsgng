"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// GET combined calendar data
router.get('/', async (req, res) => {
    try {
        const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
        const isGlobal = globalRoles.includes(req.user.role);
        // 1. Get assigned event IDs
        const assignments = !isGlobal
            ? await db_1.db.select().from(schema_1.eventAssignments).where((0, drizzle_orm_1.eq)(schema_1.eventAssignments.userId, req.user.id))
            : [];
        // 2. Get owned booking event IDs (for Booking Managers)
        let ownedEventIds = [];
        if (!isGlobal && req.user.role === 'Booking Manager') {
            const ownedBookings = await db_1.db.select({ id: schema_1.bookings.id }).from(schema_1.bookings).where((0, drizzle_orm_1.eq)(schema_1.bookings.userId, req.user.id));
            const ownedEvents = await db_1.db.select({ id: schema_1.events.id }).from(schema_1.events).where((0, drizzle_orm_1.inArray)(schema_1.events.bookingId, ownedBookings.map(b => b.id).concat([-1])));
            ownedEventIds = ownedEvents.map(e => e.id);
        }
        const eventIds = [...new Set([...assignments.map(a => a.eventId), ...ownedEventIds])];
        const allEvents = isGlobal
            ? await db_1.db.select().from(schema_1.events)
            : (eventIds.length > 0 ? await db_1.db.select().from(schema_1.events).where((0, drizzle_orm_1.inArray)(schema_1.events.id, eventIds)) : []);
        const allTasks = isGlobal
            ? await db_1.db.select().from(schema_1.tasks)
            : (eventIds.length > 0
                ? await db_1.db.select().from(schema_1.tasks).where((0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(schema_1.tasks.eventId, eventIds), (0, drizzle_orm_1.eq)(schema_1.tasks.assignedTo, req.user.id)))
                : await db_1.db.select().from(schema_1.tasks).where((0, drizzle_orm_1.eq)(schema_1.tasks.assignedTo, req.user.id)));
        const allBookings = isGlobal
            ? await db_1.db.select().from(schema_1.bookings)
            : [];
        const items = [];
        allEvents.forEach((e) => items.push({ id: `event-${e.id}`, type: 'event', title: e.title, date: e.date, status: e.status, entityId: e.id }));
        allTasks.forEach((t) => { if (t.deadline)
            items.push({ id: `task-${t.id}`, type: 'task', title: t.title, date: t.deadline, status: t.status, entityId: t.id }); });
        allBookings.forEach((b) => items.push({ id: `booking-${b.id}`, type: 'booking', title: `Booking: ${b.venue}`, date: b.date, status: b.status, entityId: b.id }));
        items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        res.json(items);
    }
    catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
exports.default = router;
