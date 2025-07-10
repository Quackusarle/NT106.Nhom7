import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const addReaction = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user._id;

        console.log(`[addReaction] messageId: ${messageId}, emoji: ${emoji}, userId: ${userId}`);

        if (!emoji) {
            return res.status(400).json({ error: "Emoji is required" });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }

        // Kiểm tra xem user đã react với emoji này chưa
        const existingReactionIndex = message.reactions.findIndex(
            r => r.userId.toString() === userId.toString() && r.emoji === emoji
        );

        if (existingReactionIndex !== -1) {
            return res.status(400).json({ error: "You already reacted with this emoji" });
        }

        // Thêm reaction mới
        message.reactions.push({
            userId,
            emoji,
            createdAt: new Date()
        });

        await message.save();

        console.log(`[addReaction] Reaction added successfully. Total reactions: ${message.reactions.length}`);

        // Emit socket event để update realtime
        const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
        const senderSocketId = getReceiverSocketId(message.senderId.toString());

        const reactionData = {
            messageId,
            reactions: message.reactions
        };

        if (receiverSocketId) {
            io.to(receiverSocketId).emit("messageReaction", reactionData);
            console.log(`[addReaction] Emitted to receiver: ${message.receiverId}`);
        }
        if (senderSocketId && senderSocketId !== receiverSocketId) {
            io.to(senderSocketId).emit("messageReaction", reactionData);
            console.log(`[addReaction] Emitted to sender: ${message.senderId}`);
        }

        res.status(200).json({ 
            message: "Reaction added successfully", 
            reactions: message.reactions 
        });
    } catch (error) {
        console.error("Error in addReaction:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const removeReaction = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user._id;

        console.log(`[removeReaction] messageId: ${messageId}, emoji: ${emoji}, userId: ${userId}`);

        if (!emoji) {
            return res.status(400).json({ error: "Emoji is required" });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }

        // Lưu số lượng reactions trước khi xóa
        const reactionsBefore = message.reactions.length;

        // Xóa reaction
        message.reactions = message.reactions.filter(
            r => !(r.userId.toString() === userId.toString() && r.emoji === emoji)
        );

        const reactionsAfter = message.reactions.length;

        if (reactionsBefore === reactionsAfter) {
            return res.status(400).json({ error: "Reaction not found" });
        }

        await message.save();

        console.log(`[removeReaction] Reaction removed successfully. Reactions: ${reactionsBefore} -> ${reactionsAfter}`);

        // Emit socket event để update realtime
        const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
        const senderSocketId = getReceiverSocketId(message.senderId.toString());

        const reactionData = {
            messageId,
            reactions: message.reactions
        };

        if (receiverSocketId) {
            io.to(receiverSocketId).emit("messageReaction", reactionData);
            console.log(`[removeReaction] Emitted to receiver: ${message.receiverId}`);
        }
        if (senderSocketId && senderSocketId !== receiverSocketId) {
            io.to(senderSocketId).emit("messageReaction", reactionData);
            console.log(`[removeReaction] Emitted to sender: ${message.senderId}`);
        }

        res.status(200).json({ 
            message: "Reaction removed successfully", 
            reactions: message.reactions 
        });
    } catch (error) {
        console.error("Error in removeReaction:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};