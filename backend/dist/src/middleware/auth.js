"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkEventAccess = exports.requireRole = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const userRecords = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, decoded.id)).limit(1);
        if (!userRecords.length) {
            res.status(401).json({ error: 'User not found' });
            return;
        }
        req.user = userRecords[0];
        next();
    }
    catch (err) {
        res.status(403).json({ error: 'Forbidden / Invalid token' });
    }
};
exports.authenticate = authenticate;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
const checkEventAccess = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
    if (globalRoles.includes(req.user.role)) {
        next();
        return;
    }
    // Handle various eventId locations
    const eventId = parseInt(req.params.id ||
        req.params.eventId ||
        req.body.eventId ||
        req.query.eventId);
    if (!eventId || isNaN(eventId)) {
        // If no ID provided, skip (handled by specifics) or check if it's general listing
        next();
        return;
    }
    const assignments = await db_1.db.select().from(schema_1.eventAssignments).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.eventAssignments.userId, req.user.id), (0, drizzle_orm_1.eq)(schema_1.eventAssignments.eventId, eventId)));
    if (!assignments.length) {
        res.status(403).json({ error: 'You are not assigned to this event' });
        return;
    }
    next();
};
exports.checkEventAccess = checkEventAccess;
