"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminders = exports.eventAssignments = exports.activityLogs = exports.comments = exports.documents = exports.tasks = exports.hospitalityRooms = exports.hospitality = exports.technicalItems = exports.events = exports.bookings = exports.agents = exports.agencies = exports.artists = exports.companies = exports.systemSettings = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    passwordHash: (0, pg_core_1.text)('password_hash').notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    role: (0, pg_core_1.text)('role').notNull().default('Project Manager'), // 'Director', 'General Manager', 'Project Manager', 'Booking Manager', 'Technical Manager', 'Hospitality Manager'
    companyId: (0, pg_core_1.integer)('company_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.systemSettings = (0, pg_core_1.pgTable)('system_settings', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    baseCurrency: (0, pg_core_1.varchar)('base_currency', { length: 10 }).default('USD'),
    eurExchangeRate: (0, pg_core_1.doublePrecision)('eur_rate').default(1.08),
    gelExchangeRate: (0, pg_core_1.doublePrecision)('gel_rate').default(2.65),
    features: (0, pg_core_1.jsonb)('features'), // Toggles
});
exports.companies = (0, pg_core_1.pgTable)('companies', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.artists = (0, pg_core_1.pgTable)('artists', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    genre: (0, pg_core_1.varchar)('genre', { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.agencies = (0, pg_core_1.pgTable)('agencies', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.agents = (0, pg_core_1.pgTable)('agents', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    agencyId: (0, pg_core_1.integer)('agency_id').references(() => exports.agencies.id),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.bookings = (0, pg_core_1.pgTable)('bookings', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    artistId: (0, pg_core_1.integer)('artist_id').references(() => exports.artists.id).notNull(),
    agencyId: (0, pg_core_1.integer)('agency_id').references(() => exports.agencies.id),
    agentId: (0, pg_core_1.integer)('agent_id').references(() => exports.agents.id),
    date: (0, pg_core_1.timestamp)('date').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('Pending'), // Pending, Accepted, Rejected
    venue: (0, pg_core_1.varchar)('venue', { length: 255 }).notNull(),
    brand: (0, pg_core_1.varchar)('brand', { length: 255 }), // MonoHall, NOISE, etc.
    requestedFee: (0, pg_core_1.doublePrecision)('requested_fee'),
    offeredFee: (0, pg_core_1.doublePrecision)('offered_fee'),
    currency: (0, pg_core_1.varchar)('currency', { length: 10 }).default('USD'),
    exchangeRateAtAcceptance: (0, pg_core_1.doublePrecision)('exchange_rate'),
    metrics: (0, pg_core_1.jsonb)('metrics'), // Spotify, YouTube data
    details: (0, pg_core_1.text)('details'),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
});
exports.events = (0, pg_core_1.pgTable)('events', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    bookingId: (0, pg_core_1.integer)('booking_id').references(() => exports.bookings.id).notNull(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    date: (0, pg_core_1.timestamp)('date').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('Upcoming'), // Upcoming, In Progress, Completed
    organization: (0, pg_core_1.varchar)('organization', { length: 255 }), // MonoHall, NOISE, etc.
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.technicalItems = (0, pg_core_1.pgTable)('technical_items', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    eventId: (0, pg_core_1.integer)('event_id').references(() => exports.events.id).notNull(),
    category: (0, pg_core_1.varchar)('category', { length: 50 }).notNull(), // Stage, Lights, Sound, LED
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    specs: (0, pg_core_1.text)('specs'),
    quantity: (0, pg_core_1.integer)('quantity').default(1),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('Pending'), // Pending, Procured
    cost: (0, pg_core_1.doublePrecision)('cost').default(0),
});
exports.hospitality = (0, pg_core_1.pgTable)('hospitality', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    eventId: (0, pg_core_1.integer)('event_id').references(() => exports.events.id).notNull(),
    hotelName: (0, pg_core_1.varchar)('hotel_name', { length: 255 }),
    transportDetails: (0, pg_core_1.text)('transport_details'),
    amenities: (0, pg_core_1.text)('amenities'),
    requirements: (0, pg_core_1.text)('requirements'),
    travelFlights: (0, pg_core_1.text)('travel_flights'),
    groundDriverContact: (0, pg_core_1.text)('ground_driver_contact'),
    groundRoute: (0, pg_core_1.text)('ground_route'), // From/To
    groundTime: (0, pg_core_1.text)('ground_time'),
});
exports.hospitalityRooms = (0, pg_core_1.pgTable)('hospitality_rooms', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    hospitalityId: (0, pg_core_1.integer)('hospitality_id').references(() => exports.hospitality.id).notNull(),
    roomType: (0, pg_core_1.varchar)('room_type', { length: 100 }).notNull(),
    guestName: (0, pg_core_1.varchar)('guest_name', { length: 255 }).notNull(),
});
exports.tasks = (0, pg_core_1.pgTable)('tasks', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    eventId: (0, pg_core_1.integer)('event_id').references(() => exports.events.id),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('Todo'), // Todo, In Progress, Done
    assignedTo: (0, pg_core_1.integer)('assigned_to').references(() => exports.users.id),
    deadline: (0, pg_core_1.timestamp)('deadline'),
    linkedEntity: (0, pg_core_1.varchar)('linked_entity', { length: 50 }), // booking, event
    linkedEntityId: (0, pg_core_1.integer)('linked_entity_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.documents = (0, pg_core_1.pgTable)('documents', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    eventId: (0, pg_core_1.integer)('event_id').references(() => exports.events.id),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    type: (0, pg_core_1.varchar)('type', { length: 50 }),
    url: (0, pg_core_1.varchar)('url', { length: 1024 }).notNull(),
    tags: (0, pg_core_1.varchar)('tags', { length: 255 }),
    category: (0, pg_core_1.varchar)('category', { length: 50 }), // Riders, Press-kits, etc.
    entityType: (0, pg_core_1.varchar)('entity_type', { length: 50 }),
    entityId: (0, pg_core_1.integer)('entity_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.comments = (0, pg_core_1.pgTable)('comments', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id).notNull(),
    entityType: (0, pg_core_1.varchar)('entity_type', { length: 50 }).notNull(), // event, booking, task
    entityId: (0, pg_core_1.integer)('entity_id').notNull(),
    content: (0, pg_core_1.text)('content').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.activityLogs = (0, pg_core_1.pgTable)('activity_logs', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id),
    action: (0, pg_core_1.varchar)('action', { length: 255 }).notNull(),
    entityType: (0, pg_core_1.varchar)('entity_type', { length: 50 }).notNull(),
    entityId: (0, pg_core_1.integer)('entity_id').notNull(),
    details: (0, pg_core_1.jsonb)('details'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.eventAssignments = (0, pg_core_1.pgTable)('event_assignments', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id).notNull(),
    eventId: (0, pg_core_1.integer)('event_id').references(() => exports.events.id).notNull(),
    assignedBy: (0, pg_core_1.integer)('assigned_by').references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.reminders = (0, pg_core_1.pgTable)('reminders', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id).notNull(),
    text: (0, pg_core_1.text)('text').notNull(),
    isCompleted: (0, pg_core_1.integer)('is_completed').default(0), // 0 or 1
    dueDate: (0, pg_core_1.timestamp)('due_date'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
