// Bootstrap: Phaser game config and DOM wiring.

import Phaser from "phaser";
import { loadMusicFile, playGameSound, playTone, sayNarrated, setNarrationEngine, stopNarration, toggleMusic, updateMusicVolume } from "./audio.js";
import "./intro.js";
import { INVENTORY_ITEMS } from "./character-content.js";
import { GAME_HEIGHT, GAME_WIDTH } from "./constants.js";
import MazeScene from "./game/MazeScene.js";
import { updateProgressUI } from "./hud.js";
import { handleMicToggle, roomSocket, setLocalTyping, startRoomConnection, syncVoiceControls } from "./network.js";
import { renderLeaderboard } from "./profile.js";
import { ABILITIES } from "./progression.js";
import { bindSkillsScreen } from "./skills-screen.js";
import { autonomyEnabled, bubbleEnabled, hudScale, introScreen, loadingScreen, narratorEnabled, overlay, profile, setAutonomyEnabled, setBubbleEnabled, setHudScale, setNarratorEnabled, setProfile, setSoundEnabled, setupScreen, setVisualScale, setVolume, soundEnabled, usernameInput, visualScale, volume, $ } from "./state.js";
import { bindTutorialEvents, closeTutorial, initTutorial, openTutorial } from "./tutorial.js";
import { appendChat, renderStartingAbilities, setCreationHue, setRaceSelection, setWizardStage, showToast, syncAutonomyControls } from "./ui.js";


function startSelectedRun() {
  const modeCopy = profile.sessionMode === "training"
    ? "Opening the training room. No hearts will be lost on this shift."
    : profile.sessionMode === "rooms"
      ? "Joining the room. The local maze is ready while the crew checks in."
      : "Loading the story maze. Please do not feed the loading screen.";
  $("#loading-caption").textContent = modeCopy;
  loadingScreen.hidden = false;
  setupScreen.hidden = true;
  overlay.hidden = true;
  document.body.classList.add("immersive-game");
  game.scale.refresh();
  window.setTimeout(() => {
    window.dispatchEvent(new Event("game:restart"));
    appendChat("SYSTEM", `Welcome, ${profile.name}. You entered ${profile.team === "ghosts" ? "the Ghosts" : "the Pac-Men"} · ${profile.sessionMode || "story"} mode.`);
    window.setTimeout(() => { loadingScreen.hidden = true; }, 520);
  }, 260);
}


function applyProfile(nextProfile) {
  setProfile(nextProfile);
  profile.colorHue = Number.isFinite(Number(profile.colorHue))
    ? Math.max(0, Math.min(359, Number(profile.colorHue)))
    : ({ gold: 45, cyan: 188, rose: 330, mint: 155 }[profile.skin] ?? 45);
  profile.abilityHue = Number.isFinite(Number(profile.abilityHue))
    ? Math.max(0, Math.min(359, Number(profile.abilityHue))) : 188;
  setVisualScale(Math.min(1.8, Math.max(0.8, Number(profile.characterSize) || 1.15)));
  $("#visual-slider").value = String(visualScale);
  $("#visual-value").value = `${Math.round(visualScale * 100)}%`;
  $("#creation-size").value = String(visualScale);
  $("#creation-size-value").value = `${Math.round(visualScale * 100)}%`;
  $("#creation-glow").value = String(profile.glow || 1);
  $("#creation-glow-value").value = `${Math.round(Number(profile.glow || 1) * 100)}%`;
  setCreationHue($("#creation-hue"), $("#creation-hue-value"), profile.colorHue);
  setCreationHue($("#creation-ability-hue"), $("#creation-ability-hue-value"), profile.abilityHue);
  document.documentElement.style.setProperty("--character-color", `hsl(${profile.colorHue} 86% 58%)`);
  document.documentElement.style.setProperty("--ability-color", `hsl(${profile.abilityHue} 86% 58%)`);
  localStorage.setItem("neon-maze-profile", JSON.stringify(profile));
  $("#profile-badge").textContent = `${profile.name} · ${profile.team === "ghosts" ? "GHOST" : "PAC-MAN"}`;
  usernameInput.value = profile.name;
  setRaceSelection(profile.team, false, profile.startingAbility || ABILITIES[profile.team][0].id);
  renderLeaderboard();
  syncVoiceControls();
  syncAutonomyControls();
  if (roomSocket?.connected) {
    roomSocket.emit("lobby:update", {
      name: profile.name,
      team: profile.team,
      skin: profile.skin,
    });
  }
}

