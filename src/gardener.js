/* THE HEAD GARDENER — the conservatory's automated irrigation gantry,
   gone territorial. Boss of the final chamber (cols 342-394, see
   tools/gen-conservatory.mjs). A municipal sprinkler rig slides along
   an overhead rail; the player has no attack button — dashing through
   the gantry's gold CONTROL NODE during its vent window is the weapon.

   Fight structure (phase = hits already scored, 0..2, escalating):
     SWEEP     water-jet column rakes the arena under the rig
     MIST WALL slow push-zone crosses the arena (a dash through it
               shears the nozzle line and cancels the push)
     VINE DROP coils deny the middle islands (lethal, dash won't save you)
     VENT      the control node hangs gold at jump height for ~90 frames
   3 hits: the rig sparks, slumps, crashes into a koi pond; the gate
   tiles (393-394, rows 26-41) are cleared and the exit glow activates.

   DETERMINISM: the whole sim runs off G.frame — no wall clock, no
   Math.random. Leaving the arena (death respawns at the bench outside)
   restarts the current phase's pattern; hits already scored are kept.
   State fully resets on a fresh room load (the gate tiles come back).
   Rendering keeps its own cosmetic clock and never touches the sim. */
import { TILE } from './level.js';
import * as level from './level.js';
import { respawn } from './player.js';
import { VIEW_W, VIEW_H } from './camera.js';

/* ---------------- arena geometry (px) — matches the generator ---------------- */
export const ARENA = {
  x0: 342*TILE, x1: 393*TILE,        // west lip .. gate face (2736..3144)
  railY: 260,                        // overhead rail (in frame with the camera centered)
  floorY: 336,                       // island tops (row 42)
  waterY: 344,                       // pond surface (row 43)
  nodeY: 304,                        // vent node height — one jump + a dash
  islands: [[345,352],[358,365],[371,378],[381,393]]
    .map(([a,b]) => [a*TILE, b*TILE]),               // px [x0,x1)
  gate: { tx0: 393, tx1: 394, ty0: 26, ty1: 41 },
};
const RAIL_X0 = ARENA.x0 + 4, RAIL_X1 = ARENA.x1 - 4;
/* the sweep runs lip to gate face — the east corner cannot be camped */
const SWEEP_X0 = ARENA.x0 + 14, SWEEP_X1 = ARENA.x1 - 12;
const clampRail = x => Math.max(RAIL_X0 + 18, Math.min(RAIL_X1 - 18, x));

/* per-phase escalation: faster sweeps, tighter mist, extra vine */
const PHASES = [
  { sweepV: 1.2, passes: 1, dir:  1, mistV: 0.70, mistW: 40, vines: [1],     coilF: 140 },
  { sweepV: 1.6, passes: 1, dir: -1, mistV: 0.80, mistW: 56, vines: [1,2],   coilF: 170 },
  { sweepV: 2.0, passes: 2, dir:  1, mistV: 0.90, mistW: 72, vines: [0,1,2], coilF: 200 },
];
const TELE = 30;                     // every attack telegraphs ~30 frames
const VENT_F = 90;                   // gold-node window
const MIST_PUSH_G = 0.24, MIST_PUSH_A = 0.10;   // push accel ground / air

/* ---------------- boss state (exported for the verifier bot) ---------------- */
export const G = {
  active: false, dead: false, hits: 0,
  frame: 0, mode: 'idle', t: 0,
  x: (RAIL_X0 + RAIL_X1)/2,          // gantry center on the rail
  sweepDir: 1, sweepPass: 0,
  mist: null,                        // { x, w, v, pierced }
  coils: [],                         // { x0, x1, y, landed }
  ventX: 0, hitDone: false, hitFx: 0,
  crashX: 0, crashY: 0,              // death slide + fall
  fallV: 0, banner: 0,
};

export function gardenerReset(){
  G.active = false; G.dead = false; G.hits = 0;
  G.frame = 0; G.mode = 'idle'; G.t = 0;
  G.x = (RAIL_X0 + RAIL_X1)/2;
  G.sweepDir = 1; G.sweepPass = 0;
  G.mist = null; G.coils = [];
  G.ventX = 0; G.hitDone = false; G.hitFx = 0;
  G.crashX = 0; G.crashY = 0; G.fallV = 0; G.banner = 0;
}

