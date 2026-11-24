"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { worksBridge } from "@/lib/sceneBridge";
import { getState } from "@/lib/store";
import { Dust, Sky, rng, useCameraRig, useIridescentMaterial } from "./common";

const BG = "#04142a";

/* ───────────── Lightning bolt (midpoint displacement) ───────────── */
function makeBolt(seed: number, from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
  const r = rng(seed);
  let pts = [from.clone(), to.clone()];
  let disp = from.distanceTo(to) * 0.12;
  for (let gen = 0; gen < 6; gen++) {
    const next: THREE.Vector3[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const m = a.clone().lerp(b, 0.5);
      m.x += (r() - 0.5) * disp;
      m.z += (r() - 0.5) * disp * 0.4;
      next.push(a, m);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
    disp *= 0.55;
  }
  return pts;
}

function Lightning({ x, delay }: { x: number; delay: number }) {
  const [seed, setSeed] = useState(1 + delay * 100);
  const [on, setOn] = useState(true);

  useEffect(() => {
    if (getState().reducedMotion) return;
    let alive = true;
    let to: ReturnType<typeof setTimeout>;
    const strike = () => {
      if (!alive) return;
      setSeed((s) => s + 1);
      setOn(true);
      to = setTimeout(() => {
        setOn(false);
        to = setTimeout(strike, 900 + Math.random() * 2600);
      }, 260 + Math.random() * 600);
    };
    to = setTimeout(strike, delay * 1000);
    return () => {
      alive = false;
      clearTimeout(to);
    };
  }, [delay]);

  const pts = useMemo(() => makeBolt(seed, new THREE.Vector3(x, 34, -18), new THREE.Vector3(x * 0.45 + 1, -1, -4)), [seed, x]);
  const branch = useMemo(() => {
    const i = Math.floor(pts.length * 0.45);
    const p = pts[i];
    return makeBolt(seed + 77, p, p.clone().add(new THREE.Vector3(x > 0 ? 6 : -6, -9, 2)));
  }, [pts, seed, x]);

  return (
    <group visible={on}>
      <Line points={pts} color="#d8fbff" lineWidth={2.6} toneMapped={false} />
      <Line points={pts} color="#3fd2ff" lineWidth={14} transparent opacity={0.18} toneMapped={false} />
      <Line points={branch} color="#bff3ff" lineWidth={1.2} transparent opacity={0.6} toneMapped={false} />
    </group>
  );
}

/* ───────────── Floating wireframe glyphs with halos ───────────── */
function Glyphs({ count }: { count: number }) {
  const group = useRef<THREE.Group>(null);
  const items = useMemo(() => {
    const r = rng(5);
    const geos = [
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.7)),
      new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.55, 0.55, 0.9, 6)),
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.65)),
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.2, 0.7, 0.25)),
    ];
    return Array.from({ length: count }, () => ({
      geo: geos[Math.floor(r() * geos.length)],
      pos: new THREE.Vector3((r() - 0.5) * 34, 1 + r() * 16, -14 + r() * 18),
      rot: new THREE.Euler(r() * 6, r() * 6, r() * 6),
      spin: (r() - 0.5) * 0.8,
      s: 0.35 + r() * 0.45,
      phase: r() * 10,
    }));
  }, [count]);

  const halo = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: (() => {
          const c = document.createElement("canvas");
          c.width = c.height = 64;
          const g = c.getContext("2d")!;
          const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
          grd.addColorStop(0, "rgba(160,230,255,0.36)");
          grd.addColorStop(1, "rgba(160,230,255,0)");
          g.fillStyle = grd;
          g.fillRect(0, 0, 64, 64);
          return new THREE.CanvasTexture(c);
        })(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useFrame((state, dt) => {
    if (!group.current || getState().reducedMotion) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((g, i) => {
      const it = items[i];
      g.position.y = it.pos.y + Math.sin(t * 0.4 + it.phase) * 0.5;
      g.children[0].rotation.x += dt * it.spin;
      g.children[0].rotation.y += dt * it.spin * 0.7;
    });
  });

  return (
    <group ref={group}>
      {items.map((it, i) => (
        <group key={i} position={it.pos} scale={it.s}>
          <lineSegments geometry={it.geo} rotation={it.rot}>
            <lineBasicMaterial color="#eafaff" toneMapped={false} />
          </lineSegments>
          <sprite material={halo} scale={2.3} />
        </group>
      ))}
    </group>
  );
}

