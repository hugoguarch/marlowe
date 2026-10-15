/**
 * Why Media agent — server-only. One LLM (Lovable AI Gateway, Responses API) with
 * tools that call into the same tables every section of the app uses, so the
 * agent's work shows up in Scheduler, Reports, Site Builder etc.
 * Every tool filters by userId explicitly so it is safe under RLS and under the
 * service-role client used by the task scheduler.
 */
import { createOpenAI } from "@ai-sdk/openai";
import { isStepCount, streamText, tool, type ModelMessage } from "ai";
import { z } from "zod";

import { SKILLS } from "./skills";

export type AgentCtx = { supabase: any; userId: string };
export type AgentScope = { brandId: string | null; clientId: string | null };
export type ToolLog = { name: string; input: unknown; output: unknown; ok: boolean };
export type Attachment = { path: string; name: string; mime: string };

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildTools(ctx: AgentCtx, scope: AgentScope) {
  const { supabase, userId } = ctx;
  const needBrand = () => {
    if (!scope.brandId) throw new Error("No brand selected — pick a brand in the top bar first.");
    return scope.brandId;
  };
  const needClient = () => {
    if (!scope.clientId) throw new Error("No analytics client selected — pick a client (not All accounts) first.");
    return scope.clientId;
  };

  return {
    get_brand_kit: tool({
      description: "Read the selected brand's kit: name, website, tone of voice, audience, personas, values, palette, typography.",
      inputSchema: z.object({}),
      execute: async () => {
        const id = needBrand();
        const { data: brand } = await supabase.from("brands").select("name, website").eq("id", id).eq("user_id", userId).maybeSingle();
        const { data: brain } = await supabase.from("brand_brain").select("tone_of_voice, audience, personas, brand_values, palette, typography, social_line").eq("brand_id", id).maybeSingle();
        return { brand, brain };
      },
    }),

    get_analytics: tool({
      description: "Totals per channel and metric for the selected analytics client over the last N days (website, search, social, Google Business, YouTube).",
      inputSchema: z.object({ days: z.number().describe("Look-back window in days, e.g. 28") }),
      execute: async ({ days }) => {
        const cid = needClient();
        const from = isoDay(new Date(Date.now() - Math.min(Math.max(days, 1), 400) * 864e5));
        const { data } = await supabase.from("pulse_metrics_daily").select("channel, metric, value").eq("client_id", cid).gte("date", from).limit(20000);
        const totals: Record<string, number> = {};
        for (const r of data ?? []) totals[`${r.channel}.${r.metric}`] = (totals[`${r.channel}.${r.metric}`] ?? 0) + Number(r.value);
        return { from, rows: (data ?? []).length, totals };
      },
    }),

    get_top_posts: tool({
      description: "Best-performing published social posts/videos for the selected client, ranked by views or engagement.",
      inputSchema: z.object({ channel: z.string().nullable().describe("e.g. instagram, facebook, youtube, linkedin; null for all"), limit: z.number() }),
      execute: async ({ channel, limit }) => {
        const cid = needClient();
        let q = supabase.from("pulse_posts").select("channel, format, caption, views, reach, likes, comments, shares, saves, published_at, permalink").eq("client_id", cid);
        if (channel) q = q.eq("channel", channel.toLowerCase());
        const { data } = await q.order("views", { ascending: false }).limit(Math.min(Math.max(limit, 1), 20));
        return { posts: (data ?? []).map((p: any) => ({ ...p, caption: String(p.caption ?? "").slice(0, 280) })) };
      },
    }),

    list_schedule: tool({
      description: "Posts already scheduled for the selected brand between two dates.",
      inputSchema: z.object({ from: z.string().describe("YYYY-MM-DD"), to: z.string().describe("YYYY-MM-DD") }),
      execute: async ({ from, to }) => {
        const id = needBrand();
        const { data } = await supabase.from("schedule").select("title, channel, scheduled_for, status").eq("user_id", userId).eq("brand_id", id).gte("scheduled_for", from).lte("scheduled_for", `${to}T23:59:59Z`).order("scheduled_for");
        return { items: data ?? [] };
      },
    }),

    create_post: tool({
      description: "Create a social post in Post Designer and schedule it so it appears in the Post Scheduler. Use real copy in the brand voice.",
      inputSchema: z.object({
        title: z.string(),
        caption: z.string().describe("Full caption including hashtags"),
        template: z.string().describe("carousel, single, story or reel"),
        slides: z.array(z.object({ headline: z.string(), body: z.string() })),
        channels: z.array(z.string()).describe("Instagram, Facebook, LinkedIn, TikTok, X"),
        scheduledFor: z.string().describe("ISO date-time"),
      }),
      execute: async (p) => {
        const id = needBrand();
        const when = new Date(p.scheduledFor);
        const at = isNaN(+when) ? new Date(Date.now() + 864e5) : when;
        const channels = p.channels.length ? p.channels.slice(0, 6) : ["Instagram"];
        const { data: item, error } = await supabase.from("content_items").insert({
          user_id: userId, brand_id: id, title: p.title.slice(0, 200), caption: p.caption.slice(0, 2000), format: p.template, template: p.template,
          channel: channels[0], status: "queued", slides: p.slides.slice(0, 10),
        }).select("id").single();
        if (error) throw new Error(error.message);
        const { error: e2 } = await supabase.from("schedule").insert(channels.map((channel) => ({
          user_id: userId, brand_id: id, content_item_id: item.id, title: p.title.slice(0, 200), channel, scheduled_for: at.toISOString(), status: "queued",
        })));
        if (e2) {
          await supabase.from("content_items").delete().eq("id", item.id);
          throw new Error(e2.message);
        }
        return { id: item.id, scheduledFor: at.toISOString(), channels, link: "/marketing/scheduler" };
      },
    }),

    create_report: tool({
      description: "Generate a client performance report from live analytics data using the Why Media template. Saved to Reports for review.",
      inputSchema: z.object({ from: z.string().describe("YYYY-MM-DD"), to: z.string().describe("YYYY-MM-DD"), period: z.string().describe("e.g. October 2026"), nextPeriod: z.string().describe("e.g. November 2026") }),
      execute: async (d) => {
        const clientId = needClient();
        const { createReportFor } = await import("@/lib/pulse/report.functions");
        const r = await createReportFor(ctx as any, { clientId, ...d });
        return { ...r, link: "/marketing/analytics/reports" };
      },
    }),

    create_site_page: tool({
      description: "Create a draft website page in Site Builder for the selected brand, from typed sections.",
      inputSchema: z.object({
        title: z.string(),
        slug: z.string().describe("url-safe, e.g. nine-elms"),
        sections: z.array(z.object({
          type: z.string().describe("nav, hero, overlay, stats, tabs, form, calc or footer"),
          kicker: z.string(), heading: z.string(), body: z.string(), cta: z.string(),
          items: z.array(z.object({ title: z.string(), body: z.string() })),
        })),
      }),
      execute: async (p) => {
        const id = needBrand();
        const slug = p.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "page";
        const sections = p.sections.slice(0, 20).map((s, i) => ({ id: `s${i}${Math.random().toString(36).slice(2, 6)}`, ...s }));
        const { data, error } = await supabase.from("site_pages").insert({ user_id: userId, brand_id: id, title: p.title.slice(0, 120), slug, sections, status: "draft" }).select("id").single();
        if (error) throw new Error(error.message);
        return { id: data.id, slug, link: "/web/site-builder" };
      },
    }),

    schedule_task: tool({
      description: "Schedule the agent to run an instruction later or on repeat (e.g. every Monday draft the week's posts). Runs with the nightly refresh after it is due.",
      inputSchema: z.object({ prompt: z.string(), runAt: z.string().describe("ISO date-time"), repeat: z.string().describe("none, daily, weekly or monthly") }),
      execute: async (p) => {
        const repeat = ["daily", "weekly", "monthly"].includes(p.repeat) ? p.repeat : "none";
        const { data, error } = await supabase.from("agent_tasks").insert({ user_id: userId, brand_id: scope.brandId, prompt: p.prompt.slice(0, 2000), run_at: new Date(p.runAt).toISOString(), repeat }).select("id, run_at").single();
        if (error) throw new Error(error.message);
        return data;
      },
    }),
  };
}

