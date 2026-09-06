// THE BARBICAN · flat interior — scene data.
// Units: meters, +Y up. The flat is a placeholder 8×5 m room; the real
// floor plan (researched separately) will replace `scene.boxes` later.
//
// Scene format:
//   box entry: { box:[x0,y0,z0, x1,y1,z1], color:'#rrggbb', solid:true|false }
//     - box is a min/max AABB in world meters
//     - solid:false → rendered but no collision (rugs, distant towers, decor)
//   scene: { sky:{zenith,horizon}, sunDir:[x,y,z] (direction TOWARD the sun),
//            ambient, sunIntensity, boxes:[...], spawn:{pos,yaw} }

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

// ------------------------------------------------------------- helper: floor

/** Parquet floor: alternating strips of two browns. */
function parquet(x0, z0, x1, z1, stripW = 0.5) {
  const boxes = [];
  const cols = ['#b78a58', '#a87c4e'];
  let i = 0;
  for (let x = x0; x < x1 - 1e-6; x += stripW, i++) {
    boxes.push({
      box: [x, -0.08, z0, Math.min(x + stripW, x1), 0, z1],
      color: cols[i % 2],
      solid: true, // top face is y=0; the engine ignores boxes at/under foot level
    });
  }
  return boxes;
}

// ------------------------------------------------------------ the placeholder

const H = 2.5;       // ceiling height
const T = 0.15;      // wall thickness
const WALL = '#ece7db';
const YELLOW = '#f7c623';

const boxes = [];

// Floor (covers room + hallway) and ceiling.
boxes.push(...parquet(-T, -T, 9.55, 5 + T));
boxes.push({ box: [-T, H, -T, 9.55, H + 0.12, 5 + T], color: '#f4f0e7', solid: true });

// Room shell: interior x 0..8, z 0..5.
// South wall (z=0) with the big window, x 2..6, sill 0.9, head 2.2.
boxes.push(...wall([-T, -T / 2], [8 + T, -T / 2], H, T,
  [{ start: 2 + T, end: 6 + T, bottom: 0.9, top: 2.2 }], WALL));
// North wall.
boxes.push(...wall([-T, 5 + T / 2], [8 + T, 5 + T / 2], H, T, [], WALL));
// West wall.
boxes.push(...wall([-T / 2, 0], [-T / 2, 5], H, T, [], WALL));
// East wall (x=8) with a doorway, z 1.9..2.8, head 2.05.
boxes.push(...wall([8 + T / 2, 0], [8 + T / 2, 5], H, T,
  [{ start: 1.9, end: 2.8, top: 2.05 }], WALL));

// Small entrance hall behind the doorway (x 8.15..9.4, z 1.9..2.8),
// closed off by the yellow front door.
boxes.push(...wall([8 + T, 1.9 - T / 2], [9.55, 1.9 - T / 2], H, T, [], WALL));
boxes.push(...wall([8 + T, 2.8 + T / 2], [9.55, 2.8 + T / 2], H, T, [], WALL));
boxes.push({ box: [9.4, 0, 1.75, 9.55, H, 2.95], color: YELLOW, solid: true }); // front door

// Yellow Line runner: a painted strip guiding from the window to the door.
boxes.push({ box: [1.2, 0, 2.25, 8.15, 0.015, 2.45], color: YELLOW, solid: false });

// Furniture.
boxes.push({ box: [2.6, 0, 4.15, 4.6, 0.42, 4.95], color: '#6b6f7c', solid: true });   // sofa base
boxes.push({ box: [2.6, 0.42, 4.68, 4.6, 0.88, 4.95], color: '#5d616e', solid: false }); // sofa back
boxes.push({ box: [5.85, 0, 1.05, 6.15, 0.7, 1.35], color: '#7a5a38', solid: true });  // table pedestal
boxes.push({ box: [5.35, 0.7, 0.55, 6.65, 0.78, 1.85], color: '#8a6845', solid: true }); // table top
boxes.push({ box: [3.1, 0, 1.1, 5.1, 0.02, 3.6], color: '#c8b9a2', solid: false });    // rug

// Balcony outside the window (z < 0). Unreachable — sill blocks the player.
boxes.push({ box: [1.6, -0.2, -1.5, 6.6, -0.04, -T], color: '#b5b0a5', solid: false }); // slab
boxes.push({ box: [1.6, 0.95, -1.5, 6.6, 1.05, -1.42], color: '#3f6f9e', solid: false }); // top rail
boxes.push({ box: [1.6, 0.45, -1.49, 6.6, 0.52, -1.43], color: '#3f6f9e', solid: false }); // mid rail
boxes.push({ box: [2.2, -0.04, -0.62, 3.6, 0.3, -0.3], color: '#5a544c', solid: false });  // planter
boxes.push({ box: [2.26, 0.3, -0.58, 3.54, 0.46, -0.34], color: '#e58ea0', solid: false }); // blooms

// Distant Barbican tower silhouettes, seen through the window (hazed by fog).
boxes.push({ box: [-14, -5, -42, -6, 30, -38], color: '#5f6a7c', solid: false });
boxes.push({ box: [0, -5, -48, 9, 34, -43], color: '#596374', solid: false });
boxes.push({ box: [14, -5, -40, 22, 26, -36], color: '#646f81', solid: false });
// Distant podium slab so the view below the horizon isn't bare sky.
boxes.push({ box: [-45, -8, -70, 55, -6, -8], color: '#a8a79e', solid: false });

export const scene = {
  sky: { zenith: '#7fb2e0', horizon: '#e3ebef' },
  sunDir: [0.35, 0.75, -0.55],  // direction toward the sun (south-ish, high)
  ambient: 0.66,
  sunIntensity: 0.45,
  boxes,
  spawn: { pos: [4, 0, 3.6], yaw: 0, pitch: 0 }, // facing the window
};
