# SCP-PAC_UPDATE.EXE

A story-driven, animated maze RPG with SCP-inspired containment fiction, Pac-Man-style collecting and pursuit, survival hearts and hunger, factions, abilities, inventory, and local progression. Built with Phaser 3, JavaScript, Vite, Electron, Socket.IO, and animated SVG art by WayaCreate Studios.

> **Status:** playable Windows desktop prototype. This repository contains the game source and art; it is not yet a Steam release. Online rooms relay presence, movement, chat, and maze expansion, while combat, health, and progression remain local/client-side.

**Privacy:** [read the game privacy policy](public/privacy.html). **Microsoft Store:** see the [release preparation guide](docs/MICROSOFT_STORE.md) for the MSIX build and Partner Center identity steps.

## What the game looks like

The opening story is an animated, navigable containment comic, followed by character setup and the existing game flow. Skip or finish the story to reach character creation; it does not launch a second maze/game from the imported intro project.

The SVG collection below is the asset preview. Phaser animates atlas frames in game; standalone SVGs with built-in motion retain their animation when the host supports animated SVG images. The intro's vector cast also animates in the app.

### Identity and environment

<table>
<tr><td align="center" width="110"><img src="assets/Scp-PAC_Update.exe.svg" width="76" height="76" alt="Scp Pac Update.Exe"/><br/><sub>Scp Pac Update.Exe</sub></td><td align="center" width="110"><img src="assets/neon-maze-icon.svg" width="76" height="76" alt="Neon Maze Icon"/><br/><sub>Neon Maze Icon</sub></td><td align="center" width="110"><img src="assets/scp-maze-background.svg" width="76" height="76" alt="Scp Maze Background"/><br/><sub>Scp Maze Background</sub></td><td align="center" width="110"><img src="assets/ui/ghost-coins.svg" width="76" height="76" alt="Ghost Coins"/><br/><sub>Ghost Coins</sub></td><td align="center" width="110"><img src="assets/ui/heart.svg" width="76" height="76" alt="Heart"/><br/><sub>Heart</sub></td><td align="center" width="110"><img src="assets/ui/hunger.svg" width="76" height="76" alt="Hunger"/><br/><sub>Hunger</sub></td></tr>
<tr><td align="center" width="110"><img src="assets/ui/paccoins.svg" width="76" height="76" alt="Paccoins"/><br/><sub>Paccoins</sub></td></tr>
</table>

### Character and animation atlases

<table>
<tr><td align="center" width="110"><img src="assets/character/ability-effects-atlas.svg" width="76" height="76" alt="Ability Effects Atlas"/><br/><sub>Ability Effects Atlas</sub></td><td align="center" width="110"><img src="assets/character/ghost-atlas.svg" width="76" height="76" alt="Ghost Atlas"/><br/><sub>Ghost Atlas</sub></td><td align="center" width="110"><img src="assets/character/maze-objects-atlas.svg" width="76" height="76" alt="Maze Objects Atlas"/><br/><sub>Maze Objects Atlas</sub></td><td align="center" width="110"><img src="assets/character/runner-atlas.svg" width="76" height="76" alt="Runner Atlas"/><br/><sub>Runner Atlas</sub></td><td align="center" width="110"><img src="assets/character/special-pellets-atlas.svg" width="76" height="76" alt="Special Pellets Atlas"/><br/><sub>Special Pellets Atlas</sub></td><td align="center" width="110"><img src="assets/characters/ability-effects-atlas.svg" width="76" height="76" alt="Ability Effects Atlas"/><br/><sub>Ability Effects Atlas</sub></td></tr>
<tr><td align="center" width="110"><img src="assets/characters/coins-atlas.svg" width="76" height="76" alt="Coins Atlas"/><br/><sub>Coins Atlas</sub></td><td align="center" width="110"><img src="assets/characters/comic-character-sheet.svg" width="76" height="76" alt="Comic Character Sheet"/><br/><sub>Comic Character Sheet</sub></td><td align="center" width="110"><img src="assets/characters/ghost-atlas.svg" width="76" height="76" alt="Ghost Atlas"/><br/><sub>Ghost Atlas</sub></td><td align="center" width="110"><img src="assets/characters/maze-objects-atlas.svg" width="76" height="76" alt="Maze Objects Atlas"/><br/><sub>Maze Objects Atlas</sub></td><td align="center" width="110"><img src="assets/characters/pacmen-atlas.svg" width="76" height="76" alt="Pacmen Atlas"/><br/><sub>Pacmen Atlas</sub></td><td align="center" width="110"><img src="assets/characters/runner-atlas.svg" width="76" height="76" alt="Runner Atlas"/><br/><sub>Runner Atlas</sub></td></tr>
<tr><td align="center" width="110"><img src="assets/characters/special-pellets-atlas.svg" width="76" height="76" alt="Special Pellets Atlas"/><br/><sub>Special Pellets Atlas</sub></td></tr>
</table>

### Character portraits and currency

