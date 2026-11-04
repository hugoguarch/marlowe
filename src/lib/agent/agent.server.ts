/**
 * Why Media agent — server-only. One LLM (Lovable AI Gateway, Responses API) with
 * tools that call into the same tables every section of the app uses, so the
 * agent's work shows up in Scheduler, Reports, Site Builder, Email Designer etc.
 * Every tool filters by userId explicitly so it is safe under RLS and under the
 * service-role client used by the task runner. Remote MCP servers the user
 * connected are loaded per run and closed afterwards.
 */
import { createOpenAI } from "@ai-sdk/openai";
import { isStepCount, streamText, tool, type ModelMessage, type ToolSet } from "ai";
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

const uid = () => Math.random().toString(36).slice(2, 10);

/** Brand tokens for the post preview in chat. */
function designTokens(brandName: string, brain: any) {
  const pal = (brain?.palette as { hex: string }[] | null) ?? [];
  const typo = (brain?.typography as { family?: string; name?: string }[] | null) ?? [];
  const fam = (i: number) => typo[i]?.family ?? typo[i]?.name ?? typo[0]?.family ?? "Helvetica Neue";
  return { name: brandName, ink: pal[0]?.hex ?? "#001C26", accent: pal[2]?.hex ?? pal[1]?.hex ?? "#ECC032", light: "#FFFFFF", headlineFont: fam(0), bodyFont: fam(1) };
}

