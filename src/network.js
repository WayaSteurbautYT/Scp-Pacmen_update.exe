// Room connection, roster sync, chat transport and peer voice calls.

import { Peer } from "peerjs";
import { io } from "socket.io-client";
import { narratorEnabled, profile, setupScreen, $ } from "./state.js";
import { appendChat, renderOnlineRoster, setNetworkStatus, setVoiceStatus } from "./ui.js";

export let roomSocket;

export let localVoiceStream;

export let voicePeer;

export let voicePeerId = "";

export let micEnabled = false;

export let voiceStarting = false;

export let voiceOpenTimeout;

export let currentRoomCode = "";

export const voicePeers = new Map();

export const remoteAudio = new Map();

export const typingPlayers = new Map();

export const typingTimers = new Map();

export let localTypingTimeout;

export let localTypingActive = false;
window.networkPlayers = [];
window.networkHistory = [];
window.voiceRoster = [];


export function updateTypingIndicator() {
  const names = [...typingPlayers.values()].slice(0, 2);
  const indicator = $("#typing-indicator");
  indicator.hidden = names.length === 0;
  indicator.setAttribute("aria-label", names.length ? `${names.join(", ")} ${names.length === 1 ? "is" : "are"} typing` : "");
  indicator.querySelector(".typing-copy").textContent = names.length
    ? `${names.join(", ")} ${names.length === 1 ? "is" : "are"} typing`
    : "";
}


export function setLocalTyping(isTyping) {
  const nextTyping = Boolean(isTyping && $("#chat-input").value.trim());
  window.clearTimeout(localTypingTimeout);
  if (localTypingActive !== nextTyping) {
    localTypingActive = nextTyping;
    if (roomSocket?.connected) roomSocket.emit("chat:typing", { isTyping: nextTyping });
    window.dispatchEvent(new CustomEvent("game:typing", { detail: nextTyping }));
  }
  if (nextTyping) {
    localTypingTimeout = window.setTimeout(() => setLocalTyping(false), 1200);
  }
}


export function syncVoiceControls() {
  const narratorButton = $("#narrator-toggle");
  const settingsNarratorButton = document.querySelector('[data-menu-toggle="narrator-toggle"]');
  const setupNarratorButton = $("#setup-narrator");
  for (const button of [narratorButton, setupNarratorButton]) {
    button?.classList.toggle("is-on", narratorEnabled);
    button?.setAttribute("aria-pressed", String(narratorEnabled));
  }
  if (narratorButton) narratorButton.textContent = narratorEnabled ? "◉ NARRATOR ON" : "◉ NARRATOR OFF";
  if (setupNarratorButton) setupNarratorButton.textContent = narratorEnabled
    ? "NARRATOR ON · READS THE FIELD GUIDE AND CHARACTER DIALOGUE"
    : "NARRATOR OFF · TEXT AND DIALOGUE BUBBLES STAY ON";
  if (settingsNarratorButton) settingsNarratorButton.textContent = `CHARACTER NARRATOR ${narratorEnabled ? "ON" : "OFF"}`;
}


export function closeVoicePeer(peerId) {
  const connection = voicePeers.get(peerId);
  if (connection) {
    voicePeers.delete(peerId);
    connection.call.close();
  }
  const audio = remoteAudio.get(peerId);
  if (audio) {
    audio.pause();
    audio.srcObject = null;
    audio.remove();
    remoteAudio.delete(peerId);
  }
}


export function stopLocalVoice(notifyRoom = true) {
  if (notifyRoom && micEnabled) roomSocket?.emit("voice:stop");
  for (const peerId of voicePeers.keys()) closeVoicePeer(peerId);
  voicePeer?.destroy();
  voicePeer = null;
  voicePeerId = "";
  voiceStarting = false;
  window.clearTimeout(voiceOpenTimeout);
  voiceOpenTimeout = null;
  for (const track of localVoiceStream?.getTracks() || []) track.stop();
  localVoiceStream = null;
  micEnabled = false;
  const button = $("#mic-toggle");
  button.disabled = false;
  button.classList.remove("is-on");
  button.setAttribute("aria-pressed", "false");
  button.textContent = "MIC OFF";
}


export function attachVoiceCall(peerId, call) {
  if (!call || voicePeers.has(peerId)) {
    call?.close();
    return;
  }
  voicePeers.set(peerId, { call });
  call.on("stream", (stream) => {
    let audio = remoteAudio.get(peerId);
    if (!audio) {
      audio = document.createElement("audio");
      audio.autoplay = true;
      audio.setAttribute("playsinline", "");
      audio.className = "remote-voice-audio";
      remoteAudio.set(peerId, audio);
      document.body.append(audio);
    }
    audio.srcObject = stream;
    audio.play().catch((error) => setVoiceStatus(`Audio playback needs a click: ${error.message}`));
  });
  call.on("close", () => closeVoicePeer(peerId));
  call.on("error", (error) => {
    setVoiceStatus(`Voice call failed: ${error.message}`);
    closeVoicePeer(peerId);
  });
}


