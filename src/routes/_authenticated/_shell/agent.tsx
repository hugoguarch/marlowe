import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUp, Check, Circle, Globe, Loader2, Megaphone, Palette, Plus, Sparkles, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import aerial from "@/assets/wm-london-aerial.jpg.asset.json";
import facade from "@/assets/wm-glass-facade.png.asset.json";
import bigben from "@/assets/wm-big-ben.jpg.asset.json";
import { usePulse } from "@/components/pulse/context";
import { chatWithMarlowe, getChatHistory } from "@/lib/marlowe.functions";
import { chatSeed } from "@/lib/mock/workspace";

export const Route = createFileRoute("/_authenticated/_shell/agent")({
  validateSearch: z.object({ q: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Agent — Why Media AI" },
      { name: "description", content: "Brief the Why Media agent and review the plan it builds across departments." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgentPage,
});

type Message = { role: string; body: string };

// TODO: wire to API — conversation threads and plan are not stored yet.
const THREADS = [
  ["November launch — Nine Elms", "Savills · now"],
  ["Why did CPL rise last week?", "ENA · 2h"],
  ["Rewrite About page for AEO", "Devine Group · yesterday"],
  ["Investor email subject lines", "Blue Whale · yesterday"],
  ["Reel from site visit footage", "Statom Group · Mon"],
];
const PLAN = [
  { dept: "Marketing", icon: Megaphone, items: [["Content calendar — 16 posts", "done"], ["Meta + LinkedIn lead-gen setup", "todo"]] },
  { dept: "Design", icon: Palette, items: [["Week 1 stills (4)", "done"], ["Weeks 2–4 stills (12)", "run"]] },
  { dept: "Video", icon: Video, items: [["30s walkthrough from RAW", "run"], ["Motion title cards", "todo"]] },
  { dept: "Web", icon: Globe, items: [["Landing page /nine-elms", "done"], ["2 SEO articles", "todo"]] },
];

function AgentPage() {
  const { q } = Route.useSearch();
  const { client, clientId } = usePulse();
  const [messages, setMessages] = useState<Message[]>(chatSeed);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [thread, setThread] = useState(0);
  const loadHistory = useServerFn(getChatHistory);
  const sendMessage = useServerFn(chatWithMarlowe);
  const end = useRef<HTMLDivElement>(null);
  const sentQ = useRef(false);

  useEffect(() => {
    loadHistory().then((rows) => rows.length && setMessages(rows.map((r) => ({ role: r.role, body: r.body })))).catch(() => {});
  }, [loadHistory]);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [messages, busy]);
  useEffect(() => {
    if (q && !sentQ.current) { sentQ.current = true; void send(q); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function send(text: string) {
    text = text.trim();
    if (!text || busy) return;
    setDraft("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", body: text }]);
    try {
      const { reply } = await sendMessage({ data: { body: text } });
      setMessages((m) => [...m, { role: "marlowe", body: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "marlowe", body: "I couldn't reach the workspace just then. Try me again." }]);
    } finally {
      setBusy(false);
    }
  }

  const acct = clientId === "all" ? "All accounts" : (client?.name ?? "");

  return (
    <div className="grid h-[calc(100vh-60px)] grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <aside className="flex flex-col border-r border-app-line bg-app-card">
        <div className="flex items-center justify-between px-4 py-4">
          <span className="text-[15px] font-medium">Conversations</span>
          <button aria-label="New conversation" className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-app-line"><Plus size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {THREADS.map(([t, m], i) => (
            <button key={t} onClick={() => setThread(i)} className={`block w-full border-l-2 px-4 py-3 text-left ${i === thread ? "border-cerulean bg-app-bg" : "border-transparent hover:bg-app-bg/60"}`}>
              <p className="truncate text-[13.5px]">{t}</p>
              <p className="text-[12px] text-ink-navy/55">{m}</p>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col">
        <div className="flex items-center gap-3 border-b border-app-line bg-app-card px-6 py-3.5">
          <span className="text-[15px] font-medium">{THREADS[thread]![0]}</span>
          <span className="text-[12.5px] text-ink-navy/55">Working in {acct}</span>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[70%] rounded-[8px] bg-ink-navy px-4 py-3 text-[14px] leading-relaxed text-white">{m.body}</div>
              </div>
            ) : (
              <div key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cerulean text-white"><Sparkles size={14} /></span>
                <div className="max-w-[78%] space-y-3">
                  <div className="rounded-[8px] border border-app-line bg-app-card px-4 py-3 text-[14px] leading-relaxed">{m.body}</div>
                  {i === 1 ? <Artifacts /> : null}
                </div>
              </div>
            ),
          )}
          {busy ? <p className="flex items-center gap-2 text-[12.5px] text-ink-navy/55"><Loader2 size={14} className="animate-spin" /> Agent is working…</p> : null}
          <div ref={end} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void send(draft); }} className="border-t border-app-line bg-app-card p-4">
          <div className="flex items-end gap-2 rounded-[8px] border border-app-line bg-app-bg px-3 py-2 focus-within:border-cerulean">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(draft); } }}
              rows={1}
              placeholder="Ask, redirect, or drop a thought"
              className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-[14px] outline-none placeholder:text-ink-navy/40"
            />
            <button type="submit" disabled={busy || !draft.trim()} aria-label="Send" className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-cerulean text-white disabled:opacity-40"><ArrowUp size={16} /></button>
          </div>
        </form>
      </section>

      <aside className="hidden overflow-y-auto border-l border-app-line bg-app-card p-5 2xl:block">
        <div className="flex items-center gap-2"><span className="text-[15px] font-medium">Plan</span><span className="text-[12px] text-ink-navy/55">Preview</span></div>
        <div className="mt-5 space-y-5">
          {PLAN.map((g) => (
            <div key={g.dept}>
              <p className="kicker flex items-center gap-2 text-ink-navy/50"><g.icon size={13} />{g.dept}</p>
              <ul className="mt-2 space-y-1.5">
                {g.items.map(([t, s]) => (
                  <li key={t} className="flex items-center gap-2.5 rounded-[6px] border border-app-line px-3 py-2 text-[13px]">
                    {s === "done" ? <Check size={14} className="text-brand-green" /> : s === "run" ? <Loader2 size={14} className="animate-spin text-cerulean" /> : <Circle size={14} className="text-ink-navy/30" />}
                    <span className="flex-1">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Artifacts() {
  const posts = [[aerial.url, "Nine Elms, Reimagined"], [facade.url, "420 New Homes on the River"], [bigben.url, "12 Minutes to Westminster"]];
  return (
    <div className="grid grid-cols-3 gap-2">
      {posts.map(([src, h]) => (
        <div key={h} className="overflow-hidden rounded-[6px] border border-app-line bg-app-card">
          <img src={src} alt="" className="aspect-square w-full object-cover" />
          <p className="truncate px-2 py-1.5 text-[12px]">{h}</p>
        </div>
      ))}
    </div>
  );
}
