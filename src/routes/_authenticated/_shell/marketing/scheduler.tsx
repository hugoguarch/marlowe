import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Plus, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BrandSwitcher } from "@/components/app/BrandSwitcher";
import { btnDark, btnGhost, WmCard } from "@/components/shell/ui";
import { supabase } from "@/integrations/supabase/client";
import { getBrandBrain } from "@/lib/brand.functions";
import { useSelectedBrandId } from "@/lib/brandSelection";
import { getSchedule, queuePost, removeScheduleItem, rescheduleItem } from "@/lib/studio.functions";

export const Route = createFileRoute("/_authenticated/_shell/marketing/scheduler")({
  head: () => ({
    meta: [
      { title: "Post Scheduler — Why Media AI" },
      { name: "description", content: "Plan, upload and reschedule social posts on a calendar for each account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Scheduler,
});

type Row = { id: string; title: string; channel: string; scheduled_for: string; status: string; caption: string | null; imageUrl: string | null };

const CH: Record<string, string> = { LinkedIn: "#001C26", Instagram: "#036C89", Facebook: "#4F9DB5", TikTok: "#2E7D44", "Google Business": "#C99E1F" };
const CHANNELS = Object.keys(CH);
const DOW = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const isVideo = (u: string | null) => !!u && /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u);
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const hm = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
function localInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Scheduler() {
  const { brandId: selected, ready } = useSelectedBrandId();
  const loadBrain = useServerFn(getBrandBrain);
  const load = useServerFn(getSchedule);
  const move = useServerFn(rescheduleItem);
  const drop = useServerFn(removeScheduleItem);
  const queue = useServerFn(queuePost);

  const [brandId, setBrandId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"week" | "month" | "queue">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [open, setOpen] = useState<Row | null>(null);
  const [creating, setCreating] = useState<Date | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  async function refresh(id: string) {
    setRows((await load({ data: { brandId: id } })) as Row[]);
  }

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    loadBrain({ data: selected ? { brandId: selected } : {} })
      .then(async (b) => {
        setBrandId(b?.brandId ?? null);
        if (b) await refresh(b.brandId);
        else setRows([]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selected]);

  const days = useMemo(() => {
    if (view === "week") {
      const s = new Date(cursor);
      s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
      return Array.from({ length: 7 }, (_, i) => new Date(s.getFullYear(), s.getMonth(), s.getDate() + i));
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 35 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [cursor, view]);

  function shift(n: number) {
    const d = new Date(cursor);
    if (view === "week") d.setDate(d.getDate() + 7 * n);
    else d.setMonth(d.getMonth() + n);
    setCursor(d);
  }

  async function dropOn(day: Date) {
    const r = rows.find((x) => x.id === dragId);
    setDragId(null);
    if (!r || !brandId) return;
    const old = new Date(r.scheduled_for);
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate(), old.getHours(), old.getMinutes());
    setRows((p) => p.map((x) => (x.id === r.id ? { ...x, scheduled_for: next.toISOString() } : x)));
    try {
      await move({ data: { scheduleId: r.id, when: next.toISOString() } });
    } catch {
      toast.error("Couldn't move that post.");
      await refresh(brandId);
    }
  }

  const today = new Date();
  const title = view === "week"
    ? `${days[0]!.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${days[6]!.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
    : cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const upcoming = rows.filter((r) => new Date(r.scheduled_for) >= new Date(today.toDateString()));

  if (!loading && !brandId) {
    return (
      <WmCard className="max-w-xl p-6">
        <p className="text-[20px] font-light">Set up a brand first</p>
        <p className="mt-2 text-[13.5px] text-ink-navy/60">Posts are scheduled per brand.</p>
        <Link to="/design/brand" className={`${btnDark} mt-4 inline-flex`}>Open Brand Guidelines</Link>
      </WmCard>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-140px)] flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-3.5">
        <h1 className="text-[28px] font-light tracking-[-0.02em]">{view === "queue" ? "Queue" : title}</h1>
        {view !== "queue" ? (
          <div className="flex gap-1 text-ink-navy/50">
            <button onClick={() => shift(-1)} aria-label="Previous"><ChevronLeft size={18} /></button>
            <button onClick={() => shift(1)} aria-label="Next"><ChevronRight size={18} /></button>
            <button onClick={() => setCursor(new Date())} className="ml-1 text-[12.5px] text-cerulean">Today</button>
          </div>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="hidden gap-3 text-[12px] text-ink-navy/50 xl:flex">
            {CHANNELS.map((c) => <span key={c} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px]" style={{ background: CH[c] }} />{c}</span>)}
          </div>
          <div className="flex gap-0.5 rounded-[7px] bg-app-line/60 p-[3px] text-[13px]">
            {(["week", "month", "queue"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`rounded-[5px] px-3 py-1.5 capitalize ${view === v ? "bg-app-card font-medium shadow-[0_1px_2px_rgba(0,28,38,0.08)]" : ""}`}>{v}</button>
            ))}
          </div>
          {brandId ? <BrandSwitcher current={brandId} /> : null}
          <Link to="/design/post-designer" className={btnGhost}>Design a post</Link>
          <button onClick={() => setCreating(new Date())} className={btnDark}><Plus size={14} />New post</button>
        </div>
      </div>

      {loading ? (
        <p className="text-[13.5px] text-ink-navy/55">Loading the calendar…</p>
      ) : view === "queue" ? (
        <WmCard>
          {upcoming.length ? upcoming.map((r) => (
            <button key={r.id} onClick={() => setOpen(r)} className="flex w-full items-center gap-4 border-b border-app-line px-5 py-3 text-left last:border-0 hover:bg-app-bg/60">
              <Thumb r={r} className="h-12 w-12" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px]">{r.title}</span>
                <span className="block truncate text-[12.5px] text-ink-navy/55">{r.caption}</span>
              </span>
              <span className="rounded-[3px] px-2 py-0.5 text-[11px] text-white" style={{ background: CH[r.channel] ?? "#001C26" }}>{r.channel}</span>
              <span className="w-40 text-right text-[12.5px] text-ink-navy/60">{new Date(r.scheduled_for).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            </button>
          )) : <p className="p-6 text-[13.5px] text-ink-navy/55">Nothing scheduled yet. Design a post or upload your own.</p>}
        </WmCard>
      ) : (
        <div className={`grid flex-1 grid-cols-7 overflow-hidden rounded-[8px] border border-app-line bg-app-card shadow-[0_1px_2px_rgba(0,28,38,0.08)] ${view === "month" ? "grid-rows-[30px_repeat(5,minmax(110px,1fr))]" : "grid-rows-[30px_minmax(420px,1fr)]"}`}>
          {DOW.map((d) => <div key={d} className="border-b border-app-line px-2.5 py-2 text-[11px] font-bold tracking-[0.16em] text-ink-navy/45">{d}</div>)}
          {days.map((d) => {
            const inMonth = view === "week" || d.getMonth() === cursor.getMonth();
            const items = rows.filter((r) => sameDay(new Date(r.scheduled_for), d)).sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
            const isToday = sameDay(d, today);
            return (
              <div
                key={d.toISOString()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropOn(d)}
                onDoubleClick={() => { const n = new Date(d); n.setHours(9, 0, 0, 0); setCreating(n); }}
                className={`group flex min-h-0 flex-col gap-1 overflow-hidden border-r border-b border-app-line px-[7px] py-1.5 ${inMonth ? "bg-app-card" : "bg-app-bg"}`}
              >
                <div className="flex items-center">
                  <span className={`text-[12px] ${isToday ? "font-bold text-cerulean" : inMonth ? "" : "text-ink-navy/35"}`}>{d.getDate()}</span>
                  <button onClick={() => { const n = new Date(d); n.setHours(9, 0, 0, 0); setCreating(n); }} aria-label="Add post" className="ml-auto text-ink-navy/40 opacity-0 transition-opacity group-hover:opacity-100"><Plus size={12} /></button>
                </div>
                {items.map((r) => (
                  <button
                    key={r.id}
                    draggable
                    onDragStart={() => setDragId(r.id)}
                    onClick={() => setOpen(r)}
                    className="flex items-center gap-1.5 truncate rounded-[3px] px-1.5 py-[3px] text-left text-[11px] whitespace-nowrap text-white"
                    style={{ background: CH[r.channel] ?? "#001C26" }}
                    title={`${r.channel} · ${r.title}`}
                  >
                    {view === "week" && r.imageUrl ? <Thumb r={r} className="h-7 w-7 shrink-0" /> : null}
                    <span className="truncate">{hm(new Date(r.scheduled_for))} {r.title}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {open && brandId ? (
        <Detail
          r={open}
          onClose={() => setOpen(null)}
          onSave={async (when) => {
            await move({ data: { scheduleId: open.id, when } });
            await refresh(brandId);
            setOpen(null);
            toast.success("Rescheduled");
          }}
          onDelete={async () => {
            await drop({ data: { scheduleId: open.id } });
            await refresh(brandId);
            setOpen(null);
            toast.success("Removed from the calendar");
          }}
        />
      ) : null}

      {creating && brandId ? (
        <NewPost
          at={creating}
          onClose={() => setCreating(null)}
          onCreate={async (v) => {
            const { data: u } = await supabase.auth.getUser();
            let imagePath: string | null = null;
            if (v.file && u.user) {
              const safe = v.file.name.replace(/[^\w.\-]+/g, "_");
              imagePath = `${u.user.id}/${brandId}/uploads/${crypto.randomUUID()}-${safe}`;
              const { error } = await supabase.storage.from("brand-assets").upload(imagePath, v.file, v.file.type ? { contentType: v.file.type } : {});
              if (error) throw error;
            }
            await queue({ data: { brandId, template: v.file?.type.startsWith("video") ? "video" : "static", title: v.title, caption: v.caption, slides: [], channels: v.channels, imagePath, scheduledFor: new Date(v.when).toISOString() } });
            await refresh(brandId);
            setCreating(null);
            toast.success("Post scheduled");
          }}
        />
      ) : null}
    </div>
  );
}

function Thumb({ r, className }: { r: Row; className: string }) {
  if (!r.imageUrl) return <span className={`${className} rounded-[4px] bg-ink-navy`} />;
  return isVideo(r.imageUrl)
    ? <video src={r.imageUrl} muted className={`${className} rounded-[4px] object-cover`} />
    : <img src={r.imageUrl} alt="" className={`${className} rounded-[4px] object-cover`} />;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-navy/40 p-4" onClick={onClose}>
      <div className="wm-fade max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[10px] bg-app-card shadow-[0_24px_60px_rgba(0,28,38,0.35)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center border-b border-app-line px-5 py-4">
          <p className="text-[15px] font-medium">{title}</p>
          <button onClick={onClose} aria-label="Close" className="ml-auto text-ink-navy/50"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Detail({ r, onClose, onSave, onDelete }: { r: Row; onClose: () => void; onSave: (when: string) => Promise<void>; onDelete: () => Promise<void> }) {
  const [when, setWhen] = useState(localInput(new Date(r.scheduled_for)));
  const [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<void>) => { setBusy(true); try { await f(); } catch { toast.error("That didn't work. Try again."); } finally { setBusy(false); } };
  return (
    <Modal title={r.title} onClose={onClose}>
      <div className="space-y-4 p-5">
        {r.imageUrl ? (isVideo(r.imageUrl) ? <video src={r.imageUrl} controls className="max-h-80 w-full rounded-[6px] bg-ink-navy" /> : <img src={r.imageUrl} alt="" className="max-h-80 w-full rounded-[6px] object-cover" />) : null}
        <p className="flex items-center gap-2 text-[12.5px]"><span className="rounded-[3px] px-2 py-0.5 text-white" style={{ background: CH[r.channel] ?? "#001C26" }}>{r.channel}</span><span className="text-ink-navy/55 capitalize">{r.status}</span></p>
        {r.caption ? <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap text-ink-navy/80">{r.caption}</p> : null}
        <label className="block text-[12px] text-ink-navy/55">Date and time
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="mt-1 h-9 w-full rounded-[6px] border border-app-line px-2.5 text-[13px] text-ink-navy" />
        </label>
        <div className="flex gap-2">
          <button disabled={busy} onClick={() => run(onDelete)} className={`${btnGhost} text-destructive`}><Trash2 size={14} />Delete</button>
          <button disabled={busy} onClick={() => run(() => onSave(new Date(when).toISOString()))} className={`${btnDark} ml-auto`}>Save</button>
        </div>
      </div>
    </Modal>
  );
}

function NewPost({ at, onClose, onCreate }: { at: Date; onClose: () => void; onCreate: (v: { title: string; caption: string; channels: string[]; when: string; file: File | null }) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [channels, setChannels] = useState<string[]>(["Instagram"]);
  const [when, setWhen] = useState(localInput(at.getHours() === 0 && at.getMinutes() === 0 ? new Date(at.setHours(9)) : at));
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  return (
    <Modal title="New post" onClose={onClose}>
      <div className="space-y-4 p-5">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[8px] border border-dashed border-app-line p-5 text-[13px] text-ink-navy/60 hover:border-cerulean">
          {preview ? (file!.type.startsWith("video") ? <video src={preview} className="max-h-56 rounded-[6px]" controls /> : <img src={preview} alt="" className="max-h-56 rounded-[6px]" />) : <><Upload size={18} />Upload an image or video</>}
          <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title (for the calendar)" className="h-9 w-full rounded-[6px] border border-app-line px-3 text-[13.5px] outline-none focus:border-cerulean" />
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} placeholder="Caption" className="w-full rounded-[6px] border border-app-line px-3 py-2 text-[13.5px] outline-none focus:border-cerulean" />
        <div className="flex flex-wrap gap-1.5">
          {CHANNELS.map((c) => (
            <button key={c} onClick={() => setChannels((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))} className={`rounded-full border px-2.5 py-1 text-[12px] ${channels.includes(c) ? "border-ink-navy bg-ink-navy text-white" : "border-app-line"}`}>{c}</button>
          ))}
        </div>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="h-9 w-full rounded-[6px] border border-app-line px-2.5 text-[13px]" aria-label="Date and time" />
        <button
          disabled={busy || !title.trim() || !channels.length}
          onClick={async () => { setBusy(true); try { await onCreate({ title: title.trim(), caption, channels, when, file }); } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't schedule that."); } finally { setBusy(false); } }}
          className={`${btnDark} w-full justify-center disabled:opacity-40`}
        >
          {busy ? "Scheduling…" : "Schedule post"}
        </button>
      </div>
    </Modal>
  );
}
