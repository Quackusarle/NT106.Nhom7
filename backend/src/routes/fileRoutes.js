import express from 'express';
import multer from 'multer';
import * as fileController from '../controllers/fileController.js'; // Use namespace import
import * as chunkFileController from '../controllers/chunkFileController.js';
import upload from '../middleware/uploadMiddleware.js';       // Add .js extension
import { protectRoute as authMiddleware } from '../middleware/auth.middleware.js'; // Import named export 'protectRoute' and alias it as 'authMiddleware'

const router = express.Router();
const memoryUpload = multer({ storage: multer.memoryStorage() });

// File routes
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

// Chunk file routes
router.post('/upload-chunk', authMiddleware, memoryUpload.single('chunk'), chunkFileController.uploadChunk);
router.post('/merge-chunks', authMiddleware, chunkFileController.mergeChunks);
router.get('/download-chunk', authMiddleware, chunkFileController.downloadChunk);

export default router;