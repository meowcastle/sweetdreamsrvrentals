# THE SSH — Design System

A design system for **THE SSH NYC** — the *Saturday Summer Hang*, an analog-only music gathering in a Clinton Hill, Brooklyn driveway. This system is a **minimalist, broadcast/editorial reinterpretation** of the original site: same brand, same copy, calmer surface.

> **Brief:** "Give me an output of this site that has a more minimalist style — more like the broadcast / work-and-nonwork aesthetic." This system delivers that direction: hairline structure, generous air, mono broadcast metadata, a single orange accent, square corners, almost no shadow.

---

## 1. What THE SSH is

THE SSH is a weekly gathering of music lovers. **Every Saturday**, people listen together and everything played comes from a **physical format** — vinyl, cassette, CD, or iPod. The day starts *open format* (anyone can put something on) and builds into featured sets from the community. The hosts provide the turntables, iPod docks, CD players and cassette deck; you bring the records, tapes, discs and iPods.

Core ideas: **no streaming, no algorithms, all formats welcome, no format left behind.** It is warm, communal, analog, and a little deadpan.

**Products represented:** one — the **marketing website** (a single-page Next.js app). There is no app or docs surface. This system therefore ships one UI kit (the website) plus the foundations, components and brand assets to extend it.

### Sources
- **Codebase (provided, read-only):** `theSSH.nyc-main/` — a Next.js 16 / React 19 app.
  - `app/page.tsx` — the single page (hero, manifesto, when/where, scenes collage, footer).
  - `app/ssh2.css` — the original (maximalist) styles: grain, tickers, draggable photo board, stickers.
  - `app/globals.css` — Tailwind theme tokens (`--color-cream/ink/orange`, fonts).
  - `app/components/` — `NowPlaying.tsx`, `HistoryModal.tsx`, `HeroVideo.tsx` (live now-playing + set history via `nowplaying.ipodrepair.nyc`).
  - `public/assets/` — event photography (`scenes/`, `photos/`), hero videos, `rig-setup.jpg`.
  - `public/fonts/BasementGrotesque-Black_v1.202.otf` — the owned display face.
- No Figma file or slide deck was provided.

---

## 2. Content fundamentals

**Voice.** Declarative, dry, a touch deadpan. States facts; never sells. "We listen together." "No format left behind." Short sentences. No hype words, **no exclamation points, no emoji**.

**Person.** Mostly first-person plural ("we provide… you bring…") — host-to-guest, familiar but not chummy.

**Casing.** Two registers:
- **UPPERCASE** for slogans, the wordmark, section eyebrows, labels and the marquee ("NO STREAMING · NO ALGORITHMS").
- **Sentence case** for body copy and ledes.

**Punctuation & marks.** The `★` star is the house separator between marquee phrases and inside the "★ PHYSICAL ONLY ★" capsule. Mid-dots `·` separate metadata ("Clinton Hill · Brooklyn, NY"). Timecodes are written `16:38`.

**Examples (verbatim from the brand):**
- "Every Saturday, we listen together and everything we play comes from a physical format."
- "Bring your vinyl, CDs, cassettes, iPod, or dig through our collection."
- "No streaming · No algorithms · No format left behind"
- "Exact address shared with friends."

---

## 3. Visual foundations

The reinterpretation is **broadcast minimalism**: think a TV lower-third / editorial chyron rather than a flyer. Structure is drawn with **1px hairlines**, not heavy frames; type and air do the work; orange is rationed to one mark per view.

