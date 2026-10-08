/* FunLab experiment — Decision Machine. Dramatic random picker with a spinning
   drum, drum-roll sound and confetti. Options and history persist locally. */
(function (FL) {
  "use strict";
  const $ = FL.$;

  const form = $("#dm-form");
  const input = $("#dm-input");
  const hint = $("#dm-hint");
  const chipsEl = $("#dm-chips");
  const sampleBtn = $("#dm-sample");
  const clearBtn = $("#dm-clear");
  const drum = $("#dm-drum");
  const slot = $("#dm-slot");
  const spinBtn = $("#dm-spin");
  const resultPanel = $("#dm-result");
  const verdictEl = $("#dm-verdict");
  const againBtn = $("#dm-again");
  const removeBtn = $("#dm-remove");
  const copyBtn = $("#dm-copy");
  const historyWrap = $("#dm-history-wrap");
  const historyEl = $("#dm-history");
  const confettiCanvas = $("#dm-confetti");

  if (!form) return;

  const MAX_OPTIONS = 12;
  const SAMPLES = [
    ["Order pizza", "Order pasta", "Order sushi", "Order salad", "Order tacos", "Order ramen"],
    ["Take a nap", "Go for a walk", "Start that project", "Watch one episode", "Call a friend", "Reorganise the fridge"],
    ["Yes", "No", "Absolutely", "Definitely not", "Ask again later", "Flip a coin"],
  ];

  let options = FL.store.get("decision-options", []);
  let history = FL.store.get("decision-history", []);
  let spinning = false;
  let winner = null;
  let timers = [];

  /* ---------- options UI ---------- */
  function persist() {
    FL.store.set("decision-options", options);
  }

  function render() {
    chipsEl.innerHTML = "";
    options.forEach((text) => {
      const chip = document.createElement("span");
      chip.className = "chip is-new";
      const label = document.createElement("span");
      label.textContent = text;
      chip.appendChild(label);
      const x = document.createElement("button");
      x.type = "button";
      x.className = "chip-x";
      x.setAttribute("aria-label", "Remove " + text);
      x.innerHTML = "&times;";
      x.addEventListener("click", () => {
        options = options.filter((o) => o !== text);
        persist();
        render();
        FL.sfx.play("tick");
      });
      chip.appendChild(x);
      chipsEl.appendChild(chip);
    });
    hint.textContent = options.length === 0
      ? "Add at least two options to arm the machine."
      : options.length === 1
        ? "One more option and the machine can judge."
        : options.length + " options loaded — the machine is armed.";
    spinBtn.disabled = options.length < 2 || spinning;
    document.querySelectorAll("#dm-chips .chip").forEach((c, i) => {
      if (i < options.length - 1) c.classList.remove("is-new");
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    // Strip angle brackets so user text can never sneak into markup or attributes.
    const text = input.value.trim().replace(/[<>]/g, "").replace(/\s+/g, " ").slice(0, 60);
    if (!text) return;
    if (options.some((o) => o.toLowerCase() === text.toLowerCase())) {
      FL.toast.show("That option is already loaded");
      return;
    }
    if (options.length >= MAX_OPTIONS) {
      FL.toast.show("The drum fits " + MAX_OPTIONS + " options max");
      return;
    }
    options.push(text);
    persist();
    render();
    FL.sfx.play("pop");
    FL.haptic(8);
    input.value = "";
    input.focus();
  });

  sampleBtn.addEventListener("click", () => {
    if (options.length) {
      // Replacing an existing list deserves a quick confirmation.
      FL.modal.confirm({
        title: "Load sample options?",
        message: "This replaces your current " + options.length + " options with a silly starter set.",
        confirmLabel: "Replace them",
      }).then((yes) => { if (yes) loadSample(); });
    } else {
      loadSample();
    }
  });

  function loadSample() {
    options = FL.pick(SAMPLES).slice();
    persist();
    render();
    FL.sfx.play("pop");
  }

  clearBtn.addEventListener("click", () => {
    if (!options.length) return;
    options = [];
    winner = null;
    resultPanel.hidden = true;
    persist();
    render();
    FL.sfx.play("tick");
  });

  /* ---------- the dramatic part ---------- */
  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function spin() {
    if (spinning || options.length < 2) {
      FL.toast.show("Load at least two options first");
      return;
    }
    spinning = true;
    winner = null;
    resultPanel.hidden = true;
    spinBtn.disabled = true;
    drum.classList.add("is-spinning");
    drum.classList.remove("is-winner");
    slot.classList.remove("is-winner");
    FL.sfx.play("drum", 16);
    FL.haptic(15);

    const winnerIdx = FL.secureInt(options.length);
    let tick = 0;
    let delay = 55;

    const tickOnce = () => {
      slot.textContent = options[tick % options.length];
      FL.haptic(4);
      const speedup = tick < 8 ? 1.12 : tick < 16 ? 1.18 : 1.32;
      delay *= speedup;
      tick++;
      if (delay < 320) {
        timers.push(setTimeout(tickOnce, delay));
      } else {
        // land on the winner
        finish(options[winnerIdx]);
      }
    };
    timers.push(setTimeout(tickOnce, delay));
  }

  function finish(chosen) {
    clearTimers();
    slot.textContent = chosen;
    winner = chosen;
    spinning = false;
    drum.classList.remove("is-spinning");
    drum.classList.add("is-winner");
    slot.classList.add("is-winner");
    spinBtn.disabled = options.length < 2;

    verdictEl.textContent = chosen;
    resultPanel.hidden = false;
    addHistory(chosen);

    const reduce = FL.reducedMotion() || FL.lowPower;
    burstConfetti(reduce ? 24 : 90);
    FL.sfx.play("win");
    FL.haptic([30, 60, 30, 60, 90]);
  }

  againBtn.addEventListener("click", spin);
  spinBtn.addEventListener("click", spin);

  removeBtn.addEventListener("click", () => {
    if (!winner) return;
    options = options.filter((o) => o !== winner);
    winner = null;
    resultPanel.hidden = true;
    persist();
    render();
    FL.sfx.play("tick");
    if (options.length >= 2) spin();
  });

  copyBtn.addEventListener("click", async () => {
    if (!winner) return;
    const text = "The FunLab Decision Machine says: " + winner;
    try {
      await navigator.clipboard.writeText(text);
      FL.toast.success("Result copied");
    } catch (_) {
      FL.toast.show("Copy failed — the browser said no");
    }
  });

  function addHistory(text) {
    history.unshift({ text, at: Date.now() });
    history = history.slice(0, 6);
    FL.store.set("decision-history", history);
    renderHistory();
  }

  function renderHistory() {
    historyWrap.hidden = history.length === 0;
    historyEl.innerHTML = "";
    history.forEach((h) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = h.text;
      historyEl.appendChild(chip);
    });
  }

  /* ---------- confetti (canvas, self-cleaning) ---------- */
  function burstConfetti(count) {
    if (!confettiCanvas || FL.reducedMotion()) return;
    const c = confettiCanvas;
    const ctx = c.getContext("2d");
    const dpr = FL.dpr();
    c.width = window.innerWidth * dpr;
    c.height = window.innerHeight * dpr;
    const colors = ["#7c5cff", "#ff6b6b", "#17b79b", "#f5a70a", "#f45d9d", "#3f9df5"];
    const parts = Array.from({ length: count }, () => ({
      x: window.innerWidth / 2 + FL.rand(-60, 60),
      y: window.innerHeight * 0.42,
      vx: FL.rand(-360, 360),
      vy: FL.rand(-560, -160),
      w: FL.rand(6, 12),
      h: FL.rand(4, 8),
      rot: FL.rand(0, Math.PI * 2),
      vr: FL.rand(-8, 8),
      color: FL.pick(colors),
    }));
    const start = performance.now();
    const DURATION = 2000;

    function frame(t) {
      const dt = 1 / 60;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const alive = t - start < DURATION;
      for (const p of parts) {
        p.vy += 900 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.y < window.innerHeight + 20) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }
      if (alive) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
    requestAnimationFrame(frame);
  }

  render();
  renderHistory();
  slot.textContent = options.length ? "Ready when you are" : "Ready?";

  // Public API (used by automated tests).
  FL.register("decision-machine", {
    add: (text) => { options.push(text); persist(); render(); },
    setOptions: (list) => { options = list.slice(); persist(); render(); },
    spin,
    get options() { return options.slice(); },
    get winner() { return winner; },
  });
})(window.FunLab);
