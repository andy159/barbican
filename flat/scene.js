// THE BARBICAN · TYPE 20 FLAT — scene data.
// Built from docs/barbican-flat.md SPEC (Barbican Type 20: 1-bed + study,
// Andrewes/Defoe/Speed/Thomas More House). Units meters, +X east, +Z south,
// +Y up. Origin = center of the entry door in the flat's east wall.
//
// Scene format:
//   box entry: { box:[x0,y0,z0, x1,y1,z1], color:'#rrggbb', solid:true|false }
//     - box is a min/max AABB in world meters
//     - solid:false → rendered but no collision (rugs, balcony, distant view)
//   scene: { sky:{zenith,horizon}, sunDir:[x,y,z] (direction TOWARD the sun),
//            ambient, sunIntensity, boxes:[...], spawn:{pos,yaw,pitch} }
//
// The player stays indoors: every glazing bay of the south window wall has a
// solid 0.15 m spandrel/bottom-rail (taller than the 0.06 m walk-over limit),
// and the entry door is a closed solid — the balcony is view-only.

// ---------------------------------------------------------------- wall helper

/**
 * Emit AABBs for an axis-aligned wall with door/window openings.
 * @param {[number,number]} from  [x,z] start of the wall centerline
 * @param {[number,number]} to    [x,z] end (must share x or z with `from`)
 * @param {number} height         wall height (from y=0)
 * @param {number} thickness      wall thickness (centered on the line)
 * @param {Array}  openings       [{ start, end, bottom=0, top=height }]
 *                                start/end measured in meters from `from`.
 *                                A door (bottom 0) gets a lintel above it;
 *                                a window gets a sill below and lintel above.
 * @param {string} color
 * @returns {Array} box entries
 */
export function wall(from, to, height, thickness, openings = [], color = '#ece7db') {
  const alongX = from[1] === to[1];
  if (!alongX && from[0] !== to[0]) {
    throw new Error('wall(): must be axis-aligned');
  }
  const axisFrom = alongX ? from[0] : from[1];
  const axisTo = alongX ? to[0] : to[1];
  const cross = alongX ? from[1] : from[0];
  const sign = axisTo >= axisFrom ? 1 : -1;
  const len = Math.abs(axisTo - axisFrom);
  const t2 = thickness / 2;
  const boxes = [];

  const emit = (s, e, y0, y1) => {
    if (e - s < 1e-4 || y1 - y0 < 1e-4) return;
    const a = axisFrom + s * sign;
    const b = axisFrom + e * sign;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    boxes.push({
      box: alongX
        ? [lo, y0, cross - t2, hi, y1, cross + t2]
        : [cross - t2, y0, lo, cross + t2, y1, hi],
      color,
      solid: true,
    });
  };

  const ops = [...openings].sort((p, q) => p.start - q.start);
  let cursor = 0;
  for (const o of ops) {
    const bottom = o.bottom ?? 0;
    const top = o.top ?? height;
    emit(cursor, o.start, 0, height);      // solid pier before the opening
    emit(o.start, o.end, 0, bottom);       // sill under a window
    emit(o.start, o.end, top, height);     // lintel over a door/window
    cursor = o.end;
  }
  emit(cursor, len, 0, height);            // remainder of the wall
  return boxes;
}

// ------------------------------------------------------------------- helpers

/** Kährs-style board floor: alternating strips of two browns. */
function parquet(x0, z0, x1, z1, stripW = 0.5) {
  const out = [];
  const cols = ['#b98a52', '#a97e48'];
  let i = 0;
  for (let x = x0; x < x1 - 1e-6; x += stripW, i++) {
    out.push({
      box: [x, -0.08, z0, Math.min(x + stripW, x1), 0, z1],
      color: cols[i % 2],
      solid: true, // top face is y=0; the engine ignores boxes at/under foot level
    });
  }
  return out;
}

const B = (box, color, solid = true) => ({ box, color, solid });

// ------------------------------------------------------------------ palette

