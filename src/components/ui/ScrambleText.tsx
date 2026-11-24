"use client";

import { useCallback, useEffect, useRef, useState, type ElementType } from "react";
import { getState } from "@/lib/store";

const GLYPHS = "awr#@$%&*<>/=+01xz";

/**
 * Word-by-word scramble reveal: words resolve left-to-right while the
 * unresolved ones show random glyphs (re-rolled every few frames).
 */
export function scrambleFrame(text: string, progress: number): string {
  const parts = text.split(/(\s+)/);
  const words = Math.ceil(parts.length / 2);
  const revealed = Math.floor(words * progress);
  let w = 0;
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (i % 2 === 1) {
      out += p;
      continue;
    }
    if (progress >= 1 || w < revealed) out += p;
    else for (let c = 0; c < p.length; c++) out += /[\[\]_|]/.test(p[c]) ? p[c] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    w++;
  }
  return out;
}

type Props = {
  text: string;
  as?: ElementType;
  className?: string;
  /** seconds */
  duration?: number;
  delay?: number;
  /** When false the text is hidden (opacity 0); flipping to true plays the reveal. */
  active?: boolean;
  /** Re-scramble on hover (HUD links/buttons) */
  hover?: boolean;
  highlight?: { substring: string; className: string };
  "aria-hidden"?: boolean;
  bold?: boolean;
};

export default function ScrambleText({
  text,
  as = "span",
  className = "",
  duration = 0.5,
  delay = 0,
  active = true,
  hover = false,
  highlight,
  bold = true,
  ...rest
}: Props) {
  const [display, setDisplay] = useState(text);
  const [visible, setVisible] = useState(false);
  const raf = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Safety net: whatever interrupts a scramble (re-trigger, cleanup, hidden tab),
  // the real text is always restored shortly after the animation's end.
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const play = useCallback(
    (d: number) => {
      cancelAnimationFrame(raf.current);
      if (getState().reducedMotion) {
        setDisplay(text);
        setVisible(true);
        return;
      }
      if (settle.current) clearTimeout(settle.current);
      settle.current = setTimeout(() => setDisplay(text), d * 1000 + 150);
      const start = performance.now();
      let n = 0;
      const loop = (now: number) => {
        const p = Math.min(1, (now - start) / (d * 1000));
        if (n++ % 3 === 0 || p >= 1) setDisplay(scrambleFrame(text, p));
        if (p < 1) raf.current = requestAnimationFrame(loop);
      };
      setVisible(true);
      raf.current = requestAnimationFrame(loop);
    },
    [text],
  );

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (active) {
      timer.current = setTimeout(() => play(duration), delay * 1000);
    } else {
      cancelAnimationFrame(raf.current);
      timer.current = setTimeout(() => setVisible(false), 0);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
      cancelAnimationFrame(raf.current);
    };
  }, [active, delay, duration, play]);

  const onEnter = hover ? () => play(Math.min(0.35, duration)) : undefined;

  let content: React.ReactNode = display;
  if (highlight) {
    const i = text.indexOf(highlight.substring);
    if (i >= 0) {
      const j = i + highlight.substring.length;
      content = (
        <>
          {display.slice(0, i)}
          <span className={highlight.className}>{display.slice(i, j)}</span>
          {display.slice(j)}
        </>
      );
    }
  }

  const Tag = as;
  return (
    <Tag
      className={`${className} transition-opacity duration-300`}
      style={{ opacity: visible ? 1 : 0 }}
      data-font-bold={bold ? true : undefined}
      onMouseEnter={onEnter}
      {...rest}
    >
      {rest["aria-hidden"] ? (
        content
      ) : (
        <>
          <span className="sr-only">{text}</span>
          <span aria-hidden="true">{content}</span>
        </>
      )}
    </Tag>
  );
}
