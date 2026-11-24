/**
 * Server-only email delivery for the contact form.
 *
 *  EMAIL_PROVIDER=smtp   (default) — any SMTP server; e.g. Gmail with an App Password:
 *                         SMTP_HOST=smtp.gmail.com SMTP_PORT=465 SMTP_SECURE=true
 *                         SMTP_USER=you@gmail.com SMTP_PASS=<16-char app password>
 *  EMAIL_PROVIDER=resend — Resend HTTP API: RESEND_API_KEY, CONTACT_FROM
 *
 *  CONTACT_TO   where messages are delivered (defaults to the portfolio email)
 *  CONTACT_FROM sender shown in your inbox (SMTP: defaults to SMTP_USER)
 *
 * Credentials are read from environment variables only — never shipped to the browser.
 */
import "server-only";
import nodemailer from "nodemailer";
import { profile } from "@/data/portfolio";
import type { ContactInput } from "./schema";

export type MailMeta = { ip: string; userAgent: string; receivedAt: string };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function mailerConfigured() {
  const provider = (process.env.EMAIL_PROVIDER || "smtp").toLowerCase();
  if (provider === "resend") return !!process.env.RESEND_API_KEY;
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** Builds the email you receive. All visitor text is escaped before entering the HTML. */
export function composeEmail(input: ContactInput, meta: MailMeta) {
  const to = process.env.CONTACT_TO || profile.email;
  const subject = `[Portfolio] ${input.subject} — ${input.name}`;
  const text = [
    `New message from your portfolio contact form`,
    ``,
    `Name:    ${input.name}`,
    `Email:   ${input.email}`,
    `Subject: ${input.subject}`,
    ``,
    input.message,
    ``,
    `—`,
    `Received ${meta.receivedAt} · IP ${meta.ip}`,
    `Reply directly to this email to answer ${input.name}.`,
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#05080d;padding:24px;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#e6edf3">
  <div style="max-width:620px;margin:0 auto;border:1px solid #1f2a36;background:#0a1018">
    <div style="padding:18px 22px;border-bottom:1px solid #1f2a36;font:600 12px/1.4 Consolas,monospace;letter-spacing:.14em;color:#7f9eb3">[ PORTFOLIO // NEW MESSAGE ]</div>
    <div style="padding:22px">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;color:#8fa3b8">FROM</p>
      <p style="margin:0 0 16px;font-size:16px;font-weight:600">${esc(input.name)} &lt;<a href="mailto:${esc(input.email)}" style="color:#9fd4ff">${esc(input.email)}</a>&gt;</p>
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;color:#8fa3b8">SUBJECT</p>
      <p style="margin:0 0 16px;font-size:16px;font-weight:600">${esc(input.subject)}</p>
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;color:#8fa3b8">MESSAGE</p>
      <div style="white-space:pre-wrap;font-size:15px;line-height:1.6;color:#dbe6ef">${esc(input.message)}</div>
    </div>
    <div style="padding:14px 22px;border-top:1px solid #1f2a36;font-size:12px;color:#6b7c8d">Received ${esc(meta.receivedAt)} · Reply to this email to answer ${esc(input.name)}.</div>
  </div></body></html>`;
  return { to, subject, text, html, replyTo: { name: input.name, address: input.email } };
}

export async function sendContactEmail(input: ContactInput, meta: MailMeta): Promise<{ id: string }> {
  const mail = composeEmail(input, meta);
  const provider = (process.env.EMAIL_PROVIDER || "smtp").toLowerCase();

  if (provider === "resend") {
    const from = process.env.CONTACT_FROM || "Portfolio Contact <onboarding@resend.dev>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html, reply_to: input.email }),
    });
    if (!res.ok) throw new Error(`Resend responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j = (await res.json()) as { id?: string };
    return { id: j.id ?? "resend" };
  }

  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    tls: process.env.SMTP_ALLOW_SELF_SIGNED === "true" ? { rejectUnauthorized: false } : undefined,
  });
  // Sender must be a real address. Gmail requires your own address; some SMTP services use
  // non-email usernames (e.g. "apikey"), so fall back to the delivery address in that case.
  const user = process.env.SMTP_USER ?? "";
  const fromAddress = user.includes("@") ? user : mail.to;
  const from = process.env.CONTACT_FROM || { name: "Portfolio Contact", address: fromAddress };
  const info = await transporter.sendMail({ from, to: mail.to, replyTo: mail.replyTo, subject: mail.subject, text: mail.text, html: mail.html });
  return { id: info.messageId };
}
