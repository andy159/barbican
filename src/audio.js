/* Procedural WebAudio score — no assets, no dependencies. A slow pad
   plus a sparse pentatonic melody, colored per zone and crossfaded as
   the player moves. Starts on the first user gesture (browser rule).
   M toggles mute. Nothing here touches gameplay or the verifier. */

let ac = null, master = null, wet = null, started = false, muted = false;
let mood = 'daylight', chordAt = 0, noteAt = 0, pulseAt = 0;
let padOsc = [], padGain = null, purr = null;

/* mood definitions: root (Hz), chord sets (semitones), melody scale,
   pace (avg seconds between melody notes), brightness (lowpass Hz) */
const MOODS = {
  daylight:    { root: 220.00, chords: [[0,4,7,11],[5,9,12,16],[7,11,14,17],[2,5,9,12]],
                 scale: [0,2,4,7,9,12,14], pace: 3.2, lp: 1600, padGain: 0.050, melGain: 0.060 },
  ponds:       { root: 220.00, chords: [[0,4,7,11],[5,9,12,16],[9,12,16,19],[7,11,14,17]],
                 scale: [4,7,9,12,14,16,19], pace: 2.0, lp: 2400, padGain: 0.045, melGain: 0.065 },
  tower:       { root: 110.00, chords: [[0,7,12],[0,5,12],[0,7,10]],
                 scale: [0,3,7,10,12], pace: 6.0, lp: 700,  padGain: 0.060, melGain: 0.035 },
  interior:    { root: 146.83, chords: [[0,3,7,10],[5,8,12],[3,7,10,14],[0,3,7,10]],
                 scale: [0,3,5,7,10,12], pace: 4.5, lp: 1100, padGain: 0.055, melGain: 0.045 },
  conservatory:{ root: 130.81, chords: [[0,3,7],[0,5,8],[3,7,10],[0,3,7]],
                 scale: [0,3,5,7,10,12,15], pace: 4.0, lp: 900, padGain: 0.060, melGain: 0.040 },
  boss:        { root: 110.00, chords: [[0,3,7,10],[0,3,6,10]],
                 scale: [0,3,5,6,7,10], pace: 1.2, lp: 1200, padGain: 0.055, melGain: 0.045, pulse: true },
  mothlight:   { root: 0, chords: [], scale: [], pace: 99, lp: 400, padGain: 0, melGain: 0, purrLvl: 0.035 },
  outro:       { root: 220.00, chords: [[0,4,7,11],[5,9,14,16],[0,4,9,12],[7,11,14,19]],
                 scale: [0,4,7,9,12,16], pace: 2.2, lp: 2000, padGain: 0.055, melGain: 0.065 },
  mozart:      { root: 392.00, chords: [], scale: [], pace: 99, lp: 2600,
                 padGain: 0, melGain: 0, seq: true },
  foyer:       { root: 146.83, chords: [[0,4,7,11],[5,9,12],[2,5,9,12],[0,4,7,11]],
                 scale: [0,4,7,9,12], pace: 3.0, lp: 1400, padGain: 0.045, melGain: 0.050 },
  theatre:     { root: 98.00,  chords: [[0,3,7,14],[0,5,10,14],[0,3,8,14]],
                 scale: [0,3,7,10,14], pace: 7.0, lp: 800, padGain: 0.065, melGain: 0.035, wet: 0.55 },
  cinema:      { root: 98.00,  chords: [[0,7,12]], scale: [], pace: 99, lp: 500,
                 padGain: 0.018, melGain: 0, purrLvl: 0.018 },
  arid:        { root: 220.00, chords: [[0,3,7],[0,5,7]], scale: [0,3,7,12,15],
                 pace: 6.5, lp: 1800, padGain: 0.028, melGain: 0.038, wet: 0.12 },
};

