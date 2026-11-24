"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { deleteMemory, fmtDate, loadMemories, postMemory, useMemories, verifyModerator, type PublicMemory } from "@/lib/memories/client";
import { cubeBridge } from "@/lib/memories/cubes";
import { lockScroll } from "@/lib/scroll";
import { chime, click, shimmer, tick, whoosh } from "@/lib/sound";
import { setState, useApp } from "@/lib/store";
import BracketHeading from "./ui/BracketHeading";
import HudButton from "./ui/HudButton";
import ScrambleText from "./ui/ScrambleText";

/* ───────────── Ghost memories drifting over the grid ───────────── */
// Desktop slots keep clear of the right-hand text column; mobile uses the band above the text.
const SLOTS_DESKTOP = [
  { x: 4, y: 14 },
  { x: 27, y: 22 },
  { x: 6, y: 33 },
  { x: 40, y: 9 },
];
// Phones: no free space between the buttons and the AI button, so ghosts stay hidden;
// memories remain readable via their cubes and READ ALL.
const SLOTS_MOBILE: { x: number; y: number }[] = [];

function Ghost({ m, slot, onDone, isNew }: { m: PublicMemory; slot: { x: number; y: number }; onDone: () => void; isNew: boolean }) {
  useEffect(() => {
    const t = setTimeout(onDone, isNew ? 11000 : 7500);
    return () => clearTimeout(t);
  }, [onDone, isNew]);
  return (
    <motion.figure
      className="absolute max-w-[40vw] md:max-w-[min(340px,54vw)]"
      style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
      initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <blockquote className={`line-clamp-3 text-[14px] leading-snug md:line-clamp-none md:text-[15px] ${isNew ? "text-[#bff6ff]" : "text-[#8fe3ec]"}`} style={{ textShadow: "0 0 14px rgba(70,210,230,.55), 0 0 2px rgba(0,0,0,.9)" }}>
        <ScrambleText text={`“${m.message}”`} duration={1.1} bold={false} />
      </blockquote>
      <figcaption className="mt-1 text-[12px] uppercase tracking-[0.1em] text-[#3f8f99]" data-font-bold>
        — {m.name}
        {m.location ? ` · ${m.location}` : ""} · {fmtDate(m.createdAt)}
      </figcaption>
    </motion.figure>
  );
}

