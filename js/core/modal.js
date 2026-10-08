/* FunLab core — accessible modal dialogs with focus trap + confirm helper. */
window.FunLab = window.FunLab || {};
(function (FL) {
  "use strict";

  let active = null;
  let lastFocus = null;
  let escHandler = null;

  function close() {
    if (!active) return;
    const { wrap, onClose } = active;
    active = null;
    document.removeEventListener("keydown", escHandler, true);
    document.body.classList.remove("modal-open");
    wrap.classList.add("closing");
    setTimeout(() => wrap.remove(), 180);
    if (lastFocus && lastFocus.isConnected && lastFocus.focus) lastFocus.focus();
    if (onClose) onClose();
  }

  /**
   * Open a modal.
   * @param {{title?: string, body?: string|Node, actions?: Array, onClose?: Function, showClose?: boolean}} opts
   * `body` may be a string (call sites must escape any user text with
   * FunLab.escapeHTML first) or a ready-made DOM Node.
   */
  function open(opts) {
    close();
    lastFocus = document.activeElement;

    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    if (opts.title) {
      const h = document.createElement("h2");
      h.className = "modal-title";
      h.textContent = opts.title;
      modal.appendChild(h);
    }

    if (opts.body instanceof Node) {
      const bodyEl = document.createElement("div");
      bodyEl.className = "modal-body";
      bodyEl.appendChild(opts.body);
      modal.appendChild(bodyEl);
    } else if (typeof opts.body === "string") {
      const bodyEl = document.createElement("div");
      bodyEl.className = "modal-body";
      bodyEl.innerHTML = opts.body; // trusted, escaped at call sites
      modal.appendChild(bodyEl);
    }

    const actions = opts.actions || [];
    if (actions.length) {
      const bar = document.createElement("div");
      bar.className = "modal-actions";
      actions.forEach((a) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn " + (a.kind || "btn-soft");
        b.textContent = a.label;
        b.addEventListener("click", () => {
          const keep = a.onClick ? a.onClick() : undefined;
          if (keep !== false) close();
        });
        bar.appendChild(b);
      });
      modal.appendChild(bar);
    }

    if (opts.showClose !== false) {
      const x = document.createElement("button");
      x.type = "button";
      x.className = "icon-btn modal-x";
      x.setAttribute("aria-label", "Close dialog");
      x.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
      x.addEventListener("click", close);
      modal.appendChild(x);
    }

    wrap.appendChild(modal);
    wrap.addEventListener("pointerdown", (e) => { if (e.target === wrap) close(); });
    document.body.appendChild(wrap);
    document.body.classList.add("modal-open");

    escHandler = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      } else if (e.key === "Tab") {
        // Focus trap
        const focusables = FL.$$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', modal)
          .filter((el) => !el.disabled && el.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", escHandler, true);

    active = { wrap, onClose: opts.onClose };
    const firstBtn = modal.querySelector("button");
    if (firstBtn) firstBtn.focus();
    return modal;
  }

  /** Promise-based confirmation dialog. Resolves true/false. */
  function confirm(opts) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (val) => { if (!done) { done = true; resolve(val); } };

      const body = document.createElement("p");
      body.textContent = opts.message || "Are you sure?";

      open({
        title: opts.title || "Confirm",
        body,
        showClose: false,
        actions: [
          { label: opts.cancelLabel || "Cancel", kind: "btn-ghost", onClick: () => { finish(false); } },
          {
            label: opts.confirmLabel || "Confirm",
            kind: opts.danger ? "btn-danger" : "btn",
            onClick: () => { finish(true); },
          },
        ],
        onClose: () => finish(false),
      });
    });
  }

  FL.modal = { open, close, confirm };
})(window.FunLab);