<table>
<tr><td align="center" width="110"><img src="assets/characters/coins/ghost-coin.svg" width="76" height="76" alt="Ghost Coin"/><br/><sub>Ghost Coin</sub></td><td align="center" width="110"><img src="assets/characters/coins/paccoin.svg" width="76" height="76" alt="Paccoin"/><br/><sub>Paccoin</sub></td><td align="center" width="110"><img src="assets/characters/coins/silver-coin-ghost.svg" width="76" height="76" alt="Silver Coin Ghost"/><br/><sub>Silver Coin Ghost</sub></td><td align="center" width="110"><img src="assets/characters/ghosts/ghost-blinky.svg" width="76" height="76" alt="Ghost Blinky"/><br/><sub>Ghost Blinky</sub></td><td align="center" width="110"><img src="assets/characters/ghosts/ghost-clyde.svg" width="76" height="76" alt="Ghost Clyde"/><br/><sub>Ghost Clyde</sub></td><td align="center" width="110"><img src="assets/characters/ghosts/ghost-inky.svg" width="76" height="76" alt="Ghost Inky"/><br/><sub>Ghost Inky</sub></td></tr>
<tr><td align="center" width="110"><img src="assets/characters/ghosts/ghost-pinky.svg" width="76" height="76" alt="Ghost Pinky"/><br/><sub>Ghost Pinky</sub></td><td align="center" width="110"><img src="assets/characters/pacmen/pacman-classic.svg" width="76" height="76" alt="Pacman Classic"/><br/><sub>Pacman Classic</sub></td><td align="center" width="110"><img src="assets/characters/pacmen/pacman-crunch.svg" width="76" height="76" alt="Pacman Crunch"/><br/><sub>Pacman Crunch</sub></td><td align="center" width="110"><img src="assets/characters/pacmen/pacman-phase.svg" width="76" height="76" alt="Pacman Phase"/><br/><sub>Pacman Phase</sub></td><td align="center" width="110"><img src="assets/characters/pacmen/pacman-shield.svg" width="76" height="76" alt="Pacman Shield"/><br/><sub>Pacman Shield</sub></td><td align="center" width="110"><img src="assets/characters/pacmen/pacman-speed.svg" width="76" height="76" alt="Pacman Speed"/><br/><sub>Pacman Speed</sub></td></tr>
</table>

### Abilities, equipment, and inventory

<table>
<tr><td align="center" width="110"><img src="assets/ui/icons/ability-blink-step.svg" width="76" height="76" alt="Ability Blink Step"/><br/><sub>Ability Blink Step</sub></td><td align="center" width="110"><img src="assets/ui/icons/ability-dread-wave.svg" width="76" height="76" alt="Ability Dread Wave"/><br/><sub>Ability Dread Wave</sub></td><td align="center" width="110"><img src="assets/ui/icons/ability-echo-bolt.svg" width="76" height="76" alt="Ability Echo Bolt"/><br/><sub>Ability Echo Bolt</sub></td><td align="center" width="110"><img src="assets/ui/icons/ability-frost-pop.svg" width="76" height="76" alt="Ability Frost Pop"/><br/><sub>Ability Frost Pop</sub></td><td align="center" width="110"><img src="assets/ui/icons/ability-frost-ring.svg" width="76" height="76" alt="Ability Frost Ring"/><br/><sub>Ability Frost Ring</sub></td><td align="center" width="110"><img src="assets/ui/icons/ability-hunger-siphon.svg" width="76" height="76" alt="Ability Hunger Siphon"/><br/><sub>Ability Hunger Siphon</sub></td></tr>
<tr><td align="center" width="110"><img src="assets/ui/icons/ability-phase-crush.svg" width="76" height="76" alt="Ability Phase Crush"/><br/><sub>Ability Phase Crush</sub></td><td align="center" width="110"><img src="assets/ui/icons/ability-phase-snap.svg" width="76" height="76" alt="Ability Phase Snap"/><br/><sub>Ability Phase Snap</sub></td><td align="center" width="110"><img src="assets/ui/icons/ability-prism-barrage.svg" width="76" height="76" alt="Ability Prism Barrage"/><br/><sub>Ability Prism Barrage</sub></td><td align="center" width="110"><img src="assets/ui/icons/ability-pulse-burst.svg" width="76" height="76" alt="Ability Pulse Burst"/><br/><sub>Ability Pulse Burst</sub></td><td align="center" width="110"><img src="assets/ui/icons/ability-spark-pop.svg" width="76" height="76" alt="Ability Spark Pop"/><br/><sub>Ability Spark Pop</sub></td><td align="center" width="110"><img src="assets/ui/icons/ability-star-lance.svg" width="76" height="76" alt="Ability Star Lance"/><br/><sub>Ability Star Lance</sub></td></tr>
<tr><td align="center" width="110"><img src="assets/ui/icons/ability-sun-burst.svg" width="76" height="76" alt="Ability Sun Burst"/><br/><sub>Ability Sun Burst</sub></td><td align="center" width="110"><img src="assets/ui/icons/ability-sunshot.svg" width="76" height="76" alt="Ability Sunshot"/><br/><sub>Ability Sunshot</sub></td><td align="center" width="110"><img src="assets/ui/icons/ability-teleport.svg" width="76" height="76" alt="Ability Teleport"/><br/><sub>Ability Teleport</sub></td><td align="center" width="110"><img src="assets/ui/icons/ability-time-field.svg" width="76" height="76" alt="Ability Time Field"/><br/><sub>Ability Time Field</sub></td><td align="center" width="110"><img src="assets/ui/icons/ability-time.svg" width="76" height="76" alt="Ability Time"/><br/><sub>Ability Time</sub></td><td align="center" width="110"><img src="assets/ui/icons/ability-veil-of-nothing.svg" width="76" height="76" alt="Ability Veil Of Nothing"/><br/><sub>Ability Veil Of Nothing</sub></td></tr>
<tr><td align="center" width="110"><img src="assets/ui/icons/item-arc-cell.svg" width="76" height="76" alt="Item Arc Cell"/><br/><sub>Item Arc Cell</sub></td><td align="center" width="110"><img src="assets/ui/icons/item-echo-dust.svg" width="76" height="76" alt="Item Echo Dust"/><br/><sub>Item Echo Dust</sub></td><td align="center" width="110"><img src="assets/ui/icons/item-echo-pike.svg" width="76" height="76" alt="Item Echo Pike"/><br/><sub>Item Echo Pike</sub></td><td align="center" width="110"><img src="assets/ui/icons/item-prism-bow.svg" width="76" height="76" alt="Item Prism Bow"/><br/><sub>Item Prism Bow</sub></td><td align="center" width="110"><img src="assets/ui/icons/item-spark-sling.svg" width="76" height="76" alt="Item Spark Sling"/><br/><sub>Item Spark Sling</sub></td><td align="center" width="110"><img src="assets/ui/icons/item-star-flake.svg" width="76" height="76" alt="Item Star Flake"/><br/><sub>Item Star Flake</sub></td></tr>
<tr><td align="center" width="110"><img src="assets/ui/icons/item-wisp-fragment.svg" width="76" height="76" alt="Item Wisp Fragment"/><br/><sub>Item Wisp Fragment</sub></td><td align="center" width="110"><img src="assets/ui/icons/weapon-chomper.svg" width="76" height="76" alt="Weapon Chomper"/><br/><sub>Weapon Chomper</sub></td><td align="center" width="110"><img src="assets/ui/icons/weapon-echo-pike.svg" width="76" height="76" alt="Weapon Echo Pike"/><br/><sub>Weapon Echo Pike</sub></td><td align="center" width="110"><img src="assets/ui/icons/weapon-prism-bow.svg" width="76" height="76" alt="Weapon Prism Bow"/><br/><sub>Weapon Prism Bow</sub></td><td align="center" width="110"><img src="assets/ui/icons/weapon-spark-sling.svg" width="76" height="76" alt="Weapon Spark Sling"/><br/><sub>Weapon Spark Sling</sub></td></tr>
</table>

