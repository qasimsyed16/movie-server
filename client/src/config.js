// ==============================
// APP CONFIGURATION
// ==============================

// 1. Where is the server running?
// If you are running locally on this machine, use 'localhost'.
// If you want to access from other devices (LAN), use your computer's IP (e.g., '192.168.1.10')
export const SERVER_IP = 'localhost';

// 2. What port is the server running on?
// Default is 3000
export const SERVER_PORT = 3000;

// ==============================
// AUTOMATIC SETUP (Do not edit below)
// ==============================

// You can still override this with the VITE_API_URL environment variable if you know what you are doing.
export const API_URL = import.meta.env.VITE_API_URL || `http://${SERVER_IP}:${SERVER_PORT}`;
