import { Router, Request, Response } from 'express';
import { db } from '../db';
import { artists } from '../db/schema';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const allArtists = await db.select().from(artists);
    res.json(allArtists);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const newArtist = await db.insert(artists).values(req.body).returning();
    res.json(newArtist[0]);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

export default router;
