// MazeScene mixin: pause menu, in-game menu pages, NPC talk, chat bubbles.

import { NPC_DIALOGUE, pickDialogue } from "../character-content.js";
import { TILE } from "../constants.js";
import { bubbleEnabled, $ } from "../state.js";
import { appendChat, renderSkillTree, showToast } from "../ui.js";

export const MenusMixin = {


  showBubble(actor, message, duration) {
    if (!bubbleEnabled || !actor) return null;
    actor.bubble?.destroy();
    const point = this.centerOf(actor.x, actor.y);
    const bubble = this.add.text(point.x, point.y - TILE * 1.08, message, {
      color: "#eef6ff",
      backgroundColor: "#07101c",
      fontFamily: "Bahnschrift, Segoe UI, sans-serif",
      fontSize: "14px",
      padding: { left: 11, right: 11, top: 8, bottom: 8 },
      wordWrap: { width: 220 },
    }).setOrigin(0.5, 1).setDepth(6);
    bubble.setStroke("#4eddea", 1);
    actor.bubble = bubble;
    actor.typingBubble = message === "···" ? bubble : null;
    this.time.delayedCall(duration, () => {
      if (actor.bubble !== bubble) return;
      actor.bubble = null;
      actor.typingBubble = null;
      bubble.destroy();
    });
    return bubble;
  },


  togglePause() {
    if (this.finished) return;
    this.paused = !this.paused;
    window.dispatchEvent(new CustomEvent("game:pause-state", { detail: this.paused }));
  },


  openGameMenu(page = "inventory") {
    if ($("#game-menu").hidden) {
      this.menuReturnToNormal = !document.body.classList.contains("immersive-game");
    }
    document.body.classList.add("immersive-game");
    this.scale.refresh();
    this.paused = true;
    const menu = $("#game-menu");
    menu.hidden = false;
    this.showGameMenuPage(page);
    window.dispatchEvent(new CustomEvent("game:pause-state", { detail: true }));
  },


  closeGameMenu() {
    $("#game-menu").hidden = true;
    this.paused = false;
    window.dispatchEvent(new CustomEvent("game:pause-state", { detail: false }));
    if (this.menuReturnToNormal && !document.fullscreenElement) {
      document.body.classList.remove("immersive-game");
    }
    this.scale.refresh();
    this.menuReturnToNormal = false;
  },


  showGameMenuPage(page) {
    const validPages = ["inventory", "skills", "missions", "settings"];
    const activePage = validPages.includes(page) ? page : "inventory";
    for (const tab of document.querySelectorAll("[data-game-tab]")) {
      const selected = tab.dataset.gameTab === activePage;
      tab.setAttribute("aria-selected", String(selected));
    }
    for (const panel of document.querySelectorAll(".game-menu-page")) {
      panel.hidden = panel.id !== `game-menu-${activePage}`;
    }
    $("#game-menu-title").textContent = activePage[0].toUpperCase() + activePage.slice(1);
    if (activePage === "inventory") this.renderInventory();
    if (activePage === "skills") renderSkillTree(this.progression, this.profile.team);
    if (activePage === "missions") {
      const source = $("#quest-list").cloneNode(true);
      source.removeAttribute("id");
      $("#game-menu-missions").replaceChildren(source);
    }
  },


  talkNearby() {
    const actor = [...this.ambientNpcs, ...this.tamedCompanions]
      .map((npc) => ({ npc, distance: Math.abs(npc.x - this.player.x) + Math.abs(npc.y - this.player.y) }))
      .filter(({ distance }) => distance <= 2)
      .sort((a, b) => a.distance - b.distance)[0]?.npc;
    if (!actor) {
      showToast("NOBODY NEARBY", "Find one of the maze locals and press G to talk.", "warning");
      return;
    }
    const line = pickDialogue(NPC_DIALOGUE.talk);
    appendChat(actor.name || "MAZE LOCAL", line, "npc-chat");
    this.showBubble(actor, line, 2400);
  }

};

