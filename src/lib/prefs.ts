/**
 * Shared localStorage helpers. Everything the site remembers (language,
 * recent tools) lives in the browser under the "rlt:" key prefix —
 * nothing ever leaves the device.
 */
const PREFIX = 'rlt:';

export function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable (private mode, quota) — remembering is best-effort.
  }
}

const RECENT_KEY = 'recent';
const RECENT_MAX = 8;

export function pushRecent(slug: string): void {
  const list = read<string[]>(RECENT_KEY, []).filter((s) => s !== slug);
  list.unshift(slug);
  write(RECENT_KEY, list.slice(0, RECENT_MAX));
}
