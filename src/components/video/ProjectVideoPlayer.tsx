"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VideoConfig } from "@/data/portfolio";
import { tick } from "@/lib/sound";
import { fmtTime, useResolvedVideo } from "@/lib/video";
import VideoSlotPlaceholder from "./VideoSlotPlaceholder";

type FsVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

function Ctl({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onMouseEnter={tick}
      className="flex h-8 min-w-8 items-center justify-center px-2 text-[13px] text-loader-pct hover:bg-white/10"
      data-font-bold
    >
      {children}
    </button>
  );
}

/**
 * Full player: local MP4/WebM with custom HUD controls (play/pause, mute,
 * scrub, time, fullscreen, keyboard), YouTube/Vimeo embeds, or a slot placeholder.
 */
export default function ProjectVideoPlayer({ video, title }: { video: VideoConfig; title: string }) {
  const v = useResolvedVideo(video);
  const wrap = useRef<HTMLDivElement>(null);
  const ref = useRef<FsVideo>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [error, setError] = useState(false);

  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }, []);

  const fullscreen = useCallback(() => {
    const el = ref.current;
    const box = wrap.current;
    if (!el || !box) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (box.requestFullscreen) void box.requestFullscreen().catch(() => el.webkitEnterFullscreen?.());
    else el.webkitEnterFullscreen?.();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = muted;
  }, [muted]);

  const onKey = (e: React.KeyboardEvent) => {
    const el = ref.current;
    if (!el) return;
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      toggle();
    } else if (e.key === "m") setMuted((m) => !m);
    else if (e.key === "f") fullscreen();
    else if (e.key === "ArrowRight") el.currentTime = Math.min(el.duration || 0, el.currentTime + 5);
    else if (e.key === "ArrowLeft") el.currentTime = Math.max(0, el.currentTime - 5);
  };

  const frame = "relative aspect-video w-full overflow-hidden bg-black";

  if (v.status === "checking") return <div className={`${frame} animate-pulse bg-white/[0.03]`} />;
  if (v.status === "missing" || error)
    return (
      <div className={frame}>
        <VideoSlotPlaceholder expectedPath={v.status === "missing" ? v.expectedPath : video.src} poster={v.status === "missing" ? v.poster : undefined} />
      </div>
    );
  if (v.status === "external")
    return (
      <div className={frame}>
        <iframe
          src={v.embedUrl}
          title={`${title} gameplay video`}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );

  const pct = dur ? (time / dur) * 100 : 0;

  return (
    <div
      ref={wrap}
      className={`${frame} group outline-none`}
      tabIndex={0}
      onKeyDown={onKey}
      role="group"
      aria-label={`${title} gameplay video player. Space to play or pause, M to mute, F for fullscreen, arrows to seek.`}
    >
      <video
        ref={ref}
        className="absolute inset-0 h-full w-full object-contain"
        poster={v.poster}
        preload="metadata"
        playsInline
        muted={muted}
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onProgress={(e) => {
          const b = e.currentTarget.buffered;
          if (b.length && e.currentTarget.duration) setBuffered((b.end(b.length - 1) / e.currentTarget.duration) * 100);
        }}
        onError={() => setError(true)}
      >
        {v.webm && <source src={v.webm} type="video/webm" />}
        <source src={v.src} type={v.src.endsWith(".webm") ? "video/webm" : "video/mp4"} />
      </video>

      {!playing && (
        <button
          type="button"
          onClick={toggle}
          className="hud-frame absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 px-6 py-3 text-loader-pct backdrop-blur-sm"
          aria-label="Play video"
          data-font-bold
        >
          <span className="hud-line" />
          <span className="hud-line" />
          <span className="hud-line" />
          <span className="hud-line" />
          [ PLAY ]
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/90 to-transparent px-2 pb-2 pt-8 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <Ctl label={playing ? "Pause" : "Play"} onClick={toggle}>
          {playing ? "❚❚" : "▶"}
        </Ctl>
        <Ctl label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((m) => !m)}>
          {muted ? "SND:OFF" : "SND:ON"}
        </Ctl>
        <div className="relative mx-2 h-6 flex-1">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/15" />
          <div className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-white/30" style={{ width: `${buffered}%` }} />
          <div className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 bg-loader-pct" style={{ width: `${pct}%` }} />
          <input
            type="range"
            min={0}
            max={dur || 0}
            step={0.05}
            value={time}
            onChange={(e) => {
              const el = ref.current;
              if (el) el.currentTime = Number(e.target.value);
            }}
            aria-label="Seek"
            aria-valuetext={`${fmtTime(time)} of ${fmtTime(dur)}`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
        <span className="tabular-nums px-1 !text-[12px] text-gray-400" data-font-bold>
          {fmtTime(time)} / {fmtTime(dur)}
        </span>
        <Ctl label="Fullscreen" onClick={fullscreen}>
          [ ]
        </Ctl>
      </div>
    </div>
  );
}
