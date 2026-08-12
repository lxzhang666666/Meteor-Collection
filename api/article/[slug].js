const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'blog';
const COLLECTION = process.env.COLLECTION || 'articles';
const SLUG_REGEX = /^[\w\-\/]+$/;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const slug = req.query.slug;
  if (!slug || !SLUG_REGEX.test(slug)) {
    return res.status(400).json({ error: 'Invalid slug' });
  }

  if (!MONGODB_URI) {
    return res.status(500).json({ error: 'MONGODB_URI not configured' });
  }

  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const article = await db.collection(COLLECTION).findOne({ _id: slug });

    if (!article) {
      return res.json({ notFound: true });
    }

    const { _id, ...rest } = article;
    return res.json({ slug: _id, ...rest });
  } catch (e) {
    console.error('GET article error:', e.message);
    return res.status(500).json({ error: e.message });
  } finally {
    if (client) await client.close();
  }
}
