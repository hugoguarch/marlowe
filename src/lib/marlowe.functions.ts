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

/** chat_with_marlowe — real agent: LLM + tools, both sides persisted in chat_messages. */
export const chatWithMarlowe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { body: string; brandId?: string | null; clientId?: string | null; files?: { path: string; name: string; mime: string }[] }) => {
    const body = String(input?.body ?? "").trim();
    const files = Array.isArray(input?.files) ? input.files.slice(0, 6).map((f) => ({ path: String(f.path), name: String(f.name).slice(0, 200), mime: String(f.mime).slice(0, 100) })) : [];
    if (!body && !files.length) throw new Error("Empty message");
    const uuid = (v: unknown) => (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : null);
    return { body: (body || "See the attached files.").slice(0, 8000), brandId: uuid(input?.brandId), clientId: uuid(input?.clientId), files };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const brandId = data.brandId ?? (await ensureBrand({ supabase, userId }));
    const { data: hist } = await supabase.from("chat_messages").select("role, body").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
    const { runAgent } = await import("./agent/agent.server");
    let reply: string, tools: unknown[] = [];
    try {
      const out = await runAgent({ supabase, userId }, { brandId, clientId: data.clientId }, (hist ?? []).reverse(), data.body, data.files);
      reply = out.reply; tools = out.tools;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("agent failed", msg);
      reply = /402|credit/i.test(msg) ? "AI credits have run out for this workspace. Top up in Settings → Plans & credits." : /429/.test(msg) ? "The AI is busy right now. Try again in a minute." : `I couldn't finish that: ${msg.slice(0, 200)}`;
    }
    const { error } = await supabase.from("chat_messages").insert([
      { user_id: userId, brand_id: brandId, role: "user", body: data.body, attachments: data.files },
      { user_id: userId, brand_id: brandId, role: "marlowe", body: reply, tools },
    ]);
    if (error) console.error("chat save failed", error.message);
    return { reply, tools: tools as any[] };
  });

/** Scheduled agent tasks for the signed-in user. */
export const listAgentTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const { data } = await supabase.from("agent_tasks").select("id, prompt, run_at, repeat, status, last_result, last_run_at").eq("user_id", userId).order("run_at").limit(50);
    return (data ?? []) as { id: string; prompt: string; run_at: string; repeat: string; status: string; last_result: string | null; last_run_at: string | null }[];
  });

export const cancelAgentTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => ({ id: String(i.id) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const { error } = await supabase.from("agent_tasks").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Thread history for the Marlowe page. */
export const getChatHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const { data } = await supabase
      .from("chat_messages")
      .select("id, role, body, created_at, attachments, tools")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(100);
    return (data ?? []) as { id: string; role: string; body: string; created_at: string; attachments: any[]; tools: any[] }[];
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

/** Approve everything pending in the action queue. */
export const approveQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const { data, error } = await supabase
      .from("action_queue")
      .update({ status: "approved" })
      .eq("user_id", userId)
      .eq("status", "pending")
      .select("id");
    if (error) throw error;
    return { approved: (data ?? []).length };
  });

/**
 * pull_analytics — Growth numbers, read only from what has actually been
 * captured. No connected channels means no numbers, and the page says so.
 */
export const pullAnalytics = createServerFn({ method: "POST" })
  .inputValidator((input: { range?: string }) => ({ range: input?.range ?? "30 days" }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const days = data.range === "7 days" ? 7 : data.range === "90 days" ? 90 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceDay = since.toISOString().slice(0, 10);

    const [{ data: accounts }, { data: rows }] = await Promise.all([
      supabase
        .from("connected_accounts")
        .select("provider, status, account_name")
        .eq("user_id", userId),
      supabase
        .from("metrics")
        .select("platform, metric, value, delta, captured_for")
        .eq("user_id", userId)
        .gte("captured_for", sinceDay)
        .order("captured_for", { ascending: true }),
    ]);

    const connected = (accounts ?? []).filter((a: any) => a.status === "connected");
    const metrics = (rows ?? []) as {
      platform: string;
      metric: string;
      value: number;
      delta: number | null;
      captured_for: string;
    }[];

    // Follower total per capture date, summed across platforms.
    const byDay = new Map<string, number>();
    for (const row of metrics) {
      if (row.metric !== "followers") continue;
      byDay.set(row.captured_for, (byDay.get(row.captured_for) ?? 0) + Number(row.value));
    }
    const series = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({ label, value }));

    // Latest value per platform+metric.
    const latest = new Map<string, { value: number; delta: number | null }>();
    for (const row of metrics) {
      latest.set(`${row.platform}|${row.metric}`, { value: Number(row.value), delta: row.delta });
    }

    const platforms = [...new Set(metrics.map((m) => m.platform))];
    const platformRows = platforms.map((platform) => ({
      platform,
      followers: latest.get(`${platform}|followers`)?.value ?? 0,
      growth: latest.get(`${platform}|followers`)?.delta ?? 0,
      engagement: latest.get(`${platform}|engagement`)?.value ?? 0,
      reach: latest.get(`${platform}|reach`)?.value ?? 0,
    }));

    const totalFor = (metric: string) =>
      platforms.reduce((sum, p) => sum + (latest.get(`${p}|${metric}`)?.value ?? 0), 0);
    const deltaFor = (metric: string) =>
      platforms.reduce((sum, p) => sum + (latest.get(`${p}|${metric}`)?.delta ?? 0), 0);

    const cards = ["followers", "engagement", "reach", "saves", "profile_visits"].map((metric) => ({
      metric,
      value: totalFor(metric),
      delta: deltaFor(metric),
    }));

    return {
      range: data.range,
      connectedCount: connected.length,
      connected: connected.map((a: any) => a.provider as string),
      hasData: metrics.length > 0,
      goal: 10000,
      current: series.length ? series[series.length - 1]!.value : 0,
      cards,
      byPlatform: platformRows,
      series,
    };
  });
