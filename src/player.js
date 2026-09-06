/* The kinematic controller — a faithful split of the Phase 1 update().
   Pure logic: reads TUNING and level collision only, no rendering or
   DOM. step() takes a controls snapshot { left, right, jump } so the
   same code runs headless in tools/verify-physics.js. */
import { TUNING } from './tuning.js';
import * as level from './level.js';
import { TILE } from './level.js';

export function makePlayer(){
  return {
    x: level.spawn.x, y: level.spawn.y,
    px: level.spawn.x, py: level.spawn.y,        // previous (for render lerp)
    w: 8, h: 14,
    vx: 0, vy: 0,
    grounded: false, facing: 1,
    coyote: 0, buffer: 0, cutDone: true,
    prevJump: false,
    wallCoyote: 0, lastWallDir: 0, inputLock: 0,
    dashLeft: 0, dashVX: 0, dashVY: 0, dashes: 1, freeze: 0, prevDash: false,
    bargeWind: 0, bargeLeft: 0, prevBarge: false, shake: 0,
    trail: [],                                   // dash afterimages
    sx: 1, sy: 1,                                // squash/stretch scales
    deaths: 0, flash: 0,
    abilities: { wallJump: true, dash: true, barge: true, grapple: false },
  };
}

export function respawn(P){
  P.x = level.spawn.x; P.y = level.spawn.y; P.px = P.x; P.py = P.y;
  P.vx = 0; P.vy = 0; P.sx = 1; P.sy = 1; P.grounded = false;
  P.wallCoyote = 0; P.lastWallDir = 0; P.inputLock = 0;
  P.dashLeft = 0; P.dashes = 1; P.freeze = 0; P.trail.length = 0;
  P.bargeWind = 0; P.bargeLeft = 0;
  P.flash = 8;
}

const solid = (P, x, y) => level.overlapsSolid(x, y, P.w, P.h);

export function step(P, ctrl){
  const T = TUNING;
  P.px = P.x; P.py = P.y;

  /* afterimages fade even while frozen */
  for(const t of P.trail) t.life--;
  while(P.trail.length && P.trail[0].life <= 0) P.trail.shift();
  if(P.shake > 0) P.shake--;

  /* --- dash activation freeze / impact hit-stop --- */
  if(P.freeze > 0){ P.freeze--; return; }

  /* --- barge: coil up, then launch shoulder-first --- */
  if(P.bargeWind > 0){
    P.bargeWind--;
    P.vx = 0; P.vy = 0;
    if(P.bargeWind === 0) P.bargeLeft = T.bargeFrames;
    return;
  }
  if(P.bargeLeft > 0){
    P.bargeLeft--;
    P.vx = P.facing * T.bargeSpeed;
    P.vy += T.gravity;                           // can barge off a ledge
    if(P.vy > T.maxFall) P.vy = T.maxFall;
    moveAndResolve(P);
    groundedUpdate(P, 1);
    if(P.buffer > 0) P.buffer--;
    pitCheck(P);
    return;
  }

  /* --- mid-dash: fixed velocity, no gravity, no steering --- */
  if(P.dashLeft > 0){
    if(P.dashLeft % 3 === 0) P.trail.push({ x: P.x, y: P.y, facing: P.facing, life: 14 });
    P.vx = P.dashVX; P.vy = P.dashVY;
    moveAndResolve(P);
    P.dashLeft--;
    if(P.dashLeft === 0 && P.vy < 0) P.vy *= T.dashUpExitMult;
    groundedUpdate(P, 0);
    if(P.buffer > 0) P.buffer--;
    pitCheck(P);
    return;
  }

  /* --- horizontal intent (ignored briefly after a wall jump) --- */
  const dir = (ctrl.right ? 1 : 0) - (ctrl.left ? 1 : 0);
  if(P.inputLock > 0){
    P.inputLock--;
  }else if(dir !== 0){
    P.facing = dir;
    if(P.vx*dir > T.maxRun){
      /* over speed in the held direction (dash carry): bleed, don't clamp */
      const f = P.grounded ? T.friction : T.airDrag;
      P.vx -= f*Math.sign(P.vx);
    }else{
      const a = P.grounded ? T.runAccel : T.airAccel;
      P.vx += a*dir;
      if(Math.abs(P.vx) > T.maxRun) P.vx = T.maxRun*Math.sign(P.vx);
    }
  }else{
    const f = P.grounded ? T.friction : T.airDrag;
    if(Math.abs(P.vx) <= f) P.vx = 0; else P.vx -= f*Math.sign(P.vx);
  }

  /* --- wall contact (airborne, flush against a solid) --- */
  let wallDir = 0;
  if(!P.grounded && P.abilities.wallJump)
    wallDir = solid(P, P.x+1, P.y) ? 1 : (solid(P, P.x-1, P.y) ? -1 : 0);
  if(wallDir !== 0){ P.wallCoyote = T.wallCoyoteFrames; P.lastWallDir = wallDir; }
  else if(P.wallCoyote > 0) P.wallCoyote--;

  /* --- jump: buffer + coyote --- */
  if(ctrl.jump && !P.prevJump) P.buffer = T.bufferFrames;
  P.prevJump = ctrl.jump;

  if(P.buffer > 0 && (P.grounded || P.coyote > 0)){
    P.vy = -T.jumpVelocity;
    P.buffer = 0; P.coyote = 0;
    P.grounded = false; P.cutDone = false;
    P.sy = T.squashJump; P.sx = 2 - T.squashJump;   // stretch
  }
  /* wall jump: kick up and away, lock steering so one wall can't be climbed */
  else if(P.buffer > 0 && !P.grounded && P.wallCoyote > 0){
    const wd = P.lastWallDir;
    P.vy = -T.wallJumpVY;
    P.vx = -wd * T.wallJumpVX;
    P.facing = -wd;
    P.inputLock = T.wallJumpLock;
    P.buffer = 0; P.wallCoyote = 0; P.cutDone = false;
    P.sy = T.squashJump; P.sx = 2 - T.squashJump;
  }
  /* variable height: cut velocity once on release */
  if(!ctrl.jump && !P.cutDone && P.vy < 0){
    P.vy *= T.jumpCut; P.cutDone = true;
  }

  /* --- dash: 8-direction, fixed distance, refreshes on landing --- */
  const dashPressed = ctrl.dash && !P.prevDash;
  P.prevDash = ctrl.dash;
  if(dashPressed && P.abilities.dash && P.dashes > 0){
    let dx = (ctrl.right ? 1 : 0) - (ctrl.left ? 1 : 0);
    let dy = (ctrl.down ? 1 : 0) - (ctrl.up ? 1 : 0);
    if(dx === 0 && dy === 0) dx = P.facing;
    if(dx !== 0) P.facing = dx;
    const inv = 1/Math.hypot(dx, dy);
    P.dashVX = T.dashSpeed*dx*inv;
    P.dashVY = T.dashSpeed*dy*inv;
    P.dashLeft = T.dashFrames;
    P.freeze = T.dashFreeze;
    P.dashes--;
    P.cutDone = true; P.inputLock = 0;
    P.sy = 2 - T.squashJump; P.sx = T.squashJump;   // horizontal stretch
    return;
  }

  /* --- barge trigger: grounded, short windup, then launch --- */
  const bargePressed = ctrl.barge && !P.prevBarge;
  P.prevBarge = ctrl.barge;
  if(bargePressed && P.abilities.barge && P.grounded){
    P.bargeWind = T.bargeWindup;
    P.sx = 0.8; P.sy = 1.2;                      // coil up
    return;
  }

  /* --- gravity with apex floatiness --- */
  const atApex = !P.grounded && Math.abs(P.vy) < T.apexWindow;
  P.vy += T.gravity * (atApex ? T.apexGravMult : 1);
  if(P.vy > T.maxFall) P.vy = T.maxFall;

  /* --- wall slide: pressing into a wall while falling caps fall speed --- */
  if(wallDir !== 0 && P.vy > 0 && dir === wallDir && P.vy > T.wallSlideSpeed)
    P.vy = T.wallSlideSpeed;

  moveAndResolve(P);
  groundedUpdate(P, 1);
  if(P.buffer > 0) P.buffer--;

  /* --- squash recovery --- */
  P.sx += (1-P.sx)*T.squashRecover;
  P.sy += (1-P.sy)*T.squashRecover;

  pitCheck(P);
}

