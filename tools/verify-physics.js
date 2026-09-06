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
  const benches = [[7,47],[105,47],[190,31],[230,23],[224,5],[272,19],[328,47]];
  check(benches.every(([x,y]) => level.tileAt(x,y) === 'B'), 'all seven benches present');
  check(level.tileAt(238,5) === 'K', 'the flat key waits on the roof');
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
  ['stub hop -> terrace',   () => runJump(238*TILE, 6, 242*TILE, 249*TILE, 20, 400)],
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
  console.log('tower shaft A      : ' + (r.done ? `CLIMBED to LEVEL 15 in ${r.frames}f` : 'FAILED'));
  check(r.done, 'shaft A must reach the LEVEL 15 mezzanine');
}
{
  const r = climbShaft(placeOnRoute(235*TILE, 24), 16*TILE, 238*TILE, 1200);
  console.log('tower shaft B      : ' + (r.done ? `CLIMBED to LEVEL 28 in ${r.frames}f` : 'FAILED'));
  check(r.done, 'shaft B must reach the LEVEL 28 slab');
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

/* --- world flow: walking into 'E' loops back to the estate route --- */
{
  const { initWorld, checkExit } = await import('../src/world.js');
  initWorld('arts-centre');
  const P = makePlayer();
  P.x = 348*TILE; P.y = 47*TILE - H; P.px = P.x; P.py = P.y;   // inside the exit door
  checkExit(P);
  const swapped = level.currentRoom().id === 'estate-route';
  const atSpawn = Math.abs(P.x - level.spawn.x) < 0.5 && Math.abs(P.checkpoint.x - level.spawn.x) < 0.5;
  console.log(`world flow         : exit ${swapped ? 'loops to estate-route' : 'DID NOT SWITCH'}, spawn ${atSpawn ? '+ checkpoint reset' : 'WRONG'}`);
  check(swapped && atSpawn, 'E tile must switch level and reset spawn/checkpoint');
}


process.exit(exitCode);
