# The Central Ponds / Lakeside Terrace — Scene Reference

Visual research for a lush, Ghibli-leaning pixel-art scene set on the Barbican Estate's
lake. Companion to the established art direction (bright London daylight, 320×180,
8×8 tiles, Yellow Line `#f7c623`). Nothing here overrides CLAUDE.md — it extends the
palette downward from the towers to the water.

---

## 1. The physical scene

The lake is the estate's horizontal counterpart to the three towers: a long, formal,
east–west **canal-like lake** running through the centre of the estate, roughly
tracing the line of the Underground between Barbican and Moorgate. It is famously
**shallow — about half a metre deep in most places** — so the water is constantly
circulated to stay oxygenated; it even serves the Arts Centre's filtration system.
The lake **steps down a level under Gilbert House** (the block that stands *in* the
water on columns), continues under St Giles' Terrace, and ends at a **large cascade /
waterfall** at its eastern end near Willoughby House, overlooked by Brandon Mews.

Key built elements, from the listing/landscape records:

- **Lakeside Terrace** (north side, in front of the Arts Centre): a red-brick paved
  terrace with **eight fountains** — *five circular, recessed into the terrace with
  linked steps down to the water*, and *three more (two semicircular) set on the
  terrace edge*. Further west, three more semicircular fountains. Under Gilbert
  House, **a grid of fountain jets** rises straight out of the lake.
- **Planted islands** (south side, east of Gilbert House): a series of **small
  circular islands built of red engineering brick**, containing **seating and flower
  beds**, reached by brick spurs from Andrewes House. Stepping down onto one puts
  you at eye level with the ducks. Photo essays show "families perched on a circular
  brick island feeding ducks, reeds rustling in the wind."
- **Cascade steps**: the waterfall at the east end is a run of wide concrete/brick
  steps the whole lake pours over — the loudest, whitest water in the scene.
- **St Giles' Cripplegate** across the water: the surviving medieval church, ragstone
  with a brick upper tower, sits on its own terrace surrounded by the water — the
  one pre-modern silhouette in the whole composition. A **grey heron** occasionally
  takes up residence on its roof.
- **Framing blocks**: the long terrace blocks (Andrewes, Gilbert, Willoughby, Defoe)
  and the curved **Frobisher Crescent** rise behind, their concrete balconies lined
  with the estate's overflowing flower boxes; the towers close the sky beyond.
  Photographers note "the rhythm of the fountains runs parallel to the long
  reflections of the residential towers."

Life on the water: **mallards** year-round (they nest in residents' window boxes to
dodge foxes), **moorhens and coots** with chicks (shallow water keeps foxes out),
the visiting **heron**, and — after carp muddied the lake — a restock of ~1,000
**golden orfe and golden rudd**, dainty surface feeders that flash orange just under
the surface. Waterlilies and marginal reed/iris planting soften the brick edges;
CP&B's tree list for the estate included willows, limes and planes, and mature trees
were transplanted in at 30–40 ft so the landscape read as established from day one.
On the terrace, people sit with coffee at the water's edge on sunny days.

## 2. Colour and light (bright summer)

- **Water**: murky green-teal — an opaque, algae-tinted green that goes almost black
  in building shadow, with hard mirror streaks where sky and white concrete reflect.
  "Sunlight flickering through the surface of the ponds" is the signature effect:
  broken white glitter bands where fountain ripples cross the sun's reflection.
- **Green on green**: dense island planting, reeds, lily pads and weeping foliage
  stack four or five distinct greens against each other, punctured by pink/red/white
  blooms (same species energy as the balcony boxes already in the game).
- **Warm brick vs. grey concrete**: the red-brown engineering brick of terraces and
  islands is the warm counterweight to the pebbledash concrete; in full sun the brick
  reads orange-rose, in shade a deep maroon-brown.
- **Reflections**: long vertical smears of the blocks and the church, broken by
  ripple; the sky reflection is a paler, greener blue than the sky itself.
- **Surface litter**: petals from the flower boxes and small leaves drift on the
  water — direct continuity with the existing petal ambience.

## 3. Ghibli translation — implementable techniques

What makes Ghibli water/garden scenes alive is that *everything cheap moves a
little, forever*. Concrete techniques at 60 fps:

1. **Layered parallax foliage.** 3 foliage depths in front of the existing tower
   layers: far tree canopy (0.5× scroll), mid island planting (1.0×, in-world), near
   overhanging fronds (1.15×, drawn over the player). Each layer one green darker
   than the one behind — never reuse a green across layers.
2. **Two-band shimmer water.** Base water is flat `#3a6b60`; draw 1-px horizontal
   highlight dashes (`#8fd0b8`, sparse `#e8f6ee` sparkles in the sun lane) that
   scroll 1 px sideways every 8 frames, with each row phase-offset. Two dash
   densities: sparse everywhere, dense in a 30-px "sun lane."
3. **Flipped-and-broken reflections.** Vertically mirror church/blocks silhouettes
   into the water, darkened 40% and tinted toward the water green; shift each
   reflection row ±1 px on a slow sine (period ~150 frames, phase = row index) so
   the image wobbles without any real-time effects.
4. **Wind through plants.** Every reed clump / bush sways on a sine: offset the top
   half of the sprite ±1 px, period 120–180 frames, random phase per clump. Every
   ~8–15 s a "gust" event temporarily halves the period and releases 2–3 petals —
   ties into the existing wind/petal system.
5. **Dappled light.** A sparse checker/dither mask of +1 brightness patches over
   walkable brick under trees, drifting 1 px every 20–30 frames. Cheap, and it sells
   "sunlight through leaves" instantly.
6. **Ambient creatures on tiny loops.** Duck: 3-frame swim (20 frames/frame) leaving
   a 2-px V wake; moorhen: 2-frame head-bob walking the lake edge; heron: static on
   the church roof, one preen animation every 20–40 s; orfe: 4-px orange sliver that
   glides under the surface and vanishes. Creatures react (ducks paddle away 1 px/f)
   when the player lands nearby.
7. **Ripple rings.** On any water contact (duck, fountain splash, player landing):
   1-px ellipse expanding 1 px every 4 frames, fading over ~60 frames, max 3 rings
   per source. Draw in the water-lit colour at 50%.
8. **Fountain jets as particle columns.** Column of 2–3 white/`#cfeee2` pixels rising
   ~1.2 px/frame with slight x jitter, arcing over and dying in a ripple. Run jets on
   a stately shared cycle (e.g. 4 s on, staggered per jet) so the row reads as
   choreography — matches the real terrace's rhythmic grid.
9. **Soft-saturated palette rule.** No pure black or white in the scene: shadows are
   hue-shifted (green shadow on foliage → `#22422a`, brick shadow → maroon), and the
   brightest sparkle is off-white. This is most of the "Ghibli softness."
10. **Drifting particles over water.** Extend the petal system with occasional
    willow leaves (1×3 px, `#a8cf5e`) that *land* on the water and then float
    downstream toward the cascade at 0.1 px/frame before despawning.

## Sources

- https://www.barbicanliving.co.uk/barbican-now/lakes/ — layout, half-metre depth, circulation, Arts Centre filtration
- https://www.barbicanliving.co.uk/barbican-now/lakes/fish/ — carp failure, golden orfe/rudd restock, heron on St Giles' roof
- https://www.barbicanliving.co.uk/barbican-now/lakes/the-birds/ — mallards, moorhens, window-box nesting
- https://www.barbicanliving.co.uk/landscaping/ — CP&B planting philosophy, tree species, mature transplants
- https://www.parksandgardens.org/places/barbican-the — listing detail: eight terrace fountains, cascade, circular red-brick islands with seating and flower beds, fountain grid under Gilbert House
- https://www.designboom.com/architecture/concrete-towers-water-gardens-elevated-paths-barbican-david-altrath-lens-11-21-2025/ — photo essay: light, reflections, islands, reeds
- https://www.barbican.org.uk/your-visit/lakeside-terrace — the terrace as social space
- https://commons.wikimedia.org/wiki/File:Central_ponds,_Barbican_Estate.jpg — reference photo
- https://en.wikipedia.org/wiki/St_Giles-without-Cripplegate — the church across the water

---

# GAME NOTES

## Palette (15 swatches)

