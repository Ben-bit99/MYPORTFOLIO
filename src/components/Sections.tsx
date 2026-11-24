"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { awards, otherProjects, profile, projects, socials, timeline, type SectionId } from "@/data/portfolio";
import { scrollToSection, scrollToY } from "@/lib/scroll";
import { chime, click, shimmer, tick } from "@/lib/sound";
import { heroBridge, now as nowS, timelineBridge, worksBridge } from "@/lib/sceneBridge";
import { frame, setState, useApp } from "@/lib/store";
import { PlaceholderBadge } from "./Overlays";
import BracketHeading from "./ui/BracketHeading";
import HoloCertificate from "./HoloCertificate";
import HudButton from "./ui/HudButton";
import ScrambleText from "./ui/ScrambleText";
import VideoPreview from "./video/VideoPreview";

function useActive(id: SectionId) {
  return useApp((s) => s.entered && s.activeSection === id);
}

/** Tall scroll track with a sticky 100vh stage. */
function Track({
  id,
  vh,
  children,
  after,
  stage,
}: {
  id: SectionId;
  vh: number;
  children: ReactNode;
  after?: ReactNode;
  stage?: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;
}) {
  return (
    <section id={id} data-section={id} className="relative" style={{ minHeight: `${vh}vh` }} aria-labelledby={`${id}-title`}>
      <div {...stage} className={`sticky top-0 h-[100svh] w-full overflow-hidden ${(stage?.className as string) ?? ""}`}>
        {children}
      </div>
      {after}
    </section>
  );
}

/**
 * Hero/About stage pointer → 3D: hover/click the hologram (energy surge) or the
 * avatar (gesture + focus pull). UI elements keep their own clicks.
 */
