/**
 * IndexedDB — foto disimpan lokal per tamu (nama).
 * Tidak butuh server / login.
 */

const DB_NAME = 'satualbum-personal';
const STORE = 'photos';
const DB_VERSION = 1;

export interface StoredPhoto {
  id: string;
  guestName: string;
  dataUrl: string;
  presetId: string;
  presetName: string;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('guestName', 'guestName', { unique: false });
      }
    };
  });
}

export async function savePhoto(photo: StoredPhoto): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(photo);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllPhotos(): Promise<StoredPhoto[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const list = (req.result as StoredPhoto[]).sort((a, b) => a.createdAt - b.createdAt);
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getPhotoCount(guestName?: string): Promise<number> {
  const photos = await getAllPhotos();
  if (guestName) {
    return photos.filter((p) => p.guestName === guestName).length;
  }
  return photos.length;
}

export async function clearAllPhotos(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
