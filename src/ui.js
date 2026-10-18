// DOM-side UI helpers: chat, toasts, character creation, shop/skill/quest boards.

import { playGameSound, playTone, sayNarrated } from "./audio.js";
import { ACHIEVEMENTS } from "./character-content.js";
import { roomSocket } from "./network.js";
import { ABILITIES, QUESTS, SHOP_ITEMS } from "./progression.js";
import { assetUrl, autonomyEnabled, bubbleEnabled, chatFeed, profile, setupScreen, $ } from "./state.js";


export function hueToTint(hue, saturation = 0.86, lightness = 0.58) {
  const normalizedHue = ((Number(hue) % 360) + 360) % 360;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = normalizedHue / 60;
  const secondary = chroma * (1 - Math.abs(segment % 2 - 1));
  const rgb = segment < 1 ? [chroma, secondary, 0]
    : segment < 2 ? [secondary, chroma, 0]
      : segment < 3 ? [0, chroma, secondary]
        : segment < 4 ? [0, secondary, chroma]
          : segment < 5 ? [secondary, 0, chroma] : [chroma, 0, secondary];
  const offset = lightness - chroma / 2;
  return rgb.reduce((color, channel) => (color << 8) | Math.round((channel + offset) * 255), 0);
}


export function hueLabel(hue) {
  return `H${String(Math.round(Number(hue))).padStart(3, "0")}`;
}


export function setRaceSelection(team, announce = false, startingAbility = null) {
  const faction = team === "ghosts" ? "ghosts" : "pacmen";
  const racePicker = $("#race-picker");
  const raceName = faction === "ghosts" ? "GHOSTS" : "PAC-MEN";
  racePicker.dataset.team = faction;
  $("#race-name").textContent = raceName;
  $("#race-description").textContent = faction === "ghosts"
    ? "Haunt · outsmart · defend" : "Collect · escape · team up";
  $("#race-selected").textContent = `RACE SELECTED · ${raceName}`;
  $("#race-preview").className = `race-preview race-preview-${faction === "ghosts" ? "ghost" : "pac"}`;
  renderStartingAbilities(faction, startingAbility || ABILITIES[faction][0].id);
  if (announce) {
    playGameSound("race");
    sayNarrated(`Race selected: ${raceName}.`);
  }
}


export function setCreationHue(input, output, hue) {
  const value = Math.max(0, Math.min(359, Math.round(Number(hue) || 0)));
  input.value = String(value);
  output.value = hueLabel(value);
  input.style.setProperty("--range-color", `hsl(${value} 86% 58%)`);
  return value;
}


export function unlockAchievement(id, actor = null) {
  const achievement = ACHIEVEMENTS[id];
  if (!achievement || !profile?.name) return;
  const key = `neon-maze-achievements:${profile.name.toLowerCase()}`;
  let unlocked;
  try {
    unlocked = JSON.parse(localStorage.getItem(key) || "[]");
  } catch (error) {
    console.warn("Saved achievements could not be read.", error);
    unlocked = [];
  }
  if (!Array.isArray(unlocked) || unlocked.includes(id)) return;
  unlocked.push(id);
  localStorage.setItem(key, JSON.stringify(unlocked));
  const line = `ADVANCEMENT MADE: ${achievement.title} — ${achievement.detail}`;
  appendChat("ADVANCEMENT", line, "achievement-chat");
  showToast(`ADVANCEMENT · ${achievement.title.toUpperCase()}`, achievement.detail, "quest");
  if (actor && bubbleEnabled) window.dispatchEvent(new CustomEvent("game:say-to", { detail: { actor, message: `Achievement unlocked: ${achievement.title}!` } }));
  playTone(1040, 0.22);
}


export function renderStartingAbilities(faction, selectedId) {
  const picker = $("#starting-ability-picker");
  if (!picker) return;
  picker.replaceChildren();
  const starters = ABILITIES[faction].filter(({ minLevel, cost }) => minLevel === 1 && cost === 0);
  for (const ability of starters) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `starting-ability${ability.id === selectedId ? " selected" : ""}`;
    button.dataset.startingAbility = ability.id;
    button.setAttribute("aria-pressed", String(ability.id === selectedId));
    const icon = document.createElement("span");
    icon.textContent = ability.icon;
    const title = document.createElement("strong");
    title.textContent = ability.name;
    const detail = document.createElement("small");
    detail.textContent = ability.detail;
    button.append(icon, title, detail);
    picker.append(button);
  }
}


