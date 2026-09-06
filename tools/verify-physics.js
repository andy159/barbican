/* Simulates TUNING through the real player module: movement envelope,
   mechanics proofs in synthetic rooms (dash/barge are gated off in the
   estate route but must keep working for later levels), and route
   proofs against the real level. Run `node tools/verify-physics.js`
   whenever tuning, player.js, or a level changes. Exits non-zero on
   any failed proof.

   Expected envelope (verified since Phase 1 — don't drift without
   re-proving the level): max jump ≈3.45 tiles, min ≈1.01, range ≈7.20. */
import * as level from '../src/level.js';
import { makePlayer, step } from '../src/player.js';
import { HIGHWALK } from '../levels/highwalk.js';
import { CONSERVATORY } from '../levels/conservatory.js';

const TILE = level.TILE;
const W = 8, H = 14;              // player box (matches makePlayer)
let exitCode = 0;

const check = (ok, label) => { if(!ok){ exitCode = 1; console.error(`FAIL: ${label}`); } };

function flatRoom(extra = []){
  const rows = Array.from({length: 40}, () => '');
  rows.push('P' + ' '.repeat(399));
  rows.push(' '.repeat(400));                    // clearance — player is ~2 tiles tall
  rows.push('#'.repeat(400));
  for(const [y, s] of extra) rows[y] = s;
  return { id: 'synthetic', tiles: rows };
}

function settle(frames = 120){
  const P = makePlayer();
  for(let i = 0; i < frames; i++) step(P, {});
  return P;
}

const touching = P =>
  level.overlapsSolid(P.x+1, P.y, W, H) ?  1 :
  level.overlapsSolid(P.x-1, P.y, W, H) ? -1 : 0;

const feet = P => P.y + H;

/* ================= movement envelope ================= */
{
  level.loadRoom(flatRoom());
  const P = settle();
  const startY = P.y; let peak = startY;
  for(let f = 0; f < 180; f++){
    step(P, { jump: true });
    peak = Math.min(peak, P.y);
    if(P.grounded && f > 10) break;
  }
  const tiles = (startY-peak)/TILE;
  console.log(`max jump height : ${tiles.toFixed(2)} tiles`);
  check(tiles > 3.3 && tiles < 3.6, 'max jump drifted from ~3.45 tiles');
}
{
  level.loadRoom(flatRoom());
  const P = settle();
  const startY = P.y; let peak = startY;
  for(let f = 0; f < 180; f++){
    step(P, { jump: f < 1 });
    peak = Math.min(peak, P.y);
    if(P.grounded && f > 10) break;
  }
  const tiles = (startY-peak)/TILE;
  console.log(`min jump height : ${tiles.toFixed(2)} tiles`);
  check(tiles > 0.9 && tiles < 1.1, 'min jump drifted from ~1.01 tiles');
}
{
  level.loadRoom(flatRoom());
  const P = settle();
  for(let f = 0; f < 120; f++) step(P, { right: true });
  const startX = P.x;
  for(let f = 0; f < 240; f++){
    step(P, { right: true, jump: true });
    if(P.grounded && f > 10) break;
  }
  const tiles = (P.x-startX)/TILE;
  console.log(`jump range      : ${tiles.toFixed(2)} tiles`);
  check(tiles > 7.0 && tiles < 7.4, 'jump range drifted from ~7.20 tiles');
}

/* ============ single wall must be bounded ============ */
{
  const rows = Array.from({length: 30}, () => ' '.repeat(28) + '##');
  rows.push('#'.repeat(30));
  level.loadRoom({ id: 'oneWall', tiles: rows });
  const P = makePlayer();
  P.x = 28*TILE - W - 2; P.y = 30*TILE - H; P.px = P.x; P.py = P.y;
  for(let i = 0; i < 30; i++) step(P, {});
  const startFeet = feet(P); let minFeet = startFeet, jumpHeld = false;
  for(let f = 0; f < 900; f++){
    let jump = !jumpHeld;
    if(!P.grounded && touching(P) === 0) jump = jumpHeld;
    step(P, { right: true, jump });
    jumpHeld = jump;
    minFeet = Math.min(minFeet, feet(P));
  }
  const gained = (startFeet - minFeet)/TILE;
  console.log(`single-wall climb  : peak ${gained.toFixed(2)} tiles (bounded ${gained < 8 ? 'OK' : 'NO'})`);
  check(gained < 8, 'one wall must not be infinitely climbable');
}

/* ====== dash mechanics (synthetic 9-tile gap, gated) ====== */
function synthDashGap(dash){
  /* ledge cols 0-30, gap 31-39, landing 40-60, all at row 40 */
  const rows = Array.from({length: 39}, () => '');
  rows.push('P');
  rows.push('');
  rows.push('#'.repeat(31) + ' '.repeat(9) + '#'.repeat(21));
  level.loadRoom({ id: 'dashGap', tiles: rows });
  const P = makePlayer();
  P.x = 20*TILE; P.y = 41*TILE - H; P.px = P.x; P.py = P.y;
  P.abilities.dash = dash;
  for(let i = 0; i < 20; i++) step(P, {});
  let dashDone = false;
  for(let f = 0; f < 400; f++){
    const ctrl = { right: true };
    if(P.grounded ? P.x + W >= 31*TILE - 4 : true) ctrl.jump = true;
    if(!P.grounded && P.vy > 0.5 && !dashDone && dash){ ctrl.dash = true; dashDone = true; }
    step(P, ctrl);
    if(P.deaths > 0) return false;
    if(P.grounded && P.x >= 40*TILE) return true;
  }
  return false;
}
{
  const a = synthDashGap(true), b = synthDashGap(false);
  console.log(`dash mechanics     : with ${a ? 'CROSSED' : 'FAILED'}, without ${b ? 'CROSSED (BAD)' : 'blocked OK'}`);
  check(a && !b, 'dash must cross a 9-tile gap; without must not');
}

/* ====== barge mechanics (synthetic corridor, gated) ====== */
function synthBarge(barge){
  /* floor row 41, ceiling row 37, full-height hoarding at col 20 */
  const rows = Array.from({length: 37}, () => '');
  rows.push('#'.repeat(40));                                       // ceiling
  rows.push(' '.repeat(20) + 'H');
  rows.push('P' + ' '.repeat(19) + 'H');
  rows.push(' '.repeat(20) + 'H');
  rows.push('#'.repeat(40));                                       // floor
  level.loadRoom({ id: 'bargeHall', tiles: rows });
  const P = makePlayer();
  P.x = 8*TILE; P.y = 41*TILE - H; P.px = P.x; P.py = P.y;
  P.abilities.barge = barge;
  for(let i = 0; i < 20; i++) step(P, {});
  let barged = false;
  for(let f = 0; f < 600; f++){
    const ctrl = { right: true };
    if(!barged && P.grounded && P.x + W >= 20*TILE - 24){ ctrl.barge = true; barged = true; }
    step(P, ctrl);
    if(P.x >= 26*TILE) return true;
  }
  return false;
}
{
  const a = synthBarge(true), b = synthBarge(false);
  console.log(`barge mechanics    : with ${a ? 'BROKE THROUGH' : 'FAILED'}, without ${b ? 'PASSED (BAD)' : 'blocked OK'}`);
  check(a && !b, 'barge must break a hoarding wall; without must not');
}

/* ================================================================
   Estate-route proofs against the real level (v2: 360x56).
   ================================================================ */
function placeOnRoute(x, surfaceRow, abilities = {}){
  level.loadRoom(HIGHWALK);
  const P = makePlayer();
  P.x = x; P.y = surfaceRow*TILE - H; P.px = P.x; P.py = P.y;
  Object.assign(P.abilities, abilities);
  for(let i = 0; i < 20; i++) step(P, {});
  return P;
}

/* structural sanity of the generated level */
{
  level.loadRoom(HIGHWALK);
  const benches = [[7,47],[105,47],[190,31],[230,23],[224,5],[272,19],[328,47],[445,45]];
  check(benches.every(([x,y]) => level.tileAt(x,y) === 'B'), 'all eight benches present');
  check(level.tileAt(238,5) === 'K', 'the flat key waits on the roof');
  check(level.tileAt(130,48) === '-' && level.tileAt(133,48) === '-', 'scuffed line at secret');
  check(level.tileAt(70,53) === 'W', 'deep water under Gilbert Bridge');
  /* the ponds: waist-deep 'w' basin, no lethal 'W' anywhere east of 275 */
  check(level.tileAt(300,53) === 'w' && level.tileAt(405,53) === 'w', 'shallow water fills the basin');
  check(level.tileAt(300,54) === '#' && level.tileAt(405,54) === '#', 'brick bed under the basin');
  let lethalInBasin = false;
  for(let x = 275; x <= 451; x++) for(let y = 0; y < 56; y++)
    if(level.tileAt(x,y) === 'W') lethalInBasin = true;
  check(!lethalInBasin, 'no lethal water in the ponds basin');
  /* the Yellow Line stops dead at the water and resumes on the far bank */
  let lineOverWater = false;
  for(let x = 353; x <= 442; x++) for(let y = 0; y < 56; y++)
    if(level.tileAt(x,y) === '=') lineOverWater = true;
  check(!lineOverWater, 'no Yellow Line across the ponds');
  check(level.tileAt(352,48) === '=' && level.tileAt(353,48) === ' ', 'line stops dead at the water');
  check(level.tileAt(443,46) === '=', 'line resumes on the far bank');
  check(level.tileAt(359,50) === '#' && level.tileAt(409,50) === '#', 'island rims are plain brick');
  check(level.solidAt(373,46) && level.solidAt(398,47), 'foliage domes are solid');
  check((HIGHWALK.fountains || []).length === 8, 'the eight terrace fountains are placed');
  check(!level.solidAt(122,46) && !level.solidAt(122,47), 'service shaft east door');
  check(!level.solidAt(214,30) && !level.solidAt(214,31), 'tower west door');
  check(level.tileAt(213,27) === '<' && level.tileAt(213,3) === '<', 'balcony prows on the tower face');
}

