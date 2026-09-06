/* The highwalk test room — '#' concrete, '=' walkway (yellow line on
   top), 'P' spawn, 'H' hoarding (breaks to barge). Missing floor = pit.
   8x8 tiles. Gauntlets, left to right: platform hops → wall-jump
   chimney (10-tile climb, cols 100-107) → top ledge → 9-tile dash gap
   (cols 124-132) → one-way drop (cols 147-149) into the barge corridor
   (hoarding at col 158) → way out. Run tools/verify-physics.js after
   editing (rows are also machine-checked there). */
export const HIGHWALK = {
  id: 'highwalk',
  tiles: [
"",
"",
"                                                                                                          ==================         ==============",
"                                                                                                          ##################         ##############",
"                                                                                                    ##    ##########",
"                                                                                                    ##    ##",
"                                                                                                    ##    ##                                      #     ##################",
"                                                                                                    ##    ##                                      #           H          #",
"                                                                                                    ##    ##                                      #           H          #",
"                                                                                      ### ###             ##                                      #           H          #",
"                                                                                                          ##                                      #======================#",
"                                                                                                          ##                                      ########################",
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
  planters: [[6,20],[19,20],[29,20],[41,20],[73,20],[94,12],[111,2],[164,10]],
  signs: [
    { tx: 86, ty: 6,  text: 'HIGHWALK →' },
    { tx: 87, ty: 11, text: 'WALL JUMP ↑' },
    { tx: 115, ty: 1, text: 'DASH →' },
    { tx: 149, ty: 8, text: 'BARGE →' },
    { tx: 161, ty: 9, text: 'WAY OUT →' },
  ],
};
