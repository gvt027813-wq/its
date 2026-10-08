/* FunLab core — light/dark theme switching, persisted, system-aware.
   (The inline head script applies the stored theme before first paint;
   this module owns the toggle button and live system changes.) */
window.FunLab = window.FunLab || {};
(function (FL) {
  "use strict";

  const KEY = "theme";
  const systemMQ = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;

  function current() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#12111d" : "#f7f4ee");
  }

  function set(theme, persist = true) {
    apply(theme);
    if (persist) FL.store.set(KEY, theme);
    syncButtons();
  }

  function toggle() {
    set(current() === "dark" ? "light" : "dark");
    FL.sfx.play("click");
  }

  function syncButtons() {
    const dark = current() === "dark";
    FL.$$("[data-theme-toggle]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(dark));
      btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
      const sun = btn.querySelector(".ic-sun");
      const moon = btn.querySelector(".ic-moon");
      if (sun) sun.hidden = dark;   // show sun in dark mode (action: go light)
      if (moon) moon.hidden = !dark;
    });
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-theme-toggle]")) toggle();
  });

  // Follow the OS when the user has not chosen explicitly.
  if (systemMQ && systemMQ.addEventListener) {
    systemMQ.addEventListener("change", (e) => {
      if (FL.store.get(KEY, null) == null) set(e.matches ? "dark" : "light", false);
    });
  }

  document.addEventListener("DOMContentLoaded", syncButtons);
  FL.theme = { current, set, toggle };
})(window.FunLab);
