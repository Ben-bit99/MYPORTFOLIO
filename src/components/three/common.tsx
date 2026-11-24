"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { frame, getState } from "@/lib/store";
import { iridescentFrag, iridescentVert, skyFrag, skyVert } from "./shaders";

export const damp = THREE.MathUtils.damp;

/** Gradient sky dome with soft clouds + twinkling stars. */
export function Sky({
  top,
  horizon,
  bottom,
  stars = 1,
  clouds = 1,
}: {
  top: string;
  horizon: string;
  bottom: string;
  stars?: number;
  clouds?: number;
}) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color(top) },
          uHorizon: { value: new THREE.Color(horizon) },
          uBottom: { value: new THREE.Color(bottom) },
          uTime: { value: 0 },
          uStars: { value: stars },
          uClouds: { value: clouds },
        },
      }),
    [top, horizon, bottom, stars, clouds],
  );
  useFrame((_, dt) => {
    if (!getState().reducedMotion) mat.uniforms.uTime.value += dt;
  });
  return (
    <mesh material={mat} renderOrder={-10}>
      <sphereGeometry args={[400, 48, 24]} />
    </mesh>
  );
}

export function useIridescentMaterial(base = "#03060c", rim = 1.6, shift = 0, tint?: string, tintMix = 0) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: iridescentVert,
        fragmentShader: iridescentFrag,
        transparent: false,
        uniforms: {
          uTime: { value: 0 },
          uBase: { value: new THREE.Color(base) },
          uRim: { value: rim },
          uShift: { value: shift },
          uOpacity: { value: 1 },
          uTint: { value: new THREE.Color(tint ?? "#ffffff") },
          uTintMix: { value: tint ? tintMix : 0 },
        },
      }),
    [base, rim, shift, tint, tintMix],
  );
  useFrame((_, dt) => {
    mat.uniforms.uTime.value += dt;
  });
  return mat;
}

/**
 * Drives the camera from the active section's local scroll progress and the
 * pointer, with damping. `path(p)` returns [position, lookAt].
 */
export function useCameraRig(
  path: (p: number, t: number) => { pos: THREE.Vector3; look: THREE.Vector3; parallax?: number },
  parallax = 0.6,
) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3());
  const first = useRef(true);
  useFrame((state, dt) => {
    const reduced = getState().reducedMotion;
    const { pos, look: target, parallax: px0 } = path(frame.progress, reduced ? 0 : state.clock.elapsedTime);
    const par = px0 ?? parallax;
    const px = reduced ? 0 : frame.pointerX * par;
    const py = reduced ? 0 : frame.pointerY * par * 0.5;
    const tx = pos.x + px;
    const ty = pos.y + py;
    // Snap during black dips or first frame so scene swaps don't swoop.
    if (first.current || frame.dip > 0.97) {
      camera.position.set(tx, ty, pos.z);
      look.current.copy(target);
      first.current = false;
    } else {
      const l = 3.5;
      camera.position.x = damp(camera.position.x, tx, l, dt);
      camera.position.y = damp(camera.position.y, ty, l, dt);
      camera.position.z = damp(camera.position.z, pos.z, l, dt);
      look.current.x = damp(look.current.x, target.x, l, dt);
      look.current.y = damp(look.current.y, target.y, l, dt);
      look.current.z = damp(look.current.z, target.z, l, dt);
    }
    camera.lookAt(look.current);
  });
}

/** Seeded PRNG so scenes are identical on every load. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Floating dust / bokeh points. */
export function Dust({
  count = 400,
  spread = [40, 20, 40],
  color = "#9ec9ff",
  size = 0.12,
  center = [0, 6, -5],
  speed = 0.2,
}: {
  count?: number;
  spread?: [number, number, number];
  color?: string;
  size?: number;
  center?: [number, number, number];
  speed?: number;
}) {
  const { geo, mat } = useMemo(() => {
    const r = rng(count * 7 + 3);
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (r() - 0.5) * spread[0];
      p[i * 3 + 1] = (r() - 0.5) * spread[1];
      p[i * 3 + 2] = (r() - 0.5) * spread[2];
      s[i] = r();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(s, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uSize: { value: size }, uSpeed: { value: speed } },
      vertexShader: /* glsl */ `
        attribute float aSeed; uniform float uTime; uniform float uSize; uniform float uSpeed; varying float vA;
        void main(){
          vec3 p = position;
          p.y += sin(uTime*uSpeed + aSeed*40.)*.6;
          p.x += cos(uTime*uSpeed*.7 + aSeed*20.)*.4;
          vec4 mv = modelViewMatrix * vec4(p,1.);
          gl_PointSize = uSize * (300. / -mv.z) * (.5 + aSeed);
          vA = .35 + .65*fract(aSeed*7.3);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying float vA;
        void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5,.0,d); gl_FragColor = vec4(uColor, a*a*vA); }`,
    });
    return { geo, mat };
  }, [count, spread, color, size, speed]);
  useFrame((_, dt) => {
    if (!getState().reducedMotion) mat.uniforms.uTime.value += dt;
  });
  return <points geometry={geo} material={mat} position={center} />;
}
