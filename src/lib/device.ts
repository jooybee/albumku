/**
 * Identitas perangkat (bukan nama) untuk batas foto.
 * Disimpan di localStorage agar stabil per browser/HP.
 */

const DEVICE_KEY = 'albumku_device_id';
const COUNT_KEY = 'albumku_device_photo_count';

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = uid();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return uid();
  }
}

export function getDevicePhotoCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const n = parseInt(localStorage.getItem(COUNT_KEY) || '0', 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function incrementDevicePhotoCount(): number {
  const next = getDevicePhotoCount() + 1;
  try {
    localStorage.setItem(COUNT_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function setDevicePhotoCount(n: number): void {
  try {
    localStorage.setItem(COUNT_KEY, String(Math.max(0, n)));
  } catch {
    /* ignore */
  }
}

/** Reset kuota foto perangkat ini (seolah belum pernah upload) */
export function resetDevicePhotoCount(): void {
  try {
    localStorage.setItem(COUNT_KEY, '0');
  } catch {
    /* ignore */
  }
}

/** Hapus ID perangkat + kuota (device baru) */
export function resetDeviceIdentity(): void {
  try {
    localStorage.removeItem(DEVICE_KEY);
    localStorage.removeItem(COUNT_KEY);
  } catch {
    /* ignore */
  }
}
