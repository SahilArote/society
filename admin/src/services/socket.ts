import { io, Socket } from 'socket.io-client';
import { getAdminToken } from './api';

const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === ''
);
const SOCKET_URL = isLocal
  ? 'http://localhost:5000'
  : (import.meta.env.VITE_SOCKET_URL || 'https://society-d521.onrender.com');

let socket: Socket | null = null;

export function initAdminSocket(
  onActivityEvent?: (event: any) => void,
  onRegistrationEvent?: (event: any) => void
) {
  const token = getAdminToken() || 'backup_admin_token_default';

  if (socket && socket.connected) {
    if (onActivityEvent) {
      socket.off('admin:visitor_activity');
      socket.on('admin:visitor_activity', onActivityEvent);
    }
    if (onRegistrationEvent) {
      socket.off('admin:registration_request');
      socket.off('admin:registration_updated');
      socket.on('admin:registration_request', onRegistrationEvent);
      socket.on('admin:registration_updated', onRegistrationEvent);
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

  if (onRegistrationEvent) {
    socket.on('admin:registration_request', (data) => {
      console.log('[AdminSocket] Realtime new resident registration:', data);
      onRegistrationEvent(data);
    });
    socket.on('admin:registration_updated', (data) => {
      console.log('[AdminSocket] Realtime registration update:', data);
      onRegistrationEvent(data);
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

