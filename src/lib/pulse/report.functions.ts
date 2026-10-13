/** Reports: fill the Why Media report template from pulse_* data, AI writes the words from the numbers only. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };
type Row = { channel: string; date: string; metric: string; value: number; site: string };

const DAY = 864e5;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const nf = (n: number, dp = 0) => n.toLocaleString("en-GB", { maximumFractionDigits: dp, minimumFractionDigits: dp });
const NA = { v: "N/A", d: "Not connected" };

function pctDelta(cur: number, prev: number) {
  if (!prev) return cur ? "New" : "No change";
  const p = ((cur - prev) / Math.abs(prev)) * 100;
  if (Math.abs(p) < 0.05) return "No change";
  return `${p > 0 ? "↑" : "↓"} ${nf(Math.abs(p), 1)}%`;
}
const signed = (n: number) => (n === 0 ? "No change" : `${n > 0 ? "+" : "−"}${nf(Math.abs(n))}`);

const SOCIAL_NAMES: Record<string, string> = { linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook", youtube: "YouTube", tiktok: "TikTok" };
const PIE = ["#001C26", "#036C89", "#ECC032", "#1E5631", "#9DC4CF"];

async function collect(ctx: Ctx, clientId: string, from: string, to: string) {
  const span = Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY) + 1;
  const priorFrom = iso(new Date(new Date(from).getTime() - span * DAY));
  const priorTo = iso(new Date(new Date(from).getTime() - DAY));
  const sb = ctx.supabase;
  const [{ data: client }, rowsRes, { data: reviews }, { data: sites }] = await Promise.all([
    sb.from("pulse_clients").select("id, name").eq("id", clientId).single(),
    (async () => {
      const out: Row[] = [];
      for (let i = 0; ; i += 1000) {
        const { data } = await sb.from("pulse_metrics_daily").select("channel, date, metric, value, site").eq("client_id", clientId).gte("date", priorFrom).lte("date", to).range(i, i + 999);
        out.push(...((data ?? []) as Row[]));
        if (!data || data.length < 1000) break;
      }
      return out;
    })(),
    sb.from("pulse_reviews").select("rating, created_at").eq("client_id", clientId),
    sb.from("pulse_connections").select("account_ref").eq("client_id", clientId).eq("provider", "search_console").not("account_ref", "is", null),
  ]);
  if (!client) throw new Error("Client not found");
  const rows = rowsRes as Row[];
  const inCur = (r: Row) => r.date >= from && r.date <= to;
  const inPrev = (r: Row) => r.date >= priorFrom && r.date <= priorTo;
  const total = (ch: string, m: string, f: (r: Row) => boolean) => rows.filter((r) => r.channel === ch && r.metric === m && f(r)).reduce((s, r) => s + Number(r.value), 0);
  const has = (ch: string, m?: string) => rows.some((r) => r.channel === ch && (!m || r.metric === m) && inCur(r));
  const lastVal = (ch: string, m: string, f: (r: Row) => boolean) => {
    const byDate = new Map<string, number>();
    for (const r of rows) if (r.channel === ch && r.metric === m && f(r)) byDate.set(r.date, (byDate.get(r.date) ?? 0) + Number(r.value));
    const k = [...byDate.keys()].sort();
    return k.length ? { first: byDate.get(k[0]!)!, last: byDate.get(k[k.length - 1]!)! } : null;
  };

  // Website page: GA4 when connected, otherwise Search Console.
  const numbers: Record<string, unknown> = {};
  const k: Record<string, { l?: string; v: string; d: string }> = {};
  let listTitle = "Top Search Queries", pagesTitle = "Top Pages · Search Clicks";
  let locations: { n: string; label: string }[] = [];
  let pages: { label: string; views: number }[] = [];
  const sources: { label: string; pct: number; color: string }[] = [];
  const devices: typeof sources = [];
  if (has("ga4")) {
    const s = total("ga4", "sessions", inCur), sp = total("ga4", "sessions", inPrev);
    const v = total("ga4", "pageviews", inCur), vp = total("ga4", "pageviews", inPrev);
    k["w0"] = { l: "Total Visits", v: nf(s), d: pctDelta(s, sp) };
    k["w1"] = { l: "Total Pageviews", v: nf(v), d: pctDelta(v, vp) };
    const c = total("ga4", "conversions", inCur), cp = total("ga4", "conversions", inPrev);
    k["w2"] = { l: "Conversions", v: nf(c), d: pctDelta(c, cp) };
    numbers["website"] = { sessions: s, sessionsPrior: sp, pageviews: v, pageviewsPrior: vp, conversions: c, conversionsPrior: cp };
  } else if (has("search_console")) {
    const c = total("search_console", "clicks", inCur), cp = total("search_console", "clicks", inPrev);
    const im = total("search_console", "impressions", inCur), ip = total("search_console", "impressions", inPrev);
    const pos = (f: (r: Row) => boolean) => {
      const ps = rows.filter((r) => r.channel === "search_console" && r.metric === "position" && f(r));
      return ps.length ? ps.reduce((a, r) => a + Number(r.value), 0) / ps.length : 0;
    };
    const p = pos(inCur), pp = pos(inPrev);
    k["w0"] = { l: "Search Clicks", v: nf(c), d: pctDelta(c, cp) };
    k["w1"] = { l: "Search Impressions", v: nf(im), d: pctDelta(im, ip) };
    k["w2"] = { l: "Avg. Search Position", v: p ? nf(p, 1) : "N/A", d: p && pp ? (Math.abs(p - pp) < 0.05 ? "No change" : `${p < pp ? "↑" : "↓"} ${nf(Math.abs(p - pp), 1)}`) : "" };
    numbers["searchConsole"] = { clicks: c, clicksPrior: cp, impressions: im, impressionsPrior: ip, avgPosition: Number(p.toFixed(1)), avgPositionPrior: Number(pp.toFixed(1)) };
    // Top queries and pages, live from Search Console.
    const siteList = ((sites ?? []) as { account_ref: string }[]).map((s) => s.account_ref);
    if (siteList.length) {
      try {
        const { gsc } = await import("./gsc.server");
        const q = async (dim: string) => {
          const all = await Promise.all(siteList.map((site) => gsc(`/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, { startDate: from, endDate: to, dimensions: [dim], rowLimit: 25 }) as Promise<{ rows?: { keys: string[]; clicks: number }[] }>));
          const m = new Map<string, number>();
          for (const r of all.flatMap((a) => a.rows ?? [])) m.set(r.keys[0]!, (m.get(r.keys[0]!) ?? 0) + r.clicks);
          return [...m].sort((a, b) => b[1] - a[1]);
        };
        const [qs, ps] = await Promise.all([q("query"), q("page")]);
        locations = qs.slice(0, 10).map(([label], i) => ({ n: String(i + 1).padStart(2, "0"), label }));
        pages = ps.slice(0, 5).filter(([, v]) => v > 0).map(([u, views]) => {
          let label = u; try { label = new URL(u).pathname.replace(/\/$/, "") || "Homepage"; } catch { /* keep */ }
          label = label === "Homepage" ? label : label.split("/").filter(Boolean).pop()!.replace(/[-_]/g, " ").slice(0, 18);
          return { label: label.charAt(0).toUpperCase() + label.slice(1), views };
        });
        numbers["topQueries"] = qs.slice(0, 10).map(([q, clicks]) => ({ q, clicks }));
      } catch { /* top lists stay empty */ }
    }
  } else {
    k["w0"] = { l: "Total Visits", ...NA }; k["w1"] = { l: "Total Pageviews", ...NA }; k["w2"] = { l: "Conversions", ...NA };
    listTitle = "Top Locations";
  }
  if (!locations.length) locations = [{ n: "—", label: "No data for this period" }];

  // Google Business Profile.
  const gbpKeys: [string, string][] = [["views", "profile_views"], ["clicks", "website_clicks"], ["calls", "calls"], ["directions", "direction_requests"]];
  const showGmb = has("gbp") || ((reviews ?? []) as unknown[]).length > 0;
  const gbp: Record<string, number> = {};
  let ic = 0, ip2 = 0;
  for (const [key, m] of gbpKeys) {
    const c = total("gbp", m, inCur), p = total("gbp", m, inPrev);
    gbp[key] = c; gbp[key + "Prior"] = p;
    if (m !== "profile_views") { ic += c; ip2 += p; }
    k[key] = has("gbp") ? { v: nf(c), d: pctDelta(c, p) } : NA;
  }
  k["interactions"] = has("gbp") ? { v: nf(ic), d: pctDelta(ic, ip2) } : NA;
  const rv = (reviews ?? []) as { rating: number; created_at: string }[];
  const newRev = rv.filter((r) => r.created_at.slice(0, 10) >= from && r.created_at.slice(0, 10) <= to).length;
  const avg = (xs: typeof rv) => (xs.length ? xs.reduce((s, r) => s + Number(r.rating), 0) / xs.length : 0);
  const rNow = avg(rv), rBefore = avg(rv.filter((r) => r.created_at.slice(0, 10) < from));
  k["reviews"] = rv.length ? { v: nf(rv.length), d: newRev ? `+${newRev} new` : "No change" } : NA;
  k["rating"] = rv.length ? { v: nf(rNow, 1), d: Math.abs(rNow - rBefore) < 0.05 ? "No change" : `${rNow > rBefore ? "↑" : "↓"} ${nf(Math.abs(rNow - rBefore), 1)}` } : { v: "N/A", d: "" };
  if (showGmb) numbers["googleBusiness"] = { ...gbp, interactions: ic, interactionsPrior: ip2, totalReviews: rv.length, newReviews: newRev, rating: Number(rNow.toFixed(1)) };

  // Social.
  const socials = Object.keys(SOCIAL_NAMES).filter((ch) => has(ch)).map((ch) => {
    const fol = lastVal(ch, "followers", inCur);
    const net = total(ch, "follows", inCur) - total(ch, "unfollows", inCur);
    const reachM = has(ch, "reach") ? "reach" : "views";
    const r = total(ch, reachM, inCur), rp = total(ch, reachM, inPrev);
    const e = total(ch, "engagements", inCur), ep = total(ch, "engagements", inPrev);
    const netFollow = has(ch, "follows") ? net : fol ? fol.last - fol.first : 0;
    return {
      ch, reach: r,
      numbers: { followers: fol?.last ?? null, netFollowers: netFollow, [reachM]: r, [`${reachM}Prior`]: rp, engagement: e, engagementPrior: ep },
      card: {
        name: SOCIAL_NAMES[ch]!, badge: "",
        c0: { l: ch === "youtube" ? "Subscribers" : "Followers", v: fol ? nf(fol.last) : "N/A", d: fol ? signed(netFollow) : "Not tracked" },
        c1: { l: "Views / Reach", v: nf(r), d: pctDelta(r, rp) },
        c2: { l: "Engagement", v: has(ch, "engagements") ? nf(e) : "N/A", d: has(ch, "engagements") ? pctDelta(e, ep) : "Not tracked" },
      },
    };
  }).sort((a, b) => b.reach - a.reach);
  if (socials[0] && socials.length > 1) socials[0].card.badge = "Strongest channel";
  for (const s of socials) numbers[s.ch] = s.numbers;

  // Meta Ads, numbers only (no page in the template yet, used for the summary).
  if (has("meta_ads")) numbers["metaAds"] = { spend: total("meta_ads", "spend", inCur), spendPrior: total("meta_ads", "spend", inPrev), clicks: total("meta_ads", "clicks", inCur), impressions: total("meta_ads", "impressions", inCur) };

  const max = Math.max(1, ...pages.map((p) => p.views));
  const step = max > 1000 ? 500 : max > 400 ? 100 : max > 100 ? 50 : max > 20 ? 10 : 5;
  const top = Math.ceil(max / step) * step;
  const gridlines = [];
  for (let v = 0; v <= top; v += step) gridlines.push({ pos: (v / top) * 100, label: nf(v) });
  const conic = (items: typeof sources) => { let a = 0; return "conic-gradient(" + items.map((i) => { const s = a; a += i.pct * 3.6; return `${i.color} ${s}deg ${a}deg`; }).join(",") + ")"; };

  return {
    clientName: client.name as string,
    template: {
      k, listTitle, locations, pagesTitle, hasPages: pages.length > 0,
      pages: pages.map((p) => ({ ...p, h: (p.views / top) * 100, fmt: nf(p.views) })), gridlines,
      sources, devices, hasSources: sources.length > 0, hasDevices: devices.length > 0,
      sourcesPie: conic(sources), devicesPie: conic(devices.map((d, i) => ({ ...d, color: PIE[i]! }))),
      socials: socials.slice(0, 4).map((s) => s.card),
      showGmb, showSocial: socials.length > 0,
    },
    numbers,
    channels: socials.map((s) => SOCIAL_NAMES[s.ch]!),
  };
}

