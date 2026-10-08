/* FunLab experiment — Number Guess. Higher/lower hunting with a live range
   bar, par scoring and per-range personal bests. */
(function (FL) {
  "use strict";
  const $ = FL.$;

  const form = $("#ng-form");
  const input = $("#ng-input");
  const feedback = $("#ng-feedback");
  const historyEl = $("#ng-history");
  const attemptsChip = $("#ng-attempts");
  const parChip = $("#ng-par");
  const bestChip = $("#ng-best");
  const rangeFill = $("#ng-range-fill");
  const loLabel = $("#ng-lo");
  const hiLabel = $("#ng-hi");
  const newBtn = $("#ng-new");
  const rangeChips = FL.$$("[data-range]");

  if (!form) return;

  let max = 100;
  let secret = 0;
  let lo = 1, hi = 100;
  let attempts = 0;
  let bestChipBound = null;
  const tried = new Set();

  function par() { return Math.ceil(Math.log2(max)); }

  function newGame(m) {
    if (m) max = m;
    secret = FL.secureInt(max) + 1;
    lo = 1; hi = max; attempts = 0;
    tried.clear();
    input.max = String(max);
    input.value = "";
    feedback.textContent = "I'm thinking of a number between 1 and " + max + "…";
    feedback.className = "ng-feedback";
    historyEl.innerHTML = "";
    parChip.textContent = "Par: " + par();
    bestChipBound = FL.scores.bind(bestChip, "number-guess-" + max, {
      label: "Best",
      format: (v) => v + (v === 1 ? " guess" : " guesses"),
      higherBetter: false,
    });
    updateRange();
    updateChips();
  }

  function updateChips() {
    attemptsChip.textContent = attempts === 1 ? "Guess 1" : "Guess " + attempts;
    rangeChips.forEach((c) => c.setAttribute("aria-pressed", String(Number(c.dataset.range) === max)));
  }

  function updateRange() {
    const leftPct = ((lo - 1) / max) * 100;
    const widthPct = ((hi - lo + 1) / max) * 100;
    rangeFill.style.left = leftPct + "%";
    rangeFill.style.width = widthPct + "%";
    loLabel.textContent = String(lo);
    hiLabel.textContent = String(hi);
  }

  function addHistory(value, dir) {
    const chip = document.createElement("span");
    chip.className = "chip " + (dir === "up" ? "up" : dir === "down" ? "down" : "win");
    const num = document.createElement("span");
    num.textContent = String(value);
    const arrow = document.createElement("span");
    arrow.className = "dir";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = dir === "up" ? " ↑" : dir === "down" ? " ↓" : " ✓";
    chip.appendChild(num);
    chip.appendChild(arrow);
    historyEl.appendChild(chip);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = input.value.trim();
    const guess = Number(raw);
    if (!raw || !Number.isInteger(guess) || guess < 1 || guess > max) {
      FL.toast.show("Pick a whole number between 1 and " + max);
      return;
    }
    if (guess < lo || guess > hi) {
      FL.toast.show("You already know it's between " + lo + " and " + hi + " 😉");
      return;
    }
    if (tried.has(guess)) {
      FL.toast.show("You already tried " + guess);
      return;
    }

    attempts++;
    tried.add(guess);

    if (guess === secret) {
      feedback.textContent = correctMessage();
      feedback.className = "ng-feedback win";
      addHistory(guess, "win");
      const res = FL.scores.submit("number-guess-" + max, attempts, false);
      if (res.isBest) FL.scores.announce(bestChip.querySelector ? bestChip : null);
      FL.sfx.play(res.isBest ? "win" : "success");
      FL.haptic([20, 40, 20]);
    } else if (guess < secret) {
      lo = Math.max(lo, guess + 1);
      feedback.textContent = "Higher! It's above " + guess + ".";
      feedback.className = "ng-feedback up";
      addHistory(guess, "up");
      FL.sfx.play("tick");
    } else {
      hi = Math.min(hi, guess - 1);
      feedback.textContent = "Lower! It's below " + guess + ".";
      feedback.className = "ng-feedback down";
      addHistory(guess, "down");
      FL.sfx.play("tick");
    }
    input.value = "";
    input.focus();
    updateRange();
    updateChips();
  });

  function correctMessage() {
    const p = par();
    if (attempts < p) return "Found it in " + attempts + " — better than perfect par (" + p + ")! 🏆";
    if (attempts === p) return "Perfect! " + attempts + " guesses — exactly par. 🎯";
    return "Found it in " + attempts + " guesses (par was " + p + ").";
  }

  rangeChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      newGame(Number(chip.dataset.range));
      FL.sfx.play("click");
    });
  });
  newBtn.addEventListener("click", () => {
    newGame();
    FL.sfx.play("click");
  });

  newGame(100);

  // Public API (used by automated tests).
  FL.register("number-guess", {
    guess: (n) => { input.value = String(n); form.dispatchEvent(new Event("submit", { cancelable: true })); },
    get state() { return { max, secret, lo, hi, attempts }; },
    newGame,
  });
})(window.FunLab);
