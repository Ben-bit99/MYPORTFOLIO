"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { awards, education, profile, projects, skills } from "@/data/portfolio";
import { lockScroll } from "@/lib/scroll";
import { click, tick } from "@/lib/sound";
import { setState, useApp } from "@/lib/store";
import { MemoriesList } from "./Memories";
import ContactForm from "./ContactForm";
import HudButton from "./ui/HudButton";
import ScrambleText from "./ui/ScrambleText";
import ProjectVideoPlayer from "./video/ProjectVideoPlayer";

const EASE = [0.22, 1, 0.36, 1] as const;
const close = () => setState({ drawer: null });

function Label({ children }: { children: string }) {
  return (
    <p className="text-[14px] uppercase tracking-[0.1em] text-gray-500" data-font-bold>
      {children}
    </p>
  );
}

function CloseBtn() {
  return (
    <button
      type="button"
      onClick={() => {
        click();
        close();
      }}
      onMouseEnter={tick}
      className="hud-small text-gray-300 hover:text-white"
    >
      <ScrambleText text="CLOSE" hover duration={0.5} className="!text-[14px]" />
    </button>
  );
}

function useDialog(open: boolean) {
  const panel = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    restore.current = document.activeElement as HTMLElement | null;
    lockScroll(true);
    const t = setTimeout(() => panel.current?.focus({ preventScroll: true }), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,iframe,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      lockScroll(false);
      restore.current?.focus?.({ preventScroll: true });
    };
  }, [open]);
  return panel;
}

