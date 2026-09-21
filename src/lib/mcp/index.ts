import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listBrandsTool from "./tools/list-brands";
import getBrandBrainTool from "./tools/get-brand-brain";
import listScheduleTool from "./tools/list-schedule";
import listContentTool from "./tools/list-content";
import queuePostTool from "./tools/queue-post";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "marlowe-your-ai-marketing-partner",
  title: "Marlowe: Your AI Marketing Partner",
  version: "0.1.0",
  instructions:
    "Tools for Marlowe, an AI marketing workspace. Start with `list_brands` to find the signed-in user's brand brains, then read a brand's guidelines with `get_brand_brain`, review work with `list_content` and `list_schedule`, and create new work with `queue_post`.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listBrandsTool, getBrandBrainTool, listContentTool, listScheduleTool, queuePostTool],
});
