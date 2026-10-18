// Headless runtime probe: loads the Vite dev server in Chrome, captures
// console errors + uncaught exceptions, and clicks critical buttons.
// Usage: node scripts/probe-runtime.mjs [url]
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const url = process.argv[2] || "http://127.0.0.1:5173/";
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const userDir = fs.mkdtempSync(path.join(os.tmpdir(), "pac-probe-"));
const probeJs = `
(() => {
  const errors = [];
  window.addEventListener("error", (e) => errors.push("ERR " + (e.message || e.error)));
  window.addEventListener("unhandledrejection", (e) => errors.push("REJ " + (e.reason && e.reason.message || e.reason)));
  const dump = (label) => {
    const out = {
      label,
      url: location.href,
      title: document.title,
      introHidden: document.getElementById("intro-screen")?.hidden,
      setupHidden: document.getElementById("setup-screen")?.hidden,
      skillsHidden: document.getElementById("skills-screen")?.hidden,
      loadingHidden: document.getElementById("loading-screen")?.hidden,
      bodyClasses: document.body.className,
      listening: !!window.__probe,
      errors,
    };
    document.title = "PROBE::" + JSON.stringify(out);
  };
  window.__probeDump = dump;
  window.__click = (id) => document.getElementById(id)?.click();
  setTimeout(() => dump("boot"), 9000);
})();
`;

try {
  const child = execFile(chrome, [
    `--user-data-dir=${userDir}`,
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1280,900",
    "--virtual-time-budget=12000",
    `--evaluate-on-load=${(() => { const f = path.join(userDir, "probe.js"); fs.writeFileSync(f, probeJs); return f; })()}`,
    "--dump-dom",
    url,
  ], { timeout: 45000, maxBuffer: 64 * 1024 * 1024 });
  let stdout = "";
  child.stdout.on("data", (d) => { stdout += d; });
  child.on("close", () => {
    const m = stdout.match(/<title>PROBE::(.*?)<\/title>/);
    console.log(m ? JSON.parse(m[1]) : { raw: "no probe title found", len: stdout.length });
  });
  await new Promise((resolve) => child.on("close", resolve));
} finally {
  fs.rmSync(userDir, { recursive: true, force: true });
}
