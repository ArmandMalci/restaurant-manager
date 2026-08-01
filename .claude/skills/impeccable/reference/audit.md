Run systematic **technical** quality checks and generate a comprehensive report. Don't fix issues; document them for other commands to address.

This is a code-level audit, not a design critique. Check what's measurable and verifiable in the implementation.

## Diagnostic Scan

Run comprehensive checks across 5 dimensions. Score each dimension 0-4 using the criteria below.

### 1. Accessibility (A11y)

**Check for**:
- **Contrast issues**: Text contrast ratios < 4.5:1 (or 7:1 for AAA)
- **Missing ARIA**: Interactive elements without proper roles, labels, or states
- **Keyboard navigation**: Missing focus indicators, illogical tab order, keyboard traps
- **Semantic HTML**: Improper heading hierarchy, missing landmarks, divs instead of buttons
- **Alt text**: Missing or poor image descriptions
- **Form issues**: Inputs without labels, poor error messaging, missing required indicators

**Score 0-4**: 0=Inaccessible (fails WCAG A), 1=Major gaps (few ARIA labels, no keyboard nav), 2=Partial (some a11y effort, significant gaps), 3=Good (WCAG AA mostly met, minor gaps), 4=Excellent (WCAG AA fully met, approaches AAA)

### 2. Performance

**Check for**:
- **Layout thrashing**: Reading/writing layout properties in loops
- **Expensive animations**: Casual layout-property animation, unbounded blur/filter/shadow effects, or effects that visibly drop frames
- **Missing optimization**: Images without lazy loading, unoptimized assets, missing will-change
- **Bundle size**: Unnecessary imports, unused dependencies
- **Render performance**: Unnecessary re-renders, missing memoization

**Score 0-4**: 0=Severe issues (layout thrash, unoptimized everything), 1=Major problems (no lazy loading, expensive animations), 2=Partial (some optimization, gaps remain), 3=Good (mostly optimized, minor improvements possible), 4=Excellent (fast, lean, well-optimized)

### 3. Theming

**Check for**:
- **Hard-coded colors**: Colors not using design tokens
- **Broken dark mode**: Missing dark mode variants, poor contrast in dark theme
- **Inconsistent tokens**: Using wrong tokens, mixing token types
- **Theme switching issues**: Values that don't update on theme change

**Score 0-4**: 0=No theming (hard-coded everything), 1=Minimal tokens (mostly hard-coded), 2=Partial (tokens exist but inconsistently used), 3=Good (tokens used, minor hard-coded values), 4=Excellent (full token system, dark mode works perfectly)

### 4. Responsive Design

**Check for**:
- **Fixed widths**: Hard-coded widths that break on mobile
- **Touch targets**: Interactive elements < 44x44px
- **Horizontal scroll**: Content overflow on narrow viewports
- **Text scaling**: Layouts that break when text size increases
- **Missing breakpoints**: No mobile/tablet variants

**Score 0-4**: 0=Desktop-only (breaks on mobile), 1=Major issues (some breakpoints, many failures), 2=Partial (works on mobile, rough edges), 3=Good (responsive, minor touch target or overflow issues), 4=Excellent (fluid, all viewports, proper touch targets)

### 5. Anti-Patterns (CRITICAL)

Check against ALL the **DON'T** guidelines from the parent impeccable skill (already loaded in this context). Look for AI slop tells (AI color palette, gradient text, glassmorphism, hero metrics, card grids, generic fonts) and general design anti-patterns (gray on color, nested cards, bounce easing, redundant copy).

#### AI-Fingerprint Catalog

The absolute bans in the parent skill are the headline tells. This catalog is the **second-order sweep**: the smaller, compounding fingerprints that mark an interface as machine-generated. Flag each one you find as a tell. These are detection targets only — do not fix them here (audit documents; `polish`/`colorize`/`typeset`/`layout`/`clarify` fix).

