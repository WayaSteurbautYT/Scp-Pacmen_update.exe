import { createServer } from "node:http";
import { randomInt } from "node:crypto";
import { Server } from "socket.io";

const MAX_PLAYERS = 12;
const ROOM_CODE = /^[A-Z0-9]{4,10}$/;
const SKINS = new Set(["gold", "cyan", "rose", "mint"]);
const DIRECTIONS = new Set(["up", "right", "down", "left"]);
const SPAWNS = {
  pacmen: { x: 4, y: 18, direction: "right" },
  ghosts: { x: 54, y: 18, direction: "left" },
};

function isAllowedOrigin(origin) {
  if (!origin || origin === "null" || origin === "file://") return true;
  const configuredOrigins = (process.env.PACMAN_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (configuredOrigins.includes(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d{1,5})?$/.test(origin);
}

function cleanName(value) {
  if (typeof value !== "string") return null;
  const name = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 18);
  return name.length >= 2 ? name : null;
}

function cleanRoomCode(value) {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return ROOM_CODE.test(code) ? code : null;
}

function roomPlayers(room) {
  return [...room.players.entries()].map(([id, player]) => ({
    id,
    name: player.name,
    team: player.team,
    skin: player.skin,
    x: player.x,
    y: player.y,
    direction: player.direction,
    micReady: player.micReady,
    peerId: player.peerId,
  }));
}

function acknowledge(callback, payload) {
  if (typeof callback === "function") callback(payload);
}

function rateLimited(socket, key, limit, windowMs) {
  const now = Date.now();
  const timestamps = (socket.data.rateLimits?.[key] || []).filter((time) => now - time < windowMs);
  if (timestamps.length >= limit) {
    socket.data.rateLimits ??= {};
    socket.data.rateLimits[key] = timestamps;
    return true;
  }
  timestamps.push(now);
  socket.data.rateLimits ??= {};
  socket.data.rateLimits[key] = timestamps;
  return false;
}

export function createRoomServer({ host = "0.0.0.0", port = 3100 } = {}) {
  const rooms = new Map();
  const httpServer = createServer((request, response) => {
    if (request.url !== "/health") {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ status: "ok", rooms: rooms.size }));
  });
  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        callback(isAllowedOrigin(origin) ? null : new Error("Origin not allowed"), isAllowedOrigin(origin));
      },
      methods: ["GET", "POST"],
    },
    allowRequest(request, callback) {
      callback(null, isAllowedOrigin(request.headers.origin));
    },
    maxHttpBufferSize: 64 * 1024,
  });

  function emitRoster(roomCode) {
    const room = rooms.get(roomCode);
    if (room) io.to(roomCode).emit("lobby:players", { players: roomPlayers(room) });
  }

  function findSpawn(room, team, excludedSocketId = null) {
    const base = SPAWNS[team];
    const occupied = new Set(
      [...room.players.entries()]
        .filter(([id]) => id !== excludedSocketId)
        .map(([, player]) => `${player.x},${player.y}`),
    );
    const offsets = [];
    for (let radius = 0; radius <= 2; radius += 1) {
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          if (Math.abs(dx) + Math.abs(dy) === radius) offsets.push({ x: dx, y: dy });
        }
      }
    }
    for (const offset of offsets) {
      const spawn = { x: base.x + offset.x, y: base.y + offset.y, direction: base.direction };
      for (const expansion of room.history) {
        if (expansion.direction === "left") spawn.x += 12;
        else if (expansion.direction === "up") spawn.y += 12;
      }
      if (!occupied.has(`${spawn.x},${spawn.y}`)) return spawn;
    }
    return { ...base };
  }

  function removeFromRoom(socket) {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    room?.players.delete(socket.id);
    socket.data.roomCode = null;
    socket.data.player = null;
    socket.data.micReady = false;
    socket.leave(roomCode);
    if (room?.players.size === 0) rooms.delete(roomCode);
    else {
      emitRoster(roomCode);
      io.to(roomCode).emit("voice:roster", {
        peers: roomPlayers(room).filter((peer) => peer.micReady).map(({ id, name, peerId }) => ({ id, name, peerId })),
      });
    }
  }

  io.on("connection", (socket) => {
    socket.data.rateLimits = {};
    socket.data.roomCode = null;
    socket.data.micReady = false;

    socket.on("lobby:join", async (payload, callback) => {
      const roomCode = cleanRoomCode(payload?.roomCode);
      const name = cleanName(payload?.name);
      const team = payload?.team;
      const skin = payload?.skin;
      if (!roomCode || !name || !["pacmen", "ghosts"].includes(team) || !SKINS.has(skin)) {
        acknowledge(callback, { ok: false, error: "Enter a valid room code, player name, team, and skin." });
        return;
      }
      if (socket.data.roomCode === roomCode) {
        acknowledge(callback, { ok: true, roomCode, seed: rooms.get(roomCode).seed, history: rooms.get(roomCode).history, players: roomPlayers(rooms.get(roomCode)) });
        return;
      }
      removeFromRoom(socket);
      let room = rooms.get(roomCode);
      if (!room) {
        room = { seed: randomInt(1, 0xffffffff), history: [], players: new Map() };
        rooms.set(roomCode, room);
      }
      if (room.players.size >= MAX_PLAYERS) {
        acknowledge(callback, { ok: false, error: `This room is full (${MAX_PLAYERS} players maximum).` });
        return;
      }
      const player = { name, team, skin, ...findSpawn(room, team), micReady: false };
      await socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.player = player;
      room.players.set(socket.id, player);
      acknowledge(callback, {
        ok: true,
        roomCode,
        seed: room.seed,
        history: room.history,
        players: roomPlayers(room),
      });
      emitRoster(roomCode);
    });

    socket.on("game:state", (state) => {
      const roomCode = socket.data.roomCode;
      const room = rooms.get(roomCode);
      if (!room || !socket.data.player) return;
      if (rateLimited(socket, "state", 20, 1000)) return;
      const x = Number(state?.x);
      const y = Number(state?.y);
      const direction = state?.direction;
      if (!Number.isInteger(x) || !Number.isInteger(y) || Math.abs(x) > 100000 || Math.abs(y) > 100000 || !DIRECTIONS.has(direction)) {
        socket.emit("lobby:error", { message: "Ignored invalid player position." });
        return;
      }
      Object.assign(socket.data.player, { x, y, direction });
      room.players.set(socket.id, socket.data.player);
      socket.to(roomCode).emit("game:state", { id: socket.id, x, y, direction });
    });

    socket.on("story:event", (payload) => {
      const roomCode = socket.data.roomCode;
      const player = rooms.get(roomCode)?.players.get(socket.id);
      if (!player || player.team !== "pacmen" || payload?.type !== "pacman-power") return;
      if (rateLimited(socket, "power-event", 2, 10000)) return;
      socket.to(roomCode).emit("story:event", {
        type: "pacman-power",
        id: socket.id,
        name: player.name,
        duration: 8500,
      });
    });

    socket.on("lobby:update", (payload) => {
      const roomCode = socket.data.roomCode;
      const room = rooms.get(roomCode);
      const player = room?.players.get(socket.id);
      const name = cleanName(payload?.name);
      const team = payload?.team;
      const skin = payload?.skin;
      if (!player || !name || !["pacmen", "ghosts"].includes(team) || !SKINS.has(skin)) {
        socket.emit("lobby:error", { message: "Couldn't update your lobby profile." });
        return;
      }
      Object.assign(player, { name, team, skin, ...findSpawn(room, team, socket.id) });
      emitRoster(roomCode);
    });

    socket.on("world:expand", (payload, callback) => {
      const roomCode = socket.data.roomCode;
      const room = rooms.get(roomCode);
      const { direction, anchor, seed } = payload || {};
      const clientSequence = payload?.sequence;
      if (!room || !socket.data.player || !["left", "right", "up", "down"].includes(direction) || !Number.isInteger(anchor?.x) || !Number.isInteger(anchor?.y) || Math.abs(anchor.x) > 100000 || Math.abs(anchor.y) > 100000 || !Number.isInteger(seed) || !Number.isInteger(clientSequence) || clientSequence < 0 || clientSequence > room.history.length) {
        const error = "Ignored invalid world expansion.";
        acknowledge(callback, { ok: false, error });
        socket.emit("lobby:error", { message: error });
        return;
      }
      if (room.history.length >= 10000) {
        const error = "This room has reached its world expansion limit.";
        acknowledge(callback, { ok: false, error });
        socket.emit("lobby:error", { message: error });
        return;
      }
      if (rateLimited(socket, "expand", 2, 1000)) {
        acknowledge(callback, { ok: false, error: "World expansion is rate limited. Please try again shortly." });
        return;
      }
      const adjustedAnchor = { x: anchor.x, y: anchor.y };
      for (const previousExpansion of room.history.slice(clientSequence)) {
        if (previousExpansion.direction === "left") adjustedAnchor.x += 12;
        else if (previousExpansion.direction === "up") adjustedAnchor.y += 12;
      }
      const expansion = {
        direction,
        anchor: adjustedAnchor,
        seed: seed >>> 0,
        sequence: room.history.length,
      };
      room.history.push(expansion);
      if (direction === "left") {
        for (const player of room.players.values()) player.x += 12;
      } else if (direction === "up") {
        for (const player of room.players.values()) player.y += 12;
      }
      io.to(roomCode).emit("world:expand", expansion);
      acknowledge(callback, { ok: true, sequence: expansion.sequence });
    });

    socket.on("chat:send", (payload) => {
      const roomCode = socket.data.roomCode;
      const player = socket.data.player;
      if (!roomCode || !player) {
        socket.emit("lobby:error", { message: "Join a room before sending lobby chat." });
        return;
      }
      if (rateLimited(socket, "chat", 8, 10000)) {
        socket.emit("lobby:error", { message: "Chat is temporarily rate limited." });
        return;
      }
      const message = typeof payload?.message === "string"
        ? payload.message.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 140)
        : "";
      if (!message) return;
      socket.to(roomCode).emit("chat:typing", { id: socket.id, name: player.name, isTyping: false });
      io.to(roomCode).emit("chat:message", {
        id: socket.id,
        name: player.name,
        message,
        sentAt: Date.now(),
      });
    });

    socket.on("chat:typing", (payload) => {
      const roomCode = socket.data.roomCode;
      const player = socket.data.player;
      if (!roomCode || !player || typeof payload?.isTyping !== "boolean") return;
      if (rateLimited(socket, "chatTyping", 6, 5000)) return;
      socket.to(roomCode).emit("chat:typing", {
        id: socket.id,
        name: player.name,
        isTyping: payload.isTyping,
      });
    });

    socket.on("voice:ready", (payload) => {
      const room = rooms.get(socket.data.roomCode);
      const player = room?.players.get(socket.id);
      const peerId = typeof payload?.peerId === "string" ? payload.peerId : "";
      if (!player || !/^[A-Za-z0-9_-]{3,64}$/.test(peerId)) {
        socket.emit("lobby:error", { message: "Voice could not be enabled: invalid voice peer ID." });
        return;
      }
      const peerInUse = [...room.players.entries()].some(
        ([id, other]) => id !== socket.id && other.micReady && other.peerId === peerId,
      );
      if (peerInUse) {
        socket.emit("lobby:error", { message: "Voice could not be enabled: peer ID is already in use." });
        return;
      }
      player.micReady = true;
      player.peerId = peerId;
      emitRoster(socket.data.roomCode);
      io.to(socket.data.roomCode).emit("voice:roster", {
        peers: roomPlayers(room).filter((peer) => peer.micReady).map(({ id, name, peerId }) => ({ id, name, peerId })),
      });
    });

    socket.on("voice:stop", () => {
      const room = rooms.get(socket.data.roomCode);
      const player = room?.players.get(socket.id);
      if (!player) return;
      player.micReady = false;
      player.peerId = null;
      emitRoster(socket.data.roomCode);
      io.to(socket.data.roomCode).emit("voice:roster", {
        peers: roomPlayers(room).filter((peer) => peer.micReady).map(({ id, name, peerId }) => ({ id, name, peerId })),
      });
    });

    socket.on("disconnect", () => removeFromRoom(socket));
  });

  return {
    io,
    httpServer,
    rooms,
    listen() {
      return new Promise((resolve, reject) => {
        httpServer.once("error", reject);
        httpServer.listen(port, host, () => {
          httpServer.removeListener("error", reject);
          resolve(httpServer.address());
        });
      });
    },
    close() {
      return new Promise((resolve) => io.close(resolve));
    },
  };
}

export { cleanName, cleanRoomCode, isAllowedOrigin };
