import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_brand_brain",
  title: "Get a brand brain",
  description: "Read one brand's palette, typography, tone of voice, audience and personas.",
  inputSchema: { brandId: z.string().uuid().describe("Brand id from list_brands.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ brandId }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("brand_brain")
      .select("palette, typography, tone_of_voice, personas, audience, learned")
      .eq("brand_id", brandId)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return { content: [{ type: "text", text: "No brand brain found for that brand." }], isError: true };
    }

    const brain = {
      palette: data.palette ?? null,
      typography: data.typography ?? null,
      toneOfVoice: data.tone_of_voice ?? null,
      personas: data.personas ?? null,
      audience: data.audience ?? null,
      learned: data.learned ?? null,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(brain, null, 2) }],
      structuredContent: { brain: JSON.parse(JSON.stringify(brain)) as Record<string, unknown> },
    };
  },
});
