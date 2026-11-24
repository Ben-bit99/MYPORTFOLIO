/**
 * Guestbook ("memories") storage.
 *
 *  - Upstash Redis (REST) when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *    (or Vercel KV's KV_REST_API_URL + KV_REST_API_TOKEN) are set → works on
 *    Vercel / any serverless host. Free tier is plenty.
 *  - Local JSON file (.data/memories.json) otherwise → works for `npm run dev`
 *    and any normal Node server (VPS, Render, Railway…).
 *  - On Vercel without Redis the filesystem is read-only, so the store reports
 *    "unconfigured" and the UI explains that the guestbook isn't enabled yet.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

export type Memory = {
  id: string;
  name: string;
  location: string;
  message: string;
  createdAt: string;
};

export interface MemoryStore {
  readonly kind: "redis" | "file" | "none";
  list(limit: number): Promise<Memory[]>;
  add(m: Memory): Promise<void>;
  remove(id: string): Promise<boolean>;
}

const KEY = "awr:memories";
const MAX_STORED = 1000;

class RedisStore implements MemoryStore {
  readonly kind = "redis" as const;
  constructor(private url: string, private token: string) {}
  private async cmd<T>(...args: (string | number)[]): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Redis ${args[0]} failed: ${res.status}`);
    return ((await res.json()) as { result: T }).result;
  }
  async list(limit: number) {
    const rows = await this.cmd<string[]>("LRANGE", KEY, 0, limit - 1);
    return rows.flatMap((r) => {
      try {
        return [JSON.parse(r) as Memory];
      } catch {
        return [];
      }
    });
  }
  async add(m: Memory) {
    await this.cmd("LPUSH", KEY, JSON.stringify(m));
    await this.cmd("LTRIM", KEY, 0, MAX_STORED - 1);
  }
  async remove(id: string) {
    const rows = await this.cmd<string[]>("LRANGE", KEY, 0, MAX_STORED);
    const hit = rows.find((r) => r.includes(`"id":"${id}"`));
    if (!hit) return false;
    await this.cmd("LREM", KEY, 1, hit);
    return true;
  }
}

class FileStore implements MemoryStore {
  readonly kind = "file" as const;
  private chain: Promise<unknown> = Promise.resolve();
  constructor(private file: string) {}
  private async read(): Promise<Memory[]> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8")) as Memory[];
    } catch {
      return [];
    }
  }
  private write(rows: Memory[]) {
    // serialise writes so concurrent posts can't clobber each other
    this.chain = this.chain.then(async () => {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(rows, null, 2));
      await fs.rename(tmp, this.file);
    });
    return this.chain;
  }
  async list(limit: number) {
    return (await this.read()).slice(0, limit);
  }
  async add(m: Memory) {
    const rows = await this.read();
    rows.unshift(m);
    await this.write(rows.slice(0, MAX_STORED));
  }
  async remove(id: string) {
    const rows = await this.read();
    const next = rows.filter((r) => r.id !== id);
    if (next.length === rows.length) return false;
    await this.write(next);
    return true;
  }
}

class NoStore implements MemoryStore {
  readonly kind = "none" as const;
  async list() {
    return [];
  }
  async add() {
    throw new Error("Guestbook storage is not configured.");
  }
  async remove() {
    return false;
  }
}

let store: MemoryStore | null = null;

export function getMemoryStore(): MemoryStore {
  if (store) return store;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) store = new RedisStore(url.replace(/\/$/, ""), token);
  else if (process.env.VERCEL) store = new NoStore();
  else store = new FileStore(process.env.MEMORIES_FILE || path.join(process.cwd(), ".data", "memories.json"));
  return store;
}
