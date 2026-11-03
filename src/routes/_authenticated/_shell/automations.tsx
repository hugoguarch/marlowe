import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, CalendarClock, Lightbulb, Loader2, Mail, MessageSquareText, Send, X } from "lucide-react";
import { useState, type ComponentType } from "react";
import { toast } from "sonner";

import { usePulse } from "@/components/pulse/context";
import { cancelAgentTask, createAgentTask, listAgentTasks } from "@/lib/marlowe.functions";

export const Route = createFileRoute("/_authenticated/_shell/automations")({
  head: () => ({
    meta: [
      { title: "Automations — Why Media AI" },
      { name: "description", content: "Ready-made recipes the agent runs on a schedule: reports, post ideas, posts and email reviews." },
      { property: "og:title", content: "Automations — Why Media AI" },
      { property: "og:description", content: "Ready-made recipes the agent runs on a schedule." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Automations,
});

type Recipe = { id: string; title: string; summary: string; icon: ComponentType<{ className?: string }>; repeat: "daily" | "weekly" | "monthly"; time: string; prompt: string; firstRun: () => Date };

const at = (d: Date, hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); d.setHours(h!, m!, 0, 0); return d; };
const nextFirst = () => { const d = new Date(); d.setMonth(d.getMonth() + 1, 1); return d; };
const nextMonday = () => { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return d; };
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d; };

const RECIPES: Recipe[] = [
  { id: "report", title: "Monthly report on the 1st", summary: "Builds last month's marketing report from live analytics and posts it to a chat.", icon: BarChart3, repeat: "monthly", time: "09:00", firstRun: nextFirst, prompt: "Make the monthly marketing report for the previous month for this client using create_report, then summarise the three biggest changes." },
  { id: "ideas", title: "Weekly post ideas", summary: "Every Monday, 6 ideas based on the best posts and videos from last week.", icon: Lightbulb, repeat: "weekly", time: "09:00", firstRun: nextMonday, prompt: "Using get_top_posts and get_analytics for the last 4 weeks, propose 6 post ideas for this client with hook, format and channel. Do not create posts." },
  { id: "posts", title: "Daily scheduled post", summary: "Designs one on-brand post each day and puts it in the Post Scheduler.", icon: Send, repeat: "daily", time: "08:00", firstRun: tomorrow, prompt: "Design one on-brand post for this client for today at 18:00 UK time with create_post, picking the format that performed best recently. Do not repeat a topic from the last 7 days (check list_schedule)." },
  { id: "email", title: "Weekly email performance", summary: "Reviews open, click and reply rates from connected email apps.", icon: Mail, repeat: "weekly", time: "10:00", firstRun: nextMonday, prompt: "Follow the Email performance review skill for the last 7 days and list 3 changes for next week. If no email app is connected, say so." },
  { id: "reviews", title: "Weekly reviews digest", summary: "Summarises new Google reviews and drafts replies for approval.", icon: MessageSquareText, repeat: "weekly", time: "09:30", firstRun: nextMonday, prompt: "Follow the Review replies skill for reviews from the last 7 days. Show drafts only; never post replies." },
];

function Automations() {
  const qc = useQueryClient();
  const { client, clientId } = usePulse();
  const tasks = useQuery({ queryKey: ["agent-tasks"], queryFn: useServerFn(listAgentTasks) });
  const create = useServerFn(createAgentTask);
  const cancel = useServerFn(cancelAgentTask);
  const [busy, setBusy] = useState<string | null>(null);
  const [times, setTimes] = useState<Record<string, string>>({});
  const rows = ((tasks.data as any)?.tasks ?? tasks.data ?? []) as { id: string; prompt: string; run_at: string; repeat: string; status: string; client_id?: string | null }[];
  const active = rows.filter((t) => t.status !== "cancelled" && t.status !== "done");
  const hasClient = client && clientId !== "all";

  async function turnOn(r: Recipe) {
    if (!hasClient) { toast.error("Pick one account in the top-left switcher first"); return; }
    setBusy(r.id);
    try {
      const first = at(r.firstRun(), times[r.id] ?? r.time);
      await create({ data: { prompt: `[${r.title} · ${client!.name}] ${r.prompt}`, runAt: first.toISOString(), repeat: r.repeat, clientId: client!.id } });
      toast.success(`${r.title} is on. First run ${first.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`);
      qc.invalidateQueries({ queryKey: ["agent-tasks"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Automations</h1>
        <p className="mt-1 text-sm text-muted-foreground">Turn on a recipe and the agent runs it for {hasClient ? client!.name : "the selected account"}. Results land in their own Agent chat. You can also just ask the agent to schedule something.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {RECIPES.map((r) => {
          const on = active.some((t) => t.prompt.startsWith(`[${r.title} · ${client?.name}]`));
          return (
            <div key={r.id} className="flex flex-col rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><r.icon className="h-5 w-5" /></div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] capitalize text-muted-foreground">{r.repeat}</span>
              </div>
              <h3 className="mt-4 font-semibold text-foreground">{r.title}</h3>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{r.summary}</p>
              <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <input type="time" value={times[r.id] ?? r.time} onChange={(e) => setTimes((s) => ({ ...s, [r.id]: e.target.value }))} className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground" />
                {on ? <span className="ml-auto rounded-lg border border-primary px-3 py-1.5 text-xs font-medium text-primary">On</span> : (
                  <button disabled={busy === r.id} onClick={() => turnOn(r)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">{busy === r.id && <Loader2 className="h-3 w-3 animate-spin" />}Turn on</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Running</h2>
        {active.length === 0 ? <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p> : (
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {active.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-foreground">{t.prompt}</div>
                  <div className="text-xs text-muted-foreground">Next {new Date(t.run_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {t.repeat === "none" ? "once" : t.repeat}</div>
                </div>
                <button aria-label="Stop" onClick={async () => { await cancel({ data: { id: t.id } }); qc.invalidateQueries({ queryKey: ["agent-tasks"] }); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
