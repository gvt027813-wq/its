/* FunLab core — tiny synthesized sound effects (Web Audio, no files) with a
   persisted on/off toggle. AudioContext is created lazily on first gesture. */
window.FunLab = window.FunLab || {};
(function (FL) {
  "use strict";

  let ctx = null;
  let master = null;
  let enabled = FL.store.get("sound", true);

  function ensureCtx() {
    if (!enabled) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.22;
        master.connect(ctx.destination);
      } catch (_) {
        return null;
      }
    }
    if (ctx.state === "suspended" && ctx.resume) ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(opts) {
    const c = ensureCtx();
    if (!c) return;
    const t0 = c.currentTime + (opts.delay || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(opts.freq || 440, t0);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, (opts.freq || 440) + opts.slide), t0 + (opts.dur || 0.1));
    const vol = (opts.vol == null ? 0.6 : opts.vol);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (opts.dur || 0.1));
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + (opts.dur || 0.1) + 0.06);
  }

  function noise(opts) {
    const c = ensureCtx();
    if (!c) return;
    const dur = opts.dur || 0.15;
    const t0 = c.currentTime + (opts.delay || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = opts.freq || 1200;
    filter.Q.value = opts.q || 0.9;
    const gain = c.createGain();
    gain.gain.setValueAtTime(Math.max(0.0002, opts.vol == null ? 0.4 : opts.vol), t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(master);
    src.start(t0);
  }

  const sfxBank = {
    tap: () => tone({ freq: 480 + Math.random() * 120, dur: 0.055, type: "triangle", vol: 0.5 }),
    click: () => tone({ freq: 720, dur: 0.05, type: "square", vol: 0.22 }),
    pop: () => tone({ freq: 300, dur: 0.09, type: "sine", slide: 240, vol: 0.6 }),
    tick: () => tone({ freq: 1250, dur: 0.03, type: "square", vol: 0.14 }),
    bounce: () => tone({ freq: 190, dur: 0.07, type: "sine", slide: 120, vol: 0.4 }),
    success: () => {
      tone({ freq: 523, dur: 0.09, type: "triangle", vol: 0.55 });
      tone({ freq: 659, dur: 0.09, type: "triangle", vol: 0.55, delay: 0.08 });
      tone({ freq: 784, dur: 0.16, type: "triangle", vol: 0.55, delay: 0.16 });
    },
    win: () => {
      [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.13, type: "triangle", vol: 0.55, delay: i * 0.09 }));
      noise({ dur: 0.35, vol: 0.14, freq: 5200, delay: 0.34 });
    },
    error: () => {
      tone({ freq: 220, dur: 0.16, type: "sawtooth", vol: 0.35 });
      tone({ freq: 174, dur: 0.22, type: "sawtooth", vol: 0.35, delay: 0.11 });
    },
    whoosh: () => noise({ dur: 0.4, vol: 0.28, freq: 800, q: 0.6 }),
    drum: (n) => {
      const hits = n || 14;
      for (let i = 0; i < hits; i++) noise({ dur: 0.045, vol: 0.3, freq: 260 + i * 14, delay: i * 0.085 });
    },
  };

  function syncButtons() {
    FL.$$("[data-sound-toggle]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(!enabled));
      btn.setAttribute("aria-label", enabled ? "Mute sounds" : "Unmute sounds");
      const on = btn.querySelector(".ic-on");
      const off = btn.querySelector(".ic-off");
      if (on) on.hidden = !enabled;
      if (off) off.hidden = enabled;
    });
  }

  FL.sfx = {
    play(name, arg) {
      if (!enabled || !sfxBank[name]) return;
      try { sfxBank[name](arg); } catch (_) { /* audio should never break a game */ }
    },
    get enabled() { return enabled; },
    toggle(force) {
      enabled = typeof force === "boolean" ? force : !enabled;
      FL.store.set("sound", enabled);
      syncButtons();
      if (enabled) FL.sfx.play("pop");
    },
  };

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-sound-toggle]");
    if (btn) FL.sfx.toggle();
  }, true);

  document.addEventListener("DOMContentLoaded", syncButtons);
})(window.FunLab);
