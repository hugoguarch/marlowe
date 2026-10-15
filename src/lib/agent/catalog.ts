/** Built-in agent tools, shared by the agent (server) and the Tools panel (browser). */
export const TOOL_CATALOG: { id: string; label: string; summary: string }[] = [
  { id: "get_brand_kit", label: "Read brand kit", summary: "Colours, fonts, voice and audience for the selected brand." },
  { id: "get_analytics", label: "Read analytics", summary: "Totals per channel for the selected account." },
  { id: "get_top_posts", label: "Read top posts", summary: "Best-performing social posts and videos." },
  { id: "list_schedule", label: "Check the schedule", summary: "Posts already planned between two dates." },
  { id: "create_post", label: "Design and schedule a post", summary: "Writes copy, generates the artwork and puts it in the Post Scheduler." },
  { id: "create_report", label: "Generate a report", summary: "Builds a monthly report from live analytics." },
  { id: "create_site_page", label: "Draft a web page", summary: "Creates a draft page in Site Builder." },
  { id: "create_email", label: "Draft an email", summary: "Creates an email in Email Designer, optionally with a send date." },
  { id: "schedule_task", label: "Schedule a task", summary: "Runs an instruction later or on repeat." },
  { id: "list_tasks", label: "List scheduled tasks", summary: "Shows what the agent has planned." },
];

export const TOOL_LABELS: Record<string, string> = Object.fromEntries(TOOL_CATALOG.map((t) => [t.id, t.label]));

/** Ready-made remote tool servers people commonly connect. URLs come from each provider's docs. */
export const MCP_PRESETS: { name: string; url: string; headerHint: string }[] = [
  { name: "GoHighLevel", url: "https://services.leadconnectorhq.com/mcp/", headerHint: "Authorization: Bearer <private integration token>\nlocationId: <your location ID>" },
];
