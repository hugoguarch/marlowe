import { useRouterState } from "@tanstack/react-router";
import { Bell, Calendar, ChevronRight, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { usePulse } from "@/components/pulse/context";
import type { RangeId } from "@/lib/pulse/metrics";
import { crumbs } from "./nav";
import { btnPrimary } from "./ui";

const RANGES: { id: RangeId; label: string }[] = [
  { id: "7d", label: "Last 7 days" },
  { id: "28d", label: "Last 28 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "12m", label: "Last 12 months" },
  { id: "custom", label: "Custom" },
];

export function Topbar({ onNewTask }: { onNewTask: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [dept, page] = crumbs(path);
  return (
    <header className="sticky top-0 z-30 flex h-[60px] shrink-0 items-center gap-4 border-b border-app-line bg-app-card px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2 text-[13.5px]">
        <span className="text-ink-navy/55">{dept}</span>
        {page ? (
          <>
            <ChevronRight size={14} className="shrink-0 text-ink-navy/35" />
            <span className="truncate font-medium">{page}</span>
          </>
        ) : null}
      </div>
      <div className="ml-auto flex items-center gap-2.5">
        <DateRange />
        <Notifications />
        <button onClick={onNewTask} className={btnPrimary}>
          <Plus size={15} strokeWidth={1.75} /> New Task
        </button>
      </div>
    </header>
  );
}

function DateRange() {
  const { range, setRange } = usePulse();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState({ from: range.from, to: range.to });
  const ref = useOutside(() => setOpen(false));
  const label = range.id === "custom" ? `${range.from} – ${range.to}` : RANGES.find((r) => r.id === range.id)?.label;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex h-9 items-center gap-2 rounded-[6px] border border-app-line px-3 text-[13px]">
        <Calendar size={15} strokeWidth={1.75} className="text-ink-navy/55" />
        {label}
      </button>
      {open ? (
        <div className="wm-fade absolute top-full right-0 z-50 mt-1.5 w-60 rounded-[8px] border border-app-line bg-app-card p-1.5 shadow-[0_24px_60px_rgba(0,28,38,0.18)]">
          {RANGES.filter((r) => r.id !== "custom").map((r) => (
            <button key={r.id} onClick={() => { setRange(r.id); setOpen(false); }} className={`block w-full rounded-[6px] px-3 py-2 text-left text-[13px] ${range.id === r.id ? "bg-app-bg font-medium" : "hover:bg-app-bg"}`}>
              {r.label}
            </button>
          ))}
          <div className="mt-1 space-y-1.5 border-t border-app-line p-2">
            <p className="kicker text-ink-navy/45">Custom</p>
            <input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="h-8 w-full rounded-[6px] border border-app-line px-2 text-[13px]" />
            <input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="h-8 w-full rounded-[6px] border border-app-line px-2 text-[13px]" />
            <button onClick={() => { setRange("custom", custom); setOpen(false); }} className="h-8 w-full rounded-[6px] bg-ink-navy text-[13px] text-white">Apply</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Notifications() {
  const { client } = usePulse();
  const [open, setOpen] = useState(false);
  const ref = useOutside(() => setOpen(false));
  // Sync failures are the only real alerts today; the rest of the alert engine is still to come.
  const issues = (client?.connections ?? []).filter((c) => c.status === "error" || c.last_error);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-label="Notifications" className="relative flex h-9 w-9 items-center justify-center rounded-[6px] border border-app-line">
        <Bell size={16} strokeWidth={1.75} />
        {issues.length ? <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-gold" /> : null}
      </button>
      {open ? (
        <div className="wm-fade absolute top-full right-0 z-50 mt-1.5 w-72 rounded-[8px] border border-app-line bg-app-card p-3 shadow-[0_24px_60px_rgba(0,28,38,0.18)]">
          <p className="kicker text-ink-navy/45">Notifications</p>
          {issues.length ? (
            <ul className="mt-2 space-y-2">
              {issues.map((c) => (
                <li key={`${c.provider}${c.account_ref}`} className="text-[13px]">
                  <span className="font-medium">{c.provider}</span> sync needs attention
                  <span className="block text-[12px] text-ink-navy/55">{c.last_error}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] text-ink-navy/55">You're all caught up.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function useOutside(fn: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && fn();
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  });
  return ref;
}
