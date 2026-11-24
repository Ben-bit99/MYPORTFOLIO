"use client";
/**
 * Desktop-only HUD cursor: exact dot + damped ring that expands over interactive
 * targets with a contextual micro-label. Off on touch / coarse pointers and with
 * prefers-reduced-motion. Text fields keep the native caret.
 */
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";

function labelFor(el: Element | null): string | null | "hide" {
  if (!el) return null;
  if (el.closest("input, textarea, select, [contenteditable=true]")) return "hide";
  const tagged = el.closest<HTMLElement>("[data-cursor]");
  const target = el.closest<HTMLElement>("button, a[href], video, [role=button], summary");
  // An interactive element nested inside a tagged stage wins over the stage tag.
  if (target && (!tagged || tagged.contains(target))) {
    if (target.dataset.cursor) return target.dataset.cursor;
    if (target.tagName === "VIDEO" || /\bplay\b/i.test(target.getAttribute("aria-label") ?? "")) return "PLAY";
    if (target.tagName === "A") return target.hasAttribute("download") ? "DOWNLOAD" : "VIEW";
    return "INTERACT";
  }
  return tagged?.dataset.cursor || null;
}

export default function CursorReticle() {
  const reduced = useApp((s) => s.reducedMotion);
  const entered = useApp((s) => s.entered);
  const [enabled, setEnabled] = useState(false);
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (hover: hover)");
    const update = () => setEnabled(mq.matches && !reduced);
    const t = setTimeout(update, 0);
    mq.addEventListener("change", update);
    return () => {
      clearTimeout(t);
      mq.removeEventListener("change", update);
    };
  }, [reduced]);

  useEffect(() => {
    const root = document.documentElement;
    if (!enabled) {
      root.classList.remove("has-reticle");
      return;
    }
    root.classList.add("has-reticle");
    let x = -100,
      y = -100,
      rx = -100,
      ry = -100,
      scale = 1,
      targetScale = 1,
      visible = false,
      hidden = false,
      raf = 0,
      lastLabel: string | null = null;

    const setLabel = (l: string | null) => {
      if (l === lastLabel) return;
      lastLabel = l;
      if (tag.current) {
        tag.current.textContent = l ? `[ ${l} ]` : "";
        tag.current.style.opacity = l ? "1" : "0";
      }
      ring.current?.classList.toggle("is-active", !!l);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      if (!visible) {
        rx = x;
        ry = y;
        visible = true;
      }
      const l = labelFor(e.target as Element);
      hidden = l === "hide";
      setLabel(hidden ? null : l);
      targetScale = l && !hidden ? 1.7 : 1;
    };
    const onLeave = () => (visible = false);
    const onDown = () => (scale = 0.75);
    const onOver = (e: PointerEvent) => onMove(e);

    const loop = () => {
      rx += (x - rx) * 0.22;
      ry += (y - ry) * 0.22;
      scale += (targetScale - scale) * 0.18;
      const o = visible && !hidden ? "1" : "0";
      if (dot.current) {
        dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        dot.current.style.opacity = o;
      }
      if (ring.current) {
        ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) scale(${scale.toFixed(3)})`;
        ring.current.style.opacity = o;
      }
      if (tag.current) tag.current.style.transform = `translate3d(${rx + 26}px, ${ry + 18}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      root.classList.remove("has-reticle");
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div aria-hidden className={`pointer-events-none fixed inset-0 z-[2000] transition-opacity duration-500 ${entered ? "" : "opacity-60"}`}>
      <div ref={ring} className="reticle-ring" />
      <div ref={dot} className="reticle-dot" />
      <span ref={tag} className="reticle-tag" data-font-bold />
    </div>
  );
}
