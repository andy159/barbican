# Barbican Flat Interior — Research & 3D Room Spec

Research document for the walkable first-person 3D flat interior. Chosen type, sources,
and a machine-usable JSON spec (see SPEC at the bottom).

## Chosen flat type: **Type 20** (one-bed + study, Andrewes / Defoe / Speed / Thomas More House)

**Why Type 20:**
- It is the *most common* flat layout in the South Barbican terrace blocks (54 in Andrewes
  House, 59 in Defoe House, 36 in Speed House, 48 in Thomas More House), so it is the
  canonical "Barbican flat" — and the best documented (Barbican Living publishes plan
  explanations; estate agents list them constantly).
- It has the strongest visual identity per square meter: an L-shaped plan whose entire
  south frontage is a floor-to-ceiling window wall opening onto a full-width balcony over
  the lake and gardens, with the famous **sliding partition** dividing living room from
  study, the **Brooke Marine galley kitchen**, and the **Garchey** sink waste unit.
- Footprint ~71 m² (a real Andrewes House Type 20 listing measures ~791 sq ft ≈ 73.5 m²)
  — right in the 60–90 m² target and small enough to model completely.
- Runner-up considered: the Type 23 barrel-vaulted 7th-floor penthouse (same blocks). The
  vault is gorgeous but Type 23s are smaller (they lack the study) and less documented.
  If a vault is wanted later, note: put a half-cylinder ceiling (crown ≈ 3.3 m, springing
  ≈ 2.1 m) over the living room and delete the study.

### Sources
- Type 20 explanation — https://www.barbicanliving.co.uk/plans/explanation-of-flat-types/type-20/
- Type 21 (companion type sharing the bay) — https://www.barbicanliving.co.uk/plans/explanation-of-flat-types/type-21/
- Construction & materials ("Design of the flats") — https://www.barbicanliving.co.uk/what-the-flats-are-made-of/
- Garchey waste system — https://www.barbicanliving.co.uk/flats/services-2/garchey/
- Underfloor heating — https://www.barbicanliving.co.uk/flats/services-2/heating/ and https://barbicanassociation.co.uk/underfloor-heating/
- Penthouse / barrel-vault types — https://www.barbicanliving.co.uk/penthouse-flats/
- Real Type 20 listing, Andrewes House, ~791 sq ft — https://www.onthemarket.com/details/9379884/
- Brooke Marine kitchen details (4-in-a-row hobs, pull-out breakfast bar, oversize white knobs) — https://eleanorcordingbooth.substack.com/p/the-barbican-estate-what-its-like
- Original fittings overview — https://artsandculture.google.com/story/barbican-flats-layout-and-fittings-barbican-centre/5wXhypmRI1q8cw
- Interior character / restored flats — https://www.frankharris.co.uk/properties/20082297/sales , https://withbrickworks.com/buying/defoe-house-barbican

## Layout (documented facts)

Type 20 is a north–south through-flat, one structural bay wide plus a borrowed slice of
frontage. Type 20s and 21s "slot together" around each stair/lift core: the Type 20 gives
up rear (north) space to the Type 21 and in exchange takes extra *south frontage* — which
is what gives it the L-shape and the wide living room.

- **South end (lake/garden side):** one continuous glazed wall the full width of the flat,
  floor-to-ceiling, opening to a balcony that runs the whole frontage. Behind the glass,
  a large living area with a **full-height sliding partition** that closes off the eastern
  slice as a "study" (many residents use it as a second bedroom).
- **Middle:** compact entry hall (entered from the stair/lift landing), internal bathroom
  + WC (no window, mechanical extract), galley kitchen.
