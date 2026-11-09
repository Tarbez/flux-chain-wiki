# Facts from the game session (2026-11-09)

Reader: the intro story team. Source: the fxn world Game session. Paths are under /Volumes/PortableSSD/flux/fxn-3d/.
The one doc: docs/design/editor/WORLD-STUDIO.md. Second: docs/design/engine/PORTAL-WORLD.md.

**Two limits first.** The game runs locally only: README.md:3 says "It runs locally. It has no remote." So "playable now" means on the owner's Mac. WORLD-STUDIO.md:169 says "No person has played any of this. Everything ran by script."

## The engine
- The 3D game (world/portal/game.html) is playable locally. Its door says: "DEFXN runs on a development network today. Nothing in this game is live."
- Open worlds (world/worlds/play.html: ringrun, tiltgarden, paperhush) are playable locally. Real time: yes.
- Multiplayer is built for localhost only: a WebSocket room server (flux/presence-relay/room-server.mjs). Public play is planned and is the owner's call. Other players show as capsules.
- Frame time on an Apple M2 with 8 GB: worlds hold 16.7 ms median (60 fps, capped by the display). Any "60 fps" line must say "capped at the 60 Hz display on an M2 Mac".

## Worlds
- World Studio (world/builder/index.html) is playable locally. A world is a studio document. No person has drawn a world by hand yet.
- The Maker's Key is built. Only a script has walked the mission that earns it.
- **A world is not a chain today.** In the game a world is a local record. "Each world is its own chain" is planned story direction only, and that direction is not confirmed.
- The real product fact: a Deploy launch gives a resolver its own chain, on the development network (DIRECTION.md:145, 152).

## Portals
- The portal world is playable locally. Nature has 3 working portals. The city's other 10 doors are locked.
- A 3D Hall of Portals is planned, not built. docs/design/direction/SITE-FILM.md lines 190-196 are only a spec.

## Scenes that exist for "the game" (none of the 14 site objects)
- world/portal/game.html (the full game), world/portal/index.html (the wet stone plaza), world/portal/select.html (character select), world/worlds/play.html (3 open worlds), world/games/* (3 minigames), world/builder/index.html (World Studio). Previews only: world/wakinggate/index.html, world/vehicles/index.html.
- Naming flag: the game still says "DEFXN City" in places. The owner's ruling is that the city is "Stupa".
