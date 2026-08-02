# SEO Audit Checklist (2026)

> Source: `docs/superpowers/specs/2026-08-01-claude-setup-program-design.md` §7. Each item below
> is what `seo-audit`'s SKILL.md "Checks" section routes to by number — this file carries the full
> body (why + concrete check), SKILL.md only names the number and one line of context.

## 1. Unique title/description + Next.js `metadataBase`

Every page needs a unique `<title>` (~50–60 characters — Google truncates around 600px of
rendered width, roughly that length) and a unique `<meta name="description">` (~150–160
characters — the same truncation logic applies to the SERP snippet). Duplicate titles across
pages is the single most common on-page SEO defect and it splits ranking signal between pages
that should be distinct.

Separately, and specific to Next.js App Router: **`metadataBase` must be set in the root
`app/layout.tsx`** (`export const metadata: Metadata = { metadataBase: new URL('https://example.com') }`).
Its absence doesn't throw an error — Next.js silently resolves every relative `openGraph.images`
and `alternates.canonical` URL against `http://localhost:3000` in production builds. This is the
most common Next.js SEO bug because it produces no error, no warning, and no visible symptom in
local dev — only broken OG previews and wrong canonicals once deployed.

**Check:** `grep -rn "metadataBase" --include='*.tsx' --include='*.ts' --exclude-dir={node_modules,dist,build,.git,.next,__pycache__,.venv,coverage,.turbo} app/` (standard exclusion set per `.claude/references/safe-grep-patterns.md`) — if this returns nothing in an App Router project, that's an automatic fail, no further investigation needed.

## 2. OG image, Twitter card, self-referential canonical

`og:image` must be an **absolute** URL (not relative — the same class of bug as `metadataBase`)
sized 1200×630 (Facebook/LinkedIn/Slack's preferred crop ratio; smaller images get upscaled and
blurred, larger ones get cropped unpredictably). `twitter:card` should be
`summary_large_image` for anything with a hero image, plain `summary` otherwise. Every
indexable page's canonical (`<link rel="canonical">`) should point at itself unless the page is a
deliberate duplicate (e.g., a filtered/sorted variant of a listing page).

**Check:** render each page (Playwright, JS executed) and inspect the resolved `<head>`:
`page.locator('meta[property="og:image"]').getAttribute('content')` must start with `http`;
compare `page.locator('link[rel="canonical"]').getAttribute('href')` against the page's own URL.

## 3. JSON-LD structured data by page type

Sitewide: `Organization` + `WebSite` (with `SearchAction` if the site has on-site search).
Pricing/product pages: `Product` or `SoftwareApplication`. Blog/article pages: `Article`.
Any page with a visible breadcrumb trail: `BreadcrumbList`. FAQ-style content: `FAQPage`.

The 2026 payoff for `FAQPage` specifically is **not** the classic rich-snippet accordion in
Google's SERP — it's that AI assistants (ChatGPT browsing, Perplexity, Claude with web search)
extract and cite FAQ JSON-LD directly as the answer source. Treat it as an AI-citation surface,
not a decorative rich result.

**Check:** `grep -rn 'application/ld+json' --include='*.tsx' --exclude-dir={node_modules,dist,build,.git,.next,__pycache__,.venv,coverage,.turbo} app/` to find where JSON-LD is
emitted, then validate each emitted block's `@type` against schema.org's type list (a schema
validator library or the Rich Results Test API) — don't just check the script tag exists, check
the `@type` values are real schema.org types and required properties are present.

## 4. Core Web Vitals as field data, not lab data

LCP < 2.5s, INP < 200ms, CLS < 0.1 — but measured **at p75 over a rolling 28-day Chrome UX
Report (CrUX) window**, using real Chrome users' data. A green local Lighthouse run proves
nothing about this: Lighthouse is a single synthetic run on one machine under one network
condition (lab data). A site can lab-score 100/100 in Lighthouse and still fail field CWV in
Search Console because real users are on slower devices/networks, or because a specific
above-the-fold ad/font-swap that never appears in the lab run tanks LCP for real traffic. This
lab-vs-field gap is the most common Core Web Vitals misunderstanding — treat a passing lab score
as "necessary, not sufficient."

