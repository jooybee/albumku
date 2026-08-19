/**
 * Pengaturan acara runtime (override config.ts).
 * Disimpan di localStorage agar bisa diubah tanpa redeploy.
 * Default diambil dari EVENT_CONFIG.
 */

import { EVENT_CONFIG } from './config';

export interface EventSettings {
  name: string;
  hostName: string;
  maxPhotosPerGuest: number;
  endsAt: string | null;
  /** null = selalu terbuka; ISO string = foto baru terbuka setelah waktu ini */
  revealAt: string | null;
  coverImages: string[];
  coverFadeStrength: number;
  /** true = semua orang lihat semua foto */
  publicAlbum: boolean;
  /** sembunyikan nama pengunggah di galeri */
  hideUploaderName: boolean;
  /** tampilkan tombol like */
  enableLikes: boolean;
  language: 'id' | 'en';
  maxGuests: number;
}

const STORAGE_KEY = 'albumku_settings';

export function defaultSettings(): EventSettings {
  return {
    name: EVENT_CONFIG.name,
    hostName: EVENT_CONFIG.hostName,
    maxPhotosPerGuest: EVENT_CONFIG.maxPhotosPerGuest,
    endsAt: EVENT_CONFIG.endsAt,
    revealAt: null,
    coverImages: [...(EVENT_CONFIG.coverImages || [])],
    coverFadeStrength: EVENT_CONFIG.coverFadeStrength ?? 0.92,
    publicAlbum: true,
    hideUploaderName: false,
    enableLikes: false,
    language: 'id',
    maxGuests: 50,
  };
}

export function loadSettings(): EventSettings {
  if (typeof window === 'undefined') return defaultSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings();
    return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(partial: Partial<EventSettings>): EventSettings {
  const next = { ...loadSettings(), ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function resetSettings(): EventSettings {
  const d = defaultSettings();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  return d;
}

/** PIN host — ubah di config.ts field hostPin */
export function checkHostPin(pin: string): boolean {
  const expected = (EVENT_CONFIG as { hostPin?: string }).hostPin || '1234';
  return pin === expected;
}
