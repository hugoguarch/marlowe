/** Search Console adapter internals. Server-only: writes pulse_* tables only. */
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

function headers() {
  const a = process.env["LOVABLE_API_KEY"];
  const b = process.env["GOOGLE_SEARCH_CONSOLE_API_KEY"];
  if (!a || !b) throw new Error("Search Console is not connected");
  return { Authorization: `Bearer ${a}`, "X-Connection-Api-Key": b, "Content-Type": "application/json" };
}

export async function gsc(path: string, body?: unknown) {
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

export async function verifiedSites(): Promise<string[]> {
  const j = await gsc("/webmasters/v3/sites");
  return ((j.siteEntry ?? []) as { siteUrl: string; permissionLevel?: string }[])
    .filter((s) => s.permissionLevel !== "siteUnverifiedUser")
    .map((s) => s.siteUrl)
    .sort();
}

export const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Pull ~16 months of daily totals for one site and replace that site's rows. */
export async function syncSite(clientId: string, siteUrl: string) {
  const end = new Date();
  end.setDate(end.getDate() - 2);
  const start = new Date(end);
  start.setDate(start.getDate() - 485);
  const j = await gsc(`/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    startDate: iso(start),
    endDate: iso(end),
    dimensions: ["date"],
    rowLimit: 25000,
  });
  const rows = (j.rows ?? []) as { keys: string[]; clicks: number; impressions: number; position: number }[];
  const base = { client_id: clientId, channel: "search_console", site: siteUrl, source: "live" };
  const out = rows.flatMap((r) => [
    { ...base, date: r.keys[0]!, metric: "clicks", value: r.clicks },
    { ...base, date: r.keys[0]!, metric: "impressions", value: r.impressions },
    { ...base, date: r.keys[0]!, metric: "position", value: Number(r.position.toFixed(2)) },
  ]);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  for (let i = 0; i < out.length; i += 1000) {
    const up = await supabaseAdmin
      .from("pulse_metrics_daily")
      .upsert(out.slice(i, i + 1000), { onConflict: "client_id,channel,site,date,metric" });
    if (up.error) throw new Error(up.error.message);
  }
  await supabaseAdmin
    .from("pulse_connections")
    .update({ last_sync_at: new Date().toISOString(), status: "live" })
    .eq("client_id", clientId)
    .eq("provider", "search_console")
    .eq("account_ref", siteUrl);
  return out.length / 3;
}

/** Nightly job: re-sync every live site not synced in the last 12 hours. */
export async function syncAllDue() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cutoff = new Date(Date.now() - 12 * 3600_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("pulse_connections")
    .select("client_id, account_ref, last_sync_at")
    .eq("provider", "search_console")
    .in("status", ["live", "error"]);
  if (error) throw new Error(error.message);
  let ok = 0, failed = 0;
  for (const c of data ?? []) {
    if (!c.account_ref || (c.last_sync_at && c.last_sync_at > cutoff)) continue;
    try {
      await syncSite(c.client_id, c.account_ref);
      ok++;
    } catch (e) {
      failed++;
      console.error("GSC sync failed", c.account_ref, e);
      await supabaseAdmin
        .from("pulse_connections")
        .update({ status: "error" })
        .eq("client_id", c.client_id)
        .eq("provider", "search_console")
        .eq("account_ref", c.account_ref);
    }
  }
  return { ok, failed };
}
