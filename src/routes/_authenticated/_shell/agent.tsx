import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUp, BookOpen, CalendarClock, Check, ChevronDown, FileText, Loader2, MessageSquarePlus, Paperclip, Plug, RefreshCw, Trash2, Wrench, X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { z } from "zod";

import yIcon from "@/assets/wm-y-icon-white.svg.asset.json";
import { PostDesign, type DesignTokens } from "@/components/app/PostDesign";
import { usePulse } from "@/components/pulse/context";
import { supabase } from "@/integrations/supabase/client";
import {
  addMcpServer, deleteSkill, getAgentConfig, refreshMcpServer, removeMcpServer, saveSkill, setAgentSwitch, toggleMcpServer,
} from "@/lib/agent/agent.functions";
import { MCP_PRESETS, TOOL_CATALOG, TOOL_LABELS } from "@/lib/agent/catalog";
import { SKILLS } from "@/lib/agent/skills";
import { useSelectedBrandId } from "@/lib/brandSelection";
import {
  cancelAgentTask, chatWithMarlowe, createAgentTask, deleteThread, getChatHistory, listAgentTasks, listThreads,
} from "@/lib/marlowe.functions";

export const Route = createFileRoute("/_authenticated/_shell/agent")({
  validateSearch: z.object({ q: z.string().optional(), t: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Agent — Why Media AI" },
      { name: "description", content: "Brief the Why Media agent to create posts, reports and pages across the platform." },
      { property: "og:title", content: "Agent — Why Media AI" },
      { property: "og:description", content: "Brief the Why Media agent to create posts, reports and pages across the platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgentPage,
});

type FileRef = { path: string; name: string; mime: string };
type ToolLog = { name: string; input: unknown; output: any; ok: boolean };
type Message = { role: string; body: string; attachments?: FileRef[]; tools?: ToolLog[] };
type Thread = Awaited<ReturnType<typeof listThreads>>[number];
type PanelTab = "skills" | "tools" | "connections" | "tasks";

const STARTERS = [
  "Give me 6 post ideas based on our best videos this quarter",
  "Design 3 Instagram posts for next week and schedule them",
  "Make the report for last month",
  "Schedule the marketing report for the 1st of every month",
];

function AgentPage() {
  const { q, t: threadParam } = Route.useSearch();
  const navigate = useNavigate({ from: "/agent" });
  const { client, clientId } = usePulse();
  const { brandId } = useSelectedBrandId();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(threadParam ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<(FileRef & { uploading?: boolean })[]>([]);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<PanelTab | null>(null);
  const loadThreads = useServerFn(listThreads);
  const loadHistory = useServerFn(getChatHistory);
  const sendMessage = useServerFn(chatWithMarlowe);
  const removeThread = useServerFn(deleteThread);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const sentQ = useRef(false);
  const skipLoad = useRef<string | null>(null);

  const refreshThreads = () => loadThreads().then(setThreads).catch(() => {});
  useEffect(() => { void refreshThreads(); input.current?.focus(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Open the most recent conversation when none is chosen, so leaving and coming back keeps your place.
  useEffect(() => {
    if (threadParam) { setThreadId(threadParam); return; }
    if (!q && threads.length && threadId === null && !sentQ.current) setThreadId(threads[0]!.id);
  }, [threadParam, threads, q, threadId]);

  useEffect(() => {
    if (!threadId) { setMessages([]); return; }
    if (skipLoad.current === threadId) { skipLoad.current = null; return; }
    setLoadingThread(true);
    loadHistory({ data: { threadId } })
      .then((rows) => setMessages(rows.map((r) => ({ role: r.role, body: r.body, attachments: r.attachments, tools: r.tools }))))
      .catch(() => setMessages([]))
      .finally(() => setLoadingThread(false));
  }, [threadId, loadHistory]);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => {
    if (q && !sentQ.current) { sentQ.current = true; setThreadId(null); void send(q, null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function openThread(id: string | null) {
    setThreadId(id);
    setMessages([]);
    void navigate({ search: id ? { t: id } : {}, replace: true });
  }

  async function attach(list: FileList | File[] | null) {
    const picked = list ? Array.from(list) : [];
    if (!picked.length) return;
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user.id;
    if (!uid) { toast.error("Sign in again to attach files."); return; }
    for (const f of picked.slice(0, 6)) {
      if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name} is over 20 MB.`); continue; }
      const path = `${uid}/agent/${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const ref = { path, name: f.name, mime: f.type || "text/plain" };
      setFiles((x) => [...x, { ...ref, uploading: true }]);
      const { error } = await supabase.storage.from("brand-assets").upload(path, f, { contentType: ref.mime, upsert: false });
      if (error) toast.error(`Couldn't upload ${f.name}: ${error.message}`);
      setFiles((x) => (error ? x.filter((y) => y.path !== path) : x.map((y) => (y.path === path ? ref : y))));
    }
  }

  async function send(text: string, forThread: string | null = threadId) {
    text = text.trim();
    const ready = files.filter((f) => !f.uploading);
    if ((!text && !ready.length) || busy || files.some((f) => f.uploading)) return;
    setDraft("");
    setFiles([]);
    setBusy(true);
    setMessages((m) => [...m, { role: "user", body: text || "See the attached files.", attachments: ready }]);
    try {
      const r = await sendMessage({ data: { body: text, threadId: forThread, brandId, clientId: clientId === "all" ? null : clientId, files: ready } });
      setMessages((m) => [...m, { role: "marlowe", body: r.reply, tools: r.tools }]);
      if (r.threadId !== forThread) {
        skipLoad.current = r.threadId;
        setThreadId(r.threadId);
        void navigate({ search: { t: r.threadId }, replace: true });
      }
      void refreshThreads();
    } catch (e) {
      setMessages((m) => [...m, { role: "marlowe", body: `I couldn't reach the workspace just then: ${e instanceof Error ? e.message : "unknown error"}` }]);
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  }

  const acct = clientId === "all" ? "All accounts" : (client?.name ?? "");

  return (
    <div className="relative grid h-[calc(100vh-60px)] grid-cols-[minmax(0,1fr)] lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="hidden min-h-0 flex-col border-r border-app-line bg-app-card lg:flex">
        <div className="p-3">
          <button onClick={() => openThread(null)} className="flex w-full items-center gap-2 rounded-[6px] bg-ink-navy px-3 py-2 text-[13px] text-primary-foreground">
            <MessageSquarePlus size={15} /> New chat
          </button>
        </div>
        <p className="px-4 pb-1.5 text-[10.5px] font-bold tracking-[0.18em] text-ink-navy/45">CONVERSATIONS</p>
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {threads.length === 0 ? <li className="px-2 py-2 text-[12.5px] text-ink-navy/45">No conversations yet.</li> : null}
          {threads.map((t) => (
            <li key={t.id} className={`group flex items-center gap-1 rounded-[6px] ${t.id === threadId ? "bg-app-bg" : "hover:bg-app-bg"}`}>
              <button onClick={() => openThread(t.id)} className="min-w-0 flex-1 px-2.5 py-2 text-left">
                <span className="block truncate text-[13px]">{t.title}</span>
                <span className="block text-[11px] text-ink-navy/45">{new Date(t.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              </button>
              <button
                aria-label="Delete conversation"
                onClick={async () => {
                  if (!confirm("Delete this conversation?")) return;
                  await removeThread({ data: { id: t.id } });
                  if (t.id === threadId) openThread(null);
                  void refreshThreads();
                }}
                className="mr-1.5 hidden text-ink-navy/40 hover:text-ink-navy group-hover:block"
              ><Trash2 size={13} /></button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-h-0 flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b border-app-line bg-app-card px-6 py-3">
          <AgentMark />
          <span className="text-[15px] font-medium">Why Media Agent</span>
          <span className="text-[12.5px] text-ink-navy/55">Working in {acct}</span>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => openThread(null)} className="flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[12.5px] text-ink-navy/70 hover:bg-app-bg lg:hidden"><MessageSquarePlus size={14} /> New</button>
            {([
              ["skills", "Skills", BookOpen],
              ["tools", "Tools", Wrench],
              ["connections", "Connections", Plug],
              ["tasks", "Scheduled", CalendarClock],
            ] as const).map(([id, label, Icon]) => (
              <button key={id} onClick={() => setPanel(panel === id ? null : id)} className={`flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[12.5px] ${panel === id ? "bg-ink-navy text-primary-foreground" : "text-ink-navy/70 hover:bg-app-bg"}`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          {loadingThread ? <p className="flex items-center gap-2 text-[12.5px] text-ink-navy/55"><Loader2 size={14} className="animate-spin" /> Loading conversation…</p> : null}
          {messages.length === 0 && !busy && !loadingThread ? (
            <div className="mx-auto max-w-xl pt-10 text-center">
              <p className="text-[20px] font-medium">What should we get done?</p>
              <p className="mt-1 text-[13.5px] text-ink-navy/60">I can read your analytics and brand kit, then design posts, write reports, emails and pages, and run jobs on a schedule.</p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => void send(s)} className="rounded-[8px] border border-app-line bg-app-card px-4 py-3 text-left text-[13.5px] hover:border-cerulean">{s}</button>
                ))}
              </div>
            </div>
          ) : null}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex flex-col items-end gap-1.5">
                {m.attachments?.length ? <div className="flex flex-wrap justify-end gap-1.5">{m.attachments.map((f) => <FileChip key={f.path} name={f.name} />)}</div> : null}
                <div className="max-w-[70%] whitespace-pre-wrap rounded-[8px] bg-ink-navy px-4 py-3 text-[14px] leading-relaxed text-primary-foreground">{m.body}</div>
              </div>
            ) : (
              <div key={i} className="flex gap-3">
                <AgentMark />
                <div className="min-w-0 max-w-[85%] space-y-2">
                  {m.tools?.length ? <div className="space-y-1.5">{m.tools.map((t, j) => <ToolCard key={j} t={t} />)}</div> : null}
                  {m.tools?.some((t) => t.ok && t.output?.design) ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {m.tools.filter((t) => t.ok && t.output?.design).map((t, j) => <PostCard key={j} out={t.output} />)}
                    </div>
                  ) : null}
                  <div className="prose-agent text-[14px] leading-relaxed"><ReactMarkdown>{m.body}</ReactMarkdown></div>
                </div>
              </div>
            ),
          )}
          {busy ? <p className="flex items-center gap-2 pl-10 text-[12.5px] text-ink-navy/55"><Loader2 size={14} className="animate-spin" /> Agent is working… designing posts can take up to a minute each.</p> : null}
          <div ref={end} />
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); void send(draft); }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); void attach(e.dataTransfer.files); }}
          className="border-t border-app-line bg-app-card p-4"
        >
          {files.length ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {files.map((f) => <FileChip key={f.path} name={f.name} busy={!!f.uploading} onRemove={() => setFiles((x) => x.filter((y) => y.path !== f.path))} />)}
            </div>
          ) : null}
          <div className="flex items-end gap-2 rounded-[8px] border border-app-line bg-app-bg px-3 py-2 focus-within:border-cerulean">
            <input
              ref={fileInput}
              type="file"
              multiple
              className="sr-only"
              aria-label="Attach files"
              accept="image/*,.pdf,.txt,.csv,.md,.json,.html"
              onChange={(e) => { const picked = e.target.files ? Array.from(e.target.files) : []; e.target.value = ""; void attach(picked); }}
            />
            <button type="button" onClick={() => fileInput.current?.click()} aria-label="Attach files" title="Attach files" className="flex h-8 w-8 items-center justify-center rounded-[6px] text-ink-navy/60 hover:bg-app-card"><Paperclip size={16} /></button>
            <textarea
              ref={input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(draft); } }}
              onPaste={(e) => { const f = Array.from(e.clipboardData.files); if (f.length) { e.preventDefault(); void attach(f); } }}
              rows={1}
              placeholder="Ask anything, or tell me what to make — drop or paste files here"
              className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-[14px] outline-none placeholder:text-ink-navy/40"
            />
            <button type="submit" disabled={busy || (!draft.trim() && !files.length) || files.some((f) => f.uploading)} aria-label="Send" className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-cerulean text-primary-foreground disabled:opacity-40">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
            </button>
          </div>
        </form>
      </section>

      {panel ? <SidePanel tab={panel} setTab={setPanel} brandId={brandId} clientId={clientId === "all" ? null : clientId} /> : null}
    </div>
  );
}

function SidePanel({ tab, setTab, brandId, clientId }: { tab: PanelTab; setTab: (t: PanelTab | null) => void; brandId: string | null; clientId: string | null }) {
  const load = useServerFn(getAgentConfig);
  const [cfg, setCfg] = useState<Awaited<ReturnType<typeof getAgentConfig>> | null>(null);
  const refresh = () => load().then(setCfg).catch(() => {});
  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  const titles: Record<PanelTab, string> = { skills: "Skills", tools: "Tools", connections: "Connections", tasks: "Scheduled tasks" };
  return (
    <aside className="wm-fade absolute top-0 right-0 bottom-0 z-20 flex w-[360px] max-w-full flex-col border-l border-app-line bg-app-card shadow-[0_24px_60px_rgba(0,28,38,0.18)]">
      <div className="flex items-center border-b border-app-line px-5 py-3.5">
        <p className="flex-1 text-[15px] font-medium">{titles[tab]}</p>
        <button onClick={() => setTab(null)} aria-label="Close"><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {!cfg && tab !== "tasks" ? <p className="text-[12.5px] text-ink-navy/55">Loading…</p> : null}
        {cfg && tab === "skills" ? <SkillsTab cfg={cfg} refresh={refresh} /> : null}
        {cfg && tab === "tools" ? <ToolsTab cfg={cfg} refresh={refresh} /> : null}
        {cfg && tab === "connections" ? <ConnectionsTab cfg={cfg} refresh={refresh} /> : null}
        {tab === "tasks" ? <TasksTab brandId={brandId} clientId={clientId} /> : null}
      </div>
    </aside>
  );
}

type Cfg = Awaited<ReturnType<typeof getAgentConfig>>;

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-cerulean" : "bg-ink-navy/20"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-app-card transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

const field = "w-full rounded-[6px] border border-app-line bg-app-bg px-3 py-2 text-[13px] outline-none focus:border-cerulean";

function SkillsTab({ cfg, refresh }: { cfg: Cfg; refresh: () => void }) {
  const flip = useServerFn(setAgentSwitch);
  const save = useServerFn(saveSkill);
  const del = useServerFn(deleteSkill);
  const [form, setForm] = useState<{ id: string | null; name: string; summary: string; instructions: string } | null>(null);
  return (
    <div className="space-y-5">
      <p className="text-[12.5px] text-ink-navy/60">Skills are playbooks the agent follows. Switch off any you don't want, or write your own.</p>
      <ul className="space-y-1.5">
        {SKILLS.map((s) => (
          <li key={s.id} className="flex items-start gap-3 rounded-[6px] border border-app-line px-3 py-2">
            <div className="min-w-0 flex-1"><p className="text-[13px] font-medium">{s.name}</p><p className="text-[12px] text-ink-navy/55">{s.summary}</p></div>
            <Switch label={s.name} on={!cfg.disabledSkills.includes(s.id)} onChange={(on) => flip({ data: { kind: "skill", id: s.id, on } }).then(refresh)} />
          </li>
        ))}
      </ul>
      <div>
        <p className="mb-2 text-[13px] font-medium">Your skills</p>
        <ul className="space-y-1.5">
          {cfg.skills.length === 0 ? <li className="text-[12.5px] text-ink-navy/45">None yet.</li> : null}
          {cfg.skills.map((s) => (
            <li key={s.id} className="flex items-start gap-3 rounded-[6px] border border-app-line px-3 py-2">
              <button className="min-w-0 flex-1 text-left" onClick={() => setForm({ id: s.id, name: s.name, summary: s.summary, instructions: s.instructions })}>
                <p className="text-[13px] font-medium">{s.name}</p><p className="line-clamp-2 text-[12px] text-ink-navy/55">{s.summary || s.instructions}</p>
              </button>
              <Switch label={s.name} on={s.enabled} onChange={(on) => save({ data: { id: s.id, name: s.name, summary: s.summary, instructions: s.instructions, enabled: on } }).then(refresh)} />
              <button aria-label="Delete skill" onClick={() => del({ data: { id: s.id } }).then(refresh)} className="text-ink-navy/40 hover:text-ink-navy"><Trash2 size={13} /></button>
            </li>
          ))}
        </ul>
        {form ? (
          <form
            className="mt-3 space-y-2 rounded-[8px] border border-app-line p-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try { await save({ data: { ...form, enabled: true } }); setForm(null); refresh(); toast.success("Skill saved"); }
              catch (err) { toast.error(err instanceof Error ? err.message : "Couldn't save"); }
            }}
          >
            <input className={field} placeholder="Name, e.g. Property launch posts" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={field} placeholder="One-line summary" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            <textarea className={`${field} min-h-[120px]`} placeholder="Step-by-step instructions the agent should follow" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
            <div className="flex gap-2">
              <button className="rounded-[6px] bg-ink-navy px-3 py-1.5 text-[12.5px] text-primary-foreground">Save skill</button>
              <button type="button" onClick={() => setForm(null)} className="rounded-[6px] border border-app-line px-3 py-1.5 text-[12.5px]">Cancel</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setForm({ id: null, name: "", summary: "", instructions: "" })} className="mt-3 rounded-[6px] border border-app-line px-3 py-1.5 text-[12.5px] hover:border-cerulean">+ New skill</button>
        )}
      </div>
    </div>
  );
}

