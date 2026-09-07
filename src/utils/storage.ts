import { get, set, del } from 'idb-keyval';

export async function saveItem<T>(key: string, value: T): Promise<void> {
  try {
    await set(key, value);
  } catch {
    // fallback to localStorage
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }
}

export async function getItem<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const val = await get<T>(key);
    if (val !== undefined && val !== null) {
      return val;
    }
  } catch {
    // fallback to localStorage
  }

  try {
    const local = localStorage.getItem(key);
    if (local !== null) {
      return JSON.parse(local) as T;
    }
  } catch (e) {
    console.error('Storage read error:', e);
  }

  return defaultValue;
}

export async function removeItem(key: string): Promise<void> {
  try {
    await del(key);
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function getTodayDateKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

