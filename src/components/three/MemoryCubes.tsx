"use client";
/**
 * One wireframe cube per memory, floating in the lattice in front of the avatar.
 *  - stable position per memory id (cubes never reshuffle when new ones arrive)
 *  - glowing core inside each cube; hover/focus brightens it
 *  - a new memory flies from the avatar's hand into a freshly formed cube
 *  - registers a raycast picker so the DOM layer can click cubes
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { cubeBridge, seedFromId } from "@/lib/memories/cubes";
import { useMemories } from "@/lib/memories/client";
import { getState } from "@/lib/store";
import { rng } from "./common";

const MAX_CUBES = 48;
/** Approximate world position of the avatar's reaching hand (memories mode). */
const HAND = new THREE.Vector3(0.1, 3.7, 3.6);
const FLIGHT = 1.6; // s
const FORM = 0.9; // s

/** Place cubes deterministically, keeping them apart (oldest placed first). */
function layout(ids: string[]) {
  const placed: { id: string; p: THREE.Vector3; s: number }[] = [];
  for (const id of ids) {
    const r = rng(seedFromId(id));
    const s = 1.25 + r() * 0.5;
    let p = new THREE.Vector3();
    for (let tries = 0; tries < 40; tries++) {
      p = new THREE.Vector3(-0.5 + r() * 11, 0.6 + r() * 6.6, -16 + r() * 15);
      if (placed.every((q) => q.p.distanceTo(p) > (q.s + s) * 0.95)) break;
    }
    placed.push({ id, p, s });
  }
  return placed;
}

function CubeEdges({ size, color, opacity }: { size: number; color: string; opacity: number }) {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size)), [size]);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
    </lineSegments>
  );
}

