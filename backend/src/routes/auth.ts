import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['Admin', 'Booking Manager', 'Director', 'General Manager', 'Hospitality Manager', 'Project Manager', 'Technical Manager'])
});

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const existingUser = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (existingUser.length > 0) {
       res.status(400).json({ error: 'Email already in use' });
       return;
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const [newUser] = await db.insert(users).values({
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role
    }).returning();
    
    const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } });
  } catch (error) {
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

    const userRecords = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = userRecords[0];
    
    if (!user) {
      console.warn(`[AUTH] Login failed: User not found (${email})`);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      console.warn(`[AUTH] Login failed: Password mismatch (${email})`);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error(`[AUTH] Internal error during login:`, error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;
