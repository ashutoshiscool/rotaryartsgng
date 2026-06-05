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
const allTechRoles = ['Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager'];
const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
router.use((0, auth_1.requireRole)(allTechRoles));
// Fetch all technical items for a specific event
router.get('/event/:eventId', auth_1.checkEventAccess, async (req, res) => {
    try {
        const items = await db_1.db.select().from(schema_1.technicalItems).where((0, drizzle_orm_1.eq)(schema_1.technicalItems.eventId, parseInt(req.params.eventId)));
        res.json(items);
    }
    catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
// Update a technical item
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const payload = { ...req.body };
        // Check if user has access to the event this item belongs to
        const targetItem = await db_1.db.select().from(schema_1.technicalItems).where((0, drizzle_orm_1.eq)(schema_1.technicalItems.id, id)).limit(1);
        const eventId = targetItem[0]?.eventId;
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
        const oldItem = targetItem[0];
        const updated = await db_1.db.update(schema_1.technicalItems).set(payload).where((0, drizzle_orm_1.eq)(schema_1.technicalItems.id, id)).returning();
        await db_1.db.insert(schema_1.activityLogs).values({
            userId: req.user.id,
            action: 'MODIFIED_TECHNICAL_ITEM',
            entityType: 'technical_item',
            entityId: id,
            details: { old: oldItem, new: payload }
        });
        res.json(updated[0]);
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
// Create a new technical item
router.post('/', auth_1.checkEventAccess, async (req, res) => {
    try {
        const payload = { ...req.body };
        const newItem = await db_1.db.insert(schema_1.technicalItems).values(payload).returning();
        await db_1.db.insert(schema_1.activityLogs).values({
            userId: req.user.id,
            action: 'CREATED_TECHNICAL_ITEM',
            entityType: 'technical_item',
            entityId: newItem[0].id,
            details: payload
        });
        res.json(newItem[0]);
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const targetItem = await db_1.db.select().from(schema_1.technicalItems).where((0, drizzle_orm_1.eq)(schema_1.technicalItems.id, id)).limit(1);
        const eventId = targetItem[0]?.eventId;
        if (eventId) {
            const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Technical Manager', 'Hospitality Manager'];
            if (!globalRoles.includes(req.user.role)) {
                const assignments = await db_1.db.select().from(schema_1.eventAssignments).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.eventAssignments.userId, req.user.id), (0, drizzle_orm_1.eq)(schema_1.eventAssignments.eventId, eventId)));
                if (!assignments.length) {
                    res.status(403).json({ error: 'Access denied' });
                    return;
                }
            }
        }
        await db_1.db.delete(schema_1.technicalItems).where((0, drizzle_orm_1.eq)(schema_1.technicalItems.id, id));
        await db_1.db.insert(schema_1.activityLogs).values({
            userId: req.user.id,
            action: 'DELETED_TECHNICAL_ITEM',
            entityType: 'technical_item',
            entityId: id,
            details: { timestamp: new Date() }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
exports.default = router;
