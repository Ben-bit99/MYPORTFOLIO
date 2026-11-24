"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { heroBridge, now as nowS } from "@/lib/sceneBridge";
import { getState } from "@/lib/store";
import Avatar from "./Avatar";
import { Dust, Sky, rng, useCameraRig } from "./common";
import fontJson from "./fonts/helvetiker_bold.typeface.json";
import { NOISE } from "./shaders";

const FOG = "#0b1a2c";

/** World position of the kneeling avatar; the depth-of-field focuses here. */
export const CITY_FOCUS = new THREE.Vector3(-2.2, 1.6, 1.2);

/* ───────────── Towers with procedural lit windows ───────────── */
function Buildings({ lowPower }: { lowPower: boolean }) {
  const count = lowPower ? 90 : 170;
  const { geo, mat } = useMemo(() => {
    const r = rng(42);
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const inst = new THREE.InstancedBufferGeometry();
    inst.index = geo.index;
    inst.attributes = geo.attributes;
    const scales = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const offsets = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const row = i % 4;
      const z = -70 - row * 30 - r() * 18;
      const x = (r() - 0.5) * (200 + row * 70);
      const w = 6 + r() * 9;
      const d = 6 + r() * 9;
      const h = 12 + Math.pow(r(), 1.7) * (40 + row * 20);
      offsets.set([x, -0.2, z], i * 3);
      scales.set([w, h, d], i * 3);
      seeds[i] = r();
    }
    inst.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 3));
    inst.setAttribute("aScale", new THREE.InstancedBufferAttribute(scales, 3));
    inst.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
    inst.instanceCount = count;

    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uFog: { value: new THREE.Color(FOG) } },
      vertexShader: /* glsl */ `
        attribute vec3 aOffset; attribute vec3 aScale; attribute float aSeed;
        varying vec3 vLocal; varying vec3 vN; varying float vSeed; varying float vDepth; varying vec3 vScale;
        void main(){
          vLocal = position * aScale; vN = normal; vSeed = aSeed; vScale = aScale;
          vec4 wp = modelMatrix * vec4(position * aScale + aOffset, 1.);
          vec4 mv = viewMatrix * wp; vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform vec3 uFog;
        varying vec3 vLocal; varying vec3 vN; varying float vSeed; varying float vDepth; varying vec3 vScale;
        ${NOISE}
        void main(){
          // cool steel facade with vertical mullions, lighter than before so it reads through the bokeh
          float hgt = vLocal.y / max(vScale.y, 1.);
          vec3 base = mix(vec3(.035,.06,.1), vec3(.08,.12,.19), hgt) * (.8 + .4*hash12(vec2(vSeed*91.)));
          vec3 col = base;
          if (vN.y < .5) {
            vec2 uv = abs(vN.x) > .5 ? vLocal.zy : vLocal.xy;
            vec2 cell = vec2(1.6, 2.1);
            vec2 g = uv / cell; vec2 id = floor(g); vec2 f = fract(g);
            float win = step(.12,f.x)*step(f.x,.88)*step(.2,f.y)*step(f.y,.8);
            float face = floor(vN.x*2. + vN.z*3.);
            float h = hash12(id + vSeed*137. + face*11.);
            float lit = step(.68, h);
            lit = mix(lit, step(.5, hash12(id + floor(uTime*.15 + h*9.))), step(.97, hash12(id*1.7+vSeed)));
            vec3 warm = vec3(1., .8, .52); vec3 cool = vec3(.62,.8,1.);
            vec3 wc = mix(cool, warm, step(.5, hash12(id+vSeed*3.1))) * (.6 + .9*hash12(id+7.7));
            col += win * lit * wc * .52 + win * (1.-lit) * vec3(.02,.034,.055);
            // edge accent lights (blue / red strips like rooftop neon)
            float top = smoothstep(vScale.y-1.4, vScale.y-1.1, vLocal.y) * (1.-smoothstep(vScale.y-.6, vScale.y-.4, vLocal.y));
            vec3 neon = vSeed > .82 ? vec3(1.,.12,.25) : (vSeed > .6 ? vec3(.25,.5,1.) : vec3(0.));
            col += top * neon * 2.4;
            float edge = smoothstep(.45, .5, abs(fract(uv.x / (vScale.x+.001)) - .5)) ;
            col += edge * vec3(.15,.3,.6) * step(.7, vSeed) * .6;
          }
          float fogF = smoothstep(40., 260., vDepth);
          col = mix(col, uFog, .22 + fogF * .7);
          gl_FragColor = vec4(col, 1.);
        }`,
    });
    return { geo: inst, mat };
  }, [count]);

  useFrame((_, dt) => {
    mat.uniforms.uTime.value += dt;
  });
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}

