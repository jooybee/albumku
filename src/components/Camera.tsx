import { useEffect, useRef, useState, useCallback } from 'react';
import { FILM_PRESETS, getPreset, type FilmPreset } from '../lib/presets';
import { EVENT_CONFIG } from '../lib/config';
import { savePhoto } from '../lib/storage';

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface Props {
  guestName: string;
  initialCount: number;
  onBack: () => void;
}

export default function Camera({ guestName, initialCount, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [presetId, setPresetId] = useState(EVENT_CONFIG.defaultPresetId);
  const [taking, setTaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(initialCount);
  const [ready, setReady] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [lastPreview, setLastPreview] = useState<string | null>(null);

  const preset = getPreset(presetId);
  const maxPhotos = EVENT_CONFIG.maxPhotosPerGuest;

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setReady(false);
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Browser tidak mendukung kamera. Gunakan Chrome/Safari di HTTPS atau localhost.');
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = mediaStream;

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = mediaStream;
      video.setAttribute('playsinline', 'true');
      video.muted = true;
      await video.play();
      setReady(true);
    } catch (err: unknown) {
      console.error('Camera error:', err);
      const e = err as DOMException;
      if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
        setError('Izin kamera ditolak. Buka pengaturan browser dan izinkan akses kamera.');
      } else if (e?.name === 'NotFoundError') {
        setError('Tidak ada kamera ditemukan.');
      } else if (e?.name === 'NotReadableError') {
        setError('Kamera sedang dipakai app lain. Tutup app lain lalu coba lagi.');
      } else {
        setError('Tidak bisa mengakses kamera. Pastikan halaman dibuka di HTTPS/localhost.');
      }
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera]);

  function applyFilmLook(ctx: CanvasRenderingContext2D, w: number, h: number, p: FilmPreset) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      if (p.temperature > 0) {
        r = Math.min(255, r + p.temperature * 0.6);
        b = Math.max(0, b - p.temperature * 0.3);
      } else {
        b = Math.min(255, b - p.temperature * 0.6);
        r = Math.max(0, r + p.temperature * 0.3);
      }
      if (p.tint !== 0) g = Math.max(0, Math.min(255, g + p.tint * 0.4));

      r = ((r / 255 - 0.5) * p.contrast + 0.5) * 255;
      g = ((g / 255 - 0.5) * p.contrast + 0.5) * 255;
      b = ((b / 255 - 0.5) * p.contrast + 0.5) * 255;

      const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * p.saturation;
      g = gray + (g - gray) * p.saturation;
      b = gray + (b - gray) * p.saturation;

      r *= p.brightness;
      g *= p.brightness;
      b *= p.brightness;

      if (p.grain > 0) {
        const noise = (Math.random() - 0.5) * p.grain * 40;
        r += noise; g += noise; b += noise;
      }

      if (p.saturation === 0) {
        const bw = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = bw;
      }

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imageData, 0, 0);

    if (p.vignette > 0) {
      const gradient = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.85);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, `rgba(0,0,0,${p.vignette * 0.7})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }
  }

  async function takePhoto() {
    if (!videoRef.current || !canvasRef.current || taking || count >= maxPhotos) return;
    if (!ready || videoRef.current.videoWidth === 0) return;

    setTaking(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    if (facingMode === 'user') ctx.setTransform(1, 0, 0, 1, 0, 0);

    applyFilmLook(ctx, canvas.width, canvas.height, preset);

    const flash = document.getElementById('flash');
    if (flash) {
      flash.classList.add('active');
      setTimeout(() => flash.classList.remove('active'), 120);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setLastPreview(dataUrl);

    try {
      if (EVENT_CONFIG.saveMode === 'download') {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `film-${preset.id}-${Date.now()}.jpg`;
        a.click();
      } else {
        await savePhoto({
          id: uid(),
          guestName,
          dataUrl,
          presetId: preset.id,
          presetName: `${preset.brand} ${preset.name}`,
          createdAt: Date.now(),
        });
      }
      setCount((c) => c + 1);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan foto');
    } finally {
      setTaking(false);
      setTimeout(() => setLastPreview(null), 800);
    }
  }

  if (count >= maxPhotos) {
    return (
      <div className="cam-page">
        <div className="cam-done">
          <p className="done-icon">🎞️</p>
          <p className="done-title">Roll-mu sudah penuh</p>
          <p className="done-sub">{count} / {maxPhotos} foto</p>
          <a href="/gallery" className="btn-primary" style={{ marginTop: 24, maxWidth: 280 }}>
            Lihat album
          </a>
          <button className="btn-outline" style={{ marginTop: 12, maxWidth: 280 }} onClick={onBack}>
            Kembali
          </button>
        </div>
        <style>{doneStyles}</style>
      </div>
    );
  }

  return (
    <div className="cam-page">
      <div id="flash" className="flash" />
      {lastPreview && (
        <div className="shot-preview">
          <img src={lastPreview} alt="" />
        </div>
      )}

      <header className="cam-header">
        <button className="back-btn" onClick={onBack} aria-label="Kembali">←</button>
        <div className="cam-header-info">
          <p className="cam-event">{EVENT_CONFIG.name}</p>
          <p className="cam-guest">{guestName}</p>
        </div>
        <a href="/gallery" className="album-link">Album</a>
      </header>

      {error ? (
        <div className="cam-error">
          <p>{error}</p>
          <button className="btn-primary" style={{ maxWidth: 200 }} onClick={startCamera}>
            Coba lagi
          </button>
        </div>
      ) : (
        <>
          <div className="viewfinder">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="video"
              style={{
                filter: preset.cssFilter,
                transform: facingMode === 'user' ? 'scaleX(-1)' : undefined,
              }}
            />
            <div className="vf-corners">
              <span className="c tl" /><span className="c tr" />
              <span className="c bl" /><span className="c br" />
            </div>
            <button className="filter-badge" onClick={() => setShowFilters((v) => !v)}>
              {preset.brand} {preset.name} ▾
            </button>
            <div className="roll-counter">{count} / {maxPhotos}</div>
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {showFilters && (
            <div className="filter-sheet">
              <div className="sheet-handle" />
              <div className="sheet-header">
                <span>Ganti filter</span>
                <button onClick={() => setShowFilters(false)}>✕</button>
              </div>
              <div className="filter-list">
                {FILM_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    className={`filter-item ${p.id === presetId ? 'active' : ''}`}
                    onClick={() => { setPresetId(p.id); setShowFilters(false); }}
                  >
                    <div className="swatch" style={{ filter: p.cssFilter }} />
                    <div>
                      <strong>{p.brand} {p.name}</strong>
                      <span>{p.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="controls">
            <button className="side-btn" onClick={() => setShowFilters((v) => !v)} aria-label="Filter">
              🎞
            </button>
            <button
              className="shutter"
              onClick={takePhoto}
              disabled={taking || !ready}
              aria-label="Ambil foto"
            >
              {taking ? <span className="spinner" /> : null}
            </button>
            <button
              className="side-btn"
              onClick={() => setFacingMode((p) => (p === 'user' ? 'environment' : 'user'))}
              aria-label="Ganti kamera"
            >
              🔄
            </button>
          </div>
        </>
      )}

      <style>{camStyles}</style>
    </div>
  );
}

const doneStyles = `
  .cam-page { min-height: 100dvh; background: #0a0a0a; color: #f5f0eb; }
  .cam-done { text-align: center; padding: 80px 24px; }
  .done-icon { font-size: 2.5rem; margin-bottom: 12px; }
  .done-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 6px; }
  .done-sub { color: #8a8580; }
`;

const camStyles = `
  .cam-page {
    min-height: 100dvh;
    background: #0a0a0a;
    color: #f5f0eb;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 24px;
  }
  .cam-header {
    width: 100%;
    max-width: 420px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
  }
  .back-btn, .album-link {
    background: none;
    border: none;
    color: #a8a29e;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    padding: 6px 10px;
  }
  .cam-header-info { text-align: center; }
  .cam-event {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 0.95rem;
  }
  .cam-guest { font-size: 0.75rem; color: #8a8580; }

  .viewfinder {
    position: relative;
    width: calc(100% - 32px);
    max-width: 380px;
    aspect-ratio: 3/4;
    background: #000;
    border-radius: 16px;
    overflow: hidden;
    border: 3px solid #1a1a1a;
  }
  .video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .vf-corners { position: absolute; inset: 0; pointer-events: none; }
  .c {
    position: absolute;
    width: 22px; height: 22px;
    border-color: rgba(255,255,255,0.7);
    border-style: solid;
  }
  .tl { top: 12px; left: 12px; border-width: 2.5px 0 0 2.5px; }
  .tr { top: 12px; right: 12px; border-width: 2.5px 2.5px 0 0; }
  .bl { bottom: 12px; left: 12px; border-width: 0 0 2.5px 2.5px; }
  .br { bottom: 12px; right: 12px; border-width: 0 2.5px 2.5px 0; }

  .filter-badge {
    position: absolute;
    top: 14px; left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.55);
    color: white;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: 999px;
    border: none;
    cursor: pointer;
    backdrop-filter: blur(8px);
    white-space: nowrap;
    z-index: 2;
  }
  .roll-counter {
    position: absolute;
    bottom: 14px; right: 14px;
    background: rgba(0,0,0,0.5);
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 999px;
  }

  .filter-sheet {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    background: #141414;
    border-radius: 20px 20px 0 0;
    max-height: 55vh;
    overflow-y: auto;
    z-index: 30;
    padding: 12px 16px 32px;
    box-shadow: 0 -8px 40px rgba(0,0,0,0.5);
  }
  .sheet-handle {
    width: 36px; height: 4px;
    background: #333;
    border-radius: 2px;
    margin: 0 auto 12px;
  }
  .sheet-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-weight: 600;
  }
  .sheet-header button {
    background: none; border: none; color: #a8a29e;
    font-size: 1.1rem; cursor: pointer; padding: 4px 8px;
  }
  .filter-list { display: flex; flex-direction: column; gap: 8px; }
  .filter-item {
    display: flex; align-items: center; gap: 12px;
    padding: 10px; border: 2px solid transparent;
    border-radius: 12px; background: #1c1c1c;
    color: #f5f0eb; cursor: pointer; text-align: left; width: 100%;
  }
  .filter-item.active { border-color: #c45c26; background: #1f1814; }
  .swatch {
    width: 44px; height: 44px; border-radius: 8px;
    background: linear-gradient(135deg, #e8d5c4, #c9a88a);
    flex-shrink: 0; border: 2px solid #333;
  }
  .filter-item strong { display: block; font-size: 0.9rem; }
  .filter-item span { font-size: 0.72rem; color: #8a8580; }

  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 380px;
    padding: 24px 32px 8px;
  }
  .side-btn {
    width: 48px; height: 48px;
    border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,0.15);
    background: #1c1c1c;
    font-size: 1.3rem;
    cursor: pointer;
    color: white;
    display: flex; align-items: center; justify-content: center;
  }
  .shutter {
    width: 76px; height: 76px;
    border-radius: 50%;
    border: 4px solid #f0ebe3;
    background: #f0ebe3;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.1s;
  }
  .shutter:active { transform: scale(0.92); }
  .shutter:disabled { opacity: 0.45; }

  .flash {
    position: fixed; inset: 0;
    background: white; opacity: 0;
    pointer-events: none; z-index: 100;
    transition: opacity 0.08s;
  }
  .flash.active { opacity: 0.9; }

  .shot-preview {
    position: fixed; inset: 0; z-index: 50;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.5);
    animation: fadeOut 0.8s ease forwards;
  }
  .shot-preview img {
    max-width: 80%; max-height: 70%;
    border-radius: 12px; border: 3px solid #1a1a1a;
  }
  @keyframes fadeOut {
    0% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
  }

  .cam-error {
    text-align: center;
    padding: 60px 24px;
    max-width: 320px;
  }
  .cam-error p { margin-bottom: 20px; color: #c4bfb8; line-height: 1.5; }

  .spinner {
    width: 22px; height: 22px;
    border: 3px solid rgba(0,0,0,0.15);
    border-top-color: #0a0a0a;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
