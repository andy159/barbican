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
      const topExposed = !solidAt(tx,ty-1);
      if(t === '=' && topExposed){
        /* walkway: brick paving with staggered joints */
        ctx.fillStyle = PAL.brick;      ctx.fillRect(sx,sy,TILE,TILE);
        ctx.fillStyle = PAL.brickDark;  ctx.fillRect(sx,sy+3,TILE,1);
        ctx.fillRect(sx + (tx%2 ? 2 : 5), sy, 1, 3);
        ctx.fillRect(sx + (tx%2 ? 6 : 1), sy+4, 1, 4);
        ctx.fillStyle = PAL.brickLight; ctx.fillRect(sx,sy+7,TILE,1);
        ctx.fillStyle = '#f7c623';      ctx.fillRect(sx,sy,TILE,1);   // the Yellow Line
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
    }
  }

  /* room signage */
  for(const s of (level.currentRoom().signs || []))
    signAt(s.tx*TILE - cx, s.ty*TILE - cy, s.text);

  /* walkway planters */
  for(const [lx,ly] of (level.currentRoom().planters || []))
    drawPlanter(lx,ly,cx,cy);

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

  /* bright atmospheric haze at the base + the gentlest vignette */
  const haze = ctx.createLinearGradient(0,VIEW_H-32,0,VIEW_H);
  haze.addColorStop(0,'rgba(226,222,208,0)'); haze.addColorStop(1,'rgba(226,222,208,0.28)');
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
function drawPlayer(P, ix, iy){
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
  ctx.fillStyle = '#232c4a'; ctx.fillRect(x-2,y-9,58,12);
  ctx.fillStyle = '#ffd95e'; ctx.font = '7px monospace'; ctx.fillText(text,x+2,y);
}
