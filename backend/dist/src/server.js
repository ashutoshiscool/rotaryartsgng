"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./db");
const schema_1 = require("./db/schema");
const auth_1 = __importDefault(require("./routes/auth"));
const bookings_1 = __importDefault(require("./routes/bookings"));
const events_1 = __importDefault(require("./routes/events"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const artists_1 = __importDefault(require("./routes/artists"));
const documents_1 = __importDefault(require("./routes/documents"));
const users_1 = __importDefault(require("./routes/users"));
const technical_1 = __importDefault(require("./routes/technical"));
const hospitality_1 = __importDefault(require("./routes/hospitality"));
const admin_1 = __importDefault(require("./routes/admin"));
const calendar_1 = __importDefault(require("./routes/calendar"));
const comments_1 = __importDefault(require("./routes/comments"));
const reminders_1 = __importDefault(require("./routes/reminders"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Logging middleware for debugging network issues
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
    next();
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/system/health', async (req, res) => {
    try {
        const result = await db_1.db.select().from(schema_1.users).limit(1);
        res.json({ status: 'ok', dbConnection: 'healthy' });
    }
    catch (error) {
        console.error('Health check failed', error);
        res.status(500).json({ status: 'error', dbConnection: 'unhealthy', error: String(error) });
    }
});
app.use('/auth', auth_1.default);
app.use('/bookings', bookings_1.default);
app.use('/events', events_1.default);
app.use('/tasks', tasks_1.default);
app.use('/artists', artists_1.default);
app.use('/documents', documents_1.default);
app.use('/users', users_1.default);
app.use('/technical', technical_1.default);
app.use('/hospitality', hospitality_1.default);
app.use('/admin', admin_1.default);
app.use('/calendar', calendar_1.default);
app.use('/comments', comments_1.default);
app.use('/reminders', reminders_1.default);
app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Backend server listening at http://0.0.0.0:${port}`);
});
