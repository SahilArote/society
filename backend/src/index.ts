import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';

import { initDb } from './database/db';
import { initSocketServer } from './services/socketService';
import { FileValidationError } from './middleware/upload';
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

// Health Check Endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'GreenGate Backend API',
    timestamp: new Date().toISOString(),
  });
});

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/visitor-requests', visitorRequestRoutes);
app.use('/api/admin', adminRoutes);

// Unmatched API Routes Handler (Never return HTML)
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `The requested endpoint ${req.method} ${req.baseUrl} was not found on this server.`,
    },
  });
});

// Global Production Error Handling Middleware (Always return clean JSON)
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  // 1. Multer Upload Errors
  if (err instanceof multer.MulterError) {
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
  if (err instanceof FileValidationError || err.name === 'FileValidationError') {
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
initSocketServer(server);

// Start Server
server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 GreenGate Backend Server is running on port ${PORT}`);
  console.log(`📡 HTTP API: http://localhost:${PORT}/api`);
  console.log(`🔌 Realtime Socket.IO: http://localhost:${PORT}`);
  console.log(`📸 Visitor Photo Uploads: http://localhost:${PORT}/api/visitor-requests/:id/photo`);
  console.log(`==================================================`);
});
