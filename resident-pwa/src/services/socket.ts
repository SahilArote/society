import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || BACKEND_URL;

let socket: Socket | null = null;

export function initResidentSocket(
  residentId: string = 'res_sahil',
  onVisitorCreated?: (data: any) => void,
  onVisitorUpdated?: (data: any) => void
) {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
  });

  socket.on('connect', () => {
    console.log('[ResidentSocket] Connected to Socket.IO Server:', socket?.id);
    socket?.emit('join', {
      role: 'RESIDENT',
      residentId,
      societyId: 'soc_greengate',
    });
  });

  socket.on('visitor:request_created', (data) => {
    console.log('[ResidentSocket] New Visitor Request received:', data);
    if (onVisitorCreated) onVisitorCreated(data);
  });

  socket.on('visitor:request_updated', (data) => {
    console.log('[ResidentSocket] Visitor Request updated:', data);
    if (onVisitorUpdated) onVisitorUpdated(data);
  });

  return socket;
}

export function disconnectResidentSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
