import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDown, ArrowUp, Check, Code2, ExternalLink, Eye, EyeOff, FileCode, Folder, Layers, LayoutTemplate,
  Loader2, Monitor, Plus, Search, Send, Shapes, Smartphone, Trash2, Wand2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { noindex } from "@/components/shell/SimpleScreen";
import { Segmented } from "@/components/shell/ui";
import {
  newSection, SECTION_LABELS, SECTION_TYPES, sectionCode, SitePage, starterPage,
  type SectionType, type SiteSection,
} from "@/components/site/SitePage";
import { supabase } from "@/integrations/supabase/client";
import { useBrandTheme } from "@/lib/brandTheme";
import { buildSite } from "@/lib/site.functions";

type Mode = "ai" | "visual" | "code";

export const Route = createFileRoute("/_authenticated/_shell/web/site-builder")({
  validateSearch: z.object({ mode: z.enum(["ai", "visual", "code"]).optional() }),
  head: () => noindex("Site Builder", "Build and edit each client's website with AI, visually or in code."),
  component: SiteBuilder,
});

type Page = { id: string; title: string; slug: string; status: string; sections: SiteSection[]; updated_at: string; published_at: string | null };
type Version = { id: string; sections: SiteSection[]; note: string | null; created_at: string };
type Msg = { role: "user" | "agent"; text: string; steps?: string[] };

const PAGE_PRESETS = ["Home", "Services", "About", "Case Studies", "Contact"];
const CHIPS = ["Add a loan calculator", "Make the hero shorter", "Write the services section", "Add a contact form"];
const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "page";
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(iso).toLocaleDateString("en-GB");
};
const filled = (s: Partial<SiteSection> & { type: string }, keep?: SiteSection): SiteSection => ({
  ...newSection(s.type as SectionType), ...(keep ?? {}), ...s, image: keep?.image || newSection(s.type as SectionType).image,
} as SiteSection);