/* generic wall-jump shaft climb policy (band offsets relative to exit) */
function climbShaft(P, exitY, exitMinX, maxFrames){
  let jumpHeld = false, minFeet = feet(P);
  for(let f = 0; f < maxFrames; f++){
    const ft = feet(P);
    const cleared = ft <= exitY - 2;
    const t = touching(P);
    let wantJump = false;
    if(P.grounded) wantJump = true;
    else if(cleared) wantJump = false;
    else if(t === 1)  wantJump = ft >= exitY + 39;
    else if(t === -1) wantJump = ft <= exitY + 26 || ft >= exitY + 54;
    const jump = wantJump ? !jumpHeld : jumpHeld;
    const dir = cleared ? 1 : (t !== 0 ? t : (P.grounded ? 1 : (P.vx < 0 ? -1 : 1)));
    step(P, { left: dir === -1, right: dir === 1, jump });
    jumpHeld = jump;
    minFeet = Math.min(minFeet, feet(P));
    if(P.grounded && Math.abs(feet(P) - exitY) < 1.2 && P.x >= exitMinX)
      return { done: true, frames: f+1, minFeet };
    if(P.deaths > 0) break;
  }
  return { done: false, frames: maxFrames, minFeet };
}

/* --- service shaft: entry walk, 16-tile climb, gated --- */
{
  const P = placeOnRoute(110*TILE, 48);
  for(let f = 0; f < 200 && P.x < 119*TILE; f++) step(P, { right: true });
  const ok = P.grounded && P.x >= 119*TILE && Math.abs(feet(P) - 48*TILE) < 1.2;
  console.log(`shaft entry        : ${ok ? 'walked in at ground level' : 'BLOCKED'}`);
  check(ok, 'shaft must be enterable on foot');
}
{
  const r = climbShaft(placeOnRoute(119*TILE + 2, 48), 32*TILE, 122*TILE, 1800);
  console.log('shaft w/ wall jump : ' + (r.done ? `CLIMBED 16 tiles in ${r.frames}f` : 'FAILED'));
  check(r.done, 'service shaft must be climbable');
}
{
  const r = climbShaft(placeOnRoute(119*TILE + 2, 48, { wallJump: false }), 32*TILE, 122*TILE, 900);
  console.log('shaft w/o ability  : ' + (r.done ? 'CLIMBED (BAD)' : 'blocked OK'));
  check(!r.done, 'service shaft must need the wall jump');
}

/* --- trench 1 escape --- */
{
  const P = placeOnRoute(21*TILE, 53);
  let jumpHeld = false, out = false;
  for(let f = 0; f < 600 && !out; f++){
    const t = touching(P);
    const jump = (P.grounded || t !== 0) ? !jumpHeld : jumpHeld;
    step(P, { right: true, jump });
    jumpHeld = jump;
    if(P.grounded && feet(P) <= 48*TILE + 1) out = true;
  }
  console.log(`trench escape      : ${out ? 'OUT via wall jumps' : 'STUCK'}`);
  check(out, 'intro trench must be escapable');
}

/* --- run-jump gap proofs --- */
function runJump(startX, surfaceRow, edgeX, landX, landRow, maxF = 300, hold = 99){
  const P = placeOnRoute(startX, surfaceRow);
  let air = 0;
  for(let f = 0; f < maxF; f++){
    const ctrl = { right: true };
    const nearEdge = P.grounded ? P.x + W >= edgeX - 4 : true;
    if(nearEdge){ if(!P.grounded) air++; ctrl.jump = air <= hold; }   // short hop when hold is small
    step(P, ctrl);
    if(P.deaths > 0) return false;
    if(P.grounded && P.x >= landX && Math.abs(feet(P) - landRow*TILE) < 1.2) return true;
  }
  return false;
}
function walkOff(startX, surfaceRow, landX, landRow, maxF = 300){
  const P = placeOnRoute(startX, surfaceRow);
  for(let f = 0; f < maxF; f++){
    step(P, { right: true });
    if(P.deaths > 0) return false;
    if(P.grounded && P.x >= landX && Math.abs(feet(P) - landRow*TILE) < 1.2) return true;
  }
  return false;
}
const gaps = [
  ['bridge gap (5)',        () => runJump(60*TILE, 48, 67*TILE, 72*TILE, 48)],
  ['bridge gap (6)->island',() => runJump(72*TILE, 48, 78*TILE, 84*TILE, 48)],
  ['island -> bridge (5)',  () => runJump(84*TILE, 48, 86*TILE, 91*TILE, 48)],
  ['highwalk gap (5)',      () => runJump(142*TILE, 32, 144*TILE, 149*TILE, 32)],
  ['highwalk gap (6)',      () => runJump(149*TILE, 32, 154*TILE, 160*TILE, 32)],
  ['deck -> cap (4)',       () => runJump(160*TILE, 32, 165*TILE, 169*TILE, 32)],
  ['cap -> cap (4)',        () => runJump(169*TILE, 32, 171*TILE, 175*TILE, 32)],
  ['cap -> deck (4)',       () => runJump(175*TILE, 32, 177*TILE, 181*TILE, 32)],
  ['stub hop -> terrace',   () => runJump(238*TILE, 6, 242*TILE, 249*TILE, 20, 400)],
  ['descent walk-off',      () => walkOff(271*TILE, 20, 278*TILE, 24)],
  /* --- the CENTRAL PONDS: every island hop, domes included --- */
  ['descent -> terrace',    () => runJump(318*TILE, 44, 323*TILE, 326*TILE, 48)],
  ['terrace -> I1 (6)',     () => runJump(340*TILE, 48, 353*TILE, 359*TILE, 50)],
  ['I1 dome hop',           () => runJump(359*TILE, 50, 361*TILE, 364*TILE, 50, 300, 8)],
  ['I1 -> I2 (4, rise 2)',  () => runJump(364*TILE, 50, 367*TILE, 370*TILE, 48)],
  ['I2 dome hop (tall)',    () => runJump(370*TILE, 48, 372*TILE, 376*TILE, 48, 300, 12)],
  ['I2 -> I3 (5)',          () => runJump(376*TILE, 48, 378*TILE, 383*TILE, 51)],
  ['I3 dome hop',           () => runJump(383*TILE, 51, 385*TILE, 388*TILE, 51, 300, 12)],
  ['I3 -> I4 (4, rise 2)',  () => runJump(388*TILE, 51, 391*TILE, 395*TILE, 49)],
  ['I4 dome hop (tall)',    () => runJump(395*TILE, 49, 397*TILE, 401*TILE, 49, 300, 12)],
  ['THE 6-GAP -> I5',       () => runJump(401*TILE, 49, 403*TILE, 409*TILE, 50)],
  ['I5 dome hop',           () => runJump(409*TILE, 50, 411*TILE, 413*TILE, 50, 300, 4)],
  ['I5 -> I6 (4)',          () => runJump(413*TILE, 50, 416*TILE, 419*TILE, 51)],
  ['I6 dome hop (tall)',    () => runJump(419*TILE, 51, 421*TILE, 425*TILE, 51, 300, 12)],
  ['I6 -> islet (4)',       () => runJump(425*TILE, 51, 428*TILE, 431*TILE, 50)],
  ['islet -> cascade',      () => runJump(431*TILE, 50, 435*TILE, 439*TILE, 49)],
];
for(const [name, fn] of gaps){
  const ok = fn();
  console.log(`${name.padEnd(19)}: ${ok ? 'crossed' : 'FAILED'}`);
  check(ok, `${name} must be passable`);
}

