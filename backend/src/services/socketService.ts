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

  // Socket.IO Handshake Authentication Middleware
  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers['authorization'] && socket.handshake.headers['authorization'].split(' ')[1]) ||
        socket.handshake.query?.token;

      if (!token) {
        console.warn(`[Socket Auth] Rejected unauthenticated connection from ${socket.id}`);
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token as string, JWT_SECRET) as AuthUser;
      socket.data.user = decoded;
      next();
    } catch (err: any) {
      console.warn(`[Socket Auth] Token verification failed for ${socket.id}: ${err.message}`);
      return next(new Error('Authentication failed: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as AuthUser;
    console.log(`[Socket] Authenticated client connected: ${socket.id} (${user.name} - ${user.role})`);

    // Server-Controlled Room Assignments based strictly on verified JWT identity
    socket.join(`society:${user.societyId}`);

    if (user.role === 'RESIDENT') {
      socket.join(`resident:${user.id}`);
      console.log(`[Socket] Auto-joined room resident:${user.id}`);
    } else if (user.role === 'GUARD') {
      socket.join(`guard:${user.id}`);
      socket.join(`guard_society:${user.societyId}`);
      console.log(`[Socket] Auto-joined rooms guard:${user.id} & guard_society:${user.societyId}`);
    } else if (user.role === 'ADMIN') {
      socket.join(`admin:${user.societyId}`);
      console.log(`[Socket] Auto-joined room admin:${user.societyId}`);
    } else if ((user as any).role === 'PROSPECTIVE_RESIDENT' || (user as any).registrationId) {
      const regId = (user as any).registrationId || user.id;
      socket.join(`registration:${regId}`);
      console.log(`[Socket] Auto-joined room registration:${regId}`);
    }

    socket.on('join_registration', (regId: string) => {
      if (regId && typeof regId === 'string') {
        socket.join(`registration:${regId}`);
        console.log(`[Socket] Joined registration room registration:${regId}`);
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
  requestId: string;
  visitor: any;
  flatNumber: string;
  gateName?: string;
  guardName?: string;
  residentId: string;
  societyId: string;
  requestedAt: string;
}) {
  if (!io) return;

  // 1. Emit to specific Resident with Photo URL
  io.to(`resident:${data.residentId}`).emit('visitor:request_created', {
    requestId: data.requestId,
    request: {
      id: data.requestId,
      status: 'PENDING',
      requestedAt: data.requestedAt,
    },
    visitor: data.visitor,
    flatNumber: data.flatNumber,
    gateName: data.gateName || 'Main Gate',
    guardName: data.guardName || 'Gate Security',
  });

  // 2. Emit to Admin Dashboard without photo per requirements
  io.to(`admin:${data.societyId}`).emit('admin:visitor_activity', {
    type: 'NEW_REQUEST',
    requestId: data.requestId,
    visitorName: data.visitor.name,
    purpose: data.visitor.purpose,
    flatNumber: data.flatNumber,
    gateName: data.gateName || 'Main Gate',
    guardName: data.guardName || 'Gate Security',
    status: 'PENDING',
    timestamp: data.requestedAt,
  });
}

export function emitVisitorDecision(data: {
  requestId: string;
  guardId: string;
  residentId: string;
  societyId: string;
  visitorName: string;
  flatNumber: string;
  gateName?: string;
  status: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}) {
  if (!io) return;

  const now = new Date().toISOString();

  // 1. Emit to exact Guard who created the request and guard room
  const decisionPayload = {
    requestId: data.requestId,
    status: data.status,
    visitorName: data.visitorName,
    flatNumber: data.flatNumber,
    rejectionReason: data.rejectionReason,
    respondedAt: now,
  };

  io.to(`guard:${data.guardId}`).emit(`visitor:${data.status.toLowerCase()}`, decisionPayload);
  io.to(`guard:${data.guardId}`).emit('visitor:request_updated', decisionPayload);
  io.to(`guard_society:${data.societyId}`).emit(`visitor:${data.status.toLowerCase()}`, decisionPayload);

  // 2. Emit to Resident PWA to sync state
  io.to(`resident:${data.residentId}`).emit('visitor:request_updated', {
    requestId: data.requestId,
    status: data.status,
    rejectionReason: data.rejectionReason,
    respondedAt: now,
  });

  // 3. Emit to Admin Dashboard (metadata & status change only, NO photo)
  io.to(`admin:${data.societyId}`).emit('admin:visitor_activity', {
    type: data.status,
    requestId: data.requestId,
    visitorName: data.visitorName,
    flatNumber: data.flatNumber,
    gateName: data.gateName || 'Main Gate',
    status: data.status,
    rejectionReason: data.rejectionReason,
    timestamp: now,
  });
}

export function emitRegistrationCreated(societyId: string, registration: any) {
  if (!io) return;
  io.to(`admin:${societyId}`).emit('admin:registration_request', {
    type: 'NEW_REGISTRATION',
    registration,
    timestamp: new Date().toISOString(),
  });
}

export function emitRegistrationUpdated(
  societyId: string,
  requestId: string,
  mobile: string,
  status: 'APPROVED' | 'REJECTED',
  reason?: string
) {
  if (!io) return;
  const now = new Date().toISOString();
  const payload = {
    requestId,
    mobile,
    status,
    rejectionReason: reason,
    timestamp: now,
  };

  // 1. Emit to specific registration tracking room
  io.to(`registration:${requestId}`).emit('resident:registration_updated', payload);

  // 2. Emit to society room
  io.to(`society:${societyId}`).emit('resident:registration_updated', payload);

  // 3. Emit to admin room
  io.to(`admin:${societyId}`).emit('admin:registration_updated', payload);
}


