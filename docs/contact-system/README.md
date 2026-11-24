# Module 5: Email and Contact System

Visitors can send messages from **Contact → SEND A MESSAGE**. Every message is emailed to `CONTACT_TO` (default `abwahib07@gmail.com`).

## Requirements → implementation

| Requirement | Where | How |
|---|---|---|
| Form with name, email, subject, message | `src/components/ContactForm.tsx` | HUD drawer form with labels, character counters and accessible error messages |
| Frontend validation | `ContactForm.tsx` + `src/lib/contact/schema.ts` | Same Zod schema as the server. Validates on blur and on submit, focuses the first invalid field, and reserves space for errors so the layout never shifts |
| Backend validation | `src/app/api/contact/route.ts` | Re-validates everything with the shared schema (never trusts the client). Also checks JSON content type and a 16 KB body cap |
| Sends to my email | `src/lib/contact/mailer.ts` | SMTP via nodemailer (Gmail App Password), or the Resend HTTP API (`EMAIL_PROVIDER`) |
| Success / error messages | `ContactForm.tsx` | "Message sent" confirmation, field-level errors, and friendly server errors (rate limit, not configured, delivery failure) with a direct-email fallback |
| Credentials in environment variables | `.env.local` (git-ignored), documented in `.env.example` | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM`. The mailer imports `server-only`, so it can never reach the browser bundle |
| Spam protection | `route.ts` | Hidden honeypot field; minimum fill time of 2.5 s; 3 messages per IP per 10 min (`CONTACT_PER_10_MIN`); at most 3 links. Honeypot and too-fast submissions get a fake success, so bots learn nothing |
| Secure input handling | `schema.ts`, `mailer.ts` | Control characters stripped; CR/LF removed from single-line fields (blocks email-header injection); all visitor text HTML-escaped before it enters the email; Reply-To passed as a structured `{ name, address }`; transport errors are logged server-side only and never echoed to the browser |

## Test evidence

These tests ran against a real local SMTP server that requires authentication. It saves every received email (`.eml`). The production build (`next build` + `next start`) was used throughout.

| # | Test | Expected | Result |
|---|---|---|---|
| 1 | Valid message (API) | 200, delivered | ✅ 200, received as `[Portfolio] Unity internship — Sara Khan` |
| 2 | Invalid fields (API) | 422 with an error per field | ✅ 422: name, email, subject and message errors |
| 3 | Honeypot filled | Fake 200, **not** delivered | ✅ 200, nothing received |
| 4 | Submitted instantly (< 2.5 s) | Fake 200, **not** delivered | ✅ 200, nothing received |
| 5 | Header injection (`\r\nBcc: victim@evil.com` in name and subject) | No extra recipients or headers | ✅ No `Bcc` header; envelope recipient is only `abwahib07@gmail.com` (see `injection-attempt.eml`) |
| 5b | HTML injection (`<script>…<img onerror>`) | Escaped in the email | ✅ Arrives as `&lt;script&gt;…`, with no live tags |
| 6 | Four links in a message | 422 | ✅ "Please include at most 3 links." |
| 7 | Four posts from one IP | 3 × 200, then 429 | ✅ `200 200 200 429` |
| 8 | Non-JSON body | 415 | ✅ 415 |
| 9 | Wrong SMTP password | Friendly 502; details only in the server log | ✅ Visitor sees a retry message; log shows `535 Invalid credentials` |
| 10 | Email not configured | Friendly 503 | ✅ "The contact form isn't configured yet. Please email me directly instead." |
| 11 | Full browser flow: empty submit, then fill in and send | 4 field errors, then success, then delivered | ✅ 4 errors shown; "MESSAGE SENT"; received as `[Portfolio] Gameplay programmer role — Hamza Ali` |

Screenshots: `0-contact-card.png`, `1-validation-errors.png`, `2-success-message.png`, `3-delivered-email.png` (the received email rendered) and `4-mobile-form.png`. The raw delivered email is `delivered-message.eml`, which opens in any mail app.

**Real-inbox delivery:** the tests above use a local SMTP server, because real credentials are never shared. To confirm delivery to Gmail, add your App Password to `.env.local` (see `SETUP_CHECKLIST.md`), send a message from the site, and screenshot it arriving in your inbox. That's the final piece of evidence.
