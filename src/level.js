/* Tile data and collision queries for the current room. */
export const TILE = 8;

let room = null;
let rows = [];                                   // mutable copy — hoardings break
export let ROOM_W = 0;
export let ROOM_H = 0;
export let spawn = { x: 16, y: 140 };

export function loadRoom(r){
  room = r;
  rows = r.tiles.slice();                        // fresh copy resets broken tiles
  ROOM_W = Math.max(...rows.map(row => row.length));
  ROOM_H = rows.length;
  spawn = { x: 16, y: 140 };                     // fallback
  for(let y = 0; y < ROOM_H; y++){
    const x = rows[y].indexOf('P');
    if(x >= 0){ spawn = { x: x*TILE, y: y*TILE }; break; }
  }
}

export function currentRoom(){ return room; }

/* is this pixel position inside one of the room's interior volumes? */
export function interiorAt(x, y){
  const tx = x/TILE, ty = y/TILE;
  for(const [x0,y0,x1,y1] of (room.interiors || []))
    if(tx >= x0 && tx <= x1+1 && ty >= y0 && ty <= y1+1) return true;
  return false;
}

/* remove one tile (pickups being collected) */
export function clearTile(tx, ty){ breakTile(tx, ty); }

export function tileAt(tx, ty){
  if(tx < 0 || tx >= ROOM_W) return '#';         // solid walls at room edges
  if(ty < 0) return ' ';
  if(ty >= ROOM_H) return ' ';                   // open bottom = pits
  return (rows[ty][tx] || ' ');
}

export function solidAt(tx, ty){
  const t = tileAt(tx, ty);
  return t === '#' || t === '=' || t === 'H' || t === '-' || t === 'T' ||
         t === '<' || t === '>' || t === 'F' || t === 'V';
}

/* does the AABB overlap any tile of the given character? (water, benches) */
export function overlapsChar(x, y, w, h, ch){
  const x0 = Math.floor(x/TILE), x1 = Math.floor((x+w-0.01)/TILE);
  const y0 = Math.floor(y/TILE), y1 = Math.floor((y+h-0.01)/TILE);
  for(let ty = y0; ty <= y1; ty++)
    for(let tx = x0; tx <= x1; tx++)
      if(tileAt(tx, ty) === ch) return true;
  return false;
}

function breakTile(tx, ty){
  rows[ty] = rows[ty].slice(0, tx) + ' ' + rows[ty].slice(tx+1);
}

/* Break every hoarding tile in the AABB; a hit panel breaks its whole
   vertically-contiguous column (one hoarding sheet, not one tile).
   Returns true if anything broke. */
export function breakHoardingAABB(x, y, w, h){
  const x0 = Math.floor(x/TILE), x1 = Math.floor((x+w-0.01)/TILE);
  const y0 = Math.floor(y/TILE), y1 = Math.floor((y+h-0.01)/TILE);
  let broke = false;
  for(let ty = y0; ty <= y1; ty++)
    for(let tx = x0; tx <= x1; tx++)
      if(tileAt(tx, ty) === 'H'){
        let top = ty; while(tileAt(tx, top-1) === 'H') top--;
        for(let by = top; tileAt(tx, by) === 'H'; by++) breakTile(tx, by);
        broke = true;
      }
  return broke;
}

/* AABB (pixel space, y down) vs solid tiles */
export function overlapsSolid(x, y, w, h){
  const x0 = Math.floor(x/TILE), x1 = Math.floor((x+w-0.01)/TILE);
  const y0 = Math.floor(y/TILE), y1 = Math.floor((y+h-0.01)/TILE);
  for(let ty = y0; ty <= y1; ty++)
    for(let tx = x0; tx <= x1; tx++)
      if(solidAt(tx, ty)) return true;
  return false;
}
