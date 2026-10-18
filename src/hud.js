// Frame-budgeted HUD helpers (cached elements, last-value writes).

import abilityEffectsAtlasUrl from "../assets/characters/ability-effects-atlas.svg?url";
import characterAnimationData from "../assets/characters/character-animations.json";
import coinsAtlasUrl from "../assets/characters/coins-atlas.svg?url";
import ghostAtlasUrl from "../assets/characters/ghost-atlas.svg?url";
import mazeObjectsAtlasUrl from "../assets/characters/maze-objects-atlas.svg?url";
import pacmenAtlasUrl from "../assets/characters/pacmen-atlas.svg?url";
import specialPelletsAtlasUrl from "../assets/characters/special-pellets-atlas.svg?url";
import Phaser from "phaser";
import { playGameSound, playTone, sayNarrated, sayNarratedTimed } from "./audio.js";
import { INVENTORY_ITEMS, NPC_DIALOGUE, pickDialogue } from "./character-content.js";
import { BITE_FRIGHT_DURATION, BITE_SEQUENCE_DURATION, EYES_ONLY_DURATION, GHOST_COLORS, GHOST_PANIC_DURATION, PELLET_EVENT_COOLDOWN, POWER_DURATION, REGEN_DURATION, SKIN_COLORS, TILE } from "./constants.js";
import MazeScene from "./game/MazeScene.js";
import { COLUMNS, GHOST_STARTS, ROWS, createMaze, expandMaze, findNextStep, isOpen } from "./maze.js";
import { roomSocket } from "./network.js";
import { formatScore, inventoryKey, loadInventory, loadProgress, postStats, saveProgress } from "./profile.js";
import { ABILITIES, WEAPONS, advanceQuest, awardCoins, awardXp, createProgression, normalizeProgression, purchaseItem, rebirthProgression, unlockAbility, xpToNextLevel } from "./progression.js";
import { assetUrl, autonomyEnabled, bubbleEnabled, heartIconUrl, hungerIconUrl, livesDisplay, overlay, overlayCopy, overlayKicker, overlayTitle, profile, setupScreen, $ } from "./state.js";
import { appendChat, hueToTint, renderQuestBoard, renderShop, renderSkillTree, setNetworkStatus, showToast, unlockAchievement } from "./ui.js";


export function updateProgressUI(progress, hunger = 100, hearts = progress.maxHearts) {
  const threshold = xpToNextLevel(progress.level);
  $("#level-value").textContent = String(progress.level);
  $("#xp-value").textContent = `${progress.xp} / ${threshold} XP`;
  $("#xp-meter").style.width = `${Math.min(100, progress.xp / threshold * 100)}%`;
  const factionWallet = progress.faction === "ghosts" ? progress.ghostCoins : progress.pacCoins;
  const currencyLabel = progress.faction === "ghosts" ? "GHOST COINS" : "PACCOINS";
  $("#coin-row-label").textContent = currencyLabel;
  $("#coin-value").textContent = String(factionWallet);
  $("#hunger-meter").style.width = `${Math.max(0, Math.min(100, hunger))}%`;
  $("#hunger-value").textContent = `${Math.round(hunger)}%`;
  const hotbarHearts = $("#hotbar-hearts");
  const visibleHearts = Math.min(10, progress.maxHearts);
  renderHeartIcons(hotbarHearts, Math.min(hearts, visibleHearts), visibleHearts, "hotbar-heart");
  const hungerBar = $("#hotbar-hunger");
  hungerBar.replaceChildren();
  hungerBar.classList.toggle("is-starving", hunger <= 20);
  for (let index = 0; index < 10; index += 1) {
    const icon = document.createElement("img");
    icon.src = hungerIconUrl;
    icon.alt = "";
    icon.className = `hunger-icon${index >= Math.ceil(hunger / 10) ? " depleted" : ""}`;
    hungerBar.append(icon);
  }
  const currencyImage = document.createElement("img");
  currencyImage.src = assetUrl(progress.faction === "ghosts" ? "assets/ui/ghost-coins.svg" : "assets/ui/paccoins.svg");
  currencyImage.alt = "";
  currencyImage.className = "currency-icon";
  $("#game-hud-currency").replaceChildren(currencyImage, document.createTextNode(
    String(progress.faction === "ghosts" ? progress.ghostCoins : progress.pacCoins),
  ));
  livesDisplay.dataset.maxHearts = String(progress.maxHearts);
  $("#lives-caption").textContent = `${hearts} / ${progress.maxHearts} HEARTS`;
  livesDisplay.replaceChildren();
  for (let index = 0; index < progress.maxHearts; index += 1) {
    const icon = document.createElement("img");
    icon.src = heartIconUrl;
    icon.alt = "";
    icon.className = `life-icon${index >= hearts ? " lost" : ""}`;
    livesDisplay.append(icon);
  }
  livesDisplay.setAttribute("aria-label", `${hearts} of ${progress.maxHearts} hearts remaining`);
  const previousHearts = Number(livesDisplay.dataset.currentHearts ?? hearts);
  const previousHunger = Number(livesDisplay.dataset.currentHunger ?? hunger);
  if (hearts < previousHearts) animateDamage(".life-icon:not(.lost)");
  if (hunger < previousHunger - 1) animateDamage(".survival-hunger-icon");
  livesDisplay.dataset.currentHearts = String(hearts);
  livesDisplay.dataset.currentHunger = String(hunger);
}


export function animateDamage(selector) {
  for (const element of document.querySelectorAll(selector)) {
    element.classList.remove("is-hit");
    void element.offsetWidth;
    element.classList.add("is-hit");
    window.setTimeout(() => element.classList.remove("is-hit"), 500);
    break;
  }
}


export function renderHeartIcons(container, current, maximum, className) {
  container.replaceChildren();
  for (let index = 0; index < maximum; index += 1) {
    const icon = document.createElement("img");
    icon.src = heartIconUrl;
    icon.alt = "";
    icon.className = `${className}${index >= current ? " lost" : ""}`;
    container.append(icon);
  }
}


// `updateGameHud` runs on every frame, so querySelector calls and redundant
// textContent writes add up fast and force layout work. Resolve each element
// once and remember the last value written.
export const hudElementCache = new Map();

export function hudEl(id) {
  if (!hudElementCache.has(id)) hudElementCache.set(id, document.getElementById(id));
  return hudElementCache.get(id);
}

export function setHudText(id, value) {
  const element = hudEl(id);
  if (!element || element.textContent === value) return;
  element.textContent = value;
}