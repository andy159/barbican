// Generates the estate route level (360x56) and writes levels/highwalk.js.
// v2: harder platforming, full-height Cromwell Tower with staged climb.
import { writeFileSync } from 'node:fs';

const W = 360, H = 56;
const g = Array.from({length: H}, () => Array(W).fill(' '));

function set(x0, x1, y0, y1, ch, allow = false){
  for(let y = y0; y <= y1; y++)
    for(let x = x0; x <= x1; x++){
      if(!allow && g[y][x] !== ' ' && g[y][x] !== ch)
        throw new Error(`conflict at ${x},${y}: '${g[y][x]}' vs '${ch}'`);
      g[y][x] = ch;
    }
}

/* ---- S1: podium walk (cols 0-57), surface row 48 ---- */
set(4,4,46,46,'P');
set(0,19,48,48,'='); set(23,33,48,48,'='); set(38,47,48,48,'='); set(51,57,48,48,'=');
set(0,19,49,55,'#'); set(23,33,49,55,'#'); set(38,47,49,55,'#'); set(51,57,49,55,'#');
set(20,22,53,55,'#');                       // trench 1 floor (3 wide, 5 deep)
set(34,37,54,55,'#');                       // trench 2 floor (4 wide, 6 deep)
set(7,7,47,47,'B');                         // bench: first checkpoint

/* ---- S2: Gilbert Bridge (cols 58-108), surface row 48 ----
   58-64 . gap5 . 72-77 . gap6 . island 84-85 . gap5 . 91-108 */
set(58,66,48,48,'='); set(72,77,48,48,'='); set(84,85,48,48,'='); set(91,108,48,48,'=');
set(58,66,49,49,'#'); set(72,77,49,49,'#'); set(84,85,49,49,'#'); set(91,108,49,49,'#');
set(61,62,50,52,'#'); set(74,75,50,52,'#'); set(84,85,50,52,'#'); set(96,97,50,52,'#'); set(104,105,50,52,'#');
set(48,50,53,55,'W'); set(58,107,53,55,'W'); // the lake
set(105,105,47,47,'B');                     // bench: bridge end

/* ---- S3: service shaft + secret alcove (cols 108-140), floor row 48 ---- */
set(109,115,48,48,'='); set(116,123,48,48,'='); set(124,129,48,48,'=');
set(130,133,48,48,'-');                     // scuffed line marks the secret
set(108,123,49,55,'#');                     // ground mass under shaft
set(124,133,49,51,'#');                     // pocket floor over the alcove
set(124,139,52,55,'#');                     // alcove floor
set(140,140,42,55,'#');                     // pocket east wall
set(116,117,30,45,'T');                     // shaft left wall (door rows 46-47)
set(122,123,33,45,'T');                     // shaft right wall (door rows 46-47)
set(138,139,49,51,'#');                     // alcove escape step

/* ---- S4: Speed Highwalk (row 32), cols 122-213 ----
   122-143 . gap5 . 149-153 . gap6 . 160-164 . gap4 . cap 169-170 .
   gap4 . cap 175-176 . gap5 . 182-213 */
for(const [a,b] of [[122,143],[149,153],[160,164],[182,213]]){
  set(a,b,32,32,'=');
  set(a === 122 ? 124 : a, b, 33, 34, '#');   // slab clears the shaft wall it rests on
}
set(132,132,31,31,'#'); set(135,135,31,31,'#'); set(138,138,31,31,'#'); set(141,141,31,31,'#'); // vault crests
set(169,170,32,32,'='); set(175,176,32,32,'=');           // pillar-cap islands
set(169,170,33,55,'#'); set(175,176,33,55,'#');           // their pillars
set(150,151,35,55,'#'); set(190,191,35,55,'#'); set(200,201,35,55,'#');  // undercroft pillars
set(190,190,31,31,'B');                     // bench: mid highwalk

/* ---- S5: Cromwell Tower (cols 213-243) — interior climb in three
   stages: lobby (32) -> shaft A -> LEVEL 15 mezzanine (24) -> shaft B
   -> LEVEL 28 slab (16) -> shaft C -> roof, LEVEL 43 (6). ---- */
set(214,215,2,29,'T');                      // west face, full height (door rows 30-31)
for(let r = 3; r <= 27; r += 3) set(213,213,r,r,'<');     // balcony prows on the face
set(214,243,33,55,'T');                     // tower mass below deck
set(216,235,32,32,'=');                     // lobby floor
set(214,215,32,32,'T', true); set(236,243,32,32,'T', true); // wall feet
set(222,223,17,29,'T');                     // shaft A west wall (door rows 30-31)
set(228,229,25,31,'T');                     // shaft A east wall
set(228,233,24,24,'#');                     // LEVEL 15 mezzanine slab
set(232,233,17,23,'T');                     // shaft B west wall
set(238,239,17,31,'T');                     // shaft B east wall
set(230,233,25,31,'T');                     // fill the dead pocket under the mezzanine
                                            // (the 234-237 slot becomes a recovery shaft)
