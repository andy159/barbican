/* Keyboard state + edge-triggered debug/reset hooks. */
const keys = {};
let onDebugToggle = null;
let onReset = null;

export function bindInput({ debugToggle, reset }){
  onDebugToggle = debugToggle;
  onReset = reset;
}

addEventListener('keydown', e => {
  if(e.repeat) return;
  keys[e.code] = true;
  if(e.code === 'Backquote' && onDebugToggle) onDebugToggle();
  if(e.code === 'KeyR' && onReset) onReset();
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });

export const heldLeft  = () => keys['ArrowLeft']  || keys['KeyA'];
export const heldRight = () => keys['ArrowRight'] || keys['KeyD'];
export const heldUp    = () => keys['ArrowUp']    || keys['KeyW'];
export const heldDown  = () => keys['ArrowDown']  || keys['KeyS'];
export const heldJump  = () => keys['KeyZ'] || keys['KeyJ'] || keys['Space'];
export const heldDash  = () => keys['KeyX'] || keys['KeyK'];
export const heldBarge = () => keys['KeyC'] || keys['KeyL'];
