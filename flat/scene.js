// THE BARBICAN · TYPE 20 FLAT — scene data.
// Architecture from docs/barbican-flat.md SPEC; furnishing from the 55-item
// manifest and the layered window-view spec in docs/flat-furnishing.md.
// Units meters, +X east, +Z south, +Y up. Origin = center of the entry door.
//
// Scene format:
//   box entry: { box:[x0,y0,z0, x1,y1,z1], color:'#rrggbb', solid:true|false }
//   scene.interactables: openable drawers/doors + the Arts Centre key
//     openable: { id, name, box (moving front, closed), color, dir:[dx,dy,dz]
//                 (slide when open), reveal:[{box,color}] (shown when open) }
//     item:     { id, item:true, label, parent (openable id), box, color,
//                 message, store (localStorage key), mark (HUD marker) }
//
// The player stays indoors: every glazing bay of the south window wall has a
// solid 0.15 m spandrel/bottom-rail, and the entry door is a closed solid.

// ---------------------------------------------------------------- wall helper

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
    emit(cursor, o.start, 0, height);
    emit(o.start, o.end, 0, bottom);
    emit(o.start, o.end, top, height);
    cursor = o.end;
  }
  emit(cursor, len, 0, height);
  return boxes;
}

// ------------------------------------------------------------------- helpers

function parquet(x0, z0, x1, z1, stripW = 0.5) {
  const out = [];
  const cols = ['#b98a52', '#a97e48'];
  let i = 0;
  for (let x = x0; x < x1 - 1e-6; x += stripW, i++) {
    out.push({
      box: [x, -0.08, z0, Math.min(x + stripW, x1), 0, z1],
      color: cols[i % 2],
      solid: true,
    });
  }
  return out;
}

const B = (box, color, solid = true) => ({ box, color, solid });

// ------------------------------------------------------------------ palette

const H = 2.5;
const EXT = 0.18;
const INT = 0.10;
const WALL = '#f2efe9';
const CEIL = '#f4f0e7';
const FRAME = '#2e2a26';
const CONCRETE = '#b5aca0';
const TEAK = '#8a5a33';
const ROSEWOOD = '#4e2a1e';
const OAT = '#d8cfc0';
const ORANGE = '#c1502e';
const MUSTARD = '#d9a521';
const OLIVE = '#3d4f43';
const LEATHER = '#1e1c1a';
const CHROME = '#c9ced2';
const OAK = '#c8b590';
const KUNIT = '#efe9dd';
const WHITE = '#f4f2ec';
const PENGUIN = '#e8622d';
const QUARRY = '#9e4a3a';
const YELLOW = '#f7c623';

const boxes = [];

// ------------------------------------------------------------------- floors

boxes.push(...parquet(-5.8, 0.8, 2.2, 5.6));      // living + study
boxes.push(...parquet(-2.5, -2.6, 0.0, 0.8));     // hall
boxes.push(...parquet(-5.8, -4.8, -2.5, -0.9));   // bedroom
boxes.push(B([-2.5, -0.08, -4.8, 0.0, 0, -2.6], '#cdc6b8'));   // kitchen
boxes.push(B([-5.8, -0.08, -0.9, -2.5, 0, 0.8], '#d7dbd6'));   // bathroom

// ------------------------------------------------------------------ ceilings

boxes.push(B([-5.89, H, -4.89, 0.09, H + 0.12, 0.8], CEIL));
boxes.push(B([-5.89, H, 0.8, 2.29, H + 0.12, 5.67], CEIL));
boxes.push(B([-1.6, H - 0.06, -3.7, -1.3, H, -3.55], '#8f9296', false)); // extract grilles
boxes.push(B([-4.4, H - 0.06, -0.2, -4.1, H, -0.05], '#8f9296', false));

// -------------------------------------------------------------------- walls

boxes.push(...wall([-5.89, -4.8], [-2.5, -4.8], H, EXT,
  [{ start: 0.39, end: 2.89, bottom: 0.85, top: 2.3 }], WALL));  // bedroom N + window
boxes.push(...wall([-2.5, -4.8], [0.09, -4.8], H, EXT,
  [{ start: 0.4, end: 2.1, bottom: 1.0, top: 2.3 }], WALL));     // kitchen N + window
boxes.push(...wall([0, -4.9], [0, 0.9], H, EXT,
  [{ start: 4.45, end: 5.35, top: 2.0 }], WALL));                // east + entry door
boxes.push(...wall([0, 0.8], [2.29, 0.8], H, EXT, [], WALL));    // study N
boxes.push(...wall([2.2, 0.8], [2.2, 5.67], H, EXT, [], WALL));  // study E
boxes.push(...wall([-5.8, 5.67], [-5.8, -4.89], H, EXT, [], WALL)); // west crosswall
boxes.push(...wall([-5.8, -0.9], [-2.5, -0.9], H, INT, [], WALL));  // bed/bath
boxes.push(...wall([-2.5, -4.8], [-2.5, -0.9], H, INT,
  [{ start: 2.6, end: 3.5, top: 2.0 }], WALL));                  // bedroom door
boxes.push(...wall([-2.5, -0.9], [-2.5, 0.8], H, INT,
  [{ start: 0.4, end: 1.2, top: 2.0 }], WALL));                  // bathroom door
boxes.push(...wall([-2.5, -2.6], [0, -2.6], H, INT,
  [{ start: 0.8, end: 1.7, top: 2.0 }], WALL));                  // hall/kitchen door
boxes.push(...wall([-5.8, 0.8], [0, 0.8], H, INT,
  [{ start: 3.3, end: 4.8, top: 2.1 }], WALL));                  // hall/living opening

// sliding partition, half-open
boxes.push(...wall([-1.0, 0.8], [-1.0, 1.2], H, INT, [], WALL));
boxes.push(...wall([-1.0, 5.2], [-1.0, 5.6], H, INT, [], WALL));
boxes.push(B([-1.05, 2.4, 1.2, -0.95, H, 5.2], WALL));
boxes.push(B([-1.06, 0, 1.22, -0.97, 2.4, 2.18], '#f6f3ee'));
boxes.push(B([-1.03, 0, 2.20, -0.94, 2.4, 3.18], '#f6f3ee'));

// ---------------------------------------------------- south window wall (z=5.6)

const WZ0 = 5.53, WZ1 = 5.67;
boxes.push(B([-5.8, 0, WZ0, -2.63, 0.15, WZ1], FRAME));   // spandrel west
boxes.push(B([-1.57, 0, WZ0, 2.2, 0.15, WZ1], FRAME));    // spandrel east
boxes.push(B([-2.55, 0, WZ0, -1.65, 0.15, WZ1], FRAME));  // balcony-door bottom rail
boxes.push(B([-5.8, 2.4, WZ0, 2.2, H, WZ1], FRAME));      // head band
boxes.push(B([-2.63, 0, WZ0, -2.55, 2.4, WZ1], FRAME));   // door jambs
boxes.push(B([-1.65, 0, WZ0, -1.57, 2.4, WZ1], FRAME));
boxes.push(B([-2.55, 1.14, 5.55, -1.65, 1.21, 5.65], FRAME, false)); // meeting rail
for (const mx of [-4.68, -3.66, -0.35, 0.88]) {
  boxes.push(B([mx - 0.03, 0.15, 5.55, mx + 0.03, 2.4, 5.65], FRAME)); // mullions
}

// north window frames
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
windowFrame(-5.5, -3.0, 0.85, 2.3, -4.25);
windowFrame(-2.1, -0.4, 1.0, 2.3);

// entry door — Yellow Line yellow
boxes.push(B([-0.06, 0, -0.45, 0.04, 2.0, 0.45], YELLOW));
boxes.push(B([-0.11, 1.0, 0.26, -0.06, 1.05, 0.40], '#b9bec2', false));

// ================================================================== FURNITURE

