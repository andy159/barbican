/* Minimal two-level world flow. Walking into an 'E' (exit) tile loads
   the next level in WORLD and places the player at its 'P' spawn with
   a fresh checkpoint. `?level=<id>` in the URL starts on that level
   (debug convenience — e.g. ?level=arts-centre). */
import * as level from './level.js';
import { respawn } from './player.js';
import { HIGHWALK } from '../levels/highwalk.js';
import { ARTSCENTRE } from '../levels/artscentre.js';
import { CONSERVATORY } from '../levels/conservatory.js';

export const WORLD = [HIGHWALK, ARTSCENTRE, CONSERVATORY];
let idx = 0;

export function initWorld(startId = null){
  const want = startId ?? ((typeof location !== 'undefined')
    ? new URLSearchParams(location.search).get('level') : null);
  const i = WORLD.findIndex(r => r.id === want);
  idx = i >= 0 ? i : 0;
  level.loadRoom(WORLD[idx]);
  setTitle();
}

/* call once per fixed step, after step(P) */
export function checkExit(P){
  if(!level.overlapsChar(P.x, P.y, P.w, P.h, 'E')) return;
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
    `THE <span>BARBICAN</span> · ${WORLD[idx].id.replace(/-/g, ' ').toUpperCase()}`;
}
