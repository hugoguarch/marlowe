import { createFileRoute } from "@tanstack/react-router";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { usePulse, usePulseData } from "@/components/pulse/context";
import { Empty, Kpi, Loading, PageTitle, Panel, tooltipStyle } from "@/components/pulse/ui";
import { avg, buckets, fmt, spark, split, sum } from "@/lib/pulse/metrics";

export const Route = createFileRoute("/_authenticated/pulse/website")({
  head: () => ({ meta: [{ title: "Website & SEO — Pulse" }, { name: "description", content: "GA4, AI referrals and Search Console." }] }),
  component: Website,
});

function Website() {
  const { client, clientId, range } = usePulse();
  const q = usePulseData();
  if (clientId === "all") return <Empty title="Choose a client" body="Website detail is per client." />;
  if (!q.data || !client) return <Loading />;
  const { cur, prev } = split(q.data.series, range.from);
  const w = ["website"], s = ["search_console"];
  const ga = client.connections.filter((c) => c.provider === "website");
  const gsc = client.connections.filter((c) => c.provider === "search_console");
  const clicks = sum(cur, "clicks", s), impr = sum(cur, "impressions", s);
  const clicksP = sum(prev, "clicks", s), imprP = sum(prev, "impressions", s);
  const trend = buckets(cur).map((b) => ({
    d: b.slice(5),
    sessions: cur.find((r) => r.b === b && r.m === "sessions")?.v ?? 0,
    ai: cur.find((r) => r.b === b && r.m === "ai_sessions")?.v ?? 0,
  }));
  return (
    <div className="space-y-6">
      <PageTitle title="Website & SEO" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Sessions" value={sum(cur, "sessions", w)} prev={sum(prev, "sessions", w)} points={spark(cur, "sessions", w)} />
        <Kpi label="Conversions" value={sum(cur, "conversions", w)} prev={sum(prev, "conversions", w)} />
        <Kpi label="AI referral sessions" value={sum(cur, "ai_sessions", w)} prev={sum(prev, "ai_sessions", w)} points={spark(cur, "ai_sessions", w)} />
        <Kpi label="Organic clicks" value={clicks} prev={clicksP} points={spark(cur, "clicks", s)} />
        <Kpi label="Impressions" value={impr} prev={imprP} />
        <Kpi label="CTR" kind="pct" value={impr ? clicks / impr : 0} prev={imprP ? clicksP / imprP : 0} />
        <Kpi label="Avg position" kind="dec" invert value={avg(cur, "position", s)} prev={avg(prev, "position", s)} />
      </div>
      <Panel title="Sessions and AI referrals" conns={ga}>
        <p className="mb-3 text-[11px] text-p-muted">AI referrals: chatgpt.com, chat.openai.com, perplexity.ai, gemini.google.com, copilot.microsoft.com, claude.ai</p>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={trend}>
              <CartesianGrid stroke="var(--p-line)" vertical={false} />
              <XAxis dataKey="d" tick={{ fontSize: 11, fill: "var(--p-muted)" }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis yAxisId="l" tick={{ fontSize: 11, fill: "var(--p-muted)" }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => fmt(v)} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: "var(--p-muted)" }} tickLine={false} axisLine={false} width={36} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="l" dataKey="sessions" name="Sessions" stroke="var(--p-cerulean)" strokeWidth={2} dot={false} />
              <Line yAxisId="r" dataKey="ai" name="AI referrals" stroke="var(--p-sun)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Top queries and pages" conns={gsc}>
          <Empty title="Arrives with the live Search Console adapter" body="Queries, pages, and what is gaining or losing come straight from Search Console in stage 2." />
        </Panel>
        <Panel title="AI readiness check">
          <Empty title="Arrives in stage 2" body="Checks robots.txt for GPTBot, PerplexityBot, ClaudeBot and Google-Extended, llms.txt, and schema markup on key pages." />
        </Panel>
      </div>
    </div>
  );
}