function SiteBuilder() {
  const { mode = "ai" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { brain, theme, loading } = useBrandTheme();
  const build = useServerFn(buildSite);
  const [pages, setPages] = useState<Page[]>([]);
  const [pageId, setPageId] = useState<string | null>(null);
  const [sections, setSections] = useState<SiteSection[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<"saved" | "saving" | null>(null);
  const [change, setChange] = useState<{ before: SiteSection[]; lines: number } | null>(null);
  const loadedFor = useRef<string | null>(null);
  const page = pages.find((p) => p.id === pageId) ?? null;
  const domain = (brain?.website ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "") || `${slugify(theme.name)}.site`;

  // Load pages for this account.
  useEffect(() => {
    if (!brain) return;
    supabase.from("site_pages").select("*").eq("brand_id", brain.brandId).order("created_at").then(({ data }) => {
      const list = (data ?? []) as unknown as Page[];
      setPages(list);
      setPageId(list[0]?.id ?? null);
    });
  }, [brain]);

  // Open a page: sections and versions.
  useEffect(() => {
    if (!page) { setSections([]); setVersions([]); return; }
    if (loadedFor.current === page.id) return;
    loadedFor.current = page.id;
    setSections(page.sections ?? []);
    setSelected(null);
    setChange(null);
    setMsgs([]);
    supabase.from("site_page_versions").select("id, sections, note, created_at").eq("page_id", page.id).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setVersions((data ?? []) as unknown as Version[]));
  }, [page]);

  // Autosave (keyed on sections only so page-list updates don't cancel a pending save).
  const pageRef = useRef(page);
  pageRef.current = page;
  useEffect(() => {
    const pg = pageRef.current;
    if (!pg || loadedFor.current !== pg.id || sections === pg.sections) return;
    setSaved("saving");
    const t = setTimeout(async () => {
      const updated_at = new Date().toISOString();
      await supabase.from("site_pages").update({ sections: sections as never, updated_at }).eq("id", pg.id);
      setPages((ps) => ps.map((p) => (p.id === pg.id ? { ...p, sections, updated_at } : p)));
      setSaved("saved");
    }, 900);
    return () => clearTimeout(t);
  }, [sections]);

  async function snapshot(note: string, s = sections) {
    if (!page) return;
    const { data: u } = await supabase.auth.getUser();
    const { data } = await supabase.from("site_page_versions").insert({ page_id: page.id, user_id: u.user!.id, sections: s as never, note }).select("id, sections, note, created_at").single();
    if (data) setVersions((v) => [data as unknown as Version, ...v]);
  }

  async function createPage(title: string) {
    if (!brain) return;
    const { data: u } = await supabase.auth.getUser();
    let slug = slugify(title);
    if (pages.some((p) => p.slug === slug)) slug += `-${pages.length + 1}`;
    const starter = pages.length ? [newSection("nav", theme.name), newSection("hero", theme.name), newSection("footer", theme.name)] : starterPage(theme.name);
    const { data, error } = await supabase.from("site_pages").insert({ user_id: u.user!.id, brand_id: brain.brandId, title, slug, sections: starter as never }).select("*").single();
    if (error) { toast.error("Couldn't create the page."); return; }
    setPages((p) => [...p, data as unknown as Page]);
    setPageId(data.id);
  }

  async function ask(text: string) {
    if (!brain || !page || !text.trim() || busy) return;
    setMsgs((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const out = await build({ data: { brandId: brain.brandId, pageTitle: page.title, request: text, sections: sections.map(({ style: _s, image: _i, ...r }) => r) } });
      const before = sections;
      const next = out.sections.map((s) => filled(s as never, before.find((b) => b.id === s.id)));
      const lines = Math.abs(next.map(sectionCode).join("\n").split("\n").filter((l, i) => l !== before.map(sectionCode).join("\n").split("\n")[i]).length) || 1;
      setSections(next);
      setChange({ before, lines });
      setMsgs((m) => [...m, { role: "agent", text: out.reply, steps: out.steps }]);
      await snapshot(text.slice(0, 80), next);
    } catch (e) {
      setMsgs((m) => [...m, { role: "agent", text: e instanceof Error ? e.message : "Something went wrong. Try again." }]);
    } finally { setBusy(false); }
  }

  async function publish() {
    if (!page) return;
    const published_at = new Date().toISOString();
    await supabase.from("site_pages").update({ status: "published", published_at, sections: sections as never }).eq("id", page.id);
    setPages((ps) => ps.map((p) => (p.id === page.id ? { ...p, status: "published", published_at } : p)));
    await snapshot("Published");
    toast.success("Page published", { description: "Anyone with the link can view it." });
  }

  const liveUrl = page && brain ? `/site/${brain.brandId}/${page.slug}` : "";
  const patch = (id: string, p: Partial<SiteSection>) => setSections((ss) => ss.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const cur = sections.find((s) => s.id === selected) ?? null;

  if (loading) return <p className="p-8 text-[13.5px] text-ink-navy/55">Opening the site…</p>;
  if (!brain) return <p className="p-8 text-[13.5px] text-ink-navy/55">Create a brand kit for this account first, in Design › Brand Guidelines.</p>;

  return (
    <div className="-mx-6 -mt-7 -mb-12 flex h-[calc(100vh-60px)] flex-col lg:-mx-8">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-app-line bg-app-card px-5 py-2.5">
        <p className="text-[14px] font-medium">Site Builder</p>
        <span className="text-[12.5px] text-ink-navy/50">{domain}</span>
        <select value={pageId ?? ""} onChange={(e) => (e.target.value === "__new" ? (() => { const t = prompt("Page name", PAGE_PRESETS.find((p) => !pages.some((x) => x.title === p)) ?? "New page"); if (t) createPage(t); })() : setPageId(e.target.value))}
          className="rounded-[6px] border border-app-line bg-app-card px-2.5 py-1.5 text-[13px]">
          {pages.map((p) => <option key={p.id} value={p.id}>{p.title}{p.status === "published" ? " · live" : ""}</option>)}
          <option value="__new">+ New page</option>
        </select>
        <div className="mx-auto"><Segmented value={mode} onChange={(m: Mode) => navigate({ search: { mode: m } })} options={[{ id: "ai", label: "AI" }, { id: "visual", label: "Visual" }, { id: "code", label: "Code" }]} /></div>
        <span className="text-[12px] text-ink-navy/45">{saved === "saving" ? "Saving…" : saved === "saved" ? "Saved" : ""}</span>
        <div className="flex rounded-[6px] border border-app-line p-0.5">
          <button onClick={() => setMobile(false)} aria-label="Desktop" className={`rounded-[4px] p-1.5 ${!mobile ? "bg-ink-navy text-white" : ""}`}><Monitor size={14} /></button>
          <button onClick={() => setMobile(true)} aria-label="Mobile" className={`rounded-[4px] p-1.5 ${mobile ? "bg-ink-navy text-white" : ""}`}><Smartphone size={14} /></button>
        </div>
        {page ? <a href={liveUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-[6px] border border-app-line px-3 py-1.5 text-[13px]"><ExternalLink size={13} />{page.status === "published" ? "View live" : "Preview"}</a> : null}
        <button onClick={publish} disabled={!page} className="rounded-[6px] bg-cerulean px-4 py-1.5 text-[13px] font-medium text-white disabled:opacity-40">Publish</button>
      </div>

      {!page ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-app-bg">
          <p className="text-[22px] font-light">No site for {theme.name} yet</p>
          <p className="text-[13.5px] text-ink-navy/55">Start with a homepage on the brand kit. You can then build it with the agent.</p>
          <button onClick={() => createPage("Home")} className="mt-2 rounded-[6px] bg-ink-navy px-4 py-2 text-[13.5px] text-white">Create homepage</button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          {mode === "ai" ? (
            <AiPanel msgs={msgs} busy={busy} onAsk={ask} theme={theme.name} versions={versions} sections={sections}
              onRestore={(v) => { setSections(v.sections); toast.success("Version restored"); }} />
          ) : mode === "visual" ? (
            <VisualPanel sections={sections} selected={selected} setSelected={setSelected} setSections={setSections} brand={theme.name} />
          ) : (
            <CodeExplorer sections={sections} selected={selected} setSelected={setSelected} />
          )}

          <div className="relative min-w-0 flex-1 overflow-auto bg-app-bg p-6">
            {mode === "code" ? (
              <CodeView sections={sections} selected={selected} change={change} onAccept={() => setChange(null)} onRevert={() => { if (change) setSections(change.before); setChange(null); }} />
            ) : (
              <div className={`mx-auto overflow-hidden rounded-[8px] bg-white shadow-[0_12px_30px_rgba(0,28,38,0.12)] ${mobile ? "max-w-[390px]" : "max-w-[1100px]"}`}>
                <div className="flex items-center gap-2 border-b border-app-line px-3 py-2 text-[11.5px] text-ink-navy/50">
                  <span className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-app-line" />)}</span>
                  <span className="mx-auto">{domain}/{page.slug === "home" ? "" : page.slug}</span>
                </div>
                <SitePage sections={sections} theme={theme} mobile={mobile} editable={mode === "visual"}
                  selected={mode === "visual" ? selected : null} onSelect={mode === "visual" ? setSelected : undefined} onEdit={patch} />
              </div>
            )}
            {busy ? <div className="absolute top-8 right-8 flex items-center gap-2 rounded-full bg-ink-navy px-3 py-1.5 text-[12px] text-white"><Loader2 size={12} className="animate-spin" />Building…</div> : null}
          </div>

          {mode === "visual" ? <Inspector s={cur} patch={patch} theme={theme} /> : null}
        </div>
      )}
    </div>
  );
}

function AiPanel({ msgs, busy, onAsk, theme, versions, sections, onRestore }: {
  msgs: Msg[]; busy: boolean; onAsk: (t: string) => void; theme: string; versions: Version[]; sections: SiteSection[]; onRestore: (v: Version) => void;
}) {
  const [q, setQ] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);
  const latest = versions[0];
  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-r border-app-line bg-app-card">
      <div className="flex-1 space-y-4 overflow-auto p-5">
        {msgs.length === 0 ? (
          <div className="rounded-[8px] bg-app-bg p-4 text-[13px] leading-relaxed text-ink-navy/70">
            Tell the agent what to build. It uses the {theme} brand kit (colours, fonts, logo, tone of voice) and rewrites the page's sections. Every change is saved as a version you can restore.
          </div>
        ) : null}
        {msgs.map((m, i) => m.role === "user" ? (
          <div key={i} className="ml-8 rounded-[8px] bg-ink-navy px-3.5 py-2.5 text-[13.5px] text-white">{m.text}</div>
        ) : (
          <div key={i} className="space-y-2.5">
            <p className="flex gap-2 text-[13.5px] leading-relaxed"><Wand2 size={14} className="mt-1 shrink-0 text-cerulean" />{m.text}</p>
            {m.steps?.length ? (
              <ul className="space-y-1.5 rounded-[8px] border border-app-line p-3">
                {m.steps.map((s) => <li key={s} className="flex items-center gap-2 text-[12.5px] text-ink-navy/75"><Check size={13} className="text-brand-green" />{s}</li>)}
              </ul>
            ) : null}
          </div>
        ))}
        {busy ? <p className="flex items-center gap-2 text-[12.5px] text-ink-navy/55"><Loader2 size={13} className="animate-spin" />Building sections…</p> : null}
        <div ref={end} />
      </div>
      {latest ? (
        <div className="mx-5 mb-3 flex items-center gap-3 rounded-[8px] border border-app-line p-3 text-[12.5px]">
          <div className="min-w-0 flex-1">
            <p className="font-medium">Version {versions.length}</p>
            <p className="text-ink-navy/55">{sections.length} sections · {ago(latest.created_at)}</p>
          </div>
          {versions[1] ? <button onClick={() => onRestore(versions[1]!)} className="text-cerulean">Restore v{versions.length - 1}</button> : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1.5 px-5 pb-3">
        {CHIPS.map((c) => <button key={c} onClick={() => onAsk(c)} disabled={busy} className="rounded-full border border-app-line px-2.5 py-1 text-[12px] text-ink-navy/70 hover:border-cerulean hover:text-cerulean">{c}</button>)}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onAsk(q); setQ(""); }} className="flex items-end gap-2 border-t border-app-line p-3">
        <textarea value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onAsk(q); setQ(""); } }}
          rows={2} placeholder="Describe what to build or change…" className="flex-1 resize-none text-[13.5px] outline-none" />
        <button disabled={busy || !q.trim()} aria-label="Send" className="rounded-[6px] bg-ink-navy p-2 text-white disabled:opacity-40"><Send size={14} /></button>
      </form>
    </aside>
  );
}

