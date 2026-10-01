export class TtlCache<K, V> {
  private readonly values = new Map<K, { expiresAt: number; value: V }>();
  private readonly pending = new Map<K, Promise<V>>();
  private readonly generations = new Map<K, number>();

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

  delete(key: K) {
    this.values.delete(key);
    this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
  }

  async getOrSet(key: K, loader: () => Promise<V>) {
    const cached = this.get(key);
    if (cached) return cached;
    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight;
    const generation = this.generations.get(key) ?? 0;
    const promise = loader().then((value) => {
      if ((this.generations.get(key) ?? 0) === generation) this.set(key, value);
      return value;
    }).finally(() => {
      if (this.pending.get(key) === promise) this.pending.delete(key);
    });
    this.pending.set(key, promise);
    return promise;
  }
}
