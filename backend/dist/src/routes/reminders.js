"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// GET my reminders (Sorted by Due Date)
router.get('/', async (req, res) => {
    try {
        const myReminders = await db_1.db.select()
            .from(schema_1.reminders)
            .where((0, drizzle_orm_1.eq)(schema_1.reminders.userId, req.user.id))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.reminders.dueDate), (0, drizzle_orm_1.desc)(schema_1.reminders.createdAt)); // Simple desc for now, or asc for future
        res.json(myReminders);
    }
    catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
// POST new reminder
router.post('/', async (req, res) => {
    try {
        const { text, dueDate } = req.body;
        if (!text)
            return res.status(400).json({ error: 'Text is required' });
        const newRem = await db_1.db.insert(schema_1.reminders).values({
            userId: req.user.id,
            text,
            isCompleted: 0,
            dueDate: dueDate ? new Date(dueDate) : null
        }).returning();
        res.json(newRem[0]);
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
// PUT update reminder
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { isCompleted, text, dueDate } = req.body;
        const payload = {};
        if (isCompleted !== undefined)
            payload.isCompleted = isCompleted ? 1 : 0;
        if (text !== undefined)
            payload.text = text;
        if (dueDate !== undefined)
            payload.dueDate = dueDate ? new Date(dueDate) : null;
        const updated = await db_1.db.update(schema_1.reminders)
            .set(payload)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reminders.id, id), (0, drizzle_orm_1.eq)(schema_1.reminders.userId, req.user.id)))
            .returning();
        if (updated.length === 0)
            return res.status(403).json({ error: 'Forbidden or not found' });
        res.json(updated[0]);
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
// DELETE reminder
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await db_1.db.delete(schema_1.reminders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reminders.id, id), (0, drizzle_orm_1.eq)(schema_1.reminders.userId, req.user.id)))
            .returning();
        if (result.length === 0)
            return res.status(403).json({ error: 'Forbidden or not found' });
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
exports.default = router;
