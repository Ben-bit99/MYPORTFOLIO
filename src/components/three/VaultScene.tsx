"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { getState } from "@/lib/store";
import { cubeBridge } from "@/lib/memories/cubes";
import Avatar from "./Avatar";
import MemoryCubes from "./MemoryCubes";
import { Dust, rng, useCameraRig } from "./common";

const BG = "#010608";

/* ───────────── Teal wireframe lattice (the vault) ───────────── */
function Lattice({ lowPower }: { lowPower: boolean }) {
  const { geo, mat } = useMemo(() => {
    const r = rng(2026);
    const pts: number[] = [];
    const step = lowPower ? 7 : 5;
    const X = 40, Y = 22, Z0 = -150, Z1 = 30;
    const keep = lowPower ? 0.4 : 0.66;
    // lines along Z
    for (let x = -X; x <= X; x += step)
      for (let y = -Y / 2; y <= Y; y += step) if (r() < keep) pts.push(x, y, Z0, x, y, Z1);
    // lines along X
    for (let z = Z0; z <= Z1; z += step)
      for (let y = -Y / 2; y <= Y; y += step) if (r() < keep * 0.7) {
        const a = -X + r() * X, b = a + 10 + r() * X;
        pts.push(a, y, z, b, y, z);
      }
    // lines along Y
    for (let z = Z0; z <= Z1; z += step)
      for (let x = -X; x <= X; x += step) if (r() < keep * 0.6) pts.push(x, -Y / 2, z, x, Y, z);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() } },
      vertexShader: /* glsl */ `
        varying float vDepth; varying vec3 vW;
        void main(){ vec4 wp = modelMatrix*vec4(position,1.); vW = wp.xyz; vec4 mv = viewMatrix*wp; vDepth=-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; varying float vDepth; varying vec3 vW;
        void main(){
          float fade = smoothstep(90., 6., vDepth) * smoothstep(.5, 3., vDepth);
          float scan = smoothstep(.0, 1.5, 1.5 - abs(mod(vW.z - uTime*9., 40.) - 20.));
          vec3 c = mix(vec3(.18,.55,.65), vec3(.75,1.,1.), scan);
          gl_FragColor = vec4(c, fade*(.28 + scan*.6));
        }`,
    });
    return { geo, mat };
  }, [lowPower]);
  useFrame((_, dt) => {
    if (!getState().reducedMotion) mat.uniforms.uTime.value += dt;
  });
  return <lineSegments geometry={geo} material={mat} frustumCulled={false} />;
}

/* ───────────── Floating cube outlines ───────────── */
function Cubes() {
  const ref = useRef<THREE.Group>(null);
  const items = useMemo(() => {
    const r = rng(11);
    return Array.from({ length: 10 }, () => ({
      p: [(r() - 0.5) * 24, r() * 10 - 1, -r() * 40] as [number, number, number],
      s: 0.8 + r() * 2.2,
      sp: (r() - 0.5) * 0.4,
    }));
  }, []);
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), []);
  useFrame((_, dt) => {
    if (!ref.current || getState().reducedMotion) return;
    ref.current.children.forEach((c, i) => {
      c.rotation.y += dt * items[i].sp;
      c.rotation.x += dt * items[i].sp * 0.5;
    });
  });
  return (
    <group ref={ref}>
      {items.map((it, i) => (
        <lineSegments key={i} geometry={edges} position={it.p} scale={it.s}>
          <lineBasicMaterial color="#6fe0ee" transparent opacity={0.35} />
        </lineSegments>
      ))}
    </group>
  );
}

export default function VaultScene({ lowPower, mode = "vault" }: { lowPower: boolean; mode?: "vault" | "memories" }) {
  const portrait = useThree((s) => s.size.width / Math.max(1, s.size.height)) < 0.9;
  useCameraRig(
    (p, t) => {
      // Reading a memory: fly inside its cube, looking at the back face.
      const fp = mode === "memories" && cubeBridge.focusId ? cubeBridge.positions.get(cubeBridge.focusId) : undefined;
      if (fp) {
        const s = cubeBridge.sizes.get(cubeBridge.focusId!) ?? 1.4;
        return {
          pos: new THREE.Vector3(fp[0], fp[1], fp[2] + s * 1.1),
          look: new THREE.Vector3(fp[0], fp[1], fp[2] - 6),
          parallax: 0.04,
        };
      }
      const ob = cubeBridge.orbit;
      return mode === "memories" && portrait
        ? { pos: new THREE.Vector3(-1.1 + ob.x * 1.6, 3.6 + ob.y, 13.5 - p * 1.2), look: new THREE.Vector3(-0.6, 3.2, -12) }
        : mode === "memories"
        ? {
            pos: new THREE.Vector3(-0.2 + Math.sin(t * 0.12) * 0.25 + ob.x * 2.4, 3.5 + ob.y * 1.2, 11.2 - p * 1.4),
            look: new THREE.Vector3(1.2, 3.0, -12),
          }
        : {
            pos: new THREE.Vector3(Math.sin(t * 0.1) * 0.4, 2.6, 10 - p * 4),
            look: new THREE.Vector3(-0.5, 2.4, -20),
          };
    },
    mode === "memories" ? 0.5 : 0.8,
  );
  return (
    <>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 10, 80]} />
      <Lattice lowPower={lowPower} />
      {mode === "vault" && <Cubes />}
      {mode === "memories" && (
        <>
          <MemoryCubes />
          <Suspense fallback={null}>
            <Avatar
              pose="reach"
              position={[-1.55, -0.05, 6.2]}
              rotationY={Math.PI - 0.3}
              scale={2}
              material={{ vein: "#3fd8ff", veinAmt: 0.45, rim: 0.85, halo: 1.6 }}
              role="echo"
            />
          </Suspense>
        </>
      )}
      <Dust count={lowPower ? 80 : 200} color="#a6f4ff" size={0.12} spread={[30, 14, 40]} center={[0, 4, -8]} />
    </>
  );
}