// ---- hall: Hang-It-All, slat bench + shoes, wayfinding print, runner
boxes.push(B([-2.3, 0.015, -0.3, -0.4, 0.03, 0.42], '#6b6b3a', false)); // runner
boxes.push(B([-0.51, 0.26, -2.35, -0.09, 0.32, -1.45], TEAK));          // bench slats
boxes.push(B([-0.47, 0, -2.28, -0.13, 0.05, -1.52], '#6f4527'));        // bench rail
boxes.push(B([-0.42, 0, -2.2, -0.16, 0.12, -1.98], LEATHER, false));    // shoes
boxes.push(B([-0.42, 0, -1.9, -0.16, 0.1, -1.7], '#5c3226', false));
boxes.push(B([-0.10, 1.5, -1.28, -0.08, 1.56, -0.78], '#e8e4da', false)); // Hang-It-All rail
boxes.push(B([-0.13, 1.46, -1.24, -0.08, 1.52, -1.18], '#c93b47', false)); // ball hooks
boxes.push(B([-0.13, 1.46, -1.08, -0.08, 1.52, -1.02], MUSTARD, false));
boxes.push(B([-0.13, 1.46, -0.92, -0.08, 1.52, -0.86], '#5b6d8f', false));
boxes.push(B([-0.12, 0.95, -1.1, -0.08, 1.48, -0.98], YELLOW, false));  // yellow scarf
boxes.push(B([-2.45, 1.15, -1.6, -2.43, 1.85, -1.1], '#3a3a38', false)); // signage print
boxes.push(B([-2.43, 1.62, -1.55, -2.425, 1.78, -1.15], YELLOW, false));
boxes.push(B([-2.43, 1.3, -1.55, -2.425, 1.5, -1.15], WHITE, false));

// ---- living: Hille sofa (west wall), String shelving, rug, coffee table,
//      Eames lounge + ottoman, G-Plan sideboard w/ Braun SK6, dining set + PH5
// Hille sofa — oatmeal wool on low teak rail
boxes.push(B([-5.71, 0, 1.15, -4.86, 0.12, 3.1], TEAK));
boxes.push(B([-5.71, 0.12, 1.15, -4.86, 0.45, 3.1], OAT));
boxes.push(B([-5.71, 0.45, 1.15, -5.42, 0.75, 3.1], '#cfc4b2'));
// (the mustard screenprint moved to the study — the Finnish paintings section
//  below hangs Lake Keitele over the sofa instead)
// String shelving 2-bay, white ladders + teak shelves
boxes.push(B([-5.71, 0, 3.42, -5.68, 2.0, 3.46], '#e8e4da', false));
boxes.push(B([-5.71, 0, 4.18, -5.68, 2.0, 4.22], '#e8e4da', false));
boxes.push(B([-5.71, 0, 4.94, -5.68, 2.0, 4.98], '#e8e4da', false));
for (const sy of [0.32, 0.82, 1.32, 1.72]) {
  boxes.push(B([-5.71, sy, 3.44, -5.44, sy + 0.04, 4.96], '#9a6a3c'));
}
boxes.push(B([-5.68, 0.86, 3.52, -5.47, 1.12, 4.12], PENGUIN, false));  // Penguin run
boxes.push(B([-5.68, 0.86, 4.24, -5.47, 1.08, 4.78], OLIVE, false));
boxes.push(B([-5.66, 1.36, 3.55, -5.52, 1.62, 3.7], '#9c5038', false)); // pottery trio
boxes.push(B([-5.66, 1.36, 3.8, -5.5, 1.56, 3.95], OAT, false));
boxes.push(B([-5.66, 1.36, 4.05, -5.54, 1.66, 4.18], '#9c5038', false));
boxes.push(B([-5.67, 1.76, 4.3, -5.5, 1.9, 4.6], '#ece8e0', false));    // Rams radio
// rya rug + coffee table + Penguin stack
boxes.push(B([-4.5, 0, 2.35, -2.5, 0.025, 3.75], ORANGE, false));
boxes.push(B([-4.3, 0, 2.75, -4.22, 0.28, 3.25], TEAK));
boxes.push(B([-3.28, 0, 2.75, -3.2, 0.28, 3.25], TEAK));
boxes.push(B([-4.35, 0.28, 2.7, -3.15, 0.34, 3.3], TEAK));
boxes.push(B([-3.6, 0.34, 2.9, -3.44, 0.42, 3.12], PENGUIN, false));
boxes.push(B([-3.58, 0.42, 2.92, -3.46, 0.47, 3.1], WHITE, false));
// Eames lounge chair + ottoman
boxes.push(B([-2.6, 0, 2.5, -1.76, 0.4, 3.35], LEATHER));               // seat
boxes.push(B([-2.6, 0.4, 2.5, -1.76, 0.62, 2.78], ROSEWOOD));           // back shell
boxes.push(B([-2.56, 0.62, 2.52, -1.8, 0.95, 2.72], LEATHER));          // headrest
boxes.push(B([-2.5, 0, 3.5, -1.95, 0.24, 4.05], ROSEWOOD));             // ottoman base
boxes.push(B([-2.5, 0.24, 3.5, -1.95, 0.4, 4.05], LEATHER));
// G-Plan sideboard on north wall (carcass rear solid; doors are interactable)
boxes.push(B([-4.7, 0.12, 0.87, -2.7, 0.75, 1.13], TEAK));              // carcass
boxes.push(B([-4.66, 0, 0.9, -4.58, 0.12, 1.28], '#6f4527'));           // legs
boxes.push(B([-2.82, 0, 0.9, -2.74, 0.12, 1.28], '#6f4527'));
boxes.push(B([-4.72, 0.75, 0.85, -2.68, 0.79, 1.35], TEAK));            // top
boxes.push(B([-4.35, 0.79, 0.92, -3.77, 0.94, 1.21], '#ece8e0', false)); // Braun SK6
boxes.push(B([-4.35, 0.94, 0.92, -3.77, 0.99, 1.21], '#dfe5e8', false)); // perspex lid
boxes.push(B([-3.5, 0.79, 0.95, -3.05, 0.83, 1.25], CHROME, false));    // drinks tray
boxes.push(B([-3.4, 0.83, 1.02, -3.28, 1.05, 1.14], '#7a5a38', false)); // decanter
boxes.push(B([-3.2, 0.83, 1.05, -3.12, 0.95, 1.13], CHROME, false));    // glasses
boxes.push(B([-4.98, 0, 0.88, -4.63, 0.35, 1.21], LEATHER));            // LP crate
boxes.push(B([-4.95, 0.35, 0.91, -4.66, 0.4, 1.18], ORANGE, false));    // sleeve tops
boxes.push(B([-4.6, 0.02, 1.31, -4.34, 0.36, 1.34], ORANGE, false));    // propped sleeve
// round teak dining table + 4 wishbone chairs + PH5 pendant
boxes.push(B([-4.15, 0, 4.45, -3.85, 0.69, 4.75], '#6f4527'));          // pedestal
boxes.push(B([-4.55, 0.69, 4.05, -3.45, 0.73, 5.15], TEAK));            // top
function wishbone(x0, z0, backSide) {
  boxes.push(B([x0, 0, z0, x0 + 0.42, 0.44, z0 + 0.42], OAK));
  const b = 0.08;
  if (backSide === 'n') boxes.push(B([x0, 0.44, z0, x0 + 0.42, 0.76, z0 + b], OAK));
  if (backSide === 's') boxes.push(B([x0, 0.44, z0 + 0.42 - b, x0 + 0.42, 0.76, z0 + 0.42], OAK));
  if (backSide === 'w') boxes.push(B([x0, 0.44, z0, x0 + b, 0.76, z0 + 0.42], OAK));
  if (backSide === 'e') boxes.push(B([x0 + 0.42 - b, 0.44, z0, x0 + 0.42, 0.76, z0 + 0.42], OAK));
}
wishbone(-4.21, 3.6, 'n');
wishbone(-4.21, 5.18, 's');
wishbone(-4.97, 4.39, 'w');
wishbone(-3.45, 4.39, 'e');
boxes.push(B([-4.02, 2.02, 4.58, -3.98, 2.5, 4.62], FRAME, false));     // PH5 flex
boxes.push(B([-4.14, 1.9, 4.46, -3.86, 2.02, 4.74], '#ece8e0', false)); // top shade
boxes.push(B([-4.25, 1.78, 4.35, -3.75, 1.9, 4.85], '#ece8e0', false)); // main shade
boxes.push(B([-4.18, 1.74, 4.42, -3.82, 1.78, 4.78], '#c93b47', false)); // red inner
// monstera in the window corner + Aalto stools
boxes.push(B([-5.55, 0, 5.08, -5.15, 0.35, 5.48], '#b8674a'));          // terracotta pot
boxes.push(B([-5.45, 0.35, 5.18, -5.25, 0.75, 5.38], '#3a5c2c', false)); // stems
boxes.push(B([-5.66, 0.7, 4.95, -5.05, 1.35, 5.5], '#4f8a3d', false));  // leaf mass
boxes.push(B([-5.4, 1.05, 5.0, -4.95, 1.3, 5.3], '#5f9c48', false));
boxes.push(B([-3.0, 0, 5.05, -2.62, 0.42, 5.43], '#d9c49a'));           // stool pair
boxes.push(B([-2.98, 0.42, 5.07, -2.64, 0.48, 5.41], LEATHER, false));  // black seat

