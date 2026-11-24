"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { profile } from "@/data/portfolio";
import { setSoundEnabled } from "@/lib/sound";
import { getState, setState, useApp } from "@/lib/store";
import HudButton from "./ui/HudButton";

const pad = (n: number) => String(n).padStart(2, "0");

function enter() {
  let soundPref = true;
  try {
    soundPref = localStorage.getItem("awr-sound") !== "off";
  } catch {}
  setState({ entered: true, soundOn: soundPref });
  setSoundEnabled(soundPref);
}

/**
 * Preloader: the live scene seen through a blurred square window, bracket
 * caption with percentage, manifesto lines and an ENTER button (unlocks
 * sound + scroll, as audio needs a user gesture).
 */
export default function Loader() {
  const entered = useApp((s) => s.entered);
  const [pct, setPct] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let raf = 0;
    let assetsReady = false;
    const start = performance.now();
    const minMs = getState().reducedMotion ? 300 : 2200;
    const done = () => (assetsReady = true);
    Promise.all([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise<void>((r) => (document.readyState === "complete" ? r() : window.addEventListener("load", () => r(), { once: true }))),
    ]).then(done, done);
    const loop = (now: number) => {
      const t = Math.min(1, (now - start) / minMs);
      // ease toward 90% until assets are ready, then finish
      const target = assetsReady ? t : Math.min(t, 0.9);
      const v = Math.round((1 - Math.pow(1 - target, 2)) * 100);
      setPct(v);
      if (v >= 100) {
        setReady(true);
        setState({ loaded: true });
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!ready || entered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") enter();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, entered]);


  return (
    <AnimatePresence>
      {!entered && (
        <motion.div
          key="loader"
          className="fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] } }}
          role="dialog"
          aria-modal="true"
          aria-label="Loading"
        >
          {/* blurred scene window */}
          <div
            className="relative h-[100svh] w-full md:aspect-square md:h-[100vh] md:max-h-[100vw] md:w-auto md:max-w-[100vw]"
            style={{ boxShadow: "0 0 0 200vmax #000", backdropFilter: "blur(20px) saturate(1.1)", WebkitBackdropFilter: "blur(20px)" }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(closest-side, rgba(0,0,0,0) 45%, rgba(0,0,0,.65) 85%, #000 100%)" }}
            />
            <div className="absolute left-4 top-[10%] z-10 whitespace-pre text-loader-cap md:left-8" data-font-bold aria-live="polite">
              <p>[[</p>
              <p>
                {"   ["}
                <span className="text-loader-hl">loading</span>]
              </p>
              <p>{"    ]]]"}</p>
              <p>
                {"        ["}
                <span className="text-loader-pct">{pad(pct)}%</span>]
              </p>
              <p>{"  [[[][]"}</p>
            </div>

            <div className="absolute bottom-[7%] left-8 right-8 z-10 md:left-[48%] md:right-6" data-font-bold>
              {profile.loaderLines.map((l) => (
                <p key={l} className="text-[14px] text-loader-hl/80 md:text-[18px]">
                  {l}
                </p>
              ))}
              <p className="mt-[16px] text-[14px] text-loader-hl/80 md:text-[18px]">{profile.loaderRole}</p>
              <p className="mt-[32px] text-[14px] text-loader-hl md:text-[18px]">{profile.loaderSignature}</p>
              <div className={`mt-[40px] transition-opacity duration-1000 ${ready ? "opacity-100" : "pointer-events-none opacity-40"}`}>
                <HudButton onClick={ready ? enter : undefined} active ariaLabel={ready ? "Enter the site" : "Loading"}>
                  ENTER
                </HudButton>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
