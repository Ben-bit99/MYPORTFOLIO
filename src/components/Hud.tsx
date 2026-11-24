"use client";

import { profile } from "@/data/portfolio";
import { scrollToSection } from "@/lib/scroll";
import { click, setSoundEnabled, tick } from "@/lib/sound";
import { getState, setState, useApp } from "@/lib/store";
import ScrambleText from "./ui/ScrambleText";

export function toggleSound() {
  const on = !getState().soundOn;
  setState({ soundOn: on });
  setSoundEnabled(on);
  try {
    localStorage.setItem("awr-sound", on ? "on" : "off");
  } catch {}
}

/** Fixed HUD: stacked logo, version, sound toggle, MENU, email + status. */
export default function Hud() {
  const entered = useApp((s) => s.entered);
  const soundOn = useApp((s) => s.soundOn);
  const menuOpen = useApp((s) => s.menuOpen);

  return (
    <header className="pointer-events-none fixed inset-0 z-50 text-gray-200" aria-label="Site controls">
      <div className="absolute left-4 right-4 top-4 grid grid-cols-4 items-start lg:grid-cols-12">
        <button
          type="button"
          className="pointer-events-auto col-span-1 text-left leading-none lg:col-span-2"
          onClick={() => {
            click();
            scrollToSection("hero");
          }}
          onMouseEnter={tick}
          aria-label={`${profile.name}, back to top`}
        >
          {profile.logoLines.map((l, i) => (
            <ScrambleText key={l} as="span" text={l} active={entered} delay={i * 0.08} duration={0.6} hover className="display block !text-[17px] !leading-[1.05] !tracking-[0.08em]" />
          ))}
        </button>
        <ScrambleText
          text={profile.version}
          active={entered}
          duration={0.3}
          className="hidden pt-[2px] !text-[13px] leading-none text-gray-500 md:block lg:col-start-3"
          aria-hidden
        />
        <button
          type="button"
          onClick={() => {
            click();
            toggleSound();
          }}
          onMouseEnter={tick}
          className="group pointer-events-auto col-span-2 col-start-2 hidden items-center gap-2 justify-self-start text-left leading-none md:flex lg:col-start-8"
          aria-pressed={soundOn}
          aria-label={`Sound ${soundOn ? "on" : "off"}. Toggle sound`}
        >
          <span className={`eq ${soundOn ? "eq-on" : ""} ${entered ? "opacity-100" : "opacity-0"} transition-opacity duration-500`} aria-hidden>
            <span />
            <span />
            <span />
          </span>
          <span className="hud-link">
            <ScrambleText key={String(soundOn)} text={`Sound: ${soundOn ? "On" : "Off"}`} active={entered} duration={0.3} hover />
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            click();
            setState({ menuOpen: !menuOpen });
          }}
          onMouseEnter={tick}
          className="pointer-events-auto col-start-4 justify-self-end leading-none lg:col-start-12"
          aria-expanded={menuOpen}
          aria-controls="site-menu"
        >
          <span className="hud-link">
            <ScrambleText key={String(menuOpen)} text={menuOpen ? "CLOSE" : "MENU"} active={entered} duration={0.6} hover />
          </span>
        </button>
      </div>

    </header>
  );
}