/* ───────────── Stepped concentric rings (amphitheatre) ───────────── */
function Rings() {
  const steps = 7;
  return (
    <group position={[0, -0.6, -4]}>
      {Array.from({ length: steps }, (_, i) => {
        const r0 = 5 + i * 3.1;
        const h = i * 0.42;
        return (
          <group key={i}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, h, 0]}>
              <ringGeometry args={[r0, r0 + 3.1, 128]} />
              <meshStandardMaterial color={i % 2 ? "#71839a" : "#8ea3b8"} roughness={0.55} metalness={0.2} />
            </mesh>
            <mesh position={[0, h - 0.21, 0]}>
              <cylinderGeometry args={[r0, r0, 0.42, 128, 1, true]} />
              <meshStandardMaterial color="#1b2a3c" roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ───────────── Focal crystal ───────────── */
function Crystal() {
  const ref = useRef<THREE.Group>(null);
  const core = useRef<THREE.MeshBasicMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const shell = useIridescentMaterial("#020b1c", 2.4, 0.55, "#5fe8ff", 0.8);
  const speed = useRef(0.25);
  const cyan = useMemo(() => new THREE.Color("#5fe8ff"), []);
  const ice = useMemo(() => new THREE.Color("#c9fbff"), []);
  const amber = useMemo(() => new THREE.Color("#ffb02e"), []);
  const tint = useMemo(() => new THREE.Color("#5fe8ff"), []);
  useFrame((state, dt) => {
    // React to the hovered project row: spin up + retint (cyan = live, amber = coming soon)
    const h = worksBridge.hover;
    const goal = h ? (h.placeholder ? amber : ice) : cyan;
    tint.lerp(goal, 1 - Math.exp(-dt * 5));
    shell.uniforms.uTint.value.copy(tint);
    if (core.current) core.current.color.copy(tint);
    if (light.current) {
      light.current.color.copy(tint);
      light.current.intensity = THREE.MathUtils.damp(light.current.intensity, h ? 48 : 30, 4, dt);
    }
    speed.current = THREE.MathUtils.damp(speed.current, h ? 1.3 : 0.25, 3, dt);
    if (!ref.current || getState().reducedMotion) return;
    ref.current.rotation.y += dt * speed.current;
    ref.current.position.y = 3.4 + Math.sin(state.clock.elapsedTime * 0.7) * 0.18;
  });
  return (
    <group ref={ref} position={[1.6, 3.4, 0]}>
      <mesh material={shell}>
        <icosahedronGeometry args={[1.6, 0]} />
      </mesh>
      <mesh scale={0.55}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial ref={core} color="#5fe8ff" toneMapped={false} />
      </mesh>
      <pointLight ref={light} color="#5fe8ff" intensity={30} distance={14} />
    </group>
  );
}

export default function WorksScene({ lowPower }: { lowPower: boolean }) {
  useCameraRig((p) => {
    const e = p * p * (3 - 2 * p);
    return {
      pos: new THREE.Vector3(-1.5 + e * 2.5, 4.2 - e * 0.8, 15 - e * 4),
      look: new THREE.Vector3(0.6, 3.2, -4),
    };
  }, 0.8);

  return (
    <>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 18, 70]} />
      <Sky top="#010915" horizon="#0b3f7a" bottom="#041022" stars={0.6} />
      <hemisphereLight args={["#7fc6ff", "#020812", 0.6]} />
      <directionalLight position={[-8, 18, 6]} intensity={1.1} color="#bfe6ff" />
      <Rings />
      <Crystal />
      <Glyphs count={lowPower ? 16 : 30} />
      <Lightning x={-9} delay={0.2} />
      {!lowPower && <Lightning x={11} delay={1.6} />}
      <Dust count={lowPower ? 120 : 260} color="#9fe9ff" size={0.22} spread={[40, 20, 30]} center={[0, 9, -6]} />
    </>
  );
}
