/* FunLab core — PWA glue: custom install button + "erase all data" action. */
window.FunLab = window.FunLab || {};
(function (FL) {
  "use strict";

  let deferredPrompt = null;

  document.addEventListener("DOMContentLoaded", () => {
    const installBtns = FL.$$("[data-install]");

    function showInstallButtons() {
      installBtns.forEach((b) => { b.hidden = false; });
    }

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showInstallButtons();
    });

    installBtns.forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        try {
          const choice = await deferredPrompt.userChoice;
          if (choice && choice.outcome === "accepted") FL.toast.success("FunLab installed. Have fun! 🎉");
        } catch (_) { /* noop */ }
        deferredPrompt = null;
        installBtns.forEach((b) => { b.hidden = true; });
      });
    });

    window.addEventListener("appinstalled", () => {
      installBtns.forEach((b) => { b.hidden = true; });
    });

    // Privacy page: one-tap data wipe.
    const wipe = document.getElementById("wipe-data");
    if (wipe) {
      wipe.addEventListener("click", async () => {
        const yes = await FL.modal.confirm({
          title: "Erase all FunLab data?",
          message: "This removes every score, drawing, discovery and preference saved by FunLab in this browser. It cannot be undone.",
          confirmLabel: "Erase everything",
          danger: true,
        });
        if (!yes) return;
        const n = FL.store.clearAll();
        const result = document.getElementById("wipe-result");
        if (result) result.textContent = "Done — " + n + " items erased. The lab forgets, but it forgives.";
        FL.toast.success("All local data erased");
      });
    }
  });
})(window.FunLab);
