import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  getFriends,
  removeFriend
} from "../controllers/user.controller.js";

const router = express.Router();


router.post("/send-friend-request", protectRoute, sendFriendRequest);
router.get("/friend-requests", protectRoute, getFriendRequests);
router.post("/accept-friend-request", protectRoute, acceptFriendRequest);
router.post("/decline-friend-request", protectRoute, declineFriendRequest);
router.get("/friends", protectRoute, getFriends);
router.post("/remove-friend", protectRoute, removeFriend);

export default router;
