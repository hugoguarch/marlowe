import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";

import { usePulse } from "@/components/pulse/context";
import { Empty, Loading, PageTitle, Panel } from "@/components/pulse/ui";
import { generateReport, listReports } from "@/lib/pulse/report.functions";
import { ReportEditor } from "@/components/pulse/ReportEditor";

export const Route = createFileRoute("/_authenticated/_shell/marketing/analytics/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Pulse" },
      { name: "description", content: "Generate Why Media digital marketing reports from live Pulse data." },
      { property: "og:title", content: "Reports — Pulse" },
      { property: "og:description", content: "Generate Why Media digital marketing reports from live Pulse data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Preset = { id: string; label: string; from: string; to: string; period: string; next: string };
function presets(): Preset[] {
  const now = new Date();
  const out: Preset[] = [];
  for (let i = 1; i <= 3; i++) {
    const s = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const e = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 0));
    const n = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 1));
    out.push({ id: `m${i}`, label: `${MONTHS[s.getUTCMonth()]} ${s.getUTCFullYear()}`, from: iso(s), to: iso(e), period: `${MONTHS[s.getUTCMonth()]} ${s.getUTCFullYear()}`, next: (MONTHS[n.getUTCMonth()] ?? "Next month") });
  }
  const q = Math.floor(now.getUTCMonth() / 3);
  for (let i = 1; i <= 2; i++) {
    const qs = new Date(Date.UTC(now.getUTCFullYear(), (q - i) * 3, 1));
    const qe = new Date(Date.UTC(qs.getUTCFullYear(), qs.getUTCMonth() + 3, 0));
    const qn = Math.floor(qs.getUTCMonth() / 3) + 1;
    out.push({ id: `q${i}`, label: `Q${qn} ${qs.getUTCFullYear()}`, from: iso(qs), to: iso(qe), period: `Q${qn} ${qs.getUTCFullYear()}`, next: `Q${(qn % 4) + 1}` });
  }
  return out;
}

const input = "w-full rounded-lg border border-p-line bg-p-bg px-3 py-2 text-sm text-p-text outline-none focus:border-p-cerulean";
const btn = "rounded-lg border border-p-line px-3 py-2 text-sm text-p-text hover:border-p-cerulean disabled:opacity-50";
const primary = "rounded-lg bg-p-cerulean px-4 py-2 text-sm font-medium text-white disabled:opacity-50";

function ReportsPage() {
  const { client, clientId, session } = usePulse();
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useServerFn(listReports);
  const reports = useQuery({ queryKey: ["pulse", "reports", clientId], queryFn: () => list({ data: { clientId } }), enabled: !!clientId && clientId !== "all" });
  const canWrite = session?.role === "admin" || session?.role === "account_manager";

  useEffect(() => { setOpenId(null); }, [clientId]);

  if (clientId === "all" || !client) return (
    <div className="space-y-6"><PageTitle title="Reports" sub="All clients" /><Empty title="Pick a client" body="Choose a client in the top-left switcher to create or view their reports." /></div>
  );

  return (
    <div className="space-y-6">
      <PageTitle title="Reports" sub={client.name} />
      {openId ? <ReportEditor id={openId} canWrite={canWrite} onClose={() => { setOpenId(null); reports.refetch(); }} /> : (
        <>
          {canWrite && <Generate clientId={clientId} onDone={(id) => { reports.refetch(); setOpenId(id); }} />}
          <Panel title="Report archive" sub="Every report generated for this client.">
            {!reports.data ? <Loading /> : !reports.data.length ? <Empty title="No reports yet" body="Generate the first one above." /> : (
              <ul className="divide-y divide-p-line">
                {reports.data.map((r: any) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <div className="text-sm font-medium text-p-text">{r.period_label}</div>
                      <div className="text-xs text-p-muted">{r.period_from} to {r.period_to} · updated {new Date(r.updated_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${r.status === "approved" ? "bg-p-cerulean/10 text-p-cerulean" : "bg-p-sun/20 text-p-text"}`}>{r.status === "approved" ? "Approved" : "Draft"}</span>
                      <button className={btn} onClick={() => setOpenId(r.id)}>Open</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function Generate({ clientId, onDone }: { clientId: string; onDone: (id: string) => void }) {
  const opts = useMemo(presets, []);
  const [sel, setSel] = useState(opts[0]?.id ?? "custom");
  const [custom, setCustom] = useState({ from: "", to: "", period: "", next: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const gen = useServerFn(generateReport);
  const p = sel === "custom" ? { ...custom } : (opts.find((o) => o.id === sel) ?? custom);
  const ready = p.from && p.to && p.period && p.next;
  return (
    <Panel title="New report" sub="Fills the Why Media Digital Marketing Report with this client's data. The summary is written from the numbers and you can edit everything before approving.">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs text-p-muted">Period
          <select className={input} value={sel} onChange={(e) => setSel(e.target.value)}>
            {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            <option value="custom">Custom…</option>
          </select>
        </label>
        {sel === "custom" && (
          <>
            <label className="space-y-1 text-xs text-p-muted">From<input type="date" className={input} value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></label>
            <label className="space-y-1 text-xs text-p-muted">To<input type="date" className={input} value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></label>
            <label className="space-y-1 text-xs text-p-muted">Period name<input className={input} placeholder="e.g. Summer 2026" value={custom.period} onChange={(e) => setCustom({ ...custom, period: e.target.value })} /></label>
            <label className="space-y-1 text-xs text-p-muted">Next period<input className={input} placeholder="e.g. Autumn" value={custom.next} onChange={(e) => setCustom({ ...custom, next: e.target.value })} /></label>
          </>
        )}
        <button className={primary} disabled={!ready || busy} onClick={async () => {
          setBusy(true); setErr(null);
          try {
            const r = await gen({ data: { clientId, from: p.from, to: p.to, period: p.period, nextPeriod: p.next } });
            if (r.aiError) setErr(`The numbers are in, but the summary couldn't be written automatically (${r.aiError}). You can write it in the editor.`);
            onDone(r.id);
          } catch (e) { setErr(e instanceof Error ? e.message : "Couldn't generate the report"); }
          setBusy(false);
        }}>{busy ? "Generating… (up to a minute)" : "Generate report"}</button>
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
    </Panel>
  );
}

