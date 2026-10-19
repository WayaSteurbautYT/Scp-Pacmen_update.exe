// WebAudio: sfx tones, ambient music loop and queued local narration.

import { syncVoiceControls } from "./network.js";
import { musicEnabled, narratorEnabled, setMusicEnabled, setNarratorEnabled, soundEnabled, volume } from "./state.js";
import { showToast } from "./ui.js";

let narrationQueue = [];
let narrationBusy = false;
let currentNarrationSource;
let kokoroPromise;
let audioContext;
let musicTimer;
let musicNote = 0;
let importedMusic;
let importedMusicUrl;

function getAudioContext() {
  audioContext ??= new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

export function playTone(frequency = 520, duration = 0.06) {
  if (!soundEnabled || volume <= 0) return;
  const context = getAudioContext();
  const now = context.currentTime;
  for (const [ratio, level, type] of [[1, 0.045, "triangle"], [2.01, 0.012, "sine"]]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency * ratio, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume * level, now + Math.min(0.012, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  }
}

export function playMusicNote() {
  if (!musicEnabled || volume <= 0) return;
  const context = getAudioContext();
  const melody = [0, 3, 7, 3, 0, -2, 5, 3, 0, 7, 10, 7, 5, 3, 0, -2];
  const root = [130.81, 146.83, 164.81, 174.61][Math.floor(musicNote / 4) % 4];
  const note = root * 2 ** (melody[musicNote % melody.length] / 12);
  musicNote += 1;
  const now = context.currentTime;
  const lead = context.createOscillator();
  const leadGain = context.createGain();
  lead.type = "triangle";
  lead.frequency.setValueAtTime(note, now);
  leadGain.gain.setValueAtTime(0.0001, now);
  leadGain.gain.linearRampToValueAtTime(volume * 0.012, now + 0.03);
  leadGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  lead.connect(leadGain).connect(context.destination);
  lead.start(now);
  lead.stop(now + 0.38);
  if (musicNote % 2 === 0) {
    const bass = context.createOscillator();
    const bassGain = context.createGain();
    bass.type = "sine";
    bass.frequency.setValueAtTime(root / 2, now);
    bassGain.gain.setValueAtTime(volume * 0.008, now);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    bass.connect(bassGain).connect(context.destination);
    bass.start(now);
    bass.stop(now + 0.82);
  }
  if (musicNote % 8 === 0) {
    const spark = context.createOscillator();
    const sparkGain = context.createGain();
    spark.type = "sawtooth";
    spark.frequency.setValueAtTime(root * 1.5, now);
    sparkGain.gain.setValueAtTime(volume * 0.006, now);
    sparkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    spark.connect(sparkGain).connect(context.destination);
    spark.start(now);
    spark.stop(now + 0.16);
  }
}

function loadKokoro() {
  kokoroPromise ??= import("kokoro-js").then(({ KokoroTTS }) => KokoroTTS.from_pretrained(
    "onnx-community/Kokoro-82M-v1.0-ONNX",
    { dtype: "q8", device: "wasm" },
  ));
  return kokoroPromise;
}

function finishNarration() {
  narrationBusy = false;
  currentNarrationSource = null;
  drainNarrationQueue();
}

function speakWithSystemVoice(text) {
  if (!("speechSynthesis" in window)) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = Math.max(0.35, Math.min(1, volume));
  const voices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  utterance.voice = voices.find((voice) => /natural|neural|enhanced/i.test(voice.name))
    || voices.find((voice) => voice.localService)
    || voices[0]
    || null;
  utterance.onend = finishNarration;
  utterance.onerror = finishNarration;
  window.speechSynthesis.speak(utterance);
  return true;
}

async function speakWithKokoro(text) {
  const context = getAudioContext();
  const model = await loadKokoro();
  const spoken = await model.generate(text, { voice: "am_fenrir", speed: 1.0 });
  const buffer = context.createBuffer(1, spoken.audio.length, spoken.sampling_rate);
  buffer.copyToChannel(spoken.audio, 0);
  const source = context.createBufferSource();
  const gain = context.createGain();
  gain.gain.value = Math.max(0.35, Math.min(1, volume));
  source.buffer = buffer;
  source.connect(gain).connect(context.destination);
  source.onended = finishNarration;
  currentNarrationSource = source;
  source.start();
}

async function playNarration(text) {
  if (localStorage.getItem("neon-maze-tts-engine") === "system") {
    if (!speakWithSystemVoice(text)) finishNarration();
    return;
  }
  try {
    await speakWithKokoro(text);
  } catch (error) {
    console.warn("Local Kokoro narration unavailable; using the system voice.", error);
    if (localStorage.getItem("neon-maze-kokoro-notice") !== "shown") {
      localStorage.setItem("neon-maze-kokoro-notice", "shown");
      showToast("USING SYSTEM VOICE", "The local voice model could not load. Check your connection once, or choose the system voice in Settings.", "warning");
    }
    if (!speakWithSystemVoice(text)) finishNarration();
  }
}

function drainNarrationQueue() {
  if (!narratorEnabled || narrationBusy || !narrationQueue.length) return;
  const next = narrationQueue.shift();
  const delay = Math.max(0, next.at - performance.now());
  if (delay > 0) {
    window.setTimeout(() => { narrationQueue.unshift(next); drainNarrationQueue(); }, delay);
    return;
  }
  narrationBusy = true;
  void playNarration(next.text);
}

export function sayNarrated(text) {
  if (!narratorEnabled || !text?.trim()) return;
  narrationQueue.push({ text, at: performance.now() });
  drainNarrationQueue();
}

export function sayNarratedTimed(text, atMsFromNow = 0, priority = "normal") {
  if (!narratorEnabled || !text?.trim()) return;
  const item = { text, at: performance.now() + atMsFromNow };
  if (priority === "urgent") {
    narrationQueue = [];
    currentNarrationSource?.stop();
    currentNarrationSource = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    narrationBusy = false;
  }
  narrationQueue.push(item);
  drainNarrationQueue();
}

export function stopNarration() {
  narrationQueue = [];
  currentNarrationSource?.stop();
  currentNarrationSource = null;
  narrationBusy = false;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function setNarrationEngine(engine) {
  const selected = engine === "system" ? "system" : "kokoro";
  localStorage.setItem("neon-maze-tts-engine", selected);
  const selector = document.querySelector("#narration-engine");
  if (selector) selector.value = selected;
  if (selected === "kokoro") showToast("NEURAL VOICE READY", "Kokoro runs on your device. The first narration downloads the voice model.");
}

export function playGameSound(kind) {
  const notes = {
    select: [[660, 0.045], [880, 0.075]], race: [[440, 0.07], [660, 0.09]], hit: [[230, 0.055], [165, 0.08]],
    ability: [[520, 0.06], [780, 0.08], [1040, 0.12]], cooldown: [[300, 0.08], [240, 0.1]], dash: [[400, 0.04], [850, 0.08]],
    pickup: [[880, 0.045], [1175, 0.07]], chomp: [[220, 0.1], [150, 0.12]], bite: [[300, 0.08], [200, 0.1], [120, 0.14]],
    regen: [[400, 0.06], [520, 0.08], [650, 0.1]], eyes: [[180, 0.1], [120, 0.15]], containment: [[110, 0.4], [82.5, 0.5], [55, 0.6]],
    breach: [[880, 0.03], [1000, 0.03], [1175, 0.05], [1320, 0.08]], anomaly: [[55, 0.1], [110, 0.08], [220, 0.06], [55, 0.12]], "scp-log": [[440, 0.03], [523, 0.03], [659, 0.03], [784, 0.05]],
  }[kind] || [[520, 0.06]];
  notes.forEach(([frequency, duration], index) => window.setTimeout(() => playTone(frequency, duration), index * 70));
  const transient = { hit: [720, 0.055], pickup: [2800, 0.035], chomp: [1600, 0.045], bite: [900, 0.09], dash: [1900, 0.07], breach: [2400, 0.035] }[kind];
  if (transient && soundEnabled && volume > 0) {
    const context = getAudioContext();
    const duration = transient[1];
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = transient[0];
    gain.gain.setValueAtTime(volume * 0.055, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
  }
}

export function toggleMusic() {
  setMusicEnabled(!musicEnabled);
  if (musicEnabled) {
    if (importedMusic) {
      importedMusic.volume = volume;
      void importedMusic.play().catch((error) => {
        console.warn("Could not play the selected music file.", error);
        showToast("MUSIC COULD NOT PLAY", "Try an MP3, WAV, OGG, FLAC, or M4A audio file.", "warning");
      });
    } else {
      getAudioContext();
      playMusicNote();
      musicTimer = window.setInterval(playMusicNote, 340);
    }
  } else {
    window.clearInterval(musicTimer);
    importedMusic?.pause();
  }
  return musicEnabled;
}

export function loadMusicFile(file) {
  if (!file) return;
  if (!file.type.startsWith("audio/") && !/\.(mp3|wav|ogg|opus|flac|m4a)$/i.test(file.name)) {
    showToast("AUDIO FILE REQUIRED", "Choose a supported local audio file.", "warning");
    return;
  }
  importedMusic?.pause();
  if (importedMusicUrl) URL.revokeObjectURL(importedMusicUrl);
  importedMusicUrl = URL.createObjectURL(file);
  importedMusic = new Audio(importedMusicUrl);
  importedMusic.loop = true;
  importedMusic.volume = volume;
  importedMusic.addEventListener("error", () => {
    showToast("AUDIO FORMAT NOT SUPPORTED", "Try an MP3, WAV, OGG, FLAC, or M4A file.", "warning");
  }, { once: true });
  window.clearInterval(musicTimer);
  const status = document.querySelector("#music-track-status");
  if (status) status.textContent = `Local track · ${file.name}`;
  if (musicEnabled) {
    void importedMusic.play().catch((error) => {
      console.warn("Could not play the selected music file.", error);
      showToast("MUSIC COULD NOT PLAY", "Press the music button to start the selected track.", "warning");
    });
  }
}

export function updateMusicVolume(value = volume) {
  if (importedMusic) importedMusic.volume = Math.max(0, Math.min(1, value));
}
