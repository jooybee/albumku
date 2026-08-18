/**
 * ============================================================
 * PENGATURAN ACARA — ubah di sini saja
 * ============================================================
 */

export const EVENT_CONFIG = {
  /** Nama acara (judul besar, font serif italic) */
  name: 'Our Wedding Day',

  /** Nama host / yang mengundang */
  hostName: 'Aji Sasmito',

  /**
   * UUID event di tabel Supabase `events`.
   * Diisi setelah menjalankan SQL "seed event" di README.
   * Contoh: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
   */
  eventId: 'df5e8e86-c30f-4ce0-8b1a-ba57750870f3' as string,

  /** Maksimal foto per nama tamu */
  maxPhotosPerGuest: 10,

  /**
   * Waktu berakhir (ISO) atau null = tanpa countdown.
   * Contoh: '2026-08-25T22:00:00+07:00'
   */
  endsAt: null as string | null,

  /** Filter default saat kamera dibuka */
  defaultPresetId: 'funsaver',
};