function ToolsTab({ cfg, refresh }: { cfg: Cfg; refresh: () => void }) {
  const flip = useServerFn(setAgentSwitch);
  return (
    <div className="space-y-5">
      <p className="text-[12.5px] text-ink-navy/60">What the agent is allowed to do inside Why Media AI. Tools from connected services are listed under Connections.</p>
      <ul className="space-y-1.5">
        {TOOL_CATALOG.map((t) => (
          <li key={t.id} className="flex items-start gap-3 rounded-[6px] border border-app-line px-3 py-2">
            <div className="min-w-0 flex-1"><p className="text-[13px] font-medium">{t.label}</p><p className="text-[12px] text-ink-navy/55">{t.summary}</p></div>
            <Switch label={t.label} on={!cfg.disabledTools.includes(t.id)} onChange={(on) => flip({ data: { kind: "tool", id: t.id, on } }).then(refresh)} />
          </li>
        ))}
      </ul>
      {cfg.servers.filter((s) => s.enabled && s.tool_names.length).map((s) => (
        <div key={s.id}>
          <p className="mb-1.5 text-[13px] font-medium">{s.name}</p>
          <div className="flex flex-wrap gap-1.5">{s.tool_names.slice(0, 40).map((n) => <span key={n} className="rounded-full border border-app-line px-2.5 py-1 text-[11.5px] text-ink-navy/70">{n}</span>)}</div>
        </div>
      ))}
    </div>
  );
}

