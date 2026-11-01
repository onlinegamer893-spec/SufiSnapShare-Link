import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Telegram Bot credentials (Server-side secrets)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8791640895:AAEgYDc4ZlEsAqUdE5vqKohYq0rnj4-BHqU';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8851455020';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'sufi-admin-2026';

// Persistent storage paths
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'photos.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface PhotoRecord {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  imageUrl: string;
  createdAt: string;
  status: 'active' | 'deleted';
  views: number;
  telegramSent: boolean;
  telegramError?: string | null;
  telegramTimestamp?: string | null;
}

// In-memory cache + persistent file sync
let photosDb: Record<string, PhotoRecord> = {};

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      photosDb = JSON.parse(data);
    } else {
      photosDb = {};
      fs.writeFileSync(DB_FILE, JSON.stringify(photosDb, null, 2));
    }
  } catch (err) {
    console.error('Failed to load photos.json database:', err);
    photosDb = {};
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(photosDb, null, 2));
  } catch (err) {
    console.error('Failed to save photos.json database:', err);
  }
}

loadDatabase();

// Middleware: allow large payloads (up to 50MB for high-res images)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded photos directly with caching
app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '1d',
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Utility: Generate 7-8 alphanumeric ID (unambiguous characters)
function generateShortId(length = 7): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateUniqueId(): string {
  let id = generateShortId(7);
  let attempts = 0;
  while (photosDb[id] && attempts < 10) {
    id = generateShortId(8);
    attempts++;
  }
  return id;
}

// Helper: Determine public base URL
function getBaseUrl(req: Request): string {
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const host = req.get('x-forwarded-host') || req.get('host') || `localhost:${PORT}`;
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${protocol}://${host}`;
}

// Telegram delivery function (send photo first, then send separate text message with short link)
async function notifyTelegram(photo: PhotoRecord, fileBuffer: Buffer, shortLink: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('Telegram bot credentials not configured.');
    return { success: false, error: 'Telegram credentials missing' };
  }

  try {
    // 1. Send the original photo
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: photo.mimeType });
    formData.append('photo', blob, photo.originalName || `${photo.id}.jpg`);
    formData.append('caption', `📸 SufiSnapShare Photo Upload\n🆔 Photo ID: ${photo.id}\n⏱ Uploaded: ${new Date(photo.createdAt).toUTCString()}`);

    const photoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: formData,
    });
    const photoData = await photoRes.json() as any;

    if (!photoRes.ok || !photoData.ok) {
      throw new Error(photoData?.description || `Failed to send photo (${photoRes.status})`);
    }

    // 2. Send separate text message containing the short share link
    const textMsg = `📸 New SufiSnapShare Photo\n\n🆔 Photo ID: ${photo.id}\n\n🔗 Short Link:\n${shortLink}\n\nUpload successful!`;
    const msgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: textMsg,
        disable_web_page_preview: false,
      }),
    });
    const msgData = await msgRes.json() as any;

    if (!msgRes.ok || !msgData.ok) {
      console.warn('Telegram short link text message failed:', msgData?.description);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Telegram notification error:', err.message || err);
    return { success: false, error: err.message || 'Telegram delivery failed' };
  }
}

// Rate limiting in-memory map
const uploadLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = uploadLimits.get(ip);
  if (!limit || now > limit.resetAt) {
    uploadLimits.set(ip, { count: 1, resetAt: now + 60000 }); // 60 seconds window
    return true;
  }
  if (limit.count >= 30) { // 30 uploads per minute per IP
    return false;
  }
  limit.count++;
  return true;
}

// ================= API ROUTES =================

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'SufiSnapShare',
    time: new Date().toISOString(),
    photosCount: Object.keys(photosDb).length,
    telegramConfigured: Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID),
  });
});

