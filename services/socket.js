// frontend/services/socket.js
import { io } from "socket.io-client";

// Use environment variable with fallback
//const SOCKET_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://nameit-backend.onrender.com';
//const SOCKET_URL = 'http://192.168.0.22:3000'; // your backend URL
const SOCKET_URL = 'http://192.168.0.243:3000';

console.log('🔌 Socket URL:', SOCKET_URL); // Debug log

let socket = null;
let isInitializing = false;
let connectionPromise = null;

/**
 * Returns the existing socket or creates a new one if not initialized.
 */
export function getSocket() {
  if (!socket) {
    console.log("🔄 Creating new socket connection...");
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      timeout: 10000, // Add timeout
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
 * Wait for socket connection to be established
 */
export function waitForSocketConnection() {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    
    // If already connected, resolve immediately
    if (s.connected) {
      console.log("✅ Socket already connected");
      resolve(s);
      return;
    }

    console.log("⏳ Waiting for socket connection...");
    
    const onConnect = () => {
      console.log("✅ Socket connected in waitForSocketConnection");
      cleanup();
      resolve(s);
    };

    const onError = (error) => {
      console.error("❌ Socket connection failed in wait:", error);
      cleanup();
      reject(new Error(`Socket connection failed: ${error.message}`));
    };

    const cleanup = () => {
      s.off("connect", onConnect);
      s.off("connect_error", onError);
    };

    // Set timeout
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Socket connection timeout after 5 seconds"));
    }, 5000);

    s.on("connect", onConnect);
    s.on("connect_error", onError);
  });
}

/**
 * Check if socket is connected
 */
export function isSocketConnected() {
  return socket && socket.connected;
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
export function removeWaitingRoomListeners() {
  if (socket) {
    socket.off("lobbyUpdate");
    socket.off("countdown");
    socket.off("gameStarted");
    socket.off("playerLeft");
    socket.off("playerDisconnected");
    socket.off("gameSettingsUpdated");
    socket.off("colorUpdateFailed");
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

export function removeHideSeekListeners() {
  if (socket) {
    socket.off("selectionPhase");
    socket.off("selectionComplete");
    socket.off("selectionFailed");
    socket.off("playerEliminated");
    socket.off("selectionCountdown");
    console.log("🧹 Removed hide & seek listeners");
  }
}

export function removeAllListeners() {
  if (socket) {
    socket.removeAllListeners();
    console.log("🧹 Removed all socket listeners");
  }
}