"use client";

/**
 * HUD-framed panel shown when a project's gameplay video hasn't been added yet.
 * Development: shows exact drop-in instructions. Production: a clean,
 * intentional "incoming" state, so visitors never see build instructions.
 */
export default function VideoSlotPlaceholder({
  expectedPath,
  compact = false,
  poster,
  kind = "GAMEPLAY",
}: {
  expectedPath?: string;
  compact?: boolean;
  poster?: string;
  /** What the slot is for, e.g. "GAMEPLAY" or "INTRO" */
  kind?: string;
}) {
  const dev = process.env.NODE_ENV !== "production";
  const file = expectedPath?.split("/").pop() ?? "video.mp4";
  return (
    <div className="hud-frame relative flex h-full w-full items-center justify-center overflow-hidden bg-[#03080d]">
      <span className="hud-line" />
      <span className="hud-line" />
      <span className="hud-line" />
      <span className="hud-line" />
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      )}
      <div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "linear-gradient(rgba(127,158,179,.09) 1px, transparent 1px) 0 0/24px 24px, linear-gradient(90deg, rgba(127,158,179,.09) 1px, transparent 1px) 0 0/24px 24px",
        }}
      />
      <div aria-hidden className="absolute inset-x-0 top-0 h-1/3 animate-pulse bg-gradient-to-b from-[#7f9eb3]/10 to-transparent" />
      <div className="relative z-10 px-4 text-center" data-font-bold>
        <p className="whitespace-pre text-bracket">{compact ? "[[ ]]" : "[[    ]]]_"}</p>
        <p className={`mt-1 text-loader-pct ${compact ? "!text-[12px]" : ""}`}>
          {dev ? `${kind} VIDEO SLOT READY` : `${kind} VIDEO // COMING SOON`}
        </p>
        {!compact && (
          <p className="mt-2 !text-[13px] text-gray-500">
            {dev ? (
              <>
                Drop <span className="text-loader-hl">{file}</span> into{" "}
                <span className="text-loader-hl">public/videos/</span>
                <br />
                or set <span className="text-loader-hl">externalVideoUrl</span> in portfolio.ts
              </>
            ) : (
              "Video capture in progress"
            )}
          </p>
        )}
      </div>
    </div>
  );
}