set(216,233,16,16,'#'); set(238,243,16,16,'#');   // LEVEL 28 slab (shaft B mouth 234-237)
set(220,221,8,13,'T');                      // shaft C east wall (door rows 14-15)
set(240,243,7,13,'T');                      // upper mass east (headroom over LEVEL 28)
set(220,243,6,6,'=');                       // the roof
set(242,243,4,5,'T');                       // crown stub at the east edge
set(230,230,23,23,'B');                     // bench: LEVEL 15
set(224,224,5,5,'B');                       // bench: roof
set(238,238,5,5,'K');                       // the flat key

/* ---- S6: terrace roof + descent + lakeside (cols 252-359) ---- */
set(248,274,20,20,'=');  set(248,274,21,55,'T');   // terrace-block roof on its mass
set(256,256,19,19,'#'); set(260,260,19,19,'#'); set(264,264,19,19,'#'); set(268,268,19,19,'#'); // vault crests
set(272,272,19,19,'B');                     // bench: terrace roof
for(const [a,b,r] of [[278,282,24],[286,290,28],[294,298,32],[302,306,36],[310,314,40],[318,322,44]]){
  set(a,b,r,r,'=');
  set(a,b,r+1,r+1,'#');
}
set(326,335,48,48,'='); set(326,335,49,51,'#');  // lakeside terrace
set(340,341,48,48,'='); set(340,341,49,49,'#');  // stepping stones
set(346,347,48,48,'='); set(346,347,49,49,'#');
set(351,359,48,48,'='); set(351,359,49,51,'#');  // way out
set(328,328,47,47,'B');                     // bench: lakeside
set(276,359,52,55,'W');                     // lake basin under descent + stones

const rows = g.map(r => r.join('').replace(/ +$/,''));

const planters = [[13,48],[31,48],[45,48],[74,48],[97,48],[136,52],[138,52],
                  [162,32],[196,32],[207,32],[218,32],[231,23],[266,20],[331,48]];
const signs = [
  [10,46,'FROBISHER WALK →'],
  [20,52,'WALL JUMP ↑'],
  [60,46,'GILBERT BRIDGE →'],
  [110,46,'SPEED HIGHWALK ↑'],
  [135,51,'OLD PAINT STORE'],
  [126,30,'SPEED HIGHWALK →'],
  [196,30,'CROMWELL TOWER →'],
  [217,30,'LOBBY'],
  [224,28,'STAIRS ↑'],
  [225,18,'LEVEL 15 →'],
  [233,22,'LEVEL 15'],
  [241,15,'LEVEL 28'],
  [222,4,'LEVEL 43 · ROOF'],
  
  [327,45,'LAKESIDE TERRACE'],
  [353,46,'WAY OUT →'],
];

const out = `/* The estate route — generated by tools-side script, still plain ASCII.
   '#' concrete, '=' walkway + Yellow Line, '-' scuffed line (secrets),
   'T' tower facade, '<' balcony prow, 'P' spawn, 'B' bench (checkpoint),
   'W' water (hazard), 'H' hoarding.
   Route: podium walk (wall-jump trenches) -> Gilbert Bridge (island hop)
   -> service shaft climb + secret alcove -> Speed Highwalk (pillar caps)
   -> Cromwell Tower (lobby -> shaft A -> mezzanine bench -> shaft B ->
   roof) -> terrace roofs -> descent -> lakeside stones -> way out.
   Run tools/verify-physics.js after editing. */
export const HIGHWALK = {
  id: 'estate-route',
  tiles: [
${rows.map(r => JSON.stringify(r) + ',').join('\n')}
  ],
  planters: ${JSON.stringify(planters)},
  interiors: [[214,7,243,31]],
  lamps: [[214,29],[229,23],[221,15],[221,7]],
  doors: [[214,30,215,31]],
  signs: [
${signs.map(([tx,ty,text]) => `    { tx: ${tx}, ty: ${ty}, text: ${JSON.stringify(text)} },`).join('\n')}
  ],
};
`;
writeFileSync(new URL('../levels/highwalk.js', import.meta.url), out);
console.log(`written: ${W}x${H}, ${rows.reduce((n,r)=>n+r.length,0)} chars`);
