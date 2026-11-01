import type { IncomingMessage, ServerResponse } from 'http';

// Helper for Vercel Serverless request/response
interface VercelRequest extends IncomingMessage {
  body: any;
  query: Record<string, string | string[]>;
  headers: Record<string, string>;
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (body: any) => void;
  send: (body: any) => void;
  setHeader: (name: string, value: string | number | readonly string[]) => this;
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8791640895:AAEgYDc4ZlEsAqUdE5vqKohYq0rnj4-BHqU';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8851455020';

function generateShortId(length = 7): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// In-memory fallback for serverless lifetime
const memoryStore: Record<string, any> = {};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Always ensure JSON header
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON request body.' });
      }
    }

    const { fileData, fileName = 'photo.jpg', mimeType = 'image/jpeg' } = body || {};

    if (!fileData || typeof fileData !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid fileData in request body.' });
    }

    const id = generateShortId(7);
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'online-image-sharing.com';
    const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
    const baseUrl = `${proto}://${host}`;
    const shortLink = `${baseUrl}/s/${id}`;

    // Decode buffer for Telegram
    let fileBuffer: Buffer | null = null;
    try {
      const base64PrefixMatch = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const base64Raw = base64PrefixMatch ? base64PrefixMatch[2] : fileData;
      fileBuffer = Buffer.from(base64Raw, 'base64');
    } catch (e) {
      console.warn('Failed to parse buffer:', e);
    }

    const record = {
      id,
      imageUrl: fileData.startsWith('data:') ? fileData : `/uploads/${id}.jpg`,
      originalName: fileName,
      mimeType,
      size: fileBuffer ? fileBuffer.length : 0,
      createdAt: new Date().toISOString(),
      status: 'active',
      views: 0,
      shortLink,
    };

    memoryStore[id] = record;

    // Trigger Telegram notification in background
    if (fileBuffer && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      try {
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
        formData.append('photo', blob, fileName);
        formData.append('caption', `📸 SufiSnapShare Photo Upload\n🆔 Photo ID: ${id}\n🔗 ${shortLink}`);

        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
          method: 'POST',
          body: formData,
        }).then(async () => {
          const textMsg = `📸 New SufiSnapShare Photo\n\n🆔 Photo ID: ${id}\n\n🔗 Short Link:\n${shortLink}\n\nUpload successful!`;
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: textMsg }),
          });
        }).catch((err) => console.error('Telegram notification error:', err));
      } catch (tgErr) {
        console.error('Telegram setup error:', tgErr);
      }
    }

    return res.status(200).json({
      success: true,
      id,
      shortLink,
      imageUrl: record.imageUrl,
      createdAt: record.createdAt,
      status: record.status,
    });
  } catch (error: any) {
    console.error('Upload error in serverless handler:', error);
    return res.status(500).json({ error: error.message || 'Server error processing upload.' });
  }
}