// Upload Photo API
app.post('/api/upload', async (req: Request, res: Response): Promise<void> => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    res.status(429).json({ error: 'Too many uploads. Please wait a moment.' });
    return;
  }

  try {
    const { fileData, fileName = 'photo.jpg', mimeType = 'image/jpeg' } = req.body;

    if (!fileData || typeof fileData !== 'string') {
      res.status(400).json({ error: 'Missing or invalid fileData in request body.' });
      return;
    }

    // Validate supported MIME types
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const cleanMime = mimeType.toLowerCase();
    if (!allowedMimeTypes.includes(cleanMime)) {
      res.status(400).json({ error: 'Unsupported format. Please upload JPG, PNG, or WEBP.' });
      return;
    }

    // Parse base64
    const base64PrefixMatch = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const base64Raw = base64PrefixMatch ? base64PrefixMatch[2] : fileData;
    const fileBuffer = Buffer.from(base64Raw, 'base64');

    // Validate size (max 25MB)
    if (fileBuffer.length > 25 * 1024 * 1024) {
      res.status(400).json({ error: 'File size exceeds 25MB limit.' });
      return;
    }

    // Determine extension
    let ext = '.jpg';
    if (cleanMime.includes('png')) ext = '.png';
    else if (cleanMime.includes('webp')) ext = '.webp';
    else if (cleanMime.includes('jpeg') || cleanMime.includes('jpg')) ext = '.jpg';

    // Generate unique short ID
    const photoId = generateUniqueId();
    const storedFileName = `${photoId}${ext}`;
    const filePath = path.join(UPLOADS_DIR, storedFileName);

    // Write file to disk storage
    fs.writeFileSync(filePath, fileBuffer);

    const baseUrl = getBaseUrl(req);
    const shortLink = `${baseUrl}/s/${photoId}`;
    const imageUrl = `/uploads/${storedFileName}`;

    const record: PhotoRecord = {
      id: photoId,
      originalName: fileName || storedFileName,
      mimeType: cleanMime,
      size: fileBuffer.length,
      imageUrl: imageUrl,
      createdAt: new Date().toISOString(),
      status: 'active',
      views: 0,
      telegramSent: false,
    };

    // Save record to DB
    photosDb[photoId] = record;
    saveDatabase();

    // Trigger Telegram notification in background (non-blocking for fast UI response, but track status)
    notifyTelegram(record, fileBuffer, shortLink).then((tgResult) => {
      record.telegramSent = tgResult.success;
      if (!tgResult.success) {
        record.telegramError = tgResult.error;
      } else {
        record.telegramTimestamp = new Date().toISOString();
      }
      photosDb[photoId] = record;
      saveDatabase();
    }).catch((err) => {
      record.telegramSent = false;
      record.telegramError = err.message || 'Telegram failed';
      photosDb[photoId] = record;
      saveDatabase();
    });

    res.json({
      success: true,
      id: photoId,
      shortLink: shortLink,
      imageUrl: imageUrl,
      createdAt: record.createdAt,
      status: record.status,
    });
  } catch (error: any) {
    console.error('Upload handling error:', error);
    res.status(500).json({ error: error.message || 'Server failed to process upload.' });
  }
});

// Get Photo by Short ID
app.get('/api/photos/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const photo = photosDb[id];

  if (!photo || photo.status !== 'active') {
    res.status(404).json({ error: 'Photo not found or link has expired.' });
    return;
  }

  // Increment view counter
  photo.views = (photo.views || 0) + 1;
  saveDatabase();

  const baseUrl = getBaseUrl(req);
  res.json({
    success: true,
    photo: {
      id: photo.id,
      imageUrl: photo.imageUrl,
      fullImageUrl: `${baseUrl}${photo.imageUrl}`,
      createdAt: photo.createdAt,
      status: photo.status,
      views: photo.views,
      size: photo.size,
      mimeType: photo.mimeType,
      originalName: photo.originalName,
      shortLink: `${baseUrl}/s/${photo.id}`,
    },
  });
});

// Admin Authentication Check
function checkAdminAuth(req: Request): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  return token === ADMIN_PASSWORD;
}

// Admin: Login
app.post('/api/admin/login', (req: Request, res: Response): void => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_PASSWORD });
  } else {
    res.status(401).json({ error: 'Incorrect administrator password.' });
  }
});

// Admin: Get statistics & photo records
app.get('/api/admin/stats', (req: Request, res: Response): void => {
  if (!checkAdminAuth(req)) {
    res.status(401).json({ error: 'Unauthorized admin access.' });
    return;
  }

  const allPhotos = Object.values(photosDb).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalPhotos = allPhotos.length;
  const totalViews = allPhotos.reduce((acc, p) => acc + (p.views || 0), 0);
  const telegramSuccessCount = allPhotos.filter(p => p.telegramSent).length;

  const baseUrl = getBaseUrl(req);

  res.json({
    success: true,
    stats: {
      totalPhotos,
      totalViews,
      telegramSuccessCount,
      telegramConfigured: Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID),
      botTokenPreview: TELEGRAM_BOT_TOKEN ? `${TELEGRAM_BOT_TOKEN.substring(0, 10)}...` : 'Not set',
      chatId: TELEGRAM_CHAT_ID,
    },
    photos: allPhotos.map(p => ({
      ...p,
      shortLink: `${baseUrl}/s/${p.id}`,
      fullImageUrl: `${baseUrl}${p.imageUrl}`,
    })),
  });
});

