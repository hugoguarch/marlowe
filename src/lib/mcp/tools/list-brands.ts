import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_brands",
  title: "List brand brains",
  description: "List the signed-in user's brand brains, newest default first.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("brands")
      .select("id, name, website, is_default, daily_target, created_at")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const brands = (data ?? []).map((b) => ({
      id: String(b.id),
      name: String(b.name ?? ""),
      website: b.website ? String(b.website) : null,
      isDefault: Boolean(b.is_default),
      dailyTarget: Number(b.daily_target ?? 0),
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(brands, null, 2) }],
      structuredContent: { brands },
    };
  },
});