/* pattern restart (death / retreat): keep the hits, drop the transients */
function softReset(){
  G.active = false; G.mode = 'idle'; G.t = 0; G.frame = 0;
  G.mist = null; G.coils = []; G.sweepPass = 0; G.hitDone = false;
}

const setMode = m => { G.mode = m; G.t = 0; };
const glideTo = (tx, v) => { G.x += Math.max(-v, Math.min(v, tx - G.x)); };
const overlap = (P, x, y, w, h) =>
  P.x < x + w && P.x + P.w > x && P.y < y + h && P.y + P.h > y;
function kill(P){ P.deaths++; respawn(P); }

const gateSolid = () => level.solidAt(ARENA.gate.tx0, ARENA.gate.ty0 + 4);
function openGate(){
  for(let ty = ARENA.gate.ty0; ty <= ARENA.gate.ty1; ty++)
    for(let tx = ARENA.gate.tx0; tx <= ARENA.gate.tx1; tx++)
      level.clearTile(tx, ty);
}

/* ================================================================
   SIMULATION — called once per fixed step from the room tick hook.
   ================================================================ */
export function gardenerTick(P){
  /* a fresh room copy restored the gate while the wreck was down:
     the world was re-entered — full reset */
  if(G.dead && gateSolid()) gardenerReset();

  /* death choreography runs to completion wherever the player stands */
  if(G.mode === 'dying' || G.mode === 'fall' || G.mode === 'splash' || G.mode === 'wreck'){
    stepDeath(); return;
  }

  const inArena = P.x + P.w > ARENA.x0 + 2 && P.x < ARENA.x1;
  if(!inArena){ if(G.active) softReset(); return; }
  if(!G.active){ G.active = true; G.banner = 160; }

  G.frame++; G.t++;
  if(G.banner > 0) G.banner--;
  if(G.hitFx > 0) G.hitFx--;
  const ph = PHASES[Math.min(G.hits, 2)];

  switch(G.mode){
    case 'idle':                     // glide menacingly over the player
      glideTo(clampRail(P.x + P.w/2), 1.0);
      if(G.t >= 40){ G.sweepDir = ph.dir; G.sweepPass = 0; setMode('sweepTele'); }
      break;
    case 'sweepTele': {              // park at the start end, nozzles glowing
      const park = G.sweepDir > 0 ? SWEEP_X0 : SWEEP_X1;
      glideTo(park, 6.0);
      if(G.t >= TELE && Math.abs(G.x - park) < 2) setMode('sweep');
      break;
    }
    case 'sweep': {
      G.x += ph.sweepV * G.sweepDir;
      const done = G.sweepDir > 0 ? G.x >= SWEEP_X1 : G.x <= SWEEP_X0;
      if(done){
        G.sweepPass++;
        if(G.sweepPass >= ph.passes) setMode('pause1');
        else G.sweepDir = -G.sweepDir;
      }
      break;
    }
    case 'pause1':
      if(G.t >= 30) setMode('mistTele');
      break;
    case 'mistTele':                 // hiss cloud builds at the west end
      glideTo(clampRail(SWEEP_X0), 6.0);
      if(G.t >= TELE && Math.abs(G.x - clampRail(SWEEP_X0)) < 2){
        G.mist = { x: ARENA.x0 - ph.mistW/2, w: ph.mistW, v: ph.mistV, pierced: false };
        setMode('mist');
      }
      break;
    case 'mist':
      G.mist.x += G.mist.v;
      glideTo(clampRail(G.mist.x), 2.0);       // the rig shepherds its own mist
      if(G.mist.x - G.mist.w/2 > ARENA.x1){ G.mist = null; setMode('pause2'); }
      break;
    case 'pause2':
      if(G.t >= 30) setMode('vineTele');
      break;
    case 'vineTele':                 // falling leaves mark the doomed islands
      if(G.t === 1)
        G.coils = ph.vines.map(i => ({
          x0: ARENA.islands[i][0] + 4, x1: ARENA.islands[i][1] - 4,
          y: 210, landed: false,
        }));
      glideTo(clampRail((ARENA.x0 + ARENA.x1)/2), 2.0);
      if(G.t >= TELE + 10) setMode('vineDrop');
      break;
    case 'vineDrop': {
      let all = true;
      for(const c of G.coils){
        if(!c.landed){
          c.y += 7;
          if(c.y >= ARENA.floorY - 12){ c.y = ARENA.floorY - 12; c.landed = true; }
        }
        if(!c.landed) all = false;
      }
      if(all) setMode('coil');
      break;
    }
    case 'coil':
      if(G.t >= ph.coilF){ G.coils = []; setMode('ventMove'); }
      break;
    case 'ventMove': {               // park over the island nearest the player
      if(G.t === 1){
        let best = ARENA.islands[0];
        for(const I of ARENA.islands)
          if(Math.abs((I[0]+I[1])/2 - (P.x+P.w/2)) < Math.abs((best[0]+best[1])/2 - (P.x+P.w/2)))
            best = I;
        G.ventX = clampRail((best[0] + best[1])/2);
        G.hitDone = false;
      }
      glideTo(G.ventX, 2.2);
      if(Math.abs(G.x - G.ventX) < 1 && G.t >= 20) setMode('vent');
      break;
    }
    case 'vent':                     // the node hangs gold — dash through it
      if(!G.hitDone && P.dashLeft > 0 &&
         overlap(P, G.x - 7, ARENA.nodeY - 7, 14, 14)){
        G.hitDone = true; G.hits++; G.hitFx = 30;
        P.flash = Math.max(P.flash, 12);       // i-frame flash
        P.shake = Math.max(P.shake, 10);       // screen shake
        P.freeze = Math.max(P.freeze, 6);      // hit-stop
        if(G.hits >= 3){ startDeath(); break; }
        setMode('recoil');
        break;
      }
      if(G.t >= VENT_F) setMode('idle');       // window missed — same phase again
      break;
    case 'recoil':                   // sparking lurch, then the escalated cycle
      G.x = clampRail(G.x + ((G.t % 4 < 2) ? 1.2 : -1.2));
      if(G.t >= 60) setMode('idle');
      break;
  }

  /* ---------------- hazards (a dash i-frames jets and mist, not coils) ---------------- */
  if(G.mode === 'sweep' && P.dashLeft === 0 &&
     overlap(P, G.x - 5, ARENA.railY + 18, 10, ARENA.floorY + 8 - (ARENA.railY + 18)))
    return kill(P);

  if((G.mode === 'coil' || G.mode === 'vineDrop'))
    for(const c of G.coils)
      if(c.landed && overlap(P, c.x0, ARENA.floorY - 12, c.x1 - c.x0, 12))
        return kill(P);

  if(G.mode === 'mist' && G.mist){
    const m = G.mist;
    const over = P.x + P.w > m.x - m.w/2 && P.x < m.x + m.w/2;
    if(over && P.dashLeft > 0) m.pierced = true;             // nozzle line sheared
    else if(over && !m.pierced)
      P.vx = Math.min(P.vx + (P.grounded ? MIST_PUSH_G : MIST_PUSH_A), 2.2);
  }
}

