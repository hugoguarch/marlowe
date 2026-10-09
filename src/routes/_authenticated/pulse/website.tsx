import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { usePulse, usePulseData } from "@/components/pulse/context";
import { CompareChart, Delta, Empty, Kpi, Loading, PageTitle, Panel } from "@/components/pulse/ui";
import { getGscTop } from "@/lib/pulse/gsc.functions";
import { avg, compareSeries, fmt, spark, split, sum } from "@/lib/pulse/metrics";

export const Route = createFileRoute("/_authenticated/pulse/website")({
  head: () => ({ meta: [{ title: "Website & SEO — Pulse" }, { name: "description", content: "GA4, AI referrals and Search Console." }] }),
  component: Website,
});

function Website() {
  const { client, clientId, range } = usePulse();
  const q = usePulseData();
  const fetchTop = useServerFn(getGscTop);
  const top = useQuery({
    queryKey: ["pulse", "gscTop", clientId, range.from, range.to],
    queryFn: () => fetchTop({ data: { clientId, from: range.from, to: range.to, priorFrom: range.priorFrom } }),
    enabled: !!clientId && clientId !== "all",
    staleTime: 30 * 60_000,
  });
  if (clientId === "all") return <Empty title="Choose a client" body="Website detail is per client." />;
  if (!q.data || !client) return <Loading />;
  const { cur, prev } = split(q.data.series, range.from);
  const w = ["website"], s = ["search_console"];
  const ga = client.connections.filter((c) => c.provider === "website");
  const gsc = client.connections.filter((c) => c.provider === "search_console");
  const clicks = sum(cur, "clicks", s), impr = sum(cur, "impressions", s);
  const clicksP = sum(prev, "clicks", s), imprP = sum(prev, "impressions", s);
  return (
    <div className="space-y-6">
      <PageTitle title="Website & SEO" sub="Traffic from Google Analytics and search performance from Search Console." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Sessions" value={sum(cur, "sessions", w)} prev={sum(prev, "sessions", w)} points={spark(cur, "sessions", w)} />
        <Kpi label="Conversions" value={sum(cur, "conversions", w)} prev={sum(prev, "conversions", w)} />
        <Kpi label="AI referral sessions" value={sum(cur, "ai_sessions", w)} prev={sum(prev, "ai_sessions", w)} points={spark(cur, "ai_sessions", w)} />
        <Kpi label="Organic clicks" value={clicks} prev={clicksP} points={spark(cur, "clicks", s)} />
        <Kpi label="Impressions" value={impr} prev={imprP} />
        <Kpi label="CTR" kind="pct" value={impr ? clicks / impr : 0} prev={imprP ? clicksP / imprP : 0} />
        <Kpi label="Avg position" kind="dec" invert value={avg(cur, "position", s)} prev={avg(prev, "position", s)} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Organic clicks" sub="From Google Search, vs the period before" conns={gsc}>
          <CompareChart data={compareSeries(cur, prev, "clicks", s)} label="Clicks" />
        </Panel>
        <Panel title="Impressions" sub="How often the site appeared in Google results" conns={gsc}>
          <CompareChart data={compareSeries(cur, prev, "impressions", s)} label="Impressions" />
        </Panel>
        <Panel title="Website sessions" sub="All visits, vs the period before" conns={ga}>
          <CompareChart data={compareSeries(cur, prev, "sessions", w)} label="Sessions" />
        </Panel>
        <Panel title="AI referrals" sub="chatgpt.com, perplexity.ai, gemini, copilot, claude.ai" conns={ga}>
          <CompareChart data={compareSeries(cur, prev, "ai_sessions", w)} label="AI referrals" />
        </Panel>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <TopTable title="Top queries" rows={top.data?.queries} live={top.data?.live} loading={top.isLoading} error={top.error?.message} conns={gsc} />
        <TopTable title="Top pages" rows={top.data?.pages} live={top.data?.live} loading={top.isLoading} error={top.error?.message} conns={gsc} page />
      </div>
    </div>
  );
}

type Row = { key: string; clicks: number; impressions: number; position: number; prevClicks: number };
function TopTable({ title, rows, live, loading, error, conns, page }: {
  title: string; rows: Row[] | undefined; live: boolean | undefined; loading: boolean; error: string | undefined;
  conns: Parameters<typeof Panel>[0]["conns"]; page?: boolean;
}) {
  return (
    <Panel title={title} sub="Clicks this period, change vs the period before" conns={conns}>
      {loading ? <Loading /> : error ? (
        <Empty title="Search Console could not be reached" body={error} />
      ) : !live ? (
        <Empty title="Connect Search Console for this client" body="Choose the client's property in Settings / Data sources to see live queries and pages." />
      ) : !rows?.length ? (
        <Empty title="No search data in this period" body="Try a longer date range." />
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-p-muted">
            <tr><th className="py-2">{page ? "Page" : "Query"}</th><th className="text-right">Clicks</th><th className="text-right">Impr.</th><th className="text-right">Pos.</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-p-line">
                <td className="max-w-[16rem] truncate py-2.5 pr-2" title={r.key}>{page ? r.key.replace(/^https?:\/\/[^/]+/, "") || "/" : r.key}</td>
                <td className="text-right tabular-nums"><div>{fmt(r.clicks)}</div><Delta cur={r.clicks} prev={r.prevClicks} /></td>
                <td className="text-right tabular-nums text-p-muted">{fmt(r.impressions)}</td>
                <td className="text-right tabular-nums text-p-muted">{r.position.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
