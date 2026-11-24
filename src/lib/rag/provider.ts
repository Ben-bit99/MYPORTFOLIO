/**
 * LLM + embedding provider selection, driven by env vars:
 *   AI_PROVIDER=google|openai, GOOGLE_GENERATIVE_AI_API_KEY / OPENAI_API_KEY,
 *   CHAT_MODEL, EMBEDDING_MODEL (optional overrides).
 * Shared by the API route and scripts/build-rag-index.ts.
 */
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

export type ProviderName = "google" | "openai";

const DEFAULTS: Record<ProviderName, { chat: string; embedding: string }> = {
  google: { chat: "gemini-2.5-flash", embedding: "gemini-embedding-001" },
  openai: { chat: "gpt-4.1-mini", embedding: "text-embedding-3-small" },
};

export function getProviderConfig() {
  const requested = (process.env.AI_PROVIDER || "google").toLowerCase() as ProviderName;
  const keys: Record<ProviderName, string | undefined> = {
    google: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    openai: process.env.OPENAI_API_KEY,
  };
  // Use the requested provider; if it has no key but the other one does, use that.
  let name: ProviderName = requested === "openai" ? "openai" : "google";
  if (!keys[name]) {
    const other: ProviderName = name === "google" ? "openai" : "google";
    if (keys[other]) name = other;
  }
  const apiKey = keys[name];
  return {
    name,
    apiKey,
    hasKey: !!apiKey,
    chatModelId: process.env.CHAT_MODEL || DEFAULTS[name].chat,
    embeddingModelId: process.env.EMBEDDING_MODEL || DEFAULTS[name].embedding,
  };
}

export function getModels() {
  const cfg = getProviderConfig();
  if (!cfg.apiKey) return null;
  if (cfg.name === "openai") {
    const openai = createOpenAI({ apiKey: cfg.apiKey });
    return { cfg, chat: openai(cfg.chatModelId), embedding: openai.embedding(cfg.embeddingModelId) };
  }
  const google = createGoogleGenerativeAI({ apiKey: cfg.apiKey });
  return { cfg, chat: google(cfg.chatModelId), embedding: google.embedding(cfg.embeddingModelId) };
}
