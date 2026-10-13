/**
 * Google OAuth (agency's own Web client) for YouTube and Business Profile. Server-only.
 * Refresh tokens are AES-GCM encrypted in pulse_google_accounts (service-role only); access tokens are never stored.
 */
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
  "https://www.googleapis.com/auth/business.manage",
];
export const CALLBACK_PATH = "/api/public/oauth/google/callback";
const ALLOWED_ORIGINS = [/^https:\/\/marlowe\.lovable\.app$/, /^https:\/\/[a-z0-9-]+--60fbaa02-fb60-4722-beb2-152ded3c75e1\.lovable\.app$/, /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/, /^http:\/\/localhost:\d+$/];
export const allowedOrigin = (o: string) => ALLOWED_ORIGINS.some((r) => r.test(o));

const enc = new TextEncoder();
const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

function secret() {
  const k = process.env["PULSE_TOKEN_KEY"];
  if (!k) throw new Error("PULSE_TOKEN_KEY is not set");
  return k;
}
async function aesKey() {
  const h = await crypto.subtle.digest("SHA-256", enc.encode(`aes:${secret()}`));
  return crypto.subtle.importKey("raw", h, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function hmacKey() {
  return crypto.subtle.importKey("raw", enc.encode(`state:${secret()}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export async function encrypt(t: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), enc.encode(t));
  return `${b64(iv)}.${b64(ct)}`;
}
export async function decrypt(s: string) {
  const [iv, ct] = s.split(".");
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv!) }, await aesKey(), unb64(ct!)));
}

export async function signState(p: { c: string; o: string; p?: string }) {
  const body = b64(enc.encode(JSON.stringify({ ...p, exp: Date.now() + 15 * 60_000 })));
  const sig = b64(await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(body)));
  return `${body}.${sig}`;
}
export async function verifyState(s: string): Promise<{ c: string; o: string; p?: string } | null> {
  const [body, sig] = s.split(".");
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(), unb64(sig), enc.encode(body));
  if (!ok) return null;
  const p = JSON.parse(new TextDecoder().decode(unb64(body)));
  return p.exp > Date.now() && allowedOrigin(p.o) ? p : null;
}

function creds() {
  const id = process.env["GOOGLE_OAUTH_CLIENT_ID"], sec = process.env["GOOGLE_OAUTH_CLIENT_SECRET"];
  if (!id || !sec) throw new Error("Google sign-in app is not configured");
  return { id, sec };
}
export const PURPOSE_SCOPES: Record<string, string[]> = {
  youtube: ["openid", "email", "https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/yt-analytics.readonly"],
  gbp: ["openid", "email", "https://www.googleapis.com/auth/business.manage"],
};
export function authUrl(origin: string, state: string, purpose?: string) {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.search = new URLSearchParams({ client_id: creds().id, redirect_uri: origin + CALLBACK_PATH, response_type: "code", scope: (PURPOSE_SCOPES[purpose ?? ""] ?? GOOGLE_SCOPES).join(" "), access_type: "offline", prompt: "consent select_account", include_granted_scopes: "true", state }).toString();
  return u.toString();
}

async function tokenCall(params: Record<string, string>) {
  const { id, sec } = creds();
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: id, client_secret: sec, ...params }) });
  const j = (await res.json()) as any;
  if (!res.ok) throw new Error(`Google sign-in failed: ${j.error_description ?? j.error ?? res.status}`);
  return j as { access_token: string; refresh_token?: string; scope?: string; id_token?: string };
}

const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

/** Exchange the code, store the encrypted refresh token, return the account row id + email. */
export async function finishOAuth(code: string, origin: string) {
  const t = await tokenCall({ code, grant_type: "authorization_code", redirect_uri: origin + CALLBACK_PATH });
  const info = (await (await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${t.access_token}` } })).json()) as any;
  const email = String(info.email ?? "unknown");
  const sb = await admin();
  const { data: existing } = await sb.from("pulse_google_accounts").select("id").eq("email", email).maybeSingle();
  if (!t.refresh_token && !existing) throw new Error("Google did not return offline access. Remove Pulse from your Google account permissions and try again.");
  const patch: any = { email, scopes: t.scope ?? null, updated_at: new Date().toISOString() };
  if (t.refresh_token) patch.refresh_token_enc = await encrypt(t.refresh_token);
  const { data, error } = await sb.from("pulse_google_accounts").upsert(patch, { onConflict: "email" }).select("id").single();
  if (error) throw new Error(error.message);
  return { accountId: data.id as string, email, accessToken: t.access_token };
}

const tokenCache = new Map<string, { t: string; exp: number }>();
export async function accessToken(accountId: string) {
  const c = tokenCache.get(accountId);
  if (c && c.exp > Date.now()) return c.t;
  const sb = await admin();
  const { data } = await sb.from("pulse_google_accounts").select("refresh_token_enc").eq("id", accountId).maybeSingle();
  if (!data) throw new Error("Google account is no longer connected — reconnect it");
  const t = await tokenCall({ refresh_token: await decrypt(data.refresh_token_enc), grant_type: "refresh_token" });
  tokenCache.set(accountId, { t: t.access_token, exp: Date.now() + 50 * 60_000 });
  return t.access_token;
}

