"use client";

import ScrambleText from "./ScrambleText";

type Props = {
  /** Whitespace-preserved lines. The line containing `word` gets the highlight. */
  lines: string[];
  word: string;
  highlightClass: string;
  active: boolean;
  className?: string;
};

/**
 * Bracket-art section heading, e.g.
 *   [
 *       [[ABOUT]
 *     []]
 * Hierarchy comes from colour + indentation, not size (the reference's signature).
 */
export default function BracketHeading({ lines, word, highlightClass, active, className = "" }: Props) {
  return (
    <div className={`whitespace-pre text-bracket select-none ${className}`}>
      {lines.map((l, i) => {
        const has = l.includes(word);
        return (
          <ScrambleText
            key={i}
            as={has ? "h2" : "p"}
            text={l}
            active={active}
            delay={i * 0.06}
            duration={has ? 0.6 : 0.3}
            className={has ? "my-1 block leading-[1.15]" : i ? "mt-1 block" : "block"}
            highlight={
              has
                ? {
                    substring: word,
                    className: `${highlightClass} display mx-[0.12em] inline-block align-[-0.14em] text-[clamp(26px,2.5vw,40px)]`,
                  }
                : undefined
            }
            aria-hidden={has ? undefined : true}
          />
        );
      })}
    </div>
  );
}
