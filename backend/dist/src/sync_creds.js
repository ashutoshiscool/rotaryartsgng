"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("./db");
const schema_1 = require("./db/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function sync() {
    try {
        const credsath = '/root/dash-v2/creds.txt';
        if (!fs_1.default.existsSync(credsath)) {
            console.error('creds.txt not found');
            process.exit(1);
        }
        const content = fs_1.default.readFileSync(credsath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim().length > 0);
        for (const line of lines) {
            // Handle the messy line 10 if it exists
            // "Sako Intskirveli | sako.intskirveli@rotaryarts.com | sFkZJVlKsJ7y | Project ManagerAdmin User | admin@rotaryarts.com | Reab@112 | Administrator"
            const entries = line.split(/(?=\s*[A-Z][a-z]+\s+[A-Z][a-z]+\s*\|)/);
            for (const entry of entries) {
                if (!entry.includes('|'))
                    continue;
                const [name, email, password, role] = entry.split('|').map(s => s.trim());
                if (!email || !password)
                    continue;
                const hash = await bcrypt_1.default.hash(password, 10);
                const existing = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email)).limit(1);
                if (existing.length > 0) {
                    await db_1.db.update(schema_1.users)
                        .set({ passwordHash: hash, name, role: role || existing[0].role })
                        .where((0, drizzle_orm_1.eq)(schema_1.users.id, existing[0].id));
                    console.log(`Updated: ${email}`);
                }
                else {
                    await db_1.db.insert(schema_1.users).values({
                        email,
                        passwordHash: hash,
                        name,
                        role: role || 'Project Manager'
                    });
                    console.log(`Created: ${email}`);
                }
            }
        }
        console.log('Sync complete');
        process.exit(0);
    }
    catch (error) {
        console.error('Sync failed:', error);
        process.exit(1);
    }
}
sync();
