import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

// Fix: Cast `import.meta` to `any` to access `env` without Vite-specific type definitions.
const WEBSOCKET_URL = (import.meta as any).env.VITE_WEBSOCKET_URL || 'http://localhost:3000';

interface ISocketContext {
  socket: Socket | null;
}

const SocketContext = createContext<ISocketContext>({ socket: null });

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const socketRef = useRef<Socket | null>(null);

  if (!socketRef.current) {
    socketRef.current = io(WEBSOCKET_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (err) => {
        console.error('Connection Error:', err.message);
    });

    return () => {
      console.log('Disconnecting socket...');
      socket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  );
};
