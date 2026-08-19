/**
 * PENGATURAN ACARA — ubah di sini saja
 */

export const EVENT_CONFIG = {
  name: 'Our Wedding Day',
  hostName: 'Aji Sasmito',

  // UUID dari Supabase tabel events (hasil SQL seed)
  // Kosong = mode lokal (foto tidak saling terlihat)
  eventId: 'df5e8e86-c30f-4ce0-8b1a-ba57750870f3',

  maxPhotosPerGuest: 10,
  endsAt: null as string | null,
  defaultPresetId: 'funsaver',

  // Foto header: taruh file di public/covers/
  coverImages: [
    '/covers/cover1.svg',
    // '/covers/cover1.jpg',
  ] as string[],

  // 0 = tanpa fade, 1 = sangat gelap di bawah
  coverFadeStrength: 0.92,
};