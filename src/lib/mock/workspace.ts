/**
 * Placeholder workspace content for Stage 2/3.
 * Shapes mirror the tables planned for Stage 4, so each page can swap
 * these constants for Supabase queries without redesigning the UI.
 */

export type BriefItem = { label: string; detail: string };

export const briefSummary: { heading: string; items: BriefItem[] }[] = [
  {
    heading: "Noticed",
    items: [
      { label: "Two trends broke overnight", detail: "Both land squarely in your market." },
      { label: "Tuesday's reel outperformed", detail: "3.4× your usual saves." },
      { label: "A competitor cut prices", detail: "Their post is gaining traction." },
    ],
  },
  {
    heading: "Prepared",
    items: [
      { label: "Six posts drafted", detail: "Three reels, two carousels, one story set." },
      { label: "A response to the price cut", detail: "Confident, not defensive." },
      { label: "Christmas concept", detail: "From a thread in your inbox." },
    ],
  },
  {
    heading: "Moved",
    items: [
      { label: "41 comments answered", detail: "In your voice, overnight." },
      { label: "9 reviews replied to", detail: "Average 4.8 stars this week." },
      { label: "Google Business updated", detail: "New hours and two photos." },
    ],
  },
];

export const briefBody = [
  "Morning. Two trends broke in your market overnight, so I built the posts around both — one leans into the price conversation, the other is pure craft.",
  "Your best content this week was Tuesday's reel, so I made three more in that shape. A competitor tried to undercut you; I have the response ready and I would not rush it out before noon.",
  "And from your inbox it looks like you are planning something for Christmas. Shall I start? Approve and I will ship it all now.",
];

export const channelWork = [
  { channel: "Instagram", state: "3 posts queued, 41 comments answered", tone: "cerulean" },
  { channel: "LinkedIn", state: "1 long-form post drafted for Thursday", tone: "ink" },
  { channel: "TikTok", state: "2 short-form edits ready to review", tone: "gold" },
  { channel: "Google Business", state: "Hours updated, 9 reviews replied to", tone: "green" },
  { channel: "Email", state: "Christmas concept outlined, awaiting your nod", tone: "ink" },
] as const;

export const chatSeed = [
  {
    role: "marlowe" as const,
    body: "Morning. I've drafted this week's content and answered everything that came in overnight. Anything you want me to steer differently?",
  },
  {
    role: "user" as const,
    body: "Push harder on the craft angle this week, less on price.",
  },
  {
    role: "marlowe" as const,
    body: "Noted — I'll reweight the calendar toward process and detail, and hold the price response unless they escalate. I'll show you the revised week in the Studio in a few minutes.",
  },
];

export const palette = [
  { name: "Ink", hex: "#0E2033" },
  { name: "Cerulean", hex: "#2E7DD1" },
  { name: "Green", hex: "#2E7D62" },
  { name: "Sun", hex: "#E2B357" },
];

export const personas = [
  {
    name: "The founder who has outgrown DIY",
    detail: "Runs a £1–5m business, posts when they remember, knows it is costing them.",
  },
  {
    name: "The marketing lead with no team",
    detail: "Wants leverage, not another dashboard to babysit.",
  },
  {
    name: "The agency-fatigued operator",
    detail: "Has paid retainers before and wants proof of work, not decks.",
  },
];

export const toneOfVoice = [
  "Confident, never loud.",
  "Plain English. No jargon, no hype words.",
  "Speaks as a colleague — first person, decisive.",
  "Short sentences. One idea at a time.",
];

export const learned = [
  "Reels that open on a face out-perform product-first cuts by 2.6×.",
  "Posts published 07:40–08:20 hold 38% more watch time.",
  "Saves climb whenever the caption asks nothing of the reader.",
  "Price-led content underperforms your craft-led content every week so far.",
];

export const carouselSlides = [
  { title: "The 6am edit", caption: "What the team sees before the doors open." },
  { title: "Three details", caption: "The ones most people miss entirely." },
  { title: "Built, not bought", caption: "Why we still do this by hand." },
  { title: "This week", caption: "A quiet look at what shipped." },
  { title: "Your move", caption: "Book a walkthrough this week." },
];

export const channels = [
  { name: "Instagram", tone: "cerulean" },
  { name: "LinkedIn", tone: "ink" },
  { name: "TikTok", tone: "gold" },
  { name: "Google Business", tone: "green" },
] as const;

export const weekCalendar = [
  { day: "Mon", items: [{ label: "Reel — the 6am edit", tone: "cerulean" }] },
  {
    day: "Tue",
    items: [
      { label: "Carousel — three details", tone: "cerulean" },
      { label: "Post — built, not bought", tone: "ink" },
    ],
  },
  { day: "Wed", items: [{ label: "Short — behind the bench", tone: "gold" }] },
  {
    day: "Thu",
    items: [
      { label: "Long-form — the craft case", tone: "ink" },
      { label: "Review replies", tone: "green" },
    ],
  },
  { day: "Fri", items: [{ label: "Reel — this week", tone: "cerulean" }] },
  { day: "Sat", items: [{ label: "Story set", tone: "gold" }] },
  { day: "Sun", items: [{ label: "Listing refresh", tone: "green" }] },
] as const;

export const metrics = [
  { label: "Followers", value: "7,412", delta: "+312" },
  { label: "Engagement", value: "5.8%", delta: "+0.9pt" },
  { label: "Reach", value: "184k", delta: "+22%" },
  { label: "Saves", value: "1,946", delta: "+31%" },
  { label: "Profile visits", value: "9,203", delta: "+14%" },
];

export const byPlatform = [
  { platform: "Instagram", followers: "4,908", growth: "+204", engagement: "6.4%", reach: "112k" },
  { platform: "LinkedIn", followers: "1,642", growth: "+71", engagement: "4.9%", reach: "38k" },
  { platform: "TikTok", followers: "702", growth: "+31", engagement: "7.1%", reach: "28k" },
  { platform: "Google Business", followers: "160", growth: "+6", engagement: "3.2%", reach: "6k" },
];

export const followerSeries = [
  { label: "W1", value: 6480 },
  { label: "W2", value: 6612 },
  { label: "W3", value: 6790 },
  { label: "W4", value: 6884 },
  { label: "W5", value: 7040 },
  { label: "W6", value: 7188 },
  { label: "W7", value: 7301 },
  { label: "W8", value: 7412 },
];

export const topContent = [
  { title: "Tuesday's reel — the 6am edit", channel: "Instagram", metric: "48.2k views · 1,204 saves" },
  { title: "Built, not bought", channel: "LinkedIn", metric: "12.9k impressions · 318 reactions" },
  { title: "Behind the bench", channel: "TikTok", metric: "22.1k views · 640 shares" },
  { title: "Three details most people miss", channel: "Instagram", metric: "31.7k views · 902 saves" },
];

export const upcoming = [
  { title: "Reel — this week", when: "Fri 07:45", channel: "Instagram" },
  { title: "Story set", when: "Sat 10:00", channel: "Instagram" },
  { title: "Listing refresh", when: "Sun 09:00", channel: "Google Business" },
  { title: "The craft case", when: "Thu 08:10", channel: "LinkedIn" },
];

export const accounts = [
  "Instagram",
  "Facebook",
  "LinkedIn",
  "TikTok",
  "Google Business",
  "Google Analytics",
];

export const toneClass: Record<string, string> = {
  cerulean: "bg-cerulean",
  ink: "bg-ink-navy",
  gold: "bg-gold",
  green: "bg-brand-green",
};
