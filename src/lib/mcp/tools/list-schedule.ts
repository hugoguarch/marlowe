import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_schedule",
  title: "List scheduled posts",
  description: "List the user's scheduled and published posts, soonest first.",
  inputSchema: {
    brandId: z.string().uuid().optional().describe("Limit to one brand."),
    limit: z.number().int().min(1).max(100).optional().describe("How many rows to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ brandId, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("schedule")
      .select("id, title, channel, scheduled_for, status, posted_at")
      .order("scheduled_for", { ascending: true })
      .limit(limit ?? 25);
    if (brandId) query = query.eq("brand_id", brandId);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const items = (data ?? []).map((r) => ({
      id: String(r.id),
      title: String(r.title ?? ""),
      channel: String(r.channel ?? ""),
      scheduledFor: r.scheduled_for ? String(r.scheduled_for) : null,
      status: String(r.status ?? ""),
      postedAt: r.posted_at ? String(r.posted_at) : null,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      structuredContent: { items },
    };
  },
});