export function showToast(title, detail, kind = "reward") {
  const stack = $("#toast-stack");
  const toast = document.createElement("div");
  toast.className = `game-toast ${kind}`;
  const marker = document.createElement("span");
  marker.className = "toast-marker";
  marker.textContent = kind === "level" ? "↑" : kind === "quest" ? "✦" : kind === "warning" ? "!" : "+";
  const copy = document.createElement("span");
  const heading = document.createElement("strong");
  heading.textContent = title;
  const caption = document.createElement("small");
  caption.textContent = detail;
  copy.append(heading, caption);
  toast.append(marker, copy);
  stack.append(toast);
  window.setTimeout(() => {
    toast.classList.add("leaving");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    window.setTimeout(() => toast.remove(), 400);
  }, 3200);
}


export function renderQuestBoard(progress) {
  const board = $("#quest-list");
  board.replaceChildren();
  for (const quest of QUESTS) {
    const state = progress.quests[quest.id];
    const row = document.createElement("li");
    row.className = `quest-row${state.completed ? " is-complete" : ""}`;
    const copy = document.createElement("span");
    copy.className = "quest-copy";
    const title = document.createElement("strong");
    title.textContent = quest.title;
    const detail = document.createElement("small");
    detail.textContent = state.completed ? "MISSION COMPLETE" : quest.detail;
    copy.append(title, detail);
    const progressLabel = document.createElement("span");
    progressLabel.className = "quest-count";
    progressLabel.textContent = state.completed ? "✓" : `${state.progress}/${quest.goal}`;
    row.append(copy, progressLabel);
    board.append(row);
  }
}


export function renderShop(progress) {
  const shop = $("#shop-items");
  const balance = progress.faction === "ghosts" ? progress.ghostCoins : progress.pacCoins;
  $("#shop-currency-label").textContent = progress.faction === "ghosts" ? "GHOST COINS" : "PACCOINS";
  shop.replaceChildren();
  for (const item of SHOP_ITEMS) {
    const owned = item.id === "heart" ? progress.maxHearts >= 6
      : item.id === "pulse" ? progress.pulseTier >= 3
        : item.id === "charm" ? progress.charmUnlocked
          : false;
    const locked = item.level && progress.level < item.level;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "shop-item";
    button.dataset.purchase = item.id;
    button.disabled = owned || Boolean(locked) || balance < item.cost;
    const copy = document.createElement("span");
    copy.className = "shop-copy";
    const title = document.createElement("strong");
    title.textContent = item.title;
    const detail = document.createElement("small");
    detail.textContent = owned ? "FULLY UPGRADED" : locked ? `UNLOCKS AT LEVEL ${item.level}` : item.detail;
    copy.append(title, detail);
    const cost = document.createElement("span");
    cost.className = "shop-cost";
    cost.textContent = owned ? "✓" : `${item.cost} ◈`;
    button.append(copy, cost);
    shop.append(button);
  }
}


export function renderSkillTree(progress, faction = progress.faction) {
  const tree = $("#skill-tree");
  if (!tree) return;
  const abilities = ABILITIES[faction] || ABILITIES.pacmen;
  const wallet = faction === "ghosts" ? progress.ghostCoins : progress.pacCoins;
  $("#skill-tree-caption").textContent = `${faction === "ghosts" ? "GHOST" : "PAC-MEN"} TREE · ${faction === "ghosts" ? "GHOST COINS" : "PACCOINS"} ${wallet} · R CASTS EQUIPPED ABILITY`;
  tree.replaceChildren();
  for (const ability of abilities) {
    const unlocked = progress.unlockedAbilities.includes(ability.id);
    const selected = progress.selectedAbility === ability.id;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `skill-node${unlocked ? " is-unlocked" : ""}${selected ? " is-equipped" : ""}`;
    button.dataset.abilityId = ability.id;
    button.disabled = (!unlocked && (progress.level < ability.minLevel || wallet < ability.cost));
    const icon = document.createElement("img");
    icon.className = "skill-node-icon";
    icon.src = assetUrl(`assets/ui/icons/ability-${ability.id}.svg`);
    icon.alt = "";
    icon.width = 24;
    icon.height = 24;
    icon.style.display = "block";
    icon.style.margin = "0 auto";
    const copy = document.createElement("span");
    copy.className = "skill-node-copy";
    const name = document.createElement("strong");
    name.textContent = ability.name;
    const detail = document.createElement("small");
    detail.textContent = selected ? "EQUIPPED · R TO CAST" : unlocked
      ? `UNLOCKED · ${ability.detail}`
      : `LEVEL ${ability.minLevel} · ${ability.cost} ${faction === "ghosts" ? "GC" : "PC"} · ${ability.detail}`;
    copy.append(name, detail);
    const status = document.createElement("b");
    status.textContent = selected ? "ACTIVE" : unlocked ? "EQUIP" : `${ability.cost}`;
    button.append(icon, copy, status);
    tree.append(button);
  }
  const rebirthPanel = $("#rebirth-panel");
  const canRebirth = progress.level >= 10 && progress.rebirths < 5;
  rebirthPanel.replaceChildren();
  const description = document.createElement("p");
  description.textContent = `REBIRTH ${progress.rebirths}/5 · Reach level 10 to reset levels and skill unlocks for permanent power +1 and a heart. Entirely optional.`;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.rebirth = "true";
  button.disabled = !canRebirth;
  button.textContent = canRebirth ? "REBIRTH · GROW STRONGER" : progress.rebirths >= 5 ? "REBIRTH FULLY AWAKENED" : `REBIRTH UNLOCKS AT LEVEL 10 · ${progress.level}/10`;
  rebirthPanel.append(description, button);
}


