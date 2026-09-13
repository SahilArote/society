"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./database/db");
const socketService_1 = require("./services/socketService");
const auth_1 = __importDefault(require("./routes/auth"));
const visitorRequests_1 = __importDefault(require("./routes/visitorRequests"));
const admin_1 = __importDefault(require("./routes/admin"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = process.env.PORT || 5000;
// Initialize Database
(0, db_1.initDb)();
// Middlewares
app.use((0, cors_1.default)({ origin: '*', credentials: true }));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Register Routes
app.use('/api/auth', auth_1.default);
app.use('/api/visitor-requests', visitorRequests_1.default);
app.use('/api/admin', admin_1.default);
// Health Check Endpoint
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'GreenGate Backend API',
        timestamp: new Date().toISOString(),
    });
});
// Initialize Socket.IO Server
(0, socketService_1.initSocketServer)(server);
// Start Server
server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 GreenGate Backend Server is running on port ${PORT}`);
    console.log(`📡 HTTP API: http://localhost:${PORT}/api`);
    console.log(`🔌 Realtime Socket.IO: http://localhost:${PORT}`);
    console.log(`📸 Visitor Photo Uploads: http://localhost:${PORT}/api/uploads/visitor-photos`);
    console.log(`==================================================`);
});
