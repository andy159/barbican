# Barbican Type 20 — Furnishing & Window View Spec

Companion to `barbican-flat.md` (which owns the floor plan, wall/opening geometry and
architectural palette — read it first). This document answers two questions for the 3D
interior: **what furniture goes in the rooms**, and **exactly what is seen through the
living-room window wall**. Room names below match the `rooms[]` in `barbican-flat.md`
(hall, kitchen, bedroom, bathroom, living, study, plus balcony).

---

## 1. The canonical Barbican interior look

The Barbican interior has become a genre of its own, documented obsessively by estate
agents (The Modern House and Inigo both treat Barbican listings as a house speciality),
by Anton Rodriguez's photo book *Residents: Inside the Iconic Barbican Estate* (22 flats,
2016 — serialised on Dezeen and The Spaces), and by Barbican Living's interiors pages.
Across all of them the same look repeats, because the architecture demands it: white
walls, ~2.5 m ceilings, a full-width glass wall, warm timber floor. Residents furnish
**low, warm and mid-century** so nothing competes with the window.

What actually recurs in the photographs:

- **Seating:** Eames lounge chair + ottoman (rosewood shell, black leather) is almost a
  cliché of Barbican listings; Robin Day's Hille sofas (British, contemporary with the
  estate) in oatmeal or burnt-orange wool; Eames DSW/DSR shells at desks and tables;
  Hans Wegner CH24 "Wishbone" chairs around teak dining tables; Ercol studio couches
  and daybeds. Houzz's Barbican round-up notes mid-century furniture suits "the warm,
  honeyed tones of the hardwood window and door frames."
