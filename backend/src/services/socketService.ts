import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { AuthUser } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'greengate_secret_jwt_key_2026_super_secure';

let io: SocketIOServer | null = null;

export function initSocketServer(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Room Subscription / Handshake
    socket.on('join', (data: { token?: string; role?: string; residentId?: string; societyId?: string }) => {
      const societyId = data.societyId || 'soc_greengate';
      socket.join(`society:${societyId}`);

      if (data.role === 'ADMIN') {
        socket.join(`admin:${societyId}`);
        console.log(`[Socket] Joined admin:${societyId}`);
      }

      if (data.role === 'RESIDENT' && data.residentId) {
        socket.join(`resident:${data.residentId}`);
        console.log(`[Socket] Joined resident:${data.residentId}`);
      }

      if (data.role === 'GUARD') {
        socket.join(`guard:${societyId}`);
        console.log(`[Socket] Joined guard:${societyId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

export function emitVisitorCreated(data: {
  request: any;
  visitor: any;
  flatNumber: string;
  residentId: string;
  societyId: string;
}) {
  if (!io) return;

  // 1. Emit to specific Resident with Photo URL
  io.to(`resident:${data.residentId}`).emit('visitor:request_created', {
    request: data.request,
    visitor: data.visitor,
    flatNumber: data.flatNumber,
  });

  // 2. Emit to Admin Dashboard
  io.to(`admin:${data.societyId}`).emit('admin:visitor_activity', {
    type: 'NEW_REQUEST',
    requestId: data.request.id,
    visitorName: data.visitor.name,
    purpose: data.visitor.purpose,
    photoUrl: data.visitor.photoUrl,
    photo: data.visitor.photoUrl,
    flatNumber: data.flatNumber,
    status: data.request.status,
    timestamp: data.request.requestedAt,
  });
}

export function emitVisitorDecision(data: {
  request: any;
  visitor: any;
  residentId: string;
  societyId: string;
  status: 'APPROVED' | 'REJECTED' | 'EXITED';
  rejectionReason?: string;
}) {
  if (!io) return;

  // 1. Emit to Guard App
  io.to(`guard:${data.societyId}`).emit(`visitor:${data.status.toLowerCase()}`, {
    requestId: data.request.id,
    status: data.status,
    visitorName: data.visitor?.name,
    flatNumber: data.request.flatNumber,
    rejectionReason: data.rejectionReason,
  });

  io.to(`guard:${data.societyId}`).emit('visitor:request_updated', {
    requestId: data.request.id,
    status: data.status,
    rejectionReason: data.rejectionReason,
  });

  // 2. Emit to Resident PWA to sync state
  io.to(`resident:${data.residentId}`).emit('visitor:request_updated', {
    requestId: data.request.id,
    status: data.status,
  });

  // 3. Emit to Admin Dashboard
  io.to(`admin:${data.societyId}`).emit('admin:visitor_activity', {
    type: data.status,
    requestId: data.request.id,
    visitorName: data.visitor?.name,
    photoUrl: data.visitor?.photoUrl,
    photo: data.visitor?.photoUrl,
    status: data.status,
    rejectionReason: data.rejectionReason,
    timestamp: new Date().toISOString(),
  });
}

export function emitVisitorCompleted(data: {
  request: any;
  visitor: any;
  residentId: string;
  societyId: string;
}) {
  if (!io) return;

  // 1. Emit to Guard App
  io.to(`guard:${data.societyId}`).emit('visitor:completed', {
    requestId: data.request.id,
    status: 'COMPLETED',
    visitorName: data.visitor?.name,
  });

  io.to(`guard:${data.societyId}`).emit('visitor:request_updated', {
    requestId: data.request.id,
    status: 'COMPLETED',
  });

  // 2. Emit to Resident PWA
  io.to(`resident:${data.residentId}`).emit('visitor:request_updated', {
    requestId: data.request.id,
    status: 'COMPLETED',
  });

  // 3. Emit to Admin Dashboard
  io.to(`admin:${data.societyId}`).emit('admin:visitor_activity', {
    type: 'COMPLETED',
    requestId: data.request.id,
    visitorName: data.visitor?.name,
    status: 'COMPLETED',
    timestamp: new Date().toISOString(),
  });
}
