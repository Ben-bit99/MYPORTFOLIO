# SETUP_CHECKLIST

## 0. Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production check
```

Useful URL flag: `?lite` forces the low-power renderer (no reflections or post-processing), which is handy for testing what phones get.

---

## 1. Gameplay videos

| Project | Drop file here | Optional |
|---|---|---|
| VR Tennis | `public/videos/vr-tennis-demo.mp4` | `vr-tennis-demo.webm`, poster `public/images/projects/vr-tennis.jpg` |
| Game Project 02 | `public/videos/game-project-02.mp4` | `.webm`, poster `public/images/projects/game-project-02.jpg` |
| Game Project 03 | `public/videos/game-project-03.mp4` | `.webm`, poster `public/images/projects/game-project-03.jpg` |

- Nothing else to change. The site detects the file and swaps the "slot ready" panel for the player and hover preview.
- **Prefer YouTube or Vimeo?** Set `video.externalVideoUrl` in `src/data/portfolio.ts`. It is used when no local file exists (or always, with `preferExternal: true`).
- Recommended export: H.264 MP4, 1920×1080 or 1280×720, 20–60 s, **under about 15 MB**, with `-movflags +faststart` so it starts streaming instantly. Example:

```bash
ffmpeg -i raw.mov -vf scale=1280:-2 -c:v libx264 -crf 24 -preset slow -an -movflags +faststart public/videos/vr-tennis-demo.mp4
```

(Drop `-an` if you want the gameplay audio. Previews are always muted.)

## 2. Fill in Game Project 02 and 03

In `src/data/portfolio.ts`, find the boxed `PLACEHOLDER — GAME PROJECT 02` comment:

1. Replace every `TBA` and the title, tagline, category, techStack, description, highlights and links.
2. **Delete `placeholder: true`**. This removes the COMING SOON badge, and the chatbot starts answering about it.
3. Run `npm run rag:index`.

## 3. Your profile links

`socials` in `src/data/portfolio.ts`: paste your GitHub, LinkedIn and itch.io URLs. An empty `href` stays hidden everywhere.

## 4. Certificate and resume

- `public/certificates/gamejam-2026.jpg`: **already added** (the certificate you shared). To replace it, overwrite the file with the same name.
- `public/Abdul_Wahib_Rao_Resume.pdf`: **already added**, converted from your resume v5. Replace it with your own PDF export whenever you update the resume.

## 5. AI assistant (RAG chatbot)

```bash
cp .env.example .env.local
# put ONE key in .env.local:
#   GOOGLE_GENERATIVE_AI_API_KEY=...   (default provider, AI_PROVIDER=google)
#   or OPENAI_API_KEY=...  with AI_PROVIDER=openai
npm run rag:index      # embeds the portfolio → src/data/rag-index.json
```

- **Re-run `npm run rag:index` whenever you edit `portfolio.ts` or `src/data/knowledge/`.** If you forget, the bot notices that the index is stale and falls back to keyword search over the fresh data, so it never gives outdated facts, but you lose vector search.
- **No key?** The bot still works in *offline mode*: it replies with the most relevant portfolio excerpts, clearly labelled.
- **Extra knowledge:** add `.md` files to `src/data/knowledge/`. Each `#` heading becomes a citable chunk. **Review `availability.md`.** I wrote it as a starter, and it says you're open to game, XR and gameplay-programming roles and internships. Edit it or delete it if that's not accurate.
- **Model names** default to `gemini-3.8-flash` / `gemini-embedding-001` (Google) or `gpt-4.1-mini` / `text-embedding-3-small` (OpenAI). If a provider retires one, set `CHAT_MODEL` / `EMBEDDING_MODEL` in `.env.local`, then re-run the index.
- Rate limit: `CHAT_RATE_LIMIT_PER_MIN` (default 15 per IP). It is in-memory, so on serverless it is per instance. Use Upstash or Redis if you get real traffic.

## 6. Guestbook ("Room of Echoes")

Visitors can leave a memory: a name, an optional location and a message of up to 280 characters. Their memories drift over the grid in the Memories section.

