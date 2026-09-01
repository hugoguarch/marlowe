# Make the page feel alive — motion and hover interaction

Add a restrained but tactile motion layer across the landing page. Everything stays in the Mayfair register: slow easing, no bounce, no colour shifts outside the teal/white palette.

## Buttons and links

- All pill CTAs (hero nav button, hero outline button, waitlist submit/back, chips): a magnetic hover — the button subtly follows the cursor within a few pixels and springs back on leave, plus a small lift and shadow.
- Fill-sweep on the dark CTAs: on hover a paper-coloured wipe slides across from left, text inverts to ink.
- The `↗` arrows nudge up-right on hover.
- Nav links get an animated underline that draws from the left.
- Active/pressed state: slight scale-down so clicks feel physical.

## Section-level interactions

- Hero: the satellite background gets a very slow ken-burns drift; headline words rise in on load in sequence; "Scroll to discover" gently pulses downward.
- Demo film: hovering the frame zooms the still slightly, dims it, and expands the play ring; the play triangle scales up.
- Discipline list (eleven items): each row highlights on hover — number brightens, text shifts right a few pixels, and a thin rule sweeps across the row.
- Difference / Steps columns: cards lift slightly and their heading rule extends on hover.
- Images in the Monday, curves and astronaut sections: slow scale on hover, and a subtle parallax-style scale tied to scroll reveal.
- Waitlist chips: fill and lift on hover, satisfying snap when selected; step transitions animate the outgoing step out and the incoming step in rather than swapping instantly.
- Footer link and quiet-proof line: underline draw on hover.

## Technical notes

- Motion via CSS transitions/keyframes added as utilities in `src/styles.css` (`hover-lift`, `sweep`, `arrow-nudge`, `ken-burns`, row-hover), so components only add class names.
- Magnetic buttons need a tiny shared component/hook (`src/components/landing/Magnetic.tsx`) that tracks pointer position and sets a CSS translate variable; it wraps existing buttons without changing their markup or behaviour.
- Step transitions in `WaitlistForm.tsx` use a keyed fade/slide wrapper — no form logic or database calls change.
- All motion respects `prefers-reduced-motion`: a media query disables transforms and keyframes.
- No new dependencies; no changes to backend, form submission, or copy.