/* ───────────── Rain streaks ───────────── */
function Rain({ count }: { count: number }) {
  const { geo, mat } = useMemo(() => {
    const r = rng(7);
    const pos = new Float32Array(count * 2 * 3);
    const end = new Float32Array(count * 2);
    const rand = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const x = (r() - 0.5) * 50;
      const y = r() * 30;
      const z = (r() - 0.5) * 40 - 4;
      const k = r();
      for (let j = 0; j < 2; j++) {
        pos.set([x, y, z], (i * 2 + j) * 3);
        end[i * 2 + j] = j;
        rand[i * 2 + j] = k;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aEnd", new THREE.BufferAttribute(end, 1));
    geo.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aEnd; attribute float aRand; uniform float uTime; varying float vA;
        void main(){
          vec3 p = position;
          p.y = mod(p.y - uTime * (18. + aRand*10.), 30.) - 4.;
          p.y += aEnd * (.45 + aRand*.35);
          p.x += aEnd * .05;
          vA = (1.-aEnd*.7) * (.08 + aRand*.16);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.);
        }`,
      fragmentShader: /* glsl */ `varying float vA; void main(){ gl_FragColor = vec4(.7,.82,1., vA); }`,
    });
    return { geo, mat };
  }, [count]);
  useFrame((_, dt) => {
    if (!getState().reducedMotion) mat.uniforms.uTime.value += dt;
  });
  return <lineSegments geometry={geo} material={mat} frustumCulled={false} />;
}

/* ───────────── Rusty cobblestone material (Voronoi cells) ───────────── */
export function makeStoneMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uFog: { value: new THREE.Color(FOG) }, uScale: { value: 0.55 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vP; varying float vDepth;
      void main(){ vN = normalize(mat3(modelMatrix) * normal); vP = position; vec4 mv = modelViewMatrix*vec4(position,1.); vDepth=-mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uFog; uniform float uScale; varying vec3 vN; varying vec3 vP; varying float vDepth;
      ${NOISE}
      vec2 h22(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
      // returns (F1 distance, F2-F1 edge, cell id hash)
      vec3 voronoi(vec2 x){
        vec2 n = floor(x); vec2 f = fract(x); float d1 = 8., d2 = 8.; vec2 id = vec2(0.);
        for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
          vec2 g = vec2(float(i),float(j)); vec2 o = h22(n+g); vec2 r = g + o - f; float d = dot(r,r);
          if(d<d1){ d2=d1; d1=d; id=n+g; } else if(d<d2){ d2=d; }
        }
        return vec3(sqrt(d1), sqrt(d2)-sqrt(d1), hash12(id));
      }
      void main(){
        vec3 n = normalize(vN);
        vec3 a = abs(n);
        vec2 uv = (a.x > a.y && a.x > a.z) ? vP.zy : (a.y > a.z ? vP.xz : vP.xy);
        uv *= uScale;
        vec3 v = voronoi(uv * 1.6);
        float mortar = 1. - smoothstep(.02, .09, v.y);
        float pores = smoothstep(.55, .8, fbm(uv*6.));
        vec3 amber = vec3(1., .62, .16);
        vec3 rust  = vec3(.55, .2, .04);
        vec3 c = mix(rust, amber, .45 + .55*v.z);
        c = mix(c, vec3(1., .82, .4), smoothstep(.6, 1., fbm(uv*2.5+3.)) * .5);
        c *= 1. - pores*.45;
        c = mix(c, vec3(.12,.04,.01), mortar*.85);
        float light = .45 + .55*max(dot(n, normalize(vec3(.3,.8,.6))), 0.);
        vec3 col = c * light * .92;
        col += vec3(1., .72, .35) * pow(max(n.y, 0.), 3.) * .18; // soft top-light catch on upper faces
        col = mix(col, uFog, smoothstep(30., 120., vDepth) * .35);
        gl_FragColor = vec4(col, 1.);
      }`,
  });
}

