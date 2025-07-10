import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        
        const uploadsPath = path.join(__dirname, '../../uploads');
        console.log(`[UploadMiddleware] Saving file to: ${uploadsPath}`);
        cb(null, uploadsPath);
    },
    filename: function (req, file, cb) {
        
        const uniqueSuffix = uuidv4();
        const extension = path.extname(file.originalname);
        const filename = uniqueSuffix + extension;
        console.log(`[UploadMiddleware] Generated filename: ${filename} for original: ${file.originalname}`);
        cb(null, filename);
    }
});




const upload = multer({
    storage: storage,
  
});

export default upload;