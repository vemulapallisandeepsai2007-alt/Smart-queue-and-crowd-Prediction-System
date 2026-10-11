import { io } from 'socket.io-client';

let socket = null;

/**
 * Get or initialize the singleton Socket.IO client instance
 */
export const getSocket = () => {
  if (!socket) {
    const serverUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const token = localStorage.getItem('qflow_token');

    socket = io(serverUrl, {
      auth: { token },
      withCredentials: true,
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('⚡ [Socket.IO] Connected to live queue dispatcher, ID:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 [Socket.IO] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ [Socket.IO] Connection error:', err.message);
    });
  }

  // Update token on existing socket if changed
  const currentToken = localStorage.getItem('qflow_token');
  if (socket.auth?.token !== currentToken) {
    socket.auth = { token: currentToken };
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default {
  getSocket,
  disconnectSocket,
};
