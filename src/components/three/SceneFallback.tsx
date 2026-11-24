"use client";

import { useApp } from "@/lib/store";

/** CSS-only backdrop used when WebGL is unavailable or the canvas crashes. */
const GRADIENTS: Record<string, string> = {
  hero: "radial-gradient(120% 80% at 50% 110%, #1b3a57 0%, #0b1724 45%, #000 100%)",
  about: "radial-gradient(90% 70% at 30% 70%, #3a2408 0%, #0b1724 45%, #000 100%)",
  works: "radial-gradient(100% 80% at 50% 60%, #0b3f7a 0%, #04142a 50%, #000 100%)",
  timeline: "radial-gradient(100% 60% at 50% 55%, #1a2233 0%, #05070d 60%, #000 100%)",
  vault:
    "linear-gradient(rgba(95,208,224,.08) 1px, transparent 1px) 0 0/48px 48px, linear-gradient(90deg, rgba(95,208,224,.08) 1px, transparent 1px) 0 0/48px 48px, radial-gradient(80% 60% at 50% 50%, #0c2a30 0%, #010608 70%)",
  memories:
    "linear-gradient(rgba(95,208,224,.1) 1px, transparent 1px) 0 0/64px 64px, linear-gradient(90deg, rgba(95,208,224,.1) 1px, transparent 1px) 0 0/64px 64px, radial-gradient(70% 60% at 40% 45%, #0f3a42 0%, #010608 70%)",
  contact: "radial-gradient(120% 80% at 50% 110%, #3a1a2e 0%, #120914 45%, #000 100%)",
};

export default function SceneFallback() {
  const section = useApp((s) => s.activeSection);
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-0 transition-[background] duration-700"
      style={{ background: GRADIENTS[section] ?? GRADIENTS.hero }}
    />
  );
}
