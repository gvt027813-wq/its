#!/usr/bin/env python3
"""
FunLab page builder.

Assembles every HTML page from shared partials (header/footer/head), then
generates manifest.json, sitemap.xml, robots.txt and sw.js (with a fresh
precache manifest) so the site can never drift out of sync.

Usage:  python3 tools/build.py        (run from the repository root)
"""
from __future__ import annotations

import datetime
import hashlib
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRAG = os.path.join(ROOT, "tools", "fragments")

# NOTE: replace with your real domain when deploying.
SITE_URL = "https://funlab.example.com"
TODAY = datetime.date.today().isoformat()

# ---------------------------------------------------------------------------
# Content registry (kept in sync with js/core/registry.js)
# ---------------------------------------------------------------------------
EXPERIMENTS = [
    dict(id="click-rush",        title="Click Rush",        root="experiments/click-rush/"),
    dict(id="reaction-lab",      title="Reaction Lab",      root="experiments/reaction-lab/"),
    dict(id="gravity-playground",title="Gravity Playground",root="experiments/gravity-playground/"),
    dict(id="color-master",      title="Color Master",      root="experiments/color-master/"),
    dict(id="decision-machine",  title="Decision Machine",  root="experiments/decision-machine/"),
    dict(id="random-planets",    title="Random Planets",    root="experiments/random-planets/"),
    dict(id="tiny-drawing",      title="Tiny Drawing",      root="experiments/tiny-drawing/"),
    dict(id="password-lab",      title="Password Lab",      root="experiments/password-lab/"),
    dict(id="number-guess",      title="Number Guess",      root="experiments/number-guess/"),
    dict(id="word-mixer",        title="Word Mixer",        root="experiments/word-mixer/"),
]

PAGES = [
    # out-path, page-id, title, description, fragment, extra-scripts, nav-active
    ("index.html", "home",
     "FunLab — Tiny experiments. Big smiles.",
     "A playful lab of 10 original web experiments: reflex tests, physics toys, drawing, generators and brain teasers. Free, private and works offline.",
     "home.html", [], "home"),

    ("about.html", "about",
     "About FunLab",
     "What FunLab is, how the experiments are built, and the ideas behind the lab: original, playful, private and fast on any device.",
     "about.html", [], "about"),

    ("privacy.html", "privacy",
     "Privacy — FunLab",
     "FunLab has no accounts, no analytics and no tracking. Everything you do is stored only on your device. Learn what stays local and how to erase it.",
     "privacy.html", [], "about"),

    ("contact.html", "contact",
     "Contact — FunLab",
     "Say hello to the FunLab lab team. Report a bug, suggest an experiment or just tell us which toy you broke first.",
     "contact.html", [], "contact"),

    ("offline.html", "offline",
     "Offline — FunLab",
     "You are offline. FunLab is a Progressive Web App, so anything you have already visited keeps working without a connection.",
     "offline.html", [], ""),

    ("404.html", "404",
     "Page not found — FunLab",
     "That page evaporated in an experiment. Head back to the FunLab home page and pick another toy.",
     "404.html", [], ""),
]

for e in EXPERIMENTS:
    PAGES.append((
        os.path.join("experiments", e["id"], "index.html").replace(os.sep, "/"),
        e["id"],
        "%s — FunLab Experiment" % e["title"],
        "",  # filled below from fragment front-matter
        e["id"] + ".html",
        ["js/experiments/%s.js" % e["id"]],
        "home",
    ))

CORE_SCRIPTS = [
    "js/core/funlab.js",
    "js/core/icons.js",
    "js/core/storage.js",
    "js/core/scores.js",
    "js/core/sound.js",
    "js/core/toast.js",
    "js/core/modal.js",
    "js/core/theme.js",
    "js/core/nav.js",
    "js/core/fullscreen.js",
    "js/core/registry.js",
    "js/core/cards.js",
    "js/core/pwa.js",
    "js/core/sw-register.js",
]

