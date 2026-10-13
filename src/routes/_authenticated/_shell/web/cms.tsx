import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Image as ImageIcon, Link2, Plus, Sparkles, Type } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useEmailBrand } from "@/components/email/useEmailBrand";
import { z } from "zod";

import { noindex } from "@/components/shell/SimpleScreen";
import { Badge, btnDark, btnGhost, Segmented, Title, WmCard } from "@/components/shell/ui";

export const Route = createFileRoute("/_authenticated/_shell/web/cms")({
  validateSearch: z.object({ view: z.enum(["list", "edit"]).optional(), entry: z.string().optional() }),
  head: () => noindex("CMS", "Manage website content, collections and SEO for each account."),
  component: Cms,
});

const COLLECTIONS = ["Insights", "Case studies", "Services", "Team", "Key figures", "Testimonials", "FAQs"];
const STATUSES = ["Draft", "In review", "Scheduled", "Published"] as const;
const TONE: Record<string, "green" | "muted" | "cerulean" | "ink"> = { Published: "green", Draft: "muted", "In review": "cerulean", Scheduled: "ink" };
type Entry = { id: string; collection: string; title: string; status: string; category: string; author: string; body: string; meta: { slug?: string; excerpt?: string; seoTitle?: string; seoDescription?: string; keywords?: string; prompts?: string; image?: string }; updated_at: string };

