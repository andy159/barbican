/* MOTHLIGHT — the dream level, lived from inside Stan Brakhage's
   Mothlight (1963). Everything here: the projector-white backdrop with
   its whole-frame stamp compositions, film grain / scratches / frame
   slips, the organic tile skins (moth-wing platforms, leaf masses,
   grass-blade stalks), the moth hazards, and the exit tear.

   Two halves, one module:
   - mothTick(P): pure sim (no DOM). Deterministic moth spawner driven
     by a frame counter that resets on room load and on death, so every
     attempt sees the identical choreography and the verifier can prove
     dodgeability. Wired in as the room's `tick` by levels/mothlight.js.
   - renderMothlight(ctx, ...): full alternate render path, dispatched
     from render.js when the room carries `backdrop: 'mothlight'`.

   Palette per docs/arts-centre.md: lamp white on which translucent
   ochre #b98a3c / sepia #7d5a33 / umber #3b2a1a organic silhouettes
   flicker, with rare grass-green and petal-pink accents. */
import { MOTH_TUNING as MT } from './tuning.js';
import * as level from './level.js';
import { TILE } from './level.js';
import { respawn } from './player.js';
import { cam, VIEW_W, VIEW_H } from './camera.js';
import { drawPlayer } from './render.js';

/* ---------------- deterministic hash (no wall clock, no Math.random
   in anything the sim or the film composition depends on) ----------- */
function hash(n){
  n = (n ^ 61) ^ (n >>> 16);
  n = (n + (n << 3)) | 0;
  n = n ^ (n >>> 4);
  n = Math.imul(n, 0x27d4eb2d);
  n = n ^ (n >>> 15);
  return (n >>> 0) / 4294967296;
}
const h2 = (a, b) => hash(Math.imul(a, 374761393) + Math.imul(b, 668265263));

/* ---------------- sim state ---------------- */
let mf = 0;                       // frames since room load / last death
let moths = [];
let lastRoom = null, lastDeaths = -1;
let finished = false, bloom = 0, wakeHold = 0;
let goTo = null;                                 // injected by world.js (no cycle)
export function bindWorld(fn){ goTo = fn; }

export function resetMothlight(){
  mf = 0; moths = []; finished = false; bloom = 0; wakeHold = 0;
}
export const mothFrame  = () => mf;
export const isFinished = () => finished;
/* moths that have finished their telegraph and can kill */
export const liveMoths = () =>
  moths.filter(m => mf - m.born >= MT.MOTH_telegraph);

const KIND_VX = {                 // cruise speed by kind, from tuning
  drift: MT.MOTH_driftVX,
  dart:  MT.MOTH_dartVX,
  swarm: MT.MOTH_swarmVX,
};

/* Closed-form flight: position is a pure function of the spawn point
   and age, so replays are exact and the verifier's proofs are the
   game's truth. (Emitters with rel:true spawn ahead of the player —
   still deterministic: same inputs, same flight.) */
function mothPos(m, t){
  const vx = KIND_VX[m.e.kind] * m.e.dir;
  return {
    x: m.x0 + vx * t,
    y: m.e.sy + m.e.amp * Math.sin(m.e.freq * t + (m.born % 97) * 0.13),
  };
}

