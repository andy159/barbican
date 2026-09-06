/* Generates levels/artscentre.js — "The Arts Centre", level 2.
   Run: node tools/gen-artscentre.mjs   (rewrites the level module)

   Interior route: foyer → Barbican Theatre (stalls → orchestra-pit jump
   → stage → fly-bar ascent of the flytower → the grid → drop down the
   far side) → backstage dock (DASH pickup) → Martini Bar (breather +
   secret cellar under the counter, marked by scuffed line) → Cinema 1
   (dash-gated gaps over dark voids, Mothlight on screen) → way out.

   Tile legend: '#' solid, '=' carpet + Yellow Line, '-' scuffed line
   (solid; marks the secret), 'F' fly bar / steel (solid, thin),
   's' seat row (decor, non-solid), '*' dash pickup (non-solid),
   'B' bench (checkpoint), 'E' exit (non-solid), 'P' spawn.
   Physics envelope (fixed): jump ≤3 tile rises, ≤6 tile gaps without
   dash, 8-9 with; same-column ledges <7 rows above a takeoff bonk. */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 360, H = 56;
const grid = Array.from({ length: H }, () => Array(W).fill(' '));

/* conflict-checking setter: refuses to silently overwrite geometry */
function set(x, y, ch){
  if(x < 0 || x >= W || y < 0 || y >= H) throw new Error(`out of bounds (${x},${y})`);
  const cur = grid[y][x];
  if(cur !== ' ' && cur !== ch) throw new Error(`conflict at (${x},${y}): '${cur}' vs '${ch}'`);
  grid[y][x] = ch;
}
const hLine = (x0, x1, y, ch) => { for(let x = x0; x <= x1; x++) set(x, y, ch); };
const vLine = (x, y0, y1, ch) => { for(let y = y0; y <= y1; y++) set(x, y, ch); };
const rect  = (x0, y0, x1, y1, ch) => { for(let y = y0; y <= y1; y++) hLine(x0, x1, y, ch); };
/* a floor: surface row of `top` char + 3 rows of '#' fill */
const floor = (x0, x1, y, top = '#') => { hLine(x0, x1, y, top); rect(x0, y+1, x1, Math.min(H-1, y+3), '#'); };

/* ---------------- FOYER (0..59) — level 3, carpet + columns ---------------- */
floor(0, 24, 46, '=');            // carpet, Yellow Line runs indoors
/* lightwell void: cols 25..28 (4-gap, run-jumpable, death below) */
floor(29, 45, 46, '=');
floor(46, 52, 44, '=');           // raised landing (+2)
rect(46, 47, 52, 49, '#');        // landing legs down to floor depth
floor(53, 58, 46, '=');
hLine(0, 58, 36, '#');            // coffered ceiling slab
vLine(59, 34, 41, '#');           // wall to theatre, doorway rows 42..45
set(3, 44, 'P');
set(7, 45, 'B');                  // bench 1

/* ---------------- THEATRE STALLS (60..88) ---------------- */
floor(60, 66, 46, '=');           // aisle in from the foyer
floor(67, 69, 47); hLine(67, 69, 46, 's');
floor(70, 72, 48); hLine(70, 72, 47, 's');
floor(73, 75, 49); hLine(73, 75, 48, 's');
floor(76, 84, 50); hLine(76, 81, 49, 's');   // front stalls; 82..84 clear runway
hLine(60, 88, 34, '#');           // auditorium ceiling
/* orchestra pit: cols 85..90 open to the void (death) */

/* ---------------- FLYTOWER (89..130) ---------------- */
rect(89, 2, 90, 42, '#');         // proscenium wall (stage opening 43..49 below)
rect(120, 11, 121, 55, '#');      // upstage tower wall
hLine(89, 130, 2, '#');           // tower cap
floor(91, 119, 50);               // the stage deck
set(92, 49, 'B');                 // bench 2, on stage past the pit
/* fly bars — the ascent (rises of 3, edge gaps ≤2, no bonk overlaps) */
hLine( 93,  97, 47, 'F');
hLine(100, 104, 44, 'F');
hLine(107, 111, 41, 'F');
hLine(113, 117, 38, 'F');
rect(114, 23, 115, 34, '#');      // hanging counterweight column
/* wall-jump channel is cols 116..119 between column and tower wall */
hLine(107, 115, 22, 'F');         // gallery bar caps the column at channel exit
hLine(100, 105, 19, 'F');
hLine( 94,  99, 16, 'F');
hLine( 91,  93, 13, 'F');
hLine( 96, 126, 10, 'F');         // the grid: catwalk over the tower wall
/* gap at 127..128 — step off the end into the descent channel */
/* far-side descent channel (122..128): long drop, two rest bars
   (≥2-tile gaps to both walls — a 1-tile gap traps the 8px player) */
hLine(124, 125, 21, 'F');
hLine(124, 126, 33, 'F');
rect(129, 2, 130, 41, '#');       // outer wall; doorway rows 42..45 to the dock

/* ---------------- BACKSTAGE DOCK (122..168) ---------------- */
floor(122, 168, 46);              // concrete dock floor (channel base included)
hLine(131, 167, 38, '#');         // low corridor ceiling
set(158, 45, '*');                // THE DASH PICKUP — on the walking line
vLine(168, 36, 41, '#');          // wall to the bar, doorway rows 42..45

