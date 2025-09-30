// Simple Express API with MongoDB GridFS for file storage
// Endpoints:
// - GET  /api/health
// - GET  /api/docs              → list files
// - POST /api/upload            → upload one or more files (field: file)
// - GET  /api/docs/:id/download → download by id
// - DELETE /api/docs/:id        → delete file by id

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const { MongoClient, ObjectId, GridFSBucket } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(morgan('dev'));

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGO_DB || 'digital-library';

let client;
let db;
let bucket;

async function connect() {
  if (db) return db;
  client = new MongoClient(MONGO_URI, { maxPoolSize: 10 });
  await client.connect();
  db = client.db(DB_NAME);
  bucket = new GridFSBucket(db, { bucketName: 'files' });
  return db;
}

app.get('/api/health', async (req, res) => {
  try {
    await connect();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/docs', async (req, res) => {
  try {
    await connect();
    const files = await db.collection('files.files').find({}).sort({ uploadDate: -1 }).toArray();
    const items = files.map(f => ({
      id: String(f._id),
      name: f.filename,
      size: f.length,
      type: (f.contentType || (f.metadata && f.metadata.type) || 'application/octet-stream'),
      date: f.uploadDate,
    }));
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.post('/api/upload', upload.array('file'), async (req, res) => {
  try {
    await connect();
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'No files provided' });
    const results = [];
    for (const f of files) {
      const id = new ObjectId();
      await new Promise((resolve, reject) => {
        const stream = bucket.openUploadStreamWithId(id, f.originalname, { contentType: f.mimetype, metadata: { type: f.mimetype } });
        stream.on('error', reject);
        stream.on('finish', resolve);
        stream.end(f.buffer);
      });
      results.push({ id: String(id), name: f.originalname, size: f.size, type: f.mimetype });
    }
    res.status(201).json({ uploaded: results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/docs/:id/download', async (req, res) => {
  try {
    await connect();
    const id = new ObjectId(req.params.id);
    const fileDoc = await db.collection('files.files').findOne({ _id: id });
    if (!fileDoc) return res.status(404).json({ error: 'Not found' });
    const forceDownload = req.query.download === '1' || req.query.download === 'true';
    res.setHeader('Content-Type', fileDoc.contentType || 'application/octet-stream');
    const dispositionType = forceDownload ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${encodeURIComponent(fileDoc.filename)}"`);
    bucket.openDownloadStream(id).on('error', () => res.sendStatus(404)).pipe(res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/docs/:id', async (req, res) => {
  try {
    await connect();
    const id = new ObjectId(req.params.id);
    await bucket.delete(id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`MongoDB: ${MONGO_URI}/${DB_NAME}`);
});


