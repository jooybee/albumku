import { useEffect, useState, useCallback } from 'react';
import {
  getAllPhotos,
  clearAllPhotos,
  deletePhoto,
  photoSrc,
  isCloudEnabled,
  type StoredPhoto,
} from '../lib/storage';
import { EVENT_CONFIG } from '../lib/config';

const sharedAlbum = isCloudEnabled && Boolean(EVENT_CONFIG.eventId);

export default function Gallery() {
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StoredPhoto | null>(null);
  const [filterGuest, setFilterGuest] = useState<string | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPhotos(await getAllPhotos());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // auto-refresh tiap 8 detik kalau cloud (foto tamu lain)
    if (!sharedAlbum) return;
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const guests = Array.from(new Set(photos.map((p) => p.guestName)));
  const visible =
    filterGuest === 'all' ? photos : photos.filter((p) => p.guestName === filterGuest);

  async function handleClear() {
    if (!confirm('Hapus semua foto album ini?')) return;
    await clearAllPhotos();
    setPhotos([]);
  }

  async function handleDelete(id: string) {
    await deletePhoto(id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  function downloadPhoto(photo: StoredPhoto) {
    const src = photoSrc(photo);
    const a = document.createElement('a');
    a.href = src;
    a.download = `film-${photo.presetId}-${photo.createdAt}.jpg`;
    a.target = '_blank';
    a.click();
  }

  if (loading && photos.length === 0) {
    return (
      <div className="g-empty">
        <p>Memuat album…</p>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="g-empty">
        <p className="empty-icon">🎞️</p>
        <p className="empty-title">Belum ada foto</p>
        <p className="empty-sub">
          {sharedAlbum
            ? 'Foto dari semua tamu akan muncul di sini'
            : 'Mode lokal — hanya foto di perangkat ini'}
        </p>
        <a href="/" className="btn-primary" style={{ marginTop: 24, maxWidth: 240 }}>
          Mulai potret
        </a>
      </div>
    );
  }

  return (
    <div className="gallery">
      {/* Mode badge */}
      <div className="mode-row">
        <span className={`mode-badge ${sharedAlbum ? 'cloud' : 'local'}`}>
          {sharedAlbum ? '☁ Album bersama' : '📱 Hanya di perangkat ini'}
        </span>
        <span className="photo-total">{photos.length} foto</span>
      </div>

      {/* Filter by guest */}
      {guests.length > 1 && (
        <div className="guest-filters">
          <button
            className={`chip ${filterGuest === 'all' ? 'active' : ''}`}
            onClick={() => setFilterGuest('all')}
          >
            Semua
          </button>
          {guests.map((g) => (
            <button
              key={g}
              className={`chip ${filterGuest === g ? 'active' : ''}`}
              onClick={() => setFilterGuest(g)}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      <div className="g-actions">
        <button className="chip" onClick={load}>
          ↻ Refresh
        </button>
        <button className="chip danger" onClick={handleClear}>
          Hapus semua
        </button>
      </div>

      <div className="photo-grid">
        {visible.map((photo) => (
          <button key={photo.id} className="photo-card" onClick={() => setSelected(photo)}>
            <img src={photoSrc(photo)} alt={photo.presetName} loading="lazy" />
            <div className="photo-meta">
              <span className="photo-guest">{photo.guestName}</span>
              <span className="photo-preset">{photo.presetName}</span>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="lightbox" onClick={() => setSelected(null)}>
          <div className="lb-content" onClick={(e) => e.stopPropagation()}>
            <img src={photoSrc(selected)} alt={selected.presetName} />
            <div className="lb-meta">
              <div>
                <strong>{selected.guestName}</strong>
                <span className="lb-preset">{selected.presetName}</span>
              </div>
              <span>{new Date(selected.createdAt).toLocaleString('id-ID')}</span>
            </div>
            <div className="lb-actions">
              <button className="chip" onClick={() => downloadPhoto(selected)}>
                Unduh
              </button>
              <button className="chip danger" onClick={() => handleDelete(selected.id)}>
                Hapus
              </button>
              <button className="chip" onClick={() => setSelected(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .g-empty {
          text-align: center;
          padding: 64px 20px;
          color: #8a8580;
        }
        .empty-icon { font-size: 2.8rem; margin-bottom: 12px; }
        .empty-title {
          font-family: var(--font-serif);
          font-style: italic;
          font-size: 1.4rem;
          color: #f5f0eb;
          margin-bottom: 6px;
        }
        .empty-sub { font-size: 0.85rem; }

        .mode-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .mode-badge {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 999px;
        }
        .mode-badge.cloud {
          background: rgba(45, 106, 79, 0.35);
          color: #a7f3d0;
        }
        .mode-badge.local {
          background: rgba(255,255,255,0.08);
          color: #a8a29e;
        }
        .photo-total {
          font-size: 0.8rem;
          color: #8a8580;
        }

        .guest-filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .g-actions {
          display: flex;
          gap: 8px;
          margin-bottom: 18px;
        }
        .chip {
          padding: 7px 14px;
          border-radius: 999px;
          border: 1.5px solid rgba(255,255,255,0.12);
          background: #141414;
          color: #c4bfb8;
          font-weight: 500;
          font-size: 0.8rem;
          cursor: pointer;
        }
        .chip.active {
          background: #f0ebe3;
          color: #0a0a0a;
          border-color: #f0ebe3;
        }
        .chip.danger {
          color: #fca5a5;
          border-color: rgba(252,165,165,0.25);
        }

        .photo-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (min-width: 420px) {
          .photo-grid { grid-template-columns: repeat(3, 1fr); }
        }
        .photo-card {
          position: relative;
          aspect-ratio: 3/4;
          border: none;
          padding: 0;
          border-radius: 6px;
          overflow: hidden;
          cursor: pointer;
          background: #111;
          border: 2px solid #1a1a1a;
          /* film-ish frame */
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
        }
        .photo-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .photo-meta {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.8));
          padding: 18px 8px 7px;
          text-align: left;
        }
        .photo-guest {
          display: block;
          color: #fff;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .photo-preset {
          display: block;
          color: #a8a29e;
          font-size: 0.6rem;
        }

        .lightbox {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.94);
          z-index: 100;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .lb-content { max-width: 420px; width: 100%; }
        .lb-content img {
          width: 100%;
          border-radius: 6px;
          border: 3px solid #1a1a1a;
        }
        .lb-meta {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          color: #8a8580;
          font-size: 0.8rem;
          margin: 12px 0;
        }
        .lb-meta strong {
          display: block;
          color: #f5f0eb;
          font-size: 0.95rem;
        }
        .lb-preset {
          display: block;
          font-size: 0.75rem;
          margin-top: 2px;
        }
        .lb-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      `}</style>
    </div>
  );
}
