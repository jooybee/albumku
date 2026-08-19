import { useState, useEffect, useRef } from 'react';
import { EVENT_CONFIG } from '../lib/config';
import Camera from './Camera';
import { getPhotoCount, savePhoto } from '../lib/storage';
import { getPreset, FILM_PRESETS } from '../lib/presets';

function formatRemaining(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return 'Sudah berakhir';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h tersisa`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}j ${mins}m tersisa`;
  return `${mins}m tersisa`;
}

type Step = 'join' | 'hub' | 'camera' | 'qr';

export default function JoinScreen() {
  const [name, setName] = useState('');
  const [step, setStep] = useState<Step>('join');
  const [count, setCount] = useState(0);
  const [remaining, setRemaining] = useState(formatRemaining(EVENT_CONFIG.endsAt));
  const [coverIndex, setCoverIndex] = useState(0);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const covers = EVENT_CONFIG.coverImages?.length
    ? EVENT_CONFIG.coverImages
    : ['/covers/cover1.svg'];

  useEffect(() => {
    const saved = localStorage.getItem('guest_name');
    if (saved) setName(saved);
  }, []);

  useEffect(() => {
    if (!EVENT_CONFIG.endsAt) return;
    const t = setInterval(() => setRemaining(formatRemaining(EVENT_CONFIG.endsAt)), 60_000);
    return () => clearInterval(t);
  }, []);

  // Slow crossfade between cover images
  useEffect(() => {
    if (covers.length < 2) return;
    const t = setInterval(() => {
      setCoverIndex((i) => (i + 1) % covers.length);
    }, 6000);
    return () => clearInterval(t);
  }, [covers.length]);

  useEffect(() => {
    if ((step === 'hub' || step === 'camera') && name) {
      getPhotoCount(name.trim()).then(setCount).catch(() => {});
    }
  }, [step, name]);

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem('guest_name', trimmed);
    setStep('hub');
  }

  async function handleImport(files: FileList | null) {
    if (!files?.length) return;
    const guestName = name.trim();
    if (!guestName) return;

    setImporting(true);
    const preset = getPreset(EVENT_CONFIG.defaultPresetId);
    let done = 0;

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const current = await getPhotoCount(guestName);
        if (current + done >= EVENT_CONFIG.maxPhotosPerGuest) {
          alert(`Batas ${EVENT_CONFIG.maxPhotosPerGuest} foto tercapai`);
          break;
        }

        const dataUrl = await readFileAsDataURL(file);
        const processed = await applyPresetToImage(dataUrl, preset);
        const blob = await dataURLToBlob(processed);

        await savePhoto({
          guestName,
          blob,
          dataUrl: processed,
          presetId: preset.id,
          presetName: `${preset.brand} ${preset.name}`,
        });
        done++;
      }
      if (done > 0) {
        setCount((c) => c + done);
        alert(`${done} foto berhasil diimpor`);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal mengimpor foto');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (step === 'camera') {
    return (
      <Camera
        guestName={name.trim()}
        initialCount={count}
        onBack={() => setStep('hub')}
      />
    );
  }

  if (step === 'qr') {
    const url = typeof window !== 'undefined' ? window.location.origin + '/' : '';
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&bgcolor=0a0a0a&color=f0ebe3&data=${encodeURIComponent(url)}`;
    return (
      <div className="join-page qr-page">
        <button className="back-top" onClick={() => setStep('hub')}>← Kembali</button>
        <div className="qr-box">
          <p className="qr-label">Scan untuk masuk album</p>
          <img src={qrSrc} alt="QR Code" width={280} height={280} className="qr-img" />
          <p className="qr-url">{url}</p>
          <button
            className="btn-outline"
            style={{ marginTop: 16, maxWidth: 280 }}
            onClick={() => {
              navigator.clipboard?.writeText(url);
              alert('Link disalin');
            }}
          >
            Salin link
          </button>
        </div>
        <style>{qrStyles}</style>
      </div>
    );
  }

  if (step === 'hub') {
    return (
      <div className="join-page hub-page">
        <CoverHeader covers={covers} index={coverIndex} />
        <div className="hub-content">
          <p className="hub-guest">Halo, {name.trim()}</p>
          <h2 className="hub-title">{EVENT_CONFIG.name}</h2>
          <p className="hub-meta">
            {count} / {EVENT_CONFIG.maxPhotosPerGuest} foto
          </p>

          {/* White camera button */}
          <button
            className="cam-white-btn"
            onClick={() => setStep('camera')}
            aria-label="Buka kamera"
          >
            <span className="cam-icon">📷</span>
          </button>
          <p className="cam-label">Kamera</p>

          <div className="hub-actions">
            <button className="hub-action" onClick={() => fileRef.current?.click()} disabled={importing}>
              <span className="hub-action-icon">🖼️</span>
              <span>{importing ? 'Mengimpor…' : 'Import foto'}</span>
            </button>
            <button className="hub-action" onClick={() => setStep('qr')}>
              <span className="hub-action-icon">⬚</span>
              <span>QR Code</span>
            </button>
            <a className="hub-action" href="/gallery">
              <span className="hub-action-icon">🎞️</span>
              <span>Lihat album</span>
            </a>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => handleImport(e.target.files)}
          />
        </div>
        <style>{hubStyles}</style>
      </div>
    );
  }

  // —— Join screen ——
  return (
    <div className="join-page">
      <CoverHeader covers={covers} index={coverIndex} />
      <div className="lang-badge">ID</div>

      <div className="join-content">
        <div className="host-pill">
          <span className="pill-icon">👤</span>
          Diundang oleh {EVENT_CONFIG.hostName}
        </div>

        <h1 className="event-title">{EVENT_CONFIG.name}</h1>

        <div className="meta-row">
          {remaining && (
            <span className="meta-item">
              <span className="meta-icon">🕐</span> {remaining}
            </span>
          )}
          <span className="meta-item">
            <span className="meta-icon">📷</span> {EVENT_CONFIG.maxPhotosPerGuest} foto tersedia
          </span>
        </div>

        <form onSubmit={handleJoin} className="join-form">
          <div className="input-wrap">
            <span className="input-icon">👤</span>
            <input
              type="text"
              className="input-dark"
              placeholder="Masukkan namamu"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoComplete="name"
              autoFocus
            />
          </div>

          <button type="submit" className="btn-primary" disabled={!name.trim()}>
            Masuk ke album →
          </button>
        </form>

        <a href="/gallery" className="btn-outline" style={{ marginTop: 12 }}>
          Lihat album saja
        </a>
      </div>

      <p className="support">Tanpa login · Foto bersama di album</p>
      <style>{joinStyles}</style>
    </div>
  );
}

function CoverHeader({ covers, index }: { covers: string[]; index: number }) {
  const fade = EVENT_CONFIG.coverFadeStrength ?? 0.9;
  return (
    <div className="cover-header">
      {covers.map((src, i) => (
        <img
          key={src + i}
          src={src}
          alt=""
          className={`cover-img ${i === index ? 'active' : ''}`}
        />
      ))}
      <div
        className="cover-fade"
        style={{
          background: `linear-gradient(to bottom,
            rgba(10,10,10,0) 0%,
            rgba(10,10,10,${fade * 0.35}) 40%,
            rgba(10,10,10,${fade * 0.75}) 70%,
            rgba(10,10,10,${Math.min(1, fade)}) 100%)`,
        }}
      />
    </div>
  );
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function dataURLToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((r) => r.blob());
}

async function applyPresetToImage(
  dataUrl: string,
  preset: ReturnType<typeof getPreset>
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW = 1600;
      let w = img.width;
      let h = img.height;
      if (w > maxW) {
        h = Math.round((h * maxW) / w);
        w = maxW;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, w, h);

      // simple film grade (same idea as Camera)
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const p = preset;
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2];
        if (p.temperature > 0) {
          r = Math.min(255, r + p.temperature * 0.6);
          b = Math.max(0, b - p.temperature * 0.3);
        } else {
          b = Math.min(255, b - p.temperature * 0.6);
          r = Math.max(0, r + p.temperature * 0.3);
        }
        r = ((r / 255 - 0.5) * p.contrast + 0.5) * 255;
        g = ((g / 255 - 0.5) * p.contrast + 0.5) * 255;
        b = ((b / 255 - 0.5) * p.contrast + 0.5) * 255;
        const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * p.saturation;
        g = gray + (g - gray) * p.saturation;
        b = gray + (b - gray) * p.saturation;
        r *= p.brightness; g *= p.brightness; b *= p.brightness;
        if (p.grain > 0) {
          const n = (Math.random() - 0.5) * p.grain * 40;
          r += n; g += n; b += n;
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
        const gr = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.85);
        gr.addColorStop(0, 'rgba(0,0,0,0)');
        gr.addColorStop(1, `rgba(0,0,0,${p.vignette * 0.7})`);
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, w, h);
      }
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

const joinStyles = `
  .join-page {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    padding: 24px 20px 40px;
    position: relative;
    background: #0a0a0a;
    overflow: hidden;
  }
  .cover-header {
    position: absolute;
    inset: 0 0 35% 0;
    z-index: 0;
    overflow: hidden;
  }
  .cover-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 2s ease;
  }
  .cover-img.active { opacity: 1; }
  .cover-fade {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .lang-badge {
    position: absolute;
    top: 16px;
    right: 16px;
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.15);
    font-size: 0.75rem;
    font-weight: 500;
    color: #a8a29e;
    z-index: 2;
  }
  .join-content {
    width: 100%;
    max-width: 360px;
    text-align: center;
    position: relative;
    z-index: 1;
  }
  .host-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: rgba(255,255,255,0.08);
    border-radius: 999px;
    font-size: 0.85rem;
    color: #c4bfb8;
    margin-bottom: 20px;
    backdrop-filter: blur(8px);
  }
  .event-title {
    font-family: var(--font-serif);
    font-style: italic;
    font-weight: 400;
    font-size: clamp(2.4rem, 9vw, 3.2rem);
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: #f5f0eb;
    margin-bottom: 16px;
  }
  .meta-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 16px;
    margin-bottom: 28px;
    font-size: 0.85rem;
    color: #8a8580;
  }
  .meta-item { display: inline-flex; align-items: center; gap: 5px; }
  .join-form { display: flex; flex-direction: column; gap: 12px; }
  .input-wrap { position: relative; }
  .input-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.9rem;
    opacity: 0.5;
    pointer-events: none;
  }
  .support {
    position: relative;
    z-index: 1;
    margin-top: 28px;
    font-size: 0.75rem;
    color: #5c5854;
  }
