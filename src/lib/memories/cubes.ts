"use client";
/**
 * Shared, non-reactive bridge between the DOM (Memories section / reader) and
 * the 3D memory cubes inside the R3F canvas.
 *  - positions/sizes: where each memory's cube lives (stable per memory id)
 *  - pick: raycast from screen NDC → memory id (registered by the 3D layer)
 *  - hoverId / focusId: what the DOM is hovering / reading (3D reacts)
 *  - arrival: a freshly posted memory flying into its new cube
 */
export const cubeBridge = {
  positions: new Map<string, [number, number, number]>(),
  sizes: new Map<string, number>(),
  pick: null as null | ((ndcX: number, ndcY: number) => string | null),
  hoverId: null as string | null,
  focusId: null as string | null,
  arrival: null as null | { id: string; start: number },
  /** Click-and-drag orbit: target (tx,ty) set by the DOM, damped (x,y) read by the camera */
  orbit: { tx: 0, ty: 0, x: 0, y: 0 },
};

/** FNV-1a hash → 32-bit seed, so a memory always lands in the same spot. */
export function seedFromId(id: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
