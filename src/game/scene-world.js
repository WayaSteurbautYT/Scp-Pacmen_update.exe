// MazeScene mixin: world expansion, camera, remote/world sync.

import { GHOST_COLORS, SKIN_COLORS, TILE } from "../constants.js";
import { expandMaze } from "../maze.js";
import { roomSocket } from "../network.js";
import { setNetworkStatus } from "../ui.js";

export const WorldMixin = {


  applyWorldShift(direction) {
    const shiftX = direction === "left" ? 12 : 0;
    const shiftY = direction === "up" ? 12 : 0;
    if (!shiftX && !shiftY) return;
    this.cameraTarget?.setPosition(
      this.cameraTarget.x + shiftX * TILE,
      this.cameraTarget.y + shiftY * TILE,
    );
    for (const actor of [this.player, ...this.ghosts, ...this.pacmanBots, ...this.tamedCompanions, ...this.ambientNpcs, ...this.remotePlayers.values()]) {
      actor.x += shiftX;
      actor.y += shiftY;
      const point = this.centerOf(actor.x, actor.y);
      actor.nameTag?.setPosition(point.x, point.y - TILE * 0.52);
      actor.healthTag?.setPosition(point.x, point.y - TILE * 0.77);
      if (actor.bubble?.active) actor.bubble.setPosition(point.x, point.y - TILE * 1.08);
    }
    this.teamStarts.pacmen.x += shiftX;
    this.teamStarts.pacmen.y += shiftY;
    this.teamStarts.ghosts.x += shiftX;
    this.teamStarts.ghosts.y += shiftY;
    this.pacmanSpawn.x += shiftX;
    this.pacmanSpawn.y += shiftY;
    for (const spawn of this.ghostSpawns) {
      spawn.x += shiftX;
      spawn.y += shiftY;
    }
    for (const sprite of this.mazeObjectSprites || []) {
      sprite.x += shiftX * TILE;
      sprite.y += shiftY * TILE;
    }
    for (const sprite of this.pelletSprites?.values() || []) {
      sprite.x += shiftX * TILE;
      sprite.y += shiftY * TILE;
    }
    if (this.spawnLabels) {
      for (const label of this.spawnLabels) {
        label.x += shiftX * TILE;
        label.y += shiftY * TILE;
      }
    }
  },


  syncRemotePlayers(players = []) {
    if (!roomSocket?.connected) this.pendingWorldExpansion = false;
    const nextPlayers = new Map();
    for (const remote of players) {
      if (remote.id === roomSocket?.id || !Number.isInteger(remote.x) || !Number.isInteger(remote.y)) continue;
      const actor = this.remotePlayers.get(remote.id) || {};
      Object.assign(actor, remote, {
        color: SKIN_COLORS[remote.skin] || GHOST_COLORS[0],
        direction: remote.direction || (remote.team === "ghosts" ? "left" : "right"),
        index: remote.index ?? 0,
        health: actor.health ?? 3,
        maxHealth: actor.maxHealth ?? 3,
      });
      if (actor.nameTag) actor.nameTag.setText(actor.name);
      if (!actor.nameTag && this.add) {
        actor.nameTag = this.add.text(actor.x * TILE + TILE / 2, actor.y * TILE - TILE * 0.52, actor.name, {
          color: "#e2f4ff",
          backgroundColor: "#081321",
          fontFamily: "monospace",
          fontSize: "11px",
          padding: { left: 5, right: 5, top: 3, bottom: 3 },
        }).setOrigin(0.5, 1).setDepth(5);
      }
      nextPlayers.set(remote.id, actor);
    }
    for (const [id, actor] of this.remotePlayers) {
      if (nextPlayers.has(id)) continue;
      actor.bubble?.destroy();
      actor.nameTag?.destroy();
      actor.healthTag?.destroy();
    }
    this.remotePlayers = nextPlayers;
    const localPlayer = players.find((player) => player.id === roomSocket?.id && player.team === this.profile?.team);
    if (localPlayer && this.profileReady) {
      Object.assign(this.player, {
        x: localPlayer.x,
        y: localPlayer.y,
        direction: localPlayer.direction,
      });
      this.cameraTarget?.setPosition(localPlayer.x * TILE + TILE / 2, localPlayer.y * TILE + TILE / 2);
    }
  },


  updateRemotePlayer(state) {
    const actor = this.remotePlayers.get(state.id);
    if (!actor || !Number.isInteger(state.x) || !Number.isInteger(state.y)) return;
    if (actor.x !== state.x || actor.y !== state.y) actor.movedAt = this.elapsed;
    Object.assign(actor, { x: state.x, y: state.y, direction: state.direction });
  },


  expandWorld(expansion) {
    if (expansion.sequence !== this.worldHistory.length) return;
    if (!["left", "right", "up", "down"].includes(expansion.direction)
      || !Number.isInteger(expansion.anchor?.x)
      || !Number.isInteger(expansion.anchor?.y)
      || !Number.isInteger(expansion.seed)) return;
    const oldPellets = this.maze.flat().filter((cell) => cell === "." || cell === "O").length;
    this.maze = expandMaze(this.maze, expansion.direction, expansion.anchor, 12, expansion.seed);
    this.applyWorldShift(expansion.direction);
    const newPellets = this.maze.flat().filter((cell) => cell === "." || cell === "O").length;
    this.totalPellets += newPellets - oldPellets;
    const savedExpansion = {
      direction: expansion.direction,
      anchor: { x: expansion.anchor.x, y: expansion.anchor.y },
      seed: expansion.seed >>> 0,
      sequence: this.worldHistory.length,
    };
    this.worldHistory.push(savedExpansion);
    if (roomSocket?.connected) window.networkHistory = this.worldHistory;
    this.pendingWorldExpansion = false;
    this.drawMaze();
    this.drawPellets();
    for (const sprite of this.mazeObjectSprites) sprite.destroy();
    this.mazeObjectSprites = [];
    this.placeMazeObjects();
    this.cameras.main.setBounds(0, 0, this.maze[0].length * TILE, this.maze.length * TILE);
  },


  setZoom(zoom) {
    const safeZoom = Math.min(2.4, Math.max(0.8, Number(zoom)));
    this.cameras.main.setZoom(safeZoom);
    if (this.cameraTarget) {
      this.cameras.main.centerOn(this.cameraTarget.x, this.cameraTarget.y);
    }
    if (this.profileReady) {
      const px = this.player.x * TILE + TILE / 2;
      const py = this.player.y * TILE + TILE / 2;
      this.cameras.main.centerOn(px, py);
      this.cameraTarget?.setPosition(px, py);
    }
  },


  updateRemoteLabels() {
    for (const actor of [this.player, ...this.ghosts, ...this.pacmanBots, ...this.tamedCompanions, ...this.ambientNpcs, ...this.remotePlayers.values()]) {
      const point = this.centerOf(actor.x, actor.y);
      const headOffset = TILE * (this.visualScale || 1);
      actor.nameTag?.setPosition(point.x, point.y - headOffset * 1.75);
      actor.healthTag?.setPosition(point.x, point.y - headOffset * 1.05);
      if (actor.bubble?.active) actor.bubble.setPosition(point.x, point.y - headOffset * 2.35);
      if (actor.typingBubble?.active) actor.typingBubble.setPosition(point.x, point.y - headOffset * 2.35);
    }
  },


  expandAtBoundary(direction) {
    if (this.pendingWorldExpansion || Date.now() < this.expansionRetryAfter) return false;
    const width = this.maze[0].length;
    const height = this.maze.length;
    const touchesBoundary = {
      left: this.player.x <= 1,
      right: this.player.x >= width - 2,
      up: this.player.y <= 1,
      down: this.player.y >= height - 2,
    }[direction];
    if (!touchesBoundary) return false;
    const expansion = {
      direction,
      anchor: { x: this.player.x, y: this.player.y },
      seed: crypto.getRandomValues(new Uint32Array(1))[0],
      sequence: this.worldHistory.length,
    };
    if (!roomSocket?.connected) {
      this.expandWorld(expansion);
      // Rate-limit offline expansions; the boundary check fires on every
      // movement step, and back-to-back full maze rebuilds in consecutive
      // frames flooded the GPU command queue.
      this.expansionRetryAfter = Date.now() + 350;
      return true;
    }
    this.pendingWorldExpansion = true;
    roomSocket.emit("world:expand", expansion, (result) => {
      if (result?.ok) return;
      this.pendingWorldExpansion = false;
      this.expansionRetryAfter = Date.now() + 750;
      setNetworkStatus(result?.error || "World expansion failed.", Boolean(roomSocket?.connected));
    });
    return true;
  },


  publishNetworkState() {
    if (roomSocket?.connected) {
      roomSocket.emit("game:state", {
        x: this.player.x,
        y: this.player.y,
        direction: this.player.direction,
      });
    }
  }

};