const H = 2.5;         // ceiling height (flat slab, no beams)
const EXT = 0.18;      // external / structural wall thickness
const INT = 0.10;      // lightweight internal partition thickness
const WALL = '#f2efe9';    // white plaster
const CEIL = '#f4f0e7';
const FRAME = '#2e2a26';   // dark bronze aluminium
const CONCRETE = '#b5aca0';
const TEAK = '#8a5a33';
const KUNIT = '#efe9dd';   // Brooke Marine off-white fronts
const WHITE = '#f4f2ec';   // sanitary ware / melamine
const QUARRY = '#9e4a3a';  // balcony quarry tile
const YELLOW = '#f7c623';  // the game's Yellow Line — honest home: the front door

const boxes = [];

// ------------------------------------------------------------------- floors
// Room rects tile the L-shaped plan exactly (shared edges, no overlaps).

boxes.push(...parquet(-5.8, 0.8, 2.2, 5.6));      // living + study
boxes.push(...parquet(-2.5, -2.6, 0.0, 0.8));     // hall
boxes.push(...parquet(-5.8, -4.8, -2.5, -0.9));   // bedroom
boxes.push(B([-2.5, -0.08, -4.8, 0.0, 0, -2.6], '#cdc6b8'));   // kitchen lino/tile
boxes.push(B([-5.8, -0.08, -0.9, -2.5, 0, 0.8], '#d7dbd6'));   // bathroom mosaic

// ------------------------------------------------------------------ ceilings

boxes.push(B([-5.89, H, -4.89, 0.09, H + 0.12, 0.8], CEIL));   // north arm
boxes.push(B([-5.89, H, 0.8, 2.29, H + 0.12, 5.67], CEIL));    // south arm
// anodised extract grilles (kitchen + bathroom; no radiators anywhere)
boxes.push(B([-1.6, H - 0.06, -3.7, -1.3, H, -3.55], '#8f9296', false));
boxes.push(B([-4.4, H - 0.06, -0.2, -4.1, H, -0.05], '#8f9296', false));

// -------------------------------------------------------------------- walls
// (ends extended slightly past centerline junctions so corners seal)

// bedroom north wall — window x -5.5..-3.0, sill 0.85, head 2.3
boxes.push(...wall([-5.89, -4.8], [-2.5, -4.8], H, EXT,
  [{ start: 0.39, end: 2.89, bottom: 0.85, top: 2.3 }], WALL));
// kitchen north wall — window x -2.1..-0.4, sill 1.0, head 2.3
boxes.push(...wall([-2.5, -4.8], [0.09, -4.8], H, EXT,
  [{ start: 0.4, end: 2.1, bottom: 1.0, top: 2.3 }], WALL));
// east wall (to the stair/lift landing) — entry door z -0.45..0.45
boxes.push(...wall([0, -4.9], [0, 0.9], H, EXT,
  [{ start: 4.45, end: 5.35, top: 2.0 }], WALL));
// study north + east exterior walls
boxes.push(...wall([0, 0.8], [2.29, 0.8], H, EXT, [], WALL));
boxes.push(...wall([2.2, 0.8], [2.2, 5.67], H, EXT, [], WALL));
// west structural crosswall
boxes.push(...wall([-5.8, 5.67], [-5.8, -4.89], H, EXT, [], WALL));
// bedroom / bathroom partition
boxes.push(...wall([-5.8, -0.9], [-2.5, -0.9], H, INT, [], WALL));
// bedroom east wall — door z -2.2..-1.3
boxes.push(...wall([-2.5, -4.8], [-2.5, -0.9], H, INT,
  [{ start: 2.6, end: 3.5, top: 2.0 }], WALL));
// bathroom east wall — door z -0.5..0.3
boxes.push(...wall([-2.5, -0.9], [-2.5, 0.8], H, INT,
  [{ start: 0.4, end: 1.2, top: 2.0 }], WALL));
// hall / kitchen wall — door x -1.7..-0.8
boxes.push(...wall([-2.5, -2.6], [0, -2.6], H, INT,
  [{ start: 0.8, end: 1.7, top: 2.0 }], WALL));
// hall / living wall — wide cased opening x -2.5..-1.0, head 2.1
boxes.push(...wall([-5.8, 0.8], [0, 0.8], H, INT,
  [{ start: 3.3, end: 4.8, top: 2.1 }], WALL));