function Sketch({ type }: { type: SectionType }) {
  const B = (l: string, t: string, w: string, h: string, o?: boolean) => <span style={{ left: l, top: t, width: w, height: h }} className={`absolute rounded-[2px] ${o ? "border-[1.5px] border-cerulean" : "bg-cerulean/55"}`} />;
  const map: Record<SectionType, React.ReactNode> = {
    nav: <>{B("8%", "40%", "14%", "18%")}{B("42%", "44%", "26%", "10%")}{B("76%", "36%", "16%", "26%", true)}</>,
    footer: <>{B("8%", "20%", "20%", "14%")}{B("8%", "46%", "14%", "8%")}{B("40%", "20%", "16%", "60%", true)}{B("62%", "20%", "16%", "60%", true)}</>,
    hero: <>{B("8%", "22%", "40%", "12%")}{B("8%", "42%", "30%", "8%")}{B("8%", "62%", "18%", "14%")}{B("56%", "16%", "36%", "68%", true)}</>,
    overlay: <>{B("0", "0", "100%", "100%", true)}{B("10%", "30%", "50%", "14%")}{B("10%", "52%", "34%", "8%")}{B("10%", "68%", "18%", "12%")}</>,
    stats: <>{B("6%", "34%", "18%", "32%", true)}{B("29%", "34%", "18%", "32%", true)}{B("52%", "34%", "18%", "32%", true)}{B("76%", "34%", "18%", "32%", true)}</>,
    tabs: <>{B("8%", "18%", "84%", "10%", true)}{B("8%", "40%", "36%", "10%")}{B("8%", "58%", "30%", "8%")}{B("54%", "36%", "38%", "48%", true)}</>,
    form: <>{B("8%", "20%", "36%", "10%")}{B("52%", "18%", "40%", "16%", true)}{B("52%", "42%", "40%", "16%", true)}{B("52%", "66%", "24%", "14%")}</>,
    calc: <>{B("8%", "20%", "40%", "8%")}{B("8%", "40%", "36%", "6%")}{B("52%", "18%", "40%", "64%", true)}{B("8%", "60%", "18%", "12%")}</>,
  };
  return <span className="relative block aspect-[16/7] w-full rounded-[4px] bg-app-bg">{map[type]}</span>;
}

