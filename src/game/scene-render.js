// MazeScene mixin: maze/pellet rendering and per-frame entity drawing.

import characterAnimationData from "../../assets/characters/character-animations.json";
import { BITE_SEQUENCE_DURATION, REGEN_DURATION, TILE } from "../constants.js";
import { hudEl, renderHeartIcons, setHudText } from "../hud.js";
import { isOpen } from "../maze.js";
import { formatScore } from "../profile.js";

export const RenderMixin = {


  drawMaze() {
    const columns = this.maze[0].length;
    const rows = this.maze.length;
    const width = columns * TILE;
    const height = rows * TILE;
    this.staticGraphics.clear();
    this.staticGraphics.fillStyle(0x091323, 1).fillRect(0, 0, width, height);
    // Floor: merge horizontal open runs into single fill ops instead of one
    // fillRect per tile; pattern dots stay per tile.
    this.staticGraphics.fillStyle(0x0a1526, 1);
    for (let y = 0; y < rows; y += 1) {
      let x = 0;
      while (x < columns) {
        if (this.maze[y][x] === "#") { x += 1; continue; }
        let runEnd = x;
        while (runEnd < columns && this.maze[y][runEnd] !== "#") runEnd += 1;
        this.staticGraphics.fillRect(x * TILE + 1, y * TILE + 1, (runEnd - x) * TILE - 2, TILE - 2);
        x = runEnd;
      }
      for (let x2 = 0; x2 < columns; x2 += 1) {
        if (this.maze[y][x2] === "#" || (x2 + y) % 3 !== 0) continue;
        this.staticGraphics.fillStyle(0x10233a, 0.6).fillCircle(x2 * TILE + TILE / 2, y * TILE + TILE / 2, 1.5);
        this.staticGraphics.fillStyle(0x0a1526, 1);
      }
    }
    // Walls: merge horizontal wall runs into single fill/stroke ops. The old
    // per-tile pass (fill + stroke + 4 corner dots + up to 4 edge calls) exploded
    // into tens of thousands of Graphics commands after world expansions and was
    // the main trigger for WebGL context loss (black screen). Interior corner
    // dots inside a straight run were never visible, so dots render at run ends.
    this.staticGraphics.fillStyle(0x162a40, 1);
    for (let y = 0; y < rows; y += 1) {
      let x = 0;
      while (x < columns) {
        if (this.maze[y][x] !== "#") { x += 1; continue; }
        let runEnd = x;
        while (runEnd < columns && this.maze[y][runEnd] === "#") runEnd += 1;
        const px = x * TILE;
        const py = y * TILE;
        const runWidth = (runEnd - x) * TILE;
        this.staticGraphics.fillRect(px, py, runWidth, TILE);
        this.staticGraphics.lineStyle(3, 0x3d5a80, 0.85);
        this.staticGraphics.strokeRect(px + 1, py + 1, runWidth - 2, TILE - 2);
        this.staticGraphics.fillStyle(0x6b8cae, 1);
        this.staticGraphics.fillCircle(px + 3, py + 3, 2);
        this.staticGraphics.fillCircle(px + runWidth - 3, py + 3, 2);
        this.staticGraphics.fillCircle(px + 3, py + TILE - 3, 2);
        this.staticGraphics.fillCircle(px + runWidth - 3, py + TILE - 3, 2);
        this.staticGraphics.fillStyle(0x162a40, 1);
        for (let wx = x; wx < runEnd; wx += 1) {
          const wallPx = wx * TILE;
          this.drawWallEdge(wallPx, py, wx, y, 0, -1);
          this.drawWallEdge(wallPx + TILE, py, wx, y, 1, 0);
          this.drawWallEdge(wallPx + TILE, py + TILE, wx, y, 0, 1);
          this.drawWallEdge(wallPx, py + TILE, wx, y, -1, 0);
        }
        x = runEnd;
      }
    }
    this.staticGraphics.fillStyle(0x0d2134, 1).fillRoundedRect((this.pacmanSpawn.x - 2) * TILE, (this.pacmanSpawn.y - 2) * TILE, TILE * 5, TILE * 5, 28);
    this.staticGraphics.lineStyle(2, 0x34d9ee, 0.48).strokeRoundedRect((this.pacmanSpawn.x - 2) * TILE, (this.pacmanSpawn.y - 2) * TILE, TILE * 5, TILE * 5, 28);
    this.staticGraphics.fillStyle(0x1d1533, 1).fillRoundedRect((this.teamStarts.ghosts.x - 2) * TILE, (this.teamStarts.ghosts.y - 2) * TILE, TILE * 5, TILE * 5, 28);
    this.staticGraphics.lineStyle(2, 0xc18bff, 0.48).strokeRoundedRect((this.teamStarts.ghosts.x - 2) * TILE, (this.teamStarts.ghosts.y - 2) * TILE, TILE * 5, TILE * 5, 28);
  },


  drawWallEdge(px, py, x, y, dx, dy) {
    if (this.maze[y + dy]?.[x + dx] === "#") return;
    let ax;
    let ay;
    let bx;
    let by;
    if (dy < 0) [ax, ay, bx, by] = [px + 4, py, px + TILE - 4, py];
    else if (dy > 0) [ax, ay, bx, by] = [px + 4, py + TILE, px + TILE - 4, py + TILE];
    else if (dx < 0) [ax, ay, bx, by] = [px, py + 4, px, py + TILE - 4];
    else [ax, ay, bx, by] = [px + TILE, py + 4, px + TILE, py + TILE - 4];
    this.staticGraphics.lineStyle(9, 0x0877d8, 0.10).lineBetween(ax, ay, bx, by);
    this.staticGraphics.lineStyle(2, 0x268fff, 0.82).lineBetween(ax, ay, bx, by);
  },


  drawPellets() {
    this.pelletGraphics.clear();
    this.pelletGraphics.fillStyle(0xd8eaff, 0.84);
    const activePellets = new Set();
    // Flat pellet list consumed by `nearestPellet` for NPC targeting; scanning
    // the whole maze per NPC tick froze the game as the world expanded.
    const pelletPositions = [];
    for (let y = 0; y < this.maze.length; y += 1) {
      for (let x = 0; x < this.maze[0].length; x += 1) {
        if (this.maze[y][x] === ".") {
          this.pelletGraphics.fillCircle(x * TILE + TILE / 2, y * TILE + TILE / 2, 2.3);
          pelletPositions.push({ x, y });
        } else if (this.maze[y][x] === "o") {
          pelletPositions.push({ x, y });
        }
        if (this.maze[y][x] === "O") {
          const key = `${x},${y}`;
          activePellets.add(key);
          if (!this.pelletSprites.has(key)) {
            const kind = ["sun", "frost", "spark"][(x + y) % 3];
            const sprite = this.add.sprite(x * TILE + TILE / 2, y * TILE + TILE / 2, characterAnimationData.pellets.texture);
            sprite.setDepth(2).setScale(0.62).play(`pellet-${kind}`);
            this.pelletSprites.set(key, sprite);
          }
        }
        if (this.maze[y][x] === "W") {
          this.pelletGraphics.fillStyle(0xffb44d, 0.22).fillCircle(x * TILE + TILE / 2, y * TILE + TILE / 2, 16);
          this.pelletGraphics.fillStyle(0xffc56d, 1);
          this.pelletGraphics.fillTriangle(x * TILE + TILE / 2, y * TILE + 8, x * TILE + 8, y * TILE + TILE / 2, x * TILE + TILE / 2, y * TILE + TILE - 8);
          this.pelletGraphics.fillTriangle(x * TILE + TILE / 2, y * TILE + 8, x * TILE + TILE - 8, y * TILE + TILE / 2, x * TILE + TILE / 2, y * TILE + TILE - 8);
          this.pelletGraphics.fillStyle(0xd8eaff, 0.84);
        }
      }
    }
    // Stale-sprite cleanup runs once per call. It used to sit inside the row
    // loop and executed rows× times per rebuild, which froze the frame loop
    // whenever pellets were eaten or the world expanded.
    for (const [key, sprite] of this.pelletSprites) {
      if (activePellets.has(key)) continue;
      sprite.destroy();
      this.pelletSprites.delete(key);
    }
    this.pelletPositions = pelletPositions;
  },


    placeMazeObjects() {
      const placements = [
        [this.teamStarts.pacmen, 0, -2, 1],
        [this.teamStarts.ghosts, 0, -2, 2],
        [{ x: Math.floor(this.maze[0].length / 2), y: Math.floor(this.maze.length / 2) }, -3, 0, 5],
        [{ x: Math.floor(this.maze[0].length / 2), y: Math.floor(this.maze.length / 2) }, 3, 0, 6],
        [{ x: Math.floor(this.maze[0].length / 2), y: Math.floor(this.maze.length / 2) }, 0, 3, 8],
      ];
      const offsets = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]];
      for (const [anchor, dx, dy, frame] of placements) {
        let position = null;
        for (const [offsetX, offsetY] of offsets) {
          const candidate = { x: anchor.x + dx + offsetX, y: anchor.y + dy + offsetY };
          if (isOpen(this.maze, candidate.x, candidate.y)) {
            position = candidate;
            break;
          }
        }
        if (!position) continue;
        const prop = this.add.image(position.x * TILE + TILE / 2, position.y * TILE + TILE / 2, characterAnimationData.objects.texture, frame);
        prop.setDepth(1).setScale(0.9);
        this.mazeObjectSprites.push(prop);
      }
    },


    isInSafeZone(actor) {
      if (!actor || !this.profile) return false;
      const home = this.teamStarts[this.profile.team];
      return Math.abs(actor.x - home.x) <= 2 && Math.abs(actor.y - home.y) <= 2;
    },


    // Runs every frame, so it must not touch the DOM unless a value changed.
    updateGameHud() {
      setHudText("game-hud-score", formatScore(this.score));
      const currentHearts = `${this.hearts}/${this.progression.maxHearts}`;
      const heartsEl = hudEl("game-hud-hearts");
      if (heartsEl && heartsEl.dataset.value !== currentHearts) {
        heartsEl.dataset.value = currentHearts;
        renderHeartIcons(heartsEl, this.hearts, this.progression.maxHearts, "game-heart");
      }
      setHudText("game-hud-hunger-value", `${Math.round(this.hunger)}%`);
      setHudText("game-hud-world", `WORLD ${String(this.worldHistory.length + 1).padStart(2, "0")}`);
      setHudText("game-hud-rank", hudEl("leader-rank")?.textContent ?? "");
      const cooldown = Math.max(0, (this.player.abilityReadyAt || 0) - this.elapsed);
      setHudText("ability-cooldown", cooldown > 0 ? `R · ${(cooldown / 1000).toFixed(1)}s` : "R · READY");
      hudEl("ability-cooldown")?.classList.toggle("is-cooling", cooldown > 0);
      const hint = hudEl("nearby-hint");
      if (hint) {
        const target = this.nearestWeakenedGhost();
        if (target) {
          setHudText("nearby-hint", `T · TAME ${target.name || "WISP"}`);
          hint.hidden = false;
        } else if (this.isInSafeZone(this.player)) {
          setHudText("nearby-hint", "SAFE ZONE · CATCH YOUR BREATH");
          hint.hidden = false;
        } else {
          hint.hidden = true;
        }
      }
    },


  drawEntities() {
    const visibleActors = new Set();
    const powerFading = this.isPowered() && this.powerUntil - this.elapsed < 2300;
    const render = (actor, family, color) => {
      visibleActors.add(actor);
      this.syncCharacterSprite(actor, family, color);
    };
    render(this.player, this.profile?.team === "ghosts" ? "ghost" : "runner", this.player.color);
    for (const ghost of this.ghosts) render(ghost, "ghost", ghost.color);
    for (const bot of this.pacmanBots) render(bot, "runner", 0xffd94d);
    for (const npc of this.ambientNpcs) render(npc, npc.kind, npc.color);
    for (const actor of this.remotePlayers.values()) {
      render(actor, actor.team === "ghosts" ? "ghost" : "runner", actor.color);
    }
    for (const companion of this.tamedCompanions) {
      render(companion, companion.kind === "ghost" ? "ghost" : "runner", companion.color || 0x79efbd);
    }
    for (const [actor, sprite] of this.characterSprites) {
      if (visibleActors.has(actor)) continue;
      sprite.destroy();
      actor.npcGlow?.destroy();
      actor.npcGlow = null;
      actor.npcPulse?.destroy();
      actor.npcPulse = null;
      actor.healthTag?.destroy();
      actor.healthTag = null;
      this.characterSprites.delete(actor);
    }
    const playerPoint = this.centerOf(this.player.x, this.player.y);
    this.powerText.setPosition(playerPoint.x, playerPoint.y - TILE * 1.4);
    this.powerText.setVisible(powerFading && Math.floor(this.elapsed / 170) % 2 === 0);
    this.updateGameHud();
    this.drawTargetLockIndicator();
    this.drawTamingIndicator();
    this.drawDroppedItems();
  },


  syncCharacterSprite(actor, family, color) {
    let sprite = this.characterSprites.get(actor);
    if (!sprite) {
      const texture = family === "ghost" ? characterAnimationData.ghost.texture : characterAnimationData.pacmen.texture;
      sprite = this.add.sprite(actor.x * TILE + TILE / 2, actor.y * TILE + TILE / 2, texture, 0);
      sprite.setOrigin(0.5).setDepth(3);
      this.characterSprites.set(actor, sprite);
    }
    const position = this.centerOf(actor.x, actor.y);
    const angle = { right: 0, down: 90, left: 180, up: 270 }[actor.direction || "right"];
    const animation = this.characterAnimationFor(actor, family);
    sprite.setPosition(position.x, position.y);
    sprite.setAngle(angle);
    const hurt = actor.damageFlashUntil > this.elapsed;
    const spriteScale = TILE / characterAnimationData.frameWidth * (this.visualScale || 1) * (hurt ? 1.08 : 1);
    sprite.setScale(spriteScale, spriteScale * (actor.crouching ? 0.68 : 1));
    const pacmanPowerActive = this.isPacmanPowerActive();
    const vulnerable = family === "ghost" && pacmanPowerActive && !actor.eaten;
    const poweredRunner = family === "runner"
      && (actor === this.player ? this.isPowered() : actor.poweredUntil > this.elapsed);
    const flashTint = Math.floor(this.elapsed / 90) % 2 ? 0xffa0a8 : 0xff7988;
    // Ghosts: always bright, never dark. Use team color with boosted saturation when vulnerable
    let spriteTint = color ?? 0xffffff;
    if (hurt) spriteTint = flashTint;
    else if (vulnerable) spriteTint = 0x00ff88; // Bright green when vulnerable
    else if (poweredRunner) spriteTint = 0xffe477;
    else if (family === "ghost") spriteTint = color ?? 0xff6c87; // Boost ghost visibility
    sprite.setTint(spriteTint);
    sprite.setAlpha(actor === this.player ? Math.min(1, 0.65 + Number(this.profile?.glow || 1) * 0.2) : 1);
    // Glow indicator for NPCs (non-player) to make them visible
    const isNPC = actor !== this.player && !this.remotePlayers.has(actor);
    const isGhostNPC = isNPC && family === "ghost";
    if (isNPC && !actor.npcGlow) {
      const glowColor = isGhostNPC ? 0xff6c87 : (color ?? 0xffffff);
      const glowSize = isGhostNPC ? TILE * 0.75 : TILE * 0.55;
      const glowAlpha = isGhostNPC ? 0.35 : 0.25;
      actor.npcGlow = this.add.circle(position.x, position.y, glowSize, glowColor, glowAlpha)
        .setDepth(2);
      this.tweens.add({
        targets: actor.npcGlow,
        alpha: glowAlpha * 1.6,
        scale: 1.25,
        duration: 1500,
        yoyo: true,
        repeat: -1,
      });
      // Outer pulse ring for ghosts
      if (isGhostNPC) {
        actor.npcPulse = this.add.circle(position.x, position.y, TILE * 0.95, glowColor, 0.15)
          .setStrokeStyle(2, glowColor, 0.6)
          .setDepth(1);
        this.tweens.add({
          targets: actor.npcPulse,
          alpha: 0,
          scale: 1.5,
          duration: 2000,
          yoyo: true,
          repeat: -1,
        });
      }
    }
    if (isNPC && actor.npcGlow) {
      actor.npcGlow.setPosition(position.x, position.y);
      actor.npcGlow.setScale((this.visualScale || 1) * (this.cameras.main.zoom || 1));
      if (isGhostNPC && actor.npcPulse) {
        actor.npcPulse.setPosition(position.x, position.y);
        actor.npcPulse.setScale((this.visualScale || 1) * (this.cameras.main.zoom || 1));
      }
    }
    if (sprite.anims.currentAnim?.key !== animation || !sprite.anims.isPlaying) {
      sprite.play(animation, true);
    }
    if (actor.name) {
      actor.nameTag ||= this.add.text(position.x, position.y, actor.name, {
        color: "#e7f5ff",
        backgroundColor: "#07111cdd",
        fontFamily: "Bahnschrift, Segoe UI, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        padding: { left: 6, right: 6, top: 3, bottom: 3 },
      }).setOrigin(0.5, 1).setDepth(6);
      // setText() re-rasterises the whole label into a canvas, so only do it
      // when the name actually changes rather than on every frame.
      if (actor.nameTag.text !== actor.name) actor.nameTag.setText(actor.name);
      actor.nameTag.setPosition(position.x, position.y - TILE * (this.visualScale || 1) * 1.78);
      actor.nameTag.setScale(1 / (this.cameras.main.zoom || 1));
    }
    if (Number.isFinite(actor.health)) {
      actor.healthTag ||= this.add.text(position.x, position.y - TILE * 0.77, "", {
        color: "#fff3f5",
        stroke: "#27101b",
        strokeThickness: 4,
        fontFamily: "Segoe UI Symbol, Segoe UI, sans-serif",
        fontSize: "18px",
        fontStyle: "bold",
      }).setOrigin(0.5, 1).setDepth(6);
      actor.healthTag.setPosition(position.x, position.y - TILE * (this.visualScale || 1) * 1.05);
      actor.healthTag.setScale(1 / (this.cameras.main.zoom || 1));
      const healthLabel = `${"♥".repeat(Math.max(0, Math.ceil(actor.health)))}${"♡".repeat(Math.max(0, Math.ceil((actor.maxHealth || actor.health) - actor.health)))}`;
      if (actor.healthTag.text !== healthLabel) actor.healthTag.setText(healthLabel);
      const healthColor = hurt ? "#fff" : actor.health <= 1 ? "#ff6c87" : "#ffc4d0";
      if (actor.healthTag.style.color !== healthColor) actor.healthTag.setColor(healthColor);
      if (hurt && actor.lastHealthTagHitAt !== actor.damageFlashUntil) {
        actor.lastHealthTagHitAt = actor.damageFlashUntil;
        const fixedScale = 1 / (this.cameras.main.zoom || 1);
        this.tweens.add({ targets: actor.healthTag, scaleX: fixedScale * 1.2, scaleY: fixedScale * 1.2, duration: 100, yoyo: true });
      }
    }
  },


  characterAnimationFor(actor, family) {
    const isPlayer = actor === this.player;
    if (actor.gameEnding) return `${family}-${actor.gameEnding}`;
    if (family === "ghost") {
      if (actor.betrayalStage === "eyes") return "ghost-eyes-return";
      if (actor.betrayalStage === "rebuild") return "ghost-rebuild";
      if (actor.eatState === "fright") return "ghost-fright";
      if (actor.eatState === "biting") {
        const age = this.elapsed - (actor.eatStartedAt || 0);
        const quarter = BITE_SEQUENCE_DURATION / 4;
        if (age < quarter) return "ghost-bite-1";
        if (age < quarter * 2) return "ghost-bite-2";
        if (age < quarter * 3) return "ghost-bite-3";
        return "ghost-bite-4";
      }
      if (actor.eatState === "eyes") return "ghost-eyes-only";
      if (actor.eatState === "regen") {
        const regenStart = actor.regenUntil - REGEN_DURATION;
        const elapsedRegen = Math.max(0, this.elapsed - regenStart);
        const quarter = REGEN_DURATION / 4;
        if (elapsedRegen < quarter) return "ghost-regen-1";
        if (elapsedRegen < quarter * 2) return "ghost-regen-2";
        if (elapsedRegen < quarter * 3) return "ghost-regen-3";
        return "ghost-regen-4";
      }
      if (actor.eaten) return actor.rebuildStartedAt > 0 ? "ghost-rebuild" : "ghost-eyes-return";
      if (actor.stunnedUntil > this.elapsed) return "ghost-stun";
      if (actor.damageUntil > this.elapsed) return "ghost-damage";
      if (actor.attackUntil > this.elapsed) return "ghost-attack";
      if (actor.attackWindupUntil > this.elapsed) return "ghost-attack-windup";
      if (isPlayer && actor.phaseUntil > this.elapsed) return "ghost-phase";
      if (isPlayer && this.isPowered()) return "ghost-trick";
      if (this.isPacmanPowerActive()) return "ghost-vulnerable";
      if (this.elapsed - (actor.movedAt ?? -Infinity) < 420) return "ghost-move";
      return "ghost-idle";
    }
    if (actor.damageUntil > this.elapsed) return "runner-damage";
    if (actor.poweredUntil > this.elapsed) return actor.powerTheme || "runner-fire";
    if (actor.attackUntil > this.elapsed) return "runner-attack";
    if (actor.respawnUntil > this.elapsed) return "runner-respawn";
    if (actor.invulnerableUntil > this.elapsed) return "runner-invulnerable";
    if (actor.dashUntil > this.elapsed) return "runner-dash";
    if (isPlayer && actor.pulseStartedAt !== undefined) {
      const pulseAge = this.elapsed - actor.pulseStartedAt;
      if (pulseAge < 220) return "runner-pulse-charge";
      if (pulseAge < 470) return "runner-pulse-blast";
      if (pulseAge < 820) return "runner-recover";
    }
    if (isPlayer && actor.shieldUntil > this.elapsed) return "runner-shield";
    if (isPlayer && this.isPowered()) {
      return actor.powerTheme || "runner-fire";
    }
    if (actor.eatingUntil > this.elapsed) return "runner-eat";
    if (actor.pelletForm && actor.pelletFormUntil > this.elapsed) {
      const formAnims = { speed: "runner-speed", crunch: "runner-crunch", phase: "runner-phase", shield: "runner-shield" };
      return formAnims[actor.pelletForm] || "runner-idle";
    }
    if (actor.turnUntil > this.elapsed) return "runner-turn";
    if (this.elapsed - (actor.movedAt ?? -Infinity) < 420) return "runner-move";
    return "runner-idle";
  },


  centerOf(x, y) {
    return { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
  }

};

