---
name: imagegen-frontend-web
description: Elite frontend image-direction skill for generating premium, conversion-aware website design references. CRITICAL OUTPUT RULE — generate ONE separate horizontal image FOR EVERY section. A landing page with 8 sections produces 8 images. Never compress multiple sections into one image. Enforces composition variety (not always left-text / right-image), background-image freedom, varied CTAs, varied hero scales (giant / mid / mini minimalist), narrative concept spine, second-read moments, and a single consistent palette across all images. Optimized for landing pages, marketing sites, and product comps that developers or coding models can accurately recreate.
model: sonnet
---

# imagegen-frontend-web

> **Shared core:** read `~/shadow-monarchy/.claude/references/imagegen-art-direction.md` first. It owns the Combinatorial Variation Engine, the per-section Composition Anchor / Background Mode / Hero Scale / CTA discipline, the palette + gradient + material rules, the anti-AI-slop canon, and the cross-image consistency rule. This file holds ONLY the web-specific direction: the one-image-per-section output law, the baseline dials, hero minimalism, image counts / page slicing, default site packs, and response behavior.

---

# HARD OUTPUT RULE — READ FIRST

**Generate one separate horizontal image PER section. Always. No exceptions.**

- 1 section requested -> 1 image
- 4 sections requested -> 4 images
- 8 sections requested -> 8 images
- 12 sections requested -> 12 images
- "landing page" with no count -> default to 6 sections -> 6 images
- "full website template" -> default to 8 sections -> 8 images

Each image is one section, generated as its own image call. Never combine multiple sections into one frame. Never return a single tall image that contains the whole page.

If you can only render one image at a time, output them sequentially in the same response, one after the other, until every section has its own image. Announce each one ("Section 1 of 8: Hero", "Section 2 of 8: Trust bar", etc.).

This rule overrides any model default that wants to collapse output into a single image.

---

# HERO COMPOSITION BIAS — READ FIRST

The default **left-text / right-image hero is the most overused AI pattern**. It is allowed, but it should not be your first instinct. Before reaching for it, pick whichever anchor from the shared core (§2) fits the brand best — centered over image, bottom-left over image, image-as-canvas, off-grid editorial, mini minimalist, inverted classic, etc. Use left-text / right-image only when it is genuinely the strongest choice.

**Pre-output check:** before rendering the hero, ask "Am I drafting the default text-left / image-right layout out of habit?" If yes, prefer a different anchor unless the brief truly requires the classic.

---

## 1. ACTIVE BASELINE CONFIGURATION (web)

- DESIGN_VARIANCE: 8 `(1 = rigid / symmetrical, 10 = artsy / asymmetric)`
- VISUAL_DENSITY: 4 `(1 = airy / gallery-like, 10 = packed / intense)`
- ART_DIRECTION: 8 `(1 = safe commercial, 10 = bold creative statement)`
- IMPLEMENTATION_CLARITY: 9 `(1 = loose moodboard, 10 = very codeable UI reference)`
- IMAGE_USAGE_PRIORITY: 9 `(1 = mostly typographic, 10 = strongly image-led)`
- SPACING_GENEROSITY: 8 `(1 = compact / tight, 10 = very spacious / breathable)`
- LAYOUT_VARIATION: 8 `(1 = same anchor repeats, 10 = bold composition variety across sections)`
- CONVERSION_DISCIPLINE: 8 `(1 = pure art moodboard, 10 = clear funnel + premium design balance)`

Use these as global defaults unless the user clearly asks otherwise. Adapt dynamically from the prompt; the user's brief always overrides defaults.

Interpretation:
- "clean" -> reduce density, increase clarity.
- "crazy creative" -> increase variance and art direction.
- "premium SaaS" -> keep clarity high, art direction controlled.
- "editorial" -> stronger type, more asymmetry.
- Bias toward stronger visual concepts, not safe layouts — but never against the brief.
- Use imagery as a core design material, including as **full-bleed backgrounds**, when the brief allows.
- Vary composition; keep sections breathable; prefer slightly more whitespace than default.
- Stay conversion-aware: every section has a job (hook / proof / educate / convert).

### Brief-to-direction mapping (web)
Read the brief, then bias the shared-core picks like this:

