import { OfflineMediaMeta } from '../types';

const DB_NAME = 'mycloud_cinema_offline_db';
const DB_VERSION = 1;
const BLOB_STORE = 'video_blobs';
const META_STORE = 'video_meta';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported on this browser'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE, { keyPath: 'mediaId' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'mediaId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineMedia(meta: OfflineMediaMeta, blob: Blob): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([BLOB_STORE, META_STORE], 'readwrite');
    const blobStore = tx.objectStore(BLOB_STORE);
    const metaStore = tx.objectStore(META_STORE);

    blobStore.put({ mediaId: meta.mediaId, blob, size: blob.size });
    metaStore.put(meta);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Transaction aborted'));
  });
}

export async function getOfflineMediaBlob(mediaId: string): Promise<Blob | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readonly');
    const store = tx.objectStore(BLOB_STORE);
    const request = store.get(mediaId);

    request.onsuccess = () => {
      if (request.result && request.result.blob) {
        resolve(request.result.blob as Blob);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function isMediaDownloaded(mediaId: string): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      const req = store.get(mediaId);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function getAllOfflineMedia(): Promise<OfflineMediaMeta[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve((request.result as OfflineMediaMeta[]) || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

export async function deleteOfflineMedia(mediaId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([BLOB_STORE, META_STORE], 'readwrite');
    tx.objectStore(BLOB_STORE).delete(mediaId);
    tx.objectStore(META_STORE).delete(mediaId);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getStorageQuotaInfo(): Promise<{ usedBytes: number; quotaBytes: number; percentage: number }> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usedBytes = estimate.usage || 0;
      const quotaBytes = estimate.quota || 1;
      const percentage = Math.min(100, Math.round((usedBytes / quotaBytes) * 100));
      return { usedBytes, quotaBytes, percentage };
    } catch {
      // fallback
    }
  }
  return { usedBytes: 0, quotaBytes: 0, percentage: 0 };
}

export async function clearAllOfflineMedia(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([BLOB_STORE, META_STORE], 'readwrite');
    tx.objectStore(BLOB_STORE).clear();
    tx.objectStore(META_STORE).clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

