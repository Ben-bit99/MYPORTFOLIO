"use client";
/**
 * Generative ambient score + UI sound effects (WebAudio, no audio files).
 *
 *  Score: evolving chord pads (detuned saws → slow-moving low-pass), sub bass,
 *  sparse bell/arpeggio melodies through a dotted-eighth delay, everything into
 *  a long synthetic reverb. Each section has its own "mood" (key, chords, tempo,
 *  brightness, rain), and moods crossfade on the next chord change.
 *
 *  Your own music (files you have the rights to), in `public/audio/`:
 *    - `<section>.mp3` plays only in that section: hero, about, works, timeline,
 *      vault, memories, contact (e.g. `memories.mp3`).
 *    - `theme.mp3` plays in every section that has no file of its own.
 *    - A section with neither keeps the generative score.
 *  Tracks crossfade when the visitor scrolls between sections and each resumes
 *  where it left off. UI sounds always play.
 */

type Mood = {
  chords: number[][]; // MIDI notes
  chordDur: number; // seconds
  grid: number; // arp step (s)
  arpProb: number; // chance per step
  bellOct: number; // octaves above chord for melody
  cutoff: number; // pad filter base (Hz)
  rain: number; // rain bed level
  pad: number; // pad level
};

const MOODS: Record<string, Mood> = {
  city: {
    // A minor: Am9 · Fmaj7#11 · Cmaj7 · G6/9
    chords: [
      [45, 57, 60, 64, 67, 71],
      [41, 53, 57, 60, 64, 71],
      [36, 48, 55, 59, 64, 67],
      [43, 55, 59, 62, 64, 69],
    ],
    chordDur: 8,
    grid: 0.5,
    arpProb: 0.28,
    bellOct: 1,
    cutoff: 820,
    rain: 0.06,
    pad: 0.5,
  },
  works: {
    // D lydian, brighter & quicker: Dmaj9 · Bm11 · Gmaj9 · A6sus
    chords: [
      [38, 50, 57, 61, 64, 66],
      [35, 47, 54, 57, 62, 64],
      [31, 43, 50, 54, 57, 62],
      [33, 45, 52, 57, 59, 62],
    ],
    chordDur: 6,
    grid: 0.25,
    arpProb: 0.42,
    bellOct: 1,
    cutoff: 1450,
    rain: 0,
    pad: 0.42,
  },
  timeline: {
    chords: [
      [38, 50, 57, 61, 64, 66],
      [31, 43, 50, 54, 57, 62],
      [35, 47, 54, 57, 62, 64],
      [33, 45, 52, 57, 59, 62],
    ],
    chordDur: 7,
    grid: 0.375,
    arpProb: 0.35,
    bellOct: 1,
    cutoff: 1100,
    rain: 0,
    pad: 0.45,
  },
  vault: {
    // E minor, crystalline: Em9 · Cmaj7#11 · Am9 · Bsus4
    chords: [
      [40, 52, 55, 59, 62, 66],
      [36, 48, 55, 59, 64, 66],
      [33, 45, 52, 55, 59, 64],
      [35, 47, 52, 54, 59, 64],
    ],
    chordDur: 8,
    grid: 0.375,
    arpProb: 0.32,
    bellOct: 2,
    cutoff: 680,
    rain: 0,
    pad: 0.5,
  },
};

const SECTION_MOOD: Record<string, keyof typeof MOODS> = {
  hero: "city",
  about: "city",
  contact: "city",
  works: "works",
  timeline: "timeline",
  vault: "vault",
  memories: "vault",
};

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

type Engine = {
  ctx: AudioContext;
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
  reverb: ConvolverNode;
  reverbSend: GainNode;
  delaySend: GainNode;
  padFilter: BiquadFilterNode;
  rainGain: GainNode;
  noiseBuf: AudioBuffer;
};

type Track = { el: HTMLAudioElement; gain: GainNode };

let engine: Engine | null = null;
let enabled = false;
let mood: keyof typeof MOODS = "city";
let chordIdx = 0;
let nextChordAt = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let activePad: { stop: (t: number) => void } | null = null;
let useTrack = false;

