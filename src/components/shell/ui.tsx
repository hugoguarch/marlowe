import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import yMark from "@/assets/wm-y-icon-white.svg.asset.json";

/** Signature faded Y monogram bleeding off the right edge of dark panels. */
export function FadedMark({ size = 420, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={yMark.url}
      alt=""
      aria-hidden
      style={{ width: size }}
      className={`pointer-events-none absolute -right-[18%] -bottom-[12%] opacity-[0.05] select-none ${className}`}
    />
  );
}

export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`kicker text-current/50 ${className}`}>{children}</p>;
}

export function WmCard({
  children,
  className = "",
  dark = false,
}: {
  children: ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-[8px] border ${
        dark
          ? "border-hair-dark bg-ink-navy text-white"
          : "border-app-line bg-app-card text-ink-navy shadow-[0_1px_2px_rgba(0,28,38,0.08)]"
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHead({ title, meta, action }: { title: ReactNode; meta?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-app-line px-5 py-4">
      <span className="text-[15px] font-medium">{title}</span>
      {meta ? <span className="text-[12.5px] text-ink-navy/55">{meta}</span> : null}
      {action ? <span className="ml-auto">{action}</span> : null}
    </div>
  );
}

export function Title({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-6">
      <div className="min-w-0">
        <h1 className="text-[32px] leading-tight font-light tracking-[-0.02em]">{title}</h1>
        {sub ? <p className="mt-1.5 text-[14.5px] text-ink-navy/60">{sub}</p> : null}
      </div>
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  );
}

/** Segmented control (pill group on muted fill). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex gap-0.5 rounded-[7px] bg-wm-grey-2 p-[3px] text-[13px]">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-[5px] px-3 py-1.5 transition-colors duration-150 ${
            value === o.id ? "bg-app-card font-medium shadow-[0_1px_2px_rgba(0,28,38,0.08)]" : "text-ink-navy/65 hover:text-ink-navy"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Route-backed tab row for page headers. */
export function RouteTabs({ tabs }: { tabs: { label: string; to: string; exact?: boolean }[] }) {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-app-line">
      {tabs.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          activeOptions={{ exact: !!t.exact }}
          className="-mb-px border-b-2 border-transparent px-3 py-2.5 text-[13.5px] text-ink-navy/60 transition-colors duration-150 hover:text-ink-navy"
          activeProps={{ className: "!border-cerulean !text-ink-navy font-medium" }}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[6px] bg-wm-grey-2 ${className}`} />;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {body ? <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-navy/55">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Spark({ points, w = 78, h = 30 }: { points: number[]; w?: number; h?: number }) {
  if (points.length < 2) return <svg width={w} height={h} />;
  const max = Math.max(...points), min = Math.min(...points), r = max - min || 1;
  const p = points.map((v, i) => `${2 + (i / (points.length - 1)) * (w - 4)},${h - 3 - ((v - min) / r) * (h - 6)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={p} fill="none" stroke="var(--cerulean)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export const btnPrimary =
  "inline-flex items-center gap-2 rounded-[6px] bg-cerulean px-4 py-2 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-cerulean-hover disabled:opacity-50";
export const btnDark =
  "inline-flex items-center gap-2 rounded-[6px] bg-ink-navy px-4 py-2 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-wm-teal disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center gap-2 rounded-[6px] border border-app-line bg-app-card px-3.5 py-2 text-[13px] text-ink-navy transition-colors duration-150 hover:border-cerulean/50";

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "green" | "cerulean" | "ink" }) {
  const c = {
    muted: "bg-wm-grey-2 text-ink-navy/70",
    green: "bg-brand-green/10 text-brand-green",
    cerulean: "bg-cerulean/10 text-cerulean",
    ink: "bg-ink-navy text-white",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${c}`}>{children}</span>;
}

/** Placeholder screen body for designs whose data source is not wired yet. */
export function MockNote() {
  return <Badge>Preview — not connected yet</Badge>;
}
