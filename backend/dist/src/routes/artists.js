"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', async (req, res) => {
    try {
        const allArtists = await db_1.db.select().from(schema_1.artists);
        res.json(allArtists);
    }
    catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
router.post('/', async (req, res) => {
    try {
        const newArtist = await db_1.db.insert(schema_1.artists).values(req.body).returning();
        res.json(newArtist[0]);
    }
    catch (error) {
        res.status(400).json({ error: String(error) });
    }
});
exports.default = router;