/* --- Cromwell Tower: entry, two-stage climb --- */
{
  const P = placeOnRoute(206*TILE, 32);
  for(let f = 0; f < 300 && P.x < 225*TILE; f++) step(P, { right: true });
  const ok = P.grounded && P.x >= 225*TILE && Math.abs(feet(P) - 32*TILE) < 1.2;
  console.log(`tower entry        : ${ok ? 'walked through the door' : 'BLOCKED'}`);
  check(ok, 'tower lobby must be walkable');
}
{
  const r = climbShaft(placeOnRoute(225*TILE, 32), 24*TILE, 228*TILE, 1200);
  console.log('tower shaft A      : ' + (r.done ? `CLIMBED to LEVEL 15 in ${r.frames}f` : 'FAILED'));
  check(r.done, 'shaft A must reach the LEVEL 15 mezzanine');
}
{
  const r = climbShaft(placeOnRoute(235*TILE, 24), 16*TILE, 238*TILE, 1200);
  console.log('tower shaft B      : ' + (r.done ? `CLIMBED to LEVEL 28 in ${r.frames}f` : 'FAILED'));
  check(r.done, 'shaft B must reach the LEVEL 28 slab');
}
{
  /* LEVEL 15 -> shaft B, ON FOOT: bench, hop the mouth gap onto the
     ledge, then climb — the path a player actually walks */
  const P = placeOnRoute(229*TILE, 24);
  let onLedge = false, air = 0;
  for(let f = 0; f < 300 && !onLedge; f++){
    const ctrl = { right: true };
    /* walk off the slab edge, then a COYOTE hop — the doorway's low
       ceiling means jumping early just bonks */
    if(!P.grounded && P.x > 233*TILE){ air++; ctrl.jump = air <= 9; }
    step(P, ctrl);
    if(P.grounded && P.x >= 236*TILE - 2 && Math.abs(feet(P) - 24*TILE) < 1.2) onLedge = true;
  }
  let up = { done: false };
  if(onLedge) up = climbShaft(P, 16*TILE, 238*TILE, 1200);
  console.log(`mezz -> shaft B    : ${onLedge ? 'ledge reached on foot' : 'LEDGE UNREACHABLE'}, ${up.done ? 'climbed to LEVEL 28' : 'CLIMB FAILED'}`);
  check(onLedge && up.done, 'shaft B must be enterable on foot from the LEVEL 15 bench');
}
{
  /* LEVEL 28: jump back west over the shaft-B mouth (cols 234-237) */
  const P = placeOnRoute(241*TILE, 16);
  let ok = false;
  for(let f = 0; f < 400 && !ok; f++){
    const ctrl = { left: true };
    if(P.grounded ? P.x <= 238*TILE + 6 : true) ctrl.jump = true;
    step(P, ctrl);
    if(P.deaths > 0) break;
    if(P.grounded && P.x <= 230*TILE && Math.abs(feet(P) - 16*TILE) < 1.2) ok = true;
  }
  console.log(`mouth cross (west) : ${ok ? 'crossed' : 'FAILED'}`);
  check(ok, 'the shaft-B mouth must be jumpable heading west');
}
{
  /* falling into the shaft-B mouth must not be a softlock: the 234-237
     slot climbs back to LEVEL 28 from the lobby floor */
  const P = placeOnRoute(235*TILE, 16);          // stand over the mouth...
  for(let f = 0; f < 200 && feet(P) < 32*TILE - 1; f++) step(P, {});   // ...and drop it
  const fell = Math.abs(feet(P) - 32*TILE) < 1.2;
  const r0 = climbShaft(P, 16*TILE, 238*TILE, 1200);
  console.log(`mouth recovery     : ${fell ? 'fell to the lobby floor' : 'NO FALL'}, ${r0.done ? 'climbed back OK' : 'STUCK (softlock!)'}`);
  check(fell && r0.done, 'the mouth drop must be recoverable');
}
{
  const r = climbShaft(placeOnRoute(217*TILE, 16), 6*TILE, 220*TILE, 1200);
  console.log('tower shaft C      : ' + (r.done ? `CLIMBED to the roof in ${r.frames}f` : 'FAILED'));
  check(r.done, 'shaft C must reach the roof');
}
{
  /* the roof: walk from the exit to the key; picking it up sets the flag */
  const P = placeOnRoute(222*TILE, 6);
  for(let f = 0; f < 300 && !P.keys.flat; f++) step(P, { right: true });
  console.log(`flat key           : ${P.keys.flat ? 'PICKED UP on the roof' : 'NOT REACHED'}`);
  check(P.keys.flat, 'the flat key must be collectable on the roof');
  check(level.tileAt(238,5) === ' ', 'the key disappears once taken');
}

/* --- secret alcove: drop in, step up, jump out --- */
{
  const P = placeOnRoute(131*TILE, 48);
  let inAlcove = false;
  for(let f = 0; f < 300 && !inAlcove; f++){
    step(P, { right: true });
    if(P.grounded && Math.abs(feet(P) - 52*TILE) < 1.2) inAlcove = true;
  }
  let onStep = false;
  for(let f = 0; f < 300 && !onStep; f++){
    step(P, { right: true, jump: P.grounded || P.vy < 0 });
    if(P.grounded && Math.abs(feet(P) - 49*TILE) < 1.2) onStep = true;
  }
  for(let f = 0; f < 60 && !(P.grounded && P.vx <= 0); f++) step(P, { left: true });
  let out = false;
  for(let f = 0; f < 300 && !out; f++){
    step(P, { left: true, jump: f < 22 });
    if(f > 22 && P.grounded && Math.abs(feet(P) - 48*TILE) < 1.2 && P.x < 134*TILE) out = true;
  }
  console.log(`secret alcove      : ${inAlcove ? 'entered' : 'MISSED'}, ${onStep ? 'stepped up' : 'NO STEP'}, ${out ? 'escaped' : 'STUCK'}`);
  check(inAlcove && onStep && out, 'alcove must be enterable and escapable');
}

/* --- water kills; benches set the respawn point --- */
{
  const P = placeOnRoute(5*TILE, 48);
  for(let f = 0; f < 40; f++) step(P, { right: true });
  const marked = Math.abs(P.checkpoint.x - 7*TILE) < 0.5;
  P.x = 60*TILE; P.px = P.x;
  for(let f = 0; f < 300 && P.deaths === 0; f++) step(P, { right: true });
  const atBench = Math.abs(P.x - 7*TILE) < 2;
  console.log(`water + checkpoint : bench ${marked ? 'marked' : 'NOT MARKED'}, ` +
    `${P.deaths > 0 ? 'drowned' : 'NO DEATH'}, respawned ${atBench ? 'at bench' : 'ELSEWHERE (BAD)'}`);
  check(marked && P.deaths > 0 && atBench, 'water must kill and respawn at the last bench');
}


/* ================================================================
   Arts Centre proofs (level 2) — appended; nothing above changed.
   ================================================================ */
import { ARTSCENTRE } from '../levels/artscentre.js';

function placeInArts(x, surfaceRow, abilities = {}){
  level.loadRoom(ARTSCENTRE);
  const P = makePlayer();
  P.x = x; P.y = surfaceRow*TILE - H; P.px = P.x; P.py = P.y;
  Object.assign(P.abilities, abilities);
  for(let i = 0; i < 20; i++) step(P, {});
  return P;
}

/* run right, jump at the edge, expect to land on [landX..] at landRow */
function runJumpArts(startX, surfaceRow, edgeX, landX, landRow, opts = {}){
  const P = placeInArts(startX, surfaceRow, opts.abilities || {});
  let dashDone = false;
  for(let f = 0; f < (opts.maxF || 400); f++){
    const ctrl = { right: true };
    if(P.grounded ? P.x + W >= edgeX - 4 : true) ctrl.jump = true;
    if(opts.dash && !P.grounded && P.vy > 0.5 && !dashDone){ ctrl.dash = true; dashDone = true; }
    step(P, ctrl);
    if(P.deaths > 0) return false;
    if(P.grounded && P.x >= landX && Math.abs(feet(P) - landRow*TILE) < 1.2) return true;
  }
  return false;
}

/* walk to |x - targetX| < 2 on the current surface, no jumping */
function walkTo(P, targetX, maxF = 300){
  for(let f = 0; f < maxF; f++){
    if(Math.abs(P.x - targetX) < 2 && P.grounded){
      for(let i = 0; i < 30 && Math.abs(P.vx) > 0.01; i++) step(P, {});
      return true;
    }
    step(P, { left: P.x > targetX, right: P.x < targetX });
    if(P.deaths > 0) return false;
  }
  return false;
}

/* one full-height hop in `dir`, expect to land on [x0..x1] at row.
   With `edgePx` set, run along the surface first and launch at the
   edge (carries ground speed into the jump). */
function hop(P, dir, row, x0, x1, maxF = 200, edgePx = null){
  let launch = edgePx === null ? 0 : -1;
  for(let f = 0; f < maxF; f++){
    if(launch < 0){
      const atEdge = dir === 'right' ? P.x + W >= edgePx - 4 : P.x <= edgePx + 4;
      if(atEdge || !P.grounded) launch = f;
    }
    const jumping = launch >= 0 && f - launch < 22;
    step(P, { [dir]: true, jump: jumping });
    if(P.deaths > 0) return false;
    if(launch >= 0 && f > launch + 4 && P.grounded &&
       Math.abs(feet(P) - row*TILE) < 1.2 &&
       P.x >= x0*TILE - 2 && P.x + W <= (x1+1)*TILE + 2) return true;
  }
  return false;
}

/* wall-jump a channel upward until standing at feet <= exitRow*TILE,
   drifting `out` (-1 left / +1 right) once above the lip; `hug` is the
   wall pressed against for the first jump (and whenever adrift) */
