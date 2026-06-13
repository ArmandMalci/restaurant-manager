# PWA Hardening + Offline Strategy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the restaurant manager a fully installable PWA with app-shell caching, offline detection, an install prompt, and an offline mutation queue for resilience when WiFi drops.

**Architecture:** Extend the existing `public/sw.js` (already handles push notifications) with install/activate/fetch cache handlers using two named caches: one for the app shell (network-first with cache fallback) and one for hashed Vite assets (cache-first permanent). A `manifest.json` makes the app installable. Four React primitives — `useOnline`, `useInstallPrompt`, `OfflineBanner`, and `offline-queue.ts` — handle the UI and resilience layer. All offline queue state lives in `localStorage` (no IndexedDB complexity for YAGNI).

**Tech Stack:** Browser Cache API, Service Worker Fetch API, Web App Manifest, `beforeinstallprompt` event, `sharp` (icon generation, dev only), React hooks, localStorage, Tailwind CSS v4.

---

## File Map

**Create:**
- `apps/web/scripts/generate-icons.mjs` — one-shot script: generates 192×192 and 512×512 PNG icons via `sharp`
- `apps/web/public/icons/icon-192.png` — generated app icon
- `apps/web/public/icons/icon-512.png` — generated app icon
- `apps/web/public/manifest.json` — web app manifest
- `apps/web/src/hooks/use-online.ts` — hook: tracks `navigator.onLine` reactively
- `apps/web/src/hooks/use-install-prompt.ts` — hook: captures `beforeinstallprompt`, exposes `install()`
- `apps/web/src/components/offline-banner.tsx` — full-width banner shown when offline
- `apps/web/src/lib/offline-queue.ts` — localStorage-backed queue: enqueue, drain, clear

**Modify:**
- `apps/web/public/sw.js` — add install/activate/fetch caching alongside existing push handlers
- `apps/web/index.html` — add `<link rel="manifest">` and `<meta name="apple-mobile-web-app-*">`
- `apps/web/src/components/layout/app-layout.tsx` — render `OfflineBanner`, drain offline queue on reconnect
- `apps/web/src/routes/_app/settings/index.tsx` — add "Install App" button via `useInstallPrompt`
- `apps/web/package.json` — add `sharp` dev dependency

---

### Task 1: Web app manifest + icons

**Files:**
- Create: `apps/web/scripts/generate-icons.mjs`
- Create: `apps/web/public/icons/icon-192.png` (generated)
- Create: `apps/web/public/icons/icon-512.png` (generated)
- Create: `apps/web/public/manifest.json`
- Modify: `apps/web/index.html`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install sharp**

```bash
cd /Users/armandmalci/code/personal/restaurant-manager && pnpm --filter @restaurant/web add -D sharp
```

Expected: `sharp` appears in `apps/web/package.json` devDependencies.

- [ ] **Step 2: Create the icon generation script**

Write `apps/web/scripts/generate-icons.mjs`:

```js
import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(publicDir, { recursive: true })

// Minimal SVG: dark rounded square with a fork-and-knife silhouette
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="18" fill="#09090b"/>
  <rect x="28" y="20" width="6" height="40" rx="3" fill="white"/>
  <rect x="39" y="20" width="6" height="20" rx="3" fill="white"/>
  <rect x="28" y="62" width="17" height="18" rx="3" fill="white"/>
  <rect x="64" y="20" width="6" height="60" rx="3" fill="white"/>
  <path d="M58 20 Q58 42 64 42 Q70 42 70 20" fill="white"/>
</svg>`)

await sharp(svg).resize(192, 192).png().toFile(join(publicDir, 'icon-192.png'))
await sharp(svg).resize(512, 512).png().toFile(join(publicDir, 'icon-512.png'))
console.log('Icons written to public/icons/')
```

- [ ] **Step 3: Run the script to generate icons**

```bash
cd /Users/armandmalci/code/personal/restaurant-manager/apps/web && node scripts/generate-icons.mjs
```

Expected: `Icons written to public/icons/`

Verify files exist:

```bash
ls apps/web/public/icons/
```

Expected: `icon-192.png  icon-512.png`

- [ ] **Step 4: Create `apps/web/public/manifest.json`**

```json
{
  "name": "Restaurant Manager",
  "short_name": "RestMgr",
  "description": "Full-service restaurant management for your team",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#09090b",
  "orientation": "any",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 5: Read `apps/web/index.html` then add manifest link**

```bash
cat apps/web/index.html
```

Replace the contents of `apps/web/index.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#09090b" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="RestMgr" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
    <title>Restaurant Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Commit**

```bash
cd /Users/armandmalci/code/personal/restaurant-manager
git add apps/web/scripts/generate-icons.mjs apps/web/public/icons/ apps/web/public/manifest.json apps/web/index.html apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): add PWA manifest, app icons, and Apple meta tags"
```

---

### Task 2: Extend service worker with app-shell caching

**Files:**
- Modify: `apps/web/public/sw.js`

- [ ] **Step 1: Read the current service worker**

```bash
cat apps/web/public/sw.js
```

- [ ] **Step 2: Replace with extended version**

Overwrite `apps/web/public/sw.js` with the full content below (preserves existing push and notificationclick handlers, adds caching):

```js
// ─── Cache names ────────────────────────────────────────────────────────────
const SHELL_CACHE = 'rm-shell-v1'   // HTML, root — network-first
const ASSET_CACHE = 'rm-assets-v1'  // /assets/* hashed bundles — cache-first

