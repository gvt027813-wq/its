/* FunLab experiment — Gravity Playground. A touch-friendly 2D physics sandbox.
   Balls collide with walls and each other; sliders tune gravity, bounce, size;
   drag to throw. Fixed-timestep simulation, DPR-aware canvas, pause support. */
(function (FL) {
  "use strict";
  const $ = FL.$;
  const canvas = $("#gp-canvas");
  const frame = $("#gp-frame");
  if (!canvas || !frame) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  const countChip = $("#gp-count");
  const hint = $("#gp-hint");
  const pauseBtn = $("#gp-pause");
  const clearBtn = $("#gp-clear");

  const gravityInput = $("#gp-gravity");
  const bounceInput = $("#gp-bounce");
  const sizeInput = $("#gp-size");

  const MAX_BALLS = 80;
  const GRAVITY_MAX = 1500; // px/s² at 100%
  const PALETTE = ["#7c5cff", "#ff6b6b", "#17b79b", "#f5a70a", "#f45d9d", "#3f9df5", "#8fd14f", "#ff9f43"];
  let paletteIdx = 0;

  const params = { gravity: 100, bounce: 80, size: 18 };
  const balls = [];
  let W = 0, H = 0, dpr = 1;
  let paused = false;
  let grabbed = null; // { ball, dx, dy, samples: [] }
  let lastBounceSfx = 0;
  let lastFullToast = 0;
  let hintFaded = false;

  /* ---------- sizing ---------- */
  function resize() {
    const rect = frame.getBoundingClientRect();
    dpr = FL.dpr();
    W = Math.max(120, rect.width);
    H = Math.max(120, rect.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // keep balls inside after a resize (e.g. rotation)
    for (const b of balls) {
      b.x = FL.clamp(b.x, b.r, W - b.r);
      b.y = FL.clamp(b.y, b.r, H - b.r);
    }
  }

  /* ---------- balls ---------- */
  function nextColor() {
    const c = PALETTE[paletteIdx++ % PALETTE.length];
    return c;
  }

  function spawn(x, y, r, vx, vy) {
    if (balls.length >= MAX_BALLS) {
      const now = performance.now();
      if (now - lastFullToast > 3000) {
        FL.toast.show("The universe is full (" + MAX_BALLS + " balls max)");
        lastFullToast = now;
      }
      return null;
    }
    r = r || params.size;
    const ball = {
      x: FL.clamp(x, r, W - r),
      y: FL.clamp(y, r, H - r),
      vx: vx == null ? FL.rand(-70, 70) : vx,
      vy: vy == null ? FL.rand(-40, 40) : vy,
      r,
      mass: r * r / 100,
      color: nextColor(),
      spin: 0,
      angle: FL.rand(0, Math.PI * 2),
    };
    balls.push(ball);
    updateCount();
    return ball;
  }

  function ballAt(x, y) {
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      const dx = x - b.x, dy = y - b.y;
      if (dx * dx + dy * dy <= (b.r + 8) * (b.r + 8)) return b;
    }
    return null;
  }

  function updateCount() {
    countChip.textContent = balls.length + (balls.length === 1 ? " ball in orbit" : " balls in orbit");
  }

  /* ---------- physics ---------- */
  function step(dt) {
    const g = GRAVITY_MAX * (params.gravity / 100);
    const e = params.bounce / 100;

    for (const b of balls) {
      if (grabbed && b === grabbed.ball) continue;
      b.vy += g * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle += b.spin * dt;

      // walls
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx) * e; wallHit(b); }
      else if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * e; wallHit(b); }
      if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy) * e; wallHit(b); }
      else if (b.y + b.r > H) {
        b.y = H - b.r;
        b.vy = -Math.abs(b.vy) * e;
        // floor friction so stacks settle
        b.vx *= Math.max(0, 1 - 1.6 * dt);
        b.spin *= 0.9;
        if (Math.abs(b.vy) < 26) b.vy = 0;
        wallHit(b);
      }
    }

    // ball ↔ ball (equal-mass-ish elastic impulse with restitution)
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const minDist = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= minDist * minDist || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d, ny = dy / d;
        const overlap = minDist - d;
        const totalM = a.mass + b.mass;
        // positional correction proportional to mass
        a.x -= nx * overlap * (b.mass / totalM);
        a.y -= ny * overlap * (b.mass / totalM);
        b.x += nx * overlap * (a.mass / totalM);
        b.y += ny * overlap * (a.mass / totalM);

        const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
        const velN = rvx * nx + rvy * ny;
        if (velN > 0) continue; // separating
        const impulse = -(1 + e) * velN / (1 / a.mass + 1 / b.mass);
        a.vx -= (impulse / a.mass) * nx;
        a.vy -= (impulse / a.mass) * ny;
        b.vx += (impulse / b.mass) * nx;
        b.vy += (impulse / b.mass) * ny;
        a.spin = FL.clamp(velN * 0.02, -6, 6);
        b.spin = -a.spin;
        const speed = Math.abs(velN);
        if (speed > 130 && !paused) {
          const now = performance.now();
          if (now - lastBounceSfx > 60) { FL.sfx.play("bounce"); lastBounceSfx = now; }
        }
      }
    }
  }

  function wallHit(b) {
    const speed = Math.abs(b.vx) + Math.abs(b.vy);
    if (speed > 240) {
      const now = performance.now();
      if (now - lastBounceSfx > 70) { FL.sfx.play("bounce"); lastBounceSfx = now; }
    }
  }

  let lastT = 0;
  function frameLoop(t) {
    requestAnimationFrame(frameLoop);
    if (paused) { lastT = t; return; }
    let dt = lastT ? (t - lastT) / 1000 : 1 / 60;
    lastT = t;
    if (dt > 1 / 20) dt = 1 / 20; // tab was hidden or a hiccup
    const subSteps = balls.length > 45 ? 2 : 3;
    for (let s = 0; s < subSteps; s++) step(dt / subSteps);
    draw();
  }

  /* ---------- rendering ---------- */
  let themeCache = { bg: "#f4f0e8", date: 0 };
  function bg() {
    const now = performance.now();
    if (now - themeCache.date > 2000) {
      themeCache = { bg: getComputedStyle(frame).backgroundColor || "#f4f0e8", date: now };
    }
    return themeCache.bg;
  }

  function draw() {
    ctx.fillStyle = bg();
    ctx.fillRect(0, 0, W, H);
    for (const b of balls) {
      const grad = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
      grad.addColorStop(0, lighten(b.color));
      grad.addColorStop(1, b.color);
      ctx.beginPath();
      // spin indicator: a small "highlight dot" orbiting inside the ball
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(b.x + Math.cos(b.angle) * b.r * 0.45, b.y + Math.sin(b.angle) * b.r * 0.45, Math.max(1.5, b.r * 0.16), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.fill();
      if (b === (grabbed && grabbed.ball)) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r + 5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(124,92,255,.7)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }
  }

  const lightCache = new Map();
  function lighten(color) {
    let v = lightCache.get(color);
    if (!v) {
      // hex -> softened white-mixed version
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      v = "rgb(" + Math.round(r + (255 - r) * 0.45) + "," + Math.round(g + (255 - g) * 0.45) + "," + Math.round(b + (255 - b) * 0.45) + ")";
      lightCache.set(color, v);
    }
    return v;
  }

  /* ---------- pointer interaction ---------- */
  function localPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (W / rect.width), y: (e.clientY - rect.top) * (H / rect.height) };
  }

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    fadeHint();
    const p = localPoint(e);
    const ball = ballAt(p.x, p.y);
    if (ball) {
      grabbed = { ball, dx: ball.x - p.x, dy: ball.y - p.y, samples: [] };
      ball.vx = 0; ball.vy = 0;
    } else {
      const size = Number(sizeInput.value);
      const r = Math.round(size * FL.rand(0.85, 1.2));
      spawn(p.x, p.y, r);
      FL.sfx.play("pop");
      FL.haptic(8);
    }
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!grabbed) return;
    const p = localPoint(e);
    const b = grabbed.ball;
    b.x = FL.clamp(p.x + grabbed.dx, b.r, W - b.r);
    b.y = FL.clamp(p.y + grabbed.dy, b.r, H - b.r);
    grabbed.samples.push({ x: b.x, y: b.y, t: performance.now() });
    if (grabbed.samples.length > 8) grabbed.samples.shift();
  });

  function release(e) {
    if (!grabbed) return;
    const b = grabbed.ball;
    const s = grabbed.samples;
    let vx = 0, vy = 0;
    if (s.length >= 2) {
      const first = s[0];
      const last = s[s.length - 1];
      const dt = Math.max(16, last.t - first.t) / 1000;
      vx = (last.x - first.x) / dt;
      vy = (last.y - first.y) / dt;
    }
    b.vx = FL.clamp(vx, -2400, 2400);
    b.vy = FL.clamp(vy, -2400, 2400);
    b.spin = FL.clamp(vx * 0.01, -8, 8);
    grabbed = null;
    if (Math.hypot(vx, vy) > 500) FL.sfx.play("whoosh");
  }

  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  function fadeHint() {
    if (hintFaded) return;
    hintFaded = true;
    hint.classList.add("faded");
  }

  /* ---------- controls ---------- */
  function syncSliderFill(input) {
    const min = Number(input.min), max = Number(input.max);
    input.style.setProperty("--fill", ((input.value - min) / (max - min)) * 100 + "%");
  }

  function bindSlider(input, out, apply, format) {
    const update = () => {
      apply(Number(input.value));
      out.textContent = format(Number(input.value));
      syncSliderFill(input);
    };
    input.addEventListener("input", update);
    update();
  }

  bindSlider(gravityInput, $("#gp-gravity-out"), (v) => { params.gravity = v; }, (v) => (v / 100).toFixed(1) + "g");
  bindSlider(bounceInput, $("#gp-bounce-out"), (v) => { params.bounce = v; }, (v) => v + "%");
  bindSlider(sizeInput, $("#gp-size-out"), (v) => { params.size = v; }, (v) => String(v));

  $("#gp-add").addEventListener("click", () => {
    spawn(FL.rand(W * 0.2, W * 0.8), FL.rand(H * 0.15, H * 0.4));
    FL.sfx.play("pop");
    fadeHint();
  });

  $("#gp-add10").addEventListener("click", () => {
    for (let i = 0; i < 10; i++) spawn(FL.rand(W * 0.15, W * 0.85), FL.rand(H * 0.1, H * 0.4));
    FL.sfx.play("pop");
    fadeHint();
  });

  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.setAttribute("aria-pressed", String(paused));
    pauseBtn.setAttribute("aria-label", paused ? "Resume simulation" : "Pause simulation");
    pauseBtn.querySelector(".ic-pause").hidden = paused;
    pauseBtn.querySelector(".ic-play").hidden = !paused;
    FL.sfx.play("click");
  });

  clearBtn.addEventListener("click", () => {
    if (!balls.length) return;
    balls.length = 0;
    updateCount();
    FL.sfx.play("whoosh");
  });

  /* ---------- boot ---------- */
  new ResizeObserver(resize).observe(frame);
  resize();
  for (let i = 0; i < 6; i++) {
    spawn(FL.rand(W * 0.15, W * 0.85), FL.rand(H * 0.1, H * 0.5), Math.round(params.size * FL.rand(0.8, 1.6)));
  }
  requestAnimationFrame(frameLoop);

  // Public API (used by automated tests).
  FL.register("gravity-playground", {
    spawn,
    clear: () => { balls.length = 0; updateCount(); },
    get balls() { return balls; },
    params,
    setPaused(v) { paused = v; },
  });
})(window.FunLab);
