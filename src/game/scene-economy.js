// MazeScene mixin: inventory, hunger, xp/coins, missions, rebirth.

import { playTone } from "../audio.js";
import { INVENTORY_ITEMS } from "../character-content.js";
import { updateProgressUI } from "../hud.js";
import { formatScore, inventoryKey, postStats, saveProgress } from "../profile.js";
import { ABILITIES, WEAPONS, advanceQuest, awardCoins, awardXp, purchaseItem, rebirthProgression, unlockAbility } from "../progression.js";
import { assetUrl, overlay, overlayCopy, overlayKicker, overlayTitle, $ } from "../state.js";
import { appendChat, renderQuestBoard, renderShop, renderSkillTree, showToast, unlockAchievement } from "../ui.js";

export const EconomyMixin = {


    addInventoryItem(itemId, amount = 1) {
      const item = INVENTORY_ITEMS.find(({ id }) => id === itemId);
      if (!item || !Number.isSafeInteger(amount) || amount <= 0) return;
      this.inventory[itemId] = Math.min(999, (this.inventory[itemId] || 0) + amount);
      localStorage.setItem(inventoryKey(this.profile?.name), JSON.stringify(this.inventory));
      this.renderInventory();
      showToast(`+${amount} ${item.name.toUpperCase()}`, item.description);
    },


    renderInventory() {
      const list = $("#inventory-list");
      if (!list) return;
      list.replaceChildren();
      const equipment = $("#inventory-equipment");
      equipment.replaceChildren();
      const selectedAbility = ABILITIES[this.profile?.team || "pacmen"]
        .find(({ id }) => id === this.progression?.selectedAbility);
      for (const [label, value] of [
        ["WEAPON", WEAPONS.find(({ id }) => id === this.progression?.equippedWeapon)?.name || "Neon Chomper"],
        ["ARMOUR", this.profile?.team === "ghosts" ? "Shroud of Almost-Invincibility" : "Snack-Safe Shell"],
        ["ACTIVE", selectedAbility?.name || "Basic Slash"],
      ]) {
        const slot = document.createElement("div");
        slot.className = "equipment-slot";
        const heading = document.createElement("small");
        heading.textContent = label;
        const name = document.createElement("strong");
        name.textContent = value;
        slot.append(heading, name);
        equipment.append(slot);
      }
      for (const item of INVENTORY_ITEMS) {
        const row = document.createElement("li");
        row.className = "inventory-row";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "inventory-item-button";
        button.dataset.inventoryItem = item.id;
        button.disabled = !(this.inventory[item.id] > 0) || item.id === "echo-dust";
        button.setAttribute("aria-label", `${item.name}, ${this.inventory[item.id] || 0} available. ${item.description}`);
        // SVG icon
        const iconWrapper = document.createElement("span");
        iconWrapper.className = "inventory-icon-wrapper";
        const iconImg = document.createElement("img");
        iconImg.src = assetUrl(`assets/ui/icons/item-${item.id}.svg`);
        iconImg.alt = "";
        iconImg.width = 24;
        iconImg.height = 24;
        iconImg.style.display = "block";
        iconImg.style.margin = "0 auto";
        iconImg.style.filter = `drop-shadow(0 0 6px ${item.id === "arc-cell" ? "#ba9cff" : item.id === "wisp-fragment" ? "#53e2b4" : "#ffd94d"})`;
        iconWrapper.appendChild(iconImg);
        // Hover description tooltip
        const desc = document.createElement("div");
        desc.className = "item-tooltip";
        desc.textContent = item.description;
        desc.hidden = true;
        button.addEventListener("mouseenter", () => { desc.hidden = false; });
        button.addEventListener("mouseleave", () => { desc.hidden = true; });
        button.appendChild(desc);
        const text = document.createElement("span");
        const name = document.createElement("strong");
        name.textContent = item.name;
        const detail = document.createElement("small");
        detail.textContent = item.description;
        text.append(name, detail);
        const count = document.createElement("b");
        count.textContent = `×${this.inventory[item.id] || 0}`;
        button.append(iconWrapper, text, count);
        row.append(button);
        list.append(row);
      }
      for (let index = INVENTORY_ITEMS.length; index < 24; index += 1) {
        const empty = document.createElement("li");
        empty.className = "inventory-empty-slot";
        empty.setAttribute("aria-hidden", "true");
        list.append(empty);
      }
      for (const button of document.querySelectorAll("[data-hotbar-slot]")) {
        const item = INVENTORY_ITEMS.filter(({ hotbar }) => hotbar)[Number(button.dataset.hotbarSlot)];
        if (item) button.querySelector("b").textContent = String(this.inventory[item.id] || 0);
      }
    },


    useInventoryItem(itemId) {
      const count = this.inventory[itemId] || 0;
      if (!count) {
        showToast("EMPTY SLOT", "Find this drop in the maze first.", "warning");
        return;
      }
      if (itemId === "arc-cell") {
        this.pulseCharges = Math.min(9, this.pulseCharges + 2);
        $("#pulse-count").textContent = String(this.pulseCharges).padStart(2, "0");
        playTone(820, 0.16);
      } else if (itemId === "wisp-fragment") {
        this.player.shieldUntil = this.elapsed + 3500;
        this.playAbilityEffect("ability-runner-shield");
        playTone(540, 0.2);
      } else if (itemId === "star-flake") {
        this.hunger = Math.min(100, this.hunger + 30);
        updateProgressUI(this.progression, this.hunger, this.hearts);
        playTone(900, 0.14);
      } else if (INVENTORY_ITEMS.find(({ id }) => id === itemId)?.equipment === "weapon") {
        this.progression.equippedWeapon = itemId;
        saveProgress(this.progression, this.profile?.name);
        this.renderInventory();
        showToast("WEAPON EQUIPPED", WEAPONS.find(({ id }) => id === itemId)?.detail || "Ready to bonk.");
        playTone(700, 0.12);
        return;
      } else {
        return;
      }
      this.inventory[itemId] -= 1;
      localStorage.setItem(inventoryKey(this.profile?.name), JSON.stringify(this.inventory));
      this.renderInventory();
      showToast(`${INVENTORY_ITEMS.find(({ id }) => id === itemId).name.toUpperCase()} USED`, "A little maze magic goes a long way.");
    },


  updateHunger(delta) {
    if (this.profile?.sessionMode === "training") {
      if (this.hunger !== 100) {
        this.hunger = 100;
        updateProgressUI(this.progression, this.hunger, this.hearts);
      }
      return;
    }
    const previousHunger = this.hunger;
    this.hungerTick += delta;
    while (this.hungerTick >= 8000) {
      this.hungerTick -= 8000;
      this.hunger = Math.max(0, this.hunger - 1);
    }
    if (this.hunger === 0) {
      this.hungerDamageTick += delta;
      if (this.hungerDamageTick >= 12000) {
        this.hungerDamageTick = 0;
        this.damagePlayer("Hunger is empty. Find pellets or buy a ration.");
      }
    } else {
      this.hungerDamageTick = 0;
    }
    if (this.hunger !== previousHunger) updateProgressUI(this.progression, this.hunger, this.hearts);
  },


  gainExperience(amount) {
    const result = awardXp(this.progression, amount);
    this.progression = result.progress;
    saveProgress(this.progression, this.profile?.name);
    renderQuestBoard(this.progression);
    renderShop(this.progression);
    updateProgressUI(this.progression, this.hunger, this.hearts);
    if (result.levelsGained > 0) {
      showToast(`LEVEL ${this.progression.level}`, "Your maze instincts sharpened. Enemies adapt too.", "level");
      playTone(740, 0.34);
    }
  },


  gainCoins(amount, announce = false) {
    this.progression = awardCoins(this.progression, amount, this.profile?.team);
    saveProgress(this.progression, this.profile?.name);
    renderShop(this.progression);
    renderSkillTree(this.progression, this.profile.team);
    updateProgressUI(this.progression, this.hunger, this.hearts);
    if (announce) showToast(`+${amount} ${this.profile.team === "ghosts" ? "GHOST COINS" : "PACCOINS"}`, "A cache rewards your run.");
  },


  advanceMission(questId, amount = 1) {
    const result = advanceQuest(this.progression, questId, amount, this.profile?.team);
    this.progression = result.progress;
    saveProgress(this.progression, this.profile?.name);
    renderQuestBoard(this.progression);
    renderShop(this.progression);
    renderSkillTree(this.progression, this.profile.team);
    updateProgressUI(this.progression, this.hunger, this.hearts);
    if (result.completed) {
      showToast(`MISSION COMPLETE · ${result.quest.title}`, `+${result.quest.rewardXp} XP · +${result.quest.rewardCoins} ${this.profile.team === "ghosts" ? "Ghost Coins" : "PacCoins"}`, "quest");
      playTone(1046, 0.28);
      if (result.levelsGained > 0) showToast(`LEVEL ${this.progression.level}`, "New abilities grow from practice.", "level");
    }
  },


  buyItem(itemId) {
    const currency = this.profile?.team === "ghosts" ? "ghostCoins" : "pacCoins";
    const result = purchaseItem(this.progression, itemId, { hunger: this.hunger, currency });
    if (!result.ok) {
      showToast("NOT ENOUGH / NOT READY", result.error, "warning");
      playTone(190, 0.15);
      return;
    }
    this.progression = result.progress;
    this.hunger = result.hunger;
    this.hearts = Math.min(this.hearts + (itemId === "heart" ? 1 : 0), this.progression.maxHearts);
    saveProgress(this.progression, this.profile?.name);
    renderQuestBoard(this.progression);
    renderShop(this.progression);
    renderSkillTree(this.progression, this.profile.team);
    updateProgressUI(this.progression, this.hunger, this.hearts);
    if (itemId === "pulse") {
      this.pulseCharges = Math.min(9, this.pulseCharges + 1);
      $("#pulse-count").textContent = String(this.pulseCharges).padStart(2, "0");
    }
    showToast(`${result.item.title} ACQUIRED`, result.item.detail);
    playTone(940, 0.23);
  },


  buyAbility(abilityId) {
    const result = unlockAbility(this.progression, abilityId, this.profile.team);
    if (!result.ok) {
      showToast("ABILITY LOCKED", result.error, "warning");
      return;
    }
    this.progression = result.progress;
    saveProgress(this.progression, this.profile.name);
    renderSkillTree(this.progression, this.profile.team);
    this.renderInventory();
    updateProgressUI(this.progression, this.hunger, this.hearts);
    showToast(`${result.alreadyUnlocked ? "EQUIPPED" : "UNLOCKED"} · ${result.ability.name.toUpperCase()}`, "Press R to cast your active ability.");
    playTone(920, 0.18);
  },


  rebirth() {
    const result = rebirthProgression(this.progression, this.profile.team);
    if (!result.ok) {
      showToast("REBIRTH NOT READY", result.error, "warning");
      return;
    }
    this.progression = result.progress;
    this.hearts = this.progression.maxHearts;
    this.player.health = this.hearts;
    saveProgress(this.progression, this.profile.name);
    renderSkillTree(this.progression, this.profile.team);
    renderShop(this.progression);
    updateProgressUI(this.progression, this.hunger, this.hearts);
    unlockAchievement("first-rebirth");
    appendChat("ADVANCEMENT", `${this.profile.name} rebirthed. Same maze, fewer excuses.`, "achievement-chat");
    showToast(`REBIRTH ${this.progression.rebirths}`, "Permanent power increased. Your unlocked skills reset; the maze remains smug.", "level");
  },


  publishStats() {
    postStats({ score: this.score, lives: this.hearts });
    updateProgressUI(this.progression, this.hunger, this.hearts);
  },


  finish(won) {
    if (this.finished) return;
    this.finished = true;
    this.player.gameEnding = won ? "victory" : "defeat";
    this.drawEntities();
    overlayKicker.textContent = won ? "MAZE COMPLETE" : "GAME OVER";
    overlayTitle.textContent = won ? "Nice run." : "The maze got you.";
    overlayCopy.textContent = `Final score: ${formatScore(this.score)} · Level ${this.progression.level} · ${this.progression.coins} coins. Ready for another?`;
    overlay.hidden = false;
    this.events.emit("game-over");
  }

};

