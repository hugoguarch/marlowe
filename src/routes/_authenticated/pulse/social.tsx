import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { MetaAds } from "@/components/pulse/MetaAds";
import { usePulse, usePulseData } from "@/components/pulse/context";
import { Empty, Kpi, Loading, PageTitle, Panel, tooltipStyle } from "@/components/pulse/ui";
import { buckets, channelLabel, fmt, latest, SOCIAL, spark, split, sum } from "@/lib/pulse/metrics";

export const Route = createFileRoute("/_authenticated/pulse/social")({
  head: () => ({
    meta: [
      { title: "Social — Pulse" },
      { name: "description", content: "Social performance per platform and combined, including Meta Ads." },
      { property: "og:title", content: "Social — Pulse" },
      { property: "og:description", content: "Social performance per platform and combined, including Meta Ads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Social,
});

type SortKey = "published_at" | "reach" | "views" | "likes" | "comments" | "shares" | "saves" | "eng";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TABS = [
  { id: "all", label: "All social" },
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "meta_ads", label: "Meta Ads" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "linkedin", label: "LinkedIn" },
] as const;
const POST_STATS = [
  { k: "reach", label: "Reach" }, { k: "views", label: "Views" }, { k: "eng", label: "Engagements" },
  { k: "likes", label: "Likes" }, { k: "comments", label: "Comments" }, { k: "shares", label: "Shares" }, { k: "saves", label: "Saves" },
] as const;

function Social() {
  const { client, clientId, channel, connected, range } = usePulse();
  const [tab, setTab] = useState<string>("all");
  useEffect(() => { if ((SOCIAL as readonly string[]).includes(channel)) setTab(channel); }, [channel]);
  if (clientId === "all") return <Empty title="Choose a client" body="Social detail is per client." />;
  return (
    <div className="space-y-6">
      <PageTitle title="Social" sub={client?.name} />
      <div className="flex flex-wrap rounded-xl border border-p-line bg-p-card p-1">
        {TABS.map((t) => {
          const on = t.id === "all" || connected.includes(t.id);
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-lg px-4 py-1.5 text-sm ${tab === t.id ? "bg-p-cerulean text-white" : on ? "text-p-text" : "text-p-muted/60"}`}>
              {t.label}
            </button>
          );
        })}
      </div>
      {tab === "meta_ads" ? <MetaAds /> : <Organic tab={tab} key={`${tab}-${range.from}`} />}
    </div>
  );
}

function Organic({ tab }: { tab: string }) {
  const { client, connected, range } = usePulse();
  const q = usePulseData(["posts"]);
  const [format, setFormat] = useState("all");
  const [sort, setSort] = useState<SortKey>("reach");
  const [followMode, setFollowMode] = useState<"both" | "follows" | "unfollows">("both");
  const [stat, setStat] = useState<(typeof POST_STATS)[number]["k"]>("reach");
  if (!q.data || !client) return <Loading />;
  const avail = SOCIAL.filter((c) => connected.includes(c)) as string[];
  const soc = tab === "all" ? avail : avail.filter((c) => c === tab);
  if (!soc.length)
    return <Panel title={tab === "all" ? "No social account connected" : `${channelLabel(tab)} isn't connected`} sub="Link this client's own account in Settings / Data sources." setup>{null}</Panel>;

  const conns = client.connections.filter((c) => soc.includes(c.provider));
  const { cur, prev } = split(q.data.series, range.from);
  const engOf = (p: { likes: number; comments: number; shares: number; saves: number }) => p.likes + p.comments + p.shares + p.saves;
  const posts = q.data.posts.filter((p) => soc.includes(p.channel)).map((p) => ({ ...p, eng: engOf(p) }));
  const shown = posts.filter((p) => format === "all" || p.format === format).sort((a, b) =>
    sort === "published_at" ? b.published_at.localeCompare(a.published_at) : (b[sort] as number) - (a[sort] as number),
  );
  const metricKey = sort === "published_at" ? "reach" : sort;
  const avgSort = shown.length ? shown.reduce((a, p) => a + (p[metricKey] as number), 0) / shown.length : 0;
  const formats = [...new Set(posts.map((p) => p.format))];
  const group = (key: (p: (typeof posts)[number]) => string, order: string[]) =>
    order.map((k) => {
      const g = posts.filter((p) => key(p) === k);
      return { k, reach: g.length ? g.reduce((a, p) => a + p.reach, 0) / g.length : 0 };
    });
  const reach = sum(cur, "reach", soc), reachP = sum(prev, "reach", soc);
  const tot = (k: string) => posts.reduce((a, p) => a + Number((p as any)[k] ?? 0), 0);

  const followRows = buckets(cur).map((b) => {
    const f = cur.filter((r) => r.b === b && soc.includes(r.ch));
    const fol = f.filter((r) => r.m === "follows").reduce((a, r) => a + r.v, 0);
    const un = f.filter((r) => r.m === "unfollows").reduce((a, r) => a + r.v, 0);
    return { d: b.slice(5), follows: fol, unfollows: -un, net: fol - un };
  });
  const hasFollows = followRows.some((r) => r.follows || r.unfollows);
  const perPost = [...posts].sort((a, b) => a.published_at.localeCompare(b.published_at)).map((p) => ({ d: p.published_at.slice(5, 10), v: p[stat] as number, cap: p.caption?.slice(0, 60) }));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Followers" value={latest(cur, "followers", soc)} prev={latest(prev, "followers", soc)} points={spark(cur, "followers", soc)} />
        <Kpi label="Net follows" value={latest(cur, "followers", soc) - latest(cur, "followers", soc, "first")} prev={latest(prev, "followers", soc) - latest(prev, "followers", soc, "first")} />
        <Kpi label="Reach" value={reach} prev={reachP} points={spark(cur, "reach", soc)} />
        <Kpi label="Views" value={sum(cur, "views", soc)} prev={sum(prev, "views", soc)} points={spark(cur, "views", soc)} />
        <Kpi label="Engagements" value={sum(cur, "engagements", soc)} prev={sum(prev, "engagements", soc)} />
        <Kpi label="Engagement rate" kind="pct" value={reach ? sum(cur, "engagements", soc) / reach : 0} prev={reachP ? sum(prev, "engagements", soc) / reachP : 0} />
      </div>

      <Panel
        title="Follows and unfollows per day"
        sub="Unfollows show below the line, so days with more unfollows than follows are easy to spot."
        conns={conns}
        action={
          <div className="flex rounded-lg border border-p-line p-0.5 text-xs">
            {(["both", "follows", "unfollows"] as const).map((m) => (
              <button key={m} onClick={() => setFollowMode(m)} className={`rounded-md px-2.5 py-1 ${followMode === m ? "bg-p-cerulean text-white" : "text-p-muted"}`}>
                {m === "both" ? "Follows + unfollows" : m === "follows" ? "Follows" : "Unfollows"}
              </button>
            ))}
          </div>
        }
      >
        {!hasFollows ? <Empty title="No follow data yet" body="The platform hasn't reported daily follows for this period." /> : (
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={followRows} stackOffset="sign">
                <CartesianGrid stroke="var(--p-line)" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: "var(--p-muted)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--p-muted)" }} tickLine={false} axisLine={false} width={36} />
                <Tooltip {...tooltipStyle} formatter={(v: number, n: string) => [Math.abs(v), n]} />
                <ReferenceLine y={0} stroke="var(--p-muted)" />
                {followMode !== "unfollows" && <Bar dataKey="follows" name="Follows" stackId="f" fill="var(--p-cerulean)" radius={[3, 3, 0, 0]} />}
                {followMode !== "follows" && <Bar dataKey="unfollows" name="Unfollows" stackId="f" fill="var(--p-down)" radius={[0, 0, 3, 3]} />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <Panel title="Post stats" sub={`Totals across ${posts.length} posts published in this period.`} conns={conns}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {POST_STATS.map((s) => (
            <button key={s.k} onClick={() => setStat(s.k)} className={`rounded-xl border p-3 text-left ${stat === s.k ? "border-p-cerulean bg-p-cerulean/5" : "border-p-line"}`}>
              <div className="text-[11px] uppercase tracking-wider text-p-muted">{s.label}</div>
              <div className="mt-1 text-xl font-light tabular-nums text-p-text">{fmt(tot(s.k))}</div>
              <div className="text-[11px] text-p-muted">avg {fmt(posts.length ? tot(s.k) / posts.length : 0)} / post</div>
            </button>
          ))}
        </div>
        {perPost.length > 0 && (
          <div className="mt-5 h-56">
            <ResponsiveContainer>
              <BarChart data={perPost}>
                <CartesianGrid stroke="var(--p-line)" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: "var(--p-muted)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--p-muted)" }} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => fmt(v)} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => fmt(v)} labelFormatter={(_, p) => p?.[0]?.payload?.cap ?? ""} />
                <Bar dataKey="v" name={POST_STATS.find((s) => s.k === stat)!.label} fill="var(--p-cerulean)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Chart title="Average reach by format" data={group((p) => p.format, formats)} conns={conns} />
        <Chart title="Average reach by day" data={group((p) => DAYS[new Date(p.published_at).getDay()] ?? "", DAYS)} conns={conns} />
        <Chart title="Average reach by hour" data={group((p) => String(new Date(p.published_at).getHours()), Array.from({ length: 24 }, (_, i) => String(i)))} conns={conns} />
      </div>

      <Panel
        title={`Posts (${shown.length})`}
        sub="Highlighted posts are above average for the column you've sorted by."
        conns={conns}
        action={
          <select value={format} onChange={(e) => setFormat(e.target.value)} className="h-8 rounded-lg border border-p-line bg-p-card px-2 text-xs">
            <option value="all">All formats</option>
            {formats.map((f) => <option key={f}>{f}</option>)}
          </select>
        }
      >
        {!shown.length ? <Empty title="No posts in this period" body="Nothing was published in the selected dates." /> : (
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-p-card text-left text-[11px] uppercase tracking-wider text-p-muted">
                <tr>
                  <th className="py-2">Post</th>
                  {(["published_at", "reach", "views", "eng", "likes", "comments", "shares", "saves"] as SortKey[]).map((k) => (
                    <th key={k}><button onClick={() => setSort(k)} className={sort === k ? "text-p-cerulean" : ""}>{k === "published_at" ? "date" : k === "eng" ? "engagement" : k}</button></th>
                  ))}
                  <th>Eng. rate</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => {
                  const above = avgSort > 0 && (p[metricKey] as number) > avgSort;
                  return (
                    <tr key={p.id} className={`border-t border-p-line ${above ? "bg-p-sun/10" : ""}`}>
                      <td className="max-w-64 py-2">
                        {p.permalink ? <a href={p.permalink} target="_blank" rel="noreferrer" className="block truncate hover:text-p-cerulean">{p.caption || "(no caption)"}</a> : <div className="truncate">{p.caption}</div>}
                        <div className="text-[11px] text-p-muted">
                          {channelLabel(p.channel)} · {p.format}
                          {above && <span className="ml-2 rounded bg-p-sun/40 px-1.5 py-0.5 text-[10px] font-medium text-p-text">Above average</span>}
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-xs">{p.published_at.slice(0, 10)}</td>
                      <td>{fmt(p.reach)}</td><td>{fmt(p.views)}</td><td>{fmt(p.eng)}</td><td>{p.likes}</td><td>{p.comments}</td><td>{p.shares}</td><td>{p.saves}</td>
                      <td>{p.reach ? fmt(p.eng / p.reach, "pct") : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
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
