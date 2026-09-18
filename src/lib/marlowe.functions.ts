/**
 * Stage 4 backend seams.
 *
 * These server functions are the single boundary between the workspace UI and
 * whatever runs Marlowe. Today they return realistic data (persisted where it
 * makes sense, shaped like the tables). Later they call the agent backend.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  briefBody,
  briefSummary,
  channelWork,
  byPlatform,
  followerSeries,
  metrics as metricCards,
  topContent,
  upcoming,
} from "@/lib/mock/workspace";

type Ctx = { supabase: any; userId: string };

/** Every workspace has exactly one brand for now; create it on first touch. */
async function ensureBrand({ supabase, userId }: Ctx): Promise<string> {
  const { data: existing } = await supabase
    .from("brands")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from("brands")
    .insert({ user_id: userId, name: "My brand" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** generate_brief — the morning brief shown on /app. */
export const generateBrief = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const brandId = await ensureBrand({ supabase, userId });

    const { data: queue } = await supabase
      .from("action_queue")
      .select("id, kind, label, detail, status")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    return {
      brandId,
      generatedAt: new Date().toISOString(),
      summary: briefSummary,
      body: briefBody,
      channels: channelWork.map((c) => ({ ...c })),
      actions: queue ?? [],
      source: "stub" as const,
    };
  });

/** chat_with_marlowe — persists both sides of the thread in chat_messages. */
export const chatWithMarlowe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { body: string }) => {
    const body = String(input?.body ?? "").trim();
    if (!body) throw new Error("Empty message");
    return { body: body.slice(0, 4000) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const brandId = await ensureBrand({ supabase, userId });

    const reply =
      "Understood. I'll fold that into this week — the calendar reshapes around it and you'll see the revised plan in the Studio shortly.";

    const { error } = await supabase.from("chat_messages").insert([
      { user_id: userId, brand_id: brandId, role: "user", body: data.body },
      { user_id: userId, brand_id: brandId, role: "marlowe", body: reply },
    ]);
    if (error) throw error;

    return { reply, source: "stub" as const };
  });

/** Thread history for the Marlowe page. */
export const getChatHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const { data } = await supabase
      .from("chat_messages")
      .select("id, role, body, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(100);
    return (data ?? []) as { id: string; role: string; body: string; created_at: string }[];
  });

/** create_post — writes a content item and, optionally, its schedule rows. */
export const createPost = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      title: string;
      caption?: string;
      format?: string;
      channels: string[];
      slides?: { title: string; caption: string }[];
    }) => ({
      title: String(input?.title ?? "Untitled").slice(0, 200),
      caption: input?.caption ? String(input.caption).slice(0, 2000) : undefined,
      format: input?.format ?? "carousel",
      channels: Array.isArray(input?.channels) ? input.channels.slice(0, 8) : [],
      slides: Array.isArray(input?.slides) ? input.slides : [],
    }),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const brandId = await ensureBrand({ supabase, userId });
    const channels = data.channels.length ? data.channels : ["Instagram"];

    const { data: item, error } = await supabase
      .from("content_items")
      .insert({
        user_id: userId,
        brand_id: brandId,
        title: data.title,
        caption: data.caption ?? null,
        format: data.format,
        channel: channels[0],
        status: "queued",
        slides: data.slides,
      })
      .select("id")
      .single();
    if (error) throw error;

    const when = new Date();
    when.setDate(when.getDate() + 1);
    when.setHours(7, 45, 0, 0);

    const { error: scheduleError } = await supabase.from("schedule").insert(
      channels.map((channel) => ({
        user_id: userId,
        brand_id: brandId,
        content_item_id: item.id,
        title: data.title,
        channel,
        scheduled_for: when.toISOString(),
        status: "queued",
      })),
    );
    if (scheduleError) throw scheduleError;

    return { id: item.id as string, channels, scheduledFor: when.toISOString(), source: "stub" as const };
  });

/** pull_analytics — Growth page numbers. */
export const pullAnalytics = createServerFn({ method: "POST" })
  .inputValidator((input: { range?: string }) => ({ range: input?.range ?? "30 days" }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const brandId = await ensureBrand({ supabase, userId });

    const scale = data.range === "7 days" ? 0.35 : data.range === "90 days" ? 1.6 : 1;

    return {
      brandId,
      range: data.range,
      goal: 10000,
      current: 7412,
      cards: metricCards,
      byPlatform,
      series: followerSeries.map((p) => ({ ...p, value: Math.round(p.value * (0.9 + 0.1 * scale)) })),
      topContent,
      upcoming,
      source: "stub" as const,
    };
  });
