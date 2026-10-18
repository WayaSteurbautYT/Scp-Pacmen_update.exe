// WebAudio: sfx tones, ambient music loop and the speech-synthesis narrator.

import { syncVoiceControls } from "./network.js";
import { musicEnabled, narratorEnabled, setMusicEnabled, setNarratorEnabled, soundEnabled, volume } from "./state.js";
import { showToast } from "./ui.js";


// Narration queue
let narrationQueue = [];

let narrationBusyUntil = 0;

let audioContext;

let musicTimer;

let musicNote = 0;

let musicBar = 0;


export function playTone(frequency = 520, duration = 0.06) {
  if (!soundEnabled || volume <= 0) return;
  audioContext ??= new AudioContext();
  const now = audioContext.currentTime;
  for (const [ratio, level, type] of [[1, 0.045, "triangle"], [2.01, 0.012, "sine"]]) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency * ratio, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume * level, now + Math.min(0.012, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  }
}


export function playMusicNote() {
  if (!musicEnabled || volume <= 0) return;
  audioContext ??= new AudioContext();
  // Eerie SCP-style melody - minor key, unsettling intervals
  const melody = [0, 3, 7, 3, 0, -2, 5, 3, 0, 7, 10, 7, 5, 3, 0, -2];
  const root = [130.81, 146.83, 164.81, 174.61][Math.floor(musicNote / 4) % 4];
  const note = root * 2 ** (melody[musicNote % melody.length] / 12);
  musicNote += 1;
  const now = audioContext.currentTime;
  // Lead - haunting triangle wave
  const lead = audioContext.createOscillator();
  const leadGain = audioContext.createGain();
  lead.type = "triangle";
  lead.frequency.setValueAtTime(note, now);
  leadGain.gain.setValueAtTime(0.0001, now);
  leadGain.gain.linearRampToValueAtTime(volume * 0.012, now + 0.03);
  leadGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  lead.connect(leadGain).connect(audioContext.destination);
  lead.start(now);
  lead.stop(now + 0.38);
  // Bass drone - low sine for atmosphere
  if (musicNote % 2 === 0) {
    const bass = audioContext.createOscillator();
    const bassGain = audioContext.createGain();
    bass.type = "sine";
    bass.frequency.setValueAtTime(root / 2, now);
    bassGain.gain.setValueAtTime(volume * 0.008, now);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    bass.connect(bassGain).connect(audioContext.destination);
    bass.start(now);
    bass.stop(now + 0.82);
  }
  // Occasional dissonant spark
  if (musicNote % 8 === 0) {
    const spark = audioContext.createOscillator();
    const sparkGain = audioContext.createGain();
    spark.type = "sawtooth";
    spark.frequency.setValueAtTime(root * 1.5, now);
    sparkGain.gain.setValueAtTime(volume * 0.006, now);
    sparkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    spark.connect(sparkGain).connect(audioContext.destination);
    spark.start(now);
    spark.stop(now + 0.16);
  }
}


export function sayNarrated(text) {
  if (!narratorEnabled) return;
  if (!("speechSynthesis" in window)) {
    showToast("NARRATOR UNAVAILABLE", "This system does not provide speech synthesis.", "warning");
    setNarratorEnabled(false);
    localStorage.setItem("neon-maze-narrator", "false");
    syncVoiceControls();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.08;
  utterance.pitch = 1.12;
  utterance.volume = Math.max(0.35, Math.min(1, volume));
  utterance.voice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("en")) || null;
  window.speechSynthesis.speak(utterance);
}


function processNarrationQueue() {
  if (narrationBusyUntil > performance.now()) return;
  const next = narrationQueue.shift();
  if (!next) return;
  const now = performance.now();
  const delay = Math.max(0, next.at - now);
  window.setTimeout(() => {
    if (next.priority === "urgent") window.speechSynthesis.cancel();
    sayNarrated(next.text);
    narrationBusyUntil = now + delay + 1200;
    processNarrationQueue();
  }, delay);
}


export function sayNarratedTimed(text, atMsFromNow = 0, priority = "normal") {
  if (!narratorEnabled) return;
  narrationQueue.push({ text, at: performance.now() + atMsFromNow, priority });
  processNarrationQueue();
}


export function playGameSound(kind) {
  const notes = {
    select: [[660, 0.045], [880, 0.075]],
    race: [[440, 0.07], [660, 0.09]],
    hit: [[230, 0.055], [165, 0.08]],
    ability: [[520, 0.06], [780, 0.08], [1040, 0.12]],
    cooldown: [[300, 0.08], [240, 0.1]],
    dash: [[400, 0.04], [850, 0.08]],
    pickup: [[880, 0.045], [1175, 0.07]],
    chomp: [[220, 0.1], [150, 0.12]],
    bite: [[300, 0.08], [200, 0.1], [120, 0.14]],
    regen: [[400, 0.06], [520, 0.08], [650, 0.1]],
    eyes: [[180, 0.1], [120, 0.15]],
    containment: [[110, 0.4], [82.5, 0.5], [55, 0.6]],
    breach: [[880, 0.03], [1000, 0.03], [1175, 0.05], [1320, 0.08]],
    anomaly: [[55, 0.1], [110, 0.08], [220, 0.06], [55, 0.12]],
    "scp-log": [[440, 0.03], [523, 0.03], [659, 0.03], [784, 0.05]],
  }[kind] || [[520, 0.06]];
  notes.forEach(([frequency, duration], index) => {
    window.setTimeout(() => playTone(frequency, duration), index * 70);
  });
}


// Toggles the ambient music loop so main.js wiring never touches audio internals.
export function toggleMusic() {
  setMusicEnabled(!musicEnabled);
  if (musicEnabled) {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") audioContext.resume();
    playMusicNote();
    musicTimer = window.setInterval(playMusicNote, 340);
  } else {
    window.clearInterval(musicTimer);
  }
  return musicEnabled;
}