function buildTools(ctx: AgentCtx, scope: AgentScope) {
  const { supabase, userId } = ctx;
  const needBrand = () => {
    if (!scope.brandId) throw new Error("No brand selected — pick a brand in the top bar first.");
    return scope.brandId;
  };
  const needClient = () => {
    if (!scope.clientId) throw new Error("No analytics account selected — pick an account (not All accounts) first.");
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
      description: "Totals per channel and metric for the selected analytics account over the last N days (website, search, social, Google Business, YouTube).",
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
      description: "Best-performing published social posts/videos for the selected account, ranked by views.",
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
      description: "Design a social post exactly like Post Designer does: writes the slides, generates the background artwork on the brand palette, saves it and schedules it so it appears in the Post Scheduler.",
      inputSchema: z.object({
        title: z.string().describe("Main headline, 3-6 words"),
        caption: z.string().describe("Full caption including hashtags"),
        template: z.string().describe("carousel, single, quote, stat, announcement or story"),
        slides: z.array(z.object({ headline: z.string(), body: z.string() })),
        imageBrief: z.string().describe("What the background photo should show; no text in the image"),
        channels: z.array(z.string()).describe("Instagram, Facebook, LinkedIn, TikTok, Google Business"),
        scheduledFor: z.string().describe("ISO date-time"),
      }),
      execute: async (p) => {
        const id = needBrand();
        const { data: brand } = await supabase.from("brands").select("name").eq("id", id).eq("user_id", userId).maybeSingle();
        if (!brand) throw new Error("That brand no longer exists.");
        const { data: brain } = await supabase.from("brand_brain").select("palette, typography").eq("brand_id", id).maybeSingle();
        const when = new Date(p.scheduledFor);
        const at = isNaN(+when) ? new Date(Date.now() + 864e5) : when;
        const channels = p.channels.length ? p.channels.slice(0, 6) : ["Instagram"];
        const slides = (p.slides.length ? p.slides : [{ headline: p.title, body: "" }]).slice(0, 10).map((s) => ({ title: s.headline, caption: s.body }));

        // Artwork, same pipeline as Post Designer.
        let imagePath: string | null = null;
        try {
          const { generateImage } = await import("@/lib/ai.server");
          const colours = ((brain?.palette as { name: string; hex: string }[] | null) ?? []).map((c) => `${c.name} ${c.hex}`).join(", ");
          const img = await generateImage(
            `Editorial photographic background for a premium ${brand.name} social post: ${p.imageBrief || p.title}. Cinematic natural light, shallow depth of field, generous empty space for text, no text, letters or logos in the image. Colour mood: ${colours || "deep ink navy, cerulean blue, warm gold"}.`,
            "1024x1024",
          );
          const path = `${userId}/${id}/renders/${crypto.randomUUID()}.png`;
          const up = await supabase.storage.from("brand-assets").upload(path, img.bytes, { contentType: img.contentType, upsert: false });
          if (!up.error) imagePath = path;
        } catch (e) {
          console.warn("post artwork failed", e instanceof Error ? e.message : e);
        }

        const { data: item, error } = await supabase.from("content_items").insert({
          user_id: userId, brand_id: id, title: p.title.slice(0, 200), caption: p.caption.slice(0, 2000), format: p.template, template: p.template,
          channel: channels[0], status: "queued", slides, render_url: imagePath,
        }).select("id").single();
        if (error) throw new Error(error.message);
        const { error: e2 } = await supabase.from("schedule").insert(channels.map((channel) => ({
          user_id: userId, brand_id: id, content_item_id: item.id, title: p.title.slice(0, 200), channel, scheduled_for: at.toISOString(), status: "queued",
        })));
        if (e2) {
          await supabase.from("content_items").delete().eq("id", item.id);
          throw new Error(e2.message);
        }
        return {
          id: item.id, scheduledFor: at.toISOString(), channels, link: "/marketing/scheduler",
          design: { template: p.template, title: p.title, subhead: slides[0]?.caption ?? "", slides, caption: p.caption, imagePath, tokens: designTokens(brand.name, brain) },
          artwork: imagePath ? "generated" : "failed — the post was saved without a photo",
        };
      },
    }),

    create_report: tool({
      description: "Generate an account performance report from live analytics data using the Why Media template. Saved to Reports for review.",
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

    create_email: tool({
      description: "Draft a marketing email in Email Designer for the selected brand. Sending to a mailing list is not connected yet; sendAt only records the planned date.",
      inputSchema: z.object({
        name: z.string(),
        subject: z.string(),
        kicker: z.string(),
        heroTitle: z.string(),
        paragraphs: z.array(z.string()),
        buttonLabel: z.string(),
        sendAt: z.string().nullable().describe("ISO date-time or null"),
      }),
      execute: async (p) => {
        const id = needBrand();
        const blocks = [
          { id: uid(), type: "header", label: "" },
          { id: uid(), type: "hero", image: "", kicker: p.kicker, title: p.heroTitle, accent: "" },
          ...p.paragraphs.slice(0, 6).map((b) => ({ id: uid(), type: "text", body: b })),
          { id: uid(), type: "button", label: p.buttonLabel, secondary: "" },
          { id: uid(), type: "footer", text: "" },
        ];
        const at = p.sendAt ? new Date(p.sendAt) : null;
        const { data, error } = await supabase.from("email_designs").insert({
          user_id: userId, brand_id: id, name: p.name.slice(0, 120), subject: p.subject.slice(0, 200), blocks,
          status: at && !isNaN(+at) ? "scheduled" : "draft", scheduled_for: at && !isNaN(+at) ? at.toISOString() : null,
        }).select("id").single();
        if (error) throw new Error(error.message);
        return { id: data.id, link: "/design/email-designer" };
      },
    }),

    schedule_task: tool({
      description: "Schedule the agent to run an instruction later or on repeat (e.g. on the 1st of every month make last month's report). The task runner checks every hour.",
      inputSchema: z.object({ prompt: z.string().describe("Self-contained instruction"), runAt: z.string().describe("ISO date-time with offset for the first run"), repeat: z.string().describe("none, daily, weekly or monthly") }),
      execute: async (p) => {
        const repeat = ["daily", "weekly", "monthly"].includes(p.repeat) ? p.repeat : "none";
        const at = new Date(p.runAt);
        if (isNaN(+at)) throw new Error("That start time isn't a valid date.");
        const { data, error } = await supabase.from("agent_tasks").insert({ user_id: userId, brand_id: scope.brandId, client_id: scope.clientId, prompt: p.prompt.slice(0, 2000), run_at: at.toISOString(), repeat }).select("id, run_at, repeat").single();
        if (error) throw new Error(error.message);
        return { ...data, link: "/agent" };
      },
    }),

    list_tasks: tool({
      description: "List the agent's scheduled tasks.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await supabase.from("agent_tasks").select("id, prompt, run_at, repeat, status, last_run_at").eq("user_id", userId).order("run_at").limit(50);
        return { tasks: data ?? [] };
      },
    }),
  };
}