export function appendChat(author, message, type = "") {
  const line = document.createElement("div");
  line.className = `chat-line ${type}`;
  const name = document.createElement("span");
  name.className = "chat-author";
  name.textContent = author;
  const text = document.createElement("span");
  text.textContent = message;
  line.append(name, text);
  chatFeed.append(line);
  while (chatFeed.children.length > 12) chatFeed.firstElementChild.remove();
  chatFeed.scrollTop = chatFeed.scrollHeight;
}


export function syncAutonomyControls() {
  const autonomyButton = $("#autonomy-toggle");
  const settingsAutonomyButton = document.querySelector('[data-menu-toggle="autonomy-toggle"]');
  const setupAutonomyButton = $("#setup-autonomy");
  for (const button of [autonomyButton, setupAutonomyButton]) {
    button?.classList.toggle("is-on", autonomyEnabled);
    button?.setAttribute("aria-pressed", String(autonomyEnabled));
  }
  if (autonomyButton) autonomyButton.textContent = autonomyEnabled ? "◉ AUTONOMY ON" : "◉ AUTONOMY OFF";
  if (setupAutonomyButton) setupAutonomyButton.textContent = autonomyEnabled
    ? "CHARACTER AUTONOMY ON · OCCASIONAL HELPFUL OR CHAOTIC NUDGE"
    : "CHARACTER AUTONOMY OFF · YOU KEEP THE WHEEL";
  if (settingsAutonomyButton) settingsAutonomyButton.textContent = `CHARACTER AUTONOMY ${autonomyEnabled ? "ON" : "OFF"}`;
}


export function setNetworkStatus(message, connected = false) {
  $("#network-status").textContent = message;
  $("#connection-state-label").textContent = connected ? "ONLINE ROOM" : "LOCAL SESSION";
  $("#connection-state .status-dot").classList.toggle("paused-dot", !connected);
  const badge = document.querySelector(".comms-card .squad-status");
  badge.innerHTML = connected
    ? '<span class="status-dot"></span> ONLINE'
    : '<span class="status-dot paused-dot"></span> LOCAL';
}


export function setVoiceStatus(message) {
  $("#voice-status").textContent = message;
}


export function renderOnlineRoster(players = []) {
  const roster = $("#online-roster");
  roster.replaceChildren();
  for (const player of players) {
    const chip = document.createElement("span");
    chip.className = `online-player${player.team === "ghosts" ? " ghost-team" : ""}${player.id === roomSocket?.id ? " self" : ""}`;
    chip.textContent = `${player.name}${player.micReady ? " · MIC" : ""}`;
    roster.append(chip);
  }
}


export function setWizardStage(stage) {
  const active = stage === 'session' ? 'session' : 'character';
  setupScreen.dataset.setupStep = active;
  for (const panel of document.querySelectorAll('[data-wizard-stage]')) {
    panel.hidden = panel.dataset.wizardStage !== active;
  }
  $('#setup-stage-label').textContent = active === 'character' ? 'CHARACTER CREATION · 1 / 2' : 'CHOOSE YOUR RUN · 2 / 2';
}

