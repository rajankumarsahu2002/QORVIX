// Minimal IndexedDB helper (large imports) — Zustand persist uses localStorage for speed.
import { openDB } from 'idb';

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