function climbChannelA(P, exitRow, out, hug, maxF = 1500){
  let jumpHeld = false;
  const drift = () => P.vx < -0.05 ? -1 : (P.vx > 0.05 ? 1 : hug);
  for(let f = 0; f < maxF; f++){
    const t = touching(P);
    const cleared = feet(P) <= exitRow*TILE + 2;
    let dir, jump;
    if(cleared && !P.grounded){ dir = out; jump = P.vy < 0 && jumpHeld; }
    else if(P.grounded){ dir = t !== 0 ? t : hug; jump = !jumpHeld; }   // press off the floor
    else if(t !== 0){ dir = t; jump = !jumpHeld; }                      // pump against the wall
    else if(P.vy < 0){ dir = drift(); jump = true; }                    // hold through ascent
    else { dir = drift(); jump = false; }
    step(P, { left: dir === -1, right: dir === 1, jump });
    jumpHeld = jump;
    if(P.deaths > 0) return false;
    if(P.grounded && feet(P) <= exitRow*TILE + 1.2) return true;
  }
  return false;
}

/* --- structural sanity --- */
{
  level.loadRoom(ARTSCENTRE);
  check(level.tileAt(7,45) === 'B' && level.tileAt(92,49) === 'B' &&
        level.tileAt(172,45) === 'B' && level.tileAt(216,45) === 'B', 'arts: all four benches present');
  check(level.tileAt(180,44) === '-', 'arts: scuffed line on the bar counter');
  check(level.tileAt(158,45) === '*' && !level.solidAt(158,45), 'arts: dash pickup present and non-solid');
  check(level.tileAt(348,45) === 'E' && !level.solidAt(348,45), 'arts: exit tile present and non-solid');
  check(level.solidAt(96,10) && level.tileAt(96,10) === 'F', 'arts: grid catwalk solid');
  check(level.tileAt(70,47) === 's' && !level.solidAt(70,47), 'arts: seat rows are decor only');
  console.log('arts structure     : benches, scuffed line, pickup, seats, exit OK');
}

/* --- foyer: entry walk + 4-tile lightwell gap + landing hop --- */
{
  const a = runJumpArts(18*TILE, 46, 25*TILE, 29*TILE, 46);
  const b = runJumpArts(40*TILE, 46, 46*TILE, 46*TILE, 44);   // +2 onto the landing
  console.log(`foyer route        : lightwell gap ${a ? 'crossed' : 'FAILED'}, landing ${b ? 'climbed' : 'FAILED'}`);
  check(a && b, 'foyer gap and landing must be passable');
}

/* --- foyer lightwell kills; respawn at bench 1 --- */
{
  const P = placeInArts(5*TILE, 46);
  for(let f = 0; f < 40; f++) step(P, { right: true });            // cross the bench
  const marked = Math.abs(P.checkpoint.x - 7*TILE) < 0.5;
  walkTo(P, 22*TILE);
  for(let f = 0; f < 300 && P.deaths === 0; f++) step(P, { right: true });  // stroll into the void
  const atBench = Math.abs(P.x - 7*TILE) < 2;
  console.log(`foyer void         : bench ${marked ? 'marked' : 'NOT MARKED'}, ${P.deaths > 0 ? 'died' : 'NO DEATH'}, respawn ${atBench ? 'at bench' : 'WRONG'}`);
  check(marked && P.deaths > 0 && atBench, 'foyer void must kill and respawn at bench 1');
}

/* --- stalls: down the rake, over the orchestra pit (6) onto the stage --- */
{
  const P = placeInArts(62*TILE, 46);
  let onAisle = false;
  for(let f = 0; f < 400 && !onAisle; f++){
    step(P, { right: true });
    if(P.grounded && Math.abs(feet(P) - 50*TILE) < 1.2 && P.x >= 78*TILE) onAisle = true;
  }
  let onStage = false;
  if(onAisle){
    walkTo(P, 80*TILE);
    for(let f = 0; f < 300 && !onStage; f++){
      const ctrl = { right: true };
      if(P.grounded ? P.x + W >= 85*TILE - 4 : true) ctrl.jump = true;
      step(P, ctrl);
      if(P.deaths > 0) break;
      if(P.grounded && P.x >= 91*TILE && Math.abs(feet(P) - 50*TILE) < 1.2) onStage = true;
    }
  }
  console.log(`orchestra pit      : rake ${onAisle ? 'descended' : 'BLOCKED'}, pit ${onStage ? 'jumped onto stage' : 'FAILED'}`);
  check(onAisle && onStage, 'stalls rake and pit jump must work');
}

/* --- orchestra pit kills --- */
{
  const P = placeInArts(80*TILE, 50);
  for(let f = 0; f < 300 && P.deaths === 0; f++) step(P, { right: true });
  console.log(`pit is lethal      : ${P.deaths > 0 ? 'died walking in' : 'SURVIVED (BAD)'}`);
  check(P.deaths > 0, 'orchestra pit must kill');
}

/* --- flytower ascent: fly bars + counterweight channel + the grid --- */
function flytowerAscent(abilities){
  const P = placeInArts(93*TILE, 50, abilities);
  const hops = [
    /* [standX(tile), dir, landRow, landX0, landX1] */
    [91.2, 'right', 47,  93,  97],   // stage → bar A
    [96,   'right', 44, 100, 104],   // A → B
    [103,  'right', 41, 107, 111],   // B → C
    [110,  'right', 38, 113, 117],   // C → D
  ];
  for(const [sx, dir, row, x0, x1] of hops){
    if(!walkTo(P, sx*TILE)) return { fail: `walk to ${sx}` };
    if(!hop(P, dir, row, x0, x1)) return { fail: `hop to row ${row}` };
  }
  /* enter the channel (cols 116..119) and wall-jump to the gallery bar */
  if(!walkTo(P, 117*TILE)) return { fail: 'walk to channel' };
  if(!climbChannelA(P, 22, -1, 1)) return { fail: 'channel climb' };
  /* gallery bars leftward, then up right onto the grid */
  const hops2 = [
    [108,  'left', 19, 100, 105, null],           // E → F
    [101,  'left', 16,  94,  99, null],           // F → G
    [95,   'left', 13,  91,  93, null],           // G → H
    [91.2,'right', 10,  96, 126, 94*TILE],        // H → the grid (run-up launch)
  ];
  for(const [sx, dir, row, x0, x1, edge] of hops2){
    if(!walkTo(P, sx*TILE)) return { fail: `walk to ${sx}` };
    if(!hop(P, dir, row, x0, x1, 200, edge)) return { fail: `hop to row ${row}` };
  }
  /* cross the grid, drop the far channel, land on the dock floor */
  for(let f = 0; f < 1600; f++){
    step(P, { right: true });
    if(P.deaths > 0) return { fail: 'died in descent' };
    if(P.grounded && Math.abs(feet(P) - 46*TILE) < 1.2 && P.x >= 131*TILE)
      return { done: true, frames: f };
  }
  return { fail: 'never reached the dock' };
}
{
  const r = flytowerAscent({});
  console.log('flytower ascent    : ' + (r.done ? 'stage → grid → dock (fly bars + channel)' : `FAILED at ${r.fail}`));
  check(r.done, 'flytower must be climbable with wall jump (no dash)');
}

/* --- dash pickup: unmissable on the dock walking line --- */
{
  const P = placeInArts(140*TILE, 46);
  check(!P.abilities.dash, 'arts: player starts without dash');
  for(let f = 0; f < 300 && !P.abilities.dash; f++) step(P, { right: true });
  console.log(`dash pickup        : ${P.abilities.dash ? 'granted on touch' : 'NOT PICKED UP'}`);
  check(P.abilities.dash, 'walking the dock must grant the dash');
}

/* --- Martini Bar: counter hop + hole jump on the main path --- */
{
  const a = runJumpArts(172*TILE, 46, 177*TILE, 178*TILE, 44);      // onto the counter
  const b = runJumpArts(179*TILE, 44, 186*TILE, 190*TILE, 46);      // over the cellar hole
  console.log(`bar main path      : counter ${a ? 'mounted' : 'FAILED'}, hole ${b ? 'cleared' : 'FAILED'}`);
  check(a && b, 'bar counter and cellar hole must be passable');
}

/* --- cellar secret: drop in behind the counter, wall-jump out --- */
{
  const P = placeInArts(180*TILE, 44);                              // standing on the counter
  let inCellar = false;
  for(let f = 0; f < 400 && !inCellar; f++){
    step(P, { right: P.x < 186.5*TILE });                           // ease off the back
    if(P.grounded && Math.abs(feet(P) - 54*TILE) < 1.2) inCellar = true;
  }
  let out = false;
  if(inCellar){
    walkTo(P, 186*TILE);
    out = climbChannelA(P, 46, 1, -1);
  }
  console.log(`cellar secret      : ${inCellar ? 'entered' : 'MISSED'}, ${out ? 'escaped by wall jump' : 'STUCK'}`);
  check(inCellar && out, 'cellar must be enterable and escapable');
}

