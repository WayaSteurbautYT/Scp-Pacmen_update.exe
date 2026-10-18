// Intro title sequence: staged screens that end in character creation.

import { playGameSound, sayNarrated } from "./audio.js";
import { $, introScreen, profile, setupScreen, usernameInput } from "./state.js";
import { setRaceSelection, setWizardStage } from "./ui.js";


const enterCharacterCreation = () => {
  playGameSound("select");
  setRaceSelection(profile?.team || "pacmen", false, profile?.startingAbility);
  sayNarrated(`Welcome to SCP-PAC Update. Race selected: ${profile?.team === "ghosts" ? "Ghosts" : "Pac-Men"}.`);
  introScreen.classList.add("is-leaving");
  window.setTimeout(() => {
    introScreen.hidden = true;
    introScreen.classList.remove("is-leaving");
    setupScreen.hidden = false;
    setWizardStage("character");
    usernameInput.focus();
  }, 500);
};


let introSeqIndex = 0;

const introStages = [
  "intro-stage-icon",
  "intro-stage-title",
  "intro-stage-credit",
];

function advanceIntro() {
  const current = document.getElementById(introStages[introSeqIndex]);
  if (current) {
    current.classList.remove("visible");
    current.classList.add("hidden");
  }
  introSeqIndex += 1;
  if (introSeqIndex < introStages.length) {
    const next = document.getElementById(introStages[introSeqIndex]);
    next.classList.remove("hidden");
    next.classList.add("visible");
    window.setTimeout(advanceIntro, 3000);
  } else {
    // Reveal the pinned continue button once every stage has played. CSS keeps
    // it hidden (opacity 0, no pointer events) until these inline styles land.
    document.getElementById("intro-skip").style.opacity = "1";
    document.getElementById("intro-skip").style.pointerEvents = "auto";
  }
}
$("#intro-skip").addEventListener("click", (event) => {
  event.preventDefault();
  // Skip remaining intro stages and enter creation
  introSeqIndex = introStages.length;
  document.querySelectorAll(".intro-stage").forEach((s) => {
    s.classList.remove("visible");
    s.classList.add("hidden");
  });
  enterCharacterCreation();
});
// Start the intro sequence when page loads
window.addEventListener("DOMContentLoaded", () => {
  const first = document.getElementById(introStages[0]);
  if (first) {
    first.classList.remove("hidden");
    first.classList.add("visible");
    window.setTimeout(advanceIntro, 2500);
  }
});
window.addEventListener("keydown", (event) => {
  if (!introScreen.hidden && (event.code === "Space" || event.code === "Enter")) {
    event.preventDefault();
    $("#intro-skip").click();
  }
});