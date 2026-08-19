/**
 * ============================================================
 * PENGATURAN ACARA — ubah di sini saja (lewat coding)
 * ============================================================
 */

export const EVENT_CONFIG = {
  name: 'Our Wedding Day',
  hostName: 'Aji Sasmito',
  eventId: 'df5e8e86-c30f-4ce0-8b1a-ba57750870f3' as string,

  /** Maksimal foto per nama tamu */
  maxPhotosPerGuest: 3,

  endsAt: null as string | null,

  /** Reveal: foto blur sampai waktu ini. null = selalu terbuka */
  revealAt: '2026-10-29T21:00:00+07:00' as string | null,

  defaultPresetId: 'funsaver',

  /** Cover JPG — file harus ada di public/covers/cover.jpg */
  coverImages: [
    '/covers/cover.jpg',
  ] as string[],

  coverFadeStrength: 0.92,

  hostPin: '1234',

  polaroid: {
    title: 'Aji & Ayu',
    subtitle: '29 Oktober 2026',
    hashtag: '#ajidananayu',
  },
};