function ConnectionsTab({ cfg, refresh }: { cfg: Cfg; refresh: () => void }) {
  const add = useServerFn(addMcpServer);
  const recheck = useServerFn(refreshMcpServer);
  const flip = useServerFn(toggleMcpServer);
  const remove = useServerFn(removeMcpServer);
  const [form, setForm] = useState({ name: "", url: "", headers: "" });
  const [hint, setHint] = useState("Authorization: Bearer <key>");
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <div className="space-y-5">
      <p className="text-[12.5px] text-ink-navy/60">Connect outside services that offer an MCP server (GoHighLevel, Semrush, Notion and more). The agent can then use their tools, and asks before anything that sends, publishes or spends.</p>
      <ul className="space-y-1.5">
        {cfg.servers.length === 0 ? <li className="text-[12.5px] text-ink-navy/45">Nothing connected yet.</li> : null}
        {cfg.servers.map((s) => (
          <li key={s.id} className="rounded-[6px] border border-app-line px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${s.status === "connected" ? "bg-brand-green" : "bg-destructive"}`} />
              <p className="min-w-0 flex-1 truncate text-[13px] font-medium">{s.name}</p>
              <Switch label={s.name} on={s.enabled} onChange={(on) => flip({ data: { id: s.id, on } }).then(refresh)} />
            </div>
            <p className="mt-0.5 truncate text-[11.5px] text-ink-navy/50">{s.url}</p>
            <p className="mt-0.5 text-[12px] text-ink-navy/60">{s.status === "connected" ? `${s.tool_names.length} tools` : `Not answering: ${s.last_error ?? "unknown error"}`}</p>
            <div className="mt-1.5 flex gap-3 text-[12px]">
              <button disabled={busy === s.id} onClick={async () => { setBusy(s.id); try { const r = await recheck({ data: { id: s.id } }); toast.success(`${r.tools} tools found`); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(null); refresh(); } }} className="flex items-center gap-1 text-cerulean"><RefreshCw size={12} className={busy === s.id ? "animate-spin" : ""} /> Check</button>
              <button onClick={() => remove({ data: { id: s.id } }).then(refresh)} className="text-ink-navy/50 hover:text-ink-navy">Remove</button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="space-y-2 rounded-[8px] border border-app-line p-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy("new");
          try { const r = await add({ data: form }); toast.success(`Connected — ${r.tools} tools`); setForm({ name: "", url: "", headers: "" }); }
          catch (err) { toast.error(err instanceof Error ? err.message : "Couldn't connect"); }
          finally { setBusy(null); refresh(); }
        }}
      >
        <p className="text-[13px] font-medium">Add a connection</p>
        <div className="flex flex-wrap gap-1.5">
          {MCP_PRESETS.map((p) => (
            <button type="button" key={p.name} onClick={() => { setForm({ ...form, name: p.name, url: p.url }); setHint(p.headerHint); }} className="rounded-full border border-app-line px-2.5 py-1 text-[11.5px] hover:border-cerulean">{p.name}</button>
          ))}
        </div>
        <input className={field} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={field} placeholder="Server address (https://…)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        <textarea className={`${field} min-h-[70px] font-mono text-[12px]`} placeholder={hint} value={form.headers} onChange={(e) => setForm({ ...form, headers: e.target.value })} />
        <p className="text-[11.5px] text-ink-navy/50">Keys are stored privately and never shown again.</p>
        <button disabled={busy === "new" || !form.name || !form.url} className="flex items-center gap-1.5 rounded-[6px] bg-ink-navy px-3 py-1.5 text-[12.5px] text-primary-foreground disabled:opacity-50">
          {busy === "new" ? <Loader2 size={13} className="animate-spin" /> : null} Connect
        </button>
      </form>
    </div>
  );
}

function localInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function TasksTab({ brandId, clientId }: { brandId: string | null; clientId: string | null }) {
  const load = useServerFn(listAgentTasks);
  const remove = useServerFn(cancelAgentTask);
  const create = useServerFn(createAgentTask);
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof listAgentTasks>>>([]);
  const firstOfMonth = (() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 1); d.setHours(9, 0, 0, 0); return d; })();
  const [form, setForm] = useState({ prompt: "", runAt: localInput(firstOfMonth), repeat: "monthly" });
  const refresh = () => load().then(setTasks).catch(() => {});
  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  return (
    <div className="space-y-5">
      <p className="text-[12.5px] text-ink-navy/60">Jobs the agent runs by itself. Ask in chat (“make the report on the 1st of every month”) or add one here. Checked every hour; results appear as a conversation.</p>
      <ul className="space-y-1.5">
        {tasks.length === 0 ? <li className="text-[12.5px] text-ink-navy/45">Nothing scheduled.</li> : null}
        {tasks.map((t) => (
          <li key={t.id} className="flex items-start gap-2 rounded-[6px] border border-app-line px-3 py-2 text-[12.5px]">
            <div className="min-w-0 flex-1">
              <p className="line-clamp-3">{t.prompt}</p>
              <p className="mt-0.5 text-[11.5px] text-ink-navy/55">
                {t.status === "done" ? "Done" : t.status === "paused" ? "Paused" : `Next: ${new Date(t.run_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`}
                {t.repeat !== "none" ? ` · repeats ${t.repeat}` : ""}
              </p>
              {t.last_result ? <p className="mt-1 line-clamp-2 text-[11.5px] text-ink-navy/45">Last run: {t.last_result}</p> : null}
            </div>
            <button aria-label="Remove task" onClick={() => remove({ data: { id: t.id } }).then(refresh)} className="text-ink-navy/40 hover:text-ink-navy"><Trash2 size={13} /></button>
          </li>
        ))}
      </ul>
      <form
        className="space-y-2 rounded-[8px] border border-app-line p-3"
        onSubmit={async (e) => {
          e.preventDefault();
          try { await create({ data: { ...form, runAt: new Date(form.runAt).toISOString(), brandId, clientId } }); setForm({ ...form, prompt: "" }); toast.success("Task scheduled"); refresh(); }
          catch (err) { toast.error(err instanceof Error ? err.message : "Couldn't schedule"); }
        }}
      >
        <p className="text-[13px] font-medium">New task</p>
        <textarea className={`${field} min-h-[80px]`} placeholder="e.g. Make the marketing report for the previous month" value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} />
        <label className="block text-[12px] text-ink-navy/60">First run
          <input type="datetime-local" className={`${field} mt-1`} value={form.runAt} onChange={(e) => setForm({ ...form, runAt: e.target.value })} />
        </label>
        <label className="block text-[12px] text-ink-navy/60">Repeat
          <select className={`${field} mt-1`} value={form.repeat} onChange={(e) => setForm({ ...form, repeat: e.target.value })}>
            <option value="none">Once</option><option value="daily">Every day</option><option value="weekly">Every week</option><option value="monthly">Every month</option>
          </select>
        </label>
        <p className="text-[11.5px] text-ink-navy/50">Runs for the account and brand selected now{clientId ? "" : " (pick an account first for reports)"}.</p>
        <button disabled={!form.prompt.trim()} className="rounded-[6px] bg-ink-navy px-3 py-1.5 text-[12.5px] text-primary-foreground disabled:opacity-50">Schedule</button>
      </form>
    </div>
  );
}

