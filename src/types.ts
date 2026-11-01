export interface PhotoRecord {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  imageUrl: string;
  fullImageUrl?: string;
  createdAt: string;
  status: 'active' | 'deleted';
  views: number;
  telegramSent: boolean;
  telegramError?: string | null;
  telegramTimestamp?: string | null;
  shortLink?: string;
}

export interface UploadResponse {
  success: boolean;
  id: string;
  shortLink: string;
  imageUrl: string;
  createdAt: string;
  status: string;
  error?: string;
}

export type AppView = 'home' | 'camera' | 'gallery' | 'result' | 'viewer' | 'admin';