type Narrative = { intro: string; summaryTitle: string; paras: { text: string }[]; focus: { n: string; title: string; body: string }[] };

async function writeNarrative(clientName: string, period: string, nextPeriod: string, numbers: unknown): Promise<Narrative> {
  const { generateJSON } = await import("@/lib/ai.server");
  const r = await generateJSON<{ intro: string; summaryTitle: string; paragraphs: string[]; focus: { title: string; body: string }[] }>({
    system:
      "You write the summary page of a client-facing digital marketing report for Why Media, a property marketing agency. British English, warm and professional, plain sentences, no emoji, no hype. " +
      "STRICT RULE: never state a number, percentage or figure. Describe direction only (grew, dipped, held steady). Only mention channels present in the data.",
    prompt: `Client: ${clientName}\nPeriod: ${period}\nNext period: ${nextPeriod}\nData (current vs prior equal period):\n${JSON.stringify(numbers)}\n\nWrite: intro (one sentence for the cover describing what the report covers), summaryTitle (3-5 words), paragraphs (exactly 3 short paragraphs on what happened), focus (exactly 3 recommended actions for next period, each a 2-5 word title and one sentence body).`,
    schemaName: "report_summary",
    schema: {
      type: "object", additionalProperties: false, required: ["intro", "summaryTitle", "paragraphs", "focus"],
      properties: {
        intro: { type: "string" }, summaryTitle: { type: "string" },
        paragraphs: { type: "array", items: { type: "string" } },
        focus: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "body"], properties: { title: { type: "string" }, body: { type: "string" } } } },
      },
    },
  });
  // Belt and braces: strip any figure that slipped through.
  const clean = (s: string) => s.replace(/\s*\d[\d,.]*\s*%?/g, " ").replace(/\s{2,}/g, " ").trim();
  return {
    intro: clean(r.intro), summaryTitle: clean(r.summaryTitle),
    paras: r.paragraphs.slice(0, 3).map((t) => ({ text: clean(t) })),
    focus: r.focus.slice(0, 3).map((f, i) => ({ n: String(i + 1).padStart(2, "0"), title: clean(f.title).replace(/\.?$/, "."), body: clean(f.body) })),
  };
}

