/* FunLab core — namespaced, crash-proof localStorage wrapper. */
window.FunLab = window.FunLab || {};
(function (FL) {
  "use strict";

  const PREFIX = "funlab:";
  let persistent = true;
  try {
    const k = PREFIX + "__probe";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
  } catch (_) {
    persistent = false; // private mode / quota / disabled — fall back to memory
  }
  const memory = new Map();

  const store = {
    /** True if localStorage is usable; false if we're in in-memory fallback. */
    available: persistent,

    get(key, fallback) {
      try {
        const raw = persistent ? localStorage.getItem(PREFIX + key) : memory.get(PREFIX + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (_) {
        return fallback;
      }
    },

    set(key, value) {
      const raw = JSON.stringify(value);
      try {
        if (persistent) localStorage.setItem(PREFIX + key, raw);
        else memory.set(PREFIX + key, raw);
        return true;
      } catch (_) {
        return false;
      }
    },

    remove(key) {
      try { if (persistent) localStorage.removeItem(PREFIX + key); } catch (_) { /* noop */ }
      memory.delete(PREFIX + key);
    },

    /** All FunLab keys without the prefix. */
    keys() {
      const out = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.indexOf(PREFIX) === 0) out.push(k.slice(PREFIX.length));
        }
      } catch (_) { /* noop */ }
      memory.forEach((_, k) => out.push(k.slice(PREFIX.length)));
      return out;
    },

    /** Erase every FunLab key. Returns how many were removed. */
    clearAll() {
      const keys = this.keys();
      keys.forEach((k) => this.remove(k));
      return keys.length;
    },
  };

  FL.store = store;
})(window.FunLab);
