// backend/server.js

import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors"; // <-- Sửa: Dùng import
import path from "path";
import fs from "fs";
import https from "https";
import http from "http";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import fileRoutes from "./routes/fileRoutes.js";
import userRoutes from "./routes/user.route.js";
import { initSocket } from "./lib/socket.js"; // Import hàm init

dotenv.config();

const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// --- Cấu hình CORS cho Express ---
const allowedOrigins = [
    'app://.',
    'null',
    /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// --- Các Routes API ---
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/users", userRoutes);

// --- Tạo Server HTTP hoặc HTTPS ---
let server;
const keyPath = path.join(__dirname, 'key.pem');
const certPath = path.join(__dirname, 'cert.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const key = fs.readFileSync(keyPath);
  const cert = fs.readFileSync(certPath);
  server = https.createServer({ key, cert }, app);
  console.log("🔒 [HTTPS] Server instance created.");
} else {
  server = http.createServer(app);
  console.log("🔓 [HTTP] Server instance created.");
}

// --- Khởi tạo Socket.IO SAU KHI đã có server ---
initSocket(server);

// --- Lắng nghe kết nối ---
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server is running on port ${PORT}`);
    connectDB();
});

// --- Phục vụ file tĩnh cho Production (Giữ nguyên) ---
if (process.env.NODE_ENV === "production") {
    const frontendDistPath = path.join(__dirname, "../frontend/dist");
    app.use(express.static(frontendDistPath));
    app.get("*", (req, res) => {
        res.sendFile(path.join(frontendDistPath, "index.html"));
    });
}