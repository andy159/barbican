/* Opening cinematic — a skippable, real-time anime-style intro rendered
   on the game canvas before play begins.

   playIntro(canvas, onDone): runs the shot list below, then calls onDone
   exactly once. Any key or click skips the whole film instantly.

   Debug params (kept on purpose):
     ?shot=n        jump straight to shot n (1-based, see SHOTS order)
     &t=frames      offset into that shot
     &hold=1        freeze on that frame (for screenshots)

   All drawing is procedural and deterministic (no Math.random at runtime),
   fixed 60Hz step, and stays inside the game's established identity:
   warm Barbican concrete, hazy daylight, #f7c623 Yellow Line, and the
   small dark figure with the yellow scarf (drawn larger in close shots). */

const W = 320, H = 180, BAR = 22;               // 2.35:1 letterbox band

/* palette — mirrors src/render.js PAL (kept local; render doesn't export it) */
const P = {
  towerSun:'#a89a83', towerMid:'#948875', towerShade:'#6e6557',
  glaze:'#3a3d3c', glazeFar:'#7d7f7e', slabLight:'#c2b7a2',
  vault:'#e9e5da', vaultShade:'#b9b2a4',
  brick:'#8f5f48', brickDark:'#74492f', brickLight:'#a97a58',
  conc:'#8f8779', concDark:'#7a7266', concLight:'#d6cfc0',
  line:'#f7c623', scarf:'#ffd23e', scarfDark:'#e8b92e',
  ink:'#2f3440', inkDark:'#23262e', hair:'#2a2622', skin:'#d9a878',
  signOrange:'#d96c1e', signOrangeHi:'#ef8434',
};

const hash = (a,b) => (((a|0)*73856093 ^ (b|0)*19349663) >>> 0);
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

