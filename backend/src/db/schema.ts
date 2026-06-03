import { pgTable, serial, varchar, text, timestamp, doublePrecision, integer, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: text('role').notNull().default('Project Manager'), // 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'
  companyId: integer('company_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  baseCurrency: varchar('base_currency', { length: 10 }).default('USD'),
  eurExchangeRate: doublePrecision('eur_rate').default(1.08),
  gelExchangeRate: doublePrecision('gel_rate').default(2.65),
  features: jsonb('features'), // Toggles
});

export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const artists = pgTable('artists', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  genre: varchar('genre', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const agencies = pgTable('agencies', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const agents = pgTable('agents', {
  id: serial('id').primaryKey(),
  agencyId: integer('agency_id').references(() => agencies.id),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  artistId: integer('artist_id').references(() => artists.id).notNull(),
  agencyId: integer('agency_id').references(() => agencies.id),
  agentId: integer('agent_id').references(() => agents.id),
  date: timestamp('date').notNull(),
  status: varchar('status', { length: 50 }).default('Pending'), // Pending, Accepted, Rejected
  venue: varchar('venue', { length: 255 }).notNull(),
  brand: varchar('brand', { length: 255 }), // MonoHall, NOISE, etc.
  requestedFee: doublePrecision('requested_fee'),
  offeredFee: doublePrecision('offered_fee'),
  currency: varchar('currency', { length: 10 }).default('USD'),
  exchangeRateAtAcceptance: doublePrecision('exchange_rate'),
  metrics: jsonb('metrics'), // Spotify, YouTube data
  details: text('details'),
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').references(() => bookings.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  date: timestamp('date').notNull(),
  status: varchar('status', { length: 50 }).default('Upcoming'), // Upcoming, In Progress, Completed
  organization: varchar('organization', { length: 255 }), // MonoHall, NOISE, etc.
  createdAt: timestamp('created_at').defaultNow(),
});

export const technicalItems = pgTable('technical_items', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  category: varchar('category', { length: 50 }).notNull(), // Stage, Lights, Sound, LED
  name: varchar('name', { length: 255 }).notNull(),
  specs: text('specs'),
  quantity: integer('quantity').default(1),
  status: varchar('status', { length: 50 }).default('Pending'), // Pending, Procured
  cost: doublePrecision('cost').default(0),
});

export const hospitality = pgTable('hospitality', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  hotelName: varchar('hotel_name', { length: 255 }),
  transportDetails: text('transport_details'),
  amenities: text('amenities'),
  requirements: text('requirements'),
  travelFlights: text('travel_flights'),
  groundDriverContact: text('ground_driver_contact'),
  groundRoute: text('ground_route'), // From/To
  groundTime: text('ground_time'),
});

export const hospitalityRooms = pgTable('hospitality_rooms', {
  id: serial('id').primaryKey(),
  hospitalityId: integer('hospitality_id').references(() => hospitality.id).notNull(),
  roomType: varchar('room_type', { length: 100 }).notNull(),
  guestName: varchar('guest_name', { length: 255 }).notNull(),
});

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').references(() => events.id),
  title: varchar('title', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).default('Todo'), // Todo, In Progress, Done
  assignedTo: integer('assigned_to').references(() => users.id),
  deadline: timestamp('deadline'),
  linkedEntity: varchar('linked_entity', { length: 50 }), // booking, event
  linkedEntityId: integer('linked_entity_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').references(() => events.id),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }),
  url: varchar('url', { length: 1024 }).notNull(),
  tags: varchar('tags', { length: 255 }),
  category: varchar('category', { length: 50 }), // Riders, Press-kits, etc.
  entityType: varchar('entity_type', { length: 50 }),
  entityId: integer('entity_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // event, booking, task
  entityId: integer('entity_id').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 255 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: integer('entity_id').notNull(),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow(),
});
export const eventAssignments = pgTable('event_assignments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  assignedBy: integer('assigned_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const reminders = pgTable('reminders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  text: text('text').notNull(),
  isCompleted: integer('is_completed').default(0), // 0 or 1
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow(),
});
