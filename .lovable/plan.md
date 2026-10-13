# Rebuild Brand Guidelines and Site Builder

## 1. Brand Guidelines (Design › Brand Guidelines)

Rebuild it to match the BrandGuidelines design, using the brand kit already saved for each account.

**Left: Design agent panel**
- Tabs: Agent, Sources, Library.
- **Agent** lists the steps it took (read the guidelines PDF, pulled out the logos, matched the fonts, built the sections, checked colour contrast), then a review summary: company, audience, palette and voice.
- If a brand font can't be used on the web, a note explains which font it's using instead and asks you to upload the font files.
- Box at the bottom: "Ask for a change, or add a section…". The AI then updates the kit, for example "make the gold warmer" or "add a photography section".
- **Sources** is the uploaded PDFs, logos and fonts. **Library** is all the brand's files, with upload, delete and "set as primary".

**Right: Brand board**
- Header: "Brand Guidelines · {Account} v{n}", the number of sections, "auto-saved" and Export PDF.
- Numbered sections:
  1. Primary logo
  2. The mark
  3. Logo variants (light, dark, reversed, mark only)
  4. Colour palette, with names and hex codes you can edit
  5. Typography: display and body fonts with samples
  6. Icon system
  7. Brand values
  8. Social template: a live post in the brand's colours and fonts
  9. Tone of voice
  10. Audience
- You can edit every section where it sits on the board.
- **Request changes** sends the kit back to the agent with your note. **Lock brand kit** freezes it and moves the version up (v1.0 → v1.1). A locked kit shows a badge and stays read-only until you unlock it.

**Brand kits used everywhere**
- Each account's colours, fonts and logos come from one place: its brand kit.
- Post Designer, Email Designer, the email preview, Site Builder and social templates all use it.
- Uploaded brand fonts are loaded for real. Otherwise the closest Google font stands in, and the board says so.
- Your current brand features stay: create a brand from a PDF or website, upload files, choose the primary logo, set the daily target and delete a brand.

## 2. Site Builder (Web › Site Builder)

Rebuild it to match the SiteBuilder design. Every account gets its own saved site, with pages you can open, edit and come back to.

**Top bar:** the site's domain, a page picker (Home, Services, About, Case Studies, Contact, plus "New page"), the mode switch (AI, Visual, Code), Preview and Publish.

**AI mode**
- On the left, a chat with the agent: "Build the homepage on the brand kit…". The agent replies, shows its build steps, then creates or changes sections on the page.
- A version card ("Version 3 · 6 sections · 2 min ago") with **Restore** to go back to an earlier version.
- Suggestion chips such as "Add a loan calculator", "Make the hero shorter" and "Generate case studies page".
- On the right, the full page preview in the account's brand.

**Visual mode**
- Left panel with three tabs:
  - **Layouts:** a searchable list of section types (navigation, hero, image hero, stats, services tabs, contact form, calculator, footer), each with a small layout sketch.
  - **Elements**
  - **Layers:** reorder, hide or delete sections.
- Middle: the page. Click any text to edit it in place; the selected section is outlined.
- Right: a settings panel for the selected section. Spacing (margin and padding), size, typography (brand font, weight, size), and colours limited to the brand kit.

**Code mode**
- A file list (Hero, Stats, theme) and a read-only code view of the current page.
- When the agent changes the page, you see the change ("Agent changed 2 lines") with an **Accept** button.

**Saving and publishing**
- Changes save automatically for each account and page.
- Each save keeps a version, so Restore works.
- **Preview** opens the page full screen at its own app address.
- **Publish** marks the page live and gives it a shareable read-only link inside the app, so each client's site lives in Why Media AI. It doesn't connect the client's own domain yet; that can come later.

## 3. Verification
- Create a site and a brand kit as a real signed-in user.
- Edit them, reload, and confirm everything is still there.
- Switch accounts and confirm each one shows its own brand and site.
- Take screenshots of each mode next to your designs.

## Technical details
- **Brand:** extend `brand_brain` with `version text`, `locked boolean`, `values jsonb`, `icons jsonb`, `sections jsonb` and `fonts jsonb` (uploaded font file paths, plus a web fallback). Each new column is nullable or has a default. Add the new fields to `saveBrandBrain`. Add a `reviseBrandKit` server function that uses the existing AI call and returns structured palette, typography, values and voice patches.
- **Shared brand theme:** move the logic in `useEmailBrand` into `src/lib/brandTheme.ts`. It returns `{ colors, fonts, logos }` and injects `@font-face` from signed brand-asset URLs. Post Designer, Email and Site Builder all use it.
- **Site:** reuse `site_pages` (`sections jsonb`, `status`, `slug`). Add a `site_page_versions` table (page_id, sections, created_at, owner RLS and grants) and a `published_at` column. Sections are typed blocks (`nav`, `hero`, `overlay`, `stats`, `tabs`, `form`, `calc`, `footer`), and one renderer is shared by the AI, Visual, Preview and published views.
- **AI build:** a `buildSiteSection` server function on the default gateway model returns section JSON through a strict schema.
- **Published route:** `src/routes/site.$brandId.$slug.tsx` serves published pages. It reads them through a server function that returns only rows with `status = 'published'`.
- **Design reference:** follow `/tmp/wm2/BrandGuidelines.dc.html` and `SiteBuilder.dc.html` for layout, spacing and type.
