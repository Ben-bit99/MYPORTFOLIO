"use client";

import { useEffect, useRef } from "react";
import type { VideoConfig } from "@/data/portfolio";
import { useResolvedVideo } from "@/lib/video";
import VideoSlotPlaceholder from "./VideoSlotPlaceholder";

/** Muted, looping hover preview. Mount only while hovered (lazy). */
export default function VideoPreview({ video, playing = true }: { video: VideoConfig; playing?: boolean }) {
  const v = useResolvedVideo(video);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (playing) el.play().catch(() => {});
    else el.pause();
  }, [playing, v.status]);

  if (v.status === "checking") return <div className="h-full w-full animate-pulse bg-white/[0.03]" />;
  if (v.status === "missing") return <VideoSlotPlaceholder compact expectedPath={v.expectedPath} poster={v.poster} />;
  if (v.status === "external") {
    const thumb = v.poster ?? v.thumb;
    return (
      <div className="relative h-full w-full bg-black">
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover opacity-80" loading="lazy" />
        )}
        <span className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 !text-[11px] uppercase text-loader-pct" data-font-bold>
          {`${v.provider} // play in details`}
        </span>
      </div>
    );
  }
  return (
    <video
      ref={ref}
      className="h-full w-full object-cover"
      muted
      loop
      playsInline
      preload="metadata"
      poster={v.poster}
      aria-hidden
    >
      {v.webm && <source src={v.webm} type="video/webm" />}
      <source src={v.src} type={v.src.endsWith(".webm") ? "video/webm" : "video/mp4"} />
    </video>
  );
}
