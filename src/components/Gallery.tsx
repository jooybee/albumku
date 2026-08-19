import { useEffect, useState, useCallback } from 'react';
import {
  getAllPhotos,
  deletePhoto,
  photoSrc,
  isCloudEnabled,
  type StoredPhoto,
} from '../lib/storage';
import { EVENT_CONFIG } from '../lib/config';

export default function Gallery() {
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const [myName, setMyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StoredPhoto | null>(null);
  const [filterGuest, setFilterGuest] = useState<'all' | string>('all');
  const [error, setError] = useState<string | null>(null);
  const [likes, setLikes] = useState<Record<string, number>>({});

  const sharedAlbum = isCloudEnabled && Boolean(EVENT_CONFIG.eventId);
  const enableLikes = true;

  useEffect(() => {
    try {
      setMyName(localStorage.getItem('guest_name') || '');
      const raw = localStorage.getItem('albumku_likes');
      if (raw) setLikes(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getAllPhotos();
      setPhotos(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      setError('Gagal memuat album. Cek koneksi atau pengaturan Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (!sharedAlbum) return;
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load, sharedAlbum]);

  const guests = Array.from(new Set(photos.map((p) => p.guestName)));
  const visible =
    filterGuest === 'all' ? photos : photos.filter((p) => p.guestName === filterGuest);

  async function handleDelete(id: string) {
    const photo = photos.find((p) => p.id === id);
    if (!photo) return;
    if (myName && photo.guestName !== myName) {
      alert('Hanya bisa menghapus foto atas namamu sendiri.');
      return;
    }
    if (!confirm('Hapus momen ini?')) return;
    try {
      await deletePhoto(id);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {
      alert('Gagal menghapus.');
    }
  }

  function downloadPhoto(photo: StoredPhoto) {
    const src = photoSrc(photo);
    if (!src) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = `momen-${photo.createdAt}.jpg`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  }

  function toggleLike(id: string) {
    setLikes((prev) => {
      const next = { ...prev, [id]: (prev[id] || 0) + 1 };
      try {
        localStorage.setItem('albumku_likes', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  if (loading && photos.length === 0) {
    return (
      <div className="g-empty">
        <p>Memuat album bersama…</p>
        <style>{css}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="g-empty">
        <p className="empty-title">Gagal memuat</p>
        <p className="empty-sub">{error}</p>
        <button type="button" className="btn-primary" style={{ marginTop: 20, maxWidth: 240 }} onClick={() => load()}>
          Coba lagi
        </button>
        <style>{css}</style>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="g-empty">
        <p className="empty-icon">🎞️</p>
        <p className="empty-title">Belum ada momen</p>
        <p className="empty-sub">
          {sharedAlbum
            ? 'Foto dari semua tamu akan muncul di sini'
            : 'Isi eventId di config.ts + env Supabase agar album bersama aktif'}
        </p>
        <a href="/" className="btn-primary" style={{ marginTop: 24, maxWidth: 240 }}>
          Abadikan momen
        </a>
        <style>{css}</style>
      </div>
    );
  }

  return (
    <div className="gallery">
      <div className="mode-row">
        <span className={`mode-badge ${sharedAlbum ? 'cloud' : 'local'}`}>
          {sharedAlbum ? '☁ Album bersama' : '📱 Perangkat ini'}
        </span>
        <span className="photo-total">{visible.length} momen</span>
      </div>

      {guests.length > 1 && (
        <div className="guest-filters">
          <button
            type="button"
            className={`chip ${filterGuest === 'all' ? 'active' : ''}`}
            onClick={() => setFilterGuest('all')}
          >
            Semua
          </button>
          {guests.map((g) => (
            <button
              key={g}
              type="button"
              className={`chip ${filterGuest === g ? 'active' : ''}`}
              onClick={() => setFilterGuest(g)}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      <div className="g-actions">
        <button type="button" className="chip" onClick={() => load()}>
          ↻ Refresh
        </button>
      </div>

      <div className="photo-grid">
        {visible.map((photo) => (
          <button
            key={photo.id}
            type="button"
            className="photo-card"
            onClick={() => setSelected(photo)}
          >
            <img
              src={photoSrc(photo)}
              alt=""
              loading="lazy"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.background = '#222';
                el.alt = 'Gagal muat';
              }}
            />
            <div className="photo-meta">
              <span className="photo-guest">{photo.guestName}</span>
              <span className="photo-preset">{photo.presetName}</span>
              {enableLikes && (likes[photo.id] || 0) > 0 && (
                <span className="photo-likes">♥ {likes[photo.id]}</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="lightbox" onClick={() => setSelected(null)} role="presentation">
          <div className="lb-content" onClick={(e) => e.stopPropagation()} role="dialog">
            <img src={photoSrc(selected)} alt="" />
            <div className="lb-meta">
              <div>
                <strong>{selected.guestName}</strong>
                <span className="lb-preset">{selected.presetName}</span>
              </div>
              <span>{new Date(selected.createdAt).toLocaleString('id-ID')}</span>
            </div>
            <div className="lb-actions">
              {enableLikes && (
                <button type="button" className="chip" onClick={() => toggleLike(selected.id)}>
                  ♥ Like{(likes[selected.id] || 0) > 0 ? ` (${likes[selected.id]})` : ''}
                </button>
              )}
              <button type="button" className="chip" onClick={() => downloadPhoto(selected)}>
                Unduh
              </button>
              {(!myName || selected.guestName === myName) && (
                <button type="button" className="chip danger" onClick={() => handleDelete(selected.id)}>
                  Hapus
                </button>
              )}
              <button type="button" className="chip" onClick={() => setSelected(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{css}</style>
    </div>
  );
}

const css = `
  .g-empty { text-align: center; padding: 64px 20px; color: #8a8580; }
  .empty-icon { font-size: 2.8rem; margin-bottom: 12px; }
  .empty-title {
    font-family: var(--font-serif); font-style: italic;
    font-size: 1.4rem; color: #f5f0eb; margin-bottom: 6px;
  }
  .empty-sub { font-size: 0.85rem; line-height: 1.45; }
  .mode-row {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 16px;
  }
  .mode-badge {
    font-size: 0.75rem; font-weight: 600;
    padding: 5px 12px; border-radius: 999px;
  }
  .mode-badge.cloud { background: rgba(45,106,79,0.35); color: #a7f3d0; }
  .mode-badge.local { background: rgba(255,255,255,0.08); color: #a8a29e; }
  .photo-total { font-size: 0.8rem; color: #8a8580; }
  .guest-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
  .g-actions { display: flex; gap: 8px; margin-bottom: 18px; }
  .chip {
    padding: 7px 14px; border-radius: 999px;
    border: 1.5px solid rgba(255,255,255,0.12);
    background: #141414; color: #c4bfb8;
    font-weight: 500; font-size: 0.8rem; cursor: pointer;
  }
  .chip.active { background: #f0ebe3; color: #0a0a0a; border-color: #f0ebe3; }
  .chip.danger { color: #fca5a5; border-color: rgba(252,165,165,0.25); }
  .photo-grid {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
  }
  @media (min-width: 420px) {
    .photo-grid { grid-template-columns: repeat(3, 1fr); }
  }
  .photo-card {
    position: relative; aspect-ratio: 3/4; border: none; padding: 0;
    border-radius: 8px; overflow: hidden; cursor: pointer;
    background: #1a1a1a; border: 2px solid #1a1a1a;
  }
  .photo-card img { width: 100%; height: 100%; object-fit: cover; }
  .photo-meta {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: linear-gradient(transparent, rgba(0,0,0,0.85));
    padding: 18px 8px 7px; text-align: left;
  }
  .photo-guest { display: block; color: #fff; font-size: 0.7rem; font-weight: 600; }
  .photo-preset { display: block; color: #a8a29e; font-size: 0.6rem; }
  .photo-likes { display: block; color: #f9a8d4; font-size: 0.65rem; margin-top: 2px; }
  .lightbox {
    position: fixed; inset: 0; background: rgba(0,0,0,0.94); z-index: 100;
    display: flex; align-items: center; justify-content: center; padding: 20px;
  }
  .lb-content { max-width: 420px; width: 100%; }
  .lb-content img { width: 100%; border-radius: 8px; border: 3px solid #1a1a1a; }
  .lb-meta {
    display: flex; justify-content: space-between; align-items: flex-start;
    color: #8a8580; font-size: 0.8rem; margin: 12px 0;
  }
  .lb-meta strong { display: block; color: #f5f0eb; font-size: 0.95rem; }
  .lb-preset { display: block; font-size: 0.75rem; margin-top: 2px; }
  .lb-actions { display: flex; gap: 8px; flex-wrap: wrap; }
`;
