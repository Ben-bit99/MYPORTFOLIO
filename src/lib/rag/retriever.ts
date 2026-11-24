/**
 * Retriever layer.
 *
 * `LocalHybridRetriever` = cosine similarity over the JSON index (when it has
 * vectors) + BM25 keyword scoring. Both are min-max normalised and blended,
 * so exact technical terms ("Unity", "Meta SDK", "CEGA", "C#", "NED") always
 * rank even when vectors are fuzzy, and the retriever still works with no
 * embeddings at all.
 *
 * To move to Supabase pgvector / Upstash Vector later, implement the
 * `Retriever` interface in a new class and return it from `getRetriever()`.
 */
import indexData from "@/data/rag-index.json";
import { BM25 } from "./bm25";
import { buildPortfolioChunks, hashChunks } from "./chunks";
import type { IndexedChunk, RagIndex, RetrievedChunk, Retriever } from "./types";

const VECTOR_WEIGHT = 0.55;
const KEYWORD_WEIGHT = 0.45;

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

function normalise(xs: number[]): number[] {
  const max = Math.max(...xs);
  const min = Math.min(...xs);
  if (!isFinite(max) || max <= 0) return xs.map(() => 0);
  const span = max - min || max;
  return xs.map((x) => Math.max(0, (x - min) / span));
}

export class LocalHybridRetriever implements Retriever {
  private bm25: BM25;
  readonly supportsVectors: boolean;
  readonly embeddingInfo: RagIndex["embedding"];

  constructor(private chunks: IndexedChunk[], embedding: RagIndex["embedding"]) {
    this.bm25 = new BM25(chunks.map((c) => `${c.title}\n${c.title}\n${c.content}`));
    this.supportsVectors = !!embedding && chunks.every((c) => Array.isArray(c.embedding) && c.embedding.length);
    this.embeddingInfo = this.supportsVectors ? embedding : null;
  }

  async retrieve(query: string, opts: { k?: number; queryEmbedding?: number[] } = {}): Promise<RetrievedChunk[]> {
    const k = opts.k ?? 5;
    const kw = normalise(this.bm25.score(query));
    const useVec = this.supportsVectors && !!opts.queryEmbedding?.length;
    const vec = useVec
      ? normalise(this.chunks.map((c) => cosine(opts.queryEmbedding!, c.embedding!)))
      : this.chunks.map(() => 0);

    const scored = this.chunks.map((c, i) => {
      const score = useVec ? VECTOR_WEIGHT * vec[i] + KEYWORD_WEIGHT * kw[i] : kw[i];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { embedding, ...rest } = c;
      return { ...rest, score, vectorScore: vec[i], keywordScore: kw[i] };
    });

    return scored
      .filter((c) => c.score > 0.08)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}

let cached: { retriever: LocalHybridRetriever; stale: boolean } | null = null;

/**
 * Returns the singleton retriever. If the committed index is stale (portfolio.ts
 * changed but `npm run rag:index` wasn't re-run), it falls back to freshly built
 * portfolio chunks (keyword-only) + any knowledge-file chunks from the index,
 * so answers never use outdated facts.
 */
export function getRetriever(): { retriever: Retriever; stale: boolean } {
  if (cached) return cached;
  const index = indexData as unknown as RagIndex;
  const fresh = buildPortfolioChunks();
  const stale = !index?.chunks?.length || index.portfolioHash !== hashChunks(fresh);

  if (!stale) {
    cached = { retriever: new LocalHybridRetriever(index.chunks, index.embedding), stale };
  } else {
    const kb = (index?.chunks ?? []).filter((c) => c.section === "Knowledge");
    cached = { retriever: new LocalHybridRetriever([...fresh, ...kb], null), stale };
  }
  return cached;
}
