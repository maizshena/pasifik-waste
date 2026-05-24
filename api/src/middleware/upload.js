// src/middleware/upload.js
'use strict';

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
require('dotenv').config();

const UPLOAD_DIR     = path.resolve(process.env.UPLOAD_DIR || 'src/uploads');
const MAX_SIZE_BYTES = parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10) * 1024 * 1024;

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext      = path.extname(file.originalname).toLowerCase();
    const basename = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${basename}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WEBP images are allowed'), false);
  }
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE_BYTES } });

module.exports = upload;