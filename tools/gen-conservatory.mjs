// Generates the Conservatory level (400x60) and writes levels/conservatory.js.
// Level 3: the Barbican Conservatory — steel-and-glass roof hiding the theatre
// flytower, tropical jungle, koi ponds, wall-jump shafts up the flytower's
// west flank, a roof walk, the Arid House (cacti) descending east, and the
// final chamber: THE HEAD GARDENER boss arena (src/gardener.js) — koi-strip
// floor hazards, four brick islands, an overhead gantry rail, and a gate
// (cols 393-394) that only opens when the gantry dies. Exit beyond the gate.
// The player arrives with wall jump + dash; every 9-tile gap is dash-gated.
import { writeFileSync } from 'node:fs';

const W = 400, H = 60;
const g = Array.from({length: H}, () => Array(W).fill(' '));

function set(x0, x1, y0, y1, ch, allow = false){
  for(let y = y0; y <= y1; y++)
    for(let x = x0; x <= x1; x++){
      if(!allow && g[y][x] !== ' ' && g[y][x] !== ch)
        throw new Error(`conflict at ${x},${y}: '${g[y][x]}' vs '${ch}'`);
      g[y][x] = ch;
    }
}

/* ---- S1: entrance terrace (cols 0-22), surface row 52 ---- */
set(4,4,50,50,'P');
set(0,22,52,52,'=');   set(0,22,53,59,'#');
set(8,8,51,51,'B');                          // bench: entrance

/* ---- pond 1: first dash gap (9), koi below ---- */
set(23,31,54,55,'W');  set(23,31,56,59,'#');

/* ---- S2: koi court — shore, big pond, vine-platform chain ----
   shore 32-48 . gap9 . V 58-62 . gap9 . V 72-76 . gap9 . V 86-90 .
   gap9 . V 100-104 . gap5 . east shore 110-121 */
set(32,48,52,52,'=');  set(32,48,53,59,'#');
set(49,109,54,55,'W'); set(49,109,56,59,'#');
set(58,62,52,52,'V');  set(72,76,52,52,'V');
set(86,90,52,52,'V');  set(100,104,52,52,'V');
set(110,121,52,52,'='); set(110,121,53,59,'#');
set(113,113,51,51,'B');                      // bench: east shore

/* ---- S3: flytower shaft A (16-tile wall-jump climb) + secret ----
   left wall 122-123 (door 50-51), interior 124-127, right wall 128-129
   (door 50-51). Past the shaft at ground level the line is scuffed:
   alcove at the flytower's foot (gardeners' store, escapable). */
set(122,123,34,49,'#');                      // shaft left wall
set(128,129,37,49,'#');                      // shaft right wall
set(122,129,52,59,'#');                      // shaft floor + mass
set(130,133,52,52,'-');                      // scuffed line marks the secret
set(130,133,53,59,'#');                      // mass under the scuffed walk
set(134,139,56,59,'#');                      // alcove floor
set(138,139,53,55,'#');                      // alcove escape step

/* ---- mezzanine + shaft B (12-tile climb to the flytower roof) ----
   west wall 134-135 (door 34-35), interior 136-139, east wall = flytower */
set(128,139,36,36,'=');                      // mezzanine walkway
set(130,139,37,38,'#');                      // mezzanine slab
set(131,131,35,35,'B');                      // bench: mezzanine
set(134,135,20,33,'#');                      // shaft B west wall

/* ---- the flytower core: concrete mass rising through the glasshouse ---- */
set(140,164,24,24,'=');                      // flytower roof walk
set(140,164,25,59,'#');                      // the core itself

/* ---- S4: roof walk (row 24) — vine hops under the glass, all gaps 9 ----
   165-173 . V 174-178 . 179-187 . V 188-192 . 193-201 . island 202-211 .
   212-220 . V 221-225 . 226-234 . Arid House. Below: darkness. */
set(174,178,24,24,'V');
set(188,192,24,24,'V');
set(202,211,24,24,'='); set(202,211,25,25,'#');
set(204,204,23,23,'B');                      // bench: palm walk island
set(221,225,24,24,'V');

/* ---- S5: the Arid House — descending brick terraces, cacti ('^') ----
   T1 235-246 r24 . gap5 . T2 252-262 r27 . gap5 . T3 268-278 r30 .
   gap9(dash) . T4 288-298 r30 . gap5 . T5 304-314 r33 . gap5 .
   ledge 320-326 r37 . gap3 . exit floor 330-335 r42 */
set(235,246,24,24,'='); set(235,246,25,28,'#'); set(240,240,23,23,'^');
set(252,262,27,27,'='); set(252,262,28,31,'#'); set(257,257,26,26,'^');
set(268,278,30,30,'='); set(268,278,31,34,'#'); set(273,273,29,29,'^');
set(288,298,30,30,'='); set(288,298,31,34,'#'); set(293,293,29,29,'^');
set(304,314,33,33,'='); set(304,314,34,37,'#'); set(309,309,32,32,'^');
set(320,326,37,37,'='); set(320,326,38,41,'#');

