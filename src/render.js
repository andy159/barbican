/* All drawing, layered: sky → far towers → terrace block → petals →
   tiles → planters → player → haze → vignette → debug. Keep that order.

   Backdrop modeled on the real estate (see Wikipedia refs, 2026-09-06):
   - towers: warm brown-grey concrete, serrated balcony bands, flared
     base, asymmetric bladed crown (Cromwell/Shakespeare/Lauderdale)
   - terrace block: white barrel-vault roofline, pale slab bands over
     dark glazing, greenery spilling from the balconies
   - podium: warm brick paving carries the Yellow Line */
import { TILE, tileAt, solidAt } from './level.js';
import * as level from './level.js';
import { cam, VIEW_W, VIEW_H } from './camera.js';
import { interiorFrame, drawInteriorBackdrop, drawInteriorTile,
         drawInteriorProps, drawInteriorOverlay } from './interior.js';
import * as ponds from './ponds.js';
import * as CONS from './conservatory.js';   // conservatory backdrop/tile skins
import { renderMothlight } from './mothlight.js';

let ctx = null;
export function bindCanvas(canvas){
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
}

/* ---------------- palette (sampled from reference photos) ---------------- */
const PAL = {
  towerSun:   '#a89a83',   // sunlit pick-hammered concrete
  towerMid:   '#948875',
  towerShade: '#6e6557',
  glaze:      '#3a3d3c',   // deep-set window bands
  glazeFar:   '#7d7f7e',
  slabLight:  '#c2b7a2',   // balcony fronts catching the light
  vault:      '#e9e5da',   // the white barrel vaults
  vaultShade: '#b9b2a4',
  brick:      '#8f5f48',   // lakeside terrace paving
  brickDark:  '#74492f',
  brickLight: '#a97a58',
  conc:       '#8f8779',   // play-space concrete
  concDark:   '#7a7266',
  concLight:  '#d6cfc0',
  green:      '#5f7d4c',   // spilling planting
  greenDark:  '#46603a',
};
const FLOWERS = ['#e0568a','#d94f4f','#f2a0c0','#f7f2e9','#c2477e'];

/* ---------------- ambience: drifting petals ---------------- */
const rand = n => Math.random()*n;
const PETAL_COLORS = ['#e88aa8','#f2b8c6','#f7f2e9','#d94f6f'];
const motes = Array.from({length: 18}, () => ({
  x: rand(VIEW_W), y: rand(VIEW_H), s: 0.15 + rand(0.2),
  c: PETAL_COLORS[Math.floor(rand(4))], ph: rand(6.28),
}));
let frame = 0;                              // ambience clock (bobbing pickups)
let insideT = 0;                            // 0 outdoors → 1 fully interior
export function stepAmbience(){
  frame++;
  if(level.currentRoom()?.backdrop === 'conservatory'){ CONS.stepAmbience(); return; }
  for(const m of motes){
    m.y += m.s;
    m.x += Math.sin(m.y*0.08 + m.ph)*0.18;
    if(m.y > VIEW_H+2){ m.y = -2; m.x = rand(VIEW_W); }
  }
}

/* Interior backdrop: the tower's concrete service core. World-anchored
   so it scrolls with the room — board-marked panels, lift-guide rails,
   painted floor numbers (03 at the lobby to 43 at the roof), and warm
   little stairwell lights. */