// ─── Install: pre-cache the app shell ───────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.add('/'))
  )
  self.skipWaiting()
})

// ─── Activate: purge stale caches ───────────────────────────────────────────
self.addEventListener('activate', event => {
  const current = [SHELL_CACHE, ASSET_CACHE]
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !current.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// ─── Fetch: caching strategy ─────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests; skip API calls entirely
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) return

  // Hashed Vite assets (/assets/…) → cache-first (they never change URL)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached
          return fetch(request).then(response => {
            cache.put(request, response.clone())
            return response
          })
        })
      )
    )
    return
  }

  // App shell (HTML, static files) → network-first, cache fallback for offline
  event.respondWith(
    fetch(request)
      .then(response => {
        caches.open(SHELL_CACHE).then(cache => cache.put(request, response.clone()))
        return response
      })
      .catch(() => caches.match(request))
  )
})

// ─── Push notifications ──────────────────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {}
  const title = data.title ?? 'Restaurant Manager'
  const body = data.body ?? ''
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow('/'))
})
```

- [ ] **Step 3: Validate syntax**

```bash
node --check apps/web/public/sw.js
```

Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
cd /Users/armandmalci/code/personal/restaurant-manager
git add apps/web/public/sw.js
git commit -m "feat(web): extend service worker with app-shell and asset caching"
```

---

### Task 3: Online/offline hook and OfflineBanner

**Files:**
- Create: `apps/web/src/hooks/use-online.ts`
- Create: `apps/web/src/components/offline-banner.tsx`
- Modify: `apps/web/src/components/layout/app-layout.tsx`

- [ ] **Step 1: Create `apps/web/src/hooks/use-online.ts`**

```ts
import { useEffect, useState } from 'react'

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return online
}
```

- [ ] **Step 2: Create `apps/web/src/components/offline-banner.tsx`**

```tsx
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-800 border-b border-yellow-200"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      You're offline — changes will be queued and sent when reconnected.
    </div>
  )
}
```

- [ ] **Step 3: Read AppLayout**

```bash
cat apps/web/src/components/layout/app-layout.tsx
```

- [ ] **Step 4: Add OfflineBanner to AppLayout**

Replace the contents of `apps/web/src/components/layout/app-layout.tsx` with:

```tsx
import type { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { OfflineBanner } from '../offline-banner'
import { useOnline } from '@/hooks/use-online'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const isOnline = useOnline()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        {!isOnline && <OfflineBanner />}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/armandmalci/code/personal/restaurant-manager && pnpm --filter @restaurant/web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/armandmalci/code/personal/restaurant-manager
git add apps/web/src/hooks/use-online.ts apps/web/src/components/offline-banner.tsx apps/web/src/components/layout/app-layout.tsx
git commit -m "feat(web): add useOnline hook and OfflineBanner shown when network is unavailable"
```

---

### Task 4: Install prompt hook + Settings "Install App" button

**Files:**
- Create: `apps/web/src/hooks/use-install-prompt.ts`
- Modify: `apps/web/src/routes/_app/settings/index.tsx`

- [ ] **Step 1: Create `apps/web/src/hooks/use-install-prompt.ts`**

```ts
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface UseInstallPromptResult {
  canInstall: boolean
  install(): Promise<boolean>
}

export function useInstallPrompt(): UseInstallPromptResult {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install(): Promise<boolean> {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
    return outcome === 'accepted'
  }

  return { canInstall: !!deferredPrompt, install }
}
```

- [ ] **Step 2: Read the Settings page**

```bash
cat apps/web/src/routes/_app/settings/index.tsx
```

- [ ] **Step 3: Add "Install App" section to Settings page**

In `apps/web/src/routes/_app/settings/index.tsx`:

1. Add to the imports at the top:

