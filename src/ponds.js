/* The CENTRAL PONDS — the Ghibli pass for the level's finale.
   Everything visual for the waist-deep basin east of col ~275 lives here:
   layered backdrop (St Giles' Cripplegate + tree canopy), the water body
   with wobbling reflections and shimmer, planted-island foliage domes,
   reeds, lily pads, the eight terrace fountains, the cascade, and the
   small lives on the water (ducks, moorhens, golden orfe, a heron, a
   dragonfly, petals adrift). render.js calls three hooks, in order:
     backdrop() — after the haze veil, before tiles
     mid()      — after tiles/planters, before the player
     overlay()  — after the player, before the closing haze
   Palette and techniques follow docs/ponds-scene.md. */
import { TILE, tileAt, solidAt } from './level.js';
import * as level from './level.js';
import { VIEW_W, VIEW_H } from './camera.js';

/* ---------------- palette (docs/ponds-scene.md) ---------------- */
const C = {
  water:      '#3a6b60', waterMid: '#356257', waterDeep: '#2c5348',
  waterLit:   '#8fd0b8', sparkle:  '#e8f6ee',
  brickLit:   '#b8674a', brickMid: '#9c5038', brickShadow: '#6e3527',
  folDeep:    '#2e5c34', folMid:   '#4f8a3d', folLight: '#7fb84f',
  folYellow:  '#a8cf5e',
  bloomPink:  '#e87a9c', bloomRed: '#c93b47', bloomWhite: '#f2ede1',
  concWarm:   '#b8b2a4', concShadow: '#8a857a',
  skyRef:     '#b9d7e8', orfe: '#ef9440',
  /* hazed backdrop mixes (soft-saturated rule: no pure black/white) */
  churchStone:'#b5b3a3', churchShade:'#94907f', churchBrick: '#a97862',
  churchDark: '#6f6d61', canopyFar:  '#88a874', canopyFarLite: '#9cba81',
  canopyNear: '#6f9460', canopyNearLite: '#83aa6d',
};

const X0 = 275*TILE, X1 = 452*TILE;         // basin extent (world px)
const SURF = 53*TILE;                        // water surface y (424)
const BOT  = 56*TILE;                        // bottom of the world (448)

const hash = (a,b) => ((a*73856093) ^ (b*19349663)) >>> 0;

/* ================================================================
   Level scan — done once per room load: islands, domes, submerged
   masses, reed/lily anchors. Rebuilt if the room changes.
   ================================================================ */
let scanned = null;
function scan(){
  const room = level.currentRoom();
  if(scanned && scanned.room === room) return scanned;
  const domes = [];                          // foliage clumps {x0,x1,top,base}
  const seen = new Set();
  for(let ty = 40; ty < 54; ty++) for(let tx = 353; tx < 452; tx++){
    if(tileAt(tx,ty) !== 'F' || seen.has(tx+','+ty)) continue;
    let x0 = tx, x1 = tx, top = ty, base = ty;    // flood the whole clump
    const q = [[tx,ty]];
    while(q.length){
      const [qx,qy] = q.pop();
      if(tileAt(qx,qy) !== 'F' || seen.has(qx+','+qy)) continue;
      seen.add(qx+','+qy);
      x0 = Math.min(x0,qx); x1 = Math.max(x1,qx);
      top = Math.min(top,qy); base = Math.max(base,qy);
      q.push([qx+1,qy],[qx-1,qy],[qx,qy+1],[qx,qy-1]);
    }
    domes.push({ x0, x1, top, base, phase: hash(x0,top)%628/100 });
  }
  const masses = [];                          // submerged '#' runs at row 53
  for(let tx = 353; tx <= 442; tx++){
    if(tileAt(tx,53) !== '#') continue;
    let x1 = tx; while(tileAt(x1+1,53) === '#' && x1 < 442) x1++;
    masses.push([tx, x1]); tx = x1;
  }
  const pockets = [];                         // open-water runs (row 53 'w')
  for(let tx = 353; tx <= 442; tx++){
    if(tileAt(tx,53) !== 'w') continue;
    let x1 = tx; while(tileAt(x1+1,53) === 'w' && x1 < 442) x1++;
    pockets.push([tx, x1]); tx = x1;
  }
  /* reed clumps: beside every recovery step + the terrace steps */
  const reeds = [];
  for(let tx = 353; tx <= 442; tx++)
    if(tileAt(tx,52) === '#' && tileAt(tx,51) !== '#' && tileAt(tx,50) !== '#')
      reeds.push({ x: tx*TILE + (hash(tx,7)%2 ? -3 : 9), y: SURF,
                   n: 5 + hash(tx,3)%4, phase: hash(tx,11)%628/100 });
  /* lily pads: one or two per open pocket */
  const lilies = [];
  for(const [a,b] of pockets){
    const w = (b-a+1)*TILE;
    lilies.push({ x: a*TILE + 3 + hash(a,5)%Math.max(1,w-8), ph: hash(a,9)%628/100,
                  flower: hash(a,13)%3 === 0 });
    if(w > 24) lilies.push({ x: a*TILE + w - 9, ph: hash(b,9)%628/100, flower: false });
  }
  scanned = { room, domes, masses, pockets, reeds, lilies };
  return scanned;
}

/* ================================================================
   Ambient simulation — ticked once per fixed frame via tick().
   ================================================================ */
const rnd = n => Math.random()*n;
let simFrame = -1, gust = 0, gustAt = 600;

const ripples = [];                          // {x, y, r, life}
function addRipple(x, y, big = false){
  if(ripples.length > 24) ripples.shift();
  ripples.push({ x, y, r: 1, life: big ? 64 : 46 });
}
const drops = [];                            // splash droplets {x,y,vx,vy,life}
function addSplash(x, big){
  const n = big ? 10 : 5;
  for(let i = 0; i < n; i++)
    drops.push({ x: x + rnd(8)-4, y: SURF, vx: rnd(1.6)-0.8,
                 vy: -(0.8 + rnd(big ? 1.8 : 1.0)), life: 26 + rnd(14)|0 });
  addRipple(x, SURF, true); addRipple(x, SURF+2, big);
}

