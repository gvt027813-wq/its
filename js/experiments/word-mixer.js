/* FunLab experiment — Word Mixer, an original combination/discovery game.
   Pick any two things you own, mix them, and the lab tells you what you brewed.
   Curated recipes load lazily; unseen pairs get a deterministic blended result
   so the game never runs dry. Everything is stored locally. */
(function (FL) {
  "use strict";
  const $ = FL.$;

  const slotA = $("#mix-slot-a");
  const slotB = $("#mix-slot-b");
  const mixBtn = $("#mix-btn");
  const resultPanel = $("#mix-result");
  const resultLabel = $("#mix-result-label");
  const resultWord = $("#mix-result-word");
  const useBtn = $("#mix-use");
  const sameBtn = $("#mix-same");
  const grid = $("#mix-grid");
  const countChip = $("#mix-count");
  const statsEl = $("#mix-stats");
  const searchInput = $("#mix-search");
  const resetBtn = $("#mix-reset");

  if (!slotA) return;

  const BASES = ["Spark", "Mist", "Stone", "Bloom"];
  const FALLBACK_PATTERNS = [
    (a, b) => a + " " + b,
    (a, b) => b + " of " + a,
    (a) => "Grand " + a,
    (a, b) => a + " " + b + " Dew",
  ];

  let items = FL.store.get("mixer-items", null);
  if (!Array.isArray(items) || !items.length) items = BASES.slice();
  items = items.filter((w) => typeof w === "string" && w.length <= 40).map((w) => w.replace(/[<>]/g, ""));
  BASES.forEach((b) => { if (!items.includes(b)) items.push(b); });

  let pairs = FL.store.get("mixer-pairs", {});
  let firsts = FL.store.get("mixer-firsts", 0);

  let pickedA = null;
  let pickedB = null;
  let lastResult = null;
  let recipesReady = false;
  let loadingRecipes = null;

  /* ---------- helpers ---------- */
  const pairKey = (a, b) => [a, b].slice().sort().join("+");

  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function blendWords(a, b) {
    const la = a.toLowerCase(), lb = b.toLowerCase();
    const cutA = Math.max(1, Math.round(la.length * 0.55));
    const cutB = Math.max(1, Math.floor(lb.length * 0.45));
    let out = la.slice(0, cutA) + lb.slice(cutB);
    if (out.length > 1 && out[out.length - 1] === out[out.length - 2]) out = out.slice(0, -1);
    return out.charAt(0).toUpperCase() + out.slice(1);
  }

  function fallbackResult(a, b) {
    const key = pairKey(a, b);
    const patterns = FALLBACK_PATTERNS;
    // Canonical (sorted) argument order so both tap orders brew the same thing.
    const [x, y] = [a, b].slice().sort();
    const fn = patterns[hash(key) % patterns.length];
    return fn(x, y).slice(0, 40);
  }

  function persist() {
    FL.store.set("mixer-items", items);
    FL.store.set("mixer-pairs", pairs);
    FL.store.set("mixer-firsts", firsts);
  }

  function ensureRecipes() {
    if (recipesReady || FL.wordRecipes) { recipesReady = true; return Promise.resolve(); }
    if (!loadingRecipes) {
      const root = document.body.dataset.root || "";
      loadingRecipes = FL.loadScript(root + "js/experiments/word-mixer-recipes.js")
        .catch(() => { /* offline or blocked — the fallback kettle still works */ })
        .then(() => { recipesReady = !!FL.wordRecipes; });
    }
    return loadingRecipes;
  }

  /* ---------- rendering ---------- */
  function matchesFilter(word, q) {
    return !q || FL.normalize(word).includes(q);
  }

  function render() {
    const q = FL.normalize(searchInput ? searchInput.value : "");
    grid.innerHTML = "";
    let shown = 0;
    items.forEach((word) => {
      if (!matchesFilter(word, q)) return;
      shown++;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mix-item";
      b.textContent = word;
      if (word === pickedA) b.classList.add("is-picked-a");
      if (word === pickedB) b.classList.add("is-picked-b");
      b.setAttribute("aria-label", "Select " + word + (word === pickedA ? " as first ingredient" : word === pickedB ? " as second ingredient" : ""));
      b.addEventListener("click", () => select(word));
      grid.appendChild(b);
    });
    countChip.textContent = String(items.length);
    const recipeCount = FL.wordRecipes ? Object.keys(FL.wordRecipes).length : 0;
    const found = Object.keys(pairs).length;
    statsEl.textContent = found + " pair" + (found === 1 ? "" : "s") + " tried" +
      (recipeCount ? " · " + recipeCount + "+ curated recipes hidden in the kettle" : "") +
      " · " + firsts + " first discoveries";
  }

  function renderSlots() {
    updateSlot(slotA, pickedA, "Pick one");
    updateSlot(slotB, pickedB, "…and another");
    mixBtn.disabled = !(pickedA && pickedB);
  }

  function updateSlot(slotEl, word, placeholder) {
    slotEl.classList.toggle("is-filled", !!word);
    slotEl.textContent = "";
    const span = document.createElement("span");
    span.className = "mix-slot-label";
    span.textContent = word || placeholder;
    slotEl.appendChild(span);
  }

  function select(word) {
    if (pickedA === word) { pickedA = null; }
    else if (pickedB === word) { pickedB = null; }
    else if (!pickedA) { pickedA = word; }
    else if (!pickedB) { pickedB = word; }
    else { pickedB = word; }
    FL.sfx.play("tick");
    FL.haptic(6);
    render();
    renderSlots();
  }

  slotA.addEventListener("click", () => { pickedA = null; render(); renderSlots(); });
  slotB.addEventListener("click", () => { pickedB = null; render(); renderSlots(); });

  /* ---------- mixing ---------- */
  async function mix() {
    if (!pickedA || !pickedB) return;
    mixBtn.disabled = true;
    mixBtn.classList.add("is-shaking");
    resultPanel.hidden = true;
    FL.sfx.play("whoosh");

    const a = pickedA, b = pickedB;
    const key = pairKey(a, b);
    await ensureRecipes();

    let result = null;
    let isNew = false;

    if (pairs[key]) {
      result = pairs[key];
    } else if (FL.wordRecipes && FL.wordRecipes[key]) {
      result = FL.wordRecipes[key];
      pairs[key] = result;
      if (!items.includes(result)) {
        items.push(result);
        isNew = true;
      }
    } else {
      result = fallbackResult(a, b);
      // Guarantee progress even if the blend collides with an existing word.
      if (items.includes(result)) {
        result = ["Grand " + a, a + " " + b, b + " of " + a][hash(key + "!") % 3].slice(0, 40);
        if (items.includes(result)) result = result + " II";
      }
      pairs[key] = result;
      if (!items.includes(result)) {
        items.push(result);
        isNew = true;
      }
    }

    if (isNew) {
      firsts++;
      FL.sfx.play("win");
      FL.haptic([20, 30, 20]);
    } else {
      FL.sfx.play("success");
    }

    lastResult = result;
    persist();
    mixBtn.classList.remove("is-shaking");
    mixBtn.disabled = false;

    resultLabel.textContent = isNew ? "✨ First discovery — you brewed" : "You brewed";
    resultWord.textContent = result;
    resultWord.classList.toggle("is-new", isNew);
    resultPanel.hidden = false;
    render();
    renderSlots();
  }

  mixBtn.addEventListener("click", mix);

  useBtn.addEventListener("click", () => {
    if (!lastResult) return;
    pickedA = lastResult;
    pickedB = null;
    resultPanel.hidden = true;
    render();
    renderSlots();
    FL.sfx.play("pop");
  });

  sameBtn.addEventListener("click", () => {
    resultPanel.hidden = true;
    pickedA = null;
    pickedB = null;
    render();
    renderSlots();
  });

  if (searchInput) searchInput.addEventListener("input", render);

  resetBtn.addEventListener("click", async () => {
    const yes = await FL.modal.confirm({
      title: "Reset all discoveries?",
      message: "Your drawer goes back to the four base elements and every recipe memory is erased. The kettle will not judge, but it will be sad.",
      confirmLabel: "Reset the drawer",
      danger: true,
    });
    if (!yes) return;
    items = BASES.slice();
    pairs = {};
    firsts = 0;
    pickedA = pickedB = null;
    lastResult = null;
    resultPanel.hidden = true;
    persist();
    render();
    renderSlots();
    FL.toast.success("Drawer reset — fresh spark, mist, stone and bloom");
  });

  // Warm the recipe book when the browser is idle (lazy loading).
  FL.idle(() => { ensureRecipes().then(render); });

  render();
  renderSlots();

  // Public API (used by automated tests).
  FL.register("word-mixer", {
    select,
    mix,
    blendWords,
    fallbackResult,
    pairKey,
    get items() { return items.slice(); },
    get picked() { return [pickedA, pickedB]; },
    get lastResult() { return lastResult; },
  });
})(window.FunLab);