/* ───────────── Navy sculptural material for the "AWR" monoliths ───────────── */
export function makeNavyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uFog: { value: new THREE.Color(FOG) }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec3 vP; varying float vDepth;
      void main(){
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position,1.);
        vV = normalize(cameraPosition - wp.xyz);
        vP = position;
        vec4 mv = viewMatrix * wp; vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uFog; uniform float uTime;
      varying vec3 vN; varying vec3 vV; varying vec3 vP; varying float vDepth;
      ${NOISE}
      void main(){
        vec3 n = normalize(vN); vec3 v = normalize(vV);
        vec3 navy = vec3(.035,.075,.2);
        vec3 deep = vec3(.012,.025,.075);
        // brushed-metal grain + vertical gradient
        float grain = fbm(vP.xy * vec2(.6, 4.)) * .5 + .5;
        vec3 base = mix(deep, navy, smoothstep(-8., 8., vP.y)) * (.85 + grain * .3);
        // key light from upper-left, cool fill
        float key = max(dot(n, normalize(vec3(-.4,.8,.5))), 0.);
        float spec = pow(max(dot(reflect(-normalize(vec3(-.4,.8,.5)), n), v), 0.), 24.);
        vec3 col = base * (.35 + key * .9) + spec * vec3(.55,.7,1.) * .55;
        // metallic fresnel rim + bevel catch on upward faces
        float fres = pow(1. - max(dot(n, v), 0.), 3.);
        col += fres * vec3(.25,.55,1.) * .9;
        col += vec3(.4,.65,1.) * smoothstep(.75, 1., n.y) * .18;
        // slow light sweep across the surface
        float sweep = smoothstep(.0, .5, .5 - abs(fract(vP.x * .03 - uTime * .05) - .5) * 1.6);
        col += sweep * fres * vec3(.3,.6,1.) * .6;
        col = mix(col, uFog, smoothstep(40., 140., vDepth) * .35);
        gl_FragColor = vec4(col, 1.);
      }`,
  });
}

/* ───────────── Giant broken "AWR" letters ───────────── */
function Letters() {
  const group = useRef<THREE.Group>(null);
  const { letters, mat } = useMemo(() => {
    const font = new FontLoader().parse(fontJson as never);
    const mat = makeNavyMaterial();
    const spec = [
      // One intentional row: even spacing, shared baseline, restrained "broken" tilts.
      { ch: "A", pos: [-23, 1.6, -44], rot: [0.03, 0.24, -0.06] },
      { ch: "W", pos: [0, 2.4, -47], rot: [-0.04, 0, 0.035] },
      { ch: "R", pos: [23, 1.6, -44], rot: [0.03, -0.24, 0.06] },
    ] as const;
    const letters = spec.map((s) => {
      const g = new TextGeometry(s.ch, {
        font,
        size: 15,
        depth: 4.5,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.5,
        bevelSize: 0.32,
        bevelSegments: 4,
      });
      g.computeBoundingBox();
      g.center();
      return { geo: g, pos: s.pos as unknown as [number, number, number], rot: s.rot as unknown as [number, number, number] };
    });
    return { letters, mat };
  }, []);

  useFrame((state, dt) => {
    mat.uniforms.uTime.value += dt;
    if (!group.current || getState().reducedMotion) return;
    const t = state.clock.elapsedTime;
    group.current.children.slice(0, letters.length).forEach((m, i) => {
      m.position.y = letters[i].pos[1] + 7 + Math.sin(t * 0.25 + i * 2) * 0.35;
      m.rotation.z = letters[i].rot[2] + Math.sin(t * 0.18 + i) * 0.015;
    });
  });

  return (
    <group ref={group}>
      {letters.map((l, i) => (
        <mesh key={i} geometry={l.geo} material={mat} position={[l.pos[0], l.pos[1] + 7, l.pos[2]]} rotation={l.rot} />
      ))}
      <Debris mat={mat} />
    </group>
  );
}

/** A few broken chunks orbiting the letters. */
function Debris({ mat }: { mat: THREE.ShaderMaterial }) {
  const ref = useRef<THREE.Group>(null);
  const chunks = useMemo(() => {
    const r = rng(99);
    return Array.from({ length: 7 }, (_, i) => ({
      pos: [(i % 2 ? 1 : -1) * (12 + r() * 28), 10 + r() * 14, -30 - r() * 20] as [number, number, number],
      scale: [2 + r() * 4, 1.5 + r() * 2.5, 1.4 + r() * 2.2] as [number, number, number],
      rot: [r() * 3, r() * 3, r() * 3] as [number, number, number],
      sp: 0.08 + r() * 0.2,
    }));
  }, []);
  useFrame((_, dt) => {
    if (!ref.current || getState().reducedMotion) return;
    ref.current.children.forEach((m, i) => {
      m.rotation.x += dt * chunks[i].sp * 0.4;
      m.rotation.y += dt * chunks[i].sp * 0.6;
    });
  });
  return (
    <group ref={ref}>
      {chunks.map((c, i) => (
        <mesh key={i} position={c.pos} rotation={c.rot} scale={c.scale} material={mat}>
          <dodecahedronGeometry args={[0.6, 0]} />
        </mesh>
      ))}
    </group>
  );
}

/* ───────────── Wet concrete with planar reflections ───────────── */
function WetGround({ lowPower }: { lowPower: boolean }) {
  const reflector = useMemo(() => {
    if (lowPower) return null;
    const r = new Reflector(new THREE.PlaneGeometry(400, 260), {
      textureWidth: 1024,
      textureHeight: 1024,
      clipBias: 0.003,
      shader: {
        name: "WetConcrete",
        uniforms: {
          color: { value: new THREE.Color(0x7f7f7f) },
          tDiffuse: { value: null },
          textureMatrix: { value: null },
          uTime: { value: 0 },
          uFog: { value: new THREE.Color(FOG) },
        },
        vertexShader: /* glsl */ `
          uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW; varying float vDepth;
          void main(){
            vUv = textureMatrix * vec4(position, 1.);
            vW = (modelMatrix * vec4(position,1.)).xyz;
            vec4 mv = modelViewMatrix * vec4(position, 1.); vDepth = -mv.z;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D tDiffuse; uniform float uTime; uniform vec3 uFog;
          varying vec4 vUv; varying vec3 vW; varying float vDepth;
          ${NOISE}
          void main(){
            vec2 p = vW.xz;
            float puddle = smoothstep(.42, .62, fbm(p*.12 + 7.));          // wet patches
            float grain = fbm(p*1.7) * .6 + fbm(p*7.) * .4;                 // concrete grain
            vec2 ripple = vec2(fbm(p*2.2 + uTime*.35), fbm(p*2.2 - uTime*.3 + 4.)) - .5;
            vec4 uv = vUv;
            uv.xy += ripple * (.05 - puddle*.035) * uv.w;
            vec3 refl = texture2DProj(tDiffuse, uv).rgb;
            // blur-ish: sample a few offsets for the rough (non-puddle) areas
            vec3 r2 = texture2DProj(tDiffuse, uv + vec4(.012,.0,0.,0.)*uv.w).rgb + texture2DProj(tDiffuse, uv + vec4(-.012,.008,0.,0.)*uv.w).rgb;
            refl = mix((refl + r2)/3., refl, puddle);
            vec3 concrete = vec3(.055,.062,.072) * (.6 + grain*.8);
            float reflAmt = mix(.32, .85, puddle);
            vec3 col = concrete + refl * reflAmt;
            col = mix(col, uFog, smoothstep(30., 200., vDepth) * .8);
            gl_FragColor = vec4(col, 1.);
          }`,
      },
    });
    r.rotation.x = -Math.PI / 2;
    r.position.set(0, -0.2, -40);
    return r;
  }, [lowPower]);

  useEffect(() => () => reflector?.dispose(), [reflector]);
  useFrame((_, dt) => {
    if (reflector) (reflector.material as THREE.ShaderMaterial).uniforms.uTime.value += dt;
  });

  if (!reflector)
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, -40]}>
        <planeGeometry args={[400, 260]} />
        <meshBasicMaterial color="#0b1018" />
      </mesh>
    );
  return <primitive object={reflector} />;
}

/* ───────────── Interactive hologram floating above the avatar's hands ───────────── */
function Hologram({ hitRef }: { hitRef: React.MutableRefObject<THREE.Mesh | null> }) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.34, 0)), []);
  const edgeMat = useMemo(() => new THREE.LineBasicMaterial({ color: "#bff6ff", transparent: true, toneMapped: false }), []);
  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#3dffa8", transparent: true, opacity: 0.85, toneMapped: false }), []);
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#7fd6ff", transparent: true, opacity: 0.55, toneMapped: false, side: THREE.DoubleSide }), []);
  const cyan = useMemo(() => new THREE.Color("#3dffa8"), []);
  const gold = useMemo(() => new THREE.Color("#ffd27a"), []);
  const speed = useRef(0.6);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const hovered = heroBridge.hover === "artifact";
    const surge = Math.max(0, 1 - (nowS() - heroBridge.surgeAt) / 1.2);
    // follow the hands, floating above them
    const h = heroBridge.hands;
    g.position.x = THREE.MathUtils.damp(g.position.x, h.x, 5, dt);
    g.position.y = THREE.MathUtils.damp(g.position.y, h.y + 0.75 + Math.sin(t * 1.3) * 0.06, 5, dt);
    g.position.z = THREE.MathUtils.damp(g.position.z, h.z, 5, dt);
    speed.current = THREE.MathUtils.damp(speed.current, hovered ? 3.2 : 0.6, 4, dt) + surge * 0.4;
    if (spin.current && !getState().reducedMotion) {
      spin.current.rotation.y += dt * speed.current;
      spin.current.rotation.x = Math.sin(t * 0.7) * 0.25;
    }
    if (ringA.current) ringA.current.rotation.z += dt * speed.current * 0.7;
    if (ringB.current) ringB.current.rotation.x += dt * speed.current * 0.5;
    const s = 1 + (hovered ? 0.18 : 0) + surge * 0.35;
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, s, 8, dt));
    coreMat.color.copy(cyan).lerp(gold, surge);
    coreMat.opacity = 0.55 + (hovered ? 0.35 : 0) + surge * 0.3;
    edgeMat.opacity = 0.7 + (hovered ? 0.3 : 0);
    ringMat.opacity = 0.35 + (hovered ? 0.35 : 0) + surge * 0.4;
  });

  return (
    <group ref={group} position={[heroBridge.hands.x, heroBridge.hands.y + 0.75, heroBridge.hands.z]}>
      <group ref={spin}>
        <lineSegments geometry={edges} material={edgeMat} />
        <mesh material={coreMat} scale={0.42}>
          <octahedronGeometry args={[0.34, 0]} />
        </mesh>
      </group>
      <mesh ref={ringA} material={ringMat} rotation={[Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[0.56, 0.006, 6, 96]} />
      </mesh>
      <mesh ref={ringB} material={ringMat} rotation={[0, Math.PI / 3, 0]}>
        <torusGeometry args={[0.66, 0.004, 6, 96]} />
      </mesh>
      <pointLight color="#5fe8ff" intensity={6} distance={4} />
      {/* invisible hit sphere for picking */}
      <mesh ref={hitRef} visible={false}>
        <sphereGeometry args={[0.75, 12, 12]} />
      </mesh>
    </group>
  );
}

/* ───────────── Energy surge: shockwave ring rippling across the wet floor ───────────── */
function Shockwave() {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uK: { value: 1 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: /* glsl */ `
          uniform float uK; varying vec2 vUv;
          void main(){
            float r = length(vUv - .5) * 2.;
            float ring = smoothstep(.06, .0, abs(r - uK)) * (1. - uK);
            float inner = smoothstep(uK, 0., r) * (1. - uK) * .15;
            vec3 c = mix(vec3(.25,.9,1.), vec3(1.,.82,.45), .35);
            gl_FragColor = vec4(c, ring + inner);
          }`,
      }),
    [],
  );
  useFrame(() => {
    const k = (nowS() - heroBridge.surgeAt) / 1.4;
    const m = ref.current;
    if (!m) return;
    m.visible = k >= 0 && k < 1;
    mat.uniforms.uK.value = Math.min(1, Math.max(0, k));
  });
  return (
    <mesh ref={ref} material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[CITY_FOCUS.x, -0.16, CITY_FOCUS.z]} visible={false}>
      <planeGeometry args={[16, 16]} />
    </mesh>
  );
}

/** Registers the hero raycast picker (hologram first, then the avatar proxy). */
function HeroPicker({ artifact, avatar }: { artifact: React.MutableRefObject<THREE.Mesh | null>; avatar: React.MutableRefObject<THREE.Mesh | null> }) {
  const { camera } = useThree();
  useEffect(() => {
    const ray = new THREE.Raycaster();
    const v = new THREE.Vector2();
    heroBridge.pick = (x, y) => {
      v.set(x, y);
      ray.setFromCamera(v, camera);
      if (artifact.current && ray.intersectObject(artifact.current, false).length) return "artifact";
      if (avatar.current && ray.intersectObject(avatar.current, false).length) return "avatar";
      return null;
    };
    return () => {
      heroBridge.pick = null;
      heroBridge.hover = null;
    };
  }, [camera, artifact, avatar]);
  return null;
}

/* ───────────── Separation light for the avatar (backlight + ground contact) ───────────── */
function radialTexture(inner: string, outer = "rgba(0,0,0,0)") {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function AvatarLight() {
  const back = useMemo(
    () => new THREE.SpriteMaterial({ map: radialTexture("rgba(70,130,220,0.55)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    [],
  );
  const ground = useMemo(
    () => new THREE.MeshBasicMaterial({ map: radialTexture("rgba(60,255,160,0.35)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    [],
  );
  return (
    <>
      <sprite material={back} position={[CITY_FOCUS.x - 0.4, CITY_FOCUS.y + 0.4, CITY_FOCUS.z - 2.2]} scale={[7.5, 7.5, 1]} />
      <mesh material={ground} rotation={[-Math.PI / 2, 0, 0]} position={[CITY_FOCUS.x, -0.17, CITY_FOCUS.z]}>
        <planeGeometry args={[4.2, 2.6]} />
      </mesh>
    </>
  );
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const lerpV = (a: THREE.Vector3, b: THREE.Vector3, t: number) => a.clone().lerp(b, t);
const ease = (t: number) => t * t * (3 - 2 * t);

export default function CityScene({ mode, lowPower }: { mode: "hero" | "about" | "contact"; lowPower: boolean }) {
  const artifactHit = useRef<THREE.Mesh | null>(null);
  const avatarHit = useRef<THREE.Mesh | null>(null);
  // Portrait screens: swing the camera toward the avatar and pull back so it stays in frame.
  const portrait = useThree((s) => s.size.width / Math.max(1, s.size.height)) < 0.9;
  useCameraRig(
    (p, t) => {
      const e = ease(p);
      // Click on the avatar → brief camera focus pull toward it
      const fk = Math.min(1, Math.max(0, nowS() - heroBridge.focusAt) / 1.8);
      const pull = mode !== "contact" && fk < 1 ? Math.sin(Math.PI * fk) * 0.28 : 0;
      const toward = (pos: THREE.Vector3, look: THREE.Vector3) => ({
        pos: pos.lerp(CITY_FOCUS, pull),
        look: look.lerp(CITY_FOCUS, pull * 0.8),
      });
      if (mode === "hero") return toward(lerpV(V(1.6, 1.8, 15), V(1.3, 1.5, 11), e), V(-0.3, 3.2, -10));
      if (mode === "about")
        return portrait
          ? toward(lerpV(V(-0.6, 1.6, 13), V(-1.2, 1.4, 10.5), e), lerpV(V(-1.6, 3, -10), V(-2.2, 2.3, -4), e))
          : toward(lerpV(V(1.3, 1.5, 11), V(0.7, 1.05, 6.9), e), lerpV(V(-0.3, 3.2, -10), V(-1.5, 1.45, 0), e));
      const a = t * 0.03;
      return { pos: lerpV(V(Math.sin(a) * 4, 7, 22), V(Math.sin(a) * 4, 12, 16), e), look: V(0, 6, -40) };
    },
    mode === "contact" ? 1.2 : 0.85,
  );

  return (
    <>
      <color attach="background" args={[FOG]} />
      <fog attach="fog" args={[FOG, 40, 260]} />
      <Sky
        top={mode === "contact" ? "#120914" : "#0b1a2e"}
        horizon={mode === "contact" ? "#34182a" : "#21405f"}
        bottom="#0a1019"
        clouds={1.6}
      />
      <Buildings lowPower={lowPower} />
      {mode !== "contact" && <Letters />}
      {mode !== "contact" && (
        <Suspense fallback={null}>
          <Avatar
            pose="kneel"
            position={[CITY_FOCUS.x, 0.15, CITY_FOCUS.z]}
            rotationY={0.55}
            scale={1.65}
            material={{ vein: "#2bff7a", veinAmt: 0.9, rim: 1.1 }}
            role="hero"
          />
        </Suspense>
      )}
      {mode !== "contact" && (
        <>
          <Hologram hitRef={artifactHit} />
          <Shockwave />
          {/* invisible proxy for hovering/clicking the kneeling avatar */}
          <mesh ref={avatarHit} visible={false} position={[CITY_FOCUS.x, 1.65, CITY_FOCUS.z]}>
            <boxGeometry args={[1.3, 3.1, 1.1]} />
          </mesh>
          <HeroPicker artifact={artifactHit} avatar={avatarHit} />
        </>
      )}
      {mode !== "contact" && <AvatarLight />}
      <WetGround lowPower={lowPower} />
      <Rain count={lowPower ? 450 : 1200} />
      <Dust count={lowPower ? 60 : 140} color="#cfe3ff" size={0.22} spread={[50, 16, 30]} center={[0, 7, -6]} />
    </>
  );
}