if (profile) applyProfile(profile);
else {
  setProfile({ name: "", team: "pacmen", skin: "gold", colorHue: 45, abilityHue: 188 });
  setRaceSelection(profile.team);
  setCreationHue($("#creation-hue"), $("#creation-hue-value"), profile.colorHue);
  setCreationHue($("#creation-ability-hue"), $("#creation-ability-hue-value"), profile.abilityHue);
}
renderStartingAbilities(profile.team || "pacmen", profile.startingAbility || ABILITIES[profile.team || "pacmen"][0].id);
$("#username-input").value = profile.name;
renderLeaderboard();


const panelLabel = document.querySelector(".panel-label");


const privacyDialog = $("#privacy-dialog");
for (const button of document.querySelectorAll("[data-open-privacy]")) {
  button.addEventListener("click", () => privacyDialog.showModal());
}
$("[data-close-privacy]").addEventListener("click", () => privacyDialog.close());
privacyDialog.addEventListener("click", (event) => {
  if (event.target === privacyDialog) privacyDialog.close();
});


// The status label lives in the game panel header. If a markup change ever
// removes it again, skip the cosmetic update instead of throwing, which would
// stop every listener registered below from running.
function setPanelLabel(html) {
  if (panelLabel) panelLabel.innerHTML = html;
}

window.addEventListener("game:ready", () => {
  setPanelLabel('<span class="status-dot"></span> CHOOSE YOUR PLAYER');
  if (profile?.name) {
    setupScreen.hidden = true;
    window.dispatchEvent(new CustomEvent("game:profile", { detail: profile }));
  } else {
    setupScreen.hidden = false;
  }
  overlay.hidden = true;
  if (game.scene.isActive("maze")) {
    const scene = game.scene.getScene("maze");
    updateProgressUI(scene.progression, scene.hunger, scene.hearts);
  }
});
window.addEventListener("game:profile-ready", () => {
  setPanelLabel('<span class="status-dot"></span> READY TO PLAY');
});
window.addEventListener("game:started", () => {
  setPanelLabel('<span class="status-dot"></span> LIVE MAZE');
});
window.addEventListener("game:pause-state", (event) => {
  setPanelLabel(event.detail
    ? '<span class="status-dot paused-dot"></span> PAUSED'
    : '<span class="status-dot"></span> LIVE MAZE');
});


const game = new Phaser.Game({
  // WebGL when the machine supports it; the software Canvas renderer was the
  // single biggest source of frame lag (it re-tints and re-rasterises sprites
  // on the CPU every frame).
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "game-canvas",
  backgroundColor: "#091323",
  render: { antialias: true, pixelArt: false, roundPixels: true, powerPreference: "high-performance" },
  fps: { target: 60, smoothStep: true },
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MazeScene],
});

// The tutorial flow needs the game instance (scene access + restart wiring)
// without importing this module back, so it is injected once here.
initTutorial(game);
bindTutorialEvents();
bindSkillsScreen();
window.addEventListener("tutorial:launch-run", () => startSelectedRun());

