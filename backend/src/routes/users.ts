import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users } from '../db/schema';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// List all users - Only General Manager can see the whole roster for assignment/management
router.get('/', requireRole(['Admin', 'Director', 'General Manager', 'Project Manager']), async (req: AuthRequest, res: Response) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt
    }).from(users);
    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Create a new user - Strictly Global Admin only
router.post('/', requireRole(['Admin', 'Director', 'General Manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    
    if (!email || !password || !name || !role) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await db.insert(users).values({
      email,
      passwordHash,
      name,
      role
    }).returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt
    });

    res.json(newUser[0]);
  } catch (error: any) {
    if (error.code === '23505') { // postgres unique violation
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(400).json({ error: String(error) });
    }
  }
});

export default router;
