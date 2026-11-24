# DESIGN_SPEC: Abdul Wahib Rao Portfolio

This spec comes from an audit of the reference site (its production HTML, its Tailwind v4 CSS bundle, and the component and copy structure in its JS bundle) and the four reference screenshots in `./reference/`. It records the **design language** we reproduce. Every asset is new: all 3D scenes are procedural (no models, textures, audio files, fonts or copy are taken from the reference).

---

## 1. Experience architecture

| # | Block | Reference behaviour | Our implementation |
|---|-------|--------------------|--------------------|
| 0 | **Preloader** | Black screen. Centred square of the scene, blurred 20px. Bracket caption top-left `[[ / [loading] / ]]] / [00%] / [[[][]`. Four lines of manifesto text bottom-right of the square. Bordered `ENTER` button, disabled until 100%. | `Loader.tsx`: the live 3D canvas shows through a centred square `backdrop-filter: blur(20px)` window with a radial mask. Same caption and button anatomy, with Abdul Wahib's own manifesto lines. ENTER starts audio (user gesture) and unlocks scroll. |
| 1 | **Hero** | Fixed WebGL scene; the HUD reveals with text scramble. | Night-city scene (`CityScene`): procedural lit-window towers, wet reflective ground, rain, floating amber slabs, focal **kneeling avatar** (rigged mannequin, neon-vein / thermal-rim shader), giant rusty-cobblestone "AWR" letters, wet planar-reflection concrete, depth-of-field bokeh. |
| 2 | **About** | Bracket heading `[[ABOUT]` (highlight `gray-500`), paragraph right-of-centre, bordered `ABOUT` CTA opens a drawer. | Same layout. The drawer holds the long bio, education and grouped skills. |
| 3 | **Works** | Deep-blue scene with lightning, floating wireframe icons, concentric rings, bokeh. `[[[WORKS]` (highlight `blue-600`). Intro paragraph top-left. Row list with `Client_ / Role_ / Year_` labels. | `WorksScene`. Rows show `Category_ / Engine_ / Year_` with hover video preview. Click opens the project drawer with the full video player. Placeholders get a `COMING SOON` HUD badge. |
| 4 | **Timeline** | "Scroll to move the timeline": horizontal track driven by vertical scroll. | `TimelineScene` (glowing rail and nodes) plus a DOM track translated by section progress. |
| 5 | **Room of Memories** | Teal wireframe lattice. `]][[ROOM OF MEMORIES]]` (highlight `#24646b`), poetic line, `ADD A MEMORY` CTA. | **Memory Vault** (`VaultScene`): the same lattice language, with the Global Game Jam 2026 award shown as an interactive WebGL hologram card: halftone and scan lines at rest, and a fluid cursor-trail lens that reveals the full-colour certificate with chromatic fringing and 3D tilt. Click opens a lightbox. |
| 6 | **Contact** | Email, socials, closing city view. | `ContactScene` (city at dusk, high camera) plus email, phone, socials, resume download. |
| 5b | **Room of Echoes (guestbook)** | Reference "Room of Memories": avatar from behind reaching into the grid, ADD A MEMORY. | Same composition with our avatar. A three-step terminal form (name, location, message; ENTER / SHIFT+ENTER) and "ghost" memories that scramble in and drift over the lattice, plus one glowing node per memory. API with Redis or file storage. |
| — | **HUD (fixed)** | Top-left stacked logo (3 lines); version tag; `Sound: On`; `MENU` top-right; bottom-right email and status. | Same grid: `ABDUL / WAHIB / RAO`, `1.0`, `Sound: On/Off`, `MENU`, `abwahib07@gmail.com`, `Karachi · PK`. |
| — | **Menu** | Full-screen overlay: About / Works / Room of Memories / Contact + `CLOSE`. | Same, plus Timeline. Lenis `scrollTo` to each section. |
| — | **AI chat** | (not in reference) | `[ AI // ASK ]` HUD trigger bottom-right. Terminal-style glass panel in the same type and border language. |

Section heights follow the reference's scroll-driven pacing (it uses 300vh to 800vh scroll tracks). Each section is a tall track with a `position: sticky` 100vh stage, and the scene reads that section's local progress (0 to 1) every frame. Only the **active** scene renders. Section changes dip through black: an overlay's opacity comes from the distance to the nearest section boundary.

## 2. Colour tokens

