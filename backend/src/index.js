
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import fs from "fs";
import https from "https";
import http from "http";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import fileRoutes from "./routes/fileRoutes.js";
import userRoutes from "./routes/user.route.js";
import { initSocket } from "./lib/socket.js";

dotenv.config();


const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

const app = express();
app.use(express.json({ limit: '50mb' }));

app.use(cookieParser());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):5173$/)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/users", userRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// === HTTPS/HTTP server creation ===
const keyPath = path.join(__dirname, 'key.pem');
const certPath = path.join(__dirname, 'cert.pem');
console.log('[DEBUG] __dirname:', __dirname);
console.log('[DEBUG] keyPath:', keyPath, 'exists:', fs.existsSync(keyPath));
console.log('[DEBUG] certPath:', certPath, 'exists:', fs.existsSync(certPath));
let server;
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  try {
    const key = fs.readFileSync(keyPath, 'utf8');
    const cert = fs.readFileSync(certPath, 'utf8');
    server = https.createServer({ key, cert }, app);
    server.listen(PORT, '0.0.0.0', () => {
      console.log("🔒 [HTTPS] Server is running on PORT:" + PORT);
      console.log("🌐 [HTTPS] Server accessible on LAN at: https://192.168.1.70:" + PORT);
      console.log("⚠️  [HTTPS] Note: Accept the security warning for self-signed certificate");
      connectDB();
    });
  } catch (error) {
    console.error("❌ [HTTPS] Error loading SSL certificates:", error.message);
    console.log("🔄 [HTTPS] Falling back to HTTP server");
    server = http.createServer(app);
    server.listen(PORT, '0.0.0.0', () => {
      console.log("🔓 [HTTP] Server is running on PORT:" + PORT);
      console.log("🌐 [HTTP] Server accessible on LAN at: http://192.168.1.70:" + PORT);
      connectDB();
    });
  }
} else {
  console.log("📋 [INFO] SSL certificates not found, starting HTTP server");
  server = http.createServer(app);
 
  server.listen(PORT, '0.0.0.0', () => {
    console.log("🔓 [HTTP] Server is running on PORT:" + PORT);
    console.log("🌐 [HTTP] Server accessible on LAN at: http://192.168.1.70:" + PORT);
    console.log("💡 [HTTP] To enable HTTPS, add key.pem and cert.pem to backend/ directory");
    connectDB();
  });
}

 initSocket(server);
