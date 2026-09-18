# Stage 1 — Authentication

Landing page stays exactly as it is, apart from adding a "Log in" link in the header and pointing the product-facing calls to action at sign-up.

## What you'll get

- **Sign-up page** (`/signup`) — name, email, password, plus "Continue with Google".
- **Login page** (`/login`) — email, password, plus "Continue with Google", and a "forgot password" link.
- **Password reset page** so reset emails land somewhere real.
- **Landing page header** gains a quiet "Log in" link next to the existing waitlist button; CTAs that lead into the product point to sign-up (the waitlist form stays untouched).
- **Protected product area** at `/app` — a placeholder "Welcome, [name]" screen for now with a sign-out control, so we can confirm the whole flow works before Stage 2 builds the real shell. Anyone not signed in is sent to Login; after login they land on `/app`.
- **Profile record** created automatically for every new account: name, email, avatar, and an autonomy level defaulting to "Guided".

## Look and feel

A new app-side visual layer, separate from the dark landing page: pale off-white background, thin Helvetica Neue headline, one soft rounded card with a hairline border, cerulean and warm-gold accents.

The brand mark is a soft glowing pearlescent silver-blue sphere, generated once as an image asset and reused on the auth pages, and later in the sidebar and chat.

## Technical notes

- Enable email/password sign-in and the managed Google provider on Lovable Cloud in the same change that ships the sign-in code.
- Routes: `src/routes/login.tsx`, `src/routes/signup.tsx`, `src/routes/reset-password.tsx` (all public), and `src/routes/_authenticated/app.tsx` behind the managed `_authenticated` gate that redirects to Login.
- Google sign-in goes through the Lovable broker with `redirect_uri: window.location.origin`; a public `/auth/callback` route parks the session then forwards to `/app`.
- Migration: `profiles` table keyed to the auth user id, with GRANTs, RLS scoped to `auth.uid()` (select/insert/update own row), and a `handle_new_user` trigger that inserts name/email/avatar from signup metadata and `autonomy_level` default `guided`.
- App-side tokens (`--app-bg`, ink-navy, cerulean, gold) added to `src/styles.css` alongside the existing landing tokens; no landing values changed.
- Header session state: the landing header shows "Log in" when signed out and a link to the app when signed in, driven by the session.

## Not in this stage

Sidebar shell, the five product pages, tables beyond `profiles`, edge function stubs, settings — Stages 2 to 4.