// ------------------------------------------- sliding partition (half-open)
// Line x=-1.0 between living and study; slide range z 1.2..5.2. Two white
// full-height panels stacked at the north end; passage open z ~3.2..5.2.

boxes.push(...wall([-1.0, 0.8], [-1.0, 1.2], H, INT, [], WALL));  // north stub
boxes.push(...wall([-1.0, 5.2], [-1.0, 5.6], H, INT, [], WALL));  // south stub
boxes.push(B([-1.05, 2.4, 1.2, -0.95, H, 5.2], WALL));            // track header
boxes.push(B([-1.06, 0, 1.22, -0.97, 2.4, 2.18], '#f6f3ee'));     // stacked panel 1
boxes.push(B([-1.03, 0, 2.20, -0.94, 2.4, 3.18], '#f6f3ee'));     // stacked panel 2

// ---------------------------------------------------- south window wall (z=5.6)
// Full-width floor-to-ceiling glazing: dark aluminium frame, glazing-free bays,
// low plywood spandrel (0..0.15) painted frame-dark, head band 2.4..2.5, dark
// mullions. Vertically-sliding balcony door (closed) at x -2.55..-1.65 — its
// solid bottom rail keeps the player inside.

const WZ0 = 5.53, WZ1 = 5.67;                     // wall thickness band
boxes.push(B([-5.8, 0, WZ0, -2.63, 0.15, WZ1], FRAME));   // spandrel west
boxes.push(B([-1.57, 0, WZ0, 2.2, 0.15, WZ1], FRAME));    // spandrel east
boxes.push(B([-2.55, 0, WZ0, -1.65, 0.15, WZ1], FRAME));  // door bottom rail
boxes.push(B([-5.8, 2.4, WZ0, 2.2, H, WZ1], FRAME));      // head band
// balcony-door jambs (full height) + meeting rail of the counterweighted sash
boxes.push(B([-2.63, 0, WZ0, -2.55, 2.4, WZ1], FRAME));
boxes.push(B([-1.65, 0, WZ0, -1.57, 2.4, WZ1], FRAME));
boxes.push(B([-2.55, 1.14, 5.55, -1.65, 1.21, 5.65], FRAME, false));
// mullions (~1.2-1.3 m bays)
for (const mx of [-4.68, -3.66, -0.35, 0.88]) {
  boxes.push(B([mx - 0.03, 0.15, 5.55, mx + 0.03, 2.4, 5.65], FRAME));
}

// ------------------------------------------------------------- north windows
// dark aluminium frames set in the openings (sill cap, jambs, head)

function windowFrame(xa, xb, sill, head, midMullion = null) {
  const z0 = -4.91, z1 = -4.69;
  boxes.push(B([xa - 0.02, sill - 0.04, z0, xb + 0.02, sill + 0.02, z1], FRAME));
  boxes.push(B([xa - 0.02, sill, z0, xa + 0.06, head, z1], FRAME));
  boxes.push(B([xb - 0.06, sill, z0, xb + 0.02, head, z1], FRAME));
  boxes.push(B([xa - 0.02, head - 0.02, z0, xb + 0.02, head + 0.04, z1], FRAME));
  if (midMullion !== null) {
    boxes.push(B([midMullion - 0.04, sill, z0, midMullion + 0.04, head, z1], FRAME));
  }
}
windowFrame(-5.5, -3.0, 0.85, 2.3, -4.25);  // bedroom
windowFrame(-2.1, -0.4, 1.0, 2.3);          // kitchen

// -------------------------------------------------------------- entry door
// Flush door filling the opening — painted Yellow Line yellow.

boxes.push(B([-0.06, 0, -0.45, 0.04, 2.0, 0.45], YELLOW));
boxes.push(B([-0.11, 1.0, 0.26, -0.06, 1.05, 0.40], '#b9bec2', false)); // lever handle

// ---------------------------------------------------------------- furniture