## Run locally

```sh
npm install
npm run dev
```

`npm run dev` starts Vite, the Socket.IO room/voice backend, and Electron. For the browser build use `npm run build`; to create the portable Windows app use `npm run build:windows`. Release files are written to the ignored `release/` directory.

Run the existing automated checks with `npm test`.

## Gameplay

- Select Pac-Men or Ghosts, name and customize the character, then choose story, training, or room play.
- Explore the connected, procedurally expanding maze, collect pellets and power orbs, fight local NPCs, earn XP/currency, and progress through quests and faction skills.
- Hearts, hunger, consumables, a four-slot hotbar, weapons, safe zones, and local saves support the survival-RPG layer.
- Animated SVG-derived characters, maze props, collectibles, abilities, and UI art are included in `assets/`.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move; tap the same direction twice quickly to brake |
| Space / left click | Basic attack |
| R | Cast equipped faction ability |
| C | Pulse |
| Q | Dash as Pac-Men; phase-shift as Ghosts |
| T | Tame a nearby weakened ghost (Pac-Men only) |
| G | Talk to a nearby NPC |
| E / I / 4 | Open inventory |
| 1?3 | Use a hotbar item |
| F | Open/close room chat |
| P / Esc / Tab | Pause or toggle the in-game menu |

## Rooms and online limits

For LAN play, run the dev server on the host and let other players connect to the host's Vite address on port `5173`; share the same room code. Room relay and PeerJS voice signaling use ports `3100` and `9000` by default in development. Packaged desktop builds start local services and select nearby free ports; they support same-computer rooms. Internet rooms require a publicly hosted Node server, HTTPS/WSS, TURN for reliable voice, server-side gameplay validation, and moderation/privacy work. See [Microsoft Store and multiplayer hosting notes](docs/MICROSOFT_STORE.md).

Accounts, cloud saves, global rankings, authoritative PvP/economy, purchases, and a Steamworks integration are not implemented. See [ROADMAP.md](ROADMAP.md) for the current boundaries and next steps.

## Build notes

The Windows portable executable is unsigned unless a signing certificate is configured. Choose a repository license before inviting code reuse; without a `LICENSE` file, GitHub does not grant reuse rights. Do not publish credentials or local `.env` files.
