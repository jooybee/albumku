import { useState, useEffect } from 'react';
import {
  loadSettings,
  saveSettings,
  resetSettings,
  checkHostPin,
  type EventSettings,
} from '../lib/settings';

export default function Settings() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [s, setS] = useState<EventSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('albumku_host') === '1') {
      setUnlocked(true);
      setS(loadSettings());
    }
  }, []);

  function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (checkHostPin(pin)) {
      sessionStorage.setItem('albumku_host', '1');
      setUnlocked(true);
      setS(loadSettings());
      setPinError(false);
    } else {
      setPinError(true);
    }
  }

  function update<K extends keyof EventSettings>(key: K, value: EventSettings[K]) {
    if (!s) return;
    const next = { ...s, [key]: value };
    setS(next);
  }

  function handleSave() {
    if (!s) return;
    saveSettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    if (!confirm('Kembalikan semua pengaturan ke default (config.ts)?')) return;
    setS(resetSettings());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!unlocked) {
    return (
      <div className="set-page">
        <a href="/" className="back">← Kembali</a>
        <h1 className="set-title">Pengaturan Acara</h1>
        <p className="set-sub">Masukkan PIN host untuk mengubah pengaturan.</p>
        <form onSubmit={unlock} className="pin-form">
          <input
            type="password"
            inputMode="numeric"
            className="input-dark"
            style={{ paddingLeft: 18 }}
            placeholder="PIN host"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            maxLength={12}
          />
          {pinError && <p className="err">PIN salah</p>}
          <button type="submit" className="btn-primary">Buka pengaturan</button>
        </form>
        <p className="hint">PIN default ada di <code>src/lib/config.ts</code> → <code>hostPin</code></p>
        <style>{baseCss}</style>
      </div>
    );
  }

  if (!s) return null;

  return (
    <div className="set-page">
      <a href="/" className="back">← Kembali</a>
      <h1 className="set-title">Pengaturan Acara</h1>

      <div className="set-list">
        {/* Nama */}
        <label className="set-row col">
          <span className="set-label">✏️ Nama acara</span>
          <input
            className="set-input"
            value={s.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </label>

        <label className="set-row col">
          <span className="set-label">👤 Nama host</span>
          <input
            className="set-input"
            value={s.hostName}
            onChange={(e) => update('hostName', e.target.value)}
          />
        </label>

        <label className="set-row col">
          <span className="set-label">🖼️ Sampul (path, pisah koma)</span>
          <input
            className="set-input"
            value={s.coverImages.join(', ')}
            onChange={(e) =>
              update(
                'coverImages',
                e.target.value.split(',').map((x) => x.trim()).filter(Boolean)
              )
            }
            placeholder="/covers/cover1.jpg"
          />
          <span className="set-help">File ditaruh di public/covers/ lalu tulis path-nya</span>
        </label>

        <label className="set-row col">
          <span className="set-label">📅 Tanggal berakhir</span>
          <input
            type="datetime-local"
            className="set-input"
            value={s.endsAt ? toLocalInput(s.endsAt) : ''}
            onChange={(e) =>
              update('endsAt', e.target.value ? new Date(e.target.value).toISOString() : null)
            }
          />
        </label>

        <label className="set-row col">
          <span className="set-label">🕐 Waktu ungkap album</span>
          <input
            type="datetime-local"
            className="set-input"
            value={s.revealAt ? toLocalInput(s.revealAt) : ''}
            onChange={(e) =>
              update('revealAt', e.target.value ? new Date(e.target.value).toISOString() : null)
            }
          />
          <span className="set-help">Kosongkan = album selalu terbuka. Isi = foto baru terlihat setelah waktu ini.</span>
        </label>

        <label className="set-row col">
          <span className="set-label">📷 Foto per orang</span>
          <input
            type="number"
            min={1}
            max={50}
            className="set-input"
            value={s.maxPhotosPerGuest}
            onChange={(e) => update('maxPhotosPerGuest', Math.max(1, Number(e.target.value) || 1))}
          />
          <span className="set-help">Batas foto per nama tamu. Default dari config.ts.</span>
        </label>

        <label className="set-row col">
          <span className="set-label">👥 Kapasitas tamu (info)</span>
          <input
            type="number"
            min={1}
            className="set-input"
            value={s.maxGuests}
            onChange={(e) => update('maxGuests', Math.max(1, Number(e.target.value) || 1))}
          />
        </label>

        <label className="set-row col">
          <span className="set-label">🌐 Bahasa default</span>
          <select
            className="set-input"
            value={s.language}
            onChange={(e) => update('language', e.target.value as 'id' | 'en')}
          >
            <option value="id">Bahasa Indonesia</option>
            <option value="en">English</option>
          </select>
        </label>

        <Toggle
          icon="👁"
          title="Semua orang bisa melihat semua foto"
          desc="Aktif: siapa pun dengan link lihat semua momen. Nonaktif: setiap tamu hanya lihat fotonya sendiri."
          on={s.publicAlbum}
          onChange={(v) => update('publicAlbum', v)}
        />

        <Toggle
          icon="🚫"
          title="Sembunyikan nama pengunggah"
          desc="Nama tamu disembunyikan di galeri (penjurian buta)."
          on={s.hideUploaderName}
          onChange={(v) => update('hideUploaderName', v)}
        />

        <Toggle
          icon="♥"
          title="Like foto"
          desc="Tamu bisa menyukai setiap foto. Nonaktifkan untuk menyembunyikan tombol like."
          on={s.enableLikes}
          onChange={(v) => update('enableLikes', v)}
        />
      </div>

      <button className="btn-primary" onClick={handleSave} style={{ marginTop: 20 }}>
        {saved ? '✓ Tersimpan' : 'Simpan pengaturan'}
      </button>
      <button className="btn-outline" onClick={handleReset} style={{ marginTop: 10 }}>
        Reset ke default
      </button>

      <p className="hint" style={{ marginTop: 20 }}>
        Pengaturan disimpan di perangkat ini (localStorage). Untuk nama/batas permanen di semua perangkat, ubah juga <code>src/lib/config.ts</code> lalu deploy ulang.
      </p>

      <style>{baseCss}</style>
    </div>
  );
}