export async function gget(tok: string, url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 300);
    try { msg = JSON.parse(text).error?.message ?? msg; } catch { /* keep raw */ }
    throw new Error(`Google [${res.status}]: ${msg}`);
  }
  return text ? JSON.parse(text) : {};
}

// ---------- Discovery ----------
export async function youtubeChannels(tok: string) {
  const j = await gget(tok, "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true");
  return ((j.items ?? []) as any[]).map((c) => ({ id: c.id as string, name: c.snippet?.title as string, subs: Number(c.statistics?.subscriberCount ?? 0) }));
}
export async function gbpLocations(tok: string) {
  const a = await gget(tok, "https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20");
  const out: { id: string; name: string }[] = [];
  for (const acc of (a.accounts ?? []) as any[]) {
    let page = "";
    for (let i = 0; i < 10; i++) {
      const l = await gget(tok, `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,storefrontAddress&pageSize=100${page ? `&pageToken=${page}` : ""}`);
      for (const loc of (l.locations ?? []) as any[]) out.push({ id: `${acc.name}/${loc.name}`, name: `${loc.title}${loc.storefrontAddress?.locality ? ` · ${loc.storefrontAddress.locality}` : ""}` });
      if (!l.nextPageToken) break;
      page = l.nextPageToken;
    }
  }
  return out;
}

// ---------- Sync ----------
const iso = (d: Date) => d.toISOString().slice(0, 10);
type Row = { date: string; metric: string; value: number };

async function writeRows(clientId: string, channel: string, site: string, rows: Row[]) {
  const sb = await admin();
  const full = rows.map((r) => ({ ...r, client_id: clientId, channel, site, source: "live" }));
  for (let i = 0; i < full.length; i += 1000) {
    const up = await sb.from("pulse_metrics_daily").upsert(full.slice(i, i + 1000), { onConflict: "client_id,channel,site,date,metric" });
    if (up.error) throw new Error(up.error.message);
  }
}

async function syncYoutube(clientId: string, channelId: string, tok: string) {
  const end = new Date(), start = new Date(Date.now() - 400 * 864e5);
  const r = await gget(tok, `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=${iso(start)}&endDate=${iso(end)}&dimensions=day&sort=day&metrics=views,estimatedMinutesWatched,likes,comments,shares,subscribersGained,subscribersLost`);
  const rows: Row[] = [];
  const days = (r.rows ?? []) as any[][];
  const ch = (await youtubeChannels(tok)).find((c) => c.id === channelId);
  let subs = ch?.subs ?? 0;
  const followers: Row[] = [];
  for (let i = days.length - 1; i >= 0; i--) {
    const [date, views, mins, likes, comments, shares, gained, lost] = days[i]!;
    followers.push({ date, metric: "followers", value: subs });
    subs -= Number(gained) - Number(lost);
    rows.push(
      { date, metric: "views", value: Number(views) }, { date, metric: "watch_minutes", value: Number(mins) },
      { date, metric: "likes", value: Number(likes) }, { date, metric: "comments", value: Number(comments) }, { date, metric: "shares", value: Number(shares) },
      { date, metric: "engagements", value: Number(likes) + Number(comments) + Number(shares) },
      { date, metric: "follows", value: Number(gained) }, { date, metric: "unfollows", value: Number(lost) },
    );
  }
  // Recent uploads become posts.
  const c = await gget(tok, `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}`);
  const uploads = c.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  const sb = await admin();
  if (uploads) {
    const pl = await gget(tok, `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${uploads}`);
    const ids = ((pl.items ?? []) as any[]).map((i) => i.contentDetails.videoId).join(",");
    if (ids) {
      const v = await gget(tok, `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${ids}`);
      const posts = ((v.items ?? []) as any[]).map((x) => ({
        client_id: clientId, channel: "youtube", source: "live", external_id: x.id, published_at: x.snippet.publishedAt,
        format: /PT(\d+S|[0-5]?\dS|1M)$/.test(x.contentDetails?.duration ?? "") && !/H/.test(x.contentDetails?.duration ?? "") ? "short" : "video",
        caption: x.snippet.title, permalink: `https://www.youtube.com/watch?v=${x.id}`, thumbnail_url: x.snippet.thumbnails?.medium?.url ?? null,
        reach: 0, views: Number(x.statistics?.viewCount ?? 0), likes: Number(x.statistics?.likeCount ?? 0), comments: Number(x.statistics?.commentCount ?? 0), shares: 0, saves: 0,
      }));
      const perDay = new Map<string, number>();
      for (const p of posts) perDay.set(p.published_at.slice(0, 10), (perDay.get(p.published_at.slice(0, 10)) ?? 0) + 1);
      rows.push(...[...perDay].map(([date, value]) => ({ date, metric: "posts", value })));
      await sb.from("pulse_posts").delete().eq("client_id", clientId).eq("channel", "youtube");
      if (posts.length) { const ins = await sb.from("pulse_posts").insert(posts as any); if (ins.error) throw new Error(ins.error.message); }
    }
  }
  await writeRows(clientId, "youtube", "", [...rows, ...followers]);
}