/* ── Per-section music files ── */
const TRACK_SECTIONS = ["hero", "about", "works", "timeline", "vault", "memories", "contact"] as const;
const TRACK_VOL = 0.8;
const FADE = 1.6; // seconds
let section = "hero";
let trackUrls: Record<string, string | null> | null = null; // section → file (null = generative)
const tracks = new Map<string, Track>();
let currentUrl: string | null = null;

async function exists(url: string) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok && !(r.headers.get("content-type") ?? "").includes("text/html");
  } catch {
    return false;
  }
}

async function discoverTracks() {
  const [theme, ...own] = await Promise.all([
    exists("/audio/theme.mp3"),
    ...TRACK_SECTIONS.map((s) => exists(`/audio/${s}.mp3`)),
  ]);
  const map: Record<string, string | null> = {};
  TRACK_SECTIONS.forEach((s, i) => (map[s] = own[i] ? `/audio/${s}.mp3` : theme ? "/audio/theme.mp3" : null));
  trackUrls = map;
  syncTrack();
}

function getTrack(e: Engine, url: string): Track {
  let t = tracks.get(url);
  if (!t) {
    const el = new Audio(url);
    el.loop = true;
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    const gain = e.ctx.createGain();
    gain.gain.value = 0;
    e.ctx.createMediaElementSource(el).connect(gain).connect(e.music);
    t = { el, gain };
    tracks.set(url, t);
  }
  return t;
}

/** Crossfade to the file for the current section (or back to the generative score). */
function syncTrack() {
  const e = engine;
  if (!e || !trackUrls) return;
  const url = trackUrls[section] ?? trackUrls.hero ?? null;
  const now = e.ctx.currentTime;
  if (url !== currentUrl) {
    if (currentUrl) {
      const old = tracks.get(currentUrl);
      if (old) {
        old.gain.gain.cancelScheduledValues(now);
        old.gain.gain.setValueAtTime(old.gain.gain.value, now);
        old.gain.gain.linearRampToValueAtTime(0, now + FADE);
        const el = old.el;
        const was = currentUrl;
        setTimeout(() => currentUrl !== was && el.pause(), FADE * 1000 + 100);
      }
    }
    currentUrl = url;
    useTrack = !!url;
    if (url) {
      activePad?.stop(now);
      activePad = null;
      const t = getTrack(e, url);
      t.gain.gain.cancelScheduledValues(now);
      t.gain.gain.setValueAtTime(t.gain.gain.value, now);
      t.gain.gain.linearRampToValueAtTime(TRACK_VOL, now + FADE);
    } else if (enabled) {
      nextChordAt = now + 0.3; // bring the generative pads straight back
    }
  }
  if (url) {
    const el = tracks.get(url)!.el;
    if (enabled && el.paused) void el.play().catch(() => {});
  }
}

function makeNoise(ctx: AudioContext, seconds = 4) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  return buf;
}

function makeImpulse(ctx: AudioContext, seconds = 4.5, decay = 2.6) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function init(): Engine | null {
  if (engine) return engine;
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  comp.connect(ctx.destination);

  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(comp);

  const music = ctx.createGain();
  music.gain.value = 0.9;
  music.connect(master);
  const sfx = ctx.createGain();
  sfx.gain.value = 1;
  sfx.connect(master);

  // Reverb
  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(ctx);
  const reverbOut = ctx.createGain();
  reverbOut.gain.value = 0.55;
  reverb.connect(reverbOut).connect(music);
  const reverbSend = ctx.createGain();
  reverbSend.gain.value = 1;
  reverbSend.connect(reverb);

  // Dotted-eighth delay with darkening feedback
  const delay = ctx.createDelay(2);
  delay.delayTime.value = 0.42;
  const fb = ctx.createGain();
  fb.gain.value = 0.38;
  const dl = ctx.createBiquadFilter();
  dl.type = "lowpass";
  dl.frequency.value = 2600;
  delay.connect(dl).connect(fb).connect(delay);
  const delayOut = ctx.createGain();
  delayOut.gain.value = 0.35;
  dl.connect(delayOut).connect(music);
  delayOut.connect(reverbSend);
  const delaySend = ctx.createGain();
  delaySend.connect(delay);

  // Pad filter with slow LFO
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = MOODS.city.cutoff;
  padFilter.Q.value = 2.5;
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  lfo.frequency.value = 0.045;
  lfoG.gain.value = 260;
  lfo.connect(lfoG).connect(padFilter.frequency);
  lfo.start();
  const padOut = ctx.createGain();
  padOut.gain.value = 1;
  padFilter.connect(padOut);
  padOut.connect(music);
  padOut.connect(reverbSend);

  // Rain bed
  const noiseBuf = makeNoise(ctx);
  const rain = ctx.createBufferSource();
  rain.buffer = noiseBuf;
  rain.loop = true;
  const rf = ctx.createBiquadFilter();
  rf.type = "bandpass";
  rf.frequency.value = 2000;
  rf.Q.value = 0.5;
  const rainGain = ctx.createGain();
  rainGain.gain.value = 0;
  rain.connect(rf).connect(rainGain).connect(music);
  rain.start();

  engine = { ctx, master, music, sfx, reverb, reverbSend, delaySend, padFilter, rainGain, noiseBuf };

  void discoverTracks();

  return engine;
}

