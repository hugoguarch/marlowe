import { createFileRoute } from "@tanstack/react-router";
import { ArrowUp, Check, FileCode, Folder, Layers, LayoutTemplate, Loader2, Shapes } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import towers from "@/assets/wm-london-city-dusk.jpg.asset.json";
import veroLogo from "@/assets/wm-logo-color.png.asset.json";
import { PreviewTag } from "@/components/shell/Preview";
import { noindex } from "@/components/shell/SimpleScreen";
import { btnDark, Segmented, Title, WmCard } from "@/components/shell/ui";

type Mode = "ai" | "visual" | "code";

export const Route = createFileRoute("/_authenticated/_shell/web/site-builder")({
  validateSearch: z.object({ mode: z.enum(["ai", "visual", "code"]).optional() }),
  head: () => noindex("Site Builder", "Build and edit client websites with AI, visually or in code."),
  component: SiteBuilder,
});

// TODO: wire to API — one page model shared by all three modes.
type Section = { id: string; kind: string; heading: string; body: string };
const INITIAL: Section[] = [
  { id: "hero", kind: "Hero", heading: "Property finance, decided in days.", body: "Bridging, development and BTL lending for London investors." },
  { id: "stats", kind: "Key figures", heading: "£1.2bn lent since 2014", body: "9-day average completion · 70% max LTV" },
  { id: "cta", kind: "Call to action", heading: "Speak to an expert", body: "A real lender, not a call centre." },
];