function Drawer({ open, label, children }: { open: boolean; label: string; children: ReactNode }) {
  const panel = useDialog(open);
  return (
    <AnimatePresence>
      {open && (
        <motion.div key="drawer" className="fixed inset-0 z-[60]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} aria-hidden />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            data-lenis-prevent
            className="hud-scroll absolute bottom-0 right-0 top-0 w-full overflow-y-auto border-l border-white/10 bg-black/80 outline-none backdrop-blur-md md:w-[min(760px,62vw)]"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur-md md:px-8">
              <span className="text-bracket" data-font-bold aria-hidden>
                {"[[_"}
              </span>
              <CloseBtn />
            </div>
            <div className="px-4 pb-24 pt-8 md:px-8">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────────────────────── About ───────────────────────── */
function AboutContent() {
  return (
    <article>
      <p className="whitespace-pre text-bracket" data-font-bold aria-hidden>
        {"    [[ABOUT]"}
      </p>
      <h2 className="mt-2 text-loader-pct" data-font-bold>
        {profile.name}
      </h2>
      <p className="mt-1 text-[15px] text-gray-400" data-font-bold>
        {profile.headline} · {profile.location}
      </p>
      <div className="mt-8 space-y-4 text-[clamp(15px,0.9vw+10px,18px)] leading-relaxed text-gray-300">
        {profile.aboutLong.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>

      <section className="mt-12" aria-labelledby="edu-h">
        <Label>Education_</Label>
        <div className="hud-frame mt-3 p-5">
          <span className="hud-line" />
          <span className="hud-line" />
          <span className="hud-line" />
          <span className="hud-line" />
          <h3 id="edu-h" className="text-loader-pct" data-font-bold>
            {education.institution}
          </h3>
          <p className="mt-1 text-gray-300">{education.degree}</p>
          <p className="mt-1 text-[15px] text-gray-400">
            {education.years} · CGPA {education.cgpa}
          </p>
          <p className="mt-4 text-[14px] uppercase tracking-[0.1em] text-gray-500" data-font-bold>
            Relevant coursework
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {education.coursework.map((c) => (
              <li key={c} className="border border-white/10 px-2 py-1 text-[14px] text-gray-300">
                {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12" aria-label="Technical skills">
        <Label>Skills_</Label>
        <div className="mt-3 grid gap-6 sm:grid-cols-2">
          {skills.map((g) => (
            <div key={g.category}>
              <h3 className="text-[15px] text-loader-hl" data-font-bold>
                {g.category}
              </h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {g.items.map((s) => (
                  <li key={s} className="bg-white/[0.04] px-2 py-0.5 text-[14px] text-gray-300">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-12">
        <HudButton href={profile.resumePdf} download>
          DOWNLOAD RESUME
        </HudButton>
      </div>
      <p className="mt-12 border-t border-white/10 pt-4 text-[12px] leading-relaxed text-gray-500">
        3D character:{" "}
        <a
          href="https://sketchfab.com/3d-models/aang-avatar-state-39e2d6d18f434e1ead978ad709616475"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 underline-offset-2 hover:text-white hover:underline"
        >
          “Aang – Avatar state”
        </a>{" "}
        by Windstride, licensed{" "}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="text-gray-400 underline-offset-2 hover:text-white hover:underline">
          CC BY 4.0
        </a>
        , optimised for the web.
      </p>
    </article>
  );
}

/* ───────────────────────── Project ───────────────────────── */
function ProjectContent({ slug }: { slug: string }) {
  const p = projects.find((x) => x.slug === slug);
  if (!p) return <p className="text-gray-400">Project not found.</p>;
  const idx = projects.indexOf(p);
  return (
    <article>
      <p className="whitespace-pre text-bracket" data-font-bold aria-hidden>
        {`   [[[${String(idx + 1).padStart(2, "0")}]`}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h2 className="text-loader-pct" data-font-bold>
          {p.title}
        </h2>
        {p.placeholder && <PlaceholderBadge />}
      </div>
      <p className="mt-1 text-gray-400" data-font-bold>
        {p.tagline}
      </p>

      <div className="mt-6">
        <ProjectVideoPlayer video={p.video} title={p.title} />
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
        {[
          ["Category_", p.category],
          ["Engine_", p.engine ?? "—"],
          ["Role_", p.role],
          ["Year_", p.year],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-[13px] uppercase tracking-[0.1em] text-gray-500" data-font-bold>
              {k}
            </dt>
            <dd className="mt-1 text-[15px] text-gray-200">{v}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-8 leading-relaxed text-gray-300">{p.description}</p>

      {p.highlights.length > 0 && (
        <section className="mt-8">
          <Label>Highlights_</Label>
          <ul className="mt-3 space-y-3">
            {p.highlights.map((h) => (
              <li key={h} className="flex gap-3 text-[16px] leading-relaxed text-gray-300">
                <span className="text-loader-hl" aria-hidden>
                  ]_
                </span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.techStack.length > 0 && (
        <section className="mt-8">
          <Label>Stack_</Label>
          <ul className="mt-3 flex flex-wrap gap-2">
            {p.techStack.map((t) => (
              <li key={t} className="border border-white/10 px-2 py-1 text-[14px] text-gray-300">
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.links.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-3">
          {p.links.map((l) => (
            <HudButton key={l.href} href={l.href} external size="sm">
              {l.label.toUpperCase()}
            </HudButton>
          ))}
        </div>
      )}

      {p.placeholder && (
        <p className="mt-10 text-[15px] text-gray-500">
          This project is in production. Details and gameplay footage are coming soon. Questions:{" "}
          <a className="text-loader-hl underline-offset-4 hover:underline" href={`mailto:${profile.email}`}>
            {profile.email}
          </a>
        </p>
      )}
    </article>
  );
}

export function PlaceholderBadge() {
  return (
    <span
      className="badge-shimmer relative inline-flex items-center gap-2 overflow-hidden border border-amber/60 bg-[#1a1203]/70 px-2.5 py-1 !text-[10px] font-bold uppercase !tracking-[0.2em] text-[#ffc04d] shadow-[0_0_14px_rgba(249,156,0,.18)]"
      data-font-bold
    >
      <span className="h-1.5 w-1.5 animate-hud-pulse bg-[#ffb02e] shadow-[0_0_6px_#ffb02e]" aria-hidden />
      Coming soon
    </span>
  );
}

/* ───────────────────────── Certificate lightbox ───────────────────────── */
function Lightbox({ slug }: { slug: string | null }) {
  const open = !!slug;
  const panel = useDialog(open);
  const a = awards.find((x) => x.slug === slug);
  return (
    <AnimatePresence>
      {open && a && (
        <motion.div
          key="lightbox"
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={close} aria-hidden />
          <motion.figure
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={`${a.title} certificate`}
            tabIndex={-1}
            className="hud-frame relative max-h-[92vh] w-full max-w-[min(1100px,140vh)] bg-black p-2 outline-none md:p-3"
            initial={{ scale: 0.96, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.98, y: 8 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <span className="hud-line" />
            <span className="hud-line" />
            <span className="hud-line" />
            <span className="hud-line" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.certificate.src} alt={a.certificate.alt} className="mx-auto max-h-[78vh] w-auto object-contain" />
            <figcaption className="flex flex-wrap items-center justify-between gap-3 px-1 pt-3">
              <span className="text-[14px] text-gray-300" data-font-bold>
                {a.title} · {a.team}
              </span>
              <span className="flex items-center gap-5">
                <a href={a.certificate.src} target="_blank" rel="noopener noreferrer" className="hud-small text-gray-400 hover:text-white" onMouseEnter={tick}>
                  Full size ↗
                </a>
                <CloseBtn />
              </span>
            </figcaption>
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Overlays() {
  const drawer = useApp((s) => s.drawer);
  return (
    <>
      <Drawer open={drawer?.type === "about"} label="About Abdul Wahib Rao">
        <AboutContent />
      </Drawer>
      <Drawer open={drawer?.type === "project"} label="Project details">
        {drawer?.type === "project" && <ProjectContent slug={drawer.slug} />}
      </Drawer>
      <Drawer open={drawer?.type === "contact-form"} label="Send a message">
        {drawer?.type === "contact-form" && <ContactForm />}
      </Drawer>
      <Drawer open={drawer?.type === "memories"} label="All memories">
        <MemoriesList />
      </Drawer>
      <Lightbox slug={drawer?.type === "certificate" ? drawer.slug : null} />
    </>
  );
}
