/**
 * ============================================================
 * PENGATURAN ACARA — ubah di sini saja (lewat coding)
 * ============================================================
 */

export const EVENT_CONFIG = {
  /** Nama acara (judul besar) */
  name: 'Our Wedding Day',

  /** Nama yang mengundang */
  hostName: 'Aji Sasmito',

  /**
   * UUID event di tabel Supabase `events`.
   * Wajib diisi agar album bersama (foto antar HP) aktif.
   */
  eventId: 'df5e8e86-c30f-4ce0-8b1a-ba57750870f3' as string,

  /** Maksimal foto per nama tamu */
  maxPhotosPerGuest: 2,

  /**
   * Waktu berakhir (ISO) atau null = tanpa countdown.
   * Contoh: '2026-08-25T22:00:00+07:00'
   */
  endsAt: null as string | null,

  /** Filter film default */
  defaultPresetId: 'funsaver',

  /**
   * Foto cover halaman masuk.
   * Taruh file di public/covers/ lalu tulis path di sini.
   */
  coverImages: [
    '/covers/cover1.svg',
    // '/covers/cover1.jpg',
  ] as string[],

  /** 0 = tanpa fade, 1 = sangat gelap di bawah */
  coverFadeStrength: 0.92,
};
