# THE BARBICAN

A 2D pixel-art metroidvania set in London's Barbican Estate — the real brutalist
labyrinth, so confusing that a yellow line is painted on the ground to guide
visitors. The estate is empty, the Yellow Line can't always be trusted, and your
friend is waiting in the members' bar. Get there.

**▶ Play it:** https://andy159.github.io/barbican/ *(GitHub Pages, desktop
browser + keyboard)* — or run it locally, below.

Built with vanilla JavaScript and Canvas. No frameworks, no dependencies, no
build step. 320×180 pixels, 60Hz fixed timestep, one painted yellow line.

## Controls

| | |
|---|---|
| **← → / A D** | move |
| **Z / J / Space** | jump — hold into a wall to slide, jump again to kick off |
| **X / K** | dash *(once you've earned it)* |
| **E** | interact *(inside the flat)* |
| **R** | respawn at your last bench |
| **`** | debug overlay |

Benches save your progress. Any key skips the cinematics.

## What's in it

- **The Estate Route** — highwalks, Gilbert Bridge, a wall-jump climb through
  the inside of Cromwell Tower (floors 03–43), and a key on the roof.
- **A 3D interlude** — unlock a Wallside flat and walk it in first person: a
  faithfully furnished Type 20 with mid-century pieces, paintings by Finnish
  artists, openable drawers, and something you'll need in the kitchen.
- **The central ponds** — island-hopping over waist-deep water, fountains,
  ducks, a heron on St Giles', and a cascade.
- **The Arts Centre** — the flytower climb, the Martini Bar, and Cinema 1,
  where Stan Brakhage's *Mothlight* (1963) is playing to an empty house.
  Get too close to the screen and you'll find out what it's like inside.
- **The Conservatory** — the glasshouse the estate built to hide its own
  machinery. Hollow Knight-dark, koi below, cacti to the east — and THE HEAD
  GARDENER guarding the way out. There's no attack button; the dash is the
  weapon.
- An animated intro and an ending worth reaching. Bring a taste for Minttu.

## Run it locally

Any static file server from the repo root:

```bash
python3 -m http.server 8138
```

then open http://localhost:8138. Useful dev URLs (they skip the intro):

```
/?level=arts-centre          start at a level (estate-route, arts-centre,
/?level=conservatory          conservatory, mothlight)
/?level=estate-route&at=206,30   drop in at a tile (tx,ty)
/flat.html                   the 3D flat directly
/?shot=3&hold=1              scrub the intro; ?outroshot=n for the ending
```

## Development notes

- **Physics feel constants** live only in [`src/tuning.js`](src/tuning.js).
- **Levels are generated**: edit `tools/gen-*.mjs`, never the emitted
  `levels/*.js`. Rooms are human-readable ASCII (`#` concrete, `=` walkway +
  Yellow Line, `B` bench, `W` water, `K` key, …) — full legend in
  [`CLAUDE.md`](CLAUDE.md).
- **Everything is machine-proven**: `node tools/verify-physics.js` runs ~110
  headless proofs — movement envelope regression, every gap and climb walked
  by bots on the player's real path, ability gates proven passable *with* and
  impossible *without*, the key economy, the boss fight beaten by a bot that
  reads telegraphs. It must exit 0 before any commit that touches physics,
  levels, or generators.
- Research that shaped the design lives in [`docs/`](docs/) — the estate's
  architecture, the flat's furnishing, the ponds, the Conservatory, and what
  makes Hollow Knight fun.

## Acknowledgements

The Barbican Estate (Chamberlin, Powell and Bon, 1965–76) and its residents;
Celeste, Hollow Knight, and Ori for the feel references; Stan Brakhage for
*Mothlight*; Helene Schjerfbeck, Akseli Gallen-Kallela, and Hugo Simberg for
the walls of the flat. Built as a collaboration between a human and Claude.
