// Standalone skill-tree upgrade screen, reachable from the setup screen and
// completely separate from the maze. Operates on the saved progression, which
// is the same store the maze scene loads at run start.

import { playGameSound, sayNarrated } from "./audio.js";
import { $, profile } from "./state.js";
import { loadProgress, saveProgress } from "./profile.js";
import { ABILITIES, rebirthProgression } from "./progression.js";
import { showToast } from "./ui.js";

let activeFaction = "pacmen";

export function openSkillsScreen(faction = profile?.team || "pacmen") {
  activeFaction = faction === "ghosts" ? "ghosts" : "pacmen";
  renderSkillsScreen();
  $("#skills-screen").hidden = false;
  playGameSound("select");
}


function renderSkillsScreen() {
  const name = profile?.name || "guest";
  const progress = loadProgress(name, activeFaction);
  for (const tab of document.querySelectorAll("[data-skills-faction]")) {
    const active = tab.dataset.skillsFaction === activeFaction;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-pressed", String(active));
  }
  const abilities = ABILITIES[activeFaction] || ABILITIES.pacmen;
  const walletKey = activeFaction === "ghosts" ? "ghostCoins" : "pacCoins";
  const wallet = progress[walletKey];
  const canEquipFaction = (profile?.team || "pacmen") === activeFaction;
  $("#skills-wallet").textContent = `${activeFaction === "ghosts" ? "GHOST TRACK" : "PAC-MEN TRACK"} · LEVEL ${progress.level} · ${wallet} ${activeFaction === "ghosts" ? "GHOST COINS" : "PACCOINS"}`;
  const body = $("#skills-tree-body");
  body.replaceChildren();
  for (const ability of abilities) {
    const unlocked = progress.unlockedAbilities.includes(ability.id);
    const selected = unlocked && canEquipFaction && progress.selectedAbility === ability.id;
    const affordable = progress.level >= ability.minLevel && wallet >= ability.cost;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `skill-node${unlocked ? " is-unlocked" : ""}${selected ? " is-equipped" : ""}`;
    button.dataset.skillsAbility = ability.id;
    button.disabled = !unlocked && !affordable;
    const icon = document.createElement("img");
    icon.className = "skill-node-icon";
    icon.src = `assets/ui/icons/ability-${ability.id}.svg`;
    icon.alt = "";
    icon.width = 24;
    icon.height = 24;
    icon.style.display = "block";
    icon.style.margin = "0 auto";
    const copy = document.createElement("span");
    copy.className = "skill-node-copy";
    const label = document.createElement("strong");
    label.textContent = ability.name;
    const detail = document.createElement("small");
    detail.textContent = selected ? "EQUIPPED · R TO CAST IN THE MAZE" : unlocked
      ? ability.detail
      : `LEVEL ${ability.minLevel} · ${ability.cost} ${activeFaction === "ghosts" ? "GC" : "PC"} · ${ability.detail}`;
    copy.append(label, detail);
    const status = document.createElement("b");
    status.textContent = selected ? "ACTIVE" : unlocked
      ? canEquipFaction ? "EQUIP" : "OWNED"
      : `UNLOCK · ${ability.cost}`;
    button.append(icon, copy, status);
    body.append(button);
  }
  const panel = $("#skills-rebirth-panel");
  const canRebirth = progress.level >= 10 && progress.rebirths < 5;
  panel.replaceChildren();
  const copy = document.createElement("p");
  copy.textContent = `REBIRTH ${progress.rebirths}/5 · Reach level 10 to reset levels and skill unlocks for permanent power +1 and a heart. Entirely optional.`;
  const rebirthButton = document.createElement("button");
  rebirthButton.type = "button";
  rebirthButton.className = "button button-quiet";
  rebirthButton.dataset.skillsRebirth = "true";
  rebirthButton.disabled = !canRebirth;
  rebirthButton.textContent = canRebirth ? "REBIRTH · GROW STRONGER"
    : progress.rebirths >= 5 ? "FULLY AWAKENED" : `REBIRTH UNLOCKS AT LEVEL 10 · ${progress.level}/10`;
  panel.append(copy, rebirthButton);
}


function handleSkillsClick(event) {
  const node = event.target.closest("[data-skills-ability]");
  const name = profile?.name || "guest";
  if (node) {
    const progress = loadProgress(name, activeFaction);
    const ability = (ABILITIES[activeFaction] || []).find(({ id }) => id === node.dataset.skillsAbility);
    if (!ability) return;
    const canEquipFaction = (profile?.team || "pacmen") === activeFaction;
    if (progress.unlockedAbilities.includes(ability.id)) {
      if (!canEquipFaction) {
        showToast("SWITCH RACE TO EQUIP", `Switch to the ${activeFaction === "ghosts" ? "Ghosts" : "Pac-Men"} on the creation screen to equip this ability.`, "warning");
        return;
      }
      progress.selectedAbility = ability.id;
      saveProgress(progress);
      showToast("ABILITY EQUIPPED", `${ability.name} is ready. Press R in the maze to cast it.`, "quest");
      playGameSound("select");
      renderSkillsScreen();
      return;
    }
    const walletKey = activeFaction === "ghosts" ? "ghostCoins" : "pacCoins";
    if (progress.level < ability.minLevel || progress[walletKey] < ability.cost) return;
    progress[walletKey] -= ability.cost;
    progress.unlockedAbilities.push(ability.id);
    saveProgress(progress);
    showToast("ABILITY UNLOCKED", `${ability.name} added to your ${activeFaction === "ghosts" ? "Ghost" : "Pac-Man"} tree.`, "level");
    sayNarrated(`${ability.name} unlocked. ${ability.detail}`);
    playGameSound("ability");
    renderSkillsScreen();
    return;
  }
  if (event.target.closest("[data-skills-rebirth]")) {
    const progress = loadProgress(name, activeFaction);
    if (progress.level < 10 || progress.rebirths >= 5) return;
    const next = rebirthProgression(progress, activeFaction);
    saveProgress(next);
    showToast(`REBIRTH ${next.rebirths}`, "Permanent power increased. Levels and unlocks reset.", "level");
    playGameSound("ability");
    renderSkillsScreen();
  }
}


export function bindSkillsScreen() {
  $("#setup-skills-button")?.addEventListener("click", () => openSkillsScreen(profile?.team || "pacmen"));
  $("#skills-close")?.addEventListener("click", () => {
    $("#skills-screen").hidden = true;
    playGameSound("select");
  });
  for (const tab of document.querySelectorAll("[data-skills-faction]")) {
    tab.addEventListener("click", () => {
      activeFaction = tab.dataset.skillsFaction === "ghosts" ? "ghosts" : "pacmen";
      renderSkillsScreen();
      playGameSound("select");
    });
  }
  $("#skills-tree-body")?.addEventListener("click", handleSkillsClick);
  $("#skills-rebirth-panel")?.addEventListener("click", handleSkillsClick);
}