/* Eine kleine Nachtmusik, K.525 — opening phrase, transcribed relative
   to G4. Public domain (Mozart, 1787); we synthesize, no recording.
   [semitone|null(rest), beats] at allegro ~143bpm. */
const EKN_BEAT = 0.42;
const EKN_LEAD = [
  /* the rocket */
  [0,1],[null,.5],[-5,.5],[0,1],[null,.5],[-5,.5],
  [0,.5],[-5,.5],[0,.5],[4,.5],[7,1],[null,1],
  [5,1],[null,.5],[2,.5],[5,1],[null,.5],[2,.5],
  [5,.5],[2,.5],[-1,.5],[2,.5],[-5,1],[null,1],
  /* answering phrases (close paraphrase) */
  [7,.5],[7,.5],[7,.5],[null,.5],[9,.5],[7,.5],[6,.5],[7,.5],
  [9,.5],[7,.5],[6,.5],[7,.5],[12,1],[null,1],
  [7,.5],[7,.5],[7,.5],[null,.5],[9,.5],[7,.5],[6,.5],[7,.5],
  /* descending cadence home */
  [11,.5],[9,.5],[7,.5],[5,.5],[4,.5],[2,.5],[0,1],[null,1.5],
];
const EKN_BASS = [   // simple alternating support, one note per bar-half
  [-24,2],[-24,2],[-24,2],[-17,2],
  [-19,2],[-19,2],[-17,2],[-24,2],
  [-12,2],[-17,2],[-12,2],[-17,2],
  [-12,2],[-17,2],[-19,2],[-24,2],
];

const st = n => Math.pow(2, n/12);               // semitones → ratio

function boot(){
  if(started) return;
  started = true;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  master = ac.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(ac.destination);

  /* a small generated hall: exponential-decay noise impulse */
  const rev = ac.createConvolver();
  const len = ac.sampleRate * 1.8;
  const imp = ac.createBuffer(2, len, ac.sampleRate);
  for(let ch = 0; ch < 2; ch++){
    const d = imp.getChannelData(ch);
    for(let i = 0; i < len; i++)
      d[i] = (Math.random()*2 - 1) * Math.pow(1 - i/len, 2.6);
  }
  rev.buffer = imp;
  wet = ac.createGain(); wet.gain.value = 0.35;
  wet.connect(rev); rev.connect(master);

  /* the pad: three detuned triangles through a slow lowpass */
  padGain = ac.createGain(); padGain.gain.value = 0;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
  padGain.connect(lp); lp.connect(master); padGain.connect(wet);
  padGain._lp = lp;
  for(let i = 0; i < 3; i++){
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.detune.value = (i-1) * 7;                  // gentle chorus
    const g = ac.createGain(); g.gain.value = 0;
    o.connect(g); g.connect(padGain);
    o.start();
    padOsc.push({ o, g });
  }

  /* the projector purr for the dream (off elsewhere) */
  const pbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const pd = pbuf.getChannelData(0);
  for(let i = 0; i < pd.length; i++) pd[i] = Math.random()*2 - 1;
  const psrc = ac.createBufferSource(); psrc.buffer = pbuf; psrc.loop = true;
  const pbp = ac.createBiquadFilter(); pbp.type = 'bandpass';
  pbp.frequency.value = 85; pbp.Q.value = 1.2;
  const pg = ac.createGain(); pg.gain.value = 0;
  const flutter = ac.createOscillator(); flutter.frequency.value = 24;   // frames/sec
  const fdepth = ac.createGain(); fdepth.gain.value = 0.010;
  flutter.connect(fdepth); fdepth.connect(pg.gain);
  psrc.connect(pbp); pbp.connect(pg); pg.connect(master);
  psrc.start(); flutter.start();
  purr = pg;

  setInterval(tick, 250);
}

/* one melody note: soft triangle ping with decay, into the hall */
function ping(freq, gain, dur = 1.6, when = null){
  const t = when ?? (ac.currentTime + 0.02);
  const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
  o.connect(g); g.connect(master); g.connect(wet);
  o.start(t); o.stop(t + dur + 0.1);
}

