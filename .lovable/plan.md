# Connect real channels, fix the brand bank, and make the calendar real

Seven pieces. The first is the honest constraint; the rest are all buildable now.

## 1. Connecting social accounts (what is actually possible)

Because your clients will each connect their own accounts, every platform needs a developer app owned by Why Media, plus that platform's review before it will let us post or read on a customer's behalf. There is no shortcut around this.

What I will build now:

- The full connection machinery: a Connect button per channel that opens the platform's own login window, brings the customer back, and stores their access securely against their account, with Connected / Reconnect / Disconnect states in Settings.
- **Google Analytics first** — a Google app can be created and verified quickly, so this is the one that goes fully live first and starts feeding real numbers into Growth.
- **LinkedIn and TikTok** wired end to end and switched on the moment you give me the app credentials and their review passes. I will send you the exact steps to create each app.
- **Instagram and Facebook** need Meta's Business verification and app review (typically weeks). Left showing "coming soon" with an honest note until then.

Until a channel is live, posts stay queued rather than pretending to publish.

## 2. The upload error

Brand guideline PDFs are hitting a 25 MB file cap. I will raise the limit to 50 MB, and if a file is still too big the page will say so before uploading instead of failing with a technical message.

## 3. Managing brand brains

- A brand switcher in the top of the workspace — visible on Dashboard, Marlowe and Studio, not just Brand — so everything you see is for the chosen brand.
- On the Brand page: rename, set as default, and delete a brand brain (with a confirm, since deleting removes its posts and assets).
- Your default brand loads automatically each time you sign in.

## 4. A proper asset bank

The Brand page gains three managed sections instead of one-off uploads:

- **Logos** — multiple, one marked primary, each previewable and removable.
- **Fonts** — multiple font files, each named, actually applied to the post designs.
- **Images** — an image bank you upload into, browsable as a grid. In the Studio you can pick an image from the bank instead of letting Marlowe generate one.

## 5. Dashboard: analytics and output

Underneath the brief:

- A compact analytics strip — followers, reach, engagement — pulled from whatever channels are connected, with a small trend line.
- **Published** — what actually went out on each channel, with the post thumbnail, channel and time.
- **Today's output** — posted today against your daily target, as a simple progress line. The target is set per brand on the Brand page (for example 2 posts a day).

## 6. A real calendar

The Studio calendar tab becomes an actual month grid: each day shows its posts as small coloured chips by channel. Clicking one opens a pop-up with the full post design, caption, channel, time and status, plus Reschedule and Remove. Month and week views, and today highlighted.

## 7. "Made so far" squashing

The post thumbnails are being crushed because each design is forced into a narrow column. I will give them their proper 4:5 and 9:16 shapes, space the grid out, and make each one clickable into the same pop-up preview used by the calendar.

## Technical notes

- Per-customer OAuth: our own provider apps, `connected_accounts` extended with encrypted access/refresh tokens, account id, scopes and expiry; token refresh and all provider calls in server functions; a `/oauth/:provider/return` popup callback page. Nothing provider-side touches the browser.
- Analytics ingestion: a server function per provider writing into `metrics` (platform, metric, value, captured_for), plus a published-posts sync updating `schedule`/`content_items` to `posted` with the provider's post id.
- Schema: `brands.is_default`, `brands.daily_target`; `brand_assets` gains `is_primary` and an `image` kind; `connected_accounts` gains token columns; `schedule` gains `external_post_id` and `posted_at`. RLS scoped to `auth.uid()` with GRANTs, as before.
- Storage: `brand-assets` bucket file limit raised to 50 MB; image bank under `user/brand/images/`, served by signed URL.
- Calendar and previews are built from existing components — the month grid and modal are plain React, no new dependency; `PostDesign` gets a `fit` prop so grids and modals size it correctly.
