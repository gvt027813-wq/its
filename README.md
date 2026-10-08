# FunLab 🧪

**Tiny experiments. Big smiles.** A playful, original collection of ten interactive web
experiments — inspired by the *concept* of experimental-entertainment sites like Neal.fun,
but with completely original branding, design, copy, artwork and game implementations.

No frameworks. No paid APIs. No backend. No tracking. Runs anywhere — including a
budget Android phone, offline, in the dark.

## Quick start

```bash
# from this folder — any static server works
python3 -m http.server 8000
# → open http://localhost:8000
```

Opening `index.html` directly from disk also works (all scripts are classic
deferred scripts with relative paths — no ES-module CORS issues).

## The experiments

| Experiment | Category | One-liner |
| --- | --- | --- |
| **Click Rush** | Arcade | Tap as fast as you can for 10 seconds; CPS + personal best |
| **Reaction Lab** | Arcade | Wait for green, tap instantly; 5-round reflex average |
| **Gravity Playground** | Physics | Canvas ball-physics sandbox with gravity/bounce/size sliders |
| **Color Master** | Puzzle | Find the exact colour match among perceptual decoys (Lab ΔE) |
| **Decision Machine** | Random | Feed options in; a dramatic drum + confetti decides |
| **Random Planets** | Random | Seeded procedural planets: painted canvas + lore + collection |
| **Tiny Drawing** | Creative | Smooth brush canvas, undo, eraser, PNG export, local autosave |
| **Password Lab** | Learn | Live entropy/crack-time analysis, 100% on-device |
| **Number Guess** | Puzzle | Higher/lower with live range bar and par scoring |
| **Word Mixer** | Creative | Original discovery game: mix any two things to brew new ones |

## Architecture

```
index.html                  home page (hero, search, filters, featured, grid)
about.html / privacy.html / contact.html / offline.html / 404.html
experiments/<id>/index.html one page per experiment (only loaded when visited)
css/styles.css              design system: tokens, themes, chrome, cards, modal, toast
css/experiments.css         game-specific styles
js/core/                    reusable platform components
  funlab.js       utilities (dom, rng, sanitize, dpr, lazy script loading)
  icons.js        original inline SVG icon set
  storage.js      namespaced, crash-proof localStorage wrapper
  scores.js       personal-best score system
  sound.js        Web-Audio synth SFX + persisted sound toggle
  toast.js        toast notifications
  modal.js        accessible modal + focus trap + confirm()
  theme.js        light/dark theme (system-aware, persisted)
  nav.js          sticky header + mobile menu
  fullscreen.js   fullscreen helper with vendor fallbacks
  registry.js     experiment registry (single source of truth)
  cards.js        card grid, search, category filters, featured, related
  pwa.js          install button + "erase all data" action
  sw-register.js  service-worker registration (secure contexts only)
js/experiments/<id>.js      one module per experiment (defer, page-local)
js/experiments/word-mixer-recipes.js   lazy-loaded recipe book
sw.js                       generated service worker (precache + SWR)
manifest.json               PWA manifest
sitemap.xml / robots.txt    SEO (placeholder domain — replace when deploying)
tools/build.py              builds all HTML pages + manifest + sitemap + sw.js
tools/make_icons.py         generates PNG icons + OG image (Pillow)
tools/fragments/*.html      page body fragments used by build.py
tests/                      node-based smoke tests (jsdom) — dev only
```

### Platform features
- **Components:** cards, navigation, modal, toasts, theme switching, localStorage
  wrapper, score system, fullscreen mode, sound toggle.
- **Theming:** light/dark with `data-theme`, stored pre-paint to avoid flashes,
  follows the OS until the user chooses.
- **Performance:** zero dependencies, page-local scripts, `prefers-reduced-motion`
  respected everywhere, DPR capped (lower on low-power devices), canvas games use
  fixed-timestep simulation and pause when the tab is hidden.
- **Mobile:** 44px+ touch targets, `touch-action` control on canvases, safe-area
  insets, `dvh` layouts, portrait + landscape friendly.
- **Security:** all user text is rendered with `textContent` or escaped via
  `FunLab.escapeHTML`; no `eval`, no external requests, no secrets, no storage of
  password-lab input.
- **PWA:** installable, precached core, stale-while-revalidate assets,
  network-first pages with an offline fallback.
- **SEO:** unique titles/descriptions, Open Graph + Twitter cards, semantic
  landmarks, sitemap.xml, robots.txt.

## Rebuilding

HTML pages are generated from fragments so shared chrome never drifts:

```bash
python3 tools/build.py       # rebuild pages, manifest, sitemap, robots, sw.js
python3 tools/make_icons.py  # regenerate PNG icons + OG image (needs Pillow)
```

Edit fragments in `tools/fragments/` and sources in `css/` / `js/`, then rebuild.
`sw.js` regenerates its precache list and version hash automatically.

## Testing

```bash
cd tests && npm install && node smoke.mjs
```

`smoke.mjs` loads every page in jsdom, clicks through each experiment's core
loop (start runs, submit guesses, mix words, paint strokes, analyze passwords…),
asserts zero console errors and verifies localStorage persistence.

## Deploying

The site is fully static — drop the folder on any static host. Before going live:

1. Replace the placeholder domain in `tools/build.py` (`SITE_URL`) and rebuild.
2. Swap the contact email placeholder in `contact.html`.
3. Serve over HTTPS so the service worker + install prompt activate.

## License

MIT — the code is yours. The name FunLab, the flask logo and all copy/artwork in
this repository are original work made for this project.
