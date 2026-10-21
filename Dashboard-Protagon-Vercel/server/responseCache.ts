// Private, bounded, per-instance cache. Never persisted or sent to a CDN.
// Concurrent readers of an identical page share one in-flight database request.
export class ResponseCache {
  private entries = new Map<string, { body: string; expires: number; bytes: number }>();
  private pending = new Map<string, Promise<string>>();
  private bytes = 0;
  constructor(private maxBytes = 32 * 1024 * 1024, private now = Date.now) {}

  async read(key: string, load: () => Promise<{ body: string; expires: number }>): Promise<{ body: string; hit: boolean }> {
    const cached = this.entries.get(key);
    if (cached && cached.expires > this.now()) {
      this.entries.delete(key);
      this.entries.set(key, cached);
      return { body: cached.body, hit: true };
    }
    if (cached) this.remove(key);
    const pending = this.pending.get(key);
    if (pending) return { body: await pending, hit: true };
    const promise = (async () => {
      const value = await load();
      const bytes = Buffer.byteLength(value.body);
      if (value.expires > this.now() && bytes <= this.maxBytes) {
        for (const [oldKey, entry] of this.entries) if (entry.expires <= this.now()) this.remove(oldKey);
        while (this.bytes + bytes > this.maxBytes) this.remove(this.entries.keys().next().value!);
        this.entries.set(key, { ...value, bytes });
        this.bytes += bytes;
      }
      return value.body;
    })();
    this.pending.set(key, promise);
    try { return { body: await promise, hit: false }; }
    finally { this.pending.delete(key); }
  }

  private remove(key: string) {
    const value = this.entries.get(key);
    if (value) this.bytes -= value.bytes;
    this.entries.delete(key);
  }
}