export default function MemoryCubes() {
  const { items, lastAddedId } = useMemories();
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const orb = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Sprite>(null);
  const haloMat = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(170,245,255,0.7)");
    grd.addColorStop(1, "rgba(170,245,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  }, []);
  const hitMeshes = useRef(new Map<string, THREE.Mesh>());

  // Newest MAX_CUBES memories, placed oldest-first so positions stay stable.
  const cubes = useMemo(() => {
    const recent = items.slice(0, MAX_CUBES);
    const asc = [...recent].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return layout(asc.map((m) => m.id));
  }, [items]);

  // Publish positions for the camera / reader.
  useEffect(() => {
    cubeBridge.positions.clear();
    cubeBridge.sizes.clear();
    for (const c of cubes) {
      cubeBridge.positions.set(c.id, [c.p.x, c.p.y, c.p.z]);
      cubeBridge.sizes.set(c.id, c.s);
    }
  }, [cubes]);

  // New memory → schedule its flight (after the form closes).
  useEffect(() => {
    if (!lastAddedId) return;
    cubeBridge.arrival = { id: lastAddedId, start: performance.now() / 1000 + 2.4 };
  }, [lastAddedId]);

  // Raycast picker for the DOM layer.
  useEffect(() => {
    const ray = new THREE.Raycaster();
    const v = new THREE.Vector2();
    cubeBridge.pick = (x, y) => {
      v.set(x, y);
      ray.setFromCamera(v, camera);
      const hit = ray.intersectObjects([...hitMeshes.current.values()], false)[0];
      return (hit?.object.userData.id as string | undefined) ?? null;
    };
    return () => {
      cubeBridge.pick = null;
      cubeBridge.hoverId = null;
    };
  }, [camera]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const reduced = getState().reducedMotion;
    const t = reduced ? 0 : state.clock.elapsedTime;
    const now = performance.now() / 1000;
    const arr = cubeBridge.arrival;

    g.children.forEach((cube, i) => {
      const c = cubes[i];
      if (!c) return;
      const hovered = cubeBridge.hoverId === c.id;
      const focused = cubeBridge.focusId === c.id;
      // Arrival: cube forms only after the orb lands.
      let form = 1;
      if (arr && arr.id === c.id) form = THREE.MathUtils.clamp((now - arr.start - FLIGHT) / FORM, 0, 1);
      const ease = 1 - Math.pow(1 - form, 3);
      const target = focused ? 1 : ease * (hovered ? 1.12 : 1);
      cube.scale.setScalar(THREE.MathUtils.damp(cube.scale.x || 0.001, Math.max(0.001, target), 8, dt));
      if (!focused) {
        cube.rotation.y = Math.sin(t * 0.15 + i) * 0.25;
        cube.rotation.x = Math.cos(t * 0.12 + i) * 0.12;
      } else {
        cube.rotation.set(0, 0, 0);
      }
      const edges = cube.children[0] as THREE.LineSegments;
      const core = cube.children[1] as THREE.Mesh;
      const em = edges.material as THREE.LineBasicMaterial;
      const flash = arr && arr.id === c.id ? Math.max(0, 1 - Math.abs(now - arr.start - FLIGHT) * 1.5) : 0;
      em.opacity = focused ? 0.9 : hovered ? 1 : 0.45 + flash;
      em.color.set(hovered || focused || flash > 0.05 ? "#e6fdff" : "#6fe0ee");
      const pulse = 1 + Math.sin(t * 1.6 + i * 1.7) * 0.2;
      core.scale.setScalar(focused ? 0.0001 : (hovered ? 0.22 : 0.1) * pulse * c.s * ease);
      (core.material as THREE.MeshBasicMaterial).color.set(hovered ? "#ffffff" : "#9ff3ff");
      (core.material as THREE.MeshBasicMaterial).opacity = focused ? 0.25 : 1;
    });

    // Click-and-drag orbit (damped; springs back when released)
    const ob = cubeBridge.orbit;
    ob.x = THREE.MathUtils.damp(ob.x, ob.tx, 4, dt);
    ob.y = THREE.MathUtils.damp(ob.y, ob.ty, 4, dt);

    // Hover bloom halo
    const hv = cubeBridge.hoverId ? cubeBridge.positions.get(cubeBridge.hoverId) : undefined;
    if (halo.current) {
      const hm = halo.current.material as THREE.SpriteMaterial;
      if (hv) halo.current.position.set(hv[0], hv[1], hv[2]);
      hm.opacity = THREE.MathUtils.damp(hm.opacity, hv ? 0.9 : 0, 8, dt);
      halo.current.visible = hm.opacity > 0.01;
    }

    // Orb flight from the avatar's hand to the new cube.
    const o = orb.current;
    if (o) {
      const p = arr ? cubeBridge.positions.get(arr.id) : undefined;
      const k = arr ? (now - arr.start) / FLIGHT : -1;
      if (p && k >= 0 && k <= 1.05) {
        const to = new THREE.Vector3(...p);
        const mid = HAND.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 2.2, 0));
        const e = Math.min(1, k);
        const a = HAND.clone().lerp(mid, e);
        const b = mid.clone().lerp(to, e);
        o.position.copy(a.lerp(b, e)); // quadratic bezier arc
        o.scale.setScalar(0.22 * (1 - e * 0.5));
        o.visible = true;
      } else {
        o.visible = false;
        if (arr && k > 1 + FORM / FLIGHT + 0.5) cubeBridge.arrival = null;
      }
    }
  });

  return (
    <>
      <group ref={group}>
        {cubes.map((c) => (
          <group key={c.id} position={c.p}>
            <CubeEdges size={c.s} color="#6fe0ee" opacity={0.45} />
            <mesh>
              <octahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color="#9ff3ff" transparent toneMapped={false} />
            </mesh>
            <mesh
              visible={false}
              userData={{ id: c.id }}
              ref={(m) => {
                if (m) hitMeshes.current.set(c.id, m);
                else hitMeshes.current.delete(c.id);
              }}
            >
              <boxGeometry args={[c.s, c.s, c.s]} />
            </mesh>
          </group>
        ))}
      </group>
      <sprite ref={halo} material={haloMat} scale={[3.2, 3.2, 1]} visible={false} />
      <mesh ref={orb} visible={false}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#d8fbff" toneMapped={false} />
      </mesh>
    </>
  );
}
