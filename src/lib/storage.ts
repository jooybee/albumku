/** 
 * Penyimpanan foto — cocok dengan skema Supabase lama:
 *   events (id uuid, ...)
 *   photos (id uuid, event_id, guest_name, storage_path, public_url, preset_id?, preset_name?)
 *
 * Fallback: IndexedDB jika Supabase / eventId belum di-setup.
 */

import { EVENT_CONFIG } from './config';
import { supabase, isCloudEnabled, type CloudPhoto } from './supabase';

export interface StoredPhoto {
  id: string;
  guestName: string;
  dataUrl?: string;
  publicUrl?: string;
  presetId: string;
  presetName: string;
  createdAt: number;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const useCloud = () =>
  isCloudEnabled && Boolean(EVENT_CONFIG.eventId);

// —— IndexedDB fallback ——
const DB_NAME = 'albumku';
const STORE = 'photos';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('guestName', 'guestName', { unique: false });
      }
    };
  });
}

async function localSave(photo: StoredPhoto): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(photo);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function localGetAll(): Promise<StoredPhoto[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      resolve(
        (req.result as StoredPhoto[]).sort((a, b) => a.createdAt - b.createdAt)
      );
    };
    req.onerror = () => reject(req.error);
  });
}

async function localCount(guestName?: string): Promise<number> {
  const all = await localGetAll();
  if (guestName) return all.filter((p) => p.guestName === guestName).length;
  return all.length;
}

// —— Cloud (skema existing) ——
async function cloudSave(
  guestName: string,
  blob: Blob,
  presetId: string,
  presetName: string
): Promise<StoredPhoto> {
  if (!supabase) throw new Error('Supabase not configured');
  const eventId = EVENT_CONFIG.eventId;
  if (!eventId) throw new Error('eventId belum diisi di config.ts');

  const fileId = uid();
  const path = `${eventId}/${fileId}.jpg`;

  const { error: upErr } = await supabase.storage
    .from('photos')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });

  if (upErr) throw upErr;

  const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path);

  const row: Record<string, unknown> = {
    event_id: eventId,
    guest_name: guestName,
    storage_path: path,
    public_url: urlData.publicUrl,
    preset_id: presetId,
    preset_name: presetName,
  };

  const { data, error: insErr } = await supabase
    .from('photos')
    .insert(row)
    .select('id, created_at')
    .single();

  if (insErr) throw insErr;

  return {
    id: data.id,
    guestName,
    publicUrl: urlData.publicUrl,
    presetId,
    presetName,
    createdAt: new Date(data.created_at).getTime(),
  };
}

async function cloudGetAll(): Promise<StoredPhoto[]> {
  if (!supabase || !EVENT_CONFIG.eventId) return [];

  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('event_id', EVENT_CONFIG.eventId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return ((data as CloudPhoto[]) || []).map((p) => ({
    id: p.id,
    guestName: p.guest_name,
    publicUrl: p.public_url,
    presetId: p.preset_id || 'funsaver',
    presetName: p.preset_name || 'Film',
    createdAt: new Date(p.created_at).getTime(),
  }));
}

async function cloudCount(guestName?: string): Promise<number> {
  if (!supabase || !EVENT_CONFIG.eventId) return 0;

  let q = supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', EVENT_CONFIG.eventId);

  if (guestName) q = q.eq('guest_name', guestName);

  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

// —— Public API ——
export { isCloudEnabled, useCloud };

export async function savePhoto(opts: {
  guestName: string;
  blob: Blob;
  dataUrl: string;
  presetId: string;
  presetName: string;
}): Promise<StoredPhoto> {
  if (useCloud()) {
    return cloudSave(opts.guestName, opts.blob, opts.presetId, opts.presetName);
  }
  const photo: StoredPhoto = {
    id: uid(),
    guestName: opts.guestName,
    dataUrl: opts.dataUrl,
    presetId: opts.presetId,
    presetName: opts.presetName,
    createdAt: Date.now(),
  };
  await localSave(photo);
  return photo;
}

export async function getAllPhotos(): Promise<StoredPhoto[]> {
  if (useCloud()) return cloudGetAll();
  return localGetAll();
}

export async function getPhotoCount(guestName?: string): Promise<number> {
  if (useCloud()) return cloudCount(guestName);
  return localCount(guestName);
}

export async function deletePhoto(id: string): Promise<void> {
  if (useCloud() && supabase) {
    await supabase.from('photos').delete().eq('id', id);
    return;
  }
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllPhotos(): Promise<void> {
  if (useCloud() && supabase && EVENT_CONFIG.eventId) {
    await supabase.from('photos').delete().eq('event_id', EVENT_CONFIG.eventId);
    return;
  }
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function photoSrc(p: StoredPhoto): string {
  return p.publicUrl || p.dataUrl || '';
}
