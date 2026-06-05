"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use((0, auth_1.requireRole)(['Admin', 'Director', 'General Manager']));
// ── Dashboard aggregation ──
router.get('/stats', async (req, res) => {
    try {
        const [allBookings, allEvents, allTasks, allDocs, allUsers] = await Promise.all([
            db_1.db.select().from(schema_1.bookings),
            db_1.db.select().from(schema_1.events),
            db_1.db.select().from(schema_1.tasks),
            db_1.db.select().from(schema_1.documents),
            db_1.db.select({ id: schema_1.users.id, name: schema_1.users.name, email: schema_1.users.email, role: schema_1.users.role, createdAt: schema_1.users.createdAt }).from(schema_1.users),
        ]);
        res.json({
            bookings: allBookings.length,
            events: allEvents.length,
            tasks: allTasks.length,
            documents: allDocs.length,
            users: allUsers.length,
        });
    }
    catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
// ── Global data views ──
router.get('/bookings', async (_req, res) => {
    try {
        res.json(await db_1.db.select().from(schema_1.bookings));
    }
    catch (e) {
        res.status(500).json({ error: String(e) });
    }
});
router.get('/events', async (_req, res) => {
    try {
        res.json(await db_1.db.select().from(schema_1.events));
    }
    catch (e) {
        res.status(500).json({ error: String(e) });
    }
});
router.get('/tasks', async (_req, res) => {
    try {
        res.json(await db_1.db.select().from(schema_1.tasks));
    }
    catch (e) {
        res.status(500).json({ error: String(e) });
    }
});
router.get('/documents', async (_req, res) => {
    try {
        res.json(await db_1.db.select().from(schema_1.documents));
    }
    catch (e) {
        res.status(500).json({ error: String(e) });
    }
});
// ── Activity Logs ──
router.get('/logs', async (req, res) => {
    try {
        const logs = await db_1.db.select().from(schema_1.activityLogs).orderBy((0, drizzle_orm_1.desc)(schema_1.activityLogs.createdAt)).limit(200);
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
// ── System Settings ──
router.get('/settings', async (req, res) => {
    try {
        const settings = await db_1.db.select().from(schema_1.systemSettings).limit(1);
        if (!settings.length) {
            const def = await db_1.db.insert(schema_1.systemSettings).values({}).returning();
            res.json(def[0]);
            return;
        }
        res.json(settings[0]);
    }
    catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
router.put('/settings', async (req, res) => {
    try {
        const settings = await db_1.db.select().from(schema_1.systemSettings).limit(1);
        if (!settings.length) {
            const created = await db_1.db.insert(schema_1.systemSettings).values(req.body).returning();
            res.json(created[0]);
            return;
        }
        const updated = await db_1.db.update(schema_1.systemSettings).set(req.body).where((0, drizzle_orm_1.eq)(schema_1.systemSettings.id, settings[0].id)).returning();
        res.json(updated[0]);
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
// ── Company Management ──
router.get('/companies', async (_req, res) => {
    try {
        res.json(await db_1.db.select().from(schema_1.companies));
    }
    catch (e) {
        res.status(500).json({ error: String(e) });
    }
});
router.post('/companies', async (req, res) => {
    try {
        const c = await db_1.db.insert(schema_1.companies).values(req.body).returning();
        res.json(c[0]);
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
// ── User delete ──
router.delete('/users/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (id === req.user.id) {
            res.status(400).json({ error: 'Cannot delete yourself' });
            return;
        }
        await db_1.db.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
exports.default = router;
