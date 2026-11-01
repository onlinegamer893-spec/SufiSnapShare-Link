import { PhotoRecord } from '../types';

const VAULT_STORAGE_KEY = 'sufi_local_vault_v1';

export function savePhotoToLocalVault(photo: PhotoRecord) {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    const vault: Record<string, PhotoRecord> = raw ? JSON.parse(raw) : {};
    vault[photo.id] = photo;
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
  } catch (err) {
    console.warn('Could not cache photo to local vault:', err);
  }
}

export function getPhotoFromLocalVault(id: string): PhotoRecord | null {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return null;
    const vault: Record<string, PhotoRecord> = JSON.parse(raw);
    return vault[id] || null;
  } catch {
    return null;
  }
}

export function generateLocalShortId(length = 7): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
