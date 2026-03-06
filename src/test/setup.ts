import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// Node.js 25+ ships a built-in localStorage that requires --localstorage-file.
// Without it, methods like getItem/setItem are undefined and break jsdom's own
// localStorage. We replace globalThis.localStorage with a proper in-memory
// implementation to ensure tests work reliably.
const store: Record<string, string> = {};
const memoryStorage: Storage = {
  getItem(key: string) {
    return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
  },
  setItem(key: string, value: string) {
    store[key] = String(value);
  },
  removeItem(key: string) {
    delete store[key];
  },
  clear() {
    for (const k of Object.keys(store)) delete store[k];
  },
  key(index: number) {
    return Object.keys(store)[index] ?? null;
  },
  get length() {
    return Object.keys(store).length;
  },
};
Object.defineProperty(globalThis, "localStorage", {
  value: memoryStorage,
  writable: true,
  configurable: true,
});

// jsdom doesn't implement scrollIntoView
if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = () => {};
}

afterEach(() => {
  memoryStorage.clear();
  document.documentElement.lang = "";
  document.documentElement.removeAttribute("data-theme");
});
