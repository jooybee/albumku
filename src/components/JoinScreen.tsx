import { useState, useEffect, useRef } from 'react';
import { EVENT_CONFIG } from '../lib/config';
import Camera from './Camera';
import { getPhotoCount, getAllPhotos, savePhoto, photoSrc, type StoredPhoto } from '../lib/storage';
import { getPreset } from '../lib/presets';

function formatRemaining(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return 'Berakhir';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}j ${mins}m`;
  return `${mins}m`;
}

/** Countdown reveal ala satualbum: "1703h 30m" */
function formatRevealCountdown(revealAt: string | null): string | null {
  if (!revealAt) return null;
  const end = new Date(revealAt).getTime();
  if (Number.isNaN(end)) return null;
  const diff = end - Date.now();
  if (diff <= 0) return null; // sudah terbuka
  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (totalHours >= 24) {
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
  const day = d.getDate();
  const mon = months[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${mon}, ${hh}.${mm}`;
}

type Step = 'join' | 'hub' | 'camera';

export default function JoinScreen() {
  const [name, setName] = useState('');
  const [step, setStep] = useState<Step>('join');
  const [count, setCount] = useState(0);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [remaining, setRemaining] = useState<string | null>(null);
  const [revealCountdown, setRevealCountdown] = useState<string | null>(null);
  const [coverIndex, setCoverIndex] = useState(0);
  const revealAt = EVENT_CONFIG.revealAt;
  const isRevealed = !revealAt || Date.now() >= new Date(revealAt).getTime();
  const [importing, setImporting] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [recent, setRecent] = useState<StoredPhoto[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const covers = EVENT_CONFIG.coverImages?.length
    ? EVENT_CONFIG.coverImages
    : ['/covers/cover1.svg'];
  const eventName = EVENT_CONFIG.name;
  const hostName = EVENT_CONFIG.hostName;
  const maxPhotos = EVENT_CONFIG.maxPhotosPerGuest;

  useEffect(() => {
    const saved = localStorage.getItem('guest_name');
    if (saved) setName(saved);
  }, []);

  useEffect(() => {
    setRemaining(formatRemaining(EVENT_CONFIG.endsAt));
    setRevealCountdown(formatRevealCountdown(EVENT_CONFIG.revealAt));
    const id = setInterval(() => {
      setRemaining(formatRemaining(EVENT_CONFIG.endsAt));
      setRevealCountdown(formatRevealCountdown(EVENT_CONFIG.revealAt));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (covers.length < 2) return;
    const t = setInterval(() => setCoverIndex((i) => (i + 1) % covers.length), 7000);
    return () => clearInterval(t);
  }, [covers.length]);

  async function refreshStats(guestName?: string) {
    const g = guestName || name.trim();
    try {
      if (g) setCount(await getPhotoCount(g));
      const all = await getAllPhotos();
      setTotalPhotos(all.length);
      setRecent(all.slice(-6).reverse());
    } catch {}
  }

  useEffect(() => {
    if (step === 'hub') refreshStats();
  }, [step]);

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
    setShowUpload(false);
    const preset = getPreset(EVENT_CONFIG.defaultPresetId);
    let done = 0;
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const current = await getPhotoCount(guestName);
        if (current + done >= maxPhotos) {
          alert(`Batas ${maxPhotos} foto tercapai`);
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
      if (done > 0) await refreshStats(guestName);
    } catch (err) {
      console.error(err);
      alert('Gagal mengunggah foto');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const pageUrl = typeof window !== 'undefined' ? window.location.origin + '/' : '';
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=12&data=${encodeURIComponent(pageUrl)}`;

  if (step === 'camera') {
    return (
      <Camera
        guestName={name.trim()}
        initialCount={count}
        onBack={() => {
          setStep('hub');
          refreshStats();
        }}
      />
    );
  }

  // —— HUB (mirip satualbum dashboard) ——
  if (step === 'hub') {
    return (
      <div className="hub">
        {/* Cover background */}
        <div className="hub-cover">
          {covers.map((src, i) => (
            <img key={src + i} src={src} alt="" className={`hub-cover-img ${i === coverIndex ? 'on' : ''}`} />
          ))}
          <div className="hub-cover-fade" />
        </div>

        <header className="hub-top">
          <button type="button" className="icon-btn" onClick={() => setStep('join')} aria-label="Kembali">←</button>
          <span style={{ width: 40 }} />
        </header>

        <div className="hub-body">
          <h1 className="hub-title">{eventName}</h1>

          <div className="hub-stats">
            <div className="stat">
              <strong>{totalPhotos}</strong>
              <span>Momen</span>
            </div>
            <div className="stat">
              <strong>{remaining || '∞'}</strong>
              <span>Tersisa</span>
            </div>
            <div className="stat">
              <strong>{count}/{maxPhotos}</strong>
              <span>Roll-mu</span>
            </div>
          </div>

          {/* Camera + QR + Upload row */}
          <div className="hub-cta-row">
            <button className="btn-cam" onClick={() => setStep('camera')}>
              <CamIcon />
            </button>
            <button className="btn-sq" onClick={() => setShowQr(true)} aria-label="QR">
              <QrIcon />
            </button>
            <button className="btn-sq" onClick={() => setShowUpload(true)} aria-label="Unggah" disabled={importing}>
              <UploadIcon />
            </button>
          </div>

          {/* Reveal countdown — mirip satualbum */}
          {!isRevealed && revealCountdown && (
            <div className="reveal-block">
              <p className="reveal-label">Foto terungkap dalam</p>
              <p className="reveal-count">{revealCountdown}</p>
            </div>
          )}

          {/* Photo grid or empty — polaroid style saat locked */}
          {recent.length === 0 ? (
            <div className="hub-empty">
              <p className="empty-title">Belum ada momen</p>
              <p className="empty-sub">Abadikan momen pertama — foto dari kamera atau unggah dari galeri</p>
            </div>
          ) : (
            <div className="hub-polaroid-row">
              {recent.slice(0, 3).map((p) => (
                <a key={p.id} href="/gallery" className={`hub-polaroid ${!isRevealed ? 'locked' : ''}`}>
                  <div className="hub-polaroid-inner">
                    <img
                      src={photoSrc(p)}
                      alt=""
                      className={!isRevealed ? 'blurred' : ''}
                    />
                    {!isRevealed && revealAt && (
                      <div className="hub-lock">
                        <svg className="hub-lock-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 2" />
                        </svg>
                        <span className="hub-lock-time">{formatRevealLabel(revealAt)}</span>
                      </div>
                    )}
                  </div>
                  <div className="hub-polaroid-cap">
                    <p className="hub-pol-title">{EVENT_CONFIG.polaroid?.title || eventName}</p>
                    {EVENT_CONFIG.polaroid?.hashtag && (
                      <p className="hub-pol-tag">{EVENT_CONFIG.polaroid.hashtag}</p>
                    )}
                    <p className="hub-pol-date">{EVENT_CONFIG.polaroid?.subtitle || ''}</p>
                  </div>
                </a>
              ))}
            </div>
          )}

          <a href="/gallery" className="hub-album-link">Lihat album bersama →</a>
        </div>

        {/* QR bottom sheet */}
        {showQr && (
          <div className="sheet-backdrop" onClick={() => setShowQr(false)}>
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-handle" />
              <h2 className="sheet-title">Abadikan momen bersama.</h2>
              <p className="sheet-sub">
                Setiap tamu bisa ambil foto dari sudut pandang mereka.<br />Semua momen terkumpul di satu album bersama.
              </p>
              <div className="qr-wrap">
                <img src={qrSrc} alt="QR" width={220} height={220} />
              </div>
              <div className="sheet-actions">
                <button
                  className="sheet-btn"
                  onClick={() => {
                    navigator.clipboard?.writeText(pageUrl);
                    alert('Tautan disalin');
                  }}
                >
                  ↗ Bagikan Tautan
                </button>
                <a className="sheet-btn" href={qrSrc} download="album-qr.png" target="_blank" rel="noreferrer">
                  ↓ Simpan QR
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Upload bottom sheet */}
        {showUpload && (
          <div className="sheet-backdrop" onClick={() => setShowUpload(false)}>
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-handle" />
              <div className="upload-icon-wrap"><UploadIcon large /></div>
              <h2 className="sheet-title">Unggah momen</h2>
              <p className="sheet-sub">Foto dari galerimu akan masuk ke album bersama.</p>
              <div className="upload-opt">
                <span className="radio-on" />
                <div>
                  <strong>Ukuran penuh</strong>
                  <span>Pertahankan resolusi penuh.</span>
                </div>
              </div>
              <button className="btn-primary" onClick={() => fileRef.current?.click()}>
                ↗ Pilih foto
              </button>
              <button className="sheet-cancel" onClick={() => setShowUpload(false)}>Batal</button>
            </div>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleImport(e.target.files)}
        />

        <style>{hubCss}</style>
      </div>
    );
  }

  // —— JOIN (mirip satualbum event landing) ——
  return (
    <div className="join">
      <div className="join-cover">
        {covers.map((src, i) => (
          <img key={src + i} src={src} alt="" className={`join-cover-img ${i === coverIndex ? 'on' : ''}`} />
        ))}
        <div className="join-cover-fade" />
      </div>

      <div className="lang-badge">ID</div>

      <div className="join-body">
        <div className="host-pill">👤 Diundang oleh {hostName}</div>
        <h1 className="join-title">{eventName}</h1>
        <div className="join-meta">
          {remaining && <span>🕐 {remaining} tersisa</span>}
          <span>📷 {maxPhotos} foto tersedia</span>
        </div>

        <form onSubmit={handleJoin} className="join-form">
          <div className="input-wrap">
            <span className="input-ico">👤</span>
            <input
              className="input-dark"
              placeholder="Masukkan namamu"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoComplete="name"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={!name.trim()}>
            Abadikan momen →
          </button>
        </form>
        <a href="/gallery" className="btn-outline" style={{ marginTop: 12 }}>
          Lihat album bersama
        </a>
      </div>
      <style>{joinCss}</style>
    </div>
  );
}

function CamIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="1.8">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function QrIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h.01" />
    </svg>
  );
}
function UploadIcon({ large }: { large?: boolean }) {
  const s = large ? 28 : 22;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
      <path d="M16 3v6M13 6h6" />
    </svg>
  );
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
function dataURLToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((r) => r.blob());
}
async function applyPresetToImage(dataUrl: string, preset: ReturnType<typeof getPreset>): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW = 1600;
      let w = img.width, h = img.height;
      if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const p = preset;
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2];
        if (p.temperature > 0) { r = Math.min(255, r + p.temperature * 0.6); b = Math.max(0, b - p.temperature * 0.3); }
        else { b = Math.min(255, b - p.temperature * 0.6); r = Math.max(0, r + p.temperature * 0.3); }
        r = ((r / 255 - 0.5) * p.contrast + 0.5) * 255;
        g = ((g / 255 - 0.5) * p.contrast + 0.5) * 255;
        b = ((b / 255 - 0.5) * p.contrast + 0.5) * 255;
        const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * p.saturation;
        g = gray + (g - gray) * p.saturation;
        b = gray + (b - gray) * p.saturation;
        r *= p.brightness; g *= p.brightness; b *= p.brightness;
        if (p.grain > 0) { const n = (Math.random() - 0.5) * p.grain * 40; r += n; g += n; b += n; }
        if (p.saturation === 0) { const bw = 0.299 * r + 0.587 * g + 0.114 * b; r = g = b = bw; }
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

      // Frame polaroid — proporsional
      const side = Math.round(w * 0.07);
      const top = Math.round(w * 0.065);
      const bottom = Math.round(h * 0.2);
      const outW = w + side * 2;
      const outH = h + top + bottom;
      const out = document.createElement('canvas');
      out.width = outW;
      out.height = outH;
      const octx = out.getContext('2d')!;
      octx.fillStyle = '#f7f4ef';
      octx.fillRect(0, 0, outW, outH);
      octx.fillStyle = '#e8e4de';
      octx.fillRect(side - 2, top - 2, w + 4, h + 4);
      octx.drawImage(canvas, side, top, w, h);
      const polaroid = EVENT_CONFIG.polaroid || { title: 'Aji & Ayu', subtitle: '29 Oktober 2026', hashtag: '' };
      const titleSize = Math.max(34, Math.round(outW * 0.088));
      octx.fillStyle = '#1a1a1a';
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.font = `italic 500 ${titleSize}px "Cormorant Garamond", "Instrument Serif", Georgia, serif`;
      octx.fillText(polaroid.title, outW / 2, top + h + bottom * 0.36);
      let ty = top + h + bottom * 0.62;
      if (polaroid.hashtag) {
        const tagSize = Math.max(11, Math.round(outW * 0.024));
        octx.fillStyle = '#b0aaa4';
        octx.font = `400 ${tagSize}px Inter, system-ui, sans-serif`;
        octx.fillText(polaroid.hashtag, outW / 2, ty);
        ty = top + h + bottom * 0.78;
      } else {
        ty = top + h + bottom * 0.7;
      }
      const subSize = Math.max(11, Math.round(outW * 0.025));
      octx.fillStyle = '#b0aaa4';
      octx.font = `400 ${subSize}px Inter, system-ui, sans-serif`;
      octx.fillText(polaroid.subtitle, outW / 2, ty);

      resolve(out.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

const joinCss = `
  .join {
    min-height: 100dvh;
    position: relative;
    background: #0a0a0a;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 24px 20px 36px;
    overflow: hidden;
  }
  .join-cover { position: absolute; inset: 0 0 28% 0; z-index: 0; }
  .join-cover-img {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; opacity: 0; transition: opacity 2.2s ease;
  }
  .join-cover-img.on { opacity: 1; }
  .join-cover-fade {
    position: absolute; inset: 0;
    background: linear-gradient(to bottom,
      rgba(10,10,10,0.15) 0%,
      rgba(10,10,10,0.45) 45%,
      rgba(10,10,10,0.88) 75%,
      #0a0a0a 100%);
  }
  .lang-badge {
    position: absolute; top: 16px; right: 16px; z-index: 2;
    padding: 6px 14px; border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.14);
    font-size: 0.75rem; color: #a8a29e;
  }
  .join-body { position: relative; z-index: 1; width: 100%; max-width: 380px; margin: 0 auto; text-align: center; }
  .host-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 16px; border-radius: 999px;
    background: rgba(255,255,255,0.08); backdrop-filter: blur(10px);
    font-size: 0.85rem; color: #c4bfb8; margin-bottom: 18px;
  }
  .join-title {
    font-family: var(--font-serif); font-style: italic; font-weight: 400;
    font-size: clamp(2.5rem, 10vw, 3.4rem); line-height: 1.12;
    color: #f5f0eb; margin-bottom: 14px;
  }
  .join-meta {
    display: flex; flex-wrap: wrap; justify-content: center; gap: 14px;
    font-size: 0.85rem; color: #8a8580; margin-bottom: 28px;
  }
  .join-form { display: flex; flex-direction: column; gap: 12px; }
  .input-wrap { position: relative; }
  .input-ico {
    position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
    opacity: 0.45; pointer-events: none;
  }
`;

const hubCss = `
  .hub {
    min-height: 100dvh;
    position: relative;
    background: #0a0a0a;
    color: #f5f0eb;
    overflow-x: hidden;
  }
  .hub-cover {
    position: relative;
    height: 42vh;
    min-height: 240px;
    max-height: 380px;
    overflow: hidden;
  }
  .hub-cover-img {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; opacity: 0; transition: opacity 2.2s ease;
  }
  .hub-cover-img.on { opacity: 1; }
  .hub-cover-fade {
    position: absolute; inset: 0;
    background: linear-gradient(to bottom,
      rgba(10,10,10,0.2) 0%,
      rgba(10,10,10,0.55) 50%,
      #0a0a0a 100%);
  }
  .hub-top {
    position: absolute; top: 0; left: 0; right: 0; z-index: 5;
    display: flex; justify-content: space-between;
    padding: 14px 16px;
  }
  .icon-btn {
    width: 40px; height: 40px; border-radius: 50%;
    border: none; background: rgba(0,0,0,0.35);
    color: #f5f0eb; font-size: 1.1rem; cursor: pointer;
    backdrop-filter: blur(8px);
  }
  .hub-body {
    position: relative; z-index: 2;
    margin-top: -28px;
    padding: 0 20px 40px;
    text-align: center;
  }
  .hub-title {
    font-family: var(--font-serif); font-style: italic; font-weight: 400;
    font-size: clamp(1.9rem, 7vw, 2.4rem);
    margin-bottom: 20px; color: #f5f0eb;
  }
  .hub-stats {
    display: flex; justify-content: center; gap: 0;
    margin-bottom: 24px;
  }
  .stat {
    flex: 1; max-width: 110px;
    display: flex; flex-direction: column; gap: 2px;
  }
  .stat strong {
    font-size: 1.15rem; font-weight: 600; color: #f5f0eb;
  }
  .stat span {
    font-size: 0.72rem; color: #8a8580;
  }
  .hub-cta-row {
    display: flex; gap: 10px; align-items: center;
    margin-bottom: 28px;
  }
  .btn-cam {
    flex: 1;
    height: 52px;
    border-radius: 999px;
    border: none;
    background: #f0ebe3;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 12px rgba(0,0,0,0.25);
  }
  .btn-cam:active { transform: scale(0.98); }
  .btn-sq {
    width: 52px; height: 52px; flex-shrink: 0;
    border-radius: 14px;
    border: 1.5px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.06);
    color: #f5f0eb;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
  }
  .btn-sq:disabled { opacity: 0.4; }
  .hub-empty { padding: 32px 12px; }
  .empty-title { font-size: 0.95rem; color: #a8a29e; margin-bottom: 6px; }
  .empty-sub { font-size: 0.8rem; color: #5c5854; }
  .hub-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    margin-bottom: 16px;
  }
  .hub-thumb {
    aspect-ratio: 1;
    border-radius: 8px;
    overflow: hidden;
    background: #1a1a1a;
  }
  .hub-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .hub-album-link {
    display: inline-block;
    font-size: 0.85rem;
    color: #c4bfb8;
    margin-top: 8px;
  }

  /* Bottom sheets */
  .sheet-backdrop {
    position: fixed; inset: 0; z-index: 50;
    background: rgba(0,0,0,0.55);
    display: flex; align-items: flex-end; justify-content: center;
  }
  .sheet {
    width: 100%; max-width: 480px;
    background: #1c1c1c;
    border-radius: 20px 20px 0 0;
    padding: 12px 20px 32px;
    text-align: center;
  }
  .sheet-handle {
    width: 36px; height: 4px; border-radius: 2px;
    background: #444; margin: 0 auto 18px;
  }
  .sheet-title {
    font-family: var(--font-serif); font-style: italic;
    font-weight: 400; font-size: 1.45rem;
    color: #f5f0eb; margin-bottom: 8px;
  }
  .sheet-sub {
    font-size: 0.85rem; color: #8a8580;
    line-height: 1.45; margin-bottom: 20px;
  }
  .qr-wrap {
    display: inline-block;
    padding: 12px;
    background: #fff;
    border-radius: 16px;
    margin-bottom: 20px;
  }
  .qr-wrap img { display: block; border-radius: 4px; }
  .sheet-actions {
    display: flex; gap: 10px;
  }
  .sheet-btn {
    flex: 1;
    padding: 12px 10px;
    border-radius: 999px;
    border: 1.5px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.06);
    color: #f5f0eb;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    display: flex; align-items: center; justify-content: center;
  }
  .upload-icon-wrap {
    width: 48px; height: 48px; border-radius: 12px;
    background: rgba(255,255,255,0.08);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 12px;
    color: #c4bfb8;
  }
  .upload-opt {
    display: flex; align-items: flex-start; gap: 12px;
    text-align: left;
    padding: 14px 16px;
    border-radius: 14px;
    border: 1.5px solid rgba(255,255,255,0.14);
    margin-bottom: 16px;
  }
  .upload-opt strong { display: block; font-size: 0.9rem; color: #f5f0eb; }
  .upload-opt span { font-size: 0.78rem; color: #8a8580; }
  .radio-on {
    width: 18px; height: 18px; border-radius: 50%;
    border: 5px solid #f0ebe3; margin-top: 2px; flex-shrink: 0;
  }
  .sheet-cancel {
    margin-top: 14px;
    background: none; border: none;
    color: #8a8580; font-size: 0.9rem; cursor: pointer;
  }

  .reveal-block {
    text-align: center;
    margin: 18px 0 14px;
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
    font-size: clamp(1.9rem, 8vw, 2.5rem);
    color: #f5f0eb;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }
  .hub-polaroid-row {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding: 4px 2px 12px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .hub-polaroid-row::-webkit-scrollbar { display: none; }
  .hub-polaroid {
    flex: 0 0 168px;
    background: #f7f4ef;
    padding: 8px 8px 10px;
    border-radius: 2px;
    box-shadow: 0 6px 22px rgba(0,0,0,0.4);
    text-decoration: none;
    color: inherit;
  }
  .hub-polaroid-inner {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    background: #1a1a1a;
  }
  .hub-polaroid-inner img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .hub-polaroid-inner img.blurred {
    filter: blur(14px) brightness(0.62);
    transform: scale(1.1);
  }
  .hub-lock {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: rgba(255,255,255,0.92);
    background: rgba(0,0,0,0.12);
    pointer-events: none;
  }
  .hub-lock-ico {
    width: 18px;
    height: 18px;
    opacity: 0.9;
  }
  .hub-lock-time {
    font-size: 0.65rem;
    font-weight: 500;
    letter-spacing: 0.03em;
  }
  .hub-polaroid-cap {
    text-align: center;
    margin-top: 8px;
    padding: 0 2px;
  }
  .hub-pol-title {
    font-family: "Cormorant Garamond", var(--font-serif), Georgia, serif;
    font-style: italic;
    font-weight: 500;
    font-size: 1.25rem;
    color: #1a1a1a;
    line-height: 1.15;
  }
  .hub-pol-tag {
    font-size: 0.6rem;
    color: #a8a29e;
    margin-top: 2px;
  }
  .hub-pol-date {
    font-size: 0.6rem;
    color: #a8a29e;
    margin-top: 1px;
  }
`;