/* ---------------- death choreography ---------------- */
function startDeath(){
  setMode('dying');
  /* stagger to the nearest pond strip and come down in it */
  const ponds = [[342,345],[352,358],[365,371],[378,384]]
    .map(([a,b]) => (a*TILE + b*TILE)/2);
  G.crashX = ponds.reduce((b,x) => Math.abs(x - G.x) < Math.abs(b - G.x) ? x : b, ponds[0]);
  G.crashY = ARENA.railY + 2;
}
function stepDeath(){
  G.frame++; G.t++;
  if(G.mode === 'dying'){                       // sparks, shudder, slide
    glideTo(G.crashX, 1.4);
    G.x += (G.t % 6 < 3 ? 0.6 : -0.6);
    if(G.t >= 80 && Math.abs(G.x - G.crashX) < 6){
      G.x = G.crashX; G.fallV = 0; setMode('fall');
    }
  }else if(G.mode === 'fall'){                  // off the rail, into the pond
    G.fallV = Math.min(G.fallV + 0.28, 4.5);
    G.crashY += G.fallV;
    if(G.crashY >= ARENA.waterY + 4){
      G.crashY = ARENA.waterY + 4;
      G.dead = true; openGate();                // the way out opens as it hits
      setMode('splash');
    }
  }else if(G.mode === 'splash'){                // spray + koi scatter
    if(G.t >= 120) setMode('wreck');
  }
  /* 'wreck': inert, half-sunk, drawn forever */
}