const ducks = [
  { x: 356*TILE, y: SURF-3, dir: 1,  a: 356*TILE-16, b: 358*TILE+8, hen: false, flee: 0, dab: 0 },
  { x: 405*TILE, y: SURF-3, dir: -1, a: 404*TILE,    b: 408*TILE,   hen: true,  flee: 0, dab: 0 },
  { x: 429*TILE, y: SURF-3, dir: 1,  a: 428*TILE,    b: 430*TILE+6, hen: false, flee: 0, dab: 0 },
];
const moorhens = [
  { x: 345*TILE, y: 48*TILE, a: 344*TILE, b: 350*TILE, dir: 1 },   // terrace edge
  { x: 420*TILE, y: 51*TILE, a: 419*TILE, b: 420*TILE+6, dir: 1 }, // island 6 rim
];
const orfe = [
  { x: 368*TILE, y: SURF+3, dir: 1,  t: 0 },
  { x: 392*TILE, y: SURF+4, dir: -1, t: 200 },
  { x: 417*TILE, y: SURF+3, dir: 1,  t: 420 },
];
const floatPetals = Array.from({length: 9}, (_,i) => ({
  x: 356*TILE + i*70 + rnd(40), y: SURF - 1, life: 400 + rnd(500),
  c: ['#e88aa8','#f2b8c6','#f2ede1','#d94f6f'][i%4],
}));
const dragonfly = { ax: 383*TILE, ay: SURF - 14, t: 0 };

let prevWading = false, prevX = 0, wadeTick = 0;

function stepSim(P){
  /* gusts: every 8-15 s the wind picks up and shakes petals loose */
  if(--gustAt <= 0){ gust = 90; gustAt = 480 + rnd(420)|0;
    for(const p of floatPetals) if(p.life < 200) p.life = 400 + rnd(300);
  }
  if(gust > 0) gust--;

  for(let i = ripples.length-1; i >= 0; i--){
    const r = ripples[i];
    if(--r.life <= 0){ ripples.splice(i,1); continue; }
    if(r.life % 4 === 0) r.r++;
  }
  for(let i = drops.length-1; i >= 0; i--){
    const d = drops[i];
    d.x += d.vx; d.y += d.vy; d.vy += 0.18;
    if(--d.life <= 0 || d.y > SURF+4) drops.splice(i,1);
  }
  for(const d of ducks){
    const sp = d.flee > 0 ? 0.9 : 0.12;
    if(d.flee > 0) d.flee--;
    if(d.dab > 0) d.dab--;
    else if(rnd(1000) < 1.2) d.dab = 46;                 // tail-up dabble
    if(d.dab === 0) d.x += d.dir*sp;
    if(d.x < d.a){ d.x = d.a; d.dir = 1; } if(d.x > d.b){ d.x = d.b; d.dir = -1; }
    if(d.flee > 40 && d.flee % 8 === 0) addRipple(d.x+4, SURF);
  }
  for(const m of moorhens){
    m.x += m.dir*0.14;
    if(m.x < m.a){ m.x = m.a; m.dir = 1; } if(m.x > m.b){ m.x = m.b; m.dir = -1; }
  }
  for(const f of orfe){
    f.t++;
    f.x += f.dir*(0.35 + Math.sin(f.t*0.02)*0.15);
    f.y = SURF + 3 + Math.sin(f.t*0.017)*2;
    if(f.t > 560){ f.t = 0; f.dir *= -1; }
  }
  for(const p of floatPetals){
    p.x += 0.12 + (gust ? 0.15 : 0);                      // downstream, to the cascade
    if(--p.life <= 0 || p.x > 436*TILE){
      p.x = 355*TILE + rnd(78*TILE); p.life = 400 + rnd(500);
    }
  }
  if(simFrame % 44 === 0) addRipple(434*TILE + (rnd(16)|0) - 8, SURF + 1);
  dragonfly.t++;
  if(dragonfly.t > 400 + (hash(dragonfly.ax,3)%200)){
    dragonfly.t = 0;
    dragonfly.ax = [366,382,391,415,427][rnd(5)|0]*TILE;  // prefers the reed steps
  }

  /* the player on the water: splashes, wakes, scattered ducks */
  if(P){
    if(P.wading && !prevWading){
      addSplash(P.x + P.w/2, true);
      for(const d of ducks) if(Math.abs(d.x - P.x) < 48){
        d.flee = 70; d.dir = d.x < P.x ? -1 : 1;
      }
    }
    if(P.wading && ++wadeTick % 14 === 0 && Math.abs(P.x - prevX) > 0.1)
      addRipple(P.x + P.w/2, SURF+1);
    prevWading = P.wading; prevX = P.x;
  }
}

function tick(frame, P){
  if(simFrame < 0 || frame - simFrame > 240) simFrame = frame - 1;
  while(simFrame < frame){ stepSim(P); simFrame++; }
}

/* ================================================================
   BACKDROP — after the haze veil, before tiles.
   St Giles' Cripplegate across the water, tree canopy, the heron.
   ================================================================ */
