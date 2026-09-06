/* Smooth camera with facing lookahead, clamped to room bounds. */
import { TILE } from './level.js';
import * as level from './level.js';

export const VIEW_W = 320, VIEW_H = 180;

export const cam = { x: 0, y: 0 };

export function stepCamera(P){
  const targetX = P.x + P.w/2 - VIEW_W/2 + P.facing*24;
  const targetY = P.y + P.h/2 - VIEW_H/2;
  cam.x += (targetX - cam.x)*0.08;
  cam.y += (targetY - cam.y)*0.12;
  cam.x = Math.max(0, Math.min(level.ROOM_W*TILE - VIEW_W, cam.x));
  cam.y = Math.max(0, Math.min(level.ROOM_H*TILE - VIEW_H, cam.y));
}