export function playIntro(canvas, onDone){
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  /* ---------- shared drawing helpers ---------- */

  /* The protagonist on the game's 8×14 grid, scalable for close shots.
     pose: 'stand' | 'walk0' | 'walk1'; look: -1 left, 0 fwd, 1 up;
     facing: 1 right, -1 left; scarfT drives the streaming tail. */
  function figure(x, y, s, { pose='stand', facing=1, look=0, scarfT=0, scarfLen=0 } = {}){
    const px = (gx,gy,ww,hh,c) => {
      if(facing < 0) gx = 8 - gx - ww;
      ctx.fillStyle = c;
      ctx.fillRect(x + gx*s, y + gy*s, ww*s, hh*s);
    };
    /* streaming scarf tail — segments trail behind with a slow wave */
    for(let i = 0; i < scarfLen; i++){
      const wob = Math.round(Math.sin(scarfT*0.22 + i*0.9));
      px(-1 - i, 6 + wob + (i>2 ? 1 : 0), 1, 2 - (i>3 ? 1 : 0),
         i%2 ? P.scarfDark : P.scarf);
    }
    px(0,6,1,3,P.scarfDark);                          // tail root
    const lu = look === 1 ? -1 : 0;                    // looking up lifts the head
    px(2,0+lu,4,1,P.hair);
    px(1,1+lu,6,2,P.hair);
    px(2,2+lu,5,3,P.skin);
    /* the eye slides with the look direction */
    const ex = look === -1 ? 2 : 5;
    px(ex,3+lu + (look===1 ? -1 : 0),1,1,'#14141a');
    px(1,5,6,2,P.scarf);
    px(1,7,6,4,P.ink);
    px(1,8,1,3,'#252a35');
    px(6,8,1,3,'#3a4152');
    if(pose === 'walk0'){
      px(1,11,2,3,P.inkDark); px(5,11,2,3,P.inkDark);
      px(1,13,2,1,'#1a1c22'); px(5,13,2,1,'#1a1c22');
    }else if(pose === 'walk1'){
      px(2,11,2,3,P.inkDark); px(4,11,2,3,P.inkDark);
      px(2,13,2,1,'#1a1c22'); px(4,13,2,1,'#1a1c22');
    }else{
      px(2,11,2,3,P.inkDark); px(4,11,2,3,P.inkDark);
      px(2,13,2,1,'#1a1c22'); px(4,13,2,1,'#1a1c22');
    }
  }

  /* A looming tower for the low-angle shot: serrated balcony bands,
     hard sun/shade split, bladed crown. y0 = where the crown sits. */
  function bigTower(x, y0, w, seed, muted){
    x = Math.round(x); y0 = Math.round(y0);
    const sun   = muted ? '#b5aa96' : P.towerSun;
    const mid   = muted ? '#a29785' : P.towerMid;
    const shade = muted ? '#8a8071' : '#57503f';
    /* crown blades, tallest off-center */
    const blades = [[0, 14+(seed*3)%7, Math.round(w*0.2)],
                    [Math.round(w*0.42), 22+(seed*5)%8, Math.round(w*0.22)],
                    [w-Math.round(w*0.18), 10+(seed*7)%5, Math.round(w*0.18)]];
    for(const [bx,bh,bw] of blades){
      ctx.fillStyle = mid;  ctx.fillRect(x+bx, y0-bh, bw, bh);
      ctx.fillStyle = sun;  ctx.fillRect(x+bx, y0-bh, 2, bh);
    }
    ctx.fillStyle = mid;   ctx.fillRect(x, y0, w, H-y0+4);
    ctx.fillStyle = sun;   ctx.fillRect(x, y0, 3, H-y0+4);
    ctx.fillStyle = shade; ctx.fillRect(x+w-4, y0, 4, H-y0+4);
    /* balcony bands every 9px: glazing, slab lip, sawtooth underside */
    for(let fy = y0+6; fy < H+8; fy += 9){
      ctx.fillStyle = muted ? '#8d8d89' : P.glaze;
      ctx.fillRect(x+3, fy, w-7, 3);
      ctx.fillStyle = muted ? '#c9c0ad' : P.slabLight;
      ctx.fillRect(x+1, fy+3, w-3, 2);
      ctx.fillStyle = shade;
      for(let fx = 2+(seed%2)*2; fx < w-4; fx += 4) ctx.fillRect(x+fx, fy+5, 2, 2);
      ctx.fillRect(x, fy+4, 2, 2);                 // corner zigzag, chunky
      ctx.fillStyle = sun; ctx.fillRect(x+w-2, fy+2, 2, 2);
      /* the odd flower box spilling colour */
      const h = hash(seed*31+fx0(fy), fy) % 13;
      if(!muted && h < 2){
        ctx.fillStyle = ['#e0568a','#d94f4f','#f2a0c0'][h===0?0:(fy%3===0?1:2)];
        ctx.fillRect(x + 4 + (hash(fy,seed)% (w-10)), fy+2, 2, 2);
      }
    }
    function fx0(v){ return v*7; }
  }

  /* Orange estate wayfinding plate (real-estate style: white on orange). */
  function signPlate(cx, cy, text, arrow, rot){
    const wTxt = text.length*7.3;
    const w = Math.max(96, wTxt + 40), h = 30;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.fillStyle = 'rgba(30,24,18,0.55)';                    // drop shadow
    ctx.fillRect(-w/2+4, -h/2+5, w, h);
    ctx.fillStyle = P.signOrange;  ctx.fillRect(-w/2, -h/2, w, h);
    ctx.fillStyle = P.signOrangeHi;ctx.fillRect(-w/2, -h/2, w, 2);
    ctx.fillStyle = '#a44f12';     ctx.fillRect(-w/2, h/2-2, w, 2);
    ctx.fillStyle = '#fdf6ea';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillText(text, -w/2 + 10, 4);
    arrowGlyph(w/2 - 20, 0, arrow, '#fdf6ea');
    ctx.restore();
  }

  /* chunky pixel arrows: 'ur' ↗  'l' ←  'r' →  'd' ↓ */
  function arrowGlyph(x, y, dir, c){
    ctx.fillStyle = c;
    const R = (a,b,w2,h2) => ctx.fillRect(x+a, y+b, w2, h2);
    if(dir === 'r'){ R(-6,-1,12,2); R(2,-4,2,2); R(4,-2,2,2); R(2,2,2,2); R(4,0,2,2); }
    else if(dir === 'l'){ R(-6,-1,12,2); R(-4,-4,2,2); R(-6,-2,2,2); R(-4,2,2,2); R(-6,0,2,2); }
    else if(dir === 'd'){ R(-1,-6,2,12); R(-4,2,2,2); R(-2,4,2,2); R(2,2,2,2); R(0,4,2,2); }
    else { /* up-right */ R(-5,3,2,2); R(-3,1,2,2); R(-1,-1,2,2); R(1,-3,2,2); R(3,-5,2,2);
           R(-1,-5,6,2); R(3,-5,2,6); }
  }

  /* brick paving cell (top-down), stable per world coordinate */
  function brickCell(sx, sy, wx, wy){
    const h = hash(wx, wy) % 16;
    ctx.fillStyle = h < 2 ? P.brickLight : h < 4 ? P.brickDark : P.brick;
    ctx.fillRect(sx, sy, 16, 8);
    ctx.fillStyle = P.brickDark;
    ctx.fillRect(sx, sy+7, 16, 1);
    ctx.fillRect(sx + ((wy%2) ? 4 : 11), sy, 1, 7);
  }

  const mono = s => `${s}px "Courier New", monospace`;

  /* chat-bubble renderer shared by shot 2 and the shot-7 phone inset.
     lines: array of arrays of [text, color] spans. */
  function bubble(x, y, lines, fontPx, pad, maxTextW){
    const lh = fontPx + 2;
    const w = maxTextW + pad*2, h = lines.length*lh + pad*2 - 1;
    ctx.fillStyle = '#2a3140';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#232938';
    ctx.fillRect(x, y+h-1, w, 1); ctx.fillRect(x, y, 1, h);   // soft edge
    ctx.font = mono(fontPx);
    lines.forEach((spans, i) => {
      let tx = x + pad;
      for(const [txt, col] of spans){
        ctx.fillStyle = col || '#e8ecf5';
        ctx.fillText(txt, tx, y + pad + i*lh + fontPx - 1);
        tx += ctx.measureText(txt).width;
      }
    });
    return h;
  }

  function typingDots(x, y, t){
    ctx.fillStyle = '#2a3140'; ctx.fillRect(x, y, 24, 10);
    const on = Math.floor(t/10) % 3;
    for(let k = 0; k < 3; k++){
      ctx.fillStyle = k === on ? '#c9d2e8' : '#5a637a';
      ctx.fillRect(x + 5 + k*6, y + 4, 2, 2);
    }
  }

  function martini(x, y, c){
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 7, 1); ctx.fillRect(x+1, y+1, 5, 1);
    ctx.fillRect(x+2, y+2, 3, 1); ctx.fillRect(x+3, y+3, 1, 2);
    ctx.fillRect(x+2, y+5, 3, 1);
    ctx.fillStyle = '#8fbf5a'; ctx.fillRect(x+2, y+1, 1, 1);   // the olive
  }

  function signalBars(x, y, n, c, cOff){
    for(let k = 0; k < 4; k++){
      ctx.fillStyle = k < n ? c : cOff;
      ctx.fillRect(x + k*3, y + 6 - (k+1), 2, k+2);
    }
  }

  /* ---------- the shot list ---------- */

  const CHAT = [
    { at: 130, lines: [[['you at the barbican', 0]], [['yet?', 0]]] },
    { at: 300, lines: [[['meet me in the', 0]], [['members’ bar ', 0], ['GLASS', 1]]] },
    { at: 500, lines: [[['it’s easy to find.', 0]],
                       [['just follow the', 0]],
                       [['yellow line', 2], [' :)', 0]]] },
  ];

  function drawChatScreen(t, x0, y0, w){
    /* screen chrome */
    ctx.fillStyle = '#0f1319'; ctx.fillRect(x0, y0, w, H);
    ctx.font = mono(7); ctx.fillStyle = '#7e8aa8';
    ctx.fillText('17:42', x0+6, y0+10);
    signalBars(x0+w-30, y0+3, 4, '#aeb8cc', '#3a4152');
    ctx.fillStyle = '#3a4152'; ctx.fillRect(x0+w-14, y0+4, 9, 5);
    ctx.fillStyle = '#9fe08a'; ctx.fillRect(x0+w-13, y0+5, 6, 3);   // battery
    /* contact header */
    ctx.fillStyle = '#1a2030'; ctx.fillRect(x0, y0+14, w, 16);
    ctx.fillStyle = '#c2477e'; ctx.fillRect(x0+6, y0+17, 10, 10);   // avatar
    ctx.fillStyle = '#f2e6d8'; ctx.fillRect(x0+9, y0+19, 4, 2);
    ctx.fillRect(x0+8, y0+22, 6, 4);
    ctx.fillStyle = '#e8ecf5'; ctx.font = mono(8);
    ctx.fillText('andy', x0+21, y0+25);
    ctx.fillStyle = '#5a637a'; ctx.font = mono(6);
    ctx.fillText('online', x0+46, y0+25);
    ctx.fillStyle = '#242c3c'; ctx.fillRect(x0, y0+30, w, 1);
    /* date stamp */
    ctx.fillStyle = '#5a637a'; ctx.font = mono(6);
    ctx.fillText('— today —', x0 + w/2 - 16, y0+41);

    /* the thread */
    const colFor = c => c === 1 ? null : c === 2 ? P.line : '#e8ecf5';
    let y = y0 + 48;
    let lastBottom = y;
    for(const m of CHAT){
      if(t >= m.at){
        const flash = t - m.at < 3;
        const lines = m.lines.map(spans => spans.map(([txt,c]) =>
          [txt, flash ? '#ffffff' : (c === 1 ? '#e8ecf5' : colFor(c))]));
        /* strip the GLASS placeholder to text width, draw martini after */
        let maxw = 0;
        ctx.font = mono(7);
        for(const spans of m.lines){
          let lw = 0;
          for(const [txt,c] of spans) lw += c === 1 ? 10 : ctx.measureText(txt).width;
          maxw = Math.max(maxw, lw);
        }
        const drawLines = lines.map(spans => spans.filter(([txt]) => txt !== 'GLASS'));
        const h = bubble(x0+8, y, drawLines, 7, 4, Math.ceil(maxw));
        /* martini glyph where the placeholder sat */
        if(m === CHAT[1] && t >= m.at){
          ctx.font = mono(7);
          const pre = ctx.measureText('members’ bar ').width;
          martini(x0+8+4+pre, y + 4 + 9, flash ? '#ffffff' : '#c9d2e8');
        }
        lastBottom = y + h;
        y += h + 6;
      }
    }
    /* typing dots before each arrival */
    const next = CHAT.find(m => t < m.at);
    if(next && t >= next.at - 92 && t < next.at - 6) typingDots(x0+8, y, t);
    return lastBottom;
  }

  const SHOTS = [

  /* 1 ─ black; the phone buzzes twice, face-down light leak */
  { name:'buzz', dur: 90, draw(t){
    ctx.fillStyle = '#050507'; ctx.fillRect(0,0,W,H);
    const buzzing = (t >= 24 && t < 36) || (t >= 54 && t < 66);
    const jx = buzzing ? (t%2 ? 1 : -1) : 0;
    /* the phone, a dark slab barely there */
    ctx.fillStyle = '#101014';
    ctx.fillRect(146+jx, 76, 28, 46);
    ctx.fillStyle = '#1b1b22';
    ctx.fillRect(147+jx, 77, 26, 1);
    if(buzzing){
      ctx.fillStyle = 'rgba(242,196,106,0.16)';
      ctx.fillRect(138+jx, 68, 44, 62);
      ctx.fillStyle = 'rgba(242,196,106,0.5)';
      ctx.fillRect(148+jx, 78, 24, 42);
      ctx.fillStyle = 'rgba(255,244,214,0.85)';
      ctx.fillRect(150+jx, 80, 20, 3);                 // banner lighting up
      /* bzzt ticks */
      ctx.fillStyle = 'rgba(232,236,245,0.4)';
      ctx.fillRect(132, 84 + (t%4), 6, 1); ctx.fillRect(182, 96 - (t%4), 6, 1);
      ctx.fillRect(136, 108 - (t%4), 4, 1); ctx.fillRect(180, 76 + (t%4), 4, 1);
    }
  }},

  /* 2 ─ the phone screen fills the frame; the thread plays out */
  { name:'phone', dur: 780, draw(t){
    /* out-of-focus golden room behind */
    const g = ctx.createLinearGradient(0,0,W,H);
    g.addColorStop(0,'#54422c'); g.addColorStop(0.55,'#39301f'); g.addColorStop(1,'#201a12');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = 'rgba(242,196,106,0.10)';
    ctx.fillRect(0, 30, W, 22); ctx.fillRect(0, 84, W, 10);   // soft bokeh bands

    /* slow push-in on the last message */
    const z = 1 + clamp01((t-560)/220)*0.07;
    ctx.save();
    ctx.translate(160, 120); ctx.scale(z, z); ctx.translate(-160, -120);

    /* the phone: portrait, slightly right of center */
    const px0 = 104, pw = 116;
    ctx.fillStyle = '#14161c'; ctx.fillRect(px0-5, 6, pw+10, H-12+40);
    drawChatScreen(t, px0, 12, pw);
    /* golden-afternoon glint running the right bezel edge */
    const gy = 60 + Math.sin(t*0.006)*36;
    const glint = ctx.createLinearGradient(0, gy-42, 0, gy+42);
    glint.addColorStop(0,'rgba(242,196,106,0)');
    glint.addColorStop(0.5,'rgba(255,224,150,0.95)');
    glint.addColorStop(1,'rgba(242,196,106,0)');
    ctx.fillStyle = glint; ctx.fillRect(px0+pw+3, 10, 2, H-20);
    ctx.fillStyle = 'rgba(255,244,214,0.5)'; ctx.fillRect(px0+pw+3, gy-2, 2, 4);
    ctx.restore();
  }},

  /* 3 ─ HARD CUT low angle: the towers loom, slow upward pan */
  { name:'loom', dur: 360, draw(t){
    const pan = t*0.075;                       // camera cranes up ⇒ world slides down
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#79a4c9'); g.addColorStop(0.55,'#c8d4da'); g.addColorStop(1,'#f0e0bd');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    /* sun glare upper left, catching the lens */
    const sun = ctx.createRadialGradient(52,28,4,52,28,80);
    sun.addColorStop(0,'rgba(255,250,230,0.95)'); sun.addColorStop(1,'rgba(255,250,230,0)');
    ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(52,28,80,0,7); ctx.fill();

    /* streaking clouds — the anime sky */
    for(let i = 0; i < 8; i++){
      const cy = 14 + i*17 + pan*0.35;
      const cx = ((i*61 + t*(0.5 + i*0.09)) % (W+140)) - 70;
      ctx.fillStyle = `rgba(255,255,255,${0.85 - i*0.06})`;
      ctx.fillRect(W - cx - 90, cy, 70 + i*8, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(W - cx - 40, cy+3, 90 + i*6, 1);
      ctx.fillRect(W - cx - 130, cy+1, 30, 1);
    }

    /* far tower — hazed, slower parallax */
    bigTower(128 - 4, 40 + pan*0.45, 56, 2, true);
    ctx.fillStyle = 'rgba(205,216,220,0.45)'; ctx.fillRect(0,0,W,H);
    /* near towers — hard-lit, faster */
    bigTower(-26, 6 + pan*0.95, 78, 1, false);
    bigTower(212, 26 + pan*0.95, 96, 3, false);

    /* crisp streaking clouds IN FRONT — the towers pierce the sky */
    for(let i = 0; i < 3; i++){
      const cy = 34 + i*36 + pan*0.6;
      const cx = ((i*97 + t*(0.9 + i*0.22)) % (W+220)) - 110;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(W - cx - 120, cy, 110, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(W - cx - 55, cy+2, 80, 1);
      ctx.fillRect(W - cx - 160, cy+1, 34, 1);
    }

    /* looming weight: the frame darkens toward the ground */
    const loom = ctx.createLinearGradient(0, 84, 0, H);
    loom.addColorStop(0,'rgba(48,40,32,0)'); loom.addColorStop(1,'rgba(48,40,32,0.4)');
    ctx.fillStyle = loom; ctx.fillRect(0, 84, W, H-84);

    /* podium ground + long shadow raking across */
    const gy2 = 150 + pan*0.95;
    ctx.fillStyle = P.concDark; ctx.fillRect(0, gy2, W, H-gy2+8);
    ctx.fillStyle = P.concLight; ctx.fillRect(0, gy2, W, 1);
    ctx.fillStyle = 'rgba(58,50,40,0.5)';
    ctx.beginPath(); ctx.moveTo(0,H); ctx.lineTo(0,gy2+2);
    ctx.lineTo(150, gy2+2); ctx.lineTo(96, H); ctx.fill();
    /* the protagonist, tiny, scarf lifting in the wind */
    const fy = gy2 - 14;
    if(fy < H + 8) figure(122, fy, 1, { pose:'stand', facing:1, scarfT:t, scarfLen:3 });
  }},

  /* 4 ─ walking profile, estate strobing past, determined */
  { name:'stride', dur: 300, draw(t){
    /* sky sliver */
    ctx.fillStyle = '#cfd8dc'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#e4dcc8'; ctx.fillRect(0, 96, W, 20);
    /* far layer: terrace block slabs drifting */
    const off1 = -(t*1.1) % 64;
    ctx.fillStyle = P.towerMid; ctx.fillRect(0, 30, W, 74);
    for(let x = off1; x < W+64; x += 64){
      ctx.fillStyle = P.vault;
      ctx.beginPath(); ctx.arc(x+16, 34, 10, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(x+44, 34, 10, Math.PI, 0); ctx.fill();
      ctx.fillStyle = P.slabLight; ctx.fillRect(x, 52, 64, 3);
      ctx.fillStyle = P.glaze;     ctx.fillRect(x, 55, 64, 8);
      ctx.fillStyle = P.slabLight; ctx.fillRect(x, 76, 64, 3);
      ctx.fillStyle = P.glaze;     ctx.fillRect(x, 79, 64, 8);
      ctx.fillStyle = P.green;     ctx.fillRect(x+9, 53, 5, 2);
      ctx.fillRect(x+38, 77, 6, 2);
      ctx.fillStyle = '#e0568a';   ctx.fillRect(x+52, 53, 2, 2);
    }
    ctx.fillStyle = 'rgba(213,219,222,0.5)'; ctx.fillRect(0,0,W,H);
    /* mid layer: pick-hammered columns + balcony band strobing past */
    const off2 = -(t*2.8) % 84;
    ctx.fillStyle = P.slabLight; ctx.fillRect(0, 24, W, 6);
    ctx.fillStyle = P.towerShade; ctx.fillRect(0, 30, W, 2);
    for(let x = off2; x < W+84; x += 84){
      ctx.fillStyle = P.towerMid;  ctx.fillRect(x, 26, 18, 118);
      ctx.fillStyle = P.towerSun;  ctx.fillRect(x, 26, 4, 118);
      ctx.fillStyle = P.towerShade;ctx.fillRect(x+14, 26, 4, 118);
      for(let yy = 34; yy < 140; yy += 9)                       // pick-hammer texture
        ctx.fillRect(x + 5 + hash(x-off2+yy, yy)%8, yy, 1, 1);
    }
    /* near ground: brick + the Yellow Line racing beneath the feet */
    const off3 = -(t*4.2) % 16;
    ctx.fillStyle = P.brick; ctx.fillRect(0, 140, W, H-140);
    for(let x = off3; x < W+16; x += 16){
      ctx.fillStyle = P.brickDark; ctx.fillRect(x, 140, 1, 40);
      ctx.fillStyle = P.brickLight; ctx.fillRect(x+7, 148, 8, 1);
      ctx.fillStyle = P.brickDark;  ctx.fillRect(x+2, 156, 9, 1);
    }
    ctx.fillStyle = P.line; ctx.fillRect(0, 140, W, 3);
    ctx.fillStyle = '#c8a94e';
    for(let x = off3; x < W+16; x += 32) ctx.fillRect(x, 142, 5, 1); // wear
    /* the walker, large, mid-frame */
    const stride = Math.floor(t/9) % 2;
    const bob = stride ? 0 : -2;
    figure(128, 100 + bob, 3, { pose: stride ? 'walk0' : 'walk1',
                                facing: 1, scarfT: t, scarfLen: 5 });
    /* speed lines on the cut */
    if(t < 14){
      ctx.fillStyle = `rgba(255,255,255,${0.7*(1 - t/14)})`;
      for(let i = 0; i < 6; i++)
        ctx.fillRect(((i*53 + t*26)%W), 36 + i*18, 44, 1);
    }
    ctx.fillStyle = 'rgba(226,222,208,0.14)'; ctx.fillRect(0,0,W,H);
  }},

  /* 5 ─ close on the ground: the Line, the feet — then the fork */
  { name:'fork', dur: 380, draw(t){
    /* forward scroll, easing to a stop at t≈250 */
    const s = t < 180 ? t*1.2
            : t < 250 ? 216 + 1.2*(t-180) - 1.2*(t-180)*(t-180)/140
            : 258;
    /* top-down brick paving — world row r sits at screen y = s - r*8,
       so the ground slides DOWN as the camera walks forward */
    for(let k = -1; k < H/8 + 1; k++){
      const sy = k*8 + (s % 8) - 8;
      const wy = Math.floor(s/8) - k + 40;         // stable world row id
      for(let rxi = 0; rxi < W/16 + 1; rxi++)
        brickCell(rxi*16 - ((((wy%2)+2)%2) ? 8 : 0), sy, rxi, wy);
    }
    /* the Yellow Line, bold, running up-screen; fork scrolls in */
    const forkY = s - 190;                       // screen y of the fork joint
    const LX = 157, LW = 6;
    ctx.fillStyle = P.line;
    ctx.fillRect(LX, Math.max(forkY, -8), LW, H - Math.max(forkY, -8));
    ctx.fillStyle = '#c8a94e';                                    // wear flecks
    for(let k = 0; k < 12; k++){
      const wy2 = k*16 + (s % 16);
      const r = Math.floor(s/16) - k;
      if(wy2 > forkY) ctx.fillRect(LX + hash(r, r*7)%4, wy2, 2, 1);
    }
    if(forkY > -60){
      /* two branches diverge; the left one already fading */
      for(let i = 0; i < 70; i++){
        const by = forkY - i;
        if(by < -8 || by > H) continue;
        ctx.fillStyle = P.line;
        ctx.fillRect(LX + LW/2 + i*0.85, by, 5, 1.5);             // right branch, confident
        if(i % 7 < 4){                                            // left branch, scuffed
          ctx.fillStyle = 'rgba(247,198,35,0.75)';
          ctx.fillRect(LX + LW/2 - i*0.85 - 5, by, 4, 1.5);
        }
      }
      /* scuffed joint */
      ctx.fillStyle = '#c8a94e';
      ctx.fillRect(LX-1, forkY-2, 8, 2);
    }
    /* the feet, walking the line from above */
    const stopped = t >= 250;
    const step = Math.floor(s/14) % 2;
    const FY = 118;
    const shoe = (x,y) => {
      ctx.fillStyle = 'rgba(40,30,22,0.35)'; ctx.fillRect(x-1, y+1, 8, 11);  // shadow
      ctx.fillStyle = P.inkDark; ctx.fillRect(x, y, 6, 10);
      ctx.fillStyle = '#1a1c22'; ctx.fillRect(x, y, 6, 3);
      ctx.fillStyle = '#3a4152'; ctx.fillRect(x+1, y+8, 4, 2);
    };
    if(stopped){ shoe(150, FY+2); shoe(164, FY); }
    else if(step){ shoe(150, FY-6); shoe(164, FY+6); }
    else { shoe(150, FY+6); shoe(164, FY-6); }
    /* dust puff as the feet plant */
    if(t >= 250 && t < 262){
      ctx.fillStyle = `rgba(214,207,192,${(262-t)/12})`;
      const k = t - 250;
      ctx.fillRect(146 - k, FY+8, 3, 2); ctx.fillRect(172 + k, FY+6, 3, 2);
      ctx.fillRect(150, FY + 12 + k/2, 2, 1);
    }
    /* one petal drifts through the held frame */
    if(stopped){
      const pt = t - 250;
      ctx.fillStyle = '#f2b8c6';
      ctx.fillRect(90 + pt*0.55, 40 + Math.sin(pt*0.08)*6 + pt*0.3, 2, 1);
    }
    /* raking afternoon shadow band, high contrast */
    ctx.fillStyle = 'rgba(46,38,30,0.30)';
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(120,0); ctx.lineTo(30,H); ctx.lineTo(0,H); ctx.fill();
  }},

  /* 6 ─ lost montage: contradicting plates, accelerating */
  mkSign('LEVEL 3',        'ur', -0.10, 60, 1),
  mkSign('MEMBERS’ BAR', 'l', 0.08, 54, 2),
  mkSign('MEMBERS’ BAR', 'r', -0.06, 46, 3),
  mkSign('GILBERT BRIDGE', 'd', 0.11, 40, 4),
  mkJunction(0, 42), mkJunction(1, 36), mkJunction(2, 30),
  mkLook(-1, 36), mkLook(1, 30), mkLook(2, 34),

  /* 7 ─ wide and quiet: the empty court; the signal dies */
  { name:'court', dur: 480, draw(t){
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#a8c4dc'); g.addColorStop(0.6,'#cfd8dc'); g.addColorStop(1,'#e8e0cd');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    const sun = ctx.createRadialGradient(60,26,4,60,26,54);
    sun.addColorStop(0,'rgba(255,250,235,0.9)'); sun.addColorStop(1,'rgba(255,250,235,0)');
    ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(60,26,54,0,7); ctx.fill();
    /* the three towers, distant */
    smallTower(58, 40, 20, 1); smallTower(140, 30, 24, 2); smallTower(236, 46, 18, 3);
    /* terrace block far away */
    ctx.fillStyle = P.towerMid; ctx.fillRect(0, 92, W, 14);
    for(let x = 4; x < W; x += 24){
      ctx.fillStyle = P.vault;
      ctx.beginPath(); ctx.arc(x+8, 93, 5, Math.PI, 0); ctx.fill();
    }
    ctx.fillStyle = P.slabLight; ctx.fillRect(0, 98, W, 2);
    ctx.fillStyle = P.glaze;     ctx.fillRect(0, 100, W, 4);
    ctx.fillStyle = 'rgba(213,219,222,0.55)'; ctx.fillRect(0,0,W,106);
    /* the vast court: pale concrete, long joint lines converging */
    ctx.fillStyle = P.conc; ctx.fillRect(0, 106, W, H-106);
    ctx.fillStyle = P.concLight; ctx.fillRect(0, 106, W, 1);
    ctx.fillStyle = P.concDark;
    for(let i = 0; i < 7; i++){
      const x0 = 20 + i*46;
      ctx.beginPath();
      ctx.moveTo(x0, 106); ctx.lineTo((x0-160)*2.4 + 160, H);
      ctx.lineTo((x0-160)*2.4 + 161, H); ctx.lineTo(x0+1, 106); ctx.fill();
    }
    for(const yy of [118, 136, 160]){ ctx.fillRect(0, yy, W, 1); }
    /* the figure, minuscule; long afternoon shadow */
    ctx.fillStyle = 'rgba(52,44,34,0.42)';
    ctx.beginPath(); ctx.moveTo(96, 132); ctx.lineTo(44, 135); ctx.lineTo(48, 136);
    ctx.lineTo(97, 133); ctx.fill();
    figure(92, 118, 1, { pose:'stand', facing:1, scarfT:t*0.5, scarfLen:2 });
    /* stillness: petals only */
    for(let i = 0; i < 5; i++){
      const py = (i*37 + t*0.22) % 130;
      ctx.fillStyle = ['#e88aa8','#f2b8c6','#f7f2e9'][i%3];
      ctx.fillRect((i*67 + Math.sin(py*0.1 + i)*8 + 300)%W, 20 + py, 2, 1);
    }
    /* anime insert: the phone comes up */
    if(t >= 150){
      const slide = Math.min(1, (t-150)/8);                     // snaps in, 8 frames
      const ix = 206 + (1-slide)*60, iy = 42;
      ctx.fillStyle = 'rgba(20,20,26,0.92)'; ctx.fillRect(ix-3, iy-3, 92, 86);
      ctx.fillStyle = '#e8ecf5'; ctx.fillRect(ix-3, iy-3, 92, 1);
      ctx.fillStyle = '#0f1319'; ctx.fillRect(ix, iy, 86, 80);
      /* status row: signal dies at t≈330 */
      const dead = t >= 330;
      const blink = t >= 300 && t < 330 && (Math.floor(t/6)%2===0);
      signalBars(ix+6, iy+4, dead||blink ? 0 : 4, '#aeb8cc', '#252b38');
      ctx.font = mono(6); ctx.fillStyle = dead ? '#d97a6a' : '#7e8aa8';
      ctx.fillText(dead ? 'NO SIGNAL' : '17:58', ix+22, iy+10);
      ctx.fillStyle = '#242c3c'; ctx.fillRect(ix, iy+13, 86, 1);
      if(t >= 190){
        bubble(ix+5, iy+20, [[['hello?? you', '#e8ecf5']], [['lost already', '#e8ecf5']],
                             [['lol', '#e8ecf5']]], 7, 3, 52);
      }else if(t >= 160){
        typingDots(ix+5, iy+20, t);
      }
      if(dead){
        ctx.fillStyle = 'rgba(217,122,106,0.9)';
        ctx.fillRect(ix+5, iy+58, 76, 1);
        ctx.font = mono(6); ctx.fillStyle = '#8a93a8';
        ctx.fillText('message not sent', ix+8, iy+68);
        ctx.fillStyle = '#d97a6a'; ctx.fillText('!', ix+74, iy+68);
      }
    }
    const vig = ctx.createRadialGradient(W/2,H/2,80,W/2,H/2,220);
    vig.addColorStop(0,'rgba(30,40,60,0)'); vig.addColorStop(1,'rgba(30,40,60,0.20)');
    ctx.fillStyle = vig; ctx.fillRect(0,0,W,H);
  }},

  /* 8 ─ smash to black; hold the beat */
  { name:'beat', dur: 60, draw(){
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);
  }},

  /* 9 ─ title card: the wordmark, and the line that forks */
  { name:'title', dur: 430, draw(t){
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);
    /* stepped fade-in — held levels, not a smooth tween */
    const a = t < 26 ? 0 : t < 36 ? 0.3 : t < 48 ? 0.65 : 1;
    if(a > 0){
      ctx.globalAlpha = a;
      ctx.fillStyle = '#cfc9bc';
      ctx.font = mono(9);
      const the = 'T H E';
      ctx.fillText(the, 160 - ctx.measureText(the).width/2, 70);
      ctx.font = 'bold 21px "Courier New", monospace';
      const word = 'BARBICAN';
      let ww = 0;
      for(const ch of word) ww += ctx.measureText(ch).width + 6;
      let x = 160 - (ww-6)/2;
      ctx.fillStyle = '#e8e2d2';
      for(const ch of word){ ctx.fillText(ch, x, 94); x += ctx.measureText(ch).width + 6; }
      ctx.globalAlpha = 1;
    }
    /* the yellow line draws itself beneath the wordmark… */
    const lx0 = 78, lx1 = 226, ly = 108;
    if(t >= 80){
      const head = Math.min(lx1, lx0 + (t-80)*2.4);
      ctx.fillStyle = P.line;
      ctx.fillRect(lx0, ly, head-lx0, 2);
      if(head < lx1){ ctx.fillStyle = '#fff3c4'; ctx.fillRect(head-2, ly, 2, 2); }
      /* …then forks at its end */
      const ft = t - 80 - (lx1-lx0)/2.4;
      if(ft > 6){
        const fl = Math.min(17, (ft-6)*0.9);
        ctx.fillStyle = P.line;
        for(let i = 0; i < fl; i++) ctx.fillRect(lx1 + i, ly - i*0.65, 2, 2);
        for(let i = 0; i < fl; i++){
          if(i % 5 < 3){                                        // lower branch scuffed
            ctx.fillStyle = 'rgba(247,198,35,0.7)';
            ctx.fillRect(lx1 + i, ly + i*0.65, 2, 2);
          }
        }
      }
    }
    /* fade to the game */
    if(t > 350){
      ctx.fillStyle = `rgba(0,0,0,${clamp01((t-350)/60)})`;
      ctx.fillRect(0,0,W,H);
    }
  }},
  ];

  /* montage shot factories -------------------------------------------- */

  function mkSign(text, arrow, rot, dur, seed){
    return { name:'sign-'+arrow, dur, draw(t){
      /* hard-lit concrete behind, diagonal shadow, slight push-in */
      ctx.fillStyle = P.conc; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = P.concDark;
      for(let yy = 8; yy < H; yy += 24) ctx.fillRect(0, yy + (seed*5)%12, W, 1);
      for(let xx = 10; xx < W; xx += 40)
        ctx.fillRect(xx + (seed*13)%20, 0, 1, H);
      ctx.fillStyle = P.concLight;
      for(let i = 0; i < 14; i++)
        ctx.fillRect(hash(i,seed)%W, hash(seed,i)%H, 1, 1);
      ctx.fillStyle = 'rgba(46,38,30,0.42)';
      ctx.beginPath();
      if(seed % 2){ ctx.moveTo(0,0); ctx.lineTo(W*0.62,0); ctx.lineTo(W*0.22,H); ctx.lineTo(0,H); }
      else        { ctx.moveTo(W,0); ctx.lineTo(W*0.4,0);  ctx.lineTo(W*0.78,H); ctx.lineTo(W,H); }
      ctx.fill();
      const z = 1 + (t/dur)*0.06;
      ctx.save();
      ctx.translate(160, 90); ctx.scale(z,z); ctx.translate(-160, -90);
      signPlate(160 + ((seed%3)-1)*22, 88 + ((seed%2)?-8:8), text, arrow, rot);
      ctx.restore();
      if(t < 5){ ctx.fillStyle = `rgba(255,255,255,${0.25*(1-t/5)})`; ctx.fillRect(0,0,W,H); }
    }};
  }

  function mkJunction(k, dur){
    return { name:'junction-'+k, dur, draw(t){
      ctx.fillStyle = '#cfd8dc'; ctx.fillRect(0,0,W,H);
      if(k === 0){
        /* one-point: the walkway runs into a dark opening */
        ctx.fillStyle = P.conc; ctx.fillRect(0, 44, W, H-44);
        ctx.fillStyle = P.towerMid;
        ctx.beginPath(); ctx.moveTo(0,30); ctx.lineTo(120,58); ctx.lineTo(120,140);
        ctx.lineTo(0,H); ctx.fill();
        ctx.beginPath(); ctx.moveTo(W,30); ctx.lineTo(200,58); ctx.lineTo(200,140);
        ctx.lineTo(W,H); ctx.fill();
        ctx.fillStyle = P.towerSun;
        ctx.beginPath(); ctx.moveTo(0,30); ctx.lineTo(120,58); ctx.lineTo(120,62);
        ctx.lineTo(0,36); ctx.fill();
        /* texture the flanking walls: joints + pick-hammer speckle */
        ctx.fillStyle = P.towerShade;
        for(let yy = 64; yy < 150; yy += 18){
          ctx.fillRect(0, yy, 120, 1); ctx.fillRect(200, yy-4, W-200, 1);
        }
        ctx.fillStyle = P.concLight;
        for(let i = 0; i < 22; i++){
          const sx2 = hash(i,5)%W;
          if(sx2 < 116 || sx2 > 204) ctx.fillRect(sx2, 60 + hash(7,i)%90, 1, 1);
        }
        /* lintel + a plate over the mouth */
        ctx.fillStyle = P.slabLight; ctx.fillRect(114, 52, 92, 6);
        ctx.fillStyle = P.towerShade; ctx.fillRect(114, 58, 92, 2);
        ctx.fillStyle = '#241f1a'; ctx.fillRect(120, 60, 80, 80);       // the dark mouth
        ctx.fillStyle = 'rgba(23,19,16,0.6)'; ctx.fillRect(132, 66, 56, 74);
        ctx.fillStyle = P.signOrange; ctx.fillRect(138, 66, 44, 11);
        ctx.fillStyle = '#fdf6ea'; ctx.font = mono(7);
        ctx.fillText('LOWER', 143, 74);
        ctx.fillStyle = P.brick; ctx.fillRect(120, 132, 80, 8);
        ctx.fillStyle = P.line;
        ctx.beginPath(); ctx.moveTo(148,H); ctx.lineTo(157,140); ctx.lineTo(165,140);
        ctx.lineTo(166,H); ctx.fill();                                   // the line goes IN
        ctx.fillRect(157, 136, 8, 4);
      }else if(k === 1){
        /* diagonal highwalk slashing the frame */
        ctx.fillStyle = P.towerShade; ctx.fillRect(0,0,W,H);
        ctx.fillStyle = P.conc;
        ctx.beginPath(); ctx.moveTo(-10,150); ctx.lineTo(W,26); ctx.lineTo(W,66);
        ctx.lineTo(-10,H); ctx.fill();
        ctx.fillStyle = P.brick;
        ctx.beginPath(); ctx.moveTo(-10,150); ctx.lineTo(W,26); ctx.lineTo(W,34);
        ctx.lineTo(-10,158); ctx.fill();
        ctx.fillStyle = P.line;
        ctx.beginPath(); ctx.moveTo(-10,151); ctx.lineTo(W,27); ctx.lineTo(W,30);
        ctx.lineTo(-10,154); ctx.fill();
        ctx.fillStyle = '#37588a';                                       // blue railing
        ctx.beginPath(); ctx.moveTo(-10,141); ctx.lineTo(W,17); ctx.lineTo(W,19);
        ctx.lineTo(-10,143); ctx.fill();
        for(let i = 0; i < 14; i++){
          const x = i*24, y = 141 - x*(124/330);
          ctx.fillRect(x, y, 1, 10);
        }
        ctx.fillStyle = 'rgba(20,16,12,0.45)';
        ctx.beginPath(); ctx.moveTo(0,H); ctx.lineTo(W,60); ctx.lineTo(W,H); ctx.fill();
      }else{
        /* high angle: the line splits three ways on the paving below */
        for(let ry = 0; ry < H/8 + 1; ry++)
          for(let rxi = 0; rxi < W/16 + 1; rxi++)
            brickCell(rxi*16 - ((ry%2)?8:0), ry*8, rxi, ry+40);
        ctx.fillStyle = P.line;
        ctx.fillRect(150, 90, 6, 90);                                    // from bottom
        ctx.fillRect(0, 88, 156, 5);                                     // west
        for(let i = 0; i < 110; i++)
          if(i % 9 < 5) ctx.fillRect(156 + i, 88 - i*0.3, 3, 4);         // northeast, scuffed
        ctx.fillStyle = 'rgba(46,38,30,0.5)';
        ctx.beginPath(); ctx.moveTo(W,0); ctx.lineTo(W*0.55,0); ctx.lineTo(W*0.9,H);
        ctx.lineTo(W,H); ctx.fill();
      }
      if(t < 4){ ctx.fillStyle = `rgba(255,255,255,${0.2*(1-t/4)})`; ctx.fillRect(0,0,W,H); }
    }};
  }

  function mkLook(dir, dur){
    /* dir: -1 look left, 1 look right, 2 look up — big head, hard shadow */
    return { name:'look', dur, draw(t){
      ctx.fillStyle = P.towerMid; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = P.towerSun;
      ctx.beginPath();
      if(dir === -1){ ctx.moveTo(0,0); ctx.lineTo(W*0.7,0); ctx.lineTo(W*0.3,H); ctx.lineTo(0,H); }
      else if(dir === 1){ ctx.moveTo(W,0); ctx.lineTo(W*0.34,0); ctx.lineTo(W*0.72,H); ctx.lineTo(W,H); }
      else { ctx.moveTo(0,0); ctx.lineTo(W,0); ctx.lineTo(W,H*0.42); ctx.lineTo(0,H*0.8); }
      ctx.fill();
      /* balcony band texture crossing behind */
      ctx.fillStyle = 'rgba(110,101,87,0.5)';
      for(let yy = 12; yy < H; yy += 30) ctx.fillRect(0, yy, W, 2);
      const s = 9;                                     // big — head and shoulders
      const x = dir === 2 ? 124 : (dir === 1 ? 160 : 88);
      const breathe = Math.floor(t/26)%2;
      figure(x, 44 + breathe, s, { pose:'stand',
        facing: 1,
        look: dir === 2 ? 1 : (dir === -1 ? -1 : 0),
        scarfT: t, scarfLen: 0 });
      /* hard split shadow across the face side */
      ctx.fillStyle = 'rgba(38,32,26,0.38)';
      ctx.beginPath();
      if(dir === 2){ ctx.moveTo(0,H); ctx.lineTo(W,H*0.5); ctx.lineTo(W,H); }
      else if(dir === -1){ ctx.moveTo(W,0); ctx.lineTo(W*0.55,0); ctx.lineTo(W*0.85,H); ctx.lineTo(W,H); }
      else { ctx.moveTo(0,0); ctx.lineTo(W*0.42,0); ctx.lineTo(W*0.14,H); ctx.lineTo(0,H); }
      ctx.fill();
      if(t < 4){ ctx.fillStyle = `rgba(255,255,255,${0.2*(1-t/4)})`; ctx.fillRect(0,0,W,H); }
    }};
  }

  /* a distant tower for the wide court shot */
  function smallTower(x, top, w, seed){
    ctx.fillStyle = P.towerMid; ctx.fillRect(x, top, w, 106-top);
    ctx.fillStyle = P.towerSun; ctx.fillRect(x, top, 1, 106-top);
    ctx.fillStyle = P.towerShade; ctx.fillRect(x+w-1, top, 1, 106-top);
    ctx.fillStyle = P.towerMid;
    ctx.fillRect(x+2, top-8-(seed*3)%4, 3, 8+(seed*3)%4);
    ctx.fillRect(x+w-6, top-12-(seed*5)%5, 4, 12+(seed*5)%5);
    for(let fy = top+3; fy < 104; fy += 4){
      ctx.fillStyle = P.glazeFar;  ctx.fillRect(x+1, fy, w-2, 1);
      ctx.fillStyle = P.slabLight; ctx.fillRect(x+1, fy+1, w-2, 1);
    }
  }

  /* ---------- the player: cuts, letterbox, skip ---------- */

  const TOTAL = SHOTS.reduce((a,s) => a + s.dur, 0);
  const params = new URLSearchParams(location.search);

  let gt = 0;                                     // global frame clock
  const wantShot = parseInt(params.get('shot') || '', 10);
  if(wantShot >= 1 && wantShot <= SHOTS.length){
    for(let i = 0; i < wantShot-1; i++) gt += SHOTS[i].dur;
    gt += Math.min(parseInt(params.get('t') || '', 10) || 0, SHOTS[wantShot-1].dur - 1);
  }
  const hold = params.has('hold');

  let raf = 0, done = false;
  let acc = 0, last = performance.now();

  function finish(){
    if(done) return;
    done = true;
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onSkip, true);
    canvas.removeEventListener('pointerdown', onSkip, true);
    onDone();
  }
  const onSkip = () => finish();
  addEventListener('keydown', onSkip, true);
  canvas.addEventListener('pointerdown', onSkip, true);

  function drawFrame(){
    let t = gt, i = 0;
    while(i < SHOTS.length && t >= SHOTS[i].dur){ t -= SHOTS[i].dur; i++; }
    if(i >= SHOTS.length){ finish(); return; }
    ctx.save();
    SHOTS[i].draw(t);
    ctx.restore();
    /* letterbox */
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, BAR); ctx.fillRect(0, H-BAR, W, BAR);
    /* skip hint after 2s */
    if(gt > 120 && !hold){
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#8a8a92'; ctx.font = mono(7);
      ctx.fillText('Z SKIP', W-36, H-7);
      ctx.globalAlpha = 1;
    }
  }

  function loop(now){
    if(done) return;
    const dt = Math.min(now - last, 100); last = now;
    if(!hold){
      acc += dt;
      while(acc >= 1000/60){ gt++; acc -= 1000/60; }
    }
    drawFrame();
    if(!done) raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
}