export function updateVoiceRoster(peers = []) {
  const active = new Set(peers.filter((peer) => peer.id !== roomSocket?.id).map((peer) => peer.id));
  for (const peerId of voicePeers.keys()) {
    if (!active.has(peerId)) closeVoicePeer(peerId);
  }
  if (!micEnabled || !roomSocket?.connected) return;
  const available = peers.filter((peer) => peer.id !== roomSocket.id);
  for (const peer of available) {
    if (roomSocket.id.localeCompare(peer.id) < 0 && peer.peerId && !voicePeers.has(peer.id)) {
      attachVoiceCall(peer.id, voicePeer.call(peer.peerId, localVoiceStream, { metadata: { name: profile.name } }));
    }
  }
  setVoiceStatus(available.length ? `Mic enabled · connecting to ${available.length} room player(s).` : "Mic enabled · waiting for another player to enable voice.");
}


export function beginPeerVoice(button, socket, stream) {
  const serverAddress = new URL($("#server-url").value.trim());
  let iceServers = [];
  const iceServersConfig = import.meta.env.VITE_ICE_SERVERS_JSON;
  if (iceServersConfig) {
    const parsed = JSON.parse(iceServersConfig);
    if (!Array.isArray(parsed)) throw new Error("VITE_ICE_SERVERS_JSON must be a JSON array.");
    iceServers = parsed;
  }
  const peer = new Peer(undefined, {
    host: import.meta.env.VITE_PEER_HOST || serverAddress.hostname,
    port: Number(import.meta.env.VITE_PEER_PORT || 9000),
    path: import.meta.env.VITE_PEER_PATH || "/voice",
    key: import.meta.env.VITE_PEER_KEY || "peerjs",
    secure: import.meta.env.VITE_PEER_SECURE === "true" || (import.meta.env.VITE_PEER_SECURE !== "false" && serverAddress.protocol === "https:"),
    debug: 0,
    config: { iceServers },
  });
  voicePeer = peer;
  peer.on("open", (peerId) => {
    if (voicePeer !== peer || roomSocket !== socket || !socket.connected) {
      peer.destroy();
      return;
    }
    voicePeerId = peerId;
    voiceStarting = false;
    window.clearTimeout(voiceOpenTimeout);
    voiceOpenTimeout = null;
    micEnabled = true;
    button.disabled = false;
    button.classList.add("is-on");
    button.setAttribute("aria-pressed", "true");
    button.textContent = "MIC ON";
    socket.emit("voice:ready", { peerId });
    setVoiceStatus("Mic active · voice is peer-to-peer. A TURN relay may be needed across some networks.");
  });
  peer.on("call", (call) => {
    if (voicePeer !== peer || !localVoiceStream || !micEnabled) {
      call.close();
      return;
    }
    const remote = window.voiceRoster?.find((entry) => entry.peerId === call.peer);
    if (!remote) {
      call.close();
      return;
    }
    call.answer(localVoiceStream);
    attachVoiceCall(remote.id, call);
  });
  peer.on("error", (error) => {
    if (voicePeer !== peer) return;
    stopLocalVoice(false);
    button.disabled = false;
    setVoiceStatus(`Voice service error: ${error.message}`);
  });
  peer.on("disconnected", () => {
    if (voicePeer === peer) setVoiceStatus("Voice signaling disconnected; current peer calls may continue.");
  });
  voiceOpenTimeout = window.setTimeout(() => {
    if (voicePeer !== peer || micEnabled) return;
    socket.emit("voice:stop");
    stopLocalVoice(false);
    button.disabled = false;
    setVoiceStatus("Voice signaling did not connect. Check the PeerServer address and port.");
  }, 10000);
}


