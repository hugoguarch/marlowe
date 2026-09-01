# Why Media AI — Marlowe waitlist landing page

A single-scroll landing page in a Mayfair aesthetic: deep teal (#003341) and white, Helvetica Neue, generous whitespace, restrained motion, one job — join the waitlist.

## Design language

- Palette: #003341 as the dominant ground, white as the counterweight, plus a soft off-white and a muted teal tint for section separation. No third accent colour.
- Type: Helvetica Neue throughout (system stack with Inter/Arial fallbacks). Large, tight-tracked display headlines; small uppercase eyebrows with wide letter-spacing as section labels.
- Layout: full-width bands alternating dark and light, wide margins, hairline rules, sharp-to-minimal corners. Editorial column widths rather than card-heavy blocks.
- Motion: quiet fade-and-rise on scroll only. No hover flourish on every element.
- Brand: the uploaded white one-line logo in the header/footer over dark bands; the Y icon used as the favicon.

## Page sections (in order)

1. Minimal header — logo left, single "Join the waitlist" link right.
2. Hero (dark) — eyebrow WHY MEDIA AI, the Marlowe headline, subhead, primary button, founding-members line. A 16:9 demo-film frame beside/below the copy: a styled placeholder with play affordance until the film file is supplied.
3. A NORMAL MONDAY (light) — "You do not brief Marlowe. Marlowe briefs you." with the body copy and the Marlowe pull-quote presented as a morning-brief message card, the emotional centrepiece of the page.
4. THE WHOLE DEPARTMENT (dark) — the eleven disciplines as a quiet numbered/hairline grid, not icon cards.
5. NOT ANOTHER AI TOOL (light) — three points in an editorial three-column layout, then the control reassurance line set apart.
6. UP AND RUNNING IN MINUTES (dark) — three numbered steps in a horizontal rhythm.
7. Founding cohort + waitlist form (light) — heading, body, and the form itself so the CTA lands here.
8. Quiet proof line — "This account is run by Marlowe…" understated above the footer, with channel links.
9. Footer — logo, minimal legal line.

All page CTAs scroll to the waitlist form.

## Waitlist form

Fields exactly as specified: name, business name, website, industry, current marketing spend (single choice), what Marlowe should handle (multi-select chips), trust question (open text), founding pilot (yes / tell me more). Client-side validation, then an inline confirmation state replacing the form.

Submissions are stored in Lovable Cloud so you can see every signup — enabling Cloud is part of this build. A `waitlist_signups` table takes public inserts only; nobody can read the list from the browser.

## Technical notes

- Rewrite `src/routes/index.tsx` as the landing page, composed from section components under `src/components/landing/`.
- Tokens added to `src/styles.css` (@theme inline): teal ground, ink, off-white, muted rule, plus the Helvetica Neue font token. No hardcoded colour utilities in components.
- Logos uploaded as CDN asset pointers; the Y icon also copied to `public/` as the favicon and wired into `__root.tsx`.
- Route-level `head()` with a Marlowe-specific title, description, og/twitter tags.
- Form uses shadcn form/input/checkbox/radio primitives restyled to the palette, submitting through a server function to Cloud.

## Open items

- Demo film: a placeholder frame ships until you provide the video file or URL.
- Social channel URLs for the "quiet proof" line: placeholder links until supplied.