// living room — mid-century: teak-and-wool sofa, String shelving, teak dining set
boxes.push(B([-5.0, 0, 1.05, -3.0, 0.42, 1.95], '#c98a2e'));            // sofa seat
boxes.push(B([-5.0, 0.42, 1.05, -3.0, 0.75, 1.32], '#b57c28'));         // sofa back
boxes.push(B([-4.9, 0, 2.2, -2.9, 0.02, 3.9], '#a33b2e', false));       // rug (walk-over)
boxes.push(B([-4.05, 0, 2.72, -3.75, 0.30, 2.88], '#6f4527'));          // coffee table base
boxes.push(B([-4.4, 0.30, 2.5, -3.4, 0.36, 3.1], TEAK));                // coffee table top
// String shelving on the west wall
boxes.push(B([-5.71, 0, 1.24, -5.68, 2.0, 1.28], FRAME, false));
boxes.push(B([-5.71, 0, 3.12, -5.68, 2.0, 3.16], FRAME, false));
for (const sy of [0.32, 0.82, 1.32, 1.72]) {
  boxes.push(B([-5.71, sy, 1.2, -5.44, sy + 0.04, 3.2], TEAK));
}
boxes.push(B([-5.69, 0.86, 1.35, -5.50, 1.16, 1.95], '#a33b2e', false)); // books
boxes.push(B([-5.69, 0.86, 2.05, -5.50, 1.12, 2.60], '#3d4f43', false));
boxes.push(B([-5.69, 1.36, 1.50, -5.50, 1.62, 2.20], '#5b6d8f', false));
boxes.push(B([-2.6, 0, 2.6, -1.9, 0.42, 3.3], '#3d4f43'));              // armchair seat
boxes.push(B([-2.6, 0.42, 2.6, -1.9, 0.85, 2.82], '#35453b'));          // armchair back
boxes.push(B([-1.92, 0, 4.68, -1.88, 1.25, 4.72], FRAME));              // floor lamp pole
boxes.push(B([-2.02, 1.25, 4.58, -1.78, 1.52, 4.82], '#e8d9b0', false)); // lamp shade
boxes.push(B([-4.35, 0, 4.45, -3.65, 0.70, 4.75], '#6f4527'));          // dining pedestal
boxes.push(B([-4.6, 0.70, 4.2, -3.4, 0.75, 5.0], TEAK));                // dining top
boxes.push(B([-4.5, 0, 3.8, -4.1, 0.44, 4.2], FRAME));                  // dining chair a
boxes.push(B([-4.5, 0.44, 3.8, -4.1, 0.86, 3.9], FRAME));
boxes.push(B([-3.9, 0, 5.0, -3.5, 0.44, 5.4], FRAME));                  // dining chair b
boxes.push(B([-3.9, 0.44, 5.3, -3.5, 0.86, 5.4], FRAME));

// study (east slice behind the sliding partition)
boxes.push(B([1.5, 0.70, 2.0, 2.15, 0.74, 3.4], TEAK));                 // desk top
boxes.push(B([1.6, 0, 2.15, 2.12, 0.70, 2.55], KUNIT));                 // desk pedestals
boxes.push(B([1.6, 0, 2.85, 2.12, 0.70, 3.25], KUNIT));
boxes.push(B([0.9, 0, 2.45, 1.4, 0.45, 2.9], FRAME));                   // desk chair
boxes.push(B([0.9, 0.45, 2.45, 1.02, 0.90, 2.9], FRAME));
boxes.push(B([-0.6, 0, 0.88, 1.4, 1.9, 1.15], TEAK));                   // bookshelf
boxes.push(B([-0.45, 1.00, 1.15, 0.35, 1.32, 1.19], '#a33b2e', false)); // book spines
boxes.push(B([0.45, 0.55, 1.15, 1.25, 0.90, 1.19], '#5b6d8f', false));
boxes.push(B([-0.45, 1.42, 1.15, 0.30, 1.72, 1.19], '#3d4f43', false));
boxes.push(B([-0.8, 0, 4.4, 1.2, 0.50, 5.3], '#5b6d8f'));               // daybed
boxes.push(B([-0.8, 0.50, 4.4, -0.45, 0.68, 5.3], '#4e5f7e'));          // bolster

