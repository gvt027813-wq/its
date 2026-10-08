/* FunLab core — personal-best score system on top of storage. */
window.FunLab = window.FunLab || {};
(function (FL) {
  "use strict";

  const store = FL.store;

  /**
   * The stored best for a key, or null.
   * @param {string} key
   */
  function best(key) {
    const v = store.get("best:" + key, null);
    return typeof v === "number" && isFinite(v) ? v : null;
  }

  /**
   * Submit a result. Returns { value, best, isBest, previous }.
   * @param {string} key
   * @param {number} value
   * @param {boolean} higherBetter
   */
  function submit(key, value, higherBetter = true) {
    const current = best(key);
    const isBetter = current == null || (higherBetter ? value > current : value < current);
    if (isBetter) store.set("best:" + key, value);
    return { value, best: isBetter ? value : current, isBest: isBetter, previous: current };
  }

  /**
   * Bind a chip element to display (and later refresh) a personal best.
   * The element gets data-best-key so `announceBest` can animate updates.
   */
  function bind(el, key, opts = {}) {
    if (!el) return null;
    const higherBetter = opts.higherBetter !== false;
    const format = opts.format || ((v) => v);
    const label = opts.label || "Best";
    const render = () => {
      const b = best(key);
      el.textContent = label + ": " + (b == null ? "—" : format(b));
      el.title = label + " on this device";
    };
    render();
    el.dataset.bestKey = key;
    el.dataset.higherBetter = String(higherBetter);
    el.dataset.bestFormat = "fn";
    el._renderBest = render;
    return el;
  }

  /** Re-render + pop-animate a bound chip (call after submit). */
  function announce(el) {
    if (!el) return;
    if (el._renderBest) el._renderBest();
    el.classList.remove("pop");
    void el.offsetWidth; // restart animation
    el.classList.add("pop");
  }

  FL.scores = { best, submit, bind, announce };
})(window.FunLab);
