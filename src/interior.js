/* All interior rendering for rooms flagged { interior: true } — the
   Arts Centre palette break: dark concrete, rust-orange carpet, brass,
   red theatre seats, artificial light. render.js dispatches here for
   backdrop, tile skins, props (incl. the Mothlight screen) and the
   overlay; the layer order it guarantees is unchanged.

   Everything animated is driven by a frame counter and an integer
   hash — no Math.random in any draw path, so frames are stable. */
import { TILE, tileAt, solidAt } from './level.js';
import * as level from './level.js';
import { VIEW_W, VIEW_H } from './camera.js';

/* ---------------- palette ---------------- */
const IPAL = {
  wallTop:   '#1d1916',   // deep shadow up in the voids
  wall:      '#2b2621',   // back-of-house concrete
  conc:      '#37312a',   // solid fill, board-marked
  concSeam:  '#2a2520',
  concEdge:  '#5a5248',   // lit arris where a face is exposed
  carpet:    '#7c3b1e',   // the famous rust-orange carpet
  carpetTop: '#a34c22',
  carpetSeam:'#5e2c15',
  line:      '#f7c623',   // the Yellow Line, indoors now
  lineWorn:  '#b98f34',
  timber:    '#553c2a',   // stage deck / stalls panelling
  timberTop: '#6e5140',
  timberSeam:'#3d2b1e',
  brass:     '#c9a24b',
  seatRed:   '#8e2b26',
  seatRedHi: '#b23c31',
  seatDark:  '#55231e',
  seatDarkHi:'#7d4a3c',
  steel:     '#4e545e',
  steelHi:   '#8892a0',
  orange:    '#e2531f',   // Barbican wayfinding orange
  signText:  '#16110d',
  globe:     '#ffe4a6',
  neon:      '#8ff0dc',
  screenWhite:'#f4efe3',
};
const OCHRES = ['#4a3418','#6d4a20','#8a6428','#3a2a14','#7a5a30'];
const BOTTLES = ['#3f5a34','#7a5a20','#6d3020','#48606a','#8a7434'];

/* ---------------- deterministic hash ---------------- */
function h32(a, b){
  let x = ((a|0)*374761393 + (b|0)*668265263)|0;
  x = (x ^ (x>>>13)) >>> 0;
  x = (x * 1274126177) >>> 0;
  return (x ^ (x>>>16)) >>> 0;
}

let frame = 0;
let PP = null;                                   // player ref for this frame
export function interiorFrame(P){ frame++; PP = P; }

const zonesOf = () => level.currentRoom().zones || [];
function zoneAt(tx){
  for(const z of zonesOf()) if(tx >= z.x0 && tx <= z.x1) return z;
  return null;
}

/* ================================================================
   BACKDROP — base gloom + per-zone wall dressing (world coords)
   ================================================================ */
export function drawInteriorBackdrop(ctx, cx, cy){
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, IPAL.wallTop); g.addColorStop(1, IPAL.wall);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const tx0 = Math.floor(cx/TILE) - 2, tx1 = Math.floor((cx+VIEW_W)/TILE) + 2;
  for(const z of zonesOf()){
    if(z.x1 < tx0 || z.x0 > tx1) continue;
    dressZone(ctx, z, cx, cy, tx0, tx1);
  }
}

