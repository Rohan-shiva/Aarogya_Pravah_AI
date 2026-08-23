const multer = require('multer');
const path = require('path');

// In-memory storage for streaming directly to Cloudinary
const storage = multer.memoryStorage();

// File filter for medical images (JPEG, PNG, WebP, TIFF, DICOM)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.dcm', '.dicom', '.tiff'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Please upload a valid image (JPG, PNG, WebP, DICOM)`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB limit
  },
  fileFilter: fileFilter,
});

module.exports = upload;
