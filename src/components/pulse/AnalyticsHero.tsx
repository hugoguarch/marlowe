import { useState } from "react";

import { CompareChart } from "./ui";
import { deltaText, fmtKpi, useKpis, type HeadKpi } from "./useKpis";
import { usePulse } from "./context";
import { Skeleton, WmCard } from "@/components/shell/ui";

/** Overview header from the Analytics design: KPI tabs over a trend vs previous period. */
export function AnalyticsHero() {
  const { clientId } = usePulse();
  const { kpis, trend, q } = useKpis();
  const tabs = kpis.filter((k) => ["leads", "sessions", "cpl", "engagement"].includes(k.id));
  const [sel, setSel] = useState<HeadKpi["id"]>("leads");
  if (clientId === "all") return null;
  const k = tabs.find((t) => t.id === sel)!;
  return (
    <WmCard className="mb-6">
      <div className="grid grid-cols-2 border-b border-app-line lg:grid-cols-4">
        {tabs.map((t) => {
          const d = deltaText(t.value, t.prev, t.kind);
          return (
            <button key={t.id} onClick={() => setSel(t.id)} className={`border-t-2 px-5 py-4 text-left transition-colors duration-150 ${sel === t.id ? "border-cerulean bg-app-card" : "border-transparent bg-app-bg/50 hover:bg-app-card"}`}>
              <p className="text-[13px] text-ink-navy/60">{t.label}</p>
              {q.isLoading ? <Skeleton className="mt-2 h-8 w-24" /> : (
                <p className="mt-1.5 flex items-end gap-2">
                  <span className="text-[28px] leading-none font-light tracking-[-0.02em]">{fmtKpi(t.value, t.kind)}</span>
                  {d ? <span className="text-[12px] text-ink-navy/55">{d}</span> : null}
                </p>
              )}
            </button>
          );
        })}
      </div>
      <div className="p-5">
        {k.value === null ? (
          <p className="py-10 text-center text-[13px] text-ink-navy/55">Connect the source for {k.label.toLowerCase()} in Settings to see its trend.</p>
        ) : (
          <CompareChart data={trend(k.id)} label={k.label} kind={k.kind === "pct" ? "int" : "int"} height={220} />
        )}
      </div>
    </WmCard>
  );
}
