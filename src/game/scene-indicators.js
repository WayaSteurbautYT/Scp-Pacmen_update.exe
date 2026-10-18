// MazeScene mixin: target-lock, taming and dropped-item indicators.

import { playGameSound, playTone } from "../audio.js";
import { INVENTORY_ITEMS } from "../character-content.js";
import { TILE } from "../constants.js";
import { isOpen } from "../maze.js";
import { WEAPONS } from "../progression.js";
import { showToast } from "../ui.js";

export const IndicatorsMixin = {


  useDash() {
    if (!this.started || this.player.dashReadyAt > this.elapsed) return;
    const isGhost = this.profile?.team === "ghosts";
    if (isGhost) this.player.phaseUntil = this.elapsed + 800;
    else this.player.dashUntil = this.elapsed + 800;
    this.player.dashReadyAt = this.elapsed + 3600;
    this.playerTick = Math.min(this.playerTick, 61);
    this.playAbilityEffect(isGhost ? "ability-ghost-track" : "ability-dash");
    showToast(isGhost ? "PHASE SLIP" : "DASH", isGhost
      ? "The wisp blinks through the hunt and surges ahead."
      : "Quick feet, no feet. The runner speeds up briefly.");
    playTone(650, 0.12);
  },


  toggleTargetLock() {
    if (!this.started || this.paused) return;
    if (this.lockedTarget) {
      this.lockedTarget = null;
      this.clearTargetLockGraphics();
      this.updateTargetLockUI();
      return;
    }
    const opponents = this.combatOpponents();
    const reachable = opponents.filter((actor) => {
      const dist = Math.abs(actor.x - this.player.x) + Math.abs(actor.y - this.player.y);
      return dist > 0 && dist <= 8 && isOpen(this.maze, actor.x, actor.y);
    });
    if (reachable.length === 0) {
      showToast("TARGET LOCK", "No reachable enemy in range.", "warning");
      playGameSound("cooldown");
      return;
    }
    reachable.sort((a, b) =>
      Math.abs(a.x - this.player.x) + Math.abs(a.y - this.player.y)
      - Math.abs(b.x - this.player.x) - Math.abs(b.y - this.player.y),
    );
    this.lockedTarget = reachable[0];
    this.updateTargetLockUI();
    showToast("TARGET LOCKED", this.lockedTarget.name || "ENEMY", "quest");
    playGameSound("ability");
  },


  updateTargetLockUI() {
    const button = document.getElementById("target-lock-button");
    const status = document.getElementById("target-lock-status");
    if (!button) return;
    if (this.lockedTarget) {
      button.classList.add("is-locked");
      status.textContent = this.lockedTarget.name || "TARGET";
      status.style.color = "#ff6c87";
    } else {
      button.classList.remove("is-locked");
      status.textContent = "—";
      status.style.color = "";
    }
  },


  drawTargetLockIndicator() {
    if (!this.lockedTarget) {
      if (this.targetLockRing) { this.targetLockRing.setVisible(false); this.targetLockCrossX.setVisible(false); this.targetLockCrossY.setVisible(false); }
      return;
    }
    const point = this.centerOf(this.lockedTarget.x, this.lockedTarget.y);
    if (!this.targetLockRing) {
      this.targetLockRing = this.add.circle(point.x, point.y, TILE * 0.9, 0xff6c87, 0.15)
        .setStrokeStyle(2, 0xff6c87, 0.9)
        .setDepth(9);
      this.tweens.add({ targets: this.targetLockRing, alpha: 0.4, scale: 1.3, duration: 800, yoyo: true, repeat: -1 });
      this.targetLockCrossX = this.add.line(point.x, point.y, -TILE * 0.7, 0, TILE * 0.7, 0, 0xff6c87).setLineWidth(2).setDepth(9);
      this.targetLockCrossY = this.add.line(point.x, point.y, 0, -TILE * 0.7, 0, TILE * 0.7, 0xff6c87).setLineWidth(2).setDepth(9);
      this.tweens.add({ targets: [this.targetLockCrossX, this.targetLockCrossY], alpha: 0, duration: 600, yoyo: true, repeat: -1 });
    }
    this.targetLockRing.setPosition(point.x, point.y).setVisible(true);
    this.targetLockCrossX.setPosition(point.x, point.y).setVisible(true);
    this.targetLockCrossY.setPosition(point.x, point.y).setVisible(true);
  },


  clearTargetLockGraphics() {
    if (this.targetLockRing) { try { this.targetLockRing.destroy(); } catch (e) {} this.targetLockRing = null; }
    if (this.targetLockCrossX) { try { this.targetLockCrossX.destroy(); } catch (e) {} this.targetLockCrossX = null; }
    if (this.targetLockCrossY) { try { this.targetLockCrossY.destroy(); } catch (e) {} this.targetLockCrossY = null; }
  },


  drawTamingIndicator() {
    if (!this.tamingTarget) {
      if (this.tamingRing) { this.tamingRing.setVisible(false); this.tamingBar.setVisible(false); this.tamingFill.setVisible(false); }
      return;
    }
    const point = this.centerOf(this.tamingTarget.x, this.tamingTarget.y);
    const pct = Math.max(0, Math.min(100, this.tamingProgress));
    if (!this.tamingRing) {
      this.tamingRing = this.add.circle(point.x, point.y, TILE * 0.85, 0x53e2b4, 0.2)
        .setStrokeStyle(2, 0x53e2b4, 0.9)
        .setDepth(9);
      this.tweens.add({ targets: this.tamingRing, alpha: 0.5, scale: 1.3, duration: 700, yoyo: true, repeat: -1 });
      this.tamingBar = this.add.rectangle(point.x, point.y - TILE * 1.1, TILE * 0.9, 4, 0x162a40).setDepth(9);
      this.tamingFill = this.add.rectangle(point.x, point.y - TILE * 1.1, 0, 4, 0x53e2b4).setDepth(9);
    }
    this.tamingRing.setPosition(point.x, point.y).setVisible(true);
    this.tamingBar.setPosition(point.x, point.y - TILE * 1.1).setVisible(true);
    this.tamingFill.setPosition(point.x - TILE * 0.45 + (TILE * 0.9 * pct / 100), point.y - TILE * 1.1).setDisplaySize(TILE * 0.9 * pct / 100, 4).setVisible(true);
  },


  clearTamingGraphics() {
    if (this.tamingRing) { try { this.tamingRing.destroy(); } catch (e) {} this.tamingRing = null; }
    if (this.tamingBar) { try { this.tamingBar.destroy(); } catch (e) {} this.tamingBar = null; }
    if (this.tamingFill) { try { this.tamingFill.destroy(); } catch (e) {} this.tamingFill = null; }
  },


  drawDroppedItems() {
    if (!this.droppedItems || this.droppedItems.length === 0) return;
    for (const item of this.droppedItems) {
      if (item.collected) continue;
      const point = this.centerOf(item.x, item.y);
      let gfx = this.droppedItemGraphics.get(item);
      if (!gfx) {
        gfx = {
          ring: this.add.circle(point.x, point.y, TILE * 0.5, item.color, 0.25)
            .setStrokeStyle(2, item.color, 0.9)
            .setDepth(8),
          label: this.add.text(point.x, point.y - TILE * 1.15, item.itemName, {
            color: "#e4f2ff", stroke: "#000000", strokeThickness: 3,
            fontFamily: "monospace", fontSize: "9px", fontStyle: "bold",
          }).setOrigin(0.5).setDepth(8),
        };
        this.tweens.add({ targets: gfx.ring, alpha: 0.5, scale: 1.25, duration: 800, yoyo: true, repeat: -1 });
        this.droppedItemGraphics.set(item, gfx);
      }
      gfx.ring.setPosition(point.x, point.y).setVisible(true);
      gfx.label.setPosition(point.x, point.y - TILE * 1.15).setVisible(true);
      // Only re-rasterise the label when its text changes.
      if (gfx.label.text !== item.itemName) gfx.label.setText(item.itemName);
    }
  },


  clearDroppedItemGraphics() {
    for (const [item, gfx] of this.droppedItemGraphics) {
      try { gfx.ring.destroy(); } catch (e) {}
      try { gfx.label.destroy(); } catch (e) {}
    }
    this.droppedItemGraphics.clear();
  },


  dropItem(x, y, itemId, itemName, color) {
    this.droppedItems.push({
      x, y, itemId, itemName, color,
      droppedAt: this.elapsed,
      collected: false,
    });
  },


  collectDroppedItem(item) {
    const index = this.droppedItems.indexOf(item);
    if (index >= 0) this.droppedItems.splice(index, 1);
    const gfx = this.droppedItemGraphics.get(item);
    if (gfx) {
      try { gfx.ring.destroy(); } catch (e) {}
      try { gfx.label.destroy(); } catch (e) {}
      this.droppedItemGraphics.delete(item);
    }
    const itemDef = INVENTORY_ITEMS.find(({ id }) => item.itemId === id);
    if (itemDef) {
      this.addInventoryItem(item.itemId, 1);
      showToast("ITEM PICKED UP", itemDef.name, "quest");
    } else {
      const weapon = WEAPONS.find(({ id }) => item.itemId === id);
      if (weapon) {
        this.progression.equippedWeapon = weapon.id;
        localStorage.setItem(`neon-maze-progression:${this.profile.name.toLowerCase()}`, JSON.stringify(this.progression));
        showToast("WEAPON EQUIPPED", weapon.name, "quest");
      }
    }
    playTone(880, 0.16);
  }

};

