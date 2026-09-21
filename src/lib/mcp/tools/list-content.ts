import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_content",
  title: "List posts made so far",
  description: "List the posts Marlowe has created, newest first, with captions and status.",
  inputSchema: {
    brandId: z.string().uuid().optional().describe("Limit to one brand."),
    limit: z.number().int().min(1).max(50).optional().describe("How many posts to return (default 12)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ brandId, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("content_items")
      .select("id, title, caption, template, channel, status, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 12);
    if (brandId) query = query.eq("brand_id", brandId);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const posts = (data ?? []).map((r) => ({
      id: String(r.id),
      title: String(r.title ?? ""),
      caption: r.caption ? String(r.caption) : null,
      template: r.template ? String(r.template) : null,
      channel: String(r.channel ?? ""),
      status: String(r.status ?? ""),
      createdAt: r.created_at ? String(r.created_at) : null,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(posts, null, 2) }],
      structuredContent: { posts },
    };
  },
});
