export default function handler(req, res) {
  res.status(200).json({
    message: 'Vercel API is working!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}