export function mothTick(P){
  const room = level.currentRoom();
  if(room !== lastRoom){ lastRoom = room; lastDeaths = P.deaths; resetMothlight(); }
  if(P.deaths !== lastDeaths){ lastDeaths = P.deaths; resetMothlight(); }

  P.abilities.dash = true;        // the dream grants the dash for its finale

  mf++;

  /* deterministic spawner: an emitter fires every `period` frames at
     `phase` while the player is inside its trigger zone */
  if(!finished){
    const px = P.x + P.w/2;
    for(const e of (room.emitters || [])){
      if(px < e.zone[0] || px > e.zone[1]) continue;
      if(mf % e.period !== e.phase) continue;
      const x0 = e.rel ? Math.round(px) + e.sx : e.sx;   // ahead of the player
      moths.push({ e, born: mf, x0, x: x0, y: e.sy });
    }
  }

  /* flight + cull */
  for(let i = moths.length - 1; i >= 0; i--){
    const m = moths[i];
    const t = mf - m.born - MT.MOTH_telegraph;
    if(t < 0) continue;                          // still telegraphing
    const p = mothPos(m, t);
    m.x = p.x; m.y = p.y;
    if(t > MT.MOTH_life || m.x < -60 || m.x > level.ROOM_W*TILE + 100)
      moths.splice(i, 1);
  }

  if(finished){
    if(bloom < 1) bloom = Math.min(1, bloom + 0.015);
    else if(++wakeHold > 45 && goTo) goTo('arts-centre', P, [318, 46]);   // wake in Cinema 1
    return;
  }

  /* moth vs player AABB — a touch wakes you at the last frame marker */
  for(const m of moths){
    if(mf - m.born < MT.MOTH_telegraph) continue;
    if(m.x - MT.MOTH_boxW/2 < P.x + P.w && m.x + MT.MOTH_boxW/2 > P.x &&
       m.y - MT.MOTH_boxH/2 < P.y + P.h && m.y + MT.MOTH_boxH/2 > P.y){
      P.deaths++; respawn(P);
      lastDeaths = P.deaths;
      resetMothlight();                          // the reel rewinds with you
      return;
    }
  }

  /* the tear: touch the white rip and the reel runs out */
  if(level.overlapsChar(P.x, P.y, P.w, P.h, 'E')){
    finished = true;
    P.flash = 20; P.freeze = 10;
    /* the reel runs out; after the bloom the player wakes in Cinema 1
       (goTo above), abilities and keys intact */
  }
}

/* ================================================================
   RENDER — inside the film. Layers: lamp-white field (flickering) →
   whole-frame stamp composition (replaced several times a second) →
   ghost thread + organic tiles → exit tear glow → moths (telegraphs
   then silhouettes) → player halo + player → grain/scratches/dust →
   projected-frame vignette + sprocket ghosts → death flash → debug.
   ================================================================ */
const OCHRE = '#b98a3c', SEPIA = '#7d5a33', UMBER = '#3b2a1a';
const GRASS = '#6b6f3d', PINK  = '#c99a8a';
const STAMP_COLS = [OCHRE, SEPIA, UMBER, OCHRE, SEPIA, GRASS, PINK];

