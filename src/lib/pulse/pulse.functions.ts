/** Pulse data layer. Every number on screen comes from these reads. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PulseRole = "admin" | "account_manager" | "client" | "none";
export type SeriesRow = { b: string; ch: string; m: string; v: number };

export const getPulseSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase.rpc("pulse_claim_admin");
    const { data: clients } = await context.supabase
      .from("pulse_clients")
      .select("id, name, sector, logo_url, status, goals, seed_terms")
      .order("name");
    const { data: conns } = await context.supabase
      .from("pulse_connections")
      .select("client_id, provider, status, last_sync_at, token_expires_at, account_ref");
    return {
      role: (role ?? "none") as PulseRole,
      clients: (clients ?? []).map((c) => ({
        ...c,
        goals: (c.goals ?? {}) as Record<string, number>,
        connections: (conns ?? []).filter((x) => x.client_id === c.id),
      })),
    };
  });

const rangeInput = z.object({
  clientId: z.string().uuid(),
  from: z.string(),
  to: z.string(),
  priorFrom: z.string(),
  bucket: z.enum(["day", "week"]),
  include: z.array(z.enum(["posts", "reviews"])).default([]),
  site: z.string().max(500).nullable().optional(),
});

export const getPulseData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const seriesP = sb.rpc("pulse_series", {
      _client: data.clientId,
      _from: data.priorFrom,
      _to: data.to,
      _bucket: data.bucket,
      ...(data.site ? { _site: data.site } : {}),
    });
    const postsP = data.include.includes("posts")
      ? sb
          .from("pulse_posts")
          .select("id, channel, published_at, format, caption, permalink, thumbnail_url, reach, views, likes, comments, shares, saves, source")
          .eq("client_id", data.clientId)
          .gte("published_at", data.from)
          .lte("published_at", `${data.to}T23:59:59`)
          .order("reach", { ascending: false })
          .limit(500)
      : null;
    const reviewsP = data.include.includes("reviews")
      ? sb
          .from("pulse_reviews")
          .select("id, rating, text, author, created_at, replied, source")
          .eq("client_id", data.clientId)
          .order("created_at", { ascending: false })
          .limit(500)
      : null;
    const [series, posts, reviews] = await Promise.all([seriesP, postsP, reviewsP]);
    if (series.error) throw new Error(series.error.message);
    return {
      series: ((series.data ?? []) as SeriesRow[]).map((r) => ({ ...r, v: Number(r.v) })),
      posts: posts?.data ?? [],
      reviews: reviews?.data ?? [],
    };
  });