// bedroom — low bed, built-in wardrobe wall
// (bed/wardrobe gap widened to 0.6 m so the player can pass; spec was 0.5 m)
boxes.push(B([-5.62, 0, -3.5, -3.65, 0.32, -2.1], TEAK));               // bed base
boxes.push(B([-5.58, 0.32, -3.46, -3.70, 0.55, -2.14], '#e8e2d6'));     // mattress
boxes.push(B([-5.52, 0.55, -3.38, -5.12, 0.65, -2.22], WHITE, false));  // pillow
boxes.push(B([-4.55, 0.55, -3.46, -4.05, 0.60, -2.14], '#c98a2e', false)); // throw
boxes.push(B([-5.6, 0, -1.9, -5.2, 0.50, -1.5], TEAK));                 // bedside table
boxes.push(B([-3.05, 0, -4.7, -2.56, 2.3, -2.9], '#e8e2d6'));           // wardrobe wall
boxes.push(B([-3.07, 0.9, -3.85, -3.05, 1.5, -3.80], FRAME, false));    // handles
boxes.push(B([-3.07, 0.9, -3.75, -3.05, 1.5, -3.70], FRAME, false));

// kitchen — Brooke Marine galley: units + teak worktop, 4-in-a-row hob rings,
// oversized white knobs, double sink with the Garchey receiver cap, pull-out
// breakfast bar, full-height larder
boxes.push(B([-2.45, 0, -4.7, -1.87, 0.85, -2.7], KUNIT));              // base run
boxes.push(B([-2.47, 0.85, -4.72, -1.83, 0.90, -2.68], TEAK));          // worktop
for (const zc of [-2.95, -3.2, -3.45, -3.7]) {
  boxes.push(B([-2.26, 0.90, zc - 0.09, -2.04, 0.916, zc + 0.09], FRAME, false)); // hob ring
  boxes.push(B([-1.83, 0.76, zc - 0.03, -1.79, 0.82, zc + 0.03], WHITE, false));  // knob
}
boxes.push(B([-2.30, 0.90, -4.52, -1.98, 0.925, -3.96], '#b9bec2', false)); // sink
boxes.push(B([-2.18, 0.925, -4.28, -2.10, 0.955, -4.20], '#d7dde0', false)); // Garchey cap
boxes.push(B([-1.87, 0.78, -3.05, -1.55, 0.83, -2.78], TEAK));          // breakfast bar
boxes.push(B([-2.45, 1.5, -4.7, -2.15, 2.1, -2.95], KUNIT, false));     // wall cabinets
boxes.push(B([-0.65, 0, -4.7, -0.09, 2.2, -2.7], KUNIT));               // larder

// hall
boxes.push(B([-0.55, 0, -2.5, -0.09, 2.2, -1.6], '#e8e2d6'));           // coat cupboard

// bathroom (internal, no window) — white ware, airing cupboard
boxes.push(B([-5.71, 0, -0.85, -4.05, 0.55, -0.15], WHITE));            // bathtub
boxes.push(B([-5.71, 0, 0.25, -5.25, 0.85, 0.72], WHITE));              // basin
boxes.push(B([-4.55, 0, 0.25, -4.25, 0.42, 0.58], WHITE));              // wc pan
boxes.push(B([-4.65, 0.42, 0.55, -4.15, 0.80, 0.75], WHITE));           // cistern
boxes.push(B([-3.3, 0, -0.85, -2.55, 2.2, -0.5], '#e8e2d6'));           // airing cupboard
boxes.push(B([-5.71, 1.05, 0.28, -5.69, 1.65, 0.70], '#aab4bd', false)); // mirror

// ------------------------------------------------------------------ balcony
// Full-frontage, 1.7 m deep: quarry tile floor, chamfered precast concrete
// front panel, flower boxes, between concrete crosswall fins. View-only.

