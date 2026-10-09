/**
 * Meta → pulse_* tables. Writes Facebook, Instagram and Meta Ads data into the same
 * metrics/posts tables every other source uses, so Overview and Social read it unchanged.
 */
import { META_GRAPH_VERSION, MetaError } from "./meta.server";

const BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const dayMs = 864e5;
const unix = (d: Date) => String(Math.floor(d.getTime() / 1000));

async function get(path: string, params: Record<string, string>, tok: string) {
  const url = path.startsWith("http") ? new URL(path) : new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", tok);
  for (let a = 0; a < 3; a++) {
    const j = (await (await fetch(url)).json().catch(() => ({}))) as any;
    if (!j.error) return j;
    const c = j.error.code ?? 0;
    if ([4, 17, 32, 613].includes(c) && a < 2) { await new Promise((r) => setTimeout(r, 1500 * 2 ** a)); continue; }
    if (c === 190) throw new MetaError("token", "The Meta access token is invalid or expired");
    if ([4, 17, 32, 613].includes(c)) throw new MetaError("rate_limit", "Meta is rate-limiting, try again shortly");
    if (c === 10 || (c >= 200 && c < 300)) throw new MetaError("permission", String(j.error.message ?? "Permission denied").slice(0, 200));
    throw new MetaError("other", String(j.error.message ?? "Meta request failed").slice(0, 200));
  }
  throw new MetaError("rate_limit", "Meta is rate-limiting, try again shortly");
}
const tryGet = async (path: string, params: Record<string, string>, tok: string) => {
  try { return await get(path, params, tok); } catch (e) { if (e instanceof MetaError && e.kind === "token") throw e; return null; }
};

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>) {
  const out: R[] = [];
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]!); }
  }));
  return out;
}

type Row = { date: string; metric: string; value: number };
type Post = { external_id: string; published_at: string; format: string; caption: string; permalink: string | null; thumbnail_url: string | null; reach: number; views: number; likes: number; comments: number; shares: number; saves: number };

function postsPerDay(posts: Post[]): Row[] {
  const m = new Map<string, number>();
  for (const p of posts) { const d = p.published_at.slice(0, 10); m.set(d, (m.get(d) ?? 0) + 1); }
  return [...m].map(([date, value]) => ({ date, metric: "posts", value }));
}

// ---------- Facebook ----------
const FB_MAP: Record<string, string> = {
  page_follows: "followers",
  page_daily_follows_unique: "follows",
  page_daily_unfollows_unique: "unfollows",
  page_media_view: "views",
  page_total_media_view_unique: "reach",
  page_post_engagements: "engagements",
  page_views_total: "profile_visits",
};

async function syncFacebook(pageId: string, userTok: string) {
  const pt = (await get(`/${pageId}`, { fields: "access_token,followers_count" }, userTok)) as { access_token?: string; followers_count?: number };
  if (!pt.access_token) throw new MetaError("permission", "This Page isn't shared with Why Media");
  const tok = pt.access_token;
  const rows: Row[] = [];
  const now = Date.now();
  // Meta caps page insights at ~90 days per request; pull two windows (~6 months).
  for (const w of [0, 1]) {
    const until = new Date(now - w * 90 * dayMs), since = new Date(until.getTime() - 90 * dayMs);
    await pool(Object.keys(FB_MAP), 3, async (metric) => {
      const j = await tryGet(`/${pageId}/insights`, { metric, period: "day", since: unix(since), until: unix(until) }, tok);
      for (const s of j?.data ?? []) for (const v of s.values ?? [])
        if (typeof v.value === "number") rows.push({ date: String(v.end_time).slice(0, 10), metric: FB_MAP[metric]!, value: v.value });
    });
  }
  if (pt.followers_count != null) rows.push({ date: iso(new Date()), metric: "followers", value: pt.followers_count });

  // /posts works with the granted scopes; /published_posts does not.
  const rich = "id,message,created_time,permalink_url,full_picture,shares,reactions.summary(true).limit(0),comments.summary(true).limit(0)";
  let j = await tryGet(`/${pageId}/posts`, { fields: rich, limit: "50" }, tok);
  if (!j) j = await get(`/${pageId}/posts`, { fields: "id,message,created_time,permalink_url,full_picture", limit: "50" }, tok);
  const raw: any[] = [...(j.data ?? [])];
  for (let i = 0; i < 3 && j?.paging?.next; i++) { j = await tryGet(j.paging.next, {}, tok); raw.push(...(j?.data ?? [])); }
  const posts: Post[] = await pool(raw, 5, async (p) => {
    const ins = await tryGet(`/${p.id}/insights`, { metric: "post_impressions_unique,post_media_view" }, tok);
    const val = (n: string) => Number(ins?.data?.find((d: any) => d.name === n)?.values?.[0]?.value ?? 0);
    return {
      external_id: p.id, published_at: p.created_time, format: p.full_picture ? "static" : "text",
      caption: p.message ?? "", permalink: p.permalink_url ?? null, thumbnail_url: p.full_picture ?? null,
      reach: val("post_impressions_unique"), views: val("post_media_view"),
      likes: p.reactions?.summary?.total_count ?? 0, comments: p.comments?.summary?.total_count ?? 0,
      shares: p.shares?.count ?? 0, saves: 0,
    };
  });
  return { rows: [...rows, ...postsPerDay(posts)], posts };
}