$("#restart-button").addEventListener("click", () => window.dispatchEvent(new Event("game:restart")));
$("#profile-button").addEventListener("click", () => {
  const scene = game.scene.getScene("maze");
  scene.paused = true;
  setupScreen.hidden = false;
  setWizardStage("character");
  usernameInput.value = profile?.name || "";
  usernameInput.focus();
});
$("#overlay-restart").addEventListener("click", () => {
  overlay.hidden = true;
  window.dispatchEvent(new Event("game:restart"));
});
$("#setup-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!usernameInput.reportValidity()) return;
  const selectedTeam = $("#race-picker").dataset.team || "pacmen";
  const colorHue = Number($("#creation-hue").value);
  const abilityHue = Number($("#creation-ability-hue").value);
  const selectedSkin = "custom";
  const selectedAbility = document.querySelector(".starting-ability.selected")?.dataset.startingAbility
    || ABILITIES[selectedTeam][0].id;
  const selectedMode = document.querySelector(".session-option.selected")?.dataset.sessionMode || "story";
  const nextProfile = {
    name: usernameInput.value.trim(),
    team: selectedTeam,
    skin: selectedSkin,
    startingAbility: selectedAbility,
    sessionMode: selectedMode,
    characterSize: Number($("#creation-size").value),
    glow: Number($("#creation-glow").value),
    colorHue,
    abilityHue,
  };
  if (nextProfile.name.length < 2) {
    usernameInput.setCustomValidity("Please enter at least two characters.");
    usernameInput.reportValidity();
    return;
  }
  usernameInput.setCustomValidity("");
  applyProfile(nextProfile);
  if (selectedMode === "rooms") {
    $("#server-url").value = $("#setup-server-url").value.trim();
    $("#room-code").value = $("#setup-room-code").value.trim();
    $("#network-form").requestSubmit();
  }
  if ($("#start-tutorial").checked) {
    setupScreen.hidden = true;
    openTutorial(true);
  } else startSelectedRun();
});
$("#creation-next").addEventListener("click", () => {
  if (!usernameInput.reportValidity()) return;
  if (usernameInput.value.trim().length < 2) {
    usernameInput.setCustomValidity("Please enter at least two characters.");
    usernameInput.reportValidity();
    return;
  }
  usernameInput.setCustomValidity("");
  setWizardStage("session");
});
$("#creation-back").addEventListener("click", () => setWizardStage("character"));
for (const option of document.querySelectorAll(".session-option")) {
  option.addEventListener("click", () => {
    for (const candidate of document.querySelectorAll(".session-option")) {
      const selected = candidate === option;
      candidate.classList.toggle("selected", selected);
      candidate.setAttribute("aria-pressed", String(selected));
    }
    $("#setup-room-fields").hidden = option.dataset.sessionMode !== "rooms";
  });
}
$("#setup-server-url").addEventListener("input", (event) => { $("#server-url").value = event.currentTarget.value; });
$("#setup-room-code").addEventListener("input", (event) => { $("#room-code").value = event.currentTarget.value; });
usernameInput.addEventListener("input", () => usernameInput.setCustomValidity(""));
$("#race-previous").addEventListener("click", () => {
  setRaceSelection("pacmen", true);
});
$("#race-next").addEventListener("click", () => {
  setRaceSelection("ghosts", true);
});
$("#starting-ability-picker").addEventListener("click", (event) => {
  const button = event.target.closest("[data-starting-ability]");
  if (!button) return;
  for (const item of document.querySelectorAll("[data-starting-ability]")) {
    const selected = item === button;
    item.classList.toggle("selected", selected);
    item.setAttribute("aria-pressed", String(selected));
  }
});
$("#creation-hue").addEventListener("input", (event) => {
  const hue = setCreationHue(event.currentTarget, $("#creation-hue-value"), event.currentTarget.value);
  document.documentElement.style.setProperty("--character-color", `hsl(${hue} 86% 58%)`);
});
$("#creation-ability-hue").addEventListener("input", (event) => {
  const hue = setCreationHue(event.currentTarget, $("#creation-ability-hue-value"), event.currentTarget.value);
  document.documentElement.style.setProperty("--ability-color", `hsl(${hue} 86% 58%)`);
});

