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
    sx: 1, sy: 1,                                // squash/stretch scales
    deaths: 0, flash: 0,
    abilities: { wallJump: true, dash: false, barge: false, grapple: false },
  };
}

export function respawn(P){
  P.x = level.spawn.x; P.y = level.spawn.y; P.px = P.x; P.py = P.y;
  P.vx = 0; P.vy = 0; P.sx = 1; P.sy = 1; P.grounded = false;
  P.wallCoyote = 0; P.lastWallDir = 0; P.inputLock = 0;
  P.flash = 8;
}

const solid = (P, x, y) => level.overlapsSolid(x, y, P.w, P.h);

export function step(P, ctrl){
  const T = TUNING;
  P.px = P.x; P.py = P.y;

  /* --- horizontal intent (ignored briefly after a wall jump) --- */
  const dir = (ctrl.right ? 1 : 0) - (ctrl.left ? 1 : 0);
  if(P.inputLock > 0){
    P.inputLock--;
  }else if(dir !== 0){
    P.facing = dir;
    const a = P.grounded ? T.runAccel : T.airAccel;
    P.vx += a*dir;
    if(Math.abs(P.vx) > T.maxRun) P.vx = T.maxRun*Math.sign(P.vx);
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

  /* --- gravity with apex floatiness --- */
  const atApex = !P.grounded && Math.abs(P.vy) < T.apexWindow;
  P.vy += T.gravity * (atApex ? T.apexGravMult : 1);
  if(P.vy > T.maxFall) P.vy = T.maxFall;

  /* --- wall slide: pressing into a wall while falling caps fall speed --- */
  if(wallDir !== 0 && P.vy > 0 && dir === wallDir && P.vy > T.wallSlideSpeed)
    P.vy = T.wallSlideSpeed;

  /* --- move X, resolve --- */
  const nx = P.x + P.vx;
  if(solid(P, nx, P.y)){
    const stepX = Math.sign(P.vx);
    while(!solid(P, P.x+stepX, P.y)) P.x += stepX;  // snap flush to wall
    P.vx = 0;
  }else P.x = nx;

  /* --- move Y, resolve (+ ceiling corner correction) --- */
  const wasFalling = P.vy;
  const ny = P.y + P.vy;
  let landed = false;
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
      P.vy = 0; landed = true;
    }
  }else P.y = ny;

  /* --- grounded / coyote --- */
  const onGround = solid(P, P.x, P.y+1) && P.vy >= 0;
  if(onGround){
    if(!P.grounded && landed){
      /* landing squash scales with impact */
      const impact = Math.min(1, wasFalling / T.maxFall);
      P.sy = 1 - (1-T.squashLand)*impact;
      P.sx = 2 - P.sy;
    }
    P.grounded = true; P.coyote = T.coyoteFrames; P.cutDone = true;
  }else{
    if(P.grounded) P.coyote = T.coyoteFrames;    // just left a ledge
    P.grounded = false;
    if(P.coyote > 0) P.coyote--;
  }
  if(P.buffer > 0) P.buffer--;

  /* --- squash recovery --- */
  P.sx += (1-P.sx)*T.squashRecover;
  P.sy += (1-P.sy)*T.squashRecover;

  /* --- fell into a pit --- */
  if(P.y > level.ROOM_H*TILE + 24){ P.deaths++; respawn(P); }
  if(P.flash > 0) P.flash--;
}
