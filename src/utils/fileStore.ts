// Keeps the video / annotation files across page reloads (File objects can't go in localStorage).
const DB_NAME = 'mahesh_annotator_files_v1';
const STORE = 'files';

export interface StoredFiles {
  video?: File;
  xml?: File;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function saveFiles(id: string, files: StoredFiles): Promise<void> {
  try {
    const existing = (await run<StoredFiles | undefined>('readonly', (s) => s.get(id))) || {};
    await run('readwrite', (s) => s.put({ ...existing, ...files }, id));
  } catch (err) {
    console.warn('Could not store files for reload:', err);
  }
}

export async function loadFiles(id: string): Promise<StoredFiles> {
  try {
    return (await run<StoredFiles | undefined>('readonly', (s) => s.get(id))) || {};
  } catch {
    return {};
  }
}

export async function deleteFiles(id: string): Promise<void> {
  try {
    await run('readwrite', (s) => s.delete(id));
  } catch {
    /* ignore */
  }
}

export async function clearAllFiles(): Promise<void> {
  try {
    await run('readwrite', (s) => s.clear());
  } catch {
    /* ignore */
  }
}
