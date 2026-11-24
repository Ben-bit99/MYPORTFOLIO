/**
 * npm run rag:index
 *
 * Builds src/data/rag-index.json from:
 *   - src/data/portfolio.ts (structured data → semantic chunks)
 *   - src/data/knowledge/*.md|*.txt (optional free-form notes)
 *
 * With an API key in .env.local, each chunk gets a vector embedding
 * (hybrid vector + BM25 retrieval). Without a key the index is keyword-only
 * (BM25), which still works well for a portfolio this size.
 */
import fs from "node:fs";
import path from "node:path";
import { embedMany } from "ai";
import { buildPortfolioChunks, chunkKnowledgeDoc, hashChunks } from "../src/lib/rag/chunks";
import { getModels } from "../src/lib/rag/provider";
import type { IndexedChunk, RagIndex } from "../src/lib/rag/types";

const root = process.cwd();
for (const f of [".env.local", ".env"]) {
  const p = path.join(root, f);
  if (fs.existsSync(p)) process.loadEnvFile(p);
}

async function main() {
  const portfolioChunks = buildPortfolioChunks();
  const kbDir = path.join(root, "src/data/knowledge");
  const kbChunks = fs.existsSync(kbDir)
    ? fs
        .readdirSync(kbDir)
        .filter((f) => /\.(md|txt)$/i.test(f) && !f.toLowerCase().startsWith("readme"))
        .flatMap((f) => chunkKnowledgeDoc(f, fs.readFileSync(path.join(kbDir, f), "utf8")))
    : [];

  const chunks: IndexedChunk[] = [...portfolioChunks, ...kbChunks];
  console.log(`• ${portfolioChunks.length} portfolio chunks, ${kbChunks.length} knowledge chunks`);

  let embedding: RagIndex["embedding"] = null;
  const models = getModels();
  if (models) {
    console.log(`• Embedding with ${models.cfg.name}/${models.cfg.embeddingModelId} …`);
    try {
      const { embeddings } = await embedMany({
        model: models.embedding,
        values: chunks.map((c) => `${c.title}\n${c.content}`),
        maxParallelCalls: 2,
      });
      embeddings.forEach((e, i) => (chunks[i].embedding = e.map((x) => Number(x.toFixed(6)))));
      embedding = { provider: models.cfg.name, model: models.cfg.embeddingModelId, dimensions: embeddings[0]?.length ?? 0 };
    } catch (err) {
      console.warn(`! Embedding failed, writing keyword-only index instead:\n  ${(err as Error).message}`);
      chunks.forEach((c) => delete c.embedding);
    }
  } else {
    console.log("• No API key found → keyword-only (BM25) index. Add a key to .env.local for vector search.");
  }

  const index: RagIndex = {
    version: 1,
    createdAt: new Date().toISOString(),
    portfolioHash: hashChunks(portfolioChunks),
    embedding,
    chunks,
  };
  const out = path.join(root, "src/data/rag-index.json");
  fs.writeFileSync(out, JSON.stringify(index));
  console.log(`✓ Wrote ${path.relative(root, out)} (${chunks.length} chunks, ${embedding ? `${embedding.dimensions}-d vectors` : "no vectors"})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
