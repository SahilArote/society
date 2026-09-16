"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const multer_1 = __importDefault(require("multer"));
const db_1 = require("./database/db");
const socketService_1 = require("./services/socketService");
const upload_1 = require("./middleware/upload");
const auth_1 = __importDefault(require("./routes/auth"));
const visitorRequests_1 = __importDefault(require("./routes/visitorRequests"));
const admin_1 = __importDefault(require("./routes/admin"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const resident_1 = __importDefault(require("./routes/resident"));
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
// Health Check Endpoint
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'GreenGate Backend API',
        timestamp: new Date().toISOString(),
    });
});
// Register Routes
app.use('/api/auth', auth_1.default);
app.use('/api/visitor-requests', visitorRequests_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/resident', resident_1.default);
// Unmatched API Routes Handler (Never return HTML)
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `The requested endpoint ${req.method} ${req.baseUrl} was not found on this server.`,
        },
    });
});
// Global Production Error Handling Middleware (Always return clean JSON)
app.use((err, req, res, _next) => {
    // 1. Multer Upload Errors
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'FILE_TOO_LARGE',
                    message: 'Photo exceeds the maximum allowed size of 10MB.',
                },
            });
        }
        return res.status(400).json({
            success: false,
            error: {
                code: 'UPLOAD_ERROR',
                message: err.message || 'File upload failed.',
            },
        });
    }
    // 2. Custom File Validation Errors
    if (err instanceof upload_1.FileValidationError || err.name === 'FileValidationError') {
        return res.status(err.status || 400).json({
            success: false,
            error: {
                code: err.code || 'INVALID_FILE_TYPE',
                message: err.message,
            },
        });
    }
    // 3. Malformed JSON Body Parsing Error
    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'INVALID_JSON',
                message: 'Malformed JSON payload in request body.',
            },
        });
    }
    // 4. Client Request Errors with explicit status (< 500)
    if (err.status && typeof err.status === 'number' && err.status < 500) {
        return res.status(err.status).json({
            success: false,
            error: {
                code: err.code || 'BAD_REQUEST',
                message: err.message || 'Invalid request.',
            },
        });
    }
    // 5. Unexpected Server Errors (500)
    // Log detailed error server-side, but do NOT leak credentials, paths, or stack traces to client
    console.error(`[Production Error] ${req.method} ${req.originalUrl}:`, err);
    return res.status(500).json({
        success: false,
        error: {
            code: 'SERVER_ERROR',
            message: 'Unable to process the request.',
        },
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
    console.log(`📸 Visitor Photo Uploads: http://localhost:${PORT}/api/visitor-requests/:id/photo`);
    console.log(`==================================================`);
});
