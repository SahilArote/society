import { io, Socket } from 'socket.io-client';
import { getAdminToken } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://society-d521.onrender.com';

let socket: Socket | null = null;

export function initAdminSocket(onActivityEvent?: (event: any) => void) {
  const token = getAdminToken();
  if (!token) {
    console.warn('[AdminSocket] No admin token found in storage');
    return null;
  }

  if (socket && socket.connected) {
    if (onActivityEvent) {
      socket.off('admin:visitor_activity');
      socket.on('admin:visitor_activity', onActivityEvent);
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
  });

  socket.on('connect', () => {
    console.log('[AdminSocket] Connected securely to Socket.IO Server:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[AdminSocket] Socket connection error:', err.message);
  });

  if (onActivityEvent) {
    socket.on('admin:visitor_activity', (data) => {
      console.log('[AdminSocket] Realtime visitor activity event (Strictly No Photo):', data);
      onActivityEvent(data);
    });
  }

  return socket;
}

export function disconnectAdminSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

