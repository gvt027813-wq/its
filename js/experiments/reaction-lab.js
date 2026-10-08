/* FunLab experiment — Reaction Lab. Random green-light reflex test, 5 rounds. */
(function (FL) {
  "use strict";
  const $ = FL.$;
  const ROUNDS = 5;

  const stage = $("#reaction-stage");
  const big = $("#reaction-big");
  const sub = $("#reaction-sub");
  const roundsList = $("#reaction-rounds");
  const summary = $("#reaction-summary");
  const avgOut = $("#rl-avg");
  const fastestOut = $("#rl-fastest");
  const verdictOut = $("#rl-verdict");
  const againBtn = $("#rl-again");
  const bestChip = $("#rl-best");
  const bestAvgChip = $("#rl-best-avg");
  const lastChip = $("#rl-last");

  if (!stage) return;

  let state = "idle"; // idle | wait | go | result | early
  let round = 0;
  let times = [];
  let goTime = 0;
  let waitTimer = 0;

  const bestChipBound = FL.scores.bind(bestChip, "reaction-best", {
    label: "Best reaction",
    format: (v) => Math.round(v) + " ms",
    higherBetter: false,
  });
  const bestAvgChipBound = FL.scores.bind(bestAvgChip, "reaction-best-avg", {
    label: "Best average",
    format: (v) => Math.round(v) + " ms",
    higherBetter: false,
  });

  function renderRounds() {
    roundsList.innerHTML = "";
    for (let i = 0; i < ROUNDS; i++) {
      const li = document.createElement("li");
      if (i < times.length) {
        li.textContent = Math.round(times[i]) + " ms";
        li.className = "is-done";
        if (times[i] === Math.min(...times)) li.classList.add("is-fast");
      } else if (i === round && (state === "wait" || state === "go")) {
        li.textContent = "·";
        li.className = "is-active";
      } else {
        li.textContent = i + 1;
      }
      roundsList.appendChild(li);
    }
  }

  function setState(s, bigText, subText) {
    state = s;
    stage.className = "reaction-stage state-" + s;
    big.textContent = bigText;
    sub.textContent = subText;
  }

  function arm() {
    clearTimeout(waitTimer);
    renderRounds();
    setState("wait", "Wait for green…", "Round " + (round + 1) + " of " + ROUNDS + " — patience");
    const delay = 1200 + Math.random() * 2800;
    waitTimer = setTimeout(() => {
      goTime = performance.now();
      setState("go", "TAP!", "Now!");
      FL.sfx.play("tick");
    }, delay);
  }

  function tooEarly() {
    clearTimeout(waitTimer);
    FL.sfx.play("error");
    FL.haptic(40);
    setState("early", "Too soon! 😅", "Tap to retry this round");
  }

  function record() {
    const ms = performance.now() - goTime;
    times.push(ms);
    round++;
    FL.sfx.play("success");
    FL.haptic(12);

    if (round >= ROUNDS) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const fastest = Math.min(...times);
      const bestSingle = FL.scores.submit("reaction-best", fastest, false);
      const bestAvgRes = FL.scores.submit("reaction-best-avg", avg, false);

      lastChip.textContent = "Last: " + Math.round(avg) + " ms avg";
      if (bestAvgRes.isBest) FL.scores.announce(bestAvgChipBound);
      if (bestSingle.isBest) FL.scores.announce(bestChipBound);

      avgOut.textContent = String(Math.round(avg));
      fastestOut.textContent = String(Math.round(fastest));
      verdictOut.textContent = verdict(avg, bestAvgRes.isBest);
      renderRounds();

      setTimeout(() => {
        stage.hidden = true;
        roundsList.hidden = true;
        summary.hidden = false;
        if (bestSingle.isBest || bestAvgRes.isBest) FL.sfx.play("win");
      }, 650);
      setState("result", Math.round(ms) + " ms", "Lab run complete");
      return;
    }
    setState("result", Math.round(ms) + " ms", "Tap for round " + (round + 1));
  }

  function verdict(avg, isBest) {
    if (isBest) return "New best average! Your neurons have been working out. 🧠";
    if (avg < 210) return "Certified menace. Fighter pilots envy you.";
    if (avg < 260) return "Sharp! Well above the human average.";
    if (avg < 320) return "Solid reflexes — right around typical human territory.";
    if (avg < 420) return "Not bad. More sleep, less blinking.";
    return "The lab suspects you were making tea mid-round.";
  }

  function activate() {
    switch (state) {
      case "idle": case "early":
        arm();
        break;
      case "wait":
        tooEarly();
        break;
      case "go":
        record();
        break;
      case "result":
        if (round >= ROUNDS) return; // waiting for summary
        arm();
        break;
    }
  }

  stage.addEventListener("pointerdown", (e) => { e.preventDefault(); activate(); });
  stage.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); activate(); }
  });

  function reset() {
    clearTimeout(waitTimer);
    round = 0;
    times = [];
    state = "idle";
    summary.hidden = true;
    stage.hidden = false;
    roundsList.hidden = false;
    renderRounds();
    setState("idle", "Tap to start", "Round 1 of " + ROUNDS + " — wait for green, then tap fast");
  }

  againBtn.addEventListener("click", reset);
  renderRounds();

  // Public API (used by automated tests).
  FL.register("reaction-lab", {
    activate,
    reset,
    get state() { return state; },
    get times() { return times.slice(); },
    forceGo() { clearTimeout(waitTimer); goTime = performance.now(); setState("go", "TAP!", "Now!"); state = "go"; },
  });
})(window.FunLab);
