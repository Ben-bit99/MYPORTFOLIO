/**
 * Minimal BM25 keyword scorer with a tokenizer that keeps technical tokens
 * intact ("c#", "c++", "node.js", "power bi") so exact terms rank reliably.
 */

const STOP = new Set(
  "a an and are as at be by can did do does for from has have he his how i in is it its me my of on or our tell that the their them this to was what when where which who why with you your about abdul wahib rao wahib's abdul's".split(
    " ",
  ),
);

/** Query-side expansions for common shorthand. */
const SYNONYMS: Record<string, string[]> = {
  vr: ["virtual", "reality", "xr"],
  ar: ["augmented", "reality", "xr"],
  xr: ["vr", "ar"],
  gamejam: ["game", "jam"],
  ggj: ["global", "game", "jam"],
  ned: ["university", "education"],
  university: ["education", "degree"],
  study: ["education", "degree"],
  studying: ["education", "degree"],
  degree: ["education"],
  gpa: ["cgpa"],
  cgpa: ["education"],
  stack: ["skills", "tech"],
  skills: ["stack"],
  hire: ["contact", "email"],
  reach: ["contact", "email"],
  email: ["contact"],
  phone: ["contact"],
  award: ["prize", "achievement"],
  awards: ["prize", "achievement"],
  achieve: ["award", "prize"],
  achievement: ["award", "prize"],
  achievements: ["award", "prize"],
  win: ["prize", "award"],
  won: ["prize", "award"],
  games: ["game"],
  projects: ["project"],
  unity: ["c#"],
  quest: ["meta"],
  oculus: ["meta"],
  js: ["javascript"],
  node: ["node.js"],
  nodejs: ["node.js"],
  powerbi: ["power", "bi"],
};

export function tokenize(text: string, expand = false): string[] {
  const raw =
    text
      .toLowerCase()
      .replace(/’/g, "'")
      .match(/[a-z0-9][a-z0-9#+.]*[a-z0-9#+]|[a-z0-9]/g) ?? [];
  const out: string[] = [];
  for (const t of raw) {
    const tok = t.replace(/'s$/, "");
    if (STOP.has(tok)) continue;
    out.push(tok);
    // Also index "node.js" as "node" etc.
    if (tok.includes(".") && !/^\d/.test(tok)) out.push(...tok.split(".").filter(Boolean));
    if (expand && SYNONYMS[tok]) out.push(...SYNONYMS[tok]);
  }
  return out;
}

export class BM25 {
  private docs: string[][];
  private df = new Map<string, number>();
  private avgdl: number;
  constructor(texts: string[], private k1 = 1.4, private b = 0.7) {
    this.docs = texts.map((t) => tokenize(t));
    for (const d of this.docs) for (const term of new Set(d)) this.df.set(term, (this.df.get(term) ?? 0) + 1);
    this.avgdl = this.docs.reduce((s, d) => s + d.length, 0) / Math.max(1, this.docs.length);
  }
  score(query: string): number[] {
    const q = Array.from(new Set(tokenize(query, true)));
    const N = this.docs.length;
    return this.docs.map((d) => {
      if (!d.length) return 0;
      const tf = new Map<string, number>();
      for (const t of d) tf.set(t, (tf.get(t) ?? 0) + 1);
      let s = 0;
      for (const term of q) {
        const f = tf.get(term);
        if (!f) continue;
        const n = this.df.get(term) ?? 0;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        s += idf * ((f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * d.length) / this.avgdl)));
      }
      return s;
    });
  }
}
