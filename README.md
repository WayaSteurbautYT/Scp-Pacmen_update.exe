# Neon Maze Desktop

Neon Maze is a Windows desktop prototype built with Electron, Phaser 3, and Vite. It is a 2D arcade RPG about floating Pac-Men and ghosts, with an expanding maze, scripted NPCs, and local progression.

## Run

Install Node.js, then from the project folder:

```sh
npm install
npm run dev
```

`npm run dev` starts the Vite client, room/voice signaling server, and Electron app. To build and launch the desktop app:

```sh
npm start
```

Run the automated checks with `npm test`; create a production web build with `npm run build`.

## Playable now

- Choose a player name, Pac-Men or Ghosts race, starter look, and faction ability.
- Explore a connected, procedurally expanding maze with pursuit AI, ambient characters, pellets, power orbs, safe zones, and animated SVG-derived sprites.
- Fight local NPC rivals, use basic attacks and faction skills, collect weapon drops, and equip the Spark Sling, Echo Pike, or Prism Bow. Higher-level skills include Pac-Men time fields and prism barrages, plus Ghost teleport, hunger drain, and a temporary invulnerability veil.
- Manage hearts, hunger, consumable items, an inventory, and a four-slot hotbar. Earn local XP, faction-specific PacCoins or Ghost Coins, quest rewards, ability unlocks, achievements, and optional rebirth upgrades.
- Tame weakened ghosts as a Pac-Man, talk to nearby NPCs, and see their short scripted dialogue and thinking/chat bubbles.
- Choose a character, story/training/room mode, then optionally take the field-guide tutorial before entering the full-screen maze. Pause for inventory, skills, missions, and settings.
- Resize the maze, adjust zoom and character scale, mute or tune synthesized sound/music, and show or hide chat bubbles.
- Save local progress, inventory, achievements, and best scores in the browser's local storage.
- Create or join room-code lobbies. The current network layer relays player presence/movement, chat, maze expansion, and optional peer-to-peer voice signaling.

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
| 1–3 | Use the corresponding hotbar item |
| F | Open/close live room chat |
| P / Esc / Tab | Pause or open/close the in-game menu |

## Multiplayer, voice, and limits

For LAN play, run `npm run dev` on the host. On another computer on the same network, open the host's LAN address at port `5173` and join the same room code. Allow Node.js through the host firewall if prompted. The room server listens on `3100`; its PeerJS signaling server listens on `9000` at `/voice`.

The relay transports room presence and gameplay state, but it does not make combat, health, progression, or currency authoritative. A Pac-Man power-pellet story event can signal a temporary Ghost vulnerability visual; it does not synchronize player damage or capture. Leaderboard ranks and profile data are local to a device. NPC conversation is scripted and local; no cloud AI provider is connected. Microphone use is opt-in and uses PeerJS/WebRTC; direct audio can fail behind restrictive NAT/firewall settings. A production internet deployment needs HTTPS/WSS, reliable TURN configuration, server-authoritative game state, and appropriate moderation/privacy controls.

Accounts, cross-device saves, global rankings, online PvP combat, Stripe purchases, paid currencies, a public marketplace, prompt-driven NPCs, AI asset generation, user-published games, and workshop crafting/selling are not implemented.

See [ROADMAP.md](./ROADMAP.md) for current feature boundaries, visual/animation guidance, and the proposed development sequence.