export function backdrop(ctx, cx, cy, f, P){
  tick(f, P);
  const horizon = SURF - cy;                 // the far bank's waterline

  /* fair-weather clouds over the lake — slow, soft, flat-bottomed */
  const ccyc = 420;
  let coff = -(((cx*0.12 - f*0.03) % ccyc + ccyc) % ccyc);
  for(let x = coff - ccyc; x < VIEW_W + ccyc; x += ccyc){
    cloud(ctx, x + 30,  horizon - 118, 74, 13);
    cloud(ctx, x + 190, horizon - 96,  50, 9);
    cloud(ctx, x + 300, horizon - 132, 40, 8);
  }

  /* far tree canopy: repeating soft mounds behind everything (0.22×) —
     CP&B planted the estate with mature 30-40 ft transplants, so the
     far bank reads as an established park, not saplings */
  const cyc = 170;
  let off = -((cx*0.22) % cyc) - cyc;
  for(let x = off; x < VIEW_W + cyc; x += cyc){
    canopyCluster(ctx, x + 4,   horizon, 52, 34, 1, C.canopyFar, C.canopyFarLite);
    canopyCluster(ctx, x + 44,  horizon, 42, 42, 2, C.canopyFar, C.canopyFarLite);
    canopyCluster(ctx, x + 116, horizon, 46, 27, 5, C.canopyFar, C.canopyFarLite);
  }

  /* St Giles' Cripplegate (0.3×): the one pre-modern silhouette */
  const chx = Math.round(950 - cx*0.3);
  if(chx > -80 && chx < VIEW_W + 20) church(ctx, chx, horizon, f);

  /* nearer canopy fringing the far bank (0.42×), gaps for the church;
     every other cycle a weeping willow leans over the water */
  const cyc2 = 230;
  off = -((cx*0.42) % cyc2) - cyc2;
  for(let x = off; x < VIEW_W + cyc2; x += cyc2){
    canopyCluster(ctx, x + 4,   horizon, 40, 28, 3, C.canopyNear, C.canopyNearLite);
    willow(ctx, x + 92, horizon, f);
    canopyCluster(ctx, x + 164, horizon, 32, 20, 4, C.canopyNear, C.canopyNearLite);
  }
  /* the far bank itself: a dark grounding line where planting meets water */
  ctx.fillStyle = 'rgba(58,84,54,0.5)';
  ctx.fillRect(0, horizon - 1, VIEW_W, 1);
}

/* a weeping willow at the far bank: pale trailing fronds over the water */
function willow(ctx, x, baseY, f){
  const sway = Math.round(Math.sin(f*(gust ? 0.05 : 0.025) + x)*1);
  canopyCluster(ctx, x, baseY - 8, 38, 24, 7, C.canopyNear, C.canopyNearLite);
  ctx.fillStyle = '#8db06f';
  for(let i = 0; i < 7; i++){
    const fx = x + 3 + i*5, fh = 9 + hash(x, i) % 8;
    ctx.fillRect(fx + (i%2 ? sway : 0), baseY - 10, 1, fh);
    ctx.fillStyle = i % 2 ? '#a5c489' : '#8db06f';
  }
  ctx.fillStyle = '#6b5341';                                 // the leaning trunk
  ctx.fillRect(x + 16, baseY - 12, 2, 12);
}

function cloud(ctx, x, y, w, h){
  /* flat base, puffed top: two alpha layers so it stays gauzy */
  ctx.fillStyle = 'rgba(252,251,244,0.42)';
  ctx.fillRect(Math.round(x), Math.round(y), w, Math.round(h*0.45));
  ctx.fillStyle = 'rgba(255,254,248,0.55)';
  ctx.fillRect(Math.round(x + w*0.14), Math.round(y - h*0.4), Math.round(w*0.5), Math.round(h*0.5));
  ctx.fillRect(Math.round(x + w*0.5),  Math.round(y - h*0.15), Math.round(w*0.34), Math.round(h*0.35));
  ctx.fillStyle = 'rgba(214,222,228,0.35)';                  // shaded underside
  ctx.fillRect(Math.round(x + w*0.1), Math.round(y + h*0.45), Math.round(w*0.8), 1);
}

function canopyCluster(ctx, x, baseY, w, h, seed, body, lite){
  /* two or three overlapping lobes read as one irregular tree crown */
  const lobes = [[0, w*0.62, h], [w*0.35, w*0.65, h*0.72]];
  if(w > 44) lobes.push([w*0.62, w*0.38, h*0.55]);
  for(const [lx, lw, lh] of lobes){
    for(let r = 0; r < lh; r++){
      const t = r/lh;                          // 0 top → 1 base
      const half = (lw/2) * Math.sqrt(Math.max(0, 1 - (1-t)*(1-t)*1.15));
      ctx.fillStyle = t < 0.3 ? lite : body;
      ctx.fillRect(Math.round(x + lx + lw/2 - half), Math.round(baseY - lh + r), Math.round(half*2), 1);
    }
  }
  ctx.fillStyle = 'rgba(46,92,52,0.45)';       // under-shadow tucks it down
  ctx.fillRect(Math.round(x + 3), Math.round(baseY - 3), Math.round(w - 6), 3);
  /* lit leaf tips + a few deep pockets */
  for(let i = 0; i < 5; i++){
    const hx = hash(seed, i);
    ctx.fillStyle = i % 2 ? '#aec98f' : 'rgba(58,84,54,0.6)';
    ctx.fillRect(Math.round(x + 4 + hx % Math.max(1, w-8)),
                 Math.round(baseY - h + 2 + (hx>>4) % Math.max(2, h-6)), 2, 1);
  }
}

