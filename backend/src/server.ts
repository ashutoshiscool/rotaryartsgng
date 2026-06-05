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

app.get('/system/health', async (req, res) => {
  try {
    const result = await db.select().from(users).limit(1);
    res.json({ status: 'ok', dbConnection: 'healthy' });
  } catch (error) {
    console.error('Health check failed', error);
    res.status(500).json({ status: 'error', dbConnection: 'unhealthy', error: String(error) });
  }
});

app.use('/auth', authRoutes);
app.use('/bookings', bookingsRoutes);
app.use('/events', eventsRoutes);
app.use('/tasks', tasksRoutes);
app.use('/artists', artistsRoutes);
app.use('/documents', documentsRoutes);
app.use('/users', usersRoutes);
app.use('/technical', technicalRoutes);
app.use('/hospitality', hospitalityRoutes);
app.use('/admin', adminRoutes);
app.use('/calendar', calendarRoutes);
app.use('/comments', commentsRoutes);
app.use('/reminders', remindersRoutes);

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Backend server listening at http://0.0.0.0:${port}`);
});