/* ================================================================
   RENDERING — cosmetic clock only; the sim never reads vclock.
   Called from src/conservatory.js (backdrop / front / UI hooks).
   ================================================================ */
const hash = (a,b) => ((a*73856093) ^ (b*19349663)) >>> 0;
let vclock = 0;

const C = {
  cream:  '#d3c9a8',  creamHi: '#e8e0c4', creamLo: '#a89f7f',
  green:  '#4a6a4f',  greenLo: '#35503b',
  steel:  '#3a4448',  steelHi: '#5c6a70', steelLo: '#252d31',
  hazY:   '#e0c23a',  hazK:    '#26261e',
  hose:   '#3a5a48',
  jet:    'rgba(190,226,228,',
  mist:   'rgba(198,222,206,',
  gold:   '#f7c623',  goldHi:  '#ffe98a',
  vine:   '#3f5c35',  vineHi:  '#557a41', vineLo: '#2c4128',
  spark:  '#ffd76a',
  lampOk: '#7fd98a',  lampNo:  '#e05648',
};

const onScreen = (cx, x, pad = 60) => x > cx - pad && x < cx + VIEW_W + pad;

/* faint glasshouse end-gable behind the arena — drawn after the main
   conservatory backdrop, before tiles */
export function drawBack(ctx, cx, cy){
  if(cx + VIEW_W < ARENA.x0 - 80 || cx > ARENA.x1 + 160) return;
  /* the chamber reads a shade lighter than the deep jungle */
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, 'rgba(201,214,203,0.16)');
  g.addColorStop(1, 'rgba(201,214,203,0.02)');
  ctx.fillStyle = g;
  const wx0 = Math.max(0, ARENA.x0 - 40 - cx), wx1 = Math.min(VIEW_W, ARENA.x1 + 60 - cx);
  ctx.fillRect(wx0, 0, wx1 - wx0, VIEW_H);
  /* distant glazing grid of the east gable */
  ctx.fillStyle = 'rgba(90,106,96,0.30)';
  for(let wy = 150; wy <= 270; wy += 30){
    const y = wy - cy*0.94;
    if(y > -2 && y < VIEW_H) ctx.fillRect(wx0, y, wx1 - wx0, 1);
  }
  for(let tx = ARENA.x0 - 40; tx <= ARENA.x1 + 60; tx += 26){
    const sx = tx - cx;
    if(sx < wx0 || sx > wx1) continue;
    ctx.fillRect(sx, Math.max(0, 150 - cy*0.94), 1, Math.min(VIEW_H, 270 - cy*0.94) - Math.max(0, 150 - cy*0.94));
    if(hash(tx, 5) % 7 === 2){
      ctx.fillStyle = 'rgba(223,233,221,0.18)';
      ctx.fillRect(sx + 3, Math.max(0, 156 - cy*0.94), 20, 22);
      ctx.fillStyle = 'rgba(90,106,96,0.30)';
    }
  }
  /* roof trusses above the rail */
  ctx.fillStyle = 'rgba(60,74,66,0.5)';
  for(let tx = ARENA.x0; tx < ARENA.x1; tx += 48){
    const sx = tx - cx;
    if(sx < -20 || sx > VIEW_W + 20) continue;
    for(let s = 0; s < 24; s += 2)
      ctx.fillRect(sx + s, ARENA.railY - 34 - cy + (s>>1), 2, 1);
  }
}

/* everything that lives in the arena's play layer: rail, gantry, jets,
   mist, coils, node, sparks, wreck. Drawn just above the player. */
