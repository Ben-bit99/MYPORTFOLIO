"use client";

import { useSyncExternalStore } from "react";

export type PublicMemory = { id: string; name: string; location: string; message: string; createdAt: string };

type State = { items: PublicMemory[]; enabled: boolean; loaded: boolean; lastAddedId: string | null };

let state: State = { items: [], enabled: true, loaded: false, lastAddedId: null };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function useMemories() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
    () => state,
  );
}

let inflight: Promise<void> | null = null;
export function loadMemories() {
  if (inflight) return inflight;
  inflight = fetch("/api/memories", { cache: "no-store" })
    .then((r) => r.json())
    .then((j: { enabled?: boolean; items?: PublicMemory[] }) => {
      state = { ...state, items: j.items ?? [], enabled: j.enabled !== false, loaded: true };
      emit();
    })
    .catch(() => {
      state = { ...state, loaded: true };
      emit();
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function postMemory(input: { name: string; location: string; message: string; website: string }) {
  const res = await fetch("/api/memories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const j = (await res.json().catch(() => ({}))) as { error?: string; item?: PublicMemory };
  if (!res.ok || !j.item) throw new Error(j.error ?? "Something went wrong. Please try again.");
  state = { ...state, items: [j.item, ...state.items], lastAddedId: j.item.id };
  emit();
  return j.item;
}

/** Moderator: check a password (empty works in local dev when none is configured). */
export async function verifyModerator(token: string) {
  const res = await fetch("/api/memories?verify=1", { method: "DELETE", headers: { "x-admin-token": token } });
  return res.ok;
}

export async function deleteMemory(id: string, token: string) {
  const res = await fetch(`/api/memories?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: { "x-admin-token": token } });
  if (!res.ok && res.status !== 404) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Couldn't delete that memory.");
  }
  state = { ...state, items: state.items.filter((m) => m.id !== id), lastAddedId: state.lastAddedId === id ? null : state.lastAddedId };
  emit();
}

export const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
};
