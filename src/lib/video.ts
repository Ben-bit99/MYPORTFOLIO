"use client";

import { useEffect, useState } from "react";
import type { VideoConfig } from "@/data/portfolio";

export type ResolvedVideo =
  | { status: "checking" }
  | { status: "local"; src: string; webm?: string; poster?: string }
  | { status: "external"; provider: "youtube" | "vimeo"; id: string; embedUrl: string; thumb?: string; poster?: string }
  | { status: "missing"; expectedPath?: string; poster?: string };

/** Parses YouTube / Vimeo URLs into embeddable form. */
export function parseExternal(url?: string): Extract<ResolvedVideo, { status: "external" }> | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let yt: string | null = null;
    if (host === "youtu.be") yt = u.pathname.slice(1);
    else if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      yt = u.searchParams.get("v") ?? u.pathname.match(/\/(embed|shorts|live)\/([^/?#]+)/)?.[2] ?? null;
    }
    if (yt && /^[\w-]{6,}$/.test(yt)) {
      return {
        status: "external",
        provider: "youtube",
        id: yt,
        embedUrl: `https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1&playsinline=1`,
        thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
      };
    }
    if (host.endsWith("vimeo.com")) {
      const id = u.pathname.match(/\/(?:video\/)?(\d+)/)?.[1];
      if (id) return { status: "external", provider: "vimeo", id, embedUrl: `https://player.vimeo.com/video/${id}?dnt=1&title=0&byline=0&portrait=0` };
    }
  } catch {}
  return null;
}

const cache = new Map<string, Promise<boolean>>();

/** HEAD-probe a public file once per session. */
export function fileExists(path: string): Promise<boolean> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(path, { method: "HEAD", cache: "no-store" })
        .then((r) => r.ok && !(r.headers.get("content-type") ?? "").includes("text/html"))
        .catch(() => false),
    );
  }
  return cache.get(path)!;
}

export function useResolvedVideo(video: VideoConfig): ResolvedVideo {
  const [state, setState] = useState<ResolvedVideo>({ status: "checking" });
  const { src, webm, poster, externalVideoUrl, preferExternal } = video;

  useEffect(() => {
    let alive = true;
    (async () => {
      const ext = parseExternal(externalVideoUrl);
      const [hasMp4, hasWebm, hasPoster] = await Promise.all([
        src ? fileExists(src) : false,
        webm ? fileExists(webm) : false,
        poster ? fileExists(poster) : false,
      ]);
      const p = hasPoster ? poster : undefined;
      let next: ResolvedVideo;
      if (ext && (preferExternal || (!hasMp4 && !hasWebm))) next = { ...ext, poster: p };
      else if (hasMp4 || hasWebm)
        next = { status: "local", src: hasMp4 ? src! : webm!, webm: hasMp4 && hasWebm ? webm : undefined, poster: p };
      else next = { status: "missing", expectedPath: src, poster: p };
      if (alive) setState(next);
    })();
    return () => {
      alive = false;
    };
  }, [src, webm, poster, externalVideoUrl, preferExternal]);

  return state;
}

export const fmtTime = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};
