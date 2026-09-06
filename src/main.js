/* Fixed 60Hz timestep loop with accumulator + render interpolation. */
import { initWorld, checkExit } from './world.js';
import { currentRoom } from './level.js';
import { makePlayer, respawn, step } from './player.js';
import { stepCamera, cam, VIEW_W, VIEW_H } from './camera.js';
import { bindCanvas, render, stepAmbience } from './render.js';
import { bindInput, heldLeft, heldRight, heldUp, heldDown,
         heldJump, heldDash, heldBarge } from './input.js';

initWorld();
const P = makePlayer();
Object.assign(P.abilities, currentRoom().abilities || {});

/* debug spawn override: ?at=tx,ty drops the player at a tile position */
{
  const at = new URLSearchParams(location.search).get('at');
  if(at){
    const [ax, ay] = at.split(',').map(Number);
    if(Number.isFinite(ax) && Number.isFinite(ay)){
      P.x = ax*8; P.y = ay*8 - P.h; P.px = P.x; P.py = P.y;
      P.checkpoint = { x: P.x, y: P.y };
      cam.x = P.x - VIEW_W/2; cam.y = P.y - VIEW_H/2;   // snap, don't pan
    }
  }
}

globalThis.__P = P;                              // console debugging handle

let debugOn = false;
bindInput({
  debugToggle: () => { debugOn = !debugOn; },
  reset: () => respawn(P),
});

bindCanvas(document.getElementById('c'));

const STEP = 1000/60;
let acc = 0, last = performance.now(), fps = 60;

function frame(now){
  const dt = Math.min(now-last, 100); last = now;
  fps = fps*0.95 + (1000/Math.max(dt,1))*0.05;
  acc += dt;
  while(acc >= STEP){
    step(P, {
      left: heldLeft(), right: heldRight(), up: heldUp(), down: heldDown(),
      jump: heldJump(), dash: heldDash(), barge: heldBarge(),
    });
    checkExit(P);
    stepAmbience();
    stepCamera(P);
    acc -= STEP;
  }
  render(P, acc/STEP, debugOn, fps);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
