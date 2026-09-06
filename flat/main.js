// THE BARBICAN · flat interior — glue.
import { createEngine } from './engine.js';
import { scene } from './scene.js';

const canvas = document.getElementById('c');
const engine = createEngine(canvas, scene);
engine.start();

// Debug handle (used by tools/tests; harmless in play).
window.__flat = engine;