# ---------------------------------------------------------------------------
# Partial markup
# ---------------------------------------------------------------------------
HEAD = """<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>%(TITLE)s</title>
<meta name="description" content="%(DESC)s">
<meta name="theme-color" content="#f7f4ee">
<meta name="color-scheme" content="light dark">
<meta name="application-name" content="FunLab">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="FunLab">
<meta property="og:type" content="website">
<meta property="og:site_name" content="FunLab">
<meta property="og:title" content="%(TITLE)s">
<meta property="og:description" content="%(DESC)s">
<meta property="og:url" content="%(SITE_URL)s%(PAGE_PATH)s">
<meta property="og:image" content="%(SITE_URL)s/assets/og/og-cover.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="FunLab — tiny experiments, big smiles">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="%(TITLE)s">
<meta name="twitter:description" content="%(DESC)s">
<meta name="twitter:image" content="%(SITE_URL)s/assets/og/og-cover.png">
<link rel="manifest" href="%(ROOT)smanifest.json">
<link rel="icon" href="%(ROOT)sassets/icons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="%(ROOT)sassets/icons/icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="%(ROOT)sassets/icons/apple-touch-icon.png">
<link rel="stylesheet" href="%(ROOT)scss/styles.css">
<link rel="stylesheet" href="%(ROOT)scss/experiments.css">
<script>(function(){try{var t=null;try{t=localStorage.getItem("funlab:theme")}catch(e){}if(!t){t=(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","light")}})();</script>
</head>
<body data-root="%(ROOT)s" data-page="%(PAGE_ID)s">
<a class="skip-link" href="#main">Skip to content</a>
<noscript><div class="noscript-note">FunLab experiments need JavaScript. Please enable it to play.</div></noscript>
%(HEADER)s
<main class="page" id="main">
%(BODY)s
</main>
%(FOOTER)s
%(SCRIPTS)s</body>
</html>
"""

HEADER = """<header class="site-header" id="site-header">
  <div class="shell header-inner">
    <a class="brand" href="%(ROOT)sindex.html" aria-label="FunLab — home">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="30" height="30" focusable="false">
          <defs><linearGradient id="lg-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#ff6b6b"/></linearGradient></defs>
          <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#lg-a)"/>
          <path d="M13.2 6.4h5.6M14.4 6.4v4.9c0 .6-.17 1.2-.5 1.7l-3.6 5.9c-1.3 2.2.24 5 2.8 5h5.8c2.56 0 4.1-2.8 2.8-5l-3.6-5.9a3.3 3.3 0 0 1-.5-1.7V6.4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="14.6" cy="18.6" r="1.15" fill="#fff"/>
          <circle cx="17.9" cy="15.9" r=".85" fill="#fff"/>
        </svg>
      </span>
      <span class="brand-name">FunLab</span>
    </a>
    <nav class="site-nav" id="site-nav" aria-label="Main navigation">
      <a href="%(ROOT)sindex.html" data-nav="home">Experiments</a>
      <a href="%(ROOT)sabout.html" data-nav="about">About</a>
      <a href="%(ROOT)scontact.html" data-nav="contact">Contact</a>
    </nav>
    <div class="header-actions">
      <button class="icon-btn" type="button" data-sound-toggle aria-pressed="true" aria-label="Mute sounds">
        <span class="ic ic-on" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" focusable="false"><path d="M4 9.5v5h3.4L12 18.6V5.4L7.4 9.5H4Z" fill="currentColor"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.8a7.4 7.4 0 0 1 0 10.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>
        <span class="ic ic-off" aria-hidden="true" hidden><svg viewBox="0 0 24 24" width="22" height="22" focusable="false"><path d="M4 9.5v5h3.4L12 18.6V5.4L7.4 9.5H4Z" fill="currentColor"/><path d="M16 9.5l5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>
      </button>
      <button class="icon-btn" type="button" data-theme-toggle aria-label="Switch to dark theme" aria-pressed="false">
        <span class="ic ic-sun" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" focusable="false"><circle cx="12" cy="12" r="4.4" fill="currentColor"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>
        <span class="ic ic-moon" aria-hidden="true" hidden><svg viewBox="0 0 24 24" width="22" height="22" focusable="false"><path d="M20.4 14.2A8.6 8.6 0 0 1 9.8 3.6a8.6 8.6 0 1 0 10.6 10.6Z" fill="currentColor"/></svg></span>
      </button>
      <button class="icon-btn nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu">
        <span class="ic ic-burger" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" focusable="false"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></span>
        <span class="ic ic-close" aria-hidden="true" hidden><svg viewBox="0 0 24 24" width="22" height="22" focusable="false"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></span>
      </button>
    </div>
  </div>
</header>"""

