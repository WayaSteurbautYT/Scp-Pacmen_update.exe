// MazeScene core: lifecycle, input, profile selection, update loop.

import Phaser from "phaser";
import abilityEffectsAtlasUrl from "../../assets/characters/ability-effects-atlas.svg?url";
import characterAnimationData from "../../assets/characters/character-animations.json";
import coinsAtlasUrl from "../../assets/characters/coins-atlas.svg?url";
import ghostAtlasUrl from "../../assets/characters/ghost-atlas.svg?url";
import mazeObjectsAtlasUrl from "../../assets/characters/maze-objects-atlas.svg?url";
import pacmenAtlasUrl from "../../assets/characters/pacmen-atlas.svg?url";
import specialPelletsAtlasUrl from "../../assets/characters/special-pellets-atlas.svg?url";
import { INVENTORY_ITEMS } from "../character-content.js";
import { GHOST_COLORS, SKIN_COLORS, TILE } from "../constants.js";
import { updateProgressUI } from "../hud.js";
import { COLUMNS, GHOST_STARTS, PACMAN_START, ROWS, TEAM_STARTS, createMaze, expandMaze } from "../maze.js";
import { roomSocket } from "../network.js";
import { loadInventory, loadProgress } from "../profile.js";
import { createProgression, normalizeProgression } from "../progression.js";
import { AiMixin } from "./scene-ai.js";
import { CombatMixin } from "./scene-combat.js";
import { EconomyMixin } from "./scene-economy.js";
import { IndicatorsMixin } from "./scene-indicators.js";
import { MenusMixin } from "./scene-menus.js";
import { MovementMixin } from "./scene-movement.js";
import { RenderMixin } from "./scene-render.js";
import { StoryMixin } from "./scene-story.js";
import { WorldMixin } from "./scene-world.js";
import { bubbleEnabled, profile, setupScreen, $ } from "../state.js";
import { appendChat, hueToTint, renderQuestBoard, renderShop, renderSkillTree } from "../ui.js";

class MazeScene extends Phaser.Scene {
  constructor() {
    super("maze");
  }


  preload() {
    this.load.svg("pacmen-atlas-source", pacmenAtlasUrl, {
      width: characterAnimationData.pacmen.columns * characterAnimationData.frameWidth,
      height: characterAnimationData.pacmen.rows * characterAnimationData.frameHeight,
    });
    this.load.svg("ghost-atlas-source", ghostAtlasUrl, {
      width: characterAnimationData.ghost.columns * characterAnimationData.frameWidth,
      height: characterAnimationData.ghost.rows * characterAnimationData.frameHeight,
    });
    this.load.svg("maze-object-atlas-source", mazeObjectsAtlasUrl, {
      width: characterAnimationData.objects.columns * characterAnimationData.frameWidth,
      height: characterAnimationData.objects.rows * characterAnimationData.frameHeight,
    });
    this.load.svg("special-pellet-atlas-source", specialPelletsAtlasUrl, {
      width: characterAnimationData.pellets.columns * characterAnimationData.frameWidth,
      height: characterAnimationData.pellets.rows * characterAnimationData.frameHeight,
    });
    this.load.svg("ability-effect-atlas-source", abilityEffectsAtlasUrl, {
      width: characterAnimationData.effects.columns * characterAnimationData.frameWidth,
      height: characterAnimationData.effects.rows * characterAnimationData.frameHeight,
    });
    this.load.svg("coin-atlas-source", coinsAtlasUrl, {
      width: characterAnimationData.coins.columns * characterAnimationData.frameWidth,
      height: characterAnimationData.coins.rows * characterAnimationData.frameHeight,
    });
  }