function dressZone(ctx, z, cx, cy, vx0, vx1){
  const x0 = Math.max(z.x0, vx0), x1 = Math.min(z.x1, vx1);
  const fy = z.floor*TILE - cy;                  // floor surface line (px)
  const ceilY = z.ceil*TILE - cy;

  if(z.type === 'foyer' || z.type === 'bar'){
    /* warm plaster band above the skirting */
    ctx.fillStyle = z.type === 'bar' ? '#372a20' : '#332c24';
    ctx.fillRect(x0*TILE - cx, ceilY + TILE, (x1-x0+1)*TILE, fy - ceilY - TILE);
    /* coffered ceiling with globe lights (the famous foyer lamps) */
    for(let tx = x0 - (x0%6); tx <= x1; tx += 6){
      const sx = tx*TILE - cx;
      ctx.fillStyle = '#191512';
      ctx.fillRect(sx + 4, ceilY + TILE, 32, 6);          // coffer recess
      const gx = sx + 20, gy = ceilY + TILE + 8;
      const glow = ctx.createRadialGradient(gx, gy, 1, gx, gy, 26);
      glow.addColorStop(0, 'rgba(255,220,150,0.30)'); glow.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(gx, gy, 26, 0, 7); ctx.fill();
      ctx.fillStyle = IPAL.globe; ctx.beginPath(); ctx.arc(gx, gy, 2.5, 0, 7); ctx.fill();
    }
    /* concrete columns down to the floor */
    for(let tx = x0 - (x0%12) + 4; tx <= x1; tx += 12){
      if(!solidAt(tx, z.floor)) continue;                 // never over a void
      const sx = tx*TILE - cx;
      ctx.fillStyle = '#403931'; ctx.fillRect(sx, ceilY + TILE, 6, fy - ceilY - TILE);
      ctx.fillStyle = '#57493c'; ctx.fillRect(sx, ceilY + TILE, 1, fy - ceilY - TILE);
      ctx.fillStyle = '#241f1a'; ctx.fillRect(sx + 5, ceilY + TILE, 1, fy - ceilY - TILE);
    }
  }

  if(z.type === 'bar'){
    /* the back-bar: mahogany, two bottle shelves, brass rail, neon glass */
    const bx = 177*TILE - cx, bw = 14*TILE;
    ctx.fillStyle = '#33201377'; ctx.fillRect(bx, fy - 7*TILE, bw, 7*TILE);
    for(const shelfRow of [43, 41]){
      const sy = shelfRow*TILE - cy;
      ctx.fillStyle = '#4a3320'; ctx.fillRect(bx + 4, sy + 6, bw - 8, 2);   // shelf
      for(let i = 0; i < 16; i++){
        const px = bx + 6 + i*6.6, hgt = 3 + h32(shelfRow, i)%3;
        ctx.fillStyle = BOTTLES[h32(i, shelfRow)%BOTTLES.length];
        ctx.fillRect(px, sy + 6 - hgt, 2, hgt);
        if(h32(i*7, shelfRow)%3 === 0){                    // upturned glass
          ctx.fillStyle = 'rgba(220,230,235,0.5)';
          ctx.fillRect(px + 3, sy + 3, 2, 3);
        }
      }
    }
    /* neon martini glass over the bar */
    const nx = 181*TILE - cx, ny = fy - 8*TILE;
    ctx.strokeStyle = IPAL.neon; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx + 8, ny);
    ctx.lineTo(nx + 4, ny + 5); ctx.closePath();
    ctx.moveTo(nx + 4, ny + 5); ctx.lineTo(nx + 4, ny + 9);
    ctx.moveTo(nx + 1, ny + 9); ctx.lineTo(nx + 7, ny + 9); ctx.stroke();
    const nglow = ctx.createRadialGradient(nx+4, ny+4, 1, nx+4, ny+4, 16);
    nglow.addColorStop(0, 'rgba(140,240,220,0.20)'); nglow.addColorStop(1, 'rgba(140,240,220,0)');
    ctx.fillStyle = nglow; ctx.fillRect(nx - 12, ny - 12, 32, 32);
    /* cellar dressing: wine lattice below the floor */
    const cely = 50*TILE - cy;
    ctx.fillStyle = '#241a12';
    ctx.fillRect(182*TILE - cx, cely, 12*TILE, 4*TILE);
    ctx.strokeStyle = '#3d2c1c';
    for(let i = 0; i < 6; i++){
      const lx = (182 + i*2)*TILE - cx;
      ctx.beginPath(); ctx.moveTo(lx, cely); ctx.lineTo(lx + 16, cely + 32); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx + 16, cely); ctx.lineTo(lx, cely + 32); ctx.stroke();
    }
  }

  if(z.type === 'stalls'){
    /* dark timber panelling, a technical gallery, red house tabs */
    ctx.fillStyle = '#2e2118';
    ctx.fillRect(x0*TILE - cx, ceilY + TILE, (x1-x0+1)*TILE, fy - ceilY - TILE + 4*TILE);
    ctx.fillStyle = '#3c2c1f';
    for(let tx = x0; tx <= x1; tx += 3)
      ctx.fillRect(tx*TILE - cx, ceilY + TILE, 1, fy - ceilY - TILE + 4*TILE);
    ctx.fillStyle = '#1c1512';
    ctx.fillRect(x0*TILE - cx, ceilY + 3*TILE, (x1-x0+1)*TILE, 5);   // gallery shadow line
    /* house tabs bunched at the proscenium */
    const px = 86*TILE - cx;
    ctx.fillStyle = '#6e1d1d'; ctx.fillRect(px, ceilY + TILE, 14, fy - ceilY + 3*TILE);
    ctx.fillStyle = '#8a2626';
    for(let i = 0; i < 4; i++) ctx.fillRect(px + 2 + i*3, ceilY + TILE, 1, fy - ceilY + 3*TILE);
  }

  if(z.type === 'flytower'){
    /* the void: near-black, counterweight tracks, gallows lights */
    ctx.fillStyle = '#151210';
    ctx.fillRect(91*TILE - cx, 3*TILE - cy, 29*TILE, 47*TILE);
    ctx.fillStyle = '#221e1a';
    for(let tx = 92; tx <= 118; tx += 4)
      ctx.fillRect(tx*TILE - cx + 3, 3*TILE - cy, 1, 47*TILE);
    for(let ry = 6; ry < 50; ry += 8){
      ctx.fillStyle = '#c04038';
      ctx.fillRect(91*TILE - cx + 1, ry*TILE - cy, 1, 1);            // working lights
      ctx.fillRect(119*TILE - cx + 6, (ry+4)*TILE - cy, 1, 1);
    }
    /* descent channel: same gloom */
    ctx.fillStyle = '#171310';
    ctx.fillRect(122*TILE - cx, 3*TILE - cy, 7*TILE, 43*TILE);
  }

  if(z.type === 'backstage'){
    ctx.fillStyle = '#2c2620';
    ctx.fillRect(x0*TILE - cx, ceilY + TILE, (x1-x0+1)*TILE, fy - ceilY - TILE);
    /* dock hazard chevrons + flight cases */
    const hx = 133*TILE - cx, hy = fy - 3;
    ctx.fillStyle = '#c9a23a';
    for(let i = 0; i < 10; i++) ctx.fillRect(hx + i*8, hy, 4, 2);
    for(const [ctx0, w, hgt, tone] of [[137, 18, 12, '#3a3f45'], [141, 12, 18, '#45392a'], [162, 14, 10, '#3a3f45']]){
      const px = ctx0*TILE - cx;
      ctx.fillStyle = tone;    ctx.fillRect(px, fy - hgt, w, hgt);
      ctx.fillStyle = '#20242a'; ctx.fillRect(px, fy - hgt, w, 1);
      ctx.fillStyle = '#6a7078'; ctx.fillRect(px + 2, fy - hgt + 3, w - 4, 1);
    }
    /* a work light over the pickup */
    const lx = 158*TILE - cx + 4, ly = ceilY + TILE;
    ctx.fillStyle = '#3a352f'; ctx.fillRect(lx - 1, ly, 2, 4);
    const glow = ctx.createRadialGradient(lx, ly + 6, 2, lx, ly + 6, 30);
    glow.addColorStop(0, 'rgba(255,226,166,0.35)'); glow.addColorStop(1, 'rgba(255,226,166,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(lx, ly + 6, 30, 0, 7); ctx.fill();
  }

  if(z.type === 'cinema'){
    /* black-box auditorium with acoustic ribs */
    ctx.fillStyle = '#141110';
    ctx.fillRect(213*TILE - cx, ceilY + TILE, 110*TILE, 26*TILE);
    ctx.fillStyle = '#1e1a18';
    for(let tx = 214; tx <= 320; tx += 5)
      ctx.fillRect(tx*TILE - cx, ceilY + TILE, 2, 26*TILE);
  }

  if(z.type === 'exit'){
    ctx.fillStyle = '#2e2b26';
    ctx.fillRect(x0*TILE - cx, ceilY + TILE, (x1-x0+1)*TILE, fy - ceilY - TILE);
    /* daylight pours in from the way out */
    const dx0 = 340*TILE - cx;
    const day = ctx.createLinearGradient(dx0, 0, 356*TILE - cx, 0);
    day.addColorStop(0, 'rgba(214,228,236,0)'); day.addColorStop(1, 'rgba(214,228,236,0.45)');
    ctx.fillStyle = day; ctx.fillRect(dx0, ceilY + TILE, 16*TILE, fy - ceilY - TILE);
  }
}