function AgentMark() {
  return <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cerulean"><img src={yIcon.url} alt="" className="h-3.5 w-3.5" /></span>;
}

function FileChip({ name, busy, onRemove }: { name: string; busy?: boolean; onRemove?: () => void }) {
  return (
    <span className="flex items-center gap-1.5 rounded-[6px] border border-app-line bg-app-card px-2 py-1 text-[12px]">
      {busy ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
      <span className="max-w-[160px] truncate">{name}</span>
      {onRemove ? <button type="button" onClick={onRemove} aria-label="Remove file"><X size={12} /></button> : null}
    </span>
  );
}

function PostCard({ out }: { out: any }) {
  const d = out.design as { template: string; title: string; subhead: string; imageUrl?: string | null; tokens: DesignTokens };
  const tpl = d.template === "single" || d.template === "reel" ? "announcement" : d.template;
  return (
    <Link to="/marketing/scheduler" className="block">
      <PostDesign template={tpl} tokens={d.tokens} content={{ headline: d.title, subhead: d.subhead }} imageUrl={d.imageUrl ?? null} compact />
      <p className="mt-1 text-[11.5px] text-ink-navy/55">{new Date(out.scheduledFor).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {(out.channels as string[]).join(", ")}</p>
    </Link>
  );
}

function ToolCard({ t }: { t: ToolLog }) {
  const [open, setOpen] = useState(false);
  const link = t.ok && t.output && typeof t.output === "object" ? (t.output.link as string | undefined) : undefined;
  const label = TOOL_LABELS[t.name] ?? t.name.replace("__", ": ").replace(/_/g, " ");
  return (
    <div className="rounded-[6px] border border-app-line bg-app-card text-[12.5px]">
      <div className="flex items-center gap-2 px-3 py-1.5">
        {t.ok ? <Check size={13} className="text-brand-green" /> : <X size={13} className="text-destructive" />}
        <Wrench size={12} className="text-ink-navy/45" />
        <span className="flex-1">{label}{t.ok ? "" : " — failed"}</span>
        {link ? <Link to={link as "/agent"} className="text-cerulean hover:underline">Open</Link> : null}
        <button type="button" onClick={() => setOpen(!open)} aria-label="Details"><ChevronDown size={13} className={open ? "rotate-180" : ""} /></button>
      </div>
      {open ? <pre className="max-h-48 overflow-auto border-t border-app-line px-3 py-2 text-[11px] text-ink-navy/70">{JSON.stringify({ input: t.input, output: t.output }, null, 2)}</pre> : null}
    </div>
  );
}
