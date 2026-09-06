/* The Conservatory — all rendering for level 3's palette break.
   Hollow Knight mood (Greenpath/Fog Canyon), not daylight: layered
   foliage silhouettes at increasing darkness, fog bands between layers,
   pale god-rays through the glass roof grid, drifting spores, muted
   deep greens with one saturated accent — the koi. Called from
   render.js when currentRoom().backdrop === 'conservatory'. */
import { TILE, tileAt, overlapsChar } from './level.js';
import * as level from './level.js';
import { VIEW_W, VIEW_H } from './camera.js';

/* ---------------- palette ---------------- */
const C = {
  skyPale:   '#c9d6cb',   // hazy daylight above the glass
  glassBar:  '#5a6a60',   // roof mullions
  glassGlint:'#dfe9dd',
  canopyFar: '#93a98f',   // far silhouettes are lightest (aerial haze)
  canopyMid: '#5d7a5f',
  canopyNear:'#33493c',
  fog:       'rgba(172,196,176,',
  ray:       'rgba(222,236,208,',
  flyFace:   '#4b4a44',   // flytower concrete through the glass
  flyDark:   '#3c3b36',
  flyLight:  '#5d5b52',
  conc:      '#39463e',   // mossy play-space concrete
  concDark:  '#2e3a33',
  concTop:   '#54724c',
  moss:      '#6f9152',
  brick:     '#5f4a3a',   // arid house planter brick
  brickDark: '#48372b',
  brickTop:  '#8a7355',
  steel:     '#2c383f',   // walkway plate
  steelDark: '#222b31',
  steelTop:  '#48585f',
  rail:      'rgba(126,148,140,0.65)',
  line:      '#f7c623',   // the Yellow Line survives even here
  lineScuff: '#b39a3f',
  water:     '#0d1f1a',
  waterSurf: '#3f6b58',
  waterGlint:'#7fae94',
  vineWood:  '#4a3b2c',
  vineLeaf:  '#3f5c35',
  vineLeafHi:'#557a41',
  vineDark:  '#2c4128',
  strand:    '#26382a',
  cactus:    '#4f7040',
  cactusDark:'#39522f',
  spine:     '#c9d1b8',
  koi:       '#e8762a',   // THE accent
  koiDark:   '#c4581c',
  koiWhite:  '#f2ede2',
  gold:      '#f2b03c',
};

const hash = (a,b) => ((a*73856093) ^ (b*19349663)) >>> 0;

/* ---------------- ambience: clock, spores ---------------- */
let clock = 0;
const rnd = n => Math.random()*n;
const spores = Array.from({length: 34}, (_,i) => ({
  x: rnd(VIEW_W), y: rnd(VIEW_H),
  s: 0.06 + rnd(0.16),                     // upward drift
  ph: rnd(6.28), big: i % 9 === 0,
  c: i % 3 ? 'rgba(207,224,194,0.55)' : 'rgba(159,192,154,0.45)',
}));
export function stepAmbience(){
  clock++;
  for(const m of spores){
    m.y -= m.s;
    m.x += Math.sin(m.y*0.05 + m.ph)*0.14;
    if(m.y < -2){ m.y = VIEW_H+2; m.x = rnd(VIEW_W); }
  }
}

/* ================================================================
   BACKDROP: light ramp -> glass grid -> far canopy -> fog ->
   mid canopy -> flytower face -> god rays -> fog -> near canopy.
   ================================================================ */
