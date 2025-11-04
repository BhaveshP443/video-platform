import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Define allowed formats
const allowedFormats = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'];

// ✅ Cloudinary storage for video uploads
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'pulseAI/videos',        // Optional: organize under a Cloudinary folder
    resource_type: 'video',          // Important for Cloudinary to handle video properly
    allowed_formats: allowedFormats, // Restrict to supported formats
    // transformation: [{ quality: 'auto' }], // Auto-optimize quality
  },
});

// ✅ Custom file filter to reject non-videos
const fileFilter = (req, file, cb) => {
  const mimetype = file.mimetype.startsWith('video/');
  if (mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed (mp4, avi, mov, wmv, flv, mkv, webm)'), false);
  }
};

// ✅ Configure multer upload
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
});