- **North end:** double bedroom with window; the kitchen window also faces north, borrowing
  daylight through the **galvanised steel grille floor of the escape balcony** above/outside
  (a documented detail: "purpose-made m.s. grilles, shot-blasted and galvanised, which allow
  adequate daylighting to reach the kitchen window underneath").
- Ceiling height ≈ **2.5 m** throughout (flat slab, no beams inside the flat). Door heads 2.0 m.
- No radiators anywhere: heating is **off-peak electric underfloor** cables in the slab,
  centrally switched by the Estate Office (Oct 1 – Apr 30). Model small anodised extract
  grilles in kitchen/bathroom ceilings; walls stay clean.

Dimensions below are derived: Barbican Living's plans are published as "illustrations and
approximations only" with no figures, so room sizes were reconstructed to hit the listed
~73 m² total while keeping documented proportions (wide shallow living room, 2.5 m-wide
galley kitchen, 1.7 m-deep balcony). Treat them as game-accurate, not survey-accurate.

## Materials & colors

- **Floors:** original spec is 1" Kährs hardwood-veneer board floor nailed to battens over
  insulation strips on the concrete slab — reads as warm mid-brown timber strip/parquet.
  Kitchen and bathroom: tile (bathrooms mosaic/ceramic; kitchens lino/tile). Balcony:
  the Barbican's signature **red quarry tiles**.
- **Walls:** white-painted plaster throughout (the classic Barbican interior is relentlessly
  white). Internal partitions are lightweight (softwood framing, "Verbundplatten" infill).
- **Windows/doors to balcony:** specially extruded **aluminium** frames, dark
  bronze/near-black finish. Glass above a low sill line, painted plywood spandrel panel
  below. The balcony door is a Barbican oddity worth modeling: a glazed aluminium door that
  **slides vertically**, counterbalanced by its top light (a giant sash).
- **Balcony front:** non-structural precast **concrete** panel with chamfered edges,
  pale warm grey, pick/bush-hammered texture — same family as the estate's exterior
  concrete. ~1.1 m high. Flower boxes hang on it (ties into the game's petal ambience).
- **Kitchen (Brooke Marine, yacht fitters):** off-white/melamine fronts with teak-look
  hardwood worktop; recognisable tells: **four hob rings in a single row** across the
  counter, oversized white control knobs, a **pull-out breakfast bar**, full-height larder
  unit, double stainless sink with the **Garchey** waste unit (bulb-shaped receiver under
  the sink; wet waste is flushed down a building-wide chute to a basement tank).
- **Bathroom:** internal, white sanitary ware, small-format tiles, airing cupboard with
  cold-water tank.
- **Doors:** flush teak-veneer doors, simple aluminium lever handles.

## Distinctive details worth modeling (priority order)

1. **The window wall** — full-width, floor-to-ceiling glazing with dark aluminium mullions
   at ~1.3 m spacing; low plywood spandrel (0.15 m); one vertically-sliding balcony door.
   This is 80% of the flat's identity: bright daylight flooding an all-white interior.
2. **Full-frontage balcony** with chamfered precast concrete front, red quarry tile floor,
   flower boxes; view south over the lake, fountains and St Giles' church, towers beyond.
3. **Sliding partition** between living room and study — full-height white panels that
   stack; render it half-open.
4. **Brooke Marine galley kitchen** with the 4-in-a-row hobs and Garchey sink.
5. **North escape balcony grille** outside the kitchen window — dappled light through
   galvanised steel grating.
6. No radiators (underfloor heating); small ceiling extract grilles only.
7. Furnishing character: mid-century modern — teak-and-wool sofa, **String shelving** on
   the west wall, teak dining set, low bed, built-in wardrobe wall in the bedroom.

## Geometry conventions used in the SPEC

- Units meters. **+X = east, +Z = south, Y = up. Origin = center of the entry door**
  (which sits in the flat's east wall, entered from the stair/lift landing).
  The flat therefore extends west (−X) and both north (−Z, bedroom/kitchen) and
  south (+Z, living/balcony).
- Interior area ≈ 70.9 m²; overall envelope 8.0 m (E–W) × 10.4 m (N–S) L-shape;
  balcony adds 8.0 × 1.7 m.
- In `walls[]`, an `opening`'s `x0/x1` are distances **along the wall from its `from`
  point**; `y0/y1` are heights above the floor. One opening per wall segment (walls with
  two openings are split into two segments).
- The south wall is described twice on purpose: `windowWall` declares the whole run as
  glazing (sill 0.15, head 2.4, dark mullions every ~1.33 m); its entry in `walls[]`
  carries only the sliding balcony-door opening.
- Room connectivity: entry door → hall; hall → kitchen (N), bathroom (W), bedroom (NW),
  living room (S, wide cased opening); living ↔ study via the sliding partition;
  living/study → balcony via the balcony door in the window wall.

## SPEC

```json
{
  "flatType": "Barbican Type 20 (1-bed + study, Andrewes/Defoe/Speed/Thomas More House)",
  "ceilingHeight": 2.5,
  "rooms": [
    { "name": "hall",     "rect": [-2.5, -2.6,  0.0,  0.8] },
    { "name": "kitchen",  "rect": [-2.5, -4.8,  0.0, -2.6] },
    { "name": "bedroom",  "rect": [-5.8, -4.8, -2.5, -0.9] },
    { "name": "bathroom", "rect": [-5.8, -0.9, -2.5,  0.8] },
    { "name": "living",   "rect": [-5.8,  0.8, -1.0,  5.6] },
    { "name": "study",    "rect": [-1.0,  0.8,  2.2,  5.6] }
  ],
  "walls": [
    { "from": [-5.8, -4.8], "to": [-2.5, -4.8], "opening": { "type": "window", "x0": 0.3, "x1": 2.8, "y0": 0.85, "y1": 2.3 } },
    { "from": [-2.5, -4.8], "to": [ 0.0, -4.8], "opening": { "type": "window", "x0": 0.4, "x1": 2.1, "y0": 1.0,  "y1": 2.3 } },
    { "from": [ 0.0, -4.8], "to": [ 0.0,  0.8], "opening": { "type": "door",   "x0": 4.35, "x1": 5.25, "y0": 0.0, "y1": 2.0 } },
    { "from": [ 0.0,  0.8], "to": [ 2.2,  0.8], "opening": null },
    { "from": [ 2.2,  0.8], "to": [ 2.2,  5.6], "opening": null },
    { "from": [-5.8,  5.6], "to": [ 2.2,  5.6], "opening": { "type": "sliding", "x0": 4.2, "x1": 5.1, "y0": 0.0, "y1": 2.4 } },
    { "from": [-5.8,  5.6], "to": [-5.8, -4.8], "opening": null },
    { "from": [-5.8, -0.9], "to": [-2.5, -0.9], "opening": null },
    { "from": [-2.5, -4.8], "to": [-2.5, -0.9], "opening": { "type": "door", "x0": 2.6, "x1": 3.5, "y0": 0.0, "y1": 2.0 } },
    { "from": [-2.5, -0.9], "to": [-2.5,  0.8], "opening": { "type": "door", "x0": 0.4, "x1": 1.2, "y0": 0.0, "y1": 2.0 } },
    { "from": [-2.5, -2.6], "to": [ 0.0, -2.6], "opening": { "type": "door", "x0": 0.8, "x1": 1.7, "y0": 0.0, "y1": 2.0 } },
    { "from": [-5.8,  0.8], "to": [ 0.0,  0.8], "opening": { "type": "door", "x0": 3.3, "x1": 4.8, "y0": 0.0, "y1": 2.1 } },
    { "from": [-1.0,  0.8], "to": [-1.0,  5.6], "opening": { "type": "sliding", "x0": 0.4, "x1": 4.4, "y0": 0.0, "y1": 2.4 } }
  ],
  "floors": [
    { "rect": [-5.8,  0.8,  2.2, 5.6],  "material": "parquet" },
    { "rect": [-2.5, -2.6,  0.0, 0.8],  "material": "parquet" },
    { "rect": [-5.8, -4.8, -2.5, -0.9], "material": "parquet" },
    { "rect": [-2.5, -4.8,  0.0, -2.6], "material": "tile" },
    { "rect": [-5.8, -0.9, -2.5,  0.8], "material": "tile" },
    { "rect": [-5.8,  5.6,  2.2,  7.3], "material": "tile" }
  ],
  "balcony": { "rect": [-5.8, 5.6, 2.2, 7.3], "railHeight": 1.1 },
  "windowWall": { "from": [-5.8, 5.6], "to": [2.2, 5.6], "sillHeight": 0.15, "headHeight": 2.4 },
  "furniture": [
    { "name": "sofa_teak_wool",      "box": [-5.0, 0.0,  1.0, -3.0, 0.72, 1.95], "color": "#c98a2e" },
    { "name": "coffee_table",        "box": [-4.4, 0.0,  2.5, -3.4, 0.35, 3.1],  "color": "#8a5a33" },
    { "name": "rug",                 "box": [-4.9, 0.0,  2.2, -2.9, 0.02, 3.9],  "color": "#a33b2e" },
    { "name": "string_shelving",     "box": [-5.8, 0.0,  1.2, -5.5, 2.0,  3.2],  "color": "#8a5a33" },
    { "name": "armchair",            "box": [-2.6, 0.0,  2.6, -1.9, 0.7,  3.3],  "color": "#3d4f43" },
    { "name": "floor_lamp",          "box": [-2.0, 0.0,  4.6, -1.8, 1.5,  4.8],  "color": "#2e2a26" },
    { "name": "dining_table",        "box": [-4.6, 0.0,  4.2, -3.4, 0.74, 5.0],  "color": "#8a5a33" },
    { "name": "dining_chair_a",      "box": [-4.5, 0.0,  3.8, -4.1, 0.85, 4.2],  "color": "#2e2a26" },
    { "name": "dining_chair_b",      "box": [-3.9, 0.0,  5.0, -3.5, 0.85, 5.4],  "color": "#2e2a26" },
    { "name": "desk",                "box": [ 1.5, 0.0,  2.0,  2.15, 0.74, 3.4], "color": "#8a5a33" },
    { "name": "desk_chair",          "box": [ 0.9, 0.0,  2.4,  1.4, 0.9,  2.9],  "color": "#2e2a26" },
    { "name": "study_bookshelf",     "box": [-0.6, 0.0,  0.85, 1.4, 1.9,  1.15], "color": "#8a5a33" },
    { "name": "daybed",              "box": [-0.8, 0.0,  4.4,  1.2, 0.5,  5.3],  "color": "#5b6d8f" },
    { "name": "bed_double",          "box": [-5.6, 0.0, -3.5, -3.6, 0.55, -2.1], "color": "#e8e2d6" },
    { "name": "bedside_table",       "box": [-5.6, 0.0, -1.9, -5.2, 0.5, -1.5],  "color": "#8a5a33" },
    { "name": "wardrobe_wall",       "box": [-3.1, 0.0, -4.7, -2.55, 2.3, -2.9], "color": "#e8e2d6" },
    { "name": "kitchen_counter_hob_garchey", "box": [-2.45, 0.0, -4.7, -1.85, 0.9, -2.7], "color": "#efe9dd" },
    { "name": "kitchen_larder_tall", "box": [-0.65, 0.0, -4.7, -0.05, 2.2, -2.7], "color": "#efe9dd" },
    { "name": "hall_coat_cupboard",  "box": [-0.55, 0.0, -2.5, -0.05, 2.2, -1.6], "color": "#e8e2d6" },
    { "name": "bathtub",             "box": [-5.75, 0.0, -0.85, -4.05, 0.55, -0.15], "color": "#f4f2ec" },
    { "name": "basin",               "box": [-5.75, 0.0,  0.2, -5.25, 0.85, 0.75], "color": "#f4f2ec" },
    { "name": "wc",                  "box": [-4.6, 0.0,  0.25, -4.2, 0.42, 0.75],  "color": "#f4f2ec" },
    { "name": "balcony_planter_west","box": [-5.5, 0.9,  7.15, -3.5, 1.2, 7.35],  "color": "#c4443f" },
    { "name": "balcony_planter_east","box": [-0.5, 0.9,  7.15,  1.5, 1.2, 7.35],  "color": "#c4443f" },
    { "name": "balcony_chair",       "box": [-2.8, 0.0,  6.2, -2.2, 0.75, 6.8],   "color": "#2e2a26" }
  ],
  "palette": {
    "wall": "#f2efe9",
    "floor": "#b98a52",
    "concrete": "#b5aca0",
    "frame": "#2e2a26"
  }
}
```

### Renderer notes (non-schema)

- **Mullions:** dark `frame`-colored vertical members on the window wall every ~1.33 m
  (7 bays across the 8 m run), 60 mm wide; spandrel panel below sill painted `frame`.
- **Balcony door:** the sliding opening at x0 4.2–5.1 slides *vertically* (counterweighted
  sash) — animate upward if doors open.
- **Balcony front:** solid concrete panel (color `concrete`) from y 0→1.1 with a 45°
  chamfer strip at the top edge; quarry-tile floor `#9e4a3a`.
- **Kitchen window light:** outside the kitchen's north window, render a galvanised steel
  grille walkway (the escape balcony floor) — light arrives striped/dappled.
- **View through the window wall (south):** Barbican lake with fountains, green gardens,
  St Giles' Cripplegate church, the three towers in the haze — reuse the game's existing
  parallax palette. North windows: concrete crosswall of the neighbouring bay + podium.
- **Ceiling grilles:** one small (0.3 × 0.15 m) anodised extract grille in kitchen and
  bathroom ceilings. No radiators anywhere.
- **Garchey:** under-sink bulb + chrome plunger cap in the sink — a good interactable.
- Dimensions are reconstructions at documented proportions (plans are published without
  figures); total interior ≈ 70.9 m², matching the ~73.5 m² (791 sq ft) of a real listed
  Type 20 within tolerance.
