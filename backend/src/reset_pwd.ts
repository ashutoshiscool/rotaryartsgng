import bcrypt from 'bcrypt';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

async function reset() {
  const hash = await bcrypt.hash('Reab@112', 10);
  await db.update(users)
    .set({ passwordHash: hash })
    .where(eq(users.email, 'admin@rotaryarts.com'));
  console.log('Password reset for admin@rotaryarts.com');
  process.exit(0);
}

reset();
