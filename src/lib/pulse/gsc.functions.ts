/** Live Google Search Console adapter. Writes pulse_* tables so every view stays unchanged. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("pulse_is_admin", { _uid: ctx.userId });
  if (!data) throw new Error("Only Pulse admins can manage data sources");
}

async function sitesFor(ctx: { supabase: any }, clientId: string) {
  const { data } = await ctx.supabase
    .from("pulse_connections")
    .select("id, account_ref, status")
    .eq("client_id", clientId)
    .eq("provider", "search_console");
  return ((data ?? []) as { id: string; account_ref: string | null; status: string }[]).filter((s) => s.account_ref);
}

export const listGscSites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { verifiedSites } = await import("./gsc.server");
    return { sites: await verifiedSites() };
  });

export const addGscSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clientId: z.string().uuid(), siteUrl: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { verifiedSites, syncSite } = await import("./gsc.server");
    const sites = await verifiedSites();
    if (!sites.includes(data.siteUrl)) throw new Error("That property is not verified for the connected Google account");
    const existing = (await sitesFor(context, data.clientId)).find((s) => s.account_ref === data.siteUrl);
    if (!existing) {
      const ins = await context.supabase.from("pulse_connections").insert({
        client_id: data.clientId, provider: "search_console", account_ref: data.siteUrl, status: "live", scopes: "webmasters.readonly",
      });
      if (ins.error) throw new Error(ins.error.message);
    }
    return { days: await syncSite(data.clientId, data.siteUrl) };
  });

export const removeGscSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clientId: z.string().uuid(), siteUrl: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("pulse_metrics_daily").delete()
      .eq("client_id", data.clientId).eq("channel", "search_console").eq("site", data.siteUrl);
    const del = await context.supabase.from("pulse_connections").delete()
      .eq("client_id", data.clientId).eq("provider", "search_console").eq("account_ref", data.siteUrl);
    if (del.error) throw new Error(del.error.message);
    return { ok: true };
  });

export const resyncGsc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clientId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { syncSite } = await import("./gsc.server");
    const sites = await sitesFor(context, data.clientId);
    if (!sites.length) throw new Error("No Search Console site for this client");
    let days = 0;
    for (const s of sites) days = Math.max(days, await syncSite(data.clientId, s.account_ref!));
    return { days };
  });

/** Top queries and pages for the period, current vs prior. Combines sites unless one is chosen. */
export const getGscTop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ clientId: z.string().uuid(), from: z.string(), to: z.string(), priorFrom: z.string(), site: z.string().nullable().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let sites = (await sitesFor(context, data.clientId)).map((s) => s.account_ref!); // RLS-scoped
    if (data.site) sites = sites.filter((s) => s === data.site);
    if (!sites.length) return { live: false as const, queries: [], pages: [] };
    const { gsc, iso } = await import("./gsc.server");
    const priorTo = iso(new Date(new Date(data.from).getTime() - 864e5));
    type R = { keys: string[]; clicks: number; impressions: number; position: number };
    const q = async (dim: string, s: string, e: string) => {
      const all = await Promise.all(sites.map((site) =>
        gsc(`/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
          startDate: s, endDate: e, dimensions: [dim], rowLimit: dim === "query" ? 250 : 100,
        }) as Promise<{ rows?: R[] }>));
      const m = new Map<string, { clicks: number; impressions: number; posW: number }>();
      for (const r of all.flatMap((a) => a.rows ?? [])) {
        const k = r.keys[0]!;
        const x = m.get(k) ?? { clicks: 0, impressions: 0, posW: 0 };
        x.clicks += r.clicks; x.impressions += r.impressions; x.posW += r.position * r.impressions;
        m.set(k, x);
      }
      return m;
    };
    const [qc, qp, pc, pp] = await Promise.all([
      q("query", data.from, data.to), q("query", data.priorFrom, priorTo),
      q("page", data.from, data.to), q("page", data.priorFrom, priorTo),
    ]);
    const merge = (cur: Awaited<ReturnType<typeof q>>, prev: Awaited<ReturnType<typeof q>>) =>
      [...cur.entries()].sort((a, b) => b[1].clicks - a[1].clicks).slice(0, 15).map(([key, r]) => ({
        key, clicks: r.clicks, impressions: r.impressions,
        position: r.impressions ? r.posW / r.impressions : 0,
        prevClicks: prev.get(key)?.clicks ?? 0,
      }));
    return { live: true as const, queries: merge(qc, qp), pages: merge(pc, pp) };
  });
