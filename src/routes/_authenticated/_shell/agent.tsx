import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUp, CalendarClock, Check, ChevronDown, FileText, Loader2, Paperclip, Trash2, Wrench, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { z } from "zod";

import yIcon from "@/assets/wm-y-icon-white.svg.asset.json";
import { usePulse } from "@/components/pulse/context";
import { supabase } from "@/integrations/supabase/client";
import { SKILLS } from "@/lib/agent/skills";
import { useSelectedBrandId } from "@/lib/brandSelection";
import { cancelAgentTask, chatWithMarlowe, getChatHistory, listAgentTasks } from "@/lib/marlowe.functions";

export const Route = createFileRoute("/_authenticated/_shell/agent")({
  validateSearch: z.object({ q: z.string().optional() }),
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
type Task = Awaited<ReturnType<typeof listAgentTasks>>[number];

const TOOL_LABELS: Record<string, string> = {
  get_brand_kit: "Read brand kit",
  get_analytics: "Read analytics",
  get_top_posts: "Read top posts",
  list_schedule: "Checked the schedule",
  create_post: "Created and scheduled a post",
  create_report: "Generated a report",
  create_site_page: "Drafted a web page",
  schedule_task: "Scheduled a task",
};
const STARTERS = [
  "Give me 6 post ideas based on our best videos this quarter",
  "Create 3 Instagram posts for next week and schedule them",
  "Make the report for October",
  "Build a landing page for our new development",
];

function AgentPage() {
  const { q } = Route.useSearch();
  const { client, clientId } = usePulse();
  const { brandId } = useSelectedBrandId();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<(FileRef & { uploading?: boolean })[]>([]);
  const [busy, setBusy] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const loadHistory = useServerFn(getChatHistory);
  const sendMessage = useServerFn(chatWithMarlowe);
  const loadTasks = useServerFn(listAgentTasks);
  const removeTask = useServerFn(cancelAgentTask);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const sentQ = useRef(false);

  const refreshTasks = () => loadTasks().then(setTasks).catch(() => {});
  useEffect(() => {
    loadHistory().then((rows) => setMessages(rows.map((r) => ({ role: r.role, body: r.body, attachments: r.attachments, tools: r.tools })))).catch(() => {});
    void refreshTasks();
    input.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => {
    if (q && !sentQ.current) { sentQ.current = true; void send(q); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function attach(list: FileList | null) {
    if (!list?.length) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    for (const f of Array.from(list).slice(0, 6)) {
      const path = `${u.user.id}/agent/${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const ref = { path, name: f.name, mime: f.type || "text/plain" };
      setFiles((x) => [...x, { ...ref, uploading: true }]);
      const { error } = await supabase.storage.from("brand-assets").upload(path, f, { contentType: ref.mime });
      setFiles((x) => (error ? x.filter((y) => y.path !== path) : x.map((y) => (y.path === path ? ref : y))));
    }
  }

  async function send(text: string) {
    text = text.trim();
    const ready = files.filter((f) => !f.uploading);
    if ((!text && !ready.length) || busy || files.some((f) => f.uploading)) return;
    setDraft("");
    setFiles([]);
    setBusy(true);
    setMessages((m) => [...m, { role: "user", body: text || "See the attached files.", attachments: ready }]);
    try {
      const r = await sendMessage({ data: { body: text, brandId, clientId: clientId === "all" ? null : clientId, files: ready } });
      setMessages((m) => [...m, { role: "marlowe", body: r.reply, tools: r.tools }]);
      if (r.tools.some((t: ToolLog) => t.name === "schedule_task")) void refreshTasks();
    } catch (e) {
      setMessages((m) => [...m, { role: "marlowe", body: `I couldn't reach the workspace just then: ${e instanceof Error ? e.message : "unknown error"}` }]);
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  }

  const acct = clientId === "all" ? "All accounts" : (client?.name ?? "");

  return (
    <div className="grid h-[calc(100vh-60px)] grid-cols-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="flex min-h-0 flex-col">
        <div className="flex items-center gap-3 border-b border-app-line bg-app-card px-6 py-3.5">
          <AgentMark />
          <span className="text-[15px] font-medium">Why Media Agent</span>
          <span className="text-[12.5px] text-ink-navy/55">Working in {acct}</span>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          {messages.length === 0 && !busy ? (
            <div className="mx-auto max-w-xl pt-10 text-center">
              <p className="text-[20px] font-medium">What should we get done?</p>
              <p className="mt-1 text-[13.5px] text-ink-navy/60">I can read your analytics and brand kit, then create posts, reports and pages for you.</p>
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
                <div className="min-w-0 max-w-[80%] space-y-2">
                  {m.tools?.length ? <div className="space-y-1.5">{m.tools.map((t, j) => <ToolCard key={j} t={t} />)}</div> : null}
                  <div className="prose-agent text-[14px] leading-relaxed"><ReactMarkdown>{m.body}</ReactMarkdown></div>
                </div>
              </div>
            ),
          )}
          {busy ? <p className="flex items-center gap-2 pl-10 text-[12.5px] text-ink-navy/55"><Loader2 size={14} className="animate-spin" /> Agent is working…</p> : null}
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
              {files.map((f) => <FileChip key={f.path} name={f.name} busy={f.uploading} onRemove={() => setFiles((x) => x.filter((y) => y.path !== f.path))} />)}
            </div>
          ) : null}
          <div className="flex items-end gap-2 rounded-[8px] border border-app-line bg-app-bg px-3 py-2 focus-within:border-cerulean">
            <input ref={fileInput} type="file" multiple hidden accept="image/*,.pdf,.txt,.csv,.md,.json,.html" onChange={(e) => { void attach(e.target.files); e.target.value = ""; }} />
            <button type="button" onClick={() => fileInput.current?.click()} aria-label="Attach files" className="flex h-8 w-8 items-center justify-center rounded-[6px] text-ink-navy/60 hover:bg-app-card"><Paperclip size={16} /></button>
            <textarea
              ref={input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(draft); } }}
              rows={1}
              placeholder="Ask anything, or tell me what to make — drop files here"
              className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-[14px] outline-none placeholder:text-ink-navy/40"
            />
            <button type="submit" disabled={busy || (!draft.trim() && !files.length) || files.some((f) => f.uploading)} aria-label="Send" className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-cerulean text-primary-foreground disabled:opacity-40">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
            </button>
          </div>
        </form>
      </section>

      <aside className="hidden overflow-y-auto border-l border-app-line bg-app-card p-5 xl:block">
        <p className="text-[15px] font-medium">Skills</p>
        <ul className="mt-3 space-y-1.5">
          {SKILLS.map((s) => (
            <li key={s.id} className="rounded-[6px] border border-app-line px-3 py-2">
              <p className="text-[13px] font-medium">{s.name}</p>
              <p className="text-[12px] text-ink-navy/55">{s.summary}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[15px] font-medium">Tools</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.values(TOOL_LABELS).map((t) => <span key={t} className="rounded-full border border-app-line px-2.5 py-1 text-[11.5px] text-ink-navy/70">{t}</span>)}
        </div>
        <p className="mt-6 flex items-center gap-2 text-[15px] font-medium"><CalendarClock size={15} /> Scheduled tasks</p>
        <p className="mt-1 text-[12px] text-ink-navy/55">Ask “every Monday, draft this week's posts”. Due tasks run with the nightly refresh.</p>
        <ul className="mt-3 space-y-1.5">
          {tasks.length === 0 ? <li className="text-[12.5px] text-ink-navy/45">Nothing scheduled.</li> : null}
          {tasks.map((t) => (
            <li key={t.id} className="flex items-start gap-2 rounded-[6px] border border-app-line px-3 py-2 text-[12.5px]">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2">{t.prompt}</p>
                <p className="text-[11.5px] text-ink-navy/55">{t.status === "done" ? "Done" : new Date(t.run_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}{t.repeat !== "none" ? ` · ${t.repeat}` : ""}</p>
              </div>
              <button aria-label="Remove task" onClick={() => removeTask({ data: { id: t.id } }).then(refreshTasks)} className="text-ink-navy/40 hover:text-ink-navy"><Trash2 size={13} /></button>
            </li>
          ))}
        </ul>
      </aside>
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

function ToolCard({ t }: { t: ToolLog }) {
  const [open, setOpen] = useState(false);
  const link = t.ok && t.output && typeof t.output === "object" ? (t.output.link as string | undefined) : undefined;
  return (
    <div className="rounded-[6px] border border-app-line bg-app-card text-[12.5px]">
      <div className="flex items-center gap-2 px-3 py-1.5">
        {t.ok ? <Check size={13} className="text-brand-green" /> : <X size={13} className="text-destructive" />}
        <Wrench size={12} className="text-ink-navy/45" />
        <span className="flex-1">{TOOL_LABELS[t.name] ?? t.name}{t.ok ? "" : " — failed"}</span>
        {link ? <Link to={link as "/agent"} className="text-cerulean hover:underline">Open</Link> : null}
        <button type="button" onClick={() => setOpen(!open)} aria-label="Details"><ChevronDown size={13} className={open ? "rotate-180" : ""} /></button>
      </div>
      {open ? <pre className="max-h-48 overflow-auto border-t border-app-line px-3 py-2 text-[11px] text-ink-navy/70">{JSON.stringify({ input: t.input, output: t.output }, null, 2)}</pre> : null}
    </div>
  );
}
