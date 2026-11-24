"use client";
/**
 * Contact form (drawer content). Validates in the browser for instant feedback;
 * the API re-validates everything — the server is the source of truth.
 */
import { useEffect, useRef, useState } from "react";
import { profile } from "@/data/portfolio";
import { contactSchema, fieldErrors, LIMITS, type ContactField } from "@/lib/contact/schema";
import { chime, click, tick } from "@/lib/sound";
import { setState } from "@/lib/store";
import ScrambleText from "./ui/ScrambleText";

type Values = Record<ContactField, string>;
const EMPTY: Values = { name: "", email: "", subject: "", message: "" };

const FIELDS: { key: ContactField; label: string; type?: string; max: number; auto?: string; placeholder: string }[] = [
  { key: "name", label: "Name_", max: LIMITS.name, auto: "name", placeholder: "Your name" },
  { key: "email", label: "Email_", type: "email", max: LIMITS.email, auto: "email", placeholder: "you@studio.com" },
  { key: "subject", label: "Subject_", max: LIMITS.subject, auto: "off", placeholder: "Internship, collaboration, game jam…" },
];

export default function ContactForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<ContactField, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<ContactField, boolean>>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const startedAt = useRef<number>(0);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    const t = setTimeout(() => firstField.current?.focus({ preventScroll: true }), 120);
    return () => clearTimeout(t);
  }, []);

  const validate = (v: Values) => {
    const r = contactSchema.safeParse(v);
    return r.success ? {} : fieldErrors(r.error);
  };

  const update = (k: ContactField, val: string) => {
    const next = { ...values, [k]: val };
    setValues(next);
    if (touched[k]) setErrors(validate(next));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    const errs = validate(values);
    setTouched({ name: true, email: true, subject: true, message: true });
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = (["name", "email", "subject", "message"] as ContactField[]).find((k) => errs[k]);
      if (first) document.getElementById(`cf-${first}`)?.focus();
      return;
    }
    click();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, website, startedAt: startedAt.current }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: Partial<Record<ContactField, string>> };
      if (res.ok && j.ok) {
        chime();
        setStatus("sent");
        return;
      }
      if (j.fields) setErrors(j.fields);
      setServerError(j.error ?? "Something went wrong. Please try again.");
      setStatus("error");
    } catch {
      setServerError("Network error — check your connection and try again.");
      setStatus("error");
    }
  };

  const label = "block !text-[11px] font-bold uppercase !tracking-[0.18em] text-[#8fa3b8]";
  const input =
    "mt-1.5 w-full border bg-white/[0.04] px-3 py-2.5 font-sans text-[16px] font-medium text-white outline-none transition-colors placeholder:text-gray-600 focus:bg-white/[0.07]";
  const border = (k: ContactField) => (touched[k] && errors[k] ? "border-red-500/70 focus:border-red-400" : "border-white/15 focus:border-[#9fd4ff]/70");

  if (status === "sent") {
    return (
      <div className="py-10" role="status">
        <p className="whitespace-pre text-bracket" data-font-bold aria-hidden>
          {"[["}
          <span className="display text-[28px] text-[#3dffa8]">MESSAGE SENT</span>
          {"]]_"}
        </p>
        <ScrambleText
          as="p"
          text={`Thanks, ${values.name.split(" ")[0]}. Your message is on its way — I'll reply to ${values.email.trim().toLowerCase()}.`}
          duration={0.9}
          className="copy mt-6 block"
        />
        <button
          type="button"
          onClick={() => setState({ drawer: null })}
          onMouseEnter={tick}
          className="hud-link mt-8 !text-[11px] font-bold uppercase !tracking-[0.18em] text-[#9fb0c2] hover:text-white"
          data-font-bold
        >
          [ close ]
        </button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={submit} aria-describedby="cf-intro">
      <p className="whitespace-pre text-bracket" data-font-bold aria-hidden>
        {"   [["}
        <span className="display text-[30px] text-amber">SEND A MESSAGE</span>
        {"]_"}
      </p>
      <p id="cf-intro" className="mt-3 max-w-[46ch] text-[15px] font-medium leading-relaxed text-[#b9c6d3]">
        Goes straight to my inbox. I usually reply within a couple of days.
      </p>

      <div className="mt-8 grid gap-x-5 gap-y-2 sm:grid-cols-2">
        {FIELDS.map((f, i) => (
          <div key={f.key} className={f.key === "subject" ? "sm:col-span-2" : ""}>
            <label htmlFor={`cf-${f.key}`} className={label} data-font-bold>
              {f.label}
            </label>
            <input
              id={`cf-${f.key}`}
              ref={i === 0 ? firstField : undefined}
              type={f.type ?? "text"}
              value={values[f.key]}
              maxLength={f.max}
              autoComplete={f.auto}
              placeholder={f.placeholder}
              onChange={(e) => update(f.key, e.target.value)}
              onBlur={() => {
                setTouched((t) => ({ ...t, [f.key]: true }));
                setErrors(validate(values));
              }}
              aria-invalid={!!(touched[f.key] && errors[f.key])}
              aria-describedby={touched[f.key] && errors[f.key] ? `cf-${f.key}-err` : undefined}
              className={`${input} ${border(f.key)}`}
            />
            {/* fixed-height slot: showing an error never shifts the layout (no missed clicks) */}
            <p id={`cf-${f.key}-err`} className="mt-1.5 min-h-[18px] text-[13px] leading-[18px] text-red-400" aria-live="polite">
              {touched[f.key] && errors[f.key] ? errors[f.key] : ""}
            </p>
          </div>
        ))}

        <div className="sm:col-span-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="cf-message" className={label} data-font-bold>
              Message_
            </label>
            <span className={`!text-[11px] ${values.message.length > LIMITS.message * 0.9 ? "text-amber" : "text-gray-600"}`} data-font-bold>
              {values.message.length}/{LIMITS.message}
            </span>
          </div>
          <textarea
            id="cf-message"
            rows={7}
            value={values.message}
            maxLength={LIMITS.message}
            placeholder="Tell me about the project, role or idea…"
            onChange={(e) => update("message", e.target.value)}
            onBlur={() => {
              setTouched((t) => ({ ...t, message: true }));
              setErrors(validate(values));
            }}
            aria-invalid={!!(touched.message && errors.message)}
            aria-describedby={touched.message && errors.message ? "cf-message-err" : undefined}
            className={`${input} resize-y leading-relaxed ${border("message")}`}
          />
          <p id="cf-message-err" className="mt-1.5 min-h-[18px] text-[13px] leading-[18px] text-red-400" aria-live="polite">
            {touched.message && errors.message ? errors.message : ""}
          </p>
        </div>
      </div>

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill every field. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" />
        </label>
      </div>

      {status === "error" && serverError && (
        <p role="alert" className="mt-6 border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-[14px] text-red-300">
          {serverError}{" "}
          <a href={`mailto:${profile.email}`} className="underline underline-offset-2 hover:text-white">
            {profile.email}
          </a>
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-5">
        <button
          type="submit"
          disabled={status === "sending"}
          onMouseEnter={tick}
          className="hud-frame hud-btn min-w-[200px] bg-[#03080e]/55 px-6 py-[14px] text-[14px] font-bold uppercase tracking-[0.14em] text-loader-pct disabled:cursor-wait disabled:opacity-60"
          data-font-bold
        >
          <span className="hud-line" />
          <span className="hud-line" />
          <span className="hud-line" />
          <span className="hud-line" />
          {status === "sending" ? "Transmitting…" : "Send message"}
        </button>
        <p className="text-[12px] text-gray-500">Your details are only used to reply to you.</p>
      </div>
    </form>
  );
}
