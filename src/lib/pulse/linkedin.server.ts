/** LinkedIn Company Page adapter (Community Management API). Server-only, read-only. Tokens are encrypted at rest. */
import { allowedOrigin, decrypt, encrypt, signState, verifyState } from "./google.server";

export const LINKEDIN_CALLBACK_PATH = "/api/public/oauth/linkedin/callback";
export const LINKEDIN_SCOPES = ["rw_organization_admin", "r_organization_social"];
const VERSION = "202509";
export { allowedOrigin, signState, verifyState };

function creds() {
  const id = process.env["LINKEDIN_CLIENT_ID"], sec = process.env["LINKEDIN_CLIENT_SECRET"];
  if (!id || !sec) throw new Error("LinkedIn app is not configured");
  return { id, sec };
}
const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

export function linkedinAuthUrl(origin: string, state: string) {
  const u = new URL("https://www.linkedin.com/oauth/v2/authorization");
  u.search = new URLSearchParams({ response_type: "code", client_id: creds().id, redirect_uri: origin + LINKEDIN_CALLBACK_PATH, state, scope: LINKEDIN_SCOPES.join(" ") }).toString();
  return u.toString();
}

async function tokenCall(params: Record<string, string>) {
  const { id, sec } = creds();
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: id, client_secret: sec, ...params }) });
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok || !j.access_token) throw new Error(`LinkedIn sign-in failed: ${j.error_description ?? j.error ?? res.status}`);
  return j as { access_token: string; expires_in?: number; refresh_token?: string; scope?: string };
}

export async function lget(tok: string, path: string) {
  const res = await fetch(`https://api.linkedin.com${path}`, { headers: { Authorization: `Bearer ${tok}`, "LinkedIn-Version": VERSION, "X-Restli-Protocol-Version": "2.0.0" } });
  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 300);
    try { msg = JSON.parse(text).message ?? msg; } catch { /* raw */ }
    if (res.status === 401) throw new Error("LinkedIn sign-in has expired — reconnect");
    throw new Error(`LinkedIn [${res.status}]: ${msg}`);
  }
  return text ? JSON.parse(text) : {};
}

/** Organisations this sign-in administers. */
export async function adminOrgs(tok: string) {
  const j = await lget(tok, "/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=100");
  const urns = [...new Set(((j.elements ?? []) as any[]).map((e) => e.organization as string))];
  return Promise.all(urns.map(async (urn) => {
    const id = urn.split(":").pop()!;
    const o = await lget(tok, `/rest/organizations/${id}`).catch(() => ({}));
    return { id: urn, name: (o as any).localizedName ?? `Organisation ${id}` };
  }));
}

export async function finishLinkedIn(code: string, origin: string) {
  const t = await tokenCall({ grant_type: "authorization_code", code, redirect_uri: origin + LINKEDIN_CALLBACK_PATH });
  const orgs = await adminOrgs(t.access_token);
  const member = orgs.map((o) => o.id).sort().join(",") || `token-${Date.now()}`;
  const sb = await admin();
  const row: any = {
    member_id: member, name: orgs[0]?.name ?? "LinkedIn", scopes: t.scope ?? null,
    access_token_enc: await encrypt(t.access_token), refresh_token_enc: t.refresh_token ? await encrypt(t.refresh_token) : null,
    expires_at: t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null, updated_at: new Date().toISOString(),
  };
  const { data, error } = await sb.from("pulse_linkedin_accounts").upsert(row, { onConflict: "member_id" }).select("id").single();
  if (error) throw new Error(error.message);
  return { accountId: data.id as string, orgs, expiresAt: row.expires_at as string | null };
}

export async function linkedinToken(accountId: string) {
  const sb = await admin();
  const { data } = await sb.from("pulse_linkedin_accounts").select("*").eq("id", accountId).maybeSingle();
  if (!data) throw new Error("LinkedIn sign-in removed — reconnect");
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now() + 60_000) {
    if (!data.refresh_token_enc) throw new Error("LinkedIn sign-in has expired — reconnect");
    const t = await tokenCall({ grant_type: "refresh_token", refresh_token: await decrypt(data.refresh_token_enc) });
    await sb.from("pulse_linkedin_accounts").update({ access_token_enc: await encrypt(t.access_token), refresh_token_enc: t.refresh_token ? await encrypt(t.refresh_token) : data.refresh_token_enc, expires_at: t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null, updated_at: new Date().toISOString() }).eq("id", accountId);
    return { tok: t.access_token, expiresAt: t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null };
  }
  return { tok: await decrypt(data.access_token_enc), expiresAt: data.expires_at as string | null };
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

