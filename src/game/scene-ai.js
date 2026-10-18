// MazeScene mixin: ambient NPCs, companions and bot movement.

import { playGameSound, sayNarrated } from "../audio.js";
import { NPC_DIALOGUE, pickDialogue } from "../character-content.js";
import { POWER_DURATION } from "../constants.js";
import { findNextStep, isOpen } from "../maze.js";
import { autonomyEnabled } from "../state.js";
import { appendChat, showToast } from "../ui.js";

export const AiMixin = {


    spawnAmbientNpcs() {
      const centerX = Math.floor(this.maze[0].length / 2);
      const centerY = Math.floor(this.maze.length / 2);
      const seeds = [
        { kind: "runner", name: "Mochi", x: centerX - 7, y: centerY - 6, color: 0xffd85a },
        { kind: "runner", name: "Pip", x: centerX + 6, y: centerY + 6, color: 0x58dff0 },
        { kind: "ghost", name: "Murk", x: centerX + 7, y: centerY - 6, color: 0xa47bff },
        { kind: "ghost", name: "Sprocket", x: centerX - 6, y: centerY + 6, color: 0x63d9bd },
      ];
      this.ambientNpcs = seeds.map((npc, index) => ({
        ...npc,
        ...this.nearestOpen({ x: npc.x, y: npc.y }),
        team: `npc-${npc.kind}`,
        index,
        movedAt: this.elapsed,
        nextMoveAt: this.elapsed + 400 + index * 180,
        nextChatterAt: this.elapsed + 3500 + index * 2800,
        direction: index % 2 ? "left" : "right",
        health: 3,
        maxHealth: 3,
        hunger: npc.kind === "runner" ? 100 : undefined,
        attackReadyAt: 0,
      }));
      this.renderInventory();
    },


    updateAmbientNpcs(delta) {
      this.npcClock = (this.npcClock || 0) + delta;
      if (this.npcClock < 160) return;
      this.npcClock %= 160;
      const playerTeam = this.profile?.team;
      const powered = playerTeam === "pacmen" ? this.isPowered() : false;
      const opponents = this.combatOpponents();
      for (const npc of this.ambientNpcs) {
        if (npc.defeatedUntil > this.elapsed) continue;
        if (this.elapsed >= npc.nextMoveAt) {
          npc.nextMoveAt = this.elapsed + 450 + Math.random() * 700;
          const distToPlayer = Math.abs(npc.x - this.player.x) + Math.abs(npc.y - this.player.y);
          const nearPlayer = distToPlayer <= 5;
          const isRunner = npc.kind === "runner" || npc.team === "pacmen";
          const isGhost = npc.kind === "ghost" || npc.team === "ghosts";
          let move = null;

          // Follow player when nearby
          if (nearPlayer && !npc.tamed && distToPlayer > 1) {
            const towardPlayer = findNextStep(this.maze, npc, this.player);
            if (towardPlayer) move = towardPlayer;
          }

          // Chase enemies / help fight
          if (!move && opponents.length > 0) {
            const nearestOpponent = opponents.reduce((a, b) => {
              const da = Math.abs(a.x - npc.x) + Math.abs(a.y - npc.y);
              const db = Math.abs(b.x - npc.x) + Math.abs(b.y - npc.y);
              return da < db ? a : b;
            });
            const distToOpponent = Math.abs(nearestOpponent.x - npc.x) + Math.abs(nearestOpponent.y - npc.y);
            // Ghost NPCs chase runners; Runner NPCs chase ghosts (when not being hunted)
            const shouldChase = (isGhost && !powered) || (isRunner && powered);
            if (shouldChase && distToOpponent <= 6) {
              const towardEnemy = findNextStep(this.maze, npc, nearestOpponent);
              if (towardEnemy) move = towardEnemy;
            }
          }

          // Eat pellets if runner
          if (!move && isRunner) {
            const pellet = this.nearestPellet(npc);
            if (pellet) {
              const dist = Math.abs(pellet.x - npc.x) + Math.abs(pellet.y - npc.y);
              if (dist <= 5) {
                const towardPellet = findNextStep(this.maze, npc, pellet);
                if (towardPellet) move = towardPellet;
              }
            }
          }

          // Random wander fallback
          if (!move) {
            const moves = [
              ["up", 0, -1], ["right", 1, 0], ["down", 0, 1], ["left", -1, 0],
            ].filter(([, dx, dy]) => isOpen(this.maze, npc.x + dx, npc.y + dy));
            if (moves.length) {
              const [direction, dx, dy] = moves[Math.floor(Math.random() * moves.length)];
              npc.x += dx;
              npc.y += dy;
              npc.direction = direction;
              npc.movedAt = this.elapsed;
              npc.crouching = Math.random() < 0.12;
              this.collectNpcPowerOrb(npc);
            }
            continue;
          }

          if (move) {
            Object.assign(npc, { x: move.x, y: move.y, movedAt: this.elapsed });
            npc.direction = move.direction || npc.direction;
            npc.crouching = Math.random() < 0.12;
            this.collectNpcPowerOrb(npc);
          }
        }

        // Chatter when near player - more frequent and annoying
        if (this.elapsed >= npc.nextChatterAt) {
          npc.nextChatterAt = this.elapsed + 6000 + Math.random() * 8000;
          const distance = Math.abs(npc.x - this.player.x) + Math.abs(npc.y - this.player.y);
          if (distance <= 7) this.sayNpc(npc);
        }
      }
    },


    nearestPellet(npc) {
      // `drawPellets` maintains `this.pelletPositions`; the old full-maze scan
      // ran per runner-NPC every 160 ms and scaled with world size.
      const pellets = this.pelletPositions || [];
      let target = null;
      let closest = Infinity;
      for (const pellet of pellets) {
        const dist = Math.abs(npc.x - pellet.x) + Math.abs(npc.y - pellet.y);
        if (dist < closest) {
          closest = dist;
          target = pellet;
        }
      }
      return target;
    },


    sayNpc(npc) {
      const powered = this.isPacmanPowerActive();
      let category = npc.kind;
      if (powered && npc.kind === "ghost") category = "ghostPanic";
      if (powered && npc.kind === "runner") category = "pacmanPower";
      if (npc.tamed) category = "reunion";
      const line = pickDialogue(NPC_DIALOGUE[category]);
      appendChat(npc.name, line, "npc-chat");
      this.showBubble(npc, line, 2800);
      sayNarrated(line);
    },


    updateCharacterChatter(delta) {
      this.chatterTimer = (this.chatterTimer || 0) + delta;
      this.chatterInterval ||= 22000 + Math.random() * 18000;
      if (this.chatterTimer < this.chatterInterval) return;
      this.chatterTimer = 0;
      this.chatterInterval = 22000 + Math.random() * 18000;
      const lines = this.profile.team === "ghosts" ? NPC_DIALOGUE.playerGhost : NPC_DIALOGUE.playerRunner;
      const line = pickDialogue(lines);
      appendChat(this.profile.name, line, "npc-chat");
      this.showBubble(this.player, line, 2300);
      sayNarrated(line);
      if (!autonomyEnabled || Math.random() > 0.15) return;
      const target = this.closestPowerOrb();
      const combatOpponents = this.combatOpponents();
      const nearestOpponent = combatOpponents.length
        ? combatOpponents.reduce((a, b) => {
            const da = Math.abs(a.x - this.player.x) + Math.abs(a.y - this.player.y);
            const db = Math.abs(b.x - this.player.x) + Math.abs(b.y - this.player.y);
            return da < db ? a : b;
          })
        : null;
      const nearPellet = Boolean(target) && Math.abs(target.x - this.player.x) + Math.abs(target.y - this.player.y) <= 5;
      const nearEnemy = Boolean(nearestOpponent) && Math.abs(nearestOpponent.x - this.player.x) + Math.abs(nearestOpponent.y - this.player.y) <= 4;
      if (!nearPellet && !nearEnemy) return;
      const helpfulNudge = nearPellet && Math.random() > 0.3;
      const step = helpfulNudge ? findNextStep(this.maze, this.player, target) : null;
      const directions = [
        ["up", 0, -1], ["right", 1, 0], ["down", 0, 1], ["left", -1, 0],
      ].filter(([, dx, dy]) => isOpen(this.maze, this.player.x + dx, this.player.y + dy));
      const direction = step
        ? step.x > this.player.x ? "right" : step.x < this.player.x ? "left" : step.y > this.player.y ? "down" : "up"
        : nearEnemy
        ? findNextStep(this.maze, this.player, nearestOpponent)?.direction || directions[Math.floor(Math.random() * directions.length)]?.[0]
        : directions[Math.floor(Math.random() * directions.length)]?.[0];
      if (!direction) return;
      this.player.queuedDirection = direction;
      this.player.braking = false;
      const nudgeLine = helpfulNudge
        ? "I have the wheel. I see a power pellet. This is probably fine."
        : "I have the wheel. Engaging the enemy. Try not to panic.";
      appendChat(this.profile.name, nudgeLine, "npc-chat");
      this.showBubble(this.player, nudgeLine, 2100);
      sayNarrated(nudgeLine);
      showToast("YOUR CHARACTER HAS A THOUGHT", helpfulNudge
        ? "It nudges you toward a nearby power pellet."
        : "It takes the controls to help you fight.", "quest");
      playGameSound("select");
    },


    closestPowerOrb() {
      let target = null;
      let closest = Infinity;
      for (let y = 1; y < this.maze.length - 1; y += 1) {
        for (let x = 1; x < this.maze[0].length - 1; x += 1) {
          if (this.maze[y][x] !== "O") continue;
          const distance = Math.abs(this.player.x - x) + Math.abs(this.player.y - y);
          if (distance < closest) {
            closest = distance;
            target = { x, y };
          }
        }
      }
      return target;
    },


    collectNpcPowerOrb(actor) {
      if (actor.kind !== "runner" && actor.team !== "pacmen" && actor.team !== "npc-pacmen") return;
      if (this.maze[actor.y]?.[actor.x] !== "O") return;
      this.maze[actor.y][actor.x] = " ";
      actor.poweredUntil = this.elapsed + POWER_DURATION;
      actor.powerTheme = ["runner-fire", "runner-ice", "runner-electric"][(actor.x + actor.y) % 3];
      this.drawPellets();
      const line = actor.kind === "ghost"
        ? "I ate the glowing thing. It is doing something to my outline."
        : "POWER SNACK! I feel legally unstoppable.";
      this.showBubble(actor, line, 1500);
      appendChat(actor.name || "MAZE PAL", line, "npc-chat");
      sayNarrated(line);
      if (this.profile?.team === "ghosts") this.startPowerStoryEvent(actor, false);
      this.startPelletEvent(actor, "O");
      // NPC Pacmen get temporary pellet forms too
      if (actor.kind === "runner" || actor.team === "pacmen" || actor.team === "npc-pacmen") {
        const npcForms = ["speed", "crunch", "phase", "shield"];
        const npcForm = npcForms[Math.floor(Math.random() * npcForms.length)];
        actor.pelletForm = npcForm;
        actor.pelletFormUntil = this.elapsed + 6000;
        const formLines = {
          speed: "Speed form active!",
          crunch: "Crunch jaws active!",
          phase: "Ghost phase active!",
          shield: "Sugar shield active!",
        };
        this.showBubble(actor, formLines[npcForm], 2000);
      }
    },


  updateEnemyAbilities() {
    if (this.isInSafeZone(this.player) || this.player.invulnerableUntil > this.elapsed) return;
    const nearest = this.combatOpponents()
      .map((actor) => ({ actor, distance: Math.abs(actor.x - this.player.x) + Math.abs(actor.y - this.player.y) }))
      .filter(({ actor, distance }) => distance > 0 && distance <= 4 && (actor.attackReadyAt || 0) <= this.elapsed)
      .sort((a, b) => a.distance - b.distance)[0]?.actor;
    if (!nearest) return;
    nearest.attackReadyAt = this.elapsed + 4200;
    nearest.attackUntil = this.elapsed + 300;
    this.showBubble(nearest, "···", 450);
    this.time.delayedCall(450, () => {
      if (this.finished || this.paused || nearest.health <= 0) return;
      const line = pickDialogue(NPC_DIALOGUE.combat);
      this.showBubble(nearest, line, 1500);
      appendChat(nearest.name || "RIVAL", line, "npc-chat");
      this.damagePlayer(`${nearest.name || "A rival"} landed a quick ability. The rematch is personal now.`);
    });
  },


  respawnDefeatedActors() {
    for (const actor of [...this.pacmanBots, ...this.ambientNpcs]) {
      if (!actor.defeatedUntil || actor.defeatedUntil > this.elapsed) continue;
      actor.defeatedUntil = 0;
      actor.health = actor.maxHealth;
      actor.damageUntil = 0;
      actor.gameEnding = "";
      if (actor.kind === "ghost") {
        actor.eatState = "idle";
        actor.eatStartedAt = 0;
        actor.eyesUntil = 0;
        actor.regenUntil = 0;
        actor.panicUntil = 0;
      }
      const spawn = actor.respawnPoint || this.nearestOpen(this.profile.team === "ghosts" ? this.pacmanSpawn : this.teamStarts[actor.kind === "ghost" ? "ghosts" : "pacmen"]);
      Object.assign(actor, this.nearestOpen(spawn), { movedAt: this.elapsed });
    }
  },


  moveCompanions() {
    for (const companion of this.tamedCompanions) {
      if (companion.betrayalStage === "eyes" || companion.betrayalStage === "rebuild") continue;
      const distance = Math.abs(companion.x - this.player.x) + Math.abs(companion.y - this.player.y);
      if (distance <= 2) continue;
      const step = findNextStep(this.maze, companion, this.player);
      if (step) Object.assign(companion, step, { movedAt: this.elapsed });
    }
  },


  smartBotStep(bot) {
    const distance = Math.abs(bot.x - this.player.x) + Math.abs(bot.y - this.player.y);
    const target = this.closestPowerOrb();
    if (target && (distance > 8 || Math.random() < 0.45)) {
      return findNextStep(this.maze, bot, target) || this.farthestOpenNeighbor(bot);
    }
    return this.farthestOpenNeighbor(bot);
  },


  interact() {
    const target = this.ambientNpcs
      .map((npc) => ({
        npc,
        distance: Math.abs(npc.x - this.player.x) + Math.abs(npc.y - this.player.y),
      }))
      .filter(({ distance }) => distance <= 4)
      .sort((a, b) => a.distance - b.distance)[0]?.npc;
    if (target) this.sayNpc(target);
    else this.showBubble(this.player, "No one nearby. F opens chat.", 1400);
  },


  farthestOpenNeighbor(ghost, threat = this.player) {
    const neighbors = [
      { x: ghost.x, y: ghost.y - 1 },
      { x: ghost.x + 1, y: ghost.y },
      { x: ghost.x, y: ghost.y + 1 },
      { x: ghost.x - 1, y: ghost.y },
    ].filter(({ x, y }) => isOpen(this.maze, x, y));
    if (neighbors.length === 0) return null;
    neighbors.sort((a, b) =>
      Math.abs(b.x - threat.x) + Math.abs(b.y - threat.y)
      - Math.abs(a.x - threat.x) - Math.abs(a.y - threat.y),
    );
    return neighbors[0];
  },


  nextPosition(entity, direction) {
    const offset = {
      up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0],
    }[direction];
    return { x: entity.x + offset[0], y: entity.y + offset[1] };
  },


  isInFactionSafeZone(actor, faction) {
    const home = this.teamStarts[faction];
    return Math.abs(actor.x - home.x) <= 2 && Math.abs(actor.y - home.y) <= 2;
  }

};

