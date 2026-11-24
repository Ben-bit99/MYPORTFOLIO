"use client";
/**
 * Interactive holographic certificate.
 *  - At rest: a cold halftone / scan-line hologram of the certificate.
 *  - Pointer: a fluid "lens" trail (ping-pong render target) reveals the real,
 *    full-colour certificate, magnified, with chromatic fringing along the
 *    motion and a glowing cyan edge.
 *  - Card tilts in 3D toward the pointer with a moving glare.
 *  - Idle: the lens drifts on its own so touch users / screenshots still see it.
 * Raw three.js (no R3F) so it is a light, self-contained second context.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { click, tick } from "@/lib/sound";
import { getState } from "@/lib/store";

const TRAIL_FRAG = /* glsl */ `
uniform sampler2D uPrev; uniform vec2 uMouse; uniform vec2 uVel; uniform float uAspect; uniform float uActive; uniform float uRadius;
varying vec2 vUv;
void main(){
  vec4 prev = texture2D(uPrev, vUv - uVel*.015);  // advect slightly with motion
  vec2 d = vUv - uMouse; d.x *= uAspect;
  float splat = exp(-dot(d,d) / (uRadius*uRadius)) * uActive;
  float r = max(prev.r * .965, splat);
  vec2 vel = mix(prev.gb * .94, uVel * 8., splat);
  gl_FragColor = vec4(r, vel, 1.);
}`;

const MAIN_FRAG = /* glsl */ `
uniform sampler2D uMap; uniform sampler2D uTrail; uniform vec2 uRes; uniform vec2 uMouse; uniform float uTime; uniform float uHas;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  vec4 tr = texture2D(uTrail, vUv);
  float m = smoothstep(.05, .32, tr.r);
  vec2 vel = tr.gb;

  // ── hologram base: halftone dots from luminance ──
  vec3 src = uHas > .5 ? texture2D(uMap, vUv).rgb : vec3(.2);
  float lum = dot(src, vec3(.299,.587,.114));
  float cell = 5.5;
  vec2 px = vUv * uRes;
  vec2 c = (floor(px / cell) + .5) * cell;
  float lumC = uHas > .5 ? dot(texture2D(uMap, c / uRes).rgb, vec3(.299,.587,.114)) : .2;
  float dotR = cell * .55 * sqrt(lumC);
  float dotMask = 1. - smoothstep(dotR - .8, dotR + .4, length(px - c));
  vec3 holo = mix(vec3(.008,.02,.04), vec3(.55,.74,.88), dotMask * (.25 + lumC*.85));
  holo += vec3(.2,.4,.55) * lum * .1;                                      // faint underlying image
  float scan = .88 + .12 * sin(px.y * 1.6 + uTime * 6.);
  float band = smoothstep(.0, .02, .02 - abs(fract(vUv.y * .5 - uTime * .07) - .5) * .04);
  holo = holo * scan + band * vec3(.3,.7,.9) * .35;
  float glitchRow = step(.985, hash(vec2(floor(vUv.y * 60.), floor(uTime * 8.))));
  holo.r += glitchRow * .15;
  holo += (hash(px + uTime) - .5) * .04;

  // ── revealed: magnified, chromatic, distorted by the trail ──
  vec2 toM = vUv - uMouse;
  vec2 ruv = vUv - toM * .12 * m - vel * .02 * m;
  vec2 ca = vel * .006 + toM * .01;
  vec3 real = uHas > .5 ? vec3(texture2D(uMap, ruv + ca).r, texture2D(uMap, ruv).g, texture2D(uMap, ruv - ca).b) : vec3(.3);
  real *= 1.05 + .1 * m;

  vec3 col = mix(holo, real, m);
  // glowing lens edge
  float edge = smoothstep(.03, .08, tr.r) * (1. - smoothstep(.08, .16, tr.r));
  col += edge * vec3(.35, .95, 1.) * .55;
  // frame
  vec2 b = min(vUv, 1. - vUv);
  float frame = 1. - smoothstep(.0, .006, min(b.x, b.y * uRes.x / uRes.y));
  col += frame * vec3(.5, .9, 1.) * .6;
  gl_FragColor = vec4(col, 1.);
}`;

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