function church(ctx, x, baseY, f){
  /* nave */
  ctx.fillStyle = C.churchStone;  ctx.fillRect(x+16, baseY-26, 46, 26);
  ctx.fillStyle = C.churchShade;  ctx.fillRect(x+58, baseY-26, 4, 26);
  ctx.fillStyle = C.churchShade;  ctx.fillRect(x+16, baseY-27, 46, 2);   // parapet
  /* battlement teeth on the nave */
  ctx.fillStyle = C.churchStone;
  for(let bx = x+17; bx < x+60; bx += 4) ctx.fillRect(bx, baseY-29, 2, 2);
  /* arched nave windows */
  ctx.fillStyle = C.churchDark;
  for(let wx = x+21; wx < x+58; wx += 8){
    ctx.fillRect(wx, baseY-19, 3, 10);
    ctx.fillRect(wx+1, baseY-20, 1, 1);
  }
  /* the west tower: ragstone below, brick bell stage above */
  ctx.fillStyle = C.churchStone;  ctx.fillRect(x, baseY-46, 16, 46);
  ctx.fillStyle = C.churchBrick;  ctx.fillRect(x, baseY-58, 16, 12);
  ctx.fillStyle = C.churchShade;  ctx.fillRect(x+13, baseY-58, 3, 58);
  ctx.fillStyle = C.churchDark;                                  // belfry louvres
  ctx.fillRect(x+3, baseY-56, 3, 7); ctx.fillRect(x+9, baseY-56, 3, 7);
  ctx.fillRect(x+4, baseY-40, 3, 8); ctx.fillRect(x+4, baseY-26, 3, 8);
  /* battlements + the little corner turret and cupola */
  ctx.fillStyle = C.churchBrick;
  for(let bx = x; bx < x+16; bx += 4) ctx.fillRect(bx, baseY-61, 2, 3);
  ctx.fillRect(x+12, baseY-64, 4, 4);
  ctx.fillStyle = C.churchShade;  ctx.fillRect(x+13, baseY-67, 2, 3);    // cupola
  /* the grey heron on the nave roof — preens every so often */
  const preen = (f % 1500) < 40;
  ctx.fillStyle = '#8d97a0';
  ctx.fillRect(x+40, baseY-32, 4, 2);                            // body
  ctx.fillRect(x+43, preen ? baseY-31 : baseY-35, 1, preen ? 1 : 3);  // neck
  ctx.fillStyle = '#5d666e';
  ctx.fillRect(x+41, baseY-30, 1, 1);                            // legs
}

/* ================================================================
   MID — after tiles and planters, before the player.
   The water body itself, reflections, shimmer, brickwork repaint,
   foliage domes, back reeds, lily pads, moorhens, dappled light.
   ================================================================ */
export function mid(ctx, cx, cy, f){
  const S = scan();
  const wx0 = Math.max(X0 - cx, -8), wx1 = Math.min(X1 - cx, VIEW_W + 8);
  const wy = SURF - cy;
  if(wx1 < 0 || wy > VIEW_H) return;

  /* --- the water body: three depth bands over everything sunk --- */
  if(wx1 > wx0){
    ctx.fillStyle = C.water;     ctx.fillRect(wx0, wy,    wx1-wx0, 8);
    ctx.fillStyle = C.waterMid;  ctx.fillRect(wx0, wy+8,  wx1-wx0, 8);
    ctx.fillStyle = C.waterDeep; ctx.fillRect(wx0, wy+16, wx1-wx0, BOT-SURF-16);
  }

  /* --- flipped, broken reflections: the towers, then the church --- */
  reflectTowers(ctx, cx, wy, f);
  const chx = Math.round(950 - cx*0.3);
  if(chx > -80 && chx < VIEW_W + 20) reflectChurch(ctx, chx, wy, f);

  /* --- submerged island masses: dark shapes under the surface --- */
  ctx.fillStyle = 'rgba(52,42,34,0.42)';
  for(const [a,b] of S.masses){
    const sx = a*TILE - cx, w = (b-a+1)*TILE;
    if(sx+w < 0 || sx > VIEW_W) continue;
    ctx.fillRect(sx+1, wy+2, w-2, BOT-SURF-4);
  }

  /* --- two-band shimmer: sparse dashes everywhere, dense sun lane --- */
  shimmer(ctx, cx, wy, f, wx0, wx1);

  /* --- brick repaint: terrace, rims, steps, cascade read as warm brick --- */
  brickwork(ctx, cx, cy, f);

  /* --- the planted domes, swaying --- */
  for(const d of S.domes) dome(ctx, d, cx, cy, f);

  /* --- back reeds, lily pads, moorhens (behind the player) --- */
  for(const r of S.reeds) reedClump(ctx, r, cx, cy, f, false);
  for(const l of S.lilies) lily(ctx, l, cx, cy, f);
  for(const m of moorhens) moorhen(ctx, m, cx, cy, f);

  /* --- the cascade's falling sheets (behind the player) --- */
  cascadeSheets(ctx, cx, cy, f);
}

function reflectTowers(ctx, cx, wy, f){
  /* the terrace-block backdrop smears into the water along the whole
     basin: pale fin / dark glazing columns on the block's 48px cycle */
  const cyc = 48, off = -((cx*0.42) % cyc);
  for(let x = off - cyc; x < VIEW_W + cyc; x += cyc){
    for(let r = 0; r < 14; r++){
      if((r + ((x/cyc)|0)) % 3 === 0) continue;             // broken rows
      const wob = Math.round(Math.sin(f*0.042 + r*0.7 + x*0.2)*1);
      const t = 1 - r/14;
      ctx.fillStyle = `rgba(185,215,232,${(0.16*t).toFixed(2)})`;
      ctx.fillRect(Math.round(x + 6 + wob), wy + 1 + r, 10, 1);
      ctx.fillStyle = `rgba(52,74,68,${(0.30*t).toFixed(2)})`;
      ctx.fillRect(Math.round(x + 24 - wob), wy + 1 + r, 14, 1);
    }
  }
  /* long vertical smears of the three towers, matching render.js x's */
  const towers = [[48,30],[150,34],[262,28]];
  for(const [tx0,w] of towers){
    const sx = Math.round(tx0 - cx*0.18);
    if(sx + w < 0 || sx > VIEW_W) continue;
    for(let r = 0; r < 18; r++){
      if((r + (sx>>2)) % 3 === 0) continue;                 // broken rows
      const wob = Math.round(Math.sin(f*0.042 + r*0.7 + tx0)*1);
      ctx.fillStyle = r % 4 === 1 ? 'rgba(185,215,232,0.25)' : 'rgba(60,76,70,0.30)';
      ctx.fillRect(sx + 3 + wob, wy + 1 + r, w - 6, 1);
    }
  }
}