export function renderMothlight(ctx, P, alpha, debugOn, fps){
  const cx = Math.round(cam.x), cy = Math.round(cam.y);

  /* --- frame slip: 2-3 near-black frames now and then --- */
  const win = Math.floor(mf / 97);
  const slipAt = Math.floor(h2(win, 3) * 90);
  const slipLen = 2 + (h2(win, 4) < 0.5 ? 0 : 1);
  const slipping = h2(win, 7) < 0.20 &&
                   (mf % 97) >= slipAt && (mf % 97) < slipAt + slipLen;
  if(slipping){
    ctx.fillStyle = '#120d07';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    /* the one solid thing survives the slip as a pale ghost —
       "if black were white and white were black" */
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#f4f0e6';
    ctx.fillRect(P.x - cx, P.y - cy, P.w, P.h);
    ctx.globalAlpha = 1;
    frameEdge(ctx);
    return;
  }

  /* --- lamp-white field, flickering ±3% --- */
  const flick = 1 + (hash(mf * 3 + 11) - 0.5) * 0.06;
  const lamp = (r,g,b) => `rgb(${Math.min(255, Math.round(r*flick))},` +
    `${Math.min(255, Math.round(g*flick))},${Math.min(255, Math.round(b*flick))})`;
  ctx.fillStyle = lamp(244, 240, 230);
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  /* --- whole-frame composition: nothing tweens, the image replaces
     itself every 3 frames with fresh stamps; density does a slow walk
     between sparse / normal / burst, with white runs after bursts --- */
  const ci = Math.floor(mf / 3);
  const stateI = Math.floor(mf / 150);
  const sRoll = hash(stateI * 7 + 1);
  const state = sRoll < 0.30 ? 0 : sRoll < 0.82 ? 1 : 2;
  const prevBurst = hash((stateI - 1) * 7 + 1) >= 0.82;
  const whiteRun = prevBurst && (mf % 150) < 8 + Math.floor(hash(stateI * 5 + 2) * 30);
  let nStamps = state === 0 ? Math.floor(h2(ci,1) * 3)
              : state === 1 ? 4 + Math.floor(h2(ci,1) * 5)
              : 10 + Math.floor(h2(ci,1) * 5);
  if(whiteRun || h2(ci, 99) < 0.05) nStamps = 0;    // pure-white frames
  for(let k = 0; k < nStamps; k++){
    const s = Math.imul(ci, 131) + k * 7919;
    const type = h2(s, 11);
    const x = h2(s, 12) * VIEW_W, y = h2(s, 13) * VIEW_H;
    const sc = 12 + h2(s, 14) * 46;
    const rot = h2(s, 15) * 6.283;
    const col = STAMP_COLS[Math.floor(h2(s, 16) * 4.9 +
                 (h2(s, 21) < 0.12 ? 5 + h2(s, 22) : 0)) % 7];
    const a = 0.34 + h2(s, 17) * 0.34;
    if(type < 0.42)       stampWing(ctx, x, y, sc, rot, col, a, s);
    else if(type < 0.68)  stampLeaf(ctx, x, y, sc, rot, col, a, s);
    else if(type < 0.88)  stampGrass(ctx, x, y, sc, rot, a, s);
    else if(type < 0.96)  stampPetal(ctx, x, y, sc * 0.5, rot, a);
    else                  stampSeeds(ctx, x, y, sc, a, s);
  }

  /* --- organic tiles (world space, visible range only) --- */
  const x0 = Math.floor(cx/TILE), x1 = Math.floor((cx+VIEW_W)/TILE);
  const y0 = Math.floor(cy/TILE), y1 = Math.floor((cy+VIEW_H)/TILE);
  for(let ty = y0; ty <= y1; ty++){
    for(let tx = x0; tx <= x1; tx++){
      const t = level.tileAt(tx, ty);
      if(t === ' ' || t === '' || t === 'P') continue;
      const sx = tx*TILE - cx, sy = ty*TILE - cy;
      if(t === '=')      tileWing(ctx, sx, sy, tx, ty);
      else if(t === '#') tileMatter(ctx, sx, sy, tx, ty);
      else if(t === 'T') tileStalk(ctx, sx, sy, tx, ty);
      else if(t === 'B') tileMarker(ctx, sx, sy, tx, ty, P);
      else if(t === 'E') tileTear(ctx, sx, sy, tx, ty);
    }
  }

  /* exit tear glow: a radiant rip brighter than the lamp itself */
  for(const [gx, gy] of tearCenters()){
    const px = gx - cx, py = gy - cy;
    if(px < -80 || px > VIEW_W+80 || py < -80 || py > VIEW_H+80) continue;
    const pulse = 26 + Math.sin(mf * 0.07) * 5;
    /* white core, then a scorched sepia corona so the rip reads as
       burning through the already-white film */
    const g = ctx.createRadialGradient(px, py, 2, px, py, pulse + 34);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.3, 'rgba(255,252,240,0.55)');
    g.addColorStop(0.55, 'rgba(185,138,60,0.22)');
    g.addColorStop(0.8, 'rgba(125,90,51,0.18)');
    g.addColorStop(1, 'rgba(125,90,51,0)');
    ctx.fillStyle = g;
    ctx.fillRect(px - 64, py - 64, 128, 128);
  }

  /* --- signs: dream-logic labels in umber thread --- */
  for(const s of (level.currentRoom().signs || [])){
    const px = s.tx*TILE - cx, py = s.ty*TILE - cy;
    if(px < -80 || px > VIEW_W + 20) continue;
    ctx.fillStyle = 'rgba(59,42,26,0.75)';
    ctx.font = '7px monospace';
    ctx.fillText(s.text, px, py);
    ctx.fillStyle = 'rgba(138,111,74,0.5)';
    ctx.fillRect(px, py + 2, s.text.length * 4.3, 1);
  }

  /* --- moths --- */
  for(const m of moths){
    const age = mf - m.born;
    if(age < MT.MOTH_telegraph){
      /* telegraph: a faint flutter shadow on the spawn line, pinned to
         the screen edge if the spawn point is out of view */
      const lx = Math.max(6, Math.min(VIEW_W - 6, m.x0 - cx));
      const ly = m.e.sy - cy;
      if(ly < -10 || ly > VIEW_H + 10) continue;
      const th = 0.10 + 0.14 * (age / MT.MOTH_telegraph) +
                 0.06 * ((age >> 2) & 1);
      drawMoth(ctx, lx, ly, (age >> 2) & 1, th, m.e.kind);
    }else{
      const t = age - MT.MOTH_telegraph;
      const p0 = mothPos(m, t), p1 = mothPos(m, t + 1);
      const ix = p0.x + (p1.x - p0.x) * alpha - cx;
      const iy = p0.y + (p1.y - p0.y) * alpha - cy;
      if(ix < -14 || ix > VIEW_W + 14 || iy < -14 || iy > VIEW_H + 14) continue;
      drawMoth(ctx, ix, iy, ((age + m.born) >> 2) & 1, 0.92, m.e.kind);
    }
  }

  /* --- player: soft halo, then the one solid thing in the dream --- */
  const ix = P.px + (P.x - P.px) * alpha - cx;
  const iy = P.py + (P.y - P.py) * alpha - cy;
  const hg = ctx.createRadialGradient(ix + P.w/2, iy + P.h/2, 2,
                                      ix + P.w/2, iy + P.h/2, 22);
  hg.addColorStop(0, 'rgba(255,255,252,0.85)');
  hg.addColorStop(1, 'rgba(255,255,252,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(ix - 22, iy - 18, P.w + 44, P.h + 40);
  for(const tr of P.trail){                       // dash afterimages
    ctx.globalAlpha = Math.max(0, tr.life / 28) * 0.8;
    ctx.fillStyle = '#4a3826';
    ctx.fillRect(tr.x - cx, tr.y - cy, P.w, P.h);
  }
  ctx.globalAlpha = 1;
  drawPlayer(P, ix, iy);

  /* --- film artifacts: grain, dust, hairline scratches --- */
  for(let i = 0; i < 46; i++){                    // grain (per-frame noise)
    const gx = Math.random() * VIEW_W, gy = Math.random() * VIEW_H;
    ctx.fillStyle = Math.random() < 0.7
      ? 'rgba(59,42,26,0.07)' : 'rgba(255,255,255,0.10)';
    ctx.fillRect(gx, gy, 1, 1);
  }
  for(let i = 0; i < 8; i++){                     // dust specks per comp
    const s = Math.imul(ci, 977) + i * 613;
    if(h2(s, 31) < 0.5) continue;
    ctx.fillStyle = 'rgba(43,30,16,0.35)';
    ctx.fillRect(h2(s,32)*VIEW_W, h2(s,33)*VIEW_H, 1 + (h2(s,34)<0.3 ? 1 : 0), 1);
  }
  if(h2(ci, 41) < 0.45){                          // hairline scratch
    const sxr = h2(ci, 42) * VIEW_W;
    ctx.fillStyle = 'rgba(59,42,26,0.08)';
    ctx.fillRect(sxr, 0, 1, VIEW_H);
  }
  const wander = (mf * 0.23) % (VIEW_W + 60) - 30; // one slow persistent scratch
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(wander, 0, 1, VIEW_H);

  frameEdge(ctx);                                  // vignette + sprockets

  /* completion bloom: the reel runs out to white */
  if(bloom > 0){
    ctx.fillStyle = `rgba(250,247,238,${bloom * 0.9})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if(bloom > 0.55){
      ctx.globalAlpha = (bloom - 0.55) * 2.2;
      ctx.fillStyle = UMBER; ctx.font = '7px monospace';
      ctx.fillText('YOU WAKE IN CINEMA 1', VIEW_W/2 - 44, VIEW_H/2);
      ctx.globalAlpha = 1;
    }
  }

  if(P.flash > 0){
    ctx.fillStyle = `rgba(244,240,230,${P.flash/16})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  if(debugOn){
    ctx.fillStyle = 'rgba(30,22,12,0.8)'; ctx.fillRect(4, 4, 128, 60);
    ctx.fillStyle = '#e8d9b0'; ctx.font = '7px monospace';
    const L = [
      `vx ${P.vx.toFixed(2)}  vy ${P.vy.toFixed(2)}`,
      `grounded ${P.grounded}  dash ${P.dashes}`,
      `moths ${moths.length}  mf ${mf}`,
      `pos ${P.x.toFixed(0)},${P.y.toFixed(0)}`,
      `deaths ${P.deaths}`,
      `fps ${fps.toFixed(0)}`,
    ];
    L.forEach((s, i) => ctx.fillText(s, 8, 13 + i*9));
  }
}

/* cache of exit-tear glow centers (tile scan once per room) */
let tearCache = null, tearRoom = null;
function tearCenters(){
  const room = level.currentRoom();
  if(room === tearRoom && tearCache) return tearCache;
  tearRoom = room; tearCache = [];
  let sx = 0, sy = 0, n = 0;
  for(let ty = 0; ty < level.ROOM_H; ty++)
    for(let tx = 0; tx < level.ROOM_W; tx++)
      if(level.tileAt(tx, ty) === 'E'){ sx += tx; sy += ty; n++; }
  if(n) tearCache.push([(sx/n + 0.5) * TILE, (sy/n + 0.5) * TILE]);
  return tearCache;
}

/* ---------------- the projected frame ---------------- */
function frameEdge(ctx){
  /* rounded projected-frame vignette */
  ctx.fillStyle = 'rgba(26,18,8,0.62)';
  ctx.beginPath();
  ctx.rect(0, 0, VIEW_W, VIEW_H);
  roundRect(ctx, 5, 4, VIEW_W - 10, VIEW_H - 8, 13);
  ctx.fill('evenodd');
  /* soft inner falloff */
  const vig = ctx.createRadialGradient(VIEW_W/2, VIEW_H/2, 80, VIEW_W/2, VIEW_H/2, 200);
  vig.addColorStop(0, 'rgba(40,28,12,0)');
  vig.addColorStop(1, 'rgba(40,28,12,0.22)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  /* sprocket-hole ghosts at the extreme edges */
  ctx.fillStyle = 'rgba(12,8,4,0.5)';
  for(let y = 14; y < VIEW_H; y += 38){
    roundRectFill(ctx, -3, y, 7, 10, 2);
    roundRectFill(ctx, VIEW_W - 4, y, 7, 10, 2);
  }
}
function roundRect(ctx, x, y, w, h, r){
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function roundRectFill(ctx, x, y, w, h, r){
  ctx.beginPath(); roundRect(ctx, x, y, w, h, r); ctx.fill();
}

/* ---------------- stamps (the film's imagery) ---------------- */
function stampWing(ctx, x, y, s, rot, col, a, seed){
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 0.85, -s * 0.55, s, -s * 0.12);
  ctx.quadraticCurveTo(s * 0.7, s * 0.4, 0, 0);
  ctx.fill();
  /* vein ribs radiating from the wing root */
  ctx.strokeStyle = UMBER; ctx.lineWidth = 0.6; ctx.globalAlpha = a * 0.9;
  for(let i = 0; i < 4; i++){
    const f = 0.25 + i * 0.2 + h2(seed, 50 + i) * 0.08;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(s * 0.5, -s * 0.5 * f + s * 0.12,
                         s * (0.75 + f * 0.2), -s * 0.45 * f + s * 0.12);
    ctx.stroke();
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
function stampLeaf(ctx, x, y, s, rot, col, a, seed){
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a;
  ctx.fillStyle = col;
  ctx.beginPath();
  const n = 9;
  for(let i = 0; i <= n; i++){
    const th = (i / n) * 6.283;
    const rad = s * 0.5 * (0.6 + h2(seed, 60 + i) * 0.5) *
                (1 + 0.35 * Math.cos(th));             // ragged, lobed
    const px2 = Math.cos(th) * rad, py2 = Math.sin(th) * rad * 0.55;
    i ? ctx.lineTo(px2, py2) : ctx.moveTo(px2, py2);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = UMBER; ctx.lineWidth = 0.7; ctx.globalAlpha = a * 0.8;
  ctx.beginPath(); ctx.moveTo(-s * 0.45, 0); ctx.lineTo(s * 0.6, 0); ctx.stroke();
  ctx.restore(); ctx.globalAlpha = 1;
}
function stampGrass(ctx, x, y, s, rot, a, seed){
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a;
  ctx.strokeStyle = h2(seed, 70) < 0.5 ? GRASS : SEPIA;
  ctx.lineWidth = 1 + h2(seed, 71);
  ctx.beginPath(); ctx.moveTo(-s, s * 0.3);
  ctx.quadraticCurveTo(0, -s * 0.2, s * 1.4, -s * 0.5);
  ctx.stroke();
  ctx.restore(); ctx.globalAlpha = 1;
}
function stampPetal(ctx, x, y, s, rot, a){
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a * 0.9;
  ctx.fillStyle = PINK;
  ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.55, 0, 0, 6.283); ctx.fill();
  ctx.restore(); ctx.globalAlpha = 1;
}
function stampSeeds(ctx, x, y, s, a, seed){
  ctx.globalAlpha = a;
  ctx.fillStyle = UMBER;
  for(let i = 0; i < 10; i++)
    ctx.fillRect(x + (h2(seed, 80+i) - 0.5) * s,
                 y + (h2(seed, 90+i) - 0.5) * s * 0.6, 1, 1);
  ctx.globalAlpha = 1;
}

/* ---------------- tile skins ---------------- */
/* '=' — a pressed moth wing: translucent ochre membrane, sepia leading
   edge carrying the ghost of the Yellow Line, umber vein ribs, ragged
   trailing edge. */
function tileWing(ctx, sx, sy, tx, ty){
  const h = (tx * 73 + ty * 151) % 8;
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = h < 3 ? '#c9a876' : h < 6 ? '#c2a06e' : '#cfb083';
  ctx.fillRect(sx, sy, TILE, TILE - 1);
  ctx.globalAlpha = 1;
  /* membrane shading toward the underside */
  ctx.fillStyle = 'rgba(138,111,74,0.45)';
  ctx.fillRect(sx, sy + 5 + (h % 2), TILE, 2);
  /* one slanted vein per wing segment (roughly every third tile) */
  if(h < 3){
    ctx.fillStyle = 'rgba(92,70,50,0.75)';
    ctx.fillRect(sx + 1 + h * 2, sy + 1, 1, 3);
    ctx.fillRect(sx + 2 + h * 2, sy + 3, 1, 3);
  }else if(h === 5){
    ctx.fillStyle = 'rgba(92,70,50,0.5)';
    ctx.fillRect(sx + 3, sy + 2, 1, 4);
  }
  /* translucent cell blotch (light through the membrane) */
  if(h === 4 || h === 7){
    ctx.fillStyle = 'rgba(244,240,230,0.5)';
    ctx.fillRect(sx + (h === 4 ? 2 : 5), sy + 2, 2, 2);
  }
  /* ragged trailing (bottom) edge: notch pixels out */
  const n1 = (tx * 31) % 8, n2 = (tx * 31 + 5) % 8;
  ctx.fillStyle = 'rgba(92,70,50,0.55)';
  ctx.fillRect(sx, sy + TILE - 2, TILE, 1);
  ctx.fillStyle = '#f4f0e6';                      // notch by painting lamp back in
  ctx.fillRect(sx + n1, sy + TILE - 2, 1, 2);
  ctx.fillRect(sx + n2, sy + TILE - 1, 1, 1);
  /* leading edge + the ghost of the Yellow Line: a faint sepia thread */
  ctx.fillStyle = '#8a6f4a';
  ctx.fillRect(sx, sy, TILE, 1);
  if((tx * 7) % 11 < 8){
    ctx.fillStyle = 'rgba(200,169,78,0.55)';      // the line, dreamt
    ctx.fillRect(sx, sy, TILE - ((tx % 3) ? 0 : 3), 1);
  }
}
/* '#' — pressed organic matter: layered leaf pulp */
function tileMatter(ctx, sx, sy, tx, ty){
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#b3946a';
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.globalAlpha = 1;
  const h = (tx * 73 + ty * 151) % 8;
  ctx.fillStyle = 'rgba(125,90,51,0.6)';
  ctx.fillRect(sx + h, sy + (tx + ty) % 6, 3, 2);
  ctx.fillRect(sx, sy + 3 + (h % 3), TILE, 1);
  ctx.fillStyle = 'rgba(59,42,26,0.5)';
  ctx.fillRect(sx + (h * 3) % 7, sy + 5, 2, 1);
  if(!level.solidAt(tx, ty - 1)){
    ctx.fillStyle = 'rgba(92,70,50,0.8)';
    ctx.fillRect(sx, sy, TILE, 1);
  }
}
/* 'T' — a grass blade: tall green-ochre stalk with a midrib, edges
   raggedly translucent (these are the wall-jumpable stalks) */
function tileStalk(ctx, sx, sy, tx, ty){
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = '#8d8a4e';
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(107,111,61,0.9)';
  ctx.fillRect(sx + (tx % 2 ? 1 : 4), sy, 2, TILE);   // fiber striping
  ctx.fillStyle = 'rgba(59,42,26,0.55)';
  ctx.fillRect(sx + (tx % 2 ? 5 : 2), sy + (ty % 4), 1, TILE - (ty % 4)); // midrib
  /* ragged silhouette on exposed edges */
  if(!level.solidAt(tx - 1, ty)){
    ctx.fillStyle = '#f4f0e6';
    ctx.fillRect(sx, sy + (ty * 7) % 6, 1, 2);
    ctx.fillStyle = 'rgba(74,77,42,0.9)';
    ctx.fillRect(sx, sy, 1, (ty * 5) % 7);
  }
  if(!level.solidAt(tx + 1, ty)){
    ctx.fillStyle = '#f4f0e6';
    ctx.fillRect(sx + TILE - 1, sy + (ty * 11) % 6, 1, 2);
    ctx.fillStyle = 'rgba(74,77,42,0.9)';
    ctx.fillRect(sx + TILE - 1, sy + 2, 1, (ty * 3) % 6);
  }
  if(!level.solidAt(tx, ty - 1)){                     // blade tip highlight
    ctx.fillStyle = '#a8a55f';
    ctx.fillRect(sx, sy, TILE, 1);
  }
}
/* 'B' — checkpoint as a film-frame marker: a punched frame of dark
   leader with sprocket notches; lit when it is the active checkpoint */
function tileMarker(ctx, sx, sy, tx, ty, P){
  ctx.fillStyle = UMBER;
  ctx.fillRect(sx + 1, sy, 6, TILE);
  ctx.fillStyle = '#f4f0e6';
  ctx.fillRect(sx + 2, sy + 1, 1, 1); ctx.fillRect(sx + 5, sy + 1, 1, 1);
  ctx.fillRect(sx + 2, sy + 6, 1, 1); ctx.fillRect(sx + 5, sy + 6, 1, 1);
  const active = P.checkpoint && Math.floor(P.checkpoint.x / TILE) === tx;
  ctx.fillStyle = active ? '#fffdf2' : '#8a6f4a';
  ctx.fillRect(sx + 3, sy + 3, 2, 2);                 // the frame's image cell
  if(active){
    ctx.fillStyle = 'rgba(255,252,235,0.35)';
    ctx.fillRect(sx - 2, sy - 2, 12, 12);
  }
}
/* 'E' — the tear itself: raw white with ragged umber fringes that
   rewrite themselves like the rest of the film */
function tileTear(ctx, sx, sy, tx, ty){
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(sx - 1, sy - 1, TILE + 2, TILE + 2);
  const ci = Math.floor(mf / 3);
  ctx.fillStyle = 'rgba(59,42,26,0.6)';
  for(let i = 0; i < 3; i++){
    const s = Math.imul(ci, 53) + tx * 17 + ty * 29 + i;
    ctx.fillRect(sx - 2 + h2(s, 1) * (TILE + 4), sy - 2 + h2(s, 2) * (TILE + 4),
                 1, 1 + Math.floor(h2(s, 3) * 3));
  }
}

/* ---------------- the moths themselves ---------------- */
/* Dark fluttering silhouette, 2-frame wing flap. Kind sets the build:
   drifters broad, darters sleek, swarm moths in between. */
function drawMoth(ctx, x, y, flap, alpha, kind){
  x = Math.round(x); y = Math.round(y);
  const broad = kind === 'drift' ? 1 : 0;
  const sleek = kind === 'dart' ? 1 : 0;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#241a10';
  ctx.fillRect(x - 1, y - 2, 2, 5);                       // body
  ctx.fillRect(x - 2, y - 3, 1, 1); ctx.fillRect(x + 1, y - 3, 1, 1); // antennae
  if(flap){                                               // wings spread
    ctx.fillRect(x - 5 - broad, y - 3, 4 + broad, 2);
    ctx.fillRect(x + 1, y - 3, 4 + broad, 2);
    ctx.fillRect(x - 4, y - 1, 3, 1 + broad);
    ctx.fillRect(x + 1, y - 1, 3, 1 + broad);
    ctx.globalAlpha = alpha * 0.5;                        // wingtip blur
    ctx.fillRect(x - 6 - broad, y - 4, 2, 1);
    ctx.fillRect(x + 4 + broad, y - 4, 2, 1);
  }else{                                                  // wings folded
    ctx.fillRect(x - 3 - sleek, y - 1, 3 + sleek, 2);
    ctx.fillRect(x + 1, y - 1, 3 + sleek, 2);
  }
  ctx.globalAlpha = 1;
}