function updateCameraZoom(value) {
  const zoom = Number(value);
  $("#zoom-slider").value = String(zoom);
  $("#zoom-value").value = `${Math.round(zoom * 100)}%`;
  for (const control of document.querySelectorAll("[data-camera-zoom]")) {
    control.value = String(zoom);
    control.nextElementSibling.value = `${Math.round(zoom * 100)}%`;
  }
  localStorage.setItem("neon-maze-camera-zoom", String(zoom));
  window.dispatchEvent(new CustomEvent("game:zoom", { detail: zoom }));
}


function updateCharacterSize(value) {
  setVisualScale(Number(value));
  $("#visual-slider").value = String(visualScale);
  $("#visual-value").value = `${Math.round(visualScale * 100)}%`;
  $("#creation-size").value = String(visualScale);
  $("#creation-size-value").value = `${Math.round(visualScale * 100)}%`;
  for (const control of document.querySelectorAll("[data-character-size]")) {
    control.value = String(visualScale);
    control.nextElementSibling.value = `${Math.round(visualScale * 100)}%`;
  }
  window.dispatchEvent(new CustomEvent("game:visual-size", { detail: visualScale }));
}


function updateHudScale(value) {
  setHudScale(Number(value));
  document.documentElement.style.setProperty("--hud-scale", String(hudScale));
  $("#hud-scale-value").value = `${Math.round(hudScale * 100)}%`;
  for (const control of document.querySelectorAll("[data-hud-scale]")) {
    control.value = String(hudScale);
    control.nextElementSibling.value = `${Math.round(hudScale * 100)}%`;
  }
  localStorage.setItem("neon-maze-hud-scale", String(hudScale));
}

$("#zoom-slider").addEventListener("input", (event) => updateCameraZoom(event.currentTarget.value));
for (const control of document.querySelectorAll("[data-camera-zoom]")) {
  control.addEventListener("input", (event) => updateCameraZoom(event.currentTarget.value));
}
$("#visual-slider").addEventListener("input", (event) => updateCharacterSize(event.currentTarget.value));
for (const control of document.querySelectorAll("[data-character-size]")) {
  control.addEventListener("input", (event) => updateCharacterSize(event.currentTarget.value));
}
$("#creation-size").addEventListener("input", (event) => updateCharacterSize(event.currentTarget.value));
$("#creation-glow").addEventListener("input", (event) => {
  $("#creation-glow-value").value = `${Math.round(Number(event.currentTarget.value) * 100)}%`;
  document.documentElement.style.setProperty("--creation-glow", String(event.currentTarget.value));
});
$("#hud-scale-slider").addEventListener("input", (event) => updateHudScale(event.currentTarget.value));
for (const control of document.querySelectorAll("[data-hud-scale]")) {
  control.addEventListener("input", (event) => updateHudScale(event.currentTarget.value));
}

const savedCameraZoom = Number(localStorage.getItem("neon-maze-camera-zoom"));
updateCameraZoom(Number.isFinite(savedCameraZoom) ? savedCameraZoom : Number($("#zoom-slider").value));