**Color.** A warm analog duotone — sun-bleached **paper** `#ECE5D2` and warm near-black **ink** `#17130D`. Two extra creams (`--paper-2`, `--paper-3`) carry sections and cards. **Orange** `#EA961A` is the single accent (live dot, one highlighted word, an inverted cell's headline). **Blue** `#1E2BE6` (the driveway tent) is a rare, deliberate secondary. Ink steps down to `--ink-2`/`--ink-3` for captions and timestamps. See `tokens/colors.css`.

**Type.** Three families:
- **Basement Grotesque Black** — the owned display face. Black 900, **always uppercase**, set tight (line-height ~.84, tracking −.015em) and large, surrounded by air.
- **Space Grotesk** — calm humanist grotesque for ledes (500) and body (400).
- **Space Mono** — every label, eyebrow, timecode and metadata line. UPPERCASE, tracking .18–.28em. This is what makes it read "broadcast."

See `tokens/typography.css`.

**Spacing & layout.** A strict **4px grid** (`--space-*`), fluid section rhythm (`--section-y`), centered `.ssh-wrap` (max 1320px) with a fluid `--gutter`. Layouts are grids with hairline dividers (the when/where trio, the sets split). Generous negative space is the material.

**Backgrounds.** Flat paper or flat ink. **No grain, no gradients** except a single subtle ink scrim under photo chyrons. No textures, no patterns.

**Imagery.** Warm, candid, sun-on-cream documentary photography (real event stills). Treatment: **uniform aspect-ratio crops** (4:5), 1px ink frame, mono dateline caption below (`The handoff — 16:38`). No filters, no scatter, no polaroid props, no rotation. Aligned grids only.

**Borders & corners.** `--border` is a **1px ink hairline** used as structure (frames, dividers, grid lines). Corners are **square** (`--radius-0`); the **pill** (`--radius-pill`) is the single exception, reserved for `Tag` capsules and toggles.

**Elevation.** Almost none. `--shadow-card` exists but is reserved for the one overlay (the history drawer). Everything else is flat.

**Motion.** Restrained. Standard ease `cubic-bezier(.2,.7,.2,1)`, durations 140/240/420ms. The only ambient motion is the `NowPlayingBadge` EQ bars and one slow `Marquee` (≈34s). Both respect `prefers-reduced-motion`. Entrances, if used, are short fades — no bounces, no parallax, no draggable chaos.

**Hover states.** Quiet. `Button` primary flips ink→orange (the one accent moment); secondary fills ink. `RecordRow` shifts to `--paper-3` and lifts the title to `--orange-ink`. Links lighten/darken; nothing scales up dramatically.

**Press states.** A 1px downward nudge (`translateY(1px)`) — no big scale-down.

**Transparency / blur.** Used sparingly: the photo-chyron scrim (`rgba(ink,.72)` gradient) and the history-drawer scrim (`rgba(ink,.45)`). No glassmorphism / backdrop-blur (a deliberate departure from the original's blurred now-playing chip).

---

## 4. Iconography

The brand is **near-iconless by design** — it speaks in type and the `★` glyph, not an icon set.

- **No icon font, no sprite sheet, no SVG icon library** ships in this system, matching the source (the original used only a couple of tiny inline SVGs — a vinyl circle and an ✕ — plus CSS-drawn "stickers").
- **The star `★`** (U+2605) is the one recurring mark: marquee separators, the "★ PHYSICAL ONLY ★" tag, voice cards.
- **Close / control affordances** use a plain `✕` glyph or a 1px-stroke line, not an icon font.
- **No emoji** anywhere — the source's stray `🎵` fallback was dropped.
- **Format motifs** (vinyl, cassette, CD, iPod) are expressed as **words / `Tag` labels**, not drawn icons. The original's CSS-art stickers were intentionally removed in the minimalist direction.
- If a future surface needs UI glyphs, substitute a hairline (1–1.5px) stroke set such as **Lucide** via CDN to match the system's thin-line structure, and document the addition here. No icons were drawn by hand for this system.

---

## 5. Index / manifest

**Root**
- `styles.css` — the single entry point consumers link (a list of `@import`s only).
- `readme.md` — this guide.
- `SKILL.md` — Agent-Skills-compatible front matter for downloading into Claude Code.

**Tokens** (`tokens/`, all imported by `styles.css`)
- `fonts.css` — `@font-face` (Basement Grotesque) + Google Fonts import (Space Grotesk / Space Mono).
- `colors.css` — palette + semantic aliases.
- `typography.css` — families, fluid scale, weights, tracking.
- `spacing.css` — 4px scale, layout, radii, borders, elevation, motion.
- `base.css` — reset, `.ssh-wrap` / `.ssh-eyebrow` / `.ssh-display` / `.ssh-rule` primitives, shared keyframes.

**Components** (`components/`)
- `core/` — `Button`, `Tag`, `Eyebrow`, `Card` (+ `core.card.html` specimen).
- `media/` — `NowPlayingBadge`, `RecordRow`, `Marquee` (+ `media.card.html` specimen).
- Each component is `Name.jsx` + `Name.d.ts` + `Name.prompt.md`. Consume via `window.THESSHDesignSystem_8ff773.<Name>`.

**Guidelines** (`guidelines/`) — foundation specimen cards (Colors, Type, Spacing, Brand) shown in the Design System tab.

**UI kit** (`ui_kits/site/`) — the minimalist SSH website recreation; see its `README.md`.

**Assets** (`assets/`)
- `fonts/BasementGrotesque-Black.otf`
- `photos/` — curated event photography (rig, group, handoff, table, evening, etc.).

---

## 6. Caveats
- **Fonts:** Basement Grotesque is self-hosted (provided). Space Grotesk + Space Mono load from **Google Fonts** (the families the original used). Swap to self-hosted files if offline use is required.
- **Live data:** the original pulls now-playing/history from `nowplaying.ipodrepair.nyc`. The UI kit uses representative static data instead.
- **Aesthetic interpretation:** "broadcast / work-and-nonwork" was read as *editorial broadcast minimalism*. If you meant a specific studio reference, share it and the foundations can be tuned.
