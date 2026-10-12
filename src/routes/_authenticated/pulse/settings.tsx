import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { usePulse, type PulseClient } from "@/components/pulse/context";
import { Empty, PageTitle, Panel, SearchSelect } from "@/components/pulse/ui";
import { supabase } from "@/integrations/supabase/client";
import { addGscSite, listGscSites, removeGscSite, resyncGsc, resyncGscSite } from "@/lib/pulse/gsc.functions";
import { addGoogleConnection, googleAssets, googleConnectUrl, removeGoogleConnection, resyncGoogle } from "@/lib/pulse/google.functions";
import { metaDiscover, saveMetaConnection, syncMetaNow } from "@/lib/pulse/meta.functions";
import { channelLabel, fmt } from "@/lib/pulse/metrics";

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
      {client && clientId !== "all" && admin && <GoogleConnections key={`g-${client.id}`} client={client} />}
      {client && clientId !== "all" && admin && <MetaConnections key={`meta-${client.id}`} client={client} />}
      {client && clientId !== "all" && admin && <ClientEditor key={client.id} client={client} />}
      {admin && <Clients />}
    </div>
  );
}

const PROVIDERS: { id: string; needs: string }[] = [
  { id: "search_console", needs: "" },
  { id: "website", needs: "Needs a Google sign-in app for Analytics" },
  { id: "gbp", needs: "" },
  { id: "instagram", needs: "" },
  { id: "facebook", needs: "" },
  { id: "meta_ads", needs: "" },
  { id: "linkedin", needs: "Needs LinkedIn Community Management approval" },
  { id: "tiktok", needs: "Needs a TikTok for Business app" },
  { id: "youtube", needs: "" },
];

const STALE_MS = 36 * 3600_000;
type Conn = PulseClient["connections"][number];

function health(c: Conn) {
  if (c.status === "error") return { label: "Needs attention", cls: "text-p-down" };
  if (!c.last_sync_at) return { label: "Never synced", cls: "text-p-down" };
  if (Date.now() - new Date(c.last_sync_at).getTime() > STALE_MS) return { label: "Stale", cls: "text-p-sun" };
  return { label: "Healthy", cls: "text-p-up" };
}

