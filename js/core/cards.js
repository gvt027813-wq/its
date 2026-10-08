/* FunLab core — experiment cards: home grid + search + category filters,
   featured card, and related mini-cards on experiment pages. */
window.FunLab = window.FunLab || {};
(function (FL) {
  "use strict";

  const root = () => document.body.dataset.root || "";
  const escapeHTML = FL.escapeHTML;

  function href(path) { return root() + path; }

  function cardHTML(e) {
    const arrow = '<span class="card-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" focusable="false"><path d="M5 12h13m-5-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
    return (
      '<a class="card" href="' + escapeHTML(href(e.path)) + '" data-experiment-id="' + escapeHTML(e.id) + '">' +
        '<span class="card-icon" style="background:' + e.tint + ";color:" + e.color + '">' + FL.icon(e.icon) + "</span>" +
        "<span><h3 class=\"card-title\">" + escapeHTML(e.title) + "</h3>" +
        '<p class="card-desc">' + escapeHTML(e.desc) + "</p></span>" +
        '<span class="card-meta"><span class="card-cat" style="background:' + e.tint + ";color:" + e.color + '">' + escapeHTML(e.category) + "</span>" + arrow + "</span>" +
      "</a>"
    );
  }

  function featuredHTML(e) {
    return (
      '<a class="featured-card" href="' + escapeHTML(href(e.path)) + '" aria-label="Featured experiment: ' + escapeHTML(e.title) + '">' +
        '<span class="featured-main">' +
          '<span class="featured-badge">★ Featured</span>' +
          "<h3>" + escapeHTML(e.title) + "</h3>" +
          "<p>" + escapeHTML(e.desc) + " Roll a world, save the ones you love, and blame the universe for the rest.</p>" +
          '<span class="featured-cta">Open the observatory <span class="card-arrow" aria-hidden="true">→</span></span>' +
        "</span>" +
        '<span class="featured-art" aria-hidden="true">' +
          '<svg viewBox="0 0 200 200" focusable="false">' +
            '<defs><radialGradient id="feat-planet" cx="35%" cy="30%" r="80%">' +
              '<stop offset="0%" stop-color="#9be8d8"/><stop offset="55%" stop-color="#2bb6a0"/><stop offset="100%" stop-color="#136c63"/>' +
            "</radialGradient>" +
            '<linearGradient id="feat-ring" x1="0" y1="0" x2="1" y2="0">' +
              '<stop offset="0" stop-color="#ffd166"/><stop offset="1" stop-color="#ff8fa3"/>' +
            "</linearGradient></defs>" +
            '<ellipse cx="100" cy="106" rx="92" ry="26" fill="none" stroke="url(#feat-ring)" stroke-width="10" opacity=".55" transform="rotate(-14 100 106)"/>' +
            '<circle cx="100" cy="98" r="52" fill="url(#feat-planet)"/>' +
            '<path d="M56 86c14 8 26-6 40 2s22-4 34 2M62 118c12 6 20-4 32 2s18-2 28 2" stroke="rgba(255,255,255,.5)" stroke-width="5" fill="none" stroke-linecap="round"/>' +
            '<ellipse cx="100" cy="106" rx="92" ry="26" fill="none" stroke="url(#feat-ring)" stroke-width="10" transform="rotate(-14 100 106)" stroke-dasharray="150 120" stroke-dashoffset="-92"/>' +
            '<circle cx="160" cy="48" r="4" fill="#ffd166"/><circle cx="42" cy="150" r="3" fill="#9b82ff"/><circle cx="172" cy="140" r="2.5" fill="#ff8fa3"/>' +
          "</svg>" +
        "</span>" +
      "</a>"
    );
  }

  function matches(e, query, category) {
    if (category && category !== "All" && e.category !== category) return false;
    if (!query) return true;
    const hay = FL.normalize([e.title, e.desc, e.category, e.tags.join(" ")].join(" "));
    return query.split(/\s+/).every((word) => hay.indexOf(word) !== -1);
  }

  function initHome() {
    const grid = document.getElementById("experiment-grid");
    if (!grid) return; // not the home page

    const featuredSlot = document.getElementById("featured-slot");
    const chipsRow = document.getElementById("category-chips");
    const countEl = document.getElementById("grid-count");
    const emptyEl = document.getElementById("grid-empty");
    const search = document.getElementById("search");
    const searchClear = document.getElementById("search-clear");
    const searchHint = document.getElementById("search-hint");

    const featured = FL.registry.find((e) => e.featured);
    if (featured && featuredSlot) featuredSlot.innerHTML = featuredHTML(featured);

    const categories = ["All"].concat(FL.categories());
    let activeCat = FL.store.get("category", "All");
    if (categories.indexOf(activeCat) === -1) activeCat = "All";

    const chips = categories.map((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = c;
      b.setAttribute("aria-pressed", String(c === activeCat));
      b.addEventListener("click", () => {
        activeCat = c;
        FL.store.set("category", c);
        chips.forEach((ch) => ch.setAttribute("aria-pressed", String(ch.textContent === c)));
        render();
        FL.sfx.play("tick");
      });
      chipsRow.appendChild(b);
      return b;
    });

    function render() {
      const q = FL.normalize(search ? search.value : "");
      const list = FL.registry.filter((e) => matches(e, q, activeCat));
      grid.innerHTML = list.map(cardHTML).join("");
      if (countEl) countEl.textContent = list.length + " of " + FL.registry.length;
      if (emptyEl) emptyEl.hidden = list.length > 0;
      if (searchClear) searchClear.hidden = !q;
      if (searchHint) searchHint.hidden = !!q;
      grid.querySelectorAll(".card").forEach((card, i) => {
        card.style.animationDelay = Math.min(i * 40, 300) + "ms";
        prefetchOnHover(card);
      });
    }

    function prefetchOnHover(card) {
      const e = FL.byExperimentId(card.dataset.experimentId);
      if (!e || e._prefetched) return;
      card.addEventListener("pointerenter", () => {
        if (e._prefetched) return;
        e._prefetched = true;
        try {
          const link = document.createElement("link");
          link.rel = "prefetch";
          link.href = href(e.path);
          document.head.appendChild(link);
        } catch (_) { /* prefetch is best-effort */ }
      }, { once: true, passive: true });
    }

    if (search) {
      search.addEventListener("input", render);
      document.addEventListener("keydown", (e) => {
        if (e.key === "/" && document.activeElement !== search && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
          e.preventDefault();
          search.focus();
        }
      });
    }
    if (searchClear) {
      searchClear.addEventListener("click", () => {
        search.value = "";
        render();
        search.focus();
      });
    }
    const emptyReset = document.getElementById("empty-reset");
    if (emptyReset) {
      emptyReset.addEventListener("click", () => {
        if (search) search.value = "";
        activeCat = "All";
        FL.store.set("category", "All");
        chips.forEach((ch) => ch.setAttribute("aria-pressed", String(ch.textContent === "All")));
        render();
      });
    }

    render();
  }

  function initRelated() {
    FL.$$("[data-related]").forEach((slot) => {
      const ids = slot.getAttribute("data-related").split(",").map((s) => s.trim()).filter(Boolean);
      slot.innerHTML = ids
        .map((id) => FL.byExperimentId(id))
        .filter(Boolean)
        .map(cardHTML)
        .join("");
      slot.classList.add("card-grid-mini");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initHome();
    initRelated();
  });
})(window.FunLab);
