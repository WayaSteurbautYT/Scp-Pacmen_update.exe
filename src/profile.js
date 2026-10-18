// Local profile/progression persistence, best scores and leaderboard UI.

import { playGameSound, sayNarrated } from "./audio.js";
import { INVENTORY_ITEMS } from "./character-content.js";
import { createProgression, normalizeProgression } from "./progression.js";
import { bestValue, escapeHtml, profile, scoreValue, $ } from "./state.js";
import { TUTORIAL_STEPS, tutorialStep } from "./tutorial.js";
import { appendChat } from "./ui.js";

export const storageKey = "neon-maze-best";

export const leaderboardKey = "neon-maze-leaderboard";

export const progressionStorageKey = "neon-maze-progression";

export const inventoryStorageKey = "neon-maze-inventory";


export let bestScore = Number(localStorage.getItem(storageKey) || 0);
bestValue.textContent = formatScore(bestScore);


export function formatScore(score) {
  return String(score).padStart(6, "0");
}

$("#tutorial-repeat").addEventListener("click", () => {
  const step = TUTORIAL_STEPS[tutorialStep];
  sayNarrated(`${step.title}. ${step.copy}`);
  playGameSound("select");
});


export function inventoryKey(name) {
  return `${inventoryStorageKey}:${name.trim().toLowerCase()}`;
}


export function loadInventory(name) {
  if (!name) return {};
  const stored = localStorage.getItem(inventoryKey(name));
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored);
    return Object.fromEntries(INVENTORY_ITEMS.map(({ id }) => [
      id,
      Number.isSafeInteger(parsed?.[id]) && parsed[id] > 0 ? Math.min(parsed[id], 999) : 0,
    ]));
  } catch (error) {
    console.warn("Saved inventory could not be read; starting with an empty inventory.", error);
    return {};
  }
}


export function postStats(stats) {
  scoreValue.textContent = formatScore(stats.score);
  if (stats.score > bestScore) {
    bestScore = stats.score;
    localStorage.setItem(storageKey, String(bestScore));
    bestValue.textContent = formatScore(bestScore);
  }
  if (profile?.name && stats.score > 0) saveLocalScore(profile.name, stats.score);
  renderLeaderboard(stats.score);
}


export function saveLocalScore(name, score) {
  const scores = JSON.parse(localStorage.getItem(leaderboardKey) || "[]");
  const existing = scores.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
  if (existing) existing.score = Math.max(existing.score, score);
  else scores.push({ name, score });
  localStorage.setItem(leaderboardKey, JSON.stringify(scores));
}


export function renderLeaderboard(score = 0) {
  const scores = JSON.parse(localStorage.getItem(leaderboardKey) || "[]");
  const playerName = profile?.name || "YOUR FIRST RUN";
  const existing = scores.find((entry) => entry.name.toLowerCase() === playerName.toLowerCase());
  const ranked = [
    ...scores.filter((entry) => entry.name.toLowerCase() !== playerName.toLowerCase()),
    { name: playerName, score: Math.max(score, existing?.score || 0) },
  ]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const playerRank = ranked.findIndex((entry) => entry.name.toLowerCase() === playerName.toLowerCase()) + 1;
  $("#leader-rank").textContent = `RANK #${String(playerRank).padStart(2, "0")}`;
  const entries = ranked.slice(0, 4);
  $("#leaderboard-list").innerHTML = entries.map((entry, index) =>
    `<li class="${entry.name === playerName ? "is-you" : ""}"><span class="leader-rank">${String(index + 1).padStart(2, "0")}</span><span class="leader-name">${escapeHtml(entry.name)}</span><strong>${formatScore(entry.score)}</strong></li>`,
  ).join("");
}


export function progressionKey(name = profile?.name || "guest") {
  return `${progressionStorageKey}:${encodeURIComponent(name.toLowerCase())}`;
}


export function loadProgress(name = profile?.name || "guest", faction = profile?.team || "pacmen", startingAbility = null) {
  try {
    const saved = localStorage.getItem(progressionKey(name));
    return saved
      ? normalizeProgression(JSON.parse(saved), faction)
      : createProgression(faction, startingAbility);
  } catch (error) {
    appendChat("SYSTEM", `Couldn't load saved progression: ${error.message}`);
    return createProgression(faction, startingAbility);
  }
}


export function saveProgress(progress, name = profile?.name || "guest") {
  localStorage.setItem(progressionKey(name), JSON.stringify(normalizeProgression(progress)));
}