FOOTER = """<footer class="site-footer">
  <div class="shell footer-grid">
    <div class="footer-brand">
      <a class="brand" href="%(ROOT)sindex.html" aria-label="FunLab — home">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="26" height="26" focusable="false">
            <defs><linearGradient id="lg-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#ff6b6b"/></linearGradient></defs>
            <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#lg-b)"/>
            <path d="M13.2 6.4h5.6M14.4 6.4v4.9c0 .6-.17 1.2-.5 1.7l-3.6 5.9c-1.3 2.2.24 5 2.8 5h5.8c2.56 0 4.1-2.8 2.8-5l-3.6-5.9a3.3 3.3 0 0 1-.5-1.7V6.4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="14.6" cy="18.6" r="1.15" fill="#fff"/>
            <circle cx="17.9" cy="15.9" r=".85" fill="#fff"/>
          </svg>
        </span>
        <span class="brand-name">FunLab</span>
      </a>
      <p class="footer-blurb">A little lab of original web experiments. Built with plain HTML, CSS and JavaScript — no accounts, no ads, no tracking.</p>
      <button class="btn btn-soft btn-sm" type="button" data-install hidden>
        <span aria-hidden="true">&#11015;&#65039;</span> Install FunLab
      </button>
    </div>
    <nav class="footer-col" aria-label="Popular experiments">
      <h3>Popular</h3>
      <a href="%(ROOT)sexperiments/click-rush/">Click Rush</a>
      <a href="%(ROOT)sexperiments/gravity-playground/">Gravity Playground</a>
      <a href="%(ROOT)sexperiments/random-planets/">Random Planets</a>
      <a href="%(ROOT)sexperiments/word-mixer/">Word Mixer</a>
    </nav>
    <nav class="footer-col" aria-label="FunLab pages">
      <h3>FunLab</h3>
      <a href="%(ROOT)sabout.html">About</a>
      <a href="%(ROOT)sprivacy.html">Privacy</a>
      <a href="%(ROOT)scontact.html">Contact</a>
      <a href="%(ROOT)sindex.html">All experiments</a>
    </nav>
  </div>
  <div class="shell footer-base">
    <p>&copy; <span data-year>2026</span> FunLab &middot; Made for the open web &middot; Everything runs &amp; stays on your device.</p>
  </div>
</footer>"""


def render_scripts(core, extra, root):
    tags = []
    for src in core + extra:
        tags.append('<script src="%s%s" defer></script>' % (root, src))
    return "\n".join(tags) + "\n"


def read_fragment(name):
    path = os.path.join(FRAG, name)
    if not os.path.exists(path):
        sys.exit("Missing fragment: %s" % path)
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def build_pages():
    for out, page_id, title, desc, frag, extra, nav_active in PAGES:
        root = "../../" if out.startswith("experiments/") else ""
        body = read_fragment(frag)

        # Experiment pages keep their description in a front-matter comment.
        m = re.search(r"<!--\s*DESC:\s*(.+?)\s*-->", body)
        if m:
            desc = m.group(1)
            body = body[: m.start()] + body[m.end():]

        page_path = "/" + out.replace("index.html", "")
        html = HEAD % dict(
            TITLE=html_escape(title),
            DESC=html_escape(desc),
            SITE_URL=SITE_URL,
            PAGE_PATH=page_path,
            ROOT=root,
            PAGE_ID=page_id,
            HEADER=HEADER % dict(ROOT=root),
            BODY=body.replace("{ROOT}", root),
            FOOTER=FOOTER % dict(ROOT=root),
            SCRIPTS=render_scripts(CORE_SCRIPTS, extra, root),
        )
        html = html.replace('data-nav="%s"' % nav_active,
                            'data-nav="%s" aria-current="page"' % nav_active)

        dest = os.path.join(ROOT, out)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "w", encoding="utf-8") as fh:
            fh.write(html)
        print("built", out)


def html_escape(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
             .replace('"', "&quot;"))