/* ---------------- MARTINI BAR (169..212) — breather ---------------- */
floor(169, 185, 46, '=');         // the Line leads straight to the bar
/* drop shaft behind the counter: cols 186..189 (secret way down) */
floor(190, 210, 46, '=');
hLine(178, 185, 44, '-');         // counter top: scuffed line marks the secret
hLine(178, 185, 45, '#');         // counter body
set(172, 45, 'B');                // bench 3
hLine(169, 210, 36, '#');         // bar ceiling
/* cellar: solid block under the bar with a cavity, floor row 54 */
for(let y = 50; y <= 55; y++)
  for(let x = 169; x <= 210; x++)
    if(!(y <= 53 && x >= 181 && x <= 194)) set(x, y, '#');
rect(211, 30, 212, 41, '#');      // wall to the cinema, doorway rows 42..45

/* ---------------- CINEMA 1 (213..322) — dash-gated, sunken ---------------- */
hLine(213, 320, 30, '#');         // high dark ceiling
floor(213, 224, 46);              // entry platform, level -2
set(216, 45, 'B');                // bench 4 — last checkpoint
/* gap 1: 225..233 (9) over the void */
floor(234, 248, 47); hLine(236, 246, 46, 's');
/* gap 2: 249..257 (9) */
floor(258, 272, 48); hLine(260, 270, 47, 's');
/* gap 3: 273..280 (8) */
floor(281, 320, 48); hLine(283, 293, 47, 's');   // front rows before the screen
rect(321, 30, 322, 43, '#');      // wall to the way out, doorway rows 44..47

/* ---------------- WAY OUT (321..359) ---------------- */
hLine(321, 322, 48, '#');
floor(323, 359, 48, '=');         // the Line resumes, pointing at daylight
hLine(323, 359, 40, '#');
rect(348, 44, 349, 47, 'E');      // exit — loops back to the estate route

/* ---------------- emit the module ---------------- */
const rows = grid.map(r => r.join('').replace(/ +$/, ''));

const banner = `/* The Arts Centre — GENERATED by tools/gen-artscentre.mjs; edit that
   script and re-run it rather than hand-editing this file.
   Interior palette break: dark concrete, rust-orange carpet, brass,
   red theatre seats, the Mothlight screen. Rendered by src/interior.js.
   Route: foyer → stalls → pit jump → stage → fly-bar ascent → grid →
   drop to the dock → DASH pickup → Martini Bar (+ cellar secret) →
   Cinema 1 dash gaps → way out. Run tools/verify-physics.js after
   regenerating. */`;

const data = {
  id: 'arts-centre',
  interior: true,
  planters: [[14,46],[44,46],[49,44],[191,54],[330,48]],
  signs: [
    { tx: 5,   ty: 44, text: 'BARBICAN CENTRE' },
    { tx: 16,  ty: 44, text: 'LEVEL 3' },
    { tx: 23,  ty: 44, text: 'THEATRE →' },
    { tx: 31,  ty: 44, text: 'MARTINI BAR →' },
    { tx: 41,  ty: 44, text: 'CINEMA 1 ↓' },
    { tx: 61,  ty: 44, text: 'STALLS' },
    { tx: 77,  ty: 48, text: 'ORCHESTRA PIT' },
    { tx: 98,  ty: 48, text: 'FLY GALLERY ↑' },
    { tx: 100, ty: 7,  text: 'THE GRID' },
    { tx: 134, ty: 44, text: 'DOCK →' },
    { tx: 152, ty: 44, text: 'PROPS STORE' },
    { tx: 170, ty: 42, text: 'MARTINI BAR' },
    { tx: 183, ty: 52, text: 'CELLAR' },
    { tx: 215, ty: 43, text: 'CINEMA 1' },
    { tx: 222, ty: 43, text: 'LEVEL -2' },
    { tx: 338, ty: 46, text: 'WAY OUT →' },
  ],
  /* zones drive the interior skins/dressing in src/interior.js */
  zones: [
    { x0: 0,   x1: 59,  type: 'foyer',     floor: 46, ceil: 36 },
    { x0: 60,  x1: 88,  type: 'stalls',    floor: 50, ceil: 34 },
    { x0: 89,  x1: 130, type: 'flytower',  floor: 50, ceil: 2  },
    { x0: 131, x1: 168, type: 'backstage', floor: 46, ceil: 38 },
    { x0: 169, x1: 212, type: 'bar',       floor: 46, ceil: 36 },
    { x0: 213, x1: 322, type: 'cinema',    floor: 48, ceil: 30 },
    { x0: 323, x1: 359, type: 'exit',      floor: 48, ceil: 40 },
  ],
  props: [
    { type: 'curtain',   tx: 91,  y0: 3,  y1: 26 },            // safety curtain, half raised
    { type: 'projector', tx: 215, ty: 36 },
    { type: 'poster',    x0: 205, y0: 38, x1: 208, y1: 44 },   // MOTHLIGHT one-sheet
    { type: 'screen',    x0: 300, y0: 32, x1: 317, y1: 47 },   // MOTHLIGHT plays here
  ],
};

const body =
`${banner}
export const ARTSCENTRE = {
  id: ${JSON.stringify(data.id)},
  interior: true,
  tiles: [
${rows.map(r => JSON.stringify(r) + ',').join('\n')}
  ],
  planters: ${JSON.stringify(data.planters)},
  signs: [
${data.signs.map(s => `    { tx: ${s.tx}, ty: ${s.ty}, text: ${JSON.stringify(s.text)} },`).join('\n')}
  ],
  zones: [
${data.zones.map(z => `    { x0: ${z.x0}, x1: ${z.x1}, type: ${JSON.stringify(z.type)}, floor: ${z.floor}, ceil: ${z.ceil} },`).join('\n')}
  ],
  props: [
${data.props.map(p => '    ' + JSON.stringify(p) + ',').join('\n')}
  ],
};
`;

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'levels', 'artscentre.js');
writeFileSync(out, body);
console.log(`wrote ${out} (${W}x${H}, ${rows.length} rows)`);
