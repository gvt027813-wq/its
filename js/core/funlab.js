/* FunLab core — shared utilities and namespace. ES2022, no dependencies. */
window.FunLab = window.FunLab || {};
(function (FL) {
  "use strict";

  const reducedMQ = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  FL.reducedMotion = () => !!(reducedMQ && reducedMQ.matches);

  FL.$ = (sel, root) => (root || document).querySelector(sel);
  FL.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  FL.clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  FL.rand = (min, max) => min + Math.random() * (max - min);
  FL.randInt = (min, max) => Math.floor(FL.rand(min, max + 1));
  FL.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  FL.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /** Cryptographically strong integer in [0, max). */
  FL.secureInt = function (max) {
    if (window.crypto && crypto.getRandomValues) {
      // Rejection sampling keeps the distribution uniform.
      const limit = Math.floor(0xffffffff / max) * max;
      const buf = new Uint32Array(1);
      let x = 0;
      do {
        crypto.getRandomValues(buf);
        x = buf[0];
      } while (x >= limit);
      return x % max;
    }
    return Math.floor(Math.random() * max);
  };

  FL.escapeHTML = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  FL.normalize = (s) =>
    String(s == null ? "" : s)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  FL.on = (el, type, fn, opts) => { if (el) el.addEventListener(type, fn, opts); };

  FL.haptic = (ms) => {
    try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (_) { /* noop */ }
  };

  const isLowPower = (() => {
    const nav = navigator;
    const mem = nav.deviceMemory;
    const cores = nav.hardwareConcurrency;
    return (typeof mem === "number" && mem <= 2) || (typeof cores === "number" && cores <= 2);
  })();
  FL.lowPower = isLowPower;

  /** Device pixel ratio, capped to keep low-end phones fast. */
  FL.dpr = () => Math.min(window.devicePixelRatio || 1, isLowPower ? 1.35 : 2);

  /** Load an external script once; resolves when it is ready.
      A watchdog keeps callers from hanging if events never fire. */
  const loadedScripts = new Set();
  FL.loadScript = (src) =>
    new Promise((resolve, reject) => {
      if (loadedScripts.has(src)) return resolve();
      loadedScripts.add(src);
      const s = document.createElement("script");
      s.src = src;
      s.defer = true;
      let settled = false;
      const done = () => { if (!settled) { settled = true; resolve(); } };
      s.onload = done;
      s.onerror = () => {
        if (settled) return;
        settled = true;
        loadedScripts.delete(src);
        reject(new Error("Failed to load " + src));
      };
      setTimeout(done, 4000); // watchdog: never hang the caller
      document.head.appendChild(s);
    });

  /** Run a callback when the main thread is likely idle. */
  FL.idle = (fn) => {
    if ("requestIdleCallback" in window) requestIdleCallback(fn, { timeout: 2500 });
    else setTimeout(fn, 250);
  };

  /** Cheap visibility-aware requestAnimationFrame helper. */
  FL.whenVisible = (el, cb) => {
    if (!("IntersectionObserver" in window)) return cb();
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); cb(); }
    }, { rootMargin: "60px" });
    io.observe(el);
  };

  /** Register a game's public API (handy for testing & cross-page stats). */
  FL.games = {};
  FL.register = (id, api) => { FL.games[id] = api; };
})(window.FunLab);