function Toggle({
  icon, title, desc, on, onChange,
}: {
  icon: string; title: string; desc: string; on: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button type="button" className="set-row toggle" onClick={() => onChange(!on)}>
      <div className="toggle-text">
        <span className="set-label">{icon} {title}</span>
        <span className="set-help">{desc}</span>
      </div>
      <span className={`switch ${on ? 'on' : ''}`} />
    </button>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const baseCss = `
  .set-page {
    min-height: 100dvh;
    background: #0a0a0a;
    color: #f5f0eb;
    padding: 20px 16px 48px;
    max-width: 440px;
    margin: 0 auto;
  }
  .back { color: #8a8580; font-size: 0.9rem; }
  .set-title {
    font-family: var(--font-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 1.85rem;
    margin: 16px 0 8px;
  }
  .set-sub { color: #8a8580; font-size: 0.9rem; margin-bottom: 20px; }
  .pin-form { display: flex; flex-direction: column; gap: 12px; }
  .err { color: #fca5a5; font-size: 0.85rem; }
  .hint { font-size: 0.75rem; color: #5c5854; margin-top: 16px; line-height: 1.4; }
  .hint code { color: #a8a29e; }
  .set-list { display: flex; flex-direction: column; gap: 10px; }
  .set-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    background: #141414;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    text-align: left;
    color: inherit;
    width: 100%;
    cursor: default;
  }
  .set-row.col { flex-direction: column; align-items: stretch; }
  .set-row.toggle { cursor: pointer; }
  .set-label { font-size: 0.9rem; font-weight: 500; }
  .set-help { font-size: 0.75rem; color: #8a8580; margin-top: 4px; display: block; line-height: 1.35; }
  .set-input {
    margin-top: 8px;
    width: 100%;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.12);
    background: #1c1c1c;
    color: #f5f0eb;
    font-size: 0.9rem;
  }
  .toggle-text { flex: 1; }
  .switch {
    width: 48px; height: 28px; border-radius: 999px;
    background: #333; position: relative; flex-shrink: 0;
    transition: background 0.2s;
  }
  .switch::after {
    content: '';
    position: absolute; top: 3px; left: 3px;
    width: 22px; height: 22px; border-radius: 50%;
    background: #f0ebe3;
    transition: transform 0.2s;
  }
  .switch.on { background: #3b82f6; }
  .switch.on::after { transform: translateX(20px); }
`;
 