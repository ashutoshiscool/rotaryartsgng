"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const supabase_1 = require("../utils/supabase");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Configure Multer for memory storage
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
router.get('/', async (req, res) => {
    try {
        const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
        let query = db_1.db.select().from(schema_1.documents);
        if (!globalRoles.includes(req.user.role)) {
            // 1. Assigned Events
            const assignments = await db_1.db.select().from(schema_1.eventAssignments).where((0, drizzle_orm_1.eq)(schema_1.eventAssignments.userId, req.user.id));
            const eventIds = assignments.map(a => a.eventId);
            // 2. Owned Bookings (for Booking Managers)
            let ownedEventIds = [];
            if (req.user.role === 'Booking Manager') {
                const ownedB = await db_1.db.select().from(schema_1.bookings).where((0, drizzle_orm_1.eq)(schema_1.bookings.userId, req.user.id));
                const ownedE = await db_1.db.select({ id: schema_1.events.id }).from(schema_1.events).where((0, drizzle_orm_1.inArray)(schema_1.events.bookingId, ownedB.map(b => b.id).concat([-1])));
                ownedEventIds = ownedE.map(e => e.id);
            }
            const finalEventIds = [...new Set([...eventIds, ...ownedEventIds])];
            if (finalEventIds.length > 0) {
                query.where((0, drizzle_orm_1.inArray)(schema_1.documents.eventId, finalEventIds));
            }
            else {
                query.where((0, drizzle_orm_1.eq)(schema_1.documents.id, -1)); // Return empty
            }
        }
        const allDocs = await query;
        res.json(allDocs);
    }
    catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
router.post('/', upload.single('file'), auth_1.checkEventAccess, async (req, res) => {
    try {
        const { name, category, eventId, entityType, entityId } = req.body;
        let taskData = null;
        if (req.body.task) {
            try {
                taskData = JSON.parse(req.body.task);
            }
            catch (e) {
                console.error('Invalid task JSON', e);
            }
        }
        // Determine URL (Local Path -> Supabase Storage)
        let fileUrl = req.body.url;
        if (req.file) {
            const uploadedUrl = await (0, supabase_1.uploadToSupabase)(req.file.buffer, req.file.originalname, req.file.mimetype);
            if (uploadedUrl) {
                fileUrl = uploadedUrl;
            }
            else {
                res.status(500).json({ error: 'Failed to upload to Supabase' });
                return;
            }
        }
        if (!fileUrl) {
            res.status(400).json({ error: 'No file uploaded or URL provided' });
            return;
        }
        // 1. Create Document
        const docPayload = {
            name: name || (req.file ? req.file.originalname : 'Unnamed Doc'),
            category,
            eventId: parseInt(eventId),
            entityType,
            entityId: parseInt(entityId),
            url: fileUrl,
        };
        const [newDoc] = await db_1.db.insert(schema_1.documents).values(docPayload).returning();
        await db_1.db.insert(schema_1.activityLogs).values({
            userId: req.user.id,
            action: 'UPLOADED_DOCUMENT',
            entityType: 'document',
            entityId: newDoc.id,
            details: docPayload,
        });
        // 2. Optional Task Creation
        if (taskData && taskData.title) {
            const [newTask] = await db_1.db.insert(schema_1.tasks).values({
                eventId: newDoc.eventId,
                title: taskData.title,
                assignedTo: taskData.assignedTo,
                deadline: taskData.deadline ? new Date(taskData.deadline) : null,
                linkedEntity: 'document',
                linkedEntityId: newDoc.id,
                status: 'Todo'
            }).returning();
            await db_1.db.insert(schema_1.activityLogs).values({
                userId: req.user.id,
                action: 'CREATED_LINKED_TASK',
                entityType: 'task',
                entityId: newTask.id,
                details: { linkedTo: 'document', documentId: newDoc.id },
            });
        }
        res.json(newDoc);
    }
    catch (error) {
        console.error(error);
        res.status(400).json({ error: String(error) });
    }
});
exports.default = router;