function Connections({ client }: { client: PulseClient }) {
  const { session, refetchSession } = usePulse();
  const admin = session?.role === "admin";
  const resync = useServerFn(resyncGscSite);
  const remove = useServerFn(removeGscSite);
  const gResync = useServerFn(resyncGoogle);
  const gRemove = useServerFn(removeGoogleConnection);
  const [busy, setBusy] = useState<string | null>(null);
  async function run(id: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(id);
    try { await fn(); toast.success(ok); } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(null); refetchSession(); }
  }
  const meta = client.meta;
  const metaRow = (provider: string) =>
    provider === "facebook" ? (meta?.fb_page_id ? meta.fb_page_name ?? meta.fb_page_id : null)
    : provider === "instagram" ? (meta?.ig_user_id ? `@${meta.ig_username ?? meta.ig_user_id}` : null)
    : provider === "meta_ads" ? (meta?.ad_account_ids?.length ? meta.ad_account_ids.join(", ") : null) : null;
  return (
    <Panel title={`Connected accounts — ${client.name}`} sub="Status, last sync and errors for every source this client uses." setup={false}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-p-muted">
            <tr><th className="py-2">Channel</th><th>Account</th><th>Status</th><th>Last sync</th><th /></tr>
          </thead>
          <tbody>
            {PROVIDERS.map((p) => {
              const cs = client.connections.filter((c) => c.provider === p.id);
              const m = metaRow(p.id);
              if (m !== null || p.id === "facebook" || p.id === "instagram" || p.id === "meta_ads") {
                return (
                  <tr key={p.id} className="border-t border-p-line align-top">
                    <td className="py-2.5">{p.id === "meta_ads" ? "Meta Ads" : channelLabel(p.id)}</td>
                    <td className="text-p-muted">{m ?? "N/A"}</td>
                    <td>{m ? <span className="text-p-up">Linked · live from Meta</span> : <span className="text-p-muted">not connected</span>}</td>
                    <td className="text-xs">{m ? "on view (cached 1h)" : "—"}</td>
                    <td className="text-right text-[11px] text-p-muted">Managed in Meta below</td>
                  </tr>
                );
              }
              if (!cs.length) {
                return (
                  <tr key={p.id} className="border-t border-p-line align-top">
                    <td className="py-2.5">{channelLabel(p.id)}</td>
                    <td className="text-p-muted">N/A</td>
                    <td className="text-p-muted">not connected</td>
                    <td className="text-xs">—</td>
                    <td className="text-right">
                      {p.needs ? <button disabled className="rounded-lg border border-p-line px-3 py-1 text-xs text-p-muted" title={p.needs}>Connect account</button> : <span className="text-[11px] text-p-muted">{p.id === "search_console" ? "Add a website above" : "Connect in Google below"}</span>}
                    </td>
                  </tr>
                );
              }
              return cs.map((c, i) => {
                const h = health(c);
                const id = `${p.id}:${c.account_ref}`;
                return (
                  <tr key={id} className="border-t border-p-line align-top">
                    <td className="py-2.5">{i === 0 ? channelLabel(p.id) : ""}</td>
                    <td className="text-p-muted">{c.account_name ?? c.account_ref}</td>
                    <td>
                      <div className={h.cls}>{h.label}</div>
                      {c.last_error && <div className="max-w-xs text-[11px] text-p-down">{c.last_error}</div>}
                    </td>
                    <td className="text-xs">
                      <div>{c.last_sync_at ? new Date(c.last_sync_at).toLocaleString("en-GB") : "never"}</div>
                      {c.last_attempt_at && c.last_attempt_at !== c.last_sync_at && <div className="text-[11px] text-p-muted">last tried {new Date(c.last_attempt_at).toLocaleString("en-GB")}</div>}
                    </td>
                    <td className="whitespace-nowrap text-right">
                      {admin && (p.id === "youtube" || p.id === "gbp") && (
                        <span className="flex justify-end gap-3 text-xs">
                          <button disabled={!!busy} onClick={() => run(id, () => gResync({ data: { clientId: client.id, provider: p.id as "youtube", ref: c.account_ref! } }), "Synced")} className="text-p-cerulean disabled:opacity-50">{busy === id ? "Working…" : "Sync now"}</button>
                          <button disabled={!!busy} onClick={() => { if (confirm(`Disconnect ${c.account_name ?? c.account_ref}?`)) void run(id, () => gRemove({ data: { clientId: client.id, provider: p.id as "youtube", ref: c.account_ref! } }), "Disconnected"); }} className="text-p-down disabled:opacity-50">Disconnect</button>
                        </span>
                      )}
                      {admin && p.id === "search_console" && (
                        <span className="flex justify-end gap-3 text-xs">
                          <button disabled={!!busy} onClick={() => run(id, () => resync({ data: { clientId: client.id, siteUrl: c.account_ref! } }), "Reconnected and synced")} className="text-p-cerulean disabled:opacity-50">{busy === id ? "Working…" : "Reconnect"}</button>
                          <button disabled={!!busy} onClick={() => { if (confirm(`Disconnect ${c.account_ref}? Its stored data will be removed.`)) void run(id, () => remove({ data: { clientId: client.id, siteUrl: c.account_ref! } }), "Disconnected"); }} className="text-p-down disabled:opacity-50">Disconnect</button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-p-muted">Data refreshes automatically every night. "Stale" means no successful sync in the last 36 hours. Greyed buttons switch on as each platform's developer app is approved.</p>
    </Panel>
  );
}

function MetaConnections({ client }: { client: PulseClient }) {
  const { refetchSession } = usePulse();
  const discover = useServerFn(metaDiscover);
  const save = useServerFn(saveMetaConnection);
  const syncNow = useServerFn(syncMetaNow);
  const assets = useQuery({ queryKey: ["pulse", "metaAssets"], queryFn: () => discover(), staleTime: 10 * 60_000 });
  const cur = client.meta;
  const [page, setPage] = useState(cur?.fb_page_id ?? "");
  const [ig, setIg] = useState(cur?.ig_user_id ?? "");
  const [adIds, setAdIds] = useState<string[]>(cur?.ad_account_ids ?? []);
  const [busy, setBusy] = useState(false);
  const res = assets.data;
  const pages = res?.ok ? res.data.pages : [];
  const igs = pages.filter((p) => p.ig).map((p) => p.ig!);
  const adAccounts = res?.ok ? res.data.adAccounts : [];
  async function submit(clear = false) {
    setBusy(true);
    try {
      const pg = pages.find((p) => p.id === page);
      const i = igs.find((x) => x.id === ig);
      await save({ data: clear
        ? { clientId: client.id, fbPageId: null, fbPageName: null, igUserId: null, igUsername: null, adAccountIds: [] }
        : { clientId: client.id, fbPageId: page || null, fbPageName: pg?.name ?? cur?.fb_page_name ?? null, igUserId: ig || null, igUsername: i?.username ?? cur?.ig_username ?? null, adAccountIds: adIds } });
      if (clear) { setPage(""); setIg(""); setAdIds([]); }
      toast.success(clear ? "Meta disconnected" : "Meta connections saved and synced");
      refetchSession();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(false); }
  }
  return (
    <Panel title="Meta connections" sub="Pick this client's Facebook Page, Instagram account and ad accounts from what Why Media's Meta business can see." setup={false}>
      {assets.isLoading ? <p className="text-sm text-p-muted">Loading Meta accounts…</p> : !res?.ok ? (
        <Empty title="Could not list Meta accounts" body={res && !res.ok ? res.message : assets.error?.message ?? "Unknown error"} />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-xs text-p-muted">Facebook Page
            <SearchSelect options={pages.map((p) => ({ value: p.id, label: p.name, hint: p.ig ? `@${p.ig.username}` : undefined }))} value={page} placeholder="Type a Page name…" onChange={(v) => { setPage(v); const p = pages.find((x) => x.id === v); if (p?.ig && !ig) setIg(p.ig.id); }} />
          </label>
          <label className="text-xs text-p-muted">Instagram account
            <SearchSelect options={igs.map((x) => ({ value: x.id, label: `@${x.username}`, hint: `${fmt(x.followers ?? 0)} followers` }))} value={ig} placeholder="Type an Instagram handle…" onChange={setIg} />
          </label>
          <div className="text-xs text-p-muted">Ad accounts
            {adAccounts.length > 0 && <SearchSelect options={adAccounts.filter((a) => !adIds.includes(a.id)).map((a) => ({ value: a.id, label: a.name, hint: a.id }))} value="" placeholder="Type an ad account to add…" onChange={(v) => v && setAdIds([...adIds, v])} />}
            <div className="mt-1 max-h-40 space-y-1 overflow-auto rounded-lg border border-p-line p-2">
              {!adAccounts.length && <div>No ad accounts are shared with the Meta token yet. In Meta Business Settings, assign the ad accounts to the "AnalyticsDashboard" system user.</div>}
              {adAccounts.filter((a) => adIds.includes(a.id)).map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm text-p-text">
                  <input type="checkbox" checked={adIds.includes(a.id)} onChange={(e) => setAdIds(e.target.checked ? [...adIds, a.id] : adIds.filter((x) => x !== a.id))} />
                  {a.name} <span className="text-[11px] text-p-muted">{a.currency}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <button disabled={busy || !res?.ok} onClick={() => submit()} className="rounded-lg bg-p-cerulean px-4 py-2 text-sm text-white disabled:opacity-50">{cur ? "Update connections" : "Connect"}</button>
        {cur && <button disabled={busy} onClick={async () => { setBusy(true); try { const r = await syncNow({ data: { clientId: client.id } }); const bad = Object.entries(r).filter(([, v]) => v !== "ok"); bad.length ? toast.error(bad.map(([k, v]) => `${k}: ${v}`).join("; ")) : toast.success("Meta data refreshed"); refetchSession(); } catch (e) { toast.error(e instanceof Error ? e.message : "Sync failed"); } finally { setBusy(false); } }} className="rounded-lg border border-p-line px-4 py-2 text-sm text-p-text disabled:opacity-50">{busy ? "Syncing…" : "Sync now"}</button>}
        {cur && <button disabled={busy} onClick={() => { if (confirm("Disconnect all Meta accounts from this client?")) void submit(true); }} className="rounded-lg border border-p-line px-4 py-2 text-sm text-p-down disabled:opacity-50">Disconnect Meta</button>}
      </div>
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
          <SearchSelect className="min-w-[20rem]" options={available.map((s) => ({ value: s, label: s.replace(/^sc-domain:/, "").replace(/^https?:\/\//, "").replace(/\/$/, ""), hint: s.startsWith("sc-domain:") ? "domain" : undefined }))} value={pick} placeholder={available.length ? "Type a domain to add…" : "No more properties available"} onChange={setPick} />
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

function GoogleConnections({ client }: { client: PulseClient }) {
  const { refetchSession } = usePulse();
  const connectUrl = useServerFn(googleConnectUrl);
  const list = useServerFn(googleAssets);
  const add = useServerFn(addGoogleConnection);
  const assets = useQuery({ queryKey: ["pulse", "googleAssets"], queryFn: () => list(), staleTime: 10 * 60_000 });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const on = (e: MessageEvent) => { if (e.data === "pulse-google-connected") { void assets.refetch(); refetchSession(); } };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [assets, refetchSession]);
  const linked = new Set(client.connections.filter((c) => c.provider === "youtube" || c.provider === "gbp").map((c) => `${c.provider}:${c.account_ref}`));
  const accts = assets.data ?? [];
  const opts = (kind: "channels" | "locations") => accts.flatMap((a) => a[kind].filter((x) => !linked.has(`${kind === "channels" ? "youtube" : "gbp"}:${x.id}`)).map((x) => ({ value: `${a.id}|${x.id}|${x.name}`, label: x.name, hint: a.email })));
  async function link(provider: "youtube" | "gbp", v: string) {
    if (!v) return;
    const [accountId, ref, ...n] = v.split("|");
    setBusy(true);
    try { await add({ data: { clientId: client.id, provider, accountId: accountId!, ref: ref!, name: n.join("|") } }); toast.success("Linked and synced"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); refetchSession(); }
  }
  async function connect() {
    const w = window.open("", "_blank");
    try { const { url } = await connectUrl({ data: { clientId: client.id, origin: window.location.origin } }); if (w) w.location.href = url; else window.location.href = url; }
    catch (e) { w?.close(); toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  return (
    <Panel title="Google — YouTube & Business Profile" sub="Sign in with the Google account that owns this client's channel or Business Profile. Refreshed automatically each night." setup={false}>
      <div className="flex flex-wrap items-end gap-3">
        <button onClick={connect} className="h-9 rounded-lg bg-p-cerulean px-4 text-sm text-white">Connect a Google account</button>
        {assets.isLoading && <span className="text-xs text-p-muted">Loading accounts…</span>}
        {accts.map((a) => <span key={a.id} className="text-xs text-p-muted">{a.email}{a.error && <span className="ml-1 text-p-down">({a.error})</span>}</span>)}
      </div>
      {accts.length > 0 && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-xs text-p-muted">YouTube channel
            <SearchSelect className="mt-1" options={opts("channels")} value="" placeholder="Type a channel name…" onChange={(v) => void link("youtube", v)} />
          </label>
          <label className="block text-xs text-p-muted">Business Profile location
            <SearchSelect className="mt-1" options={opts("locations")} value="" placeholder="Type a business name…" onChange={(v) => void link("gbp", v)} />
          </label>
        </div>
      )}
      {busy && <p className="mt-2 text-xs text-p-muted">Linking and pulling data…</p>}
    </Panel>
  );
}
