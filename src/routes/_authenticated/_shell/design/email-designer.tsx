import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Monitor, Plus, Smartphone, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { DEFAULT_BLOCKS, EmailPreview, newBlock, type EmailBlock } from "@/components/email/EmailPreview";
import { useEmailBrand } from "@/components/email/useEmailBrand";
import { noindex } from "@/components/shell/SimpleScreen";
import { btnDark, btnGhost } from "@/components/shell/ui";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_shell/design/email-designer")({
  validateSearch: z.object({ id: z.string().optional() }),
  head: () => noindex("Email Designer", "Build on-brand emails from blocks with a live preview."),
  component: EmailDesigner,
});

type Design = { id: string; name: string; subject: string; status: string; blocks: EmailBlock[]; scheduled_for: string | null };
const TYPES: EmailBlock["type"][] = ["header", "hero", "text", "figures", "button", "articles", "footer"];
const inp = "w-full rounded-[6px] border border-app-line px-2.5 py-2 text-[13px] outline-none focus:border-cerulean";

function EmailDesigner() {
  const { id } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { brain, loading, theme } = useEmailBrand();
  const [list, setList] = useState<Design[]>([]);
  const [d, setD] = useState<Design | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!brain) return;
    supabase.from("email_designs").select("*").eq("brand_id", brain.brandId).order("updated_at", { ascending: false }).then(({ data }) => {
      const rows = (data ?? []) as unknown as Design[];
      setList(rows);
      setD(rows.find((r) => r.id === id) ?? rows[0] ?? null);
    });
  }, [brain, id]);

  async function create() {
    if (!brain) return;
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("email_designs").insert({ user_id: u.user!.id, brand_id: brain.brandId, name: "New email", blocks: DEFAULT_BLOCKS() as never }).select("id").single();
    if (error) return toast.error("Couldn't create the email.");
    navigate({ search: { id: data.id } });
  }

  async function save(patch: Partial<Design> = {}) {
    if (!d) return;
    const next = { ...d, ...patch };
    setSaving(true);
    const { error } = await supabase.from("email_designs").update({ name: next.name, subject: next.subject, status: next.status, blocks: next.blocks as never, scheduled_for: next.scheduled_for, updated_at: new Date().toISOString() }).eq("id", d.id);
    setSaving(false);
    if (error) return toast.error("Couldn't save.");
    setD(next);
    setList((l) => l.map((x) => (x.id === next.id ? next : x)));
    toast.success("Saved");
  }

  async function remove() {
    if (!d || !confirm(`Delete "${d.name}"?`)) return;
    await supabase.from("email_designs").delete().eq("id", d.id);
    navigate({ search: {} });
    setList((l) => l.filter((x) => x.id !== d.id));
    setD(null);
  }

  const setBlocks = (blocks: EmailBlock[]) => d && setD({ ...d, blocks });
  const upd = (b: EmailBlock) => d && setBlocks(d.blocks.map((x) => (x.id === b.id ? b : x)));
  const moveBlock = (i: number, dir: -1 | 1) => {
    if (!d) return;
    const a = [...d.blocks];
    const j = i + dir;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j]!, a[i]!];
    setBlocks(a);
  };
  const current = d?.blocks.find((b) => b.id === sel) ?? null;

  if (loading) return <p className="text-[13.5px] text-ink-navy/55">Opening the designer…</p>;
  if (!brain) return <p className="text-[13.5px] text-ink-navy/60">Set up a brand on <Link to="/design/brand" className="text-cerulean">Brand Guidelines</Link> first.</p>;

  return (
    <div className="-mx-6 -mt-7 -mb-12 flex min-h-[calc(100vh-60px)] lg:-mx-8">
      <aside className="flex w-[240px] shrink-0 flex-col border-r border-app-line bg-app-card">
        <div className="flex items-center px-4 pt-4 pb-2"><p className="kicker text-ink-navy/45">Emails</p><button onClick={create} className="ml-auto text-[12.5px] text-cerulean">+ New</button></div>
        <div className="max-h-[34vh] overflow-y-auto">
          {list.map((x) => (
            <button key={x.id} onClick={() => navigate({ search: { id: x.id } })} className={`block w-full truncate px-4 py-2 text-left text-[13px] ${d?.id === x.id ? "bg-app-bg font-medium" : "hover:bg-app-bg/60"}`}>{x.name}</button>
          ))}
          {!list.length ? <p className="px-4 py-2 text-[12.5px] text-ink-navy/50">No emails yet.</p> : null}
        </div>
        {d ? (
          <>
            <p className="kicker border-t border-app-line px-4 pt-4 pb-2 text-ink-navy/45">Blocks</p>
            <div className="flex-1 overflow-y-auto">
              {d.blocks.map((b, i) => (
                <div key={b.id} className={`group flex items-center gap-1 px-4 py-1.5 text-[13px] capitalize ${sel === b.id ? "bg-cerulean/[0.08]" : ""}`}>
                  <button onClick={() => setSel(b.id)} className="flex-1 text-left">{b.type}</button>
                  <button onClick={() => moveBlock(i, -1)} aria-label="Move up" className="text-ink-navy/40 hover:text-ink-navy"><ArrowUp size={12} /></button>
                  <button onClick={() => moveBlock(i, 1)} aria-label="Move down" className="text-ink-navy/40 hover:text-ink-navy"><ArrowDown size={12} /></button>
                  <button onClick={() => setBlocks(d.blocks.filter((x) => x.id !== b.id))} aria-label="Remove" className="text-ink-navy/40 hover:text-destructive"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
            <div className="border-t border-app-line p-3">
              <p className="mb-2 flex items-center gap-1 text-[12px] font-medium"><Plus size={12} />Add block</p>
              <div className="flex flex-wrap gap-1">
                {TYPES.map((t) => <button key={t} onClick={() => { const nb = newBlock(t); setBlocks([...d.blocks, nb]); setSel(nb.id); }} className="rounded-full border border-app-line px-2 py-0.5 text-[11.5px] capitalize hover:border-cerulean">{t}</button>)}
              </div>
            </div>
          </>
        ) : null}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col items-center gap-4 overflow-y-auto bg-[radial-gradient(var(--color-app-line)_1px,transparent_1px)] [background-size:14px_14px] px-6 py-5">
        {d ? (
          <>
            <div className="flex w-full max-w-[600px] items-center gap-2">
              <div className="flex rounded-[6px] bg-app-card p-0.5 shadow-[0_1px_2px_rgba(0,28,38,0.08)]">
                <button onClick={() => setMobile(false)} aria-label="Desktop" className={`rounded-[5px] p-1.5 ${!mobile ? "bg-ink-navy text-white" : ""}`}><Monitor size={15} /></button>
                <button onClick={() => setMobile(true)} aria-label="Mobile" className={`rounded-[5px] p-1.5 ${mobile ? "bg-ink-navy text-white" : ""}`}><Smartphone size={15} /></button>
              </div>
              <span className="text-[12.5px] text-ink-navy/50">Click a block to edit it</span>
            </div>
            <EmailPreview blocks={d.blocks} theme={theme} mobile={mobile} selected={sel} onSelect={setSel} />
          </>
        ) : <button onClick={create} className={`${btnDark} mt-20`}>Create your first email</button>}
      </section>

      {d ? (
        <aside className="w-[300px] shrink-0 overflow-y-auto border-l border-app-line bg-app-card">
          <div className="space-y-2.5 border-b border-app-line p-4">
            <p className="kicker text-ink-navy/45">Email</p>
            <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} className={inp} aria-label="Name" placeholder="Name" />
            <input value={d.subject} onChange={(e) => setD({ ...d, subject: e.target.value })} className={inp} aria-label="Subject" placeholder="Subject line" />
            <select value={d.status} onChange={(e) => setD({ ...d, status: e.target.value })} className={inp} aria-label="Status">
              <option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="live">Automation</option><option value="sent">Sent</option>
            </select>
            <input type="datetime-local" value={d.scheduled_for ? d.scheduled_for.slice(0, 16) : ""} onChange={(e) => setD({ ...d, scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : null })} className={inp} aria-label="Send time" />
            <div className="flex gap-2">
              <button onClick={remove} className={btnGhost}><Trash2 size={14} /></button>
              <button onClick={() => save()} disabled={saving} className={`${btnDark} flex-1 justify-center`}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
          <div className="space-y-2.5 p-4">
            <p className="kicker text-ink-navy/45">{current ? `${current.type} block` : "Block"}</p>
            {current ? <BlockFields b={current} onChange={upd} /> : <p className="text-[12.5px] text-ink-navy/50">Select a block in the preview.</p>}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

function BlockFields({ b, onChange }: { b: EmailBlock; onChange: (b: EmailBlock) => void }) {
  const f = (label: string, value: string, set: (v: string) => void, area = false) => (
    <label key={label} className="block text-[12px] text-ink-navy/55">{label}
      {area ? <textarea value={value} rows={6} onChange={(e) => set(e.target.value)} className={`${inp} mt-1 text-ink-navy`} /> : <input value={value} onChange={(e) => set(e.target.value)} className={`${inp} mt-1 text-ink-navy`} />}
    </label>
  );
  switch (b.type) {
    case "header": return f("Label", b.label, (label) => onChange({ ...b, label }));
    case "hero": return <>{f("Kicker", b.kicker, (kicker) => onChange({ ...b, kicker }))}{f("Headline", b.title, (title) => onChange({ ...b, title }))}{f("Accent words", b.accent, (accent) => onChange({ ...b, accent }))}{f("Image URL", b.image, (image) => onChange({ ...b, image }))}</>;
    case "text": return f("Body", b.body, (body) => onChange({ ...b, body }), true);
    case "button": return <>{f("Button", b.label, (label) => onChange({ ...b, label }))}{f("Secondary link", b.secondary, (secondary) => onChange({ ...b, secondary }))}</>;
    case "footer": return f("Text", b.text, (text) => onChange({ ...b, text }), true);
    case "figures": return <>{b.items.map((it, i) => <div key={i} className="grid grid-cols-2 gap-2">{f(`Figure ${i + 1}`, it.v, (v) => onChange({ ...b, items: b.items.map((x, j) => (j === i ? { ...x, v } : x)) }))}{f("Label", it.l, (l) => onChange({ ...b, items: b.items.map((x, j) => (j === i ? { ...x, l } : x)) }))}</div>)}</>;
    case "articles": return <>{f("Heading", b.heading, (heading) => onChange({ ...b, heading }))}{b.items.map((it, i) => <div key={i} className="space-y-1">{f(`Article ${i + 1}`, it.title, (title) => onChange({ ...b, items: b.items.map((x, j) => (j === i ? { ...x, title } : x)) }))}{f("Image URL", it.image, (image) => onChange({ ...b, items: b.items.map((x, j) => (j === i ? { ...x, image } : x)) }))}</div>)}</>;
  }
}