/* ================================================================
   TILE SKINS — one call per visible tile, replaces the exterior set
   ================================================================ */
export function drawInteriorTile(ctx, t, tx, ty, sx, sy){
  const z = zoneAt(tx);
  const topExposed = !solidAt(tx, ty-1);

  if(t === '=' || t === '-'){
    carpetTile(ctx, tx, ty, sx, sy, topExposed, t);
  }else if(t === 'F'){
    /* fly bar / steel batten: thin rail in the top half of the tile */
    ctx.fillStyle = IPAL.steel;   ctx.fillRect(sx, sy, TILE, 3);
    ctx.fillStyle = IPAL.steelHi; ctx.fillRect(sx, sy, TILE, 1);
    ctx.fillStyle = '#31353c';    ctx.fillRect(sx, sy + 3, TILE, 1);
    if((tx + ty) % 4 === 0){ ctx.fillStyle = '#232629'; ctx.fillRect(sx + 3, sy + 1, 2, 2); }  // clamp
  }else if(t === 'B'){
    /* upholstered foyer bench on brass legs */
    ctx.fillStyle = '#8e2b26';  ctx.fillRect(sx, sy + 3, TILE, 2);
    ctx.fillStyle = '#b23c31';  ctx.fillRect(sx, sy + 3, TILE, 1);
    ctx.fillStyle = IPAL.brass; ctx.fillRect(sx + 1, sy + 5, 1, 3);
    ctx.fillRect(sx + 6, sy + 5, 1, 3);
    if(PP && PP.checkpoint && Math.floor(PP.checkpoint.x/TILE) === tx){
      ctx.fillStyle = IPAL.line; ctx.fillRect(sx + 3, sy + 2, 2, 1);   // resting mark
    }
  }else if(t === 's'){
    seatTile(ctx, z, sx, sy, tx);
  }else if(t === '*'){
    pickupTile(ctx, sx, sy);
  }else if(t === 'E'){
    /* the way out: daylight in a doorway */
    ctx.fillStyle = '#dfe8ec';  ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#c3d6de';  ctx.fillRect(sx, sy + (ty%2 ? 4 : 2), TILE, 1);
    if(tileAt(tx-1, ty) !== 'E'){ ctx.fillStyle = '#8fb0be'; ctx.fillRect(sx, sy, 1, TILE); }
  }else if(t === '#'){
    if(topExposed && z) surfaceTile(ctx, z, tx, ty, sx, sy);
    else concreteFill(ctx, tx, ty, sx, sy);
  }else{
    concreteFill(ctx, tx, ty, sx, sy);
  }
}

