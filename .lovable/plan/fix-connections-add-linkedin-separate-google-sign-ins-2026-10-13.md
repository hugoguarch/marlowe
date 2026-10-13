# Fix connections, add LinkedIn, separate Google sign-ins

## 1. Post links and captions
- Every post link (Instagram, Facebook, YouTube, LinkedIn) opens in a new browser tab, so it never tries to load inside the app.
- Captions show the first six words followed by "..." in every post list: Social, Overview top posts, competitors. Long words get cut so nothing can stretch the page sideways.

## 2. "accounts.google.com refused to connect"
Google won't let its sign-in page open inside another site's frame, and the editor preview is a frame. Your own email sign-in works because it uses a different flow.
- "Connect" buttons open Google's sign-in in a popup window. When sign-in finishes, the popup closes and Settings refreshes.
- The same popup approach is used for LinkedIn.

## 3. Separate Google Business and YouTube
Settings → Data sources shows two cards for each client:
- **Connect Google Business Profile**: sign in, then pick the location(s).
- **Connect YouTube**: sign in, then pick the channel(s).
Each card can use a different Google account. Both run on the same Google client ID. Each card shows its status, last sync, any error, a Reconnect button and a Disconnect button.

Credentials: I'll open the secure form for the Google Client ID and Secret, unless they're already saved. Add these redirect URIs under "Authorized redirect URIs" in Google Cloud:
- https://marlowe.lovable.app/api/public/oauth/google/callback
- https://id-preview--60fbaa02-fb60-4722-beb2-152ded3c75e1.lovable.app/api/public/oauth/google/callback

Also enable these APIs in Google Cloud: YouTube Data API v3, YouTube Analytics API, YouTube Reporting API, My Business Account Management API and Business Profile Performance API.

## 4. LinkedIn Company Page analytics
- The secure form opens for the LinkedIn Client ID and Secret. Your message had placeholder text, not the real values, and real values shouldn't go in chat anyway.
- Redirect URI to add in the LinkedIn app: https://marlowe.lovable.app/api/public/oauth/linkedin/callback, plus the preview equivalent.
- Per-client "Connect LinkedIn" popup. After sign-in, you pick the Company Page(s) that account administers.
- Nightly sync pulls followers, impressions, engagement and posts into the same tables, so Overview and Social fill in automatically.
- The status card shows connected / needs reconnect (token expired, which happens every 60 days on LinkedIn) / error, with Reconnect and Disconnect buttons.

## 5. Meta "API access blocked"
This message is not an expired token. Meta returns it when the Meta app itself is restricted. Common causes: the app is in Development mode, Business Verification is missing, an app review flag is open, or the system user's token was made under a different app.
- First step is a diagnostic. I'll check the token server-side (which app it belongs to, its permissions, its expiry, and Meta's exact error code and subcode) and show the results in Settings, so the cause is clear.
- Error messages will separate "token expired", "app restricted by Meta" and "asset not shared", instead of grouping them under one message.
- If the token itself is the problem, I'll open the secure form to replace it. The token pasted in chat earlier should be revoked in Meta, since it's exposed.

## 6. Easier client onboarding (explanation only, not built now)
Planned flow: "Add client" asks only for name, sector and logo. The new client's Settings page then shows a checklist of connect cards: Search Console, Google Business, YouTube, GA4, Meta (Facebook + Instagram + Ads), LinkedIn, TikTok. Each card runs: click Connect → sign in through a popup → pick the accounts that sign-in can see → done. The first sync runs right away, and the card turns green. Shared agency logins (like your Search Console account) are remembered, so later clients just pick a site with no new sign-in. You could also send a client a "connect your accounts" link so they sign in themselves without a Pulse login.

## Technical details
- OAuth popups use `window.open` + `postMessage` (the existing `waitForChannelOAuth` pattern), with return URLs under `/api/public/oauth/{google,linkedin}/callback`. Requests are verified with signed, expiring state.
- The Google consent request gets a `purpose` (`gbp` | `youtube`) in state. Scopes are limited to that purpose: `business.manage`, or `youtube.readonly` + `yt-analytics.readonly`. `pulse_google_accounts` stays shared, but connections are linked per purpose.
- LinkedIn: new `linkedin.server.ts` / `linkedin.functions.ts` and a `pulse_linkedin_accounts` table storing encrypted tokens (service-role only). Scopes: `r_organization_social`, `rw_organization_admin`, `r_organization_followers`. Added to the `pulse-sync` cron route.
- Meta: `debug_token` + `/me` diagnostic server function; error mapping by code/subcode (190, 200/10, 368, app-restricted subcodes).