/* --- Cinema 1: every gap needs the dash --- */
const CINE_GAPS = [
  ['gap 1 (9)', 214*TILE, 46, 225*TILE, 234*TILE, 47],
  ['gap 2 (9)', 236*TILE, 47, 249*TILE, 258*TILE, 48],
  ['gap 3 (8)', 262*TILE, 48, 273*TILE, 281*TILE, 48],
];
for(const [name, sx, srow, edge, lx, lrow] of CINE_GAPS){
  const withDash = runJumpArts(sx, srow, edge, lx, lrow, { abilities: { dash: true }, dash: true });
  const without  = runJumpArts(sx, srow, edge, lx, lrow, {});
  console.log(`cinema ${name}   : with dash ${withDash ? 'crossed' : 'FAILED'}, without ${without ? 'CROSSED (BAD)' : 'blocked OK'}`);
  check(withDash && !without, `cinema ${name} must need the dash`);
}

/* --- from the last bench to the way out --- */
{
  const P = placeInArts(216*TILE, 46, { dash: true });
  for(let f = 0; f < 40; f++) step(P, {});                          // rest at bench 4
  const marked = Math.abs(P.checkpoint.x - 216*TILE) < 8.1;
  let dashArmed = true, reachedExit = false;
  for(let f = 0; f < 3000 && !reachedExit; f++){
    const ctrl = { right: true };
    const nearGap = CINE_GAPS.some(([,,, e]) => P.grounded && P.x + W >= e - 4 && P.x < e + 8);
    if(nearGap || !P.grounded) ctrl.jump = true;
    if(!P.grounded && P.vy > 0.5 && dashArmed){ ctrl.dash = true; dashArmed = false; }
    if(P.grounded) dashArmed = true;
    step(P, ctrl);
    if(P.deaths > 0) break;
    if(level.overlapsChar(P.x, P.y, W, H, 'E')) reachedExit = true;
  }
  console.log(`bench 4 → way out  : ${marked ? 'bench marked' : 'BENCH NOT MARKED'}, ${reachedExit ? 'reached the exit' : 'NEVER ARRIVED'}`);
  check(marked && reachedExit, 'exit must be reachable from the last bench with dash');
}

/* --- world flow: arts exit leads on to the conservatory (with dash) --- */
{
  const { initWorld, checkExit } = await import('../src/world.js');
  initWorld('arts-centre');
  const P = makePlayer();
  P.x = 348*TILE; P.y = 47*TILE - H; P.px = P.x; P.py = P.y;   // inside the exit door
  checkExit(P);
  const swapped = level.currentRoom().id === 'conservatory';
  const atSpawn = Math.abs(P.x - level.spawn.x) < 0.5 && Math.abs(P.checkpoint.x - level.spawn.x) < 0.5;
  const dashKept = P.abilities.dash === true;   // room grants keep the dash for standalone starts
  console.log(`world flow         : exit ${swapped ? 'leads to the conservatory' : 'DID NOT SWITCH'}, spawn ${atSpawn ? '+ checkpoint reset' : 'WRONG'}, dash ${dashKept ? 'granted' : 'MISSING'}`);
  check(swapped && atSpawn && dashKept, 'E tile must advance the world and grant room abilities');
}


/* --- the ponds are waist-deep: falling in wades, never kills --- */
{
  const P = placeOnRoute(407*TILE, 54);          // standing on the basin bed
  let maxWade = 0;
  for(let f = 0; f < 60; f++){ step(P, { right: true }); maxWade = Math.max(maxWade, Math.abs(P.vx)); }
  const capped = maxWade <= 0.81 && maxWade >= 0.6;
  console.log(`wading speed       : ${maxWade.toFixed(2)} px/f (dry max 1.60) ${capped ? 'SLOWED' : 'NOT SLOWED'}`);
  check(capped, 'wading must cap run speed at ~50%');
  check(P.wading && P.deaths === 0, 'shallow water must not kill');
}

/* --- a wader can climb back out at a brick edge (pocket below the 6-gap) --- */
{
  const P = placeOnRoute(407*TILE, 54);
  for(let f = 0; f < 300 && P.x > 404*TILE + 1; f++) step(P, { left: true });   // wade west to the step
  const atStep = P.x <= 404*TILE + 2;
  for(let f = 0; f < 90; f++) step(P, { left: true, jump: f < 30 });            // soggy hop onto it
  const onStep = P.grounded && Math.abs(feet(P) - 52*TILE) < 1.2;
  for(let f = 0; f < 120; f++) step(P, { left: true, jump: f < 26 });           // dry jump up to I4's rim
  const onRim = P.grounded && Math.abs(feet(P) - 49*TILE) < 1.2 && P.x <= 402*TILE + 4;
  console.log(`wade-out           : ${atStep ? 'waded to step' : 'STUCK IN WATER'}, ` +
    `${onStep ? 'mounted step' : 'NO STEP'}, ${onRim ? 'back on island 4' : 'NOT ON RIM'}, deaths ${P.deaths}`);
  check(atStep && onStep && onRim && P.deaths === 0, 'a splash must be recoverable at a brick edge');
}

/* --- soggy jumps: from the water you cannot mount a 3-tile rise --- */
{
  const P = placeOnRoute(407*TILE, 54);          // bed; island 5 face (rim 50) is 4 east
  let mounted = false, jumpHeld = false;
  for(let f = 0; f < 400; f++){
    const jump = P.grounded ? !jumpHeld : jumpHeld;
    step(P, { right: true, jump });
    jumpHeld = jump;
    if(P.grounded && feet(P) <= 50*TILE + 1) mounted = true;
  }
  console.log(`soggy jump         : island rim from the water ${mounted ? 'MOUNTED (BAD)' : 'out of reach OK'}`);
  check(!mounted, 'a 3-tile rim must be unreachable straight from the water');
}

/* --- the cascade climb: step1 -> step2 -> step3 -> the way out bench --- */
{
  const P = placeOnRoute(437*TILE, 51);
  let jumpHeld = false, out = false;
  for(let f = 0; f < 900 && !out; f++){
    const belowTop = feet(P) > 46*TILE + 0.5;
    const jump = P.grounded ? (belowTop && !jumpHeld) : jumpHeld;
    step(P, { right: true, jump });
    jumpHeld = jump;
    if(P.deaths > 0) break;
    if(P.grounded && P.x >= 445*TILE && Math.abs(feet(P) - 46*TILE) < 1.2) out = true;
  }
  for(let f = 0; f < 30; f++) step(P, { left: true });   // stroll back over the bench
  const rested = Math.abs(P.checkpoint.x - 445*TILE) < 0.5;
  console.log(`cascade climb      : ${out ? 'CLIMBED to the way out' : 'FAILED'}, bench ${rested ? 'marked' : 'NOT MARKED'}`);
  check(out, 'the cascade steps must be climbable to the way out');
  check(rested, 'the way-out bench must set the checkpoint');
}

/* ================================================================
   Conservatory proofs (level 3, 336x60). Player arrives with
   wallJump + dash. All mandatory dash gaps are 9 tiles — proven
   above the no-dash coyote-abuse envelope (8 is crossable, 9 not).
   ================================================================ */
function placeC(x, surfaceRow, abilities = {}){
  level.loadRoom(CONSERVATORY);
  const P = makePlayer();
  P.x = x; P.y = surfaceRow*TILE - H; P.px = P.x; P.py = P.y;
  Object.assign(P.abilities, { dash: true }, abilities);
  for(let i = 0; i < 20; i++) step(P, {});
  return P;
}

/* structural sanity of the generated level */
{
  level.loadRoom(CONSERVATORY);
  const benches = [[8,51],[113,51],[131,35],[204,23]];
  check(benches.every(([x,y]) => level.tileAt(x,y) === 'B'), 'conservatory: all four benches present');
  check(level.tileAt(130,52) === '-' && level.tileAt(133,52) === '-', 'conservatory: scuffed line at secret');
  check(level.tileAt(27,54) === 'W' && level.tileAt(60,54) === 'W', 'conservatory: koi ponds present');
  check([[240,23],[257,26],[273,29],[293,29],[309,32]].every(([x,y]) => level.tileAt(x,y) === '^'),
        'conservatory: arid house cacti placed');
  check(level.tileAt(334,40) === 'E' && level.tileAt(335,41) === 'E', 'conservatory: exit door present');
  check(!level.solidAt(122,50) && !level.solidAt(122,51), 'conservatory: shaft A west door');
  check(!level.solidAt(128,50) && !level.solidAt(128,51), 'conservatory: shaft A east door');
  check(!level.solidAt(134,34) && !level.solidAt(134,35), 'conservatory: shaft B door');
  check(level.solidAt(60,52) && level.solidAt(175,24), 'conservatory: vine platforms are solid');
  check(!level.solidAt(241,23) && !level.solidAt(334,40), 'conservatory: cacti and exit are non-solid');
}

/* --- entry walk + arrival abilities --- */
{
  const P = placeC(2*TILE, 52);
  check(P.abilities.dash === true, 'conservatory: default proof player has the dash');
  for(let f = 0; f < 200 && P.x < 20*TILE; f++) step(P, { right: true });
  const ok = P.grounded && P.x >= 20*TILE && Math.abs(feet(P) - 52*TILE) < 1.2;
  console.log(`cons entry walk    : ${ok ? 'walked the entrance terrace' : 'BLOCKED'}`);
  check(ok, 'conservatory entrance must be walkable');
}