export function backdrop(ctx, cx, cy){
  /* vertical light ramp anchored to world height: pale up top under
     the glass, sinking into darkness at the conservatory floor */
  const stops = [[0,'#cfdacd'],[96,'#a8bda6'],[210,'#5d7861'],[330,'#2c4136'],[480,'#0b130e']];
  const g = ctx.createLinearGradient(0,0,0,VIEW_H);
  for(const [wy,col] of stops){
    const t = (wy - cy)/VIEW_H;
    if(t <= 0 || t >= 1) continue;
    g.addColorStop(t, col);
  }
  g.addColorStop(0, rampAt(stops, cy));
  g.addColorStop(1, rampAt(stops, cy+VIEW_H));
  ctx.fillStyle = g; ctx.fillRect(0,0,VIEW_W,VIEW_H);

  /* glass roof: pale sky above a mullion grid, world y ~96..140 */
  const gp = 0.9;                                     // roof parallax
  const roofTop = 96 - cy*gp, roofBot = 148 - cy*gp;
  if(roofBot > 0 && roofTop < VIEW_H){
    ctx.fillStyle = C.skyPale;
    ctx.fillRect(0, Math.max(-1, roofTop-200), VIEW_W, Math.min(roofBot,VIEW_H)-Math.max(-1,roofTop-200));
    /* horizontal glazing bars */
    ctx.fillStyle = C.glassBar;
    for(const wy of [96, 110, 124, 138]){
      const y = wy - cy*gp;
      if(y > -2 && y < VIEW_H) ctx.fillRect(0, y, VIEW_W, 2);
    }
    /* vertical mullions marching with parallax */
    const off = -((cx*gp) % 14);
    for(let x = off; x < VIEW_W; x += 14){
      ctx.fillRect(x, Math.max(0,roofTop), 1, Math.min(roofBot,VIEW_H) - Math.max(0,roofTop));
      /* the odd pane catches the light */
      const h = hash(Math.round((x + cx*gp)/14), 7) % 11;
      if(h === 3){
        ctx.fillStyle = 'rgba(223,233,221,0.5)';
        ctx.fillRect(x+2, Math.max(0,roofTop)+3, 10, 9);
        ctx.fillStyle = C.glassBar;
      }
    }
  }

  /* far canopy — lightest, haziest */
  canopy(ctx, cx, cy, 0.22, 122, C.canopyFar, '#a9bda3', 11);
  fogBand(ctx, cy, 0.3, 150, 34, 0.30);

  /* mid canopy with hanging strands (the lianas stop at the Arid House) */
  const dry = cx > 1780;
  canopy(ctx, cx, cy, 0.45, 218, C.canopyMid, '#74906f', 23);
  if(!dry) strands(ctx, cx, cy, 0.45, C.canopyMid, 13);

  /* the flytower's concrete face rising through the glass */
  flytowerFace(ctx, cx, cy);

  fogBand(ctx, cy, 0.55, 270, 40, 0.26);

  /* near canopy — darkest, biggest fronds */
  canopy(ctx, cx, cy, 0.7, 318, C.canopyNear, '#42594a', 37);
  if(!dry) strands(ctx, cx, cy, 0.7, C.canopyNear, 29);

  /* god rays slanting from the glass, over the whole backdrop */
  const pulse = 0.055 + 0.03*Math.sin(clock*0.008);
  for(let k = 0; k < 22; k++){
    const x0 = k*150 - cx*0.85;
    if(x0 < -160 || x0 > VIEW_W + 40) continue;
    const top = Math.min(0, 140 - cy*gp);
    ctx.fillStyle = C.ray + (pulse + (k%3)*0.015) + ')';
    ctx.beginPath();
    ctx.moveTo(x0, top); ctx.lineTo(x0+26, top);
    ctx.lineTo(x0+78, VIEW_H); ctx.lineTo(x0+34, VIEW_H);
    ctx.closePath(); ctx.fill();
  }
}

function rampAt(stops, wy){
  for(let i = 1; i < stops.length; i++){
    if(wy <= stops[i][0]){
      const [a,ca] = stops[i-1], [b,cb] = stops[i];
      return mix(ca, cb, (wy-a)/(b-a));
    }
  }
  return stops[stops.length-1][1];
}
function mix(a, b, t){
  t = Math.max(0, Math.min(1, t));
  const pa = parseInt(a.slice(1),16), pb = parseInt(b.slice(1),16);
  const r = ((pa>>16)&255) + (((pb>>16)&255)-((pa>>16)&255))*t;
  const gg = ((pa>>8)&255) + (((pb>>8)&255)-((pa>>8)&255))*t;
  const bl = (pa&255) + ((pb&255)-(pa&255))*t;
  return `rgb(${r|0},${gg|0},${bl|0})`;
}

/* a silhouette layer: smooth rolling canopy with a backlit rim, palms
   and tree-fern bursts spaced along it, filled down to the frame edge */
