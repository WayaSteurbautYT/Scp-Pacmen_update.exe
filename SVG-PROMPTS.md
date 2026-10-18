# SVG Prompt List — Loading & Intro Screens

Prompts for generating replacement/variant SVG artwork for the SCP-PAC_UPDATE.EXE
loading and intro screens. Each entry maps to a real element in `index.html` /
`src/style.css`, so the generated file drops straight into `assets/`.

## Shared style brief (prepend to every prompt)

> Flat-vector "analog horror terminal" style: dark navy backgrounds (#091323 /
> #0d1929), cyan glow #49dce8, alarm pink-red #ff6c87, hazard yellow #ffd32a /
> #ffd94d, mint accent #70e5b5, pale HUD blue #d8eaff. Thin 1.5–2px light
> strokes, subtle outer glow via a single `feGaussianBlur` group,
> SCP-Foundation dossier / containment-terminal aesthetic mixed with playful
> Pac-Man shapes. No embedded fonts, no external references, no raster images.
> All text stays in HTML — the SVG must contain shapes only. Keep each file
> under ~8 kB, use a `viewBox` matching the intended display size, and design
> on a transparent or dark-panel background as specified.

## Currently shipped assets (replace in place)

### 1. `assets/Scp-PAC_Update.exe.svg` — intro app icon

- **Used by:** intro stage 1, `<img class="intro-mark">` (`index.html:295`),
  rendered at **180×180** with a red drop-shadow glow (`icon-pulse` animation).
- **Background:** transparent.
- **Prompt:**
  > A square 180×180 app icon: a bold yellow Pac-Man silhouette (open mouth,
  > facing right) sealed inside a glowing cyan SCP containment
  > hexagon/sigma badge; thin red anomaly-warning ring with four corner
  > brackets around it; one ghostly pink shape peeking from behind the
  > Pac-Man. Flat vector, thick clean shapes, subtle cyan and red glow,
  > transparent background, no text.

### 2. `assets/neon-maze-icon.svg` — loading card + setup brand mark

- **Used by:** `#loading-screen .loading-card img` and
  `.setup-brand .brand-mark` (`index.html:328`, `:338`); small inline display
  (~40–64 px).
- **Background:** transparent.
- **Prompt:**
  > A square 128×128 brand mark: a minimal neon maze corner glyph in glowing
  > cyan (#49dce8) lines — two maze corridors meeting at a right angle with
  > a small yellow pellet dot in the open path and a tiny pink ghost dot at
  > the corridor end. Ultra-clean 3px strokes, slight outer glow, transparent
  > background, no text.

### 3. `assets/scp-maze-background.svg` — setup backdrop

- **Used by:** character-creation backdrop art behind the setup shell.
- **Background:** solid dark (opaque OK).
- **Prompt:**
  > A 1600×900 backdrop: an endless top-down neon maze grid fading into a
  > dark navy (#091323) radial vignette; maze walls drawn as thin cyan
  > (#268fff at 25% opacity) corridors with a few hazard-yellow pellets
  > scattered; faint SCP watermark hexagon centered at 8% opacity; slow
  > "surveillance feed" feel, mostly empty in the center third so UI panels
  > sit on top. Flat vector, no text.

## Intro sequence — new per-stage art (optional upgrades)

Stages live in `#intro-seq` (`index.html:289–321`); each `.intro-stage` is a
`position:absolute; inset:0` flex column on top of the intro card. Backdrops
should be low-contrast so title text stays readable.

### 4. `assets/intro-stage-icon-bg.svg` — stage 1 backdrop

- **Size:** 720×520 (matches `.intro-seq { width: min(720px,92vw); min-height: min(520px,85vh) }`).
- **Prompt:**
  > A 720×520 backdrop for a title card: dark navy terminal grid with faint
  > horizontal scanlines, a large dim SCP sigma watermark centered at 6%
  > opacity, thin cyan circuit traces running in from the edges and stopping
  > before the center, tiny pink and yellow dots along the traces.
  > Everything below 15% brightness except trace tips. Flat vector, no text.

### 5. `assets/intro-stage-title-bg.svg` — stage 2 backdrop

- **Size:** 720×520.
- **Prompt:**
  > A 720×520 backdrop for a game title card: radial dark navy gradient with
  > a cyan horizon glow line at 62% height, faint diagonal warning stripes in
  > hazard yellow (8% opacity) in the top and bottom corners, scattered
  > pellet dots like distant stars. Keep the middle band empty for large
  > title text. Flat vector, no text.

### 6. `assets/intro-stage-credit-bg.svg` — stage 3 backdrop

- **Size:** 720×520.
- **Prompt:**
  > A 720×520 backdrop for a credits card: dark navy with a subtle dotted
  > point-grid map at 10% opacity, one glowing cyan location pin dot slightly
  > off-center with concentric ripple rings, thin frame border with cut
  > corners in dim blue. Calm, spacious, flat vector, no text.


## Loading screen

### 7. `assets/loading-maze-scan.svg` — animated scan strip

- **Used by:** add as `<img>` inside `.loading-card` (above `.loading-track`)
  with `class="maze-scan-art"`; the existing `maze-scan` keyframes
  (`src/style.css:353`) slide it left→right.
- **Size:** 640×96 (wide strip).
- **Prompt:**
  > A 640×96 horizontal strip: a cross-section of neon maze corridors in thin
  > cyan lines on transparent background, three yellow pellet dots and one
  > power orb inside the corridors, a small yellow Pac-Man and a pink ghost
  > silhouette moving through opposite ends, faint scanline texture behind the
  > corridors. Flat vector, transparent background, no text.

## Age-rating pictograms (credit stage)

Replace the emoji spans in `#intro-stage-credit` (`index.html:314–317`) with
`<img>` icons; style hooks `.age-icon` / `.age-badge` already exist.

### 8. `assets/rating-dark-humor.svg` (☠)

> A 24×24 pictogram in pale blue (#9fb2ca): a skull whose cranium is shaped
> like a Pac-Man with a mischievous grin; two round eye sockets; flat vector,
> single color, transparent background, no text.

### 9. `assets/rating-language.svg` (💬)

> A 24×24 pictogram in pale blue (#9fb2ca): a chat bubble containing three
> glitchy pixel blocks instead of letters; flat vector, single color,
> transparent background, no text.

### 10. `assets/rating-scp-horror.svg` (👁)

> A 24×24 pictogram in pale blue (#9fb2ca): an almond-shaped observation eye
> with a hexagonal SCP iris; thin containment brackets above and below; flat
> vector, single color, transparent background, no text.

### 11. `assets/rating-cartoon-violence.svg` (💥)

> A 24×24 pictogram in pale blue (#9fb2ca): a comic starburst impact with one
> tiny pellet being knocked sideways; flat vector, single color, transparent
> background, no text.

## Feature-pill icons (title stage, optional)

Replace the `● ✦ ❤ ⚔` glyphs in `.intro-feature-pills` (`index.html:303–306`)
with 14×14 icons tinted #a4c4de: `pill-race.svg` (two facing arrows / split
circle), `pill-powers.svg` (four-point elemental spark), `pill-survival.svg`
(heart with a bite taken out), `pill-multiplayer.svg` (two linked nodes).

## How to apply

1. Save each file under `assets/` with the exact filename above.
2. Existing assets (`Scp-PAC_Update.exe.svg`, `neon-maze-icon.svg`,
   `scp-maze-background.svg`) are referenced directly — overwriting them is
   enough; the build (`npm run build`) copies `assets/` into `dist/assets/`.
3. New per-stage/backdrop files need an `<img>` or `background-image` added in
   `index.html` (e.g., `<img class="intro-stage-art" src="/assets/intro-stage-icon-bg.svg" alt="">`
   as the first child of each `.intro-stage`, styled
   `.intro-stage-art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .9; pointer-events: none; }`).
4. `npm test` asserts that every asset referenced from `index.html` exists on
   disk — add the file first, then the reference.
