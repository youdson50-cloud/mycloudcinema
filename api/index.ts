import express, { Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: '10mb' }));

// System status for Vercel
app.get('/api/system/status', (req: Request, res: Response) => {
  res.json({
    status: 'operational',
    service: 'MyCloud Cinema Serverless Engine (Vercel)',
    version: '1.2.0',
    platform: 'Vercel Serverless + Google Cloud Storage',
  });
});

// Storage stats route for Vercel
app.get('/api/storage/stats/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  res.json({
    userId,
    usedBytes: 0,
    videoCount: 0,
    quotaBytes: 100 * 1024 * 1024 * 1024,
    encryption: 'AES-256-GCM',
    redundancy: 'Google Cloud Storage Multi-Zone',
    status: 'healthy',
  });
});

// Subtitle converter
app.post('/api/subtitles/convert', (req: Request, res: Response) => {
  try {
    const { srtContent } = req.body;
    if (!srtContent) return res.status(400).json({ error: 'Missing srtContent' });
    let vtt = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    vtt = 'WEBVTT\n\n' + vtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    res.json({ vtt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback upload endpoint on Vercel: notifies client to use Direct Cloud Storage
app.post('/api/storage/upload/init', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    useDirectCloudStorage: true,
    message: 'Vercel Serverless active: Use direct Firebase Cloud Storage for large video uploads.',
  });
});

export default app;
