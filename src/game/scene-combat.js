// MazeScene mixin: attacks, abilities, ghosts, collisions and damage.

import characterAnimationData from "../../assets/characters/character-animations.json";
import Phaser from "phaser";
import { playGameSound, playTone, sayNarrated, sayNarratedTimed } from "../audio.js";
import { INVENTORY_ITEMS, NPC_DIALOGUE, pickDialogue } from "../character-content.js";
import { BITE_FRIGHT_DURATION, BITE_SEQUENCE_DURATION, EYES_ONLY_DURATION, REGEN_DURATION, TILE } from "../constants.js";
import { updateProgressUI } from "../hud.js";
import { isOpen } from "../maze.js";
import { ABILITIES, WEAPONS } from "../progression.js";
import { appendChat, hueToTint, showToast, unlockAchievement } from "../ui.js";
import { $ } from "../state.js";

export const CombatMixin = {


    startGhostBiteSequence(ghost, pacman) {
      if (ghost.eaten || ghost.eatState === "biting" || ghost.eatState === "eyes" || ghost.eatState === "regen") return;
      ghost.eatState = "fright";
      ghost.eatStartedAt = this.elapsed;
      ghost.health = Math.max(0, (ghost.health ?? ghost.maxHealth ?? 3) - 1);
      ghost.biteCount = (ghost.biteCount || 0) + 1;
      ghost.damageUntil = this.elapsed + 420;
      ghost.damageFlashUntil = this.elapsed + 420;
      playGameSound("bite");
      const line = pickDialogue(NPC_DIALOGUE.ghostBitten);
      this.showBubble(ghost, line, 1400);
      appendChat(ghost.name || "WISP", line, "npc-chat");
      sayNarratedTimed(line, 100);
      if (ghost.health <= 0) {
        ghost.eatState = "biting";
        ghost.eatStartedAt = this.elapsed;
        playGameSound("chomp");
        const chompLine = pickDialogue(NPC_DIALOGUE.ghostEaten);
        this.showBubble(ghost, chompLine, 1600);
        appendChat(ghost.name || "WISP", chompLine, "npc-chat");
        sayNarratedTimed(chompLine, 200, "urgent");
      }
    },


    updateGhostEating(delta) {
      const now = this.elapsed;
      const allGhosts = [...this.ghosts, ...this.ambientNpcs.filter((npc) => npc.kind === "ghost" && !npc.tamed)];
      if (this.profile?.team === "ghosts") allGhosts.push(this.player);
      for (const ghost of allGhosts) {
        if (ghost.eatState === "idle") continue;
        if (ghost.eatState === "fright") {
          if (now >= ghost.eatStartedAt + BITE_FRIGHT_DURATION) {
            if (ghost.health <= 0) {
              ghost.eatState = "biting";
              ghost.eatStartedAt = now;
            } else {
              ghost.eatState = "idle";
              ghost.panicUntil = 0;
            }
          }
          continue;
        }
        if (ghost.eatState === "biting") {
          if (now >= ghost.eatStartedAt + BITE_SEQUENCE_DURATION) {
            ghost.eatState = "eyes";
            ghost.eyesUntil = now + EYES_ONLY_DURATION;
            ghost.health = 0;
            ghost.eaten = true;
            ghost.rebuildStartedAt = 0;
            playGameSound("eyes");
            const eyesLine = pickDialogue(NPC_DIALOGUE.ghostEyesOnly);
            this.showBubble(ghost, eyesLine, 1600);
            appendChat(ghost.name || "WISP", eyesLine, "npc-chat");
            sayNarratedTimed(eyesLine, 200);
          }
          continue;
        }
        if (ghost.eatState === "eyes") {
          if (now >= ghost.eyesUntil) {
            ghost.eatState = "regen";
            ghost.regenUntil = now + REGEN_DURATION;
            playGameSound("regen");
            const regenLine = pickDialogue(NPC_DIALOGUE.ghostRegenerating);
            this.showBubble(ghost, regenLine, 1800);
            appendChat(ghost.name || "WISP", regenLine, "npc-chat");
            sayNarratedTimed(regenLine, 200);
          }
          continue;
        }
        if (ghost.eatState === "regen") {
          if (now >= ghost.regenUntil) {
            ghost.eatState = "idle";
            ghost.eaten = false;
            ghost.health = ghost.maxHealth;
            ghost.defeatedUntil = 0;
            ghost.rebuildStartedAt = 0;
            ghost.movedAt = now;
            ghost.eyesUntil = 0;
            ghost.regenUntil = 0;
            const recoverLine = pickDialogue(NPC_DIALOGUE.reunion);
            this.showBubble(ghost, recoverLine, 1800);
            appendChat(ghost.name || "WISP", recoverLine, "npc-chat");
          }
          continue;
        }
      }
      // End pellet event when its time expires
      if (this.pelletEventActive && now >= this.pelletEventUntil) {
        this.endPelletEvent();
      }
    },


    playAbilityEffect(animationKey, actor = this.player) {
      const point = this.centerOf(actor.x, actor.y);
      const effect = this.add.sprite(point.x, point.y, characterAnimationData.effects.texture, 0);
      effect.setDepth(4).setScale(1.45).play(animationKey);
      if (actor === this.player) effect.setTint(hueToTint(this.profile.abilityHue ?? 188));
      this.abilitySprites.add(effect);
      effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.abilitySprites.delete(effect);
        effect.destroy();
      });
    },


    nearestWeakenedGhost() {
      if (this.profile?.team !== "pacmen") return null;
      const tameRange = this.progression.charmUnlocked ? 4 : 2;
      const candidates = [...this.ghosts, ...this.ambientNpcs.filter((npc) => npc.kind === "ghost" && !npc.tamed)];
      return candidates
        .filter((ghost) => !ghost.eaten && !ghost.defeatedUntil && (
          ghost.stunnedUntil > this.elapsed
          || this.profile?.team === "pacmen" && this.isPowered()
          || (ghost.health ?? ghost.maxHealth ?? 3) <= (ghost.maxHealth ?? 3) / 2
        ))
        .map((ghost) => ({
          ghost,
          distance: Math.abs(ghost.x - this.player.x) + Math.abs(ghost.y - this.player.y),
        }))
        .filter(({ distance }) => distance <= tameRange)
        .sort((a, b) => a.distance - b.distance)[0]?.ghost || null;
    },


  usePulse() {
    if (!this.started || this.pulseCharges <= 0) return;
    this.pulseCharges -= 1;
    this.player.pulseStartedAt = this.elapsed;
    this.playAbilityEffect(this.profile.team === "ghosts" ? "ability-ghost-echo" : "ability-pulse");
    const opponents = this.profile.team === "ghosts" ? this.pacmanBots : this.ghosts;
    let hits = 0;
    for (const actor of opponents) {
      const distance = Math.abs(actor.x - this.player.x) + Math.abs(actor.y - this.player.y);
      if (distance > 6 + this.progression.pulseTier * 1.5) continue;
      actor.stunnedUntil = this.elapsed + 2600;
      actor.attackWindupUntil = 0;
      hits += 1;
    }
    this.score += hits * 50;
    this.publishStats();
    this.showBubble(this.player, hits ? "Pulse burst!" : "Pulse missed!", 900);
    playTone(hits ? 220 : 350, 0.25);
    $("#pulse-count").textContent = String(this.pulseCharges).padStart(2, "0");
  },


  combatOpponents() {
    const enemyKind = this.profile?.team === "ghosts" ? "runner" : "ghost";
    const activeFaction = this.profile?.team === "ghosts" ? this.pacmanBots : this.ghosts;
    return [
      ...activeFaction,
      ...this.ambientNpcs.filter((npc) => npc.kind === enemyKind),
    ].filter((actor) => actor !== this.player && !actor.eaten && (actor.health ?? 1) > 0);
  },


  useBasicAttack() {
    if (!this.started || this.player.attackReadyAt > this.elapsed) return;
    this.player.attackReadyAt = this.elapsed + 520;
    this.player.attackUntil = this.elapsed + 340;
    this.player.attackStartedAt = this.elapsed;
    const weapon = WEAPONS.find(({ id }) => id === this.progression.equippedWeapon) || WEAPONS[0];
    const [dx, dy] = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }[this.player.direction];
    const hitRange = weapon.ranged ? weapon.range : 2;
    const hitPoint = this.centerOf(
      this.player.x + dx * hitRange,
      this.player.y + dy * hitRange,
    );
    this.showHitbox(hitPoint, 0.9, weapon.ranged ? 0xffe477 : 0xff6c87, 250);
    const targets = this.combatOpponents().filter((actor) => {
      const x = actor.x - this.player.x;
      const y = actor.y - this.player.y;
      const distance = Math.abs(x) + Math.abs(y);
      if (weapon.ranged) {
        return distance > 0 && distance <= weapon.range
          && x * dx + y * dy > 0
          && (dx ? y === 0 : x === 0);
      }
      return distance > 0 && distance <= weapon.range
        && x * dx + y * dy >= 0
        && (dx ? Math.abs(y) <= 1 : Math.abs(x) <= 1);
    }).sort((a, b) =>
      Math.abs(a.x - this.player.x) + Math.abs(a.y - this.player.y)
      - Math.abs(b.x - this.player.x) - Math.abs(b.y - this.player.y),
    ).slice(0, weapon.ranged ? 1 : 2);
    for (const target of targets) {
      this.damageCombatTarget(target, weapon.damage + this.progression.permanentPower, weapon.id);
      this.playAbilityEffect(weapon.ranged ? "ability-spark-pop" : "ability-slash", target);
    }
    if (!targets.length) this.showBubble(this.player, "Air slash! The air has learned its lesson.", 1050);
    else this.showBubble(this.player, `${weapon.name}: bonk delivered.`, 850);
    playTone(targets.length ? weapon.ranged ? 760 : 320 : 470, targets.length ? 0.13 : 0.08);
  },


  castSelectedAbility() {
    if (!this.started) return;
    const ability = ABILITIES[this.profile.team].find(({ id }) => id === this.progression.selectedAbility);
    if (!ability) {
      showToast("NO ABILITY EQUIPPED", "Choose a faction ability in the skill tree.", "warning");
      return;
    }
    if (this.player.abilityReadyAt > this.elapsed) {
      const seconds = ((this.player.abilityReadyAt - this.elapsed) / 1000).toFixed(1);
      showToast("ABILITY RECHARGING", `${seconds}s until ${ability.name} is ready.`);
      playGameSound("cooldown");
      return;
    }
    this.player.abilityReadyAt = this.elapsed + (ability.cooldown || (ability.type === "invulnerable" ? 9000 : ability.type === "teleport" ? 4500 : 3200));
    this.player.attackUntil = this.elapsed + 420;
    if (ability.type === "teleport") {
      const targets = this.combatOpponents()
        .map((actor) => ({ actor, distance: Math.abs(actor.x - this.player.x) + Math.abs(actor.y - this.player.y) }))
        .filter(({ distance }) => distance > 0 && distance <= ability.range)
        .sort((a, b) => a.distance - b.distance);
      const target = targets[0]?.actor;
      const destinations = target ? [
        { x: target.x, y: target.y - 1 }, { x: target.x + 1, y: target.y },
        { x: target.x, y: target.y + 1 }, { x: target.x - 1, y: target.y },
      ].filter(({ x, y }) => isOpen(this.maze, x, y)
        && !this.combatOpponents().some((actor) => actor.x === x && actor.y === y))
      : [];
      if (!destinations.length) {
        showToast(`${ability.name.toUpperCase()} MISSED`, "No clear landing tile near a rival.");
        playGameSound("cooldown");
        return;
      }
      const destination = destinations[0];
      this.playAbilityEffect(ability.effect, this.player);
      Object.assign(this.player, destination, { movedAt: this.elapsed, phaseUntil: this.elapsed + 420 });
      this.playAbilityEffect(ability.effect, target);
      unlockAchievement("first-ability");
      this.showBubble(this.player, "Blink Step! I was over there. Mostly.", 1200);
      playGameSound("dash");
      return;
    }
    if (ability.type === "invulnerable") {
      this.player.shieldUntil = this.elapsed + ability.duration;
      this.player.phaseUntil = this.elapsed + ability.duration;
      this.playAbilityEffect(ability.effect, this.player);
      unlockAchievement("first-ability");
      this.showBubble(this.player, "Veil engaged. Please haunt responsibly.", 1400);
      playGameSound("ability");
      return;
    }
    const targets = this.combatOpponents()
      .map((actor) => ({ actor, distance: Math.abs(actor.x - this.player.x) + Math.abs(actor.y - this.player.y) }))
      .filter(({ actor, distance }) => distance > 0 && distance <= ability.range && !actor.defeatedUntil)
      .sort((a, b) => a.distance - b.distance);
    const primary = targets[0]?.actor;
    const hits = ability.area && primary
      ? targets.filter(({ actor }) => Math.abs(actor.x - primary.x) + Math.abs(actor.y - primary.y) <= (ability.radius || 2)).map(({ actor }) => actor)
      : primary ? [primary] : [];
    const power = 1 + this.progression.permanentPower;
    for (const target of hits) {
      this.damageCombatTarget(target, ability.damage + power, ability.id);
      this.playAbilityEffect(ability.effect || (ability.area ? "ability-ghost-echo" : "ability-spark-pop"), target);
      if (ability.stunDuration) target.stunnedUntil = this.elapsed + ability.stunDuration;
      if (ability.id === "frost-ring") target.stunnedUntil = this.elapsed + 1400;
      if (ability.drainHunger && target.kind === "runner") {
        target.hunger = Math.max(0, (target.hunger ?? 100) - ability.drainHunger);
        if (target.hunger === 0) target.stunnedUntil = Math.max(target.stunnedUntil || 0, this.elapsed + 900);
      }
    }
    this.playAbilityEffect(ability.effect || (ability.id === "frost-ring" ? "ability-frost-pop"
      : ability.id === "dread-wave" || ability.id === "phase-snap" ? "ability-ghost-echo"
        : ability.id === "star-lance" ? "ability-spark-pop" : "ability-sun-burst"));
    if (ability.stunDuration && primary) this.playAbilityField(primary, ability.radius || 2);
    unlockAchievement("first-ability");
    if (!hits.length) showToast(`${ability.name.toUpperCase()} MISSED`, "No rival was close enough. The walls remain deeply concerned.");
    else this.showBubble(this.player, `${ability.name}! ${hits.length} rival${hits.length === 1 ? "" : "s"} regretted that.`, 1300);
    playGameSound(hits.length ? "ability" : "cooldown");
  },


  playAbilityField(target, radius) {
    const point = this.centerOf(target.x, target.y);
    const field = this.add.circle(point.x, point.y, TILE * radius, 0x68e9ff, 0.12)
      .setStrokeStyle(3, 0x9cf6ff, 0.9)
      .setDepth(3);
    this.tweens.add({
      targets: field,
      alpha: 0,
      scale: 1.22,
      duration: 650,
      onComplete: () => field.destroy(),
    });
  },


  showHitbox(point, radius, color = 0xff6c87, duration = 300) {
    const hitbox = this.add.circle(point.x, point.y, TILE * radius, color, 0.35)
      .setStrokeStyle(2, color, 0.8)
      .setDepth(8);
    this.tweens.add({
      targets: hitbox,
      alpha: 0,
      scale: 1.3,
      duration,
      onComplete: () => hitbox.destroy(),
    });
    this.tweens.add({
      targets: hitbox.strokeColor,
      duration,
      onComplete: () => hitbox.destroy(),
    });
  },


  damageCombatTarget(target, damage, source) {
    if (!target || target.health <= 0 || target.eaten) return false;
    target.maxHealth ||= target.kind === "runner" || target.team === "pacmen" ? 4 : 3;
    target.health = Math.max(0, (target.health ?? target.maxHealth) - damage);
    target.damageUntil = this.elapsed + 360;
    target.damageFlashUntil = this.elapsed + 360;
    target.attackUntil = this.elapsed + 300;
    target.lastDamageSource = source;
    playGameSound("hit");
    const point = this.centerOf(target.x, target.y);
    this.showHitbox(point, 0.7, 0xff6c87, 200);
    const popup = this.add.text(point.x, point.y - TILE * 0.8, `-${damage}`, {
      color: "#fff1f1",
      stroke: "#b41f3e",
      strokeThickness: 4,
      fontFamily: "monospace",
      fontSize: "17px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(8);
    this.tweens.add({ targets: popup, y: popup.y - 25, alpha: 0, duration: 520, onComplete: () => popup.destroy() });
    unlockAchievement("first-strike", target);
    if (target.health <= 0) {
      this.knockouts += 1;
      target.defeatedUntil = this.elapsed + 2300;
      target.respawnPoint = { x: target.x, y: target.y };
      if (this.ghosts.includes(target)) {
        target.eaten = true;
        target.rebuildStartedAt = 0;
      } else {
        target.gameEnding = "defeat";
      }
      const line = pickDialogue(NPC_DIALOGUE.defeated);
      appendChat(target.name || "RIVAL", line, "npc-chat");
      this.showBubble(target, line, 1900);
      this.gainExperience(24);
      this.gainCoins(4, true);
      unlockAchievement("first-knockout", target);
      // Drop item with color-coded name tag
      const dropChance = Math.random();
      if (dropChance < 0.25) {
        const weapon = WEAPONS.find(({ id }) => id === source) || WEAPONS[0];
        this.dropItem(target.x, target.y, weapon.id, weapon.name, weapon.ranged ? 0xffe477 : 0xff6c87);
      } else if (dropChance < 0.4) {
        const items = ["arc-cell", "wisp-fragment", "star-flake"];
        const itemId = items[Math.floor(Math.random() * items.length)];
        const item = INVENTORY_ITEMS.find(({ id }) => id === itemId);
        this.dropItem(target.x, target.y, itemId, item.name, 0x53e2b4);
      }
      if (this.inventory["spark-sling"] === 0 && this.progression.equippedWeapon === "chomper-blade") {
        this.addInventoryItem("spark-sling");
        appendChat("ADVANCEMENT", "FIRST LOOT: the Spark Sling was added to your pack. It has very serious pew-pew energy.", "achievement-chat");
      } else if (this.knockouts % 5 === 0 && this.inventory["prism-bow"] === 0) {
        this.addInventoryItem("prism-bow");
        appendChat("ADVANCEMENT", "RARE LOOT: the Prism Bow joined your pack. Finally, a reason to aim.", "achievement-chat");
      } else if (this.knockouts % 3 === 0 && this.inventory["echo-pike"] === 0) {
        this.addInventoryItem("echo-pike");
        appendChat("ADVANCEMENT", "RARE LOOT: the Echo Pike is yours. It is pointy in an emotionally supportive way.", "achievement-chat");
      }
    } else if (Math.random() < 0.35) {
      const line = pickDialogue(NPC_DIALOGUE.combat);
      appendChat(target.name || "RIVAL", line, "npc-chat");
      this.showBubble(target, line, 1500);
    }
    this.publishStats();
    return true;
  },


  damagePlayer(reason) {
    if (this.profile?.sessionMode === "training") {
      if (!this.player.trainingHinted) {
        this.player.trainingHinted = true;
        showToast("TRAINING ROOM", "Practice is safe here. Your hearts are not on the clock.");
      }
      return;
    }
    if (this.finished || this.player.invulnerableUntil > this.elapsed || this.player.shieldUntil > this.elapsed) return;
    this.hearts = Math.max(0, this.hearts - 1);
    this.player.health = this.hearts;
    this.player.damageUntil = this.elapsed + 260;
    this.player.damageFlashUntil = this.elapsed + 360;
    this.player.invulnerableUntil = this.elapsed + 1650;
    this.player.respawnUntil = this.elapsed + 620;
    this.player.eatState = "idle";
    this.player.eatStartedAt = 0;
    this.player.eyesUntil = 0;
    this.player.regenUntil = 0;
    this.player.panicUntil = 0;
    updateProgressUI(this.progression, this.hunger, this.hearts);
    showToast("HEART LOST", reason, "warning");
    playTone(150, 0.3);
    if (this.hearts <= 0) {
      this.publishStats();
      this.finish(false);
      return;
    }
    Object.assign(this.player, this.teamStarts[this.profile.team], {
      direction: this.profile.team === "pacmen" ? "right" : "left",
      queuedDirection: null,
    });
    this.ghosts.forEach((ghost, index) => Object.assign(ghost, this.ghostSpawns[ghost.index ?? index]));
    this.powerUntil = 0;
    this.cameras.main.centerOn(this.player.x * TILE + TILE / 2, this.player.y * TILE + TILE / 2);
    this.publishStats();
  },


  isPowered() {
    return this.profile?.team === "pacmen" && this.elapsed < this.powerUntil;
  },


  isPacmanPowerActive() {
    return (this.profile?.team === "pacmen" && this.isPowered())
      || this.remotePowerUntil > this.elapsed
      || [...this.pacmanBots, ...this.ambientNpcs.filter((npc) => npc.kind === "runner")]
        .some((pacman) => pacman.poweredUntil > this.elapsed);
  },


  checkCollisions() {
    const pacmen = [
      ...(this.profile?.team === "pacmen" ? [this.player] : []),
      ...this.pacmanBots,
      ...this.ambientNpcs.filter((npc) => npc.kind === "runner"),
    ];
    const ghosts = [
      ...(this.profile?.team === "ghosts" ? [this.player] : []),
      ...this.ghosts,
      ...this.ambientNpcs.filter((npc) => npc.kind === "ghost" && !npc.tamed),
    ];
    for (const pacman of pacmen) {
      if (pacman.eaten || pacman.defeatedUntil > this.elapsed || pacman.health <= 0) continue;
      if (this.isInFactionSafeZone(pacman, "pacmen")) continue;
      for (const ghost of ghosts) {
        if (ghost.eaten || ghost.defeatedUntil > this.elapsed || ghost.health <= 0) continue;
        if (pacman.x !== ghost.x || pacman.y !== ghost.y) continue;
        const contactReady = Math.max(pacman.contactReadyAt || 0, ghost.contactReadyAt || 0);
        if (contactReady > this.elapsed) continue;
        pacman.contactReadyAt = this.elapsed + 700;
        ghost.contactReadyAt = this.elapsed + 700;
        const powered = pacman === this.player ? this.isPowered() : pacman.poweredUntil > this.elapsed;
        if (powered) {
          this.biteGhost(ghost, pacman);
        } else if (pacman === this.player || ghost === this.player) {
          this.damagePlayer("A ghost caught you. Eat a power pellet to turn the chase around.");
          return;
        } else {
          this.damageCombatTarget(pacman, 1, "ghost-contact");
        }
      }
    }
  },


  captureGhost(ghost, pacman) {
    if (ghost.eaten) return;
    ghost.eaten = true;
    ghost.health = 0;
    ghost.rebuildStartedAt = 0;
    ghost.stunnedUntil = 0;
    ghost.movedAt = this.elapsed;
    ghost.eatState = "idle";
    ghost.eatStartedAt = 0;
    ghost.eyesUntil = 0;
    ghost.regenUntil = 0;
    for (const mark of ghost.biteMarks || []) mark.destroy();
    ghost.biteMarks = [];
    if (!this.ghosts.includes(ghost)) ghost.defeatedUntil = this.elapsed + 2200;
    if (pacman === this.player) {
      this.score += 200 * 2 ** Math.min(this.ghostEatChain, 3);
      this.ghostEatChain += 1;
      this.gainExperience(20);
      this.gainCoins(5);
      unlockAchievement("first-knockout", ghost);
      this.addInventoryItem("wisp-fragment");
      if (this.ghostEatChain % 3 === 0) this.addInventoryItem("echo-dust");
      if (this.ghostEatChain % 2 === 0) {
        const line = pickDialogue(NPC_DIALOGUE.captured);
        this.showBubble(ghost, line, 1900);
        appendChat(ghost.name || `Wisp ${ghost.index + 1}`, line, "npc-chat");
        sayNarrated(line);
      }
      this.publishStats();
    } else {
      const line = pickDialogue(NPC_DIALOGUE.captured);
      this.showBubble(ghost, line, 1600);
      appendChat(ghost.name || "WISP", line, "npc-chat");
    }
    playTone(760, 0.16);
  },


  biteGhost(ghost, pacman) {
    if (ghost.eaten) return;
    this.startGhostBiteSequence(ghost, pacman);
  }

};

