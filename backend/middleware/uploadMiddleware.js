const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/donation-requests');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp and original name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, nameWithoutExt + '-' + uniqueSuffix + ext);
  }
});

// File filter to accept only specific file types
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = /pdf|jpg|jpeg|png|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, PNG, and DOCX files are allowed!'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: fileFilter
});

// Middleware to handle multiple files with any field name starting with 'document_' or 'other_document_'
const uploadDonationDocuments = upload.any();

module.exports = {
  upload,
  uploadDonationDocuments
};