function carpetTile(ctx, tx, ty, sx, sy, topExposed, t){
  if(!topExposed){ concreteFill(ctx, tx, ty, sx, sy); return; }
  ctx.fillStyle = IPAL.carpet;     ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = IPAL.carpetSeam; ctx.fillRect(sx, sy + 4, TILE, 1);
  ctx.fillRect(sx + (tx%2 ? 2 : 5), sy + 5, 1, 3);
  ctx.fillStyle = IPAL.carpetTop;  ctx.fillRect(sx, sy + 1, TILE, 1);
  const w = h32(tx, ty)%7;                                    // carpet wear
  if(w < 2){ ctx.fillStyle = '#8a441f'; ctx.fillRect(sx + w*3, sy + 6, 2, 1); }
  if(t === '='){
    ctx.fillStyle = IPAL.line; ctx.fillRect(sx, sy, TILE, 1); // the Line, indoors
  }else{
    ctx.fillStyle = IPAL.lineWorn;                            // scuffed away…
    ctx.fillRect(sx + (tx%2 ? 1 : 4), sy, 2, 1);
    ctx.fillRect(sx + (tx%2 ? 5 : 0), sy, 1, 1);
  }
}

function surfaceTile(ctx, z, tx, ty, sx, sy){
  if(z.type === 'flytower' || z.type === 'backstage'){
    /* stage deck / dock: dark timber boards */
    ctx.fillStyle = IPAL.timber;     ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = IPAL.timberTop;  ctx.fillRect(sx, sy, TILE, 1);
    ctx.fillStyle = IPAL.timberSeam; ctx.fillRect(sx, sy + 3, TILE, 1);
    ctx.fillRect(sx + (tx%2 ? 3 : 6), sy, 1, 3);
    ctx.fillRect(sx, sy + 6, TILE, 1);
  }else if(z.type === 'stalls'){
    /* stalls rake: deep red aisle carpet */
    ctx.fillStyle = '#5e2a22'; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#7c382c'; ctx.fillRect(sx, sy, TILE, 1);
    ctx.fillStyle = '#46201a'; ctx.fillRect(sx, sy + 4, TILE, 1);
  }else if(z.type === 'cinema'){
    /* near-black cinema floor with aisle guide lights */
    ctx.fillStyle = '#26211e'; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#332c28'; ctx.fillRect(sx, sy, TILE, 1);
    if(!solidAt(tx-1, ty) || !solidAt(tx+1, ty)){             // step edge
      const lit = (frame>>4)%2 === 0 || h32(tx, 5)%3 !== 0;
      ctx.fillStyle = lit ? '#d0483a' : '#5e2620';
      ctx.fillRect(sx + (!solidAt(tx-1, ty) ? 0 : TILE-2), sy, 2, 1);
    }
  }else{
    /* foyer/bar walkable concrete (landing tops etc.) — carpet there
       is laid as '='; bare tops read as pale screed */
    ctx.fillStyle = '#4a443c'; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#5f574c'; ctx.fillRect(sx, sy, TILE, 1);
    ctx.fillStyle = '#3a352e'; ctx.fillRect(sx, sy + 4, TILE, 1);
  }
}

