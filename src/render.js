/* All drawing, layered: sky → towers → petals → tiles → planters →
   player → haze → vignette → debug. Keep that order. */
import { TILE, tileAt, solidAt } from './level.js';
import * as level from './level.js';
import { cam, VIEW_W, VIEW_H } from './camera.js';

let ctx = null;
export function bindCanvas(canvas){
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
}

/* ---------------- ambience: drifting petals ---------------- */
const rand = n => Math.random()*n;
const PETAL_COLORS = ['#e88aa8','#f2b8c6','#f7f2e9','#d94f6f'];
const motes = Array.from({length: 18}, () => ({
  x: rand(VIEW_W), y: rand(VIEW_H), s: 0.15 + rand(0.2),
  c: PETAL_COLORS[Math.floor(rand(4))], ph: rand(6.28),
}));
export function stepAmbience(){
  for(const m of motes){
    m.y += m.s;
    m.x += Math.sin(m.y*0.08 + m.ph)*0.18;
    if(m.y > VIEW_H+2){ m.y = -2; m.x = rand(VIEW_W); }
  }
}

/* ---------------- render ---------------- */
export function render(P, alpha, debugOn, fps){
  const cx = Math.round(cam.x), cy = Math.round(cam.y);

  /* sky — bright hazy London daylight */
  const g = ctx.createLinearGradient(0,0,0,VIEW_H);
  g.addColorStop(0,'#a8c4dc'); g.addColorStop(0.6,'#cdd9e2'); g.addColorStop(1,'#e6e3da');
  ctx.fillStyle = g; ctx.fillRect(0,0,VIEW_W,VIEW_H);
  /* soft sun */
  const sun = ctx.createRadialGradient(252,30,4,252,30,60);
  sun.addColorStop(0,'rgba(255,250,235,0.9)'); sun.addColorStop(1,'rgba(255,250,235,0)');
  ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(252,30,60,0,7); ctx.fill();

  /* parallax towers, balconies in bloom (far layer hazier, near layer full detail) */
  drawTower( 56 - cx*0.22,  26, 40, true,  1);
  drawTower(168 - cx*0.22,  14, 46, true,  2);
  drawTower(286 - cx*0.22,  34, 36, true,  3);
  drawTower(104 - cx*0.45,  52, 34, false, 4);
  drawTower(238 - cx*0.45,  60, 30, false, 5);

  /* drifting petals */
  for(const m of motes){
    ctx.fillStyle = m.c;
    ctx.fillRect((m.x - cx*0.3 + 960)%VIEW_W, m.y, 2, 1);
  }

  /* tiles — only the visible range */
  const x0 = Math.floor(cx/TILE), x1 = Math.floor((cx+VIEW_W)/TILE);
  const y0 = Math.floor(cy/TILE), y1 = Math.floor((cy+VIEW_H)/TILE);
  for(let ty = y0; ty <= y1; ty++){
    for(let tx = x0; tx <= x1; tx++){
      const t = tileAt(tx,ty);
      if(t !== '#' && t !== '=') continue;
      const sx = tx*TILE - cx, sy = ty*TILE - cy;
      ctx.fillStyle = '#9b968b';
      ctx.fillRect(sx,sy,TILE,TILE);
      /* board-marked concrete: horizontal shutter lines */
      ctx.fillStyle = '#868178';
      ctx.fillRect(sx,sy+3,TILE,1);
      ctx.fillRect(sx,sy+6,TILE,1);
      /* sunlit top edge if exposed */
      if(!solidAt(tx,ty-1)){
        ctx.fillStyle = '#dcd8cc';
        ctx.fillRect(sx,sy,TILE,1);
        if(t === '='){
          ctx.fillStyle = '#f7c623'; ctx.fillRect(sx,sy,TILE,1);   // the Yellow Line
        }
      }
    }
  }

  /* room signage */
  for(const s of (level.currentRoom().signs || []))
    signAt(s.tx*TILE - cx, s.ty*TILE - cy, s.text);

  /* walkway planters */
  for(const [lx,ly] of (level.currentRoom().planters || []))
    drawPlanter(lx,ly,cx,cy);

  /* player (interpolated, squashed around bottom-center) */
  const ix = P.px + (P.x-P.px)*alpha - cx;
  const iy = P.py + (P.y-P.py)*alpha - cy;
  const w = P.w*P.sx, h = P.h*P.sy;
  const dx = ix + P.w/2 - w/2, dy = iy + P.h - h;
  ctx.fillStyle = '#2f3440';
  ctx.fillRect(dx, dy, w, h);
  ctx.fillStyle = '#ffd23e';                       // yellow scarf accent
  ctx.fillRect(dx, dy+3*P.sy, w, 2*P.sy);
  ctx.fillStyle = '#14141a';                       // eyes face the move direction
  const eye = P.facing > 0 ? dx+w-3 : dx+1;
  ctx.fillRect(eye, dy+1, 2, 2);

  /* bright atmospheric haze at the base + the gentlest vignette */
  const haze = ctx.createLinearGradient(0,VIEW_H-32,0,VIEW_H);
  haze.addColorStop(0,'rgba(220,228,235,0)'); haze.addColorStop(1,'rgba(220,228,235,0.28)');
  ctx.fillStyle = haze; ctx.fillRect(0,VIEW_H-32,VIEW_W,32);
  const vig = ctx.createRadialGradient(VIEW_W/2,VIEW_H/2,90,VIEW_W/2,VIEW_H/2,210);
  vig.addColorStop(0,'rgba(30,40,60,0)'); vig.addColorStop(1,'rgba(30,40,60,0.14)');
  ctx.fillStyle = vig; ctx.fillRect(0,0,VIEW_W,VIEW_H);

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

function drawTower(x, top, w, far, seed){
  /* palettes sampled from the estate in daylight */
  const conc = far ? '#aebbc6' : '#8f949b';   // pebbledash concrete
  const slab = far ? '#bcc8d2' : '#aaaeb4';   // balcony lip catching light
  const win  = far ? '#8e9dac' : '#3c4450';   // glazing band
  const rail = far ? '#92a4b8' : '#37588a';   // the blue-painted railings
  const FLOWERS = ['#e0568a','#d94f4f','#f2a0c0','#f7f2e9','#c2477e'];
  ctx.fillStyle = conc; ctx.fillRect(x,top,w,VIEW_H-top);
  for(let i = 0; i < w; i += 6) ctx.fillRect(x+i, top-4, 3, 4);   // jagged crown
  for(let fy = top+6; fy < VIEW_H-4; fy += 11){                   // one floor per band
    ctx.fillStyle = win;  ctx.fillRect(x+1, fy,   w-2, 5);
    ctx.fillStyle = rail; ctx.fillRect(x+1, fy+5, w-2, 1);
    ctx.fillStyle = slab; ctx.fillRect(x,   fy+6, w,   3);
    if(!far){
      /* flower boxes spilling over the railings */
      for(let fx = 2; fx < w-3; fx += 3){
        const hsh = (fx*7 + fy*13 + seed*31)%19;
        if(hsh < 8){ ctx.fillStyle = FLOWERS[hsh%FLOWERS.length]; ctx.fillRect(x+fx, fy+4, 2, 2); }
        else if(hsh < 11){ ctx.fillStyle = '#6f8f5a'; ctx.fillRect(x+fx, fy+4, 2, 2); }
      }
    }else{
      for(let fx = 3; fx < w-3; fx += 5)
        if(((fx*7 + fy*13 + seed*31)%17) < 5){ ctx.fillStyle = '#d8a0b4'; ctx.fillRect(x+fx, fy+5, 2, 1); }
    }
  }
}

function drawPlanter(tx, ty, cx, cy){
  const x = tx*TILE - cx, base = ty*TILE - cy;
  if(x < -20 || x > VIEW_W+20) return;
  ctx.fillStyle = '#7e848c'; ctx.fillRect(x-2, base-4, 12, 4);   // concrete trough
  ctx.fillStyle = '#9aa0a8'; ctx.fillRect(x-2, base-4, 12, 1);
  const F = ['#e0568a','#d94f4f','#f2a0c0','#6f8f5a','#c2477e','#6f8f5a'];
  for(let i = 0; i < 6; i++){ ctx.fillStyle = F[(i+tx)%F.length]; ctx.fillRect(x-1+i*2, base-6-((i+tx)%2), 2, 2); }
}

function signAt(x, y, text){
  ctx.fillStyle = '#232c4a'; ctx.fillRect(x-2,y-9,58,12);
  ctx.fillStyle = '#ffd95e'; ctx.font = '7px monospace'; ctx.fillText(text,x+2,y);
}
