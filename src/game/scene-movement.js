// MazeScene mixin: player/ghost movement helpers.

import { playTone, sayNarratedTimed } from "../audio.js";
import { POWER_DURATION } from "../constants.js";
import { GHOST_STARTS, ROWS, findNextStep, isOpen } from "../maze.js";
import { $ } from "../state.js";

export const MovementMixin = {


  movePlayer() {
    if (this.player.braking) return;
    if (this.player.queuedDirection) {
      const next = this.nextPosition(this.player, this.player.queuedDirection);
      if (isOpen(this.maze, next.x, next.y)) {
        if (this.player.direction !== this.player.queuedDirection) this.player.turnUntil = this.elapsed + 180;
        this.player.direction = this.player.queuedDirection;
      }
    }
    this.player.queuedDirection = null;
    let next = this.nextPosition(this.player, this.player.direction);
    if (!isOpen(this.maze, next.x, next.y) && this.expandAtBoundary(this.player.direction)) {
      next = this.nextPosition(this.player, this.player.direction);
    }
    if (!isOpen(this.maze, next.x, next.y)) return;
    this.player.x = next.x;
    this.player.y = next.y;
    this.player.movedAt = this.elapsed;
    const cell = this.maze[this.player.y][this.player.x];
    if (cell === "." || cell === "O" || cell === "W") {
      this.maze[this.player.y][this.player.x] = " ";
      this.score += cell === "O" ? 50 : cell === "W" ? 100 : 10;
      this.player.eatingUntil = this.elapsed + 180;
      this.hunger = Math.min(100, this.hunger + (cell === "O" ? 12 : cell === "W" ? 8 : 0.06));
      if (cell === "W") {
        this.pulseCharges = Math.min(this.pulseCharges + 2, 9);
        this.addInventoryItem("arc-cell");
        $("#pulse-count").textContent = String(this.pulseCharges).padStart(2, "0");
        this.gainExperience(8);
        this.gainCoins(3, true);
      } else {
        this.pelletsEaten += 1;
        if (cell === ".") {
          this.gainExperience(4);
          this.gainCoins(1);
          this.advanceMission("trailblazer");
          if (this.pelletsEaten % 12 === 0) this.addInventoryItem("star-flake");
        }
      }
      this.drawPellets();
      playTone(cell === "O" ? 880 : cell === "W" ? 330 : 520, cell === "O" || cell === "W" ? 0.2 : 0.055);
      if (cell === "O") {
        this.powerOrbCount += 1;
        const isPlayerPacman = this.profile.team === "pacmen";
        if (isPlayerPacman) {
          this.powerUntil = this.elapsed + POWER_DURATION;
          this.player.powerTheme = ["runner-fire", "runner-ice", "runner-electric"][(this.player.x + this.player.y) % 3];
          this.playAbilityEffect(["ability-sun-burst", "ability-frost-pop", "ability-spark-pop"][(this.player.x + this.player.y) % 3]);
          this.ghosts.forEach((ghost) => {
            if (ghost.eaten) return;
            ghost.damageUntil = 0;
          });
          this.ghostEatChain = 0;
          this.gainExperience(18);
          this.gainCoins(8, true);
          this.advanceMission("power-runner");
          this.showBubble(this.player, "Power up!", 1100);
          this.startPowerStoryEvent(this.player, true);
          this.startPelletEvent(this.player, cell);
          // Assign a temporary pellet form
          const forms = ["speed", "crunch", "phase", "shield"];
          const form = forms[Math.floor(Math.random() * forms.length)];
          this.player.pelletForm = form;
          this.player.pelletFormUntil = this.elapsed + POWER_DURATION;
          const formLines = {
            speed: "PELLET FORM · SPEED DEMON · You move faster for 45 seconds.",
            crunch: "PELLET FORM · CRUNCH JAWS · Your bite range doubles for 45 seconds.",
            phase: "PELLET FORM · GHOST PHASE · Ignore enemy contact; walls stay solid for 45 seconds.",
            shield: "PELLET FORM · SUGAR SHIELD · You take no damage for 45 seconds.",
          };
          this.showBubble(this.player, formLines[form], 2500);
          sayNarratedTimed(formLines[form], 200, "urgent");
        } else {
          this.showBubble(this.player, "Wrong snack, right crunch.", 1100);
          this.startPelletEvent(this.player, cell);
        }
      }
      this.publishStats();
      // Collect dropped items on this tile
      const here = this.droppedItems.find((d) => !d.collected && d.x === this.player.x && d.y === this.player.y);
      if (here) {
        here.collected = true;
        this.collectDroppedItem(here);
      }
    }
    this.publishNetworkState();
  },


  moveGhost(ghost) {
    if (ghost.betrayalStage === "eyes") return;
    if (ghost.betrayalStage === "rebuild") {
      if (this.elapsed >= ghost.betrayalRebuildUntil) {
        ghost.betrayalStage = "";
        ghost.movedAt = this.elapsed;
      }
      return;
    }
    // Ghost is in the middle of the bite/chomp/eyes/regen sequence — immobile
    if (ghost.eatState === "fright" || ghost.eatState === "biting" || ghost.eatState === "eyes" || ghost.eatState === "regen") return;
    if (ghost.eaten) {
      if (ghost.rebuildStartedAt > 0) {
        if (this.elapsed >= ghost.rebuildUntil) {
          ghost.eaten = false;
          ghost.rebuildStartedAt = 0;
          ghost.health = ghost.maxHealth;
          ghost.defeatedUntil = 0;
          ghost.movedAt = this.elapsed;
        }
        return;
      }
      const spawn = this.ghostSpawns[ghost.index] || GHOST_STARTS[0];
      if (ghost.x === spawn.x && ghost.y === spawn.y) {
        ghost.rebuildStartedAt = this.elapsed;
        ghost.rebuildUntil = this.elapsed + 1900;
        return;
      }
      const returnStep = findNextStep(this.maze, ghost, spawn);
      if (returnStep) {
        Object.assign(ghost, { x: returnStep.x, y: returnStep.y, movedAt: this.elapsed });
        if (returnStep.x === spawn.x && returnStep.y === spawn.y) {
          ghost.rebuildStartedAt = this.elapsed;
          ghost.rebuildUntil = this.elapsed + 1900;
        }
      }
      return;
    }
    if (ghost.stunnedUntil > this.elapsed) return;
    // Panic: flee from the nearest Pacman when power pellet is active
    if (ghost.panicUntil > this.elapsed) {
      const threat = this.profile?.team === "ghosts" ? this.player : this.farthestOpenNeighbor(ghost, this.player);
      const away = this.farthestOpenNeighbor(ghost, threat || this.player);
      if (away) Object.assign(ghost, away, { movedAt: this.elapsed });
      return;
    }
    if (this.profile?.team === "ghosts") {
      const waypoint = { x: 29 + (ghost.index % 2 ? 5 : -5), y: 18 + (ghost.index % 2 ? -4 : 4) };
      const step = findNextStep(this.maze, ghost, this.nearestOpen(waypoint));
      if (step) {
        Object.assign(ghost, { x: step.x, y: step.y, movedAt: this.elapsed });
        if (Math.abs(step.x - this.player.x) + Math.abs(step.y - this.player.y) <= 1) {
          ghost.attackWindupUntil = this.elapsed + 240;
        }
      }
      return;
    }
    const poweredRunner = [...this.pacmanBots, ...this.ambientNpcs.filter((npc) => npc.kind === "runner")]
      .find((pacman) => pacman.poweredUntil > this.elapsed);
    if (this.isPowered() || poweredRunner) {
      const away = this.farthestOpenNeighbor(ghost, poweredRunner || this.player);
      if (away) Object.assign(ghost, away, { movedAt: this.elapsed });
      return;
    }
    const step = findNextStep(this.maze, ghost, this.nearestOpen(this.ghostTarget(ghost)));
    if (step) {
      Object.assign(ghost, { x: step.x, y: step.y, movedAt: this.elapsed });
      if (Math.abs(step.x - this.player.x) + Math.abs(step.y - this.player.y) <= 1) {
        ghost.attackWindupUntil = this.elapsed + 240;
      }
    }
  },


  nearestOpen(position) {
    const width = this.maze[0].length;
    const height = this.maze.length;
    const origin = {
      x: Math.max(1, Math.min(width - 2, Math.round(position.x))),
      y: Math.max(1, Math.min(height - 2, Math.round(position.y))),
    };
    for (let radius = 0; radius < Math.max(width, height); radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        const dx = radius - Math.abs(dy);
        for (const offsetX of dx === 0 ? [0] : [-dx, dx]) {
          const candidate = { x: origin.x + offsetX, y: origin.y + dy };
          if (isOpen(this.maze, candidate.x, candidate.y)) return candidate;
        }
      }
    }
    return this.player;
  },


  ghostTarget(ghost) {
    if (ghost.index === 0) return this.player;
    if (ghost.index === 1) {
      const ahead = { up: [0, -4], right: [4, 0], down: [0, 4], left: [-4, 0] }[this.player.direction];
      return { x: this.player.x + ahead[0], y: this.player.y + ahead[1] };
    }
    if (ghost.index === 2) {
      const ally = this.ghosts[0];
      const ahead = { up: [0, -3], right: [3, 0], down: [0, 3], left: [-3, 0] }[this.player.direction];
      return { x: Math.round((ally.x + this.player.x + ahead[0]) / 2), y: Math.round((ally.y + this.player.y + ahead[1]) / 2) };
    }
    const distance = Math.abs(ghost.x - this.player.x) + Math.abs(ghost.y - this.player.y);
    return distance > 8 ? this.player : { x: 3, y: ROWS - 4 };
  }

};

