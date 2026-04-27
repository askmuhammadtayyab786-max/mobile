const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const File = require('../models/File');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategory(mimeType) {
  if (!mimeType) return 'other';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('msword') ||
    mimeType.includes('text/') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation')
  ) return 'document';
  if (
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('gz') ||
    mimeType.includes('rar') ||
    mimeType.includes('7z')
  ) return 'archive';
  return 'other';
}

function simulateProcessing(fileId) {
  // Simulate async processing (1–3s)
  const delay = 1000 + Math.random() * 2000;
  setTimeout(async () => {
    try {
      const success = Math.random() > 0.05; // 95% success rate
      await File.findOneAndUpdate(
        { fileId },
        {
          status: success ? 'ready' : 'error',
          errorMessage: success ? undefined : 'Processing failed: unsupported format',
        }
      );
    } catch (err) {
      console.error('Processing simulation error:', err);
    }
  }, delay);
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/files/upload
 */
exports.uploadFiles = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No files uploaded' });
  }

  const tags = req.body.tags
    ? req.body.tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  const savedFiles = [];

  for (const file of req.files) {
    const fileId = uuidv4();
    const category = getCategory(file.mimetype);
    const url = `/uploads/${file.filename}`;

    const doc = await File.create({
      fileId,
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      category,
      status: 'processing',
      url,
      path: file.path,
      tags,
    });

    simulateProcessing(fileId);
    savedFiles.push(doc);
  }

  res.status(201).json({
    success: true,
    message: `${savedFiles.length} file(s) uploaded successfully`,
    data: { files: savedFiles },
  });
};

/**
 * GET /api/files
 */
exports.getFiles = async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    status,
    search,
    sort = '-createdAt',
  } = req.query;

  const query = {};
  if (category && category !== 'all') query.category = category;
  if (status && status !== 'all') query.status = status;
  if (search) query.$text = { $search: search };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [files, total] = await Promise.all([
    File.find(query).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
    File.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      files,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
};

/**
 * GET /api/files/:fileId
 */
exports.getFile = async (req, res) => {
  const file = await File.findOne({ fileId: req.params.fileId }).lean();
  if (!file) return res.status(404).json({ success: false, message: 'File not found' });
  res.json({ success: true, data: { file } });
};

/**
 * GET /api/files/:fileId/download
 */
exports.downloadFile = async (req, res) => {
  const file = await File.findOne({ fileId: req.params.fileId });
  if (!file) return res.status(404).json({ success: false, message: 'File not found' });

  const filePath = path.resolve(file.path || path.join(UPLOAD_DIR, file.storedName));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found on disk' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
  res.setHeader('Content-Type', file.mimeType);
  res.sendFile(filePath);
};

/**
 * DELETE /api/files/:fileId
 */
exports.deleteFile = async (req, res) => {
  const file = await File.findOne({ fileId: req.params.fileId });
  if (!file) return res.status(404).json({ success: false, message: 'File not found' });

  // Delete from disk
  const filePath = path.resolve(file.path || path.join(UPLOAD_DIR, file.storedName));
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.warn('Could not delete file from disk:', err.message);
  }

  await file.deleteOne();
  res.json({ success: true, message: 'File deleted successfully' });
};

/**
 * GET /api/files/stats/summary
 */
exports.getStats = async (req, res) => {
  const [totalResult, byCategory, byStatus] = await Promise.all([
    File.aggregate([{ $group: { _id: null, total: { $sum: 1 }, totalSize: { $sum: '$size' } } }]),
    File.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    File.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const stats = {
    totalFiles: totalResult[0]?.total ?? 0,
    totalSize: totalResult[0]?.totalSize ?? 0,
    byCategory: Object.fromEntries(byCategory.map(r => [r._id, r.count])),
    byStatus:   Object.fromEntries(byStatus.map(r => [r._id, r.count])),
  };

  res.json({ success: true, data: { stats } });
};
