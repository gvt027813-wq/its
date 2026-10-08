/* FunLab core — fullscreen helper with vendor fallbacks. */
window.FunLab = window.FunLab || {};
(function (FL) {
  "use strict";

  function element() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function toggle(target) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (element()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) { try { exit.call(document); } catch (_) { /* noop */ } }
    } else {
      const node = el || document.documentElement;
      const req = node.requestFullscreen || node.webkitRequestFullscreen;
      if (req) {
        try {
          const p = req.call(node);
          if (p && p.catch) p.catch(() => FL.toast.error("Fullscreen was blocked by the browser."));
        } catch (_) { /* noop */ }
      }
    }
  }

  function syncButtons() {
    const fs = !!element();
    FL.$$("[data-fullscreen]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(fs));
      const expand = btn.querySelector(".ic-expand");
      const collapse = btn.querySelector(".ic-collapse");
      if (expand) expand.hidden = fs;
      if (collapse) collapse.hidden = !fs;
    });
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-fullscreen]");
    if (btn) toggle(btn.getAttribute("data-fullscreen"));
  });

  ["fullscreenchange", "webkitfullscreenchange"].forEach((ev) =>
    document.addEventListener(ev, syncButtons));
  document.addEventListener("DOMContentLoaded", syncButtons);

  FL.fullscreen = { toggle, element };
})(window.FunLab);