**Check (CrUX API):**
```
POST https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=$CRUX_API_KEY
{"origin": "https://example.com", "formFactor": "PHONE"}
```
Response includes `record.metrics.largest_contentful_paint.percentiles.p75`,
`interaction_to_next_paint.percentiles.p75`, `cumulative_layout_shift.percentiles.p75`. No API
key configured → skip this check, report it as a scope limitation, don't fail the check silently.

## 5. Sitemap hygiene

`sitemap.xml` should list only URLs that are: canonical (not a non-canonical duplicate),
indexable (no `noindex`), and return HTTP 200. It must be referenced from `robots.txt` via a
`Sitemap:` directive so crawlers can discover it without a manual submission.

**Check:** fetch `/sitemap.xml` (handle sitemap-index files that point to child sitemaps —
recurse one level), then `curl -sI` every listed URL and flag any non-200, any URL carrying a
`noindex` meta tag, and any URL that 301/302-redirects elsewhere (the sitemap should list the
final destination, not the redirect source). Cross-check `robots.txt` contains
`Sitemap: https://example.com/sitemap.xml`.

**Absence of a sitemap entirely is itself Finding #1 of any audit** — report it under this item,
then continue the crawl in homepage-only mode rather than stopping the audit.

## 6. Per-bot `robots.txt` rules for AI crawlers

