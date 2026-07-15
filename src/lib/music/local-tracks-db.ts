import "client-only";

/**
 * IndexedDB storage for user-imported MP3s (background music feature).
 * Deliberately device-local only — never sent to a Next.js API route,
 * Firestore, or Firebase Storage, and never included in the family JSON
 * backup (see src/lib/backup/export-family.ts, which never touches
 * this store).
 */

export type LocalTrackRecord = {
  id: string;
  displayName: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  addedAt: number;
  blob: Blob;
};

export type LocalTrackMeta = Omit<LocalTrackRecord, "blob">;

const DB_NAME = "listy-local-music";
const DB_VERSION = 1;
const STORE_NAME = "tracks";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addLocalTrack(record: LocalTrackRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listLocalTracks(): Promise<LocalTrackMeta[]> {
  const db = await openDb();
  const records = await new Promise<LocalTrackRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as LocalTrackRecord[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return records
    .map((record) => ({
      id: record.id,
      displayName: record.displayName,
      originalFileName: record.originalFileName,
      mimeType: record.mimeType,
      size: record.size,
      addedAt: record.addedAt,
    }))
    .sort((a, b) => a.addedAt - b.addedAt);
}

export async function getLocalTrackBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  const record = await new Promise<LocalTrackRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as LocalTrackRecord | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return record?.blob ?? null;
}

export async function deleteLocalTrack(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function countLocalTracks(): Promise<number> {
  const db = await openDb();
  const count = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return count;
}
