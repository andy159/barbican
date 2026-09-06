/* Simulates TUNING through the real player module and prints movement
   envelope numbers, plus gauntlet proofs against the real highwalk
   room. Run `node tools/verify-physics.js` whenever tuning, player.js,
   or a level changes. Exits non-zero on any failed proof.

   Expected envelope (verified since Phase 1 — don't drift without
   re-proving the level): max jump ≈3.45 tiles, min ≈1.01, range ≈7.20. */
import { TUNING } from '../src/tuning.js';
import * as level from '../src/level.js';
import { makePlayer, step } from '../src/player.js';
import { HIGHWALK } from '../levels/highwalk.js';

const TILE = level.TILE;
const W = 8, H = 14;              // player box (matches makePlayer)
let exitCode = 0;

const check = (ok, label) => { if(!ok){ exitCode = 1; console.error(`FAIL: ${label}`); } };

function flatRoom(){
  const rows = Array.from({length: 40}, () => '');
  rows.push('P' + ' '.repeat(399));
  rows.push(' '.repeat(400));                    // clearance — player is ~2 tiles tall
  rows.push('#'.repeat(400));
  return { id: 'flat', tiles: rows };
}

function settle(){
  const P = makePlayer();
  for(let i = 0; i < 120; i++) step(P, {});
  return P;
}

const touching = P =>
  level.overlapsSolid(P.x+1, P.y, W, H) ?  1 :
  level.overlapsSolid(P.x-1, P.y, W, H) ? -1 : 0;

/* --- max jump height (hold jump) --- */
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
  console.log(`max jump height : ${tiles.toFixed(2)} tiles (${(startY-peak).toFixed(1)}px)`);
  check(tiles > 3.3 && tiles < 3.6, 'max jump drifted from ~3.45 tiles');
}

/* --- min jump height (tap, released after 1 frame) --- */
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
  console.log(`min jump height : ${tiles.toFixed(2)} tiles (${(startY-peak).toFixed(1)}px)`);
  check(tiles > 0.9 && tiles < 1.1, 'min jump drifted from ~1.01 tiles');
}

/* --- horizontal range at full run speed --- */
{
  level.loadRoom(flatRoom());
  const P = settle();
  for(let f = 0; f < 120; f++) step(P, { right: true });
  const startX = P.x; let frames = 0;
  for(let f = 0; f < 240; f++){
    step(P, { right: true, jump: true });
    frames++;
    if(P.grounded && f > 10) break;
  }
  const tiles = (P.x-startX)/TILE;
  console.log(`jump range      : ${tiles.toFixed(2)} tiles (${(P.x-startX).toFixed(1)}px) in ${frames} frames`);
  check(tiles > 7.0 && tiles < 7.4, 'jump range drifted from ~7.20 tiles');
}

/* ============================================================
   Wall-jump gauntlet proofs against the REAL highwalk room.
   Chimney: interior cols 102-105, floor surface y=96 (row 12),
   exit ledge surface y=16 (row 2): a 10-tile climb.
   ============================================================ */
function placeInChimney(wallJump){
  level.loadRoom(HIGHWALK);
  const P = makePlayer();
  P.x = 103*TILE + 4; P.y = 12*TILE - H; P.px = P.x; P.py = P.y;
  P.abilities.wallJump = wallJump;
  for(let i = 0; i < 30; i++) step(P, {});
  return P;
}

/* Competent-player policy for the chimney's geometry: finish with a
   left-wall jump from feet in the band that crests above the exit
   surface moving right; slide on a wall to set up the right height. */
function climbChimney(P, maxFrames){
  const EXIT_SURFACE_Y = 2*TILE;
  let jumpHeld = false, minFeet = P.y + H;
  for(let f = 0; f < maxFrames; f++){
    const feet = P.y + H;
    const cleared = feet <= EXIT_SURFACE_Y - 2;
    const t = touching(P);
    let wantJump = false;
    if(P.grounded) wantJump = true;
    else if(cleared) wantJump = false;
    else if(t === 1)  wantJump = feet >= 55;                 // right wall: don't overshoot
    else if(t === -1) wantJump = feet <= 42 || feet >= 70;   // left wall: finish band, or low climb
    const jump = wantJump ? !jumpHeld : jumpHeld;
    const dir = cleared ? 1 : (t !== 0 ? t : (P.grounded ? 1 : (P.vx < 0 ? -1 : 1)));
    step(P, { left: dir === -1, right: dir === 1, jump });
    jumpHeld = jump;
    minFeet = Math.min(minFeet, P.y + H);
    if(P.grounded && Math.abs((P.y + H) - EXIT_SURFACE_Y) < 0.5)
      return { done: true, frames: f+1, minFeet };
    if(P.deaths > 0) break;
  }
  return { done: false, frames: maxFrames, minFeet };
}