function reflectChurch(ctx, chx, wy, f){
  for(let r = 0; r < 16; r++){
    const wob = Math.round(Math.sin(f*0.042 + r*0.6)*1);
    const t = 1 - r/16;
    /* tower smear */
    ctx.fillStyle = `rgba(148,144,127,${(0.30*t).toFixed(2)})`;
    ctx.fillRect(chx + 1 + wob, wy + 1 + r, 14, 1);
    /* nave smear, shorter */
    if(r < 9){
      ctx.fillStyle = `rgba(148,144,127,${(0.22*t).toFixed(2)})`;
      ctx.fillRect(chx + 17 - wob, wy + 1 + r, 43, 1);
    }
  }
}

function shimmer(ctx, cx, wy, f, wx0, wx1){
  const scroll = (f>>3);                                    // 1 px every 8 frames
  const basinW = X1 - X0;
  for(let row = 0; row < 8; row++){
    const y = wy + 1 + row;
    if(y < 0 || y > VIEW_H) continue;
    const n = 26 - row*2;
    for(let k = 0; k < n; k++){
      const ph = hash(row, k);
      let x = (ph % basinW) + (row % 2 ? scroll : -scroll)*(1 + row%2);
      x = X0 + ((x % basinW) + basinW) % basinW - cx;
      if(x < wx0 || x > wx1 - 4) continue;
      ctx.fillStyle = k % 5 ? 'rgba(143,208,184,0.65)' : 'rgba(185,215,232,0.6)';
      ctx.fillRect(Math.round(x), y, 2 + (ph>>6)%3, 1);
    }
  }
  /* the sun lane: a soft bright path under the sun (screen x ~252),
     dense off-white glitter breaking across it */
  const lane = ctx.createLinearGradient(210, 0, 296, 0);
  lane.addColorStop(0, 'rgba(214,236,224,0)');
  lane.addColorStop(0.5, 'rgba(214,236,224,0.30)');
  lane.addColorStop(1, 'rgba(214,236,224,0)');
  ctx.fillStyle = lane; ctx.fillRect(210, wy, 86, 12);
  for(let k = 0; k < 34; k++){
    const ph = hash(99, k);
    const x = 214 + ((ph + scroll*3) % 74);
    const y = wy + 1 + (ph>>5) % 10;
    if(((ph>>3) + scroll) % 4 === 0) continue;              // twinkle off
    ctx.fillStyle = k % 3 ? C.sparkle : 'rgba(232,246,238,0.85)';
    ctx.fillRect(x, y, k % 4 ? 1 : 2, 1);
  }
}

function brickwork(ctx, cx, cy, f){
  const x0 = Math.max(323, Math.floor(cx/TILE)), x1 = Math.min(451, Math.floor((cx+VIEW_W)/TILE));
  const y0 = Math.max(44, Math.floor(cy/TILE)),  y1 = Math.min(52, Math.floor((cy+VIEW_H)/TILE));
  for(let ty = y0; ty <= y1; ty++) for(let tx = x0; tx <= x1; tx++){
    if(tileAt(tx,ty) !== '#') continue;
    const sx = tx*TILE - cx, sy = ty*TILE - cy;
    ctx.fillStyle = C.brickMid;     ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = C.brickShadow;                                 // mortar joints
    ctx.fillRect(sx, sy+3, TILE, 1);
    ctx.fillRect(sx + (tx%2 ? 2 : 5), sy, 1, 3);
    ctx.fillRect(sx + (tx%2 ? 6 : 1), sy+4, 1, 4);
    if(!solidAt(tx,ty-1)){                                         // sunlit top course
      ctx.fillStyle = C.brickLit;   ctx.fillRect(sx, sy, TILE, 2);
    }
    if(tileAt(tx,ty+1) === 'w' || ty === 52){                      // tide mark
      ctx.fillStyle = 'rgba(74,52,40,0.55)'; ctx.fillRect(sx, sy+6, TILE, 2);
    }
    /* rounded rim shoulders where an island edge meets open air */
    const openL = !solidAt(tx-1,ty), openR = !solidAt(tx+1,ty);
    if(!solidAt(tx,ty-1)){
      ctx.fillStyle = C.brickShadow;
      if(openL) ctx.fillRect(sx, sy+1, 1, 2);
      if(openR) ctx.fillRect(sx+TILE-1, sy+1, 1, 2);
    }
    /* marginal planting: moss softening the brick at the waterline */
    if(ty === 52 && (openL || openR) && hash(tx,29) % 2 === 0){
      ctx.fillStyle = C.folMid;
      ctx.fillRect(openL ? sx-1 : sx+TILE-2, sy+4, 3, 2);
      ctx.fillStyle = C.folLight;
      ctx.fillRect(openL ? sx : sx+TILE-1, sy+4, 1, 1);
    }
    /* blooms spilling over exposed rim edges, like the balcony boxes */
    if(!solidAt(tx,ty-1) && (openL || openR) && hash(tx,ty) % 3 !== 1){
      const bx = openL ? sx : sx+TILE-2;
      ctx.fillStyle = [C.bloomPink, C.bloomRed, C.bloomWhite][hash(tx,5)%3];
      ctx.fillRect(bx, sy-1, 2, 2);
      ctx.fillStyle = C.folMid; ctx.fillRect(bx + (openL?2:-1), sy, 1, 2);
    }
    /* dappled light drifting over exposed tops */
    if(!solidAt(tx,ty-1)){
      const drift = (f/26)|0;
      const h = hash(tx + drift, ty);
      if(h % 3 === 0){
        ctx.fillStyle = 'rgba(255,241,196,0.30)';
        ctx.fillRect(sx + h % 6, sy, 2, 1);
      }
    }
  }
}

