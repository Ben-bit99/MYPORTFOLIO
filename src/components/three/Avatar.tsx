"use client";
/**
 * Site avatar: "Aang – Avatar state" by Windstride (CC BY 4.0, see CREDITS.md),
 * optimised with scripts/optimize-avatar.mjs → public/models/avatar.glb.
 *
 * The model is a static sculpture (no skeleton), so all life comes from the whole
 * figure: float + breathing, damped turn/tilt toward the cursor (or the hovered
 * echo cube), hover glow, and lift/wobble reactions to clicks. Its own textures
 * and emissive tattoos are kept; a small local light rig makes it read in scenes
 * that were built for self-lit materials.
 */
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { cubeBridge } from "@/lib/memories/cubes";
import { heroBridge } from "@/lib/sceneBridge";
import { frame, getState } from "@/lib/store";

export const AVATAR_URL = "/models/avatar.glb";
/** Normalised standing height (matches the previous avatar, so scene scales keep their meaning). */
const HEIGHT = 1.8;

type Props = {
  /** Kept for API compatibility with the scenes; the sculpture has a single pose. */
  pose?: "kneel" | "reach";
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
  /** Legacy shader options from the previous avatar (ignored). */
  material?: Record<string, unknown>;
  /** Turn toward the pointer */
  interactive?: boolean;
  /** Which scene drives the avatar's reactions */
  role?: "hero" | "echo";
};

export default function Avatar({ position = [0, 0, 0], rotationY = 0, scale = 2.2, interactive = true, role }: Props) {
  const { scene } = useGLTF(AVATAR_URL);
  const { camera } = useThree();
  const outer = useRef<THREE.Group>(null); // world placement + reactions
  const inner = useRef<THREE.Group>(null); // float / breathe

  // Clone the scene with its own materials (each instance can glow independently),
  // then centre it on X/Z, put the lowest point at y=0 and normalise its height.
  const { model, mats, fit } = useMemo(() => {
    const model = scene.clone(true);
    const mats: THREE.MeshStandardMaterial[] = [];
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = (m.material as THREE.MeshStandardMaterial).clone();
      mat.userData.baseEmissive = mat.emissive.clone();
      mat.userData.baseIntensity = mat.emissiveIntensity;
      m.material = mat;
      m.frustumCulled = true;
      mats.push(mat);
    });
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const k = HEIGHT / (size.y || 1);
    const c = box.getCenter(new THREE.Vector3());
    return { model, mats, fit: { k, offset: new THREE.Vector3(-c.x, -box.min.y, -c.z).multiplyScalar(k) } };
  }, [scene]);

  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);

  const ray = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const head = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const cyan = useMemo(() => new THREE.Color("#36e0ff"), []);
  const glow = useRef({ yaw: 0, pitch: 0, hover: 0 });

  useFrame((state, dt) => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const reduced = getState().reducedMotion;
    const t = reduced ? 0 : state.clock.elapsedTime;
    const nowS = performance.now() / 1000;
    const g = glow.current;

    // ── idle life: float + breathing ──
    i.position.y = Math.sin(t * 1.1) * 0.035;
    i.scale.set(1, 1 + Math.sin(t * 1.15) * 0.006, 1);

    // ── look target: hovered echo cube, else a point under the cursor at head depth ──
    o.localToWorld(head.set(0, HEIGHT * 0.88, 0));
    let have = false;
    if (role === "echo") {
      const id = cubeBridge.hoverId ?? cubeBridge.focusId;
      const p = id ? cubeBridge.positions.get(id) : undefined;
      if (p) {
        target.set(p[0], p[1], p[2]);
        have = true;
      }
    }
    if (!have && interactive && !reduced) {
      ray.setFromCamera(ndc.set(frame.pointerX, frame.pointerY), camera);
      target.copy(ray.ray.origin).addScaledVector(ray.ray.direction, camera.position.distanceTo(head));
      have = true;
    }
    if (role === "hero" && heroBridge.hover === "artifact") {
      target.copy(heroBridge.hands);
      have = true;
    }
    let yaw = 0;
    let pitch = 0;
    if (have) {
      // direction to the target in the figure's own (unrotated) frame
      tmp.copy(target).sub(head);
      const c = Math.cos(-rotationY);
      const s = Math.sin(-rotationY);
      const lx = tmp.x * c + tmp.z * s;
      const lz = -tmp.x * s + tmp.z * c;
      yaw = THREE.MathUtils.clamp(Math.atan2(lx, lz), -0.45, 0.45);
      pitch = THREE.MathUtils.clamp(Math.atan2(tmp.y, Math.hypot(lx, lz)), -0.2, 0.2);
    }
    const yawK = role === "echo" ? 0.85 : 0.6;
    g.yaw = THREE.MathUtils.damp(g.yaw, yaw * yawK, 3, dt);
    g.pitch = THREE.MathUtils.damp(g.pitch, -pitch * 0.6, 3, dt);

    // ── click reactions (hero): gesture lift + surge wobble ──
    const surge = role === "hero" ? Math.max(0, 1 - (nowS - heroBridge.surgeAt) / 1.6) : 0;
    const gk = Math.min(1, Math.max(0, nowS - heroBridge.gestureAt) / 1.4);
    const gesture = role === "hero" && gk < 1 ? Math.sin(Math.PI * gk) : 0;
    const lift = Math.max(gesture, surge * 0.8);
    const leanIn = role === "hero" && heroBridge.hover === "artifact" ? 0.08 : 0;

    o.position.set(position[0], position[1] + lift * 0.28 * (scale / 2), position[2]);
    o.rotation.set(g.pitch + leanIn, rotationY + g.yaw + Math.sin(t * 9) * 0.025 * surge, Math.sin(t * 0.6) * 0.012);

    // ── glow: hover brightens the tattoos; surge flashes them cyan ──
    const hoverT = role === "hero" ? (heroBridge.hover ? 1 : 0) : role === "echo" && cubeBridge.hoverId ? 0.6 : 0;
    g.hover = THREE.MathUtils.damp(g.hover, hoverT, 6, dt);
    const intensity = 1 + g.hover * 0.9 + surge * 2.2 + Math.max(0, Math.sin(t * 1.4)) * 0.12;
    for (const m of mats) {
      const base = m.userData.baseEmissive as THREE.Color;
      m.emissive.copy(base).lerp(cyan, surge * 0.85);
      m.emissiveIntensity = (m.userData.baseIntensity as number) * intensity;
    }

    // publish a point in front of the hands for the hologram
    if (role === "hero") o.localToWorld(heroBridge.hands.set(0, HEIGHT * 0.22, HEIGHT * 0.5));
  });

  return (
    <group ref={outer} position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <group ref={inner}>
        <primitive object={model} scale={fit.k} position={fit.offset.toArray()} />
      </group>
      {/* local light rig so the textured sculpture reads in self-lit scenes */}
      <hemisphereLight args={["#9fc4ff", "#06090f", 0.55]} />
      <pointLight position={[1.3, 2.4, 2.2]} intensity={22} color="#dfe9ff" />
      <pointLight position={[-1.3, 1.7, -1.8]} intensity={34} color="#5fe8ff" />
    </group>
  );
}

useGLTF.preload(AVATAR_URL);
