import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TYPES = ["nav", "hero", "overlay", "stats", "tabs", "form", "calc", "footer"];
const str = { type: "string" };

/** Site agent: rewrites the page's section list from a request, on the brand kit. */
export const buildSite = createServerFn({ method: "POST" })
  .inputValidator((input: { brandId: string; pageTitle: string; request: string; sections: unknown[] }) => ({
    brandId: String(input.brandId),
    pageTitle: String(input.pageTitle ?? "Home").slice(0, 120),
    request: String(input.request ?? "").slice(0, 2000),
    sections: Array.isArray(input.sections) ? input.sections.slice(0, 20) : [],
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as { supabase: any; userId: string };
    const { data: brand } = await supabase.from("brands").select("name, website").eq("id", data.brandId).eq("user_id", userId).maybeSingle();
    if (!brand) throw new Error("Brand not found.");
    const { data: brain } = await supabase.from("brand_brain").select("tone_of_voice, audience, brand_values").eq("brand_id", data.brandId).maybeSingle();
    const { generateJSON } = await import("./ai.server");
    const schema = {
      type: "object", additionalProperties: false, required: ["reply", "steps", "sections"],
      properties: {
        reply: str,
        steps: { type: "array", items: str },
        sections: {
          type: "array",
          items: {
            type: "object", additionalProperties: false,
            required: ["id", "type", "kicker", "heading", "body", "cta", "items"],
            properties: {
              id: str, type: { type: "string", enum: TYPES }, kicker: str, heading: str, body: str, cta: str,
              items: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "body"], properties: { title: str, body: str } } },
            },
          },
        },
      },
    };
    return generateJSON<{ reply: string; steps: string[]; sections: { id: string; type: string; kicker: string; heading: string; body: string; cta: string; items: { title: string; body: string }[] }[] }>({
      system:
        "You are a website builder agent. Return the complete updated section list for the page. Keep existing section ids for sections you keep; new sections get a new short id. Section types: nav (items = menu links), hero (split text + image), overlay (headline over photo), stats (items: title = figure, body = label), tabs (services; items = title + description), form (contact), calc (loan/price calculator), footer (items = links). Write real, specific copy in the brand's voice. Never invent statistics: for stats use figures only if the user or current page provides them, otherwise use '—' and a label saying what figure to add. Empty string for unused fields. reply: one or two plain sentences. steps: 3-5 short past-tense build steps. No emoji.",
      prompt: `Brand: ${brand.name} (${brand.website ?? "no website"}). Tone: ${JSON.stringify(brain?.tone_of_voice ?? [])}. Audience: ${brain?.audience ?? ""}. Values: ${JSON.stringify(brain?.brand_values ?? [])}.\nPage: ${data.pageTitle}.\nCurrent sections: ${JSON.stringify(data.sections)}\n\nRequest: ${data.request}`,
      schemaName: "site_page",
      schema,
    });
  });

/** Public read of one published page plus its brand theme. Only published rows are ever returned. */
export const getPublishedPage = createServerFn({ method: "GET" })
  .inputValidator((input: { brandId: string; slug: string }) => ({ brandId: String(input.brandId).slice(0, 64), slug: String(input.slug).slice(0, 120) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: page } = await supabaseAdmin
      .from("site_pages").select("id, title, slug, sections, published_at")
      .eq("brand_id", data.brandId).eq("slug", data.slug).eq("status", "published").maybeSingle();
    if (!page) return null;
    const { data: brand } = await supabaseAdmin.from("brands").select("name").eq("id", data.brandId).maybeSingle();
    const { data: brain } = await supabaseAdmin.from("brand_brain").select("palette, typography").eq("brand_id", data.brandId).maybeSingle();
    const { data: logoRows } = await supabaseAdmin.from("brand_assets").select("file_path, file_name").eq("brand_id", data.brandId).eq("kind", "logo").order("is_primary", { ascending: false }).limit(6);
    const logos = await Promise.all((logoRows ?? []).map(async (l) => ({
      kind: "logo", file_name: l.file_name as string | null,
      url: (await supabaseAdmin.storage.from("brand-assets").createSignedUrl(l.file_path, 60 * 60 * 24)).data?.signedUrl ?? null,
    })));
    const signedUrl = logos[0]?.url ?? null;
    const { data: navPages } = await supabaseAdmin.from("site_pages").select("title, slug").eq("brand_id", data.brandId).eq("status", "published");
    return {
      title: page.title as string,
      sectionsJson: JSON.stringify(page.sections ?? []),
      pages: (navPages ?? []) as { title: string; slug: string }[],
      brand: { name: (brand?.name as string) ?? "", logoUrl: signedUrl, logos, palette: (brain?.palette ?? []) as { name: string; hex: string }[], typography: (brain?.typography ?? {}) as { headline?: string; body?: string } },
    };
  });
