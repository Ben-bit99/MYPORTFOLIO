/**
 * Contact form validation, shared by the browser form (instant feedback) and the
 * API route (the real gatekeeper — never trust the client).
 */
import { z } from "zod";

export const LIMITS = {
  name: 80,
  email: 254,
  subject: 120,
  messageMin: 10,
  message: 4000,
  maxLinks: 3,
} as const;

/** Collapse control characters; CR/LF are removed from single-line fields (header-injection guard). */
const oneLine = (s: string) =>
  s
    .replace(/[\r\n\t\u0000-\u001F\u007F\u2028\u2029]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
const multiLine = (s: string) =>
  s
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

const countLinks = (s: string) => (s.match(/https?:\/\/|www\./gi) ?? []).length;

export const contactSchema = z.object({
  name: z
    .string()
    .transform(oneLine)
    .pipe(z.string().min(2, "Please enter your name.").max(LIMITS.name, `Name must be under ${LIMITS.name} characters.`)),
  email: z
    .string()
    .transform((s) => oneLine(s).toLowerCase())
    .pipe(z.string().max(LIMITS.email, "That email address is too long.").email("Please enter a valid email address.")),
  subject: z
    .string()
    .transform(oneLine)
    .pipe(z.string().min(3, "Please add a short subject.").max(LIMITS.subject, `Subject must be under ${LIMITS.subject} characters.`)),
  message: z
    .string()
    .transform(multiLine)
    .pipe(
      z
        .string()
        .min(LIMITS.messageMin, `Your message needs at least ${LIMITS.messageMin} characters.`)
        .max(LIMITS.message, `Please keep your message under ${LIMITS.message} characters.`)
        .refine((m) => countLinks(m) <= LIMITS.maxLinks, `Please include at most ${LIMITS.maxLinks} links.`),
    ),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type ContactField = keyof ContactInput;

/** Request body also carries spam-protection fields that are not part of the message. */
export const contactRequestSchema = contactSchema.extend({
  website: z.string().max(200).optional(), // honeypot — humans never see or fill it
  startedAt: z.number().int().positive().optional(), // when the form was opened (ms epoch)
});

/** Returns { field: message } for the first problem on each field. */
export function fieldErrors(error: z.ZodError): Partial<Record<ContactField, string>> {
  const out: Partial<Record<ContactField, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as ContactField;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