// ---- study: teak desk + DSW, Anglepoise, red Olivetti, Penguin wall,
//      studio daybed, plan chest, rubber plant
boxes.push(B([1.46, 0.69, 2.2, 2.11, 0.73, 3.5], TEAK));                // desk top
boxes.push(B([1.6, 0, 2.24, 2.09, 0.69, 2.56], TEAK));                  // pedestals
boxes.push(B([1.6, 0, 3.14, 2.09, 0.69, 3.46], TEAK));
boxes.push(B([1.6, 0.73, 2.85, 1.94, 0.85, 3.2], '#c93b47', false));    // Olivetti Valentine
boxes.push(B([1.66, 0.85, 2.95, 1.88, 0.98, 2.97], WHITE, false));      // paper in platen
boxes.push(B([1.82, 0.73, 2.42, 1.94, 0.78, 2.54], LEATHER, false));    // Anglepoise base
boxes.push(B([1.86, 0.78, 2.45, 1.9, 1.06, 2.5], LEATHER, false));      // arm
boxes.push(B([1.72, 1.02, 2.4, 1.88, 1.1, 2.55], LEATHER, false));      // shade
boxes.push(B([0.95, 0, 2.6, 1.42, 0.44, 3.15], MUSTARD));               // Eames DSW seat
boxes.push(B([0.95, 0.44, 2.6, 1.07, 0.81, 3.15], MUSTARD));            // shell back
// Penguin book wall on study north wall
boxes.push(B([-0.3, 0, 0.88, 1.5, 1.9, 1.1], '#9a6a3c'));               // shelf carcass
boxes.push(B([-0.25, 0.15, 1.1, 1.45, 0.42, 1.13], PENGUIN, false));    // spine rows
boxes.push(B([-0.25, 0.55, 1.1, 1.45, 0.82, 1.13], OLIVE, false));
boxes.push(B([-0.25, 0.95, 1.1, 1.45, 1.22, 1.13], PENGUIN, false));
boxes.push(B([-0.25, 1.35, 1.1, 1.45, 1.62, 1.13], '#5b6d8f', false));
// studio daybed under the study window
boxes.push(B([-0.75, 0, 4.72, 1.15, 0.18, 5.42], TEAK));                // frame
boxes.push(B([-0.75, 0.18, 4.72, 1.15, 0.5, 5.42], OLIVE));             // cushions
boxes.push(B([-0.75, 0.5, 4.72, -0.35, 0.68, 5.42], '#33422f'));        // bolster
// plan chest (top drawer interactable)
boxes.push(B([1.55, 0, 0.88, 2.12, 0.7, 1.46], '#5c3226'));
boxes.push(B([1.6, 0.12, 1.46, 2.07, 0.14, 1.47], CHROME, false));      // pull strips
boxes.push(B([1.6, 0.3, 1.46, 2.07, 0.32, 1.47], CHROME, false));
// rubber plant by the partition
boxes.push(B([-0.85, 0, 1.35, -0.45, 0.4, 1.75], '#ece8e0'));           // white pot
boxes.push(B([-0.78, 0.4, 1.42, -0.52, 1.15, 1.68], '#2e5c34', false)); // ficus

// ---- bedroom: low platform bed, bedside pair w/ mushroom lamps + Braun clock,
//      Danish dresser under window, sliding wardrobe, leaning mirror, rug
boxes.push(B([-5.71, 0, -3.55, -3.74, 0.22, -2.05], TEAK));             // platform
boxes.push(B([-5.66, 0.22, -3.5, -3.8, 0.42, -2.1], '#f2ede1'));        // white linen
boxes.push(B([-5.6, 0.42, -3.42, -5.2, 0.54, -2.18], WHITE, false));    // pillows
boxes.push(B([-4.0, 0.42, -3.5, -3.8, 0.47, -2.1], MUSTARD, false));    // folded blanket
boxes.push(B([-3.95, 0.47, -3.5, -3.85, 0.48, -2.1], OLIVE, false));    // olive stripe
boxes.push(B([-5.3, 0.02, -2.0, -4.1, 0.045, -1.3], '#6b6b3a', false)); // bedside rug
// bedside tables (drawers interactable)
boxes.push(B([-5.66, 0, -4.05, -5.21, 0.5, -3.6], TEAK));               // north table
boxes.push(B([-5.66, 0, -2.0, -5.21, 0.5, -1.55], TEAK));               // south table
boxes.push(B([-5.52, 0.5, -3.92, -5.36, 0.62, -3.76], '#ece8e0', false)); // mushroom lamps
boxes.push(B([-5.55, 0.62, -3.95, -5.33, 0.72, -3.73], '#f6f3ec', false));
boxes.push(B([-5.52, 0.5, -1.87, -5.36, 0.62, -1.71], '#ece8e0', false));
boxes.push(B([-5.55, 0.62, -1.9, -5.33, 0.72, -1.68], '#f6f3ec', false));
boxes.push(B([-5.34, 0.5, -3.72, -5.26, 0.58, -3.64], LEATHER, false)); // Braun clock
// Danish dresser under the north window; dish of keys (red herring) on top
boxes.push(B([-5.35, 0, -4.71, -4.2, 0.8, -4.26], '#9a6a3c'));
boxes.push(B([-5.28, 0.8, -4.6, -5.1, 0.83, -4.42], CHROME, false));    // dish
boxes.push(B([-5.24, 0.83, -4.56, -5.14, 0.85, -4.46], '#8a8f94', false)); // odd keys
boxes.push(B([-4.6, 0.8, -4.62, -4.35, 0.84, -4.4], TEAK, false));      // hairbrush
// built-in sliding wardrobe (east wall): rear carcass + fixed panel; the
// sliding panel is an interactable
boxes.push(B([-2.85, 0, -4.7, -2.56, 2.3, -2.9], '#e8e4da'));           // rear body
boxes.push(B([-3.14, 2.2, -4.7, -2.56, 2.3, -2.9], '#e8e4da'));         // pelmet
boxes.push(B([-3.14, 0, -4.7, -2.56, 0.08, -2.9], '#e8e4da'));          // plinth
boxes.push(B([-3.105, 0.08, -3.82, -3.085, 2.2, -2.9], '#e8e4da'));     // fixed panel
boxes.push(B([-3.105, 0.9, -3.8, -3.083, 1.5, -3.76], TEAK, false));    // finger pull
// leaning full-length mirror at wardrobe end
boxes.push(B([-3.1, 0, -2.88, -2.6, 1.6, -2.84], TEAK));
boxes.push(B([-3.04, 0.06, -2.84, -2.66, 1.54, -2.835], CHROME, false));

