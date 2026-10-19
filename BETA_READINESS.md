# Beta readiness notes

This build is still an alpha. The fixes in this pass improve movement validation, combat feedback, power-up consistency, narration, settings, and local-network rooms. They do not yet turn the prototype into a beta release.

## Changed in this pass

- Power pellets and their temporary forms last 45 seconds.
- “Phase” now avoids enemy contact while maze walls remain solid. Speed, crunch reach, and sugar shield forms are applied by gameplay code.
- The room server rejects invalid, blocked, and multi-tile position updates. Ranged weapons stop at maze walls.
- Unknown room codes are rejected. Leaving the code blank creates a room.
- Packaged desktop room and voice services bind to network interfaces and announce a LAN address. The app origin is accepted by its own server, and the server returns its actual PeerJS port.
- Missed aimed abilities do not consume their cooldown. The settings page includes narrator voice and sound level choices.
- Intro pages are narrated. Kokoro is an optional local neural voice; the first use downloads its model. System speech remains available as a fallback.

## Work before beta

1. **Multiplayer authority:** move health, combat, abilities, pickups, scores, respawns, and world-expansion decisions to the server. Right now clients still simulate most of the game locally, so positions and room chat are not a fully synchronized match.
2. **Public rooms:** deploy the Socket.IO and PeerJS services behind TLS with a stable hostname, secure WebSocket support, TURN relay credentials, monitoring, rate limits, and abuse/report tools. The packaged server currently supports same-network play; it does not make the user's computer publicly reachable.
3. **Join and recovery:** add room discovery/invite links, reconnect and resync after a dropped connection, room expiry, host migration or a clear host-disconnected state, and version compatibility checks.
4. **Gameplay balance:** tune power-pellet frequency, 45-second duration, shield rules, ability cooldowns, enemy AI, safe zones, progression economy, and win/loss conditions through repeated multiplayer playtests.
5. **QA and accessibility:** add automated tests for combat and saves, desktop browser smoke tests, keyboard remapping, clear audio/voice controls, reduced motion, color-blind options, and readable scaling at common window sizes.
6. **Release pipeline:** test clean installs and upgrades, code signing and antivirus behavior, firewall prompts, save migration/backups, crash reporting that respects privacy, and a tested rollback process.
7. **Content and polish:** replace the remaining placeholder-style synthesized SFX with a small, consistently mixed, licensed sound pack; finish settings persistence and add an audio preview. Kokoro's voice model is separate from the app install and needs a first-run download.

## Suggested follow-up video

A good livestream sequel is a **Neon Snake** modernization: start with classic Snake, sketch a maze and snake in SVG, animate it in Phaser, then add a dash ability, collectible effects, a high-score panel, and one simple online room. It is recognizably small enough to finish on stream, and it shows the same SVG-to-Phaser workflow without claiming a full multiplayer game is easy.
