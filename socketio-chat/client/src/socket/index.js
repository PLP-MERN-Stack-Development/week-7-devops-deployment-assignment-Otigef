import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (token) => {
  socket = io('http://localhost:5000', {
    auth: { token },
    autoConnect: true,
  });
  return socket;
};

export const getSocket = () => socket; 