// ---- kitchen: Brooke Marine galley (drawers interactable), props
boxes.push(B([-2.45, 0, -4.7, -1.87, 0.85, -2.7], KUNIT));              // base run
boxes.push(B([-2.47, 0.85, -4.72, -1.83, 0.9, -2.68], TEAK));           // worktop
for (const zc of [-2.95, -3.2, -3.45, -3.7]) {
  boxes.push(B([-2.26, 0.9, zc - 0.09, -2.04, 0.916, zc + 0.09], FRAME, false));
  boxes.push(B([-1.83, 0.76, zc - 0.03, -1.79, 0.82, zc + 0.03], WHITE, false));
}
boxes.push(B([-2.30, 0.9, -4.52, -1.98, 0.925, -3.96], '#b9bec2', false)); // sink
boxes.push(B([-2.18, 0.925, -4.28, -2.10, 0.955, -4.20], '#d7dde0', false)); // Garchey
boxes.push(B([-1.87, 0.78, -3.05, -1.55, 0.83, -2.78], TEAK));          // breakfast bar
boxes.push(B([-0.65, 0, -4.7, -0.09, 2.2, -2.7], KUNIT));               // larder
boxes.push(B([-2.45, 1.5, -4.7, -2.15, 2.1, -3.9], KUNIT, false));      // wall cabinet
boxes.push(B([-2.45, 1.5, -3.8, -2.25, 1.54, -2.95], TEAK, false));     // open shelf
boxes.push(B([-2.42, 1.54, -3.7, -2.3, 1.66, -3.5], WHITE, false));     // cups
boxes.push(B([-2.42, 1.54, -3.4, -2.28, 1.62, -3.1], '#f2ede1', false)); // plates
boxes.push(B([-2.24, 0.916, -3.05, -2.04, 1.08, -2.86], ORANGE, false)); // enamel kettle
boxes.push(B([-2.2, 1.08, -3.0, -2.08, 1.12, -2.9], LEATHER, false));   // kettle handle
boxes.push(B([-1.83, 0.83, -3.0, -1.6, 0.95, -2.82], '#d2622a', false)); // casserole pair
boxes.push(B([-1.8, 0.95, -2.97, -1.63, 1.04, -2.85], '#d2622a', false));
boxes.push(B([-2.35, 0.9, -4.68, -2.05, 1.12, -4.56], CHROME, false));  // toaster
boxes.push(B([-1.80, 0, -2.99, -1.50, 0.6, -2.79], '#d9c49a'));         // Aalto stool
boxes.push(B([-1.81, 0.6, -3.0, -1.49, 0.66, -2.78], '#e3d2ac'));
boxes.push(B([-1.45, 2.15, -2.68, -1.2, 2.4, -2.655], WHITE, false));   // wall clock
boxes.push(B([-1.36, 2.24, -2.655, -1.29, 2.31, -2.65], LEATHER, false));
boxes.push(B([-1.6, 1.02, -4.85, -1.32, 1.1, -4.72], TEAK, false));     // fruit bowl on sill
boxes.push(B([-1.55, 1.1, -4.82, -1.37, 1.18, -4.75], '#d2622a', false)); // oranges
boxes.push(B([-1.85, 0.2, -3.45, -1.82, 0.6, -3.1], OAT, false));       // tea towel
boxes.push(B([-1.85, 0.34, -3.45, -1.815, 0.42, -3.1], ORANGE, false)); // stripe

// ---- bathroom: ware + airing cupboard (door interactable), mirror cabinet,
//      towels, mat, fern
boxes.push(B([-5.71, 0, -0.85, -4.05, 0.55, -0.15], WHITE));            // bathtub
boxes.push(B([-5.71, 0, 0.25, -5.25, 0.85, 0.72], WHITE));              // basin
boxes.push(B([-4.55, 0, 0.25, -4.25, 0.42, 0.58], WHITE));              // wc pan
boxes.push(B([-4.65, 0.42, 0.55, -4.15, 0.8, 0.75], WHITE));            // cistern
boxes.push(B([-4.55, 0.8, 0.6, -4.25, 0.85, 0.72], '#ece8e0', false));  // fern pot
boxes.push(B([-4.62, 0.85, 0.52, -4.18, 1.18, 0.75], '#4f8a3d', false)); // Boston fern
boxes.push(B([-3.02, 0, -0.85, -2.55, 2.2, -0.5], '#e8e2d6'));          // airing cpd rear
boxes.push(B([-3.32, 2.0, -0.85, -2.55, 2.2, -0.5], '#e8e2d6'));        // cpd head
boxes.push(B([-5.71, 1.08, 0.26, -5.64, 1.62, 0.72], WHITE));           // mirror cab rear
boxes.push(B([-5.2, 0.9, 0.73, -4.6, 0.94, 0.75], CHROME, false));      // towel rail
boxes.push(B([-5.15, 0.9, 0.71, -4.9, 1.5, 0.735], MUSTARD, false));    // towels
boxes.push(B([-4.87, 0.9, 0.71, -4.65, 1.35, 0.735], '#e3c96a', false));
boxes.push(B([-5.4, 0.015, -0.05, -4.7, 0.03, 0.4], OAT, false));       // bath mat

// ================================================================== BALCONY

boxes.push(B([-5.8, -0.08, 5.67, 2.2, 0, 7.3], QUARRY, false));
boxes.push(B([-5.8, -0.5, 7.3, 2.2, 1.02, 7.44], CONCRETE, false));
boxes.push(B([-5.8, 1.02, 7.32, 2.2, 1.1, 7.42], '#c2bab0', false));
boxes.push(B([-5.98, -0.5, 5.53, -5.8, H, 7.44], CONCRETE, false));
boxes.push(B([2.2, -0.5, 5.53, 2.38, H, 7.44], CONCRETE, false));
boxes.push(B([-5.98, H, 5.53, 2.38, H + 0.22, 7.48], CONCRETE, false));
// three terracotta geranium troughs hooked over the front
for (const [ta, tb] of [[-5.3, -3.9], [-2.6, -1.2], [0.4, 1.8]]) {
  boxes.push(B([ta, 0.9, 7.12, tb, 1.16, 7.32], '#b8674a', false));
  boxes.push(B([ta + 0.1, 1.16, 7.13, ta + 0.55, 1.34, 7.31], '#c93b47', false));
  boxes.push(B([ta + 0.62, 1.16, 7.13, ta + 0.95, 1.3, 7.31], '#e87a9c', false));
  boxes.push(B([ta + 1.02, 1.16, 7.13, tb - 0.05, 1.32, 7.31], '#f2ede1', false));
}
// bistro set on the quarry tiles + watering can
boxes.push(B([-3.05, 0, 6.45, -2.95, 0.64, 6.75], FRAME, false));       // table leg
boxes.push(B([-3.34, 0.64, 6.29, -2.66, 0.7, 6.91], '#f2ede1', false)); // white top
boxes.push(B([-3.06, 0.7, 6.52, -2.96, 0.78, 6.62], WHITE, false));     // espresso cup
boxes.push(B([-3.95, 0, 6.32, -3.52, 0.42, 6.72], FRAME, false));       // chairs
boxes.push(B([-3.95, 0.42, 6.64, -3.52, 0.85, 6.72], TEAK, false));
boxes.push(B([-2.48, 0, 6.32, -2.05, 0.42, 6.72], FRAME, false));
boxes.push(B([-2.48, 0.42, 6.64, -2.05, 0.85, 6.72], TEAK, false));
boxes.push(B([1.82, 0, 6.95, 2.08, 0.3, 7.18], '#a8adb0', false));      // watering can
boxes.push(B([1.7, 0.12, 7.0, 1.82, 0.2, 7.12], '#a8adb0', false));     // spout

// ============================================== THE VIEW SOUTH — the lake
// Layered per docs/flat-furnishing.md WINDOW VIEW SPEC (depths compressed to
// the engine's fog range; lake surface ~4 m below the flat's floor).

