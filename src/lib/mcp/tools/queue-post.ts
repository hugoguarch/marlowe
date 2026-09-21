import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "queue_post",
  title: "Queue a post",
  description: "Create a post for a brand and schedule it on the chosen channels.",
  inputSchema: {
    brandId: z.string().uuid().describe("Brand id from list_brands."),
    title: z.string().trim().min(1).max(200).describe("Short internal title for the post."),
    caption: z.string().trim().max(2000).optional().describe("The caption to publish."),
    channels: z
      .array(z.string().trim().min(1))
      .min(1)
      .max(6)
      .describe("Channel names, e.g. Instagram, LinkedIn, TikTok."),
    scheduledFor: z.string().datetime().optional().describe("ISO date-time; defaults to tomorrow 07:45."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ brandId, title, caption, channels, scheduledFor }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId();
    if (!userId) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    const { data: item, error } = await supabase
      .from("content_items")
      .insert({
        user_id: userId,
        brand_id: brandId,
        title,
        caption: caption ?? null,
        format: "carousel",
        template: "carousel",
        channel: channels[0],
        status: "queued",
        slides: [],
      })
      .select("id")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const when = scheduledFor
      ? new Date(scheduledFor)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          d.setHours(7, 45, 0, 0);
          return d;
        })();

    const { error: scheduleError } = await supabase.from("schedule").insert(
      channels.map((channel) => ({
        user_id: userId,
        brand_id: brandId,
        content_item_id: item.id,
        title,
        channel,
        scheduled_for: when.toISOString(),
        status: "queued",
      })),
    );
    if (scheduleError) {
      return { content: [{ type: "text", text: scheduleError.message }], isError: true };
    }

    const result = { id: String(item.id), scheduledFor: when.toISOString(), channels };
    return {
      content: [{ type: "text", text: `Queued "${title}" for ${channels.join(", ")} at ${when.toISOString()}.` }],
      structuredContent: { post: result },
    };
  },
});
