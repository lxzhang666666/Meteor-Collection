const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'blog';
const COLLECTION = process.env.COLLECTION || 'articles';
const WRITE_SECRET = process.env.WRITE_SECRET;
const SLUG_REGEX = /^[\w\-\/]+$/;

function isValidSlug(slug) {
  return typeof slug === 'string' && SLUG_REGEX.test(slug);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 验证写操作密钥
  const authHeader = req.headers.authorization;
  const secret = authHeader?.replace('Bearer ', '') || '';
  if (!WRITE_SECRET || secret !== WRITE_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (!MONGODB_URI) {
    return res.status(500).json({ success: false, error: 'MONGODB_URI not configured' });
  }

  const { slug, title, content } = req.body;

  if (!slug || !title || content === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: slug, title, content',
    });
  }

  if (!isValidSlug(slug)) {
    return res.status(400).json({ success: false, error: 'Invalid slug format' });
  }

  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    await db.collection(COLLECTION).updateOne(
      { _id: slug },
      { $set: { slug, title, content, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    return res.json({ success: true });
  } catch (e) {
    console.error('POST article error:', e.message);
    return res.status(500).json({ success: false, error: e.message });
  } finally {
    if (client) await client.close();
  }
}
