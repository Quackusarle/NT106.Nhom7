

import { Server } from "socket.io";
import Message from "../models/message.model.js";

let io;
const userSocketMap = {};
const videoCallRooms = new Map();

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):5173$/)) {
          return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true, 
    },
    pingTimeout: 60000, 
  });

  io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    const userId = socket.handshake.query.userId;
    if (userId) {
      userSocketMap[userId] = socket.id;
      console.log(`User ${userId} mapped to socket ${socket.id}`);
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }

    // Existing events
    socket.on("getOnlineUsers", () => {
      io.to(socket.id).emit("getOnlineUsers", Object.keys(userSocketMap));
    });

    socket.on("getNewMessages", async ({ userId }) => {
      if (!userId) return;
      try {
        const authUserId = Object.keys(userSocketMap).find(
          key => userSocketMap[key] === socket.id
        );
        if (authUserId) {
          const messages = await findNewMessagesForUser(userId, authUserId);
          socket.emit("receiveNewMessages", messages);
        }
      } catch (error) {
        console.error("Error in getNewMessages:", error);
      }
    });

    // ==== VIDEO CALL EVENTS ====

    // Initiate video call
    socket.on("video-call-request", ({ targetUserId, callerInfo }) => {
      console.log(`[VIDEO CALL] *** CALL REQUEST RECEIVED ***`);
      console.log(`[VIDEO CALL] Caller: ${callerInfo.name} (${callerInfo.id})`);
      console.log(`[VIDEO CALL] Target: ${targetUserId}`);
      console.log(`[VIDEO CALL] Current userSocketMap:`, userSocketMap);
      console.log(`[VIDEO CALL] All online users:`, Object.keys(userSocketMap));
      const targetSocketId = userSocketMap[targetUserId];
      console.log(`[VIDEO CALL] Target socket ID: ${targetSocketId}`);
      if (targetSocketId) {
        // Create room for this call
        const roomId = `call_${callerInfo.id}_${targetUserId}_${Date.now()}`;
        console.log(`[VIDEO CALL] Creating room: ${roomId}`);
        videoCallRooms.set(roomId, {
          caller: callerInfo.id,
          receiver: targetUserId,
          status: 'calling',
          createdAt: new Date()
        });
        // Send call request to target user
        console.log(`[VIDEO CALL] Sending incoming-video-call to target`);
        io.to(targetSocketId).emit("incoming-video-call", {
          roomId,
          caller: callerInfo,
          timestamp: new Date()
        });
        // Confirm call initiation to caller
        console.log(`[VIDEO CALL] Sending video-call-initiated to caller`);
        socket.emit("video-call-initiated", { roomId, targetUserId });
        console.log(`[VIDEO CALL] Events emitted successfully`);
      } else {
        console.log(`[VIDEO CALL] Target user offline`);
        socket.emit("video-call-error", { 
          error: "User is offline",
          targetUserId 
        });
      }
    });

    // Accept video call
    socket.on("accept-video-call", ({ roomId }) => {
      console.log(`[VIDEO CALL] *** CALL ACCEPTED ***`);
      console.log(`[VIDEO CALL] Room ID: ${roomId}`);
      const room = videoCallRooms.get(roomId);
      console.log(`[VIDEO CALL] Room exists:`, !!room);
      if (room) {
        console.log(`[VIDEO CALL] Caller: ${room.caller}, Receiver: ${room.receiver}`);
        room.status = 'accepted';
        const callerSocketId = userSocketMap[room.caller];
        console.log(`[VIDEO CALL] Caller socket ID: ${callerSocketId}`);
        if (callerSocketId) {
          console.log(`[VIDEO CALL] Sending video-call-accepted to caller`);
          io.to(callerSocketId).emit("video-call-accepted", { roomId });
          console.log(`[VIDEO CALL] video-call-accepted sent successfully`);
        } else {
          console.log(`[VIDEO CALL] Caller socket not found`);
        }
      } else {
        console.log(`[VIDEO CALL] Room not found: ${roomId}`);
      }
    });

    // Reject video call
    socket.on("reject-video-call", ({ roomId, reason = "User declined" }) => {
      console.log(`[VIDEO CALL] Call rejected for room: ${roomId}, reason: ${reason}`);
      const room = videoCallRooms.get(roomId);
      if (room) {
        const callerSocketId = userSocketMap[room.caller];
        if (callerSocketId) {
          io.to(callerSocketId).emit("video-call-rejected", { roomId, reason });
        }
        videoCallRooms.delete(roomId);
      }
    });

    // WebRTC signaling for video call
    socket.on("video-call-signal", ({ roomId, signalData, targetUserId }) => {
      console.log(`[VIDEO CALL] Signal for room: ${roomId}`);
      const targetSocketId = userSocketMap[targetUserId];
      if (targetSocketId) {
        io.to(targetSocketId).emit("video-call-signal", {
          roomId,
          signalData,
          fromUserId: Object.keys(userSocketMap).find(key => userSocketMap[key] === socket.id)
        });
      }
    });

    // End video call
    socket.on("end-video-call", ({ roomId }) => {
      console.log(`[VIDEO CALL] Call ended for room: ${roomId}`);
      const room = videoCallRooms.get(roomId);
      if (room) {
        // Notify all participants
        [room.caller, room.receiver].forEach(userId => {
          const socketId = userSocketMap[userId];
          if (socketId && socketId !== socket.id) {
            io.to(socketId).emit("video-call-ended", { roomId });
          }
        });
        videoCallRooms.delete(roomId);
      }
    });

    // Handle user disconnect
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
    console.log("✅ Socket.IO initialized successfully"); // Thêm log này
  return io; // ✅ THÊM DÒNG NÀY

}





function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}



async function findNewMessagesForUser(userId, authUserId) {
  try {
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: authUserId },
        { sender: authUserId, receiver: userId }
      ]
    }).sort({ createdAt: -1 }).limit(50);
    return messages.reverse();
  } catch (error) {
    console.error("Error finding new messages:", error);
    return [];
  }
}



// (Đã loại bỏ block io.on("connection") bị lặp)

export { initSocket, getReceiverSocketId, io };
