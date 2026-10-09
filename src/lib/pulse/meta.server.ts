/** Meta Graph API adapter. Server-only and read-only: never posts, replies or edits. Tokens never leave the server. */
export const META_GRAPH_VERSION = "v26.0";
const BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export const FB_PAGE_METRICS = ["page_post_engagements", "page_views_total", "page_follows"];
export const IG_ACCOUNT_METRICS = ["reach", "views", "accounts_engaged", "total_interactions"];
export const IG_MEDIA_METRICS = ["reach", "views", "likes", "comments", "shares", "saved", "total_interactions"];

export class MetaError extends Error {
  constructor(public kind: "rate_limit" | "permission" | "token" | "invalid_metric" | "other", message: string) {
    super(message);
  }
}

function token() {
  const t = process.env["META_ACCESS_TOKEN"];
  if (!t) throw new MetaError("token", "META_ACCESS_TOKEN is not set");
  return t;
}

function classify(err: { code?: number; message?: string; error_subcode?: number }): MetaError {
  const c = err.code ?? 0;
  const msg = err.message ?? "Meta request failed";
  if ([4, 17, 32, 613].includes(c)) return new MetaError("rate_limit", "Meta is rate-limiting, try again shortly");
  if (c === 190) return new MetaError("token", "The Meta access token is invalid or expired");
  if (c === 100 && /metric/i.test(msg)) return new MetaError("invalid_metric", msg);
  if (c === 10 || c === 200 || (c >= 200 && c < 300)) return new MetaError("permission", "This account isn't shared with Why Media or needs app approval");
  return new MetaError("other", msg.slice(0, 200));
}

async function call(path: string, params: Record<string, string>, accessToken = token(), absolute?: string) {
  const url = absolute ? new URL(absolute) : new URL(BASE + path);
  if (!absolute) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", accessToken);
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url);
    const j = (await res.json().catch(() => ({}))) as any;
    if (!j.error) return j;
    const e = classify(j.error);
    if (e.kind === "rate_limit" && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    throw e;
  }
  throw new MetaError("rate_limit", "Meta is rate-limiting, try again shortly");
}

async function all(path: string, params: Record<string, string>, accessToken?: string, max = 10) {
  const out: any[] = [];
  let j = await call(path, params, accessToken);
  out.push(...(j.data ?? []));
  for (let i = 0; i < max && j.paging?.next; i++) {
    j = await call("", {}, accessToken, j.paging.next);
    out.push(...(j.data ?? []));
  }
  return out;
}

/** Insights with per-metric fallback: invalid metrics are dropped and reported, the rest still returned. */
async function insights(path: string, metrics: string[], params: Record<string, string>, accessToken?: string) {
  try {
    const j = await call(path, { ...params, metric: metrics.join(",") }, accessToken);
    return { data: (j.data ?? []) as any[], skipped: [] as string[] };
  } catch (e) {
    if (!(e instanceof MetaError) || e.kind !== "invalid_metric" || metrics.length === 1) {
      if (e instanceof MetaError && e.kind === "invalid_metric") {
        console.warn("Meta metric unavailable:", metrics[0]);
        return { data: [], skipped: metrics };
      }
      throw e;
    }
    const parts = await Promise.all(metrics.map((m) => insights(path, [m], params, accessToken)));
    return { data: parts.flatMap((p) => p.data), skipped: parts.flatMap((p) => p.skipped) };
  }
}

const unix = (d: string, end = false) => String(Math.floor(new Date(`${d}T${end ? "23:59:59" : "00:00:00"}Z`).getTime() / 1000));

export async function discover() {
  const pages = await all("/me/accounts", {
    fields: "id,name,picture,instagram_business_account{id,username,followers_count,profile_picture_url}",
    limit: "100",
  });
  const ads = await all("/me/adaccounts", { fields: "id,name,currency,account_status", limit: "100" });
  return {
    pages: pages.map((p) => ({ id: p.id as string, name: p.name as string, picture: p.picture?.data?.url as string | undefined, ig: p.instagram_business_account ? { id: p.instagram_business_account.id as string, username: p.instagram_business_account.username as string, followers: p.instagram_business_account.followers_count as number } : null })),
    adAccounts: ads.map((a) => ({ id: a.id as string, name: a.name as string, currency: a.currency as string, status: a.account_status as number })),
  };
}

async function pageToken(pageId: string) {
  const j = await call(`/${pageId}`, { fields: "access_token" });
  if (!j.access_token) throw new MetaError("permission", "This account isn't shared with Why Media or needs app approval");
  return j.access_token as string;
}

const seriesOf = (rows: any[]) => {
  const m: Record<string, { date: string; value: number }[]> = {};
  for (const r of rows) m[r.name] = (r.values ?? []).map((v: any) => ({ date: String(v.end_time).slice(0, 10), value: typeof v.value === "number" ? v.value : 0 }));
  return m;
};

export async function facebook(pageId: string, from: string, to: string) {
  const pt = await pageToken(pageId);
  const [overview, ins, posts] = await Promise.all([
    call(`/${pageId}`, { fields: "name,followers_count,fan_count" }, pt),
    insights(`/${pageId}/insights`, FB_PAGE_METRICS, { period: "day", since: unix(from), until: unix(to, true) }, pt),
    call(`/${pageId}/published_posts`, {
      fields: "id,message,created_time,permalink_url,full_picture,shares,reactions.summary(true),comments.summary(true)",
      since: unix(from), until: unix(to, true), limit: "50",
    }, pt),
  ]);
  return {
    overview: { name: overview.name as string, followers: (overview.followers_count ?? 0) as number, fans: (overview.fan_count ?? 0) as number },
    series: seriesOf(ins.data),
    skipped: ins.skipped,
    posts: ((posts.data ?? []) as any[]).map((p) => {
      const reactions = p.reactions?.summary?.total_count ?? 0, comments = p.comments?.summary?.total_count ?? 0, shares = p.shares?.count ?? 0;
      return { id: p.id as string, text: (p.message ?? "") as string, date: p.created_time as string, url: p.permalink_url as string, image: p.full_picture as string | undefined, reactions, comments, shares, engagement: reactions + comments + shares };
    }),
  };
}

