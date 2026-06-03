import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, eventAssignments } from '../db/schema';
import { eq, and } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userRecords = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
    if (!userRecords.length) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    req.user = userRecords[0];
    next();
  } catch (err) {
    res.status(403).json({ error: 'Forbidden / Invalid token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
};

export const checkEventAccess = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const globalRoles = ['Admin', 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'];
  if (globalRoles.includes(req.user.role)) {
    next();
    return;
  }

  // Handle various eventId locations
  const eventId = parseInt(
    req.params.id || 
    req.params.eventId || 
    req.body.eventId || 
    (req.query.eventId as string)
  );

  if (!eventId || isNaN(eventId)) {
    // If no ID provided, skip (handled by specifics) or check if it's general listing
    next();
    return;
  }

  const assignments = await db.select().from(eventAssignments).where(
    and(eq(eventAssignments.userId, req.user.id), eq(eventAssignments.eventId, eventId))
  );

  if (!assignments.length) {
    res.status(403).json({ error: 'You are not assigned to this event' });
    return;
  }

  next();
};