function VisualPanel({ sections, selected, setSelected, setSections, brand }: {
  sections: SiteSection[]; selected: string | null; setSelected: (id: string | null) => void; setSections: (f: (s: SiteSection[]) => SiteSection[]) => void; brand: string;
}) {
  const [tab, setTab] = useState<"layouts" | "elements" | "layers">("layouts");
  const [q, setQ] = useState("");
  const add = (t: SectionType) => {
    const s = newSection(t, brand);
    setSections((ss) => {
      const i = ss.findIndex((x) => x.id === selected);
      const footer = ss.findIndex((x) => x.type === "footer");
      const at = i >= 0 ? i + 1 : footer >= 0 ? footer : ss.length;
      return [...ss.slice(0, at), s, ...ss.slice(at)];
    });
    setSelected(s.id);
  };
  const move = (id: string, d: number) => setSections((ss) => {
    const i = ss.findIndex((s) => s.id === id); const j = i + d;
    if (j < 0 || j >= ss.length) return ss;
    const n = [...ss]; [n[i], n[j]] = [n[j]!, n[i]!]; return n;
  });
  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-r border-app-line bg-app-card">
      <div className="flex gap-1 border-b border-app-line p-2">
        {([["layouts", "Layouts", LayoutTemplate], ["elements", "Elements", Shapes], ["layers", "Layers", Layers]] as const).map(([id, l, I]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-[6px] py-1.5 text-[12.5px] ${tab === id ? "bg-app-bg font-medium" : "text-ink-navy/60"}`}><I size={13} />{l}</button>
        ))}
      </div>
      <div className="flex-1 space-y-3 overflow-auto p-3">
        {tab === "layouts" ? (
          <>
            <label className="flex items-center gap-2 rounded-[6px] border border-app-line px-2.5 py-1.5 text-[12.5px]"><Search size={13} className="text-ink-navy/40" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sections" className="flex-1 outline-none" /></label>
            {SECTION_TYPES.filter((t) => SECTION_LABELS[t].toLowerCase().includes(q.toLowerCase())).map((t) => (
              <button key={t} onClick={() => add(t)} className="block w-full rounded-[6px] border border-app-line p-2 text-left hover:border-cerulean">
                <Sketch type={t} /><span className="mt-1.5 block text-[12px]">{SECTION_LABELS[t]}</span>
              </button>
            ))}
          </>
        ) : tab === "elements" ? (
          <div className="space-y-2 text-[12.5px] text-ink-navy/70">
            <p>Click any text on the page to edit it in place. Select a section to change its spacing, size, type and colours on the right.</p>
            {cur(sections, selected)?.items ? (
              <button onClick={() => selected && setSections((ss) => ss.map((s) => (s.id === selected ? { ...s, items: [...s.items, { title: "New item", body: "Describe it." }] } : s)))}
                className="flex w-full items-center gap-2 rounded-[6px] border border-app-line px-3 py-2"><Plus size={13} />Add item to selected section</button>
            ) : null}
          </div>
        ) : (
          sections.map((s, i) => (
            <div key={s.id} onClick={() => setSelected(s.id)} className={`flex items-center gap-1.5 rounded-[6px] px-2 py-1.5 text-[12.5px] ${selected === s.id ? "bg-cerulean/10 text-cerulean" : "hover:bg-app-bg"} ${s.hidden ? "opacity-50" : ""}`}>
              <span className="flex-1 truncate">{SECTION_LABELS[s.type]}</span>
              <button aria-label="Move up" disabled={i === 0} onClick={(e) => { e.stopPropagation(); move(s.id, -1); }}><ArrowUp size={12} /></button>
              <button aria-label="Move down" onClick={(e) => { e.stopPropagation(); move(s.id, 1); }}><ArrowDown size={12} /></button>
              <button aria-label="Hide" onClick={(e) => { e.stopPropagation(); setSections((ss) => ss.map((x) => (x.id === s.id ? { ...x, hidden: !x.hidden } : x))); }}>{s.hidden ? <EyeOff size={12} /> : <Eye size={12} />}</button>
              <button aria-label="Delete" onClick={(e) => { e.stopPropagation(); setSections((ss) => ss.filter((x) => x.id !== s.id)); }}><Trash2 size={12} /></button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
const cur = (ss: SiteSection[], id: string | null) => ss.find((s) => s.id === id);

function Inspector({ s, patch, theme }: { s: SiteSection | null; patch: (id: string, p: Partial<SiteSection>) => void; theme: ReturnType<typeof useBrandTheme>["theme"] }) {
  if (!s) return <aside className="w-[280px] shrink-0 border-l border-app-line bg-app-card p-5 text-[13px] text-ink-navy/55">Select a section on the page to edit it.</aside>;
  const st = s.style ?? {};
  const set = (p: Partial<NonNullable<SiteSection["style"]>>) => patch(s.id, { style: { ...st, ...p } });
  const num = "w-full rounded-[6px] border border-app-line px-2 py-1.5 text-[12.5px] outline-none focus:border-cerulean";
  const H = ({ children }: { children: React.ReactNode }) => <p className="kicker mb-2 text-ink-navy/45">{children}</p>;
  return (
    <aside className="w-[280px] shrink-0 space-y-6 overflow-auto border-l border-app-line bg-app-card p-5 text-[12px] text-ink-navy/60">
      <p className="text-[14px] font-medium text-ink-navy">{SECTION_LABELS[s.type]}</p>
      <div><H>Spacing</H><div className="grid grid-cols-2 gap-2">
        <label>Padding top<input type="number" value={st.pt ?? ""} placeholder="auto" onChange={(e) => set({ pt: e.target.value ? Number(e.target.value) : undefined })} className={num} /></label>
        <label>Padding bottom<input type="number" value={st.pb ?? ""} placeholder="auto" onChange={(e) => set({ pb: e.target.value ? Number(e.target.value) : undefined })} className={num} /></label>
      </div></div>
      <div><H>Typography · brand</H>
        <p className="mb-2 text-[13px] text-ink-navy" style={{ fontFamily: `"${theme.display}"` }}>{theme.display}</p>
        <div className="grid grid-cols-2 gap-2">
          <label>Weight<select value={st.weight ?? 700} onChange={(e) => set({ weight: Number(e.target.value) })} className={num}>{[300, 400, 500, 700, 800].map((w) => <option key={w} value={w}>{({ 300: "Light", 400: "Regular", 500: "Medium", 700: "Bold", 800: "ExtraBold" } as Record<number, string>)[w]}</option>)}</select></label>
          <label>Size<input type="number" value={st.size ?? ""} placeholder="auto" onChange={(e) => set({ size: e.target.value ? Number(e.target.value) : undefined })} className={num} /></label>
        </div>
      </div>
      <div><H>Background · {theme.name} kit</H><div className="flex gap-2">
        {([["paper", theme.paper], ["white", "#ffffff"], ["ink", theme.ink], ["accent", theme.accent]] as const).map(([k, c]) => (
          <button key={k} aria-label={k} onClick={() => set({ bg: k })} style={{ background: c }} className={`h-8 w-8 rounded-[6px] border ${st.bg === k ? "ring-2 ring-cerulean ring-offset-1" : "border-app-line"}`} />
        ))}
      </div></div>
      {s.type === "hero" || s.type === "overlay" ? (
        <div><H>Image</H><input value={s.image} onChange={(e) => patch(s.id, { image: e.target.value })} placeholder="Image URL" className={num} /></div>
      ) : null}
    </aside>
  );
}

function CodeExplorer({ sections, selected, setSelected }: { sections: SiteSection[]; selected: string | null; setSelected: (id: string | null) => void }) {
  return (
    <aside className="w-[240px] shrink-0 border-r border-hair-dark bg-ink-navy p-3 text-[12.5px] text-white/75">
      <p className="kicker px-2 pb-2 text-white/40">Explorer</p>
      <p className="flex items-center gap-1.5 px-2 py-1"><Folder size={13} />src / sections</p>
      {sections.map((s) => (
        <button key={s.id} onClick={() => setSelected(s.id)} className={`flex w-full items-center gap-1.5 rounded-[4px] py-1 pr-2 pl-6 text-left ${selected === s.id ? "bg-white/[0.08] text-white" : ""}`}>
          <FileCode size={12} />{SECTION_LABELS[s.type].replace(/[^A-Za-z]/g, "")}.tsx
        </button>
      ))}
      <button onClick={() => setSelected(null)} className={`flex w-full items-center gap-1.5 rounded-[4px] py-1 pr-2 pl-6 text-left ${!selected ? "bg-white/[0.08] text-white" : ""}`}><Code2 size={12} />theme.ts</button>
    </aside>
  );
}

function CodeView({ sections, selected, change, onAccept, onRevert }: { sections: SiteSection[]; selected: string | null; change: { lines: number } | null; onAccept: () => void; onRevert: () => void }) {
  const { theme } = useBrandTheme();
  const s = sections.find((x) => x.id === selected);
  const src = useMemo(() => s ? sectionCode(s) : `export const theme = {\n  ink: "${theme.ink}",\n  accent: "${theme.accent}",\n  paper: "${theme.paper}",\n  display: "${theme.display}",\n  body: "${theme.body}",\n};`, [s, theme]);
  return (
    <div className="mx-auto max-w-[900px] overflow-hidden rounded-[8px] bg-ink-navy text-[12.5px] text-white/85 shadow-[0_12px_30px_rgba(0,28,38,0.2)]">
      {change ? (
        <div className="flex items-center gap-3 border-b border-hair-dark bg-cerulean/25 px-4 py-2.5">
          <Wand2 size={13} /><span>Agent changed {change.lines} lines</span>
          <button onClick={onRevert} className="ml-auto text-white/70">Revert</button>
          <button onClick={onAccept} className="rounded-[4px] bg-white px-2.5 py-1 font-medium text-ink-navy">Accept</button>
        </div>
      ) : null}
      <pre className="overflow-auto p-5 font-mono leading-[1.7]">
        {src.split("\n").map((l, i) => <div key={i}><span className="mr-4 inline-block w-6 text-right text-white/30 select-none">{i + 1}</span>{l}</div>)}
      </pre>
    </div>
  );
}
