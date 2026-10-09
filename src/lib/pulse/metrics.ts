/** Pure helpers that turn metrics_daily rows into KPIs. Browser-safe. */
import type { SeriesRow } from "./pulse.functions";

export const SOCIAL = ["instagram", "facebook", "linkedin", "tiktok", "youtube"] as const;
export const CHANNELS = [
  { id: "all", label: "All channels" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "gbp", label: "Google Business" },
  { id: "website", label: "Website (GA4)" },
  { id: "search_console", label: "Search Console" },
  { id: "ai_search", label: "AI Search" },
] as const;
export const channelLabel = (id: string) => CHANNELS.find((c) => c.id === id)?.label ?? id;
export const CHANNEL_COLORS: Record<string, string> = {
  instagram: "var(--p-cerulean)",
  facebook: "#5aa9c4",
  linkedin: "var(--p-sun)",
  tiktok: "#7d8f97",
  youtube: "#b4412f",
};

export type RangeId = "7d" | "28d" | "90d" | "12m" | "custom";
export type Range = { id: RangeId; from: string; to: string; priorFrom: string; bucket: "day" | "week" };

const iso = (d: Date) => d.toISOString().slice(0, 10);
export function makeRange(id: RangeId, custom?: { from: string; to: string }): Range {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  let start = new Date(end);
  if (id === "custom" && custom) {
    start = new Date(custom.from);
    end.setTime(new Date(custom.to).getTime());
  } else {
    const days = id === "7d" ? 7 : id === "28d" ? 28 : id === "90d" ? 90 : 365;
    start.setDate(end.getDate() - days + 1);
  }
  const len = Math.round((end.getTime() - start.getTime()) / 864e5) + 1;
  const prior = new Date(start);
  prior.setDate(prior.getDate() - len);
  return { id, from: iso(start), to: iso(end), priorFrom: iso(prior), bucket: len > 120 ? "week" : "day" };
}

export function split(rows: SeriesRow[], from: string) {
  return { cur: rows.filter((r) => r.b >= from), prev: rows.filter((r) => r.b < from) };
}

const inCh = (r: SeriesRow, chs: readonly string[]) => chs.includes(r.ch);
export const sum = (rows: SeriesRow[], m: string, chs: readonly string[]) =>
  rows.filter((r) => r.m === m && inCh(r, chs)).reduce((a, r) => a + r.v, 0);

export function avg(rows: SeriesRow[], m: string, chs: readonly string[]) {
  const f = rows.filter((r) => r.m === m && inCh(r, chs));
  return f.length ? f.reduce((a, r) => a + r.v, 0) / f.length : 0;
}

/** Followers: latest value per channel, summed. */
export function latest(rows: SeriesRow[], m: string, chs: readonly string[], pick: "last" | "first" = "last") {
  let total = 0;
  for (const ch of chs) {
    const f = rows.filter((r) => r.m === m && r.ch === ch).sort((a, b) => a.b.localeCompare(b.b));
    if (f.length) total += pick === "last" ? f[f.length - 1]!.v : f[0]!.v;
  }
  return total;
}

export function buckets(rows: SeriesRow[]) {
  return [...new Set(rows.map((r) => r.b))].sort();
}

export function spark(rows: SeriesRow[], m: string, chs: readonly string[], mode: "sum" | "latest" = "sum") {
  return buckets(rows).map((b) => {
    const f = rows.filter((r) => r.b === b && r.m === m && inCh(r, chs));
    return f.reduce((a, r) => a + r.v, 0) * (mode === "latest" ? 1 : 1);
  });
}

export const change = (cur: number, prev: number) => (prev ? (cur - prev) / Math.abs(prev) : null);

export function fmt(n: number, kind: "int" | "pct" | "dec" = "int") {
  if (kind === "pct") return `${(n * 100).toFixed(1)}%`;
  if (kind === "dec") return n.toFixed(1);
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}m`;
  if (Math.abs(n) >= 1e4) return `${(n / 1e3).toFixed(1)}k`;
  return Math.round(n).toLocaleString("en-GB");
}

export function scopeChannels(channel: string, connected: string[], group: readonly string[]) {
  const avail = group.filter((c) => connected.includes(c));
  return channel === "all" ? avail : avail.filter((c) => c === channel);
}