export function drawMid(ctx, cx, cy, P){
  vclock++;
  if(cx + VIEW_W < ARENA.x0 - 80 || cx > ARENA.x1 + 160) return;
  const ry = ARENA.railY - cy;

  /* ---- the rail: steel channel + hangers + hazard tape at the ends ---- */
  ctx.fillStyle = C.steelLo; ctx.fillRect(RAIL_X0 - cx, ry - 1, RAIL_X1 - RAIL_X0, 4);
  ctx.fillStyle = C.steelHi; ctx.fillRect(RAIL_X0 - cx, ry - 1, RAIL_X1 - RAIL_X0, 1);
  for(let x = RAIL_X0; x <= RAIL_X1; x += 32){
    const sx = x - cx;
    if(sx < -4 || sx > VIEW_W + 4) continue;
    ctx.fillStyle = C.steel; ctx.fillRect(sx, ry - 12, 2, 11);       // hanger
    ctx.fillStyle = C.steelLo; ctx.fillRect(sx - 1, ry - 13, 4, 2);  // roof shoe
  }
  for(const ex of [RAIL_X0, RAIL_X1 - 8]){                            // end stops
    const sx = ex - cx;
    for(let i = 0; i < 8; i += 2){
      ctx.fillStyle = (i/2) % 2 ? C.hazK : C.hazY;
      ctx.fillRect(sx + i, ry - 4, 2, 3);
    }
  }

  /* ---- telegraphs and attacks ---- */
  const gx = G.x - cx;
  if(G.mode === 'sweepTele'){                    // nozzle glow + rail sparks
    const a = 0.25 + 0.35*Math.abs(Math.sin(vclock*0.3));
    ctx.fillStyle = C.jet + a + ')';
    ctx.fillRect(gx - 4, ry + 18, 8, 10);
    drawSparks(ctx, gx, ry + 2, 4);
  }
  if(G.mode === 'sweep'){                        // the raking water column
    const bot = ARENA.floorY + 8 - cy;
    for(const [off, w, a] of [[-5, 10, 0.30], [-3, 6, 0.45], [-1, 2, 0.8]]){
      ctx.fillStyle = C.jet + a + ')';
      ctx.fillRect(gx + off, ry + 16, w, bot - ry - 16);
    }
    for(let i = 0; i < 5; i++){                  // spray at the base
      const h = hash(i, vclock >> 1);
      ctx.fillStyle = C.jet + '0.7)';
      ctx.fillRect(gx - 7 + (h % 15), bot - 3 - (h % 5), 1, 1);
    }
    ctx.fillStyle = 'rgba(240,250,250,0.8)';
    ctx.fillRect(gx - 6, bot - 1, 12, 1);
  }
  if(G.mode === 'mistTele'){                     // hiss cloud building
    const a = 0.10 + 0.10*Math.abs(Math.sin(vclock*0.2));
    ctx.fillStyle = C.mist + a + ')';
    ctx.fillRect(ARENA.x0 - 16 - cx, ry + 10, 34, ARENA.floorY - ARENA.railY);
  }
  if(G.mode === 'mist' && G.mist){               // the wall itself
    const m = G.mist, mx = m.x - cx;
    if(m.pierced){
      ctx.fillStyle = C.mist + '0.10)';
      ctx.fillRect(mx - m.w/2, ry + 30, m.w, ARENA.floorY + 12 - ARENA.railY - 30);
    }else{
      for(const [f, a] of [[1, 0.16], [0.66, 0.16], [0.33, 0.20]]){
        ctx.fillStyle = C.mist + a + ')';
        ctx.fillRect(mx - m.w*f/2, ry + 10, m.w*f, ARENA.floorY + 14 - ARENA.railY - 10);
      }
      for(let i = 0; i < 8; i++){                // curling wisps
        const h = hash(i, vclock >> 2);
        ctx.fillStyle = C.mist + '0.5)';
        ctx.fillRect(mx - m.w/2 + (h % m.w), ry + 14 + (h % 60), 2, 1);
      }
    }
  }
  if(G.mode === 'vineTele')                      // falling leaves over targets
    for(const c of G.coils)
      for(let i = 0; i < 10; i++){
        const h = hash(i, (c.x0 >> 3));
        const lx = c.x0 + ((h + i*13) % (c.x1 - c.x0));
        const ly = 240 + ((h >> 4) + vclock*1.4 + i*17) % 96;
        const sx = lx - cx + Math.sin((ly + h)*0.15)*2, sy = ly - cy;
        ctx.fillStyle = i % 2 ? '#8fb763' : C.vineHi;
        ctx.fillRect(sx, sy, 2, 2);
        ctx.fillStyle = C.vine; ctx.fillRect(sx + 1, sy + 2, 1, 1);
      }
  for(const c of G.coils){                       // dropping / resting coils
    if(G.mode === 'vineTele') break;
    const y = c.y - cy;
    for(let x = c.x0; x < c.x1; x += 8){
      const sx = x - cx, h = hash(x >> 3, 9);
      ctx.fillStyle = C.vineLo; ctx.fillRect(sx, y + 6, 8, 6);
      ctx.fillStyle = C.vine;   ctx.fillRect(sx, y + 2, 8, 4);
      ctx.fillStyle = C.vineHi; ctx.fillRect(sx + (h % 4), y, 5, 2);
      ctx.fillStyle = C.vineLo; ctx.fillRect(sx + 2 + (h % 3), y + 3, 2, 2); // loop hole
      if(!c.landed){ ctx.fillStyle = C.vine; ctx.fillRect(sx + 3, y - 26, 1, 26); }
    }
    ctx.fillStyle = '#d96a8a';                   // one warning bloom per coil
    ctx.fillRect(c.x0 + ((c.x1 - c.x0) >> 1) - cx, y - 2, 2, 2);
  }

  /* ---- the gantry itself (hidden once it has become the wreck) ---- */
  if(G.mode !== 'wreck' && G.mode !== 'splash') drawGantry(ctx, cx, cy);
  if(G.mode === 'fall') drawGantryBody(ctx, G.x - cx, G.crashY - cy, 1);

  /* ---- vent node ---- */
  if(G.mode === 'vent'){
    const nx = G.x - cx, ny = ARENA.nodeY - cy;
    ctx.fillStyle = C.steel; ctx.fillRect(nx - 1, ry + 16, 2, ny - ry - 20);  // arm
    const pulse = 0.5 + 0.5*Math.sin(vclock*0.25);
    const halo = ctx.createRadialGradient(nx, ny, 1, nx, ny, 16);
    halo.addColorStop(0, `rgba(247,198,35,${0.35 + 0.25*pulse})`);
    halo.addColorStop(1, 'rgba(247,198,35,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(nx, ny, 16, 0, 7); ctx.fill();
    ctx.fillStyle = C.gold;                       // diamond node
    ctx.fillRect(nx - 3, ny - 3, 6, 6);
    ctx.fillRect(nx - 5, ny - 1, 10, 2); ctx.fillRect(nx - 1, ny - 5, 2, 10);
    ctx.fillStyle = C.goldHi; ctx.fillRect(nx - 1, ny - 1, 2, 2);
  }
  if(G.hitFx > 0){                                // hit burst
    const nx = G.x - cx, ny = ARENA.nodeY - cy;
    ctx.fillStyle = `rgba(255,233,138,${G.hitFx/30})`;
    for(let i = 0; i < 8; i++){
      const h = hash(i, 77), r = (30 - G.hitFx)*0.8 + (h % 3);
      ctx.fillRect(nx + Math.cos(i*0.79)*r, ny + Math.sin(i*0.79)*r, 2, 2);
    }
  }

  /* ---- dying / splash / wreck ---- */
  if(G.mode === 'dying') drawSparks(ctx, gx, ry + 6, 9);
  if(G.mode === 'splash' || G.mode === 'wreck'){
    const wy = ARENA.waterY - cy, wx = G.crashX - cx;
    drawGantryBody(ctx, wx, wy - 4, 2);           // half-sunk, tilted
    if(G.mode === 'splash'){
      const p = G.t/120;
      ctx.fillStyle = `rgba(220,240,238,${0.8 - p*0.7})`;
      for(let i = 0; i < 10; i++){                // spray arcs
        const h = hash(i, 31), a = i*0.63;
        const r = 6 + p*26 + (h % 5);
        ctx.fillRect(wx + Math.cos(a)*r, wy - Math.abs(Math.sin(a))*r*0.9 + 2, 2, 2);
      }
      ctx.fillStyle = `rgba(127,174,148,${0.7 - p*0.6})`;   // rings
      ctx.fillRect(wx - 8 - p*22, wy, 6, 1); ctx.fillRect(wx + 4 + p*22, wy, 6, 1);
      /* koi scatter: orange darts fleeing the impact */
      for(let i = 0; i < 6; i++){
        const h = hash(i, 13), d = i % 2 ? 1 : -1;
        const kx = wx + d*(10 + p*70 + (h % 12)), ky = wy + 4 + (h % 8);
        ctx.fillStyle = '#e8762a'; ctx.fillRect(kx, ky, 5, 2);
        ctx.fillStyle = '#c4581c'; ctx.fillRect(kx + (d > 0 ? 5 : -2), ky, 2, 2);
      }
    }else{
      /* dead status lamp blinks out; drips + last bubbles */
      if(vclock % 90 < 4){ ctx.fillStyle = C.lampNo; ctx.fillRect(wx + 8, wy - 14, 2, 2); }
      if(vclock % 50 < 10){
        ctx.fillStyle = 'rgba(190,226,228,0.5)';
        ctx.fillRect(wx - 6 + (vclock % 3)*5, wy - 2 - (vclock % 50)/6, 1, 1);
      }
    }
  }
}

function drawSparks(ctx, sx, sy, n){
  for(let i = 0; i < n; i++){
    const h = hash(i, vclock >> 1);
    if(h % 3) continue;
    ctx.fillStyle = i % 2 ? C.spark : '#fff6d8';
    ctx.fillRect(sx - 10 + (h % 21), sy + (h >> 3) % 8, 1, 1);
  }
}

/* the rig on its rail: trolley + chassis */
function drawGantry(ctx, cx, cy){
  const x = G.x - cx, y = ARENA.railY - cy;
  if(x < -40 || x > VIEW_W + 40) return;
  /* trolley wheels riding the channel */
  ctx.fillStyle = C.steelLo;
  ctx.fillRect(x - 10, y - 3, 5, 4); ctx.fillRect(x + 5, y - 3, 5, 4);
  ctx.fillStyle = C.steelHi; ctx.fillRect(x - 9, y - 3, 1, 1); ctx.fillRect(x + 6, y - 3, 1, 1);
  ctx.fillStyle = C.steel;   ctx.fillRect(x - 2, y - 2, 4, 5);   // yoke
  drawGantryBody(ctx, x, y + 3, 0);
}

/* chassis at (x, top). tilt: 0 level, 1 falling, 2 wrecked in the pond */
function drawGantryBody(ctx, x, top, tilt){
  const lean = tilt === 0 ? 0 : (tilt === 1 ? 2 : 3);
  const y = top;
  /* chassis: municipal cream box with a green service band */
  ctx.fillStyle = C.creamLo; ctx.fillRect(x - 18, y + lean, 36, 13);
  ctx.fillStyle = C.cream;   ctx.fillRect(x - 17, y + lean, 34, 11);
  ctx.fillStyle = C.creamHi; ctx.fillRect(x - 17, y + lean, 34, 2);
  ctx.fillStyle = C.green;   ctx.fillRect(x - 17, y + 6 + lean, 34, 3);
  ctx.fillStyle = C.greenLo; ctx.fillRect(x - 17, y + 8 + lean, 34, 1);
  /* hazard-striped bumpers */
  for(let i = 0; i < 6; i += 2){
    ctx.fillStyle = (i/2) % 2 ? C.hazK : C.hazY;
    ctx.fillRect(x - 18, y + 1 + i + lean, 2, 2);
    ctx.fillStyle = (i/2) % 2 ? C.hazY : C.hazK;
    ctx.fillRect(x + 16, y + 1 + i + lean, 2, 2);
  }
  /* stencil + rivets */
  ctx.fillStyle = C.creamLo;
  ctx.fillRect(x - 12, y + 3 + lean, 8, 1); ctx.fillRect(x - 12, y + 5 + lean, 5, 1);
  for(const rx of [-15, -5, 5, 13]) ctx.fillRect(x + rx, y + 10 + lean, 1, 1);
  /* hose reel drum on the east end */
  ctx.fillStyle = C.steel;  ctx.fillRect(x + 6, y - 5 + lean, 9, 6);
  ctx.fillStyle = C.hose;
  ctx.fillRect(x + 7, y - 4 + lean, 7, 1); ctx.fillRect(x + 7, y - 2 + lean, 7, 1);
  ctx.fillStyle = C.steelHi; ctx.fillRect(x + 10, y - 3 + lean, 1, 1);   // axle
  /* nozzle arms hanging below */
  const armGlow = G.mode === 'sweepTele' || G.mode === 'sweep';
  for(const ax of [-11, 0, 11]){
    ctx.fillStyle = C.steel;
    ctx.fillRect(x + ax, y + 13 + lean, 2, 4 - (tilt ? 2 : 0));
    ctx.fillStyle = armGlow ? '#bfe2e4' : C.steelLo;
    ctx.fillRect(x + ax - 1, y + 16 + lean - (tilt ? 2 : 0), 4, 2);
  }
  /* the blinking status lamp */
  if(tilt !== 2){
    const tele = G.mode.endsWith('Tele');
    const on = tele ? (vclock % 10 < 5) : (vclock % 50 < 8);
    const col = G.mode === 'vent' ? C.gold : (tele ? C.lampNo : C.lampOk);
    ctx.fillStyle = '#2a2a24'; ctx.fillRect(x - 12, y - 4 + lean, 4, 4);
    if(on){
      ctx.fillStyle = col; ctx.fillRect(x - 11, y - 3 + lean, 2, 2);
      ctx.fillStyle = `rgba(255,255,255,0.25)`; ctx.fillRect(x - 12, y - 5 + lean, 4, 1);
    }
  }
}

/* boss UI: name banner + remaining-node pips. Drawn above the vignette. */
export function drawUI(ctx, P){
  if(G.dead && G.mode === 'wreck' && G.t < 200){
    ctx.fillStyle = 'rgba(6,12,9,0.72)';
    ctx.fillRect(VIEW_W/2 - 86, 18, 172, 24);
    ctx.fillStyle = C.gold; ctx.font = '7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('IRRIGATION UNIT 03 — DECOMMISSIONED', VIEW_W/2, 28);
    ctx.fillStyle = '#c9d6cb';
    ctx.fillText('THE WAY OUT IS OPEN', VIEW_W/2, 37);
    ctx.textAlign = 'left';
    return;
  }
  if(!G.active && G.banner <= 0) return;
  if(G.banner > 0){
    const a = Math.min(1, G.banner > 130 ? (160 - G.banner)/30 : G.banner/40);
    ctx.fillStyle = `rgba(6,12,9,${0.72*a})`;
    ctx.fillRect(VIEW_W/2 - 78, 16, 156, 26);
    ctx.globalAlpha = a;
    ctx.fillStyle = C.gold; ctx.font = '8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('THE HEAD GARDENER', VIEW_W/2, 27);
    ctx.fillStyle = '#c9d6cb'; ctx.font = '7px monospace';
    ctx.fillText('AUTOMATED IRRIGATION UNIT 03', VIEW_W/2, 37);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
  if(G.active && !G.dead){
    /* three node pips: unspent ones gold, spent ones dark */
    for(let i = 0; i < 3; i++){
      const px = VIEW_W/2 - 14 + i*12;
      ctx.fillStyle = '#20281f'; ctx.fillRect(px - 1, 7, 8, 8);
      ctx.fillStyle = i < 3 - G.hits ? C.gold : '#3a3a2c';
      ctx.fillRect(px + 1, 9, 4, 4);
      if(i < 3 - G.hits){ ctx.fillStyle = C.goldHi; ctx.fillRect(px + 2, 10, 1, 1); }
    }
  }
}
