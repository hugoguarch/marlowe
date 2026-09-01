# Hero rebuild + demo film section back

## Hero, framed like the reference

Replace the full-bleed slideshow hero with a single framed image card in the Hausflow style:

- Page background stays paper/bone; the hero sits inside generous margins as one large rounded-free rectangle with a thin light border and soft shadow, roughly 85vh tall.
- Nav lives inside the frame at the top: Why Media logo left, minimal links centre-right, and a small pill "Join the waitlist" button top-right with an arrow glyph.
- Headline sits upper-left inside the frame, two lines, very large and tight: "Your whole marketing department. Awake before you are."
- Bottom-left: the short subhead in small type plus a pill CTA button "Join the waitlist" with arrow.
- Bottom-right: quiet "Scroll to discover" line.
- Background: the satellite-over-Earth space image, single static image (slideshow removed). It renders much clearer than now — near-full opacity with only a light bottom-weighted gradient scrim for text legibility instead of the current heavy dark wash.
- The eyebrow/founding-members line folds into this layout so nothing from the copy is lost.

## Demo film section restored

Re-add the demo film block that existed before, placed directly under the hero:

- A 16:9 frame, dark, with the architectural still behind it and a centred circular play affordance plus a short caption line.
- It stays a styled placeholder until a video file or URL is supplied; once you give one, it swaps to an inline player with no other layout change.

## Technical notes

- Delete `src/components/landing/HeroSlideshow.tsx` usage; hero becomes static `<img>` with the satellite/Earth asset.
- Rework the hero and add a `DemoFilm` section component in `src/routes/index.tsx` / `src/components/landing/`.
- The existing header in `__root`/index moves inside the hero frame; sticky header behaviour unchanged elsewhere.
- All colours stay on existing tokens (ink, paper, bone, rule) — no hardcoded colour utilities.

## Open item

- I will use the current space Earth asset as the satellite shot unless you upload a specific satellite image; say the word and I will generate a dedicated one.
