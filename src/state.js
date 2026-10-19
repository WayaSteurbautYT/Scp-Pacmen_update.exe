// Mutable app state + cached DOM refs. All cross-module mutable bindings
// live here and change only through the setters at the bottom of this file.


export const $ = (selector) => document.querySelector(selector);

export const scoreValue = $("#score-value");

export const bestValue = $("#best-value");

export const livesDisplay = $("#lives-display");

export const overlay = $("#game-overlay");

export const overlayKicker = $("#overlay-kicker");

export const overlayTitle = $("#overlay-title");

export const overlayCopy = $("#overlay-copy");

// Art urls are built at runtime (icons, coins, ability art), so Vite cannot
// rewrite them. Resolve them against the document instead of the site root so
// the same paths work on the dev server and in the packaged app.
export const assetUrl = (relativePath) => new URL(relativePath.replace(/^\/+/, ""), document.baseURI).href;

export const heartIconUrl = assetUrl("assets/ui/heart.svg");

export const hungerIconUrl = assetUrl("assets/ui/hunger.svg");

export const setupScreen = $("#setup-screen");

export const usernameInput = $("#username-input");

export const loadingScreen = $("#loading-screen");

export const chatFeed = $("#chat-feed");

export const introScreen = $("#intro-screen");

export let profile = JSON.parse(localStorage.getItem("neon-maze-profile") || "null");

export let soundEnabled = localStorage.getItem("neon-maze-sound") !== "false";

export let musicEnabled = false;

export let bubbleEnabled = localStorage.getItem("neon-maze-bubbles") !== "false";

export let narratorEnabled = localStorage.getItem("neon-maze-narrator") !== "false";

export let autonomyEnabled = localStorage.getItem("neon-maze-autonomy") !== "false";

const savedVolume = Number(localStorage.getItem("neon-maze-volume") ?? 0.65);
export let volume = Number.isFinite(savedVolume) ? Math.max(0, Math.min(1, savedVolume)) : 0.65;

export let visualScale = 1.15;

export let hudScale = 1;


export function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}


// Mutators — ES live bindings update every importer, but assignment is only
// legal inside this module, so all state changes funnel through these setters.
export function setProfile(value) { profile = value; }
export function setSoundEnabled(value) { soundEnabled = value; localStorage.setItem("neon-maze-sound", String(value)); }
export function setMusicEnabled(value) { musicEnabled = value; }
export function setBubbleEnabled(value) { bubbleEnabled = value; localStorage.setItem("neon-maze-bubbles", String(value)); }
export function setNarratorEnabled(value) { narratorEnabled = value; }
export function setAutonomyEnabled(value) { autonomyEnabled = value; }
export function setVolume(value) { volume = Math.max(0, Math.min(1, value)); localStorage.setItem("neon-maze-volume", String(volume)); }
export function setVisualScale(value) { visualScale = value; }
export function setHudScale(value) { hudScale = value; }

