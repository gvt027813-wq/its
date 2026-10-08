/* FunLab core — original inline SVG icon set (24px grid unless noted). */
window.FunLab = window.FunLab || {};
(function (FL) {
  "use strict";

  const wrap = (body, vb) =>
    '<svg viewBox="' + (vb || "0 0 24 24") + '" width="26" height="26" focusable="false" aria-hidden="true">' + body + "</svg>";

  FL.icons = {
    "click-rush": wrap('<path d="M13 5l6.5 26 4.5-10.5L34.5 16 13 5Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M33 8l1.5 3.5L38 13l-3.5 1.5L33 18l-1.5-3.5L28 13l3.5-1.5L33 8Z" fill="currentColor"/>', "0 0 48 48"),
    "reaction-lab": wrap('<path d="M26 4L10 27h10l-2 17 18-25H26l2-15Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>', "0 0 48 48"),
    "gravity-playground": wrap('<circle cx="24" cy="26" r="12" fill="none" stroke="currentColor" stroke-width="3"/><ellipse cx="24" cy="27" rx="21" ry="6.5" fill="none" stroke="currentColor" stroke-width="2.4" transform="rotate(-14 24 27)"/><circle cx="38" cy="11" r="3.4" fill="currentColor"/>', "0 0 48 48"),
    "color-master": wrap('<circle cx="18" cy="17" r="9" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="30" cy="21" r="9" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="31" r="9" fill="none" stroke="currentColor" stroke-width="3"/>', "0 0 48 48"),
    "decision-machine": wrap('<circle cx="24" cy="26" r="17" fill="none" stroke="currentColor" stroke-width="3"/><path d="M24 17.5l4.3 8.9a4.8 4.8 0 1 1-8.6 0l4.3-8.9Z" fill="currentColor"/>', "0 0 48 48"),
    "random-planets": wrap('<circle cx="24" cy="24" r="13" fill="none" stroke="currentColor" stroke-width="3"/><ellipse cx="24" cy="25" rx="22" ry="7" fill="none" stroke="currentColor" stroke-width="2.4" transform="rotate(-16 24 25)"/><circle cx="12" cy="8" r="1.6" fill="currentColor"/><circle cx="38" cy="6" r="1.2" fill="currentColor"/>', "0 0 48 48"),
    "tiny-drawing": wrap('<path d="M31 7.5l9.5 9.5L18 39.5 6.5 41.5 8.5 30 31 7.5Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M26 12.5L35.5 22" stroke="currentColor" stroke-width="3"/>', "0 0 48 48"),
    "password-lab": wrap('<path d="M24 4.5 39 10v11c0 9.8-6.3 17.8-15 21-8.7-3.2-15-11.2-15-21V10l15-5.5Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="20" r="3.4" fill="currentColor"/><path d="M24 23v6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>', "0 0 48 48"),
    "number-guess": wrap('<circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" stroke-width="3"/><path d="M19 17.5h10M19 24h10M19 30.5h10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>', "0 0 48 48"),
    "word-mixer": wrap('<circle cx="19" cy="20" r="11" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="30" cy="27" r="11" fill="none" stroke="currentColor" stroke-width="3"/><path d="M38 7.5l1.6 3.9 3.9 1.6-3.9 1.6L38 18.5l-1.6-3.9-3.9-1.6 3.9-1.6L38 7.5Z" fill="currentColor"/>', "0 0 48 48"),
  };

  /** Return the SVG markup for an experiment icon. */
  FL.icon = (name) => FL.icons[name] || FL.icons["number-guess"];
})(window.FunLab);
