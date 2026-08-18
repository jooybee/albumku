# Albumku — Kamera Film Pribadi (mirip satualbum.id)

Versi pribadi tanpa login, tanpa pembayaran, tanpa form "buat acara".

Tampilan join page & kamera mengikuti gaya satualbum.id (dark, Instrument Serif, cream button).

## Fitur

- Halaman masuk mirip `/events/...` satualbum (nama, host, countdown, jumlah foto)
- Kamera browser + **ganti filter di dalam kamera** (FunSaver, QuickSnap, Portra, Ektar, HP5, CineStill)
- Semua pengaturan lewat `src/lib/config.ts`
- Foto tersimpan lokal (IndexedDB) atau langsung unduh
- Galeri lokal

## Setup

```bash
npm install
npm run dev
```

Buka http://localhost:4321

> Kamera hanya jalan di **localhost** atau **HTTPS**.

## Pengaturan acara

Edit `src/lib/config.ts`:

```ts
export const EVENT_CONFIG = {
  name: 'Our Wedding Day',
  hostName: 'Aji Sasmito',
  maxPhotosPerGuest: 10,
  endsAt: null,              // atau '2026-08-25T22:00:00+07:00'
  defaultPresetId: 'funsaver',
  saveMode: 'local',         // 'local' | 'download'
};
```

## Deploy

```bash
npm run build
npx vercel
```
