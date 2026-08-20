/**
 * ============================================================
 * PENGATURAN ACARA — ubah di sini saja (lewat coding)
 * ============================================================
 */

export const EVENT_CONFIG = {
  /** Nama acara (judul besar) */
  name: 'Galeri Bersama',

  /** Nama yang mengundang */
  hostName: 'Aji & Ayu',

  /**
   * UUID event di tabel Supabase `events`.
   * Wajib diisi agar album bersama (foto antar HP) aktif.
   */
  eventId: 'df5e8e86-c30f-4ce0-8b1a-ba57750870f3' as string,

  /** Maksimal foto per nama tamu */
  maxPhotosPerGuest: 3,

  /**
   * Waktu berakhir (ISO) atau null = tanpa countdown.
   */
  endsAt: '2026-10-29T18:00:00+07:00' as string | null,

  /**
   * Waktu ungkap album (ISO). null = selalu terbuka.
   */
  revealAt: '2026-08-20T23:00:00+07:00' as string | null,

  /** Filter film default */
  defaultPresetId: 'funsaver',

  /**
   * Foto cover header — JPG/PNG/SVG OK.
   * File di public/covers/
   */
  coverImages: [
    '/covers/cover.jpg',
  ] as string[],

  /** 0 = tanpa fade, 1 = sangat gelap di bawah */
  coverFadeStrength: 0.92,

  hostPin: '1234',

  polaroid: {
    title: 'Aji & Ayu',
    subtitle: '29 Oktober 2026',
    hashtag: '#savethemoment',
  },
};

