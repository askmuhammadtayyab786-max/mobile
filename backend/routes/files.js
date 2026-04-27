const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  uploadFiles,
  getFiles,
  getFile,
  downloadFile,
  deleteFile,
  getStats,
} = require('../controllers/fileController');

// Wrap async handlers
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Stats (must come before /:fileId to avoid conflict)
router.get('/stats/summary', asyncHandler(getStats));

// Upload
router.post('/upload', upload.array('files', 10), asyncHandler(uploadFiles));

// List
router.get('/', asyncHandler(getFiles));

// Single file
router.get('/:fileId', asyncHandler(getFile));

// Download
router.get('/:fileId/download', asyncHandler(downloadFile));

// Delete
router.delete('/:fileId', asyncHandler(deleteFile));

module.exports = router;