/* ---- S6: approach — the LAST BENCH sits right before the arena ---- */
set(330,341,42,42,'='); set(330,341,43,59,'#');
set(333,333,41,41,'B');                      // bench: no boss runback

/* ---- S7: BOSS ARENA — THE HEAD GARDENER (sim/draw in src/gardener.js)
   51 tiles of koi strips (lethal 'W' at rows 43-44) between four brick
   islands at row 42. An overhead gantry rail (y=248, code-side, no
   tiles) spans the chamber; the gate at 393-394 stays shut until the
   gantry dies (src/gardener.js clears rows 26-41 on the win). ---- */
set(342,344,43,44,'W'); set(342,344,45,59,'#');   // entry pond (3)
set(345,351,42,59,'#');                            // island 1
set(352,357,43,44,'W'); set(352,357,45,59,'#');    // pond (6)
set(358,364,42,59,'#');                            // island 2
set(365,370,43,44,'W'); set(365,370,45,59,'#');    // pond (6)
set(371,377,42,59,'#');                            // island 3
set(378,380,43,44,'W'); set(378,380,45,59,'#');    // pond (3)
set(381,392,42,59,'#');                            // island 4 (widest, 12)
set(393,394,26,59,'#');                            // THE GATE

/* ---- S8: beyond the gate — bench + the way out ---- */
set(395,399,42,42,'='); set(395,399,43,59,'#');
set(397,397,41,41,'B');                      // bench: after the fight
set(398,399,40,41,'E');                      // the way out

const rows = g.map(r => r.join('').replace(/ +$/,''));

const signs = [
  [2,50,'THE CONSERVATORY'],
  [34,50,'MIND THE KOI'],
  [111,50,'FLYTOWER →'],
  [135,54,'GARDENERS STORE'],
  [129,34,'ARID HOUSE ↑'],
  [142,22,'ROOF WALK →'],
  [203,22,'PALM WALK'],
  [236,22,'ARID HOUSE'],
  [335,41,'DANGER · IRRIGATION TEST'],
  [395,39,'WAY OUT →'],
];

/* koi swim paths (px): {x0,x1,y, sp speed px/f, ph phase}; gold = the secret */
const koi = [
  { x0: 192, x1: 244, y: 437, sp: 0.30, ph: 0.0 },
  { x0: 400, x1: 484, y: 436, sp: 0.34, ph: 1.3 },
  { x0: 498, x1: 592, y: 443, sp: 0.26, ph: 3.1 },
  { x0: 624, x1: 736, y: 437, sp: 0.38, ph: 4.4 },
  { x0: 760, x1: 864, y: 442, sp: 0.29, ph: 0.8 },
  { x0: 418, x1: 560, y: 445, sp: 0.22, ph: 2.2 },
  { x0: 704, x1: 832, y: 435, sp: 0.33, ph: 5.5 },
  /* arena strips — these are the koi the gantry is guarding */
  { x0: 2740, x1: 2752, y: 349, sp: 0.20, ph: 2.6 },
  { x0: 2820, x1: 2852, y: 348, sp: 0.28, ph: 0.7 },
  { x0: 2924, x1: 2956, y: 350, sp: 0.24, ph: 4.0 },
  { x0: 3028, x1: 3042, y: 348, sp: 0.31, ph: 1.9 },
];

const out = `/* The Conservatory — generated by tools/gen-conservatory.mjs; plain ASCII.
   '#' planter brick / concrete, '=' steel walkway + Yellow Line, '-' scuffed
   line (the secret), 'V' vine platform, 'W' koi pond (kills), '^' cactus
   (kills on touch), 'B' bench (checkpoint), 'E' exit, 'P' spawn.
   Route: entrance terrace -> koi court vine chain (dash gaps of 9) ->
   flytower shaft A (wall jump, 16 tiles) -> mezzanine bench -> shaft B
   (12 tiles) -> flytower roof walk under the glass -> Arid House descent
   (cactus hops + one 9-tile dash) -> bench -> THE HEAD GARDENER arena
   (src/gardener.js; gate at 393-394 opens on the win) -> way out.
   Secret: scuffed line past the shaft drops into the gardeners' store.
   Run tools/verify-physics.js after editing. */
import { gardenerTick } from '../src/gardener.js';

export const CONSERVATORY = {
  id: 'conservatory',
  backdrop: 'conservatory',
  abilities: { wallJump: true, dash: true },
  tick: gardenerTick,                 // boss sim, run once per fixed step
  tiles: [
${rows.map(r => JSON.stringify(r) + ',').join('\n')}
  ],
  planters: [],
  signs: [
${signs.map(([tx,ty,text]) => `    { tx: ${tx}, ty: ${ty}, text: ${JSON.stringify(text)} },`).join('\n')}
  ],
  koi: ${JSON.stringify(koi)},
  tank: { x: 1080, y: 448 },
  exitGlow: { tx: 398, ty: 40 },      // lights up only once the gantry is dead
};
`;
writeFileSync(new URL('../levels/conservatory.js', import.meta.url), out);
console.log(`written: ${W}x${H}, ${rows.reduce((n,r)=>n+r.length,0)} chars`);