{
  const P = placeInChimney(true);
  const r = climbChimney(P, 900);
  console.log('chimney w/ ability : ' + (r.done
    ? `CLIMBED in ${r.frames} frames (${(r.frames/60).toFixed(1)}s)`
    : `FAILED — best height ${((12*TILE - r.minFeet)/TILE).toFixed(2)} tiles`));
  check(r.done, 'chimney must be climbable with wall jump');
}
{
  const P = placeInChimney(false);
  const r = climbChimney(P, 900);
  const gained = (12*TILE - r.minFeet)/TILE;
  console.log('chimney w/o ability: ' + (r.done
    ? 'CLIMBED — gauntlet is NOT gated!'
    : `blocked OK (best climb ${gained.toFixed(2)} tiles of 10 needed)`));
  check(!r.done, 'chimney must be impossible without wall jump');
}

/* --- single-wall: one tall wall, nothing else in reach --- */
{
  const rows = Array.from({length: 30}, () => ' '.repeat(28) + '##');
  rows.push('#'.repeat(30));
  level.loadRoom({ id: 'oneWall', tiles: rows });
  const P = makePlayer();
  P.x = 28*TILE - W - 2; P.y = 30*TILE - H; P.px = P.x; P.py = P.y;
  for(let i = 0; i < 30; i++) step(P, {});
  const startFeet = P.y + H; let minFeet = startFeet, jumpHeld = false;
  for(let f = 0; f < 900; f++){
    let jump = !jumpHeld;
    if(!P.grounded && touching(P) === 0) jump = jumpHeld;
    step(P, { right: true, jump });
    jumpHeld = jump;
    minFeet = Math.min(minFeet, P.y + H);
  }
  const gained = (startFeet - minFeet)/TILE;
  console.log(`single-wall climb  : peak ${gained.toFixed(2)} tiles over 15s ` +
              (gained < 8 ? '(bounded OK)' : '— UNBOUNDED?'));
  check(gained < 8, 'one wall must not be infinitely climbable');
}

/* ============================================================
   Dash gauntlet: the 9-tile gap in the top ledge (cols 124-132,
   surface row 2). Jump range is 7.2 tiles — only a dash crosses.
   ============================================================ */
function crossDashGap(dash){
  level.loadRoom(HIGHWALK);
  const P = makePlayer();
  P.x = 107*TILE; P.y = 2*TILE - H; P.px = P.x; P.py = P.y;
  P.abilities.dash = dash;
  for(let i = 0; i < 30; i++) step(P, {});
  const EDGE = 124*TILE, LAND = 133*TILE;
  let dashDone = false;
  for(let f = 0; f < 400; f++){
    const ctrl = { right: true };
    if(P.grounded ? P.x + W >= EDGE - 4 : true) ctrl.jump = true;   // hold from the lip
    if(!P.grounded && P.vy > 0.5 && !dashDone && dash){
      ctrl.dash = true; dashDone = true;                            // dash past the apex
    }
    step(P, ctrl);
    if(P.deaths > 0) return { made: false, x: P.x };
    if(P.grounded && P.x >= LAND) return { made: true, x: P.x };
  }
  return { made: false, x: P.x };
}
{
  const r = crossDashGap(true);
  console.log('dash gap w/ ability : ' + (r.made
    ? `CROSSED, landed at col ${(r.x/TILE).toFixed(1)}`
    : 'FAILED to cross'));
  check(r.made, 'dash gap must be crossable with dash');
}
{
  const r = crossDashGap(false);
  console.log('dash gap w/o ability: ' + (r.made
    ? 'CROSSED — gauntlet is NOT gated!'
    : 'blocked OK (fell into the gap)'));
  check(!r.made, 'dash gap must be impossible without dash');
}

/* --- dash distance on flat ground --- */
{
  level.loadRoom(flatRoom());
  const P = settle();
  const startX = P.x;
  step(P, { dash: true });
  for(let f = 0; f < 40; f++) step(P, {});
  console.log(`ground dash dist: ${((P.x-startX)/TILE).toFixed(2)} tiles (${(P.x-startX).toFixed(1)}px + skid)`);
  check(P.x-startX > 48, 'dash should cover at least its 48px core distance');
}

process.exit(exitCode);
