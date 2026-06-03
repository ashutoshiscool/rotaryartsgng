import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

async function sync() {
  try {
    const credsath = '/root/dash-v2/creds.txt';
    if (!fs.existsSync(credsath)) {
      console.error('creds.txt not found');
      process.exit(1);
    }

    const content = fs.readFileSync(credsath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);

    for (const line of lines) {
      // Handle the messy line 10 if it exists
      // "Sako Intskirveli | sako.intskirveli@rotaryarts.com | sFkZJVlKsJ7y | Project ManagerAdmin User | admin@rotaryarts.com | Reab@112 | Administrator"
      const entries = line.split(/(?=\s*[A-Z][a-z]+\s+[A-Z][a-z]+\s*\|)/);
      
      for (const entry of entries) {
        if (!entry.includes('|')) continue;
        const [name, email, password, role] = entry.split('|').map(s => s.trim());
        if (!email || !password) continue;

        const hash = await bcrypt.hash(password, 10);
        const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (existing.length > 0) {
          await db.update(users)
            .set({ passwordHash: hash, name, role: role || existing[0].role })
            .where(eq(users.id, existing[0].id));
          console.log(`Updated: ${email}`);
        } else {
          await db.insert(users).values({
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
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

sync();
