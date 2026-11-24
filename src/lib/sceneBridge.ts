"use client";
/**
 * Non-reactive bridges between DOM pointer handling (the page sits on top of
 * the canvas) and the 3D scenes. Read inside useFrame; written by DOM handlers.
 */
import * as THREE from "three";

export type HeroTarget = "artifact" | "avatar";

export const heroBridge = {
  /** Raycast from NDC → hero target (registered by CityScene). */
  pick: null as null | ((ndcX: number, ndcY: number) => HeroTarget | null),
  hover: null as HeroTarget | null,
  /** performance.now()/1000 timestamps of the last events */
  surgeAt: -1e9,
  gestureAt: -1e9,
  focusAt: -1e9,
  /** World-space centre between the avatar's hands (written by Avatar). */
  hands: new THREE.Vector3(-1.0, 1.9, 1.6),
};

export const worksBridge = {
  /** Currently hovered project row (null = none) */
  hover: null as null | { slug: string; placeholder: boolean },
};

export const timelineBridge = {
  /** Hovered milestone index (-1 = none) */
  hover: -1,
};

export const now = () => performance.now() / 1000;
