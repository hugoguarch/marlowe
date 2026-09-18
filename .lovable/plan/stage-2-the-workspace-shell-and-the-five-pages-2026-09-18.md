# Stage 2 — The workspace shell and the five pages

The landing page and Stage 1 sign-in stay exactly as they are. This stage builds what a signed-in user sees at `/app`: a persistent sidebar and the five pages inside it, using the same pale warm off-white, thin Helvetica Neue headlines, hairline-bordered cards, ink-navy feature panels, cerulean and gold accents, and the pearlescent sphere from the sign-in pages.

## The shell

A left sidebar that stays put on every page:

- Top: the sphere with "Why Media AI".
- Nav: Brief, Marlowe, Brand, Studio, Growth (plus Settings lower down).
- Bottom: the signed-in person's name and email with "Autonomy — Guided", and sign-out.
- On phones the sidebar collapses behind a menu button; the main area scrolls on its own.

`/app` opens on Brief. Each page gets its own address (`/app/marlowe`, `/app/brand`, `/app/studio`, `/app/growth`, `/app/settings`) so links and refreshes work.

## The five pages

All five run on realistic placeholder content this stage, written so real data can replace it later without redesigning anything.

**Brief** — "Good morning, [name]" with today's date; a card for Marlowe's morning brief film (the existing demo video as placeholder); a card with the written brief in Marlowe's voice; a Noticed / Prepared / Moved summary row; a "working across your channels" list; and an action bar with "Approve everything" plus a few alternatives.

**Marlowe** — a chat page: the sphere, a message thread with a short sample conversation, and an input bar reading "Ask, redirect, or drop a thought" with Create and Search web buttons. Sending a message adds it to the thread and returns a canned reply for now.

**Brand** — the Brand Brain: editable cards for logo, colour palette (Ink, Cerulean, Green, Sun swatches), typography (Helvetica Neue), tone of voice, audience and personas, and a dark ink-navy "what's working for this brand" learned card.

**Studio** — a social carousel preview with a row of slides, schedule-to-channel buttons and "Send to Queue", and below it a weekly calendar with colour-coded items per channel.

**Growth** — "You're X% to 10k followers" with a range toggle, metric cards (followers, engagement, reach, saves, profile visits), a by-platform table, a follower-growth bar chart, top-performing content and a scheduled-and-upcoming list.

**Settings** — autonomy toggle (Guided / Auto, saved to the profile) and a connect-accounts list for Instagram, Facebook, LinkedIn, TikTok, Google Business and Google Analytics with Connect buttons that are visual only for now.

## What is not in this stage

No database tables beyond the existing profile, no real posting, analytics or AI. Those are Stage 4 — the tables and the four function stubs that the separate agent backend will plug into.

## Technical notes

- New routes under `src/routes/_authenticated/app/` behind the existing gate; the current `_authenticated/app.tsx` placeholder becomes the layout (sidebar + `Outlet`) with `app/index.tsx` as Brief.
- Sidebar and page sections as components under `src/components/app/`, reusing `Sphere.tsx`; shared mock content in `src/lib/mock/` so each page reads from one place and can later swap to Supabase queries.
- Growth chart drawn with plain divs/SVG — no new charting dependency.
- Only the app-side tokens added in Stage 1 (`--app-bg`, `--app-card`, `--app-line`, `--ink-navy`, `--cerulean`, `--gold`) plus a green/sun swatch token if needed; landing tokens untouched.
- Autonomy toggle writes `autonomy_level` on the user's `profiles` row; everything else is local state this stage.
- Each route declares its own `head()` with `robots: noindex`.
