# Neon Maze — Design and Roadmap

This document is the shared reference for what the prototype does, what its art should look like, and which larger ideas remain future work. Status labels are deliberate: **Playable** means present in the current local prototype; **Prototype** means partial or local-only; **Planned** means not implemented.

## Product direction

Build an original, mostly 2D arcade RPG that combines the instantly readable round Pac-Man silhouette with expressive supernatural ghost characters and modern progression. The current desktop identity is **Neon Maze**: dark navy environments, cyan neon, warm gold pickups, and playful dark-comedy dialogue.

The game should honor the classic maze-chase inspiration without copying official character art, names, music, or other protected assets. *Pac-Man and the Ghostly Adventures* is a high-level reference for imaginative powers and adventurous supernatural tone, not a source for tracing designs.

## Current feature map

### Playable local prototype

- **Races and setup:** choose a player name, Pac-Men or Ghosts, one of four starter looks, and a faction ability. The setup screen currently precedes the room/sidebar workflow; a polished room-first onboarding flow is still planned.
- **Maze:** procedurally connected, expanding exploration with pellets, power orbs, objects, safe zones, and a camera that fills the game view.
- **Characters and NPCs:** one representative floating Pac-Man and ghost, several local pursuit personalities, occasional ambient NPCs, scripted dialogue, chat bubbles, and an initial ghost-taming interaction.
- **Combat:** directional melee/ranged attacks, pulse and dash/phase actions, local enemy health, hit feedback, respawns, and occasional loot including the Prism Bow. Higher-level faction skills include Pac-Men time-field and prism-barrage attacks and Ghost blink, hunger-siphon, and invulnerability skills. Combat is client-side; remote player health and attacks are not synchronized.
- **Survival and inventory:** hearts, hunger, consumables, collected item storage, a four-slot hotbar, weapon equipment, local XP, PacCoins/Ghost Coins, faction skill trees, missions, achievements, ranks, and optional rebirth.
- **Menus and access:** a brief first-run tutorial, pause menu, skills/inventory/missions/settings tabs, zoom/visual-size controls, and sound/music/chat-bubble toggles.
- **Rooms and voice:** room-code connection, player roster/movement, lobby chat, shared maze expansion, and opt-in PeerJS/WebRTC microphone connections. This is not an authoritative online game service.
- **Desktop identity:** custom SVG icon and intro artwork exist. The current soundscape is synthesized in the client.

### Not implemented yet

Global accounts and leaderboards, server-authoritative PvP and economy, persistent online worlds, advanced NPC AI or cloud-generated dialogue, quests with bespoke story scenes, robust character customization, paid Ghost Coins, Stripe checkout, a public creator marketplace, custom-maze publishing, user-authored mini-games, and cross-platform installers.

## Character and animation art direction

### Anatomy and visual style

- Characters float; Pac-Men stay round and ghosts keep their soft scalloped silhouettes. **No arms, legs, hands, or feet.**
- Show action with mouth/eye changes, squash-and-stretch, rotation, body shape, colour, auras, trails, particles, and timed deformation.
- Use clean flat-vector contours, careful layered shading, restrained gradients and glow, and readable faces at gameplay size. Avoid pixel-art styling.
- Different ghost types need distinct silhouettes, patterns, facial expressions, or effects as well as different colours.
- Ghosts only become blue during a Pac-Man power/vulnerability window. Their ordinary identity colours return afterward.
- Combat and capture should stay playful: short, characterful reactions and dark-comedy one-liners rather than graphic violence.

### Animation families

The current source art is editable SVG; Phaser loads it as a raster texture atlas. Keep every atlas frame, `character-animations.json` definition, and code animation key synchronized. All atlas cells are 64 × 64 px.

| Family | Source grid | Implemented animation themes |
| --- | --- | --- |
| Pac-Man runner | 6 columns × 3 rows (18 frames) | Idle, move, turn, eat, damage, invulnerable, fire/ice/electric forms, dash, shield, pulse, recover, defeat, respawn, victory, attack |
| Ghost wisp | 6 columns × 4 rows (24 frames) | Idle, move, attack wind-up/attack, damage, vulnerable, stun, stealth, phase, defeat, respawn, victory, trick, eyes-only return, staged body rebuild |
| Maze objects | 6 × 2 (12 frames) | Safe-zone beacons, caches, and other environmental props |
| Special pellets | 6 × 2 (12 frames) | Sun, frost, and spark pellet forms |
| Ability effects | 6 × 2 (12 frames) | Pulse, dash, shield, stealth, tracking, elemental bursts, and ghost echo |

The runner atlas is 384 × 192 px; the ghost atlas is 384 × 256 px; the object, pellet, and effects atlases are each 384 × 128 px. Animation names, frame indices, frame rate, and looping rules live in `assets/characters/character-animations.json`.

**Playable now:** the representative runner and ghost, atlas-driven animations, power/vulnerability visuals, ghost eyes-return and staged rebuild concepts, and several prop/pellet/effect animations.  
**Next:** review each family in-game at actual size; make attack/damage/knockback/recovery and transformation states visually distinct; then polish the representative Pac-Man and ghost completely before adding more cast members.

## Interface, icon, title sequence, and sound