export async function instagram(igId: string, from: string, to: string) {
  const range = { since: unix(from), until: unix(to, true) };
  const [profile, totals, growth, media] = await Promise.all([
    call(`/${igId}`, { fields: "username,followers_count,follows_count,media_count,profile_picture_url" }),
    insights(`/${igId}/insights`, IG_ACCOUNT_METRICS, { ...range, period: "day", metric_type: "total_value" }),
    insights(`/${igId}/insights`, ["follower_count"], { ...range, period: "day" }),
    call(`/${igId}/media`, { fields: "id,caption,media_type,media_product_type,timestamp,permalink,media_url,thumbnail_url,like_count,comments_count", limit: "50" }),
  ]);
  const inRange = ((media.data ?? []) as any[]).filter((m) => m.timestamp.slice(0, 10) >= from && m.timestamp.slice(0, 10) <= to).slice(0, 25);
  const skipped = new Set([...totals.skipped, ...growth.skipped]);
  const posts = await Promise.all(inRange.map(async (m) => {
    let vals: Record<string, number> = {};
    try {
      const r = await insights(`/${m.id}/insights`, IG_MEDIA_METRICS, {});
      r.skipped.forEach((s) => skipped.add(s));
      vals = Object.fromEntries(r.data.map((d: any) => [d.name, d.values?.[0]?.value ?? 0]));
    } catch { /* some media types have no insights */ }
    return {
      id: m.id as string, text: (m.caption ?? "") as string, date: m.timestamp as string, url: m.permalink as string,
      image: (m.thumbnail_url ?? m.media_url) as string | undefined, format: (m.media_product_type ?? m.media_type) as string,
      likes: vals.likes ?? m.like_count ?? 0, comments: vals.comments ?? m.comments_count ?? 0,
      reach: vals.reach ?? 0, views: vals.views ?? 0, shares: vals.shares ?? 0, saved: vals.saved ?? 0,
      engagement: vals.total_interactions ?? (m.like_count ?? 0) + (m.comments_count ?? 0),
    };
  }));
  return {
    profile: { username: profile.username as string, followers: (profile.followers_count ?? 0) as number, follows: (profile.follows_count ?? 0) as number, media: (profile.media_count ?? 0) as number, picture: profile.profile_picture_url as string | undefined },
    totals: Object.fromEntries(totals.data.map((d: any) => [d.name, d.total_value?.value ?? 0])) as Record<string, number>,
    followerSeries: seriesOf(growth.data)["follower_count"] ?? [],
    skipped: [...skipped],
    posts,
  };
}

const actionsTotal = (a: any[] | undefined) => (a ?? []).filter((x) => ["link_click", "lead", "purchase", "onsite_conversion.messaging_conversation_started_7d"].includes(x.action_type)).reduce((s, x) => s + Number(x.value), 0);

export async function ads(accountIds: string[], from: string, to: string) {
  const time_range = JSON.stringify({ since: from, until: to });
  const fields = "spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,cost_per_action_type";
  const per = await Promise.all(accountIds.map(async (id) => {
    const [sum, daily, camps] = await Promise.all([
      call(`/${id}/insights`, { fields, time_range, level: "account" }),
      all(`/${id}/insights`, { fields: "spend,impressions,reach,clicks", time_range, level: "account", time_increment: "1", limit: "100" }),
      all(`/${id}/insights`, { fields: "campaign_name,spend,impressions,clicks,ctr,cpc,actions", time_range, level: "campaign", limit: "100" }),
    ]);
    return { id, sum: (sum.data ?? [])[0] ?? {}, daily, camps };
  }));
  const n = (v: unknown) => Number(v ?? 0);
  const totals = { spend: 0, impressions: 0, reach: 0, clicks: 0, results: 0 };
  for (const p of per) {
    totals.spend += n(p.sum.spend); totals.impressions += n(p.sum.impressions); totals.reach += n(p.sum.reach);
    totals.clicks += n(p.sum.clicks); totals.results += actionsTotal(p.sum.actions);
  }
  const byDay = new Map<string, { date: string; spend: number; impressions: number; clicks: number }>();
  for (const d of per.flatMap((p) => p.daily)) {
    const x = byDay.get(d.date_start) ?? { date: d.date_start, spend: 0, impressions: 0, clicks: 0 };
    x.spend += n(d.spend); x.impressions += n(d.impressions); x.clicks += n(d.clicks);
    byDay.set(d.date_start, x);
  }
  return {
    totals: { ...totals, ctr: totals.impressions ? totals.clicks / totals.impressions : 0, cpc: totals.clicks ? totals.spend / totals.clicks : 0, cpm: totals.impressions ? (totals.spend / totals.impressions) * 1000 : 0, frequency: totals.reach ? totals.impressions / totals.reach : 0 },
    currency: null as string | null,
    daily: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
    campaigns: per.flatMap((p) => p.camps.map((c: any) => ({ account: p.id, name: c.campaign_name as string, spend: n(c.spend), impressions: n(c.impressions), clicks: n(c.clicks), ctr: n(c.ctr) / 100, cpc: n(c.cpc), results: actionsTotal(c.actions) }))),
  };
}