/** Client preview canvas — rendered in the account's brand kit (Vero Finance), not Why Media's. */
function Canvas({ page, selected, onSelect }: { page: Section[]; selected?: string; onSelect?: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-[6px] bg-[#fbfaf6] shadow-[0_12px_30px_rgba(0,28,38,0.12)]" style={{ fontFamily: "Georgia, serif", color: "#16301f" }}>
      <div className="flex items-center justify-between px-6 py-3.5"><img src={veroLogo.url} alt="Vero Finance" className="h-6 w-auto" /><span className="text-[12px] opacity-70">Lending · About · Contact</span></div>
      {page.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect?.(s.id)}
          className={`block w-full text-left outline-2 -outline-offset-2 ${selected === s.id ? "outline outline-[#036c89]" : "hover:outline hover:outline-[#036c89]/40"}`}
        >
          {s.id === "hero" ? (
            <div className="relative">
              <img src={towers.url} alt="" className="aspect-[16/7] w-full object-cover" />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-[#0c2015]/80 to-transparent p-6 text-white">
                <p className="text-[26px] leading-tight">{s.heading}</p>
                <p className="mt-1 text-[13px] opacity-85">{s.body}</p>
              </div>
            </div>
          ) : (
            <div className={`px-6 py-6 ${s.id === "cta" ? "bg-[#1e5631] text-white" : ""}`}>
              <p className="text-[20px]">{s.heading}</p>
              <p className="mt-1 text-[13px] opacity-75">{s.body}</p>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function SiteBuilder() {
  const { mode = "ai" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [page, setPage] = useState(INITIAL);
  const [sel, setSel] = useState("hero");
  const setMode = (m: Mode) => navigate({ search: { mode: m }, replace: true });
  const update = (id: string, patch: Partial<Section>) => setPage((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const current = page.find((s) => s.id === sel)!;

  return (
    <div className="space-y-5">
      <Title
        title="Site Builder"
        sub="vero.finance / home"
        action={
          <div className="flex items-center gap-2">
            <PreviewTag />
            <Segmented<Mode> value={mode} onChange={setMode} options={[{ id: "ai", label: "AI Builder" }, { id: "visual", label: "Visual" }, { id: "code", label: "Code" }]} />
            <button className={btnDark}>Publish</button>
          </div>
        }
      />

      {mode === "ai" ? (
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <WmCard className="flex flex-col">
            <div className="flex-1 space-y-4 p-5 text-[13.5px]">
              <div className="ml-auto max-w-[85%] rounded-[8px] bg-ink-navy px-3.5 py-2.5 text-white">Make the home page lead with speed of decision.</div>
              <div className="space-y-2 rounded-[8px] border border-app-line p-3.5">
                {[["Rewrote hero headline", "done"], ["Added key figures strip", "done"], ["Tightening call to action", "run"]].map(([t, s]) => (
                  <p key={t} className="flex items-center gap-2">{s === "done" ? <Check size={14} className="text-brand-green" /> : <Loader2 size={14} className="animate-spin text-cerulean" />}{t}</p>
                ))}
              </div>
              <div>
                <p className="kicker text-ink-navy/50">Versions</p>
                <div className="mt-2 flex gap-1.5">{["v3", "v2", "v1"].map((v, i) => <span key={v} className={`rounded-full px-2.5 py-1 text-[12px] ${i === 0 ? "bg-cerulean text-white" : "bg-wm-grey-2"}`}>{v}</span>)}</div>
              </div>
              <div>
                <p className="kicker text-ink-navy/50">Suggestions</p>
                <ul className="mt-2 space-y-1.5">{["Add a testimonials section", "Add FAQ schema for AI search", "Shorten the hero subline"].map((s) => <li key={s} className="rounded-[6px] border border-app-line px-3 py-2">{s}</li>)}</ul>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-app-line p-3">
              <input placeholder="Describe a change…" className="h-9 flex-1 rounded-[6px] border border-app-line bg-app-bg px-3 text-[13px] outline-none focus:border-cerulean" />
              <button aria-label="Send" className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-cerulean text-white"><ArrowUp size={16} /></button>
            </div>
          </WmCard>
          <div className="rounded-[8px] bg-wm-grey-2 p-5"><Canvas page={page} /></div>
        </div>
      ) : mode === "visual" ? (
        <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_260px]">
          <WmCard className="p-4">
            <div className="flex gap-3 text-[12px] text-ink-navy/60"><span className="flex items-center gap-1 font-medium text-ink-navy"><LayoutTemplate size={13} />Layouts</span><span className="flex items-center gap-1"><Shapes size={13} />Elements</span><span className="flex items-center gap-1"><Layers size={13} />Layers</span></div>
            <div className="mt-4 space-y-2">
              {page.map((s) => (
                <button key={s.id} onClick={() => setSel(s.id)} className={`block w-full rounded-[6px] border px-3 py-2.5 text-left text-[13px] ${sel === s.id ? "border-cerulean bg-cerulean/5" : "border-app-line"}`}>
                  <span className="kicker block text-ink-navy/45">{s.kind}</span>
                  <span className="mt-0.5 block truncate">{s.heading}</span>
                </button>
              ))}
            </div>
          </WmCard>
          <div className="rounded-[8px] bg-wm-grey-2 p-5"><Canvas page={page} selected={sel} onSelect={setSel} /></div>
          <WmCard className="space-y-4 p-4 text-[13px]">
            <p className="kicker text-ink-navy/50">Inspector · {current.kind}</p>
            <label className="block"><span className="text-[12px] text-ink-navy/55">Heading</span><input value={current.heading} onChange={(e) => update(sel, { heading: e.target.value })} className="mt-1 h-9 w-full rounded-[6px] border border-app-line px-2.5 outline-none focus:border-cerulean" /></label>
            <label className="block"><span className="text-[12px] text-ink-navy/55">Body</span><textarea value={current.body} onChange={(e) => update(sel, { body: e.target.value })} rows={3} className="mt-1 w-full rounded-[6px] border border-app-line px-2.5 py-2 outline-none focus:border-cerulean" /></label>
            <div><span className="text-[12px] text-ink-navy/55">Spacing</span><div className="mt-1 grid grid-cols-4 gap-1.5">{["24", "24", "24", "24"].map((v, i) => <input key={i} defaultValue={v} className="h-8 rounded-[6px] border border-app-line px-2 text-center" />)}</div></div>
            <div><span className="text-[12px] text-ink-navy/55">Typography</span><p className="mt-1 rounded-[6px] border border-app-line px-2.5 py-2">Georgia · 26 / 1.2</p></div>
            <div><span className="text-[12px] text-ink-navy/55">Colours (client kit)</span><div className="mt-1.5 flex gap-1.5">{["#1e5631", "#16301f", "#c9a24a", "#fbfaf6"].map((c) => <span key={c} className="h-7 w-7 rounded-[6px] border border-app-line" style={{ background: c }} />)}</div></div>
          </WmCard>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[200px_minmax(0,1fr)_minmax(0,0.9fr)]">
          <WmCard className="p-3 text-[13px]">
            {[["app", true], ["  page.tsx", false], ["  layout.tsx", false], ["components", true], ["  Hero.tsx", false], ["  KeyFigures.tsx", false], ["  Cta.tsx", false]].map(([f, dir]) => (
              <p key={f as string} className={`flex items-center gap-1.5 rounded-[4px] px-2 py-1 ${f === "  Hero.tsx" ? "bg-app-bg font-medium" : ""}`} style={{ paddingLeft: (f as string).startsWith("  ") ? 22 : 8 }}>
                {dir ? <Folder size={13} className="text-ink-navy/50" /> : <FileCode size={13} className="text-ink-navy/50" />}{(f as string).trim()}
              </p>
            ))}
          </WmCard>
          <WmCard dark className="overflow-auto p-4 font-mono text-[12.5px] leading-6">
            {[
              ["export function Hero() {", ""],
              ["  return (", ""],
              ['    <section className="hero">', ""],
              [`      <h1>${page[0]!.heading}</h1>`, "add"],
              [`      <p>${page[0]!.body}</p>`, "add"],
              ["    </section>", ""],
              ["  );", ""],
              ["}", ""],
            ].map(([l, k], i) => (
              <div key={i} className={`flex gap-4 ${k === "add" ? "-mx-4 bg-brand-green/25 px-4" : ""}`}><span className="w-4 text-right text-white/30">{i + 1}</span><span className="whitespace-pre text-white/90">{l}</span></div>
            ))}
            <p className="mt-4 text-[11.5px] text-white/45">Highlighted lines were changed by the agent.</p>
          </WmCard>
          <div className="rounded-[8px] bg-wm-grey-2 p-4"><Canvas page={page} /></div>
        </div>
      )}
    </div>
  );
}
