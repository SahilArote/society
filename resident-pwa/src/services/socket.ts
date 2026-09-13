import { io, Socket } from 'socket.io-client';
import { authSession } from './authSession';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function initResidentSocket(
  _residentId?: string,
  onVisitorCreated?: (data: any) => void,
  onVisitorUpdated?: (data: any) => void
) {
  const token = authSession.getToken();
  if (!token) {
    console.warn('[ResidentSocket] Cannot initialize socket: No resident auth token found');
    return null;
  }

  if (socket && socket.connected) {
    if (onVisitorCreated) {
      socket.off('visitor:request_created');
      socket.on('visitor:request_created', (data) => {
        console.log('[ResidentSocket] New Visitor Request received:', data);
        onVisitorCreated(data);
      });
    }
    if (onVisitorUpdated) {
      socket.off('visitor:request_updated');
      socket.on('visitor:request_updated', (data) => {
        console.log('[ResidentSocket] Visitor Request updated:', data);
        onVisitorUpdated(data);
      });
    }
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[ResidentSocket] Connected securely to Socket.IO Server:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[ResidentSocket] Connection error:', err.message);
  });

  if (onVisitorCreated) {
    socket.on('visitor:request_created', (data) => {
      console.log('[ResidentSocket] New Visitor Request received:', data);
      onVisitorCreated(data);
    });
  }

  if (onVisitorUpdated) {
    socket.on('visitor:request_updated', (data) => {
      console.log('[ResidentSocket] Visitor Request updated:', data);
      onVisitorUpdated(data);
    });
  }

  return socket;
}

export function disconnectResidentSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