2026's crawler landscape includes AI-specific user agents that a 2020-era `robots.txt` never
anticipated: `GPTBot` (OpenAI training), `ClaudeBot` (Anthropic), `PerplexityBot`, `Google-Extended`
(Google's AI-training opt-out, separate from regular Googlebot indexing), and
`Applebot-Extended` (Apple Intelligence). Each should get a **deliberate** `User-agent:` block —
either explicitly allowed or explicitly disallowed — rather than being silently caught by a
generic `User-agent: *` rule that may not reflect the site owner's actual intent for AI
training/citation.

**Check:** fetch `/robots.txt`, `grep -n "^User-agent:" robots.txt` and diff the found agents
against this list; any of the five missing is a WARN (not necessarily a fail — the owner may
deliberately want the wildcard rule to apply), surfaced as "needs your call" since the correct
answer depends on the site's AI-visibility strategy, not a technical default.

## 7. Canonical + hreflang + sitemap + internal links agreement

For multi-locale sites, `hreflang` alternates must be **reciprocal**: if `/en/pricing` declares
`hreflang="fr" href="/fr/pricing"`, then `/fr/pricing` must declare `hreflang="en"
href="/en/pricing"` back. A one-directional hreflang link is worse than none — it sends mixed
signals about which page is authoritative for which locale. All four signals (the page's own
canonical, its hreflang set, its presence in the sitemap, and internal nav links pointing to it)
must point at the same consistent set of URLs.

**Check:** build a map of `{url: {canonical, hreflang_targets}}` from the crawl, then verify for
every hreflang edge A→B that B also has an edge back to A, and that both A and B are in the
sitemap.

## 8. SSR pitfall: metadata must never live in a Client Component

Anything set inside `useEffect` or a `'use client'` component (`document.title = ...`,
`<Head>` mutated client-side) is invisible to crawlers that don't execute JS to completion or
that snapshot the DOM before hydration — this includes most non-Google crawlers and the AI
bots in item 6. In App Router, indexable content and metadata must come from **Server
Components** using the `generateMetadata` export — never `next-seo`, which was built for Pages
Router and fights the App Router metadata API when mixed in.

**Check:** `grep -n "next-seo" package.json` — any hit in an App Router project (confirm via
presence of `app/` directory) is an automatic fail. Separately, list client-component candidates
with `grep -rln "'use client'" --include='*.tsx' --exclude-dir={node_modules,dist,build,.git,.next,__pycache__,.venv,coverage,.turbo} app/`,
then grep each returned file for the actual pattern with `grep -n "document\.title\|useEffect.*meta"
<file>` — any match means metadata is being set client-side where it shouldn't be.

## 9. Mobile-first content parity

Google indexes the **mobile** rendering of a page as primary. If the mobile DOM hides content,
links, or JSON-LD that the desktop DOM shows (a common pattern with "show more on desktop"
components, or nav links dropped from a hamburger menu build), that content effectively doesn't
exist for ranking purposes even though a human on desktop sees it fine.

**Check:** Playwright render the same URL at a mobile viewport (390×844) and a desktop viewport
(1280×800), extract visible text content, `<a href>` list, and JSON-LD blocks from each, and diff
— any content/link/schema present on desktop but absent on mobile is a fail.

## 10. GEO/AEO: crawlable HTML + structured data, not `llms.txt`

**Deliberately skip `llms.txt`** as a checklist item. It is not a real lever: crawlers do not
read it, and Google has stated it will not support it as a standard. Generative Engine
Optimization / Answer Engine Optimization in 2026 is won the same way traditional SEO is won —
crawlable server-rendered HTML (items 8–9) plus correct, extractable structured data (item 3,
especially `FAQPage`). Treat "add an `llms.txt`" as a request that should be redirected back to
these existing checks, not a new item to add.

**Check:** none — this item's check is the absence of a check. If the user asks about `llms.txt`
specifically, the audit should state this reasoning rather than silently adding the file to
scope.

## 11. Mobile deep-link validation (AASA / assetlinks)

For apps with a companion website (Expo/React Native universal links): iOS needs
`/.well-known/apple-app-site-association` served with `Content-Type: application/json`
(no `.json` extension, and critically **no redirect** — iOS refuses to follow redirects when
fetching this file), whose `applinks.details` entries match the app's Expo `associatedDomains`
config. Android needs `/.well-known/assetlinks.json` whose `sha256_cert_fingerprints` matches the
app's actual signing certificate — a stale fingerprint (e.g., after a keystore rotation) silently
breaks all deep links with no runtime error visible to the site.

**Check:**
```
curl -sI https://example.com/.well-known/apple-app-site-association   # expect 200, no Location header, content-type application/json
curl -s  https://example.com/.well-known/assetlinks.json | jq '.[0].target.android_app.sha256_cert_fingerprints'
```
Compare the returned fingerprint against the app's signing cert
(`apksigner verify --print-certs app-release.apk` or the fingerprint in Expo/EAS build
credentials) and against `app.json`/`app.config.ts`'s `ios.associatedDomains` /
`android.intentFilters` entries.

## 12. ASO keyword surfaces (human judgment)

App Store listings get 3–5 keywords in Apple's dedicated 100-character keyword field (not
visible copy — a hidden metadata field). Separately, **screenshot copy is OCR-indexed** by both
Apple's and Google's app store search — the text overlaid on screenshots functions as an
additional keyword surface even though it looks like pure visual design.

This item is **judgment-only**. The audit fetches the current live listing (keyword field
content isn't publicly visible via the storefront, but screenshot text and the description are)
and reports what's there — it does not score or grade keyword choice, since that requires
market/competitor knowledge the audit doesn't have. Always surfaced as "needs your call," never
pass/fail.

---

## Tooling reference

- **Lighthouse CI** — the Agentic Browsing category has been default-on since v13.3.0; run
  alongside Performance/SEO/Accessibility.
- **Playwright** — full-sitemap crawl with real JS rendering (required for items 2, 3, 8, 9).
- **Search Console API** — ground truth for what's actually indexed vs. what the sitemap claims.
- **CrUX API** — field CWV data (item 4); see the request shape above.
- **A schema.org validator** — for item 3; don't hand-roll `@type` checking against a stale
  mental list of schema.org types.