const savedHudScale = Number(localStorage.getItem("neon-maze-hud-scale"));
updateHudScale(Number.isFinite(savedHudScale) ? savedHudScale : Number($("#hud-scale-slider").value));
updateCharacterSize(Number($("#visual-slider").value));
for (const slider of [$("#volume-slider"), $("#settings-volume")]) {
  slider.addEventListener("input", (event) => {
    setVolume(Number(event.currentTarget.value) / 100);
    updateMusicVolume(volume);
    for (const control of [$("#volume-slider"), $("#settings-volume")]) control.value = String(Math.round(volume * 100));
    $("#volume-value").value = $("#settings-volume-value").value = `${Math.round(volume * 100)}%`;
  });
}
const narratorEngineSelect = $("#narration-engine");
narratorEngineSelect.value = localStorage.getItem("neon-maze-tts-engine") === "system" ? "system" : "kokoro";
narratorEngineSelect.addEventListener("change", (event) => setNarrationEngine(event.currentTarget.value));
for (const slider of [$("#volume-slider"), $("#settings-volume")]) slider.value = String(Math.round(volume * 100));
$("#volume-value").value = $("#settings-volume-value").value = `${Math.round(volume * 100)}%`;
$("#sound-toggle").textContent = soundEnabled ? "♫ SOUND ON" : "♫ SOUND OFF";
$("#sound-toggle").classList.toggle("is-on", soundEnabled);
$("#sound-toggle").setAttribute("aria-pressed", String(soundEnabled));
$("#bubble-toggle").textContent = bubbleEnabled ? "◉ BUBBLES ON" : "◉ BUBBLES OFF";
$("#bubble-toggle").classList.toggle("is-on", bubbleEnabled);
$("#bubble-toggle").setAttribute("aria-pressed", String(bubbleEnabled));
document.body.classList.toggle("hide-chat-bubbles", !bubbleEnabled);
$("#sound-toggle").addEventListener("click", (event) => {
  setSoundEnabled(!soundEnabled);
  event.currentTarget.classList.toggle("is-on", soundEnabled);
  event.currentTarget.setAttribute("aria-pressed", String(soundEnabled));
  event.currentTarget.textContent = soundEnabled ? "♫ SOUND ON" : "♫ SOUND OFF";
  if (soundEnabled) playTone(660);
});
$("#music-toggle").addEventListener("click", (event) => {
  const musicOn = toggleMusic();
  event.currentTarget.classList.toggle("is-on", musicOn);
  event.currentTarget.setAttribute("aria-pressed", String(musicOn));
  event.currentTarget.textContent = musicOn ? "♪ MUSIC ON" : "♪ MUSIC OFF";
});
$("#music-file-input").addEventListener("change", (event) => {
  const input = event.currentTarget;
  loadMusicFile(input.files?.[0]);
  input.value = "";
});
$("#bubble-toggle").addEventListener("click", (event) => {
  setBubbleEnabled(!bubbleEnabled);
  event.currentTarget.classList.toggle("is-on", bubbleEnabled);
  event.currentTarget.setAttribute("aria-pressed", String(bubbleEnabled));
  event.currentTarget.textContent = bubbleEnabled ? "◉ BUBBLES ON" : "◉ BUBBLES OFF";
  document.body.classList.toggle("hide-chat-bubbles", !bubbleEnabled);
  window.dispatchEvent(new Event("game:bubbles"));
});
$("#narrator-toggle").addEventListener("click", (event) => {
  setNarratorEnabled(!narratorEnabled);
  localStorage.setItem("neon-maze-narrator", String(narratorEnabled));
  syncVoiceControls();
  if (!narratorEnabled) stopNarration();
  if (narratorEnabled) {
    playGameSound("select");
    sayNarrated("Character narrator online. I promise to be only a little dramatic.");
  }
});
$("#autonomy-toggle").addEventListener("click", (event) => {
  setAutonomyEnabled(!autonomyEnabled);
  localStorage.setItem("neon-maze-autonomy", String(autonomyEnabled));
  syncAutonomyControls();
  showToast(autonomyEnabled ? "CHARACTER AUTONOMY ON" : "CHARACTER AUTONOMY OFF",
    autonomyEnabled ? "Your character may occasionally helpfully or chaotically borrow the controls." : "Your character will leave the steering to you.");
});
$("#setup-narrator").addEventListener("click", () => $("#narrator-toggle").click());
$("#setup-autonomy").addEventListener("click", () => $("#autonomy-toggle").click());
syncVoiceControls();
syncAutonomyControls();
$("#fullscreen-button").addEventListener("click", async () => {
  const target = document.querySelector(".game-layout");
  document.body.classList.add("immersive-game");
  $("#game-menu").hidden = true;
  try {
    if (!document.fullscreenElement) await target.requestFullscreen();
  } catch (error) {
    appendChat("SYSTEM", `Using full-window maze mode; native full screen was unavailable: ${error.message}`);
  }
  game.scale.refresh();
});