export default function HoloCertificate({ src, alt, onOpen }: { src: string; alt: string; onOpen?: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const glare = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = wrap.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
    } catch {
      // No WebGL: show the plain image (deferred so it isn't a sync setState in the effect)
      queueMicrotask(() => setFailed(true));
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    host.appendChild(renderer.domElement);

    const cam = new THREE.Camera();
    const quad = new THREE.PlaneGeometry(2, 2);
    const mkRT = () =>
      new THREE.WebGLRenderTarget(256, 192, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    let rtA = mkRT();
    let rtB = mkRT();

    const trailMat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: TRAIL_FRAG,
      uniforms: {
        uPrev: { value: rtA.texture },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uVel: { value: new THREE.Vector2() },
        uAspect: { value: 1.414 },
        uActive: { value: 0 },
        uRadius: { value: 0.11 },
      },
    });
    const mainMat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: MAIN_FRAG,
      uniforms: {
        uMap: { value: null as THREE.Texture | null },
        uTrail: { value: rtB.texture },
        uRes: { value: new THREE.Vector2(1, 1) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uTime: { value: 0 },
        uHas: { value: 0 },
      },
    });
    const trailScene = new THREE.Scene();
    trailScene.add(new THREE.Mesh(quad, trailMat));
    const mainScene = new THREE.Scene();
    mainScene.add(new THREE.Mesh(quad, mainMat));

    new THREE.TextureLoader().load(
      src,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.anisotropy = 4;
        mainMat.uniforms.uMap.value = t;
        mainMat.uniforms.uHas.value = 1;
      },
      undefined,
      () => setFailed(true),
    );

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h, false);
      const pr = renderer.getPixelRatio();
      mainMat.uniforms.uRes.value.set(w * pr, h * pr);
      trailMat.uniforms.uAspect.value = w / Math.max(1, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // Pointer state
    const mouse = new THREE.Vector2(0.5, 0.5);
    const last = new THREE.Vector2(0.5, 0.5);
    let hovering = false;
    let lastMove = -1e9;
    let tiltX = 0;
    let tiltY = 0;
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      mouse.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
      hovering = true;
      lastMove = performance.now();
    };
    const onLeave = () => {
      hovering = false;
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerdown", onMove);
    host.addEventListener("pointerleave", onLeave);

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 });
    io.observe(host);

    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const reduced = getState().reducedMotion;
      mainMat.uniforms.uTime.value = reduced ? 0 : t;

      // Idle autopilot: a slow Lissajous lens when nobody is touching it
      const idle = !hovering && performance.now() - lastMove > 1800 && !reduced;
      if (idle) mouse.set(0.5 + Math.sin(t * 0.55) * 0.34, 0.5 + Math.sin(t * 0.9 + 1) * 0.28);
      const vel = mouse.clone().sub(last);
      last.copy(mouse);

      trailMat.uniforms.uPrev.value = rtA.texture;
      trailMat.uniforms.uMouse.value.copy(mouse);
      trailMat.uniforms.uVel.value.copy(vel);
      trailMat.uniforms.uActive.value = hovering || idle ? 1 : 0;
      trailMat.uniforms.uRadius.value = hovering ? 0.16 : 0.11;
      renderer.setRenderTarget(rtB);
      renderer.render(trailScene, cam);
      renderer.setRenderTarget(null);
      mainMat.uniforms.uTrail.value = rtB.texture;
      mainMat.uniforms.uMouse.value.copy(mouse);
      renderer.render(mainScene, cam);
      [rtA, rtB] = [rtB, rtA];

      // 3D tilt + glare (DOM)
      const tx = hovering && !reduced ? (mouse.y - 0.5) * 14 : 0;
      const ty = hovering && !reduced ? (mouse.x - 0.5) * -18 : 0;
      tiltX += (tx - tiltX) * Math.min(1, dt * 6);
      tiltY += (ty - tiltY) * Math.min(1, dt * 6);
      if (card.current) card.current.style.transform = `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
      if (glare.current) {
        glare.current.style.opacity = hovering ? "1" : "0";
        glare.current.style.background = `radial-gradient(600px circle at ${(mouse.x * 100).toFixed(1)}% ${((1 - mouse.y) * 100).toFixed(1)}%, rgba(160,240,255,.16), transparent 45%)`;
      }
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onMove);
      host.removeEventListener("pointerleave", onLeave);
      rtA.dispose();
      rtB.dispose();
      trailMat.dispose();
      mainMat.dispose();
      (mainMat.uniforms.uMap.value as THREE.Texture | null)?.dispose();
      quad.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [src]);

  return (
    <div className="w-full [perspective:1100px]">
      <div ref={card} className="relative w-full transition-[box-shadow] duration-500 will-change-transform [transform-style:preserve-3d]">
        <button
          type="button"
          onClick={() => {
            click();
            onOpen?.();
          }}
          onMouseEnter={tick}
          aria-label={`${alt}. Open full size.`}
          className="hud-frame group relative block aspect-[2000/1414] w-full cursor-crosshair overflow-hidden bg-[#020910] shadow-[0_0_80px_rgba(60,200,230,.18)]"
        >
          <span className="hud-line" />
          <span className="hud-line" />
          <span className="hud-line" />
          <span className="hud-line" />
          <div ref={wrap} className="absolute inset-0" aria-hidden />
          {failed && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div ref={glare} aria-hidden className="pointer-events-none absolute inset-0 opacity-0 mix-blend-screen transition-opacity duration-300" />
          <span className="pointer-events-none absolute bottom-2 right-2 bg-black/60 px-2 py-1 text-[11px] uppercase tracking-[0.1em] text-[#7fd6df] opacity-80" data-font-bold>
            [ hover to decode // click to open ]
          </span>
        </button>
      </div>
    </div>
  );
}