type Config = { disabledTools: string[]; disabledSkills: string[]; custom: { name: string; instructions: string }[] };

async function loadConfig(ctx: AgentCtx): Promise<Config> {
  const [{ data: s }, { data: custom }] = await Promise.all([
    ctx.supabase.from("agent_settings").select("disabled_tools, disabled_skills").eq("user_id", ctx.userId).maybeSingle(),
    ctx.supabase.from("agent_skills").select("name, instructions").eq("user_id", ctx.userId).eq("enabled", true).limit(30),
  ]);
  return { disabledTools: s?.disabled_tools ?? [], disabledSkills: s?.disabled_skills ?? [], custom: custom ?? [] };
}

/** Opens every enabled remote MCP server for this user; tools are namespaced by server. */
async function loadMcpTools(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: servers } = await supabaseAdmin.from("agent_mcp_servers").select("id, name, url, auth_headers").eq("user_id", userId).eq("enabled", true).limit(8);
  const clients: { close: () => Promise<void> }[] = [];
  const tools: ToolSet = {};
  const names: string[] = [];
  if (!servers?.length) return { tools, clients, names };
  const { createMCPClient } = await import("@ai-sdk/mcp");
  for (const s of servers) {
    const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 20) || "mcp";
    try {
      const client = await createMCPClient({ transport: { type: "http", url: s.url, headers: (s.auth_headers ?? {}) as Record<string, string>, redirect: "error" } });
      clients.push(client);
      const t = await client.tools();
      for (const [n, def] of Object.entries(t).slice(0, 40)) {
        const key = `${slug}__${n}`.slice(0, 64);
        tools[key] = def as any;
        names.push(`${s.name}: ${n}`);
      }
    } catch (e) {
      console.warn("mcp load failed", s.name, e instanceof Error ? e.message : e);
      await supabaseAdmin.from("agent_mcp_servers").update({ status: "error", last_error: (e instanceof Error ? e.message : String(e)).slice(0, 300) }).eq("id", s.id);
    }
  }
  return { tools, clients, names };
}

function londonNow() {
  return new Date().toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
}

function systemPrompt(scope: AgentScope, cfg: Config, mcpNames: string[]) {
  const skills = SKILLS.filter((s) => !cfg.disabledSkills.includes(s.id));
  return [
    "You are the Why Media AI agent, the operator of a marketing agency platform. You read analytics and brand kits and you create real work in the app's sections with tools.",
    `Now: ${londonNow()} (UK time). UTC: ${new Date().toISOString()}. Selected brand: ${scope.brandId ?? "none"}. Selected analytics account: ${scope.clientId ?? "all accounts"}.`,
    "Rules: use tools for anything that needs data or should be created — never invent figures; if data is missing say so. When asked to make something (post, report, page, email, recurring task), call the tool to actually create it, then tell the user where it is. Keep replies short, clear, British English, no emoji. Use markdown lists where helpful.",
    mcpNames.length ? `Connected outside tools (namespaced server__tool): ${mcpNames.slice(0, 60).join("; ")}. Ask before using any outside tool that sends, publishes, deletes or spends money.` : "",
    "Skills:",
    ...skills.map((s) => `- ${s.name}: ${s.instructions}`),
    ...cfg.custom.map((s) => `- ${s.name}: ${s.instructions}`),
  ].filter(Boolean).join("\n");
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

  const cfg = await loadConfig(ctx);
  const builtIn = buildTools(ctx, scope) as ToolSet;
  for (const n of cfg.disabledTools) delete builtIn[n];
  const mcp = await loadMcpTools(ctx.userId);

  const messages: ModelMessage[] = history.slice(-20).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.body }) as ModelMessage);
  messages.push({ role: "user", content: [{ type: "text", text }, ...(await attachmentParts(ctx, files))] });

  let streamErr: unknown;
  try {
    const result = streamText({
      maxRetries: 0,
      onError: ({ error }) => { streamErr ??= error; },
      model: provider.responses(MODEL),
      instructions: systemPrompt(scope, cfg, mcp.names),
      messages,
      tools: { ...mcp.tools, ...builtIn },
      stopWhen: isStepCount(50),
      providerOptions: {
        openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
      },
    });

    let reply: string, steps: Awaited<typeof result.steps>;
    try {
      reply = await result.text;
      steps = await result.steps;
    } catch (e) {
      // The SDK hides the real gateway error behind "No output generated"; surface it.
      const real: any = streamErr ?? e;
      const status = real?.statusCode ?? real?.status;
      let msg = real?.message ?? String(real);
      try { msg = JSON.parse(real?.responseBody ?? "").message ?? msg; } catch { /* keep */ }
      throw new Error(status ? `${status} ${msg}` : msg);
    }
    const tools: ToolLog[] = [];
    for (const s of steps) {
      for (const r of s.toolResults as any[]) tools.push({ name: r.toolName, input: r.input, output: r.output, ok: true });
      for (const c of s.content as any[]) if (c.type === "tool-error") tools.push({ name: c.toolName, input: c.input, output: String(c.error?.message ?? c.error), ok: false });
    }
    return { reply: reply.trim() || "Done.", tools };
  } finally {
    await Promise.all(mcp.clients.map((c) => c.close().catch(() => {})));
  }
}

