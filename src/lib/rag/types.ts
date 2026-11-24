export type ChunkSection =
  | "About"
  | "Contact"
  | "Education"
  | "Project"
  | "Other Project"
  | "Award"
  | "Skills"
  | "Timeline"
  | "Knowledge";

export type Chunk = {
  /** Stable id, e.g. "project:vr-tennis" */
  id: string;
  section: ChunkSection;
  /** Human label used for citation badges, e.g. "VR Tennis" */
  title: string;
  content: string;
  /** Optional in-page anchor the UI can scroll to when a badge is clicked */
  anchor?: string;
  /** Optional project slug, to open the project drawer from a citation */
  projectSlug?: string;
};

export type IndexedChunk = Chunk & { embedding?: number[] };

export type RagIndex = {
  version: 1;
  createdAt: string;
  /** Hash of the portfolio-derived chunks, used to detect a stale index */
  portfolioHash: string;
  embedding: { provider: string; model: string; dimensions: number } | null;
  chunks: IndexedChunk[];
};

export type RetrievedChunk = Chunk & { score: number; vectorScore: number; keywordScore: number };

export type SourceRef = { id: string; title: string; section: ChunkSection; anchor?: string; projectSlug?: string };

/** Swappable retriever contract (local JSON today; pgvector / Upstash later). */
export interface Retriever {
  retrieve(query: string, opts?: { k?: number; queryEmbedding?: number[] }): Promise<RetrievedChunk[]>;
  /** Whether this retriever can use a query embedding (index has vectors). */
  readonly supportsVectors: boolean;
  readonly embeddingInfo: RagIndex["embedding"];
}
