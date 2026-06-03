import { db } from './index';
import { users, artists, agencies, companies } from './schema';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('Seeding data...');
  
  const hash = await bcrypt.hash('password123', 10);
  
  await db.insert(users).values({
    email: 'admin@rotaryarts.com',
    passwordHash: hash,
    name: 'Admin User',
    role: 'Admin'
  }).onConflictDoUpdate({
    target: users.email,
    set: {
      passwordHash: hash,
      role: 'Admin',
      name: 'Admin User'
    }
  });

  await db.insert(artists).values({
    name: 'Daft Punk',
    genre: 'Electronic'
  }).onConflictDoNothing();

  await db.insert(agencies).values({
    name: 'Creative Artists Agency'
  }).onConflictDoNothing();

  await db.insert(companies).values({
    name: 'Rotary Arts Inc'
  }).onConflictDoNothing();

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch(console.error);
