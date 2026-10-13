import type { LucideIcon } from "lucide-react";

import { deltaText, fmtKpi, type HeadKpi } from "@/components/pulse/useKpis";
import { Skeleton, Spark, WmCard } from "./ui";

export function KpiCard({ k, icon: Icon, sub, loading }: { k: HeadKpi; icon?: LucideIcon; sub?: string; loading?: boolean }) {
  const d = deltaText(k.value, k.prev, k.kind);
  const good = d ? (d.startsWith("+") !== !!k.invert) : true;
  return (
    <WmCard className="flex flex-col gap-3.5 p-5">
      <div className="flex items-center gap-2 text-[13px] text-ink-navy/60">
        {Icon ? <Icon size={15} strokeWidth={1.75} /> : null}
        {k.label}
      </div>
      {loading ? (
        <Skeleton className="h-9 w-32" />
      ) : (
        <div className="flex items-end gap-2.5">
          <span className="text-[34px] leading-none font-light tracking-[-0.02em]">{fmtKpi(k.value, k.kind)}</span>
          {d ? (
            <span className={`mb-0.5 rounded-full px-1.5 py-0.5 text-[11.5px] font-medium ${good ? "bg-brand-green/10 text-brand-green" : "bg-wm-grey-2 text-ink-navy/70"}`}>{d}</span>
          ) : null}
          <span className="ml-auto"><Spark points={k.points} /></span>
        </div>
      )}
      <p className="text-[12px] text-ink-navy/55">{k.value === null ? "Connect a channel to see this" : (sub ?? "vs previous period")}</p>
    </WmCard>
  );
}
