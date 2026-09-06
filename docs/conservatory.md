# The Conservatory — Reference Document

Research notes on the real Barbican Conservatory (London EC2) as the basis for an
atmospheric Hollow Knight-style level. Companion to the Phase 6 "Arts Centre" slice —
the Conservatory sits directly on top of the theatre in real life, so it slots
naturally after (or above) the flytower/Stage Manager rooms.

---

## 1. The Space

The Conservatory is London's second-largest glasshouse (after the Princess of Wales
Conservatory at Kew), and it exists for a wonderfully brutalist reason: **it was built
to hide the theatre's flytower**. Chamberlin, Powell & Bon's fly tower — the concrete
shaft where stage scenery hangs six storeys above the Barbican Theatre's stage — was
judged such an eyesore that a tropical garden was wrapped around it. It was not in the
original 1959 masterplan at all; planting began in March 1980 and it opened to the
public in 1984.

The result is a steel-framed glass roof of roughly 23,000 sq ft over more than 1,600
cubic metres of hand-mixed soil, entered from Level 3 of the Centre. You arrive on an
upper terrace and the whole width of the space opens up ahead of and *below* you:
stacked concrete terraces draped in trailing plants, trees growing up through the
levels, vines hanging down from the walkways overhead. The concrete core of the
flytower rises straight through the middle of the jungle, its blunt face now
half-swallowed by climbers.

Contents, confirmed across sources:

- **~1,500 species** of plants and trees (some sources count 2,000+ individual
  plants), from South African desert species to Brazilian coastal flora: date palms,
  tree ferns, Swiss cheese plants (monstera), ficus, banana, coffee, ginger, a 20 ft
  yucca. The tallest palms and ficus genuinely press against the glass roof.
- **The Arid House** (added 1986), a separate climate-controlled room reached by
  stairs on the upper level: cacti and succulents, overwintering cymbidium orchids,
  and "Fred" — claimed as the largest *Carnegiea gigantea* (saguaro) in Europe,
  donated by the Mayor of Salt Lake City. (Closed to the public in recent years.)
- **Ponds with koi carp and terrapins.** The terrapins are famously ex-pets abandoned
  in Hampstead Heath ponds during the post-1990 Teenage Mutant Ninja Turtles craze,
  rehomed here — a reformed gang of turtles living under a theatre.
- **Brick planter tiers** and raised beds spilling foliage over concrete gangways;
  fountains and water features; automated irrigation with **misting systems** in the
  tropical zones and drip lines in the arid section; historically an aviary of
  finches (gone now) and pest control by released predator insects rather than spray.
- Through the glass you can still see the estate's towers and office blocks — you are
  inside a jungle, but the city never fully disappears.

The whole complex closes for renewal soon: the Conservatory shuts in 2027 for
restoration (Allies and Morrison / Asif Khan Studio), with the Centre closed
2028–2029. The game gets to preserve the pre-renewal version.

## 2. Atmosphere

What visit writeups consistently describe:

- **Light.** Sunlight arrives filtered through hundreds of glazing panels and their
  steel grid, so it falls as pale, hazy, slightly green-tinted shafts rather than
  direct sun — a "cocooning" light. On bright days the upper canopy glows while the
  ground level stays in layered green shade.
- **Green on green.** Visitors are struck by the *lack* of colour other than green —
  dense foliage stacked in receding layers that go genuinely dark toward the back
  walls and under the terraces. The few colour accents (koi, seasonal blooms) read
  intensely against it.
- **Humidity and mist.** The tropical zones are kept humid by misters; the air is
  warm and soft, "the outside world becomes that little bit more hazy." Condensation
  and drifting moisture are part of the look.
- **Water sound.** Fountains, pond trickle, drip irrigation — a constant quiet water
  texture under everything, in a space otherwise hushed like a library.
- **The surreal contrast.** Raw board-marked concrete gangways, brick planters, and
  the flytower's blank face against monstera and palm — brutalism and jungle
  interpenetrating. Leaves near the exits are dusty from city air; the place is
  lush but distinctly *urban*, tended, slightly worn.