- **Storage:** String shelving (the single most Barbican piece — a light wire-and-veneer
  ladder system that doesn't block the white wall), G-Plan and Ercol teak sideboards,
  Danish dressers. Open shelves carry **Penguin paperback runs** (the orange spines are
  a recurring colour accent in Rodriguez's photos), studio pottery, and record sleeves.
- **Lighting:** Anglepoise 1227 on desks, Louis Poulsen PH5 over the dining table,
  mushroom/opal bedside lamps. No ceiling roses — the slab is bare, so pendants drop on
  long flexes and floor lamps do the rest.
- **Sound:** Braun audio (the SK-series "Snow White's coffin" record player, Dieter Rams
  radios and clocks) — Rams-worship and the Barbican aesthetic are the same fandom.
- **Textiles:** flat-weave and rya rugs on the timber floor (burnt orange, mustard,
  olive geometrics), wool throws, paper-cord and cane seats.
- **Plants:** monstera and rubber plants at the window wall, ferns in the internal
  bathroom, geraniums/pelargoniums in the balcony boxes (the estate's signature
  spilling blooms — already in the game's art direction).
- **Palette check against photos:** everything sits on white `#f2efe9` walls and
  mid-brown board floor `#b98a52`; the furniture supplies teak `#8a5a33`, rosewood
  `#4e2a1e`, oatmeal `#d8cfc0`, burnt orange `#c1502e`, mustard `#d9a521`, olive
  `#3d4f43`, black leather `#1e1c1a`, chrome `#c9ced2`, soaped oak `#c8b590`.
  Saturated colour appears only in small doses (a rug, a kettle, Penguin spines,
  the Valentine typewriter) — the big surfaces stay quiet.

One game-specific plant: the framed print in the hall is the estate's **wayfinding
signage** (white/yellow `#f7c623` on dark grey) — a diegetic nod to the Yellow Line.

## 2. FURNITURE MANIFEST

Catalog of pieces to model/place. `box` = [width, depth, height] in meters (object
bounding size, not world position — `barbican-flat.md` owns placement geometry; its
`furniture[]` blocks can be replaced by instances of these). Multiples noted in `note`.

```json
[
  { "name": "hille_sofa_robin_day_3seat", "room": "living", "box": [1.95, 0.85, 0.72], "color": "#d8cfc0", "accent": "#8a5a33", "note": "Oatmeal wool on low teak rail frame; against west wall facing window" },
  { "name": "eames_lounge_chair", "room": "living", "box": [0.84, 0.85, 0.84], "color": "#4e2a1e", "accent": "#1e1c1a", "note": "Rosewood shells, black leather; angled 30deg toward window wall" },
  { "name": "eames_ottoman", "room": "living", "box": [0.66, 0.55, 0.44], "color": "#4e2a1e", "accent": "#1e1c1a", "note": "Pairs with lounge chair, 0.2m in front of it" },
  { "name": "string_shelving_2bay", "room": "living", "box": [1.6, 0.3, 2.0], "color": "#9a6a3c", "accent": "#e8e4da", "note": "White wire ladders, teak shelves on west wall; holds books, pottery, radio" },
  { "name": "coffee_table_teak", "room": "living", "box": [1.2, 0.6, 0.45], "color": "#8a5a33", "accent": null, "note": "Danish surfboard profile, centered on rug" },
  { "name": "gplan_sideboard", "room": "living", "box": [2.0, 0.46, 0.75], "color": "#8a5a33", "accent": "#5c3226", "note": "Long teak sideboard on east living wall; record player on top, LPs below" },
  { "name": "braun_sk6_record_player", "room": "living", "box": [0.58, 0.29, 0.24], "color": "#ece8e0", "accent": "#c9ced2", "note": "Snow White's coffin: white steel, clear perspex lid, on sideboard" },
  { "name": "record_crate_lps", "room": "living", "box": [0.35, 0.33, 0.35], "color": "#2e2a26", "accent": "#c1502e", "note": "Floor crate leaning 30 sleeves beside sideboard; one sleeve propped face-out" },
  { "name": "rya_rug_living", "room": "living", "box": [2.0, 1.4, 0.03], "color": "#c1502e", "accent": "#d9a521", "note": "Burnt-orange shag geometric under coffee table, on parquet" },
  { "name": "ph5_pendant", "room": "living", "box": [0.5, 0.5, 0.27], "color": "#ece8e0", "accent": "#c93b47", "note": "Louis Poulsen layered shades on long flex, 1.75m over dining table" },
  { "name": "dining_table_round_teak", "room": "living", "box": [1.1, 1.1, 0.73], "color": "#8a5a33", "accent": null, "note": "Round teak, near window end of living room" },
  { "name": "wishbone_ch24_chairs", "room": "living", "box": [0.55, 0.51, 0.76], "color": "#c8b590", "accent": "#ddd2b6", "note": "x4 around dining table; soaped oak, paper-cord seats" },
  { "name": "monstera_terracotta", "room": "living", "box": [0.6, 0.6, 1.3], "color": "#4f8a3d", "accent": "#b8674a", "note": "Big split-leaf plant in window corner, leaves toward glass" },
  { "name": "studio_pottery_trio", "room": "living", "box": [0.35, 0.15, 0.3], "color": "#9c5038", "accent": "#d8cfc0", "note": "Three thrown vases, speckled oatmeal glaze, on String shelf" },
  { "name": "aalto_stool60_pair", "room": "living", "box": [0.38, 0.38, 0.44], "color": "#d9c49a", "accent": "#2e2a26", "note": "x2 stacked by window; birch bent legs, one black seat" },
  { "name": "screenprint_framed", "room": "living", "box": [0.7, 0.03, 0.9], "color": "#d9a521", "accent": "#2e2a26", "note": "Abstract 60s screenprint, thin black frame, over sofa" },
  { "name": "penguin_paperback_stack", "room": "living", "box": [0.13, 0.19, 0.25], "color": "#e8622d", "accent": "#f2ede1", "note": "Loose stack on coffee table, orange/white banded spines" },
  { "name": "drinks_tray", "room": "living", "box": [0.45, 0.3, 0.25], "color": "#c9ced2", "accent": "#8a5a33", "note": "Chrome tray, two glasses and decanter, on sideboard" },
  { "name": "desk_teak", "room": "study", "box": [1.3, 0.65, 0.73], "color": "#8a5a33", "accent": null, "note": "Against study east wall, faces the window slice" },
  { "name": "eames_dsw_chair", "room": "study", "box": [0.47, 0.55, 0.81], "color": "#d9a521", "accent": "#d9c49a", "note": "Mustard shell on birch dowel legs, at desk" },
  { "name": "anglepoise_1227", "room": "study", "box": [0.2, 0.2, 0.55], "color": "#2e2a26", "accent": "#c9ced2", "note": "Black, chrome springs, sprung over the typewriter" },
  { "name": "olivetti_valentine", "room": "study", "box": [0.34, 0.35, 0.12], "color": "#c93b47", "accent": "#2e2a26", "note": "Red portable typewriter on desk, sheet of paper in platen" },
  { "name": "penguin_wall_shelf_run", "room": "study", "box": [1.8, 0.22, 1.9], "color": "#9a6a3c", "accent": "#e8622d", "note": "Full-height book wall on study north wall, orange spine mass" },
  { "name": "daybed_studio_couch", "room": "study", "box": [1.9, 0.8, 0.5], "color": "#3d4f43", "accent": "#8a5a33", "note": "Olive wool cushions on teak frame under window; doubles as guest bed" },
  { "name": "plan_chest", "room": "study", "box": [0.9, 0.6, 0.7], "color": "#5c3226", "accent": "#c9ced2", "note": "Six shallow drawers, chrome pulls; prints half-pulled from top drawer" },
  { "name": "rubber_plant", "room": "study", "box": [0.5, 0.5, 1.1], "color": "#2e5c34", "accent": "#ece8e0", "note": "Ficus elastica in white cylinder pot, corner by partition" },
  { "name": "bed_low_teak", "room": "bedroom", "box": [1.5, 2.0, 0.35], "color": "#8a5a33", "accent": "#f2ede1", "note": "Low platform frame, white linen, headboard to west wall" },
  { "name": "wool_blanket_folded", "room": "bedroom", "box": [1.4, 0.5, 0.05], "color": "#d9a521", "accent": "#3d4f43", "note": "Mustard blanket with olive stripe folded across bed foot" },
  { "name": "bedside_tables_pair", "room": "bedroom", "box": [0.45, 0.35, 0.5], "color": "#8a5a33", "accent": null, "note": "x2 single-drawer teak cubes flanking bed" },
  { "name": "mushroom_lamps_pair", "room": "bedroom", "box": [0.2, 0.2, 0.35], "color": "#ece8e0", "accent": "#c9ced2", "note": "x2 opal glass mushroom lamps, one per bedside table" },
  { "name": "danish_dresser_6drawer", "room": "bedroom", "box": [1.15, 0.45, 0.8], "color": "#9a6a3c", "accent": "#5c3226", "note": "Under north window; hairbrush and dish of keys on top" },
  { "name": "braun_alarm_clock", "room": "bedroom", "box": [0.08, 0.05, 0.08], "color": "#1e1c1a", "accent": "#d9a521", "note": "Rams-style black travel clock, mustard second hand, on bedside table" },
  { "name": "mirror_full_length", "room": "bedroom", "box": [0.5, 0.04, 1.6], "color": "#8a5a33", "accent": "#c9ced2", "note": "Teak-framed, leaning against wardrobe wall end" },
  { "name": "rya_rug_bedside", "room": "bedroom", "box": [1.2, 0.7, 0.03], "color": "#6b6b3a", "accent": "#d8cfc0", "note": "Small olive/oatmeal rug on the getting-out side of bed" },
  { "name": "wardrobe_builtin_sliding", "room": "bedroom", "box": [2.0, 0.6, 2.3], "color": "#e8e4da", "accent": "#8a5a33", "note": "Full-height white sliders with teak finger pulls, east bedroom wall" },
  { "name": "enamel_kettle", "room": "kitchen", "box": [0.22, 0.18, 0.22], "color": "#c1502e", "accent": "#1e1c1a", "note": "Burnt-orange enamel, black handle, sits on one of the 4-in-a-row hobs" },
  { "name": "casserole_pair", "room": "kitchen", "box": [0.3, 0.24, 0.18], "color": "#d2622a", "accent": "#f2ede1", "note": "x2 volcanic-orange cast-iron pots stacked on worktop end" },
  { "name": "chrome_toaster", "room": "kitchen", "box": [0.3, 0.2, 0.22], "color": "#c9ced2", "accent": "#1e1c1a", "note": "Rounded chrome slab beside larder unit" },
  { "name": "open_shelf_crockery", "room": "kitchen", "box": [0.9, 0.2, 0.25], "color": "#8a5a33", "accent": "#f2ede1", "note": "Teak shelf over worktop: white cups on hooks, stacked plates" },
  { "name": "kitchen_stool_birch", "room": "kitchen", "box": [0.38, 0.38, 0.65], "color": "#d9c49a", "accent": "#1e1c1a", "note": "Aalto K65 high stool tucked at the pull-out breakfast bar" },
  { "name": "wall_clock_kitchen", "room": "kitchen", "box": [0.25, 0.05, 0.25], "color": "#f2ede1", "accent": "#1e1c1a", "note": "Plain white dial, black hands, over the door" },
  { "name": "fruit_bowl_teak", "room": "kitchen", "box": [0.28, 0.28, 0.08], "color": "#8a5a33", "accent": "#d2622a", "note": "Turned teak bowl of oranges by the north window (grille light)" },
  { "name": "tea_towel_rail", "room": "kitchen", "box": [0.4, 0.05, 0.5], "color": "#d8cfc0", "accent": "#c1502e", "note": "Striped towel hung on oven rail below the hobs" },
  { "name": "hang_it_all_coatrack", "room": "hall", "box": [0.5, 0.17, 0.37], "color": "#c93b47", "accent": "#d9a521", "note": "Eames multicolour ball hooks by entry door; one yellow scarf hanging" },
  { "name": "hall_bench_slatted", "room": "hall", "box": [0.9, 0.32, 0.42], "color": "#8a5a33", "accent": "#1e1c1a", "note": "Teak slat bench, two pairs of shoes beneath" },
  { "name": "estate_signage_print", "room": "hall", "box": [0.5, 0.02, 0.7], "color": "#3a3a38", "accent": "#f7c623", "note": "Framed Barbican wayfinding sign, white/yellow on dark grey - Yellow Line nod" },
  { "name": "hall_runner", "room": "hall", "box": [2.0, 0.7, 0.02], "color": "#6b6b3a", "accent": "#d8cfc0", "note": "Olive flat-weave runner from door toward living room" },
  { "name": "towel_set_mustard", "room": "bathroom", "box": [0.6, 0.1, 0.7], "color": "#d9a521", "accent": "#f4f2ec", "note": "Two towels on chrome rail beside basin" },
  { "name": "mirror_cabinet", "room": "bathroom", "box": [0.6, 0.15, 0.5], "color": "#f4f2ec", "accent": "#c9ced2", "note": "Aluminium-edged cabinet over basin; internal room, so lamp-lit" },
  { "name": "bath_mat_oatmeal", "room": "bathroom", "box": [0.7, 0.45, 0.02], "color": "#d8cfc0", "accent": null, "note": "Cotton mat alongside tub on mosaic tile" },
  { "name": "boston_fern", "room": "bathroom", "box": [0.4, 0.4, 0.35], "color": "#4f8a3d", "accent": "#ece8e0", "note": "Fern in white pot on cistern shelf - thrives in the windowless damp" },
  { "name": "balcony_planters_geranium", "room": "balcony", "box": [0.5, 0.25, 0.25], "color": "#b8674a", "accent": "#c93b47", "note": "x3 terracotta troughs hooked over the concrete front, red/pink blooms spilling" },
  { "name": "bistro_chairs_folding", "room": "balcony", "box": [0.45, 0.5, 0.8], "color": "#2e2a26", "accent": "#8a5a33", "note": "x2 black steel folders with teak slats, on red quarry tiles" },
  { "name": "bistro_table", "room": "balcony", "box": [0.6, 0.6, 0.7], "color": "#f2ede1", "accent": "#2e2a26", "note": "Small white-top cafe table between chairs; espresso cup prop" },
  { "name": "watering_can_galvanised", "room": "balcony", "box": [0.35, 0.2, 0.3], "color": "#a8adb0", "accent": null, "note": "Tucked in balcony corner by the planters" }
]
```

(55 entries; multiples marked x2/x3/x4 in `note` share one line.)

---

## 3. The window view — geometry and honesty note

The lake is a long east–west canal, **half a metre deep**, bordered by the terrace
blocks. Documented composition (Barbican Living, Historic England / Parks & Gardens
listing, and photo essays — see `ponds-scene.md` which shares these facts):

- **Lakeside Terrace** on the north bank in front of the Arts Centre: red-brick paving
  with eight fountains (five circular recessed with steps to the water, three on the
  terrace edge) plus **a grid of fountain jets rising straight out of the lake** under
  and near Gilbert House. Benches and café tables along the water's edge.
- **Circular planted islands** of red engineering brick in the water east of Gilbert
  House, with flower beds and seating, reached by brick spurs.
- **Gilbert House** crosses the water on **twelve giant paired concrete columns** —
  seven wide bays, seven storeys, the colonnade open above the lake so you see sky and
  water *through* it.
- **St Giles' Cripplegate**: the medieval church (ragstone body, brick upper tower) on
  its own terrace surrounded by water — the only pre-modern silhouette; a **grey heron**
  famously perches on its roof (Barbican Living's lake-fish page).
- Behind: the long balcony-banded terrace blocks with overflowing flower boxes, then
  **the towers** (Cromwell/Shakespeare from this side) closing the sky.

Honesty note: in the real blocks the lake-facing frontage varies (Barbican Living notes
upper Andrewes living rooms face Fore Street with bedrooms on the lake side, while
Speed House living rooms face the lake). The game's Type 20 (per `barbican-flat.md`)
puts the living-room window wall on the water — i.e. we model the **classic postcard
composition seen from the lake frontage of a mid-level (level 04, ~12 m up) flat**,
looking across the water at the terrace, church, colonnade and towers. Every element
below is real; only the vantage is idealised.

Stacking order near → far: balcony rail + planters → water band with shimmer →
fountain-jet row → planted brick islands → lakeside terrace with benches → Gilbert
House colonnade (right of frame) → St Giles + heron (centre-left) → far terrace-block
band → two towers → sky haze. Colours reuse the `ponds-scene.md` swatches so the
window view and the 2D ponds scene are the same world.

## 4. WINDOW VIEW SPEC

Billboard/card layers for the window wall, near → far. `depth_m` = distance from the
glass; `extent` = rough [width_m, height_m] of the painted element at that depth.
Viewer eye ≈ 12 m above lake level. Right/left placement noted per element
(frame is the 8 m window run; sun high, slightly left).

```json
[
  { "layer": "balcony", "depth_m": 1.0, "elements": [
    { "name": "quarry_tile_floor", "shape": "band", "color": "#9e4a3a", "extent": [8.0, 1.7], "note": "red quarry tiles, seen steeply foreshortened" },
    { "name": "concrete_rail_front", "shape": "band", "color": "#b5aca0", "extent": [8.0, 1.1], "note": "chamfered precast panel, pick-hammered texture" },
    { "name": "geranium_planters", "shape": "band", "color": "#b8674a", "extent": [8.0, 0.35], "note": "trough line atop rail; bloom dots #c93b47 #e87a9c #f2ede1 spilling over" }
  ]},
  { "layer": "lake_band", "depth_m": 25, "elements": [
    { "name": "water", "shape": "band", "color": "#3a6b60", "extent": [120.0, 40.0], "note": "opaque green-teal; darkens to #22422a under building shadow" },
    { "name": "shimmer_lane", "shape": "band", "color": "#8fd0b8", "extent": [120.0, 4.0], "note": "1px dash rows, sparkles #e8f6ee in a 30px sun lane; scroll sideways slowly" },
    { "name": "block_reflections", "shape": "band", "color": "#2f5248", "extent": [120.0, 10.0], "note": "vertical smears mirroring church/blocks, wobble on slow sine" }
  ]},
  { "layer": "fountain_jets", "depth_m": 40, "elements": [
    { "name": "jet_row", "shape": "jet", "color": "#eef4f2", "extent": [30.0, 3.0], "note": "6-8 white columns in a grid, staggered 4s cycles, fringe #cfeee2, ripple rings at base" }
  ]},
  { "layer": "planted_islands", "depth_m": 45, "elements": [
    { "name": "brick_island_rims", "shape": "band", "color": "#9c5038", "extent": [5.0, 0.6], "note": "x3 circular engineering-brick drums; lit rim #b8674a, waterline #6e3527" },
    { "name": "island_foliage_domes", "shape": "dome", "color": "#4f8a3d", "extent": [4.0, 1.8], "note": "planting mounds, tops #7fb84f, bloom dots; one tiny bench silhouette #4a3c30" },
    { "name": "ducks", "shape": "silhouette", "color": "#f2ede1", "extent": [0.4, 0.25], "note": "2-3 mallard dots with V-wakes near islands" }
  ]},
  { "layer": "lakeside_terrace", "depth_m": 70, "elements": [
    { "name": "terrace_paving", "shape": "band", "color": "#b8674a", "extent": [80.0, 2.0], "note": "red-brick far bank; five recessed circular fountains read as darker discs" },
    { "name": "benches_and_figures", "shape": "silhouette", "color": "#4a3c30", "extent": [1.6, 0.8], "note": "row of tiny benches + 2-3 seated figure dots along the water edge" },
    { "name": "edge_fountains", "shape": "jet", "color": "#eef4f2", "extent": [8.0, 1.5], "note": "three semicircular terrace-edge fountains, low white froth" }
  ]},
  { "layer": "gilbert_colonnade", "depth_m": 95, "elements": [
    { "name": "gilbert_house_body", "shape": "silhouette", "color": "#aaa196", "extent": [70.0, 22.0], "note": "right third of frame; 7 bays, balcony bands, flower-box dots on rails" },
    { "name": "column_pairs", "shape": "silhouette", "color": "#6f6a63", "extent": [70.0, 8.0], "note": "twelve paired columns descending into the water; sky+water visible between" },
    { "name": "colonnade_reflection", "shape": "band", "color": "#2f5248", "extent": [70.0, 4.0], "note": "column pairs mirrored and broken in the lake" }
  ]},
  { "layer": "st_giles_church", "depth_m": 115, "elements": [
    { "name": "church_body", "shape": "silhouette", "color": "#8d7f6f", "extent": [30.0, 12.0], "note": "centre-left; ragstone nave with dark arched windows" },
    { "name": "church_tower", "shape": "silhouette", "color": "#9c5038", "extent": [8.0, 22.0], "note": "brick upper tower with pale stone corner turret and weather vane" },
    { "name": "heron", "shape": "silhouette", "color": "#6a7076", "extent": [0.9, 1.0], "note": "grey heron on the church roof ridge - the estate's celebrity; rare preen animation" },
    { "name": "churchyard_trees", "shape": "dome", "color": "#2e5c34", "extent": [20.0, 8.0], "note": "plane/lime canopy massed around the church base" }
  ]},
  { "layer": "terrace_block_band", "depth_m": 150, "elements": [
    { "name": "long_block", "shape": "band", "color": "#a9a294", "extent": [160.0, 20.0], "note": "Defoe/Speed-type block: horizontal balcony bands, dark window strip, bloom dots on rails" },
    { "name": "frobisher_curve_hint", "shape": "silhouette", "color": "#9b9488", "extent": [60.0, 14.0], "note": "curved crescent block edge behind, hazier - reuse existing crescent backdrop art" }
  ]},
  { "layer": "towers", "depth_m": 300, "elements": [
    { "name": "tower_near", "shape": "silhouette", "color": "#847e74", "extent": [20.0, 123.0], "note": "Cromwell: triangular plan, serrated balcony sawtooth profile, hazed" },
    { "name": "tower_far", "shape": "silhouette", "color": "#938d82", "extent": [20.0, 116.0], "note": "Shakespeare, further left and one haze step lighter" }
  ]},
  { "layer": "sky", "depth_m": 1000, "elements": [
    { "name": "haze_band", "shape": "band", "color": "#dce9ef", "extent": [400.0, 30.0], "note": "pale horizon haze eating the tower bases" },
    { "name": "sky_gradient", "shape": "band", "color": "#aecfe4", "extent": [400.0, 200.0], "note": "hazy pale blue up to #cfe0ea at zenith of visible frame; match 2D game sky" }
  ]}
]
```

Renderer notes: mullions (dark `#2e2a26`, every ~1.33 m per `barbican-flat.md`) slice
this stack into seven vertical framed panels — compose so the heron/church land in one
pane and the Gilbert colonnade fills the two right panes. All layers below `depth_m`
150 should receive the shimmer/petal ambience; towers and sky stay still.

## Sources

Interiors / furnishing:
- https://themodernhouse.com/sales-list/andrewes-house-i — Andrewes House Type listing; "original mid-century aesthetic", Water Gardens views
- https://www.themodernhouse.com/ and https://inigo.com/ — rotating Barbican listings (Defoe, Andrewes, Gilbert); the recurring styled look described above
- https://www.dezeen.com/2016/11/06/residents-inside-iconic-barbican-estate-homes-anton-rodriguez/ — Anton Rodriguez, *Residents: Inside the Iconic Barbican Estate*
- https://thespaces.com/anton-rodriguez-photographs-life-inside-the-barbican/ — same project; full-height windows, "holiday flats at a resort" feel
- https://antonrodriguez.co.uk/barbicanresidents/ — the photo archive itself
- https://www.houzz.com/magazine/a-peek-inside-londons-iconic-midcentury-barbican-apartments-stsetivw-vs~75086089 — mid-century furniture vs honeyed timber frames
- https://www.dezeen.com/2017/01/07/emulsion-renovation-interior-brutalist-barbican-estate-apartment-london-england/ — renovated-flat palette reference
- https://barbicanlife.com/barbican-show-homes/ — the estate's original furnished show flats
- https://www.frankharris.co.uk/properties/20082297/sales — restored Type 20 interior character

View / lake:
- https://www.barbicanliving.co.uk/barbican-now/lakes/ — lake layout, half-metre depth, steps down under Gilbert House
- https://www.barbicanliving.co.uk/blocks/gilbert-house/ — twelve paired columns in the lake, seven bays, bridge beneath
- https://www.barbicanliving.co.uk/blocks/andrewes-house/ — south-bank block, eleven bays, frontage orientation
- https://www.barbicanliving.co.uk/barbican-now/lakes/fish/ — the heron on St Giles' roof
- https://www.parksandgardens.org/places/barbican-the — eight terrace fountains, fountain grid, circular brick islands with seating and flower beds
- https://en.wikipedia.org/wiki/St_Giles-without-Cripplegate — ragstone body, brick upper tower
- `docs/ponds-scene.md` — shared palette swatches and lake facts (keep the two in sync)