const WATER = '#3a6b60', WATER_DK = '#2f5248';
// near bank paving under the flat (mostly hidden by the rail)
boxes.push(B([-70, -4.35, 8, 70, -4.05, 30], '#a5674c', false));
// the lake itself
boxes.push(B([-70, -4.3, 30, 70, -4.0, 80], WATER, false));
// shimmer lane — dash rows in the sun lane
for (let i = 0; i < 14; i++) {
  const zz = 33 + i * 2.1, xx = -9 + (i % 3) * 2.6;
  boxes.push(B([xx, -3.99, zz, xx + 3.4, -3.965, zz + 0.5], '#8fd0b8', false));
  boxes.push(B([xx + 4.6, -3.99, zz + 0.9, xx + 6.2, -3.97, zz + 1.3], '#e8f6ee', false));
}
// dark reflections under church / colonnade
boxes.push(B([-14, -3.995, 52, -5, -3.97, 63], WATER_DK, false));
boxes.push(B([8, -3.995, 46, 60, -3.97, 58], WATER_DK, false));
// fountain-jet row rising out of the lake near Gilbert House
for (let j = 0; j < 7; j++) {
  const jx = -4 + j * 3.1;
  const jh = 3.2 + (j % 3) * 0.5;
  boxes.push(B([jx, -4, 46.5, jx + 0.45, -4 + jh, 47], '#eef4f2', false));
  boxes.push(B([jx - 0.35, -3.98, 46.1, jx + 0.8, -3.955, 47.4], '#cfeee2', false));
}
// three circular planted brick islands with ducks
function island(cx, cz, r) {
  boxes.push(B([cx - r, -4.0, cz - r, cx + r, -3.25, cz + r], '#9c5038', false));
  boxes.push(B([cx - r, -3.25, cz - r, cx + r, -3.15, cz + r], '#b8674a', false));
  boxes.push(B([cx - r + 0.5, -3.15, cz - r + 0.5, cx + r - 0.5, -2.1, cz + r - 0.5], '#4f8a3d', false));
  boxes.push(B([cx - r + 1.1, -2.4, cz - r + 1.1, cx + r - 1.1, -1.75, cz + r - 1.1], '#7fb84f', false));
  boxes.push(B([cx - 0.5, -3.1, cz - r + 0.4, cx + 0.5, -2.75, cz - r + 0.7], '#4a3c30', false)); // bench
}
island(-2, 42, 2.1);
island(4.5, 45, 1.7);
island(-8.5, 45.5, 1.5);
boxes.push(B([-4.6, -3.96, 39.4, -4.2, -3.75, 39.8], '#f2ede1', false)); // ducks
boxes.push(B([-3.4, -3.96, 40.6, -3.05, -3.77, 40.95], '#f2ede1', false));
boxes.push(B([1.2, -3.96, 43.2, 1.55, -3.77, 43.55], '#f2ede1', false));
boxes.push(B([-5.6, -3.99, 39.6, -4.5, -3.975, 40.0], '#8fd0b8', false)); // V-wakes
boxes.push(B([0.1, -3.99, 43.4, 1.1, -3.975, 43.7], '#8fd0b8', false));
// lakeside terrace: red-brick far bank, benches, figures, edge fountains
boxes.push(B([-60, -4, 54, 60, -2.7, 57.5], '#b8674a', false));
boxes.push(B([-60, -2.7, 54.5, 60, -2.6, 57.5], '#c07a55', false));
for (let bx = -16; bx <= 18; bx += 5.8) {
  boxes.push(B([bx, -2.6, 55, bx + 1.6, -2.15, 55.6], '#4a3c30', false)); // benches
}
boxes.push(B([-6.8, -2.6, 55.1, -6.3, -1.75, 55.5], '#4a3c30', false));  // figures
boxes.push(B([8.9, -2.6, 55.1, 9.4, -1.8, 55.5], '#4a3c30', false));
boxes.push(B([-1.5, -2.75, 54.0, 0.5, -2.2, 54.6], '#eef4f2', false));   // edge fountains
boxes.push(B([-11.5, -2.75, 54.0, -10.0, -2.35, 54.6], '#eef4f2', false));
boxes.push(B([13.0, -2.75, 54.0, 14.6, -2.3, 54.6], '#eef4f2', false));
// Gilbert House — right of frame, striding through the water on paired columns
boxes.push(B([6, 1.8, 58, 64, 22, 64], '#aaa196', false));               // body
for (let s = 0; s < 7; s++) {
  boxes.push(B([6, 4.2 + s * 2.7, 57.9, 64, 4.9 + s * 2.7, 58.05], '#8f887c', false)); // balcony bands
}
boxes.push(B([6, 3.2, 57.92, 64, 3.7, 58.02], '#c25050', false));        // flower-box dots band
for (let c = 0; c < 6; c++) {
  const cxp = 9 + c * 9;
  boxes.push(B([cxp, -4, 59.2, cxp + 1.0, 1.8, 60.4], '#6f6a63', false)); // column pairs
  boxes.push(B([cxp + 1.9, -4, 59.2, cxp + 2.9, 1.8, 60.4], '#6f6a63', false));
  boxes.push(B([cxp - 0.2, -3.99, 57.0, cxp + 3.1, -3.97, 58.8], WATER_DK, false)); // reflection
}
// St Giles' Cripplegate — centre-left, with the heron
boxes.push(B([-14, -2.5, 63, -5, 3.5, 68], '#8d7f6f', false));           // ragstone nave
boxes.push(B([-12.6, -1.2, 62.9, -11.8, 1.8, 63.0], '#4a4238', false));  // arched windows
boxes.push(B([-9.4, -1.2, 62.9, -8.6, 1.8, 63.0], '#4a4238', false));
boxes.push(B([-6.8, -1.2, 62.9, -6.0, 1.8, 63.0], '#4a4238', false));
boxes.push(B([-12.5, -2.5, 63.5, -10.2, 9, 65.8], '#9c5038', false));    // brick tower
boxes.push(B([-10.6, 6.5, 63.6, -10.1, 10.2, 64.1], '#cfc7b8', false));  // stone turret
boxes.push(B([-10.45, 10.2, 63.75, -10.25, 11.2, 63.95], '#6f655a', false)); // vane
boxes.push(B([-7.6, 3.5, 64.9, -7.15, 4.5, 65.4], '#6a7076', false));    // THE HERON
boxes.push(B([-7.45, 4.1, 64.75, -7.3, 4.55, 64.95], '#6a7076', false)); // heron neck
boxes.push(B([-20, -3, 62, -13.5, 1, 68], '#2e5c34', false));            // churchyard trees
boxes.push(B([-5.2, -3, 63.5, -0.5, 0.5, 68], '#2e5c34', false));
// far terrace-block band + crescent hint
boxes.push(B([-70, -1, 84, 45, 13, 88], '#a9a294', false));
for (let s = 0; s < 4; s++) {
  boxes.push(B([-70, 1.5 + s * 3.1, 83.9, 45, 2.4 + s * 3.1, 84.05], '#98917f', false));
}
boxes.push(B([-85, 0, 90, -50, 12, 94], '#9b9488', false));
// the two towers, hazed
boxes.push(B([-26, -2, 90, -16, 38, 95], '#847e74', false));             // Cromwell
boxes.push(B([-19.5, -2, 89.8, -18.5, 38, 90.0], '#6f6a61', false));     // sawtooth hint
boxes.push(B([-50, -2, 95, -40, 34, 100], '#938d82', false));            // Shakespeare

// ------------------------------------------- the view north (kitchen/bedroom)

boxes.push(B([-12, -4, -8.6, 6, 5.5, -8.0], '#b0a89c', false));
boxes.push(B([-40, -4.4, -30, 30, -4.2, -6.5], '#a8a79e', false));
boxes.push(B([-5.9, 2.46, -6.45, 0.1, 2.62, -6.30], '#9aa0a2', false));
for (let gx = -5.7; gx < -0.2; gx += 0.28) {
  boxes.push(B([gx, 2.52, -6.3, gx + 0.07, 2.6, -4.95], '#9aa0a2', false));
}

// ===================================================== PAINTINGS (all Finnish)
// Framed color-block evocations; thin layered boxes stepped off the wall face
// so nothing z-fights. All non-solid.

const PFRAME = '#3a322c';

