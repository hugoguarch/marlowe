import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { usePulse, usePulseData } from "@/components/pulse/context";
import { Empty, Kpi, Loading, PageTitle, Panel, tooltipStyle } from "@/components/pulse/ui";
import { channelLabel, fmt, latest, scopeChannels, SOCIAL, spark, split, sum } from "@/lib/pulse/metrics";

export const Route = createFileRoute("/_authenticated/pulse/social")({
  head: () => ({ meta: [{ title: "Social — Pulse" }, { name: "description", content: "Social performance per platform and combined." }] }),
  component: Social,
});

type SortKey = "published_at" | "reach" | "views" | "likes" | "comments" | "shares" | "saves";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Social() {
  const { client, clientId, channel, connected, range } = usePulse();
  const q = usePulseData(["posts"]);
  const [format, setFormat] = useState("all");
  const [sort, setSort] = useState<SortKey>("reach");
  if (clientId === "all") return <Empty title="Choose a client" body="Social detail is per client." />;
  if (!q.data || !client) return <Loading />;
  const soc = scopeChannels(channel, connected, SOCIAL);
  const conns = client.connections.filter((c) => (soc as string[]).includes(c.provider));
  const { cur, prev } = split(q.data.series, range.from);
  const posts = q.data.posts.filter((p) => (soc as string[]).includes(p.channel));
  const shown = posts.filter((p) => format === "all" || p.format === format).sort((a, b) =>
    sort === "published_at" ? b.published_at.localeCompare(a.published_at) : (b[sort] as number) - (a[sort] as number),
  );
  const formats = [...new Set(posts.map((p) => p.format))];
  const engOf = (p: (typeof posts)[number]) => p.likes + p.comments + p.shares + p.saves;
  const group = (key: (p: (typeof posts)[number]) => string, order: string[]) =>
    order.map((k) => {
      const g = posts.filter((p) => key(p) === k);
      return { k, reach: g.length ? g.reduce((a, p) => a + p.reach, 0) / g.length : 0, eng: g.length ? g.reduce((a, p) => a + engOf(p), 0) / g.length : 0 };
    });
  const byFormat = group((p) => p.format, formats);
  const byDay = group((p) => DAYS[new Date(p.published_at).getDay()] ?? "", DAYS);
  const byHour = group((p) => String(new Date(p.published_at).getHours()), Array.from({ length: 24 }, (_, i) => String(i)));
  const reach = sum(cur, "reach", soc), reachP = sum(prev, "reach", soc);

  return (
    <div className="space-y-6">
      <PageTitle title="Social" sub={soc.map(channelLabel).join(", ") || "No social channels selected"} />
      {!soc.length ? (
        <Empty title="No social channel in this filter" body="Choose All channels or a social platform." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Followers" value={latest(cur, "followers", soc)} prev={latest(prev, "followers", soc)} points={spark(cur, "followers", soc)} />
            <Kpi label="Net follows" value={latest(cur, "followers", soc) - latest(cur, "followers", soc, "first")} prev={latest(prev, "followers", soc) - latest(prev, "followers", soc, "first")} />
            <Kpi label="Reach" value={reach} prev={reachP} points={spark(cur, "reach", soc)} />
            <Kpi label="Views" value={sum(cur, "views", soc)} prev={sum(prev, "views", soc)} points={spark(cur, "views", soc)} />
            <Kpi label="Engagements" value={sum(cur, "engagements", soc)} prev={sum(prev, "engagements", soc)} />
            <Kpi label="Engagement rate" kind="pct" value={reach ? sum(cur, "engagements", soc) / reach : 0} prev={reachP ? sum(prev, "engagements", soc) / reachP : 0} />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Chart title="Average reach by format" data={byFormat} conns={conns} />
            <Chart title="Average reach by day" data={byDay} conns={conns} />
            <Chart title="Average reach by hour" data={byHour} conns={conns} />
          </div>
          <Panel
            title={`Posts (${shown.length})`}
            conns={conns}
            action={
              <select value={format} onChange={(e) => setFormat(e.target.value)} className="h-8 rounded-lg border border-p-line bg-p-card px-2 text-xs">
                <option value="all">All formats</option>
                {formats.map((f) => <option key={f}>{f}</option>)}
              </select>
            }
          >
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-p-card text-left text-[11px] uppercase tracking-wider text-p-muted">
                  <tr>
                    <th className="py-2">Post</th>
                    {(["published_at", "reach", "views", "likes", "comments", "shares", "saves"] as SortKey[]).map((k) => (
                      <th key={k}>
                        <button onClick={() => setSort(k)} className={sort === k ? "text-p-cerulean" : ""}>{k === "published_at" ? "date" : k}</button>
                      </th>
                    ))}
                    <th>Eng. rate</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((p) => (
                    <tr key={p.id} className="border-t border-p-line">
                      <td className="max-w-64 py-2">
                        <div className="truncate">{p.caption}</div>
                        <div className="text-[11px] text-p-muted">{channelLabel(p.channel)} · {p.format}</div>
                      </td>
                      <td className="whitespace-nowrap text-xs">{p.published_at.slice(0, 10)}</td>
                      <td>{fmt(p.reach)}</td><td>{fmt(p.views)}</td><td>{p.likes}</td><td>{p.comments}</td><td>{p.shares}</td><td>{p.saves}</td>
                      <td>{fmt(p.reach ? engOf(p) / p.reach : 0, "pct")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Audience" conns={conns}>
            <Empty title="Audience breakdown arrives with live platform data" body="Age, gender, cities and countries come from the Meta, LinkedIn and TikTok APIs once connected. The sample adapter does not invent them." />
          </Panel>
        </>
      )}
    </div>
  );
}

function Chart({ title, data, conns }: { title: string; data: { k: string; reach: number }[]; conns: Parameters<typeof Panel>[0]["conns"] }) {
  return (
    <Panel title={title} conns={conns}>
      <div className="h-48">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid stroke="var(--p-line)" vertical={false} />
            <XAxis dataKey="k" tick={{ fontSize: 10, fill: "var(--p-muted)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--p-muted)" }} tickLine={false} axisLine={false} width={36} tickFormatter={(v) => fmt(v)} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => fmt(v)} />
            <Bar dataKey="reach" fill="var(--p-cerulean)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