async function syncOrg(clientId: string, urn: string, tok: string) {
  const enc = encodeURIComponent(urn);
  const end = Date.now(), start = end - 360 * 864e5;
  const ti = `(timeRange:(start:${start},end:${end}),timeGranularityType:DAY)`;
  const [fol, shares, size, posts] = await Promise.all([
    lget(tok, `/rest/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${enc}&timeIntervals=${ti}`),
    lget(tok, `/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${enc}&timeIntervals=${ti}`),
    lget(tok, `/rest/networkSizes/${enc}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`).catch(() => ({})),
    lget(tok, `/rest/posts?q=author&author=${enc}&count=50&sortBy=LAST_MODIFIED`).catch(() => ({ elements: [] })),
  ]);
  const rows: { date: string; metric: string; value: number }[] = [];
  const gains = ((fol.elements ?? []) as any[]).map((e) => ({ date: iso(e.timeRange.start), v: Number(e.followerGains?.organicFollowerGain ?? 0) + Number(e.followerGains?.paidFollowerGain ?? 0) })).sort((a, b) => b.date.localeCompare(a.date));
  let total = Number((size as any).firstDegreeSize ?? 0);
  for (const g of gains) {
    rows.push({ date: g.date, metric: "followers", value: total }, { date: g.date, metric: g.v >= 0 ? "follows" : "unfollows", value: Math.abs(g.v) });
    total -= g.v;
  }
  for (const e of (shares.elements ?? []) as any[]) {
    const d = iso(e.timeRange.start), s = e.totalShareStatistics ?? {};
    const eng = Number(s.likeCount ?? 0) + Number(s.commentCount ?? 0) + Number(s.shareCount ?? 0) + Number(s.clickCount ?? 0);
    rows.push({ date: d, metric: "views", value: Number(s.impressionCount ?? 0) }, { date: d, metric: "reach", value: Number(s.uniqueImpressionsCount ?? 0) }, { date: d, metric: "engagements", value: eng }, { date: d, metric: "likes", value: Number(s.likeCount ?? 0) }, { date: d, metric: "comments", value: Number(s.commentCount ?? 0) }, { date: d, metric: "shares", value: Number(s.shareCount ?? 0) });
  }
  const list = ((posts as any).elements ?? []) as any[];
  const perDay = new Map<string, number>();
  const sb = await admin();
  const postRows = list.filter((p) => p.publishedAt).map((p) => {
    const d = iso(p.publishedAt); perDay.set(d, (perDay.get(d) ?? 0) + 1);
    const media = p.content?.media ? "static" : p.content?.multiImage ? "carousel" : p.content?.article ? "text" : "text";
    return { client_id: clientId, channel: "linkedin", source: "live", external_id: p.id, published_at: new Date(p.publishedAt).toISOString(), format: media, caption: p.commentary ?? null, permalink: `https://www.linkedin.com/feed/update/${p.id}`, thumbnail_url: null, reach: 0, views: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
  });
  for (const [date, value] of perDay) rows.push({ date, metric: "posts", value });
  const full = rows.map((r) => ({ ...r, client_id: clientId, channel: "linkedin", site: urn, source: "live" }));
  for (let i = 0; i < full.length; i += 1000) {
    const up = await sb.from("pulse_metrics_daily").upsert(full.slice(i, i + 1000), { onConflict: "client_id,channel,site,date,metric" });
    if (up.error) throw new Error(up.error.message);
  }
  await sb.from("pulse_posts").delete().eq("client_id", clientId).eq("channel", "linkedin").like("external_id", `%`);
  if (postRows.length) { const ins = await sb.from("pulse_posts").insert(postRows as any); if (ins.error) throw new Error(ins.error.message); }
}

export async function syncLinkedInConnection(clientId: string, ref: string) {
  const sb = await admin();
  const { data: conn } = await sb.from("pulse_connections").select("oauth_account_id").eq("client_id", clientId).eq("provider", "linkedin").eq("account_ref", ref).maybeSingle();
  const now = new Date().toISOString();
  const mark = (patch: Record<string, unknown>) => sb.from("pulse_connections").update({ last_attempt_at: now, ...patch }).eq("client_id", clientId).eq("provider", "linkedin").eq("account_ref", ref);
  try {
    if (!conn?.oauth_account_id) throw new Error("No LinkedIn sign-in linked — reconnect");
    const { tok, expiresAt } = await linkedinToken(conn.oauth_account_id);
    await syncOrg(clientId, ref, tok);
    await mark({ status: "connected", last_sync_at: now, last_error: null, token_expires_at: expiresAt });
    return "ok";
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 300) : "Sync failed";
    await mark({ status: "error", last_error: msg });
    return msg;
  }
}

export async function syncAllLinkedIn() {
  const sb = await admin();
  const { data } = await sb.from("pulse_connections").select("client_id, account_ref").eq("provider", "linkedin").not("oauth_account_id", "is", null);
  let ok = 0, failed = 0;
  for (const c of data ?? []) (await syncLinkedInConnection(c.client_id, c.account_ref!)) === "ok" ? ok++ : failed++;
  return { ok, failed };
}
