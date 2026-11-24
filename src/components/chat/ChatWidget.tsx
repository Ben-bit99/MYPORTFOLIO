"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { chatStarters, profile } from "@/data/portfolio";
import type { SourceRef } from "@/lib/rag/types";
import { scrollToSection } from "@/lib/scroll";
import { click, tick } from "@/lib/sound";
import { setState, useApp } from "@/lib/store";

type Msg = { id: string; role: "user" | "assistant"; content: string; sources?: SourceRef[]; error?: boolean; mode?: string };

const MAX_LEN = 600;
const uid = () => Math.random().toString(36).slice(2, 10);

export default function ChatWidget() {
  const open = useApp((s) => s.chatOpen);
  const entered = useApp((s) => s.entered);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const setOpen = (v: boolean) => setState({ chatOpen: v });

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setState({ chatOpen: false });
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const reset = () => {
    abort.current?.abort();
    setMsgs([]);
    setBusy(false);
    setInput("");
  };

  const send = useCallback(
    async (text: string) => {
      const q = text.trim().slice(0, MAX_LEN);
      if (!q || busy) return;
      click();
      const user: Msg = { id: uid(), role: "user", content: q };
      const bot: Msg = { id: uid(), role: "assistant", content: "" };
      const history = [...msgs.filter((m) => !m.error), user].map(({ role, content }) => ({ role, content }));
      setMsgs((m) => [...m, user, bot]);
      setInput("");
      setBusy(true);
      const ctrl = new AbortController();
      abort.current = ctrl;
      const patch = (p: Partial<Msg>) => setMsgs((m) => m.map((x) => (x.id === bot.id ? { ...x, ...p } : x)));
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history.slice(-20) }),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          patch({ content: j.error ?? "Something went wrong. Please try again.", error: true });
          return;
        }
        let sources: SourceRef[] = [];
        try {
          sources = JSON.parse(decodeURIComponent(res.headers.get("X-Sources") ?? "[]"));
        } catch {}
        patch({ sources, mode: res.headers.get("X-Rag-Mode") ?? undefined });
        const reader = res.body?.getReader();
        const dec = new TextDecoder();
        let acc = "";
        if (reader) {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            acc += dec.decode(value, { stream: true });
            patch({ content: acc });
          }
        }
        if (!acc.trim()) {
          // AI provider failed mid-stream → ask the server for a grounded offline answer instead.
          const fb = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-rag-fallback": "1" },
            body: JSON.stringify({ messages: history.slice(-20) }),
            signal: ctrl.signal,
          }).catch(() => null);
          const text = fb && fb.ok ? await fb.text() : "";
          if (text.trim()) {
            let fbSources: SourceRef[] = [];
            try {
              fbSources = JSON.parse(decodeURIComponent(fb!.headers.get("X-Sources") ?? "[]"));
            } catch {}
            patch({ content: text, sources: fbSources, mode: "offline-fallback" });
          } else {
            patch({
              content: `The assistant couldn't answer right now. You can reach Abdul Wahib directly at ${profile.email}.`,
              error: true,
            });
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") patch({ content: "Network error. Please try again.", error: true });
      } finally {
        setBusy(false);
        abort.current = null;
      }
    },
    [busy, msgs],
  );

  const openSource = (s: SourceRef) => {
    click();
    if (s.projectSlug) setState({ drawer: { type: "project", slug: s.projectSlug } });
    else if (s.section === "Award") setState({ drawer: { type: "certificate", slug: s.id.replace("award:", "") } });
    else if (s.anchor) {
      setOpen(false);
      scrollToSection(s.anchor);
    }
  };

  if (!entered) return null;

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => {
          click();
          setOpen(!open);
        }}
        onMouseEnter={tick}
        className="hud-frame hud-btn ai-trigger fixed bottom-4 right-4 z-[55] flex items-center gap-2.5 bg-[#060d16]/55 px-4 py-2.5 text-loader-pct shadow-[0_10px_30px_rgba(0,0,0,.45)] backdrop-blur-md"
        aria-expanded={open}
        aria-controls="ai-chat"
        aria-label={open ? "Close AI assistant" : "Ask the AI assistant about Abdul Wahib"}
        data-font-bold
      >
        <span className="hud-line" />
        <span className="hud-line" />
        <span className="hud-line" />
        <span className="hud-line" />
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inset-0 animate-hud-pulse rounded-full bg-[#3dffa8] shadow-[0_0_10px_#3dffa8]" />
        </span>
        <span className="!text-[12px] font-bold !tracking-[0.16em]">{open ? "[ AI // CLOSE ]" : "[ AI // ASK ]"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.section
            id="ai-chat"
            role="dialog"
            aria-label="Portfolio AI assistant"
            data-lenis-prevent
            className="fixed inset-x-2 bottom-[64px] z-[55] flex max-h-[min(620px,calc(100svh-180px))] flex-col border border-white/10 bg-black/75 shadow-[0_0_60px_rgba(0,0,0,.6)] backdrop-blur-md md:inset-x-auto md:bottom-[72px] md:right-4 md:w-[420px]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div data-font-bold className="!text-[14px]">
                <span className="text-bracket">[[</span>
                <span className="text-loader-pct">AI // ASSISTANT</span>
                <span className="text-bracket">]_</span>
                <p className="!text-[11px] font-normal tracking-[0.08em] text-gray-500">Answers only from {profile.firstName}&apos;s portfolio</p>
              </div>
              <div className="flex items-center gap-3">
                {msgs.length > 0 && (
                  <button type="button" onClick={reset} onMouseEnter={tick} className="hud-small !text-[11px] text-gray-500 hover:text-white">
                    Reset
                  </button>
                )}
                <button type="button" onClick={() => setOpen(false)} onMouseEnter={tick} className="hud-small !text-[11px] text-gray-400 hover:text-white">
                  Close
                </button>
              </div>
            </header>

            <div ref={list} className="hud-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
              {msgs.length === 0 && (
                <div>
                  <p className="text-[15px] leading-relaxed text-gray-300">
                    Ask about {profile.firstName}&apos;s game &amp; XR projects, skills, education or the Global Game Jam award.
                  </p>
                  <ul className="mt-4 flex flex-col gap-2">
                    {chatStarters.map((s) => (
                      <li key={s}>
                        <button
                          type="button"
                          onClick={() => send(s)}
                          onMouseEnter={tick}
                          className="w-full border border-white/10 px-3 py-2 text-left text-[14px] text-gray-300 transition-colors hover:border-white/30 hover:bg-white/[0.04] hover:text-white"
                        >
                          <span className="text-bracket">&gt; </span>
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {msgs.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="text-[15px] text-loader-pct">
                    <span className="text-bracket">&gt; </span>
                    {m.content}
                  </div>
                ) : (
                  <div key={m.id}>
                    <div className={`whitespace-pre-wrap text-[15px] leading-relaxed ${m.error ? "text-red-400" : "text-gray-200"}`}>
                      {m.content || (
                        <span className="text-gray-500" aria-label="Thinking">
                          [ retrieving<span className="caret" /> ]
                        </span>
                      )}
                    </div>
                    {!!m.sources?.length && m.content && !m.error && (
                      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Sources">
                        {m.sources.map((s) => (
                          <li key={s.id}>
                            <button
                              type="button"
                              onClick={() => openSource(s)}
                              onMouseEnter={tick}
                              className="border border-[#2f8f99]/50 bg-[#2f8f99]/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.08em] text-[#7fd6df] hover:bg-[#2f8f99]/25"
                              title={`Source: ${s.section}`}
                            >
                              {s.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ),
              )}
            </div>

            <form
              className="border-t border-white/10 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <div className="flex items-end gap-2">
                <label htmlFor="chat-input" className="sr-only">
                  Your question
                </label>
                <textarea
                  id="chat-input"
                  ref={inputRef}
                  value={input}
                  maxLength={MAX_LEN}
                  rows={1}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder="Ask about projects, skills, awards…"
                  className="max-h-28 min-h-10 flex-1 resize-none bg-white/[0.04] px-3 py-2 text-[15px] text-gray-100 outline-none placeholder:text-gray-600 focus:bg-white/[0.07]"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  onMouseEnter={tick}
                  className="h-10 border border-white/15 px-3 text-[13px] uppercase tracking-[0.1em] text-loader-pct hover:border-white/40 disabled:opacity-40"
                  data-font-bold
                >
                  Send
                </button>
              </div>
              <p className="mt-2 flex justify-between text-[11px] text-gray-600">
                <span>
                  <kbd className="bg-white/10 px-1 text-gray-300">ENTER</kbd> send · <kbd className="bg-white/10 px-1 text-gray-300">ESC</kbd> close
                </span>
                <span>
                  {input.length}/{MAX_LEN}
                </span>
              </p>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
