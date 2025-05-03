import express from "express";
import { checkAuth, login, logout, signup, updateProfile, getPublicKey, updatePublicKey } from "../controllers/auth.controller.js"; // Import getPublicKey AND updatePublicKey
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);
router.put("/update-public-key", protectRoute, updatePublicKey); 

router.get("/check", protectRoute, checkAuth);


router.get("/public-key/:userId", protectRoute, getPublicKey);

export default router;
