/* FunLab core — service worker registration (skips insecure contexts). */
(function (FL) {
  "use strict";
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;

  window.addEventListener("load", () => {
    const root = (document.body && document.body.dataset.root) || "";
    navigator.serviceWorker.register(root + "sw.js").catch(() => {
      /* offline support is best-effort */
    });
  });
})(window.FunLab);
