/* FunLab experiment — Tiny Drawing. Pointer-event canvas painting with brush,
   eraser, undo, clear (confirmed) and PNG export. Autosaves to localStorage. */
(function (FL) {
  "use strict";
  const $ = FL.$;

  const canvas = $("#draw-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  const W = canvas.width, H = canvas.height;
  const BG = "#ffffff";

  const brushBtn = $("#draw-brush");
  const eraserBtn = $("#draw-eraser");
  const sizeInput = $("#draw-size");
  const sizeOut = $("#draw-size-out");
  const undoBtn = $("#draw-undo");
  const clearBtn = $("#draw-clear");
  const saveBtn = $("#draw-save");
  const swatchesEl = $("#draw-swatches");

  const PALETTE = ["#23202c", "#7c5cff", "#3f9df5", "#17b79b", "#8fd14f", "#f5a70a", "#ff6b6b", "#f45d9d", "#8d5a3b", "#938fa3", "#ffd166", "#0c0b1c"];

  let tool = "brush";
  let color = PALETTE[1];
  let size = 8;
  let drawing = false;
  let lastX = 0, lastY = 0;
  let undoStack = [];
  let saveTimer = 0;
  let warnedQuota = false;
  let dirty = false;

  function clearToBg() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
  }

  function snapshot() {
    try { return canvas.toDataURL("image/png"); } catch (_) { return null; }
  }

  function pushUndo() {
    const snap = snapshot();
    if (snap) {
      undoStack.push(snap);
      if (undoStack.length > 10) undoStack.shift();
    }
    undoBtn.disabled = undoStack.length === 0;
  }

  function restore(dataURL, cb) {
    if (!dataURL) { clearToBg(); return; }
    const img = new Image();
    img.onload = () => {
      clearToBg();
      ctx.drawImage(img, 0, 0);
      if (cb) cb();
    };
    img.onerror = () => clearToBg();
    img.src = dataURL;
  }

  function scheduleSave() {
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const data = snapshot();
      if (data && !FL.store.set("tiny-drawing", data) && !warnedQuota) {
        warnedQuota = true;
        FL.toast.show("Autosave skipped — browser storage is full");
      }
    }, 900);
  }

  /* ---------- pointer painting ---------- */
  function pointFrom(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height),
    };
  }

  function strokeStyle() {
    if (tool === "eraser") return BG;
    return color;
  }

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    drawing = true;
    pushUndo();
    const p = pointFrom(e);
    lastX = p.x; lastY = p.y;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // draw a dot for taps
    ctx.beginPath();
    ctx.fillStyle = strokeStyle();
    ctx.arc(p.x, p.y, effectiveWidth(e) / 2, 0, Math.PI * 2);
    ctx.fill();
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const p = pointFrom(e);
    const midX = (lastX + p.x) / 2, midY = (lastY + p.y) / 2;
    ctx.strokeStyle = strokeStyle();
    ctx.lineWidth = effectiveWidth(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.quadraticCurveTo(lastX, lastY, midX, midY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastX = p.x; lastY = p.y;
  });

  function endStroke() {
    if (!drawing) return;
    drawing = false;
    scheduleSave();
  }
  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointercancel", endStroke);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  function effectiveWidth(e) {
    // pen pressure adds a little life; mouse/touch stay steady
    if (e.pointerType === "pen" && e.pressure > 0) {
      return size * (0.45 + e.pressure * 1.1);
    }
    return size;
  }

  /* ---------- toolbar ---------- */
  function setTool(t) {
    tool = t;
    brushBtn.setAttribute("aria-pressed", String(t === "brush"));
    eraserBtn.setAttribute("aria-pressed", String(t === "eraser"));
    FL.sfx.play("click");
  }
  brushBtn.addEventListener("click", () => setTool("brush"));
  eraserBtn.addEventListener("click", () => setTool("eraser"));

  PALETTE.forEach((c, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch";
    b.style.background = c;
    b.setAttribute("aria-label", "Colour " + (i + 1));
    b.setAttribute("aria-pressed", String(c === color));
    b.addEventListener("click", () => {
      color = c;
      setTool("brush");
      swatchesEl.querySelectorAll(".swatch").forEach((s) => s.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      FL.sfx.play("tick");
    });
    swatchesEl.appendChild(b);
  });

  // custom colour well
  const custom = document.createElement("label");
  custom.className = "swatch swatch-custom";
  custom.setAttribute("aria-label", "Custom colour");
  custom.style.background = "conic-gradient(#ff6b6b,#f5a70a,#8fd14f,#17b79b,#3f9df5,#7c5cff,#f45d9d,#ff6b6b)";
  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = "#7c5cff";
  colorInput.setAttribute("aria-label", "Pick a custom colour");
  colorInput.addEventListener("input", () => {
    color = colorInput.value;
    setTool("brush");
    swatchesEl.querySelectorAll(".swatch").forEach((s) => s.setAttribute("aria-pressed", "false"));
  });
  custom.appendChild(colorInput);
  swatchesEl.appendChild(custom);

  sizeInput.addEventListener("input", () => {
    size = Number(sizeInput.value);
    sizeOut.textContent = String(size);
    sizeInput.style.setProperty("--fill", ((size - 2) / 46) * 100 + "%");
  });
  sizeInput.style.setProperty("--fill", ((size - 2) / 46) * 100 + "%");

  undoBtn.addEventListener("click", () => {
    const snap = undoStack.pop();
    undoBtn.disabled = undoStack.length === 0;
    restore(snap, scheduleSave);
    FL.sfx.play("tick");
  });

  clearBtn.addEventListener("click", async () => {
    const yes = await FL.modal.confirm({
      title: "Clear the canvas?",
      message: "Your current masterpiece will be replaced by beautiful emptiness. Undo can still bring it back.",
      confirmLabel: "Clear it",
      danger: true,
    });
    if (!yes) return;
    pushUndo();
    clearToBg();
    scheduleSave();
    FL.sfx.play("whoosh");
  });

  saveBtn.addEventListener("click", () => {
    try {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "funlab-drawing-" + new Date().toISOString().slice(0, 10) + ".png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      FL.toast.success("PNG saved to your device");
      FL.sfx.play("success");
    } catch (_) {
      FL.toast.error("Could not export the drawing");
    }
  });

  /* ---------- boot: restore autosaved art ---------- */
  clearToBg();
  const saved = FL.store.get("tiny-drawing", null);
  if (saved) restore(saved);
  undoBtn.disabled = true;

  // Public API (used by automated tests).
  FL.register("tiny-drawing", {
    setTool,
    drawLine(x1, y1, x2, y2) {
      ctx.strokeStyle = strokeStyle();
      ctx.lineWidth = size;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      dirty = true;
    },
    clear: clearToBg,
    snapshot,
    get undoDepth() { return undoStack.length; },
  });
})(window.FunLab);
