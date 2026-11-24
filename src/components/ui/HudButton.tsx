"use client";

import { forwardRef, type ReactNode } from "react";
import { click, tick } from "@/lib/sound";
import ScrambleText from "./ScrambleText";

type Props = {
  children: string;
  onClick?: () => void;
  href?: string;
  download?: boolean;
  className?: string;
  active?: boolean;
  icon?: ReactNode;
  size?: "md" | "sm";
  external?: boolean;
  ariaLabel?: string;
};

/** Hairline-framed HUD button with 2px corner pixels (matches the reference CTA). */
const HudButton = forwardRef<HTMLButtonElement & HTMLAnchorElement, Props>(function HudButton(
  { children, onClick, href, download, className = "", active = true, icon, size = "md", external, ariaLabel },
  ref,
) {
  const pad = size === "md" ? "px-6 py-[14px] min-w-[200px]" : "px-3 py-2 min-w-0";
  const cls = `hud-frame hud-btn group inline-flex items-center justify-center gap-2 bg-[#03080e]/55 text-loader-pct uppercase backdrop-blur-[3px] hover:bg-[#0b1824]/70 ${pad} ${className}`;
  const inner = (
    <>
      <span className="hud-line" />
      <span className="hud-line" />
      <span className="hud-line" />
      <span className="hud-line" />
      {icon}
      <ScrambleText text={children} hover active={active} duration={0.6} className={`font-bold !tracking-[0.14em] ${size === "sm" ? "!text-[12px]" : "!text-[14px]"}`} />
    </>
  );
  const handlers = {
    onMouseEnter: () => tick(),
    onClick: () => {
      click();
      onClick?.();
    },
  };
  if (href) {
    return (
      <a
        ref={ref}
        href={href}
        className={cls}
        download={download}
        aria-label={ariaLabel ?? children}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        {...handlers}
      >
        {inner}
      </a>
    );
  }
  return (
    <button ref={ref} type="button" className={cls} aria-label={ariaLabel ?? children} {...handlers}>
      {inner}
    </button>
  );
});

export default HudButton;