/* ───────────── Score ───────────── */
function playPad(e: Engine, notes: number[], at: number, dur: number, level: number) {
  const { ctx, padFilter } = e;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, at);
  out.gain.linearRampToValueAtTime(level, at + 2.8);
  out.connect(padFilter);
  const oscs: OscillatorNode[] = [];
  const [bass, ...upper] = notes;
  for (const n of upper) {
    for (const det of [-7, 6]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = mtof(n);
      o.detune.value = det + (Math.random() - 0.5) * 4;
      const g = ctx.createGain();
      g.gain.value = 0.035;
      o.connect(g).connect(out);
      o.start(at);
      oscs.push(o);
    }
  }
  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.value = mtof(bass);
  const sg = ctx.createGain();
  sg.gain.value = 0.16;
  sub.connect(sg).connect(out);
  sub.start(at);
  oscs.push(sub);

  const stop = (t: number) => {
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(out.gain.value, t);
    out.gain.linearRampToValueAtTime(0, t + 4);
    oscs.forEach((o) => {
      try {
        o.stop(t + 4.2);
      } catch {}
    });
  };
  // Safety stop if never replaced
  oscs.forEach((o) => o.stop(at + dur + 8));
  return { stop };
}

function bell(e: Engine, midi: number, at: number, vel = 0.12, toDelay = 0.5) {
  const { ctx, music, reverbSend, delaySend } = e;
  const f = mtof(midi);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(vel, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 2.4);
  const o1 = ctx.createOscillator();
  o1.type = "sine";
  o1.frequency.value = f;
  const o2 = ctx.createOscillator();
  o2.type = "triangle";
  o2.frequency.value = f * 2.001;
  const g2 = ctx.createGain();
  g2.gain.value = 0.25;
  o1.connect(g);
  o2.connect(g2).connect(g);
  g.connect(music);
  const rs = ctx.createGain();
  rs.gain.value = 0.7;
  g.connect(rs).connect(reverbSend);
  const ds = ctx.createGain();
  ds.gain.value = toDelay;
  g.connect(ds).connect(delaySend);
  o1.start(at);
  o2.start(at);
  o1.stop(at + 2.6);
  o2.stop(at + 2.6);
}

function scheduleChord(e: Engine, at: number) {
  const m = MOODS[mood];
  const chord = m.chords[chordIdx % m.chords.length];
  chordIdx++;

  // Filter + rain follow the mood
  e.padFilter.frequency.setTargetAtTime(m.cutoff, at, 1.5);
  e.rainGain.gain.setTargetAtTime(m.rain, at, 1.5);

  if (!useTrack) {
    activePad?.stop(at);
    activePad = playPad(e, chord, at, m.chordDur, m.pad);
  }

  // Melody: sparse random walk over the chord tones, up an octave or two
  const pool = chord.slice(1).map((n) => n + 12 * m.bellOct);
  let last = Math.floor(Math.random() * pool.length);
  for (let t = 0.6; t < m.chordDur - 0.3; t += m.grid) {
    if (Math.random() > m.arpProb) continue;
    last = Math.max(0, Math.min(pool.length - 1, last + Math.floor(Math.random() * 3) - 1));
    const n = pool[last] + (Math.random() < 0.15 ? 12 : 0);
    bell(e, n, at + t, useTrack ? 0.05 : 0.07 + Math.random() * 0.05);
  }
}

