// Search messages by keyword for a chat between current user and :id
export const searchMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    const { query } = req.query;
    
    if (!query || !query.trim()) {
      return res.status(400).json({ error: "Missing search query" });
    }
    
    // Trả về TẤT CẢ tin nhắn giữa 2 user để frontend tự giải mã và tìm kiếm
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      is_file: { $ne: true } // Chỉ lấy tin nhắn text, bỏ qua file
    })
      .sort({ createdAt: 1 })
      .select('senderId receiverId encryptedContent encryptedKey encryptedKeySender iv createdAt reactions');
    
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in searchMessages: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    
    
    const { after } = req.query;
    
   
    const query = {
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    };
    
    
    if (after) {
      query._id = { $gt: after };
    }
    
    const messages = await Message.find(query)
      .select('senderId receiverId encryptedContent encryptedKey encryptedKeySender iv createdAt is_file original_file_name file_type file_size file_path file_iv file_encrypted_key file_encrypted_key_sender reactions')
      .sort({ createdAt: 1 });
      
    console.log(`[getMessages] Found ${messages.length} messages ${after ? 'after ' + after : ''} between ${myId} and ${userToChatId}`);
    
    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const markMessagesAsRead = async (req, res) => {
  try {
    const { id: senderId } = req.params;
    const receiverId = req.user._id;
    
    
    const result = await Message.updateMany(
      {
        senderId,
        receiverId,
        read: false
      },
      {
        $set: { read: true }
      }
    );
    
    console.log(`[markMessagesAsRead] Marked ${result.modifiedCount} messages as read from ${senderId} to ${receiverId}`);
    
    res.status(200).json({ success: true, count: result.modifiedCount });
  } catch (error) {
    console.error("Error in markMessagesAsRead: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};



export const sendMessage = async (req, res) => {
 
  console.log(`[sendMessage Controller] Received request for receiver ${req.params.id} from sender ${req.user._id}`);
  console.log('[sendMessage Controller] Request Body Received:', req.body);

  try {
   
    const {
        encryptedContent, 
        encryptedKey, 
        encryptedKeySender, 
        iv, 
        is_file,
        original_file_name,
        file_type,
        file_size,
        file_path,
        file_iv,
        file_encrypted_key,
        file_encrypted_key_sender
    } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    
    let missingFields = [];
    if (is_file) {
        if (!file_path) missingFields.push('file_path');
        if (!file_encrypted_key) missingFields.push('file_encrypted_key');
        if (!file_encrypted_key_sender) missingFields.push('file_encrypted_key_sender');
        // Only require file_iv if not chunked
        if (!req.body.chunked && !file_iv) missingFields.push('file_iv');
    } else {
        if (!encryptedContent) missingFields.push('encryptedContent');
        if (!encryptedKey) missingFields.push('encryptedKey');
        if (!encryptedKeySender || typeof encryptedKeySender !== 'string' || encryptedKeySender.length === 0) {
            missingFields.push('encryptedKeySender');
        }
        if (!iv) missingFields.push('iv');
    }

    if (missingFields.length > 0) {
        const errorMsg = `Missing required encrypted data field(s): ${missingFields.join(', ')}.`;
        console.error('[sendMessage Controller] Validation Error:', errorMsg, 'Body was:', req.body); // Log the exact error and body
       
        return res.status(400).json({ error: errorMsg });
    }

    
    const newMessage = new Message({
      senderId,
      receiverId,
      encryptedContent,
      encryptedKey,
      encryptedKeySender,
      iv,
      ...(is_file && {
        is_file: true,
        original_file_name,
        file_type,
        file_size,
        file_path,
        file_iv,
        file_encrypted_key,
        file_encrypted_key_sender,
        // Thêm metadata chunked nếu có
        chunked: req.body.chunked === true || req.body.chunked === 'true',
        fileId: req.body.fileId || null,
        totalChunks: req.body.totalChunks || null
      }),
      read: false
    });

    await newMessage.save();
    console.log(`[sendMessage Controller] Message saved successfully: ${newMessage._id}`);

    
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
      console.log(`[sendMessage Controller] Emitted 'newMessage' to socket ${receiverSocketId}`);
    } else {
       console.log(`[sendMessage Controller] Receiver ${receiverId} not connected via socket.`);
    }
    
    
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId && senderSocketId !== receiverSocketId) {
      io.to(senderSocketId).emit("newMessage", newMessage);
    }

    
    res.status(201).json(newMessage);

  } catch (error) {
    
    console.error("[sendMessage Controller] Error saving or processing message: ", error.message, error.stack);
    res.status(500).json({ error: "Internal server error while sending message." });
  }
};


export const deleteMessage = async (req, res) => {
    console.log(`[deleteMessage] Received request to delete message: ${req.params.id}`);
    try {
        const { id: messageId } = req.params; 
        const senderId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) {
            console.log(`[deleteMessage] Message ${messageId} not found.`);
            return res.status(404).json({ error: "Message not found" });
        }
        console.log(`[deleteMessage] Found message ${messageId}, sender is ${message.senderId}, receiver is ${message.receiverId}`);

        
        const receiverId = message.receiverId; 

        if (message.senderId.toString() !== senderId.toString()) {
            console.log(`[deleteMessage] Unauthorized attempt by ${senderId} to delete message ${messageId}`);
            return res.status(403).json({ error: "Unauthorized: You can only delete your own messages" });
        }

        
        const conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] } 
        });
        console.log(`[deleteMessage] Searching for conversation between ${senderId} and ${receiverId}. Found:`, conversation ? conversation._id : 'None');

        
        await Message.findByIdAndDelete(messageId);
        console.log(`[deleteMessage] Successfully deleted message ${messageId} from DB.`);

        
        if (conversation) {
           
            try {
                conversation.messages.pull(messageId);
                await conversation.save();
                console.log(`[deleteMessage] Removed message ${messageId} from conversation ${conversation._id}.`);
            } catch (convError) {
                 console.error(`[deleteMessage] Error updating conversation ${conversation._id} after deleting message:`, convError.message);
                 
            }
            
             const participants = conversation.participants;
             console.log(`[deleteMessage] Conversation participants:`, participants.map(p => p.toString()));

             participants.forEach(participantId => {
                 const participantIdStr = participantId.toString();
                 console.log(`[deleteMessage] Processing participant: ${participantIdStr}`);
                 const participantSocketId = getReceiverSocketId(participantIdStr);
                 console.log(`[deleteMessage] Socket ID for ${participantIdStr}: ${participantSocketId || 'Not found'}`);
                 
                 if (participantSocketId) {
                     
                     io.to(participantSocketId).emit("messageDeleted", { messageId: messageId, conversationId: conversation._id });
                     console.log(`[deleteMessage] Emitted 'messageDeleted' to socket ${participantSocketId} for message ${messageId}`);
                 }
             });
        } else {
             console.warn(`[deleteMessage] Could not find conversation between ${senderId} and ${receiverId} to emit delete event.`);
             
             const receiverSocketId = getReceiverSocketId(receiverId.toString());
             if (receiverSocketId) {
                 io.to(receiverSocketId).emit("messageDeleted", { messageId: messageId, conversationId: null }); // Gửi với conversationId=null
                 console.log(`[deleteMessage] Emitted 'messageDeleted' directly to receiver ${receiverId} socket ${receiverSocketId} (conversation not found).`);
             }
             
             const senderSocketId = getReceiverSocketId(senderId.toString());
              if (senderSocketId) {
                 io.to(senderSocketId).emit("messageDeleted", { messageId: messageId, conversationId: null });
                 console.log(`[deleteMessage] Emitted 'messageDeleted' directly to sender ${senderId} socket ${senderSocketId} (conversation not found).`);
             }
        }

        res.status(200).json({ message: "Message deleted successfully" }); 

    } catch (error) {
        console.error("Error in deleteMessage controller: ", error.message, error.stack);
        res.status(500).json({ error: "Internal server error" });
    }
};