```ts
import { Download } from 'lucide-react'
import { useInstallPrompt } from '@/hooks/use-install-prompt'
```

2. Inside `SettingsPage`, before the `return`, add:

```ts
const { canInstall, install } = useInstallPrompt()
const [installed, setInstalled] = useState(false)

async function handleInstall() {
  const accepted = await install()
  if (accepted) setInstalled(true)
}
```

3. Inside the returned JSX, after the Notifications section card and before the closing `</div>`, add:

```tsx
{canInstall && !installed && (
  <div className="space-y-4 rounded-lg border p-6">
    <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
      Install App
    </h2>
    <p className="text-sm text-muted-foreground">
      Install Restaurant Manager on this device for faster access and offline support.
    </p>
    <button
      type="button"
      onClick={handleInstall}
      className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
    >
      <Download className="h-4 w-4" />
      Install App
    </button>
  </div>
)}
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/armandmalci/code/personal/restaurant-manager && pnpm --filter @restaurant/web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/armandmalci/code/personal/restaurant-manager
git add apps/web/src/hooks/use-install-prompt.ts apps/web/src/routes/_app/settings/index.tsx
git commit -m "feat(web): add useInstallPrompt hook and Install App button in Settings"
```

---

### Task 5: Offline mutation queue + drain on reconnect

**Files:**
- Create: `apps/web/src/lib/offline-queue.ts`
- Modify: `apps/web/src/components/layout/app-layout.tsx`

- [ ] **Step 1: Create `apps/web/src/lib/offline-queue.ts`**

```ts
import axios from 'axios'

const QUEUE_KEY = 'rm-offline-queue'

interface QueuedRequest {
  id: string
  method: string
  url: string
  body: unknown
  timestamp: number
}

function readQueue(): QueuedRequest[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as QueuedRequest[]
  } catch {
    return []
  }
}

function writeQueue(queue: QueuedRequest[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function enqueueRequest(method: string, url: string, body: unknown): void {
  const queue = readQueue()
  queue.push({ id: crypto.randomUUID(), method, url, body, timestamp: Date.now() })
  writeQueue(queue)
}

export function getQueueLength(): number {
  return readQueue().length
}

export async function drainQueue(): Promise<void> {
  const queue = readQueue()
  if (queue.length === 0) return

  const failed: QueuedRequest[] = []
  for (const req of queue) {
    try {
      await axios({ method: req.method, url: req.url, data: req.body })
    } catch {
      failed.push(req)
    }
  }
  writeQueue(failed)
}
```

- [ ] **Step 2: Read AppLayout**

```bash
cat apps/web/src/components/layout/app-layout.tsx
```

- [ ] **Step 3: Add queue drain on reconnect to AppLayout**

Replace the contents of `apps/web/src/components/layout/app-layout.tsx` with:

```tsx
import { useEffect, useRef, type ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { OfflineBanner } from '../offline-banner'
import { useOnline } from '@/hooks/use-online'
import { drainQueue } from '@/lib/offline-queue'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const isOnline = useOnline()
  const prevOnline = useRef(isOnline)

  useEffect(() => {
    if (!prevOnline.current && isOnline) {
      drainQueue().catch(console.error)
    }
    prevOnline.current = isOnline
  }, [isOnline])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        {!isOnline && <OfflineBanner />}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/armandmalci/code/personal/restaurant-manager && pnpm --filter @restaurant/web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/armandmalci/code/personal/restaurant-manager
git add apps/web/src/lib/offline-queue.ts apps/web/src/components/layout/app-layout.tsx
git commit -m "feat(web): add offline mutation queue with auto-drain on reconnect"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
|---|---|
| Service worker caching (app shell + assets) | Task 2 |
| Web app manifest + icons | Task 1 |
| Offline indicator | Task 3 — OfflineBanner |
| Install prompt | Task 4 — useInstallPrompt + Settings button |
| Offline queue | Task 5 — offline-queue.ts |
| Drain queue on reconnect | Task 5 — AppLayout useEffect |

**Placeholder scan:** No TBDs. All code is complete.

**Type consistency:**
- `useOnline()` returns `boolean` — used as `isOnline` in AppLayout (Task 3 + 5) ✓
- `useInstallPrompt()` returns `{ canInstall: boolean, install(): Promise<boolean> }` — used in Settings (Task 4) ✓
- `drainQueue()` returns `Promise<void>` — called with `.catch` in AppLayout (Task 5) ✓
- `enqueueRequest(method, url, body)` signature defined in Task 5, available for callers ✓
- SW notification icon updated from `/vite.svg` to `/icons/icon-192.png` in Task 2 (consistent with icons created in Task 1) ✓