/* the boss pulse: a low, damped thump */
function thump(){
  const t = ac.currentTime + 0.02;
  const o = ac.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(82, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.09, t);
  g.gain.exponentialRampToValueAtTime(0.0005, t + 0.28);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + 0.35);
}

let seqNext = 0, seqLeadI = 0, seqBassI = 0, seqBassNext = 0;

function tickSeq(now){
  /* lookahead-schedule the Mozart, lead and bass independently */
  if(seqNext < now) { seqNext = now + 0.2; seqLeadI = 0; }
  if(seqBassNext < now) seqBassNext = seqNext;
  while(seqNext < now + 0.6){
    const [n, beats] = EKN_LEAD[seqLeadI % EKN_LEAD.length];
    if(n !== null) ping(392 * st(n), 0.12, EKN_BEAT * beats * 0.9, seqNext);
    seqNext += EKN_BEAT * beats;
    seqLeadI++;
  }
  while(seqBassNext < now + 0.6){
    const [n, beats] = EKN_BASS[seqBassI % EKN_BASS.length];
    ping(392 * st(n), 0.075, EKN_BEAT * beats * 0.95, seqBassNext);
    seqBassNext += EKN_BEAT * beats;
    seqBassI++;
  }
}

function tick(){
  if(!started || muted) return;
  const M = MOODS[mood] || MOODS.daylight;
  const now = ac.currentTime;

  if(M.seq) tickSeq(now);

  /* the projector purr (the dream, and faintly in Cinema 1) */
  purr.gain.setTargetAtTime(M.purrLvl || 0, now, 0.4);
  wet.gain.setTargetAtTime(M.wet ?? 0.35, now, 1.0);

  /* pad level + tone follow the mood */
  padGain.gain.setTargetAtTime(M.padGain, now, 1.2);
  padGain._lp.frequency.setTargetAtTime(M.lp, now, 1.0);

  /* slow chord changes */
  if(M.chords.length && now >= chordAt){
    chordAt = now + 7 + Math.random()*5;
    const chord = M.chords[Math.floor(Math.random()*M.chords.length)];
    padOsc.forEach((p, i) => {
      const n = chord[i % chord.length];
      p.o.frequency.setTargetAtTime(M.root * st(n), now, 2.5);
      p.g.gain.setTargetAtTime(0.33, now, 1.5);
    });
  }

  /* sparse melody, pentatonic-ish so wrong notes don't exist */
  if(M.scale.length && now >= noteAt){
    noteAt = now + M.pace * (0.5 + Math.random());
    const n = M.scale[Math.floor(Math.random()*M.scale.length)];
    const oct = Math.random() < 0.3 ? 2 : 1;
    ping(M.root * 2 * oct * st(n), M.melGain, mood === 'ponds' ? 2.2 : 1.6);
  }

  /* the gantry's heartbeat */
  if(M.pulse && now >= pulseAt){
    pulseAt = now + 0.62;
    thump();
  }
}

/* ---------------- public ---------------- */
export function attach(){
  const gesture = () => { boot(); if(ac && ac.state === 'suspended') ac.resume(); };
  addEventListener('keydown', gesture);
  addEventListener('pointerdown', gesture);
  addEventListener('keydown', e => {
    if(e.code === 'KeyM' && !e.repeat){
      muted = !muted;
      if(master) master.gain.setTargetAtTime(muted ? 0 : 1, ac.currentTime, 0.1);
    }
  });
}

export function setMood(next){
  if(next !== mood){
    mood = next;
    chordAt = 0;                                 // re-voice promptly on a change
    seqNext = 0; seqBassNext = 0; seqLeadI = 0; seqBassI = 0;   // Mozart from the top
    if(started && !MOODS[next]?.seq){
      /* leaving the bar: let the pad take over, silence pending seq */
    }
  }
}
