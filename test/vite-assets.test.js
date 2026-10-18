import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Phaser's loader flags every url starting with "data:" as base64 and runs
// atob() on it (see node_modules/phaser/src/loader/File.js and XHRLoader.js).
// Vite inlines small assets as URL-encoded, *non*-base64 data URIs, so an
// inlined atlas makes Phaser throw InvalidCharacterError during preload and the
// whole game stops before create() runs. Nothing may be inlined.
test("vite never inlines assets into data URIs", async () => {
  const config = await readFile(new URL("../vite.config.js", import.meta.url), "utf8");
  const match = config.match(/assetsInlineLimit\s*:\s*(\d+)/);
  assert.ok(match, "vite.config.js must set build.assetsInlineLimit");
  assert.equal(Number(match[1]), 0, "assetsInlineLimit must be 0 so atlases keep real file urls");
});

// Guards against the markup drift that silently disabled every listener
// registered after the panel label lookup in src/main.js.
test("index.html provides the status label the game drives", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /class="[^"]*\bpanel-label\b[^"]*"/, "index.html must contain a .panel-label element");
});

test("index.html only references assets that exist on disk", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const refs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(([, ref]) => ref);
  assert.ok(refs.length > 0, "index.html should reference game assets");
  for (const ref of refs) {
    const path = new URL(`..${ref}`, import.meta.url);
    await assert.doesNotReject(
      () => readFile(path),
      `${ref} is referenced by index.html but does not exist`,
    );
  }
});