  installCharacterArt() {
    for (const family of ["pacmen", "ghost", "objects", "pellets", "effects", "coins"]) {
      const manifest = characterAnimationData[family];
      const textureKey = manifest.texture;
      if (!this.textures.exists(textureKey)) {
        const sourceKey = family === "pacmen" ? "pacmen" : family === "objects" ? "maze-object" : family === "pellets" ? "special-pellet" : family === "effects" ? "ability-effect" : family === "coins" ? "coin" : family;
        this.textures.addSpriteSheet(
          textureKey,
          this.textures.get(`${sourceKey}-atlas-source`).getSourceImage(),
          {
            frameWidth: characterAnimationData.frameWidth,
            frameHeight: characterAnimationData.frameHeight,
            endFrame: manifest.frameCount - 1,
          },
        );
      }
      const animations = manifest.animations || {};
      for (const [key, animation] of Object.entries(animations)) {
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(textureKey, { frames: animation.frames }),
          frameRate: animation.frameRate,
          repeat: animation.repeat,
        });
      }
    }
    for (const [key, frames] of Object.entries({
      "pellet-sun": [0, 3, 6, 9],
      "pellet-frost": [1, 4, 7, 10],
      "pellet-spark": [2, 5, 8, 11],
    })) {
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(characterAnimationData.pellets.texture, { frames }),
          frameRate: 5,
          repeat: -1,
        });
      }
    }
  }


  create() {
    this.installCharacterArt();
    // A WebGL context loss (GPU reset, driver hiccup, or a Graphics command
    // flood) used to leave a black canvas with no recovery path. Preventing
    // default allows the browser to restore the context; afterwards we force
    // a full redraw of the persistent Graphics + sprites.
    this.game.canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      appendChat("SYSTEM", "Graphics context lost — waiting for the GPU to recover…");
    });
    this.game.canvas.addEventListener("webglcontextrestored", () => {
      this.drawMaze();
      this.drawPellets();
      this.drawEntities();
      appendChat("SYSTEM", "Graphics context restored.");
    });
    this.maze = createMaze(COLUMNS, ROWS, window.networkSeed ?? Date.now());
    this.score = 0;
    this.progression = createProgression();
    this.hearts = this.progression.maxHearts;
    this.hunger = 100;
    this.hungerTick = 0;
    this.hungerDamageTick = 0;
    this.tamedCompanions = [];
    this.ambientNpcs = [];
    this.inventory = loadInventory(profile?.name);
    this.betrayalPlayed = profile?.name ? localStorage.getItem(`neon-maze-betrayal:${profile.name.toLowerCase()}`) === "true" : false;
    this.powerUntil = 0;
    this.powerOrbCount = 0;
    this.pulseCharges = 3;
    this.ghostEatChain = 0;
    this.knockouts = 0;
    this.lockedTarget = null;
    this.started = false;
    this.profileReady = false;
    this.paused = false;
    this.finished = false;
    this.elapsed = 0;
    this.playerTick = 0;
    this.ghostTicks = GHOST_STARTS.map((_, index) => 420 + index * 85);
    this.player = { ...PACMAN_START, direction: "right", queuedDirection: null, team: "pacmen", color: SKIN_COLORS.gold, pelletForm: null, pelletFormUntil: 0 };
    this.teamStarts = { pacmen: { ...TEAM_STARTS.pacmen }, ghosts: { ...TEAM_STARTS.ghosts } };
    this.pacmanSpawn = { ...PACMAN_START };
    this.ghostSpawns = GHOST_STARTS.map((spawn) => ({ ...spawn }));
    this.ghosts = GHOST_STARTS.map((position, index) => ({
      ...position,
      color: GHOST_COLORS[index],
      index,
      name: ["Blinky", "Pinky", "Inky", "Clyde"][index],
      team: "ghosts",
      health: 3,
      maxHealth: 3,
      eatState: "idle",
      eatStartedAt: 0,
      eyesUntil: 0,
      regenUntil: 0,
      panicUntil: 0,
    }));
    this.pacmanBots = [];
    this.remotePlayers = new Map();
    this.worldHistory = [...(window.networkHistory || [])];
    this.pendingWorldExpansion = false;
    this.expansionRetryAfter = 0;
    // Pellet consumption / global ghost panic event controller
    this.pelletEventActive = false;
    this.pelletEventUntil = 0;
    this.pelletEventPacman = null;
    this.pelletEventCooldownUntil = 0;
    this.pelletEventWarned = false;
    for (const expansion of this.worldHistory) {
      this.maze = expandMaze(this.maze, expansion.direction, expansion.anchor, 12, expansion.seed);
      this.applyWorldShift(expansion.direction);
    }
    this.totalPellets = this.maze.flat().filter((cell) => cell === "." || cell === "O").length;
    this.pelletsEaten = 0;
    this.staticGraphics = this.add.graphics();
    this.pelletGraphics = this.add.graphics();
    this.entityGraphics = this.add.graphics();
    this.characterSprites = new Map();
    this.pelletSprites = new Map();
    this.mazeObjectSprites = [];
    this.abilitySprites = new Set();
    this.syncRemotePlayers(window.networkPlayers || []);
    this.spawnLabels = [
      this.add.text(this.pacmanSpawn.x * TILE, this.pacmanSpawn.y * TILE - 94, "PAC-MAN BASE", { color: "#74efff", fontFamily: "monospace", fontSize: "13px", fontStyle: "bold" }).setOrigin(0.5),
      this.add.text(this.teamStarts.ghosts.x * TILE, this.teamStarts.ghosts.y * TILE - 94, "GHOST BASE", { color: "#d5a8ff", fontFamily: "monospace", fontSize: "13px", fontStyle: "bold" }).setOrigin(0.5),
    ];
    this.powerText = this.add.text(31, 23, "POWER FADING", {
      color: "#123c65",
      fontFamily: "monospace",
      fontSize: "12px",
      fontStyle: "bold",
    }).setVisible(false);
    this.readyText = this.add.text(this.player.x * TILE + TILE / 2, this.player.y * TILE - 58, "WASD MOVE · SPACE ATTACK · C PULSE · T TAME · Q DASH · R ABILITY", {
      color: "#8ca9c9",
      fontFamily: "monospace",
      fontSize: "11px",
      fontStyle: "bold",
    }).setOrigin(0.5, 0);
    this.drawMaze();
    this.drawPellets();
    this.placeMazeObjects();
    this.spawnAmbientNpcs();
    this.cameras.main.setBounds(0, 0, this.maze[0].length * TILE, this.maze.length * TILE);
    this.cameras.main.setZoom(Number($("#zoom-slider").value));
    this.cameraTarget = this.add.zone(this.player.x * TILE + TILE / 2, this.player.y * TILE + TILE / 2);
    this.cameras.main.centerOn(this.cameraTarget.x, this.cameraTarget.y);
    this.cameras.main.startFollow(this.cameraTarget, true, 0.5, 0.5);
    this.bindKeys();
    this.events.once("shutdown", this.shutdown, this);
    this.publishStats();
    window.dispatchEvent(new CustomEvent("game:ready"));

    // Ensure canvas receives keyboard focus so controls always work
    const canvas = this.canvas;
    if (canvas) {
      canvas.setAttribute("tabindex", "0");
      canvas.focus();
      this.input.on("pointerdown", () => canvas.focus());
    }

    this.input.keyboard.on("keydown", (event) => {
      if (event.repeat) return;
      const direction = {
        ArrowUp: "up", KeyW: "up",
        ArrowRight: "right", KeyD: "right",
        ArrowDown: "down", KeyS: "down",
        ArrowLeft: "left", KeyA: "left",
      }[event.code];
      if (event.target instanceof HTMLElement
        && event.target.closest("input, textarea, [contenteditable='true']")) return;
      if (["Digit1", "Digit2", "Digit3", "Digit4"].includes(event.code) && this.paused) return;
      if (setupScreen.hidden === false && event.target?.tagName === "BUTTON") return;
      if (direction && !this.paused && !this.finished) {
        if (!this.profileReady) return;
        const now = performance.now();
        const lastTap = this.player.lastDirectionTap;
        if (lastTap?.direction === direction && now - lastTap.time < 320) {
          this.player.braking = true;
          this.player.queuedDirection = null;
          $("#brake-hint").textContent = "BRAKE! Tap a direction to roll again.";
          this.time.delayedCall(1600, () => { $("#brake-hint").textContent = "Tap the same direction twice to brake."; });
          this.player.lastDirectionTap = null;
          return;
        }
        this.player.lastDirectionTap = { direction, time: now };
        this.player.braking = false;
        this.player.queuedDirection = direction;
        if (!this.started) {
          this.started = true;
          this.readyText.setVisible(false);
          window.dispatchEvent(new Event("game:started"));
        }
      }
      if (event.code === "Space" && this.profileReady && !this.paused) {
        event.preventDefault();
        this.useBasicAttack();
      }
      if (event.code === "ControlLeft" || event.code === "ControlRight") this.player.crouching = true;
      if (event.code === "KeyE" && this.profileReady) this.openGameMenu("inventory");
      if (event.code === "KeyR" && this.profileReady && !this.paused) this.castSelectedAbility();
      if (event.code === "KeyC" && this.profileReady && !this.paused) this.usePulse();
      if (event.code === "KeyT" && this.profileReady && !this.paused) this.tameNearby();
      if (event.code === "KeyL" && this.profileReady && !this.paused) this.toggleTargetLock();
      if (event.code === "KeyQ" && this.profileReady && !this.paused) this.useDash();
      if (/^Digit[1-3]$/.test(event.code) && this.profileReady) {
        const item = INVENTORY_ITEMS.filter(({ hotbar }) => hotbar)[Number(event.code.slice(-1)) - 1];
        if (item) this.useInventoryItem(item.id);
      }
      if (event.code === "Digit4" && this.profileReady) this.openGameMenu("inventory");
      if (event.code === "KeyI" && this.profileReady) this.openGameMenu("inventory");
      if (event.code === "KeyG" && this.profileReady && !this.paused) this.talkNearby();
    });
    this.input.on("pointerdown", (pointer) => {
      if (pointer.leftButtonDown() && this.profileReady && !this.paused && this.started) this.useBasicAttack();
    });
    this.input.keyboard.on("keyup", (event) => {
      if (event.code === "ControlLeft" || event.code === "ControlRight") this.player.crouching = false;
    });
  }


  bindKeys() {
    window.addEventListener("game:pause", this.onPause = () => this.togglePause());
    window.addEventListener("game:zoom", this.onZoom = (event) => this.setZoom(event.detail));
    window.addEventListener("game:visual-size", this.onVisualSize = (event) => {
      this.visualScale = event.detail;
      this.drawEntities();
    });
    window.addEventListener("game:profile", this.onProfile = (event) => this.selectProfile(event.detail));
    window.addEventListener("game:say", this.onSay = (event) => this.showBubble(this.player, event.detail, 2100));
    window.addEventListener("game:say-to", this.onSayTo = (event) => {
      const { actor, message } = event.detail || {};
      if (actor && message) this.showBubble(actor, message, 2200);
    });
    window.addEventListener("game:typing", this.onLocalTyping = (event) => {
      if (event.detail && bubbleEnabled) this.showBubble(this.player, "···", 1500);
      else if (this.player.typingBubble) {
        this.player.typingBubble.destroy();
        this.player.typingBubble = null;
        this.player.bubble = null;
      }
    });
    window.addEventListener("game:purchase", this.onPurchase = (event) => this.buyItem(event.detail));
    window.addEventListener("game:unlock-ability", this.onUnlockAbility = (event) => this.buyAbility(event.detail));
    window.addEventListener("game:rebirth", this.onRebirth = () => this.rebirth());
    window.addEventListener("game:use-item", this.onUseItem = (event) => this.useInventoryItem(event.detail));
    window.addEventListener("network:players", this.onNetworkPlayers = (event) => this.syncRemotePlayers(event.detail));
    window.addEventListener("network:state", this.onNetworkState = (event) => this.updateRemotePlayer(event.detail));
    window.addEventListener("network:story-event", this.onNetworkStoryEvent = (event) => this.handleNetworkStoryEvent(event.detail));
    window.addEventListener("network:expand", this.onNetworkExpand = (event) => this.expandWorld(event.detail, false));
    window.addEventListener("network:chat", this.onNetworkChat = (event) => {
      const player = this.remotePlayers.get(event.detail.id);
      if (player) {
        player.typingBubble?.destroy();
        player.typingBubble = null;
        this.showBubble(player, event.detail.message, 2200);
      }
    });
    window.addEventListener("network:typing", this.onNetworkTyping = (event) => {
      const player = this.remotePlayers.get(event.detail.id);
      if (!player) return;
      if (event.detail.isTyping && bubbleEnabled) {
        player.typingBubble = this.showBubble(player, "···", 4500);
      } else {
        player.typingBubble?.destroy();
        player.typingBubble = null;
      }
    });
    window.addEventListener("game:bubbles", this.onBubbles = () => {
      for (const actor of [this.player, ...this.ghosts, ...this.pacmanBots, ...this.ambientNpcs, ...this.tamedCompanions, ...this.remotePlayers.values()]) {
        actor.bubble?.destroy();
        actor.typingBubble?.destroy();
        actor.bubble = null;
        actor.typingBubble = null;
      }
    });
    window.addEventListener("game:restart", this.onRestart = () => {
      if (this.scene.isActive()) this.scene.restart();
    });
  }


  shutdown() {
    window.removeEventListener("game:pause", this.onPause);
    window.removeEventListener("game:zoom", this.onZoom);
    window.removeEventListener("game:visual-size", this.onVisualSize);
    window.removeEventListener("game:profile", this.onProfile);
    window.removeEventListener("game:say", this.onSay);
    window.removeEventListener("game:say-to", this.onSayTo);
    window.removeEventListener("game:typing", this.onLocalTyping);
    window.removeEventListener("game:purchase", this.onPurchase);
    window.removeEventListener("game:unlock-ability", this.onUnlockAbility);
    window.removeEventListener("game:rebirth", this.onRebirth);
    window.removeEventListener("game:use-item", this.onUseItem);
    window.removeEventListener("network:players", this.onNetworkPlayers);
    window.removeEventListener("network:state", this.onNetworkState);
    window.removeEventListener("network:story-event", this.onNetworkStoryEvent);
    window.removeEventListener("network:expand", this.onNetworkExpand);
    window.removeEventListener("network:chat", this.onNetworkChat);
    window.removeEventListener("network:typing", this.onNetworkTyping);
    window.removeEventListener("game:bubbles", this.onBubbles);
    window.removeEventListener("game:restart", this.onRestart);
  }


  selectProfile(nextProfile) {
    this.profile = nextProfile;
    this.profileReady = true;
    this.progression = loadProgress(nextProfile.name, nextProfile.team, nextProfile.startingAbility);
    this.progression = normalizeProgression({ ...this.progression, faction: nextProfile.team }, nextProfile.team);
    this.inventory = loadInventory(nextProfile.name);
    this.betrayalPlayed = localStorage.getItem(`neon-maze-betrayal:${nextProfile.name.toLowerCase()}`) === "true";
    this.hearts = this.progression.maxHearts;
    this.hunger = 100;
    this.hungerDamageTick = 0;
    const roomPlayer = window.networkPlayers?.find(
      (player) => player.id === roomSocket?.id && player.team === nextProfile.team,
    );
    this.player = {
      ...(roomPlayer || this.teamStarts[nextProfile.team]),
      direction: roomPlayer?.direction || (nextProfile.team === "pacmen" ? "right" : "left"),
      queuedDirection: null,
      team: nextProfile.team,
      color: hueToTint(nextProfile.colorHue ?? 45),
      name: nextProfile.name,
      health: this.progression.maxHearts,
      maxHealth: this.progression.maxHearts,
    };
    $("#squad-title").textContent = nextProfile.team === "ghosts" ? "PAC-MAN TARGET" : "GHOST SQUAD";
    $("#tip-copy").textContent = nextProfile.team === "ghosts"
      ? "Use your pulse burst to catch the Pac-Bot. Your ghost squad will cover the maze."
      : "Power orbs make the ghost squad vulnerable for a few seconds.";
    this.visualScale = Number($("#visual-slider").value);
    this.pacmanBots = nextProfile.team === "ghosts"
      ? [{ ...this.pacmanSpawn, direction: "right", index: 0, name: "Mochi", health: 4, maxHealth: 4, hunger: 100, kind: "runner", team: "pacmen" }]
      : [];
    this.started = false;
    this.finished = false;
    this.paused = false;
    this.hearts = this.progression.maxHearts;
    this.hunger = 100;
    this.hungerTick = 0;
    this.hungerDamageTick = 0;
    this.score = 0;
    this.elapsed = 0;
    this.powerUntil = 0;
    this.pulseCharges = Math.min(9, 3 + this.progression.pulseTier);
    this.tamedCompanions = [];
    this.cameras.main.centerOn(this.player.x * TILE, this.player.y * TILE);
    this.cameraTarget?.setPosition(this.player.x * TILE + TILE / 2, this.player.y * TILE + TILE / 2);
    this.readyText.setPosition(this.player.x * TILE + TILE / 2, this.player.y * TILE - 58);
    $("#pulse-count").textContent = String(this.pulseCharges).padStart(2, "0");
    this.drawEntities();
    for (const actor of [this.player, ...this.ghosts, ...this.pacmanBots, ...this.tamedCompanions]) {
      if (actor.bubble?.active) {
        const point = this.centerOf(actor.x, actor.y);
        actor.bubble.setPosition(point.x, point.y - TILE * 1.08);
      }
    }
    this.publishStats();
    renderQuestBoard(this.progression);
    renderShop(this.progression);
    renderSkillTree(this.progression, this.profile.team);
    updateProgressUI(this.progression, this.hunger, this.hearts);
    $("#pulse-count").textContent = String(this.pulseCharges).padStart(2, "0");
    window.dispatchEvent(new Event("game:profile-ready"));
    this.updateTargetLockUI();
    if (nextProfile.team === "ghosts") {
      this.time.delayedCall(1800, () => {
        appendChat("PAC-BOT", "··· is thinking", "npc-chat");
        if (bubbleEnabled) this.showBubble(this.pacmanBots[0], "...", 1200);
      });
      this.time.delayedCall(3100, () => {
        appendChat("PAC-BOT", "Try and catch me, hunter!", "npc-chat");
        if (bubbleEnabled) this.showBubble(this.pacmanBots[0], "Try and catch me!", 1800);
      });
    }
  }


  update(_time, delta) {
    // Error boundary: an exception thrown here used to silently kill the frame
    // loop, which presented as a frozen black screen. Contain it, report the
    // first few occurrences, and keep the loop alive.
    try {
      if (this.paused || this.finished) return;
      this.elapsed += delta;
      this.updateRemoteLabels();
      if (this.cameraTarget && this.profileReady) {
        this.cameraTarget.setPosition(this.player.x * TILE + TILE / 2, this.player.y * TILE + TILE / 2);
      }
      this.updateBetrayalStory();
      this.updateAmbientNpcs(delta);
      this.updateGhostEating(delta);
      this.updatePelletForms(delta);
      this.updateTaming(delta);
      this.respawnDefeatedActors();
      if (!this.started) {
        this.drawEntities();
        return;
      }
      this.updateCharacterChatter(delta);
      this.updateHunger(delta);
      this.playerTick += delta;
      for (let index = 0; index < this.ghostTicks.length; index += 1) this.ghostTicks[index] += delta;

      const playerStepInterval = this.player.dashUntil > this.elapsed || this.player.phaseUntil > this.elapsed
        ? 62 : this.player.crouching ? 260 : 125;
      if (this.playerTick >= playerStepInterval) {
        this.playerTick %= playerStepInterval;
        this.movePlayer();
      }
      this.ghosts.forEach((ghost, index) => {
        const training = Math.floor((this.progression.level - 1) * 8 + this.worldHistory.length * 2);
        const interval = this.isPowered() ? 530 : Math.max(230, 390 + (index % 2) * 65 - training);
        if (this.ghostTicks[index] >= interval) {
          this.ghostTicks[index] %= interval;
          this.moveGhost(ghost);
        }
      });
      this.pacmanBots.forEach((bot) => {
        bot.tick = (bot.tick || 0) + delta;
        if (bot.tick >= 420) {
          bot.tick %= 420;
          const next = this.smartBotStep(bot);
          if (next) {
            Object.assign(bot, next, { movedAt: this.elapsed });
            this.collectNpcPowerOrb(bot);
          }
        }
      });
      this.companionTick = (this.companionTick || 0) + delta;
      if (this.companionTick >= 420) {
        this.companionTick %= 420;
        this.moveCompanions();
      }
      this.checkCollisions();
      this.updateEnemyAbilities();
      this.drawEntities();
    } catch (error) {
      this.updateErrorCount = (this.updateErrorCount || 0) + 1;
      if (this.updateErrorCount <= 3) {
        console.error("MazeScene.update failed:", error);
        appendChat("SYSTEM", `Frame error contained: ${error.message}`);
      }
    }
  }
}
Object.assign(MazeScene.prototype,
  WorldMixin,
  MenusMixin,
  IndicatorsMixin,
  RenderMixin,
  AiMixin,
  StoryMixin,
  CombatMixin,
  MovementMixin,
  EconomyMixin,
);

export default MazeScene;

