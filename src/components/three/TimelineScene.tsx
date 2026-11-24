"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { timeline } from "@/data/portfolio";
import { timelineBridge } from "@/lib/sceneBridge";
import { getState } from "@/lib/store";
import { Dust, Sky, useCameraRig } from "./common";

export const TIMELINE_SPACING = 12;
const BG = "#05070d";

function Rail() {
  const len = (timeline.length - 1) * TIMELINE_SPACING + 40;
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; varying vec2 vUv;
          void main(){
            float core = smoothstep(.5,.0,abs(vUv.y-.5));
            float pulse = smoothstep(.0,.02, fract(vUv.x*3. - uTime*.12)) * (1.-smoothstep(.02,.06, fract(vUv.x*3. - uTime*.12)));
            vec3 c = mix(vec3(.55,.7,.85), vec3(1.,.75,.35), pulse);
            gl_FragColor = vec4(c, core*(.55+pulse*1.5));
          }`,
      }),
    [],
  );
  useFrame((_, dt) => {
    if (!getState().reducedMotion) mat.uniforms.uTime.value += dt;
  });
  return (
    <mesh position={[len / 2 - 20, 0, 0]} material={mat}>
      <planeGeometry args={[len, 0.12]} />
    </mesh>
  );
}

function Nodes() {
  const group = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    if (!group.current) return;
    const t = getState().reducedMotion ? 0 : state.clock.elapsedTime;
    group.current.children.forEach((g, i) => {
      const hot = timelineBridge.hover === i;
      g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, hot ? 1.4 : 1, 7, dt));
      g.children[0].rotation.z = t * (hot ? 1.6 : 0.4) + i;
      g.children[1].rotation.z = -t * (hot ? 1 : 0.25) + i;
      const beam = (g.children[3] as THREE.Mesh).material as THREE.MeshBasicMaterial;
      beam.opacity = THREE.MathUtils.damp(beam.opacity, hot ? 0.75 : 0.25, 7, dt);
    });
  });
  return (
    <group ref={group}>
      {timeline.map((t, i) => {
        const award = /prize|award|jam/i.test(t.label);
        const color = award ? "#ffb347" : "#9fd4ff";
        return (
          <group key={i} position={[i * TIMELINE_SPACING, 0, 0]}>
            <mesh>
              <ringGeometry args={[0.55, 0.6, 6]} />
              <meshBasicMaterial color={color} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
            <mesh>
              <ringGeometry args={[0.85, 0.87, 48, 1, 0, Math.PI * 1.4]} />
              <meshBasicMaterial color={color} transparent opacity={0.6} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.16, 16, 16]} />
              <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>
            {/* vertical light beam */}
            <mesh position={[0, 6, -0.2]}>
              <planeGeometry args={[0.04, 12]} />
              <meshBasicMaterial color={color} transparent opacity={0.25} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function FloorGrid() {
  const geo = useMemo(() => {
    const pts: number[] = [];
    const w = 120;
    for (let x = -30; x <= w; x += 2) pts.push(x, -3, -30, x, -3, 12);
    for (let z = -30; z <= 12; z += 2) pts.push(-30, -3, z, w, -3, z);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#1c2a3a" transparent opacity={0.55} />
    </lineSegments>
  );
}

export default function TimelineScene({ lowPower }: { lowPower: boolean }) {
  const maxX = (timeline.length - 1) * TIMELINE_SPACING;
  useCameraRig((p) => {
    const x = p * maxX;
    return { pos: new THREE.Vector3(x - 3, 2.2, 10), look: new THREE.Vector3(x + 1.5, 0.4, 0) };
  }, 0.5);
  return (
    <>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 10, 55]} />
      <Sky top="#020308" horizon="#121a2a" bottom="#05070d" stars={0.8} />
      <FloorGrid />
      <Rail />
      <Nodes />
      <Dust count={lowPower ? 150 : 320} color="#ffd59a" size={0.14} spread={[110, 14, 30]} center={[maxX / 2, 3, -6]} speed={0.15} />
    </>
  );
}
