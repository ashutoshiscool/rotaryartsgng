"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const schema_1 = require("./schema");
const bcrypt_1 = __importDefault(require("bcrypt"));
async function seed() {
    console.log('Seeding data...');
    const hash = await bcrypt_1.default.hash('password123', 10);
    await index_1.db.insert(schema_1.users).values({
        email: 'admin@rotaryarts.com',
        passwordHash: hash,
        name: 'Admin User',
        role: 'Admin'
    }).onConflictDoUpdate({
        target: schema_1.users.email,
        set: {
            passwordHash: hash,
            role: 'Admin',
            name: 'Admin User'
        }
    });
    await index_1.db.insert(schema_1.artists).values({
        name: 'Daft Punk',
        genre: 'Electronic'
    }).onConflictDoNothing();
    await index_1.db.insert(schema_1.agencies).values({
        name: 'Creative Artists Agency'
    }).onConflictDoNothing();
    await index_1.db.insert(schema_1.companies).values({
        name: 'Rotary Arts Inc'
    }).onConflictDoNothing();
    console.log('Seed complete.');
    process.exit(0);
}
seed().catch(console.error);
