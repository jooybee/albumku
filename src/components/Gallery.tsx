import { useEffect, useState, useCallback } from 'react';
import {
  getAllPhotos,
  deletePhoto,
  photoSrc,
  isCloudEnabled,
  type StoredPhoto,
} from '../lib/storage';
import { EVENT_CONFIG } from '../lib/config';
import { loadSettings } from '../lib/settings';


function formatRevealCountdown(revealAt: string | null): string | null {
  if (!revealAt) return null;
  const end = new Date(revealAt).getTime();
  if (Number.isNaN(end)) return null;
  const diff = end - Date.now();
  if (diff <= 0) return null;
  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (totalHours >= 48) {
    const days = Math.floor(totalHours / 24);
    const h = totalHours % 24;
    return `${days}d ${h}h`;
  }
  return `${totalHours}h ${mins}m`;
}

function formatRevealLabel(revealAt: string): string {
  const d = new Date(revealAt);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${d.getDate()} ${months[d.getMonth()]}, ${String(d.getHours()).padStart(2,'0')}.${String(d.getMinutes()).padStart(2,'0')}`;
}

export default function Gallery() {
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const [myName, setMyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StoredPhoto | null>(null);
  const [filterGuest, setFilterGuest] = useState<'all' | string>('all');
  const [error, setError] = useState<string | null>(null);
  const [likes, setLikes] = useState<Record<string, number>>({});

  const sharedAlbum = isCloudEnabled && Boolean(EVENT_CONFIG.eventId);
  const settings = typeof window !== 'undefined' ? loadSettings() : null;
  const enableLikes = settings?.enableLikes !== false;
  const revealAt =
    settings?.revealAt ?? EVENT_CONFIG.revealAt ?? null;
  const isRevealed =
    !revealAt || Date.now() >= new Date(revealAt).getTime();

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

  async function sharePhoto(photo: StoredPhoto) {
    const src = photoSrc(photo);
    if (!src) return;
    const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
    const title = EVENT_CONFIG.polaroid?.title || EVENT_CONFIG.name;
    const text = `${title} — ${EVENT_CONFIG.polaroid?.subtitle || ''}`;

    try {
      // Coba bagikan file (bagus untuk Instagram Stories via share sheet HP)
      if (navigator.share) {
        let file: File | null = null;
        try {
          const res = await fetch(src);
          const blob = await res.blob();
          file = new File([blob], `momen-${photo.createdAt}.jpg`, {
            type: blob.type || 'image/jpeg',
          });
        } catch {
          /* fetch gagal (CORS) — tetap share URL */
        }

        if (file && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title, text });
          return;
        }
        await navigator.share({ title, text, url: pageUrl });
        return;
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
    }

    // Fallback: unduh + salin link (Instagram tidak punya share URL resmi)
    try {
      await navigator.clipboard?.writeText(pageUrl);
    } catch {
      /* ignore */
    }
    downloadPhoto(photo);
    alert(
      'Foto diunduh. Untuk Instagram Stories: buka Instagram → buat Story → pilih foto dari galeri. Link album sudah disalin.'
    );
  }

  /** Like bisa di-spam (setiap tap +1) */
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

      {!isRevealed && revealAt && (
        <div className="reveal-hero">
          <p className="reveal-label">Foto terungkap dalam</p>
          <p className="reveal-count">{formatRevealCountdown(revealAt) || '…'}</p>
        </div>
      )}

      <div className={`photo-grid ${!isRevealed ? 'polaroid-mode' : ''}`}>
        {visible.map((photo) => (
          <button
            key={photo.id}
            type="button"
            className={`photo-card ${!isRevealed ? 'polaroid locked' : ''}`}
            onClick={() => isRevealed && setSelected(photo)}
          >
            <div className="polaroid-photo">
              <img
                src={photoSrc(photo)}
                alt=""
                loading="lazy"
                className={!isRevealed ? 'blurred' : ''}
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  el.style.background = '#222';
                  el.alt = 'Gagal muat';
                }}
              />
              {!isRevealed && revealAt && (
                <div className="lock-overlay">
                  <svg className="lock-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  <span className="lock-date">{formatRevealLabel(revealAt)}</span>
                </div>
              )}
            </div>
            {!isRevealed ? (
              <div className="polaroid-cap">
                <span className="pol-title">{EVENT_CONFIG.polaroid?.title || EVENT_CONFIG.name}</span>
                {EVENT_CONFIG.polaroid?.hashtag && (
                  <span className="pol-tag">{EVENT_CONFIG.polaroid.hashtag}</span>
                )}
                <span className="pol-date">{EVENT_CONFIG.polaroid?.subtitle || ''}</span>
              </div>
            ) : (
              <div className="photo-meta">
                <span className="photo-guest">{photo.guestName}</span>
                <span className="photo-preset">{photo.presetName}</span>
                {enableLikes && (likes[photo.id] || 0) > 0 && (
                  <span className="photo-likes">♥ {likes[photo.id]}</span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      {selected && isRevealed && (
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
                <button type="button" className="chip like-btn" onClick={() => toggleLike(selected.id)}>
                  ♥ Like{(likes[selected.id] || 0) > 0 ? ` (${likes[selected.id]})` : ''}
                </button>
              )}
              <button type="button" className="chip" onClick={() => sharePhoto(selected)}>
                ↗ Bagikan
              </button>
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
  .like-btn { color: #f9a8d4; border-color: rgba(249,168,212,0.35); }
  .like-btn:active { transform: scale(0.95); }

  .reveal-hero {
    text-align: center;
    margin: 4px 0 18px;
  }
  .reveal-label {
    font-size: 0.8rem;
    color: #8a8580;
    margin-bottom: 4px;
  }
  .reveal-count {
    font-family: "Cormorant Garamond", var(--font-serif), Georgia, serif;
    font-style: italic;
    font-weight: 400;
    font-size: clamp(1.9rem, 8vw, 2.6rem);
    color: #f5f0eb;
    letter-spacing: -0.02em;
    line-height: 1.05;
  }

  .photo-grid.polaroid-mode {
    grid-template-columns: 1fr;
    max-width: 240px;
    margin: 0 auto;
    gap: 16px;
  }
  @media (min-width: 420px) {
    .photo-grid.polaroid-mode {
      grid-template-columns: repeat(2, 1fr);
      max-width: 100%;
      gap: 14px;
    }
  }

  .photo-card.polaroid {
    aspect-ratio: auto;
    background: #f7f4ef;
    border: none;
    border-radius: 2px;
    padding: 8px 8px 10px;
    box-shadow: 0 6px 22px rgba(0,0,0,0.4);
    cursor: default;
    overflow: visible;
  }
  .polaroid-photo {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    background: #1a1a1a;
  }
  .polaroid-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .polaroid-photo img.blurred {
    filter: blur(14px) brightness(0.62);
    transform: scale(1.1);
  }
  .lock-overlay {
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 4px;
    color: rgba(255,255,255,0.92);
    background: rgba(0,0,0,0.12);
    pointer-events: none;
  }
  .lock-ico {
    width: 18px;
    height: 18px;
    opacity: 0.9;
  }
  .lock-date {
    font-size: 0.68rem;
    font-weight: 500;
    letter-spacing: 0.03em;
    opacity: 0.92;
  }
  .polaroid-cap {
    text-align: center;
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 0 2px;
  }
  .pol-title {
    font-family: "Cormorant Garamond", var(--font-serif), Georgia, serif;
    font-style: italic;
    font-weight: 500;
    font-size: 1.35rem;
    color: #1a1a1a;
    line-height: 1.15;
  }
  .pol-tag { font-size: 0.62rem; color: #a8a29e; letter-spacing: 0.02em; }
  .pol-date { font-size: 0.62rem; color: #a8a29e; }

  .lb-content img {
    background: #f7f4ef;
    padding: 14px 14px 56px;
    border-radius: 2px;
    border: none !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.45);
  }
`;
