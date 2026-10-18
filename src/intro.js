// Story introduction plays before character creation and the existing game flow.

import { playGameSound, sayNarrated } from "./audio.js";
import { $, introScreen, profile, setupScreen, usernameInput } from "./state.js";
import { setRaceSelection, setWizardStage } from "./ui.js";
import { ComicIntro } from "./comic-intro.js";

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

new ComicIntro(introScreen, enterCharacterCreation);

$("#intro-skip")?.addEventListener("click", (event) => {
  event.preventDefault();
  introScreen.querySelector('[data-action="skip"]')?.click();
});
