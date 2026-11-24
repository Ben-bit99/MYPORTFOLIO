"use client";

import type Lenis from "lenis";
import { frame, setState } from "./store";

let lenis: Lenis | null = null;

export function setLenis(l: Lenis | null) {
  lenis = l;
}

export function scrollToSection(id: string, immediate = false) {
  const el = document.getElementById(id);
  if (!el) return;
  // Land a little into the section so its content is already revealed.
  const offset = id === "hero" ? 0 : Math.min(window.innerHeight * 0.35, el.offsetHeight * 0.2);
  const y = el.offsetTop + offset;
  if (lenis) lenis.scrollTo(y, { immediate, duration: immediate ? 0 : 1.6 });
  else window.scrollTo({ top: y, behavior: immediate ? "auto" : "smooth" });
}

/** Scroll to an absolute Y (smooth unless immediate). */
export function scrollToY(y: number, immediate = false) {
  if (lenis) lenis.scrollTo(y, { immediate, duration: immediate ? 0 : 1.2 });
  else window.scrollTo({ top: y, behavior: immediate ? "auto" : "smooth" });
}

export function lockScroll(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  document.body.classList.toggle("is-locked", locked);
}

/** Measures sections (call on resize / layout change). */
export function measureSections() {
  const els = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));
  frame.sections = els.map((el) => ({
    id: el.dataset.section as (typeof frame.sections)[number]["id"],
    top: el.offsetTop,
    height: el.offsetHeight,
  }));
  frame.viewportH = window.innerHeight;
}

/** Updates active section, local progress and the boundary "dip" value. */
export function updateScroll(y: number, reducedMotion: boolean) {
  frame.scrollY = y;
  const vh = frame.viewportH;
  const center = y + vh / 2;
  const secs = frame.sections;
  if (!secs.length) return;
  let idx = secs.findIndex((s) => center >= s.top && center < s.top + s.height);
  if (idx < 0) idx = center < secs[0].top ? 0 : secs.length - 1;
  const s = secs[idx];
  const track = Math.max(1, s.height - vh);
  frame.progress = Math.min(1, Math.max(0, (y - s.top) / track));

  if (reducedMotion) {
    frame.dip = 0;
  } else {
    let d = Infinity;
    for (let i = 1; i < secs.length; i++) d = Math.min(d, Math.abs(center - secs[i].top));
    const x = Math.min(1, d / (vh * 0.28));
    frame.dip = 1 - x * x * (3 - 2 * x);
  }
  setState({ activeSection: s.id });
}