// Helene Schjerfbeck — Self-Portrait with Black Background (1915).
// The prominent, sun-lit north living wall above the G-Plan sideboard.
// Black-umber ground, her name block-lettered (and half-erased) across the
// top, pale tilted face with quiet modelling, dark cap of hair, chalky
// collar with the shoulder-strap sliver, scraped-paint drag streaks, and the
// red pot of brushes lower right. Layers step 5-7 mm off the wall (z 0.85+).
boxes.push(B([-3.97, 1.18, 0.85, -3.38, 1.92, 0.875], PFRAME, false));
boxes.push(B([-3.97, 1.895, 0.875, -3.38, 1.92, 0.877], '#6b5f52', false)); // lit top edge
boxes.push(B([-3.95, 1.13, 0.8505, -3.40, 1.175, 0.8525], '#d4cfc4', false)); // wall shadow
boxes.push(B([-3.95, 1.20, 0.875, -3.40, 1.90, 0.882], '#262019', false)); // ground
boxes.push(B([-3.85, 1.42, 0.882, -3.53, 1.82, 0.8845], '#3a3029', false)); // umber halo
boxes.push(B([-3.92, 1.28, 0.882, -3.87, 1.64, 0.8845], '#413830', false)); // scrape streak
boxes.push(B([-3.58, 1.24, 0.882, -3.44, 1.285, 0.8845], '#453b32', false)); // scrape streak
boxes.push(B([-3.90, 1.82, 0.882, -3.72, 1.85, 0.886], '#b3a794', false)); // HELENE…
boxes.push(B([-3.68, 1.82, 0.882, -3.50, 1.845, 0.886], '#6e6354', false)); // …SCHJERF…
boxes.push(B([-3.47, 1.82, 0.882, -3.42, 1.84, 0.886], '#8d8272', false)); // …erased
boxes.push(B([-3.90, 1.22, 0.882, -3.45, 1.42, 0.887], '#372f26', false)); // shoulders
boxes.push(B([-3.735, 1.40, 0.8845, -3.655, 1.52, 0.889], '#d5c2a9', false)); // neck
boxes.push(B([-3.80, 1.50, 0.8845, -3.60, 1.76, 0.889], '#e0d2bd', false)); // face
boxes.push(B([-3.77, 1.44, 0.889, -3.58, 1.54, 0.8935], '#e0d2bd', false)); // tilted jaw
boxes.push(B([-3.82, 1.68, 0.889, -3.58, 1.80, 0.8935], '#1c1512', false)); // hair cap
boxes.push(B([-3.83, 1.32, 0.889, -3.52, 1.47, 0.8935], '#cfc4b0', false)); // collar
boxes.push(B([-3.50, 1.24, 0.889, -3.43, 1.36, 0.8935], '#a83226', false)); // red brush pot
boxes.push(B([-3.80, 1.50, 0.8935, -3.745, 1.68, 0.897], '#cfbda6', false)); // cheek plane
boxes.push(B([-3.78, 1.615, 0.8935, -3.62, 1.64, 0.897], '#c4b298', false)); // brow shadow
boxes.push(B([-3.705, 1.545, 0.8935, -3.675, 1.63, 0.897], '#d8c6ae', false)); // nose
boxes.push(B([-3.72, 1.452, 0.8935, -3.64, 1.462, 0.897], '#b8a58c', false)); // chin line
boxes.push(B([-3.655, 1.52, 0.8935, -3.60, 1.575, 0.897], '#bc8b80', false)); // rose cheek
boxes.push(B([-3.76, 1.63, 0.8935, -3.72, 1.655, 0.897], '#2a211c', false)); // eyes
boxes.push(B([-3.67, 1.63, 0.8935, -3.63, 1.655, 0.897], '#2a211c', false));
boxes.push(B([-3.72, 1.505, 0.8935, -3.66, 1.525, 0.897], '#96554a', false)); // mouth
boxes.push(B([-3.63, 1.355, 0.8935, -3.585, 1.43, 0.897], '#4e4034', false)); // strap sliver
boxes.push(B([-3.485, 1.36, 0.8935, -3.45, 1.44, 0.897], '#c9b48c', false)); // brushes

// Akseli Gallen-Kallela — Lake Keitele (1905), over the sofa on the west wall.
// Silvery-blue water, graded sky, dark far shore breaking up into its
// reflection, island at right — and the three crossing wake systems: the
// stepped zigzags, a steeper diagonal set, and two broad soft bands.
boxes.push(B([-5.71, 1.23, 1.73, -5.687, 1.82, 2.62], PFRAME, false));
boxes.push(B([-5.687, 1.797, 1.73, -5.685, 1.82, 2.62], '#6b5f52', false)); // lit top edge
boxes.push(B([-5.709, 1.19, 1.75, -5.7075, 1.228, 2.60], '#d4cfc4', false)); // wall shadow
boxes.push(B([-5.687, 1.25, 1.75, -5.680, 1.80, 2.60], '#9fb2bd', false)); // water
boxes.push(B([-5.680, 1.70, 1.75, -5.675, 1.80, 2.60], '#dfe5e2', false)); // sky
boxes.push(B([-5.680, 1.63, 1.75, -5.675, 1.70, 2.60], '#2f3f52', false)); // far shore
boxes.push(B([-5.680, 1.58, 1.75, -5.676, 1.63, 2.60], '#55697a', false)); // reflection
boxes.push(B([-5.675, 1.76, 1.75, -5.670, 1.80, 2.60], '#eef2ef', false)); // sky top step
boxes.push(B([-5.675, 1.70, 1.75, -5.670, 1.725, 2.60], '#d3dcd9', false)); // sky low step
boxes.push(B([-5.675, 1.60, 1.75, -5.670, 1.70, 1.93], '#263646', false)); // island
boxes.push(B([-5.675, 1.565, 1.78, -5.670, 1.585, 1.90], '#31424f', false)); // island refl
boxes.push(B([-5.675, 1.60, 1.98, -5.670, 1.615, 2.12], '#41556a', false)); // refl break-up
boxes.push(B([-5.675, 1.585, 2.22, -5.670, 1.60, 2.34], '#41556a', false));
boxes.push(B([-5.675, 1.605, 2.44, -5.670, 1.62, 2.55], '#41556a', false));
boxes.push(B([-5.675, 1.50, 1.82, -5.670, 1.53, 2.25], '#ccd8d6', false)); // zigzag system
boxes.push(B([-5.675, 1.44, 2.05, -5.670, 1.465, 2.50], '#ccd8d6', false));
boxes.push(B([-5.675, 1.37, 1.78, -5.670, 1.395, 2.20], '#ccd8d6', false));
boxes.push(B([-5.675, 1.30, 2.00, -5.670, 1.325, 2.45], '#ccd8d6', false));
boxes.push(B([-5.670, 1.545, 2.30, -5.6655, 1.562, 2.46], '#dde8e4', false)); // diagonal system
boxes.push(B([-5.670, 1.515, 2.20, -5.6655, 1.532, 2.36], '#dde8e4', false));
boxes.push(B([-5.670, 1.487, 2.08, -5.6655, 1.503, 2.26], '#dde8e4', false));
boxes.push(B([-5.670, 1.415, 1.80, -5.6655, 1.435, 2.30], '#c3d2d0', false)); // broad bands
boxes.push(B([-5.670, 1.335, 1.88, -5.6655, 1.352, 2.38], '#c3d2d0', false));