/* --- generic conservatory hop: run right, jump at edge, dash mid-air --- */
function hopC(P, edgeX, landMinX, landRow, dashDelay = 3, maxF = 400){
  let air = -1, dashed = false;
  for(let f = 0; f < maxF; f++){
    const ctrl = { right: true };
    if(P.grounded ? P.x + W >= edgeX - 4 : true) ctrl.jump = true;
    if(!P.grounded){
      air++;
      if(!dashed && air >= dashDelay && P.abilities.dash){ ctrl.dash = true; dashed = true; }
    }
    step(P, ctrl);
    if(P.deaths > 0) return false;
    if(P.grounded && P.x >= landMinX && Math.abs(feet(P) - landRow*TILE) < 1.2) return true;
  }
  return false;
}

/* adversarial no-dash bot: edge jumps at several offsets + coyote-delay jumps */
function noDashCrossesC(startX, row, edgeX, landMinX, landRow){
  for(let delay = 0; delay <= 7; delay++)
    for(const off of [4, 2, 0]){
      const P = placeC(startX, row, { dash: false });
      let air = -1, ok = false;
      for(let f = 0; f < 400 && !ok; f++){
        const ctrl = { right: true };
        if(P.grounded){
          if(delay === 0 && P.x + W >= edgeX - off) ctrl.jump = true;
          air = -1;
        }else{
          air++;
          if(delay === 0 || air >= delay - 1) ctrl.jump = true;
        }
        step(P, ctrl);
        if(P.deaths > 0) break;
        if(P.grounded && P.x >= landMinX && Math.abs(feet(P) - landRow*TILE) < 1.2) ok = true;
      }
      if(ok) return true;
    }
  return false;
}

/* --- dash gap classes: passable with dash, blocked without --- */
const dashGapsC = [
  ['pond 1 (9, runway)',    4*TILE, 52,  23*TILE,  32*TILE, 52],
  ['vine hop (9, vine)',   58*TILE, 52,  63*TILE,  72*TILE, 52],
  ['roof walk (9, deck)', 150*TILE, 24, 165*TILE, 174*TILE, 24],
  ['arid dash (9)',       275*TILE, 30, 279*TILE, 288*TILE, 30],
];
for(const [name, sx, row, edgeX, landX, landRow] of dashGapsC){
  const P = placeC(sx, row);
  const a = hopC(P, edgeX, landX, landRow);
  const b = noDashCrossesC(sx, row, edgeX, landX, landRow);
  console.log(`cons ${name.padEnd(19)}: with dash ${a ? 'crossed' : 'FAILED'}, without ${b ? 'CROSSED (BAD)' : 'blocked OK'}`);
  check(a && !b, `conservatory ${name} must need the dash`);
}

/* --- vine chains: koi court (52) and roof walk (24), dash refresh per landing --- */
function chainC(startX, row, targetX, maxF = 4000){
  const P = placeC(startX, row);
  let air = -1, dashed = false, landings = 0, wasGrounded = true;
  for(let f = 0; f < maxF; f++){
    const ctrl = { right: true };
    if(P.grounded){
      if(!wasGrounded) landings++;
      wasGrounded = true; air = -1; dashed = false;
      /* +1: after a dash landing, feet can rest a fraction above the tile */
      const footTy = Math.floor((P.y + H + 1)/TILE);
      const aheadTx = Math.floor((P.x + W + 2)/TILE);
      if(!level.solidAt(aheadTx, footTy)) ctrl.jump = true;
    }else{
      wasGrounded = false; air++;
      ctrl.jump = true;
      if(!dashed && air >= 3){ ctrl.dash = true; dashed = true; }
    }
    step(P, ctrl);
    if(P.deaths > 0) return { done: false, landings };
    if(P.grounded && P.x >= targetX) return { done: true, landings };
  }
  return { done: false, landings };
}
{
  const r = chainC(34*TILE, 52, 112*TILE);
  console.log(`cons koi court     : ${r.done ? `chained the vines (${r.landings} landings)` : 'DROWNED/'+r.landings}`);
  check(r.done && r.landings >= 4, 'koi court vine chain must be crossable, one dash per hop');
}
{
  const r = chainC(145*TILE, 24, 236*TILE + 2);
  console.log(`cons roof walk     : ${r.done ? `crossed under the glass (${r.landings} landings)` : 'FELL/'+r.landings}`);
  check(r.done && r.landings >= 4, 'roof walk chain must be crossable');
}

/* --- shaft A: enterable, 16-tile wall-jump climb, gated --- */
{
  const P = placeC(112*TILE, 52);
  for(let f = 0; f < 200 && P.x < 124*TILE; f++) step(P, { right: true });
  const ok = P.grounded && P.x >= 124*TILE && Math.abs(feet(P) - 52*TILE) < 1.2;
  console.log(`cons shaft A entry : ${ok ? 'walked in at ground level' : 'BLOCKED'}`);
  check(ok, 'shaft A must be enterable on foot');
}
{
  const r = climbShaft(placeC(124*TILE + 2, 52), 36*TILE, 128*TILE, 1800);
  console.log('cons shaft A       : ' + (r.done ? `CLIMBED 16 tiles in ${r.frames}f` : 'FAILED'));
  check(r.done, 'shaft A must reach the mezzanine');
}
{
  const r = climbShaft(placeC(124*TILE + 2, 52, { wallJump: false }), 36*TILE, 128*TILE, 900);
  console.log('cons shaft A gate  : ' + (r.done ? 'CLIMBED (BAD)' : 'blocked without wall jump OK'));
  check(!r.done, 'shaft A must need the wall jump');
}

/* --- mezzanine door walk + shaft B climb to the flytower roof --- */
{
  const P = placeC(129*TILE, 36);
  for(let f = 0; f < 200 && P.x < 137*TILE; f++) step(P, { right: true });
  const ok = P.grounded && P.x >= 137*TILE && Math.abs(feet(P) - 36*TILE) < 1.2;
  console.log(`cons shaft B door  : ${ok ? 'walked through' : 'BLOCKED'}`);
  check(ok, 'shaft B door must be walkable');
}
{
  const r = climbShaft(placeC(137*TILE, 36), 24*TILE, 140*TILE, 1800);
  console.log('cons shaft B       : ' + (r.done ? `CLIMBED to the flytower roof in ${r.frames}f` : 'FAILED'));
  check(r.done, 'shaft B must reach the flytower roof');
}
{
  const r = climbShaft(placeC(137*TILE, 36, { wallJump: false }), 24*TILE, 140*TILE, 900);
  console.log('cons shaft B gate  : ' + (r.done ? 'CLIMBED (BAD)' : 'blocked without wall jump OK'));
  check(!r.done, 'shaft B must need the wall jump');
}

/* --- Arid House: scripted crossing, no cactus touched (0 deaths) --- */
{
  /* Existence proof by stage-wise search: from each grounded waypoint,
     sweep (trigger x, jump hold / dash delay) until one lands in the next
     safe window with zero deaths — i.e. an input sequence exists that
     crosses the whole Arid House without touching a cactus. */
  function runStageC(S0, act, winX0, winX1, winRow){
    const P = structuredClone(S0);
    let fired = false, air = -1, dashed = false, hold = 0;
    for(let f = 0; f < 400; f++){
      const ctrl = { right: true };
      if(!fired && P.grounded && P.x + W >= act.trig){
        fired = true; hold = act.dash ? 99 : act.hold;
      }
      if(fired){
        if(hold > 0){ ctrl.jump = true; hold--; }
        if(!P.grounded){
          air++;
          if(act.dash && !dashed && air >= act.dd){ ctrl.dash = true; dashed = true; }
        }
      }
      step(P, ctrl);
      if(P.deaths > S0.deaths) return null;
      if(fired && air >= 0 && P.grounded &&
         P.x >= winX0 && P.x <= winX1 && Math.abs(feet(P) - winRow*TILE) < 1.2)
        return P;
    }
    return null;
  }
  /* [name, trigger sweep (tiles), holds (null = dash), window x0..x1, row] */
  const aridStages = [
    ['hop 240',    [236,239], [5,6,7,8,9,10],     241.5, 244.5, 24],
    ['gap to T2',  [245,246], [8,10,12,14,16,18], 249,   254.2, 27],
    ['hop 257',    [253,256], [5,6,7,8,9,10],     258.5, 260.5, 27],
    ['gap to T3',  [261,262], [8,10,12,14,16,18], 268,   270.2, 30],
    ['hop 273',    [269,272], [5,6,7,8,9,10],     274.5, 276.5, 30],
    ['dash to T4', [277,278], null,               288,   290.5, 30],
    ['hop 293',    [289,292], [5,6,7,8,9,10],     294.5, 296.5, 30],
    ['gap to T5',  [297,298], [8,10,12,14,16,18], 304,   306.2, 33],
    ['hop 309',    [305,308], [5,6,7,8,9,10],     310.5, 312.5, 33],
    ['gap to ledge',[313,314],[10,12,14,16,18,20],320,   325,   37],
  ];
  let S = placeC(236*TILE, 24);
  let stuck = null;
  for(const [name, [t0,t1], holds, x0, x1, row] of aridStages){
    let next = null;
    outer:
    for(let trig = t0*TILE; trig <= t1*TILE && !next; trig += 2){
      if(holds === null){
        for(const dd of [2,3,4,5,6]){
          next = runStageC(S, { trig, dash: true, dd }, x0*TILE, x1*TILE, row);
          if(next) break outer;
        }
      }else{
        for(const hold of holds){
          next = runStageC(S, { trig, hold }, x0*TILE, x1*TILE, row);
          if(next) break outer;
        }
      }
    }
    if(!next){ stuck = name; break; }
    S = next;
  }
  let done = false;
  if(!stuck){
    for(let f = 0; f < 400 && !done; f++){          // walk off the ledge to the exit floor
      step(S, { right: true });
      if(S.deaths > 0) break;
      if(S.grounded && S.x >= 331*TILE && Math.abs(feet(S) - 42*TILE) < 1.2) done = true;
    }
  }
  console.log(`cons arid house    : ${done ? 'crossed clean, no cactus touched' : `FAILED at ${stuck || 'final walk'}`}`);
  check(done && S.deaths === 0, 'arid house route must be crossable without touching a cactus');
}

