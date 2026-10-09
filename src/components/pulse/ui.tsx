import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";

import { change, fmt } from "@/lib/pulse/metrics";
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
  const sample = conns.some((c) => c.status === "sample");
  const failed = conns.filter((c) => c.status === "error" || (c.token_expires_at && new Date(c.token_expires_at) < new Date()));
  const last = conns.map((c) => c.last_sync_at).filter(Boolean).sort().pop();
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-p-muted">
      {sample && <SampleBadge />}
      <span>{sample ? "Sample adapter" : conns.map((c) => c.provider).join(", ")}</span>
      {last && <span>· synced {new Date(last).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span>}
      {failed.length > 0 && <span className="text-p-down">· token expired or sync failed</span>}
    </div>
  );
}

export function Panel({
  title,
  conns = [],
  action,
  children,
  className = "",
}: {
  title: string;
  conns?: Conn[];
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-p-line bg-p-card p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-p-text">{title}</h2>
          <SourceLine conns={conns} />
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Delta({ cur, prev, invert = false }: { cur: number; prev: number; invert?: boolean }) {
  const c = change(cur, prev);
  if (c === null) return <span className="text-[11px] text-p-muted">no prior data</span>;
  const good = invert ? c < 0 : c >= 0;
  return (
    <span className={`text-[11px] font-medium ${good ? "text-p-up" : "text-p-down"}`}>
      {c >= 0 ? "+" : ""}
      {(c * 100).toFixed(1)}% vs prior
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
}: {
  label: string;
  value: number;
  prev: number;
  kind?: "int" | "pct" | "dec";
  points?: number[];
  to?: "/pulse/social" | "/pulse/google-business" | "/pulse/website" | "/pulse/ai-search";
  invert?: boolean;
}) {
  const body = (
    <div className="h-full rounded-2xl border border-p-line bg-p-card p-4 transition-colors hover:border-p-cerulean/50">
      <div className="text-[11px] uppercase tracking-wider text-p-muted">{label}</div>
      <div className="mt-2 text-2xl font-light tracking-tight text-p-text">{fmt(value, kind)}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <Delta cur={value} prev={prev} invert={invert} />
        {points.length > 1 && (
          <div className="h-7 w-20">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points.map((v, i) => ({ i, v }))}>
                <Line dataKey="v" stroke="var(--p-cerulean)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
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

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-light tracking-tight text-p-text">{title}</h1>
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
