/**
 * Studio — AI-written post copy, AI-generated artwork, and the queue.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

export type PostSlide = { title: string; caption: string };
export type PostCopy = {
  headline: string;
  subhead: string;
  slides: PostSlide[];
  caption: string;
  hashtags: string[];
};

const copySchema = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "subhead", "slides", "caption", "hashtags"],
  properties: {
    headline: { type: "string" },
    subhead: { type: "string" },
    slides: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "caption"],
        properties: { title: { type: "string" }, caption: { type: "string" } },
      },
    },
    caption: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
  },
};

async function brandContext(ctx: Ctx, brandId: string) {
  const { data: brand } = await ctx.supabase
    .from("brands")
    .select("id, name, website")
    .eq("id", brandId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  const { data: brain } = await ctx.supabase
    .from("brand_brain")
    .select("palette, typography, tone_of_voice, personas, audience")
    .eq("brand_id", brandId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  return { brand, brain };
}

/** Write the post and generate its artwork. */
export const generatePost = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      brandId: string;
      template: string;
      topic: string;
      imagePath?: string | null;
    }) => ({
      brandId: String(input.brandId),
      template: String(input.template ?? "carousel"),
      topic: String(input.topic ?? "").slice(0, 500),
      imagePath: input.imagePath ?? null,
    }),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { generateJSON, generateImage } = await import("@/lib/ai.server");
    const { brand, brain } = await brandContext(ctx, data.brandId);
    if (!brand) throw new Error("That brand no longer exists.");

    const palette = (brain?.palette as { name: string; hex: string }[]) ?? [];
    const tone = (brain?.tone_of_voice as string[]) ?? [];
    const personas = (brain?.personas as { name: string; detail: string }[]) ?? [];
    const audience = (brain?.audience as string) ?? "";
    const slideCount = data.template === "carousel" ? 5 : 1;

    const copy = await generateJSON<PostCopy>({
      system: `You write social content for ${brand.name}. Match this tone of voice exactly: ${
        tone.join(" ") || "confident, plain English, never hype."
      } Audience: ${audience || personas.map((p) => p.name).join("; ") || "their customers"}. Headlines are at most six words. Slide captions are at most twenty words. The caption is at most 60 words. Return exactly ${slideCount} slide${slideCount > 1 ? "s" : ""}. At most five hashtags, no # symbol needed.`,
      prompt: `Write a ${data.template} post about: ${data.topic || "what makes this brand worth following this week"}.`,
      schemaName: "post_copy",
      schema: copySchema,
    });

    const colours = palette.map((c) => `${c.name} ${c.hex}`).join(", ");
    const image = await generateImage(
      `Editorial photographic background for a premium ${brand.name} social post about "${data.topic || copy.headline}". Cinematic natural light, shallow depth of field, generous empty space in the upper left for text, no text or logos in the image. Colour mood: ${colours || "deep ink navy, cerulean blue, warm gold"}.`,
      "1024x1024",
    );

    const path = `${ctx.userId}/${data.brandId}/renders/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await ctx.supabase.storage
      .from("brand-assets")
      .upload(path, image.bytes, { contentType: image.contentType, upsert: false });
    if (uploadError) throw uploadError;

    const { data: signed } = await ctx.supabase.storage
      .from("brand-assets")
      .createSignedUrl(path, 60 * 60 * 6);

    return {
      copy: { ...copy, slides: copy.slides.slice(0, slideCount) },
      imagePath: path,
      imageUrl: signed?.signedUrl ?? null,
    };
  });

/** Save a finished post and schedule it on each chosen channel. */
export const queuePost = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      brandId: string;
      template: string;
      title: string;
      caption: string;
      slides: PostSlide[];
      channels: string[];
      imagePath?: string | null;
      scheduledFor?: string;
    }) => ({
      brandId: String(input.brandId),
      template: String(input.template ?? "carousel"),
      title: String(input.title ?? "Untitled").slice(0, 200),
      caption: String(input.caption ?? "").slice(0, 2000),
      slides: Array.isArray(input.slides) ? input.slides.slice(0, 10) : [],
      channels: Array.isArray(input.channels) && input.channels.length ? input.channels.slice(0, 6) : ["Instagram"],
      imagePath: input.imagePath ?? null,
      scheduledFor: input.scheduledFor ?? null,
    }),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;

    const { data: item, error } = await supabase
      .from("content_items")
      .insert({
        user_id: userId,
        brand_id: data.brandId,
        title: data.title,
        caption: data.caption,
        format: data.template,
        template: data.template,
        channel: data.channels[0],
        status: "queued",
        slides: data.slides,
        render_url: data.imagePath,
      })
      .select("id")
      .single();
    if (error) throw error;

    const when = data.scheduledFor ? new Date(data.scheduledFor) : (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(7, 45, 0, 0);
      return d;
    })();

    const { error: scheduleError } = await supabase.from("schedule").insert(
      data.channels.map((channel) => ({
        user_id: userId,
        brand_id: data.brandId,
        content_item_id: item.id,
        title: data.title,
        channel,
        scheduled_for: when.toISOString(),
        status: "queued",
      })),
    );
    if (scheduleError) throw scheduleError;

    return { id: item.id as string, scheduledFor: when.toISOString() };
  });

/** Everything on the calendar, with the artwork and caption for the pop-up. */
export const getSchedule = createServerFn({ method: "POST" })
  .inputValidator((input: { brandId?: string | null } | undefined) => ({
    brandId: input?.brandId ?? null,
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    let query = supabase
      .from("schedule")
      .select("id, title, channel, scheduled_for, status, content_item_id, posted_at")
      .eq("user_id", userId)
      .order("scheduled_for", { ascending: true })
      .limit(200);
    if (data.brandId) query = query.eq("brand_id", data.brandId);
    const { data: rows } = await query;

    const list = (rows ?? []) as any[];
    const itemIds = list.map((r) => r.content_item_id).filter(Boolean);
    const items = new Map<string, any>();
    if (itemIds.length) {
      const { data: contents } = await supabase
        .from("content_items")
        .select("id, caption, template, render_url")
        .in("id", itemIds);
      for (const c of (contents ?? []) as any[]) items.set(c.id, c);
    }

    return Promise.all(
      list.map(async (r) => {
        const item = r.content_item_id ? items.get(r.content_item_id) : null;
        let imageUrl: string | null = null;
        if (item?.render_url) {
          const { data: signed } = await supabase.storage
            .from("brand-assets")
            .createSignedUrl(item.render_url, 60 * 60 * 6);
          imageUrl = signed?.signedUrl ?? null;
        }
        return {
          id: r.id as string,
          title: r.title as string,
          channel: r.channel as string,
          scheduled_for: r.scheduled_for as string,
          status: r.status as string,
          postedAt: (r.posted_at as string | null) ?? null,
          caption: (item?.caption as string | null) ?? null,
          template: (item?.template as string | null) ?? "carousel",
          imageUrl,
        };
      }),
    );
  });

/** Move a scheduled post. */
export const rescheduleItem = createServerFn({ method: "POST" })
  .inputValidator((input: { scheduleId: string; when: string }) => ({
    scheduleId: String(input.scheduleId),
    when: new Date(input.when).toISOString(),
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const { error } = await supabase
      .from("schedule")
      .update({ scheduled_for: data.when })
      .eq("id", data.scheduleId)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });

/** Take a post off the calendar. */
export const removeScheduleItem = createServerFn({ method: "POST" })
  .inputValidator((input: { scheduleId: string }) => ({ scheduleId: String(input.scheduleId) }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const { error } = await supabase
      .from("schedule")
      .delete()
      .eq("id", data.scheduleId)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });

/** Posts already made, newest first. */
export const listPosts = createServerFn({ method: "POST" })
  .inputValidator((input: { brandId?: string | null } | undefined) => ({
    brandId: input?.brandId ?? null,
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    let query = supabase
      .from("content_items")
      .select("id, title, caption, template, channel, status, slides, render_url, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12);
    if (data.brandId) query = query.eq("brand_id", data.brandId);
    const { data: rows } = await query;

    return Promise.all(
      ((rows ?? []) as any[]).map(async (row) => {
        let url: string | null = null;
        if (row.render_url) {
          const { data: signed } = await supabase.storage
            .from("brand-assets")
            .createSignedUrl(row.render_url, 60 * 60 * 6);
          url = signed?.signedUrl ?? null;
        }
        return { ...row, imageUrl: url };
      }),
    );
  });