function dome(ctx, d, cx, cy, f){
  const px0 = d.x0*TILE - cx, pw = (d.x1 - d.x0 + 1)*TILE;
  if(px0 + pw < -12 || px0 > VIEW_W + 12) return;
  const baseY = (d.base+1)*TILE - cy;                       // rim surface line
  const h = (d.base - d.top + 1)*TILE + 5;                  // a touch taller than tiles
  const cxm = px0 + pw/2;
  const om = gust ? 0.084 : 0.042;
  const swayTop = Math.round(Math.sin(f*om + d.phase)*1);
  for(let r = 0; r < h; r++){
    const t = r/h;                                          // 0 top → 1 base
    const half = (pw/2 + 2) * Math.sqrt(Math.max(0.05, 1 - (1-t)*(1-t)));
    const sway = t < 0.5 ? swayTop : 0;
    ctx.fillStyle = t < 0.28 ? C.folLight : (t < 0.62 ? C.folMid : C.folDeep);
    ctx.fillRect(Math.round(cxm - half + sway), Math.round(baseY - h + r), Math.round(half*2), 1);
    /* the sun sits high right: a lit crescent on that shoulder */
    if(t > 0.1 && t < 0.55){
      ctx.fillStyle = t < 0.3 ? C.folYellow : C.folLight;
      ctx.fillRect(Math.round(cxm + half + sway) - 2, Math.round(baseY - h + r), 2, 1);
    }
  }
  /* shadow tufts give the clipped mound its foliage lumps */
  for(let i = 0; i < 3; i++){
    const hx = hash(d.x0*13 + i*29, d.top+1);
    ctx.fillStyle = C.folDeep;
    ctx.fillRect(Math.round(cxm - pw/2 + 2 + hx % Math.max(1, pw - 6)),
                 Math.round(baseY - h + 3 + (hx>>5) % Math.max(2, h - 8)), 3, 2);
  }
  /* leaf texture + blooms spilling like the balcony boxes above */
  for(let i = 0; i < 6; i++){
    const hx = hash(d.x0*31 + i, d.top);
    const lx = cxm - pw/2 + 1 + hx % Math.max(1, pw - 3);
    const ly = baseY - h + 2 + (hx>>5) % (h - 5);
    const t = (ly - (baseY - h))/h;
    ctx.fillStyle = t < 0.4 ? C.folYellow : C.folLight;
    ctx.fillRect(Math.round(lx + (t < 0.5 ? swayTop : 0)), Math.round(ly), 2, 1);
  }
  for(let i = 0; i < 4; i++){
    const hx = hash(d.x0*17 + i*7, d.base);
    const bx = cxm - pw/2 + hx % Math.max(1, pw + 2) - 1;
    const by = baseY - 2 - (hx>>4) % (h>>1);
    ctx.fillStyle = [C.bloomPink, C.bloomRed, C.bloomWhite, C.bloomPink][i];
    ctx.fillRect(Math.round(bx), Math.round(by), 2, 2);
  }
}

function reedClump(ctx, r, cx, cy, f, front){
  const bx = r.x - cx, by = r.y - cy;
  if(bx < -12 || bx > VIEW_W + 12) return;
  const om = (gust ? 0.09 : 0.045);
  for(let i = 0; i < r.n; i++){
    const h = 7 + hash(r.x, i) % (front ? 12 : 7);
    const sw = Math.round(Math.sin(f*om + r.phase + i*0.9));
    ctx.fillStyle = front ? C.folDeep : C.folMid;
    ctx.fillRect(bx + i*2 - r.n, by - h + 3, 1, h - 3);     // rooted half
    ctx.fillRect(bx + i*2 - r.n + sw, by - h, 1, 3);        // swaying tip
    if(i % 3 === 0){
      ctx.fillStyle = C.folYellow;
      ctx.fillRect(bx + i*2 - r.n + sw, by - h, 1, 1);
    }
  }
}

function lily(ctx, l, cx, cy, f){
  const sx = Math.round(l.x - cx), sy = SURF - cy - 1 + Math.round(Math.sin(f*0.02 + l.ph));
  if(sx < -8 || sx > VIEW_W + 8) return;
  ctx.fillStyle = C.folLight;
  ctx.fillRect(sx, sy, 5, 1); ctx.fillRect(sx+1, sy+1, 3, 1);
  ctx.fillStyle = C.folMid; ctx.fillRect(sx+3, sy, 1, 1);   // the notch
  if(l.flower){
    ctx.fillStyle = C.bloomWhite; ctx.fillRect(sx+1, sy-1, 2, 1);
    ctx.fillStyle = C.bloomPink;  ctx.fillRect(sx+2, sy-2, 1, 1);
  }
}

function moorhen(ctx, m, cx, cy, f){
  const sx = Math.round(m.x - cx), sy = m.y - cy;
  if(sx < -8 || sx > VIEW_W + 8) return;
  const bob = (f>>4) % 2;                                   // 2-frame head-bob
  ctx.fillStyle = '#23282e';
  ctx.fillRect(sx, sy-4, 5, 3);                             // body
  ctx.fillRect(sx + (m.dir>0 ? 4 : 0), sy-5-bob, 2, 2);     // head
  ctx.fillStyle = C.bloomRed;
  ctx.fillRect(sx + (m.dir>0 ? 6 : -1), sy-5-bob, 1, 1);    // the red bill
  ctx.fillStyle = C.bloomWhite;
  ctx.fillRect(sx + (m.dir>0 ? 0 : 4), sy-4, 1, 1);         // white tail flick
  ctx.fillStyle = C.folYellow;
  ctx.fillRect(sx+1+bob, sy-1, 1, 1); ctx.fillRect(sx+3-bob, sy-1, 1, 1);  // legs
}

