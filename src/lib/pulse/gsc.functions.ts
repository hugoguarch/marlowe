/** Live Google Search Console adapter. Writes pulse_* tables so every view stays unchanged. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

function headers() {
  const a = process.env["LOVABLE_API_KEY"];
  const b = process.env["GOOGLE_SEARCH_CONSOLE_API_KEY"];
  if (!a || !b) throw new Error("Search Console is not connected");
  return { Authorization: `Bearer ${a}`, "X-Connection-Api-Key": b, "Content-Type": "application/json" };
}

async function gsc(path: string, body?: unknown) {
  const res = await fetch(`${GATEWAY}${path}`, {
    method: body ? "POST" : "GET",
    headers: headers(),
    body: body ? JSON.stringify(body) : null,
  });
  const text = await res.text();
  if (res.status === 403) throw new Error("The connected Google account cannot access this Search Console property");
  if (!res.ok) throw new Error(`Search Console request failed [${res.status}]: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function verifiedSites(): Promise<string[]> {
  const j = await gsc("/webmasters/v3/sites");
  return ((j.siteEntry ?? []) as { siteUrl: string; permissionLevel?: string }[])
    .filter((s) => s.permissionLevel !== "siteUnverifiedUser")
    .map((s) => s.siteUrl)
    .sort();
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("pulse_is_admin", { _uid: ctx.userId });
  if (!data) throw new Error("Only Pulse admins can manage data sources");
}

async function propertyFor(ctx: { supabase: any }, clientId: string) {
  const { data } = await ctx.supabase
    .from("pulse_connections")
    .select("id, account_ref, status")
    .eq("client_id", clientId)
    .eq("provider", "search_console")
    .maybeSingle();
  return data as { id: string; account_ref: string | null; status: string } | null;
}

export const listGscSites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    return { sites: await verifiedSites() };
  });

const iso = (d: Date) => d.toISOString().slice(0, 10);

async function syncClient(clientId: string, siteUrl: string) {
  const end = new Date();
  end.setDate(end.getDate() - 2);
  const start = new Date(end);
  start.setDate(start.getDate() - 485); // ~16 months: enough for year-on-year
  const j = await gsc(`/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    startDate: iso(start),
    endDate: iso(end),
    dimensions: ["date"],
    rowLimit: 25000,
  });
  const rows = (j.rows ?? []) as { keys: string[]; clicks: number; impressions: number; position: number }[];
  const out = rows.flatMap((r) => [
    { client_id: clientId, channel: "search_console", date: r.keys[0]!, metric: "clicks", value: r.clicks, source: "live" },
    { client_id: clientId, channel: "search_console", date: r.keys[0]!, metric: "impressions", value: r.impressions, source: "live" },
    { client_id: clientId, channel: "search_console", date: r.keys[0]!, metric: "position", value: Number(r.position.toFixed(2)), source: "live" },
  ]);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const del = await supabaseAdmin.from("pulse_metrics_daily").delete().eq("client_id", clientId).eq("channel", "search_console");
  if (del.error) throw new Error(del.error.message);
  for (let i = 0; i < out.length; i += 1000) {
    const ins = await supabaseAdmin.from("pulse_metrics_daily").insert(out.slice(i, i + 1000));
    if (ins.error) throw new Error(ins.error.message);
  }
  return out.length / 3;
}

export const assignGscSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clientId: z.string().uuid(), siteUrl: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sites = await verifiedSites();
    if (!sites.includes(data.siteUrl)) throw new Error("That property is not verified for the connected Google account");
    const days = await syncClient(data.clientId, data.siteUrl);
    const existing = await propertyFor(context, data.clientId);
    const row = { account_ref: data.siteUrl, status: "live", last_sync_at: new Date().toISOString(), scopes: "webmasters.readonly" };
    const res = existing
      ? await context.supabase.from("pulse_connections").update(row).eq("id", existing.id)
      : await context.supabase.from("pulse_connections").insert({ ...row, client_id: data.clientId, provider: "search_console" });
    if (res.error) throw new Error(res.error.message);
    return { days };
  });

export const resyncGsc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clientId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const p = await propertyFor(context, data.clientId);
    if (!p?.account_ref || p.status !== "live") throw new Error("No live Search Console property for this client");
    const days = await syncClient(data.clientId, p.account_ref);
    await context.supabase.from("pulse_connections").update({ last_sync_at: new Date().toISOString() }).eq("id", p.id);
    return { days };
  });

/** Top queries and pages for the period, current vs prior. */
export const getGscTop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ clientId: z.string().uuid(), from: z.string(), to: z.string(), priorFrom: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const p = await propertyFor(context, data.clientId); // RLS: only visible to people who can see the client
    if (!p?.account_ref || p.status !== "live") return { live: false as const, queries: [], pages: [] };
    const priorTo = iso(new Date(new Date(data.from).getTime() - 864e5));
    const path = `/webmasters/v3/sites/${encodeURIComponent(p.account_ref)}/searchAnalytics/query`;
    const q = (dim: string, s: string, e: string) => gsc(path, { startDate: s, endDate: e, dimensions: [dim], rowLimit: dim === "query" ? 250 : 100 });
    const [qc, qp, pc, pp] = await Promise.all([
      q("query", data.from, data.to), q("query", data.priorFrom, priorTo),
      q("page", data.from, data.to), q("page", data.priorFrom, priorTo),
    ]);
    type R = { keys: string[]; clicks: number; impressions: number; position: number };
    const merge = (cur: { rows?: R[] }, prev: { rows?: R[] }) => {
      const pm = new Map((prev.rows ?? []).map((r) => [r.keys[0], r]));
      return (cur.rows ?? []).slice(0, 15).map((r) => ({
        key: r.keys[0]!, clicks: r.clicks, impressions: r.impressions, position: r.position,
        prevClicks: pm.get(r.keys[0])?.clicks ?? 0,
      }));
    };
    return { live: true as const, queries: merge(qc, qp), pages: merge(pc, pp) };
  });
