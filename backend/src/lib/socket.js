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

    // General socket events
    socket.on("getOnlineUsers", () => {
      console.log(`[SOCKET] User ${userId} requested online users list`);
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });

    socket.on("getNewMessages", async ({ lastMessageId }) => {
      console.log(`[SOCKET] User ${userId} requested new messages after ${lastMessageId}`);
      try {
        // This could be expanded to get new messages for the user
        // For now, just acknowledge the request
        const socketId = userSocketMap[userId];
        if (socketId) {
          io.to(socketId).emit("newMessagesResponse", { 
            acknowledged: true,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`[SOCKET] Error handling getNewMessages for user ${userId}:`, error);
      }
    });

    // Video call events
    socket.on("video-call-request", ({ targetUserId, callerInfo }) => {
      console.log(`[VIDEO CALL] Call request from ${callerInfo.name} to ${targetUserId}`);
      
      const targetSocketId = userSocketMap[targetUserId];
      const callerSocketId = userSocketMap[callerInfo.id];
      
      if (!targetSocketId) {
        // Target user is offline
        if (callerSocketId) {
          io.to(callerSocketId).emit("video-call-error", { 
            error: "User is not online",
            targetUserId 
          });
        }
        return;
      }
      
      // Create a unique room ID
      const roomId = `room_${callerInfo.id}_${targetUserId}_${Date.now()}`;
      
      // Store room info
      videoCallRooms.set(roomId, {
        caller: callerInfo.id,
        receiver: targetUserId,
        status: 'pending'
      });
      
      console.log(`[VIDEO CALL] Created room ${roomId}, notifying target user`);
      
      // Send incoming call notification to target user
      io.to(targetSocketId).emit("incoming-video-call", {
        roomId,
        caller: callerInfo
      });
      
      // Notify caller that call was initiated
      if (callerSocketId) {
        io.to(callerSocketId).emit("video-call-initiated", { roomId });
      }
    });

    socket.on("accept-video-call", ({ roomId }) => {
      console.log(`[VIDEO CALL] Call accepted for room ${roomId}`);
      
      const room = videoCallRooms.get(roomId);
      if (!room) {
        console.log(`[VIDEO CALL] Room ${roomId} not found`);
        return;
      }
      
      room.status = 'active';
      
      const callerSocketId = userSocketMap[room.caller];
      const receiverSocketId = userSocketMap[room.receiver];
      
      // Notify both parties that call was accepted
      if (callerSocketId) {
        io.to(callerSocketId).emit("video-call-accepted", { roomId });
      }
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("video-call-accepted", { roomId });
      }
      
      console.log(`[VIDEO CALL] Both parties notified of accepted call for room ${roomId}`);
    });

    socket.on("reject-video-call", ({ roomId, reason }) => {
      console.log(`[VIDEO CALL] Call rejected for room ${roomId}: ${reason}`);
      
      const room = videoCallRooms.get(roomId);
      if (!room) {
        console.log(`[VIDEO CALL] Room ${roomId} not found`);
        return;
      }
      
      const callerSocketId = userSocketMap[room.caller];
      const receiverSocketId = userSocketMap[room.receiver];
      
      // Notify caller that call was rejected
      if (callerSocketId) {
        io.to(callerSocketId).emit("video-call-rejected", { roomId, reason });
      }
      
      // Clean up room
      videoCallRooms.delete(roomId);
      
      console.log(`[VIDEO CALL] Call rejection processed for room ${roomId}`);
    });

    socket.on("end-video-call", ({ roomId }) => {
      console.log(`[VIDEO CALL] Ending call for room ${roomId}`);
      
      const room = videoCallRooms.get(roomId);
      if (!room) {
        console.log(`[VIDEO CALL] Room ${roomId} not found`);
        return;
      }
      
      const callerSocketId = userSocketMap[room.caller];
      const receiverSocketId = userSocketMap[room.receiver];
      
      // Notify both parties that call ended
      if (callerSocketId) {
        io.to(callerSocketId).emit("video-call-ended", { roomId, reason: "Call ended" });
      }
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("video-call-ended", { roomId, reason: "Call ended" });
      }
      
      // Clean up room
      videoCallRooms.delete(roomId);
      
      console.log(`[VIDEO CALL] Call ended for room ${roomId}`);
    });

    socket.on("video-call-signal", ({ roomId, signalData, targetUserId }) => {
      console.log(`[VIDEO CALL] Forwarding signal for room ${roomId} to user ${targetUserId}`);
      
      const targetSocketId = userSocketMap[targetUserId];
      if (targetSocketId) {
        io.to(targetSocketId).emit("video-call-signal", {
          signalData,
          fromUserId: userId,
          roomId
        });
        console.log(`[VIDEO CALL] Signal forwarded successfully`);
      } else {
        console.log(`[VIDEO CALL] Target user ${targetUserId} not found for signal`);
      }
    });

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