/* Move X then Y through the tile grid (+ ceiling corner correction).
   Sets P._landed / P._wasFalling for the grounded pass. */
function moveAndResolve(P){
  const T = TUNING;
  let nx = P.x + P.vx;
  /* a barge smashes through hoardings in its path (whole sheet breaks) */
  if(P.bargeLeft > 0 && solid(P, nx, P.y) &&
     level.breakHoardingAABB(nx, P.y, P.w, P.h)){
    P.shake = T.bargeShake;
    P.freeze = 2;                                  // impact hit-stop
  }
  if(solid(P, nx, P.y)){
    const stepX = Math.sign(P.vx);
    while(!solid(P, P.x+stepX, P.y)) P.x += stepX;  // snap flush to wall
    P.vx = 0;
    if(P.dashLeft > 0) P.dashLeft = 1;             // dash dies on the wall
    if(P.bargeLeft > 0){ P.bargeLeft = 0; P.shake = Math.max(P.shake, 3); }  // thud
  }else P.x = nx;

  P._wasFalling = P.vy;
  P._landed = false;
  const ny = P.y + P.vy;
  if(solid(P, P.x, ny)){
    if(P.vy < 0){
      /* moving up: try nudging sideways around a ceiling corner */
      let nudged = false;
      for(let n = 1; n <= T.cornerNudge && !nudged; n++){
        if(!solid(P, P.x-n, ny)){ P.x -= n; P.y = ny; nudged = true; }
        else if(!solid(P, P.x+n, ny)){ P.x += n; P.y = ny; nudged = true; }
      }
      if(!nudged){
        while(!solid(P, P.x, P.y-1)) P.y -= 1;
        P.vy = 0;
      }
    }else{
      while(!solid(P, P.x, P.y+1)) P.y += 1;
      P.vy = 0; P._landed = true;
    }
  }else P.y = ny;
}

/* Grounded / coyote bookkeeping; landing refreshes the dash.
   squashScale=0 suppresses landing squash (mid-dash landings). */
function groundedUpdate(P, squashScale){
  const T = TUNING;
  const onGround = solid(P, P.x, P.y+1) && P.vy >= 0;
  if(onGround){
    if(!P.grounded && P._landed && squashScale > 0){
      /* landing squash scales with impact */
      const impact = Math.min(1, P._wasFalling / T.maxFall);
      P.sy = 1 - (1-T.squashLand)*impact;
      P.sx = 2 - P.sy;
    }
    P.grounded = true; P.coyote = T.coyoteFrames; P.cutDone = true;
    P.dashes = 1;
  }else{
    if(P.grounded) P.coyote = T.coyoteFrames;    // just left a ledge
    P.grounded = false;
    if(P.coyote > 0) P.coyote--;
  }
}

function pitCheck(P){
  if(P.y > level.ROOM_H*TILE + 24){ P.deaths++; respawn(P); }
  if(P.flash > 0) P.flash--;
}
