import test from "node:test";
import assert from "node:assert/strict";
import {
  QUESTS,
  ABILITIES,
  awardCoins,
  awardXp,
  advanceQuest,
  createProgression,
  normalizeProgression,
  purchaseItem,
  rebirthProgression,
  unlockAbility,
  WEAPONS,
  xpToNextLevel,
} from "../src/progression.js";

test("experience carries across levels and thresholds scale", () => {
  const result = awardXp(createProgression(), 320);
  assert.equal(result.levelsGained, 2);
  assert.equal(result.progress.level, 3);
  assert.equal(result.progress.xp, 60);
  assert.equal(xpToNextLevel(3), 220);
});

test("quest rewards are granted once at the goal", () => {
  let progress = createProgression();
  const quest = QUESTS.find(({ id }) => id === "trailblazer");
  let result = advanceQuest(progress, quest.id, quest.goal - 1);
  assert.equal(result.completed, false);
  result = advanceQuest(result.progress, quest.id);
  assert.equal(result.completed, true);
  assert.equal(result.progress.coins, quest.rewardCoins);
  const completedAgain = advanceQuest(result.progress, quest.id);
  assert.equal(completedAgain.completed, false);
  assert.equal(completedAgain.progress.coins, quest.rewardCoins);
});

test("shop validates requirements and upgrades persistent skills", () => {
  const broke = purchaseItem(createProgression(), "pulse");
  assert.equal(broke.ok, false);
  assert.match(broke.error, /more coins/);

  const wealthy = awardCoins(createProgression(), 500);
  const heart = purchaseItem(wealthy, "heart");
  assert.equal(heart.ok, true);
  assert.equal(heart.progress.maxHearts, 4);
  const charmLocked = purchaseItem(heart.progress, "charm");
  assert.equal(charmLocked.ok, false);
  const experienced = awardXp(heart.progress, 300).progress;
  const charm = purchaseItem(experienced, "charm");
  assert.equal(charm.ok, true);
  assert.equal(charm.progress.charmUnlocked, true);
});

test("progression data is normalized and malformed quest values cannot bypass limits", () => {
  const progress = normalizeProgression({
    xp: -10,
    level: "5",
    coins: 40,
    maxHearts: 99,
    pulseTier: -1,
    charmUnlocked: true,
    quests: { trailblazer: { progress: 1000, completed: false } },
  });
  assert.equal(progress.xp, 0);
  assert.equal(progress.level, 5);
  assert.equal(progress.maxHearts, 6);
  assert.equal(progress.pulseTier, 0);
  assert.equal(progress.quests.trailblazer.progress, 35);
});

test("faction wallets and separate ability trees unlock and equip safely", () => {
  let pacmen = awardCoins(createProgression("pacmen"), 60, "pacmen");
  assert.equal(pacmen.pacCoins, 60);
  assert.equal(pacmen.ghostCoins, 0);
  const locked = unlockAbility(pacmen, "frost-ring", "pacmen");
  assert.equal(locked.ok, false);
  pacmen = awardXp(pacmen, 320).progress;
  const unlocked = unlockAbility(pacmen, "frost-ring", "pacmen");
  assert.equal(unlocked.ok, true);
  assert.equal(unlocked.progress.selectedAbility, "frost-ring");
  assert.equal(unlocked.progress.pacCoins, 25);
  assert.equal(unlocked.progress.unlockedAbilities.includes("echo-bolt"), false);

  const ghosts = createProgression("ghosts", "phase-snap");
  assert.equal(ghosts.selectedAbility, ABILITIES.ghosts[1].id);
  assert.equal(ghosts.selectedAbility, "phase-snap");
});

test("advanced faction skills expose time control, teleport, siphon, and defense mechanics", () => {
  const timeField = ABILITIES.pacmen.find(({ id }) => id === "time-field");
  const barrage = ABILITIES.pacmen.find(({ id }) => id === "prism-barrage");
  const blink = ABILITIES.ghosts.find(({ id }) => id === "blink-step");
  const siphon = ABILITIES.ghosts.find(({ id }) => id === "hunger-siphon");
  const veil = ABILITIES.ghosts.find(({ id }) => id === "veil-of-nothing");

  assert.equal(timeField.stunDuration, 2600);
  assert.equal(timeField.area, true);
  assert.equal(barrage.area, true);
  assert.equal(blink.type, "teleport");
  assert.equal(siphon.drainHunger, 28);
  assert.equal(veil.type, "invulnerable");
  assert.equal(WEAPONS.find(({ id }) => id === "prism-bow").ranged, true);
});

test("rebirth is optional, gated at level ten, and preserves currency while increasing permanent power", () => {
  let progress = awardCoins(createProgression("ghosts"), 90, "ghosts");
  assert.equal(rebirthProgression(progress, "ghosts").ok, false);
  progress = awardXp(progress, 10000).progress;
  progress.unlockedAbilities.push("dread-wave");
  const reborn = rebirthProgression(progress, "ghosts");
  assert.equal(reborn.ok, true);
  assert.equal(reborn.progress.level, 1);
  assert.equal(reborn.progress.permanentPower, 1);
  assert.equal(reborn.progress.rebirths, 1);
  assert.equal(reborn.progress.ghostCoins, 90);
  assert.deepEqual(reborn.progress.unlockedAbilities, ["echo-bolt"]);
});