function concreteFill(ctx, tx, ty, sx, sy){
  ctx.fillStyle = IPAL.conc;     ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = IPAL.concSeam; ctx.fillRect(sx, sy + 3, TILE, 1);
  ctx.fillRect(sx, sy + 6, TILE, 1);
  const h = (tx*73 + ty*151) % 8;
  ctx.fillRect(sx + h, sy + ((tx*31 + ty*17)%2 ? 1 : 4), 1, 1);
  if(!solidAt(tx, ty-1)){ ctx.fillStyle = IPAL.concEdge; ctx.fillRect(sx, sy, TILE, 1); }
  if(!solidAt(tx-1, ty)){ ctx.fillStyle = '#453e35'; ctx.fillRect(sx, sy, 1, TILE); }
  if(!solidAt(tx+1, ty)){ ctx.fillStyle = '#231f1b'; ctx.fillRect(sx + TILE - 1, sy, 1, TILE); }
}

function seatTile(ctx, z, sx, sy, tx){
  const cinema = z && z.type === 'cinema';
  const body = cinema ? IPAL.seatDark   : IPAL.seatRed;
  const hi   = cinema ? IPAL.seatDarkHi : IPAL.seatRedHi;
  /* two seats per tile, all facing right (toward stage / screen) */
  for(const off of [0, 4]){
    ctx.fillStyle = '#1c1614';                     // legs
    ctx.fillRect(sx + off + 1, sy + 7, 1, 1);
    ctx.fillRect(sx + off + 3, sy + 7, 1, 1);
    ctx.fillStyle = body;
    ctx.fillRect(sx + off,     sy + 1, 2, 6);      // seat back (left = behind)
    ctx.fillRect(sx + off + 2, sy + 4, 2, 3);      // cushion
    ctx.fillStyle = hi;
    ctx.fillRect(sx + off,     sy + 1, 2, 1);      // rim light on the back
    ctx.fillRect(sx + off + 2, sy + 4, 2, 1);
  }
}

