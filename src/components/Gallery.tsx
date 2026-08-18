import { useEffect, useState } from 'react';
import { getAllPhotos, clearAllPhotos, deletePhoto, type StoredPhoto } from '../lib/storage';
import { EVENT_CONFIG } from '../lib/config';

export default function Gallery() {
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StoredPhoto | null>(null);

  async function load() {
    setLoading(true);
    try {
      setPhotos(await getAllPhotos());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleClear() {
    if (!confirm('Hapus semua foto dari perangkat ini?')) return;
    await clearAllPhotos();
    setPhotos([]);
  }

  async function handleDelete(id: string) {
    await deletePhoto(id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  function downloadPhoto(photo: StoredPhoto) {
    const a = document.createElement('a');
    a.href = photo.dataUrl;
    a.download = `film-${photo.presetId}-${photo.createdAt}.jpg`;
    a.click();
  }

  function downloadAll() {
    photos.forEach((p, i) => setTimeout(() => downloadPhoto(p), i * 200));
  }

  if (loading) {
    return <div className="g-empty"><p>Memuat album…</p></div>;
  }

  if (photos.length === 0) {
    return (
      <div className="g-empty">
        <p className="empty-icon">📷</p>
        <p>Belum ada foto</p>
        <a href="/" className="btn-primary" style={{ marginTop: 20, maxWidth: 220 }}>
          Mulai potret
        </a>
      </div>
    );
  }

  return (
    <div className="gallery">
      <div className="g-actions">
        <button className="chip" onClick={downloadAll}>Unduh semua</button>
        <button className="chip danger" onClick={handleClear}>Hapus semua</button>
      </div>

      <div className="photo-grid">
        {photos.map((photo) => (
          <button key={photo.id} className="photo-card" onClick={() => setSelected(photo)}>
            <img src={photo.dataUrl} alt={photo.presetName} loading="lazy" />
            <span className="photo-label">
              {photo.guestName} · {photo.presetName}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="lightbox" onClick={() => setSelected(null)}>
          <div className="lb-content" onClick={(e) => e.stopPropagation()}>
            <img src={selected.dataUrl} alt={selected.presetName} />
            <div className="lb-meta">
              <span>{selected.guestName} · {selected.presetName}</span>
              <span>{new Date(selected.createdAt).toLocaleString('id-ID')}</span>
            </div>
            <div className="lb-actions">
              <button className="chip" onClick={() => downloadPhoto(selected)}>Unduh</button>
              <button className="chip danger" onClick={() => handleDelete(selected.id)}>Hapus</button>
              <button className="chip" onClick={() => setSelected(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .g-empty {
          text-align: center;
          padding: 60px 20px;
          color: #8a8580;
        }
        .empty-icon { font-size: 2.5rem; margin-bottom: 8px; }
        .g-actions {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .chip {
          padding: 8px 16px;
          border-radius: 999px;
          border: 1.5px solid rgba(255,255,255,0.15);
          background: #1c1c1c;
          color: #f5f0eb;
          font-weight: 500;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .chip.danger { color: #fca5a5; border-color: rgba(252,165,165,0.3); }
        .photo-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (min-width: 400px) {
          .photo-grid { grid-template-columns: repeat(3, 1fr); }
        }
        .photo-card {
          position: relative;
          aspect-ratio: 3/4;
          border: none;
          padding: 0;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          background: #111;
          border: 2px solid #1a1a1a;
        }
        .photo-card img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .photo-label {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.75));
          color: white;
          font-size: 0.6rem;
          padding: 14px 6px 5px;
          text-align: left;
        }
        .lightbox {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.92);
          z-index: 100;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .lb-content { max-width: 420px; width: 100%; }
        .lb-content img {
          width: 100%;
          border-radius: 8px;
          border: 3px solid #1a1a1a;
        }
        .lb-meta {
          display: flex; justify-content: space-between;
          color: #8a8580; font-size: 0.8rem; margin: 10px 0;
        }
        .lb-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      `}</style>
    </div>
  );
}
