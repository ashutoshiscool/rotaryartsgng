"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("./db");
const schema_1 = require("./db/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function reset() {
    const hash = await bcrypt_1.default.hash('Reab@112', 10);
    await db_1.db.update(schema_1.users)
        .set({ passwordHash: hash })
        .where((0, drizzle_orm_1.eq)(schema_1.users.email, 'admin@rotaryarts.com'));
    console.log('Password reset for admin@rotaryarts.com');
    process.exit(0);
}
reset();
