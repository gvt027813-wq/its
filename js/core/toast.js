/* FunLab core — toast notifications. */
window.FunLab = window.FunLab || {};
(function (FL) {
  "use strict";

  let host = null;

  function ensureHost() {
    if (host && host.isConnected) return host;
    host = document.createElement("div");
    host.className = "toast-host";
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
    return host;
  }

  const TYPE_ICONS = {
    info: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v5M12 7.6v.4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    success: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="currentColor" opacity=".18"/><path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    error: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="currentColor" opacity=".18"/><path d="M12 7.5v5.5M12 16.4v.4" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  };

  /**
   * Show a toast.
   * @param {string} message
   * @param {{type?: "info"|"success"|"error", duration?: number}} [opts]
   */
  function show(message, opts = {}) {
    const type = opts.type || "info";
    const hostEl = ensureHost();
    while (hostEl.children.length >= 3) hostEl.firstElementChild.remove();

    const t = document.createElement("div");
    t.className = "toast toast-" + type;

    const ic = document.createElement("span");
    ic.className = "toast-icon";
    ic.innerHTML = TYPE_ICONS[type] || TYPE_ICONS.info; // internal markup only
    t.appendChild(ic);

    const msg = document.createElement("span");
    msg.className = "toast-msg";
    msg.textContent = message; // user content stays safe
    t.appendChild(msg);

    hostEl.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));

    setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 320);
    }, opts.duration || 2600);
    return t;
  }

  FL.toast = {
    show,
    success: (m, o) => show(m, Object.assign({ type: "success" }, o)),
    error: (m, o) => show(m, Object.assign({ type: "error" }, o)),
  };
})(window.FunLab);