- **Current title:** Neon Maze. Keep the title readable in the app title bar, desktop shortcut, and small icon contexts.
- **Icon direction:** retain the current SVG as a base; refine it around a single luminous Pac-Man-like golden disc facing a mischievous cyan ghost, using a simple silhouette that survives at 16–32 px. Avoid fine text and excessive glow.
- **Intro direction:** animate a short SVG scene: a pellet trail draws the maze, the runner glides in and chomps a gap, a ghost peeks out and reforms, then both settle into the app mark. Keep it brief, skippable, and consistent with the in-game characters.
- **Typography:** use an expressive display face such as Oxanium for headings, a legible UI face such as Bahnschrift/system sans for controls, and DM Mono for arcade labels. Ship local/fallback fonts rather than relying on a remote font service.
- **Sound:** current tones are synthesized. Planned improvements include original short chomp, pickup, dash, ability, damage, UI, and ghost-rebuild cues; optional looping music; independent volume/mute controls; and restraint to avoid tiring repetition.

## Progression and mechanics

### Present prototype behavior

Pac-Men and Ghosts use separate ability trees and currency labels. XP, inventory, currency, quests, achievements, and upgrades are stored locally. The Prism Bow, Spark Sling, and Echo Pike can drop from local NPC knockouts. Rebirth is optional and level-gated. Taming is available to Pac-Men against weakened ghosts. Higher-level skill mechanics are local-only prototypes and require balance and playtesting.

### Design rules for expansion

- Preserve the recognizable maze-chase loop: collect, evade, power up, and take calculated risks.
- Keep item, weapon, skill, and transformation feedback readable and accessible; show health over local actors and clear hit/miss feedback.
- Make power growth unlock choices and tactics, not only larger damage numbers. NPCs may learn new abilities over time, but advancement should be visible and fair.
- Treat hunger and hearts as a survival layer, not a replacement for the core chase. Safe zones should be legible, useful, and unable to trivialize danger.
- A captured ghost may return as eyes and gradually rebuild. Taming should be an explicit, short-range choice with a clear **T** prompt, ally feedback, and a funny faction reaction.
- Give missions and story moments explicit goals, rewards, and opt-out/skip controls. Store unlock state reliably before making it part of a competitive economy.

## Development roadmap

### 1. Stabilize the playable slice

- **Validated:** the automated test suite and production build pass; a browser smoke check verified character-to-session selection, tutorial handoff, and entry into the immersive game view.
- **In progress:** verify both faction combat paths and advanced skill effects in gameplay; check camera and overhead labels at different viewport sizes, fullscreen, and visual scales; exercise room setup and settings.
- Fix state/DOM edge cases; maintain focused tests for progression, world generation, animation manifests, and room validation.
- Keep all copy accurate about which actions affect local NPCs versus remote players.

### 2. Finish onboarding and core play

- **Planned:** make room creation/joining the first onboarding decision, followed by player name and character creation, while preserving an offline/local path.
- Expand tutorial tasks into interactive, skippable steps covering movement/braking, collecting, safe zones, combat, hotbar, taming, chat, and pause.
- Add reviewable character-creation previews and accessible control remapping.
- Complete a coherent early-game loop: safe-zone restocking, item crafting/selling, missions, drops, enemy recovery, and a small story sequence.

### 3. Make online play trustworthy

- **Planned:** authenticate profiles, persist data on a service, validate movement/combat/rewards server-side, and synchronize health, abilities, drops, and progression.
- Add private/friends rooms, lobby permissions, reconnection, moderation/reporting controls, and abuse-resistant chat.
- Add global and friends leaderboards only after server-side score validation.
- Improve voice reliability with deployment-owned TURN infrastructure, clear microphone consent, mute/report controls, and privacy documentation.

### 4. Expand characters and game modes

- **Planned:** finish representative animation families before producing new variants; add original power forms, ghost personalities, equipment, and authored quest encounters.
- Add game modes such as team chase, arena/deathmatch, and story scenarios only when their win conditions and balancing are distinct.
- Add creator-facing maze tools with procedural generation, safe-zone placement, NPC behavior presets, private playtests, and publish/review controls.

### 5. Creator economy and generative tools (long-term)

- **Planned:** support user-provided SVGs only through a validated, sandboxed asset pipeline with size/complexity limits, sanitization, attribution, moderation, and runtime budgets.
- If AI-assisted dialogue, art, or code generation is added, call providers through a service that protects credentials, enforces spending/rate limits, and applies safety and moderation checks. A "free API" is not a dependable production entitlement.
- A public marketplace and Stripe-powered purchases require server-authoritative entitlements, receipts/refunds, creator payouts, fraud controls, moderation, tax/compliance review, and clear refund policies. Never store payment or provider secrets in the game client.
- User-authored code or mini-games must run in a strict sandbox, with resource limits, permission boundaries, malware/content review, and a clear opt-in install/run experience.

## Video / release notes

For a progress video, show the character silhouettes and no-limbs rule, the expanding maze, both race choices, one complete combat interaction, inventory/hotbar, the skill tree, the ghost-rebuild/taming gag, the tutorial, and an honest multiplayer status note. Separate current footage from mockups or planned features; do not present AI, Stripe, global accounts, or online PvP as live.
