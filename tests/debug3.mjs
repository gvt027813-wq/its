import { JSDOM, VirtualConsole } from "jsdom";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = "experiments/color-master/index.html";
const html = readFileSync(path.join(ROOT, rel), "utf8");
const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => { if (!/Could not load|resource/i.test(String(e))) errors.push(e.message); });
vc.on("error", (m) => errors.push(String(m)));
const dom = new JSDOM(html, { url: "https://funlab.test/" + rel, runScripts: "outside-only", pretendToBeVisual: true, virtualConsole: vc });
const { window } = dom;
window.matchMedia = window.matchMedia || ((q) => ({ matches:false, media:q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }));
window.ResizeObserver = window.ResizeObserver || class { observe(){} unobserve(){} disconnect(){} };
const ctxStub = () => new Proxy({}, { get: () => () => ({ addColorStop(){} }), set: () => true });
window.HTMLCanvasElement.prototype.getContext = function(){ return ctxStub(); };
for (const s of window.document.querySelectorAll("script[src]")) {
  const src = s.getAttribute("src");
  window.eval(readFileSync(path.join(ROOT, path.dirname(rel), src), "utf8"));
}
window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));
const d = window.document;
const api = window.FunLab.games["color-master"];
const click = (el) => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
click(d.querySelector('[data-diff="medium"]'));
console.log("round1 options:", d.querySelectorAll("#cm-options .cm-opt").length);
api.pick(api.state.correctIndex);
setTimeout(() => {
  console.log("round2 options:", d.querySelectorAll("#cm-options .cm-opt").length, "round:", api.state.round);
  api.pick((api.state.correctIndex + 1) % 9);
  setTimeout(() => {
    console.log("round3 options:", d.querySelectorAll("#cm-options .cm-opt").length, "round:", api.state.round);
    click(d.getElementById("cm-menu"));
    click(d.querySelector('[data-diff="hard"]'));
    console.log("hard options:", d.querySelectorAll("#cm-options .cm-opt").length, "state:", JSON.stringify(api.state));
    console.log("errors:", errors);
    process.exit(0);
  }, 1500);
}, 1500);