| Role            | Hex       | Notes |
|-----------------|-----------|-------|
| water           | `#3a6b60` | base murky green-teal, opaque |
| water-lit       | `#8fd0b8` | shimmer dashes, ripple rings (sparkle accent `#e8f6ee`) |
| brick-lit       | `#b8674a` | island rims / terrace paving in full sun |
| brick-mid       | `#9c5038` | brick body colour |
| brick-shadow    | `#6e3527` | maroon shade side, mortar lines |
| foliage-deep    | `#2e5c34` | far canopy, bush shadow mass |
| foliage-mid     | `#4f8a3d` | main island planting |
| foliage-light   | `#7fb84f` | sunlit leaf tops, lily pads |
| foliage-yellow  | `#a8cf5e` | grass highlights, willow leaves, new reeds |
| bloom-pink      | `#e87a9c` | matches balcony boxes |
| bloom-red       | `#c93b47` | matches balcony boxes |
| bloom-white     | `#f2ede1` | also duck body / fountain foam |
| concrete-warm   | `#b8b2a4` | existing estate grey (keep consistent) |
| concrete-shadow | `#8a857a` | underside of walkways, cascade shade |
| sky-reflection  | `#b9d7e8` | mirror streaks on water; greener than the actual sky |

Yellow Line `#f7c623` runs along the terrace edge and *stops dead at the water* —
a natural Yellow Line integrity beat (line resumes on the far bank).

## Prop list

- **Fountain jet** — 3×10 px particle column, white core / `#cfeee2` fringe, rises
  1.2 px/f, arcs, ends in a ripple ring. Rows of 5–8 on a staggered 4 s cycle.
- **Planted island** — ~4–6 tiles wide: 1-tile brick rim ring (brick-lit top edge,
  brick-shadow waterline), domed foliage mound in the centre (deep→mid→light
  stack), 3–5 bloom pixels spilling over the rim, optional bench sprite.
- **Lily pad** — 5×3 px foliage-light ellipse with a notch; bobs ±1 px when a ripple
  passes; occasional bloom-white/pink flower variant.
- **Duck (3-frame swim)** — ~8×6 px: bloom-white body, brick-shadow head (female:
  brick-mid), 20 frames per frame, 2-px V wake in water-lit; idle variant dabbles
  (head underwater, tail up) every 10–20 s.
- **Reed clump** — 6–10 vertical 1-px stalks, foliage-mid with foliage-yellow tips,
  top half sways ±1 px on sine (120–180 f period, random phase).
- **Dragonfly** — 2×2 px body (sky-reflection blue) + 1-px wing shimmer flicker
  every other frame; hovers 60–180 f, darts 8 f at 3 px/f, prefers reed clumps.
- **Church silhouette (backdrop)** — St Giles' Cripplegate at ~0.6× parallax:
  concrete-warm ragstone body, brick-mid upper tower, dark arched windows;
  the heron as a 3-px accent on the roofline. Also mirrored into the water.
- **Cascade steps** — 3–4 descending 2-tile-wide steps at the lake's east end;
  1-px white foam line on each lip, foam pixels advancing 1 px every 3 f;
  continuous soft ripple field at the base. Natural screen-right scene exit.

## Island hopping

The circular brick islands are a ready-made platforming vocabulary that stays true
to the real place:

- **Brick rim = walkable edge.** The 1-tile rim ring is the platform surface (a new
  tile, e.g. `O`, solid on top). Rim top uses brick-lit with a mortar line so it
  reads "stand here" against the soft foliage.
- **Planting mound = soft obstacle.** The central bush dome is 1–2 tiles tall:
  small islands you jump *over* it; large islands you can push *through* it — no
  collision, but it slows x-velocity ~30%, rustles (sway period temporarily 30 f)
  and puffs 2–3 petals. Secrets (a scuffed Yellow Line mark, a journal) hide inside
  the bigger mounds.
- **Spacing from verified physics.** Max jump ≈ 3.5 tiles high / 7 tiles horizontal:
  space island rims 2–5 tiles apart for the honest route, one 6–7-tile gap as the
  full-speed test, and one grapple/dash-only island (anchor `A` on a lamp column)
  for the post-ability revisit. Re-run the verifier when the room is laid out.
- **Water below** is the fail state — but it's half a metre deep in reality, so a
  splash + waist-deep wade back to a rim ladder (or the Phase-4 swim physics at
  `waterLevel`) is friendlier and truer than a death pit. Ducks scatter with ripple
  rings on every splash, which makes even failure look alive.
- **Beauty is load-bearing:** rims carry blooms spilling over the edge exactly like
  the balcony flower boxes above, so the islands rhyme visually with the towers —
  the estate's "hanging gardens" motif repeated at water level.