const leaveImmersiveMaze = async () => {
  if (!$("#game-menu").hidden) game.scene.getScene("maze").closeGameMenu();
  document.body.classList.remove("immersive-game", "game-chat-open");
  $("#game-menu").hidden = true;
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch (error) {
      appendChat("SYSTEM", `Couldn't exit native full screen: ${error.message}`);
    }
  }
  game.scale.refresh();
};
$("#game-exit-button").addEventListener("click", leaveImmersiveMaze);
$("#game-menu-button").addEventListener("click", () => game.scene.getScene("maze").openGameMenu("inventory"));
$("#game-menu-close").addEventListener("click", () => game.scene.getScene("maze").closeGameMenu());
$("#game-menu-resume").addEventListener("click", () => game.scene.getScene("maze").closeGameMenu());
for (const tab of document.querySelectorAll("[data-game-tab]")) {
  tab.addEventListener("click", () => game.scene.getScene("maze").showGameMenuPage(tab.dataset.gameTab));
}
$("#game-menu").addEventListener("click", async (event) => {
  const toggle = event.target.closest("[data-menu-toggle]");
  if (toggle) document.getElementById(toggle.dataset.menuToggle)?.click();
  const ability = event.target.closest("[data-ability-id]")?.dataset.abilityId;
  if (ability) window.dispatchEvent(new CustomEvent("game:unlock-ability", { detail: ability }));
  if (event.target.closest("[data-rebirth]")) window.dispatchEvent(new Event("game:rebirth"));
  const inventoryItem = event.target.closest("[data-inventory-item]")?.dataset.inventoryItem;
  if (inventoryItem) window.dispatchEvent(new CustomEvent("game:use-item", { detail: inventoryItem }));
  const action = event.target.closest("[data-menu-action]")?.dataset.menuAction;
  if (action === "tutorial") {
    openTutorial();
  }
  if (action === "privacy") {
    privacyDialog.showModal();
  }
  if (action === "delete-local-data") {
    const confirmed = window.confirm("Delete this device's saved player profile, progress, inventory, scores, and settings? This cannot be undone.");
    if (confirmed) {
      localStorage.clear();
      window.location.reload();
    }
  }
  if (action === "restart") {
    game.scene.getScene("maze").closeGameMenu();
    overlay.hidden = true;
    window.dispatchEvent(new Event("game:restart"));
  }
  if (action === "change-profile") {
    game.scene.getScene("maze").closeGameMenu();
    setupScreen.hidden = false;
    setWizardStage("character");
    usernameInput.focus();
  }
  if (action === "home") {
    const scene = game.scene.getScene("maze");
    scene.closeGameMenu();
    await leaveImmersiveMaze();
    scene.paused = true;
    document.body.classList.remove("immersive-game", "game-chat-open");
    setupScreen.hidden = false;
    setWizardStage("character");
    usernameInput.value = profile?.name || "";
    game.scale.refresh();
    sayNarrated("Back at base. Pick a race, tune your character, and we will head out again.");
  }
});
$("#game-hotbar").addEventListener("click", (event) => {
  const slot = event.target.closest("[data-hotbar-slot]");
  if (!slot) return;
  const index = Number(slot.dataset.hotbarSlot);
  if (index === 3) {
    game.scene.getScene("maze").openGameMenu("inventory");
    return;
  }
  const item = INVENTORY_ITEMS.filter(({ hotbar }) => hotbar)[index];
  if (item) window.dispatchEvent(new CustomEvent("game:use-item", { detail: item.id }));
});
document.addEventListener("fullscreenchange", () => {
  const active = Boolean(document.fullscreenElement);
  if (active) document.body.classList.add("immersive-game");
  $("#fullscreen-button").innerHTML = active || document.body.classList.contains("immersive-game")
    ? "⛶ <span>MAZE MODE</span>" : "⛶ <span>ENTER MAZE</span>";
  $("#fullscreen-button").setAttribute("aria-label", active ? "Exit native full screen" : "Enter full-screen maze");
  game.scale.refresh();
});
document.addEventListener("click", (event) => {
  const control = event.target.closest("button, a");
  if (!control || control.id === "intro-skip"
    || ["race-previous", "race-next", "narrator-toggle", "autonomy-toggle"].includes(control.id)
    || control.closest("#game-menu") && control.hasAttribute("data-menu-toggle")) return;
  playTone(620, 0.035);
}, true);
document.addEventListener("keydown", (event) => {
  if (event.repeat || !setupScreen.hidden) return;
  if (event.target instanceof Element
    && event.target.closest("input, textarea, [contenteditable='true']")
    && !["Escape", "Tab"].includes(event.code)) return;
  const scene = game.scene.getScene("maze");
  if (!scene?.scene.isActive()) return;
  if (event.code === "KeyF") {
    event.preventDefault();
    if (document.body.classList.contains("game-chat-open")) {
      setLocalTyping(false);
      document.body.classList.remove("game-chat-open");
      $("#chat-input").blur();
    } else {
      if (!$("#game-menu").hidden) scene.closeGameMenu();
      document.body.classList.add("game-chat-open");
      $("#chat-input").focus();
    }
  } else if (event.code === "Escape") {
    event.preventDefault();
    if (!$("#tutorial-card").hidden) {
      closeTutorial();
    } else if (document.body.classList.contains("game-chat-open")) {
      setLocalTyping(false);
      document.body.classList.remove("game-chat-open");
      $("#chat-input").blur();
    } else if ($("#game-menu").hidden) {
      scene.openGameMenu("inventory");
    } else {
      scene.closeGameMenu();
    }
  } else if (event.code === "Tab") {
    event.preventDefault();
    if (!$("#game-menu").hidden) {
      scene.closeGameMenu();
      return;
    }
    if (document.body.classList.contains("game-chat-open")) {
      setLocalTyping(false);
      document.body.classList.remove("game-chat-open");
      $("#chat-input").blur();
    }
    scene.openGameMenu("inventory");
  }
}, true);
$("#chat-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#chat-input");
  const message = input.value.trim();
  if (!message) return;
  setLocalTyping(false);
  const author = profile?.name || "GUEST";
  if (roomSocket?.connected) roomSocket.emit("chat:send", { message });
  else appendChat(author, message, "player-chat");
  window.dispatchEvent(new CustomEvent("game:say", { detail: message }));
  input.value = "";
  playTone(600, 0.04);
});
$("#chat-input").addEventListener("input", () => {
  setLocalTyping(Boolean($("#chat-input").value.trim()));
});
$("#shop-items").addEventListener("click", (event) => {
  const button = event.target.closest("[data-purchase]");
  if (button && !button.disabled) {
    window.dispatchEvent(new CustomEvent("game:purchase", { detail: button.dataset.purchase }));
  }
});

$("#home-link").addEventListener("click", (event) => {
  event.preventDefault();
  if (!introScreen.hidden) return;
  setupScreen.hidden = false;
  setWizardStage("character");
  usernameInput.focus();
});
$("#network-form").addEventListener("submit", startRoomConnection);
$("#mic-toggle").addEventListener("click", handleMicToggle);
$("#game-canvas").addEventListener("pointerdown", () => $("#game-canvas canvas")?.focus());
window.addEventListener("game:profile-ready", () => {
  const canvas = $("#game-canvas canvas");
  if (canvas) {
    canvas.tabIndex = 0;
    canvas.focus();
  }
});
window.addEventListener("keydown", (event) => {
  if (event.code === "KeyP" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
    event.preventDefault();
    window.dispatchEvent(new Event("game:pause"));
  }
});

