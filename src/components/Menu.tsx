"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { navItems, profile, socials } from "@/data/portfolio";
import { scrollToSection } from "@/lib/scroll";
import { click, tick } from "@/lib/sound";
import { setState, useApp } from "@/lib/store";
import { toggleSound } from "./Hud";
import ScrambleText from "./ui/ScrambleText";

export default function Menu() {
  const open = useApp((s) => s.menuOpen);
  const active = useApp((s) => s.activeSection);
  const soundOn = useApp((s) => s.soundOn);
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setState({ menuOpen: false });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (id: string) => {
    click();
    setState({ menuOpen: false });
    setTimeout(() => scrollToSection(id), 250);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.nav
          id="site-menu"
          aria-label="Main menu"
          className="fixed inset-0 z-40 flex items-center bg-black/70 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="grid w-full grid-cols-4 px-4 lg:grid-cols-12">
            <div className="col-span-4 lg:col-span-5 lg:col-start-7">
              <p className="whitespace-pre text-bracket" data-font-bold aria-hidden>
                {"[["}
              </p>
              <ul className="mt-4 space-y-4">
                {navItems.map((n, i) => {
                  const isActive = active === n.id;
                  return (
                    <li key={n.id}>
                      <button
                        ref={i === 0 ? firstRef : undefined}
                        type="button"
                        onClick={() => go(n.id)}
                        onMouseEnter={tick}
                        className="group flex w-full items-baseline gap-4 text-left"
                        aria-current={isActive ? "true" : undefined}
                      >
                        <span className="w-10 !text-[12px] text-bracket" data-font-bold>{`0${i + 1}`}</span>
                        <ScrambleText
                          text={n.label}
                          active
                          delay={0.05 * i}
                          duration={0.5}
                          hover
                          className={`${isActive ? "text-loader-pct" : "text-gray-400"} display !text-[clamp(24px,2.6vw,42px)] !leading-[1.1] !tracking-[0.03em] transition-[color,transform] duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:translate-x-2 group-hover:text-white`}
                        />
                        <span className={`text-bracket transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} data-font-bold aria-hidden>
                          {"]]_"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 whitespace-pre text-bracket" data-font-bold aria-hidden>
                {"     ]]]_"}
              </p>

              <div className="mt-10 space-y-2 text-[14px] text-gray-500" data-font-bold>
                <button type="button" onClick={toggleSound} onMouseEnter={tick} className="block hover:text-white md:hidden">
                  Sound: {soundOn ? "On" : "Off"}
                </button>
                <a href={profile.resumePdf} download className="block hover:text-white" onMouseEnter={tick}>
                  Resume_ (PDF)
                </a>
                {socials
                  .filter((s) => s.href)
                  .map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="block hover:text-white" onMouseEnter={tick}>
                      {s.label}_
                    </a>
                  ))}
              </div>
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