function cascadeSheets(ctx, cx, cy, f){
  /* the circulation pours down the cascade steps: a film across each
     tread, a falling sheet over each west lip, churn where it lands */
  const treads = [[443, 46, 4], [441, 47, 16], [439, 49, 16], [437, 51, 16]];
  for(const [x0, top, w] of treads){
    const sx = x0*TILE - cx, sy = top*TILE - cy;
    if(sx + w < -24 || sx > VIEW_W + 24) continue;
    if(w > 4){                                              // the wet tread film
      ctx.fillStyle = 'rgba(143,208,184,0.35)';
      ctx.fillRect(sx, sy, w, 2);
      ctx.fillStyle = 'rgba(232,246,238,0.75)';             // hurrying glints
      ctx.fillRect(sx + w - 2 - ((f>>1) + x0*3) % (w - 2), sy, 2, 1);
    }
    /* the sheet falling over this tread's west lip */
    const fall = Math.min((53 - top)*TILE + 4, 2*TILE + 4);
    const gx = sx - 3;
    const grad = ctx.createLinearGradient(0, sy, 0, sy + fall);
    grad.addColorStop(0, 'rgba(207,238,226,0.85)');
    grad.addColorStop(1, 'rgba(207,238,226,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(gx, sy, 4, fall);
    ctx.fillStyle = 'rgba(242,246,238,0.9)';                // falling streaks
    ctx.fillRect(gx + ((x0>>1) % 2),     sy + (f*2 + x0*5) % fall, 1, 3);
    ctx.fillRect(gx + 2 + ((x0>>2)%2),   sy + (f*2 + x0*11 + 9) % fall, 1, 3);
    /* churn where the sheet lands */
    ctx.fillStyle = 'rgba(242,246,238,0.8)';
    const by = sy + fall - 1 + Math.round(Math.sin(f*0.11 + x0));
    ctx.fillRect(gx - 2, by, 6, 1);
    ctx.fillRect(gx - 1, by - 1 + ((f>>3) % 2), 3, 1);
  }
}

/* ================================================================
   OVERLAY — after the player, before the closing haze.
   Waist-deep submersion, ripples, fountains, creatures, foam,
   petals adrift, front reeds.
   ================================================================ */
export function overlay(ctx, cx, cy, f, P){
  const S = scan();
  const wx0 = Math.max(X0 - cx, -8), wx1 = Math.min(X1 - cx, VIEW_W + 8);
  const wy = SURF - cy;
  if(wx1 < 0 || wy > VIEW_H) return;

  /* --- waist-deep: translucent water over whatever stands in it --- */
  if(wx1 > wx0){
    ctx.fillStyle = 'rgba(58,107,96,0.55)';
    ctx.fillRect(wx0, wy, wx1 - wx0, 8);
    ctx.fillStyle = 'rgba(44,83,72,0.45)';
    ctx.fillRect(wx0, wy + 8, wx1 - wx0, BOT - SURF - 8);
    ctx.fillStyle = C.waterLit;                              // the surface line
    ctx.fillRect(wx0, wy, wx1 - wx0, 1);
  }

  /* --- golden orfe: orange slivers gliding under the surface --- */
  for(const fl of orfe){
    const sx = Math.round(fl.x - cx), sy = Math.round(fl.y - cy);
    if(sx < -6 || sx > VIEW_W + 6) continue;
    const vis = Math.sin(fl.t*0.011);                        // fades in and out
    if(vis < 0.25) continue;
    ctx.globalAlpha = Math.min(0.75, vis);
    ctx.fillStyle = C.orfe; ctx.fillRect(sx, sy, 4, 1);
    ctx.fillStyle = '#ffc27d'; ctx.fillRect(sx + (fl.dir>0 ? 3 : 0), sy, 1, 1);
    ctx.globalAlpha = 1;
  }

  /* --- ripple rings --- */
  for(const r of ripples){
    const sx = Math.round(r.x - cx), sy = Math.round(r.y - cy);
    const rr = r.r, ry = Math.max(1, rr>>1);
    ctx.globalAlpha = Math.min(0.5, r.life/60);
    ctx.fillStyle = C.waterLit;
    ctx.fillRect(sx - rr, sy, Math.max(1, rr>>1)+1, 1);      // ellipse, four arcs
    ctx.fillRect(sx + rr - (rr>>1), sy, Math.max(1, rr>>1)+1, 1);
    ctx.fillRect(sx - (rr>>1), sy - ry + 1, rr, 1);
    ctx.fillRect(sx - (rr>>1), sy + ry - 1, rr, 1);
    ctx.globalAlpha = 1;
  }

  /* --- splash droplets --- */
  for(const d of drops){
    ctx.fillStyle = d.life % 3 ? C.sparkle : C.waterLit;
    ctx.fillRect(Math.round(d.x - cx), Math.round(d.y - cy), 1, 1);
  }

  /* --- the eight terrace fountains, on a staggered stately cycle --- */
  const founts = level.currentRoom().fountains || [];
  for(let i = 0; i < founts.length; i++) fountain(ctx, founts[i], i, cx, cy, f);

  /* --- ducks + wakes (in front of the surface tint, like the player) --- */
  for(const d of ducks) duck(ctx, d, cx, cy, f);

  /* --- petals afloat, drifting toward the cascade --- */
  for(const p of floatPetals){
    const sx = Math.round(p.x - cx), sy = Math.round(p.y - cy);
    if(sx < 0 || sx > VIEW_W) continue;
    ctx.fillStyle = p.c; ctx.fillRect(sx, sy, 2, 1);
  }

  /* --- cascade lips: white foam crawling over each edge --- */
  cascadeFoam(ctx, cx, cy, f);

  /* --- the dragonfly --- */
  {
    const dx = dragonfly.ax + Math.sin(f*0.05)*6 - cx;
    const dy = SURF - 14 + Math.sin(f*0.083)*3 - cy;
    if(dx > -4 && dx < VIEW_W + 4){
      ctx.fillStyle = C.skyRef; ctx.fillRect(Math.round(dx), Math.round(dy), 2, 1);
      if(f % 2){ ctx.fillStyle = 'rgba(242,246,238,0.8)';
        ctx.fillRect(Math.round(dx)-1, Math.round(dy)-1, 1, 1);
        ctx.fillRect(Math.round(dx)+2, Math.round(dy)-1, 1, 1); }
    }
  }

  /* --- front reeds: the near layer, one green darker, over the player --- */
  for(let i = 0; i < S.reeds.length; i++)
    if(i % 3 === 0) reedClump(ctx, { ...S.reeds[i], x: S.reeds[i].x + 4, n: 4 }, cx, cy, f, true);
}

function fountain(ctx, [ftx, fty, kind], i, cx, cy, f){
  const bx = ftx*TILE + 4 - cx, by = fty*TILE - cy;
  if(bx < -24 || bx > VIEW_W + 24) return;
  /* the basin: recessed ring in the paving / a bowl on the terrace edge */
  ctx.fillStyle = 'rgba(44,83,72,0.9)';
  ctx.fillRect(bx - 3, by - 1, 6, 1);
  ctx.fillStyle = C.brickShadow;
  ctx.fillRect(bx - 4, by - 1, 1, 1); ctx.fillRect(bx + 3, by - 1, 1, 1);
  /* stately shared cycle: 4 s on, staggered per jet */
  const t = (f + i*30) % 240;
  if(t > 150) return;                                        // resting phase
  const rise = Math.min(1, t/30), die = Math.min(1, (150 - t)/30);
  const H = Math.round(11 * rise * die * (kind ? 1.2 : 1));
  for(let k = 0; k < H; k++){
    const jit = (hash(i, (k + (f>>2))) % 3) - 1;
    ctx.fillStyle = k > H - 3 ? C.sparkle : (k % 2 ? '#cfeee2' : C.bloomWhite);
    ctx.fillRect(bx + (k > H-4 ? jit : 0), by - 2 - k, k > H-5 ? 2 : 1, 1);
  }
  /* crest droplets arcing over */
  if(H > 6){
    ctx.fillStyle = '#cfeee2';
    ctx.fillRect(bx - 2, by - H + 1, 1, 1);
    ctx.fillRect(bx + 2 + (kind ? 2 : 0), by - H + 2, 1, 1);
    if(kind){                                                // edge jets arc into the lake
      ctx.fillRect(bx + 5, by - (H>>1), 1, 1);
      ctx.fillRect(bx + 7, by - 2, 1, 1);
      if((f + i*30) % 48 === 0) addRipple(ftx*TILE + 12, SURF + 1);
    }else if((f + i*30) % 60 === 0){
      addRipple(ftx*TILE + 4, fty*TILE - 1);                 // patter in the basin
    }
  }
}

function duck(ctx, d, cx, cy, f){
  const sx = Math.round(d.x - cx), sy = Math.round(d.y - cy);
  if(sx < -12 || sx > VIEW_W + 12) return;
  const ph = (f/20|0) % 3;                                   // 3-frame paddle
  const bob = ph === 1 ? 1 : 0;
  const dir = d.dir;
  if(d.dab > 10 && d.dab < 40){
    /* dabbling: tail up, head under */
    ctx.fillStyle = C.bloomWhite;
    ctx.fillRect(sx+1, sy - 1, 4, 3);
    ctx.fillRect(sx + (dir>0 ? 0 : 5), sy - 3, 2, 3);        // the tail, upended
    return;
  }
  /* wake: a little V trailing behind */
  ctx.fillStyle = 'rgba(143,208,184,0.6)';
  ctx.fillRect(sx - dir*(5 + ph), sy + 2, 2, 1);
  ctx.fillRect(sx - dir*(8 + ph), sy + 3 - (ph===2?1:0), 2, 1);
  /* body */
  ctx.fillStyle = d.hen ? C.brickMid : C.bloomWhite;
  ctx.fillRect(sx, sy + bob, 6, 3);
  ctx.fillStyle = d.hen ? C.brickShadow : '#c9c2b2';
  ctx.fillRect(sx + (dir>0 ? 0 : 4), sy + bob, 2, 1);        // folded wing
  /* head: drake bottle-green, hen brown */
  ctx.fillStyle = d.hen ? C.brickShadow : '#2e5c34';
  ctx.fillRect(sx + (dir>0 ? 5 : -1), sy - 2 + bob, 2, 3);
  ctx.fillStyle = C.folYellow;
  ctx.fillRect(sx + (dir>0 ? 7 : -2), sy - 1 + bob, 1, 1);   // bill
}

function cascadeFoam(ctx, cx, cy, f){
  /* bright foam lips crawling over each edge (in front of the player) */
  const lips = [[441, 47, 442], [439, 49, 440], [437, 51, 438]];
  for(const [lx, top, rx] of lips){
    const fx = lx*TILE - cx, fy = top*TILE - cy;
    if(fx < -24 || fx > VIEW_W + 24) continue;
    ctx.fillStyle = C.bloomWhite;                            // the foam lip
    ctx.fillRect(fx - 3, fy - 1, (rx - lx + 1)*TILE + 3, 1);
    const adv = (f/3|0) % 8;                                 // crawling foam pixels
    ctx.fillStyle = C.sparkle;
    ctx.fillRect(fx - 2 + adv, fy - 1, 2, 1);
    ctx.fillRect(fx + 8 + ((adv+3)%8), fy - 1, 2, 1);
    ctx.fillRect(fx - 3 + ((adv+5)%8), fy - 2, 1, 1);        // spray above the lip
  }
  /* churned pool where the whole cascade meets the lake */
  const bx = 434*TILE - cx, by = SURF - cy;
  if(bx > -40 && bx < VIEW_W + 16){
    for(let i = 0; i < 10; i++){
      const bobF = Math.round(Math.sin(f*0.09 + i*1.3));
      ctx.fillStyle = i % 2 ? C.bloomWhite : 'rgba(232,246,238,0.7)';
      ctx.fillRect(bx + i*3 - 2, by + bobF, 2 + (i%3===0 ? 1 : 0), 1);
    }
    ctx.fillStyle = 'rgba(232,246,238,0.5)';                 // drifting foam rafts
    ctx.fillRect(bx - 6 - ((f>>3) % 14), by + 1, 4, 1);
    ctx.fillStyle = 'rgba(232,246,238,0.16)';                // rising mist
    ctx.fillRect(bx - 2, by - 8, 26, 8);
  }
}
