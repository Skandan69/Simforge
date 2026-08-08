export class TtlCache<K, V> {
  private readonly values = new Map<K, { expiresAt: number; value: V }>();
  private readonly pending = new Map<K, Promise<V>>();

  constructor(private readonly ttlMs: number, private readonly maxEntries = 1_000) {}

  get(key: K) {
    const cached = this.values.get(key);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
      this.values.delete(key);
      return null;
    }
    return cached.value;
  }

  set(key: K, value: V) {
    if (this.values.size >= this.maxEntries) {
      const oldestKey = this.values.keys().next().value as K | undefined;
      if (oldestKey !== undefined) this.values.delete(oldestKey);
    }
    this.values.set(key, { expiresAt: Date.now() + this.ttlMs, value });
  }

  async getOrSet(key: K, loader: () => Promise<V>) {
    const cached = this.get(key);
    if (cached) return cached;
    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight;
    const promise = loader().then((value) => {
      this.set(key, value);
      return value;
    }).finally(() => {
      this.pending.delete(key);
    });
    this.pending.set(key, promise);
    return promise;
  }
}
