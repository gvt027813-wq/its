/* FunLab experiment — Password Lab. Educational password-strength analysis.
   Runs 100% locally: nothing is stored, logged or sent anywhere. */
(function (FL) {
  "use strict";
  const $ = FL.$;

  const input = $("#pw-input");
  const peekBtn = $("#pw-peek");
  const bar = $("#pw-bar");
  const fill = $("#pw-meter-fill");
  const verdictEl = $("#pw-verdict");
  const factorsEl = $("#pw-factors");
  const lengthOut = $("#pw-length");
  const entropyOut = $("#pw-entropy");
  const poolOut = $("#pw-pool");
  const crackList = $("#pw-crack-list");
  const crackNote = $("#pw-crack-note");
  const generateBtn = $("#pw-generate");

  if (!input) return;

  /* A tiny local blocklist of famously weak choices + substrings. */
  const COMMON = new Set([
    "password", "password1", "password123", "123456", "1234567", "12345678", "123456789",
    "1234567890", "111111", "000000", "121212", "123123", "654321", "696969",
    "qwerty", "qwerty123", "qwertyuiop", "azerty", "qazwsx", "asdfgh", "zxcvbn", "asdf",
    "abc123", "abc123456", "letmein", "welcome", "welcome1", "admin", "admin123", "root",
    "iloveyou", "monkey", "dragon", "football", "baseball", "basketball", "soccer",
    "shadow", "master", "superman", "batman", "spiderman", "trustno1", "sunshine",
    "princess", "hello", "freedom", "whatever", "secret", "starwars", "pokemon",
    "minecraft", "fortnite", "netflix", "spotify", "google", "samsung", "apple",
    "login", "passw0rd", "p@ssword", "passwort", "guest", "test", "test123", "wifi",
  ]);
  const SUBSTRINGS = ["password", "passwd", "passwort", "qwerty", "qwertz", "azerty",
    "letmein", "welcome", "iloveyou", "asdfgh", "zxcvbn", "123456", "1234", "abcd",
    "admin", "login", "dragon", "monkey", "football", "sunshine", "princess", "master"];
  const SEQUENCES = ["0123", "1234", "2345", "3456", "4567", "5678", "6789",
    "abcd", "bcde", "cdef", "qwer", "wert", "asdf", "sdfg", "zxcv", "xcvb"];

  const FACTOR_LABELS = [
    ["len8", "8+ characters"],
    ["len12", "12+ characters"],
    ["upper", "Uppercase letter"],
    ["lower", "Lowercase letter"],
    ["digit", "Number"],
    ["symbol", "Symbol"],
    ["uncommon", "Nothing common or leaked"],
    ["noseq", "No sequences or repeats"],
  ];

  const RATES = [
    ["Throttled website", 100],
    ["Offline GPU rig", 1e10],
    ["State-sized farm", 1e12],
  ];

  let debounceTimer = 0;

  function analyze(pw) {
    const len = pw.length;
    const hasLower = /[a-z]/.test(pw);
    const hasUpper = /[A-Z]/.test(pw);
    const hasDigit = /\d/.test(pw);
    const hasSymbol = /[^A-Za-z0-9]/.test(pw);
    const pool = (hasLower ? 26 : 0) + (hasUpper ? 26 : 0) + (hasDigit ? 10 : 0) + (hasSymbol ? 33 : 0);

    const lower = pw.toLowerCase();
    const exactCommon = COMMON.has(lower);
    const hasCommonPart = SUBSTRINGS.some((s) => lower.includes(s));
    const hasSequence = SEQUENCES.some((s) => lower.includes(s)) || /(.)\1{2,}/.test(pw);

    let entropy = len > 0 && pool > 0 ? len * Math.log2(pool) : 0;
    if (exactCommon) entropy = Math.min(entropy, 4);
    else if (hasCommonPart) entropy = Math.min(entropy, 20);
    if (hasSequence) entropy = Math.max(0, entropy - 10);

    let score;
    if (len === 0) score = -1;
    else if (exactCommon) score = 0;
    else if (entropy < 28) score = 0;
    else if (entropy < 40) score = 1;
    else if (entropy < 60) score = 2;
    else if (entropy < 80) score = 3;
    else score = 4;

    return { len, hasLower, hasUpper, hasDigit, hasSymbol, pool, entropy, exactCommon, hasCommonPart, hasSequence, score };
  }

  function humanTime(seconds) {
    if (!isFinite(seconds)) return "beyond heat death";
    if (seconds < 1) return "instantly";
    const units = [
      [60, "seconds"], [60, "minutes"], [24, "hours"], [365, "days"],
      [100, "years"], [1000, "centuries"],
    ];
    let value = seconds;
    let name = "seconds";
    for (const [factor, label] of units) {
      name = label;
      if (value < factor) break;
      value /= factor;
      name = label === "centuries" ? "millennia" : label;
      if (label === "centuries") break;
    }
    if (value >= 1e6) return value.toExponential(1).replace("e+", "×10^") + " " + name;
    if (value >= 1000) return Math.round(value).toLocaleString() + " " + name;
    return (value >= 10 ? Math.round(value) : value.toFixed(1)) + " " + name;
  }

  function render() {
    const pw = input.value;
    const a = analyze(pw);

    // factors
    const flags = {
      len8: a.len >= 8,
      len12: a.len >= 12,
      upper: a.hasUpper,
      lower: a.hasLower,
      digit: a.hasDigit,
      symbol: a.hasSymbol,
      uncommon: a.len > 0 && !a.exactCommon && !a.hasCommonPart,
      noseq: a.len > 0 && !a.hasSequence,
    };
    factorsEl.innerHTML = FACTOR_LABELS.map(([key, label]) => {
      const on = flags[key];
      const state = a.len === 0 ? "" : on ? " good" : " bad";
      const icon = a.len === 0 ? "–" : on ? "✓" : "✗";
      return '<span class="pw-factor' + state + '"><span aria-hidden="true">' + icon + "</span>" + FL.escapeHTML(label) + "</span>";
    }).join("");

    // meter
    const pct = a.score < 0 ? 0 : (a.score / 4) * 100;
    fill.style.width = pct + "%";
    const colors = ["var(--danger)", "var(--danger)", "var(--amber)", "var(--teal)", "var(--brand)"];
    fill.style.background = a.score < 0 ? "transparent" : colors[a.score];
    bar.setAttribute("aria-valuenow", String(Math.max(0, a.score * 25)));

    const verdicts = [
      "Crumbling. A script kiddy cracks this between sips. ☕",
      "Weak — it falls before your coffee cools.",
      "Mediocre. It survives a bored teenager, not a hobbyist.",
      "Strong. Most attackers would move on to easier prey.",
      "Fortress-grade. Decades of brute force, minimum. 🏰",
    ];
    verdictEl.textContent = a.len === 0 ? "Start typing…" : verdicts[Math.max(0, a.score)];
    verdictEl.style.color = a.score <= 1 ? "var(--danger)" : a.score === 2 ? "var(--amber)" : "var(--teal)";

    lengthOut.textContent = String(a.len);
    entropyOut.textContent = Math.round(a.entropy) + " bits";
    poolOut.textContent = String(a.pool) + " chars";

    crackList.innerHTML = RATES.map(([label, rate]) => {
      const seconds = Math.pow(2, a.entropy) / rate;
      return '<li><span class="crack-scenario">' + FL.escapeHTML(label) +
        ' <span class="fine-print">(' + rate.toExponential(0).replace("e+", " × 10^") + ' guesses/s)</span></span>' +
        '<span class="crack-time">' + humanTime(seconds) + "</span></li>";
    }).join("");

    const notes = [];
    if (a.exactCommon) notes.push("This is one of the most common passwords ever leaked.");
    else if (a.hasCommonPart) notes.push("It contains a word attackers try first (like “password” or “qwerty”).");
    if (a.hasSequence) notes.push("Sequences like “1234” or repeats like “aaa” add almost no real strength.");
    if (a.len > 0 && a.len < 8) notes.push("Length is the cheapest strength: every extra character multiplies the work.");
    crackNote.textContent = a.len === 0
      ? "Estimates appear once you type. Brute force assumes the attacker knows your character pool — that's the fair way to count."
      : notes.join(" ") || "Solid structure. Remember: unique per site + a password manager beats heroics.";
  }

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(render, 120);
  });

  peekBtn.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    peekBtn.setAttribute("aria-pressed", String(show));
    peekBtn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    peekBtn.querySelector(".ic-eye").hidden = show;
    peekBtn.querySelector(".ic-eye-off").hidden = !show;
  });

  generateBtn.addEventListener("click", () => {
    const words = ["copper", "lantern", "mango", "quartz", "tundra", "pixel", "comet", "harbor", "meadow", "cactus", "nimbus", "walrus", "pepper", "zephyr", "orbit", "juniper"];
    let bits = new Uint32Array(8);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bits);
    else for (let i = 0; i < 8; i++) bits[i] = Math.floor(Math.random() * 0xffffffff);
    const picks = [0, 1, 2, 3].map((i) => words[bits[i] % words.length]);
    const pw = picks.join("-") + "-" + (bits[4] % 90 + 10) + String.fromCharCode(33 + (bits[5] % 14));
    input.value = pw;
    input.type = "text";
    peekBtn.setAttribute("aria-pressed", "true");
    peekBtn.setAttribute("aria-label", "Hide password");
    peekBtn.querySelector(".ic-eye").hidden = true;
    peekBtn.querySelector(".ic-eye-off").hidden = false;
    render();
    FL.sfx.play("success");
    FL.toast.success("Fresh password generated locally — nothing was stored");
  });

  render();

  // Public API (used by automated tests).
  FL.register("password-lab", { analyze, render });
})(window.FunLab);
