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
- The long date paths were rounded to one decimal to keep the HTML small. If you re-export the art, round it again.

## Decisions
- One main action: the hero entrance on load (oval settles, faces glide in from the sides, monogram, then flower and star).
- Idle loops: the faces tilt out of phase (±2°, 4.6 s and 5.2 s), flowers sway, stars turn slowly. The monogram rests.
- The faces are drawn with smiling closed eyes, so there are no blinks.
- Scroll on mobile: the hero parallax, the ornaments drifting and turning, the Programação line drawing to 60% of the screen, the gift card in focus sitting forward, and the sticky bar hidden over the hero and inside RSVP.
- Gift cards reveal together, because a rail card would otherwise stay invisible while it peeks in from the edge.
- Touch scrolling stays native. Lenis only smooths the mouse wheel and anchor jumps (1.2 s ease-in-out, offset −64px for the top bar).
- Idle loops pause off screen (`.is-offscreen`).
