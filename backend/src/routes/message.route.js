import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, sendMessage, markMessagesAsRead, deleteMessage, searchMessages } from "../controllers/message.controller.js";
import { addReaction, removeReaction } from "../controllers/reaction.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);

// Reaction routes - ĐẶT TRƯỚC các routes có :id để tránh conflict
router.post("/:id/reactions", protectRoute, addReaction);
router.delete("/:id/reactions", protectRoute, removeReaction);

// Message routes
router.get("/:id", protectRoute, getMessages);
router.post("/send/:id", protectRoute, sendMessage);
router.post("/read/:id", protectRoute, markMessagesAsRead);

// Search messages - ĐẶT TRƯỚC route delete để tránh conflict
router.get("/search/:id", protectRoute, searchMessages);

// Delete message
router.delete("/delete/:id", protectRoute, deleteMessage);

export default router;