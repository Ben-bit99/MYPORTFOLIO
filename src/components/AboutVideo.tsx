"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { profile } from "@/data/portfolio";
import { lockScroll } from "@/lib/scroll";
import { click, duckMusic, tick } from "@/lib/sound";
import { useApp } from "@/lib/store";
import { useResolvedVideo } from "@/lib/video";
import ProjectVideoPlayer from "./video/ProjectVideoPlayer";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * "About me" video: a small floating HUD card to the left of the avatar in the
 * About section. Clicking it opens a full-screen viewer over a blurred view of
 * the page. Without a video file it shows a "coming soon" slot.
 */
export default function AboutVideo() {
  const entered = useApp((s) => s.entered);
  const section = useApp((s) => s.activeSection);
  const drawer = useApp((s) => s.drawer);
  const [open, setOpen] = useState(false);
  const v = useResolvedVideo(profile.introVideo);
  const ready = v.status === "local" || v.status === "external";
  const poster = v.status !== "checking" ? v.poster ?? (v.status === "external" ? v.thumb : undefined) : undefined;
  const visible = entered && section === "about" && !drawer && !open;

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.button
            key="about-video-card"
            type="button"
            onClick={() => {
              click();
              setOpen(true);
            }}
            onMouseEnter={tick}
            data-cursor="PLAY"
            aria-label={ready ? "Play the About me video" : "About me video (coming soon)"}
            className="about-video-card hud-frame group fixed right-4 top-[96px] z-[40] w-[124px] bg-[#060d16]/60 p-[6px] text-left shadow-[0_14px_40px_rgba(0,0,0,.5)] backdrop-blur-md md:right-auto md:left-[3vw] md:top-[44%] md:w-[clamp(200px,15vw,260px)] md:p-[8px]"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <span className="hud-line" />
            <span className="hud-line" />
            <span className="hud-line" />
            <span className="hud-line" />
            <span className="relative block aspect-video w-full overflow-hidden bg-[#03080d]">
              {poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105" />
              ) : (
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-70"
                  style={{
                    background:
                      "linear-gradient(rgba(127,158,179,.12) 1px, transparent 1px) 0 0/16px 16px, linear-gradient(90deg, rgba(127,158,179,.12) 1px, transparent 1px) 0 0/16px 16px",
                  }}
                />
              )}
              <span aria-hidden className="about-video-scan absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-[#7fd6ff]/15 to-transparent" />
              <span aria-hidden className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[#7fd6ff]/60 bg-black/40 shadow-[0_0_18px_rgba(127,214,255,.35)] transition-transform duration-300 group-hover:scale-110 md:h-[44px] md:w-[44px]">
                  <svg viewBox="0 0 24 24" className="ml-[2px] h-[11px] w-[11px] fill-[#cdeeff] md:h-[15px] md:w-[15px]">
                    <path d="M7 4.5v15l13-7.5z" />
                  </svg>
                </span>
              </span>
              <span aria-hidden className="absolute left-[6px] top-[4px] !text-[8px] md:!text-[9px] font-bold tracking-[0.18em] text-[#ff5a6e]" data-font-bold>
                ● REC
              </span>
            </span>
            <span className="mt-[6px] flex items-center justify-between gap-[8px] px-[2px]" data-font-bold>
              <span className="whitespace-nowrap !text-[9px] font-bold !tracking-[0.14em] text-loader-pct md:!text-[11px] md:!tracking-[0.18em]">
                ABOUT ME<span className="hidden md:inline"> // VIDEO</span>
              </span>
              {!ready && <span className="hidden !text-[9px] !tracking-[0.14em] text-[#ffc04d] md:inline">SOON</span>}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AboutVideoModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function AboutVideoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const restore = document.activeElement as HTMLElement | null;
    lockScroll(true);
    duckMusic(true);
    const t = setTimeout(() => panel.current?.focus({ preventScroll: true }), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      lockScroll(false);
      duckMusic(false);
      restore?.focus?.({ preventScroll: true });
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="about-video-modal"
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* The About page stays visible behind, blurred */}
          <div className="absolute inset-0 bg-[#02060b]/35 backdrop-blur-[10px]" onClick={onClose} aria-hidden />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="About me video"
            tabIndex={-1}
            className="hud-frame relative w-full max-w-[min(1180px,150vh)] bg-black/70 p-2 outline-none md:p-3"
            initial={{ scale: 0.94, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 10 }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <span className="hud-line" />
            <span className="hud-line" />
            <span className="hud-line" />
            <span className="hud-line" />
            <header className="flex items-center justify-between gap-3 px-1 pb-2 md:pb-3" data-font-bold>
              <p className="!text-[13px] md:!text-[15px]">
                <span className="text-bracket">[[</span>
                <span className="text-loader-pct">ABOUT ME</span>
                <span className="text-bracket">]_</span>
                <span className="ml-3 hidden !text-[11px] font-normal tracking-[0.1em] text-gray-500 sm:inline">{profile.name}</span>
              </p>
              <button type="button" onClick={onClose} onMouseEnter={tick} className="hud-small !text-[12px] text-gray-300 hover:text-white">
                Close ✕
              </button>
            </header>
            <ProjectVideoPlayer video={profile.introVideo} title="About me" kind="INTRO" autoPlay />
            <p className="px-1 pt-2 !text-[11px] text-gray-600">
              <kbd className="bg-white/10 px-1 text-gray-300">ESC</kbd> close · click outside to return to the page
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
