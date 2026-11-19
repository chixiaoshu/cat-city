# CAT / TRANSFORM CITY

*An interactive short film in four folds.*

A sleeping paper cat unfolds, piece by piece, into a living miniature city of tiny
cats — and when night falls, the whole city folds itself back up into the cat.
Everything is procedural: no images, no models, no audio files.

**Run it:** open `index.html` in a browser. It uses plain scripts (no build step,
no modules), so it works straight from disk or from any static host
(`python3 -m http.server`, GitHub Pages, …). Needs WebGL.

## The film

| | Chapter | What happens |
|---|---|---|
| I | **The Sleeper** | Night. The cat breathes, twitches an ear, sways its tail. Stroke it (drag across the fur) to wake it — the fur ruffles under your cursor and it purrs louder. Or wait for dawn. |
| II | **The Unfolding** | At dawn the cat stretches, then comes apart like mechanical origami. Every piece lifts off, flips, travels and lands — in the same place on the cushion it occupied on the cat. Each Main Street section that lands plays the next note of a music-box melody. |
| III | **A Day in the City** | 240 residents with homes, jobs and routines: morning commute, a city-wide rooftop siesta at noon, fishing on Belly Lake, the Fish Market at 18:00, lights on at dusk. |
| IV | **The Folding** | At 21:45 the Collar Bell rings, everyone hurries home, and the city plays its unfolding backwards into a sleeping cat. Then it loops. |

## Anatomy → architecture

The transformation keeps continuous spatial relationships: the city is laid out
in polar rings over the exact footprint of the curled cat.

| On the cat | In the city |
|---|---|
| fur plates (flanks) | rooftops — fur side up, so the city keeps its tabby stripes |
| fur plates along the spine | **Main Street** — flipped over; the asphalt was on the underside |
| the inside of the body | the groundwork the districts stand on (a morph target that flattens) |
| tail | the **Circle Line** railway around the city |
| tail tip | the **Tip Express** locomotive |
| ears | **Left Ear Observatory** & **Right Ear Radio** towers |
| whiskers | cableways from the ear towers, with gondolas |
| closed eyelids | the two **Sleepyeye Bridges** over Belly Lake |
| skull · muzzle · nose | **Cranium Plaza** · **Town Hall** dome · the **Nose Spire** |
| front paws | **Bean Plazas** — flipped over, the toe beans become fountains |
| back paw | **Heel Park** |
| collar · bell | the red **Collar Promenade** around the lake · the **Bell Tower** |
| the warm spot inside the curl | **Belly Lake** |
| heart | the **Purr Reactor**, which powers the windows at night |
| the very end of the cat | the station canopy at **Tailbone Terminal** |

Hover anything to read what it was and what it is now (on the sleeping cat,
hovering tells you what each part *will* become).

## Controls

| | |
|---|---|
| drag / one finger | orbit the camera (on the sleeping cat: stroke it) |
| scroll / pinch | zoom |
| click | read, poke a resident, ring things, boop things |
| `1` / `H` | look tool |
| `2` / `L` | laser pointer — residents chase the dot, even across rooftops |
| `3` / `F` | drop a fish from the sky |
| `T` | time speed 1× / 3× / 8× |
| `B` | ring the Collar Bell (ends the day; at night it skips to dawn) |
| `M` | sound on/off |
| `Space` | (while asleep) wake the cat |

There are **seven secrets**. The ★ counter in the corner gives hints.

## How it's built

- `js/world.js` — the cat/city geometry and the choreography. Every part is a
  `Piece` with a cat pose and a city pose; one global progress value `P`
  (0 = cat, 1 = city) drives each piece through its own time window:
  lift off the body → flip and travel along an arc → land → ratchet upward.
  Buildings telescope up beneath their roofs in three mechanical clicks; small
  details pop up like a pop-up book.
- `js/citizens.js` — the residents (one `InstancedMesh`), polar-grid path
  finding along lanes and spokes, daily schedule, laser/fish chasing, the
  mouse and the box.
- `js/main.js` — story state machine, cinematic camera rig, input, tooltips,
  subtitles, chapter cards, secrets.
- `js/audio.js` — Web Audio synthesis: purring (amplitude-modulated noise),
  music-box notes, paper clacks, bell, meows, train toot, sneeze.
- `vendor/three.min.js` — three.js r149 (MIT).

For debugging, `CTC.debug.sim(seconds)` runs the simulation headlessly and
`CTC.debug.jump(P, hour, state)` jumps to any moment.
