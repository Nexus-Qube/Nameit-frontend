// frontend/services/socket.js
import { io } from "socket.io-client";

//const SOCKET_URL = "http://192.168.0.22:3000";
const SOCKET_URL = "https://nameit-backend.onrender.com";


let socket = null;

/**
 * Returns the existing socket or creates a new one if not initialized.
 */
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    // --- Logging and lifecycle events ---
    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.error("⚠️ Socket connection error:", err.message);
    });

    socket.on("reconnect_attempt", (attempt) => {
      console.log("🔁 Reconnect attempt:", attempt);
    });

    socket.on("reconnect_failed", () => {
      console.error("🚫 Reconnect failed, giving up");
    });
  }

  return socket;
}

/**
 * Cleanly closes the socket connection and removes listeners.
 */
export function closeSocket() {
  if (socket) {
    console.log("🛑 Closing socket:", socket.id);

    // Remove all event listeners
    socket.removeAllListeners();

    // Disconnect from the server
    socket.disconnect();

    // Nullify reference to allow garbage collection
    socket = null;
  }
}

// Remove specific listeners for different screens
// Add these functions to your existing socket.js

export function removeWaitingRoomListeners() {
  if (socket) {
    socket.off("lobbyUpdate");
    socket.off("countdown");
    socket.off("gameStarted");
    socket.off("playerLeft");
    socket.off("playerDisconnected");
    console.log("🧹 Removed waiting room listeners");
  }
}

export function removeGameListeners() {
  if (socket) {
    socket.off("initItems");
    socket.off("itemSolved");
    socket.off("turnChanged");
    socket.off("gameOver");
    socket.off("playerLeft");
    console.log("🧹 Removed game listeners");
  }
}

export function removeAllListeners() {
  if (socket) {
    socket.removeAllListeners();
    console.log("🧹 Removed all socket listeners");
  }
}