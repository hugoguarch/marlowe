import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { usePulse, type PulseClient } from "@/components/pulse/context";
import { Empty, PageTitle, Panel } from "@/components/pulse/ui";
import { supabase } from "@/integrations/supabase/client";
import { addGscSite, listGscSites, removeGscSite, resyncGsc } from "@/lib/pulse/gsc.functions";
import { channelLabel } from "@/lib/pulse/metrics";

export const Route = createFileRoute("/_authenticated/pulse/settings")({
  head: () => ({ meta: [{ title: "Settings / Data sources — Pulse" }, { name: "description", content: "Connections, clients and goals." }] }),
  component: Settings,
});

function Settings() {
  const { session, client, clientId } = usePulse();
  const admin = session?.role === "admin";
  return (
    <div className="space-y-6">
      <PageTitle title="Settings / Data sources" sub={`Your role: ${session?.role?.replace("_", " ") ?? "…"}`} />
      {client && clientId !== "all" && admin && <SearchConsole key={`gsc-${client.id}`} client={client} />}
      {client && clientId !== "all" ? <Connections client={client} /> : <Empty title="Choose a client" body="Connections are managed per client." />}
      {client && clientId !== "all" && admin && <ClientEditor key={client.id} client={client} />}
      {admin && <Clients />}
    </div>
  );
}

const PROVIDERS: { id: string; needs: string }[] = [
  { id: "search_console", needs: "" },
  { id: "website", needs: "Needs a Google sign-in app for Analytics" },
  { id: "gbp", needs: "Needs Google Business Profile API approval" },
  { id: "instagram", needs: "Needs a Meta developer app (Instagram + Facebook)" },
  { id: "facebook", needs: "Needs a Meta developer app (Instagram + Facebook)" },
  { id: "linkedin", needs: "Needs LinkedIn Community Management approval" },
  { id: "tiktok", needs: "Needs a TikTok for Business app" },
  { id: "youtube", needs: "Needs a Google sign-in app for YouTube" },
];

