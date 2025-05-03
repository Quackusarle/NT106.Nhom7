import express from 'express';
import * as fileController from '../controllers/fileController.js'; // Use namespace import
import upload from '../middleware/uploadMiddleware.js';       // Add .js extension
import { protectRoute as authMiddleware } from '../middleware/auth.middleware.js'; // Import named export 'protectRoute' and alias it as 'authMiddleware'

const router = express.Router();


router.post(
    '/upload',
    authMiddleware,
    upload.single('file'), 
    fileController.uploadFile
);


router.get(
    '/download/:filename',
    authMiddleware, 
    (req, res, next) => {
        console.log(`[FileRoutes] Download request received for file: ${req.params.filename}`);
        console.log(`[FileRoutes] User ID: ${req.user?._id}`);
        next();
    },
    fileController.downloadFile
);


export default router;