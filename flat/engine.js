// THE BARBICAN · flat interior — tiny first-person WebGL engine.
// Vanilla ES module, raw WebGL1 (WebGL2 works too — only GL1 features used).
// Renders colored AABBs at 320×180 with directional sun + ambient + haze fog.

// ------------------------------------------------------------------ utilities

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

function normalize(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function perspective(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  // column-major
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}

// FPS camera basis. yaw 0 faces -Z; +yaw turns right.
function cameraBasis(yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  return {
    fwd: [sy * cp, sp, -cy * cp],
    right: [cy, 0, sy],
    up: [-sy * sp, cp, cy * sp],
  };
}

function viewMatrix(eye, basis) {
  const { right: r, up: u, fwd: f } = basis;
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return new Float32Array([
    r[0], u[0], -f[0], 0,
    r[1], u[1], -f[1], 0,
    r[2], u[2], -f[2], 0,
    -dot(r, eye), -dot(u, eye), dot(f, eye), 1,
  ]);
}

// -------------------------------------------------------------------- shaders

const SCENE_VS = `
attribute vec3 aPos;
attribute vec3 aNor;
attribute vec3 aCol;
uniform mat4 uProj;
uniform mat4 uView;
uniform vec3 uSun;       // direction toward the sun
uniform float uAmb;
uniform float uSunI;
varying vec3 vCol;
varying float vDist;
void main() {
  vec4 vp = uView * vec4(aPos, 1.0);
  gl_Position = uProj * vp;
  float sun = max(dot(aNor, uSun), 0.0);
  float bounce = max(dot(aNor, vec3(0.0, -1.0, 0.25)), 0.0) * 0.10; // floor bounce
  vCol = aCol * (uAmb + uSunI * sun + bounce);
  vDist = -vp.z;
}`;

const SCENE_FS = `
precision mediump float;
varying vec3 vCol;
varying float vDist;
uniform vec3 uHaze;
void main() {
  float fog = clamp((vDist - 12.0) / 60.0, 0.0, 0.85);
  gl_FragColor = vec4(mix(vCol, uHaze, fog), 1.0);
}`;

const SKY_VS = `
attribute vec2 aPos;
varying vec2 vNdc;
void main() {
  vNdc = aPos;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const SKY_FS = `
precision mediump float;
varying vec2 vNdc;
uniform vec3 uFwd;
uniform vec3 uRight;
uniform vec3 uUp;
uniform float uTanX;
uniform float uTanY;
uniform vec3 uSun;
uniform vec3 uZenith;
uniform vec3 uHorizon;
void main() {
  vec3 dir = normalize(uFwd + uRight * vNdc.x * uTanX + uUp * vNdc.y * uTanY);
  float t = clamp(dir.y * 1.4 + 0.22, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, t);
  float d = max(dot(dir, uSun), 0.0);
  col += vec3(1.0, 0.95, 0.8) * pow(d, 300.0) * 0.9;   // sun disc
  col += vec3(1.0, 0.97, 0.85) * pow(d, 8.0) * 0.10;   // haze glow
  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error('shader: ' + gl.getShaderInfoLog(s));
  }
  return s;
}

function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error('link: ' + gl.getProgramInfoLog(p));
  }
  return p;
}

// --------------------------------------------------------------- mesh builder

// Emit the 6 faces of an AABB as CCW-outward triangles with flat normals.
function buildMesh(boxes) {
  const verts = [];
  const push = (p, n, c) => verts.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2]);
  const quad = (v0, v1, v2, v3, n, c) => {
    push(v0, n, c); push(v1, n, c); push(v2, n, c);
    push(v0, n, c); push(v2, n, c); push(v3, n, c);
  };
  for (const entry of boxes) {
    const [a, b, c0, d, e, f] = entry.box;
    const col = hexToRgb(entry.color || '#cccccc');
    quad([d, b, c0], [d, e, c0], [d, e, f], [d, b, f], [1, 0, 0], col);    // +X
    quad([a, b, f], [a, e, f], [a, e, c0], [a, b, c0], [-1, 0, 0], col);   // -X
    quad([a, e, f], [d, e, f], [d, e, c0], [a, e, c0], [0, 1, 0], col);    // +Y
    quad([a, b, c0], [d, b, c0], [d, b, f], [a, b, f], [0, -1, 0], col);   // -Y
    quad([a, b, f], [d, b, f], [d, e, f], [a, e, f], [0, 0, 1], col);      // +Z
    quad([d, b, c0], [a, b, c0], [a, e, c0], [d, e, c0], [0, 0, -1], col); // -Z
  }
  return new Float32Array(verts);
}

