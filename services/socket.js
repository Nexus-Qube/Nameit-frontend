// frontend/services/socket.js
import { io } from "socket.io-client";

const SOCKET_URL = "http://192.168.0.22:3000";

// Create a singleton socket instance
let socket;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    console.log("🔌 Socket created:", socket.id);

    socket.on("connect", () => console.log("✅ Socket connected:", socket.id));
    socket.on("disconnect", (reason) => console.log("❌ Socket disconnected:", reason));
    socket.on("connect_error", (err) => console.error("⚠️ Socket error:", err));
  }
  return socket;
}

export function closeSocket() {
  if (socket) {
    console.log("🛑 Closing socket:", socket.id);
    socket.disconnect();
    socket = null;
  }
}
