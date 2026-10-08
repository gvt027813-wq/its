/* FunLab core — sticky header behaviour + mobile navigation. */
window.FunLab = window.FunLab || {};
(function (FL) {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    const header = document.getElementById("site-header");
    const toggle = header && header.querySelector(".nav-toggle");
    const nav = document.getElementById("site-nav");

    // Elevation on scroll (rAF-throttled).
    if (header) {
      let ticking = false;
      const update = () => {
        header.classList.toggle("is-scrolled", window.scrollY > 8);
        ticking = false;
      };
      window.addEventListener("scroll", () => {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }, { passive: true });
      update();
    }

    const setOpen = (openState) => {
      if (!nav || !toggle) return;
      nav.classList.toggle("open", openState);
      toggle.setAttribute("aria-expanded", String(openState));
      toggle.setAttribute("aria-label", openState ? "Close menu" : "Open menu");
      const burger = toggle.querySelector(".ic-burger");
      const close = toggle.querySelector(".ic-close");
      if (burger) burger.hidden = openState;
      if (close) close.hidden = !openState;
    };

    if (toggle && nav) {
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        setOpen(!nav.classList.contains("open"));
      });
      document.addEventListener("click", (e) => {
        if (nav.classList.contains("open") && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
      });
      nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && nav.classList.contains("open")) { setOpen(false); toggle.focus(); }
      });
    }

    // Footer year(s).
    FL.$$("[data-year]").forEach((el) => { el.textContent = String(new Date().getFullYear()); });
  });
})(window.FunLab);
