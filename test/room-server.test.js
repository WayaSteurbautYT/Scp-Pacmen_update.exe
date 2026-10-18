import test from "node:test";
import assert from "node:assert/strict";
import { io as createClient } from "socket.io-client";
import { cleanName, cleanRoomCode, createRoomServer, isAllowedOrigin } from "../server/room-server.js";

function waitFor(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

async function connectClient(url) {
  const socket = createClient(url, { transports: ["websocket"], reconnection: false });
  await waitFor(socket, "connect");
  return socket;
}

function joinRoom(socket, details) {
  return new Promise((resolve) => socket.emit("lobby:join", details, resolve));
}

test("room validation normalizes codes and rejects untrusted origins", () => {
  assert.equal(cleanRoomCode("  mAzE42 "), "MAZE42");
  assert.equal(cleanRoomCode("two words"), null);
  assert.equal(cleanName("  Player  "), "Player");
  assert.equal(cleanName("\n "), null);
  assert.equal(isAllowedOrigin("null"), true);
  assert.equal(isAllowedOrigin("http://192.168.1.20:5173"), true);
  assert.equal(isAllowedOrigin("https://malicious.example"), false);
  const previousOrigins = process.env.PACMAN_ALLOWED_ORIGINS;
  process.env.PACMAN_ALLOWED_ORIGINS = "https://maze.example,https://play.maze.example";
  assert.equal(isAllowedOrigin("https://maze.example"), true);
  process.env.PACMAN_ALLOWED_ORIGINS = previousOrigins;
});

test("rooms relay player state, chat, expansions, and voice signaling only to room peers", async () => {
  const roomServer = createRoomServer({ host: "127.0.0.1", port: 0 });
  const address = await roomServer.listen();
  const url = `http://127.0.0.1:${address.port}`;
  const sockets = [];

  try {
    const first = await connectClient(url);
    const second = await connectClient(url);
    const outsider = await connectClient(url);
    const third = await connectClient(url);
    sockets.push(first, second, outsider, third);

    const invalid = await joinRoom(first, {
      roomCode: "BAD CODE",
      name: "PlayerOne",
      team: "pacmen",
      skin: "gold",
    });
    assert.equal(invalid.ok, false);

    const firstJoined = await joinRoom(first, {
      roomCode: "TEST42",
      name: "PlayerOne",
      team: "pacmen",
      skin: "gold",
    });
    const secondJoined = await joinRoom(second, {
      roomCode: "TEST42",
      name: "PlayerTwo",
      team: "ghosts",
      skin: "cyan",
    });
    await joinRoom(outsider, {
      roomCode: "OTHER1",
      name: "Outsider",
      team: "pacmen",
      skin: "mint",
    });
    assert.equal(firstJoined.ok, true);
    assert.equal(secondJoined.seed, firstJoined.seed);
    assert.equal(secondJoined.players.length, 2);
    const thirdJoined = await joinRoom(third, {
      roomCode: "TEST42",
      name: "PlayerThree",
      team: "pacmen",
      skin: "mint",
    });
    assert.equal(thirdJoined.ok, true);
    const firstSpawn = thirdJoined.players.find((player) => player.id === first.id);
    const thirdSpawn = thirdJoined.players.find((player) => player.id === third.id);
    assert.notDeepEqual({ x: firstSpawn.x, y: firstSpawn.y }, { x: thirdSpawn.x, y: thirdSpawn.y });

    const typingReceived = waitFor(first, "chat:typing");
    second.emit("chat:typing", { isTyping: true });
    assert.deepEqual(await typingReceived, { id: second.id, name: "PlayerTwo", isTyping: true });

    const stateReceived = waitFor(first, "game:state");
    second.emit("game:state", { x: 60, y: 18, direction: "left" });
    assert.deepEqual(await stateReceived, { id: second.id, x: 60, y: 18, direction: "left" });

    const powerEventReceived = waitFor(second, "story:event");
    first.emit("story:event", { type: "pacman-power" });
    assert.deepEqual(await powerEventReceived, {
      type: "pacman-power",
      id: first.id,
      name: "PlayerOne",
      duration: 8500,
    });
    let ghostTriggeredPowerEvent = false;
    const recordForbiddenEvent = () => { ghostTriggeredPowerEvent = true; };
    first.on("story:event", recordForbiddenEvent);
    second.emit("story:event", { type: "pacman-power" });
    await new Promise((resolve) => setTimeout(resolve, 40));
    first.off("story:event", recordForbiddenEvent);
    assert.equal(ghostTriggeredPowerEvent, false);

    const chatReceived = waitFor(first, "chat:message");
    second.emit("chat:send", { message: "Hello from the other team" });
    const chat = await chatReceived;
    assert.equal(chat.name, "PlayerTwo");
    assert.equal(chat.message, "Hello from the other team");

    const expansionReceived = waitFor(first, "world:expand");
    const originExpansionReceived = waitFor(second, "world:expand");
    const expansionAccepted = new Promise((resolve) => {
      second.emit("world:expand", { direction: "left", anchor: { x: 1, y: 18 }, seed: 7341, sequence: 0 }, resolve);
    });
    const expectedExpansion = {
      direction: "left",
      anchor: { x: 1, y: 18 },
      seed: 7341,
      sequence: 0,
    };
    assert.deepEqual(await expansionReceived, expectedExpansion);
    assert.deepEqual(await originExpansionReceived, expectedExpansion);
    assert.deepEqual(await expansionAccepted, { ok: true, sequence: 0 });
    assert.equal(roomServer.rooms.get("TEST42").players.get(second.id).x, 72);

    const shiftedExpansionReceived = waitFor(second, "world:expand");
    const shiftedExpansionAccepted = new Promise((resolve) => {
      first.emit("world:expand", {
        direction: "up",
        anchor: { x: 4, y: 18 },
        seed: 981,
        sequence: 0,
      }, resolve);
    });
    assert.deepEqual(await shiftedExpansionReceived, {
      direction: "up",
      anchor: { x: 16, y: 18 },
      seed: 981,
      sequence: 1,
    });
    assert.deepEqual(await shiftedExpansionAccepted, { ok: true, sequence: 1 });

    const invalidExpansion = new Promise((resolve) => {
      third.emit("world:expand", {
        direction: "down",
        anchor: { x: 4, y: 18 },
        seed: 12,
        sequence: 10,
      }, resolve);
    });
    assert.equal((await invalidExpansion).ok, false);

    const updatedRoster = waitFor(first, "lobby:players");
    second.emit("lobby:update", { name: "PlayerTwo", team: "ghosts", skin: "cyan" });
    const roster = await updatedRoster;
    assert.equal(roster.players.find((player) => player.id === second.id).x, 66);

    const firstVoiceRoster = waitFor(first, "voice:roster");
    first.emit("voice:ready", { peerId: "voice-peer-one" });
    assert.deepEqual((await firstVoiceRoster).peers.map(({ id, peerId }) => ({ id, peerId })), [
      { id: first.id, peerId: "voice-peer-one" },
    ]);
    const secondVoiceRoster = waitFor(first, "voice:roster");
    second.emit("voice:ready", { peerId: "voice-peer-two" });
    const readyPeers = (await secondVoiceRoster).peers;
    assert.equal(readyPeers.length, 2);
    assert.deepEqual(readyPeers.map(({ peerId }) => peerId).sort(), ["voice-peer-one", "voice-peer-two"]);

    let outsiderSawChat = false;
    outsider.on("chat:message", () => { outsiderSawChat = true; });
    second.emit("chat:send", { message: "room scoped" });
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.equal(outsiderSawChat, false);
  } finally {
    for (const socket of sockets) socket.disconnect();
    await roomServer.close();
  }
});
