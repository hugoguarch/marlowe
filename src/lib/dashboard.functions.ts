/**
 * Dashboard — real numbers only: what is connected, what actually went out,
 * and today's output against the brand's daily target.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

export type PublishedPost = {
  id: string;
  title: string;
  channel: string;
  status: string;
  when: string;
  imageUrl: string | null;
  template: string;
};

export type DashboardSummary = {
  brandId: string | null;
  brandName: string | null;
  connectedChannels: string[];
  metrics: { metric: string; value: number; delta: number | null; platform: string }[];
  trend: { date: string; value: number }[];
  published: PublishedPost[];
  postedToday: number;
  dailyTarget: number;
};

export const getDashboardSummary = createServerFn({ method: "POST" })
  .inputValidator((input: { brandId?: string | null } | undefined) => ({
    brandId: input?.brandId ?? null,
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;

    let brandId = data.brandId;
    let brandName: string | null = null;
    let dailyTarget = 1;

    const { data: brand } = await (brandId
      ? supabase
          .from("brands")
          .select("id, name, daily_target")
          .eq("id", brandId)
          .eq("user_id", userId)
          .maybeSingle()
      : supabase
          .from("brands")
          .select("id, name, daily_target")
          .eq("user_id", userId)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle());

    if (brand) {
      brandId = brand.id;
      brandName = brand.name;
      dailyTarget = Number(brand.daily_target ?? 1);
    }

    const { data: accounts } = await supabase
      .from("connected_accounts")
      .select("provider, status")
      .eq("user_id", userId)
      .eq("status", "connected");
    const connectedChannels = ((accounts ?? []) as any[]).map((a) => a.provider);

    const { data: metricRows } = await supabase
      .from("metrics")
      .select("metric, value, delta, platform, captured_for")
      .eq("user_id", userId)
      .order("captured_for", { ascending: false })
      .limit(200);

    const rows = (metricRows ?? []) as any[];
    const latest = new Map<string, any>();
    for (const r of rows) if (!latest.has(r.metric)) latest.set(r.metric, r);

    const followerRows = rows
      .filter((r) => r.metric.toLowerCase().includes("follower"))
      .sort((a, b) => String(a.captured_for).localeCompare(String(b.captured_for)));

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data: scheduleRows } = await supabase
      .from("schedule")
      .select("id, title, channel, status, posted_at, scheduled_for, content_item_id")
      .eq("user_id", userId)
      .not("posted_at", "is", null)
      .order("posted_at", { ascending: false })
      .limit(12);

    const posted = (scheduleRows ?? []) as any[];
    const itemIds = posted.map((p) => p.content_item_id).filter(Boolean);
    const itemMap = new Map<string, any>();
    if (itemIds.length) {
      const { data: items } = await supabase
        .from("content_items")
        .select("id, render_url, template")
        .in("id", itemIds);
      for (const i of (items ?? []) as any[]) itemMap.set(i.id, i);
    }

    const published: PublishedPost[] = await Promise.all(
      posted.map(async (p) => {
        const item = p.content_item_id ? itemMap.get(p.content_item_id) : null;
        let imageUrl: string | null = null;
        if (item?.render_url) {
          const { data: signed } = await supabase.storage
            .from("brand-assets")
            .createSignedUrl(item.render_url, 60 * 60 * 6);
          imageUrl = signed?.signedUrl ?? null;
        }
        return {
          id: p.id,
          title: p.title,
          channel: p.channel,
          status: p.status,
          when: p.posted_at ?? p.scheduled_for,
          imageUrl,
          template: item?.template ?? "carousel",
        };
      }),
    );

    const postedToday = posted.filter(
      (p) => p.posted_at && new Date(p.posted_at) >= startOfDay,
    ).length;

    return {
      brandId,
      brandName,
      connectedChannels,
      metrics: [...latest.values()].slice(0, 5).map((m) => ({
        metric: m.metric,
        value: Number(m.value),
        delta: m.delta === null ? null : Number(m.delta),
        platform: m.platform,
      })),
      trend: followerRows.map((r) => ({ date: r.captured_for, value: Number(r.value) })),
      published,
      postedToday,
      dailyTarget,
    } as DashboardSummary;
  });
