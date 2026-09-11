import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function initAdminSocket(onActivityEvent?: (event: any) => void) {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
  });

  socket.on('connect', () => {
    console.log('[AdminSocket] Connected to Socket.IO Server:', socket?.id);
    socket?.emit('join', {
      role: 'ADMIN',
      societyId: 'soc_greengate',
    });
  });

  socket.on('admin:visitor_activity', (data) => {
    console.log('[AdminSocket] Realtime visitor activity event:', data);
    if (onActivityEvent) onActivityEvent(data);
  });

  return socket;
}

export function disconnectAdminSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