// ---------- Instagram ----------
function igFormat(m: any) {
  if (m.media_product_type === "REELS") return "reel";
  if (m.media_product_type === "STORY") return "story";
  if (m.media_type === "CAROUSEL_ALBUM") return "carousel";
  if (m.media_type === "VIDEO") return "video";
  return "static";
}

async function syncInstagram(igId: string, tok: string) {
  const profile = await get(`/${igId}`, { fields: "followers_count" }, tok);
  const rows: Row[] = [];
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const days = Array.from({ length: 30 }, (_, i) => new Date(today.getTime() - (i + 1) * dayMs));
  const net = new Map<string, number>();
  await pool(days, 6, async (d) => {
    const range = { since: unix(d), until: unix(new Date(d.getTime() + dayMs)), period: "day" };
    const date = iso(d);
    const t = await tryGet(`/${igId}/insights`, { ...range, metric_type: "total_value", metric: "reach,views,total_interactions,profile_views" }, tok);
    const names: Record<string, string> = { reach: "reach", views: "views", total_interactions: "engagements", profile_views: "profile_visits" };
    for (const s of t?.data ?? []) rows.push({ date, metric: names[s.name] ?? s.name, value: Number(s.total_value?.value ?? 0) });
    const f = await tryGet(`/${igId}/insights`, { ...range, metric_type: "total_value", metric: "follows_and_unfollows", breakdown: "follow_type" }, tok);
    const br = f?.data?.[0]?.total_value?.breakdowns?.[0]?.results as { dimension_values: string[]; value: number }[] | undefined;
    if (br) {
      const fol = br.find((r) => r.dimension_values[0] === "FOLLOWER")?.value ?? 0;
      const un = br.find((r) => r.dimension_values[0] === "NON_FOLLOWER")?.value ?? 0;
      rows.push({ date, metric: "follows", value: fol }, { date, metric: "unfollows", value: un });
      net.set(date, fol - un);
    }
  });
  if (!net.size) {
    const g = await tryGet(`/${igId}/insights`, { metric: "follower_count", period: "day", since: unix(days[days.length - 1]!), until: unix(today) }, tok);
    for (const v of g?.data?.[0]?.values ?? []) {
      const date = String(v.end_time).slice(0, 10);
      rows.push({ date, metric: "follows", value: Number(v.value ?? 0) });
      net.set(date, Number(v.value ?? 0));
    }
  }
  // Rebuild a daily follower total backwards from today's count and the daily net change.
  const current = Number(profile.followers_count ?? 0);
  rows.push({ date: iso(today), metric: "followers", value: current });
  let running = current;
  for (const d of days) { const k = iso(d); rows.push({ date: k, metric: "followers", value: running }); running -= net.get(new Date(d.getTime()).toISOString().slice(0, 10)) ?? 0; }

  let j = await get(`/${igId}/media`, { fields: "id,caption,media_type,media_product_type,timestamp,permalink,media_url,thumbnail_url,like_count,comments_count", limit: "50" }, tok);
  const media: any[] = [...(j.data ?? [])];
  if (j.paging?.next) { j = await tryGet(j.paging.next, {}, tok); media.push(...(j?.data ?? [])); }
  const posts: Post[] = await pool(media, 6, async (m) => {
    const ins = await tryGet(`/${m.id}/insights`, { metric: "reach,views,likes,comments,shares,saved" }, tok)
      ?? await tryGet(`/${m.id}/insights`, { metric: "reach,likes,comments,saved" }, tok);
    const v = (n: string) => Number(ins?.data?.find((d: any) => d.name === n)?.values?.[0]?.value ?? 0);
    return {
      external_id: m.id, published_at: m.timestamp, format: igFormat(m), caption: m.caption ?? "",
      permalink: m.permalink ?? null, thumbnail_url: m.thumbnail_url ?? m.media_url ?? null,
      reach: v("reach"), views: v("views"), likes: v("likes") || (m.like_count ?? 0),
      comments: v("comments") || (m.comments_count ?? 0), shares: v("shares"), saves: v("saved"),
    };
  });
  return { rows: [...rows, ...postsPerDay(posts)], posts };
}

