// MazeScene mixin: pellet events, betrayal/panic stories and taming flow.

import { playGameSound, playTone, sayNarrated, sayNarratedTimed } from "../audio.js";
import { NPC_DIALOGUE, pickDialogue } from "../character-content.js";
import { GHOST_PANIC_DURATION, PELLET_EVENT_COOLDOWN, POWER_DURATION } from "../constants.js";
import { roomSocket } from "../network.js";
import { appendChat, showToast, unlockAchievement } from "../ui.js";

export const StoryMixin = {


    startPowerStoryEvent(pacman, broadcast) {
      this.remotePowerUntil = this.elapsed + POWER_DURATION;
      const targets = this.ghosts.slice(0, 2);
      targets.forEach((ghost, index) => {
        this.time.delayedCall(index * 520, () => {
          if (!this.scene.isActive() || this.finished) return;
          const line = pickDialogue(NPC_DIALOGUE.powerWarning);
          appendChat(ghost.name || "WISP RADIO", line, "npc-chat");
          this.showBubble(ghost, line, 2100);
          sayNarrated(line);
        });
      });
      if (broadcast && roomSocket?.connected) {
        roomSocket.emit("story:event", { type: "pacman-power" });
      }
      const alert = this.profile?.team === "ghosts"
        ? `${pacman.name || "A Pac-Man"} ate a power pellet. The ghost crew is vulnerable!`
        : "A power pellet has the ghost crew running for cover.";
      showToast("STORY EVENT · POWER PELLET", alert, "warning");
    },


    handleNetworkStoryEvent(storyEvent) {
      if (storyEvent?.type !== "pacman-power" || this.profile?.team !== "ghosts") return;
      this.remotePowerUntil = this.elapsed + Math.min(POWER_DURATION, Math.max(0, Number(storyEvent.duration) || POWER_DURATION));
      const line = `${storyEvent.name || "A Pac-Man"} ate a power pellet! We have 45 seconds to stay clear!`;
      appendChat("WISP RADIO", line, "npc-chat");
      const speaker = this.ghosts[0];
      if (speaker) this.showBubble(speaker, line, 2100);
      showToast("STORY EVENT · POWER PELLET", "The Ghost crew is vulnerable for 45 seconds.", "warning");
    },


    startPelletEvent(pacman, cell) {
      if (this.pelletEventActive || this.elapsed < this.pelletEventCooldownUntil) return;
      this.pelletEventActive = true;
      this.pelletEventUntil = this.elapsed + POWER_DURATION;
      this.pelletEventPacman = pacman;
      this.pelletEventWarned = false;
      this.pelletEventCooldownUntil = this.elapsed + PELLET_EVENT_COOLDOWN;
      playGameSound("chomp");
      playTone(660, 0.15);
      this.triggerGhostPanic();
      const isPlayer = pacman === this.player;
      const pacName = pacman?.name || (isPlayer ? "You" : "A Pac-Man");
      if (this.profile?.team === "ghosts") {
        const line = pickDialogue(NPC_DIALOGUE.ghostPanic);
        appendChat("WISP RADIO", line, "npc-chat");
        const speaker = this.ghosts[0];
        if (speaker) this.showBubble(speaker, line, 2200);
        sayNarratedTimed(line, 200, "urgent");
        showToast("STORY EVENT · POWER PELLET", `${pacName} ate a power pellet. Ghosts are vulnerable!`, "warning");
      } else {
        const line = pickDialogue(NPC_DIALOGUE.pacmanPower);
        this.showBubble(pacman, line, 1500);
        appendChat(pacName, line, "npc-chat");
        sayNarratedTimed(line, 100);
      }
    },


    endPelletEvent() {
      if (!this.pelletEventActive) return;
      this.pelletEventActive = false;
      this.pelletEventPacman = null;
      this.pelletEventWarned = false;
    },


    triggerGhostPanic() {
      const now = this.elapsed;
      const allGhosts = [...this.ghosts, ...this.ambientNpcs.filter((npc) => npc.kind === "ghost" && !npc.tamed)];
      if (this.profile?.team === "ghosts") allGhosts.push(this.player);
      for (const ghost of allGhosts) {
        if (ghost.eaten) continue;
        ghost.panicUntil = now + GHOST_PANIC_DURATION;
        ghost.eatState = "fright";
        ghost.eatStartedAt = now;
        const line = pickDialogue(NPC_DIALOGUE.ghostPlayerPanic);
        if (ghost === this.player) {
          this.showBubble(ghost, line, 2400);
          sayNarratedTimed(line, 300);
        } else if (Math.abs(ghost.x - this.player.x) + Math.abs(ghost.y - this.player.y) <= 6) {
          this.showBubble(ghost, line, 1800);
          sayNarratedTimed(line, 500);
        }
      }
    },


    tameNearby() {
      const target = this.nearestWeakenedGhost();
      if (!target) {
        showToast("NO WISP CLOSE ENOUGH", this.profile?.team === "ghosts"
          ? "Taming rivals is a Pac-Men skill in this version."
          : "Pulse a wisp, soften it with attacks, or catch it during a power burst; then press T nearby.", "warning");
        return;
      }

      // If already taming this target, advance progress
      if (this.tamingTarget === target) {
        this.tamingProgress = Math.min(100, this.tamingProgress + 25);
        this.tamingStartedAt = this.elapsed;
        const line = pickDialogue(NPC_DIALOGUE.combat);
        appendChat(target.name || "WISP", line, "npc-chat");
        this.showBubble(target, "Keep pressing T!", 800);
        if (this.tamingProgress >= 100) {
          this.completeTame(target);
        }
        this.updateTameUI();
        return;
      }

      // Start taming a new target
      this.tamingTarget = target;
      this.tamingProgress = 10;
      this.tamingStartedAt = this.elapsed;
      this.tameFightBackAt = this.elapsed;
      this.player.invulnerableUntil = this.elapsed + 3000;
      showToast("TAME IN PROGRESS", "Press T again to tame — the wisp will fight back!", "quest");
      appendChat(target.name || "WISP", "Hey! Let go of me!", "npc-chat");
      this.showBubble(target, "HEY! LET GO!", 1500);
      this.updateTameUI();
    },


    updateTameUI() {
      const button = document.getElementById("tame-button");
      const bar = document.getElementById("tame-progress");
      const fill = document.getElementById("tame-fill");
      if (!button || !bar || !fill) return;
      if (this.tamingTarget) {
        button.hidden = false;
        bar.hidden = false;
        const pct = Math.max(0, Math.min(100, this.tamingProgress));
        fill.style.width = `${pct}%`;
        fill.style.background = pct < 40 ? "#ff6c87" : pct < 70 ? "#ffe477" : "#53e2b4";
      } else {
        button.hidden = true;
        bar.hidden = true;
      }
    },


    completeTame(target) {
      if (!target) return;
      this.clearTameState();
      const targetName = target.name || `Wisp ${target.index + 1}`;
      const activeIndex = this.ghosts.indexOf(target);
      if (activeIndex >= 0) {
        this.ghosts.splice(activeIndex, 1);
        this.ghostTicks.splice(activeIndex, 1);
        this.ghosts.forEach((ghost, index) => { ghost.index = index; });
      } else {
        this.ambientNpcs = this.ambientNpcs.filter((npc) => npc !== target);
      }
      target.tamed = true;
      target.name = `${targetName} · ally`;
      target.team = "companions";
      target.kind = "ghost";
      target.eaten = false;
      target.rebuildStartedAt = 0;
      target.stunnedUntil = 0;
      target.health = target.maxHealth;
      this.tamedCompanions.push(target);
      this.advanceMission("ghost-whisperer");
      this.gainExperience(80);
      this.gainCoins(20, true);
      this.addInventoryItem("echo-dust");
      unlockAchievement("first-tame", target);
      appendChat(targetName, "I have your back. Let's find a way through. Probably.", "npc-chat");
      this.showBubble(target, "I have your back!", 2200);
      showToast("NEW ALLY · " + targetName.toUpperCase(), "Your new wisp companion joins the run.");
      this.runBetrayalStory(target);
    },


    clearTameState() {
      this.tamingTarget = null;
      this.tamingProgress = 0;
      this.tamingStartedAt = 0;
      this.tameFightBackAt = 0;
      this.clearTamingGraphics();
      this.updateTameUI();
    },


    updateTaming(delta) {
      if (!this.tamingTarget) return;
      // Decay progress over time (ghost fights back)
      if (this.elapsed >= this.tameFightBackAt + 400) {
        this.tamingProgress = Math.max(0, this.tamingProgress - 5);
        this.tameFightBackAt = this.elapsed;
      }
      // Cancel if target is no longer valid (eaten, dead, too far)
      if (this.tamingTarget.eaten || this.tamingTarget.health <= 0) {
        this.clearTameState();
        showToast("TAME CANCELLED", "The wisp slipped away.", "warning");
        return;
      }
      const dist = Math.abs(this.tamingTarget.x - this.player.x) + Math.abs(this.tamingTarget.y - this.player.y);
      if (dist > 5) {
        this.clearTameState();
        showToast("TAME CANCELLED", "The wisp got away.", "warning");
        return;
      }
      if (this.tamingProgress <= 0) {
        this.clearTameState();
        showToast("TAME FAILED", "The wisp fought back and broke free.", "warning");
        appendChat(this.tamingTarget?.name || "WISP", "Get off me!", "npc-chat");
        return;
      }
    },


    updatePelletForms(delta) {
      // Player pellet form expiration
      if (this.player.pelletForm && this.elapsed >= this.player.pelletFormUntil) {
        const form = this.player.pelletForm;
        this.player.pelletForm = null;
        this.player.pelletFormUntil = 0;
        const formEndLines = {
          speed: "Speed form faded.",
          crunch: "Crunch jaws returned to normal.",
          phase: "Enemy phase faded. Maze walls were solid the whole time.",
          shield: "Sugar shield dissolved.",
        };
        this.showBubble(this.player, formEndLines[form], 1500);
      }
      // NPC Pacman pellet form expiration
      for (const bot of this.pacmanBots) {
        if (bot.pelletForm && this.elapsed >= bot.pelletFormUntil) {
          bot.pelletForm = null;
          bot.pelletFormUntil = 0;
        }
      }
      for (const npc of this.ambientNpcs) {
        if (npc.pelletForm && this.elapsed >= npc.pelletFormUntil) {
          npc.pelletForm = null;
          npc.pelletFormUntil = 0;
        }
      }
    },


    runBetrayalStory(target) {
      if (this.betrayalPlayed) return;
      this.betrayalPlayed = true;
      localStorage.setItem(`neon-maze-betrayal:${this.profile.name.toLowerCase()}`, "true");
      const storyGhost = this.ghosts[0] || this.ambientNpcs.find((npc) => npc.kind === "ghost");
      if (!storyGhost) return;
      this.betrayalTarget = target;
      this.betrayalStory = { startedAt: this.elapsed, step: 0, ghost: storyGhost };
    },


    updateBetrayalStory() {
      const story = this.betrayalStory;
      if (!story) return;
      const age = this.elapsed - story.startedAt;
      if (story.step === 0 && age >= 450) {
        const line = pickDialogue(NPC_DIALOGUE.betrayal);
        appendChat(story.ghost.name || "WISP SQUAD", line, "npc-chat");
        this.showBubble(story.ghost, line, 1700);
        story.step = 1;
      } else if (story.step === 1 && age >= 1500) {
        this.betrayalTarget.betrayalStage = "eyes";
        this.showBubble(this.betrayalTarget, "I can see my thoughts!", 1400);
        appendChat(this.betrayalTarget.name, "I can see my thoughts!", "npc-chat");
        story.step = 2;
      } else if (story.step === 2 && age >= 2900) {
        this.betrayalTarget.betrayalStage = "rebuild";
        this.betrayalTarget.betrayalRebuildUntil = this.elapsed + 1800;
        this.showBubble(story.ghost, "All right, all right. Put your face back on.", 1600);
        story.step = 3;
      } else if (story.step === 3 && age >= 4700) {
        this.betrayalTarget.betrayalStage = "";
        const line = pickDialogue(NPC_DIALOGUE.reunion);
        this.showBubble(this.betrayalTarget, line, 2200);
        appendChat(this.betrayalTarget.name, line, "npc-chat");
        this.betrayalStory = null;
      }
    }

};

