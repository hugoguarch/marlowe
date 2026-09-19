# Tidy the workspace and make it real

Six changes, in this order. Account connections come after, as a separate stage.

## 1. Cut what does nothing

Every button that currently does nothing gets removed or made real. Going page by page: "Review one by one", "Hold the price response", "Ask Marlowe", "Replace logo", "Edit palette/typography/personas", "Ask for another version", the Studio "Connect" placeholders and the Settings connect list. Anything kept becomes functional; the rest goes. Nav stays as Dashboard, Marlowe, Brand, Studio, Growth, Settings.

## 2. Brief becomes the Dashboard

One clean column: the morning film at the top, the written brief directly underneath it, then Noticed / Prepared / Moved and the channel list. A single "Approve everything" action, which marks the pending queue items approved in the database rather than just changing a label.

## 3. Brand Brain — create, upload, auto-fill, save

- A brand picker with "Create new brand brain". Creating one opens a short flow: name and website, then upload a logo, font files and a brand guidelines PDF or document.
- The uploads go to private storage. The guidelines document is read by AI, which fills in the palette, typography, tone of voice, personas and audience. You review and correct everything before it saves.
- Every card is editable and saves to the brand_brain record, so edits survive a reload. Logo, palette, typography and tone all read and write from the same place.

## 4. Studio — actual post designs

- A set of real post layouts (carousel, quote, stat, announcement, story) rendered live in the brand's own colours, fonts and logo pulled straight from the Brand Brain.
- "Generate post" writes the copy with AI and generates the background imagery with AI; the text and layout are rendered as a proper design on top, so it looks like a finished post rather than a placeholder.
- Layout fixed: a large preview on the left, slide thumbnails beneath it, and a single right-hand panel for caption, channels and scheduling. The week calendar moves to its own tab so the page isn't two things at once.
- "Send to queue" saves the rendered images with the post so the scheduled item carries its artwork.

## 5. Growth — honest numbers and a real chart

Growth reads only from the metrics table. With no channels connected yet, the page shows a clear "connect your accounts to see live numbers" state instead of invented figures. Once data exists, a proper line/area chart with axes, gridlines, hover tooltips and a real date range replaces the current bar strip, alongside the platform table and top-performing list.

## 6. Settings

Autonomy toggle stays. The connect list shows each channel's real state (not connected) and explains what connecting will do, ready for the connection stage.

## Next stage — real account connections

Instagram, Facebook, LinkedIn, TikTok and Google Analytics each need a developer app of your own plus their app review before posting is permitted, which takes days to weeks per platform. I'll plan and build that as its own stage once the above is in, starting with the platforms that approve fastest.

## Technical notes

- Storage: new private `brand-assets` bucket with per-user path policies for logos, fonts and guideline documents.
- Schema: add `brands.logo_url`/`assets`, `brand_brain.audience`, a `brand_assets` table (kind, file path, metadata) and `content_items.render_url`; all RLS-scoped to `auth.uid()` with GRANTs.
- AI via Lovable AI Gateway, `openai/gpt-6-astra` for guidelines extraction and post copy; `lovable/image-standard` for post imagery. Document parsing and all model calls stay in server functions.
- Post designs are HTML/CSS templates driven by brand tokens, rasterised for export; no new charting-heavy dependency — chart drawn as SVG with axes and tooltips.
- `src/lib/mock/workspace.ts` shrinks to Dashboard copy only; Brand, Studio and Growth read from the database.