const GBP_METRICS: Record<string, string> = {
  BUSINESS_IMPRESSIONS_DESKTOP_MAPS: "views_maps", BUSINESS_IMPRESSIONS_MOBILE_MAPS: "views_maps",
  BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: "views_search", BUSINESS_IMPRESSIONS_MOBILE_SEARCH: "views_search",
  CALL_CLICKS: "calls", WEBSITE_CLICKS: "website_clicks", BUSINESS_DIRECTION_REQUESTS: "direction_requests",
};

async function syncGbp(clientId: string, ref: string, tok: string) {
  const loc = ref.slice(ref.indexOf("locations/"));
  const end = new Date(Date.now() - 2 * 864e5), start = new Date(Date.now() - 540 * 864e5);
  const p = (d: Date, k: string) => `dailyRange.${k}_date.year=${d.getUTCFullYear()}&dailyRange.${k}_date.month=${d.getUTCMonth() + 1}&dailyRange.${k}_date.day=${d.getUTCDate()}`;
  const q = Object.keys(GBP_METRICS).map((m) => `dailyMetrics=${m}`).join("&");
  const j = await gget(tok, `https://businessprofileperformance.googleapis.com/v1/${loc}:fetchMultiDailyMetricsTimeSeries?${q}&${p(start, "start")}&${p(end, "end")}`);
  const acc = new Map<string, number>();
  for (const s of (j.multiDailyMetricTimeSeries ?? []) as any[]) {
    for (const t of (s.dailyMetricTimeSeries ?? []) as any[]) {
      const m = GBP_METRICS[t.dailyMetric];
      if (!m) continue;
      for (const v of (t.timeSeries?.datedValues ?? []) as any[]) {
        const d = `${v.date.year}-${String(v.date.month).padStart(2, "0")}-${String(v.date.day).padStart(2, "0")}`;
        for (const k of [m, "profile_views"].slice(0, m.startsWith("views_") ? 2 : 1)) acc.set(`${d}|${k}`, (acc.get(`${d}|${k}`) ?? 0) + Number(v.value ?? 0));
      }
    }
  }
  await writeRows(clientId, "gbp", "", [...acc].map(([k, value]) => { const [date, metric] = k.split("|"); return { date: date!, metric: metric!, value }; }));
  // Reviews (Google My Business v4).
  const reviews: any[] = [];
  let page = "";
  for (let i = 0; i < 10; i++) {
    const r = await gget(tok, `https://mybusiness.googleapis.com/v4/${ref}/reviews?pageSize=50${page ? `&pageToken=${page}` : ""}`);
    reviews.push(...(r.reviews ?? []));
    if (!r.nextPageToken) break;
    page = r.nextPageToken;
  }
  const stars: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  const sb = await admin();
  await sb.from("pulse_reviews").delete().eq("client_id", clientId).eq("source", "live");
  if (reviews.length) {
    const ins = await sb.from("pulse_reviews").insert(reviews.map((x) => ({ client_id: clientId, source: "live", external_id: x.reviewId, rating: stars[x.starRating] ?? 0, text: x.comment ?? null, author: x.reviewer?.displayName ?? null, created_at: x.createTime, replied: !!x.reviewReply })));
    if (ins.error) throw new Error(ins.error.message);
  }
}

/** Sync one youtube/gbp connection row, recording status and errors on it. */
export async function syncGoogleConnection(clientId: string, provider: string, ref: string) {
  const sb = await admin();
  const { data: conn } = await sb.from("pulse_connections").select("oauth_account_id").eq("client_id", clientId).eq("provider", provider).eq("account_ref", ref).maybeSingle();
  const now = new Date().toISOString();
  const mark = (patch: Record<string, unknown>) => sb.from("pulse_connections").update({ last_attempt_at: now, ...patch }).eq("client_id", clientId).eq("provider", provider).eq("account_ref", ref);
  try {
    if (!conn?.oauth_account_id) throw new Error("No Google account linked — reconnect");
    const tok = await accessToken(conn.oauth_account_id);
    if (provider === "youtube") await syncYoutube(clientId, ref, tok);
    else await syncGbp(clientId, ref, tok);
    await mark({ status: "connected", last_sync_at: now, last_error: null });
    return "ok";
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 300) : "Sync failed";
    await mark({ status: "error", last_error: msg });
    return msg;
  }
}

export async function syncAllGoogle() {
  const sb = await admin();
  const { data } = await sb.from("pulse_connections").select("client_id, provider, account_ref").in("provider", ["youtube", "gbp"]).not("oauth_account_id", "is", null);
  let ok = 0, failed = 0;
  for (const c of data ?? []) (await syncGoogleConnection(c.client_id, c.provider, c.account_ref!)) === "ok" ? ok++ : failed++;
  return { ok, failed };
}
