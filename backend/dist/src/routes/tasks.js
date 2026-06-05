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
const allRoles = ['Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
// GET filtered tasks
router.get('/', async (req, res) => {
    try {
        let query = db_1.db.select({
            id: schema_1.tasks.id,
            eventId: schema_1.tasks.eventId,
            title: schema_1.tasks.title,
            status: schema_1.tasks.status,
            assignedTo: schema_1.tasks.assignedTo,
            assignedToName: schema_1.users.name,
            deadline: schema_1.tasks.deadline,
            linkedEntity: schema_1.tasks.linkedEntity,
            linkedEntityId: schema_1.tasks.linkedEntityId,
        }).from(schema_1.tasks)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.tasks.assignedTo, schema_1.users.id));
        if (!globalRoles.includes(req.user.role)) {
            // Find assigned events
            const assignments = await db_1.db.select().from(schema_1.eventAssignments).where((0, drizzle_orm_1.eq)(schema_1.eventAssignments.userId, req.user.id));
            const eventIds = assignments.map(a => a.eventId);
            // Filter: assigned to me OR for event I'm assigned to
            if (eventIds.length > 0) {
                query.where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.tasks.assignedTo, req.user.id), (0, drizzle_orm_1.inArray)(schema_1.tasks.eventId, eventIds)));
            }
            else {
                query.where((0, drizzle_orm_1.eq)(schema_1.tasks.assignedTo, req.user.id));
            }
        }
        const filteredTasks = await query;
        res.json(filteredTasks);
    }
    catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
// GET tasks for a specific event
router.get('/event/:eventId', auth_1.checkEventAccess, async (req, res) => {
    try {
        const eventId = parseInt(req.params.eventId);
        const eventTasks = await db_1.db.select().from(schema_1.tasks).where((0, drizzle_orm_1.eq)(schema_1.tasks.eventId, eventId));
        // Technical Manager only sees technical tasks? User didn't explicitly say for tasks,
        // but hinted "only see their part". For now, we'll keep it simple for tasks,
        // assuming tasks for an event are shared unless further refined.
        res.json(eventTasks);
    }
    catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
// ... rest of the file (POST, PUT, DELETE) remains similarly updated if needed, 
// but checkEventAccess should be used for event-specific tasks.
// POST create task
router.post('/', auth_1.checkEventAccess, async (req, res) => {
    try {
        const payload = { ...req.body };
        if (payload.deadline)
            payload.deadline = new Date(payload.deadline);
        const newTask = await db_1.db.insert(schema_1.tasks).values(payload).returning();
        await db_1.db.insert(schema_1.activityLogs).values({
            userId: req.user.id,
            action: 'CREATED_TASK',
            entityType: 'task',
            entityId: newTask[0].id,
            details: payload,
        });
        res.json(newTask[0]);
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
// PUT update task
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const payload = { ...req.body };
        if (payload.deadline)
            payload.deadline = new Date(payload.deadline);
        const oldQuery = await db_1.db.select().from(schema_1.tasks).where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id)).limit(1);
        if (!oldQuery.length) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        const targetTask = oldQuery[0];
        const eventId = targetTask.eventId;
        const isAssigned = targetTask.assignedTo === req.user.id;
        if (eventId) {
            const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Technical Manager', 'Hospitality Manager'];
            if (!globalRoles.includes(req.user.role) && !isAssigned) {
                const assignments = await db_1.db.select().from(schema_1.eventAssignments).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.eventAssignments.userId, req.user.id), (0, drizzle_orm_1.eq)(schema_1.eventAssignments.eventId, eventId)));
                if (!assignments.length) {
                    res.status(403).json({ error: 'You are not assigned to this event' });
                    return;
                }
            }
        }
        else if (!isAssigned && !globalRoles.includes(req.user.role)) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }
        const updated = await db_1.db.update(schema_1.tasks).set(payload).where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id)).returning();
        await db_1.db.insert(schema_1.activityLogs).values({
            userId: req.user.id,
            action: 'MODIFIED_TASK',
            entityType: 'task',
            entityId: id,
            details: { old: oldQuery[0], new: payload },
        });
        res.json(updated[0]);
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
// DELETE task
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const targetTask = await db_1.db.select().from(schema_1.tasks).where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id)).limit(1);
        if (!targetTask.length)
            return res.json({ success: true });
        const eventId = targetTask[0].eventId;
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
        await db_1.db.delete(schema_1.tasks).where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id));
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
exports.default = router;
