/**
 * ============================================================
 * PENGATURAN ACARA — ubah di sini saja
 * ============================================================
 * Tidak ada form "buat acara". Semua diatur lewat coding.
 * Setelah diubah → restart `npm run dev` (atau rebuild & deploy).
 */

export const EVENT_CONFIG = {
  /** Nama acara (tampil besar dengan font serif italic) */
  name: 'Our Wedding Day',

  /** Nama host / yang mengundang */
  hostName: 'Aji Sasmito',

  /**
   * Batas foto per tamu (per nama di perangkat ini).
   * Mirip "10 foto tersedia" di satualbum.
   */
  maxPhotosPerGuest: 10,

  /**
   * Waktu berakhir acara (ISO string atau null).
   * null = tidak ada countdown / tanpa batas waktu.
   * Contoh: '2026-08-25T22:00:00+07:00'
   */
  endsAt: null as string | null,

  /** Preset film default saat kamera dibuka */
  defaultPresetId: 'funsaver',

  /**
   * Mode simpan foto:
   * - 'local'    → IndexedDB di browser, bisa lihat di Album
   * - 'download' → langsung unduh tiap foto
   */
  saveMode: 'local' as 'local' | 'download',

  /**
   * Apakah foto langsung terlihat di album.
   */
  photosVisibleImmediately: true,
};
