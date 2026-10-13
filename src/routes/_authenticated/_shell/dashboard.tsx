import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Eye, Film, Globe, Image, Mail, PoundSterling, Target, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import demoFilm from "@/assets/marlowe-demo-film.mp4.asset.json";
import demoThumb from "@/assets/marlowe-demo-thumb.jpg.asset.json";
import { usePulse } from "@/components/pulse/context";
import { useKpis } from "@/components/pulse/useKpis";
import { KpiCard } from "@/components/shell/KpiCard";
import { Badge, btnGhost, CardHead, EmptyState, Segmented, Skeleton, Title, WmCard } from "@/components/shell/ui";
import { supabase } from "@/integrations/supabase/client";
import { generateBrief } from "@/lib/marlowe.functions";

export const Route = createFileRoute("/_authenticated/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Why Media AI" },
      { name: "description", content: "Agent activity, headline numbers and approvals across every account." },
      { property: "og:title", content: "Dashboard — Why Media AI" },
      { property: "og:description", content: "Agent activity, headline numbers and approvals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

type Dept = "all" | "Marketing" | "Design" | "Video" | "Web";

// TODO: wire to API — live agent task feed.
const TASKS = [
  { icon: Film, task: "Cutting 30s site walkthrough from 42 RAW clips", dept: "Video", client: "Savills", pct: 68, time: "now" },
  { icon: Image, task: "Designing 12 carousel slides — Q4 market update", dept: "Design", client: "CLS", pct: 90, time: "2m" },
  { icon: Globe, task: "Fixing 3 broken links + schema on /developments", dept: "Web", client: "Devine Group", pct: 45, time: "6m" },
  { icon: Target, task: "Rebalancing LinkedIn lead-gen budget", dept: "Marketing", client: "ENA", pct: 100, time: "11m" },
  { icon: Mail, task: "Writing November investor newsletter", dept: "Marketing", client: "Blue Whale", pct: 30, time: "14m" },
];

type Approval = { id: string; label: string; detail: string | null; kind: string };

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { kpis, q } = useKpis();
  const { clientId, client } = usePulse();
  const [dept, setDept] = useState<Dept>("all");
  const [approvals, setApprovals] = useState<Approval[] | null>(null);
  const [brief, setBrief] = useState<string[] | null>(null);
  const loadBrief = useServerFn(generateBrief);

  useEffect(() => {
    supabase
      .from("action_queue")
      .select("id, label, detail, kind")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data, error }) => setApprovals(error ? [] : (data ?? [])));
    loadBrief().then((b) => setBrief(b.body)).catch(() => setBrief([]));
  }, [loadBrief]);

  async function decide(id: string, status: "approved" | "rejected") {
    const prev = approvals;
    setApprovals((a) => a?.filter((x) => x.id !== id) ?? null);
    const { error } = await supabase.from("action_queue").update({ status }).eq("id", id);
    if (error) {
      setApprovals(prev);
      toast.error("That didn't save. Try again.");
    } else toast.success(status === "approved" ? "Approved" : "Rejected");
  }

  const name = (user.email?.split("@")[0] ?? "there").split(/[._-]/)[0]!;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const byKey = Object.fromEntries(kpis.map((k) => [k.id, k]));
  const tasks = TASKS.filter((t) => dept === "all" || t.dept === dept);
  const where = clientId === "all" ? "all accounts" : (client?.name ?? "this account");

  return (
    <div className="space-y-[22px]">
      <Title
        title={`${greet}, ${name.charAt(0).toUpperCase()}${name.slice(1)}`}
        sub={
          <>
            Showing <b className="font-medium text-ink-navy">{where}</b>.{" "}
            {approvals?.length ? `${approvals.length} item${approvals.length === 1 ? " is" : "s are"} waiting for your approval.` : "Nothing is waiting for approval."}
          </>
        }
        action={
          <Segmented<Dept>
            value={dept}
            onChange={setDept}
            options={[{ id: "all", label: "All" }, { id: "Marketing", label: "Marketing" }, { id: "Design", label: "Design" }, { id: "Video", label: "Video" }, { id: "Web", label: "Web" }]}
          />
        }
      />

      <div className="grid grid-cols-2 gap-4 2xl:grid-cols-4">
        <KpiCard k={{ id: "leads", label: "Agent tasks this month", value: null, prev: null, kind: "int", points: [] }} icon={Zap} />
        <KpiCard k={byKey.reach!} icon={Eye} loading={q.isLoading} sub="Across connected social profiles" />
        <KpiCard k={byKey.leads!} icon={Target} loading={q.isLoading} sub="Website conversions" />
        <KpiCard k={byKey.spend!} icon={PoundSterling} loading={q.isLoading} sub="Meta ads, this period" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <WmCard>
          <CardHead
            title={<span className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-brand-green" />Live agent activity</span>}
            meta={`${tasks.filter((t) => t.pct < 100).length} running`}
            action={<Badge>Preview</Badge>}
          />
          {tasks.length ? (
            tasks.map((t) => (
              <div key={t.task} className="grid grid-cols-[32px_minmax(0,1fr)_110px_130px_40px] items-center gap-3.5 border-b border-app-line px-5 py-3 text-[13.5px] last:border-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-app-bg"><t.icon size={16} strokeWidth={1.75} /></span>
                <div className="min-w-0">
                  <p className="truncate">{t.task}</p>
                  <p className="text-[12px] text-ink-navy/55">{t.dept} agent</p>
                </div>
                <span className="truncate text-[13px]">{t.client}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-wm-grey-2">
                    <div className={`h-full ${t.pct === 100 ? "bg-brand-green" : "bg-cerulean"}`} style={{ width: `${t.pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-[12px] text-ink-navy/55">{t.pct}%</span>
                </div>
                <span className="text-right text-[12px] text-ink-navy/55">{t.time}</span>
              </div>
            ))
          ) : (
            <EmptyState title="Nothing running in this department" />
          )}
        </WmCard>

        <WmCard>
          <CardHead
            title={<span className="flex items-center gap-2">Awaiting your approval{approvals?.length ? <Badge tone="ink">{approvals.length}</Badge> : null}</span>}
          />
          {approvals === null ? (
            <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : approvals.length ? (
            approvals.map((a) => (
              <div key={a.id} className="flex items-center gap-3 border-b border-app-line px-5 py-3 last:border-0">
                <span className="h-10 w-10 shrink-0 rounded-[6px] bg-app-bg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px]">{a.label}</p>
                  <p className="truncate text-[12px] text-ink-navy/55">{a.detail ?? a.kind}</p>
                </div>
                <button onClick={() => decide(a.id, "rejected")} aria-label="Reject" className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] border border-app-line hover:border-ink-navy/40"><X size={14} /></button>
                <button onClick={() => decide(a.id, "approved")} aria-label="Approve" className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] bg-ink-navy text-white hover:bg-cerulean"><Check size={14} /></button>
              </div>
            ))
          ) : (
            <EmptyState title="All clear" body="Anything the agents prepare for you to sign off appears here." />
          )}
        </WmCard>
      </div>

      <WmCard>
        <CardHead title="This morning's brief" action={<Link to="/agent" className={btnGhost}>Talk to the agent</Link>} />
        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <video controls poster={demoThumb.url} src={demoFilm.url} className="aspect-video w-full rounded-[6px] bg-ink-navy object-cover" />
          <div className="space-y-3 text-[13.5px] leading-relaxed text-ink-navy/75">
            {brief === null ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-4" />) : brief.map((p) => <p key={p}>{p}</p>)}
          </div>
        </div>
      </WmCard>
    </div>
  );
}