/* --- cacti kill; exit door reachable and overlapping --- */
{
  const P = placeC(236*TILE, 24);
  for(let f = 0; f < 200 && P.deaths === 0; f++) step(P, { right: true });
  const back = Math.abs(P.x - 4*TILE) < 2;      // respawn = spawn, no bench touched
  console.log(`cons cactus kill   : ${P.deaths > 0 ? 'spiked' : 'NO DEATH'}, respawned ${back ? 'at spawn' : 'ELSEWHERE (BAD)'}`);
  check(P.deaths > 0 && back, 'cacti must kill on touch and respawn at the checkpoint');
}
{
  const P = placeC(321*TILE, 37);
  let reached = false;
  for(let f = 0; f < 400 && !reached; f++){
    step(P, { right: true });
    if(level.overlapsChar(P.x, P.y, W, H, 'E')) reached = true;
  }
  console.log(`cons way out       : ${reached ? 'stepped into the exit door' : 'NEVER REACHED'}`);
  check(reached && P.deaths === 0, 'exit must be reachable from the last ledge');
}

/* --- secret: scuffed line past the shaft, drop in, step up, jump out --- */
{
  const P = placeC(124*TILE, 52);
  let inAlcove = false;
  for(let f = 0; f < 400 && !inAlcove; f++){
    step(P, { right: true });
    if(P.grounded && Math.abs(feet(P) - 56*TILE) < 1.2) inAlcove = true;
  }
  let onStep = false;
  for(let f = 0; f < 300 && !onStep; f++){
    step(P, { right: true, jump: P.grounded || P.vy < 0 });
    if(P.grounded && Math.abs(feet(P) - 53*TILE) < 1.2) onStep = true;
  }
  for(let f = 0; f < 60 && !(P.grounded && P.vx <= 0); f++) step(P, { left: true });
  let out = false;
  for(let f = 0; f < 300 && !out; f++){
    step(P, { left: true, jump: f < 22 });
    if(f > 22 && P.grounded && Math.abs(feet(P) - 52*TILE) < 1.2 && P.x < 134*TILE) out = true;
  }
  console.log(`cons secret store  : ${inAlcove ? 'entered' : 'MISSED'}, ${onStep ? 'stepped up' : 'NO STEP'}, ${out ? 'escaped' : 'STUCK'}`);
  check(inAlcove && onStep && out, 'gardeners store must be enterable and escapable');
}

/* --- koi ponds kill; benches set the respawn point --- */
{
  const P = placeC(111*TILE, 52);
  for(let f = 0; f < 60; f++) step(P, { right: true });
  const marked = Math.abs(P.checkpoint.x - 113*TILE) < 0.5;
  P.x = 66*TILE; P.px = P.x;                     // drop over open koi-pond water
  for(let f = 0; f < 300 && P.deaths === 0; f++) step(P, {});
  const atBench = Math.abs(P.x - 113*TILE) < 2;
  console.log(`cons koi + bench   : bench ${marked ? 'marked' : 'NOT MARKED'}, ` +
    `${P.deaths > 0 ? 'drowned' : 'NO DEATH'}, respawned ${atBench ? 'at bench' : 'ELSEWHERE (BAD)'}`);
  check(marked && P.deaths > 0 && atBench, 'koi ponds must kill and respawn at the last bench');
}

/* ================================================================
   MOTHLIGHT dream-level proofs. The moth choreography is fully
   deterministic (frame-counter clock, reset on load/death), so these
   bots replay the exact waves the player will face.
   ================================================================ */
import { MOTHLIGHT } from '../levels/mothlight.js';
import { resetMothlight, liveMoths, isFinished } from '../src/mothlight.js';

const mtick = P => MOTHLIGHT.tick(P);

function mothPlace(x, surfaceRow, abilities = {}){
  level.loadRoom(MOTHLIGHT);
  resetMothlight();
  const P = makePlayer();
  P.x = x; P.y = surfaceRow*TILE - H; P.px = P.x; P.py = P.y;
  Object.assign(P.abilities, abilities);
  for(let i = 0; i < 20; i++) step(P, {});   // settle without the moth clock
  resetMothlight();                          // ...so every proof starts at frame 0
  return P;
}

/* structural sanity of the generated dream */
{
  level.loadRoom(MOTHLIGHT);
  check(MOTHLIGHT.backdrop === 'mothlight', 'room carries the mothlight backdrop flag');
  check(typeof MOTHLIGHT.tick === 'function', 'room tick hook is wired');
  check((MOTHLIGHT.emitters || []).length === 9, 'all nine moth emitters present');
  check(level.spawn.x === 8*TILE && level.spawn.y === 4*TILE, 'spawn high in the white');
  const markers = [[7,59],[88,59],[103,37]];
  check(markers.every(([x,y]) => level.tileAt(x,y) === 'B'), 'all three frame markers present');
  check(level.tileAt(172,33) === 'E' && level.tileAt(174,37) === 'E', 'the tear is torn');
  check(level.tileAt(92,34) === 'T' && level.tileAt(99,60) === 'T', 'grass stalks rooted');
  check(!level.solidAt(92,58) && !level.solidAt(93,60), 'stalk-shaft entry open underneath');
}

/* --- entry: falling into the film is survivable with no input --- */
{
  level.loadRoom(MOTHLIGHT);
  resetMothlight();
  const P = makePlayer();
  let f = 0;
  for(; f < 400 && !(P.grounded && f > 10); f++){ step(P, {}); mtick(P); }
  const ok = P.deaths === 0 && P.grounded && Math.abs(feet(P) - 60*TILE) < 1.2;
  console.log(`film entry drift   : ${ok ? `landed on the wing in ${f}f` : 'DIED OR MISSED'}`);
  check(ok, 'the fall into the film must land safely on the first wing');
}

/* --- wing-hop gap classes (geometry; the waves are proven below) --- */
function mothRunJump(startX, surfaceRow, edgeX, landX, landRow, maxF = 300, hold = 99){
  const P = mothPlace(startX, surfaceRow);
  let air = 0;
  for(let f = 0; f < maxF; f++){
    const ctrl = { right: true };
    const nearEdge = P.grounded ? P.x + W >= edgeX - 4 : true;
    if(nearEdge){ if(!P.grounded) air++; ctrl.jump = air <= hold; }
    step(P, ctrl);
    if(P.deaths > 0) return false;
    if(P.grounded && P.x >= landX && Math.abs(feet(P) - landRow*TILE) < 1.2) return true;
  }
  return false;
}
const mothGaps = [
  ['wing gap (4)',          () => mothRunJump(10*TILE, 60, 17*TILE, 21*TILE, 60)],
  ['wing gap (5)',          () => mothRunJump(22*TILE, 60, 28*TILE, 33*TILE, 60)],
  ['wing gap (4, rise 2)',  () => mothRunJump(34*TILE, 60, 40*TILE, 44*TILE, 58)],
  ['wing gap (7, drop 4)',  () => mothRunJump(45*TILE, 58, 51*TILE, 58*TILE, 62)],
  ['wing gap (5, rise 2)',  () => mothRunJump(59*TILE, 62, 67*TILE, 72*TILE, 60)],
  ['wing gap (6)',          () => mothRunJump(73*TILE, 60, 79*TILE, 85*TILE, 60)],
];
for(const [name, fn] of mothGaps){
  const ok = fn();
  console.log(`${name.padEnd(19)}: ${ok ? 'crossed' : 'FAILED'}`);
  check(ok, `${name} must be passable`);
}

/* --- the whole traverse under live drifter waves --- */
{
  const P = mothPlace(6*TILE, 60);
  let ok = false;
  for(let f = 0; f < 1400 && !ok; f++){
    const ctrl = { right: true };
    const frontX = Math.floor((P.x + W + 3)/TILE);
    const footY = Math.floor((P.y + H)/TILE);
    const groundAhead = level.solidAt(frontX, footY) ||
                        level.solidAt(frontX, footY + 1) ||
                        level.solidAt(frontX, footY + 2);
    if(P.grounded ? !groundAhead : true) ctrl.jump = true;
    step(P, ctrl); mtick(P);
    if(P.deaths > 0) break;
    if(P.grounded && P.x >= 86*TILE && Math.abs(feet(P) - 60*TILE) < 1.2) ok = true;
  }
  console.log(`traverse w/ waves  : ${ok ? 'crossed under the drifters' : `DIED (${P.deaths})`}`);
  check(ok, 'the wing traverse must be runnable through the drifter waves');
}

