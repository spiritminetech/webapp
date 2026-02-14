import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Default upload directory
    let uploadPath = "uploads/";
    
    // Create specific subdirectories based on the route
    if (req.route && req.route.path) {
      if (req.route.path.includes('task-photos')) {
        uploadPath = "uploads/tasks/";
      } else if (req.route.path.includes('fleet-tasks')) {
        uploadPath = "uploads/tasks/";
      } else if (req.route.path.includes('drivers')) {
        uploadPath = "uploads/drivers/";
      } else if (req.route.path.includes('leave')) {
        uploadPath = "uploads/leave/";
      }
    }
    
    // Ensure the directory exists
    ensureDirectoryExists(uploadPath);
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate timestamp-based filename
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `${timestamp}${extension}`;
    cb(null, filename);
  }
});

// File filter for image uploads
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG and PNG files are allowed.'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per upload
  }
});

export default upload;
