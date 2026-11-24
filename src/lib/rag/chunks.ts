/**
 * Turns src/data/portfolio.ts into meaning-based chunks for retrieval.
 * Pure + isomorphic (no fs), so it runs in the indexing script, the API
 * route and tests alike.
 */
import {
  awards,
  education,
  otherProjects,
  profile,
  projects,
  skills,
  socials,
  timeline,
} from "@/data/portfolio";
import type { Chunk } from "./types";

const lines = (...parts: (string | false | undefined | null)[]) => parts.filter(Boolean).join("\n");

export function buildPortfolioChunks(): Chunk[] {
  const chunks: Chunk[] = [];
  const liveSocials = socials.filter((s) => s.href);

  chunks.push({
    id: "about",
    section: "About",
    title: "About",
    anchor: "about",
    content: lines(
      `${profile.name} is a ${profile.headline}, based in ${profile.location}.`,
      ...profile.aboutLong,
    ),
  });

  chunks.push({
    id: "contact",
    section: "Contact",
    title: "Contact",
    anchor: "contact",
    content: lines(
      `How to contact, reach, hire or email ${profile.name}:`,
      `Email: ${profile.email}`,
      `Phone: ${profile.phone}`,
      `Location: ${profile.location}`,
      `Resume (PDF) can be downloaded from the Contact section of the portfolio.`,
      liveSocials.length
        ? `Profiles: ${liveSocials.map((s) => `${s.label}: ${s.href}`).join(", ")}`
        : `GitHub, LinkedIn and itch.io profile links have not been published on the portfolio yet.`,
    ),
  });

  chunks.push({
    id: "education",
    section: "Education",
    title: "Education",
    anchor: "about",
    content: lines(
      `Education / university / degree / studies:`,
      `${education.degree} at ${education.institution} (NED), ${education.location}, ${education.years}.`,
      `CGPA: ${education.cgpa}.`,
      `Relevant coursework: ${education.coursework.join(", ")}.`,
    ),
  });

  for (const p of projects) {
    if (p.placeholder) {
      chunks.push({
        id: `project:${p.slug}`,
        section: "Project",
        title: p.title,
        anchor: "works",
        projectSlug: p.slug,
        content: lines(
          `${p.title} is an upcoming ${p.category.toLowerCase()} project slot in the Selected Works section.`,
          `Its title, genre, engine, tools, description and gameplay video have NOT been published yet.`,
        ),
      });
      continue;
    }
    chunks.push({
      id: `project:${p.slug}`,
      section: "Project",
      title: p.title,
      anchor: "works",
      projectSlug: p.slug,
      content: lines(
        `Game / XR project: ${p.title} — ${p.tagline} (${p.year}).`,
        `Category: ${p.category}. Role: ${p.role}.${p.engine ? ` Engine: ${p.engine}.` : ""}`,
        `Tech stack: ${p.techStack.join(", ")}.`,
        p.description,
        ...p.highlights.map((h) => `- ${h}`),
        p.links.length ? `Links: ${p.links.map((l) => `${l.label}: ${l.href}`).join(", ")}` : null,
      ),
    });
  }

  for (const p of otherProjects) {
    chunks.push({
      id: `other:${p.slug}`,
      section: "Other Project",
      title: p.title.split(" — ")[0],
      anchor: "works",
      content: lines(
        `Other project: ${p.title} (${p.year}). Category: ${p.category}.`,
        `Tech stack: ${p.techStack.join(", ")}.`,
        ...p.highlights.map((h) => `- ${h}`),
      ),
    });
  }

  for (const a of awards) {
    chunks.push({
      id: `award:${a.slug}`,
      section: "Award",
      title: a.event,
      anchor: "vault",
      content: lines(
        `Award / achievement / prize: ${a.title}.`,
        `Event: ${a.event} at ${a.location} (${a.date}). Team: ${a.team}.`,
        `Organizers and partners: ${a.organizers.join("; ")}.`,
        a.description,
        `The official certificate can be viewed in the Memory Vault section of the portfolio.`,
      ),
    });
  }

  chunks.push({
    id: "skills:overview",
    section: "Skills",
    title: "Skills",
    anchor: "about",
    content: lines(
      `Technical skills / tech stack overview of ${profile.name}:`,
      ...skills.map((g) => `${g.category}: ${g.items.join(", ")}.`),
    ),
  });
  for (const g of skills) {
    chunks.push({
      id: `skills:${g.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      section: "Skills",
      title: `Skills: ${g.category}`,
      anchor: "about",
      content: `${g.category} skills: ${g.items.join(", ")}.`,
    });
  }

  chunks.push({
    id: "timeline",
    section: "Timeline",
    title: "Timeline",
    anchor: "timeline",
    content: lines(
      `Timeline / journey / history:`,
      ...timeline.map((t) => `${t.year} — ${t.label}: ${t.detail}`),
    ),
  });

  return chunks;
}

/** Split free-form markdown/text notes into heading-aware chunks (~900 chars). */
export function chunkKnowledgeDoc(fileName: string, text: string): Chunk[] {
  const base = fileName.replace(/\.(md|txt)$/i, "");
  const sections = text.split(/\n(?=#{1,3}\s)/g);
  const out: Chunk[] = [];
  sections.forEach((sec, si) => {
    const heading = sec.match(/^#{1,3}\s+(.+)/)?.[1]?.trim();
    const body = sec.replace(/^#{1,3}\s+.+\n?/, "").trim();
    if (!body) return;
    const paras = body.split(/\n{2,}/);
    let buf = "";
    let part = 0;
    const flush = () => {
      if (!buf.trim()) return;
      out.push({
        id: `kb:${base}:${si}:${part++}`,
        section: "Knowledge",
        title: heading ? `${heading}` : base,
        content: heading ? `${heading}\n${buf.trim()}` : buf.trim(),
      });
      buf = "";
    };
    for (const p of paras) {
      if ((buf + "\n\n" + p).length > 900) flush();
      buf += (buf ? "\n\n" : "") + p;
    }
    flush();
  });
  return out;
}

/** Tiny deterministic hash (FNV-1a) to detect a stale index. */
export function hashChunks(chunks: Chunk[]): string {
  let h = 0x811c9dc5;
  const s = JSON.stringify(chunks.map((c) => [c.id, c.content]));
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}