Taken from the reference CSS:

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#000000` | page, loader |
| `--text` | `#e5e7eb` (gray-200) | body and HUD text |
| `--text-dim` | `#9ca3af` (gray-400) | secondary text |
| `--bracket` | `#374151` (gray-700) | bracket ornaments `[ ] _` |
| `--hl-about` | `#6a7282` (gray-500) | ABOUT highlight |
| `--hl-works` | `#155dfc` (blue-600) | WORKS highlight |
| `--hl-vault` | `#24646b` | Memory Vault highlight (reference teal; we use #2f8f99 for contrast) |
| `--loader-hl` | `#7f9eb3` | loader highlight lines |
| `--loader-pct` | `#d9eaf5` | loader percentage, ENTER label |
| `--loader-cap` | `#30383e` | loader bracket caption |
| `--line` | `rgba(255,255,255,.10)` → `.30` on hover | button and panel hairlines |
| `--panel` | `rgba(0,0,0,.40)` + `backdrop-blur(8px)` | drawers, chat (reference `lg:bg-black/40`) |
| `--danger` | `#fb2c36` (red-500) | errors |
| `--amber` | `#f99c00` | accents in the city scene and badges |

Scene palettes: city `#0b1724` fog with amber `#ff9a2a` slabs and cool `#9ec9ff` / warm `#ffd28a` windows. Works `#03142b → #0b3f7a` with `#6fe3ff` lightning. Vault `#02090c` with `#5fd0e0` grid lines.

## 3. Typography

- **Ubuntu Mono** (Regular 400 and Bold 700) via `next/font/google`. The reference uses the same family, self-hosted.
- Base: `html { font-size: 18px; line-height: 1.5 }`.
- `[data-font-bold]`: Ubuntu Mono 700, **18px**, **letter-spacing 0.09em**, **line-height 1.3**. Used for every HUD label, heading, paragraph over a scene, and button.
- Bracket headings stay at the same 18px size. Hierarchy comes from **colour and indentation** (whitespace-preserved offsets), not size. This is the signature of the reference.
- Small UI (CLOSE, chips, kbd hints): 14px, letter-spacing 0.1em, uppercase.
- Fluid scale for long-form drawers only: `clamp(15px, 0.9vw + 10px, 18px)`.

## 4. Layout grid

- Spacing unit 8px (reference `--spacing: 8px`).
- HUD gutters: 16px (`left-4 / right-4`), top 16px.
- Desktop: 12-column grid. Scene paragraphs sit at `col-start-8 / span-4` (right-of-centre), with headings offset by `col-start-7`. Works intro sits top-left.
- Mobile (<768px): 4 columns. Paragraphs span the full width with 16px gutters. HUD logo and MENU only; Sound sits in the menu.

## 5. Motion and micro-interactions

| Interaction | Spec |
|---|---|
| **Text scramble** | The reference algorithm, reimplemented: text splits into words. A tween drives `progress 0→1`, and words reveal left to right while unrevealed words show random glyphs, re-rolled every ~5 frames. Duration comes from `data-reveal-duration` (0.3 to 0.6s). Runs on reveal and on hover for HUD links. |
| **Bracket ornaments** | Fade in staggered 60ms per line on section enter. |
| **Buttons** | 1px hairlines at white/10 with 2×2px white corner pixels. Hairlines go to white/30 on hover. Label scrambles on hover. A short sine "tick" sound plays. |
| **Section change** | Dip to black (overlay opacity peaks at boundaries), a low "whoosh" noise burst, scene swap. |
| **Scenes** | Camera dolly and parallax from scroll progress and pointer (lerp 0.05). Floating objects bob on sin(t). |
| **Drawers / modals** | Framer Motion: panel slides 40px and fades over 0.5s with ease `[0.22,1,0.36,1]`. Backdrop fades to black/60 with blur. Lenis pauses. `Esc` closes. Focus moves into the panel. |
| **Smooth scroll** | Lenis (`lerp 0.1`). Disabled under reduced motion. |
| **Sound** | Generative WebAudio score: chord pads, sub bass, bell melodies, delay and reverb, with a mood per section, rain in the city, and UI ticks. An optional `public/audio/theme.mp3` overrides the pads. Starts on ENTER. Toggle state is persisted. |

### `prefers-reduced-motion`
No Lenis. Scramble shows final text immediately. Camera drift, lightning flicker and rain stop. Section dips become plain cuts. The scenes still render, as static compositions.

## 6. Responsive and performance

- **Low-power detection**: coarse pointer plus small screen, `hardwareConcurrency ≤ 4`, `deviceMemory ≤ 4`, or Save-Data. On low power: DPR capped at 1.25, no reflector floor, no post-processing, about 50% fewer instances and particles.
- **No WebGL / context lost / render error**: an `ErrorBoundary` swaps in `SceneFallback`, a CSS gradient per section that keeps the palette, so the content is still fully usable.
- Canvas DPR `[1, 1.75]` on desktop. `frameloop` pauses while the tab is hidden.
- Videos are lazy: `preload="metadata"`, hover previews load only on hover, and a HEAD probe detects missing files before showing the "slot ready" placeholder.

## 7. Accessibility

- All HUD controls are real `<button>` or `<a>` elements with visible focus rings (1px `#7f9eb3` outline).
- The canvas is `aria-hidden`. All content exists in the DOM.
- Drawers are `role="dialog"` with `aria-modal`, close on Esc, and return focus.
- Text contrast: body `#e5e7eb` on scene backgrounds behind a subtle radial scrim (≥ 4.5:1).

---

## 8. Visual refinement pass (v1.1)

This was a styling, lighting and composition pass only. No features, routes, content, assets or interactions changed.

| Area | Refinement |
|---|---|
| City exposure | Fewer and dimmer lit windows (`lit` threshold .60→.68, intensity .8→.52), deeper facades and haze (`FOG #0b1a2c`, horizon `#21405f`), lighter film grain (0.08→0.05), slightly smaller bokeh (6→5.5). |
| Oversized type | "AWR" set as one intentional row: shared baseline, even spacing, restrained tilts, size 14→15, plus a soft top-light catch on upper faces. |
| Character | Cool additive backlight sprite behind the avatar and a faint green contact glow on the wet ground, for separation from the bokeh. Model, pose and interactions are unchanged. |
| Readability | `.scrim` now adds a soft radial dark pool behind text blocks (not a panel). Top (150px) and bottom (190px) edge grades sit under the HUD and captions. |
| Typography | `.copy` paragraph style (fluid 15–18px, 0.045em tracking, 1.62 leading, 46ch measure). Hero subtitle becomes a tracked eyebrow. Bracket colour `#3d4757`, ABOUT highlight `#a9bccf`, vault highlight `#43b9c6`, keyword glow. |
| Buttons | L-shaped corner brackets (8px, extending to 14px with a glow on hover), a hover light sweep, and a denser dark base for presence over bright scenes. |
| HUD | Muted version tag, animated sound equaliser, underline-on-hover for Sound and MENU, and an organised bottom-right stack (AI button → email → status with a live dot). |
| Scroll cues | One component: an 11px tracked label plus a travelling 1px line (hidden on mobile for Works). |
| Works | The project panel fades in from the scene (masked background, 40px fade on mobile and 160px on desktop) instead of a hard edge. Rows get a vertical accent line on hover. Glyph halos are smaller and dimmer. |
| Menu | Fluid large items (22–38px), small index numerals, hover slide and brighten. |
| Mobile | Hero text block raised. Ghost memories are hidden below 768px because there is no free space; memories stay readable via cubes and READ ALL. |

---

## 9. Typography, interactivity and immersion pass (v1.2)

No features, routes or data flow changed. Everything below is presentation and interaction layered on top.

**Fonts** (`next/font/google`, CSS variables in `layout.tsx`, tokens in `globals.css`):
| Role | Font | Weights | Used for |
|---|---|---|---|
| Display | Chakra Petch | 600, 700 | Logo, section keywords (`ABOUT`, `WORKS`…), hero role, menu items |
| UI / body | Space Grotesk | 500, 600, 700 | Paragraphs (`.copy`), project titles, contact values, milestones |
| HUD | JetBrains Mono | 500, 600, 700 | `[data-font-bold]` micro-labels, brackets, buttons, `[ AI // ASK ]` |

**Hero avatar:** real 3D look-at toward the cursor (head, neck and upper torso, clamped), breathing and hand sway, and an energy pulse travelling up the veins. The hologram above the hands responds to hover (faster spin, brighter, avatar leans in, `[ CLICK TO PULSE ]`) and to click (energy surge: floor shockwave, emerald→cyan vein shift, gold core flash, arm and head lift, chime and shimmer). Clicking the avatar triggers a gesture and a camera focus pull. Hit-testing uses cheap proxy meshes via `heroBridge` (`src/lib/sceneBridge.ts`).

**Echo avatar:** the pointing arm, torso and head aim at the hovered or open echo cube. Click-and-drag orbits the camera with damping and springs back. Hovered cubes get a halo bloom and a white core.

**"AWR":** navy brushed-metal shader with a key light, specular, metallic fresnel rim and a slow light sweep. Smoother bevels (12 curve segments). Less depth-of-field blur (bokehScale 4.2, focusRange 6).

**Layout fixes:**
- The Works intro fades out as the list arrives, and the list keeps a 210px right safe area for the AI button.
- Timeline text sits below the rail. Year pills are at the top right and highlight the current milestone, and drag-to-scrub works.
- Contact is a frosted card with a copy toast and a live PKT clock, and the actions row cannot overlap.
- Email and location are removed from the global HUD; they live in the contact card.
- ScrambleText always settles back to the real text.

**Cursor:** `CursorReticle.tsx` is a fine-pointer-only reticle with contextual labels from `data-cursor`. It is disabled on touch and with reduced motion, and keeps the text caret in inputs.

**Mobile:** the Contact intro line and "back to top" are hidden below 768px so the card fits above the AI button.