function canopy(ctx, cx, cy, p, topWY, col, rim, seed){
  const base = topWY - cy*p;
  if(base > VIEW_H + 40) return;
  const topAt = wx =>
    base + Math.sin(wx*0.011 + seed)*14 + Math.sin(wx*0.031 + seed*2)*7
         + Math.sin(wx*0.087 + seed*5)*2.5;
  /* body */
  for(let x = 0; x < VIEW_W; x += 2){
    const wx = cx*p + x;
    const top = topAt(wx);
    ctx.fillStyle = col;
    ctx.fillRect(x, top, 2, VIEW_H - top + 2);
    ctx.fillStyle = rim;
    ctx.fillRect(x, top, 2, 1);
  }
  /* palms and fern bursts rooted in the canopy */
  const cell = 52;
  for(let i = -1; i < VIEW_W/cell + 2; i++){
    const ci = Math.floor((cx*p)/cell) + i;
    const h = hash(ci, seed);
    if(h % 3 === 2) continue;
    const wx = ci*cell + (h % 30);
    const x = wx - cx*p;
    if(x < -14 || x > VIEW_W + 14) continue;
    const top = topAt(wx);
    ctx.fillStyle = col;
    if(h % 2){
      /* palm: leaning trunk, drooping fronds both sides */
      const lean = (h % 5) - 2, th = 12 + (h % 8);
      for(let s = 0; s < th; s += 2)
        ctx.fillRect(x + lean*s/th, top - s, 2, 2);
      const hx = x + lean, hy = top - th;
      ctx.fillRect(hx-6, hy,   5, 2); ctx.fillRect(hx-9, hy+2, 4, 2);
      ctx.fillRect(hx+3, hy,   5, 2); ctx.fillRect(hx+7, hy+2, 4, 2);
      ctx.fillRect(hx-2, hy-2, 6, 2);
      ctx.fillStyle = rim; ctx.fillRect(hx-2, hy-3, 4, 1);
    }else{
      /* tree fern: rounded burst */
      ctx.fillRect(x-5, top-4, 12, 4);
      ctx.fillRect(x-8, top-2, 18, 3);
      ctx.fillRect(x-2, top-7, 6, 3);
      ctx.fillStyle = rim; ctx.fillRect(x-2, top-8, 5, 1);
    }
  }
}

/* hanging vines belonging to a silhouette layer, dropping from above */
function strands(ctx, cx, cy, p, col, seed){
  ctx.fillStyle = col;
  const step = 46;
  const wx0 = Math.floor((cx*p)/step);
  for(let i = -1; i < VIEW_W/step + 2; i++){
    const wxi = wx0 + i;
    const h = hash(wxi, seed);
    if(h % 3 === 0) continue;
    const x = i*step - ((cx*p) % step) + (h % 28);
    const top = 130 - cy*p*0.9;
    const len = 26 + (h % 44);
    if(top + len < 0) continue;
    for(let s = 0; s < len; s += 2){
      const sx2 = x + Math.sin((s+h)*0.18)*1.8;
      ctx.fillRect(sx2, top+s, 1, 2);
      if(s % 8 === 4){ ctx.fillRect(sx2-2, top+s, 2, 1); ctx.fillRect(sx2+1, top+s+1, 2, 1); }
    }
    ctx.fillRect(x-2, top+len-4, 4, 3);           // leaf tuft at the tip
  }
}

/* the theatre flytower: a blind concrete monolith behind the play layer */
function flytowerFace(ctx, cx, cy){
  const p = 0.96;
  const x0 = 1104 - cx*p, x1 = 1336 - cx*p;
  if(x1 < 0 || x0 > VIEW_W) return;
  const top = 60 - cy*p;
  ctx.fillStyle = C.flyFace;
  ctx.fillRect(x0, top, x1-x0, VIEW_H-top);
  /* board-marked shutter lines */
  ctx.fillStyle = C.flyDark;
  for(let y = top+6; y < VIEW_H; y += 9) ctx.fillRect(x0, y, x1-x0, 1);
  for(let x = x0+18; x < x1; x += 30) ctx.fillRect(x, top, 1, VIEW_H-top);
  /* lit west arris + crown */
  ctx.fillStyle = C.flyLight;
  ctx.fillRect(x0, top, 3, VIEW_H-top);
  ctx.fillRect(x0-3, top, x1-x0+6, 4);
  /* loading door ghost high on the face */
  ctx.fillStyle = C.flyDark;
  ctx.fillRect(x0+86, top+22, 46, 30);
  ctx.fillStyle = 'rgba(93,91,82,0.5)';
  ctx.fillRect(x0+86, top+22, 46, 2);
}

