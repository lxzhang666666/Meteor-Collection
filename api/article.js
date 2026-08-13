// API 统一入口：GET /api/article?slug=<id>（读取）和 POST /api/article（写入）
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!MONGODB_URI) {
    return res.status(500).json({ error: 'MONGODB_URI not configured' });
  }

  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const coll = db.collection(COLLECTION);

    // ── GET /api/article?slug=<permalink> ──
    if (req.method === 'GET') {
      const slug = req.query.slug;
      if (!slug || !isValidSlug(slug)) {
        return res.status(400).json({ error: 'Invalid slug parameter' });
      }
      const article = await coll.findOne({ _id: slug });
      if (!article) {
        return res.json({ notFound: true });
      }
      const { _id, ...rest } = article;
      return res.json({ slug: _id, ...rest });
    }

    // ── POST /api/article ──
    if (req.method === 'POST') {
      const authHeader = req.headers.authorization;
      const secret = authHeader?.replace('Bearer ', '') || '';
      if (secret !== WRITE_SECRET) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
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

      await coll.updateOne(
        { _id: slug },
        { $set: { slug, title, content, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (e) {
    console.error('API error:', e.message);
    return res.status(500).json({ error: e.message });
  } finally {
    if (client) await client.close();
  }
}
