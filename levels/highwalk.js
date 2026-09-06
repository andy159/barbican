/* The highwalk test room — '#' concrete, '=' walkway (yellow line on
   top), 'P' spawn, 'H' hoarding (breaks to barge). Missing floor = pit.
   8x8 tiles. Gauntlets, left to right: platform hops → wall-jump
   chimney (10-tile climb, cols 100-107) → top ledge.
   Run tools/verify-physics.js after editing. */
export const HIGHWALK = {
  id: 'highwalk',
  tiles: [
"",
"",
"                                                                                                          ==================         ==============",
"                                                                                                          ##################         ##############",
"                                                                                                    ##    ##########",
"                                                                                                    ##    ##",
"                                                                                                    ##    ##",
"                                                                                                    ##    ##",
"                                                                                                    ##    ##",
"                                                                                      ### ###             ##",
"                                                                                                          ##",
"                                                                                                          ##",
"                                                                                    ======================##",
"                                                                                    ########################",
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
  planters: [[6,20],[19,20],[29,20],[41,20],[73,20],[94,12],[111,2]],
  signs: [
    { tx: 86, ty: 6,  text: 'HIGHWALK →' },
    { tx: 87, ty: 11, text: 'WALL JUMP ↑' },
    { tx: 115, ty: 1, text: 'DASH →' },
  ],
};
