"use client";
/**
 * Tiny global store (no dependency) + a mutable, non-reactive `frame` object
 * that the 3D scenes read every frame without causing React re-renders.
 */
import { useSyncExternalStore } from "react";
import type { SectionId } from "@/data/portfolio";

export type DrawerState =
  | { type: "about" }
  | { type: "project"; slug: string }
  | { type: "certificate"; slug: string }
  | { type: "memory-form" }
  | { type: "memories" }
  | { type: "contact-form" }
  | { type: "memory-read"; id: string }
  | null;

export type AppState = {
  entered: boolean;
  loaded: boolean;
  soundOn: boolean;
  menuOpen: boolean;
  chatOpen: boolean;
  drawer: DrawerState;
  activeSection: SectionId;
  lowPower: boolean;
  reducedMotion: boolean;
  webglOk: boolean;
  memoryCount: number;
};

let state: AppState = {
  entered: false,
  loaded: false,
  soundOn: true,
  menuOpen: false,
  chatOpen: false,
  drawer: null,
  activeSection: "hero",
  lowPower: false,
  reducedMotion: false,
  webglOk: true,
  memoryCount: 0,
};

const listeners = new Set<() => void>();

export function getState() {
  return state;
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  let changed = false;
  for (const k in next) {
    if (state[k as keyof AppState] !== next[k as keyof AppState]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useApp<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

/** Mutable per-frame data (scroll + pointer). Read in useFrame, never in render. */
export const frame = {
  scrollY: 0,
  viewportH: 1,
  /** Local progress (0..1) through the active section's scroll track */
  progress: 0,
  /** 0 = fully visible, 1 = black (section-boundary dip) */
  dip: 0,
  pointerX: 0,
  pointerY: 0,
  sections: [] as { id: SectionId; top: number; height: number }[],
};