function systemPrompt(scope: AgentScope) {
  return [
    "You are the Why Media AI agent, the operator of a marketing agency platform. You can read analytics and brand kits and you can create work in the app's sections with tools.",
    `Today is ${new Date().toISOString().slice(0, 10)}. Selected brand: ${scope.brandId ?? "none"}. Selected analytics client: ${scope.clientId ?? "all accounts"}.`,
    "Rules: use tools for anything that needs data or should be created — never invent figures; if data is missing say so. When asked to make something (post, report, page), call the tool to actually create it, then tell the user where it is. Keep replies short, clear, British English, no emoji. Use markdown lists where helpful.",
    "Skills:",
    ...SKILLS.map((s) => `- ${s.name}: ${s.instructions}`),
  ].join("\n");
}

async function attachmentParts(ctx: AgentCtx, files: Attachment[]) {
  const parts: any[] = [];
  for (const f of files.slice(0, 6)) {
    if (!f.path.startsWith(`${ctx.userId}/`)) continue;
    const { data, error } = await ctx.supabase.storage.from("brand-assets").download(f.path);
    if (error || !data) continue;
    const buf = new Uint8Array(await data.arrayBuffer());
    if (f.mime.startsWith("image/")) parts.push({ type: "image", image: buf, mediaType: f.mime });
    else if (f.mime === "application/pdf") parts.push({ type: "file", data: buf, mediaType: f.mime, filename: f.name });
    else parts.push({ type: "text", text: `Attached file ${f.name}:\n${new TextDecoder().decode(buf).slice(0, 40000)}` });
  }
  return parts;
}

