import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Directory where files will be saved
const uploadPath = path.join(process.cwd(), 'uploads/leave');

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

export const uploadLeaveDocuments = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
}).array('documents', 5); // field name must match frontend
