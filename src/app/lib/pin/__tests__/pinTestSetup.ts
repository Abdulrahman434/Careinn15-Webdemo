/* Browser globals the PIN modules expect, for running under plain node.
   Imported first by pin.test.ts so it runs before the modules under test. */

const target = new EventTarget();
(globalThis as any).window = target;

class MemoryStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
  entries() { return [...this.m.entries()]; }
}

export const testLocalStorage = new MemoryStorage();
export const testSessionStorage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", { value: testLocalStorage, configurable: true });
Object.defineProperty(globalThis, "sessionStorage", { value: testSessionStorage, configurable: true });

/** Every console call made while the modules run, for the "PIN never logged" check. */
export const consoleRecord: string[] = [];
for (const level of ["log", "info", "warn", "error", "debug"] as const) {
  const orig = console[level].bind(console);
  console[level] = (...args: unknown[]) => {
    consoleRecord.push(args.map(a => { try { return typeof a === "string" ? a : JSON.stringify(a); } catch { return String(a); } }).join(" "));
    orig(...args);
  };
}
