import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';

import { initDb } from './database/db';
import { initSocketServer } from './services/socketService';
import authRoutes from './routes/auth';
import visitorRequestRoutes from './routes/visitorRequests';
import adminRoutes from './routes/admin';
import directoryRoutes from './routes/directory';
import announcementRoutes from './routes/announcements';
import notificationRoutes from './routes/notifications';
import { authenticateToken } from './middleware/auth';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Database
initDb();

// Middlewares
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploaded Visitor Photos
const uploadDir = path.resolve(__dirname, '../uploads/visitor-photos');
// Protect photo uploads: verify token if in production, allow image rendering for clients
app.use(
  '/api/uploads/visitor-photos',
  (req, res, next) => {
    // In strict production, ensure auth token via header or query token
    if (process.env.NODE_ENV === 'production') {
      const token = (req.headers['authorization']?.split(' ')[1]) || (req.query.token as string);
      if (!token) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth token required to access photos' } });
      }
    }
    next();
  },
  express.static(uploadDir)
);

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/visitor-requests', visitorRequestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/directory', directoryRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', notificationRoutes);

// Health Check Endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'GreenGate Backend API',
    timestamp: new Date().toISOString(),
  });
});

// Initialize Socket.IO Server
initSocketServer(server);

// Start Server
server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 GreenGate Backend Server is running on port ${PORT}`);
  console.log(`📡 HTTP API: http://localhost:${PORT}/api`);
  console.log(`🔌 Realtime Socket.IO: http://localhost:${PORT}`);
  console.log(`📸 Visitor Photo Uploads: http://localhost:${PORT}/api/uploads/visitor-photos`);
  console.log(`==================================================`);
});