// ------------------------------------------------------------------ collision

const PLAYER_RADIUS = 0.25;
const PLAYER_HEIGHT = 1.7;
const EYE_HEIGHT = 1.6;
const WALK_SPEED = 2.5; // m/s

// Move the player along one horizontal axis (0=x, 2=z) and push out of solids.
function moveAxis(pos, axis, delta, solids) {
  if (delta === 0) return;
  pos[axis] += delta;
  const r = PLAYER_RADIUS;
  for (const b of solids) {
    // skip boxes fully below step height or above the head
    if (b[4] <= 0.06 || b[1] >= PLAYER_HEIGHT) continue;
    if (pos[0] + r <= b[0] || pos[0] - r >= b[3]) continue;
    if (pos[2] + r <= b[2] || pos[2] - r >= b[5]) continue;
    if (delta > 0) pos[axis] = (axis === 0 ? b[0] : b[2]) - r;
    else pos[axis] = (axis === 0 ? b[3] : b[5]) + r;
  }
}

// --------------------------------------------------------------------- engine

export function createEngine(canvas, scene) {
  const gl = canvas.getContext('webgl', { antialias: false })
    || canvas.getContext('experimental-webgl', { antialias: false });
  if (!gl) throw new Error('WebGL not supported');

  // programs
  const sceneProg = program(gl, SCENE_VS, SCENE_FS);
  const skyProg = program(gl, SKY_VS, SKY_FS);
  const U = (p, n) => gl.getUniformLocation(p, n);
  const su = {
    proj: U(sceneProg, 'uProj'), view: U(sceneProg, 'uView'),
    sun: U(sceneProg, 'uSun'), amb: U(sceneProg, 'uAmb'),
    sunI: U(sceneProg, 'uSunI'), haze: U(sceneProg, 'uHaze'),
  };
  const ku = {
    fwd: U(skyProg, 'uFwd'), right: U(skyProg, 'uRight'), up: U(skyProg, 'uUp'),
    tanX: U(skyProg, 'uTanX'), tanY: U(skyProg, 'uTanY'), sun: U(skyProg, 'uSun'),
    zenith: U(skyProg, 'uZenith'), horizon: U(skyProg, 'uHorizon'),
  };

  // scene mesh
  const meshData = buildMesh(scene.boxes);
  const vertCount = meshData.length / 9;
  const meshBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, meshBuf);
  gl.bufferData(gl.ARRAY_BUFFER, meshData, gl.STATIC_DRAW);

  // sky fullscreen triangle
  const skyBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  // camera / projection
  const FOV_Y = 65 * Math.PI / 180;
  const aspect = canvas.width / canvas.height;
  const proj = perspective(FOV_Y, aspect, 0.05, 200);
  const tanY = Math.tan(FOV_Y / 2);
  const tanX = tanY * aspect;

  const sunDir = normalize(scene.sunDir);
  const zenith = hexToRgb(scene.sky.zenith);
  const horizon = hexToRgb(scene.sky.horizon);

  const solids = scene.boxes.filter((b) => b.solid !== false).map((b) => b.box);

  // player state
  const player = {
    pos: [...scene.spawn.pos],
    yaw: scene.spawn.yaw || 0,
    pitch: scene.spawn.pitch || 0,
  };

  // ------------------------------------------------------------------- input
  const keys = new Set();
  const KEYMAP = {
    KeyW: 'fwd', ArrowUp: 'fwd',
    KeyS: 'back', ArrowDown: 'back',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
  };
  window.addEventListener('keydown', (e) => {
    const k = KEYMAP[e.code];
    if (k) { keys.add(k); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
    const k = KEYMAP[e.code];
    if (k) keys.delete(k);
  });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('click', () => {
    if (document.pointerLockElement !== canvas) {
      try {
        const p = canvas.requestPointerLock();
        if (p && p.catch) p.catch(() => {}); // unavailable in some embeds
      } catch (_) { /* ignore */ }
    }
  });
  const SENS = 0.0035;
  const MAX_PITCH = 1.5;
  window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== canvas) return;
    player.yaw += e.movementX * SENS;
    player.pitch -= e.movementY * SENS;
    if (player.pitch > MAX_PITCH) player.pitch = MAX_PITCH;
    if (player.pitch < -MAX_PITCH) player.pitch = -MAX_PITCH;
  });

  // ------------------------------------------------------------------ update
  function update(dt) {
    let mx = 0, mz = 0; // local: mx = strafe right, mz = forward
    if (keys.has('fwd')) mz += 1;
    if (keys.has('back')) mz -= 1;
    if (keys.has('right')) mx += 1;
    if (keys.has('left')) mx -= 1;
    if (mx === 0 && mz === 0) return;
    const inv = 1 / Math.hypot(mx, mz);
    mx *= inv; mz *= inv;
    const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
    // forward on XZ = (sy, -cy); right = (cy, sy)
    const dx = (sy * mz + cy * mx) * WALK_SPEED * dt;
    const dz = (-cy * mz + sy * mx) * WALK_SPEED * dt;
    moveAxis(player.pos, 0, dx, solids);
    moveAxis(player.pos, 2, dz, solids);
  }

  // ------------------------------------------------------------------ render
  function render() {
    const basis = cameraBasis(player.yaw, player.pitch);
    const eye = [player.pos[0], player.pos[1] + EYE_HEIGHT, player.pos[2]];
    const view = viewMatrix(eye, basis);

    gl.viewport(0, 0, canvas.width, canvas.height);

    // sky (no depth)
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.useProgram(skyProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
    const skyPos = gl.getAttribLocation(skyProg, 'aPos');
    gl.enableVertexAttribArray(skyPos);
    gl.vertexAttribPointer(skyPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3fv(ku.fwd, basis.fwd);
    gl.uniform3fv(ku.right, basis.right);
    gl.uniform3fv(ku.up, basis.up);
    gl.uniform1f(ku.tanX, tanX);
    gl.uniform1f(ku.tanY, tanY);
    gl.uniform3fv(ku.sun, sunDir);
    gl.uniform3fv(ku.zenith, zenith);
    gl.uniform3fv(ku.horizon, horizon);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // scene
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(sceneProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, meshBuf);
    const stride = 9 * 4;
    const aPos = gl.getAttribLocation(sceneProg, 'aPos');
    const aNor = gl.getAttribLocation(sceneProg, 'aNor');
    const aCol = gl.getAttribLocation(sceneProg, 'aCol');
    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aNor);
    gl.enableVertexAttribArray(aCol);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, stride, 12);
    gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, stride, 24);
    gl.uniformMatrix4fv(su.proj, false, proj);
    gl.uniformMatrix4fv(su.view, false, view);
    gl.uniform3fv(su.sun, sunDir);
    gl.uniform1f(su.amb, scene.ambient);
    gl.uniform1f(su.sunI, scene.sunIntensity);
    gl.uniform3fv(su.haze, horizon);
    gl.drawArrays(gl.TRIANGLES, 0, vertCount);
  }

  // -------------------------------------------------------------------- loop
  let last = 0;
  let running = false;
  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 1 / 30); // delta-capped
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  return {
    player,
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    },
    stop() { running = false; },
  };
}
