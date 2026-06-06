import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db';
import { users } from './db/schema';

import authRoutes from './routes/auth';
import bookingsRoutes from './routes/bookings';
import eventsRoutes from './routes/events';
import tasksRoutes from './routes/tasks';
import artistsRoutes from './routes/artists';
import documentsRoutes from './routes/documents';
import usersRoutes from './routes/users';
import technicalRoutes from './routes/technical';
import hospitalityRoutes from './routes/hospitality';
import adminRoutes from './routes/admin';
import calendarRoutes from './routes/calendar';
import commentsRoutes from './routes/comments';
import remindersRoutes from './routes/reminders';

import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Logging middleware for debugging network issues
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

app.use(cors());
app.use(express.json());

const apiRouter = express.Router();

apiRouter.get('/system/health', async (req, res) => {
  try {
    const result = await db.select().from(users).limit(1);
    res.json({ status: 'ok', dbConnection: 'healthy' });
  } catch (error) {
    console.error('Health check failed', error);
    res.status(500).json({ status: 'error', dbConnection: 'unhealthy', error: String(error) });
  }
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/bookings', bookingsRoutes);
apiRouter.use('/events', eventsRoutes);
apiRouter.use('/tasks', tasksRoutes);
apiRouter.use('/artists', artistsRoutes);
apiRouter.use('/documents', documentsRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/technical', technicalRoutes);
apiRouter.use('/hospitality', hospitalityRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/calendar', calendarRoutes);
apiRouter.use('/comments', commentsRoutes);
apiRouter.use('/reminders', remindersRoutes);

app.use('/api', apiRouter);

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Backend server listening at http://0.0.0.0:${port}`);
  });
}

export default app;
