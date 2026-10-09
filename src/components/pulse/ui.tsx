import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { change, channelLabel, fmt } from "@/lib/pulse/metrics";
import type { PulseClient } from "./context";

export function SampleBadge() {
  return (
    <span className="rounded-full border border-p-sun/60 bg-p-sun/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-p-text">
      Sample data
    </span>
  );
}

type Conn = PulseClient["connections"][number];

export function SourceLine({ conns }: { conns: Conn[] }) {
  if (!conns.length) return null;
  const failed = conns.filter((c) => c.status === "error" || (c.token_expires_at && new Date(c.token_expires_at) < new Date()));
  const last = conns.map((c) => c.last_sync_at).filter(Boolean).sort().pop();
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-p-muted">
      <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-p-up" />Live · {[...new Set(conns.map((c) => channelLabel(c.provider)))].join(", ")}</span>
      {last && <span>· synced {new Date(last).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span>}
      {failed.length > 0 && <span className="text-p-down">· token expired or sync failed</span>}
    </div>
  );
}

export function Panel({
  title,
  sub,
  conns,
  action,
  children,
  className = "",
  setup,
}: {
  setup?: boolean | undefined;
  title: string;
  sub?: string | undefined;
  conns?: Conn[] | undefined;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-p-line bg-p-card shadow-[0_1px_2px_rgba(0,28,38,0.04)] ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-p-line px-5 py-4">
        <div className="space-y-1">
          <h2 className="text-base font-medium tracking-tight text-p-text">{title}</h2>
          {sub && <p className="text-xs text-p-muted">{sub}</p>}
          <SourceLine conns={conns ?? []} />
        </div>
        {action}
      </div>
      <div className="p-5">{(setup ?? (conns !== undefined && conns.length === 0)) ? <SetupConnection /> : children}</div>
    </section>
  );
}

export function Delta({ cur, prev, invert = false }: { cur: number; prev: number; invert?: boolean | undefined }) {
  const c = change(cur, prev);
  if (c === null) return <span className="text-[11px] text-p-muted">no prior data</span>;
  const good = invert ? c < 0 : c >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${good ? "bg-p-up/10 text-p-up" : "bg-p-down/10 text-p-down"}`}>
      {c >= 0 ? "↑" : "↓"} {Math.abs(c * 100).toFixed(1)}%
    </span>
  );
}

export function Kpi({
  label,
  value,
  prev,
  kind = "int",
  points = [],
  to,
  invert,
  na,
}: {
  na?: boolean | undefined;
  label: string;
  value: number;
  prev: number;
  kind?: "int" | "pct" | "dec";
  points?: number[];
  to?: "/pulse/social" | "/pulse/google-business" | "/pulse/website" | "/pulse/ai-search";
  invert?: boolean | undefined;
}) {
  const body = (
    <div className="flex h-full flex-col rounded-2xl border border-p-line bg-p-card shadow-[0_1px_2px_rgba(0,28,38,0.04)] transition-all hover:-translate-y-0.5 hover:border-p-cerulean/40 hover:shadow-md">
      <div className="flex items-center justify-between border-b border-p-line px-4 py-3">
        <span className="text-xs text-p-muted">{label}</span>
        {!na && points.length > 1 && (
          <div className="h-5 w-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points.map((v, i) => ({ i, v }))}>
                <Line dataKey="v" stroke="var(--p-cerulean)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-end px-4 pb-4 pt-5">
        <div className={`text-3xl font-light tracking-tight tabular-nums ${na ? "text-p-muted" : "text-p-text"}`}>{na ? "N/A" : fmt(value, kind)}</div>
        <div className="mt-2 flex items-center justify-between gap-2">
          {na ? (
            <span className="truncate text-[11px] text-p-muted">Not connected</span>
          ) : (
            <>
              <span className="truncate text-[11px] text-p-muted">{fmt(prev, kind)} last period</span>
              <Delta cur={value} prev={prev} invert={invert} />
            </>
          )}
        </div>
      </div>
    </div>
  );
  if (na) return <Link to="/pulse/settings">{body}</Link>;
  return to ? <Link to={to}>{body}</Link> : body;
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-p-line bg-p-soft/40 px-5 py-8 text-center">
      <div className="text-sm font-medium text-p-text">{title}</div>
      <p className="mx-auto mt-1 max-w-md text-xs text-p-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageTitle({ title, sub }: { title: string; sub?: string | undefined }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-medium tracking-tight text-p-text md:text-4xl">{title}</h1>
      {sub && <p className="mt-1 text-sm text-p-muted">{sub}</p>}
    </div>
  );
}

export const tooltipStyle = {
  contentStyle: {
    background: "var(--p-card)",
    border: "1px solid var(--p-line)",
    borderRadius: 12,
    fontSize: 12,
    color: "var(--p-text)",
  },
};

export function Loading() {
  return <div className="h-40 animate-pulse rounded-2xl bg-p-soft/60" />;
}

type ComparePoint = { d: string; cur: number | null; prior: number | null; priorDate: string };

/** Big chart: current period solid, the prior period as a lighter ghost behind it. */
export function CompareChart({
  data,
  label,
  kind = "int",
  height = 256,
}: {
  data: ComparePoint[];
  label: string;
  kind?: "int" | "pct" | "dec";
  height?: number;
}) {
  const hasPrior = data.some((p) => p.prior !== null);
  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-[11px] text-p-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-p-cerulean" />This period</span>
        {hasPrior && <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-p-cerulean/30" />Previous period</span>}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="pulseCur" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--p-cerulean)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--p-cerulean)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--p-line)" vertical={false} />
            <XAxis dataKey="d" tick={{ fontSize: 11, fill: "var(--p-muted)" }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: "var(--p-muted)" }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => fmt(v, kind)} domain={["auto", "auto"]} />
            <Tooltip
              {...tooltipStyle}
              formatter={(v: number, n: string) => [v === null ? "—" : fmt(v, kind), n === "prior" ? "Previous period" : label]}
              labelFormatter={(l, p) => {
                const pd = (p?.[0]?.payload as ComparePoint | undefined)?.priorDate;
                return pd ? `${l}  (vs ${pd})` : String(l);
              }}
            />
            {hasPrior && (
              <Area dataKey="prior" stroke="var(--p-cerulean)" strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="4 3" fill="var(--p-cerulean)" fillOpacity={0.06} dot={false} connectNulls />
            )}
            <Area dataKey="cur" stroke="var(--p-cerulean)" strokeWidth={2.25} fill="url(#pulseCur)" dot={false} connectNulls activeDot={{ r: 4, fill: "var(--p-sun)", stroke: "var(--p-card)", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Shown in place of a chart or table when no live account feeds it. */
export function SetupConnection({ label = "Set up connection" }: { label?: string }) {
  return (
    <div className="relative h-56 overflow-hidden rounded-xl">
      <div className="absolute inset-0 flex items-end gap-2 px-4 pb-4 opacity-[0.12]" aria-hidden>
        {[40, 55, 35, 70, 50, 80, 60, 75, 45, 90, 65, 85].map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-p-cerulean" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="relative flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-xs text-p-muted">No live data is being pulled for this yet.</p>
        <Link to="/pulse/settings" className="rounded-lg bg-p-cerulean px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          {label}
        </Link>
      </div>
    </div>
  );
}