boxes.push(B([-5.8, -0.08, 5.67, 2.2, 0, 7.3], QUARRY, false));         // quarry floor
boxes.push(B([-5.8, -0.5, 7.3, 2.2, 1.02, 7.44], CONCRETE, false));     // front panel
boxes.push(B([-5.8, 1.02, 7.32, 2.2, 1.10, 7.42], '#c2bab0', false));   // chamfer cap
boxes.push(B([-5.98, -0.5, 5.53, -5.8, H, 7.44], CONCRETE, false));     // west fin
boxes.push(B([2.2, -0.5, 5.53, 2.38, H, 7.44], CONCRETE, false));       // east fin
boxes.push(B([-5.98, H, 5.53, 2.38, H + 0.22, 7.48], CONCRETE, false)); // soffit above
// flower boxes on the front panel, blooms spilling over
boxes.push(B([-5.5, 0.86, 7.10, -3.5, 1.18, 7.32], '#c4443f', false));  // planter west
boxes.push(B([-5.35, 1.18, 7.12, -4.95, 1.36, 7.30], '#e58ea0', false));
boxes.push(B([-4.75, 1.18, 7.12, -4.35, 1.32, 7.30], WHITE, false));
boxes.push(B([-4.15, 1.18, 7.12, -3.65, 1.34, 7.30], '#d95555', false));
boxes.push(B([-0.5, 0.86, 7.10, 1.5, 1.18, 7.32], '#c4443f', false));   // planter east
boxes.push(B([-0.35, 1.18, 7.12, 0.05, 1.34, 7.30], '#e58ea0', false));
boxes.push(B([0.25, 1.18, 7.12, 0.65, 1.36, 7.30], '#d95555', false));
boxes.push(B([0.85, 1.18, 7.12, 1.35, 1.32, 7.30], WHITE, false));
boxes.push(B([-2.8, 0, 6.2, -2.2, 0.40, 6.8], FRAME, false));           // balcony chair
boxes.push(B([-2.8, 0.40, 6.68, -2.2, 0.85, 6.8], FRAME, false));

// -------------------------------------------------- the view south (the estate)
// Lake with fountains, gardens, St Giles' Cripplegate, the three towers in haze.

boxes.push(B([-60, -4.3, 10, 60, -4.0, 90], '#7d9a63', false));         // gardens/podium
boxes.push(B([-24, -4.0, 16, 34, -3.92, 42], '#7fa8b8', false));        // the lake
boxes.push(B([-2.0, -3.92, 26, -1.7, -1.6, 26.3], '#e9f1f4', false));   // fountain jets
boxes.push(B([3.0, -3.92, 29, 3.3, -2.0, 29.3], '#e9f1f4', false));
boxes.push(B([-8.0, -3.92, 30, -7.7, -2.2, 30.3], '#e9f1f4', false));
boxes.push(B([-14, -4, 32, -6, 0.5, 38], '#9b8a76', false));            // St Giles' body
boxes.push(B([-13.6, -4, 33, -11.8, 7, 34.8], '#a89684', false));       // church tower
boxes.push(B([-13.2, 7, 33.4, -12.2, 8.4, 34.4], '#6f655a', false));    // turret cap
boxes.push(B([8, -4, 36, 30, 3.5, 40], '#8f8a80', false));              // terrace block
boxes.push(B([-32, -4, 50, -24, 34, 55], '#5f6a7c', false));            // the three towers
boxes.push(B([-7, -4, 58, 3, 40, 64], '#596374', false));
boxes.push(B([15, -4, 48, 23, 31, 52], '#646f81', false));

// ------------------------------------------- the view north (kitchen/bedroom)
// Concrete crosswall of the neighbouring bay + podium; galvanised steel grille
// of the escape balcony above the kitchen window (documented daylight detail).

boxes.push(B([-12, -4, -8.6, 6, 5.5, -8.0], '#b0a89c', false));         // crosswall
boxes.push(B([-40, -4.4, -30, 30, -4.2, -6.5], '#a8a79e', false));      // podium
boxes.push(B([-5.9, 2.46, -6.45, 0.1, 2.62, -6.30], '#9aa0a2', false)); // grille edge beam
for (let gx = -5.7; gx < -0.2; gx += 0.28) {
  boxes.push(B([gx, 2.52, -6.3, gx + 0.07, 2.6, -4.95], '#9aa0a2', false));
}

// -------------------------------------------------------------------- scene

export const scene = {
  sky: { zenith: '#7fb2e0', horizon: '#e3ebef' },
  sunDir: [0.25, 0.8, 0.5],   // toward the sun: high, south — floods the window wall
  ambient: 0.66,
  sunIntensity: 0.5,
  boxes,
  // entry hall, just inside the yellow front door, facing the living room opening
  spawn: { pos: [-0.7, 0, 0.05], yaw: -2.19, pitch: 0 },
};