- **"minimalist" / "clean" / "typography-only" / "swiss" / "ultra simple"** -> Hero Scale: Mini Minimalist; backgrounds: solid surfaces, subtle texture, optional ONE color-blocked diptych; gradients: skip or softest tonal only; composition: stacked center, generous negative space; the composition-variety "must include full-bleed" rule is suspended.
- **"editorial" / "magazine" / "art-directed" / "fashion"** -> Hero Scale: Mid Editorial or Giant Statement; backgrounds: editorial side-image, duotone, atmospheric grade; gradients: subtle tonal only; composition: off-grid offset, asymmetric pulls; strong type contrast.
- **"cinematic" / "atmospheric" / "premium" / "luxury" / "bold"** -> Hero Scale: Giant Statement; backgrounds: full-bleed image + tonal overlay, soft radial vignette + product, micro-noise gradient; gradients: cinematic palette-matched welcomed; composition: bottom-left over image, centered low, image-as-canvas.
- **"SaaS" / "product" / "dashboard" / "fintech" / "infra"** -> Hero Scale: Mid Editorial; backgrounds: solid + inline asset, flat block + detail crop, occasional editorial side-image; gradients: very subtle, palette-matched; composition: clear product framing, trust-driven anchors; slightly higher implementation clarity.
- **"agency" / "creative studio" / "portfolio"** -> Hero Scale: Giant Statement OR Mini Minimalist (decisive); backgrounds: vary boldly; gradients: editorial washes acceptable; composition: off-grid, poster-like.
- **"e-commerce" / "shop" / "store" / "product page"** -> Hero Scale: Mid Editorial with strong product focus; backgrounds: full-bleed product photo, soft vignette + crop, flat block + detail; gradients: subtle, never competing with product; composition: product-led, CTAs unmistakable.
- **Silent brief** -> use the defaults above + confident background variety; pick one Hero Scale decisively, do not split the difference.

Never force backgrounds, gradients, or full-bleed where the brief asks for restraint. Never strip them where the brief asks for atmosphere.

---

## 2. FRONTEND REFERENCE RULE

Every generated image must clearly communicate layout, section hierarchy, spacing, typography scale, visual rhythm, CTA priority, component styling, image treatment, and the overall design system. A developer or coding model should be able to look at the image and understand how to build it. Do not produce vague abstract artwork when the request is for frontend — default to website design comps.

---

## 3. HERO MINIMALISM RULES

The hero must feel cinematic, clear, and intentional. (Hero composition anchors + hero scale live in the shared core §2.)

### Absolute hero rules
- the hero must feel like a strong opening scene; keep it clean
- do not overcrowd the first viewport
- the main headline must feel short and powerful — usually 5–10 strong words, not a paragraph
- keep supporting text concise; prioritize negative space and contrast
- avoid stuffing the hero with pills, fake stats, badges, tiny logos, and nonsense detail

### Headline rule
The H1 should read like a premium statement. Do not let it feel long, weak, or overly wrapped.

### Typography execution
Prefer medium / normal / light elegance, tight tracking, controlled line count, strong scale contrast. Avoid random extra-bold shouting, gradient text as a lazy premium effect, 6-line startup headings, generated-looking treatment.

### Graphic restraint
Do not default to giant meaningless outline numbers, cheap SVG filler, generic AI blobs, or orb clutter. Use typography, image crops, real layout tension, premium materials, and strong framing instead.

---

## 4. IMAGE COUNT & PAGE SLICING — PRIMARY OUTPUT RULE

Generate **one separate horizontal image PER section**. Always.
- never combine multiple sections in one image
- never return a single tall slice containing the whole page
- never return one "best" image and skip the rest
- never replace several sections with one collage

If the request is ambiguous about section count, **default high**:
- "hero" -> 1 image
- "landing page" / "site template" -> 6 sections -> 6 images
- "full website" / "marketing site" -> 8 sections -> 8 images
- "product page" / "portfolio" -> 6 sections -> 6 images

If the model can only render one image per call, generate them **sequentially in the same response**, labeled "Section X of N: <name>" until the full set is delivered.

### Format
- Always horizontal (16:9, 16:10, or 21:9 depending on density)
- Each image renders one focused section in high fidelity
- Hero usually 16:9 or 21:9; narrower content sections may be 16:10

### Counting rule
1 section -> 1 image; 4 -> 4; 8 -> 8; 12 -> 12. Do not collapse multiple sections into one tall slice. Density may vary, but the canvas stays horizontal and **one section per frame**.

