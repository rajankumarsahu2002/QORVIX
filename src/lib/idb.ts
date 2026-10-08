// Primary persistence: IndexedDB (`qorvix-db` kv store, §65). LocalStorage is only
// a fallback + one-time promotion path for data written before the migration.
import { openDB } from 'idb';
import type { StateStorage } from 'zustand/middleware';

const DB = 'qorvix-db';
export async function getDb() {
  return openDB(DB, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
    },
  });
}
export async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put('kv', value, key);
}
export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return (await db.get('kv', key)) as T | undefined;
}

/** Zustand persist storage backed by IndexedDB, promoted once from LocalStorage. */
export const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const v = await idbGet<string>(name);
      if (v != null) return v;
    } catch {
      /* fall through to legacy */
    }
    try {
      const legacy = localStorage.getItem(name);
      if (legacy != null) {
        await idbSet(name, legacy); // promote, then read from IDB forever
        return legacy;
      }
    } catch {
      /* ignore */
    }
    return null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await idbSet(name, value);
      return;
    } catch {
      /* fall through */
    }
    try {
      localStorage.setItem(name, value);
    } catch {
      /* ignore */
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      const db = await getDb();
      await db.delete('kv', name);
    } catch {
      /* ignore */
    }
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};