export async function runAgent(ctx: AgentCtx, scope: AgentScope, history: { role: string; body: string }[], text: string, files: Attachment[]) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured for this workspace yet.");
  let runId: string | undefined;
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const h = new Headers(init?.headers);
      if (runId) h.set("X-Lovable-AIG-Run-ID", runId);
      const res = await fetch(input, { ...init, headers: h });
      runId ??= res.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
      return res;
    },
  });

  const messages: ModelMessage[] = history.slice(-20).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.body }) as ModelMessage);
  messages.push({ role: "user", content: [{ type: "text", text }, ...(await attachmentParts(ctx, files))] });

  const result = streamText({
    model: provider.responses(MODEL),
    instructions: systemPrompt(scope),
    messages,
    tools: buildTools(ctx, scope),
    stopWhen: isStepCount(50),
    providerOptions: {
      openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
    },
  });

  const reply = await result.text;
  const steps = await result.steps;
  const tools: ToolLog[] = [];
  for (const s of steps) {
    for (const r of s.toolResults as any[]) tools.push({ name: r.toolName, input: r.input, output: r.output, ok: true });
    for (const c of s.content as any[]) if (c.type === "tool-error") tools.push({ name: c.toolName, input: c.input, output: String(c.error?.message ?? c.error), ok: false });
  }
  return { reply: reply.trim() || "Done.", tools };
}

/** Called from the nightly hook: runs every due task as its owner. */
export async function runDueTasks() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: due } = await supabaseAdmin.from("agent_tasks").select("*").eq("status", "scheduled").lte("run_at", new Date().toISOString()).limit(20);
  let ran = 0;
  for (const t of due ?? []) {
    const ctx = { supabase: supabaseAdmin, userId: t.user_id };
    let result: string;
    try {
      const out = await runAgent(ctx, { brandId: t.brand_id, clientId: null }, [], t.prompt, []);
      result = out.reply;
      await supabaseAdmin.from("chat_messages").insert([
        { user_id: t.user_id, brand_id: t.brand_id, role: "user", body: `Scheduled task: ${t.prompt}` },
        { user_id: t.user_id, brand_id: t.brand_id, role: "marlowe", body: out.reply, tools: out.tools as any },
      ]);
      ran++;
    } catch (e) {
      result = `Failed: ${e instanceof Error ? e.message : String(e)}`;
    }
    const next = new Date(t.run_at);
    if (t.repeat === "daily") next.setDate(next.getDate() + 1);
    else if (t.repeat === "weekly") next.setDate(next.getDate() + 7);
    else if (t.repeat === "monthly") next.setMonth(next.getMonth() + 1);
    await supabaseAdmin.from("agent_tasks").update({
      last_result: result.slice(0, 4000), last_run_at: new Date().toISOString(),
      ...(t.repeat === "none" ? { status: "done" } : { run_at: next.toISOString() }),
    }).eq("id", t.id);
  }
  return { ran };
}
