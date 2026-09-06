/* Fixed 60Hz timestep loop with accumulator + render interpolation. */
import { loadRoom } from './level.js';
import { HIGHWALK } from '../levels/highwalk.js';
import { makePlayer, respawn, step } from './player.js';
import { stepCamera } from './camera.js';
import { bindCanvas, render, stepAmbience } from './render.js';
import { bindInput, heldLeft, heldRight, heldJump } from './input.js';

loadRoom(HIGHWALK);
const P = makePlayer();

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
    step(P, { left: heldLeft(), right: heldRight(), jump: heldJump() });
    stepAmbience();
    stepCamera(P);
    acc -= STEP;
  }
  render(P, acc/STEP, debugOn, fps);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
