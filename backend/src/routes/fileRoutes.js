import express from 'express';
import * as fileController from '../controllers/fileController.js'; 
import upload from '../middleware/uploadMiddleware.js';       
import { protectRoute as authMiddleware } from '../middleware/auth.middleware.js'; 

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