# ---------------------------------------------------------------------------
# Generated support files
# ---------------------------------------------------------------------------
def collect_assets():
    """All site files that should be precached by the service worker."""
    skip_dirs = {".git", "tools", "tests", "node_modules", "__pycache__", ".arena"}
    skip_ext = {".md", ".zip", ".py", ".pyc", ".mjs", ".map"}
    files = []
    for base, dirs, names in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for n in sorted(names):
            ext = os.path.splitext(n)[1].lower()
            if ext in skip_ext:
                continue
            rel = os.path.relpath(os.path.join(base, n), ROOT).replace(os.sep, "/")
            files.append(rel)
    files.sort()
    return files


def build_manifest():
    manifest = {
        "name": "FunLab — Tiny experiments. Big smiles.",
        "short_name": "FunLab",
        "description": "A playful lab of 10 original web experiments. Free, private and works offline.",
        "id": "./",
        "start_url": "./index.html",
        "scope": "./",
        "display": "standalone",
        "orientation": "any",
        "background_color": "#f7f4ee",
        "theme_color": "#7c5cff",
        "categories": ["games", "entertainment", "education"],
        "icons": [
            {"src": "assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": "assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
            {"src": "assets/icons/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"},
            {"src": "assets/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }
    import json
    with open(os.path.join(ROOT, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
        fh.write("\n")
    print("built manifest.json")


def build_sitemap():
    urls = ["/", "/about.html", "/privacy.html", "/contact.html"]
    for e in EXPERIMENTS:
        urls.append("/" + e["root"])
    items = []
    for u in urls:
        items.append(
            "  <url><loc>%s%s</loc><lastmod>%s</lastmod>"
            "<changefreq>weekly</changefreq><priority>%s</priority></url>"
            % (SITE_URL, u, TODAY, "1.0" if u == "/" else "0.8"))
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<!-- Replace funlab.example.com with your real domain when deploying. -->\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + "\n".join(items) + "\n</urlset>\n")
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as fh:
        fh.write(xml)
    print("built sitemap.xml")

    robots = (
        "User-agent: *\nAllow: /\n"
        "# Replace the host below with your real domain when deploying.\n"
        "Sitemap: %s/sitemap.xml\n" % SITE_URL)
    with open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8") as fh:
        fh.write(robots)
    print("built robots.txt")


SW_TEMPLATE = """/* FunLab service worker — generated by tools/build.py. Do not edit by hand. */
"use strict";

const VERSION = "funlab-%(VERSION)s";
const PRECACHE = %(FILES)s;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Cache files one by one so a single hiccup cannot break the install.
    await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages: network first, fall back to cache, then to the offline page.
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        const offline = await caches.match("offline.html");
        return offline || Response.error();
      }
    })());
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req, { ignoreSearch: false });
    const network = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => undefined);
    return cached || (await network) || Response.error();
  })());
});
"""


def build_sw():
    files = collect_assets()
    h = hashlib.sha1()
    for rel in files:
        with open(os.path.join(ROOT, rel), "rb") as fh:
            h.update(rel.encode())
            h.update(fh.read())
    version = h.hexdigest()[:10]
    js_files = [f for f in files if f.endswith((".html", ".css", ".js", ".json",
                                                ".svg", ".png", ".webp", ".ico"))]
    payload = json_list(js_files)
    with open(os.path.join(ROOT, "sw.js"), "w", encoding="utf-8") as fh:
        fh.write(SW_TEMPLATE % dict(VERSION=version, FILES=payload))
    print("built sw.js (%d precached files, version %s)" % (len(js_files), version))


def json_list(items):
    import json
    return json.dumps(items, indent=2)


# ---------------------------------------------------------------------------
def check_links():
    """Verify every src/href in generated HTML points at a real file."""
    href_re = re.compile(r'(?:src|href)="([^"#?]+)"')
    problems = []
    for out, *_rest in PAGES:
        path = os.path.join(ROOT, out)
        base = os.path.dirname(path)
        with open(path, encoding="utf-8") as fh:
            html = fh.read()
        for ref in href_re.findall(html):
            if ref.startswith(("mailto:", "tel:", "http://", "https:", "data:")):
                continue
            target = os.path.normpath(os.path.join(base, ref))
            if not os.path.exists(target):
                problems.append("%s -> %s" % (out, ref))
    if problems:
        print("BROKEN LINKS:")
        for p in problems:
            print("  " + p)
        sys.exit(1)
    print("link check passed")


if __name__ == "__main__":
    build_pages()
    build_manifest()
    build_sitemap()
    build_sw()
    check_links()
    print("done.")
