"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    name: zod_1.z.string().min(2),
    role: zod_1.z.enum(['Admin', 'Booking Manager', 'Director', 'General Manager', 'Hospitality Manager', 'Project Manager', 'Technical Manager'])
});
router.post('/register', async (req, res) => {
    try {
        const data = registerSchema.parse(req.body);
        const existingUser = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, data.email)).limit(1);
        if (existingUser.length > 0) {
            res.status(400).json({ error: 'Email already in use' });
            return;
        }
        const passwordHash = await bcrypt_1.default.hash(data.password, 10);
        const [newUser] = await db_1.db.insert(schema_1.users).values({
            email: data.email,
            passwordHash,
            name: data.name,
            role: data.role
        }).returning();
        const token = jsonwebtoken_1.default.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } });
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
router.post('/login', async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase();
        const password = req.body.password?.trim();
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const userRecords = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email)).limit(1);
        const user = userRecords[0];
        if (!user) {
            console.warn(`[AUTH] Login failed: User not found (${email})`);
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const match = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!match) {
            console.warn(`[AUTH] Login failed: Password mismatch (${email})`);
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    }
    catch (error) {
        console.error(`[AUTH] Internal error during login:`, error);
        res.status(500).json({ error: String(error) });
    }
});
exports.default = router;
