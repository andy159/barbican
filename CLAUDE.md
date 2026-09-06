# THE BARBICAN — Project Brief & Build Plan for Claude Code

You are taking over development of **The Barbican**, a 2D metroidvania prototype. A working Phase 1 build already exists. Read this whole file before writing code. Save this file as `CLAUDE.md` in the repo root so it loads as project context in every session.

---

## 1. The Game

**Premise:** The player is trapped in the Barbican Estate — the real brutalist complex in London, so labyrinthine that a yellow line is painted on the ground to guide visitors. The estate is empty, the Yellow Line can't always be trusted, and beneath the concrete lie the remains of London's Roman wall and the original medieval barbican. Get out.

**Feel references:** Celeste (movement), Hollow Knight (atmosphere, world structure), Ori (palette breaks).

**Art direction (settled — do not change without asking):** Bright London daylight. Hazy pale-blue sky, warm pebbledash-grey concrete, the estate's three towers in parallax with balcony bands, blue-painted railings, and flower boxes spilling pink/red/white blooms over the edges (modeled on a reference photo of the real estate). Drifting petals as ambient particles. The Yellow Line in saturated `#f7c623` is the signature visual element. The player is a small dark figure with a yellow scarf. Pixel art, 320×180 internal resolution, 8×8 tiles.

**Signature mechanic (build toward this):** The Yellow Line guides the player honestly in the early game, then forks, fades, and misleads later. Scuffed-away line marks secrets.

---

## 2. Current State — Phase 1 is DONE

The file `barbican_phase1.html` (place it in the repo) is a complete single-file build containing:

- Fixed 60Hz timestep loop with accumulator + render interpolation
- Custom kinematic controller, AABB tile collision (resolve X, then Y)
- Jump feel kit: 6-frame coyote time, 6-frame jump buffer, variable jump height (cut multiplier 0.45), apex gravity reduction (×0.6 within |vy| < 0.55), 2px ceiling corner correction
- Squash & stretch scaled to landing impact
- ASCII level format (`#` concrete, `=` walkway with Yellow Line, `P` spawn; missing floor = pit)
- Smooth camera with facing lookahead, clamped to room bounds
- Debug overlay (backtick), reset (R), death counter, respawn flash
- Daylight rendering: gradient sky, sun, balconied parallax towers (2 depth layers), petals, planters, haze, subtle vignette
- A `TUNING` object at the top of the script holding every feel constant — **this is the single source of truth for physics. Never hardcode movement numbers elsewhere.**