function pickupTile(ctx, sx, sy){
  const got = PP && PP.abilities && PP.abilities.dash;
  const cxp = sx + 4, cyp = sy + 4;
  if(got){
    ctx.fillStyle = '#4a443c';                     // spent husk
    ctx.fillRect(cxp - 1, cyp - 1, 2, 2);
    return;
  }
  const pulse = 0.5 + 0.5*Math.sin(frame*0.12);
  const glow = ctx.createRadialGradient(cxp, cyp, 1, cxp, cyp, 12 + pulse*4);
  glow.addColorStop(0, `rgba(247,198,35,${0.35 + pulse*0.25})`);
  glow.addColorStop(1, 'rgba(247,198,35,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cxp, cyp, 16, 0, 7); ctx.fill();
  ctx.save();
  ctx.translate(cxp, cyp); ctx.rotate(Math.PI/4);
  const s = 2.4 + pulse*0.8;
  ctx.fillStyle = IPAL.line;     ctx.fillRect(-s, -s, s*2, s*2);
  ctx.fillStyle = '#fff3c8';     ctx.fillRect(-s/2, -s/2, s, s);
  ctx.restore();
}

/* ================================================================
   PROPS — after tiles, before the player
   ================================================================ */
export function drawInteriorProps(ctx, cx, cy){
  const room = level.currentRoom();

  /* suspension cables above every fly-bar segment end */
  const tx0 = Math.floor(cx/TILE), tx1 = Math.floor((cx+VIEW_W)/TILE);
  const ty0 = Math.floor(cy/TILE), ty1 = Math.floor((cy+VIEW_H)/TILE);
  ctx.fillStyle = '#3c3833';
  for(let ty = ty0; ty <= ty1; ty++){
    for(let tx = tx0; tx <= tx1; tx++){
      if(tileAt(tx, ty) !== 'F') continue;
      const first = tileAt(tx-1, ty) !== 'F', last = tileAt(tx+1, ty) !== 'F';
      if(!first && !last) continue;
      const sy = ty*TILE - cy;
      if(first) ctx.fillRect(tx*TILE - cx + 1, Math.max(-2, 0 - cy + 24), 1, sy - Math.max(-2, 24 - cy));
      if(last)  ctx.fillRect(tx*TILE - cx + 6, Math.max(-2, 0 - cy + 24), 1, sy - Math.max(-2, 24 - cy));
    }
  }

  for(const p of (room.props || [])){
    if(p.type === 'curtain')   drawSafetyCurtain(ctx, p, cx, cy);
    if(p.type === 'screen')    drawMothlight(ctx, p, cx, cy);
    if(p.type === 'projector') drawProjector(ctx, p, cx, cy);
    if(p.type === 'poster')    drawPoster(ctx, p, cx, cy);
  }

  /* bar stools in front of the counter */
  if(zonesOf().some(z => z.type === 'bar')){
    for(const stx of [178.6, 180.6, 182.6, 184.6]){
      const px = stx*TILE - cx, py = 46*TILE - cy;
      if(px < -12 || px > VIEW_W + 12) continue;
      ctx.fillStyle = '#20242a';  ctx.fillRect(px + 2, py - 9, 1, 9);       // stem
      ctx.fillRect(px, py - 1, 5, 1);                                       // foot ring
      ctx.fillStyle = '#a3402a';  ctx.fillRect(px, py - 11, 5, 2);          // pad
      ctx.fillStyle = '#c95b38';  ctx.fillRect(px, py - 11, 5, 1);
    }
  }

  /* orange wayfinding plates (interior style) */
  ctx.font = '7px monospace';
  for(const s of (room.signs || [])){
    const x = s.tx*TILE - cx, y = s.ty*TILE - cy;
    if(x < -140 || x > VIEW_W + 20) continue;
    const w = s.text.length*4.3 + 8;
    ctx.fillStyle = IPAL.orange;      ctx.fillRect(x - 2, y - 9, w, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 2, y + 2, w, 1);
    ctx.fillStyle = IPAL.signText;    ctx.fillText(s.text, x + 2, y);
  }
}

function drawSafetyCurtain(ctx, p, cx, cy){
  const x = p.tx*TILE - cx, y0 = p.y0*TILE - cy, hgt = (p.y1 - p.y0 + 1)*TILE;
  if(x < -16 || x > VIEW_W + 16) return;
  ctx.fillStyle = '#5e5348'; ctx.fillRect(x, y0, 6, hgt);
  ctx.fillStyle = '#6e6255';
  for(let i = 0; i < hgt; i += 6) ctx.fillRect(x, y0 + i, 6, 1);
  ctx.fillStyle = '#8a2626'; ctx.fillRect(x, y0 + hgt - 3, 6, 3);     // kiss rail
  ctx.fillStyle = '#c9a24b'; ctx.fillRect(x, y0 + hgt - 3, 6, 1);
}

function drawProjector(ctx, p, cx, cy){
  const x = p.tx*TILE - cx, y = p.ty*TILE - cy;
  if(x < -30 || x > VIEW_W + 30) return;
  ctx.fillStyle = '#20242a'; ctx.fillRect(x, y + 6, 3, 10);           // wall arm
  ctx.fillStyle = '#31353c'; ctx.fillRect(x, y, 14, 8);               // body
  ctx.fillStyle = '#454b54'; ctx.fillRect(x, y, 14, 1);
  ctx.fillStyle = '#111';    ctx.fillRect(x + 3, y + 2, 4, 4);        // reel shadow
  ctx.fillStyle = '#ffe9b8'; ctx.fillRect(x + 13, y + 3, 2, 3);       // hot lens
}

/* ---------------- MOTHLIGHT ----------------
   Brakhage, 1963: moth wings, petals and grass pressed onto clear
   film. Bright white screen; brown/ochre organic silhouettes that
   change several times a second; dense clusters; near-blank frames.
   Everything is a pure function of (frame>>2, i) — no randomness. */
function drawMothlight(ctx, p, cx, cy){
  const x = p.x0*TILE - cx, y = p.y0*TILE - cy;
  const w = (p.x1 - p.x0 + 1)*TILE, hgt = (p.y1 - p.y0 + 1)*TILE;
  if(x + w < -20 || x > VIEW_W + 20) return;

  const fr = frame >> 2;                          // ~15 changes/second

  /* screen surround + white field (flickering print brightness) */
  ctx.fillStyle = '#0c0a09'; ctx.fillRect(x - 3, y - 3, w + 6, hgt + 6);
  ctx.fillStyle = IPAL.screenWhite; ctx.fillRect(x, y, w, hgt);
  const dim = (h32(fr, 3)%5)/5 * 0.10;
  if(dim > 0){ ctx.fillStyle = `rgba(60,40,20,${dim})`; ctx.fillRect(x, y, w, hgt); }

  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, hgt); ctx.clip();

  /* how busy is this frame of the print? */
  let n = 5 + h32(fr, 7)%10;
  if(h32(fr, 11)%6 === 0) n = h32(fr, 13)%3;      // near-blank flash
  else if(h32(fr, 17)%5 === 0) n += 18;           // dense cluster

  for(let i = 0; i < n; i++){
    const px = x + h32(fr, i*3 + 1)%w;
    const py = y + h32(fr, i*3 + 2)%hgt;
    const kind = h32(fr, i*3 + 3)%4;
    const rot = (h32(fr, i*5 + 4)%628)/100;
    const sc = 0.6 + (h32(fr, i*7 + 5)%10)/10;
    ctx.fillStyle = OCHRES[h32(fr, i*11 + 6)%OCHRES.length];
    ctx.globalAlpha = 0.30 + (h32(fr, i*13 + 8)%30)/100;
    ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.scale(sc, sc);
    if(kind <= 1){                                // moth wing pair (dominant)
      const ochre = ctx.fillStyle;
      /* forewings: broad lobes swept up and outward */
      ctx.beginPath(); ctx.ellipse(-5, -1, 7, 4, 0.6, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse( 5, -1, 7, 4, -0.6, 0, 7); ctx.fill();
      /* hindwings: smaller lobes tucked behind */
      ctx.beginPath(); ctx.ellipse(-3.5, 3, 4, 2.6, 0.9, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse( 3.5, 3, 4, 2.6, -0.9, 0, 7); ctx.fill();
      /* veins radiating from the wing roots (the pressed-wing signature) */
      ctx.strokeStyle = 'rgba(74,52,28,0.5)'; ctx.lineWidth = 0.7;
      for(let v = 0; v < 4; v++){
        const a = 0.2 + v*0.3;
        ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(-1 - Math.cos(a)*10, 1 - Math.sin(a)*6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( 1, 0); ctx.lineTo( 1 + Math.cos(a)*10, 1 - Math.sin(a)*6); ctx.stroke();
      }
      /* scalloped fringe: nick the outer rims back to screen white */
      ctx.fillStyle = IPAL.screenWhite;
      for(let e = 0; e < 3; e++){
        ctx.fillRect(-11.5 + (h32(fr, i*17 + e)%3), -3.5 + e*2.4, 1.5, 1.5);
        ctx.fillRect(  10 - (h32(fr, i*19 + e)%3), -3.5 + e*2.4, 1.5, 1.5);
      }
      /* the odd eyespot on the forewings */
      if(h32(fr, i*23 + 9)%3 === 0){
        ctx.fillStyle = 'rgba(60,38,20,0.55)';
        ctx.beginPath(); ctx.ellipse(-5, -1.5, 1.6, 1.2, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse( 5, -1.5, 1.6, 1.2, 0, 0, 7); ctx.fill();
      }
      /* furred body + antennae */
      ctx.fillStyle = ochre;
      ctx.fillRect(-1, -3, 2, 7);
      ctx.strokeStyle = 'rgba(60,38,20,0.6)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(0,-3); ctx.lineTo(-2.5,-6.5); ctx.moveTo(0,-3); ctx.lineTo(2.5,-6.5); ctx.stroke();
    }else if(kind === 2){                         // petal
      ctx.beginPath(); ctx.ellipse(0, 0, 3, 6, 0, 0, 7); ctx.fill();
    }else if(h32(fr, i*29 + 10)%2 === 0){         // grass blade
      ctx.fillRect(-1, -9, 1.5, 18);
      ctx.fillRect(0.5, -7, 1, 12);
    }else{                                        // seed specks
      ctx.fillRect(-3, -1, 2, 2); ctx.fillRect(1, 1, 2, 2); ctx.fillRect(0, -3, 1, 1);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  /* vertical film-weave scratch */
  const wx = x + h32(fr, 99)%w;
  ctx.fillStyle = 'rgba(80,60,30,0.10)'; ctx.fillRect(wx, y, 1, hgt);
  ctx.restore();

  /* light spilling off the screen onto the front rows */
  const spill = ctx.createRadialGradient(x + w/2, y + hgt/2, 4, x + w/2, y + hgt/2, w*1.4);
  const sa = 0.10 + (h32(fr, 21)%10)/100;
  spill.addColorStop(0, `rgba(244,238,225,${sa})`); spill.addColorStop(1, 'rgba(244,238,225,0)');
  ctx.fillStyle = spill;
  ctx.fillRect(x - w, y - hgt, w*3, hgt*3);
}

/* The MOTHLIGHT one-sheet outside Cinema 1: cream field, pressed
   moth-wing pairs in sepia, stacked title lettering. Static — it's
   a poster, not the film. */
function drawPoster(ctx, p, cx, cy){
  const x = p.x0*TILE - cx, y = p.y0*TILE - cy;
  const w = (p.x1 - p.x0 + 1)*TILE, h = (p.y1 - p.y0 + 1)*TILE;
  if(x + w < -10 || x > VIEW_W + 10) return;
  ctx.fillStyle = '#141110'; ctx.fillRect(x-2, y-2, w+4, h+4);      // frame
  ctx.fillStyle = '#2b241d'; ctx.fillRect(x-2, y+h+1, w+4, 1);      // drop shadow
  ctx.fillStyle = '#efe8d8'; ctx.fillRect(x, y, w, h);              // the sheet
  /* pressed wing pairs, fixed composition */
  const wing = (px, py, s, col, a) => {
    ctx.globalAlpha = a; ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(px-3*s, py, 4*s, 2.4*s,  0.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px+3*s, py, 4*s, 2.4*s, -0.5, 0, 7); ctx.fill();
    ctx.fillRect(px-0.5*s, py-1.5*s, s, 4*s);
    ctx.globalAlpha = 1;
  };
  wing(x + w*0.30, y + 9,  1.1, '#b98a3c', 0.55);
  wing(x + w*0.72, y + 15, 0.8, '#7d5a33', 0.45);
  wing(x + w*0.50, y + 22, 1.4, '#8a6a3a', 0.50);
  /* title, stacked to fit the sheet */
  ctx.fillStyle = '#3b2a1a'; ctx.font = '7px monospace';
  ctx.fillText('MOTH',  x + 4, y + h - 20);
  ctx.fillText('LIGHT', x + 4, y + h - 12);
  ctx.fillStyle = '#8a6a3a';
  ctx.fillText('1963', x + 7, y + h - 4);
  /* NOW SHOWING strip */
  ctx.fillStyle = '#c46a1e'; ctx.fillRect(x, y - 6, w, 5);
  ctx.fillStyle = '#1a1410'; ctx.font = '7px monospace';
  ctx.fillText('NOW SHOWING', x + 1, y - 1);
}

/* ================================================================
   OVERLAY — after the player: beam, gloom, pickup card
   ================================================================ */
export function drawInteriorOverlay(ctx, cx, cy, P){
  const room = level.currentRoom();

  /* projector beam over everything (the player silhouettes in it) */
  const proj = (room.props || []).find(p => p.type === 'projector');
  const scr  = (room.props || []).find(p => p.type === 'screen');
  if(proj && scr){
    const lx = proj.tx*TILE - cx + 15, ly = proj.ty*TILE - cy + 4;
    const sxp = scr.x0*TILE - cx, sy0 = scr.y0*TILE - cy, sy1 = (scr.y1+1)*TILE - cy;
    if(!(sxp < -VIEW_W && lx < -VIEW_W) && lx < VIEW_W + 700){
      ctx.beginPath();
      ctx.moveTo(lx, ly - 1); ctx.lineTo(sxp, sy0); ctx.lineTo(sxp, sy1); ctx.lineTo(lx, ly + 2);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,244,214,0.07)'; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(lx, ly); ctx.lineTo(sxp, sy0 + (sy1-sy0)*0.3); ctx.lineTo(sxp, sy0 + (sy1-sy0)*0.5); ctx.closePath();
      ctx.fillStyle = 'rgba(255,244,214,0.05)'; ctx.fill();
      /* dust drifting through the beam (deterministic) */
      ctx.fillStyle = 'rgba(255,244,214,0.35)';
      for(let i = 0; i < 12; i++){
        const t = ((frame*0.6 + i*127) % 900)/900;
        const bx = lx + (sxp - lx)*t;
        const by = ly + (sy0 + (sy1-sy0)*((i*53%40)/40) - ly)*t + Math.sin(frame*0.05 + i)*2;
        if(bx > -2 && bx < VIEW_W + 2) ctx.fillRect(bx, by, 1, 1);
      }
    }
  }

  /* interior gloom: heavier vignette than daylight */
  const vig = ctx.createRadialGradient(VIEW_W/2, VIEW_H/2, 70, VIEW_W/2, VIEW_H/2, 220);
  vig.addColorStop(0, 'rgba(8,6,4,0)'); vig.addColorStop(1, 'rgba(8,6,4,0.38)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  /* the moment card: DASH acquired */
  if(P.dashNote > 0){
    const a = Math.min(1, P.dashNote > 240 ? (300 - P.dashNote)/24 : P.dashNote/60);
    ctx.globalAlpha = a;
    const wD = 134, hD = 26, xD = (VIEW_W - wD)/2, yD = 34;
    ctx.fillStyle = 'rgba(16,12,8,0.88)'; ctx.fillRect(xD, yD, wD, hD);
    ctx.fillStyle = IPAL.line; ctx.fillRect(xD, yD, wD, 1); ctx.fillRect(xD, yD + hD - 1, wD, 1);
    ctx.font = '7px monospace';
    ctx.fillStyle = IPAL.line;   ctx.fillText('DASH', xD + 58, yD + 10);
    ctx.fillStyle = '#d8cdb8';   ctx.fillText('X / K · refreshed on landing', xD + 7, yD + 20);
    ctx.globalAlpha = 1;
  }
}