### Section size variety
Across the site, mix section ambition deliberately: some large / content-rich / art-directed, some mini / ultra minimalist / mostly negative space, some medium editorial. This rhythm creates a premium scrollscape, not uniform slabs.

---

## 5. IMAGE-FIRST ART DIRECTION (web)

Images are a core part of the frontend design language, not optional decoration. Strongly prefer art-directed photography, product imagery, editorial imagery, image crops, framed image panels, layered compositions, image-led heroes, and image-supported storytelling blocks.

- the design should not become text-only or card-only unless the user explicitly wants that
- if a page has multiple sections, several should meaningfully include imagery
- a hero should usually contain a strong visual image, product visual, or art-directed media element
- imagery should feel premium and intentional, not stock filler
- avoid tiny useless thumbnails, decorative images with no structural role, one image then a text-heavy rest of page, or overusing fake UI panels

### Media frame discipline
Images inside the site should sit in clear, controlled, implementation-friendly frames: fixed-aspect media blocks, repeatable modules, consistent radius logic, stable proportions across similar sections. Avoid random image sizes, inconsistent proportions, messy scaling, or uncontrolled collage chaos unless requested.

### Image variety inside one comp
Where multiple sections exist, mix at least **two distinct image crops** (e.g. macro product + contextual environment, or portrait editorial + widescreen artifact) — avoid one repeated stock silhouette.

---

## 6. SECTION RHYTHM & SPACING (web)

A high-end site does not feel like repeated boxes. Vary section rhythm by changing density, image-to-text ratio, alignment, scale, whitespace, card grouping, background intensity, visual tempo.

But keep the page coherent:
- use even vertical spacing between major sections; keep section-to-section spacing consistent unless there is a strong reason not to
- avoid one section feeling cramped while the next feels empty
- separate denser sections with calmer ones; allow negative space to create rhythm
- avoid stacking too many cards, labels, and content blocks too tightly
- smaller sections still need enough surrounding space

A premium page should feel open, composed, balanced, confident, breathable — not cramped, noisy, uneven, overfilled, or visually exhausted. Whitespace is a design tool; use it deliberately.

---

## 7. CREATIVITY ESCALATION RULE

Do not settle for the first obvious layout. Actively increase at least 3 of: stronger composition, more distinctive typography, more confident scale contrast, more memorable hero concept, more interesting image treatment, more expressive section rhythm, more original framing, more art-directed tension, more surprising but clear structure.

Creativity must feel intentional, not chaotic. Make bold but controlled decisions; use asymmetry when it improves the page; create premium memorable moments. Do not default to safe templates, repeat the same block structure, confuse creativity with clutter, or over-densify.

---

## 8. COMPONENT EXECUTION GUIDELINES

How to render the web signature components named in the shared core's Signature Component Set:

- **Diagonal Staggered Square Masonry** — square image / content blocks with strong staggered vertical rhythm. Curated and graphic, not messy.
- **3D Cascading Card Deck** — cards layered as a physical stack with depth logic. Premium and tactile, not gimmicky.
- **Hover-Accordion Slice Layout** — a row of compressed visual slices that feel expandable. In static images, imply interaction through proportions and emphasis.
- **Pristine Gapless Bento Grid** — mathematically clean grid, no accidental gaps. Mix large visual blocks with smaller dense information panels.
- **Turning Polaroid Arc** — clustered, rotated imagery with elegant composition. Styled and intentional, not scrapbook-random.
- **Off-Grid Editorial Layout** — asymmetry and tension with control. Must remain readable and clearly structured.
- **Product UI Panel Stack** — layer UI screens or interface crops to imply a product story. Avoid generic fake dashboards.
- **Vertical Rhythm Lines** — fine lines and spacing systems to reinforce order and elegance. Never decorative clutter.

---

## 9. DEFAULT SITE PACKS

### 4-section pack
1. Hero  2. Features  3. Social proof / testimonial  4. CTA

### 8-section pack
1. Hero  2. Trust bar  3. Features  4. Product showcase  5. Benefits / use cases  6. Testimonials  7. Pricing  8. CTA

### 12-section pack
1. Hero  2. Trust bar  3. Feature grid  4. Product preview  5. Problem / solution  6. Benefits  7. Workflow  8. Metrics / proof / integration  9. Testimonials  10. Pricing  11. FAQ  12. CTA + footer

---

## 10. EXTRA CREATIVITY & IMPLEMENTATION EDGE

