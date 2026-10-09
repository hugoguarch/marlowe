import { createFileRoute } from "@tanstack/react-router";

import { usePulse, usePulseData } from "@/components/pulse/context";
import { Empty, Kpi, Loading, PageTitle, Panel } from "@/components/pulse/ui";
import { spark, split, sum } from "@/lib/pulse/metrics";

export const Route = createFileRoute("/_authenticated/pulse/google-business")({
  head: () => ({ meta: [{ title: "Google Business — Pulse" }, { name: "description", content: "Rating, reviews and profile actions." }] }),
  component: Gbp,
});

function Gbp() {
  const { client, clientId, range } = usePulse();
  const q = usePulseData(["reviews"]);
  if (clientId === "all") return <Empty title="Choose a client" body="Google Business detail is per client." />;
  if (!q.data || !client) return <Loading />;
  const conns = client.connections.filter((c) => c.provider === "gbp");
  if (!conns.length) return <Empty title="Google Business Profile not connected" body="Connect it in Settings / Data sources." />;
  const { cur, prev } = split(q.data.series, range.from);
  const reviews = q.data.reviews;
  const curR = reviews.filter((r) => r.created_at >= range.from);
  const prevR = reviews.filter((r) => r.created_at >= range.priorFrom && r.created_at < range.from);
  const avg = (rs: typeof reviews) => (rs.length ? rs.reduce((a, r) => a + r.rating, 0) / rs.length : 0);
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.rating === s).length }));
  const g = ["gbp"];
  return (
    <div className="space-y-6">
      <PageTitle title="Google Business Profile" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Rating" kind="dec" value={avg(reviews)} prev={avg(reviews.filter((r) => r.created_at < range.from))} />
        <Kpi label="Total reviews" value={reviews.length} prev={reviews.length - curR.length} />
        <Kpi label="New reviews" value={curR.length} prev={prevR.length} />
        <Kpi label="Profile views" value={sum(cur, "profile_views", g)} prev={sum(prev, "profile_views", g)} points={spark(cur, "profile_views", g)} />
        <Kpi label="Calls" value={sum(cur, "calls", g)} prev={sum(prev, "calls", g)} />
        <Kpi label="Direction requests" value={sum(cur, "direction_requests", g)} prev={sum(prev, "direction_requests", g)} />
        <Kpi label="Website clicks" value={sum(cur, "website_clicks", g)} prev={sum(prev, "website_clicks", g)} />
        <Kpi label="Avg rating, period" kind="dec" value={avg(curR)} prev={avg(prevR)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Rating distribution" conns={conns}>
          <div className="space-y-2">
            {dist.map((d) => (
              <div key={d.s} className="flex items-center gap-3 text-xs">
                <span className="w-6">{d.s}★</span>
                <div className="h-2 flex-1 rounded-full bg-p-soft">
                  <div className="h-2 rounded-full bg-p-sun" style={{ width: `${reviews.length ? (d.n / reviews.length) * 100 : 0}%` }} />
                </div>
                <span className="w-8 text-right text-p-muted">{d.n}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-p-muted">Search vs Maps views and discovery keywords arrive with the live Business Profile adapter.</p>
        </Panel>
        <Panel title="Review feed" conns={conns} className="lg:col-span-2">
          <ul className="max-h-[480px] divide-y divide-p-line overflow-y-auto">
            {reviews.map((r) => {
              const flag = !r.replied || r.rating <= 3;
              return (
                <li key={r.id} className="py-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{r.author} · {"★".repeat(r.rating)}</span>
                    <span className="text-p-muted">{r.created_at.slice(0, 10)}</span>
                  </div>
                  <p className="mt-1 text-sm">{r.text}</p>
                  <div className="mt-1 flex gap-2 text-[11px]">
                    {!r.replied && <span className="rounded-full bg-p-sun/20 px-2 py-0.5">Unreplied</span>}
                    {r.rating <= 3 && <span className="rounded-full bg-p-down/15 px-2 py-0.5 text-p-down">Negative</span>}
                    {flag && !r.replied && <span className="text-p-muted">Claude reply drafts arrive in a later stage</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
