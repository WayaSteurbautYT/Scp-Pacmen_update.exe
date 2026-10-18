export const INVENTORY_ITEMS = Object.freeze([
  { id: "arc-cell", name: "Arc Cell", icon: "✦", description: "Restores two pulse charges.", hotbar: true },
  { id: "wisp-fragment", name: "Wisp Fragment", icon: "◈", description: "A ghostly shard. Use it for a brief protective shield.", hotbar: true },
  { id: "star-flake", name: "Star Flake", icon: "✧", description: "A crisp little star. Restores 30 hunger.", hotbar: true },
  { id: "echo-dust", name: "Echo Dust", icon: "❋", description: "A strange crafting ingredient for a future maze workshop.", hotbar: false },
  { id: "spark-sling", name: "Spark Sling", icon: "⚡", description: "Equip for a ranged basic attack.", hotbar: false, equipment: "weapon" },
  { id: "echo-pike", name: "Echo Pike", icon: "➶", description: "Equip for a stronger, longer melee slash.", hotbar: false, equipment: "weapon" },
  { id: "prism-bow", name: "Prism Bow", icon: "➶", description: "Equip for long-range piercing attacks.", hotbar: false, equipment: "weapon" },
]);

export const NPC_DIALOGUE = Object.freeze({
  runner: [
    "I found a shortcut! It was a wall. Still counts as finding it.",
    "The blue snacks are spicy. I have made this mistake four times.",
    "If we walk in a circle, technically we are exploring everywhere.",
    "My map is upside down. The maze looks much friendlier this way.",
    "I think I just ate my own shadow. It tasted like regret.",
  ],
  ghost: [
    "Boo! Sorry, that was my inside voice.",
    "I haunt this corridor. The rent is reasonable.",
    "Are you lost, or is the maze doing its job?",
    "I tried being spooky. Someone gave me a tiny hat.",
    "I'm 90% fog and 10% bad decisions.",
  ],
  captured: [
    "HEY! I was saving that body!",
    "I have become premium-grade eyeballs!",
    "Tell my corridor I will be late!",
    "That was my good shape!",
    "Rude! I had just ironed this outline!",
    "Oh no! My tiny dramatic exit was meant to be private.",
    "Tell the snack committee I have an appointment with the floor.",
    "Fuck— I didn't even finish my sen—",
  ],
  bitten: [
    "YIPE! That was bite number one. I have a union.",
    "I am losing tiny pieces of dignity and possibly fog!",
    "Ow! Please stop taste-testing the haunted one!",
    "Ah, shit! I was supposed to have my phase-through-walls lesson today!",
    "Screw you, Pacman! I've got unfinished business!",
    "I swear, if I survive this, I'm transferring to a different dimension.",
  ],
  ghostBitten: [
    "YIPE! That was bite number one. I have a union.",
    "I am losing tiny pieces of dignity and possibly fog!",
    "Ow! Please stop taste-testing the haunted one!",
    "Ah, shit! I was supposed to have my phase-through-walls lesson today!",
    "Screw you, Pacman! I've got unfinished business!",
    "I swear, if I survive this, I'm transferring to a different dimension.",
    "FUCK OFF! I'M LITERALLY JUST A PAIR OF EYES NOW!",
    "Oh, brilliant. The yellow nightmare's hungry again. Everybody run!",
  ],
  ghostEaten: [
    "AH, SHIT! I WAS SUPPOSED TO HAVE MY PHASE-THROUGH-WALLS LESSON TODAY!",
    "Screw you, Pacman! I've got unfinished business!",
    "FUCK OFF! I'M LITERALLY JUST A PAIR OF EYES NOW!",
    "I swear, if I survive this, I'm transferring to a different dimension.",
    "Wait, can I respawn with better health insurance?",
    "This is why you don't skip leg day. Oh wait, I don't have legs.",
  ],
  ghostEyesOnly: [
    "Well. This is embarrassing.",
    "At least you can still see.",
    "I CAN SEE MY OWN DEATH REPLAYING IN YOUR STUPID FACE!",
    "I'm just a pair of eyes with trauma now.",
    "Hello? Can anyone see me? Oh wait, they can see my eyes. Never mind.",
    "If I concentrate really hard, maybe I'll phase through the floor and escape.",
  ],
  ghostRegenerating: [
    "Okay, good news: I think my body's coming back.",
    "Bad news: I can feel the hitbox loading.",
    "I'm reforming. Please don't eat me again. I'm begging you.",
    "My fog is back. My dignity? Still missing in action.",
    "I feel like a ghost who got hit by a Pac-Man and is now doing a slow-motion rewind.",
    "Almost whole again. Just need my existential dread to catch up.",
  ],
  ghostPanic: [
    "EVERYBODY RUN! THE PACMAN ATE A PELLET!",
    "Code snack-red! The Pac-Men are powered up. Everybody float!",
    "Emergency meeting! The glowing pellet has made them extremely bitey!",
    "THEY'RE POWERED! ABANDON ALL SPOOKINESS!",
    "I'm not ready to become eyeballs again! I just got this body!",
    "Wait, what do you mean it ate a pellet?! THAT'S THE WHOLE POINT OF THE GAME!",
    "PLAYER! We have to go — a Pac-Man found a power pellet!",
    "Fuck, fuck, fuck. The yellow thing is bitey again!",
  ],
  ghostPlayerPanic: [
    "Wait, what do you mean it ate a pellet?! THAT'S THE WHOLE POINT OF THE GAME!",
    "Oh, brilliant. The yellow nightmare's hungry again. Everybody run!",
    "I'm not ready to become eyeballs again! I just got this body!",
    "Fuck, fuck, fuck. The yellow thing is bitey again!",
    "Can we please not? I really like having a body right now.",
    "Someone tell the Pac-Man that snacks are for eating, not for being eaten by.",
  ],
  powerWarning: [
    "PLAYER! We have to go — a Pac-Man found a power pellet!",
    "Code snack-red! The Pac-Men are powered up. Everybody float!",
    "Emergency meeting! The glowing pellet has made them extremely bitey!",
    "THEY'RE POWERED! ABANDON ALL SPOOKINESS!",
  ],
  betrayal: [
    "YOU JOINED THE RUNNERS? We had matching fog!",
    "Traitor! You said we were going to haunt the snack aisle!",
    "I trusted you with the spooky group chat!",
  ],
  reunion: [
    "We have decided you are still invited to the fog picnic.",
    "Sorry about the dramatic eye-only walk. Group feelings.",
    "Your outline is back. The apology is still buffering.",
  ],
  combat: [
    "My insurance covers bonks, not personal growth.",
    "I was going to dodge. Then I remembered I am round.",
    "That attack was rude, effective, and frankly well-timed.",
    "I have been defeated by a circle with confidence.",
    "Screw you and your neon chomper.",
  ],
  defeated: [
    "I am not out. I am having a tactical horizontal moment.",
    "Please leave a one-star review with the maze manager.",
    "I demand a rematch and a tiny juice box.",
    "I am not out. I am having a tactical horizontal moment.",
  ],
  talk: [
    "I know a shortcut, but the shortcut knows me too.",
    "The maze has a gift shop. It only sells more maze.",
    "I am saving my best scream for a special occasion.",
    "The floor said it would catch me. The floor is a liar.",
    "I could help you. Or float dramatically. Let's see how the mood goes.",
  ],
  playerRunner: [
    "I have a plan. It is mostly moving in the correct direction.",
    "That pellet looked at me funny. I ate it preemptively.",
    "We are making excellent progress, according to my very optimistic map.",
    "Could use a hand. Metaphorically. I do not have hands.",
    "Power pellet time! Watch me become the monster under your bed.",
  ],
  playerGhost: [
    "I am a professional haunting specialist. The badge is imaginary.",
    "This corridor is mine. I have misplaced the paperwork.",
    "I could help you. Or float dramatically. Let's see how the mood goes.",
    "The Pac-Men have snacks. We have excellent cheekbones. Probably.",
    "I'd eat that pellet but I'm on a strict fog-only diet.",
  ],
  pacmanPower: [
    "Power up!",
    "Wrong snack, right crunch.",
    "POWER SNACK! I feel legally unstoppable.",
    "I ate the glowing thing. It is doing something to my outline.",
    "Time to turn the hunters into the hunted.",
  ],
  story: [
    "Welcome to SCP-PAC Update. Race selected: Ghosts.",
    "Welcome to SCP-PAC Update. Race selected: Pac-Men.",
    "Back at base. Pick a race, tune your character, and we will head out again.",
  ],
});

export const ACHIEVEMENTS = Object.freeze({
  "first-strike": { title: "First Bonk", detail: "Land your first hit." },
  "first-ability": { title: "Hotkey Hero", detail: "Cast your first chosen ability." },
  "first-knockout": { title: "Professional Menace", detail: "Knock out a rival." },
  "first-tame": { title: "Unexpected Friendship", detail: "Tame a weakened ghost." },
  "first-rebirth": { title: "Same Maze, More Problems", detail: "Choose to rebirth." },
  "first-eaten": { title: "Premium-Grade Eyeballs", detail: "Get eaten by a Pac-Man." },
  "first-regen": { title: "Hitbox Loading", detail: "Regenerate after being eaten." },
});

export function pickDialogue(lines, random = Math.random) {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error("Dialogue requires at least one line.");
  const index = Math.min(lines.length - 1, Math.max(0, Math.floor(random() * lines.length)));
  return lines[index];
}