/** Simple on-page SEO score from what the entry actually contains. */
function seoScore(e: Entry) {
  const tips: string[] = [];
  let s = 40;
  const t = (e.meta.seoTitle || e.title).length;
  if (t >= 30 && t <= 60) s += 15; else tips.push("Title tag 30–60 characters");
  const d = (e.meta.seoDescription || "").length;
  if (d >= 120 && d <= 160) s += 15; else tips.push("Meta description 120–160 characters");
  if (e.meta.keywords) s += 10; else tips.push("Add target keywords");
  if (e.body.split(/\s+/).length >= 300) s += 10; else tips.push("Body under 300 words");
  if (/\]\(\/|href="\//.test(e.body)) s += 10; else tips.push("Add an internal link");
  return { s, tips };
}
const ago = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function Cms() {
  const { view = "list", entry } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { brain, loading } = useEmailBrand();
  const [col, setCol] = useState("Insights");
  const [rows, setRows] = useState<Entry[]>([]);

  useEffect(() => {
    if (!brain) return;
    supabase.from("cms_entries").select("*").eq("brand_id", brain.brandId).order("updated_at", { ascending: false }).then(({ data }) => setRows((data ?? []) as unknown as Entry[]));
  }, [brain]);

  async function create() {
    if (!brain) return;
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("cms_entries").insert({ user_id: u.user!.id, brand_id: brain.brandId, collection: col }).select("*").single();
    if (error) { toast.error("Couldn't create the entry."); return; }
    setRows((r) => [data as unknown as Entry, ...r]);
    navigate({ search: { view: "edit", entry: data.id } });
  }

  if (loading) return <p className="text-[13.5px] text-ink-navy/55">Loading content…</p>;
  const list = rows.filter((r) => r.collection === col);
  const cur = rows.find((r) => r.id === entry);

  return (
    <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
      <WmCard className="h-fit p-3">
        <p className="kicker px-2 pt-1 pb-2 text-ink-navy/45">Collections</p>
        {COLLECTIONS.map((c) => (
          <button key={c} onClick={() => { setCol(c); navigate({ search: {} }); }} className={`flex w-full items-center rounded-[6px] px-2.5 py-2 text-left text-[13.5px] ${c === col ? "bg-app-bg font-medium" : "text-ink-navy/70 hover:bg-app-bg"}`}>{c}<span className="ml-auto text-[11.5px] text-ink-navy/40">{rows.filter((r) => r.collection === c).length || ""}</span></button>
        ))}
      </WmCard>
      {view === "edit" && cur ? (
        <Editor key={cur.id} e={cur} onBack={() => navigate({ search: {} })} onSaved={(n) => setRows((r) => r.map((x) => (x.id === n.id ? n : x)))} onDeleted={() => { setRows((r) => r.filter((x) => x.id !== cur.id)); navigate({ search: {} }); }} />
      ) : (
        <div className="min-w-0 space-y-5">
          <Title title={col} sub={`${list.length} ${list.length === 1 ? "entry" : "entries"}`} action={<button onClick={create} className={btnDark}><Plus size={14} />New entry</button>} />
          <WmCard>
            {list.length ? (
              <table className="w-full text-[13.5px]">
                <thead className="text-left text-[12px] text-ink-navy/55">
                  <tr className="border-b border-app-line">{["Title", "Status", "Category", "Author", "SEO", "Updated"].map((h, i) => <th key={h} className={`py-2.5 font-normal ${i === 0 ? "px-5" : ""}`}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {list.map((r) => {
                    const seo = seoScore(r).s;
                    return (
                      <tr key={r.id} onClick={() => navigate({ search: { view: "edit", entry: r.id } })} className="cursor-pointer border-b border-app-line last:border-0 hover:bg-app-bg/60">
                        <td className="max-w-0 truncate px-5 py-3">{r.title}</td>
                        <td><Badge tone={TONE[r.status] ?? "muted"}>{r.status}</Badge></td>
                        <td className="text-ink-navy/70">{r.category || "—"}</td>
                        <td className="text-ink-navy/70">{r.author || "—"}</td>
                        <td><span className={seo >= 85 ? "text-brand-green" : "text-ink-navy/70"}>{seo}</span></td>
                        <td className="pr-5 text-ink-navy/55">{ago(r.updated_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : <p className="p-6 text-[13.5px] text-ink-navy/55">No entries in {col} yet. Press New entry to add one.</p>}
          </WmCard>
        </div>
      )}
    </div>
  );
}

function Editor({ e: initial, onBack, onSaved, onDeleted }: { e: Entry; onBack: () => void; onSaved: (e: Entry) => void; onDeleted: () => void }) {
  const [e, setE] = useState<Entry>(initial);
  const [tab, setTab] = useState<"content" | "meta" | "seo" | "ai">("content");
  const [saving, setSaving] = useState(false);
  const m = (k: keyof Entry["meta"], v: string) => setE({ ...e, meta: { ...e.meta, [k]: v } });
  const { s, tips } = seoScore(e);
  const field = "mt-1 w-full rounded-[6px] border border-app-line px-3 py-2 text-[13.5px] outline-none focus:border-cerulean";

  async function save() {
    setSaving(true);
    const updated_at = new Date().toISOString();
    const { error } = await supabase.from("cms_entries").update({ title: e.title, status: e.status, category: e.category, author: e.author, body: e.body, meta: e.meta as never, updated_at }).eq("id", e.id);
    setSaving(false);
    if (error) { toast.error("Couldn't save."); return; }
    onSaved({ ...e, updated_at });
    toast.success("Saved");
  }
  async function del() {
    if (!confirm(`Delete "${e.title}"?`)) return;
    await supabase.from("cms_entries").delete().eq("id", e.id);
    onDeleted();
  }

  return (
    <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className={btnGhost}><ArrowLeft size={14} />Back</button>
          <Segmented value={tab} onChange={setTab} options={[{ id: "content", label: "Content" }, { id: "meta", label: "Meta" }, { id: "seo", label: "SEO" }, { id: "ai", label: "AI Search" }]} />
          <button onClick={save} disabled={saving} className={`${btnDark} ml-auto`}>{saving ? "Saving…" : "Save"}</button>
        </div>
        <WmCard className="space-y-4 p-6">
          <input value={e.title} onChange={(x) => setE({ ...e, title: x.target.value })} className="w-full text-[28px] font-light tracking-[-0.02em] outline-none" aria-label="Title" />
          {tab === "content" ? (
            <>
              {e.meta.image ? <Block icon={ImageIcon} label="Image"><img src={e.meta.image} alt="" className="aspect-[16/7] w-full rounded-[6px] object-cover" /></Block> : null}
              <Block icon={Type} label="Rich text"><textarea value={e.body} onChange={(x) => setE({ ...e, body: x.target.value })} rows={14} placeholder="Write the article. Markdown works." className="w-full resize-y text-[14px] leading-relaxed outline-none" /></Block>
              <Block icon={Link2} label="Image URL"><input value={e.meta.image ?? ""} onChange={(x) => m("image", x.target.value)} placeholder="https://…" className="w-full text-[13.5px] outline-none" /></Block>
              <p className="flex items-center gap-1.5 text-[12px] text-ink-navy/50"><Sparkles size={12} />{e.body.split(/\s+/).filter(Boolean).length} words</p>
            </>
          ) : tab === "meta" ? (
            <div className="space-y-3 text-[12px] text-ink-navy/55">
              <label className="block">Slug<input value={e.meta.slug ?? ""} onChange={(x) => m("slug", x.target.value)} className={field} placeholder="/insights/my-article" /></label>
              <label className="block">Excerpt<textarea value={e.meta.excerpt ?? ""} onChange={(x) => m("excerpt", x.target.value)} rows={3} className={field} /></label>
            </div>
          ) : tab === "seo" ? (
            <div className="space-y-3 text-[12px] text-ink-navy/55">
              <label className="block">Title tag ({(e.meta.seoTitle ?? "").length})<input value={e.meta.seoTitle ?? ""} onChange={(x) => m("seoTitle", x.target.value)} className={field} /></label>
              <label className="block">Meta description ({(e.meta.seoDescription ?? "").length})<textarea value={e.meta.seoDescription ?? ""} onChange={(x) => m("seoDescription", x.target.value)} rows={3} className={field} /></label>
              <label className="block">Target keywords<input value={e.meta.keywords ?? ""} onChange={(x) => m("keywords", x.target.value)} className={field} placeholder="bridging finance, auction finance" /></label>
            </div>
          ) : (
            <label className="block text-[12px] text-ink-navy/55">Questions this page should answer in AI search (one per line)<textarea value={e.meta.prompts ?? ""} onChange={(x) => m("prompts", x.target.value)} rows={6} className={field} /></label>
          )}
        </WmCard>
      </div>
      <div className="space-y-4">
        <WmCard className="space-y-3 p-5 text-[13px]">
          {(["author", "category"] as const).map((k) => (
            <label key={k} className="block text-[12px] text-ink-navy/55 capitalize">{k}<input value={e[k]} onChange={(x) => setE({ ...e, [k]: x.target.value })} className={field} /></label>
          ))}
          <label className="block text-[12px] text-ink-navy/55">Status
            <select value={e.status} onChange={(x) => setE({ ...e, status: x.target.value })} className={field}>{STATUSES.map((v) => <option key={v}>{v}</option>)}</select>
          </label>
          <button onClick={del} className="text-[12.5px] text-destructive">Delete entry</button>
        </WmCard>
        <WmCard dark className="p-5">
          <p className="kicker text-white/55">SEO score</p>
          <p className="mt-2 text-[40px] leading-none font-light">{s}</p>
          <ul className="mt-3 space-y-1 text-[12.5px] text-wm-grey-3">{tips.length ? tips.map((t) => <li key={t}>{t}</li>) : <li>All checks pass</li>}</ul>
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
