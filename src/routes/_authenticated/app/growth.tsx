import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { Card, CardLabel, PageHeader } from "@/components/app/ui";
import { pullAnalytics } from "@/lib/marlowe.functions";
import {
  byPlatform as seedByPlatform,
  followerSeries as seedSeries,
  metrics as seedMetrics,
  topContent as seedTopContent,
  upcoming as seedUpcoming,
} from "@/lib/mock/workspace";

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
const GOAL = 10000;
const CURRENT = 7412;

function GrowthPage() {
  const [range, setRange] = useState(ranges[1]!);
  const [metrics, setMetrics] = useState(seedMetrics);
  const [byPlatform, setByPlatform] = useState(seedByPlatform);
  const [followerSeries, setFollowerSeries] = useState(seedSeries);
  const [topContent, setTopContent] = useState(seedTopContent);
  const [upcoming, setUpcoming] = useState(seedUpcoming);
  const [goal, setGoal] = useState(GOAL);
  const [current, setCurrent] = useState(CURRENT);
  const pull = useServerFn(pullAnalytics);

  useEffect(() => {
    let cancelled = false;
    pull({ data: { range } })
      .then((d) => {
        if (cancelled) return;
        setMetrics(d.cards);
        setByPlatform(d.byPlatform);
        setFollowerSeries(d.series);
        setTopContent(d.topContent);
        setUpcoming(d.upcoming);
        setGoal(d.goal);
        setCurrent(d.current);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pull, range]);

  const pct = Math.round((current / goal) * 100);
  const max = Math.max(...followerSeries.map((p) => p.value));
  const min = Math.min(...followerSeries.map((p) => p.value)) * 0.985;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Growth"
        title={`You're ${pct}% to 10k followers`}
        subtitle={`${current.toLocaleString()} of ${goal.toLocaleString()} — at this pace, Marlowe expects you there in eleven weeks.`}
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

      <div className="h-2 w-full overflow-hidden rounded-full bg-app-line">
        <div
          className="h-full rounded-full bg-gradient-to-r from-ink-navy to-cerulean transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <Card key={m.label} className="p-5">
            <CardLabel>{m.label}</CardLabel>
            <p className="mt-3 text-2xl font-light tracking-tight">{m.value}</p>
            <p className="mt-1 text-xs text-brand-green">{m.delta}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardLabel>Follower growth</CardLabel>
        <div className="mt-6 flex h-48 items-end gap-3">
          {followerSeries.map((p) => (
            <div key={p.label} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-lg bg-cerulean/80 transition-all duration-500 hover:bg-cerulean"
                style={{ height: `${((p.value - min) / (max - min)) * 100}%` }}
                title={`${p.label}: ${p.value.toLocaleString()}`}
              />
              <span className="text-[0.6rem] tracking-[0.14em] text-ink-navy/40 uppercase">
                {p.label}
              </span>
            </div>
          ))}
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
              {byPlatform.map((row) => (
                <tr key={row.platform} className="text-ink-navy/75">
                  <td className="py-3 text-ink-navy">{row.platform}</td>
                  <td className="py-3">{row.followers}</td>
                  <td className="py-3 text-brand-green">{row.growth}</td>
                  <td className="py-3">{row.engagement}</td>
                  <td className="py-3">{row.reach}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardLabel>Top performing</CardLabel>
          <ul className="mt-4 divide-y divide-app-line">
            {topContent.map((c) => (
              <li key={c.title} className="py-3">
                <p className="text-sm text-ink-navy">{c.title}</p>
                <p className="mt-0.5 text-xs text-ink-navy/50">
                  {c.channel} · {c.metric}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardLabel>Scheduled and upcoming</CardLabel>
          <ul className="mt-4 divide-y divide-app-line">
            {upcoming.map((u) => (
              <li key={u.title} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm text-ink-navy">{u.title}</p>
                  <p className="mt-0.5 text-xs text-ink-navy/50">{u.channel}</p>
                </div>
                <span className="text-xs tracking-[0.14em] text-ink-navy/45 uppercase">
                  {u.when}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