// Admin: Delete a photo
app.delete('/api/admin/photos/:id', (req: Request, res: Response): void => {
  if (!checkAdminAuth(req)) {
    res.status(401).json({ error: 'Unauthorized admin access.' });
    return;
  }

  const { id } = req.params;
  const photo = photosDb[id];
  if (!photo) {
    res.status(404).json({ error: 'Photo not found.' });
    return;
  }

  // Remove file from disk
  try {
    const filename = path.basename(photo.imageUrl);
    const fullPath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.error('Failed to unlink photo file:', err);
  }

  delete photosDb[id];
  saveDatabase();

  res.json({ success: true, message: `Photo ${id} permanently removed.` });
});

// Admin: Test Telegram connection
app.post('/api/admin/test-telegram', async (req: Request, res: Response): Promise<void> => {
  if (!checkAdminAuth(req)) {
    res.status(401).json({ error: 'Unauthorized admin access.' });
    return;
  }

  try {
    const pingMessage = `🔔 SufiSnapShare System Test\n\n✅ Bot connection verified!\n📱 Chat ID: ${TELEGRAM_CHAT_ID}\n⏰ Time: ${new Date().toUTCString()}`;
    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: pingMessage,
      }),
    });
    const tgData = await tgRes.json() as any;

    if (!tgRes.ok || !tgData.ok) {
      res.status(400).json({ success: false, error: tgData?.description || 'Telegram rejected test message' });
      return;
    }

    res.json({ success: true, message: 'Test message sent successfully to Telegram!', tgData });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Telegram test failed' });
  }
});

// Informative GET /api/upload
app.get('/api/upload', (_req: Request, res: Response): void => {
  res.json({
    status: 'ready',
    endpoint: '/api/upload',
    methods: ['POST'],
    description: 'Send a POST request with JSON body { fileData: "data:image/jpeg;base64,...", fileName: "...", mimeType: "..." }',
  });
});

// Explicit API catch-all: Never return HTML for any /api route
app.all('/api/*', (req: Request, res: Response): void => {
  res.status(404).json({
    error: `API route not found: ${req.method} ${req.originalUrl}`,
    status: 404,
  });
});

// Global API Error Handler (e.g., PayloadTooLargeError, invalid JSON body)
app.use((err: any, req: Request, res: Response, next: NextFunction): void => {
  if (req.originalUrl.startsWith('/api/')) {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
      error: err.message || 'API request error',
      code: err.type || err.code || 'API_ERROR',
      status,
    });
    return;
  }
  next(err);
});

// ================= FRONTEND SERVING & SSR META INJECTION =================

async function setupViteAndServe() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Development mode: Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    // Catch-all handler: inject OpenGraph tags for /s/:id before serving
    app.use('*', async (req: Request, res: Response, next: NextFunction) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);

        // If visiting /s/:id, inject dynamic meta tags for social share previews
        const shortMatch = url.match(/^\/s\/([a-zA-Z0-9]+)/);
        if (shortMatch) {
          const photoId = shortMatch[1];
          const photo = photosDb[photoId];
          if (photo) {
            const baseUrl = getBaseUrl(req);
            const imgUrl = `${baseUrl}${photo.imageUrl}`;
            template = template
              .replace(/<title>.*?<\/title>/, `<title>SufiSnapShare • Photo ${photoId}</title>`)
              .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="View shared photo on SufiSnapShare" />`)
              .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="Click to view full original photo without quality loss." />`);
            // Inject og:image
            template = template.replace('</head>', `<meta property="og:image" content="${imgUrl}" />\n<meta name="twitter:image" content="${imgUrl}" />\n</head>`);
          }
        }

        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    // Production mode
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath, { index: false }));

    app.use('*', (req: Request, res: Response) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        let template = fs.readFileSync(indexPath, 'utf-8');
        const shortMatch = req.originalUrl.match(/^\/s\/([a-zA-Z0-9]+)/);
        if (shortMatch) {
          const photoId = shortMatch[1];
          const photo = photosDb[photoId];
          if (photo) {
            const baseUrl = getBaseUrl(req);
            const imgUrl = `${baseUrl}${photo.imageUrl}`;
            template = template
              .replace(/<title>.*?<\/title>/, `<title>SufiSnapShare • Photo ${photoId}</title>`)
              .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="View shared photo on SufiSnapShare" />`)
              .replace('</head>', `<meta property="og:image" content="${imgUrl}" />\n</head>`);
          }
        }
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } else {
        res.status(404).send('Application build not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SufiSnapShare server running on http://0.0.0.0:${PORT}`);
  });
}

setupViteAndServe().catch((err) => {
  console.error('Failed to start server:', err);
});