function fogBand(ctx, cy, p, wy, h, a){
  const y = wy - cy*p + Math.sin(clock*0.006 + wy)*3;
  if(y + h < 0 || y > VIEW_H) return;
  const g = ctx.createLinearGradient(0, y, 0, y+h);
  g.addColorStop(0, C.fog + '0)');
  g.addColorStop(0.5, C.fog + a + ')');
  g.addColorStop(1, C.fog + '0)');
  ctx.fillStyle = g; ctx.fillRect(0, y, VIEW_W, h);
}

/* ================================================================
   TILE SKINS — returns true when the tile was drawn here.
   ================================================================ */
export function tileSkin(ctx, t, tx, ty, sx, sy, topExposed, P){
  const h = hash(tx, ty);
  if(t === '#'){
    if(tx >= 140 && tx <= 164){
      /* the flytower core: board-marked raw concrete */
      ctx.fillStyle = C.flyFace;  ctx.fillRect(sx,sy,TILE,TILE);
      ctx.fillStyle = C.flyDark;
      if(ty % 2){ ctx.fillRect(sx,sy+5,TILE,1); }
      if(tx % 3 === 0){ ctx.fillRect(sx,sy,1,TILE); }
      if(h % 7 === 0){ ctx.fillRect(sx + h%6, sy + (h>>3)%6, 2, 1); }   // shutter scars
      if(h % 13 === 0){ ctx.fillStyle = C.flyLight; ctx.fillRect(sx+(h%6), sy+2, 1, 1); }
      if(h % 11 === 3){ ctx.fillStyle = '#41453c'; ctx.fillRect(sx + h%7, sy, 1, 5); }  // damp
      if(topExposed){ ctx.fillStyle = C.flyLight; ctx.fillRect(sx,sy,TILE,1); }
    }else if(tx >= 232){
      /* Arid House: warm planter brick, sand-lit tops, dry pot cacti */
      ctx.fillStyle = C.brick;     ctx.fillRect(sx,sy,TILE,TILE);
      ctx.fillStyle = C.brickDark; ctx.fillRect(sx,sy+3,TILE,1);
      ctx.fillRect(sx + (tx%2 ? 2 : 5), sy, 1, 3);
      ctx.fillRect(sx + (tx%2 ? 6 : 1), sy+4, 1, 4);
      if(topExposed){
        ctx.fillStyle = C.brickTop; ctx.fillRect(sx,sy,TILE,1);
        if(h % 5 === 0){                          // harmless barrel cactus
          ctx.fillStyle = C.cactus;  ctx.fillRect(sx+3, sy-2, 2, 2);
          ctx.fillStyle = C.spine;   ctx.fillRect(sx+3, sy-3, 1, 1);
        }
      }
    }else{
      /* jungle: mossy, dripping planter concrete */
      ctx.fillStyle = C.conc;     ctx.fillRect(sx,sy,TILE,TILE);
      ctx.fillStyle = C.concDark; ctx.fillRect(sx,sy+3,TILE,1);
      ctx.fillRect(sx,sy+6,TILE,1);
      ctx.fillRect(sx + h % 8, sy + (h%2 ? 1 : 4), 1, 1);
      if(topExposed){
        ctx.fillStyle = C.concTop; ctx.fillRect(sx,sy,TILE,1);
        if(h % 3 === 0){ ctx.fillStyle = C.moss; ctx.fillRect(sx + h%5, sy-1, 3, 1); }
        if(h % 7 === 2){ ctx.fillStyle = C.vineLeafHi; ctx.fillRect(sx + h%4, sy-2, 2, 2); }
      }else if(h % 11 === 0){
        ctx.fillStyle = C.concTop; ctx.fillRect(sx + h%7, sy, 1, 4);   // damp streak
      }
    }
    return true;
  }
  if(t === '=' || t === '-'){
    /* walkway with the Yellow Line: steel grating in the jungle,
       dusty paving in the Arid House */
    const arid = tx >= 232;
    ctx.fillStyle = arid ? C.brickDark : C.steel;  ctx.fillRect(sx,sy,TILE,TILE);
    ctx.fillStyle = arid ? '#3a2c22' : C.steelDark; ctx.fillRect(sx,sy+4,TILE,1);
    ctx.fillRect(sx + (tx%2 ? 2 : 5), sy+1, 1, 6);
    if(topExposed){
      ctx.fillStyle = arid ? C.brickTop : C.steelTop; ctx.fillRect(sx,sy+1,TILE,1);
      if(t === '='){
        ctx.fillStyle = C.line;  ctx.fillRect(sx,sy,TILE,1);
      }else{
        ctx.fillStyle = C.lineScuff;
        ctx.fillRect(sx + (tx%2 ? 1 : 4), sy, 2, 1);
        ctx.fillRect(sx + (tx%2 ? 5 : 0), sy, 1, 1);
      }
      /* thin steel railing behind the walk */
      const cont = c => c === '=' || c === '-';
      if(cont(tileAt(tx-1,ty)) || cont(tileAt(tx+1,ty))){
        ctx.fillStyle = C.rail;
        ctx.fillRect(sx, sy-4, TILE, 1);
        if(tx % 2 === 0) ctx.fillRect(sx+3, sy-4, 1, 4);
      }
    }
    return true;
  }
  if(t === 'V'){
    /* vine platform: woody heart under a mound of leaves, hung from above */
    if(tx % 2 === 0){                              // support strand to the roof
      ctx.fillStyle = C.strand;
      for(let s = 2; s < 60; s += 2)
        ctx.fillRect(sx+3 + Math.sin((s+tx)*0.2)*1.4, sy-s, 1, 2);
      if(h % 2) { ctx.fillStyle = C.vineDark; ctx.fillRect(sx+2, sy-18-(h%20), 3, 2); }
    }
    ctx.fillStyle = C.vineWood;   ctx.fillRect(sx,sy+3,TILE,3);
    ctx.fillStyle = C.vineDark;   ctx.fillRect(sx,sy+6,TILE,2);
    ctx.fillStyle = C.vineLeaf;   ctx.fillRect(sx,sy,TILE,3);
    ctx.fillStyle = C.vineLeafHi;
    ctx.fillRect(sx + h%4, sy, 3, 1); ctx.fillRect(sx + h%6, sy+1, 2, 1);
    /* tendrils trailing below */
    ctx.fillStyle = C.strand;
    ctx.fillRect(sx + 1 + h%5, sy+8, 1, 2 + h%5);
    if(h % 3 === 0) ctx.fillRect(sx + 5, sy+8, 1, 1 + h%3);
    return true;
  }
  if(t === 'W'){
    /* koi pond: near-black water, pale surface line, lilies */
    ctx.fillStyle = C.water; ctx.fillRect(sx,sy,TILE,TILE);
    if(tileAt(tx,ty-1) !== 'W'){
      ctx.fillStyle = C.waterSurf; ctx.fillRect(sx,sy,TILE,1);
      if((tx + (clock>>5)) % 7 === 0){
        ctx.fillStyle = C.waterGlint; ctx.fillRect(sx+2,sy,3,1);
      }
      if(h % 9 === 0){
        ctx.fillStyle = '#2f5b3a'; ctx.fillRect(sx+1, sy-1, 5, 2);
        ctx.fillStyle = '#3f7048'; ctx.fillRect(sx+2, sy-1, 2, 1);
      }
    }else if(h % 5 === 0){
      ctx.fillStyle = '#132a23'; ctx.fillRect(sx+2, sy+3, 4, 1);
    }
    return true;
  }
  if(t === '^'){
    /* saguaro cactus — the one thing here that bites */
    ctx.fillStyle = C.cactus;
    ctx.fillRect(sx+3, sy+1, 2, 7);                 // trunk
    ctx.fillRect(sx+1, sy+3, 1, 3); ctx.fillRect(sx+1, sy+3, 2, 1);   // left arm
    ctx.fillRect(sx+6, sy+2, 1, 4); ctx.fillRect(sx+5, sy+2, 2, 1);   // right arm
    ctx.fillStyle = C.cactusDark;
    ctx.fillRect(sx+4, sy+1, 1, 7);
    ctx.fillStyle = C.spine;
    ctx.fillRect(sx+2, sy+2, 1, 1); ctx.fillRect(sx+5, sy+4, 1, 1);
    ctx.fillRect(sx+3, sy+6, 1, 1); ctx.fillRect(sx+6, sy+1, 1, 1);
    if(h % 4 === 0){ ctx.fillStyle = '#d96a8a'; ctx.fillRect(sx+3, sy, 1, 1); }
    return true;
  }
  if(t === 'B'){
    /* concrete bench gone green at the edges */
    ctx.fillStyle = '#7d786d'; ctx.fillRect(sx,   sy+3, 8, 2);
    ctx.fillStyle = '#5f5b52'; ctx.fillRect(sx+1, sy+5, 1, 3);
    ctx.fillRect(sx+6, sy+5, 1, 3);
    ctx.fillStyle = C.moss;    ctx.fillRect(sx,   sy+3, 2, 1);
    if(P.checkpoint && Math.floor(P.checkpoint.x/TILE) === tx){
      ctx.fillStyle = C.line;  ctx.fillRect(sx+3, sy+2, 2, 1);
    }
    return true;
  }
  if(t === 'E'){
    /* the way out: a pale doorway cut into the dark */
    ctx.fillStyle = '#101a14';  ctx.fillRect(sx,sy,TILE,TILE);
    ctx.fillStyle = '#46564d';  ctx.fillRect(sx,sy,1,TILE);
    ctx.fillRect(sx+TILE-1,sy,1,TILE);
    const glow = 0.65 + 0.3*Math.sin(clock*0.05);
    ctx.fillStyle = `rgba(207,227,196,${glow})`;
    ctx.fillRect(sx+3, sy, 2, TILE);
    ctx.fillStyle = 'rgba(207,227,196,0.25)';
    ctx.fillRect(sx+1, sy, 6, TILE);
    return true;
  }
  return false;                                    // anything else: estate skin
}

