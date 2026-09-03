# Sub-Mode: Premium Utilitarian Minimalism & Editorial UI

> Named sub-mode of the `design-taste` skill. Load this when the brief calls for restraint: minimalist, document-style, Notion-like, editorial, "quiet", "clean".

## OVERRIDES — this mode REPLACES the spine's maximalist defaults

This sub-mode is the deliberate **opposite** of the `design-taste` spine. Do NOT inherit the spine's `(Variance 8, Motion 6, Density 4)` baseline, the Creative Arsenal, or the Motion-Engine perpetual-Bento. The following overrides NULL those defaults:

* **MOTION_INTENSITY ≈ 1–2 (not 6).** Motion is *invisible* — present but never distracting. NO perpetual/infinite loops, NO "every card has an active loop" rule, NO spring-everywhere, NO magnetic micro-physics, NO kinetic typography. The goal is quiet sophistication, not spectacle.
* **DESIGN_VARIANCE moderate (not 8).** Asymmetric *bento* is welcome, but NOT artsy chaos, overlapping layers, rotations, or `margin-top: -2rem` overlaps. Structure stays calm and editorial.
* **VISUAL_DENSITY ≈ 3–4.** Macro-whitespace dominant. Document-style breathing room.
* **No glassmorphism / liquid-glass** beyond subtle navbar blurs. No 3D glass cards, no holographic foil, no mesh-gradient lava lamps.
* **The spine's "Bento 2.0" perpetual-motion paradigm does NOT apply.** Use flat bento (below) instead.

What still applies: the **ANTI-SLOP CONTRACT** (Part III of the spine). This mode TIGHTENS it with its own palette, font, and shadow rules below — never loosens it.

## 1. Protocol overview
Generate highly refined, ultra-minimalist, "document-style" web interfaces analogous to top-tier workspace platforms. Strictly enforce a high-contrast warm monochrome palette, bespoke typographic hierarchies, meticulous structural macro-whitespace, bento-grid layouts, and an ultra-flat component architecture with deliberate muted-pastel accents. Actively reject standard generic SaaS trends.

## 2. Absolute negative constraints (in addition to the shared contract)
- DO NOT use Tailwind's heavy drop shadows (`shadow-md`, `shadow-lg`, `shadow-xl`). Shadows must be practically non-existent or heavily customized to be ultra-diffuse and low-opacity (< 0.05).
- DO NOT use primary-colored backgrounds for large elements/sections (no bright blue/green/red hero sections).
- DO NOT use gradients, neon colors, or 3D glassmorphism (beyond subtle navbar blurs).
- DO NOT use `rounded-full` (pill shapes) for large containers, cards, or primary buttons. (Pills are fine for small tags/badges — see §5.)
- (Inter, generic serif, emojis, generic placeholder names, AI clichés: already banned by the shared contract.)

## 3. Typographic architecture
Rely on extreme typographic contrast and premium font selection for an editorial feel.
- **Primary sans-serif (body, UI, buttons):** clean, geometric, or system-native fonts with character. Target: `font-family: 'SF Pro Display', 'Geist Sans', 'Helvetica Neue', 'Switzer', sans-serif`.
  > **Contract carve-out:** `Helvetica Neue` appears here only as a deep system-native fallback in the stack — a deliberate exception to the contract's generic-`Helvetica` ban for this editorial document-style aesthetic. Lead with `SF Pro Display` / `Geist Sans` / `Switzer`; `Helvetica Neue` is the graceful degradation, never the primary choice. `Inter` remains banned outright.
- **Editorial serif (hero headings & quotes):** Target: `font-family: 'Lyon Text', 'Newsreader', 'Playfair Display', 'Instrument Serif', serif`. Tight tracking (`-0.02em` to `-0.04em`), tight line-height (`1.1`).
- **Monospace (code, keystrokes, meta-data):** Target: `font-family: 'Geist Mono', 'SF Mono', 'JetBrains Mono', monospace`.
- **Text colors:** body never absolute black. Off-black/charcoal (`#111111` or `#2F3437`) with generous `line-height: 1.6`. Secondary text muted gray (`#787774`).

