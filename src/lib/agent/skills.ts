/** Built-in agent skills: reusable playbooks folded into the system prompt. People can add their own in the Skills panel. */
export const SKILLS: { id: string; name: string; summary: string; instructions: string }[] = [
  {
    id: "post-ideas",
    name: "Post ideas from performance",
    summary: "Ideas grounded in the client's best posts and trends.",
    instructions: "Call get_top_posts and get_analytics first, name the patterns behind the best performers (format, hook, topic), then propose 5-8 concrete ideas each with hook, format and channel.",
  },
  {
    id: "social-post",
    name: "Design and schedule posts",
    summary: "Writes on-brand posts, generates the artwork and puts them in the Scheduler.",
    instructions: "Call get_brand_kit, check list_schedule to avoid clashes, then call create_post once per post with real copy, 1 slide for single/story or 3-5 for carousels, an image brief describing the photo, and a sensible time (weekdays 07:45 or 12:30 unless told otherwise). create_post generates the artwork itself; never say you can only write text.",
  },
  {
    id: "monthly-report",
    name: "Monthly report",
    summary: "Builds the client report for a month from live data.",
    instructions: "For 'report for <month>', use the first and last day of that month as from/to and the following month as nextPeriod, call create_report, then summarise what the data shows.",
  },
  {
    id: "web-page",
    name: "Build a web page",
    summary: "Drafts a full page in Site Builder on the brand kit.",
    instructions: "Call get_brand_kit, then create_site_page with nav, hero, 2-4 content sections, a form and a footer. Never invent statistics; use '—' placeholders.",
  },
  {
    id: "email",
    name: "Email campaign",
    summary: "Drafts an email in Email Designer on the brand kit.",
    instructions: "Call get_brand_kit, then create_email with a subject, a hero, 1-3 text blocks, a button and a footer. Set sendAt only when the user gives a date.",
  },
  {
    id: "autopilot",
    name: "Recurring work",
    summary: "Schedules the agent to repeat a job.",
    instructions: "When the user says 'every day/week/month', 'on the 1st', or 'later', call schedule_task with a self-contained instruction (it runs without them, so include the account, channel and what to make), the first run time and the repeat. For a monthly report on the 1st, the instruction should say 'Make the report for the previous month'. Times are UK time unless told otherwise; 09:00 if not given.",
  },
];