function nextRun(from: Date, repeat: string) {
  const next = new Date(from);
  const step = () => {
    if (repeat === "daily") next.setUTCDate(next.getUTCDate() + 1);
    else if (repeat === "weekly") next.setUTCDate(next.getUTCDate() + 7);
    else next.setUTCMonth(next.getUTCMonth() + 1);
  };
  do step(); while (next.getTime() <= Date.now());
  return next;
}

/** Called hourly by the task runner: runs every due task as its owner, at most 10 per run. */
export async function runDueTasks() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date().toISOString();
  const { data: due } = await supabaseAdmin.from("agent_tasks").select("*").eq("status", "scheduled").lte("run_at", now).or(`locked_until.is.null,locked_until.lt.${now}`).order("run_at").limit(10);
  let ran = 0;
  for (const t of due ?? []) {
    // Claim the task so an overlapping run skips it.
    const { data: claimed } = await supabaseAdmin.from("agent_tasks").update({ locked_until: new Date(Date.now() + 15 * 60_000).toISOString() })
      .eq("id", t.id).eq("status", "scheduled").or(`locked_until.is.null,locked_until.lt.${now}`).select("id");
    if (!claimed?.length) continue;
    const ctx = { supabase: supabaseAdmin, userId: t.user_id };
    let result: string;
    let stop = false;
    try {
      const out = await runAgent(ctx, { brandId: t.brand_id, clientId: t.client_id }, [], t.prompt, []);
      result = out.reply;
      let threadId = t.thread_id as string | null;
      if (!threadId) {
        const { data: th } = await supabaseAdmin.from("agent_threads").insert({ user_id: t.user_id, title: `Scheduled: ${t.prompt.slice(0, 50)}` }).select("id").single();
        threadId = th?.id ?? null;
      }
      await supabaseAdmin.from("chat_messages").insert([
        { user_id: t.user_id, brand_id: t.brand_id, thread_id: threadId, role: "user", body: `Scheduled task: ${t.prompt}`, attachments: [], tools: [] },
        { user_id: t.user_id, brand_id: t.brand_id, thread_id: threadId, role: "marlowe", body: out.reply, attachments: [], tools: out.tools as any },
      ]);
      if (threadId) await supabaseAdmin.from("agent_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
      ran++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result = `Failed: ${msg}`;
      // Credits or access problems: pause the task until someone re-enables it.
      if (/402|403|credit/i.test(msg)) stop = true;
    }
    await supabaseAdmin.from("agent_tasks").update({
      last_result: result.slice(0, 4000), last_run_at: new Date().toISOString(), locked_until: null,
      ...(stop ? { status: "paused" } : t.repeat === "none" ? { status: "done" } : { run_at: nextRun(new Date(t.run_at), t.repeat).toISOString() }),
    }).eq("id", t.id);
    if (stop) break;
  }
  return { ran };
}

/** Probe a remote MCP server and return its tool names. */
export async function probeMcp(url: string, headers: Record<string, string>) {
  const { createMCPClient } = await import("@ai-sdk/mcp");
  const client = await createMCPClient({ transport: { type: "http", url, headers, redirect: "error" } });
  try {
    return Object.keys(await client.tools());
  } finally {
    await client.close().catch(() => {});
  }
}