function drawInterior(cx, cy, alpha){
  /* paint only within the room's interior volumes — the estate stays
     visible through doors and beyond the tower's walls. From outside
     the volumes read as unlit darkness; the detail fades up inside. */
  const rects = level.currentRoom().interiors || [];
  if(!rects.length) return;
  ctx.save();
  ctx.beginPath();
  for(const [rx0,ry0,rx1,ry1] of rects)
    ctx.rect(rx0*TILE - cx, ry0*TILE - cy, (rx1-rx0+1)*TILE, (ry1-ry0+1)*TILE);
  ctx.clip();
  ctx.fillStyle = '#171310'; ctx.fillRect(0,0,VIEW_W,VIEW_H);   // unlit from outside
  if(alpha < 0.01){ ctx.restore(); return; }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#221e1a'; ctx.fillRect(0,0,VIEW_W,VIEW_H);
  const y0 = Math.floor(cy/TILE), y1 = Math.floor((cy+VIEW_H)/TILE);
  const x0 = Math.floor(cx/TILE), x1 = Math.floor((cx+VIEW_W)/TILE);
  for(let tx = x0; tx <= x1; tx++){
    if(tx % 6 !== 0) continue;
    ctx.fillStyle = '#1b1815'; ctx.fillRect(tx*TILE - cx, 0, 1, VIEW_H); // panel joints
  }
  for(let ty = y0; ty <= y1; ty++){
    const sy = ty*TILE - cy;
    ctx.fillStyle = '#1d1a17'; ctx.fillRect(0, sy+7, VIEW_W, 1);        // shutter lines
    if(ty % 3 === 0){
      ctx.fillStyle = '#2c2824'; ctx.fillRect(0, sy, VIEW_W, 2);
      const lvl = Math.max(3, Math.min(43, Math.round(3 + (32 - ty)*40/26)));
      for(let tx = x0 - (x0 % 15); tx <= x1; tx += 15){
        const sx = tx*TILE - cx;
        if(tx % 30 === 0){
          ctx.fillStyle = '#7a6230'; ctx.font = '7px monospace';        // painted stencil
          ctx.fillText(String(lvl).padStart(2,'0'), sx+2, sy+14);
        }
        ctx.fillStyle = 'rgba(232,198,122,0.10)'; ctx.fillRect(sx+42, sy+1, 12, 9);
        ctx.fillStyle = '#e8c67a'; ctx.fillRect(sx+47, sy+4, 2, 2);     // stairwell light
      }
    }
  }
  /* painted yellow wayfinding chevrons — the Line's language, indoors */
  for(const [mtx, mty, dir] of (level.currentRoom().marks || [])){
    const mx = mtx*TILE - cx, my = mty*TILE - cy;
    if(mx < -12 || mx > VIEW_W+12) continue;
    const blink = 0.75 + Math.sin(frame*0.06 + mtx)*0.25;
    ctx.fillStyle = `rgba(247,198,35,${blink})`;
    if(dir === 'u'){
      ctx.fillRect(mx+3, my,   2, 2); ctx.fillRect(mx+1, my+2, 2, 2);
      ctx.fillRect(mx+5, my+2, 2, 2);
    }else if(dir === 'r'){
      ctx.fillRect(mx+4, my+2, 2, 2); ctx.fillRect(mx+2, my,   2, 2);
      ctx.fillRect(mx+2, my+4, 2, 2);
    }else{
      ctx.fillRect(mx+1, my+2, 2, 2); ctx.fillRect(mx+3, my,   2, 2);
      ctx.fillRect(mx+3, my+4, 2, 2);
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* ---------------- render ---------------- */
export function render(P, alpha, debugOn, fps){
  /* the Mothlight dream renders itself entirely */
  if(level.currentRoom().backdrop === 'mothlight'){
    renderMothlight(ctx, P, alpha, debugOn, fps);
    return;
  }

  /* capped screen shake (barge impacts) */
  const shakeAmp = P.shake > 0 ? Math.min(2, Math.ceil(P.shake/3)) : 0;
  const shakeX = shakeAmp * (P.shake % 2 ? 1 : -1);
  const cx = Math.round(cam.x) + shakeX, cy = Math.round(cam.y);

  /* interior rooms (arts centre etc.) swap the whole backdrop and tile
     skins via src/interior.js; outdoor rooms get the daylight stack */
  const interiorRoom = !!(level.currentRoom() && level.currentRoom().interior);
  const consMode = level.currentRoom().backdrop === 'conservatory';
  if(interiorRoom){ interiorFrame(P); drawInteriorBackdrop(ctx, cx, cy); }
  else if(consMode) CONS.backdrop(ctx, cx, cy);
  else backdropDaylight(P, cx, cy);

  drawScene(P, alpha, cx, cy, interiorRoom, consMode, debugOn, fps);
}

function backdropDaylight(P, cx, cy){
  /* sky — bright hazy London daylight, warmer at the horizon */
  const g = ctx.createLinearGradient(0,0,0,VIEW_H);
  g.addColorStop(0,'#a8c4dc'); g.addColorStop(0.6,'#cfd8dc'); g.addColorStop(1,'#e8e0cd');
  ctx.fillStyle = g; ctx.fillRect(0,0,VIEW_W,VIEW_H);
  /* soft sun */
  const sun = ctx.createRadialGradient(252,30,4,252,30,60);
  sun.addColorStop(0,'rgba(255,250,235,0.9)'); sun.addColorStop(1,'rgba(255,250,235,0)');
  ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(252,30,60,0,7); ctx.fill();

  /* the three towers, far parallax */
  drawTower( 48 - cx*0.18,  22, 30, 1);
  drawTower(150 - cx*0.18,  10, 34, 2);
  drawTower(262 - cx*0.18,  30, 28, 3);

  /* terrace block, nearer parallax, tiling across the whole view */
  drawTerraceBlock(cx);

  /* haze veil pushes the whole backdrop back so the play layer reads */
  ctx.fillStyle = 'rgba(213,219,222,0.42)';
  ctx.fillRect(0,0,VIEW_W,VIEW_H);

  /* inside the tower, the estate disappears — ease into the interior;
     from outside, the interior volumes stay dark (you can't see in) */
  const wantInside = level.interiorAt(P.x + P.w/2, P.y + P.h/2) ? 1 : 0;
  insideT += (wantInside - insideT)*0.15;
  drawInterior(cx, cy, insideT);

  /* the CENTRAL PONDS (finale): region-gated Ghibli pass, see ponds.js */
  const pondsOn = level.currentRoom().id === 'estate-route' &&
                  cx + VIEW_W >= 272*TILE;
  if(pondsOn) ponds.backdrop(ctx, cx, cy, frame, P);

  /* drifting petals (not indoors) */
  if(insideT < 0.99){
    ctx.globalAlpha = 1 - insideT;
    for(const m of motes){
      ctx.fillStyle = m.c;
      ctx.fillRect((m.x - cx*0.3 + 960)%VIEW_W, m.y, 2, 1);
    }
    ctx.globalAlpha = 1;
  }
}

function drawScene(P, alpha, cx, cy, interiorRoom, consMode, debugOn, fps){
  const pondsOn = !interiorRoom && level.currentRoom().id === 'estate-route' &&
                  cx + VIEW_W >= 272*TILE;
  /* tiles — only the visible range */
  const x0 = Math.floor(cx/TILE), x1 = Math.floor((cx+VIEW_W)/TILE);
  const y0 = Math.floor(cy/TILE), y1 = Math.floor((cy+VIEW_H)/TILE);
  for(let ty = y0; ty <= y1; ty++){
    for(let tx = x0; tx <= x1; tx++){
      const t = tileAt(tx,ty);
      const inRect = level.interiorAt(tx*TILE+4, ty*TILE+4);
      const empty = t === ' ' || t === '' || t === 'P';
      if(empty && !inRect) continue;
      const sx = tx*TILE - cx, sy = ty*TILE - cy;
      if(interiorRoom && !empty){ drawInteriorTile(ctx, t, tx, ty, sx, sy); continue; }
      const topExposed = !solidAt(tx,ty-1);
      if(consMode && !empty && CONS.tileSkin(ctx, t, tx, ty, sx, sy, topExposed, P)) continue;
      if(!consMode && (t === 'w' || t === 'F')) continue;   // drawn by the ponds pass
      if(empty){
        /* nothing to draw — the facade overlay below closes the skin */
      }else if(t === 'W'){
        /* lake water: deep teal, lit surface line, faint ripple bands */
        ctx.fillStyle = '#3f6d66'; ctx.fillRect(sx,sy,TILE,TILE);
        if(tileAt(tx,ty-1) !== 'W'){
          ctx.fillStyle = '#8fc0b4'; ctx.fillRect(sx,sy,TILE,1);
          ctx.fillStyle = '#5b8d82'; ctx.fillRect(sx + (tx%3)*2, sy+2, 3, 1);
        }else if((tx*7 + ty*13) % 5 === 0){
          ctx.fillStyle = '#4a7a71'; ctx.fillRect(sx+2, sy+3, 4, 1);
        }
      }else if(t === 'B'){
        /* concrete bench (checkpoint): slab on two feet */
        ctx.fillStyle = '#b3aca0'; ctx.fillRect(sx,   sy+3, 8, 2);
        ctx.fillStyle = '#8f887c'; ctx.fillRect(sx+1, sy+5, 1, 3);
        ctx.fillRect(sx+6, sy+5, 1, 3);
        if(P.checkpoint && Math.floor(P.checkpoint.x/TILE) === tx){
          ctx.fillStyle = '#f7c623'; ctx.fillRect(sx+3, sy+2, 2, 1);   // resting mark
        }
      }else if(t === 'T' && insideT > 0.5){
        /* seen from inside, the tower's walls are bare shuttered concrete */
        ctx.fillStyle = '#4a443c';  ctx.fillRect(sx,sy,TILE,TILE);
        ctx.fillStyle = '#3e3831';  ctx.fillRect(sx,sy+3,TILE,1);
        ctx.fillRect(sx,sy+6,TILE,1);
        ctx.fillStyle = '#554e44';  ctx.fillRect(sx,sy,TILE,1);
        ctx.fillRect(sx + (tx*73 + ty*151) % 8, sy+4, 1, 1);
      }else if(t === 'T'){
        /* tower facade: 3-row rhythm of balcony slab / glazing / spandrel,
           aligned by world row so bands run continuously up the face */
        facadeBands(sx, sy, tx, ty);
        /* serrated prow edges where the face is exposed (photo ref: the
           tower corners read as stacked zigzag teeth) */
        if(!solidAt(tx-1,ty)){
          for(let n = 0; n < TILE; n++){
            ctx.fillStyle = (n + ty) % 2 ? PAL.towerSun : PAL.towerShade;
            ctx.fillRect(sx, sy+n, 1, 1);
          }
        }
        if(!solidAt(tx+1,ty)){
          for(let n = 0; n < TILE; n++){
            ctx.fillStyle = (n + ty) % 2 ? PAL.towerShade : '#5a5348';
            ctx.fillRect(sx+TILE-1, sy+n, 1, 1);
          }
        }
      }else if(t === '<' || t === '>'){
        /* balcony prow: pointed wedge jutting off the tower face, thin
           railing on top, deep shadow underneath (Cromwell balcony ref) */
        const flip = t === '>';
        const px = (x,w,y,h,c) => {              // x measured from the point
          ctx.fillStyle = c;
          ctx.fillRect(flip ? sx + TILE - x - w : sx + x, sy+y, w, h);
        };
        px(0,8,1,2, PAL.slabLight);              // slab top catching the sun
        px(2,6,3,2, PAL.towerMid);               // wedge body
        px(4,4,5,2, PAL.towerShade);             // underside step
        px(6,2,7,1, '#4c463d');                  // the point's dark tip
        px(1,1,0,1, '#2c3a52'); px(4,1,0,1, '#2c3a52'); px(7,1,0,1, '#2c3a52'); // rail posts
        ctx.fillStyle = '#37588a';
        ctx.fillRect(sx, sy-1, TILE, 1);         // railing line
      }else if(t === 'D'){
        /* a painted front door: panels, brass letterbox, keyhole */
        if(!solidAt(tx,ty-1) && tileAt(tx,ty-1) !== 'D'){
          ctx.fillStyle = '#3d5a4a'; ctx.fillRect(sx, sy, TILE, TILE);    // top half
          ctx.fillStyle = '#2f4739'; ctx.fillRect(sx+1, sy+2, 6, 4);
          ctx.fillStyle = '#e8b92e'; ctx.fillRect(sx+2, sy+6, 4, 1);      // letterbox
        }else{
          ctx.fillStyle = '#3d5a4a'; ctx.fillRect(sx, sy, TILE, TILE);    // bottom half
          ctx.fillStyle = '#2f4739'; ctx.fillRect(sx+1, sy+1, 6, 4);
          ctx.fillStyle = '#e8b92e'; ctx.fillRect(sx+5, sy+2, 1, 2);      // keyhole
        }
        ctx.fillStyle = '#26332b'; ctx.fillRect(sx, sy, 1, TILE);
        ctx.fillRect(sx+TILE-1, sy, 1, TILE);
      }else if(t === 'K'){
        /* THE KEY: big, golden, impossible to miss */
        const bob = Math.round(Math.sin(frame*0.06)*3);
        const kx = sx - 4, ky = sy - 6 + bob;
        /* pulsing halo */
        const halo = 0.16 + Math.sin(frame*0.07)*0.06;
        ctx.fillStyle = `rgba(247,198,35,${halo})`;      ctx.fillRect(kx-10, ky-8, 36, 30);
        ctx.fillStyle = `rgba(247,198,35,${halo+0.10})`; ctx.fillRect(kx-4,  ky-3, 24, 20);
        /* the key itself (~16×10): ring bow, long shaft, two teeth */
        ctx.fillStyle = '#e8b92e';
        ctx.fillRect(kx+10, ky+2, 6, 6);                       // bow (outer)
        ctx.fillRect(kx,    ky+4, 11, 3);                      // shaft
        ctx.fillRect(kx,    ky+7, 2, 3);                       // tooth 1
        ctx.fillRect(kx+3,  ky+7, 2, 2);                       // tooth 2
        ctx.fillStyle = '#a37c14';
        ctx.fillRect(kx+12, ky+4, 2, 2);                       // bow hole
        ctx.fillStyle = '#fff3c4';
        ctx.fillRect(kx+10, ky+2, 6, 1);                       // top glint
        ctx.fillRect(kx,    ky+4, 8, 1);
        /* sweeping sparkle rays */
        const sp = frame % 70;
        if(sp < 10){
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          const r = sp/2;
          ctx.fillRect(kx+13, ky-2-r, 1, 3); ctx.fillRect(kx+13, ky+9+r, 1, 3);
          ctx.fillRect(kx+6-r,  ky+1, 3, 1); ctx.fillRect(kx+18+r, ky+1, 3, 1);
        }
      }else if(t === 'H'){
        /* plywood hoarding: warm boards, plank joints, a pasted notice */
        ctx.fillStyle = '#c09055';  ctx.fillRect(sx,sy,TILE,TILE);
        ctx.fillStyle = '#9a7040';  ctx.fillRect(sx,sy+2,TILE,1);
        ctx.fillRect(sx,sy+5,TILE,1);
        ctx.fillStyle = '#8a6238';  ctx.fillRect(sx,sy,1,TILE);
        if((tx*31 + ty*17) % 3 === 0){
          ctx.fillStyle = '#f2efe6'; ctx.fillRect(sx+3,sy+3,3,4);   // notice bill
          ctx.fillStyle = '#d94f4f'; ctx.fillRect(sx+4,sy+4,1,1);
        }
      }else if((t === '=' || t === '-') && topExposed){
        /* walkway: brick paving with staggered joints */
        ctx.fillStyle = PAL.brick;      ctx.fillRect(sx,sy,TILE,TILE);
        ctx.fillStyle = PAL.brickDark;  ctx.fillRect(sx,sy+3,TILE,1);
        ctx.fillRect(sx + (tx%2 ? 2 : 5), sy, 1, 3);
        ctx.fillRect(sx + (tx%2 ? 6 : 1), sy+4, 1, 4);
        ctx.fillStyle = PAL.brickLight; ctx.fillRect(sx,sy+7,TILE,1);
        if(t === '='){
          ctx.fillStyle = '#f7c623';    ctx.fillRect(sx,sy,TILE,1);   // the Yellow Line
        }else{
          /* scuffed line: worn fragments — this marks something */
          ctx.fillStyle = '#c8a94e';
          ctx.fillRect(sx + (tx%2 ? 1 : 4), sy, 2, 1);
          ctx.fillRect(sx + (tx%2 ? 5 : 0), sy, 1, 1);
        }
        /* blue-painted railing behind the walkway edge */
        const leftCont  = tileAt(tx-1,ty) === '=' || tileAt(tx-1,ty) === '-';
        const rightCont = tileAt(tx+1,ty) === '=' || tileAt(tx+1,ty) === '-';
        if(leftCont || rightCont){
          ctx.fillStyle = 'rgba(55,88,138,0.75)';
          ctx.fillRect(sx, sy-4, TILE, 1);                       // top rail
          if(tx % 2 === 0) ctx.fillRect(sx+3, sy-4, 1, 4);       // post
        }
      }else{
        /* board-marked, pick-hammered concrete */
        ctx.fillStyle = PAL.conc;     ctx.fillRect(sx,sy,TILE,TILE);
        ctx.fillStyle = PAL.concDark; ctx.fillRect(sx,sy+3,TILE,1);
        ctx.fillRect(sx,sy+6,TILE,1);
        /* deterministic aggregate speckle (stable per tile — no flicker) */
        const h = (tx*73 + ty*151) % 8;
        ctx.fillRect(sx + h, sy + ((tx*31+ty*17)%2 ? 1 : 4), 1, 1);
        if(topExposed){
          ctx.fillStyle = PAL.concLight;
          ctx.fillRect(sx,sy,TILE,1);
        }
      }
      /* from outside, the building's skin closes over its interior:
         facade everywhere in the volume except the door openings */
      if(inRect && insideT < 0.995){
        if(doorAt(tx,ty)){
          ctx.fillStyle = `rgba(23,19,16,${1-insideT})`;
          ctx.fillRect(sx,sy,TILE,TILE);
        }else{
          ctx.globalAlpha = 1 - insideT;
          facadeBands(sx, sy, tx, ty);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  /* room signage (interior rooms draw their own orange plates; the
     tower's indoor signs hide until you're inside) */
  if(!interiorRoom){
    for(const s of (level.currentRoom().signs || [])){
      const indoors = level.interiorAt(s.tx*TILE+4, s.ty*TILE+4);
      ctx.globalAlpha = indoors ? insideT : 1;
      signAt(s.tx*TILE - cx, s.ty*TILE - cy, s.text);
    }
    ctx.globalAlpha = 1;
  }

  /* walkway planters */
  for(const [lx,ly] of (level.currentRoom().planters || []))
    drawPlanter(lx,ly,cx,cy);

  /* the Wallside house row: low brick cottages with white vault roofs,
     drawn behind the play layer like the planters */
  for(const [hx0, hx1] of (level.currentRoom().houses || [])){
    const x0 = hx0*TILE - cx, x1 = (hx1+1)*TILE - cx;
    if(x1 < -20 || x0 > VIEW_W+20) continue;
    const baseY = 48*TILE - cy;                       // terrace floor
    for(let hx = x0; hx < x1; hx += 40){
      const w = Math.min(40, x1-hx);
      ctx.fillStyle = '#7c5a43'; ctx.fillRect(hx, baseY-42, w, 42);       // brick face
      ctx.fillStyle = '#6a4b36';
      for(let yy = baseY-40; yy < baseY; yy += 4) ctx.fillRect(hx, yy, w, 1);
      ctx.fillStyle = PAL.vault;                                          // vault roof
      ctx.beginPath(); ctx.arc(hx + w/2, baseY-42, w/2, Math.PI, 0); ctx.fill();
      ctx.fillStyle = PAL.vaultShade; ctx.fillRect(hx + w - 6, baseY-48, 3, 6);
      ctx.fillStyle = '#2e3436';                                          // windows
      ctx.fillRect(hx+5, baseY-34, 8, 10); ctx.fillRect(hx+w-13, baseY-34, 8, 10);
      ctx.fillRect(hx+5, baseY-18, 8, 10); ctx.fillRect(hx+w-13, baseY-18, 8, 10);
      ctx.fillStyle = '#c9ced2';
      ctx.fillRect(hx+5, baseY-30, 8, 1); ctx.fillRect(hx+w-13, baseY-30, 8, 1);
      ctx.fillRect(hx+5, baseY-14, 8, 1); ctx.fillRect(hx+w-13, baseY-14, 8, 1);
    }
  }

  /* entrance lamps: warm yellow glow marking the way in */
  for(const [lx,ly] of (level.currentRoom().lamps || [])){
    const x = lx*TILE - cx, y = ly*TILE - cy;
    if(x < -30 || x > VIEW_W+30) continue;
    const pulse = 0.13 + Math.sin(frame*0.05)*0.03;
    ctx.fillStyle = `rgba(247,198,35,${pulse})`;      ctx.fillRect(x-10, y-3, 36, 24);
    ctx.fillStyle = `rgba(247,198,35,${pulse+0.07})`; ctx.fillRect(x-2,  y,  20, 14);
    ctx.fillStyle = '#3a3530'; ctx.fillRect(x+5, y-2, 6, 2);       // fixture housing
    ctx.fillStyle = '#f7c623'; ctx.fillRect(x+6, y,  4, 2);        // the lamp
    ctx.fillStyle = '#fff3c4'; ctx.fillRect(x+7, y,  2, 1);
  }

  /* interior props: curtain, projector, the Mothlight screen, plates */
  if(interiorRoom) drawInteriorProps(ctx, cx, cy);

  if(pondsOn) ponds.mid(ctx, cx, cy, frame);

  /* dash afterimages, oldest faintest */
  for(const t of P.trail){
    ctx.globalAlpha = Math.max(0, t.life/28);
    ctx.fillStyle = '#2f3440';
    ctx.fillRect(t.x - cx, t.y - cy, P.w, P.h);
  }
  ctx.globalAlpha = 1;

  /* player (interpolated, squashed around bottom-center) */
  const ix = P.px + (P.x-P.px)*alpha - cx;
  const iy = P.py + (P.y-P.py)*alpha - cy;
  drawPlayer(P, ix, iy);

  if(interiorRoom){
    /* beam, gloom vignette, pickup card */
    drawInteriorOverlay(ctx, cx, cy, P);
  }else if(consMode){
    CONS.front(ctx, cx, cy, P);
  }else{
    if(pondsOn) ponds.overlay(ctx, cx, cy, frame, P);
    /* bright atmospheric haze at the base (fades away in the tower) */
    ctx.globalAlpha = 1 - insideT;
    const haze = ctx.createLinearGradient(0,VIEW_H-32,0,VIEW_H);
    haze.addColorStop(0,'rgba(226,222,208,0)'); haze.addColorStop(1,'rgba(226,222,208,0.28)');
    ctx.fillStyle = haze; ctx.fillRect(0,VIEW_H-32,VIEW_W,32);
    ctx.globalAlpha = 1;
    const vig = ctx.createRadialGradient(VIEW_W/2,VIEW_H/2,90,VIEW_W/2,VIEW_H/2,210);
    vig.addColorStop(0,'rgba(30,40,60,0)'); vig.addColorStop(1,'rgba(30,40,60,0.14)');
    ctx.fillStyle = vig; ctx.fillRect(0,0,VIEW_W,VIEW_H);
  }

  /* locked-door toast */
  if(P.exitDeniedT > 0 && P.deniedMsg){
    const tw = P.deniedMsg.length*4.3 + 12;
    ctx.globalAlpha = Math.min(1, P.exitDeniedT/20);
    ctx.fillStyle = '#232c4a'; ctx.fillRect(VIEW_W/2 - tw/2, 24, tw, 14);
    ctx.fillStyle = '#ffd95e'; ctx.font = '7px monospace';
    ctx.fillText(P.deniedMsg, VIEW_W/2 - tw/2 + 6, 33);
    ctx.globalAlpha = 1;
  }

  if(P.flash > 0){ ctx.fillStyle = `rgba(232,226,212,${P.flash/16})`; ctx.fillRect(0,0,VIEW_W,VIEW_H); }

  /* debug overlay */
  if(debugOn){
    ctx.fillStyle = 'rgba(10,10,14,0.78)'; ctx.fillRect(4,4,128,60);
    ctx.fillStyle = '#f2c84b'; ctx.font = '7px monospace';
    const L = [
      `vx ${P.vx.toFixed(2)}  vy ${P.vy.toFixed(2)}`,
      `grounded ${P.grounded}`,
      `coyote ${P.coyote}  buffer ${P.buffer}`,
      `pos ${P.x.toFixed(0)},${P.y.toFixed(0)}`,
      `deaths ${P.deaths}`,
      `fps ${fps.toFixed(0)}`,
    ];
    L.forEach((s,i) => ctx.fillText(s, 8, 13+i*9));
  }
}

/* One 8×8 cell of tower facade: balcony slab / glazing / spandrel by
   world row, so bands run continuously across any painted region. */
function facadeBands(sx, sy, tx, ty){
  const band = ((ty % 3) + 3) % 3;
  if(band === 0){
    /* balcony: slab lip, serrated underside, railing, flower boxes */
    ctx.fillStyle = PAL.towerMid;   ctx.fillRect(sx,sy,TILE,TILE);
    ctx.fillStyle = PAL.slabLight;  ctx.fillRect(sx,sy,TILE,2);
    ctx.fillStyle = PAL.towerShade;
    for(let n = tx%2; n < TILE; n += 2) ctx.fillRect(sx+n, sy+2, 1, 1);
    ctx.fillStyle = '#37588a';      ctx.fillRect(sx,sy+4,TILE,1);   // railing
    const h = (tx*31 + ty*17) % 7;
    if(h < 3){
      ctx.fillStyle = FLOWERS[(tx+ty)%FLOWERS.length];
      ctx.fillRect(sx + 1 + h*2, sy+3, 2, 2);
    }else if(h === 4){
      ctx.fillStyle = PAL.green;    ctx.fillRect(sx+3, sy+3, 3, 2);
    }
  }else if(band === 1){
    /* glazing band, deep set, with mullions */
    ctx.fillStyle = '#333d42';      ctx.fillRect(sx,sy,TILE,TILE);
    ctx.fillStyle = '#4c5a60';      ctx.fillRect(sx + (tx%2 ? 2 : 5), sy, 1, TILE);
    ctx.fillStyle = '#242c30';      ctx.fillRect(sx,sy,TILE,1);
  }else{
    /* spandrel: pick-hammered concrete */
    ctx.fillStyle = PAL.towerMid;   ctx.fillRect(sx,sy,TILE,TILE);
    ctx.fillStyle = PAL.towerShade; ctx.fillRect(sx,sy+5,TILE,1);
    ctx.fillRect(sx + (tx*73 + ty*151) % 8, sy+2, 1, 1);
  }
}

function doorAt(tx, ty){
  for(const [x0,y0,x1,y1] of (level.currentRoom().doors || []))
    if(tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1) return true;
  return false;
}

/* One of the estate's three towers: slim warm-concrete shaft, serrated
   balcony bands, flared base, asymmetric bladed crown. */
function drawTower(x, top, w, seed){
  x = Math.round(x);
  if(x + w + 8 < 0 || x - 8 > VIEW_W) return;

  /* crown: three blades of unequal height (tallest off-center) */
  const blades = [
    [0,            10 + (seed*3)%5, 5],
    [(w>>1) - 2,   16 + (seed*5)%6, 6],
    [w - 5,        7  + (seed*7)%4, 5],
  ];
  for(const [bx,bh,bw] of blades){
    ctx.fillStyle = PAL.towerMid;
    ctx.fillRect(x+bx, top-bh, bw, bh);
    ctx.fillStyle = PAL.towerSun;
    ctx.fillRect(x+bx, top-bh, 1, bh);
  }

  /* shaft */
  ctx.fillStyle = PAL.towerMid;
  ctx.fillRect(x, top, w, VIEW_H-top);
  ctx.fillStyle = PAL.towerSun;   ctx.fillRect(x, top, 2, VIEW_H-top);      // lit west face
  ctx.fillStyle = PAL.towerShade; ctx.fillRect(x+w-2, top, 2, VIEW_H-top);  // shaded east

  /* floors: glazing band + balcony slab with a serrated under-edge */
  for(let fy = top+4; fy < VIEW_H-2; fy += 5){
    ctx.fillStyle = PAL.glazeFar;
    ctx.fillRect(x+2, fy, w-4, 2);
    ctx.fillStyle = PAL.slabLight;
    ctx.fillRect(x+1, fy+2, w-2, 2);
    /* the sawtooth: notch the slab's underside every other pixel */
    ctx.fillStyle = PAL.towerShade;
    for(let fx = 1 + (seed%2); fx < w-1; fx += 2)
      ctx.fillRect(x+fx, fy+3, 1, 1);
  }

  /* balcony prow zigzag down both corners */
  ctx.fillStyle = PAL.towerShade;
  for(let fy = top+4; fy < VIEW_H-2; fy += 5) ctx.fillRect(x, fy+2, 1, 1);
  ctx.fillStyle = PAL.towerSun;
  for(let fy = top+6; fy < VIEW_H-2; fy += 5) ctx.fillRect(x+w-1, fy, 1, 1);

  /* flared base plinth */
  const baseY = VIEW_H - 26;
  ctx.fillStyle = PAL.towerShade;
  ctx.fillRect(x-2, baseY, w+4, 3);
  ctx.fillStyle = PAL.towerMid;
  ctx.fillRect(x-3, baseY+3, w+6, VIEW_H-baseY-3);
}

/* The long terrace block: white barrel-vault roofline over pale slab
   bands and dark glazing, greenery spilling over. Tiles horizontally
   with its own parallax so it always fills the middle distance. */
const BLOCK_TOP = 96, BLOCK_CYCLE = 48;
function drawTerraceBlock(cx){
  const off = -((cx*0.42) % BLOCK_CYCLE);

  /* body */
  ctx.fillStyle = PAL.towerMid;
  ctx.fillRect(0, BLOCK_TOP+7, VIEW_W, VIEW_H-BLOCK_TOP-7);

  for(let x = off - BLOCK_CYCLE; x < VIEW_W + BLOCK_CYCLE; x += BLOCK_CYCLE){
    /* two barrel vaults per cycle */
    for(const vx of [12, 36]){
      ctx.fillStyle = PAL.vault;
      ctx.beginPath();
      ctx.arc(x+vx, BLOCK_TOP+8, 9, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = PAL.vaultShade;
      ctx.fillRect(x+vx+5, BLOCK_TOP+2, 2, 6);       // shaded flank of the vault
    }
    /* party-wall fin between vault pairs */
    ctx.fillStyle = PAL.towerShade;
    ctx.fillRect(x, BLOCK_TOP-2, 2, 10);
  }

  /* floors: slab lip, glazing, planting spilling over each lip */
  for(let fy = BLOCK_TOP+10; fy < VIEW_H; fy += 9){
    ctx.fillStyle = PAL.slabLight;
    ctx.fillRect(0, fy, VIEW_W, 2);
    ctx.fillStyle = PAL.glaze;
    ctx.fillRect(0, fy+2, VIEW_W, 4);
    for(let x = off - BLOCK_CYCLE; x < VIEW_W + BLOCK_CYCLE; x += BLOCK_CYCLE){
      ctx.fillStyle = PAL.towerShade;                 // party walls divide the flats
      ctx.fillRect(x, fy, 2, 9);
      /* greenery + the odd bloom trailing off the slab */
      for(let gx = 5; gx < BLOCK_CYCLE-4; gx += 7){
        const h = ((gx*13 + fy*7)>>0) % 11;
        if(h < 5){
          ctx.fillStyle = h%2 ? PAL.green : PAL.greenDark;
          ctx.fillRect(x+gx, fy+1, 3, 2);
        }else if(h === 6){
          ctx.fillStyle = FLOWERS[(gx+fy)%FLOWERS.length];
          ctx.fillRect(x+gx, fy+1, 2, 2);
        }
      }
    }
  }
}

/* The small dark figure with the yellow scarf. Drawn on an 8×14 pixel
   grid scaled by the squash factors, mirrored by facing; legs step from
   distance travelled so the walk needs no animation clock. */
export function drawPlayer(P, ix, iy){
  const w = P.w*P.sx, h = P.h*P.sy;
  const dx = ix + P.w/2 - w/2, dy = iy + P.h - h;
  const ux = w/8, uy = h/14;
  const px = (x,y,ww,hh,c) => {
    if(P.facing < 0) x = 8 - x - ww;               // mirror around the box
    ctx.fillStyle = c;
    ctx.fillRect(dx + x*ux, dy + y*uy, ww*ux, hh*uy);
  };

  const moving = P.grounded && Math.abs(P.vx) > 0.2;
  const stride = Math.floor(P.x/5)%2 === 0;

  /* scarf tail streams off the back shoulder */
  px(0,6,1,3,'#e8b92e');
  /* hair */
  px(2,0,4,1,'#2a2622');
  px(1,1,6,2,'#2a2622');
  /* face */
  px(2,2,5,3,'#d9a878');
  px(5,3,1,1,'#14141a');                           // eye faces the move direction
  /* scarf */
  px(1,5,6,2,'#ffd23e');
  /* jacket */
  px(1,7,6,4,'#2f3440');
  px(1,8,1,3,'#252a35');                           // back arm in shade
  px(6,8,1,3,'#3a4152');                           // front arm catches light
  /* legs */
  if(!P.grounded){
    px(2,11,2,2,'#23262e'); px(4,12,2,2,'#23262e');   // tucked mid-air
    px(2,12,2,1,'#1a1c22'); px(4,13,2,1,'#1a1c22');
  }else if(moving && stride){
    px(1,11,2,3,'#23262e'); px(5,11,2,3,'#23262e');   // stride apart
    px(1,13,2,1,'#1a1c22'); px(5,13,2,1,'#1a1c22');
  }else{
    px(2,11,2,3,'#23262e'); px(4,11,2,3,'#23262e');   // feet together
    px(2,13,2,1,'#1a1c22'); px(4,13,2,1,'#1a1c22');
  }
}

function drawPlanter(tx, ty, cx, cy){
  const x = tx*TILE - cx, base = ty*TILE - cy;
  if(x < -20 || x > VIEW_W+20) return;
  ctx.fillStyle = PAL.brickDark;  ctx.fillRect(x-2, base-4, 12, 4);   // brick trough
  ctx.fillStyle = PAL.brickLight; ctx.fillRect(x-2, base-4, 12, 1);
  const F = ['#e0568a','#d94f4f','#f2a0c0','#6f8f5a','#c2477e','#6f8f5a'];
  for(let i = 0; i < 6; i++){ ctx.fillStyle = F[(i+tx)%F.length]; ctx.fillRect(x-1+i*2, base-6-((i+tx)%2), 2, 2); }
}

function signAt(x, y, text){
  const w = text.length*4.3 + 8;                 // estate wayfinding plate
  ctx.fillStyle = '#232c4a'; ctx.fillRect(x-2,y-9,w,12);
  ctx.fillStyle = '#ffd95e'; ctx.font = '7px monospace'; ctx.fillText(text,x+2,y);
}
