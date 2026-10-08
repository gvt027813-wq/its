/* FunLab experiment — Color Master. Spot the exact colour match among decoys.
   Distances are computed in CIE-Lab so "closest" is perceptually honest. */
(function (FL) {
  "use strict";
  const $ = FL.$;
  const ROUNDS = 10;

  const startScreen = $("#cm-start");
  const gameScreen = $("#cm-game");
  const endScreen = $("#cm-end");
  const targetEl = $("#cm-target");
  const optionsEl = $("#cm-options");
  const feedbackEl = $("#cm-feedback");
  const roundChip = $("#cm-round");
  const scoreChip = $("#cm-score");
  const streakChip = $("#cm-streak");
  const bestChip = $("#cm-best");
  const finalOut = $("#cm-final");
  const accuracyOut = $("#cm-accuracy");
  const verdictOut = $("#cm-verdict");

  if (!targetEl) return;

  const DIFFS = {
    easy:   { n: 6,  delta: 15,  points: 10, pairMin: 4 },
    medium: { n: 9,  delta: 7.5, points: 15, pairMin: 3 },
    hard:   { n: 12, delta: 3.4, points: 25, pairMin: 2.2 },
  };

  let diff = "easy";
  let round = 0;
  let score = 0;
  let streak = 0;
  let perfect = 0;
  let correctIndex = -1;
  let locked = false;
  let nextTimer = 0;

  /* ---------- colour helpers (RGB <-> Lab, Delta-E 76) ---------- */
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }
  function rgbToLab(r, g, b) {
    const lin = (v) => {
      v /= 255;
      return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
    };
    const R = lin(r), G = lin(g), B = lin(b);
    let x = R * 0.4124 + G * 0.3576 + B * 0.1805;
    const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
    let z = R * 0.0193 + G * 0.1192 + B * 0.9505;
    x /= 0.95047;
    z /= 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const fx = f(x), fy = f(y), fz = f(z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  function deltaE(c1, c2) {
    const a = rgbToLab(c1[0], c1[1], c1[2]);
    const b = rgbToLab(c2[0], c2[1], c2[2]);
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  }
  const css = (rgb) => "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";

  /* ---------- game flow ---------- */
  function startGame(d) {
    clearTimeout(nextTimer);
    diff = d;
    round = 0; score = 0; streak = 0; perfect = 0;
    startScreen.hidden = true;
    endScreen.hidden = true;
    gameScreen.hidden = false;
    updateBestChip();
    updateChips();
    nextRound();
  }

  function updateBestChip() {
    const best = FL.scores.best("color-master-" + diff);
    bestChip.textContent = "Best (" + diff + "): " + (best == null ? "—" : best);
  }

  function updateChips() {
    roundChip.textContent = "Round " + Math.min(round + (gameScreen.hidden ? 0 : 1), ROUNDS) + "/" + ROUNDS;
    scoreChip.textContent = "Score " + score;
    streakChip.textContent = "Streak " + streak;
  }

  function makeRound() {
    const cfg = DIFFS[diff];
    const h = FL.rand(0, 360), s = FL.rand(48, 88), l = FL.rand(42, 62);
    const target = hslToRgb(h, s, l);
    const options = [target];

    let guard = 0;
    while (options.length < cfg.n && guard++ < 900) {
      const dh = FL.rand(-1, 1) * cfg.delta * FL.rand(0.5, 1.8);
      const dl = FL.rand(-1, 1) * cfg.delta * FL.rand(0.4, 1.6);
      const ds = FL.rand(-1, 1) * cfg.delta * FL.rand(0.3, 1.3);
      const cand = hslToRgb((h + dh + 360) % 360, FL.clamp(s + ds, 28, 96), FL.clamp(l + dl, 24, 76));
      if (deltaE(cand, target) < cfg.delta * 0.55) continue; // too close to the answer
      if (options.some((o) => deltaE(cand, o) < cfg.pairMin)) continue; // decoys must differ
      options.push(cand);
    }
    return { target, options };
  }

  function nextRound() {
    clearTimeout(nextTimer);
    locked = false;
    round++;
    updateChips();

    const { target, options } = makeRound();
    correctIndex = FL.secureInt(options.length);

    targetEl.style.background = css(target);
    optionsEl.dataset.count = String(options.length);
    optionsEl.innerHTML = "";
    feedbackEl.textContent = "";
    feedbackEl.className = "cm-feedback";

    options.forEach((rgb, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cm-opt";
      b.style.background = css(rgb);
      b.setAttribute("aria-label", "Colour option " + (i + 1));
      b.addEventListener("click", () => pick(i, b));
      optionsEl.appendChild(b);
    });
  }

  function pick(i, btnEl) {
    if (locked) return;
    locked = true;
    const buttons = Array.from(optionsEl.children);
    const cfg = DIFFS[diff];

    if (i === correctIndex) {
      streak++;
      perfect++;
      const gained = cfg.points * Math.min(streak, 5);
      score += gained;
      btnEl.classList.add("is-right");
      feedbackEl.textContent = "Perfect match! +" + gained + (streak > 1 ? " (×" + Math.min(streak, 5) + " streak)" : "");
      feedbackEl.classList.add("good");
      FL.sfx.play("success");
      FL.haptic(12);
    } else {
      streak = 0;
      btnEl.classList.add("is-wrong");
      buttons[correctIndex].classList.add("is-reveal");
      feedbackEl.textContent = "The glowing outline was the true match.";
      feedbackEl.classList.add("bad");
      FL.sfx.play("error");
      FL.haptic(40);
    }

    buttons.forEach((b) => { if (b !== btnEl) b.classList.add("is-wrong"); });
    updateChips();

    nextTimer = setTimeout(() => {
      if (round >= ROUNDS) endGame();
      else nextRound();
    }, 1350);
  }

  function endGame() {
    gameScreen.hidden = true;
    endScreen.hidden = false;
    const res = FL.scores.submit("color-master-" + diff, score, true);
    finalOut.textContent = String(score);
    accuracyOut.textContent = Math.round((perfect / ROUNDS) * 100) + "%";
    verdictOut.textContent = verdict(score, res.isBest);
    updateBestChip();
    FL.sfx.play(res.isBest ? "win" : "pop");
  }

  function verdict(scoreVal, isBest) {
    const maxRounds = ROUNDS;
    if (isBest) return "New best for " + diff + "! The colour wheel fears you. 🎨";
    const per = scoreVal / maxRounds;
    if (per >= 50) return "Eagle-eyed. The lab should hire you for paint QC.";
    if (per >= 30) return "Strong eyes — a few impostors slipped through though.";
    if (per >= 15) return "Respectable. The decoys put up a fight.";
    return "The decoys won this time. Revenge is a tap away.";
  }

  // Difficulty buttons + replay buttons
  FL.$$("[data-diff]").forEach((b) => b.addEventListener("click", () => {
    FL.sfx.play("click");
    startGame(b.dataset.diff);
  }));
  $("#cm-again").addEventListener("click", () => startGame(diff));
  $("#cm-menu").addEventListener("click", () => {
    endScreen.hidden = true;
    startScreen.hidden = false;
  });

  // Public API (used by automated tests).
  FL.register("color-master", {
    startGame,
    get state() { return { diff, round, score, streak, correctIndex }; },
    pick: (i) => { const b = optionsEl.children[i]; if (b) pick(i, b); },
  });
})(window.FunLab);