`;

const hubStyles = `
  .hub-page {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    padding: 24px 20px 40px;
    position: relative;
    background: #0a0a0a;
    overflow: hidden;
  }
  .cover-header {
    position: absolute;
    inset: 0 0 30% 0;
    z-index: 0;
    overflow: hidden;
  }
  .cover-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 2s ease;
  }
  .cover-img.active { opacity: 1; }
  .cover-fade {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .hub-content {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 360px;
    text-align: center;
  }
  .hub-guest {
    font-size: 0.85rem;
    color: #8a8580;
    margin-bottom: 4px;
  }
  .hub-title {
    font-family: var(--font-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 1.75rem;
    color: #f5f0eb;
    margin-bottom: 6px;
  }
  .hub-meta {
    font-size: 0.8rem;
    color: #5c5854;
    margin-bottom: 28px;
  }
  .cam-white-btn {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    border: none;
    background: #f0ebe3;
    color: #0a0a0a;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 24px rgba(0,0,0,0.35);
    transition: transform 0.15s, background 0.15s;
  }
  .cam-white-btn:active { transform: scale(0.94); }
  .cam-white-btn:hover { background: #e4ddd3; }
  .cam-icon { font-size: 2rem; }
  .cam-label {
    margin-top: 10px;
    margin-bottom: 28px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #c4bfb8;
  }
  .hub-actions {
    display: flex;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .hub-action {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 14px 16px;
    min-width: 96px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    color: #c4bfb8;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
  }
  .hub-action:disabled { opacity: 0.5; }
  .hub-action-icon { font-size: 1.25rem; }
`;

const qrStyles = `
  .qr-page {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: #0a0a0a;
    position: relative;
  }
  .back-top {
    position: absolute;
    top: 16px;
    left: 16px;
    background: none;
    border: none;
    color: #8a8580;
    font-size: 0.9rem;
    cursor: pointer;
  }
  .qr-box { text-align: center; }
  .qr-label {
    font-size: 0.9rem;
    color: #8a8580;
    margin-bottom: 16px;
  }
  .qr-img {
    border-radius: 16px;
    border: 3px solid #1a1a1a;
    background: #0a0a0a;
  }
  .qr-url {
    margin-top: 12px;
    font-size: 0.75rem;
    color: #5c5854;
    word-break: break-all;
    max-width: 280px;
  }
`;
