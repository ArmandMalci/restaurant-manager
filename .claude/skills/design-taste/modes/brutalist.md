# Sub-Mode: Industrial Brutalism & Tactical Telemetry UI

> Named sub-mode of the `design-taste` skill. Load this when the brief calls for raw mechanical interfaces: Swiss print, military/aerospace terminal, declassified-blueprint, data-heavy dashboards or editorial sites that should feel like industrial manuals.

## OVERRIDES — this mode REPLACES the spine's maximalist defaults

This sub-mode is NOT the spine's premium/agency aesthetic. Do NOT inherit `(Variance 8, Motion 6, Density 4)`, the Creative Arsenal, or the Motion-Engine perpetual-Bento. The following overrides NULL those defaults:

* **MOTION_INTENSITY ≈ 1 (not 6) — essentially STATIC.** NO spring physics, NO perpetual/infinite micro-loops, NO magnetic buttons, NO "every card has an active loop". The only motion permitted is *simulated analog degradation* (CRT scanline sweep, mechanical noise) and rare functional state changes — never decorative spring choreography.
* **Geometry: ZERO `border-radius`.** All corners exactly 90°. This directly overrides the spine's `rounded-[2rem]` squircle and Double-Bezel card language — those do NOT apply here.
* **No glassmorphism, no diffused/soft shadows, no gradients, no modern translucency.** The spine's "Liquid Glass", diffusion shadows, and mesh gradients are BANNED in this mode.
* **DESIGN_VARIANCE expresses as rigid modular grids + extreme type-scale contrast**, not artsy organic chaos.
* **VISUAL_DENSITY is bimodal:** extreme data density (packed monospace) alternating with vast calculated negative space.

What still applies: the **ANTI-SLOP CONTRACT** (Part III of the spine) — no emojis, no Inter, no pure black, no generic placeholder content. This mode adds its own utilitarian palette and typography below.

## 1. Discipline
Architect web interfaces that synthesize mid-century Swiss typographic design, industrial manufacturing manuals, and retro-futuristic aerospace/military terminal interfaces. Requires mastery of rigid modular grids, extreme typographic scale contrast, purely utilitarian color, and programmatic simulation of analog degradation (halftones, CRT scanlines, bitmap dithering). The objective: digital environments projecting raw functionality, mechanical precision, and high data density — deliberately discarding conventional consumer UI patterns.

## 2. Visual archetypes
Merge two compatible paradigms. **Pick ONE per project and commit. Do not alternate or mix both within the same interface.**

### 2.1 Swiss Industrial Print
1960s corporate identity + heavy-machinery blueprints. High-contrast light modes (newsprint/off-white substrates). Monolithic heavy sans-serif type. Unforgiving structural grids with visible dividing lines. Aggressive asymmetric negative space punctuated by oversized, viewport-bleeding numerals/letterforms. Heavy use of primary red as alert/accent.

### 2.2 Tactical Telemetry & CRT Terminal
Classified military databases, legacy mainframes, aerospace HUDs. Dark-mode exclusivity. High-density tabular data. Absolute dominance of monospaced type. Technical framing devices (ASCII brackets, crosshairs). Simulated hardware limitations (phosphor glow, scanlines, low bit-depth).

## 3. Typographic architecture
Typography is the primary structural and decorative infrastructure; imagery is secondary. Demand extreme variance in scale, weight, spacing.

### 3.1 Macro-typography (structural headers)
- **Classification:** Neo-Grotesque / Heavy Sans-Serif.
- **Optimal web fonts:** Neue Haas Grotesk (Black), Archivo Black, Monument Extended. `Roboto Flex (Heavy)` is an acceptable alternative IN THIS MODE ONLY.
  > **Notes:** `Inter` is NOT used here — banned outright by the shared ANTI-SLOP CONTRACT; use the heavy grotesques above for the architectural-block headline effect. `Roboto Flex` is listed as a deliberate contract carve-out: the contract bans generic `Roboto`, but the Swiss-industrial aesthetic specifically wants Roboto Flex's heavy variable weights for monolithic blueprint headers — prefer Neue Haas Grotesk / Archivo Black / Monument Extended first.
- **Implementation:** Scale via fluid `clamp(4rem, 10vw, 15rem)`. Tracking extremely tight, often negative (`-0.03em` to `-0.06em`) to force glyphs into solid architectural blocks. Leading highly compressed (`0.85`–`0.95`). Casing exclusively uppercase.

