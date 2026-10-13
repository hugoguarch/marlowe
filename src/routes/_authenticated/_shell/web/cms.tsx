import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Image as ImageIcon, Link2, Plus, Sparkles, Type } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { PreviewTag } from "@/components/shell/Preview";
import { IMAGES, noindex } from "@/components/shell/SimpleScreen";
import { Badge, btnDark, btnGhost, Segmented, Title, WmCard } from "@/components/shell/ui";

export const Route = createFileRoute("/_authenticated/_shell/web/cms")({
  validateSearch: z.object({ view: z.enum(["list", "edit"]).optional(), entry: z.number().optional() }),
  head: () => noindex("CMS", "Manage website content, collections and SEO for each account."),
  component: Cms,
});

// TODO: wire to API — CMS collections and entries.
const COLLECTIONS = ["Insights", "Case studies", "Services", "Team", "Key figures", "Testimonials", "FAQs"];
const SYSTEM = ["Pages", "Media", "Redirects", "Locales"];
const ENTRIES = [
  ["Bridging finance in 2026: what's changed", "Published", "Market insight", "A. Hart", 92, "2h ago"],
  ["How we completed a £4.2M bridge in 9 days", "Published", "Case study", "J. Okafor", 88, "Yesterday"],
  ["Development finance: a first-timer's guide", "Draft", "Guide", "Agent", 74, "Yesterday"],
  ["BTL rates after the autumn statement", "In review", "Market insight", "Agent", 81, "Mon"],
  ["Refurbishment loans explained", "Scheduled", "Guide", "A. Hart", 90, "2 Oct"],
] as const;
const TONE = { Published: "green", Draft: "muted", "In review": "cerulean", Scheduled: "ink" } as const;

function Cms() {
  const { view = "list", entry = 0 } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [col, setCol] = useState("Insights");
  return (
    <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
      <WmCard className="h-fit p-3">
        <p className="kicker px-2 pt-1 pb-2 text-ink-navy/45">Collections</p>
        {COLLECTIONS.map((c) => (
          <button key={c} onClick={() => { setCol(c); navigate({ search: {} }); }} className={`block w-full rounded-[6px] px-2.5 py-2 text-left text-[13.5px] ${c === col ? "bg-app-bg font-medium" : "text-ink-navy/70 hover:bg-app-bg"}`}>{c}</button>
        ))}
        <div className="mt-2 border-t border-app-line pt-2">
          {SYSTEM.map((c) => <p key={c} className="px-2.5 py-2 text-[13.5px] text-ink-navy/60">{c}</p>)}
        </div>
      </WmCard>
      {view === "list" ? <List col={col} onOpen={(i) => navigate({ search: { view: "edit", entry: i } })} /> : <Editor i={entry} onBack={() => navigate({ search: {} })} />}
    </div>
  );
}

function List({ col, onOpen }: { col: string; onOpen: (i: number) => void }) {
  return (
    <div className="min-w-0 space-y-5">
      <Title title={col} sub={`${ENTRIES.length} entries`} action={<div className="flex gap-2"><PreviewTag /><button className={btnDark}><Plus size={14} />New entry</button></div>} />
      <WmCard>
        <table className="w-full text-[13.5px]">
          <thead className="text-left text-[12px] text-ink-navy/55">
            <tr className="border-b border-app-line">{["Title", "Status", "Category", "Author", "SEO", "Updated"].map((h, i) => <th key={h} className={`py-2.5 font-normal ${i === 0 ? "px-5" : ""}`}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {ENTRIES.map(([t, s, c, a, seo, u], i) => (
              <tr key={t} onClick={() => onOpen(i)} className="cursor-pointer border-b border-app-line last:border-0 hover:bg-app-bg/60">
                <td className="max-w-0 truncate px-5 py-3">{t}</td>
                <td><Badge tone={TONE[s]}>{s}</Badge></td>
                <td className="text-ink-navy/70">{c}</td>
                <td className="text-ink-navy/70">{a}</td>
                <td><span className={seo >= 85 ? "text-brand-green" : "text-ink-navy/70"}>{seo}</span></td>
                <td className="pr-5 text-ink-navy/55">{u}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </WmCard>
    </div>
  );
}

function Editor({ i, onBack }: { i: number; onBack: () => void }) {
  const e = ENTRIES[i] ?? ENTRIES[0];
  const [tab, setTab] = useState<"content" | "meta" | "seo" | "ai">("content");
  const [pub, setPub] = useState(e[1] === "Published");
  return (
    <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className={btnGhost}><ArrowLeft size={14} />Back</button>
          <Segmented value={tab} onChange={setTab} options={[{ id: "content", label: "Content" }, { id: "meta", label: "Meta" }, { id: "seo", label: "SEO" }, { id: "ai", label: "AI Search" }]} />
          <span className="ml-auto"><PreviewTag /></span>
        </div>
        <WmCard className="space-y-4 p-6">
          <input defaultValue={e[0]} className="w-full text-[28px] font-light tracking-[-0.02em] outline-none" />
          {tab === "content" ? (
            <>
              <Block icon={Type} label="Rich text"><p className="text-[14px] leading-relaxed text-ink-navy/80">When the auction clock is running, speed of decision matters more than headline rate. Here's how the deal came together…</p></Block>
              <Block icon={ImageIcon} label="Image"><img src={IMAGES[3]} alt="" className="aspect-[16/7] w-full rounded-[6px] object-cover" /></Block>
              <Block icon={Link2} label="Linked block"><p className="text-[13.5px]">Service · Bridging finance</p></Block>
              <div className="rounded-[8px] border border-dashed border-app-line p-4">
                <p className="flex items-center gap-2 text-[13px] font-medium"><Plus size={14} />Add block</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[12.5px]">
                  {["FAQ: How fast can you complete?", "Key figures strip", "Testimonial from the client"].map((s) => <span key={s} className="flex items-center gap-1.5 rounded-full bg-cerulean/10 px-3 py-1 text-cerulean"><Sparkles size={12} />{s}</span>)}
                </div>
              </div>
            </>
          ) : (
            <p className="text-[13.5px] text-ink-navy/60">{{ meta: "Slug, excerpt and social image.", seo: "Title tag, meta description and target keywords.", ai: "Prompts this page should answer and whether AI engines cite it." }[tab]}</p>
          )}
        </WmCard>
      </div>
      <div className="space-y-4">
        <WmCard className="space-y-3 p-5 text-[13px]">
          {[["Author", e[3]], ["Date", e[5]], ["Category", e[2]], ["Related service", "Bridging finance"]].map(([k, v]) => (
            <div key={k}><p className="text-[12px] text-ink-navy/55">{k}</p><p className="mt-0.5">{v}</p></div>
          ))}
          <label className="flex items-center justify-between border-t border-app-line pt-3">Published<input type="checkbox" checked={pub} onChange={(x) => setPub(x.target.checked)} className="accent-cerulean" /></label>
        </WmCard>
        <WmCard dark className="p-5">
          <p className="kicker text-white/55">SEO score</p>
          <p className="mt-2 text-[40px] leading-none font-light">{e[4]}</p>
          <ul className="mt-3 space-y-1 text-[12.5px] text-wm-grey-3"><li>Title length good</li><li>Add 1 internal link</li><li>FAQ schema missing</li></ul>
        </WmCard>
      </div>
    </div>
  );
}

function Block({ icon: Icon, label, children }: { icon: typeof Type; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[8px] border border-app-line p-4">
      <p className="kicker mb-2 flex items-center gap-1.5 text-ink-navy/45"><Icon size={12} />{label}</p>
      {children}
    </div>
  );
}
