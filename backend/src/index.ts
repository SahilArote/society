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

// Serve Uploaded Visitor Photos securely
const uploadDir = path.resolve(__dirname, '../uploads/visitor-photos');
app.use('/api/uploads/visitor-photos', express.static(uploadDir));

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/visitor-requests', visitorRequestRoutes);
app.use('/api/admin', adminRoutes);

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
