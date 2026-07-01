import { io } from 'socket.io-client'

// Production runs as a single same-origin service (Express serves this build and the
// Socket.IO backend), so connect to wherever the page was served from. In local dev the
// Vite server (5173) and the backend (3001) are separate origins, so point at the backend.
const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
})
