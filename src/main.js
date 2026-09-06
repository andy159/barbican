/* Fixed 60Hz timestep loop with accumulator + render interpolation. */
import { initWorld, checkExit, outroActive } from './world.js';
import { currentRoom } from './level.js';
import * as levelMod from './level.js';
import { makePlayer, respawn, step } from './player.js';
import { stepCamera, cam, VIEW_W, VIEW_H } from './camera.js';
import { bindCanvas, render, stepAmbience } from './render.js';
import { bindInput, heldLeft, heldRight, heldUp, heldDown,
         heldJump, heldDash, heldBarge } from './input.js';
import { playIntro } from './intro.js';
import * as audio from './audio.js';
import { G as GARDENER } from './gardener.js';

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

/* key state survives the trip through the 3D flat via localStorage;
   a fresh run (no ?at / ?level) starts clean */
try{
  const fresh = !new URLSearchParams(location.search).get('at') &&
                !new URLSearchParams(location.search).get('level');
  if(fresh){
    localStorage.removeItem('barbican.keys.flat');
    localStorage.removeItem('barbican.keys.artsCentre');
  }else{
    if(localStorage.getItem('barbican.keys.flat') === '1') P.keys.flat = true;
    if(localStorage.getItem('barbican.keys.artsCentre') === '1') P.keys.artsCentre = true;
  }
}catch(e){}

audio.attach();                                  // music starts on first input

/* which score fits where the player is standing */
function currentMood(){
  const id = currentRoom().id;
  if(id === 'mothlight') return 'mothlight';
  if(id === 'conservatory')
    return (P.x >= 342*8 && !GARDENER.dead) ? 'boss' : 'conservatory';
  if(id === 'conservatory' && P.x >= 235*8 && P.x < 342*8) return 'arid';
  if(id === 'arts-centre'){
    const z = (currentRoom().zones || []).find(z => P.x/8 >= z.x0 && P.x/8 <= z.x1);
    switch(z?.type){
      case 'bar':       return 'mozart';
      case 'foyer':     return 'foyer';
      case 'stalls':
      case 'flytower':
      case 'backstage': return 'theatre';
      case 'cinema':    return 'cinema';
      case 'exit':      return 'daylight';      // sunlight spills into the corridor
      default:          return 'interior';
    }
  }
  /* estate route */
  if(typeof levelMod.interiorAt === 'function' && levelMod.interiorAt(P.x + P.w/2, P.y + P.h/2))
    return 'tower';
  return P.x >= 272*8 ? 'ponds' : 'daylight';
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
    if(outroActive()){ audio.setMood('mozart'); return; }   // the bar is playing
    currentRoom().tick?.(P);            // room hook (moth waves, boss fights)
    stepAmbience();
    stepCamera(P);
    if((acc/STEP|0) % 2 === 0) audio.setMood(currentMood());
    acc -= STEP;
  }
  render(P, acc/STEP, debugOn, fps);
  requestAnimationFrame(frame);
}

/* the anime intro plays on a fresh load; dev flows (?level / ?at) skip it.
   ?outroshot=n jumps straight into the ending film (debug/screenshots). */
const wantsIntro = !new URLSearchParams(location.search).get('level') &&
                   !new URLSearchParams(location.search).get('at');
if(new URLSearchParams(location.search).get('outroshot')){
  import('./outro.js').then(m =>
    m.playOutro(document.getElementById('c'), () => { location.href = 'index.html'; }));
}else if(wantsIntro){
  playIntro(document.getElementById('c'), () => {
    last = performance.now();
    requestAnimationFrame(frame);
  });
}else{
  requestAnimationFrame(frame);
}
