/* Tile data and collision queries for the current room. */
export const TILE = 8;

let room = null;
export let ROOM_W = 0;
export let ROOM_H = 0;
export let spawn = { x: 16, y: 140 };

export function loadRoom(r){
  room = r;
  ROOM_W = Math.max(...r.tiles.map(row => row.length));
  ROOM_H = r.tiles.length;
  spawn = { x: 16, y: 140 };                     // fallback
  for(let y = 0; y < ROOM_H; y++){
    const x = r.tiles[y].indexOf('P');
    if(x >= 0){ spawn = { x: x*TILE, y: y*TILE }; break; }
  }
}

export function currentRoom(){ return room; }

export function tileAt(tx, ty){
  if(tx < 0 || tx >= ROOM_W) return '#';         // solid walls at room edges
  if(ty < 0) return ' ';
  if(ty >= ROOM_H) return ' ';                   // open bottom = pits
  return (room.tiles[ty][tx] || ' ');
}

export function solidAt(tx, ty){
  const t = tileAt(tx, ty);
  return t === '#' || t === '=';
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