/* ================================================================
   FRONT: koi, the golden tank, foreground fronds, fog, spores,
   low ambient light + vignette, exit glow, cleared banner.
   ================================================================ */
export function front(ctx, cx, cy, P){
  const room = level.currentRoom();

  /* koi — the single saturated accent, cruising their pools */
  for(const k of (room.koi || [])){
    const range = k.x1 - k.x0;
    const u = (clock*k.sp + k.ph*range) % (2*range);
    const x = (u < range ? k.x0 + u : k.x1 - (u - range)) - cx;
    const dir = u < range ? 1 : -1;
    const y = k.y - cy + Math.sin(clock*0.05 + k.ph)*0.8;
    if(x < -12 || x > VIEW_W+12 || y < -6 || y > VIEW_H+6) continue;
    const f = (xx,w,yy,hh,c) => {
      ctx.fillStyle = c;
      ctx.fillRect(dir > 0 ? x+xx : x+8-xx-w, y+yy, w, hh);
    };
    const wig = Math.sin(clock*0.28 + k.ph)*1.2;
    f(0,2,0.5+wig*0.4,2,C.koiDark);                // tail
    f(2,5,0,3,C.koi);                              // body
    f(4,2,0,1,C.koiWhite);                         // white saddle
    f(6,2,0.5,2,C.koiDark);                        // head
    ctx.fillStyle = 'rgba(10,30,24,0.4)';          // seen through water
    ctx.fillRect(x-1, y-1, 10, 5);
    if((clock + (k.ph*60|0)) % 160 < 8){           // surface ripple
      ctx.fillStyle = 'rgba(127,174,148,0.5)';
      ctx.fillRect(x+2, 432 - cy, 5, 1);
    }
  }

  /* the gardeners' store: a glass tank with one golden koi */
  if(room.tank){
    const x = room.tank.x - cx, y = room.tank.y - cy;
    if(x > -24 && x < VIEW_W+8 && y > -16 && y < VIEW_H+16){
      ctx.fillStyle = '#4a382c'; ctx.fillRect(x-1, y-2, 18, 2);      // stand
      ctx.fillStyle = '#16332b'; ctx.fillRect(x, y-13, 16, 11);      // water
      const gx = x + 4 + Math.sin(clock*0.03)*3;
      ctx.fillStyle = C.gold;    ctx.fillRect(gx, y-8, 7, 3);
      ctx.fillStyle = '#d98f1f'; ctx.fillRect(gx, y-6, 7, 1);
      ctx.fillStyle = C.koiWhite; ctx.fillRect(gx+4, y-8, 2, 1);
      ctx.fillStyle = '#5f7570';                                     // frame
      ctx.fillRect(x-1, y-14, 18, 1); ctx.fillRect(x-1, y-13, 1, 12);
      ctx.fillRect(x+16, y-13, 1, 12);
      ctx.fillStyle = 'rgba(223,233,221,0.22)';                      // glint
      ctx.fillRect(x+2, y-12, 2, 9);
    }
  }

  /* foreground fronds hanging into the frame (sparse, near the top;
     none in the Arid House) */
  ctx.fillStyle = '#16221a';
  const step = 96, p = 1.12;
  for(let i = -1; cx <= 1780 && i < VIEW_W/step + 2; i++){
    const wxi = Math.floor((cx*p)/step) + i;
    const h = hash(wxi, 41);
    if(h % 3 === 0) continue;
    const x = i*step - ((cx*p) % step) + (h % 40);
    const len = 16 + (h % 30);
    for(let s = 0; s < len; s += 2)
      ctx.fillRect(x + Math.sin((s+h)*0.3)*2, s-2, 2, 2);
    ctx.fillRect(x-2, len-6, 3, 2); ctx.fillRect(x+3, len-9, 3, 2);
  }

  /* a drifting fog sheet in front of the play layer */
  fogBand(ctx, cy, 0.92, 300, 46, 0.13);
  fogBand(ctx, cy, 0.92, 170, 36, 0.10);

  /* spores drifting up through the light */
  for(const m of spores){
    ctx.fillStyle = m.c;
    ctx.fillRect((m.x - cx*0.35 + 4800) % VIEW_W, m.y, m.big ? 2 : 1, m.big ? 2 : 1);
  }

  /* low ambient light: gentle global dim, heavier vignette, deep floor */
  ctx.fillStyle = 'rgba(8,16,12,0.14)'; ctx.fillRect(0,0,VIEW_W,VIEW_H);
  const vig = ctx.createRadialGradient(VIEW_W/2,VIEW_H/2,70,VIEW_W/2,VIEW_H/2,215);
  vig.addColorStop(0,'rgba(3,8,6,0)'); vig.addColorStop(1,'rgba(3,8,6,0.42)');
  ctx.fillStyle = vig; ctx.fillRect(0,0,VIEW_W,VIEW_H);
  const deep = ctx.createLinearGradient(0,VIEW_H-44,0,VIEW_H);
  deep.addColorStop(0,'rgba(5,10,8,0)'); deep.addColorStop(1,'rgba(5,10,8,0.38)');
  ctx.fillStyle = deep; ctx.fillRect(0,VIEW_H-44,VIEW_W,44);

  /* exit halo, above the gloom */
  if(room.exitGlow){
    const ex = room.exitGlow.tx*TILE + 8 - cx, ey = room.exitGlow.ty*TILE + 8 - cy;
    if(ex > -40 && ex < VIEW_W+40 && ey > -40 && ey < VIEW_H+40){
      const halo = ctx.createRadialGradient(ex,ey,2,ex,ey,34);
      halo.addColorStop(0,'rgba(207,227,196,0.30)');
      halo.addColorStop(1,'rgba(207,227,196,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(ex,ey,34,0,7); ctx.fill();
    }
  }

  /* stepping into the doorway */
  if(overlapsChar(P.x, P.y, P.w, P.h, 'E')){
    ctx.fillStyle = 'rgba(6,12,9,0.72)';
    ctx.fillRect(VIEW_W/2-92, VIEW_H/2-16, 184, 26);
    ctx.fillStyle = C.line; ctx.font = '7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('THE CONSERVATORY · CLEARED', VIEW_W/2, VIEW_H/2-4);
    ctx.fillStyle = '#c9d6cb';
    ctx.fillText('THE LINE CONTINUES', VIEW_W/2, VIEW_H/2+5);
    ctx.textAlign = 'left';
  }
}
