/* The Phase 1 test room — '#' concrete, '=' walkway (yellow line on
   top), 'P' spawn. Missing floor = pit (falls to respawn). 8x8 tiles.
   Edit freely; run tools/verify-physics.js after physics changes. */
export const HIGHWALK = {
  id: 'highwalk',
  tiles: [
"",
"",
"",
"",
"",
"",
"",
"",
"",
"                                                                                      ### ###",
"",
"",
"                                                                                    ============",
"                                                                                    ############",
"                                                                                  ##",
"                                                                                  ##",
"                                                     ###         ###            ####",
"                                                                                ####",
"   P                                           ###         ###                ######",
"                                                                              ######",
"=============  ========   =======     =======                         ========######",
"#############  ########   #######     #######                         ##############",
"#############  ########   #######     #######                         ##############",
  ],
  planters: [[6,20],[19,20],[29,20],[41,20],[73,20],[94,12]],
  signs: [{ tx: 86, ty: 6, text: 'PHASE 2 →' }],
};
