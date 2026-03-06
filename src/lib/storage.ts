import { logger } from "./logger";

export function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    logger.warn("localStorage read failed", { data: { key } });
    return fallback;
  }
}

export function safeSet(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    logger.warn("localStorage write failed", { data: { key } });
    return false;
  }
}

export function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    logger.warn("localStorage remove failed", { data: { key } });
  }
}
