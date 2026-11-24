"use client";

import Lenis from "lenis";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { lockScroll, measureSections, setLenis, updateScroll } from "@/lib/scroll";
import { setMood, whoosh } from "@/lib/sound";
import { frame, getState, setState, useApp } from "@/lib/store";
import AboutVideo from "./AboutVideo";
import ChatWidget from "./chat/ChatWidget";
import CursorReticle from "./CursorReticle";
import Hud from "./Hud";
import Loader from "./Loader";
import { MemoriesSection, MemoryForm, MemoryReader } from "./Memories";
import Menu from "./Menu";
import Overlays from "./Overlays";
import { About, Contact, Hero, Timeline, Vault, Works } from "./Sections";

const SceneCanvas = dynamic(() => import("./three/SceneCanvas"), { ssr: false });

function detectDevice() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  const params = new URLSearchParams(location.search);
  const lowPower =
    !params.has("hq") &&
    ((coarse && small) ||
    (nav.hardwareConcurrency ?? 8) <= 4 ||
    (nav.deviceMemory ?? 8) <= 4 ||
    !!nav.connection?.saveData ||
      params.has("lite"));
  let webglOk = false;
  try {
    const c = document.createElement("canvas");
    webglOk = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {}
  return { reducedMotion, lowPower, webglOk };
}

export default function Experience() {
  const entered = useApp((s) => s.entered);
  const dipRef = useRef<HTMLDivElement>(null);

  // Device capabilities
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    setState(detectDevice());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setState({ reducedMotion: mq.matches });
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  // Smooth scroll + section tracking
  useEffect(() => {
    const reduced = getState().reducedMotion;
    const lenis = reduced ? null : new Lenis({ lerp: 0.1, smoothWheel: true });
    setLenis(lenis);
    let raf = 0;
    let lastSection = getState().activeSection;

    const onScroll = () => {
      updateScroll(window.scrollY, getState().reducedMotion);
      const cur = getState().activeSection;
      if (cur !== lastSection) {
        lastSection = cur;
        whoosh();
        setMood(cur);
      }
    };
    const loop = (t: number) => {
      lenis?.raf(t);
      if (dipRef.current) dipRef.current.style.opacity = String(frame.dip);
      raf = requestAnimationFrame(loop);
    };
    const onResize = () => {
      measureSections();
      onScroll();
    };
    const onPointer = (e: PointerEvent) => {
      frame.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      frame.pointerY = -((e.clientY / window.innerHeight) * 2 - 1);
    };

    measureSections();
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    const ro = new ResizeObserver(onResize);
    ro.observe(document.body);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      ro.disconnect();
      lenis?.destroy();
      setLenis(null);
    };
  }, []);

  // Lock scroll until ENTER
  useEffect(() => {
    lockScroll(!entered);
    if (entered) measureSections();
  }, [entered]);

  return (
    <>
      <SceneCanvas />
      {/* Black dip between sections (scene swap happens at full black) */}
      <div ref={dipRef} aria-hidden className="pointer-events-none fixed inset-0 z-[5] bg-black" style={{ opacity: 0 }} />
      {/* Soft vignette/scrim for text legibility over scenes */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[6]"
        style={{ background: "radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,.55) 100%)" }}
      />
      {/* Cinematic edge grades: keep HUD (top) and captions/contact (bottom) legible over bright scenes */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[6] h-[150px]"
        style={{ background: "linear-gradient(to bottom, rgba(1,4,9,.62) 0%, rgba(1,4,9,.28) 55%, transparent 100%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[6] h-[190px]"
        style={{ background: "linear-gradient(to top, rgba(1,4,9,.7) 0%, rgba(1,4,9,.3) 55%, transparent 100%)" }}
      />
      <main className="relative z-10">
        <Hero />
        <About />
        <Works />
        <Timeline />
        <Vault />
        <MemoriesSection />
        <Contact />
      </main>
      <Hud />
      <Menu />
      <AboutVideo />
      <Overlays />
      <MemoryForm />
      <MemoryReader />
      <ChatWidget />
      <Loader />
      <CursorReticle />
    </>
  );
}
