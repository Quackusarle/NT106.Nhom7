// backend/lib/socket.js

import { Server } from "socket.io";
import Message from "../models/message.model.js";

let io;
const userSocketMap = {};
const videoCallRooms = new Map();

// Chú ý: Hàm này nhận biến 'httpServer' từ file server.js
function initSocket(httpServer) { 
  // --- Cấu hình CORS cho Socket.IO ---
  io = new Server(httpServer, {
    cors: {
      origin: [
        "https://192.168.194.169:5173", // Cho phép môi trường dev của Vite
        "app://.",
        "null"
      ],
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    const userId = socket.handshake.query.userId;
    if (userId) {
      userSocketMap[userId] = socket.id;
      console.log(`User ${userId} mapped to socket ${socket.id}`);
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }

    // ... (Toàn bộ các sự kiện socket.on của bạn giữ nguyên ở đây) ...
    // ... video-call-request, accept-video-call, etc. ...
    socket.on("disconnect", () => {
        console.log("A user disconnected", socket.id);
        const disconnectedUserId = Object.keys(userSocketMap).find(
          key => userSocketMap[key] === socket.id
        );
        if (disconnectedUserId) {
          console.log(`User ${disconnectedUserId} disconnected`);
          // End any active video calls for this user
          videoCallRooms.forEach((room, roomId) => {
            if (room.caller === disconnectedUserId || room.receiver === disconnectedUserId) {
              const otherUserId = room.caller === disconnectedUserId ? room.receiver : room.caller;
              const otherSocketId = userSocketMap[otherUserId];
              if (otherSocketId) {
                io.to(otherSocketId).emit("video-call-ended", { 
                  roomId, 
                  reason: "User disconnected" 
                });
              }
              videoCallRooms.delete(roomId);
            }
          });
          delete userSocketMap[disconnectedUserId];
          io.emit("getOnlineUsers", Object.keys(userSocketMap));
        }
    });

  });

  console.log("✅ Socket.IO initialized successfully");
}

function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

export { initSocket, getReceiverSocketId, io };