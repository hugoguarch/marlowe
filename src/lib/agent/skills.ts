/** Agent skills: reusable playbooks folded into the system prompt. Add new ones here. */
export const SKILLS: { id: string; name: string; summary: string; instructions: string }[] = [
  {
    id: "post-ideas",
    name: "Post ideas from performance",
    summary: "Ideas grounded in the client's best posts and trends.",
    instructions: "Call get_top_posts and get_analytics first, name the patterns behind the best performers (format, hook, topic), then propose 5-8 concrete ideas each with hook, format and channel.",
  },
  {
    id: "social-post",
    name: "Create and schedule posts",
    summary: "Writes on-brand posts and puts them in the Scheduler.",
    instructions: "Call get_brand_kit, check list_schedule to avoid clashes, then call create_post once per post with real copy, slides and a sensible time (weekdays 07:45 or 12:30 unless told otherwise).",
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
    id: "autopilot",
    name: "Recurring work",
    summary: "Schedules the agent to repeat a job.",
    instructions: "When the user says 'every week/month' or 'later', call schedule_task with the instruction written so it can run without them.",
  },
];
