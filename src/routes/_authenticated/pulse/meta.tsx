import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { usePulse } from "@/components/pulse/context";
import { Empty, Loading, PageTitle, Panel, tooltipStyle } from "@/components/pulse/ui";
import { getMetaTab } from "@/lib/pulse/meta.functions";
import { fmt } from "@/lib/pulse/metrics";

export const Route = createFileRoute("/_authenticated/pulse/meta")({
  head: () => ({
    meta: [
      { title: "Meta analytics — Pulse" },
      { name: "description", content: "Facebook Page, Instagram and Meta Ads analytics per client." },
      { property: "og:title", content: "Meta analytics — Pulse" },
      { property: "og:description", content: "Facebook Page, Instagram and Meta Ads analytics per client." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Meta,
});

type Tab = "facebook" | "instagram" | "ads";
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 864e5));

function Meta() {
  const { clientId, client } = usePulse();
  const [tab, setTab] = useState<Tab>("facebook");
  const [preset, setPreset] = useState<"7" | "28" | "90" | "custom">("28");
  const [custom, setCustom] = useState({ from: daysAgo(28), to: daysAgo(1) });
  const range = preset === "custom" ? custom : { from: daysAgo(Number(preset)), to: daysAgo(1) };
  const fetchTab = useServerFn(getMetaTab);
  const [refreshKey, setRefreshKey] = useState(0);
  const q = useQuery({
    queryKey: ["pulse", "meta", clientId, tab, range.from, range.to, refreshKey],
    queryFn: () => fetchTab({ data: { clientId, tab, ...range, refresh: refreshKey > 0 } }),
    enabled: !!clientId && clientId !== "all",
    staleTime: 10 * 60_000,
    placeholderData: (p) => p,
  });
  if (clientId === "all") return <Empty title="Choose a client" body="Meta analytics are per client." />;
  const input = "h-8 rounded-lg border border-p-line bg-p-card px-2 text-xs text-p-text";
  return (
    <div className="space-y-6">
      <PageTitle title="Meta" sub={client?.name} />
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-p-line bg-p-card p-1">
          {(["facebook", "instagram", "ads"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-1.5 text-sm ${tab === t ? "bg-p-cerulean text-white" : "text-p-muted"}`}>
              {t === "ads" ? "Meta Ads" : t[0]!.toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <select value={preset} onChange={(e) => setPreset(e.target.value as typeof preset)} className={input} aria-label="Date range">
          <option value="7">Last 7 days</option><option value="28">Last 28 days</option><option value="90">Last 90 days</option><option value="custom">Custom</option>
        </select>
        {preset === "custom" && (
          <>
            <input type="date" className={input} value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
            <input type="date" className={input} value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
          </>
        )}
        <button onClick={() => setRefreshKey((k) => k + 1)} disabled={q.isFetching} className="ml-auto h-8 rounded-lg border border-p-line px-3 text-xs text-p-text disabled:opacity-50">
          {q.isFetching ? "Loading…" : "Refresh"}
        </button>
      </div>
      {!q.data ? <Loading /> : !q.data.connected ? (
        <Empty title="Not connected" body="Set up this client's Meta accounts in client settings." action={<Link to="/pulse/settings" className="rounded-lg bg-p-cerulean px-4 py-2 text-sm text-white">Open settings</Link>} />
      ) : !q.data.result.ok ? (
        <Empty title="Couldn't load Meta data" body={q.data.result.message} />
      ) : (
        <>
          <p className="text-[11px] text-p-muted">Live from Meta · fetched {new Date(q.data.result.data.fetchedAt).toLocaleString("en-GB")}</p>
          {q.data.tab === "facebook" && <Facebook d={q.data.result.data as any} />}
          {q.data.tab === "instagram" && <Instagram d={q.data.result.data as any} />}
          {q.data.tab === "ads" && <Ads d={q.data.result.data as any} />}
        </>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-p-line bg-p-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-p-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-p-text">{value}</div>
    </div>
  );
}

function Trend({ title, rows, keys }: { title: string; rows: Record<string, number | string>[]; keys: { k: string; label: string }[] }) {
  const colors = ["var(--p-cerulean)", "var(--p-sun)", "var(--p-muted)"];
  return (
    <Panel title={title}>
      {!rows.length ? <Empty title="No daily data" body="Meta returned no daily figures for this period." /> : (
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={rows}>
              <CartesianGrid stroke="var(--p-line)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--p-muted)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--p-muted)" }} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => fmt(v)} />
              <Tooltip {...tooltipStyle} />
              {keys.map((x, i) => <Line key={x.k} dataKey={x.k} name={x.label} stroke={colors[i % 3]} dot={false} strokeWidth={2} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

function merge(series: Record<string, { date: string; value: number }[]>) {
  const m = new Map<string, Record<string, number | string>>();
  for (const [k, pts] of Object.entries(series)) for (const p of pts) m.set(p.date, { ...(m.get(p.date) ?? { date: p.date }), [k]: p.value });
  return [...m.values()].sort((a, b) => String(a["date"]).localeCompare(String(b["date"])));
}
const total = (s: { value: number }[] | undefined) => (s ?? []).reduce((a, p) => a + p.value, 0);

function Skipped({ list }: { list: string[] }) {
  return list.length ? <p className="text-[11px] text-p-muted">Meta didn't return: {list.join(", ")}</p> : null;
}

function SortTable({ rows, cols, initial }: { rows: any[]; cols: { k: string; label: string; money?: boolean }[]; initial: string }) {
  const [sort, setSort] = useState(initial);
  const sorted = [...rows].sort((a, b) => Number(b[sort] ?? 0) - Number(a[sort] ?? 0));
  if (!rows.length) return <Empty title="Nothing in this period" body="No items were published or ran in the selected dates." />;
  return (
    <div className="max-h-[520px] overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-p-card text-left text-[11px] uppercase tracking-wider text-p-muted">
          <tr>
            <th className="py-2">Item</th>
            {cols.map((c) => <th key={c.k}><button onClick={() => setSort(c.k)} className={sort === c.k ? "text-p-cerulean" : ""}>{c.label}</button></th>)}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={r.id ?? i} className="border-t border-p-line">
              <td className="max-w-72 py-2">
                {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="block truncate hover:text-p-cerulean">{r.text || r.name || "(no text)"}</a> : <div className="truncate">{r.name}</div>}
                <div className="text-[11px] text-p-muted">{r.date ? String(r.date).slice(0, 10) : r.account}{r.format ? ` · ${r.format}` : ""}</div>
              </td>
              {cols.map((c) => <td key={c.k}>{c.money ? Number(r[c.k]).toFixed(2) : fmt(Number(r[c.k] ?? 0))}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Facebook({ d }: { d: { overview: { followers: number; fans: number }; series: Record<string, { date: string; value: number }[]>; skipped: string[]; posts: any[] } }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Followers" value={fmt(d.overview.followers)} />
        <Card label="Post engagements" value={fmt(total(d.series["page_post_engagements"]))} />
        <Card label="Page views" value={fmt(total(d.series["page_views_total"]))} />
        <Card label="New follows" value={fmt(total(d.series["page_follows"]))} />
      </div>
      <Skipped list={d.skipped} />
      <Trend title="Daily trend" rows={merge(d.series)} keys={[{ k: "page_post_engagements", label: "Engagements" }, { k: "page_views_total", label: "Page views" }, { k: "page_follows", label: "Follows" }]} />
      <Panel title={`Posts (${d.posts.length})`}>
        <SortTable rows={d.posts} initial="engagement" cols={[{ k: "engagement", label: "engagement" }, { k: "reactions", label: "reactions" }, { k: "comments", label: "comments" }, { k: "shares", label: "shares" }]} />
      </Panel>
    </div>
  );
}

function Instagram({ d }: { d: { profile: { followers: number; follows: number; media: number }; totals: Record<string, number>; followerSeries: { date: string; value: number }[]; skipped: string[]; posts: any[] } }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Card label="Followers" value={fmt(d.profile.followers)} />
        <Card label="New followers" value={fmt(total(d.followerSeries))} />
        <Card label="Reach" value={fmt(d.totals["reach"] ?? 0)} />
        <Card label="Views" value={fmt(d.totals["views"] ?? 0)} />
        <Card label="Accounts engaged" value={fmt(d.totals["accounts_engaged"] ?? 0)} />
        <Card label="Interactions" value={fmt(d.totals["total_interactions"] ?? 0)} />
      </div>
      <Skipped list={d.skipped} />
      <Trend title="New followers per day" rows={merge({ follower_count: d.followerSeries })} keys={[{ k: "follower_count", label: "New followers" }]} />
      <Panel title={`Posts (${d.posts.length})`}>
        <SortTable rows={d.posts} initial="reach" cols={[{ k: "reach", label: "reach" }, { k: "views", label: "views" }, { k: "engagement", label: "engagement" }, { k: "likes", label: "likes" }, { k: "comments", label: "comments" }, { k: "shares", label: "shares" }, { k: "saved", label: "saves" }]} />
      </Panel>
    </div>
  );
}

function Ads({ d }: { d: { totals: Record<string, number>; daily: any[]; campaigns: any[] } }) {
  const t = d.totals;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Spend" value={(t["spend"] ?? 0).toFixed(2)} />
        <Card label="Impressions" value={fmt(t["impressions"] ?? 0)} />
        <Card label="Reach" value={fmt(t["reach"] ?? 0)} />
        <Card label="Clicks" value={fmt(t["clicks"] ?? 0)} />
        <Card label="CTR" value={fmt(t["ctr"] ?? 0, "pct")} />
        <Card label="CPC" value={(t["cpc"] ?? 0).toFixed(2)} />
        <Card label="CPM" value={(t["cpm"] ?? 0).toFixed(2)} />
        <Card label="Frequency" value={fmt(t["frequency"] ?? 0, "dec")} />
      </div>
      <Trend title="Daily spend and clicks" rows={d.daily} keys={[{ k: "spend", label: "Spend" }, { k: "clicks", label: "Clicks" }]} />
      <Panel title={`Campaigns (${d.campaigns.length})`}>
        <SortTable rows={d.campaigns} initial="spend" cols={[{ k: "spend", label: "spend", money: true }, { k: "impressions", label: "impressions" }, { k: "clicks", label: "clicks" }, { k: "cpc", label: "cpc", money: true }, { k: "results", label: "results" }]} />
      </Panel>
    </div>
  );
}