**Color & surface**
- The purple/blue "AI gradient" aesthetic. The single most common fingerprint.
- Pure `#000000` / `#ffffff` (covered by the parent skill's tinted-neutral law — confirm it here).
- Oversaturated accents (saturation > ~80%) that scream instead of blending.
- More than one accent color competing for attention.
- Warm and cool grays mixed in the same surface.
- Generic black `box-shadow` at low opacity instead of a hue-tinted shadow.
- A single dark section dropped into an otherwise light page (or vice versa) — reads as a copy-paste accident.
- Flat sections with zero texture/depth where the content clearly wants presence.

**Layout**
- Three equal card columns as the feature row. The most generic AI layout.
- Everything centered and symmetrical, no asymmetry anywhere.
- `height: 100vh` for full-screen sections (mobile viewport bug; `100dvh` is the tell-free choice).
- No max-width container — content stretches edge-to-edge on wide screens.
- Uniform border-radius on every element.
- CTAs at random heights across a card row (not bottom-aligned); feature lists starting at different Y positions across pricing/comparison columns.

**Typography**
- Inter (or browser-default) everywhere, only 400/700 weights.
- Title Case On Every Header instead of sentence case.
- Headlines with no presence (default size/tracking/line-height).
- Body text running wider than ~65–75ch.

**Iconography & imagery**
- Lucide / Feather icons used exclusively — the default AI icon set.
- Cliché icon metaphors (rocketship = "Launch", shield = "Security").
- Inconsistent icon stroke widths.
- Missing favicon.
- Uncanny stock "diverse team" photos.

**Content & copy**
- AI copywriting clichés: "Elevate", "Seamless", "Unleash", "Next-Gen", "Game-changer", "Delve", "Tapestry", "In the world of…".
- Generic placeholder data: "John Doe", "Acme Corp", "Nexus", "SmartFlow", round numbers like `99.99%` / `$100.00`.
- Lorem Ipsum left in place.
- Exclamation marks in success messages; "Oops!" error copy; passive voice ("Mistakes were made").
- Identical dates across all list items; the same avatar reused for distinct people.

**Component patterns**
- Generic card look (border + shadow + white background) used as the default container.
- Always exactly one filled + one ghost button, everywhere.
- Pill-shaped "New"/"Beta" badges; accordion FAQ; 3-card carousel testimonials with dots; pricing table as three equal towers.
- Sun/moon toggle as the only theme switch; footer link-farm with 4 columns.

**Strategic omissions** (what AI typically forgets — absence is the tell)
- No custom 404, no privacy/terms links, no "skip to content" link.
- No form validation, no cookie consent where the jurisdiction requires it.
- Missing meta/OG tags; dead `#` links; no active-page indicator in nav.

**Score 0-4**: 0=AI slop gallery (5+ tells), 1=Heavy AI aesthetic (3-4 tells), 2=Some tells (1-2 noticeable), 3=Mostly clean (subtle issues only), 4=No AI tells (distinctive, intentional design)

## Generate Report

### Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | ? | [most critical a11y issue or "--"] |
| 2 | Performance | ? | |
| 3 | Responsive Design | ? | |
| 4 | Theming | ? | |
| 5 | Anti-Patterns | ? | |
| **Total** | | **??/20** | **[Rating band]** |

**Rating bands**: 18-20 Excellent (minor polish), 14-17 Good (address weak dimensions), 10-13 Acceptable (significant work needed), 6-9 Poor (major overhaul), 0-5 Critical (fundamental issues)

### Anti-Patterns Verdict
**Start here.** Pass/fail: Does this look AI-generated? List specific tells. Be brutally honest.

### Executive Summary
- Audit Health Score: **??/20** ([rating band])
- Total issues found (count by severity: P0/P1/P2/P3)
- Top 3-5 critical issues
- Recommended next steps

### Detailed Findings by Severity

Tag every issue with **P0-P3 severity**:
- **P0 Blocking**: Prevents task completion. Fix immediately
- **P1 Major**: Significant difficulty or WCAG AA violation. Fix before release
- **P2 Minor**: Annoyance, workaround exists. Fix in next pass
- **P3 Polish**: Nice-to-fix, no real user impact. Fix if time permits

For each issue, document:
- **[P?] Issue name**
- **Location**: Component, file, line
- **Category**: Accessibility / Performance / Theming / Responsive / Anti-Pattern
- **Impact**: How it affects users
- **WCAG/Standard**: Which standard it violates (if applicable)
- **Recommendation**: How to fix it
- **Suggested command**: Which command to use (prefer: {{available_commands}})

### Patterns & Systemic Issues

Identify recurring problems that indicate systemic gaps rather than one-off mistakes:
- "Hard-coded colors appear in 15+ components, should use design tokens"
- "Touch targets consistently too small (<44px) throughout mobile experience"

### Positive Findings

Note what's working well: good practices to maintain and replicate.

## Recommended Actions

List recommended commands in priority order (P0 first, then P1, then P2):

1. **[P?] `{{command_prefix}}command-name`**: Brief description (specific context from audit findings)
2. **[P?] `{{command_prefix}}command-name`**: Brief description (specific context)

**Rules**: Only recommend commands from: {{available_commands}}. Map findings to the most appropriate command. End with `{{command_prefix}}impeccable polish` as the final step if any fixes were recommended.

After presenting the summary, tell the user:

> You can ask me to run these one at a time, all at once, or in any order you prefer.
>
> Re-run `{{command_prefix}}impeccable audit` after fixes to see your score improve.

**IMPORTANT**: Be thorough but actionable. Too many P3 issues creates noise. Focus on what actually matters.

**NEVER**:
- Report issues without explaining impact (why does this matter?)
- Provide generic recommendations (be specific and actionable)
- Skip positive findings (celebrate what works)
- Forget to prioritize (everything can't be P0)
- Report false positives without verification

