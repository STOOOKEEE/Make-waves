// Polyfill globalThis.localStorage for environments where Node 25+ ships an
// experimental stub without the Storage interface. Loaded as a vitest
// setupFile so it runs before any test (and before module imports trigger
// production code that touches `window.localStorage`).

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key(index: number): string | null;
  readonly length: number;
}

class MemoryStorage implements StorageLike {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  get length(): number {
    return this.store.size;
  }
}

const isWorking = (s: unknown): s is StorageLike =>
  typeof s === "object" &&
  s !== null &&
  typeof (s as { getItem?: unknown }).getItem === "function";

if (!isWorking(globalThis.localStorage)) {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: storage,
  });
}

interface WindowHost {
  window?: { localStorage?: unknown } | null;
}
const win = (globalThis as unknown as WindowHost).window;
if (win && !isWorking(win.localStorage)) {
  Object.defineProperty(win, "localStorage", {
    configurable: true,
    writable: true,
    value: globalThis.localStorage,
  });
}