Verified physics (don't break these without re-verifying level reachability): max jump ≈ 3.5 tiles high, ≈ 7 tiles horizontal range at full run speed. Current test level uses gaps of 2/3/5 tiles and +2-tile platform hops.

## 3. Your First Tasks (repo setup)

1. `git init`, commit `barbican_phase1.html` and this file as-is (baseline).
2. Restructure into a small ES-module project — keep vanilla JS + Canvas, **no frameworks, no physics engines, no build step beyond a static server** (`npx serve` or `python3 -m http.server`):
   ```
   /index.html
   /src/main.js        (loop)
   /src/tuning.js      (the TUNING object, exported)
   /src/player.js      (controller)
   /src/level.js       (tile data, collision queries)
   /src/camera.js
   /src/render.js      (sky, towers, tiles, player, ambience)
   /src/input.js
   /levels/*.js        (room data modules)
   ```
3. Confirm behavior is identical to the single-file version after the split (manual playtest). Commit.
4. Work in small commits, one feature per commit, imperative messages ("Add wall slide").

**Testing:** there's no test framework requirement, but for anything physics-numeric (jump height, dash distance, gap reachability) write a tiny node script in `/tools/` that simulates the TUNING values and prints results — this was already done once to validate the level and it caught real errors.

---

## 4. Roadmap

Work phases in order. Each phase ends with a playable build and a manual playtest checklist. Ask the user to playtest at every phase boundary; tune `TUNING` from their feel notes before moving on.

### Phase 2 — Core Abilities
1. Wall slide + wall jump (10-frame horizontal input lock after wall jump; can't infinitely climb one wall)
2. Dash: 8-direction, ~15 frames, ~48px fixed distance, 3-frame freeze on activation, refreshes on landing, afterimage trail
3. Shoulder barge: short windup, breaks `H` (hoarding) tiles, screen shake on impact
4. Cradle grapple: fires toward `A` (anchor) tiles, pendulum swing, momentum carry on release — hardest item, do it last
5. `player.abilities = { dash, barge, grapple, ... }` flags gate everything from day one
6. Extend the test level with a gauntlet per ability that is impossible without it

**Accept when:** each gauntlet is completable with its ability and provably not without.

### Phase 3 — World Structure
1. Multiple rooms: each `/levels/` module exports `{ id, tiles, entities, exits }`; exits define a world graph (`{ side, range, to, entry }`)
2. Hollow Knight-style slide transitions between rooms, player state preserved
3. Death/respawn at room entry point, < 0.5s
4. Map screen (Tab) rendered from the world graph — visited rooms filled, current room pulsing; style it like the estate's real wayfinding signage (white/yellow on dark grey)
5. Yellow Line segments as room entities with an integrity state (true / forked / faded)
6. Save state: one serializable object (abilities, flags, visited, position) — localStorage is fine locally, plus export/import as a base64 string
7. Build 6–8 connected rooms

**Accept when:** you can get lost, open the map, and navigate back.

### Phase 4 — Progression Systems
1. Gate types: hoardings (barge), anchor gaps (grapple), keycard doors (3 tiers: resident fob → staff card → master key), dash/walljump-height ledges, vent crawls
2. Global flags swap room layout variants on load (the "estate rearranges itself" mechanic; one-way shutters)
3. Global `waterLevel`: swim physics (low gravity, damped velocity), pump-room levers change water in other rooms
4. Ability pickups with a moment: pause, text card, flash
5. Levers, pressure plates, timed roller shutters

**Accept when:** a 15-minute loop exists — blocked → find barge → break hoarding → drain level → get grapple → exit the first room a new way.

### Phase 5 — Hazards & Light Enemies
1. Fountain jets on fixed telegraphed cycles (30-frame warning)
2. Highwalk wind-gust force zones with visible debris
3. Crushers and retracting floors on cycles
4. One patrol enemy (automated cleaning machine): walks ledges, turns at edges, dies to barge
5. Health: 3 hits, i-frames + knockback, refill at concrete benches (save points)

### Phase 6 — Vertical Slice: "The Arts Centre" (~20 rooms)
Draw the room graph and get user sign-off **before** building. Gimmicks: fly-tower bars to ride, counterweight puzzles, revolve floors, sound-reactive doors. Grapple is acquired here with a taught sequence. 3 secrets (2 health fragments behind hoardings, 1 journal). Mini-boss: The Stage Manager (the theatre's rigging system). Ends with a lift descending past a fragment of Roman wall.

### Phase 7 — Polish
Sprite pass (player ~16×24, 3-frame run; board-marked concrete tileset; keep the established daylight palette), particles (concrete dust, splashes, petals), capped screen shake, hit-stop, WebAudio procedural SFX, title/pause screens, timers.

### Phase 8 — Optional Godot port mapping document.

---

## 5. Conventions & Constraints

- 60Hz fixed timestep; all speeds in px/frame; never use wall-clock dt in gameplay logic
- All feel constants live in `tuning.js` only
- Levels stay human-editable ASCII; validate reachability with a `/tools/` script when physics or levels change
- Tile legend so far: `#` solid, `=` walkway+Yellow Line, `P` spawn, reserved: `H` hoarding, `A` anchor, `W` water, `D` door, `^` hazard, `Y` line marker
- Rendering is layered: sky → far towers → near towers → petals → tiles → planters → entities → player → haze → vignette → debug. Keep that order.
- Performance target: steady 60fps; the tile renderer only iterates the visible tile range — preserve that
- Don't add dependencies without asking. Don't change art direction, resolution, or tile size without asking.
- When in doubt about feel or design, ask the user to playtest rather than guessing.

**Start with Section 3 (repo setup), then Phase 2 item 1: wall slide + wall jump.**

---

## 6. Direction change (2026-09-06): fresh start, browser-first

This repo is a clean restart of the project at `~/code/game/barbican`. The
previous repo (`~/barbican`) — including its Godot .NET port, Unity port,
and JS module split — is retired; don't reference or resurrect it.

- **The build is vanilla JS + Canvas, run in a browser.** Sections 3–5 above
  apply exactly as written: ES modules, no frameworks, no build step beyond a
  static server. Godot/C# is off the table (Godot 4 can't export C# to web).
- Rebuilt from the canonical `barbican_phase1.html` baseline, whose physics
  was previously verified (max jump 3.45 tiles, min 1.01, range 7.20 tiles).
  Keep `tools/verify-physics.js` in step with those numbers.
- Preview: `.claude/launch.json` runs `python3 -m http.server` — use the
  editor preview, never a Bash-launched server.

## 7. State of the build (2026-09-06, night)

- **World**: `src/world.js` — E-chain estate-route → arts-centre →
  conservatory, plus portal rooms (Cinema 1 screen → mothlight → back)
  and `goTo(id, P, at)`. Rooms may carry `abilities` grants,
  `interiors`/`doors`/`lamps`/`houses` metadata.
- **Key economy**: tower-roof key ('K', estate) unlocks the Wallside
  door ('D' tile → flat.html, the 3D interlude); the Arts Centre key
  (found in the flat's kitchen drawer, persisted via localStorage
  `barbican.keys.artsCentre`) unlocks the estate's stage-door exit.
  Fresh runs clear both keys; `?at`/`?level` preserve them.
- **Intro**: `src/intro.js` cinematic plays on fresh loads; any key
  skips; dev params bypass.
- **Tile legend adds**: `D` house door (non-solid, gated), `*` dash
  pickup, `E` exit, `w` shallow water (wading), `V` vine platform,
  `F` fly bar / foliage dome, `^` cactus (kills), `K` key.
- **Levels** (all generated; edit the tools/gen-*.mjs, never the output):
  estate-route 452×56 (gen-estate), arts-centre 360×56 (gen-artscentre),
  conservatory 336×60 (gen-conservatory), mothlight 184×68 (gen-mothlight).
- **Renderer dispatch** in `src/render.js`: mothlight full-takeover;
  `interior: true` rooms → `src/interior.js`; `backdrop: 'conservatory'`
  → `src/conservatory.js`; estate east of col 272 → `src/ponds.js`
  (Ghibli pass); tower interior volumes fade via `interiors` rects.
- **Verifier**: ~100 proofs across all four levels + mechanics + the key
  economy + the cinema loop. `node tools/verify-physics.js` must exit 0
  before any commit touching physics, levels, or generators. Bots must
  WALK entry paths (placed-inside-only proofs have missed real blockers
  twice).
- **In flight**: The Head Gardener boss (conservatory finale) via
  subagent worktree.