function Connections({ client }: { client: PulseClient }) {
  return (
    <Panel title={`Connected accounts — ${client.name}`} sub="Each client links its own account per channel." setup={false}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-p-muted">
            <tr><th className="py-2">Channel</th><th>Account</th><th>Status</th><th>Last sync</th><th /></tr>
          </thead>
          <tbody>
            {PROVIDERS.map((p) => {
              const cs = client.connections.filter((c) => c.provider === p.id);
              return (
                <tr key={p.id} className="border-t border-p-line align-top">
                  <td className="py-2.5">{channelLabel(p.id)}</td>
                  <td className="text-p-muted">{cs.length ? cs.map((c) => <div key={c.account_ref}>{c.account_ref}</div>) : "N/A"}</td>
                  <td>{cs.length ? cs.map((c) => <div key={c.account_ref} className={c.status === "error" ? "text-p-down" : "text-p-up"}>{c.status}</div>) : <span className="text-p-muted">not connected</span>}</td>
                  <td className="text-xs">{cs.length ? cs.map((c) => <div key={c.account_ref}>{c.last_sync_at ? new Date(c.last_sync_at).toLocaleString("en-GB") : "never"}</div>) : "—"}</td>
                  <td className="text-right">
                    {p.needs ? (
                      <button disabled className="rounded-lg border border-p-line px-3 py-1 text-xs text-p-muted" title={p.needs}>Connect account</button>
                    ) : (
                      <span className="text-[11px] text-p-muted">Managed above</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-p-muted">Data refreshes automatically every night. Greyed buttons switch on as each platform's developer app is approved; hover them to see what is needed.</p>
    </Panel>
  );
}

function ClientEditor({ client }: { client: PulseClient }) {
  const { refetchSession } = usePulse();
  const [name, setName] = useState(client.name);
  const [sector, setSector] = useState(client.sector ?? "");
  const [terms, setTerms] = useState((client.seed_terms ?? []).join(", "));
  const [goals, setGoals] = useState(
    Object.entries(client.goals).map(([k, v]) => `${k}=${v}`).join(", "),
  );
  async function save() {
    const g: Record<string, number> = {};
    for (const part of goals.split(",")) {
      const [k, v] = part.split("=").map((s) => s.trim());
      if (k && Number(v)) g[k] = Number(v);
    }
    const { error } = await supabase
      .from("pulse_clients")
      .update({ name, sector, seed_terms: terms.split(",").map((t) => t.trim()).filter(Boolean), goals: g })
      .eq("id", client.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Client saved");
    refetchSession();
  }
  const input = "h-9 w-full rounded-lg border border-p-line bg-p-bg px-3 text-sm text-p-text";
  return (
    <Panel title="Client settings">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-xs text-p-muted">Name<input className={input} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="text-xs text-p-muted">Sector<input className={input} value={sector} onChange={(e) => setSector(e.target.value)} /></label>
        <label className="text-xs text-p-muted">Seed terms (comma separated)<input className={input} value={terms} onChange={(e) => setTerms(e.target.value)} /></label>
        <label className="text-xs text-p-muted">Goals, e.g. instagram_followers=100000<input className={input} value={goals} onChange={(e) => setGoals(e.target.value)} /></label>
      </div>
      <button onClick={save} className="mt-4 rounded-lg bg-p-ink px-4 py-2 text-sm text-white">Save</button>
    </Panel>
  );
}

function Clients() {
  const { session, refetchSession } = usePulse();
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  async function add() {
    if (!name.trim()) return;
    const { error } = await supabase.from("pulse_clients").insert({ name: name.trim(), sector: sector.trim() || null });
    if (error) { toast.error(error.message); return; }
    setName(""); setSector("");
    toast.success("Client added");
    refetchSession();
  }
  async function toggle(c: PulseClient) {
    const { error } = await supabase.from("pulse_clients").update({ status: c.status === "archived" ? "active" : "archived" }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    refetchSession();
  }
  return (
    <Panel title="All clients">
      <div className="mb-4 flex flex-wrap gap-2">
        <input placeholder="Client name" value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-lg border border-p-line bg-p-bg px-3 text-sm" />
        <input placeholder="Sector" value={sector} onChange={(e) => setSector(e.target.value)} className="h-9 rounded-lg border border-p-line bg-p-bg px-3 text-sm" />
        <button onClick={add} className="h-9 rounded-lg bg-p-cerulean px-4 text-sm text-white">Add client</button>
      </div>
      <ul className="divide-y divide-p-line">
        {session?.clients.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2 text-sm">
            <span className={c.status === "archived" ? "text-p-muted line-through" : ""}>{c.name} <span className="text-[11px] text-p-muted">{c.sector}</span></span>
            <button onClick={() => toggle(c)} className="text-xs text-p-cerulean">{c.status === "archived" ? "Restore" : "Archive"}</button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function SearchConsole({ client }: { client: PulseClient }) {
  const { refetchSession } = usePulse();
  const list = useServerFn(listGscSites);
  const add = useServerFn(addGscSite);
  const remove = useServerFn(removeGscSite);
  const resync = useServerFn(resyncGsc);
  const sites = useQuery({ queryKey: ["pulse", "gscSites"], queryFn: () => list(), staleTime: 10 * 60_000 });
  const linked = client.connections.filter((c) => c.provider === "search_console");
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      setPick("");
      refetchSession();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally { setBusy(false); }
  }
  const available = (sites.data?.sites ?? []).filter((s) => !linked.some((l) => l.account_ref === s));
  return (
    <Panel title="Google Search Console" sub="Add every website this client owns. Refreshed automatically each night; 16 months kept for year-on-year." setup={false}>
      {linked.length > 0 && (
        <ul className="mb-4 divide-y divide-p-line rounded-xl border border-p-line">
          {linked.map((l) => (
            <li key={l.account_ref} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
              <span>{l.account_ref}</span>
              <span className="flex items-center gap-3 text-[11px] text-p-muted">
                {l.status === "error" ? <span className="text-p-down">last sync failed</span> : <>synced {l.last_sync_at ? new Date(l.last_sync_at).toLocaleString("en-GB") : "never"}</>}
                <button disabled={busy} onClick={() => run(() => remove({ data: { clientId: client.id, siteUrl: l.account_ref! } }), "Website removed")} className="text-p-down disabled:opacity-50">Remove</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {sites.isLoading ? <p className="text-sm text-p-muted">Loading your properties…</p> : sites.error ? (
        <Empty title="Could not list properties" body={sites.error.message} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select value={pick} onChange={(e) => setPick(e.target.value)} className="h-9 min-w-[16rem] rounded-lg border border-p-line bg-p-bg px-3 text-sm text-p-text">
            <option value="">{available.length ? "Add a website…" : "No more properties available"}</option>
            {available.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button disabled={!pick || busy} onClick={() => run(() => add({ data: { clientId: client.id, siteUrl: pick } }), "Website added and synced")} className="h-9 rounded-lg bg-p-cerulean px-4 text-sm text-white disabled:opacity-50">
            {busy ? "Working…" : "Add website"}
          </button>
          {linked.length > 0 && (
            <button disabled={busy} onClick={() => run(() => resync({ data: { clientId: client.id } }), "Search Console refreshed")} className="h-9 rounded-lg border border-p-line px-4 text-sm text-p-text disabled:opacity-50">Refresh now</button>
          )}
        </div>
      )}
    </Panel>
  );
}
