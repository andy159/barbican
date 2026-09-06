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
   Estate-route proofs against the real level.
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
  check(level.tileAt(7,35) === 'B' && level.tileAt(105,35) === 'B' &&
        level.tileAt(176,19) === 'B' && level.tileAt(260,7) === 'B' &&
        level.tileAt(322,35) === 'B', 'all five benches present');
  check(level.tileAt(130,36) === '-' && level.tileAt(133,36) === '-', 'scuffed line at secret');
  check(level.tileAt(70,41) === 'W' && level.tileAt(330,40) === 'W', 'water under bridge and stones');
  check(level.tileAt(118,36) === '=' && level.tileAt(121,36) === '=', 'shaft floor');
  check(!level.solidAt(122,34) && !level.solidAt(122,35), 'shaft door to the pocket');
}

/* --- shaft entry: walkable from the west at ground level --- */
{
  const P = placeOnRoute(110*TILE, 36);
  for(let f = 0; f < 200 && P.x < 119*TILE; f++) step(P, { right: true });
  const inShaft = P.grounded && P.x >= 119*TILE && Math.abs(feet(P) - 36*TILE) < 1.2;
  console.log(`shaft entry        : ${inShaft ? 'walked in at ground level' : 'BLOCKED'}`);
  check(inShaft, 'shaft must be enterable on foot from the west');
}

/* --- service shaft: 16-tile wall-jump climb (cols 118-121) --- */
function climbShaft(P, exitY, maxFrames){
  let jumpHeld = false, minFeet = feet(P);
  for(let f = 0; f < maxFrames; f++){
    const ft = feet(P);
    const cleared = ft <= exitY - 2;
    const t = touching(P);
    let wantJump = false;
    if(P.grounded) wantJump = true;
    else if(cleared) wantJump = false;
    else if(t === 1)  wantJump = ft >= exitY + 39;                     // right wall: don't overshoot
    else if(t === -1) wantJump = ft <= exitY + 26 || ft >= exitY + 54; // left wall: finish band, or low climb
    const jump = wantJump ? !jumpHeld : jumpHeld;
    const dir = cleared ? 1 : (t !== 0 ? t : (P.grounded ? 1 : (P.vx < 0 ? -1 : 1)));
    step(P, { left: dir === -1, right: dir === 1, jump });
    jumpHeld = jump;
    minFeet = Math.min(minFeet, feet(P));
    if(P.grounded && Math.abs(feet(P) - exitY) < 1.2 && P.x >= 122*TILE)
      return { done: true, frames: f+1, minFeet };
    if(P.deaths > 0) break;
  }
  return { done: false, frames: maxFrames, minFeet };
}
{
  const P = placeOnRoute(119*TILE + 2, 36);
  const r = climbShaft(P, 20*TILE, 1800);
  console.log('shaft w/ wall jump : ' + (r.done
    ? `CLIMBED 16 tiles in ${r.frames} frames (${(r.frames/60).toFixed(1)}s)`
    : `FAILED — best ${((36*TILE - r.minFeet)/TILE).toFixed(2)} tiles`));
  check(r.done, 'shaft must be climbable with wall jump');
}
{
  const P = placeOnRoute(119*TILE + 2, 36, { wallJump: false });
  const r = climbShaft(P, 20*TILE, 900);
  const gained = (36*TILE - r.minFeet)/TILE;
  console.log('shaft w/o ability  : ' + (r.done
    ? 'CLIMBED — route is NOT gated!'
    : `blocked OK (best ${gained.toFixed(2)} of 16 tiles)`));
  check(!r.done, 'shaft must need the wall jump');
}

/* --- trench 1 (cols 20-22, 5 deep): wall-jump escape --- */
{
  const P = placeOnRoute(21*TILE, 41);
  let jumpHeld = false, out = false;
  for(let f = 0; f < 600 && !out; f++){
    const t = touching(P);
    const wantJump = P.grounded || t !== 0;
    const jump = wantJump ? !jumpHeld : jumpHeld;
    step(P, { right: true, jump });
    jumpHeld = jump;
    if(P.grounded && feet(P) <= 36*TILE + 1) out = true;
  }
  console.log(`trench escape      : ${out ? 'OUT via wall jumps' : 'STUCK'}`);
  check(out, 'intro trench must be escapable');
}

