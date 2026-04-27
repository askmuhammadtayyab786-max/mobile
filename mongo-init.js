// MongoDB initialization script
db = db.getSiblingDB('fileforge');

db.createCollection('files');

db.files.createIndex({ fileId: 1 }, { unique: true });
db.files.createIndex({ category: 1, status: 1 });
db.files.createIndex({ createdAt: -1 });
db.files.createIndex({ originalName: 'text' });
db.files.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

print('✅ FileForge MongoDB initialized');
