import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ExternalLink, LayoutGrid, List, Loader2, Plus, Search, Settings2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { APPS, CATEGORIES, type ConnectApp } from "@/lib/agent/apps";
import { addMcpServer, getAgentConfig, removeMcpServer, toggleMcpServer } from "@/lib/agent/agent.functions";

export const Route = createFileRoute("/_authenticated/_shell/connections")({
  head: () => ({
    meta: [
      { title: "Connections — Why Media AI" },
      { name: "description", content: "Connect email, CRM, social, design and analytics apps so the agent can use them." },
      { property: "og:title", content: "Connections — Why Media AI" },
      { property: "og:description", content: "Connect email, CRM, social, design and analytics apps so the agent can use them." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Connections,
});

type Server = { id: string; name: string; url: string; enabled: boolean; status: string; last_error: string | null; tool_names: string[] };

function Logo({ app, size = 40 }: { app: Pick<ConnectApp, "icon" | "color" | "name">; size?: number }) {
  const [bad, setBad] = useState(false);
  return (
    <div className="grid shrink-0 place-items-center rounded-xl" style={{ width: size, height: size, background: app.color }}>
      {bad ? <span className="text-sm font-semibold text-primary-foreground">{app.name[0]}</span> : (
        <img src={`https://cdn.simpleicons.org/${app.icon}/${isLight(app.color) ? "111111" : "ffffff"}`} alt="" className="h-1/2 w-1/2" onError={() => setBad(true)} />
      )}
    </div>
  );
}
function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 160;
}

function Connections() {
  const qc = useQueryClient();
  const cfg = useQuery({ queryKey: ["agent-config"], queryFn: useServerFn(getAgentConfig) });
  const toggle = useServerFn(toggleMcpServer);
  const remove = useServerFn(removeMcpServer);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [show, setShow] = useState<"all" | "connected">("all");
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<ConnectApp | "custom" | null>(null);
  const [details, setDetails] = useState<ConnectApp | null>(null);

  const servers = (cfg.data?.servers ?? []) as Server[];
  const serverFor = (a: ConnectApp) => servers.find((s) => s.name === a.name || (a.mcpUrl && s.url === a.mcpUrl));
  const custom = servers.filter((s) => !APPS.some((a) => a.name === s.name || a.mcpUrl === s.url));
  const refresh = () => qc.invalidateQueries({ queryKey: ["agent-config"] });

  const list = useMemo(() => APPS.filter((a) =>
    (cat === "all" || a.category === cat) &&
    (show === "all" || a.auth === "builtin" || !!serverFor(a)) &&
    (!q || `${a.name} ${a.summary} ${a.by}`.toLowerCase().includes(q.toLowerCase()))
  ), [cat, show, q, servers]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Connections</h1>
          <p className="mt-1 text-sm text-muted-foreground">Apps the agent can read from and work in. Keys are stored on the server only.</p>
        </div>
        <button onClick={() => setOpen("custom")} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" /> Add your own server</button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <Pick value={show} onChange={(v) => setShow(v as "all")} options={[["all", "All apps"], ["connected", "Connected"]]} />
        <Pick value={cat} onChange={setCat} options={[["all", "All categories"], ...CATEGORIES.map((c) => [c, c] as [string, string])]} />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps" className="h-9 w-56 rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary" />
        </div>
        <div className="ml-auto flex rounded-lg border border-border p-0.5">
          {(["grid", "list"] as const).map((v) => (
            <button key={v} aria-label={`${v} view`} onClick={() => setView(v)} className={`rounded-md p-1.5 ${view === v ? "bg-muted text-foreground" : "text-muted-foreground"}`}>{v === "grid" ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}</button>
          ))}
        </div>
      </div>

      <div className={view === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "divide-y divide-border rounded-2xl border border-border bg-card"}>
        {list.map((a) => {
          const s = serverFor(a);
          const action = a.auth === "builtin" ? (
            <Link to="/settings/data-sources" className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">Manage</Link>
          ) : s ? (
            <span className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${s.status === "connected" ? "border-primary text-primary" : "border-destructive text-destructive"}`}>{s.status === "connected" ? "Connected" : "Needs attention"}</span>
          ) : a.auth === "key" ? (
            <button onClick={() => setOpen(a)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">Connect</button>
          ) : (
            <span className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">{a.auth === "oauth" ? "Sign-in coming soon" : "Coming soon"}</span>
          );
          const footer = (
            <div className="flex items-center gap-2">
              <button aria-label="Details" onClick={() => setDetails(a)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted"><Settings2 className="h-4 w-4" /></button>
              <button onClick={() => setDetails(a)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted">Details</button>
              {s && <Switch className="ml-auto" checked={s.enabled} onCheckedChange={async (on) => { await toggle({ data: { id: s.id, on } }); refresh(); }} />}
            </div>
          );
          return view === "grid" ? (
            <div key={a.id} className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between"><Logo app={a} />{action}</div>
              <div className="mt-4 flex items-center gap-2"><h3 className="font-semibold text-foreground">{a.name}</h3><span className="text-xs text-muted-foreground">by {a.by}</span></div>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{a.summary}</p>
              <div className="mt-4 border-t border-border pt-4">{footer}</div>
            </div>
          ) : (
            <div key={a.id} className="flex items-center gap-4 p-4">
              <Logo app={a} size={36} />
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="font-medium text-foreground">{a.name}</span><span className="text-xs text-muted-foreground">{a.category}</span></div><p className="truncate text-sm text-muted-foreground">{a.summary}</p></div>
              {action}<div className="w-44">{footer}</div>
            </div>
          );
        })}
      </div>

      {custom.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Your own servers</h2>
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {custom.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1"><div className="font-medium text-foreground">{s.name}</div><div className="truncate text-xs text-muted-foreground">{s.status === "connected" ? `${s.tool_names.length} tools` : s.last_error}</div></div>
                <Switch checked={s.enabled} onCheckedChange={async (on) => { await toggle({ data: { id: s.id, on } }); refresh(); }} />
                <button aria-label="Remove" onClick={async () => { await remove({ data: { id: s.id } }); refresh(); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {open && <ConnectDialog app={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); refresh(); }} />}
      {details && <DetailsDialog app={details} server={serverFor(details)} onClose={() => setDetails(null)} onRemove={async (id) => { await remove({ data: { id } }); setDetails(null); refresh(); }} onConnect={() => { setOpen(details); setDetails(null); }} />}
    </div>
  );
}

function Pick({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 appearance-none rounded-lg border border-border bg-muted/50 pl-3 pr-8 text-sm text-foreground outline-none">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function ConnectDialog({ app, onClose, onDone }: { app: ConnectApp | "custom"; onClose: () => void; onDone: () => void }) {
  const add = useServerFn(addMcpServer);
  const isCustom = app === "custom";
  const [name, setName] = useState(""), [url, setUrl] = useState(""), [key, setKey] = useState(""), [extra, setExtra] = useState(""), [headers, setHeaders] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      const data = isCustom
        ? { name: name.trim(), url: url.trim(), headers }
        : { name: app.name, url: app.mcpUrl!, headers: [app.header!.replace("{key}", key.trim()), app.extraField ? `${app.extraField.header}: ${extra.trim()}` : ""].filter(Boolean).join("\n") };
      const r = await add({ data });
      toast.success(`Connected, ${r.tools} tools available to the agent`);
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not connect"); onDone(); }
    finally { setBusy(false); }
  }
  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-3">
        {!isCustom && <Logo app={app} size={36} />}
        <h2 className="text-lg font-semibold text-foreground">{isCustom ? "Add your own MCP server" : `Connect ${app.name}`}</h2>
      </div>
      <div className="mt-5 space-y-3">
        {isCustom ? (<>
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className={inp} placeholder="e.g. Our posting tool" /></Field>
          <Field label="Server address"><input value={url} onChange={(e) => setUrl(e.target.value)} className={inp} placeholder="https://…/mcp" /></Field>
          <Field label="Headers (optional, one per line)"><textarea value={headers} onChange={(e) => setHeaders(e.target.value)} rows={3} className={inp} placeholder="Authorization: Bearer …" /></Field>
        </>) : (<>
          <Field label={app.keyLabel ?? "API key"}><input type="password" value={key} onChange={(e) => setKey(e.target.value)} className={inp} autoComplete="off" /></Field>
          {app.extraField && <Field label={app.extraField.label}><input value={extra} onChange={(e) => setExtra(e.target.value)} className={inp} /></Field>}
          {app.keyHelp && <p className="text-xs text-muted-foreground">{app.keyHelp}</p>}
        </>)}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground">Cancel</button>
        <button disabled={busy || (isCustom ? !name || !url : !key)} onClick={submit} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Connect</button>
      </div>
    </Modal>
  );
}

function DetailsDialog({ app, server, onClose, onRemove, onConnect }: { app: ConnectApp; server?: Server | undefined; onClose: () => void; onRemove: (id: string) => void; onConnect: () => void }) {
  const how = { key: "Connects with an API key.", oauth: "This app's server uses sign-in. One-click sign-in is being added next.", builtin: "Connected through Settings → Data sources, per client.", soon: "No official server from this app yet." }[app.auth];
  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-3"><Logo app={app} size={36} /><div><h2 className="text-lg font-semibold text-foreground">{app.name}</h2><p className="text-xs text-muted-foreground">{app.category} · by {app.by}</p></div></div>
      <p className="mt-4 text-sm text-foreground">{app.summary}</p>
      <p className="mt-2 text-sm text-muted-foreground">{how}</p>
      {server && (
        <div className="mt-4 rounded-xl bg-muted/50 p-3 text-sm">
          <div className="font-medium text-foreground">{server.status === "connected" ? `${server.tool_names.length} tools available` : "Not answering"}</div>
          {server.last_error && <p className="mt-1 text-xs text-destructive">{server.last_error}</p>}
          {server.tool_names.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{server.tool_names.slice(0, 30).join(", ")}{server.tool_names.length > 30 ? "…" : ""}</p>}
        </div>
      )}
      <div className="mt-6 flex items-center justify-between gap-2">
        {app.docs ? <a href={app.docs} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary">Setup guide <ExternalLink className="h-3 w-3" /></a> : <span />}
        <div className="flex gap-2">
          {server && <button onClick={() => onRemove(server.id)} className="rounded-lg border border-border px-4 py-2 text-sm text-destructive">Disconnect</button>}
          {!server && app.auth === "key" && <button onClick={onConnect} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Connect</button>}
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground">Close</button>
        </div>
      </div>
    </Modal>
  );
}

const inp = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
