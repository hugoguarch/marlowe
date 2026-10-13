/** Meta Ads view used inside Social. Live from the Graph API, cached 1h server-side. */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { usePulse } from "@/components/pulse/context";
import { Empty, Loading, Panel, tooltipStyle } from "@/components/pulse/ui";
import { getMetaTab } from "@/lib/pulse/meta.functions";
import { fmt } from "@/lib/pulse/metrics";

export function MetaAds() {
  const { clientId, range } = usePulse();
  const fetchTab = useServerFn(getMetaTab);
  const q = useQuery({
    queryKey: ["pulse", "meta", clientId, "ads", range.from, range.to],
    queryFn: () => fetchTab({ data: { clientId, tab: "ads", from: range.from, to: range.to, refresh: false } }),
    enabled: !!clientId && clientId !== "all",
    staleTime: 10 * 60_000,
  });
  if (!q.data) return <Loading />;
  if (!q.data.connected) return <Panel title="Meta Ads" sub="No ad account linked to this client yet." setup>{null}</Panel>;
  if (!q.data.result.ok) return <Empty title="Couldn't load Meta Ads" body={q.data.result.message} />;
  return <Ads d={q.data.result.data as any} />;
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
                {r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="block truncate hover:text-p-cerulean">{r.text ? r.text.split(/\s+/).slice(0, 6).join(" ").slice(0, 60) + "..." : r.name || "(no text)"}</a> : <div className="truncate">{r.name}</div>}
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