function useHeroPointer(active: boolean) {
  const [label, setLabel] = useState<string | null>(null);
  const pick = (e: React.PointerEvent | React.MouseEvent) => {
    if (!active || (e.target as HTMLElement).closest("button,a,input,textarea,[role=dialog]")) return null;
    return heroBridge.pick?.((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1) ?? null;
  };
  return {
    "data-cursor": label ?? undefined,
    style: { cursor: label ? "pointer" : undefined },
    onPointerMove: (e: React.PointerEvent) => {
      const hit = pick(e);
      if (hit !== heroBridge.hover) {
        heroBridge.hover = hit;
        if (hit) tick();
      }
      setLabel(hit === "artifact" ? "CLICK TO PULSE" : hit === "avatar" ? "INTERACT" : null);
    },
    onPointerLeave: () => {
      heroBridge.hover = null;
      setLabel(null);
    },
    onClick: (e: React.MouseEvent) => {
      const hit = pick(e);
      if (hit === "artifact") {
        heroBridge.surgeAt = nowS();
        chime();
        shimmer();
      } else if (hit === "avatar") {
        heroBridge.gestureAt = nowS();
        heroBridge.focusAt = nowS();
        click();
        shimmer();
      }
    },
  } as React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;
}

/** Bottom-centre scroll hint: small tracked label + a thin travelling line. */
function ScrollCue({ text, active, className = "flex" }: { text: string; active: boolean; className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-x-0 bottom-20 flex-col items-center gap-2 md:bottom-7 ${className}`} aria-hidden>
      <ScrambleText text={text} active={active} delay={0.6} duration={0.6} className="!text-[11px] font-bold uppercase !tracking-[0.26em] text-gray-200" />
      <span className={`scroll-line transition-opacity duration-700 ${active ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}

/* ───────────────────────── Hero ───────────────────────── */
export function Hero() {
  const active = useActive("hero");
  const stage = useHeroPointer(active);
  const accent = (c: string) => ({ ["--pill-accent" as string]: c }) as React.CSSProperties;
  return (
    <Track id="hero" vh={170} stage={stage}>
      <h1 id="hero-title" className="sr-only">
        {profile.name}: {profile.headline}
      </h1>
      <div className="pointer-events-none absolute inset-x-4 top-[40%] grid grid-cols-4 md:top-[52%] lg:grid-cols-12">
        <div className="col-span-4 lg:col-span-5 lg:col-start-8">
          <ScrambleText text="[[" active={active} duration={0.3} className="block text-bracket" aria-hidden />
          <div className="mt-2 flex flex-col items-start gap-3">
            <span className="hud-pill" style={accent("#3dffa8")}>
              <ScrambleText
                text={profile.role.toUpperCase()}
                active={active}
                delay={0.1}
                duration={0.7}
                className="display !text-[clamp(20px,2.1vw,32px)] text-white"
              />
            </span>
            <span className="hud-pill !py-[7px]" style={accent("#7fd6ff")}>
              <ScrambleText
                text={(profile.headline.split(" · ")[1] ?? "").toUpperCase()}
                active={active}
                delay={0.3}
                className="!text-[12px] font-bold !tracking-[0.22em] text-[#d3e4f1]"
              />
            </span>
          </div>
          <ScrambleText text={"      ]]]_"} active={active} delay={0.4} className="mt-2 block whitespace-pre text-bracket" aria-hidden />
        </div>
      </div>
      <ScrollCue text="Scroll to continue" active={active} />
    </Track>
  );
}

/* ───────────────────────── About ───────────────────────── */
export function About() {
  const active = useActive("about");
  const stage = useHeroPointer(active);
  return (
    <Track id="about" vh={240} stage={stage}>
      <div className="absolute inset-x-4 top-[10%] grid grid-cols-4 md:top-[30%] lg:grid-cols-12">
        <div className="col-span-4 scrim lg:col-span-4 lg:col-start-7">
          <BracketHeading
            active={active}
            word="ABOUT"
            highlightClass="text-hl-about"
            lines={["[", "    [[ABOUT]", "      []]]", "            [[[]"]}
          />
        </div>
        <div className="col-span-4 mt-10 scrim lg:col-span-4 lg:col-start-8">
          <h2 id="about-title" className="sr-only">
            About
          </h2>
          <ScrambleText as="p" text={profile.aboutShort} active={active} delay={0.2} duration={0.9} className="copy block" />
          <ScrambleText as="p" text={"   ]]]"} active={active} delay={0.4} className="mt-6 hidden whitespace-pre text-bracket md:block" aria-hidden />
          <div className="mt-6 md:mt-8">
            <HudButton active={active} onClick={() => setState({ drawer: { type: "about" } })}>
              ABOUT
            </HudButton>
          </div>
        </div>
      </div>
    </Track>
  );
}

/* ───────────────────────── Works ───────────────────────── */
function HoverPreview({ slug }: { slug: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pos.current.tx = e.clientX + 24;
      pos.current.ty = e.clientY - 100;
    };
    let raf = 0;
    const loop = () => {
      const p = pos.current;
      p.x += (p.tx - p.x) * 0.15;
      p.y += (p.ty - p.y) * 0.15;
      if (ref.current) {
        const maxX = window.innerWidth - 380;
        ref.current.style.transform = `translate3d(${Math.min(p.x, maxX)}px, ${Math.max(16, p.y)}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
  const p = projects.find((x) => x.slug === slug);
  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none fixed left-0 top-0 z-30 hidden aspect-video w-[340px] overflow-hidden border border-white/15 bg-black transition-opacity duration-300 md:block ${p ? "opacity-100" : "opacity-0"}`}
    >
      {p && <VideoPreview key={p.slug} video={p.video} />}
    </div>
  );
}

function WorkRow({ index, slug, onHover }: { index: number; slug: string; onHover: (s: string | null) => void }) {
  const p = projects.find((x) => x.slug === slug)!;
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const entered = useApp((s) => s.entered);
  const show = inView && entered;
  return (
    <li>
      <button
        ref={ref}
        type="button"
        onMouseEnter={() => {
          tick();
          onHover(slug);
        }}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(slug)}
        onBlur={() => onHover(null)}
        onClick={() => {
          click();
          onHover(null);
          setState({ drawer: { type: "project", slug } });
        }}
        className="group relative grid w-full grid-cols-4 items-start gap-x-4 gap-y-3 border-b border-white/[0.08] py-6 text-left transition-colors duration-500 before:absolute before:left-0 before:top-0 before:h-full before:w-px before:origin-top before:scale-y-0 before:bg-[#9fd4ff] before:transition-transform before:duration-500 before:ease-[cubic-bezier(.22,1,.36,1)] hover:bg-[#0b1726]/55 hover:shadow-[inset_0_0_0_1px_rgba(159,212,255,.1)] hover:before:scale-y-100 hover:backdrop-blur-[2px] lg:grid-cols-12 lg:items-center lg:pl-3"
        aria-label={`Open ${p.title}${p.placeholder ? " (coming soon)" : ""}`}
      >
        <span className="col-span-1 !text-[13px] text-[#5d6b7c] transition-colors group-hover:text-[#9fd4ff] lg:col-span-1" data-font-bold>
          {String(index + 1).padStart(2, "0")}_
        </span>
        <span className="col-span-3 lg:col-span-4">
          <span className="flex flex-wrap items-center gap-3">
            <ScrambleText text={p.title} active={show} hover duration={0.6} className="font-sans !text-[clamp(18px,1.5vw,22px)] font-bold !tracking-[0.005em] text-[#e6f0f8] group-hover:text-white" />
            {p.placeholder && <PlaceholderBadge />}
          </span>
          <ScrambleText text={p.tagline} active={show} delay={0.1} className="mt-1 block font-sans !text-[14px] font-medium !tracking-normal text-[#8b9bab]" />
        </span>
        {/* Mobile inline preview */}
        <span className="col-span-4 block aspect-video w-full overflow-hidden border border-white/10 md:hidden">
          {show && <VideoPreview video={p.video} playing={false} />}
        </span>
        {[
          ["Category_", p.category],
          ["Engine_", p.engine ?? "—"],
          ["Year_", p.year],
        ].map(([k, v], i) => (
          <span key={k} className={`col-span-2 lg:col-span-2 ${i === 2 ? "lg:col-span-1" : ""}`}>
            <span className="block !text-[11px] font-bold uppercase !tracking-[0.18em] text-[#8fa3b8]" data-font-bold>
              {k}
            </span>
            <ScrambleText text={v} active={show} delay={0.15 + i * 0.05} className="mt-1 block font-sans !text-[15px] font-semibold !tracking-normal text-[#dbe6ef]" />
          </span>
        ))}
        <span className="col-span-2 text-right text-gray-400 transition-[color,transform] duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:translate-x-1.5 group-hover:text-[#9fd4ff] lg:col-span-1" data-font-bold aria-hidden>
          [→]
        </span>
      </button>
    </li>
  );
}

export function Works() {
  const active = useActive("works");
  const [hover, setHoverState] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [listNear, setListNear] = useState(false);
  const setHover = (slug: string | null) => {
    setHoverState(slug);
    const p = slug ? projects.find((x) => x.slug === slug) : null;
    worksBridge.hover = p ? { slug: p.slug, placeholder: !!p.placeholder } : null;
  };
  // Fade the sticky intro away as the project list scrolls up, so they never overlap.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setListNear(e.isIntersecting), { rootMargin: "0px 0px -38% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section id="works" data-section="works" className="relative" aria-labelledby="works-title">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <div
          className={`absolute inset-x-4 top-[14%] grid grid-cols-4 transition-[opacity,transform] duration-700 ease-[cubic-bezier(.22,1,.36,1)] lg:grid-cols-12 ${listNear ? "pointer-events-none -translate-y-4 opacity-0" : "opacity-100"}`}
        >
          <div className="col-span-4 scrim lg:col-span-4 lg:col-start-1">
            <BracketHeading
              active={active}
              word="WORKS"
              highlightClass="text-hl-works"
              lines={["_]]", "     [[[WORKS]", "  []]", "        ]]["]}
            />
            <h2 id="works-title" className="sr-only">
              Selected works
            </h2>
            <ScrambleText as="p" text={profile.worksIntro} active={active} delay={0.25} duration={0.9} className="copy mt-8 block" />
            <ScrambleText as="p" text={"   ]]]]_"} active={active} delay={0.4} className="mt-8 block whitespace-pre text-bracket" aria-hidden />
          </div>
        </div>
        <ScrollCue text="Scroll to see the works" active={active && !listNear} className="hidden md:flex" />
      </div>

      {/* Project list scrolls over the live scene */}
      <div ref={listRef} className="relative z-10 -mt-[12vh] px-4 pb-[40vh] pt-[6vh] md:pr-[210px]">
        <div className="relative isolate mx-auto max-w-[1400px] lg:px-6">
          {/* Background fades in from the scene instead of a hard panel edge */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[#01050a]/55 backdrop-blur-sm [mask-image:linear-gradient(to_bottom,transparent,black_40px)] md:[mask-image:linear-gradient(to_bottom,transparent,black_160px)]"
          />
          <p className="pt-6 !text-[12px] font-bold !tracking-[0.2em] text-[#8fa3b8]" data-font-bold>
            [ GAME DEV & XR ]
          </p>
          <ul>
            {projects.map((p, i) => (
              <WorkRow key={p.slug} index={i} slug={p.slug} onHover={setHover} />
            ))}
          </ul>

          <p className="pt-12 !text-[12px] font-bold !tracking-[0.2em] text-[#8fa3b8]" data-font-bold>
            [ OTHER BUILDS ]
          </p>
          <ul className="pb-6">
            {otherProjects.map((o) => {
              const [name, sub] = o.title.split(" — ");
              return (
                <li key={o.slug} className="grid grid-cols-4 gap-x-4 gap-y-2 border-b border-white/10 py-5 lg:grid-cols-12">
                  <span className="col-span-4 lg:col-span-4 lg:col-start-2">
                    <span className="block font-sans text-[17px] font-bold text-gray-100">{name}</span>
                    <span className="block !text-[14px] text-gray-500" data-font-bold>
                      {sub}
                    </span>
                  </span>
                  <span className="col-span-4 text-[14px] leading-relaxed text-gray-400 lg:col-span-5">{o.highlights[0]}</span>
                  <span className="col-span-2 !text-[14px] text-gray-300 lg:col-span-2" data-font-bold>
                    <span className="block !text-[11px] font-bold uppercase !tracking-[0.18em] text-[#8fa3b8]">Stack_</span>
                    {o.techStack.slice(0, 4).join(" · ")}
                  </span>
                  <span className="col-span-2 text-right !text-[14px] text-gray-300 lg:col-span-1 lg:text-left" data-font-bold>
                    <span className="block !text-[11px] font-bold uppercase !tracking-[0.18em] text-[#8fa3b8]">Year_</span>
                    {o.year}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <HoverPreview slug={hover} />
    </section>
  );
}

/* ───────────────────────── Timeline ───────────────────────── */
export function Timeline() {
  const active = useActive("timeline");
  const track = useRef<HTMLOListElement>(null);
  const pills = useRef<(HTMLButtonElement | null)[]>([]);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const section = () => frame.sections.find((x) => x.id === "timeline");
  const trackMax = () => {
    const el = track.current;
    return el ? Math.max(1, el.scrollWidth - el.parentElement!.clientWidth) : 1;
  };

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = track.current;
      const s = frame.sections.find((x) => x.id === "timeline");
      if (el && s) {
        const p = Math.min(1, Math.max(0, (frame.scrollY - s.top) / Math.max(1, s.height - frame.viewportH)));
        const max = el.scrollWidth - el.parentElement!.clientWidth;
        el.style.transform = `translate3d(${-p * Math.max(0, max)}px,0,0)`;
        // light up the year pill for the milestone in view
        const idx = Math.round(p * (timeline.length - 1));
        pills.current.forEach((b, i) => b && (b.dataset.active = String(i === idx)));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const goTo = (i: number) => {
    const s = section();
    if (!s) return;
    click();
    scrollToY(s.top + (i / (timeline.length - 1)) * Math.max(1, s.height - frame.viewportH));
  };

  // Drag horizontally anywhere on the stage to scrub the timeline.
  const stage = {
    onPointerDown: (e: React.PointerEvent) => {
      if (!active || e.pointerType === "touch" || (e.target as HTMLElement).closest("button,a")) return;
      drag.current = { x: e.clientX, y: frame.scrollY };
      setDragging(true);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const d = drag.current;
      const s = section();
      if (!d || !s) return;
      const ratio = Math.max(1, s.height - frame.viewportH) / trackMax();
      scrollToY(d.y - (e.clientX - d.x) * ratio, true);
    },
    onPointerUp: () => {
      drag.current = null;
      setDragging(false);
    },
    onPointerLeave: () => {
      drag.current = null;
      setDragging(false);
    },
    style: { cursor: active ? (dragging ? "grabbing" : "grab") : undefined, userSelect: "none" as const },
    "data-cursor": active ? "DRAG" : undefined,
  } as React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;

  return (
    <Track id="timeline" vh={420} stage={stage}>
      <div className="absolute inset-x-4 top-[12%] grid grid-cols-4 lg:grid-cols-12">
        <div className="col-span-4 scrim lg:col-span-4 lg:col-start-1">
          <BracketHeading active={active} word="TIMELINE" highlightClass="text-loader-hl" lines={["[[", "   [[TIMELINE]]", "      ]]_"]} />
          <h2 id="timeline-title" className="sr-only">
            Timeline
          </h2>
        </div>
      </div>
      {/* Milestones sit BELOW the glowing rail and its orbital nodes */}
      <div className="absolute inset-x-0 top-[63%] overflow-hidden md:top-[61%]">
        <ol ref={track} className="flex w-max gap-0 pl-[8vw] pr-[40vw] will-change-transform">
          {timeline.map((t, i) => (
            <li
              key={i}
              className="w-[78vw] shrink-0 pr-8 sm:w-[46vw] lg:w-[30vw]"
              onMouseEnter={() => (timelineBridge.hover = i)}
              onMouseLeave={() => (timelineBridge.hover = -1)}
            >
              <div className="scrim">
                <ScrambleText text={`[${t.year}]`} active={active} delay={0.1 * i} className="block !text-[13px] font-bold text-[#9fd4ff]" />
                <ScrambleText text={t.label} active={active} delay={0.1 * i + 0.1} duration={0.6} className="mt-2 block font-sans !text-[clamp(17px,1.4vw,21px)] font-bold !tracking-normal text-white" />
                <p className="mt-2 max-w-[360px] text-[15px] font-medium leading-relaxed text-[#b9c6d3]">{t.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      {/* Year pills: jump to a milestone */}
      <div className="absolute right-4 top-[13%] hidden items-center justify-end gap-2 md:flex" role="group" aria-label="Jump to a year">
        <span className="mr-1 !text-[10px] font-bold uppercase !tracking-[0.2em] text-[#5d6b7c]" data-font-bold>
          Jump_
        </span>
        {timeline.map((t, i) => (
          <button
            key={i}
            ref={(b) => {
              pills.current[i] = b;
            }}
            type="button"
            onClick={() => goTo(i)}
            onMouseEnter={() => {
              tick();
              timelineBridge.hover = i;
            }}
            onMouseLeave={() => (timelineBridge.hover = -1)}
            className="year-pill"
            aria-label={`${t.year}: ${t.label}`}
            data-font-bold
          >
            {t.year}
          </button>
        ))}
      </div>
      <ScrollCue text="Scroll or drag to move the timeline" active={active} className="hidden md:flex" />
    </Track>
  );
}

/* ───────────────────────── Memory Vault (awards) ───────────────────────── */
export function Vault() {
  const active = useActive("vault");
  const a = awards[0];
  if (!a) return null;
  const open = () => setState({ drawer: { type: "certificate", slug: a.slug } });
  return (
    <Track id="vault" vh={260}>
      <div className="absolute inset-x-4 top-[11%] grid grid-cols-4 items-center gap-y-6 md:top-1/2 md:-translate-y-1/2 lg:grid-cols-12 lg:gap-x-8">
        <div className="col-span-4 scrim lg:hidden">
          <BracketHeading active={active} word="MEMORY VAULT" highlightClass="text-hl-vault" lines={["   ]][[MEMORY VAULT]]", "      ]]]["]} />
        </div>
        <div
          className={`col-span-4 transition-[opacity,transform] duration-1000 ease-[cubic-bezier(.22,1,.36,1)] lg:col-span-6 lg:col-start-1 ${active ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
        >
          <HoloCertificate src={a.certificate.src} alt={a.certificate.alt} onOpen={open} />
        </div>
        <div className="col-span-4 scrim lg:col-span-5 lg:col-start-8">
          <div className="hidden lg:block">
            <BracketHeading
              active={active}
              word="MEMORY VAULT"
              highlightClass="text-hl-vault"
              lines={["        []]", "      ]][[MEMORY VAULT]]", "   ]]][", "               [[[]"]}
            />
          </div>
          <h2 id="vault-title" className="sr-only">
            Awards: {a.title}
          </h2>
          <ScrambleText as="p" text="Some memories are earned in forty-eight hours." active={active} delay={0.2} duration={0.8} className="copy block lg:mt-8" />
          <div className="mt-4 space-y-1 lg:mt-6">
            <ScrambleText as="p" text={`[5TH PRIZE] ${a.event}`} active={active} delay={0.35} className="block text-hl-vault" />
            <ScrambleText as="p" text={`${a.team} · ${a.location}`} active={active} delay={0.45} className="block !text-[15px] text-gray-400" />
          </div>
          <p className="mt-4 hidden max-w-[46ch] text-[15px] leading-[1.65] text-gray-300 md:block">{a.description}</p>
          <div className="mt-6 hidden md:block lg:mt-8">
            <HudButton active={active} onClick={open}>
              OPEN CERTIFICATE
            </HudButton>
          </div>
        </div>
      </div>
    </Track>
  );
}

/* ───────────────────────── Contact ───────────────────────── */
function CopyEmail({ onCopied }: { onCopied: () => void }) {
  return (
    <button
      type="button"
      onMouseEnter={tick}
      data-cursor="COPY"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(profile.email);
          chime();
          onCopied();
        } catch {
          click();
        }
      }}
      className="border border-white/15 bg-white/[0.04] px-2 py-1 !text-[10px] font-bold uppercase !tracking-[0.18em] text-[#9fb0c2] transition-colors hover:border-[#9fd4ff]/60 hover:text-white"
      data-font-bold
    >
      [copy]
    </button>
  );
}

/** Live Karachi time (client-only to avoid hydration mismatch). */
function LocalTime() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" });
    const update = () => setTime(fmt.format(new Date()));
    const first = setTimeout(update, 0);
    const iv = setInterval(update, 20_000);
    return () => {
      clearTimeout(first);
      clearInterval(iv);
    };
  }, []);
  return (
    <span className="inline-flex items-center gap-2.5 !text-[11px] font-bold uppercase !tracking-[0.18em] text-[#9fb0c2]" data-font-bold>
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inset-0 animate-ping rounded-full bg-[#3dffa8] opacity-60" />
        <span className="relative h-2 w-2 rounded-full bg-[#3dffa8] shadow-[0_0_8px_#3dffa8]" />
      </span>
      Karachi · {time ?? "--:--"} PKT
    </span>
  );
}

export function Contact() {
  const active = useActive("contact");
  const live = socials.filter((s) => s.href);
  const [toast, setToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = () => {
    setToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(false), 1800);
  };
  const label = "block !text-[11px] font-bold uppercase !tracking-[0.18em] text-[#8fa3b8]";
  const value = "font-sans !text-[clamp(15px,1.15vw,18px)] font-semibold !tracking-normal text-white";
  return (
    <Track id="contact" vh={170}>
      <div className="absolute inset-x-4 top-[13%] grid grid-cols-4 gap-y-3 md:gap-y-6 lg:grid-cols-12 lg:items-start">
        <div className="col-span-4 scrim lg:col-span-4 lg:col-start-2">
          <BracketHeading active={active} word="CONTACT" highlightClass="text-amber" lines={["[[[", "   [[CONTACT]", "        ]]]_"]} />
          <h2 id="contact-title" className="sr-only">
            Contact
          </h2>
          <ScrambleText
            as="p"
            text="Building a game, an XR experience or a team? Let's talk."
            active={active}
            delay={0.2}
            duration={0.8}
            className="copy mt-8 hidden md:block"
          />
        </div>

        {/* Contact card: frosted HUD glass so labels and values pop over the bokeh */}
        <div
          className={`hud-frame col-span-4 border border-white/15 bg-black/55 p-4 backdrop-blur-md transition-[opacity,transform] duration-700 ease-[cubic-bezier(.22,1,.36,1)] md:p-6 lg:col-span-5 lg:col-start-8 lg:mt-6 ${active ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
        >
          <span className="hud-line" />
          <span className="hud-line" />
          <span className="hud-line" />
          <span className="hud-line" />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 md:gap-x-6 md:gap-y-5">
            <div className="col-span-2">
              <dt className={label} data-font-bold>
                Email_
              </dt>
              <dd className="mt-1.5 flex items-center gap-3">
                <a href={`mailto:${profile.email}`} onMouseEnter={tick} className="hud-link text-white">
                  <ScrambleText text={profile.email} active={active} delay={0.3} hover className={value} />
                </a>
                <CopyEmail onCopied={showToast} />
              </dd>
            </div>
            <div>
              <dt className={label} data-font-bold>
                Phone_
              </dt>
              <dd className="mt-1.5">
                <a href={`tel:${profile.phoneHref}`} onMouseEnter={tick} className="hud-link">
                  <ScrambleText text={profile.phone} active={active} delay={0.35} hover className={value} />
                </a>
              </dd>
            </div>
            <div>
              <dt className={label} data-font-bold>
                Location_
              </dt>
              <dd className="mt-1.5">
                <ScrambleText text={profile.location} active={active} delay={0.4} className={value} />
              </dd>
            </div>
            {live.length > 0 && (
              <div className="col-span-2">
                <dt className={label} data-font-bold>
                  Elsewhere_
                </dt>
                <dd className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
                  {live.map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" onMouseEnter={tick} className="hud-link text-white">
                      <ScrambleText text={`${s.label} ↗`} active={active} delay={0.45} hover className={value} />
                    </a>
                  ))}
                </dd>
              </div>
            )}
            <div className="col-span-2 border-t border-white/10 pt-3 md:pt-4">
              <LocalTime />
            </div>
          </dl>
          {/* Actions: one row with a fixed gap — never overlapping */}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-3 md:mt-6 md:gap-x-5">
            {/* Desktop/tablet: full-size primary; phones: compact pair on one row */}
            <span className="hidden md:inline-flex">
              <HudButton active={active} onClick={() => setState({ drawer: { type: "contact-form" } })}>
                SEND A MESSAGE
              </HudButton>
            </span>
            <span className="inline-flex md:hidden">
              <HudButton active={active} size="sm" ariaLabel="Send a message" onClick={() => setState({ drawer: { type: "contact-form" } })}>
                MESSAGE
              </HudButton>
            </span>
            <HudButton active={active} size="sm" href={profile.resumePdf} download>
              RESUME ↓
            </HudButton>
            <button
              type="button"
              onClick={() => scrollToSection("hero")}
              onMouseEnter={tick}
              className="hud-link hidden !text-[11px] font-bold uppercase !tracking-[0.18em] text-[#9fb0c2] hover:text-white md:inline"
              data-font-bold
            >
              [ back to top ↑ ]
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="hud-pill pointer-events-none absolute left-1/2 top-[8%] -translate-x-1/2 !text-[12px] font-bold !tracking-[0.2em] text-[#d8fbe9]"
            style={{ ["--pill-accent" as string]: "#3dffa8" } as React.CSSProperties}
            data-font-bold
          >
            [ COPIED TO CLIPBOARD ]
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="absolute bottom-6 left-4 hidden !text-[11px] font-bold !tracking-[0.16em] text-gray-500 md:block" data-font-bold>
        © {new Date().getFullYear()} {profile.name}
        <span className="ml-3 font-medium normal-case !tracking-normal text-gray-600">
          · 3D character “Aang – Avatar state” by Windstride (CC BY 4.0)
        </span>
      </footer>
    </Track>
  );
}
