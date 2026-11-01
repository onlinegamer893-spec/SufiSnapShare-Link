import type { IncomingMessage, ServerResponse } from 'http';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  const { id } = req.query;
  const photoId = Array.isArray(id) ? id[0] : id;

  if (!photoId) {
    return res.status(400).json({ error: 'Missing photo ID.' });
  }

  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'online-image-sharing.com';
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const baseUrl = `${proto}://${host}`;

  return res.status(200).json({
    success: true,
    photo: {
      id: photoId,
      imageUrl: `/uploads/${photoId}.jpg`,
      fullImageUrl: `${baseUrl}/uploads/${photoId}.jpg`,
      createdAt: new Date().toISOString(),
      status: 'active',
      views: 1,
      shortLink: `${baseUrl}/s/${photoId}`,
    },
  });
}
