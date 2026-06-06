import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { db } from './src/db/index';
import { users } from './src/db/schema';

const CREDS_FILE = '/home/admin/dash-v2/credentials.txt';

async function main() {
    if (!fs.existsSync(CREDS_FILE)) {
        console.error(`File not found: ${CREDS_FILE}`);
        return;
    }

    const content = fs.readFileSync(CREDS_FILE, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() !== '');

    console.log(`Found ${lines.length} lines in credentials.txt`);

    for (const line of lines) {
        // Format: Name | Email | Password | Role
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 4) {
            const name = parts[0];
            const email = parts[1];
            const plainPassword = parts[2];
            const role = parts[3];

            console.log(`Processing: ${email}`);

            try {
                const passwordHash = await bcrypt.hash(plainPassword, 10);
                
                await db.insert(users).values({
                    email,
                    passwordHash,
                    name,
                    role: role as any
                }).onConflictDoUpdate({
                    target: users.email,
                    set: {
                        passwordHash,
                        name,
                        role: role as any
                    }
                });
                console.log(`[SUCCESS] Migrated user: ${email}`);
            } catch (err) {
                console.error(`[ERROR] Failed to migrate user ${email}:`, err);
            }
        }
    }
    console.log('Migration complete.');
    process.exit(0);
}

main().catch(console.error);
