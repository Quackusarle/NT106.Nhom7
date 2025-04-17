import express from 'express';
import * as fileController from '../controllers/fileController.js'; // Use namespace import
import upload from '../middleware/uploadMiddleware.js';       // Add .js extension
import { protectRoute as authMiddleware } from '../middleware/auth.middleware.js'; // Import named export 'protectRoute' and alias it as 'authMiddleware'

const router = express.Router();

// POST /api/files/upload
// Requires authentication
// Uses 'upload' middleware to handle single file upload named 'file'
router.post(
    '/upload',
    authMiddleware, // Use the aliased middleware name
    upload.single('file'), // 'file' is the name of the form field for the file
    fileController.uploadFile
);

// GET /api/files/download/:filename
// Requires authentication
router.get(
    '/download/:filename',
    authMiddleware, // Use the aliased middleware name
    (req, res, next) => {
        console.log(`[FileRoutes] Download request received for file: ${req.params.filename}`);
        console.log(`[FileRoutes] User ID: ${req.user?._id}`);
        next();
    },
    fileController.downloadFile
);

// Không thêm các route xử lý file khác ở đây để tránh xung đột

export default router;