function GhostWall({ active }: { active: boolean }) {
  const { items, lastAddedId } = useMemories();
  const [mobile, setMobile] = useState(false);
  const [shown, setShown] = useState<{ key: number; idx: number; slot: number }[]>([]);
  const cursor = useRef(0);
  const keyRef = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const f = () => setMobile(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  const slots = mobile ? SLOTS_MOBILE : SLOTS_DESKTOP;

  // Spawn a new ghost every ~1.8s into a free slot while the section is active.
  useEffect(() => {
    if (!active || !items.length) return;
    const spawn = () =>
      setShown((cur) => {
        const used = new Set(cur.map((g) => g.slot));
        const free = slots.map((_, i) => i).filter((i) => !used.has(i));
        if (!free.length || cur.length >= Math.min(items.length, slots.length)) return cur;
        const idx = cursor.current++ % items.length;
        if (cur.some((g) => g.idx === idx)) return cur;
        return [...cur, { key: keyRef.current++, idx, slot: free[Math.floor(Math.random() * free.length)] }];
      });
    spawn();
    const iv = setInterval(spawn, 1800);
    return () => clearInterval(iv);
  }, [active, items.length, slots]);

  // A freshly posted memory jumps the queue.
  useEffect(() => {
    if (!lastAddedId) return;
    const t = setTimeout(() => {
      setShown((cur) => [{ key: keyRef.current++, idx: 0, slot: 0 }, ...cur.filter((g) => g.slot !== 0 && g.idx !== 0)]);
    }, 0);
    return () => clearTimeout(t);
  }, [lastAddedId]);

  useEffect(() => {
    if (active) return;
    const t = setTimeout(() => setShown([]), 0);
    return () => clearTimeout(t);
  }, [active]);

  if (!slots.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <AnimatePresence>
        {shown.map((g) =>
          items[g.idx] ? (
            <Ghost
              key={g.key}
              m={items[g.idx]}
              isNew={items[g.idx].id === lastAddedId}
              slot={slots[g.slot] ?? slots[0]}
              onDone={() => setShown((cur) => cur.filter((x) => x.key !== g.key))}
            />
          ) : null,
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────── Section ───────────── */
export function MemoriesSection() {
  const active = useApp((s) => s.entered && s.activeSection === "memories");
  const entered = useApp((s) => s.entered);
  const { items, enabled, loaded } = useMemories();

  useEffect(() => {
    if (entered) void loadMemories();
  }, [entered]);

  useEffect(() => {
    setState({ memoryCount: items.length });
  }, [items.length]);

  const count = items.length;
  const reading = useApp((s) => s.drawer?.type === "memory-read");
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  // Clicks pass "through" the page to the 3D cubes via a raycast.
  const pickAt = (e: React.PointerEvent | React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button,a,input,textarea,[role=dialog]")) return null;
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    return cubeBridge.pick?.(x, y) ?? null;
  };

  return (
    <section id="memories" data-section="memories" className="relative" style={{ minHeight: "240vh" }} aria-labelledby="memories-title">
      <div
        className={`sticky top-0 h-[100svh] w-full overflow-hidden transition-opacity duration-500 ${reading ? "pointer-events-none opacity-0" : "opacity-100"}`}
        style={{ cursor: hover ? "pointer" : undefined }}
        data-cursor={hover ? "OPEN ECHO" : undefined}
        onPointerDown={(e) => {
          if (!active || e.pointerType === "touch" || (e.target as HTMLElement).closest("button,a,input,textarea")) return;
          dragRef.current = { x: e.clientX, y: e.clientY, moved: false };
        }}
        onPointerMove={(e) => {
          if (!active) return;
          const d = dragRef.current;
          if (d) {
            const dx = (e.clientX - d.x) / window.innerWidth;
            const dy = (e.clientY - d.y) / window.innerHeight;
            if (Math.abs(dx) + Math.abs(dy) > 0.006) d.moved = true;
            // gentle orbit: clamp so the scene never swings far
            cubeBridge.orbit.tx = Math.max(-1, Math.min(1, -dx * 2.4));
            cubeBridge.orbit.ty = Math.max(-1, Math.min(1, dy * 2));
          }
          const id = d?.moved ? null : pickAt(e);
          if (id !== cubeBridge.hoverId) {
            cubeBridge.hoverId = id;
            if (id) tick();
          }
          setHover(id ? { id, x: e.clientX, y: e.clientY } : null);
        }}
        onPointerUp={() => {
          // spring back softly; keep `moved` so the following click is ignored
          cubeBridge.orbit.tx = 0;
          cubeBridge.orbit.ty = 0;
          if (dragRef.current && !dragRef.current.moved) dragRef.current = null;
        }}
        onPointerLeave={() => {
          cubeBridge.hoverId = null;
          cubeBridge.orbit.tx = 0;
          cubeBridge.orbit.ty = 0;
          dragRef.current = null;
          setHover(null);
        }}
        onClick={(e) => {
          if (!active) return;
          if (dragRef.current?.moved) {
            dragRef.current = null;
            return;
          }
          dragRef.current = null;
          const id = pickAt(e);
          if (!id) return;
          cubeBridge.hoverId = null;
          setHover(null);
          shimmer();
          setState({ drawer: { type: "memory-read", id } });
        }}
      >
        {hover && (
          <span
            className="pointer-events-none fixed z-20 -translate-y-full whitespace-nowrap bg-black/70 px-2 py-1 text-[11px] uppercase tracking-[0.1em] text-[#bff6ff]"
            style={{ left: hover.x + 14, top: hover.y - 8 }}
            data-font-bold
          >
            [ OPEN ECHO · {items.find((m) => m.id === hover.id)?.name ?? ""} ]
          </span>
        )}
        <GhostWall active={active} />
        <div className="absolute inset-x-4 top-[10%] grid grid-cols-4 md:top-[20%] lg:grid-cols-12">
          <div className="col-span-4 scrim lg:col-span-5 lg:col-start-7">
            <BracketHeading
              active={active}
              word="ROOM OF ECHOES"
              highlightClass="text-hl-vault"
              lines={["      ]]]", "            [[]]", "     ]][[ROOM OF ECHOES]]", "         ]]["]}
            />
            <h2 id="memories-title" className="sr-only">
              Guestbook: leave a memory
            </h2>
          </div>
          <div className="col-span-4 mt-5 scrim md:mt-10 lg:col-span-4 lg:col-start-8">
            <ScrambleText
              as="p"
              text="Every visitor leaves an echo. Leave yours in the grid, and it will drift here for the next person who passes through."
              active={active}
              delay={0.2}
              duration={1}
              className="copy block"
            />
            <ScrambleText
              as="p"
              text={loaded ? (count ? `[ ${count} ${count === 1 ? "echo" : "echoes"} stored ]` : "[ the room is empty. be the first ]") : "[ listening… ]"}
              active={active}
              delay={0.4}
              className="mt-4 block !text-[14px] text-[#3f8f99]"
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <HudButton active={active} onClick={() => setState({ drawer: { type: "memory-form" } })}>
                ADD A MEMORY
              </HudButton>
              {count > 0 && (
                <HudButton active={active} size="sm" onClick={() => setState({ drawer: { type: "memories" } })}>
                  READ ALL
                </HudButton>
              )}
            </div>
            {count > 0 && (
              <ScrambleText
                as="p"
                text="[ each echo sleeps inside a cube. click one to open it ]"
                active={active}
                delay={0.6}
                className="mt-4 hidden !text-[12px] text-gray-500 md:block"
              />
            )}
            {!enabled && <p className="mt-3 text-[13px] text-amber/80">Guestbook storage isn&apos;t configured on this deployment yet.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Terminal form ───────────── */
type Step = 0 | 1 | 2 | 3; // name, location, message, done

export function MemoryForm() {
  const open = useApp((s) => s.drawer?.type === "memory-form");
  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = () => setState({ drawer: null });

  useEffect(() => {
    if (!open) return;
    lockScroll(true);
    const reset = setTimeout(() => {
      setStep(0);
      setStatus("idle");
      setErr("");
    }, 0);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setState({ drawer: null });
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(reset);
      window.removeEventListener("keydown", onKey);
      lockScroll(false);
    };
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open, step]);

  const prompts = useMemo(
    () => [
      { q: "What should we call you?", hint: "Name_", max: 40 },
      { q: "Where are you transmitting from? (optional)", hint: "Location_", max: 40 },
      { q: "Leave a memory for the room.", hint: "Message_", max: 280 },
    ],
    [],
  );

  const next = async () => {
    setErr("");
    if (step === 0) {
      if (!name.trim()) return setErr("Please add a name (any name works).");
      click();
      setStep(1);
    } else if (step === 1) {
      click();
      setStep(2);
    } else if (step === 2) {
      if (message.trim().length < 3) return setErr("Your memory is a little short.");
      setStatus("sending");
      try {
        await postMemory({ name: name.trim(), location: location.trim(), message: message.trim(), website });
        chime();
        setStatus("idle");
        setStep(3);
        setMessage("");
        setTimeout(() => setState({ drawer: null }), 2400);
      } catch (e) {
        setStatus("error");
        setErr((e as Error).message);
      }
    }
  };

  const value = [name, location, message][step] ?? "";
  const setValue = [setName, setLocation, setMessage][step] ?? (() => {});

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={close} aria-hidden />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Add a memory"
            className="hud-frame relative w-full max-w-[620px] bg-[#010608]/90 p-6 md:p-8"
            initial={{ y: 18, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 10, scale: 0.99 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="hud-line" />
            <span className="hud-line" />
            <span className="hud-line" />
            <span className="hud-line" />
            <div className="flex items-start justify-between">
              <p className="whitespace-pre text-bracket" data-font-bold>
                {"[["}
                <span className="text-hl-vault">ADD A MEMORY</span>
                {"]]_"}
              </p>
              <button type="button" onClick={close} onMouseEnter={tick} className="hud-small !text-[12px] text-gray-400 hover:text-white">
                Close
              </button>
            </div>

            {/* progress */}
            <div className="mt-4 flex gap-2" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span key={i} className={`h-[2px] flex-1 transition-colors duration-500 ${i <= Math.min(step, 2) ? "bg-[#5fd0e0]" : "bg-white/10"}`} />
              ))}
            </div>

            {step < 3 ? (
              <form
                className="mt-8"
                onSubmit={(e) => {
                  e.preventDefault();
                  void next();
                }}
              >
                <p className="text-[13px] uppercase tracking-[0.1em] text-gray-500" data-font-bold>
                  {String(step + 1).padStart(2, "0")}/03 · {prompts[step].hint}
                </p>
                <label htmlFor="memory-input" className="mt-2 block text-[18px] text-gray-100" data-font-bold>
                  <ScrambleText key={step} text={prompts[step].q} duration={0.5} />
                </label>
                <div className="mt-4 flex items-start gap-2 border-b border-white/15 pb-2 focus-within:border-[#5fd0e0]">
                  <span className="pt-[2px] text-[#5fd0e0]" data-font-bold aria-hidden>
                    &gt;
                  </span>
                  {step === 2 ? (
                    <textarea
                      id="memory-input"
                      ref={inputRef}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      maxLength={prompts[step].max}
                      rows={3}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void next();
                        }
                      }}
                      className="w-full resize-none bg-transparent text-[16px] leading-relaxed text-[#bff6ff] outline-none placeholder:text-gray-600"
                      placeholder="A thought, a wish, a hello…"
                    />
                  ) : (
                    <input
                      id="memory-input"
                      ref={inputRef}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      maxLength={prompts[step].max}
                      autoComplete={step === 0 ? "nickname" : "address-level2"}
                      className="w-full bg-transparent text-[16px] text-[#bff6ff] outline-none placeholder:text-gray-600"
                      placeholder={step === 0 ? "Your name" : "City, Country"}
                    />
                  )}
                </div>
                {/* honeypot */}
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  name="website"
                  className="absolute -left-[9999px] h-0 w-0 opacity-0"
                />
                <div className="mt-3 flex items-center justify-between text-[12px] text-gray-500">
                  <span className="flex flex-wrap items-center gap-2">
                    <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-semibold text-white/90">ENTER</kbd>
                    {step === 2 ? "to send" : "to continue"}
                    {step === 2 && (
                      <>
                        <kbd className="ml-2 rounded bg-white/10 px-1.5 py-0.5 font-semibold text-white/90">SHIFT+ENTER</kbd> new line
                      </>
                    )}
                  </span>
                  <span>
                    {value.length}/{prompts[step].max}
                  </span>
                </div>
                <p className="mt-3 min-h-[20px] text-[13px] text-red-400" role="alert">
                  {err}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={step === 0}
                    onClick={() => setStep((s) => (s > 0 ? ((s - 1) as Step) : s))}
                    className="hud-small !text-[12px] text-gray-500 hover:text-white disabled:opacity-30"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    onMouseEnter={tick}
                    className="hud-frame px-5 py-2 text-[14px] uppercase tracking-[0.1em] text-loader-pct disabled:opacity-50"
                    data-font-bold
                  >
                    <span className="hud-line" />
                    <span className="hud-line" />
                    <span className="hud-line" />
                    <span className="hud-line" />
                    {status === "sending" ? "Transmitting…" : step === 2 ? "Send memory" : "Next"}
                  </button>
                </div>
                <p className="mt-6 text-[11px] leading-relaxed text-gray-600">
                  Memories are public on this page. Please be kind; no links or personal details.
                </p>
              </form>
            ) : (
              <div className="py-12 text-center" role="status">
                <ScrambleText as="p" text="Memory sent. Thank you." duration={0.8} className="block text-[#bff6ff]" />
                <p className="mt-2 text-[13px] text-gray-500">It&apos;s drifting into the room now.</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────────── Read-all drawer body (+ moderator mode) ───────────── */
const MOD_KEY = "awr-mod-token";

export function MemoriesList() {
  const { items } = useMemories();
  const [mod, setMod] = useState<string | null>(null); // token when unlocked
  const [asking, setAsking] = useState(false);
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Restore an unlocked session (sessionStorage: cleared when the tab closes).
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(MOD_KEY);
    } catch {}
    if (saved === null) return;
    void verifyModerator(saved).then((ok) => ok && setMod(saved));
  }, []);

  const unlock = async (token: string) => {
    setMsg("");
    if (await verifyModerator(token)) {
      setMod(token);
      setAsking(false);
      setPw("");
      try {
        sessionStorage.setItem(MOD_KEY, token);
      } catch {}
    } else {
      setMsg("Wrong moderator password.");
      setAsking(true);
    }
  };

  const lock = () => {
    setMod(null);
    setConfirmId(null);
    try {
      sessionStorage.removeItem(MOD_KEY);
    } catch {}
  };

  const remove = async (id: string) => {
    if (mod === null) return;
    setBusyId(id);
    setMsg("");
    try {
      await deleteMemory(id, mod);
      click();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  return (
    <div>
      <p className="whitespace-pre text-bracket" data-font-bold aria-hidden>
        {"   ]][["}
        <span className="text-hl-vault">ROOM OF ECHOES</span>
        {"]]"}
      </p>
      <h2 className="mt-2 text-loader-pct" data-font-bold>
        {items.length} {items.length === 1 ? "memory" : "memories"}
      </h2>
      {mod !== null && (
        <p className="mt-3 inline-flex items-center gap-2 border border-amber/40 bg-amber/10 px-2 py-1 text-[12px] uppercase tracking-[0.1em] text-amber" data-font-bold>
          <span className="h-1.5 w-1.5 animate-hud-pulse bg-amber" aria-hidden /> Moderator mode
        </p>
      )}
      <ul className="mt-8 space-y-6">
        {items.map((m) => (
          <li key={m.id} className="group flex items-start gap-3 border-l border-[#2f8f99]/50 pl-4">
            <button
              type="button"
              onClick={() => setState({ drawer: { type: "memory-read", id: m.id } })}
              onMouseEnter={tick}
              className="min-w-0 flex-1 text-left hover:[&>p:first-child]:text-white"
              title="Open this memory in its cube"
            >
              <p className="whitespace-pre-line break-words text-[16px] leading-relaxed text-gray-200">“{m.message}”</p>
              <p className="mt-1 text-[12px] uppercase tracking-[0.1em] text-[#3f8f99]" data-font-bold>
                — {m.name}
                {m.location ? ` · ${m.location}` : ""} · {fmtDate(m.createdAt)}
              </p>
            </button>
            {mod !== null &&
              (confirmId === m.id ? (
                <span className="flex shrink-0 items-center gap-2 text-[12px]" data-font-bold>
                  <button
                    type="button"
                    onClick={() => void remove(m.id)}
                    disabled={busyId === m.id}
                    className="border border-red-500/60 bg-red-500/15 px-2 py-1 uppercase tracking-[0.08em] text-red-300 hover:bg-red-500/30"
                  >
                    {busyId === m.id ? "Deleting…" : "Delete"}
                  </button>
                  <button type="button" onClick={() => setConfirmId(null)} className="px-1 uppercase tracking-[0.08em] text-gray-500 hover:text-white">
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(m.id)}
                  onMouseEnter={tick}
                  aria-label={`Delete memory from ${m.name}`}
                  title="Delete this memory"
                  className="shrink-0 border border-white/10 px-2 py-0.5 text-[13px] text-gray-400 hover:border-red-500/60 hover:text-red-300"
                  data-font-bold
                >
                  ✕
                </button>
              ))}
          </li>
        ))}
      </ul>
      <div className="mt-10">
        <HudButton onClick={() => setState({ drawer: { type: "memory-form" } })}>ADD A MEMORY</HudButton>
      </div>

      {/* Moderator controls: deliberately low-key */}
      <div className="mt-12 border-t border-white/10 pt-4 text-[12px] text-gray-600">
        {mod !== null ? (
          <button type="button" onClick={lock} className="uppercase tracking-[0.1em] hover:text-white" data-font-bold>
            Exit moderator mode
          </button>
        ) : asking ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void unlock(pw);
            }}
          >
            <label htmlFor="mod-pw" className="sr-only">
              Moderator password
            </label>
            <input
              id="mod-pw"
              type="password"
              autoFocus
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Moderator password"
              autoComplete="current-password"
              className="w-56 border border-white/15 bg-white/[0.04] px-2 py-1 text-[13px] text-gray-200 outline-none focus:border-white/40"
            />
            <button type="submit" className="border border-white/15 px-2 py-1 uppercase tracking-[0.1em] text-gray-300 hover:border-white/40" data-font-bold>
              Unlock
            </button>
            <button type="button" onClick={() => setAsking(false)} className="px-1 uppercase tracking-[0.1em] hover:text-white" data-font-bold>
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => void verifyModerator("").then((ok) => (ok ? unlock("") : setAsking(true)))}
            className="uppercase tracking-[0.1em] hover:text-white"
            data-font-bold
          >
            Moderate
          </button>
        )}
        {msg && (
          <p className="mt-2 text-red-400" role="alert">
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}

/* ───────────── Reader: fly inside a cube and read the memory ───────────── */
const monthYear = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  } catch {
    return "";
  }
};

export function MemoryReader() {
  const drawer = useApp((s) => s.drawer);
  const id = drawer?.type === "memory-read" ? drawer.id : null;
  const { items } = useMemories();
  const idx = id ? items.findIndex((m) => m.id === id) : -1;
  const m = idx >= 0 ? items[idx] : null;
  const [ready, setReady] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);

  // Reset the reveal whenever a new memory opens (render-time state sync).
  if (id !== lastId) {
    setLastId(id);
    setReady(false);
  }

  useEffect(() => {
    if (!id) return;
    // Only fly the camera when that memory has a cube on screen (newest 48).
    cubeBridge.focusId = cubeBridge.positions.has(id) ? id : null;
    whoosh();
    const t = setTimeout(() => setReady(true), cubeBridge.focusId ? 950 : 150);
    return () => clearTimeout(t);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    lockScroll(true);
    return () => {
      lockScroll(false);
      cubeBridge.focusId = null;
    };
  }, [id]);

  const go = (d: number) => {
    if (!items.length || idx < 0) return;
    const next = items[(idx + d + items.length) % items.length];
    click();
    setState({ drawer: { type: "memory-read", id: next.id } });
  };
  const close = () => setState({ drawer: null });

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const corner = "absolute h-4 w-4 bg-[#bff6ff]/80 shadow-[0_0_18px_rgba(150,240,255,.6)]";
  return (
    <AnimatePresence>
      {m && (
        <motion.div
          key="reader"
          role="dialog"
          aria-modal="true"
          aria-label={`Memory from ${m.name}`}
          className="fixed inset-0 z-[65] cursor-pointer select-none"
          onClick={close}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* soft vignette so text reads over the grid */}
          <div className="absolute inset-0" style={{ background: "radial-gradient(60% 55% at 50% 50%, rgba(0,8,12,.55) 0%, rgba(0,0,0,.15) 60%, rgba(0,0,0,.55) 100%)" }} />
          {/* HUD corners */}
          <span className={`${corner} left-3 top-3`} />
          <span className={`${corner} right-3 top-3`} />
          <span className={`${corner} bottom-3 left-3`} />
          <span className={`${corner} bottom-3 right-3`} />

          <div className="absolute inset-0 flex items-center justify-center px-6">
            <figure className="max-w-[680px] text-center" style={{ textShadow: "0 0 18px rgba(60,200,230,.45), 0 0 2px rgba(0,0,0,.9)" }}>
              <blockquote className="whitespace-pre-line text-[clamp(16px,1.6vw,22px)] leading-relaxed text-[#8fe3ec]" data-font-bold>
                <ScrambleText key={`msg-${m.id}`} text={m.message} active={ready} duration={1.2} />
              </blockquote>
              {m.location && (
                <p className="mt-8 text-[15px] text-[#5fbac5]" data-font-bold>
                  <ScrambleText key={`loc-${m.id}`} text={`Transmitted from ${m.location}`} active={ready} delay={0.5} duration={0.7} />
                </p>
              )}
              <figcaption className="mt-8 space-y-1 text-[16px]" data-font-bold>
                <ScrambleText key={`date-${m.id}`} as="p" text={monthYear(m.createdAt)} active={ready} delay={0.8} duration={0.6} className="block text-[#7fd6df]" />
                <ScrambleText key={`name-${m.id}`} as="p" text={m.name} active={ready} delay={1.1} duration={1.6} className="block text-[#bff6ff]" />
              </figcaption>
            </figure>
          </div>

          <div className="absolute inset-x-0 bottom-8 flex items-center justify-center gap-6 text-[12px] uppercase tracking-[0.12em] text-gray-500" data-font-bold>
            {items.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="px-2 py-1 hover:text-white"
                aria-label="Previous memory"
              >
                ‹ prev
              </button>
            )}
            <span className="animate-pulse">click anywhere to return</span>
            {items.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="px-2 py-1 hover:text-white"
                aria-label="Next memory"
              >
                next ›
              </button>
            )}
          </div>
          <p className="absolute right-6 top-6 text-[11px] uppercase tracking-[0.12em] text-gray-600" data-font-bold>
            {idx + 1} / {items.length}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
