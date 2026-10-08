/* FunLab experiment — Random Planets. Seeded procedural planets: painted on a
   canvas (surface bands, craters, rings, moons, starfield) with matching
   name, climate, terrain, population and civilisation — all from one seed. */
(function (FL) {
  "use strict";
  const $ = FL.$;

  const canvas = $("#planet-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const SIZE = 480;

  const kickerEl = $("#planet-kicker");
  const nameEl = $("#planet-name");
  const descEl = $("#planet-desc");
  const statsEl = $("#planet-stats");
  const newBtn = $("#planet-new");
  const saveBtn = $("#planet-save");
  const copyBtn = $("#planet-copy");
  const shareBtn = $("#planet-share");
  const savedWrap = $("#planet-saved");
  const savedCount = $("#planet-saved-count");

  /* ---------- seeded RNG ---------- */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = {
    f: Math.random,
    range(min, max) { return min + this.f() * (max - min); },
    int(min, max) { return Math.floor(this.range(min, max + 1)); },
    pick(arr) { return arr[Math.floor(this.f() * arr.length)]; },
    chance(p) { return this.f() < p; },
  };

  /* ---------- name & lore pools ---------- */
  const NAME_A = ["Va", "Ze", "Or", "Ky", "Tha", "Nym", "Qu", "Bel", "Xan", "Gro", "Mi", "Sol", "Dra", "Um", "Fe", "Lu", "Ash", "Cor"];
  const NAME_B = ["ra", "lo", "vi", "na", "the", "mo", "ka", "ri", "du", "sha", "ne", "phi", "ve", "ta"];
  const NAME_C = ["ros", "mia", "dus", "tor", "nix", "lya", "rax", "on", "eth", "une", "ios", "ara", "ov", "ir"];

  const TYPES = ["Terrestrial", "Ocean world", "Gas dwarf", "Iron world", "Ice giant", "Lava world", "Desert world", "Jungle world", "Toxic world", "Crystal world"];
  const CLIMATES = ["Acid fog with intermittent glitter", "Perpetual golden sunset", "Liquid helium mornings", "Three seasons: monsoon, monsoon, humidity", "Gentle snow that hums", "Carbon dioxide jacuzzis", "Perfect beach weather, if beaches existed", "Static storms every other Tuesday", "Cotton-candy barometric pressure", "Heat that rearranges priorities"];
  const TERRAINS = ["singularity dunes", "glass oceans over obsidian plains", "candy-striped canyons", "floating archipelagos", "moss-carpeted megaboulders", "singing crystal fields", "endless lavender prairies", "volcanic chessboard mesas", "caves that echo tomorrow", "rivers of slow silver"];
  const CIVS = ["Microbial slime with ambition", "Migratory crystal herds", "A monastic order of weather painters", "Sentient coral bureaucracies", "Interstellar empire (past its prime)", "Ambivalent flock of sky whales", "One extremely old tortoise-like sage", "Swarming clockwork drones, origin unknown", "Bickering bipedal philosophers", "Post-scarcity jellyfish utopia", "No civilisation — just vibes"];
  const ADJ = ["unbothered", "improbable", "suspiciously round", "rumoured", "overcaffeinated", "long-forgotten", "calendar-defying", "mildly haunted", "cartographically controversial", "aggressively scenic"];
  const ODD_FACTS = ["Its moon files quarterly complaints.", "Local gravity briefly reverses when nobody observes it.", "The sunsets are legally protected.", "All compasses point slightly towards dessert.", "Rain falls upward twice a year out of spite.", "Its mountains migrate south for the winter.", "The oceans are carbonated. Lightly.", "Historians insist it was named by accident.", "Two of its moons are on a break.", "Every seventh day is a surprise."];

  function makeName() {
    const n = rng.pick(NAME_A) + (rng.chance(0.6) ? rng.pick(NAME_B) : "") + rng.pick(NAME_C);
    return n;
  }

  function fmtPopulation(civ) {
    if (civ.startsWith("No civilisation") || civ.startsWith("Microbial")) return rng.chance(0.5) ? "Uninhabited" : "A rumour";
    const roll = rng.f();
    if (roll < 0.3) return rng.int(1, 900) * 1000 + " souls";
    if (roll < 0.7) return (rng.range(1, 90)).toFixed(1) + " million";
    return (rng.range(1, 40)).toFixed(1) + " billion";
  }

  /* ---------- planet model ---------- */
  function generate(seed) {
    rng.f = mulberry32(seed);
    const name = makeName();
    const type = rng.pick(TYPES);
    const climate = rng.pick(CLIMATES);
    const terrain = rng.pick(TERRAINS);
    const civ = rng.pick(CIVS);
    const population = fmtPopulation(civ);
    const gravity = rng.range(0.2, 2.6);
    const moons = rng.int(0, 4);
    const temp = rng.int(-220, 460);
    const fact = rng.pick(ODD_FACTS);
    const hue = rng.range(0, 360);
    const desc = "A " + rng.pick(ADJ) + " " + type.toLowerCase() + " of " + terrain + ", catalogued during a routine sweep of the " + (1000 + (seed % 9000)) + " sector. " + fact;
    return {
      seed, name, type, climate, terrain, civ, population, gravity, moons, temp, fact, hue, desc,
      code: "PX-" + (1000 + (seed % 9000)),
    };
  }

  /* ---------- painting ---------- */
  let planet = null;
  let staticLayer = null;
  let moonAngle = 0;
  let rafId = 0;
  let running = true;

  function hsl(h, s, l, a) {
    return "hsla(" + h.toFixed(0) + "," + s.toFixed(0) + "%," + l.toFixed(0) + "%," + (a == null ? 1 : a) + ")";
  }

  function paintStatic(p) {
    staticLayer = document.createElement("canvas");
    staticLayer.width = SIZE;
    staticLayer.height = SIZE;
    const g = staticLayer.getContext("2d");
    const rnd = mulberry32(p.seed ^ 0x9e3779b9);

    // starfield
    g.fillStyle = "#0c0b1c";
    g.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 90; i++) {
      const x = rnd() * SIZE, y = rnd() * SIZE;
      const r = rnd() * 1.6 + 0.3;
      g.globalAlpha = 0.35 + rnd() * 0.6;
      g.fillStyle = rnd() < 0.12 ? "#ffd166" : rnd() < 0.2 ? "#9bd1ff" : "#ffffff";
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;

    const cx = SIZE / 2, cy = SIZE / 2;
    const R = SIZE * 0.31;
    const tilt = (rnd() - 0.5) * 0.7;

    // atmosphere glow
    const glow = g.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.35);
    glow.addColorStop(0, hsl(p.hue, 80, 60, 0.35));
    glow.addColorStop(1, hsl(p.hue, 80, 60, 0));
    g.fillStyle = glow;
    g.fillRect(0, 0, SIZE, SIZE);

    // back ring
    const hasRing = rnd() < 0.42;
    const ringTilt = (rnd() - 0.5) * 0.9;
    const ringHue = (p.hue + 150) % 360;
    if (hasRing) drawRing(g, cx, cy, R, ringTilt, ringHue, true);

    // planet body (clip to circle)
    g.save();
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
    const base = g.createRadialGradient(cx - R * 0.4, cy - R * 0.45, R * 0.15, cx, cy, R * 1.05);
    base.addColorStop(0, hsl(p.hue, 65, 72));
    base.addColorStop(0.55, hsl(p.hue, 60, 48));
    base.addColorStop(1, hsl(p.hue, 65, 24));
    g.fillStyle = base;
    g.fillRect(cx - R, cy - R, R * 2, R * 2);

    // bands
    const bands = 5 + Math.floor(rnd() * 5);
    for (let i = 0; i < bands; i++) {
      const y = cy - R + (i + rnd()) * (2 * R / bands);
      const amp = 3 + rnd() * 9;
      const light = rnd() < 0.5;
      g.beginPath();
      g.moveTo(cx - R, y);
      for (let x = -R; x <= R; x += 12) {
        g.lineTo(cx + x, y + Math.sin((x / R) * (1.5 + rnd() * 2) + i) * amp);
      }
      g.lineTo(cx + R, y + 14 + rnd() * 16);
      for (let x = R; x >= -R; x -= 12) {
        g.lineTo(cx + x, y + 14 + rnd() * 8 + Math.sin((x / R) * 2 + i) * amp);
      }
      g.closePath();
      g.fillStyle = light ? hsl(p.hue, 55, 70, 0.16) : hsl((p.hue + 30) % 360, 60, 28, 0.2);
      g.fill();
    }

    // craters / spots
    const spots = 3 + Math.floor(rnd() * 6);
    for (let i = 0; i < spots; i++) {
      const a = rnd() * Math.PI * 2;
      const d = rnd() * R * 0.8;
      const sx = cx + Math.cos(a) * d;
      const sy = cy + Math.sin(a) * d;
      const sr = 3 + rnd() * (R * 0.14);
      g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2);
      g.fillStyle = hsl(p.hue, 45, 30, 0.3);
      g.fill();
      g.beginPath(); g.arc(sx - sr * 0.25, sy - sr * 0.25, sr * 0.55, 0, Math.PI * 2);
      g.fillStyle = hsl(p.hue, 55, 62, 0.25);
      g.fill();
    }

    // storm swirl
    if (rnd() < 0.45) {
      const sx = cx + (rnd() - 0.5) * R, sy = cy + (rnd() - 0.5) * R * 0.7;
      g.save();
      g.translate(sx, sy);
      g.rotate(rnd() * Math.PI);
      g.beginPath(); g.ellipse(0, 0, R * 0.22, R * 0.1, 0, 0, Math.PI * 2);
      g.fillStyle = hsl((p.hue + 180) % 360, 70, 68, 0.75);
      g.fill();
      g.restore();
    }

    // terminator shadow
    const shade = g.createRadialGradient(cx + R * 0.9, cy + R * 0.55, R * 0.2, cx + R * 0.35, cy + R * 0.15, R * 1.35);
    shade.addColorStop(0, "rgba(5,5,18,.62)");
    shade.addColorStop(0.55, "rgba(5,5,18,.18)");
    shade.addColorStop(1, "rgba(5,5,18,0)");
    g.fillStyle = shade;
    g.fillRect(cx - R, cy - R, R * 2, R * 2);
    g.restore();

    // rim light
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2);
    g.strokeStyle = hsl(p.hue, 85, 75, 0.5);
    g.lineWidth = 1.6;
    g.stroke();

    // front ring
    if (hasRing) drawRing(g, cx, cy, R, ringTilt, ringHue, false);
  }

  function drawRing(g, cx, cy, R, tilt, hue, back) {
    g.save();
    g.translate(cx, cy);
    g.rotate(tilt);
    g.beginPath();
    // back half = upper arcs (angles PI..2PI), front half = lower arcs (0..PI)
    g.ellipse(0, 0, R * 1.65, R * 0.5, 0, back ? Math.PI : 0, back ? Math.PI * 2 : Math.PI);
    g.strokeStyle = hsl(hue, 70, 62, 0.85);
    g.lineWidth = R * 0.13;
    g.stroke();
    g.beginPath();
    g.ellipse(0, 0, R * 1.9, R * 0.58, 0, back ? Math.PI : 0, back ? Math.PI * 2 : Math.PI);
    g.strokeStyle = hsl((hue + 40) % 360, 65, 70, 0.5);
    g.lineWidth = R * 0.05;
    g.stroke();
    g.restore();
  }

  function composite() {
    ctx.clearRect(0, 0, SIZE, SIZE);
    if (staticLayer) ctx.drawImage(staticLayer, 0, 0);
    if (planet && planet.moons) {
      for (let i = 0; i < planet.moons; i++) {
        const a = moonAngle * (1 + i * 0.35) + i * 2.2;
        const rx = SIZE * (0.44 + i * 0.035);
        const ry = rx * 0.38;
        const mx = SIZE / 2 + Math.cos(a) * rx;
        const my = SIZE / 2 + Math.sin(a) * ry * 0.9 - SIZE * 0.02;
        const mr = SIZE * (0.018 + (i % 3) * 0.008);
        const mg = ctx.createRadialGradient(mx - mr * 0.4, my - mr * 0.4, mr * 0.2, mx, my, mr);
        mg.addColorStop(0, "#e8e6f2");
        mg.addColorStop(1, "#6d6a85");
        ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2);
        ctx.fillStyle = mg;
        ctx.fill();
        void speed;
      }
    }
  }

  function animate(t) {
    if (!running) return;
    if (!FL.reducedMotion()) {
      moonAngle = t * 0.00022;
      composite();
    }
    rafId = requestAnimationFrame(animate);
  }

  /* ---------- info panel ---------- */
  function render(p) {
    kickerEl.textContent = p.code + " · " + p.type + " · " + p.temp + "°C mean";
    nameEl.textContent = p.name;
    descEl.textContent = p.desc;
    const rows = [
      ["Climate", p.climate],
      ["Terrain", p.terrain],
      ["Population", p.population],
      ["Civilisation", p.civ],
      ["Gravity", p.gravity.toFixed(1) + "g"],
      ["Moons", String(p.moons)],
    ];
    statsEl.innerHTML = rows
      .map(([k, v]) => "<div><dt>" + FL.escapeHTML(k) + "</dt><dd>" + FL.escapeHTML(v) + "</dd></div>")
      .join("");
    const saved = FL.store.get("planet-saved", []);
    const isSaved = saved.some((s) => s.seed === p.seed);
    saveBtn.setAttribute("aria-pressed", String(isSaved));
    saveBtn.querySelector(".ic-star").hidden = isSaved;
    saveBtn.querySelector(".ic-star-filled").hidden = !isSaved;
  }

  function show(seed) {
    planet = generate(seed);
    paintStatic(planet);
    if (FL.reducedMotion()) composite();
    render(planet);
    FL.sfx.play("whoosh");
  }

  function freshSeed() {
    const buf = new Uint32Array(1);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(buf);
    else buf[0] = Math.floor(Math.random() * 0xffffffff);
    return buf[0];
  }

  /* ---------- collection ---------- */
  function renderSaved() {
    const saved = FL.store.get("planet-saved", []);
    savedCount.textContent = String(saved.length);
    savedWrap.innerHTML = "";
    saved.forEach((s) => {
      const chip = document.createElement("span");
      chip.className = "chip planet-saved-chip";
      const dot = document.createElement("span");
      dot.style.cssText = "width:10px;height:10px;border-radius:50%;background:" + hsl(s.hue, 60, 50) + ";flex:none;";
      chip.appendChild(dot);
      const label = document.createElement("span");
      label.textContent = s.name;
      chip.appendChild(label);
      const load = document.createElement("button");
      load.type = "button";
      load.className = "chip-x";
      load.setAttribute("aria-label", "View " + s.name);
      load.innerHTML = "&#8594;";
      load.addEventListener("click", () => show(s.seed));
      chip.appendChild(load);
      const del = document.createElement("button");
      del.type = "button";
      del.className = "chip-x";
      del.setAttribute("aria-label", "Remove " + s.name + " from collection");
      del.innerHTML = "&times;";
      del.addEventListener("click", () => {
        FL.store.set("planet-saved", saved.filter((x) => x.seed !== s.seed));
        renderSaved();
        if (planet && planet.seed === s.seed) render(planet);
        FL.sfx.play("tick");
      });
      chip.appendChild(del);
      savedWrap.appendChild(chip);
    });
  }

  saveBtn.addEventListener("click", () => {
    if (!planet) return;
    const saved = FL.store.get("planet-saved", []);
    const idx = saved.findIndex((s) => s.seed === planet.seed);
    if (idx >= 0) {
      saved.splice(idx, 1);
      FL.toast.show("Removed " + planet.name + " from your collection");
    } else {
      saved.unshift({ seed: planet.seed, name: planet.name, type: planet.type, hue: planet.hue });
      FL.toast.success(planet.name + " saved to your collection");
      FL.sfx.play("success");
    }
    FL.store.set("planet-saved", saved.slice(0, 24));
    renderSaved();
    render(planet);
  });

  copyBtn.addEventListener("click", async () => {
    if (!planet) return;
    const text = planetSummary(planet);
    try {
      await navigator.clipboard.writeText(text);
      FL.toast.success("Planet dossier copied");
    } catch (_) {
      FL.toast.show("Copy failed — the browser said no");
    }
  });

  shareBtn.addEventListener("click", async () => {
    if (!planet) return;
    const text = planetSummary(planet);
    if (navigator.share) {
      try { await navigator.share({ title: "FunLab planet: " + planet.name, text }); }
      catch (_) { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        FL.toast.success("Sharing not supported — dossier copied instead");
      } catch (_) {
        FL.toast.show("Sharing is not available in this browser");
      }
    }
  });

  function planetSummary(p) {
    return p.name + " (" + p.code + ")\n" + p.type + " · " + p.climate +
      "\nTerrain: " + p.terrain + "\nPopulation: " + p.population +
      "\nCivilisation: " + p.civ + "\nGravity: " + p.gravity.toFixed(1) + "g · Moons: " + p.moons +
      "\n" + p.fact + "\n— painted by FunLab Random Planets";
  }

  newBtn.addEventListener("click", () => show(freshSeed()));

  /* ---------- boot ---------- */
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) rafId = requestAnimationFrame(animate);
    else cancelAnimationFrame(rafId);
  });

  show(freshSeed());
  renderSaved();
  rafId = requestAnimationFrame(animate);

  // Public API (used by automated tests).
  FL.register("random-planets", {
    show,
    generate,
    freshSeed,
    get planet() { return planet; },
  });
})(window.FunLab);