/* --- run-jump gap proofs along the route --- */
function runJump(startX, surfaceRow, edgeX, landX, landRow, maxF = 300){
  const P = placeOnRoute(startX, surfaceRow);
  for(let f = 0; f < maxF; f++){
    const ctrl = { right: true };
    if(P.grounded ? P.x + W >= edgeX - 4 : true) ctrl.jump = true;
    step(P, ctrl);
    if(P.deaths > 0) return false;
    if(P.grounded && P.x >= landX && Math.abs(feet(P) - landRow*TILE) < 1.2) return true;
  }
  return false;
}
{
  const ok = runJump(72*TILE, 36, 79*TILE, 84*TILE, 36);
  console.log(`bridge gap (5)     : ${ok ? 'crossed' : 'FAILED'}`);
  check(ok, 'bridge 5-tile gap must be jumpable');
}
{
  const ok = runJump(148*TILE, 20, 154*TILE, 159*TILE, 20);
  console.log(`highwalk gap (5)   : ${ok ? 'crossed' : 'FAILED'}`);
  check(ok, 'highwalk 5-tile gap must be jumpable');
}
{
  const ok = runJump(159*TILE, 20, 166*TILE, 172*TILE, 20);
  console.log(`highwalk gap (6)   : ${ok ? 'crossed' : 'FAILED'}`);
  check(ok, 'highwalk 6-tile gap must be jumpable');
}
{
  /* tower entry: through both doorways at deck level */
  const P = placeOnRoute(206*TILE, 20);
  for(let f = 0; f < 300 && P.x < 223*TILE; f++) step(P, { right: true });
  const inTower = P.grounded && P.x >= 223*TILE && Math.abs(feet(P) - 20*TILE) < 1.2;
  console.log(`tower entry        : ${inTower ? 'walked through both doors' : 'BLOCKED'}`);
  check(inTower, 'tower must be enterable on foot from the highwalk');
}
{
  /* tower interior shaft: 12-tile wall-jump climb (cols 222-225) */
  const P = placeOnRoute(223*TILE, 20);
  const r = climbShaft(P, 8*TILE, 1800);
  console.log('tower shaft climb  : ' + (r.done
    ? `CLIMBED 12 tiles in ${r.frames} frames`
    : `FAILED — best ${((20*TILE - r.minFeet)/TILE).toFixed(2)} tiles`));
  check(r.done, 'tower shaft must be climbable with wall jump');
}

/* --- secret alcove: drop in, jump out via the step --- */
{
  const P = placeOnRoute(131*TILE, 36);      // standing on the scuffed line
  let inAlcove = false;
  for(let f = 0; f < 300 && !inAlcove; f++){
    step(P, { right: true });                // walk off the pocket edge
    if(P.grounded && Math.abs(feet(P) - 40*TILE) < 1.2) inAlcove = true;
  }
  /* onto the step (cols 138-139, top row 37), then jump out left */
  let onStep = false;
  for(let f = 0; f < 300 && !onStep; f++){
    step(P, { right: true, jump: P.grounded || P.vy < 0 });   // full-height hops
    if(P.grounded && Math.abs(feet(P) - 37*TILE) < 1.2) onStep = true;
  }
  /* bleed the rightward momentum on the step, then one full jump left */
  for(let f = 0; f < 60 && !(P.grounded && P.vx <= 0); f++) step(P, { left: true });
  let out = false;
  for(let f = 0; f < 300 && !out; f++){
    const jump = f < 22;
    step(P, { left: true, jump });
    if(f > 22 && P.grounded && Math.abs(feet(P) - 36*TILE) < 1.2 && P.x < 134*TILE) out = true;
  }
  console.log(`secret alcove      : ${inAlcove ? 'entered' : 'MISSED'}, ${onStep ? 'stepped up' : 'NO STEP'}, ${out ? 'escaped' : 'STUCK'}`);
  check(inAlcove && out, 'alcove must be enterable and escapable');
}

/* --- water kills; benches set the respawn point --- */
{
  const P = placeOnRoute(5*TILE, 36);
  for(let f = 0; f < 40; f++) step(P, { right: true });        // stroll across the bench
  const marked = Math.abs(P.checkpoint.x - 7*TILE) < 0.5;
  P.x = 60*TILE; P.px = P.x;                                   // carry on from the bridge
  for(let f = 0; f < 300 && P.deaths === 0; f++) step(P, { right: true });   // walk into the first bridge gap
  const atBench = Math.abs(P.x - 7*TILE) < 2;
  console.log(`water + checkpoint : bench ${marked ? 'marked' : 'NOT MARKED'}, ` +
    `${P.deaths > 0 ? 'drowned' : 'NO DEATH'}, respawned ${atBench ? 'at bench' : `at x=${P.x.toFixed(0)} (BAD)`}`);
  check(marked && P.deaths > 0 && atBench, 'water must kill and respawn at the last bench');
}

process.exit(exitCode);
