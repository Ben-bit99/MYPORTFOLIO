import { contactRequestSchema, fieldErrors } from "@/lib/contact/schema";
import { mailerConfigured, sendContactEmail } from "@/lib/contact/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 16_000; // bytes
const MIN_FILL_MS = 2500; // humans take longer than this to fill the form

function json(status: number, data: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

/* Per-IP rate limit (in-memory, per server instance). */
const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const win = 10 * 60_000;
  const max = Number(process.env.CONTACT_PER_10_MIN) || 3;
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < win);
  hits.set(ip, recent);
  if (recent.length >= max) return Math.ceil((win - (now - recent[0])) / 1000);
  recent.push(now);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < win)) hits.delete(k);
  return 0;
}

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";

  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return json(415, { error: "Unsupported request." });
  const raw = await req.text();
  if (raw.length > MAX_BODY) return json(413, { error: "Your message is too long." });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "Invalid request." });
  }

  const parsed = contactRequestSchema.safeParse(body);
  if (!parsed.success) return json(422, { error: "Please fix the highlighted fields.", fields: fieldErrors(parsed.error) });
  const { website, startedAt, ...message } = parsed.data;

  // Spam traps: pretend success so bots learn nothing.
  if (website) return json(200, { ok: true });
  if (startedAt && Date.now() - startedAt < MIN_FILL_MS) return json(200, { ok: true });

  const wait = rateLimited(ip);
  if (wait) {
    return json(429, { error: `You've sent a few messages already. Please try again in ${Math.ceil(wait / 60)} min.` }, { "Retry-After": String(wait) });
  }

  if (!mailerConfigured()) {
    console.error("[contact] Email is not configured. Set SMTP_* (or RESEND_API_KEY) in .env.local — see .env.example.");
    return json(503, { error: "The contact form isn't configured yet. Please email me directly instead." });
  }

  try {
    const { id } = await sendContactEmail(message, {
      ip,
      userAgent: (req.headers.get("user-agent") ?? "").slice(0, 200),
      receivedAt: new Date().toISOString(),
    });
    console.info(`[contact] delivered message ${id}`);
    return json(200, { ok: true });
  } catch (err) {
    // Log details server-side only; never echo transport errors (they can reveal config) to the client.
    console.error("[contact] send failed:", (err as Error).message);
    return json(502, { error: "Your message couldn't be sent right now. Please try again, or email me directly." });
  }
}