// ---------- Ads ----------
async function syncAds(ids: string[], tok: string) {
  const rows: Row[] = [];
  const time_range = JSON.stringify({ since: iso(new Date(Date.now() - 90 * dayMs)), until: iso(new Date()) });
  for (const id of ids) {
    let j = await get(`/${id}/insights`, { fields: "spend,impressions,reach,clicks", time_range, time_increment: "1", level: "account", limit: "100" }, tok);
    const data: any[] = [...(j.data ?? [])];
    while (j.paging?.next) { j = await get(j.paging.next, {}, tok); data.push(...(j.data ?? [])); }
    for (const d of data) for (const m of ["spend", "impressions", "reach", "clicks"]) rows.push({ date: d.date_start, metric: m, value: Number(d[m] ?? 0) });
  }
  // Several accounts on one day: sum them.
  const m = new Map<string, Row>();
  for (const r of rows) { const k = `${r.date}|${r.metric}`; const x = m.get(k); if (x) x.value += r.value; else m.set(k, { ...r }); }
  return { rows: [...m.values()], posts: [] as Post[] };
}

// ---------- Writer ----------
async function admin() { return (await import("@/integrations/supabase/client.server")).supabaseAdmin; }

async function purge(clientId: string, channel: string) {
  const sb = await admin();
  await sb.from("pulse_metrics_daily").delete().eq("client_id", clientId).eq("channel", channel);
  await sb.from("pulse_posts").delete().eq("client_id", clientId).eq("channel", channel);
  await sb.from("pulse_connections").delete().eq("client_id", clientId).eq("provider", channel);
}

async function markConn(clientId: string, provider: string, ref: string, patch: Record<string, unknown>) {
  const sb = await admin();
  const { data: ex } = await sb.from("pulse_connections").select("id, account_ref").eq("client_id", clientId).eq("provider", provider);
  const same = (ex ?? []).find((c) => c.account_ref === ref);
  const now = new Date().toISOString();
  if (same) return sb.from("pulse_connections").update({ ...patch, last_attempt_at: now }).eq("id", same.id);
  if (ex?.length) await purge(clientId, provider); // account changed: drop the old account's data
  return sb.from("pulse_connections").insert({ client_id: clientId, provider, account_ref: ref, ...patch, last_attempt_at: now });
}

async function write(clientId: string, channel: string, ref: string, out: { rows: Row[]; posts: Post[] }) {
  const sb = await admin();
  await markConn(clientId, channel, ref, { status: "live" });
  const dedup = new Map<string, Row>();
  for (const r of out.rows) dedup.set(`${r.date}|${r.metric}`, r);
  const rows = [...dedup.values()].map((r) => ({ client_id: clientId, channel, site: "", source: "live", ...r }));
  for (let i = 0; i < rows.length; i += 1000) {
    const up = await sb.from("pulse_metrics_daily").upsert(rows.slice(i, i + 1000), { onConflict: "client_id,channel,site,date,metric" });
    if (up.error) throw new Error(up.error.message);
  }
  if (out.posts.length || channel !== "meta_ads") {
    await sb.from("pulse_posts").delete().eq("client_id", clientId).eq("channel", channel);
    if (out.posts.length) {
      const ins = await sb.from("pulse_posts").insert(out.posts.map((p) => ({ ...p, client_id: clientId, channel, source: "live" })));
      if (ins.error) throw new Error(ins.error.message);
    }
  }
  await markConn(clientId, channel, ref, { status: "live", last_error: null, last_sync_at: new Date().toISOString() });
}

/** Sync every Meta account linked to a client; unlinked channels are cleared. Per-channel errors are recorded, not thrown. */
export async function syncMetaClient(clientId: string) {
  const tok = process.env["META_ACCESS_TOKEN"];
  if (!tok) throw new MetaError("token", "META_ACCESS_TOKEN is not set");
  const sb = await admin();
  const { data: c } = await sb.from("client_meta_connections").select("*").eq("client_id", clientId).maybeSingle();
  const jobs: [string, string | null, () => Promise<{ rows: Row[]; posts: Post[] }>][] = [
    ["facebook", c?.fb_page_id ?? null, () => syncFacebook(c!.fb_page_id!, tok)],
    ["instagram", c?.ig_user_id ?? null, () => syncInstagram(c!.ig_user_id!, tok)],
    ["meta_ads", c?.ad_account_ids?.length ? c.ad_account_ids.join(",") : null, () => syncAds(c!.ad_account_ids, tok)],
  ];
  const result: Record<string, string> = {};
  for (const [ch, ref, fn] of jobs) {
    if (!ref) { await purge(clientId, ch); continue; }
    try {
      await write(clientId, ch, ref, await fn());
      result[ch] = "ok";
    } catch (e) {
      const msg = (e instanceof Error ? e.message : "Sync failed").slice(0, 500);
      await markConn(clientId, ch, ref, { status: "error", last_error: msg });
      result[ch] = msg;
    }
  }
  return result;
}

export async function syncAllMeta() {
  const sb = await admin();
  const { data } = await sb.from("client_meta_connections").select("client_id");
  let ok = 0, failed = 0;
  for (const r of data ?? []) {
    try { await syncMetaClient(r.client_id); ok++; } catch (e) { failed++; console.error("Meta sync failed", r.client_id, e); }
  }
  return { ok, failed };
}