async function canWrite(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("pulse_my_role");
  return data === "admin" || data === "account_manager";
}

export const generateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    clientId: z.string().uuid(), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    period: z.string().min(1).max(60), nextPeriod: z.string().min(1).max(60),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if (!(await canWrite(ctx))) throw new Error("Only admins and account managers can create reports");
    const c = await collect(ctx, data.clientId, data.from, data.to);
    let narrative: Narrative;
    let aiError: string | null = null;
    try {
      narrative = await writeNarrative(c.clientName, data.period, data.nextPeriod, c.numbers);
    } catch (e) {
      aiError = e instanceof Error ? e.message : "AI unavailable";
      narrative = { intro: "Website, Google Business Profile and social media performance, with our recommendations for the period ahead.", summaryTitle: "Digital Growth & Opportunities", paras: [{ text: "" }, { text: "" }, { text: "" }], focus: [1, 2, 3].map((n) => ({ n: `0${n}`, title: "", body: "" })) };
    }
    const doc = { clientName: c.clientName, period: data.period, nextPeriod: data.nextPeriod, ...c.template, ...narrative, numbers: c.numbers };
    const { data: row, error } = await ctx.supabase.from("pulse_reports").insert({
      client_id: data.clientId, period_from: data.from, period_to: data.to, period_label: data.period, data: doc, created_by: ctx.userId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, aiError };
  });

