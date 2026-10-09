import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { usePulse, type PulseClient } from "@/components/pulse/context";
import { Empty, PageTitle, Panel, SampleBadge } from "@/components/pulse/ui";
import { supabase } from "@/integrations/supabase/client";
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
      {client && clientId !== "all" ? <Connections client={client} /> : <Empty title="Choose a client" body="Connections are managed per client." />}
      {client && clientId !== "all" && admin && <ClientEditor key={client.id} client={client} />}
      {admin && <Clients />}
    </div>
  );
}

function Connections({ client }: { client: PulseClient }) {
  return (
    <Panel title={`Connections — ${client.name}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-p-muted">
            <tr><th className="py-2">Source</th><th>Account</th><th>Status</th><th>Last sync</th><th>Token expiry</th><th /></tr>
          </thead>
          <tbody>
            {client.connections.map((c) => (
              <tr key={c.provider} className="border-t border-p-line">
                <td className="py-2.5">{channelLabel(c.provider)}</td>
                <td className="text-p-muted">{c.account_ref}</td>
                <td>{c.status === "sample" ? <SampleBadge /> : c.status}</td>
                <td className="text-xs">{c.last_sync_at ? new Date(c.last_sync_at).toLocaleString("en-GB") : "never"}</td>
                <td className="text-xs">{c.token_expires_at ? c.token_expires_at.slice(0, 10) : "—"}</td>
                <td className="text-right">
                  <button disabled className="rounded-lg border border-p-line px-3 py-1 text-xs text-p-muted" title="Live OAuth arrives in stages 2 and 5">
                    Connect live account
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-p-muted">Live OAuth for Google (GA4, Search Console, Business Profile) lands in stage 2; Meta, LinkedIn, TikTok and YouTube as each API approval lands.</p>
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
    if (error) return toast.error(error.message);
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
    if (error) return toast.error(error.message);
    setName(""); setSector("");
    toast.success("Client added");
    refetchSession();
  }
  async function toggle(c: PulseClient) {
    const { error } = await supabase.from("pulse_clients").update({ status: c.status === "archived" ? "active" : "archived" }).eq("id", c.id);
    if (error) return toast.error(error.message);
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