## 3. Sources

- Barbican Centre — Visit the Conservatory: https://www.barbican.org.uk/whats-on/2026/event/visit-the-conservatory
- Barbican Living — The Conservatory (residents' history site): https://www.barbicanliving.co.uk/the-conservatory/
- Google Arts & Culture — The Barbican Conservatory: https://artsandculture.google.com/story/the-barbican-conservatory-barbican-centre/XAXhlTYpogSErA
- Stuff About London — "The Hanging Gardens of EC1": https://stuffaboutlondon.co.uk/architecture/the-barbican-conservatory-the-hanging-gardens-of-ec1/
- CityDays — Barbican Conservatory (terrapin story): https://citydays.com/places/barbican-conservatory/
- House Plant House — visit photo essay: https://houseplanthouse.com/2021/02/14/hph-visits-the-barbican-conservatory/
- London x London — planning a visit: https://www.londonxlondon.com/barbican-conservatory/
- Designboom — Barbican renewal approval (2027 Conservatory closure): https://www.designboom.com/architecture/barbican-centre-london-brutalist-icon-announces-closure-renovation-asif-khan-12-16-2025/
- Barbican Renewal project page: https://www.barbican.org.uk/our-story/how-were-changing/barbican-renewal

---

# GAME NOTES

The Conservatory is our Greenpath/Fog Canyon: the one region where the game's bright
London daylight goes green, humid, and interior. Same sun, different world. It should
feel like the estate's secret lung.

## Palette (16)

Muted deep greens with ONE saturated accent (koi orange, doubling as the region's
"warm" against the game's global Yellow Line `#f7c623` which appears only where the
Line physically enters).

| Role | Hex | Notes |
|---|---|---|
| Glass-light (sky through roof) | `#dcebd9` | palest value in the room; only in roof panels & rays |
| Haze / fog bands | `#a8bfa6` | drawn at 20–35% alpha over mid layers |
| God-ray core | `#eef4de` | translucent, additive-ish |
| Foliage 0 — backwall (darkest) | `#0e1713` | near-black green, silhouettes only |
| Foliage 1 — deep | `#1a2a1f` | |
| Foliage 2 — mid | `#28402c` | main gameplay-adjacent greenery |
| Foliage 3 — near | `#3d5c3a` | |
| Foliage 4 — lit canopy | `#6b8a52` | only where rays hit |
| Concrete (warm, matches estate) | `#8f8d84` | flytower face, gangways |
| Concrete shadow | `#54554e` | undersides, wet patches |
| Brick planter | `#7d5340` | warm counterpoint to all the green |
| Water deep | `#17332f` | ponds |
| Water surface glint | `#3f6b60` | 1px animated highlights |
| Steel walkway / handrail | `#46525c` | blue-grey, echoes estate railings |
| KOI ORANGE (the accent) | `#e8641f` | koi, arid-house blooms, lever markers |
| Bloom accent (sparse) | `#d94f7e` | occasional pink flower clusters, ties to estate planters |

## Rendering Techniques (Hollow Knight translation)

1. **Five-depth foliage silhouettes.** Parallax layers of leaf-shape silhouettes in
   Foliage 0→4, each layer a single flat colour, scroll factors 0.2/0.4/0.6/0.8/1.1
   (one layer *in front of* the player at 1.1). Depth comes entirely from value
   steps, exactly like Greenpath.
2. **Fog bands between layers.** Full-width quads of `#a8bfa6` at 25% alpha slotted
   between foliage layers 1/2 and 2/3, each drifting horizontally at 0.05–0.1
   px/frame with a 600-frame sine loop. This is the Fog Canyon trick: fog *between*
   depth layers, not on top of everything.
3. **God rays as translucent parallelograms.** 3–5 slanted quads from rooflight to
   floor, `#eef4de` at 12–18% alpha, width 12–24 px, angle matched to a fixed sun
   direction. Alpha pulses ±4% on a 240-frame sine; one ray slowly sweeps 8 px over
   900 frames as if the sun is moving.
4. **Glass-grid rooftop.** Top of every room shows the roof: `#dcebd9` panels behind a
   1px `#46525c` steel grid (8×12 px cells), with 2–3 panels per room brightened to
   near-white as the ray sources. Silhouettes of the towers faintly visible beyond
   the glass at 10% alpha — the city never disappears.
5. **Drifting spore/moisture motes.** Reuse the petal particle system: 20–30 motes of
   `#a8bfa6`/`#eef4de`, 1 px, rising at 0.05–0.15 px/frame with ±0.3 px sine drift
   (120–200 frame period), brighter inside god-ray quads (swap colour when inside a
   ray rect — cheap and very Fog Canyon).
6. **Mister bursts.** Point emitters on walkway undersides fire every 300–420 frames:
   12-frame hiss of 8–10 fast white-ish (`#dcebd9` 40%) particles, then a lingering
   30-frame fog puff at 15% alpha. Telegraphs nothing; pure ambience — and one
   variant IS a hazard elsewhere (Phase 5 fountain jets reuse the art).
7. **Low ambient + vignette.** Room ambient multiplied to ~0.85 of the outdoor
   estate rooms, vignette 1.5× stronger than global. Corners and under-terrace areas
   dip to Foliage 0/1 values so light pools read as destinations.
8. **Water double-layer.** Ponds: flat `#17332f` fill, then a 1px surface line of
   `#3f6b60` with 2–3 glint pixels stepping every 20 frames; below the line, entity
   reflections drawn flipped at 20% alpha, offset 1 px by a 90-frame sine (ripple).
9. **The koi as living accent.** 2–4 px `#e8641f` koi shapes gliding on slow bezier
   loops (400–700 frames each), pausing 60–120 frames. The only saturated moving
   colour in the region — the eye tracks them; use them to point at secrets.
10. **Vine-curtain occluders.** Foreground hanging-vine strips (Foliage 0, in front of
    player) that sway ±2 px on 180-frame sines and briefly hide the player — Hollow
    Knight uses foreground occlusion constantly to sell density. Keep gaps generous
    so platforming stays readable.
11. **Dripping condensation.** Single `#3f6b60` pixels detach from walkway undersides
    every 90–240 frames (randomized per drip point), fall under gravity, 3-frame
    2px splash ring on any surface. Sells humidity at near-zero cost; pair each
    splash with the sparse audio plink.
12. **Sparse audio bed.** Continuous low water-trickle loop at low volume; random
    drip plinks (tied to technique 11); a mister hiss every few hundred frames; the
    muffled *thud* of the theatre below through the flytower wall once per ~2000
    frames. No music until the flytower interior — silence is the region's tension.

## Prop List (18)

1. Koi pond (multi-tile, swim-depth water, koi entities)
2. Terrapin — ONE terrapin sunning on a pond rock; slides into water when approached (see signature details)
3. Brick planter tiers — 1/2/3-tile stepped platforms, foliage spilling over edges
4. Steel walkway segment with blue-grey handrail (semi-solid platform, drop-through)
5. Walkway support columns (climbable-adjacent walls for wall jumps)
6. Hanging vine curtains (foreground occluders, non-solid)
7. Monstera clusters — big split-leaf shapes, 2–3 sprite variants, mid foliage layer
8. Date palm trunk + crown pressed flat against the glass roof (tall room landmark)
9. Ficus canopy mass (large mid-layer silhouette blob with lit top)
10. Tree fern — umbrella silhouette for mid-height shelves
11. Arid House cacti set: saguaro ("Fred", 3 tiles tall), barrel, prickly pear, hanging burro's-tail
12. Glass-grid roofline tiles + bright ray-source panels
13. Flytower concrete face — huge blank board-marked wall, climber tendrils up its edges, counterweight door at base
14. Mister nozzle (walkway underside emitter prop)
15. Irrigation pipe runs + drip points (wall decoration that doubles as drip emitters)
16. Fountain head in pond (idle ambience; hazard-jet variant reserved for Phase 5)
17. Potting bench with gravel bed and pots (the gardeners' corner — journal/secret spot)
18. Dusty "CONSERVATORY — LEVEL 3" wayfinding sign, white/yellow on dark grey (map-style signage per Phase 3)

## 3 Signature Details

1. **The terrapin veteran.** One terrapin on a rock, wearing the faintest scuff of
   orange paint on its shell (ex-pet, TMNT craze survivor). Approach slowly and it
   stays; dash nearby and it plops into the water — a tiny reactive creature like
   Hollow Knight's grass-dwelling fauna. If the player sits on the bench beside it
   for ~10 seconds, it climbs back out. Pure character, zero mechanics.
2. **The flytower breathes.** Standing near the flytower face, a barely-audible
   muffled rumble and a 1px screen tremor every so often — scenery moving in the
   theatre below. The Yellow Line enters the Conservatory, runs straight into the
   flytower's base, and disappears under its door: the Line knows a way through the
   building's heart that the player can't take yet.
3. **Fred the saguaro.** The Arid House is a bright, DRY palette-break room (warm
   sand `#c9b087` ambient — the one room in the region with no fog), and Fred the
   giant saguaro stands in the middle with a little donor plaque. The room's dryness
   is the tell: no drips, no mist, sound goes dead. Secret: a scuffed Yellow Line
   fragment behind Fred.

## LEVEL HOOKS — a 10-minute route

Player kit: wall jump + dash. Dash gaps: 8–9 tiles. Movement ceiling: 3.5-tile jumps,
7-tile run-jumps, walls everywhere invite wall-jump chains between walkway columns.

**Shape:** a tall glass box, ~4 rooms wide, 3 walkway levels + ground/ponds + roofline,
with the flytower core as a solid vertical spine in the middle that must be circled,
climbed, and finally entered. The Arid House hangs off the top-east corner.

1. **Entry terrace (Level 3 door, mid-height).** Arrive from the Arts Centre foyer
   onto the upper terrace — the classic real-world reveal: the whole conservatory
   visible ahead and below through fog bands. The Yellow Line runs off the terrace
   edge and reappears far below by the ponds. First move is a descent: drop-through
   walkways, brick-planter tiers as stepping shelves. Teach nothing; let them fall
   beautifully.
2. **Ground / ponds (dark layer).** Deepest greens, koi as moving light. Cross the koi
   pond via planter islands — 8-tile dash gaps over water (water = safe but slow swim,
   using Phase 4 swim physics; falling in costs time, not health). Terrapin moment
   here. The Line runs into the flytower base door: locked, counterweighted. A lever
   behind a 9-tile dash gap under the lowest walkway starts the pump — water level in
   the east pond drops, exposing a vent crawl (Phase 4 gates reused).
3. **East ascent (wall-jump gauntlet).** The vent leads to the gap between the glass
   wall and the flytower's east face: a tall shaft of alternating walkway columns and
   flytower concrete — pure wall-jump/dash climbing, mister bursts as rhythm (they
   push +0.3 px/frame sideways for 40 frames, telegraphed 30 frames by drips — a
   soft wind-gust reuse). Vine curtains occlude two optional side ledges (health
   fragment, journal on the potting bench).
4. **Arid House (top-east, the breather).** Palette break, dry silence, Fred. No
   hazards. Bench (save/refill). The scuffed Line behind Fred marks a false wall to
   a roofline secret. This is the Ori-style palette-break beat the art direction
   already promises.
5. **Roofline run (the payoff).** Out of the Arid House onto the steel grid *under*
   the glass roof: a horizontal dash-heavy sprint across the ray-source panels — 8/9
   tile gaps between grid nodes, palm crowns as bounce-soft landings, the city
   visible above through the glass, everything below fading into green fog. Route
   ends on top of the flytower: its roof hatch is the theatre entrance — descend
   into the Stage Manager's territory with the Conservatory glowing above through
   the rigging. Total loop: descent → pump → climb → breather → roof sprint, ~10
   minutes, every gap provably in kit (verify with tools/verify-physics-cs before
   committing layouts).

**Line integrity here:** true on the entry terrace, faded by the ponds, scuffed at the
two secrets, and gone entirely on the roofline — the first region where the player
finishes a route the Line never showed them.