/* --- grass-blade climb: enter on foot, wall-jump up through darters --- */
function mothClimb(P, exitY, exitMinX, maxFrames){
  let jumpHeld = false;
  for(let f = 0; f < maxFrames; f++){
    const ft = feet(P);
    const cleared = ft <= exitY - 2;
    const t = touching(P);
    let wantJump = false;
    if(P.grounded) wantJump = true;
    else if(cleared) wantJump = false;
    else if(t === 1)  wantJump = ft >= exitY + 39;
    else if(t === -1) wantJump = ft <= exitY + 26 || ft >= exitY + 54;
    const jump = wantJump ? !jumpHeld : jumpHeld;
    const dir = cleared ? 1 : (t !== 0 ? t : (P.grounded ? 1 : (P.vx < 0 ? -1 : 1)));
    step(P, { left: dir === -1, right: dir === 1, jump });
    mtick(P);
    jumpHeld = jump;
    if(P.grounded && Math.abs(feet(P) - exitY) < 1.2 && P.x >= exitMinX)
      return { done: true, frames: f+1 };
    if(P.deaths > 0) return { done: false, frames: f+1, died: true };
  }
  return { done: false, frames: maxFrames };
}
{
  const P = mothPlace(86*TILE, 60);
  let entered = false;
  for(let f = 0; f < 200 && !entered; f++){
    step(P, { right: true }); mtick(P);
    if(P.grounded && P.x >= 94*TILE && Math.abs(feet(P) - 61*TILE) < 1.2) entered = true;
  }
  console.log(`stalk-shaft entry  : ${entered ? 'walked in under the blade' : 'BLOCKED'}`);
  check(entered, 'the stalk shaft must be enterable on foot');
}
{
  const r = mothClimb(mothPlace(95*TILE, 61), 38*TILE, 100*TILE, 2400);
  console.log('stalk climb        : ' + (r.done ? `CLIMBED 23 tiles in ${r.frames}f` :
    r.died ? 'DIED TO A DARTER' : 'FAILED'));
  check(r.done, 'the grass-blade climb must be completable through the darters');
}
{
  const r = mothClimb(mothPlace(95*TILE, 61, { wallJump: false }), 38*TILE, 100*TILE, 900);
  console.log('climb w/o ability  : ' + (r.done ? 'CLIMBED (BAD)' : 'blocked OK'));
  check(!r.done, 'the stalk climb must need the wall jump');
}

/* --- swarm corridor: a dash-weave bot must get through, and a
   stationary player must NOT survive (the moths are real) --- */
function swarmRun(maxF = 1600){
  const P = mothPlace(103*TILE, 38);       // start at the last frame marker
  P.checkpoint = { x: 103*TILE, y: 38*TILE - H };
  let jumpHold = 0;
  for(let f = 0; f < maxF; f++){
    const ctrl = { right: true };
    let low = null, lowDx = 1e9;
    for(const m of liveMoths()){
      const dx = m.x - (P.x + W);
      if(m.y > 288 && dx > -8 && dx < lowDx){ low = m; lowDx = dx; }
    }
    if(P.grounded && low && lowDx < 30) jumpHold = 9;
    if(jumpHold > 0){ ctrl.jump = true; jumpHold--; }
    if(!P.grounded && P.vy > 0.2 && low && lowDx < 26 && P.dashes > 0) ctrl.dash = true;
    step(P, ctrl); mtick(P);
    if(P.deaths > 0) return { ok: false, f, died: true };
    if(isFinished()) return { ok: true, f };
  }
  return { ok: false, f: maxF };
}
{
  const r = swarmRun();
  console.log(`swarm corridor     : ${r.ok ? `WOVE THROUGH and reached the tear in ${r.f}f` :
    r.died ? `DIED at f${r.f}` : 'TIMED OUT'}`);
  check(r.ok, 'the swarm corridor must be beatable by the dash-weave bot');
}
{
  const P = mothPlace(125*TILE, 38);
  P.checkpoint = { x: 103*TILE, y: 38*TILE - H };
  let f = 0;
  for(; f < 900 && P.deaths === 0; f++){ step(P, {}); mtick(P); }
  const atMarker = Math.abs(P.x - 103*TILE) < 2;
  console.log(`swarm lethality    : stationary player ${P.deaths > 0 ? `hit at f${f}` : 'SURVIVED (BAD)'}` +
    `${P.deaths > 0 ? (atMarker ? ', respawned at the marker' : ', respawned ELSEWHERE (BAD)') : ''}`);
  check(P.deaths > 0 && atMarker, 'standing still in the swarm must be death; respawn at the marker');
}

/* --- falling out of the film = death, back to the frame marker --- */
{
  const P = mothPlace(5*TILE, 60);
  for(let f = 0; f < 40; f++){ step(P, { right: true }); mtick(P); }   // rest at marker 1
  const marked = Math.abs(P.checkpoint.x - 7*TILE) < 0.5;
  P.x = 29*TILE; P.px = P.x;                                           // over a gap
  for(let f = 0; f < 300 && P.deaths === 0; f++){ step(P, {}); mtick(P); }
  const atMarker = Math.abs(P.x - 7*TILE) < 2;
  console.log(`fall out of film   : marker ${marked ? 'set' : 'NOT SET'}, ` +
    `${P.deaths > 0 ? 'fell to death' : 'NO DEATH'}, respawned ${atMarker ? 'at marker' : 'ELSEWHERE (BAD)'}`);
  check(marked && P.deaths > 0 && atMarker, 'falling off the wings must kill and respawn at the marker');
}

/* --- the cinema loop: screen -> dream -> tear -> back in Cinema 1 --- */
{
  const { initWorld, checkExit } = await import('../src/world.js');
  initWorld('arts-centre');
  const P = makePlayer();
  P.x = 308*TILE; P.y = 46*TILE - H; P.px = P.x; P.py = P.y;   // in front of the screen
  checkExit(P);
  const inDream = level.currentRoom().id === 'mothlight';
  /* walk the player into the tear and let the reel run out */
  let woke = false;
  if(inDream){
    P.abilities.dash = true;
    const tearX = 173*TILE;
    P.x = tearX; P.px = P.x;
    let feetRow = 0;
    for(let f = 0; f < 400 && !woke; f++){
      step(P, {});
      level.currentRoom().tick?.(P);
      if(level.currentRoom().id === 'arts-centre') woke = true;
    }
  }
  const atSeat = woke && Math.abs(P.x - 318*TILE) < 2;
  console.log(`cinema loop        : ${inDream ? 'sucked into the film' : 'PORTAL DEAD'}, ${woke ? 'woke in Cinema 1' : 'NEVER WOKE'}${atSeat ? ' at the seat' : ''}`);
  check(inDream && woke, 'the screen portal and the tear return must both work');
}

/* --- the key economy: Wallside door and the stage door --- */
{
  const { initWorld, checkExit } = await import('../src/world.js');
  /* the Wallside door refuses without the tower key, admits with it */
  initWorld('estate-route');
  const P = makePlayer();
  P.x = 341*TILE; P.y = 48*TILE - H; P.px = P.x; P.py = P.y;   // in the doorway
  checkExit(P);
  const refused = !P.enteredFlat && P.exitDeniedT > 0;
  P.keys.flat = true; P.exitDeniedT = 0;
  checkExit(P);
  const admitted = P.enteredFlat === true;
  console.log(`wallside door      : ${refused ? 'locked without the key' : 'NOT LOCKED (BAD)'}, ${admitted ? 'opens with it' : 'WILL NOT OPEN'}`);
  check(refused && admitted, 'the flat door must be gated on the tower key');

  /* the stage door refuses without the arts key, advances with it */
  initWorld('estate-route');
  const Q = makePlayer();
  Q.x = 450*TILE + 4; Q.y = 46*TILE - H; Q.px = Q.x; Q.py = Q.y;   // standing in the exit
  checkExit(Q);
  const stageLocked = level.currentRoom().id === 'estate-route' && Q.exitDeniedT > 0;
  Q.keys.artsCentre = true; Q.exitDeniedT = 0;
  checkExit(Q);
  const stageOpen = level.currentRoom().id === 'arts-centre';
  console.log(`stage door         : ${stageLocked ? 'locked without the key' : 'NOT LOCKED (BAD)'}, ${stageOpen ? 'opens with it' : 'WILL NOT OPEN'}`);
  check(stageLocked && stageOpen, 'the way out must be gated on the Arts Centre key');
}

/* --- the roof key cannot be jumped over --- */
{
  const P = placeOnRoute(222*TILE, 6);
  let jumped = false;
  for(let f = 0; f < 400 && !P.keys.flat; f++){
    const ctrl = { right: true };
    if(P.grounded && (Math.floor(P.x/TILE) % 5 === 0)) ctrl.jump = true;   // hop constantly
    step(P, ctrl);
  }
  console.log(`key grab zone      : ${P.keys.flat ? 'caught even while hopping' : 'MISSABLE (BAD)'}`);
  check(P.keys.flat, 'a hopping player must still collect the roof key');
}

process.exit(exitCode);