- **Local or any normal Node server:** works out of the box. Memories are saved to `.data/memories.json` (git-ignored).
- **Vercel or other serverless hosts:** the filesystem is read-only, so add a free **Upstash Redis** database (Vercel → Storage → Upstash, or upstash.com) and set:
  - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (Vercel's integration may name them `KV_REST_API_URL` / `KV_REST_API_TOKEN`; both work).
  Without these, the site still loads, and the section says the guestbook isn't switched on yet.
- **Built-in protection:**
  - a hidden honeypot field for bots
  - no links or emails in messages
  - a small blocklist (extend it with `MEMORIES_BLOCKLIST="word1,word2"`)
  - duplicate-message check
  - 3 posts per IP per 10 minutes (`MEMORIES_PER_10_MIN`)
- **Deleting memories (moderator mode):**
  1. On the site, go to **Memories**, click **READ ALL**, then the small **Moderate** link at the bottom.
  2. **On your computer** (`npm run dev`), it unlocks immediately; no password needed.
  3. **On the live site**, it asks for a password. Set one first: add `MEMORIES_ADMIN_TOKEN=some-long-secret` to your hosting's environment variables (and to `.env.local` if you want a password locally too). Visitors can't delete anything without it.
  4. Click **✕** next to a memory, then **Delete** to confirm. **Exit moderator mode** locks it again. The unlock also clears when you close the tab.
  - **Without a password configured on the live site, nobody can delete**, including you, so set `MEMORIES_ADMIN_TOKEN` before going live.
  - Local alternative: edit `.data/memories.json` in Notepad and remove the entry.

## 6b. Contact form email (Gmail)

The **SEND A MESSAGE** button emails visitors' messages to you. Set it up once:

1. Turn on **2-Step Verification** on your Google account (myaccount.google.com → Security).
2. Open **App passwords** (myaccount.google.com/apppasswords), create one named "Portfolio", and copy the 16-character password.
3. In the project folder, copy `.env.example` to `.env.local` (if you haven't already) and fill in:

```
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=abwahib07@gmail.com
SMTP_PASS=your16charapppassword
CONTACT_TO=abwahib07@gmail.com
```

4. Restart the site (`Ctrl + C`, then `npm run dev`), send yourself a test message from the Contact section, and check your inbox.
5. When deploying (e.g. Vercel), add the same variables in the host's **Environment Variables** settings. Never commit `.env.local`.

Without these settings, the form tells visitors it isn't configured yet and shows your email instead. Test evidence and the security details are in `docs/contact-system/README.md`.

## 7. Music

- By default the site plays a **generative score** that changes mood per section: a dark minor mood in the city, brighter in Works and the Timeline, and crystalline in the Vault and Memories. Visitors toggle it with "Sound: On/Off".
- **Use your own music.** Create the folder `public/audio/` and add MP3 files named after sections:

  | File | Plays in |
  |---|---|
  | `hero.mp3` | Landing (city) |
  | `about.mp3` | About |
  | `works.mp3` | Works |
  | `timeline.mp3` | Timeline |
  | `vault.mp3` | Awards |
  | `memories.mp3` | Memories |
  | `contact.mp3` | Contact |
  | `theme.mp3` | Every section without its own file |

  Add only the files you want, e.g. just `theme.mp3` and `memories.mp3`. A section with neither its own file nor a `theme.mp3` keeps the generative score. Tracks crossfade (about 1.6 s) when the visitor scrolls, loop, and resume where they left off. UI sounds still play. Keep each file small (128–192 kbps MP3, ideally under 5 MB), and only use music you have the rights to, e.g. royalty-free tracks from Pixabay Music or CC0 pieces.

## 8. Quality flags

- `?hq` forces full quality (depth of field, reflections, bloom), even on machines detected as low-power.
- `?lite` forces the lightweight renderer.

## 9. Deploy (Vercel)

1. Push the repo, import it on Vercel.
2. Add environment variables: the API key, `AI_PROVIDER`, `NEXT_PUBLIC_SITE_URL=https://your-domain`, and the Upstash variables for the guestbook (section 6).
3. Commit `src/data/rag-index.json` after running `npm run rag:index` locally. The route bundles it.
4. Large videos: Vercel serves `public/` fine for a few small clips. For big files use YouTube or Vimeo (`externalVideoUrl`) or a CDN URL.

## 10. Swap the vector store later

`src/lib/rag/retriever.ts` exposes a `Retriever` interface. Implement it with Supabase pgvector or Upstash Vector and return it from `getRetriever()`. Nothing else changes.