function startScheduler() {
  const e = engine;
  if (!e || timer) return;
  nextChordAt = e.ctx.currentTime + 0.3;
  timer = setInterval(() => {
    if (!engine || !enabled) return;
    const now = engine.ctx.currentTime;
    if (now >= nextChordAt - 0.25) {
      scheduleChord(engine, Math.max(now + 0.05, nextChordAt));
      nextChordAt = Math.max(now, nextChordAt) + MOODS[mood].chordDur;
    }
  }, 120);
}

function stopScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
  if (engine) activePad?.stop(engine.ctx.currentTime);
  activePad = null;
}

/* ───────────── Public API ───────────── */
export function setSoundEnabled(on: boolean) {
  enabled = on;
  const e = on ? init() : engine;
  if (!e) return;
  if (on && e.ctx.state === "suspended") void e.ctx.resume();
  const t = e.ctx.currentTime;
  e.master.gain.cancelScheduledValues(t);
  e.master.gain.setTargetAtTime(on ? 0.55 : 0, t, on ? 1.2 : 0.25);
  if (on) {
    startScheduler();
    syncTrack();
  } else {
    setTimeout(() => {
      if (enabled) return;
      stopScheduler();
      tracks.forEach((t) => t.el.pause());
    }, 600);
  }
}

/** Switch the score to the mood of a section; lands on the next bar quickly. */
export function setMood(sectionId: string) {
  section = sectionId;
  syncTrack();
  const next = SECTION_MOOD[sectionId] ?? "city";
  if (next === mood) return;
  mood = next;
  chordIdx = 0;
  if (engine && enabled) {
    const now = engine.ctx.currentTime;
    if (nextChordAt - now > 1.2) nextChordAt = now + 0.9; // pull the next chord forward
  }
}

/** Fade the background music out (e.g. while a video with its own sound plays) and back in. */
export function duckMusic(on: boolean) {
  const e = engine;
  if (!e) return;
  const t = e.ctx.currentTime;
  e.music.gain.cancelScheduledValues(t);
  e.music.gain.setTargetAtTime(on ? 0 : 0.9, t, on ? 0.25 : 0.8);
}

function blip(freq: number, dur: number, vol: number, type: OscillatorType = "sine") {
  if (!enabled || !engine) return;
  const { ctx, sfx } = engine;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(sfx);
  o.start(t);
  o.stop(t + dur + 0.02);
}

let lastTick = 0;
export function tick() {
  const now = performance.now();
  if (now - lastTick < 45) return;
  lastTick = now;
  blip(2100, 0.04, 0.035);
}

export function click() {
  blip(660, 0.12, 0.09);
}

/** Bright confirmation arpeggio (e.g. memory sent). */
export function chime() {
  if (!enabled || !engine) return;
  const t = engine.ctx.currentTime;
  [76, 81, 83, 88].forEach((n, i) => bell(engine!, n, t + i * 0.09, 0.12, 0.6));
}

/** Harmonic shimmer: hologram surge / opening an echo. */
export function shimmer() {
  if (!enabled || !engine) return;
  const t = engine.ctx.currentTime;
  [69, 76, 81, 85, 88, 93].forEach((n, i) => bell(engine!, n, t + i * 0.045, 0.05 + (i % 2) * 0.02, 0.7));
}

export function whoosh() {
  if (!enabled || !engine) return;
  const { ctx, sfx, noiseBuf, reverbSend } = engine;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 1.4;
  f.frequency.setValueAtTime(260, t);
  f.frequency.exponentialRampToValueAtTime(2600, t + 0.7);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.14, t + 0.18);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
  src.connect(f).connect(g).connect(sfx);
  g.connect(reverbSend);
  src.start(t);
  src.stop(t + 1.1);
}