### 3.2 Micro-typography (data & telemetry)
- **Classification:** Monospace / Technical Sans.
- **Optimal web fonts:** JetBrains Mono, IBM Plex Mono, Space Mono, VT323, Courier Prime.
- **Implementation:** Fixed small scale (`10px`–`14px` / `0.7rem`–`0.875rem`). Generous tracking (`0.05em`–`0.1em`) to simulate typewriter/terminal matrices. Leading `1.2`–`1.4`. Exclusively uppercase. Used for all metadata, navigation, unit IDs, coordinates.

### 3.3 Textural contrast (artistic disruption)
- **Classification:** High-contrast serif (used exceedingly sparingly). Playfair Display, or `EB Garamond` as a deliberate contract carve-out. Must be subjected to heavy post-processing (halftone, 1-bit dithering) to degrade vector perfection and create textural juxtaposition against the clean sans-serifs.
  > **Contract carve-out:** the shared contract bans generic `Garamond`, but this mode permits `EB Garamond` SPECIFICALLY because it is always dithered/halftoned beyond recognition as decorative texture, never set as clean readable body type. It is an analog-degradation asset here, not a typeface choice in the contract's sense.

## 4. Color system
Uncompromising. Gradients, soft drop shadows, and modern translucency are PROHIBITED. Colors simulate physical media or primitive emissive displays.

**CRITICAL: Choose ONE substrate palette per project and use it consistently. Never mix light and dark substrates within the same interface.**

### If Swiss Industrial Print (light):
- **Background:** `#F4F4F0` or `#EAE8E3` (matte unbleached documentation paper).
- **Foreground:** `#050505` to `#111111` (carbon ink).
- **Accent:** `#E61919` or `#FF2A2A` (aviation/hazard red) — the ONLY accent. Strike-throughs, thick dividing lines, vital data highlights.

### If Tactical Telemetry (dark):
- **Background:** `#0A0A0A` or `#121212` (deactivated CRT — avoid pure `#000000`).
- **Foreground:** `#EAEAEA` (white phosphor) — primary text.
- **Accent:** `#E61919` or `#FF2A2A` (same red, same rules).
- **Terminal Green (`#4AF626`):** optional — ONLY for a single specific UI element (one status indicator or one readout), never as a general text color. If it serves no clear purpose, omit it.

## 5. Layout & spatial engineering
Must appear mathematically engineered; reject conventional web padding for visible compartmentalization.
- **The Blueprint Grid:** strict CSS Grid. Elements anchor precisely to grid tracks/intersections — they do not float.
- **Visible compartmentalization:** solid borders (`1px`/`2px solid`) delineate zones. Horizontal rules (`<hr>`) span container width to segregate operational units.
- **Bimodal density:** oscillate between extreme data density (packed monospace metadata) and vast calculated negative space framing macro-typography.
- **Geometry:** absolute rejection of `border-radius`. All corners exactly 90° for mechanical rigidity.

## 6. UI components & symbology
Standard web conventions replaced with utilitarian industrial graphics.
- **Syntax decoration:** ASCII to frame data — `[ DELIVERY SYSTEMS ]`, `< RE-IND >`; directional `>>>`, `///`, `\\\`.
- **Industrial markers:** `®`, `©`, `™` as structural geometric elements, not legal text.
- **Technical assets:** crosshairs (`+`) at grid intersections, repeating vertical lines (barcodes), thick horizontal warning stripes, randomized string data (`REV 2.6`, `UNIT / D-01`) to simulate active mechanical processes.

## 7. Textural & post-processing effects
Engineer simulated analog degradation via CSS/SVG so the design isn't purely digital.
- **Halftone & 1-bit dithering:** transform continuous-tone images or large serif type into dot-matrix patterns — pre-processing or CSS `mix-blend-mode: multiply` overlays + SVG radial dot patterns.
- **CRT scanlines:** for terminal interfaces, a `repeating-linear-gradient` background simulating electron-beam sweeps, e.g. `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)`.
- **Mechanical noise:** a global low-opacity SVG static/noise filter on the DOM root for unified physical grain across both modes.

## 8. Web engineering directives
1. **Grid determinism:** `display: grid; gap: 1px;` with contrasting parent/child background colors to generate razor-thin dividing lines without complex border declarations.
2. **Semantic rigidity:** build the DOM with precise semantic tags (`<data>`, `<samp>`, `<kbd>`, `<output>`, `<dl>`) to reflect the technical nature of the telemetry.
3. **Typography clamping:** use CSS `clamp()` exclusively for macro-typography so massive scales adapt aggressively while holding structural integrity across viewports.
