import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifest = JSON.parse(await readFile(new URL("../assets/characters/character-animations.json", import.meta.url), "utf8"));

const atlasFiles = {
  pacmen: "pacmen-atlas.svg",
  runner: "runner-atlas.svg",
  ghost: "ghost-atlas.svg",
  objects: "maze-objects-atlas.svg",
  pellets: "special-pellets-atlas.svg",
  effects: "ability-effects-atlas.svg",
  coins: "coins-atlas.svg",
};

for (const [family, atlasName] of Object.entries(atlasFiles)) {
  test(`${family} atlas frames match the Phaser animation manifest`, async () => {
    const atlas = await readFile(new URL(`../assets/characters/${atlasName}`, import.meta.url), "utf8");
    const config = manifest[family];
    assert.equal(config.frameCount, config.columns * config.rows);
    assert.match(atlas, new RegExp(`width="${config.columns * manifest.frameWidth}" height="${config.rows * manifest.frameHeight}"`));
    const frames = [...atlas.matchAll(/transform="translate\((\d+) (\d+)\)"/g)]
      .map(([, x, y]) => [Number(x), Number(y)]);
    assert.equal(frames.length, config.frameCount);
    assert.deepEqual(
      [...new Set(frames.map(([x]) => x))].sort((a, b) => a - b),
      Array.from({ length: config.columns }, (_, index) => index * manifest.frameWidth),
    );
    assert.deepEqual(
      [...new Set(frames.map(([, y]) => y))].sort((a, b) => a - b),
      Array.from({ length: config.rows }, (_, index) => index * manifest.frameHeight),
    );
    for (const [animationName, animation] of Object.entries(config.animations || {})) {
      assert.ok(animation.frames.length > 0, `${animationName} must include at least one frame`);
      for (const frame of animation.frames) {
        assert.ok(Number.isInteger(frame) && frame >= 0 && frame < config.frameCount, `${animationName} references invalid frame ${frame}`);
      }
      assert.ok(animation.frameRate > 0, `${animationName} must have a positive frame rate`);
      assert.ok(Number.isInteger(animation.repeat) && animation.repeat >= -1, `${animationName} has an invalid repeat count`);
    }
  });
}

test("every manifest atlas source resolves to a real file", async () => {
  for (const [family, config] of Object.entries(manifest)) {
    if (family === "frameWidth" || family === "frameHeight") continue;
    assert.ok(config.source, `${family} must declare a source atlas`);
    const path = new URL(`..${config.source}`, import.meta.url);
    const atlas = await readFile(path, "utf8");
    assert.match(atlas, /^<svg/, `${family} source ${config.source} must be an SVG document`);
  }
});
