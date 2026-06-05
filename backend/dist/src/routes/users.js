"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// List all users - Only General Manager can see the whole roster for assignment/management
router.get('/', (0, auth_1.requireRole)(['Admin', 'Director', 'General Manager', 'Project Manager']), async (req, res) => {
    try {
        const allUsers = await db_1.db.select({
            id: schema_1.users.id,
            email: schema_1.users.email,
            name: schema_1.users.name,
            role: schema_1.users.role,
            createdAt: schema_1.users.createdAt
        }).from(schema_1.users);
        res.json(allUsers);
    }
    catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
// Create a new user - Strictly Global Admin only
router.post('/', (0, auth_1.requireRole)(['Admin', 'Director', 'General Manager']), async (req, res) => {
    try {
        const { email, password, name, role } = req.body;
        if (!email || !password || !name || !role) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        const newUser = await db_1.db.insert(schema_1.users).values({
            email,
            passwordHash,
            name,
            role
        }).returning({
            id: schema_1.users.id,
            email: schema_1.users.email,
            name: schema_1.users.name,
            role: schema_1.users.role,
            createdAt: schema_1.users.createdAt
        });
        res.json(newUser[0]);
    }
    catch (error) {
        if (error.code === '23505') { // postgres unique violation
            res.status(400).json({ error: 'Email already exists' });
        }
        else {
            res.status(400).json({ error: String(error) });
        }
    }
});
exports.default = router;