// Hugo Simberg — The Wounded Angel (1903), hall north wall, facing the entry.
// Hung on the solid pier WEST of the kitchen doorway (the opening is
// x -1.7..-0.8 — never span it). Grey-green park, pale sky over the water
// band, sandy path, two dark bearers carrying the white angel on a stretcher;
// white blindfold, red speck.
boxes.push(B([-2.44, 1.10, -2.55, -1.75, 1.68, -2.525], PFRAME, false));
boxes.push(B([-2.44, 1.655, -2.525, -1.75, 1.68, -2.523], '#6b5f52', false)); // lit top edge
boxes.push(B([-2.42, 1.06, -2.5485, -1.77, 1.098, -2.5465], '#d4cfc4', false)); // wall shadow
boxes.push(B([-2.42, 1.12, -2.525, -1.77, 1.66, -2.518], '#7d8a76', false)); // park
boxes.push(B([-2.42, 1.53, -2.518, -1.77, 1.66, -2.513], '#c3ccc9', false)); // sky
boxes.push(B([-2.42, 1.48, -2.518, -1.77, 1.53, -2.513], '#8fa0a3', false)); // Töölönlahti
boxes.push(B([-2.42, 1.525, -2.513, -1.77, 1.545, -2.511], '#a5aead', false)); // far bank
boxes.push(B([-2.42, 1.12, -2.518, -1.77, 1.23, -2.513], '#9a8f7c', false)); // path
boxes.push(B([-2.385, 1.23, -2.513, -2.373, 1.42, -2.510], '#4d4a42', false)); // shrub
boxes.push(B([-2.405, 1.36, -2.513, -2.355, 1.372, -2.510], '#4d4a42', false)); // twig
boxes.push(B([-1.83, 1.23, -2.513, -1.818, 1.38, -2.510], '#4d4a42', false)); // shrub
boxes.push(B([-2.325, 1.125, -2.510, -2.295, 1.17, -2.5075], '#1a1715', false)); // rear legs
boxes.push(B([-2.28, 1.125, -2.510, -2.25, 1.17, -2.5075], '#1a1715', false));
boxes.push(B([-2.33, 1.16, -2.513, -2.24, 1.50, -2.508], '#3d3833', false)); // rear bearer (jacket)
boxes.push(B([-2.325, 1.50, -2.510, -2.245, 1.535, -2.5075], '#26221e', false)); // rear cap
boxes.push(B([-1.96, 1.12, -2.510, -1.93, 1.165, -2.5075], '#16130f', false)); // front legs
boxes.push(B([-1.92, 1.12, -2.510, -1.89, 1.165, -2.5075], '#16130f', false));
boxes.push(B([-1.97, 1.15, -2.513, -1.88, 1.52, -2.508], '#211d1a', false)); // front bearer (coat)
boxes.push(B([-1.965, 1.52, -2.510, -1.885, 1.555, -2.5075], '#16130f', false)); // front cap
boxes.push(B([-2.29, 1.235, -2.513, -1.90, 1.25, -2.508], '#b9a887', false)); // stretcher poles
boxes.push(B([-2.29, 1.265, -2.513, -1.90, 1.28, -2.508], '#b9a887', false));
boxes.push(B([-2.30, 1.28, -2.506, -2.275, 1.30, -2.503], '#cbb59a', false)); // hands
boxes.push(B([-1.925, 1.28, -2.506, -1.90, 1.30, -2.503], '#cbb59a', false));
boxes.push(B([-2.235, 1.22, -2.510, -2.16, 1.38, -2.5055], '#e4e2d8', false)); // wings
boxes.push(B([-2.04, 1.22, -2.510, -1.965, 1.36, -2.5055], '#e4e2d8', false));
boxes.push(B([-2.20, 1.28, -2.513, -2.00, 1.44, -2.507], '#ecebe4', false)); // angel
boxes.push(B([-2.13, 1.44, -2.513, -2.06, 1.50, -2.507], '#d9cfc0', false)); // bowed head
boxes.push(B([-2.125, 1.475, -2.505, -2.065, 1.505, -2.502], '#cfc0a0', false)); // hair
boxes.push(B([-2.14, 1.455, -2.507, -2.05, 1.475, -2.503], '#f6f4ee', false)); // blindfold
boxes.push(B([-2.075, 1.315, -2.505, -2.045, 1.34, -2.502], '#f4f2ec', false)); // snowdrop posy
boxes.push(B([-2.07, 1.295, -2.505, -2.05, 1.315, -2.502], '#5a7a4a', false)); // stems
boxes.push(B([-2.115, 1.30, -2.507, -2.085, 1.325, -2.503], '#a8342a', false)); // red speck

// Helene Schjerfbeck — Green Apples (still life), bedroom west wall above the
// south bedside table. Chalky ground, table band, three apples.
boxes.push(B([-5.71, 1.03, -1.84, -5.69, 1.35, -1.45], PFRAME, false));
boxes.push(B([-5.69, 1.328, -1.84, -5.688, 1.35, -1.45], '#6b5f52', false)); // lit top edge
boxes.push(B([-5.709, 0.995, -1.82, -5.7075, 1.028, -1.47], '#d4cfc4', false)); // wall shadow
boxes.push(B([-5.69, 1.05, -1.82, -5.684, 1.33, -1.47], '#cfc9bb', false)); // ground
boxes.push(B([-5.684, 1.05, -1.82, -5.679, 1.14, -1.47], '#a89a85', false)); // table
boxes.push(B([-5.680, 1.112, -1.80, -5.6765, 1.118, -1.48], '#c4bcab', false)); // plate rim shadow
boxes.push(B([-5.6815, 1.115, -1.79, -5.677, 1.135, -1.49], '#e3ded2', false)); // plate ellipse
boxes.push(B([-5.6765, 1.128, -1.745, -5.673, 1.14, -1.675], '#b3a68f', false)); // cast shadows
boxes.push(B([-5.6765, 1.13, -1.645, -5.673, 1.142, -1.575], '#b3a68f', false));
boxes.push(B([-5.6765, 1.126, -1.545, -5.673, 1.138, -1.49], '#b3a68f', false));
boxes.push(B([-5.676, 1.13, -1.76, -5.671, 1.20, -1.69], '#7fa055', false)); // apples
boxes.push(B([-5.676, 1.135, -1.66, -5.671, 1.21, -1.585], '#a8b060', false));
boxes.push(B([-5.676, 1.13, -1.56, -5.671, 1.185, -1.50], '#b06a45', false));
boxes.push(B([-5.671, 1.195, -1.735, -5.669, 1.215, -1.72], '#5a4a30', false)); // stem specks
boxes.push(B([-5.671, 1.205, -1.632, -5.669, 1.225, -1.617], '#5a4a30', false));
boxes.push(B([-5.671, 1.18, -1.54, -5.669, 1.20, -1.525], '#5a4a30', false));

// (relocated) abstract 60s screenprint — study east wall, over the desk
boxes.push(B([2.085, 1.15, 2.55, 2.11, 1.95, 3.15], FRAME, false));
boxes.push(B([2.076, 1.93, 2.55, 2.085, 1.95, 3.15], '#575049', false)); // lit top edge
boxes.push(B([2.106, 1.108, 2.58, 2.108, 1.145, 3.12], '#d4cfc4', false)); // wall shadow
boxes.push(B([2.078, 1.19, 2.59, 2.085, 1.91, 3.11], MUSTARD, false));
boxes.push(B([2.072, 1.30, 2.70, 2.078, 1.80, 2.82], '#2e2a26', false)); // bar
boxes.push(B([2.072, 1.32, 2.86, 2.078, 1.78, 2.90], '#4a4440', false)); // second bar
boxes.push(B([2.0705, 1.49, 2.94, 2.076, 1.76, 3.09], '#e3dbc4', false)); // off-register ghost
boxes.push(B([2.065, 1.45, 2.90, 2.0705, 1.72, 3.05], '#f2ede1', false)); // disc
boxes.push(B([2.065, 1.26, 2.63, 2.0705, 1.34, 2.71], '#c1502e', false)); // red-orange dot
boxes.push(B([2.065, 1.225, 2.98, 2.0705, 1.235, 3.08], '#2e2a26', false)); // signature dash

// ============================================================== INTERACTABLES

const DRAWER = '#e6dfd2';
const interactables = [];

// THE FRONT DOOR — leaving the flat returns to the estate terrace.
// The prompt nudges until the Arts Centre key has been taken.
interactables.push({
  id: 'front_door', exit: true,
  box: [-0.14, 0.2, -0.5, 0.12, 2.0, 0.5],
  needsStore: 'barbican.keys.artsCentre',
  labelHas: 'leave the flat',
  labelNot: 'leave the flat (something in the kitchen glints...)',
  href: 'index.html?at=343,46',
});

// four kitchen drawers along the galley run (fronts slide east into the aisle)
const kdBands = [[-4.60, -4.22], [-4.17, -3.79], [-3.74, -3.36], [-3.31, -2.93]];
const kdReveal = [
  // d1: cutlery tray
  [B([-1.85, 0.64, -4.57, -1.53, 0.70, -4.25], OAK, false),
   B([-1.80, 0.70, -4.54, -1.58, 0.72, -4.46], CHROME, false),
   B([-1.80, 0.70, -4.42, -1.58, 0.715, -4.34], '#8a8f94', false)],
  // d2: liner — the Arts Centre key sits here (separate item entry below)
  [B([-1.85, 0.64, -4.14, -1.53, 0.70, -3.82], OAK, false),
   B([-1.83, 0.70, -4.12, -1.55, 0.705, -3.84], '#efe9dd', false)],
  // d3: torch and a ball of string
  [B([-1.85, 0.64, -3.71, -1.53, 0.70, -3.39], OAK, false),
   B([-1.80, 0.70, -3.68, -1.60, 0.76, -3.60], LEATHER, false),
   B([-1.74, 0.70, -3.54, -1.64, 0.77, -3.44], OAT, false)],
  // d4: takeaway menus
  [B([-1.82, 0.70, -3.28, -1.56, 0.73, -3.00], '#f2ede1', false),
   B([-1.78, 0.73, -3.22, -1.60, 0.745, -3.08], '#c93b47', false)],
];
kdBands.forEach(([za, zb], i) => {
  interactables.push({
    id: 'kd' + (i + 1), name: 'kitchen drawer',
    box: [-1.87, 0.62, za, -1.85, 0.82, zb],
    color: DRAWER, dir: [0.34, 0, 0],
    reveal: kdReveal[i],
  });
});

