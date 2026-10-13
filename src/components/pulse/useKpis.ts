/** Headline KPIs shared by Dashboard and Analytics so numbers match everywhere. */
import { usePulseData } from "./context";
import { compareSeries, SOCIAL, spark, split, sum } from "@/lib/pulse/metrics";
import { usePulse } from "./context";

export type HeadKpi = {
  id: "leads" | "sessions" | "cpl" | "engagement" | "reach" | "spend";
  label: string;
  value: number | null;
  prev: number | null;
  kind: "int" | "pct" | "gbp";
  points: number[];
  invert?: boolean;
};

export function useKpis() {
  const { range } = usePulse();
  const q = usePulseData();
  const rows = q.data?.series ?? [];
  const { cur, prev } = split(rows, range.from);
  const has = (ch: readonly string[]) => rows.some((r) => ch.includes(r.ch));
  const soc = [...SOCIAL];
  const ratio = (a: number, b: number) => (b ? a / b : null);
  const leads = sum(cur, "conversions", ["website"]), leadsP = sum(prev, "conversions", ["website"]);
  const spend = sum(cur, "spend", ["meta_ads"]), spendP = sum(prev, "spend", ["meta_ads"]);
  const reach = sum(cur, "reach", soc), reachP = sum(prev, "reach", soc);
  const eng = sum(cur, "engagements", soc), engP = sum(prev, "engagements", soc);

  const kpis: HeadKpi[] = [
    { id: "leads", label: "Leads", value: has(["website"]) ? leads : null, prev: leadsP, kind: "int", points: spark(cur, "conversions", ["website"]) },
    { id: "sessions", label: "Website sessions", value: has(["website"]) ? sum(cur, "sessions", ["website"]) : null, prev: sum(prev, "sessions", ["website"]), kind: "int", points: spark(cur, "sessions", ["website"]) },
    { id: "cpl", label: "Cost per lead", value: has(["meta_ads"]) && has(["website"]) ? ratio(spend, leads) : null, prev: ratio(spendP, leadsP), kind: "gbp", points: [], invert: true },
    { id: "engagement", label: "Engagement rate", value: has(soc) ? ratio(eng, reach) : null, prev: ratio(engP, reachP), kind: "pct", points: spark(cur, "engagements", soc) },
    { id: "reach", label: "Total reach", value: has(soc) ? reach : null, prev: reachP, kind: "int", points: spark(cur, "reach", soc) },
    { id: "spend", label: "Ad spend", value: has(["meta_ads"]) ? spend : null, prev: spendP, kind: "gbp", points: spark(cur, "spend", ["meta_ads"]) },
  ];

  const trend = (id: HeadKpi["id"]) => {
    const map = { leads: ["conversions", ["website"]], sessions: ["sessions", ["website"]], engagement: ["engagements", soc], reach: ["reach", soc], spend: ["spend", ["meta_ads"]], cpl: ["spend", ["meta_ads"]] } as const;
    const [m, ch] = map[id];
    return compareSeries(cur, prev, m, ch);
  };

  return { q, cur, prev, kpis, trend };
}

export function fmtKpi(v: number | null, kind: HeadKpi["kind"]) {
  if (v === null || !Number.isFinite(v)) return "N/A";
  if (kind === "pct") return `${(v * 100).toFixed(1)}%`;
  if (kind === "gbp") return v >= 10000 ? `£${(v / 1000).toFixed(1)}k` : `£${v.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e4) return `${(v / 1e3).toFixed(1)}k`;
  return Math.round(v).toLocaleString("en-GB");
}

export function deltaText(v: number | null, p: number | null, kind: HeadKpi["kind"]) {
  if (v === null || p === null || !p) return null;
  if (kind === "pct") {
    const d = (v - p) * 100;
    return `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(1)} pts`;
  }
  const d = ((v - p) / Math.abs(p)) * 100;
  return `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(1)}%`;
}
