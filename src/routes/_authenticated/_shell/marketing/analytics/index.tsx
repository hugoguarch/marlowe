import { createFileRoute, Link } from "@tanstack/react-router";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { usePulse, usePulseData, type PulseClient } from "@/components/pulse/context";
import { CompareChart, Delta, Empty, Kpi, Loading, PageTitle, Panel, tooltipStyle } from "@/components/pulse/ui";
import {
  avg, buckets, compareSeries, CHANNEL_COLORS, channelLabel, fmt, latest, scopeChannels, SOCIAL, spark, split, sum,
} from "@/lib/pulse/metrics";

export const Route = createFileRoute("/_authenticated/_shell/marketing/analytics/")({
  head: () => ({
    meta: [
      { title: "Overview — Pulse" },
      { name: "description", content: "Headline KPIs across every channel for the selected client." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { clientId, client, loading } = usePulse();
  if (loading || !clientId) return <Loading />;
  if (clientId === "all") return <Portfolio />;
  if (!client) return <Empty title="No client selected" body="Pick a client from the switcher." />;
  return <ClientOverview client={client} />;
}

function ClientOverview({ client }: { client: PulseClient }) {
  const { channel, connected, range } = usePulse();
  const q = usePulseData(["posts", "reviews"]);
  if (!q.data) return <Loading />;
  const { series, posts, reviews } = q.data;
  const { cur, prev } = split(series, range.from);
  const soc = scopeChannels(channel, connected, SOCIAL);
  const conns = (p: string[]) => client.connections.filter((c) => p.includes(c.provider));
  const reach = sum(cur, "reach", soc), reachP = sum(prev, "reach", soc);
  const eng = sum(cur, "engagements", soc), engP = sum(prev, "engagements", soc);
  const fol = latest(cur, "followers", soc), folP = latest(prev, "followers", soc);
  const netNew = fol - latest(cur, "followers", soc, "first");
  const netNewP = folP - latest(prev, "followers", soc, "first");
  const curReviews = reviews.filter((r) => r.created_at >= range.from);
  const prevReviews = reviews.filter((r) => r.created_at >= range.priorFrom && r.created_at < range.from);
  const rating = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  const ratingP = reviews.filter((r) => r.created_at < range.from);
  const ratingPrev = ratingP.length ? ratingP.reduce((a, r) => a + r.rating, 0) / ratingP.length : 0;

  const b = buckets(cur);
  const reachByCh = b.map((d) => {
    const row: Record<string, number | string> = { d: d.slice(5) };
    for (const ch of soc) row[ch] = cur.filter((r) => r.b === d && r.ch === ch && r.m === "reach").reduce((a, r) => a + r.v, 0);
    return row;
  });

  const na = { soc: !soc.length, web: !connected.includes("website"), gsc: !connected.includes("search_console"), gbp: !connected.includes("gbp") };
  const goalTotal = soc.reduce((a, ch) => a + (client.goals[`${ch}_followers`] ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageTitle title={client.name} sub={`${client.sector ?? ""} · ${range.from} to ${range.to}`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Reach" value={reach} prev={reachP} points={spark(cur, "reach", soc)} na={na.soc} to="/marketing/social" />
        <Kpi label="Views" value={sum(cur, "views", soc)} prev={sum(prev, "views", soc)} points={spark(cur, "views", soc)} na={na.soc} to="/marketing/social" />
        <Kpi label="Engagements" value={eng} prev={engP} points={spark(cur, "engagements", soc)} na={na.soc} to="/marketing/social" />
        <Kpi label="Engagement rate" value={reach ? eng / reach : 0} prev={reachP ? engP / reachP : 0} kind="pct" na={na.soc} to="/marketing/social" />
        <Kpi label="Followers" value={fol} prev={folP} points={spark(cur, "followers", soc)} na={na.soc} to="/marketing/social" />
        <Kpi label="Net new followers" value={netNew} prev={netNewP} na={na.soc} to="/marketing/social" />
        <Kpi label="Posts published" value={sum(cur, "posts", soc)} prev={sum(prev, "posts", soc)} na={na.soc} to="/marketing/social" />
        <Kpi label="Website sessions" value={sum(cur, "sessions", ["website"])} prev={sum(prev, "sessions", ["website"])} points={spark(cur, "sessions", ["website"])} na={na.web} to="/marketing/analytics/website" />
        <Kpi label="Conversions" value={sum(cur, "conversions", ["website"])} prev={sum(prev, "conversions", ["website"])} na={na.web} to="/marketing/analytics/website" />
        <Kpi label="Organic clicks" value={sum(cur, "clicks", ["search_console"])} prev={sum(prev, "clicks", ["search_console"])} points={spark(cur, "clicks", ["search_console"])} na={na.gsc} to="/marketing/analytics/website" />
        <Kpi label="Google rating" value={rating} prev={ratingPrev} kind="dec" na={na.gbp} to="/marketing/analytics/google-business" />
        <Kpi label="New reviews" value={curReviews.length} prev={prevReviews.length} na={na.gbp} to="/marketing/analytics/google-business" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Reach by channel" conns={conns([...soc])}>
          {soc.length ? (
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={reachByCh}>
                  <CartesianGrid stroke="var(--p-line)" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 11, fill: "var(--p-muted)" }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--p-muted)" }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => fmt(v)} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => channelLabel(String(v))} />
                  {soc.map((ch) => (
                    <Line key={ch} dataKey={ch} stroke={CHANNEL_COLORS[ch]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty title="No social channel selected" body="Pick All channels or a social channel to see reach." />
          )}
        </Panel>
        <Panel title="Follower growth" sub="Solid: this period · faded: the period before" conns={conns([...soc])}>
          <CompareChart data={compareSeries(cur, prev, "followers", soc)} label="Followers" />
          {goalTotal > 0 && <p className="mt-2 text-[11px] text-p-muted">Combined target: {fmt(goalTotal)}</p>}
        </Panel>
        <Panel title="Total reach" sub="Every selected social channel, vs the period before" conns={conns([...soc])} className="xl:col-span-2">
          <CompareChart data={compareSeries(cur, prev, "reach", soc)} label="Reach" />
        </Panel>
      </div>

      <Panel title="Channels" conns={conns([...soc])}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-p-muted">
              <tr>
                <th className="py-2">Channel</th><th>Followers</th><th>Net new</th><th>Reach</th><th>Views</th><th>Eng. rate</th><th>Posts</th><th>Source</th>
              </tr>
            </thead>
            <tbody>
              {soc.map((ch) => {
                const r = sum(cur, "reach", [ch]);
                const c = client.connections.find((x) => x.provider === ch);
                return (
                  <tr key={ch} className="border-t border-p-line">
                    <td className="py-2.5">{channelLabel(ch)}</td>
                    <td>{fmt(latest(cur, "followers", [ch]))}</td>
                    <td>{fmt(latest(cur, "followers", [ch]) - latest(cur, "followers", [ch], "first"))}</td>
                    <td>{fmt(r)}</td>
                    <td>{fmt(sum(cur, "views", [ch]))}</td>
                    <td>{fmt(r ? sum(cur, "engagements", [ch]) / r : 0, "pct")}</td>
                    <td>{sum(cur, "posts", [ch])}</td>
                    <td>{c?.status ?? "not connected"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Top posts by reach" conns={conns([...soc])} className="xl:col-span-2">
          <TopPosts posts={posts.filter((p) => soc.includes(p.channel as (typeof SOCIAL)[number])).slice(0, 5)} />
        </Panel>
        <div className="space-y-6">
          <Goals client={client} cur={cur} />
          <Panel title="AI summary">
            <Empty title="Written by Claude in a later stage" body="Three sentences on what changed and one action, generated only from the numbers above. Arrives with the Reports stage." />
          </Panel>
        </div>
      </div>
    </div>
  );
}

type Post = { id: string; channel: string; format: string; caption: string | null; permalink: string | null; thumbnail_url: string | null; reach: number; likes: number; comments: number; shares: number; saves: number };
export function TopPosts({ posts }: { posts: Post[] }) {
  if (!posts.length) return <Empty title="No posts in this period" body="Try a longer date range." />;
  return (
    <ul className="divide-y divide-p-line">
      {posts.map((p) => {
        const eng = p.likes + p.comments + p.shares + p.saves;
        return (
          <li key={p.id} className="flex items-center gap-4 py-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-p-soft text-[10px] uppercase text-p-cerulean">
              {p.thumbnail_url ? <img src={p.thumbnail_url} alt="" className="h-full w-full rounded-lg object-cover" /> : p.format}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-p-text" title={p.caption ?? ""}>{p.caption ? p.caption.split(/\s+/).slice(0, 6).join(" ").slice(0, 60) + (p.caption.split(/\s+/).length > 6 ? "..." : "") : "(no caption)"}</div>
              <div className="text-[11px] text-p-muted">{channelLabel(p.channel)} · {p.format}</div>
            </div>
            <div className="text-right text-sm">
              <div>{fmt(p.reach)}</div>
              <div className="text-[11px] text-p-muted">{fmt(p.reach ? eng / p.reach : 0, "pct")} eng.</div>
            </div>
            {p.permalink && (
              <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="relative z-10 text-xs text-p-cerulean hover:underline">
                Open
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Goals({ client, cur }: { client: PulseClient; cur: ReturnType<typeof split>["cur"] }) {
  const goals = Object.entries(client.goals).filter(([k]) => k.endsWith("_followers"));
  return (
    <Panel title="Goals">
      {goals.length ? (
        <div className="space-y-4">
          {goals.map(([k, target]) => {
            const ch = k.replace("_followers", "");
            const now = latest(cur, "followers", [ch]);
            const start = latest(cur, "followers", [ch], "first");
            const pct = Math.min(1, now / target);
            const perDay = (now - start) / Math.max(1, buckets(cur).length);
            const daysLeft = 30;
            const projected = now + perDay * daysLeft;
            return (
              <div key={k}>
                <div className="flex justify-between text-xs">
                  <span>{fmt(target)} {channelLabel(ch)} followers</span>
                  <span className={projected >= target ? "text-p-up" : "text-p-down"}>
                    {projected >= target ? "On track" : `Behind by ${fmt(target - projected)}`}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-p-soft">
                  <div className="h-2 rounded-full bg-p-sun" style={{ width: `${pct * 100}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-p-muted">{fmt(now)} now · {(pct * 100).toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty title="No goals set" body="Add monthly targets in Settings." action={<Link to="/settings/data-sources" className="text-xs text-p-cerulean">Open settings</Link>} />
      )}
    </Panel>
  );
}

function Portfolio() {
  const { session } = usePulse();
  const clients = (session?.clients ?? []).filter((c) => c.status !== "archived");
  return (
    <div className="space-y-6">
      <PageTitle title="All clients" sub="Headline KPIs for every retained client, this period vs the last." />
      <Panel title="League table" setup={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-p-muted">
              <tr><th className="py-2">Client</th><th>Followers</th><th>Reach</th><th>Eng. rate</th><th>Sessions</th><th>Clicks</th></tr>
            </thead>
            <tbody>{clients.map((c) => <LeagueRow key={c.id} client={c} />)}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function LeagueRow({ client }: { client: PulseClient }) {
  const { range, setClientId } = usePulse();
  const q = usePulseData([], client.id);
  const conn = client.connections.map((c) => c.provider);
  const soc = SOCIAL.filter((s) => conn.includes(s));
  if (!q.data) return <tr className="border-t border-p-line"><td className="py-3">{client.name}</td><td colSpan={5} className="text-p-muted">Loading…</td></tr>;
  const { cur, prev } = split(q.data.series, range.from);
  const reach = sum(cur, "reach", soc), reachP = sum(prev, "reach", soc);
  const er = reach ? sum(cur, "engagements", soc) / reach : 0;
  const erP = reachP ? sum(prev, "engagements", soc) / reachP : 0;
  const cell = (v: number, p: number, kind: "int" | "pct" = "int") => (
    <td><div>{fmt(v, kind)}</div><Delta cur={v} prev={p} /></td>
  );
  return (
    <tr className="border-t border-p-line">
      <td className="py-3">
        <button onClick={() => setClientId(client.id)} className="text-left hover:text-p-cerulean">
          {client.name}
          <span className="block text-[11px] text-p-muted">{client.sector}</span>
        </button>
      </td>
      {cell(latest(cur, "followers", soc), latest(prev, "followers", soc))}
      {cell(reach, reachP)}
      {cell(er, erP, "pct")}
      {cell(sum(cur, "sessions", ["website"]), sum(prev, "sessions", ["website"]))}
      {cell(sum(cur, "clicks", ["search_console"]), sum(prev, "clicks", ["search_console"]))}
    </tr>
  );
}

export { avg };
