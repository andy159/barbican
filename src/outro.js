/* Ending cinematic — the members' bar, at last. A skippable, letterboxed,
   real-time film in the same anime grammar as src/intro.js.

   playOutro(canvas, onDone): runs the shot list below, then calls onDone
   exactly once. Any key or click after 1s skips the whole film.

   Debug params (kept on purpose):
     ?outroshot=n   jump straight to shot n (1-based, see SHOTS order)
     &t=frames      offset into that shot
     &hold=1        freeze on that frame (for screenshots)

   All drawing is procedural and deterministic (no Math.random at runtime),
   fixed 60Hz step. Payoff of the intro's text thread: the friend who sent
   "meet me in the members' bar" is ANDY — curly brown hair, warm jumper,
   and a bottle of minttu waiting on the bar. */

const W = 320, H = 180, BAR = 22;               // 2.35:1 letterbox band

/* palette — the game's identity plus the bar's warmth */
const P = {
  line:'#f7c623', scarf:'#ffd23e', scarfDark:'#e8b92e',
  ink:'#2f3440', inkDark:'#23262e', hair:'#2a2622', skin:'#d9a878',
  /* Andy */
  andyHair:'#6b4a2c', andyHairHi:'#8a6238',
  jumper:'#b5622f', jumperDark:'#8f4a22', jumperHi:'#d08048',
  /* the members' bar */
  wall:'#33241a', wallDark:'#2a1d14', panel:'#221812',
  wood:'#5a4128', woodDark:'#43301d',
  counter:'#6b4e33', counterHi:'#8a6a44',
  brass:'#c9a04a', brassHi:'#f0d488',
  shade:'#8a5a28', shadeDark:'#6b4420',
  eveSky0:'#f2c988', eveSky1:'#e8a060',
  lake:'#6f93a4', lakeGlint:'#f2d9a0', towerSil:'#4a4038',
  glass:'#dfeef2', liquid:'#e8f6f2', labelBlue:'#2f5f9e',
  signOrange:'#d96c1e', signOrangeHi:'#ef8434',
};
const BOTTLES = ['#c9781e','#a85818','#e09a3a','#4a6b3a','#8a3a2a','#c9a04a'];

const hash = (a,b) => (((a|0)*73856093 ^ (b|0)*19349663) >>> 0);
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const easeOut = u => 1 - (1-u)*(1-u);
const lerp = (a,b,u) => a + (b-a)*u;

