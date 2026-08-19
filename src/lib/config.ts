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
   * Kosong = mode lokal (foto tidak saling terlihat).
   */
  eventId: '' as string,

  /** Maksimal foto per nama tamu */
  maxPhotosPerGuest: 10,

  /**
   * Waktu berakhir (ISO) atau null = tanpa countdown.
   * Contoh: '2026-08-25T22:00:00+07:00'
   */
  endsAt: null as string | null,

  /** Filter default saat kamera dibuka */
  defaultPresetId: 'funsaver',

  /**
   * Foto header (cover) di halaman masuk.
   * Letakkan file di public/covers/ lalu tulis path-nya di sini.
   * Bisa satu foto atau beberapa (akan diganti bergiliran pelan-pelan).
   * Contoh: ['/covers/cover1.svg', '/covers/cover2.jpg']
   */
  coverImages: [
    '/covers/cover1.svg',
  ] as string[],

  /**
   * Seberapa kuat fade hitam di bawah cover (0–1).
   * 1 = sangat gelap di bawah, 0 = foto full terlihat.
   */
  coverFadeStrength: 0.92,
};