Apply unless the user opts out:
- **Cross-section contrast** — vary foreground/background intensity at least twice (lighter → richer → calmer) so the scroll is paced, not monotonous slabs.
- **CTA specificity** — one unmistakable primary action per major viewport tier; secondary actions look secondary (scale, outline, ghost).
- **Data-viz restraint** — charts/sparklines appear only when the site type needs them (analytics, pricing, infra, observability). Else keep proof human (quotes, receipts, timelines, real-workflow screenshots).
- **Cultural / tonal alignment** — when the brief names an industry or region, steer palette and typographic temperament to match; don't ship default "neutral SF startup" unless intentionally generic SaaS.
- **Mobile-implied fidelity** — even in desktop mocks, keep tap-friendly hit sizes and readable captions; stacking order should imply a sane single-column narrative.
- **Conversion focus** — every section has a job: hero communicates value + one obvious next action in seconds; proof feels earned not stuffed; pricing/CTA feel decisive not buried; the final section closes with a single strong CTA + trust cue. Avoid pure mood reels with no funnel logic.

---

## 11. CLARITY CHECK (web)

Run the shared-core clarity check (§6 of the reference) first, then verify the web-specific items:
1. Is each image horizontal and one-section-only?
2. Is the **total number of images equal to the number of sections** (never fewer)?
3. Is the hero scale (giant / mid / mini) chosen and executed cleanly?
4. Is the hero using a varied composition (not defaulting to left-text / right-image out of habit)?
5. Is there a clear conversion path (hook -> proof -> action) even in artistic sites?
6. Does the page breathe, with even, controlled spacing between sections?
7. Do smaller sections still have enough surrounding space?

If the count is wrong, regenerate the missing sections. If the hero feels like a reflexive default, prefer a different anchor.

---

## 12. RESPONSE BEHAVIOR

When the user asks for a frontend design:
1. infer site type and primary conversion goal
2. infer number of sections (defaults from §4: landing page = 6, full website = 8)
3. **commit out loud** to the section count ("Generating N horizontal images, one per section")
4. plan ONE horizontal image PER SECTION — always separate generations
5. choose Hero Scale for the whole site (giant / mid / mini)
6. choose a strong shared-core combination (theme, type, hero arch, section system, motion, narrative spine, second-read moment)
7. for each section pick a Composition Anchor, Background Mode, and CTA Variation — vary across sections
8. choose 4 signature components used appropriately
9. enforce hero minimalism + section size variety
10. enforce strong image usage including full-bleed backgrounds where it fits
11. lock one consistent palette across all images
12. apply §10 EXTRA CREATIVITY & IMPLEMENTATION EDGE
13. keep spacing generous, even, and clean
14. remove AI slop (including marquee / fake KPI clichés unless requested)
15. run the shared-core clarity check + §11
16. **generate every per-section horizontal image, labeled "Section X of N: <name>"** until the full set is delivered. Do not stop early, summarize, or return only one image.

Do not ask unnecessary follow-up questions if a strong interpretation is possible.

---

## 13. EXAMPLE INTERPRETATIONS

**"make a hero section for an AI startup"** -> 1 horizontal image; Hero Scale Mid Editorial or Giant; Composition Anchor bottom-left over full-bleed product/atmosphere image; Background Mode full-bleed + dark tonal overlay; CTA outlined inline + small label hint; palette Deep Dark or Bold Studio Solid; no dashboard spam, no purple AI glow.

**"design 8 sections for a fintech website"** -> 8 separate horizontal images; Hero Scale Mid Editorial (trust-driven); vary anchor across sections (centered low, right-third caption, bottom-left over chart visual, stacked center for closing CTA); Background Mode mix (solid, full-bleed once, editorial side-image at use cases); one palette (ink + paper + one accent); conversion path hook -> proof bar -> features -> use case -> testimonial -> pricing -> FAQ -> final CTA.

**"creative agency landing page, 12 sections"** -> 12 horizontal images; Hero Scale Giant Statement OR Mini Minimalist (decisive); editorial / poster-like; off-grid appears 2–3 times; multiple Background Modes; palette consistent with one bold recurring accent; closing CTA section mini minimalist with single primary action.

---

## 14. FINAL GOAL

Generate frontend reference images that feel artistic, premium, clear, structured, image-led, breathable, memorable, anti-generic, and implementation-friendly. The result should look like a top-tier website concept with strong imagery, confident creativity, and generous spacing — not a dense, repetitive AI layout.
