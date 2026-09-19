import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardLabel, PageHeader, pillPrimaryClass } from "@/components/app/ui";
import { pullAnalytics } from "@/lib/marlowe.functions";

export const Route = createFileRoute("/_authenticated/app/growth")({
  head: () => ({
    meta: [
      { title: "Growth — Why Media AI" },
      { name: "description", content: "Follower growth, engagement and what performed best." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GrowthPage,
});

const ranges = ["7 days", "30 days", "90 days"];

const cardLabels: Record<string, string> = {
  followers: "Followers",
  engagement: "Engagement",
  reach: "Reach",
  saves: "Saves",
  profile_visits: "Profile visits",
};

type Analytics = Awaited<ReturnType<typeof pullAnalytics>>;

function formatValue(metric: string, value: number) {
  if (metric === "engagement") return `${value.toFixed(1)}%`;
  return value.toLocaleString();
}

function GrowthPage() {
  const [range, setRange] = useState(ranges[1]!);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const pull = useServerFn(pullAnalytics);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    pull({ data: { range } })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pull, range]);

  const hasData = Boolean(data?.hasData);
  const current = data?.current ?? 0;
  const goal = data?.goal ?? 10000;
  const pct = goal ? Math.min(100, Math.round((current / goal) * 100)) : 0;

  const chartData = (data?.series ?? []).map((p) => ({
    date: new Date(p.label).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    followers: p.value,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Growth"
        title={hasData ? `You're ${pct}% to 10k followers` : "Growth"}
        subtitle={
          hasData
            ? `${current.toLocaleString()} of ${goal.toLocaleString()} followers across your connected channels.`
            : "Real numbers only. Connect your channels and this fills in with live data."
        }
        action={
          <div className="flex gap-1 rounded-full border border-app-line bg-app-card p-1">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-full px-4 py-2 text-[0.62rem] tracking-[0.14em] uppercase transition-colors ${
                  range === r ? "bg-ink-navy text-white" : "text-ink-navy/55 hover:text-ink-navy"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <Card>
          <p className="text-sm text-ink-navy/45">Loading your numbers…</p>
        </Card>
      ) : !hasData ? (
        <Card className="text-center">
          <CardLabel>Nothing to report yet</CardLabel>
          <p className="display mx-auto mt-4 max-w-md text-2xl font-light tracking-tight">
            No channels are connected, so there is nothing real to show.
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-navy/55">
            Rather than invent numbers, Marlowe waits. Connect Instagram, LinkedIn, TikTok or
            Google Analytics and your followers, reach and engagement appear here.
          </p>
          <Link to="/app/settings" className={`${pillPrimaryClass} mt-6 inline-block`}>
            Connect a channel
          </Link>
        </Card>
      ) : (
        <>
          <div className="h-2 w-full overflow-hidden rounded-full bg-app-line">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ink-navy to-cerulean transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {(data?.cards ?? []).map((m) => (
              <Card key={m.metric} className="p-5">
                <CardLabel>{cardLabels[m.metric] ?? m.metric}</CardLabel>
                <p className="mt-3 text-2xl font-light tracking-tight">
                  {formatValue(m.metric, m.value)}
                </p>
                <p
                  className={`mt-1 text-xs ${m.delta >= 0 ? "text-brand-green" : "text-ink-navy/50"}`}
                >
                  {m.delta >= 0 ? "+" : ""}
                  {formatValue(m.metric, m.delta)}
                </p>
              </Card>
            ))}
          </div>

          <Card>
            <CardLabel>Follower growth</CardLabel>
            <div className="mt-6 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="followerFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--cerulean)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--cerulean)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--app-line)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--ink-navy)", opacity: 0.45 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={60}
                    tick={{ fontSize: 11, fill: "var(--ink-navy)", opacity: 0.45 }}
                    domain={["dataMin - 50", "dataMax + 50"]}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 16,
                      border: "1px solid var(--app-line)",
                      background: "var(--app-card)",
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [value.toLocaleString(), "Followers"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="followers"
                    stroke="var(--cerulean)"
                    strokeWidth={2}
                    fill="url(#followerFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardLabel>By platform</CardLabel>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="text-[0.6rem] tracking-[0.18em] text-ink-navy/40 uppercase">
                    <th className="py-2 font-normal">Platform</th>
                    <th className="py-2 font-normal">Followers</th>
                    <th className="py-2 font-normal">Growth</th>
                    <th className="py-2 font-normal">Engagement</th>
                    <th className="py-2 font-normal">Reach</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-line">
                  {(data?.byPlatform ?? []).map((row) => (
                    <tr key={row.platform} className="text-ink-navy/75">
                      <td className="py-3 text-ink-navy">{row.platform}</td>
                      <td className="py-3">{row.followers.toLocaleString()}</td>
                      <td className="py-3 text-brand-green">
                        {row.growth >= 0 ? "+" : ""}
                        {row.growth.toLocaleString()}
                      </td>
                      <td className="py-3">{row.engagement.toFixed(1)}%</td>
                      <td className="py-3">{row.reach.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
