# Albumku — Kamera Film (mirip satualbum.id)

Tanpa login tamu · pengaturan lewat coding · album bersama via Supabase.

## Cocok dengan Supabase yang sudah ada

Kamu **tidak perlu** drop tabel `events` / `photos`. Cukup migrasi kecil + seed 1 event.

### SQL yang aman (jalankan di SQL Editor)

```sql
-- 1) Tambah kolom preset (abaikan error jika kolom sudah ada)
alter table public.photos add column if not exists preset_id text;
alter table public.photos add column if not exists preset_name text;

-- 2) Policy hapus foto (opsional, jika belum ada)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'photos' and policyname = 'Public delete photos'
  ) then
    create policy "Public delete photos"
      on public.photos for delete using (true);
  end if;
end $$;

-- 3) Seed 1 event pribadi — salin `id` yang keluar ke config.ts
insert into public.events (slug, name, preset_id, max_photos_per_guest, host_token, is_revealed)
values (
  'albumku-pribadi',
  'Our Wedding Day',
  'funsaver',
  10,
  'personal-host-token',
  true
)
on conflict (slug) do update set name = excluded.name
returning id, slug, name;
```

Hasil query `returning id` → salin UUID-nya.

### Isi di `src/lib/config.ts`

```ts
export const EVENT_CONFIG = {
  name: 'Our Wedding Day',
  hostName: 'Aji Sasmito',
  eventId: 'TEMPLEKAN-UUID-DARI-SQL-DI-SINI',
  maxPhotosPerGuest: 10,
  endsAt: null,
  defaultPresetId: 'funsaver',
};
```

### Env

```bash
# .env (lokal) + Vercel Environment Variables
PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Storage policy yang sudah kamu punya (`Allow public upload` / `Allow public read`) **sudah cukup**. Bucket `photos` harus **public**.

## Setup project

```bash
npm install
cp .env.example .env   # isi URL + key
# isi eventId di config.ts
npm run dev
```

## Deploy GitHub → Vercel

1. Push repo
2. Import di Vercel (Astro)
3. Environment Variables: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## Tanpa Supabase / tanpa eventId

App tetap jalan (mode lokal IndexedDB) — foto **tidak** saling terlihat antar HP.

## Struktur yang dipakai

| Tabel | Dipakai? |
|---|---|
| `events` | Ya — 1 baris event, `id`-nya di `config.eventId` |
| `photos` | Ya — `event_id`, `guest_name`, `storage_path`, `public_url`, `preset_id`, `preset_name` |
| storage bucket `photos` | Ya — path `{eventId}/{file}.jpg` |


## Ganti foto header (cover)

1. Taruh foto di `public/covers/` (mis. `cover1.jpg`, `cover2.jpg`)
2. Edit `src/lib/config.ts`:

```ts
coverImages: [
  '/covers/cover1.jpg',
  '/covers/cover2.jpg',  // opsional, ganti bergiliran
],
coverFadeStrength: 0.92,  // 0 = tanpa fade, 1 = sangat gelap di bawah
```

## Fitur hub tamu

Setelah isi nama:
- **Tombol kamera putih** → buka kamera + ganti filter
- **Import foto** → pilih dari galeri HP, otomatis kena filter film
- **QR Code** → tampilkan QR link album untuk dibagikan
