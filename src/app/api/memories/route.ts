import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getMemoryStore, type Memory } from "@/lib/memories/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIST_LIMIT = 120;

function json(status: number, data: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

/* ── Validation & light moderation ── */
const clean = (s: string) =>
  s
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F\u200B-\u200F\u2028-\u202E]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|xyz|ru|cn|top|info|biz|link|click|site|online|shop)\b|[\w.+-]+@[\w-]+\.[\w.]+)/i;
// Small, deliberately conservative list; extend via MEMORIES_BLOCKLIST="word1,word2".
const BLOCK = new Set(
  ["fuck", "shit", "bitch", "cunt", "nigger", "faggot", "retard", "porn", "casino", "crypto giveaway", "viagra"].concat(
    (process.env.MEMORIES_BLOCKLIST ?? "").split(",").map((w) => w.trim().toLowerCase()).filter(Boolean),
  ),
);
const hasBlocked = (s: string) => {
  const t = s.toLowerCase();
  for (const w of BLOCK) if (t.includes(w)) return true;
  return false;
};

const bodySchema = z.object({
  name: z.string().transform(clean).pipe(z.string().min(1, "Please add your name.").max(40, "Name is too long (40 max).")),
  location: z.string().optional().default("").transform(clean).pipe(z.string().max(40, "Location is too long (40 max).")),
  message: z.string().transform(clean).pipe(z.string().min(3, "Your memory is a little short.").max(280, "Please keep it under 280 characters.")),
  website: z.string().optional(), // honeypot: real visitors never fill this
});

/* ── Per-IP rate limit (in-memory, per instance) ── */
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const win = 10 * 60_000;
  const max = Number(process.env.MEMORIES_PER_10_MIN) || 3;
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < win);
  hits.set(ip, recent);
  if (recent.length >= max) return Math.ceil((win - (now - recent[0])) / 1000);
  recent.push(now);
  return 0;
}

const publicView = (m: Memory) => ({ id: m.id, name: m.name, location: m.location, message: m.message, createdAt: m.createdAt });

export async function GET() {
  const store = getMemoryStore();
  try {
    const items = await store.list(LIST_LIMIT);
    return json(200, { enabled: store.kind !== "none", items: items.map(publicView) });
  } catch (err) {
    console.error("[memories] list failed:", err);
    return json(200, { enabled: true, items: [], degraded: true });
  }
}

export async function POST(req: Request) {
  const store = getMemoryStore();
  if (store.kind === "none") {
    return json(503, { error: "The guestbook isn't switched on yet. Please check back soon." });
  }
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json(400, { error: "Invalid request." });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message ?? "Invalid memory." });
  const { name, location, message, website } = parsed.data;

  // Honeypot hit: pretend success, store nothing.
  if (website) return json(201, { ok: true, item: { id: randomUUID(), name, location, message, createdAt: new Date().toISOString() } });

  const wait = limited(ip);
  if (wait) return json(429, { error: `You've left a few memories already. Try again in ${Math.ceil(wait / 60)} min.` }, { "Retry-After": String(wait) });

  if (LINK.test(`${name} ${location} ${message}`)) return json(400, { error: "Links and emails aren't allowed in memories." });
  if (hasBlocked(`${name} ${location} ${message}`)) return json(400, { error: "Let's keep the room kind. Please rephrase." });

  try {
    const recent = await store.list(30);
    if (recent.some((r) => r.message.toLowerCase() === message.toLowerCase())) {
      return json(409, { error: "That memory is already in the room." });
    }
    const item: Memory = { id: randomUUID(), name, location, message, createdAt: new Date().toISOString() };
    await store.add(item);
    return json(201, { ok: true, item: publicView(item) });
  } catch (err) {
    console.error("[memories] add failed:", err);
    return json(500, { error: "Couldn't store your memory right now. Please try again." });
  }
}

/* ── Moderation ──
 * Production: requires header `x-admin-token` matching MEMORIES_ADMIN_TOKEN.
 * Local dev (`npm run dev`) with no token configured: allowed, so you can tidy up while testing.
 * `?verify=1` only checks the token (used by the "Moderate" unlock in the UI). */
function isAdmin(req: Request) {
  const token = process.env.MEMORIES_ADMIN_TOKEN;
  if (!token) return process.env.NODE_ENV !== "production";
  const given = req.headers.get("x-admin-token") ?? "";
  const h = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(h(given), h(token));
}

export async function DELETE(req: Request) {
  if (!isAdmin(req)) return json(401, { error: "Wrong moderator password." });
  const url = new URL(req.url);
  if (url.searchParams.get("verify")) return json(200, { ok: true });
  const id = url.searchParams.get("id");
  if (!id) return json(400, { error: "Missing id." });
  const ok = await getMemoryStore().remove(id);
  return json(ok ? 200 : 404, { ok });
}
