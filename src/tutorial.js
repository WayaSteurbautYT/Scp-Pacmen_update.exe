// In-game tutorial overlay steps and flow.

import { sayNarrated } from "./audio.js";
import { $ } from "./state.js";


export const TUTORIAL_STEPS = [
  {
    title: "Welcome to the weird shift.",
    copy: "You are a floating local with a suspiciously important job. Follow the glowing corridors, collect pellets and look for the safe-zone markers. No feet required.",
  },
  {
    title: "Move, turn, and brake.",
    copy: "Use WASD or arrow keys to glide. Tap the same direction twice to brake and stop. Q dashes (or phase-slips as a Ghost); avoid walls and watch the camera follow you.",
  },
  {
    title: "Pellets keep the shift moving.",
    copy: "Small dots add score. Big glowing power pellets temporarily let Pac-Men eat Ghosts; Ghosts see the warning and can retreat. Eat snacks to restore hunger.",
  },
  {
    title: "Learn your combat controls.",
    copy: "SPACE attacks in front of you. R casts your selected ability; its cooldown appears in the HUD. C spends a pulse charge to stun nearby rivals. Damaged foes flash red.",
  },
  {
    title: "Pack light, plan ahead.",
    copy: "Press E or I for inventory, equipment, and skills. Use slots 1–3 for items; slot 4 opens the pack. Hearts and hunger sit above the hotbar. Your faction coin balance and rank are local.",
  },
  {
    title: "Ghosts are not loot piñatas.",
    copy: "Pac-Men can press T near a weakened Ghost to try taming it. Local rivals have hearts above their heads and may use abilities too. Defeated Ghosts can return as eyes and rebuild.",
  },
  {
    title: "Talk, pause, and make it yours.",
    copy: "G talks to a nearby NPC. F opens room chat. P, Tab, or Esc opens the pause menu for skills, settings, narration, and returning home. The narrator uses your device's built-in speech voice.",
  },
];

export let tutorialStep = 0;

export let tutorialReturnToNormal = false;

export let tutorialLaunchRun = false;


export function showTutorialStep(index) {
  const step = TUTORIAL_STEPS[index];
  $("#tutorial-step-count").textContent = `${index + 1} / ${TUTORIAL_STEPS.length}`;
  $("#tutorial-step-title").textContent = step.title;
  $("#tutorial-step-copy").textContent = step.copy;
  $("#tutorial-next").textContent = index === TUTORIAL_STEPS.length - 1 ? "FINISH ✓" : "NEXT →";
  sayNarrated(`${step.title}. ${step.copy}`);
}


export function openTutorial(launchRun = false) {
  const scene = tutorialGame.scene.getScene("maze");
  tutorialReturnToNormal = scene.menuReturnToNormal && !document.fullscreenElement;
  tutorialLaunchRun = launchRun;
  if (!$("#game-menu").hidden) scene.closeGameMenu();
  document.body.classList.add("immersive-game");
  scene.scale.refresh();
  tutorialStep = 0;
  $("#tutorial-card").hidden = false;
  showTutorialStep(0);
  scene.paused = true;
  window.dispatchEvent(new CustomEvent("game:pause-state", { detail: true }));
}


export function closeTutorial() {
  $("#tutorial-card").hidden = true;
  localStorage.setItem("neon-maze-tutorial-complete", "true");
  const scene = tutorialGame.scene.getScene("maze");
  scene.paused = false;
  window.dispatchEvent(new CustomEvent("game:pause-state", { detail: false }));
  if (tutorialReturnToNormal && !document.fullscreenElement) {
    document.body.classList.remove("immersive-game");
  }
  tutorialReturnToNormal = false;
  scene.scale.refresh();
  if (tutorialLaunchRun) {
    tutorialLaunchRun = false;
    window.dispatchEvent(new Event("tutorial:launch-run"));
  }
}


// The tutorial needs the Phaser game instance for scene access; main.js injects
// it once after creating the game to avoid an import cycle.
let tutorialGame = null;
export function initTutorial(gameRef) { tutorialGame = gameRef; }
export function bindTutorialEvents() {
  $("#tutorial-next").addEventListener("click", () => {
    tutorialStep += 1;
    if (tutorialStep >= TUTORIAL_STEPS.length) {
      closeTutorial();
      return;
    }
    showTutorialStep(tutorialStep);
  });
  $("#tutorial-skip").addEventListener("click", closeTutorial);
}

