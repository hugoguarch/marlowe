# Why Media AI: header bar, scheduler, designers, sidebar, Site Builder and CMS

Each screen is rebuilt from its matching HTML file in the new design zip (PostDesigner, PostScheduler, EmailMarketing, BrandGuidelines, SiteBuilder, CMS, Sidebar, Topbar, AgentBar), using its fonts and images. Done one screen at a time, and each is checked in a browser against the design.

## 1. "Ask Why AI" bar in the header
- Move the bar from the bottom of the screen into the top header, between the breadcrumb and the date / New Task buttons.
- Clicking it or pressing ⌘K opens the same panel (plan steps, Run) dropping down from the header.
- Remove the floating bottom bar.

## 2. Sidebar: collapse, expand and hover menus
- Add a collapse/expand button to the sidebar and remember the choice.
- When collapsed, hovering a department icon (Marketing, Design, Video, Web) opens a small menu next to it with that section's pages. Click a page to go to it.
- Dashboard, Agent, Accounts and Settings icons show a tooltip with their name.

## 3. Post Designer (rebuilt to the design)
- Layout, canvas, slide strip, format switch (1:1, 4:5, 9:16), caption and brand-kit panels as in PostDesigner.html.
- Uses the account's saved brand kit and AI generation that already exists.
- New "Schedule" action: pick channel(s), date and time, and the post is saved to the schedule for that account.

## 4. Post Scheduler (calendar, not a generator)
- Rebuilt from PostScheduler.html: month/week calendar, a queue list and post detail.
- Shows posts scheduled from the Post Designer.
- "New post" lets you upload your own image or video, write a caption, choose channels and date/time.
- Drag a post to another day to reschedule; edit or delete a scheduled post.
- The generator that is there now moves into the Post Designer, so nothing is lost.

## 5. Email Marketing and Email Designer
- Email Marketing matches your screenshot: e-send list (All / Drafts / Scheduled / Automations), the full email shown in the middle with desktop/mobile toggle, and stats on the right (open rate, clicks, A/B subject, most clicked).
- Emails are drawn in full in the brand style (header, hero image, figures strip, buttons, insights).
- Email Designer: a block editor (header, hero, text, figures, button, articles, footer) with live preview, built from the account's brand kit. "Edit in Email Designer" opens the selected email.
- Stats with no source connected show "N/A", not invented numbers.

## 6. Brand Guidelines generator
- Rebuilt to BrandGuidelines.html: logo, colours, type, imagery, tone of voice and usage pages.
- More powerful: generate from a website or uploaded files, edit each section, regenerate one section at a time, and export the guidelines as a printable document in the same layout.
- The saved brand kit feeds Post Designer, Email Designer and Site Builder.

## 7. Site Builder
- Rebuilt to SiteBuilder.html with its three modes (pages and sections, visual edit, preview).
- Add, reorder and edit sections; desktop/tablet/mobile preview; pages saved per account.

## 8. CMS
- Rebuilt to CMS.html: collections list, entry table with status and SEO score, and the full entry editor (content blocks, meta, SEO, AI Search tabs).
- Entries are saved for real per account instead of the fixed example list; Articles can publish into it.

## Questions to confirm while building
- Publishing to Instagram/Facebook/LinkedIn at the scheduled time is a separate step. This plan saves and shows scheduled posts but does not post them automatically yet.
- Sending emails to real recipients is not included. Emails can be designed, saved and scheduled.

## Technical details
- Header bar: refactor `AgentBar` into a header-anchored variant inside `Topbar`; drop it from `_shell.tsx`.
- Sidebar: collapsed state in localStorage, read after hydration; flyouts with Radix HoverCard/Popover using `DEPTS` from `nav.ts`.
- Scheduling: reuse the existing scheduled-content storage that the scheduler and MCP `queue-post`/`list-schedule` tools use; add media upload through Cloud storage (a new bucket with per-user policies) and a migration for any missing columns (media URLs, channels, scheduled time).
- New tables with RLS and grants for email designs, brand guideline documents (if the current brand storage can't hold sections), site pages and CMS entries, all scoped to the account/client.
- Port markup and CSS from each `.dc.html` into React components using the existing tokens in `src/styles.css`; design images uploaded with lovable-assets.
- Each screen gets its own `head()` metadata; verify each with Playwright screenshots signed in.
