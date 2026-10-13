import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Monitor, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DEFAULT_BLOCKS, EmailPreview, type EmailBlock } from "@/components/email/EmailPreview";
import { useEmailBrand } from "@/components/email/useEmailBrand";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_shell/marketing/email")({
  head: () => ({
    meta: [
      { title: "Email Marketing — Why Media AI" },
      { name: "description", content: "Campaigns, automations and results for each account's email list." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmailPage,
});

type Design = { id: string; name: string; subject: string; status: string; blocks: EmailBlock[]; scheduled_for: string | null; updated_at: string };
const TABS = ["All", "Drafts", "Scheduled", "Automations"] as const;
const SC: Record<string, string> = { sent: "text-brand-green", draft: "text-ink-navy/50", scheduled: "text-cerulean", live: "text-gold" };

function EmailPage() {
  const { brain, loading, theme } = useEmailBrand();
  const navigate = useNavigate();
  const [list, setList] = useState<Design[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [sel, setSel] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    if (!brain) return;
    supabase.from("email_designs").select("*").eq("brand_id", brain.brandId).order("updated_at", { ascending: false }).then(({ data }) => {
      const rows = (data ?? []) as unknown as Design[];
      setList(rows);
      setSel(rows[0]?.id ?? null);
    });
  }, [brain]);

  async function create() {
    if (!brain) return;
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("email_designs").insert({ user_id: u.user!.id, brand_id: brain.brandId, name: "New email", subject: "", blocks: DEFAULT_BLOCKS() as never }).select("id").single();
    if (error) return toast.error("Couldn't create the email.");
    navigate({ to: "/design/email-designer", search: { id: data.id } as never });
  }

  const shown = list.filter((d) => tab === "All" || (tab === "Drafts" && d.status === "draft") || (tab === "Scheduled" && d.status === "scheduled") || (tab === "Automations" && d.status === "live"));
  const cur = list.find((d) => d.id === sel) ?? null;

  if (loading) return <p className="text-[13.5px] text-ink-navy/55">Loading emails…</p>;
  if (!brain) return <p className="text-[13.5px] text-ink-navy/60">Set up a brand on <Link to="/design/brand" className="text-cerulean">Brand Guidelines</Link> to design emails.</p>;

  return (
    <div className="-mx-6 -mt-7 -mb-12 flex min-h-[calc(100vh-60px)] lg:-mx-8">
      <aside className="w-[308px] shrink-0 border-r border-app-line bg-app-card">
        <div className="flex items-center px-5 pt-5 pb-3">
          <h1 className="text-[22px] font-light">E-sends</h1>
          <button onClick={create} className="ml-auto text-[13px] text-cerulean">+ New</button>
        </div>
        <div className="flex gap-4 border-b border-app-line px-5 text-[13px]">
          {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`pb-2.5 ${tab === t ? "border-b-2 border-ink-navy font-medium" : "text-ink-navy/55"}`}>{t}</button>)}
        </div>
        {shown.length ? shown.map((d) => {
          const hero = d.blocks.find((b) => b.type === "hero") as Extract<EmailBlock, { type: "hero" }> | undefined;
          return (
            <button key={d.id} onClick={() => setSel(d.id)} className={`flex w-full items-center gap-3 border-b border-l-2 border-b-app-line px-5 py-3.5 text-left ${sel === d.id ? "border-l-cerulean bg-app-bg" : "border-l-transparent hover:bg-app-bg/60"}`}>
              {hero ? <img src={hero.image} alt="" className="h-10 w-10 shrink-0 object-cover" /> : <span className="h-10 w-10 shrink-0 bg-ink-navy" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium">{d.name}</span>
                <span className="block truncate text-[12px] text-ink-navy/55">{d.scheduled_for ? new Date(d.scheduled_for).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : `Edited ${new Date(d.updated_at).toLocaleDateString("en-GB")}`}</span>
              </span>
              <span className={`text-[10.5px] font-bold tracking-[0.14em] uppercase ${SC[d.status] ?? ""}`}>{d.status}</span>
            </button>
          );
        }) : <p className="p-5 text-[13px] text-ink-navy/55">No emails here yet. Press + New to design one.</p>}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col items-center gap-4 overflow-y-auto bg-[radial-gradient(var(--color-app-line)_1px,transparent_1px)] [background-size:14px_14px] px-6 py-5">
        {cur ? (
          <>
            <div className="flex w-full max-w-[600px] items-center gap-3">
              <div className="flex rounded-[6px] bg-app-card p-0.5 shadow-[0_1px_2px_rgba(0,28,38,0.08)]">
                <button onClick={() => setMobile(false)} aria-label="Desktop" className={`rounded-[5px] p-1.5 ${!mobile ? "bg-ink-navy text-white" : ""}`}><Monitor size={15} /></button>
                <button onClick={() => setMobile(true)} aria-label="Mobile" className={`rounded-[5px] p-1.5 ${mobile ? "bg-ink-navy text-white" : ""}`}><Smartphone size={15} /></button>
              </div>
              <span className="truncate text-[12.5px] text-ink-navy/55">Subject: {cur.subject || "—"}</span>
              <Link to="/design/email-designer" search={{ id: cur.id } as never} className="ml-auto shrink-0 rounded-[6px] border border-app-line bg-app-card px-3 py-1.5 text-[12.5px]">Edit in Email Designer</Link>
            </div>
            <EmailPreview blocks={cur.blocks} theme={theme} mobile={mobile} />
          </>
        ) : <p className="mt-20 text-[13.5px] text-ink-navy/55">Select or create an email to preview it.</p>}
      </section>

      <aside className="hidden w-[290px] shrink-0 border-l border-app-line bg-app-card xl:block">
        {cur ? (
          <>
            <div className="border-b border-app-line p-5">
              <p className={`text-[11px] font-bold tracking-[0.16em] uppercase ${SC[cur.status] ?? ""}`}>{cur.status}{cur.scheduled_for ? ` · ${new Date(cur.scheduled_for).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}</p>
              <p className="mt-2 text-[18px] font-light">{cur.name}</p>
            </div>
            <div className="grid grid-cols-2 border-b border-app-line">
              {["Open rate", "Click rate", "Enquiries", "Unsubscribes"].map((l, i) => (
                <div key={l} className={`p-5 ${i % 2 ? "" : "border-r border-app-line"} ${i < 2 ? "border-b border-app-line" : ""}`}>
                  <p className="text-[12px] text-ink-navy/55">{l}</p>
                  <p className="mt-1.5 text-[24px] font-light">N/A</p>
                </div>
              ))}
            </div>
            <div className="space-y-2 p-5">
              <p className="text-[14px] font-medium">Results</p>
              <p className="text-[12.5px] leading-relaxed text-ink-navy/55">Open, click and A/B results appear here once an email sending service is connected for this account.</p>
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}