export function playOutro(canvas, onDone){
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  /* ---------- shared drawing helpers ---------- */

  /* Both leads on the intro's 8×14 grid, scalable for close shots.
     who: 'player' | 'andy' (curly brown hair, no scarf, warm jumper).
     pose: 'stand' | 'walk0' | 'walk1' | 'sit'; look: -1 left, 0 fwd, 1 up;
     sil: silhouette (backlit, for the doorway). */
  function figure(x, y, s, { who='player', pose='stand', facing=1, look=0,
                             scarfT=0, scarfLen=0, blink=false, sil=false } = {}){
    const px = (gx,gy,ww,hh,c) => {
      if(facing < 0) gx = 8 - gx - ww;
      ctx.fillStyle = c;
      ctx.fillRect(x + gx*s, y + gy*s, ww*s, hh*s);
    };
    const andy = who === 'andy';
    const cHair = sil ? '#0d0b10' : (andy ? P.andyHair : P.hair);
    const cSkin = sil ? '#141016' : P.skin;
    const cTop  = sil ? '#0d0b10' : (andy ? P.jumper : P.ink);
    /* streaming scarf tail (the player only) */
    if(!andy){
      for(let i = 0; i < scarfLen; i++){
        const wob = Math.round(Math.sin(scarfT*0.22 + i*0.9));
        px(-1 - i, 6 + wob + (i>2 ? 1 : 0), 1, 2 - (i>3 ? 1 : 0),
           sil ? '#6b571f' : (i%2 ? P.scarfDark : P.scarf));
      }
      if(scarfLen) px(0,6,1,3, sil ? '#6b571f' : P.scarfDark);
    }
    const lu = look === 1 ? -1 : 0;
    if(andy){
      /* curly mop: bumpy crown + temple curls, warm highlights */
      px(2,-1+lu,1,1,cHair); px(4,-1+lu,1,1,cHair); px(6,-1+lu,1,1,cHair);
      px(1,0+lu,6,2,cHair);
      px(0,1+lu,1,2,cHair); px(7,1+lu,1,2,cHair);
      if(!sil){
        px(3,0+lu,1,1,P.andyHairHi); px(5,1+lu,1,1,P.andyHairHi);
        px(1,1+lu,1,1,P.andyHairHi);
      }
    }else{
      px(2,0+lu,4,1,cHair);
      px(1,1+lu,6,2,cHair);
    }
    px(2,2+lu,5,3,cSkin);
    if(!blink && !sil){
      const ex = look === -1 ? 2 : 5;
      px(ex,3+lu + (look===1 ? -1 : 0),1,1,'#14141a');
    }
    if(andy){
      px(1,5,6,1, sil ? '#0d0b10' : P.jumperDark);      // roll collar
      px(1,6,6,5,cTop);
      if(!sil){
        px(2,7,1,1,P.jumperHi); px(5,8,1,1,P.jumperHi); // knit flecks
        px(1,7,1,4,P.jumperDark); px(6,7,1,4,P.jumperDark);
      }
    }else{
      px(1,5,6,2, sil ? '#8a6f28' : P.scarf);           // the scarf, rim-lit in sil
      px(1,7,6,4,cTop);
      if(!sil){ px(1,8,1,3,'#252a35'); px(6,8,1,3,'#3a4152'); }
    }
    const legC  = sil ? '#0b0a0e' : (andy ? '#4a3a30' : P.inkDark);
    const shoeC = sil ? '#0b0a0e' : (andy ? '#2e241c' : '#1a1c22');
    if(pose === 'sit'){
      px(2,11,4,2,legC);                                 // thighs forward
      px(5,12,2,3,legC);                                 // shins down
      px(5,14,2,1,shoeC);
    }else if(pose === 'walk0'){
      px(1,11,2,3,legC); px(5,11,2,3,legC);
      px(1,13,2,1,shoeC); px(5,13,2,1,shoeC);
    }else{
      px(2,11,2,3,legC); px(4,11,2,3,legC);
      px(2,13,2,1,shoeC); px(4,13,2,1,shoeC);
    }
  }

  const mono = s => `${s}px "Courier New", monospace`;

  /* text box + typing dots — the intro's chat language, reused verbatim */
  function bubble(x, y, lines, fontPx, pad, maxTextW){
    const lh = fontPx + 2;
    const w = maxTextW + pad*2, h = lines.length*lh + pad*2 - 1;
    ctx.fillStyle = '#2a3140';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#232938';
    ctx.fillRect(x, y+h-1, w, 1); ctx.fillRect(x, y, 1, h);
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

  /* speech beat: typing dots lead in, then the box with a 3-frame flash;
     the box clears at t1 so the next beat gets a clean frame */
  function speak(t, t0, t1, lines, x = 22, y = 124){
    if(t >= t0 - 40 && t < t0 - 4){ typingDots(x, y, t); return; }
    if(t < t0 || t >= t1) return;
    const flash = t - t0 < 3;
    ctx.font = mono(8);
    let maxw = 0;
    for(const s of lines) maxw = Math.max(maxw, ctx.measureText(s).width);
    bubble(x, y, lines.map(s => [[s, flash ? '#ffffff' : '#e8ecf5']]),
           8, 5, Math.ceil(maxw));
  }

  /* golden-hour window band: the lake, the towers, petals drifting past */
  function windowBand(x, y, w, h, t){
    ctx.fillStyle = '#1a120c'; ctx.fillRect(x-3, y-3, w+6, h+6);   // frame
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y+h);
    g.addColorStop(0, '#fbe3ae'); g.addColorStop(0.62, '#f2b878');
    g.addColorStop(0.62, P.lake); g.addColorStop(1, '#54788a');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const hor = y + Math.round(h*0.62);
    /* low sun haze sitting on the water */
    const sg = ctx.createRadialGradient(x+w*0.6, hor, 2, x+w*0.6, hor, 18);
    sg.addColorStop(0, 'rgba(255,244,210,0.9)'); sg.addColorStop(1, 'rgba(255,244,210,0)');
    ctx.fillStyle = sg; ctx.fillRect(x, y, w, h);
    /* the three towers, small against the evening */
    const tw = [[0.10,12,6],[0.38,15,7],[0.74,10,5]];
    for(const [fx,th,twd] of tw){
      const tx = x + Math.round(w*fx);
      ctx.fillStyle = P.towerSil;
      ctx.fillRect(tx, hor-th, twd, th);
      ctx.fillRect(tx+1, hor-th-3, 1, 3); ctx.fillRect(tx+twd-2, hor-th-4, 1, 4);
    }
    /* lake glints crawling with the light */
    ctx.fillStyle = P.lakeGlint;
    for(let k = 0; k < 6; k++){
      const gx = x + ((k*23 + Math.floor(t*0.22)) % (w-6));
      ctx.fillRect(gx, hor + 3 + (k*5)%(h-Math.round(h*0.62)-6), 4 - k%2, 1);
    }
    ctx.fillStyle = 'rgba(255,236,190,0.5)'; ctx.fillRect(x, hor, w, 1);
    /* petals drifting past outside */
    for(let i = 0; i < 3; i++){
      const pt = (t*0.5 + i*57) % (h + 20);
      ctx.fillStyle = ['#e88aa8','#f2b8c6','#f7f2e9'][i];
      ctx.fillRect(x + 6 + ((i*29 + Math.floor(pt*0.4))% (w-10)), y - 6 + pt, 2, 1);
    }
    ctx.restore();
    /* muntin bars */
    ctx.fillStyle = '#1a120c';
    ctx.fillRect(x + Math.round(w/3), y, 2, h);
    ctx.fillRect(x + Math.round(w*2/3), y, 2, h);
  }

  /* one shelf of amber bottles, glints ticking across them */
  function shelfRow(x, y, w, t, seed){
    for(let k = 0; k*15 + 8 < w; k++){
      const bx = x + 4 + k*15;
      const hh = 13 + hash(k, seed)%7, bw = 4 + hash(seed, k)%2;
      ctx.fillStyle = BOTTLES[hash(k*3+1, seed)%6];
      ctx.fillRect(bx, y-hh, bw, hh);
      ctx.fillRect(bx + (bw>>1) - 1, y-hh-3, 2, 3);              // neck
      ctx.fillStyle = 'rgba(255,220,150,0.30)';
      ctx.fillRect(bx, y-hh+2, 1, hh-4);                          // standing sheen
      if(((Math.floor(t*0.5) + k*13) % 110) < 4){                 // travelling glint
        ctx.fillStyle = '#ffe9b0'; ctx.fillRect(bx+1, y-hh+1, 1, hh-3);
      }
    }
    ctx.fillStyle = P.wood;  ctx.fillRect(x-2, y, w+4, 3);        // shelf board
    ctx.fillStyle = P.brass; ctx.fillRect(x-2, y, w+4, 1);        // brass lip
  }

  /* low pendant lamp, foreground scale, with a warm pool on the counter */
  function lamp(x, t){
    const fl = 0.9 + 0.1*Math.sin(t*0.045 + x);
    ctx.fillStyle = '#0f0a06'; ctx.fillRect(x-1, 18, 2, 12);      // cord
    ctx.fillStyle = P.shadeDark; ctx.fillRect(x-6, 30, 13, 4);
    ctx.fillStyle = P.shade;     ctx.fillRect(x-11, 34, 23, 7);
    ctx.fillStyle = '#5a3a1a';   ctx.fillRect(x-11, 40, 23, 1);
    ctx.fillStyle = '#ffe9c0';   ctx.fillRect(x-3, 41, 6, 3);     // bulb
    ctx.fillStyle = '#fff8e4';   ctx.fillRect(x-1, 41, 2, 2);
    const g = ctx.createRadialGradient(x, 56, 3, x, 56, 52);
    g.addColorStop(0, `rgba(255,206,128,${0.22*fl})`);
    g.addColorStop(1, 'rgba(255,206,128,0)');
    ctx.fillStyle = g; ctx.fillRect(x-52, 38, 104, 74);
    ctx.fillStyle = `rgba(255,214,150,${0.10*fl})`;
    ctx.fillRect(x-22, 104, 44, 7);                               // pool on the top
  }

  function stool(x){
    ctx.fillStyle = '#5a3a22'; ctx.fillRect(x-7, 122, 14, 4);
    ctx.fillStyle = '#7a5232'; ctx.fillRect(x-7, 122, 14, 1);
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(x-6, 126, 2, 24); ctx.fillRect(x+4, 126, 2, 24);
    ctx.fillRect(x-6, 140, 12, 1);
  }

  /* the whole set — shared by the reveal and the toast so it stays one room */
  function barRoom(t){
    ctx.fillStyle = P.wall; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = P.wallDark;
    for(let x = 8; x < W; x += 46) ctx.fillRect(x, 22, 1, 100);   // panel joints
    const cg = ctx.createLinearGradient(0, 20, 0, 58);
    cg.addColorStop(0, 'rgba(14,9,5,0.55)'); cg.addColorStop(1, 'rgba(14,9,5,0)');
    ctx.fillStyle = cg; ctx.fillRect(0, 20, W, 38);

    windowBand(14, 36, 86, 44, t);                                 // the lake

    /* back bar: amber shelves */
    ctx.fillStyle = P.panel; ctx.fillRect(114, 30, 196, 68);
    shelfRow(120, 56, 184, t, 0);
    shelfRow(120, 82, 184, t, 9);
    ctx.fillStyle = P.wood;  ctx.fillRect(114, 96, 196, 6);        // back ledge
    ctx.fillStyle = P.brass; ctx.fillRect(114, 95, 196, 1);

    lamp(152, t); lamp(232, t + 40);

    /* the bar counter + brass rails */
    ctx.fillStyle = P.counter;   ctx.fillRect(96, 104, W-96, 7);
    ctx.fillStyle = P.counterHi; ctx.fillRect(96, 104, W-96, 1);
    ctx.fillStyle = P.brassHi;   ctx.fillRect(150, 104, 14, 1);    // catchlight
    ctx.fillStyle = P.wood;      ctx.fillRect(100, 111, W-100, 27);
    ctx.fillStyle = P.woodDark;
    for(let x = 106; x < W; x += 18) ctx.fillRect(x, 113, 1, 23);
    ctx.fillStyle = P.brass;   ctx.fillRect(100, 138, W-100, 2);   // foot rail
    ctx.fillStyle = P.brassHi; ctx.fillRect(122, 138, 10, 1);
    ctx.fillRect(214, 138, 8, 1);

    ctx.fillStyle = '#241811'; ctx.fillRect(0, 140, W, H-140);     // floor
    ctx.fillStyle = '#2e1f15'; ctx.fillRect(0, 140, W, 1);
    ctx.fillStyle = 'rgba(255,206,128,0.05)';
    ctx.fillRect(120, 141, 66, 12); ctx.fillRect(206, 141, 52, 12);

    stool(146); stool(206);
  }

  /* a raised shot glass at the end of an arm — the toast overlay */
  function raisedGlass(x, y, tick){
    ctx.fillStyle = P.glass;
    ctx.fillRect(x, y, 1, 6); ctx.fillRect(x+4, y, 1, 6);
    ctx.fillRect(x, y+6, 5, 2);
    ctx.fillStyle = P.liquid; ctx.fillRect(x+1, y+3, 3, 3);
    if(tick){ ctx.fillStyle = '#ffffff'; ctx.fillRect(x+1, y-1, 2, 1); }
  }

  /* the minttu bottle, drawn mouth-at-origin so it can tip to pour */
  function minttuBottle(){
    ctx.fillStyle = '#c8d2d8'; ctx.fillRect(-3, 0, 6, 2);          // rim
    ctx.fillStyle = 'rgba(214,232,236,0.65)';
    ctx.fillRect(-3, 2, 6, 10);                                    // neck
    ctx.fillRect(-8, 12, 16, 5);                                   // shoulder
    ctx.fillRect(-11, 17, 22, 52);                                 // body
    ctx.fillStyle = 'rgba(244,252,253,0.55)';
    ctx.fillRect(-9, 20, 18, 47);                                  // the clear spirit
    ctx.fillStyle = P.glass;
    ctx.fillRect(-11, 17, 1, 52); ctx.fillRect(10, 17, 1, 52);     // glass edges
    ctx.fillRect(-11, 66, 22, 3);                                  // thick base
    /* stylized label: white, blue band, MINTTU */
    ctx.fillStyle = '#f4f6f6'; ctx.fillRect(-9, 24, 18, 16);
    ctx.fillStyle = P.labelBlue; ctx.fillRect(-9, 24, 18, 3);
    ctx.font = 'bold 5px "Courier New", monospace';
    ctx.fillText('MINTTU', -8, 34);
    ctx.fillRect(-1, 36, 2, 2);                                    // blue leaf dot
    /* Andy's hand + jumper sleeve gripping the body */
    ctx.fillStyle = P.skin; ctx.fillRect(-13, 44, 26, 11);
    ctx.fillStyle = '#c08a5c';
    ctx.fillRect(-6, 44, 1, 11); ctx.fillRect(-1, 44, 1, 11); ctx.fillRect(4, 44, 1, 11);
    ctx.fillStyle = P.skin; ctx.fillRect(-15, 40, 6, 6);           // thumb
    ctx.fillStyle = P.jumperDark; ctx.fillRect(-13, 55, 26, 3);    // cuff
    ctx.fillStyle = P.jumper;     ctx.fillRect(-13, 58, 26, 30);   // forearm away
  }

  /* ---------- the shot list ---------- */

  const SHOTS = [

  /* 1 ─ hard cut from gameplay: the bar door swings open, light floods */
  { name:'door', dur: 130, draw(t){
    ctx.fillStyle = '#07060a'; ctx.fillRect(0, 0, W, H);
    const DX = 132, DW = 56, DY0 = 48, DY1 = 150;
    const e = t < 16 ? 0 : easeOut(clamp01((t-16)/44));
    const gap = Math.round(DW * e);
    /* door frame */
    ctx.fillStyle = '#191009'; ctx.fillRect(DX-6, DY0-8, DW+12, DY1-DY0+8);
    ctx.fillStyle = '#241a10'; ctx.fillRect(DX-4, DY0-6, 4, DY1-DY0+6);
    ctx.fillRect(DX+DW, DY0-6, 4, DY1-DY0+6);
    /* the warm room through the widening gap */
    if(gap > 0){
      const g = ctx.createLinearGradient(DX+DW-gap, 0, DX+DW, 0);
      g.addColorStop(0, '#b57e3c'); g.addColorStop(1, '#ffe6b4');
      ctx.fillStyle = g; ctx.fillRect(DX+DW-gap, DY0, gap, DY1-DY0);
      /* blurred hints inside: shelf line + bottle shapes */
      ctx.fillStyle = 'rgba(122,74,32,0.7)';
      ctx.fillRect(DX+DW-gap, DY0+22, gap, 2);
      for(let k = 0; k < 4; k++){
        const bx = DX+DW - 6 - k*9;
        if(bx > DX+DW-gap) ctx.fillRect(bx, DY0+10, 3, 12);
      }
    }else{
      ctx.fillStyle = 'rgba(242,196,106,0.5)';
      ctx.fillRect(DX+DW-1, DY0, 1, DY1-DY0);                      // the seam
    }
    /* the door slab, swinging away */
    const dw = DW - gap;
    if(dw > 0){
      ctx.fillStyle = '#20160d'; ctx.fillRect(DX, DY0, dw, DY1-DY0);
      ctx.fillStyle = '#3a2a18'; ctx.fillRect(DX+dw-2, DY0, 2, DY1-DY0);
      if(dw > 10){ ctx.fillStyle = P.brass; ctx.fillRect(DX+dw-7, 96, 2, 7); }
    }
    /* light flooding the dark floor toward camera */
    if(e > 0){
      const a = 0.26*e + 0.03*Math.sin(t*0.11);
      ctx.fillStyle = `rgba(255,214,150,${a})`;
      ctx.beginPath();
      ctx.moveTo(DX+DW-gap, DY1); ctx.lineTo(DX+DW, DY1);
      ctx.lineTo(DX+DW + 70*e, H); ctx.lineTo(DX+DW-gap - 90*e, H);
      ctx.fill();
      const g2 = ctx.createRadialGradient(DX+DW-gap/2, 100, 4, DX+DW-gap/2, 100, 30+90*e);
      g2.addColorStop(0, `rgba(255,214,150,${0.14*e})`);
      g2.addColorStop(1, 'rgba(255,214,150,0)');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
      /* dust motes in the shaft */
      for(let i = 0; i < 6; i++){
        const my = DY0 + 14 + ((i*31 + Math.floor(t*0.7)) % (DY1-DY0-20));
        ctx.fillStyle = `rgba(255,236,190,${0.35*e})`;
        ctx.fillRect(DX + 8 + (hash(i,5) % (DW-14)), my, 1, 1);
      }
    }
    /* the plate above — MEMBERS' BAR, found at last */
    ctx.globalAlpha = 0.45 + 0.55*e;
    ctx.fillStyle = 'rgba(30,24,18,0.55)'; ctx.fillRect(DX-2, 27, DW+8, 13);
    ctx.fillStyle = P.signOrange;   ctx.fillRect(DX-4, 25, DW+8, 13);
    ctx.fillStyle = P.signOrangeHi; ctx.fillRect(DX-4, 25, DW+8, 2);
    ctx.fillStyle = '#fdf6ea'; ctx.font = 'bold 8px "Courier New", monospace';
    ctx.fillText('MEMBERS’ BAR', DX-1, 35);
    ctx.globalAlpha = 1;
    /* the player steps into the doorway, backlit */
    if(t >= 76){
      const step = Math.min(8, (t-76)*0.18);
      const pose = (t < 118 && Math.floor(t/12)%2) ? 'walk0' : 'walk1';
      figure(DX + DW/2 - 12 + step, DY1 - 42, 3,
             { pose: t < 118 ? pose : 'stand', facing: 1, sil: true,
               scarfT: t, scarfLen: 2 });
    }
  }},

  /* 2 ─ the members' bar, warm and alive; Andy turns on his stool */
  { name:'arrive', dur: 280, draw(t){
    const z = 1 + clamp01(t/280)*0.05;
    ctx.save();
    ctx.translate(160, 96); ctx.scale(z, z); ctx.translate(-160, -96);
    barRoom(t);
    /* residual doorlight from the left, dying down */
    const dg = ctx.createLinearGradient(0, 0, 90, 0);
    dg.addColorStop(0, `rgba(255,214,150,${0.30 - clamp01(t/240)*0.16})`);
    dg.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = dg; ctx.fillRect(0, 22, 90, H-44);
    /* Andy at the far stool: facing his glass, then he turns */
    const turned = t >= 120;
    figure(198, 102, 2, { who:'andy', pose:'sit',
                          facing: turned ? -1 : 1, look: 0 });
    if(t >= 118 && t < 124){                                       // turn tick
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(192, 100, 3, 1); ctx.fillRect(218, 104, 3, 1);
    }
    /* his glass waiting on the counter */
    ctx.fillStyle = P.glass; ctx.fillRect(222, 99, 4, 5);
    ctx.fillStyle = P.liquid; ctx.fillRect(223, 101, 2, 2);
    /* the player walks in from the door */
    if(t >= 150){
      const wx = Math.min(134, (t-150)*1.4);
      const moving = wx < 134;
      const pose = moving ? (Math.floor(t/9)%2 ? 'walk0' : 'walk1') : 'stand';
      figure(-22 + wx, 122, 2, { pose, facing: 1, scarfT: t,
                                 scarfLen: moving ? 4 : 2 });
    }
    ctx.restore();
    if(t < 5){ ctx.fillStyle = `rgba(255,244,214,${0.3*(1-t/5)})`; ctx.fillRect(0,0,W,H); }
  }},

  /* 3 ─ close on Andy against the amber blur; the three beats */
  { name:'chat', dur: 500, draw(t){
    /* bar bokeh: warm dark, soft shelf bands, out-of-focus glints */
    ctx.fillStyle = '#2a1c12'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(201,120,40,0.28)';
    ctx.fillRect(0, 42, W, 16); ctx.fillRect(0, 84, W, 12);
    for(let i = 0; i < 9; i++){
      const bx = (i*41 + 13) % W, by = 34 + (hash(i,7) % 66);
      const tw2 = 0.10 + 0.06*Math.sin(t*0.03 + i*1.7);
      ctx.fillStyle = `rgba(255,196,110,${tw2})`;
      ctx.fillRect(bx, by, 5, 4); ctx.fillRect(bx+1, by-1, 3, 6);   // round-ish bokeh
    }
    const wg = ctx.createLinearGradient(0, 0, 70, 0);               // window spill
    wg.addColorStop(0, 'rgba(242,201,136,0.18)'); wg.addColorStop(1, 'rgba(242,201,136,0)');
    ctx.fillStyle = wg; ctx.fillRect(0, 22, 70, H-44);
    /* Andy, big — head and shoulders, facing the player (left) */
    const breathe = Math.floor(t/26) % 2;
    const blink = (t % 150) >= 96 && (t % 150) < 101;
    const hop = (t >= 444 && t < 452) ? -2 : 0;                     // "minttu?" lift
    figure(150, 42 + breathe + hop, 9,
           { who:'andy', pose:'stand', facing:-1, look:0, blink });
    /* hard warm key light from the right, shade toward the left */
    ctx.fillStyle = 'rgba(30,18,10,0.30)';
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(W*0.30,0);
    ctx.lineTo(W*0.10,H); ctx.lineTo(0,H); ctx.fill();
    ctx.fillStyle = 'rgba(255,206,128,0.10)';
    ctx.beginPath(); ctx.moveTo(W,0); ctx.lineTo(W*0.72,0);
    ctx.lineTo(W*0.88,H); ctx.lineTo(W,H); ctx.fill();
    /* the beats — and the held beat of silence before the offer */
    speak(t,  60, 176, ['you finally arrived!']);
    if(t >= 176) speak(t, 220, 386, ['took you long enough —', 'did you get lost?']);
    if(t >= 404) speak(t, 448, 1e9, ['minttu?']);
  }},

  /* 4 ─ macro: two shot glasses; the minttu pours; the clink */
  { name:'minttu', dur: 380, draw(t){
    /* clink screen shake */
    let sx = 0, sy = 0;
    if(t >= 300 && t < 307){ sx = (t%2 ? 1 : -1); sy = (t%3 ? 0 : 1); }
    ctx.save(); ctx.translate(sx, sy);
    /* warm blur behind (overscanned so the shake never shows an edge) */
    ctx.fillStyle = '#241710'; ctx.fillRect(-3, -3, W+6, H+6);
    ctx.fillStyle = 'rgba(201,120,40,0.24)';
    ctx.fillRect(0, 36, W, 14); ctx.fillRect(0, 70, W, 10);
    for(let i = 0; i < 6; i++){
      ctx.fillStyle = `rgba(255,196,110,${0.10 + 0.05*Math.sin(t*0.03+i*2)})`;
      ctx.fillRect((i*57 + 21) % W, 30 + (hash(i,3) % 50), 4, 4);
    }
    /* the counter, close */
    ctx.fillStyle = P.counter;   ctx.fillRect(-3, 108, W+6, H-108+3);
    ctx.fillStyle = P.counterHi; ctx.fillRect(-3, 108, W+6, 1);
    ctx.fillStyle = 'rgba(67,48,29,0.6)';
    for(let x = 0; x < W; x += 26) ctx.fillRect(x + (x*7)%9, 118 + (x%3)*9, 20, 1);
    const pool = ctx.createRadialGradient(160, 108, 8, 160, 108, 110);
    pool.addColorStop(0, 'rgba(255,214,150,0.18)');
    pool.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = pool; ctx.fillRect(0, 60, W, 100);
    /* the two glasses (they lean in for the clink, then settle) */
    const cl = t < 296 ? 0 : t < 304 ? (t-296)*1.6 : Math.max(0, 12.8 - (t-304)*0.7);
    const lv1 = Math.round(clamp01((t-70)/60) * 11);
    const lv2 = Math.round(clamp01((t-150)/60) * 11);
    const glassAt = (gx, lean, lv) => {
      ctx.save();
      ctx.translate(gx+7, 108); ctx.rotate(lean); ctx.translate(-(gx+7), -108);
      if(lv > 0){
        ctx.fillStyle = 'rgba(232,246,242,0.85)';
        ctx.fillRect(gx+2, 104-lv, 10, lv);
        ctx.fillStyle = '#f4fcfa'; ctx.fillRect(gx+2, 104-lv, 10, 1);
      }
      ctx.fillStyle = P.glass;
      ctx.fillRect(gx, 86, 2, 19); ctx.fillRect(gx+12, 86, 2, 19);
      ctx.fillRect(gx, 105, 14, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(gx, 86, 2, 4);
      ctx.restore();
    };
    glassAt(128 + cl, cl*0.022, lv1);
    glassAt(178 - cl, -cl*0.022, lv2);
    /* the white glint tick at the moment of contact */
    if(t >= 300 && t < 310){
      const k = t - 300;
      ctx.fillStyle = `rgba(255,255,255,${1 - k/10})`;
      ctx.fillRect(159, 84, 2, 2);
      ctx.fillRect(159, 80 - k, 2, 2); ctx.fillRect(159, 88 + k, 2, 2);
      ctx.fillRect(155 - k, 84, 2, 2); ctx.fillRect(163 + k, 84, 2, 2);
    }
    /* the bottle: in, pour one, pour two, out */
    if(t >= 30 && t < 254){
      const g1 = { x: 128+8, y: 60 }, g2 = { x: 178+8, y: 60 };
      let bx, by, ang;
      if(t < 64){ const u = easeOut((t-30)/34);
        bx = lerp(330, g1.x, u); by = lerp(16, g1.y, u); ang = lerp(-0.5, -1.9, u); }
      else if(t < 134){ bx = g1.x; by = g1.y + Math.sin(t*0.2)*0.5; ang = -1.9; }
      else if(t < 150){ const u = easeOut((t-134)/16);
        bx = lerp(g1.x, g2.x, u); by = g1.y - Math.sin(u*Math.PI)*6; ang = -1.9; }
      else if(t < 214){ bx = g2.x; by = g2.y + Math.sin(t*0.2)*0.5; ang = -1.9; }
      else { const u = easeOut((t-214)/40);
        bx = lerp(g2.x, 348, u); by = lerp(g2.y, -20, u); ang = lerp(-1.9, -0.4, u); }
      /* pour streams (drawn beneath the bottle mouth) */
      const pouring1 = t >= 70 && t < 130, pouring2 = t >= 154 && t < 210;
      if(pouring1 || pouring2){
        const gx = pouring1 ? 128 : 178, lv = pouring1 ? lv1 : lv2;
        ctx.fillStyle = 'rgba(235,248,250,0.9)';
        ctx.fillRect(gx+6, 64, 2, 104 - lv - 64);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(gx+6, 64 + ((t*3) % Math.max(1, 104-lv-64)), 2, 2);   // falling gleam
        ctx.fillRect(gx+4 - (t%2)*2, 102 - lv, 1, 1);                       // splash fleck
      }
      ctx.save();
      ctx.translate(Math.round(bx), Math.round(by)); ctx.rotate(ang);
      minttuBottle();
      ctx.restore();
    }
    ctx.restore();
    if(t < 5){ ctx.fillStyle = `rgba(255,255,255,${0.2*(1-t/5)})`; ctx.fillRect(0,0,W,H); }
  }},

  /* 5 ─ the two of them, glasses raised; the lake going gold outside */
  { name:'toast', dur: 360, draw(t){
    const z = 1 + clamp01(t/360)*0.05;
    ctx.save();
    ctx.translate(176, 100); ctx.scale(z, z); ctx.translate(-176, -100);
    barRoom(t);
    /* the pair, face to face on the stools */
    figure(138, 102, 2, { pose:'sit', facing: 1, scarfT: t, scarfLen: 2 });
    figure(198, 102, 2, { who:'andy', pose:'sit', facing: -1 });
    /* raised arms + the minttu glasses */
    ctx.fillStyle = P.ink;
    ctx.fillRect(150, 112, 4, 3); ctx.fillRect(154, 107, 3, 5);     // player's arm
    ctx.fillStyle = P.jumper;
    ctx.fillRect(192, 112, 4, 3); ctx.fillRect(189, 107, 3, 5);     // Andy's arm
    raisedGlass(155, 99, Math.floor(t/40)%2 === 0);
    raisedGlass(186, 97, Math.floor(t/40)%2 === 1);
    /* the minttu bottle resting between them on the counter */
    ctx.fillStyle = 'rgba(214,232,236,0.8)'; ctx.fillRect(168, 88, 7, 16);
    ctx.fillStyle = '#f4f6f6'; ctx.fillRect(169, 93, 5, 6);
    ctx.fillStyle = P.labelBlue; ctx.fillRect(169, 93, 5, 1);
    ctx.fillStyle = 'rgba(214,232,236,0.9)'; ctx.fillRect(170, 84, 3, 4);
    ctx.restore();
    /* held warmth: a soft golden vignette breathing very slightly */
    const gv = ctx.createRadialGradient(W/2, 96, 60, W/2, 96, 210);
    gv.addColorStop(0, 'rgba(255,190,110,0)');
    gv.addColorStop(1, `rgba(120,60,20,${0.16 + 0.02*Math.sin(t*0.02)})`);
    ctx.fillStyle = gv; ctx.fillRect(0, 0, W, H);
    if(t < 5){ ctx.fillStyle = `rgba(255,244,214,${0.25*(1-t/5)})`; ctx.fillRect(0,0,W,H); }
  }},

  /* 6 ─ title card: the wordmark — and this time the line runs complete */
  { name:'title', dur: 450, draw(t){
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
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
    /* the yellow line draws itself — unbroken, edge to edge of the word */
    const lx0 = 78, lx1 = 226, ly = 108;
    if(t >= 80){
      const head = Math.min(lx1, lx0 + (t-80)*2.4);
      ctx.fillStyle = P.line;
      ctx.fillRect(lx0, ly, head-lx0, 2);
      if(head < lx1){ ctx.fillStyle = '#fff3c4'; ctx.fillRect(head-2, ly, 2, 2); }
      else{
        const done = t - 80 - (lx1-lx0)/2.4;                        // completion pulse
        if(done < 10){
          ctx.fillStyle = `rgba(255,226,122,${(10-done)/10})`;
          ctx.fillRect(lx0, ly-1, lx1-lx0, 4);
        }
      }
    }
    /* thanks for playing */
    if(t >= 240){
      const a2 = t < 252 ? 0.3 : t < 264 ? 0.65 : 1;
      ctx.globalAlpha = a2;
      ctx.fillStyle = '#9a948a'; ctx.font = mono(8);
      const msg = 'thanks for playing';
      ctx.fillText(msg, 160 - ctx.measureText(msg).width/2, 132);
      ctx.globalAlpha = 1;
    }
    if(t > 390){
      ctx.fillStyle = `rgba(0,0,0,${clamp01((t-390)/60)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }},
  ];

  /* ---------- the player: cuts, letterbox, skip ---------- */

  const params = new URLSearchParams(location.search);

  let gt = 0;                                     // global frame clock
  const wantShot = parseInt(params.get('outroshot') || '', 10);
  if(wantShot >= 1 && wantShot <= SHOTS.length){
    for(let i = 0; i < wantShot-1; i++) gt += SHOTS[i].dur;
    gt += Math.min(parseInt(params.get('t') || '', 10) || 0, SHOTS[wantShot-1].dur - 1);
  }
  const hold = params.has('hold');

  let raf = 0, done = false;
  let acc = 0, last = performance.now();
  const startGt = gt;

  function finish(){
    if(done) return;
    done = true;
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onSkip, true);
    canvas.removeEventListener('pointerdown', onSkip, true);
    onDone();
  }
  const onSkip = () => { if(gt - startGt >= 60) finish(); };        // armed after 1s
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
    if(gt - startGt > 120 && !hold){
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
