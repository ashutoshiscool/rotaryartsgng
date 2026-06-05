"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Middleware adapter for comments since they use entityId instead of id
const checkCommentAccess = async (req, res, next) => {
    const { entityType, entityId } = req.params;
    const eid = entityType === 'event' ? parseInt(entityId) : null;
    if (eid) {
        req.params.id = String(eid); // temporary map for the middleware
        return (0, auth_1.checkEventAccess)(req, res, next);
    }
    next();
};
// GET comments for an entity (booking, event, task)
router.get('/:entityType/:entityId', checkCommentAccess, async (req, res) => {
    try {
        const allComments = await db_1.db.select({
            id: schema_1.comments.id,
            userId: schema_1.comments.userId,
            entityType: schema_1.comments.entityType,
            entityId: schema_1.comments.entityId,
            content: schema_1.comments.content,
            createdAt: schema_1.comments.createdAt,
            userName: schema_1.users.name,
            userRole: schema_1.users.role,
        })
            .from(schema_1.comments)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.comments.userId, schema_1.users.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.comments.entityType, req.params.entityType), (0, drizzle_orm_1.eq)(schema_1.comments.entityId, parseInt(req.params.entityId))));
        res.json(allComments);
    }
    catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
// POST new comment
router.post('/', async (req, res) => {
    try {
        const { entityType, entityId, content } = req.body;
        const newComment = await db_1.db.insert(schema_1.comments).values({
            userId: req.user.id,
            entityType,
            entityId,
            content,
        }).returning();
        res.json(newComment[0]);
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
exports.default = router;
