# MOTION.md — Casamento Verônica & João Igor

Part 1 (the method) lives in `.claude/skills/rossark-motion-skill/MOTION.md`. This is Part 2: the rules for this site.

## Where the motion lives
- `styles/motion.css`: idle loops, the hero entrance, reveal styles, drawer and sheet transitions. Easing tokens are at the top.
- `scripts/motion.js`: Lenis smooth wheel scrolling, scroll reveals, and one rAF loop for every scroll-linked layer. All tuning numbers are in the `T` object at the top.
- Everything is behind `html.motion`, which is set in `<head>` only when the visitor has not asked for reduced motion. Without it the page is the still design.

## Art
- The hero couple and the date strip are the two SVGs in `assets/`, inlined into `index.html` and split into groups:
  `couple__v`, `couple__mono`, `couple__flower`, `couple__burst`, `couple__j`, and `date__day/burst/month/flower/year`.
  Pivots are in the artwork's units (viewBox 1336×471 and 1254×179); see the top of `motion.css`.
- Each moving part has an outer group (entrance animation plus the scroll `translate`) and an inner `-live` group (idle loop).
  Scroll writes go to the individual `translate`/`rotate`/`scale` properties so they compose with the CSS `transform` animations.
- `#i-flower` and `#i-burst` are `<symbol>`s at the top of `<body>`, used by the drifting ornaments (`[data-drift="speed,spin"]`).
- Traje moodboard art is inline in `#traje`: line drawings (blazer with tie, floral midi dress, heel, sunglasses) whose strokes use `pathLength="1"` so one `stroke-dashoffset` draws any of them on, plus `#i-swatch` (a pinked fabric square) filled with the `#p-check`, `#p-dots`, `#p-floral` and `#p-stripe` patterns.
- Album photos are `assets/img/album-01..12.jpg` (600×800, 3:4), positioned in `site.css` under `── Álbum`.
- The long date paths were rounded to one decimal to keep the HTML small. If you re-export the art, round it again.

## Decisions
- One main action: the hero entrance on load (oval settles, faces glide in from the sides, monogram, then flower and star).
- Idle loops: the faces tilt out of phase (±2°, 4.6 s and 5.2 s), flowers sway, stars turn slowly. The monogram rests.
- The faces are drawn with smiling closed eyes, so there are no blinks.
- Scroll on mobile: the hero parallax, the ornaments drifting and turning, the Programação line drawing to 60% of the screen, the gift card in focus sitting forward, and the sticky bar hidden over the hero and inside RSVP.
- Gift cards reveal together, because a rail card would otherwise stay invisible while it peeks in from the edge.
- Touch scrolling stays native. Lenis only smooths the mouse wheel and anchor jumps (1.2 s ease-in-out, offset −64px for the top bar).
- Idle loops pause off screen (`.is-offscreen`).
- Countdown digits roll up instead of snapping (`window.__roll`, called by `site.js`). Only the changed places roll; each place to the left starts `T.rollCarry` ms later, like a carry. The old digit leaves first (280 ms), and the new one rises in 140 ms later, so the two never pile up mid-cell. Off screen, tucked or in the background, the text is just written.
- Hero petals (mobile only): 9 flowers and stars from `#i-flower`/`#i-burst` fall through the checkerboard, behind the oval, in one SVG on one rAF clock (`T.petals`). Each has a seeded speed, sway, drift and turn; they fade only at the top and bottom edges. The clock stops off screen, in the background and on the desktop layout, and never jumps after a pause.
- Timeline stops ripple once (a ring, 900 ms) when the drawing line reaches them.
- RSVP thank-you card arrives (scale 0.96 + rise), its marks pop in and then sway/turn; title, text and button stagger in.
- Traje is a moodboard that assembles while you scroll (desktop and mobile). The section is 250svh (210svh on phones) and its stage sticks under the 60px top bar. Scroll through the pin maps to p = 0…1, and each `[data-beat="start,end"]` element gets `--t` = 0…1 over its window, eased through `follow`. Order: the red script writes itself on, then the card stamps down (back-out, `T.dress.settle`) and its text rises, then the garments draw on and their colour washes in, then tape, then swatches and paint chips, and last the "Branco, só a noiva" tag and the stickers stamp on (`T.dress.overshoot`). All poses live in `site.css` and are written so t = 1 is the layout; without `html.motion` the section is that finished collage, unpinned. The tag swings and the stickers sway/turn, paused off screen.
- The photo album (after Nossa história) is a second pinned collage on the same engine as Traje (`boards` in `motion.js` handles both). The section is 270svh (230svh on phones). "Nós dois" writes itself on, then 12 polaroids fly in from their side and land with a gentle back-out (`settle`), their tape pressing on as each lands: the fun photos first, then travel, and last the Vatican ring photo in the middle with the "Sim!" seal and a flower sticker stamped on. Phones show 9 (the `album__photo--extra` ones are hidden). Without `html.motion` it is the finished wall, unpinned. Hovering a photo on desktop straightens and lifts it.
- Press feedback (0.97) on the RSVP yes/no choices. Gift cards get none: their reveal transition and the rail's inline `scale` already own them.

## Tests
`npm test` (Node's test runner plus `playwright-core`, offline: external requests are blocked) checks at phone size: the hero entrance lands at opacity 1, petals move and sleep off screen, digits roll and settle on the right value, the timeline draws and ripples, the thank-you card animates, reduced motion is the still design, desktop has no petals, the Traje stage pins and every piece lands (and with reduced motion it is the unpinned, finished collage), the album pins and every photo lands with the ring last (reduced motion: the finished wall), and nothing scrolls sideways. Lenis is blocked in the tests, so the page falls back to `scroll-behavior: smooth`; tests scroll with `behavior: 'instant'`.
