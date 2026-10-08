/* FunLab experiment — Click Rush. Tap fast for 10 seconds; measure CPS. */
(function (FL) {
  "use strict";
  const $ = FL.$;
  const DURATION = 10; // seconds
  const RING_LEN = 2 * Math.PI * 88;

  const btn = $("#rush-btn");
  const num = $("#rush-num");
  const sub = $("#rush-sub");
  const ring = $("#rush-ring");
  const resultPanel = $("#rush-result");
  const stage = $("#rush-stage");
  const clicksOut = $("#rush-clicks");
  const cpsOut = $("#rush-cps");
  const verdictOut = $("#rush-verdict");
  const againBtn = $("#rush-again");
  const bestChip = $("#rush-best");
  const lastChip = $("#rush-last");
  const totalChip = $("#rush-total");
  const historyWrap = $("#rush-history");
  const bars = $("#rush-bars");

  if (!btn) return;

  let running = false;
  let clicks = 0;
  let startT = 0;
  let rafId = 0;
  let endTimer = 0;

  const bestChipBound = FL.scores.bind(bestChip, "click-rush-cps", {
    label: "Best CPS",
    format: (v) => v.toFixed(1),
  });

  function renderMeta() {
    const last = FL.store.get("click-rush-last", null);
    lastChip.textContent = "Last run: " + (last ? last.clicks + " (" + last.cps.toFixed(1) + " CPS)" : "—");
    const taps = FL.store.get("click-rush-taps", 0);
    totalChip.textContent = "Lifetime taps: " + taps.toLocaleString();
    renderHistory();
  }

  function renderHistory() {
    const history = FL.store.get("click-rush-history", []);
    historyWrap.hidden = history.length === 0;
    if (!history.length) { bars.innerHTML = ""; return; }
    const max = Math.max(...history);
    bars.innerHTML = history
      .map((cps) => {
        const h = Math.max(14, Math.round((cps / max) * 100));
        const isBest = cps === Math.max(...history) ? " is-best" : "";
        return '<span style="height:' + h + '%"' + isBest + ' title="' + cps.toFixed(1) + ' CPS"></span>';
      })
      .join("");
  }

  function start() {
    if (running) return;
    running = true;
    clicks = 0;
    startT = performance.now();
    resultPanel.hidden = true;
    stage.hidden = false;
    btn.classList.add("is-running");
    btn.classList.remove("is-done");
    sub.textContent = "GO!";
    ring.style.strokeDashoffset = "0";
    num.textContent = DURATION.toFixed(1);
    FL.sfx.play("whoosh");
    FL.haptic(12);
    rafId = requestAnimationFrame(loop);
  }

  function loop() {
    if (!running) return;
    const elapsed = (performance.now() - startT) / 1000;
    const remain = Math.max(0, DURATION - elapsed);
    num.textContent = remain.toFixed(1);
    sub.textContent = clicks + (clicks === 1 ? " tap" : " taps");
    ring.style.strokeDashoffset = String(RING_LEN * Math.min(1, elapsed / DURATION));
    if (elapsed >= DURATION) { finish(); return; }
    rafId = requestAnimationFrame(loop);
  }

  function finish() {
    running = false;
    cancelAnimationFrame(rafId);
    btn.classList.remove("is-running");
    btn.classList.add("is-done");
    num.textContent = "0.0";
    sub.textContent = "time!";
    FL.haptic([30, 40, 30]);

    const cps = clicks / DURATION;
    const res = FL.scores.submit("click-rush-cps", cps, true);

    clicksOut.textContent = String(clicks);
    cpsOut.textContent = cps.toFixed(1);
    verdictOut.textContent = verdict(cps, res.isBest);
    FL.sfx.play(res.isBest ? "win" : "success");

    FL.store.set("click-rush-last", { clicks, cps });
    FL.store.set("click-rush-taps", (FL.store.get("click-rush-taps", 0) || 0) + clicks);
    const history = FL.store.get("click-rush-history", []);
    history.push(Number(cps.toFixed(2)));
    while (history.length > 10) history.shift();
    FL.store.set("click-rush-history", history);

    if (res.isBest) FL.scores.announce(bestChipBound);
    else bestChipBound._renderBest();
    renderMeta();

    clearTimeout(endTimer);
    endTimer = setTimeout(() => { stage.hidden = true; resultPanel.hidden = false; }, 700);
  }

  function verdict(cps, isBest) {
    if (isBest) return "New personal best — the lab bows to your finger. 👑";
    if (cps < 3) return "A serene, meditative tapping experience.";
    if (cps < 5) return "Respectable! With practice, that button should fear you.";
    if (cps < 7) return "Serious clicking. Warm up those tendons next time.";
    if (cps < 9) return "Inhuman rhythm. Are you okay?";
    return "Certified click gremlin. Please see the front desk.";
  }

  function onTap(e) {
    if (e) e.preventDefault();
    if (!running) { start(); clicks = 1; FL.sfx.play("tap"); return; }
    clicks++;
    FL.sfx.play("tap");
    if (clicks % 10 === 0) FL.haptic(6);
  }

  btn.addEventListener("pointerdown", onTap);
  // Keyboard support (space/enter) without double-counting pointer events.
  btn.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); onTap(null); }
  });
  btn.addEventListener("contextmenu", (e) => e.preventDefault());
  btn.addEventListener("dragstart", (e) => e.preventDefault());

  againBtn.addEventListener("click", () => {
    resultPanel.hidden = true;
    stage.hidden = false;
    btn.classList.remove("is-done");
    num.textContent = DURATION.toFixed(1);
    sub.textContent = "tap to start";
    ring.style.strokeDashoffset = "0";
  });

  renderMeta();

  // Public API (used by automated tests).
  FL.register("click-rush", {
    start,
    finish,
    get clicks() { return clicks; },
    get running() { return running; },
  });
})(window.FunLab);