export function startRoomConnection(event) {
  event.preventDefault();
  setLocalTyping(false);
  const lobbyButton = $("#lobby-button");
  if (roomSocket?.connected && lobbyButton.dataset.joined === "true") {
    if (micEnabled) roomSocket.emit("voice:stop");
    roomSocket.disconnect();
    return;
  }
  if (!profile?.name) {
    setNetworkStatus("Choose a player name before joining a room.");
    setupScreen.hidden = false;
    return;
  }

  let serverAddress;
  try {
    serverAddress = new URL($("#server-url").value.trim());
    if (!["http:", "https:"].includes(serverAddress.protocol)) throw new Error("Use an http:// or https:// server address.");
  } catch (error) {
    setNetworkStatus(`Invalid room server address: ${error.message}`);
    return;
  }

  const roomInput = $("#room-code");
  const roomCode = roomInput.value.trim().toUpperCase() || makeRoomCode();
  roomInput.value = roomCode;
  const button = lobbyButton;
  button.disabled = true;
  button.textContent = "…";
  setNetworkStatus(`Connecting to ${serverAddress.host}…`);
  stopLocalVoice();
  roomSocket?.disconnect();
  roomSocket = io(serverAddress.origin, { timeout: 7000, reconnection: false });
  const connectingSocket = roomSocket;
  window.roomSocket = roomSocket;

  roomSocket.on("connect", () => {
    const socket = roomSocket;
    socket.emit("lobby:join", {
      roomCode,
      name: profile.name,
      team: profile.team,
      skin: profile.skin,
    }, (result) => {
      if (!result?.ok) {
        const message = result?.error || "Room join failed.";
        socket.disconnect();
        if (roomSocket === socket) {
          roomSocket = null;
          window.roomSocket = null;
        }
        button.disabled = false;
        button.textContent = "JOIN";
        setNetworkStatus(message);
        return;
      }
      currentRoomCode = result.roomCode;
      window.networkSeed = result.seed;
      window.networkHistory = result.history;
      window.networkPlayers = result.players;
      setNetworkStatus(`Room ${result.roomCode} · share the server address and code with friends.`, true);
      button.disabled = false;
      button.textContent = "LEAVE";
      button.dataset.joined = "true";
      renderOnlineRoster(result.players);
      appendChat("NETWORK", `Connected to room ${result.roomCode}.`);
      window.dispatchEvent(new Event("game:restart"));
    });
  });
  roomSocket.on("connect_error", (error) => {
    setNetworkStatus(`Room connection failed: ${error.message}`);
    button.disabled = false;
    button.textContent = "JOIN";
    window.roomSocket = null;
    if (roomSocket === connectingSocket) roomSocket = null;
  });
  roomSocket.on("disconnect", (reason) => {
    setNetworkStatus(reason === "io client disconnect" ? "Left the room. Local play is still available." : `Disconnected: ${reason}`);
    button.disabled = false;
    button.textContent = "JOIN";
    button.dataset.joined = "false";
    currentRoomCode = "";
    window.networkSeed = null;
    window.networkHistory = [];
    window.networkPlayers = [];
    renderOnlineRoster();
    stopLocalVoice();
    window.dispatchEvent(new CustomEvent("network:players", { detail: [] }));
    window.dispatchEvent(new Event("game:restart"));
  });
  roomSocket.on("lobby:players", ({ players }) => {
    window.networkPlayers = players;
    renderOnlineRoster(players);
    window.dispatchEvent(new CustomEvent("network:players", { detail: players }));
  });
  roomSocket.on("game:state", (state) => {
    window.dispatchEvent(new CustomEvent("network:state", { detail: state }));
  });
  roomSocket.on("story:event", (storyEvent) => {
    window.dispatchEvent(new CustomEvent("network:story-event", { detail: storyEvent }));
  });
  roomSocket.on("world:expand", (expansion) => {
    window.dispatchEvent(new CustomEvent("network:expand", { detail: expansion }));
  });
  roomSocket.on("chat:message", (message) => {
    typingPlayers.delete(message.id);
    window.clearTimeout(typingTimers.get(message.id));
    typingTimers.delete(message.id);
    updateTypingIndicator();
    appendChat(message.name, message.message, "player-chat");
    window.dispatchEvent(new CustomEvent("network:chat", { detail: message }));
  });
  roomSocket.on("chat:typing", (typing) => {
    window.clearTimeout(typingTimers.get(typing.id));
    typingTimers.delete(typing.id);
    if (typing.isTyping) {
      typingPlayers.set(typing.id, typing.name);
      typingTimers.set(typing.id, window.setTimeout(() => {
        typingPlayers.delete(typing.id);
        typingTimers.delete(typing.id);
        updateTypingIndicator();
        window.dispatchEvent(new CustomEvent("network:typing", { detail: { ...typing, isTyping: false } }));
      }, 4500));
    } else {
      typingPlayers.delete(typing.id);
    }
    updateTypingIndicator();
    window.dispatchEvent(new CustomEvent("network:typing", { detail: typing }));
  });
  roomSocket.on("lobby:error", ({ message }) => {
    setNetworkStatus(message, Boolean(roomSocket?.connected));
    appendChat("NETWORK", message);
  });
  roomSocket.on("voice:roster", ({ peers }) => {
    window.voiceRoster = peers;
    updateVoiceRoster(peers);
  });
}


export function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
}


// Microphone toggle for the #mic-toggle button; owns all voice-start state.
export async function handleMicToggle(event) {
  if (micEnabled) {
    roomSocket?.emit("voice:stop");
    stopLocalVoice(false);
    setVoiceStatus("Microphone off.");
    return;
  }
  if (voiceStarting) return;
  if (!roomSocket?.connected) {
    setVoiceStatus("Join a network room before enabling your microphone.");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    setVoiceStatus("Microphone access needs a secure app page or localhost.");
    return;
  }
  const button = event.currentTarget;
  const socket = roomSocket;
  voiceStarting = true;
  button.disabled = true;
  button.textContent = "MIC STARTING…";
  setVoiceStatus("Requesting microphone permission…");
  try {
    localVoiceStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    if (!socket.connected || roomSocket !== socket) {
      for (const track of localVoiceStream.getTracks()) track.stop();
      localVoiceStream = null;
      setVoiceStatus("The room was left before microphone access completed.");
      return;
    }
    beginPeerVoice(button, socket, localVoiceStream);
    setVoiceStatus("Connecting to the room voice service…");
  } catch (error) {
    stopLocalVoice(false);
    button.disabled = false;
    setVoiceStatus(`Microphone unavailable: ${error.message}`);
  }
}

