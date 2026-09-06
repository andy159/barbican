/* Minimal two-level world flow. Walking into an 'E' (exit) tile loads
   the next level in WORLD and places the player at its 'P' spawn with
   a fresh checkpoint. `?level=<id>` in the URL starts on that level
   (debug convenience — e.g. ?level=arts-centre). */
import * as level from './level.js';
import { respawn } from './player.js';
import { HIGHWALK } from '../levels/highwalk.js';
import { ARTSCENTRE } from '../levels/artscentre.js';
import { CONSERVATORY } from '../levels/conservatory.js';
import { MOTHLIGHT } from '../levels/mothlight.js';
import { bindWorld } from './mothlight.js';

export const WORLD = [HIGHWALK, ARTSCENTRE, CONSERVATORY];
const EXTRA = [MOTHLIGHT];                       // rooms outside the E-chain
const ALL = [...WORLD, ...EXTRA];
let idx = 0;
let outroStarted = false;                        // set once the ending film rolls
export function outroActive(){ return outroStarted; }
bindWorld(goTo);                                 // the dream's wake-up call

/* cross-room portals: touching the rect teleports to another room.
   The Cinema 1 screen sucks the player into the Mothlight dream. */
const PORTALS = {
  'arts-centre': [{ rect: [305, 40, 314, 47], to: 'mothlight' }],
};

export function initWorld(startId = null){
  const want = startId ?? ((typeof location !== 'undefined')
    ? new URLSearchParams(location.search).get('level') : null);
  const i = ALL.findIndex(r => r.id === want);
  idx = i >= 0 ? Math.min(i, WORLD.length - 1) : 0;
  level.loadRoom(i >= 0 ? ALL[i] : WORLD[0]);
  setTitle();
}

/* jump to a named room; `at` places the player at a tile (else its 'P') */
export function goTo(id, P, at = null){
  const room = ALL.find(r => r.id === id);
  if(!room) return;
  const w = WORLD.findIndex(r => r.id === id);
  if(w >= 0) idx = w;
  level.loadRoom(room);
  Object.assign(P.abilities, room.abilities || {});
  if(at){
    P.checkpoint = { x: at[0]*level.TILE, y: (at[1]+2)*level.TILE - P.h };
    respawn(P);
  }else{
    P.checkpoint = { x: level.spawn.x, y: level.spawn.y };
    respawn(P);
  }
  setTitle();
}

/* call once per fixed step, after step(P) */
export function checkExit(P){
  /* portals first (the cinema screen, etc.) */
  for(const p of (PORTALS[level.currentRoom().id] || [])){
    const [x0,y0,x1,y1] = p.rect;
    const tx = (P.x + P.w/2)/level.TILE, ty = (P.y + P.h/2)/level.TILE;
    if(tx >= x0 && tx <= x1+1 && ty >= y0 && ty <= y1+1){ goTo(p.to, P); return; }
  }
  if(level.currentRoom().id === 'mothlight') return;   // the dream exits via its tear

  /* the Wallside front door ('D'): the tower key lets you into the flat */
  if(level.currentRoom().id === 'estate-route' &&
     level.overlapsChar(P.x, P.y, P.w, P.h, 'D')){
    if(!P.keys.flat){
      P.exitDeniedT = 90;
      P.deniedMsg = 'LOCKED — THE KEY IS ON CROMWELL TOWER';
    }else if(typeof location !== 'undefined'){
      try{ localStorage.setItem('barbican.keys.flat', '1'); }catch(e){}
      location.href = 'flat.html';
    }else{
      P.enteredFlat = true;                    // headless hook for the verifier
    }
    return;
  }

  if(!level.overlapsChar(P.x, P.y, P.w, P.h, 'E')) return;
  /* the Conservatory's exit door is the end of the game: in a browser,
     roll the ending film and start a fresh run. Headless keeps the plain
     wrap-to-estate behavior so the verifier's boss-exit proof holds. */
  if(level.currentRoom().id === 'conservatory' && typeof location !== 'undefined'){
    if(outroStarted) return;
    outroStarted = true;                          // main.js halts its loop on this
    import('./outro.js').then(m =>
      m.playOutro(document.getElementById('c'), () => { location.href = 'index.html'; }));
    return;
  }
  /* the estate's way out is the Arts Centre stage door — it wants the
     key from the flat's kitchen drawer */
  if(level.currentRoom().id === 'estate-route' && !P.keys.artsCentre){
    P.exitDeniedT = 90;
    P.deniedMsg = P.keys.flat
      ? 'STAGE DOOR LOCKED — THE KEY IS IN THE WALLSIDE FLAT'
      : 'STAGE DOOR LOCKED — START AT CROMWELL TOWER';
    return;
  }
  idx = (idx + 1) % WORLD.length;
  level.loadRoom(WORLD[idx]);
  Object.assign(P.abilities, WORLD[idx].abilities || {});
  P.checkpoint = { x: level.spawn.x, y: level.spawn.y };
  respawn(P);                                    // place at spawn, brief flash
  setTitle();
}

function setTitle(){
  if(typeof document === 'undefined') return;
  const el = document.getElementById('title');
  if(el) el.innerHTML =
    `THE <span>BARBICAN</span> · ${level.currentRoom().id.replace(/-/g, ' ').toUpperCase()}`;
}