// THE ARTS CENTRE KEY — second drawer of the galley run.
// `glint`: warm emissive boxes the engine pulses while the key is unclaimed —
// rgb values above 1.0 saturate through the lighting into a hot glow.
// Seam strips show while kd2 is closed; the worktop glow always; a halo over
// the key once the drawer is open. All die on pickup.
interactables.push({
  id: 'arts_key', item: true, parent: 'kd2',
  label: 'take the Arts Centre key',
  box: [-1.76, 0.705, -4.02, -1.60, 0.735, -3.94],
  color: '#b08d3f',
  message: 'ARTS CENTRE KEY — the stage door will open now',
  store: 'barbican.keys.artsCentre',
  mark: '\u{1F511} ARTS CENTRE KEY',
  glint: [
    { when: 'closed', box: [-1.849, 0.812, -4.16, -1.843, 0.835, -3.80], rgb: [1.8, 1.5, 0.6] },   // top seam
    { when: 'closed', box: [-1.849, 0.605, -4.16, -1.843, 0.628, -3.80], rgb: [1.4, 1.15, 0.45] }, // bottom seam
    { when: 'any',    box: [-2.02, 0.902, -4.15, -1.84, 0.908, -3.81],   rgb: [1.15, 1.0, 0.55] }, // worktop glow
    { when: 'open',   box: [-1.75, 0.737, -4.01, -1.61, 0.75, -3.95],    rgb: [1.7, 1.45, 0.6] },  // key halo
    // halo pad under the coffee-table note ('note_key') — same taken-gating
    // as the drawer glint: the note stays readable, the glow dies with the key
    { when: 'any',    box: [-3.41, 0.342, 2.71, -3.16, 0.348, 3.07],     rgb: [1.25, 1.05, 0.55] },
  ],
});

// handwritten note on the coffee table — the player walks straight past it
// coming in from the hall; re-readable, points at kd2
interactables.push({
  id: 'note_key', note: true, name: 'note', label: 'read note',
  box: [-3.36, 0.34, 2.76, -3.18, 0.36, 3.02],
  color: '#f6f2e6',
  message: 'left a key for you in the kitchen drawer — second one down from the window. x',
  deco: [
    B([-3.34, 0.36, 2.80, -3.21, 0.365, 2.825], '#4a4a55', false),  // ink dashes
    B([-3.33, 0.36, 2.86, -3.23, 0.365, 2.885], '#4a4a55', false),
    B([-3.34, 0.36, 2.92, -3.26, 0.365, 2.945], '#4a4a55', false),
  ],
});

// G-Plan sideboard sliding doors (two tracks)
interactables.push({
  id: 'sb_l', name: 'sideboard door',
  box: [-4.62, 0.16, 1.32, -3.72, 0.71, 1.345],
  color: TEAK, dir: [0.86, 0, 0],
  reveal: [
    B([-4.55, 0.16, 1.14, -3.8, 0.55, 1.28], LEATHER, false),   // LP row
    B([-4.5, 0.2, 1.285, -4.3, 0.5, 1.30], PENGUIN, false),     // face-out sleeve
  ],
});
interactables.push({
  id: 'sb_r', name: 'sideboard door',
  box: [-3.68, 0.16, 1.35, -2.78, 0.71, 1.375],
  color: '#7c4f2c', dir: [-0.86, 0, 0],
  reveal: [
    B([-3.6, 0.18, 1.14, -3.2, 0.44, 1.26], '#f2ede1', false),  // stacked china
    B([-3.1, 0.18, 1.14, -2.9, 0.38, 1.24], CHROME, false),     // glassware
  ],
});

// bedroom wardrobe sliding panel
interactables.push({
  id: 'wd', name: 'wardrobe',
  box: [-3.14, 0.08, -4.66, -3.115, 2.2, -3.84],
  color: '#e8e4da', dir: [0, 0, 0.78],
  reveal: [
    B([-3.05, 0.9, -4.55, -2.88, 1.8, -4.35], OLIVE, false),    // hanging clothes
    B([-3.05, 0.9, -4.30, -2.88, 1.75, -4.12], ORANGE, false),
    B([-3.05, 0.9, -4.07, -2.88, 1.8, -3.92], OAT, false),
    B([-3.05, 0.15, -4.6, -2.87, 0.55, -4.0], WHITE, false),    // folded linen
  ],
});

// bathroom airing cupboard door
interactables.push({
  id: 'ac', name: 'airing cupboard',
  box: [-3.345, 0.06, -0.83, -3.32, 1.98, -0.52],
  color: '#e8e2d6', dir: [0, 0, 0.30],
  reveal: [
    B([-3.28, 0.5, -0.8, -3.06, 0.62, -0.55], WHITE, false),    // linen shelves
    B([-3.28, 0.9, -0.8, -3.06, 1.02, -0.55], OAT, false),
    B([-3.28, 1.3, -0.78, -3.06, 1.9, -0.58], CHROME, false),   // cold-water tank
  ],
});

// bathroom mirror cabinet
interactables.push({
  id: 'mc', name: 'mirror cabinet',
  box: [-5.62, 1.1, 0.28, -5.60, 1.6, 0.70],
  color: CHROME, dir: [0, 0, 0.30],
  reveal: [
    B([-5.635, 1.22, 0.34, -5.605, 1.34, 0.42], WHITE, false),  // aspirin
    B([-5.635, 1.2, 0.52, -5.605, 1.36, 0.60], '#c98a2e', false), // amber bottle
  ],
});

// plan chest top drawer (study)
interactables.push({
  id: 'pc', name: 'plan chest drawer',
  box: [1.58, 0.56, 1.47, 2.09, 0.67, 1.49],
  color: '#6b3d2a', dir: [0, 0, 0.30],
  reveal: [
    B([1.62, 0.60, 1.50, 2.05, 0.625, 1.76], '#f2ede1', false), // prints
    B([1.70, 0.625, 1.53, 1.95, 0.64, 1.72], MUSTARD, false),
  ],
});

// desk drawer (study)
interactables.push({
  id: 'dd', name: 'desk drawer',
  box: [1.578, 0.50, 2.19, 1.598, 0.66, 2.51],
  color: '#7c4f2c', dir: [-0.30, 0, 0],
  reveal: [
    B([1.30, 0.52, 2.26, 1.52, 0.55, 2.44], OLIVE, false),      // notebook
    B([1.34, 0.55, 2.30, 1.48, 0.565, 2.34], MUSTARD, false),   // pencils
  ],
});

// bedside drawers
interactables.push({
  id: 'bt_n', name: 'bedside drawer',
  box: [-5.21, 0.26, -3.98, -5.19, 0.42, -3.67],
  color: '#7c4f2c', dir: [0.26, 0, 0],
  reveal: [
    B([-5.18, 0.28, -3.94, -4.98, 0.34, -3.72], OAK, false),
    B([-5.14, 0.34, -3.9, -5.02, 0.365, -3.78], PENGUIN, false), // paperback
  ],
});
interactables.push({
  id: 'bt_s', name: 'bedside drawer',
  box: [-5.21, 0.26, -1.88, -5.19, 0.42, -1.57],
  color: '#7c4f2c', dir: [0.26, 0, 0],
  reveal: [
    B([-5.18, 0.28, -1.84, -4.98, 0.34, -1.62], OAK, false),
    B([-5.13, 0.34, -1.8, -5.03, 0.37, -1.7], '#8a8f94', false), // spare fuses
  ],
});

// -------------------------------------------------------------------- scene

export const scene = {
  sky: { zenith: '#aecfe4', horizon: '#dce9ef' },
  sunDir: [0.25, 0.8, 0.5],
  ambient: 0.66,
  sunIntensity: 0.5,
  boxes,
  interactables,
  // one-shot zone hints (skipped/never shown once the named item is taken)
  hints: [
    { zone: [-2.5, -4.8, 0.0, -2.6], item: 'arts_key',
      message: 'something in the kitchen glints…' },
  ],
  spawn: { pos: [-0.7, 0, 0.05], yaw: -2.19, pitch: 0 },
};
