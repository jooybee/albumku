import { useState, useEffect, useMemo } from 'react';
import { EVENT_CONFIG } from '../lib/config';
import Camera from './Camera';
import { getPhotoCount } from '../lib/storage';

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

export default function JoinScreen() {
  const [name, setName] = useState('');
  const [step, setStep] = useState<'join' | 'camera'>('join');
  const [count, setCount] = useState(0);
  const [remaining, setRemaining] = useState(formatRemaining(EVENT_CONFIG.endsAt));

  useEffect(() => {
    const saved = localStorage.getItem('guest_name');
    if (saved) setName(saved);
  }, []);

  useEffect(() => {
    if (!EVENT_CONFIG.endsAt) return;
    const t = setInterval(() => setRemaining(formatRemaining(EVENT_CONFIG.endsAt)), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (step === 'camera' && name) {
      getPhotoCount(name).then(setCount).catch(() => {});
    }
  }, [step, name]);

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem('guest_name', trimmed);
    setStep('camera');
  }

  if (step === 'camera') {
    return (
      <Camera
        guestName={name.trim()}
        initialCount={count}
        onBack={() => setStep('join')}
      />
    );
  }

  // —— Join screen (mirip satualbum /events/...) ——
  return (
    <div className="join-page">
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

      <p className="support">
        Tanpa login · Foto bersama di album
      </p>

      <style>{`
        .join-page {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 20px 40px;
          position: relative;
          background: #0a0a0a;
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
        }
        .join-content {
          width: 100%;
          max-width: 360px;
          text-align: center;
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
          margin-bottom: 28px;
        }
        .pill-icon {
          font-size: 0.8rem;
          opacity: 0.8;
        }
        .event-title {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(2.4rem, 9vw, 3.2rem);
          line-height: 1.15;
          letter-spacing: -0.02em;
          color: #f5f0eb;
          margin-bottom: 20px;
        }
        .meta-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 16px;
          margin-bottom: 32px;
          font-size: 0.85rem;
          color: #8a8580;
        }
        .meta-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .meta-icon {
          font-size: 0.9rem;
          opacity: 0.7;
        }
        .join-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .input-wrap {
          position: relative;
        }
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
          position: absolute;
          bottom: 20px;
          font-size: 0.75rem;
          color: #5c5854;
        }
        .support a {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