export const listReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clientId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase.from("pulse_reports").select("id, period_label, period_from, period_to, status, created_at, updated_at").eq("client_id", data.clientId).order("created_at", { ascending: false }).limit(50);
    return rows ?? [];
  });

export const getReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("pulse_reports").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return row as { id: string; client_id: string; period_label: string; status: string; data: Record<string, any>; updated_at: string };
  });

export const saveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(), status: z.enum(["draft", "approved"]),
    patch: z.object({
      intro: z.string().max(400), summaryTitle: z.string().max(80), period: z.string().max(60), nextPeriod: z.string().max(60),
      showGmb: z.boolean(), showSocial: z.boolean(),
      paras: z.array(z.object({ text: z.string().max(800) })).max(5),
      focus: z.array(z.object({ n: z.string(), title: z.string().max(80), body: z.string().max(400) })).max(5),
    }),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if (!(await canWrite(ctx))) throw new Error("Only admins and account managers can edit reports");
    const { data: cur, error: e1 } = await ctx.supabase.from("pulse_reports").select("data").eq("id", data.id).single();
    if (e1) throw new Error(e1.message);
    const { error } = await ctx.supabase.from("pulse_reports").update({ data: { ...cur.data, ...data.patch }, period_label: data.patch.period, status: data.status, updated_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("pulse_reports").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
