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
  const benches = [[7,47],[105,47],[190,31],[230,23],[272,19],[328,47]];
  check(benches.every(([x,y]) => level.tileAt(x,y) === 'B'), 'all six benches present');
  check(level.tileAt(130,48) === '-' && level.tileAt(133,48) === '-', 'scuffed line at secret');
  check(level.tileAt(70,53) === 'W' && level.tileAt(330,52) === 'W', 'water under bridge and stones');
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
  ['crown stub hop',        () => runJump(239*TILE, 14, 242*TILE, 244*TILE, 14)],
  ['tower roof -> terrace', () => walkOff(245*TILE, 14, 252*TILE, 20)],
  ['descent walk-off',      () => walkOff(271*TILE, 20, 278*TILE, 24)],
  ['terrace -> stone (4)',  () => runJump(330*TILE, 48, 336*TILE, 340*TILE, 48, 300, 12)],
  ['stone -> stone (4)',    () => runJump(340*TILE, 48, 342*TILE, 346*TILE, 48)],
  ['stone -> way out (3)',  () => runJump(346*TILE, 48, 348*TILE, 351*TILE, 48)],
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
  console.log('tower shaft A      : ' + (r.done ? `CLIMBED to mezzanine in ${r.frames}f` : 'FAILED'));
  check(r.done, 'shaft A must reach the mezzanine');
}
{
  const r = climbShaft(placeOnRoute(235*TILE, 24), 14*TILE, 238*TILE, 1200);
  console.log('tower shaft B      : ' + (r.done ? `CLIMBED to the roof in ${r.frames}f` : 'FAILED'));
  check(r.done, 'shaft B must reach the roof');
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

process.exit(exitCode);