## 4. Color palette (warm monochrome + spot pastels)
Color is a scarce resource — used only for semantic meaning or subtle accents.
- **Canvas / background:** pure white `#FFFFFF` or warm bone/off-white `#F7F6F3` / `#FBFBFA`.
- **Primary surface (cards):** `#FFFFFF` or `#F9F9F8`.
- **Structural borders / dividers:** ultra-light gray `#EAEAEA` or `rgba(0,0,0,0.06)`.
- **Accent colors:** exclusively highly desaturated, washed-out pastels for tags, inline-code backgrounds, or subtle icon backgrounds.
  - Pale Red: `#FDEBEC` (text `#9F2F2D`)
  - Pale Blue: `#E1F3FE` (text `#1F6C9F`)
  - Pale Green: `#EDF3EC` (text `#346538`)
  - Pale Yellow: `#FBF3DB` (text `#956400`)

## 5. Component specifications
- **Bento box feature grids:** asymmetrical CSS Grid. Cards have exactly `border: 1px solid #EAEAEA`. Crisp radius: `8px` or `12px` max. Generous internal padding (`24px`–`40px`). (Flat — no perpetual micro-animation per cell.)
- **Primary CTA (buttons):** solid bg `#111111`, text `#FFFFFF`. Slight radius (`4px`–`6px`). No box-shadow. Hover: subtle shift to `#333333` or micro-scale `transform: scale(0.98)`.
- **Tags & status badges:** pill-shaped (`border-radius: 9999px`), `text-xs`, uppercase, wide tracking (`0.05em`). Background uses the muted pastels.
- **Accordions (FAQ):** strip all container boxes; separate items only with `border-bottom: 1px solid #EAEAEA`. Clean, sharp `+` / `-` toggle.
- **Keystroke micro-UIs:** render shortcuts as physical keys via `<kbd>`: `border: 1px solid #EAEAEA`, `border-radius: 4px`, `background: #F7F6F3`, monospace.
- **Faux-OS window chrome:** when mocking software, wrap in a minimalist container with a white top bar containing three small light-gray circles (macOS controls).

## 6. Iconography & imagery
- **System icons:** Phosphor (Bold or Fill) or Radix UI Icons for a technical, slightly thicker-stroke aesthetic. Standardize stroke width.
- **Illustrations:** monochromatic rough continuous-line ink sketches on white, with a single offset geometric shape filled with a muted pastel.
- **Photography:** high-quality desaturated images with a warm tone. Subtle overlay (`opacity: 0.04` warm grain) to blend into the monochrome palette. Never oversaturated stock. Reliable placeholders: `https://picsum.photos/seed/{context}/1200/800`.
- **Hero & section backgrounds:** never empty/flat — subtle full-width imagery at very low opacity, soft warm radial light spots (`radial-gradient`, `opacity: 0.03`), or minimal geometric line patterns for depth without breaking the clean aesthetic.

## 7. Subtle motion & micro-animations
Motion should feel invisible — present but never distracting.
- **Scroll entry:** elements fade in gently — `translateY(12px)` + `opacity: 0` over `600ms`, `cubic-bezier(0.16, 1, 0.3, 1)`. Use `IntersectionObserver`, never `window.addEventListener('scroll')`.
- **Hover states:** cards lift with an ultra-subtle shadow shift (`box-shadow` `0 0 0` → `0 2px 8px rgba(0,0,0,0.04)` over `200ms`). Buttons `scale(0.98)` on `:active`.
- **Staggered reveals:** lists/grid items enter with a cascade delay (`animation-delay: calc(var(--index) * 80ms)`). Never mount everything at once.
- **Background ambient motion:** OPTIONAL — a single very slow radial-gradient blob (`animation-duration: 20s+`, `opacity: 0.02–0.04`) drifting behind a hero, on a `position: fixed; pointer-events: none` layer. Never on scrolling containers. (This is the only "perpetual" element permitted, and it is optional.)
- **Performance:** animate exclusively via `transform`/`opacity`. No layout-triggering properties. `will-change: transform` sparingly.

## 8. Execution protocol
1. Establish macro-whitespace first — massive vertical padding between sections (`py-24`/`py-32`).
2. Constrain main typography content width to `max-w-4xl` or `max-w-5xl`.
3. Apply the custom typographic hierarchy and monochromatic color variables immediately.
4. Ensure every card/divider/border adheres strictly to the `1px solid #EAEAEA` rule.
5. Add gentle scroll-entry animations to all major content blocks.
6. Ensure sections have visual depth through imagery, ambient gradients, or subtle textures — no empty flat backgrounds.
7. Deliver high-end, uncluttered, editorial code that needs no manual adjustment.
